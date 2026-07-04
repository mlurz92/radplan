// Minimaler In-Memory-Ersatz für die Browser-Globals `localStorage`/`window`,
// die von state.js/model.js referenziert werden (z.B. saveToStorage() als
// Nebeneffekt von getMonthDataRaw()). Node kennt diese Globals nicht; ohne
// den Stub würde jeder Test, der versehentlich einen Speicherpfad auslöst,
// mit einer ReferenceError abbrechen statt mit einer aussagekräftigen
// Testassertion zu scheitern.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

if (typeof globalThis.window === "undefined") {
  // Echter EventTarget-Unterbau (statt reiner No-Op-Stubs) -- so können Tests
  // event-getriebenes Verhalten (z. B. history.js' Reaktion auf
  // `radplan-sync-update`) tatsächlich end-to-end auslösen und beobachten,
  // statt sich nur darauf zu verlassen, dass der Aufruf nicht wirft.
  const target = new EventTarget();
  globalThis.window = {
    dispatchEvent: (e) => target.dispatchEvent(e),
    addEventListener: (...args) => target.addEventListener(...args),
    removeEventListener: (...args) => target.removeEventListener(...args),
  };
}

// Minimaler `document`-Ersatz: reicht aus, damit Module wie history.js, die
// beim Aktualisieren von UI-Buttons defensiv `document.getElementById(...)`
// aufrufen, in Node nicht mit einer ReferenceError abbrechen. Es existieren
// schlicht keine Elemente (getElementById liefert immer `null`), was von den
// betroffenen Aufrufern bereits über Null-Checks abgefangen wird.
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
