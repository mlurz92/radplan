// ===========================================================================
//  RadPlan — Konflikt-Detailansicht für den 3-Way-Merge (Vorschlag 17)
// ---------------------------------------------------------------------------
//  Der automatische Merge in state.js (mergeThreeWay) behält bei einem
//  echten Feld-Konflikt (beide Seiten haben denselben Pfad seit dem letzten
//  bekannten Server-Stand unterschiedlich geändert) defensiv den lokalen
//  Wert, damit kein Speichervorgang je fehlschlägt. Dieses Modul zeigt die
//  Liste dieser Konflikte transparent an und erlaubt es, pro Feld
//  nachträglich stattdessen den Server-Wert zu übernehmen — bislang war ein
//  solcher Konflikt nur als Zahl im Toast sichtbar, ohne Möglichkeit, die
//  überschriebene Änderung der Gegenseite überhaupt einzusehen.
// ===========================================================================

import { getLastConflictDetails, applyConflictChoice } from './state.js';
import { showOverlay } from './render-modals.js';
import { MONTHS } from './constants.js';
import { esc } from './utils.js';

const FIELD_LABELS = {
  duty: 'Dienst', assignment: 'Arbeitsplatz', wish: 'Wunsch', wishNote: 'Wunsch-Notiz', comment: 'Kommentar',
};

function describeConflictPath(path) {
  const [monthK, section, ...rest] = path;
  const parts = String(monthK ?? '').split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const monthLabel = Number.isFinite(y) && Number.isFinite(m) && MONTHS[m] ? `${MONTHS[m]} ${y}` : String(monthK ?? '');

  if (section === 'assignments') {
    const [emp, day, field] = rest;
    const fieldLabel = field ? (FIELD_LABELS[field] || field) : null;
    return `${monthLabel} · ${emp ?? '?'} · Tag ${day ?? '?'}${fieldLabel ? ' · ' + fieldLabel : ''}`;
  }
  if (section === 'rbn') return `${monthLabel} · Tag ${rest[0] ?? '?'} · Randbemerkung`;
  if (section === 'comments') return `${monthLabel} · Tag ${rest[0] ?? '?'} · Kommentar`;
  if (section === 'employees') return `${monthLabel} · Mitarbeitendenliste`;
  return [monthLabel, section, ...rest].filter((p) => p != null).join(' · ');
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function render() {
  const list = document.getElementById('conflict-modal-list');
  const countEl = document.getElementById('conflict-modal-count');
  if (!list) return;

  const details = getLastConflictDetails();
  if (countEl) countEl.textContent = String(details.length);

  if (!details.length) {
    list.innerHTML = '<div class="cflct-empty">Keine offenen Konflikte mehr — alle Felder wurden entweder automatisch zusammengeführt oder manuell entschieden.</div>';
    return;
  }

  list.innerHTML = details.map((c, i) => `
    <div class="cflct-item" data-idx="${i}">
      <div class="cflct-item-path">${esc(describeConflictPath(c.path))}</div>
      <div class="cflct-item-values">
        <div class="cflct-value cflct-value-local">
          <span class="cflct-value-lbl">Ihr Stand (aktuell übernommen)</span>
          <span class="cflct-value-txt">${esc(formatValue(c.local))}</span>
        </div>
        <div class="cflct-value cflct-value-server">
          <span class="cflct-value-lbl">Server-Stand (verworfen)</span>
          <span class="cflct-value-txt">${esc(formatValue(c.server))}</span>
        </div>
      </div>
      <div class="cflct-item-actions">
        <button type="button" class="mbtn mbtn-ghost cflct-btn-server" data-idx="${i}" data-tooltip="Verwirft Ihre Änderung an dieser Stelle und übernimmt stattdessen den Server-Stand.">Server-Stand übernehmen</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.cflct-btn-server').forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const detail = getLastConflictDetails()[idx];
      if (!detail) return;
      applyConflictChoice(detail.path, 'server');
      render();
    });
  });
}

export function openConflictModal() {
  render();
  showOverlay('modal-conflict');
}

export function initConflictModal() {
  window.addEventListener('radplan-conflict-detail-resolved', render);
}
