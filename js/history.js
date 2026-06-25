/**
 * RadPlan — Undo/Redo für den Normalmodus.
 *
 * Im Planungsmodus existiert bereits eine eigene Snapshot-Historie (siehe
 * recordPlanHistory/undoPlan/redoPlan in app.js). Dieses Modul ergänzt eine
 * generische, entkoppelte Historie für den Normalmodus, die JEDE Mutation der
 * Hauptdaten erfasst: Zellenänderungen, RBN-Zeile, Notizen, Import, Löschungen
 * und das Entfernen von Mitarbeitenden.
 */

import { DATA, saveToStorage, planMode, store } from "./state.js";
import { monthKey } from "./constants.js";
import { render } from "./render-grid.js";
import { showToast } from "./render-modals.js";

const MAX_HISTORY = 80;

let baseline = null; // deep-cloned plain object of the last committed state
let undoStack = []; // older arrays of delta objects (each containing a transaction's change deltas)
let redoStack = [];
let suppress = false; // prevents Re-Capture during Undo/Redo/Reset
let captureTimer = null;

// Änderungsprotokoll für Tooltips: key `${mk}|${emp}|${day}` -> { ts, from, to }
const changeLog = new Map();

function cellSummary(cell) {
  if (!cell || typeof cell !== "object") return "";
  const a = cell.assignment || "";
  const d = cell.duty ? ` [${cell.duty}]` : "";
  return `${a}${d}`.trim();
}

// Diff two DATA objects and return a list of delta actions.
function diffData(oldData, newData) {
  const deltas = [];
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  const emptyMonth = { employees: [], assignments: {}, rbn: {}, comments: {} };

  for (const mk of keys) {
    const oldMonth = oldData?.[mk] || emptyMonth;
    const newMonth = newData?.[mk] || emptyMonth;

    // 1. Compare employees
    const oldEmps = oldMonth.employees || [];
    const newEmps = newMonth.employees || [];
    if (oldEmps.length !== newEmps.length || oldEmps.some((e, i) => e !== newEmps[i])) {
      deltas.push({ type: "employees", mk, from: [...oldEmps], to: [...newEmps] });
    }

    // 2. Compare RBN
    const oldRbn = oldMonth.rbn || {};
    const newRbn = newMonth.rbn || {};
    const rbnDays = new Set([...Object.keys(oldRbn), ...Object.keys(newRbn)]);
    for (const day of rbnDays) {
      const fromVal = oldRbn[day] || "";
      const toVal = newRbn[day] || "";
      if (fromVal !== toVal) {
        deltas.push({ type: "rbn", mk, day: parseInt(day, 10), from: fromVal, to: toVal });
      }
    }

    // 3. Compare comments
    const oldComments = oldMonth.comments || {};
    const newComments = newMonth.comments || {};
    const commentEmps = new Set([...Object.keys(oldComments), ...Object.keys(newComments)]);
    for (const emp of commentEmps) {
      const oldEmpComments = oldComments[emp] || {};
      const newEmpComments = newComments[emp] || {};
      const commentDays = new Set([...Object.keys(oldEmpComments), ...Object.keys(newEmpComments)]);
      for (const day of commentDays) {
        const fromVal = oldEmpComments[day] || "";
        const toVal = newEmpComments[day] || "";
        if (fromVal !== toVal) {
          deltas.push({ type: "comment", mk, emp, day: parseInt(day, 10), from: fromVal, to: toVal });
        }
      }
    }

    // 4. Compare assignments (cells)
    const oldAssigns = oldMonth.assignments || {};
    const newAssigns = newMonth.assignments || {};
    const assignEmps = new Set([...Object.keys(oldAssigns), ...Object.keys(newAssigns)]);
    for (const emp of assignEmps) {
      const oldEmpAssigns = oldAssigns[emp] || {};
      const newEmpAssigns = newAssigns[emp] || {};
      const assignDays = new Set([...Object.keys(oldEmpAssigns), ...Object.keys(newEmpAssigns)]);
      for (const day of assignDays) {
        const oldCell = oldEmpAssigns[day];
        const newCell = newEmpAssigns[day];
        const fromVal = oldCell ? { assignment: oldCell.assignment || "", duty: oldCell.duty || "" } : null;
        const toVal = newCell ? { assignment: newCell.assignment || "", duty: newCell.duty || "" } : null;

        const beforeStr = fromVal ? `${fromVal.assignment}|${fromVal.duty}` : "|";
        const afterStr = toVal ? `${toVal.assignment}|${toVal.duty}` : "|";

        if (beforeStr !== afterStr) {
          deltas.push({
            type: "cell",
            mk,
            emp,
            day: parseInt(day, 10),
            from: fromVal,
            to: toVal
          });
        }
      }
    }
  }

  return deltas;
}

// Apply transition of deltas to state store.
function applyDeltas(deltas, inverse) {
  const list = inverse ? [...deltas].reverse() : deltas;

  list.forEach((delta) => {
    const { type, mk } = delta;

    if (!DATA[mk]) {
      DATA[mk] = { employees: [], assignments: {}, rbn: {}, comments: {} };
    }

    if (type === "cell") {
      const { emp, day, from, to } = delta;
      const val = inverse ? from : to;
      if (!DATA[mk].assignments[emp]) {
        DATA[mk].assignments[emp] = {};
      }
      if (!val || (!val.assignment && !val.duty)) {
        delete DATA[mk].assignments[emp][day];
      } else {
        DATA[mk].assignments[emp][day] = {
          assignment: val.assignment || "",
          duty: val.duty || ""
        };
      }
    } else if (type === "rbn") {
      const { day, from, to } = delta;
      const val = inverse ? from : to;
      if (!DATA[mk].rbn) {
        DATA[mk].rbn = {};
      }
      if (!val) {
        delete DATA[mk].rbn[day];
      } else {
        DATA[mk].rbn[day] = val;
      }
    } else if (type === "comment") {
      const { emp, day, from, to } = delta;
      const val = inverse ? from : to;
      if (!DATA[mk].comments) {
        DATA[mk].comments = {};
      }
      if (!DATA[mk].comments[emp]) {
        DATA[mk].comments[emp] = {};
      }
      if (!val) {
        delete DATA[mk].comments[emp][day];
        if (!Object.keys(DATA[mk].comments[emp]).length) {
          delete DATA[mk].comments[emp];
        }
      } else {
        DATA[mk].comments[emp][day] = val;
      }
    } else if (type === "employees") {
      const { from, to } = delta;
      const val = inverse ? from : to;
      DATA[mk].employees = [...val];
    }
  });
}

function scheduleCapture() {
  if (suppress || planMode) return;
  if (captureTimer) clearTimeout(captureTimer);
  captureTimer = setTimeout(capture, 260);
}

function capture() {
  captureTimer = null;
  if (suppress || planMode) return;
  const cur = store.DATA;

  const deltas = diffData(baseline, cur);
  if (deltas.length === 0) return;

  const ts = Date.now();
  deltas.forEach((delta) => {
    if (delta.type === "cell") {
      const { mk, emp, day, from, to } = delta;
      const before = cellSummary(from);
      const after = cellSummary(to);
      changeLog.set(`${mk}|${emp}|${day}`, { ts, from: before, to: after });
    }
  });

  undoStack.push(deltas);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();

  redoStack = [];
  baseline = structuredClone(cur);
  updateNormalHistoryUI();
}

export function normalUndo() {
  if (planMode) return false;
  if (captureTimer) {
    clearTimeout(captureTimer);
    capture();
  }
  if (!undoStack.length) {
    showToast("Nichts zum Rückgängigmachen");
    return false;
  }
  const deltas = undoStack.pop();
  suppress = true;
  try {
    applyDeltas(deltas, true);
    saveToStorage();
    baseline = structuredClone(store.DATA);
    render();
  } finally {
    suppress = false;
  }
  redoStack.push(deltas);
  updateNormalHistoryUI();
  showToast("Rückgängig gemacht");
  return true;
}

export function normalRedo() {
  if (planMode) return false;
  if (!redoStack.length) {
    showToast("Nichts zum Wiederherstellen");
    return false;
  }
  const deltas = redoStack.pop();
  suppress = true;
  try {
    applyDeltas(deltas, false);
    saveToStorage();
    baseline = structuredClone(store.DATA);
    render();
  } finally {
    suppress = false;
  }
  undoStack.push(deltas);
  updateNormalHistoryUI();
  showToast("Wiederhergestellt");
  return true;
}

export function canNormalUndo() {
  return !planMode && (undoStack.length > 0 || captureTimer !== null);
}

export function canNormalRedo() {
  return !planMode && redoStack.length > 0;
}

export function updateNormalHistoryUI() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");
  const mUndo = document.getElementById("mbtn-undo");
  const mRedo = document.getElementById("mbtn-redo");

  const hide = planMode;
  [undoBtn, redoBtn].forEach((b) => {
    if (b) b.style.display = hide ? "none" : "";
  });

  const cu = undoStack.length > 0;
  const cr = redoStack.length > 0;
  if (undoBtn) undoBtn.disabled = !cu;
  if (redoBtn) redoBtn.disabled = !cr;
  if (mUndo) mUndo.disabled = !cu;
  if (mRedo) mRedo.disabled = !cr;
}

export function getLastChange(year, month, emp, day) {
  return changeLog.get(`${monthKey(year, month)}|${emp}|${day}`) || null;
}

export function resetNormalHistory() {
  if (captureTimer) {
    clearTimeout(captureTimer);
    captureTimer = null;
  }
  undoStack = [];
  redoStack = [];
  baseline = structuredClone(store.DATA);
  updateNormalHistoryUI();
}

export function initNormalHistory() {
  baseline = structuredClone(store.DATA);
  window.addEventListener("radplan-save-queued", scheduleCapture);
  window.addEventListener("radplan-sync-update", resetNormalHistory);
  updateNormalHistoryUI();
}
