import { WORKPLACES, RBN_ROW_KEY, monthKey, isEmployeeActiveInMonth } from './constants.js';

import {
  state,
  DATA,
  planMode,
  TOD_Y,
  TOD_M,
  loadFromStorage,
  saveToStorage,
  setDeptTab,
  syncWithServer,
  forceSyncWithServer,
  serverLastModified,
  serverFetchSuccessful
} from './state.js';

import {
  ensurePostBDFreiDays,
  clearCell,
  dutyOwner,
  getEmployeesForYear,
  setRbnValue,
} from './model.js';

import {
  render,
  refreshResponsiveLayout,
  queueResponsiveRefresh,
  scrollToToday as doScrollToToday,
  initGridKeyboardHandlers,
  updateGridCell,
  updateAllConflicts,
  updateGridStatsAndHeader,
} from './render-grid.js';

import {
  showOverlay,
  hideOverlay,
  showToast,
  openProfileModal,
  showTeamScreen,
  showPersonScreen,
  applyPersonTab
} from './render-modals.js';

import { renderDeptContent } from './render-dept.js';
import { renderEmployeeDashboard, exportEmployeeDashboardCSV } from './render-employee-dashboard.js';

import { openAnalyticsHub } from './analytics/hub.js';
import { initCommandPalette, openCommandPalette } from './commandpalette.js';
import { initNormalHistory, normalUndo, normalRedo } from './history.js';
import { initCellTooltips } from './celltooltip.js';
import { initTooltips } from './tooltip.js';
import { openPrintPreview } from './printpreview.js';
import { injectBrandIcon } from './icons.js';
import { initNotificationCenter, checkComplianceAndNotify, checkGridConflictsAndNotify } from './notifications.js';
import { computeCompliance, getRange } from './analytics/engine.js';
import { computeGridConflicts } from './autoplan.js';
import { initConflictModal, openConflictModal } from './conflict-modal.js';
import { initViewMode } from './agenda-view.js';

export {
  getTheme, applyTheme, setTheme, toggleTheme, initTheme,
  getDensity, applyDensity, setDensity, toggleDensity, initDensity,
  isHeaderMenuOpen, closeHeaderMenu, openHeaderMenu, initHeaderOverflowMenu,
  isColorblind, applyColorblind, setColorblind, initColorblindToggle,
} from './theme.js';
import {
  initTheme, initDensity, initHeaderOverflowMenu, initColorblindToggle,
  toggleTheme, toggleDensity,
} from './theme.js';

export {
  isPeriodFlyoutOpen, populatePeriodMonthSelect, syncPeriodControls,
  openPeriodFlyout, closePeriodFlyout, shiftMonth, switchPeriod,
  changeMonth, applyPeriodDraft, handleTodayClick,
} from './period.js';
import {
  syncPeriodControls, switchPeriod, handleTodayClick, closePeriodFlyout,
  openPeriodFlyout, changeMonth, applyPeriodDraft,
  isPeriodFlyoutOpen, populatePeriodMonthSelect,
} from './period.js';

export {
  recordPlanHistory, updatePlanBarUI, enterPlanMode, exitPlanMode,
  getWish, setWish, toggleWish, isPinned, setPinned, togglePinned,
  closePlanMode, abortPlanChanges, savePlanDraft, applyPlanToMain,
  undoPlan, redoPlan,
} from './planmode.js';
import {
  recordPlanHistory, enterPlanMode, closePlanMode,
  abortPlanChanges, savePlanDraft, applyPlanToMain, undoPlan, redoPlan,
} from './planmode.js';

export {
  isEditorOpen, openEditor, initEditorChipDelegation, refreshEditorChips,
  saveEditor, confirmRemoveEmployee, confirmRemoveEmployeeFuture,
} from './editor.js';
import { isEditorOpen, initEditorChipDelegation, saveEditor, refreshEditorChips } from './editor.js';

export {
  resetAutoPlanTargets, disposeNeuralGraphInstance,
  runYearAutoPlan, defaultBDTarget, openAutoPlanModal, renderAutoPlanModal,
  renderProgressShell, streamProgressLogs, renderResultView, renderReportModal,
  applyAutoPlan,
} from './autoplan-ui.js';
import {
  disposeNeuralGraphInstance, openAutoPlanModal,
  applyAutoPlan, renderReportModal,
} from './autoplan-ui.js';

export { openMobileDay } from './mobile.js';

export {
  doExport, openImportModal, doImport, initDragDrop, handleDroppedFile,
} from './import-export.js';
import { doExport, doImport, openImportModal, initDragDrop } from './import-export.js';

export {
  clearMultiSelection, quickTargetDays, quickToggleWorkplace, quickToggleDuty,
  moveDutyBadge, quickClearCell, quickSetStatus,
} from './quick-actions.js';
import { clearMultiSelection } from './quick-actions.js';

export function wireEvents() {
  document.getElementById("btn-prev")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("btn-next")?.addEventListener("click", () => changeMonth(1));
  document.getElementById("btn-today")?.addEventListener("click", handleTodayClick);
  document.getElementById("btn-theme")?.addEventListener("click", (e) => toggleTheme(e));
  document.getElementById("btn-density")?.addEventListener("click", toggleDensity);
  initCommandPalette();
  initEditorChipDelegation();

  document.getElementById("btn-employees")?.addEventListener("click", () => {
    const { year: y } = state;
    const employees = getEmployeesForYear(y);
    if (!state.employeeDashboard.selectedEmp || !employees.includes(state.employeeDashboard.selectedEmp)) {
      state.employeeDashboard.selectedEmp = employees[0] || null;
    }
    const empSub = document.getElementById("emp-sub");
    if (empSub) {
      empSub.textContent = `Kalenderjahr ${y}`;
    }
    showOverlay("modal-emps");
    showTeamScreen();
    setTimeout(() => document.getElementById("emp-search")?.focus(), 80);
  });
  
  document.getElementById("month-label-btn")?.addEventListener("click", () => { 
    if (isPeriodFlyoutOpen()) {
      closePeriodFlyout(); 
    } else {
      openPeriodFlyout(); 
    }
  });
  
  document.getElementById("emp-open-period")?.addEventListener("click", openPeriodFlyout);
  document.getElementById("period-flyout-close")?.addEventListener("click", closePeriodFlyout);
  
  document.getElementById("period-month-select")?.addEventListener("change", (e) => {
    state.periodDraft.month = parseInt(/** @type {HTMLSelectElement} */ (e.target).value, 10);
    syncPeriodControls();
  });

  document.getElementById("period-year-input")?.addEventListener("input", (e) => {
    state.periodDraft.year = parseInt(/** @type {HTMLInputElement} */ (e.target).value, 10) || state.year;
    syncPeriodControls();
  });
  
  document.getElementById("period-apply")?.addEventListener("click", applyPeriodDraft);
  
  document.getElementById("period-today")?.addEventListener("click", () => { 
    state.periodDraft = { year: TOD_Y, month: TOD_M }; 
    applyPeriodDraft(); 
    setTimeout(doScrollToToday, 150); 
  });
  
  document.getElementById("period-prev-month")?.addEventListener("click", () => { 
    const total = state.periodDraft.year * 12 + state.periodDraft.month - 1; 
    state.periodDraft.year = Math.floor(total / 12); 
    state.periodDraft.month = ((total % 12) + 12) % 12; 
    syncPeriodControls(); 
  });
  
  document.getElementById("period-next-month")?.addEventListener("click", () => { 
    const total = state.periodDraft.year * 12 + state.periodDraft.month + 1; 
    state.periodDraft.year = Math.floor(total / 12); 
    state.periodDraft.month = ((total % 12) + 12) % 12; 
    syncPeriodControls(); 
  });
  
  document.getElementById("period-prev-year")?.addEventListener("click", () => { 
    state.periodDraft.year -= 1; 
    syncPeriodControls(); 
  });
  
  document.getElementById("period-next-year")?.addEventListener("click", () => { 
    state.periodDraft.year += 1; 
    syncPeriodControls(); 
  });
  
  document.getElementById("emp-search")?.addEventListener("input", (e) => {
    state.employeeDashboard.filter = /** @type {HTMLInputElement} */ (e.target).value;
    renderEmployeeDashboard();
  });

  document.querySelectorAll("#modal-emps .emp-screen-btn").forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.screen === "person") showPersonScreen();
      else showTeamScreen();
    });
  });

  document.getElementById("emp-person-back")?.addEventListener("click", showTeamScreen);

  document.querySelectorAll("#modal-emps .pm-tab").forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener("click", () => applyPersonTab(btn.dataset.ptab));
  });

  document.getElementById("emp-person-select")?.addEventListener("change", (e) => {
    openProfileModal(/** @type {HTMLSelectElement} */ (e.target).value);
  });

  const empSortEl = /** @type {HTMLSelectElement} */ (document.getElementById("emp-sort"));
  if (empSortEl) {
    empSortEl.value = state.employeeDashboard.sort || "name";
    empSortEl.addEventListener("change", (e) => {
      state.employeeDashboard.sort = /** @type {HTMLSelectElement} */ (e.target).value;
      renderEmployeeDashboard();
    });
  }

  const empActiveEl = /** @type {HTMLInputElement} */ (document.getElementById("emp-active-only"));
  if (empActiveEl) {
    empActiveEl.checked = !!state.employeeDashboard.activeOnly;
    empActiveEl.addEventListener("change", (e) => {
      state.employeeDashboard.activeOnly = /** @type {HTMLInputElement} */ (e.target).checked;
      renderEmployeeDashboard();
    });
  }

  document.getElementById("emp-export-csv")?.addEventListener("click", () => {
    const n = exportEmployeeDashboardCSV();
    showToast(n ? `${n} Mitarbeitende als CSV exportiert` : "Keine Daten zum Export");
  });
  
  document.addEventListener("click", (e) => {
    const flyout = document.getElementById("period-flyout");
    const trigger = document.getElementById("month-label-btn");
    const inlineBtn = document.getElementById("emp-open-period");
    
    if (!isPeriodFlyoutOpen()) return;
    const target = /** @type {Node} */ (e.target);
    if (flyout?.contains(target) || trigger?.contains(target) || inlineBtn?.contains(target)) {
      return;
    }
    
    closePeriodFlyout();
  });
  
  document.getElementById("btn-analytics")?.addEventListener("click", () => {
    openAnalyticsHub();
  });

  const commentTa = /** @type {HTMLTextAreaElement} */ (document.getElementById("ed-comment-ta"));
  const commentCount = document.getElementById("ed-comment-count");
  if (commentTa && commentCount) {
    commentTa.addEventListener("input", () => {
      commentCount.textContent = `${commentTa.value.length}/200`;
    });
  }

  document.getElementById("btn-export")?.addEventListener("click", () => {
    doExport();
  });

  document.getElementById("btn-print")?.addEventListener("click", () => {
    openPrintPreview();
  });

  document.getElementById("btn-undo")?.addEventListener("click", normalUndo);
  document.getElementById("btn-redo")?.addEventListener("click", normalRedo);
  document.getElementById("mbtn-undo")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(normalUndo, 180);
  });
  document.getElementById("mbtn-redo")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(normalRedo, 180);
  });

  document.getElementById("btn-import")?.addEventListener("click", () => {
    openImportModal();
  });
  
  document.getElementById("btn-force-sync")?.addEventListener("click", async () => {
    if (!confirm("WARNUNG: Alle lokalen Entwürfe und ungespeicherten Änderungen werden gelöscht und durch den aktuellen Server-Stand ersetzt. Wirklich fortfahren?")) return;
    const success = await forceSyncWithServer();
    if (success) {
      ensurePostBDFreiDays();
      render();
      showToast("Lokale Daten verworfen und mit Server synchronisiert");
    } else {
      showToast("Fehler bei der Server-Synchronisation");
    }
  });
  
  initHeaderOverflowMenu();
  initColorblindToggle();

  document.getElementById("btn-plan")?.addEventListener("click", () => {
    if (planMode) {
      closePlanMode();
    } else {
      enterPlanMode();
    }
  });

  document.getElementById("mnav-dept")?.addEventListener("click", () => {
    document.getElementById("btn-employees")?.click();
  });
  
  document.getElementById("mnav-plan")?.addEventListener("click", () => { 
    if (planMode) {
      closePlanMode(); 
    } else {
      enterPlanMode(); 
    }
  });
  
  document.getElementById("mnav-menu")?.addEventListener("click", () => showOverlay("modal-mobile-menu"));
  
  document.getElementById("mbtn-employees")?.addEventListener("click", () => { 
    hideOverlay("modal-mobile-menu"); 
    setTimeout(() => document.getElementById("btn-employees")?.click(), 180); 
  });
  
  document.getElementById("mbtn-today")?.addEventListener("click", () => { 
    hideOverlay("modal-mobile-menu"); 
    setTimeout(handleTodayClick, 180); 
  });
  
  document.getElementById("mbtn-export")?.addEventListener("click", () => { 
    hideOverlay("modal-mobile-menu"); 
    setTimeout(() => doExport(), 180); 
  });
  
  document.getElementById("mbtn-import")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(() => openImportModal(), 180);
  });

  document.getElementById("mbtn-cmdk")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(() => openCommandPalette(), 180);
  });

  document.getElementById("mbtn-theme")?.addEventListener("click", (e) => toggleTheme(e));

  document.getElementById("mbtn-analytics")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(() => openAnalyticsHub(), 180);
  });

  document.getElementById("mbtn-print")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(() => openPrintPreview(), 180);
  });

  document.getElementById("mbtn-force-sync")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(async () => {
      if (!confirm("WARNUNG: Alle lokalen Entwürfe und ungespeicherten Änderungen werden gelöscht und durch den aktuellen Server-Stand ersetzt. Wirklich fortfahren?")) return;
      const success = await forceSyncWithServer();
      if (success) {
        ensurePostBDFreiDays();
        render();
        showToast("Lokale Daten verworfen und mit Server synchronisiert");
      } else {
        showToast("Fehler bei der Server-Synchronisation");
      }
    }, 180);
  });
  
  document.getElementById("btn-plan-apply")?.addEventListener("click", () => { 
    if (!confirm("Planungsentwurf in den Hauptplan übernehmen?")) return; 
    applyPlanToMain(); 
  });
  
  document.getElementById("btn-plan-save")?.addEventListener("click", savePlanDraft);
  document.getElementById("btn-plan-abort")?.addEventListener("click", abortPlanChanges);
  document.getElementById("btn-plan-close")?.addEventListener("click", closePlanMode);
  document.getElementById("btn-plan-undo")?.addEventListener("click", undoPlan);
  document.getElementById("btn-plan-redo")?.addEventListener("click", redoPlan);
  document.getElementById("btn-plan-auto")?.addEventListener("click", openAutoPlanModal);
  document.getElementById("ap-apply")?.addEventListener("click", applyAutoPlan);
  
  document.getElementById("ed-save")?.addEventListener("click", () => {
    saveEditor();
  });
  
  document.getElementById("ed-cancel")?.addEventListener("click", () => hideOverlay("modal-editor"));
  
  document.getElementById("ed-clear")?.addEventListener("click", () => {
    const { year: y, month: m } = state;
    const { emp, day, isRbnRow } = state.edit || {};
    const days = Array.isArray(state.edit?.days) && state.edit.days.length
      ? state.edit.days
      : (day ? [day] : []);

    if (planMode) recordPlanHistory();

    if (isRbnRow) {
      setRbnValue(y, m, day, "");
    } else {
      days.forEach(targetDay => clearCell(y, m, emp, targetDay));
    }

    if (planMode) recordPlanHistory();

    state.multiEdit = { emp: null, days: [], anchor: null };
    hideOverlay("modal-editor");
    if (isRbnRow) {
      updateGridCell(RBN_ROW_KEY, day);
    } else {
      days.forEach((d) => updateGridCell(emp, d));
    }
    updateAllConflicts();
    updateGridStatsAndHeader(isRbnRow ? [day] : days);
  });
  
  document.getElementById("import-confirm")?.addEventListener("click", () => {
    doImport();
  });
  
  document.getElementById("dept-tab-month")?.addEventListener("click", () => {
    setDeptTab("month");
    document.querySelectorAll(".dept-tab").forEach((t) => t.classList.remove("active"));
    document.getElementById("dept-tab-month")?.classList.add("active");
    renderDeptContent();
  });
  
  document.getElementById("dept-tab-year")?.addEventListener("click", () => {
    setDeptTab("year");
    document.querySelectorAll(".dept-tab").forEach((t) => t.classList.remove("active"));
    document.getElementById("dept-tab-year")?.classList.add("active");
    renderDeptContent();
  });
  
  document.querySelectorAll("[data-close]").forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener("click", () => hideOverlay(btn.dataset.close));
  });
  
  document.querySelectorAll(".overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => { 
      if (e.target === ov) hideOverlay(ov.id); 
    });
  });
  
  document.addEventListener("keydown", (e) => {
    if (state.isAutoplanRunning) {
      // Vorschlag 9: Sperrt alle Tastenkombinationen während der Auto-Planung läuft
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === "Escape") {
      let handled = false;
      // Nur das oberste Modal schließen (nicht den ganzen Stack auf einmal) —
      // "modal-score-info" wird z. B. ÜBER "modal-autoplan"/"modal-ap-report"
      // geöffnet, daher hier zuerst geprüft.
      const stackOrder = [
        "modal-score-info", "modal-command-palette", "modal-mobile-menu", "modal-mobile-day",
        "modal-editor", "modal-emps", "modal-import", "modal-dept",
        "modal-yearplan", "modal-print-preview", "modal-ap-report", "modal-autoplan"
      ];
      for (const id of stackOrder) {
        const el = document.getElementById(id);
        if (el && !el.hasAttribute("hidden")) { hideOverlay(id); handled = true; break; }
      }
      if (!handled && isPeriodFlyoutOpen()) { closePeriodFlyout(); handled = true; }
      if (!handled && state.multiEdit?.days?.length) {
        clearMultiSelection();
      }
      return;
    }
    
    if (isEditorOpen()) {
      if (state.edit?.isRbnRow) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === "s" || e.key === "S" || e.key === "Enter")) {
          e.preventDefault(); 
          saveEditor(); 
          return;
        }
      }
      
      const noMod = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
      if (state.edit?.isRbnRow) return;
      
      if (noMod && e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        if (!state.ed.st) { 
          e.preventDefault(); 
          const code = WORKPLACES[idx].code; 
          const i = state.ed.wp.indexOf(code); 
          if (i >= 0) {
            state.ed.wp.splice(i, 1); 
          } else {
            state.ed.wp.push(code); 
          }
          refreshEditorChips(); 
        }
        return;
      }
      
      if (noMod && (e.key === "d" || e.key === "D")) { 
        e.preventDefault(); 
        const owner = dutyOwner(state.year, state.month, state.edit.day, "D"); 
        if (!owner || owner === state.edit.emp) { 
          state.ed.duty = state.ed.duty === "D" ? null : "D"; 
          refreshEditorChips(); 
        } 
        return; 
      }
      
      if (noMod && (e.key === "h" || e.key === "H")) { 
        e.preventDefault(); 
        const owner = dutyOwner(state.year, state.month, state.edit.day, "HG"); 
        if (!owner || owner === state.edit.emp) { 
          state.ed.duty = state.ed.duty === "HG" ? null : "HG"; 
          refreshEditorChips(); 
        } 
        return; 
      }
      
      if (noMod && (e.key === "s" || e.key === "S")) { 
        e.preventDefault(); 
        saveEditor(); 
        return; 
      }
      
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const tag = (document.activeElement?.tagName || "").toUpperCase();
        const isCancel = ["ed-cancel", "ed-clear"].includes(document.activeElement?.id || "");
        if (tag !== "BUTTON" || (!isCancel && document.activeElement?.id === "ed-save")) { 
          if (tag !== "BUTTON") { 
            e.preventDefault(); 
            saveEditor(); 
          } 
        }
        return;
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "s") {
      e.preventDefault();
      if (planMode) {
        savePlanDraft();
      } else {
        doExport();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      openPrintPreview();
      return;
    }

    const eventTarget = /** @type {HTMLElement} */ (e.target);
    const typingTarget = ["INPUT", "TEXTAREA", "SELECT"].includes((eventTarget?.tagName || "").toUpperCase()) || eventTarget?.isContentEditable;

    if (planMode) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undoPlan();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
        e.preventDefault();
        redoPlan();
        return;
      }
    } else if (!typingTarget) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        normalUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && (e.key === "z" || e.key === "Z")) || e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        normalRedo();
        return;
      }
    }
    
    if (e.altKey && e.key === "ArrowLeft") {
      document.getElementById("btn-prev")?.click();
    }
    if (e.altKey && e.key === "ArrowRight") {
      document.getElementById("btn-next")?.click();
    }
  });
  
  const gridWrapper = document.getElementById("grid-wrapper");
  if (gridWrapper) {
    gridWrapper.addEventListener("wheel", (e) => {
      const isEmployeeCol = /** @type {HTMLElement} */ (e.target).closest('.td-name, .th-corner');
      const scrollingVertical = e.shiftKey || isEmployeeCol;
      
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      
      if (delta !== 0) {
        e.preventDefault();
        if (scrollingVertical) {
          gridWrapper.scrollTop += delta;
        } else {
          gridWrapper.scrollLeft += delta;
        }
      }
    }, { passive: false });
  }
  
  initDragDrop();
  initGridKeyboardHandlers();

  const apReportBtn = document.getElementById("ap-report-btn");
  if (apReportBtn) {
    apReportBtn.addEventListener("click", renderReportModal);
  }
}

export async function init() {
  injectBrandIcon();
  initTheme();
  initDensity();
  await loadFromStorage();
  ensurePostBDFreiDays();
  
  if (!Object.keys(DATA).length && serverFetchSuccessful && serverLastModified === 0) {
    const k = monthKey(state.year, state.month);
    DATA[k] = {
      employees: [
        "Prof. Schäfer", "Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Fr. Thaler", 
        "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Torki", "Hr. Sebastian"
      ].filter((emp) => isEmployeeActiveInMonth(emp, state.year, state.month)),
      assignments: {}, 
      rbn: {},
    };
    saveToStorage();
  }
  
  populatePeriodMonthSelect();
  syncPeriodControls();
  wireEvents();
  initNormalHistory();
  initCellTooltips();
  initTooltips();
  initNotificationCenter();
  initConflictModal();
  initViewMode();

  // Navigation aus dem Auswertungs-Hub (z. B. Klick auf eine Jahresgitter-Zelle):
  // Hub schließen und in den gewählten Monat springen.
  window.addEventListener('radplan-navigate', (e) => {
    const { year, month } = /** @type {CustomEvent} */ (e).detail || {};
    if (Number.isFinite(year) && Number.isFinite(month)) {
      hideOverlay('modal-analytics');
      setTimeout(() => switchPeriod(year, month), 180);
    }
  });

  refreshResponsiveLayout({ forceRender: true });

  const apModal = document.getElementById("modal-autoplan");
  if (apModal) {
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "hidden" && apModal.hasAttribute("hidden")) {
          disposeNeuralGraphInstance();
        }
      });
    }).observe(apModal, { attributes: true });
  }
  
  window.addEventListener("resize", () => {
    queueResponsiveRefresh();
  }, { passive: true });
  
  window.addEventListener("orientationchange", () => {
    queueResponsiveRefresh();
  }, { passive: true });
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      queueResponsiveRefresh();
    }, { passive: true });
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
       const updated = await syncWithServer();
       if (updated) {
         ensurePostBDFreiDays();
       }
    }
  });

  window.addEventListener("radplan-sync-update", () => {
    render();
    showToast("Daten im Hintergrund aktualisiert");
  });

  window.addEventListener("radplan-sync-conflict", (e) => {
    render();
    const stats = /** @type {CustomEvent} */ (e).detail || {};
    if (stats.conflicts > 0) {
      showToast(`Speicher-Konflikt: ${stats.conflicts} Feld(er) kollidierten, lokaler Stand übernommen`);
      openConflictModal();
    } else if (stats.localWins > 0 || stats.serverWins > 0) {
      showToast(`Speicher-Konflikt automatisch zusammengeführt (${stats.localWins} lokal, ${stats.serverWins} vom Server)`);
    } else {
      showToast("Speicher-Konflikt: Aktuellster Server-Stand geladen");
    }
  });

  window.addEventListener("radplan-save-start", () => {
    showToast("Wird gespeichert...");
  });

  window.addEventListener("radplan-save-success", () => {
    showToast("Erfolgreich gespeichert");
    try {
      checkComplianceAndNotify(computeCompliance, getRange('month', state.year, state.month));
      checkGridConflictsAndNotify(computeGridConflicts(state.year, state.month), state.year, state.month);
    } catch {
      // Benachrichtigung ist ein optionaler Zusatz — ein Fehler hier darf den erfolgreichen Speichervorgang nicht stören.
    }
  });

  window.addEventListener("radplan-save-error", () => {
    showToast("Netzwerkfehler beim Speichern");
  });

  setInterval(async () => {
    if (document.visibilityState === "visible") {
      const updated = await syncWithServer();
      if (updated) {
        ensurePostBDFreiDays();
      }
    }
  }, 30000);
}

document.addEventListener("DOMContentLoaded", init);

export function announceToScreenReader(message) {
  const announcer = document.getElementById("aria-announcer");
  if (announcer) {
    announcer.textContent = "";
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  }
}
