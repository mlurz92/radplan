// RadPlan — Mobile Tages-Detailkarte (#modal-mobile-day): Listenansicht aller
// Mitarbeitenden eines Tages mit Swipe-Navigation zum Vor-/Folgetag und
// Radial-Schnellmenü per Long-Press/Drag. Extrahiert aus dem früher
// monolithischen app.js.

import {
  MONTHS, DOW_LONG, CODE_MAP, weekday, isHoliday, isTodayCol,
  dateKey, daysInMonth, getSaxonyHolidaysCached, isFacharzt, isAssistenzarzt,
  getEmpMeta, posColor,
} from './constants.js';
import { state, planMode, TOD_Y, TOD_M, TOD_D } from './state.js';
import { getMonthData } from './model.js';
import { openRadialQuickMenu, updateRadialHover, releaseRadialMenu } from './render-grid.js';
import { showOverlay } from './render-modals.js';
import { getWish } from './planmode.js';
import { esc } from './utils.js';

function bindMobileDaySwipe(day, dim) {
  const sheet = /** @type {HTMLElement} */ (document.querySelector("#modal-mobile-day .modal"));
  if (!sheet) return;
  sheet.dataset.mdaySwipeDay = String(day);
  sheet.dataset.mdaySwipeDim = String(dim);
  if (sheet.dataset.mdaySwipeBound) return;
  sheet.dataset.mdaySwipeBound = "1";

  let startX = 0;
  let startY = 0;
  let pointerId = null;
  let swiping = false;

  sheet.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    if (/** @type {HTMLElement} */ (e.target).closest(".mday-editable")) return;
    startX = e.clientX;
    startY = e.clientY;
    pointerId = e.pointerId;
    swiping = false;
  });

  sheet.addEventListener("pointermove", (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiping = true;
    }
    if (swiping) {
      sheet.style.transition = "none";
      sheet.style.transform = `translateX(${dx * 0.3}px)`;
    }
  });

  const finishSwipe = (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    pointerId = null;
    sheet.style.transition = "transform .25s cubic-bezier(.34,1.2,.64,1)";
    sheet.style.transform = "";
    setTimeout(() => { sheet.style.transition = ""; }, 260);
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) < 60) return;
    const curDay = parseInt(sheet.dataset.mdaySwipeDay || "0", 10);
    const curDim = parseInt(sheet.dataset.mdaySwipeDim || "0", 10);
    const nextDay = dx < 0 ? curDay + 1 : curDay - 1;
    if (nextDay < 1 || nextDay > curDim) return;
    openMobileDay(nextDay);
  };

  sheet.addEventListener("pointerup", finishSwipe);
  sheet.addEventListener("pointercancel", () => {
    pointerId = null;
    swiping = false;
    sheet.style.transition = "transform .25s cubic-bezier(.34,1.2,.64,1)";
    sheet.style.transform = "";
    setTimeout(() => { sheet.style.transition = ""; }, 260);
  });
}

export function openMobileDay(day) {
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidaysCached(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  const wd = weekday(y, m, day);
  const hol = isHoliday(y, m, day, hols);
  const holName = hols[dateKey(y, m, day)] || "";
  const isToday = isTodayCol(y, m, day, TOD_Y, TOD_M, TOD_D);
  
  const titleEl = document.getElementById("mday-title");
  if (titleEl) {
    titleEl.textContent = `${DOW_LONG[wd]}, ${day}. ${MONTHS[m]} ${y}${holName ? " · " + holName : ""}`;
    if (isToday) {
      titleEl.style.color = "#67D4FF";
    } else if (hol) {
      titleEl.style.color = "#FCD34D";
    } else {
      titleEl.style.color = "";
    }
  }
  
  const dutyBadgesEl = document.getElementById("mday-duty-badges");
  if (dutyBadgesEl) {
    let html = "";
    const bdH = md.employees.find(e => md.assignments?.[e]?.[day]?.duty === "D");
    const hgH = md.employees.find(e => md.assignments?.[e]?.[day]?.duty === "HG");
    
    if (bdH) {
      html += `<span class="mday-duty-pill d"><span class="mday-duty-pill-letter">D</span>${esc(bdH)}</span>`;
    }
    if (hgH) {
      html += `<span class="mday-duty-pill hg"><span class="mday-duty-pill-letter">H</span>${esc(hgH)}</span>`;
    }
    dutyBadgesEl.innerHTML = html;
  }
  
  const bodyEl = document.getElementById("mday-body");
  if (!bodyEl) { 
    showOverlay("modal-mobile-day"); 
    return; 
  }
  
  const faList = md.employees.filter(e => isFacharzt(e));
  const aaList = md.employees.filter(e => isAssistenzarzt(e));
  
  const sections = [
    { label: "Fachärzte", emps: faList },
    { label: "Assistenzärzte", emps: aaList },
  ].filter(s => s.emps.length > 0);
  
  let bodyHtml = "";
  
  sections.forEach(sec => {
    bodyHtml += `<div class="mday-section-hd">${sec.label}</div>`;
    sec.emps.forEach(emp => {
      const cell = md.assignments?.[emp]?.[day] || {};
      const meta = getEmpMeta(emp);
      const pc = posColor(meta.position);
      const isEditable = planMode || !hol;
      
      let badgesHtml = "";
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).filter(Boolean).forEach(code => {
          const cm = CODE_MAP[code];
          if (cm) {
            badgesHtml += `<span class="mday-assign-badge" style="background:${cm.bg};color:${cm.fg}">${code}</span>`;
          }
        });
      }
      
      if (cell.duty) {
        badgesHtml += `<span class="mday-duty-tag ${cell.duty.toLowerCase()}">${cell.duty}</span>`;
      }
      
      if (planMode && getWish(emp, day)) {
        const w = getWish(emp, day);
        const wMap = { BD_WISH: "bd", HG_WISH: "hg", NO_DUTY: "no" };
        const wLabel = { BD_WISH: "D-Wunsch", HG_WISH: "HG-Wunsch", NO_DUTY: "Kein D" };
        badgesHtml += `<span class="mday-wish-tag ${wMap[w] || ""}">${wLabel[w] || w}</span>`;
      }
      
      if (!cell.assignment && !cell.duty) {
        badgesHtml = `<span class="mday-empty-assign">—</span>`;
      }
      
      bodyHtml += `
        <div class="mday-emp-row${isEditable ? " mday-editable" : ""}" data-emp="${esc(emp)}">
          <span class="mday-pos-dot" style="background:${pc.border}"></span>
          <div class="mday-emp-info">
            <span class="mday-emp-name">${esc(emp)}</span>
            <span class="mday-emp-sub">${esc(meta.posLabel !== "—" ? meta.posLabel : meta.position)}</span>
          </div>
          <div class="mday-badges">${badgesHtml}</div>
          ${isEditable ? `
            <span class="mday-edit-icon">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
          ` : ""}
        </div>
      `;
    });
  });
  
  bodyEl.innerHTML = bodyHtml;

  bindMobileDaySwipe(day, dim);

  bodyEl.querySelectorAll(".mday-editable[data-emp]").forEach((/** @type {HTMLElement} */ row) => {
    let startX = 0;
    let startY = 0;
    let pointerId = null;
    let menuOpened = false;

    row.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      pointerId = e.pointerId;
      menuOpened = false;
      row.setPointerCapture?.(e.pointerId);
    });

    row.addEventListener("pointermove", (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!menuOpened && Math.hypot(dx, dy) > 10) {
        menuOpened = true;
        openRadialQuickMenu(row.dataset.emp, day, startX, startY);
      }
      if (menuOpened) {
        updateRadialHover(e.clientX, e.clientY);
      }
    });

    row.addEventListener("pointerup", (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      if (menuOpened) {
        releaseRadialMenu(e.clientX, e.clientY);
      } else {
        openRadialQuickMenu(row.dataset.emp, day, e.clientX, e.clientY);
      }
      pointerId = null;
    });

    row.addEventListener("pointercancel", () => {
      pointerId = null;
    });
  });
  
  showOverlay("modal-mobile-day");
}

