import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA } from "../js/state.js";
import {
  isNextDayVacationLike,
  isDutyExempt,
  dutyKey,
  computeGridConflicts,
  computeFairnessSpread,
  averageFromArray,
  hasCTLeadershipConflict,
} from "../js/autoplan.js";

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

function buildMonth(assignmentsByEmp) {
  const employees = Object.keys(assignmentsByEmp);
  const assignments = {};
  for (const [emp, days] of Object.entries(assignmentsByEmp)) {
    assignments[emp] = { ...days };
  }
  return { employees, assignments, rbn: {}, comments: {} };
}

describe("isNextDayVacationLike", () => {
  beforeEach(resetData);

  test("erkennt Urlaub am Folgetag innerhalb desselben Monats", () => {
    const assignments = { "Dr. Martin": { 11: { assignment: "U" } } };
    assert.equal(isNextDayVacationLike(2026, 5, "Dr. Martin", 10, assignments), true);
    assert.equal(isNextDayVacationLike(2026, 5, "Dr. Martin", 9, assignments), false);
  });

  test("erkennt FZA/WB als urlaubsähnlich (erweiterte Definition ggü. isNextDayVacation)", () => {
    const assignments = { "Dr. Martin": { 11: { assignment: "FZA" } } };
    assert.equal(isNextDayVacationLike(2026, 5, "Dr. Martin", 10, assignments), true);
  });

  test("erkennt persistierten Urlaub im Folgemonat über DATA", () => {
    DATA["2026-6"] = buildMonth({ "Dr. Martin": { 1: { assignment: "U" } } });
    const assignments = { "Dr. Martin": {} };
    // Tag 30 im Juni (m=5) ist der letzte Tag des Monats -> Folgetag ist Juli (m=6), Tag 1.
    assert.equal(isNextDayVacationLike(2026, 5, "Dr. Martin", 30, assignments), true);
  });

  test("REGRESSION: erkennt auch noch nicht persistierten Urlaub im Folgemonat via externalAssignments", () => {
    // Vor dem Fix wurde der 6. Parameter (externalAssignments) beim Aufruf aus
    // computeAutoPlan() zwar übergeben, aber von der Funktionssignatur (nur 5
    // Parameter) stillschweigend ignoriert -> ein während desselben Autoplan-
    // Laufs in den Folgemonat vorgemerkter Urlaubstag wurde nicht erkannt.
    const assignments = { "Dr. Martin": {} };
    const externalAssignments = { "2026-6": { "Dr. Martin": { 1: { assignment: "U" } } } };
    assert.equal(
      isNextDayVacationLike(2026, 5, "Dr. Martin", 30, assignments, externalAssignments),
      true,
    );
  });

  test("kein Urlaub am Folgetag -> false", () => {
    const assignments = { "Dr. Martin": { 11: { assignment: "CT" } } };
    assert.equal(isNextDayVacationLike(2026, 5, "Dr. Martin", 10, assignments), false);
  });
});

describe("isDutyExempt", () => {
  test("Prof. Schäfer ist laut SPECIAL_RULES dienstbefreit", () => {
    assert.equal(isDutyExempt("Prof. Schäfer"), true);
    assert.equal(isDutyExempt("Dr. Martin"), false);
  });
});

describe("dutyKey", () => {
  test("erzeugt einen eindeutigen, stabilen Schlüssel pro Person+Tag", () => {
    assert.equal(dutyKey("Dr. Martin", 5), "Dr. Martin@@5");
    assert.notEqual(dutyKey("Dr. Martin", 5), dutyKey("Dr. Becker", 5));
  });
});

describe("computeGridConflicts", () => {
  beforeEach(resetData);

  test("meldet Mehrfachbesetzung, wenn zwei Personen am selben Tag denselben Dienst haben", () => {
    DATA["2026-5"] = buildMonth({
      "Dr. Martin": { 10: { duty: "D", assignment: "F" } },
      "Dr. Becker": { 10: { duty: "D", assignment: "F" } },
    });
    const conflicts = computeGridConflicts(2026, 5);
    assert.ok(conflicts.get(dutyKey("Dr. Martin", 10))?.some((r) => r.includes("Mehrfachbesetzung")));
    assert.ok(conflicts.get(dutyKey("Dr. Becker", 10))?.some((r) => r.includes("Mehrfachbesetzung")));
  });

  test("meldet fehlende Freistellung nach einem Bereitschaftsdienst", () => {
    DATA["2026-5"] = buildMonth({
      "Dr. Martin": { 10: { duty: "D" }, 11: { assignment: "CT" } },
    });
    const conflicts = computeGridConflicts(2026, 5);
    assert.ok(conflicts.get(dutyKey("Dr. Martin", 10))?.some((r) => r.includes("ohne Freistellung")));
  });

  test("keine Konflikte bei sauber ausgeruhtem Plan", () => {
    DATA["2026-5"] = buildMonth({
      "Dr. Martin": { 10: { duty: "D" }, 11: { assignment: "F" } },
    });
    const conflicts = computeGridConflicts(2026, 5);
    assert.equal(conflicts.size, 0);
  });
});

describe("hasCTLeadershipConflict", () => {
  beforeEach(resetData);

  test("erkennt Konflikt, wenn der CT-Partner am Folgetag abwesend ist", () => {
    // Dr. Becker/Dr. Martin sind laut SPECIAL_RULES.ctLeadershipPairs ein Paar.
    // 6. Juli 2026 ist ein Montag (Werktag) -> Folgetag von Sonntag, 5. Juli.
    const assignments = { "Dr. Martin": { 6: { assignment: "U" } } };
    assert.equal(hasCTLeadershipConflict(2026, 6, "Dr. Becker", 5, assignments), true);
  });

  test("kein Konflikt für Personen ohne CT-Leitungspartner", () => {
    const assignments = {};
    assert.equal(hasCTLeadershipConflict(2026, 6, "Dr. Martin", 5, assignments), false);
  });
});

describe("Statistik-Helfer", () => {
  test("averageFromArray berechnet den Mittelwert, 0 bei leerem Array", () => {
    assert.equal(averageFromArray([1, 2, 3]), 2);
    assert.equal(averageFromArray([]), 0);
  });

  test("computeFairnessSpread liefert die Populations-Standardabweichung", () => {
    assert.equal(computeFairnessSpread([2, 2, 6, 6]), 2);
    assert.equal(computeFairnessSpread([4]), 0, "eine einzelne Person hat per Definition Streuung 0");
    assert.equal(computeFairnessSpread([]), 0);
  });
});
