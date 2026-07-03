// RadPlan Cloudflare Pages Function — /api
//
// Wire-Vertrag gegenüber dem Client (js/state.js) bleibt unverändert:
//   GET  -> { main: {"YYYY-M": monthData, ...}, plans: {...}, lastModified }
//   POST { main, plans, lastModified } -> { success: true, lastModified } | 409 { error, latestData }
//
// Intern liegt der Datenbestand NICHT mehr als ein einziger, unbegrenzt
// wachsender JSON-Blob unter einem KV-Schlüssel ("RADPLAN_DATA"), sondern
// partitioniert nach Kalenderjahr:
//   RADPLAN_META             -> { years: [2024, 2025, ...], lastModified }
//   RADPLAN_YEAR_<year>      -> { months: {"YYYY-M": monthData, ...}, lastModified }
//   RADPLAN_PLANS            -> { plans: {...}, lastModified }
//
// Vorteile: (1) jeder Sync liest/schreibt nur die tatsächlich betroffenen
// Jahres-Keys statt des gesamten (mit wachsender Historie unbegrenzt großen)
// Datenbestands; (2) 409-Konflikte werden pro Jahr erkannt statt für den
// gesamten Datenbestand – bearbeiten zwei Personen gleichzeitig
// unterschiedliche Jahre, kollidieren sie serverseitig gar nicht erst.
//
// Rückwärtskompatibilität: existiert noch der alte Schlüssel "RADPLAN_DATA"
// (Stand vor dieser Umstellung) und fehlt RADPLAN_META, wird er beim ersten
// Zugriff transparent in das neue Layout migriert. Der alte Schlüssel wird
// dabei NICHT gelöscht (dient als unangetasteter Fallback/Backup).

const META_KEY = "RADPLAN_META";
const PLANS_KEY = "RADPLAN_PLANS";
const LEGACY_KEY = "RADPLAN_DATA";
const yearKey = (year) => `RADPLAN_YEAR_${year}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Pragma, Cache-Control, Authorization",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function yearOfMonthKey(monthKey) {
  const year = parseInt(monthKey.split("-")[0], 10);
  return Number.isFinite(year) ? year : null;
}

async function readJson(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Liest den aktuellen Bestand vollständig ein (Meta + alle Jahres-Keys +
// Plan-Drafts) und rekonstruiert daraus das flache `main`-Objekt, wie es der
// Client kennt. Migriert transparent aus dem alten Einzel-Blob-Layout, falls
// RADPLAN_META noch nicht existiert.
async function loadFullState(kv) {
  let meta = await readJson(kv, META_KEY);

  if (!meta) {
    const legacy = await readJson(kv, LEGACY_KEY);
    if (legacy) {
      return migrateLegacy(kv, legacy);
    }
    return { main: {}, plans: {}, lastModified: 0 };
  }

  const years = Array.isArray(meta.years) ? meta.years : [];
  const yearRecords = await Promise.all(years.map((y) => readJson(kv, yearKey(y))));
  const plansRecord = await readJson(kv, PLANS_KEY);

  const main = {};
  yearRecords.forEach((record) => {
    if (record && record.months && typeof record.months === "object") {
      Object.assign(main, record.months);
    }
  });

  return {
    main,
    plans: (plansRecord && plansRecord.plans) || {},
    lastModified: parseInt(meta.lastModified, 10) || 0,
  };
}

// Einmalige Migration: zerlegt den alten Einzel-Blob (`legacy.main`, flach
// nach "YYYY-M" benannt) nach Jahr in separate RADPLAN_YEAR_<year>-Keys,
// schreibt RADPLAN_PLANS und RADPLAN_META. Der alte Schlüssel bleibt
// unangetastet als Fallback bestehen.
async function migrateLegacy(kv, legacy) {
  const legacyMain = legacy.main && typeof legacy.main === "object" ? legacy.main : legacy;
  const legacyPlans = (legacy.plans && typeof legacy.plans === "object") ? legacy.plans : {};
  const lastModified = parseInt(legacy.lastModified, 10) || Date.now();

  const byYear = new Map();
  for (const [mk, monthData] of Object.entries(legacyMain)) {
    const year = yearOfMonthKey(mk);
    if (year === null) continue;
    if (!byYear.has(year)) byYear.set(year, {});
    byYear.get(year)[mk] = monthData;
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);

  await Promise.all([
    ...years.map((year) =>
      kv.put(yearKey(year), JSON.stringify({ months: byYear.get(year), lastModified }))
    ),
    kv.put(PLANS_KEY, JSON.stringify({ plans: legacyPlans, lastModified })),
    kv.put(META_KEY, JSON.stringify({ years, lastModified })),
  ]);

  return { main: legacyMain, plans: legacyPlans, lastModified };
}

// Schreibt eingehende Änderungen partitioniert nach Jahr, mit Konflikt-
// erkennung PRO JAHR statt für den gesamten Bestand. Ein Jahr gilt nur dann
// als Konflikt, wenn (a) sich sein Inhalt gegenüber dem gespeicherten Stand
// tatsächlich unterscheidet UND (b) der gespeicherte Stand neuer ist als die
// Baseline, von der der Client ausging (`clientTimestamp`). Unveränderte
// Jahre werden weder verglichen als Konflikt behandelt noch neu geschrieben.
async function saveIncoming(kv, incomingMain, incomingPlans, clientTimestamp) {
  let meta = await readJson(kv, META_KEY);
  if (!meta) {
    const legacy = await readJson(kv, LEGACY_KEY);
    if (legacy) {
      await migrateLegacy(kv, legacy);
      meta = await readJson(kv, META_KEY);
    }
  }
  const knownYears = new Set(Array.isArray(meta?.years) ? meta.years : []);

  const byYear = new Map();
  for (const [mk, monthData] of Object.entries(incomingMain || {})) {
    const year = yearOfMonthKey(mk);
    if (year === null) continue;
    if (!byYear.has(year)) byYear.set(year, {});
    byYear.get(year)[mk] = monthData;
  }

  const storedByYear = new Map();
  await Promise.all(
    [...byYear.keys()].map(async (year) => {
      storedByYear.set(year, knownYears.has(year) ? await readJson(kv, yearKey(year)) : null);
    })
  );

  const conflictedYears = [];
  for (const [year, incomingMonths] of byYear.entries()) {
    const stored = storedByYear.get(year);
    if (!stored) continue; // neues Jahr, kein Konflikt möglich
    const unchanged = JSON.stringify(stored.months || {}) === JSON.stringify(incomingMonths);
    if (unchanged) continue;
    const storedTimestamp = parseInt(stored.lastModified, 10) || 0;
    if (storedTimestamp > clientTimestamp) {
      conflictedYears.push(year);
    }
  }

  if (conflictedYears.length > 0) {
    return { conflict: true };
  }

  const now = Date.now();
  const writes = [];
  const yearsToPersist = new Set(knownYears);

  for (const [year, incomingMonths] of byYear.entries()) {
    const stored = storedByYear.get(year);
    const unchanged = stored && JSON.stringify(stored.months || {}) === JSON.stringify(incomingMonths);
    if (unchanged) continue;
    writes.push(kv.put(yearKey(year), JSON.stringify({ months: incomingMonths, lastModified: now })));
    yearsToPersist.add(year);
  }

  writes.push(kv.put(PLANS_KEY, JSON.stringify({ plans: incomingPlans || {}, lastModified: now })));
  writes.push(
    kv.put(
      META_KEY,
      JSON.stringify({ years: [...yearsToPersist].sort((a, b) => a - b), lastModified: now })
    )
  );

  await Promise.all(writes);

  return { conflict: false, lastModified: now };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!env.RADPLAN_KV) {
    return jsonResponse({ error: "KV namespace binding missing" }, 500);
  }

  const kv = env.RADPLAN_KV;

  if (request.method === "GET") {
    try {
      const state = await loadFullState(kv);
      return jsonResponse(state, 200);
    } catch (e) {
      console.error("RadPlan API GET failed:", e);
      return jsonResponse({ error: "KV read error" }, 500);
    }
  }

  if (request.method === "POST") {
    try {
      const bodyText = await request.text();
      const parsedData = JSON.parse(bodyText);
      const clientTimestamp = parseInt(parsedData.lastModified, 10) || 0;

      const result = await saveIncoming(kv, parsedData.main || {}, parsedData.plans || {}, clientTimestamp);

      if (result.conflict) {
        const latestData = await loadFullState(kv);
        return jsonResponse({ error: "Conflict", latestData }, 409);
      }

      return jsonResponse({ success: true, lastModified: result.lastModified }, 200);
    } catch (e) {
      console.error("RadPlan API POST failed:", e);
      return jsonResponse({ error: "Invalid JSON or KV write error" }, 400);
    }
  }

  return jsonResponse({ error: "Method Not Allowed" }, 405);
}
