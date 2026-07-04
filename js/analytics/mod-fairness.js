// ===========================================================================
//  RadPlan · Auswertungs-Hub – Modul „Fairness & Verteilung"
// ---------------------------------------------------------------------------
//  FTE-gewichtete Gerechtigkeit der Dienstverteilung (Bereitschafts-,
//  Hintergrund-, Wochenend- und Feiertagsdienste). Das Modul deklariert
//  `usesRange: true` und respektiert daher den vom Hub gewählten Zeitraum
//  (Monat/Quartal/Jahr/rollierend/frei) über computeDutyFairnessForRange()
//  statt — wie zuvor — stets das Gesamtjahr über ctx.range.year zu rechnen.
// ===========================================================================

import { computeDutyFairnessForRange, computeBurnoutRisk, fmt, scoreColor, TT, TTI } from './engine.js';
import { esc } from '../utils.js';

let chartInstance = null;

const ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 6a4 4 0 0 0 6 0z"/><path d="M19 7l-3 6a4 4 0 0 0 6 0z"/><path d="M7 21h10"/></svg>';

// Status → Pillen-Text, Pillen-Klasse, Fair-Δ-Farbe.
const STATUS_META = {
  over:     { label: 'Über', pill: 'ah-pill-bad', color: '#DC2626' },
  under:    { label: 'Unter', pill: 'ah-pill-good', color: '#2563EB' },
  balanced: { label: 'Fair', pill: 'ah-pill-warn', color: 'var(--text-faint)' },
};

function devColor(status) {
  return (STATUS_META[status] || STATUS_META.balanced).color;
}

// Zentrierter Abweichungsbalken: blau nach links (Unter), rot nach rechts (Über).
function devBar(totalDev, maxAbs) {
  const span = maxAbs > 0 ? maxAbs : 1;
  const frac = Math.min(1, Math.abs(totalDev) / span);
  const pct = (frac * 50).toFixed(1);
  const over = totalDev > 0.05;
  const under = totalDev < -0.05;
  let fill = '';
  if (over) {
    fill = `<div class="fair-dev-fill fair-dev-over" style="left:50%;width:${pct}%;"></div>`;
  } else if (under) {
    fill = `<div class="fair-dev-fill fair-dev-under" style="right:50%;width:${pct}%;"></div>`;
  }
  return `<div class="fair-dev-bar"><div class="fair-dev-zero"></div>${fill}</div>`;
}

// Vorschlag 8 (Burnout-/Belastungs-Risiko-Score): eigener Abschnitt mit
// Rangliste + Score-Balken, direkt unter der Fairness-Rangliste, da beide
// dieselbe Personenliste sortieren, nur nach unterschiedlichen Kriterien.
const BURNOUT_LEVEL_META = {
  hoch: { label: 'Hoch', color: '#DC2626', pill: 'ah-pill-bad' },
  mittel: { label: 'Mittel', color: '#F59E0B', pill: 'ah-pill-warn' },
  niedrig: { label: 'Niedrig', color: '#22C55E', pill: 'ah-pill-good' },
};

function burnoutSectionHtml(burnout) {
  if (!burnout || !burnout.rows.length) return '';
  const rows = burnout.rows;
  const rowsHtml = rows.map((r) => {
    const lm = BURNOUT_LEVEL_META[r.level] || BURNOUT_LEVEL_META.niedrig;
    const breakdownTip = esc(
      `Überlast: ${r.overloadScore}/100 (Gesamtdienste ${fmt.signed1(r.totalDev)} ggü. fairem Anteil) · `
      + `WE-Überlast: ${r.weOverloadScore}/100 (${fmt.signed1(r.weekendDev)}) · `
      + `Häufung: ${r.clusterScore}/100 (${r.clusterCount}× Dienste mit <3 Tagen Abstand).`
    );
    return `
      <tr class="clickable" data-emp="${esc(r.emp)}">
        <td>${esc(r.emp)}</td>
        <td class="ah-td-num" style="color:${lm.color};font-weight:800" data-tooltip="${esc(TT.burnoutScore)}">${r.burnoutScore}</td>
        <td data-tooltip="${breakdownTip}">
          <div class="burnout-bar-bg"><div class="burnout-bar-fill" style="width:${r.burnoutScore}%;background:${lm.color}"></div></div>
        </td>
        <td><span class="ah-pill ${lm.pill}">${lm.label}</span></td>
      </tr>`;
  }).join('');

  return `
    <div class="ah-section-title" data-tooltip="${esc(TT.burnoutScore)}">Belastungs-Risiko <span class="ah-sub">— verdichtet Überlast, WE-/Feiertagslast und Dienst-Häufung zu einem Score</span></div>
    <div class="ah-table-wrap">
      <table class="ah-table fair-table">
        <thead>
          <tr>
            <th data-tooltip="Mitarbeitende – Klick öffnet das Personenprofil.">Mitarbeitende</th>
            <th data-tooltip="${esc(TT.burnoutScore)}">Score</th>
            <th data-tooltip="${esc(TT.burnoutScore)}">Verteilung</th>
            <th data-tooltip="Hoch ≥ 70, Mittel ≥ 40, sonst Niedrig.">Einstufung</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

export default {
  id: 'fairness',
  label: 'Fairness & Verteilung',
  usesRange: true,
  icon: ICON,

  render(root, ctx) {
    const range = ctx?.range;
    const rangeLabel = range?.label ?? String(ctx?.year ?? '');
    const { rows, team } = computeDutyFairnessForRange(range);
    const burnout = computeBurnoutRisk(range);

    // Leerzustand.
    if (!team || team.count === 0) {
      root.innerHTML = `
        <div class="ah-section-title">Fairness &amp; Verteilung</div>
        <div class="fair-note">Bezug: ${esc(rangeLabel)}</div>
        <div class="ah-empty">Für ${esc(rangeLabel)} liegen keine auswertbaren Dienstdaten vor.</div>`;
      return;
    }

    // equityTotal/equityWeekend kommen aus equityIndex() und sind BEREITS
    // 0–100 (= Prozent). Nicht erneut ×100 skalieren.
    const equityTotalPct = Math.round(team.equityTotal ?? 0);
    const equityWeekendPct = Math.round(team.equityWeekend ?? 0);

    // --- KPI-Block ---
    const kpis = `
      <div class="ah-kpi-grid">
        <div class="ah-kpi">
          <span class="ah-kpi-label" data-tooltip="${esc(TT.equityTotal)}">Equity-Index gesamt</span>
          <span class="ah-kpi-value" style="color:${scoreColor(equityTotalPct)}" data-tooltip="${esc(TTI.equity(equityTotalPct, 'aller Dienste'))}">${fmt.pct(equityTotalPct)}</span>
          <span class="ah-kpi-sub">FTE-gewichtete Gleichverteilung</span>
        </div>
        <div class="ah-kpi">
          <span class="ah-kpi-label" data-tooltip="Equity-Index 0–100 nur für Wochenend- und Feiertagsdienste – die belastendsten Einsätze.">Wochenend-Equity</span>
          <span class="ah-kpi-value" style="color:${scoreColor(equityWeekendPct)}" data-tooltip="${esc(TTI.equity(equityWeekendPct, 'der Wochenend-/Feiertagsdienste'))}">${fmt.pct(equityWeekendPct)}</span>
          <span class="ah-kpi-sub">WE-/Feiertagsdienste</span>
        </div>
        <div class="ah-kpi">
          <span class="ah-kpi-label" data-tooltip="Variationskoeffizient der Gesamtdienste in Prozent: Streuung im Verhältnis zum Mittelwert. Niedriger = gleichmäßiger verteilt.">Variationskoeffizient</span>
          <span class="ah-kpi-value" data-tooltip="${esc(TTI.cv(team.cvTotal ?? 0))}">${fmt.pct(team.cvTotal ?? 0)}</span>
          <span class="ah-kpi-sub">Streuung der Gesamtlast</span>
        </div>
        <div class="ah-kpi">
          <span class="ah-kpi-label" data-tooltip="${esc(TT.spread)}">Spannweite gesamt</span>
          <span class="ah-kpi-value" data-tooltip="${esc(TTI.spread(team.minTotal, team.maxTotal, team.spreadTotal))}">${fmt.int(team.minTotal)}–${fmt.int(team.maxTotal)}</span>
          <span class="ah-kpi-sub">Differenz ${fmt.int(team.spreadTotal)} Dienste</span>
        </div>
      </div>`;

    // --- Rangliste (alle Zeilen, nie gekürzt) ---
    const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(r.totalDev ?? 0)), 0);

    const bodyRows = rows.map((r) => {
      const sm = STATUS_META[r.status] || STATUS_META.balanced;
      return `
        <tr class="clickable" data-emp="${esc(r.emp)}">
          <td>${esc(r.emp)}</td>
          <td class="ah-td-num">${fmt.int(r.bd)}</td>
          <td class="ah-td-num">${fmt.int(r.hg)}</td>
          <td class="ah-td-num">${fmt.int(r.total)}</td>
          <td class="ah-td-num">${fmt.int(r.weekendDuties)}</td>
          <td class="ah-td-num" data-tooltip="${esc(`FTE-gewichtetes Soll für Bereitschaftsdienste im gewählten Zeitraum: ${fmt.dec1(r.bdTarget)}. Ist: ${fmt.int(r.bd)}.`)}">${fmt.dec1(r.bdTarget)}</td>
          <td class="ah-td-num" data-tooltip="${esc(TTI.bdDelta(r.bdDelta))}">${fmt.signedInt(r.bdDelta)}</td>
          <td class="ah-td-num" style="color:${devColor(r.status)};font-weight:700" data-tooltip="${esc(TTI.fairDelta(r.totalDev, r.status))}">${fmt.signed1(r.totalDev)}</td>
          <td data-tooltip="${esc(TTI.fairDelta(r.totalDev, r.status))}">${devBar(r.totalDev ?? 0, maxAbs)}</td>
          <td><span class="ah-pill ${sm.pill}" data-tooltip="${esc(TTI.status(r.status))}">${sm.label}</span></td>
        </tr>`;
    }).join('');

    const table = `
      <div class="ah-table-wrap">
        <table class="ah-table fair-table">
          <thead>
            <tr>
              <th data-tooltip="Mitarbeitende – Klick öffnet das Personenprofil.">Mitarbeitende</th>
              <th data-tooltip="${esc(TT.bd)}">BD</th>
              <th data-tooltip="${esc(TT.hg)}">HG</th>
              <th data-tooltip="Gesamtzahl aller geleisteten Dienste (BD + HG) im Jahr.">Gesamt</th>
              <th data-tooltip="${esc(TT.weekendDuties)}">WE/FT</th>
              <th data-tooltip="${esc(TT.soll)}">Soll BD</th>
              <th data-tooltip="${esc(TT.delta)}">Δ Soll</th>
              <th data-tooltip="Fairness-Abweichung: geleistete Gesamtdienste minus FTE-gewichteter fairer Anteil. Positiv = über dem fairen Anteil.">Fair-Δ</th>
              <th data-tooltip="Visualisierung der Fair-Δ: blau nach links = unter, rot nach rechts = über dem fairen Anteil.">Verteilung</th>
              <th data-tooltip="Einordnung relativ zum fairen Anteil: Über, Unter oder Fair (innerhalb der Toleranz).">Status</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;

    root.innerHTML = `
      <div class="ah-section-title" data-tooltip="${esc(TT.fairness)}">Fairness &amp; Verteilung</div>
      <div class="fair-note" data-tooltip="Fairness wird für den oben gewählten Zeitraum berechnet (Monat, Quartal, Jahr, rollierend oder frei) – FTE-gewichtet auf Basis der in diesem Zeitraum tatsächlich geleisteten Dienste.">Bezug: ${esc(rangeLabel)}</div>
      ${kpis}
      <div class="ah-section-title" data-tooltip="Rangliste aller dienstfähigen Mitarbeitenden, sortiert nach Gesamtbelastung (absteigend).">Fairness-Rangliste</div>
      <div class="fair-legend">
        <span data-tooltip="Person leistet weniger Dienste als ihr FTE-gewichteter fairer Anteil."><span class="fair-legend-swatch fair-legend-under"></span>Unter dem fairen Anteil</span>
        <span data-tooltip="Person leistet mehr Dienste als ihr FTE-gewichteter fairer Anteil."><span class="fair-legend-swatch fair-legend-over"></span>Über dem fairen Anteil</span>
      </div>
      ${table}
      ${burnoutSectionHtml(burnout)}
      <div class="ah-section-title" data-tooltip="Balken = tatsächliche Gesamtdienste je Person; Linie = FTE-gewichteter fairer Anteil.">Dienste je Mitarbeitende vs. fairer Anteil</div>
      <div class="ah-card fair-chart-card"><canvas id="fair-chart" height="220"></canvas></div>`;

    // Zeilen klickbar → Profil.
    root.querySelectorAll('tr.clickable[data-emp]').forEach((tr) => {
      tr.addEventListener('click', () => ctx.openProfile?.(tr.dataset.emp));
    });

    // --- Chart.js (optional, defensiv) ---
    if (typeof Chart !== 'undefined') {
      const canvas = root.querySelector('#fair-chart');
      if (canvas) {
        try {
          chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
              labels: rows.map((r) => r.emp),
              datasets: [
                {
                  label: 'Dienste gesamt',
                  data: rows.map((r) => r.total),
                  backgroundColor: 'rgba(14,165,233,.65)',
                  borderColor: 'rgba(14,165,233,1)',
                  borderWidth: 1,
                  borderRadius: 4,
                  order: 2,
                },
                {
                  label: 'Fairer Anteil',
                  data: rows.map((r) => Math.round((r.fairTotal ?? 0) * 10) / 10),
                  type: 'line',
                  borderColor: '#F59E0B',
                  backgroundColor: '#F59E0B',
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  fill: false,
                  order: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { labels: { font: { size: 11 } } },
                tooltip: {
                  callbacks: { label: (c) => `${c.dataset.label}: ${fmt.dec1(c.parsed.y)}` },
                },
              },
              scales: {
                x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 0 }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { font: { size: 10 } } },
              },
            },
          });
        } catch (_) { /* Chart optional – tolerant */ }
      }
    }
  },

  dispose() {
    if (chartInstance) {
      try { chartInstance.destroy(); } catch (_) { /* tolerant */ }
      chartInstance = null;
    }
  },
};
