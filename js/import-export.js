// RadPlan — Drucken, JSON-Export/-Import (inkl. Drag & Drop) für den
// gesamten Datenbestand. Extrahiert aus dem früher monolithischen app.js.

import { DATA, state, planMode, replaceAllData, saveToStorage, collectLocalPlans } from './state.js';
import { ensurePostBDFreiDays, getMonthData, applyPdfDutySchedule } from './model.js';
import {
  normalizeMonthDataShape,
  ABSENCE_CODES,
  EMP_META,
  MONTHS,
  isEmployeeActiveInMonth,
  getRbnOptionsForDate,
  isRbnMonthVisible,
} from './constants.js';
import { render } from './render-grid.js';
import { showOverlay, hideOverlay, showToast } from './render-modals.js';
import { extractPdfTextItems } from './pdf-text.js';
import { parseDutySchedulePages, resolveDutySchedule } from './pdf-schedule.js';
import { switchPeriod } from './period.js';

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

  clearPendingPdfImport();
  showOverlay("modal-import");
}

export function validateImportSchema(mainData) {
  if (typeof mainData !== "object" || mainData === null || Array.isArray(mainData)) {
    throw new Error("Fehler: Die Daten müssen ein JSON-Objekt sein.");
  }
  
  const monthKeyRegex = /^\d{4}-\d{1,2}$/;
  for (const [key, mData] of Object.entries(mainData)) {
    if (!monthKeyRegex.test(key)) {
      throw new Error(`Fehler: Ungültiger Monatsschlüssel "${key}". Erwartet wird das Format YYYY-M.`);
    }
    if (typeof mData !== "object" || mData === null || Array.isArray(mData)) {
      throw new Error(`Fehler: Die Monatsdaten für "${key}" müssen ein Objekt sein.`);
    }
    if (mData.employees !== undefined && !Array.isArray(mData.employees)) {
      throw new Error(`Fehler: Das Feld "employees" im Monat "${key}" muss ein Array sein.`);
    }
    if (mData.employees && mData.employees.some(emp => typeof emp !== "string")) {
      throw new Error(`Fehler: Der Mitarbeitername im Monat "${key}" muss ein Text sein.`);
    }
    if (mData.assignments !== undefined && (typeof mData.assignments !== "object" || mData.assignments === null || Array.isArray(mData.assignments))) {
      throw new Error(`Fehler: Das Feld "assignments" im Monat "${key}" muss ein Objekt sein.`);
    }
    if (mData.rbn !== undefined && (typeof mData.rbn !== "object" || mData.rbn === null || Array.isArray(mData.rbn))) {
      throw new Error(`Fehler: Das Feld "rbn" im Monat "${key}" muss ein Objekt sein.`);
    }
    if (mData.comments !== undefined && (typeof mData.comments !== "object" || mData.comments === null || Array.isArray(mData.comments))) {
      throw new Error(`Fehler: Das Feld "comments" im Monat "${key}" muss ein Objekt sein.`);
    }
  }
}

export function doImport() {
  if (pendingPdfImport) {
    applyPendingPdfImport();
    return;
  }

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
    
    // Vorschlag 4: Poka-Yoke Schema- & Datenintegritätsprüfung
    validateImportSchema(mainData);

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

    replaceAllData(mainData);

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
  clearPendingPdfImport();

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    void stageDutySchedulePdf(file);
    return;
  }

  if (!lowerName.endsWith(".json") && file.type !== "application/json") {
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Fehler: Nur .json- oder .pdf-Dateien";
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

// ── PDF-Monatsdienstplan importieren ────────────────────────────────────────
// Aus einem PDF nach dem Schema "Tag | Wochentag | BD | HG | RBN | 2. RBN"
// werden die Bereitschaftsdienste (BD → "D"), die Hintergrunddienste (HG) und
// die erste RBN-Spalte für den im PDF genannten Monat übernommen. Die Spalte
// "2. RBN" wird bewusst nicht importiert, weil RadPlan je Tag genau eine
// RBN-Besetzung führt.
//
// Der Ablauf ist zweistufig: Ablegen der Datei wertet das PDF nur aus und
// zeigt eine Zusammenfassung; erst "Importieren" schreibt in den Plan.

/** @type {{ resolved: any, fileName: string, monthLabel: string }|null} */
let pendingPdfImport = null;

function clearPendingPdfImport() {
  pendingPdfImport = null;
  const box = document.getElementById("import-pdf-summary");
  if (box) {
    box.textContent = "";
    box.hidden = true;
  }
  setJsonInputVisible(true);
  setImportButtonLabel("Importieren");
}

function setJsonInputVisible(visible) {
  const divider = document.getElementById("import-json-divider");
  const ta = document.getElementById("import-ta");
  if (divider) divider.hidden = !visible;
  if (ta) ta.hidden = !visible;
}

function setImportButtonLabel(label) {
  const btn = document.getElementById("import-confirm");
  if (btn) btn.textContent = label;
}

function showImportError(message) {
  const errEl = document.getElementById("import-err");
  if (!errEl) return;
  errEl.style.display = "block";
  errEl.textContent = message;
}

function appendSummaryList(parent, title, entries, variant) {
  if (!entries.length) return;
  const block = document.createElement("div");
  block.className = `pdf-summary-block pdf-summary-${variant}`;

  const head = document.createElement("div");
  head.className = "pdf-summary-block-title";
  head.textContent = `${title} (${entries.length})`;
  block.appendChild(head);

  const list = document.createElement("ul");
  list.className = "pdf-summary-list";
  // Sehr lange Listen abschneiden, damit der Dialog bedienbar bleibt.
  const MAX = 12;
  entries.slice(0, MAX).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
  if (entries.length > MAX) {
    const li = document.createElement("li");
    li.textContent = `… und ${entries.length - MAX} weitere`;
    list.appendChild(li);
  }
  block.appendChild(list);
  parent.appendChild(block);
}

function renderPdfSummary(resolved, fileName, monthLabel) {
  const box = document.getElementById("import-pdf-summary");
  if (!box) return;
  box.textContent = "";
  box.hidden = false;

  const head = document.createElement("div");
  head.className = "pdf-summary-head";
  const title = document.createElement("strong");
  title.textContent = `Monatsdienstplan ${monthLabel}`;
  head.appendChild(title);
  const sub = document.createElement("span");
  sub.textContent = fileName;
  head.appendChild(sub);
  box.appendChild(head);

  const stats = document.createElement("div");
  stats.className = "pdf-summary-stats";
  const counts = [
    ["Tage", String(resolved.entries.length)],
    ["BD (D)", String(resolved.entries.filter((e) => e.bd).length)],
    ["HG", String(resolved.entries.filter((e) => e.hg).length)],
    ["RBN", String(resolved.entries.filter((e) => e.rbn).length)],
  ];
  counts.forEach(([label, value]) => {
    const chip = document.createElement("span");
    chip.className = "pdf-summary-chip";
    const strong = document.createElement("strong");
    strong.textContent = value;
    chip.appendChild(strong);
    chip.appendChild(document.createTextNode(` ${label}`));
    stats.appendChild(chip);
  });
  box.appendChild(stats);

  const note = document.createElement("p");
  note.className = "pdf-summary-note";
  note.textContent =
    "Beim Import werden alle vorhandenen D-, HG- und RBN-Einträge dieses Monats ersetzt. " +
    "Arbeitsplätze, Status (Urlaub, Krank …) und Kommentare bleiben erhalten. " +
    'Die Spalte "2. RBN" wird nicht übernommen.';
  box.appendChild(note);

  if (resolved.newEmployees.length) {
    appendSummaryList(box, "Wird dem Monatsteam hinzugefügt", resolved.newEmployees, "info");
  }
  appendSummaryList(box, "Hinweise", resolved.warnings, "warn");

  const errors = resolved.errors || [];
  if (errors.length) {
    appendSummaryList(box, "Fehler — Import nicht möglich", errors, "error");
  }
}

// Bereits erfasste Abwesenheiten (Urlaub, Krank, FZA …) je Person und Tag —
// Grundlage für den Hinweis auf Dienste, die laut Plan auf eine Abwesenheit
// fallen.
function collectAbsences(md) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const [emp, days] of Object.entries(md.assignments || {})) {
    for (const [day, cell] of Object.entries(days || {})) {
      const code = cell && cell.assignment;
      if (!code || !ABSENCE_CODES.includes(code)) continue;
      if (!out[emp]) out[emp] = {};
      out[emp][day] = code;
    }
  }
  return out;
}

async function stageDutySchedulePdf(file) {
  const dz = document.getElementById("import-dropzone");
  const fnEl = document.getElementById("dz-filename");

  if (state.isAutoplanRunning) {
    showImportError("Fehler: Während einer laufenden Auto-Plan-Berechnung ist kein Import möglich.");
    return;
  }
  if (planMode) {
    showImportError("Fehler: Bitte zuerst den Planungsmodus verlassen, dann den PDF-Dienstplan importieren.");
    return;
  }

  setJsonInputVisible(false);
  if (fnEl) fnEl.textContent = `${file.name} · wird gelesen …`;

  try {
    const buffer = await file.arrayBuffer();
    const { pages } = await extractPdfTextItems(buffer);
    const parsed = parseDutySchedulePages(pages, { fileName: file.name });

    const md = getMonthData(parsed.year, parsed.month);
    const knownEmployees = Object.keys(EMP_META).filter((name) => isEmployeeActiveInMonth(name, parsed.year, parsed.month));
    const rbnOptions = isRbnMonthVisible(parsed.year, parsed.month) ? getRbnOptionsForDate(parsed.year, parsed.month) : [];

    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: md.employees || [],
      knownEmployees,
      rbnOptions,
      absences: collectAbsences(md),
    });

    if (!isRbnMonthVisible(parsed.year, parsed.month) && parsed.rows.some((r) => r.rbn)) {
      resolved.warnings.unshift("Für diesen Monat führt RadPlan keine RBN-Zeile — die RBN-Spalte wird ignoriert.");
    }

    const monthLabel = `${MONTHS[parsed.month]} ${parsed.year}`;
    if (fnEl) fnEl.textContent = file.name;
    if (dz) dz.classList.add("has-file");
    renderPdfSummary(resolved, file.name, monthLabel);

    if (resolved.errors.length) {
      showImportError(`Fehler: Der PDF-Dienstplan enthält ${resolved.errors.length} nicht auflösbare Angabe(n) — siehe Liste oben.`);
      setImportButtonLabel("Importieren");
      return;
    }

    pendingPdfImport = { resolved, fileName: file.name, monthLabel };
    setImportButtonLabel("Dienstplan übernehmen");
  } catch (e) {
    if (dz) dz.classList.remove("has-file");
    if (fnEl) fnEl.textContent = "";
    setJsonInputVisible(true);
    showImportError("Fehler: " + (e && e.message ? e.message : String(e)));
  }
}

function applyPendingPdfImport() {
  if (!pendingPdfImport) return;
  const { resolved, monthLabel } = pendingPdfImport;

  try {
    const stats = applyPdfDutySchedule(resolved);
    clearPendingPdfImport();
    hideOverlay("modal-import");

    // In den importierten Monat wechseln; switchPeriod rendert bereits neu.
    if (state.year !== resolved.year || state.month !== resolved.month) {
      switchPeriod(resolved.year, resolved.month);
    } else {
      render();
    }

    const parts = [`${stats.setBd} BD`, `${stats.setHg} HG`];
    if (stats.setRbn) parts.push(`${stats.setRbn} RBN`);
    if (stats.addedEmployees.length) parts.push(`${stats.addedEmployees.length} Person(en) ergänzt`);
    if (stats.restDays) parts.push(`${stats.restDays} Ruhetage`);
    showToast(`Dienstplan ${monthLabel} importiert · ${parts.join(" · ")}`);
  } catch (e) {
    showImportError("Fehler: " + (e && e.message ? e.message : String(e)));
  }
}
