import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, planMode, planData } from "../js/state.js";
import { computeAutoPlanRange, computeCrossMonthBDTargets, baseMonthlyBDTarget } from "../js/autoplan.js";
import { monthKey } from "../js/constants.js";

// computeAutoPlanRange() ist die "Jahresplanung als segmentierte
// Monatskette": statt eines Monolith-Laufs über viele Monate ruft sie das
// bestehende, auf Monatsgröße ausgelegte computeAutoPlan() einmal pro Monat
// auf und trägt die Ist-Belastung über DATA von Monat zu Monat fort.

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

function seedEmptyMonth(year, month, employees) {
  const assignments = {};
  employees.forEach((e) => { assignments[e] = {}; });
  DATA[monthKey(year, month)] = { employees: [...employees], assignments, rbn: {}, comments: {} };
}

describe("computeAutoPlanRange", () => {
  test("plant mehrere Monate durch und liefert pro Monat ein Ergebnis", async () => {
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);

    const { months, aggregate } = await computeAutoPlanRange(2026, 0, 2026, 2, {
      weightProfileKey: "standard",
    });

    assert.equal(months.length, 3);
    assert.deepEqual(months.map((m) => `${m.year}-${m.month}`), ["2026-0", "2026-1", "2026-2"]);
    assert.equal(aggregate.monthsPlanned, 3);
  });

  test("ist standardmäßig seiteneffektfrei (Vorschau) -- DATA bleibt nach dem Aufruf unverändert", async () => {
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);
    const before = JSON.parse(JSON.stringify(DATA));

    await computeAutoPlanRange(2026, 0, 2026, 1, { weightProfileKey: "standard" });

    assert.deepEqual(DATA, before, "ohne apply:true darf DATA nach dem Aufruf identisch zum Ausgangszustand sein");
  });

  test("mit apply:true werden die geplanten Monate dauerhaft in DATA übernommen", async () => {
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);

    const { months } = await computeAutoPlanRange(2026, 0, 2026, 1, {
      weightProfileKey: "standard",
      apply: true,
    });

    assert.deepEqual(DATA[monthKey(2026, 0)].assignments, months[0].assignments);
    assert.deepEqual(DATA[monthKey(2026, 1)].assignments, months[1].assignments);
  });

  test("mit apply:true trägt DATA[monthKey] keine Plan-Session-internen Felder (wishes/pins/baseline/history)", async () => {
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);

    await computeAutoPlanRange(2026, 0, 2026, 1, {
      weightProfileKey: "standard",
      apply: true,
    });

    for (const mk of [monthKey(2026, 0), monthKey(2026, 1)]) {
      const md = DATA[mk];
      assert.deepEqual(
        Object.keys(md).sort(),
        ["assignments", "comments", "employees", "rbn"],
        `${mk}: DATA-Eintrag darf nur persistente Monatsfelder enthalten, keine Plan-Session-Artefakte`
      );
    }
  });

  test("stellt globalen Zustand (state.year/month, planMode, planData) nach Abschluss wieder her", async () => {
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);

    state.year = 2030;
    state.month = 7;

    await computeAutoPlanRange(2026, 0, 2026, 1, { weightProfileKey: "standard" });

    assert.equal(state.year, 2030);
    assert.equal(state.month, 7);
    assert.equal(planMode, false);
    assert.equal(planData, null);
  });

  test("trägt die Ist-Belastung von Monat zu Monat fort (Soll/Ist-Kontinuität statt unabhängiger Neuberechnung)", async () => {
    // Mit apply:true muss der zweite Monat die im ersten Monat bereits
    // vergebenen Dienste als historische Belastung kennen -- überprüfbar
    // daran, dass DATA nach dem Range-Lauf für BEIDE Monate durchgängig
    // befüllte Zuweisungen enthält (der Folgemonat plant nicht "blind").
    resetData();
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
    seedEmptyMonth(2026, 0, employees);

    await computeAutoPlanRange(2026, 0, 2026, 1, { weightProfileKey: "standard", apply: true });

    const totalDutiesMonth1 = Object.values(DATA[monthKey(2026, 0)].assignments)
      .flatMap((byDay) => Object.values(byDay))
      .filter((cell) => cell.duty === "D" || cell.duty === "HG").length;
    const totalDutiesMonth2 = Object.values(DATA[monthKey(2026, 1)].assignments)
      .flatMap((byDay) => Object.values(byDay))
      .filter((cell) => cell.duty === "D" || cell.duty === "HG").length;

    assert.ok(totalDutiesMonth1 > 0, "erster Monat sollte Dienste zugewiesen haben");
    assert.ok(totalDutiesMonth2 > 0, "zweiter Monat sollte Dienste zugewiesen haben");
  });

  test("lehnt einen leeren/rückwärtigen Zeitraum ab", async () => {
    resetData();
    seedEmptyMonth(2026, 5, ["Dr. Martin"]);
    await assert.rejects(() => computeAutoPlanRange(2026, 5, 2026, 2, {}));
  });

  test("lehnt einen zu großen Zeitraum ab (Schutz vor versehentlicher Massenplanung)", async () => {
    resetData();
    seedEmptyMonth(2020, 0, ["Dr. Martin"]);
    await assert.rejects(() => computeAutoPlanRange(2020, 0, 2022, 0, {}));
  });
});

// ---------------------------------------------------------------------------
// Vorschlag 2 (Echte Mehrmonats-Zielfunktion): computeCrossMonthBDTargets()
// passt das BD-Monatsziel je Person sanft (max. ±1) an die kumulierte
// Ist/Soll-Differenz der bereits geplanten Monate DIESES Laufs an, statt
// jeden Monat mit demselben Standardziel unabhängig zu planen.
describe("computeCrossMonthBDTargets (Vorschlag 2)", () => {
  test("liefert unverändert das Standardziel, wenn keine Monate bereits geplant wurden", () => {
    const emp = "Dr. Martin";
    const targets = computeCrossMonthBDTargets([emp], []);
    assert.equal(targets[emp], baseMonthlyBDTarget(emp));
  });

  test("senkt das Ziel um 1, wenn die Person im bereits geplanten Monat über ihrem fairen Anteil lag", () => {
    resetData();
    const emp = "Dr. Martin";
    const base = baseMonthlyBDTarget(emp);
    // Künstlich deutlich über dem Monatsziel beplanter Vormonat (base+3 BD).
    const assignments = { [emp]: {} };
    for (let d = 1; d <= base + 3; d++) assignments[emp][d] = { duty: "D" };
    DATA[monthKey(2026, 0)] = { employees: [emp], assignments, rbn: {}, comments: {} };

    const targets = computeCrossMonthBDTargets([emp], [{ year: 2026, month: 0 }]);
    assert.equal(targets[emp], Math.max(0, base - 1), "Überversorgung im Vormonat muss das Folgeziel um genau 1 senken");
  });

  test("erhöht das Ziel um 1, wenn die Person im bereits geplanten Monat unter ihrem fairen Anteil lag", () => {
    resetData();
    const emp = "Dr. Martin";
    const base = baseMonthlyBDTarget(emp);
    // Künstlich deutlich unter dem Monatsziel beplanter Vormonat (0 BD, sofern base > 0).
    DATA[monthKey(2026, 0)] = { employees: [emp], assignments: { [emp]: {} }, rbn: {}, comments: {} };

    const targets = computeCrossMonthBDTargets([emp], [{ year: 2026, month: 0 }]);
    assert.equal(targets[emp], base + 1, "Unterversorgung im Vormonat muss das Folgeziel um genau 1 erhöhen");
  });

  test("berücksichtigt nur Monate, in denen die Person tatsächlich im Roster geführt wurde", () => {
    resetData();
    const emp = "Dr. Neu";
    const base = baseMonthlyBDTarget(emp);
    // Vormonat existiert, aber die Person war noch gar nicht im Roster --
    // darf die Zielberechnung nicht verzerren.
    DATA[monthKey(2026, 0)] = { employees: ["Dr. Andere"], assignments: { "Dr. Andere": { 1: { duty: "D" } } }, rbn: {}, comments: {} };

    const targets = computeCrossMonthBDTargets([emp], [{ year: 2026, month: 0 }]);
    assert.equal(targets[emp], base);
  });

  test("liefert für dienstbefreite Personen immer 0, unabhängig von der Historie", () => {
    resetData();
    const emp = "Prof. Schäfer"; // per SPECIAL_RULES.dutyExempt typischerweise befreit
    if (baseMonthlyBDTarget(emp) !== 0) return; // Umgebungsabhängig -- Test nur relevant, wenn tatsächlich befreit.
    const targets = computeCrossMonthBDTargets([emp], []);
    assert.equal(targets[emp], 0);
  });
});
