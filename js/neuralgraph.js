const STYLE_ID = 'radplan-neural-graph-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ng-container { position: absolute; inset: 16px; display: flex; align-items: center; justify-content: center; }
    .ng-grid { display: grid; gap: 3px; width: 100%; height: 100%; position: relative; z-index: 1; }
    .ng-cell { background: rgba(56, 189, 248, 0.04); border-radius: 2px; transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease; position: relative; }
    .ng-cell.active { background: rgba(14, 165, 233, 0.8); box-shadow: 0 0 10px rgba(14, 165, 233, 0.5); transform: scale(1.15); z-index: 2; }
    .ng-cell.swap-old { background: rgba(239, 68, 68, 0.9); box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); transform: scale(0.9); }
    .ng-cell.swap-new { background: rgba(168, 85, 247, 0.9); box-shadow: 0 0 15px rgba(168, 85, 247, 0.6); transform: scale(1.25); z-index: 3; }
    .ng-cell.error { background: rgba(239, 68, 68, 1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); animation: ngGlitch 0.3s cubic-bezier(.34,1.2,.64,1); z-index: 4; }
    .ng-cell.success { background: rgba(34, 197, 94, 0.9) !important; box-shadow: 0 0 12px rgba(34, 197, 94, 0.5) !important; transform: scale(1.05); }
    @keyframes ngGlitch {
      0% { transform: translate(0, 0) scale(1.2); }
      20% { transform: translate(-3px, 2px) scale(1.2); }
      40% { transform: translate(3px, -2px) scale(1.2); }
      60% { transform: translate(-3px, -2px) scale(1.2); }
      80% { transform: translate(3px, 2px) scale(1.2); }
      100% { transform: translate(0, 0) scale(1); }
    }
    .ng-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: ngLineAnim 0.35s cubic-bezier(.34,1.2,.64,1) forwards; }
    @keyframes ngLineAnim { to { stroke-dashoffset: 0; } }
    .ng-minimap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
    .ng-ring { position: absolute; border-radius: 50%; border: 2px solid transparent; transition: border-color 0.5s ease; }
    .ng-ring-1 { width: 90%; height: 90%; border-top-color: #0EA5E9; border-bottom-color: #0EA5E9; border-width: 1px; animation: ngSpin 3s linear infinite; }
    .ng-ring-2 { width: 70%; height: 70%; border-left-color: #0EA5E9; border-right-color: rgba(14,165,233,0.3); border-width: 2px; animation: ngSpin 2s linear infinite reverse; }
    .ng-ring-3 { width: 45%; height: 45%; border-color: rgba(14,165,233,0.6); border-style: dashed; border-width: 2px; animation: ngSpin 4s linear infinite; }
    .ng-core { width: 12%; height: 12%; background: #0EA5E9; border-radius: 50%; box-shadow: 0 0 15px #0EA5E9; animation: ngPulse 1.5s ease-in-out infinite; transition: background 0.5s ease, box-shadow 0.5s ease; }
    @keyframes ngSpin { 100% { transform: rotate(360deg); } }
    @keyframes ngPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.4); opacity: 1; } }
    .ng-minimap.success .ng-ring { animation-play-state: paused; }
    .ng-minimap.success .ng-core { animation: none; transform: scale(1.2); }
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
    
    this.grid = document.createElement('div');
    this.grid.className = 'ng-grid';
    this.wrapper.appendChild(this.grid);
    
    this.svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgOverlay.style.position = "absolute";
    this.svgOverlay.style.inset = "0";
    this.svgOverlay.style.width = "100%";
    this.svgOverlay.style.height = "100%";
    this.svgOverlay.style.pointerEvents = "none";
    this.svgOverlay.style.zIndex = "10";
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
      <div class="ng-minimap" id="ng-minimap-core">
        <div class="ng-ring ng-ring-1"></div>
        <div class="ng-ring ng-ring-2"></div>
        <div class="ng-ring ng-ring-3"></div>
        <div class="ng-core"></div>
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
    if (!this.miniMapContainer) return;
    const color = this.phaseColors[phase] || this.phaseColors.init;
    const r1 = this.miniMapContainer.querySelector('.ng-ring-1');
    const r2 = this.miniMapContainer.querySelector('.ng-ring-2');
    const r3 = this.miniMapContainer.querySelector('.ng-ring-3');
    const core = this.miniMapContainer.querySelector('.ng-core');

    if (r1) { r1.style.borderTopColor = color; r1.style.borderBottomColor = color; }
    if (r2) { r2.style.borderLeftColor = color; r2.style.borderRightColor = `${color}4D`; }
    if (r3) { r3.style.borderColor = `${color}99`; }
    if (core) { core.style.background = color; core.style.boxShadow = `0 0 15px ${color}`; }
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
