/*
 * RadPlan – "Solver Sequencer" Visualisierung
 * ------------------------------------------------------------------------
 * GRUNDLEGEND NEUES PARADIGMA (kein Kalenderraster mehr):
 * Der Auto-Planer entscheidet, WER an WELCHEM Tag Dienst hat. Genau diese
 * Entscheidungsmatrix wird hier direkt sichtbar – als Mitarbeiter × Tage-
 * Matrix im Stil eines Audio-/DAW-Sequencers:
 *
 *   - Zeilen = Mitarbeitende (FÄ oben/eingefärbt, AA darunter),
 *     Spalten = Tage des Monats.
 *   - Während der Algorithmus läuft, FÜLLT sich der Dienstplan live:
 *     jede Vergabe setzt eine leuchtende Kachel (D rot, HG blau) an der
 *     Kreuzung (Mitarbeiter|Tag).
 *   - Eine PLAYHEAD-Welle fegt wie ein Sequencer-Abspielkopf über die Tage
 *     und lässt die Dienste der jeweiligen Spalte aufblitzen.
 *   - Swaps SPRINGEN sichtbar als Token von der alten in die neue
 *     Mitarbeiter-Zeile.
 *   - Rechts zeigt je Zeile ein LOAD-METER die Dienstlast – Fairness wird
 *     unmittelbar als Balance der Balken ablesbar.
 *
 * Alles wird auf einem einzigen Canvas gezeichnet (kein DOM-Zellraster).
 * Die öffentliche API (initData, attachMiniMap, triggerAssignment,
 * triggerSwap, triggerError, setPhase, triggerSuccess, dispose) bleibt
 * unverändert; app.js muss nicht angepasst werden.
 */

import { isFacharzt } from './constants.js';

const STYLE_ID = 'radplan-neural-graph-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ng-container {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(5,10,24,0), rgba(2,5,14,0.55)),
        radial-gradient(120% 90% at 50% 0%, rgba(30,41,80,0.30), rgba(2,6,18,0.94) 72%);
    }
    .ng-seq-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

const PHASE_RGB = {
  init:    [56, 189, 248],
  greedy:  [245, 158, 11],
  hg:      [56, 189, 248],
  deep:    [168, 85, 247],
  success: [34, 197, 94],
  error:   [239, 68, 68],
};

const DUTY_D = [239, 68, 68];
const DUTY_HG = [14, 165, 233];

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.employees = [];
    this.empIndex = new Map();
    this.days = 0;
    this.phase = 'init';
    this.basePhase = 'init';

    this.canvas = null;
    this.ctx = null;
    this.hudCanvas = null;
    this.hudCtx = null;

    // Akkumulierter Plan: key "row|col" -> { duty, glow }
    this.matrix = new Map();
    this.rowLoad = [];           // Dienstzahl je Zeile (Fairness-Meter)

    this.swaps = [];             // springende Swap-Token
    this.particles = [];         // Funken am Playhead
    this.errorFx = [];           // Fehler-Blitze
    this.playX = 0;
    this.lastCol = -1;
    this.successWave = -1;       // -1 = inaktiv, sonst 0..1

    // HUD-Telemetrie (Kühl-Hüllkurve + Equalizer + Hex-Ticker)
    this.energyHistory = [];
    this.energyLevel = 0.85;
    this.bars = [];
    this.hexStream = '';
    this.temp = 1.0;
    this.tempTarget = 1.0;

    this.animId = null;
    this.resizeObserver = null;
    this.t0 = performance.now();

    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
    this.startLoop();
  }

  buildDOM() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ng-container';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ng-seq-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.resizeHud();
    });
    this.resizeObserver.observe(this.container);
  }

  resizeCanvas() {
    if (!this.canvas || !this.wrapper) return;
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
  }

  initData(daysCount, employees) {
    this.days = daysCount;
    // Fachärzte zuerst (eingefärbt), dann übrige – sortierte, sinnvolle Lesart.
    const fa = employees.filter((e) => isFacharzt(e));
    const aa = employees.filter((e) => !isFacharzt(e));
    this.employees = [...fa, ...aa];
    this.empIndex = new Map(this.employees.map((e, i) => [e, i]));
    this.rowLoad = new Array(this.employees.length).fill(0);
    this.matrix.clear();
    this.swaps = [];
    this.particles = [];
    this.errorFx = [];
    this.successWave = -1;
    this.lastCol = -1;
    this.resizeCanvas();
  }

  attachMiniMap(container) {
    container.innerHTML = '';
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.style.width = '100%';
    this.hudCanvas.style.height = '100%';
    this.hudCanvas.style.display = 'block';
    container.appendChild(this.hudCanvas);
    this.hudCtx = this.hudCanvas.getContext('2d', { alpha: false });
    if (this.resizeObserver) this.resizeObserver.observe(container);
    this.resizeHud();
  }

  resizeHud() {
    if (!this.hudCanvas || !this.hudCanvas.parentElement) return;
    const parent = this.hudCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.hudCanvas.width = w * dpr;
    this.hudCanvas.height = h * dpr;
    this.hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const barCount = Math.max(10, Math.floor(w / 7));
    if (this.bars.length !== barCount) {
      this.bars = new Array(barCount).fill(0).map(() => Math.random() * 0.3);
    }
  }

  // --- Helpers ----------------------------------------------------------

  phaseColorArr() { return PHASE_RGB[this.phase] || PHASE_RGB.init; }
  getPhaseColor(a = 1) { const [r, g, b] = this.phaseColorArr(); return `rgba(${r},${g},${b},${a})`; }
  dutyColorArr(d) { return d === 'HG' ? DUTY_HG : DUTY_D; }

  getAbbreviation(empId) {
    if (!empId) return '';
    const stripped = String(empId)
      .replace(/^(Herr|Frau|Hr\.|Fr\.|Dr\.\s*(med\.\s*)?|Prof\.\s*(Dr\.\s*(med\.\s*)?|med\.\s*)?|PD\s+Dr\.\s*(med\.\s*)?|Dipl\.\s*\w+\.\s*)/gi, '')
      .trim();
    const parts = stripped.split(/\s+/);
    if (parts.length <= 1) return stripped.replace(/\s/g, '').substring(0, 3).toUpperCase();
    const pre = ['el', 'al', 'van', 'von', 'de', 'le', 'la', 'di', 'lo', 'del', 'dal', 'bin', 'ben', 'abu'];
    if (pre.includes(parts[0].toLowerCase())) return parts.join('').substring(0, 3).toUpperCase();
    return parts[parts.length - 1].substring(0, 3).toUpperCase();
  }

  cellKey(row, col) { return `${row}|${col}`; }

  setCell(row, col, duty, glow = 1) {
    if (row < 0 || row >= this.employees.length || col < 1 || col > this.days) return;
    const key = this.cellKey(row, col);
    const prev = this.matrix.get(key);
    if (!prev) this.rowLoad[row] = (this.rowLoad[row] || 0) + 1;
    this.matrix.set(key, { duty, glow: Math.max(glow, prev ? prev.glow : 0) });
  }

  clearCell(row, col) {
    const key = this.cellKey(row, col);
    if (this.matrix.has(key)) {
      this.matrix.delete(key);
      this.rowLoad[row] = Math.max(0, (this.rowLoad[row] || 0) - 1);
    }
  }

  // --- API-Auslöser -----------------------------------------------------

  triggerAssignment(dayIdx, empId, dutyType = 'D') {
    const row = this.empIndex.get(empId);
    if (row === undefined) { this.bumpHud(false); return; }
    this.setCell(row, dayIdx, dutyType, 1.4);
    this.spawnCellSpark(row, dayIdx, this.dutyColorArr(dutyType));
    this.bumpHud(false);
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId, dutyType = 'D') {
    const fromRow = this.empIndex.get(oldEmpId);
    const toRow = this.empIndex.get(newEmpId);
    if (toRow === undefined) { this.bumpHud(false); return; }
    if (fromRow !== undefined && fromRow !== toRow) {
      this.clearCell(fromRow, dayIdx);
      this.swaps.push({ col: dayIdx, fromRow, toRow, progress: 0, color: this.dutyColorArr(dutyType) });
    }
    this.setCell(toRow, dayIdx, dutyType, 1.4);
    this.bumpHud(false);
  }

  triggerError(dayIdx, empId, dutyType = 'D') {
    if (this.phase !== 'error') this.basePhase = this.phase;
    this.phase = 'error';
    const row = this.empIndex.get(empId);
    this.errorFx.push({ row: row === undefined ? -1 : row, col: dayIdx, life: 1 });
    this.bumpHud(true);
    setTimeout(() => { if (this.phase === 'error') this.phase = this.basePhase || 'init'; }, 320);
  }

  setPhase(phase) {
    this.phase = phase;
    if (phase !== 'error') this.basePhase = phase;
    const t = { init: 1.0, greedy: 0.82, hg: 0.58, deep: 0.33, success: 0.04, error: 0.7 };
    if (t[phase] !== undefined) this.tempTarget = t[phase];
  }

  triggerSuccess(finalAssignments) {
    this.setPhase('success');
    this.tempTarget = 0.04;
    if (finalAssignments) {
      // Plan komplett (neu) setzen, damit der Endzustand exakt stimmt.
      this.matrix.clear();
      this.rowLoad = new Array(this.employees.length).fill(0);
      for (const [emp, days] of Object.entries(finalAssignments)) {
        const row = this.empIndex.get(emp);
        if (row === undefined) continue;
        for (const [dayStr, data] of Object.entries(days)) {
          if (data && data.duty) this.setCell(row, parseInt(dayStr, 10), data.duty, 1);
        }
      }
    }
    this.successWave = 0;
    for (let p = 0; p < 18; p++) setTimeout(() => this.bumpHud(false), p * 40);
  }

  // --- Effekte ----------------------------------------------------------

  spawnCellSpark(row, col, color) {
    const pos = this.cellCenter(row, col);
    if (!pos) return;
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: pos.x, y: pos.y,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -0.6 - Math.random() * 1.2,
        life: 1, color,
      });
    }
  }

  bumpHud(isError) {
    const spikes = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < spikes; s++) {
      const idx = Math.floor(Math.random() * this.bars.length);
      if (idx >= 0 && idx < this.bars.length) {
        this.bars[idx] = Math.min(1, this.bars[idx] + (isError ? 1 : 0.6 + Math.random() * 0.4));
      }
    }
    this.energyLevel = Math.min(1, this.energyLevel + (isError ? 0.22 : 0.1 + Math.random() * 0.06));
  }

  // --- Layout -----------------------------------------------------------

  layout() {
    const w = this.W || 0;
    const h = this.H || 0;
    const nEmp = this.employees.length || 1;
    const padL = Math.min(58, Math.max(40, w * 0.10));
    const padR = Math.min(46, Math.max(30, w * 0.07));
    const padT = 20;
    const padB = 8;
    const gridW = Math.max(1, w - padL - padR);
    const gridH = Math.max(1, h - padT - padB);
    return {
      padL, padR, padT, padB, gridW, gridH,
      cellW: gridW / this.days,
      rowH: gridH / nEmp,
    };
  }

  cellCenter(row, col) {
    if (!this.W) return null;
    const L = this.layout();
    return {
      x: L.padL + (col - 0.5) * L.cellW,
      y: L.padT + (row + 0.5) * L.rowH,
    };
  }

  // --- Render: Sequencer-Matrix -----------------------------------------

  renderMatrix() {
    const ctx = this.ctx;
    if (!ctx || !this.W || !this.days || !this.employees.length) return;
    const w = this.W, h = this.H;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();
    this.temp += (this.tempTarget - this.temp) * 0.03;

    const L = this.layout();
    ctx.clearRect(0, 0, w, h);

    // Spalten-Raster + Tagesnummern
    ctx.font = `${Math.min(10, L.cellW * 0.7)}px var(--font-mono, monospace)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let c = 1; c <= this.days; c++) {
      const x = L.padL + (c - 0.5) * L.cellW;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      if (L.cellW > 9 || c % 2 === 1) ctx.fillText(String(c), x, L.padT - 7);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.beginPath();
      ctx.moveTo(L.padL + (c - 1) * L.cellW, L.padT);
      ctx.lineTo(L.padL + (c - 1) * L.cellW, L.padT + L.gridH);
      ctx.stroke();
    }

    // Zeilen: Label, Trennlinie, Hintergrund-Tint nach Rolle
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelFont = Math.max(8, Math.min(12, L.rowH * 0.42));
    for (let r = 0; r < this.employees.length; r++) {
      const emp = this.employees[r];
      const yTop = L.padT + r * L.rowH;
      const yMid = yTop + L.rowH / 2;
      const fa = isFacharzt(emp);
      // Zebra + Rollentint
      ctx.fillStyle = fa ? 'rgba(56,189,248,0.045)' : 'rgba(148,163,184,0.04)';
      if (r % 2 === 0) ctx.fillRect(L.padL, yTop, L.gridW, L.rowH);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.moveTo(L.padL, yTop); ctx.lineTo(L.padL + L.gridW, yTop); ctx.stroke();

      ctx.font = `${fa ? '700 ' : '400 '}${labelFont}px var(--font-mono, monospace)`;
      ctx.fillStyle = fa ? 'rgba(125,211,252,0.9)' : 'rgba(148,163,184,0.85)';
      ctx.fillText(this.getAbbreviation(emp), 5, yMid);
    }

    // Playhead-Position (Sequencer-Abspielkopf, fegt über die Tage)
    const period = 2.4;
    this.playX = (time % period) / period;
    const playCol = Math.min(this.days, Math.floor(this.playX * this.days) + 1);
    if (playCol !== this.lastCol) {
      this.lastCol = playCol;
      // Spalte „abspielen": zugewiesene Kacheln dieser Spalte aufblitzen lassen
      for (let r = 0; r < this.employees.length; r++) {
        const cell = this.matrix.get(this.cellKey(r, playCol));
        if (cell) {
          cell.glow = Math.max(cell.glow, 1.2);
          this.spawnCellSpark(r, playCol, this.dutyColorArr(cell.duty));
        }
      }
    }

    // Matrix-Kacheln (akkumulierter Plan)
    const cw = L.cellW, rh = L.rowH;
    const tileW = Math.max(2, cw - 2);
    const tileH = Math.max(2, rh - 2);
    for (const [key, cell] of this.matrix.entries()) {
      const [r, c] = key.split('|').map(Number);
      cell.glow *= 0.93;
      const x = L.padL + (c - 1) * cw + 1;
      const y = L.padT + r * rh + 1;
      const [dr, dg, db] = this.dutyColorArr(cell.duty);
      const base = 0.4 + Math.min(0.55, cell.glow * 0.45);
      // Glow-Halo bei frischer Aktivität
      if (cell.glow > 0.1) {
        ctx.shadowColor = `rgba(${dr},${dg},${db},0.9)`;
        ctx.shadowBlur = 4 + cell.glow * 10;
      }
      ctx.fillStyle = `rgba(${dr},${dg},${db},${base})`;
      this.roundRect(ctx, x, y, tileW, tileH, Math.min(3, tileH / 3));
      ctx.fill();
      ctx.shadowBlur = 0;
      // Dienst-Buchstabe, wenn groß genug
      if (cw >= 13 && rh >= 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `700 ${Math.min(9, rh * 0.5)}px var(--font-mono, monospace)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.duty === 'HG' ? 'H' : 'D', x + tileW / 2, y + tileH / 2 + 0.5);
      }
    }

    // Swap-Token (springt zwischen Zeilen)
    for (let i = this.swaps.length - 1; i >= 0; i--) {
      const s = this.swaps[i];
      s.progress += 0.045;
      if (s.progress >= 1) { this.swaps.splice(i, 1); continue; }
      const t = s.progress;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = L.padL + (s.col - 0.5) * cw;
      const y0 = L.padT + (s.fromRow + 0.5) * rh;
      const y1 = L.padT + (s.toRow + 0.5) * rh;
      const y = y0 + (y1 - y0) * ease;
      const arc = Math.sin(t * Math.PI) * Math.min(40, Math.abs(y1 - y0) * 0.4);
      const [cr, cg, cb] = s.color;
      ctx.beginPath();
      ctx.arc(x + arc, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${1 - t})`;
      ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Funken
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life *= 0.9;
      if (p.life < 0.05) { this.particles.splice(i, 1); continue; }
      const [cr, cg, cb] = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4 * p.life + 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.life})`;
      ctx.fill();
    }

    // Fehler-Blitze (Zeile + Spalte kurz rot)
    for (let i = this.errorFx.length - 1; i >= 0; i--) {
      const e = this.errorFx[i];
      e.life *= 0.86;
      if (e.life < 0.05) { this.errorFx.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(239,68,68,${e.life * 0.35})`;
      if (e.row >= 0) ctx.fillRect(L.padL, L.padT + e.row * rh, L.gridW, rh);
      ctx.fillRect(L.padL + (e.col - 1) * cw, L.padT, cw, L.gridH);
    }

    // Playhead-Welle
    const phx = L.padL + this.playX * L.gridW;
    const pg2 = ctx.createLinearGradient(phx - 26, 0, phx + 8, 0);
    pg2.addColorStop(0, 'rgba(0,0,0,0)');
    pg2.addColorStop(1, `rgba(${pr},${pg},${pb},${0.12 + 0.12 * (1 - this.temp)})`);
    ctx.fillStyle = pg2;
    ctx.fillRect(phx - 26, L.padT, 34, L.gridH);
    ctx.strokeStyle = `rgba(${pr},${pg},${pb},0.85)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(phx, L.padT - 3); ctx.lineTo(phx, L.padT + L.gridH); ctx.stroke();
    ctx.beginPath(); ctx.arc(phx, L.padT - 3, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${pr},${pg},${pb},0.95)`; ctx.fill();

    // Erfolgs-Welle (einmaliger heller Durchlauf)
    if (this.successWave >= 0) {
      this.successWave += 0.012;
      if (this.successWave > 1.1) {
        this.successWave = -1;
      } else {
        const sx = L.padL + this.successWave * L.gridW;
        const sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
        sg.addColorStop(0, 'rgba(0,0,0,0)');
        sg.addColorStop(0.5, 'rgba(34,197,94,0.4)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(sx - 40, 0, 80, h);
        const litCol = Math.floor(this.successWave * this.days) + 1;
        for (let r = 0; r < this.employees.length; r++) {
          const cell = this.matrix.get(this.cellKey(r, litCol));
          if (cell) cell.glow = Math.max(cell.glow, 1.3);
        }
      }
    }

    // Load-Meter je Zeile (Fairness als Balkenbalance, rechts)
    const maxLoad = Math.max(1, ...this.rowLoad);
    const meterX = L.padL + L.gridW + 3;
    const meterW = Math.max(8, L.padR - 6);
    for (let r = 0; r < this.employees.length; r++) {
      const yTop = L.padT + r * rh;
      const frac = (this.rowLoad[r] || 0) / maxLoad;
      const bh = Math.max(1, (rh - 3) * frac);
      const fa = isFacharzt(this.employees[r]);
      const [mr, mg, mb] = fa ? DUTY_HG : [148, 163, 184];
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(meterX, yTop + 1.5, meterW, rh - 3);
      ctx.fillStyle = `rgba(${mr},${mg},${mb},0.75)`;
      ctx.fillRect(meterX, yTop + 1.5 + (rh - 3 - bh), meterW, bh);
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // --- Render: HUD oben rechts (schnell, digital) -----------------------

  renderHud() {
    const ctx = this.hudCtx;
    if (!ctx || !this.hudCanvas.parentElement) return;
    const parent = this.hudCanvas.parentElement;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();

    const pad = 3;
    const curveBot = Math.round(h * 0.48);
    const barsTop = Math.round(h * 0.66);
    const hexBaseline = Math.round((curveBot + barsTop) / 2) + 1;
    const fontPx = h < 70 ? 8 : 9;

    ctx.fillStyle = '#03070F';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

    // Systemenergie: Kühl-Hüllkurve, pulst bei Aktivität, sinkt mit Temp.
    const envelope = 0.12 + this.temp * 0.55;
    this.energyLevel += (envelope - this.energyLevel) * 0.05;
    this.energyLevel = Math.max(0, this.energyLevel * 0.96);
    const sample = Math.min(1, this.energyLevel + Math.abs(Math.sin(time * 7)) * 0.06 * (0.3 + this.temp));
    this.energyHistory.push(sample);
    const maxPts = Math.max(24, Math.floor(w));
    if (this.energyHistory.length > maxPts) this.energyHistory.shift();

    ctx.beginPath();
    for (let i = 0; i < this.energyHistory.length; i++) {
      const x = (i / (maxPts - 1)) * w;
      const v = Math.max(0, Math.min(1, this.energyHistory[i]));
      const y = pad + (1 - v) * (curveBot - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.getPhaseColor(0.9);
    ctx.lineWidth = 1.4;
    ctx.shadowColor = this.getPhaseColor(0.8);
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (Math.floor(time * 22) !== this._hexTick) {
      this._hexTick = Math.floor(time * 22);
      const ch = '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
      this.hexStream = (this.hexStream + ch).slice(-Math.max(8, Math.floor(w / 7)));
    }
    ctx.font = `${fontPx}px var(--font-mono, monospace)`;
    ctx.fillStyle = `rgba(${pr},${pg},${pb},0.5)`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.hexStream, pad, hexBaseline);

    const baseY = h - pad;
    const barsH = baseY - barsTop;
    const bw = w / this.bars.length;
    for (let i = 0; i < this.bars.length; i++) {
      const noise = Math.abs(Math.sin(time * 12 + i * 0.7)) * 0.18 * (0.4 + this.temp);
      this.bars[i] = Math.max(noise, this.bars[i] * 0.86);
      const bh = this.bars[i] * barsH;
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.35 + this.bars[i] * 0.65})`;
      ctx.fillRect(i * bw + 0.5, baseY - bh, Math.max(1, bw - 1.2), bh);
    }

    const blink = (Math.sin(time * 8) > -0.3) ? 1 : 0.3;
    ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.85 * blink})`;
    ctx.font = `bold ${fontPx}px var(--font-mono, monospace)`;
    ctx.textBaseline = 'top';
    const e = Math.round(this.energyLevel * 9999).toString(16).toUpperCase().padStart(4, '0');
    ctx.fillText(`ΔE·${e}`, pad, 2);

    ctx.strokeStyle = this.getPhaseColor(0.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.renderMatrix();
      this.renderHud();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  dispose() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.container) this.container.innerHTML = '';
    if (this.hudCanvas && this.hudCanvas.parentElement) this.hudCanvas.parentElement.innerHTML = '';
    this.matrix.clear();
    this.swaps = [];
    this.particles = [];
    this.errorFx = [];
    this.bars = [];
    this.energyHistory = [];
  }
}
