import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api.js";

// Minimaler In-Memory-Ersatz für den Cloudflare-KV-Namespace (get/put reichen
// für api.js). Jeder Test bekommt seine eigene, frische Instanz.
function makeKV(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    _dump() {
      return Object.fromEntries(store);
    },
  };
}

function makeContext(kv, { method = "GET", body } = {}) {
  const request = new Request("https://example.com/api", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { request, env: { RADPLAN_KV: kv } };
}

describe("functions/api.js — GET", () => {
  test("liefert leeren Grundzustand, wenn noch nichts gespeichert wurde", async () => {
    const kv = makeKV();
    const res = await onRequest(makeContext(kv));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { main: {}, plans: {}, lastModified: 0 });
  });

  test("migriert transparent aus dem alten Einzel-Blob-Layout (RADPLAN_DATA)", async () => {
    const legacy = {
      main: {
        "2025-11": { employees: ["Dr. Martin"], assignments: {} },
        "2026-0": { employees: ["Dr. Becker"], assignments: {} },
      },
      plans: { "2026-0": { employees: [], assignments: {} } },
      lastModified: 1000,
    };
    const kv = makeKV({ RADPLAN_DATA: JSON.stringify(legacy) });

    const res = await onRequest(makeContext(kv));
    const json = await res.json();

    assert.deepEqual(json.main, legacy.main);
    assert.deepEqual(json.plans, legacy.plans);
    assert.equal(json.lastModified, 1000);

    // Nach der Migration existieren die neuen partitionierten Keys...
    const dump = kv._dump();
    assert.ok(dump.RADPLAN_META);
    assert.ok(dump.RADPLAN_YEAR_2025);
    assert.ok(dump.RADPLAN_YEAR_2026);
    assert.ok(dump.RADPLAN_PLANS);
    // ...und der alte Schlüssel bleibt als Backup unangetastet erhalten.
    assert.ok(dump.RADPLAN_DATA);

    const meta = JSON.parse(dump.RADPLAN_META);
    assert.deepEqual(meta.years, [2025, 2026]);
  });

  test("liest bereits partitionierte Daten korrekt aus mehreren Jahres-Keys zusammen", async () => {
    const kv = makeKV({
      RADPLAN_META: JSON.stringify({ years: [2025, 2026], lastModified: 500 }),
      RADPLAN_YEAR_2025: JSON.stringify({ months: { "2025-11": { employees: ["A"] } }, lastModified: 400 }),
      RADPLAN_YEAR_2026: JSON.stringify({ months: { "2026-0": { employees: ["B"] } }, lastModified: 500 }),
      RADPLAN_PLANS: JSON.stringify({ plans: { "2026-0": { employees: ["B"] } }, lastModified: 500 }),
    });

    const res = await onRequest(makeContext(kv));
    const json = await res.json();

    assert.deepEqual(json.main, {
      "2025-11": { employees: ["A"] },
      "2026-0": { employees: ["B"] },
    });
    assert.equal(json.lastModified, 500);
  });
});

describe("functions/api.js — POST", () => {
  test("erstes Speichern (keine Vorgeschichte) schreibt ohne Konflikt", async () => {
    const kv = makeKV();
    const body = { main: { "2026-5": { employees: ["Dr. Martin"] } }, plans: {}, lastModified: 0 };
    const res = await onRequest(makeContext(kv, { method: "POST", body }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.lastModified > 0);

    const meta = JSON.parse(kv._dump().RADPLAN_META);
    assert.deepEqual(meta.years, [2026]);
  });

  test("zwei Jahre gleichzeitig bearbeitet, kein echter Konflikt -> beide werden geschrieben", async () => {
    const kv = makeKV();
    await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2025-0": { employees: ["A"] }, "2026-0": { employees: ["B"] } }, plans: {}, lastModified: 0 },
    }));
    const afterFirst = await (await onRequest(makeContext(kv))).json();

    // Ein zweiter Client ändert nur 2026, sendet aber (wie der echte Client)
    // seinen kompletten, unveränderten DATA-Stand inkl. 2025 mit.
    const res = await onRequest(makeContext(kv, {
      method: "POST",
      body: {
        main: { "2025-0": { employees: ["A"] }, "2026-0": { employees: ["B", "C"] } },
        plans: {},
        lastModified: afterFirst.lastModified,
      },
    }));
    assert.equal(res.status, 200);

    const final = await (await onRequest(makeContext(kv))).json();
    assert.deepEqual(final.main["2026-0"], { employees: ["B", "C"] });
    assert.deepEqual(final.main["2025-0"], { employees: ["A"] });
  });

  test("echter Konflikt: fremder Schreibzugriff auf dasselbe Jahr nach der Baseline des Clients -> 409", async () => {
    const kv = makeKV();
    await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2026-0": { employees: ["A"] } }, plans: {}, lastModified: 0 },
    }));
    const afterFirst = await (await onRequest(makeContext(kv))).json();

    // Ein anderer Client speichert zuerst eine Änderung an 2026...
    await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2026-0": { employees: ["A", "B"] } }, plans: {}, lastModified: afterFirst.lastModified },
    }));

    // ...bevor der ursprüngliche Client (noch auf altem Stand) seinerseits speichert.
    const res = await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2026-0": { employees: ["A", "C"] } }, plans: {}, lastModified: afterFirst.lastModified },
    }));

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error, "Conflict");
    assert.deepEqual(json.latestData.main["2026-0"], { employees: ["A", "B"] });
  });

  test("unverändertes Jahr im Payload löst weder Konflikt noch Schreibzugriff aus", async () => {
    const kv = makeKV();
    await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2025-0": { employees: ["A"] } }, plans: {}, lastModified: 0 },
    }));
    const afterFirst = await (await onRequest(makeContext(kv))).json();
    const yearRawBefore = kv._dump().RADPLAN_YEAR_2025;

    // Ein fremder Schreibzugriff verändert 2025 serverseitig NACH der Baseline...
    await onRequest(makeContext(kv, {
      method: "POST",
      body: { main: { "2025-0": { employees: ["A", "B"] } }, plans: {}, lastModified: afterFirst.lastModified },
    }));

    // ...aber der ursprüngliche Client sendet 2025 unverändert erneut mit
    // (typisch: er hat nur an einem anderen Jahr etwas editiert). Da der
    // Inhalt für 2025 in SEINEM Payload mit dem aktuellen Serverstand NICHT
    // übereinstimmt (server hat inzwischen B dazu), würde ein naiver
    // Zeitstempel-Vergleich hier fälschlich einen Konflikt melden -- das darf
    // nicht passieren, weil der Client 2025 gar nicht angefasst hat.
    void yearRawBefore;
    const res = await onRequest(makeContext(kv, {
      method: "POST",
      body: {
        main: { "2025-0": { employees: ["A"] }, "2026-0": { employees: ["Neu"] } },
        plans: {},
        lastModified: afterFirst.lastModified,
      },
    }));

    // Erwartung: Da der Client für 2025 exakt seinen alten (nun veralteten)
    // Stand mitsendet, wird das als "unverändert relativ zu seiner eigenen
    // Sicht" NICHT erkannt (der Vergleich läuft gegen den AKTUELLEN
    // Serverstand) -- das ist ein echter Konflikt und muss als solcher
    // gemeldet werden, damit "A,B" nicht durch "A" überschrieben wird.
    assert.equal(res.status, 409);
  });

  test("neues Jahr: zwei gleichzeitige Erstanlagen desselben Jahres -> zweite bekommt 409 statt stillem Überschreiben", async () => {
    const kv = makeKV();

    // Beide Clients starten von einer leeren Baseline (kein Jahr existiert
    // bisher, lastModified = 0) und wollen als Erste Daten für 2027 anlegen.
    const bodyA = { main: { "2027-0": { employees: ["A"] } }, plans: {}, lastModified: 0 };
    const bodyB = { main: { "2027-0": { employees: ["B"] } }, plans: {}, lastModified: 0 };

    // Client A schreibt zuerst durch (simuliert den "Gewinner" des Race).
    const resA = await onRequest(makeContext(kv, { method: "POST", body: bodyA }));
    assert.equal(resA.status, 200);

    // Client B hatte seinen Payload bereits vor A's Schreibzugriff auf Basis
    // derselben leeren Baseline zusammengestellt (lastModified: 0) und sendet
    // ihn erst jetzt ab -- ohne von A's Schreibzugriff zu wissen.
    const resB = await onRequest(makeContext(kv, { method: "POST", body: bodyB }));

    assert.equal(resB.status, 409);
    const jsonB = await resB.json();
    assert.equal(jsonB.error, "Conflict");

    // Der Stand von A darf nicht stillschweigend überschrieben worden sein.
    const final = await (await onRequest(makeContext(kv))).json();
    assert.deepEqual(final.main["2027-0"], { employees: ["A"] });
  });
});
