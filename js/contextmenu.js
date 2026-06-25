/**
 * RadPlan — Kontextmenü-System
 * Implementiert eine elegante, glassmorphism-basierte Oberfläche für Zeilenaktionen.
 */

export class ContextMenu {
  constructor() {
    this.el = null;
    this.visible = false;
    this.activeTarget = null;
    this.init();
  }

  init() {
    // Create element if not exists
    let el = document.getElementById("rp-context-menu");
    if (!el) {
      el = document.createElement("div");
      el.id = "rp-context-menu";
      el.className = "context-menu";
      document.body.appendChild(el);
    }
    this.el = el;
    this.el.setAttribute("role", "menu");

    // Listen for global click to close
    window.addEventListener(
      "click",
      (e) => {
        if (this.visible && !this.el.contains(e.target)) {
          this.hide();
        }
      },
      { capture: true }
    );

    window.addEventListener("scroll", () => this.hide(), { passive: true });
    window.addEventListener("resize", () => this.hide(), { passive: true });

    // Prepare keydown handler reference for dynamic binding
    this._keydownHandler = (e) => this.handleKeydown(e);
  }

  show(x, y, items, target = null) {
    this.activeTarget = target;
    this.render(items);

    // Position
    const menuWidth = 200; // estimated
    const menuHeight = items.length * 35; // estimated

    let left = x;
    let top = y;

    // Boundary check
    if (x + menuWidth > window.innerWidth) {
      left = x - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      top = y - menuHeight;
    }

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;

    // Bind keydown listener
    document.addEventListener("keydown", this._keydownHandler);

    // Animate in
    requestAnimationFrame(() => {
      this.el.classList.add("visible");
      this.visible = true;

      // Focus first item for keyboard navigation
      const firstItem = this.el.querySelector(".context-menu-item");
      if (firstItem) {
        firstItem.focus();
      }
    });
  }

  hide() {
    if (!this.visible) return;
    this.el.classList.remove("visible");
    this.visible = false;

    // Unbind keydown listener
    document.removeEventListener("keydown", this._keydownHandler);

    // Restore focus to active target
    if (this.activeTarget) {
      this.activeTarget.focus();
    }
    this.activeTarget = null;
  }

  handleKeydown(e) {
    if (!this.visible) return;

    if (e.key === "Escape") {
      e.preventDefault();
      this.hide();
      return;
    }

    const items = Array.from(this.el.querySelectorAll(".context-menu-item"));
    if (items.length === 0) return;

    const activeIdx = items.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = activeIdx === -1 ? 0 : (activeIdx + 1) % items.length;
      items[nextIdx].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = activeIdx === -1 ? items.length - 1 : (activeIdx - 1 + items.length) % items.length;
      items[prevIdx].focus();
    } else if (e.key === "Enter") {
      if (activeIdx !== -1) {
        e.preventDefault();
        items[activeIdx].click();
      }
    }
  }

  render(items) {
    this.el.innerHTML = "";

    items.forEach((item) => {
      if (item.type === "divider") {
        const div = document.createElement("div");
        div.className = "context-menu-divider";
        this.el.appendChild(div);
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "context-menu-item" + (item.danger ? " danger" : "");
      btn.setAttribute("role", "menuitem");

      let iconHtml = item.icon || "";
      if (!iconHtml) {
        iconHtml = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;
      }

      btn.innerHTML = `
        <span class="context-menu-icon" style="display:flex;align-items:center;justify-content:center;width:14px;height:14px;flex-shrink:0">
          ${iconHtml}
        </span>
        <div class="context-menu-label" style="display:flex;flex-direction:column;line-height:1.2">
            <span style="font-size:13px">${item.label}</span>
            ${item.sub ? `<span style="font-size:10px;opacity:0.5;font-weight:400">${item.sub}</span>` : ""}
        </div>
        ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ""}
      `;

      btn.onclick = (e) => {
        e.stopPropagation();
        this.hide();
        if (item.action) item.action(this.activeTarget);
      };

      this.el.appendChild(btn);
    });
  }
}

// Singleton instance
export const contextMenu = new ContextMenu();
