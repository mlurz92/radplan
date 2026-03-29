const STYLE_ID = 'radplan-neural-graph-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ng-container { 
      --ng-phase-color: #0EA5E9; 
      position: absolute; 
      inset: 16px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
    }
    
    .ng-med-bg { 
      position: absolute; 
      inset: 0; 
      pointer-events: none; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      opacity: 0.15; 
      color: var(--ng-phase-color); 
      transition: color 0.5s; 
    }
    
    .ng-scanner { 
      position: absolute; 
      top: 0; 
      bottom: 0; 
      width: 3px; 
      background: linear-gradient(to bottom, transparent, var(--ng-phase-color), transparent); 
      box-shadow: 0 0 15px var(--ng-phase-color); 
      animation: ngScanMove 3.5s ease-in-out infinite alternate; 
      z-index: 5; 
      pointer-events: none; 
      opacity: 0.6; 
      transition: background 0.5s, box-shadow 0.5s; 
    }
    
    @keyframes ngScanMove { 
      0% { left: 0%; opacity: 0; } 
      10% { opacity: 0.8; } 
      90% { opacity: 0.8; } 
      100% { left: 100%; opacity: 0; } 
    }

    .ng-grid { 
      display: grid; 
      gap: 4px; 
      width: 100%; 
      height: 100%; 
      position: relative; 
      z-index: 10; 
      align-items: center; 
      justify-items: center; 
    }
    
    .ng-cell { 
      position: relative; 
      width: 60%; 
      height: 60%; 
      max-width: 14px; 
      max-height: 14px; 
      border-radius: 50%; 
      border: 1px solid color-mix(in srgb, var(--ng-phase-color) 30%, transparent); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      transition: all 0.3s ease; 
    }
    
    .ng-cell::after { 
      content: ''; 
      position: absolute; 
      width: 40%; 
      height: 40%; 
      border-radius: 50%; 
      background: color-mix(in srgb, var(--ng-phase-color) 30%, transparent); 
      transition: all 0.3s ease; 
    }
    
    .ng-cell.active { 
      border-color: var(--ng-phase-color); 
      box-shadow: 0 0 10px color-mix(in srgb, var(--ng-phase-color) 60%, transparent); 
      transform: scale(1.3); 
      z-index: 2; 
    }
    
    .ng-cell.active::after { 
      background: var(--ng-phase-color); 
      box-shadow: 0 0 8px var(--ng-phase-color); 
      transform: scale(1.5); 
    }
    
    .ng-cell.swap-old { 
      border-color: #EF4444; 
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); 
      transform: scale(0.9); 
    }
    
    .ng-cell.swap-old::after { background: #EF4444; }
    
    .ng-cell.swap-new { 
      border-color: #A855F7; 
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.6); 
      transform: scale(1.3); 
      z-index: 3; 
    }
    
    .ng-cell.swap-new::after { background: #A855F7; }
    
    .ng-cell.error { 
      border-color: #EF4444; 
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); 
      animation: ngGlitch 0.3s cubic-bezier(.34,1.2,.64,1); 
      z-index: 4; 
    }
    
    .ng-cell.error::after { background: #EF4444; }
    
    .ng-cell.success { 
      border-color: #22C55E !important; 
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.5) !important; 
      transform: scale(1.1); 
    }
    
    .ng-cell.success::after { background: #22C55E !important; }

    @keyframes ngGlitch {
      0% { transform: translate(0, 0) scale(1.2); }
      20% { transform: translate(-2px, 2px) scale(1.2); }
      40% { transform: translate(2px, -2px) scale(1.2); }
      60% { transform: translate(-2px, -2px) scale(1.2); }
      80% { transform: translate(2px, 2px) scale(1.2); }
      100% { transform: translate(0, 0) scale(1); }
    }

    .ng-line { 
      stroke-dasharray: 1000; 
      stroke-dashoffset: 1000; 
      animation: ngLineAnim 0.35s cubic-bezier(.34,1.2,.64,1) forwards; 
    }
    
    @keyframes ngLineAnim { to { stroke-dashoffset: 0; } }

    /* Tech Minimap Styles */
    .ng-tech-spectacle { 
      width: 100%; 
      height: 100%; 
      position: relative; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: radial-gradient(circle at center, color-mix(in srgb, var(--ng-phase-color) 15%, transparent) 0%, transparent 60%); 
      color: var(--ng-phase-color); 
      transition: color 0.5s; 
    }
    
    .ng-tech-svg { 
      width: 85%; 
      height: 85%; 
      transform-origin: center; 
      overflow: visible; 
    }
    
    .ng-ring-calib { 
      fill: none; 
      stroke: currentColor; 
      stroke-width: 0.5; 
      stroke-dasharray: 2 4; 
      opacity: 0.6; 
      animation: ngSpin 15s linear infinite; 
      transform-origin: 50px 50px; 
    }
    
    .ng-ring-track { 
      fill: none; 
      stroke: currentColor; 
      stroke-width: 1.5; 
      stroke-dasharray: 10 15 40 5; 
      opacity: 0.8; 
      animation: ngSpin 8s linear infinite reverse; 
      transform-origin: 50px 50px; 
    }
    
    .ng-ring-core { 
      fill: none; 
      stroke: currentColor; 
      stroke-width: 3; 
      stroke-dasharray: 2 6; 
      opacity: 0.9; 
      animation: ngSpin 4s linear infinite; 
      transform-origin: 50px 50px; 
    }
    
    .ng-ring-center { 
      fill: currentColor; 
      opacity: 0.4; 
      animation: ngPulse 2s ease-in-out infinite; 
      transform-origin: 50px 50px; 
    }
    
    .ng-crosshair { 
      stroke: currentColor; 
      stroke-width: 0.5; 
      opacity: 0.5; 
    }
    
    .ng-tech-overlay { 
      position: absolute; 
      inset: 0; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-family: var(--font-mono); 
      font-size: 8px; 
      font-weight: 700; 
      color: currentColor; 
      pointer-events: none; 
    }
    
    @keyframes ngSpin { 100% { transform: rotate(360deg); } }
    @keyframes ngPulse { 
      0%, 100% { transform: scale(1); opacity: 0.4; } 
      50% { transform: scale(1.5); opacity: 0.8; } 
    }
    
    .ng-tech-spectacle.success .ng-ring-calib, 
    .ng-tech-spectacle.success .ng-ring-track, 
    .ng-tech-spectacle.success .ng-ring-core { 
      animation-play-state: paused; 
    }
    
    .ng-tech-spectacle.success .ng-ring-center { 
      animation: none; 
      transform: scale(1.3); 
      opacity: 1; 
    }
  `;
  document.head.appendChild(style);
}

export class NeuralGraph {
  constructor(container) {
    this.container = container;
    this.cells = new Map();
    this.activeCells = new Set();
    this.timeouts = new Set();
    this.employees = [];
    this.daysCount = 0;
    this.miniMapContainer = null;
    this.phaseColors = {
      init: '#0EA5E9',
      greedy: '#FBBF24',
      hg: '#38BDF8',
      deep: '#A855F7',
      success: '#22C55E'
    };
    injectStyles();
    this.buildDOM();
  }

  buildDOM() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ng-container';
    
    // Abstract Medical / Neural Background
    const bg = document.createElement('div');
    bg.className = 'ng-med-bg';
    bg.innerHTML = `
      <svg viewBox="0 0 200 200" style="width: 80%; height: 80%; max-height: 100%;">
        <path d="M100 20 C 40 20, 20 60, 20 100 C 20 140, 45 170, 70 180 C 85 185, 95 175, 100 170 C 105 175, 115 185, 130 180 C 155 170, 180 140, 180 100 C 180 60, 160 20, 100 20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" />
        <path d="M100 40 C 55 40, 40 70, 40 100 C 40 130, 60 150, 80 160 C 90 165, 95 155, 100 150 C 105 155, 110 165, 120 160 C 140 150, 160 130, 160 100 C 160 70, 145 40, 100 40 Z" fill="none" stroke="currentColor" stroke-width="1" />
        <circle cx="60" cy="80" r="3" fill="currentColor" />
        <circle cx="85" cy="65" r="4" fill="currentColor" />
        <circle cx="115" cy="65" r="4" fill="currentColor" />
        <circle cx="140" cy="80" r="3" fill="currentColor" />
        <circle cx="75" cy="115" r="5" fill="currentColor" />
        <circle cx="125" cy="115" r="5" fill="currentColor" />
        <circle cx="100" cy="135" r="3" fill="currentColor" />
        <line x1="60" y1="80" x2="85" y2="65" stroke="currentColor" stroke-width="1" />
        <line x1="85" y1="65" x2="115" y2="65" stroke="currentColor" stroke-width="1" />
        <line x1="115" y1="65" x2="140" y2="80" stroke="currentColor" stroke-width="1" />
        <line x1="85" y1="65" x2="75" y2="115" stroke="currentColor" stroke-width="1" />
        <line x1="115" y1="65" x2="125" y2="115" stroke="currentColor" stroke-width="1" />
        <line x1="75" y1="115" x2="100" y2="135" stroke="currentColor" stroke-width="1" />
        <line x1="125" y1="115" x2="100" y2="135" stroke="currentColor" stroke-width="1" />
        <line x1="75" y1="115" x2="125" y2="115" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </svg>
    `;
    this.wrapper.appendChild(bg);
    
    // MRI Scan Line Overlay
    const scanner = document.createElement('div');
    scanner.className = 'ng-scanner';
    this.wrapper.appendChild(scanner);
    
    this.grid = document.createElement('div');
    this.grid.className = 'ng-grid';
    this.wrapper.appendChild(this.grid);
    
    this.svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgOverlay.style.position = "absolute";
    this.svgOverlay.style.inset = "0";
    this.svgOverlay.style.width = "100%";
    this.svgOverlay.style.height = "100%";
    this.svgOverlay.style.pointerEvents = "none";
    this.svgOverlay.style.zIndex = "20";
    this.wrapper.appendChild(this.svgOverlay);
    
    this.container.appendChild(this.wrapper);
  }

  initData(daysCount, employees) {
    this.daysCount = daysCount;
    this.employees = employees;
    this.grid.style.gridTemplateColumns = `repeat(${daysCount}, 1fr)`;
    this.grid.style.gridTemplateRows = `repeat(${employees.length}, 1fr)`;
    this.grid.innerHTML = '';
    this.cells.clear();
    this.activeCells.clear();

    for (let eIdx = 0; eIdx < employees.length; eIdx++) {
      for (let dIdx = 1; dIdx <= daysCount; dIdx++) {
        const cell = document.createElement('div');
        cell.className = 'ng-cell';
        const key = `${dIdx}_${employees[eIdx]}`;
        this.cells.set(key, cell);
        this.grid.appendChild(cell);
      }
    }
  }

  attachMiniMap(container) {
    this.miniMapContainer = container;
    this.miniMapContainer.innerHTML = `
      <div class="ng-tech-spectacle" id="ng-minimap-core">
        <svg viewBox="0 0 100 100" class="ng-tech-svg">
          <circle cx="50" cy="50" r="48" class="ng-ring-calib" />
          <circle cx="50" cy="50" r="38" class="ng-ring-track" />
          <circle cx="50" cy="50" r="22" class="ng-ring-core" />
          <circle cx="50" cy="50" r="10" class="ng-ring-center" />
          <path d="M50,0 L50,15 M50,85 L50,100 M0,50 L15,50 M85,50 L100,50" class="ng-crosshair" />
        </svg>
        <div class="ng-tech-overlay">
          <div>SEQ/DAT</div>
        </div>
      </div>
    `;
  }

  triggerAssignment(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const cell = this.cells.get(key);
    if (!cell) return;

    cell.classList.add('active');
    this.activeCells.add(key);
  }

  triggerSwap(dayIdx, oldEmpId, newEmpId) {
    const oldKey = `${dayIdx}_${oldEmpId}`;
    const newKey = `${dayIdx}_${newEmpId}`;
    const oldCell = this.cells.get(oldKey);
    const newCell = this.cells.get(newKey);

    if (oldCell) {
      oldCell.classList.remove('active');
      oldCell.classList.add('swap-old');
      this.activeCells.delete(oldKey);
      const t1 = setTimeout(() => {
        if (this.cells.has(oldKey)) oldCell.classList.remove('swap-old');
      }, 300);
      this.timeouts.add(t1);
    }

    if (oldCell && newCell && this.svgOverlay) {
      const r1 = oldCell.getBoundingClientRect();
      const r2 = newCell.getBoundingClientRect();
      const svgRect = this.svgOverlay.getBoundingClientRect();

      const x1 = r1.left + r1.width / 2 - svgRect.left;
      const y1 = r1.top + r1.height / 2 - svgRect.top;
      const x2 = r2.left + r2.width / 2 - svgRect.left;
      const y2 = r2.top + r2.height / 2 - svgRect.top;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", this.phaseColors.deep);
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      line.classList.add("ng-line");
      
      this.svgOverlay.appendChild(line);
      const t2 = setTimeout(() => {
        if (this.svgOverlay && this.svgOverlay.contains(line)) {
          this.svgOverlay.removeChild(line);
        }
      }, 350);
      this.timeouts.add(t2);
    }

    if (newCell) {
      newCell.classList.add('swap-new');
      this.activeCells.add(newKey);
      const t3 = setTimeout(() => {
        if (this.cells.has(newKey)) {
          newCell.classList.remove('swap-new');
          newCell.classList.add('active');
        }
      }, 300);
      this.timeouts.add(t3);
    }
  }

  triggerError(dayIdx, empId) {
    const key = `${dayIdx}_${empId}`;
    const cell = this.cells.get(key);
    if (!cell) return;

    cell.classList.add('error');
    const t = setTimeout(() => {
      if (this.cells.has(key)) cell.classList.remove('error');
    }, 300);
    this.timeouts.add(t);
  }

  setPhase(phase) {
    const color = this.phaseColors[phase] || this.phaseColors.init;
    if (this.wrapper) {
      this.wrapper.style.setProperty('--ng-phase-color', color);
    }
  }

  triggerSuccess() {
    this.setPhase('success');
    const mm = document.getElementById('ng-minimap-core');
    if (mm) mm.classList.add('success');

    this.activeCells.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.classList.add('success');
      }
    });
  }

  dispose() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
    if (this.container) this.container.innerHTML = '';
    if (this.miniMapContainer) this.miniMapContainer.innerHTML = '';
    this.cells.clear();
    this.activeCells.clear();
  }
}
