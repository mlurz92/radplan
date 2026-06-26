/*
 * RadPlan – "Annealing Field" Visualisierung
 * ------------------------------------------------------------------------
 * Konzept: Der Auto-Planer ist ein iterativer Optimierer (25 Kühlzyklen,
 * Minimierung einer Objective-Funktion). Visuell wird er daher als
 * SIMULATED-ANNEALING-FELD dargestellt: der gesamte Monat ist ein
 * dezentrales Gitter aus Tag-Zellen. Jede Zelle besitzt eine eigene
 * "Energie/Temperatur"; früh im Lauf flackert das ganze Feld heiß und
 * chaotisch, mit jeder Phase kühlt es ab und kristallisiert. Vergaben und
 * Swaps zünden lokal an ihrer eigenen Zelle und pflanzen sich als
 * Constraint-Wellen zu den Nachbartagen fort (z. B. D -> Frei am Folgetag).
 * Es gibt KEINEN zentralen Konvergenzpunkt mehr – die Aktivität ist über das
 * ganze Feld verteilt.
 *
 * Die öffentliche API (initData, attachMiniMap, triggerAssignment,
 * triggerSwap, triggerError, setPhase, triggerSuccess, dispose) bleibt
 * unverändert; app.js muss nicht angepasst werden.
 */

const STYLE_ID = 'radplan-neural-graph-styles';
const COLS = 7;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ng-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(5,10,24,0.0), rgba(2,5,14,0.55)),
        radial-gradient(120% 80% at 50% 0%, rgba(30,41,80,0.35), rgba(2,6,18,0.92) 70%);
      padding: 20px;
      perspective: 1500px;
    }
    .ng-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    }
    .ng-matrix-grid {
      position: relative;
      display: grid;
      width: 100%;
      height: 100%;
      grid-auto-rows: 1fr;
      z-index: 2;
      gap: 8px;
    }
    .ng-flat-cell {
      border-radius: 11px;
      position: relative;
      background: rgba(8, 15, 33, 0.30);
      backdrop-filter: blur(2px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      will-change: transform, background-color, box-shadow, border-color;
      transition:
        transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275),
        background-color 0.3s ease,
        box-shadow 0.35s ease,
        border-color 0.3s ease;
    }
    .ng-flat-cell.rest { transform: none; }
    .ng-flat-cell.pulse {
      transform: scale(1.05);
      z-index: 50;
      background: rgba(15, 23, 42, 0.66);
      border-color: var(--pulse-color, rgba(56, 189, 248, 0.5));
      box-shadow:
        0 10px 26px rgba(0, 0, 0, 0.45),
        0 0 22px var(--pulse-color, transparent),
        inset 0 0 14px var(--pulse-color, transparent);
    }
    .ng-flat-cell.error {
      transform: scale(1.02);
      background: rgba(127, 29, 29, 0.4);
      border-color: #ef4444;
      box-shadow: 0 8px 22px rgba(239, 68, 68, 0.32);
    }
    .ng-flat-cell.crystal {
      border-color: var(--crystal-color, rgba(255,255,255,0.25));
      box-shadow: 0 0 14px var(--crystal-color, transparent), inset 0 0 8px rgba(255,255,255,0.05);
    }
    .ng-day-number {
      position: absolute;
      top: 5px;
      left: 7px;
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.22);
      pointer-events: none;
      z-index: 5;
    }
    .ng-slots-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 4px;
      gap: 4px;
      margin-top: 17px;
    }
    .ng-slot {
      flex: 1;
      position: relative;
      background: rgba(0, 0, 0, 0.22);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.03);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    .ng-slot::before {
      content: attr(data-label);
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--font-mono, monospace);
      font-size: 8px;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.12);
      letter-spacing: 0.1em;
    }
    .ng-slot.active-d {
      background: rgba(239, 68, 68, 0.16);
      border-color: rgba(239, 68, 68, 0.32);
      box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.12);
    }
    .ng-slot.active-hg {
      background: rgba(14, 165, 233, 0.16);
      border-color: rgba(14, 165, 233, 0.32);
      box-shadow: inset 0 0 12px rgba(14, 165, 233, 0.12);
    }
    .ng-slot-emp {
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 800;
      color: transparent;
      text-align: center;
      letter-spacing: 0.02em;
      transition: all 0.3s ease;
    }
    .ng-slot.has-val .ng-slot-emp {
      color: #fff;
      text-shadow: 0 0 8px currentColor;
    }
    .ng-slot.is-pulsing {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 16px var(--pulse-color);
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

// Ziel-Temperatur je Phase: heiß (chaotisch) -> kalt (kristallin).
const PHASE_TEMP = {
  init: 1.0,
  greedy: 0.82,
  hg: 0.58,
  deep: 0.33,
  success: 0.04,
  error: 0.7,
};

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.cells = new Map();
    this.nodes = new Map();      // pro Tag: {x,y,energy,crystal,color,seed}
    this.employees = [];
    this.daysCount = 0;
    this.phase = 'init';
    this.basePhase = 'init';

    this.bgCanvas = null;
    this.bgCtx = null;
    this.hudCanvas = null;
    this.hudCtx = null;

    this.edgePulses = [];        // dezentrale Constraint-Wellen Zelle->Nachbar
    this.flow = [];              // ambiente Strömungspartikel (kein Zentrum)
    this.glitches = [];          // Error-Scanline-Tears

    this.temp = 1.0;
    this.tempTarget = 1.0;

    // HUD-Telemetrie
    this.costHistory = [];
    this.cost = 1.0;
    this.bars = [];
    this.hexStream = '';

    this.animId = null;
    this.resizeObserver = null;
    this.gridFloat = null;
    this.positionsDirty = true;
    this.t0 = performance.now();
    this.scanPos = 0;

    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
    this.startLoop();
  }

  buildDOM() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ng-container';

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.className = 'ng-canvas';
    this.bgCtx = this.bgCanvas.getContext('2d');

    this.gridFloat = document.createElement('div');
    this.gridFloat.className = 'ng-matrix-grid';

    this.wrapper.appendChild(this.bgCanvas);
    this.wrapper.appendChild(this.gridFloat);
    this.container.appendChild(this.wrapper);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeHud();
      this.resizeBgCanvas();
      this.positionsDirty = true;
    });
    this.resizeObserver.observe(this.container);
  }

  resizeBgCanvas() {
    if (!this.bgCanvas || !this.wrapper) return;
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.bgCanvas.width = w * dpr;
    this.bgCanvas.height = h * dpr;
    this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bgW = w;
    this.bgH = h;
  }

  initData(daysCount, employees) {
    this.daysCount = daysCount;
    this.employees = employees;
    this.gridFloat.innerHTML = '';
    this.cells.clear();
    this.nodes.clear();

    const rows = Math.ceil(daysCount / COLS);
    this.gridFloat.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    this.gridFloat.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let d = 1; d <= daysCount; d++) {
      const cell = document.createElement('div');
      cell.className = 'ng-flat-cell rest';

      const dayLabel = document.createElement('div');
      dayLabel.className = 'ng-day-number';
      dayLabel.textContent = d;

      const slotsContainer = document.createElement('div');
      slotsContainer.className = 'ng-slots-container';

      const dSlot = document.createElement('div');
      dSlot.className = 'ng-slot slot-d';
      dSlot.setAttribute('data-label', 'D');
      const dEmp = document.createElement('span');
      dEmp.className = 'ng-slot-emp';
      dSlot.appendChild(dEmp);

      const hgSlot = document.createElement('div');
      hgSlot.className = 'ng-slot slot-hg';
      hgSlot.setAttribute('data-label', 'HG');
      const hgEmp = document.createElement('span');
      hgEmp.className = 'ng-slot-emp';
      hgSlot.appendChild(hgEmp);

      slotsContainer.appendChild(dSlot);
      slotsContainer.appendChild(hgSlot);
      cell.appendChild(dayLabel);
      cell.appendChild(slotsContainer);
      this.gridFloat.appendChild(cell);

      this.cells.set(d, { el: cell, dSlot, dEmp, hgSlot, hgEmp });
      this.nodes.set(d, {
        x: 0, y: 0, w: 0, h: 0,
        energy: 0.4 + Math.random() * 0.3,
        crystal: 0,
        color: PHASE_RGB.init,
        seed: Math.random() * 1000,
      });
    }

    this.positionsDirty = true;
    this.resizeBgCanvas();
    this.seedFlow();
  }

  seedFlow() {
    this.flow = [];
    const n = 60;
    for (let i = 0; i < n; i++) {
      this.flow.push({
        x: Math.random(),
        y: Math.random(),
        a: 0.1 + Math.random() * 0.3,
        sp: 0.4 + Math.random() * 1.2,
        seed: Math.random() * 1000,
      });
    }
  }

  computeNodePositions() {
    if (!this.wrapper) return;
    const wrapRect = this.wrapper.getBoundingClientRect();
    if (wrapRect.width === 0) return;
    for (const [d, node] of this.nodes.entries()) {
      const cellData = this.cells.get(d);
      if (!cellData) continue;
      const r = cellData.el.getBoundingClientRect();
      node.x = r.left - wrapRect.left + r.width / 2;
      node.y = r.top - wrapRect.top + r.height / 2;
      node.w = r.width;
      node.h = r.height;
    }
    this.positionsDirty = false;
  }

  latticeNeighbors(d) {
    const i = d - 1;
    const col = i % COLS;
    const out = [];
    if (col > 0 && this.nodes.has(d - 1)) out.push(d - 1);
    if (col < COLS - 1 && this.nodes.has(d + 1)) out.push(d + 1);
    if (this.nodes.has(d - COLS)) out.push(d - COLS);
    if (this.nodes.has(d + COLS)) out.push(d + COLS);
    return out;
  }

  // --- HUD --------------------------------------------------------------

  attachMiniMap(container) {
    container.innerHTML = '';
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.style.width = '100%';
    this.hudCanvas.style.height = '100%';
    this.hudCanvas.style.display = 'block';
    container.appendChild(this.hudCanvas);
    this.hudCtx = this.hudCanvas.getContext('2d', { alpha: false });

    if (this.resizeObserver) {
      this.resizeObserver.observe(container);
    }
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

  phaseColorArr() {
    return PHASE_RGB[this.phase] || PHASE_RGB.init;
  }

  getPhaseColor(alpha = 1) {
    const [r, g, b] = this.phaseColorArr();
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  dutyColorArr(dutyType) {
    return dutyType === 'HG' ? [14, 165, 233] : [239, 68, 68];
  }

  getAbbreviation(empId) {
    if (!empId) return '';
    const stripped = String(empId)
      .replace(/^(Herr|Frau|Hr\.|Fr\.|Dr\.\s*(med\.\s*)?|Prof\.\s*(Dr\.\s*(med\.\s*)?|med\.\s*)?|PD\s+Dr\.\s*(med\.\s*)?|Dipl\.\s*\w+\.\s*)/gi, '')
      .trim();
    const parts = stripped.split(/\s+/);
    if (parts.length <= 1) {
      return stripped.replace(/\s/g, '').substring(0, 3).toUpperCase();
    }
    const surnamePrefixes = ['el', 'al', 'van', 'von', 'de', 'le', 'la', 'di', 'lo', 'del', 'dal', 'bin', 'ben', 'abu'];
    if (surnamePrefixes.includes(parts[0].toLowerCase())) {
      return parts.join('').substring(0, 3).toUpperCase();
    }
    return parts[parts.length - 1].substring(0, 3).toUpperCase();
  }

  // --- Effekt-Auslöser (dezentral, an der eigenen Zelle) ----------------

  igniteCell(dayIdx, color, strength) {
    const node = this.nodes.get(dayIdx);
    if (!node) return;
    node.energy = Math.min(1.6, node.energy + strength);
    node.color = color;
  }

  crystallizeCell(dayIdx, color) {
    const node = this.nodes.get(dayIdx);
    if (!node) return;
    node.crystal = 1;
    node.color = color;
  }

  // Constraint-Welle: zündet die Zelle und schickt Energie zu den
  // Gitternachbarn (Folgetag etc.). Keine Konvergenz zu einem Zentrum.
  propagateConstraint(dayIdx, color, intense) {
    this.igniteCell(dayIdx, color, intense ? 1.1 : 0.7);
    const neighbors = this.latticeNeighbors(dayIdx);
    for (const nb of neighbors) {
      this.edgePulses.push({
        from: dayIdx, to: nb, progress: 0,
        speed: 0.05 + Math.random() * 0.04,
        color,
      });
    }
  }

  // --- DOM Slot-Pulse (API-kompatibel) ----------------------------------

  pulseCell(dayIdx, empId, isActive, isError = false, dutyType = 'D') {
    const cellData = this.cells.get(dayIdx);
    if (!cellData) return;

    const { el, dSlot, dEmp, hgSlot, hgEmp } = cellData;
    const targetSlot = dutyType === 'HG' ? hgSlot : dSlot;
    const targetEmp = dutyType === 'HG' ? hgEmp : dEmp;

    if (empId && empId !== 'SWAP') {
      targetEmp.textContent = this.getAbbreviation(empId);
      targetSlot.classList.add('has-val');
    } else if (empId === 'SWAP') {
      targetEmp.textContent = 'SWP';
      targetSlot.classList.add('has-val');
    }

    if (isActive) {
      const colorArr = isError ? PHASE_RGB.error : this.dutyColorArr(dutyType);
      const borderColor = `rgba(${colorArr[0]}, ${colorArr[1]}, ${colorArr[2]}, 0.9)`;

      el.classList.remove('rest');
      el.classList.add(isError ? 'error' : 'pulse');
      el.style.setProperty('--pulse-color', borderColor);
      targetSlot.classList.add('is-pulsing');
      targetSlot.style.setProperty('--pulse-color', borderColor);
      targetSlot.classList.add(dutyType === 'HG' ? 'active-hg' : 'active-d');
      targetEmp.style.color = '#fff';

      if (isError) {
        this.igniteCell(dayIdx, colorArr, 1.4);
        this.spawnGlitch(dayIdx);
      } else {
        this.propagateConstraint(dayIdx, colorArr, true);
      }
    } else {
      el.classList.remove('pulse', 'error');
      el.classList.add('rest');
      targetSlot.classList.remove('is-pulsing', 'active-hg', 'active-d');

      const hasVal = targetSlot.classList.contains('has-val');
      if (dutyType === 'HG') {
        targetEmp.style.color = hasVal ? '#0EA5E9' : 'transparent';
      } else {
        targetEmp.style.color = hasVal ? '#EF4444' : 'transparent';
      }

      if (hasVal) {
        el.classList.add('crystal');
        el.style.setProperty('--crystal-color', dutyType === 'HG' ? 'rgba(14,165,233,0.5)' : 'rgba(239,68,68,0.5)');
        this.crystallizeCell(dayIdx, this.dutyColorArr(dutyType));
      }

      if (empId === 'SWAP') {
        targetEmp.textContent = '';
        targetSlot.classList.remove('has-val');
      }
    }
  }

  spawnGlitch(dayIdx) {
    const node = this.nodes.get(dayIdx);
    this.glitches.push({ y: node ? node.y : (this.bgH || 200) * Math.random(), life: 1 });
  }

  fireMiniMapPulse(isError = false) {
    // HUD-Spike: Balken springen, Optimierungs-Kurve fällt ein Stück.
    const spikes = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < spikes; s++) {
      const idx = Math.floor(Math.random() * this.bars.length);
      if (idx >= 0 && idx < this.bars.length) {
        this.bars[idx] = Math.min(1, this.bars[idx] + (isError ? 1 : 0.6 + Math.random() * 0.4));
      }
    }
    if (!isError) {
      // Aktivität = Fortschritt: Kosten sinken (mit etwas Rauschen).
      this.cost = Math.max(0.04, this.cost - (0.015 + Math.random() * 0.02));
    } else {
      this.cost = Math.min(1, this.cost + 0.04);
    }
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId, dutyType = 'D') {
    this.pulseCell(dayIdx, 'SWAP', true, false, dutyType);
    this.fireMiniMapPulse();
    setTimeout(() => {
      if (this.phase !== 'success') this.pulseCell(dayIdx, newEmpId, false, false, dutyType);
    }, 420);
  }

  triggerAssignment(dayIdx, empId, dutyType = 'D') {
    this.pulseCell(dayIdx, empId, true, false, dutyType);
    this.fireMiniMapPulse();
    setTimeout(() => {
      if (this.phase !== 'success') this.pulseCell(dayIdx, empId, false, false, dutyType);
    }, 420);
  }

  triggerError(dayIdx, empId, dutyType = 'D') {
    if (this.phase !== 'error') this.basePhase = this.phase;
    this.phase = 'error';
    this.pulseCell(dayIdx, empId, true, true, dutyType);
    this.fireMiniMapPulse(true);
    setTimeout(() => {
      if (this.phase === 'error') this.phase = this.basePhase || 'init';
      this.pulseCell(dayIdx, empId, false, false, dutyType);
    }, 340);
  }

  setPhase(phase) {
    this.phase = phase;
    if (phase !== 'error') this.basePhase = phase;
    if (PHASE_TEMP[phase] !== undefined) this.tempTarget = PHASE_TEMP[phase];
  }

  triggerSuccess(finalAssignments) {
    this.setPhase('success');
    this.tempTarget = 0.04;

    if (finalAssignments) {
      for (const [emp, days] of Object.entries(finalAssignments)) {
        for (const [dayStr, data] of Object.entries(days)) {
          const dayIdx = parseInt(dayStr, 10);
          const cellData = this.cells.get(dayIdx);
          if (cellData && data.duty) {
            if (data.duty === 'D') {
              cellData.dEmp.textContent = this.getAbbreviation(emp);
              cellData.dSlot.classList.add('has-val');
              cellData.dEmp.style.color = '#EF4444';
            }
            if (data.duty === 'HG') {
              cellData.hgEmp.textContent = this.getAbbreviation(emp);
              cellData.hgSlot.classList.add('has-val');
              cellData.hgEmp.style.color = '#0EA5E9';
            }
          }
        }
      }
    }

    // Dezentrale Kühlwelle: Reihe für Reihe kristallisiert das ganze Feld.
    let delay = 0;
    const ordered = [...this.cells.keys()].sort((a, b) => a - b);
    for (const dayIdx of ordered) {
      const cellData = this.cells.get(dayIdx);
      const hasVal = cellData.dSlot.classList.contains('has-val') || cellData.hgSlot.classList.contains('has-val');
      setTimeout(() => {
        cellData.el.classList.remove('rest', 'error');
        cellData.el.classList.add('pulse');
        cellData.el.style.setProperty('--pulse-color', this.getPhaseColor(0.9));
        this.igniteCell(dayIdx, PHASE_RGB.success, 1.2);
        if (hasVal) this.crystallizeCell(dayIdx, PHASE_RGB.success);
      }, delay);
      setTimeout(() => {
        cellData.el.classList.remove('pulse');
        cellData.el.classList.add('rest');
      }, delay + 640);
      delay += 14;
    }

    this.cost = 0.04;
    for (let p = 0; p < 18; p++) setTimeout(() => this.fireMiniMapPulse(), p * 40);
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.renderField();
      this.renderHud();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  // --- Hauptfeld (dezentral, ohne Zentrum) ------------------------------

  renderField() {
    const ctx = this.bgCtx;
    if (!ctx || !this.bgW || !this.bgH) return;
    if (this.positionsDirty) this.computeNodePositions();

    const w = this.bgW;
    const h = this.bgH;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();

    // Temperatur sanft auf den Phasen-Zielwert ziehen.
    this.temp += (this.tempTarget - this.temp) * 0.03;
    const temp = this.temp;

    ctx.clearRect(0, 0, w, h);

    // Ambiente Strömung (über das ganze Feld, kein Konvergenzpunkt)
    for (const f of this.flow) {
      // Curl-artiges Strömungsfeld aus überlagerten Sinus.
      const ang = Math.sin(f.y * 6 + time * 0.5 + f.seed) + Math.cos(f.x * 5 - time * 0.4);
      f.x += Math.cos(ang) * 0.0006 * f.sp;
      f.y += Math.sin(ang) * 0.0006 * f.sp;
      if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0;
      if (f.y < 0) f.y = 1; if (f.y > 1) f.y = 0;
      const flick = 0.5 + 0.5 * Math.sin(time * 3 + f.seed);
      ctx.beginPath();
      ctx.arc(f.x * w, f.y * h, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${f.a * (0.3 + 0.7 * flick) * (0.4 + temp)})`;
      ctx.fill();
    }

    // Gitter-Traces zwischen benachbarten Tagen (dezentrales Lattice)
    ctx.lineWidth = 1;
    for (const [d, node] of this.nodes.entries()) {
      if (!node.x) continue;
      const right = this.nodes.get(d + 1);
      const sameRow = (d % COLS) !== 0;
      if (right && sameRow && right.x) {
        const e = (node.energy + right.energy) * 0.5;
        ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.04 + e * 0.12})`;
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(right.x, right.y); ctx.stroke();
      }
      const down = this.nodes.get(d + COLS);
      if (down && down.x) {
        const e = (node.energy + down.energy) * 0.5;
        ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.04 + e * 0.12})`;
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(down.x, down.y); ctx.stroke();
      }
    }

    // Optimierungs-Scan: schnelle vertikale Welle quer über das ganze Feld.
    this.scanPos = (this.scanPos + 0.008 + 0.01 * (1 - temp)) % 1.3;
    const scanX = (this.scanPos - 0.15) * w;
    const scanGrad = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
    scanGrad.addColorStop(0, 'rgba(0,0,0,0)');
    scanGrad.addColorStop(0.5, `rgba(${pr}, ${pg}, ${pb}, ${0.10 + 0.12 * (1 - temp)})`);
    scanGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(scanX - 60, 0, 120, h);

    // Constraint-Wellen entlang der Gitterkanten
    for (let i = this.edgePulses.length - 1; i >= 0; i--) {
      const p = this.edgePulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) { this.edgePulses.splice(i, 1); continue; }
      const a = this.nodes.get(p.from);
      const b = this.nodes.get(p.to);
      if (!a || !b || !a.x || !b.x) { this.edgePulses.splice(i, 1); continue; }
      const t = p.progress;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const [cr, cg, cb] = p.color;
      // Ziel-Knoten lädt sich beim Eintreffen auf (Fortpflanzung)
      if (t > 0.92) this.igniteCell(p.to, p.color, 0.05);
      ctx.beginPath();
      ctx.arc(x, y, 2.4 * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${1 - t})`;
      ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.9)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tag-Knoten: thermisches Flackern (heiß) -> Kristall (kalt)
    const scanWorldX = scanX;
    for (const [, node] of this.nodes.entries()) {
      if (!node.x) continue;
      node.energy *= 0.95;
      node.crystal *= 0.992;

      // Scan-Resonanz: nahe der Scanlinie kurz aufleuchten
      const scanBoost = Math.max(0, 1 - Math.abs(node.x - scanWorldX) / 50) * (1 - temp) * 0.5;

      const flicker = temp * (0.5 + 0.5 * Math.sin(time * (6 + node.seed % 4) + node.seed));
      const jitterX = (Math.sin(time * 9 + node.seed) * 0.5) * temp * 3;
      const jitterY = (Math.cos(time * 8 + node.seed * 1.3) * 0.5) * temp * 3;
      const px = node.x + jitterX;
      const py = node.y + jitterY;

      const level = Math.min(1.4, node.energy + node.crystal * 0.6 + flicker * 0.3 + scanBoost);
      const [r, g, b] = node.color;

      if (level > 0.05) {
        const glowR = 4 + level * 14;
        const halo = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(0.6, 0.25 + level * 0.4)})`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Kern: kristalline Raute, wenn kalt/zugewiesen; sonst weicher Punkt
      if (node.crystal > 0.15) {
        const s = 3 + node.crystal * 2.5;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.PI / 4 + time * 0.2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + 0.3 * node.crystal})`;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
        ctx.shadowBlur = 10;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + level * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + 0.5 * Math.min(1, level)})`;
        ctx.fill();
      }
    }

    // Error-Scanline-Tears
    for (let i = this.glitches.length - 1; i >= 0; i--) {
      const gl = this.glitches[i];
      gl.life *= 0.85;
      if (gl.life < 0.05) { this.glitches.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(239, 68, 68, ${gl.life * 0.5})`;
      const gy = gl.y + (Math.random() - 0.5) * 6;
      ctx.fillRect(0, gy, w, 2);
    }
  }

  // --- HUD oben rechts: schnell, digital ---------------------------------

  renderHud() {
    const ctx = this.hudCtx;
    if (!ctx || !this.hudCanvas.parentElement) return;
    const parent = this.hudCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();

    // Hintergrund + feines Scanline-Raster (digitales Display)
    ctx.fillStyle = '#03070F';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

    // Optimierungs-Kurve (Energie/Kosten sinkt) – schnell scrollend
    this.cost += (0.04 - this.cost) * 0.002; // langsame Grunddrift nach unten
    this.costHistory.push(this.cost + (Math.random() - 0.5) * 0.05);
    const maxPts = Math.max(20, Math.floor(w));
    if (this.costHistory.length > maxPts) this.costHistory.shift();

    const graphH = h * 0.52;
    ctx.beginPath();
    for (let i = 0; i < this.costHistory.length; i++) {
      const x = (i / (maxPts - 1)) * w;
      const v = Math.max(0, Math.min(1, this.costHistory[i]));
      const y = 4 + (1 - v) * (graphH - 8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.getPhaseColor(0.9);
    ctx.lineWidth = 1.4;
    ctx.shadowColor = this.getPhaseColor(0.8);
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Spektrum-Balken (Equalizer) – schnelle Reaktion + Decay
    const baseY = h - 4;
    const bw = w / this.bars.length;
    for (let i = 0; i < this.bars.length; i++) {
      // ambientes schnelles Rauschen + Decay
      const noise = Math.abs(Math.sin(time * 12 + i * 0.7)) * 0.18 * (0.4 + this.temp);
      this.bars[i] = Math.max(noise, this.bars[i] * 0.86);
      const bh = this.bars[i] * (h * 0.34);
      const x = i * bw;
      const alpha = 0.35 + this.bars[i] * 0.65;
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;
      ctx.fillRect(x + 0.5, baseY - bh, Math.max(1, bw - 1.2), bh);
    }

    // Scrollender Hex/Binär-Ticker (digital)
    if (Math.floor(time * 22) !== this._hexTick) {
      this._hexTick = Math.floor(time * 22);
      const ch = '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
      this.hexStream = (this.hexStream + ch).slice(-Math.max(8, Math.floor(w / 7)));
    }
    ctx.font = '9px var(--font-mono, monospace)';
    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, 0.55)`;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.hexStream, 3, graphH + 7);

    // Digitaler Readout (ΔE) – blinkt
    const blink = (Math.sin(time * 8) > -0.3) ? 1 : 0.3;
    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.85 * blink})`;
    ctx.font = 'bold 9px var(--font-mono, monospace)';
    ctx.textBaseline = 'top';
    const e = Math.round(this.cost * 9999).toString(16).toUpperCase().padStart(4, '0');
    ctx.fillText(`ΔE·${e}`, 3, 2);

    // Rahmenglühen
    ctx.strokeStyle = this.getPhaseColor(0.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  dispose() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.container) this.container.innerHTML = '';
    if (this.hudCanvas && this.hudCanvas.parentElement) this.hudCanvas.parentElement.innerHTML = '';
    this.cells.clear();
    this.nodes.clear();
    this.edgePulses = [];
    this.flow = [];
    this.glitches = [];
    this.bars = [];
    this.costHistory = [];
  }
}
