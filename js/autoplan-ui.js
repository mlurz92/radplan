// RadPlan — Auto-Plan-UI: Konfigurationsdialog, Fortschrittsanzeige (Neural-
// Constellation-Visualisierung), Ergebnisansicht, "Warum X?"-Bericht sowie
// die Jahresplanung über die Befehlspalette. Extrahiert aus dem früher
// monolithischen app.js.

import { MONTHS, MONTHS_SHORT, DOW_ABBR, DOW_LONG, daysInMonth, weekday,
  isHoliday, isFacharzt, getEmpMeta, posColor, getSaxonyHolidaysCached, dateKey,
  getReducedBdTarget,
} from './constants.js';
import { state, DATA, planMode, planData, saveToStorage } from './state.js';
import { render } from './render-grid.js';
import { showOverlay, hideOverlay, showToast, openScoreInfoModal } from './render-modals.js';
import {
  computeAutoPlan, computeAutoPlanRange, collectHistoricalDutyStatsAsync, sleep,
  isDutyExempt, AUTO_PLAN_WEIGHT_PROFILES, weightProfileFromMix,
} from './autoplan.js';
import { NeuralGraph } from './neuralgraph.js';
import { esc } from './utils.js';
import { recordPlanHistory } from './planmode.js';

let localAutoPlanResult = null;
let localAutoPlanTargets = {};
let localApViewMode = "config";
let localAutoPlanConfigRenderToken = 0;
let localApAnimationId = null;
let neuralGraphInstance = null;
/** @type {string | ReturnType<typeof weightProfileFromMix>} */
let localWeightProfile = "standard";
// Vorschlag 1 (Simulated Annealing): 'greedy' (Standard) oder 'annealing'.
let localOptimizationStrategy = "greedy";
let localAutoPlanAlternatives = {};

// Zugriffspunkte für andere Module (planmode.js/app.js), die den internen
// Autoplan-UI-Zustand von außen zurücksetzen/abfragen/aufräumen müssen,
// ohne selbst auf die oben deklarierten modul-lokalen Variablen zugreifen zu
// können (ESM-Imports sind schreibgeschützte Live-Bindings).
export function resetAutoPlanTargets() {
  localAutoPlanTargets = {};
}

export function disposeNeuralGraphInstance() {
  if (neuralGraphInstance) {
    neuralGraphInstance.dispose();
    neuralGraphInstance = null;
  }
}

export async function runYearAutoPlan() {
  if (planMode) {
    showToast("Bitte zuerst den Planungsmodus verlassen");
    return;
  }

  const { year, month: startMonth } = state;
  const endMonth = 11;
  const monthCount = endMonth - startMonth + 1;

  if (monthCount <= 1) {
    showToast(`${MONTHS[startMonth]} ist bereits der letzte Monat des Jahres ${year}`);
    return;
  }

  const label = `${MONTHS[startMonth]} – ${MONTHS[endMonth]} ${year}`;
  const confirmed = confirm(
    `Jahresplanung: ${monthCount} Monate (${label}) automatisch mit dem RadPlan Neural Scheduler planen?\n\n` +
    `Jeder Monat wird einzeln geplant, die Belastung trägt sich dabei von Monat zu Monat fort. ` +
    `Bereits gesetzte Dienste bleiben als Fixpunkte erhalten. Das Ergebnis wird direkt gespeichert, ` +
    `OHNE die übliche Vorschau pro Monat — für eine Kontrolle vor dem Speichern bitte stattdessen ` +
    `Monat für Monat über den Planungsmodus planen.`
  );
  if (!confirmed) return;

  showToast(`Jahresplanung gestartet: ${label} …`);

  try {
    const { aggregate } = await computeAutoPlanRange(year, startMonth, year, endMonth, {
      apply: true,
    });
    saveToStorage();
    render();
    showToast(
      `Jahresplanung abgeschlossen: ${aggregate.monthsPlanned} Monate geplant` +
      (aggregate.totalWarnings > 0 ? ` · ${aggregate.totalWarnings} Warnung(en)` : "")
    );
  } catch (e) {
    console.error("runYearAutoPlan error:", e);
    showToast(`Jahresplanung fehlgeschlagen: ${e.message}`);
  }
}

export function defaultBDTarget(empName) {
  if (isDutyExempt(empName)) return 0;
  // AGENT.md/algorithm_rules.md §2.4: reduzierte BD-Monatsziele dürfen NIE
  // im aufrufenden Code hartkodiert werden, sondern ausschließlich über den
  // in constants.js deklarierten Getter aus SPECIAL_RULES.reducedBdTarget
  // gelesen werden — sonst prefillt der Konfigurationsdialog nach einer
  // Änderung an SPECIAL_RULES weiterhin die alten Werte.
  return getReducedBdTarget(empName) ?? 4;
}

export function openAutoPlanModal() {
  if (!planMode) return;
  const emps = [...planData.employees];
  
  if (!Object.keys(localAutoPlanTargets).length) {
    emps.forEach((e) => {
      localAutoPlanTargets[e] = defaultBDTarget(e);
    });
  }

  localAutoPlanAlternatives = {};
  localApViewMode = "config";
  showOverlay("modal-autoplan");
  
  const body = document.getElementById("ap-body");
  if (body) {
    body.innerHTML = `
      <div class="ap-config-intro">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;color:#0EA5E9">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>Auto-Plan-Konfiguration wird vorbereitet…</span>
      </div>
    `;
  }
  
  localAutoPlanConfigRenderToken += 1;
  const renderToken = localAutoPlanConfigRenderToken;
  
  requestAnimationFrame(() => {
    setTimeout(() => {
      renderAutoPlanModal(renderToken).catch(() => {
        showToast("Auto-Plan-Konfiguration konnte nicht geladen werden");
      });
    }, 0);
  });
}

export async function renderAutoPlanModal(renderToken = null) {
  const { year: y, month: m } = state;
  const emps = [...planData.employees];
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  
  const apSub = document.getElementById("ap-sub");
  if (apSub) {
    apSub.textContent = `${MONTHS[m]} ${y}`;
  }
  
  const body = document.getElementById("ap-body");
  const applyBtn = document.getElementById("ap-apply");
  const reportBtn = document.getElementById("ap-report-btn");
  
  if (!body || !applyBtn) return;
  
  if (reportBtn) {
    reportBtn.style.display = "none";
  }

  if (localApViewMode === "config") {
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.height = "100%";
    body.style.maxHeight = "100%";
    body.style.padding = "0";
    body.style.overflow = "hidden";
    applyBtn.style.display = "none";
    
    const hist = await collectHistoricalDutyStatsAsync(y, m);
    
    if (renderToken !== null && renderToken !== localAutoPlanConfigRenderToken) {
      return;
    }
    
    const totalTarget = dutyEmps.reduce((s, e) => s + (localAutoPlanTargets[e] ?? defaultBDTarget(e)), 0);
    const dayCount = daysInMonth(y, m);
    
    let html = `
      <div class="ap-config-container">
        <div class="ap-config-header">
          <div class="ap-hud-block">
            <span class="ap-hud-kicker" style="color:var(--gray-500)">Parameter-Konfiguration</span>
            <div class="ap-hud-title" style="color:var(--gray-800); font-size:16px;">BD-Ziele & Lastverteilung</div>
          </div>
          
          <div class="ap-config-summary">
            <div class="ap-summary-item">
              <span class="ap-summary-label">Tage im Monat</span>
              <span class="ap-summary-value" style="color:var(--gray-700)">${dayCount}</span>
            </div>
            <div class="ap-ls-sep" style="height:24px; margin:0 4px;"></div>
            <div class="ap-summary-item">
              <span class="ap-summary-label">Σ Ziel-Stimmen</span>
              <span class="ap-summary-value" id="ap-total-target">${totalTarget}</span>
            </div>
          </div>
        </div>

        <div class="ap-weight-row" id="ap-weight-row">
          <span class="ap-weight-row-lbl">Gewichtung</span>
          <div class="ap-weight-chips">
            ${Object.values(AUTO_PLAN_WEIGHT_PROFILES).map((p) => `
              <button type="button" class="ap-weight-chip${p.key === localWeightProfile ? " is-active" : ""}" data-profile="${p.key}" title="${p.hint}">${p.label}</button>
            `).join("")}
          </div>
        </div>

        <div class="ap-weight-slider-row" id="ap-weight-slider-row" title="Kontinuierliche Mischung zwischen Fairness- und Wunsch-Gewichtung, unabhängig von den drei Presets oben">
          <span class="ap-weight-slider-lbl">Fairness</span>
          <input
            type="range"
            id="ap-weight-slider"
            min="0"
            max="100"
            step="1"
            value="${typeof localWeightProfile === "object" ? localWeightProfile.mixPct : 50}"
            aria-label="Individuelle Mischung zwischen Fairness- und Wunsch-Gewichtung"
          >
          <span class="ap-weight-slider-lbl">Wunsch</span>
          <span class="ap-weight-slider-value" id="ap-weight-slider-value">${typeof localWeightProfile === "object" ? localWeightProfile.mixPct : "–"}</span>
        </div>

        <div class="ap-weight-row" id="ap-strategy-row">
          <span class="ap-weight-row-lbl" data-tooltip="Bestimmt, wie die Metaheuristik-Phase (Deep-Optimize) am Ende jedes Optimierungszyklus nach Verbesserungen sucht.">Strategie</span>
          <div class="ap-weight-chips">
            <button type="button" class="ap-weight-chip${localOptimizationStrategy === "greedy" ? " is-active" : ""}" data-strategy="greedy" data-tooltip="Akzeptiert in der Deep-Optimize-Phase ausschließlich strikt verbessernde Tauschversuche. Schnell und deterministisch, kann aber in einem lokalen Optimum steckenbleiben.">Greedy</button>
            <button type="button" class="ap-weight-chip${localOptimizationStrategy === "annealing" ? " is-active" : ""}" data-strategy="annealing" data-tooltip="Simulated Annealing: lässt zu Beginn auch leicht verschlechternde Tauschversuche mit abnehmender Wahrscheinlichkeit zu, um lokale Optima zu verlassen. Das Endergebnis ist garantiert nie schlechter als der reine Greedy-Ansatz, kann aber ein höheres NFI erreichen und braucht etwas länger.">Simulated Annealing</button>
          </div>
        </div>

        <div class="ap-config-list">
    `;

    dutyEmps.forEach((e) => {
      const meta = getEmpMeta(e);
      const pc = posColor(meta.position);
      const h = hist[e] || { bd: 0, weDuty: 0, satBd: 0 };
      const target = localAutoPlanTargets[e] ?? defaultBDTarget(e);
      
      html += `
        <div class="ap-emp-card">
          <div class="ap-card-top">
            <div class="ap-card-name-group">
              <span class="ap-card-name">${esc(e)}</span>
              <span class="ap-card-pos" style="color:${pc.border}">${esc(meta.posLabel)}</span>
            </div>
            <div class="ap-input-stepper" data-tooltip="Individuelles Monatsziel an Bereitschaftsdiensten für ${esc(e)}. Der Neural Scheduler versucht, exakt diese Anzahl zuzuteilen.">
              <button type="button" class="ap-step-btn minus" data-emp="${esc(e)}" data-tooltip="BD-Ziel um 1 verringern.">−</button>
              <input type="number" class="ap-card-input" data-emp="${esc(e)}" value="${target}" min="0" max="10" step="1" readonly>
              <button type="button" class="ap-step-btn plus" data-emp="${esc(e)}" data-tooltip="BD-Ziel um 1 erhöhen.">+</button>
            </div>
          </div>
          
          <div class="ap-card-stats">
            <div class="ap-card-stat" title="Historische BD im aktuellen Jahr">
              <span class="ap-stat-label">Hist. BD</span>
              <span class="ap-stat-val">${h.bd}</span>
            </div>
            <div class="ap-card-stat" title="Historische Samstags-BD">
              <span class="ap-stat-label">Sa-BD</span>
              <span class="ap-stat-val">${h.satBd}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>

        <div class="ap-config-footer">
          <div style="flex:1; display:flex; gap:8px;">
            <button type="button" class="mbtn mbtn-ghost" id="ap-reset-defaults" style="font-size:11px; padding:6px 12px;" data-tooltip="Setzt alle individuellen BD-Ziele oben auf das automatisch berechnete Standard-Monatsziel je Person zurück.">Standardwerte</button>
          </div>
          <button type="button" class="ap-compute-btn" id="ap-compute" data-tooltip="Startet den Neural Scheduler mit der aktuellen Konfiguration (Ziele, Gewichtung) und berechnet einen vollständigen Dienstplanvorschlag für den Monat.">
            <svg class="ap-compute-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 0l2.83-2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48 0l2.83 2.83"/>
            </svg>
            Berechnen
          </button>
        </div>
      </div>
    `;
    
    body.innerHTML = html;
    
    const updateTotal = () => {
      const tot = dutyEmps.reduce((s, e) => s + (localAutoPlanTargets[e] ?? 0), 0);
      const totEl = document.getElementById("ap-total-target");
      if (totEl) totEl.textContent = String(tot);
    };

    body.querySelectorAll(".ap-step-btn").forEach((/** @type {HTMLElement} */ btn) => {
      btn.addEventListener("click", () => {
        const emp = btn.dataset.emp;
        const isPlus = btn.classList.contains("plus");
        const current = localAutoPlanTargets[emp] ?? defaultBDTarget(emp);
        const next = isPlus ? Math.min(10, current + 1) : Math.max(0, current - 1);

        localAutoPlanTargets[emp] = next;
        const input = /** @type {HTMLInputElement} */ (body.querySelector(`.ap-card-input[data-emp="${emp}"]`));
        if (input) input.value = String(next);
        updateTotal();
      });
    });

    const weightSlider = /** @type {HTMLInputElement} */ (document.getElementById("ap-weight-slider"));
    const weightSliderValue = document.getElementById("ap-weight-slider-value");
    const presetMixPct = { fairness: 0, standard: 50, wish: 100 };

    // Nur Chips innerhalb der Gewichtungs-Zeile ansprechen (nicht die
    // Strategie-Chips weiter unten, die dieselbe Klasse für einheitliches
    // Aussehen teilen, aber `data-strategy` statt `data-profile` tragen).
    const weightRow = document.getElementById("ap-weight-row");
    weightRow?.querySelectorAll(".ap-weight-chip").forEach((/** @type {HTMLElement} */ chip) => {
      chip.addEventListener("click", () => {
        localWeightProfile = chip.dataset.profile;
        weightRow.querySelectorAll(".ap-weight-chip").forEach((/** @type {HTMLElement} */ c) => {
          c.classList.toggle("is-active", c.dataset.profile === localWeightProfile);
        });
        // Regler auf die dem Preset entsprechende Position zurücksetzen, damit
        // beide Bedienelemente stets denselben Zustand widerspiegeln.
        if (weightSlider) weightSlider.value = String(presetMixPct[localWeightProfile] ?? 50);
        if (weightSliderValue) weightSliderValue.textContent = "–";
      });
    });

    weightSlider?.addEventListener("input", () => {
      const mixPct = parseInt(weightSlider.value, 10);
      localWeightProfile = weightProfileFromMix(mixPct);
      if (weightSliderValue) weightSliderValue.textContent = String(mixPct);
      // Kein Preset ist mehr exakt aktiv, sobald der Regler manuell bewegt
      // wurde (auch wenn er zufällig auf 0/50/100 steht) -- Chips optisch
      // deaktivieren, um keinen falschen Eindruck zu erwecken.
      weightRow?.querySelectorAll(".ap-weight-chip").forEach((/** @type {HTMLElement} */ c) => {
        c.classList.remove("is-active");
      });
    });

    // Vorschlag 1 (Simulated Annealing): eigener Strategie-Umschalter, ebenso
    // auf seine eigene Zeile beschränkt.
    const strategyRow = document.getElementById("ap-strategy-row");
    strategyRow?.querySelectorAll(".ap-weight-chip").forEach((/** @type {HTMLElement} */ chip) => {
      chip.addEventListener("click", () => {
        localOptimizationStrategy = chip.dataset.strategy;
        strategyRow.querySelectorAll(".ap-weight-chip").forEach((/** @type {HTMLElement} */ c) => {
          c.classList.toggle("is-active", c.dataset.strategy === localOptimizationStrategy);
        });
      });
    });

    document.getElementById("ap-reset-defaults")?.addEventListener("click", () => {
      dutyEmps.forEach((e) => {
        localAutoPlanTargets[e] = defaultBDTarget(e);
      });
      body.querySelectorAll(".ap-card-input").forEach((/** @type {HTMLInputElement} */ inp) => {
        inp.value = String(localAutoPlanTargets[inp.dataset.emp]);
      });
      updateTotal();
    });
      
    const computeBtn = document.getElementById("ap-compute");
    if (computeBtn) {
      computeBtn.addEventListener("click", () => {
        state.isAutoplanRunning = true; // Vorschlag 9: Mutex-Sperre setzen
        localApViewMode = "progress";
        renderProgressShell();
        
        requestAnimationFrame(() => {
          setTimeout(async () => {
            try {
              const result = await computeAutoPlan(localAutoPlanTargets, localWeightProfile, { strategy: localOptimizationStrategy });
              if (!result) {
                showToast("Fehler bei der Berechnung");
                localApViewMode = "config";
                renderAutoPlanModal();
                return;
              }
              localAutoPlanResult = result;
              const activeWeightKey = typeof localWeightProfile === "string" ? localWeightProfile : "custom";
              localAutoPlanAlternatives = { [activeWeightKey]: result };
              Object.keys(AUTO_PLAN_WEIGHT_PROFILES).forEach((key) => {
                if (key === activeWeightKey) return;
                const altResult = computeAutoPlan(localAutoPlanTargets, key, { strategy: localOptimizationStrategy });
                if (altResult && typeof altResult.then === "function") {
                  altResult.then((r) => { if (r) localAutoPlanAlternatives[key] = r; });
                }
              });
              await streamProgressLogs(result);
            } catch (err) {
              // Verhindert, dass eine unerwartete Ausnahme im Scheduler die
              // Autoplan-Mutex-Sperre (state.isAutoplanRunning) dauerhaft
              // gesetzt lässt und damit die gesamte App (Tastatur, Gitter,
              // Undo/Redo) bis zum Neuladen der Seite blockiert.
              console.error("computeAutoPlan failed:", err);
              showToast("Fehler bei der Berechnung");
              localApViewMode = "config";
              renderAutoPlanModal();
            } finally {
              state.isAutoplanRunning = false; // Mutex-Sperre immer freigeben
            }
          }, 60);
        });
      });
    }
  } else if (localApViewMode === "result") {
    renderResultView();
  }
}

export function renderProgressShell() {
  const body = document.getElementById("ap-body");
  const applyBtn = document.getElementById("ap-apply");
  if (!body) return;
  
  if (applyBtn) applyBtn.style.display = "none";
  
  body.style.height = "";
  body.style.maxHeight = "";
  body.style.overflow = "hidden";
  body.style.padding = "10px";
  body.style.display = "flex";
  body.style.flexDirection = "column";
  
  body.innerHTML = `
    <div class="ap-engine ap-engine-immersive ap-engine-compact" style="flex:1; min-height:0; display:flex; flex-direction:column;">
      <div class="ap-hero-shell ap-hero-shell-compact" style="flex-shrink:0;">
        <div class="ap-hero-hud">
          <div class="ap-hud-block">
            <span class="ap-hud-kicker">RadPlan Neural Scheduler</span>
            <div class="ap-hud-title" id="ap-prog-title">Constraint Analyse</div>
          </div>
          <div class="ap-hud-spectacle" aria-hidden="true" id="ap-hud-spectacle-container">
          </div>
        </div>
        
        <div class="ap-live-stats" aria-label="Live-Statistik">
          <div class="ap-ls-item"><strong class="ap-ls-val" id="ap-ls-bd">0</strong><span class="ap-ls-lbl">D-Dienste</span></div>
          <span class="ap-ls-sep" aria-hidden="true"></span>
          <div class="ap-ls-item"><strong class="ap-ls-val" id="ap-ls-hg">0</strong><span class="ap-ls-lbl">HG-Dienste</span></div>
          <span class="ap-ls-sep" aria-hidden="true"></span>
          <div class="ap-ls-item"><strong class="ap-ls-val" id="ap-ls-rules">0</strong><span class="ap-ls-lbl">Regeln</span></div>
          <span class="ap-ls-sep" aria-hidden="true"></span>
          <div class="ap-ls-item"><strong class="ap-ls-val" id="ap-ls-swaps">0</strong><span class="ap-ls-lbl">Optimierung</span></div>
        </div>

        <div class="ap-bar-wrap" id="ap-bar-wrap">
          <div class="ap-bar-track">
            <div class="ap-bar-fill" id="ap-prog-bar"></div>
            <div class="ap-bar-glow" id="ap-prog-glow"></div>
          </div>
          <div class="ap-bar-info">
            <span class="ap-bar-phase" id="ap-phase-name">Analysiere Constraints...</span>
            <span class="ap-bar-pct" id="ap-prog-pct">0%</span>
          </div>
        </div>
      </div>

      <div class="ap-engine-main" style="flex:1; min-height:0; display:flex; gap:16px;">
        <div class="ap-neural-view">
          <div id="ap-neural-container" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
          <div class="ap-neural-vignette" style="pointer-events:none;"></div>
        </div>

        <div class="ap-terminal ap-terminal-deep">
          <div class="ap-term-header">
            <span class="ap-term-title">Trace Console</span>
          </div>
          <div class="ap-term-body" id="ap-term-body"></div>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const container = document.getElementById("ap-neural-container");
    if (!container) return;

    if (neuralGraphInstance) {
      neuralGraphInstance.dispose();
    }
    neuralGraphInstance = new NeuralGraph(container);
    const daysCount = daysInMonth(state.year, state.month);
    neuralGraphInstance.initData(daysCount, planData.employees);

    const spectacleContainer = document.getElementById("ap-hud-spectacle-container");
    if (spectacleContainer) {
      neuralGraphInstance.attachMiniMap(spectacleContainer);
    }
  });
}

export async function streamProgressLogs(result) {
  const logContainer = document.getElementById("ap-term-body");
  const barEl = document.getElementById("ap-prog-bar");
  const pctEl = document.getElementById("ap-prog-pct");
  const phaseEl = document.getElementById("ap-phase-name");
  const progTitle = document.getElementById("ap-prog-title");
  
  const log = result.log;
  const telemetry = result.ruleTelemetry?.events || [];

  let bdCount = 0;
  let hgCount = 0;
  let swapCount = 0;
  const logStarted = performance.now();

  const totalTargetDurationMs = 22000;
  const delayPerEntry = Math.max(50, totalTargetDurationMs / log.length);

  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    await sleep(delayPerEntry);

    let dutyType = "D";
    if (entry.msg && entry.msg.includes("HG")) {
      dutyType = "HG";
    }

    const isAssignment = entry.icon === "→" || entry.icon === "🟣" || entry.icon === "🩹";
    const isSwap = entry.icon === "🔀" || entry.icon === "🔁" || entry.icon === "🧠";

    if (isAssignment) {
      if (dutyType === "HG") {
        hgCount++; 
      } else {
        bdCount++;
      }
    }
    
    if (isSwap) {
      swapCount++;
    }
    
    const bdEl = document.getElementById("ap-ls-bd");
    const hgEl = document.getElementById("ap-ls-hg");
    const swapEl = document.getElementById("ap-ls-swaps");
    const rulesEl = document.getElementById("ap-ls-rules");

    if (logContainer) {
      const div = document.createElement("div");
      div.className = "ap-log-entry";
      const t = ((performance.now() - logStarted) / 1000).toFixed(2);
      div.innerHTML = `<span class="ap-log-icon">${esc(entry.icon)}</span><span class="ap-log-msg">[${t}s] ${esc(entry.msg)}</span>`;
      logContainer.appendChild(div);
      logContainer.scrollTop = logContainer.scrollHeight;
    }

    if (neuralGraphInstance) {
      if (isSwap) {
        if (entry.dayIdx !== undefined && entry.oldEmpId && entry.newEmpId) {
          neuralGraphInstance.triggerSwap(entry.dayIdx, entry.oldEmpId, entry.newEmpId, dutyType);
        }
      } else if (isAssignment) {
        if (entry.dayIdx !== undefined) {
          if (entry.oldEmpId && entry.newEmpId) {
            neuralGraphInstance.triggerSwap(entry.dayIdx, entry.oldEmpId, entry.newEmpId, dutyType);
          } else if (entry.newEmpId || entry.empId) {
            neuralGraphInstance.triggerAssignment(entry.dayIdx, entry.newEmpId || entry.empId, dutyType);
          }
        }
      }
      if (entry.msg.includes("KRITISCH") || entry.msg.includes("Penalty") || entry.icon === "⚠" || entry.icon === "🚨") {
        if (entry.dayIdx !== undefined) {
          neuralGraphInstance.triggerError(entry.dayIdx, entry.newEmpId || entry.empId, dutyType);
        }
      }

      // Recalculate filled counts based on neural graph state
      bdCount = 0;
      hgCount = 0;
      for (const cellData of neuralGraphInstance.cells.values()) {
        if (cellData.dSlot.classList.contains('has-val')) bdCount++;
        if (cellData.hgSlot.classList.contains('has-val')) hgCount++;
      }

      if (entry.phase === "deep") {
        if (i % 10 === 0) neuralGraphInstance.setPhase("deep");
        if (progTitle && progTitle.textContent !== "Deep-Search Optimierung") {
          progTitle.textContent = "Deep-Search Optimierung";
        }
      } else if (entry.phase === "hg") {
        if (i % 5 === 0) neuralGraphInstance.setPhase("hg");
        if (progTitle && progTitle.textContent !== "Hintergrund-Allokation") {
          progTitle.textContent = "Hintergrund-Allokation";
        }
      } else if (entry.phase === "greedy" || entry.phase === "bd_weekend" || entry.phase === "bd_workday") {
        if (i % 5 === 0) neuralGraphInstance.setPhase("greedy");
        if (progTitle && progTitle.textContent !== "Greedy-Heuristik Pass") {
          progTitle.textContent = "Greedy-Heuristik Pass";
        }
      } else if (entry.phase === "init" || !entry.phase) {
        if (i % 5 === 0) neuralGraphInstance.setPhase("init");
        if (progTitle && progTitle.textContent !== "Constraint Analyse") {
          progTitle.textContent = "Constraint Analyse";
        }
      }
    }

    if (bdEl) bdEl.textContent = String(bdCount);
    if (hgEl) hgEl.textContent = String(hgCount);
    if (swapEl) swapEl.textContent = String(swapCount);
    if (rulesEl) rulesEl.textContent = String(telemetry.length);

    if (barEl) barEl.style.width = entry.pct + "%";
    if (pctEl) pctEl.textContent = entry.pct + "%";
    if (phaseEl) phaseEl.textContent = entry.msg;
  }

  if (localApAnimationId) {
    cancelAnimationFrame(localApAnimationId);
  }

  if (neuralGraphInstance) {
     neuralGraphInstance.triggerSuccess(result.assignments);
     if (progTitle) {
       progTitle.textContent = "Berechnung abgeschlossen";
     }
  }

  await new Promise(resolve => {
    const wrap = document.getElementById("ap-bar-wrap");
    if (wrap) {
      wrap.innerHTML = `
        <button type="button" class="mbtn" id="ap-show-result-btn" style="width:100%; justify-content:center; background:linear-gradient(135deg, #22c55e, #16a34a); color:#fff; font-weight:700; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3); border:none; margin-top:8px;">
          Ergebnis anzeigen
        </button>
      `;
      const btn = document.getElementById("ap-show-result-btn");
      if (btn) {
        btn.addEventListener("click", resolve);
      } else {
        setTimeout(resolve, 1500);
      }
    } else {
      setTimeout(resolve, 1500);
    }
  });

  localApViewMode = "result";
  renderResultView();
}

export function renderResultView() {
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidaysCached(y);
  const emps = [...planData.employees];
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  
  const { summary } = localAutoPlanResult;
  const qualityRaw = summary.quality || {};
  // Bugfix: bdSpread/hgSpread/weekendSpread sind Standardabweichungen
  // (computeFairnessSpread() in autoplan.js) und damit i. d. R. irrationale
  // Kommazahlen (z. B. 0.5994789404108991) – ungerundet wurden bisher bis zu
  // 12 Nachkommastellen direkt im UI angezeigt. Für die Anzeige auf eine
  // Nachkommastelle runden, exakt wie an anderer Stelle im Auswertungs-Hub
  // (fmt.dec1) üblich.
  const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
  const quality = {
    score: String(qualityRaw.score || "0.0"),
    bdSpread: round1(qualityRaw.bdSpread),
    hgSpread: round1(qualityRaw.hgSpread),
    weekendSpread: round1(qualityRaw.weekendSpread),
    wishFulfillmentRate: Number(qualityRaw.wishFulfillmentRate) || 0,
    dutyCoverageMisses: Number(qualityRaw.dutyCoverageMisses) || 0,
    hgCoverageMisses: Number(qualityRaw.hgCoverageMisses) || 0,
    deepMoves: Number(qualityRaw.deepMoves) || 0
  };
  const qualityTooltips = {
    score: "Neural Fitness Index (NFI). Der komprimierte Wert für Abdeckung, Fairness und Regelkonformität.",
    // Bugfix: computeFairnessSpread() berechnet die Standardabweichung
    // (Wurzel der mittleren quadrierten Abweichung vom Durchschnitt), nicht
    // die Differenz zwischen höchstem und niedrigstem Wert – der bisherige
    // Tooltip-Text beschrieb also eine andere Kennzahl als tatsächlich
    // angezeigt wurde.
    bdSpread: "Standardabweichung der Bereitschaftsdienst-Anzahl zwischen den Mitarbeitenden (0 = perfekt gleich verteilt).",
    hgSpread: "Standardabweichung der Hintergrunddienst-Anzahl zwischen den Mitarbeitenden (0 = perfekt gleich verteilt).",
    weekendSpread: "Standardabweichung der Wochenend-/Feiertagsdienste zwischen den Mitarbeitenden (0 = perfekt gleich verteilt).",
    wishes: "Prozentanteil erfüllter Dienstwünsche im gewählten Monat.",
    gaps: "Summe der Tage ohne BD- oder HG-Besetzung.",
    deepMoves: "Anzahl zusätzlicher Optimierungsschritte in der finalen Suchphase."
  };
  const body = document.getElementById("ap-body");
  
  body.style.height = "auto";
  body.style.maxHeight = "72vh";
  body.style.overflowY = "auto";
  body.style.padding = "24px";
  body.style.display = "block";
  
  const applyBtn = document.getElementById("ap-apply");
  const reportBtn = document.getElementById("ap-report-btn");
  
  if (applyBtn) applyBtn.style.display = "";
  if (reportBtn) {
    reportBtn.style.display = "inline-flex";
  }

  const dayTag = (d) => {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const isWE = wd === 5 || wd === 6 || wd === 0;
    const cls = hol ? " ap-day-hol" : isWE ? " ap-day-we" : "";
    return `<span class="ap-day-tag${cls}">${DOW_ABBR[wd]}\u2009${d}.</span>`;
  };

  let html = `
    <div class="ap-result-hero">
      <div class="ap-result-score is-clickable" id="ap-score-trigger" data-tooltip="${qualityTooltips.score}">
        <span class="ap-result-score-kicker" title="${qualityTooltips.score}">Neural Fitness Index (NFI)</span>
        <strong>${quality.score}</strong>
        <span class="ap-result-score-sub">Maximalwert: 100.0</span>
      </div>
      <div class="ap-result-metrics">
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.bdSpread}"><span>BD-Streuung</span><strong>${quality.bdSpread}</strong></div>
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.hgSpread}"><span>HG-Streuung</span><strong>${quality.hgSpread}</strong></div>
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.weekendSpread}"><span>WE-Dienste</span><strong>${quality.weekendSpread}</strong></div>
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.wishes}"><span>Wünsche</span><strong>${Math.round(quality.wishFulfillmentRate * 100)}%</strong></div>
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.gaps}"><span>Lücken</span><strong>${quality.dutyCoverageMisses + quality.hgCoverageMisses}</strong></div>
        <div class="ap-result-metric" data-tooltip="${qualityTooltips.deepMoves}"><span>Deep-Moves</span><strong>${quality.deepMoves}</strong></div>
      </div>
    </div>
  `;

  const altKeys = Object.keys(AUTO_PLAN_WEIGHT_PROFILES);
  if (altKeys.length > 1 && altKeys.some((k) => localAutoPlanAlternatives[k])) {
    // Vorschlag 7 (Pareto-Vergleichsansicht): statt die drei Gewichtungsprofile
    // nur als lose Kartenreihe mit je eigenem NFI-Wert nebeneinanderzustellen,
    // werden sie zusätzlich auf zwei ECHTEN, gegenläufigen Zieldimensionen
    // verortet — Fairness (Ø der BD-/HG-/WE-Fairness-Teilscores) auf der
    // Y-Achse, Wunscherfüllung auf der X-Achse — und als Streudiagramm
    // dargestellt. Ein Profil gilt als Pareto-optimal, wenn kein anderes
    // Profil in BEIDEN Dimensionen mindestens gleich gut und in mindestens
    // einer strikt besser ist ("nicht dominiert") — macht den tatsächlichen
    // Trade-off sichtbar, statt ihn hinter einem einzigen Blend-Wert (NFI) zu
    // verstecken.
    const paretoPoints = altKeys
      .filter((key) => localAutoPlanAlternatives[key])
      .map((key) => {
        const aq = localAutoPlanAlternatives[key].summary?.quality || {};
        const fairnessScore = ((aq.bdFairnessScore ?? 0) + (aq.hgFairnessScore ?? 0) + (aq.weekendFairnessScore ?? 0)) / 3;
        return { key, fairnessScore, wishScore: aq.wishScore ?? 0, dominatedBy: /** @type {{key: string}|undefined} */ (undefined) };
      });
    paretoPoints.forEach((p) => {
      p.dominatedBy = paretoPoints.find((o) => o.key !== p.key
        && o.fairnessScore >= p.fairnessScore && o.wishScore >= p.wishScore
        && (o.fairnessScore > p.fairnessScore || o.wishScore > p.wishScore));
    });

    const SVG_SIZE = 220;
    const PAD = 26;
    const toX = (v) => PAD + (v / 100) * (SVG_SIZE - 2 * PAD);
    const toY = (v) => (SVG_SIZE - PAD) - (v / 100) * (SVG_SIZE - 2 * PAD);
    const paretoSvg = `
      <svg class="ap-pareto-svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}" role="img" aria-label="Streudiagramm: Fairness gegen Wunscherfüllung je Gewichtungsprofil">
        <line x1="${PAD}" y1="${SVG_SIZE - PAD}" x2="${SVG_SIZE - PAD}" y2="${SVG_SIZE - PAD}" stroke="#475569" stroke-width="1"/>
        <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${SVG_SIZE - PAD}" stroke="#475569" stroke-width="1"/>
        <text x="${SVG_SIZE / 2}" y="${SVG_SIZE - 6}" text-anchor="middle" font-size="8" fill="#94A3B8">Wunscherfüllung →</text>
        <text x="8" y="${SVG_SIZE / 2}" text-anchor="middle" font-size="8" fill="#94A3B8" transform="rotate(-90 8 ${SVG_SIZE / 2})">Fairness →</text>
        ${paretoPoints.map((p) => {
          const profile = AUTO_PLAN_WEIGHT_PROFILES[p.key];
          const isActive = typeof localWeightProfile === "string" && p.key === localWeightProfile;
          const cx = toX(p.wishScore), cy = toY(p.fairnessScore);
          const isOptimal = !p.dominatedBy;
          const fill = isActive ? "#0EA5E9" : isOptimal ? "#22C55E" : "#64748B";
          return `
            <circle cx="${cx}" cy="${cy}" r="${isActive ? 6 : 5}" fill="${fill}" fill-opacity="${isOptimal ? 0.9 : 0.55}" stroke="#0B1929" stroke-width="1.5"/>
            <text x="${cx}" y="${cy - 9}" text-anchor="middle" font-size="7.5" fill="#CBD5E1">${esc(profile.label)}</text>
          `;
        }).join("")}
      </svg>
    `;

    html += `
      <div class="ap-alt-compare">
        <div class="ap-alt-compare-hd">Alternative Gewichtungen <span class="ap-sect-hint">— Pareto-Vergleich: Fairness vs. Wunscherfüllung</span></div>
        <div class="ap-pareto-wrap">
          <div class="ap-pareto-chart" data-tooltip="Jeder Punkt ist ein vollständig berechnetes Gewichtungsprofil. Grün = Pareto-optimal (kein anderes Profil ist in Fairness UND Wunscherfüllung mindestens gleich gut und in einem davon besser). Grau = von einem anderen Profil dominiert. Blau = aktuell aktives Profil.">${paretoSvg}</div>
          <div class="ap-pareto-legend">
            <span class="ap-pareto-leg-item"><i class="ap-pareto-dot" style="background:#22C55E"></i>Pareto-optimal</span>
            <span class="ap-pareto-leg-item"><i class="ap-pareto-dot" style="background:#64748B"></i>Dominiert</span>
            <span class="ap-pareto-leg-item"><i class="ap-pareto-dot" style="background:#0EA5E9"></i>Aktiv</span>
          </div>
        </div>
        <div class="ap-alt-cards">
          ${altKeys.map((key) => {
            const profile = AUTO_PLAN_WEIGHT_PROFILES[key];
            const altResult = localAutoPlanAlternatives[key];
            const isActive = typeof localWeightProfile === "string" && key === localWeightProfile;
            if (!altResult) {
              return `
                <div class="ap-alt-card is-loading">
                  <div class="ap-alt-card-name">${profile.label}</div>
                  <div class="ap-alt-card-loading">Wird berechnet…</div>
                </div>
              `;
            }
            const aq = altResult.summary?.quality || {};
            const point = paretoPoints.find((p) => p.key === key);
            const paretoBadge = point?.dominatedBy
              ? `<span class="ap-alt-card-tag ap-alt-card-tag-dominated" data-tooltip="In Fairness UND Wunscherfüllung mindestens gleich gut, in mindestens einer Dimension besser abgedeckt durch: ${esc(AUTO_PLAN_WEIGHT_PROFILES[point.dominatedBy.key].label)}.">Dominiert von ${esc(AUTO_PLAN_WEIGHT_PROFILES[point.dominatedBy.key].label)}</span>`
              : `<span class="ap-alt-card-tag ap-alt-card-tag-pareto" data-tooltip="Kein anderes berechnetes Profil ist in Fairness UND Wunscherfüllung mindestens gleich gut und in mindestens einer Dimension besser.">Pareto-optimal</span>`;
            return `
              <div class="ap-alt-card${isActive ? " is-active" : ""}" data-profile="${key}">
                <div class="ap-alt-card-name">${profile.label}${isActive ? ' <span class="ap-alt-card-tag">Aktiv</span>' : ""}</div>
                <div class="ap-alt-card-hint">${profile.hint}</div>
                <div class="ap-alt-card-pareto-badge">${paretoBadge}</div>
                <div class="ap-alt-card-stats">
                  <span title="${qualityTooltips.score}">NFI <strong>${aq.score || "0.0"}</strong></span>
                  <span title="${qualityTooltips.wishes}">Wünsche <strong>${Math.round((aq.wishFulfillmentRate || 0) * 100)}%</strong></span>
                  <span title="${qualityTooltips.bdSpread}">BD-Streuung <strong>${round1(aq.bdSpread)}</strong></span>
                  <span title="${qualityTooltips.hgSpread}">HG-Streuung <strong>${round1(aq.hgSpread)}</strong></span>
                </div>
                ${isActive ? "" : `<button type="button" class="mbtn mbtn-ghost ap-alt-use-btn" data-profile="${key}" style="width:100%; margin-top:8px; font-size:11px; padding:6px 10px; justify-content:center;">Diesen Plan verwenden</button>`}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  let bdHtml = `
    <div class="ap-table-wrap">
      <table class="ap-table">
        <thead>
          <tr>
            <th class="ap-th-name">Mitarbeitende</th>
            <th class="ap-th">Ziel</th>
            <th class="ap-th">Ist</th>
            <th class="ap-th-days">D-Tage</th>
            <th class="ap-th">WE-Soll</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  dutyEmps.forEach((e) => {
    const bd = summary.bd[e];
    const meta = getEmpMeta(e);
    const pc = posColor(meta.position);
    bdHtml += `
      <tr>
        <td class="ap-td-name" style="border-left:3px solid ${pc.border}">
          <span>${esc(e)}</span>
        </td>
        <td class="ap-td ap-td-num">${bd.target}</td>
        <td class="ap-td ap-td-num" style="font-weight:700;color:${bd.count >= bd.target ? '#15803D' : '#B91C1C'}">${bd.count}</td>
        <td class="ap-td ap-td-days">${bd.days.map(d => dayTag(d)).join("")}</td>
        <td class="ap-td ap-td-num">${bd.weDuty}</td>
      </tr>
    `;
  });
  
  bdHtml += `</tbody></table></div>`;
  
  html += `
    <div class="ap-collapse-wrap">
      <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
        <div class="ap-collapse-title">
          <span class="ap-sect-badge" style="background:#EF4444;color:#fff">D</span>
          Bereitschaftsdienst-Verteilung
        </div>
        <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="ap-collapse-content">
        <div class="ap-collapse-content-inner">
          <div class="ap-collapse-content-pad">${bdHtml}</div>
        </div>
      </div>
    </div>
  `;

  let hgHtml = `
    <div class="ap-table-wrap">
      <table class="ap-table">
        <thead>
          <tr>
            <th class="ap-th-name">Mitarbeitende</th>
            <th class="ap-th">HG-Anzahl</th>
            <th class="ap-th-days">HG-Tage</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  emps.filter(e => isFacharzt(e) && !isDutyExempt(e)).forEach((e) => {
    const hg = summary.hg[e];
    const meta = getEmpMeta(e);
    const pc = posColor(meta.position);
    hgHtml += `
      <tr>
        <td class="ap-td-name" style="border-left:3px solid ${pc.border}">
          <span>${esc(e)}</span>
        </td>
        <td class="ap-td ap-td-num" style="font-weight:700">${hg.count}</td>
        <td class="ap-td ap-td-days">${hg.days.map(d => dayTag(d)).join("")}</td>
      </tr>
    `;
  });
  
  hgHtml += `</tbody></table></div>`;

  html += `
    <div class="ap-collapse-wrap is-collapsed">
      <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
        <div class="ap-collapse-title">
          <span class="ap-sect-badge" style="background:#0EA5E9;color:#fff">HG</span>
          Hintergrunddienst-Verteilung
        </div>
        <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="ap-collapse-content">
        <div class="ap-collapse-content-inner">
          <div class="ap-collapse-content-pad">${hgHtml}</div>
        </div>
      </div>
    </div>
  `;

  if (summary.infos.length) {
    html += `
      <div class="ap-collapse-wrap is-collapsed">
        <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
          <div class="ap-collapse-title">
            <span class="ap-sect-badge" style="background:#0EA5E9;color:#fff">i</span>
            Verteilungs-Details
          </div>
          <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="ap-collapse-content">
          <div class="ap-collapse-content-inner">
            <div class="ap-collapse-content-pad">
              <div class="ap-infos">
                ${summary.infos.map(i => `<div class="ap-info-item">${esc(i)}</div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (summary.warnings.length) {
    html += `
      <div class="ap-collapse-wrap">
        <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
          <div class="ap-collapse-title">
            <span class="ap-sect-badge" style="background:#F97316;color:#fff">!</span>
            Hinweise &amp; Warnungen
          </div>
          <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="ap-collapse-content">
          <div class="ap-collapse-content-inner">
            <div class="ap-collapse-content-pad">
              <div class="ap-warnings">
                ${summary.warnings.map(w => `<div class="ap-warn-item${w.startsWith('KRITISCH') ? ' ap-warn-item-critical' : ''}">${esc(w)}</div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Vorschlag 6 (Konflikt-Drilldown "Was blockiert diesen Tag?"): für jeden
  // am Ende tatsächlich unbesetzten Tag wird aufgelistet, welche konkrete
  // Regel JEDE einzelne dienstberechtigte Person an diesem Tag blockiert hat
  // — statt nur "Tag X: kein BD besetzt." zu vermelden.
  const coverageGaps = summary.coverageGaps || [];
  if (coverageGaps.length) {
    const dutyLabel = { D: "Bereitschaftsdienst", HG: "Hintergrunddienst" };
    html += `
      <div class="ap-collapse-wrap">
        <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
          <div class="ap-collapse-title">
            <span class="ap-sect-badge" style="background:#DC2626;color:#fff">?</span>
            Besetzungslücken: Was blockiert diesen Tag? (${coverageGaps.length})
          </div>
          <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="ap-collapse-content">
          <div class="ap-collapse-content-inner">
            <div class="ap-collapse-content-pad">
              <div class="ap-gap-hint">Für jeden unbesetzten Tag: der konkrete Ausschlussgrund je dienstberechtigter Person, ermittelt nach denselben Kriterien wie die Zwangsbelegung (Coverage Repair).</div>
              <div class="ap-gap-list">
                ${coverageGaps.map((gap) => `
                  <div class="ap-gap-item">
                    <div class="ap-gap-item-hd">
                      <span class="ap-report-date">${esc(DOW_ABBR[weekday(y, m, gap.day)])}, ${gap.day}. ${esc(MONTHS_SHORT[m])}</span>
                      <span class="ap-report-duty ${esc(gap.duty)}">${esc(gap.duty)}</span>
                      <span class="ap-gap-item-title">${dutyLabel[gap.duty] || gap.duty} nicht besetzbar</span>
                    </div>
                    <div class="ap-gap-blockers">
                      ${gap.blockers.map((b) => `
                        <div class="ap-gap-blocker-row">
                          <span class="ap-gap-blocker-emp">${esc(b.emp)}</span>
                          <span class="ap-gap-blocker-reason">${esc(b.reason)}</span>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Vorschlag 9 (Transparente Konflikt-Eskalation): dedizierte Übersicht aller
  // Regel-Lockerungen/-Eskalationen aus ruleTelemetry.events, statt nur eines
  // Zählers während der Ladeanimation. Jeder Eintrag benennt Phase, konkrete
  // Regel und (soweit vorhanden) den exakten Tag/die betroffene Person.
  const escalationEvents = (localAutoPlanResult.ruleTelemetry?.events || []).filter(ev => ev.severity === "warn" || ev.severity === "critical");
  if (escalationEvents.length) {
    const severityMeta = {
      critical: { bg: "#DC2626", label: "Kritisch" },
      warn: { bg: "#F97316", label: "Eskalation" }
    };
    const phaseLabels = {
      bd_weekend: "BD Wochenende/Feiertag",
      bd_workday: "BD Werktag",
      hg_assign: "HG-Erstverteilung",
      coverage_repair: "Coverage-Zwangsbelegung",
      validate: "Abschlussprüfung"
    };
    html += `
      <div class="ap-collapse-wrap">
        <div class="ap-collapse-head" onclick="this.parentElement.classList.toggle('is-collapsed')">
          <div class="ap-collapse-title">
            <span class="ap-sect-badge" style="background:#F97316;color:#fff">⚠</span>
            Regel-Eskalationen (${escalationEvents.length})
          </div>
          <svg class="ap-collapse-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="ap-collapse-content">
          <div class="ap-collapse-content-inner">
            <div class="ap-collapse-content-pad">
              <div class="ap-escalation-hint">Jede Zeile benennt exakt, welche Regel wann und wo gelockert oder zwangsweise aufgehoben wurde, statt nur die Gesamtzahl zu nennen.</div>
              <div class="ap-escalation-list">
                ${escalationEvents.map(ev => `
                  <div class="ap-escalation-row">
                    <span class="ap-escalation-sev" style="background:${(severityMeta[ev.severity] || severityMeta.warn).bg}">${(severityMeta[ev.severity] || severityMeta.warn).label}</span>
                    <span class="ap-escalation-phase">${esc(phaseLabels[ev.phase] || ev.phase || "—")}</span>
                    <span class="ap-escalation-label">${esc(ev.label)}</span>
                    <span class="ap-escalation-detail">${esc(ev.detail || "")}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  html += `
    <div class="ap-config-actions" style="margin-top:20px">
      <button class="mbtn mbtn-ghost" id="ap-back-config">Konfiguration ändern &amp; neu berechnen</button>
    </div>
  `;
  
  body.innerHTML = html;
  
  document.getElementById("ap-back-config")?.addEventListener("click", () => {
    localApViewMode = "config";
    renderAutoPlanModal();
  });
  
  document.getElementById("ap-score-trigger")?.addEventListener("click", () => {
    openScoreInfoModal(localAutoPlanResult);
  });

  body.querySelectorAll(".ap-alt-use-btn").forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.profile;
      const altResult = localAutoPlanAlternatives[key];
      if (!altResult) return;
      localWeightProfile = key;
      localAutoPlanResult = altResult;
      renderResultView();
    });
  });
}

export function renderReportModal() {
  if (!localAutoPlanResult || !localAutoPlanResult.report) return;
  
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidaysCached(y);
  const body = document.getElementById("ap-report-body");
  if (!body) return;
  
  body.innerHTML = "";
  
  const list = document.createElement("div");
  list.className = "ap-report-list";

  localAutoPlanResult.report.forEach((item) => {
    const wd = weekday(y, m, item.day);
    const dName = DOW_LONG[wd];
    const holNm = hols[dateKey(y, m, item.day)] || "";

    const hasAlternatives = Array.isArray(item.alternatives) && item.alternatives.length > 0;
    // Vorschlag 1 (Erklärbarkeit): vollständige Punktzahl-Aufschlüsselung, die
    // zusätzlich zu den knappen Tags jeden einzelnen Score-Beitrag benennt.
    const hasBreakdown = Array.isArray(item.breakdown) && item.breakdown.length > 0;
    const hasWhy = hasAlternatives || hasBreakdown;
    // Vorschlag 9 (Transparente Konflikt-Eskalation): benennt exakt, welche
    // Regel(n) für diese Zuweisung gelockert/aufgehoben wurden.
    const hasRelaxNote = Array.isArray(item.relaxReasons) && item.relaxReasons.length > 0;

    const itemEl = document.createElement("div");
    itemEl.className = "ap-report-item";
    itemEl.innerHTML = `
      <div class="ap-report-header">
        <span class="ap-report-date">${esc(dName)}, ${item.day}. ${esc(MONTHS_SHORT[m])} ${holNm ? "(" + esc(holNm) + ")" : ""}</span>
        <span class="ap-report-duty ${esc(item.duty)}">${esc(item.duty)}</span>
        <span class="ap-report-emp">${esc(item.emp)}</span>
        ${hasWhy ? `<button type="button" class="ap-report-why-btn" title="Vollständige Punktzahl-Aufschlüsselung und verworfene Alternativen anzeigen">Warum ${esc(item.emp)}?</button>` : ""}
      </div>
      <div class="ap-report-body">${esc(item.reason)}</div>
      ${hasRelaxNote ? `
        <div class="ap-report-relax-note" title="Diese Regel(n) wurden bei dieser Zuweisung ausnahmsweise gelockert bzw. aufgehoben, weil keine reguläre Lösung mehr gefunden wurde.">
          <strong>Regel-Eskalation:</strong> ${item.relaxReasons.map(r => esc(r)).join(" ")}
        </div>
      ` : ""}
      <div class="ap-report-tags">
        ${item.tags.map(t => `<span class="ap-report-tag">${esc(t)}</span>`).join("")}
      </div>
      ${hasWhy ? `
        <div class="ap-report-alts" hidden>
          ${hasBreakdown ? `
            <div class="ap-report-alts-lbl">Vollständige Punktzahl-Aufschlüsselung (Summe = ${esc(String(Math.round(item.breakdown.reduce((s, b) => s + (Number.isFinite(b.delta) ? b.delta : 0), 0))))}):</div>
            <div class="ap-report-breakdown">
              ${item.breakdown.map((b) => `
                <div class="ap-report-breakdown-row">
                  <span class="ap-report-breakdown-label">${esc(b.label)}</span>
                  <span class="ap-report-breakdown-delta ${b.delta >= 0 ? "is-pos" : "is-neg"}">${b.delta === -Infinity ? "Ausschluss" : (b.delta > 0 ? "+" : "") + b.delta}</span>
                </div>
              `).join("")}
            </div>
          ` : ""}
          ${hasAlternatives ? `
            <div class="ap-report-alts-lbl">Nächstbeste Alternativen (verworfen):</div>
            ${item.alternatives.map((a) => `
              <div class="ap-report-alt-row">
                <span class="ap-report-alt-emp">${esc(a.emp)}</span>
                <span class="ap-report-alt-score">${a.score === null || a.score === undefined ? "" : "Score " + a.score}</span>
                <span class="ap-report-alt-tags">${esc(a.tags.join(" · ") || "—")}</span>
              </div>
            `).join("")}
          ` : ""}
        </div>
      ` : ""}
    `;

    itemEl.querySelector(".ap-report-why-btn")?.addEventListener("click", () => {
      const alts = /** @type {HTMLElement} */ (itemEl.querySelector(".ap-report-alts"));
      if (alts) alts.hidden = !alts.hidden;
    });

    list.appendChild(itemEl);
  });

  body.appendChild(list);
  showOverlay("modal-ap-report");
}

export function applyAutoPlan() {
  if (!localAutoPlanResult || !planMode) return;
  
  recordPlanHistory();
  planData.assignments = JSON.parse(JSON.stringify(localAutoPlanResult.assignments));
  
  const external = localAutoPlanResult.externalAssignments || {};
  let changed = false;
  
  for (const [mk, empMap] of Object.entries(external)) {
    if (!DATA[mk]) {
      DATA[mk] = { employees: [...planData.employees], assignments: {}, rbn: {} };
    }
    
    for (const [emp, dayMap] of Object.entries(empMap)) {
      if (!DATA[mk].employees.includes(emp)) {
        DATA[mk].employees.push(emp);
      }
      if (!DATA[mk].assignments[emp]) {
        DATA[mk].assignments[emp] = {};
      }
      for (const [day, patch] of Object.entries(dayMap)) {
        const cell = { ...(DATA[mk].assignments[emp][day] || {}), ...patch };
        if (Object.keys(cell).length === 0) {
          delete DATA[mk].assignments[emp][day];
        } else {
          DATA[mk].assignments[emp][day] = cell;
        }
        changed = true;
      }
    }
  }
  
  if (changed) {
    saveToStorage();
  }
  
  recordPlanHistory();
  hideOverlay("modal-autoplan");
  render();
  showToast("Auto-Plan erfolgreich übernommen");
  localAutoPlanResult = null;
}

