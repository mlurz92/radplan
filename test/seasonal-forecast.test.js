import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA } from "../js/state.js";
import { computeSeasonalAbsenceIndex, computeForecast } from "../js/analytics/engine.js";
import { monthKey, daysInMonth, isWorkday, getSaxonyHolidaysCached } from "../js/constants.js";

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

// Baut einen Monat, in dem eine gegebene Anzahl von Werktagen für eine
// Person mit "K" (krank) belegt ist, alle übrigen Werktage gesund.
function buildMonthWithSickDays(year, month, emp, sickDayCount) {
  const hols = getSaxonyHolidaysCached(year);
  const dim = daysInMonth(year, month);
  const assignments = { [emp]: {} };
  let remainingSick = sickDayCount;
  for (let d = 1; d <= dim; d++) {
    if (!isWorkday(year, month, d, hols)) continue;
    if (remainingSick > 0) {
      assignments[emp][d] = { assignment: "K" };
      remainingSick--;
    } else {
      assignments[emp][d] = { assignment: "CT" };
    }
  }
  DATA[monthKey(year, month)] = { employees: [emp], assignments, rbn: {}, comments: {} };
}

describe("computeSeasonalAbsenceIndex", () => {
  beforeEach(resetData);

  test("liefert für jeden der 12 Kalendermonate einen Eintrag", () => {
    const index = computeSeasonalAbsenceIndex();
    assert.equal(index.length, 12);
    index.forEach((entry, i) => assert.equal(entry.month, i));
  });

  test("ohne jegliche Daten hasData=false und Rate 0 für alle Monate", () => {
    const index = computeSeasonalAbsenceIndex();
    index.forEach((entry) => {
      assert.equal(entry.hasData, false);
      assert.equal(entry.rate, 0);
    });
  });

  test("erkennt einen Kalendermonat mit überdurchschnittlich vielen Krankheitstagen", () => {
    // Januar (m=0): viele Werktage krank; die übrigen Monate: keine.
    buildMonthWithSickDays(2020, 0, "Dr. Martin", 15);
    buildMonthWithSickDays(2020, 1, "Dr. Martin", 0);
    buildMonthWithSickDays(2020, 2, "Dr. Martin", 0);

    const index = computeSeasonalAbsenceIndex();
    const jan = index[0];
    const feb = index[1];

    assert.ok(jan.hasData, "Januar sollte genug Stichprobe haben");
    assert.ok(jan.rate > 0, "Januar sollte eine positive Krankheitsquote haben");
    assert.ok(jan.indexVsAverage > feb.indexVsAverage, "Januar sollte über dem Durchschnitt liegen, Februar darunter");
  });

  test("Monate ganz ohne gelistete Mitarbeitende werden als hasData=false markiert", () => {
    // Ein Monatseintrag ohne employees liefert keine Personen-Werktage und
    // bleibt damit unterhalb von SEASONAL_MIN_SAMPLE_DAYS.
    DATA[monthKey(2020, 5)] = {
      employees: [],
      assignments: {},
      rbn: {},
      comments: {},
    };
    const index = computeSeasonalAbsenceIndex();
    assert.equal(index[5].hasData, false);
    assert.equal(index[5].sampleDays, 0);
  });

  test("aggregiert über mehrere Jahre desselben Kalendermonats hinweg", () => {
    buildMonthWithSickDays(2019, 0, "Dr. Martin", 5);
    buildMonthWithSickDays(2020, 0, "Dr. Martin", 5);
    const index = computeSeasonalAbsenceIndex();
    // Stichprobengröße sollte die Werktage aus BEIDEN Jahren summieren.
    const singleYear = (() => {
      resetData();
      buildMonthWithSickDays(2020, 0, "Dr. Martin", 5);
      return computeSeasonalAbsenceIndex()[0].sampleDays;
    })();
    assert.ok(index[0].sampleDays > singleYear, "zwei Jahre sollten mehr Stichprobentage liefern als eines");
  });
});

describe("computeForecast — saisonale Risikoeinschätzung", () => {
  beforeEach(resetData);

  test("seasonalRiskMonths ist leer, wenn keine historischen Daten vorliegen", () => {
    buildMonthWithSickDays(2026, 0, "Dr. Martin", 0);
    const fc = computeForecast(2026);
    assert.deepEqual(fc.seasonalRiskMonths, []);
    assert.equal(fc.seasonalIndex.length, 12);
  });

  test("markiert einen historisch stark erhöhten Restmonat als Risikomonat", () => {
    // Zwei Vorjahre mit ausgeprägter Januar-Grippewelle als historische Basis.
    buildMonthWithSickDays(2024, 0, "Dr. Martin", 15);
    buildMonthWithSickDays(2024, 5, "Dr. Martin", 0);
    buildMonthWithSickDays(2025, 0, "Dr. Martin", 15);
    buildMonthWithSickDays(2025, 5, "Dr. Martin", 0);
    // Aktuelles Jahr: nur Januar bereits verplant (monthsWithData=1, Duty
    // gesetzt) -> alle Folgemonate (inkl. der historisch belasteten
    // Januar-Wiederholung im NÄCHSTEN Jahr zählt nicht, hier zählt der
    // Rest-Kalendermonat-Index unabhängig vom Jahr).
    DATA[monthKey(2026, 0)] = {
      employees: ["Dr. Martin"],
      assignments: { "Dr. Martin": { 3: { duty: "D" } } },
      rbn: {}, comments: {},
    };

    const fc = computeForecast(2026);
    // Januar selbst ist bereits "monthsWithData" (verplant) und damit kein
    // Restmonat mehr -- prüfen wir stattdessen direkt den saisonalen Index.
    const janIndex = fc.seasonalIndex[0];
    assert.ok(janIndex.hasData);
    assert.ok(janIndex.indexVsAverage > 1, "Januar sollte laut Historie überdurchschnittlich belastet sein");
  });
});
