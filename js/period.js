// RadPlan — Perioden-Navigation: Monats-/Jahreswechsel, das Perioden-Flyout
// (Schnellsprung zu einem beliebigen Monat) und der "Heute"-Sprung.
// Extrahiert aus dem früher monolithischen app.js.

import { MONTHS } from './constants.js';
import { state, planMode, TOD_Y, TOD_M } from './state.js';
import { persistPlanSessionRefs, loadPlanSessionForState } from './model.js';
import { render, refreshOpenContextPanels, scrollToToday as doScrollToToday } from './render-grid.js';
import { withViewTransition } from './viewtransition.js';

export function isPeriodFlyoutOpen() {
  const el = document.getElementById("period-flyout");
  return !!el && !el.hasAttribute("hidden");
}

export function populatePeriodMonthSelect() {
  const sel = /** @type {HTMLSelectElement} */ (document.getElementById("period-month-select"));
  if (!sel || sel.options.length) {
    return;
  }

  MONTHS.forEach((label, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = label;
    sel.appendChild(opt);
  });
}

export function syncPeriodControls() {
  const monthSelect = /** @type {HTMLSelectElement} */ (document.getElementById("period-month-select"));
  const yearInput = /** @type {HTMLInputElement} */ (document.getElementById("period-year-input"));
  const context = document.getElementById("period-context");

  if (monthSelect) {
    monthSelect.value = String(state.periodDraft.month);
  }

  if (yearInput) {
    yearInput.value = String(state.periodDraft.year);
  }

  if (context) {
    if (planMode) {
      context.textContent = `Planungsmodus aktiv · aktive Sicht ${MONTHS[state.month]} ${state.year} · Auswahl ${MONTHS[state.periodDraft.month]} ${state.periodDraft.year}`;
    } else {
      context.textContent = `Aktive Ansicht ${MONTHS[state.month]} ${state.year} · Auswahl ${MONTHS[state.periodDraft.month]} ${state.periodDraft.year}`;
    }
  }

  const labelBtn = document.getElementById("month-label-btn");
  if (labelBtn) {
    labelBtn.setAttribute("aria-expanded", isPeriodFlyoutOpen() ? "true" : "false");
  }
}

export function openPeriodFlyout() {
  populatePeriodMonthSelect();
  state.periodDraft = { year: state.year, month: state.month };
  syncPeriodControls();

  const el = document.getElementById("period-flyout");
  if (!el) {
    return;
  }

  el.removeAttribute("hidden");
  el.setAttribute("aria-hidden", "false");
  document.body.classList.add("period-flyout-open");
  syncPeriodControls();
}

export function closePeriodFlyout() {
  const el = document.getElementById("period-flyout");
  if (!el) {
    return;
  }

  el.setAttribute("hidden", "");
  el.setAttribute("aria-hidden", "true");
  document.body.classList.remove("period-flyout-open");
  syncPeriodControls();
}

export function shiftMonth(delta) {
  const total = state.year * 12 + state.month + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  return { year: nextYear, month: nextMonth };
}

export function switchPeriod(targetYear, targetMonth, options = {}) {
  const { closeFlyout = true, direction = null } = options;

  if (closeFlyout) {
    closePeriodFlyout();
  }

  if (planMode) {
    persistPlanSessionRefs();
  }

  state.year = targetYear;
  state.month = targetMonth;
  state.periodDraft = { year: targetYear, month: targetMonth };

  if (planMode) {
    loadPlanSessionForState(targetYear, targetMonth);
  }

  syncPeriodControls();
  refreshOpenContextPanels();
  withViewTransition(() => render(), direction);
}

export function changeMonth(delta) {
  const next = shiftMonth(delta);
  switchPeriod(next.year, next.month, { direction: delta > 0 ? "forward" : "backward" });
}

export function changeYear(delta) {
  switchPeriod(state.year + delta, state.month, { direction: delta > 0 ? "forward" : "backward" });
}

export function applyPeriodDraft() {
  const year = Math.max(2000, Math.min(2100, parseInt(String(state.periodDraft.year), 10) || state.year));
  const month = Math.max(0, Math.min(11, parseInt(String(state.periodDraft.month), 10) || 0));
  switchPeriod(year, month);
}

export function handleTodayClick() {
  if (state.year !== TOD_Y || state.month !== TOD_M) {
    switchPeriod(TOD_Y, TOD_M, { closeFlyout: true });
    setTimeout(doScrollToToday, 100);
  } else {
    doScrollToToday();
  }
}
