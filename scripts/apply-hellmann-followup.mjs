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

{
  const path = "js/editor.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;
  text = replaceOnce(
    text,
    '  WORKPLACES, STATUSES, WISH_TYPES, RBN_ROW_KEY, RBN_ROW_LABEL,',
    '  STATUSES, WISH_TYPES, RBN_ROW_KEY, RBN_ROW_LABEL,',
    "Editor ungenutzter WORKPLACES-Import"
  );
  text = replaceOnce(
    text,
    '  let autoFCount = 0;\n  const touchedDays = new Set();\n  days.forEach((targetDay) => {\n    const hadD = getCell(y, m, emp, targetDay).duty === "D";\n    setCell(y, m, emp, targetDay, {',
    '  let autoFCount = 0;\n  let bdHardMaxSkipped = 0;\n  let savedCount = 0;\n  const touchedDays = new Set();\n  days.forEach((targetDay) => {\n    const hadD = getCell(y, m, emp, targetDay).duty === "D";\n    if (duty === "D" && !hadD && !canAssignBdWithinHardLimit(y, m, emp, targetDay)) {\n      bdHardMaxSkipped++;\n      return;\n    }\n    setCell(y, m, emp, targetDay, {',
    "Editor Multi-Selection BD-Maximum"
  );
  text = replaceOnce(
    text,
    '    touchedDays.add(targetDay);\n\n    if (duty === "D") {',
    '    savedCount++;\n    touchedDays.add(targetDay);\n\n    if (duty === "D") {',
    "Editor gespeicherte Tage zählen"
  );
  text = replaceOnce(
    text,
    '  if (days.length > 1) {\n    const fSuffix = autoFCount > 0 ? ` (inkl. ${autoFCount}x F automatisch)` : "";\n    showToast(`${days.length} Tage gespeichert${fSuffix}`);\n  } else if (autoFCount > 0) {\n    showToast("F automatisch gesetzt");\n  }',
    '  if (days.length > 1) {\n    const fSuffix = autoFCount > 0 ? ` (inkl. ${autoFCount}x F automatisch)` : "";\n    const maxSuffix = bdHardMaxSkipped > 0 ? ` · ${bdHardMaxSkipped} wegen BD-Monatsmaximum übersprungen` : "";\n    showToast(`${savedCount} ${savedCount === 1 ? "Tag" : "Tage"} gespeichert${fSuffix}${maxSuffix}`);\n  } else if (bdHardMaxSkipped > 0) {\n    showToast(`BD nicht gesetzt: Monatsmaximum erreicht`);\n  } else if (autoFCount > 0) {\n    showToast("F automatisch gesetzt");\n  }',
    "Editor Toast bei Hard-Max"
  );
  writeFile(path, text, eol);
}

{
  const path = "js/quick-actions.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;
  text = replaceOnce(
    text,
    "import { WORKPLACES, STATUSES, nextCalendarDay, getWorkplacesForEmployee, getMaxBdTarget } from './constants.js';",
    "import { STATUSES, nextCalendarDay, getWorkplacesForEmployee, getMaxBdTarget } from './constants.js';",
    "Quick-Actions ungenutzter WORKPLACES-Import"
  );
  writeFile(path, text, eol);
}

{
  const path = "js/autoplan.js";
  const { text: raw, eol } = readFile(path);
  let text = raw;
  text = replaceOnce(
    text,
    '  getCtLeadershipPartner,\n',
    '',
    "Autoplan ungenutzter Legacy-Partner-Import"
  );
  text = replaceOnce(
    text,
    'function getAssignmentForCtCoverage(y, m, emp, day, assignments) {\n  if (assignments?.[emp]?.[day]) return assignments[emp][day];\n  return DATA[monthKey(y, m)]?.assignments?.[emp]?.[day] || {};\n}',
    'function getAssignmentForCtCoverage(y, m, emp, day, assignments) {\n  return assignments?.[emp]?.[day] || {};\n}',
    "CT-Verfügbarkeit nicht mit stale DATA vermischen"
  );
  text = replaceOnce(
    text,
    '  const members = getCtCoverageMembersForDate(next.y, next.m);\n  if (!members.includes(emp)) return false;\n\n  // Der neue BD erzeugt für emp am Folgetag einen Ruhetag. Zulässig ist er\n  // daher nur, wenn mindestens ein anderes Poolmitglied an diesem Werktag\n  // für die CT-Vertretung verfügbar bleibt. Ab Oktober zählt Hellmann bei\n  // NRAD-Einsatz ausdrücklich NICHT als CT-verfügbar.\n  return !members.some((member) =>\n    member !== emp && isCTCoverageMemberAvailable(next.y, next.m, member, next.d, assignments)\n  );',
    '  const members = getCtCoverageMembersForDate(next.y, next.m);\n  if (!members.includes(emp)) return false;\n  const nextAssignments = next.y === y && next.m === m\n    ? assignments\n    : (DATA[monthKey(next.y, next.m)]?.assignments || {});\n\n  // Der neue BD erzeugt für emp am Folgetag einen Ruhetag. Zulässig ist er\n  // daher nur, wenn mindestens ein anderes Poolmitglied an diesem Werktag\n  // für die CT-Vertretung verfügbar bleibt. Ab Oktober zählt Hellmann bei\n  // NRAD-Einsatz ausdrücklich NICHT als CT-verfügbar.\n  return !members.some((member) =>\n    member !== emp && isCTCoverageMemberAvailable(next.y, next.m, member, next.d, nextAssignments)\n  );',
    "CT-Konflikt monatsübergreifend korrekt lesen"
  );
  writeFile(path, text, eol);
}

console.log("Hellmann-Follow-up-Härtung angewendet.");
