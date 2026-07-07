import { STORAGE_KEY, normalizeMonthDataShape, reconcileEmployeesForMonth, monthKey } from './constants.js';

// `DATA` bleibt absichtlich ein von außen direkt lesbares/mutierbares Objekt:
// die Zell-Ebene (model.js getCell/setCell u.a., render-grid.js, autoplan.js)
// greift an Dutzenden Stellen granular auf einzelne Monat->Mitarbeiter->Tag-
// Pfade zu, und das ohne Framework/Build-Schritt über eine Setter-Methode pro
// Feld zu kapseln, würde die Codebase aufblähen ohne einen echten Fehlerklasse
// zu verhindern (die Cell-Shape wird zentral in constants.js normalisiert).
// Was NICHT dezentral nachgebaut werden soll, ist das komplette Ersetzen des
// gesamten Datenbestands (Server-Sync, Undo/Redo-Restore, Import) — dafür gibt
// es ausschließlich `replaceAllData()` weiter unten; siehe dort.
export let DATA = {};

// Einzige zulässige Stelle, um den kompletten Dateninhalt von `DATA` durch
// einen neuen Stand zu ersetzen (Server-Sync, Undo/Redo, Import). Ersetzt die
// vormals an vier Stellen (dreimal hier, einmal dupliziert in history.js)
// unabhängig voneinander geschriebene "delete alle Keys, dann Object.assign"-
// Sequenz. Reine Objektinhalts-Ersetzung ohne Normalisierung/Persistenz —
// beides bleibt bewusst Sache der jeweiligen Aufrufer, deren Anforderungen
// daran sich leicht unterscheiden (siehe applyServerSnapshot vs. loadFromStorage).
export function replaceAllData(newData) {
  Object.keys(DATA).forEach((k) => delete DATA[k]);
  Object.assign(DATA, newData || {});
}

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
    sort: "name",
    activeOnly: false,
    analyticsRange: "month",
    customStart: null,
    customEnd: null,
  },
  periodDraft: {
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  },
  profileEmp: null,
  profileCalView: "month",
  empScreen: "team",
  profileTab: "overview",
  multiEdit: {
    emp: null,
    days: [],
    anchor: null,
  },
  isAutoplanRunning: false, // Vorschlag 9: Mutex-Sperre für Autoplan-Berechnungsphasen
};

export let deptTab = "month";
export let planMode = false;
export let planData = null;
export let planBaseline = null;
export let planHistory = [];
export let planHistoryIdx = -1;
export let planSessions = {};
export let IS_MOBILE = false;
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
let lastSyncedSnapshot = null;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Ermittelt, welche Monats-Keys ("YYYY-M") sich zwischen zwei flachen
// `main`-Objekten inhaltlich unterscheiden (hinzugekommen, entfernt oder
// verändert). Wird für Server-Sync-Events genutzt, damit Konsumenten (siehe
// history.js) einen eingehenden Sync gezielt auf den gerade aktiv bearbeiteten
// Monat prüfen können, statt bei JEDER Hintergrund-Aktualisierung (auch für
// völlig unbeteiligte Monate) reflexartig zu reagieren.
export function computeChangedMonthKeys(oldMain, newMain) {
  const changed = [];
  const keys = new Set([...Object.keys(oldMain || {}), ...Object.keys(newMain || {})]);
  keys.forEach((k) => {
    if (!deepEqual(oldMain?.[k], newMain?.[k])) {
      changed.push(k);
    }
  });
  return changed;
}

// Prüft, ob eine Liste geänderter Monats-Keys (siehe computeChangedMonthKeys)
// den angegebenen Jahr/Monat betrifft. Fällt `changedMonths` nicht als Array
// vor (z. B. ein älterer/unbekannter Aufrufer, der das Event ohne Detail
// feuert), wird konservativ `true` zurückgegeben -- im Zweifel lieber einmal
// zu oft invalidieren als einen echten Datenbruch zu riskieren.
export function isMonthAffectedBySync(changedMonths, year, month) {
  if (!Array.isArray(changedMonths)) return true;
  return changedMonths.includes(monthKey(year, month));
}

// Field-level 3-way merge (base = last known server state, local = our unsaved
// edits, server = the state we just lost the 409 race against). Recurses into
// plain-object trees (month -> employee -> day -> cell) so only the individual
// fields that genuinely changed on both sides since `base` are treated as
// conflicts; everything else is merged automatically without data loss.
//
// Vorschlag 17 (Konfliktlösungs-UX): echte Konflikte (beide Seiten haben seit
// `base` denselben Feldpfad unterschiedlich geändert) werden nicht nur
// gezählt, sondern mit Pfad + beiden Werten in `stats.conflictDetails`
// gesammelt. So kann die UI dem Nutzer nach dem automatischen Merge (der im
// Konfliktfall defensiv den lokalen Stand behält, siehe `return local`
// unten) eine Liste der betroffenen Felder zeigen und pro Feld optional den
// Server-Wert nachträglich übernehmen lassen (siehe `applyConflictChoice`).
// Auf sehr viele gleichzeitige Konflikte begrenzt (MAX_CONFLICT_DETAILS),
// damit ein pathologischer Merge (z. B. ein komplett neu importierter Plan)
// keine unbegrenzt wachsende Detail-Liste erzeugt.
const MAX_CONFLICT_DETAILS = 200;

export function mergeThreeWay(base, local, server, stats, path = []) {
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
      out[k] = mergeThreeWay(base[k], local[k], server[k], stats, path.concat(k));
    });
    return out;
  }

  stats.conflicts++;
  if (!stats.conflictDetails) stats.conflictDetails = [];
  if (stats.conflictDetails.length < MAX_CONFLICT_DETAILS) {
    stats.conflictDetails.push({ path, local, server });
  }
  return local;
}

// Setzt einen per `mergeThreeWay`-Pfad adressierten Wert in DATA (z. B.
// ["2026-3", "assignments", "Dr. Lurz", "12", "duty"]). Legt fehlende
// Zwischenobjekte NICHT an — ein Konflikt-Pfad existiert nach dem Merge per
// Definition bereits (der lokale Zweig wurde ja übernommen).
function setDeepPath(root, path, value) {
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isPlainObject(node[path[i]])) return false;
    node = node[path[i]];
  }
  node[path[path.length - 1]] = value;
  return true;
}

let lastConflictDetails = /** @type {{path: (string|number)[], local: any, server: any}[]} */ ([]);

export function getLastConflictDetails() {
  return lastConflictDetails;
}

// Einzige zulässige Stelle, um die zuletzt gemeldeten Merge-Konflikte zu
// setzen (aufgerufen direkt nach `mergeThreeWay`, siehe der 409-Handler in
// `flushSaveToServer` unten) — separat exportiert statt inline zugewiesen,
// damit auch Tests den Zustand für `applyConflictChoice` gezielt vorbereiten
// können, ohne einen echten Netzwerk-Konflikt zu simulieren.
export function setLastConflictDetails(details) {
  lastConflictDetails = Array.isArray(details) ? details : [];
}

// Vorschlag 17: erlaubt es der Konflikt-UI, für einen einzelnen zuvor per
// `mergeThreeWay` gemeldeten Konflikt nachträglich den Server-Wert statt des
// (defensiv gewählten) lokalen Werts zu übernehmen. Persistiert sofort und
// stößt einen neuen Speichervorgang an, damit die Korrektur auch am Server
// ankommt.
export function applyConflictChoice(path, choice) {
  const idx = lastConflictDetails.findIndex((c) => JSON.stringify(c.path) === JSON.stringify(path));
  if (idx === -1) return false;
  const detail = lastConflictDetails[idx];
  if (choice === 'server') {
    if (!setDeepPath(DATA, detail.path, detail.server)) return false;
    const monthK = detail.path[0];
    if (typeof monthK === 'string' && DATA[monthK]) normalizeMonthDataShape(DATA[monthK]);
  }
  lastConflictDetails = lastConflictDetails.filter((_, i) => i !== idx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  window.dispatchEvent(new CustomEvent('radplan-conflict-detail-resolved', { detail: { remaining: lastConflictDetails.length } }));
  saveToStorage();
  return true;
}

function mergePlanDrafts(localPlans, serverPlans, activeKey) {
  const merged = { ...(serverPlans || {}) };
  if (activeKey && localPlans[activeKey]) {
    merged[activeKey] = localPlans[activeKey];
  }
  return merged;
}

export function collectLocalPlans() {
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

// Gibt zusätzlich die Liste der inhaltlich veränderten Monats-Keys zurück
// (Vergleich gegen den DATA-Stand VOR dem Ersetzen), damit Aufrufer (siehe
// syncWithServer/forceSyncWithServer) das `radplan-sync-update`-Event mit
// dieser Information anreichern können.
function applyServerSnapshot(serverData) {
  serverLastModified = parseInt(serverData.lastModified, 10) || 0;
  const newMain = serverData.main ? serverData.main : serverData;

  const changedMonths = computeChangedMonthKeys(DATA, newMain);

  replaceAllData(newMain);
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
  // structuredClone() statt JSON.stringify+parse: gleiches Ergebnis (tiefe,
  // unabhängige Kopie von DATA), aber ohne den Umweg über einen String —
  // spart bei der Größe von DATA eine vollständige Serialisierung pro Sync.
  lastSyncedSnapshot = structuredClone(DATA);

  return changedMonths;
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
        const base = lastSyncedSnapshot || {};
        const stats = { conflicts: 0, localWins: 0, serverWins: 0, conflictDetails: [] };
        const mergedMain = mergeThreeWay(base, DATA, serverMain, stats);
        lastConflictDetails = stats.conflictDetails;

        replaceAllData(mergedMain);
        Object.values(DATA).forEach((md) => normalizeMonthDataShape(md));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));

        const activeKey = planMode ? monthKey(state.year, state.month) : null;
        const mergedPlans = mergePlanDrafts(collectLocalPlans(), conflictData.latestData.plans || {}, activeKey);
        replaceLocalPlans(mergedPlans);

        serverLastModified = parseInt(conflictData.latestData.lastModified, 10) || 0;
        serverFetchSuccessful = true;
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
      serverLastModified = parseInt(resData.lastModified, 10) || 0;
      serverFetchSuccessful = true;
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
    replaceAllData(loadedData);
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
    serverFetchSuccessful = true;
    const incomingMod = parseInt(serverData.lastModified, 10) || 0;
    
    if (incomingMod > 0 && incomingMod > serverLastModified) {
      const changedMonths = applyServerSnapshot(serverData.main ? serverData : { main: serverData, plans: {}, lastModified: incomingMod });
      window.dispatchEvent(new CustomEvent("radplan-sync-update", { detail: { changedMonths } }));
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
    const changedMonths = applyServerSnapshot(serverData.main ? serverData : { main: serverData, plans: {}, lastModified: serverData.lastModified });

    window.dispatchEvent(new CustomEvent("radplan-sync-update", { detail: { changedMonths } }));
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


