import { STORAGE_KEY, normalizeMonthDataShape, reconcileEmployeesForMonth } from './constants.js';

export let DATA = {};

export let state = {
  year: new Date().getFullYear(),
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
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  },
  profileEmp: null,
  multiEdit: {
    emp: null,
    days: [],
  },
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
export let serverLastModified = 0;
export let serverFetchSuccessful = false;

export const today = new Date();
export const TOD_Y = today.getFullYear();
export const TOD_M = today.getMonth();
export const TOD_D = today.getDate();

let saveTimeout = null;
let saveInFlight = false;
let saveQueuedWhileInFlight = false;
let saveRequestToken = 0;

function collectLocalPlans() {
  const plans = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("radplan_v3_plan_")) {
      try {
        plans[k.replace("radplan_v3_plan_", "")] = JSON.parse(localStorage.getItem(k));
      } catch (err) {
        console.error("Fehler beim Parsen eines lokalen Plans:", err);
      }
    }
  }
  return plans;
}

function replaceLocalPlans(plans) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith("radplan_v3_plan_")) {
      localStorage.removeItem(key);
    }
  }
  if (plans && typeof plans === "object") {
    for (const [pk, pv] of Object.entries(plans)) {
      localStorage.setItem(`radplan_v3_plan_${pk}`, JSON.stringify(pv));
    }
  }
}

function applyServerSnapshot(serverData) {
  serverLastModified = parseInt(serverData.lastModified, 10) || 0;
  const newMain = serverData.main ? serverData.main : serverData;

  Object.keys(DATA).forEach((k) => delete DATA[k]);
  Object.assign(DATA, newMain);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));

  let snapshotChanged = false;
  Object.entries(DATA).forEach(([key, md]) => {
    normalizeMonthDataShape(md);
    const [yearPart, monthPart] = key.split("-");
    snapshotChanged = reconcileEmployeesForMonth(md, parseInt(yearPart, 10), parseInt(monthPart, 10)) || snapshotChanged;
  });
  if (snapshotChanged) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  }

  replaceLocalPlans(serverData.plans || {});
}

async function flushSaveToServer() {
  if (saveInFlight) {
    saveQueuedWhileInFlight = true;
    return;
  }

  if (!serverFetchSuccessful) {
    const synced = await forceSyncWithServer();
    if (!synced) {
      window.dispatchEvent(new CustomEvent("radplan-save-error"));
      return;
    }
  }

  saveInFlight = true;
  window.dispatchEvent(new CustomEvent("radplan-save-start"));

  const requestToken = ++saveRequestToken;

  try {
    const payload = {
      main: DATA,
      plans: collectLocalPlans(),
      lastModified: serverLastModified
    };

    const res = await fetch(`/api?t=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 409) {
      const conflictData = await res.json();
      if (conflictData.latestData) {
        applyServerSnapshot(conflictData.latestData);
        serverFetchSuccessful = true;
        window.dispatchEvent(new CustomEvent("radplan-sync-conflict"));
      }
      return;
    }

    if (!res.ok) {
      console.error("saveToStorage HTTP Error:", res.status);
      window.dispatchEvent(new CustomEvent("radplan-save-error"));
      return;
    }

    const resData = await res.json();
    if (resData.lastModified) {
      serverLastModified = parseInt(resData.lastModified, 10) || 0;
      serverFetchSuccessful = true;
    }

    if (requestToken === saveRequestToken) {
      window.dispatchEvent(new CustomEvent("radplan-save-success"));
    }
  } catch (e) {
    console.error("saveToStorage Network/Parse Error:", e);
    window.dispatchEvent(new CustomEvent("radplan-save-error"));
  } finally {
    saveInFlight = false;
    if (saveQueuedWhileInFlight) {
      saveQueuedWhileInFlight = false;
      flushSaveToServer();
    }
  }
}

export async function loadFromStorage() {
  let loadedData = null;
  let loadedFromServer = false;
  serverFetchSuccessful = false;
  
  try {
    const res = await fetch(`/api?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    
    if (res.ok) {
      const serverData = await res.json();
      serverFetchSuccessful = true;
      applyServerSnapshot(serverData.main ? serverData : { main: serverData, plans: {}, lastModified: serverData.lastModified });
      loadedFromServer = true;
    } else {
      console.error("loadFromStorage HTTP Error:", res.status);
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) {
        loadedData = JSON.parse(r);
      }
    }
  } catch (e) {
    console.error("loadFromStorage Network/Parse Error:", e);
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) {
      loadedData = JSON.parse(r);
    }
  }
  
  if (loadedData && !loadedFromServer) {
    Object.keys(DATA).forEach((k) => delete DATA[k]);
    Object.assign(DATA, loadedData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  }
  
  let loadedDataChanged = false;
  Object.entries(DATA).forEach(([key, md]) => {
    normalizeMonthDataShape(md);
    const [yearPart, monthPart] = key.split("-");
    loadedDataChanged = reconcileEmployeesForMonth(md, parseInt(yearPart, 10), parseInt(monthPart, 10)) || loadedDataChanged;
  });
  if (loadedDataChanged) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  }
}

export function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  
  window.dispatchEvent(new CustomEvent("radplan-save-queued"));
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    flushSaveToServer();
  }, 120);
}

export async function syncWithServer() {
  try {
    const res = await fetch(`/api?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    
    if (!res.ok) {
      console.error("syncWithServer HTTP Error:", res.status);
      return false;
    }
    
    const serverData = await res.json();
    serverFetchSuccessful = true;
    const incomingMod = parseInt(serverData.lastModified, 10) || 0;
    
    if (incomingMod > 0 && incomingMod > serverLastModified) {
      applyServerSnapshot(serverData.main ? serverData : { main: serverData, plans: {}, lastModified: incomingMod });
      window.dispatchEvent(new CustomEvent("radplan-sync-update"));
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("syncWithServer Network/Parse Error:", e);
    return false;
  }
}

export async function forceSyncWithServer() {
  try {
    const res = await fetch(`/api?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    
    if (!res.ok) {
      console.error("forceSyncWithServer HTTP Error:", res.status);
      return false;
    }
    
    const text = await res.text();
    if (!text) {
      console.error("forceSyncWithServer Error: Empty response body");
      return false;
    }
    
    const serverData = JSON.parse(text);
    serverFetchSuccessful = true;
    applyServerSnapshot(serverData.main ? serverData : { main: serverData, plans: {}, lastModified: serverData.lastModified });
    
    window.dispatchEvent(new CustomEvent("radplan-sync-update"));
    return true;
  } catch (e) {
    console.error("forceSyncWithServer Network/Parse Error:", e);
    return false;
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
