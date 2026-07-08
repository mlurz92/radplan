import test from "node:test";
import assert from "node:assert/strict";

import { computeAutoPlan } from "../js/autoplan.js";
import { DATA, state, setPlanMode, setPlanData } from "../js/state.js";

function resetBenchmarkMonth(year = 2026, month = 6) {
  for (const key of Object.keys(DATA)) delete DATA[key];
  state.year = year;
  state.month = month;
  const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz"];
  setPlanMode(true);
  setPlanData({
    employees,
    assignments: Object.fromEntries(employees.map((emp) => [emp, {}])),
    wishes: {},
    pins: {},
  });
}

test("Auto-Plan Benchmark/Oracle: exponiert Compliance-Gate und echte NFI-Komponenten", async () => {
  resetBenchmarkMonth();
  const result = await computeAutoPlan(null, 'standard');
  assert.ok(result.summary.compliance);
  assert.match(result.summary.compliance.gate, /^(pass|warn|fail)$/);
  assert.equal(typeof result.summary.quality.bdCoverageScore, 'number');
  assert.equal(typeof result.summary.quality.hgCoverageScore, 'number');
  assert.equal(typeof result.summary.quality.compoundMoves, 'number');
  assert.ok(Number(result.summary.quality.score) >= 0);
  assert.ok(Number(result.summary.quality.score) <= 100);
});

test("Small-Instance-Oracle: perfekte Dreierverteilung hat Spread 0 und dominiert jede Einzellast", async () => {
  resetBenchmarkMonth(2026, 0);
  const perfect = [1, 1, 1];
  const skewed = [3, 0, 0];
  const spread = (values) => {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
  };
  assert.equal(spread(perfect), 0);
  assert.ok(spread(perfect) < spread(skewed));
});
