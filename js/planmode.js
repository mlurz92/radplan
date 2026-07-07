// RadPlan — Planungsmodus-Lebenszyklus: betreten/verlassen, Speichern/
// Verwerfen von Entwürfen, Übernahme in den Hauptplan, Undo/Redo der
// Entwurfs-Historie sowie Dienstwünsche und Zellen-Fixierungen (Pins).
// Extrahiert aus dem früher monolithischen app.js.

import { monthKey } from './constants.js';
import {
  state, DATA, planMode, planData, planBaseline, planHistory, planHistoryIdx,
  saveToStorage, setPlanMode, setPlanData, setPlanBaseline, setPlanHistory,
  setPlanHistoryIdx,
} from './state.js';
import { cloneData, persistPlanSessionRefs, hasAnyPlanChanges, loadPlanSessionForState } from './model.js';
import { render, updateGridCell } from './render-grid.js';
import { showToast } from './render-modals.js';
import { updateNormalHistoryUI } from './history.js';
import { resetAutoPlanTargets } from './autoplan-ui.js';

export function recordPlanHistory() {
  if (!planMode || !planData) {
    return;
  }
  
  const newHistory = planHistory.slice(0, planHistoryIdx + 1);
  newHistory.push({
    assignments: cloneData(planData.assignments),
    rbn: cloneData(planData.rbn || {}),
  });
  
  setPlanHistory(newHistory);
  setPlanHistoryIdx(newHistory.length - 1);
  persistPlanSessionRefs();
  updatePlanBarUI();
}

export function updatePlanBarUI() {
  const undoBtn = /** @type {HTMLButtonElement} */ (document.getElementById("btn-plan-undo"));
  const redoBtn = /** @type {HTMLButtonElement} */ (document.getElementById("btn-plan-redo"));
  
  if (!undoBtn || !redoBtn) {
    return;
  }
  
  const canUndo = planHistoryIdx > 0;
  const canRedo = planHistoryIdx < planHistory.length - 1;
  
  undoBtn.disabled = !canUndo;
  redoBtn.disabled = !canRedo;
  undoBtn.title = canUndo ? `Rückgängig (Strg+Z)` : "";
  redoBtn.title = canRedo ? `Vorwärts (Strg+Y)` : "";
}

export function enterPlanMode() {
  const { year: y, month: m } = state;
  setPlanMode(true);
  loadPlanSessionForState(y, m);
  resetAutoPlanTargets();
  render();
  updateNormalHistoryUI();
  showToast("Planungsmodus aktiv");
}

export function exitPlanMode() {
  persistPlanSessionRefs();
  setPlanMode(false);
  setPlanData(null);
  setPlanBaseline(null);
  setPlanHistory([]);
  setPlanHistoryIdx(-1);
  render();
  updateNormalHistoryUI();
}

export function getWish(emp, day) {
  if (!planMode || !planData?.wishes) {
    return null;
  }
  return planData.wishes[emp]?.[day] || null;
}

export function setWish(emp, day, wishCode) {
  if (!planMode || !planData) {
    return;
  }
  if (!planData.wishes[emp]) {
    planData.wishes[emp] = {};
  }
  if (wishCode) {
    planData.wishes[emp][day] = wishCode;
  } else {
    delete planData.wishes[emp][day];
  }
}

export function toggleWish(emp, day, wishCode) {
  const current = getWish(emp, day);
  if (current === wishCode) {
    setWish(emp, day, null);
  } else {
    setWish(emp, day, wishCode);
  }
}

export function isPinned(emp, day) {
  if (!planMode || !planData?.pins) {
    return false;
  }
  return !!planData.pins[emp]?.[day];
}

export function setPinned(emp, day, val) {
  if (!planMode || !planData) {
    return;
  }
  if (!planData.pins) {
    planData.pins = {};
  }
  if (val) {
    if (!planData.pins[emp]) {
      planData.pins[emp] = {};
    }
    planData.pins[emp][day] = true;
  } else if (planData.pins[emp]) {
    delete planData.pins[emp][day];
  }
}

export function togglePinned(emp, day) {
  setPinned(emp, day, !isPinned(emp, day));
  updateGridCell(emp, day);
  showToast(isPinned(emp, day) ? `Zelle fixiert: ${emp}, Tag ${day}` : `Fixierung aufgehoben: ${emp}, Tag ${day}`);
}

export function closePlanMode() {
  persistPlanSessionRefs();
  if (hasAnyPlanChanges()) {
    if (!confirm("Planungsmodus schließen?\nEs gibt ungespeicherte Änderungen in mindestens einem Monatsentwurf.")) {
      return;
    }
  }
  exitPlanMode();
}

export function abortPlanChanges() {
  if (!planMode || !planBaseline) {
    return;
  }
  
  const draftState = JSON.stringify({
    assignments: planData.assignments,
    rbn: planData.rbn || {},
  });
  
  if (draftState === JSON.stringify(planBaseline)) {
    showToast("Keine Änderungen");
    return;
  }
  
  planData.assignments = cloneData(planBaseline.assignments || {});
  planData.rbn = cloneData(planBaseline.rbn || {});
  
  setPlanHistory([{ 
    assignments: cloneData(planData.assignments), 
    rbn: cloneData(planData.rbn || {}) 
  }]);
  
  setPlanHistoryIdx(0);
  persistPlanSessionRefs();
  render();
  showToast("Zurückgesetzt");
}

export function savePlanDraft() {
  if (!planMode || !planData) {
    return;
  }
  
  const key = `radplan_v3_plan_${monthKey(state.year, state.month)}`;
  
  try {
    persistPlanSessionRefs();
    localStorage.setItem(
      key,
      JSON.stringify({
        employees: planData.employees,
        assignments: planData.assignments,
        rbn: planData.rbn || {},
        wishes: planData.wishes || {},
        pins: planData.pins || {},
      })
    );
    
    setPlanBaseline({
      assignments: cloneData(planData.assignments),
      rbn: cloneData(planData.rbn || {}),
    });
    
    persistPlanSessionRefs();
    updatePlanBarUI();
    saveToStorage();
    showToast("Entwurf gespeichert");
  } catch {
    showToast("Fehler beim Speichern");
  }
}

export function applyPlanToMain() {
  if (!planMode || !planData) {
    return;
  }
  
  const k = monthKey(state.year, state.month);
  
  if (!DATA[k]) {
    DATA[k] = { employees: [...planData.employees], assignments: {}, rbn: {} };
  }
  
  DATA[k].employees = [...planData.employees];
  DATA[k].assignments = cloneData(planData.assignments);
  DATA[k].rbn = cloneData(planData.rbn || {});
  
  saveToStorage();
  exitPlanMode();
  showToast("Planung übernommen");
}

export function undoPlan() {
  if (!planMode || planHistoryIdx <= 0 || state.isAutoplanRunning) {
    return;
  }
  
  setPlanHistoryIdx(planHistoryIdx - 1);
  const snap = planHistory[planHistoryIdx] || { assignments: {}, rbn: {} };
  
  planData.assignments = cloneData(snap.assignments || {});
  planData.rbn = cloneData(snap.rbn || {});
  
  persistPlanSessionRefs();
  updatePlanBarUI();
  render();
}

export function redoPlan() {
  if (!planMode || planHistoryIdx >= planHistory.length - 1 || state.isAutoplanRunning) {
    return;
  }
  
  setPlanHistoryIdx(planHistoryIdx + 1);
  const snap = planHistory[planHistoryIdx] || { assignments: {}, rbn: {} };
  
  planData.assignments = cloneData(snap.assignments || {});
  planData.rbn = cloneData(snap.rbn || {});
  
  persistPlanSessionRefs();
  updatePlanBarUI();
  render();
}
