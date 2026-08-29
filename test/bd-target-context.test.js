import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Statischer Schutz für die zeitlich gestaffelten BD-Ziele
// (SPECIAL_RULES.bdTargetSchedule): getReducedBdTarget/getMaxBdTarget/
// getMinBdTarget liefern die Staffelstufe NUR, wenn ihnen der Planmonat
// mitgegeben wird. Ein Aufruf ohne (y, m) fällt still auf die statischen
// Regeln zurück und würde eine Person in ihrem Einarbeitungsmonat mit dem
// vollen Standardziel verplanen — ohne dass irgendein Laufzeitfehler
// auftritt. Deshalb wird hier erzwungen, dass in der Anwendung kein
// einarmiger Aufruf dieser Getter existiert.
const GETTERS = ["getReducedBdTarget", "getMaxBdTarget", "getMinBdTarget"];
// fileURLToPath statt URL#pathname: letzteres liefert einen prozentkodierten
// URL-Pfad und bricht damit unter Windows sowie bei Leer-/Sonderzeichen im
// Checkout-Pfad.
const SRC_DIR = fileURLToPath(new URL("../js/", import.meta.url));

// Ein Argument = alles bis zur schließenden Klammer, ohne Komma und ohne
// verschachtelte Klammern.
function singleArgPattern(getter) {
  return new RegExp(getter + "\\(\\s*[^,()]*\\)", "g");
}

// Rekursiv, damit auch Unterverzeichnisse wie js/analytics/ erfasst werden --
// dort lag beim Einführen der Staffelung tatsächlich ein übersehener Aufruf.
function sourceFiles(dir = SRC_DIR, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return sourceFiles(join(dir, entry.name), rel);
    if (!entry.name.endsWith(".js")) return [];
    return [{ file: rel, code: readFileSync(join(dir, entry.name), "utf8") }];
  });
}

function findSingleArgCalls(getter) {
  const offenders = [];
  sourceFiles().forEach(({ file, code }) => {
    code.split("\n").forEach((line, i) => {
      // Deklaration sowie JSDoc-/Kommentarzeilen ausnehmen.
      if (/^\s*(\*|\/\/)/.test(line)) return;
      if (new RegExp("(export )?function " + getter + "\\(").test(line)) return;
      const matches = line.match(singleArgPattern(getter));
      if (matches) offenders.push(`${file}:${i + 1}: ${matches.join(", ")}`);
    });
  });
  return offenders;
}

describe("BD-Ziel-Getter werden immer mit Monatskontext aufgerufen", () => {
  GETTERS.forEach((getter) => {
    test(`${getter} wird in js/ nie ohne (y, m) aufgerufen`, () => {
      const offenders = findSingleArgCalls(getter);
      assert.deepEqual(
        offenders,
        [],
        `Aufruf(e) ohne Monatskontext gefunden:\n${offenders.join("\n")}`
      );
    });
  });

  test("der Wächter erkennt einen einarmigen Aufruf tatsächlich", () => {
    // Ohne diese Selbstprüfung könnte ein fehlerhaftes Muster stillschweigend
    // nie etwas finden und der Schutz wäre wertlos.
    const pattern = singleArgPattern("getMaxBdTarget");
    assert.ok(pattern.test("  const max = getMaxBdTarget(emp);"));
    pattern.lastIndex = 0;
    assert.equal(pattern.test("  const max = getMaxBdTarget(emp, y, m);"), false);
  });
});
