import fs from "node:fs";

const path = "js/app.js";
let text = fs.readFileSync(path, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";

function replaceOnce(search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Patch-Anker fehlt: ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Patch-Anker nicht eindeutig: ${label}`);
  text = text.slice(0, first) + replacement + text.slice(first + search.length);
}

replaceOnce(
  ["  dutyOwner,", "  getEmployeesForYear,"].join(eol),
  ["  dutyOwner,", "  canAssignBdWithinHardLimit,", "  getEmployeesForYear,"].join(eol),
  "Model-Import"
);

const oldBlock = [
  '      if (noMod && (e.key === "d" || e.key === "D")) { ',
  '        e.preventDefault(); ',
  '        const owner = dutyOwner(state.year, state.month, state.edit.day, "D"); ',
  '        if (!owner || owner === state.edit.emp) { ',
  '          state.ed.duty = state.ed.duty === "D" ? null : "D"; ',
  '          refreshEditorChips(); ',
  '        } ',
  '        return; ',
  '      }',
].join(eol);

const newBlock = [
  '      if (noMod && (e.key === "d" || e.key === "D")) {',
  '        e.preventDefault();',
  '        const owner = dutyOwner(state.year, state.month, state.edit.day, "D");',
  '        const removing = state.ed.duty === "D";',
  '        if (',
  '          (!owner || owner === state.edit.emp) &&',
  '          (removing || canAssignBdWithinHardLimit(state.year, state.month, state.edit.emp, state.edit.day))',
  '        ) {',
  '          state.ed.duty = removing ? null : "D";',
  '          refreshEditorChips();',
  '        } else if (!removing && !canAssignBdWithinHardLimit(state.year, state.month, state.edit.emp, state.edit.day)) {',
  '          showToast("BD-Monatsmaximum für diese Person erreicht");',
  '        }',
  '        return;',
  '      }',
].join(eol);

replaceOnce(oldBlock, newBlock, "Editor-Tastatur BD-Maximum");

fs.writeFileSync(path, text, "utf8");
console.log("app.js auf minimalen Hellmann-Diff reduziert.");
