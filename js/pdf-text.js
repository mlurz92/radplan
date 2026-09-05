// RadPlan — Minimaler, abhängigkeitsfreier PDF-Textextraktor.
// ---------------------------------------------------------------------------
// Liest aus einem PDF-Byte-Puffer alle sichtbaren Textfragmente inklusive ihrer
// Position auf der Seite aus. Das Ergebnis dient als Grundlage für den Import
// von Monats-Dienstplänen (siehe js/pdf-schedule.js).
//
// Bewusste Beschränkungen (der Aufrufer meldet dem Nutzer eine klare
// Fehlermeldung, wenn eine davon greift):
//   * verschlüsselte PDFs werden nicht unterstützt,
//   * gescannte PDFs ohne Textebene liefern keine Fragmente,
//   * exotische Filter (LZW, JBIG2 …) werden nicht dekodiert.
//
// Unterstützt werden: unkomprimierte Streams, FlateDecode (via der nativen
// DecompressionStream-API), ASCIIHexDecode, ASCII85Decode, RunLengthDecode,
// PNG-/TIFF-Prädiktoren, Objektströme (/ObjStm, PDF 1.5+), Seitenbäume,
// WinAnsi-/MacRoman-/Standard-Encoding, /Differences sowie /ToUnicode-CMaps
// (inkl. 2-Byte-Codes bei Type0-Fonts).

/** @typedef {{ x: number, y: number, text: string, size: number }} PdfTextItem */
/** @typedef {{ index: number, width: number, height: number, items: PdfTextItem[] }} PdfTextPage */

const WHITESPACE = new Set(["\0", "\t", "\n", "\f", "\r", " "]);
const DELIMITERS = new Set(["(", ")", "<", ">", "[", "]", "{", "}", "/", "%"]);

const isWhite = (ch) => WHITESPACE.has(ch);
const isDelim = (ch) => DELIMITERS.has(ch);
const isRegular = (ch) => ch !== undefined && !isWhite(ch) && !isDelim(ch);

// ── Byte-/String-Hilfen ─────────────────────────────────────────────────────
// PDF-Syntax ist byteorientiert. Für das Scannen der Dateistruktur wird der
// Puffer einmalig verlustfrei als Latin-1-String gespiegelt (1 Byte = 1
// Codepoint); die eigentliche Zeichensatz-Dekodierung erfolgt später über das
// Font-Encoding.
function bytesToLatin1(bytes) {
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

function latin1ToBytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

// ── Filter ──────────────────────────────────────────────────────────────────
async function inflate(bytes) {
  // Erst als zlib-Stream versuchen (Regelfall bei /FlateDecode), dann roh.
  /** @type {CompressionFormat[]} */
  const attempts = ["deflate", "deflate-raw"];
  let lastErr = null;
  for (const format of attempts) {
    try {
      const ds = new DecompressionStream(format);
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      const buf = await new Response(stream).arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error("FlateDecode fehlgeschlagen: " + (lastErr && lastErr.message));
}

function ascii85Decode(bytes) {
  const out = [];
  let tuple = 0;
  let count = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 0x7e) break; // "~" leitet "~>" ein
    if (c === 0x7a && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 0x21 || c > 0x75) continue; // Whitespace u. Ä. überspringen
    tuple = tuple * 85 + (c - 0x21);
    count++;
    if (count === 5) {
      out.push((tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    const full = [(tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff];
    out.push(...full.slice(0, count - 1));
  }
  return Uint8Array.from(out);
}

function asciiHexDecode(bytes) {
  const out = [];
  let hi = -1;
  for (let i = 0; i < bytes.length; i++) {
    const c = String.fromCharCode(bytes[i]);
    if (c === ">") break;
    const v = parseInt(c, 16);
    if (Number.isNaN(v)) continue;
    if (hi < 0) hi = v;
    else {
      out.push((hi << 4) | v);
      hi = -1;
    }
  }
  if (hi >= 0) out.push(hi << 4);
  return Uint8Array.from(out);
}

function runLengthDecode(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i++];
    if (len === 128) break;
    if (len < 128) {
      for (let k = 0; k <= len; k++) out.push(bytes[i++]);
    } else {
      const b = bytes[i++];
      for (let k = 0; k < 257 - len; k++) out.push(b);
    }
  }
  return Uint8Array.from(out);
}

// PNG-/TIFF-Prädiktoren (relevant für Objekt- und Querverweisströme).
function applyPredictor(bytes, parms) {
  const predictor = Number(parms.Predictor) || 1;
  if (predictor <= 1) return bytes;

  const colors = Number(parms.Colors) || 1;
  const bpc = Number(parms.BitsPerComponent) || 8;
  const columns = Number(parms.Columns) || 1;
  const bpp = Math.ceil((colors * bpc) / 8);
  const rowLen = Math.ceil((colors * bpc * columns) / 8);

  if (predictor === 2) {
    if (bpc !== 8) return bytes; // Sub-Byte-TIFF-Prädiktoren kommen praktisch nicht vor
    const out = new Uint8Array(bytes);
    for (let r = 0; r + rowLen <= out.length; r += rowLen) {
      for (let i = bpp; i < rowLen; i++) out[r + i] = (out[r + i] + out[r + i - bpp]) & 0xff;
    }
    return out;
  }

  // PNG-Prädiktoren: jede Zeile beginnt mit einem Filtertyp-Byte.
  const rows = Math.floor(bytes.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  let prev = new Uint8Array(rowLen);
  for (let r = 0; r < rows; r++) {
    const type = bytes[r * (rowLen + 1)];
    const src = bytes.subarray(r * (rowLen + 1) + 1, r * (rowLen + 1) + 1 + rowLen);
    const cur = new Uint8Array(rowLen);
    for (let i = 0; i < rowLen; i++) {
      const raw = src[i] || 0;
      const left = i >= bpp ? cur[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      let val;
      switch (type) {
        case 0:
          val = raw;
          break;
        case 1:
          val = raw + left;
          break;
        case 2:
          val = raw + up;
          break;
        case 3:
          val = raw + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          val = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          val = raw;
      }
      cur[i] = val & 0xff;
    }
    out.set(cur, r * rowLen);
    prev = cur;
  }
  return out;
}

// ── Objekt-Parser ───────────────────────────────────────────────────────────
class Lexer {
  /** @param {string} src Latin-1-Spiegel der PDF-Bytes */
  constructor(src, pos = 0) {
    this.src = src;
    this.pos = pos;
  }

  skipWhite() {
    const s = this.src;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (isWhite(c)) {
        this.pos++;
      } else if (c === "%") {
        while (this.pos < s.length && s[this.pos] !== "\n" && s[this.pos] !== "\r") this.pos++;
      } else {
        break;
      }
    }
  }

  readToken() {
    this.skipWhite();
    const s = this.src;
    if (this.pos >= s.length) return null;
    const c = s[this.pos];

    if (c === "<" && s[this.pos + 1] === "<") {
      this.pos += 2;
      return { type: "dict-open" };
    }
    if (c === ">" && s[this.pos + 1] === ">") {
      this.pos += 2;
      return { type: "dict-close" };
    }
    if (c === "[") {
      this.pos++;
      return { type: "array-open" };
    }
    if (c === "]") {
      this.pos++;
      return { type: "array-close" };
    }
    if (c === "{") {
      this.pos++;
      return { type: "brace-open" };
    }
    if (c === "}") {
      this.pos++;
      return { type: "brace-close" };
    }
    if (c === "/") return { type: "name", value: this.readName() };
    if (c === "(") return { type: "string", value: this.readLiteralString() };
    if (c === "<") return { type: "string", value: this.readHexString() };

    if (c === "+" || c === "-" || c === "." || (c >= "0" && c <= "9")) {
      const start = this.pos;
      this.pos++;
      while (isRegular(s[this.pos])) this.pos++;
      const raw = s.slice(start, this.pos);
      const num = parseFloat(raw);
      return { type: "number", value: Number.isFinite(num) ? num : 0 };
    }

    const start = this.pos;
    while (isRegular(s[this.pos])) this.pos++;
    if (this.pos === start) {
      // Unbekanntes Trennzeichen — überspringen, statt endlos zu blockieren.
      this.pos++;
      return this.readToken();
    }
    return { type: "keyword", value: s.slice(start, this.pos) };
  }

  readName() {
    const s = this.src;
    this.pos++; // "/"
    let out = "";
    while (isRegular(s[this.pos])) {
      let ch = s[this.pos];
      if (ch === "#" && /^[0-9a-fA-F]{2}$/.test(s.slice(this.pos + 1, this.pos + 3))) {
        ch = String.fromCharCode(parseInt(s.slice(this.pos + 1, this.pos + 3), 16));
        this.pos += 2;
      }
      out += ch;
      this.pos++;
    }
    return out;
  }

  readLiteralString() {
    const s = this.src;
    this.pos++; // "("
    let depth = 1;
    let out = "";
    while (this.pos < s.length) {
      const c = s[this.pos++];
      if (c === "\\") {
        const e = s[this.pos++];
        switch (e) {
          case "n":
            out += "\n";
            break;
          case "r":
            out += "\r";
            break;
          case "t":
            out += "\t";
            break;
          case "b":
            out += "\b";
            break;
          case "f":
            out += "\f";
            break;
          case "(":
            out += "(";
            break;
          case ")":
            out += ")";
            break;
          case "\\":
            out += "\\";
            break;
          case "\r":
            if (s[this.pos] === "\n") this.pos++;
            break; // Zeilenfortsetzung
          case "\n":
            break;
          default:
            if (e >= "0" && e <= "7") {
              let oct = e;
              while (oct.length < 3 && s[this.pos] >= "0" && s[this.pos] <= "7") oct += s[this.pos++];
              out += String.fromCharCode(parseInt(oct, 8) & 0xff);
            } else {
              out += e;
            }
        }
        continue;
      }
      if (c === "(") {
        depth++;
        out += c;
        continue;
      }
      if (c === ")") {
        depth--;
        if (depth === 0) break;
        out += c;
        continue;
      }
      out += c;
    }
    return out;
  }

  readHexString() {
    const s = this.src;
    this.pos++; // "<"
    let hex = "";
    while (this.pos < s.length && s[this.pos] !== ">") {
      const c = s[this.pos++];
      if (/[0-9a-fA-F]/.test(c)) hex += c;
    }
    this.pos++; // ">"
    if (hex.length % 2) hex += "0";
    let out = "";
    for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    return out;
  }
}

const REF = Symbol("pdf-ref");

function makeRef(num, gen) {
  return { [REF]: true, num, gen };
}

export function isRef(v) {
  return !!(v && typeof v === "object" && v[REF]);
}

// Liest genau einen Objektwert ab der aktuellen Lexer-Position.
function parseValue(lexer, token) {
  const tok = token || lexer.readToken();
  if (!tok) return undefined;

  switch (tok.type) {
    case "number": {
      // Mögliche indirekte Referenz "<num> <gen> R" erkennen.
      const save = lexer.pos;
      const t2 = lexer.readToken();
      if (t2 && t2.type === "number" && Number.isInteger(tok.value) && Number.isInteger(t2.value)) {
        const save2 = lexer.pos;
        const t3 = lexer.readToken();
        if (t3 && t3.type === "keyword" && t3.value === "R") return makeRef(tok.value, t2.value);
        lexer.pos = save2;
      }
      lexer.pos = save;
      return tok.value;
    }
    case "name":
      return { name: tok.value };
    case "string":
      return { str: tok.value };
    case "array-open": {
      const arr = [];
      for (;;) {
        const t = lexer.readToken();
        if (!t || t.type === "array-close") break;
        const v = parseValue(lexer, t);
        if (v === undefined) break;
        arr.push(v);
      }
      return arr;
    }
    case "dict-open": {
      const dict = Object.create(null);
      for (;;) {
        const t = lexer.readToken();
        if (!t || t.type === "dict-close") break;
        if (t.type !== "name") continue; // defekter Schlüssel → überspringen
        const v = parseValue(lexer);
        if (v === undefined) break;
        dict[t.value] = v;
      }
      return dict;
    }
    case "keyword":
      if (tok.value === "true") return true;
      if (tok.value === "false") return false;
      if (tok.value === "null") return null;
      return { keyword: tok.value };
    default:
      return { token: tok.type };
  }
}

// ── Dokument ────────────────────────────────────────────────────────────────
class PdfDocument {
  constructor(bytes) {
    this.bytes = bytes;
    this.src = bytesToLatin1(bytes);
    /** @type {Map<number, any>} */
    this.objects = new Map();
    /** @type {Map<number, {dict: any, start: number, end: number}>} */
    this.streams = new Map();
    /** @type {Map<number, Uint8Array>} */
    this.decodedCache = new Map();
    this.trailerDicts = [];
  }

  resolve(v) {
    let guard = 0;
    while (isRef(v) && guard++ < 32) v = this.objects.get(v.num);
    return v;
  }

  dictGet(dict, key) {
    if (!dict || typeof dict !== "object") return undefined;
    return this.resolve(dict[key]);
  }

  nameOf(v) {
    const r = this.resolve(v);
    return r && typeof r === "object" && typeof r.name === "string" ? r.name : null;
  }

  // Scannt die gesamte Datei nach "<num> <gen> obj". Damit ist der Parser
  // unabhängig von (häufig defekten oder inkrementell fortgeschriebenen)
  // Querverweistabellen. Bei mehrfach vorkommenden Objektnummern gewinnt das
  // zuletzt in der Datei stehende Objekt — genau wie bei inkrementellen
  // Aktualisierungen.
  scanObjects() {
    const re = /(?:^|[\s>\]])(\d{1,10})\s+(\d{1,5})\s+obj\b/g;
    const s = this.src;
    let m;
    while ((m = re.exec(s)) !== null) {
      const num = parseInt(m[1], 10);
      const bodyStart = m.index + m[0].length;
      const lexer = new Lexer(s, bodyStart);
      let value;
      try {
        value = parseValue(lexer);
      } catch {
        continue;
      }
      this.objects.set(num, value);

      // Folgt ein Stream, dessen Rohdaten merken.
      const save = lexer.pos;
      const tok = lexer.readToken();
      if (tok && tok.type === "keyword" && tok.value === "stream") {
        let p = lexer.pos;
        if (s[p] === "\r") p++;
        if (s[p] === "\n") p++;
        const end = this.findStreamEnd(value, p);
        if (end > p || end === p) {
          this.streams.set(num, { dict: value, start: p, end });
        }
      } else {
        lexer.pos = save;
      }
      // Die Suche hinter dem Objektkopf fortsetzen; verschachtelte
      // "obj"-Vorkommen in Streams werden dadurch nicht doppelt gelesen.
      re.lastIndex = Math.max(re.lastIndex, bodyStart);
    }

    for (const m2 of this.src.matchAll(/trailer\b/g)) {
      const lexer = new Lexer(this.src, m2.index + 7);
      try {
        const d = parseValue(lexer);
        if (d && typeof d === "object" && !Array.isArray(d)) this.trailerDicts.push(d);
      } catch {
        /* defekter Trailer wird ignoriert */
      }
    }
  }

  findStreamEnd(dict, start) {
    const s = this.src;
    const declared = this.resolve(dict && dict.Length);
    if (typeof declared === "number" && declared >= 0 && start + declared <= s.length) {
      const after = s.slice(start + declared, start + declared + 20);
      if (/^\s*endstream/.test(after)) return start + declared;
    }
    const idx = s.indexOf("endstream", start);
    if (idx < 0) return s.length;
    let end = idx;
    if (s[end - 1] === "\n") end--;
    if (s[end - 1] === "\r") end--;
    return end;
  }

  isEncrypted() {
    if (this.trailerDicts.some((d) => d.Encrypt !== undefined)) return true;
    // PDFs mit Querverweisströmen tragen /Encrypt im XRef-Stream-Dictionary.
    for (const { dict } of this.streams.values()) {
      if (this.nameOf(dict && dict.Type) === "XRef" && dict.Encrypt !== undefined) return true;
    }
    return false;
  }

  async getStreamData(num) {
    if (this.decodedCache.has(num)) return this.decodedCache.get(num);
    const entry = this.streams.get(num);
    if (!entry) return null;
    let data = latin1ToBytes(this.src.slice(entry.start, entry.end));

    const filterRaw = this.resolve(entry.dict.Filter);
    const filters = filterRaw == null ? [] : Array.isArray(filterRaw) ? filterRaw : [filterRaw];
    const parmsRaw = this.resolve(entry.dict.DecodeParms ?? entry.dict.DP);
    const parmsList = parmsRaw == null ? [] : Array.isArray(parmsRaw) ? parmsRaw : [parmsRaw];

    for (let i = 0; i < filters.length; i++) {
      const name = this.nameOf(filters[i]);
      const parms = this.resolve(parmsList[i]) || {};
      switch (name) {
        case "FlateDecode":
        case "Fl":
          data = await inflate(data);
          data = applyPredictor(data, this.plainParms(parms));
          break;
        case "LZWDecode":
        case "LZW":
          throw new Error("PDF verwendet den nicht unterstützten Filter LZWDecode.");
        case "ASCII85Decode":
        case "A85":
          data = ascii85Decode(data);
          break;
        case "ASCIIHexDecode":
        case "AHx":
          data = asciiHexDecode(data);
          break;
        case "RunLengthDecode":
        case "RL":
          data = runLengthDecode(data);
          break;
        default:
          // Bild-/Sonderfilter (DCTDecode …) enthalten keinen Text.
          data = new Uint8Array(0);
      }
    }

    this.decodedCache.set(num, data);
    return data;
  }

  plainParms(parms) {
    const out = {};
    for (const key of ["Predictor", "Colors", "BitsPerComponent", "Columns"]) {
      const v = this.resolve(parms[key]);
      if (typeof v === "number") out[key] = v;
    }
    return out;
  }

  // Objektströme (PDF 1.5+) auflösen: sie enthalten weitere Objekte komprimiert.
  async expandObjectStreams() {
    for (const [num, entry] of [...this.streams.entries()]) {
      if (this.nameOf(entry.dict.Type) !== "ObjStm") continue;
      let data;
      try {
        data = await this.getStreamData(num);
      } catch {
        continue;
      }
      if (!data || !data.length) continue;

      const n = Number(this.resolve(entry.dict.N)) || 0;
      const first = Number(this.resolve(entry.dict.First)) || 0;
      const text = bytesToLatin1(data);
      const headLexer = new Lexer(text, 0);
      const pairs = [];
      for (let i = 0; i < n; i++) {
        const a = headLexer.readToken();
        const b = headLexer.readToken();
        if (!a || !b || a.type !== "number" || b.type !== "number") break;
        pairs.push([a.value, b.value]);
      }
      for (const [objNum, offset] of pairs) {
        // Direkt in der Datei stehende Objekte haben Vorrang (inkrementelle
        // Aktualisierung überschreibt den Objektstrom-Inhalt).
        if (this.objects.has(objNum)) continue;
        try {
          const lexer = new Lexer(text, first + offset);
          this.objects.set(objNum, parseValue(lexer));
        } catch {
          /* defekten Eintrag überspringen */
        }
      }
    }
  }

  // Seiten in Lesereihenfolge ermitteln.
  getPages() {
    const pages = [];
    const seen = new Set();

    const walk = (nodeRef, inherited, depth) => {
      if (depth > 64) return;
      const key = isRef(nodeRef) ? nodeRef.num : null;
      if (key !== null) {
        if (seen.has(key)) return;
        seen.add(key);
      }
      const node = this.resolve(nodeRef);
      if (!node || typeof node !== "object" || Array.isArray(node)) return;

      const next = { ...inherited };
      for (const key2 of ["Resources", "MediaBox", "CropBox", "Rotate"]) {
        if (node[key2] !== undefined) next[key2] = node[key2];
      }

      const type = this.nameOf(node.Type);
      const kids = this.dictGet(node, "Kids");
      if (type === "Page" || (type !== "Pages" && !Array.isArray(kids) && node.Contents !== undefined)) {
        pages.push({ dict: node, inherited: next });
        return;
      }
      if (Array.isArray(kids)) {
        for (const kid of kids) walk(kid, next, depth + 1);
      }
    };

    for (const obj of this.objects.values()) {
      if (obj && typeof obj === "object" && !Array.isArray(obj) && this.nameOf(obj.Type) === "Catalog") {
        walk(obj.Pages, {}, 0);
        if (pages.length) return pages;
      }
    }

    // Fallback ohne (lesbaren) Katalog: alle Seitenobjekte nach Objektnummer.
    const nums = [...this.objects.keys()].sort((a, b) => a - b);
    for (const num of nums) {
      const obj = this.objects.get(num);
      if (obj && typeof obj === "object" && !Array.isArray(obj) && this.nameOf(obj.Type) === "Page") {
        pages.push({ dict: obj, inherited: {} });
      }
    }
    return pages;
  }
}

// ── Zeichensatz-Dekodierung ─────────────────────────────────────────────────
// Windows-1252 weicht von Latin-1 nur im Bereich 0x80–0x9F ab.
const CP1252_HIGH = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f, 0x0090,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

const MACROMAN_HIGH = [
  0x00c4, 0x00c5, 0x00c7, 0x00c9, 0x00d1, 0x00d6, 0x00dc, 0x00e1, 0x00e0, 0x00e2, 0x00e4, 0x00e3, 0x00e5, 0x00e7, 0x00e9, 0x00e8, 0x00ea,
  0x00eb, 0x00ed, 0x00ec, 0x00ee, 0x00ef, 0x00f1, 0x00f3, 0x00f2, 0x00f4, 0x00f6, 0x00f5, 0x00fa, 0x00f9, 0x00fb, 0x00fc, 0x2020, 0x00b0,
  0x00a2, 0x00a3, 0x00a7, 0x2022, 0x00b6, 0x00df, 0x00ae, 0x00a9, 0x2122, 0x00b4, 0x00a8, 0x2260, 0x00c6, 0x00d8, 0x221e, 0x00b1, 0x2264,
  0x2265, 0x00a5, 0x00b5, 0x2202, 0x2211, 0x220f, 0x03c0, 0x222b, 0x00aa, 0x00ba, 0x03a9, 0x00e6, 0x00f8, 0x00bf, 0x00a1, 0x00ac, 0x221a,
  0x0192, 0x2248, 0x2206, 0x00ab, 0x00bb, 0x2026, 0x00a0, 0x00c0, 0x00c3, 0x00d5, 0x0152, 0x0153, 0x2013, 0x2014, 0x201c, 0x201d, 0x2018,
  0x2019, 0x00f7, 0x25ca, 0x00ff, 0x0178, 0x2044, 0x20ac, 0x2039, 0x203a, 0xfb01, 0xfb02, 0x2021, 0x00b7, 0x201a, 0x201e, 0x2030, 0x00c2,
  0x00ca, 0x00c1, 0x00cb, 0x00c8, 0x00cd, 0x00ce, 0x00cf, 0x00cc, 0x00d3, 0x00d4, 0xf8ff, 0x00d2, 0x00da, 0x00db, 0x00d9, 0x0131, 0x02c6,
  0x02dc, 0x00af, 0x02d8, 0x02d9, 0x02da, 0x00b8, 0x02dd, 0x02db, 0x02c7,
];

// Glyphnamen → Unicode für /Differences. Deckt ASCII sowie die im
// deutschsprachigen Raum relevanten Latin-1-Glyphen ab.
const GLYPH_NAMES = (() => {
  /** @type {Record<string, number>} */
  const map = Object.create(null);
  const ascii = {
    space: 32,
    exclam: 33,
    quotedbl: 34,
    numbersign: 35,
    dollar: 36,
    percent: 37,
    ampersand: 38,
    quotesingle: 39,
    quoteright: 0x2019,
    parenleft: 40,
    parenright: 41,
    asterisk: 42,
    plus: 43,
    comma: 44,
    hyphen: 45,
    period: 46,
    slash: 47,
    zero: 48,
    one: 49,
    two: 50,
    three: 51,
    four: 52,
    five: 53,
    six: 54,
    seven: 55,
    eight: 56,
    nine: 57,
    colon: 58,
    semicolon: 59,
    less: 60,
    equal: 61,
    greater: 62,
    question: 63,
    at: 64,
    bracketleft: 91,
    backslash: 92,
    bracketright: 93,
    asciicircum: 94,
    underscore: 95,
    grave: 96,
    quoteleft: 0x2018,
    braceleft: 123,
    bar: 124,
    braceright: 125,
    asciitilde: 126,
  };
  Object.assign(map, ascii);
  for (let c = 65; c <= 90; c++) map[String.fromCharCode(c)] = c;
  for (let c = 97; c <= 122; c++) map[String.fromCharCode(c)] = c;

  const latin = {
    exclamdown: 0xa1,
    cent: 0xa2,
    sterling: 0xa3,
    currency: 0xa4,
    yen: 0xa5,
    brokenbar: 0xa6,
    section: 0xa7,
    dieresis: 0xa8,
    copyright: 0xa9,
    ordfeminine: 0xaa,
    guillemotleft: 0xab,
    logicalnot: 0xac,
    registered: 0xae,
    macron: 0xaf,
    degree: 0xb0,
    plusminus: 0xb1,
    acute: 0xb4,
    mu: 0xb5,
    paragraph: 0xb6,
    periodcentered: 0xb7,
    cedilla: 0xb8,
    ordmasculine: 0xba,
    guillemotright: 0xbb,
    onequarter: 0xbc,
    onehalf: 0xbd,
    threequarters: 0xbe,
    questiondown: 0xbf,
    Agrave: 0xc0,
    Aacute: 0xc1,
    Acircumflex: 0xc2,
    Atilde: 0xc3,
    Adieresis: 0xc4,
    Aring: 0xc5,
    AE: 0xc6,
    Ccedilla: 0xc7,
    Egrave: 0xc8,
    Eacute: 0xc9,
    Ecircumflex: 0xca,
    Edieresis: 0xcb,
    Igrave: 0xcc,
    Iacute: 0xcd,
    Icircumflex: 0xce,
    Idieresis: 0xcf,
    Eth: 0xd0,
    Ntilde: 0xd1,
    Ograve: 0xd2,
    Oacute: 0xd3,
    Ocircumflex: 0xd4,
    Otilde: 0xd5,
    Odieresis: 0xd6,
    multiply: 0xd7,
    Oslash: 0xd8,
    Ugrave: 0xd9,
    Uacute: 0xda,
    Ucircumflex: 0xdb,
    Udieresis: 0xdc,
    Yacute: 0xdd,
    Thorn: 0xde,
    germandbls: 0xdf,
    agrave: 0xe0,
    aacute: 0xe1,
    acircumflex: 0xe2,
    atilde: 0xe3,
    adieresis: 0xe4,
    aring: 0xe5,
    ae: 0xe6,
    ccedilla: 0xe7,
    egrave: 0xe8,
    eacute: 0xe9,
    ecircumflex: 0xea,
    edieresis: 0xeb,
    igrave: 0xec,
    iacute: 0xed,
    icircumflex: 0xee,
    idieresis: 0xef,
    eth: 0xf0,
    ntilde: 0xf1,
    ograve: 0xf2,
    oacute: 0xf3,
    ocircumflex: 0xf4,
    otilde: 0xf5,
    odieresis: 0xf6,
    divide: 0xf7,
    oslash: 0xf8,
    ugrave: 0xf9,
    uacute: 0xfa,
    ucircumflex: 0xfb,
    udieresis: 0xfc,
    yacute: 0xfd,
    thorn: 0xfe,
    ydieresis: 0xff,
    quotedblleft: 0x201c,
    quotedblright: 0x201d,
    quotedblbase: 0x201e,
    quotesinglbase: 0x201a,
    endash: 0x2013,
    emdash: 0x2014,
    bullet: 0x2022,
    ellipsis: 0x2026,
    dagger: 0x2020,
    daggerdbl: 0x2021,
    perthousand: 0x2030,
    guilsinglleft: 0x2039,
    guilsinglright: 0x203a,
    trademark: 0x2122,
    Euro: 0x20ac,
    OE: 0x152,
    oe: 0x153,
    Scaron: 0x160,
    scaron: 0x161,
    Zcaron: 0x17d,
    zcaron: 0x17e,
    Ydieresis: 0x178,
    florin: 0x192,
    circumflex: 0x2c6,
    tilde: 0x2dc,
    fi: 0xfb01,
    fl: 0xfb02,
  };
  Object.assign(map, latin);
  return map;
})();

function glyphNameToUnicode(name) {
  if (Object.prototype.hasOwnProperty.call(GLYPH_NAMES, name)) return GLYPH_NAMES[name];
  let m = /^uni([0-9A-Fa-f]{4})/.exec(name);
  if (m) return parseInt(m[1], 16);
  m = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (m) return parseInt(m[1], 16);
  m = /^(?:g|cid|c|G)(\d+)$/.exec(name);
  if (m) return -1; // reine Glyph-Indizes lassen sich ohne Font-Programm nicht abbilden
  return -1;
}

function baseEncodingTable(encodingName) {
  const table = new Array(256).fill(-1);
  for (let c = 32; c < 127; c++) table[c] = c;
  if (encodingName === "MacRomanEncoding") {
    for (let c = 128; c < 256; c++) table[c] = MACROMAN_HIGH[c - 128];
  } else {
    // WinAnsiEncoding (Standard-Fallback): Latin-1 mit CP-1252-Sonderblock.
    for (let c = 128; c < 256; c++) table[c] = c < 160 ? CP1252_HIGH[c - 128] : c;
    table[0xa0] = 0x20;
    table[0xad] = 0x2d;
  }
  return table;
}

// /ToUnicode-CMap auswerten (bfchar/bfrange).
function parseToUnicodeCMap(text) {
  /** @type {Map<number, string>} */
  const map = new Map();
  const hexToStr = (hex) => {
    let out = "";
    for (let i = 0; i + 3 < hex.length + 1 && i < hex.length; i += 4) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 4).padEnd(4, "0"), 16));
    }
    return out;
  };

  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g;
    let m;
    while ((m = re.exec(block[1])) !== null) {
      map.set(parseInt(m[1], 16), hexToStr(m[2]));
    }
  }

  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = block[1];
    const reRange = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([\s\S]*?)\])/g;
    let m;
    while ((m = reRange.exec(body)) !== null) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      if (m[3] !== undefined) {
        const baseStr = hexToStr(m[3]);
        for (let c = lo; c <= hi && c - lo < 65536; c++) {
          if (!baseStr.length) continue;
          const shifted = baseStr.slice(0, -1) + String.fromCharCode(baseStr.charCodeAt(baseStr.length - 1) + (c - lo));
          map.set(c, shifted);
        }
      } else if (m[4] !== undefined) {
        const items = [...m[4].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => hexToStr(x[1]));
        items.forEach((s, i) => map.set(lo + i, s));
      }
    }
  }

  // Codelänge aus codespacerange ableiten (1 oder 2 Byte).
  let codeBytes = 0;
  const cs = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(text);
  if (cs) {
    const first = /<([0-9A-Fa-f]+)>/.exec(cs[1]);
    if (first) codeBytes = Math.max(1, Math.round(first[1].length / 2));
  }
  return { map, codeBytes };
}

async function buildFontDecoder(doc, fontDict) {
  const subtype = doc.nameOf(fontDict.Subtype);
  const isType0 = subtype === "Type0";
  let codeBytes = isType0 ? 2 : 1;

  const encRaw = doc.resolve(fontDict.Encoding);
  const encName = doc.nameOf(fontDict.Encoding);
  if (isType0 && encName && /^Identity-[HV]$/.test(encName)) codeBytes = 2;

  /** @type {Map<number, string>|null} */
  let toUnicode = null;
  const tuRef = fontDict.ToUnicode;
  if (isRef(tuRef) && doc.streams.has(tuRef.num)) {
    try {
      const data = await doc.getStreamData(tuRef.num);
      if (data && data.length) {
        const parsed = parseToUnicodeCMap(bytesToLatin1(data));
        toUnicode = parsed.map;
        if (parsed.codeBytes) codeBytes = parsed.codeBytes;
      }
    } catch {
      /* CMap unlesbar → Encoding-Fallback */
    }
  }

  let table = null;
  if (!isType0) {
    const baseName = encName || (encRaw && typeof encRaw === "object" ? doc.nameOf(encRaw.BaseEncoding) : null);
    table = baseEncodingTable(baseName || "WinAnsiEncoding");
    if (encRaw && typeof encRaw === "object" && !Array.isArray(encRaw)) {
      const diffs = doc.resolve(encRaw.Differences);
      if (Array.isArray(diffs)) {
        let code = 0;
        for (const item of diffs) {
          const v = doc.resolve(item);
          if (typeof v === "number") {
            code = Math.trunc(v);
          } else if (v && typeof v === "object" && typeof v.name === "string") {
            const uni = glyphNameToUnicode(v.name);
            if (code >= 0 && code < 256) table[code] = uni;
            code++;
          }
        }
      }
    }
  }

  /** @param {string} raw Latin-1-Rohbytes des Strings */
  return function decode(raw) {
    let out = "";
    for (let i = 0; i < raw.length; i += codeBytes) {
      let code = 0;
      for (let k = 0; k < codeBytes; k++) code = (code << 8) | (raw.charCodeAt(i + k) & 0xff);
      if (toUnicode && toUnicode.has(code)) {
        out += toUnicode.get(code);
        continue;
      }
      if (table) {
        const uni = table[code & 0xff];
        out += uni >= 0 ? String.fromCharCode(uni) : "";
        continue;
      }
      // Type0 ohne verwertbare CMap: Codes sind Glyph-Indizes → nicht abbildbar.
      out += code >= 32 && code < 0x10000 ? String.fromCharCode(code) : "";
    }
    return out;
  };
}

// ── Inhaltsstrom → Textfragmente ────────────────────────────────────────────
const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

async function extractPageItems(doc, page) {
  const dict = page.dict;
  const resources = doc.resolve(dict.Resources !== undefined ? dict.Resources : page.inherited.Resources) || {};

  const contentsRaw = dict.Contents;
  /** @type {Uint8Array[]} */
  const parts = [];
  const refs = Array.isArray(doc.resolve(contentsRaw)) ? doc.resolve(contentsRaw) : [contentsRaw];
  for (const r of refs) {
    if (!isRef(r)) continue;
    try {
      const data = await doc.getStreamData(r.num);
      if (data && data.length) parts.push(data);
    } catch {
      /* einzelner defekter Inhaltsstrom */
    }
  }
  if (!parts.length) return [];

  let total = 0;
  parts.forEach((p) => {
    total += p.length + 1;
  });
  const merged = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    merged.set(p, off);
    off += p.length;
    merged[off++] = 0x0a;
  }
  const content = bytesToLatin1(merged);

  // Font-Dekoder der Seite vorbereiten.
  /** @type {Map<string, (raw: string) => string>} */
  const fonts = new Map();
  const fontRes = doc.resolve(resources.Font);
  if (fontRes && typeof fontRes === "object" && !Array.isArray(fontRes)) {
    for (const key of Object.keys(fontRes)) {
      const fd = doc.resolve(fontRes[key]);
      if (!fd || typeof fd !== "object" || Array.isArray(fd)) continue;
      try {
        fonts.set(key, await buildFontDecoder(doc, fd));
      } catch {
        /* Font unlesbar → Standard-Dekoder */
      }
    }
  }
  const defaultDecode = (raw) => {
    const table = baseEncodingTable("WinAnsiEncoding");
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      const uni = table[raw.charCodeAt(i) & 0xff];
      out += uni >= 0 ? String.fromCharCode(uni) : "";
    }
    return out;
  };

  /** @type {PdfTextItem[]} */
  const items = [];
  const lexer = new Lexer(content, 0);
  /** @type {any[]} */
  let stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  /** @type {number[][]} */
  const ctmStack = [];
  let tm = [1, 0, 0, 1, 0, 0];
  let tlm = [1, 0, 0, 1, 0, 0];
  let leading = 0;
  let fontSize = 0;
  let decode = defaultDecode;

  const show = (raw) => {
    const text = decode(raw);
    if (!text || !text.trim()) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[2], m[3]) || 1;
    items.push({ x: m[4], y: m[5], text, size: fontSize * scale });
  };

  const showArray = (arr) => {
    let raw = "";
    for (const el of arr) {
      if (el && typeof el === "object" && typeof el.str === "string") raw += el.str;
    }
    if (raw) show(raw);
  };

  const num = (v) => (typeof v === "number" ? v : 0);

  for (;;) {
    const tok = lexer.readToken();
    if (!tok) break;
    if (tok.type !== "keyword") {
      const v = parseValue(lexer, tok);
      if (v === undefined) break;
      stack.push(v);
      if (stack.length > 64) stack.shift();
      continue;
    }

    const op = tok.value;
    switch (op) {
      case "q":
        ctmStack.push(ctm.slice());
        break;
      case "Q":
        ctm = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
        break;
      case "cm": {
        const a = stack.slice(-6).map(num);
        if (a.length === 6) ctm = mul(a, ctm);
        break;
      }
      case "BT":
        tm = [1, 0, 0, 1, 0, 0];
        tlm = tm.slice();
        break;
      case "ET":
        break;
      case "Tf": {
        fontSize = num(stack[stack.length - 1]);
        const nameVal = stack[stack.length - 2];
        const key = nameVal && typeof nameVal === "object" ? nameVal.name : null;
        decode = (key && fonts.get(key)) || defaultDecode;
        break;
      }
      case "TL":
        leading = num(stack[stack.length - 1]);
        break;
      case "Td": {
        const tx = num(stack[stack.length - 2]);
        const ty = num(stack[stack.length - 1]);
        tlm = mul([1, 0, 0, 1, tx, ty], tlm);
        tm = tlm.slice();
        break;
      }
      case "TD": {
        const tx = num(stack[stack.length - 2]);
        const ty = num(stack[stack.length - 1]);
        leading = -ty;
        tlm = mul([1, 0, 0, 1, tx, ty], tlm);
        tm = tlm.slice();
        break;
      }
      case "Tm": {
        const a = stack.slice(-6).map(num);
        if (a.length === 6) {
          tlm = a;
          tm = a.slice();
        }
        break;
      }
      case "T*":
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm);
        tm = tlm.slice();
        break;
      case "Tj": {
        const v = stack[stack.length - 1];
        if (v && typeof v === "object" && typeof v.str === "string") show(v.str);
        break;
      }
      case "TJ": {
        const v = stack[stack.length - 1];
        if (Array.isArray(v)) showArray(v);
        break;
      }
      case "'": {
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm);
        tm = tlm.slice();
        const v = stack[stack.length - 1];
        if (v && typeof v === "object" && typeof v.str === "string") show(v.str);
        break;
      }
      case '"': {
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm);
        tm = tlm.slice();
        const v = stack[stack.length - 1];
        if (v && typeof v === "object" && typeof v.str === "string") show(v.str);
        break;
      }
      default:
        break;
    }
    stack = [];
  }

  return items;
}

/**
 * Extrahiert alle Textfragmente eines PDFs mit Seitenkoordinaten.
 * @param {ArrayBuffer|Uint8Array} input
 * @returns {Promise<{ pages: PdfTextPage[] }>}
 */
export async function extractPdfTextItems(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 5 || bytesToLatin1(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0) {
    throw new Error("Die Datei ist kein gültiges PDF.");
  }

  const doc = new PdfDocument(bytes);
  doc.scanObjects();
  if (doc.isEncrypted()) {
    throw new Error("Das PDF ist verschlüsselt und kann nicht gelesen werden.");
  }
  await doc.expandObjectStreams();

  const pages = doc.getPages();
  /** @type {PdfTextPage[]} */
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const mbRaw = doc.resolve(page.dict.MediaBox !== undefined ? page.dict.MediaBox : page.inherited.MediaBox);
    const mb = Array.isArray(mbRaw) ? mbRaw.map((v) => Number(doc.resolve(v)) || 0) : [0, 0, 595.276, 841.89];
    const items = await extractPageItems(doc, page);
    out.push({
      index: i,
      width: Math.abs(mb[2] - mb[0]),
      height: Math.abs(mb[3] - mb[1]),
      items,
    });
  }
  return { pages: out };
}
