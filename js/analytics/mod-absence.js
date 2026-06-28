// ===========================================================================
//  Auswertungs-Hub · Modul „Abwesenheiten & Kapazität"
// ---------------------------------------------------------------------------
//  Verdichtet Abwesenheiten (Urlaub, Krankheit, FZA, Weiterbildung) zu
//  Kennzahlen, zeigt den tagesgenauen Kapazitäts-/Engpass-Verlauf, eine
//  Mitarbeitenden-Tabelle (Drill-down ins Profil) sowie Engpass-/Kollisions-
//  warnungen (gleichzeitige Abwesenheit kritischer CT-Leitungspaare).
// ===========================================================================

import {
  computeAbsence, fmt, scoreColor, SPECIAL_RULES,
  getCell, daysInMonth, weekday, isWorkday, getSaxonyHolidaysCached,
  MONTHS_SHORT, ABSENCE_CODES,
} from './engine.js';

const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

// Modulinterner Chart-Handle (für sauberes dispose()).
let _chart = null;

// HTML-Escape für Mitarbeitenden-Namen in Attributen/Text.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Kurzes Tagesdatum „T.M." aus einem daySeries-/Datenpunkt.
function shortDate(p) {
  return `${p.day}.${p.month + 1}.`;
}

// Prüft, ob eine Person an einem Tag abwesend/dienstfrei ist (Basis-Code in
// ABSENCE_CODES oder „F").
function isAbsentDay(year, month, emp, day) {
  const cell = getCell(year, month, emp, day) || {};
  const base = (cell.assignment || '').split('/')[0].trim();
  return !!base && (ABSENCE_CODES.includes(base) || base === 'F');
}

export default {
  id: 'absence',
  label: 'Abwesenheiten & Kapazität',
  usesRange: true,
  icon: ICON,

  render(root, ctx) {
    const range = ctx.range;
    const data = computeAbsence(range);
    const { rows, daySeries, totalAbsenceDays, peak } = data;

    // --- Leerzustand -------------------------------------------------------
    if (!daySeries.length && !rows.length) {
      root.innerHTML = `<div class="ah-empty">Keine Abwesenheitsdaten im Zeitraum ${esc(range.label)}.</div>`;
      return;
    }

    // --- KPIs --------------------------------------------------------------
    const avgRate = daySeries.length
      ? daySeries.reduce((a, p) => a + (p.rate || 0), 0) / daySeries.length
      : 0;

    const kpis = [
      { label: 'Gesamt-Ausfalltage', value: fmt.int(totalAbsenceDays), sub: `${esc(range.label)}`, tone: '#7C3AED' },
      { label: 'Spitze gleichzeitig', value: peak ? fmt.int(peak.absent) : '—', sub: peak ? `am ${shortDate(peak)} · ${fmt.int(peak.present)} präsent` : 'keine Werktage', tone: peak && peak.absent > 0 ? '#EF4444' : '#0EA5E9' },
      { label: 'Ø Abwesenheitsquote', value: fmt.pct(avgRate), sub: 'je Werktag', tone: scoreColor(100 - Math.min(100, avgRate)) },
      { label: 'Betroffene Personen', value: fmt.int(rows.length), sub: 'mit ≥ 1 Ausfalltag', tone: '#0EA5E9' },
    ];
    const kpiHtml = `
      <div class="ah-kpi-grid abs-kpis">
        ${kpis.map((k) => `
          <div class="ah-kpi">
            <div class="ah-kpi-label">${k.label}</div>
            <div class="ah-kpi-value" style="color:${k.tone}">${k.value}</div>
            <div class="ah-kpi-sub">${k.sub}</div>
          </div>`).join('')}
      </div>`;

    // --- Kapazitäts-/Engpass-Verlauf --------------------------------------
    const maxAbs = daySeries.reduce((m, p) => Math.max(m, p.absent), 0);
    // Schwelle für „Engpass"-Hervorhebung: ab 60 % der Spitze (min. 2).
    const hot = Math.max(2, Math.ceil(maxAbs * 0.6));

    const hasChart = typeof Chart !== 'undefined';
    let trendHtml;
    if (hasChart) {
      trendHtml = `<div class="abs-chart-box"><canvas class="abs-canvas"></canvas></div>`;
    } else {
      // CSS-Balkenstreifen-Fallback.
      const bars = daySeries.map((p) => {
        const h = maxAbs ? Math.round((p.absent / maxAbs) * 100) : 0;
        const cls = p.absent >= hot && p.absent > 0 ? ' abs-bar--hot' : '';
        return `<div class="abs-bar${cls}" title="${shortDate(p)} (${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][p.wd]}): ${p.absent} abwesend, ${p.present} präsent">
          <div class="abs-bar-fill" style="height:${Math.max(2, h)}%"></div>
        </div>`;
      }).join('');
      trendHtml = `<div class="abs-strip">${bars || '<div class="ah-empty">Keine Werktage im Zeitraum.</div>'}</div>`;
    }
    const trendCard = `
      <div class="ah-card">
        <div class="ah-section-title">Kapazitäts-/Engpass-Verlauf</div>
        <div class="ah-sub abs-legend">Gleichzeitige Abwesenheiten je Werktag · Spitze ${fmt.int(maxAbs)} · Engpass ab ${fmt.int(hot)}</div>
        ${trendHtml}
      </div>`;

    // --- Tabelle: Abwesenheiten je Mitarbeitende -------------------------
    let tableHtml;
    if (rows.length) {
      const body = rows.map((r) => `
        <tr class="clickable" data-emp="${esc(r.emp)}">
          <td>${esc(r.emp)}</td>
          <td class="ah-td-num">${fmt.int(r.vac)}</td>
          <td class="ah-td-num">${fmt.int(r.sick)}</td>
          <td class="ah-td-num">${fmt.int(r.fza)}</td>
          <td class="ah-td-num">${fmt.int(r.wb)}</td>
          <td class="ah-td-num abs-td-total">${fmt.int(r.total)}</td>
        </tr>`).join('');
      tableHtml = `
        <div class="ah-table-wrap abs-table-wrap">
          <table class="ah-table">
            <thead>
              <tr>
                <th>Mitarbeitende</th><th>Urlaub</th><th>Krank</th>
                <th>FZA</th><th>WB</th><th>Gesamt</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>`;
    } else {
      tableHtml = `<div class="ah-empty">Keine Mitarbeitenden mit Ausfalltagen im Zeitraum.</div>`;
    }
    const tableCard = `
      <div class="ah-card">
        <div class="ah-section-title">Abwesenheiten je Mitarbeitende</div>
        ${tableHtml}
      </div>`;

    // --- Engpass-/Kollisionswarnungen ------------------------------------
    const collisions = [];
    const pairs = SPECIAL_RULES.ctLeadershipPairs || [];
    range.months.forEach(({ year, month }) => {
      const hols = getSaxonyHolidaysCached(year);
      const dim = daysInMonth(year, month);
      for (let d = 1; d <= dim; d++) {
        if (!isWorkday(year, month, d, hols)) continue;
        pairs.forEach(([a, b]) => {
          if (isAbsentDay(year, month, a, d) && isAbsentDay(year, month, b, d)) {
            collisions.push({ a, b, date: `${d}.${month + 1}.${year}`, short: `${d}.${MONTHS_SHORT[month]}` });
          }
        });
      }
    });

    const topDays = daySeries.slice()
      .filter((p) => p.absent > 0)
      .sort((a, b) => b.absent - a.absent)
      .slice(0, 3);

    let warnHtml = '';
    if (collisions.length) {
      warnHtml += `<div class="abs-warn-block">
        <div class="abs-warn-head">Gleichzeitige Abwesenheit kritischer Vertretungspaare (CT-Leitung)</div>
        <div class="abs-pill-row">
          ${collisions.map((c) => `<span class="ah-pill ah-pill-bad">${esc(c.a)} &amp; ${esc(c.b)} · ${c.short}</span>`).join('')}
        </div>
      </div>`;
    }
    if (topDays.length) {
      warnHtml += `<div class="abs-warn-block">
        <div class="abs-warn-head">Höchste gleichzeitige Abwesenheit</div>
        <div class="abs-pill-row">
          ${topDays.map((p) => `<span class="ah-pill ${p.absent >= hot ? 'ah-pill-bad' : 'ah-pill-warn'}">${shortDate(p)} · ${fmt.int(p.absent)} von ${fmt.int(p.head)} abwesend</span>`).join('')}
        </div>
      </div>`;
    }
    if (!warnHtml) {
      warnHtml = `<div class="ah-ok-banner">Keine Engpässe oder Kollisionen im Zeitraum ${esc(range.label)}.</div>`;
    }
    const warnCard = `
      <div class="ah-card">
        <div class="ah-section-title">Engpass-/Kollisionswarnungen</div>
        ${warnHtml}
      </div>`;

    // --- Zusammensetzen ----------------------------------------------------
    root.innerHTML = kpiHtml + trendCard + tableCard + warnCard;

    // --- Tabellen-Drill-down ----------------------------------------------
    root.querySelectorAll('tr[data-emp]').forEach((tr) => {
      tr.addEventListener('click', () => {
        if (typeof ctx.openProfile === 'function') ctx.openProfile(tr.dataset.emp);
      });
    });

    // --- Chart.js-Rendering (sofern verfügbar) ----------------------------
    if (hasChart) {
      const canvas = root.querySelector('.abs-canvas');
      if (canvas && daySeries.length) {
        const labels = daySeries.map((p) => shortDate(p));
        const values = daySeries.map((p) => p.absent);
        const colors = daySeries.map((p) => (p.absent >= hot && p.absent > 0 ? '#EF4444' : '#7C3AED'));
        try {
          _chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: 'Abwesend',
                data: values,
                backgroundColor: colors,
                borderRadius: 3,
                maxBarThickness: 22,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (it) => {
                      const p = daySeries[it.dataIndex];
                      return `${p.absent} abwesend · ${p.present} präsent (von ${p.head})`;
                    },
                  },
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0, font: { size: 9 } } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: 'rgba(148,163,184,.18)' } },
              },
            },
          });
        } catch (_) { /* Chart-Init still optional */ }
      }
    }
  },

  dispose() {
    if (_chart) {
      try { _chart.destroy(); } catch (_) { /* noop */ }
      _chart = null;
    }
  },
};
