import { STORAGE_KEY, normalizeMonthDataShape } from './constants.js';

export let DATA = {};

export let state = {
  year: 2026,
  month: new Date().getMonth(),
  edit: null,
  ed: { 
    wp: [], 
    st: null, 
    duty: null 
  },
  employeeDashboard: {
    filter: "",
    role: "ALL",
    selectedEmp: null,
    detailView: "months",
  },
  periodDraft: { 
    year: 2026, 
    month: new Date().getMonth() 
  },
  profileEmp: null,
};

export let deptTab = "month";
export let planMode = false;
export let planData = null;
export let planBaseline = null;
export let planHistory = [];
export let planHistoryIdx = -1;
export let planSessions = {};
export let IS_MOBILE = false;
export let responsiveLayoutRaf = 0;

export const today = new Date();
export const TOD_Y = today.getFullYear();
export const TOD_M = today.getMonth();
export const TOD_D = today.getDate();

export function loadFromStorage() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) {
      DATA = JSON.parse(r);
    }
    Object.values(DATA).forEach((md) => {
      normalizeMonthDataShape(md);
    });
  } catch (e) {
    DATA = {};
  }
}

export function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch (e) {
  }
}

export function setDeptTab(val) { 
  deptTab = val; 
}

export function setPlanMode(val) { 
  planMode = val; 
}

export function setPlanData(val) { 
  planData = val; 
}

export function setPlanBaseline(val) { 
  planBaseline = val; 
}

export function setPlanHistory(val) { 
  planHistory = val; 
}

export function setPlanHistoryIdx(val) { 
  planHistoryIdx = val; 
}

export function setPlanSessions(val) { 
  planSessions = val; 
}

export function setIsMobile(val) { 
  IS_MOBILE = val; 
}

export function setResponsiveLayoutRaf(val) { 
  responsiveLayoutRaf = val; 
}