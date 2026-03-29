const STYLE_ID = 'radplan-neural-graph-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ng-container {
      --ng-phase-color: #0EA5E9;
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .ng-grid-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .ng-grid {
      display: grid;
      width: 100%;
      height: 100%;
      position: relative;
      z-index: 10;
    }
    .ng-bg-svg, .ng-fg-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .ng-bg-svg {
      z-index: 5;
    }
    .ng-fg-svg {
      z-index: 15;
    }
    .ng-net-line {
      stroke: rgba(14, 165, 233, 0.12);
      stroke-width: 1;
      transition: stroke 0.4s;
    }
    .ng-cell {
      width: 5px;
      height: 5px;
      background: rgba(14, 165, 233, 0.2);
      border-radius: 50%;
      justify-self: center;
      align-self: center;
      transition: all 0.25s cubic-bezier(0.34, 1.2, 0.64, 1);
      position: relative;
    }
    .ng-cell.active {
      background: var(--ng-phase-color);
      box-shadow: 0 0 12px var(--ng-phase-color);
      transform: scale(1.8);
      z-index: 11;
    }
    .ng-cell.swap-old {
      background: #EF4444;
      box-shadow: 0 0 10px #EF4444;
      transform: scale(0.8);
    }
    .ng-cell.swap-new {
      background: #A855F7;
      box-shadow: 0 0 15px #A855F7;
      transform: scale(2);
      z-index: 12;
    }
    .ng-cell.error {
      background: #EF4444;
      box-shadow: 0 0 20px #EF4444;
      animation: ngGlitch 0.2s infinite;
      z-index: 20;
    }
    .ng-cell.error-neighbor {
      background: rgba(239, 68, 68, 0.6);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
      animation: ngGlitch 0.2s infinite reverse;
      z-index: 19;
    }
    .ng-impulse {
      fill: var(--ng-phase-color);
      filter: drop-shadow(0 0 6px var(--ng-phase-color));
      transition: all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
    }
    @keyframes ngGlitch {
      0% { transform: translate(0, 0) scale(1.5); filter: blur(0px); }
      25% { transform: translate(-3px, 2px) scale(1.2); filter: blur(1px); }
      50% { transform: translate(2px, -3px) scale(1.6); filter: blur(0px); }
      75% { transform: translate(-2px, -2px) scale(1.3); filter: blur(2px); }
      100% { transform: translate(0, 0) scale(1.5); filter: blur(0px); }
    }
    .ng-cell.success {
      background: #22C55E !important;
      box-shadow: 0 0 10px #22C55E !important;
      transform: scale(1.4);
    }
    .ng-brain-spectacle {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ng-brain-svg {
      width: 85%;
      height: 85%;
      filter: drop-shadow(0 0 10px rgba(14, 165, 233, 0.15));
      transform-origin: center;
    }
    .ng-lobe {
      fill: transparent;
      stroke: rgba(14, 165, 233, 0.25);
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-linecap: round;
      transition: all 0.4s ease;
      transform-origin: center;
    }
    .ng-brain-core {
      fill: rgba(14, 165, 233, 0.25);
      transition: all 0.4s ease;
      transform-origin: center;
    }
    .ng-lobe.active {
      fill: color-mix(in srgb, var(--ng-phase-color) 35%, transparent);
      stroke: var(--ng-phase-color);
      filter: drop-shadow(0 0 8px var(--ng-phase-color));
      animation: ngBrainPulse 1.2s infinite alternate;
    }
    .ng-brain-core.active {
      fill: var(--ng-phase-color);
      filter: drop-shadow(0 0 12px var(--ng-phase-color));
      animation: ngBrainPulse 0.8s infinite alternate;
    }
    .ng-brain-spectacle.success .ng-lobe {
      fill: rgba(34, 197, 94, 0.35);
      stroke: #22C55E;
      filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6));
      animation: none;
    }
    .ng-brain-spectacle.success .ng-brain-core {
      fill: #22C55E;
      filter: drop-shadow(0 0 15px #22C55E);
      animation: none;
    }
    @keyframes ngBrainPulse {
      0% { opacity: 0.6; transform: scale(0.98); }
      100% { opacity: 1; transform: scale(1.03); }
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
    this.wrapper.setAttribute('class', 'ng-container');
    
    this.gridWrapper = document.createElement('div');
    this.gridWrapper.setAttribute('class', 'ng-grid-wrapper');
    
    this.bgSvgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.bgSvgOverlay.setAttribute('class', 'ng-bg-svg');
    
    this.fgSvgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.fgSvgOverlay.setAttribute('class', 'ng-fg-svg');
    
    this.grid = document.createElement('div');
    this.grid.setAttribute('class', 'ng-grid');
    
    this.gridWrapper.appendChild(this.bgSvgOverlay);
    this.gridWrapper.appendChild(this.grid);
    this.gridWrapper.appendChild(this.fgSvgOverlay);
    
    this.wrapper.appendChild(this.gridWrapper);
    this.container.appendChild(this.wrapper);
  }

  initData(daysCount, employees) {
    this.daysCount = daysCount;
    this.employees = employees;
    this.grid.style.gridTemplateColumns = `repeat(${daysCount}, 1fr)`;
    this.grid.style.gridTemplateRows = `repeat(${employees.length}, 1fr)`;
    this.grid.innerHTML = '';
    this.bgSvgOverlay.innerHTML = '';
    this.fgSvgOverlay.innerHTML = '';
    this.cells.clear();
    this.activeCells.clear();

    for (let r = 0; r < employees.length; r++) {
      for (let c = 0; c < daysCount; c++) {
        const cell = document.createElement('div');
        cell.setAttribute('class', 'ng-cell');
        const key = `${c + 1}_${employees[r]}`;
        this.cells.set(key, cell);
        this.grid.appendChild(cell);

        const x1 = ((c + 0.5) / daysCount) * 100;
        const y1 = ((r + 0.5) / employees.length) * 100;

        if (c < daysCount - 1) {
          const x2 = ((c + 1.5) / daysCount) * 100;
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", `${x1}%`);
          line.setAttribute("y1", `${y1}%`);
          line.setAttribute("x2", `${x2}%`);
          line.setAttribute("y2", `${y1}%`);
          line.classList.add("ng-net-line");
          this.bgSvgOverlay.appendChild(line);
        }

        if (r < employees.length - 1) {
          const y2 = ((r + 1.5) / employees.length) * 100;
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", `${x1}%`);
          line.setAttribute("y1", `${y1}%`);
          line.setAttribute("x2", `${x1}%`);
          line.setAttribute("y2", `${y2}%`);
          line.classList.add("ng-net-line");
          this.bgSvgOverlay.appendChild(line);
        }
      }
    }
  }

  attachMiniMap(container) {
    this.miniMapContainer = container;
    this.miniMapContainer.innerHTML = `
      <div class="ng-brain-spectacle" id="ng-minimap-core">
        <svg viewBox="0 0 100 100" class="ng-brain-svg">
          <path class="ng-lobe ng-frontal-l" d="M 48 10 C 20 10 10 25 10 45 L 48 45 Z" />
          <path class="ng-lobe ng-frontal-r" d="M 52 10 C 80 10 90 25 90 45 L 52 45 Z" />
          <path class="ng-lobe ng-parietal-l" d="M 10 48 L 48 48 L 48 70 C 30 70 15 65 10 48 Z" />
          <path class="ng-lobe ng-parietal-r" d="M 90 48 L 52 48 L 52 70 C 70 70 85 65 90 48 Z" />
          <path class="ng-lobe ng-occipital-l" d="M 48 73 C 35 73 25 78 20 85 C 30 95 45 95 48 90 Z" />
          <path class="ng-lobe ng-occipital-r" d="M 52 73 C 65 73 75 78 80 85 C 70 95 55 95 52 90 Z" />
          <ellipse cx="50" cy="48" rx="2" ry="10" class="ng-brain-core" />
        </svg>
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

    const c = dayIdx - 1;
    const oldR = this.employees.indexOf(oldEmpId);
    const newR = this.employees.indexOf(newEmpId);

    if (oldCell) {
      oldCell.classList.remove('active');
      oldCell.classList.add('swap-old');
      this.activeCells.delete(oldKey);
      const t1 = setTimeout(() => {
        if (this.cells.has(oldKey)) oldCell.classList.remove('swap-old');
      }, 300);
      this.timeouts.add(t1);
    }

    if (c >= 0 && oldR >= 0 && newR >= 0) {
      const x = ((c + 0.5) / this.daysCount) * 100;
      const yOld = ((oldR + 0.5) / this.employees.length) * 100;
      const yNew = ((newR + 0.5) / this.employees.length) * 100;

      const impulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      impulse.setAttribute("r", "4");
      impulse.setAttribute("cx", `${x}%`);
      impulse.setAttribute("cy", `${yOld}%`);
      impulse.classList.add("ng-impulse");
      this.fgSvgOverlay.appendChild(impulse);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          impulse.setAttribute("cy", `${yNew}%`);
        });
      });

      const t2 = setTimeout(() => {
        if (this.fgSvgOverlay.contains(impulse)) {
          this.fgSvgOverlay.removeChild(impulse);
        }
      }, 300);
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

    const c = dayIdx - 1;
    const r = this.employees.indexOf(empId);
    
    const neighbors = [
      [c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]
    ];
    
    const neighborCells = [];
    
    neighbors.forEach(([nc, nr]) => {
      if (nc >= 0 && nc < this.daysCount && nr >= 0 && nr < this.employees.length) {
        const nKey = `${nc + 1}_${this.employees[nr]}`;
        const nCell = this.cells.get(nKey);
        if (nCell) {
          nCell.classList.add('error-neighbor');
          neighborCells.push(nCell);
        }
      }
    });

    const t = setTimeout(() => {
      if (this.cells.has(key)) cell.classList.remove('error');
      neighborCells.forEach(n => n.classList.remove('error-neighbor'));
    }, 250);
    this.timeouts.add(t);
  }

  setPhase(phase) {
    const color = this.phaseColors[phase] || this.phaseColors.init;
    if (this.wrapper) {
      this.wrapper.style.setProperty('--ng-phase-color', color);
    }
    
    if (!this.miniMapContainer) return;
    
    const allComponents = this.miniMapContainer.querySelectorAll('.ng-lobe, .ng-brain-core');
    allComponents.forEach(el => el.classList.remove('active'));

    if (phase === 'init') {
      this.miniMapContainer.querySelectorAll('.ng-brain-core').forEach(el => el.classList.add('active'));
    } else if (phase === 'greedy') {
      this.miniMapContainer.querySelectorAll('.ng-frontal-l, .ng-frontal-r').forEach(el => el.classList.add('active'));
    } else if (phase === 'hg') {
      this.miniMapContainer.querySelectorAll('.ng-parietal-l, .ng-parietal-r').forEach(el => el.classList.add('active'));
    } else if (phase === 'deep') {
      this.miniMapContainer.querySelectorAll('.ng-occipital-l, .ng-occipital-r').forEach(el => el.classList.add('active'));
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
