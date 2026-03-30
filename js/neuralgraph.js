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
      perspective: 1500px;
      background: transparent;
    }
    .ng-grid-base {
      display: grid;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1);
      transform-origin: center center;
      will-change: transform;
    }
    .ng-iso-cell {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      transform-style: preserve-3d;
      transition: all 0.4s cubic-bezier(0.34, 1.5, 0.64, 1);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      will-change: transform, background-color;
    }
    .ng-iso-shadow {
      position: absolute;
      inset: -1px;
      background: transparent;
      transition: box-shadow 0.4s, background 0.4s;
      transform: translateZ(-1px);
      border-radius: 3px;
      pointer-events: none;
    }
    .ng-iso-label {
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.15);
      transition: color 0.4s;
      transform: translateZ(1px);
      pointer-events: none;
      user-select: none;
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
    this.miniMapCanvas = null;
    this.miniMapCtx = null;
    this.nodes = [];
    this.links = [];
    this.pulses = [];
    this.animId = null;
    this.resizeObserver = null;
    this.gridBase = null;
    this.cellSize = 26;
    this.cellGap = 6;
    
    injectStyles();
    this.buildDOM();
    this.setupResizeObserver();
  }

  buildDOM() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ng-container';
    this.gridBase = document.createElement('div');
    this.gridBase.className = 'ng-grid-base';
    this.wrapper.appendChild(this.gridBase);
    this.container.appendChild(this.wrapper);
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateGridScale();
      this.resizeMiniMap();
    });
    this.resizeObserver.observe(this.container);
  }

  updateGridScale() {
    if (!this.daysCount || !this.employees.length || !this.gridBase) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    
    const gridW = this.daysCount * (this.cellSize + this.cellGap) - this.cellGap;
    const gridH = this.employees.length * (this.cellSize + this.cellGap) - this.cellGap;
    
    const boundingW = gridW * 0.866 + gridH * 0.866;
    const boundingH = gridW * 0.5 + gridH * 0.5;
    
    const scaleX = (w * 0.9) / boundingW;
    const scaleY = (h * 0.9) / boundingH;
    const scale = Math.min(scaleX, scaleY, 1.5);
    
    this.gridBase.style.transform = `scale(${scale}) rotateX(60deg) rotateZ(-45deg)`;
  }

  initData(daysCount, employees) {
    this.daysCount = daysCount;
    this.employees = employees;
    this.gridBase.innerHTML = '';
    this.cells.clear();

    this.gridBase.style.gridTemplateColumns = `repeat(${daysCount}, ${this.cellSize}px)`;
    this.gridBase.style.gridTemplateRows = `repeat(${employees.length}, ${this.cellSize}px)`;
    this.gridBase.style.gap = `${this.cellGap}px`;

    for (let r = 0; r < employees.length; r++) {
      for (let c = 0; c < daysCount; c++) {
        const cell = document.createElement('div');
        cell.className = 'ng-iso-cell';
        
        const shadow = document.createElement('div');
        shadow.className = 'ng-iso-shadow';
        
        const label = document.createElement('div');
        label.className = 'ng-iso-label';
        
        const nameParts = employees[r].split(' ');
        const shortName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : employees[r];
        label.textContent = shortName.substring(0, 2).toUpperCase();
        
        cell.appendChild(shadow);
        cell.appendChild(label);
        this.gridBase.appendChild(cell);
        
        const key = `${c + 1}_${employees[r]}`;
        this.cells.set(key, { el: cell, shadow, label });
      }
    }
    this.updateGridScale();
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
    this.initNeuralNetwork();
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
    this.initNeuralNetwork(w, h);
  }

  initNeuralNetwork(w = 180, h = 85) {
    this.nodes = [];
    this.links = [];
    this.pulses = [];
    
    const layers = [3, 4, 2];
    const padX = 25;
    const padY = 15;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    layers.forEach((nodeCount, layerIdx) => {
      const x = padX + (layerIdx / (layers.length - 1)) * usableW;
      const spacingY = nodeCount > 1 ? usableH / (nodeCount - 1) : 0;
      
      for (let i = 0; i < nodeCount; i++) {
        const y = nodeCount === 1 ? h / 2 : padY + i * spacingY;
        this.nodes.push({
          id: `${layerIdx}-${i}`,
          layer: layerIdx,
          x: x,
          y: y
        });
      }
    });

    for (let l = 0; l < layers.length - 1; l++) {
      const currentLayer = this.nodes.filter(n => n.layer === l);
      const nextLayer = this.nodes.filter(n => n.layer === l + 1);
      
      currentLayer.forEach(n1 => {
        nextLayer.forEach(n2 => {
          this.links.push({ source: n1, target: n2 });
        });
      });
    }
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

  pulseCell(dayIdx, empId, isActive, isError = false) {
    const key = `${dayIdx}_${empId}`;
    const cellData = this.cells.get(key);
    if (!cellData) return;
    
    const { el, shadow, label } = cellData;

    if (isActive) {
      const color = isError ? this.getPhaseColor(1) : this.getPhaseColor(0.8);
      const shadowColor = isError ? this.getPhaseColor(0.5) : this.getPhaseColor(0.3);
      
      el.style.transform = isError ? 'translateZ(30px) scale(1.05)' : 'translateZ(20px)';
      el.style.background = color;
      el.style.borderColor = color;
      shadow.style.boxShadow = `0 10px 20px ${shadowColor}`;
      label.style.color = '#ffffff';
    } else {
      el.style.transform = 'translateZ(0px)';
      el.style.background = 'rgba(255, 255, 255, 0.04)';
      el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      shadow.style.boxShadow = 'none';
      label.style.color = 'rgba(255, 255, 255, 0.15)';
    }
  }

  fireMiniMapPulse(isError = false) {
    if (this.links.length === 0) return;
    const link = this.links[Math.floor(Math.random() * this.links.length)];
    this.pulses.push({
      link: link,
      progress: 0,
      color: isError ? 'rgba(239, 68, 68, 1)' : this.getPhaseColor(1),
      speed: 0.06 + Math.random() * 0.04
    });
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId) {
    this.pulseCell(dayIdx, oldEmpId, false);
    this.pulseCell(dayIdx, newEmpId, true);
    this.fireMiniMapPulse();
    this.fireMiniMapPulse();
  }

  triggerAssignment(dayIdx, empId) {
    this.pulseCell(dayIdx, empId, true);
    this.fireMiniMapPulse();
  }

  triggerError(dayIdx, empId) {
    const oldPhase = this.phase;
    this.phase = 'error';
    this.pulseCell(dayIdx, empId, true, true);
    this.fireMiniMapPulse(true);
    
    setTimeout(() => {
      this.phase = oldPhase;
      this.pulseCell(dayIdx, empId, false);
    }, 200);
  }

  setPhase(phase) {
    this.phase = phase;
  }

  triggerSuccess() {
    this.phase = 'success';
    let i = 0;
    for (const [key, cellData] of this.cells.entries()) {
      if (cellData.el.style.transform.includes('translateZ')) {
        setTimeout(() => {
          cellData.el.style.background = this.getPhaseColor(0.9);
          cellData.el.style.borderColor = this.getPhaseColor(1);
          cellData.shadow.style.boxShadow = `0 10px 20px ${this.getPhaseColor(0.4)}`;
        }, (i % 30) * 15);
      }
      i++;
    }
    
    for (let p = 0; p < 20; p++) {
      setTimeout(() => this.fireMiniMapPulse(), p * 80);
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
    const w = this.miniMapCanvas.parentElement.clientWidth;
    const h = this.miniMapCanvas.parentElement.clientHeight;

    ctx.fillStyle = '#040A15';
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    this.links.forEach(link => {
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();
    });

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.progress += p.speed;

      if (p.progress >= 1) {
        this.pulses.splice(i, 1);
        continue;
      }

      const curX = p.link.source.x + (p.link.target.x - p.link.source.x) * p.progress;
      const curY = p.link.source.y + (p.link.target.y - p.link.source.y) * p.progress;

      ctx.beginPath();
      ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    this.nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = this.getPhaseColor(0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = this.getPhaseColor(1);
      ctx.fill();
    });
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
    if (this.container) this.container.innerHTML = '';
    if (this.miniMapContainer) this.miniMapContainer.innerHTML = '';
    this.cells.clear();
    this.nodes = [];
    this.links = [];
    this.pulses = [];
  }
}