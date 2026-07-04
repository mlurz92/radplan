// ===========================================================================
//  Auswertungs-Hub · Modul „Jahresgitter" (Heatmap Monat × Mitarbeitende)
// ---------------------------------------------------------------------------
//  Native Portierung der Jahres-Heatmap aus dem früheren Jahresplaner: zeigt
//  je Monat die geleisteten Bereitschaftsdienste (BD) farbkodiert nach
//  Abweichung vom monatlichen Kollegiums-Durchschnitt; HG als Zusatz bei
//  Fachärzten. Klick auf eine Zelle springt in den jeweiligen Monat.
// ===========================================================================

import { computeYearGrid, computeMultiYearBenchmark, heatColor, posColor, EMP_COLORS, MONTHS, MONTHS_SHORT, TT } from './engine.js';
import { esc } from '../utils.js';

const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';

// Vorschlag 11 (Mehrjahres-Benchmarking): Chart-Instanz separat verwaltet,
// analog zu mod-curves.js, damit sie beim erneuten Rendern/Verlassen des
// Moduls sauber zerstört wird statt Speicher zu leaken.
let _benchmarkChart = null;

export default {
  id: 'yeargrid',
  label: 'Jahresgitter',
  usesRange: false,
  icon: ICON,

  render(root, ctx) {
    const year = ctx.year;
    const { employees, perEmp, meansBD, now } = computeYearGrid(year);

    if (!employees.length) {
      root.innerHTML = `<div class="ah-empty">Keine Mitarbeitendendaten für ${year} vorhanden.</div>`;
      return;
    }

    const monthHeaders = MONTHS_SHORT.map((mo, m) => {
      const isNow = year === now.year && m === now.month;
      const isFuture = year > now.year || (year === now.year && m > now.month);
      const moTip = `${MONTHS[m]} ${year} – Bereitschaftsdienste (D) je Person; Farbe zeigt die Abweichung vom Monats-Kollegiums-Durchschnitt.${isNow ? ' Aktueller Monat.' : (isFuture ? ' Liegt in der Zukunft.' : '')}`;
      return `<th class="yg-th-month${isNow ? ' yg-th-now' : ''}${isFuture ? ' yg-th-future' : ''}" data-tooltip="${esc(moTip)}">${mo}</th>`;
    }).join('');

    const meanRow = meansBD.map((v) => `<td class="yg-td-mean">${v > 0 ? v.toFixed(1) : '<span class="yg-dash">—</span>'}</td>`).join('');

    let bodyRows = '';
    let lastGroup = null;
    employees.forEach((emp) => {
      const d = perEmp[emp];
      const meta = d.meta;
      const pc = posColor(meta.position);
      const group = d.isFa ? 'fa' : 'aa';
      if (group !== lastGroup) {
        lastGroup = group;
        bodyRows += `<tr class="yg-group-row"><td colspan="14" class="yg-group-label">${d.isFa ? 'Fachärzte / Oberärzte' : 'Assistenzärzte'}</td></tr>`;
      }

      const cells = d.months.map((mon, m) => {
        const isNow = year === now.year && m === now.month;
        const isFuture = year > now.year || (year === now.year && m > now.month);
        if (!mon.hasData) {
          return `<td class="yg-td-cell yg-td-nodata">${isFuture ? '<span class="yg-future"></span>' : '<span class="yg-dash">—</span>'}</td>`;
        }
        const heat = d.isDutyCapable ? heatColor(mon.bd - meansBD[m]) : { bg: 'transparent', fg: '#94A3B8' };
        const hgPart = d.isFa && mon.hg > 0 ? `<span class="yg-hg">${mon.hg}<span class="yg-hg-lbl">H</span></span>` : '';
        const bdPart = d.isDutyCapable
          ? `<span class="yg-bd" style="color:${heat.fg}">${mon.bd}<span class="yg-bd-lbl">D</span></span>`
          : '<span class="yg-dash">—</span>';
        const title = `${esc(emp)} · ${MONTHS[m]} ${year}: ${mon.bd}× D${d.isFa ? ', ' + mon.hg + '× HG' : ''}`;
        // Wert-Interpretation: BD dieses Monats relativ zum Kollegiums-Ø.
        const r1 = (n) => (Math.round(n * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
        let devTxt;
        if (!d.isDutyCapable) {
          devTxt = 'von Bereitschaftsdiensten befreit.';
        } else {
          const dev = mon.bd - meansBD[m];
          const rel = dev >= 2 ? `deutlich über dem Monats-Ø (${r1(meansBD[m])})`
            : dev >= 1 ? `über dem Monats-Ø (${r1(meansBD[m])})`
            : dev > -0.5 ? `etwa im Monats-Ø (${r1(meansBD[m])})`
            : dev >= -1 ? `unter dem Monats-Ø (${r1(meansBD[m])})`
            : `deutlich unter dem Monats-Ø (${r1(meansBD[m])})`;
          devTxt = `${mon.bd} Bereitschaftsdienst(e) – ${rel}.`;
        }
        const hgTxt = d.isFa && mon.hg > 0 ? ` Außerdem ${mon.hg}× Hintergrunddienst.` : '';
        const cellTip = esc(`${emp} · ${MONTHS[m]} ${year}: ${devTxt}${hgTxt}`);
        return `<td class="yg-td-cell${isNow ? ' yg-td-now' : ''}" style="background:${heat.bg}" data-month="${m}" title="${title}" data-tooltip="${cellTip}"><div class="yg-cell-inner">${bdPart}${hgPart}</div></td>`;
      }).join('');

      const totalBd = d.isDutyCapable ? `<span class="yg-total-bd">${d.totalBD}<span class="yg-total-lbl">D</span></span>` : '<span class="yg-dash">—</span>';
      const totalHg = d.isFa && d.totalHG > 0 ? `<span class="yg-total-hg">${d.totalHG}<span class="yg-total-lbl">H</span></span>` : '';

      bodyRows += `
        <tr class="yg-emp-row" data-emp="${esc(emp)}">
          <td class="yg-td-name" style="border-left:3px solid ${pc.border}">
            <span class="yg-emp-name">${esc(emp)}</span>
            <span class="yg-emp-pos" style="color:${pc.fg};background:${pc.bg}">${meta.position}</span>
          </td>
          ${cells}
          <td class="yg-td-total"><div class="yg-total-inner">${totalBd}${totalHg}</div></td>
        </tr>`;
    });

    // Vorschlag 11: Mehrjahres-Benchmarking – bis zu 4 Kalenderjahre (inkl.
    // des aktuellen Bezugsjahres) werden anhand derselben Fairness-Kennzahlen
    // wie im Fairness-Modul gegenübergestellt, damit strukturelle Drifts über
    // mehrere Jahre sichtbar werden statt nur die Momentaufnahme eines Jahres.
    const benchmark = computeMultiYearBenchmark(year, 4);
    let benchmarkHtml = '';
    if (benchmark.years.length > 1) {
      const deltaCell = (v, goodDirection) => {
        if (v === null || v === undefined) return '<span class="yg-dash">—</span>';
        if (v === 0) return `<span class="yg-bm-delta yg-bm-delta-flat">±0</span>`;
        const isGood = goodDirection === 'up' ? v > 0 : v < 0;
        const sign = v > 0 ? '+' : '';
        return `<span class="yg-bm-delta ${isGood ? 'yg-bm-delta-good' : 'yg-bm-delta-bad'}">${sign}${v}</span>`;
      };
      benchmarkHtml = `
        <div class="ah-section-title" data-tooltip="${esc(TT.multiYearChart)}">Mehrjahres-Vergleich <span class="ah-sub">— Benchmarking über ${benchmark.years.length} Kalenderjahre</span></div>
        <div class="ah-card yg-bm-chart-card">
          <div class="yg-bm-legend" id="yg-bm-legend"></div>
          <div class="yg-bm-canvas-wrap"><canvas id="yg-bm-canvas" data-tooltip="${esc(TT.multiYearChart)}"></canvas></div>
        </div>
        <div class="ah-table-wrap">
          <table class="ah-table yg-bm-table">
            <thead>
              <tr>
                <th data-tooltip="Kalenderjahr des Vergleichs.">Jahr</th>
                <th data-tooltip="${esc(TT.multiYearMean)}">Ø Dienste/Person</th>
                <th data-tooltip="${esc(TT.multiYearEquity)}">Equity-Index</th>
                <th data-tooltip="${esc(TT.multiYearDelta)}">Δ Equity</th>
                <th data-tooltip="${esc(TT.multiYearCv)}">Streuung (CV)</th>
                <th data-tooltip="${esc(TT.multiYearDelta)}">Δ CV</th>
                <th data-tooltip="${esc(TT.multiYearSpread)}">Spannweite</th>
              </tr>
            </thead>
            <tbody>
              ${benchmark.years.map((y) => `
                <tr class="${y.isCurrentYear ? 'yg-bm-row-current' : ''}">
                  <td>${y.year}${y.isCurrentYear ? ' <span class="yg-bm-tag">laufend</span>' : ''}</td>
                  <td class="ah-td-num">${y.team.meanTotal.toFixed(1)}</td>
                  <td class="ah-td-num">${y.team.equityTotal}</td>
                  <td class="ah-td-num">${deltaCell(y.deltaEquityTotal, 'up')}</td>
                  <td class="ah-td-num">${y.team.cvTotal}%</td>
                  <td class="ah-td-num">${deltaCell(y.deltaCvTotal, 'down')}</td>
                  <td class="ah-td-num">${y.team.spreadTotal}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    root.innerHTML = `
      <div class="ah-section-title" data-tooltip="${esc(TT.yeargrid)}">Jahresgitter <span class="ah-sub">— BD-Belastung je Monat (Heatmap) · Bezug: ${year}</span></div>
      <div class="yg-legend">
        <span class="yg-leg-item" data-tooltip="Deutlich weniger Bereitschaftsdienste als der Monats-Kollegiums-Durchschnitt."><span class="yg-swatch" style="background:rgba(14,165,233,0.26)"></span>Deutlich unter Ø</span>
        <span class="yg-leg-item" data-tooltip="Weniger Bereitschaftsdienste als der Monats-Kollegiums-Durchschnitt."><span class="yg-swatch" style="background:rgba(14,165,233,0.14)"></span>Unter Ø</span>
        <span class="yg-leg-item" data-tooltip="Bereitschaftsdienste etwa im Monats-Kollegiums-Durchschnitt."><span class="yg-swatch" style="background:rgba(34,197,94,0.12)"></span>Im Ø-Bereich</span>
        <span class="yg-leg-item" data-tooltip="Mehr Bereitschaftsdienste als der Monats-Kollegiums-Durchschnitt."><span class="yg-swatch" style="background:rgba(249,115,22,0.15)"></span>Über Ø</span>
        <span class="yg-leg-item" data-tooltip="Deutlich mehr Bereitschaftsdienste als der Monats-Kollegiums-Durchschnitt."><span class="yg-swatch" style="background:rgba(239,68,68,0.18)"></span>Deutlich über Ø</span>
        <span class="yg-leg-hint">Farbe = BD-Abweichung vom Kollegiums-Ø je Monat · Klick auf Zelle öffnet den Monat.</span>
      </div>
      <div class="yg-scroll">
        <table class="yg-table">
          <thead>
            <tr><th class="yg-th-name" data-tooltip="Mitarbeitende, gruppiert nach Fachärzten/Oberärzten und Assistenzärzten. Klick auf den Namen öffnet das Profil.">Mitarbeitende</th>${monthHeaders}<th class="yg-th-total" data-tooltip="Summe aller Bereitschaftsdienste (D) im Jahr; bei Fachärzten zusätzlich die HG-Summe.">Σ Jahr</th></tr>
            <tr class="yg-mean-hdr"><td class="yg-td-name yg-mean-name" data-tooltip="${esc(TT.yeargridMean)}"><span class="yg-mean-icon">Ø BD</span></td>${meanRow}<td class="yg-td-mean">—</td></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      ${benchmarkHtml}`;

    root.querySelectorAll('.yg-td-cell[data-month]').forEach((cell) => {
      cell.addEventListener('click', () => {
        const m = parseInt(cell.dataset.month, 10);
        if (Number.isFinite(m)) window.dispatchEvent(new CustomEvent('radplan-navigate', { detail: { year, month: m } }));
      });
    });
    root.querySelectorAll('.yg-emp-row[data-emp]').forEach((row) => {
      row.querySelector('.yg-emp-name')?.addEventListener('click', (e) => { e.stopPropagation(); ctx.openProfile(row.dataset.emp); });
    });

    // Vorschlag 11: Chart.js Liniendiagramm der Team-Monatsdurchschnitte
    // über alle verglichenen Jahre (optional, mit Guard wie in mod-curves.js).
    const bmCanvas = root.querySelector('#yg-bm-canvas');
    if (_benchmarkChart) { try { _benchmarkChart.destroy(); } catch (_) {} _benchmarkChart = null; }
    if (bmCanvas && typeof Chart !== 'undefined' && benchmark.years.length > 1) {
      const datasets = benchmark.years.map((y, idx) => ({
        label: `${y.year}${y.isCurrentYear ? ' (laufend)' : ''}`,
        data: y.meansBD.map((v, m) => (y.isCurrentYear && m > y.monthsCovered - 1 ? null : parseFloat(v.toFixed(2)))),
        borderColor: EMP_COLORS[idx % EMP_COLORS.length],
        backgroundColor: EMP_COLORS[idx % EMP_COLORS.length] + '18',
        borderWidth: y.isCurrentYear ? 3 : 2,
        borderDash: y.isCurrentYear ? [] : [5, 3],
        pointRadius: 2.5, pointHoverRadius: 6, tension: 0.35, spanGaps: false,
      }));

      _benchmarkChart = new Chart(bmCanvas, {
        type: 'line',
        data: { labels: MONTHS_SHORT, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: {
              label: (c) => { const v = c.raw; if (v == null) return null; return ` ${c.dataset.label}: Ø ${v.toFixed(2)} BD/Person`; },
              title: (items) => MONTHS[items[0]?.dataIndex ?? 0],
            } },
          },
          scales: {
            x: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 } }, title: { display: true, text: 'Ø BD/Person', font: { size: 9 }, color: '#94A3B8' } },
          },
          animation: { duration: 350 },
        },
      });

      const bmLegend = root.querySelector('#yg-bm-legend');
      if (bmLegend) {
        bmLegend.innerHTML = benchmark.years.map((y, idx) => `<span class="crv-legitem"><span class="crv-legline" style="background:${EMP_COLORS[idx % EMP_COLORS.length]}"></span>${y.year}${y.isCurrentYear ? ' (laufend)' : ''}</span>`).join('');
      }
    }
  },

  dispose() {
    if (_benchmarkChart) { try { _benchmarkChart.destroy(); } catch (_) {} _benchmarkChart = null; }
  },
};
