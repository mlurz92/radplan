import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, setPlanMode, setPlanData } from "../js/state.js";
import { computeAutoPlan } from "../js/autoplan.js";
import { daysInMonth, EMP_ROLE_OVERRIDES } from "../js/constants.js";

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

  test("Punkt 16: die Kandidaten-Rangfolge hängt von der Roster-Position ab, nicht vom Namensstring", async () => {
    // Vorher basierte der Tie-Breaker in scoreBDCandidate/scoreHGCandidate auf
    // emp.charCodeAt(...), sodass eine reine Umbenennung die Auswahl unter
    // sonst gleichwertigen Kandidaten verändern konnte. Zwei Teams mit
    // identischen Rollen/Zielen an identischen Roster-Positionen, aber
    // bewusst sehr unterschiedlichen Namensstrings, müssen daher exakt
    // dieselbe Dienstverteilung (nach Position, nicht nach Name) liefern.
    resetData();
    const year = 2026;
    const month = 9; // Oktober 2026

    const teamA = ["Dr. Martin", "Fr. Dalitz", "Hr. Torki"];
    const teamB = ["Aaa. Renamed1", "Zzz. Renamed2", "Mmm. Renamed3"];

    // Gleiche Rollen wie in teamA (FA, FA, AA) für die frei erfundenen Namen
    // aus teamB via Rollen-Override erzwingen, damit sich die Teams nur im
    // Namensstring, nicht aber in Rolle/Qualifikation unterscheiden.
    EMP_ROLE_OVERRIDES["Aaa. Renamed1"] = "FA";
    EMP_ROLE_OVERRIDES["Zzz. Renamed2"] = "FA";
    EMP_ROLE_OVERRIDES["Mmm. Renamed3"] = "AA";

    try {
      state.year = year;
      state.month = month;

      setPlanMode(true);
      setPlanData(buildFixturePlanData(year, month, teamA));
      const resultA = await computeAutoPlan(undefined, "standard");

      setPlanData(buildFixturePlanData(year, month, teamB));
      const resultB = await computeAutoPlan(undefined, "standard");

      const dim = daysInMonth(year, month);
      for (let d = 1; d <= dim; d++) {
        for (const dutyCode of ["D", "HG"]) {
          const idxA = teamA.findIndex((e) => resultA.assignments[e]?.[d]?.duty === dutyCode);
          const idxB = teamB.findIndex((e) => resultB.assignments[e]?.[d]?.duty === dutyCode);
          assert.equal(
            idxA,
            idxB,
            `Tag ${d} (${dutyCode}): Roster-Position des Dienstinhabers muss unabhängig vom Namen identisch sein`,
          );
        }
      }
    } finally {
      delete EMP_ROLE_OVERRIDES["Aaa. Renamed1"];
      delete EMP_ROLE_OVERRIDES["Zzz. Renamed2"];
      delete EMP_ROLE_OVERRIDES["Mmm. Renamed3"];
      setPlanMode(false);
      setPlanData(null);
    }
  });
});
