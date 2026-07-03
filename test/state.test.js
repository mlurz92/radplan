import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { mergeThreeWay, DATA, replaceAllData } from "../js/state.js";

// mergeThreeWay(base, local, server, stats) implementiert den feldweisen
// 3-Wege-Merge nach einem 409-Sync-Konflikt (siehe README §5.2). `base` ist
// der zuletzt bekannte Serverstand, `local` die eigenen unsynchronisierten
// Änderungen, `server` der Stand, gegen den der Speicherversuch verloren hat.
describe("mergeThreeWay (409-Konfliktauflösung)", () => {
  test("identische local/server-Werte werden ohne Konflikt übernommen", () => {
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
    const result = mergeThreeWay({ a: 1 }, { a: 2 }, { a: 2 }, stats);
    assert.deepEqual(result, { a: 2 });
    assert.equal(stats.conflicts, 0);
  });

  test("nur lokal geändert (server == base) -> lokaler Stand gewinnt ohne Konflikt", () => {
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
    const result = mergeThreeWay({ a: 1 }, { a: 2 }, { a: 1 }, stats);
    assert.deepEqual(result, { a: 2 });
    assert.equal(stats.localWins, 1);
    assert.equal(stats.conflicts, 0);
  });

  test("nur serverseitig geändert (local == base) -> Serverstand gewinnt ohne Konflikt", () => {
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
    const result = mergeThreeWay({ a: 1 }, { a: 1 }, { a: 2 }, stats);
    assert.deepEqual(result, { a: 2 });
    assert.equal(stats.serverWins, 1);
    assert.equal(stats.conflicts, 0);
  });

  test("echter Konflikt (beide Seiten geändert, unterschiedliche Werte) -> lokal gewinnt, wird gezählt", () => {
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
    const result = mergeThreeWay({ a: 1 }, { a: 2 }, { a: 3 }, stats);
    assert.equal(result.a, 2, "Policy: bei echtem Konflikt gewinnt der lokale Stand");
    assert.equal(stats.conflicts, 1);
  });

  test("rekursiver Merge auf Objektbäumen löst nur die tatsächlich kollidierenden Felder als Konflikt auf", () => {
    // Simuliert eine Monat->Mitarbeiter->Tag-Zelle: Tag 1 kollidiert echt,
    // Tag 2 wurde nur lokal geändert, Tag 3 nur serverseitig.
    const base = { "Dr. Martin": { 1: { assignment: "CT" }, 2: { assignment: "MR" }, 3: { assignment: "US" } } };
    const local = { "Dr. Martin": { 1: { assignment: "AN" }, 2: { assignment: "MA" }, 3: { assignment: "US" } } };
    const server = { "Dr. Martin": { 1: { assignment: "KUS" }, 2: { assignment: "MR" }, 3: { assignment: "W" } } };
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };

    const merged = mergeThreeWay(base, local, server, stats);

    assert.equal(merged["Dr. Martin"][1].assignment, "AN", "echter Konflikt -> lokal gewinnt");
    assert.equal(merged["Dr. Martin"][2].assignment, "MA", "nur lokal geändert -> lokaler Wert");
    assert.equal(merged["Dr. Martin"][3].assignment, "W", "nur serverseitig geändert -> Serverwert");
    assert.equal(stats.conflicts, 1);
    assert.equal(stats.localWins, 1);
    assert.equal(stats.serverWins, 1);
  });

  test("Felder, die nur auf einer Seite existieren, werden verlustfrei übernommen", () => {
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };
    const merged = mergeThreeWay(
      { emp1: { assignment: "CT" } },
      { emp1: { assignment: "CT" }, emp2: { assignment: "MR" } },
      { emp1: { assignment: "CT" }, emp3: { assignment: "US" } },
      stats,
    );
    assert.deepEqual(merged, {
      emp1: { assignment: "CT" },
      emp2: { assignment: "MR" },
      emp3: { assignment: "US" },
    });
  });

  test("keine Datenverluste über mehrere verschachtelte Ebenen hinweg (Monat->Mitarbeiter->Tag->Feld)", () => {
    const base = { "2026-5": { "Dr. Martin": { 1: { assignment: "CT", duty: "D" } } } };
    const local = { "2026-5": { "Dr. Martin": { 1: { assignment: "CT", duty: "HG" } } } };
    const server = { "2026-5": { "Dr. Martin": { 1: { assignment: "AN", duty: "D" } } } };
    const stats = { conflicts: 0, localWins: 0, serverWins: 0 };

    const merged = mergeThreeWay(base, local, server, stats);

    // `duty` wurde nur lokal geändert -> lokaler Wert (HG).
    assert.equal(merged["2026-5"]["Dr. Martin"][1].duty, "HG");
    // `assignment` wurde nur serverseitig geändert -> Serverwert (AN).
    assert.equal(merged["2026-5"]["Dr. Martin"][1].assignment, "AN");
    assert.equal(stats.conflicts, 0);
  });
});

// replaceAllData() ist die einzige zulässige Stelle zum kompletten Ersetzen
// des Dateninhalts (Server-Sync, Undo/Redo-Restore, Import) -- siehe die
// Kapselungs-Doku in state.js direkt über DATA.
describe("replaceAllData", () => {
  test("ersetzt den kompletten Inhalt von DATA, ohne die Objektidentität zu ändern", () => {
    const originalRef = DATA;
    Object.assign(DATA, { "2026-0": { employees: ["Dr. Martin"] } });

    replaceAllData({ "2026-5": { employees: ["Dr. Becker"] } });

    assert.equal(DATA, originalRef, "DATA bleibt dieselbe Objektreferenz (wichtig für Live-Imports in anderen Modulen)");
    assert.equal(DATA["2026-0"], undefined, "alte Monate wurden vollständig entfernt");
    assert.deepEqual(DATA["2026-5"], { employees: ["Dr. Becker"] });
  });

  test("akzeptiert ein leeres/undefined Argument und leert DATA", () => {
    Object.assign(DATA, { "2026-0": { employees: [] } });
    replaceAllData(undefined);
    assert.deepEqual(DATA, {});
  });
});
