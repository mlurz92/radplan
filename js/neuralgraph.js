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
      background: transparent;
      padding: 16px;
      perspective: 1000px;
    }
    .ng-matrix-grid {
      display: grid;
      width: 100%;
      height: 100%;
      grid-auto-rows: 1fr;
      will-change: transform;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .ng-flat-cell {
      border-radius: 6px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      will-change: transform, background-color, box-shadow, border-color;
      transform-style: preserve-3d;
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s ease, box-shadow 0.25s ease, border-color 0.2s ease;
      backface-visibility: hidden;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.15);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05), inset 0 -2px 4px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.2);
    }
    .ng-flat-cell.rest {
      transform: translateZ(0) rotateX(2deg) rotateY(-2deg);
    }
    .ng-flat-cell.pulse {
      transform: translateZ(28px) scale(1.08) rotateX(0deg) rotateY(0deg);
      z-index: 10;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 14px 28px rgba(0, 0, 0, 0.6), 0 0 18px var(--pulse-color, transparent);
    }
    .ng-flat-cell.error {
      transform: translateZ(12px) scale(1.02) rotateX(-8deg) rotateY(12deg);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 8px 20px rgba(239, 68, 68, 0.3), 0 0 12px rgba(239, 68, 68, 0.4);
    }
    .ng-day-number {
      position: absolute;
      top: 4px;
      left: 6px;
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      user-select: none;
      transform: translateZ(6px);
    }
    .ng-duty-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      pointer-events: none;
      width: 100%;
      transform: translateZ(14px);
    }
    .ng-emp-label {
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      font-weight: 800;
      color: transparent;
      transition: color 0.2s, text-shadow 0.2s;
      user-select: none;
      letter-spacing: 0.05em;
      line-height: 1;
      text-align: center;
      min-height: 11px;
    }
    .ng-flat-cell.pulse .ng-emp-label {
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
    }
    .ng-emp-d {
      color: transparent;
    }
    .ng-emp-hg {
      color: transparent;
    }
  `;
  document.head.appendChild(style);
}

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.cells = new Map();
    this.employees = [];
    this.daysCount = 0;
    this.phase = 'init';
    this.basePhase = 'init';
    this.miniMapCanvas = null;
    this.miniMapCtx = null;
    this.pulses = [];
    this.animId = null;
    this.resizeObserver = null;
    this.gridFloat = null;
    
    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
  }

  buildDOM() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ng-container';
    this.gridFloat = document.createElement('div');
    this.gridFloat.className = 'ng-matrix-grid';
    
    this.wrapper.appendChild(this.gridFloat);
    this.container.appendChild(this.wrapper);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeMiniMap();
    });
    this.resizeObserver.observe(this.container);
  }

  initData(daysCount, employees) {
    this.daysCount = daysCount;
    this.employees = employees;
    this.gridFloat.innerHTML = '';
    this.cells.clear();

    const cols = 7;
    const rows = Math.ceil(daysCount / cols);
    this.gridFloat.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.gridFloat.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    this.gridFloat.style.gap = `5px`;

    for (let d = 1; d <= daysCount; d++) {
      const cell = document.createElement('div');
      cell.className = 'ng-flat-cell rest';
      
      const dayLabel = document.createElement('div');
      dayLabel.className = 'ng-day-number';
      dayLabel.textContent = d;

      const dutyWrap = document.createElement('div');
      dutyWrap.className = 'ng-duty-wrap';

      const dLabel = document.createElement('div');
      dLabel.className = 'ng-emp-label ng-emp-d';
      dLabel.textContent = ''; 

      const hgLabel = document.createElement('div');
      hgLabel.className = 'ng-emp-label ng-emp-hg';
      hgLabel.textContent = ''; 
      
      dutyWrap.appendChild(dLabel);
      dutyWrap.appendChild(hgLabel);
      
      cell.appendChild(dayLabel);
      cell.appendChild(dutyWrap);
      this.gridFloat.appendChild(cell);
      
      this.cells.set(d, { el: cell, dLabel, hgLabel });
    }
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
    this.startLoop();
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
    this.miniMapCtx.scale(dpr, dpr);
  }

  getPhaseColor(alpha = 1) {
    const colors = {
      init: `rgba(14, 165, 233, ${alpha})`,
      greedy: `rgba(245, 158, 11, ${alpha})`,
      hg: `rgba(56, 189, 248, ${alpha})`,
      deep: `rgba(168, 85, 247, ${alpha})`,
      success: `rgba(34, 197, 94, ${alpha})`,
      error: `rgba(239, 68, 68, ${alpha})`
    };
    return colors[this.phase] || colors.init;
  }

  getAbbreviation(empId) {
    if (!empId) return '';
    // Strip academic titles and honorifics
    const stripped = String(empId)
      .replace(/^(Herr|Frau|Hr\.|Fr\.|Dr\.\s*(med\.\s*)?|Prof\.\s*(Dr\.\s*(med\.\s*)?)?|PD\s+Dr\.\s*(med\.\s*)?|Dipl\.\s*\w+\.\s*)/gi, '')
      .trim();
    const parts = stripped.split(/\s+/);
    if (parts.length <= 1) {
      return stripped.replace(/\s/g, '').substring(0, 3).toUpperCase();
    }
    // Check if any word starts a surname prefix
    const surnamePrefixes = ['el','al','van','von','de','le','la','di','lo','del','dal','bin','ben','abu'];
    const firstPartLower = parts[0].toLowerCase();
    
    if (surnamePrefixes.includes(firstPartLower)) {
      // El Houba case
      return parts.join('').substring(0, 3).toUpperCase();
    }
    // Last word is usually the surname: Markus M. Lurz -> Lurz
    const surname = parts[parts.length - 1];
    return surname.substring(0, 3).toUpperCase();
  }

  pulseCell(dayIdx, empId, isActive, isError = false, dutyType = "D") {
    const cellData = this.cells.get(dayIdx);
    if (!cellData) return;
    
    const { el, dLabel, hgLabel } = cellData;

    if (empId && empId !== "SWAP") {
      if (dutyType === "HG") {
        hgLabel.textContent = this.getAbbreviation(empId);
      } else {
        dLabel.textContent = this.getAbbreviation(empId);
      }
    } else if (empId === "SWAP") {
      if (dutyType === "HG") {
        hgLabel.textContent = "SWP";
      } else {
        dLabel.textContent = "SWP";
      }
    }

    if (isActive) {
      const color = isError ? 'rgba(239, 68, 68, 0.2)' : this.getPhaseColor(0.2);
      const borderColor = isError ? 'rgba(239, 68, 68, 0.8)' : this.getPhaseColor(0.8);
      
      el.classList.remove('rest');
      
      if (isError) {
        el.classList.add('error');
      } else {
        el.classList.add('pulse');
      }
      
      el.style.setProperty('--pulse-color', borderColor);
      el.style.background = color;
      el.style.borderColor = borderColor;

      if (dutyType === "HG" && hgLabel.textContent) {
        hgLabel.style.color = '#ffffff';
      }
      if (dutyType === "D" && dLabel.textContent) {
        dLabel.style.color = '#ffffff';
      }
    } else {
      el.classList.remove('pulse');
      el.classList.remove('error');
      
      el.style.setProperty('--pulse-color', 'transparent');
      el.style.background = 'rgba(15, 23, 42, 0.8)';
      el.style.borderColor = 'rgba(56, 189, 248, 0.15)';
      
      el.classList.add('rest');

      if (dLabel.textContent && dLabel.textContent !== "SWP") {
        dLabel.style.color = '#EF4444'; 
      }
      if (hgLabel.textContent && hgLabel.textContent !== "SWP") {
        hgLabel.style.color = '#0EA5E9';
      }
      if (empId === "SWAP") {
        if (dutyType === "HG") hgLabel.textContent = "";
        else dLabel.textContent = "";
      }
    }
  }

  fireMiniMapPulse(isError = false) {
    this.pulses.push({
      progress: 0,
      color: isError ? 'rgba(239, 68, 68, 1)' : this.getPhaseColor(1),
      speed: 0.04 + Math.random() * 0.04,
      direction: Math.random() > 0.5 ? 1 : -1
    });
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId, dutyType = "D") {
    this.pulseCell(dayIdx, "SWAP", true, false, dutyType);
    this.fireMiniMapPulse();
    
    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, newEmpId, false, false, dutyType);
      }
    }, 400);
  }

  triggerAssignment(dayIdx, empId, dutyType = "D") {
    this.pulseCell(dayIdx, empId, true, false, dutyType);
    this.fireMiniMapPulse();
    
    setTimeout(() => {
      if (this.phase !== 'success') {
        this.pulseCell(dayIdx, empId, false, false, dutyType);
      }
    }, 400);
  }

  triggerError(dayIdx, empId, dutyType = "D") {
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
    }, 300);
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
            if (data.duty === "D") {
               cellData.dLabel.textContent = this.getAbbreviation(emp);
               cellData.dLabel.style.color = '#EF4444';
            }
            if (data.duty === "HG") {
               cellData.hgLabel.textContent = this.getAbbreviation(emp);
               cellData.hgLabel.style.color = '#0EA5E9';
            }
          }
        }
      }
    }

    let delay = 0;
    for (const [dayIdx, cellData] of this.cells.entries()) {
      const hasD = cellData.dLabel.textContent !== '';
      const hasHG = cellData.hgLabel.textContent !== '';
      
      if (hasD || hasHG) {
        setTimeout(() => {
          cellData.el.classList.remove('rest');
          cellData.el.classList.add('pulse');
          cellData.el.style.setProperty('--pulse-color', this.getPhaseColor(0.8));
          cellData.el.style.background = this.getPhaseColor(0.2);
          cellData.el.style.borderColor = this.getPhaseColor(0.8);
        }, delay);
        
        setTimeout(() => {
          cellData.el.classList.remove('pulse');
          cellData.el.classList.add('rest');
        }, delay + 600);
        delay += 25;
      }
    }
    
    for (let p = 0; p < 15; p++) {
      setTimeout(() => this.fireMiniMapPulse(), p * 60);
    }
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.renderMiniMap();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  renderMiniMap() {
    if (!this.miniMapCtx || !this.miniMapCanvas.parentElement) return;
    
    const ctx = this.miniMapCtx;
    const parent = this.miniMapCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const pi2 = Math.PI * 2;

    ctx.fillStyle = '#040A15';
    ctx.fillRect(0, 0, w, h);

    const padX = 30;
    const lineY = h / 2;
    const lineLen = w - padX * 2;

    ctx.beginPath();
    ctx.moveTo(padX, lineY);
    ctx.lineTo(w - padX, lineY);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += p.speed;

      if (p.progress >= 1) {
        this.pulses.splice(i, 1);
        continue;
      }

      const x = p.direction === 1 
        ? padX + lineLen * p.progress 
        : (w - padX) - lineLen * p.progress;

      ctx.beginPath();
      ctx.arc(x, lineY, 3, 0, pi2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(padX, lineY, 4, 0, pi2);
    ctx.arc(w - padX, lineY, 4, 0, pi2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.getPhaseColor(0.8);
    ctx.stroke();
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
    this.pulses = [];
  }
}