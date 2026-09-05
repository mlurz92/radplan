import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./helpers/dom-stubs.js";
import { DATA } from "../js/state.js";
import { getMonthDataRaw, applyPdfDutySchedule } from "../js/model.js";
import { extractPdfTextItems } from "../js/pdf-text.js";
import { parseDutySchedulePages, resolveDutySchedule, nameMatchKeys, matchName, detectPeriod } from "../js/pdf-schedule.js";
import { EMP_META, isEmployeeActiveInMonth, getRbnOptionsForDate } from "../js/constants.js";
import { makeDutyPdf, OCTOBER_2026 } from "./helpers/make-duty-pdf.js";

function resetData() {
  for (const k of Object.keys(DATA)) delete DATA[k];
}

async function parseFixture(spec = OCTOBER_2026, options = {}, fileName = "Dienstplan_202610.pdf") {
  const bytes = await makeDutyPdf(spec, options);
  const { pages } = await extractPdfTextItems(bytes);
  return parseDutySchedulePages(pages, { fileName });
}

function knownFor(y, m) {
  return Object.keys(EMP_META).filter((n) => isEmployeeActiveInMonth(n, y, m));
}

// ── Textextraktion ──────────────────────────────────────────────────────────
describe("extractPdfTextItems", () => {
  test("liest Position, Größe und WinAnsi-Umlaute unkomprimierter Inhaltsströme", async () => {
    const bytes = await makeDutyPdf(OCTOBER_2026);
    const { pages } = await extractPdfTextItems(bytes);
    assert.equal(pages.length, 1);
    assert.equal(Math.round(pages[0].width), 595);

    const title = pages[0].items.find((i) => i.text === "BEREITSCHAFTSDIENSTPLAN");
    assert.ok(title, "Titel muss gefunden werden");
    assert.equal(title.size, 7);
    assert.ok(Math.abs(title.x - 59.528) < 0.01);

    assert.ok(
      pages[0].items.some((i) => i.text === "Schüngel"),
      "Umlaute müssen korrekt dekodiert werden"
    );
  });

  test("dekodiert FlateDecode-Inhaltsströme identisch zu unkomprimierten", async () => {
    const plain = await extractPdfTextItems(await makeDutyPdf(OCTOBER_2026));
    const packed = await extractPdfTextItems(await makeDutyPdf(OCTOBER_2026, { compress: true }));
    assert.deepEqual(
      packed.pages[0].items.map((i) => i.text),
      plain.pages[0].items.map((i) => i.text)
    );
  });

  test("weist Dateien ohne PDF-Signatur zurück", async () => {
    const notPdf = new TextEncoder().encode("Das ist kein PDF, sondern reiner Text.");
    await assert.rejects(() => extractPdfTextItems(notPdf), /kein gültiges PDF/);
  });
});

// ── Tabellenauswertung ──────────────────────────────────────────────────────
describe("parseDutySchedulePages", () => {
  test("liest alle 31 Tage des Oktobers inklusive mehrzeiliger Feiertagszellen", async () => {
    const parsed = await parseFixture();
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.month, 9);
    assert.equal(parsed.rows.length, 31);
    assert.deepEqual(parsed.warnings, []);

    assert.deepEqual(parsed.rows[0], {
      day: 1,
      weekday: "Donnerstag",
      bd: "Sebastian",
      hg: "Dalitz",
      rbn: "Dalitz",
      rbn2: "",
    });
    // Feiertagszeile: zwei Textzeilen in der Wochentagsspalte, Werte unverändert.
    assert.deepEqual(parsed.rows[2], {
      day: 3,
      weekday: "Samstag Tag der Deutschen Einheit",
      bd: "Lurz",
      hg: "Becker",
      rbn: "Maybaum",
      rbn2: "",
    });
    // Zweistellige Tage stehen zentriert weiter links — dürfen die Spalte nicht wechseln.
    assert.equal(parsed.rows[30].day, 31);
    assert.equal(parsed.rows[30].bd, "Dalitz");
    assert.equal(parsed.rows[30].hg, "El Houba");
  });

  test("übernimmt keine Zahlen aus dem Statistikblock unterhalb der Tabelle", async () => {
    const parsed = await parseFixture();
    const days = parsed.rows.map((r) => r.day);
    assert.deepEqual(
      days,
      Array.from({ length: 31 }, (_, i) => i + 1)
    );
    assert.ok(
      parsed.rows.every((r) => !/^\d+$/.test(r.bd)),
      "BD darf keine Statistikzahl enthalten"
    );
  });

  test("die gelesenen Dienste stimmen mit dem Statistikblock des PDFs überein", async () => {
    const parsed = await parseFixture();
    for (const [fullName, bdCount, hgCount] of OCTOBER_2026.stats) {
      if (fullName === "Offen") continue;
      const surname = fullName.replace(/^(Prof|Dr|Fr|Hr)\.\s*/, "");
      assert.equal(parsed.rows.filter((r) => r.bd === surname).length, bdCount, `BD-Anzahl ${fullName}`);
      assert.equal(parsed.rows.filter((r) => r.hg === surname).length, hgCount, `HG-Anzahl ${fullName}`);
    }
  });

  test("meldet fehlende Tageszeilen als Hinweis, statt still zu importieren", async () => {
    const spec = { ...OCTOBER_2026, rows: OCTOBER_2026.rows.filter((r) => r.day !== 7 && r.day !== 8) };
    const parsed = await parseFixture(spec);
    assert.equal(parsed.rows.length, 29);
    assert.equal(parsed.warnings.length, 1);
    assert.match(parsed.warnings[0], /7, 8/);
  });

  test("erkennt den Monat auch bei numerischer Schreibweise", async () => {
    const parsed = await parseFixture({ ...OCTOBER_2026, period: "Dienstplan 10/2026" });
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.month, 9);
  });

  test("fällt für den Monat auf den Dateinamen zurück", async () => {
    const parsed = await parseFixture({ ...OCTOBER_2026, period: null }, {}, "Dienstplan_202610.pdf");
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.month, 9);
  });

  test("bricht ab, wenn weder PDF noch Dateiname einen Monat nennen", async () => {
    const bytes = await makeDutyPdf({ ...OCTOBER_2026, period: null });
    const { pages } = await extractPdfTextItems(bytes);
    assert.throws(() => parseDutySchedulePages(pages, { fileName: "plan.pdf" }), /Monat und Jahr/);
  });

  test("bricht ab, wenn die Spalten BD/HG fehlen", async () => {
    const bytes = await makeDutyPdf({
      ...OCTOBER_2026,
      headers: { bd: "Frühdienst", hg: "Spätdienst" },
    });
    const { pages } = await extractPdfTextItems(bytes);
    assert.throws(() => parseDutySchedulePages(pages, {}), /keine Dienstplantabelle/);
  });

  test("behandelt Gedankenstriche als leere Zellen", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 4 ? { ...r, hg: "—", rbn: "-" } : r)),
    };
    const parsed = await parseFixture(spec);
    const row = parsed.rows.find((r) => r.day === 4);
    assert.equal(row.hg, "");
    assert.equal(row.rbn, "");
  });
});

// ── Namensabgleich ──────────────────────────────────────────────────────────
describe("nameMatchKeys / matchName", () => {
  test("ignoriert Titel und Klammerzusätze", () => {
    assert.equal(matchName("Schob", ["Prof. Schob (NRAD)", "Dr. Maybaum (NRAD)"]).match, "Prof. Schob (NRAD)");
    assert.equal(matchName("Dalitz", ["Fr. Dalitz (RAD)"]).match, "Fr. Dalitz (RAD)");
    assert.equal(matchName("Hellmann", ["Dr. Hellmann (RAD/NRAD)"]).match, "Dr. Hellmann (RAD/NRAD)");
  });

  test("findet mehrteilige Nachnamen", () => {
    assert.equal(matchName("El Houba", ["Hr. El Houba", "Dr. Martin"]).match, "Hr. El Houba");
  });

  test("gleicht Umlaut-Schreibweisen ab", () => {
    assert.ok(nameMatchKeys("Schüngel").has("schungel"));
    assert.ok(nameMatchKeys("Schüngel").has("schuengel"));
    assert.equal(matchName("Schuengel", ["Dr. Schüngel (NRAD)"]).match, "Dr. Schüngel (NRAD)");
    assert.equal(matchName("Schäfer", ["Prof. Schäfer"]).match, "Prof. Schäfer");
  });

  test("meldet Mehrdeutigkeit statt zu raten", () => {
    const res = matchName("Martin", ["Dr. Martin", "Fr. Martin"]);
    assert.equal(res.match, null);
    assert.equal(res.ambiguous.length, 2);
  });

  test("liefert keinen Treffer für unbekannte Namen", () => {
    assert.deepEqual(matchName("Mustermann", ["Dr. Lurz"]), { match: null, ambiguous: [] });
  });

  test("detectPeriod erkennt deutsche Monatsnamen", () => {
    const items = [{ x: 0, y: 0, text: "März 2027", size: 10 }];
    assert.deepEqual(detectPeriod([{ index: 0, width: 0, height: 0, items }]), { year: 2027, month: 2 });
  });
});

// ── Auflösung gegen die Stammdaten ──────────────────────────────────────────
describe("resolveDutySchedule", () => {
  test("ordnet alle Nachnamen des Oktober-PDFs korrekt zu", async () => {
    const parsed = await parseFixture();
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: [
        "Dr. Lurz",
        "Dr. Polednia",
        "Fr. Dalitz",
        "Dr. Becker",
        "Dr. Martin",
        "Hr. El Houba",
        "Fr. Licenji",
        "Hr. Sebastian",
      ],
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });

    assert.deepEqual(resolved.errors, []);
    assert.equal(resolved.entries.length, 31);
    assert.deepEqual(resolved.newEmployees, ["Dr. Hellmann"]);

    const d1 = resolved.entries[0];
    assert.equal(d1.bd, "Hr. Sebastian");
    assert.equal(d1.hg, "Fr. Dalitz");
    assert.equal(d1.rbn, "Fr. Dalitz (RAD)");

    const d5 = resolved.entries.find((e) => e.day === 5);
    assert.equal(d5.bd, "Dr. Hellmann");
    assert.equal(d5.rbn, "Dr. Schüngel (NRAD)");
  });

  test("bevorzugt Personen aus dem Monatsteam vor dem übrigen Personalstamm", async () => {
    const parsed = await parseFixture();
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: ["Dr. Martin"],
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.ok(!resolved.newEmployees.includes("Dr. Martin"));
    assert.equal(resolved.entries.find((e) => e.day === 11).bd, "Dr. Martin");
  });

  test("meldet unbekannte Personen als Fehler", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 2 ? { ...r, bd: "Mustermann" } : r)),
    };
    const parsed = await parseFixture(spec);
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: [],
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.equal(resolved.errors.length, 1);
    assert.match(resolved.errors[0], /BD am 2\..*Mustermann/);
  });

  test("meldet eine RBN-Besetzung, die im Monat nicht wählbar ist", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 2 ? { ...r, rbn: "Thaler" } : r)),
    };
    const parsed = await parseFixture(spec);
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: [],
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9), // Fr. Thaler ist ab März 2026 nicht mehr wählbar
    });
    assert.equal(resolved.errors.length, 1);
    assert.match(resolved.errors[0], /RBN am 2\./);
  });

  test("meldet identische BD-/HG-Besetzung am selben Tag als Fehler", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 6 ? { ...r, hg: "Dalitz" } : r)),
    };
    const parsed = await parseFixture(spec);
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: knownFor(2026, 9),
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.equal(resolved.errors.length, 1);
    assert.match(resolved.errors[0], /Am 6\..*BD und HG/);
  });

  test("warnt bei zwei Bereitschaftsdiensten an Folgetagen", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 2 ? { ...r, bd: "Sebastian" } : r)),
    };
    const parsed = await parseFixture(spec);
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: knownFor(2026, 9),
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.deepEqual(resolved.errors, []);
    assert.ok(resolved.warnings.some((w) => /Hr\. Sebastian.*1\..*2\./.test(w)));
  });

  test("warnt, wenn ein Dienst auf eine bereits erfasste Abwesenheit fällt", async () => {
    const parsed = await parseFixture();
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: knownFor(2026, 9),
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
      absences: { "Dr. Lurz": { 3: "U" }, "Fr. Dalitz": { 1: "K" } },
    });
    assert.deepEqual(resolved.errors, []);
    // Dr. Lurz hat am 3. BD, Fr. Dalitz am 1. HG.
    assert.ok(resolved.warnings.some((w) => /Dr\. Lurz ist am 3\..*Urlaub.*BD/.test(w)), resolved.warnings.join(" | "));
    assert.ok(resolved.warnings.some((w) => /Fr\. Dalitz ist am 1\..*Krank.*HG/.test(w)), resolved.warnings.join(" | "));
    // Ohne Abwesenheitsdaten darf es keinen solchen Hinweis geben.
    const clean = resolveDutySchedule(parsed, {
      rosterEmployees: knownFor(2026, 9),
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.ok(!clean.warnings.some((w) => /erfasst/.test(w)));
  });

  test("warnt bei leeren BD-/HG-Zellen, bricht aber nicht ab", async () => {
    const spec = {
      ...OCTOBER_2026,
      rows: OCTOBER_2026.rows.map((r) => (r.day === 4 ? { ...r, bd: undefined } : r)),
    };
    const parsed = await parseFixture(spec);
    const resolved = resolveDutySchedule(parsed, {
      rosterEmployees: knownFor(2026, 9),
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
    assert.deepEqual(resolved.errors, []);
    assert.ok(resolved.warnings.some((w) => /Am 4\..*kein BD/.test(w)));
    assert.equal(resolved.entries.find((e) => e.day === 4).bd, null);
  });
});

// ── Übernahme in den Plan ───────────────────────────────────────────────────
describe("applyPdfDutySchedule", () => {
  beforeEach(resetData);

  async function resolvedOctober() {
    const parsed = await parseFixture();
    return resolveDutySchedule(parsed, {
      rosterEmployees: DATA["2026-9"] ? DATA["2026-9"].employees : [],
      knownEmployees: knownFor(2026, 9),
      rbnOptions: getRbnOptionsForDate(2026, 9),
    });
  }

  test("setzt D, HG und RBN für den gesamten Monat", async () => {
    DATA["2026-9"] = {
      employees: ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Sebastian"],
      assignments: {},
      rbn: {},
      comments: {},
    };
    const stats = applyPdfDutySchedule(await resolvedOctober());
    const md = getMonthDataRaw(2026, 9);

    assert.equal(stats.setBd, 31);
    assert.equal(stats.setHg, 31);
    assert.equal(stats.setRbn, 31);
    assert.equal(md.assignments["Hr. Sebastian"][1].duty, "D");
    assert.equal(md.assignments["Fr. Dalitz"][1].duty, "HG");
    assert.equal(md.rbn[1], "Fr. Dalitz (RAD)");
    assert.equal(md.rbn[5], "Dr. Schüngel (NRAD)");
    // "2. RBN" wird bewusst nicht übernommen — je Tag genau ein RBN-Eintrag.
    assert.equal(Object.keys(md.rbn).length, 31);
  });

  test("ergänzt im Monat aktive Personen, die noch nicht im Team stehen", async () => {
    DATA["2026-9"] = { employees: ["Dr. Lurz"], assignments: {}, rbn: {}, comments: {} };
    const stats = applyPdfDutySchedule(await resolvedOctober());
    const md = getMonthDataRaw(2026, 9);
    assert.ok(md.employees.includes("Dr. Hellmann"));
    assert.ok(stats.addedEmployees.includes("Dr. Hellmann"));
    assert.equal(md.assignments["Dr. Hellmann"][5].duty, "D");
  });

  test("ersetzt alte Dienste, lässt Arbeitsplätze und Status unberührt", async () => {
    DATA["2026-9"] = {
      employees: ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Sebastian"],
      assignments: {
        "Dr. Lurz": {
          1: { assignment: "MR", duty: "D" }, // veralteter BD → muss verschwinden
          2: { assignment: "F" }, // dessen Ruhetag → muss verschwinden
          9: { assignment: "U" }, // Urlaub → bleibt
        },
        "Dr. Becker": { 4: { duty: "HG" } }, // veralteter HG → Zelle wird geleert
      },
      rbn: { 1: "Dr. Bailis (NRAD)", 2: "Dr. Bailis (NRAD)" },
      comments: {},
    };

    const stats = applyPdfDutySchedule(await resolvedOctober());
    const md = getMonthDataRaw(2026, 9);

    assert.equal(stats.clearedDuties, 2);
    assert.equal(stats.clearedRbn, 2);
    assert.deepEqual(md.assignments["Dr. Lurz"][1], { assignment: "MR" }, "nur der Dienst wird entfernt");
    assert.equal(md.assignments["Dr. Lurz"][2], undefined, "kaskadierter Ruhetag wird zurückgenommen");
    assert.deepEqual(md.assignments["Dr. Lurz"][9], { assignment: "U" }, "Urlaub bleibt erhalten");
    assert.equal(md.assignments["Dr. Becker"][4], undefined);
    // Neuer Stand laut PDF.
    assert.equal(md.assignments["Dr. Lurz"][3].duty, "D");
    assert.equal(md.rbn[1], "Fr. Dalitz (RAD)");
  });

  test("erzeugt nach jedem Bereitschaftsdienst den Pflicht-Ruhetag", async () => {
    DATA["2026-9"] = {
      employees: ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Sebastian"],
      assignments: {},
      rbn: {},
      comments: {},
    };
    DATA["2026-10"] = { employees: ["Fr. Dalitz"], assignments: {}, rbn: {}, comments: {} };

    applyPdfDutySchedule(await resolvedOctober());
    const md = getMonthDataRaw(2026, 9);

    // Hr. Sebastian hat am 1.10. BD → 2.10. dienstfrei.
    assert.equal(md.assignments["Hr. Sebastian"][2].assignment, "F");
    // Fr. Dalitz hat am 31.10. BD → Ruhetag im Folgemonat.
    assert.equal(DATA["2026-10"].assignments["Fr. Dalitz"][1].assignment, "F");
  });

  test("überschreibt eine bestehende Belegung nicht mit einem Ruhetag", async () => {
    DATA["2026-9"] = {
      employees: ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Sebastian"],
      assignments: { "Hr. Sebastian": { 2: { assignment: "U" } } },
      rbn: {},
      comments: {},
    };
    applyPdfDutySchedule(await resolvedOctober());
    assert.equal(getMonthDataRaw(2026, 9).assignments["Hr. Sebastian"][2].assignment, "U");
  });

  test("ist idempotent: zweimaliger Import ergibt denselben Stand", async () => {
    DATA["2026-9"] = {
      employees: ["Dr. Lurz", "Dr. Polednia", "Fr. Dalitz", "Dr. Becker", "Dr. Martin", "Hr. El Houba", "Fr. Licenji", "Hr. Sebastian"],
      assignments: {},
      rbn: {},
      comments: {},
    };
    applyPdfDutySchedule(await resolvedOctober());
    const first = JSON.stringify(getMonthDataRaw(2026, 9));
    applyPdfDutySchedule(await resolvedOctober());
    assert.equal(JSON.stringify(getMonthDataRaw(2026, 9)), first);
  });
});
