import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA } from "../js/state.js";
import {
  computeForecast, computeCoverage, computeCompliance, computeAbsence,
  computeDutyFairnessForRange, getRange,
} from "../js/analytics/engine.js";
import { monthKey, daysInMonth, isWorkday, getSaxonyHolidaysCached } from "../js/constants.js";

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

// Baut einen Monat mit 2 D-Diensten (Tag 3 und Tag 10) je genannter Person.
function buildMonthWithDuties(year, month, employees, dutyDays = [3, 10]) {
  const assignments = {};
  employees.forEach((emp) => {
    assignments[emp] = {};
    dutyDays.forEach((d) => { assignments[emp][d] = { duty: "D" }; });
  });
  DATA[monthKey(year, month)] = { employees: [...employees], assignments, rbn: {}, comments: {} };
}

// ---------------------------------------------------------------------------
// Issue 29: Prognose re-annualisiert nicht mehr fälschlich für unterjährig
// eingestellte/Teilzeit-Mitarbeitende.
// ---------------------------------------------------------------------------
describe("computeForecast — Jahres-Soll bei unterjähriger Beschäftigung (Issue 29)", () => {
  beforeEach(resetData);

  test("eine erst im Oktober eingestellte Person bekommt ihr bereits korrekt anteiliges Soll NICHT erneut auf 12 Monate hochgerechnet", () => {
    const year = 2026;
    // Jan–Sep: nur die durchgängig beschäftigte Person.
    for (let m = 0; m <= 8; m++) buildMonthWithDuties(year, m, ["Dr. Martin"]);
    // Okt–Dez: zusätzlich die neu eingestellte Person (3 aktive Monate).
    for (let m = 9; m <= 11; m++) buildMonthWithDuties(year, m, ["Dr. Martin", "Dr. NeuHire"]);

    const fc = computeForecast(year);
    const neuHire = fc.rows.find((r) => r.emp === "Dr. NeuHire");
    assert.ok(neuHire, "Dr. NeuHire sollte in der Prognose auftauchen");

    // bdTarget (aus der Fairness-Berechnung) ist bereits auf 3 aktive Monate
    // anteilig: 4 (Standard-Monatsziel) * 3 Monate * 100% FTE = 12.
    // Die alte, fehlerhafte Logik hätte das auf 12/3*12 = 48 hochgerechnet.
    assert.equal(neuHire.yearTarget, 12,
      "yearTarget darf für die unterjährig eingestellte Person nicht auf ein volles Jahr re-annualisiert werden");
    assert.notEqual(neuHire.yearTarget, 48);
  });

  test("eine durchgängig beschäftigte Person mit voll beplantem Jahr bekommt weiterhin das normale Jahresziel", () => {
    const year = 2026;
    for (let m = 0; m <= 11; m++) buildMonthWithDuties(year, m, ["Dr. Martin"]);
    const fc = computeForecast(year);
    const martin = fc.rows.find((r) => r.emp === "Dr. Martin");
    // 4 (Standard) * 12 Monate * 100% FTE = 48.
    assert.equal(martin.yearTarget, 48);
  });
});

// ---------------------------------------------------------------------------
// Issue 30: gedämpfte Hochrechnung + Konfidenz-Feld statt ungebremster
// linearer 12x-Extrapolation.
// ---------------------------------------------------------------------------
describe("computeForecast — Dämpfung & Konfidenz (Issue 30)", () => {
  beforeEach(resetData);

  test("ein einzelner, außergewöhnlich dienstreicher Monat wird nicht ungedämpft auf 12 Monate hochgerechnet", () => {
    const year = 2026;
    // Ein einziger, sehr dienstreicher Monat (viele D-Dienste).
    const heavyDays = Array.from({ length: 15 }, (_, i) => i + 1);
    buildMonthWithDuties(year, 0, ["Dr. Martin"], heavyDays);

    const fc = computeForecast(year);
    assert.equal(fc.monthsWithData, 1);
    assert.equal(fc.confidence, "low");

    const martin = fc.rows.find((r) => r.emp === "Dr. Martin");
    // Naive Hochrechnung (12x) wäre 15*12 = 180 — bei nur 1 Monat Datenbasis
    // MUSS die gedämpfte Prognose davon spürbar nach unten abweichen.
    assert.equal(martin.projBdRaw, 180);
    assert.ok(martin.projBd < martin.projBdRaw,
      "gedämpfte Prognose sollte unter der naiven linearen Hochrechnung liegen");
    assert.ok(martin.projBd < 180 * 0.9);
  });

  test("bei ausreichend Datenbasis (>= 6 Monate) vertraut die Prognose der linearen Hochrechnung nahezu vollständig", () => {
    const year = 2026;
    for (let m = 0; m <= 5; m++) buildMonthWithDuties(year, m, ["Dr. Martin"], [3, 10]);
    const fc = computeForecast(year);
    assert.equal(fc.monthsWithData, 6);
    assert.equal(fc.confidence, "high");
    const martin = fc.rows.find((r) => r.emp === "Dr. Martin");
    // factor = 12/6 = 2, bd = 12 -> naive = 24, blendWeight = 1 -> keine Dämpfung.
    assert.equal(martin.projBd, martin.projBdRaw);
  });
});

// ---------------------------------------------------------------------------
// Issue 31: Fairness-Modul respektiert den Hub-Zeitraum (nicht mehr fest auf
// Gesamtjahr).
// ---------------------------------------------------------------------------
describe("computeDutyFairnessForRange (Issue 31)", () => {
  beforeEach(resetData);

  test("ein Quartal berücksichtigt nur die Dienste dieses Quartals, nicht des ganzen Jahres", () => {
    const year = 2026;
    // Q1 (Jan-Mär): 2 Dienste/Monat. Q2 (Apr-Jun): weitere 2 Dienste/Monat.
    for (let m = 0; m <= 2; m++) buildMonthWithDuties(year, m, ["Dr. Martin"], [3, 10]);
    for (let m = 3; m <= 5; m++) buildMonthWithDuties(year, m, ["Dr. Martin"], [3, 10]);

    const q1 = getRange("quarter", year, 1); // Q1 (enthält Monat 1 = Februar)
    const q2 = getRange("quarter", year, 4); // Q2

    const fairQ1 = computeDutyFairnessForRange(q1);
    const fairQ2 = computeDutyFairnessForRange(q2);

    const rowQ1 = fairQ1.rows.find((r) => r.emp === "Dr. Martin");
    const rowQ2 = fairQ2.rows.find((r) => r.emp === "Dr. Martin");

    assert.equal(rowQ1.bd, 6, "Q1 sollte nur die 3 Monate von Q1 zählen (2 Dienste x 3)");
    assert.equal(rowQ2.bd, 6, "Q2 sollte nur die 3 Monate von Q2 zählen");

    const fullYear = getRange("year", year, 0);
    const fairYear = computeDutyFairnessForRange(fullYear);
    const rowYear = fairYear.rows.find((r) => r.emp === "Dr. Martin");
    assert.equal(rowYear.bd, 12, "Gesamtjahr sollte weiterhin alle 6 beplanten Monate zusammenzählen");
  });

  test("ein Einzelmonat berücksichtigt ausschließlich diesen Monat", () => {
    const year = 2026;
    buildMonthWithDuties(year, 0, ["Dr. Martin"], [3, 10]);
    buildMonthWithDuties(year, 1, ["Dr. Martin"], [3, 10, 17]);

    const monthRange = getRange("month", year, 1);
    const fair = computeDutyFairnessForRange(monthRange);
    const row = fair.rows.find((r) => r.emp === "Dr. Martin");
    assert.equal(row.bd, 3);
    assert.equal(row.activeMonths, 1);
  });
});

// ---------------------------------------------------------------------------
// Issue 32: computeCoverage zählt Monate ganz ohne Diensteinträge ehrlich als
// Lücke statt sie stillschweigend aus dem Nenner auszuschließen.
// ---------------------------------------------------------------------------
describe("computeCoverage — Monate ohne Diensteinträge (Issue 32)", () => {
  beforeEach(resetData);

  test("ein Monat mit Personal, aber ganz ohne D-/HG-Einträge wird als 0%-Abdeckung gezählt statt ausgeschlossen", () => {
    const year = 2026, month = 4;
    DATA[monthKey(year, month)] = { employees: ["Dr. Martin"], assignments: {}, rbn: {}, comments: {} };

    const range = getRange("month", year, month);
    const cov = computeCoverage(range);

    const hols = getSaxonyHolidaysCached(year);
    const dim = daysInMonth(year, month);
    assert.equal(cov.totalDays, dim, "alle Kalendertage des Monats müssen gezählt werden, nicht null");
    assert.equal(cov.dCovered, 0);
    assert.equal(cov.hgCovered, 0);
    assert.equal(cov.openDays, cov.totalDays);
    assert.equal(cov.dPct, 0);

    // Konsistenz-Kontrolle gegen die von render-dept.js verwendete
    // Werktage-Zählung: beide müssen auf dieselbe Werktagszahl kommen.
    let expectedWorkdays = 0;
    for (let d = 1; d <= dim; d++) if (isWorkday(year, month, d, hols)) expectedWorkdays++;
    assert.equal(cov.workdays, expectedWorkdays);
  });
});

// ---------------------------------------------------------------------------
// Issue 34: Ruhezeit-Check am Jahreswechsel prüft nicht mehr stillschweigend
// "konform", wenn year+1 fehlt oder die Person dort nicht mehr geführt wird.
// ---------------------------------------------------------------------------
describe("computeCompliance — Ruhezeit-Check am Jahreswechsel (Issue 34)", () => {
  beforeEach(resetData);

  test("D am 31.12. ohne jegliche Daten für das Folgejahr wird als nicht-prüfbar markiert, nicht als konform", () => {
    const year = 2026;
    DATA[monthKey(year, 11)] = {
      employees: ["Dr. Martin"],
      assignments: { "Dr. Martin": { 31: { duty: "D" } } },
      rbn: {}, comments: {},
    };
    // Bewusst KEINE Daten für year+1 anlegen.

    const range = getRange("month", year, 11);
    const comp = computeCompliance(range);

    const unverifiable = comp.findings.filter((f) => f.type === "restUnverifiable" && f.emp === "Dr. Martin");
    assert.equal(unverifiable.length, 1, "sollte einen 'nicht prüfbar'-Befund statt stiller Konformität erzeugen");

    const restViolations = comp.findings.filter((f) => f.type === "rest");
    assert.equal(restViolations.length, 0, "kann keinen echten Ruhezeit-VERSTOSS behaupten, wenn nicht verifizierbar");
  });

  test("D am 31.12., Person im Folgejahr nicht mehr im Roster geführt (ausgeschieden) -> kein Befund", () => {
    const year = 2026;
    DATA[monthKey(year, 11)] = {
      employees: ["Dr. Martin"],
      assignments: { "Dr. Martin": { 31: { duty: "D" } } },
      rbn: {}, comments: {},
    };
    // year+1 hat Daten, aber Dr. Martin ist nicht mehr im Roster (ausgeschieden).
    DATA[monthKey(year + 1, 0)] = {
      employees: ["Dr. Becker"],
      assignments: {},
      rbn: {}, comments: {},
    };

    const range = getRange("month", year, 11);
    const comp = computeCompliance(range);
    const findingsForMartin = comp.findings.filter((f) => f.emp === "Dr. Martin");
    assert.equal(findingsForMartin.length, 0, "kein Folgedienst vorhanden -> weder Verstoß noch 'nicht prüfbar'");
  });

  test("D am 31.12., Person im Folgejahr weiterhin geführt und arbeitet am 1.1. -> echter Ruhezeit-Verstoß wird weiterhin erkannt", () => {
    const year = 2026;
    DATA[monthKey(year, 11)] = {
      employees: ["Dr. Martin"],
      assignments: { "Dr. Martin": { 31: { duty: "D" } } },
      rbn: {}, comments: {},
    };
    DATA[monthKey(year + 1, 0)] = {
      employees: ["Dr. Martin"],
      assignments: { "Dr. Martin": { 1: { assignment: "CT" } } },
      rbn: {}, comments: {},
    };

    const range = getRange("month", year, 11);
    const comp = computeCompliance(range);
    const restViolations = comp.findings.filter((f) => f.type === "rest" && f.emp === "Dr. Martin");
    assert.equal(restViolations.length, 1, "echter Ruhezeit-Verstoß über den Jahreswechsel muss weiterhin erkannt werden");
  });
});

// ---------------------------------------------------------------------------
// Issue 35: computeAbsence ist jetzt asynchron (Chunking), Aufrufer müssen
// awaiten. Grundfunktion muss bei await weiterhin dieselben Ergebnisse liefern.
// ---------------------------------------------------------------------------
describe("computeAbsence — asynchrones Chunking (Issue 35)", () => {
  beforeEach(resetData);

  test("liefert per await dieselben Kennzahlen wie zuvor synchron", async () => {
    const year = 2026, month = 2;
    const hols = getSaxonyHolidaysCached(year);
    const dim = daysInMonth(year, month);
    const assignments = { "Dr. Martin": {} };
    let sickAssigned = 0;
    for (let d = 1; d <= dim && sickAssigned < 3; d++) {
      if (!isWorkday(year, month, d, hols)) continue;
      assignments["Dr. Martin"][d] = { assignment: "K" };
      sickAssigned++;
    }
    DATA[monthKey(year, month)] = { employees: ["Dr. Martin"], assignments, rbn: {}, comments: {} };

    const range = getRange("month", year, month);
    const result = computeAbsence(range);
    assert.ok(typeof result.then === "function", "computeAbsence sollte jetzt ein Promise zurückgeben");

    const abs = await result;
    assert.equal(abs.totalAbsenceDays, 3);
    const row = abs.rows.find((r) => r.emp === "Dr. Martin");
    assert.equal(row.sick, 3);
    assert.ok(Array.isArray(abs.daySeries));
    assert.ok(abs.daySeries.length > 0);
  });
});
