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
  globalThis.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
