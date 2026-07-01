/**
 * RadPlan — Detail-Tooltip beim Überfahren einer Rasterzelle.
 *
 * Zeigt nach kurzer Verzögerung beim Hovern über eine Zelle (Desktop/Maus):
 *   - Person + Position + aktuelle Belegung des Tages
 *   - Vorschau der jüngsten Diensthistorie (letzte D-/HG-Dienste der Person)
 *   - Erklärung etwaiger Regelkonflikte (aus data-conflict)
 *   - Zeitpunkt & Inhalt der letzten erfassten Änderung dieser Zelle
 *
 * Bewusst rein informativ und nicht-interaktiv — die interaktive Schnellaktion
 * (showCellQuickPopover) bleibt davon unberührt und wird nicht überlagert.
 */

import { DATA, state } from './state.js';
import { getEmpMeta, monthKey, prevMK, MONTHS, RBN_ROW_KEY } from './constants.js';
import { getCell, getComment } from './model.js';
import { getLastChange } from './history.js';
import { esc } from './utils.js';

let tipEl = null;
let hoverTimer = null;
let currentAnchor = null;

const SHOW_DELAY = 420;

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'cell-detail-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.hidden = true;
  document.body.appendChild(tipEl);
  return tipEl;
}

// Sammelt die letzten Dienste (D/HG) einer Person über den aktuellen und
// vorherigen Monat hinweg — chronologisch absteigend, maximal `limit`.
function recentDutyHistory(emp, y, m, limit = 4) {
  const out = [];
  const scan = (yy, mm) => {
    const md = DATA[monthKey(yy, mm)];
    const days = md?.assignments?.[emp];
    if (!days) return;
    Object.keys(days)
      .map((d) => parseInt(d, 10))
      .sort((a, b) => b - a)
      .forEach((d) => {
        const duty = days[d]?.duty;
        if (duty === 'D' || duty === 'HG') {
          out.push({ y: yy, m: mm, d, duty });
        }
      });
  };
  scan(y, m);
  if (out.length < limit) {
    const pk = prevMK(y, m);
    const [py, pm] = pk.split('-').map(Number);
    scan(py, pm);
  }
  return out.slice(0, limit);
}

function buildHtml(emp, day) {
  const { year: y, month: m } = state;
  const meta = getEmpMeta(emp);
  const cell = getCell(y, m, emp, day);
  const assignParts = [];
  if (cell.assignment) assignParts.push(esc(cell.assignment));
  if (cell.duty) assignParts.push(`<b>${cell.duty}</b>`);
  const assignTxt = assignParts.length ? assignParts.join(' · ') : '—';

  let html = `<div class="cdt-hd"><span class="cdt-name">${esc(emp)}</span>`;
  if (meta.position && meta.position !== '—') html += `<span class="cdt-pos">${esc(meta.position)}</span>`;
  html += `</div>`;
  html += `<div class="cdt-row"><span class="cdt-lbl">${day}. ${MONTHS[m]}</span><span class="cdt-val">${assignTxt}</span></div>`;

  // Diensthistorie
  const hist = recentDutyHistory(emp, y, m);
  if (hist.length) {
    const items = hist
      .map((h) => `<span class="cdt-hist-item cdt-duty-${h.duty}">${h.duty} ${h.d}.${MONTHS[h.m].slice(0, 3)}</span>`)
      .join('');
    html += `<div class="cdt-sect"><div class="cdt-sect-hd">Letzte Dienste</div><div class="cdt-hist">${items}</div></div>`;
  } else {
    html += `<div class="cdt-sect"><div class="cdt-sect-hd">Letzte Dienste</div><div class="cdt-muted">Keine Dienste erfasst</div></div>`;
  }

  // Konflikt
  const conflict = currentAnchor?.getAttribute('data-conflict');
  if (conflict) {
    html += `<div class="cdt-sect cdt-conflict"><div class="cdt-sect-hd">⚠ Regelkonflikt</div><div class="cdt-conflict-txt">${esc(conflict)}</div></div>`;
  }

  // Notiz
  const note = getComment(y, m, emp, day);
  if (note) {
    html += `<div class="cdt-sect"><div class="cdt-sect-hd">Notiz</div><div class="cdt-note">${esc(note)}</div></div>`;
  }

  // Letzte Änderung (nur Normalmodus protokolliert)
  const change = getLastChange(y, m, emp, day);
  if (change) {
    const when = new Date(change.ts).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const from = change.from || '∅';
    const to = change.to || '∅';
    html += `<div class="cdt-sect cdt-change"><div class="cdt-sect-hd">Letzte Änderung · ${when}</div><div class="cdt-change-txt">${esc(from)} → ${esc(to)}</div></div>`;
  }

  return html;
}

function position(anchor) {
  if (!tipEl) return;
  const r = anchor.getBoundingClientRect();
  tipEl.style.visibility = 'hidden';
  tipEl.hidden = false;
  const tw = tipEl.offsetWidth;
  const th = tipEl.offsetHeight;
  const margin = 8;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
  let top = r.bottom + 8;
  if (top + th > window.innerHeight - margin) {
    top = r.top - th - 8;
    if (top < margin) top = margin;
  }
  tipEl.style.left = `${left}px`;
  tipEl.style.top = `${top}px`;
  tipEl.style.visibility = '';
}

function showFor(anchor) {
  const emp = anchor.dataset.emp;
  const day = parseInt(anchor.dataset.day || '', 10);
  if (!emp || !Number.isFinite(day) || emp === RBN_ROW_KEY) return;
  currentAnchor = anchor;
  const tip = ensureTip();
  tip.innerHTML = buildHtml(emp, day);
  position(anchor);
  requestAnimationFrame(() => tip.classList.add('cdt-visible'));
}

export function hideCellTip() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  currentAnchor = null;
  if (tipEl) {
    tipEl.classList.remove('cdt-visible');
    tipEl.hidden = true;
  }
}

export function initCellTooltips() {
  const tbody = document.getElementById('plan-tbody');
  if (!tbody) return;

  tbody.addEventListener('mouseover', (e) => {
    const cell = e.target.closest?.('#plan-tbody .td-cell');
    if (!cell || cell === currentAnchor) return;
    // Touch-Geräte und geöffnete Schnellaktion nicht stören.
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    if (document.body.classList.contains('cell-popover-open')) return;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showFor(cell), SHOW_DELAY);
  });

  tbody.addEventListener('mouseout', (e) => {
    const to = e.relatedTarget;
    if (to && to.closest?.('.cell-detail-tip')) return;
    const cell = e.target.closest?.('#plan-tbody .td-cell');
    if (!cell) return;
    if (to && to.closest?.('#plan-tbody .td-cell') === cell) return;
    hideCellTip();
  });

  // Beim Scrollen/Wegklicken den Tooltip schließen.
  document.getElementById('grid-wrapper')?.addEventListener('scroll', hideCellTip, { passive: true });
  window.addEventListener('blur', hideCellTip);
}
