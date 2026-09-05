// RadPlan — Auswertung von PDF-Monatsdienstplänen.
// ---------------------------------------------------------------------------
// Wandelt die von js/pdf-text.js gelieferten Textfragmente eines PDF-Monats-
// dienstplans in eine tagesgenaue Struktur um und ordnet die im PDF nur mit
// dem Nachnamen geführten Personen den RadPlan-Stammdaten zu.
//
// Erwartetes PDF-Schema (Spaltenüberschriften einer Tabellenzeile):
//   Tag | Wochentag | BD | HG | RBN | 2. RBN
// Die Spalten "Wochentag" und "2. RBN" sind optional; importiert werden
// ausschließlich BD (→ Dienstcode "D"), HG und die erste RBN-Spalte.
//
// Alle Funktionen hier sind seiteneffektfrei und damit unabhängig vom DOM und
// vom globalen DATA-Zustand testbar. Das Schreiben in den Plan übernimmt
// js/import-export.js.

import { MONTHS, daysInMonth, CODE_MAP } from "./constants.js";

/** @typedef {{ x: number, y: number, text: string, size: number }} PdfTextItem */
/** @typedef {{ index: number, width: number, height: number, items: PdfTextItem[] }} PdfTextPage */
/** @typedef {{ day: number, weekday: string, bd: string, hg: string, rbn: string, rbn2: string }} DutyPdfRow */

const EMPTY_MARKERS = new Set(["", "-", "--", "—", "–", "·", "/", "n/a", "k. a.", "k.a.", "leer", "offen"]);

// Spaltenerkennung: normalisierte Überschrift → logische Spalte.
const COLUMN_MATCHERS = [
  { key: "day", test: (s) => /^(tag|datum|tg)$/.test(s) },
  { key: "weekday", test: (s) => /^(wochentag|wt|tagname)$/.test(s) },
  { key: "bd", test: (s) => /^(bd|d|bereitschaft|bereitschaftsdienst|dienst)$/.test(s) },
  { key: "hg", test: (s) => /^(hg|hintergrund|hintergrunddienst)$/.test(s) },
  { key: "rbn", test: (s) => /^(rbn|1rbn|rbn1|rufbereitschaftneuroradiologie|rufbereitschaftnrad)$/.test(s) },
  { key: "rbn2", test: (s) => /^(2rbn|rbn2)$/.test(s) },
];

function normalizeHeader(text) {
  return String(text)
    .toLowerCase()
    .replace(/[\s.·:()–—-]/g, "")
    .trim();
}

function cleanCellText(text) {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  return EMPTY_MARKERS.has(t.toLowerCase()) ? "" : t;
}

/**
 * Baut aus einem Personennamen die Vergleichsschlüssel für den Abgleich
 * zwischen PDF ("Schüngel") und Stammdaten ("Dr. Schüngel (NRAD)").
 * Rückgabe ist ein Set, weil Umlaute je nach Quelle als "ü" oder "ue"
 * geschrieben sein können.
 * @param {string} name
 * @returns {Set<string>}
 */
export function nameMatchKeys(name) {
  const keys = new Set();
  let base = String(name || "")
    .replace(/\([^)]*\)/g, " ") // Klammerzusätze wie "(NRAD)"
    .replace(/\b(prof|dr|med|dipl|habil|fr|hr|herr|frau|univ)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!base) return keys;

  const compact = (s) => s.replace(/[^a-zäöüß]/g, "");
  const asciiFold = (s) => s.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
  const digraphFold = (s) => s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

  const variants = [base];
  // Zusätzlich nur der letzte Namensbestandteil ("Arnd-Oliver Schäfer" → "schäfer"),
  // damit Voll- und Kurznamen zusammenfinden.
  const parts = base.split(" ").filter(Boolean);
  if (parts.length > 1) variants.push(parts[parts.length - 1]);

  for (const v of variants) {
    const c = compact(v);
    if (!c) continue;
    keys.add(asciiFold(c));
    keys.add(digraphFold(c));
  }
  return keys;
}

/**
 * Ordnet einen im PDF gefundenen Namen genau einem Kandidaten zu.
 * @param {string} pdfName
 * @param {string[]} candidates
 * @returns {{ match: string|null, ambiguous: string[] }}
 */
export function matchName(pdfName, candidates) {
  const wanted = nameMatchKeys(pdfName);
  if (!wanted.size) return { match: null, ambiguous: [] };

  const hits = [];
  for (const cand of candidates) {
    const keys = nameMatchKeys(cand);
    for (const k of keys) {
      if (wanted.has(k)) {
        hits.push(cand);
        break;
      }
    }
  }
  if (hits.length === 1) return { match: hits[0], ambiguous: [] };
  if (hits.length > 1) return { match: null, ambiguous: hits };
  return { match: null, ambiguous: [] };
}

/**
 * Ermittelt Monat und Jahr aus den Textfragmenten bzw. hilfsweise aus dem
 * Dateinamen.
 * @param {PdfTextPage[]} pages
 * @param {string} [fileName]
 * @returns {{ year: number, month: number }|null}
 */
export function detectPeriod(pages, fileName) {
  const monthPattern = MONTHS.map((m) => m).join("|");
  const reLong = new RegExp(`\\b(${monthPattern})\\s+(\\d{4})\\b`, "i");
  const reNumeric = /\b(0?[1-9]|1[0-2])\s*[/.]\s*(\d{4})\b/;
  const reIso = /\b(\d{4})-(0?[1-9]|1[0-2])\b/;

  for (const page of pages) {
    for (const item of page.items) {
      const t = item.text;
      const m1 = reLong.exec(t);
      if (m1) {
        const idx = MONTHS.findIndex((m) => m.toLowerCase() === m1[1].toLowerCase());
        if (idx >= 0) return { year: parseInt(m1[2], 10), month: idx };
      }
      const m2 = reNumeric.exec(t);
      if (m2) return { year: parseInt(m2[2], 10), month: parseInt(m2[1], 10) - 1 };
      const m3 = reIso.exec(t);
      if (m3) return { year: parseInt(m3[1], 10), month: parseInt(m3[2], 10) - 1 };
    }
  }

  if (fileName) {
    const m = /(20\d{2})[-_.]?(0[1-9]|1[0-2])(?!\d)/.exec(String(fileName));
    if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1 };
  }
  return null;
}

// Sucht auf einer Seite alle Kandidaten für die Kopfzeile der Dienstplantabelle.
// Es kann mehrere geben: viele Pläne führen unterhalb der Tabelle einen
// Statistikblock, dessen Spalten ebenfalls "BD" und "HG" heißen. Kandidaten
// werden daher nach Anzahl erkannter Spalten und Höhe auf der Seite sortiert;
// der Aufrufer nimmt den ersten, unter dem tatsächlich Tageszeilen stehen.
function findHeaderCandidates(page) {
  /** @type {Map<number, {y: number, cols: Map<string, number>}>} */
  const byRow = new Map();

  for (const item of page.items) {
    const norm = normalizeHeader(item.text);
    const matcher = COLUMN_MATCHERS.find((c) => c.test(norm));
    if (!matcher) continue;
    // Zeilen mit gleicher Grundlinie (± 2 pt) zusammenfassen.
    let rowKey = null;
    for (const key of byRow.keys()) {
      if (Math.abs(key - item.y) <= 2) {
        rowKey = key;
        break;
      }
    }
    if (rowKey === null) {
      rowKey = item.y;
      byRow.set(rowKey, { y: item.y, cols: new Map() });
    }
    const row = byRow.get(rowKey);
    if (!row.cols.has(matcher.key)) row.cols.set(matcher.key, item.x);
  }

  // Nur Kopfzeilen akzeptieren, die die fachlich nötigen Spalten führen. Die
  // Mindestbreite von drei erkannten Spalten schließt den Statistikblock
  // ("Mitarbeitende | BD | HG") zuverlässig aus.
  return [...byRow.values()]
    .filter((row) => row.cols.has("bd") && row.cols.has("hg") && row.cols.size >= 3)
    .sort((a, b) => b.cols.size - a.cols.size || b.y - a.y);
}

// Ordnet eine x-Position der Spalte zu, deren Kopf zuletzt links davon beginnt.
function columnAt(sortedCols, x) {
  let found = sortedCols[0];
  for (const col of sortedCols) {
    if (x + 2 >= col.x) found = col;
    else break;
  }
  return found ? found.key : null;
}

function medianOf(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Liest die Tabellenzeilen eines PDF-Monatsdienstplans aus.
 * @param {PdfTextPage[]} pages
 * @param {{ fileName?: string }} [options]
 * @returns {{ year: number, month: number, rows: DutyPdfRow[], warnings: string[] }}
 */
export function parseDutySchedulePages(pages, options = {}) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new Error("Das PDF enthält keine lesbaren Seiten.");
  }
  const hasText = pages.some((p) => p.items && p.items.length);
  if (!hasText) {
    throw new Error("Das PDF enthält keine Textebene (vermutlich ein Scan) und kann nicht ausgewertet werden.");
  }

  const period = detectPeriod(pages, options.fileName);
  if (!period) {
    throw new Error('Monat und Jahr konnten im PDF nicht gefunden werden (erwartet z. B. "Oktober 2026").');
  }
  const dim = daysInMonth(period.year, period.month);

  /** @type {string[]} */
  const warnings = [];
  /** @type {Map<number, DutyPdfRow>} */
  const rows = new Map();
  let sawTable = false;

  for (const page of pages) {
    const candidates = findHeaderCandidates(page);
    if (candidates.length) sawTable = true;

    for (const header of candidates) {
      const sortedCols = [...header.cols.entries()].map(([key, x]) => ({ key, x })).sort((a, b) => a.x - b.x);

      // Nur Fragmente unterhalb der Kopfzeile gehören zur Tabelle.
      const body = page.items.filter((it) => it.y < header.y - 1);

      // Ankerzeilen = Tagesnummern in der linkesten Spalte.
      const dayColKey = header.cols.has("day") ? "day" : sortedCols[0].key;
      const anchors = [];
      for (const it of body) {
        if (columnAt(sortedCols, it.x) !== dayColKey) continue;
        const m = /^(\d{1,2})\.?$/.exec(it.text.trim());
        if (!m) continue;
        const day = parseInt(m[1], 10);
        if (day < 1 || day > dim) continue;
        anchors.push({ y: it.y, day });
      }
      if (!anchors.length) continue;

      anchors.sort((a, b) => b.y - a.y); // von oben nach unten

      // Tagesnummern müssen streng aufsteigen. Alles andere (z. B. Zahlen im
      // Statistikblock) wird verworfen, statt Zeilen zu verfälschen.
      const kept = [];
      let last = 0;
      for (const a of anchors) {
        const prevMax = rows.size ? Math.max(...rows.keys()) : 0;
        const floor = Math.max(last, kept.length ? last : prevMax);
        if (a.day <= floor) continue;
        if (rows.has(a.day)) continue;
        kept.push(a);
        last = a.day;
      }
      if (!kept.length) continue;

      const gaps = [];
      for (let i = 1; i < kept.length; i++) gaps.push(Math.abs(kept[i - 1].y - kept[i].y));
      const spacing = medianOf(gaps.filter((g) => g > 0.5));
      const tolerance = spacing > 0 ? spacing * 0.5 : 6;

      /** @type {Map<number, Map<string, {x: number, text: string}[]>>} */
      const cells = new Map();
      kept.forEach((a) => cells.set(a.day, new Map()));

      for (const it of body) {
        let bestAnchor = null;
        let bestDist = Infinity;
        for (const a of kept) {
          const d = Math.abs(a.y - it.y);
          if (d < bestDist) {
            bestDist = d;
            bestAnchor = a;
          }
        }
        if (!bestAnchor || bestDist > tolerance) continue;
        const colKey = columnAt(sortedCols, it.x);
        if (!colKey) continue;
        const rowCells = cells.get(bestAnchor.day);
        if (!rowCells.has(colKey)) rowCells.set(colKey, []);
        rowCells.get(colKey).push({ x: it.x, text: it.text });
      }

      for (const a of kept) {
        const rowCells = cells.get(a.day);
        const read = (key) => {
          const list = rowCells.get(key);
          if (!list || !list.length) return "";
          return cleanCellText(
            list
              .sort((p, q) => p.x - q.x)
              .map((p) => p.text)
              .join(" ")
          );
        };
        rows.set(a.day, {
          day: a.day,
          weekday: read("weekday"),
          bd: read("bd"),
          hg: read("hg"),
          rbn: read("rbn"),
          rbn2: read("rbn2"),
        });
      }

      // Auf dieser Seite wurden Tageszeilen gefunden — weitere Kopfzeilen-
      // Kandidaten (z. B. ein Statistikblock) dürfen sie nicht überschreiben.
      break;
    }
  }

  if (!sawTable) {
    throw new Error('Im PDF wurde keine Dienstplantabelle mit den Spalten "BD" und "HG" gefunden.');
  }

  const missing = [];
  for (let d = 1; d <= dim; d++) if (!rows.has(d)) missing.push(d);
  if (missing.length === dim) {
    throw new Error("Im PDF konnten keine Tageszeilen gelesen werden.");
  }
  if (missing.length) {
    warnings.push(`Für ${missing.length} Tag(e) fehlt eine Zeile im PDF: ${missing.join(", ")}.`);
  }

  const ordered = [...rows.values()].sort((a, b) => a.day - b.day);
  return { year: period.year, month: period.month, rows: ordered, warnings };
}

/**
 * Löst die PDF-Nachnamen gegen die RadPlan-Stammdaten auf.
 * @param {{ year: number, month: number, rows: DutyPdfRow[], warnings: string[] }} parsed
 * @param {{ rosterEmployees: string[], knownEmployees: string[], rbnOptions: string[], absences?: Record<string, Record<string, string>> }} lookup
 * @returns {{ year: number, month: number, entries: {day: number, bd: string|null, hg: string|null, rbn: string|null}[], newEmployees: string[], warnings: string[], errors: string[] }}
 */
export function resolveDutySchedule(parsed, lookup) {
  const roster = lookup.rosterEmployees || [];
  const known = lookup.knownEmployees || [];
  const rbnOptions = lookup.rbnOptions || [];
  const absences = lookup.absences || {};

  const warnings = [...(parsed.warnings || [])];
  /** @type {string[]} */
  const errors = [];
  const newEmployees = new Set();
  /** @type {Map<string, string|null>} */
  const empCache = new Map();
  /** @type {Map<string, string|null>} */
  const rbnCache = new Map();

  const resolveEmployee = (raw, day, label) => {
    if (!raw) return null;
    if (empCache.has(raw)) return empCache.get(raw);

    // Erst im Monatsteam suchen, dann im gesamten Personalstamm. So gewinnt
    // immer die tatsächlich im Monat geführte Person.
    let res = matchName(raw, roster);
    if (!res.match && !res.ambiguous.length) {
      res = matchName(raw, known);
      if (res.match) newEmployees.add(res.match);
    }
    if (res.ambiguous.length) {
      errors.push(`${label} am ${day}.: "${raw}" ist nicht eindeutig (${res.ambiguous.join(", ")}).`);
      empCache.set(raw, null);
      return null;
    }
    if (!res.match) {
      errors.push(`${label} am ${day}.: "${raw}" ist keiner Person in RadPlan zuzuordnen.`);
      empCache.set(raw, null);
      return null;
    }
    empCache.set(raw, res.match);
    return res.match;
  };

  const resolveRbn = (raw, day) => {
    if (!raw) return null;
    if (rbnCache.has(raw)) return rbnCache.get(raw);
    const res = matchName(raw, rbnOptions);
    if (res.ambiguous.length) {
      errors.push(`RBN am ${day}.: "${raw}" ist nicht eindeutig (${res.ambiguous.join(", ")}).`);
      rbnCache.set(raw, null);
      return null;
    }
    if (!res.match) {
      errors.push(`RBN am ${day}.: "${raw}" ist keine gültige RBN-Auswahl für diesen Monat.`);
      rbnCache.set(raw, null);
      return null;
    }
    rbnCache.set(raw, res.match);
    return res.match;
  };

  const entries = [];
  for (const row of parsed.rows) {
    const bd = resolveEmployee(row.bd, row.day, "BD");
    const hg = resolveEmployee(row.hg, row.day, "HG");
    const rbn = resolveRbn(row.rbn, row.day);

    if (bd && hg && bd === hg) {
      errors.push(`Am ${row.day}. sind BD und HG mit derselben Person besetzt (${bd}).`);
    }

    // Konflikt mit einer bereits erfassten Abwesenheit (Urlaub, Krank …) ist
    // kein Abbruchgrund — der PDF-Plan ist maßgeblich —, muss aber sichtbar
    // sein, damit die Abwesenheit nachgepflegt werden kann.
    for (const [duty, emp] of [
      ["BD", bd],
      ["HG", hg],
    ]) {
      const code = emp ? absences[emp]?.[row.day] : null;
      if (!code) continue;
      const label = CODE_MAP[code]?.label || code;
      warnings.push(`${emp} ist am ${row.day}. als "${label}" erfasst, hat laut PDF aber ${duty}.`);
    }
    if (!row.bd) warnings.push(`Am ${row.day}. ist im PDF kein BD eingetragen.`);
    if (!row.hg) warnings.push(`Am ${row.day}. ist im PDF kein HG eingetragen.`);

    entries.push({ day: row.day, bd, hg, rbn });
  }

  // Doppelte Vergabe innerhalb eines Tages ist bereits geprüft; zusätzlich auf
  // aufeinanderfolgende Bereitschaftsdienste hinweisen (harte Regel: nach "D"
  // folgt dienstfrei).
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const cur = entries[i];
    if (prev.bd && cur.bd && prev.bd === cur.bd && cur.day === prev.day + 1) {
      warnings.push(`${cur.bd} hat laut PDF am ${prev.day}. und ${cur.day}. BD (Ruhetag-Regel verletzt).`);
    }
  }

  return {
    year: parsed.year,
    month: parsed.month,
    entries,
    newEmployees: [...newEmployees],
    warnings,
    errors,
  };
}
