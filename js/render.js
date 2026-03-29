window.updateMonthLabel = function() {
  const lbl = document.getElementById("month-label");
  if (lbl) lbl.textContent = `${MONTHS[state.month]} ${state.year}`;
  const planLbl = document.getElementById("plan-bar-month");
  if (planLbl) planLbl.textContent = `${MONTHS[state.month]} ${state.year}`;
};

window.render = function() {
  updateMonthLabel();
  const planBar = document.getElementById("plan-bar");
  if (planBar) {
    if (planMode) {
      planBar.removeAttribute("hidden");
      planBar.style.display = "flex";
      document.body.classList.add("plan-mode-active");
      if (typeof updatePlanBarUI === "function") updatePlanBarUI();
    } else {
      planBar.setAttribute("hidden", "");
      planBar.style.display = "none";
      document.body.classList.remove("plan-mode-active");
    }
  }
  if (typeof syncPeriodControls === "function") syncPeriodControls();
  
  const todayBtn = document.getElementById("btn-today");
  if (todayBtn) todayBtn.classList.toggle("today-btn-active", state.year === TOD_Y && state.month === TOD_M);

  if (IS_MOBILE) {
    renderMobileView();
    if (typeof updateOpenModalLayouts === "function") updateOpenModalLayouts();
    return;
  }

  const { year: y, month: m } = state;
  const hols = getSaxonyHolidaysCached(y);
  const dim = daysInMonth(y, m);
  const md = getMonthData(y, m);

  renderStatsBar(y, m, dim, hols, md);
  renderThead(y, m, dim, hols);
  renderTbody(y, m, dim, hols, md);
  renderTfoot(y, m, dim, md);

  if (typeof updateOpenModalLayouts === "function") updateOpenModalLayouts();
};

window.renderStatsBar = function(y, m, dim, hols, md) {
  const bar = document.getElementById("stats-bar");
  if (!bar) return;
  bar.innerHTML = "";

  if (!md.employees.length) {
    bar.innerHTML = `<span id="stats-empty">Keine Daten</span>`;
    return;
  }

  const empCount = document.createElement("div");
  empCount.className = "stat-item stat-item-emp";
  empCount.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="stat-count">${md.employees.length}</span><span class="stat-label-sm">MA</span>`;
  bar.appendChild(empCount);

  const totalDays = dim * md.employees.length;
  let absenceCount = 0;
  const absenceCodes = ["U", "K", "KK", "WB", "FZA", "SU", "ZU", "§15c"];
  
  for (let d = 1; d <= dim; d++) {
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) {
        const codes = cell.assignment.split("/").map(x => x.trim());
        if (codes.some(c => absenceCodes.includes(c))) {
          absenceCount++;
        }
      }
    });
  }

  const availableDays = totalDays - absenceCount;
  const kapPct = totalDays > 0 ? Math.round((availableDays / totalDays) * 100) : 0;

  const kapDiv = document.createElement("div");
  kapDiv.className = "stat-item";
  kapDiv.innerHTML = `<span class="stat-label-sm">TEAM KAPAZITÄT</span><span class="stat-count">${kapPct}%</span><span class="stat-label-sm" style="margin-left:4px;text-transform:none">(${availableDays} von ${totalDays})</span>`;
  bar.appendChild(kapDiv);

  const totals = {};
  [...WORKPLACES.map(w => w.code), ...STATUSES.map(s => s.code), "D", "HG"].forEach(c => { totals[c] = 0; });
  for (let d = 1; d <= dim; d++) {
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).forEach(c => {
          if (c in totals) totals[c]++;
        });
      }
      if (cell.duty && cell.duty in totals) totals[cell.duty]++;
    });
  }

  const focusCodes = ["MR", "CT", "US", "MA", "KUS", "W"];
  focusCodes.forEach(code => {
    const v = totals[code];
    if (!v) return;
    const meta = CODE_MAP[code];
    const div = document.createElement("div");
    div.className = "stat-item";
    div.innerHTML = `<span class="stat-code" style="background:${meta.bg};color:${meta.fg}">${code}</span><span class="stat-count">${v}</span>`;
    bar.appendChild(div);
  });

  const order = ["D", "HG", "U", "K", "F", "WB", "FZA", "ZU", "SU", "KK", "§15c"];
  order.forEach(code => {
    const v = totals[code];
    if (!v) return;
    const meta = CODE_MAP[code];
    const isD = code === "D", isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta?.bg || "#E2E8F0";
    const fg = isD || isHG ? "#fff" : meta?.fg || "#374151";
    const div = document.createElement("div");
    div.className = "stat-item";
    div.innerHTML = `<span class="stat-code" style="background:${bg};color:${fg}">${code}</span><span class="stat-count">${v}</span>`;
    bar.appendChild(div);
  });
};

window.renderThead = function(y, m, dim, hols) {
  const thead = document.getElementById("plan-thead");
  if (!thead) return;
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  const thC = document.createElement("th");
  thC.className = "th-corner";
  thC.innerHTML = '<div class="th-corner-inner">Mitarbeitende</div>';
  tr.appendChild(thC);
  
  let prevKW = -1;
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const we = isWeekend(y, m, d);
    const isT = isTodayCol(y, m, d);
    const fri = isFriday(y, m, d);
    const kw = isoWeekNumber(y, m, d);
    const showKW = (wd === 1 || (d === 1 && wd !== 1)) && kw !== prevKW;
    if (showKW) prevKW = kw;
    const hn = hols[dateKey(y, m, d)] || "";
    
    const th = document.createElement("th");
    th.className = "th-day " + (hol ? "hol" : we ? "we" : "wd") + (isT ? " today" : "") + (fri ? " is-fri" : "");
    th.innerHTML = `<div class="th-day-inner"><span class="d-kw">${showKW ? "KW" + kw : ""}</span><span class="d-num">${d}</span><span class="d-dow">${DOW_ABBR[wd]}</span>${hn ? `<span class="d-hol">${hn}</span>` : ""}</div>`;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
};

window.renderTbody = function(y, m, dim, hols, md) {
  const tbody = document.getElementById("plan-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!md.employees.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dim + 1;
    td.className = "td-empty";
    td.innerHTML = `<div class="empty-inner"><p class="empty-title">Keine Mitarbeitenden</p></div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const sortedEmps = [...md.employees].sort((a, b) => {
    const pA = getEmpMeta(a).position;
    const pB = getEmpMeta(b).position;
    const order = { "CA": 1, "LOA": 2, "OA": 3, "OÄ": 3, "FA": 4, "FÄ": 4, "AA": 5, "AÄ": 5 };
    const wA = order[pA] || 99;
    const wB = order[pB] || 99;
    if (wA !== wB) return wA - wB;
    return a.localeCompare(b, "de");
  });

  sortedEmps.forEach(emp => {
    const meta = getEmpMeta(emp);
    const pc = posColor(meta.position);
    const tr = document.createElement("tr");
    
    const tdN = document.createElement("td");
    tdN.className = "td-name";
    tdN.style.borderLeft = `3px solid ${pc.border}`;
    tdN.style.paddingLeft = "11px";
    tdN.setAttribute("role", "button");
    tdN.setAttribute("tabindex", "0");
    tdN.innerHTML = `<span class="emp-label">${emp}</span>` + (meta.position !== "—" ? `<span class="emp-pos-tag" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>` : "") + `<span class="emp-profile-icon"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span><button class="emp-del"><svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l7 7M8 1L1 8"/></svg></button>`;
    
    tdN.querySelector(".emp-del").addEventListener("click", e => {
      e.stopPropagation();
      if (typeof confirmRemoveEmployee === "function") confirmRemoveEmployee(emp);
    });
    tdN.addEventListener("click", () => openProfileModal(emp));
    tdN.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfileModal(emp); }
    });
    tr.appendChild(tdN);

    for (let d = 1; d <= dim; d++) {
      const cell = md.assignments?.[emp]?.[d] || {};
      const we = isWeekend(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const isT = isTodayCol(y, m, d);
      const fri = isFriday(y, m, d);
      const emptyWd = !we && !hol && !cell.assignment && !cell.duty;
      const isAutoFRest = cell.assignment === "F" && (we || hol);
      const { bg, fg } = cellColor(cell.assignment);
      
      const tdEl = document.createElement("td");
      tdEl.className = "td-cell" + (hol ? " hol" : we ? " we" : "") + (isT ? " today" : "") + (fri ? " is-fri" : "") + (emptyWd ? " empty-wd" : "") + (isAutoFRest ? " auto-f-rest" : "");
      tdEl.tabIndex = 0;
      if (cell.assignment && !isAutoFRest) tdEl.style.backgroundColor = bg;
      
      let wishHtml = "";
      if (planMode && planData && planData.wishes && planData.wishes[emp] && planData.wishes[emp][d]) {
         const wCode = planData.wishes[emp][d];
         const wMeta = WISH_MAP[wCode];
         if (wMeta) wishHtml = `<span class="cell-wish wish-${wCode}">${wMeta.icon}</span>`;
      }
      
      tdEl.innerHTML = `<div class="cell-inner"><span class="cell-assign" style="color:${isAutoFRest ? "rgba(71,85,105,0.35)" : fg}">${cell.assignment || ""}</span>${cell.duty ? `<span class="cell-duty badge-${cell.duty}">${cell.duty}</span>` : ""}${wishHtml}</div>`;
      tdEl.addEventListener("click", () => openEditor(emp, d));
      tdEl.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEditor(emp, d); }
      });
      tr.appendChild(tdEl);
    }
    tbody.appendChild(tr);
  });

  if (isRbnMonthVisible(y, m)) {
    const tr = document.createElement("tr");
    tr.className = "tr-rbn";
    const tdN = document.createElement("td");
    tdN.className = "td-name td-name-rbn";
    tdN.style.borderLeft = "3px solid #0EA5E9";
    tdN.style.paddingLeft = "11px";
    tdN.innerHTML = `<span class="emp-label">${RBN_ROW_LABEL}</span>`;
    tdN.setAttribute("role", "button");
    tdN.setAttribute("tabindex", "0");
    tr.appendChild(tdN);
    
    for (let d = 1; d <= dim; d++) {
      const we = isWeekend(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const isT = isTodayCol(y, m, d);
      const fri = isFriday(y, m, d);
      const rbnValue = getRbnValue(y, m, d);
      
      const tdEl = document.createElement("td");
      tdEl.className = "td-cell td-cell-rbn" + (hol ? " hol" : we ? " we" : "") + (isT ? " today" : "") + (fri ? " is-fri" : "");
      tdEl.tabIndex = 0;
      tdEl.innerHTML = `<div class="cell-inner"><span class="cell-assign cell-assign-rbn">${formatRbnDisplay(rbnValue)}</span></div>`;
      tdEl.addEventListener("click", () => openEditor(RBN_ROW_KEY, d));
      tdEl.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEditor(RBN_ROW_KEY, d); }
      });
      tr.appendChild(tdEl);
    }
    tbody.appendChild(tr);
  }
};

window.renderTfoot = function(y, m, dim, md) {
  const tfoot = document.getElementById("plan-tfoot");
  if (!tfoot) return;
  tfoot.innerHTML = "";
  if (!md.employees.length) return;
  
  const hols = getSaxonyHolidaysCached(y);
  const rows = [
    { code: "MR", label: "MRT", meta: CODE_MAP["MR"] },
    { code: "CT", label: "CT", meta: CODE_MAP["CT"] },
    { code: "D", label: "Bereitschaftsdienst", meta: null },
    { code: "HG", label: "Hintergrunddienst", meta: null }
  ];
  
  rows.forEach(({ code, label, meta }, rowIdx) => {
    const isD = code === "D", isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta.bg;
    const fg = isD || isHG ? "#fff" : meta.fg;
    
    const tr = document.createElement("tr");
    tr.className = "tr-stat" + (rowIdx === 0 ? " tr-stat-first" : "");
    const tdL = document.createElement("td");
    tdL.className = "td-stat-lbl";
    tdL.innerHTML = `<span class="stat-lbl-badge" style="background:${bg};color:${fg}">${code}</span><span class="stat-lbl-text">${label}</span>`;
    tr.appendChild(tdL);
    
    for (let d = 1; d <= dim; d++) {
      const val = dayCodeCount(y, m, d, code);
      const we = isWeekend(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const fri = isFriday(y, m, d);
      const isT = isTodayCol(y, m, d);
      
      const td = document.createElement("td");
      let cls = "td-stat-val";
      if (we || hol) cls += " dim";
      else if ((isD || isHG) && val > 1) cls += " warn";
      else if (val > 0) cls += " nz";
      if (isT) cls += " today-col";
      if (fri) cls += " is-fri";
      
      td.className = cls;
      td.textContent = val > 0 ? val : "";
      tr.appendChild(td);
    }
    tfoot.appendChild(tr);
  });
};

window.renderMobileView = function() {
  const { year: y, month: m } = state;
  renderMobileSummary(y, m);
  renderMobileDayList(y, m);
};

window.renderMobileSummary = function(y, m) {
  const summaryEl = document.getElementById("mobile-month-summary");
  if (!summaryEl) return;
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  const totals = {};
  [...WORKPLACES.map(w => w.code), ...STATUSES.map(s => s.code), "D", "HG"].forEach(c => { totals[c] = 0; });
  
  for (let d = 1; d <= dim; d++) {
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) cell.assignment.split("/").map(x => x.trim()).forEach(c => { if (c in totals) totals[c]++; });
      if (cell.duty && cell.duty in totals) totals[cell.duty]++;
    });
  }
  
  const order = ["D", "HG", "U", "K", "F", "MR", "CT", "US", "WB", "FZA", "ZU", "SU", "KK", "§15c", "AN", "MA", "KUS", "W", "T"];
  let html = `<div class="mms-item mms-item-emp" onclick="if(typeof openEmployeeModal==='function') openEmployeeModal()"><span class="mms-val">${md.employees.length}</span><span class="mms-code">MA</span></div>`;
  order.forEach(code => {
    const v = totals[code];
    if (!v) return;
    const meta = CODE_MAP[code];
    const isD = code === "D", isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta?.bg || "#E2E8F0";
    const fg = isD || isHG ? "#fff" : meta?.fg || "#374151";
    html += `<div class="mms-item"><span class="mms-code" style="background:${bg};color:${fg};padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;font-family:var(--font-mono)">${code}</span><span class="mms-val">${v}</span></div>`;
  });
  summaryEl.innerHTML = html;
};

window.renderMobileDayList = function(y, m) {
  const listEl = document.getElementById("mobile-day-list");
  if (!listEl) return;
  const hols = getSaxonyHolidaysCached(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  listEl.innerHTML = "";
  
  let prevKW = -1;
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const holName = hols[dateKey(y, m, d)] || "";
    const isToday = isTodayCol(y, m, d);
    const kw = isoWeekNumber(y, m, d);
    
    if (wd === 1 && kw !== prevKW) {
      prevKW = kw;
      const sep = document.createElement("div");
      sep.className = "mobile-week-sep";
      sep.textContent = `KW ${kw}`;
      listEl.appendChild(sep);
    }
    
    const bdHolder = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "D") || null;
    const hgHolder = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "HG") || null;
    const allAssigns = [];
    
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).filter(Boolean).forEach(code => {
          if (!allAssigns.find(a => a.code === code)) {
            const meta = CODE_MAP[code];
            if (meta) allAssigns.push({ code, bg: meta.bg, fg: meta.fg });
          }
        });
      }
    });
    
    const card = document.createElement("div");
    let cardCls = "mobile-day-card";
    if (hol) cardCls += " mdc-hol";
    else if (wd === 0 || wd === 6) cardCls += " mdc-we";
    if (isToday) cardCls += " mdc-today";
    card.className = cardCls;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    
    let dutyHtml = "";
    if (bdHolder) {
      const shortName = bdHolder.split(" ").pop();
      dutyHtml += `<span class="mdc-duty-badge mdc-d"><span class="mdc-duty-letter">D</span><span class="mdc-duty-name">${shortName}</span></span>`;
    }
    if (hgHolder) {
      const shortName = hgHolder.split(" ").pop();
      dutyHtml += `<span class="mdc-duty-badge mdc-hg"><span class="mdc-duty-letter">H</span><span class="mdc-duty-name">${shortName}</span></span>`;
    }
    if (!bdHolder && !hgHolder) dutyHtml = `<span class="mdc-empty-duty">kein Dienst</span>`;
    
    let assignHtml = "";
    const shown = allAssigns.slice(0, 5);
    shown.forEach(a => {
      assignHtml += `<span class="mdc-assign-chip" style="background:${a.bg};color:${a.fg}">${a.code}</span>`;
    });
    if (allAssigns.length > 5) assignHtml += `<span class="mdc-assign-more">+${allAssigns.length - 5}</span>`;
    
    const planWishIndicator = planMode ? `<span class="mdc-plan-badge"></span>` : "";
    
    card.innerHTML = `
      <div class="mdc-date">
        <span class="mdc-day-num">${d}</span>
        <span class="mdc-day-dow">${DOW_ABBR[wd]}</span>
        ${d === 1 || wd === 1 ? `<span class="mdc-day-kw">KW${kw}</span>` : ""}
      </div>
      <div class="mdc-divider"></div>
      <div class="mdc-content">
        ${hol ? `<div class="mdc-hol-label">${holName}</div>` : ""}
        <div class="mdc-duties">${dutyHtml}</div>
        ${allAssigns.length ? `<div class="mdc-assigns">${assignHtml}</div>` : ""}
      </div>
      <div class="mdc-arrow"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      ${planWishIndicator}
    `;
    card.addEventListener("click", () => openMobileDayModal(y, m, d));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMobileDayModal(y, m, d); } });
    listEl.appendChild(card);
    
    if (isToday) setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }
};

window.openMobileDayModal = function(y, m, d) {
  const hols = getSaxonyHolidaysCached(y);
  const md = getMonthData(y, m);
  const wd = weekday(y, m, d);
  const hol = isHoliday(y, m, d, hols);
  const holName = hols[dateKey(y, m, d)] || "";
  const isToday = isTodayCol(y, m, d);
  
  const titleEl = document.getElementById("mday-title");
  if (titleEl) {
    titleEl.textContent = `${DOW_LONG[wd]}, ${d}. ${MONTHS[m]} ${y}${holName ? " · " + holName : ""}`;
    if (isToday) titleEl.style.color = "#67D4FF";
    else if (hol) titleEl.style.color = "#FCD34D";
    else titleEl.style.color = "";
  }
  
  const dutyBadgesEl = document.getElementById("mday-duty-badges");
  if (dutyBadgesEl) {
    let html = "";
    const bdH = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "D");
    const hgH = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "HG");
    if (bdH) html += `<span class="mday-duty-pill d"><span class="mday-duty-pill-letter">D</span>${bdH}</span>`;
    if (hgH) html += `<span class="mday-duty-pill hg"><span class="mday-duty-pill-letter">H</span>${hgH}</span>`;
    
    const rbnVal = getRbnValue(y, m, d);
    if (rbnVal && isRbnMonthVisible(y, m)) html += `<span class="mday-duty-pill" style="background:#E0F2FE;color:#0369A1;border:1px solid #BAE6FD"><span class="mday-duty-pill-letter" style="background:#0284C7;font-size:7px">RN</span>${formatRbnDisplay(rbnVal)}</span>`;
    
    dutyBadgesEl.innerHTML = html;
  }
  
  const bodyEl = document.getElementById("mday-body");
  if (!bodyEl) { if(typeof showOverlay === "function") showOverlay("modal-mobile-day"); return; }
  
  let bodyHtml = "";
  
  if (isRbnMonthVisible(y, m)) {
    const rbnVal = getRbnValue(y, m, d);
    bodyHtml += `<div class="mday-section-hd">Externe Dienste</div>`;
    bodyHtml += `
      <div class="mday-emp-row mday-editable" data-emp="${RBN_ROW_KEY}">
        <span class="mday-pos-dot" style="background:#0284C7"></span>
        <div class="mday-emp-info">
          <span class="mday-emp-name" style="color:#0369A1">${RBN_ROW_LABEL}</span>
          <span class="mday-emp-sub">Neuroradiologie</span>
        </div>
        <div class="mday-badges">
          ${rbnVal ? `<span class="mday-assign-badge" style="background:#E0F2FE;color:#0369A1;border:1px solid #BAE6FD">${formatRbnDisplay(rbnVal)}</span>` : `<span class="mday-empty-assign">Keine Zuweisung</span>`}
        </div>
        <span class="mday-edit-icon"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
      </div>
    `;
  }
  
  const faList = md.employees.filter(e => isFacharzt(e));
  const aaList = md.employees.filter(e => isAssistenzarzt(e));
  const sections = [
    { label: "Fachärzte", emps: faList },
    { label: "Assistenzärzte", emps: aaList }
  ].filter(s => s.emps.length > 0);
  
  sections.forEach(sec => {
    bodyHtml += `<div class="mday-section-hd">${sec.label}</div>`;
    sec.emps.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      const meta = getEmpMeta(emp);
      const pc = posColor(meta.position);
      const isEditable = planMode || !hol;
      
      let badgesHtml = "";
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).filter(Boolean).forEach(code => {
          const cm = CODE_MAP[code];
          if (cm) badgesHtml += `<span class="mday-assign-badge" style="background:${cm.bg};color:${cm.fg}">${code}</span>`;
        });
      }
      if (cell.duty) badgesHtml += `<span class="mday-duty-tag ${cell.duty.toLowerCase()}">${cell.duty}</span>`;
      
      if (planMode && planData && planData.wishes && planData.wishes[emp]?.[d]) {
        const w = planData.wishes[emp][d];
        const wMap = { BD_WISH: "bd", HG_WISH: "hg", NO_DUTY: "no" };
        const wLabel = { BD_WISH: "D-Wunsch", HG_WISH: "HG-Wunsch", NO_DUTY: "Kein D" };
        badgesHtml += `<span class="mday-wish-tag ${wMap[w] || ""}">${wLabel[w] || w}</span>`;
      }
      
      if (!cell.assignment && !cell.duty) badgesHtml = `<span class="mday-empty-assign">—</span>`;
      
      bodyHtml += `<div class="mday-emp-row${isEditable ? " mday-editable" : ""}" data-emp="${emp}">
        <span class="mday-pos-dot" style="background:${pc.border}"></span>
        <div class="mday-emp-info">
          <span class="mday-emp-name">${emp}</span>
          <span class="mday-emp-sub">${meta.posLabel !== "—" ? meta.posLabel : meta.position}</span>
        </div>
        <div class="mday-badges">${badgesHtml}</div>
        ${isEditable ? `<span class="mday-edit-icon"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>` : ""}
      </div>`;
    });
  });
  
  bodyEl.innerHTML = bodyHtml;
  bodyEl.querySelectorAll(".mday-editable[data-emp]").forEach(row => {
    row.addEventListener("click", () => {
      const emp = row.dataset.emp;
      if (typeof hideOverlay === "function") hideOverlay("modal-mobile-day");
      setTimeout(() => openEditor(emp, d), 200);
    });
  });
  
  if (typeof showOverlay === "function") showOverlay("modal-mobile-day");
};

window.openEditor = function(emp, day) {
  const { year: y, month: m } = state;
  const isRbnRow = emp === RBN_ROW_KEY;
  const cell = isRbnRow ? { assignment: getRbnValue(y, m, day) || null, duty: null } : getCell(y, m, emp, day);
  const hols = getSaxonyHolidaysCached(y);
  
  state.edit = { emp, day, isRbnRow };
  let wp = [], st = null;
  
  if (isRbnRow && cell.assignment) {
    wp = [cell.assignment];
  } else if (cell.assignment) {
    cell.assignment.split("/").map(x => x.trim()).forEach(p => {
      if (WORKPLACES.find(w => w.code === p)) wp.push(p);
      else if (STATUSES.find(s => s.code === p)) st = p;
    });
  }
  
  state.ed = { wp: [...wp], st, duty: cell.duty || null, wish: null };
  if (planMode && planData && planData.wishes && planData.wishes[emp] && planData.wishes[emp][day]) {
      state.ed.wish = planData.wishes[emp][day];
  }
  
  const wd = weekday(y, m, day);
  const hol = isHoliday(y, m, day, hols);
  const we = isWeekend(y, m, day);
  const holNm = hols[dateKey(y, m, day)] || "";
  
  document.getElementById("ed-title").textContent = isRbnRow ? RBN_ROW_LABEL : getEmpMeta(emp).fullName;
  document.getElementById("ed-sub").textContent = `${DOW_LONG[wd]}, ${day}. ${MONTHS[m]} ${y}${holNm ? " · " + holNm : ""}`;
  
  const dtlEl = document.getElementById("ed-day-label");
  if (hol) dtlEl.innerHTML = `<span class="day-type-label dtl-hol">Feiertag${holNm ? ": " + holNm : ""}</span>`;
  else if (we) dtlEl.innerHTML = `<span class="day-type-label dtl-we">Wochenende</span>`;
  else dtlEl.innerHTML = "";
  
  const modalHd = document.getElementById("ed-modal-hd");
  const planBadge = document.getElementById("ed-plan-badge");
  const modalEl = document.getElementById("modal-editor");
  
  if (planMode) {
    modalHd?.classList.add("plan-mode-hd");
    modalEl?.classList.add("plan-mode-editor");
    if (planBadge) planBadge.style.display = "inline-flex";
  } else {
    modalHd?.classList.remove("plan-mode-hd");
    modalEl?.classList.remove("plan-mode-editor");
    if (planBadge) planBadge.style.display = "none";
  }
  
  refreshEditorChips();
  if (typeof showOverlay === "function") showOverlay("modal-editor");
};

window.refreshEditorChips = function() {
  const { year: y, month: m } = state;
  const { wp, st, duty } = state.ed;
  const { emp, day, isRbnRow } = state.edit;
  
  const wpLabel = document.getElementById("ed-wp-label");
  const wpHint = document.getElementById("ed-wp-hint");
  const stSection = document.getElementById("ed-st-section");
  const dutySection = document.getElementById("ed-duty-section");
  const dutyWarn = document.getElementById("ed-duty-warn");
  
  if (isRbnRow) {
    if (wpLabel) wpLabel.textContent = "RD Neurorad";
    if (wpHint) wpHint.textContent = "— manuelle Namensauswahl, wird nie durch Auto-Planung verändert";
    if (stSection) stSection.style.display = "none";
    if (dutySection) dutySection.style.display = "none";
    if (dutyWarn) dutyWarn.style.display = "none";
  } else {
    if (wpLabel) wpLabel.textContent = "Arbeitsplatz";
    if (wpHint) wpHint.textContent = "— Mehrfachauswahl möglich, z. B. MR/CT";
    if (stSection) stSection.style.display = "";
    if (dutySection) dutySection.style.display = "";
  }
  
  const wpC = document.getElementById("ed-wp");
  wpC.innerHTML = "";
  const rbnOptions = getRbnOptionsForDate(y, m);
  if (isRbnRow && state.ed.wp[0] && !rbnOptions.includes(state.ed.wp[0])) {
    rbnOptions.unshift(state.ed.wp[0]);
  }
  
  const wpOptions = isRbnRow ? rbnOptions.map(label => ({ code: label, label, bg: "#E0F2FE", fg: "#0C4A6E" })) : WORKPLACES;
  
  wpOptions.forEach((w, idx) => {
    const on = wp.includes(w.code);
    const dimC = isRbnRow ? false : !!st;
    const chip = document.createElement("div");
    chip.className = `chip-wp${on ? " on" : ""}${dimC ? " dim" : ""}`;
    chip.style.cssText = `background:${on ? w.fg : w.bg};color:${on ? "#fff" : w.fg};position:relative`;
    
    if (isRbnRow) {
      chip.style.minWidth = "190px";
      chip.style.alignItems = "flex-start";
      chip.style.textAlign = "left";
      chip.style.lineHeight = "1.35";
      chip.style.fontFamily = "var(--font-sans)";
      chip.style.fontSize = "12px";
      chip.style.fontWeight = "700";
      chip.innerHTML = `${w.label}`;
    } else {
      const kbdBadge = `<span style="position:absolute;top:2px;right:2px;font-family:var(--font-mono);font-size:7px;font-weight:700;line-height:1;opacity:${dimC ? 0.3 : 0.55};background:rgba(0,0,0,0.12);color:inherit;padding:1px 3px;border-radius:2px;pointer-events:none">${idx + 1}</span>`;
      chip.innerHTML = `${kbdBadge}${w.code}<span class="chip-sub">${w.label}</span>`;
    }
    
    if (!dimC) {
      chip.addEventListener("click", () => {
        const i = state.ed.wp.indexOf(w.code);
        if (i >= 0) state.ed.wp.splice(i, 1);
        else if (isRbnRow) state.ed.wp = [w.code];
        else state.ed.wp.push(w.code);
        refreshEditorChips();
      });
    }
    wpC.appendChild(chip);
  });
  
  let kbdHint = document.getElementById("ed-wp-kbd-hint");
  if (!kbdHint) {
    kbdHint = document.createElement("div");
    kbdHint.id = "ed-wp-kbd-hint";
    kbdHint.style.cssText = "margin-top:6px;display:flex;align-items:center;gap:5px;font-size:9.5px;color:var(--gray-400);";
    kbdHint.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;opacity:.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12"/></svg><span>Ziffern 1–8 für Arbeitsplatz · D für Bereitschaft · H für Hintergrund · S oder ↵ zum Speichern</span>`;
    wpC.parentNode.insertBefore(kbdHint, wpC.nextSibling);
  }
  kbdHint.style.display = !isRbnRow && !IS_MOBILE ? "flex" : "none";
  
  if (isRbnRow) {
    document.getElementById("ed-st").innerHTML = "";
    document.getElementById("ed-duty").innerHTML = "";
    const pvRbn = state.ed.wp[0] || "";
    document.getElementById("ed-preview-val").textContent = pvRbn || "—";
    document.getElementById("ed-preview-duties").innerHTML = "";
    const wishC = document.getElementById("ed-wish");
    const wishHd = document.getElementById("ed-wish-hd");
    if (wishC) wishC.style.display = "none";
    if (wishHd) wishHd.style.display = "none";
    return;
  }
  
  const stC = document.getElementById("ed-st");
  stC.innerHTML = "";
  STATUSES.forEach(s => {
    const on = st === s.code;
    const dimC = wp.length > 0 && !on;
    const chip = document.createElement("div");
    chip.className = `chip-st${on ? " on" : ""}${dimC ? " dim" : ""}`;
    chip.style.cssText = `background:${on ? s.fg : s.bg};color:${on ? "#fff" : s.fg}`;
    chip.innerHTML = `${s.code}<span class="chip-sub">${s.label}</span>`;
    if (!dimC || on) {
      chip.addEventListener("click", () => {
        state.ed.st = state.ed.st === s.code ? null : s.code;
        if (state.ed.st) state.ed.wp = [];
        refreshEditorChips();
      });
    }
    stC.appendChild(chip);
  });
  
  const dtC = document.getElementById("ed-duty");
  dtC.innerHTML = "";
  const warnParts = [];
  
  ["D", "HG"].forEach(dc => {
    const on = duty === dc;
    const owner = dutyOwner(y, m, day, dc);
    const taken = owner && owner !== emp;
    const chip = document.createElement("div");
    chip.className = `chip-duty ${on ? "duty-" + dc + "-on" : "duty-" + dc + "-off"}${taken ? " blocked" : ""}`;
    chip.innerHTML = `${dc}<span class="duty-sub">${dc === "D" ? "Bereitschaftsdienst" : "Hintergrunddienst"}</span>`;
    if (!taken) {
      chip.addEventListener("click", () => {
        state.ed.duty = state.ed.duty === dc ? null : dc;
        refreshEditorChips();
      });
    } else {
      warnParts.push(`${dc} bereits vergeben: ${owner}`);
    }
    dtC.appendChild(chip);
  });
  
  const warnEl = document.getElementById("ed-duty-warn");
  const nextDay = nextCalendarDay(y, m, day);
  if (nextDay.y !== undefined) {
    const nextCell = getCell(nextDay.y, nextDay.m, emp, nextDay.d);
    if (nextCell.assignment) {
      const codes = nextCell.assignment.split("/").map(x => x.trim());
      if (codes.some(c => VACATION_CODES.includes(c))) warnParts.push(`⚠ Folgetag (${nextDay.d}.) ist Urlaub`);
    }
  }
  
  if (warnParts.length) {
    warnEl.style.display = "block";
    warnEl.textContent = warnParts.join(" · ");
  } else {
    warnEl.style.display = "none";
  }
  
  renderEditorWishes();
  updateEditorPreview();
};

window.renderEditorWishes = function() {
  const wishC = document.getElementById("ed-wish");
  const wishHd = document.getElementById("ed-wish-hd");
  if (!wishC || !wishHd) return;
  
  if (planMode) {
    wishC.style.display = "flex";
    wishHd.style.display = "flex";
    wishC.innerHTML = WISH_TYPES.map(wt => {
      const on = state.ed.wish === wt.code;
      return `<div class="chip-wish${on ? " wish-on" : ""}" data-val="${wt.code}" style="background:${on ? wt.fg : wt.bg};color:${on ? "#fff" : wt.fg};border-color:${on ? wt.border : wt.border}">
        <span class="wish-icon">${wt.icon}</span>${wt.label}
      </div>`;
    }).join("");
    wishC.querySelectorAll(".chip-wish").forEach(el => {
      el.addEventListener("click", () => {
        const v = el.getAttribute("data-val");
        state.ed.wish = state.ed.wish === v ? null : v;
        renderEditorWishes();
        updateEditorPreview();
      });
    });
  } else {
    wishC.style.display = "none";
    wishHd.style.display = "none";
  }
};

window.updateEditorPreview = function() {
  const pv = document.getElementById("ed-preview-val");
  const pd = document.getElementById("ed-preview-duties");
  if (state.edit.isRbnRow) {
    if (state.ed.wp.length > 0) {
      pv.textContent = formatRbnDisplay(state.ed.wp[0]);
      pv.style.color = "#0369A1";
    } else {
      pv.textContent = "—";
      pv.style.color = "var(--white)";
    }
    pd.innerHTML = "";
    return;
  }
  
  let a = "—", c = "var(--white)";
  if (state.ed.st) {
    a = state.ed.st;
    c = STATUSES.find(x => x.code === a)?.fg || c;
  } else if (state.ed.wp.length > 0) {
    a = state.ed.wp.join(" / ");
    c = WORKPLACES.find(x => x.code === state.ed.wp[0])?.fg || c;
  }
  pv.textContent = a;
  pv.style.color = c;
  
  let dHtml = "";
  if (state.ed.duty === "D") dHtml += `<span class="preview-duty-badge" style="background:var(--red);color:#fff">Bereitschaftsdienst</span>`;
  if (state.ed.duty === "HG") dHtml += `<span class="preview-duty-badge" style="background:var(--blue-d);color:#fff">Hintergrunddienst</span>`;
  
  if (planMode && state.ed.wish) {
    const wMeta = WISH_MAP[state.ed.wish];
    if (wMeta) dHtml += `<span class="preview-duty-badge" style="background:${wMeta.bg};color:${wMeta.fg};border:1px solid ${wMeta.border}">${wMeta.icon} ${wMeta.label}</span>`;
  }
  
  pd.innerHTML = dHtml;
};

window.openProfileModal = function(empName) {
  const { year: y, month: m } = state;
  const meta = getEmpMeta(empName);
  const pc = posColor(meta.position);
  const ini = empInitials(empName);
  const hols = getSaxonyHolidaysCached(y);
  const s = buildProfileStats(y, m, empName);
  const ys = buildYearlyStats(empName, y);
  
  const avatarEl = document.getElementById("pm-avatar");
  if (avatarEl) {
    avatarEl.textContent = ini;
    avatarEl.style.background = `linear-gradient(135deg,${pc.border},${pc.fg})`;
  }
  
  state.profileEmp = empName;
  const nameEl = document.getElementById("pm-name");
  if (nameEl) nameEl.textContent = meta.fullName !== empName ? meta.fullName : empName;
  
  const subEl = document.getElementById("pm-sub");
  if (subEl) subEl.textContent = `${MONTHS[m]} ${y} · ${s.totalWorkdays} Werktage`;
  
  const metaRow = document.getElementById("pm-meta-row");
  if (metaRow) {
    let metaHtml = "";
    if (meta.position !== "—") metaHtml += `<span class="pm-pos-pill" style="background:${pc.bg};color:${pc.fg}">${meta.position} · ${meta.posLabel}</span>`;
    if (meta.area) metaHtml += `<span class="pm-meta-chip pm-chip-area">${meta.area}</span>`;
    if (meta.deputy) metaHtml += `<span class="pm-meta-chip pm-chip-deputy">V: ${meta.deputy}</span>`;
    metaRow.innerHTML = metaHtml;
  }
  
  const kpiEl = document.getElementById("pm-kpi");
  if (kpiEl) {
    const vac = VACATION_CODES.reduce((sum, c) => sum + (s.stCounts[c] || 0), 0);
    const sick = (s.stCounts["K"] || 0) + (s.stCounts["KK"] || 0);
    const fza = s.stCounts["FZA"] || 0;
    const covPct = s.totalWorkdays > 0 ? Math.round((s.coveredWorkdays / s.totalWorkdays) * 100) : 0;
    const kpis = [
      { label: "Aktiv", val: s.aktivDays, sub: `${s.coveredWorkdays} belegt`, color: "#1D4ED8", pct: covPct },
      { label: "Nicht geplant", val: s.uncovered, sub: "offen", color: s.uncovered > 0 ? "#F97316" : "#15803D", pct: 0 },
      { label: "D-Dienste", val: s.dutyD.length, sub: `${s.dutyD.map(d => d + ".").join(" ") || "—"}`, color: "#EF4444", pct: 0 },
      { label: "HG-Dienste", val: s.dutyHG.length, sub: `${s.dutyHG.map(d => d + ".").join(" ") || "—"}`, color: "#0EA5E9", pct: 0 },
      { label: "Urlaub", val: vac, sub: "U/ZU/SU/§15c", color: "#7C3AED", pct: 0 },
      { label: "Krank", val: sick, sub: "K / KK", color: "#DC2626", pct: 0 },
      { label: "FZA", val: fza, sub: "Freizeitausgleich", color: "#3730A3", pct: 0 },
      { label: "Frei", val: s.frei, sub: "F-Tage", color: "#475569", pct: 0 },
    ];
    kpiEl.innerHTML = kpis.map(k => `<div class="kpi-card" style="border-top-color:${k.color}"><div class="kpi-head"><span class="kpi-label">${k.label}</span><span class="kpi-icon"><svg width="12" height="12" fill="none" stroke="${k.color}" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span></div><div class="kpi-value" style="color:${k.color}">${k.val}</div><div class="kpi-sub">${k.sub}</div>${k.pct > 0 ? `<div class="kpi-bar-wrap"><div class="kpi-bar-fill" style="width:${k.pct}%;background:${k.color}"></div></div>` : ""}</div>`).join("");
  }
  
  const wpChartEl = document.getElementById("pm-wp-chart");
  const wpHdEl = document.getElementById("pm-wp-hd");
  if (wpChartEl) {
    const wpEntries = Object.entries(s.wpCounts).sort((a, b) => b[1] - a[1]);
    if (wpEntries.length) {
      if (wpHdEl) wpHdEl.style.display = "";
      const maxV = wpEntries[0][1];
      wpChartEl.innerHTML = wpEntries.map(([code, cnt]) => {
        const meta2 = CODE_MAP[code];
        return `<div class="dist-row"><span class="dist-code" style="background:${meta2?.bg||"#f1f5f9"};color:${meta2?.fg||"#475569"}">${code}</span><div class="dist-bar-bg"><div class="dist-bar-fill pm-bar-fill" style="width:${Math.round((cnt/maxV)*100)}%;background:${meta2?.fg||"#94a3b8"}"></div></div><span class="dist-count">${cnt}</span><span class="dist-pct">${s.aktivDays > 0 ? Math.round((cnt/s.aktivDays)*100) : 0}%</span></div>`;
      }).join("");
    } else {
      if (wpHdEl) wpHdEl.style.display = "none";
      wpChartEl.innerHTML = "";
    }
  }
  
  const stChartEl = document.getElementById("pm-st-chart");
  const stHdEl = document.getElementById("pm-st-hd");
  if (stChartEl) {
    const stEntries = Object.entries(s.stCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (stEntries.length) {
      if (stHdEl) stHdEl.style.display = "";
      const maxSt = stEntries[0][1];
      stChartEl.innerHTML = stEntries.map(([code, cnt]) => {
        const meta2 = CODE_MAP[code];
        return `<div class="dist-row"><span class="dist-code" style="background:${meta2?.bg||"#f1f5f9"};color:${meta2?.fg||"#475569"}">${code}</span><div class="dist-bar-bg"><div class="dist-bar-fill pm-bar-fill" style="width:${Math.round((cnt/maxSt)*100)}%;background:${meta2?.fg||"#94a3b8"}"></div></div><span class="dist-count">${cnt}</span><span class="dist-pct"></span></div>`;
      }).join("");
    } else {
      if (stHdEl) stHdEl.style.display = "none";
      stChartEl.innerHTML = "";
    }
  }
  
  const dutyDetailEl = document.getElementById("pm-duty-detail");
  const dutyHdEl = document.getElementById("pm-duty-hd");
  if (dutyDetailEl) {
    if (s.dutyD.length || s.dutyHG.length) {
      if (dutyHdEl) dutyHdEl.style.display = "";
      let dHtml = "";
      if (s.dutyD.length) {
        const dayBadges = s.dutyD.map(d => {
          const wd = weekday(y, m, d);
          const hol = isHoliday(y, m, d, hols);
          const cls = (wd === 5 || wd === 6 || wd === 0 || hol) ? " style=\"background:#FEF3C7;color:#78350F;border-color:#FDE68A\"" : "";
          return `<span class="duty-day-badge"${cls}>${DOW_ABBR[wd]} ${d}.</span>`;
        }).join("");
        dHtml += `<div class="duty-detail-group"><span class="duty-group-lbl badge-D" style="background:var(--red);color:#fff">D</span><div><div class="duty-group-label">Bereitschaftsdienst</div><div class="duty-group-days">${dayBadges}</div></div></div>`;
      }
      if (s.dutyHG.length) {
        const dayBadges = s.dutyHG.map(d => {
          const wd = weekday(y, m, d);
          const hol = isHoliday(y, m, d, hols);
          const cls = (wd === 5 || wd === 6 || wd === 0 || hol) ? " style=\"background:#E0F2FE;color:#0369A1;border-color:#7DD3FC\"" : "";
          return `<span class="duty-day-badge"${cls}>${DOW_ABBR[wd]} ${d}.</span>`;
        }).join("");
        dHtml += `<div class="duty-detail-group"><span class="duty-group-lbl badge-HG" style="background:var(--blue-d);color:#fff">HG</span><div><div class="duty-group-label">Hintergrunddienst</div><div class="duty-group-days">${dayBadges}</div></div></div>`;
      }
      dutyDetailEl.innerHTML = dHtml;
    } else {
      if (dutyHdEl) dutyHdEl.style.display = "none";
      dutyDetailEl.innerHTML = "";
    }
  }
  
  const calEl = document.getElementById("pm-cal");
  if (calEl) {
    const dim = daysInMonth(y, m);
    const firstWd = weekday(y, m, 1);
    let calHtml = `<div class="mcd-grid">`;
    DOW_ABBR.forEach((d, i) => calHtml += `<div class="mcd-dow${(i === 0 || i === 6) ? " is-we" : ""}">${d}</div>`);
    const offset = firstWd;
    for (let i = 0; i < offset; i++) calHtml += `<div class="mcd-ph"></div>`;
    for (let d = 1; d <= dim; d++) {
      const wd = weekday(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const cell = getCell(y, m, empName, d);
      const isToday = isTodayCol(y, m, d);
      let cls = "mcd";
      if (hol) cls += " mcd-hol";
      else if (wd === 0 || wd === 6) cls += " mcd-we";
      else if (!cell.assignment && !cell.duty) cls += " mcd-empty";
      if (isToday) cls += " mcd-today";
      const assign = cell.assignment || "";
      const duty = cell.duty || "";
      const { bg: cbg, fg: cfg } = cellColor(assign);
      const bgStyle = assign ? `background:${cbg}` : "";
      const interactive = (!hol && wd !== 0 && wd !== 6) ? ` role="button" tabindex="0"` : "";
      calHtml += `<div class="${cls}" style="${bgStyle}"${interactive} data-day="${d}"><span class="mcd-num">${d}</span><span class="mcd-assign" style="color:${cfg}">${assign}</span>${duty ? `<span class="mcd-duty badge-${duty}" style="background:${duty==='D'?'var(--red)':'var(--blue-d)'};color:#fff">${duty}</span>` : ""}</div>`;
    }
    calHtml += `</div>`;
    calEl.innerHTML = calHtml;
    calEl.querySelectorAll(".mcd[data-day]").forEach(el => {
      const wd = weekday(y, m, parseInt(el.dataset.day));
      const hol = isHoliday(y, m, parseInt(el.dataset.day), hols);
      if (!hol && wd !== 0 && wd !== 6) {
        el.addEventListener("click", () => {
          if (typeof hideOverlay === "function") hideOverlay("modal-profile");
          setTimeout(() => openEditor(empName, parseInt(el.dataset.day)), 180);
        });
      }
    });
  }
  
  const yrEl = document.getElementById("pm-yearly");
  if (yrEl) {
    const kpiVals = [
      { lbl: "Aktiv / WT", val: `${ys.totals.aktivDays} / ${ys.totals.totalWorkdays}`, color: "#1D4ED8" },
      { lbl: "Urlaub", val: ys.totals.vacationDays, color: "#7C3AED" },
      { lbl: "Krank", val: ys.totals.sickDays, color: "#DC2626" },
      { lbl: "FZA", val: ys.totals.fzaDays, color: "#3730A3" },
      { lbl: "D", val: ys.totals.dutyD, color: "#EF4444" },
      { lbl: "HG", val: ys.totals.dutyHG, color: "#0EA5E9" },
    ];
    let yrHtml = `<div class="yr-kpi-strip">${kpiVals.map((k, i) => `${i > 0 ? '<div class="yr-kpi-div"></div>' : ""}<div class="yr-kpi-item"><div class="yr-kpi-val" style="color:${k.color}">${k.val}</div><div class="yr-kpi-lbl">${k.lbl}</div></div>`).join("")}</div>`;
    yrHtml += `<div class="yr-table-wrap"><table class="yr-table"><thead><tr><th class="yr-th yr-th-month">Monat</th><th class="yr-th">Aktiv</th><th class="yr-th yr-th-vac">U</th><th class="yr-th yr-th-sick">K</th><th class="yr-th">FZA</th><th class="yr-th">WB</th><th class="yr-th yr-th-d">D</th><th class="yr-th yr-th-hg">HG</th></tr></thead><tbody>`;
    ys.months.forEach(mon => {
      const isCur = mon.m === m;
      const vac = VACATION_CODES.reduce((s2, c) => s2 + (mon.stCounts[c] || 0), 0);
      const sick = (mon.stCounts["K"] || 0) + (mon.stCounts["KK"] || 0);
      const fza2 = mon.stCounts["FZA"] || 0;
      const wb = mon.stCounts["WB"] || 0;
      const rc = mon.hasData ? "" : " yr-row-empty";
      yrHtml += `<tr class="yr-row${isCur ? " yr-row-current" : ""}${rc}"><td class="yr-td-month">${MONTHS_SHORT[mon.m]}</td><td class="yr-td yr-td-num">${mon.hasData && mon.totalWorkdays > 0 ? (mon.aktivDays || "—") : "—"}</td><td class="yr-td yr-td-num yr-vac">${mon.hasData && vac ? vac : "—"}</td><td class="yr-td yr-td-num yr-sick">${mon.hasData && sick ? sick : "—"}</td><td class="yr-td yr-td-num">${mon.hasData && fza2 ? fza2 : "—"}</td><td class="yr-td yr-td-num">${mon.hasData && wb ? wb : "—"}</td><td class="yr-td yr-td-num yr-duty-d">${mon.hasData && mon.dutyD ? mon.dutyD : "—"}</td><td class="yr-td yr-td-num yr-duty-hg">${mon.hasData && mon.dutyHG ? mon.dutyHG : "—"}</td></tr>`;
    });
    yrHtml += `<tr class="yr-total-row"><td class="yr-total-lbl">Gesamt</td><td class="yr-td yr-td-num yr-total">${ys.totals.aktivDays || "—"}</td><td class="yr-td yr-td-num yr-vac yr-total">${ys.totals.vacationDays || "—"}</td><td class="yr-td yr-td-num yr-sick yr-total">${ys.totals.sickDays || "—"}</td><td class="yr-td yr-td-num yr-total">${ys.totals.fzaDays || "—"}</td><td class="yr-td yr-td-num yr-total">${ys.totals.wbDays || "—"}</td><td class="yr-td yr-td-num yr-duty-d yr-total">${ys.totals.dutyD || "—"}</td><td class="yr-td yr-td-num yr-duty-hg yr-total">${ys.totals.dutyHG || "—"}</td></tr>`;
    yrHtml += `</tbody></table></div>`;
    yrEl.innerHTML = yrHtml;
  }
  
  if (typeof showOverlay === "function") showOverlay("modal-profile");
  
  setTimeout(() => {
    const fills = document.querySelectorAll(".pm-bar-fill");
    fills.forEach(f => {
      const w = f.style.width;
      f.style.width = "0%";
      requestAnimationFrame(() => { requestAnimationFrame(() => { f.style.width = w; }); });
    });
  }, 10);
};

window.openEmployeeModal = function() {
  const { year: y } = state;
  const dash = state.employeeDashboard;
  const employees = getEmployeesForYear(y);
  if (!dash.selectedEmp || !employees.includes(dash.selectedEmp)) {
    dash.selectedEmp = employees[0] || null;
  }
  const empSub = document.getElementById("emp-sub");
  if (empSub) empSub.textContent = `Kalenderjahr ${y}`;
  renderEmployeeDashboard();
  if (typeof showOverlay === "function") showOverlay("modal-emps");
  setTimeout(() => document.getElementById("emp-search")?.focus(), 80);
};

window.renderEmployeeDashboard = function() {
  const { year: y, month: m } = state;
  const dash = state.employeeDashboard;
  const employees = getEmployeesForYear(y);
  const summaryEl = document.getElementById("emp-summary-grid");
  const gridEl = document.getElementById("emp-year-grid");
  const detailEl = document.getElementById("emp-detail-panel");
  const detailSub = document.getElementById("emp-detail-sub");
  const countEl = document.getElementById("emp-visible-count");
  const contextEl = document.getElementById("emp-context-line");
  
  if (!summaryEl || !gridEl || !detailEl) return;
  const currentMonthData = getMonthData(y, m);
  if (contextEl) contextEl.textContent = `${MONTHS[m]} ${y} · ${currentMonthData.employees.length} Mitarbeitende im aktuellen Monat · ${employees.length} eindeutige Mitarbeitende im Jahr`;
  
  if (!employees.length) {
    summaryEl.innerHTML = `<div class="empdash-empty">Keine Mitarbeitendendaten für ${y} vorhanden.</div>`;
    gridEl.innerHTML = "";
    detailEl.innerHTML = `<div class="empdash-empty">Bitte zuerst Mitarbeitende anlegen.</div>`;
    if (countEl) countEl.textContent = "0 sichtbar";
    renderRoleFilters(employees);
    return;
  }
  
  const metrics = employees.map(emp => getEmployeeYearCardMetrics(emp, y));
  const activeCount = metrics.filter(item => item.activeMonths > 0).length;
  const dutyCount = metrics.reduce((sum, item) => sum + item.ys.totals.dutyD + item.ys.totals.dutyHG, 0);
  const roles = metrics.reduce((acc, item) => {
    const pos = item.meta.position;
    if (["CA", "LOA", "OA", "OÄ"].includes(pos)) acc.lead++;
    else if (["FA", "FÄ"].includes(pos)) acc.fa++;
    else if (["AA", "AÄ"].includes(pos)) acc.aa++;
    else acc.other++;
    return acc;
  }, { lead: 0, fa: 0, aa: 0, other: 0 });
  
  summaryEl.innerHTML = [
    { label: "Mitarbeitende im Jahr", value: employees.length, sub: `${activeCount} mit Aktivität`, tone: "#0EA5E9" },
    { label: "Aktueller Monatsbestand", value: currentMonthData.employees.length, sub: `${MONTHS[m]} ${y}`, tone: "#22C55E" },
    { label: "Dienste im Jahr", value: dutyCount, sub: "D + HG kumuliert", tone: "#F97316" },
    { label: "Rollenmix", value: `${roles.lead}/${roles.fa}/${roles.aa}`, sub: "Leitung · FA · AA", tone: "#A855F7" }
  ].map(item => `<article class="empdash-kpi"><div class="empdash-kpi-label">${item.label}</div><div class="empdash-kpi-value" style="color:${item.tone}">${item.value}</div><div class="empdash-kpi-sub">${item.sub}</div></article>`).join("");
  
  renderRoleFilters(employees);
  
  const query = dash.filter.trim().toLowerCase();
  const filtered = metrics.filter(item => {
    if (!matchRoleFilter(item.emp, dash.role)) return false;
    if (!query) return true;
    const hay = [item.emp, item.meta.fullName, item.meta.posLabel, item.meta.position, item.meta.area].join(" ").toLowerCase();
    return hay.includes(query);
  });
  
  if (!dash.selectedEmp || !employees.includes(dash.selectedEmp)) dash.selectedEmp = filtered[0]?.emp || null;
  if (countEl) countEl.textContent = `${filtered.length} von ${employees.length} sichtbar`;
  
  gridEl.innerHTML = filtered.map(item => {
    const pc = posColor(item.meta.position);
    const vac = item.ys.totals.vacationDays || 0;
    const sick = item.ys.totals.sickDays || 0;
    const selectedCls = dash.selectedEmp === item.emp ? " active" : "";
    return `<button type="button" class="empdash-card${selectedCls}" data-emp="${item.emp}" role="listitem"><div class="empdash-card-top"><span class="empdash-avatar" style="background:linear-gradient(135deg,${pc.border},${pc.fg})">${empInitials(item.emp)}</span><div class="empdash-card-meta"><span class="empdash-card-name">${item.emp}</span><span class="empdash-card-sub">${item.meta.posLabel !== "—" ? item.meta.posLabel : "ohne Stammdaten"}</span></div><span class="empdash-pos" style="background:${pc.bg};color:${pc.fg}">${item.meta.position}</span></div><div class="empdash-card-stats"><span><strong>${item.ys.totals.aktivDays || 0}</strong><small>Aktiv</small></span><span><strong>${item.ys.totals.dutyD || 0}</strong><small>D</small></span><span><strong>${item.ys.totals.dutyHG || 0}</strong><small>HG</small></span><span><strong>${item.coverage}%</strong><small>Abdeckung</small></span></div><div class="empdash-card-foot"><span>${item.activeMonths}/12 Monate</span><span>U ${vac} · K ${sick}</span></div></button>`;
  }).join("") || `<div class="empdash-empty">Keine Mitarbeitenden entsprechen dem Filter.</div>`;
  
  gridEl.querySelectorAll("[data-emp]").forEach(btn => btn.addEventListener("click", () => {
    dash.selectedEmp = btn.dataset.emp;
    renderEmployeeDashboard();
    setTimeout(() => document.querySelector(".empdash-detail-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }));
  
  if (!dash.selectedEmp) {
    detailEl.innerHTML = `<div class="empdash-empty">Bitte eine Person auswählen.</div>`;
    if (detailSub) detailSub.textContent = "Bitte eine Person auswählen.";
    return;
  }
  
  renderEmployeeDetailDashboard(dash.selectedEmp, y);
  if (detailSub) detailSub.textContent = `${dash.selectedEmp} · Kalenderjahr ${y} · Detailansicht ${dash.detailView === "months" ? "Monatsverlauf" : dash.detailView === "calendar" ? "Jahreskalender" : "Verwaltung"}`;
};

window.renderRoleFilters = function(employees) {
  const el = document.getElementById("emp-role-filters");
  if (!el) return;
  const buckets = getRoleFilterBuckets(state.year, employees);
  const defs = [
    ["ALL", "Alle"],
    ["CA", "Chefärzte"],
    ["OA", "Oberärzte"],
    ["FA", "Fachärzte"],
    ["AA", "Assistenz"],
    ["OHNE", "Ohne Profil"]
  ];
  el.innerHTML = defs.map(([code, label]) => `<button type="button" class="empdash-filter-btn${state.employeeDashboard.role === code ? " active" : ""}" data-role="${code}">${label}<span>${buckets[code] || 0}</span></button>`).join("");
  el.querySelectorAll("[data-role]").forEach(btn => btn.addEventListener("click", () => {
    state.employeeDashboard.role = btn.dataset.role;
    renderEmployeeDashboard();
  }));
};

window.renderEmployeeDetailDashboard = function(emp, year) {
  const detailEl = document.getElementById("emp-detail-panel");
  if (!detailEl) return;
  const meta = getEmpMeta(emp);
  const pc = posColor(meta.position);
  const ys = buildYearlyStats(emp, year);
  const currentMonthData = getMonthData(state.year, state.month);
  
  document.querySelectorAll('.empdash-view-btn').forEach(btn => {
    const active = btn.dataset.view === state.employeeDashboard.detailView;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  
  if (state.employeeDashboard.detailView === 'months') {
    let html = `<div class="empdash-detail-profile"><div class="empdash-detail-profile-head"><span class="empdash-avatar lg" style="background:linear-gradient(135deg,${pc.border},${pc.fg})">${empInitials(emp)}</span><div><div class="empdash-detail-name">${meta.fullName !== emp ? meta.fullName : emp}</div><div class="empdash-detail-meta">${meta.posLabel} · ${meta.type}</div></div></div></div>`;
    html += `<div class="empdash-month-table-wrap"><table class="empdash-month-table"><thead><tr><th>Monat</th><th>Aktiv</th><th>Urlaub</th><th>Krank</th><th>FZA</th><th>WB</th><th>D</th><th>HG</th><th>Abdeckung</th></tr></thead><tbody>`;
    ys.months.forEach(mon => {
      const vac = VACATION_CODES.reduce((sum, c) => sum + (mon.stCounts[c] || 0), 0);
      const sick = (mon.stCounts['K'] || 0) + (mon.stCounts['KK'] || 0);
      const cov = mon.totalWorkdays > 0 ? Math.round((mon.coveredWorkdays / mon.totalWorkdays) * 100) : 0;
      html += `<tr class="${mon.m === state.month ? 'is-current' : ''}"><td>${MONTHS_SHORT[mon.m]}</td><td>${mon.aktivDays || '—'}</td><td>${vac || '—'}</td><td>${sick || '—'}</td><td>${mon.stCounts['FZA'] || '—'}</td><td>${mon.stCounts['WB'] || '—'}</td><td>${mon.dutyD || '—'}</td><td>${mon.dutyHG || '—'}</td><td><span class="empdash-cov ${cov >= 80 ? 'good' : cov >= 60 ? 'mid' : 'low'}">${mon.totalWorkdays ? cov + '%' : '—'}</span></td></tr>`;
    });
    html += `</tbody><tfoot><tr><td>Gesamt</td><td>${ys.totals.aktivDays || '—'}</td><td>${ys.totals.vacationDays || '—'}</td><td>${ys.totals.sickDays || '—'}</td><td>${ys.totals.fzaDays || '—'}</td><td>${ys.totals.wbDays || '—'}</td><td>${ys.totals.dutyD || '—'}</td><td>${ys.totals.dutyHG || '—'}</td><td>${ys.totals.totalWorkdays ? Math.round((ys.totals.coveredWorkdays / ys.totals.totalWorkdays) * 100) + '%' : '—'}</td></tr></tfoot></table></div>`;
    detailEl.innerHTML = html;
    return;
  }
  
  if (state.employeeDashboard.detailView === 'calendar') {
    const cards = ys.months.map(mon => {
      const vac = VACATION_CODES.reduce((sum, c) => sum + (mon.stCounts[c] || 0), 0);
      const sick = (mon.stCounts['K'] || 0) + (mon.stCounts['KK'] || 0);
      const items = [];
      Object.entries(mon.wpCounts).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).slice(0,4).forEach(([code,val]) => items.push(`<span class="empdash-mini-chip">${code} ${val}</span>`));
      if (mon.dutyD) items.push(`<span class="empdash-mini-chip duty">D ${mon.dutyD}</span>`);
      if (mon.dutyHG) items.push(`<span class="empdash-mini-chip hg">HG ${mon.dutyHG}</span>`);
      if (vac) items.push(`<span class="empdash-mini-chip vac">U ${vac}</span>`);
      if (sick) items.push(`<span class="empdash-mini-chip sick">K ${sick}</span>`);
      return `<article class="empdash-mini-month ${mon.m === state.month ? 'active' : ''}"><header><strong>${MONTHS[mon.m]}</strong><span>${mon.aktivDays || 0} Aktiv</span></header><div class="empdash-mini-body">${items.join('') || '<span class="empdash-mini-empty">Keine Einträge</span>'}</div><footer>${mon.totalWorkdays ? Math.round((mon.coveredWorkdays / mon.totalWorkdays) * 100) : 0}% Abdeckung</footer></article>`;
    }).join('');
    detailEl.innerHTML = `<div class="empdash-mini-grid">${cards}</div>`;
    return;
  }
  
  const currentIncluded = currentMonthData.employees.includes(emp);
  const monthList = currentMonthData.employees.map(name => {
    const metaItem = getEmpMeta(name);
    const pos = posColor(metaItem.position);
    return `<div class="emp-row"><div class="emp-row-left"><span class="emp-avatar" style="background:linear-gradient(135deg,${pos.border},${pos.fg})">${empInitials(name)}</span><div class="emp-row-info"><span class="emp-row-name">${name}</span><span class="emp-row-meta">${metaItem.posLabel}</span></div></div><button type="button" class="emp-row-del" data-remove="${name}" aria-label="${name} entfernen"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l9 9M10 1L1 10"/></svg></button></div>`;
  }).join('') || `<div class="emp-none">Keine Mitarbeitenden im aktuellen Monat</div>`;
  
  detailEl.innerHTML = `<div class="empdash-admin-layout"><div class="empdash-admin-card"><div class="empdash-admin-title">Ausgewählte Person</div><div class="empdash-admin-meta"><span class="empdash-pos" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span><span>${meta.posLabel}</span><span>${meta.area || 'kein Bereich hinterlegt'}</span></div><div class="empdash-admin-actions"><button type="button" class="mbtn ${currentIncluded ? 'mbtn-ghost' : 'mbtn-primary'}" id="emp-toggle-current">${currentIncluded ? 'Aus aktuellem Monat entfernen' : 'Zum aktuellen Monat hinzufügen'}</button></div></div><div class="empdash-admin-card"><div class="empdash-admin-title">Monatsliste ${MONTHS[state.month]} ${state.year}</div><div class="emp-list-inner" id="emp-list">${monthList}</div><div class="emp-add-row"><input type="text" class="text-input" id="emp-input" placeholder="Name (z.B. Dr. Müller)…" autocomplete="off" spellcheck="false" maxlength="80" aria-label="Name des neuen Mitarbeiters eingeben"><button type="button" class="mbtn mbtn-primary" id="emp-add-btn"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Hinzufügen</button></div></div></div>`;
  
  detailEl.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
    if (typeof confirmRemoveEmployee === "function") confirmRemoveEmployee(btn.dataset.remove, false);
  }));
  document.getElementById('emp-toggle-current')?.addEventListener('click', () => {
    if (currentIncluded) removeEmployee(state.year, state.month, emp);
    else addEmployee(state.year, state.month, emp);
    render();
    renderEmployeeDashboard();
  });
  document.getElementById('emp-add-btn')?.addEventListener('click', () => {
    const input = document.getElementById('emp-input');
    const name = input.value.trim();
    if (!name) return;
    addEmployee(state.year, state.month, name);
    input.value = '';
    state.employeeDashboard.selectedEmp = name;
    render();
    renderEmployeeDashboard();
    input.focus();
  });
  document.getElementById('emp-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('emp-add-btn')?.click();
  });
};

window.openDeptOverview = function() {
  const modal = document.getElementById("modal-dept");
  if (!modal) return;
  deptTab = "month";
  document.querySelectorAll(".dept-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("dept-tab-month")?.classList.add("active");
  renderDeptContent();
  if (typeof showOverlay === "function") showOverlay("modal-dept");
};

window.renderDeptContent = function() {
  const { year: y, month: m } = state;
  if (deptTab === "month") renderDeptMonth(y, m);
  else renderDeptYear(y);
};

window.renderDeptMonth = function(y, m) {
  const body = document.getElementById("dept-body");
  if (!body) return;
  const hols = getSaxonyHolidaysCached(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  const deptHeadLine = document.getElementById("dept-context-line");
  if (deptHeadLine) deptHeadLine.textContent = `${MONTHS[m]} ${y}`;
  
  if (!md.employees.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten</p></div>`;
    return;
  }
  
  let workdayCount = 0, mrCov = 0, ctCov = 0, dCov = 0, hgCov = 0;
  for (let d = 1; d <= dim; d++) {
    if (!isWorkday(y, m, d, hols)) continue;
    workdayCount++;
    let hasMR = false, hasCT = false, hasD = false, hasHG = false;
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      const assign = (cell.assignment || "").split("/").map(x => x.trim());
      if (assign.includes("MR")) hasMR = true;
      if (assign.includes("CT")) hasCT = true;
      if (cell.duty === "D") hasD = true;
      if (cell.duty === "HG") hasHG = true;
    });
    if (hasMR) mrCov++;
    if (hasCT) ctCov++;
    if (hasD) dCov++;
    if (hasHG) hgCov++;
  }
  
  const pct = v => workdayCount > 0 ? Math.round((v / workdayCount) * 100) : 0;
  const covItems = [
    { label: "MR", val: mrCov, pct: pct(mrCov), color: "#1D4ED8", bg: "#DBEAFE" },
    { label: "CT", val: ctCov, pct: pct(ctCov), color: "#C2410C", bg: "#FFEDD5" },
    { label: "D", val: dCov, pct: pct(dCov), color: "#EF4444", bg: "#FEE2E2" },
    { label: "HG", val: hgCov, pct: pct(hgCov), color: "#0EA5E9", bg: "#E0F2FE" }
  ];
  
  const stripHtml = `<div class="dept-cov-strip"><div class="dept-cov-meta"><span class="dept-cov-meta-val">${workdayCount}</span><span class="dept-cov-meta-lbl">Werktage</span></div><div class="dept-cov-meta"><span class="dept-cov-meta-val">${md.employees.length}</span><span class="dept-cov-meta-lbl">Mitarbeitende</span></div><div class="dept-cov-bars">${covItems.map(item => `<div class="dept-cov-bar-item"><div class="dept-cov-bar-head"><span class="dept-cov-code" style="background:${item.bg};color:${item.color}">${item.label}</span><span class="dept-cov-fraction">${item.val}/${workdayCount}</span><span class="dept-cov-pct" style="color:${item.pct >= 80 ? item.color : "#94A3B8"}">${item.pct}%</span></div><div class="dept-cov-bar-bg"><div class="dept-cov-bar-fill" style="width:${item.pct}%;background:${item.color}"></div></div></div>`).join("")}</div></div>`;
  
  const empStats = md.employees.map(emp => {
    const s = buildProfileStats(y, m, emp);
    const meta = getEmpMeta(emp);
    const pc = posColor(meta.position);
    const vac = VACATION_CODES.reduce((sum, c) => sum + (s.stCounts[c] || 0), 0);
    const sick = (s.stCounts["K"] || 0) + (s.stCounts["KK"] || 0);
    const fza = s.stCounts["FZA"] || 0;
    const frei = s.stCounts["F"] || 0;
    return { emp, s, meta, pc, vac, sick, fza, frei };
  });
  
  const team = empStats.reduce((acc, { s, vac, sick, fza, frei }) => {
    acc.aktiv += s.aktivDays;
    acc.vac += vac;
    acc.sick += sick;
    acc.fza += fza;
    acc.d += s.dutyD.length;
    acc.hg += s.dutyHG.length;
    acc.frei += frei;
    acc.offen += s.uncovered;
    return acc;
  }, { aktiv: 0, vac: 0, sick: 0, fza: 0, d: 0, hg: 0, frei: 0, offen: 0 });
  
  const rowsHtml = empStats.map(({ emp, s, meta, pc, vac, sick, fza, frei }) => `<tr class="dept-tr"><td class="dept-td-name" style="border-left:3px solid ${pc.border}"><span class="dept-emp-name">${emp}</span>${meta.position !== "—" ? `<span class="dept-pos-badge" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>` : ""}</td><td class="dept-td dept-td-num" style="font-weight:700">${s.aktivDays || "—"}</td><td class="dept-td dept-td-num">${s.wpCounts["MR"] || ""}</td><td class="dept-td dept-td-num">${s.wpCounts["CT"] || ""}</td><td class="dept-td dept-td-num dept-vac">${vac || ""}</td><td class="dept-td dept-td-num dept-sick">${sick || ""}</td><td class="dept-td dept-td-num">${fza || ""}</td><td class="dept-td dept-td-num dept-duty-d">${s.dutyD.length || ""}</td><td class="dept-td dept-td-num dept-duty-hg">${s.dutyHG.length || ""}</td><td class="dept-td dept-td-num dept-frei">${frei || ""}</td><td class="dept-td dept-td-num ${s.uncovered > 0 ? "dept-offen" : ""}">${s.uncovered || ""}</td></tr>`).join("");
  
  const tableHtml = `<div class="dept-table-wrap"><table class="dept-table"><thead><tr><th class="dept-th-name">Mitarbeitende</th><th class="dept-th">Aktiv</th><th class="dept-th">MR</th><th class="dept-th">CT</th><th class="dept-th dept-th-vac">Urlaub</th><th class="dept-th dept-th-sick">Krank</th><th class="dept-th">FZA</th><th class="dept-th dept-th-d">D</th><th class="dept-th dept-th-hg">HG</th><th class="dept-th">Frei</th><th class="dept-th dept-th-offen">Offen</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr class="dept-total-row"><td class="dept-td-name dept-total-lbl">Gesamt&ensp;(${md.employees.length}&thinsp;MA)</td><td class="dept-td dept-td-num dept-total" style="color:var(--navy-600) !important">${team.aktiv || "—"}</td><td class="dept-td dept-td-num dept-total" colspan="2"></td><td class="dept-td dept-td-num dept-total dept-vac">${team.vac || "—"}</td><td class="dept-td dept-td-num dept-total dept-sick">${team.sick || "—"}</td><td class="dept-td dept-td-num dept-total">${team.fza || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-d">${team.d || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-hg">${team.hg || "—"}</td><td class="dept-td dept-td-num dept-total dept-frei">${team.frei || "—"}</td><td class="dept-td dept-td-num dept-total ${team.offen > 0 ? "dept-offen" : ""}">${team.offen || "—"}</td></tr></tfoot></table></div>`;
  
  body.innerHTML = stripHtml + tableHtml;
};

window.renderDeptYear = function(year) {
  const body = document.getElementById("dept-body");
  if (!body) return;
  const deptHeadLine = document.getElementById("dept-context-line");
  if (deptHeadLine) deptHeadLine.textContent = `Jahresübersicht ${year}`;
  
  const allEmps = [...new Set(Object.entries(DATA).filter(([k]) => k.startsWith(`${year}-`)).flatMap(([, md]) => md?.employees || []))];
  
  if (!allEmps.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten für ${year}</p></div>`;
    return;
  }
  
  const empYS = allEmps.map(emp => ({ emp, ys: buildYearlyStats(emp, year), meta: getEmpMeta(emp) })).filter(({ ys }) => ys.totals.totalWorkdays > 0 || ys.totals.dutyD > 0 || ys.totals.dutyHG > 0);
  
  if (!empYS.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten</p></div>`;
    return;
  }
  
  const team = empYS.reduce((acc, { ys }) => {
    acc.wd += ys.totals.totalWorkdays;
    acc.cov += ys.totals.coveredWorkdays;
    acc.aktiv += ys.totals.aktivDays;
    acc.vac += ys.totals.vacationDays;
    acc.sick += ys.totals.sickDays;
    acc.fza += ys.totals.fzaDays;
    acc.wb += ys.totals.wbDays;
    acc.d += ys.totals.dutyD;
    acc.hg += ys.totals.dutyHG;
    return acc;
  }, { wd: 0, cov: 0, aktiv: 0, vac: 0, sick: 0, fza: 0, wb: 0, d: 0, hg: 0 });
  
  const teamCovPct = team.wd > 0 ? Math.round((team.cov / team.wd) * 100) : 0;
  const stripHtml = `<div class="dept-yr-strip"><div class="dept-yr-kpi"><span class="dept-yr-kpi-val">${empYS.length}</span><span class="dept-yr-kpi-lbl">Mitarbeitende</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#1D4ED8">${team.aktiv}</span><span class="dept-yr-kpi-lbl">Aktiv-Tage</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#5B21B6">${team.vac}</span><span class="dept-yr-kpi-lbl">Urlaub (U)</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#991B1B">${team.sick}</span><span class="dept-yr-kpi-lbl">Krank (K)</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val"><span style="color:#EF4444">${team.d}</span>&thinsp;/&thinsp;<span style="color:#0EA5E9">${team.hg}</span></span><span class="dept-yr-kpi-lbl">D/HG</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:${teamCovPct >= 80 ? "#15803D" : teamCovPct >= 60 ? "#854D0E" : "#991B1B"}">${teamCovPct}%</span><span class="dept-yr-kpi-lbl">Abdeckung</span></div></div>`;
  
  const rowsHtml = empYS.map(({ emp, ys, meta }) => {
    const t = ys.totals;
    const pc = posColor(meta.position);
    const cov = t.totalWorkdays > 0 ? Math.round((t.coveredWorkdays / t.totalWorkdays) * 100) : 0;
    const covCls = cov >= 80 ? "dept-cov-good" : cov >= 60 ? "dept-cov-mid" : cov > 0 ? "dept-cov-low" : "";
    return `<tr class="dept-tr"><td class="dept-td-name" style="border-left:3px solid ${pc.border};cursor:pointer" onclick="document.getElementById('modal-dept').querySelector('.modal-x').click(); state.profileEmp = '${emp}'; renderProfileModal('${emp}'); showOverlay('modal-profile');" title="Jahresprofil öffnen"><span class="dept-emp-name">${emp}</span>${meta.position !== "—" ? `<span class="dept-pos-badge" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>` : ""}</td><td class="dept-td dept-td-num" style="font-weight:700">${t.aktivDays || "—"}</td><td class="dept-td dept-td-num dept-vac">${t.vacationDays || "—"}</td><td class="dept-td dept-td-num dept-sick">${t.sickDays || "—"}</td><td class="dept-td dept-td-num">${t.fzaDays || "—"}</td><td class="dept-td dept-td-num">${t.wbDays || "—"}</td><td class="dept-td dept-td-num dept-duty-d">${t.dutyD || "—"}</td><td class="dept-td dept-td-num dept-duty-hg">${t.dutyHG || "—"}</td><td class="dept-td dept-td-num ${covCls}">${t.totalWorkdays > 0 ? cov + "%" : "—"}</td></tr>`;
  }).join("");
  
  const tableHtml = `<div class="dept-table-wrap"><table class="dept-table"><thead><tr><th class="dept-th-name">Mitarbeitende</th><th class="dept-th">Aktiv</th><th class="dept-th dept-th-vac">Urlaub</th><th class="dept-th dept-th-sick">Krank</th><th class="dept-th">FZA</th><th class="dept-th">WB</th><th class="dept-th dept-th-d">D</th><th class="dept-th dept-th-hg">HG</th><th class="dept-th">Abdeckung</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr class="dept-total-row"><td class="dept-td-name dept-total-lbl">Gesamt&ensp;(${empYS.length}&thinsp;MA)</td><td class="dept-td dept-td-num dept-total">${team.aktiv || "—"}</td><td class="dept-td dept-td-num dept-total dept-vac">${team.vac || "—"}</td><td class="dept-td dept-td-num dept-total dept-sick">${team.sick || "—"}</td><td class="dept-td dept-td-num dept-total">${team.fza || "—"}</td><td class="dept-td dept-td-num dept-total">${team.wb || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-d">${team.d || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-hg">${team.hg || "—"}</td><td class="dept-td dept-td-num dept-total ${teamCovPct >= 80 ? "dept-cov-good" : teamCovPct >= 60 ? "dept-cov-mid" : "dept-cov-low"}">${teamCovPct}%</td></tr></tfoot></table></div>`;
  
  body.innerHTML = stripHtml + tableHtml;
};