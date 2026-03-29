window.showToast = function(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), 3000);
};

window.showOverlay = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.hidden = false;
    el.style.display = "flex";
  }
};

window.hideOverlay = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const m = el.querySelector(".modal");
  if (m) {
    m.classList.add("modal-closing");
    m.addEventListener("animationend", function handler() {
      m.classList.remove("modal-closing");
      el.hidden = true;
      el.style.display = "none";
      m.removeEventListener("animationend", handler);
    }, { once: true });
  } else {
    el.hidden = true;
    el.style.display = "none";
  }
  if (id === "modal-editor") {
    state.edit = null;
    document.removeEventListener("keydown", window.editorKeyListener);
  }
};

document.querySelectorAll(".overlay").forEach(ov => {
  ov.addEventListener("mousedown", e => {
    if (e.target === ov) {
      if (ov.id === "modal-autoplan" && window.apViewMode === "progress") return;
      hideOverlay(ov.id);
    }
  });
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-close");
    if (id === "modal-autoplan" && window.apViewMode === "progress") return;
    hideOverlay(id);
  });
});

function handleResize() {
  const isMobileNow = window.innerWidth <= MOBILE_BREAKPOINT || TOUCH_DEVICE_RE.test(navigator.userAgent);
  if (isMobileNow !== IS_MOBILE) {
    IS_MOBILE = isMobileNow;
    document.body.classList.toggle("is-mobile", IS_MOBILE);
    if (typeof render === "function") render();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof loadFromStorage === "function") loadFromStorage();
  
  if (typeof ensurePostBDFreiDays === "function") {
    const repaired = ensurePostBDFreiDays();
    if (repaired > 0) showToast(`${repaired} fehlende Frei-Tage nach BD ergänzt.`);
  }
  
  if (Object.keys(DATA).length === 0) {
    const k = monthKey(TOD_Y, TOD_M);
    DATA[k] = { employees: Object.keys(EMP_META), assignments: {}, rbn: {} };
    if (typeof saveToStorage === "function") saveToStorage();
  }
  
  state.year = TOD_Y;
  state.month = TOD_M;
  
  IS_MOBILE = window.innerWidth <= MOBILE_BREAKPOINT || TOUCH_DEVICE_RE.test(navigator.userAgent);
  document.body.classList.toggle("is-mobile", IS_MOBILE);
  window.addEventListener("resize", handleResize);
  
  if (typeof render === "function") render();
  
  setupNavigation();
  setupPeriodFlyout();
  setupEditor();
  setupPlanMode();
  setupImportExport();
  setupEmployeeModal();
  setupDeptModal();
  setupMobileNav();
  
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); document.getElementById("btn-export").click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { if (planMode) { e.preventDefault(); document.getElementById("btn-plan-undo").click(); } }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { if (planMode) { e.preventDefault(); document.getElementById("btn-plan-redo").click(); } }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); document.getElementById("btn-prev").click(); }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); document.getElementById("btn-next").click(); }
  });
});

function setupNavigation() {
  document.getElementById("btn-prev").addEventListener("click", () => {
    if (planMode && typeof persistPlanSessionRefs === "function") persistPlanSessionRefs();
    const nx = shiftMonth(-1);
    state.year = nx.year; state.month = nx.month;
    if (planMode && typeof loadPlanSessionForState === "function") loadPlanSessionForState(state.year, state.month);
    if (typeof render === "function") render();
  });
  
  document.getElementById("btn-next").addEventListener("click", () => {
    if (planMode && typeof persistPlanSessionRefs === "function") persistPlanSessionRefs();
    const nx = shiftMonth(1);
    state.year = nx.year; state.month = nx.month;
    if (planMode && typeof loadPlanSessionForState === "function") loadPlanSessionForState(state.year, state.month);
    if (typeof render === "function") render();
  });
  
  document.getElementById("btn-today").addEventListener("click", () => {
    let changed = false;
    if (state.year !== TOD_Y || state.month !== TOD_M) {
      if (planMode && typeof persistPlanSessionRefs === "function") persistPlanSessionRefs();
      state.year = TOD_Y;
      state.month = TOD_M;
      if (planMode && typeof loadPlanSessionForState === "function") loadPlanSessionForState(state.year, state.month);
      changed = true;
      if (typeof render === "function") render();
    }
    
    setTimeout(() => {
      const todayEl = document.querySelector(".today");
      if (todayEl) {
        if (IS_MOBILE) {
          const list = document.getElementById("mobile-day-list");
          if (list) {
            const offset = todayEl.offsetTop - (list.clientHeight / 2) + (todayEl.clientHeight / 2);
            list.scrollTo({ top: offset, behavior: "smooth" });
          }
        } else {
          todayEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      }
    }, changed ? 120 : 0);
  });
}

function setupPeriodFlyout() {
  const btn = document.getElementById("month-label-btn");
  const fly = document.getElementById("period-flyout");
  const close = document.getElementById("period-flyout-close");
  const ms = document.getElementById("period-month-select");
  const yi = document.getElementById("period-year-input");
  
  if (!btn || !fly || !close || !ms || !yi) return;
  
  ms.innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join("");
  
  const updateCtx = () => {
    document.getElementById("period-context").textContent = `Auswahl: ${MONTHS[state.periodDraft.month]} ${state.periodDraft.year}`;
  };
  const syncUI = () => {
    ms.value = state.periodDraft.month;
    yi.value = state.periodDraft.year;
    updateCtx();
  };

  const openFlyout = () => {
    state.periodDraft = { year: state.year, month: state.month };
    syncUI();
    btn.setAttribute("aria-expanded", "true");
    fly.hidden = false;
  };
  
  btn.addEventListener("click", e => { 
    e.stopPropagation(); 
    if (fly.hidden) openFlyout(); 
    else { 
      fly.hidden = true; 
      btn.setAttribute("aria-expanded", "false"); 
    } 
  });
  
  close.addEventListener("click", () => { 
    fly.hidden = true; 
    btn.setAttribute("aria-expanded", "false"); 
  });
  
  document.addEventListener("click", e => { 
    if (!fly.hidden && !fly.contains(e.target) && !btn.contains(e.target)) { 
      fly.hidden = true; 
      btn.setAttribute("aria-expanded", "false"); 
    } 
  });
  
  document.getElementById("emp-open-period")?.addEventListener("click", () => openFlyout());

  ms.addEventListener("change", () => { state.periodDraft.month = parseInt(ms.value, 10); updateCtx(); });
  yi.addEventListener("change", () => { state.periodDraft.year = parseInt(yi.value, 10) || TOD_Y; updateCtx(); });
  
  document.getElementById("period-prev-year")?.addEventListener("click", () => { state.periodDraft.year--; syncUI(); });
  document.getElementById("period-next-year")?.addEventListener("click", () => { state.periodDraft.year++; syncUI(); });
  
  document.getElementById("period-prev-month")?.addEventListener("click", () => {
    state.periodDraft.month--;
    if (state.periodDraft.month < 0) { state.periodDraft.month = 11; state.periodDraft.year--; }
    syncUI();
  });
  
  document.getElementById("period-next-month")?.addEventListener("click", () => {
    state.periodDraft.month++;
    if (state.periodDraft.month > 11) { state.periodDraft.month = 0; state.periodDraft.year++; }
    syncUI();
  });
  
  document.getElementById("period-today")?.addEventListener("click", () => {
    state.periodDraft = { year: TOD_Y, month: TOD_M };
    syncUI();
  });
  
  document.getElementById("period-apply")?.addEventListener("click", () => {
    if (planMode && typeof persistPlanSessionRefs === "function") persistPlanSessionRefs();
    state.year = state.periodDraft.year;
    state.month = state.periodDraft.month;
    if (planMode && typeof loadPlanSessionForState === "function") loadPlanSessionForState(state.year, state.month);
    fly.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (typeof render === "function") render();
  });
}

window.recordPlanHistory = function() {
  if (!planMode) return;
  const currentAss = JSON.stringify(planData.assignments);
  const currentRbn = JSON.stringify(planData.rbn || {});
  const currentWishes = JSON.stringify(planData.wishes || {});
  const lastState = planHistory[planHistoryIdx];
  if (lastState && JSON.stringify(lastState.assignments) === currentAss && JSON.stringify(lastState.rbn || {}) === currentRbn && JSON.stringify(lastState.wishes || {}) === currentWishes) return;
  
  planHistory = planHistory.slice(0, planHistoryIdx + 1);
  planHistory.push({ assignments: JSON.parse(currentAss), rbn: JSON.parse(currentRbn), wishes: JSON.parse(currentWishes) });
  planHistoryIdx = planHistory.length - 1;
  planData.history = planHistory;
  planData.historyIdx = planHistoryIdx;
  if (typeof savePlanDraft === "function") savePlanDraft();
  if (typeof render === "function") render();
};

window.savePlanDraft = function() {
  if (!planMode) return;
  try {
    localStorage.setItem(`radplan_v3_plan_${planData.key}`, JSON.stringify(planData));
  } catch(e) {}
};

window.togglePlanMode = function() {
  planMode = !planMode;
  if (planMode) {
    if (typeof loadPlanSessionForState === "function") loadPlanSessionForState(state.year, state.month);
  } else {
    planData = null;
    planBaseline = null;
    planHistory = [];
    planHistoryIdx = -1;
  }
  if (typeof render === "function") render();
};

function setupPlanMode() {
  document.getElementById("btn-plan")?.addEventListener("click", () => {
    if (!planMode) togglePlanMode();
  });
  
  document.getElementById("mnav-plan")?.addEventListener("click", () => {
    if (!planMode) {
      togglePlanMode();
      hideOverlay("modal-mobile-menu");
    }
  });
  
  document.getElementById("btn-plan-close")?.addEventListener("click", () => {
    if (typeof hasAnyPlanChanges === "function" && hasAnyPlanChanges()) {
      if (!confirm("Planungsmodus schließen? Es gibt ungespeicherte Änderungen in der Session.")) return;
    }
    togglePlanMode();
  });
  
  document.getElementById("btn-plan-abort")?.addEventListener("click", () => {
    if (confirm("Alle Entwürfe im aktuellen Monat verwerfen?")) {
      planData.assignments = JSON.parse(JSON.stringify(planBaseline.assignments));
      planData.rbn = JSON.parse(JSON.stringify(planBaseline.rbn || {}));
      planData.wishes = {};
      planHistory = [{ assignments: JSON.parse(JSON.stringify(planData.assignments)), rbn: JSON.parse(JSON.stringify(planData.rbn)), wishes: {} }];
      planHistoryIdx = 0;
      savePlanDraft();
      if (typeof render === "function") render();
      showToast("Entwurf für aktuellen Monat verworfen");
    }
  });
  
  document.getElementById("btn-plan-save")?.addEventListener("click", () => {
    savePlanDraft();
    showToast("Entwurf sicher gespeichert");
  });
  
  document.getElementById("btn-plan-apply")?.addEventListener("click", () => {
    if (confirm("Alle Zuweisungen aus diesem Entwurf überschreiben den Hauptplan für diesen Monat. Fortfahren?")) {
      const mk = monthKey(state.year, state.month);
      if (!DATA[mk]) DATA[mk] = { employees: [...planData.employees], assignments: {}, rbn: {} };
      DATA[mk].employees = [...planData.employees];
      DATA[mk].assignments = JSON.parse(JSON.stringify(planData.assignments));
      DATA[mk].rbn = JSON.parse(JSON.stringify(planData.rbn || {}));
      if (typeof saveToStorage === "function") saveToStorage();
      planBaseline.assignments = JSON.parse(JSON.stringify(planData.assignments));
      planBaseline.rbn = JSON.parse(JSON.stringify(planData.rbn || {}));
      planData.wishes = {};
      localStorage.removeItem(`radplan_v3_plan_${mk}`);
      togglePlanMode();
      showToast("Plan wurde in den Hauptdienstplan übernommen");
    }
  });
  
  document.getElementById("btn-plan-undo")?.addEventListener("click", () => {
    if (planHistoryIdx > 0) {
      planHistoryIdx--;
      const st = planHistory[planHistoryIdx];
      planData.assignments = JSON.parse(JSON.stringify(st.assignments));
      planData.rbn = JSON.parse(JSON.stringify(st.rbn || {}));
      planData.wishes = JSON.parse(JSON.stringify(st.wishes || {}));
      savePlanDraft();
      if (typeof render === "function") render();
    }
  });
  
  document.getElementById("btn-plan-redo")?.addEventListener("click", () => {
    if (planHistoryIdx < planHistory.length - 1) {
      planHistoryIdx++;
      const st = planHistory[planHistoryIdx];
      planData.assignments = JSON.parse(JSON.stringify(st.assignments));
      planData.rbn = JSON.parse(JSON.stringify(st.rbn || {}));
      planData.wishes = JSON.parse(JSON.stringify(st.wishes || {}));
      savePlanDraft();
      if (typeof render === "function") render();
    }
  });
  
  document.getElementById("btn-plan-auto")?.addEventListener("click", () => {
    if (typeof openAutoPlanModal === "function") openAutoPlanModal();
  });
  
  document.getElementById("ap-report-btn")?.addEventListener("click", () => {
    if (typeof renderReportModal === "function") renderReportModal();
  });
  
  document.getElementById("ap-apply")?.addEventListener("click", () => {
    if (typeof applyAutoPlan === "function") applyAutoPlan();
  });
}

window.editorKeyListener = function(e) {
  if (document.getElementById("modal-editor").hidden) return;
  const k = e.key.toLowerCase();
  
  if (k === "d") {
    e.preventDefault();
    if (planMode) {
      const chip = Array.from(document.querySelectorAll("#ed-wish .chip-wish")).find(el => el.dataset.val === "BD_WISH");
      if (chip) chip.click();
      else {
        const dChip = Array.from(document.querySelectorAll("#ed-duty .chip-duty")).find(el => el.dataset.val === "D");
        if (dChip && !dChip.classList.contains("blocked")) dChip.click();
      }
    } else {
      const chip = Array.from(document.querySelectorAll("#ed-duty .chip-duty")).find(el => el.dataset.val === "D");
      if (chip && !chip.classList.contains("blocked")) chip.click();
    }
  } else if (k === "h") {
    e.preventDefault();
    if (planMode) {
      const chip = Array.from(document.querySelectorAll("#ed-wish .chip-wish")).find(el => el.dataset.val === "HG_WISH");
      if (chip) chip.click();
      else {
        const hChip = Array.from(document.querySelectorAll("#ed-duty .chip-duty")).find(el => el.dataset.val === "HG");
        if (hChip && !hChip.classList.contains("blocked")) hChip.click();
      }
    } else {
      const chip = Array.from(document.querySelectorAll("#ed-duty .chip-duty")).find(el => el.dataset.val === "HG");
      if (chip && !chip.classList.contains("blocked")) chip.click();
    }
  } else if (k === "enter") {
    e.preventDefault();
    document.getElementById("ed-save")?.click();
  } else if (k >= "1" && k <= "8") {
    e.preventDefault();
    const idx = parseInt(k, 10) - 1;
    if (WORKPLACES[idx]) {
      const chip = Array.from(document.querySelectorAll("#ed-wp .chip-wp")).find(el => el.dataset.val === WORKPLACES[idx].code);
      if (chip && !chip.classList.contains("dim")) chip.click();
    }
  }
};

function setupEditor() {
  document.getElementById("ed-save")?.addEventListener("click", () => {
    if (!state.edit) return;
    const { emp, day } = state.edit;
    const { year: y, month: m } = state;
    
    if (emp === RBN_ROW_KEY) {
      const val = state.ed.wp.length > 0 ? state.ed.wp[0] : null;
      if (typeof setRbnValue === "function") setRbnValue(y, m, day, val);
      if (planMode) recordPlanHistory();
      hideOverlay("modal-editor");
      if (typeof render === "function") render();
      if (IS_MOBILE && typeof renderMobileDayModal === "function") {
        const hols = getSaxonyHolidaysCached(y);
        renderMobileDayModal(y, m, day, hols);
      }
      return;
    }

    let ass = null;
    if (state.ed.st) ass = state.ed.st;
    else if (state.ed.wp.length > 0) ass = state.ed.wp.join(" / ");
    
    if (typeof setCell === "function") setCell(y, m, emp, day, { assignment: ass, duty: state.ed.duty });
    
    if (planMode) {
      if (!planData.wishes) planData.wishes = {};
      if (!planData.wishes[emp]) planData.wishes[emp] = {};
      if (state.ed.wish) planData.wishes[emp][day] = state.ed.wish;
      else delete planData.wishes[emp][day];
      recordPlanHistory();
    }
    
    hideOverlay("modal-editor");
    if (typeof render === "function") render();
    if (IS_MOBILE && typeof renderMobileDayModal === "function") {
      const hols = getSaxonyHolidaysCached(y);
      renderMobileDayModal(y, m, day, hols);
    }
  });

  document.getElementById("ed-clear")?.addEventListener("click", () => {
    if (!state.edit) return;
    const { emp, day } = state.edit;
    const { year: y, month: m } = state;
    
    if (emp === RBN_ROW_KEY) {
      if (typeof setRbnValue === "function") setRbnValue(y, m, day, null);
    } else {
      if (typeof clearCell === "function") clearCell(y, m, emp, day);
      if (planMode && planData.wishes && planData.wishes[emp]) delete planData.wishes[emp][day];
    }
    if (planMode) recordPlanHistory();
    
    hideOverlay("modal-editor");
    if (typeof render === "function") render();
    if (IS_MOBILE && typeof renderMobileDayModal === "function") {
      const hols = getSaxonyHolidaysCached(y);
      renderMobileDayModal(y, m, day, hols);
    }
  });

  document.getElementById("ed-cancel")?.addEventListener("click", () => hideOverlay("modal-editor"));
}

function handleImportFile(file) {
  const err = document.getElementById("import-err");
  if (err) err.style.display = "none";
  if (!file.name.endsWith(".json")) { 
    if (err) { err.textContent = "Bitte eine .json Datei wählen."; err.style.display = "block"; }
    return; 
  }
  const reader = new FileReader();
  reader.onload = e => {
    const ta = document.getElementById("import-ta");
    const dz = document.getElementById("import-dropzone");
    const dzn = document.getElementById("dz-filename");
    const dzht = document.getElementById("dz-hint-text");
    if (ta) ta.value = e.target.result;
    if (dz) dz.classList.add("has-file");
    if (dzn) dzn.textContent = file.name;
    if (dzht) dzht.style.display = "none";
  };
  reader.readAsText(file);
}

function setupImportExport() {
  document.getElementById("btn-export")?.addEventListener("click", () => {
    const json = JSON.stringify(DATA, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radplan_${dateKey(TOD_Y, TOD_M, TOD_D)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup erfolgreich erstellt");
    if (IS_MOBILE) hideOverlay("modal-mobile-menu");
  });

  document.getElementById("btn-import")?.addEventListener("click", () => {
    const ta = document.getElementById("import-ta");
    const err = document.getElementById("import-err");
    const dz = document.getElementById("import-dropzone");
    const dzn = document.getElementById("dz-filename");
    const dzht = document.getElementById("dz-hint-text");
    
    if (ta) ta.value = "";
    if (err) err.style.display = "none";
    if (dz) dz.classList.remove("has-file");
    if (dzn) dzn.textContent = "";
    if (dzht) dzht.style.display = "block";
    
    showOverlay("modal-import");
    if (IS_MOBILE) hideOverlay("modal-mobile-menu");
  });

  const dz = document.getElementById("import-dropzone");
  const fi = document.getElementById("import-file-input");
  
  if (dz && fi) {
    dz.addEventListener("click", () => fi.click());
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag-over"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
    dz.addEventListener("drop", e => {
      e.preventDefault(); 
      dz.classList.remove("drag-over");
      if (e.dataTransfer.files.length) handleImportFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener("change", () => {
      if (fi.files.length) handleImportFile(fi.files[0]);
      fi.value = "";
    });
  }

  document.getElementById("import-confirm")?.addEventListener("click", () => {
    const ta = document.getElementById("import-ta")?.value.trim();
    const err = document.getElementById("import-err");
    if (!ta) { 
      if (err) { err.textContent = "Bitte JSON eingeben oder Datei wählen."; err.style.display = "block"; }
      return; 
    }
    try {
      const parsed = JSON.parse(ta);
      if (typeof parsed !== "object") throw new Error("Format ungültig");
      DATA = parsed;
      if (typeof normalizeMonthDataShape === "function") {
        Object.values(DATA).forEach(md => normalizeMonthDataShape(md));
      }
      if (typeof saveToStorage === "function") saveToStorage();
      hideOverlay("modal-import");
      if (typeof render === "function") render();
      showToast("Daten erfolgreich importiert");
    } catch (e) {
      if (err) { err.textContent = "Ungültiges JSON-Format. Bitte prüfen."; err.style.display = "block"; }
    }
  });
}

function setupEmployeeModal() {
  document.getElementById("btn-employees")?.addEventListener("click", () => {
    state.employeeDashboard.filter = "ALL";
    state.employeeDashboard.selectedEmp = null;
    state.employeeDashboard.detailView = "months";
    if (typeof openEmployeeModal === "function") {
      openEmployeeModal();
    } else {
      showOverlay("modal-emps");
      if (typeof renderEmployeeDashboard === "function") renderEmployeeDashboard();
    }
    if (IS_MOBILE) hideOverlay("modal-mobile-menu");
  });
}

function setupDeptModal() {
  document.getElementById("btn-dept")?.addEventListener("click", () => {
    if (typeof openDeptOverview === "function") {
      openDeptOverview();
    } else {
      deptTab = "month";
      showOverlay("modal-dept");
      if (typeof renderDeptContent === "function") renderDeptContent();
    }
  });
  
  document.getElementById("dept-tab-month")?.addEventListener("click", () => { 
    deptTab = "month"; 
    if (typeof renderDeptContent === "function") renderDeptContent(); 
  });
  
  document.getElementById("dept-tab-year")?.addEventListener("click", () => { 
    deptTab = "year"; 
    if (typeof renderDeptContent === "function") renderDeptContent(); 
  });
}

function setupMobileNav() {
  document.getElementById("mnav-dept")?.addEventListener("click", () => document.getElementById("btn-dept")?.click());
  document.getElementById("mnav-menu")?.addEventListener("click", () => showOverlay("modal-mobile-menu"));
  
  document.getElementById("mbtn-today")?.addEventListener("click", () => {
    document.getElementById("btn-today")?.click();
    hideOverlay("modal-mobile-menu");
  });
  
  document.getElementById("mbtn-employees")?.addEventListener("click", () => document.getElementById("btn-employees")?.click());
  document.getElementById("mbtn-export")?.addEventListener("click", () => document.getElementById("btn-export")?.click());
  document.getElementById("mbtn-import")?.addEventListener("click", () => document.getElementById("btn-import")?.click());
}

window.confirmRemoveEmployee = function(emp, fromTable = true) {
  if(confirm(`Mitarbeiter ${emp} wirklich aus dem aktuellen Monat entfernen?`)) {
    if (typeof removeEmployee === "function") removeEmployee(state.year, state.month, emp);
    if (fromTable) {
      if (typeof render === "function") render();
    } else {
      if (typeof renderEmployeeDashboard === "function") renderEmployeeDashboard();
      if (typeof render === "function") render();
    }
  }
};