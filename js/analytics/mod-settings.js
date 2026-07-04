// ===========================================================================
//  Auswertungs-Hub · Modul „Einstellungen" (Vorschlag 14)
// ---------------------------------------------------------------------------
//  Konfigurierbare Schwellenwerte für heuristische Analysen (Fairness-
//  Toleranzband, Burnout-Einstufung, saisonaler Risiko-Faktor). Harte
//  Compliance-Regeln (Ruhezeit, Häufungsabstand, Facharzt-Pflicht) sind
//  bewusst NICHT konfigurierbar, siehe js/analytics/thresholds.js.
// ===========================================================================

import { getThresholds, setThresholds, resetThresholds, THRESHOLD_LIMITS, TT } from './engine.js';

const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

const escAttr = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FIELDS = [
  {
    key: 'fairnessTolerancePct', label: 'Fairness-Toleranzband', unit: '%', scale: 100,
    tooltip: 'Prozentualer Abstand vom fairen Anteil, ab dem eine Person als „Über" bzw. „Unter" eingestuft wird (statt „Fair"). Kleinerer Wert = strengere Einstufung.',
  },
  {
    key: 'burnoutMidScore', label: 'Burnout-Schwelle „Mittel"', unit: 'Punkte', scale: 1,
    tooltip: TT.burnoutScore + ' Ab diesem Score-Wert gilt die Einstufung „mittel" statt „niedrig".',
  },
  {
    key: 'burnoutHighScore', label: 'Burnout-Schwelle „Hoch"', unit: 'Punkte', scale: 1,
    tooltip: TT.burnoutScore + ' Ab diesem Score-Wert gilt die Einstufung „hoch" statt „mittel".',
  },
  {
    key: 'seasonalRiskFactor', label: 'Saisonaler Risiko-Faktor', unit: '×', scale: 1,
    tooltip: 'Vielfaches des Jahresdurchschnitts der Krankheitsquote, ab dem ein Kalendermonat in der Prognose als „auffällig erhöht" markiert wird.',
  },
];

let rootEl = null;
let statusEl = null;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function fieldValueLabel(f, raw) {
  const v = raw * f.scale;
  const rounded = f.scale === 100 ? Math.round(v) : Math.round(v * 100) / 100;
  return `${rounded} ${f.unit}`;
}

function render() {
  if (!rootEl) return;
  const th = getThresholds();
  rootEl.innerHTML = `
    <div class="ah-section-title" data-tooltip="Konfigurierbare Schwellenwerte für heuristische Analysen. Harte Compliance-Regeln (Ruhezeit, Häufungsabstand, Facharzt-Pflicht) sind fest hinterlegt und hier nicht veränderbar.">Einstellungen <span class="ah-sub">— Analyse-Schwellenwerte</span></div>
    <div class="set-card ah-card">
      ${FIELDS.map((f) => {
        const lim = THRESHOLD_LIMITS[f.key];
        return `
        <div class="set-row" data-tooltip="${escAttr(f.tooltip)}">
          <div class="set-row-hd">
            <span class="set-row-label">${f.label}</span>
            <span class="set-row-value" id="set-val-${f.key}">${fieldValueLabel(f, th[f.key])}</span>
          </div>
          <input type="range" class="set-slider" id="set-slider-${f.key}" min="${lim.min}" max="${lim.max}" step="${lim.step}" value="${th[f.key]}" aria-label="${f.label}">
        </div>`;
      }).join('')}
      <div class="set-actions">
        <button type="button" class="mbtn mbtn-ghost" id="set-reset" data-tooltip="Alle Schwellenwerte auf die Standardwerte zurücksetzen.">Auf Standard zurücksetzen</button>
      </div>
      <div class="set-status" id="set-status" role="status" aria-live="polite"></div>
    </div>
  `;

  statusEl = rootEl.querySelector('#set-status');

  FIELDS.forEach((f) => {
    const slider = /** @type {HTMLInputElement} */ (rootEl.querySelector(`#set-slider-${f.key}`));
    const valEl = rootEl.querySelector(`#set-val-${f.key}`);
    slider?.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      if (valEl) valEl.textContent = fieldValueLabel(f, v);
    });
    slider?.addEventListener('change', () => {
      setThresholds({ [f.key]: parseFloat(slider.value) });
      setStatus('Gespeichert. Änderungen gelten für neu berechnete Ansichten.');
      render();
    });
  });

  rootEl.querySelector('#set-reset')?.addEventListener('click', () => {
    resetThresholds();
    setStatus('Auf Standardwerte zurückgesetzt.');
    render();
  });
}

export default {
  id: 'settings',
  label: 'Einstellungen',
  usesRange: false,
  icon: ICON,

  render(root) {
    rootEl = root;
    render();
  },

  dispose() {
    rootEl = null;
    statusEl = null;
  },
};
