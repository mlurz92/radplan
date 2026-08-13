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
  const hellmannBlock = `${beckerBlock}\n  "Dr. Hellmann": {\n    fullName: "Dr. Hellmann",\n    position: "OÄ",\n    posLabel: "Oberärztin",\n    type: "FÄ für Radiologie",\n    area: "50 % Radiologie & Nuklearmedizin · 50 % Neuroradiologie",\n    deputy: "",\n    since: 2026,\n    fte: 100,\n    phone: "",\n    tags: ["Radiologie", "Neuroradiologie", "50 % RAD / 50 % NRAD"],\n  },`;
  text = replaceOnce(text, beckerBlock, hellmannBlock, "Hellmann-Stammdaten hinter Becker");

  writeFile(path, text, eol);
}

function patchEditor() {
  const path = "js/editor.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  getRbnOptionsForDate, VACATION_CODES, weekday, isHoliday, isWeekend,',
    '  getRbnOptionsForDate, getWorkplacesForEmployee, VACATION_CODES, weekday, isHoliday, isWeekend,',
    "Editor-Import"
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
    'import { WORKPLACES, STATUSES, nextCalendarDay, getWorkplacesForEmployee } from \'./constants.js\';',
    "Quick-Actions-Import"
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

  writeFile(path, text, eol);
}

function patchModel() {
  const path = "js/model.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  normalizeMonthDataShape(planSessions[key]);\n  return planSessions[key];',
    '  normalizeMonthDataShape(planSessions[key]);\n  reconcileEmployeesForMonth(planSessions[key], y, m);\n  return planSessions[key];',
    "bestehende Plan-Session reconciliieren"
  );

  writeFile(path, text, eol);
}

function patchTests() {
  const path = "test/constants.test.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;

  text = replaceOnce(
    text,
    '  EMPLOYEE_DEPARTURES,\n} from "../js/constants.js";',
    '  EMPLOYEE_DEPARTURES,\n  EMPLOYEE_ARRIVALS,\n  getRbnOptionsForDate,\n  getWorkplacesForEmployee,\n} from "../js/constants.js";',
    "Test-Imports"
  );

  const insertionAnchor = '  test("isEmployeeActiveInMonth ist true für Personen ohne Austrittseintrag", () => {\n    assert.equal(isEmployeeActiveInMonth("Dr. Martin", 2030, 0), true);\n  });\n';
  const tests = `${insertionAnchor}\n  test("Dr. Hellmann wird exakt ab September 2026 aktiv", () => {\n    const arrival = EMPLOYEE_ARRIVALS["Dr. Hellmann"];\n    assert.deepEqual(arrival, { year: 2026, month: 8, after: "Dr. Becker", reason: "Eintritt" });\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2026, 7), false);\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2026, 8), true);\n    assert.equal(isEmployeeActiveInMonth("Dr. Hellmann", 2027, 0), true);\n  });\n\n  test("reconcileEmployeesForMonth ergänzt Hellmann ab September direkt hinter Becker", () => {\n    const md = { employees: ["Prof. Schäfer", "Dr. Becker", "Dr. Martin"], assignments: {}, comments: {} };\n    assert.equal(reconcileEmployeesForMonth(md, 2026, 8), true);\n    assert.deepEqual(md.employees, ["Prof. Schäfer", "Dr. Becker", "Dr. Hellmann", "Dr. Martin"]);\n\n    const changedAgain = reconcileEmployeesForMonth(md, 2026, 9);\n    assert.equal(changedAgain, false);\n    assert.deepEqual(md.employees, ["Prof. Schäfer", "Dr. Becker", "Dr. Hellmann", "Dr. Martin"]);\n  });\n\n  test("reconcileEmployeesForMonth entfernt Hellmann vor ihrem Eintritt", () => {\n    const md = {\n      employees: ["Dr. Becker", "Dr. Hellmann", "Dr. Martin"],\n      assignments: { "Dr. Hellmann": { 1: { assignment: "NRAD" } } },\n      comments: { "Dr. Hellmann": { 1: "vor Eintritt" } },\n    };\n    assert.equal(reconcileEmployeesForMonth(md, 2026, 7), true);\n    assert.deepEqual(md.employees, ["Dr. Becker", "Dr. Martin"]);\n    assert.equal(md.assignments["Dr. Hellmann"], undefined);\n    assert.equal(md.comments["Dr. Hellmann"], undefined);\n  });\n\n  test("NRAD ist ausschließlich für Dr. Hellmann auswählbar", () => {\n    assert.equal(getWorkplacesForEmployee("Dr. Hellmann").some((w) => w.code === "NRAD"), true);\n    assert.equal(getWorkplacesForEmployee("Dr. Becker").some((w) => w.code === "NRAD"), false);\n    assert.equal(getWorkplacesForEmployee("Dr. Martin").some((w) => w.code === "NRAD"), false);\n  });\n\n  test("Dr. Hellmann wird ab September 2026 in den RD-Neurorad-Pool aufgenommen", () => {\n    assert.equal(getRbnOptionsForDate(2026, 7).includes("Dr. Hellmann (RAD/NRAD)"), false);\n    assert.equal(getRbnOptionsForDate(2026, 8).includes("Dr. Hellmann (RAD/NRAD)"), true);\n    assert.equal(getRbnOptionsForDate(2027, 0).includes("Dr. Hellmann (RAD/NRAD)"), true);\n  });\n`;
  text = replaceOnce(text, insertionAnchor, tests, "Hellmann-Tests");

  text = replaceOnce(
    text,
    '    assert.deepEqual(cellColor("CT"), { bg: "#FFEDD5", fg: "#C2410C" });',
    '    assert.deepEqual(cellColor("CT"), { bg: "#FFEDD5", fg: "#C2410C" });\n    assert.deepEqual(cellColor("NRAD"), { bg: "#E0F2FE", fg: "#0369A1" });',
    "NRAD-Farbtest"
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
    "README-Arbeitsplatzübersicht"
  );

  const h5 = '## 5. Stammdaten, Rollen, Qualifikationen & Sonderregeln\n';
  const note = `${h5}\n> **Personaländerung ab 01.09.2026 — Dr. Hellmann:** Dr. Hellmann wird ab September 2026 automatisch als **Oberärztin / Fachärztin für Radiologie** in den Monatsbestand aufgenommen und im Dienstplan **direkt unter Dr. Becker** einsortiert. Ihre Beschäftigung ist organisatorisch **50 % Klinik für Radiologie & Nuklearmedizin / 50 % Klinik für Neuroradiologie** geteilt. Deshalb besitzt ausschließlich sie den zusätzlichen Arbeitsplatzcode **NRAD**. Ebenfalls ab September 2026 erscheint sie in der manuellen Auswahl der Zeile **RD Neurorad** als **„Dr. Hellmann (RAD/NRAD)“**. Die 50/50-Zuordnung erzeugt bewusst **keine zusätzliche oder implizite Dienstreduktion**; bestehende BD-/HG-Regeln bleiben unverändert.\n`;
  text = replaceOnce(text, h5, note, "README-Personaländerung Kapitel 5");

  text = text.replace(
    /(^\|\s*T\s*\|[^\n]*Teleradiologie[^\n]*\|\s*$)/m,
    '$1\n| NRAD | Neuroradiologie | Nur Dr. Hellmann ab 01.09.2026 |'
  );

  const editorLine = '1. **Einsatz:** Auswahl eines exklusiven Status (z. B. Urlaub) oder freie Kombination mehrerer Arbeitsplätze (z. B. „MR/CT") durch Anklicken der farbigen Chips.';
  const editorReplacement = `${editorLine} Bei Dr. Hellmann wird ab September 2026 zusätzlich der Chip **NRAD – Neuroradiologie** angezeigt; bei allen anderen Personen wird dieser Spezialarbeitsplatz weder im Voll-Editor noch im Desktop-Schnell-Popover angeboten.`;
  text = replaceOnce(text, editorLine, editorReplacement, "README-Editor-Hellmann");

  writeFile(path, text, eol);
}

patchConstants();
patchEditor();
patchRenderGrid();
patchQuickActions();
patchModel();
patchTests();
patchReadme();

console.log("Hellmann-Update angewendet.");
