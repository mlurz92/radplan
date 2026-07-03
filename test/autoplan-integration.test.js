import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, setPlanMode, setPlanData } from "../js/state.js";
import { computeAutoPlan } from "../js/autoplan.js";
import { daysInMonth } from "../js/constants.js";

// End-to-End-Regressionstest für den kompletten Auto-Plan-Lauf (Greedy +
// Bundling + Multi-Zyklus-Optimierung inkl. BD-/HG-Swap-Schleifen). Dient
// insbesondere als Absicherung für den Delta-Objective-Umbau von
// runPhase4_BDOptimize/runPhase7_HGOptimize (siehe autoplan.js): eine echte,
// vollständige Planung darf dadurch weder Mehrfachbesetzungen produzieren
// noch ihr Ergebnis verändern.
function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

function buildFixturePlanData(year, month, employees) {
  const dim = daysInMonth(year, month);
  const assignments = {};
  employees.forEach((emp) => { assignments[emp] = {}; });
  return { employees: [...employees], assignments, wishes: {}, pins: {}, dim };
}

describe("computeAutoPlan (End-to-End)", () => {
  test("liefert einen Plan ohne Mehrfachbesetzungen an D oder HG", async () => {
    resetData();
    const year = 2026;
    const month = 5; // Juni 2026
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];

    state.year = year;
    state.month = month;
    setPlanMode(true);
    setPlanData(buildFixturePlanData(year, month, employees));

    const result = await computeAutoPlan(undefined, "standard");
    assert.ok(result, "computeAutoPlan liefert bei aktivem Planungsmodus ein Ergebnis");

    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      const dHolders = employees.filter((e) => result.assignments[e]?.[d]?.duty === "D");
      const hgHolders = employees.filter((e) => result.assignments[e]?.[d]?.duty === "HG");
      assert.ok(dHolders.length <= 1, `Tag ${d}: höchstens ein D-Träger erwartet, war ${dHolders.length}`);
      assert.ok(hgHolders.length <= 1, `Tag ${d}: höchstens ein HG-Träger erwartet, war ${hgHolders.length}`);
    }

    setPlanMode(false);
    setPlanData(null);
  });

  test("ist deterministisch: identischer Input liefert identisches Ergebnis", async () => {
    resetData();
    const year = 2026;
    const month = 8; // September 2026
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];

    state.year = year;
    state.month = month;

    setPlanMode(true);
    setPlanData(buildFixturePlanData(year, month, employees));
    const first = await computeAutoPlan(undefined, "standard");

    setPlanData(buildFixturePlanData(year, month, employees));
    const second = await computeAutoPlan(undefined, "standard");

    assert.deepEqual(first.assignments, second.assignments);

    setPlanMode(false);
    setPlanData(null);
  });
});
