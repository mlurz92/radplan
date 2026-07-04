// RadPlan — Schnellaktionen für einzelne (oder mehrfach ausgewählte) Zellen:
// Arbeitsplatz-/Dienst-/Status-Toggle, Dienst-Badge per Drag&Drop verschieben,
// Zelle leeren. Extrahiert aus dem früher monolithischen app.js.

import { WORKPLACES, STATUSES, nextCalendarDay } from './constants.js';
import { state, planMode, IS_MOBILE } from './state.js';
import { getCell, setCell, clearCell, dutyOwner, canMoveDutyBadge } from './model.js';
import {
  render, focusCellAfterRender, updateGridCell, updateAllConflicts,
  updateGridStatsAndHeader, closeCellQuickPopover, syncSelectionClasses,
} from './render-grid.js';
import { showToast } from './render-modals.js';
import { recordPlanHistory } from './planmode.js';
import { announceToScreenReader } from './app.js';

export function clearMultiSelection() {
  state.multiEdit = { emp: null, days: [], anchor: null };
  closeCellQuickPopover();
  syncSelectionClasses();
  showToast("Auswahl aufgehoben");
}

export function quickTargetDays(emp, day) {
  const me = state.multiEdit;
  if (me?.emp === emp && Array.isArray(me.days) && me.days.length > 1 && me.days.includes(day)) {
    return [...me.days].sort((a, b) => a - b);
  }
  return [day];
}

function suffixForSkips(skipped) {
  return skipped ? ` · ${skipped} übersprungen` : "";
}

function refreshAfterQuickAction(emp, day, affectedCells) {
  if (IS_MOBILE) {
    render();
    focusCellAfterRender(emp, day);
  } else {
    affectedCells.forEach(c => updateGridCell(c.emp, c.day));
    updateAllConflicts();
    updateGridStatsAndHeader(affectedCells.map(c => c.day));
  }
}

export function quickToggleWorkplace(emp, day, wpCode) {
  const { year: y, month: m } = state;
  const days = quickTargetDays(emp, day);
  const multi = days.length > 1;
  const wp = WORKPLACES.find(w => w.code === wpCode);

  const anchorParts = (getCell(y, m, emp, day).assignment || "").split("/").map(x => x.trim()).filter(Boolean);
  const anchorHasStatus = anchorParts.some(p => STATUSES.find(s => s.code === p));
  if (!multi && anchorHasStatus) {
    showToast("Status aktiv — Editor öffnen zum Bearbeiten");
    return;
  }
  const remove = anchorParts.includes(wpCode);

  if (planMode) recordPlanHistory();
  let skipped = 0;
  const affectedCells = [];
  days.forEach(d => {
    const cell = getCell(y, m, emp, d);
    const parts = (cell.assignment || "").split("/").map(x => x.trim()).filter(Boolean);
    if (parts.some(p => STATUSES.find(s => s.code === p))) { skipped++; return; }
    const wps = parts.filter(p => WORKPLACES.find(w => w.code === p));
    const next = remove
      ? wps.filter(w => w !== wpCode)
      : (wps.includes(wpCode) ? wps : [...wps, wpCode]);
    setCell(y, m, emp, d, { assignment: next.length ? next.join("/") : null, duty: cell.duty || null });
    affectedCells.push({ emp, day: d });
  });
  if (planMode) recordPlanHistory();

  const label = wp?.label || wpCode;
  const verb = remove ? "entfernt" : "gesetzt";
  const changed = affectedCells.length;
  const msg = multi
    ? `${label} ${verb} · ${changed} ${changed === 1 ? "Tag" : "Tage"}${suffixForSkips(skipped)}`
    : `${label} ${verb}`;
  showToast(msg);
  announceToScreenReader(msg);

  refreshAfterQuickAction(emp, day, affectedCells);
}

export function quickToggleDuty(emp, day, dutyCode) {
  const { year: y, month: m } = state;
  const days = quickTargetDays(emp, day);
  const multi = days.length > 1;

  const remove = getCell(y, m, emp, day).duty === dutyCode;

  if (!multi) {
    const owner = dutyOwner(y, m, day, dutyCode);
    if (!remove && owner && owner !== emp) {
      showToast(`${dutyCode} bereits vergeben an: ${owner}`);
      return;
    }
  }

  if (planMode) recordPlanHistory();
  let changed = 0;
  let skipped = 0;
  let autoFreeDay = false;
  const affectedCells = [];
  days.forEach(d => {
    const cell = getCell(y, m, emp, d);
    if (!remove) {
      const owner = dutyOwner(y, m, d, dutyCode);
      if (owner && owner !== emp) { skipped++; return; }
    }
    const newDuty = remove ? null : dutyCode;
    setCell(y, m, emp, d, { assignment: cell.assignment || null, duty: newDuty });
    changed++;
    affectedCells.push({ emp, day: d });

    if (newDuty === "D") {
      const next = nextCalendarDay(y, m, d);
      const ex = getCell(next.y, next.m, emp, next.d);
      if (!ex.assignment) {
        setCell(next.y, next.m, emp, next.d, { assignment: "F", duty: ex.duty || null });
        autoFreeDay = true;
        if (next.y === y && next.m === m) {
          affectedCells.push({ emp, day: next.d });
        }
      }
    }
  });
  if (planMode) recordPlanHistory();

  const name = dutyCode === "HG" ? "Hintergrunddienst" : "Bereitschaftsdienst";
  let msg = "";
  if (multi) {
    msg = `${dutyCode} ${remove ? "entfernt" : "gesetzt"} · ${changed} ${changed === 1 ? "Tag" : "Tage"}${suffixForSkips(skipped)}`;
  } else if (remove) {
    msg = `${dutyCode === "HG" ? "HG" : "BD"} entfernt`;
  } else {
    msg = autoFreeDay ? `${name} gesetzt · F automatisch für Folgetag` : `${name} gesetzt`;
  }
  showToast(msg);
  announceToScreenReader(msg);

  refreshAfterQuickAction(emp, day, affectedCells);
}

export function moveDutyBadge(srcEmp, srcDay, dstEmp, dstDay) {
  const { year: y, month: m } = state;
  if (srcEmp === dstEmp && srcDay === dstDay) return;

  const srcCell = getCell(y, m, srcEmp, srcDay);
  const dutyCode = srcCell.duty;
  if (!dutyCode) return;

  const dstCell = getCell(y, m, dstEmp, dstDay);
  const check = canMoveDutyBadge(y, m, srcEmp, srcDay, dstEmp, dstDay, dutyCode);
  if (!check.ok) {
    const toastByReason = {
      "occupied-different": `Zielzelle hat bereits ${dstCell.duty}-Dienst`,
      "occupied-same": `Zielzelle hat bereits ${dutyCode}-Dienst`,
      "owner-conflict": `${dutyCode} bereits vergeben an: ${check.owner}`,
    };
    showToast(toastByReason[check.reason] || "Verschieben nicht möglich");
    return;
  }

  if (planMode) recordPlanHistory();
  setCell(y, m, srcEmp, srcDay, { assignment: srcCell.assignment || null, duty: dstCell.duty || null });
  setCell(y, m, dstEmp, dstDay, { assignment: dstCell.assignment || null, duty: dutyCode });
  if (planMode) recordPlanHistory();

  const msg = `${dutyCode}-Dienst verschoben: ${srcEmp} (${srcDay}.) → ${dstEmp} (${dstDay}.)`;
  showToast(msg);
  announceToScreenReader(msg);

  refreshAfterQuickAction(dstEmp, dstDay, [
    { emp: srcEmp, day: srcDay },
    { emp: dstEmp, day: dstDay },
  ]);
}

export function quickClearCell(emp, day) {
  const { year: y, month: m } = state;
  const days = quickTargetDays(emp, day);
  const multi = days.length > 1;

  if (planMode) recordPlanHistory();
  days.forEach(d => clearCell(y, m, emp, d));
  if (planMode) recordPlanHistory();

  const msg = multi ? `${days.length} Tage geleert` : "Eintrag gelöscht";
  showToast(msg);
  announceToScreenReader(msg);

  refreshAfterQuickAction(emp, day, days.map(d => ({ emp, day: d })));
}

export function quickSetStatus(emp, day, statusCode) {
  const { year: y, month: m } = state;
  const days = quickTargetDays(emp, day);
  const multi = days.length > 1;

  const remove = getCell(y, m, emp, day).assignment === statusCode;

  if (planMode) recordPlanHistory();
  days.forEach(d => {
    const cell = getCell(y, m, emp, d);
    setCell(y, m, emp, d, { assignment: remove ? null : statusCode, duty: cell.duty || null });
  });
  if (planMode) recordPlanHistory();

  const st = STATUSES.find(s => s.code === statusCode);
  const label = st?.label || statusCode;
  const verb = remove ? "entfernt" : "gesetzt";
  const msg = multi
    ? `${label} ${verb} · ${days.length} ${days.length === 1 ? "Tag" : "Tage"}`
    : `${label} ${verb}`;
  showToast(msg);
  announceToScreenReader(msg);

  refreshAfterQuickAction(emp, day, days.map(d => ({ emp, day: d })));
}

