/**
 * Ambient declarations for third-party libraries loaded via <script> tags
 * from CDNs in index.html (see README §2.2). RadPlan has no bundler and no
 * local copies of these libraries, so TypeScript cannot infer their shape
 * from node_modules. These `any`-typed globals let `tsc --noEmit` type-check
 * RadPlan's own code without flagging every Chart.js/GSAP/jsPDF/SheetJS call
 * as an unknown identifier. They intentionally stay untyped (`any`) rather
 * than modeling the full upstream APIs, which would need to be kept in sync
 * by hand with every CDN version bump.
 */

declare const Chart: any;
declare const gsap: any;
declare const XLSX: any;

/** SheetJS wird in mod-reports.js per dynamischem `import()` direkt vom CDN geladen. */
declare module "https://cdn.sheetjs.com/*" {
  const XLSX: any;
  export = XLSX;
}

interface Navigator {
  /** Nicht standardisierte iOS-Safari-Property: true bei installierter Home-Screen-PWA. */
  standalone?: boolean;
}

interface Window {
  jspdf: any;
  Chart: any;
  gsap: any;
  XLSX: any;
  /** Debug-Einstieg für den Autoplan-Score-Info-Dialog, siehe js/app.js. */
  openScoreInfoModal: (result?: any) => void;
  /** Debug-Referenz auf die zuletzt erzeugte NeuralGraph-Instanz, siehe js/neuralgraph.js. */
  lastNeuralGraphInstance: any;
}
