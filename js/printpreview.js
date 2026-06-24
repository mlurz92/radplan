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
import { MONTHS, CODE_MAP } from './constants.js';
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
  // Tageskopf: Tageszahl über Wochentagskürzel (zweizeilig), damit die
  // Tagesspalten im PDF schmal und dennoch klar lesbar bleiben.
  const num = th.querySelector('.d-num')?.textContent || '';
  const dow = th.querySelector('.d-dow')?.textContent || '';
  if (num || dow) return collapse(num) + (dow ? `\n${collapse(dow)}` : '');
  return collapse(th.textContent);
}

function extractGrid(includeRbn) {
  const table = document.getElementById('plan-table');
  if (!table) return null;

  const headCells = [...table.querySelectorAll('#plan-thead th')];
  const head = headCells.map((th, i) => (i === 0 ? 'Mitarbeiter/in' : dayHeaderText(th)));
  // Kopf-Metadaten je Tagesspalte (für Wochenend-/Feiertags-/Heute-Markierung).
  const headMeta = headCells.map((th) => ({
    we: th.classList.contains('we'),
    hol: th.classList.contains('hol'),
    today: th.classList.contains('today'),
  }));
  // Index der Heute-Spalte (für die durchgehende Heute-Spaltenmarkierung im PDF).
  let todayCol = -1;
  headMeta.forEach((m, i) => { if (i > 0 && m.today) todayCol = i; });

  const body = [];
  table.querySelectorAll('#plan-tbody tr').forEach((tr) => {
    if (!includeRbn && tr.classList.contains('tr-rbn')) return;
    const cells = [...tr.children];
    if (!cells.length) return;
    const row = [];
    const meta = [];
    cells.forEach((c, i) => {
      if (i === 0) {
        row.push(collapse(c.querySelector('.emp-label')?.textContent || c.textContent));
        meta.push({ name: true });
        return;
      }
      const assign = c.querySelector('.cell-assign, .cell-assign-rbn')?.textContent || '';
      const duty = c.querySelector('.cell-duty')?.textContent || '';
      row.push(collapse(`${assign}${duty ? ' ' + duty : ''}`));
      meta.push({
        code: c.dataset.code || '',
        duty: collapse(duty),
        we: c.classList.contains('we'),
        hol: c.classList.contains('hol'),
        today: c.classList.contains('today'),
        conflict: c.classList.contains('cell-conflict'),
      });
    });
    body.push({ cells: row, meta, isRbn: tr.classList.contains('tr-rbn') });
  });

  return { head, headMeta, todayCol, body };
}

// Hex-Farbe (#RRGGBB) → [r,g,b]-Tripel für jsPDF.
function hexToRgb(hex) {
  const h = (hex || '').replace('#', '').trim();
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

// Druckpalette: bewusst die HELLE Light-Mode-Codierung (lesbar auf weißem
// Papier), themenunabhängig — auch wenn die App im Dark-Mode läuft.
const PRINT_COLORS = {
  weFill: [238, 242, 247],     // Wochenende — sehr helles Slate
  holFill: [254, 243, 199],    // Feiertag — helles Amber
  todayFill: [224, 242, 254],  // Heute (ohne Belegung) — helles Blau
  todayLine: [14, 165, 233],   // Heute-Spaltenrahmen
  dutyD: [254, 226, 226],      // D-Dienst (Belegung leer) — helles Rot
  dutyHG: [219, 234, 254],     // HG-Dienst (Belegung leer) — helles Blau
  conflict: [220, 38, 38],     // Konflikt-Rahmen
  rbnFill: [14, 116, 144],     // RD-Neurorad-Zeile
  headFill: [30, 41, 59],      // Tabellenkopf
  headWe: [51, 65, 85],        // Tabellenkopf Wochenende
  headHol: [120, 53, 15],      // Tabellenkopf Feiertag
  ink: [15, 23, 42],
};

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
      ? `Druck: geschätzt ${pages} Seiten (automatische Skalierung). PDF-Export passt immer auf eine A4-Seite.`
      : 'Passt auf eine Seite. PDF-Export ist farbig und immer auf eine A4-Seite skaliert.';
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
//
// Anspruch: Der Monatsplan passt IMMER vollständig und lesbar auf EINE A4-Seite
// (Querformat) und übernimmt alle farblichen Grid-Markierungen.
//
// Strategie:
//   1. Farben werden je Zelle aus dem Arbeitsplatz-/Status-Code und den
//      Wochenend-/Feiertags-/Heute-/Konflikt-Klassen rekonstruiert (helle
//      Druckpalette, themenunabhängig).
//   2. Spaltenbreiten werden fix auf die nutzbare Seitenbreite verteilt →
//      garantiert kein horizontaler Überlauf.
//   3. Die Schriftgröße wird per Auto-Fit iterativ bestimmt: die GRÖSSTE
//      Schrift, bei der die gesamte Tabelle auf eine Seite passt (vertikale
//      Höhe ≤ nutzbare Seitenhöhe). So bleibt der Plan maximal lesbar.

const PDF_LAYOUT = {
  marginX: 8,
  top: 22,
  bottom: 12,
};

// Baut die autoTable-Konfiguration für eine gegebene Schriftgröße.
function buildAutoTableConfig(grid, fontSize, geom, generatedAt, doc) {
  const cellPadding = Math.max(0.25, Math.min(0.9, fontSize * 0.14));
  // Feste Spaltenbreiten für ALLE Spalten: Namensspalte + gleich breite
  // Tagesspalten füllen exakt die nutzbare Seitenbreite (kein Überlauf).
  const columnStyles = { 0: { halign: 'left', cellWidth: geom.nameW, fontStyle: 'bold' } };
  for (let c = 1; c < grid.head.length; c++) {
    columnStyles[c] = { cellWidth: geom.dayColW };
  }
  return {
    head: [grid.head],
    body: grid.body.map((r) => r.cells),
    startY: PDF_LAYOUT.top,
    margin: { top: PDF_LAYOUT.top, left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX, bottom: PDF_LAYOUT.bottom },
    theme: 'grid',
    tableWidth: geom.tableWidth,
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: {
      fontSize,
      cellPadding,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: PRINT_COLORS.ink,
      minCellHeight: 0,
    },
    headStyles: { fillColor: PRINT_COLORS.headFill, textColor: [255, 255, 255], fontStyle: 'bold', fontSize, lineColor: [71, 85, 105], lineWidth: 0.1 },
    columnStyles,
    didParseCell: (data) => {
      const col = data.column.index;

      if (data.section === 'head') {
        const hm = grid.headMeta[col];
        if (col > 0 && hm) {
          if (hm.hol) data.cell.styles.fillColor = PRINT_COLORS.headHol;
          else if (hm.we) data.cell.styles.fillColor = PRINT_COLORS.headWe;
        }
        return;
      }

      const rowMeta = grid.body[data.row.index];
      if (!rowMeta) return;

      // RD-Neurorad-Sonderzeile durchgehend einfärben.
      if (rowMeta.isRbn) {
        data.cell.styles.fillColor = PRINT_COLORS.rbnFill;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        return;
      }

      const cm = rowMeta.meta?.[col];
      if (!cm || cm.name) return;

      // Priorität: Belegungs-Chipfarbe > Dienst-Tint > Feiertag > Wochenende > Heute.
      const meta = cm.code ? CODE_MAP[cm.code] : null;
      if (meta) {
        const bg = hexToRgb(meta.bg);
        const fg = hexToRgb(meta.fg);
        if (bg) data.cell.styles.fillColor = bg;
        if (fg) data.cell.styles.textColor = fg;
        data.cell.styles.fontStyle = 'bold';
      } else if (cm.duty === 'D') {
        data.cell.styles.fillColor = PRINT_COLORS.dutyD;
      } else if (cm.duty === 'HG') {
        data.cell.styles.fillColor = PRINT_COLORS.dutyHG;
      } else if (cm.hol) {
        data.cell.styles.fillColor = PRINT_COLORS.holFill;
      } else if (cm.we) {
        data.cell.styles.fillColor = PRINT_COLORS.weFill;
      } else if (cm.today) {
        data.cell.styles.fillColor = PRINT_COLORS.todayFill;
      }

      // Konfliktzellen erhalten einen kräftigen roten Rahmen.
      if (cm.conflict) {
        data.cell.styles.lineColor = PRINT_COLORS.conflict;
        data.cell.styles.lineWidth = 0.4;
      }
    },
    didDrawCell: (data) => {
      // Durchgehende Heute-Spaltenmarkierung (linke + rechte Kante), damit die
      // Heute-Spalte auch bei belegten Zellen klar erkennbar bleibt.
      if (grid.todayCol > 0 && data.column.index === grid.todayCol) {
        const { x, y, width, height } = data.cell;
        doc.setDrawColor(...PRINT_COLORS.todayLine);
        doc.setLineWidth(0.5);
        doc.line(x, y, x, y + height);
        doc.line(x + width, y, x + width, y + height);
      }
    },
    didDrawPage: (data) => {
      drawPageChrome(doc, geom, generatedAt, data);
    },
  };
}

// Zeichnet Kopf- (Logo, Titel, Zeitraum) und Fußzeile (Seitenzahl).
function drawPageChrome(doc, geom, generatedAt, data) {
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

  const totalPages = doc.internal.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`RadPlan · Klinik für Radiologie & Nuklearmedizin · erstellt am ${generatedAt}`, 8, geom.pageH - 5);
  doc.text(`Seite ${data.pageNumber} / ${totalPages}`, geom.pageW - 8, geom.pageH - 5, { align: 'right' });
}

async function doPdfExport() {
  await loadLogo();
  const jspdfNS = window.jspdf;
  if (!jspdfNS || !jspdfNS.jsPDF) {
    showToast('PDF-Bibliothek nicht geladen');
    return;
  }
  const { jsPDF } = jspdfNS;

  const probe = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' });
  if (typeof probe.autoTable !== 'function') {
    showToast('PDF-Tabellen-Plugin nicht geladen');
    return;
  }

  const grid = extractGrid(options.includeRbn);
  if (!grid) {
    showToast('Keine Daten zum Exportieren');
    return;
  }

  const pageW = probe.internal.pageSize.getWidth();
  const pageH = probe.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleDateString('de-DE');

  // Geometrie: Namensspalte + gleich breite Tagesspalten füllen exakt die
  // nutzbare Seitenbreite → kein horizontaler Überlauf, keine zweite Seite quer.
  const numDays = Math.max(1, grid.head.length - 1);
  const usableW = pageW - PDF_LAYOUT.marginX * 2;
  const nameW = Math.max(18, Math.min(34, usableW * 0.11));
  const dayColW = (usableW - nameW) / numDays;
  // Tagesspaltenbreite global setzen (Spalte 0 wird per columnStyles überschrieben).
  const geom = { pageW, pageH, tableWidth: usableW, nameW, dayColW };

  const usableH = pageH - PDF_LAYOUT.top - PDF_LAYOUT.bottom;

  // Auto-Fit: größte Schriftgröße finden, bei der ALLES auf eine Seite passt.
  // Wir messen die tatsächliche Tabellenhöhe über einen stillen Probelauf
  // (autoTable schreibt finalY) statt sie nur zu schätzen.
  const FONT_MAX = 8;
  const FONT_MIN = 2.4;
  const FONT_STEP = 0.25;

  function measuredHeight(fontSize) {
    const tmp = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' });
    const cfg = buildAutoTableConfig(grid, fontSize, geom, generatedAt, tmp);
    cfg.didDrawPage = () => {};   // kein Chrome im Messlauf
    cfg.didDrawCell = () => {};
    tmp.autoTable(cfg);
    return { height: tmp.lastAutoTable.finalY - PDF_LAYOUT.top, pages: tmp.internal.getNumberOfPages() };
  }

  let chosenFont = FONT_MIN;
  for (let fs = FONT_MAX; fs >= FONT_MIN - 0.001; fs -= FONT_STEP) {
    const { height, pages } = measuredHeight(fs);
    if (pages === 1 && height <= usableH) {
      chosenFont = fs;
      break;
    }
    chosenFont = fs; // Fallback: kleinste getestete Größe
  }

  // Finales Dokument mit gewählter Schriftgröße + vollständigem Chrome/Farben.
  const doc = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' });
  const finalCfg = buildAutoTableConfig(grid, chosenFont, geom, generatedAt, doc);
  doc.autoTable(finalCfg);

  doc.save(`radplan_${state.year}-${String(state.month + 1).padStart(2, '0')}.pdf`);
  showToast('PDF erstellt — auf eine A4-Seite skaliert');
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
