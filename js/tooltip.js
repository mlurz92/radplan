/**
 * RadPlan — Globaler, schwebender Hilfe-Tooltip (data-tooltip).
 *
 * Liest das Attribut `data-tooltip` eines beliebigen Elements und zeigt beim
 * Überfahren (Maus) bzw. Fokussieren (Tastatur) eine erklärende Sprechblase.
 * Im Gegensatz zur rein CSS-basierten Variante (::after) wird die Blase an
 * <body> gehängt und intelligent positioniert — dadurch wird sie in
 * scrollbaren Containern (Auswertungs-Hub, Mitarbeitendenbereich) niemals
 * abgeschnitten und liegt zuverlässig über allen Modalebenen.
 *
 * Konventionen:
 *   - `data-tooltip="…"`            : Inhalt der Sprechblase (Klartext).
 *   - `data-tooltip-pos="bottom"`   : bevorzugte Platzierung unterhalb des
 *                                     Ankers (sonst automatisch oben/unten).
 *
 * Touch-Geräte: Tooltips sind reine Maus-/Tastatur-Hilfe und werden bei
 * grobem Zeiger (pointer: coarse) unterdrückt, um Tap-Interaktionen nicht zu
 * stören.
 */

let tipEl = null;
let currentAnchor = null;
let showTimer = null;
let hideTimer = null;

const SHOW_DELAY = 340;
const HIDE_DELAY = 80;
const MARGIN = 10;

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'rp-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.setAttribute('aria-hidden', 'true');
  tipEl.hidden = true;
  document.body.appendChild(tipEl);
  return tipEl;
}

function isCoarsePointer() {
  return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}

function place(anchor, preferBottom) {
  const tip = tipEl;
  if (!tip) return;
  const r = anchor.getBoundingClientRect();
  tip.style.visibility = 'hidden';
  tip.hidden = false;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;

  // Horizontal zentriert über dem Anker, aber innerhalb des Viewports gehalten.
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - tw - MARGIN));

  const spaceAbove = r.top;
  const spaceBelow = window.innerHeight - r.bottom;
  let below = preferBottom;
  // Automatik: dorthin, wo Platz ist; bevorzugte Seite nur, wenn sie passt.
  if (preferBottom && spaceBelow < th + MARGIN && spaceAbove > spaceBelow) below = false;
  if (!preferBottom && spaceAbove < th + MARGIN && spaceBelow > spaceAbove) below = true;

  let top = below ? r.bottom + 8 : r.top - th - 8;
  top = Math.max(MARGIN, Math.min(top, window.innerHeight - th - MARGIN));

  // Pfeil horizontal auf die Ankermitte ausrichten (relativ zur Blase).
  const arrowX = Math.max(12, Math.min(tw - 12, r.left + r.width / 2 - left));
  tip.style.setProperty('--rp-tip-arrow', `${arrowX}px`);
  tip.classList.toggle('rp-tip-below', below);

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.style.visibility = '';
}

function showFor(anchor) {
  const text = anchor.getAttribute('data-tooltip');
  if (!text) return;
  currentAnchor = anchor;
  const tip = ensureTip();
  tip.textContent = text;
  tip.setAttribute('aria-hidden', 'false');
  place(anchor, anchor.getAttribute('data-tooltip-pos') === 'bottom');
  requestAnimationFrame(() => tip.classList.add('rp-tip-visible'));
}

function hide() {
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  currentAnchor = null;
  if (tipEl) {
    tipEl.classList.remove('rp-tip-visible');
    tipEl.setAttribute('aria-hidden', 'true');
    tipEl.hidden = true;
  }
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, HIDE_DELAY);
}

function cancelHide() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}

export function initTooltips() {
  if (document.body.dataset.rpTooltips === '1') return;
  document.body.dataset.rpTooltips = '1';

  document.addEventListener('mouseover', (e) => {
    if (isCoarsePointer()) return;
    const anchor = /** @type {HTMLElement} */ (e.target).closest?.('[data-tooltip]');
    if (!anchor || anchor === currentAnchor) return;
    if (!anchor.getAttribute('data-tooltip')) return;
    cancelHide();
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => showFor(anchor), SHOW_DELAY);
  });

  document.addEventListener('mouseout', (e) => {
    const anchor = /** @type {HTMLElement} */ (e.target).closest?.('[data-tooltip]');
    if (!anchor) return;
    const to = /** @type {HTMLElement} */ (e.relatedTarget);
    if (to && to.closest?.('[data-tooltip]') === anchor) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (anchor === currentAnchor) scheduleHide();
  });

  // Tastatur-Zugänglichkeit: Tooltip auch bei Fokus zeigen.
  document.addEventListener('focusin', (e) => {
    const anchor = /** @type {HTMLElement} */ (e.target).closest?.('[data-tooltip]');
    if (!anchor || !anchor.getAttribute('data-tooltip')) return;
    cancelHide();
    showFor(anchor);
  });
  document.addEventListener('focusout', (e) => {
    const anchor = /** @type {HTMLElement} */ (e.target).closest?.('[data-tooltip]');
    if (anchor && anchor === currentAnchor) scheduleHide();
  });

  // Bei Scrollen/Resize/Escape ausblenden, damit die Blase nie „kleben" bleibt.
  window.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('resize', hide, { passive: true });
  window.addEventListener('blur', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}
