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
    analyticsRange: "month",
    customStart: null,
    customEnd: null,
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

let saveTimeout = null;

export async function loadFromStorage() {
  let loadedData = null;
  
  try {
    const res = await fetch(`/api?action=load&t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    });
    
    if (res.ok) {
      const serverData = await res.json();
      if (serverData.main) {
        loadedData = serverData.main;
        if (serverData.plans) {
          for (const [pk, pv] of Object.entries(serverData.plans)) {
            localStorage.setItem(`radplan_v3_plan_${pk}`, JSON.stringify(pv));
          }
        }
      } else {
        loadedData = serverData;
      }
    } else {
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) {
        loadedData = JSON.parse(r);
      }
    }
  } catch (e) {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) {
      loadedData = JSON.parse(r);
    }
  }
  
  if (loadedData) {
    Object.keys(DATA).forEach((k) => delete DATA[k]);
    Object.assign(DATA, loadedData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  }
  
  Object.values(DATA).forEach((md) => {
    normalizeMonthDataShape(md);
  });
}

export function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    try {
      const plans = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("radplan_v3_plan_")) {
          plans[k.replace("radplan_v3_plan_", "")] = JSON.parse(localStorage.getItem(k));
        }
      }
      const payload = { main: DATA, plans };
      await fetch(`/api?action=save&t=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
    }
  }, 800);
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
