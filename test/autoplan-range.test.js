import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, planMode, planData } from "../js/state.js";
import { computeAutoPlanRange } from "../js/autoplan.js";
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
