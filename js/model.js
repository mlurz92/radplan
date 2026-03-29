const WORKPLACES = [
  { code: "MR", label: "MRT", bg: "#DBEAFE", fg: "#1D4ED8" },
  { code: "CT", label: "CT", bg: "#FFEDD5", fg: "#C2410C" },
  { code: "US", label: "Sonographie", bg: "#CCFBF1", fg: "#0F766E" },
  { code: "AN", label: "Angiographie", bg: "#F3E8FF", fg: "#7E22CE" },
  { code: "MA", label: "Mammographie", bg: "#FCE7F3", fg: "#BE185D" },
  { code: "KUS", label: "Kinder-US", bg: "#DCFCE7", fg: "#15803D" },
  { code: "W", label: "Wermsdorf", bg: "#FEF9C3", fg: "#854D0E" },
  { code: "T", label: "Teleradiologie", bg: "#E0E7FF", fg: "#3730A3" }
];

const STATUSES = [
  { code: "F", label: "Frei", bg: "#F1F5F9", fg: "#475569" },
  { code: "U", label: "Urlaub", bg: "#EDE9FE", fg: "#5B21B6" },
  { code: "ZU", label: "Zusatzurlaub", bg: "#DDD6FE", fg: "#4C1D95" },
  { code: "SU", label: "Sonderurlaub", bg: "#C4B5FD", fg: "#2E1065" },
  { code: "FZA", label: "FZA", bg: "#E0E7FF", fg: "#3730A3" },
  { code: "K", label: "Krank", bg: "#FEE2E2", fg: "#991B1B" },
  { code: "KK", label: "Kind Krank", bg: "#FECACA", fg: "#7F1D1D" },
  { code: "§15c", label: "§15c", bg: "#CFFAFE", fg: "#155E75" },
  { code: "WB", label: "Weiterbildung", bg: "#FEF3C7", fg: "#78350F" }
];

const CODE_MAP = {};
[...WORKPLACES, ...STATUSES].forEach(x => { CODE_MAP[x.code] = x; });

const RBN_ROW_KEY = "__RBN_NEURORAD__";
const RBN_ROW_LABEL = "RD Neurorad";
const RBN_ROW_START = { year: 2025, month: 5 };
const RBN_OPTIONS = ["Prof. Schob (NRAD)", "Dr. Maybaum (NRAD)", "Dr. Bailis (NRAD)", "Dr. Schüngel (NRAD)", "Fr. Dalitz (RAD)", "Fr. Thaler (RAD)"];
const RBN_THALER_LAST_MONTH = { year: 2026, month: 2 };

function formatRbnDisplay(name) {
  if (!name) return "";
  const match = name.match(/(?:Prof\.|Dr\.|Fr\.|Hr\.)?\s*([A-ZÄÖÜ][a-zäöüß]+)/);
  return match ? match[1] : name;
}

function getRbnOptionsForDate(y, m) {
  const allowThaler = y < RBN_THALER_LAST_MONTH.year || (y === RBN_THALER_LAST_MONTH.year && m <= RBN_THALER_LAST_MONTH.month);
  return allowThaler ? [...RBN_OPTIONS] : RBN_OPTIONS.filter(opt => opt !== "Fr. Thaler (RAD)");
}

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const DOW_ABBR = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DOW_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const STORAGE_KEY = "radplan_v3";
const ABSENCE_CODES = ["U", "ZU", "SU", "FZA", "K", "KK", "§15c", "WB"];
const VACATION_CODES = ["U", "ZU", "SU", "§15c"];

const WISH_TYPES = [
  { code: "NO_DUTY", label: "Kein Dienst", icon: "✗", bg: "#FEE2E2", fg: "#991B1B", border: "#FCA5A5" },
  { code: "BD_WISH", label: "BD Wunsch", icon: "D", bg: "#FEE2E2", fg: "#B91C1C", border: "#F87171" },
  { code: "HG_WISH", label: "HG Wunsch", icon: "H", bg: "#E0F2FE", fg: "#0369A1", border: "#7DD3FC" }
];

const WISH_MAP = {};
WISH_TYPES.forEach(w => { WISH_MAP[w.code] = w; });

const EMP_META = {
  "Prof. Schäfer": { fullName: "Prof. Dr. Arnd-Oliver Schäfer", position: "CA", posLabel: "Chefarzt", type: "FA für Radiologie", area: "", deputy: "Dr. Lurz" },
  "Dr. Lurz": { fullName: "Dr. med. Markus Lurz", position: "LOA", posLabel: "Leitender Oberarzt", type: "FA für Radiologie", area: "MRT · Röntgen KV", deputy: "Prof. Schäfer / Dr. Polednia" },
  "Dr. Polednia": { fullName: "Dr. med. Alexander Polednia", position: "OA", posLabel: "Oberarzt", type: "FA für Radiologie · Kinderradiologie", area: "Leiter Kinderradiologie", deputy: "" },
  "Fr. Dalitz": { fullName: "Bettina Dalitz", position: "OÄ", posLabel: "Oberärztin", type: "FÄ für Radiologie · Neuroradiologie", area: "Leiterin Mammographie", deputy: "" },
  "Fr. Thaler": { fullName: "Fr. Thaler", position: "FÄ", posLabel: "Fachärztin", type: "FÄ für Radiologie", area: "", deputy: "" },
  "Dr. Becker": { fullName: "Dr. med. Juliane Becker", position: "OÄ", posLabel: "Oberärztin", type: "FÄ für Radiologie · FÄ für Nuklearmedizin", area: "CT", deputy: "Dr. Martin" },
  "Dr. Martin": { fullName: "Dr. med. Arno Martin", position: "FA", posLabel: "Facharzt", type: "FA für Radiologie", area: "", deputy: "" },
  "Hr. El Houba": { fullName: "Abdelilah El Houba", position: "AA", posLabel: "Assistenzarzt", type: "AA für Radiologie", area: "", deputy: "" },
  "Fr. Licenji": { fullName: "Johanna Licenji", position: "AÄ", posLabel: "Assistenzärztin", type: "AÄ für Radiologie", area: "", deputy: "" },
  "Hr. Torki": { fullName: "Mohamed Torki", position: "AA", posLabel: "Assistenzarzt", type: "AA für Radiologie", area: "", deputy: "" },
  "Hr. Sebastian": { fullName: "Ron Sebastian", position: "AA", posLabel: "Assistenzarzt", type: "AA für Radiologie", area: "", deputy: "" }
};

function isFacharzt(empName) {
  const m = EMP_META[empName];
  return m ? ["CA", "LOA", "OA", "OÄ", "FA", "FÄ"].includes(m.position) : false;
}

function isAssistenzarzt(empName) {
  const m = EMP_META[empName];
  return m ? ["AA", "AÄ"].includes(m.position) : true;
}

function getEmpMeta(name) {
  return EMP_META[name] || { fullName: name, position: "—", posLabel: "—", type: "—", area: "", deputy: "" };
}

function posColor(pos) {
  const m = {
    CA: { bg: "#F3E8FF", fg: "#7E22CE", border: "#A855F7" },
    LOA: { bg: "#DBEAFE", fg: "#1D4ED8", border: "#3B82F6" },
    OA: { bg: "#CCFBF1", fg: "#0F766E", border: "#14B8A6" },
    OÄ: { bg: "#CCFBF1", fg: "#0F766E", border: "#14B8A6" },
    FA: { bg: "#DCFCE7", fg: "#15803D", border: "#22C55E" },
    FÄ: { bg: "#DCFCE7", fg: "#15803D", border: "#22C55E" },
    AA: { bg: "#F1F5F9", fg: "#475569", border: "#94A3B8" },
    AÄ: { bg: "#F1F5F9", fg: "#475569", border: "#94A3B8" }
  };
  return m[pos] || { bg: "#F1F5F9", fg: "#6B7280", border: "#CBD5E1" };
}

const pad2 = n => String(n).padStart(2, "0");
const dateKey = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const monthKey = (y, m) => `${y}-${m}`;
const prevMK = (y, m) => (m === 0 ? `${y - 1}-11` : `${y}-${m - 1}`);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const isRbnMonthVisible = (y, m) => y > RBN_ROW_START.year || (y === RBN_ROW_START.year && m >= RBN_ROW_START.month);

function normalizeMonthDataShape(md) {
  if (!md || typeof md !== "object") return;
  if (!Array.isArray(md.employees)) md.employees = [];
  if (!md.assignments || typeof md.assignments !== "object") md.assignments = {};
  if (!md.rbn || typeof md.rbn !== "object") md.rbn = {};
}

const weekday = (y, m, d) => new Date(y, m, d).getDay();
const isWeekend = (y, m, d) => {
  const w = weekday(y, m, d);
  return w === 0 || w === 6;
};
const isFriday = (y, m, d) => weekday(y, m, d) === 5;

function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100,
        d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
        m2 = Math.floor((a + 11 * h + 22 * l) / 451),
        mo = Math.floor((h + l - 7 * m2 + 114) / 31),
        dy = ((h + l - 7 * m2 + 114) % 31) + 1;
  return new Date(year, mo - 1, dy);
}

const addDays = (dt, n) => {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
};

const dateToDK = dt => dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());

function getSaxonyHolidays(year) {
  const e = easterDate(year);
  const nov22 = new Date(year, 10, 22);
  while (nov22.getDay() !== 3) nov22.setDate(nov22.getDate() - 1);
  return {
    [dateKey(year, 0, 1)]: "Neujahr",
    [dateToDK(addDays(e, -2))]: "Karfreitag",
    [dateToDK(addDays(e, 1))]: "Ostermontag",
    [dateKey(year, 4, 1)]: "Tag der Arbeit",
    [dateToDK(addDays(e, 39))]: "Christi Himmelfahrt",
    [dateToDK(addDays(e, 50))]: "Pfingstmontag",
    [dateKey(year, 9, 3)]: "Tag der Deutschen Einheit",
    [dateKey(year, 9, 31)]: "Reformationstag",
    [dateToDK(nov22)]: "Buß- und Bettag",
    [dateKey(year, 11, 25)]: "1. Weihnachtstag",
    [dateKey(year, 11, 26)]: "2. Weihnachtstag"
  };
}

const HOLIDAY_CACHE = new Map();
function getSaxonyHolidaysCached(year) {
  if (!HOLIDAY_CACHE.has(year)) HOLIDAY_CACHE.set(year, getSaxonyHolidays(year));
  return HOLIDAY_CACHE.get(year);
}

const isHoliday = (y, m, d, hols) => !!hols[dateKey(y, m, d)];
const isWorkday = (y, m, d, hols) => !isWeekend(y, m, d) && !isHoliday(y, m, d, hols);

const today = new Date();
const TOD_Y = today.getFullYear(), TOD_M = today.getMonth(), TOD_D = today.getDate();
const isTodayCol = (y, m, d) => y === TOD_Y && m === TOD_M && d === TOD_D;

function isoWeekNumber(y, m, d) {
  const dt = new Date(y, m, d);
  const thu = new Date(dt);
  thu.setDate(dt.getDate() - (dt.getDay() === 0 ? 6 : dt.getDay() - 1) + 3);
  const ft = new Date(thu.getFullYear(), 0, 4);
  ft.setDate(4 - (ft.getDay() === 0 ? 6 : ft.getDay() - 1));
  return 1 + Math.round((thu - ft) / 604800000);
}

function nextCalendarDay(y, m, d) {
  const dim = daysInMonth(y, m);
  if (d < dim) return { y, m, d: d + 1 };
  if (m < 11) return { y, m: m + 1, d: 1 };
  return { y: y + 1, m: 0, d: 1 };
}

function prevCalendarDay(y, m, d) {
  if (d > 1) return { y, m, d: d - 1 };
  if (m > 0) return { y, m: m - 1, d: daysInMonth(y, m - 1) };
  return { y: y - 1, m: 11, d: daysInMonth(y - 1, 11) };
}

function cellColor(assignment) {
  if (!assignment) return { bg: "transparent", fg: "#374151" };
  const meta = CODE_MAP[assignment.split("/")[0].trim()];
  return meta ? { bg: meta.bg, fg: meta.fg } : { bg: "#F9FAFB", fg: "#374151" };
}

function empInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const caps = parts.filter(p => p.length > 0 && /[A-ZÄÖÜ]/.test(p[0]));
  if (caps.length >= 2) return caps.map(p => p[0]).slice(0, 2).join("");
  return name.slice(0, 2).toUpperCase();
}

let DATA = {};
const MOBILE_BREAKPOINT = 768;
const TOUCH_DEVICE_RE = /iPhone|iPad|iPod|Android/i;
let IS_MOBILE = false;

const state = {
  year: TOD_Y,
  month: TOD_M,
  edit: null,
  ed: { wp: [], st: null, duty: null, wish: null },
  employeeDashboard: { filter: "", role: "ALL", selectedEmp: null, detailView: "months" },
  periodDraft: { year: TOD_Y, month: TOD_M },
  profileEmp: null
};

let deptTab = "month";
let planMode = false;
let planData = null;
let planBaseline = null;
let planHistory = [];
let planHistoryIdx = -1;
let planSessions = {};

function loadFromStorage() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) DATA = JSON.parse(r);
    Object.values(DATA).forEach(md => normalizeMonthDataShape(md));
  } catch (e) {
    DATA = {};
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch (e) {}
}

function ensurePostBDFreiDays() {
  let totalRepaired = 0;
  for (const [k, mData] of Object.entries(DATA)) {
    if (!mData || !mData.employees || !mData.assignments) continue;
    const parts = k.split("-");
    const ky = parseInt(parts[0], 10), km = parseInt(parts[1], 10);
    const dim = daysInMonth(ky, km);
    for (const emp of mData.employees) {
      if (!mData.assignments[emp]) continue;
      for (let d = 1; d <= dim; d++) {
        if (mData.assignments[emp][d]?.duty !== "D") continue;
        const next = nextCalendarDay(ky, km, d);
        if (next.y === ky && next.m === km) {
          if (!mData.assignments[emp][next.d]) mData.assignments[emp][next.d] = {};
          if (!mData.assignments[emp][next.d].assignment) {
            mData.assignments[emp][next.d].assignment = "F";
            totalRepaired++;
          }
        } else {
          const nk = monthKey(next.y, next.m);
          if (DATA[nk]) {
            if (!DATA[nk].assignments) DATA[nk].assignments = {};
            if (!DATA[nk].assignments[emp]) DATA[nk].assignments[emp] = {};
            if (!DATA[nk].assignments[emp][next.d]) DATA[nk].assignments[emp][next.d] = {};
            if (!DATA[nk].assignments[emp][next.d].assignment) {
              DATA[nk].assignments[emp][next.d].assignment = "F";
              totalRepaired++;
            }
          }
        }
      }
    }
  }
  if (totalRepaired > 0) saveToStorage();
  return totalRepaired;
}

function getMonthDataRaw(y, m) {
  const k = monthKey(y, m);
  if (!DATA[k]) {
    const prev = DATA[prevMK(y, m)];
    DATA[k] = { employees: [...(prev?.employees || [])], assignments: {}, rbn: {} };
  }
  normalizeMonthDataShape(DATA[k]);
  return DATA[k];
}

function getMonthData(y, m) {
  if (planMode && planData && y === state.year && m === state.month) return planData;
  const md = getMonthDataRaw(y, m);
  normalizeMonthDataShape(md);
  return md;
}

function cloneData(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getStoredPlanDraft(key) {
  try {
    const raw = localStorage.getItem(`radplan_v3_plan_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function createPlanSession(y, m) {
  const key = monthKey(y, m);
  const stored = getStoredPlanDraft(key);
  const source = stored && stored.assignments ? stored : {
    employees: [...getMonthDataRaw(y, m).employees],
    assignments: cloneData(getMonthDataRaw(y, m).assignments || {}),
    rbn: cloneData(getMonthDataRaw(y, m).rbn || {}),
    wishes: {}
  };
  const sourceRbn = cloneData(source.rbn || {});
  return {
    key,
    employees: [...(source.employees || [])],
    assignments: cloneData(source.assignments || {}),
    rbn: sourceRbn,
    wishes: cloneData(source.wishes || {}),
    baseline: { assignments: cloneData(source.assignments || {}), rbn: cloneData(sourceRbn) },
    history: [{ assignments: cloneData(source.assignments || {}), rbn: cloneData(sourceRbn) }],
    historyIdx: 0
  };
}

function ensurePlanSession(y, m) {
  const key = monthKey(y, m);
  if (!planSessions[key]) planSessions[key] = createPlanSession(y, m);
  normalizeMonthDataShape(planSessions[key]);
  return planSessions[key];
}

function syncPlanSessionRefs(session) {
  planData = session;
  planBaseline = session.baseline;
  planHistory = session.history;
  planHistoryIdx = session.historyIdx;
}

function persistPlanSessionRefs() {
  if (!planData) return;
  planData.baseline = planBaseline;
  planData.history = planHistory;
  planData.historyIdx = planHistoryIdx;
}

function hasSessionChanges(session) {
  return JSON.stringify({ assignments: session.assignments, rbn: session.rbn || {} }) !== JSON.stringify(session.baseline);
}

function hasAnyPlanChanges() {
  return Object.values(planSessions).some(hasSessionChanges);
}

function loadPlanSessionForState(y, m) {
  const session = ensurePlanSession(y, m);
  syncPlanSessionRefs(session);
  return session;
}

function setCell(y, m, emp, day, patch) {
  const md = getMonthData(y, m);
  if (!md.assignments[emp]) md.assignments[emp] = {};
  const merged = { ...(md.assignments[emp][day] || {}), ...patch };
  Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k]; });
  if (!Object.keys(merged).length) delete md.assignments[emp][day];
  else md.assignments[emp][day] = merged;
  if (!planMode) saveToStorage();
}

function clearCell(y, m, emp, day) {
  const md = getMonthData(y, m);
  if (md.assignments[emp]) delete md.assignments[emp][day];
  if (!planMode) saveToStorage();
}

function getCell(y, m, emp, day) {
  return getMonthData(y, m).assignments?.[emp]?.[day] || {};
}

function getRbnValue(y, m, day) {
  return getMonthData(y, m).rbn?.[day] || "";
}

function setRbnValue(y, m, day, value) {
  const md = getMonthData(y, m);
  if (!md.rbn) md.rbn = {};
  if (value) md.rbn[day] = value;
  else delete md.rbn[day];
  if (!planMode) saveToStorage();
}

function addEmployee(y, m, name) {
  const md = getMonthData(y, m);
  if (!md.employees.includes(name)) md.employees.push(name);
  if (planMode) persistPlanSessionRefs();
  else saveToStorage();
}

function removeEmployee(y, m, name) {
  const md = getMonthData(y, m);
  md.employees = md.employees.filter(e => e !== name);
  delete md.assignments[name];
  if (planMode) persistPlanSessionRefs();
  else saveToStorage();
}

function dutyOwner(y, m, day, dt) {
  const md = getMonthData(y, m);
  return md.employees.find(e => md.assignments[e]?.[day]?.duty === dt) || null;
}

function dayCodeCount(y, m, day, code) {
  const md = getMonthData(y, m);
  if (code === "D" || code === "HG") return md.employees.filter(e => md.assignments[e]?.[day]?.duty === code).length;
  return md.employees.filter(e => (md.assignments[e]?.[day]?.assignment || "").split("/").map(x => x.trim()).includes(code)).length;
}

function buildProfileStats(y, m, emp) {
  const hols = getSaxonyHolidaysCached(y);
  const dim = daysInMonth(y, m);
  let totalWorkdays = 0, coveredWorkdays = 0, aktivDays = 0;
  const wpCounts = {}, stCounts = {};
  const dutyD = [], dutyHG = [];
  
  for (let d = 1; d <= dim; d++) {
    const work = isWorkday(y, m, d, hols);
    if (work) totalWorkdays++;
    const cell = getCell(y, m, emp, d);
    if ((cell.assignment || cell.duty) && work) coveredWorkdays++;
    
    let isActiveDay = false;
    if (cell.duty === "D" || cell.duty === "HG") isActiveDay = true;
    
    if (cell.assignment) {
      cell.assignment.split("/").map(x => x.trim()).forEach(p => {
        if (WORKPLACES.find(w => w.code === p)) {
          wpCounts[p] = (wpCounts[p] || 0) + 1;
          isActiveDay = true;
        } else if (STATUSES.find(s => s.code === p)) {
          if (!VACATION_CODES.includes(p) || work) stCounts[p] = (stCounts[p] || 0) + 1;
        }
      });
    }
    
    if (isActiveDay) aktivDays++;
    if (cell.duty === "D") dutyD.push(d);
    if (cell.duty === "HG") dutyHG.push(d);
  }
  
  const totalAbs = ABSENCE_CODES.reduce((s, c) => s + (stCounts[c] || 0), 0);
  const frei = stCounts["F"] || 0;
  const uncovered = Math.max(0, totalWorkdays - coveredWorkdays);
  
  return {
    totalWorkdays, coveredWorkdays, uncovered, wpCounts, stCounts,
    aktivDays, totalAbs, frei, dutyD, dutyHG, dim
  };
}

function buildYearlyStats(emp, year) {
  const months = [];
  const totals = { totalWorkdays: 0, coveredWorkdays: 0, wpCounts: {}, stCounts: {}, dutyD: 0, dutyHG: 0, aktivDays: 0 };
  
  for (let m = 0; m < 12; m++) {
    const k = monthKey(year, m);
    if (!DATA[k] || !DATA[k].employees.includes(emp)) {
      months.push({ m, hasData: false, totalWorkdays: 0, coveredWorkdays: 0, wpCounts: {}, stCounts: {}, dutyD: 0, dutyHG: 0, aktivDays: 0 });
      continue;
    }
    const hols = getSaxonyHolidaysCached(year);
    const dim = daysInMonth(year, m);
    let wd = 0, cov = 0, dutyD = 0, dutyHG = 0, aktivDays = 0;
    const wpc = {}, stc = {};
    
    for (let d = 1; d <= dim; d++) {
      const wdDay = isWorkday(year, m, d, hols);
      if (wdDay) wd++;
      const cell = getCell(year, m, emp, d);
      if ((cell.assignment || cell.duty) && wdDay) cov++;
      
      let isActiveDay = false;
      if (cell.duty === "D" || cell.duty === "HG") isActiveDay = true;
      
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).forEach(p => {
          if (WORKPLACES.find(w => w.code === p)) {
            wpc[p] = (wpc[p] || 0) + 1;
            isActiveDay = true;
          } else if (STATUSES.find(s => s.code === p)) {
            if (!VACATION_CODES.includes(p) || wdDay) stc[p] = (stc[p] || 0) + 1;
          }
        });
      }
      
      if (isActiveDay) aktivDays++;
      if (cell.duty === "D") dutyD++;
      if (cell.duty === "HG") dutyHG++;
    }
    
    totals.totalWorkdays += wd;
    totals.coveredWorkdays += cov;
    totals.dutyD += dutyD;
    totals.dutyHG += dutyHG;
    totals.aktivDays += aktivDays;
    Object.entries(wpc).forEach(([c, v]) => { totals.wpCounts[c] = (totals.wpCounts[c] || 0) + v; });
    Object.entries(stc).forEach(([c, v]) => { totals.stCounts[c] = (totals.stCounts[c] || 0) + v; });
    
    months.push({ m, hasData: true, totalWorkdays: wd, coveredWorkdays: cov, wpCounts: wpc, stCounts: stc, dutyD, dutyHG, aktivDays });
  }
  
  totals.vacationDays = VACATION_CODES.reduce((s, c) => s + (totals.stCounts[c] || 0), 0);
  totals.sickDays = (totals.stCounts["K"] || 0) + (totals.stCounts["KK"] || 0);
  totals.fzaDays = totals.stCounts["FZA"] || 0;
  totals.wbDays = totals.stCounts["WB"] || 0;
  totals.freiDays = totals.stCounts["F"] || 0;
  
  return { months, totals, year };
}

function getEmployeesForYear(year) {
  const emps = new Set();
  Object.entries(DATA).forEach(([key, md]) => {
    if (!key.startsWith(`${year}-`) || !md?.employees) return;
    md.employees.forEach(emp => emps.add(emp));
  });
  getMonthDataRaw(year, state.month).employees.forEach(emp => emps.add(emp));
  if (planMode) {
    Object.keys(planSessions).forEach(key => {
      if (!key.startsWith(`${year}-`)) return;
      planSessions[key].employees.forEach(emp => emps.add(emp));
    });
  }
  return [...emps].sort((a, b) => {
    const pA = getEmpMeta(a).position;
    const pB = getEmpMeta(b).position;
    const order = { "CA": 1, "LOA": 2, "OA": 3, "OÄ": 3, "FA": 4, "FÄ": 4, "AA": 5, "AÄ": 5 };
    const wA = order[pA] || 99;
    const wB = order[pB] || 99;
    if (wA !== wB) return wA - wB;
    return a.localeCompare(b, 'de');
  });
}

function getRoleFilterBuckets(year, employees) {
  const buckets = { ALL: employees.length, CA: 0, OA: 0, FA: 0, AA: 0, OHNE: 0 };
  employees.forEach(emp => {
    const pos = getEmpMeta(emp).position;
    if (pos === "CA") buckets.CA++;
    else if (["LOA", "OA", "OÄ"].includes(pos)) buckets.OA++;
    else if (["FA", "FÄ"].includes(pos)) buckets.FA++;
    else if (["AA", "AÄ"].includes(pos)) buckets.AA++;
    else buckets.OHNE++;
  });
  return buckets;
}

function getEmployeeYearCardMetrics(emp, year) {
  const ys = buildYearlyStats(emp, year);
  const meta = getEmpMeta(emp);
  const activeMonths = ys.months.filter(mon => mon.hasData).length;
  const coverage = ys.totals.totalWorkdays > 0 ? Math.round((ys.totals.coveredWorkdays / ys.totals.totalWorkdays) * 100) : 0;
  return { emp, ys, meta, activeMonths, coverage };
}

function matchRoleFilter(emp, role) {
  if (role === "ALL") return true;
  const pos = getEmpMeta(emp).position;
  if (role === "CA") return pos === "CA";
  if (role === "OA") return ["LOA", "OA", "OÄ"].includes(pos);
  if (role === "FA") return ["FA", "FÄ"].includes(pos);
  if (role === "AA") return ["AA", "AÄ"].includes(pos);
  if (role === "OHNE") return pos === "—";
  return true;
}

function shiftMonth(delta) {
  const total = state.year * 12 + state.month + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  return { year: nextYear, month: nextMonth };
}