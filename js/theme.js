// RadPlan — Theme (Hell-/Dunkelmodus), Spaltendichte, Kopfzeilen-Overflow-Menü
// und Farbenblind-sicherer Modus. Extrahiert aus dem früher monolithischen
// app.js (siehe README §23 für die vollständige Modulübersicht).

import { refreshResponsiveLayout } from './render-grid.js';
import { showToast } from './render-modals.js';
import { withThemeViewTransition } from './viewtransition.js';
import { setIcon } from './icons.js';

const THEME_STORAGE_KEY = "radplan_v3_theme";

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.getElementById("meta-theme-color");
  if (meta) meta.setAttribute("content", theme === "light" ? "#F4F1EA" : "#0B1929");
  const moonIcon = document.getElementById("btn-theme-icon-moon");
  const sunIcon = document.getElementById("btn-theme-icon-sun");
  if (moonIcon) moonIcon.style.display = theme === "light" ? "none" : "";
  if (sunIcon) sunIcon.style.display = theme === "light" ? "" : "none";
  const btn = document.getElementById("btn-theme");
  if (btn) btn.title = theme === "light" ? "Dunkelmodus aktivieren" : "Hellmodus aktivieren";
  const mMoon = document.getElementById("mbtn-theme-moon");
  const mSun = document.getElementById("mbtn-theme-sun");
  if (mMoon) mMoon.style.display = theme === "light" ? "none" : "";
  if (mSun) mSun.style.display = theme === "light" ? "" : "none";

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    favicon.setAttribute('href', `img/icon.svg?update=${Date.now()}&theme=${theme}`);
  }
}

export function setTheme(theme, persist = true) {
  applyTheme(theme);
  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) {}
  }
}

export function toggleTheme(originEvent) {
  withThemeViewTransition(() => {
    setTheme(getTheme() === "light" ? "dark" : "light");
  }, originEvent);
}

export function initTheme() {
  applyTheme(getTheme());
  let explicitPreference = false;
  try { explicitPreference = localStorage.getItem(THEME_STORAGE_KEY) !== null; } catch (e) {}
  if (!explicitPreference && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", (e) => {
      let stillExplicit = false;
      try { stillExplicit = localStorage.getItem(THEME_STORAGE_KEY) !== null; } catch (err) {}
      if (!stillExplicit) setTheme(e.matches ? "light" : "dark", false);
    });
  }
}

const DENSITY_STORAGE_KEY = "radplan_v3_density";

export function getDensity() {
  return document.body.classList.contains("grid-density-compact") ? "compact" : "cozy";
}

export function applyDensity(density) {
  document.body.classList.toggle("grid-density-compact", density === "compact");
  const compactIcon = document.getElementById("btn-density-icon-compact");
  const cozyIcon = document.getElementById("btn-density-icon-cozy");
  if (compactIcon) compactIcon.style.display = density === "compact" ? "none" : "";
  if (cozyIcon) cozyIcon.style.display = density === "compact" ? "" : "none";
  const btn = document.getElementById("btn-density");
  if (btn) btn.title = density === "compact" ? "Normale Spaltenbreite aktivieren" : "Kompakte Spaltenbreite aktivieren (für kleinere Fenster/Tablets)";
}

export function setDensity(density, persist = true) {
  applyDensity(density);
  if (persist) {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch (e) {}
  }
  refreshResponsiveLayout({ forceRender: true });
}

export function toggleDensity() {
  setDensity(getDensity() === "compact" ? "cozy" : "compact");
}

export function initDensity() {
  let saved = null;
  try { saved = localStorage.getItem(DENSITY_STORAGE_KEY); } catch (e) {}
  applyDensity(saved === "compact" ? "compact" : "cozy");
}

let headerMenuOutsideHandler = null;

export function isHeaderMenuOpen() {
  const menu = document.getElementById("header-menu");
  return !!menu && !menu.hasAttribute("hidden");
}

export function closeHeaderMenu() {
  const menu = document.getElementById("header-menu");
  const wrap = document.querySelector(".header-more");
  const btn = document.getElementById("btn-more");
  if (!menu || menu.hasAttribute("hidden")) return;
  menu.setAttribute("hidden", "");
  wrap?.classList.remove("open");
  btn?.setAttribute("aria-expanded", "false");
  if (headerMenuOutsideHandler) {
    document.removeEventListener("pointerdown", headerMenuOutsideHandler, true);
    document.removeEventListener("keydown", headerMenuOutsideHandler, true);
    headerMenuOutsideHandler = null;
  }
}

export function openHeaderMenu() {
  const menu = document.getElementById("header-menu");
  const wrap = document.querySelector(".header-more");
  const btn = document.getElementById("btn-more");
  if (!menu || !menu.hasAttribute("hidden")) return;
  if (btn) {
    const r = btn.getBoundingClientRect();
    menu.style.setProperty("--hmenu-top", `${Math.round(r.bottom + 8)}px`);
    menu.style.setProperty("--hmenu-right", `${Math.round(window.innerWidth - r.right)}px`);
  }
  menu.removeAttribute("hidden");
  wrap?.classList.add("open");
  btn?.setAttribute("aria-expanded", "true");
  /** @type {HTMLElement} */ (menu.querySelector(".hmenu-item"))?.focus();
  headerMenuOutsideHandler = (e) => {
    if (e.type === "keydown") {
      if (/** @type {KeyboardEvent} */ (e).key === "Escape") { closeHeaderMenu(); btn?.focus(); }
      return;
    }
    const target = /** @type {Node} */ (e.target);
    if (!menu.contains(target) && target !== btn && !btn?.contains(target)) {
      closeHeaderMenu();
    }
  };
  document.addEventListener("pointerdown", headerMenuOutsideHandler, true);
  document.addEventListener("keydown", headerMenuOutsideHandler, true);
}

export function initHeaderOverflowMenu() {
  const btn = document.getElementById("btn-more");
  const menu = document.getElementById("header-menu");
  if (!btn || !menu) return;

  menu.querySelectorAll(".hmenu-item[data-icon]").forEach((item) => {
    const ico = item.querySelector(".hmenu-ico");
    if (ico && !ico.childElementCount) setIcon(ico, /** @type {HTMLElement} */ (item).dataset.icon, { size: 16 });
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    isHeaderMenuOpen() ? closeHeaderMenu() : openHeaderMenu();
  });

  menu.addEventListener("click", (e) => {
    const item = /** @type {HTMLElement} */ (e.target).closest(".hmenu-item");
    if (!item) return;
    if (item.id === "btn-colorblind" || item.id === "btn-density") return;
    closeHeaderMenu();
  });

  menu.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = /** @type {HTMLElement[]} */ ([...menu.querySelectorAll(".hmenu-item")]);
    const idx = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const next = e.key === "ArrowDown"
      ? items[(idx + 1) % items.length]
      : items[(idx - 1 + items.length) % items.length];
    next?.focus();
  });
}

const COLORBLIND_STORAGE_KEY = "radplan_v3_colorblind";

export function isColorblind() {
  return document.documentElement.getAttribute("data-cb") === "1";
}

export function applyColorblind(on) {
  if (on) document.documentElement.setAttribute("data-cb", "1");
  else document.documentElement.removeAttribute("data-cb");
  ["btn-colorblind", "mbtn-colorblind"].forEach((id) => {
    document.getElementById(id)?.setAttribute("aria-checked", on ? "true" : "false");
  });
}

export function setColorblind(on, persist = true) {
  applyColorblind(on);
  if (persist) {
    try { localStorage.setItem(COLORBLIND_STORAGE_KEY, on ? "1" : "0"); } catch (e) {}
  }
}

export function initColorblindToggle() {
  const stored = (() => { try { return localStorage.getItem(COLORBLIND_STORAGE_KEY) === "1"; } catch (e) { return false; } })();
  applyColorblind(stored);
  const desktopItem = document.getElementById("btn-colorblind");
  if (desktopItem) {
    const ico = desktopItem.querySelector(".hmenu-ico");
    if (ico && !ico.childElementCount) setIcon(ico, "eye", { size: 16 });
  }
  const toggle = () => {
    const next = !isColorblind();
    setColorblind(next);
    showToast(next ? "Farbenblind-sicherer Modus aktiviert" : "Farbenblind-sicherer Modus deaktiviert");
  };
  desktopItem?.addEventListener("click", toggle);
  document.getElementById("mbtn-colorblind")?.addEventListener("click", toggle);
}
