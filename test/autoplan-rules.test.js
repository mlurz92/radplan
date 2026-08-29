import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA, state, setPlanMode, setPlanData } from "../js/state.js";
import {
  computeAutoPlan,
  countWeekendDuties,
  RELAXED_WEEKEND_DUTY_LIMIT,
  violatesSaturdayUltimaRatio,
  violatesHGHardAntiClusteringRules,
  baseMonthlyBDTarget,
} from "../js/autoplan.js";
import { daysInMonth, isFacharzt, weekday, isoWeekNumber, getMaxBdTarget } from "../js/constants.js";

// Regressionstests für die harten Constraints des Auto-Plan-Solvers (Punkt 15).
// Ziel: jeder dieser Tests MUSS fehlschlagen, sobald die zugehörige Regel im
// Solver (js/autoplan.js) wieder gelockert wird -- insbesondere die beiden in
// Punkt 12/13 behobenen Lücken (Ultima-Ratio-Samstagssperre und HG-Anti-
// Clustering, die vorher nur in der Erstvergabe, nicht aber in den
// Swap-/Deep-Optimize-Pässen griffen).

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

// Realistischer, ausreichend großer Stamm (nahezu der komplette EMP_META-
// Bestand): mit einem zu kleinen Team (wenige Personen, viele Wochenenden)
// wären die Wochenend-Quoten pro Person mathematisch gar nicht einhaltbar
// und die Tests dadurch unbrauchbar/falsch-positiv.
const FULL_TEAM = [
  "Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Fr. Thaler", "Dr. Becker", "Dr. Martin",
  "Dr. Placzek", "Hr. Krzykowski", "Fr. Stöckel", "Hr. Zill", "Dr. Gazis",
  "Hr. El Houba", "Fr. Licenji", "Hr. Torki", "Hr. Sebastian", "Fr. Apitz",
  "Dr. Fröhlich", "Hr. Faragallah", "Dr. Meisel", "Dr. Melzer", "Fr. Koumasi",
];

function buildFixturePlanData(year, month, employees, overrides = {}) {
  const dim = daysInMonth(year, month);
  const assignments = {};
  employees.forEach((emp) => { assignments[emp] = { ...(overrides[emp] || {}) }; });
  return { employees: [...employees], assignments, wishes: {}, pins: {}, dim };
}

async function runFullPlan(year, month, employees = FULL_TEAM, overrides = {}) {
  resetData();
  state.year = year;
  state.month = month;
  setPlanMode(true);
  setPlanData(buildFixturePlanData(year, month, employees, overrides));
  const result = await computeAutoPlan(undefined, "standard");
  setPlanMode(false);
  setPlanData(null);
  return result;
}

describe("Harte Constraints: vollständiger Solver-Lauf", () => {
  test("D-D-Verbot: niemand hat an zwei aufeinanderfolgenden Tagen einen BD", async () => {
    const year = 2026;
    const month = 6; // Juli 2026
    const result = await runFullPlan(year, month);
    const dim = daysInMonth(year, month);

    let violations = 0;
    for (const emp of FULL_TEAM) {
      for (let d = 1; d < dim; d++) {
        if (result.assignments[emp]?.[d]?.duty === "D" && result.assignments[emp]?.[d + 1]?.duty === "D") {
          violations++;
        }
      }
    }
    assert.equal(violations, 0, "D-D-Kombination darf unter keinen Umständen entstehen");
  });

  test("Samstags-Qualifikationssperre: Samstags-D wird ausschließlich an Fachärzte vergeben", async () => {
    const year = 2026;
    const month = 6;
    const result = await runFullPlan(year, month);
    const dim = daysInMonth(year, month);

    let violations = 0;
    for (let d = 1; d <= dim; d++) {
      if (weekday(year, month, d) !== 6) continue;
      const holder = FULL_TEAM.find((e) => result.assignments[e]?.[d]?.duty === "D");
      if (holder && !isFacharzt(holder)) violations++;
    }
    assert.equal(violations, 0, "kein Assistenzarzt darf einen Samstags-BD erhalten");
  });

  test("Wochenend-Folge-Sperre: niemand hat Dienst in zwei ISO-aufeinanderfolgenden Wochenend-Wochen", async () => {
    const year = 2026;
    const month = 6;
    const result = await runFullPlan(year, month);
    const dim = daysInMonth(year, month);

    let violations = 0;
    for (const emp of FULL_TEAM) {
      const kws = new Set();
      for (let d = 1; d <= dim; d++) {
        const wd = weekday(year, month, d);
        if ((wd === 5 || wd === 6 || wd === 0) && result.assignments[emp]?.[d]?.duty) {
          kws.add(isoWeekNumber(year, month, d));
        }
      }
      const ordered = [...kws].sort((a, b) => a - b);
      for (let i = 1; i < ordered.length; i++) {
        if (Math.abs(ordered[i] - ordered[i - 1]) === 1) violations++;
      }
    }
    assert.equal(violations, 0, "aufeinanderfolgende Wochenenden mit Dienst sind hart verboten");
  });

  test("HG-HG-Direktfolge: nur bei ausdrücklich gekoppelten Diensten erlaubt", async () => {
    const year = 2026;
    const month = 6;
    const result = await runFullPlan(year, month);
    const dim = daysInMonth(year, month);

    let unbundledViolations = 0;
    for (const emp of FULL_TEAM) {
      for (let d = 1; d < dim; d++) {
        if (result.assignments[emp]?.[d]?.duty === "HG" && result.assignments[emp]?.[d + 1]?.duty === "HG") {
          const r1 = result.report.find((r) => r.day === d && r.emp === emp && r.duty === "HG");
          const r2 = result.report.find((r) => r.day === d + 1 && r.emp === emp && r.duty === "HG");
          const bundled = (r1?.tags || []).includes("Gekoppelt") || (r2?.tags || []).includes("Gekoppelt");
          if (!bundled) unbundledViolations++;
        }
      }
    }
    assert.equal(unbundledViolations, 0, "HG-HG direkt hintereinander ist ohne Kopplungsregel verboten (Punkt 13)");
  });

  test("Wochenend-Äquivalent-Hartdeckel: niemand überschreitet RELAXED_WEEKEND_DUTY_LIMIT", async () => {
    const year = 2026;
    const month = 6;
    const result = await runFullPlan(year, month);

    let violations = 0;
    for (const emp of FULL_TEAM) {
      const we = countWeekendDuties(year, month, emp, result.assignments);
      if (we > RELAXED_WEEKEND_DUTY_LIMIT) violations++;
    }
    assert.equal(violations, 0, `kein Team-Mitglied darf ${RELAXED_WEEKEND_DUTY_LIMIT} WE-Äquivalente überschreiten (Punkt 13)`);
  });

  test("Becker-Ultima-Ratio: bei ausreichend verfügbaren Fachärzten erhält Dr. Becker keinen Samstags-BD", async () => {
    // Mit 10 weiteren Fachärzten im Team und keinerlei Abwesenheiten ist ein
    // Samstags-BD für Dr. Becker niemals die einzige Lösung -> Ultima Ratio
    // darf hier in keinem der ~4-5 Samstage des Monats greifen (Punkt 12).
    const year = 2026;
    const month = 6;
    const result = await runFullPlan(year, month);
    const dim = daysInMonth(year, month);

    let beckerSaturdays = 0;
    for (let d = 1; d <= dim; d++) {
      if (weekday(year, month, d) === 6 && result.assignments["Dr. Becker"]?.[d]?.duty === "D") {
        beckerSaturdays++;
      }
    }
    assert.equal(beckerSaturdays, 0, "Dr. Becker sollte bei genug verfügbaren FÄ keinen Samstags-BD bekommen");
  });
});

describe("D-F-D-F-Muster: Erkennung und Meldung im finalen Plan (Punkt 17)", () => {
  test("ein durch fixierte Dienste erzwungenes D-F-D-F-Muster wird als Warnung gemeldet", async () => {
    const year = 2026;
    const month = 6;
    const employees = ["Dr. Martin", "Dr. Becker", "Fr. Dalitz", "Hr. Torki"];
    const overrides = {
      "Dr. Martin": { 1: { duty: "D" }, 3: { duty: "D" } },
    };
    const result = await runFullPlan(year, month, employees, overrides);

    assert.ok(
      result.summary.warnings.some((w) => w.includes("Dr. Martin") && w.includes("D-F-D-F")),
      "eine sichtbare Warnung für das erzwungene D-F-D-F-Muster wird erwartet",
    );
    assert.ok(
      result.ruleTelemetry.events.some((e) => e.label === "D-F-D-F-Muster erkannt" && e.detail.includes("Dr. Martin")),
      "das Muster muss auch über den ruleTelemetry-Mechanismus (recordRule) protokolliert werden",
    );
  });
});

describe("violatesSaturdayUltimaRatio (Punkt 12, exportierte Kernregel)", () => {
  test("blockiert Dr. Becker samstags, außer bei echter Coverage-Eskalation", () => {
    assert.equal(violatesSaturdayUltimaRatio("Dr. Becker", 6, false), true);
    assert.equal(violatesSaturdayUltimaRatio("Dr. Becker", 6, true), false, "echte Eskalation darf die Sperre lockern");
  });

  test("betrifft nur den Samstag (wd=6) und nur Ultima-Ratio-Personen", () => {
    assert.equal(violatesSaturdayUltimaRatio("Dr. Becker", 0, false), false);
    assert.equal(violatesSaturdayUltimaRatio("Dr. Martin", 6, false), false);
  });
});

describe("violatesHGHardAntiClusteringRules (Punkt 13, exportierte Kernregel)", () => {
  test("blockiert direkte HG-HG-Adjazenz unabhängig vom relaxed-Modus, außer bei Coverage-Eskalation", () => {
    assert.equal(violatesHGHardAntiClusteringRules(true, 0, false), true);
    assert.equal(violatesHGHardAntiClusteringRules(true, 0, true), false);
  });

  test("blockiert das Überschreiten des Wochenend-Äquivalent-Hartdeckels", () => {
    assert.equal(violatesHGHardAntiClusteringRules(false, RELAXED_WEEKEND_DUTY_LIMIT + 0.5, false), true);
    assert.equal(violatesHGHardAntiClusteringRules(false, RELAXED_WEEKEND_DUTY_LIMIT, false), false);
  });

  test("keine Verletzung, wenn weder Adjazenz noch Deckel-Überschreitung vorliegt", () => {
    assert.equal(violatesHGHardAntiClusteringRules(false, 0.5, false), false);
  });
});

describe("Hr. Safari (Eintritt 01.11.2026) im vollständigen Solver-Lauf", () => {
  // Nach dem Eintritt gelten für Hr. Safari ausnahmslos die regulären
  // AA-Regeln, zusätzlich die Einarbeitungs-Staffelung der BD-Ziele:
  // 1. Monat 0 Dienste, 2. Monat 3, ab dem 3. Monat das Standardziel 4.
  const TEAM = FULL_TEAM.filter((e) => e !== "Fr. Thaler" && e !== "Hr. Torki").concat("Hr. Safari");

  // Prüft die AA-Invarianten an Hr. Safaris tatsächlichem Planergebnis und
  // liefert die Zahl seiner Bereitschaftsdienste im Monat zurück.
  function assertAaInvariantsAndCountBd(result, year, month) {
    const dim = daysInMonth(year, month);
    const days = result.assignments["Hr. Safari"] || {};
    let bdCount = 0;
    for (let d = 1; d <= dim; d++) {
      const duty = days[d]?.duty;
      if (!duty) continue;
      assert.notEqual(duty, "HG", `HG an Tag ${d}: HG ist Fachärzten vorbehalten`);
      if (duty === "D") {
        bdCount++;
        assert.notEqual(weekday(year, month, d), 6, `Samstags-BD an Tag ${d} ist Fachärzten vorbehalten`);
        assert.notEqual(days[d + 1]?.duty, "D", `D-D-Folge an Tag ${d}`);
      }
    }
    return bdCount;
  }

  test("1. Monat (November 2026): Einarbeitung ohne jeden Bereitschaftsdienst", async () => {
    const result = await runFullPlan(2026, 10, TEAM);
    const bdCount = assertAaInvariantsAndCountBd(result, 2026, 10);
    assert.equal(bdCount, 0, "im Eintrittsmonat darf kein BD vergeben werden (harte Obergrenze 0)");
  });

  test("2. Monat (Dezember 2026): höchstens 3 Bereitschaftsdienste", async () => {
    const result = await runFullPlan(2026, 11, TEAM);
    const bdCount = assertAaInvariantsAndCountBd(result, 2026, 11);
    assert.ok(bdCount > 0, "ab dem 2. Monat muss Hr. Safari tatsächlich eingeplant werden");
    assert.ok(bdCount <= 3, `im 2. Monat sind maximal 3 BD zulässig (waren ${bdCount})`);
  });

  test("3. Monat (Januar 2027): reguläres AA-Standardziel ohne Sonderobergrenze", async () => {
    // Das Standardziel 4 ist bei diesem bewusst großen Fixture-Team (rund 21
    // Personen auf 31 Tage) nicht ausschöpfbar; hier wird deshalb geprüft,
    // dass die Staffelung ausgelaufen ist -- also weder eine Obergrenze noch
    // ein reduziertes Ziel greift -- und Hr. Safari reguläre BD erhält.
    assert.equal(getMaxBdTarget("Hr. Safari", 2027, 0), undefined);
    assert.equal(baseMonthlyBDTarget("Hr. Safari", 2027, 0), 4);
    const result = await runFullPlan(2027, 0, TEAM);
    const bdCount = assertAaInvariantsAndCountBd(result, 2027, 0);
    assert.ok(bdCount > 0, "ab dem 3. Monat wird Hr. Safari regulär eingeplant");
  });

  test("wird als AA und nicht als FA geführt", () => {
    assert.equal(isFacharzt("Hr. Safari"), false);
  });
});
