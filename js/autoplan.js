import { 
  VACATION_CODES, 
  ABSENCE_CODES, 
  isFacharzt, 
  isAssistenzarzt, 
  getSaxonyHolidaysCached, 
  monthKey, 
  dateKey,
  daysInMonth, 
  weekday, 
  isWeekend,
  isWorkday, 
  isHoliday, 
  nextCalendarDay, 
  prevCalendarDay, 
  isoWeekNumber,
  easterDate, 
  addDays,
  DOW_ABBR,
  DOW_LONG,
  MONTHS,
  MONTHS_SHORT,
  getEmpMeta,
  posColor
} from './constants.js';

import { 
  state, 
  planMode, 
  planData, 
  DATA 
} from './state.js';

import { 
  getMonthData, 
  getCell, 
  dutyOwner 
} from './model.js';

export let autoPlanResult = null;
export let autoPlanTargets = {};
export let apViewMode = "config";
export let autoPlanConfigRenderToken = 0;

export const DUTY_EXEMPT = ["Prof. Schäfer"];
export const TARGET_WEEKEND_DUTY = 1;
export const RELAXED_WEEKEND_DUTY_LIMIT = 1.5;

export function isDutyExempt(empName) { 
  return DUTY_EXEMPT.includes(empName); 
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function collectHistoricalDutyStats(upToYear, upToMonth) {
  const stats = {};
  const md = getMonthData(upToYear, upToMonth);
  
  md.employees.forEach((e) => {
    stats[e] = { 
      bd: 0, 
      hg: 0, 
      weDuty: 0, 
      holDuty: 0, 
      thuBd: 0, 
      hgForAA: 0, 
      hgForFA: 0, 
      satBd: 0 
    };
  });
  
  for (const [k, mData] of Object.entries(DATA)) {
    if (!mData || typeof mData !== "object" || !Array.isArray(mData.employees) || !mData.assignments) {
      continue;
    }
    
    const parts = k.split("-");
    const ky = parseInt(parts[0], 10);
    const km = parseInt(parts[1], 10);
    
    if (!Number.isFinite(ky) || !Number.isFinite(km) || km < 0 || km > 11) {
      continue;
    }
    
    if (ky > upToYear || (ky === upToYear && km >= upToMonth)) {
      continue;
    }
    
    const hols = getSaxonyHolidaysCached(ky);
    const dim = daysInMonth(ky, km);
    const weMapPerEmp = {};
    const bdOwnerByDay = {};
    const dayMeta = new Array(dim + 1);
    
    for (let d = 1; d <= dim; d++) {
      const wd = weekday(ky, km, d);
      dayMeta[d] = { 
        wd: wd, 
        hol: isHoliday(ky, km, d, hols), 
        isWEDay: wd === 5 || wd === 6 || wd === 0, 
        kw: isoWeekNumber(ky, km, d) 
      };
    }
    
    mData.employees.forEach(emp => {
      if (!stats[emp]) {
        stats[emp] = { bd: 0, hg: 0, weDuty: 0, holDuty: 0, thuBd: 0, hgForAA: 0, hgForFA: 0, satBd: 0 };
      }
      weMapPerEmp[emp] = {};
    });
    
    for (let d = 1; d <= dim; d++) {
      mData.employees.forEach(emp => { 
        if (mData.assignments?.[emp]?.[d]?.duty === "D") {
          bdOwnerByDay[d] = emp;
        }
      });
    }
    
    for (let d = 1; d <= dim; d++) {
      const meta = dayMeta[d];
      mData.employees.forEach(emp => {
        const cell = mData.assignments?.[emp]?.[d];
        if (!cell?.duty) {
          return;
        }
        
        if (cell.duty === "D") {
          stats[emp].bd++;
          if (meta.hol) stats[emp].holDuty++;
          if (meta.wd === 4) stats[emp].thuBd++;
          if (meta.wd === 6) stats[emp].satBd++;
          if (meta.isWEDay) {
            if (!weMapPerEmp[emp][meta.kw]) {
              weMapPerEmp[emp][meta.kw] = { hasD: false, hasHG: false };
            }
            weMapPerEmp[emp][meta.kw].hasD = true;
          }
        } else if (cell.duty === "HG") {
          stats[emp].hg++;
          if (meta.hol) stats[emp].holDuty++;
          if (meta.isWEDay) {
            if (!weMapPerEmp[emp][meta.kw]) {
              weMapPerEmp[emp][meta.kw] = { hasD: false, hasHG: false };
            }
            if (!weMapPerEmp[emp][meta.kw].hasD) {
              weMapPerEmp[emp][meta.kw].hasHG = true;
            }
          }
          const bdHolder = bdOwnerByDay[d];
          if (bdHolder && isAssistenzarzt(bdHolder)) {
            stats[emp].hgForAA++;
          } else {
            stats[emp].hgForFA++;
          }
        }
      });
    }
    
    mData.employees.forEach(emp => {
      Object.values(weMapPerEmp[emp] || {}).forEach(({hasD, hasHG}) => {
        if (hasD) {
          stats[emp].weDuty += 1; 
        } else if (hasHG) {
          stats[emp].weDuty += 0.5;
        }
      });
    });
  }
  return stats;
}

export async function collectHistoricalDutyStatsAsync(upToYear, upToMonth) {
  await sleep(0);
  return collectHistoricalDutyStats(upToYear, upToMonth);
}

export function hasVacationInWeek(y, m, emp, targetKW) {
  const dim = daysInMonth(y, m);
  for (let d = 1; d <= dim; d++) {
    if (isoWeekNumber(y, m, d) !== targetKW) continue;
    const cell = getCell(y, m, emp, d);
    if (cell.assignment && cell.assignment.split("/").map((x) => x.trim()).some((c) => VACATION_CODES.includes(c))) {
      return true;
    }
  }
  
  const nextM = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;
  const nk = monthKey(nextY, nextM);
  
  if (DATA[nk]) {
    const ndim = daysInMonth(nextY, nextM);
    for (let d = 1; d <= ndim; d++) {
      if (isoWeekNumber(nextY, nextM, d) !== targetKW) continue;
      const cell = DATA[nk].assignments?.[emp]?.[d];
      if (cell?.assignment && cell.assignment.split("/").map((x) => x.trim()).some((c) => VACATION_CODES.includes(c))) {
        return true;
      }
    }
  }
  return false;
}

export function isAbsentOnDay(y, m, emp, day, assignments) {
  const cell = assignments[emp]?.[day];
  if (!cell?.assignment) return false;
  return cell.assignment.split("/").map((x) => x.trim()).some((c) => ABSENCE_CODES.includes(c));
}

export function isVacationOnDay(y, m, emp, day, assignments) {
  const cell = assignments[emp]?.[day];
  if (!cell?.assignment) return false;
  return cell.assignment.split("/").map((x) => x.trim()).some((c) => VACATION_CODES.includes(c));
}

export function isNextDayVacation(y, m, emp, d, assignments) {
  const next = nextCalendarDay(y, m, d);
  if (next.y === y && next.m === m) {
    return isVacationOnDay(y, m, emp, next.d, assignments);
  }
  const nk = monthKey(next.y, next.m);
  if (DATA[nk]?.assignments?.[emp]?.[next.d]) {
    const cell = DATA[nk].assignments[emp][next.d];
    if (cell.assignment && cell.assignment.split("/").map((x) => x.trim()).some((c) => VACATION_CODES.includes(c))) {
      return true;
    }
  }
  return false;
}

export function hasCTLeadershipConflict(y, m, emp, day, assignments) {
  if (emp !== "Dr. Becker" && emp !== "Dr. Martin") {
    return false;
  }
  
  const partner = emp === "Dr. Becker" ? "Dr. Martin" : "Dr. Becker";
  const next = nextCalendarDay(y, m, day);
  const hols = getSaxonyHolidaysCached(next.y);
  
  if (!isWorkday(next.y, next.m, next.d, hols)) {
    return false;
  }
  
  let partnerCell;
  if (next.y === y && next.m === m) {
    partnerCell = assignments[partner]?.[next.d] || {};
  } else {
    const nk = monthKey(next.y, next.m);
    partnerCell = DATA[nk]?.assignments?.[partner]?.[next.d] || {};
  }
  
  return !!(partnerCell.assignment && partnerCell.assignment.split("/").map((x) => x.trim()).some((c) => VACATION_CODES.includes(c)));
}

export function countWeekendDuties(y, m, emp, assignments) {
  const weMap = {};
  const dim = daysInMonth(y, m);
  
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    if (wd !== 5 && wd !== 6 && wd !== 0) continue;
    
    const cell = assignments[emp]?.[d];
    if (!cell?.duty) continue;
    
    const kw = isoWeekNumber(y, m, d);
    if (!weMap[kw]) {
      weMap[kw] = { hasD: false, hasHG: false };
    }
    
    if (cell.duty === "D") {
      weMap[kw].hasD = true;
    } else if (cell.duty === "HG") {
      weMap[kw].hasHG = true;
    }
  }
  
  let count = 0;
  for (const { hasD, hasHG } of Object.values(weMap)) {
    if (hasD) {
      count += 1;
    } else if (hasHG) {
      count += 0.5;
    }
  }
  return count;
}

export function getWeekendDutyKWs(y, m, emp, assignments) {
  const dim = daysInMonth(y, m);
  const kws = new Set();
  
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const cell = assignments[emp]?.[d];
    if (!cell?.duty) continue;
    
    if (wd === 5 || wd === 6 || wd === 0) {
      kws.add(isoWeekNumber(y, m, d));
    }
  }
  return kws;
}

export function wouldCreateDFDF(emp, d, assignments) {
  if (d >= 3 && assignments[emp]?.[d - 2]?.duty === "D" && assignments[emp]?.[d - 1]?.assignment === "F") {
    return true;
  }
  if (assignments[emp]?.[d + 2]?.duty === "D" && assignments[emp]?.[d + 1]?.assignment === "F") {
    return true;
  }
  return false;
}

export function getWeekendStateForKW(y, m, emp, assignments, kw) {
  const dim = daysInMonth(y, m);
  let hasD = false;
  let hasHG = false;
  
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    if (wd !== 5 && wd !== 6 && wd !== 0) continue;
    if (isoWeekNumber(y, m, d) !== kw) continue;
    
    const duty = assignments[emp]?.[d]?.duty;
    if (duty === "D") {
      hasD = true;
    } else if (duty === "HG") {
      hasHG = true;
    }
  }
  return { hasD, hasHG };
}

export function projectedWeekendDutyCount(y, m, emp, assignments, dutyCode, d) {
  const current = countWeekendDuties(y, m, emp, assignments);
  const wd = weekday(y, m, d);
  
  if (wd !== 5 && wd !== 6 && wd !== 0) {
    return current;
  }
  
  const kw = isoWeekNumber(y, m, d);
  const { hasD, hasHG } = getWeekendStateForKW(y, m, emp, assignments, kw);
  
  if (dutyCode === "D") {
    if (hasD) return current;
    return current + (hasHG ? 0.5 : 1);
  }
  
  if (dutyCode === "HG") {
    if (hasD || hasHG) return current;
    return current + 0.5;
  }
  
  return current;
}

export function wouldCreateConsecutiveWeekendDuty(y, m, emp, assignments, d) {
  const wd = weekday(y, m, d);
  if (wd !== 5 && wd !== 6 && wd !== 0) {
    return false;
  }
  
  const candidateKw = isoWeekNumber(y, m, d);
  const kws = getWeekendDutyKWs(y, m, emp, assignments);
  
  if (!kws.has(candidateKw)) {
    kws.add(candidateKw);
  }
  
  const ordered = [...kws].sort((a, b) => a - b);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i] - ordered[i - 1] === 1) {
      return true;
    }
  }
  return false;
}

export function dutyKey(emp, day) { 
  return `${emp}@@${day}`; 
}

export function buildRuleTelemetryBucket() { 
  return { counts: {}, events: [] }; 
}

export function trackRuleTelemetry(bucket, phase, label, detail, severity = "info") {
  if (!bucket || !label) return;
  bucket.counts[label] = (bucket.counts[label] || 0) + 1;
  bucket.events.push({ phase, label, detail, severity, count: bucket.counts[label] });
}

export function computeFairnessSpread(values) {
  if (!values.length) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
}

export function averageFromArray(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function listDutyAssignments(emps, dim, assignments, dutyCode) {
  const items = [];
  for (let d = 1; d <= dim; d++) {
    for (const emp of emps) {
      if (assignments[emp]?.[d]?.duty === dutyCode) {
        items.push({ day: d, emp });
        break;
      }
    }
  }
  return items;
}

export function cleanupAssignmentCell(assignments, emp, day) {
  if (!assignments[emp]?.[day]) return;
  Object.keys(assignments[emp][day]).forEach((key) => {
    if (!assignments[emp][day][key]) {
      delete assignments[emp][day][key];
    }
  });
  if (!Object.keys(assignments[emp][day]).length) {
    delete assignments[emp][day];
  }
}

export function computeAutoPlan(customTargets) {
  const { year: y, month: m } = state;
  if (!planMode || !planData) return null;
  
  const hols = getSaxonyHolidaysCached(y);
  const dim = daysInMonth(y, m);
  const emps = [...planData.employees];
  const wishes = planData.wishes || {};
  const result = JSON.parse(JSON.stringify(planData.assignments));
  const externalAssignments = {};
  const log = [];
  const report = [];
  const fluxTraces = [];
  const fixedDutyKeys = new Set();
  const autoRestDays = new Set();
  const ruleTelemetry = buildRuleTelemetryBucket();
  const beckerSaturdayFzaWarnings = [];

  function trace(phase, msg) { 
    fluxTraces.push({ phase, msg }); 
  }
  
  function recordRule(phase, label, detail, severity = "info") { 
    trackRuleTelemetry(ruleTelemetry, phase, label, detail, severity); 
  }
  
  function isDayDTasked(d, assignments = result) { 
    return emps.some(e => assignments[e]?.[d]?.duty === "D"); 
  }
  
  function isDayHGTasked(d, assignments = result) { 
    return emps.some(e => assignments[e]?.[d]?.duty === "HG"); 
  }

  emps.forEach((emp) => {
    for (let d = 1; d <= dim; d++) {
      const duty = planData.assignments?.[emp]?.[d]?.duty;
      if (duty) {
        fixedDutyKeys.add(`${duty}:${dutyKey(emp, d)}`);
      }
    }
  });

  log.push({ phase: "init", icon: "📊", msg: "Lade historische Daten und initialisiere Constraints...", pct: 5 });
  
  const hist = collectHistoricalDutyStats(y, m);
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  const hgFAs = dutyEmps.filter((e) => isFacharzt(e));

  const bdTarget = {};
  emps.forEach((e) => {
    if (customTargets && customTargets[e] !== undefined) {
      bdTarget[e] = customTargets[e];
    } else {
      if (isDutyExempt(e)) bdTarget[e] = 0;
      else if (e === "Dr. Polednia" || e === "Dr. Becker" || e === "Hr. Sebastian") bdTarget[e] = 3;
      else bdTarget[e] = 4;
    }
  });

  function getScheduledCell(targetY, targetM, emp, day, assignments = result) {
    if (targetY === y && targetM === m) {
      return assignments[emp]?.[day] || {};
    }
    const mk = monthKey(targetY, targetM);
    const stored = DATA[mk]?.assignments?.[emp]?.[day] || {};
    const queued = externalAssignments[mk]?.[emp]?.[day] || {};
    return { ...stored, ...queued };
  }

  function getScheduledDuty(targetY, targetM, emp, day, assignments = result) { 
    return getScheduledCell(targetY, targetM, emp, day, assignments).duty || null; 
  }
  
  function getScheduledAssignmentCodes(targetY, targetM, emp, day, assignments = result) {
    const assignment = getScheduledCell(targetY, targetM, emp, day, assignments).assignment || "";
    return assignment.split("/").map((code) => code.trim()).filter(Boolean);
  }

  function findNextWorkdayFrom(startY, startM, startD) {
    let cursor = nextCalendarDay(startY, startM, startD);
    let guard = 0;
    while (guard < 14) {
      const holsForCursor = getSaxonyHolidaysCached(cursor.y);
      if (isWorkday(cursor.y, cursor.m, cursor.d, holsForCursor)) {
        return cursor;
      }
      cursor = nextCalendarDay(cursor.y, cursor.m, cursor.d);
      guard++;
    }
    return null;
  }

  function hasOtherFAFreeOrVacationOn(targetY, targetM, day, excludedEmp, assignments = result) {
    return hgFAs.some((emp) => {
      if (emp === excludedEmp) return false;
      const codes = getScheduledAssignmentCodes(targetY, targetM, emp, day, assignments);
      return codes.some((code) => code === "F" || VACATION_CODES.includes(code));
    });
  }

  function queueExternalAssignment(targetY, targetM, emp, day, patch) {
    const mk = monthKey(targetY, targetM);
    if (!externalAssignments[mk]) {
      externalAssignments[mk] = {};
    }
    if (!externalAssignments[mk][emp]) {
      externalAssignments[mk][emp] = {};
    }
    const existingQueued = externalAssignments[mk][emp][day] || {};
    const existingStored = DATA[mk]?.assignments?.[emp]?.[day] || {};
    const merged = { ...existingQueued };
    
    for (const [key, value] of Object.entries(patch)) {
      if (!value) continue;
      if (!existingQueued[key] && !existingStored[key]) {
        merged[key] = value;
      }
    }
    
    if (Object.keys(merged).length) {
      externalAssignments[mk][emp][day] = merged;
    }
  }

  let repairedF = 0;
  for (const emp of emps) {
    if (!result[emp]) continue;
    for (let d = 1; d <= dim; d++) {
      if (result[emp][d]?.duty !== "D") continue;
      const next = nextCalendarDay(y, m, d);
      if (next.y === y && next.m === m) {
        if (!result[emp]) result[emp] = {};
        if (!result[emp][next.d]) result[emp][next.d] = {};
        if (!result[emp][next.d].assignment) {
          result[emp][next.d].assignment = "F";
          autoRestDays.add(dutyKey(emp, next.d));
          repairedF++;
        }
      }
    }
  }
  
  if (repairedF > 0) {
    log.push({ phase: "init", icon: "🔧", msg: `${repairedF} fehlende Ruhetage nach gesetzten BD ergänzt`, pct: 10 });
  }

  const currentBD = {};
  const currentHG = {};
  const currentHGForAA = {};
  const currentHGForFA = {};
  const currentSatBD = {};
  
  emps.forEach((e) => { 
    currentBD[e] = 0; 
    currentHG[e] = 0; 
    currentHGForAA[e] = 0; 
    currentHGForFA[e] = 0; 
    currentSatBD[e] = 0; 
  });
  
  for (let d = 1; d <= dim; d++) {
    for (const e of emps) {
      if (!result[e]?.[d]) continue;
      const wd = weekday(y, m, d);
      
      if (result[e][d].duty === "D") { 
        currentBD[e]++; 
        if (wd === 6) currentSatBD[e]++; 
      }
      
      if (result[e][d].duty === "HG") {
        currentHG[e]++;
        const bdHolder = emps.find((e2) => e2 !== e && result[e2]?.[d]?.duty === "D");
        if (bdHolder && isAssistenzarzt(bdHolder)) {
          currentHGForAA[e]++;
        } else {
          currentHGForFA[e]++;
        }
      }
    }
  }

  const bdNeeded = [];
  const hgNeeded = [];
  for (let d = 1; d <= dim; d++) {
    if (!emps.some((e) => result[e]?.[d]?.duty === "D")) bdNeeded.push(d);
    if (!emps.some((e) => result[e]?.[d]?.duty === "HG")) hgNeeded.push(d);
  }

  const easter = easterDate(y);
  const easterDays = new Set();
  const pfingstDays = new Set();
  
  [addDays(easter, -2), easter, addDays(easter, 1)].forEach((dt) => { 
    if (dt.getMonth() === m) easterDays.add(dt.getDate()); 
  });
  [addDays(easter, 49), addDays(easter, 50)].forEach((dt) => { 
    if (dt.getMonth() === m) pfingstDays.add(dt.getDate()); 
  });

  function hasOsterPfingstDutyInOtherMonth(emp, isEaster) {
    const targetDates = isEaster ? [addDays(easter, -2), easter, addDays(easter, 1)] : [addDays(easter, 49), addDays(easter, 50)];
    for (const dt of targetDates) {
      const tm = dt.getMonth(); 
      const td = dt.getDate();
      if (tm === m) continue;
      const mk = monthKey(y, tm);
      if (DATA[mk]?.assignments?.[emp]?.[td]?.duty) return true;
    }
    return false;
  }

  function workedEasterOrPfingsten(emp) {
    let easterWork = false;
    let pfingstWork = false;
    
    for (const d of easterDays) {
      if (result[emp]?.[d]?.duty) easterWork = true;
    }
    for (const d of pfingstDays) {
      if (result[emp]?.[d]?.duty) pfingstWork = true;
    }
    
    if (!easterWork) easterWork = hasOsterPfingstDutyInOtherMonth(emp, true);
    if (!pfingstWork) pfingstWork = hasOsterPfingstDutyInOtherMonth(emp, false);
    
    return { easterWork, pfingstWork };
  }

  function hasHolidayBlockConflict(emp, d) {
    if (easterDays.has(d)) return workedEasterOrPfingsten(emp).pfingstWork;
    if (pfingstDays.has(d)) return workedEasterOrPfingsten(emp).easterWork;
    return false;
  }

  function hasAdjacentHG(emp, d, assignments = result) {
    const prev = prevCalendarDay(y, m, d);
    const next = nextCalendarDay(y, m, d);
    return (getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "HG" || getScheduledDuty(next.y, next.m, emp, next.d, assignments) === "HG");
  }

  function updateAutoF(emp, day) {
    const next = nextCalendarDay(y, m, day);
    if (next.y === y && next.m === m) {
      if (!result[emp]) result[emp] = {};
      if (!result[emp][next.d]) result[emp][next.d] = {};
      if (!result[emp][next.d].assignment) { 
        result[emp][next.d].assignment = "F"; 
        autoRestDays.add(dutyKey(emp, next.d)); 
      }
      return;
    }
    queueExternalAssignment(next.y, next.m, emp, next.d, { assignment: "F" });
  }

  function clearAutoF(emp, day) {
    const next = nextCalendarDay(y, m, day);
    if (next.y !== y || next.m !== m) return;
    
    const key = dutyKey(emp, next.d);
    if (!autoRestDays.has(key)) return;
    
    if (result[emp]?.[next.d]?.assignment === "F") {
      delete result[emp][next.d].assignment;
    }
    cleanupAssignmentCell(result, emp, next.d);
    autoRestDays.delete(key);
  }

  function minDistanceForDuty(emp, d, dutyCode, assignments = result) {
    let minDist = Infinity;
    for (let i = 1; i <= dim; i++) {
      if (i === d) continue;
      if (assignments[emp]?.[i]?.duty === dutyCode) {
        minDist = Math.min(minDist, Math.abs(i - d));
      }
    }
    return minDist;
  }

  function canDoBD(emp, d, relaxed = false, assignments = result, options = {}) {
    const { ignoreExistingDuty = false } = options;
    
    if (isDutyExempt(emp) || bdTarget[emp] === 0) return false;
    if (isAbsentOnDay(y, m, emp, d, assignments)) return false;
    
    const existingDuty = assignments[emp]?.[d]?.duty;
    if (existingDuty && !(ignoreExistingDuty && existingDuty === "D")) return false;
    
    if (wishes[emp]?.[d] === "NO_DUTY") return false;
    
    const wd = weekday(y, m, d);
    if (wd === 6 && !isFacharzt(emp)) return false;
    if (emp === "Dr. Polednia" && (wd === 0 || wd === 2 || wd === 4)) return false;
    if (hasCTLeadershipConflict(y, m, emp, d, assignments)) return false;
    if (assignments[emp]?.[d]?.assignment === "F") return false;
    if (isNextDayVacation(y, m, emp, d, assignments)) return false;
    
    const prev = prevCalendarDay(y, m, d);
    const next = nextCalendarDay(y, m, d);
    
    if (getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "D") return false;
    if (getScheduledDuty(next.y, next.m, emp, next.d, assignments) === "D") return false;
    if (getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "HG" && weekday(prev.y, prev.m, prev.d) !== 5) return false;
    if (hasHolidayBlockConflict(emp, d)) return false;
    
    if (!relaxed) {
      if (currentBD[emp] >= bdTarget[emp]) return false;
      const projectedWe = projectedWeekendDutyCount(y, m, emp, assignments, "D", d);
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) return false;
      if (wouldCreateConsecutiveWeekendDuty(y, m, emp, assignments, d)) return false;
      if (emp === "Dr. Becker" && wd === 6) return false;
      const minDistD = minDistanceForDuty(emp, d, "D", assignments);
      if (minDistD < 3) return false;
    }
    return true;
  }

  function scoreBDCandidate(emp, d, relaxed, phaseKey) {
    if (!canDoBD(emp, d, relaxed)) {
      return { score: -Infinity, tags: [] };
    }
    
    let score = 100;
    const wd = weekday(y, m, d);
    const isWE = wd === 5 || wd === 6 || wd === 0;
    const tags = [];
    const projectedWe = projectedWeekendDutyCount(y, m, emp, result, "D", d);
    const minDistD = minDistanceForDuty(emp, d, "D", result);
    
    if (currentBD[emp] >= bdTarget[emp]) { 
      score -= 7000 * (currentBD[emp] - bdTarget[emp] + 1); 
      tags.push("Soll überschritten"); 
    } else { 
      score += (bdTarget[emp] - currentBD[emp]) * 220; 
      tags.push("Zielerfüllung"); 
    }
    
    if (wishes[emp]?.[d] === "BD_WISH") { 
      score += 220; 
      tags.push("Wunsch"); 
    }
    
    if (wd === 4) { 
      const nextKW = isoWeekNumber(y, m, d) + 1; 
      if (hasVacationInWeek(y, m, emp, nextKW)) { 
        score += 150; 
        tags.push("Vor Urlaub"); 
      } 
    }
    
    if (isWE) {
      score -= Math.abs(projectedWe - TARGET_WEEKEND_DUTY) * 220;
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) {
        score -= (projectedWe - RELAXED_WEEKEND_DUTY_LIMIT) * 500;
      }
      if (wouldCreateConsecutiveWeekendDuty(y, m, emp, result, d)) { 
        score -= 900; 
        tags.push("WE-Puffer"); 
      }
      if (getWeekendDutyKWs(y, m, emp, result).has(isoWeekNumber(y, m, d) - 1)) { 
        score -= 40; 
        tags.push("WE-Abstand"); 
      }
    }
    
    if (wd === 6 && isFacharzt(emp)) {
      const projectedSat = currentSatBD[emp] + 1;
      if (projectedSat > 1) { 
        score -= 15000 * projectedSat; 
        tags.push("Doppel-Samstag"); 
      } else if (currentSatBD[emp] === 0) { 
        score += 2000; 
        tags.push("Samstags-Priorität"); 
      }
      const avgProjectedSat = (hgFAs.reduce((s, e) => s + currentSatBD[e], 0) + 1) / Math.max(1, hgFAs.length);
      score -= Math.abs(projectedSat - avgProjectedSat) * 700;
    }
    
    if (emp === "Dr. Becker" && wd === 6 && relaxed) { 
      score -= 2000; 
      tags.push("Notlösung"); 
    }
    
    if (minDistD < 4) {
      score -= (4 - minDistD) * 120;
    }
    
    if (wouldCreateDFDF(emp, d, result)) { 
      score -= 260; 
      tags.push("D-F-D-F weich vermieden"); 
    }
    
    if (isHoliday(y, m, d, hols)) { 
      const holAvg = dutyEmps.reduce((s, e) => s + (hist[e]?.holDuty || 0), 0) / Math.max(1, dutyEmps.length); 
      score += (holAvg - (hist[emp]?.holDuty || 0)) * 6; 
      tags.push("Feiertag"); 
    }
    
    score += ((emp.charCodeAt(0) * 31 + d * 7) % 10) * 0.1;
    trace(phaseKey || "bd_eval", `EVAL [${emp}|D${d}] Base:100 Final:${Math.round(score)} Tags:[${tags.join(',')}]`);
    return { score, tags };
  }

  bdNeeded.sort((a, b) => {
    const aWe = isWeekend(y, m, a) || isHoliday(y, m, a, hols) || weekday(y, m, a) === 5;
    const bWe = isWeekend(y, m, b) || isHoliday(y, m, b, hols) || weekday(y, m, b) === 5;
    if (aWe !== bWe) return aWe ? -1 : 1;
    return a - b;
  });

  const weBDs = bdNeeded.filter((d) => { 
    const wd = weekday(y, m, d); 
    return wd === 5 || wd === 6 || wd === 0 || isHoliday(y, m, d, hols); 
  });
  const nonWeBDs = bdNeeded.filter((d) => !weBDs.includes(d));

  log.push({ phase: "bd_weekend", icon: "🌙", msg: `Verteile ${weBDs.length} WE/FT-BD...`, pct: 22 });
  
  let bdRelaxedCount = 0;
  let hgRelaxedCount = 0;

  for (let i = 0; i < weBDs.length; i++) {
    const d = weBDs[i];
    if (isDayDTasked(d)) continue;
    
    let candidates = dutyEmps.map((e) => ({ emp: e, ...scoreBDCandidate(e, d, false, "bd_weekend") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
    let relaxed = false;
    
    if (candidates.length === 0) {
      candidates = dutyEmps.map((e) => ({ emp: e, ...scoreBDCandidate(e, d, true, "bd_weekend") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
      if (candidates.length > 0) { 
        bdRelaxedCount++; 
        relaxed = true; 
        candidates[0].tags.push("Regeln gelockert"); 
        recordRule("bd_weekend", "BD-Constraint gelockert", `Tag ${d}: Keine harte BD-Lösung.`, "warn"); 
      }
    }
    
    if (candidates.length > 0) {
      const chosen = candidates[0];
      if (!result[chosen.emp]) result[chosen.emp] = {};
      if (!result[chosen.emp][d]) result[chosen.emp][d] = {};
      
      result[chosen.emp][d].duty = "D";
      currentBD[chosen.emp]++;
      
      if (weekday(y, m, d) === 6) {
        currentSatBD[chosen.emp]++;
      }
      
      updateAutoF(chosen.emp, d);
      
      let reason = `Bester Score (${Math.round(chosen.score)}).`;
      if (chosen.tags.includes("Wunsch")) reason = "Wunschdienst berücksichtigt.";
      if (chosen.tags.includes("Vor Urlaub")) reason = "Donnerstags-Dienst vor Urlaub priorisiert.";
      if (chosen.tags.includes("Samstags-Priorität")) reason += " Person hatte noch keinen Samstag im Monat.";
      if (chosen.tags.includes("D-F-D-F weich vermieden")) reason += " D-F-D-F wurde nur weich bestraft.";
      if (relaxed) reason += " Auswahl im gelockerten Modus.";
      
      if (chosen.emp === "Dr. Becker" && weekday(y, m, d) === 6) {
        const nextWorkday = findNextWorkdayFrom(y, m, d);
        if (nextWorkday) {
          const blockedByOtherFA = hasOtherFAFreeOrVacationOn(nextWorkday.y, nextWorkday.m, nextWorkday.d, chosen.emp, result);
          const beckerAssignments = getScheduledAssignmentCodes(nextWorkday.y, nextWorkday.m, chosen.emp, nextWorkday.d, result);
          const beckerAlreadyOccupied = beckerAssignments.length > 0;
          
          if (!blockedByOtherFA && !beckerAlreadyOccupied) {
            reason += ` Samstags-Dienst unvermeidbar -> FZA am nächsten Werktag (${nextWorkday.d}. ${MONTHS_SHORT[nextWorkday.m]}) eingetragen.`;
            if (nextWorkday.y === y && nextWorkday.m === m) {
              if (!result[chosen.emp][nextWorkday.d]) result[chosen.emp][nextWorkday.d] = {};
              result[chosen.emp][nextWorkday.d].assignment = "FZA";
            } else {
              queueExternalAssignment(nextWorkday.y, nextWorkday.m, chosen.emp, nextWorkday.d, { assignment: "FZA" });
            }
            log.push({ phase: "bd_weekend", icon: "🟣", msg: `Dr. Becker erhält FZA am ${nextWorkday.d}. ${MONTHS_SHORT[nextWorkday.m]}.`, pct: Math.min(40, 22 + 2) });
            recordRule("bd_weekend", "Becker-FZA-Kompensation", `Ausgleich nach Samstags-BD am ${nextWorkday.d}. ${MONTHS_SHORT[nextWorkday.m]}.`, "accent");
          } else {
            const warnMsg = blockedByOtherFA
              ? `KRITISCH: Dr. Becker hat am ${d}. einen Samstags-BD, aber der nächste Werktag ${nextWorkday.d}. ${MONTHS_SHORT[nextWorkday.m]} ist blockiert, weil dort bereits ein anderer FA Urlaub/F hat. FZA bitte manuell prüfen.`
              : `KRITISCH: Dr. Becker hat am ${d}. einen Samstags-BD, aber am nächsten Werktag ${nextWorkday.d}. ${MONTHS_SHORT[nextWorkday.m]} besteht bereits eine Belegung (${beckerAssignments.join("/")}). FZA bitte manuell prüfen.`;
            beckerSaturdayFzaWarnings.push(warnMsg);
            reason += " FZA konnte nicht automatisch gesetzt werden; sichtbare Warnung erzeugt.";
            log.push({ phase: "bd_weekend", icon: "🚨", msg: warnMsg, pct: Math.min(40, 22 + 2) });
            recordRule("bd_weekend", "Kritische Becker-Prüfung", warnMsg, "critical");
          }
        }
      }
      
      report.push({ day: d, emp: chosen.emp, duty: "D", reason: reason, tags: chosen.tags });
      log.push({ phase: "bd_weekend", icon: "→", msg: `Tag ${d}. → ${chosen.emp}`, pct: 22 + Math.round((i / Math.max(1, weBDs.length)) * 18) });
    }
  }

  log.push({ phase: "bd_workday", icon: "☀️", msg: `Verteile ${nonWeBDs.length} Werktags-BD...`, pct: 42 });
  
  for (let i = 0; i < nonWeBDs.length; i++) {
    const d = nonWeBDs[i];
    if (isDayDTasked(d)) continue;
    
    let candidates = dutyEmps.map((e) => ({ emp: e, ...scoreBDCandidate(e, d, false, "bd_workday") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
    let relaxed = false;
    
    if (candidates.length === 0) {
      candidates = dutyEmps.map((e) => ({ emp: e, ...scoreBDCandidate(e, d, true, "bd_workday") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
      if (candidates.length > 0) { 
        bdRelaxedCount++; 
        relaxed = true; 
        candidates[0].tags.push("Regeln gelockert");
      }
    }
    
    if (candidates.length > 0) {
      const chosen = candidates[0];
      if (!result[chosen.emp]) result[chosen.emp] = {};
      if (!result[chosen.emp][d]) result[chosen.emp][d] = {};
      
      result[chosen.emp][d].duty = "D";
      currentBD[chosen.emp]++;
      updateAutoF(chosen.emp, d);
      
      report.push({ day: d, emp: chosen.emp, duty: "D", reason: `Bester Score (${Math.round(chosen.score)}).`, tags: chosen.tags });
      log.push({ phase: "bd_workday", icon: "→", msg: `Tag ${d}. → ${chosen.emp}`, pct: 42 + Math.round((i / Math.max(1, nonWeBDs.length)) * 18) });
    }
  }

  function rebuildCurrentCounters() {
    emps.forEach((e) => { 
      currentBD[e] = 0; 
      currentHG[e] = 0; 
      currentHGForAA[e] = 0; 
      currentHGForFA[e] = 0; 
      currentSatBD[e] = 0; 
    });
    
    for (let day = 1; day <= dim; day++) {
      const bdHolder = emps.find((e) => result[e]?.[day]?.duty === "D") || null;
      for (const e of emps) {
        const duty = result[e]?.[day]?.duty;
        if (duty === "D") { 
          currentBD[e]++; 
          if (weekday(y, m, day) === 6) {
            currentSatBD[e]++; 
          }
        }
        else if (duty === "HG") {
          currentHG[e]++;
          if (bdHolder && isAssistenzarzt(bdHolder)) {
            currentHGForAA[e]++;
          } else {
            currentHGForFA[e]++;
          }
        }
      }
    }
  }

  function setDutyAssignment(emp, day, dutyCode) {
    if (!result[emp]) result[emp] = {};
    if (!result[emp][day]) result[emp][day] = {};
    result[emp][day].duty = dutyCode;
    if (dutyCode === "D") {
      updateAutoF(emp, day);
    }
  }

  function clearDutyAssignment(emp, day, dutyCode) {
    if (dutyCode === "D") {
      clearAutoF(emp, day);
    }
    if (result[emp]?.[day]?.duty === dutyCode) {
      delete result[emp][day].duty;
    }
    cleanupAssignmentCell(result, emp, day);
  }

  function computeBDObjective() {
    let score = 0;
    for (let day = 1; day <= dim; day++) {
      let dCount = 0; 
      emps.forEach(e => { 
        if(result[e]?.[day]?.duty === "D") dCount++; 
      });
      if (dCount === 0) score += 20000; 
      if (dCount > 1) score += 50000 * dCount;
    }
    
    const satAvg = hgFAs.length > 0 ? hgFAs.reduce((sum, e) => sum + currentSatBD[e], 0) / hgFAs.length : 0;
    let deficitSum = 0;
    let surplusSum = 0;
    
    dutyEmps.forEach((emp) => {
      const diff = currentBD[emp] - bdTarget[emp];
      if (diff < 0) deficitSum += -diff; 
      if (diff > 0) surplusSum += diff;
      
      score += diff * diff * 3200 + Math.abs(diff) * 1400;
      
      const weDiff = countWeekendDuties(y, m, emp, result) - TARGET_WEEKEND_DUTY;
      score += weDiff * weDiff * 480;
      
      const weProjected = countWeekendDuties(y, m, emp, result);
      if (weProjected > RELAXED_WEEKEND_DUTY_LIMIT) {
        score += (weProjected - RELAXED_WEEKEND_DUTY_LIMIT) * 12000;
      }
      
      const weekendKws = [...getWeekendDutyKWs(y, m, emp, result)].sort((a, b) => a - b);
      for (let i = 1; i < weekendKws.length; i++) { 
        if (weekendKws[i] - weekendKws[i - 1] === 1) {
          score += 6000; 
        }
      }
      
      if (isFacharzt(emp)) {
        if (currentSatBD[emp] > 1) {
          score += 50000 * currentSatBD[emp];
        }
        score += (currentSatBD[emp] - satAvg) * (currentSatBD[emp] - satAvg) * 850;
      }
      
      for (let day = 1; day <= dim; day++) {
        if (result[emp]?.[day]?.duty !== "D") continue;
        
        const next = nextCalendarDay(y, m, day);
        if (getScheduledDuty(next.y, next.m, emp, next.d, result) === "D") {
          score += 40000;
        }
        
        const minDistD = minDistanceForDuty(emp, day, "D", result);
        if (minDistD < 3) {
          score += (3 - minDistD) * 6000;
        }
        if (minDistD < 5) {
          score += (5 - minDistD) * 350;
        }
        
        if (wouldCreateDFDF(emp, day, result)) {
          score += 380;
        }
        
        if (weekday(y, m, day) === 6 && emp === "Dr. Becker") {
          score += 30000;
        }
      }
    });
    
    score += deficitSum * 9000 + surplusSum * 7000 + Math.abs(deficitSum - surplusSum) * 6000;
    return score;
  }

  log.push({ phase: "bd_optimize", icon: "🔄", msg: "Starte iterative BD-Optimierung...", pct: 62 });
  
  let swaps = 0;
  let bestFairness = computeBDObjective();
  
  const mutableBDDays = listDutyAssignments(dutyEmps, dim, result, "D")
    .filter(({ emp, day }) => !fixedDutyKeys.has(`D:${dutyKey(emp, day)}`))
    .map(({ day }) => day);
    
  for (let pass = 0; pass < 12; pass++) {
    let improved = false;
    for (const day of mutableBDDays) {
      const currentEmp = dutyEmps.find((e) => result[e]?.[day]?.duty === "D");
      if (!currentEmp) continue;
      
      const candidates = [...dutyEmps].sort((a, b) => {
        const aScore = Math.abs((currentBD[a] + 1) - bdTarget[a]) + projectedWeekendDutyCount(y, m, a, result, "D", day) + (weekday(y, m, day) === 6 ? currentSatBD[a] * 10 : 0);
        const bScore = Math.abs((currentBD[b] + 1) - bdTarget[b]) + projectedWeekendDutyCount(y, m, b, result, "D", day) + (weekday(y, m, b) === 6 ? currentSatBD[b] * 10 : 0);
        return aScore - bScore;
      });
      
      for (const candidate of candidates) {
        if (candidate === currentEmp) continue;
        
        clearDutyAssignment(currentEmp, day, "D");
        rebuildCurrentCounters();
        
        if (!canDoBD(candidate, day, true, result)) { 
          setDutyAssignment(currentEmp, day, "D"); 
          rebuildCurrentCounters(); 
          continue; 
        }
        
        setDutyAssignment(candidate, day, "D");
        rebuildCurrentCounters();
        
        const newFairness = computeBDObjective();
        if (newFairness + 0.01 < bestFairness) { 
          bestFairness = newFairness; 
          improved = true; 
          swaps++; 
          break; 
        }
        
        clearDutyAssignment(candidate, day, "D");
        setDutyAssignment(currentEmp, day, "D");
        rebuildCurrentCounters();
      }
    }
    if (!improved) break;
  }

  log.push({ phase: "hg_bundle", icon: "🔗", msg: "Wochenend-Kopplung für HG...", pct: 68 });
  
  const bundledHGDays = new Set();
  const bundledHGKeys = new Set();
  
  function assignBundledHG(emp, d, bindReason, options = {}) {
    if (isDayHGTasked(d) || !isFacharzt(emp) || isDutyExempt(emp) || wishes[emp]?.[d] === "NO_DUTY" || isAbsentOnDay(y, m, emp, d, result) || result[emp]?.[d]?.duty || hasHolidayBlockConflict(emp, d)) {
      return false;
    }
    const wd = weekday(y, m, d);
    if (result[emp]?.[d]?.assignment === "F" && !(wd === 6 || wd === 0)) {
      return false;
    }
    if (d < dim && result[emp]?.[d + 1]?.duty === "D" && wd !== 5) {
      return false;
    }
    if (!options.allowAdjacentHG && hasAdjacentHG(emp, d, result)) {
      return false;
    }
    
    setDutyAssignment(emp, d, "HG");
    bundledHGDays.add(d);
    bundledHGKeys.add(dutyKey(emp, d));
    report.push({ day: d, emp, duty: "HG", reason: bindReason, tags: ["Gekoppelt"] });
    return true;
  }
  
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const bdHolder = dutyEmps.find((e) => result[e]?.[d]?.duty === "D");
    if (!bdHolder) continue;
    
    if (wd === 5 && isAssistenzarzt(bdHolder)) {
      const satDay = d + 1;
      if (satDay <= dim) {
        const satBDHolder = dutyEmps.find((e) => result[e]?.[satDay]?.duty === "D");
        if (satBDHolder && isFacharzt(satBDHolder) && satBDHolder !== bdHolder) {
          assignBundledHG(satBDHolder, d, "Freitags-HG gekoppelt an FA des Samstags-BD.", { allowAdjacentHG: true });
        }
      }
    }
    
    if (wd === 6 && isFacharzt(bdHolder)) {
      const sunDay = d + 1;
      if (sunDay <= dim) {
        assignBundledHG(bdHolder, sunDay, "Sonntags-HG gekoppelt an eigenen Samstags-BD.", { allowAdjacentHG: true });
      }
    }
  }

  log.push({ phase: "hg_assign", icon: "📞", msg: "Verteile restliche HG...", pct: 72 });
  
  const hgRemaining = hgNeeded.filter((d) => !bundledHGDays.has(d) && !isDayHGTasked(d));
  
  function canDoHG(emp, d, relaxed = false, assignments = result, options = {}) {
    const { ignoreExistingDuty = false } = options;
    if (isDutyExempt(emp) || !isFacharzt(emp)) return false;
    if (isAbsentOnDay(y, m, emp, d, assignments)) return false;
    
    const existingDuty = assignments[emp]?.[d]?.duty;
    if (existingDuty && !(ignoreExistingDuty && existingDuty === "HG")) return false;
    
    if (wishes[emp]?.[d] === "NO_DUTY") return false;
    
    const wd = weekday(y, m, d);
    const isWE = wd === 6 || wd === 0;
    
    if (assignments[emp]?.[d]?.assignment === "F" && !isWE) return false;
    if (d < dim && assignments[emp]?.[d + 1]?.duty === "D" && wd !== 5) return false;
    if (hasHolidayBlockConflict(emp, d)) return false;

    if (emp === "Dr. Polednia" && (wd === 0 || wd === 2 || wd === 4)) {
      const bdOnDay = dutyEmps.find((e) => assignments[e]?.[d]?.duty === "D");
      if (bdOnDay && isAssistenzarzt(bdOnDay)) return false;
    }

    if (!relaxed) {
      const projectedWe = projectedWeekendDutyCount(y, m, emp, assignments, "HG", d);
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) return false;
      if (wouldCreateConsecutiveWeekendDuty(y, m, emp, assignments, d)) return false;
    }
    
    return true;
  }

  function scoreHGCandidate(emp, d, relaxed, phaseKey) {
    if (!canDoHG(emp, d, relaxed)) return { score: -Infinity, tags: [] };
    
    let score = 100;
    const tags = [];
    const projectedHG = currentHG[emp] + 1;
    const avgProjectedHG = (hgFAs.reduce((s, e) => s + currentHG[e], 0) + 1) / Math.max(1, hgFAs.length);
    
    score -= Math.abs(projectedHG - avgProjectedHG) * 240;
    tags.push("HG-Monatsausgleich");

    if (wishes[emp]?.[d] === "HG_WISH") {
      score += 220;
      tags.push("Wunsch");
    }
    
    if (isNextDayVacation(y, m, emp, d, result)) {
      score -= 20;
    }

    const wd = weekday(y, m, d);
    if (wd === 6 || wd === 0) {
      const projectedWe = projectedWeekendDutyCount(y, m, emp, result, "HG", d);
      score -= Math.abs(projectedWe - TARGET_WEEKEND_DUTY) * 150;
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) {
        score -= (projectedWe - RELAXED_WEEKEND_DUTY_LIMIT) * 360;
      }
      if (wouldCreateConsecutiveWeekendDuty(y, m, emp, result, d)) {
        score -= 700;
        tags.push("WE-Puffer");
      }
      if (getWeekendDutyKWs(y, m, emp, result).has(isoWeekNumber(y, m, d) - 1)) {
        score -= 25;
        tags.push("WE-Abstand");
      }
    }

    if (hasAdjacentHG(emp, d, result)) {
      score -= 220;
      tags.push("kein Direkt-HG");
    }

    score += ((emp.charCodeAt(1 % emp.length) * 17 + d * 13) % 10) * 0.1;
    return { score, tags };
  }

  for (const d of hgRemaining) {
    if (isDayHGTasked(d)) continue;
    
    let candidates = hgFAs.map((e) => ({ emp: e, ...scoreHGCandidate(e, d, false, "hg_assign") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) {
      candidates = hgFAs.map((e) => ({ emp: e, ...scoreHGCandidate(e, d, true, "hg_assign") })).filter((c) => c.score > -Infinity).sort((a, b) => b.score - a.score);
      if (candidates.length > 0) {
        hgRelaxedCount++;
        candidates[0].tags.push("Regeln gelockert");
      }
    }
    
    if (candidates.length > 0) {
      const chosen = candidates[0];
      setDutyAssignment(chosen.emp, d, "HG");
      currentHG[chosen.emp]++;
      report.push({ day: d, emp: chosen.emp, duty: "HG", reason: "Gleichmäßige Verteilung.", tags: chosen.tags });
    }
  }

  function computeHGObjective() {
    let score = 0;
    for (let day = 1; day <= dim; day++) {
      let hgCount = 0;
      emps.forEach(e => { 
        if(result[e]?.[day]?.duty === "HG") hgCount++; 
      });
      if (hgCount === 0) score += 15000;
      if (hgCount > 1) score += 40000 * hgCount;
    }
    
    const avgHG = averageFromArray(hgFAs.map((emp) => currentHG[emp]));
    const avgBDforFAs = averageFromArray(hgFAs.map((emp) => currentBD[emp]));
    const avgHGForAA = averageFromArray(hgFAs.map((emp) => currentHGForAA[emp]));
    const avgHGForFA = averageFromArray(hgFAs.map((emp) => currentHGForFA[emp]));
    
    hgFAs.forEach((emp) => {
      const idealHG = avgHG + (avgBDforFAs - currentBD[emp]) * 0.7;
      score += (currentHG[emp] - idealHG) * (currentHG[emp] - idealHG) * 520;
      score += (currentHGForAA[emp] - avgHGForAA) * (currentHGForAA[emp] - avgHGForAA) * 700;
      score += (currentHGForFA[emp] - avgHGForFA) * (currentHGForFA[emp] - avgHGForFA) * 280;
      
      const weCount = countWeekendDuties(y, m, emp, result);
      score += (weCount - TARGET_WEEKEND_DUTY) * (weCount - TARGET_WEEKEND_DUTY) * 260;
      
      if (weCount > RELAXED_WEEKEND_DUTY_LIMIT) {
        score += (weCount - RELAXED_WEEKEND_DUTY_LIMIT) * 8000;
      }
      
      for (let day = 1; day <= dim; day++) {
        if (result[emp]?.[day]?.duty !== "HG") continue;
        if (hasAdjacentHG(emp, day, result)) {
          score += 1800;
        }
        const wd = weekday(y, m, day);
        if (day < dim && result[emp]?.[day + 1]?.duty === "D" && wd !== 5) {
          score += 24000;
        }
      }
    });
    return score;
  }

  log.push({ phase: "hg_assign", icon: "🧠", msg: "Starte iterative HG-Optimierung...", pct: 85 });
  
  let bestHGObjective = computeHGObjective();
  let hgMoves = 0;
  
  const mutableHGDays = listDutyAssignments(hgFAs, dim, result, "HG")
    .filter(({ emp, day }) => !fixedDutyKeys.has(`HG:${dutyKey(emp, day)}`) && !bundledHGKeys.has(dutyKey(emp, day)))
    .map(({ day }) => day);
    
  for (let pass = 0; pass < 14; pass++) {
    let improved = false;
    for (const day of mutableHGDays) {
      const currentEmp = hgFAs.find((e) => result[e]?.[day]?.duty === "HG");
      if (!currentEmp) continue;
      
      const candidates = [...hgFAs].sort((a, b) => {
        const aBias = (currentHG[a] - currentBD[a] * 0.55);
        const bBias = (currentHG[b] - currentBD[b] * 0.55);
        return aBias - bBias;
      });
      
      for (const candidate of candidates) {
        if (candidate === currentEmp) continue;
        
        clearDutyAssignment(currentEmp, day, "HG");
        rebuildCurrentCounters();
        
        if (!canDoHG(candidate, day, true, result)) {
          setDutyAssignment(currentEmp, day, "HG");
          rebuildCurrentCounters();
          continue;
        }
        
        setDutyAssignment(candidate, day, "HG");
        rebuildCurrentCounters();
        
        const newObjective = computeHGObjective();
        if (newObjective + 0.01 < bestHGObjective) {
          bestHGObjective = newObjective;
          improved = true;
          hgMoves++;
          break;
        }
        
        clearDutyAssignment(candidate, day, "HG");
        setDutyAssignment(currentEmp, day, "HG");
        rebuildCurrentCounters();
      }
    }
    if (!improved) break;
  }

  function computeGlobalObjective() {
    const bdObjective = computeBDObjective();
    const hgObjective = hgNeeded.length > 0 ? computeHGObjective() : 0;
    let coveragePenalty = 0;
    
    for (let day = 1; day <= dim; day++) {
      let dCount = 0, hgCount = 0;
      emps.forEach(e => {
        if(result[e]?.[day]?.duty === "D") dCount++;
        if(result[e]?.[day]?.duty === "HG") hgCount++;
      });
      if (dCount === 0) coveragePenalty += 25000;
      if (hgCount === 0) coveragePenalty += 18000;
      if (dCount > 1 || hgCount > 1) coveragePenalty += 100000;
    }
    
    return bdObjective + hgObjective + coveragePenalty;
  }

  log.push({ phase: "deep_optimize", icon: "🧬", msg: "Starte finale Metaheuristik für Gesamtqualität...", pct: 89 });
  
  let deepMoves = 0;
  let bestGlobalObjective = computeGlobalObjective();
  
  const deepMutableBDDays = listDutyAssignments(dutyEmps, dim, result, "D")
    .filter(({ emp, day }) => !fixedDutyKeys.has(`D:${dutyKey(emp, day)}`))
    .map(({ day }) => day);
    
  const deepMutableHGDays = listDutyAssignments(hgFAs, dim, result, "HG")
    .filter(({ emp, day }) => !fixedDutyKeys.has(`HG:${dutyKey(emp, day)}`) && !bundledHGKeys.has(dutyKey(emp, day)))
    .map(({ day }) => day);

  function tryImproveDay(day, dutyCode) {
    const pool = dutyCode === "D" ? dutyEmps : hgFAs;
    const currentEmp = pool.find((emp) => result[emp]?.[day]?.duty === dutyCode);
    if (!currentEmp) return false;
    
    const canDo = dutyCode === "D" ? canDoBD : canDoHG;
    const orderedPool = [...pool].sort((a, b) => {
      const aDelta = dutyCode === "D" ? currentBD[a] - bdTarget[a] : currentHG[a] - averageFromArray(hgFAs.map((emp) => currentHG[emp]));
      const bDelta = dutyCode === "D" ? currentBD[b] - bdTarget[b] : currentHG[b] - averageFromArray(hgFAs.map((emp) => currentHG[emp]));
      return aDelta - bDelta;
    });
    
    for (const candidate of orderedPool) {
      if (candidate === currentEmp) continue;
      
      clearDutyAssignment(currentEmp, day, dutyCode);
      rebuildCurrentCounters();
      
      if (!canDo(candidate, day, true, result)) {
        setDutyAssignment(currentEmp, day, dutyCode);
        rebuildCurrentCounters();
        continue;
      }
      
      setDutyAssignment(candidate, day, dutyCode);
      rebuildCurrentCounters();
      
      const newObjective = computeGlobalObjective();
      if (newObjective + 0.01 < bestGlobalObjective) {
        bestGlobalObjective = newObjective;
        deepMoves++;
        return true;
      }
      
      clearDutyAssignment(candidate, day, dutyCode);
      setDutyAssignment(currentEmp, day, dutyCode);
      rebuildCurrentCounters();
    }
    return false;
  }

  for (let pass = 0; pass < 16; pass++) {
    let improved = false;
    for (const day of deepMutableBDDays) {
      improved = tryImproveDay(day, "D") || improved;
    }
    for (const day of deepMutableHGDays) {
      improved = tryImproveDay(day, "HG") || improved;
    }
    if (!improved) break;
  }
  
  rebuildCurrentCounters();

  log.push({ phase: "validate", icon: "🛡️", msg: "Abschlussprüfung der Dienst-Exklusivität...", pct: 93 });

  for (let d = 1; d <= dim; d++) {
    let dList = emps.filter(e => result[e]?.[d]?.duty === "D");
    if (dList.length > 1) {
      for (let i = 1; i < dList.length; i++) {
        clearDutyAssignment(dList[i], d, "D");
      }
    }
    let hgList = emps.filter(e => result[e]?.[d]?.duty === "HG");
    if (hgList.length > 1) {
      for (let i = 1; i < hgList.length; i++) {
        clearDutyAssignment(hgList[i], d, "HG");
      }
    }
  }

  log.push({ phase: "done", icon: "✅", msg: "Planung abgeschlossen!", pct: 100 });

  const summary = { bd: {}, hg: {}, warnings: [], infos: [], bdTarget };
  
  emps.forEach((e) => {
    let bd = 0;
    let hg = 0;
    let holDuty = 0;
    const bdDays = [];
    const hgDays = [];
    const weMapSummary = {};
    
    for (let d = 1; d <= dim; d++) {
      const cell = result[e]?.[d];
      const wd = weekday(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const isWEDay = wd === 5 || wd === 6 || wd === 0;
      
      if (cell?.duty === "D") {
        bd++;
        bdDays.push(d);
        if (hol) holDuty++;
        if (isWEDay) {
          const kw = isoWeekNumber(y, m, d);
          if (!weMapSummary[kw]) weMapSummary[kw] = { hasD: false, hasHG: false };
          weMapSummary[kw].hasD = true;
        }
      }
      
      if (cell?.duty === "HG") {
        hg++;
        hgDays.push(d);
        if (hol) holDuty++;
        if (isWEDay) {
          const kw = isoWeekNumber(y, m, d);
          if (!weMapSummary[kw]) weMapSummary[kw] = { hasD: false, hasHG: false };
          if (!weMapSummary[kw].hasD) weMapSummary[kw].hasHG = true;
        }
      }
    }
    
    let weDuty = 0;
    for (const { hasD, hasHG } of Object.values(weMapSummary)) {
      if (hasD) weDuty += 1;
      else if (hasHG) weDuty += 0.5;
    }
    
    summary.bd[e] = { count: bd, target: bdTarget[e], days: bdDays, weDuty, holDuty };
    summary.hg[e] = { count: hg, days: hgDays };
  });

  dutyEmps.forEach((e) => {
    const bd = summary.bd[e];
    if (bd.target > 0 && bd.count < bd.target) {
      summary.warnings.push(`${e}: nur ${bd.count}/${bd.target} BD`);
    }
    if (bd.weDuty > RELAXED_WEEKEND_DUTY_LIMIT) {
      summary.warnings.push(`${e}: ${bd.weDuty} WE-Dienste (Ziel ${TARGET_WEEKEND_DUTY})`);
    }
  });
  
  beckerSaturdayFzaWarnings.forEach((warning) => summary.warnings.push(warning));
  
  for (let d = 1; d <= dim; d++) {
    if (!emps.some((e) => result[e]?.[d]?.duty === "D")) {
      summary.warnings.push(`Tag ${d}: kein BD besetzt.`);
    }
    if (!emps.some((e) => result[e]?.[d]?.duty === "HG")) {
      summary.warnings.push(`Tag ${d}: kein HG besetzt.`);
    }
  }

  summary.infos.push(`Algorithmus garantiert exakt einen D und einen HG pro Kalendertag.`);
  summary.infos.push(`Die Samstags-Dienste wurden bevorzugt auf Fachärzte verteilt (Dr. Becker nur im Notfall).`);
  summary.infos.push(`Wochenend-Kopplung: Falls ein AA am Freitag D hatte, übernimmt der FA vom Samstag den HG am Freitag.`);
  
  if (bdRelaxedCount > 0 || hgRelaxedCount > 0) {
    summary.infos.push(`Harte Abstandsregeln wurden bei ${bdRelaxedCount} BD / ${hgRelaxedCount} HG weich gelockert, um die Vollbesetzung zu sichern.`);
  }
  
  const dutyCoverageMisses = Array.from({ length: dim }, (_, idx) => idx + 1).filter((day) => !emps.some((emp) => result[emp]?.[day]?.duty === "D")).length;
  const hgCoverageMisses = Array.from({ length: dim }, (_, idx) => idx + 1).filter((day) => !emps.some((emp) => result[emp]?.[day]?.duty === "HG")).length;
  
  const bdSpread = computeFairnessSpread(dutyEmps.map((emp) => summary.bd[emp]?.count || 0));
  const hgSpread = computeFairnessSpread(hgFAs.map((emp) => summary.hg[emp]?.count || 0));
  const weekendSpread = computeFairnessSpread(dutyEmps.map((emp) => summary.bd[emp]?.weDuty || 0));
  
  const wishCount = Array.from({ length: dim }, (_, idx) => idx + 1).reduce((acc, d) => acc + dutyEmps.filter(e => wishes[e]?.[d]).length, 0);
  const wishFulfillmentRate = wishCount > 0 ? (report.filter(r => r.tags.includes("Wunsch")).length / wishCount) : 1;
  
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const qualityScore = Math.round(100 * clamp01(
    0.36 * (1 - dutyCoverageMisses / Math.max(1, dim)) +
    0.24 * (1 - hgCoverageMisses / Math.max(1, dim)) +
    0.16 * clamp01(1 - bdSpread / 4) +
    0.1 * clamp01(1 - hgSpread / 3) +
    0.08 * clamp01(1 - weekendSpread / 1.5) +
    0.1 * wishFulfillmentRate
  ));
  
  summary.quality = { score: qualityScore, dutyCoverageMisses, hgCoverageMisses, bdSpread, hgSpread, weekendSpread, wishFulfillmentRate, deepMoves };

  report.sort((a, b) => a.day - b.day || (a.duty === "D" ? -1 : 1));
  
  rebuildCurrentCounters();
  return { assignments: result, summary, log, report, externalAssignments, ruleTelemetry, fluxTraces };
}
