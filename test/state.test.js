import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import {
  mergeThreeWay,
  DATA,
  replaceAllData,
  computeChangedMonthKeys,
  isMonthAffectedBySync,
  getLastConflictDetails,
  applyConflictChoice,
  setLastConflictDetails,
  mergePlanDrafts,
} from "../js/state.js";

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

// Vorschlag 17 (Konfliktlösungs-UX): mergeThreeWay sammelt bei echten
// Feld-Konflikten Pfad + beide Werte, damit die UI sie anzeigen und der
// Nutzer nachträglich pro Feld den Server-Stand übernehmen kann.
describe("mergeThreeWay — Konflikt-Details & applyConflictChoice (Vorschlag 17)", () => {
  test("ein echter Konflikt wird mit Pfad, lokalem und Server-Wert in stats.conflictDetails gesammelt", () => {
    const base = { "2026-5": { "Dr. Martin": { 1: { duty: "D" } } } };
    const local = { "2026-5": { "Dr. Martin": { 1: { duty: "HG" } } } };
    const server = { "2026-5": { "Dr. Martin": { 1: { duty: "frei" } } } };
    const stats = { conflicts: 0, localWins: 0, serverWins: 0, conflictDetails: [] };

    mergeThreeWay(base, local, server, stats);

    assert.equal(stats.conflictDetails.length, 1);
    assert.deepEqual(stats.conflictDetails[0].path, ["2026-5", "Dr. Martin", "1", "duty"]);
    assert.equal(stats.conflictDetails[0].local, "HG");
    assert.equal(stats.conflictDetails[0].server, "frei");
  });

  test("applyConflictChoice('server') übernimmt den Server-Wert an der konfliktbehafteten Stelle und entfernt den Eintrag", () => {
    Object.assign(DATA, { "2026-5": { employees: ["Dr. Martin"], assignments: { "Dr. Martin": { 1: { duty: "HG" } } }, rbn: {}, comments: {} } });
    setLastConflictDetails([
      { path: ["2026-5", "assignments", "Dr. Martin", "1", "duty"], local: "HG", server: "D" },
    ]);

    const applied = applyConflictChoice(["2026-5", "assignments", "Dr. Martin", "1", "duty"], "server");

    assert.equal(applied, true);
    assert.equal(DATA["2026-5"].assignments["Dr. Martin"][1].duty, "D", "Server-Wert wurde übernommen");
    assert.deepEqual(getLastConflictDetails(), [], "gelöster Konflikt wird aus der Liste entfernt");
  });

  test("applyConflictChoice('local') entfernt den Eintrag ohne DATA zu verändern", () => {
    Object.assign(DATA, { "2026-6": { employees: ["Dr. Martin"], assignments: { "Dr. Martin": { 1: { duty: "HG" } } }, rbn: {}, comments: {} } });
    setLastConflictDetails([
      { path: ["2026-6", "assignments", "Dr. Martin", "1", "duty"], local: "HG", server: "D" },
    ]);

    const applied = applyConflictChoice(["2026-6", "assignments", "Dr. Martin", "1", "duty"], "local");

    assert.equal(applied, true);
    assert.equal(DATA["2026-6"].assignments["Dr. Martin"][1].duty, "HG", "lokaler Wert bleibt unverändert");
    assert.deepEqual(getLastConflictDetails(), []);
  });

  test("applyConflictChoice liefert false für einen unbekannten Pfad", () => {
    setLastConflictDetails([]);
    assert.equal(applyConflictChoice(["nicht-vorhanden"], "server"), false);
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

// Regressionstest für Issue 4: ein periodischer Hintergrund-Sync
// (`radplan-sync-update`, siehe syncWithServer/forceSyncWithServer) darf die
// lokale Undo/Redo-Historie NUR dann invalidieren, wenn er tatsächlich den
// gerade aktiv bearbeiteten Monat verändert hat. computeChangedMonthKeys()
// und isMonthAffectedBySync() sind die dafür zuständige, von history.js
// konsumierte Entscheidungslogik.
describe("computeChangedMonthKeys / isMonthAffectedBySync (Issue 4: gezielte History-Invalidierung)", () => {
  test("computeChangedMonthKeys erkennt geänderte, neu hinzugekommene und entfernte Monate", () => {
    const oldMain = {
      "2026-5": { employees: ["A"] },
      "2026-6": { employees: ["B"] },
      "2026-7": { employees: ["C"] },
    };
    const newMain = {
      "2026-5": { employees: ["A"] },        // unverändert
      "2026-6": { employees: ["B", "X"] },   // verändert
      "2026-8": { employees: ["D"] },        // neu (2026-7 entfernt)
    };
    const changed = computeChangedMonthKeys(oldMain, newMain);
    assert.deepEqual(new Set(changed), new Set(["2026-6", "2026-7", "2026-8"]));
  });

  test("computeChangedMonthKeys liefert eine leere Liste, wenn sich inhaltlich nichts unterscheidet", () => {
    const main = { "2026-5": { employees: ["A"] } };
    assert.deepEqual(computeChangedMonthKeys(main, { "2026-5": { employees: ["A"] } }), []);
  });

  test("isMonthAffectedBySync: Sync auf einen ANDEREN Monat betrifft den aktiven Monat NICHT -> Historie bleibt erhalten", () => {
    // Nutzer bearbeitet gerade 2026-5 (Juni); der Hintergrund-Sync hat aber
    // ausschließlich 2026-6 verändert.
    const changedMonths = ["2026-6"];
    assert.equal(isMonthAffectedBySync(changedMonths, 2026, 5), false);
  });

  test("isMonthAffectedBySync: Sync betrifft den aktiven Monat -> Historie muss zurückgesetzt werden", () => {
    const changedMonths = ["2026-5", "2026-6"];
    assert.equal(isMonthAffectedBySync(changedMonths, 2026, 5), true);
  });

  test("isMonthAffectedBySync: fehlendes/kein Array (unbekannter Aufrufer) -> konservativ true", () => {
    assert.equal(isMonthAffectedBySync(undefined, 2026, 5), true);
    assert.equal(isMonthAffectedBySync(null, 2026, 5), true);
  });
});

// Bug-Hunt-Fix: mergePlanDrafts musste vormals bei einem 409-Konflikt JEDEN
// lokal ungespeicherten Plan-Entwurf außer dem gerade aktiven stillschweigend
// durch die (potenziell ältere) Server-Version ersetzen. Jeder lokal
// vorhandene Entwurf muss unabhängig vom aktiven Monat gewinnen.
describe("mergePlanDrafts (Plan-Entwürfe bei 409-Konfliktauflösung)", () => {
  test("ein NICHT aktiver lokaler Plan-Entwurf wird nicht mehr durch die Server-Version verworfen", () => {
    const localPlans = {
      "2026-5": { assignments: { local: true } },
      "2026-6": { assignments: { local: true } },
    };
    const serverPlans = {
      "2026-5": { assignments: { server: true } },
      "2026-6": { assignments: { server: true } },
    };
    const merged = mergePlanDrafts(localPlans, serverPlans);
    assert.deepEqual(merged["2026-5"], { assignments: { local: true } });
    assert.deepEqual(merged["2026-6"], { assignments: { local: true } });
  });

  test("ein server-seitiger Plan-Entwurf ohne lokales Gegenstück bleibt erhalten", () => {
    const merged = mergePlanDrafts({}, { "2026-7": { assignments: { server: true } } });
    assert.deepEqual(merged["2026-7"], { assignments: { server: true } });
  });

  test("akzeptiert fehlendes/undefined serverPlans", () => {
    const merged = mergePlanDrafts({ "2026-5": { a: 1 } }, undefined);
    assert.deepEqual(merged, { "2026-5": { a: 1 } });
  });
});
