// RadPlan — Drucken, JSON-Export/-Import (inkl. Drag & Drop) für den
// gesamten Datenbestand. Extrahiert aus dem früher monolithischen app.js.

import { MONTHS } from './constants.js';
import { state, planMode, DATA, saveToStorage } from './state.js';
import { ensurePostBDFreiDays } from './model.js';
import { render } from './render-grid.js';
import { showOverlay, hideOverlay, showToast } from './render-modals.js';

export function printPlan() {
  const { year, month } = state;
  const titleEl = document.getElementById("print-header-period");
  if (titleEl) titleEl.textContent = `${MONTHS[month]} ${year}`;
  const metaEl = document.getElementById("print-header-meta");
  if (metaEl) {
    metaEl.textContent = `Gedruckt am ${new Date().toLocaleDateString("de-DE")}${planMode ? " · Planungsentwurf" : ""}`;
  }
  document.title = `RadPlan — ${MONTHS[month]} ${year}`;

  const table = document.getElementById("plan-table");
  const rows = table ? table.querySelectorAll("tr").length : 0;
  const USABLE_H = 680;
  const PRINT_ROW_H = 15;
  const estHeight = rows * PRINT_ROW_H + 24;
  const scale = Math.min(1, USABLE_H / Math.max(estHeight, 1));
  document.documentElement.style.setProperty("--print-scale", scale.toFixed(4));

  window.print();
}

export function doExport() {
  const plans = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("radplan_v3_plan_")) {
      try {
        plans[k.replace("radplan_v3_plan_", "")] = JSON.parse(localStorage.getItem(k));
      } catch (e) {}
    }
  }
  
  const exportObj = { main: DATA, plans };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `radplan_${new Date().toISOString().slice(0, 10)}.json`,
  });
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Daten exportiert");
}

export function openImportModal() {
  const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById("import-ta"));
  if (ta) ta.value = "";

  const err = document.getElementById("import-err");
  if (err) err.style.display = "none";

  const dz = document.getElementById("import-dropzone");
  const fn = document.getElementById("dz-filename");
  const fi = /** @type {HTMLInputElement} */ (document.getElementById("import-file-input"));

  if (dz) dz.classList.remove("has-file", "drag-over");
  if (fn) fn.textContent = "";
  if (fi) fi.value = "";

  showOverlay("modal-import");
}

export function doImport() {
  const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById("import-ta"));
  if (!ta) return;
  
  const raw = ta.value.trim();
  const errEl = document.getElementById("import-err");
  if (errEl) errEl.style.display = "none";
  
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Ungültiges Format");
    }
    
    if (parsed.main && typeof parsed.main === "object") {
      Object.assign(DATA, parsed.main);
      if (parsed.plans && typeof parsed.plans === "object") {
        for (const [pk, pv] of Object.entries(parsed.plans)) {
          if (pv && typeof pv === "object" && !pv.rbn) {
            pv.rbn = {};
          }
          localStorage.setItem(`radplan_v3_plan_${pk}`, JSON.stringify(pv));
        }
      }
    } else {
      Object.assign(DATA, parsed);
    }
    
    saveToStorage();
    const repaired = ensurePostBDFreiDays();
    hideOverlay("modal-import");
    render();
    showToast("Daten erfolgreich importiert" + (repaired > 0 ? ` · ${repaired} Ruhetage ergänzt` : ""));
  } catch (e) {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Fehler: " + e.message;
    }
  }
}

export function initDragDrop() {
  const dz = document.getElementById("import-dropzone");
  const fi = /** @type {HTMLInputElement} */ (document.getElementById("import-file-input"));

  if (!dz || !fi) return;

  dz.addEventListener("click", (e) => {
    if (e.target !== fi) {
      fi.click();
    }
  });

  fi.addEventListener("change", (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const f = target.files[0];
    if (f) {
      handleDroppedFile(f);
    }
    target.value = "";
  });
  
  dz.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dz.classList.add("drag-over");
  });
  
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.add("drag-over");
  });
  
  dz.addEventListener("dragleave", (e) => {
    if (!dz.contains(/** @type {Node} */ (e.relatedTarget))) {
      dz.classList.remove("drag-over");
    }
  });
  
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove("drag-over");
    const f = e.dataTransfer.files[0];
    if (f) {
      handleDroppedFile(f);
    }
  });
}

export function handleDroppedFile(file) {
  const errEl = document.getElementById("import-err");
  const dz = document.getElementById("import-dropzone");
  const fnEl = document.getElementById("dz-filename");
  
  if (errEl) errEl.style.display = "none";
  if (dz) dz.classList.remove("has-file");
  
  if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Fehler: Nur .json-Dateien";
    }
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById("import-ta"));
    if (ta) ta.value = /** @type {string} */ (/** @type {FileReader} */ (ev.target).result);
    if (fnEl) {
      fnEl.textContent = file.name;
    }
    if (dz) dz.classList.add("has-file");
  };
  
  reader.onerror = () => {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Fehler beim Lesen der Datei";
    }
  };
  
  reader.readAsText(file, "UTF-8");
}

