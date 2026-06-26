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
      transition: transform 0.6s cubic-bezier(0.19, 1, 0.22, 1);
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
        transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1.2), 
        background-color 0.3s ease, 
        border-color 0.3s ease, 
        box-shadow 0.3s ease;
      backface-visibility: hidden;
    }
    .ng-flat-cell.rest {
      transform: translateZ(0);
    }
    .ng-flat-cell.pulse {
      transform: translateZ(55px) scale(1.06);
      z-index: 50;
      background: rgba(14, 25, 52, 0.85);
      border-color: var(--pulse-color, rgba(56, 189, 248, 0.5));
      box-shadow: 
        0 22px 45px rgba(0, 0, 0, 0.6), 
        0 0 24px var(--pulse-color, transparent);
    }
    .ng-flat-cell.error {
      transform: translateZ(45px) scale(1.05) rotateY(6deg);
      z-index: 50;
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

// 3D wireframe geometries
const CUBE_VERTICES = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
];
const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

const OCTA_VERTICES = [
  [0, -1.4, 0], [1.4, 0, 0], [0, 1.4, 0], [-1.4, 0, 0],
  [0, 0, -1.4], [0, 0, 1.4]
];
const OCTA_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [5, 0], [5, 1], [5, 2], [5, 3],
  [4, 0], [4, 1], [4, 2], [4, 3]
];

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
    this.sparks = [];          // ambient floating dust particles
    this.lightnings = [];      // error lightning electric arcs
    this.spiralBeams = [];     // swap/assignment double helices
    
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

      this.cells.set(d, { el: cell, dSlot, dEmp, hgSlot, hgEmp });
      this.nodeFx.set(d, { glow: 0, color: [56, 189, 248], x: 0, y: 0, seed: Math.random() * 1000 });
    }

    this.positionsDirty = true;
    this.resizeBgCanvas();
    this.seedSparks();
  }

  seedSparks() {
    this.sparks = [];
    const n = 45;
    for (let i = 0; i < n; i++) {
      this.sparks.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        r: 0.6 + Math.random() * 1.5,
        a: 0.15 + Math.random() * 0.35,
      });
    }
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
    
    generate(x1, y1, x2, y2, 24, 0);
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

  // --- 3D Rotation Utility --------------------------------------------------

  rotatePoint(pt, rotX, rotY, rotZ) {
    let [x, y, z] = pt;

    // Rotate around X
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;

    // Rotate around Y
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    let x2 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;

    // Rotate around Z
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    let x3 = x2 * cosZ - y1 * sinZ;
    let y3 = x2 * sinZ + y1 * cosZ;

    return [x3, y3, z2];
  }

  // --- Telemetry Manager ----------------------------------------------------

  addTelemetryLog(msg) {
    this.telemetryQueue.push(msg);
    if (this.telemetryQueue.length > 5) {
      this.telemetryQueue.shift();
    }
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

      el.classList.remove('rest');
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
      el.classList.add('rest');
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
        progress: 0,
        speed: 0.04,
        color: this.dutyColorArr(dutyType)
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
        progress: 0,
        speed: 0.045,
        color: this.dutyColorArr(dutyType)
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
      
      // Spawn lightning electric arc + branches
      this.lightnings.push({
        targetDay: dayIdx,
        startX,
        startY,
        endX: fx.x,
        endY: fx.y,
        life: 1.0,
        decay: 0.065,
        points: this.generateLightningPoints(startX, startY, fx.x, fx.y),
        branches: this.generateBranches(dayIdx, fx.x, fx.y)
      });
      this.lastActiveDay = dayIdx;
    }

    this.pulseCell(dayIdx, empId, true, true, dutyType);
    this.fireMiniMapPulse(true);

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

    // Spawn massive success shockwave from center Quantum Core
    this.spawnBurst(
      this.coreX || 300, 
      this.coreY || 200, 
      PHASE_RGB.success, 
      Math.max(this.bgW || 800, this.bgH || 600) * 1.2
    );

    // Cascading network activation pulse
    let delay = 0;
    for (const [dayIdx, cellData] of this.cells.entries()) {
      if (cellData.dSlot.classList.contains('has-val') || cellData.hgSlot.classList.contains('has-val')) {
        setTimeout(() => {
          cellData.el.classList.remove('rest');
          cellData.el.classList.add('pulse');
          cellData.el.style.setProperty('--pulse-color', this.getPhaseColor(0.95));
          this.igniteNode(dayIdx, PHASE_RGB.success, 1.2);
        }, delay);
        
        setTimeout(() => {
          cellData.el.classList.remove('pulse');
          cellData.el.classList.add('rest');
        }, delay + 650);
        delay += 16;
      }
    }

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

    ctx.clearRect(0, 0, w, h);

    // Dynamic tilted grid floating state in JS
    const rotX = 18 + Math.sin(time * 0.4) * 3;
    const rotY = -8 + Math.cos(time * 0.5) * 2;
    this.gridFloat.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    // Aurora Core Glow backplane
    const aur = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.7);
    aur.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.08)`);
    aur.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aur;
    ctx.fillRect(0, 0, w, h);

    // Draw ambient floating dust
    ctx.save();
    for (const s of this.sparks) {
      s.x += s.vx; 
      s.y += s.vy;
      if (s.x < 0) s.x = 1; 
      if (s.x > 1) s.x = 0;
      if (s.y < 0) s.y = 1; 
      if (s.y > 1) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${s.a * (0.4 + 0.6 * Math.sin(time * 1.5 + s.x * 20))})`;
      ctx.fill();
    }
    ctx.restore();

    const cx = this.coreX || w / 2;
    const cy = this.coreY || h / 2;

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

    // Draw energy synapse lines connecting cells to center Quantum Core
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

    // Draw double helix spiral beams for swaps/assignments
    ctx.save();
    for (let i = this.spiralBeams.length - 1; i >= 0; i--) {
      const beam = this.spiralBeams[i];
      beam.progress += beam.speed;
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
      
      for (let t = 0.0; t <= maxT; t += 0.015) {
        const theta = t * 7 * Math.PI + time * 18;
        const radius = 11 * Math.sin(t * Math.PI); 
        const offset = Math.sin(theta) * radius;
        const depth = Math.cos(theta);
        
        const age = beam.progress - t; 
        const fade = Math.max(0, 1 - age * 3.8); 
        if (fade <= 0) continue;
        
        const bx = beam.startX + t * dx + nx * offset;
        const by = beam.startY + t * dy + ny * offset;
        
        // Helix 1 dot
        const pSize1 = (1.2 + (depth + 1) * 0.9) * fade;
        const alpha1 = (0.2 + (depth + 1) * 0.35) * fade;
        ctx.beginPath();
        ctx.arc(bx, by, pSize1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha1})`;
        ctx.fill();
        
        // Helix 2 dot
        const bx2 = beam.startX + t * dx - nx * offset;
        const by2 = beam.startY + t * dy - ny * offset;
        const depth2 = -depth;
        const pSize2 = (1.2 + (depth2 + 1) * 0.9) * fade;
        const alpha2 = (0.2 + (depth2 + 1) * 0.35) * fade;
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

    // Draw glowing Quantum Core
    const corePulse = 0.5 + 0.5 * Math.sin(time * 3);
    const coreR = 10 + corePulse * 3.5 + this.synapsePulses.length * 0.5;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, 0.96)`);
    coreGrad.addColorStop(0.2, `rgba(${pr}, ${pg}, ${pb}, 0.9)`);
    coreGrad.addColorStop(0.65, `rgba(${pr}, ${pg}, ${pb}, 0.22)`);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Concentric ring 1: dashed rotating
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5);
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([coreR * 0.6, coreR * 0.9]);
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Concentric ring 2: solid rotating opposite
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-time * 0.35);
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.35)`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

    // Apply temporary glitches
    if (this.glitchActive || this.phase === 'error') {
      ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    ctx.fillStyle = '#040A15';
    ctx.fillRect(0, 0, w, h);

    // Setup bounds
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

    // Concentric reticle 2: Tick marks ring rotating opposite
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

    // Update 3D wireframe rotation
    this.hudRotX += this.hudRotSpeed;
    this.hudRotY += this.hudRotSpeed * 1.5;
    this.hudRotZ += this.hudRotSpeed * 0.7;
    // Decays speed towards baseline
    this.hudRotSpeed = this.hudRotSpeed * 0.95 + 0.012 * 0.05;

    // Project 3D Nested Wireframe (Cube + Octahedron)
    const fov = 100;
    
    // Project Inner Cube
    const projCube = CUBE_VERTICES.map(v => {
      const sv = [v[0] * 11, v[1] * 11, v[2] * 11];
      const [rx, ry, rz] = this.rotatePoint(sv, this.hudRotX, this.hudRotY, this.hudRotZ);
      const zoom = fov / (fov + rz);
      return { x: centerRadarX + rx * zoom, y: centerRadarY + ry * zoom };
    });

    // Project Outer Octahedron
    const projOcta = OCTA_VERTICES.map(v => {
      const sv = [v[0] * 16, v[1] * 16, v[2] * 16];
      const [rx, ry, rz] = this.rotatePoint(sv, this.hudRotX, this.hudRotY, this.hudRotZ);
      const zoom = fov / (fov + rz);
      return { x: centerRadarX + rx * zoom, y: centerRadarY + ry * zoom };
    });

    // Draw cube lines
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.45)`;
    for (const edge of CUBE_EDGES) {
      ctx.beginPath();
      ctx.moveTo(projCube[edge[0]].x, projCube[edge[0]].y);
      ctx.lineTo(projCube[edge[1]].x, projCube[edge[1]].y);
      ctx.stroke();
    }

    // Draw octahedron lines
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.75)`;
    for (const edge of OCTA_EDGES) {
      ctx.beginPath();
      ctx.moveTo(projOcta[edge[0]].x, projOcta[edge[0]].y);
      ctx.lineTo(projOcta[edge[1]].x, projOcta[edge[1]].y);
      ctx.stroke();
    }

    // Draw tiny vertex dots
    ctx.fillStyle = '#ffffff';
    for (const p of projOcta) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Render Right Panel (Telemetry & Spectrum) if space is available
    if (w > 120) {
      // Poll DOM stats to update telemetry queue
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

      // Draw digital telemetry text
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

      // Render bouncing neon frequency spectrum analyzer
      const spectrumY = h - 16;
      const spectrumH = 10;
      const numBars = 9;
      const gap = 2;
      const barW = Math.max(3, Math.floor((w - xStart - 8 - (numBars - 1) * gap) / numBars));

      // Spectrum surge decay
      this.hudSpectrumSurge *= 0.92;

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
      }
    }

    // Apply slice shifting glitch offset
    if (this.glitchActive && Math.random() < 0.4) {
      const sliceY = Math.floor(Math.random() * h);
      const sliceH = 4 + Math.random() * 12;
      const shiftX = (Math.random() - 0.5) * 8;
      ctx.drawImage(
        this.miniMapCanvas,
        0, sliceY * dpr, w * dpr, sliceH * dpr,
        shiftX, sliceY, w, sliceH
      );
    }

    ctx.restore();
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
    this.constellationParticles = [];
  }
}
