// RadPlan · ESLint Flat Config (Vorschlag 32)
// ---------------------------------------------------------------------------
// RadPlan ist eine buildlose Vanilla-ESM-App ohne Bundler/Transpiler. Diese
// Konfiguration prüft daher nur echte Korrektheitsprobleme (nicht erreichbarer
// Code, ungenutzte Variablen, undefinierte Globals, Promise-Fehler) und
// überlässt reine Formatierungsfragen bewusst Prettier (siehe .prettierrc.json
// und `npm run format`) statt stilistische ESLint-Regeln zu duplizieren.
// `eslint-config-prettier` deaktiviert alle Regeln, die mit Prettier
// kollidieren könnten.
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  performance: 'readonly',
  CustomEvent: 'readonly',
  Event: 'readonly',
  DragEvent: 'readonly',
  DataTransfer: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Blob: 'readonly',
  DecompressionStream: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  FileReader: 'readonly',
  crypto: 'readonly',
  matchMedia: 'readonly',
  history: 'readonly',
  location: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  prompt: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  structuredClone: 'readonly',
  CSS: 'readonly',
  Image: 'readonly',
  getComputedStyle: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  fetch: 'readonly',
  // Global über <script>-Tags am Ende von index.html per CDN eingebundene
  // Drittbibliotheken (siehe README §2.2) — keine lokal gebündelten Typen
  // vorhanden, daher hier als bekannte Globals deklariert.
  Chart: 'readonly',
  gsap: 'readonly',
  jspdf: 'readonly',
};
// Hinweis: functions/api.js (Cloudflare Pages Function / Workers-Runtime) teilt
// sich dieselben Web-Standard-Globals (Request/Response/fetch/crypto/URL) mit
// dem Browser-Set oben und braucht daher keine eigene Globals-Liste.

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  module: 'readonly',
  require: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  fetch: 'readonly',
};

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'radplan.json', 'test/helpers/**'],
  },
  {
    files: ['js/**/*.js', 'functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-undef': 'error',
      'no-fallthrough': 'error',
      'no-case-declarations': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...browserGlobals, ...nodeGlobals },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  prettierConfig,
];
