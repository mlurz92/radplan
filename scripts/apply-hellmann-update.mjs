import fs from "node:fs";

function readFile(path) {
  const raw = fs.readFileSync(path, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  return { text: raw.replace(/\r\n/g, "\n"), eol };
}

function writeFile(path, text, eol) {
  fs.writeFileSync(path, eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text, "utf8");
}

function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Patch-Anker fehlt: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Patch-Anker nicht eindeutig: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}

function patchConstants() {
  const path = "js/constants.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  { code: "T", label: "Teleradiologie", bg: "#E0E7FF", fg: "#3730A3" },\n];',
    '  { code: "T", label: "Teleradiologie", bg: "#E0E7FF", fg: "#3730A3" },\n  { code: "NRAD", label: "Neuroradiologie", bg: "#E0F2FE", fg: "#0369A1" },\n];\n\nexport const SPECIAL_WORKPLACE_ACCESS = {\n  "Dr. Hellmann": ["NRAD"],\n};\n\nexport function getWorkplacesForEmployee(empName) {\n  return WORKPLACES.filter((workplace) =>\n    workplace.code !== "NRAD" || (SPECIAL_WORKPLACE_ACCESS[empName] || []).includes("NRAD")\n  );\n}\n\nexport function canUseWorkplace(empName, workplaceCode) {\n  return getWorkplacesForEmployee(empName).some((workplace) => workplace.code === workplaceCode);\n}',
    "NRAD-Arbeitsplatz und Zugriff"
  );

  text = replaceOnce(
    text,
    'export const RBN_THALER_LAST_MONTH = { year: 2026, month: 2 };\n\nexport const EMPLOYEE_DEPARTURES = {',
    'export const RBN_THALER_LAST_MONTH = { year: 2026, month: 2 };\nexport const RBN_HELLMANN_START = { year: 2026, month: 8 };\nexport const RBN_HELLMANN_OPTION = "Dr. Hellmann (RAD/NRAD)";\n\nexport const EMPLOYEE_ARRIVALS = {\n  // month ist 0-basiert und markiert den ERSTEN Monat MIT der Person.\n  // Dr. Hellmann beginnt zum 1.9.2026 und wird im Raster direkt hinter Dr. Becker einsortiert.\n  "Dr. Hellmann": { year: 2026, month: 8, after: "Dr. Becker", reason: "Eintritt" },\n};\n\nexport const EMPLOYEE_DEPARTURES = {',
    "Hellmann-Eintritt und RBN-Start"
  );

  text = replaceOnce(
    text,
    'export function isEmployeeActiveInMonth(name, y, m) {\n  const departure = EMPLOYEE_DEPARTURES[name];\n  if (!departure) return true;\n  return y < departure.year || (y === departure.year && m < departure.month);\n}',
    'export function isEmployeeActiveInMonth(name, y, m) {\n  const arrival = EMPLOYEE_ARRIVALS[name];\n  if (arrival) {\n    const beforeArrival = y < arrival.year || (y === arrival.year && m < arrival.month);\n    if (beforeArrival) return false;\n  }\n\n  const departure = EMPLOYEE_DEPARTURES[name];\n  if (!departure) return true;\n  return y < departure.year || (y === departure.year && m < departure.month);\n}',
    "Aktivitätslogik mit Eintritt"
  );

  text = replaceOnce(
    text,
    '  if (Array.isArray(md.employees)) {\n    const activeEmployees = md.employees.filter((emp) => isEmployeeActiveInMonth(emp, y, m));\n    changed = activeEmployees.length !== md.employees.length;\n    md.employees = activeEmployees;\n  }',
    '  if (Array.isArray(md.employees)) {\n    const activeEmployees = md.employees.filter((emp) => isEmployeeActiveInMonth(emp, y, m));\n    changed = activeEmployees.length !== md.employees.length;\n    md.employees = activeEmployees;\n\n    Object.entries(EMPLOYEE_ARRIVALS).forEach(([name, arrival]) => {\n      if (!isEmployeeActiveInMonth(name, y, m)) return;\n\n      const currentIndex = md.employees.indexOf(name);\n      const anchorIndex = arrival.after ? md.employees.indexOf(arrival.after) : -1;\n      const targetIndex = anchorIndex >= 0 ? anchorIndex + 1 : md.employees.length;\n\n      if (currentIndex < 0) {\n        md.employees.splice(targetIndex, 0, name);\n        changed = true;\n        return;\n      }\n\n      if (arrival.after && currentIndex !== targetIndex) {\n        md.employees.splice(currentIndex, 1);\n        const refreshedAnchorIndex = md.employees.indexOf(arrival.after);\n        const refreshedTargetIndex = refreshedAnchorIndex >= 0 ? refreshedAnchorIndex + 1 : md.employees.length;\n        md.employees.splice(refreshedTargetIndex, 0, name);\n        changed = true;\n      }\n    });\n  }',
    "Reconcile Eintritt und Zeilenposition"
  );

  text = replaceOnce(
    text,
    'export function getRbnOptionsForDate(y, m) {\n  const allowThaler =\n    y < RBN_THALER_LAST_MONTH.year ||\n    (y === RBN_THALER_LAST_MONTH.year && m <= RBN_THALER_LAST_MONTH.month);\n  \n  if (allowThaler) {\n    return [...RBN_OPTIONS];\n  }\n  \n  return RBN_OPTIONS.filter((opt) => opt !== "Fr. Thaler (RAD)");\n}',
    'export function getRbnOptionsForDate(y, m) {\n  const allowThaler =\n    y < RBN_THALER_LAST_MONTH.year ||\n    (y === RBN_THALER_LAST_MONTH.year && m <= RBN_THALER_LAST_MONTH.month);\n  const allowHellmann =\n    y > RBN_HELLMANN_START.year ||\n    (y === RBN_HELLMANN_START.year && m >= RBN_HELLMANN_START.month);\n\n  const options = allowThaler\n    ? [...RBN_OPTIONS]\n    : RBN_OPTIONS.filter((opt) => opt !== "Fr. Thaler (RAD)");\n\n  if (allowHellmann && !options.includes(RBN_HELLMANN_OPTION)) {\n    options.push(RBN_HELLMANN_OPTION);\n  }\n\n  return options;\n}',
    "zeitabhängiger RBN-Pool"
  );

  const beckerBlock = `  "Dr. Becker": {\n    fullName: "Dr. med. Juliane Becker",\n    position: "OÄ",\n    posLabel: "Oberärztin",\n    type: "FÄ für Radiologie · FÄ für Nuklearmedizin",\n    area: "CT",\n    deputy: "Dr. Martin",\n    since: 2019,\n    fte: 100,\n    phone: "4006",\n    tags: ["Radiologie", "Nuklearmedizin", "CT"],\n  },`;
  text = replaceOnce(
    text,
    beckerBlock,
    `${beckerBlock}\n  "Dr. Hellmann": {\n    fullName: "Dr. Hellmann",\n    position: "OÄ",\n    posLabel: "Oberärztin",\n    type: "FÄ für Radiologie",\n    area: "50 % Radiologie & Nuklearmedizin · 50 % Neuroradiologie",\n    deputy: "",\n    since: 2026,\n    fte: 100,\n    phone: "",\n    tags: ["Radiologie", "Neuroradiologie", "50 % RAD / 50 % NRAD"],\n  },`,
    "Hellmann-Stammdaten hinter Becker"
  );

  text = replaceOnce(
    text,
    '  reducedBdTarget: { "Dr. Polednia": 3, "Dr. Becker": 3, "Hr. Sebastian": 3 },',
    '  reducedBdTarget: { "Dr. Polednia": 3, "Dr. Becker": 3, "Hr. Sebastian": 3, "Dr. Hellmann": 2 },\n  // Harte personenbezogene Monatsobergrenzen. Diese dürfen auch in Coverage-\n  // Eskalationen nicht überschritten werden.\n  maxBdTarget: { "Dr. Hellmann": 2 },\n  // Personenspezifische Untergrenzen überschreiben die globale Auto-Plan-\n  // Mindestverteilung (3). Für Dr. Hellmann ist nur die Obergrenze bindend.\n  minBdTarget: { "Dr. Hellmann": 0 },',
    "Hellmann BD-Grenzen"
  );

  text = replaceOnce(
    text,
    '  ctLeadershipPairs: [["Dr. Becker", "Dr. Martin"]],',
    '  ctLeadershipPairs: [["Dr. Becker", "Dr. Martin"]],\n  // Ab Oktober 2026 wird die bisherige Becker/Martin-Vertretung zu einem\n  // Dreierpool erweitert. Hellmann zählt für die CT-Präsenz nur dann als\n  // verfügbar, wenn sie nicht am Arbeitsplatz NRAD eingesetzt ist.\n  ctCoverageRule: {\n    start: { year: 2026, month: 9 },\n    members: ["Dr. Becker", "Dr. Martin", "Dr. Hellmann"],\n    unavailableWorkplaces: { "Dr. Hellmann": ["NRAD"] },\n  },',
    "CT-Dreierpool ab Oktober"
  );

  text = replaceOnce(
    text,
    'export function getReducedBdTarget(empName) {\n  return SPECIAL_RULES.reducedBdTarget[empName];\n}',
    'export function getReducedBdTarget(empName) {\n  return SPECIAL_RULES.reducedBdTarget[empName];\n}\n\nexport function getMaxBdTarget(empName) {\n  return SPECIAL_RULES.maxBdTarget?.[empName];\n}\n\nexport function getMinBdTarget(empName) {\n  return SPECIAL_RULES.minBdTarget?.[empName];\n}\n\nfunction isAtOrAfterMonth(y, m, start) {\n  return y > start.year || (y === start.year && m >= start.month);\n}\n\nexport function getCtCoverageMembersForDate(y, m) {\n  const rule = SPECIAL_RULES.ctCoverageRule;\n  if (rule && isAtOrAfterMonth(y, m, rule.start)) return [...rule.members];\n  return [...(SPECIAL_RULES.ctLeadershipPairs?.[0] || [])];\n}\n\nexport function getCtUnavailableWorkplacesForEmployee(y, m, empName) {\n  const rule = SPECIAL_RULES.ctCoverageRule;\n  if (!rule || !isAtOrAfterMonth(y, m, rule.start)) return [];\n  return [...(rule.unavailableWorkplaces?.[empName] || [])];\n}',
    "Getter für BD-Grenzen und CT-Pool"
  );

  writeFile(path, text, eol);
}

function patchEditor() {
  const path = "js/editor.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  getRbnOptionsForDate, VACATION_CODES, weekday, isHoliday, isWeekend,',
    '  getRbnOptionsForDate, getWorkplacesForEmployee, getMaxBdTarget, VACATION_CODES, weekday, isHoliday, isWeekend,',
    "Editor-Import"
  );

  text = replaceOnce(
    text,
    '  removeEmployee, dutyOwner, clearCascadedFreeDay,',
    '  removeEmployee, dutyOwner, clearCascadedFreeDay, canAssignBdWithinHardLimit,',
    "Editor-Model-Import"
  );

  text = replaceOnce(
    text,
    '      if (WORKPLACES.find((w) => w.code === p)) {\n        wp.push(p);',
    '      if (getWorkplacesForEmployee(emp).find((w) => w.code === p)) {\n        wp.push(p);',
    "Editor-Zuweisungsparser"
  );

  text = replaceOnce(
    text,
    '    const wpOptions = isRbnRow ? rbnOptions.map((label) => ({ code: label, label, bg: "#E0F2FE", fg: "#0C4A6E" })) : WORKPLACES;',
    '    const wpOptions = isRbnRow\n      ? rbnOptions.map((label) => ({ code: label, label, bg: "#E0F2FE", fg: "#0C4A6E" }))\n      : getWorkplacesForEmployee(emp);',
    "Editor-Arbeitsplatzfilter"
  );

  text = replaceOnce(
    text,
    '      const kbdBadge = `<span style="position:absolute;top:2px;right:2px;font-family:var(--font-mono);font-size:7px;font-weight:700;line-height:1;opacity:${dimC ? 0.3 : 0.55};background:rgba(0,0,0,0.12);color:inherit;padding:1px 3px;border-radius:2px;pointer-events:none">${idx + 1}</span>`;',
    '      const kbdBadge = !isRbnRow && idx < 8\n        ? `<span style="position:absolute;top:2px;right:2px;font-family:var(--font-mono);font-size:7px;font-weight:700;line-height:1;opacity:${dimC ? 0.3 : 0.55};background:rgba(0,0,0,0.12);color:inherit;padding:1px 3px;border-radius:2px;pointer-events:none">${idx + 1}</span>`\n        : "";',
    "NRAD ohne irreführenden Tastatur-Shortcut"
  );

  text = replaceOnce(
    text,
    '      const owner = dutyOwner(y, m, day, dc);\n      const taken = owner && owner !== emp;\n      \n      const chip = document.createElement("div");\n      chip.className = `chip-duty ${on ? "duty-" + dc + "-on" : "duty-" + dc + "-off"}${taken ? " blocked" : ""}`;',
    '      const owner = dutyOwner(y, m, day, dc);\n      const taken = owner && owner !== emp;\n      const bdHardLimit = dc === "D" && !on && !canAssignBdWithinHardLimit(y, m, emp, day);\n      const blocked = taken || bdHardLimit;\n      \n      const chip = document.createElement("div");\n      chip.className = `chip-duty ${on ? "duty-" + dc + "-on" : "duty-" + dc + "-off"}${blocked ? " blocked" : ""}`;',
    "Editor BD-Maximum blockieren"
  );

  text = replaceOnce(
    text,
    '      if (taken) {\n        warnParts.push(`${dc} bereits vergeben: ${owner}`);\n      }\n      dtC.appendChild(chip);',
    '      if (taken) {\n        warnParts.push(`${dc} bereits vergeben: ${owner}`);\n      }\n      if (bdHardLimit) {\n        warnParts.push(`BD-Monatsmaximum erreicht: ${emp} darf maximal ${getMaxBdTarget(emp)} BD erhalten`);\n      }\n      dtC.appendChild(chip);',
    "Editor Hinweis BD-Maximum"
  );

  writeFile(path, text, eol);
}

function patchRenderGrid() {
  const path = "js/render-grid.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  WISH_MAP\n} from \'./constants.js\';',
    '  WISH_MAP,\n  getWorkplacesForEmployee\n} from \'./constants.js\';',
    "Render-Grid-Import"
  );

  text = replaceOnce(
    text,
    '  const wpHtml = WORKPLACES.map(wp => cqpChip({',
    '  const wpHtml = getWorkplacesForEmployee(emp).map(wp => cqpChip({',
    "Schnell-Popover-Arbeitsplatzfilter"
  );

  writeFile(path, text, eol);
}

function patchQuickActions() {
  const path = "js/quick-actions.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    'import { WORKPLACES, STATUSES, nextCalendarDay } from \'./constants.js\';',
    'import { WORKPLACES, STATUSES, nextCalendarDay, getWorkplacesForEmployee, getMaxBdTarget } from \'./constants.js\';',
    "Quick-Actions-Import"
  );

  text = replaceOnce(
    text,
    'import { getCell, setCell, clearCell, dutyOwner, canMoveDutyBadge, clearCascadedFreeDay } from \'./model.js\';',
    'import { getCell, setCell, clearCell, dutyOwner, canMoveDutyBadge, clearCascadedFreeDay, canAssignBdWithinHardLimit } from \'./model.js\';',
    "Quick-Actions-Model-Import"
  );

  text = replaceOnce(
    text,
    '  const wp = WORKPLACES.find(w => w.code === wpCode);\n\n  const anchorParts =',
    '  const wp = getWorkplacesForEmployee(emp).find(w => w.code === wpCode);\n  if (!wp) {\n    showToast(`${wpCode} ist für ${emp} nicht als Arbeitsplatz verfügbar`);\n    return;\n  }\n\n  const anchorParts =',
    "Quick-Actions-Zugriffsschutz"
  );

  text = replaceOnce(
    text,
    '    const wps = parts.filter(p => WORKPLACES.find(w => w.code === p));',
    '    const allowedWorkplaces = getWorkplacesForEmployee(emp);\n    const wps = parts.filter(p => allowedWorkplaces.find(w => w.code === p));',
    "Quick-Actions-Sanitizing"
  );

  text = replaceOnce(
    text,
    '  if (!multi) {\n    const owner = dutyOwner(y, m, day, dutyCode);\n    if (!remove && owner && owner !== emp) {\n      showToast(`${dutyCode} bereits vergeben an: ${owner}`);\n      return;\n    }\n  }',
    '  if (!multi) {\n    const owner = dutyOwner(y, m, day, dutyCode);\n    if (!remove && owner && owner !== emp) {\n      showToast(`${dutyCode} bereits vergeben an: ${owner}`);\n      return;\n    }\n    if (!remove && dutyCode === "D" && !canAssignBdWithinHardLimit(y, m, emp, day)) {\n      showToast(`${emp} darf maximal ${getMaxBdTarget(emp)} BD pro Monat erhalten`);\n      return;\n    }\n  }',
    "Quick-Actions Einzel-BD-Maximum"
  );

  text = replaceOnce(
    text,
    '    if (!remove) {\n      const owner = dutyOwner(y, m, d, dutyCode);\n      if (owner && owner !== emp) { skipped++; return; }\n    }',
    '    if (!remove) {\n      const owner = dutyOwner(y, m, d, dutyCode);\n      if (owner && owner !== emp) { skipped++; return; }\n      if (dutyCode === "D" && !canAssignBdWithinHardLimit(y, m, emp, d)) { skipped++; return; }\n    }',
    "Quick-Actions Multi-BD-Maximum"
  );

  text = replaceOnce(
    text,
    '      "owner-conflict": `${dutyCode} bereits vergeben an: ${check.owner}`,',
    '      "owner-conflict": `${dutyCode} bereits vergeben an: ${check.owner}`,\n      "bd-hard-max": `${dstEmp} darf maximal ${getMaxBdTarget(dstEmp)} BD pro Monat erhalten`,',
    "Drag-Drop BD-Maximum Toast"
  );

  writeFile(path, text, eol);
}

function patchModel() {
  const path = "js/model.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  getReducedBdTarget,\n  SPECIAL_RULES,',
    '  getReducedBdTarget,\n  getMaxBdTarget,\n  SPECIAL_RULES,',
    "Model getMaxBdTarget Import"
  );

  text = replaceOnce(
    text,
    'export function dutyOwner(y, m, day, dt) {\n  const md = getMonthData(y, m);\n  return md.employees.find((e) => md.assignments[e]?.[day]?.duty === dt) || null;\n}',
    'export function dutyOwner(y, m, day, dt) {\n  const md = getMonthData(y, m);\n  return md.employees.find((e) => md.assignments[e]?.[day]?.duty === dt) || null;\n}\n\nexport function countEmployeeDuties(y, m, emp, dutyCode) {\n  const md = getMonthData(y, m);\n  const dim = daysInMonth(y, m);\n  let count = 0;\n  for (let d = 1; d <= dim; d++) {\n    if (md.assignments?.[emp]?.[d]?.duty === dutyCode) count++;\n  }\n  return count;\n}\n\nexport function canAssignBdWithinHardLimit(y, m, emp, day) {\n  const max = getMaxBdTarget(emp);\n  if (max === undefined) return true;\n  const current = getCell(y, m, emp, day);\n  if (current.duty === "D") return true;\n  return countEmployeeDuties(y, m, emp, "D") < max;\n}',
    "Model BD-Maximum Helper"
  );

  text = replaceOnce(
    text,
    '// @returns {{ok: boolean, reason: null|"occupied-different"|"occupied-same"|"owner-conflict", owner: string|null}}',
    '// @returns {{ok: boolean, reason: null|"occupied-different"|"occupied-same"|"owner-conflict"|"bd-hard-max", owner: string|null}}',
    "Drag-Drop Return-Typ"
  );

  text = replaceOnce(
    text,
    '  if (dstCell.duty === dutyCode) return { ok: false, reason: "occupied-same", owner: null };\n  if (dstDay !== srcDay) {',
    '  if (dstCell.duty === dutyCode) return { ok: false, reason: "occupied-same", owner: null };\n  if (dutyCode === "D" && srcEmp !== dstEmp && !canAssignBdWithinHardLimit(y, m, dstEmp, dstDay)) {\n    return { ok: false, reason: "bd-hard-max", owner: null };\n  }\n  if (dstDay !== srcDay) {',
    "Drag-Drop hard max"
  );

  text = replaceOnce(
    text,
    '  normalizeMonthDataShape(planSessions[key]);\n  return planSessions[key];',
    '  normalizeMonthDataShape(planSessions[key]);\n  reconcileEmployeesForMonth(planSessions[key], y, m);\n  return planSessions[key];',
    "bestehende Plan-Session reconciliieren"
  );

  writeFile(path, text, eol);
}

function patchApp() {
  const path = "js/app.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  dutyOwner,\n  getEmployeesForYear,',
    '  dutyOwner,\n  canAssignBdWithinHardLimit,\n  getEmployeesForYear,',
    "App BD-Maximum Import"
  );

  text = replaceOnce(
    text,
    '      if (noMod && (e.key === "d" || e.key === "D")) { \n        e.preventDefault(); \n        const owner = dutyOwner(state.year, state.month, state.edit.day, "D"); \n        if (!owner || owner === state.edit.emp) { \n          state.ed.duty = state.ed.duty === "D" ? null : "D"; \n          refreshEditorChips(); \n        } \n        return; \n      }',
    '      if (noMod && (e.key === "d" || e.key === "D")) { \n        e.preventDefault(); \n        const owner = dutyOwner(state.year, state.month, state.edit.day, "D"); \n        const removing = state.ed.duty === "D";\n        if ((!owner || owner === state.edit.emp) && (removing || canAssignBdWithinHardLimit(state.year, state.month, state.edit.emp, state.edit.day))) { \n          state.ed.duty = removing ? null : "D"; \n          refreshEditorChips(); \n        } else if (!removing && !canAssignBdWithinHardLimit(state.year, state.month, state.edit.emp, state.edit.day)) {\n          showToast("BD-Monatsmaximum für diese Person erreicht");\n        }\n        return; \n      }',
    "Editor-Tastatur BD-Maximum"
  );

  writeFile(path, text, eol);
}

function patchAutoplan() {
  const path = "js/autoplan.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  getReducedBdTarget,\n  isNoBdWeekday,',
    '  getReducedBdTarget,\n  getMaxBdTarget,\n  getMinBdTarget,\n  getCtCoverageMembersForDate,\n  getCtUnavailableWorkplacesForEmployee,\n  isNoBdWeekday,',
    "Autoplan neue Regel-Imports"
  );

  const oldCtBlock = `export function hasCTLeadershipConflict(y, m, emp, day, assignments) {\n  const partner = getCtLeadershipPartner(emp);\n  if (!partner) {\n    return false;\n  }\n\n  const next = nextCalendarDay(y, m, day);\n  const hols = getSaxonyHolidaysCached(next.y);\n\n  if (!isWorkday(next.y, next.m, next.d, hols)) {\n    return false;\n  }\n\n  let partnerCell;\n  if (next.y === y && next.m === m) {\n    partnerCell = assignments[partner]?.[next.d] || {};\n  } else {\n    const nk = monthKey(next.y, next.m);\n    partnerCell = DATA[nk]?.assignments?.[partner]?.[next.d] || {};\n  }\n\n  if (partnerCell.assignment) {\n    const codes = partnerCell.assignment.split("/").map((x) => x.trim());\n    // Konflikt, wenn der Partner am Folge-Werktag abwesend ist ODER ebenfalls\n    // ein "F" (Freizeitausgleich/Frei) hat – dann wäre niemand der CT-Leitung\n    // anwesend.\n    if (codes.some((c) => c === "F" || VACATION_CODES.includes(c) || ABSENCE_CODES.includes(c))) {\n      return true;\n    }\n  }\n  return false;\n}\n\n/**\n * Prüft die generelle CT-Leitungs-Invariante: an Werktagen muss immer\n * mindestens eine Person jedes Vertretungspaares anwesend sein. Liefert eine\n * Liste der Konflikttage (beide gleichzeitig Urlaub/abwesend/F), unabhängig\n * davon, ob der Konflikt aus einem automatischen F nach D stammt oder aus\n * manuell/importiert gesetzten Abwesenheiten.\n */\nexport function findCTLeadershipPresenceGaps(y, m, assignments) {\n  const gaps = [];\n  const dim = daysInMonth(y, m);\n  const hols = getSaxonyHolidaysCached(y);\n\n  const isOffOnDay = (emp, day) => {\n    const cell = assignments[emp]?.[day];\n    if (!cell?.assignment) return false;\n    return cell.assignment\n      .split("/")\n      .map((x) => x.trim())\n      .some((c) => c === "F" || ABSENCE_CODES.includes(c));\n  };\n\n  for (const pair of SPECIAL_RULES.ctLeadershipPairs) {\n    const [a, b] = pair;\n    for (let d = 1; d <= dim; d++) {\n      if (!isWorkday(y, m, d, hols)) continue;\n      if (isOffOnDay(a, d) && isOffOnDay(b, d)) {\n        gaps.push({ day: d, a, b });\n      }\n    }\n  }\n  return gaps;\n}`;

  const newCtBlock = `function getAssignmentForCtCoverage(y, m, emp, day, assignments) {\n  if (assignments?.[emp]?.[day]) return assignments[emp][day];\n  return DATA[monthKey(y, m)]?.assignments?.[emp]?.[day] || {};\n}\n\nexport function isCTCoverageMemberAvailable(y, m, emp, day, assignments) {\n  const members = getCtCoverageMembersForDate(y, m);\n  if (!members.includes(emp)) return false;\n  const cell = getAssignmentForCtCoverage(y, m, emp, day, assignments);\n  const codes = (cell.assignment || "").split("/").map((x) => x.trim()).filter(Boolean);\n  if (codes.some((c) => c === "F" || ABSENCE_CODES.includes(c))) return false;\n  const blockedWorkplaces = getCtUnavailableWorkplacesForEmployee(y, m, emp);\n  if (codes.some((c) => blockedWorkplaces.includes(c))) return false;\n  return true;\n}\n\nexport function hasCTLeadershipConflict(y, m, emp, day, assignments) {\n  const next = nextCalendarDay(y, m, day);\n  const hols = getSaxonyHolidaysCached(next.y);\n  if (!isWorkday(next.y, next.m, next.d, hols)) return false;\n\n  const members = getCtCoverageMembersForDate(next.y, next.m);\n  if (!members.includes(emp)) return false;\n\n  // Der neue BD erzeugt für emp am Folgetag einen Ruhetag. Zulässig ist er\n  // daher nur, wenn mindestens ein anderes Poolmitglied an diesem Werktag\n  // für die CT-Vertretung verfügbar bleibt. Ab Oktober zählt Hellmann bei\n  // NRAD-Einsatz ausdrücklich NICHT als CT-verfügbar.\n  return !members.some((member) =>\n    member !== emp && isCTCoverageMemberAvailable(next.y, next.m, member, next.d, assignments)\n  );\n}\n\n/**\n * Generelle CT-Präsenzinvariante. Bis September 2026 gilt der bisherige\n * Becker/Martin-Pool; ab Oktober 2026 muss mindestens eine Person aus\n * Becker/Martin/Hellmann CT-verfügbar sein. Hellmann ist bei NRAD-Einsatz\n * für diese Invariante nicht verfügbar.\n */\nexport function findCTLeadershipPresenceGaps(y, m, assignments) {\n  const gaps = [];\n  const dim = daysInMonth(y, m);\n  const hols = getSaxonyHolidaysCached(y);\n  const members = getCtCoverageMembersForDate(y, m);\n\n  for (let d = 1; d <= dim; d++) {\n    if (!isWorkday(y, m, d, hols)) continue;\n    const available = members.filter((emp) => isCTCoverageMemberAvailable(y, m, emp, d, assignments));\n    if (!available.length) gaps.push({ day: d, members: [...members] });\n  }\n  return gaps;\n}`;
  text = replaceOnce(text, oldCtBlock, newCtBlock, "CT-Pool-Logik");

  text = replaceOnce(
    text,
    '  return conflicts;\n}',
    '  // Personenbezogene harte BD-Obergrenzen auch bei manuellen/importierten\n  // Plänen sichtbar machen. Nur die überzähligen Dienste werden markiert.\n  for (const emp of emps) {\n    const maxBd = getMaxBdTarget(emp);\n    if (maxBd === undefined) continue;\n    const bdDays = [];\n    for (let d = 1; d <= dim; d++) {\n      if (assignments[emp]?.[d]?.duty === "D") bdDays.push(d);\n    }\n    bdDays.slice(maxBd).forEach((day) => {\n      flag(emp, day, `BD-Monatsmaximum überschritten: maximal ${maxBd} BD erlaubt`);\n    });\n  }\n\n  // CT-Präsenzlücken unabhängig von ihrem Entstehungsweg markieren.\n  findCTLeadershipPresenceGaps(y, m, assignments).forEach(({ day, members }) => {\n    members.filter((emp) => emps.includes(emp)).forEach((emp) => {\n      flag(emp, day, `CT-Vertretung nicht gewährleistet: kein verfügbares Poolmitglied (${members.join(", ")})`);\n    });\n  });\n\n  return conflicts;\n}',
    "Grid-Konflikte BD-Maximum und CT-Pool"
  );

  text = replaceOnce(
    text,
    '  const bdTarget = {};\n  emps.forEach((e) => {\n    if (isDutyExempt(e)) {\n      bdTarget[e] = 0;\n    } else if (customTargets && customTargets[e] !== undefined) {\n      bdTarget[e] = Math.max(MIN_MONTHLY_BD_TARGET, customTargets[e]);\n    } else {\n      const reduced = getReducedBdTarget(e);\n      bdTarget[e] = Math.max(MIN_MONTHLY_BD_TARGET, reduced !== undefined ? reduced : 4);\n    }\n  });',
    '  const clampBdTarget = (emp, requested) => {\n    if (isDutyExempt(emp)) return 0;\n    const min = getMinBdTarget(emp) ?? MIN_MONTHLY_BD_TARGET;\n    const max = getMaxBdTarget(emp) ?? Infinity;\n    return Math.min(max, Math.max(min, requested));\n  };\n\n  const bdTarget = {};\n  emps.forEach((e) => {\n    if (isDutyExempt(e)) {\n      bdTarget[e] = 0;\n    } else if (customTargets && customTargets[e] !== undefined) {\n      bdTarget[e] = clampBdTarget(e, customTargets[e]);\n    } else {\n      const reduced = getReducedBdTarget(e);\n      bdTarget[e] = clampBdTarget(e, reduced !== undefined ? reduced : 4);\n    }\n  });',
    "Autoplan Ziel-Clamping"
  );

  text = replaceOnce(
    text,
    '      if (hasCTLeadershipConflict(y, m, emp, d, assignments)) addHard("ct_conflict", "CT-Leitungs-Interdependenz blockiert den Dienst");',
    '      if (hasCTLeadershipConflict(y, m, emp, d, assignments)) addHard("ct_conflict", "CT-Präsenzregel blockiert den Dienst");\n      const maxBd = getMaxBdTarget(emp);\n      if (maxBd !== undefined) {\n        let monthlyBdCount = 0;\n        for (let day = 1; day <= dim; day++) {\n          if (assignments[emp]?.[day]?.duty === "D") monthlyBdCount++;\n        }\n        const alreadyThisDuty = assignments[emp]?.[d]?.duty === "D";\n        const projectedBdCount = monthlyBdCount + (alreadyThisDuty ? 0 : 1);\n        if (projectedBdCount > maxBd) addHard("bd_hard_max", `Harte BD-Monatsobergrenze überschritten (${projectedBdCount} > ${maxBd})`);\n      }',
    "Autoplan harte BD-Obergrenze"
  );

  text = replaceOnce(
    text,
    '  findCTLeadershipPresenceGaps(y, m, result).forEach(({ day, a, b }) => {\n    summary.warnings.push(`Tag ${day}: CT-Leitung – ${a} und ${b} gleichzeitig abwesend/F. Vertretung manuell sicherstellen.`);\n  });',
    '  findCTLeadershipPresenceGaps(y, m, result).forEach(({ day, members }) => {\n    summary.warnings.push(`Tag ${day}: CT-Vertretung – kein verfügbares Poolmitglied (${members.join(", ")}). Vertretung manuell sicherstellen.`);\n  });',
    "Autoplan CT-Warnung"
  );

  text = replaceOnce(
    text,
    'export function baseMonthlyBDTarget(emp) {\n  if (isDutyExempt(emp)) return 0;\n  return Math.max(MIN_MONTHLY_BD_TARGET, getReducedBdTarget(emp) ?? 4);\n}',
    'export function baseMonthlyBDTarget(emp) {\n  if (isDutyExempt(emp)) return 0;\n  const min = getMinBdTarget(emp) ?? MIN_MONTHLY_BD_TARGET;\n  const max = getMaxBdTarget(emp) ?? Infinity;\n  return Math.min(max, Math.max(min, getReducedBdTarget(emp) ?? 4));\n}',
    "Mehrmonats-Basisziel"
  );

  text = replaceOnce(
    text,
    '    targets[emp] = Math.max(MIN_MONTHLY_BD_TARGET, base + nudge);',
    '    const min = getMinBdTarget(emp) ?? MIN_MONTHLY_BD_TARGET;\n    const max = getMaxBdTarget(emp) ?? Infinity;\n    targets[emp] = Math.min(max, Math.max(min, base + nudge));',
    "Mehrmonats-Zielgrenzen"
  );

  writeFile(path, text, eol);
}

function patchAutoplanUi() {
  const path = "js/autoplan-ui.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  getReducedBdTarget,\n} from \'./constants.js\';',
    '  getReducedBdTarget, getMaxBdTarget, getMinBdTarget,\n} from \'./constants.js\';',
    "Autoplan-UI Regel-Imports"
  );

  text = replaceOnce(
    text,
    '  return Math.max(MIN_MONTHLY_BD_TARGET, getReducedBdTarget(empName) ?? 4);',
    '  const min = getMinBdTarget(empName) ?? MIN_MONTHLY_BD_TARGET;\n  const max = getMaxBdTarget(empName) ?? 10;\n  return Math.min(max, Math.max(min, getReducedBdTarget(empName) ?? 4));',
    "Autoplan-UI Standardziel"
  );

  text = replaceOnce(
    text,
    '      const target = localAutoPlanTargets[e] ?? defaultBDTarget(e);',
    '      const target = localAutoPlanTargets[e] ?? defaultBDTarget(e);\n      const minTarget = getMinBdTarget(e) ?? MIN_MONTHLY_BD_TARGET;\n      const maxTarget = getMaxBdTarget(e) ?? 10;',
    "Autoplan-UI Zielgrenzen pro Karte"
  );

  text = replaceOnce(
    text,
    '              <input type="number" class="ap-card-input" data-emp="${esc(e)}" value="${target}" min="${MIN_MONTHLY_BD_TARGET}" max="10" step="1" readonly>',
    '              <input type="number" class="ap-card-input" data-emp="${esc(e)}" value="${target}" min="${minTarget}" max="${maxTarget}" step="1" readonly>',
    "Autoplan-UI Input-Grenzen"
  );

  text = replaceOnce(
    text,
    '        const current = localAutoPlanTargets[emp] ?? defaultBDTarget(emp);\n        const next = isPlus ? Math.min(10, current + 1) : Math.max(MIN_MONTHLY_BD_TARGET, current - 1);',
    '        const current = localAutoPlanTargets[emp] ?? defaultBDTarget(emp);\n        const minTarget = getMinBdTarget(emp) ?? MIN_MONTHLY_BD_TARGET;\n        const maxTarget = getMaxBdTarget(emp) ?? 10;\n        const next = isPlus ? Math.min(maxTarget, current + 1) : Math.max(minTarget, current - 1);',
    "Autoplan-UI Stepper-Grenzen"
  );

  writeFile(path, text, eol);
}

function patchConstantsTests() {
  const path = "test/constants.test.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  EMPLOYEE_DEPARTURES,\n} from "../js/constants.js";',
    '  EMPLOYEE_DEPARTURES,\n  EMPLOYEE_ARRIVALS,\n  getRbnOptionsForDate,\n  getWorkplacesForEmployee,\n  getMaxBdTarget,\n  getMinBdTarget,\n  getCtCoverageMembersForDate,\n  getCtUnavailableWorkplacesForEmployee,\n} from "../js/constants.js";',
    "Constants-Test-Imports"
  );

  const insertionAnchor = '  test("isEmployeeActiveInMonth ist true für Personen ohne Austrittseintrag", () => {\n    assert.equal(isEmployeeActiveInMonth("Dr. Martin", 2030, 0), true);\n  });\n';
  text = replaceOnce(
    text,
    insertionAnchor,
    `${insertionAnchor}\n  test("Dr. Hellmann wird exakt ab September 2026 aktiv", () => {\n    const arrival = EMPLOYEE_ARRIVALS["Dr. Hellmann"];\n    assert.deepEqual(arrival, { year: 2026, month: 8, after: "Dr. Becker", reason: "Eintritt" });\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2026, 7), false);\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2026, 8), true);\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2027, 0), true);\n  });\n\n  test("reconcileEmployeesForMonth ergänzt Hellmann ab September direkt hinter Becker", () => {\n    const md = { employees: ["Prof. Schäfer", "Dr. Becker", "Dr. Martin"], assignments: {}, comments: {} };\n    assert.equal(reconcileEmployeesForMonth(md, 2026, 8), true);\n    assert.deepEqual(md.employees, ["Prof. Schäfer", "Dr. Becker", "Dr. Hellmann", "Dr. Martin"]);\n    assert.equal(reconcileEmployeesForMonth(md, 2026, 9), false);\n  });\n\n  test("reconcileEmployeesForMonth entfernt Hellmann vor ihrem Eintritt", () => {\n    const md = {\n      employees: ["Dr. Becker", "Dr. Hellmann", "Dr. Martin"],\n      assignments: { "Dr. Hellmann": { 1: { assignment: "NRAD" } } },\n      comments: { "Dr. Hellmann": { 1: "vor Eintritt" } },\n    };\n    assert.equal(reconcileEmployeesForMonth(md, 2026, 7), true);\n    assert.deepEqual(md.employees, ["Dr. Becker", "Dr. Martin"]);\n    assert.equal(md.assignments["Dr. Hellmann"], undefined);\n    assert.equal(md.comments["Dr. Hellmann"], undefined);\n  });\n\n  test("NRAD ist ausschließlich für Dr. Hellmann auswählbar", () => {\n    assert.equal(getWorkplacesForEmployee("Dr. Hellmann").some((w) => w.code === "NRAD"), true);\n    assert.equal(getWorkplacesForEmployee("Dr. Becker").some((w) => w.code === "NRAD"), false);\n    assert.equal(getWorkplacesForEmployee("Dr. Martin").some((w) => w.code === "NRAD"), false);\n  });\n\n  test("Dr. Hellmann wird ab September 2026 in den RD-Neurorad-Pool aufgenommen", () => {\n    assert.equal(getRbnOptionsForDate(2026, 7).includes("Dr. Hellmann (RAD/NRAD)"), false);\n    assert.equal(getRbnOptionsForDate(2026, 8).includes("Dr. Hellmann (RAD/NRAD)"), true);\n    assert.equal(getRbnOptionsForDate(2027, 0).includes("Dr. Hellmann (RAD/NRAD)"), true);\n  });\n\n  test("Hellmann hat harte BD-Obergrenze 2 und eine spezielle Untergrenze 0", () => {\n    assert.equal(getMaxBdTarget("Dr. Hellmann"), 2);\n    assert.equal(getMinBdTarget("Dr. Hellmann"), 0);\n    assert.equal(getMaxBdTarget("Dr. Martin"), undefined);\n  });\n\n  test("CT-Pool wird ab Oktober 2026 um Hellmann erweitert; NRAD macht sie CT-unverfügbar", () => {\n    assert.deepEqual(getCtCoverageMembersForDate(2026, 8), ["Dr. Becker", "Dr. Martin"]);\n    assert.deepEqual(getCtCoverageMembersForDate(2026, 9), ["Dr. Becker", "Dr. Martin", "Dr. Hellmann"]);\n    assert.deepEqual(getCtUnavailableWorkplacesForEmployee(2026, 8, "Dr. Hellmann"), []);\n    assert.deepEqual(getCtUnavailableWorkplacesForEmployee(2026, 9, "Dr. Hellmann"), ["NRAD"]);\n  });\n`,
    "Hellmann Constants-Tests"
  );

  text = replaceOnce(
    text,
    '    assert.deepEqual(cellColor("CT"), { bg: "#FFEDD5", fg: "#C2410C" });',
    '    assert.deepEqual(cellColor("CT"), { bg: "#FFEDD5", fg: "#C2410C" });\n    assert.deepEqual(cellColor("NRAD"), { bg: "#E0F2FE", fg: "#0369A1" });',
    "NRAD-Farbtest"
  );

  writeFile(path, text, eol);
}

function patchAutoplanTests() {
  const path = "test/autoplan.test.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  hasCTLeadershipConflict,\n  computeAutoPlan,',
    '  hasCTLeadershipConflict,\n  findCTLeadershipPresenceGaps,\n  isCTCoverageMemberAvailable,\n  computeAutoPlan,',
    "Autoplan-Test Imports"
  );

  text = replaceOnce(
    text,
    '  test("kein Konflikt für Personen ohne CT-Leitungspartner", () => {\n    const assignments = {};\n    assert.equal(hasCTLeadershipConflict(2026, 6, "Dr. Martin", 5, assignments), false);\n  });\n});',
    '  test("kein Konflikt, wenn das andere Mitglied des bisherigen CT-Paares verfügbar ist", () => {\n    const assignments = {};\n    assert.equal(hasCTLeadershipConflict(2026, 6, "Dr. Martin", 5, assignments), false);\n  });\n\n  test("ab Oktober zählt Hellmann nur ohne NRAD als CT-Vertretung", () => {\n    // 4.10.2026 ist Sonntag, Folgetag 5.10.2026 ist Montag.\n    const blocked = {\n      "Dr. Martin": { 5: { assignment: "U" } },\n      "Dr. Hellmann": { 5: { assignment: "NRAD" } },\n    };\n    assert.equal(hasCTLeadershipConflict(2026, 9, "Dr. Becker", 4, blocked), true);\n    assert.equal(isCTCoverageMemberAvailable(2026, 9, "Dr. Hellmann", 5, blocked), false);\n\n    const covered = {\n      "Dr. Martin": { 5: { assignment: "U" } },\n      "Dr. Hellmann": { 5: { assignment: "MR" } },\n    };\n    assert.equal(hasCTLeadershipConflict(2026, 9, "Dr. Becker", 4, covered), false);\n    assert.equal(isCTCoverageMemberAvailable(2026, 9, "Dr. Hellmann", 5, covered), true);\n  });\n\n  test("CT-Präsenzgap erkennt Becker F + Martin U + Hellmann NRAD ab Oktober", () => {\n    const assignments = {\n      "Dr. Becker": { 5: { assignment: "F" } },\n      "Dr. Martin": { 5: { assignment: "U" } },\n      "Dr. Hellmann": { 5: { assignment: "NRAD" } },\n    };\n    const gaps = findCTLeadershipPresenceGaps(2026, 9, assignments);\n    assert.ok(gaps.some((gap) => gap.day === 5));\n  });\n});',
    "CT-Pool Autoplan-Tests"
  );

  text = replaceOnce(
    text,
    '  test("keine Konflikte bei sauber ausgeruhtem Plan", () => {\n    DATA["2026-5"] = buildMonth({\n      "Dr. Martin": { 10: { duty: "D" }, 11: { assignment: "F" } },\n    });\n    const conflicts = computeGridConflicts(2026, 5);\n    assert.equal(conflicts.size, 0);\n  });',
    '  test("keine Konflikte bei sauber ausgeruhtem Plan", () => {\n    DATA["2026-5"] = buildMonth({\n      "Dr. Martin": { 10: { duty: "D" }, 11: { assignment: "F" } },\n    });\n    const conflicts = computeGridConflicts(2026, 5);\n    assert.equal(conflicts.size, 0);\n  });\n\n  test("markiert einen dritten Hellmann-BD als Überschreitung der harten Monatsobergrenze", () => {\n    DATA["2026-8"] = buildMonth({\n      "Dr. Becker": {},\n      "Dr. Martin": {},\n      "Dr. Hellmann": {\n        1: { duty: "D" }, 2: { assignment: "F" },\n        5: { duty: "D" }, 6: { assignment: "F" },\n        9: { duty: "D" }, 10: { assignment: "F" },\n      },\n    });\n    const conflicts = computeGridConflicts(2026, 8);\n    assert.ok(conflicts.get(dutyKey("Dr. Hellmann", 9))?.some((r) => r.includes("Monatsmaximum")));\n  });',
    "Grid-Konflikt BD-Maximum Test"
  );

  text = replaceOnce(
    text,
    '    const result = await computeAutoPlan({ "Dr. Polednia": 1, "Prof. Schäfer": 1 }, "standard");\n    assert.equal(result.summary.bdTarget["Dr. Polednia"], MIN_MONTHLY_BD_TARGET);',
    '    const result = await computeAutoPlan({ "Dr. Polednia": 1, "Prof. Schäfer": 1 }, "standard");\n    assert.equal(result.summary.bdTarget["Dr. Polednia"], MIN_MONTHLY_BD_TARGET);',
    "bestehender Min-3-Test bleibt explizit unverändert"
  );

  const nfiDescribeAnchor = '  test("ein Plan ohne jegliche Coverage-Lücken erzielt einen deutlich höheren NFI als ein Plan mit vielen Lücken", async () => {';
  text = replaceOnce(
    text,
    nfiDescribeAnchor,
    '  test("Hellmann-Ziel und tatsächliche Auto-Plan-Vergabe überschreiten nie 2 BD", async () => {\n    const year = 2026;\n    const month = 8;\n    const employees = ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Hellmann", "Dr. Martin", "Hr. El Houba", "Hr. Sebastian"];\n    state.year = year;\n    state.month = month;\n    setPlanMode(true);\n    setPlanData(buildFixturePlanData(year, month, employees));\n\n    const result = await computeAutoPlan({ "Dr. Hellmann": 10 }, "standard");\n    assert.equal(result.summary.bdTarget["Dr. Hellmann"], 2);\n    const actual = Object.values(result.assignments["Dr. Hellmann"] || {}).filter((cell) => cell.duty === "D").length;\n    assert.ok(actual <= 2, `Hellmann darf maximal 2 BD erhalten, gefunden ${actual}`);\n\n    setPlanMode(false);\n    setPlanData(null);\n  });\n\n' + nfiDescribeAnchor,
    "Autoplan Hellmann Hard-Max Test"
  );

  writeFile(path, text, eol);
}

function patchReadme() {
  const path = "README.md";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    'Daneben werden die Ärztinnen und Ärzte der Abteilung an Werktagen auf verschiedene **Arbeitsplätze** (Modalitäten) verteilt: Großgeräte (MRT, CT, Sonographie – US, Angiographie – AN), Spezialbereiche (Mammographie – MA, Kinder-Ultraschall – KUS), der Außenstandort Wermsdorf (W) und die Teleradiologie (T).',
    'Daneben werden die Ärztinnen und Ärzte der Abteilung an Werktagen auf verschiedene **Arbeitsplätze** (Modalitäten) verteilt: Großgeräte (MRT, CT, Sonographie – US, Angiographie – AN), Spezialbereiche (Mammographie – MA, Kinder-Ultraschall – KUS), der Außenstandort Wermsdorf (W) und die Teleradiologie (T). Für **Dr. Hellmann** steht ab ihrem Eintritt am 01.09.2026 zusätzlich der klinikübergreifende Arbeitsplatz **Neuroradiologie (NRAD)** zur Verfügung; für alle anderen Mitarbeitenden bleibt `NRAD` in den Arbeitsplatz-Auswahlen verborgen.',
    "README Arbeitsplatzübersicht"
  );

  const h5 = '## 5. Stammdaten, Rollen, Qualifikationen & Sonderregeln\n';
  text = replaceOnce(
    text,
    h5,
    `${h5}\n> **Personaländerung ab 01.09.2026 — Dr. Hellmann:** Dr. Hellmann wird ab September 2026 automatisch als **Oberärztin / Fachärztin für Radiologie** in den Monatsbestand aufgenommen und im Dienstplan **direkt unter Dr. Becker** einsortiert. Ihre Beschäftigung ist organisatorisch **50 % Klinik für Radiologie & Nuklearmedizin / 50 % Klinik für Neuroradiologie** geteilt. Deshalb besitzt ausschließlich sie den zusätzlichen Arbeitsplatzcode **NRAD**. Ebenfalls ab September 2026 erscheint sie in der manuellen Auswahl der Zeile **RD Neurorad** als **„Dr. Hellmann (RAD/NRAD)“**. Für Bereitschaftsdienste gilt eine **harte Obergrenze von maximal 2 BD pro Monat**; diese Grenze darf auch durch Coverage-Eskalationen des Auto-Planers nicht überschritten werden. **Ab 01.10.2026** wird die CT-Vertretung als Pool **Dr. Becker / Dr. Martin / Dr. Hellmann** geführt: an jedem Werktag muss mindestens eine dieser drei Personen CT-verfügbar sein; Dr. Hellmann zählt an Tagen mit eingetragenem **NRAD** ausdrücklich nicht als CT-verfügbar.\n`,
    "README Personaländerung Kapitel 5"
  );

  const editorLine = '1. **Einsatz:** Auswahl eines exklusiven Status (z. B. Urlaub) oder freie Kombination mehrerer Arbeitsplätze (z. B. „MR/CT") durch Anklicken der farbigen Chips.';
  text = replaceOnce(
    text,
    editorLine,
    `${editorLine} Bei Dr. Hellmann wird ab September 2026 zusätzlich der Chip **NRAD – Neuroradiologie** angezeigt; bei allen anderen Personen wird dieser Spezialarbeitsplatz weder im Voll-Editor noch im Desktop-Schnell-Popover angeboten.`,
    "README Editor Hellmann"
  );

  text = replaceOnce(
    text,
    'Für alle nicht dienstbefreiten Mitarbeitenden gilt im Auto-Plan eine harte monatliche Untergrenze von **mindestens 3 Bereitschaftsdiensten (`D`)**.',
    'Für nicht dienstbefreite Mitarbeitende gilt im Auto-Plan grundsätzlich eine harte monatliche Untergrenze von **mindestens 3 Bereitschaftsdiensten (`D`)**. **Dr. Hellmann ist abweichend davon als personenbezogene Sonderregel auf maximal 2 BD pro Monat begrenzt**; für sie überschreibt diese harte Obergrenze die allgemeine Mindestverteilung.',
    "README Autoplan Mindestziel Ausnahme"
  );

  writeFile(path, text, eol);
}

function patchAlgorithmRules() {
  const path = "algorithm_rules.md";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '- **CT-Leitungs-Interdependenz:** Dr. Becker und Dr. Martin dürfen an Werktagen niemals gleichzeitig abwesend (Urlaub/Frei/FZA) sein. Der Algorithmus plant die Dienste (und deren nachgelagerte Ruhetage) proaktiv um diese Vorgabe herum.',
    '- **CT-Vertretungs-Pool:** Bis einschließlich September 2026 gilt die bisherige Becker/Martin-Interdependenz. **Ab Oktober 2026** muss an jedem Werktag mindestens eine Person aus **Dr. Becker / Dr. Martin / Dr. Hellmann** CT-verfügbar sein. Dr. Hellmann zählt an einem Tag mit Arbeitsplatz **NRAD** ausdrücklich nicht als CT-verfügbar. Der Algorithmus blockiert BD-Kandidaten, deren nachgelagerter Ruhetag diese Präsenzinvariante verletzen würde.',
    "algorithm_rules CT-Pool"
  );

  text = replaceOnce(
    text,
    '- **Reduzierte BD-Monatsziele:** Dr. Polednia, Dr. Becker und Hr. Sebastian haben ein Standardziel von 3 statt 4 BD/Monat.',
    '- **Reduzierte BD-Monatsziele:** Dr. Polednia, Dr. Becker und Hr. Sebastian haben ein Standardziel von 3 statt 4 BD/Monat. **Dr. Hellmann hat ab Eintritt ein Standardziel von 2 und zugleich eine harte Obergrenze von maximal 2 BD/Monat**, die auch in Coverage-Eskalationen nicht überschritten werden darf.',
    "algorithm_rules Hellmann BD-Max"
  );

  writeFile(path, text, eol);
}

patchConstants();
patchEditor();
patchRenderGrid();
patchQuickActions();
patchModel();
patchApp();
patchAutoplan();
patchAutoplanUi();
patchConstantsTests();
patchAutoplanTests();
patchReadme();
patchAlgorithmRules();

console.log("Hellmann-Update inkl. BD-Maximum und CT-Pool angewendet.");
