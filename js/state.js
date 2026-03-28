import { STORAGE_KEY, normalizeMonthDataShape } from './constants.js';

export let DATA = {};
export let DRAFTS = {};

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

export async function loadFromStorage() {
  try {
    const response = await fetch('/api/data');
    if (response.ok) {
      const payload = await response.json();
      if (payload && payload.main) {
        DATA = payload.main;
      } else {
        DATA = payload || {};
      }
      if (payload && payload.drafts) {
        DRAFTS = payload.drafts;
      }
    }
    
    Object.values(DATA).forEach((md) => {
      normalizeMonthDataShape(md);
    });
  } catch (e) {
    DATA = {};
    DRAFTS = {};
  }
}

export async function saveToStorage() {
  try {
    const payload = {
      main: DATA,
      drafts: DRAFTS
    };
    
    await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
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