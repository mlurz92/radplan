const STYLE_ID = 'radplan-neural-graph-styles';

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
      background: radial-gradient(circle at 50% 50%, #060b19 0%, #02040a 100%);
      background-image: 
        radial-gradient(circle at 50% 50%, rgba(6, 11, 25, 0.45) 0%, rgba(2, 4, 10, 0.96) 100%),
        linear-gradient(rgba(18, 30, 60, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(18, 30, 60, 0.04) 1px, transparent 1px);
      background-size: 100% 100%, 24px 24px, 24px 24px;
      padding: 22px;
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
      will-change: transform;
      transform-style: preserve-3d;
    }
    .ng-flat-cell {
      position: relative;
      border-radius: 10px;
      background: rgba(8, 17, 36, 0.45);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.35), 
        inset 0 1px 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      will-change: transform, background-color, border-color, box-shadow;
      transform-style: preserve-3d;
      transition: 
        background-color 0.3s ease, 
        border-color 0.3s ease, 
        box-shadow 0.3s ease;
      backface-visibility: hidden;
    }
    .ng-flat-cell.pulse {
      background: rgba(14, 25, 52, 0.85);
      border-color: var(--pulse-color, rgba(56, 189, 248, 0.5));
      box-shadow: 
        0 22px 45px rgba(0, 0, 0, 0.6), 
        0 0 24px var(--pulse-color, transparent);
    }
    .ng-flat-cell.error {
      background: rgba(127, 29, 29, 0.6);
      border-color: #ef4444;
      box-shadow: 
        0 18px 40px rgba(239, 68, 68, 0.45), 
        0 0 20px rgba(239, 68, 68, 0.35);
    }
    .ng-day-number {
      position: absolute;
      top: 6px;
      left: 8px;
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.25);
      pointer-events: none;
      z-index: 5;
      text-shadow: 0 0 4px rgba(255, 255, 255, 0.1);
    }
    .ng-slots-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 5px;
      gap: 5px;
      margin-top: 18px;
    }
    .ng-slot {
      flex: 1;
      position: relative;
      background: rgba(2, 6, 18, 0.45);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
      color: rgba(255, 255, 255, 0.15);
      letter-spacing: 0.05em;
      pointer-events: none;
    }
    .ng-slot.active-d {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.25);
      box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.1);
    }
    .ng-slot.active-hg {
      background: rgba(14, 165, 233, 0.08);
      border-color: rgba(14, 165, 233, 0.25);
      box-shadow: inset 0 0 10px rgba(14, 165, 233, 0.1);
    }
    .ng-slot-emp {
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 800;
      color: transparent;
      text-align: center;
      letter-spacing: 0.02em;
      transition: all 0.3s;
      transform: translateZ(5px);
    }
    .ng-slot.has-val .ng-slot-emp {
      color: #fff;
      text-shadow: 0 0 8px currentColor;
    }
    .ng-slot.is-pulsing {
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 12px var(--pulse-color);
      border-color: var(--pulse-color);
    }
    
    /* Cell matrix code rain canvas */
    .ng-cell-matrix-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      pointer-events: none;
      opacity: 0;
      mix-blend-mode: screen;
      transition: opacity 0.8s ease-in-out;
    }
    
    /* 3D Laser Sweep Line */
    .ng-laser-line {
      position: absolute;
      left: -2%;
      width: 104%;
      height: 2px;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(56, 189, 248, 0.4) 15%, 
        #38bdf8 50%, 
        #fff 53%, 
        #38bdf8 56%, 
        rgba(56, 189, 248, 0.4) 85%, 
        transparent
      );
      box-shadow: 
        0 0 15px rgba(56, 189, 248, 0.7), 
        0 0 5px rgba(56, 189, 248, 0.4);
      pointer-events: none;
      z-index: 100;
      opacity: 0.85;
      transform: translateZ(25px);
      animation: ngLaserSweep 5s ease-in-out infinite;
    }
    @keyframes ngLaserSweep {
      0% { top: 0%; opacity: 0.2; }
      5% { opacity: 0.85; }
      95% { opacity: 0.85; }
      100% { top: 100%; opacity: 0.2; }
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

const charSet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&*+-/|";

// 4D hypercube (tesseract) vertices
const TESSERACT_VERTICES = [];
for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    for (const z of [-1, 1]) {
      for (const w of [-1, 1]) {
        TESSERACT_VERTICES.push([x, y, z, w]);
      }
    }
  }
}

// 4D hypercube edges
const TESSERACT_EDGES = [];
for (let i = 0; i < 16; i++) {
  for (let j = i + 1; j < 16; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) {
      if (TESSERACT_VERTICES[i][k] !== TESSERACT_VERTICES[j][k]) {
        diff++;
      }
    }
    if (diff === 1) {
      TESSERACT_EDGES.push([i, j]);
    }
  }
}

// 4D Rotation Plane math
function rotate4D(pt, thetaXY, thetaXZ, thetaXW, thetaYZ, thetaYW, thetaZW) {
  let [x, y, z, w] = pt;

  // XY plane rotation
  let c = Math.cos(thetaXY), s = Math.sin(thetaXY);
  let tmp = x * c - y * s;
  y = x * s + y * c;
  x = tmp;

  // XZ plane rotation
  c = Math.cos(thetaXZ); s = Math.sin(thetaXZ);
  tmp = x * c - z * s;
  z = x * s + z * c;
  x = tmp;

  // XW plane rotation
  c = Math.cos(thetaXW); s = Math.sin(thetaXW);
  tmp = x * c - w * s;
  w = x * s + w * c;
  x = tmp;

  // YZ plane rotation
  c = Math.cos(thetaYZ); s = Math.sin(thetaYZ);
  tmp = y * c - z * s;
  z = y * s + z * c;
  y = tmp;

  // YW plane rotation
  c = Math.cos(thetaYW); s = Math.sin(thetaYW);
  tmp = y * c - w * s;
  w = y * s + w * c;
  y = tmp;

  // ZW plane rotation
  c = Math.cos(thetaZW); s = Math.sin(thetaZW);
  tmp = z * c - w * s;
  w = z * s + w * c;
  z = tmp;

  return [x, y, z, w];
}

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.cells = new Map();
    this.nodeFx = new Map();
    this.employees = [];
    this.daysCount = 0;
    this.phase = 'init';
    this.basePhase = 'init';

    // UI elements
    this.miniMapCanvas = null;
    this.miniMapCtx = null;
    this.bgCanvas = null;
    this.bgCtx = null;

    // Simulation states
    this.pulses = [];          // mini-map radial shockwaves
    this.synapsePulses = [];   // flowing packets
    this.bursts = [];          // glowing expanding rings
    this.sparks = [];          // ambient gravitationally pulled particles
    this.lightnings = [];      // error lightning electric arcs
    this.spiralBeams = [];     // swap/assignment double helices
    this.gridRipples = [];     // 3D grid elevation waves
    
    this.lastActiveDay = null; // source for flows

    // 3D HUD states
    this.hudRotX = 0;
    this.hudRotY = 0;
    this.hudRotZ = 0;
    this.hudRotSpeed = 0.015;
    this.hudSpectrumSurge = 0;
    this.glitchActive = false;
    this.telemetryQueue = [
      '> SYS INIT',
      '> COR MATRIX ONLINE',
      '> SCHED CONSTRAINTS LD'
    ];

    // Constellation setup
    this.constellationParticles = [];
    this.seedConstellation();

    this.animId = null;
    this.resizeObserver = null;
    this.gridFloat = null;
    this.positionsDirty = true;
    this.t0 = performance.now();

    this.frameCount = 0;
    this.lastBD = '0';
    this.lastHG = '0';
    this.lastRules = '0';
    this.lastSwaps = '0';
    this.lastPct = '0%';
    this.lastPhase = 'init';

    // Animations timestamps
    this.entranceStartTime = performance.now();
    this.successStartTime = null;
    this.errorFlashActive = false;
    this.errorFlashTime = 0;

    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
  }

  seedConstellation() {
    this.constellationParticles = [];
    const numParticles = 65;
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() - 0.5) * 2);
      const dist = 50 + Math.random() * 160;
      this.constellationParticles.push({
        x: dist * Math.sin(phi) * Math.cos(theta),
        y: dist * Math.sin(phi) * Math.sin(theta),
        z: dist * Math.cos(phi),
        baseSize: 0.8 + Math.random() * 1.5
      });
    }
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
    
    // Add 3D laser sweep line
    this.laserLine = document.createElement('div');
    this.laserLine.className = 'ng-laser-line';
    this.gridFloat.appendChild(this.laserLine);

    this.wrapper.appendChild(this.bgCanvas);
    this.wrapper.appendChild(this.gridFloat);
    this.container.appendChild(this.wrapper);

    this.startLoop();
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeMiniMap();
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
    
    // Put back the laser sweep line
    this.laserLine = document.createElement('div');
    this.laserLine.className = 'ng-laser-line';
    this.gridFloat.appendChild(this.laserLine);

    this.cells.clear();
    this.nodeFx.clear();

    const cols = 7;
    const rows = Math.ceil(daysCount / cols);
    this.gridFloat.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.gridFloat.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    this.gridFloat.style.gap = `8px`;

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

      this.cells.set(d, { 
        el: cell, 
        dSlot, 
        dEmp, 
        hgSlot, 
        hgEmp,
        currZ: 0,
        currScale: 1.0,
        currRotY: 0
      });
      this.nodeFx.set(d, { glow: 0, color: [56, 189, 248], x: 0, y: 0, seed: Math.random() * 1000 });
    }

    // Set timestamps for entrance flight animation
    this.entranceStartTime = performance.now();
    this.successStartTime = null;

    this.positionsDirty = true;
    this.resizeBgCanvas();
    this.seedSparks();
  }

  seedSparks() {
    this.sparks = [];
    const n = 65; // High particle density
    for (let i = 0; i < n; i++) {
      this.sparks.push(this.createSpark(true));
    }
  }

  createSpark(randomDist = false) {
    const w = this.bgW || 800;
    const h = this.bgH || 600;
    const cx = this.coreX || w / 2;
    const cy = this.coreY || h / 2;
    
    let x, y;
    if (randomDist) {
      x = Math.random() * w;
      y = Math.random() * h;
    } else {
      // Spawn at the outer boundaries of the canvas
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(w, h) * (0.65 + Math.random() * 0.35);
      x = cx + Math.cos(angle) * dist;
      y = cy + Math.sin(angle) * dist;
    }
    
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 0.6 + Math.random() * 1.6,
      a: 0.15 + Math.random() * 0.5,
    };
  }

  computeNodePositions() {
    if (!this.wrapper || !this.gridFloat) return;
    const wrapRect = this.wrapper.getBoundingClientRect();
    const gridRect = this.gridFloat.getBoundingClientRect();
    if (wrapRect.width === 0 || gridRect.width === 0) return;

    const offsetX = gridRect.left - wrapRect.left;
    const offsetY = gridRect.top - wrapRect.top;

    for (const [d, fx] of this.nodeFx.entries()) {
      const cellData = this.cells.get(d);
      if (!cellData) continue;
      const el = cellData.el;
      fx.x = offsetX + el.offsetLeft + el.offsetWidth / 2;
      fx.y = offsetY + el.offsetTop + el.offsetHeight / 2;
    }
    this.coreX = this.bgW ? this.bgW / 2 : wrapRect.width / 2;
    this.coreY = this.bgH ? this.bgH / 2 : wrapRect.height / 2;
    this.positionsDirty = false;
  }

  attachMiniMap(container) {
    container.innerHTML = '';
    this.miniMapCanvas = document.createElement('canvas');
    this.miniMapCanvas.style.width = '100%';
    this.miniMapCanvas.style.height = '100%';
    this.miniMapCanvas.style.display = 'block';
    container.appendChild(this.miniMapCanvas);
    this.miniMapCtx = this.miniMapCanvas.getContext('2d', { alpha: false });

    if (this.resizeObserver) {
      this.resizeObserver.observe(container);
    }

    this.resizeMiniMap();
  }

  resizeMiniMap() {
    if (!this.miniMapCanvas || !this.miniMapCanvas.parentElement) return;
    const parent = this.miniMapCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.miniMapCanvas.width = w * dpr;
    this.miniMapCanvas.height = h * dpr;
    this.miniMapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

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
    const firstPartLower = parts[0].toLowerCase();
    if (surnamePrefixes.includes(firstPartLower)) {
      return parts.join('').substring(0, 3).toUpperCase();
    }
    const surname = parts[parts.length - 1];
    return surname.substring(0, 3).toUpperCase();
  }

  // --- Particle Systems & Shockwaves ----------------------------------------

  spawnSynapsePulse(dayIdx, color, intense) {
    this.synapsePulses.push({
      day: dayIdx,
      progress: 0,
      speed: 0.015 + Math.random() * 0.015,
      color,
      width: intense ? 2.8 : 1.5,
      inbound: true,
    });
  }

  spawnBurst(x, y, color, maxR) {
    this.bursts.push({ x, y, r: 4, maxR, color, life: 1 });
  }

  igniteNode(dayIdx, color, strength = 1) {
    const fx = this.nodeFx.get(dayIdx);
    if (!fx) return;
    fx.glow = Math.min(1.5, fx.glow + strength);
    fx.color = color;
  }

  // --- Lightning Generator (Recursive Midpoint Displacement) ----------------

  generateLightningPoints(x1, y1, x2, y2) {
    const points = [];
    const maxDepth = 6; 
    
    const generate = (xa, ya, xb, yb, disp, depth) => {
      if (depth >= maxDepth) {
        points.push({ x: xa, y: ya });
      } else {
        const dx = xb - xa;
        const dy = yb - ya;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          points.push({ x: xa, y: ya });
          return;
        }
        const midX = (xa + xb) / 2;
        const midY = (ya + yb) / 2;
        // Perpendicular vector
        const nx = -dy / dist;
        const ny = dx / dist;
        const offset = (Math.random() - 0.5) * disp;
        const mx = midX + nx * offset;
        const my = midY + ny * offset;
        
        generate(xa, ya, mx, my, disp * 0.5, depth + 1);
        generate(mx, my, xb, yb, disp * 0.5, depth + 1);
      }
    };
    
    generate(x1, y1, x2, y2, 28, 0);
    points.push({ x: x2, y: y2 });
    return points;
  }

  generateBranches(dayIdx, tx, ty) {
    const branches = [];
    const neighbors = [dayIdx - 1, dayIdx + 1, dayIdx - 7, dayIdx + 7];
    for (const n of neighbors) {
      if (this.nodeFx.has(n) && Math.random() < 0.5) {
        const nFx = this.nodeFx.get(n);
        if (nFx && nFx.x) {
          branches.push(this.generateLightningPoints(tx, ty, nFx.x, nFx.y));
        }
      }
    }
    return branches;
  }

  // --- Highlight & State Pulsing (DOM, API-compatible) ----------------------

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
      const borderColor = `rgba(${colorArr[0]}, ${colorArr[1]}, ${colorArr[2]}, 0.95)`;

      el.classList.add(isError ? 'error' : 'pulse');
      el.style.setProperty('--pulse-color', borderColor);
      targetSlot.classList.add('is-pulsing');
      targetSlot.style.setProperty('--pulse-color', borderColor);

      if (dutyType === 'HG') {
        targetSlot.classList.add('active-hg');
      } else {
        targetSlot.classList.add('active-d');
      }
      targetEmp.style.color = '#fff';

      // Ignite background constellation node
      const fx = this.nodeFx.get(dayIdx);
      this.igniteNode(dayIdx, colorArr, isError ? 1.5 : 1.0);
      if (fx && fx.x) {
        this.spawnBurst(fx.x, fx.y, colorArr, isError ? 65 : 42);
        if (!isError) {
          this.spawnSynapsePulse(dayIdx, colorArr, true);
        }
      }
    } else {
      el.classList.remove('pulse', 'error');
      targetSlot.classList.remove('is-pulsing', 'active-hg', 'active-d');

      if (dutyType === 'HG') {
        targetEmp.style.color = targetSlot.classList.contains('has-val') ? '#0EA5E9' : 'transparent';
      } else {
        targetEmp.style.color = targetSlot.classList.contains('has-val') ? '#EF4444' : 'transparent';
      }

      if (empId === 'SWAP') {
        targetEmp.textContent = '';
        targetSlot.classList.remove('has-val');
      }
    }
  }

  fireMiniMapPulse(isError = false) {
    const [r, g, b] = isError ? PHASE_RGB.error : this.phaseColorArr();
    this.pulses.push({
      progress: 0,
      color: `rgba(${r}, ${g}, ${b}, 1)`,
      speed: 0.045 + Math.random() * 0.04,
      angle: Math.random() * Math.PI * 2,
      isError,
    });
  }

  // --- API Methods ----------------------------------------------------------

  triggerSwap(dayIdx, oldEmpId, newEmpId, dutyType = 'D') {
    if (this.positionsDirty) this.computeNodePositions();
    
    // Spawns a spiral double helix from last active cell center
    const fx = this.nodeFx.get(dayIdx);
    if (fx && fx.x) {
      const sourceFx = this.lastActiveDay ? this.nodeFx.get(this.lastActiveDay) : null;
      const startX = (sourceFx && sourceFx.x) ? sourceFx.x : this.coreX || 300;
      const startY = (sourceFx && sourceFx.y) ? sourceFx.y : this.coreY || 200;
      
      this.spiralBeams.push({
        startX,
        startY,
        endX: fx.x,
        endY: fx.y,
        targetDay: dayIdx,
        progress: 0,
        speed: 0.042,
        color: this.dutyColorArr(dutyType),
        exploded: false
      });
      
      // Spawn ripple from swap origin
      const col = (dayIdx - 1) % 7;
      const row = Math.floor((dayIdx - 1) / 7);
      this.gridRipples.push({
        col,
        row,
        startTime: performance.now(),
        amplitude: 50,
        speed: 10,
        width: 1.8,
        duration: 1.2
      });

      this.lastActiveDay = dayIdx;
    }

    this.pulseCell(dayIdx, 'SWAP', true, false, dutyType);
    this.fireMiniMapPulse();
    
    // Surge diagnostics HUD speed & spectrum
    this.hudRotSpeed = Math.min(0.2, this.hudRotSpeed + 0.08);
    this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.4);

    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, newEmpId, false, false, dutyType);
      }
    }, 450);
  }

  triggerAssignment(dayIdx, empId, dutyType = 'D') {
    if (this.positionsDirty) this.computeNodePositions();

    // Spawns a spiral double helix from last active cell center
    const fx = this.nodeFx.get(dayIdx);
    if (fx && fx.x) {
      const sourceFx = this.lastActiveDay ? this.nodeFx.get(this.lastActiveDay) : null;
      const startX = (sourceFx && sourceFx.x) ? sourceFx.x : this.coreX || 300;
      const startY = (sourceFx && sourceFx.y) ? sourceFx.y : this.coreY || 200;

      this.spiralBeams.push({
        startX,
        startY,
        endX: fx.x,
        endY: fx.y,
        targetDay: dayIdx,
        progress: 0,
        speed: 0.045,
        color: this.dutyColorArr(dutyType),
        exploded: false
      });

      // Spawn ripple from assignment origin
      const col = (dayIdx - 1) % 7;
      const row = Math.floor((dayIdx - 1) / 7);
      this.gridRipples.push({
        col,
        row,
        startTime: performance.now(),
        amplitude: 45,
        speed: 10,
        width: 1.8,
        duration: 1.2
      });

      this.lastActiveDay = dayIdx;
    }

    this.pulseCell(dayIdx, empId, true, false, dutyType);
    this.fireMiniMapPulse();

    // Surge diagnostics HUD speed & spectrum
    this.hudRotSpeed = Math.min(0.18, this.hudRotSpeed + 0.06);
    this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.35);

    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, empId, false, false, dutyType);
      }
    }, 450);
  }

  triggerError(dayIdx, empId, dutyType = 'D') {
    if (this.positionsDirty) this.computeNodePositions();

    if (this.phase !== 'error') {
      this.basePhase = this.phase;
    }
    this.phase = 'error';

    const fx = this.nodeFx.get(dayIdx);
    if (fx && fx.x) {
      const startX = this.coreX || 300;
      const startY = this.coreY || 200;
      
      // Spawn multiple branching lightnings to the cell and its adjacent cells
      this.lightnings.push({
        targetDay: dayIdx,
        startX, startY, endX: fx.x, endY: fx.y,
        life: 1.0, decay: 0.05 + Math.random() * 0.02,
        points: this.generateLightningPoints(startX, startY, fx.x, fx.y),
        branches: this.generateBranches(dayIdx, fx.x, fx.y)
      });
      
      this.lightnings.push({
        targetDay: dayIdx,
        startX, startY, endX: fx.x, endY: fx.y,
        life: 0.9, decay: 0.06 + Math.random() * 0.02,
        points: this.generateLightningPoints(startX, startY, fx.x, fx.y),
        branches: []
      });

      // Sparks to adjacent neighbors
      const neighbors = [dayIdx - 1, dayIdx + 1, dayIdx - 7, dayIdx + 7];
      for (const n of neighbors) {
        if (this.nodeFx.has(n) && Math.random() < 0.65) {
          const nFx = this.nodeFx.get(n);
          if (nFx && nFx.x) {
            // Core to adjacent
            this.lightnings.push({
              targetDay: n,
              startX, startY, endX: nFx.x, endY: nFx.y,
              life: 0.75, decay: 0.07,
              points: this.generateLightningPoints(startX, startY, nFx.x, nFx.y),
              branches: []
            });
            // Primary to adjacent
            this.lightnings.push({
              targetDay: n,
              startX: fx.x, startY: fx.y, endX: nFx.x, endY: nFx.y,
              life: 0.8, decay: 0.08,
              points: this.generateLightningPoints(fx.x, fx.y, nFx.x, nFx.y),
              branches: []
            });
          }
        }
      }

      // Spawn violent grid ripple starting from error origin
      const col = (dayIdx - 1) % 7;
      const row = Math.floor((dayIdx - 1) / 7);
      this.gridRipples.push({
        col,
        row,
        startTime: performance.now(),
        amplitude: 75,
        speed: 12,
        width: 2.2,
        duration: 1.4
      });

      this.lastActiveDay = dayIdx;
    }

    this.pulseCell(dayIdx, empId, true, true, dutyType);
    this.fireMiniMapPulse(true);

    // Brief red viewport flash
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = 'rgba(239, 68, 68, 0.45)';
    flash.style.zIndex = '999999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.3s ease-out';
    flash.style.opacity = '1';
    document.body.appendChild(flash);
    
    // Force reflow
    flash.getBoundingClientRect();
    flash.style.opacity = '0';
    setTimeout(() => { flash.remove(); }, 300);

    this.errorFlashActive = true;
    this.errorFlashTime = performance.now();

    // Trigger screen glitch, wobble & HUD surge
    this.glitchActive = true;
    this.hudRotSpeed = Math.min(0.26, this.hudRotSpeed + 0.12);
    this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.7);

    setTimeout(() => {
      this.glitchActive = false;
      if (this.phase === 'error') {
        this.phase = this.basePhase || 'init';
      }
      this.pulseCell(dayIdx, empId, false, false, dutyType);
    }, 350);
  }

  setPhase(phase) {
    this.phase = phase;
    if (phase !== 'error') {
      this.basePhase = phase;
    }
  }

  triggerSuccess(finalAssignments) {
    this.setPhase('success');

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

    if (this.positionsDirty) this.computeNodePositions();

    // Spawn massive success shockwave from center Accretion Core
    this.spawnBurst(
      this.coreX || 300, 
      this.coreY || 200, 
      PHASE_RGB.success, 
      Math.max(this.bgW || 800, this.bgH || 600) * 1.3
    );

    // Cascading network activation pulse
    let delay = 0;
    for (const [dayIdx, cellData] of this.cells.entries()) {
      if (cellData.dSlot.classList.contains('has-val') || cellData.hgSlot.classList.contains('has-val')) {
        setTimeout(() => {
          cellData.el.classList.add('pulse');
          cellData.el.style.setProperty('--pulse-color', this.getPhaseColor(0.95));
          this.igniteNode(dayIdx, PHASE_RGB.success, 1.2);
        }, delay);
        
        setTimeout(() => {
          cellData.el.classList.remove('pulse');
        }, delay + 650);
        delay += 14;
      }
    }

    // Success matrix rain overlay inside each cell
    for (const [dayIdx, cellData] of this.cells.entries()) {
      const cellEl = cellData.el;
      if (!cellEl.querySelector('.ng-cell-matrix-canvas')) {
        const matrixCanvas = document.createElement('canvas');
        matrixCanvas.className = 'ng-cell-matrix-canvas';
        cellEl.appendChild(matrixCanvas);
        
        const dpr = window.devicePixelRatio || 1;
        const rect = cellEl.getBoundingClientRect();
        const cw = rect.width || 120;
        const ch = rect.height || 160;
        matrixCanvas.width = cw * dpr;
        matrixCanvas.height = ch * dpr;
        
        const mCtx = matrixCanvas.getContext('2d');
        mCtx.scale(dpr, dpr);
        
        const fontSize = 8;
        const colsCount = Math.ceil(cw / fontSize);
        const drops = [];
        for (let c = 0; c < colsCount; c++) {
          drops.push(Math.random() * -30);
        }
        
        cellData.matrixCanvas = matrixCanvas;
        cellData.matrixCtx = mCtx;
        cellData.matrixDrops = drops;
        cellData.matrixWidth = cw;
        cellData.matrixHeight = ch;
      }
      
      // Fade in the cell matrix canvases overlay
      setTimeout(() => {
        const mCanvas = cellEl.querySelector('.ng-cell-matrix-canvas');
        if (mCanvas) mCanvas.style.opacity = '0.85';
      }, 800);
    }

    this.successStartTime = performance.now();

    // Mini-map diagnostic HUD visual surge sequence
    for (let p = 0; p < 24; p++) {
      setTimeout(() => {
        this.fireMiniMapPulse();
        this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.15);
        this.hudRotSpeed = Math.min(0.2, this.hudRotSpeed + 0.04);
      }, p * 40);
    }
  }

  // --- Animation Core Loop --------------------------------------------------

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.renderConstellation();
      this.renderMiniMap();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  renderConstellation() {
    const ctx = this.bgCtx;
    if (!ctx || !this.bgW || !this.bgH) return;
    if (this.positionsDirty) this.computeNodePositions();

    const w = this.bgW;
    const h = this.bgH;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);

    // Compute cell height offsets based on grid ripples
    const cellElevations = new Map();
    for (const d of this.cells.keys()) {
      cellElevations.set(d, 0);
    }

    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const rip = this.gridRipples[i];
      const dt = (now - rip.startTime) / 1000;
      if (dt > rip.duration) {
        this.gridRipples.splice(i, 1);
        continue;
      }
      const currentRadius = rip.speed * dt;
      const fade = 1 - dt / rip.duration; // ripple decay
      
      for (const [d, cellData] of this.cells.entries()) {
        const col = (d - 1) % 7;
        const row = Math.floor((d - 1) / 7);
        const dx = col - rip.col;
        const dy = row - rip.row;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const distToFront = Math.abs(dist - currentRadius);
        if (distToFront < rip.width) {
          const strength = (1 + Math.cos((distToFront / rip.width) * Math.PI)) / 2;
          const elevation = rip.amplitude * strength * fade;
          cellElevations.set(d, cellElevations.get(d) + elevation);
        }
      }
    }

    // 1. Grid Entrance and Success Y-Flip Transformation
    const entranceElapsed = (now - this.entranceStartTime) / 1000;
    const entranceDuration = 1.6;
    const tEntrance = Math.min(1.0, entranceElapsed / entranceDuration);
    
    // Easing: easeOutBack
    const easeOutBack = (x) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };
    const easeEntrance = easeOutBack(tEntrance);
    
    const startZ = -500;
    const startRotX = 45;
    const startRotY = -45;
    const startScale = 0.5;
    
    const hoverRotX = 18 + Math.sin(time * 0.4) * 3;
    const hoverRotY = -8 + Math.cos(time * 0.5) * 2;
    
    const currentZ = startZ * (1 - easeEntrance);
    const currentScale = startScale + (1 - startScale) * easeEntrance;
    const currentRotX = startRotX * (1 - easeEntrance) + hoverRotX * easeEntrance;
    const currentRotY = startRotY * (1 - easeEntrance) + hoverRotY * easeEntrance;
    
    let yFlip = 0;
    if (this.successStartTime) {
      const successElapsed = (now - this.successStartTime) / 1000;
      const successDuration = 2.0;
      const tSuccess = Math.min(1.0, successElapsed / successDuration);
      const easeSuccess = 1 - Math.pow(1 - tSuccess, 3); // easeOutCubic
      yFlip = easeSuccess * 360;
    }
    
    this.gridFloat.style.transform = `translate3d(0, 0, ${currentZ}px) scale(${currentScale}) rotateX(${currentRotX}deg) rotateY(${currentRotY + yFlip}deg)`;

    // Update each cell style using JS LERP state transitions
    for (const [d, cellData] of this.cells.entries()) {
      const el = cellData.el;
      const isPulse = el.classList.contains('pulse');
      const isError = el.classList.contains('error');
      
      const targetZ = isPulse ? 55 : (isError ? 45 : 0);
      const targetScale = isPulse ? 1.06 : (isError ? 1.05 : 1.0);
      const targetRotY = isError ? 6 : 0;
      
      cellData.currZ = cellData.currZ * 0.82 + targetZ * 0.18;
      cellData.currScale = cellData.currScale * 0.82 + targetScale * 0.18;
      cellData.currRotY = cellData.currRotY * 0.82 + targetRotY * 0.18;
      
      const rippleZ = cellElevations.get(d) || 0;
      const finalZ = cellData.currZ + rippleZ;
      
      el.style.transform = `translateZ(${finalZ}px) scale(${cellData.currScale}) rotateY(${cellData.currRotY}deg)`;
    }

    // Success cell matrix rain drawing
    if (this.phase === 'success') {
      for (const [dayIdx, cellData] of this.cells.entries()) {
        const mCtx = cellData.matrixCtx;
        if (!mCtx) continue;
        const cw = cellData.matrixWidth;
        const ch = cellData.matrixHeight;
        const drops = cellData.matrixDrops;
        
        mCtx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // trails
        mCtx.fillRect(0, 0, cw, ch);
        
        mCtx.font = '8px monospace';
        mCtx.fillStyle = '#22c55e'; // neon green matrix rain
        
        for (let c = 0; c < drops.length; c++) {
          const text = charSet[Math.floor(Math.random() * charSet.length)];
          const x = c * 8;
          const y = drops[c] * 8;
          
          mCtx.fillText(text, x, y);
          
          if (y > ch && Math.random() > 0.975) {
            drops[c] = 0;
          }
          drops[c] += 0.8;
        }
      }
    }

    // Aurora Core Glow backplane
    const aur = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.7);
    aur.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.08)`);
    aur.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aur;
    ctx.fillRect(0, 0, w, h);

    // Draw viewport warning red flash on canvas
    if (this.errorFlashActive) {
      const elapsedFlash = (now - this.errorFlashTime) / 1000;
      if (elapsedFlash < 0.35) {
        const flashAlpha = 0.42 * (1 - elapsedFlash / 0.35);
        ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
      } else {
        this.errorFlashActive = false;
      }
    }

    const cx = this.coreX || w / 2;
    const cy = this.coreY || h / 2;

    // Draw ambient sparks pulled towards the accretion core
    ctx.save();
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const dx = cx - s.x;
      const dy = cy - s.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      
      if (dist < 15) {
        // Swallowed by accretion core singularity, respawn at border
        this.sparks[i] = this.createSpark(false);
        continue;
      }
      
      // Gravitational acceleration: G / r^2
      const gravity = 120 / (distSq + 2500);
      s.vx += (dx / dist) * gravity;
      s.vy += (dy / dist) * gravity;
      
      // Friction/drag
      s.vx *= 0.975;
      s.vy *= 0.975;
      
      s.x += s.vx;
      s.y += s.vy;
      
      if (s.x < -100 || s.x > w + 100 || s.y < -100 || s.y > h + 100) {
        this.sparks[i] = this.createSpark(false);
        continue;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${s.a * (0.4 + 0.6 * Math.sin(time * 1.5 + s.x * 0.05))})`;
      ctx.fill();
    }
    ctx.restore();

    // Draw 3D rotating particle constellation
    const fov = 350;
    const rotAngleX = time * 0.04;
    const rotAngleY = time * 0.06;

    const projectedParticles = [];
    for (const p of this.constellationParticles) {
      // Y-axis rotation
      let x1 = p.x * Math.cos(rotAngleY) - p.z * Math.sin(rotAngleY);
      let z1 = p.x * Math.sin(rotAngleY) + p.z * Math.cos(rotAngleY);
      // X-axis rotation
      let y2 = p.y * Math.cos(rotAngleX) - z1 * Math.sin(rotAngleX);
      let z2 = p.y * Math.sin(rotAngleX) + z1 * Math.cos(rotAngleX);
      
      const scale = fov / (fov + z2);
      const px = cx + x1 * scale;
      const py = cy + y2 * scale;
      
      projectedParticles.push({
        x: px,
        y: py,
        z: z2,
        size: p.baseSize * scale,
        alpha: 0.12 + (1 - (z2 + 200) / 400) * 0.5
      });
    }

    // Connect close constellation particles
    ctx.save();
    ctx.lineWidth = 0.5;
    for (let i = 0; i < projectedParticles.length; i++) {
      const p1 = projectedParticles[i];
      if (p1.z > 140) continue; 
      for (let j = i + 1; j < projectedParticles.length; j++) {
        const p2 = projectedParticles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 70 * 70) {
          const dist = Math.sqrt(distSq);
          const alpha = (1.0 - dist / 70) * 0.14 * Math.min(p1.alpha, p2.alpha);
          ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Render particles
    for (const p of projectedParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${p.alpha})`;
      ctx.fill();
    }
    ctx.restore();

    // Draw energy synapse lines connecting cells to center Accretion Core
    ctx.save();
    ctx.lineWidth = 0.8;
    for (const [, fx] of this.nodeFx.entries()) {
      if (!fx.x) continue;
      const baseGlow = 0.035 + Math.min(0.42, fx.glow * 0.42);
      const grad = ctx.createLinearGradient(cx, cy, fx.x, fx.y);
      grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${baseGlow * 0.6})`);
      grad.addColorStop(1, `rgba(${fx.color[0]}, ${fx.color[1]}, ${fx.color[2]}, ${baseGlow})`);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fx.x, fx.y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw flowing synapse pulses
    ctx.save();
    for (let i = this.synapsePulses.length - 1; i >= 0; i--) {
      const p = this.synapsePulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) { this.synapsePulses.splice(i, 1); continue; }
      const fx = this.nodeFx.get(p.day);
      if (!fx || !fx.x) { this.synapsePulses.splice(i, 1); continue; }
      
      const t = p.progress;
      const x = fx.x + (cx - fx.x) * t;
      const y = fx.y + (cy - fx.y) * t;
      
      const [r, g, b] = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.width + 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${1 - t})`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Draw double helix spiral beams for swaps/assignments (Dense)
    ctx.save();
    for (let i = this.spiralBeams.length - 1; i >= 0; i--) {
      const beam = this.spiralBeams[i];
      beam.progress += beam.speed;

      // On arrival, trigger a burst explosion shockwave on target cell
      if (beam.progress >= 1.0 && !beam.exploded) {
        beam.exploded = true;
        this.spawnBurst(beam.endX, beam.endY, beam.color, 55);
        
        // Spawn grid ripple wave starting from target cell
        if (beam.targetDay) {
          const col = (beam.targetDay - 1) % 7;
          const row = Math.floor((beam.targetDay - 1) / 7);
          this.gridRipples.push({
            col,
            row,
            startTime: performance.now(),
            amplitude: 45,
            speed: 10,
            width: 1.8,
            duration: 1.2
          });
        }
      }

      if (beam.progress >= 1.25) {
        this.spiralBeams.splice(i, 1);
        continue;
      }
      
      const dx = beam.endX - beam.startX;
      const dy = beam.endY - beam.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) continue;
      
      const ux = dx / dist;
      const uy = dy / dist;
      const nx = -uy;
      const ny = ux;
      
      const [br, bg, bb] = beam.color;
      const maxT = Math.min(1.0, beam.progress);
      
      // Step size is 0.007 for double particle density
      for (let t = 0.0; t <= maxT; t += 0.007) {
        const theta = t * 7 * Math.PI + time * 18;
        const radius = 12 * Math.sin(t * Math.PI); 
        const offset = Math.sin(theta) * radius;
        const depth = Math.cos(theta);
        
        const age = beam.progress - t; 
        const fade = Math.max(0, 1 - age * 3.2); // trail decay
        if (fade <= 0) continue;
        
        const bx = beam.startX + t * dx + nx * offset;
        const by = beam.startY + t * dy + ny * offset;
        
        // Helix 1 dot
        const pSize1 = (1.5 + (depth + 1) * 1.0) * fade;
        const alpha1 = (0.25 + (depth + 1) * 0.4) * fade;
        ctx.beginPath();
        ctx.arc(bx, by, pSize1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha1})`;
        ctx.fill();
        
        // Helix 2 dot
        const bx2 = beam.startX + t * dx - nx * offset;
        const by2 = beam.startY + t * dy - ny * offset;
        const depth2 = -depth;
        const pSize2 = (1.5 + (depth2 + 1) * 1.0) * fade;
        const alpha2 = (0.25 + (depth2 + 1) * 0.4) * fade;
        ctx.beginPath();
        ctx.arc(bx2, by2, pSize2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha2})`;
        ctx.fill();
      }
    }
    ctx.restore();

    // Draw active lightning electric arcs on errors
    ctx.save();
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const lightning = this.lightnings[i];
      lightning.life -= lightning.decay;
      if (lightning.life <= 0) {
        this.lightnings.splice(i, 1);
        continue;
      }
      
      // Flickering updates
      if (Math.random() < 0.32) {
        lightning.points = this.generateLightningPoints(lightning.startX, lightning.startY, lightning.endX, lightning.endY);
        lightning.branches = this.generateBranches(lightning.targetDay, lightning.endX, lightning.endY);
      }
      
      const alpha = lightning.life;
      
      // Draw branches first (fainter red)
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.45})`;
      ctx.lineWidth = 1.2;
      for (const branch of lightning.branches) {
        ctx.beginPath();
        ctx.moveTo(branch[0].x, branch[0].y);
        for (let k = 1; k < branch.length; k++) {
          ctx.lineTo(branch[k].x, branch[k].y);
        }
        ctx.stroke();
      }
      
      // Draw main arc: wide glow
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
      for (let k = 1; k < lightning.points.length; k++) {
        ctx.lineTo(lightning.points[k].x, lightning.points[k].y);
      }
      ctx.stroke();

      // Medium plasma core
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.8})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
      for (let k = 1; k < lightning.points.length; k++) {
        ctx.lineTo(lightning.points[k].x, lightning.points[k].y);
      }
      ctx.stroke();

      // Solid white core
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
      for (let k = 1; k < lightning.points.length; k++) {
        ctx.lineTo(lightning.points[k].x, lightning.points[k].y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Draw grid day nodes
    ctx.save();
    for (const [, fx] of this.nodeFx.entries()) {
      if (!fx.x) continue;
      fx.glow *= 0.94; // decay glow
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + fx.seed);
      const baseR = 2.2 + pulse * 0.7;
      const glowR = baseR + fx.glow * 10;
      const [r, g, b] = fx.color;

      if (fx.glow > 0.02) {
        const halo = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, glowR * 2.2);
        halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * fx.glow})`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, glowR * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, baseR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.45 + 0.4 * pulse})`;
      ctx.fill();
    }
    ctx.restore();

    // Draw expanding rings / success shockwaves
    ctx.save();
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.r += (b.maxR - b.r) * 0.075;
      b.life *= 0.935;
      if (b.life < 0.04) { this.bursts.splice(i, 1); continue; }
      
      const [cr, cg, cb] = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${b.life * 0.7})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();

    // Draw Quantum Accretion Core (singularity + plasma disk + flares)
    this.drawAccretionCore(ctx, cx, cy, time, [pr, pg, pb]);
  }

  drawAccretionCore(ctx, cx, cy, time, colorArr) {
    const [pr, pg, pb] = colorArr;
    const baseColor = `rgba(${pr}, ${pg}, ${pb}`;
    
    // Core expansion pulse based on synapses loading in
    const corePulse = Math.sin(time * 4) * 0.1 + 0.9;
    const glowRadius = 45 * corePulse;
    
    // 1. Gravitational Halo Gradient
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowRadius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.15, `${baseColor}, 0.9)`);
    grad.addColorStop(0.4, `${baseColor}, 0.3)`);
    grad.addColorStop(0.75, `${baseColor}, 0.08)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 2. Rotating Plasma Accretion Rings
    const numRings = 4;
    for (let i = 0; i < numRings; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      const angle = time * (0.8 + i * 0.4) * (i % 2 === 0 ? 1 : -1);
      ctx.rotate(angle);
      
      const r = 20 + i * 12;
      ctx.strokeStyle = `${baseColor}, ${0.15 + (numRings - i) * 0.15})`;
      ctx.lineWidth = 1.5 + (numRings - i) * 0.8;
      
      ctx.beginPath();
      const arcStart = Math.sin(time + i) * Math.PI;
      const arcEnd = arcStart + Math.PI * (0.4 + 0.8 * Math.cos(time * 0.5 + i));
      ctx.arc(0, 0, r, arcStart, arcEnd);
      ctx.stroke();
      ctx.restore();
    }
    
    // 3. Dynamic Flare Lines of Variable Lengths
    ctx.save();
    ctx.translate(cx, cy);
    const numFlares = 36;
    for (let i = 0; i < numFlares; i++) {
      const angle = (i * Math.PI * 2) / numFlares + Math.sin(time * 0.1 + i) * 0.05;
      const flareLength = 25 + Math.sin(time * 8 + i * 5) * 15 + Math.random() * 5;
      const startDist = 12 + Math.cos(time * 4 + i) * 2;
      
      const x1 = Math.cos(angle) * startDist;
      const y1 = Math.sin(angle) * startDist;
      const x2 = Math.cos(angle) * (startDist + flareLength);
      const y2 = Math.sin(angle) * (startDist + flareLength);
      
      const flareGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      flareGrad.addColorStop(0, '#ffffff');
      flareGrad.addColorStop(0.3, `${baseColor}, 0.75)`);
      flareGrad.addColorStop(1, `${baseColor}, 0)`);
      
      ctx.strokeStyle = flareGrad;
      ctx.lineWidth = i % 3 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
    
    // 4. Singularity Center Black Core with Intense Rim
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // --- Diagnostics HUD Renderer ---------------------------------------------

  renderMiniMap() {
    if (!this.miniMapCtx || !this.miniMapCanvas.parentElement) return;

    const ctx = this.miniMapCtx;
    const parent = this.miniMapCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();
    const dpr = window.devicePixelRatio || 1;

    ctx.save();

    // Horizontal slice tearing glitches on error
    if (this.glitchActive || this.phase === 'error') {
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    }

    ctx.fillStyle = '#040A15';
    ctx.fillRect(0, 0, w, h);

    // 1. Matrix Digital Rain in the Background of the HUD
    if (!this.hudMatrixColumns || this.hudMatrixColumnsWidth !== w) {
      const colWidth = 6;
      const numCols = Math.ceil(w / colWidth);
      this.hudMatrixColumns = [];
      for (let i = 0; i < numCols; i++) {
        this.hudMatrixColumns.push({
          y: Math.random() * -h,
          speed: 1.0 + Math.random() * 1.8,
        });
      }
      this.hudMatrixColumnsWidth = w;
    }

    ctx.save();
    ctx.font = '6px monospace';
    for (let i = 0; i < this.hudMatrixColumns.length; i++) {
      const col = this.hudMatrixColumns[i];
      col.y += col.speed;
      if (col.y > h + 50) {
        col.y = 0;
        col.speed = 1.0 + Math.random() * 1.8;
      }
      const colX = i * 6;
      for (let j = 0; j < 8; j++) {
        const charY = col.y - j * 7;
        if (charY > 0 && charY < h) {
          const char = charSet[Math.floor(Math.random() * charSet.length)];
          const alpha = 0.08 * (1 - j / 8);
          ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
          ctx.fillText(char, colX, charY);
        }
      }
    }
    ctx.restore();

    // Setup HUD Radar layout bounds
    const centerRadarX = w > 120 ? 40 : w / 2;
    const centerRadarY = h / 2;
    const R_radar = w > 120 ? Math.min(32, h / 2 - 4) : Math.min(w, h) / 2 - 4;

    // Draw concentric radar reticle rings
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.12)`;
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(centerRadarX, centerRadarY, (R_radar * k) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(centerRadarX - R_radar, centerRadarY);
    ctx.lineTo(centerRadarX + R_radar, centerRadarY);
    ctx.moveTo(centerRadarX, centerRadarY - R_radar);
    ctx.lineTo(centerRadarX, centerRadarY + R_radar);
    ctx.stroke();

    // Concentric reticle 1: Dashed rotating ring
    ctx.save();
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.35)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.translate(centerRadarX, centerRadarY);
    ctx.rotate(time * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, R_radar - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Concentric reticle 2: Ticks ring rotating opposite
    ctx.save();
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.45)`;
    ctx.lineWidth = 1;
    ctx.translate(centerRadarX, centerRadarY);
    ctx.rotate(-time * 0.25);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(R_radar + 1, 0);
      ctx.lineTo(R_radar + 4, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 6);
    }
    ctx.restore();

    // 2. Surge tesseract spinning speed
    this.hudRotX += this.hudRotSpeed;
    this.hudRotY += this.hudRotSpeed * 1.5;
    this.hudRotZ += this.hudRotSpeed * 0.7;
    // Decays speed towards baseline
    this.hudRotSpeed = this.hudRotSpeed * 0.95 + 0.012 * 0.05;

    // Project Nested 3D Tesseract Hypercube (Multi-axis rotation + chromatic aberration)
    const wireframeScale = R_radar * 0.5;

    const projectTesseract = (scaleFactor) => {
      // Rotate 4D hypercube angles
      const thetaXY = time * 0.4 * (this.hudRotSpeed * 12);
      const thetaXZ = time * 0.3 * (this.hudRotSpeed * 12);
      const thetaXW = time * 0.2 * (this.hudRotSpeed * 12);
      const thetaYZ = time * 0.5 * (this.hudRotSpeed * 12);
      const thetaYW = time * 0.1 * (this.hudRotSpeed * 12);
      const thetaZW = time * 0.25 * (this.hudRotSpeed * 12);

      return TESSERACT_VERTICES.map(v => {
        const sv = [v[0] * scaleFactor, v[1] * scaleFactor, v[2] * scaleFactor, v[3] * scaleFactor];
        const [rx, ry, rz, rw] = rotate4D(sv, thetaXY, thetaXZ, thetaXW, thetaYZ, thetaYW, thetaZW);
        
        // 4D to 3D perspective
        const distance4D = 2.0;
        const factor4D = 1 / (distance4D - rw / (scaleFactor * 1.5));
        const x3d = rx * factor4D;
        const y3d = ry * factor4D;
        const z3d = rz * factor4D;
        
        // 3D to 2D
        const distance3D = 300;
        const factor3D = distance3D / (distance3D + z3d);
        
        return {
          x: centerRadarX + x3d * factor3D,
          y: centerRadarY + y3d * factor3D,
          z: z3d
        };
      });
    };

    const innerProj = projectTesseract(wireframeScale * 0.5);
    const outerProj = projectTesseract(wireframeScale);

    const drawWireframe = (projPoints, edges, color, offsetX = 0) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      for (const edge of edges) {
        const p1 = projPoints[edge[0]];
        const p2 = projPoints[edge[1]];
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX, p1.y);
        ctx.lineTo(p2.x + offsetX, p2.y);
        ctx.stroke();
      }
    };

    // Rendering with Chromatic Aberration offsets
    ctx.save();
    // Red Channel
    drawWireframe(innerProj, TESSERACT_EDGES, 'rgba(239, 68, 68, 0.45)', -1.2);
    drawWireframe(outerProj, TESSERACT_EDGES, 'rgba(239, 68, 68, 0.65)', -1.5);
    // Blue Channel
    drawWireframe(innerProj, TESSERACT_EDGES, 'rgba(14, 165, 233, 0.45)', 1.2);
    drawWireframe(outerProj, TESSERACT_EDGES, 'rgba(14, 165, 233, 0.65)', 1.5);
    // Green/White Base Overlay
    drawWireframe(innerProj, TESSERACT_EDGES, 'rgba(255, 255, 255, 0.7)');
    drawWireframe(outerProj, TESSERACT_EDGES, 'rgba(255, 255, 255, 0.8)');
    
    // Tiny vertex glowing points
    ctx.fillStyle = '#ffffff';
    for (const p of outerProj) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw mini-map energy shockwaves
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) { this.pulses.splice(i, 1); continue; }
      const rad = R_radar * p.progress;
      const x = centerRadarX + Math.cos(p.angle) * rad;
      const y = centerRadarY + Math.sin(p.angle) * rad;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * (1 - p.progress) + 0.8, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Render Right Panel (Telemetry & Neon Spectrum Bars)
    if (w > 120) {
      this.frameCount++;
      if (this.frameCount % 8 === 0) {
        const bdEl = document.getElementById('ap-ls-bd');
        const hgEl = document.getElementById('ap-ls-hg');
        const rulesEl = document.getElementById('ap-ls-rules');
        const swapEl = document.getElementById('ap-ls-swaps');
        const pctEl = document.getElementById('ap-prog-pct');

        const bd = bdEl ? bdEl.textContent : '0';
        const hg = hgEl ? hgEl.textContent : '0';
        const rules = rulesEl ? rulesEl.textContent : '0';
        const swaps = swapEl ? swapEl.textContent : '0';
        const pct = pctEl ? pctEl.textContent : '0%';

        if (bd !== this.lastBD) {
          this.addTelemetryLog(`> ALLOC BD: ${bd}`);
          this.lastBD = bd;
          this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.35);
          this.hudRotSpeed = Math.min(0.2, this.hudRotSpeed + 0.05);
        }
        if (hg !== this.lastHG) {
          this.addTelemetryLog(`> ALLOC HG: ${hg}`);
          this.lastHG = hg;
          this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.35);
          this.hudRotSpeed = Math.min(0.2, this.hudRotSpeed + 0.05);
        }
        if (rules !== this.lastRules) {
          this.addTelemetryLog(`> RULE TELEM: ${rules}`);
          this.lastRules = rules;
        }
        if (swaps !== this.lastSwaps) {
          this.addTelemetryLog(`> OPT STEPS: ${swaps}`);
          this.lastSwaps = swaps;
          this.hudSpectrumSurge = Math.min(1.0, this.hudSpectrumSurge + 0.45);
          this.hudRotSpeed = Math.min(0.25, this.hudRotSpeed + 0.08);
        }
        if (pct !== this.lastPct) {
          this.addTelemetryLog(`> PROGRESS: ${pct}`);
          this.lastPct = pct;
        }
        if (this.phase !== this.lastPhase) {
          this.addTelemetryLog(`> PHASE: ${this.phase.toUpperCase()}`);
          this.lastPhase = this.phase;
        }
      }

      // Draw digital telemetry log lines
      const prColor = `rgba(${pr}, ${pg}, ${pb}, 0.85)`;
      ctx.font = '8px monospace';
      ctx.fillStyle = prColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const xStart = 85;
      let yStart = 6;
      for (let j = 0; j < this.telemetryQueue.length; j++) {
        ctx.fillText(this.telemetryQueue[j], xStart, yStart + j * 9);
      }

      // 3. Neon frequency bars with floating peak indicator dots that decay slowly
      const spectrumY = h - 16;
      const spectrumH = 10;
      const numBars = 9;
      const gap = 2;
      const barW = Math.max(3, Math.floor((w - xStart - 8 - (numBars - 1) * gap) / numBars));

      // Spectrum surge decay
      this.hudSpectrumSurge *= 0.92;

      if (!this.hudSpectrumPeaks) {
        this.hudSpectrumPeaks = new Array(numBars).fill(spectrumY + spectrumH);
        this.hudSpectrumPeakDecay = new Array(numBars).fill(0);
      }

      for (let j = 0; j < numBars; j++) {
        let val = 0.15 + 0.35 * Math.sin(time * 4.5 + j * 1.3);
        if (this.hudSpectrumSurge > 0.05) {
          val += this.hudSpectrumSurge * (0.3 + 0.7 * Math.random());
        }
        val = Math.min(1.0, val);
        const h_bar = Math.max(2, val * spectrumH);
        const bx = xStart + j * (barW + gap);
        const by = spectrumY + spectrumH - h_bar;

        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.5 + val * 0.5})`;
        ctx.fillRect(bx, by, barW, h_bar);

        // Peak Tracker
        const currentPeakY = by;
        if (this.hudSpectrumPeaks[j] > currentPeakY) {
          this.hudSpectrumPeaks[j] = currentPeakY;
          this.hudSpectrumPeakDecay[j] = 0; // reset speed
        } else {
          this.hudSpectrumPeakDecay[j] += 0.04; // gravity decay acceleration
          this.hudSpectrumPeaks[j] = Math.min(spectrumY + spectrumH, this.hudSpectrumPeaks[j] + this.hudSpectrumPeakDecay[j]);
        }

        // Draw Peak Indicator Dot
        if (this.hudSpectrumPeaks[j] < spectrumY + spectrumH) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx, this.hudSpectrumPeaks[j] - 1.5, barW, 1);
        }
      }
    }

    // 4. Glitch tearing effects that shift horizontal slices of the canvas on error
    if (this.glitchActive) {
      const numTears = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < numTears; k++) {
        const sliceY = Math.floor(Math.random() * h);
        const sliceH = 2 + Math.floor(Math.random() * 18);
        const shiftX = (Math.random() - 0.5) * 16;
        ctx.drawImage(
          this.miniMapCanvas,
          0, sliceY * dpr, w * dpr, sliceH * dpr,
          shiftX, sliceY, w, sliceH
        );
      }
    }

    ctx.restore();
  }

  addTelemetryLog(msg) {
    this.telemetryQueue.push(msg);
    if (this.telemetryQueue.length > 5) {
      this.telemetryQueue.shift();
    }
  }

  // --- Destructor -----------------------------------------------------------

  dispose() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    if (this.miniMapCanvas && this.miniMapCanvas.parentElement) {
      this.miniMapCanvas.parentElement.innerHTML = '';
    }
    this.cells.clear();
    this.nodeFx.clear();
    this.pulses = [];
    this.synapsePulses = [];
    this.bursts = [];
    this.sparks = [];
    this.lightnings = [];
    this.spiralBeams = [];
    this.gridRipples = [];
    this.constellationParticles = [];
  }
}
