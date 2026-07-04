// RadPlan — In-App-Benachrichtigungszentrum (Vorschlag 27) mit proaktiven
// Compliance-Benachrichtigungen (Vorschlag 12).
//
// Anders als der bereits vorhandene, rein transiente Toast-Mechanismus
// (showToast in render-modals.js) ist dies eine PERSISTENTE Liste: jede
// Benachrichtigung bleibt sichtbar, bis sie gelesen/gelöscht wird, auch über
// einen Reload hinweg (localStorage). Erste konkrete Quelle: nach jedem
// erfolgreichen Speichern (Event "radplan-save-success", siehe app.js) wird
// die Regelkonformität des aktuell geöffneten Monats geprüft; neue kritische
// (severity "high") Befunde erzeugen automatisch eine Benachrichtigung,
// statt nur beim manuellen Öffnen des Auswertungs-Hubs sichtbar zu werden.
//
// Bewusst KEIN Import aus js/state.js hier oben auf Modulebene für die
// Compliance-Prüfung selbst (die kommt über einen vom Aufrufer übergebenen
// Callback, siehe checkComplianceAndNotify), um dieses Modul unabhängig von
// der Analytics-Engine zu halten und Zirkelimporte zu vermeiden.

import { esc } from './utils.js';

const STORAGE_KEY = 'radplan_notifications_v1';
const MAX_NOTIFICATIONS = 200;

/** @typedef {{id: string, dedupeKey: string, type: string, severity: 'critical'|'warn'|'info', title: string, message: string, createdAt: number, read: boolean}} Notification */

/** @type {Notification[]} */
let notifications = [];
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    notifications = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(notifications)) notifications = [];
  } catch {
    notifications = [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // localStorage kann in seltenen Fällen voll/deaktiviert sein — Benach-
    // richtigungen bleiben dann nur für die laufende Sitzung erhalten.
  }
  window.dispatchEvent(new CustomEvent('radplan-notifications-changed'));
}

export function getNotifications() {
  load();
  return notifications;
}

export function getUnreadCount() {
  load();
  return notifications.filter((n) => !n.read).length;
}

/**
 * Fügt eine Benachrichtigung hinzu, sofern noch keine mit demselben
 * `dedupeKey` existiert (verhindert, dass ein unverändert fortbestehender
 * Befund bei jeder erneuten Prüfung erneut gemeldet wird). Gibt zurück, ob
 * tatsächlich eine neue Benachrichtigung erzeugt wurde.
 * @param {{dedupeKey: string, type: string, severity?: 'critical'|'warn'|'info', title: string, message: string}} notif
 */
export function addNotification(notif) {
  load();
  if (notifications.some((n) => n.dedupeKey === notif.dedupeKey)) return false;
  notifications.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dedupeKey: notif.dedupeKey,
    type: notif.type,
    severity: notif.severity || 'info',
    title: notif.title,
    message: notif.message,
    createdAt: Date.now(),
    read: false,
  });
  persist();
  return true;
}

export function markRead(id) {
  load();
  const n = notifications.find((x) => x.id === id);
  if (n && !n.read) { n.read = true; persist(); }
}

export function markAllRead() {
  load();
  let changed = false;
  notifications.forEach((n) => { if (!n.read) { n.read = true; changed = true; } });
  if (changed) persist();
}

export function removeNotification(id) {
  load();
  const before = notifications.length;
  notifications = notifications.filter((n) => n.id !== id);
  if (notifications.length !== before) persist();
}

export function clearAll() {
  load();
  if (!notifications.length) return;
  notifications = [];
  persist();
}

/**
 * Vorschlag 12 (Proaktive Compliance-Benachrichtigungen): prüft die
 * Regelkonformität für den übergebenen Zeitraum und meldet neue kritische
 * (severity "high") Befunde als Benachrichtigung. `computeCompliance` wird
 * dem Aufrufer übergeben (statt hier importiert), damit notifications.js
 * unabhängig von der Analytics-Engine bleibt.
 * @param {(range: any) => {findings: Array<{type:string,severity:string,emp:string,year:number,month:number,day:number,text:string}>}} computeCompliance
 * @param {any} range
 */
export function checkComplianceAndNotify(computeCompliance, range) {
  let compliance;
  try {
    compliance = computeCompliance(range);
  } catch {
    return 0;
  }
  const criticalFindings = (compliance?.findings || []).filter((f) => f.severity === 'high');
  let added = 0;
  criticalFindings.forEach((f) => {
    const dedupeKey = `compliance:${f.type}:${f.emp}:${f.year}-${f.month}-${f.day}`;
    const created = addNotification({
      dedupeKey,
      type: 'compliance',
      severity: 'critical',
      title: `Regelkonformität: ${f.emp}`,
      message: f.text,
    });
    if (created) added++;
  });
  return added;
}

// ---------------------------------------------------------------------------
//  UI-Verdrahtung (Glocke + Panel)
// ---------------------------------------------------------------------------
const SEVERITY_META = {
  critical: { label: 'Kritisch', color: '#DC2626' },
  warn: { label: 'Hinweis', color: '#F97316' },
  info: { label: 'Info', color: '#0EA5E9' },
};

function timeAgo(ts) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag(en)`;
}

function renderPanel() {
  const list = document.getElementById('notif-panel-list');
  const badge = document.getElementById('notif-badge');
  if (badge) {
    const unread = getUnreadCount();
    badge.textContent = String(unread > 99 ? '99+' : unread);
    badge.hidden = unread === 0;
  }
  if (!list) return;

  const items = getNotifications();
  if (!items.length) {
    list.innerHTML = '<div class="notif-empty">Keine Benachrichtigungen.</div>';
    return;
  }
  list.innerHTML = items.map((n) => {
    const sm = SEVERITY_META[n.severity] || SEVERITY_META.info;
    return `
      <div class="notif-item${n.read ? '' : ' is-unread'}" data-id="${esc(n.id)}">
        <span class="notif-item-dot" style="background:${sm.color}" title="${sm.label}"></span>
        <div class="notif-item-body">
          <div class="notif-item-title">${esc(n.title)}</div>
          <div class="notif-item-msg">${esc(n.message)}</div>
          <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
        </div>
        <button type="button" class="notif-item-remove" data-remove="${esc(n.id)}" title="Entfernen" aria-label="Benachrichtigung entfernen">✕</button>
      </div>`;
  }).join('');

  list.querySelectorAll('.notif-item').forEach((/** @type {HTMLElement} */ el) => {
    el.addEventListener('click', (e) => {
      if (/** @type {HTMLElement} */ (e.target).closest('.notif-item-remove')) return;
      markRead(el.dataset.id);
    });
  });
  list.querySelectorAll('[data-remove]').forEach((/** @type {HTMLElement} */ btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeNotification(btn.dataset.remove);
    });
  });
}

let panelOpen = false;

function setPanelOpen(open) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('btn-notifications');
  if (!panel || !btn) return;
  panelOpen = open;
  panel.hidden = !open;
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) renderPanel();
}

function outsideClickHandler(e) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('btn-notifications');
  if (!panel || !btn) return;
  const target = /** @type {HTMLElement} */ (e.target);
  if (panelOpen && !panel.contains(target) && !btn.contains(target)) {
    setPanelOpen(false);
  }
}

export function initNotificationCenter() {
  load();
  const btn = document.getElementById('btn-notifications');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setPanelOpen(!panelOpen);
  });

  document.getElementById('notif-mark-all-read')?.addEventListener('click', () => markAllRead());
  document.getElementById('notif-clear-all')?.addEventListener('click', () => clearAll());

  document.addEventListener('click', outsideClickHandler);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) setPanelOpen(false);
  });

  window.addEventListener('radplan-notifications-changed', renderPanel);
  renderPanel();
}
