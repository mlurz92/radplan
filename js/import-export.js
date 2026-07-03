// RadPlan — Drucken, JSON-Export/-Import (inkl. Drag & Drop) für den
// gesamten Datenbestand. Extrahiert aus dem früher monolithischen app.js.

import { DATA, saveToStorage, collectLocalPlans } from './state.js';
import { ensurePostBDFreiDays } from './model.js';
import { normalizeMonthDataShape } from './constants.js';
import { render } from './render-grid.js';
import { showOverlay, hideOverlay, showToast } from './render-modals.js';

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function assertNoUnsafeKeys(value, path = "") {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) {
      throw new Error(`Unzulässiger Schlüssel "${key}" in ${path || "Daten"}`);
    }
    assertNoUnsafeKeys(value[key], path ? `${path}.${key}` : key);
  }
}

export function doExport() {
  const exportObj = { main: DATA, plans: collectLocalPlans() };
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
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Ungültiges Format");
    }
    assertNoUnsafeKeys(parsed);

    const hasEnvelope = parsed.main && typeof parsed.main === "object" && !Array.isArray(parsed.main);
    const mainData = hasEnvelope ? parsed.main : parsed;
    for (const monthData of Object.values(mainData)) {
      normalizeMonthDataShape(monthData);
    }

    if (hasEnvelope && parsed.plans && typeof parsed.plans === "object") {
      for (const [pk, pv] of Object.entries(parsed.plans)) {
        if (pv && typeof pv === "object" && !pv.rbn) {
          pv.rbn = {};
        }
        localStorage.setItem(`radplan_v3_plan_${pk}`, JSON.stringify(pv));
      }
    }

    Object.assign(DATA, mainData);

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

