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
      background: radial-gradient(ellipse at 50% 30%, rgba(15,23,42,0.55), rgba(2,6,18,0.92) 70%);
      padding: 22px;
      perspective: 1400px;
    }
    /* Constellation-Canvas liegt HINTER dem Tagesraster und zeichnet das
       neuronale Netz, Synapsen-Impulse und das zentrale Reaktor-Kernfeld. */
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
      transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .ng-flat-cell {
      border-radius: 12px;
      position: relative;
      background: rgba(8, 15, 33, 0.34);
      backdrop-filter: blur(3px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow:
        0 4px 10px rgba(0, 0, 0, 0.32),
        inset 0 1px 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      will-change: transform, background-color, box-shadow, border-color;
      transform-style: preserve-3d;
      transition:
        transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275),
        background-color 0.3s ease,
        box-shadow 0.3s ease,
        border-color 0.3s ease;
      backface-visibility: hidden;
    }
    .ng-flat-cell.rest {
      transform: translateZ(0) rotateX(3deg) rotateY(-3deg);
    }
    .ng-flat-cell.pulse {
      transform: translateZ(46px) scale(1.06) rotateX(0deg) rotateY(0deg);
      z-index: 50;
      background: rgba(15, 23, 42, 0.72);
      border-color: var(--pulse-color, rgba(56, 189, 248, 0.5));
      box-shadow:
        0 18px 40px rgba(0, 0, 0, 0.55),
        0 0 26px var(--pulse-color, transparent);
    }
    .ng-flat-cell.error {
      transform: translateZ(22px) rotateX(-10deg) rotateY(15deg);
      background: rgba(127, 29, 29, 0.42);
      border-color: #ef4444;
      box-shadow: 0 10px 28px rgba(239, 68, 68, 0.35);
    }
    .ng-day-number {
      position: absolute;
      top: 6px;
      left: 8px;
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
      margin-top: 18px;
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
      transform: translateZ(5px);
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

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.cells = new Map();
    this.nodeFx = new Map();
    this.employees = [];
    this.daysCount = 0;
    this.phase = 'init';
    this.basePhase = 'init';

    // Mini-HUD ("Spectacle"): radarartiges Oszilloskop.
    this.miniMapCanvas = null;
    this.miniMapCtx = null;

    // Haupt-Constellation-Canvas.
    this.bgCanvas = null;
    this.bgCtx = null;

    this.pulses = [];          // Mini-HUD-Energieimpulse
    this.synapsePulses = [];   // Impulse Tagknoten <-> Kern
    this.bursts = [];          // expandierende Ringe
    this.sparks = [];          // ambiente Funken
    this.animId = null;
    this.resizeObserver = null;
    this.gridFloat = null;
    this.positionsDirty = true;
    this.t0 = performance.now();

    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
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
    const n = 46;
    for (let i = 0; i < n; i++) {
      this.sparks.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00035,
        vy: (Math.random() - 0.5) * 0.00035,
        r: 0.6 + Math.random() * 1.6,
        a: 0.15 + Math.random() * 0.35,
      });
    }
  }

  computeNodePositions() {
    if (!this.wrapper) return;
    const wrapRect = this.wrapper.getBoundingClientRect();
    if (wrapRect.width === 0) return;
    for (const [d, fx] of this.nodeFx.entries()) {
      const cellData = this.cells.get(d);
      if (!cellData) continue;
      const r = cellData.el.getBoundingClientRect();
      fx.x = r.left - wrapRect.left + r.width / 2;
      fx.y = r.top - wrapRect.top + r.height / 2;
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

  // --- Canvas-Effekte ------------------------------------------------------

  spawnSynapsePulse(dayIdx, color, intense) {
    this.synapsePulses.push({
      day: dayIdx,
      progress: 0,
      speed: 0.018 + Math.random() * 0.02,
      color,
      width: intense ? 2.6 : 1.6,
      inbound: true,
    });
  }

  spawnBurst(x, y, color, maxR) {
    this.bursts.push({ x, y, r: 4, maxR, color, life: 1 });
  }

  igniteNode(dayIdx, color, strength = 1) {
    const fx = this.nodeFx.get(dayIdx);
    if (!fx) return;
    fx.glow = Math.min(1.4, fx.glow + strength);
    fx.color = color;
  }

  // --- Slot-/Zell-Pulse (DOM, API-kompatibel) ------------------------------

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

      if (dutyType === 'HG') {
        targetSlot.classList.add('active-hg');
      } else {
        targetSlot.classList.add('active-d');
      }
      targetEmp.style.color = '#fff';

      // Canvas-Resonanz
      const fx = this.nodeFx.get(dayIdx);
      this.igniteNode(dayIdx, colorArr, isError ? 1.4 : 1);
      if (fx) {
        this.spawnBurst(fx.x, fx.y, colorArr, isError ? 70 : 46);
        if (!isError) this.spawnSynapsePulse(dayIdx, colorArr, true);
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
      speed: 0.05 + Math.random() * 0.05,
      angle: Math.random() * Math.PI * 2,
      isError,
    });
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId, dutyType = 'D') {
    this.pulseCell(dayIdx, 'SWAP', true, false, dutyType);
    this.fireMiniMapPulse();
    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, newEmpId, false, false, dutyType);
      }
    }, 450);
  }

  triggerAssignment(dayIdx, empId, dutyType = 'D') {
    this.pulseCell(dayIdx, empId, true, false, dutyType);
    this.fireMiniMapPulse();
    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, empId, false, false, dutyType);
      }
    }, 450);
  }

  triggerError(dayIdx, empId, dutyType = 'D') {
    if (this.phase !== 'error') {
      this.basePhase = this.phase;
    }
    this.phase = 'error';
    this.pulseCell(dayIdx, empId, true, true, dutyType);
    this.fireMiniMapPulse(true);
    setTimeout(() => {
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

    // Erfolgs-Schockwelle aus dem Kern + sequenzielle Knoten-Zündung.
    if (this.positionsDirty) this.computeNodePositions();
    this.spawnBurst(this.coreX || 0, this.coreY || 0, PHASE_RGB.success, Math.max(this.bgW || 600, this.bgH || 400));

    let delay = 0;
    for (const [dayIdx, cellData] of this.cells.entries()) {
      if (cellData.dSlot.classList.contains('has-val') || cellData.hgSlot.classList.contains('has-val')) {
        setTimeout(() => {
          cellData.el.classList.remove('rest');
          cellData.el.classList.add('pulse');
          cellData.el.style.setProperty('--pulse-color', this.getPhaseColor(0.9));
          this.igniteNode(dayIdx, PHASE_RGB.success, 1);
        }, delay);
        setTimeout(() => {
          cellData.el.classList.remove('pulse');
          cellData.el.classList.add('rest');
        }, delay + 720);
        delay += 18;
      }
    }

    for (let p = 0; p < 24; p++) {
      setTimeout(() => this.fireMiniMapPulse(), p * 45);
    }
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.renderConstellation();
      this.renderMiniMap();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  // --- Haupt-Constellation -------------------------------------------------

  renderConstellation() {
    const ctx = this.bgCtx;
    if (!ctx || !this.bgW || !this.bgH) return;
    if (this.positionsDirty) this.computeNodePositions();

    const w = this.bgW;
    const h = this.bgH;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();

    ctx.clearRect(0, 0, w, h);

    // Phasen-Aurora
    const aur = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.32, Math.max(w, h) * 0.75);
    aur.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.10)`);
    aur.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aur;
    ctx.fillRect(0, 0, w, h);

    // Ambiente Funken
    ctx.save();
    for (const s of this.sparks) {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0;
      if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${s.a * (0.5 + 0.5 * Math.sin(time * 2 + s.x * 10))})`;
      ctx.fill();
    }
    ctx.restore();

    const cx = this.coreX || w / 2;
    const cy = this.coreY || h / 2;

    // Synapsen Kern <-> Tagknoten (faint), Glow-abhängig heller
    ctx.lineWidth = 1;
    for (const [, fx] of this.nodeFx.entries()) {
      if (!fx.x) continue;
      const base = 0.05 + Math.min(0.45, fx.glow * 0.4);
      const grad = ctx.createLinearGradient(cx, cy, fx.x, fx.y);
      grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${base * 0.7})`);
      grad.addColorStop(1, `rgba(${fx.color[0]}, ${fx.color[1]}, ${fx.color[2]}, ${base})`);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fx.x, fx.y);
      ctx.stroke();
    }

    // Synapsen-Impulse (laufende Energiepakete zum Kern)
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
      ctx.arc(x, y, p.width + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${1 - t})`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tagknoten
    for (const [, fx] of this.nodeFx.entries()) {
      if (!fx.x) continue;
      fx.glow *= 0.94;
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.6 + fx.seed);
      const baseR = 2.2 + pulse * 0.8;
      const glowR = baseR + fx.glow * 10;
      const [r, g, b] = fx.color;
      if (fx.glow > 0.02) {
        const halo = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, glowR * 2.4);
        halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * fx.glow})`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, glowR * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, baseR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + 0.4 * pulse})`;
      ctx.fill();
    }

    // Expandierende Ringe (Bursts / Erfolgswelle)
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.r += (b.maxR - b.r) * 0.08;
      b.life *= 0.93;
      if (b.life < 0.04) { this.bursts.splice(i, 1); continue; }
      const [cr, cg, cb] = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${b.life * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Reaktor-Kern
    const corePulse = 0.5 + 0.5 * Math.sin(time * 3);
    const coreR = 9 + corePulse * 4 + this.synapsePulses.length * 0.6;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.2);
    coreGrad.addColorStop(0, `rgba(255,255,255,0.9)`);
    coreGrad.addColorStop(0.3, `rgba(${pr}, ${pg}, ${pb}, 0.85)`);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Rotierender Kern-Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.6);
    ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.55)`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([coreR * 0.6, coreR * 0.9]);
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Mini-HUD Oszilloskop ------------------------------------------------

  renderMiniMap() {
    if (!this.miniMapCtx || !this.miniMapCanvas.parentElement) return;

    const ctx = this.miniMapCtx;
    const parent = this.miniMapCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    const time = (performance.now() - this.t0) / 1000;
    const [pr, pg, pb] = this.phaseColorArr();

    ctx.fillStyle = '#040A15';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 4;
    if (R <= 2) return;

    // Konzentrische Ringe
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * k) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // Radar-Sweep
    const sweep = time * 1.8;
    const sweepGrad = ctx.createConicGradient
      ? ctx.createConicGradient(sweep, cx, cy)
      : null;
    if (sweepGrad) {
      sweepGrad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.35)`);
      sweepGrad.addColorStop(0.08, `rgba(${pr}, ${pg}, ${pb}, 0)`);
      sweepGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
      ctx.stroke();
      ctx.restore();
    }

    // Energieimpulse als nach außen laufende Blips
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) { this.pulses.splice(i, 1); continue; }
      const rad = R * p.progress;
      const x = cx + Math.cos(p.angle) * rad;
      const y = cy + Math.sin(p.angle) * rad;
      ctx.beginPath();
      ctx.arc(x, y, 2.6 * (1 - p.progress) + 1, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Zentraler Knoten
    const cp = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + cp * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = this.getPhaseColor(0.95);
    ctx.shadowColor = this.getPhaseColor(0.9);
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

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
  }
}
