import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Mock minimal DOM for Node test environment
const listeners = {};
const mockElement = {
  disabled: false,
  style: { display: "" },
  dataset: {},
  setAttribute: () => {},
  getAttribute: () => "",
  removeAttribute: () => {},
  hasAttribute: () => false,
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  querySelector: () => mockElement,
  querySelectorAll: () => [],
  cloneNode: () => mockElement,
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false,
    toggle: () => {}
  }
};

globalThis.window = {
  addEventListener: (event, cb) => {
    listeners[event] = cb;
  },
  removeEventListener: (event) => {
    delete listeners[event];
  },
  dispatchEvent: (event) => {
    if (listeners[event.type]) {
      listeners[event.type](event);
    }
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 0)
};
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;

globalThis.document = {
  body: mockElement,
  getElementById: () => mockElement,
  addEventListener: () => {},
  querySelectorAll: () => [],
  createElement: () => mockElement
};

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null
};

// Mock fetch to fail so that no background sync succeeds during test
globalThis.fetch = () => Promise.resolve({
  ok: false,
  status: 500
});

// CustomEvent stub
globalThis.CustomEvent = class CustomEvent {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail;
  }
};

// Dynamically import to ensure mock globals are defined beforehand
const {
  initNormalHistory,
  normalUndo,
  normalRedo,
  canNormalUndo,
  canNormalRedo,
  getLastChange
} = await import("../js/history.js");

const { store } = await import("../js/state.js");

describe("Normal History Stack (Deltas)", () => {
  test("initialization and basic mutations", async () => {
    // Prevent background sync attempts
    store.serverFetchSuccessful = true;

    // Clear data
    Object.keys(store.DATA).forEach((k) => delete store.DATA[k]);

    initNormalHistory();

    assert.equal(canNormalUndo(), false);
    assert.equal(canNormalRedo(), false);

    // Simulate modifying store DATA
    store.DATA["2026-5"] = {
      employees: ["Dr. Becker"],
      assignments: {
        "Dr. Becker": {
          "1": { assignment: "D", duty: "" }
        }
      },
      rbn: {}
    };

    // Trigger save queued event
    listeners["radplan-save-queued"]();

    // Fast-forward the debounce timer
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Now we should be able to undo
    assert.equal(canNormalUndo(), true);
    assert.equal(canNormalRedo(), false);

    // Check last change tooltip info
    const lastChange = getLastChange(2026, 5, "Dr. Becker", 1);
    assert.ok(lastChange);
    assert.equal(lastChange.from, "");
    assert.equal(lastChange.to, "D");

    // Perform undo
    const undoRes = normalUndo();
    assert.equal(undoRes, true);

    // Verify data is reverted (since it was added, it should be empty under assignments)
    assert.equal(store.DATA["2026-5"]?.assignments?.["Dr. Becker"]?.["1"], undefined);


    // Redo should be active
    assert.equal(canNormalUndo(), false);
    assert.equal(canNormalRedo(), true);

    // Perform redo
    const redoRes = normalRedo();
    assert.equal(redoRes, true);

    // Verify data is restored
    assert.ok(store.DATA["2026-5"]);
    assert.equal(store.DATA["2026-5"].assignments["Dr. Becker"]["1"].assignment, "D");

    assert.equal(canNormalUndo(), true);
    assert.equal(canNormalRedo(), false);
  });
});
