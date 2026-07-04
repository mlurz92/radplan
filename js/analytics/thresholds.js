// ===========================================================================
//  RadPlan · Auswertungs-Hub – Konfigurierbare Schwellenwerte (Vorschlag 14)
// ---------------------------------------------------------------------------
//  Bewusst NUR für heuristische Analyse-Schwellen (Fairness-Toleranzband,
//  Burnout-Einstufung, saisonaler Risiko-Faktor) — nicht für harte
//  Compliance-Regeln (Ruhezeit, <3-Tage-Häufung, Facharzt-Pflicht), die aus
//  arbeitsrechtlichen/fachlichen Vorgaben stammen und nicht per Nutzer-Setting
//  verwässert werden dürfen. Persistiert in localStorage, damit die Wahl über
//  einen Reload hinweg erhalten bleibt.
// ===========================================================================

const STORAGE_KEY = 'radplan_thresholds_v1';

export const DEFAULT_THRESHOLDS = Object.freeze({
  fairnessTolerancePct: 0.18,
  burnoutHighScore: 70,
  burnoutMidScore: 40,
  seasonalRiskFactor: 1.15,
});

export const THRESHOLD_LIMITS = Object.freeze({
  fairnessTolerancePct: { min: 0.05, max: 0.5, step: 0.01 },
  burnoutMidScore: { min: 10, max: 60, step: 1 },
  burnoutHighScore: { min: 40, max: 95, step: 1 },
  seasonalRiskFactor: { min: 1.02, max: 2, step: 0.01 },
});

/** @type {{fairnessTolerancePct: number, burnoutHighScore: number, burnoutMidScore: number, seasonalRiskFactor: number}|null} */
let current = null;

function clamp(key, value) {
  const lim = THRESHOLD_LIMITS[key];
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_THRESHOLDS[key];
  return Math.min(lim.max, Math.max(lim.min, n));
}

function load() {
  if (current) return;
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    stored = {};
  }
  current = { ...DEFAULT_THRESHOLDS };
  Object.keys(DEFAULT_THRESHOLDS).forEach((key) => {
    if (stored[key] != null) current[key] = clamp(key, stored[key]);
  });
  // Burnout-Schwellen dürfen sich nicht überschneiden: hoch muss stets über mittel liegen.
  if (current.burnoutHighScore <= current.burnoutMidScore) {
    current.burnoutHighScore = Math.min(THRESHOLD_LIMITS.burnoutHighScore.max, current.burnoutMidScore + 10);
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // localStorage evtl. voll/deaktiviert — Einstellungen gelten dann nur für die laufende Sitzung.
  }
  window.dispatchEvent(new CustomEvent('radplan-thresholds-changed'));
}

export function getThresholds() {
  load();
  return current;
}

/** @param {Partial<typeof DEFAULT_THRESHOLDS>} partial */
export function setThresholds(partial) {
  load();
  Object.keys(partial).forEach((key) => {
    if (key in DEFAULT_THRESHOLDS) current[key] = clamp(key, partial[key]);
  });
  if (current.burnoutHighScore <= current.burnoutMidScore) {
    current.burnoutHighScore = Math.min(THRESHOLD_LIMITS.burnoutHighScore.max, current.burnoutMidScore + 10);
  }
  persist();
}

export function resetThresholds() {
  current = { ...DEFAULT_THRESHOLDS };
  persist();
}
