// RadPlan — Zellen-Editor (#modal-editor): Öffnen/Speichern des Editors,
// Chip-Auswahl (Arbeitsplatz/Status/Dienst/Wunsch/Fixierung) sowie das
// Entfernen von Mitarbeitenden aus einem bzw. allen Folgemonaten.
// Extrahiert aus dem früher monolithischen app.js.

import {
  WORKPLACES, STATUSES, WISH_TYPES, RBN_ROW_KEY, RBN_ROW_LABEL,
  getRbnOptionsForDate, VACATION_CODES, weekday, isHoliday, isWeekend,
  dateKey, DOW_LONG, MONTHS, getSaxonyHolidaysCached, nextCalendarDay, monthKey,
} from './constants.js';
import { state, DATA, planMode, planSessions, IS_MOBILE } from './state.js';
import {
  getCell, setCell, getRbnValue, setRbnValue, getComment, setComment,
  removeEmployee, dutyOwner,
} from './model.js';
import {
  render, updateGridCell, updateAllConflicts, updateGridStatsAndHeader,
  closeCellQuickPopover, openCellQuickPopoverFor, syncSelectionClasses,
} from './render-grid.js';
import { showOverlay, hideOverlay, showToast } from './render-modals.js';
import { renderEmployeeDashboard } from './render-employee-dashboard.js';
import { recordPlanHistory, getWish, toggleWish, isPinned, setPinned } from './planmode.js';
import { esc } from './utils.js';

export function isEditorOpen() {
  const el = document.getElementById("modal-editor");
  return el && !el.hasAttribute("hidden");
}
// Modifier-Schema für Klicks auf Tageszellen (siehe README §8.4):
//   Shift+Klick   -> Bereichs-Auswahl (Anker..Ziel) für Mehrfachauswahl.
//   Alt+Klick      -> Einzel-Auswahl: Zelle gezielt zur/aus der Mehrfachauswahl
//                      hinzufügen/entfernen, ohne einen zusammenhängenden Bereich.
//   Strg/Cmd+Klick -> öffnet direkt den (vierstufigen) Editor im Vollmodus für
//                      diese eine Zelle, statt eine Mehrfachauswahl zu beginnen
//                      bzw. nur das Schnell-Popover zu zeigen. Für die
//                      Rufbereitschafts-Zeile öffnet jeder Klick ohnehin immer
//                      den (RBN-)Editor, Modifier spielen dort keine Rolle.
// Strg/Cmd war früher für die Einzel-Auswahl reserviert; da Alt für Klicks auf
// Zellen bis dahin ungenutzt war, wurde die Einzel-Auswahl dorthin verschoben,
// um Strg/Cmd für das dokumentierte direkte Öffnen des Editors freizumachen.
export function openEditor(emp, day, options = {}) {
  const { year: y, month: m } = state;
  const { altKey = false, shiftKey = false } = options;
  const isRbnRow = emp === RBN_ROW_KEY;

  if (shiftKey && !isRbnRow) {
    if (state.multiEdit.emp !== emp || !state.multiEdit.days.length) {
      state.multiEdit.emp = emp;
      state.multiEdit.days = [day];
      state.multiEdit.anchor = day;
    } else {
      const anchor = state.multiEdit.anchor || state.multiEdit.days[0];
      const lo = Math.min(anchor, day);
      const hi = Math.max(anchor, day);
      const range = [];
      for (let dd = lo; dd <= hi; dd++) range.push(dd);
      state.multiEdit.days = range;
      state.multiEdit.anchor = anchor;
    }
    syncSelectionClasses();
    openCellQuickPopoverFor(emp, day);
    showToast(`${state.multiEdit.days.length} Tage für ${emp} markiert (Bereich)`);
    return;
  }

  if (altKey && !isRbnRow) {
    if (state.multiEdit.emp !== emp) {
      state.multiEdit.emp = emp;
      state.multiEdit.days = [];
    }
    const idx = state.multiEdit.days.indexOf(day);
    if (idx >= 0) {
      state.multiEdit.days.splice(idx, 1);
    } else {
      state.multiEdit.days.push(day);
      state.multiEdit.days.sort((a, b) => a - b);
    }
    state.multiEdit.anchor = day;
    syncSelectionClasses();
    if (state.multiEdit.days.length) openCellQuickPopoverFor(emp, day);
    else closeCellQuickPopover();
    showToast(state.multiEdit.days.length ? `${state.multiEdit.days.length} Tage für ${emp} markiert` : "Mehrfachauswahl aufgehoben");
    return;
  }

  const selectedDays = state.multiEdit.emp === emp && state.multiEdit.days.length
    ? [...state.multiEdit.days]
    : [day];
  if (!selectedDays.includes(day)) {
    selectedDays.push(day);
    selectedDays.sort((a, b) => a - b);
  }

  const cell = isRbnRow ? { assignment: getRbnValue(y, m, day) || null, duty: null } : getCell(y, m, emp, day);
  const hols = getSaxonyHolidaysCached(y);
  
  state.edit = { emp, day, isRbnRow, days: selectedDays };
  let wp = [];
  let st = null;
  
  if (isRbnRow && cell.assignment) {
    wp = [cell.assignment];
  } else if (cell.assignment) {
    cell.assignment.split("/").map((x) => x.trim()).forEach((p) => {
      if (WORKPLACES.find((w) => w.code === p)) {
        wp.push(p);
      } else if (STATUSES.find((s) => s.code === p)) {
        st = p;
      }
    });
  }
  
  state.ed = { wp: [...wp], st, duty: cell.duty || null };
  
  const wd = weekday(y, m, day);
  const hol = isHoliday(y, m, day, hols);
  const we = isWeekend(y, m, day);
  const holNm = hols[dateKey(y, m, day)] || "";
  
  const edTitle = document.getElementById("ed-title");
  if (edTitle) {
    edTitle.textContent = isRbnRow ? RBN_ROW_LABEL : emp;
  }
  
  const edSub = document.getElementById("ed-sub");
  if (edSub) {
    const selectionText = selectedDays.length > 1 ? ` · ${selectedDays.length} Tage ausgewählt` : "";
    edSub.textContent = `${DOW_LONG[wd]}, ${day}. ${MONTHS[m]} ${y}${holNm ? " · " + holNm : ""}${selectionText}`;
  }
  
  const dtlEl = document.getElementById("ed-day-label");
  if (dtlEl) {
    if (hol) {
      dtlEl.innerHTML = `<span class="day-type-label dtl-hol">Feiertag${holNm ? ": " + holNm : ""}</span>`;
    } else if (we) {
      dtlEl.innerHTML = `<span class="day-type-label dtl-we">Wochenende</span>`;
    } else {
      dtlEl.innerHTML = "";
    }
  }
  
  const modalHd = document.getElementById("ed-modal-hd");
  const planBadge = document.getElementById("ed-plan-badge");
  const modalEl = document.getElementById("modal-editor");
  
  if (planMode) {
    if (modalHd) modalHd.classList.add("plan-mode-hd");
    if (modalEl) modalEl.classList.add("plan-mode-editor");
    if (planBadge) planBadge.style.display = "inline-flex";
  } else {
    if (modalHd) modalHd.classList.remove("plan-mode-hd");
    if (modalEl) modalEl.classList.remove("plan-mode-editor");
    if (planBadge) planBadge.style.display = "none";
  }
  
  const commentTa = /** @type {HTMLTextAreaElement & {_ypCountHandler?: () => void}} */ (document.getElementById("ed-comment-ta"));
  const commentCount = document.getElementById("ed-comment-count");
  const commentSection = document.getElementById("ed-comment-section");
  if (commentSection) commentSection.style.display = isRbnRow ? "none" : "";
  if (commentSection?.parentElement?.classList.contains("ed-step")) {
    commentSection.parentElement.style.display = isRbnRow ? "none" : "";
  }
  if (commentTa) {
    commentTa.value = isRbnRow ? "" : (getComment(y, m, emp, day) || "");
    if (commentCount) commentCount.textContent = `${commentTa.value.length}/200`;
    commentTa.removeEventListener("input", commentTa._ypCountHandler);
    commentTa._ypCountHandler = () => {
      if (commentCount) commentCount.textContent = `${commentTa.value.length}/200`;
    };
    commentTa.addEventListener("input", commentTa._ypCountHandler);
  }

  refreshEditorChips();
  showOverlay("modal-editor");
}

// Delegierte Klick-Handler für die Editor-Chip-Gruppen (Arbeitsplatz, Status,
// Dienst, Wunsch): ein einziger Listener pro Container statt eines Listeners
// pro Chip, der bei jedem refreshEditorChips()-Aufruf (also bei jedem
// Chip-Klick) neu vergeben würde.
export function initEditorChipDelegation() {
  const wpC = document.getElementById("ed-wp");
  wpC?.addEventListener("click", (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".chip-wp"));
    if (!chip || chip.classList.contains("dim") || !wpC.contains(chip)) return;
    const code = chip.dataset.code;
    const { isRbnRow } = state.edit;
    const i = state.ed.wp.indexOf(code);
    if (i >= 0) {
      state.ed.wp.splice(i, 1);
    } else if (isRbnRow) {
      state.ed.wp = [code];
    } else {
      state.ed.wp.push(code);
    }
    refreshEditorChips();
  });

  const stC = document.getElementById("ed-st");
  stC?.addEventListener("click", (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".chip-st"));
    if (!chip || chip.dataset.clickable !== "1" || !stC.contains(chip)) return;
    const code = chip.dataset.code;
    state.ed.st = state.ed.st === code ? null : code;
    if (state.ed.st) {
      state.ed.wp = [];
    }
    refreshEditorChips();
  });

  const dtC = document.getElementById("ed-duty");
  dtC?.addEventListener("click", (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".chip-duty"));
    if (!chip || chip.classList.contains("blocked") || !dtC.contains(chip)) return;
    const code = chip.dataset.code;
    state.ed.duty = state.ed.duty === code ? null : code;
    refreshEditorChips();
  });

  const wishC = document.getElementById("ed-wish");
  wishC?.addEventListener("click", (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest(".chip-wish"));
    if (!chip || !wishC.contains(chip)) return;
    const { emp, day } = state.edit;
    toggleWish(emp, day, chip.dataset.code);
    refreshEditorChips();
  });
}

export function refreshEditorChips() {
  const { year: y, month: m } = state;
  const { wp, st, duty } = state.ed;
  const { emp, day, isRbnRow } = state.edit;
  
  const wpLabel = document.getElementById("ed-wp-label");
  const wpHint = document.getElementById("ed-wp-hint");
  const stSection = document.getElementById("ed-st-section");
  const dutySection = document.getElementById("ed-duty-section");
  const dutyWarn = document.getElementById("ed-duty-warn");
  
  if (isRbnRow) {
    if (wpLabel) wpLabel.textContent = "RD Neurorad";
    if (wpHint) wpHint.textContent = "— manuelle Namensauswahl, wird nie durch Auto-Planung verändert";
    if (stSection) stSection.style.display = "none";
    if (dutySection) dutySection.style.display = "none";
    if (dutyWarn) dutyWarn.style.display = "none";
  } else {
    if (wpLabel) wpLabel.textContent = "Arbeitsplatz";
    if (wpHint) wpHint.textContent = "— Mehrfachauswahl möglich, z. B. MR/CT";
    if (stSection) stSection.style.display = "";
    if (dutySection) dutySection.style.display = "";
    if (dutySection?.parentElement?.classList.contains("ed-step")) {
      dutySection.parentElement.style.display = "";
    }
  }
  
  const wpC = document.getElementById("ed-wp");
  if (wpC) {
    wpC.innerHTML = "";
    
    const rbnOptions = getRbnOptionsForDate(y, m);
    if (isRbnRow && state.ed.wp[0] && !rbnOptions.includes(state.ed.wp[0])) {
      rbnOptions.unshift(state.ed.wp[0]);
    }
    
    const wpOptions = isRbnRow ? rbnOptions.map((label) => ({ code: label, label, bg: "#E0F2FE", fg: "#0C4A6E" })) : WORKPLACES;
    
    wpOptions.forEach((w, idx) => {
      const on = wp.includes(w.code);
      const dimC = isRbnRow ? false : !!st;
      
      const chip = document.createElement("div");
      chip.className = `chip-wp${on ? " on" : ""}${dimC ? " dim" : ""}`;
      chip.dataset.code = w.code;
      chip.style.cssText = `background:${on ? w.fg : w.bg};color:${on ? "#fff" : w.fg};position:relative`;

      if (isRbnRow) {
        chip.style.minWidth = "190px";
        chip.style.alignItems = "flex-start";
        chip.style.textAlign = "left";
        chip.style.lineHeight = "1.35";
        chip.style.fontFamily = "var(--font-sans)";
        chip.style.fontSize = "12px";
        chip.style.fontWeight = "700";
      }
      
      const kbdBadge = `<span style="position:absolute;top:2px;right:2px;font-family:var(--font-mono);font-size:7px;font-weight:700;line-height:1;opacity:${dimC ? 0.3 : 0.55};background:rgba(0,0,0,0.12);color:inherit;padding:1px 3px;border-radius:2px;pointer-events:none">${idx + 1}</span>`;
      
      if (isRbnRow) {
        chip.innerHTML = `${esc(w.label)}`;
      } else {
        chip.innerHTML = `${kbdBadge}${esc(w.code)}<span class="chip-sub">${esc(w.label)}</span>`;
      }
      
      wpC.appendChild(chip);
    });
    
    let kbdHint = document.getElementById("ed-wp-kbd-hint");
    if (!kbdHint) {
      kbdHint = document.createElement("div");
      kbdHint.id = "ed-wp-kbd-hint";
      kbdHint.style.cssText = "margin-top:6px;display:flex;align-items:center;gap:5px;font-size:9.5px;color:var(--gray-400);";
      kbdHint.innerHTML = `
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;opacity:.6">
          <rect x="2" y="4" width="20" height="16" transform="translate(2 4)"/>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12"/>
        </svg>
        <span>Ziffern 1–8 für Arbeitsplatz · D für Bereitschaft · H für Hintergrund · S oder ↵ zum Speichern</span>
      `;
      wpC.parentNode.insertBefore(kbdHint, wpC.nextSibling);
    }
    kbdHint.style.display = !isRbnRow && !IS_MOBILE ? "flex" : "none";
  }
  
  if (isRbnRow) {
    const stC = document.getElementById("ed-st");
    if (stC) stC.innerHTML = "";
    
    const dtC = document.getElementById("ed-duty");
    if (dtC) dtC.innerHTML = "";
    
    const edPreviewVal = document.getElementById("ed-preview-val");
    if (edPreviewVal) edPreviewVal.textContent = state.ed.wp[0] || "—";
    
    const edPreviewDuties = document.getElementById("ed-preview-duties");
    if (edPreviewDuties) edPreviewDuties.innerHTML = "";
    
    const wishC = document.getElementById("ed-wish");
    const wishHd = document.getElementById("ed-wish-hd");
    if (wishC) wishC.style.display = "none";
    if (wishHd) wishHd.style.display = "none";

    const planStep = document.getElementById("ed-plan-step");
    if (planStep) planStep.style.display = "none";
    if (dutySection?.parentElement?.classList.contains("ed-step")) {
      dutySection.parentElement.style.display = "none";
    }
    return;
  }
  
  const stC = document.getElementById("ed-st");
  if (stC) {
    stC.innerHTML = "";
    
    STATUSES.forEach((s) => {
      const on = st === s.code;
      const dimC = wp.length > 0 && !on;
      
      const chip = document.createElement("div");
      chip.className = `chip-st${on ? " on" : ""}${dimC ? " dim" : ""}`;
      chip.dataset.code = s.code;
      chip.dataset.clickable = (!dimC || on) ? "1" : "";
      chip.style.cssText = `background:${on ? s.fg : s.bg};color:${on ? "#fff" : s.fg}`;
      chip.innerHTML = `${s.code}<span class="chip-sub">${s.label}</span>`;
      stC.appendChild(chip);
    });
  }
  
  const dtC = document.getElementById("ed-duty");
  if (dtC) {
    dtC.innerHTML = "";
    const warnParts = [];
    
    ["D", "HG"].forEach((dc) => {
      const on = duty === dc;
      const owner = dutyOwner(y, m, day, dc);
      const taken = owner && owner !== emp;
      
      const chip = document.createElement("div");
      chip.className = `chip-duty ${on ? "duty-" + dc + "-on" : "duty-" + dc + "-off"}${taken ? " blocked" : ""}`;
      chip.dataset.code = dc;
      chip.innerHTML = `${dc}<span class="duty-sub">${dc === "D" ? "Bereitschaftsdienst" : "Hintergrunddienst"}</span>`;

      if (taken) {
        warnParts.push(`${dc} bereits vergeben: ${owner}`);
      }
      dtC.appendChild(chip);
    });
    
    const warnEl = document.getElementById("ed-duty-warn");
    const nextDay = nextCalendarDay(y, m, day);
    
    if (nextDay.y !== undefined) {
      const nextCell = getCell(nextDay.y, nextDay.m, emp, nextDay.d);
      if (nextCell.assignment) {
        const codes = nextCell.assignment.split("/").map((x) => x.trim());
        if (codes.some((c) => VACATION_CODES.includes(c))) {
          warnParts.push(`⚠ Folgetag (${nextDay.d}.) ist Urlaub`);
        }
      }
    }
    
    if (warnEl) {
      if (warnParts.length) {
        warnEl.style.display = "block";
        warnEl.textContent = warnParts.join(" · ");
      } else {
        warnEl.style.display = "none";
      }
    }
  }
  
  const planStep = document.getElementById("ed-plan-step");
  if (planStep) planStep.style.display = planMode ? "" : "none";

  const wishC = document.getElementById("ed-wish");
  if (wishC) {
    if (planMode) {
      wishC.style.display = "flex";
      const wishHd = document.getElementById("ed-wish-hd");
      if (wishHd) wishHd.style.display = "";

      wishC.innerHTML = "";
      const currentWish = getWish(emp, day);
      
      WISH_TYPES.forEach((wt) => {
        const on = currentWish === wt.code;
        const chip = document.createElement("div");
        chip.className = `chip-wish${on ? " wish-on" : ""}`;
        chip.dataset.code = wt.code;
        chip.style.cssText = on ? `background:${wt.fg};color:#fff;border-color:${wt.fg}` : `background:${wt.bg};color:${wt.fg};border-color:${wt.border}`;
        chip.innerHTML = `<span class="wish-icon">${wt.icon}</span>${wt.label}`;
        wishC.appendChild(chip);
      });
    } else {
      wishC.style.display = "none";
      const wishHd = document.getElementById("ed-wish-hd");
      if (wishHd) wishHd.style.display = "none";
    }
  }

  const pinC = document.getElementById("ed-pin");
  const pinHd = document.getElementById("ed-pin-hd");
  if (pinC) {
    if (planMode) {
      pinC.style.display = "flex";
      if (pinHd) pinHd.style.display = "";

      pinC.innerHTML = "";
      const on = isPinned(emp, day);
      const chip = document.createElement("div");
      chip.className = `chip-wish${on ? " wish-on" : ""}`;
      chip.style.cssText = on ? `background:#D97706;color:#fff;border-color:#D97706` : `background:#FEF3C7;color:#92400E;border-color:#FDE68A`;
      chip.innerHTML = `<span class="wish-icon">📌</span>${on ? "Fixiert — Solver ändert diese Zelle nicht" : "Für Auto-Plan fixieren"}`;
      chip.addEventListener("click", () => {
        setPinned(emp, day, !isPinned(emp, day));
        refreshEditorChips();
        updateGridCell(emp, day);
      });
      pinC.appendChild(chip);
    } else {
      pinC.style.display = "none";
      if (pinHd) pinHd.style.display = "none";
    }
  }

  const pv = state.ed.st || (state.ed.wp.length ? state.ed.wp.join("/") : "");
  const edPreviewVal = document.getElementById("ed-preview-val");
  if (edPreviewVal) {
    edPreviewVal.textContent = pv || "—";
  }
  
  const bdg = document.getElementById("ed-preview-duties");
  if (bdg) {
    if (state.ed.duty) {
      bdg.innerHTML = `<span class="preview-duty-badge badge-${state.ed.duty}" style="background:${state.ed.duty === "D" ? "#EF4444" : "#0EA5E9"};color:#fff">${state.ed.duty}</span>`;
    } else {
      bdg.innerHTML = "";
    }
  }
}

export function saveEditor() {
  const { year: y, month: m } = state;
  const { emp, day, isRbnRow } = state.edit;
  const days = Array.isArray(state.edit.days) && state.edit.days.length ? state.edit.days : [day];
  
  if (isRbnRow) {
    if (planMode) recordPlanHistory();
    setRbnValue(y, m, day, state.ed.wp[0] || "");
    if (planMode) recordPlanHistory();
    hideOverlay("modal-editor");
    updateGridCell(RBN_ROW_KEY, day);
    updateAllConflicts();
    updateGridStatsAndHeader([day]);
    return;
  }
  
  const { wp, st, duty } = state.ed;
  const assignment = st ? st : wp.length ? wp.join("/") : null;
  
  if (planMode) recordPlanHistory();
  
  let autoFCount = 0;
  const touchedDays = new Set();
  days.forEach((targetDay) => {
    setCell(y, m, emp, targetDay, {
      assignment: assignment || null,
      duty: duty || null,
    });
    touchedDays.add(targetDay);

    if (duty === "D") {
      const next = nextCalendarDay(y, m, targetDay);
      const ex = getCell(next.y, next.m, emp, next.d);
      if (!ex.assignment) {
        setCell(next.y, next.m, emp, next.d, {
          assignment: "F",
          duty: ex.duty || null,
        });
        autoFCount++;
        if (next.y === y && next.m === m) {
          touchedDays.add(next.d);
        }
      }
    }
  });

  if (planMode) recordPlanHistory();

  if (!isRbnRow) {
    const commentTa = /** @type {HTMLTextAreaElement} */ (document.getElementById("ed-comment-ta"));
    if (commentTa) {
      setComment(y, m, emp, day, commentTa.value);
    }
  }

  hideOverlay("modal-editor");
  state.multiEdit = { emp: null, days: [], anchor: null };
  if (days.length > 1) {
    const fSuffix = autoFCount > 0 ? ` (inkl. ${autoFCount}x F automatisch)` : "";
    showToast(`${days.length} Tage gespeichert${fSuffix}`);
  } else if (autoFCount > 0) {
    showToast("F automatisch gesetzt");
  }
  touchedDays.forEach((d) => updateGridCell(emp, d));
  updateAllConflicts();
  updateGridStatsAndHeader([...touchedDays]);
}

export function confirmRemoveEmployee(name) {
  const { year: y, month: m } = state;
  if (confirm(`„${name}" aus ${MONTHS[m]} ${y} entfernen?`)) {
    removeEmployee(y, m, name);
    render();
    renderEmployeeDashboard();
  }
}

export function confirmRemoveEmployeeFuture(name) {
  const { year: y, month: m } = state;
  if (confirm(`„${name}" ab ${MONTHS[m]} ${y} dauerhaft (auch aus allen Folgemonaten) entfernen?\n\nACHTUNG: Dies löscht den Mitarbeiter und alle seine Dienste unwiderruflich aus der Datenbank für die Zukunft.`)) {
    removeEmployee(y, m, name);

    const currentKey = monthKey(y, m);
    const [cY, cM] = currentKey.split('-').map(Number);
    Object.keys(DATA).forEach(key => {
      const parts = key.split('-');
      const tyNum = parseInt(parts[0], 10);
      const tmNum = parseInt(parts[1], 10);
      if (tyNum > cY || (tyNum === cY && tmNum > cM)) {
        removeEmployee(tyNum, tmNum, name);
      }
    });

    if (planMode && planSessions) {
      Object.keys(planSessions).forEach(key => {
        const parts = key.split('-');
        const kY = parseInt(parts[0], 10);
        const kM = parseInt(parts[1], 10);
        if ((kY > cY || (kY === cY && kM >= cM)) && planSessions[key]) {
          const session = planSessions[key];
          if (session.employees) {
            session.employees = session.employees.filter(e => e !== name);
          }
          if (session.assignments && session.assignments[name]) {
            delete session.assignments[name];
          }
          if (session.wishes && session.wishes[name]) {
            delete session.wishes[name];
          }
          if (session.pins && session.pins[name]) {
            delete session.pins[name];
          }
        }
      });
    }

    render();
    showToast(`„${name}" kaskadierend entfernt`);
  }
}
