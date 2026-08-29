// ===========================================================================
//  RadPlan · Auswertungs-Engine (Analytics Hub)
// ---------------------------------------------------------------------------
//  Gemeinsame Berechnungs- und Zeitraum-Schicht für den frage-/domänen-
//  orientierten Auswertungsbereich. Stellt einen einheitlichen Zeitraum-
//  Selektor (Monat · Quartal · Jahr · rollierend · frei) sowie wieder-
//  verwendbare Kennzahl-Berechnungen bereit (Abdeckung, Kapazität,
//  Regelkonformität, Prognose). Fairness wird aus model.js wiederverwendet.
//
//  Alle Module importieren ausschließlich aus dieser Datei, model.js und
//  constants.js – nie aus den anderen Modulen. Dadurch bleibt der Hub
//  erweiterbar und kollisionsfrei parallel entwickelbar.
// ===========================================================================

import {
  MONTHS, MONTHS_SHORT, CODE_MAP, WORKPLACES, STATUSES,
  VACATION_CODES, ABSENCE_CODES, VACATION_LIKE_CODES,
  daysInMonth, weekday, isHoliday, isWeekend, isWorkday,
  getSaxonyHolidaysCached, getEmpMeta, isFacharzt, isAssistenzarzt,
  SPECIAL_RULES, dateKey, monthKey, DOW_ABBR, DOW_LONG, getReducedBdTarget,
} from '../constants.js';

import {
  getMonthData, getCell, buildProfileStats, buildYearlyStats,
  getEmployeesForYear, computeDutyFairness, getEmployeeFairness, isDutyExempt,
} from '../model.js';

import { state, TOD_Y, TOD_M, DATA } from '../state.js';
import { posColor } from '../constants.js';
import { getThresholds } from './thresholds.js';
export { getThresholds, setThresholds, resetThresholds, DEFAULT_THRESHOLDS, THRESHOLD_LIMITS } from './thresholds.js';

// Re-Exports, damit Module nur ./engine.js importieren müssen.
export {
  MONTHS, MONTHS_SHORT, CODE_MAP, WORKPLACES, STATUSES,
  VACATION_CODES, ABSENCE_CODES, VACATION_LIKE_CODES,
  daysInMonth, weekday, isHoliday, isWeekend, isWorkday,
  getSaxonyHolidaysCached, getEmpMeta, isFacharzt, isAssistenzarzt,
  SPECIAL_RULES, dateKey, monthKey, DOW_ABBR, DOW_LONG,
  getMonthData, getCell, buildProfileStats, buildYearlyStats,
  getEmployeesForYear, computeDutyFairness, getEmployeeFairness, isDutyExempt,
  posColor, TOD_Y, TOD_M,
};

// Farbpalette für Jahres-Visualisierungen (Heatmap-/Kurvenmodule).
export const EMP_COLORS = [
  '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4',
];

// Heatmap-Farbe nach Abweichung vom Monats-Mittelwert (aus dem Jahresplaner
// übernommen, damit das gewohnte Farbschema erhalten bleibt).
export function heatColor(dev) {
  if (dev >= 2)   return { bg: 'rgba(239,68,68,0.18)',  fg: '#B91C1C' };
  if (dev >= 1)   return { bg: 'rgba(249,115,22,0.15)', fg: '#C2410C' };
  if (dev > -0.5) return { bg: 'rgba(34,197,94,0.12)',  fg: '#15803D' };
  if (dev >= -1)  return { bg: 'rgba(14,165,233,0.14)', fg: '#0369A1' };
  return            { bg: 'rgba(14,165,233,0.26)', fg: '#075985' };
}

// Per-Monat/Person-Dienstmatrix eines Jahres + Spaltenmittelwerte – Basis für
// das Jahresgitter (Heatmap) und die Fairness-Verlaufskurven.
export function computeYearGrid(year) {
  const allEmps = getEmployeesForYear(year);
  const perEmp = {};
  allEmps.forEach((emp, idx) => {
    const fa = isFacharzt(emp);
    perEmp[emp] = {
      color: EMP_COLORS[idx % EMP_COLORS.length],
      months: [], totalBD: 0, totalHG: 0, monthsWithData: 0,
      isFa: fa, isDutyCapable: !isDutyExempt(emp),
      meta: getEmpMeta(emp),
    };
    for (let m = 0; m < 12; m++) {
      const md = getMonthData(year, m);
      const inData = !!(md && md.employees && md.employees.includes(emp));
      if (!inData) { perEmp[emp].months.push({ bd: 0, hg: 0, hasData: false }); continue; }
      const s = buildProfileStats(year, m, emp);
      const bd = s.dutyD.length, hg = s.dutyHG.length;
      perEmp[emp].months.push({ bd, hg, hasData: true });
      perEmp[emp].totalBD += bd;
      perEmp[emp].totalHG += hg;
      perEmp[emp].monthsWithData++;
    }
  });

  const meansBD = Array.from({ length: 12 }, (_, m) => {
    const vals = allEmps.filter((e) => perEmp[e].months[m].hasData && perEmp[e].isDutyCapable).map((e) => perEmp[e].months[m].bd);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const meansHG = Array.from({ length: 12 }, (_, m) => {
    const vals = allEmps.filter((e) => perEmp[e].months[m].hasData && perEmp[e].isFa && !isDutyExempt(e)).map((e) => perEmp[e].months[m].hg);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  // Fachärzte zuerst, dann Assistenz – innerhalb alphabetisch (allEmps ist sortiert).
  const ordered = [...allEmps.filter((e) => perEmp[e].isFa), ...allEmps.filter((e) => !perEmp[e].isFa)];

  return { year, employees: ordered, perEmp, meansBD, meansHG, now: { year: TOD_Y, month: TOD_M } };
}

// ---------------------------------------------------------------------------
//  Mehrjahres-Benchmarking (Vorschlag 11)
// ---------------------------------------------------------------------------
// Vergleicht bis zu `maxYearsBack` zurückliegende Kalenderjahre (inkl. des
// übergebenen Referenzjahres) anhand derselben Kennzahlen, die auch im
// Fairness-Modul verwendet werden (computeDutyFairnessForRange), damit
// strukturelle Drifts in Fairness/Coverage über mehrere Jahre statt nur
// innerhalb eines einzelnen Jahres sichtbar werden. Jahre ohne jegliche
// Personaldaten werden übersprungen, damit z. B. das allererste erfasste
// Jahr der Klinik nicht mit leeren Nullwerten in der Kurve auftaucht.
export function computeMultiYearBenchmark(referenceYear, maxYearsBack = 4) {
  const years = [];
  for (let y = referenceYear - maxYearsBack + 1; y <= referenceYear; y++) {
    // computeYearGrid() ruft getEmployeesForYear() bereits intern auf – hier
    // nicht ein zweites Mal separat abfragen, sondern das Ergebnis direkt am
    // bereits berechneten Gitter prüfen.
    const grid = computeYearGrid(y);
    if (grid.employees.length === 0) continue;
    const isCurrentYear = y === TOD_Y;
    // Für das laufende Jahr werden nur die bereits abgeschlossenen/laufenden
    // Monate (bis einschließlich des aktuellen Kalendermonats) in den
    // Jahres-Gesamtwerten berücksichtigt, damit "noch komplett leere"
    // Restmonate den Jahresvergleich nicht künstlich nach unten ziehen.
    const lastMonth = isCurrentYear ? TOD_M : 11;
    const range = getRange('year', y, lastMonth);
    range.months = range.months.filter((mm) => mm.month <= lastMonth);
    const fairness = computeDutyFairnessForRange(range);
    years.push({
      year: y,
      isCurrentYear,
      monthsCovered: lastMonth + 1,
      meansBD: grid.meansBD,
      meansHG: grid.meansHG,
      team: fairness.team,
      deltaEquityTotal: /** @type {number|null} */ (null),
      deltaCvTotal: /** @type {number|null} */ (null),
      deltaMeanTotal: /** @type {number|null} */ (null),
    });
  }

  // Trend-Deltas ggü. dem jeweiligen Vorjahr (sofern vorhanden) für die
  // wichtigsten Benchmark-Kennzahlen – macht Verbesserungen/Verschlechterungen
  // auf einen Blick sichtbar, statt nur Absolutwerte nebeneinanderzustellen.
  years.forEach((y, i) => {
    const prev = i > 0 ? years[i - 1] : null;
    y.deltaEquityTotal = prev ? Math.round(y.team.equityTotal - prev.team.equityTotal) : null;
    y.deltaCvTotal = prev ? Math.round(y.team.cvTotal - prev.team.cvTotal) : null;
    y.deltaMeanTotal = prev ? Math.round((y.team.meanTotal - prev.team.meanTotal) * 10) / 10 : null;
  });

  return { referenceYear, years };
}

// ---------------------------------------------------------------------------
//  Zeitraum-Definitionen
// ---------------------------------------------------------------------------
export const RANGE_DEFS = [
  { key: 'month', label: 'Monat' },
  { key: 'quarter', label: 'Quartal' },
  { key: 'ytd', label: 'Jahr bis heute' },
  { key: 'year', label: 'Gesamtjahr' },
  { key: 'rolling12', label: 'Rollierend 12M' },
  { key: 'custom', label: 'Frei' },
];

// Liefert ein normalisiertes Zeitraum-Objekt:
//   { key, label, months:[{year,month}], year, month, single, isYear }
export function getRange(rangeKey, year, month, custom) {
  const y = year ?? state.year;
  const m = month ?? state.month;
  let months = [];
  let label = '';

  switch (rangeKey) {
    case 'quarter': {
      const start = Math.floor(m / 3) * 3;
      months = Array.from({ length: 3 }, (_, i) => ({ year: y, month: start + i }));
      label = `Q${Math.floor(m / 3) + 1} ${y}`;
      break;
    }
    case 'ytd': {
      months = Array.from({ length: m + 1 }, (_, i) => ({ year: y, month: i }));
      label = `Jan–${MONTHS_SHORT[m]} ${y}`;
      break;
    }
    case 'year': {
      months = Array.from({ length: 12 }, (_, i) => ({ year: y, month: i }));
      label = `${y}`;
      break;
    }
    case 'rolling12': {
      months = Array.from({ length: 12 }, (_, idx) => {
        const total = y * 12 + m - (11 - idx);
        return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
      });
      label = `${MONTHS_SHORT[months[0].month]} ${months[0].year} – ${MONTHS_SHORT[m]} ${y}`;
      break;
    }
    case 'custom': {
      const cs = custom?.start || { year: y, month: Math.max(0, m - 2) };
      const ce = custom?.end || { year: y, month: m };
      let from = cs.year * 12 + cs.month;
      let to = ce.year * 12 + ce.month;
      if (from > to) [from, to] = [to, from];
      for (let t = from; t <= to; t++) {
        months.push({ year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 });
      }
      label = `${MONTHS_SHORT[months[0].month]} ${months[0].year} – ${MONTHS_SHORT[months.at(-1).month]} ${months.at(-1).year}`;
      break;
    }
    case 'month':
    default:
      months = [{ year: y, month: m }];
      label = `${MONTHS[m]} ${y}`;
      break;
  }

  return {
    key: rangeKey || 'month',
    label,
    months,
    year: y,
    month: m,
    single: months.length === 1,
    isYear: rangeKey === 'year' || rangeKey === 'ytd',
  };
}

// Ein Monat gilt als tatsächlich geplant, sobald irgendeiner Person an
// irgendeinem Tag ein D- oder HG-Dienst zugewiesen wurde. Rein personell
// vorbelegte, aber noch dienstlose Folgemonate (siehe getMonthDataRaw) gelten
// NICHT als geplant, damit sie nicht fälschlich als Besetzungslücke zählen.
export function monthHasDutyData(year, month) {
  const md = getMonthData(year, month);
  if (!md?.employees?.length) return false;
  const dim = daysInMonth(year, month);
  for (const emp of md.employees) {
    for (let d = 1; d <= dim; d++) {
      const cell = md.assignments?.[emp]?.[d];
      if (cell && (cell.duty === 'D' || cell.duty === 'HG')) return true;
    }
  }
  return false;
}

// Iteriert über alle realen Tage eines Zeitraums (nur Monate mit Daten optional).
export function eachDay(range, cb, { onlyWithData = false, onlyPlanned = false } = {}) {
  range.months.forEach(({ year, month }) => {
    const md = getMonthData(year, month);
    if (onlyWithData && (!md || !md.employees || !md.employees.length)) return;
    if (onlyPlanned && !monthHasDutyData(year, month)) return;
    const hols = getSaxonyHolidaysCached(year);
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      cb({
        year, month, day: d,
        wd: weekday(year, month, d),
        holiday: isHoliday(year, month, d, hols),
        holName: hols[dateKey(year, month, d)] || '',
        workday: isWorkday(year, month, d, hols),
        weekendOrHoliday: weekday(year, month, d) === 0 || weekday(year, month, d) === 6 || isHoliday(year, month, d, hols),
        md,
      });
    }
  });
}

// Vereinigte, deduplizierte Mitarbeitendenliste über alle Monate des Zeitraums.
export function employeesInRange(range) {
  const set = new Set();
  range.months.forEach(({ year, month }) => {
    const md = getMonthData(year, month);
    (md?.employees || []).forEach((e) => set.add(e));
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

// ---------------------------------------------------------------------------
//  Fairness über einen beliebigen Zeitraum (Monat/Quartal/Rolling12/Frei)
// ---------------------------------------------------------------------------
// model.js#computeDutyFairness ist historisch auf ein Kalenderjahr zugeschnitten
// (uptoMonth begrenzt den Betrachtungszeitraum ab Januar desselben Jahres) und
// wird von mehreren Stellen außerhalb dieser Modul-Gruppe so verwendet
// (Mitarbeitendenprofil, Berichte, Dept-Jahresansicht) — deren Aufrufe bleiben
// unverändert. Das Fairness-Modul im Auswertungs-Hub deklariert aber
// `usesRange: true` und muss daher auch Monats-/Quartals-/Rolling12-/Frei-
// Zeiträume (ctx.range) korrekt auswerten können, nicht nur das Gesamtjahr.
// Da model.js außerhalb der Eigentümerschaft dieser Datei liegt, wird hier
// eine eigenständige, zeitraum-fähige Variante bereitgestellt, die dieselbe
// fachliche Formel (FTE-gewichteter fairer Anteil, Gini-Equity-Index,
// Soll/Ist Bereitschaftsdienst) auf `range.months` statt auf ein festes
// Kalenderjahr anwendet.
function _giniCoefficient(values) {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < n; i++) cumulative += (i + 1) * sorted[i];
  return (2 * cumulative) / (n * sum) - (n + 1) / n;
}
function _coefficientOfVariation(values) {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  return (Math.sqrt(variance) / mean) * 100;
}
function _equityIndex(values) {
  if (values.length <= 1) return 100;
  return Math.round((1 - _giniCoefficient(values)) * 100);
}
function _fairnessStatus(dev, fairShare) {
  const tol = Math.max(1, fairShare * getThresholds().fairnessTolerancePct);
  if (dev > tol) return 'over';
  if (dev < -tol) return 'under';
  return 'balanced';
}
const _RANGE_DEFAULT_BD_TARGET = 4;

/**
 * @typedef {import('../types.js').DutyFairnessRow} DutyFairnessRow
 */

/**
 * Zeitraum-Variante von computeDutyFairness: identische Kennzahlen-Formel,
 * aber über `range.months` (siehe getRange) statt über ein festes Kalenderjahr.
 * @param {ReturnType<typeof getRange>} range
 */
export function computeDutyFairnessForRange(range) {
  const employees = employeesInRange(range).filter((e) => !isDutyExempt(e));

  const raw = employees.map((emp) => {
    let bd = 0, hg = 0, weBd = 0, weHg = 0, holBd = 0, holHg = 0, activeMonths = 0;
    // Das BD-Soll wird pro aktivem Monat aufsummiert (nicht als ein Monatsziel
    // mal Monatszahl), damit zeitlich gestaffelte Ziele -- Einarbeitung von
    // Neuzugängen, SPECIAL_RULES.bdTargetSchedule -- korrekt eingehen. Bei
    // konstantem Ziel ist die Summe identisch zum bisherigen Produkt.
    let bdTargetSum = 0;
    range.months.forEach(({ year, month }) => {
      const md = getMonthData(year, month);
      if (!md?.employees?.includes(emp)) return;
      activeMonths++;
      bdTargetSum += getReducedBdTarget(emp, year, month) ?? _RANGE_DEFAULT_BD_TARGET;
      const hols = getSaxonyHolidaysCached(year);
      const dim = daysInMonth(year, month);
      for (let d = 1; d <= dim; d++) {
        const cell = getCell(year, month, emp, d);
        if (cell.duty !== 'D' && cell.duty !== 'HG') continue;
        const wd = weekday(year, month, d);
        const hol = isHoliday(year, month, d, hols);
        const heavy = wd === 0 || wd === 6 || hol;
        if (cell.duty === 'D') { bd++; if (heavy) weBd++; if (hol) holBd++; }
        else { hg++; if (heavy) weHg++; if (hol) holHg++; }
      }
    });
    return { emp, meta: getEmpMeta(emp), bd, hg, weBd, weHg, holBd, holHg, activeMonths, bdTargetSum };
  }).filter((r) => r.activeMonths > 0);

  const rows = /** @type {DutyFairnessRow[]} */ (raw.map((r) => ({
    ...r,
    fte: r.meta.fte || 100,
    total: r.bd + r.hg,
    weekendDuties: r.weBd + r.weHg,
    holidayDuties: r.holBd + r.holHg,
  })));

  const count = rows.length;
  const sum = (key) => rows.reduce((a, r) => a + r[key], 0);
  const totalBd = sum('bd');
  const totalHg = sum('hg');
  const totalWeekend = sum('weekendDuties');
  const totalHoliday = sum('holidayDuties');
  const totalDuties = totalBd + totalHg;
  const fteSum = rows.reduce((a, r) => a + r.fte, 0) || 1;

  rows.forEach((r) => {
    const w = r.fte / fteSum;
    r.fairBd = totalBd * w;
    r.fairHg = totalHg * w;
    r.fairWeekend = totalWeekend * w;
    r.fairTotal = totalDuties * w;
    r.bdDev = r.bd - r.fairBd;
    r.hgDev = r.hg - r.fairHg;
    r.weekendDev = r.weekendDuties - r.fairWeekend;
    r.totalDev = r.total - r.fairTotal;

    // Soll/Ist BD: Summe der Monatsziele (reduziert, gestaffelt oder Default 4)
    // über die im Zeitraum tatsächlich aktiven Monate, FTE-skaliert.
    r.bdTarget = Math.round(r.bdTargetSum * (r.fte / 100) * 10) / 10;
    r.bdDelta = Math.round((r.bd - r.bdTarget) * 10) / 10;
    r.bdTargetPct = r.bdTarget > 0 ? Math.round((r.bd / r.bdTarget) * 100) : 0;

    r.status = _fairnessStatus(r.totalDev, r.fairTotal);
    r.weekendStatus = _fairnessStatus(r.weekendDev, r.fairWeekend);
    r.canFacharzt = isFacharzt(r.emp);
  });

  const rankBy = (key, target) => {
    [...rows].sort((a, b) => b[key] - a[key]).forEach((r, i) => { r[target] = i + 1; });
  };
  rankBy('total', 'rankTotal');
  rankBy('weekendDuties', 'rankWeekend');
  rankBy('holidayDuties', 'rankHoliday');

  const team = {
    count, totalBd, totalHg, totalWeekend, totalHoliday, totalDuties,
    meanBd: count ? totalBd / count : 0,
    meanHg: count ? totalHg / count : 0,
    meanWeekend: count ? totalWeekend / count : 0,
    meanTotal: count ? totalDuties / count : 0,
    equityBd: _equityIndex(rows.map((r) => r.bd)),
    equityHg: _equityIndex(rows.map((r) => r.hg)),
    equityWeekend: _equityIndex(rows.map((r) => r.weekendDuties)),
    equityTotal: _equityIndex(rows.map((r) => r.total)),
    cvTotal: Math.round(_coefficientOfVariation(rows.map((r) => r.total))),
    cvWeekend: Math.round(_coefficientOfVariation(rows.map((r) => r.weekendDuties))),
    minTotal: rows.length ? Math.min(...rows.map((r) => r.total)) : 0,
    maxTotal: rows.length ? Math.max(...rows.map((r) => r.total)) : 0,
    minWeekend: rows.length ? Math.min(...rows.map((r) => r.weekendDuties)) : 0,
    maxWeekend: rows.length ? Math.max(...rows.map((r) => r.weekendDuties)) : 0,
  };
  team.spreadTotal = team.maxTotal - team.minTotal;
  team.spreadWeekend = team.maxWeekend - team.minWeekend;

  rows.sort((a, b) => b.total - a.total || b.weekendDuties - a.weekendDuties || a.emp.localeCompare(b.emp, 'de'));

  return { range, rows, team };
}

// ---------------------------------------------------------------------------
//  Abdeckung & Risiko
// ---------------------------------------------------------------------------
// Liefert tagesgenaue Besetzung von Bereitschafts- (D) und Hintergrunddienst
// (HG) inkl. Lücken, Wochenend-/Feiertagslücken und einem Risiko-Score.
//
// WICHTIG (Konsistenz mit render-dept.js): Frühere Fassungen filterten hier
// per `{ onlyPlanned: true }` Monate ganz ohne D-/HG-Einträge aus dem Nenner
// heraus, sodass ein Monat ohne jegliche Diensteinträge stillschweigend aus
// der Abdeckungsquote verschwand. render-dept.js (Monatsansicht) hat diesen
// Filter nie besessen und zählt ehrlich JEDEN Werktag/Kalendertag, auch wenn
// für den Monat gar keine Dienste vergeben wurden (Ergebnis dort: 0 %). Beide
// Ansichten wichen dadurch für dieselben Rohdaten voneinander ab. Wir
// übernehmen hier bewusst die ehrliche render-dept-Semantik: „Abdeckung"
// bedeutet tatsächliche Besetzung an realen Kalendertagen, nicht nur an
// Tagen, für die überhaupt schon geplant wurde. Ein komplett unbeplanter
// Monat zählt also korrekt als 0 % Abdeckung statt gar nicht mitgezählt zu
// werden — das macht Versorgungslücken sichtbar, statt sie zu verschleiern.
export function computeCoverage(range) {
  const days = [];
  let workdays = 0, weekendHolidayDays = 0;
  let dCovered = 0, hgCovered = 0, dGaps = 0, hgGaps = 0;
  let weHolDGaps = 0, weHolHgGaps = 0;

  eachDay(range, (ctx) => {
    const { year, month, day, md } = ctx;
    let hasD = false, hasHG = false, dOwner = null, hgOwner = null;
    (md?.employees || []).forEach((emp) => {
      const cell = md.assignments?.[emp]?.[day];
      if (!cell) return;
      if (cell.duty === 'D') { hasD = true; dOwner = emp; }
      if (cell.duty === 'HG') { hasHG = true; hgOwner = emp; }
    });
    const required = true; // D & HG sind an JEDEM Kalendertag zu besetzen
    if (ctx.workday) workdays++;
    if (ctx.weekendOrHoliday) weekendHolidayDays++;
    if (hasD) dCovered++; else { dGaps++; if (ctx.weekendOrHoliday) weHolDGaps++; }
    if (hasHG) hgCovered++; else { hgGaps++; if (ctx.weekendOrHoliday) weHolHgGaps++; }

    let status = 'full';
    if (!hasD && !hasHG) status = 'none';
    else if (!hasD || !hasHG) status = 'partial';

    days.push({
      year, month, day, wd: ctx.wd, holiday: ctx.holiday, holName: ctx.holName,
      weekendOrHoliday: ctx.weekendOrHoliday, hasD, hasHG, dOwner, hgOwner, status, required,
    });
  });

  const totalDays = days.length;
  const dPct = totalDays ? Math.round((dCovered / totalDays) * 100) : 0;
  const hgPct = totalDays ? Math.round((hgCovered / totalDays) * 100) : 0;
  // Risiko: Wochenend-/Feiertagslücken wiegen doppelt (kritischer).
  const riskRaw = dGaps + hgGaps + weHolDGaps + weHolHgGaps;
  const riskScore = totalDays ? Math.max(0, Math.round(100 - (riskRaw / (totalDays * 2)) * 100)) : 100;

  return {
    days, totalDays, workdays, weekendHolidayDays,
    dCovered, hgCovered, dGaps, hgGaps, weHolDGaps, weHolHgGaps,
    dPct, hgPct, riskScore,
    fullDays: days.filter((d) => d.status === 'full').length,
    partialDays: days.filter((d) => d.status === 'partial').length,
    openDays: days.filter((d) => d.status === 'none').length,
  };
}

// ---------------------------------------------------------------------------
//  Kombinierte Coverage-/Fairness-Heatmap (Vorschlag 16)
// ---------------------------------------------------------------------------
// Verknüpft die tagesgenaue Besetzungsanalyse (computeCoverage) mit der
// Fairness-Verteilung (computeDutyFairnessForRange), um genau die Tage und
// Personen hervorzuheben, an denen sich beide Risiken überlagern: entweder
// ist ein Tag schlicht unbesetzt ("gap"), oder er ist zwar vollständig
// besetzt, aber nur, weil eine Person einspringt, die bereits deutlich über
// ihrem fairen Anteil liegt ("strain") – ein Frühwarnsignal dafür, dass die
// Besetzungssicherung strukturell auf dem Rücken einzelner, ohnehin
// überlasteter Personen erfolgt, statt gleichmäßig verteilt zu sein.
export function computeCombinedRiskMatrix(range) {
  const cov = computeCoverage(range);
  const fairness = computeDutyFairnessForRange(range);
  const fairByEmp = new Map(fairness.rows.map((r) => [r.emp, r]));

  const strainCounts = new Map();
  const days = cov.days.map((d) => {
    const dOwnerRow = d.dOwner ? fairByEmp.get(d.dOwner) : null;
    const hgOwnerRow = d.hgOwner ? fairByEmp.get(d.hgOwner) : null;
    const strainOwners = [dOwnerRow, hgOwnerRow]
      .filter((r) => r && r.status === 'over')
      .map((r) => r.emp);

    let combinedStatus;
    if (d.status !== 'full') combinedStatus = 'gap';
    else if (strainOwners.length) combinedStatus = 'strain';
    else combinedStatus = 'ok';

    if (combinedStatus === 'strain') {
      const weight = d.weekendOrHoliday ? 2 : 1;
      strainOwners.forEach((emp) => strainCounts.set(emp, (strainCounts.get(emp) || 0) + weight));
    }

    return { ...d, combinedStatus, strainOwners };
  });

  const strainedEmployees = fairness.rows
    .filter((r) => r.status === 'over' && strainCounts.has(r.emp))
    .map((r) => ({
      emp: r.emp, meta: r.meta, totalDev: r.totalDev, total: r.total, fairTotal: r.fairTotal,
      strainScore: strainCounts.get(r.emp) || 0,
    }))
    .sort((a, b) => b.strainScore - a.strainScore || b.totalDev - a.totalDev);

  return {
    days,
    totalDays: days.length,
    gapDays: days.filter((d) => d.combinedStatus === 'gap').length,
    strainDays: days.filter((d) => d.combinedStatus === 'strain').length,
    okDays: days.filter((d) => d.combinedStatus === 'ok').length,
    strainedEmployees,
  };
}

// ---------------------------------------------------------------------------
//  Abwesenheiten & Kapazität
// ---------------------------------------------------------------------------
// ASYNC (siehe Issue 35): Für ein großes Team über ein volles Jahr ist dies
// eine synchrone Vollberechnung über alle Monate × alle Mitarbeitenden plus
// eine tagesgenaue Kapazitätsauswertung — in einem einzigen synchronen Block
// kann das bei großen Rostern spürbar den Main-Thread blockieren (UI-Jank).
// Die Berechnung wird daher in Chunks (ein Kalendermonat pro Tick) verarbeitet
// und gibt die Kontrolle nach jedem Monat mit einem Makrotask-Tick
// (`setTimeout(…, 0)`) an die Ereignisschleife zurück. Aufrufer MÜSSEN daher
// `await computeAbsence(range)` verwenden statt den Rückgabewert synchron zu
// erwarten.
export async function computeAbsence(range) {
  const emps = employeesInRange(range);
  const perEmp = new Map(emps.map((e) => [e, {
    emp: e, meta: getEmpMeta(e), vac: 0, sick: 0, fza: 0, wb: 0, su: 0, total: 0, byCode: {},
  }]));

  let totalAbsenceDays = 0;
  const daySeries = []; // pro Werktag: gleichzeitige Abwesenheiten
  const yieldTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  for (const { year, month } of range.months) {
    for (const emp of emps) {
      const md = getMonthData(year, month);
      if (!md?.employees?.includes(emp)) continue;
      const s = buildProfileStats(year, month, emp);
      const row = perEmp.get(emp);
      ABSENCE_CODES.forEach((c) => {
        const v = s.stCounts[c] || 0;
        if (!v) return;
        row.byCode[c] = (row.byCode[c] || 0) + v;
      });
      const vac = VACATION_CODES.reduce((a, c) => a + (s.stCounts[c] || 0), 0);
      const sick = (s.stCounts['K'] || 0) + (s.stCounts['KK'] || 0);
      row.vac += vac;
      row.sick += sick;
      row.fza += s.stCounts['FZA'] || 0;
      row.wb += s.stCounts['WB'] || 0;
      row.total += vac + sick + (s.stCounts['FZA'] || 0) + (s.stCounts['WB'] || 0);
      totalAbsenceDays += vac + sick + (s.stCounts['FZA'] || 0) + (s.stCounts['WB'] || 0);
    }
    await yieldTick();
  }

  // Gleichzeitige Abwesenheiten je Werktag (Kapazitäts-/Engpasssicht) —
  // ebenfalls chunkweise pro Monat statt eines einzigen eachDay()-Durchlaufs
  // über den kompletten Zeitraum.
  for (const { year, month } of range.months) {
    const md = getMonthData(year, month);
    const hols = getSaxonyHolidaysCached(year);
    const dim = daysInMonth(year, month);
    for (let day = 1; day <= dim; day++) {
      if (!isWorkday(year, month, day, hols)) continue;
      let present = 0, absent = 0;
      (md?.employees || []).forEach((emp) => {
        const cell = md.assignments?.[emp]?.[day] || {};
        const base = (cell.assignment || '').split('/')[0].trim();
        // Echte Abwesenheit = ABSENCE_CODES. Dienstfrei (F) ist KEINE Abwesenheit
        // (z. B. dienstfreier Folgetag nach Dienst) und wird konsistent zur
        // Tabelle/totalAbsenceDays nicht mitgezählt.
        const isAbs = !!base && ABSENCE_CODES.includes(base);
        if (isAbs) absent++; else present++;
      });
      const head = (md?.employees || []).length;
      daySeries.push({ year, month, day, wd: weekday(year, month, day), present, absent, head, rate: head ? Math.round((absent / head) * 100) : 0 });
    }
    await yieldTick();
  }

  const rows = [...perEmp.values()].filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const peak = daySeries.slice().sort((a, b) => b.absent - a.absent)[0] || null;

  return { rows, daySeries, totalAbsenceDays, peak, employees: emps };
}

// ---------------------------------------------------------------------------
//  Regelkonformität (Ruhezeiten, Folgetag-frei, Häufungen, Sonderregeln)
// ---------------------------------------------------------------------------
export function computeCompliance(range) {
  const findings = [];
  const emps = employeesInRange(range);

  // Pro Mitarbeitende über ALLE Monate des Zeitraums hinweg auswerten, damit
  // Ruhezeit- und Häufungsprüfungen an Monatsgrenzen nicht abreißen.
  emps.forEach((emp) => {
    let lastDuty = null; // { year, month, day, abs } – absoluter Tagesindex

    range.months.forEach(({ year, month }) => {
      const md = getMonthData(year, month);
      if (!md?.employees?.includes(emp)) return;
      const dim = daysInMonth(year, month);

      for (let d = 1; d <= dim; d++) {
        const cell = getCell(year, month, emp, d);
        const isDuty = cell.duty === 'D' || cell.duty === 'HG';

        // Ruhezeit: nach einem Bereitschaftsdienst (D) muss der Folgetag
        // dienstfrei sein (kein Arbeitsplatz/anderer Dienst). Ausnahme: ein
        // Hintergrunddienst (HG) am Folgetag verletzt die Ruhezeit NICHT, da
        // dieser rufbereit von zu Hause aus erfolgt und der/die Mitarbeitende
        // dabei ruhen kann. Folgetag auch über die Monatsgrenze hinweg prüfen.
        if (cell.duty === 'D') {
          let nextWorks = false;
          let unverifiable = false;
          if (d < dim) {
            const next = getCell(year, month, emp, d + 1);
            const nextBase = (next.assignment || '').split('/')[0].trim();
            nextWorks = !!((nextBase && WORKPLACES.some((w) => w.code === nextBase)) || (next.duty && next.duty !== 'HG'));
          } else if (month === 11) {
            // Silvester-Grenzfall: Folgetag liegt im nächsten Jahr. Ohne
            // Absicherung würde `getCell(year+1, 0, emp, 1)` für ein noch gar
            // nicht angelegtes Folgejahr (oder für eine im Folgejahr nicht
            // mehr geführte Person) einfach eine leere Zelle liefern, die
            // stillschweigend als "dienstfrei" (= konform) durchgeht — obwohl
            // in Wahrheit schlicht nichts verifiziert werden konnte. Wir
            // unterscheiden daher explizit:
            //  - Für year+1 liegen GAR KEINE Plandaten vor: nicht prüfbar
            //    (separate, klar gekennzeichnete Kategorie statt "konform").
            //  - Für year+1 liegen Daten vor, die Person ist dort aber nicht
            //    im Personal-Roster geführt: sehr wahrscheinlich zum
            //    Jahreswechsel ausgeschieden -> es existiert kein Folgedienst,
            //    gegen den verstoßen werden könnte, die Prüfung entfällt
            //    korrekt (kein falsches "konform", sondern schlicht kein
            //    prüfbarer Sachverhalt mehr).
            // Bewusst das ROHE DATA-Objekt prüfen statt getMonthData(year+1,
            // 0): Letzteres würde beim ersten Zugriff auf ein noch gar nicht
            // angelegtes Folgejahr automatisch einen vom 31.12. geerbten
            // Personal-Eintrag anlegen (Lazy-Fill-Nebenwirkung, siehe
            // getMonthDataRaw) — die Person würde dann fälschlich als "im
            // Folgejahr geführt" erscheinen, obwohl in Wahrheit schlicht noch
            // gar nichts für year+1 geplant wurde. Genau dieses Lazy-Fill war
            // die Ursache dafür, dass der Ruhezeit-Check bislang stets eine
            // leere (= "konforme") Zelle sah.
            const nextYearMonth0 = DATA[monthKey(year + 1, 0)];
            const nextYearHasData = !!(nextYearMonth0 && Array.isArray(nextYearMonth0.employees) && nextYearMonth0.employees.length);
            const empInNextYear = nextYearHasData && nextYearMonth0.employees.includes(emp);
            if (!nextYearHasData) {
              unverifiable = true;
            } else if (empInNextYear) {
              const next = getCell(year + 1, 0, emp, 1);
              const nextBase = (next.assignment || '').split('/')[0].trim();
              nextWorks = !!((nextBase && WORKPLACES.some((w) => w.code === nextBase)) || (next.duty && next.duty !== 'HG'));
            }
            // else: Person nicht mehr im Folgejahr-Roster -> nextWorks bleibt
            // false, kein Befund (siehe Kommentar oben).
          }
          if (unverifiable) {
            findings.push({ type: 'restUnverifiable', severity: 'low', emp, year, month, day: d,
              text: `Ruhezeit nicht prüfbar: D am ${d}.${month + 1}. (Jahreswechsel) — für ${year + 1} liegen noch keine Plandaten vor, der Folgetag kann nicht verifiziert werden.` });
          } else if (nextWorks) {
            findings.push({ type: 'rest', severity: 'high', emp, year, month, day: d,
              text: `Ruhezeit verletzt: D am ${d}.${month + 1}. ohne dienstfreien Folgetag.` });
          }
        }

        // Dienst-Häufung: zwei Dienste innerhalb von <3 Tagen (auch über
        // Monatsgrenzen). Exakter Kalendertag-Index (UTC-Epochentage), damit
        // der Abstand auch über kurze Monate (z. B. 28.2.→1.3.) korrekt ist.
        if (isDuty) {
          const absDay = Math.round(Date.UTC(year, month, d) / 864e5);
          if (lastDuty && absDay - lastDuty.abs < 3) {
            findings.push({ type: 'cluster', severity: 'mid', emp, year, month, day: d,
              text: `Dienst-Häufung: ${emp} hat Dienste am ${lastDuty.day}.${lastDuty.month + 1}. und ${d}.${month + 1}. (< 3 Tage Abstand).` });
          }
          lastDuty = { year, month, day: d, abs: absDay };
        }

        // Sonderregel: Wochentags-Sperren für D.
        if (cell.duty === 'D') {
          const wd = weekday(year, month, d);
          if ((SPECIAL_RULES.noBdWeekdays[emp] || []).includes(wd)) {
            findings.push({ type: 'rule', severity: 'high', emp, year, month, day: d,
              text: `Sonderregel verletzt: ${emp} darf am ${DOW_LONG[wd]} keinen Bereitschaftsdienst leisten.` });
          }
        }

        // Qualifikation: HG nur durch Fachärzte; Samstags-D nur durch
        // Fachärzte. Sonntags- und Freitagsdienste (D) dürfen dagegen auch
        // von Nicht-Fachärzten übernommen werden -- die Facharzt-Pflicht
        // gilt an D-Tagen ausschließlich für den Samstag.
        if (cell.duty === 'HG' && !isFacharzt(emp)) {
          findings.push({ type: 'qual', severity: 'high', emp, year, month, day: d,
            text: `Qualifikation: ${emp} (kein Facharzt) im Hintergrunddienst am ${d}.${month + 1}.` });
        }
        const wd = weekday(year, month, d);
        if (cell.duty === 'D' && wd === 6 && !isFacharzt(emp)) {
          findings.push({ type: 'qual', severity: 'high', emp, year, month, day: d,
            text: `Qualifikation: ${emp} (kein Facharzt) im Samstags-Bereitschaftsdienst am ${d}.${month + 1}.` });
        }
      }
    });
  });

  const bySeverity = { high: 0, mid: 0, low: 0 };
  findings.forEach((f) => { bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1; });
  const byType = {};
  findings.forEach((f) => { byType[f.type] = (byType[f.type] || 0) + 1; });

  // Compliance-Score: 100 minus gewichtete Verstöße, geclamped.
  const penalty = bySeverity.high * 5 + bySeverity.mid * 2 + bySeverity.low * 1;
  const score = Math.max(0, 100 - penalty);

  return { findings, bySeverity, byType, score, employees: emps };
}

// ---------------------------------------------------------------------------
//  Burnout-/Belastungs-Risiko-Score (Vorschlag 8)
// ---------------------------------------------------------------------------
// Verdichtet drei bereits vorhandene, aber bislang nur getrennt betrachtete
// Belastungsindikatoren zu einem einzigen 0–100-Risikowert je Person:
//   1) Gesamt-Überlast relativ zum fairen Anteil (aus computeDutyFairnessForRange)
//   2) Wochenend-/Feiertags-Überlast relativ zum fairen WE-Anteil
//   3) Häufung von Diensten mit <3 Tagen Abstand (aus computeCompliance,
//      Finding-Typ 'cluster') — ein starker Belastungsindikator, der in der
//      reinen Fairness-Kennzahl (die nur die GESAMTZAHL an Diensten
//      betrachtet) nicht sichtbar wird: zwei eng getaktete Dienste belasten
//      spürbar mehr als zwei weit auseinanderliegende, auch bei identischer
//      Gesamtzahl.
// Bewusst rein aus bereits vorhandenen Engine-Funktionen zusammengesetzt
// (keine neue Rohdatenanalyse), um Doppelberechnung zu vermeiden.
function _clampScore100(v) {
  return Math.max(0, Math.min(100, v));
}

export function computeBurnoutRisk(range) {
  const fairness = computeDutyFairnessForRange(range);
  const compliance = computeCompliance(range);

  const clusterCountByEmp = {};
  compliance.findings.forEach((f) => {
    if (f.type === 'cluster') clusterCountByEmp[f.emp] = (clusterCountByEmp[f.emp] || 0) + 1;
  });

  const rows = fairness.rows.map((r) => {
    // Überlast relativ zum fairen Anteil: 50% über dem fairen Anteil sättigt
    // bereits bei 100 Punkten (bewusst empfindlich, da 50% Überhang bei
    // ohnehin knapp bemessenen Dienstzahlen bereits eine deutliche
    // Mehrbelastung bedeutet).
    const overloadPct = r.fairTotal > 0 ? Math.max(0, r.totalDev / r.fairTotal) : (r.totalDev > 0 ? 1 : 0);
    const overloadScore = _clampScore100(overloadPct * 200);

    const weOverloadPct = r.fairWeekend > 0 ? Math.max(0, r.weekendDev / r.fairWeekend) : (r.weekendDev > 0 ? 1 : 0);
    const weOverloadScore = _clampScore100(weOverloadPct * 200);

    // Jede Häufung (<3 Tage Abstand) trägt 25 Punkte, ab 4 Häufungen gesättigt.
    const clusterCount = clusterCountByEmp[r.emp] || 0;
    const clusterScore = _clampScore100(clusterCount * 25);

    const burnoutScore = Math.round(overloadScore * 0.45 + weOverloadScore * 0.25 + clusterScore * 0.30);
    const th = getThresholds();
    const level = burnoutScore >= th.burnoutHighScore ? 'hoch' : burnoutScore >= th.burnoutMidScore ? 'mittel' : 'niedrig';

    return {
      emp: r.emp, meta: r.meta, burnoutScore, level,
      overloadScore: Math.round(overloadScore), weOverloadScore: Math.round(weOverloadScore),
      clusterScore: Math.round(clusterScore), clusterCount,
      totalDev: r.totalDev, weekendDev: r.weekendDev,
    };
  }).sort((a, b) => b.burnoutScore - a.burnoutScore);

  return { range, rows };
}

// ---------------------------------------------------------------------------
//  Saisonale Ausfallquote (historische Krankheitsquote pro Kalendermonat)
// ---------------------------------------------------------------------------
// Krankheitsbedingte Codes im engeren Sinn (nicht Urlaub/Weiterbildung o.ä.),
// siehe Glossar. Grundlage für die saisonale Risikoeinschätzung im Forecast.
const SICK_CODES = ['K', 'KK'];
// Unterhalb dieser Personen-Werktage-Stichprobe gilt eine Kalendermonats-
// Quote als statistisch nicht belastbar genug für eine Risikowarnung.
const SEASONAL_MIN_SAMPLE_DAYS = 20;
// Rezenz-Gewichtung: pro Jahr Abstand zur Gegenwart (TOD_Y) verbleiben 85%
// des ursprünglichen Gewichts (einfacher, nachvollziehbarer exponentieller
// Abfall). Ohne diese Gewichtung würde ein einzelnes altes Ausreißerjahr
// (z. B. eine schwere, längst überstandene Grippewelle) die "saisonale Norm"
// dauerhaft verzerren und auch Jahre später noch unbegründete
// seasonalRiskMonths-Warnungen auslösen, obwohl sich die Verhältnisse längst
// normalisiert haben. Ein Jahr, das genauso weit in der Zukunft liegt wie
// TOD_Y (sollte praktisch nicht vorkommen), wird wie das aktuelle Jahr
// behandelt (kein negativer Abstand).
export const SEASONAL_RECENCY_DECAY = 0.85;

/**
 * Ermittelt für jeden Kalendermonat (0–11), wie sich die krankheitsbedingte
 * Ausfallquote (K/KK bezogen auf alle Werktage aktiver Mitarbeitender)
 * historisch über ALLE in DATA vorhandenen Jahre hinweg verhält — z.B. um
 * saisonale Muster wie eine erhöhte Grippewelle im Winter sichtbar zu
 * machen. Rein deskriptiv/historisch (kein Modelltraining, keine externen
 * Daten): mehr vorhandene Jahre mit tatsächlichen Diensteinträgen verbessern
 * die Aussagekraft automatisch, da einfach mehr Personen-Werktage in die
 * jeweilige Kalendermonats-Quote einfließen. Ältere Jahre fließen dabei mit
 * abnehmendem Gewicht ein (siehe SEASONAL_RECENCY_DECAY), damit ein einzelner
 * historischer Ausreißer nicht dauerhaft die aktuelle Risikoeinschätzung
 * verzerrt. `sampleDays` bleibt bewusst UNGEWICHTET (reale Anzahl Personen-
 * Werktage), da es die statistische Stichprobengröße für die
 * Belastbarkeits-Schwelle (SEASONAL_MIN_SAMPLE_DAYS) beschreibt, während
 * `rate`/`indexVsAverage` auf der rezenz-gewichteten Poolung basieren.
 * @returns {Array<{month:number, sampleDays:number, rate:number, indexVsAverage:number, hasData:boolean}>}
 */
export function computeSeasonalAbsenceIndex() {
  const monthly = Array.from({ length: 12 }, () => ({
    sickDaysWeighted: 0, activeDaysWeighted: 0, sampleDays: 0,
  }));

  for (const [key, md] of Object.entries(DATA)) {
    if (!md || !Array.isArray(md.employees) || !md.assignments) continue;
    const [yearPart, monthPart] = key.split('-');
    const y = parseInt(yearPart, 10);
    const m = parseInt(monthPart, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) continue;

    const hols = getSaxonyHolidaysCached(y);
    const dim = daysInMonth(y, m);
    const bucket = monthly[m];
    const yearsAgo = Math.max(0, TOD_Y - y);
    const weight = SEASONAL_RECENCY_DECAY ** yearsAgo;

    md.employees.forEach((emp) => {
      for (let d = 1; d <= dim; d++) {
        if (!isWorkday(y, m, d, hols)) continue;
        bucket.sampleDays++;
        bucket.activeDaysWeighted += weight;
        const cell = md.assignments?.[emp]?.[d];
        const codes = (cell?.assignment || '').split('/').map((x) => x.trim());
        if (codes.some((c) => SICK_CODES.includes(c))) {
          bucket.sickDaysWeighted += weight;
        }
      }
    });
  }

  const rates = monthly.map((b) => (b.activeDaysWeighted > 0 ? b.sickDaysWeighted / b.activeDaysWeighted : null));
  const validRates = rates.filter((r) => r !== null);
  const overallAvg = validRates.length ? validRates.reduce((a, b) => a + b, 0) / validRates.length : 0;

  return monthly.map((b, m) => {
    const rate = rates[m] ?? 0;
    return {
      month: m,
      sampleDays: b.sampleDays,
      rate,
      indexVsAverage: overallAvg > 0 ? rate / overallAvg : 1,
      hasData: b.sampleDays >= SEASONAL_MIN_SAMPLE_DAYS,
    };
  });
}

// ---------------------------------------------------------------------------
//  Prognose (Jahresend-Hochrechnung der Dienste)
// ---------------------------------------------------------------------------
export function computeForecast(year) {
  const fairness = computeDutyFairness(year, { uptoMonth: 11 });
  // Monate mit tatsächlichen DIENST-Daten ermitteln (nicht bloß Personal-
  // präsenz), damit die lineare Hochrechnung nicht zur Ist-Wiedergabe
  // kollabiert, wenn der Dienstplan personell das ganze Jahr abdeckt, künftige
  // Monate aber noch keine vergebenen Dienste enthalten.
  let monthsWithData = 0;
  // Monate, für die überhaupt ein Personal-Roster existiert (unabhängig
  // davon, ob darin schon Dienste vergeben wurden) — Grundlage, um weiter
  // unten zwischen "Person arbeitet hier erst seit Kurzem/Teilzeit" (echte
  // Beschäftigungsspanne) und "für diesen Monat wurde einfach noch gar nichts
  // geplant" (reine Datenlücke, betrifft ALLE Mitarbeitenden gleichermaßen)
  // zu unterscheiden (siehe yearTarget-Berechnung unten). WICHTIG: hierfür
  // ausschließlich das rohe DATA-Objekt prüfen (wie collectDutyRaw/
  // computeDutyFairness in model.js) statt getMonthData() — Letzteres legt
  // beim ersten Zugriff auf einen noch unbeplanten Monat automatisch einen
  // vom Vormonat geerbten Eintrag an (Lazy-Fill-Nebenwirkung). Würden wir
  // darüber rosterMonths ermitteln, würde dieser Auto-Fill JEDEN Folgemonat
  // rückwirkend als "beplant" erscheinen lassen, sobald irgendeine Person
  // irgendwann einmal geführt wurde — genau die Unterscheidung, die
  // isPartialEmployment unten treffen soll, wäre dann unbrauchbar.
  let rosterMonths = 0;
  for (let m = 0; m < 12; m++) {
    const rawMd = DATA[monthKey(year, m)];
    if (rawMd?.employees?.length) rosterMonths++;
    const md = getMonthData(year, m);
    if (!md?.employees?.length) continue;
    const dim = daysInMonth(year, m);
    let hasDuty = false;
    for (const emp of md.employees) {
      for (let d = 1; d <= dim && !hasDuty; d++) {
        const cell = md.assignments?.[emp]?.[d];
        if (cell && (cell.duty === 'D' || cell.duty === 'HG')) hasDuty = true;
      }
      if (hasDuty) break;
    }
    if (hasDuty) monthsWithData++;
  }
  const factor = monthsWithData > 0 ? 12 / monthsWithData : 1;

  // Saisonale Risikoeinschätzung wird VOR der Hochrechnung ermittelt, damit
  // sie a) weiterhin separat als informativer Hinweis samt Verlauf
  // ausgegeben wird (seasonalRiskMonths) und b) in die Konfidenzeinschätzung
  // der Prognose einfließen kann (siehe confidence unten).
  const seasonalIndex = computeSeasonalAbsenceIndex();
  const remainingMonths = [];
  for (let m = monthsWithData; m < 12; m++) remainingMonths.push(m);
  const seasonalRiskMonths = remainingMonths
    .map((m) => seasonalIndex[m])
    .filter((s) => s.hasData && s.indexVsAverage >= getThresholds().seasonalRiskFactor)
    .sort((a, b) => b.indexVsAverage - a.indexVsAverage);

  // Konfidenz der linearen Hochrechnung: je weniger Monate an Ist-Daten
  // vorliegen, desto stärker kann ein einzelner ungewöhnlicher Monat die
  // 12x-Extrapolation verzerren (mit monthsWithData=1 explodiert ein
  // schwerer Einzelmonat sofort zur Jahresprognose). Ab
  // CONFIDENCE_FULL_MONTHS Monaten Ist-Datenbasis vertrauen wir der linearen
  // Hochrechnung vollständig; darunter wird sie unten Richtung Jahres-Soll
  // gedämpft (blendWeight). Ein historisch auffälliger Restmonat
  // (seasonalRiskMonths) erhöht die Unsicherheit zusätzlich und stuft die
  // Konfidenz eine Stufe herab — WARUM wird die Saisonquote nicht direkt in
  // die Dienst-Hochrechnung hineinmultipliziert (obwohl sie bereits berechnet
  // vorliegt)? Sie misst die Krankheitsquote ALLER/anderer Mitarbeitender,
  // nicht die künftige Dienstlast dieser konkreten Person — ein Monat mit
  // überdurchschnittlich vielen Kranken könnte für die verbleibenden
  // gesunden Personen MEHR Dienste bedeuten (Einspringen), für die
  // betrachtete Person selbst aber genauso gut WENIGER (eigener Ausfall).
  // Eine naive Multiplikation wäre damit fachlich nicht eindeutig richtig;
  // stattdessen fließt das saisonale Risiko konservativ in die
  // Konfidenzbewertung (und damit in die Dämpfung) statt in eine blinde
  // Höher-/Niedriger-Rechnung ein.
  const CONFIDENCE_FULL_MONTHS = 6;
  const blendWeight = Math.max(0, Math.min(1, monthsWithData / CONFIDENCE_FULL_MONTHS));
  let confidence = monthsWithData <= 2 ? 'low' : monthsWithData <= 5 ? 'medium' : 'high';
  if (seasonalRiskMonths.length) {
    if (confidence === 'high') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'low';
  }

  const rows = fairness.rows.map((r) => {
    const naiveProjBd = Math.round(r.bd * factor);
    const projHg = Math.round(r.hg * factor);

    // yearTarget: r.bdTarget (aus der Fairness-Berechnung) ist bereits
    // korrekt auf r.activeMonths anteilig berechnet (Summe der Monatsziele
    // über die aktiven Monate × FTE; die Division unten liefert daher das
    // mittlere Monatsziel). Ist r.activeMonths < rosterMonths, heißt das: für
    // Monate, in denen laut Roster ANDERE Mitarbeitende bereits geführt
    // wurden, taucht DIESE Person nicht auf — typischerweise unterjähriger
    // Ein-/Austritt bzw. Teilzeit mit begrenzter Beschäftigungsspanne (kein
    // explizites Eintritts-/Austrittsdatum im Datenmodell vorhanden, daher
    // diese Heuristik über die Roster-Präsenz). In diesem Fall darf NICHT
    // erneut auf 12 Monate hochgerechnet werden — r.bdTarget ist bereits das
    // korrekte, faire Jahresziel für die tatsächliche Beschäftigungsspanne.
    // Ist r.activeMonths dagegen gleich rosterMonths, liegt die Verkürzung
    // nicht an der Person, sondern schlicht daran, dass für die Zukunft noch
    // gar nichts geplant wurde (Datenlücke, betrifft alle gleichermaßen) —
    // dann ist die Hochrechnung auf ein volles Jahr weiterhin sinnvoll, um
    // das Tempo mit einem realistischen Jahresziel zu vergleichen.
    const isPartialEmployment = r.activeMonths < rosterMonths;
    const yearTarget = isPartialEmployment
      ? r.bdTarget
      : Math.round((r.bdTarget / Math.max(1, r.activeMonths)) * 12);

    // Gedämpfte Prognose: Blend aus naiver linearer Hochrechnung und dem
    // (FTE-/aktivitätsgerechten) Jahres-Soll als Basiswert, gewichtet nach
    // Konfidenz (blendWeight). Bei wenigen Monaten Datenbasis zieht die
    // Prognose so Richtung des plausiblen Zielwerts statt einer einzelnen,
    // ggf. untypischen Ist-Periode blind zu vertrauen.
    const projBd = Math.round(blendWeight * naiveProjBd + (1 - blendWeight) * yearTarget);
    const projTotal = projBd + projHg;
    return {
      emp: r.emp, meta: r.meta, bd: r.bd, hg: r.hg, total: r.total,
      projBd, projHg, projTotal, yearTarget,
      projBdRaw: naiveProjBd,
      projDelta: projBd - yearTarget,
    };
  });

  return {
    year, monthsWithData, factor, rows, team: fairness.team,
    seasonalIndex, seasonalRiskMonths, confidence,
  };
}

// Zählt Wunsch-Erfüllung/-Verletzung für EINEN Tag/EINE Person in ein
// {wishes,fulfilled,violated}-Akkumulator-Objekt. Gemeinsamer Kern für
// computeWishFulfillment (ganzes Team) und computeWishFulfillmentForEmployee
// (Vorschlag 15, einzelne Person) — vermeidet zwei parallele Kopien derselben
// Wunsch-Bewertungsregeln.
function accumulateWishDay(acc, cell) {
  if (!cell.wish) return;
  acc.wishes++;
  const hasDuty = cell.duty === 'D' || cell.duty === 'HG';
  if (cell.wish === 'NO_DUTY') { if (hasDuty) acc.violated++; else acc.fulfilled++; }
  else if (cell.wish === 'BD_WISH') { if (cell.duty === 'D') acc.fulfilled++; }
  else if (cell.wish === 'HG_WISH') { if (cell.duty === 'HG') acc.fulfilled++; }
}

// Wunscherfüllungsrate über einen Zeitraum (erfüllte vs. eingetragene Wünsche).
export function computeWishFulfillment(range) {
  const acc = { wishes: 0, fulfilled: 0, violated: 0 };
  range.months.forEach(({ year, month }) => {
    const md = getMonthData(year, month);
    if (!md?.employees?.length) return;
    const dim = daysInMonth(year, month);
    md.employees.forEach((emp) => {
      for (let d = 1; d <= dim; d++) accumulateWishDay(acc, getCell(year, month, emp, d));
    });
  });
  const rate = acc.wishes ? Math.round((acc.fulfilled / acc.wishes) * 100) : null;
  return { ...acc, rate };
}

// Vorschlag 15 (Persönliches Mitarbeiter-Dashboard): dieselbe Formel wie
// computeWishFulfillment, aber auf eine einzelne Person eingeschränkt, damit
// sie im Profil ("Meine Prognose & Wunscherfüllung") ohne Umweg über den
// Auswertungs-Hub angezeigt werden kann.
export function computeWishFulfillmentForEmployee(range, emp) {
  const acc = { wishes: 0, fulfilled: 0, violated: 0 };
  range.months.forEach(({ year, month }) => {
    const md = getMonthData(year, month);
    if (!md?.employees?.includes(emp)) return;
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) accumulateWishDay(acc, getCell(year, month, emp, d));
  });
  const rate = acc.wishes ? Math.round((acc.fulfilled / acc.wishes) * 100) : null;
  return { emp, ...acc, rate };
}

// ---------------------------------------------------------------------------
//  Gemeinsame Formatierungs-Helfer (deutsche Konvention)
// ---------------------------------------------------------------------------
export const fmt = {
  dec1: (n) => (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  int: (n) => Math.round(n ?? 0).toLocaleString('de-DE'),
  signed1: (n) => {
    const v = Math.round((n ?? 0) * 10) / 10;
    return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  },
  signedInt: (n) => {
    const v = Math.round(n ?? 0);
    return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
  },
  pct: (n) => `${Math.round(n ?? 0)}%`,
};

// Ampel-Farbe für Score/Prozent (0–100, höher = besser).
export function scoreColor(v) {
  return v >= 85 ? '#22C55E' : v >= 65 ? '#F59E0B' : '#EF4444';
}

// ---------------------------------------------------------------------------
//  Zentrales Tooltip-Glossar (Auswertungs-Hub + Mitarbeitendenbereich)
// ---------------------------------------------------------------------------
//  Eine einzige, kuratierte Quelle für die erklärenden Mouse-Over-Texte aller
//  Fachbegriffe, Kennzahlen und Felder. Module verwenden ausschließlich diese
//  Definitionen (Konsistenz + Pflege an einer Stelle). HTML-Einsatz:
//    `<span data-tooltip="${TT.equityTotal}">…</span>`
//  Texte sind bewusst kompakt, aber fachlich präzise und in sich verständlich.
export const TT = {
  // — Zeitraum & Grundbegriffe —
  range: 'Betrachtungszeitraum aller Kennzahlen dieser Ansicht. Über die Pillen oben umschaltbar: Monat, Quartal, Jahr bis heute, Gesamtjahr, rollierende 12 Monate oder frei wählbar.',
  rangeMonth: 'Nur der aktuell im Planer gewählte Kalendermonat.',
  rangeQuarter: 'Das Kalenderquartal (3 Monate), in dem der gewählte Monat liegt.',
  rangeYtd: 'Jahr bis heute: vom Januar bis einschließlich des gewählten Monats.',
  rangeYear: 'Das vollständige Kalenderjahr (Januar–Dezember).',
  rangeRolling12: 'Die letzten 12 Monate rückwärts ab dem gewählten Monat – auch über den Jahreswechsel hinweg.',
  rangeCustom: 'Frei wählbarer Start- und Endmonat.',
  bd: 'Bereitschaftsdienst (D): diensthabende Person vor Ort. An jedem Kalendertag genau einmal zu besetzen.',
  hg: 'Hintergrunddienst (HG): rufbereiter Facharzt-Hintergrund. An jedem Kalendertag genau einmal zu besetzen; nur durch Fachärztinnen/Fachärzte.',
  duty: 'Dienst = Bereitschaftsdienst (D) und Hintergrunddienst (HG) zusammengefasst.',
  facharzt: 'Fachärztin/Facharzt – qualifiziert für Hintergrunddienst (HG) und Wochenend-Bereitschaftsdienst.',
  assistenz: 'Assistenzärztin/Assistenzarzt in Weiterbildung – leistet Bereitschaftsdienst (D), aber keinen Hintergrunddienst.',
  fte: 'Vollzeitäquivalent (Stellenanteil). 1,0 = Vollzeit. Dienstziele werden FTE-gewichtet, damit Teilzeitkräfte anteilig weniger Dienste tragen.',

  // — Abdeckung & Risiko —
  coverage: 'Anteil der Kalendertage im Zeitraum, an denen Bereitschafts- (D) bzw. Hintergrunddienst (HG) besetzt ist.',
  dPct: 'Anteil der Tage mit besetztem Bereitschaftsdienst (D) am Zeitraum.',
  hgPct: 'Anteil der Tage mit besetztem Hintergrunddienst (HG) am Zeitraum.',
  openDays: 'Tage komplett ohne Dienstbesetzung – weder D noch HG vergeben. Höchste Priorität.',
  partialDays: 'Tage, an denen nur einer der beiden Dienste (D oder HG) besetzt ist.',
  fullDays: 'Tage mit vollständiger Besetzung von Bereitschafts- und Hintergrunddienst.',
  weHolGaps: 'Unbesetzte Dienste an Wochenenden und gesetzlichen Feiertagen – besonders kritisch und im Risiko-Index doppelt gewichtet.',
  riskScore: 'Versorgungs-Risiko-Index 0–100 (höher = sicherer). 100 minus gewichtete Dienstlücken; Wochenend-/Feiertagslücken zählen doppelt.',

  // — Fairness —
  fairness: 'Verteilungsgerechtigkeit der Dienstlast über das Team, FTE-gewichtet und gegen das individuelle Soll gemessen.',
  equityTotal: 'Equity-Index 0–100 für die gesamte Dienstlast (D+HG). 100 = perfekt gleichmäßige, FTE-gerechte Verteilung; niedrige Werte = einzelne tragen deutlich mehr/weniger als ihr Soll.',
  equityBd: 'Equity-Index 0–100 nur für Bereitschaftsdienste (D).',
  equityHg: 'Equity-Index 0–100 nur für Hintergrunddienste (HG), bezogen auf die dienstfähigen Fachärzte.',
  soll: 'Soll: FTE-gewichteter Erwartungswert an Diensten für den Zeitraum – der faire Anteil dieser Person an der Gesamtlast.',
  ist: 'Ist: tatsächlich geleistete Dienste im Zeitraum.',
  delta: 'Abweichung Ist − Soll. Positiv = mehr Dienste als der faire Anteil, negativ = weniger.',
  spread: 'Spannweite: Differenz zwischen der höchsten und der niedrigsten Dienstzahl im Team.',
  weekendDuties: 'Dienste an Wochenenden und Feiertagen – die belastendsten Einsätze, separat auf Gerechtigkeit geprüft.',

  // — Abwesenheiten —
  absence: 'Erfasste Abwesenheitstage: Urlaub, Krankheit, Freizeitausgleich (FZA) und Weiterbildung (WB).',
  vac: 'Urlaubstage (inkl. urlaubsähnlicher Codes) im Zeitraum.',
  sick: 'Krankheitstage (K) und Kind-krank (KK) im Zeitraum.',
  fza: 'Freizeitausgleich – Abbau geleisteter Mehrarbeit.',
  wb: 'Weiterbildung / Fortbildung – planmäßige Abwesenheit zur Qualifizierung.',
  absencePeak: 'Spitzentag: höchste Zahl gleichzeitig abwesender Personen – maßgeblich für Engpass-Risiken.',
  absenceRate: 'Anteil gleichzeitig abwesender Personen an der Belegschaft des Tages.',

  // — Regelkonformität —
  compliance: 'Einhaltung der Dienstregeln: Ruhezeiten, Dienstabstände, Qualifikation und personenbezogene Sonderregeln.',
  complianceScore: 'Regelkonformitäts-Score 0–100 (höher = besser). 100 minus gewichtete Verstöße: kritisch −5, mittel −2, gering −1.',
  findingRest: 'Ruhezeit-Verstoß: nach einem Bereitschaftsdienst (D) muss der Folgetag dienst- und arbeitsplatzfrei sein.',
  findingCluster: 'Dienst-Häufung: zwei Dienste mit weniger als 3 Tagen Abstand – auch über Monatsgrenzen geprüft.',
  findingQual: 'Qualifikations-Verstoß: HG bzw. Wochenend-Bereitschaftsdienst nur durch Fachärztinnen/Fachärzte.',
  findingRule: 'Sonderregel-Verstoß: personenbezogene Wochentags-Sperre für den Bereitschaftsdienst missachtet.',
  sevHigh: 'Kritischer Befund – verletzt harte Vorgaben (Ruhezeit, Qualifikation, Sonderregel).',
  sevMid: 'Mittlerer Befund – Belastungs-/Häufungshinweis ohne harte Regelverletzung.',

  // — Prognose & Wünsche —
  forecast: 'Lineare Hochrechnung der Dienste auf das Jahresende anhand der bislang mit Diensten gefüllten Monate.',
  projTotal: 'Erwartete Gesamtdienste zum Jahresende bei gleichbleibendem Tempo.',
  yearTarget: 'Auf das Gesamtjahr hochgerechnetes, FTE-gewichtetes Dienst-Soll.',
  projDelta: 'Erwartete Jahresabweichung: Prognose minus Jahres-Soll.',
  wishRate: 'Wunscherfüllungsrate: Anteil der eingetragenen Dienstwünsche, die der Plan erfüllt.',
  wishViolated: 'Verletzte „Kein Dienst"-Wünsche: an einem Wunschtag wurde dennoch ein Dienst zugeteilt.',
  seasonalAbsence: 'Historische Krankheitsquote (K/KK) je Kalendermonat über alle in RadPlan erfassten Jahre hinweg — zeigt saisonale Muster (z.B. Grippewelle im Winter), unabhängig von der linearen Hochrechnung oben.',

  // — Jahresgitter & Kurven —
  yeargrid: 'Monats-Heatmap: Dienste je Person und Monat über das Jahr. Farbe = Abweichung vom Monats-Kollegiums-Durchschnitt.',
  yeargridMean: 'Monatlicher Kollegiums-Durchschnitt der Dienste – Bezugswert für die Heatmap-Einfärbung.',
  curve: 'Verlaufskurve: Entwicklung der kumulierten Dienste je Person über die Monate.',

  // — Kombinierte Coverage-/Fairness-Heatmap (Vorschlag 16) —
  combinedRisk: 'Verknüpft Besetzungslücken mit der Fairness-Verteilung: markiert Tage, die entweder offen sind (kein D/HG zugeteilt) oder nur besetzt werden konnten, weil eine bereits überdurchschnittlich belastete Person eingesprungen ist ("Belastungs-Tag").',
  combinedRiskStrainDay: 'Belastungs-Tag: An diesem Tag war die Besetzung zwar vollständig, aber mindestens eine der eingeteilten Personen liegt über ihrem fairen Anteil an Diensten im gewählten Zeitraum – die Lücke wurde also auf Kosten der Fairness geschlossen.',
  combinedRiskGapDay: 'Offener Tag: An diesem Tag fehlt mindestens ein Dienst (D oder HG) ganz.',
  combinedRiskStrainScore: 'Belastungs-Score: gewichtete Anzahl der Tage, an denen diese Person trotz bereits überdurchschnittlicher Dienstlast eine Besetzungslücke geschlossen hat (Wochenend-/Feiertage zählen doppelt).',

  // — Burnout-/Belastungs-Risiko-Score (Vorschlag 8) —
  burnoutScore: 'Belastungs-Risiko-Score (0–100, höher = kritischer): verdichtet Gesamt-Überlast, Wochenend-/Feiertags-Überlast und die Häufung eng getakteter Dienste (< 3 Tage Abstand) zu einer einzigen Kennzahl.',
  burnoutOverload: 'Anteil, um den die Gesamt-Dienstzahl dieser Person über ihrem fairen Anteil im Zeitraum liegt (0% = genau fair, 50%+ = maximaler Teil-Score).',
  burnoutWeOverload: 'Anteil, um den die Wochenend-/Feiertagsdienste dieser Person über ihrem fairen WE-Anteil liegen.',
  burnoutCluster: 'Anzahl der Dienst-Häufungen (zwei Dienste mit weniger als 3 Tagen Abstand) dieser Person im Zeitraum – ein starker Belastungsindikator, unabhängig von der reinen Gesamtzahl an Diensten.',

  // — Mehrjahres-Benchmarking (Vorschlag 11) —
  multiYearChart: 'Überlagerung der monatlichen Team-Durchschnitte an Bereitschaftsdiensten (D) je Jahr. Zeigt, ob sich die saisonale Belastungskurve über die Jahre strukturell verschiebt (z. B. dauerhaft höhere Basislast) statt nur zufällig zu schwanken.',
  multiYearEquity: 'Equity-Index des Jahres (0–100, höher = gerechter verteilt), berechnet aus dem Gini-Koeffizienten der Gesamtdienste aller Personen in diesem Jahr. Ermöglicht den direkten Vergleich der Verteilungsgerechtigkeit über mehrere Jahre.',
  multiYearCv: 'Variationskoeffizient der Gesamtdienste je Person in diesem Jahr (in %, niedriger = gleichmäßiger). Ergänzt den Equity-Index um ein zweites, skalenunabhängiges Streuungsmaß.',
  multiYearMean: 'Durchschnittliche Anzahl an Diensten (BD+HG) je dienstfähiger Person in diesem Jahr.',
  multiYearSpread: 'Differenz zwischen der höchsten und niedrigsten Gesamt-Dienstzahl aller Personen in diesem Jahr.',
  multiYearDelta: 'Veränderung dieser Kennzahl gegenüber dem unmittelbaren Vorjahr. Grün = Verbesserung, Rot = Verschlechterung.',

  // — Mitarbeitendenbereich —
  empActive: 'Mitarbeitende mit mindestens einem erfassten Aktivitätsmonat im Jahr.',
  empActiveMonths: 'Zahl der Monate im Jahr, in denen für diese Person Plandaten vorliegen.',
  workdays: 'Werktage im Monat: Mo–Fr ohne gesetzliche Feiertage (Sachsen).',
  utilization: 'Auslastung: Anteil der verplanten Tage (Arbeitsplatz, Dienst oder Status) an den möglichen Tagen.',
};

// ---------------------------------------------------------------------------
//  Wert-Interpretation (TTI = Tooltip-Interpret)
// ---------------------------------------------------------------------------
//  Liefert für den KONKRET angezeigten Wert einen vollständigen, fachlich
//  einordnenden Tooltip-Text: Definition + Lesart genau dieses Ergebnisses
//  („was bedeutet die 82 hier?"). Alle Funktionen geben attribut-sichere
//  Strings (ohne gerade Anführungszeichen) zurück. Verwendung am WERT-Element:
//    `<span class="value" data-tooltip="${TTI.equity(v)}">${v}</span>`
const _de1 = (n) => (Math.round((n ?? 0) * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
const _abs1 = (n) => _de1(Math.abs(n ?? 0));

// Qualitative Bänder für 0–100-Scores (höher = besser).
export function scoreBand(v) {
  if (v >= 85) return 'sehr gut';
  if (v >= 70) return 'gut';
  if (v >= 55) return 'mittel';
  if (v >= 40) return 'schwach';
  return 'kritisch';
}

export const TTI = {
  // Equity-Index 0–100 (Verteilungsgerechtigkeit, höher = fairer).
  equity(v, scope = 'der Dienste') {
    const r = Math.round(v ?? 0);
    let read;
    if (r >= 85) read = `nahezu gleichmäßige, FTE-gerechte Verteilung ${scope}.`;
    else if (r >= 70) read = `überwiegend ausgewogene Verteilung ${scope} mit leichten Unterschieden.`;
    else if (r >= 55) read = `spürbare Ungleichheit ${scope} – einzelne tragen merklich mehr oder weniger.`;
    else read = `deutliche Ungleichverteilung ${scope}; Ausgleich dringend empfohlen.`;
    return `Equity-Index ${r}/100 (${scoreBand(r)}): ${read}`;
  },

  // Allgemeiner 0–100-Score mit frei wählbarer Gut-/Schlecht-Bedeutung.
  score(v, goodMeaning, badMeaning) {
    const r = Math.round(v ?? 0);
    const read = r >= 70 ? goodMeaning : badMeaning;
    return `${r}/100 (${scoreBand(r)}): ${read}`;
  },

  // Versorgungs-Risiko-Index (höher = sicherer).
  risk(v, gaps = 0) {
    const r = Math.round(v ?? 0);
    let read;
    if (r >= 90) read = 'Versorgung nahezu lückenlos abgesichert.';
    else if (r >= 75) read = 'überwiegend abgesichert, einzelne Lücken.';
    else if (r >= 55) read = 'erhöhtes Versorgungsrisiko durch mehrere Lücken.';
    else read = 'hohes Versorgungsrisiko – viele bzw. kritische Dienstlücken.';
    const g = gaps > 0 ? ` Aktuell ${gaps} gewichtete Lücke(n).` : '';
    return `Risiko-Index ${r}/100 (${scoreBand(r)}, höher = sicherer): ${read}${g}`;
  },

  // Abdeckungsquote eines Dienstes in Prozent (höher = besser).
  coveragePct(v, dutyLabel = 'Dienst') {
    const r = Math.round(v ?? 0);
    let read;
    if (r >= 99) read = 'an praktisch allen Tagen besetzt.';
    else if (r >= 90) read = 'fast durchgängig besetzt, wenige offene Tage.';
    else if (r >= 70) read = 'überwiegend besetzt, aber spürbare Lücken.';
    else read = 'erhebliche Besetzungslücken.';
    return `${dutyLabel} an ${r}% der Tage des Zeitraums besetzt: ${read}`;
  },

  // Regelkonformitäts-Score (höher = weniger Verstöße).
  compliance(v, high = 0) {
    const r = Math.round(v ?? 0);
    let read;
    if (r >= 95) read = 'keine bzw. nur geringfügige Regelabweichungen.';
    else if (r >= 80) read = 'einige Abweichungen, überwiegend unkritisch.';
    else if (r >= 60) read = 'mehrere relevante Verstöße – Prüfung empfohlen.';
    else read = 'gravierende Regelverstöße – Korrektur dringend nötig.';
    const h = high > 0 ? ` Darunter ${high} kritische(r) Befund(e).` : '';
    return `Regelkonformität ${r}/100 (${scoreBand(r)}): ${read}${h}`;
  },

  // Variationskoeffizient in % (niedriger = gleichmäßiger).
  cv(v) {
    const r = Math.round(v ?? 0);
    let read;
    if (r <= 15) read = 'sehr geringe Streuung – gleichmäßige Verteilung.';
    else if (r <= 30) read = 'moderate Streuung um den Mittelwert.';
    else if (r <= 50) read = 'deutliche Streuung – ungleiche Belastung.';
    else read = 'sehr hohe Streuung – stark ungleiche Belastung.';
    return `Variationskoeffizient ${r}% (Streuung relativ zum Mittel, niedriger = gleichmäßiger): ${read}`;
  },

  // Spannweite min–max der Dienste.
  spread(min, max, diff) {
    const d = Math.round(diff ?? (max - min));
    const read = d === 0 ? 'alle tragen gleich viele Dienste.'
      : d <= 3 ? 'enge Spanne – relativ ausgeglichen.'
      : d <= 7 ? 'mittlere Spanne zwischen meist- und wenigstbelasteter Person.'
      : 'große Spanne – stark unterschiedliche Belastung.';
    return `Spannweite ${Math.round(min)}–${Math.round(max)} Dienste (Differenz ${d}): ${read}`;
  },

  // Fairness-Abweichung einer Person vom fairen Anteil (Dienste).
  fairDelta(dev, status) {
    const a = _abs1(dev);
    if (status === 'over') return `Diese Person leistet ${a} Dienst(e) MEHR als ihr FTE-gewichteter fairer Anteil – überdurchschnittlich belastet.`;
    if (status === 'under') return `Diese Person leistet ${a} Dienst(e) WENIGER als ihr fairer Anteil – unterdurchschnittlich belastet.`;
    return 'Belastung liegt innerhalb der Toleranz um den fairen Anteil – fair verteilt.';
  },

  // Status-Pille Über/Fair/Unter.
  status(status) {
    if (status === 'over') return 'Status „Über": leistet mehr Dienste als den fairen Anteil – Entlastung prüfen.';
    if (status === 'under') return 'Status „Unter": leistet weniger als den fairen Anteil – kann mehr übernehmen.';
    return 'Status „Fair": Belastung entspricht dem fairen Anteil (innerhalb der Toleranz).';
  },

  // Soll/Ist-Abweichung Bereitschaftsdienst.
  bdDelta(delta) {
    const r = Math.round(delta ?? 0);
    if (r > 0) return `${r} Bereitschaftsdienst(e) ÜBER dem FTE-Soll geleistet.`;
    if (r < 0) return `${Math.abs(r)} Bereitschaftsdienst(e) UNTER dem FTE-Soll – Rückstand zum Ziel.`;
    return 'Bereitschaftsdienste genau auf dem FTE-Soll.';
  },

  // Wunscherfüllungsrate in %.
  wishRate(rate, fulfilled, wishes) {
    if (rate === null || rate === undefined || !wishes) return 'Im Zeitraum wurden keine Dienstwünsche erfasst.';
    const r = Math.round(rate);
    const read = r >= 90 ? 'nahezu alle Wünsche berücksichtigt.'
      : r >= 70 ? 'die meisten Wünsche erfüllt.'
      : r >= 50 ? 'etwa die Hälfte der Wünsche erfüllt.'
      : 'die Mehrheit der Wünsche konnte nicht erfüllt werden.';
    return `${r}% der Dienstwünsche erfüllt (${fulfilled}/${wishes}): ${read}`;
  },

  // Jahresend-Abweichung der Prognose vom Jahresziel.
  forecastDelta(delta) {
    const r = Math.round(delta ?? 0);
    if (r > 0) return `Hochrechnung liegt ${r} Dienst(e) ÜBER dem Jahresziel – Kurs auf Mehrbelastung.`;
    if (r < 0) return `Hochrechnung liegt ${Math.abs(r)} Dienst(e) UNTER dem Jahresziel – Kurs auf Unterauslastung.`;
    return 'Hochrechnung trifft das Jahresziel punktgenau.';
  },

  // Offene Tage ganz ohne Dienst.
  openDays(n) {
    if (!n) return 'Kein Tag bleibt ganz ohne Dienstbesetzung – lückenlos.';
    return `${n} Tag(e) ganz ohne Dienst (weder D noch HG) – höchste Handlungspriorität.`;
  },

  // Unbesetzte Dienste an Wochenenden/Feiertagen.
  weHolGaps(n) {
    if (!n) return 'Keine offenen Dienste an Wochenenden oder Feiertagen.';
    return `${n} unbesetzte(r) Dienst(e) an Wochenenden/Feiertagen – besonders kritisch (im Risiko doppelt gewichtet).`;
  },

  // Abwesenheits-Spitzentag.
  absencePeak(n) {
    if (!n) return 'Keine gleichzeitigen Abwesenheiten erfasst.';
    return `An der Spitze sind ${n} Personen gleichzeitig abwesend – maßgeblich für Engpass-Risiken.`;
  },

  // Auslastung/Abdeckung einer Person in %.
  utilization(v) {
    const r = Math.round(v ?? 0);
    const read = r >= 90 ? 'nahezu vollständig verplant.'
      : r >= 70 ? 'überwiegend verplant.'
      : r >= 40 ? 'teilweise verplant – viele freie/offene Tage.'
      : 'gering verplant.';
    return `${r}% der möglichen Tage verplant: ${read}`;
  },
};
