// RadPlan — Listen-/Agenda-Ansicht als Alternative zur Matrix (Vorschlag 30).
//
// Die Matrix (Raster #grid-wrapper) zeigt alle Mitarbeitenden × alle Tage
// gleichzeitig — bei vielen Mitarbeitenden oder auf schmaleren Desktop-
// Fenstern wird das schnell unübersichtlich, wenn man eigentlich nur "wer hat
// wann Dienst" chronologisch durchgehen will. Diese Ansicht liefert genau das:
// einen Eintrag pro Tag mit Bereitschafts-/Hintergrunddienst-Besetzung und
// den übrigen Arbeitsplatz-Zuweisungen, analog zur bereits vorhandenen
// mobilen Tagesliste (render-grid.js renderMobileDayList), aber unabhängig
// von `IS_MOBILE` als bewusste Nutzerwahl auf dem Desktop verfügbar. Ein
// Klick auf einen Tag öffnet denselben generischen Tages-Editor
// (#modal-mobile-day, siehe mobile.js openMobileDay) wie auf Mobilgeräten —
// der ist unabhängig vom Viewport nutzbar.

import {
  MONTHS, DOW_ABBR, CODE_MAP, weekday, isHoliday, isTodayCol,
  dateKey, daysInMonth, getSaxonyHolidaysCached, isoWeekNumber,
} from './constants.js';
import { state, IS_MOBILE, TOD_Y, TOD_M, TOD_D } from './state.js';
import { getMonthData } from './model.js';
import { esc } from './utils.js';

const VIEW_MODE_STORAGE_KEY = 'radplan_v3_view_mode';

export function getViewMode() {
  return document.body.classList.contains('agenda-active') ? 'agenda' : 'matrix';
}

function updateToggleButton(mode) {
  const btn = document.getElementById('btn-view-mode');
  const iconMatrix = document.getElementById('btn-view-mode-icon-matrix');
  const iconAgenda = document.getElementById('btn-view-mode-icon-agenda');
  if (iconMatrix) iconMatrix.style.display = mode === 'agenda' ? 'none' : '';
  if (iconAgenda) iconAgenda.style.display = mode === 'agenda' ? '' : 'none';
  if (btn) {
    btn.setAttribute('aria-pressed', mode === 'agenda' ? 'true' : 'false');
    btn.title = mode === 'agenda' ? 'Zur Matrix-Ansicht wechseln' : 'Zur Listenansicht wechseln';
  }
}

export function applyViewMode(mode) {
  document.body.classList.toggle('agenda-active', mode === 'agenda');
  const gridWrapper = document.getElementById('grid-wrapper');
  const agendaView = document.getElementById('agenda-view');
  if (gridWrapper) gridWrapper.hidden = mode === 'agenda';
  if (agendaView) agendaView.hidden = mode !== 'agenda';
  updateToggleButton(mode);
  if (mode === 'agenda' && !IS_MOBILE) renderAgendaView();
}

export function setViewMode(mode, persist = true) {
  applyViewMode(mode);
  if (persist) {
    try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode); } catch { /* Session-only Fallback */ }
  }
}

export function toggleViewMode() {
  setViewMode(getViewMode() === 'agenda' ? 'matrix' : 'agenda');
}

export function initViewMode() {
  let saved = null;
  try { saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY); } catch { /* Session-only Fallback */ }
  applyViewMode(saved === 'agenda' ? 'agenda' : 'matrix');
  document.getElementById('btn-view-mode')?.addEventListener('click', toggleViewMode);
}

function renderAgendaSummary(y, m, md) {
  const el = document.getElementById('agenda-summary');
  if (!el) return;
  const dutyCapable = md.employees.length;
  const dim = daysInMonth(y, m);
  let coveredD = 0, coveredHG = 0;
  for (let d = 1; d <= dim; d++) {
    if (md.employees.some((e) => md.assignments?.[e]?.[d]?.duty === 'D')) coveredD++;
    if (md.employees.some((e) => md.assignments?.[e]?.[d]?.duty === 'HG')) coveredHG++;
  }
  el.innerHTML = `
    <span class="agd-summary-item"><span class="agd-summary-num">${dutyCapable}</span> Mitarbeitende</span>
    <span class="agd-summary-item"><span class="agd-summary-num">${coveredD}</span>/${dim} Tage mit Bereitschaftsdienst</span>
    <span class="agd-summary-item"><span class="agd-summary-num">${coveredHG}</span>/${dim} Tage mit Hintergrunddienst</span>
  `;
}

// Baut die Tagesliste analog zur mobilen Tagesübersicht (siehe
// render-grid.js renderMobileDayList), aber mit eigenem Klassen-Präfix
// (agd-*) statt body.is-mobile-abhängiger Klassen, damit diese Ansicht
// unabhängig von mobilen Layout-Anpassungen (Touch-Zielgrößen, mobile Navi
// etc.) auf dem Desktop funktioniert.
export function renderAgendaView() {
  const { year: y, month: m } = state;
  const listEl = document.getElementById('agenda-day-list');
  if (!listEl) return;

  const hols = getSaxonyHolidaysCached(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);

  renderAgendaSummary(y, m, md);

  listEl.innerHTML = '';
  let prevKW = -1;

  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const holName = hols[dateKey(y, m, d)] || '';
    const isToday = isTodayCol(y, m, d, TOD_Y, TOD_M, TOD_D);
    const kw = isoWeekNumber(y, m, d);

    if (wd === 1 && kw !== prevKW) {
      prevKW = kw;
      const sep = document.createElement('div');
      sep.className = 'agd-week-sep';
      sep.textContent = `KW ${kw}`;
      listEl.appendChild(sep);
    }

    const bdHolder = md.employees.find((e) => md.assignments?.[e]?.[d]?.duty === 'D') || null;
    const hgHolder = md.employees.find((e) => md.assignments?.[e]?.[d]?.duty === 'HG') || null;
    const allAssigns = [];
    md.employees.forEach((emp) => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) {
        cell.assignment.split('/').map((x) => x.trim()).filter(Boolean).forEach((code) => {
          if (!allAssigns.find((a) => a.code === code)) {
            const meta = CODE_MAP[code];
            if (meta) allAssigns.push({ code, bg: meta.bg, fg: meta.fg });
          }
        });
      }
    });

    const card = document.createElement('div');
    let cardCls = 'agd-day-card';
    if (hol) cardCls += ' agd-hol';
    else if (wd === 0 || wd === 6) cardCls += ' agd-we';
    if (isToday) cardCls += ' agd-today';

    card.className = cardCls;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute(
      'aria-label',
      `${d}. ${MONTHS[m]}${hol ? ', ' + holName : ''}: ${bdHolder ? 'Bereitschaftsdienst ' + bdHolder : 'kein Bereitschaftsdienst'}${hgHolder ? ', Hintergrunddienst ' + hgHolder : ''}`
    );

    let dutyHtml = '';
    if (bdHolder) dutyHtml += `<span class="agd-duty-badge agd-d"><span class="agd-duty-letter">D</span><span class="agd-duty-name">${esc(bdHolder)}</span></span>`;
    if (hgHolder) dutyHtml += `<span class="agd-duty-badge agd-hg"><span class="agd-duty-letter">H</span><span class="agd-duty-name">${esc(hgHolder)}</span></span>`;
    if (!bdHolder && !hgHolder) dutyHtml = `<span class="agd-empty-duty">kein Dienst</span>`;

    let assignHtml = '';
    const shown = allAssigns.slice(0, 8);
    shown.forEach((a) => { assignHtml += `<span class="agd-assign-chip" style="background:${a.bg};color:${a.fg}">${a.code}</span>`; });
    if (allAssigns.length > 8) assignHtml += `<span class="agd-assign-more">+${allAssigns.length - 8}</span>`;

    card.innerHTML = `
      <div class="agd-date">
        <span class="agd-day-num">${d}</span>
        <span class="agd-day-dow">${DOW_ABBR[wd]}</span>
        ${d === 1 || wd === 1 ? `<span class="agd-day-kw">KW${kw}</span>` : ''}
      </div>
      <div class="agd-divider"></div>
      <div class="agd-content">
        ${hol ? `<div class="agd-hol-label">${holName}</div>` : ''}
        <div class="agd-duties">${dutyHtml}</div>
        ${allAssigns.length ? `<div class="agd-assigns">${assignHtml}</div>` : ''}
      </div>
      <div class="agd-arrow">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    `;

    card.addEventListener('click', () => import('./app.js').then((mod) => mod.openMobileDay(d)));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        import('./app.js').then((mod) => mod.openMobileDay(d));
      }
    });

    listEl.appendChild(card);
  }
}
