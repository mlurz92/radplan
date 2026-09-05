// Testhilfe: erzeugt ein minimales PDF im Layout der externen
// "BEREITSCHAFTSDIENSTPLAN"-Monatspläne (Tabelle mit den Spalten
// Tag | Wochentag | BD | HG | RBN | 2. RBN und einem Statistikblock darunter).
//
// Das Layout bildet die Eigenheiten der Originaldateien nach, die den Parser
// fordern: linksbündige Wertespalten auf exakt der Kopf-x-Position, zentrierte
// (und damit x-verschobene) Tagesnummern, mehrzeilige Wochentagszellen bei
// Feiertagen sowie ein Statistikblock mit Zahlen unterhalb der Tabelle.

const HEADER_X = {
  day: 63.496,
  weekday: 96.831,
  bd: 196.838,
  hg: 282.557,
  rbn: 368.277,
  rbn2: 453.997,
};

const HEADER_Y = 763.654;
const FIRST_ROW_Y = 748.091;
const ROW_H = 15.728;

// WinAnsi (CP-1252) kennt im Bereich 0x80-0x9F Zeichen, die nicht mit Latin-1
// übereinstimmen — u. a. Gedankenstriche und typografische Anführungszeichen.
const CP1252_EXTRA = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

// WinAnsi-Kodierung eines Strings für PDF-Literalstrings.
function pdfString(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch;
    else if (code < 256) out += ch;
    else if (CP1252_EXTRA.has(code)) out += String.fromCharCode(CP1252_EXTRA.get(code));
    else out += "?";
  }
  return `(${out})`;
}

function textOp(x, y, text, size = 8) {
  return `BT\n/FB ${size} Tf\n${x} ${y} Td ${pdfString(text)} Tj\nET\n`;
}

/**
 * @param {{ title?: string, period?: string, rows: {day: number, weekday: string, note?: string, bd?: string, hg?: string, rbn?: string, rbn2?: string}[], stats?: [string, number, number][], headers?: Record<string,string> }} spec
 * @returns {string} Inhaltsstrom
 */
function buildContent(spec) {
  const labels = Object.assign(
    { day: "Tag", weekday: "Wochentag", bd: "BD", hg: "HG", rbn: "RBN", rbn2: "2. RBN" },
    spec.headers || {}
  );

  let c = "";
  c += textOp(59.528, 806.173, spec.title ?? "BEREITSCHAFTSDIENSTPLAN", 7);
  if (spec.period !== null) c += textOp(59.528, 789.732, spec.period ?? "Oktober 2026", 13);

  for (const key of Object.keys(HEADER_X)) {
    if (!labels[key]) continue;
    c += textOp(HEADER_X[key], HEADER_Y, labels[key], 8);
  }

  spec.rows.forEach((row, i) => {
    const y = FIRST_ROW_Y - i * ROW_H;
    // Tagesnummern sind zentriert: einstellige Tage stehen weiter rechts.
    const dayX = String(row.day).length === 1 ? 83.88 : 79.432;
    c += textOp(dayX, y, String(row.day), 8);
    if (row.note) {
      // Feiertage: zwei Zeilen mit leicht versetzter Grundlinie.
      c += textOp(HEADER_X.weekday, y + 3.509, row.weekday, 8);
      c += textOp(HEADER_X.weekday, y - 2.432, row.note, 8);
    } else {
      c += textOp(HEADER_X.weekday, y, row.weekday, 8);
    }
    if (row.bd) c += textOp(HEADER_X.bd, y, row.bd, 8);
    if (row.hg) c += textOp(HEADER_X.hg, y, row.hg, 8);
    if (row.rbn) c += textOp(HEADER_X.rbn, y, row.rbn, 8);
    if (row.rbn2) c += textOp(HEADER_X.rbn2, y, row.rbn2, 8);
  });

  const stats = spec.stats || [];
  if (stats.length) {
    const statTop = FIRST_ROW_Y - spec.rows.length * ROW_H - 34;
    c += textOp(59.528, statTop, "Statistik", 9);
    c += textOp(64.063, statTop - 15.59, "Mitarbeitende", 8);
    c += textOp(209.657, statTop - 15.59, "BD", 8);
    c += textOp(271.795, statTop - 15.59, "HG", 8);
    stats.forEach(([name, bd, hg], i) => {
      const y = statTop - 28.06 - i * 12.472;
      c += textOp(64.063, y, name, 8);
      c += textOp(213.209, y, String(bd), 8);
      c += textOp(275.571, y, String(hg), 8);
    });
  }
  return c;
}

function latin1Bytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

async function deflate(bytes) {
  const cs = new CompressionStream("deflate");
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * @param {object} spec siehe buildContent
 * @param {{ compress?: boolean }} [options]
 * @returns {Promise<Uint8Array>}
 */
export async function makeDutyPdf(spec, options = {}) {
  const contentStr = buildContent(spec);
  let contentBytes = latin1Bytes(contentStr);
  let filter = "";
  if (options.compress) {
    contentBytes = await deflate(contentBytes);
    filter = " /Filter /FlateDecode";
  }

  const head =
    "%PDF-1.4\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] " +
    "/Resources << /Font << /FB 6 0 R >> >> /Contents 4 0 R >>\nendobj\n" +
    `4 0 obj\n<< /Length ${contentBytes.length}${filter} >>\nstream\n`;
  const tail =
    "\nendstream\nendobj\n" +
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n" +
    "trailer\n<< /Size 7 /Root 1 0 R >>\n%%EOF\n";

  const headBytes = latin1Bytes(head);
  const tailBytes = latin1Bytes(tail);
  const out = new Uint8Array(headBytes.length + contentBytes.length + tailBytes.length);
  out.set(headBytes, 0);
  out.set(contentBytes, headBytes.length);
  out.set(tailBytes, headBytes.length + contentBytes.length);
  return out;
}

// Ein vollständiger Oktober 2026 (31 Tage) nach dem Schema der Originaldatei.
export const OCTOBER_2026 = {
  period: "Oktober 2026",
  rows: [
    { day: 1, weekday: "Donnerstag", bd: "Sebastian", hg: "Dalitz", rbn: "Dalitz" },
    { day: 2, weekday: "Freitag", bd: "Becker", hg: "Polednia", rbn: "Maybaum" },
    { day: 3, weekday: "Samstag", note: "Tag der Deutschen Einheit", bd: "Lurz", hg: "Becker", rbn: "Maybaum" },
    { day: 4, weekday: "Sonntag", bd: "Licenji", hg: "Lurz", rbn: "Maybaum" },
    { day: 5, weekday: "Montag", bd: "Hellmann", hg: "Dalitz", rbn: "Schüngel", rbn2: "Schob" },
    { day: 6, weekday: "Dienstag", bd: "Dalitz", hg: "Lurz", rbn: "Dalitz" },
    { day: 7, weekday: "Mittwoch", bd: "Licenji", hg: "Lurz", rbn: "Schüngel", rbn2: "Maybaum" },
    { day: 8, weekday: "Donnerstag", bd: "Polednia", hg: "Dalitz", rbn: "Bailis" },
    { day: 9, weekday: "Freitag", bd: "Dalitz", hg: "Martin", rbn: "Schob" },
    { day: 10, weekday: "Samstag", bd: "Hellmann", hg: "Martin", rbn: "Schob" },
    { day: 11, weekday: "Sonntag", bd: "Martin", hg: "Hellmann", rbn: "Schob" },
    { day: 12, weekday: "Montag", bd: "Licenji", hg: "Becker", rbn: "Schüngel", rbn2: "Bailis" },
    { day: 13, weekday: "Dienstag", bd: "Lurz", hg: "El Houba", rbn: "Schüngel", rbn2: "Schob" },
    { day: 14, weekday: "Mittwoch", bd: "Polednia", hg: "El Houba", rbn: "Bailis" },
    { day: 15, weekday: "Donnerstag", bd: "Lurz", hg: "Hellmann", rbn: "Schob" },
    { day: 16, weekday: "Freitag", bd: "Martin", hg: "Polednia", rbn: "Bailis" },
    { day: 17, weekday: "Samstag", bd: "Polednia", hg: "Martin", rbn: "Bailis" },
    { day: 18, weekday: "Sonntag", bd: "Becker", hg: "Polednia", rbn: "Bailis" },
    { day: 19, weekday: "Montag", bd: "Polednia", hg: "Martin", rbn: "Maybaum" },
    { day: 20, weekday: "Dienstag", bd: "El Houba", hg: "Becker", rbn: "Schüngel", rbn2: "Bailis" },
    { day: 21, weekday: "Mittwoch", bd: "Sebastian", hg: "Polednia", rbn: "Maybaum" },
    { day: 22, weekday: "Donnerstag", bd: "Licenji", hg: "Becker", rbn: "Bailis" },
    { day: 23, weekday: "Freitag", bd: "Sebastian", hg: "Lurz", rbn: "Schüngel", rbn2: "Maybaum" },
    { day: 24, weekday: "Samstag", bd: "El Houba", hg: "Lurz", rbn: "Schüngel", rbn2: "Bailis" },
    { day: 25, weekday: "Sonntag", bd: "Lurz", hg: "El Houba", rbn: "Schüngel", rbn2: "Schob" },
    { day: 26, weekday: "Montag", bd: "Becker", hg: "Dalitz", rbn: "Dalitz" },
    { day: 27, weekday: "Dienstag", bd: "Martin", hg: "Dalitz", rbn: "Schob" },
    { day: 28, weekday: "Mittwoch", bd: "Dalitz", hg: "Hellmann", rbn: "Dalitz" },
    { day: 29, weekday: "Donnerstag", bd: "Sebastian", hg: "Polednia", rbn: "Schüngel", rbn2: "Maybaum" },
    { day: 30, weekday: "Freitag", bd: "El Houba", hg: "Dalitz", rbn: "Dalitz" },
    { day: 31, weekday: "Samstag", note: "Reformationstag", bd: "Dalitz", hg: "El Houba", rbn: "Dalitz" },
  ],
  stats: [
    ["Dr. Lurz", 4, 5],
    ["Dr. Polednia", 4, 5],
    ["Fr. Dalitz", 4, 6],
    ["Dr. Becker", 3, 4],
    ["Dr. Hellmann", 2, 3],
    ["Dr. Martin", 3, 4],
    ["Hr. El Houba", 3, 4],
    ["Fr. Licenji", 4, 0],
    ["Hr. Sebastian", 4, 0],
    ["Offen", 0, 0],
  ],
};
