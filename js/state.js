import {
  STORAGE_KEY,
  normalizeMonthDataShape,
  reconcileEmployeesForMonth,
  monthKey
} from "./constants.js";

// Helper function to create reactive/dynamic proxy for deeply nested objects.
function createDynamicProxy(targetGetter, onChange) {
  const createChildProxy = (val) => {
    if (val !== null && typeof val === "object") {
      return new Proxy(val, {
        get(t, p, r) {
          const v = Reflect.get(t, p, r);
          return createChildProxy(v);
        },
        set(t, p, v, r) {
          const old = Reflect.get(t, p, r);
          if (old !== v) {
            const ok = Reflect.set(t, p, v, r);
            if (ok) onChange();
            return ok;
          }
          return Reflect.set(t, p, v, r);
        },
        defineProperty(t, p, d) {
          const ok = Reflect.defineProperty(t, p, d);
          if (ok) onChange();
          return ok;
        },
        deleteProperty(t, p) {
          const ok = Reflect.deleteProperty(t, p);
          if (ok) onChange();
          return ok;
        }
      });
    }
    return val;
  };

  return new Proxy({}, {
    get(_target, prop) {
      const activeTarget = targetGetter();
      const val = Reflect.get(activeTarget, prop);
      return createChildProxy(val);
    },
    set(_target, prop, value) {
      const activeTarget = targetGetter();
      const oldVal = Reflect.get(activeTarget, prop);
      if (oldVal !== value) {
        const ok = Reflect.set(activeTarget, prop, value);
        if (ok) onChange();
        return ok;
      }
      return Reflect.set(activeTarget, prop, value);
    },
    defineProperty(_target, prop, descriptor) {
      const activeTarget = targetGetter();
      const ok = Reflect.defineProperty(activeTarget, prop, descriptor);
      if (ok) onChange();
      return ok;
    },
    deleteProperty(_target, prop) {
      const activeTarget = targetGetter();
      const ok = Reflect.deleteProperty(activeTarget, prop);
      if (ok) onChange();
      return ok;
    },
    ownKeys(_target) {
      return Reflect.ownKeys(targetGetter());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(targetGetter(), prop);
    },
    has(_target, prop) {
      return Reflect.has(targetGetter(), prop);
    }
  });
}

// Unified State Store class
class UnifiedStore {
  constructor() {
    this.listeners = new Set();
    this._data = {};
    this._state = {
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
        sort: "name",
        activeOnly: false,
        analyticsRange: "month",
        customStart: null,
        customEnd: null
      },
      periodDraft: {
        year: new Date().getFullYear(),
        month: new Date().getMonth()
      },
      profileEmp: null,
      multiEdit: {
        emp: null,
        days: [],
        anchor: null
      }
    };
    this._deptTab = "month";
    this._planMode = false;
    this._planData = null;
    this._planBaseline = null;
    this._planHistory = [];
    this._planHistoryIdx = -1;
    this._planSessions = {};
    this._IS_MOBILE = false;
    this._responsiveLayoutRaf = 0;
    this._serverLastModified = 0;
    this._serverFetchSuccessful = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  notify(key, value) {
    for (const listener of this.listeners) {
      try {
        listener(key, value, this);
      } catch (err) {
        console.error("Error in state subscriber:", err);
      }
    }
  }

  // Getters/setters
  get DATA() { return this._data; }
  set DATA(val) {
    this._data = val;
    this.notify("DATA", val);
  }

  get state() { return this._state; }
  set state(val) {
    this._state = val;
    this.notify("state", val);
  }

  get deptTab() { return this._deptTab; }
  set deptTab(val) {
    this._deptTab = val;
    this.notify("deptTab", val);
  }

  get planMode() { return this._planMode; }
  set planMode(val) {
    this._planMode = val;
    this.notify("planMode", val);
  }

  get planData() { return this._planData; }
  set planData(val) {
    this._planData = val;
    this.notify("planData", val);
  }

  get planBaseline() { return this._planBaseline; }
  set planBaseline(val) {
    this._planBaseline = val;
    this.notify("planBaseline", val);
  }

  get planHistory() { return this._planHistory; }
  set planHistory(val) {
    this._planHistory = val;
    this.notify("planHistory", val);
  }

  get planHistoryIdx() { return this._planHistoryIdx; }
  set planHistoryIdx(val) {
    this._planHistoryIdx = val;
    this.notify("planHistoryIdx", val);
  }

  get planSessions() { return this._planSessions; }
  set planSessions(val) {
    this._planSessions = val;
    this.notify("planSessions", val);
  }

  get IS_MOBILE() { return this._IS_MOBILE; }
  set IS_MOBILE(val) {
    this._IS_MOBILE = val;
    this.notify("IS_MOBILE", val);
  }

  get responsiveLayoutRaf() { return this._responsiveLayoutRaf; }
  set responsiveLayoutRaf(val) {
    this._responsiveLayoutRaf = val;
    this.notify("responsiveLayoutRaf", val);
  }

  get serverLastModified() { return this._serverLastModified; }
  set serverLastModified(val) {
    this._serverLastModified = val;
    this.notify("serverLastModified", val);
  }

  get serverFetchSuccessful() { return this._serverFetchSuccessful; }
  set serverFetchSuccessful(val) {
    this._serverFetchSuccessful = val;
    this.notify("serverFetchSuccessful", val);
  }
}

export const store = new UnifiedStore();

// Proxies for backward compatibility and reactive updates
export const DATA = createDynamicProxy(() => store.DATA, () => store.notify("DATA", store.DATA));
export const state = createDynamicProxy(() => store.state, () => store.notify("state", store.state));

export let deptTab = store.deptTab;
export let planMode = store.planMode;
export let planData = store.planData;
export let planBaseline = store.planBaseline;
export let planHistory = store.planHistory;
export let planHistoryIdx = store.planHistoryIdx;
export let planSessions = store.planSessions;
export let IS_MOBILE = store.IS_MOBILE;
export let responsiveLayoutRaf = store.responsiveLayoutRaf;
export let serverLastModified = store.serverLastModified;
export let serverFetchSuccessful = store.serverFetchSuccessful;

// Synchronize backward-compatible exported variables when the store updates
store.subscribe((key, val) => {
  if (key === "deptTab") deptTab = val;
  else if (key === "planMode") planMode = val;
  else if (key === "planData") planData = val;
  else if (key === "planBaseline") planBaseline = val;
  else if (key === "planHistory") planHistory = val;
  else if (key === "planHistoryIdx") planHistoryIdx = val;
  else if (key === "planSessions") planSessions = val;
  else if (key === "IS_MOBILE") IS_MOBILE = val;
  else if (key === "responsiveLayoutRaf") responsiveLayoutRaf = val;
  else if (key === "serverLastModified") serverLastModified = val;
  else if (key === "serverFetchSuccessful") serverFetchSuccessful = val;
});

export const today = new Date();
export const TOD_Y = today.getFullYear();
export const TOD_M = today.getMonth();
export const TOD_D = today.getDate();

let saveTimeout = null;
let saveInFlight = false;
let saveQueuedWhileInFlight = false;
let saveRequestToken = 0;
let lastSyncedSnapshot = null;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeThreeWay(base, local, server, stats) {
  if (deepEqual(local, server)) return local;
  if (deepEqual(local, base)) {
    stats.serverWins++;
    return server;
  }
  if (deepEqual(server, base)) {
    stats.localWins++;
    return local;
  }

  if (isPlainObject(base) && isPlainObject(local) && isPlainObject(server)) {
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(server)]);
    const out = {};
    keys.forEach((k) => {
      out[k] = mergeThreeWay(base[k], local[k], server[k], stats);
    });
    return out;
  }

  stats.conflicts++;
  return local;
}

function mergePlanDrafts(localPlans, serverPlans, activeKey) {
  const merged = { ...(serverPlans ?? {}) };
  if (activeKey && localPlans?.[activeKey]) {
    merged[activeKey] = localPlans[activeKey];
  }
  return merged;
}

function collectLocalPlans() {
  const plans = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("radplan_v3_plan_")) {
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
    if (key?.startsWith("radplan_v3_plan_")) {
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
  store.serverLastModified = parseInt(serverData.lastModified, 10) || 0;
  const newMain = serverData.main ?? serverData;

  Object.keys(DATA).forEach((k) => delete DATA[k]);
  Object.assign(DATA, newMain);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));

  let snapshotChanged = false;
  Object.entries(DATA).forEach(([key, md]) => {
    normalizeMonthDataShape(md);
    const [yearPart, monthPart] = key.split("-");
    snapshotChanged =
      reconcileEmployeesForMonth(md, parseInt(yearPart, 10), parseInt(monthPart, 10)) ||
      snapshotChanged;
  });
  if (snapshotChanged) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  }

  replaceLocalPlans(serverData.plans ?? {});
  lastSyncedSnapshot = structuredClone(DATA);
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
        const serverMain = conflictData.latestData.main || conflictData.latestData;
        const base = lastSyncedSnapshot ?? {};
        const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
        const mergedMain = mergeThreeWay(base, DATA, serverMain, stats);

        Object.keys(DATA).forEach((k) => delete DATA[k]);
        Object.assign(DATA, mergedMain);
        Object.values(DATA).forEach((md) => normalizeMonthDataShape(md));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));

        const activeKey = planMode ? monthKey(state.year, state.month) : null;
        const mergedPlans = mergePlanDrafts(
          collectLocalPlans(),
          conflictData.latestData.plans ?? {},
          activeKey
        );
        replaceLocalPlans(mergedPlans);

        store.serverLastModified = parseInt(conflictData.latestData.lastModified, 10) || 0;
        store.serverFetchSuccessful = true;
        lastSyncedSnapshot = structuredClone(DATA);

        window.dispatchEvent(new CustomEvent("radplan-sync-conflict", { detail: stats }));

        if (stats.localWins > 0 || stats.conflicts > 0) {
          flushSaveToServer();
        }
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
      store.serverLastModified = parseInt(resData.lastModified, 10) || 0;
      store.serverFetchSuccessful = true;
    }
    lastSyncedSnapshot = structuredClone(DATA);

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
  store.serverFetchSuccessful = false;

  try {
    const res = await fetch(`/api?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    if (res.ok) {
      const serverData = await res.json();
      store.serverFetchSuccessful = true;
      applyServerSnapshot(
        serverData.main
          ? serverData
          : { main: serverData, plans: {}, lastModified: serverData.lastModified }
      );
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

  if (loadedFromServer) {
    return;
  }

  let loadedDataChanged = false;
  Object.entries(DATA).forEach(([key, md]) => {
    const parts = key.split("-");
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        normalizeMonthDataShape(md);
        loadedDataChanged = reconcileEmployeesForMonth(md, y, m) || loadedDataChanged;
      }
    }
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
    store.serverFetchSuccessful = true;
    const incomingMod = parseInt(serverData.lastModified, 10) || 0;

    if (incomingMod > 0 && incomingMod > serverLastModified) {
      applyServerSnapshot(
        serverData.main ? serverData : { main: serverData, plans: {}, lastModified: incomingMod }
      );
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
    store.serverFetchSuccessful = true;
    applyServerSnapshot(
      serverData.main
        ? serverData
        : { main: serverData, plans: {}, lastModified: serverData.lastModified }
    );

    window.dispatchEvent(new CustomEvent("radplan-sync-update"));
    return true;
  } catch (e) {
    console.error("forceSyncWithServer Network/Parse Error:", e);
    return false;
  }
}

export function setDeptTab(val) {
  store.deptTab = val;
}

export function setPlanMode(val) {
  store.planMode = val;
}

export function setPlanData(val) {
  store.planData = val;
}

export function setPlanBaseline(val) {
  store.planBaseline = val;
}

export function setPlanHistory(val) {
  store.planHistory = val;
}

export function setPlanHistoryIdx(val) {
  store.planHistoryIdx = val;
}

export function setPlanSessions(val) {
  store.planSessions = val;
}

export function setIsMobile(val) {
  store.IS_MOBILE = val;
}

export function setResponsiveLayoutRaf(val) {
  store.responsiveLayoutRaf = val;
}
