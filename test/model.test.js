import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA } from "../js/state.js";
import { computeDutyFairness, getEmployeeFairness } from "../js/model.js";

// DATA ist ein an das Modul gebundenes veränderliches Objekt (siehe js/state.js);
// zwischen den Tests zurücksetzen, damit sie einander nicht beeinflussen.
function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

function buildMonth(assignmentsByEmp) {
  const employees = Object.keys(assignmentsByEmp);
  const assignments = {};
  for (const [emp, days] of Object.entries(assignmentsByEmp)) {
    assignments[emp] = {};
    for (const [day, cell] of Object.entries(days)) {
      assignments[emp][day] = cell;
    }
  }
  return { employees, assignments, rbn: {}, comments: {} };
}

describe("computeDutyFairness", () => {
  beforeEach(resetData);

  test("verteilt BD/HG-Zählungen korrekt und berechnet faire Anteile FTE-gewichtet", () => {
    // Januar 2026 (m=0): 3 Samstage/Sonntage üblich, hier vereinfachtes Fixture
    // mit expliziten Diensttagen, um die Zählung deterministisch zu prüfen.
    DATA["2026-0"] = buildMonth({
      "Dr. Martin": {
        3: { duty: "D" },
        10: { duty: "D" },
        17: { duty: "HG" },
      },
      "Dr. Becker": {
        4: { duty: "D" },
        11: { duty: "HG" },
        18: { duty: "HG" },
      },
    });

    const report = computeDutyFairness(2026, { uptoMonth: 0 });
    const martin = report.rows.find((r) => r.emp === "Dr. Martin");
    const becker = report.rows.find((r) => r.emp === "Dr. Becker");

    assert.equal(martin.bd, 2);
    assert.equal(martin.hg, 1);
    assert.equal(martin.total, 3);
    assert.equal(becker.bd, 1);
    assert.equal(becker.hg, 2);
    assert.equal(becker.total, 3);

    assert.equal(report.team.totalBd, 3);
    assert.equal(report.team.totalHg, 3);
    assert.equal(report.team.totalDuties, 6);
    // Gleiches FTE (100 bei beiden, siehe EMP_META) -> fairer Anteil ist der
    // arithmetische Mittelwert.
    assert.equal(martin.fairTotal, 3);
    assert.equal(becker.fairTotal, 3);
  });

  test("Wochenend-/Feiertagsdienste werden separat zu weekendDuties/holidayDuties gezählt", () => {
    // 3. Januar 2026 ist ein Samstag, 1. Januar ein Feiertag (Neujahr).
    DATA["2026-0"] = buildMonth({
      "Dr. Martin": {
        1: { duty: "D" }, // Feiertag + kein Wochenende, aber "heavy" via Feiertag
        3: { duty: "HG" }, // Samstag
        6: { duty: "D" }, // normaler Werktag (Dienstag)
      },
    });

    const report = computeDutyFairness(2026, { uptoMonth: 0 });
    const row = report.rows.find((r) => r.emp === "Dr. Martin");

    // weekendDuties zählt "belastete" Tage (Wochenende ODER Feiertag, siehe
    // die `heavy`-Flag-Logik in collectDutyRaw) -- der Neujahrs-BD (Feiertag,
    // kein Wochenende) UND der Samstags-HG zählen daher beide mit; holidayDuties
    // erfasst separat nur die reinen Feiertage.
    assert.equal(row.total, 3);
    assert.equal(row.weekendDuties, 2, "Feiertags-BD und Samstags-HG zählen beide als 'heavy'");
    assert.equal(row.holidayDuties, 1, "nur der Neujahrs-BD ist ein echter Feiertag");
  });

  test("dienstbefreite Personen (SPECIAL_RULES.dutyExempt) fehlen im Fairness-Report", () => {
    DATA["2026-0"] = buildMonth({
      "Prof. Schäfer": { 3: { duty: "D" } }, // dutyExempt laut SPECIAL_RULES
      "Dr. Martin": { 4: { duty: "D" } },
    });

    const report = computeDutyFairness(2026, { uptoMonth: 0 });
    assert.ok(!report.rows.some((r) => r.emp === "Prof. Schäfer"));
    assert.ok(report.rows.some((r) => r.emp === "Dr. Martin"));
  });

  test("Personen ohne Dienste in den betrachteten Monaten (activeMonths=0) werden ausgeschlossen", () => {
    DATA["2026-0"] = buildMonth({ "Dr. Martin": { 3: { duty: "D" } } });
    // Dr. Becker ist in keinem Monat des Jahres als employee gelistet.
    const report = computeDutyFairness(2026, { uptoMonth: 0 });
    assert.ok(!report.rows.some((r) => r.emp === "Dr. Becker"));
  });

  test("bdTarget skaliert mit reduziertem Soll, FTE und aktiven Monaten", () => {
    // Dr. Polednia hat laut SPECIAL_RULES ein reduziertes BD-Ziel von 3/Monat.
    DATA["2026-0"] = buildMonth({ "Dr. Polednia": { 5: { duty: "D" } } });
    DATA["2026-1"] = buildMonth({ "Dr. Polednia": { 5: { duty: "D" } } });

    const report = computeDutyFairness(2026, { uptoMonth: 1 });
    const row = report.rows.find((r) => r.emp === "Dr. Polednia");

    assert.equal(row.activeMonths, 2);
    assert.equal(row.bdTarget, 6, "3/Monat * 2 aktive Monate * 100% FTE");
  });

  test("rankTotal vergibt Rang 1 an die höchste Gesamtbelastung", () => {
    DATA["2026-0"] = buildMonth({
      "Dr. Martin": { 3: { duty: "D" }, 4: { duty: "D" }, 5: { duty: "D" } },
      "Dr. Becker": { 6: { duty: "D" } },
    });
    const report = computeDutyFairness(2026, { uptoMonth: 0 });
    const martin = report.rows.find((r) => r.emp === "Dr. Martin");
    const becker = report.rows.find((r) => r.emp === "Dr. Becker");
    assert.equal(martin.rankTotal, 1);
    assert.equal(becker.rankTotal, 2);
  });

  test("getEmployeeFairness liefert die Zeile der gesuchten Person plus Team-Kontext", () => {
    DATA["2026-0"] = buildMonth({
      "Dr. Martin": { 3: { duty: "D" } },
      "Dr. Becker": { 4: { duty: "D" } },
    });
    const { row, team } = getEmployeeFairness("Dr. Martin", 2026, { uptoMonth: 0 });
    assert.equal(row.emp, "Dr. Martin");
    assert.equal(team.count, 2);
  });

  test("getEmployeeFairness liefert null-Zeile für unbekannte Person", () => {
    DATA["2026-0"] = buildMonth({ "Dr. Martin": { 3: { duty: "D" } } });
    const { row } = getEmployeeFairness("Nicht Existent", 2026, { uptoMonth: 0 });
    assert.equal(row, null);
  });
});
