import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, setPlanMode, setPlanData } from "../js/state.js";
import {
  isNextDayVacationLike,
  isDutyExempt,
  dutyKey,
  computeGridConflicts,
  computeFairnessSpread,
  averageFromArray,
  hasCTLeadershipConflict,
  computeAutoPlan,
  MIN_DUTY_SPACING_DAYS,
  SOFT_DUTY_SPACING_SHORT,
  SOFT_DUTY_SPACING_LONG,
} from "../js/autoplan.js";
import { daysInMonth } from "../js/constants.js";

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

describe("Punkt 18: zentrale Abstands-Konstanten (3-Tage-Abstand-Regel)", () => {
  test("MIN_DUTY_SPACING_DAYS/SOFT_DUTY_SPACING_SHORT/LONG sind konsistent benannt und geordnet", () => {
    assert.equal(MIN_DUTY_SPACING_DAYS, 3);
    assert.equal(SOFT_DUTY_SPACING_SHORT, 4);
    assert.equal(SOFT_DUTY_SPACING_LONG, 5);
    assert.ok(MIN_DUTY_SPACING_DAYS < SOFT_DUTY_SPACING_SHORT);
    assert.ok(SOFT_DUTY_SPACING_SHORT < SOFT_DUTY_SPACING_LONG);
  });
});

describe("Punkt 11: Neural Fitness Index (NFI) als gewichtete Komposition", () => {
  beforeEach(resetData);

  function buildFixturePlanData(year, month, employees) {
    const dim = daysInMonth(year, month);
    const assignments = {};
    employees.forEach((emp) => { assignments[emp] = {}; });
    return { employees: [...employees], assignments, wishes: {}, pins: {}, dim };
  }

  test("liefert einen auf [0,100] geklemmten Score mit den dokumentierten Teilkennzahlen", async () => {
    const year = 2026;
    const month = 6;
    const employees = [
      "Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Fr. Thaler", "Dr. Becker", "Dr. Martin",
      "Hr. El Houba", "Hr. Torki", "Hr. Sebastian",
    ];

    state.year = year;
    state.month = month;
    setPlanMode(true);
    setPlanData(buildFixturePlanData(year, month, employees));

    const result = await computeAutoPlan(undefined, "standard");
    const quality = result.summary.quality;

    const score = Number(quality.score);
    assert.ok(Number.isFinite(score), "NFI muss eine endliche Zahl sein");
    assert.ok(score >= 0 && score <= 100, `NFI muss in [0,100] liegen, war ${score}`);
    // Die Rohdaten, aus denen sich der NFI zusammensetzt, müssen weiterhin
    // Teil von summary.quality sein (UI liest diese Felder direkt aus).
    assert.ok(Number.isFinite(quality.bdSpread));
    assert.ok(Number.isFinite(quality.hgSpread));
    assert.ok(Number.isFinite(quality.weekendSpread));
    assert.ok(Number.isFinite(quality.wishFulfillmentRate));
    assert.ok(Number.isFinite(quality.dutyCoverageMisses));
    assert.ok(Number.isFinite(quality.hgCoverageMisses));

    setPlanMode(false);
    setPlanData(null);
  });

  test("ein Plan ohne jegliche Coverage-Lücken erzielt einen deutlich höheren NFI als ein Plan mit vielen Lücken", async () => {
    // Simuliert die 36%/24%-Abdeckungsgewichte: ein Team, das kaum jemanden
    // zur Verfügung hat (viele NO_DUTY-Wünsche), muss einen spürbar
    // niedrigeren NFI erzeugen als ein voll besetzbares Team.
    const year = 2026;
    const month = 6;
    const dim = daysInMonth(year, month);

    const goodEmployees = [
      "Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Fr. Thaler", "Dr. Becker", "Dr. Martin",
      "Hr. El Houba", "Hr. Torki", "Hr. Sebastian",
    ];
    state.year = year;
    state.month = month;
    setPlanMode(true);
    setPlanData(buildFixturePlanData(year, month, goodEmployees));
    const goodResult = await computeAutoPlan(undefined, "standard");

    const scarceEmployees = ["Dr. Martin", "Hr. Torki"];
    const scarcePlanData = buildFixturePlanData(year, month, scarceEmployees);
    // Fast der gesamte Monat ist für beide Personen gesperrt -> massive
    // Coverage-Lücken sind unvermeidbar.
    scarcePlanData.wishes = { "Dr. Martin": {}, "Hr. Torki": {} };
    for (let d = 1; d <= dim - 2; d++) {
      scarcePlanData.wishes["Dr. Martin"][d] = "NO_DUTY";
      scarcePlanData.wishes["Hr. Torki"][d] = "NO_DUTY";
    }
    setPlanData(scarcePlanData);
    const scarceResult = await computeAutoPlan(undefined, "standard");

    assert.ok(
      Number(goodResult.summary.quality.score) > Number(scarceResult.summary.quality.score),
      `voll besetzbarer Plan (${goodResult.summary.quality.score}) sollte einen höheren NFI haben als ein Plan mit erzwungenen Lücken (${scarceResult.summary.quality.score})`,
    );
    assert.ok(scarceResult.summary.quality.dutyCoverageMisses > 0 || scarceResult.summary.quality.hgCoverageMisses > 0);

    setPlanMode(false);
    setPlanData(null);
  });
});
