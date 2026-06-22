/**
 * RadPlan — Druckvorschau & PDF-Export.
 *
 * Bietet vor dem eigentlichen Druck eine Vorschau mit:
 *   - Layout-Optionen (Quer-/Hochformat)
 *   - Option, die RBN-/RD-Neurorad-Zeile ein- oder auszuschließen
 *   - maßstabsgetreuer Vorschau des Monatsrasters inkl. Seitenumbruch-Hinweis
 *   - nativem Druck (Browser-Dialog) ODER nativer PDF-Generierung via jsPDF
 *     (Kopfzeile, eingebettetes App-Logo, Seitenzahlen, konfigurierbares Layout) ohne den
 *     Umweg über den Browser-Druckdialog.
 */

import { state, planMode } from './state.js';
import { MONTHS } from './constants.js';
import { showToast } from './render-modals.js';

let modalEl = null;
let options = { orientation: 'landscape', includeRbn: true };
let logoDataUrl = null;   // gerastertes Anwendungslogo (img/icon.svg → PNG) für jsPDF

const TITLE = 'RadPlan — Dienstplan';

// Lädt das echte App-Logo (SVG) und rastert es einmalig zu einem PNG-DataURL,
// das jsPDF via addImage einbetten kann. Schlägt das Laden fehl, wird auf eine
// gezeichnete Logo-Marke zurückgegriffen.
function loadLogo() {
  return new Promise((resolve) => {
    if (logoDataUrl !== null) {
      resolve(logoDataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        logoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        logoDataUrl = '';
      }
      resolve(logoDataUrl);
    };
    img.onerror = () => { logoDataUrl = ''; resolve(''); };
    img.src = 'img/icon.svg';
  });
}

function periodLabel() {
  return `${MONTHS[state.month]} ${state.year}`;
}

// ── DOM-Extraktion: liest das aktuelle Raster aus #plan-table aus ──────────────
function collapse(txt) {
  return (txt || '').replace(/\s+/g, ' ').trim();
}

function dayHeaderText(th) {
  // Tageskopf enthält Tageszahl + Wochentagskürzel — beides kompakt übereinander.
  const num = th.querySelector('.d-num')?.textContent || '';
  const dow = th.querySelector('.d-dow')?.textContent || '';
  if (num || dow) return collapse(`${num} ${dow}`);
  return collapse(th.textContent);
}

function extractGrid(includeRbn) {
  const table = document.getElementById('plan-table');
  if (!table) return null;

  const headCells = [...table.querySelectorAll('#plan-thead th')];
  const head = headCells.map((th, i) => (i === 0 ? 'Mitarbeiter/in' : dayHeaderText(th)));

  const body = [];
  table.querySelectorAll('#plan-tbody tr').forEach((tr) => {
    if (!includeRbn && tr.classList.contains('tr-rbn')) return;
    const cells = [...tr.children];
    if (!cells.length) return;
    const row = cells.map((c, i) => {
      if (i === 0) return collapse(c.querySelector('.emp-label')?.textContent || c.textContent);
      const assign = c.querySelector('.cell-assign, .cell-assign-rbn')?.textContent || '';
      const duty = c.querySelector('.cell-duty')?.textContent || '';
      return collapse(`${assign}${duty ? ' ' + duty : ''}`);
    });
    body.push({ cells: row, isRbn: tr.classList.contains('tr-rbn') });
  });

  return { head, body };
}

// ── Vorschau-Render ────────────────────────────────────────────────────────────
function renderPreview() {
  const host = modalEl.querySelector('#pp-preview');
  if (!host) return;
  host.innerHTML = '';

  const page = document.createElement('div');
  page.className = `pp-page pp-${options.orientation}`;

  const header = document.createElement('div');
  header.className = 'pp-page-header';
  header.innerHTML = `<strong>${TITLE}</strong><span>${periodLabel()}${planMode ? ' · Planungsentwurf' : ''}</span>`;
  page.appendChild(header);

  const clone = document.getElementById('plan-table')?.cloneNode(true);
  if (clone) {
    clone.removeAttribute('id');
    clone.classList.add('pp-table');
    if (!options.includeRbn) {
      clone.querySelectorAll('.tr-rbn').forEach((r) => r.remove());
    }
    page.appendChild(clone);
  }

  host.appendChild(page);

  // Seitenumbruch-Hinweis: grobe Schätzung anhand der Zeilenzahl.
  const rows = clone ? clone.querySelectorAll('tr').length : 0;
  const perPage = options.orientation === 'landscape' ? 46 : 64;
  const pages = Math.max(1, Math.ceil(rows / perPage));
  const note = modalEl.querySelector('#pp-pagenote');
  if (note) {
    note.textContent = pages > 1
      ? `Geschätzt ${pages} Seiten — die Tabelle wird zum Druck automatisch auf die Seitenbreite skaliert.`
      : 'Passt voraussichtlich auf eine Seite.';
  }
}

// ── Nativer Druck über den Browser ──────────────────────────────────────────────
function applyPrintPageStyle() {
  let style = document.getElementById('print-page-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'print-page-style';
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: A4 ${options.orientation}; margin: 8mm; } }`;
}

function doBrowserPrint() {
  applyPrintPageStyle();
  document.body.classList.toggle('print-no-rbn', !options.includeRbn);
  document.body.classList.toggle('print-portrait', options.orientation === 'portrait');

  const periodEl = document.getElementById('print-header-period');
  if (periodEl) periodEl.textContent = periodLabel();
  const metaEl = document.getElementById('print-header-meta');
  if (metaEl) metaEl.textContent = `Gedruckt am ${new Date().toLocaleDateString('de-DE')}${planMode ? ' · Planungsentwurf' : ''}`;
  const footEl = document.getElementById('print-footer');
  if (footEl) footEl.textContent = `RadPlan · Klinik für Radiologie & Nuklearmedizin · ${periodLabel()}`;
  document.title = `RadPlan — ${periodLabel()}`;

  // Vertikale Skalierung wie im klassischen printPlan(): die ganze Tabelle soll
  // auf eine Seitenhöhe passen.
  const table = document.getElementById('plan-table');
  const rows = table ? table.querySelectorAll('tr').length : 0;
  const usableH = options.orientation === 'landscape' ? 680 : 1000;
  const estHeight = rows * 15 + 24;
  const scale = Math.min(1, usableH / Math.max(estHeight, 1));
  document.documentElement.style.setProperty('--print-scale', scale.toFixed(4));

  closePreview();
  setTimeout(() => window.print(), 60);
}

// ── Native PDF-Generierung via jsPDF + autotable ────────────────────────────────
async function doPdfExport() {
  await loadLogo();
  const jspdfNS = window.jspdf;
  if (!jspdfNS || !jspdfNS.jsPDF) {
    showToast('PDF-Bibliothek nicht geladen');
    return;
  }
  const { jsPDF } = jspdfNS;
  const doc = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' });

  if (typeof doc.autoTable !== 'function') {
    showToast('PDF-Tabellen-Plugin nicht geladen');
    return;
  }

  const grid = extractGrid(options.includeRbn);
  if (!grid) {
    showToast('Keine Daten zum Exportieren');
    return;
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleDateString('de-DE');

  doc.autoTable({
    head: [grid.head],
    body: grid.body.map((r) => r.cells),
    startY: 22,
    margin: { top: 22, left: 8, right: 8, bottom: 12 },
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 0.6, overflow: 'hidden', halign: 'center', lineColor: [148, 163, 184], lineWidth: 0.1 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
    columnStyles: { 0: { halign: 'left', cellWidth: 28, fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    didParseCell: (data) => {
      const row = grid.body[data.row.index];
      if (data.section === 'body' && row && row.isRbn) {
        data.cell.styles.fillColor = [14, 116, 144];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: (data) => {
      // Kopfzeile mit echtem App-Logo (Fallback: gezeichnete Marke)
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', 8, 6.5, 9, 9);
        } catch (e) {
          doc.setFillColor(11, 25, 41);
          doc.roundedRect(8, 8, 8, 8, 1.5, 1.5, 'F');
          doc.setFillColor(245, 158, 11);
          doc.circle(12, 12, 1.8, 'F');
        }
      } else {
        doc.setFillColor(11, 25, 41);
        doc.roundedRect(8, 8, 8, 8, 1.5, 1.5, 'F');
        doc.setFillColor(245, 158, 11);
        doc.circle(12, 12, 1.8, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(TITLE, 20, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${periodLabel()}${planMode ? ' · Planungsentwurf' : ''}`, 20, 17);

      // Fußzeile mit Seitenzahl
      const page = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`RadPlan · Klinik für Radiologie & Nuklearmedizin · erstellt am ${generatedAt}`, 8, pageH - 5);
      doc.text(`Seite ${data.pageNumber} / ${page}`, pageW - 8, pageH - 5, { align: 'right' });
    },
  });

  doc.save(`radplan_${state.year}-${String(state.month + 1).padStart(2, '0')}.pdf`);
  showToast('PDF erstellt');
}

// ── Modal-Aufbau ────────────────────────────────────────────────────────────────
function buildModal() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'modal-print-preview';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'pp-title');
  overlay.hidden = true;
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="modal modal-print-preview">
      <div class="modal-hd">
        <div>
          <div class="modal-hd-title" id="pp-title">Druckvorschau</div>
          <div class="modal-hd-sub">Layout prüfen, dann drucken oder als PDF speichern</div>
        </div>
        <button type="button" class="modal-x" data-pp-close aria-label="Druckvorschau schließen">✕</button>
      </div>
      <div class="modal-bd pp-body">
        <div class="pp-toolbar">
          <div class="pp-opt-group" role="radiogroup" aria-label="Seitenausrichtung">
            <span class="pp-opt-lbl">Ausrichtung</span>
            <button type="button" class="pp-opt" data-orient="landscape" aria-pressed="true">Querformat</button>
            <button type="button" class="pp-opt" data-orient="portrait" aria-pressed="false">Hochformat</button>
          </div>
          <label class="pp-check">
            <input type="checkbox" id="pp-include-rbn" checked>
            <span>RD-Neurorad-Zeile einschließen</span>
          </label>
          <div class="pp-pagenote" id="pp-pagenote"></div>
        </div>
        <div class="pp-preview-wrap">
          <div id="pp-preview" class="pp-preview"></div>
        </div>
      </div>
      <div class="modal-ft">
        <button type="button" class="mbtn mbtn-ghost" data-pp-close>Abbrechen</button>
        <button type="button" class="mbtn mbtn-ghost" id="pp-pdf">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" style="margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Als PDF speichern
        </button>
        <button type="button" class="mbtn mbtn-primary" id="pp-print">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" style="margin-right:5px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Drucken
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-pp-close]').forEach((b) => b.addEventListener('click', closePreview));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePreview(); });

  overlay.querySelectorAll('.pp-opt').forEach((b) => {
    b.addEventListener('click', () => {
      options.orientation = b.dataset.orient;
      overlay.querySelectorAll('.pp-opt').forEach((o) => {
        const on = o === b;
        o.classList.toggle('active', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderPreview();
    });
  });

  overlay.querySelector('#pp-include-rbn')?.addEventListener('change', (e) => {
    options.includeRbn = e.target.checked;
    renderPreview();
  });

  overlay.querySelector('#pp-print')?.addEventListener('click', doBrowserPrint);
  overlay.querySelector('#pp-pdf')?.addEventListener('click', doPdfExport);

  return overlay;
}

function closePreview() {
  if (!modalEl) return;
  modalEl.hidden = true;
  modalEl.style.display = 'none';
  document.body.classList.remove('pp-open');
}

export function openPrintPreview() {
  if (!modalEl) modalEl = buildModal();

  // Standard: Querformat, RBN inklusive.
  options = { orientation: 'landscape', includeRbn: true };
  modalEl.querySelectorAll('.pp-opt').forEach((o) => {
    const on = o.dataset.orient === 'landscape';
    o.classList.toggle('active', on);
    o.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const chk = modalEl.querySelector('#pp-include-rbn');
  if (chk) chk.checked = true;

  modalEl.hidden = false;
  modalEl.style.display = '';
  document.body.classList.add('pp-open');
  renderPreview();
}
