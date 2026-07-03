import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import {
  daysInMonth,
  weekday,
  isWeekend,
  isHoliday,
  isWorkday,
  isoWeekNumber,
  nextCalendarDay,
  prevCalendarDay,
  isEmployeeActiveInMonth,
  reconcileEmployeesForMonth,
  normalizeMonthDataShape,
  isFacharzt,
  isAssistenzarzt,
  getReducedBdTarget,
  isNoBdWeekday,
  getCtLeadershipPartner,
  getHgConflictBd,
  getSaxonyHolidays,
  cellColor,
  empInitials,
  monthKey,
  dateKey,
  EMPLOYEE_DEPARTURES,
} from "../js/constants.js";

describe("Kalenderlogik", () => {
  test("daysInMonth kennt Schaltjahre", () => {
    assert.equal(daysInMonth(2024, 1), 29); // Februar 2024 (Schaltjahr)
    assert.equal(daysInMonth(2025, 1), 28); // Februar 2025 (kein Schaltjahr)
    assert.equal(daysInMonth(2026, 3), 30); // April 2026
  });

  test("nextCalendarDay/prevCalendarDay sind zueinander invers", () => {
    const cases = [
      [2026, 0, 31], // Monatsende
      [2026, 11, 31], // Jahresende
      [2024, 1, 28], // Tag vor Schalttag
      [2026, 5, 15],
    ];
    for (const [y, m, d] of cases) {
      const next = nextCalendarDay(y, m, d);
      const back = prevCalendarDay(next.y, next.m, next.d);
      assert.deepEqual(back, { y, m, d }, `Rundreise für ${y}-${m}-${d} fehlgeschlagen`);
    }
  });

  test("nextCalendarDay wechselt korrekt über Jahresgrenze", () => {
    assert.deepEqual(nextCalendarDay(2026, 11, 31), { y: 2027, m: 0, d: 1 });
  });

  test("weekday/isWeekend erkennen Wochenenden korrekt", () => {
    // 4. Juli 2026 ist ein Samstag.
    assert.equal(weekday(2026, 6, 4), 6);
    assert.equal(isWeekend(2026, 6, 4), true);
    // 6. Juli 2026 ist ein Montag.
    assert.equal(weekday(2026, 6, 6), 1);
    assert.equal(isWeekend(2026, 6, 6), false);
  });

  test("isoWeekNumber liefert die erwartete Kalenderwoche", () => {
    // 1. Januar 2026 ist ein Donnerstag -> KW1 nach ISO-8601.
    assert.equal(isoWeekNumber(2026, 0, 1), 1);
  });

  test("getSaxonyHolidays enthält die gesetzlichen sächsischen Feiertage", () => {
    const hols = getSaxonyHolidays(2026);
    assert.equal(hols[dateKey(2026, 0, 1)], "Neujahr");
    assert.equal(hols[dateKey(2026, 4, 1)], "Tag der Arbeit");
    assert.equal(hols[dateKey(2026, 9, 31)], "Reformationstag");
    assert.equal(hols[dateKey(2026, 11, 25)], "1. Weihnachtstag");
    assert.equal(Object.keys(hols).length, 11);
  });

  test("isWorkday schließt Wochenenden und Feiertage aus", () => {
    const hols = getSaxonyHolidays(2026);
    assert.equal(isWorkday(2026, 0, 1, hols), false); // Neujahr
    assert.equal(isWorkday(2026, 6, 4, hols), false); // Samstag
    assert.equal(isWorkday(2026, 6, 6, hols), true); // normaler Montag
  });

  test("isHoliday erkennt Feiertage über hols-Map", () => {
    const hols = getSaxonyHolidays(2026);
    assert.equal(isHoliday(2026, 0, 1, hols), true);
    assert.equal(isHoliday(2026, 0, 2, hols), false);
  });
});

describe("Mitarbeiter-Stammdaten", () => {
  test("isEmployeeActiveInMonth berücksichtigt EMPLOYEE_DEPARTURES", () => {
    const departure = EMPLOYEE_DEPARTURES["Fr. Thaler"];
    assert.ok(departure, "Fixture-Annahme: Fr. Thaler hat einen Austrittseintrag");
    assert.equal(isEmployeeActiveInMonth("Fr. Thaler", departure.year, departure.month - 1), true);
    assert.equal(isEmployeeActiveInMonth("Fr. Thaler", departure.year, departure.month), false);
    assert.equal(isEmployeeActiveInMonth("Fr. Thaler", departure.year + 1, 0), false);
  });

  test("isEmployeeActiveInMonth ist true für Personen ohne Austrittseintrag", () => {
    assert.equal(isEmployeeActiveInMonth("Dr. Martin", 2030, 0), true);
  });

  test("reconcileEmployeesForMonth entfernt ausgeschiedene Personen aus employees/assignments/comments", () => {
    const departure = EMPLOYEE_DEPARTURES["Fr. Thaler"];
    const md = {
      employees: ["Fr. Thaler", "Dr. Martin"],
      assignments: { "Fr. Thaler": { 1: { assignment: "CT" } }, "Dr. Martin": { 1: { assignment: "MR" } } },
      comments: { "Fr. Thaler": { 1: "x" } },
    };
    const changed = reconcileEmployeesForMonth(md, departure.year, departure.month);
    assert.equal(changed, true);
    assert.deepEqual(md.employees, ["Dr. Martin"]);
    assert.equal(md.assignments["Fr. Thaler"], undefined);
    assert.equal(md.comments["Fr. Thaler"], undefined);
    assert.ok(md.assignments["Dr. Martin"]);
  });

  test("reconcileEmployeesForMonth meldet keine Änderung, wenn niemand betroffen ist", () => {
    const md = { employees: ["Dr. Martin"], assignments: {}, comments: {} };
    assert.equal(reconcileEmployeesForMonth(md, 2026, 6), false);
  });

  test("normalizeMonthDataShape ergänzt fehlende Container-Felder", () => {
    const md = {};
    normalizeMonthDataShape(md);
    assert.deepEqual(md.employees, []);
    assert.deepEqual(md.assignments, {});
    assert.deepEqual(md.rbn, {});
    assert.deepEqual(md.comments, {});
  });

  test("isFacharzt/isAssistenzarzt unterscheiden nach Position", () => {
    assert.equal(isFacharzt("Prof. Schäfer"), true); // CA
    assert.equal(isFacharzt("Hr. El Houba"), false); // AA
    assert.equal(isAssistenzarzt("Hr. El Houba"), true);
    assert.equal(isAssistenzarzt("Prof. Schäfer"), false);
  });

  test("unbekannte Personen fallen auf AA zurück (isAssistenzarzt=true)", () => {
    assert.equal(isFacharzt("Unbekannte Person XYZ"), false);
    assert.equal(isAssistenzarzt("Unbekannte Person XYZ"), true);
  });
});

describe("Sonderregeln (SPECIAL_RULES)", () => {
  test("getReducedBdTarget liefert reduzierte Ziele für konfigurierte Personen", () => {
    assert.equal(getReducedBdTarget("Dr. Polednia"), 3);
    assert.equal(getReducedBdTarget("Dr. Martin"), undefined);
  });

  test("isNoBdWeekday sperrt Dr. Polednia an So/Di/Do", () => {
    assert.equal(isNoBdWeekday("Dr. Polednia", 0), true);
    assert.equal(isNoBdWeekday("Dr. Polednia", 1), false);
  });

  test("getCtLeadershipPartner ist symmetrisch für das CT-Leitungspaar", () => {
    assert.equal(getCtLeadershipPartner("Dr. Becker"), "Dr. Martin");
    assert.equal(getCtLeadershipPartner("Dr. Martin"), "Dr. Becker");
    assert.equal(getCtLeadershipPartner("Dr. Lurz"), null);
  });

  test("getHgConflictBd greift nur an konfigurierten Wochentagen", () => {
    assert.deepEqual(getHgConflictBd("Fr. Dalitz", 0), ["Hr. Torki", "Hr. Sebastian"]);
    assert.equal(getHgConflictBd("Fr. Dalitz", 2), null);
    assert.equal(getHgConflictBd("Dr. Martin", 0), null);
  });
});

describe("Diverse Helfer", () => {
  test("cellColor liefert Workplace-Farben und Fallback", () => {
    assert.deepEqual(cellColor("CT"), { bg: "#FFEDD5", fg: "#C2410C" });
    assert.deepEqual(cellColor(""), { bg: "transparent", fg: "#374151" });
    assert.deepEqual(cellColor("XX"), { bg: "#F9FAFB", fg: "#374151" });
  });

  test("empInitials nutzt Großbuchstaben von Vor-/Nachname, sonst Fallback", () => {
    assert.equal(empInitials("Dr. Martin"), "DM");
    assert.equal(empInitials("madeup"), "MA");
  });

  test("monthKey/dateKey formatieren wie vom Datenmodell erwartet", () => {
    assert.equal(monthKey(2026, 5), "2026-5");
    assert.equal(dateKey(2026, 5, 3), "2026-06-03");
  });
});
