"use strict";

const WORKPLACES = [
  { code: "MR", label: "MRT", bg: "#DBEAFE", fg: "#1D4ED8" },
  { code: "CT", label: "CT", bg: "#FFEDD5", fg: "#C2410C" },
  { code: "US", label: "Sonographie", bg: "#CCFBF1", fg: "#0F766E" },
  { code: "AN", label: "Angiographie", bg: "#F3E8FF", fg: "#7E22CE" },
  { code: "MA", label: "Mammographie", bg: "#FCE7F3", fg: "#BE185D" },
  { code: "KUS", label: "Kinder-US", bg: "#DCFCE7", fg: "#15803D" },
  { code: "W", label: "Wermsdorf", bg: "#FEF9C3", fg: "#854D0E" },
  { code: "T", label: "Teleradiologie", bg: "#E0E7FF", fg: "#3730A3" },
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
  { code: "WB", label: "Weiterbildung", bg: "#FEF3C7", fg: "#78350F" },
];
const CODE_MAP = {};
[...WORKPLACES, ...STATUSES].forEach((x) => {
  CODE_MAP[x.code] = x;
});
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];
const DOW_ABBR = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DOW_LONG = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
const STORAGE_KEY = "radplan_v3";
const ABSENCE_CODES = ["U", "ZU", "SU", "FZA", "K", "KK", "§15c", "WB"];
const VACATION_CODES = ["U", "ZU", "SU", "§15c"];
const WISH_TYPES = [
  {
    code: "NO_DUTY",
    label: "Kein Dienst",
    icon: "✗",
    bg: "#FEE2E2",
    fg: "#991B1B",
    border: "#FCA5A5",
  },
  {
    code: "BD_WISH",
    label: "BD Wunsch",
    icon: "D",
    bg: "#FEE2E2",
    fg: "#B91C1C",
    border: "#F87171",
  },
  {
    code: "HG_WISH",
    label: "HG Wunsch",
    icon: "H",
    bg: "#E0F2FE",
    fg: "#0369A1",
    border: "#7DD3FC",
  },
];
const WISH_MAP = {};
WISH_TYPES.forEach((w) => {
  WISH_MAP[w.code] = w;
});
const EMP_META = {
  "Prof. Schäfer": {
    fullName: "Prof. Dr. Arnd-Oliver Schäfer",
    position: "CA",
    posLabel: "Chefarzt",
    type: "FA für Radiologie",
    area: "",
    deputy: "Dr. Lurz",
  },
  "Dr. Lurz": {
    fullName: "Dr. med. Markus Lurz",
    position: "LOA",
    posLabel: "Leitender Oberarzt",
    type: "FA für Radiologie",
    area: "MRT · Röntgen KV",
    deputy: "Prof. Schäfer / Dr. Polednia",
  },
  "Dr. Polednia": {
    fullName: "Dr. med. Alexander Polednia",
    position: "OA",
    posLabel: "Oberarzt",
    type: "FA für Radiologie · Kinderradiologie",
    area: "Leiter Kinderradiologie",
    deputy: "",
  },
  "Fr. Dalitz": {
    fullName: "Bettina Dalitz",
    position: "OÄ",
    posLabel: "Oberärztin",
    type: "FÄ für Radiologie · Neuroradiologie",
    area: "Leiterin Mammographie",
    deputy: "",
  },
  "Fr. Thaler": {
    fullName: "Fr. Thaler",
    position: "FÄ",
    posLabel: "Fachärztin",
    type: "FÄ für Radiologie",
    area: "",
    deputy: "",
  },
  "Dr. Becker": {
    fullName: "Dr. med. Juliane Becker",
    position: "OÄ",
    posLabel: "Oberärztin",
    type: "FÄ für Radiologie · FÄ für Nuklearmedizin",
    area: "CT",
    deputy: "Dr. Martin",
  },
  "Dr. Martin": {
    fullName: "Dr. med. Arno Martin",
    position: "FA",
    posLabel: "Facharzt",
    type: "FA für Radiologie",
    area: "",
    deputy: "",
  },
  "Hr. El Houba": {
    fullName: "Abdelilah El Houba",
    position: "AA",
    posLabel: "Assistenzarzt",
    type: "AA für Radiologie",
    area: "",
    deputy: "",
  },
  "Fr. Licenji": {
    fullName: "Johanna Licenji",
    position: "AÄ",
    posLabel: "Assistenzärztin",
    type: "AÄ für Radiologie",
    area: "",
    deputy: "",
  },
  "Hr. Torki": {
    fullName: "Mohamed Torki",
    position: "AA",
    posLabel: "Assistenzarzt",
    type: "AA für Radiologie",
    area: "",
    deputy: "",
  },
  "Hr. Sebastian": {
    fullName: "Ron Sebastian",
    position: "AA",
    posLabel: "Assistenzarzt",
    type: "AA für Radiologie",
    area: "",
    deputy: "",
  },
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
  return (
    EMP_META[name] || {
      fullName: name,
      position: "—",
      posLabel: "—",
      type: "—",
      area: "",
      deputy: "",
    }
  );
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
    AÄ: { bg: "#F1F5F9", fg: "#475569", border: "#94A3B8" },
  };
  return m[pos] || { bg: "#F1F5F9", fg: "#6B7280", border: "#CBD5E1" };
}
const pad2 = (n) => String(n).padStart(2, "0");
const dateKey = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const monthKey = (y, m) => `${y}-${m}`;
const prevMK = (y, m) => (m === 0 ? `${y - 1}-11` : `${y}-${m - 1}`);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const weekday = (y, m, d) => new Date(y, m, d).getDay();
const isWeekend = (y, m, d) => {
  const w = weekday(y, m, d);
  return w === 0 || w === 6;
};
const isFriday = (y, m, d) => weekday(y, m, d) === 5;
function easterDate(year) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
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
const dateToDK = (dt) => dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
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
    [dateKey(year, 11, 26)]: "2. Weihnachtstag",
  };
}
const isHoliday = (y, m, d, hols) => !!hols[dateKey(y, m, d)];
const isWorkday = (y, m, d, hols) =>
  !isWeekend(y, m, d) && !isHoliday(y, m, d, hols);
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
  const caps = parts.filter((p) => p.length > 0 && /[A-ZÄÖÜ]/.test(p[0]));
  if (caps.length >= 2)
    return caps
      .map((p) => p[0])
      .slice(0, 2)
      .join("");
  return name.slice(0, 2).toUpperCase();
}
let DATA = {};
function loadFromStorage() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) DATA = JSON.parse(r);
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
    const ky = parseInt(parts[0], 10),
      km = parseInt(parts[1], 10);
    const dim = daysInMonth(ky, km);
    for (const emp of mData.employees) {
      if (!mData.assignments[emp]) continue;
      for (let d = 1; d <= dim; d++) {
        if (mData.assignments[emp][d]?.duty !== "D") continue;
        const next = nextCalendarDay(ky, km, d);
        if (next.y === ky && next.m === km) {
          if (!mData.assignments[emp][next.d])
            mData.assignments[emp][next.d] = {};
          if (!mData.assignments[emp][next.d].assignment) {
            mData.assignments[emp][next.d].assignment = "F";
            totalRepaired++;
          }
        } else {
          const nk = monthKey(next.y, next.m);
          if (DATA[nk]) {
            if (!DATA[nk].assignments) DATA[nk].assignments = {};
            if (!DATA[nk].assignments[emp]) DATA[nk].assignments[emp] = {};
            if (!DATA[nk].assignments[emp][next.d])
              DATA[nk].assignments[emp][next.d] = {};
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
function getMonthData(y, m) {
  if (planMode && planData && y === state.year && m === state.month)
    return planData;
  const k = monthKey(y, m);
  if (!DATA[k]) {
    const prev = DATA[prevMK(y, m)];
    DATA[k] = { employees: [...(prev?.employees || [])], assignments: {} };
  }
  return DATA[k];
}
function setCell(y, m, emp, day, patch) {
  const md = getMonthData(y, m);
  if (!md.assignments[emp]) md.assignments[emp] = {};
  const merged = { ...(md.assignments[emp][day] || {}), ...patch };
  Object.keys(merged).forEach((k) => {
    if (!merged[k]) delete merged[k];
  });
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
function addEmployee(y, m, name) {
  const md = getMonthData(y, m);
  if (!md.employees.includes(name)) md.employees.push(name);
  saveToStorage();
}
function removeEmployee(y, m, name) {
  const md = getMonthData(y, m);
  md.employees = md.employees.filter((e) => e !== name);
  delete md.assignments[name];
  saveToStorage();
}
function dutyOwner(y, m, day, dt) {
  const md = getMonthData(y, m);
  return (
    md.employees.find((e) => md.assignments[e]?.[day]?.duty === dt) || null
  );
}
function dayCodeCount(y, m, day, code) {
  const md = getMonthData(y, m);
  if (code === "D" || code === "HG")
    return md.employees.filter((e) => md.assignments[e]?.[day]?.duty === code)
      .length;
  return md.employees.filter((e) =>
    (md.assignments[e]?.[day]?.assignment || "")
      .split("/")
      .map((x) => x.trim())
      .includes(code),
  ).length;
}
const today = new Date();
const TOD_Y = today.getFullYear(),
  TOD_M = today.getMonth(),
  TOD_D = today.getDate();
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const state = {
  year: 2026,
  month: new Date().getMonth(),
  edit: null,
  ed: { wp: [], st: null, duty: null },
};
let deptTab = "month";
let planMode = false;
let planData = null;
let planBaseline = null;
let planHistory = [];
let planHistoryIdx = -1;
function isEditorOpen() {
  const el = document.getElementById("modal-editor");
  return el && !el.hasAttribute("hidden");
}
function recordPlanHistory() {
  if (!planMode || !planData) return;
  planHistory = planHistory.slice(0, planHistoryIdx + 1);
  planHistory.push(JSON.parse(JSON.stringify(planData.assignments)));
  planHistoryIdx = planHistory.length - 1;
  updatePlanBarUI();
}
function updatePlanBarUI() {
  const undoBtn = document.getElementById("btn-plan-undo");
  const redoBtn = document.getElementById("btn-plan-redo");
  if (!undoBtn || !redoBtn) return;
  const canUndo = planHistoryIdx > 0;
  const canRedo = planHistoryIdx < planHistory.length - 1;
  undoBtn.disabled = !canUndo;
  redoBtn.disabled = !canRedo;
  undoBtn.title = canUndo ? `Rückgängig (Strg+Z)` : "";
  redoBtn.title = canRedo ? `Vorwärts (Strg+Y)` : "";
}
function enterPlanMode() {
  const { year: y, month: m } = state;
  const realMD = getMonthData(y, m);
  planData = {
    employees: [...realMD.employees],
    assignments: JSON.parse(JSON.stringify(realMD.assignments)),
    wishes: {},
  };
  planBaseline = JSON.parse(JSON.stringify(planData.assignments));
  planHistory = [JSON.parse(JSON.stringify(planData.assignments))];
  planHistoryIdx = 0;
  planMode = true;
  autoPlanTargets = {};
  render();
  showToast("Planungsmodus aktiv");
}
function exitPlanMode() {
  planMode = false;
  planData = null;
  planBaseline = null;
  planHistory = [];
  planHistoryIdx = -1;
  render();
}
function getWish(emp, day) {
  if (!planMode || !planData?.wishes) return null;
  return planData.wishes[emp]?.[day] || null;
}
function setWish(emp, day, wishCode) {
  if (!planMode || !planData) return;
  if (!planData.wishes[emp]) planData.wishes[emp] = {};
  if (wishCode) planData.wishes[emp][day] = wishCode;
  else delete planData.wishes[emp][day];
}
function toggleWish(emp, day, wishCode) {
  const current = getWish(emp, day);
  setWish(emp, day, current === wishCode ? null : wishCode);
}
function closePlanMode() {
  const hasChanges =
    planBaseline &&
    JSON.stringify(planData.assignments) !== JSON.stringify(planBaseline);
  if (hasChanges) {
    if (
      !confirm("Planungsmodus schließen?\nEs gibt ungespeicherte Änderungen.")
    )
      return;
  }
  exitPlanMode();
}
function abortPlanChanges() {
  if (!planMode || !planBaseline) return;
  if (JSON.stringify(planData.assignments) === JSON.stringify(planBaseline)) {
    showToast("Keine Änderungen");
    return;
  }
  planData.assignments = JSON.parse(JSON.stringify(planBaseline));
  planHistory = [JSON.parse(JSON.stringify(planData.assignments))];
  planHistoryIdx = 0;
  render();
  showToast("Zurückgesetzt");
}
function savePlanDraft() {
  if (!planMode || !planData) return;
  const key = `radplan_v3_plan_${monthKey(state.year, state.month)}`;
  try {
    localStorage.setItem(key, JSON.stringify(planData));
    planBaseline = JSON.parse(JSON.stringify(planData.assignments));
    updatePlanBarUI();
    showToast("Entwurf gespeichert");
  } catch (e) {
    showToast("Fehler beim Speichern");
  }
}
function applyPlanToMain() {
  if (!planMode || !planData) return;
  const k = monthKey(state.year, state.month);
  if (!DATA[k])
    DATA[k] = { employees: [...planData.employees], assignments: {} };
  DATA[k].assignments = JSON.parse(JSON.stringify(planData.assignments));
  saveToStorage();
  exitPlanMode();
  showToast("Planung übernommen");
}
function undoPlan() {
  if (!planMode || planHistoryIdx <= 0) return;
  planHistoryIdx--;
  planData.assignments = JSON.parse(
    JSON.stringify(planHistory[planHistoryIdx]),
  );
  updatePlanBarUI();
  render();
}
function redoPlan() {
  if (!planMode || planHistoryIdx >= planHistory.length - 1) return;
  planHistoryIdx++;
  planData.assignments = JSON.parse(
    JSON.stringify(planHistory[planHistoryIdx]),
  );
  updatePlanBarUI();
  render();
}
function render() {
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidays(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  document.getElementById("month-label").textContent = `${MONTHS[m]} ${y}`;
  const todayBtn = document.getElementById("btn-today");
  if (todayBtn)
    todayBtn.classList.toggle("today-btn-active", y === TOD_Y && m === TOD_M);
  const planBar = document.getElementById("plan-bar");
  if (planBar) {
    if (planMode) {
      planBar.removeAttribute("hidden");
      planBar.style.display = "flex";
      document.body.classList.add("plan-mode-active");
      const lbl = document.getElementById("plan-bar-month");
      if (lbl) lbl.textContent = `${MONTHS[m]} ${y}`;
      updatePlanBarUI();
    } else {
      planBar.setAttribute("hidden", "");
      planBar.style.display = "none";
      document.body.classList.remove("plan-mode-active");
    }
  }
  if (IS_MOBILE) {
    renderMobileView();
    return;
  }
  renderStatsBar(y, m, dim, hols, md);
  renderThead(y, m, dim, hols);
  renderTbody(y, m, dim, hols, md);
  renderTfoot(y, m, dim, md);
}
function renderStatsBar(y, m, dim, hols, md) {
  const bar = document.getElementById("stats-bar");
  bar.innerHTML = "";
  const empCount = document.createElement("div");
  empCount.className = "stat-item stat-item-emp";
  empCount.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="stat-count">${md.employees.length}</span><span class="stat-label-sm">MA</span>`;
  bar.appendChild(empCount);
  const totals = {};
  [
    ...WORKPLACES.map((w) => w.code),
    ...STATUSES.map((s) => s.code),
    "D",
    "HG",
  ].forEach((c) => {
    totals[c] = 0;
  });
  for (let d = 1; d <= dim; d++) {
    md.employees.forEach((emp) => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment)
        cell.assignment
          .split("/")
          .map((x) => x.trim())
          .forEach((c) => {
            if (c in totals) totals[c]++;
          });
      if (cell.duty && cell.duty in totals) totals[cell.duty]++;
    });
  }
  const order = [
    ...WORKPLACES.map((w) => w.code),
    "D",
    "HG",
    "U",
    "K",
    "F",
    "WB",
    "FZA",
    "ZU",
    "SU",
    "KK",
    "§15c",
  ];
  let any = false;
  order.forEach((code) => {
    const v = totals[code];
    if (!v) return;
    any = true;
    const meta = CODE_MAP[code];
    const isD = code === "D",
      isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta?.bg || "#E2E8F0";
    const fg = isD || isHG ? "#fff" : meta?.fg || "#374151";
    const div = document.createElement("div");
    div.className = "stat-item";
    div.innerHTML = `<span class="stat-code" style="background:${bg};color:${fg}">${code}</span><span class="stat-count">${v}</span>`;
    bar.appendChild(div);
  });
  if (!any && !md.employees.length)
    bar.innerHTML = `<span id="stats-empty">Keine Daten</span>`;
}
function renderThead(y, m, dim, hols) {
  const thead = document.getElementById("plan-thead");
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  const thC = document.createElement("th");
  thC.className = "th-corner";
  thC.innerHTML = '<div class="th-corner-inner">Mitarbeitende</div>';
  tr.appendChild(thC);
  let prevKW = -1;
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const we = isWeekend(y, m, d);
    const isT = isTodayCol(y, m, d);
    const fri = isFriday(y, m, d);
    const kw = isoWeekNumber(y, m, d);
    const showKW = (wd === 1 || (d === 1 && wd !== 1)) && kw !== prevKW;
    if (showKW) prevKW = kw;
    const hn = hols[dateKey(y, m, d)] || "";
    const th = document.createElement("th");
    th.className =
      "th-day " +
      (hol ? "hol" : we ? "we" : "wd") +
      (isT ? " today" : "") +
      (fri ? " is-fri" : "");
    th.innerHTML = `<div class="th-day-inner"><span class="d-kw">${showKW ? "KW" + kw : ""}</span><span class="d-num">${d}</span><span class="d-dow">${DOW_ABBR[wd]}</span>${hn ? `<span class="d-hol">${hn}</span>` : ""}</div>`;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
}
function renderTbody(y, m, dim, hols, md) {
  const tbody = document.getElementById("plan-tbody");
  tbody.innerHTML = "";
  if (!md.employees.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dim + 1;
    td.className = "td-empty";
    td.innerHTML = `<div class="empty-inner"><p class="empty-title">Keine Mitarbeitenden</p></div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  md.employees.forEach((emp) => {
    const meta = getEmpMeta(emp);
    const pc = posColor(meta.position);
    const tr = document.createElement("tr");
    const tdN = document.createElement("td");
    tdN.className = "td-name";
    tdN.style.borderLeft = `3px solid ${pc.border}`;
    tdN.style.paddingLeft = "11px";
    tdN.setAttribute("role", "button");
    tdN.setAttribute("tabindex", "0");
    tdN.innerHTML =
      `<span class="emp-label">${emp}</span>` +
      (meta.position !== "—"
        ? `<span class="emp-pos-tag" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>`
        : "") +
      `<span class="emp-profile-icon"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span><button class="emp-del"><svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l7 7M8 1L1 8"/></svg></button>`;
    tdN.querySelector(".emp-del").addEventListener("click", (e) => {
      e.stopPropagation();
      confirmRemoveEmployee(emp);
    });
    tdN.addEventListener("click", () => openProfileModal(emp));
    tdN.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProfileModal(emp);
      }
    });
    tr.appendChild(tdN);
    for (let d = 1; d <= dim; d++) {
      const cell = md.assignments?.[emp]?.[d] || {};
      const we = isWeekend(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const isT = isTodayCol(y, m, d);
      const fri = isFriday(y, m, d);
      const emptyWd = !we && !hol && !cell.assignment && !cell.duty;
      const isAutoFRest = cell.assignment === "F" && (we || hol);
      const { bg, fg } = cellColor(cell.assignment);
      const tdEl = document.createElement("td");
      tdEl.className =
        "td-cell" +
        (hol ? " hol" : we ? " we" : "") +
        (isT ? " today" : "") +
        (fri ? " is-fri" : "") +
        (emptyWd ? " empty-wd" : "") +
        (isAutoFRest ? " auto-f-rest" : "");
      tdEl.tabIndex = 0;
      if (cell.assignment && !isAutoFRest) tdEl.style.backgroundColor = bg;
      tdEl.innerHTML = `<div class="cell-inner"><span class="cell-assign" style="color:${isAutoFRest ? "rgba(71,85,105,0.35)" : fg}">${cell.assignment || ""}</span>${cell.duty ? `<span class="cell-duty badge-${cell.duty}">${cell.duty}</span>` : ""}${planMode && getWish(emp, d) ? `<span class="cell-wish wish-${getWish(emp, d)}">${WISH_MAP[getWish(emp, d)]?.icon || ""}</span>` : ""}</div>`;
      tdEl.addEventListener("click", () => openEditor(emp, d));
      tdEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEditor(emp, d);
        }
      });
      tr.appendChild(tdEl);
    }
    tbody.appendChild(tr);
  });
}
function renderTfoot(y, m, dim, md) {
  const tfoot = document.getElementById("plan-tfoot");
  tfoot.innerHTML = "";
  const hols = getSaxonyHolidays(y);
  const rows = [
    { code: "MR", label: "MRT", meta: CODE_MAP["MR"] },
    { code: "CT", label: "CT", meta: CODE_MAP["CT"] },
    { code: "D", label: "Bereitschaftsdienst", meta: null },
    { code: "HG", label: "Hintergrunddienst", meta: null },
  ];
  rows.forEach(({ code, label, meta }, rowIdx) => {
    const isD = code === "D",
      isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta.bg;
    const fg = isD || isHG ? "#fff" : meta.fg;
    const tr = document.createElement("tr");
    tr.className = "tr-stat" + (rowIdx === 0 ? " tr-stat-first" : "");
    const tdL = document.createElement("td");
    tdL.className = "td-stat-lbl";
    tdL.innerHTML = `<span class="stat-lbl-badge" style="background:${bg};color:${fg}">${code}</span><span class="stat-lbl-text">${label}</span>`;
    tr.appendChild(tdL);
    for (let d = 1; d <= dim; d++) {
      const val = dayCodeCount(y, m, d, code);
      const we = isWeekend(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const fri = isFriday(y, m, d);
      const isT = isTodayCol(y, m, d);
      const td = document.createElement("td");
      let cls = "td-stat-val";
      if (we || hol) cls += " dim";
      else if ((isD || isHG) && val > 1) cls += " warn";
      else if (val > 0) cls += " nz";
      if (isT) cls += " today-col";
      if (fri) cls += " is-fri";
      td.className = cls;
      td.textContent = val > 0 ? val : "";
      tr.appendChild(td);
    }
    tfoot.appendChild(tr);
  });
}
function buildProfileStats(y, m, emp) {
  const hols = getSaxonyHolidays(y);
  const dim = daysInMonth(y, m);
  let totalWorkdays = 0,
    coveredWorkdays = 0;
  const wpCounts = {},
    stCounts = {};
  const dutyD = [],
    dutyHG = [];
  for (let d = 1; d <= dim; d++) {
    const work = isWorkday(y, m, d, hols);
    if (work) totalWorkdays++;
    const cell = getCell(y, m, emp, d);
    if ((cell.assignment || cell.duty) && work) coveredWorkdays++;
    if (cell.assignment) {
      cell.assignment
        .split("/")
        .map((x) => x.trim())
        .forEach((p) => {
          if (WORKPLACES.find((w) => w.code === p))
            wpCounts[p] = (wpCounts[p] || 0) + 1;
          else if (STATUSES.find((s) => s.code === p)) {
            if (!VACATION_CODES.includes(p) || work)
              stCounts[p] = (stCounts[p] || 0) + 1;
          }
        });
    }
    if (cell.duty === "D") dutyD.push(d);
    if (cell.duty === "HG") dutyHG.push(d);
  }
  const totalWP = Object.values(wpCounts).reduce((s, v) => s + v, 0);
  const totalAbs = ABSENCE_CODES.reduce((s, c) => s + (stCounts[c] || 0), 0);
  const frei = stCounts["F"] || 0;
  const uncovered = Math.max(0, totalWorkdays - coveredWorkdays);
  return {
    totalWorkdays,
    coveredWorkdays,
    uncovered,
    wpCounts,
    stCounts,
    totalWP,
    totalAbs,
    frei,
    dutyD,
    dutyHG,
    dim,
  };
}
function buildYearlyStats(emp, year) {
  const months = [];
  const totals = {
    totalWorkdays: 0,
    coveredWorkdays: 0,
    wpCounts: {},
    stCounts: {},
    dutyD: 0,
    dutyHG: 0,
  };
  for (let m = 0; m < 12; m++) {
    const k = monthKey(year, m);
    if (!DATA[k] || !DATA[k].employees.includes(emp)) {
      months.push({
        m,
        hasData: false,
        totalWorkdays: 0,
        coveredWorkdays: 0,
        wpCounts: {},
        stCounts: {},
        dutyD: 0,
        dutyHG: 0,
      });
      continue;
    }
    const hols = getSaxonyHolidays(year);
    const dim = daysInMonth(year, m);
    let wd = 0,
      cov = 0,
      dutyD = 0,
      dutyHG = 0;
    const wpc = {},
      stc = {};
    for (let d = 1; d <= dim; d++) {
      const wdDay = isWorkday(year, m, d, hols);
      if (wdDay) wd++;
      const cell = getCell(year, m, emp, d);
      if ((cell.assignment || cell.duty) && wdDay) cov++;
      if (cell.assignment) {
        cell.assignment
          .split("/")
          .map((x) => x.trim())
          .forEach((p) => {
            if (WORKPLACES.find((w) => w.code === p))
              wpc[p] = (wpc[p] || 0) + 1;
            else if (STATUSES.find((s) => s.code === p)) {
              if (!VACATION_CODES.includes(p) || wdDay)
                stc[p] = (stc[p] || 0) + 1;
            }
          });
      }
      if (cell.duty === "D") dutyD++;
      if (cell.duty === "HG") dutyHG++;
    }
    totals.totalWorkdays += wd;
    totals.coveredWorkdays += cov;
    totals.dutyD += dutyD;
    totals.dutyHG += dutyHG;
    Object.entries(wpc).forEach(([c, v]) => {
      totals.wpCounts[c] = (totals.wpCounts[c] || 0) + v;
    });
    Object.entries(stc).forEach(([c, v]) => {
      totals.stCounts[c] = (totals.stCounts[c] || 0) + v;
    });
    months.push({
      m,
      hasData: true,
      totalWorkdays: wd,
      coveredWorkdays: cov,
      wpCounts: wpc,
      stCounts: stc,
      dutyD,
      dutyHG,
    });
  }
  totals.vacationDays = VACATION_CODES.reduce(
    (s, c) => s + (totals.stCounts[c] || 0),
    0,
  );
  totals.sickDays = (totals.stCounts["K"] || 0) + (totals.stCounts["KK"] || 0);
  totals.fzaDays = totals.stCounts["FZA"] || 0;
  totals.wbDays = totals.stCounts["WB"] || 0;
  totals.freiDays = totals.stCounts["F"] || 0;
  totals.totalWP = Object.values(totals.wpCounts).reduce((s, v) => s + v, 0);
  return { months, totals, year };
}

function openProfileModal(empName) {
  const { year: y, month: m } = state;
  const meta = getEmpMeta(empName);
  const pc = posColor(meta.position);
  const ini = empInitials(empName);
  const hols = getSaxonyHolidays(y);
  const s = buildProfileStats(y, m, empName);
  const ys = buildYearlyStats(empName, y);
  const avatarEl = document.getElementById("pm-avatar");
  if (avatarEl) {
    avatarEl.textContent = ini;
    avatarEl.style.background = `linear-gradient(135deg,${pc.border},${pc.fg})`;
  }
  const nameEl = document.getElementById("pm-name");
  if (nameEl) nameEl.textContent = meta.fullName !== empName ? meta.fullName : empName;
  const subEl = document.getElementById("pm-sub");
  if (subEl) subEl.textContent = `${MONTHS[m]} ${y} · ${s.totalWorkdays} Werktage`;
  const metaRow = document.getElementById("pm-meta-row");
  if (metaRow) {
    let metaHtml = "";
    if (meta.position !== "—")
      metaHtml += `<span class="pm-pos-pill" style="background:${pc.bg};color:${pc.fg}">${meta.position} · ${meta.posLabel}</span>`;
    if (meta.area)
      metaHtml += `<span class="pm-meta-chip pm-chip-area">${meta.area}</span>`;
    if (meta.deputy)
      metaHtml += `<span class="pm-meta-chip pm-chip-deputy">V: ${meta.deputy}</span>`;
    metaRow.innerHTML = metaHtml;
  }
  const kpiEl = document.getElementById("pm-kpi");
  if (kpiEl) {
    const vac = VACATION_CODES.reduce((sum, c) => sum + (s.stCounts[c] || 0), 0);
    const sick = (s.stCounts["K"] || 0) + (s.stCounts["KK"] || 0);
    const fza = s.stCounts["FZA"] || 0;
    const covPct = s.totalWorkdays > 0 ? Math.round((s.coveredWorkdays / s.totalWorkdays) * 100) : 0;
    const kpis = [
      { label: "Werktage", val: s.totalWorkdays, sub: `${s.coveredWorkdays} belegt`, color: "#1D4ED8", pct: covPct },
      { label: "Nicht geplant", val: s.uncovered, sub: "offen", color: s.uncovered > 0 ? "#F97316" : "#15803D", pct: 0 },
      { label: "D-Dienste", val: s.dutyD.length, sub: `${s.dutyD.map(d => d + ".").join(" ") || "—"}`, color: "#EF4444", pct: 0 },
      { label: "HG-Dienste", val: s.dutyHG.length, sub: `${s.dutyHG.map(d => d + ".").join(" ") || "—"}`, color: "#0EA5E9", pct: 0 },
      { label: "Urlaub", val: vac, sub: "U/ZU/SU/§15c", color: "#7C3AED", pct: 0 },
      { label: "Krank", val: sick, sub: "K / KK", color: "#DC2626", pct: 0 },
      { label: "FZA", val: fza, sub: "Freizeitausgleich", color: "#3730A3", pct: 0 },
      { label: "Frei", val: s.frei, sub: "F-Tage", color: "#475569", pct: 0 },
    ];
    kpiEl.innerHTML = kpis.map(k => `<div class="kpi-card" style="border-top-color:${k.color}"><div class="kpi-head"><span class="kpi-label">${k.label}</span><span class="kpi-icon"><svg width="12" height="12" fill="none" stroke="${k.color}" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span></div><div class="kpi-value" style="color:${k.color}">${k.val}</div><div class="kpi-sub">${k.sub}</div>${k.pct > 0 ? `<div class="kpi-bar-wrap"><div class="kpi-bar-fill" style="width:${k.pct}%;background:${k.color}"></div></div>` : ""}</div>`).join("");
  }
  const wpChartEl = document.getElementById("pm-wp-chart");
  const wpHdEl = document.getElementById("pm-wp-hd");
  if (wpChartEl) {
    const wpEntries = Object.entries(s.wpCounts).sort((a, b) => b[1] - a[1]);
    if (wpEntries.length) {
      if (wpHdEl) wpHdEl.style.display = "";
      const maxV = wpEntries[0][1];
      wpChartEl.innerHTML = wpEntries.map(([code, cnt]) => {
        const meta2 = CODE_MAP[code];
        return `<div class="dist-row"><span class="dist-code" style="background:${meta2?.bg||"#f1f5f9"};color:${meta2?.fg||"#475569"}">${code}</span><div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${Math.round((cnt/maxV)*100)}%;background:${meta2?.fg||"#94a3b8"}"></div></div><span class="dist-count">${cnt}</span><span class="dist-pct">${s.totalWP > 0 ? Math.round((cnt/s.totalWP)*100) : 0}%</span></div>`;
      }).join("");
    } else {
      if (wpHdEl) wpHdEl.style.display = "none";
      wpChartEl.innerHTML = "";
    }
  }
  const stChartEl = document.getElementById("pm-st-chart");
  const stHdEl = document.getElementById("pm-st-hd");
  if (stChartEl) {
    const stEntries = Object.entries(s.stCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (stEntries.length) {
      if (stHdEl) stHdEl.style.display = "";
      const maxSt = stEntries[0][1];
      stChartEl.innerHTML = stEntries.map(([code, cnt]) => {
        const meta2 = CODE_MAP[code];
        return `<div class="dist-row"><span class="dist-code" style="background:${meta2?.bg||"#f1f5f9"};color:${meta2?.fg||"#475569"}">${code}</span><div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${Math.round((cnt/maxSt)*100)}%;background:${meta2?.fg||"#94a3b8"}"></div></div><span class="dist-count">${cnt}</span><span class="dist-pct"></span></div>`;
      }).join("");
    } else {
      if (stHdEl) stHdEl.style.display = "none";
      stChartEl.innerHTML = "";
    }
  }
  const dutyDetailEl = document.getElementById("pm-duty-detail");
  const dutyHdEl = document.getElementById("pm-duty-hd");
  if (dutyDetailEl) {
    if (s.dutyD.length || s.dutyHG.length) {
      if (dutyHdEl) dutyHdEl.style.display = "";
      let dHtml = "";
      if (s.dutyD.length) {
        const dayBadges = s.dutyD.map(d => {
          const wd = weekday(y, m, d);
          const hol = isHoliday(y, m, d, hols);
          const cls = (wd === 5 || wd === 6 || wd === 0 || hol) ? " style=\"background:#FEF3C7;color:#78350F;border-color:#FDE68A\"" : "";
          return `<span class="duty-day-badge"${cls}>${DOW_ABBR[wd]} ${d}.</span>`;
        }).join("");
        dHtml += `<div class="duty-detail-group"><span class="duty-group-lbl badge-D">D</span><div><div class="duty-group-label">Bereitschaftsdienst</div><div class="duty-group-days">${dayBadges}</div></div></div>`;
      }
      if (s.dutyHG.length) {
        const dayBadges = s.dutyHG.map(d => {
          const wd = weekday(y, m, d);
          const hol = isHoliday(y, m, d, hols);
          const cls = (wd === 5 || wd === 6 || wd === 0 || hol) ? " style=\"background:#E0F2FE;color:#0369A1;border-color:#7DD3FC\"" : "";
          return `<span class="duty-day-badge"${cls}>${DOW_ABBR[wd]} ${d}.</span>`;
        }).join("");
        dHtml += `<div class="duty-detail-group"><span class="duty-group-lbl badge-HG">HG</span><div><div class="duty-group-label">Hintergrunddienst</div><div class="duty-group-days">${dayBadges}</div></div></div>`;
      }
      dutyDetailEl.innerHTML = dHtml;
    } else {
      if (dutyHdEl) dutyHdEl.style.display = "none";
      dutyDetailEl.innerHTML = "";
    }
  }
  const calEl = document.getElementById("pm-cal");
  if (calEl) {
    const dim = daysInMonth(y, m);
    const firstWd = weekday(y, m, 1);
    let calHtml = `<div class="mcd-grid">`;
    DOW_ABBR.forEach((d, i) => calHtml += `<div class="mcd-dow${(i === 0 || i === 6) ? " is-we" : ""}">${d}</div>`);
    const offset = firstWd;
    for (let i = 0; i < offset; i++) calHtml += `<div class="mcd-ph"></div>`;
    for (let d = 1; d <= dim; d++) {
      const wd = weekday(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const cell = getCell(y, m, empName, d);
      const isToday = isTodayCol(y, m, d);
      let cls = "mcd";
      if (hol) cls += " mcd-hol";
      else if (wd === 0 || wd === 6) cls += " mcd-we";
      else if (!cell.assignment && !cell.duty) cls += " mcd-empty";
      if (isToday) cls += " mcd-today";
      const assign = cell.assignment || "";
      const duty = cell.duty || "";
      const { bg: cbg, fg: cfg } = cellColor(assign);
      const bgStyle = assign ? `background:${cbg}` : "";
      const interactive = (!hol && wd !== 0 && wd !== 6) ? ` role="button" tabindex="0"` : "";
      calHtml += `<div class="${cls}" style="${bgStyle}"${interactive} data-day="${d}"><span class="mcd-num">${d}</span><span class="mcd-assign" style="color:${cfg}">${assign}</span>${duty ? `<span class="mcd-duty badge-${duty}">${duty}</span>` : ""}</div>`;
    }
    calHtml += `</div>`;
    calEl.innerHTML = calHtml;
    calEl.querySelectorAll(".mcd[data-day]").forEach(el => {
      const wd = weekday(y, m, parseInt(el.dataset.day));
      const hol = isHoliday(y, m, parseInt(el.dataset.day), hols);
      if (!hol && wd !== 0 && wd !== 6) {
        el.addEventListener("click", () => {
          hideOverlay("modal-profile");
          setTimeout(() => openEditor(empName, parseInt(el.dataset.day)), 180);
        });
      }
    });
  }
  const yrEl = document.getElementById("pm-yearly");
  if (yrEl) {
    const kpiVals = [
      { lbl: "AP", val: ys.totals.totalWP, color: "#1D4ED8" },
      { lbl: "Urlaub", val: ys.totals.vacationDays, color: "#7C3AED" },
      { lbl: "Krank", val: ys.totals.sickDays, color: "#DC2626" },
      { lbl: "FZA", val: ys.totals.fzaDays, color: "#3730A3" },
      { lbl: "D", val: ys.totals.dutyD, color: "#EF4444" },
      { lbl: "HG", val: ys.totals.dutyHG, color: "#0EA5E9" },
    ];
    let yrHtml = `<div class="yr-kpi-strip">${kpiVals.map((k, i) => `${i > 0 ? '<div class="yr-kpi-div"></div>' : ""}<div class="yr-kpi-item"><div class="yr-kpi-val" style="color:${k.color}">${k.val}</div><div class="yr-kpi-lbl">${k.lbl}</div></div>`).join("")}</div>`;
    yrHtml += `<div class="yr-table-wrap"><table class="yr-table"><thead><tr><th class="yr-th yr-th-month">Monat</th><th class="yr-th">AP</th><th class="yr-th yr-th-vac">U</th><th class="yr-th yr-th-sick">K</th><th class="yr-th">FZA</th><th class="yr-th">WB</th><th class="yr-th yr-th-d">D</th><th class="yr-th yr-th-hg">HG</th></tr></thead><tbody>`;
    ys.months.forEach(mon => {
      const isCur = mon.m === m;
      const vac = VACATION_CODES.reduce((s2, c) => s2 + (mon.stCounts[c] || 0), 0);
      const sick = (mon.stCounts["K"] || 0) + (mon.stCounts["KK"] || 0);
      const fza2 = mon.stCounts["FZA"] || 0;
      const wb = mon.stCounts["WB"] || 0;
      const rc = mon.hasData ? "" : " yr-row-empty";
      yrHtml += `<tr class="yr-row${isCur ? " yr-row-current" : ""}${rc}"><td class="yr-td-month">${MONTHS_SHORT[mon.m]}</td><td class="yr-td yr-td-num">${mon.hasData && mon.totalWorkdays > 0 ? (Object.values(mon.wpCounts).reduce((a, b) => a + b, 0) || "—") : "—"}</td><td class="yr-td yr-td-num yr-vac">${mon.hasData && vac ? vac : "—"}</td><td class="yr-td yr-td-num yr-sick">${mon.hasData && sick ? sick : "—"}</td><td class="yr-td yr-td-num">${mon.hasData && fza2 ? fza2 : "—"}</td><td class="yr-td yr-td-num">${mon.hasData && wb ? wb : "—"}</td><td class="yr-td yr-td-num yr-duty-d">${mon.hasData && mon.dutyD ? mon.dutyD : "—"}</td><td class="yr-td yr-td-num yr-duty-hg">${mon.hasData && mon.dutyHG ? mon.dutyHG : "—"}</td></tr>`;
    });
    yrHtml += `<tr class="yr-total-row"><td class="yr-total-lbl">Gesamt</td><td class="yr-td yr-td-num yr-total">${ys.totals.totalWP || "—"}</td><td class="yr-td yr-td-num yr-vac yr-total">${ys.totals.vacationDays || "—"}</td><td class="yr-td yr-td-num yr-sick yr-total">${ys.totals.sickDays || "—"}</td><td class="yr-td yr-td-num yr-total">${ys.totals.fzaDays || "—"}</td><td class="yr-td yr-td-num yr-total">${ys.totals.wbDays || "—"}</td><td class="yr-td yr-td-num yr-duty-d yr-total">${ys.totals.dutyD || "—"}</td><td class="yr-td yr-td-num yr-duty-hg yr-total">${ys.totals.dutyHG || "—"}</td></tr>`;
    yrHtml += `</tbody></table></div>`;
    yrEl.innerHTML = yrHtml;
  }
  showOverlay("modal-profile");
}

function renderMobileView() {
  const { year: y, month: m } = state;
  document.body.classList.add("is-mobile");
  renderMobileSummary(y, m);
  renderMobileDayList(y, m);
}

function renderMobileSummary(y, m) {
  const summaryEl = document.getElementById("mobile-month-summary");
  if (!summaryEl) return;
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  const totals = {};
  [...WORKPLACES.map(w => w.code), ...STATUSES.map(s => s.code), "D", "HG"].forEach(c => { totals[c] = 0; });
  for (let d = 1; d <= dim; d++) {
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) cell.assignment.split("/").map(x => x.trim()).forEach(c => { if (c in totals) totals[c]++; });
      if (cell.duty && cell.duty in totals) totals[cell.duty]++;
    });
  }
  const order = ["D", "HG", "U", "K", "F", "MR", "CT", "US", "WB", "FZA", "ZU", "SU", "KK", "§15c", "AN", "MA", "KUS", "W", "T"];
  let html = `<div class="mms-item mms-item-emp"><span class="mms-val">${md.employees.length}</span><span class="mms-code">MA</span></div>`;
  order.forEach(code => {
    const v = totals[code];
    if (!v) return;
    const meta = CODE_MAP[code];
    const isD = code === "D", isHG = code === "HG";
    const bg = isD ? "#EF4444" : isHG ? "#0EA5E9" : meta?.bg || "#E2E8F0";
    const fg = isD || isHG ? "#fff" : meta?.fg || "#374151";
    html += `<div class="mms-item"><span class="mms-code" style="background:${bg};color:${fg};padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;font-family:var(--font-mono)">${code}</span><span class="mms-val">${v}</span></div>`;
  });
  summaryEl.innerHTML = html;
}

function renderMobileDayList(y, m) {
  const listEl = document.getElementById("mobile-day-list");
  if (!listEl) return;
  const hols = getSaxonyHolidays(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  listEl.innerHTML = "";
  let prevKW = -1;
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const holName = hols[dateKey(y, m, d)] || "";
    const isToday = isTodayCol(y, m, d);
    const kw = isoWeekNumber(y, m, d);
    if (wd === 1 && kw !== prevKW) {
      prevKW = kw;
      const sep = document.createElement("div");
      sep.className = "mobile-week-sep";
      sep.textContent = `KW ${kw}`;
      listEl.appendChild(sep);
    }
    const bdHolder = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "D") || null;
    const hgHolder = md.employees.find(e => md.assignments?.[e]?.[d]?.duty === "HG") || null;
    const allAssigns = [];
    md.employees.forEach(emp => {
      const cell = md.assignments?.[emp]?.[d] || {};
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).filter(Boolean).forEach(code => {
          if (!allAssigns.find(a => a.code === code)) {
            const meta = CODE_MAP[code];
            if (meta) allAssigns.push({ code, bg: meta.bg, fg: meta.fg });
          }
        });
      }
    });
    const card = document.createElement("div");
    let cardCls = "mobile-day-card";
    if (hol) cardCls += " mdc-hol";
    else if (wd === 0 || wd === 6) cardCls += " mdc-we";
    if (isToday) cardCls += " mdc-today";
    card.className = cardCls;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    const kwLabel = wd === 1 ? "" : "";
    let dutyHtml = "";
    if (bdHolder) {
      const shortName = bdHolder.split(" ").pop();
      dutyHtml += `<span class="mdc-duty-badge mdc-d"><span class="mdc-duty-letter">D</span><span class="mdc-duty-name">${shortName}</span></span>`;
    }
    if (hgHolder) {
      const shortName = hgHolder.split(" ").pop();
      dutyHtml += `<span class="mdc-duty-badge mdc-hg"><span class="mdc-duty-letter">H</span><span class="mdc-duty-name">${shortName}</span></span>`;
    }
    if (!bdHolder && !hgHolder) dutyHtml = `<span class="mdc-empty-duty">kein Dienst</span>`;
    let assignHtml = "";
    const shown = allAssigns.slice(0, 5);
    shown.forEach(a => {
      assignHtml += `<span class="mdc-assign-chip" style="background:${a.bg};color:${a.fg}">${a.code}</span>`;
    });
    if (allAssigns.length > 5) assignHtml += `<span class="mdc-assign-more">+${allAssigns.length - 5}</span>`;
    const planWishIndicator = planMode ? `<span class="mdc-plan-badge"></span>` : "";
    card.innerHTML = `
      <div class="mdc-date">
        <span class="mdc-day-num">${d}</span>
        <span class="mdc-day-dow">${DOW_ABBR[wd]}</span>
        ${d === 1 || wd === 1 ? `<span class="mdc-day-kw">KW${kw}</span>` : ""}
      </div>
      <div class="mdc-divider"></div>
      <div class="mdc-content">
        ${hol ? `<div class="mdc-hol-label">${holName}</div>` : ""}
        <div class="mdc-duties">${dutyHtml}</div>
        ${allAssigns.length ? `<div class="mdc-assigns">${assignHtml}</div>` : ""}
      </div>
      <div class="mdc-arrow"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      ${planWishIndicator}
    `;
    card.addEventListener("click", () => openMobileDay(d));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMobileDay(d); } });
    listEl.appendChild(card);
    if (isToday) setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }
}

function openMobileDay(day) {
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidays(y);
  const md = getMonthData(y, m);
  const wd = weekday(y, m, day);
  const hol = isHoliday(y, m, day, hols);
  const holName = hols[dateKey(y, m, day)] || "";
  const isToday = isTodayCol(y, m, day);
  const titleEl = document.getElementById("mday-title");
  if (titleEl) {
    titleEl.textContent = `${DOW_LONG[wd]}, ${day}. ${MONTHS[m]} ${y}${holName ? " · " + holName : ""}`;
    if (isToday) titleEl.style.color = "#67D4FF";
    else if (hol) titleEl.style.color = "#FCD34D";
    else titleEl.style.color = "";
  }
  const dutyBadgesEl = document.getElementById("mday-duty-badges");
  if (dutyBadgesEl) {
    let html = "";
    const bdH = md.employees.find(e => md.assignments?.[e]?.[day]?.duty === "D");
    const hgH = md.employees.find(e => md.assignments?.[e]?.[day]?.duty === "HG");
    if (bdH) html += `<span class="mday-duty-pill d"><span class="mday-duty-pill-letter">D</span>${bdH}</span>`;
    if (hgH) html += `<span class="mday-duty-pill hg"><span class="mday-duty-pill-letter">H</span>${hgH}</span>`;
    dutyBadgesEl.innerHTML = html;
  }
  const bodyEl = document.getElementById("mday-body");
  if (!bodyEl) { showOverlay("modal-mobile-day"); return; }
  const faList = md.employees.filter(e => isFacharzt(e));
  const aaList = md.employees.filter(e => isAssistenzarzt(e));
  const sections = [
    { label: "Fachärzte", emps: faList },
    { label: "Assistenzärzte", emps: aaList },
  ].filter(s => s.emps.length > 0);
  let bodyHtml = "";
  sections.forEach(sec => {
    bodyHtml += `<div class="mday-section-hd">${sec.label}</div>`;
    sec.emps.forEach(emp => {
      const cell = md.assignments?.[emp]?.[day] || {};
      const meta = getEmpMeta(emp);
      const pc = posColor(meta.position);
      const isEditable = planMode || !hol;
      let badgesHtml = "";
      if (cell.assignment) {
        cell.assignment.split("/").map(x => x.trim()).filter(Boolean).forEach(code => {
          const cm = CODE_MAP[code];
          if (cm) badgesHtml += `<span class="mday-assign-badge" style="background:${cm.bg};color:${cm.fg}">${code}</span>`;
        });
      }
      if (cell.duty) badgesHtml += `<span class="mday-duty-tag ${cell.duty.toLowerCase()}">${cell.duty}</span>`;
      if (planMode && getWish(emp, day)) {
        const w = getWish(emp, day);
        const wMap = { BD_WISH: "bd", HG_WISH: "hg", NO_DUTY: "no" };
        const wLabel = { BD_WISH: "D-Wunsch", HG_WISH: "HG-Wunsch", NO_DUTY: "Kein D" };
        badgesHtml += `<span class="mday-wish-tag ${wMap[w] || ""}">${wLabel[w] || w}</span>`;
      }
      if (!cell.assignment && !cell.duty) badgesHtml = `<span class="mday-empty-assign">—</span>`;
      bodyHtml += `<div class="mday-emp-row${isEditable ? " mday-editable" : ""}" data-emp="${emp}">
        <span class="mday-pos-dot" style="background:${pc.border}"></span>
        <div class="mday-emp-info">
          <span class="mday-emp-name">${emp}</span>
          <span class="mday-emp-sub">${meta.posLabel !== "—" ? meta.posLabel : meta.position}</span>
        </div>
        <div class="mday-badges">${badgesHtml}</div>
        ${isEditable ? `<span class="mday-edit-icon"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>` : ""}
      </div>`;
    });
  });
  bodyEl.innerHTML = bodyHtml;
  bodyEl.querySelectorAll(".mday-editable[data-emp]").forEach(row => {
    row.addEventListener("click", () => {
      const emp = row.dataset.emp;
      hideOverlay("modal-mobile-day");
      setTimeout(() => openEditor(emp, day), 200);
    });
  });
  showOverlay("modal-mobile-day");
}

function openEditor(emp, day) {
  const { year: y, month: m } = state;
  const cell = getCell(y, m, emp, day);
  const hols = getSaxonyHolidays(y);
  state.edit = { emp, day };
  let wp = [],
    st = null;
  if (cell.assignment) {
    cell.assignment
      .split("/")
      .map((x) => x.trim())
      .forEach((p) => {
        if (WORKPLACES.find((w) => w.code === p)) wp.push(p);
        else if (STATUSES.find((s) => s.code === p)) st = p;
      });
  }
  state.ed = { wp: [...wp], st, duty: cell.duty || null };
  const wd = weekday(y, m, day);
  const hol = isHoliday(y, m, day, hols);
  const we = isWeekend(y, m, day);
  const holNm = hols[dateKey(y, m, day)] || "";
  document.getElementById("ed-title").textContent = emp;
  document.getElementById("ed-sub").textContent =
    `${DOW_LONG[wd]}, ${day}. ${MONTHS[m]} ${y}${holNm ? " · " + holNm : ""}`;
  const dtlEl = document.getElementById("ed-day-label");
  if (hol)
    dtlEl.innerHTML = `<span class="day-type-label dtl-hol">Feiertag${holNm ? ": " + holNm : ""}</span>`;
  else if (we)
    dtlEl.innerHTML = `<span class="day-type-label dtl-we">Wochenende</span>`;
  else dtlEl.innerHTML = "";
  const modalHd = document.getElementById("ed-modal-hd");
  const planBadge = document.getElementById("ed-plan-badge");
  const modalEl = document.getElementById("modal-editor");
  if (planMode) {
    modalHd?.classList.add("plan-mode-hd");
    modalEl?.classList.add("plan-mode-editor");
    if (planBadge) planBadge.style.display = "inline-flex";
  } else {
    modalHd?.classList.remove("plan-mode-hd");
    modalEl?.classList.remove("plan-mode-editor");
    if (planBadge) planBadge.style.display = "none";
  }
  refreshEditorChips();
  showOverlay("modal-editor");
}
function refreshEditorChips() {
  const { year: y, month: m } = state;
  const { wp, st, duty } = state.ed;
  const { emp, day } = state.edit;
  const wpC = document.getElementById("ed-wp");
  wpC.innerHTML = "";
  WORKPLACES.forEach((w, idx) => {
    const on = wp.includes(w.code);
    const dimC = !!st;
    const chip = document.createElement("div");
    chip.className = `chip-wp${on ? " on" : ""}${dimC ? " dim" : ""}`;
    chip.style.cssText = `background:${on ? w.fg : w.bg};color:${on ? "#fff" : w.fg};position:relative`;
    const kbdBadge = `<span style="position:absolute;top:2px;right:2px;font-family:var(--font-mono);font-size:7px;font-weight:700;line-height:1;opacity:${dimC ? 0.3 : 0.55};background:rgba(0,0,0,0.12);color:inherit;padding:1px 3px;border-radius:2px;pointer-events:none">${idx + 1}</span>`;
    chip.innerHTML = `${kbdBadge}${w.code}<span class="chip-sub">${w.label}</span>`;
    if (!dimC)
      chip.addEventListener("click", () => {
        const i = state.ed.wp.indexOf(w.code);
        if (i >= 0) state.ed.wp.splice(i, 1);
        else state.ed.wp.push(w.code);
        refreshEditorChips();
      });
    wpC.appendChild(chip);
  });
  let kbdHint = document.getElementById("ed-wp-kbd-hint");
  if (!kbdHint) {
    kbdHint = document.createElement("div");
    kbdHint.id = "ed-wp-kbd-hint";
    kbdHint.style.cssText =
      "margin-top:6px;display:flex;align-items:center;gap:5px;font-size:9.5px;color:var(--gray-400);";
    kbdHint.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;opacity:.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12"/></svg><span>Ziffern 1–8 für Arbeitsplatz · D für Bereitschaft · H für Hintergrund · S oder ↵ zum Speichern</span>`;
    wpC.parentNode.insertBefore(kbdHint, wpC.nextSibling);
  }
  kbdHint.style.display = IS_MOBILE ? "none" : "flex";
  const stC = document.getElementById("ed-st");
  stC.innerHTML = "";
  STATUSES.forEach((s) => {
    const on = st === s.code;
    const dimC = wp.length > 0 && !on;
    const chip = document.createElement("div");
    chip.className = `chip-st${on ? " on" : ""}${dimC ? " dim" : ""}`;
    chip.style.cssText = `background:${on ? s.fg : s.bg};color:${on ? "#fff" : s.fg}`;
    chip.innerHTML = `${s.code}<span class="chip-sub">${s.label}</span>`;
    if (!dimC || on)
      chip.addEventListener("click", () => {
        state.ed.st = state.ed.st === s.code ? null : s.code;
        if (state.ed.st) state.ed.wp = [];
        refreshEditorChips();
      });
    stC.appendChild(chip);
  });
  const dtC = document.getElementById("ed-duty");
  dtC.innerHTML = "";
  const warnParts = [];
  ["D", "HG"].forEach((dc) => {
    const on = duty === dc;
    const owner = dutyOwner(y, m, day, dc);
    const taken = owner && owner !== emp;
    const chip = document.createElement("div");
    chip.className = `chip-duty ${on ? "duty-" + dc + "-on" : "duty-" + dc + "-off"}${taken ? " blocked" : ""}`;
    chip.innerHTML =
      dc +
      `<span class="duty-sub">${dc === "D" ? "Bereitschaftsdienst" : "Hintergrunddienst"}</span>`;
    if (!taken)
      chip.addEventListener("click", () => {
        state.ed.duty = state.ed.duty === dc ? null : dc;
        refreshEditorChips();
      });
    else {
      warnParts.push(`${dc} bereits vergeben: ${owner}`);
    }
    dtC.appendChild(chip);
  });
  const warnEl = document.getElementById("ed-duty-warn");
  const nextDay = nextCalendarDay(y, m, day);
  if (nextDay.y !== undefined) {
    const nextCell = getCell(nextDay.y, nextDay.m, emp, nextDay.d);
    if (nextCell.assignment) {
      const codes = nextCell.assignment.split("/").map((x) => x.trim());
      if (codes.some((c) => VACATION_CODES.includes(c)))
        warnParts.push(`⚠ Folgetag (${nextDay.d}.) ist Urlaub`);
    }
  }
  if (warnParts.length) {
    warnEl.style.display = "block";
    warnEl.textContent = warnParts.join(" · ");
  } else warnEl.style.display = "none";
  const wishC = document.getElementById("ed-wish");
  if (wishC) {
    if (planMode) {
      wishC.style.display = "flex";
      const wishHd = document.getElementById("ed-wish-hd");
      if (wishHd) wishHd.style.display = "";
      wishC.innerHTML = "";
      const currentWish = getWish(emp, day);
      WISH_TYPES.forEach((wt) => {
        const on = currentWish === wt.code;
        const chip = document.createElement("div");
        chip.className = `chip-wish${on ? " wish-on" : ""}`;
        chip.style.cssText = on
          ? `background:${wt.fg};color:#fff;border-color:${wt.fg}`
          : `background:${wt.bg};color:${wt.fg};border-color:${wt.border}`;
        chip.innerHTML = `<span class="wish-icon">${wt.icon}</span>${wt.label}`;
        chip.addEventListener("click", () => {
          toggleWish(emp, day, wt.code);
          refreshEditorChips();
        });
        wishC.appendChild(chip);
      });
    } else {
      wishC.style.display = "none";
      const wishHd = document.getElementById("ed-wish-hd");
      if (wishHd) wishHd.style.display = "none";
    }
  }
  const pv = state.ed.st || (state.ed.wp.length ? state.ed.wp.join("/") : "");
  document.getElementById("ed-preview-val").textContent = pv || "—";
  const bdg = document.getElementById("ed-preview-duties");
  bdg.innerHTML = state.ed.duty
    ? `<span class="preview-duty-badge badge-${state.ed.duty}" style="background:${state.ed.duty === "D" ? "#EF4444" : "#0EA5E9"};color:#fff">${state.ed.duty}</span>`
    : "";
}
function saveEditor() {
  const { year: y, month: m } = state;
  const { emp, day } = state.edit;
  const { wp, st, duty } = state.ed;
  const assignment = st ? st : wp.length ? wp.join("/") : null;
  if (planMode) recordPlanHistory();
  setCell(y, m, emp, day, {
    assignment: assignment || null,
    duty: duty || null,
  });
  if (duty === "D") {
    const next = nextCalendarDay(y, m, day);
    const ex = getCell(next.y, next.m, emp, next.d);
    if (!ex.assignment) {
      setCell(next.y, next.m, emp, next.d, {
        assignment: "F",
        duty: ex.duty || null,
      });
      showToast("F automatisch gesetzt");
    }
  }
  if (planMode) recordPlanHistory();
  hideOverlay("modal-editor");
  render();
}
function openEmployeeModal() {
  const { year: y, month: m } = state;
  document.getElementById("emp-sub").textContent = `${MONTHS[m]} ${y}`;
  document.getElementById("emp-input").value = "";
  refreshEmployeeList();
  showOverlay("modal-emps");
  setTimeout(() => document.getElementById("emp-input").focus(), 80);
}
function refreshEmployeeList() {
  const { year: y, month: m } = state;
  const md = getMonthData(y, m);
  const el = document.getElementById("emp-list");
  el.innerHTML = "";
  if (!md.employees.length) {
    el.innerHTML = `<div class="emp-none">Keine Mitarbeitenden</div>`;
    return;
  }
  md.employees.forEach((emp) => {
    const meta = getEmpMeta(emp);
    const pc = posColor(meta.position);
    const ini = empInitials(emp);
    const row = document.createElement("div");
    row.className = "emp-row";
    row.innerHTML = `<div class="emp-row-left"><span class="emp-avatar" style="background:linear-gradient(135deg,${pc.border},${pc.fg})">${ini}</span><div class="emp-row-info"><span class="emp-row-name">${emp}</span>${meta.position !== "—" ? `<span class="emp-row-meta">${meta.posLabel}</span>` : ""}</div></div><button class="emp-row-del"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l9 9M10 1L1 10"/></svg></button>`;
    row
      .querySelector(".emp-row-del")
      .addEventListener("click", () => confirmRemoveEmployee(emp, true));
    el.appendChild(row);
  });
}
function confirmRemoveEmployee(name, refreshList = false) {
  const { year: y, month: m } = state;
  if (confirm(`„${name}" entfernen?`)) {
    removeEmployee(y, m, name);
    render();
    if (refreshList) refreshEmployeeList();
  }
}
function doExport() {
  const plans = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("radplan_v3_plan_")) {
      try {
        plans[k.replace("radplan_v3_plan_", "")] = JSON.parse(
          localStorage.getItem(k),
        );
      } catch (e) {}
    }
  }
  const exportObj = { main: DATA, plans };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `radplan_${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Daten exportiert");
}
function openImportModal() {
  document.getElementById("import-ta").value = "";
  document.getElementById("import-err").style.display = "none";
  const dz = document.getElementById("import-dropzone");
  const fn = document.getElementById("dz-filename");
  const fi = document.getElementById("import-file-input");
  if (dz) dz.classList.remove("has-file", "drag-over");
  if (fn) fn.textContent = "";
  if (fi) fi.value = "";
  showOverlay("modal-import");
}
function doImport() {
  const raw = document.getElementById("import-ta").value.trim();
  const errEl = document.getElementById("import-err");
  errEl.style.display = "none";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Ungültiges Format");
    if (parsed.main && typeof parsed.main === "object") {
      Object.assign(DATA, parsed.main);
      if (parsed.plans && typeof parsed.plans === "object") {
        for (const [pk, pv] of Object.entries(parsed.plans)) {
          localStorage.setItem(`radplan_v3_plan_${pk}`, JSON.stringify(pv));
        }
      }
    } else {
      Object.assign(DATA, parsed);
    }
    saveToStorage();
    const repaired = ensurePostBDFreiDays();
    hideOverlay("modal-import");
    render();
    showToast(
      "Daten erfolgreich importiert" +
        (repaired > 0 ? ` · ${repaired} Ruhetage ergänzt` : ""),
    );
  } catch (e) {
    errEl.style.display = "block";
    errEl.textContent = "Fehler: " + e.message;
  }
}
function initDragDrop() {
  const dz = document.getElementById("import-dropzone");
  const fi = document.getElementById("import-file-input");
  if (!dz || !fi) return;
  dz.addEventListener("click", (e) => {
    if (e.target !== fi) fi.click();
  });
  fi.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) handleDroppedFile(f);
    e.target.value = "";
  });
  dz.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dz.classList.add("drag-over");
  });
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.add("drag-over");
  });
  dz.addEventListener("dragleave", (e) => {
    if (!dz.contains(e.relatedTarget)) dz.classList.remove("drag-over");
  });
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove("drag-over");
    const f = e.dataTransfer.files[0];
    if (f) handleDroppedFile(f);
  });
}
function handleDroppedFile(file) {
  const errEl = document.getElementById("import-err");
  const dz = document.getElementById("import-dropzone");
  const fnEl = document.getElementById("dz-filename");
  errEl.style.display = "none";
  dz.classList.remove("has-file");
  if (
    !file.name.toLowerCase().endsWith(".json") &&
    file.type !== "application/json"
  ) {
    errEl.style.display = "block";
    errEl.textContent = "Fehler: Nur .json-Dateien";
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("import-ta").value = ev.target.result;
    if (fnEl) fnEl.textContent = file.name;
    dz.classList.add("has-file");
  };
  reader.onerror = () => {
    errEl.style.display = "block";
    errEl.textContent = "Fehler beim Lesen der Datei";
  };
  reader.readAsText(file, "UTF-8");
}
function openDeptOverview() {
  const modal = document.getElementById("modal-dept");
  if (!modal) return;
  deptTab = "month";
  document
    .querySelectorAll(".dept-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("dept-tab-month")?.classList.add("active");
  renderDeptContent();
  showOverlay("modal-dept");
}
function renderDeptContent() {
  const { year: y, month: m } = state;
  if (deptTab === "month") renderDeptMonth(y, m);
  else renderDeptYear(y);
}
function renderDeptMonth(y, m) {
  const body = document.getElementById("dept-body");
  if (!body) return;
  const hols = getSaxonyHolidays(y);
  const md = getMonthData(y, m);
  const dim = daysInMonth(y, m);
  const deptHeadLine = document.getElementById("dept-context-line");
  if (deptHeadLine) deptHeadLine.textContent = `${MONTHS[m]} ${y}`;
  if (!md.employees.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten</p></div>`;
    return;
  }
  let workdayCount = 0,
    mrCov = 0,
    ctCov = 0,
    dCov = 0,
    hgCov = 0;
  for (let d = 1; d <= dim; d++) {
    if (!isWorkday(y, m, d, hols)) continue;
    workdayCount++;
    let hasMR = false,
      hasCT = false,
      hasD = false,
      hasHG = false;
    md.employees.forEach((emp) => {
      const cell = md.assignments?.[emp]?.[d] || {};
      const assign = (cell.assignment || "").split("/").map((x) => x.trim());
      if (assign.includes("MR")) hasMR = true;
      if (assign.includes("CT")) hasCT = true;
      if (cell.duty === "D") hasD = true;
      if (cell.duty === "HG") hasHG = true;
    });
    if (hasMR) mrCov++;
    if (hasCT) ctCov++;
    if (hasD) dCov++;
    if (hasHG) hgCov++;
  }
  const pct = (v) =>
    workdayCount > 0 ? Math.round((v / workdayCount) * 100) : 0;
  const covItems = [
    {
      label: "MR",
      val: mrCov,
      pct: pct(mrCov),
      color: "#1D4ED8",
      bg: "#DBEAFE",
    },
    {
      label: "CT",
      val: ctCov,
      pct: pct(ctCov),
      color: "#C2410C",
      bg: "#FFEDD5",
    },
    { label: "D", val: dCov, pct: pct(dCov), color: "#EF4444", bg: "#FEE2E2" },
    {
      label: "HG",
      val: hgCov,
      pct: pct(hgCov),
      color: "#0EA5E9",
      bg: "#E0F2FE",
    },
  ];
  const stripHtml = `<div class="dept-cov-strip"><div class="dept-cov-meta"><span class="dept-cov-meta-val">${workdayCount}</span><span class="dept-cov-meta-lbl">Werktage</span></div><div class="dept-cov-meta"><span class="dept-cov-meta-val">${md.employees.length}</span><span class="dept-cov-meta-lbl">Mitarbeitende</span></div><div class="dept-cov-bars">${covItems.map((item) => `<div class="dept-cov-bar-item"><div class="dept-cov-bar-head"><span class="dept-cov-code" style="background:${item.bg};color:${item.color}">${item.label}</span><span class="dept-cov-fraction">${item.val}/${workdayCount}</span><span class="dept-cov-pct" style="color:${item.pct >= 80 ? item.color : "#94A3B8"}">${item.pct}%</span></div><div class="dept-cov-bar-bg"><div class="dept-cov-bar-fill" style="width:${item.pct}%;background:${item.color}"></div></div></div>`).join("")}</div></div>`;
  const empStats = md.employees.map((emp) => {
    const s = buildProfileStats(y, m, emp);
    const meta = getEmpMeta(emp);
    const pc = posColor(meta.position);
    const vac = VACATION_CODES.reduce(
      (sum, c) => sum + (s.stCounts[c] || 0),
      0,
    );
    const sick = (s.stCounts["K"] || 0) + (s.stCounts["KK"] || 0);
    const fza = s.stCounts["FZA"] || 0;
    const frei = s.stCounts["F"] || 0;
    return { emp, s, meta, pc, vac, sick, fza, frei };
  });
  const team = empStats.reduce(
    (acc, { s, vac, sick, fza, frei }) => {
      acc.wp += s.totalWP;
      acc.vac += vac;
      acc.sick += sick;
      acc.fza += fza;
      acc.d += s.dutyD.length;
      acc.hg += s.dutyHG.length;
      acc.frei += frei;
      acc.offen += s.uncovered;
      return acc;
    },
    { wp: 0, vac: 0, sick: 0, fza: 0, d: 0, hg: 0, frei: 0, offen: 0 },
  );
  const rowsHtml = empStats
    .map(
      ({ emp, s, meta, pc, vac, sick, fza, frei }) =>
        `<tr class="dept-tr"><td class="dept-td-name" style="border-left:3px solid ${pc.border}"><span class="dept-emp-name">${emp}</span>${meta.position !== "—" ? `<span class="dept-pos-badge" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>` : ""}</td><td class="dept-td dept-td-num">${s.totalWP || "—"}</td><td class="dept-td dept-td-num">${s.wpCounts["MR"] || ""}</td><td class="dept-td dept-td-num">${s.wpCounts["CT"] || ""}</td><td class="dept-td dept-td-num dept-vac">${vac || ""}</td><td class="dept-td dept-td-num dept-sick">${sick || ""}</td><td class="dept-td dept-td-num">${fza || ""}</td><td class="dept-td dept-td-num dept-duty-d">${s.dutyD.length || ""}</td><td class="dept-td dept-td-num dept-duty-hg">${s.dutyHG.length || ""}</td><td class="dept-td dept-td-num dept-frei">${frei || ""}</td><td class="dept-td dept-td-num ${s.uncovered > 0 ? "dept-offen" : ""}">${s.uncovered || ""}</td></tr>`,
    )
    .join("");
  const tableHtml = `<div class="dept-table-wrap"><table class="dept-table"><thead><tr><th class="dept-th-name">Mitarbeitende</th><th class="dept-th">AP</th><th class="dept-th">MR</th><th class="dept-th">CT</th><th class="dept-th dept-th-vac">Urlaub</th><th class="dept-th dept-th-sick">Krank</th><th class="dept-th">FZA</th><th class="dept-th dept-th-d">D</th><th class="dept-th dept-th-hg">HG</th><th class="dept-th">Frei</th><th class="dept-th dept-th-offen">Offen</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr class="dept-total-row"><td class="dept-td-name dept-total-lbl">Gesamt&ensp;(${md.employees.length}&thinsp;MA)</td><td class="dept-td dept-td-num dept-total">${team.wp || "—"}</td><td class="dept-td dept-td-num dept-total" colspan="2"></td><td class="dept-td dept-td-num dept-total dept-vac">${team.vac || "—"}</td><td class="dept-td dept-td-num dept-total dept-sick">${team.sick || "—"}</td><td class="dept-td dept-td-num dept-total">${team.fza || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-d">${team.d || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-hg">${team.hg || "—"}</td><td class="dept-td dept-td-num dept-total dept-frei">${team.frei || "—"}</td><td class="dept-td dept-td-num dept-total ${team.offen > 0 ? "dept-offen" : ""}">${team.offen || "—"}</td></tr></tfoot></table></div>`;
  body.innerHTML = stripHtml + tableHtml;
}
function renderDeptYear(year) {
  const body = document.getElementById("dept-body");
  if (!body) return;
  const deptHeadLine = document.getElementById("dept-context-line");
  if (deptHeadLine) deptHeadLine.textContent = `Jahresübersicht ${year}`;
  const allEmps = [
    ...new Set(
      Object.entries(DATA)
        .filter(([k]) => k.startsWith(`${year}-`))
        .flatMap(([, md]) => md?.employees || []),
    ),
  ];
  if (!allEmps.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten für ${year}</p></div>`;
    return;
  }
  const empYS = allEmps
    .map((emp) => ({
      emp,
      ys: buildYearlyStats(emp, year),
      meta: getEmpMeta(emp),
    }))
    .filter(
      ({ ys }) =>
        ys.totals.totalWorkdays > 0 ||
        ys.totals.dutyD > 0 ||
        ys.totals.dutyHG > 0,
    );
  if (!empYS.length) {
    body.innerHTML = `<div class="dept-empty"><p>Keine Daten</p></div>`;
    return;
  }
  const team = empYS.reduce(
    (acc, { ys }) => {
      acc.wd += ys.totals.totalWorkdays;
      acc.cov += ys.totals.coveredWorkdays;
      acc.wp += ys.totals.totalWP;
      acc.vac += ys.totals.vacationDays;
      acc.sick += ys.totals.sickDays;
      acc.fza += ys.totals.fzaDays;
      acc.wb += ys.totals.wbDays;
      acc.d += ys.totals.dutyD;
      acc.hg += ys.totals.dutyHG;
      return acc;
    },
    { wd: 0, cov: 0, wp: 0, vac: 0, sick: 0, fza: 0, wb: 0, d: 0, hg: 0 },
  );
  const teamCovPct = team.wd > 0 ? Math.round((team.cov / team.wd) * 100) : 0;
  const stripHtml = `<div class="dept-yr-strip"><div class="dept-yr-kpi"><span class="dept-yr-kpi-val">${empYS.length}</span><span class="dept-yr-kpi-lbl">Mitarbeitende</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#1D4ED8">${team.wp}</span><span class="dept-yr-kpi-lbl">AP-Tage</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#5B21B6">${team.vac}</span><span class="dept-yr-kpi-lbl">Urlaub</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:#991B1B">${team.sick}</span><span class="dept-yr-kpi-lbl">Krank</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val"><span style="color:#EF4444">${team.d}</span>&thinsp;/&thinsp;<span style="color:#0EA5E9">${team.hg}</span></span><span class="dept-yr-kpi-lbl">D/HG</span></div><div class="dept-yr-kpi"><span class="dept-yr-kpi-val" style="color:${teamCovPct >= 80 ? "#15803D" : teamCovPct >= 60 ? "#854D0E" : "#991B1B"}">${teamCovPct}%</span><span class="dept-yr-kpi-lbl">Abdeckung</span></div></div>`;
  const rowsHtml = empYS
    .map(({ emp, ys, meta }) => {
      const t = ys.totals;
      const pc = posColor(meta.position);
      const cov =
        t.totalWorkdays > 0
          ? Math.round((t.coveredWorkdays / t.totalWorkdays) * 100)
          : 0;
      const covCls =
        cov >= 80
          ? "dept-cov-good"
          : cov >= 60
            ? "dept-cov-mid"
            : cov > 0
              ? "dept-cov-low"
              : "";
      return `<tr class="dept-tr"><td class="dept-td-name" style="border-left:3px solid ${pc.border}"><span class="dept-emp-name">${emp}</span>${meta.position !== "—" ? `<span class="dept-pos-badge" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span>` : ""}</td><td class="dept-td dept-td-num">${t.totalWP || "—"}</td><td class="dept-td dept-td-num dept-vac">${t.vacationDays || "—"}</td><td class="dept-td dept-td-num dept-sick">${t.sickDays || "—"}</td><td class="dept-td dept-td-num">${t.fzaDays || "—"}</td><td class="dept-td dept-td-num">${t.wbDays || "—"}</td><td class="dept-td dept-td-num dept-duty-d">${t.dutyD || "—"}</td><td class="dept-td dept-td-num dept-duty-hg">${t.dutyHG || "—"}</td><td class="dept-td dept-td-num ${covCls}">${t.totalWorkdays > 0 ? cov + "%" : "—"}</td></tr>`;
    })
    .join("");
  const tableHtml = `<div class="dept-table-wrap"><table class="dept-table"><thead><tr><th class="dept-th-name">Mitarbeitende</th><th class="dept-th">AP-Tage</th><th class="dept-th dept-th-vac">Urlaub</th><th class="dept-th dept-th-sick">Krank</th><th class="dept-th">FZA</th><th class="dept-th">WB</th><th class="dept-th dept-th-d">D</th><th class="dept-th dept-th-hg">HG</th><th class="dept-th">Abdeckung</th></tr></thead><tbody>${rowsHtml}</tbody><tfoot><tr class="dept-total-row"><td class="dept-td-name dept-total-lbl">Gesamt&ensp;(${empYS.length}&thinsp;MA)</td><td class="dept-td dept-td-num dept-total">${team.wp || "—"}</td><td class="dept-td dept-td-num dept-total dept-vac">${team.vac || "—"}</td><td class="dept-td dept-td-num dept-total dept-sick">${team.sick || "—"}</td><td class="dept-td dept-td-num dept-total">${team.fza || "—"}</td><td class="dept-td dept-td-num dept-total">${team.wb || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-d">${team.d || "—"}</td><td class="dept-td dept-td-num dept-total dept-duty-hg">${team.hg || "—"}</td><td class="dept-td dept-td-num dept-total ${teamCovPct >= 80 ? "dept-cov-good" : teamCovPct >= 60 ? "dept-cov-mid" : "dept-cov-low"}">${teamCovPct}%</td></tr></tfoot></table></div>`;
  body.innerHTML = stripHtml + tableHtml;
}
function scrollToToday() {
  if (state.year !== TOD_Y || state.month !== TOD_M) {
    state.year = TOD_Y;
    state.month = TOD_M;
    render();
  }
  if (IS_MOBILE) {
    setTimeout(() => {
      const card = document.querySelector(".mobile-day-card.mdc-today");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return;
  }
  setTimeout(() => {
    const todayTh = document.querySelector(".th-day.today");
    if (todayTh)
      todayTh.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }, 80);
}
function showOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.removeAttribute("hidden");
  el.style.display = "flex";
  el.querySelector(".modal")?.classList.remove("modal-closing");
  const first = el.querySelector(
    '[autofocus],[tabindex="0"],button:not([disabled]),input,textarea',
  );
  if (first) setTimeout(() => first.focus(), 60);
}
function hideOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const mEl = el.querySelector(".modal");
  if (mEl) {
    mEl.classList.add("modal-closing");
    setTimeout(() => {
      el.setAttribute("hidden", "");
      el.style.display = "none";
      mEl.classList.remove("modal-closing");
    }, 160);
  } else {
    el.setAttribute("hidden", "");
    el.style.display = "none";
  }
}
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("visible");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("visible")),
  );
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3400);
}
function wireEvents() {
  document.getElementById("btn-prev").addEventListener("click", () => {
    if (state.month === 0) {
      state.month = 11;
      state.year--;
    } else state.month--;
    render();
  });
  document.getElementById("btn-next").addEventListener("click", () => {
    if (state.month === 11) {
      state.month = 0;
      state.year++;
    } else state.month++;
    render();
  });
  document
    .getElementById("btn-today")
    ?.addEventListener("click", scrollToToday);
  document
    .getElementById("btn-employees")
    .addEventListener("click", openEmployeeModal);
  document
    .getElementById("btn-dept")
    ?.addEventListener("click", openDeptOverview);
  document.getElementById("btn-export").addEventListener("click", doExport);
  document
    .getElementById("btn-import")
    .addEventListener("click", openImportModal);
  document.getElementById("btn-plan")?.addEventListener("click", () => {
    if (planMode) {
      closePlanMode();
    } else {
      enterPlanMode();
    }
  });

  document.getElementById("mnav-dept")?.addEventListener("click", openDeptOverview);
  document.getElementById("mnav-plan")?.addEventListener("click", () => {
    if (planMode) closePlanMode(); else enterPlanMode();
  });
  document.getElementById("mnav-menu")?.addEventListener("click", () => showOverlay("modal-mobile-menu"));

  document.getElementById("mbtn-employees")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(openEmployeeModal, 180);
  });
  document.getElementById("mbtn-today")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(scrollToToday, 180);
  });
  document.getElementById("mbtn-export")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(doExport, 180);
  });
  document.getElementById("mbtn-import")?.addEventListener("click", () => {
    hideOverlay("modal-mobile-menu");
    setTimeout(openImportModal, 180);
  });

  document.getElementById("btn-plan-apply")?.addEventListener("click", () => {
    if (!confirm("Planungsentwurf in den Hauptplan übernehmen?")) return;
    applyPlanToMain();
  });
  document
    .getElementById("btn-plan-save")
    ?.addEventListener("click", savePlanDraft);
  document
    .getElementById("btn-plan-abort")
    ?.addEventListener("click", abortPlanChanges);
  document
    .getElementById("btn-plan-close")
    ?.addEventListener("click", closePlanMode);
  document.getElementById("btn-plan-undo")?.addEventListener("click", undoPlan);
  document.getElementById("btn-plan-redo")?.addEventListener("click", redoPlan);
  document
    .getElementById("btn-plan-auto")
    ?.addEventListener("click", openAutoPlanModal);
  document.getElementById("ap-apply")?.addEventListener("click", applyAutoPlan);
  document.getElementById("ed-save").addEventListener("click", saveEditor);
  document
    .getElementById("ed-cancel")
    .addEventListener("click", () => hideOverlay("modal-editor"));
  document.getElementById("ed-clear").addEventListener("click", () => {
    if (planMode) recordPlanHistory();
    clearCell(state.year, state.month, state.edit.emp, state.edit.day);
    if (planMode) recordPlanHistory();
    hideOverlay("modal-editor");
    render();
  });
  document.getElementById("emp-add-btn").addEventListener("click", () => {
    const name = document.getElementById("emp-input").value.trim();
    if (!name) return;
    addEmployee(state.year, state.month, name);
    document.getElementById("emp-input").value = "";
    refreshEmployeeList();
    render();
    document.getElementById("emp-input").focus();
  });
  document.getElementById("emp-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("emp-add-btn").click();
  });
  document.getElementById("import-confirm").addEventListener("click", doImport);
  document.getElementById("dept-tab-month")?.addEventListener("click", () => {
    deptTab = "month";
    document
      .querySelectorAll(".dept-tab")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById("dept-tab-month")?.classList.add("active");
    renderDeptContent();
  });
  document.getElementById("dept-tab-year")?.addEventListener("click", () => {
    deptTab = "year";
    document
      .querySelectorAll(".dept-tab")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById("dept-tab-year")?.classList.add("active");
    renderDeptContent();
  });
  document
    .querySelectorAll("[data-close]")
    .forEach((btn) =>
      btn.addEventListener("click", () => hideOverlay(btn.dataset.close)),
    );
  document.querySelectorAll(".overlay").forEach((ov) =>
    ov.addEventListener("click", (e) => {
      if (e.target === ov) hideOverlay(ov.id);
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [
        "modal-editor",
        "modal-emps",
        "modal-import",
        "modal-profile",
        "modal-dept",
        "modal-autoplan",
        "modal-ap-report",
        "modal-mobile-menu",
        "modal-mobile-day"
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.hasAttribute("hidden")) hideOverlay(id);
      });
      return;
    }
    if (isEditorOpen()) {
      const noMod = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
      if (noMod && e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        if (!state.ed.st) {
          e.preventDefault();
          const code = WORKPLACES[idx].code;
          const i = state.ed.wp.indexOf(code);
          if (i >= 0) state.ed.wp.splice(i, 1);
          else state.ed.wp.push(code);
          refreshEditorChips();
        }
        return;
      }
      if (noMod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const owner = dutyOwner(state.year, state.month, state.edit.day, "D");
        if (!owner || owner === state.edit.emp) {
          state.ed.duty = state.ed.duty === "D" ? null : "D";
          refreshEditorChips();
        }
        return;
      }
      if (noMod && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        const owner = dutyOwner(state.year, state.month, state.edit.day, "HG");
        if (!owner || owner === state.edit.emp) {
          state.ed.duty = state.ed.duty === "HG" ? null : "HG";
          refreshEditorChips();
        }
        return;
      }
      if (noMod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveEditor();
        return;
      }
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const tag = (document.activeElement?.tagName || "").toUpperCase();
        const isCancel = ["ed-cancel", "ed-clear"].includes(
          document.activeElement?.id || "",
        );
        if (
          tag !== "BUTTON" ||
          (!isCancel && document.activeElement?.id === "ed-save")
        ) {
          if (tag !== "BUTTON") {
            e.preventDefault();
            saveEditor();
          }
        }
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "s") {
      e.preventDefault();
      if (planMode) savePlanDraft();
      else doExport();
      return;
    }
    if (planMode) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undoPlan();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && e.key === "z") || e.key === "y")
      ) {
        e.preventDefault();
        redoPlan();
        return;
      }
    }
    if (e.altKey && e.key === "ArrowLeft") {
      if (!planMode) document.getElementById("btn-prev").click();
    }
    if (e.altKey && e.key === "ArrowRight") {
      if (!planMode) document.getElementById("btn-next").click();
    }
  });
  const gridWrapper = document.getElementById("grid-wrapper");
  if (gridWrapper) {
    gridWrapper.addEventListener(
      "wheel",
      (e) => {
        if (e.deltaY !== 0 && Math.abs(e.deltaX) < 10) {
          e.preventDefault();
          gridWrapper.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );
  }
  initDragDrop();
  const apReportBtn = document.getElementById("ap-report-btn");
  if (apReportBtn) apReportBtn.addEventListener("click", renderReportModal);
}
let autoPlanResult = null;
let autoPlanTargets = {};
let apViewMode = "config";
const DUTY_EXEMPT = ["Prof. Schäfer"];
const TARGET_WEEKEND_DUTY = 1;
const RELAXED_WEEKEND_DUTY_LIMIT = 1.5;
function isDutyExempt(empName) {
  return DUTY_EXEMPT.includes(empName);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectHistoricalDutyStats(upToYear, upToMonth) {
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
    const parts = k.split("-");
    const ky = parseInt(parts[0], 10),
      km = parseInt(parts[1], 10);
    if (!mData || !mData.employees) continue;
    if (ky > upToYear || (ky === upToYear && km >= upToMonth)) continue;
    const hols = getSaxonyHolidays(ky);
    const dim = daysInMonth(ky, km);
    const weMapPerEmp = {};
    for (const emp of mData.employees) {
      if (!stats[emp])
        stats[emp] = {
          bd: 0,
          hg: 0,
          weDuty: 0,
          holDuty: 0,
          thuBd: 0,
          hgForAA: 0,
          hgForFA: 0,
          satBd: 0
        };
      weMapPerEmp[emp] = {};
    }
    for (let d = 1; d <= dim; d++) {
      const wd = weekday(ky, km, d);
      const hol = isHoliday(ky, km, d, hols);
      const isWEDay = wd === 5 || wd === 6 || wd === 0;
      for (const emp of mData.employees) {
        const cell = mData.assignments?.[emp]?.[d];
        if (!cell?.duty) continue;
        if (cell.duty === "D") {
          stats[emp].bd++;
          if (hol) stats[emp].holDuty++;
          if (wd === 4) stats[emp].thuBd++;
          if (wd === 6) stats[emp].satBd++;
          if (isWEDay) {
            const kw = isoWeekNumber(ky, km, d);
            if (!weMapPerEmp[emp][kw]) weMapPerEmp[emp][kw] = { hasD: false, hasHG: false };
            weMapPerEmp[emp][kw].hasD = true;
          }
        }
        if (cell.duty === "HG") {
          stats[emp].hg++;
          if (hol) stats[emp].holDuty++;
          if (isWEDay) {
            const kw = isoWeekNumber(ky, km, d);
            if (!weMapPerEmp[emp][kw]) weMapPerEmp[emp][kw] = { hasD: false, hasHG: false };
            if (!weMapPerEmp[emp][kw].hasD) weMapPerEmp[emp][kw].hasHG = true;
          }
          const bdHolder = mData.employees.find(
            (e2) => mData.assignments?.[e2]?.[d]?.duty === "D",
          );
          if (bdHolder && isAssistenzarzt(bdHolder)) stats[emp].hgForAA++;
          else stats[emp].hgForFA++;
        }
      }
    }
    for (const emp of mData.employees) {
      for (const { hasD, hasHG } of Object.values(weMapPerEmp[emp] || {})) {
        if (hasD) stats[emp].weDuty += 1;
        else if (hasHG) stats[emp].weDuty += 0.5;
      }
    }
  }
  return stats;
}

function hasVacationInWeek(y, m, emp, targetKW) {
  const dim = daysInMonth(y, m);
  for (let d = 1; d <= dim; d++) {
    if (isoWeekNumber(y, m, d) !== targetKW) continue;
    const cell = getCell(y, m, emp, d);
    if (
      cell.assignment &&
      cell.assignment
        .split("/")
        .map((x) => x.trim())
        .some((c) => VACATION_CODES.includes(c))
    )
      return true;
  }
  const nextM = m === 11 ? 0 : m + 1,
    nextY = m === 11 ? y + 1 : y;
  const nk = monthKey(nextY, nextM);
  if (DATA[nk]) {
    const ndim = daysInMonth(nextY, nextM);
    for (let d = 1; d <= ndim; d++) {
      if (isoWeekNumber(nextY, nextM, d) !== targetKW) continue;
      const cell = DATA[nk].assignments?.[emp]?.[d];
      if (
        cell?.assignment &&
        cell.assignment
          .split("/")
          .map((x) => x.trim())
          .some((c) => VACATION_CODES.includes(c))
      )
        return true;
    }
  }
  return false;
}

function isAbsentOnDay(y, m, emp, day, assignments) {
  const cell = assignments[emp]?.[day];
  if (!cell?.assignment) return false;
  return cell.assignment
    .split("/")
    .map((x) => x.trim())
    .some((c) => ABSENCE_CODES.includes(c));
}
function isVacationOnDay(y, m, emp, day, assignments) {
  const cell = assignments[emp]?.[day];
  if (!cell?.assignment) return false;
  return cell.assignment
    .split("/")
    .map((x) => x.trim())
    .some((c) => VACATION_CODES.includes(c));
}
function isNextDayVacation(y, m, emp, d, assignments) {
  const next = nextCalendarDay(y, m, d);
  if (next.y === y && next.m === m)
    return isVacationOnDay(y, m, emp, next.d, assignments);
  const nk = monthKey(next.y, next.m);
  if (DATA[nk]?.assignments?.[emp]?.[next.d]) {
    const cell = DATA[nk].assignments[emp][next.d];
    if (
      cell.assignment &&
      cell.assignment
        .split("/")
        .map((x) => x.trim())
        .some((c) => VACATION_CODES.includes(c))
    )
      return true;
  }
  return false;
}

function beckerMartinConflict(y, m, emp, day) {
  if (emp !== "Dr. Becker" && emp !== "Dr. Martin") return false;
  const partner = emp === "Dr. Becker" ? "Dr. Martin" : "Dr. Becker";
  const next = nextCalendarDay(y, m, day);
  if (!isWorkday(next.y, next.m, next.d, getSaxonyHolidays(next.y)))
    return false;
  let partnerCell;
  if (next.y === y && next.m === m) {
    partnerCell = getCell(y, m, partner, next.d);
  } else {
    const nk = monthKey(next.y, next.m);
    partnerCell = DATA[nk]?.assignments?.[partner]?.[next.d] || {};
  }
  return !!(
    partnerCell.assignment &&
    partnerCell.assignment
      .split("/")
      .map((x) => x.trim())
      .some((c) => VACATION_CODES.includes(c))
  );
}

function countWeekendDuties(y, m, emp, assignments) {
  const weMap = {};
  const dim = daysInMonth(y, m);
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    if (wd !== 5 && wd !== 6 && wd !== 0) continue;
    const cell = assignments[emp]?.[d];
    if (!cell?.duty) continue;
    const kw = isoWeekNumber(y, m, d);
    if (!weMap[kw]) weMap[kw] = { hasD: false, hasHG: false };
    if (cell.duty === "D") weMap[kw].hasD = true;
    else if (cell.duty === "HG") weMap[kw].hasHG = true;
  }
  let count = 0;
  for (const { hasD, hasHG } of Object.values(weMap)) {
    if (hasD) count += 1;
    else if (hasHG) count += 0.5;
  }
  return count;
}

function getWeekendDutyKWs(y, m, emp, assignments) {
  const dim = daysInMonth(y, m);
  const kws = new Set();
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    const cell = assignments[emp]?.[d];
    if (!cell?.duty) continue;
    if (wd === 5 || wd === 6 || wd === 0) kws.add(isoWeekNumber(y, m, d));
  }
  return kws;
}

function wouldCreateDFDF(emp, d, assignments) {
  if (
    d >= 3 &&
    assignments[emp]?.[d - 2]?.duty === "D" &&
    assignments[emp]?.[d - 1]?.assignment === "F"
  )
    return true;
  if (
    assignments[emp]?.[d + 2]?.duty === "D" &&
    assignments[emp]?.[d + 1]?.assignment === "F"
  )
    return true;
  return false;
}

function getWeekendStateForKW(y, m, emp, assignments, kw) {
  const dim = daysInMonth(y, m);
  let hasD = false;
  let hasHG = false;
  for (let d = 1; d <= dim; d++) {
    const wd = weekday(y, m, d);
    if (wd !== 5 && wd !== 6 && wd !== 0) continue;
    if (isoWeekNumber(y, m, d) !== kw) continue;
    const duty = assignments[emp]?.[d]?.duty;
    if (duty === "D") hasD = true;
    else if (duty === "HG") hasHG = true;
  }
  return { hasD, hasHG };
}

function projectedWeekendDutyCount(y, m, emp, assignments, dutyCode, d) {
  const current = countWeekendDuties(y, m, emp, assignments);
  const wd = weekday(y, m, d);
  if (wd !== 5 && wd !== 6 && wd !== 0) return current;
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

function dutyKey(emp, day) {
  return `${emp}@@${day}`;
}

function cleanupAssignmentCell(assignments, emp, day) {
  if (!assignments[emp]?.[day]) return;
  Object.keys(assignments[emp][day]).forEach((key) => {
    if (!assignments[emp][day][key]) delete assignments[emp][day][key];
  });
  if (!Object.keys(assignments[emp][day]).length) delete assignments[emp][day];
}

function listDutyAssignments(emps, dim, assignments, dutyCode) {
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

function averageOf(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function defaultBDTarget(empName) {
  if (isDutyExempt(empName)) return 0;
  if (empName === "Dr. Polednia") return 3;
  if (empName === "Dr. Becker") return 3;
  if (empName === "Hr. Sebastian") return 3;
  return 4;
}

function computeAutoPlan(customTargets) {
  const { year: y, month: m } = state;
  if (!planMode || !planData) return null;
  const hols = getSaxonyHolidays(y);
  const dim = daysInMonth(y, m);
  const emps = [...planData.employees];
  const wishes = planData.wishes || {};
  const result = JSON.parse(JSON.stringify(planData.assignments));
  const externalAssignments = {};
  const log = [];
  const report = [];
  const fixedDutyKeys = new Set();
  const autoRestDays = new Set();

  emps.forEach((emp) => {
    for (let d = 1; d <= dim; d++) {
      const duty = planData.assignments?.[emp]?.[d]?.duty;
      if (duty) fixedDutyKeys.add(`${duty}:${dutyKey(emp, d)}`);
    }
  });

  log.push({
    phase: "init",
    icon: "📊",
    msg: "Lade historische Daten und initialisiere Constraints...",
    pct: 5,
  });
  const hist = collectHistoricalDutyStats(y, m);
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  const hgFAs = dutyEmps.filter((e) => isFacharzt(e));

  const bdTarget = {};
  emps.forEach((e) => {
    bdTarget[e] =
      customTargets && customTargets[e] !== undefined
        ? customTargets[e]
        : defaultBDTarget(e);
  });

  function getScheduledCell(targetY, targetM, emp, day, assignments = result) {
    if (targetY === y && targetM === m) return assignments[emp]?.[day] || {};
    return DATA[monthKey(targetY, targetM)]?.assignments?.[emp]?.[day] || {};
  }

  function getScheduledDuty(targetY, targetM, emp, day, assignments = result) {
    return getScheduledCell(targetY, targetM, emp, day, assignments).duty || null;
  }

  function queueExternalAssignment(targetY, targetM, emp, day, patch) {
    const mk = monthKey(targetY, targetM);
    if (!externalAssignments[mk]) externalAssignments[mk] = {};
    if (!externalAssignments[mk][emp]) externalAssignments[mk][emp] = {};
    const existingQueued = externalAssignments[mk][emp][day] || {};
    const existingStored = DATA[mk]?.assignments?.[emp]?.[day] || {};
    const merged = { ...existingQueued };
    for (const [key, value] of Object.entries(patch)) {
      if (!value) continue;
      if (!existingQueued[key] && !existingStored[key]) merged[key] = value;
    }
    if (Object.keys(merged).length) externalAssignments[mk][emp][day] = merged;
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
  if (repairedF > 0)
    log.push({
      phase: "init",
      icon: "🔧",
      msg: `${repairedF} fehlende Ruhetage nach gesetzten BD ergänzt`,
      pct: 10,
    });

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
        const bdHolder = emps.find(
          (e2) => e2 !== e && result[e2]?.[d]?.duty === "D",
        );
        if (bdHolder && isAssistenzarzt(bdHolder)) currentHGForAA[e]++;
        else currentHGForFA[e]++;
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
    const targetDates = isEaster
      ? [addDays(easter, -2), easter, addDays(easter, 1)]
      : [addDays(easter, 49), addDays(easter, 50)];
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

  function minDistanceForDuty(emp, d, dutyCode, assignments = result) {
    let minDist = Infinity;
    for (let i = 1; i <= dim; i++) {
      if (i === d) continue;
      if (assignments[emp]?.[i]?.duty === dutyCode)
        minDist = Math.min(minDist, Math.abs(i - d));
    }
    return minDist;
  }

  function hasAdjacentHG(emp, d, assignments = result) {
    const prev = prevCalendarDay(y, m, d);
    const next = nextCalendarDay(y, m, d);
    return (
      getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "HG" ||
      getScheduledDuty(next.y, next.m, emp, next.d, assignments) === "HG"
    );
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
    if (result[emp]?.[next.d]?.assignment === "F") delete result[emp][next.d].assignment;
    cleanupAssignmentCell(result, emp, next.d);
    autoRestDays.delete(key);
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
    if (beckerMartinConflict(y, m, emp, d)) return false;
    if (assignments[emp]?.[d]?.assignment === "F") return false;
    if (isNextDayVacation(y, m, emp, d, assignments)) return false;
    const prev = prevCalendarDay(y, m, d);
    const next = nextCalendarDay(y, m, d);
    if (getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "D") return false;
    if (getScheduledDuty(next.y, next.m, emp, next.d, assignments) === "D") return false;
    if (
      getScheduledDuty(prev.y, prev.m, emp, prev.d, assignments) === "HG" &&
      weekday(prev.y, prev.m, prev.d) !== 5
    )
      return false;
    if (hasHolidayBlockConflict(emp, d)) return false;

    if (!relaxed) {
      if (currentBD[emp] >= bdTarget[emp]) return false;
      const projectedWe = projectedWeekendDutyCount(y, m, emp, assignments, "D", d);
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) return false;
      if (emp === "Dr. Becker" && wd === 6) return false;
      const minDistD = minDistanceForDuty(emp, d, "D", assignments);
      if (minDistD < 3) return false;
    }
    return true;
  }

  function scoreBDCandidate(emp, d, relaxed) {
    if (!canDoBD(emp, d, relaxed)) return -Infinity;
    let score = 100;
    const wd = weekday(y, m, d);
    const isWE = wd === 5 || wd === 6 || wd === 0;
    const tags = [];
    const projectedWe = projectedWeekendDutyCount(y, m, emp, result, "D", d);
    const minDistD = minDistanceForDuty(emp, d, "D", result);

    if (currentBD[emp] >= bdTarget[emp]) {
      score -= 5000 * (currentBD[emp] - bdTarget[emp] + 1);
      tags.push("Soll überschritten");
    } else {
      score += (bdTarget[emp] - currentBD[emp]) * 80;
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
      if (getWeekendDutyKWs(y, m, emp, result).has(isoWeekNumber(y, m, d) - 1)) {
        score -= 40;
        tags.push("WE-Abstand");
      }
    }

    if (wd === 6 && isFacharzt(emp)) {
      const projectedSat = currentSatBD[emp] + 1;
      const avgProjectedSat =
        (hgFAs.reduce((s, e) => s + currentSatBD[e], 0) + 1) /
        Math.max(1, hgFAs.length);
      score -= Math.abs(projectedSat - avgProjectedSat) * 700;
      tags.push("Samstags-Ausgleich");
    }

    if (emp === "Dr. Becker" && wd === 6 && relaxed) {
      score -= 2000;
      tags.push("Notlösung");
    }

    if (minDistD < 4) score -= (4 - minDistD) * 120;
    if (wouldCreateDFDF(emp, d, result)) {
      score -= 260;
      tags.push("D-F-D-F weich vermieden");
    }

    if (isHoliday(y, m, d, hols)) {
      const holAvg =
        dutyEmps.reduce((s, e) => s + (hist[e]?.holDuty || 0), 0) /
        Math.max(1, dutyEmps.length);
      score += (holAvg - (hist[emp]?.holDuty || 0)) * 6;
      tags.push("Feiertag");
    }

    score += ((emp.charCodeAt(0) * 31 + d * 7) % 10) * 0.1;
    return { score, tags };
  }

  bdNeeded.sort((a, b) => {
    const aWe =
      isWeekend(y, m, a) || isHoliday(y, m, a, hols) || weekday(y, m, a) === 5;
    const bWe =
      isWeekend(y, m, b) || isHoliday(y, m, b, hols) || weekday(y, m, b) === 5;
    if (aWe !== bWe) return aWe ? -1 : 1;
    return a - b;
  });

  const weBDs = bdNeeded.filter((d) => {
    const wd = weekday(y, m, d);
    return wd === 5 || wd === 6 || wd === 0 || isHoliday(y, m, d, hols);
  });
  const nonWeBDs = bdNeeded.filter((d) => !weBDs.includes(d));

  log.push({
    phase: "bd_weekend",
    icon: "🌙",
    msg: `Verteile ${weBDs.length} WE/FT-BD...`,
    pct: 22,
  });
  let bdRelaxedCount = 0;
  let hgRelaxedCount = 0;

  function assignBD(d, phaseKey, pctBase, pctRange, total) {
    let candidates = dutyEmps
      .map((e) => ({ emp: e, ...scoreBDCandidate(e, d, false) }))
      .filter((c) => c.score > -Infinity)
      .sort((a, b) => b.score - a.score);
    let relaxed = false;
    if (candidates.length === 0) {
      candidates = dutyEmps
        .map((e) => ({ emp: e, ...scoreBDCandidate(e, d, true) }))
        .filter((c) => c.score > -Infinity)
        .sort((a, b) => b.score - a.score);
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
      if (weekday(y, m, d) === 6) currentSatBD[chosen.emp]++;
      updateAutoF(chosen.emp, d);

      let reason = `Bester Score (${Math.round(chosen.score)}).`;
      if (chosen.tags.includes("Wunsch")) reason = "Wunschdienst berücksichtigt.";
      if (chosen.tags.includes("Vor Urlaub"))
        reason = "Donnerstags-Dienst vor Urlaub priorisiert.";
      if (chosen.tags.includes("Samstags-Ausgleich"))
        reason += " Samstags-Belastung im Monat ausgeglichen.";
      if (chosen.tags.includes("D-F-D-F weich vermieden"))
        reason += " D-F-D-F wurde nur weich bestraft.";
      if (relaxed) reason += " Auswahl im gelockerten Modus.";
      if (chosen.emp === "Dr. Becker" && weekday(y, m, d) === 6) {
        reason += " Samstags-Dienst unvermeidbar -> FZA am Montag eingetragen.";
        const sunDay = nextCalendarDay(y, m, d);
        const monDay = nextCalendarDay(sunDay.y, sunDay.m, sunDay.d);
        if (monDay.y === y && monDay.m === m) {
          if (!result[chosen.emp][monDay.d]) result[chosen.emp][monDay.d] = {};
          if (!result[chosen.emp][monDay.d].assignment)
            result[chosen.emp][monDay.d].assignment = "FZA";
        } else {
          queueExternalAssignment(monDay.y, monDay.m, chosen.emp, monDay.d, {
            assignment: "FZA",
          });
        }
      }

      report.push({
        day: d,
        emp: chosen.emp,
        duty: "D",
        reason,
        tags: chosen.tags,
      });
      log.push({
        phase: phaseKey,
        icon: "→",
        msg: `Tag ${d}. → ${chosen.emp}`,
        pct:
          pctBase +
          Math.round(
            (total / Math.max(1, weBDs.length + nonWeBDs.length)) * pctRange,
          ),
      });
      return true;
    }
    log.push({
      phase: phaseKey,
      icon: "⚠",
      msg: `Tag ${d}.: Kein Kandidat für BD!`,
      pct: pctBase,
    });
    return false;
  }

  for (let i = 0; i < weBDs.length; i++) assignBD(weBDs[i], "bd_weekend", 22, 18, i);
  log.push({
    phase: "bd_workday",
    icon: "☀️",
    msg: `Verteile ${nonWeBDs.length} Werktags-BD...`,
    pct: 42,
  });
  for (let i = 0; i < nonWeBDs.length; i++)
    assignBD(nonWeBDs[i], "bd_workday", 42, 18, weBDs.length + i);

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
          if (weekday(y, m, day) === 6) currentSatBD[e]++;
        } else if (duty === "HG") {
          currentHG[e]++;
          if (bdHolder && isAssistenzarzt(bdHolder)) currentHGForAA[e]++;
          else currentHGForFA[e]++;
        }
      }
    }
  }

  function setDutyAssignment(emp, day, dutyCode) {
    if (!result[emp]) result[emp] = {};
    if (!result[emp][day]) result[emp][day] = {};
    result[emp][day].duty = dutyCode;
    if (dutyCode === "D") updateAutoF(emp, day);
  }

  function clearDutyAssignment(emp, day, dutyCode) {
    if (dutyCode === "D") clearAutoF(emp, day);
    if (result[emp]?.[day]?.duty === dutyCode) delete result[emp][day].duty;
    cleanupAssignmentCell(result, emp, day);
  }

  function computeBDObjective() {
    let score = 0;
    for (let day = 1; day <= dim; day++) {
      if (!dutyEmps.some((e) => result[e]?.[day]?.duty === "D")) score += 20000;
    }
    const satAvg =
      hgFAs.length > 0
        ? hgFAs.reduce((sum, e) => sum + currentSatBD[e], 0) / hgFAs.length
        : 0;
    dutyEmps.forEach((emp) => {
      const diff = currentBD[emp] - bdTarget[emp];
      score += diff > 0 ? diff * diff * 2600 : diff * diff * 1200;
      const weDiff = countWeekendDuties(y, m, emp, result) - TARGET_WEEKEND_DUTY;
      score += weDiff * weDiff * 480;
      const weProjected = countWeekendDuties(y, m, emp, result);
      if (weProjected > RELAXED_WEEKEND_DUTY_LIMIT) {
        score += (weProjected - RELAXED_WEEKEND_DUTY_LIMIT) * 12000;
      }
      if (isFacharzt(emp)) {
        score += (currentSatBD[emp] - satAvg) * (currentSatBD[emp] - satAvg) * 850;
      }
      for (let day = 1; day <= dim; day++) {
        if (result[emp]?.[day]?.duty !== "D") continue;
        const next = nextCalendarDay(y, m, day);
        if (getScheduledDuty(next.y, next.m, emp, next.d, result) === "D") score += 40000;
        const minDistD = minDistanceForDuty(emp, day, "D", result);
        if (minDistD < 3) score += (3 - minDistD) * 6000;
        if (minDistD < 5) score += (5 - minDistD) * 350;
        if (wouldCreateDFDF(emp, day, result)) score += 380;
        if (weekday(y, m, day) === 6 && emp === "Dr. Becker") score += 30000;
      }
    });
    return score;
  }

  log.push({
    phase: "bd_optimize",
    icon: "🔄",
    msg: "Starte iterative BD-Optimierung zur Fairness-Glättung...",
    pct: 62,
  });
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
      const candidateOrder = [...dutyEmps].sort((a, b) => {
        const aScore =
          Math.abs((currentBD[a] - 1) - bdTarget[a]) + projectedWeekendDutyCount(y, m, a, result, "D", day);
        const bScore =
          Math.abs((currentBD[b] - 1) - bdTarget[b]) + projectedWeekendDutyCount(y, m, b, result, "D", day);
        return aScore - bScore;
      });
      for (const candidate of candidateOrder) {
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
          const rep = report.find((r) => r.day === day && r.duty === "D");
          if (rep) {
            rep.emp = candidate;
            rep.reason = "Durch iterative Fairness-Optimierung neu zugewiesen.";
            if (!rep.tags.includes("Optimiert")) rep.tags.push("Optimiert");
          }
          log.push({
            phase: "bd_optimize",
            icon: "🔀",
            msg: `Tag ${day}.: ${currentEmp} → ${candidate}`,
            pct: 63,
          });
          break;
        }
        clearDutyAssignment(candidate, day, "D");
        setDutyAssignment(currentEmp, day, "D");
        rebuildCurrentCounters();
      }
    }
    if (!improved) break;
  }
  rebuildCurrentCounters();
  log.push({
    phase: "bd_optimize",
    icon: "✓",
    msg: swaps > 0 ? `${swaps} BD-Reassignments durchgeführt.` : "Keine weiteren BD-Verbesserungen gefunden.",
    pct: 65,
  });

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

    if (!relaxed) {
      if (emp === "Dr. Polednia" && (wd === 0 || wd === 2 || wd === 4)) {
        const bdOnDay = dutyEmps.find((e) => assignments[e]?.[d]?.duty === "D");
        if (bdOnDay && isAssistenzarzt(bdOnDay)) return false;
      }
      const projectedWe = projectedWeekendDutyCount(y, m, emp, assignments, "HG", d);
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) return false;
    }
    return true;
  }

  function scoreHGCandidate(emp, d, relaxed) {
    if (!canDoHG(emp, d, relaxed)) return -Infinity;
    let score = 100;
    const tags = [];
    const projectedHG = currentHG[emp] + 1;
    const avgProjectedHG =
      (hgFAs.reduce((s, e) => s + currentHG[e], 0) + 1) / Math.max(1, hgFAs.length);
    score -= Math.abs(projectedHG - avgProjectedHG) * 240;
    tags.push("HG-Monatsausgleich");

    if (wishes[emp]?.[d] === "HG_WISH") {
      score += 220;
      tags.push("Wunsch");
    }
    if (isNextDayVacation(y, m, emp, d, result)) score -= 20;

    const wd = weekday(y, m, d);
    if (wd === 6 || wd === 0) {
      const projectedWe = projectedWeekendDutyCount(y, m, emp, result, "HG", d);
      score -= Math.abs(projectedWe - TARGET_WEEKEND_DUTY) * 150;
      if (projectedWe > RELAXED_WEEKEND_DUTY_LIMIT) {
        score -= (projectedWe - RELAXED_WEEKEND_DUTY_LIMIT) * 360;
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

  const bundledHGDays = new Set();
  if (hgNeeded.length > 0) {
    log.push({
      phase: "hg_bundle",
      icon: "🔗",
      msg: "Wochenend-Kopplung für HG...",
      pct: 68,
    });

    function assignBundledHG(emp, d, bindReason) {
      if (!isFacharzt(emp) || isDutyExempt(emp)) return false;
      if (wishes[emp]?.[d] === "NO_DUTY") return false;
      if (isAbsentOnDay(y, m, emp, d, result)) return false;
      if (result[emp]?.[d]?.duty) return false;
      if (hasHolidayBlockConflict(emp, d)) return false;
      const wd = weekday(y, m, d);
      const isWE = wd === 6 || wd === 0;
      if (result[emp]?.[d]?.assignment === "F" && !isWE) return false;
      if (emps.some((e) => result[e]?.[d]?.duty === "HG")) return false;
      if (d < dim && result[emp]?.[d + 1]?.duty === "D" && wd !== 5) return false;
      if (hasAdjacentHG(emp, d, result)) return false;

      if (!result[emp]) result[emp] = {};
      if (!result[emp][d]) result[emp][d] = {};
      result[emp][d].duty = "HG";
      currentHG[emp]++;
      bundledHGDays.add(d);

      const bdHolder = dutyEmps.find((e) => result[e]?.[d]?.duty === "D");
      if (bdHolder && isAssistenzarzt(bdHolder)) currentHGForAA[emp]++;
      else currentHGForFA[emp]++;

      report.push({
        day: d,
        emp,
        duty: "HG",
        reason: bindReason,
        tags: ["Gekoppelt"],
      });
      log.push({
        phase: "hg_bundle",
        icon: "🔗",
        msg: `Tag ${d}. HG → ${emp} (Kopplung)`,
        pct: 69,
      });
      return true;
    }

    for (let d = 1; d <= dim; d++) {
      const wd = weekday(y, m, d);
      const hol = isHoliday(y, m, d, hols);
      const bdHolder = dutyEmps.find((e) => result[e]?.[d]?.duty === "D");
      if (!bdHolder) continue;

      if (wd === 5 && isAssistenzarzt(bdHolder)) {
        const satDay = d + 1;
        if (satDay <= dim) {
          const satBDHolder = dutyEmps.find((e) => result[e]?.[satDay]?.duty === "D");
          if (satBDHolder && isFacharzt(satBDHolder) && satBDHolder !== bdHolder) {
            assignBundledHG(
              satBDHolder,
              d,
              "Freitags-HG gekoppelt an eigenen Samstags-BD (da Freitag AA im Dienst).",
            );
          }
        }
      }
      if (wd === 6 && isFacharzt(bdHolder)) {
        const sunDay = d + 1;
        if (sunDay <= dim) {
          const sunBDHolder = dutyEmps.find((e) => result[e]?.[sunDay]?.duty === "D");
          if (sunBDHolder && sunBDHolder !== bdHolder) {
            assignBundledHG(
              bdHolder,
              sunDay,
              "Sonntags-HG gekoppelt an eigenen Samstags-BD.",
            );
          }
        }
      }
      if (!hol) {
        const nextDay = d + 1;
        if (
          nextDay <= dim &&
          isHoliday(y, m, nextDay, hols) &&
          isAssistenzarzt(bdHolder)
        ) {
          const holBDHolder = dutyEmps.find((e) => result[e]?.[nextDay]?.duty === "D");
          if (holBDHolder && isFacharzt(holBDHolder) && holBDHolder !== bdHolder) {
            assignBundledHG(
              holBDHolder,
              d,
              "HG vor Feiertag gekoppelt an eigenen Feiertags-BD (da AA im Dienst).",
            );
          }
        }
      }
    }
    log.push({
      phase: "hg_bundle",
      icon: "✓",
      msg: `${bundledHGDays.size} HG gebündelt.`,
      pct: 71,
    });

    const hgRemaining = hgNeeded.filter(
      (d) => !bundledHGDays.has(d) && !emps.some((e) => result[e]?.[d]?.duty === "HG"),
    );
    log.push({
      phase: "hg_assign",
      icon: "📞",
      msg: `Verteile verbleibende ${hgRemaining.length} HG...`,
      pct: 72,
    });

    for (const d of hgRemaining) {
      if (emps.some((e) => result[e]?.[d]?.duty === "HG")) continue;
      let candidates = hgFAs
        .map((e) => ({ emp: e, ...scoreHGCandidate(e, d, false) }))
        .filter((c) => c.score > -Infinity)
        .sort((a, b) => b.score - a.score);
      if (candidates.length === 0) {
        candidates = hgFAs
          .map((e) => ({ emp: e, ...scoreHGCandidate(e, d, true) }))
          .filter((c) => c.score > -Infinity)
          .sort((a, b) => b.score - a.score);
        if (candidates.length > 0) {
          hgRelaxedCount++;
          candidates[0].tags.push("Regeln gelockert");
        }
      }
      if (candidates.length > 0) {
        const chosen = candidates[0];
        if (!result[chosen.emp]) result[chosen.emp] = {};
        if (!result[chosen.emp][d]) result[chosen.emp][d] = {};
        result[chosen.emp][d].duty = "HG";
        currentHG[chosen.emp]++;
        const bdHolderForCount = dutyEmps.find((e) => result[e]?.[d]?.duty === "D");
        if (bdHolderForCount && isAssistenzarzt(bdHolderForCount))
          currentHGForAA[chosen.emp]++;
        else currentHGForFA[chosen.emp]++;

        let reason = "Gleichmäßige HG-Monatsverteilung.";
        if (chosen.tags.includes("Wunsch")) reason = "Wunschdienst berücksichtigt.";
        if (chosen.tags.includes("kein Direkt-HG"))
          reason += " Direkt aufeinanderfolgende HG wurden weich vermieden.";
        if (chosen.tags.includes("Regeln gelockert"))
          reason += " Auswahl im gelockerten Modus.";

        report.push({
          day: d,
          emp: chosen.emp,
          duty: "HG",
          reason,
          tags: chosen.tags,
        });
        log.push({
          phase: "hg_assign",
          icon: "→",
          msg: `Tag ${d}. → ${chosen.emp}`,
          pct:
            72 +
            Math.round((hgRemaining.indexOf(d) / Math.max(1, hgRemaining.length)) * 16),
        });
      } else {
        log.push({
          phase: "hg_assign",
          icon: "⚠",
          msg: `Tag ${d}.: Kein HG-Kandidat!`,
          pct: 73,
        });
      }
    }

    function computeHGObjective() {
      let score = 0;
      for (let day = 1; day <= dim; day++) {
        if (!hgFAs.some((e) => result[e]?.[day]?.duty === "HG")) score += 15000;
      }
      const avgHG = averageOf(hgFAs.map((emp) => currentHG[emp]));
      const avgBDforFAs = averageOf(hgFAs.map((emp) => currentBD[emp]));
      const avgHGForAA = averageOf(hgFAs.map((emp) => currentHGForAA[emp]));
      const avgHGForFA = averageOf(hgFAs.map((emp) => currentHGForFA[emp]));
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
          if (hasAdjacentHG(emp, day, result)) score += 1800;
          const wd = weekday(y, m, day);
          if (day < dim && result[emp]?.[day + 1]?.duty === "D" && wd !== 5) score += 24000;
        }
      });
      return score;
    }

    log.push({
      phase: "hg_assign",
      icon: "🧠",
      msg: "Starte iterative HG-Optimierung...",
      pct: 85,
    });
    let hgMoves = 0;
    let bestHGObjective = computeHGObjective();
    const mutableHGDays = listDutyAssignments(hgFAs, dim, result, "HG")
      .filter(({ emp, day }) => !fixedDutyKeys.has(`HG:${dutyKey(emp, day)}`))
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
            const rep = report.find((r) => r.day === day && r.duty === "HG");
            if (rep) {
              rep.emp = candidate;
              rep.reason = "Durch iterative HG-Optimierung neu zugewiesen.";
              if (!rep.tags.includes("Optimiert")) rep.tags.push("Optimiert");
            }
            log.push({
              phase: "hg_assign",
              icon: "🔁",
              msg: `HG Tag ${day}.: ${currentEmp} → ${candidate}`,
              pct: 86,
            });
            break;
          }
          clearDutyAssignment(candidate, day, "HG");
          setDutyAssignment(currentEmp, day, "HG");
          rebuildCurrentCounters();
        }
      }
      if (!improved) break;
    }
    rebuildCurrentCounters();
    log.push({
      phase: "hg_assign",
      icon: "✓",
      msg: hgMoves > 0 ? `${hgMoves} HG-Reassignments durchgeführt.` : "Keine weiteren HG-Verbesserungen gefunden.",
      pct: 88,
    });
  }

  log.push({
    phase: "validate",
    icon: "🛡️",
    msg: "Finale Regel-Prüfung...",
    pct: 90,
  });
  let violations = 0;
  for (const emp of dutyEmps) {
    for (let d = 1; d < dim; d++) {
      if (result[emp]?.[d]?.duty === "D" && result[emp]?.[d + 1]?.duty === "D") {
        delete result[emp][d + 1].duty;
        if (!Object.values(result[emp][d + 1] || {}).some(Boolean)) delete result[emp][d + 1];
        violations++;
      }
    }
  }
  if (violations > 0) {
    log.push({
      phase: "validate",
      icon: "⚠",
      msg: `${violations} Doppel-Dienst(e) entfernt.`,
      pct: 92,
    });
    emps.forEach((e) => {
      currentBD[e] = 0;
    });
    for (let d = 1; d <= dim; d++) {
      emps.forEach((e) => {
        if (result[e]?.[d]?.duty === "D") currentBD[e]++;
      });
    }
  }

  log.push({
    phase: "done",
    icon: "✅",
    msg: "Planung abgeschlossen!",
    pct: 100,
  });

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
    summary.bd[e] = {
      count: bd,
      target: bdTarget[e],
      days: bdDays,
      weDuty,
      holDuty,
    };
    summary.hg[e] = { count: hg, days: hgDays };
  });

  dutyEmps.forEach((e) => {
    const bd = summary.bd[e];
    if (bd.target > 0 && bd.count < bd.target)
      summary.warnings.push(`${e}: nur ${bd.count}/${bd.target} BD`);
    if (bd.weDuty > RELAXED_WEEKEND_DUTY_LIMIT)
      summary.warnings.push(`${e}: ${bd.weDuty} WE-Dienste (Ziel ${TARGET_WEEKEND_DUTY})`);
  });
  for (let d = 1; d <= dim; d++) {
    if (!emps.some((e) => result[e]?.[d]?.duty === "D"))
      summary.warnings.push(`Tag ${d}: kein BD besetzt.`);
    if (!emps.some((e) => result[e]?.[d]?.duty === "HG"))
      summary.warnings.push(`Tag ${d}: kein HG besetzt.`);
  }

  if (bdRelaxedCount > 0 || hgRelaxedCount > 0)
    summary.infos.push(
      `Um 100% Besetzung zu garantieren, wurden bei ${bdRelaxedCount} BD und ${hgRelaxedCount} HG die harten Abstands-/WE-Sperren gelockert.`,
    );
  summary.infos.push(
    `HG-Verteilung: Die Anzahl der HG wurde innerhalb des Monats möglichst gleichmäßig über alle FA verteilt.`,
  );
  if (bundledHGDays.size > 0)
    summary.infos.push(
      `${bundledHGDays.size} HG-Dienste wurden an WE/FT effizient mit BD gekoppelt.`,
    );
  let maxWe = 0;
  dutyEmps.forEach((e) => {
    maxWe = Math.max(maxWe, summary.bd[e].weDuty);
  });
  summary.infos.push(
    `Wochenend-Dienste wurden auf ein Ziel von ${TARGET_WEEKEND_DUTY} WE-Äquivalenten pro Kopf optimiert (Maximum: ${maxWe}).`,
  );
  summary.infos.push(`Samstags-Dienste für FA wurden im aktuellen Monat gleichverteilt.`);
  summary.infos.push(`Die Regel D-F-D-F wurde nur noch als Soft-Constraint gewichtet.`);
  summary.infos.push(
    `Direkt aufeinanderfolgende HG wurden weich bestraft; ein freier Tag zwischen zwei HG ist zulässig.`,
  );
  summary.infos.push(
    `Wer in einem Oster-/Pfingst-Feiertagsblock arbeitet, wird im jeweils anderen Block ausgeschlossen.`,
  );

  let fulfilledWishes = 0;
  let wishCount = 0;
  for (let d = 1; d <= dim; d++) {
    dutyEmps.forEach((e) => {
      if (wishes[e]?.[d]) wishCount++;
      if (wishes[e]?.[d] === "BD_WISH" && result[e]?.[d]?.duty === "D") fulfilledWishes++;
      if (wishes[e]?.[d] === "HG_WISH" && result[e]?.[d]?.duty === "HG") fulfilledWishes++;
      if (wishes[e]?.[d] === "NO_DUTY" && !result[e]?.[d]?.duty) fulfilledWishes++;
    });
  }
  if (wishCount > 0)
    summary.infos.push(`${fulfilledWishes} von ${wishCount} Dienstwünschen wurden erfüllt.`);

  report.sort((a, b) => a.day - b.day || (a.duty === "D" ? -1 : 1));

  return { assignments: result, summary, log, report, externalAssignments };
}

function openAutoPlanModal() {
  if (!planMode) return;
  const emps = [...planData.employees];
  if (!Object.keys(autoPlanTargets).length) {
    emps.forEach((e) => {
      autoPlanTargets[e] = defaultBDTarget(e);
    });
  }
  apViewMode = "config";
  renderAutoPlanModal();
  showOverlay("modal-autoplan");
}

function renderAutoPlanModal() {
  const { year: y, month: m } = state;
  const emps = [...planData.employees];
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  document.getElementById("ap-sub").textContent = `${MONTHS[m]} ${y}`;
  const body = document.getElementById("ap-body");
  const applyBtn = document.getElementById("ap-apply");
  const reportBtn = document.getElementById("ap-report-btn");
  if (reportBtn) reportBtn.style.display = "none";

  if (apViewMode === "config") {
    applyBtn.style.display = "none";
    const hist = collectHistoricalDutyStats(y, m);
    let html = `<div class="ap-config-intro"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;color:#F59E0B"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span>BD-Ziele anpassen.</span></div>`;
    if (DUTY_EXEMPT.length)
      html += `<div class="ap-exempt-note"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Befreit: <strong>${DUTY_EXEMPT.join(", ")}</strong></span></div>`;
    html += `<div class="ap-sect-hd"><span class="ap-sect-badge" style="background:#EF4444;color:#fff">D</span>BD-Ziele</div>`;
    html += `<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th class="ap-th-name">Mitarbeitende</th><th class="ap-th">Position</th><th class="ap-th">Hist. BD</th><th class="ap-th">Hist. Sa-D</th><th class="ap-th ap-th-target">Ziel BD</th></tr></thead><tbody>`;
    dutyEmps.forEach((e) => {
      const meta = getEmpMeta(e);
      const pc = posColor(meta.position);
      const h = hist[e] || { bd: 0, weDuty: 0, satBd: 0 };
      const target = autoPlanTargets[e] ?? defaultBDTarget(e);
      html += `<tr><td class="ap-td-name" style="border-left:3px solid ${pc.border}"><span>${e}</span><span class="ap-pos" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span></td><td class="ap-td ap-td-num" style="font-size:10px;color:var(--gray-500)">${meta.posLabel}</td><td class="ap-td ap-td-num" style="color:var(--gray-500)">${h.bd}</td><td class="ap-td ap-td-num" style="color:var(--gray-500)">${h.satBd}</td><td class="ap-td ap-td-num"><input type="number" class="ap-target-input" data-emp="${e}" value="${target}" min="0" max="10" step="1"></td></tr>`;
    });
    const totalTarget = dutyEmps.reduce(
      (s, e) => s + (autoPlanTargets[e] ?? defaultBDTarget(e)),
      0,
    );
    html += `</tbody><tfoot><tr class="ap-total-row"><td class="ap-td-name" colspan="4" style="font-weight:700;color:var(--gray-700);padding-left:12px">Σ Gesamt-Ziel</td><td class="ap-td ap-td-num" style="font-weight:800" id="ap-total-target">${totalTarget}</td></tr></tfoot></table></div>`;
    html += `<div class="ap-config-actions"><button type="button" class="mbtn mbtn-ghost" id="ap-reset-defaults">Standard</button><button type="button" class="mbtn" id="ap-compute" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#451a03;font-weight:700;cursor:pointer;-webkit-appearance:none">Berechnen</button></div>`;
    body.innerHTML = html;
    body.querySelectorAll(".ap-target-input").forEach((inp) => {
      inp.addEventListener("change", () => {
        autoPlanTargets[inp.dataset.emp] = Math.max(
          0,
          Math.min(10, parseInt(inp.value, 10) || 0),
        );
        inp.value = autoPlanTargets[inp.dataset.emp];
        const tot = dutyEmps.reduce((s, e) => s + (autoPlanTargets[e] ?? 0), 0);
        const totEl = document.getElementById("ap-total-target");
        if (totEl) totEl.textContent = tot;
      });
      inp.addEventListener("input", () => {
        autoPlanTargets[inp.dataset.emp] = Math.max(
          0,
          Math.min(10, parseInt(inp.value, 10) || 0),
        );
        const tot = dutyEmps.reduce((s, e) => s + (autoPlanTargets[e] ?? 0), 0);
        const totEl = document.getElementById("ap-total-target");
        if (totEl) totEl.textContent = tot;
      });
    });
    document
      .getElementById("ap-reset-defaults")
      ?.addEventListener("click", () => {
        dutyEmps.forEach((e) => {
          autoPlanTargets[e] = defaultBDTarget(e);
        });
        body.querySelectorAll(".ap-target-input").forEach((inp) => {
          inp.value = autoPlanTargets[inp.dataset.emp];
        });
        const totEl = document.getElementById("ap-total-target");
        if (totEl)
          totEl.textContent = dutyEmps.reduce(
            (s, e) => s + autoPlanTargets[e],
            0,
          );
      });
    function doCompute() {
      body.querySelectorAll(".ap-target-input").forEach((inp) => {
        autoPlanTargets[inp.dataset.emp] = Math.max(
          0,
          parseInt(inp.value, 10) || 0,
        );
      });
      DUTY_EXEMPT.forEach((e) => {
        autoPlanTargets[e] = 0;
      });
      const result = computeAutoPlan(autoPlanTargets);
      if (!result) {
        showToast("Fehler bei der Berechnung");
        return;
      }
      autoPlanResult = result;
      apViewMode = "progress";
      renderProgressAndThenResult(result);
    }
    const computeBtn = document.getElementById("ap-compute");
    if (computeBtn) {
      computeBtn.addEventListener("click", doCompute);
      if (IS_MOBILE) {
        computeBtn.addEventListener("touchend", (e) => {
          e.preventDefault();
          doCompute();
        }, { passive: false });
      }
    }
  } else if (apViewMode === "result") {
    renderResultView();
  }
}

async function renderProgressAndThenResult(result) {
  const body = document.getElementById("ap-body");
  const applyBtn = document.getElementById("ap-apply");
  applyBtn.style.display = "none";
  body.innerHTML = `
    <div class="ap-engine">
      <div class="ap-pipeline" id="ap-pipeline">
        <div class="ap-phase-node" data-phase="init"><span class="ap-pn-dot"></span><span class="ap-pn-label">Analyse</span></div><div class="ap-phase-conn"></div>
        <div class="ap-phase-node" data-phase="bd"><span class="ap-pn-dot"></span><span class="ap-pn-label">BD</span></div><div class="ap-phase-conn"></div>
        <div class="ap-phase-node" data-phase="swap"><span class="ap-pn-dot"></span><span class="ap-pn-label">Optimierung</span></div><div class="ap-phase-conn"></div>
        <div class="ap-phase-node" data-phase="hg"><span class="ap-pn-dot"></span><span class="ap-pn-label">HG</span></div><div class="ap-phase-conn"></div>
        <div class="ap-phase-node" data-phase="validate"><span class="ap-pn-dot"></span><span class="ap-pn-label">Validierung</span></div>
      </div>
      <div class="ap-live-stats" id="ap-live-stats">
        <div class="ap-ls-item"><span class="ap-ls-val" id="ap-ls-bd" style="color:#EF4444">0</span><span class="ap-ls-lbl">BD</span></div><div class="ap-ls-sep"></div>
        <div class="ap-ls-item"><span class="ap-ls-val" id="ap-ls-hg" style="color:#0EA5E9">0</span><span class="ap-ls-lbl">HG</span></div><div class="ap-ls-sep"></div>
        <div class="ap-ls-item"><span class="ap-ls-val" id="ap-ls-rules" style="color:#F59E0B">0</span><span class="ap-ls-lbl">Regeln</span></div><div class="ap-ls-sep"></div>
        <div class="ap-ls-item"><span class="ap-ls-val" id="ap-ls-swaps" style="color:#22C55E">0</span><span class="ap-ls-lbl">Swaps</span></div>
      </div>
      <div class="ap-bar-wrap">
        <div class="ap-bar-track"><div class="ap-bar-fill" id="ap-prog-bar"></div><div class="ap-bar-glow" id="ap-prog-glow"></div></div>
        <div class="ap-bar-info"><span class="ap-bar-phase" id="ap-prog-title">Initialisierung</span><span class="ap-bar-pct" id="ap-prog-pct">0%</span></div>
      </div>
      <div class="ap-terminal" id="ap-log">
        <div class="ap-term-header"><span class="ap-term-dot" style="background:#FF5F57"></span><span class="ap-term-dot" style="background:#FFBD2E"></span><span class="ap-term-dot" style="background:#28C840"></span><span class="ap-term-title">RadPlan Auto-Scheduler</span></div>
        <div class="ap-term-body" id="ap-term-body"></div>
      </div>
    </div>`;

  const logContainer = document.getElementById("ap-term-body");
  const barEl = document.getElementById("ap-prog-bar");
  const glowEl = document.getElementById("ap-prog-glow");
  const pctEl = document.getElementById("ap-prog-pct");
  const titleEl = document.getElementById("ap-prog-title");
  const pipeline = document.getElementById("ap-pipeline");
  const log = result.log;
  const phaseNames = {
    init: "Datenanalyse",
    bd_weekend: "BD Wochenende",
    bd_workday: "BD Werktage",
    bd_optimize: "Optimierung",
    hg_bundle: "HG-Bündelung",
    hg_assign: "HG-Verteilung",
    validate: "Validierung",
    done: "Fertig",
  };
  const phaseToNode = {
    init: "init",
    bd_weekend: "bd",
    bd_workday: "bd",
    bd_optimize: "swap",
    hg_bundle: "hg",
    hg_assign: "hg",
    validate: "validate",
    done: "validate",
  };

  let prevPhase = "",
    bdCount = 0,
    hgCount = 0,
    ruleCount = 0,
    swapCount = 0;
  function updateStats() {
    document.getElementById("ap-ls-bd").textContent = bdCount;
    document.getElementById("ap-ls-hg").textContent = hgCount;
    document.getElementById("ap-ls-rules").textContent = ruleCount;
    document.getElementById("ap-ls-swaps").textContent = swapCount;
  }
  function activatePhaseNode(phase) {
    const nodeKey = phaseToNode[phase] || phase;
    pipeline.querySelectorAll(".ap-phase-node").forEach((n) => {
      if (n.dataset.phase === nodeKey) {
        n.classList.add("active");
        n.classList.remove("done");
      } else if (n.classList.contains("active")) {
        n.classList.remove("active");
        n.classList.add("done");
      }
    });
    const nodes = [...pipeline.querySelectorAll(".ap-phase-node")];
    const activeIdx = nodes.findIndex((n) => n.dataset.phase === nodeKey);
    const conns = [...pipeline.querySelectorAll(".ap-phase-conn")];
    conns.forEach((c, i) => c.classList.toggle("done", i < activeIdx));
  }

  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    if (entry.phase !== prevPhase) {
      titleEl.textContent = phaseNames[entry.phase] || entry.phase;
      activatePhaseNode(entry.phase);
      prevPhase = entry.phase;
    }
    barEl.style.width = entry.pct + "%";
    glowEl.style.width = entry.pct + "%";
    pctEl.textContent = entry.pct + "%";
    if (
      entry.icon === "→" &&
      entry.phase.startsWith("bd") &&
      !entry.phase.includes("optimize")
    )
      bdCount++;
    if (entry.icon === "→" && entry.phase.includes("hg")) hgCount++;
    if (
      entry.icon === "🔗" &&
      entry.phase === "hg_bundle" &&
      entry.msg.includes("HG →")
    )
      hgCount++;
    if (
      entry.icon === "📅" ||
      entry.icon === "🔗" ||
      entry.icon === "🏖️" ||
      entry.icon === "⛔" ||
      entry.icon === "🔀"
    )
      ruleCount++;
    if (entry.msg.includes("Swap")) {
      const m2 = entry.msg.match(/(\d+) Swap/);
      if (m2) swapCount += parseInt(m2[1], 10);
      else if (entry.icon === "🔀") swapCount++;
    }
    updateStats();

    const div = document.createElement("div");
    let cls = "ap-log-entry";
    if (entry.icon === "⚠" || entry.icon === "🚨") cls += " ap-log-warn";
    if (entry.icon === "→") cls += " ap-log-assign";
    if (entry.icon === "💡") cls += " ap-log-reason";
    if (entry.icon === "🏖️") cls += " ap-log-vacation";
    if (entry.phase === "hg_bundle" && entry.icon === "🔗")
      cls += " ap-log-bundle";
    if (entry.icon === "✅" || entry.icon === "✓") cls += " ap-log-success";
    if (entry.icon === "🔀") cls += " ap-log-swap";

    div.className = cls;
    div.innerHTML = `<span class="ap-log-icon">${entry.icon}</span><span class="ap-log-msg">${entry.msg}</span>${entry.detail ? `<span class="ap-log-detail">${entry.detail}</span>` : ""}`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;

    const isReason = entry.icon === "💡";
    const isHeader =
      entry.icon !== "→" &&
      entry.icon !== "⚠" &&
      !isReason &&
      entry.icon !== "🔗" &&
      entry.icon !== "🔀";
    const delay =
      entry.phase === "done"
        ? 600
        : isReason
          ? 80
          : isHeader
            ? 300
            : 40 + Math.random() * 80;
    await sleep(delay);
  }
  pipeline.querySelectorAll(".ap-phase-node").forEach((n) => {
    n.classList.remove("active");
    n.classList.add("done");
  });
  pipeline
    .querySelectorAll(".ap-phase-conn")
    .forEach((c) => c.classList.add("done"));
  await sleep(600);
  apViewMode = "result";
  renderResultView();
}

function renderResultView() {
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidays(y);
  const emps = [...planData.employees];
  const dutyEmps = emps.filter((e) => !isDutyExempt(e));
  const { summary } = autoPlanResult;
  const body = document.getElementById("ap-body");
  const applyBtn = document.getElementById("ap-apply");
  const reportBtn = document.getElementById("ap-report-btn");
  applyBtn.style.display = "";
  if (reportBtn) reportBtn.style.display = "inline-flex";

  const dayTag = (d) => {
    const wd = weekday(y, m, d);
    const hol = isHoliday(y, m, d, hols);
    const isWE = wd === 5 || wd === 6 || wd === 0;
    const cls = hol ? " ap-day-hol" : isWE ? " ap-day-we" : "";
    return `<span class="ap-day-tag${cls}">${DOW_ABBR[wd]}\u2009${d}.</span>`;
  };

  let html = `<div class="ap-sect-hd"><span class="ap-sect-badge" style="background:#EF4444;color:#fff">D</span>Bereitschaftsdienst-Verteilung</div>`;
  html += `<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th class="ap-th-name">Mitarbeitende</th><th class="ap-th">Ziel</th><th class="ap-th">Geplant</th><th class="ap-th-days">Tage</th><th class="ap-th">WE</th><th class="ap-th">FT</th></tr></thead><tbody>`;
  dutyEmps.forEach((e) => {
    const bd = summary.bd[e];
    const meta = getEmpMeta(e);
    const pc = posColor(meta.position);
    const ok = bd.count >= bd.target;
    const dayLabels = bd.days.map((d) => dayTag(d)).join("");
    html += `<tr><td class="ap-td-name" style="border-left:3px solid ${pc.border}"><span>${e}</span><span class="ap-pos" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span></td><td class="ap-td ap-td-num">${bd.target}</td><td class="ap-td ap-td-num" style="color:${ok ? "#15803D" : "#DC2626"};font-weight:700">${bd.count}</td><td class="ap-td ap-td-days">${dayLabels || "—"}</td><td class="ap-td ap-td-num" style="color:${bd.weDuty > RELAXED_WEEKEND_DUTY_LIMIT ? "#DC2626" : "#64748B"}">${bd.weDuty}</td><td class="ap-td ap-td-num" style="color:${(bd.holDuty || 0) > 0 ? "#78350F" : "#94A3B8"}">${bd.holDuty || 0}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  html += `<div class="ap-sect-hd" style="margin-top:18px"><span class="ap-sect-badge" style="background:#0EA5E9;color:#fff">HG</span>Hintergrunddienst-Verteilung</div>`;
  html += `<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th class="ap-th-name">Mitarbeitende</th><th class="ap-th">Geplant</th><th class="ap-th-days">Tage</th></tr></thead><tbody>`;
  emps
    .filter((e) => isFacharzt(e) && !isDutyExempt(e))
    .forEach((e) => {
      const hg = summary.hg[e];
      const meta = getEmpMeta(e);
      const pc = posColor(meta.position);
      const dayLabels = hg.days.map((d) => dayTag(d)).join("");
      html += `<tr><td class="ap-td-name" style="border-left:3px solid ${pc.border}"><span>${e}</span><span class="ap-pos" style="background:${pc.bg};color:${pc.fg}">${meta.position}</span></td><td class="ap-td ap-td-num" style="font-weight:700">${hg.count}</td><td class="ap-td ap-td-days">${dayLabels || "—"}</td></tr>`;
    });
  html += `</tbody></table></div>`;

  if (summary.infos && summary.infos.length) {
    html += `<div class="ap-sect-hd" style="margin-top:18px"><span class="ap-sect-badge" style="background:#0EA5E9;color:#fff">i</span>Verteilungs-Details</div><div class="ap-infos">`;
    summary.infos.forEach((i) => {
      html += `<div class="ap-info-item">${i}</div>`;
    });
    html += `</div>`;
  }
  if (summary.warnings.length) {
    html += `<div class="ap-sect-hd" style="margin-top:18px"><span class="ap-sect-badge" style="background:#F97316;color:#fff">!</span>Hinweise</div><div class="ap-warnings">`;
    summary.warnings.forEach((w) => {
      html += `<div class="ap-warn-item">${w}</div>`;
    });
    html += `</div>`;
  }
  html += `<div class="ap-config-actions" style="margin-top:16px"><button class="mbtn mbtn-ghost" id="ap-back-config">Ziele anpassen &amp; neu berechnen</button></div>`;
  body.innerHTML = html;
  document.getElementById("ap-back-config")?.addEventListener("click", () => {
    apViewMode = "config";
    autoPlanResult = null;
    renderAutoPlanModal();
  });
}

function renderReportModal() {
  if (!autoPlanResult || !autoPlanResult.report) return;
  const { year: y, month: m } = state;
  const hols = getSaxonyHolidays(y);
  const body = document.getElementById("ap-report-body");
  body.innerHTML = "";
  const list = document.createElement("div");
  list.className = "ap-report-list";

  autoPlanResult.report.forEach((item) => {
    const wd = weekday(y, m, item.day);
    const dName = DOW_LONG[wd];
    const holNm = hols[dateKey(y, m, item.day)] || "";
    const itemEl = document.createElement("div");
    itemEl.className = "ap-report-item";

    let tagsHtml = "";
    if (item.tags && item.tags.length > 0)
      tagsHtml = `<div class="ap-report-tags">${item.tags.map((t) => `<span class="ap-report-tag">${t}</span>`).join("")}</div>`;

    itemEl.innerHTML = `
      <div class="ap-report-header">
        <span class="ap-report-date">${dName}, ${item.day}. ${MONTHS_SHORT[m]} ${holNm ? "(" + holNm + ")" : ""}</span>
        <span class="ap-report-duty ${item.duty}">${item.duty}</span>
        <span class="ap-report-emp">${item.emp}</span>
      </div>
      <div class="ap-report-body">${item.reason}</div>
      ${tagsHtml}
    `;
    list.appendChild(itemEl);
  });

  body.appendChild(list);
  showOverlay("modal-ap-report");
}

function applyAutoPlan() {
  if (!autoPlanResult || !planMode) return;
  recordPlanHistory();
  planData.assignments = JSON.parse(JSON.stringify(autoPlanResult.assignments));
  const externalAssignments = autoPlanResult.externalAssignments || {};
  let externalChanged = false;
  for (const [mk, empMap] of Object.entries(externalAssignments)) {
    if (!DATA[mk]) {
      DATA[mk] = { employees: [...planData.employees], assignments: {} };
    }
    if (!DATA[mk].employees) DATA[mk].employees = [...planData.employees];
    if (!DATA[mk].assignments) DATA[mk].assignments = {};
    for (const [emp, dayMap] of Object.entries(empMap)) {
      if (!DATA[mk].employees.includes(emp)) DATA[mk].employees.push(emp);
      if (!DATA[mk].assignments[emp]) DATA[mk].assignments[emp] = {};
      for (const [dayStr, patch] of Object.entries(dayMap)) {
        const day = parseInt(dayStr, 10);
        const merged = { ...(DATA[mk].assignments[emp][day] || {}), ...patch };
        Object.keys(merged).forEach((key) => {
          if (!merged[key]) delete merged[key];
        });
        if (Object.keys(merged).length) DATA[mk].assignments[emp][day] = merged;
        else delete DATA[mk].assignments[emp][day];
        externalChanged = true;
      }
    }
  }
  if (externalChanged) saveToStorage();
  recordPlanHistory();
  hideOverlay("modal-autoplan");
  render();
  const dutyEmps = planData.employees.filter((e) => !isDutyExempt(e));
  const totalBD = dutyEmps.reduce(
    (s, e) => s + (autoPlanResult.summary.bd[e]?.count || 0),
    0,
  );
  const totalHG = dutyEmps.reduce(
    (s, e) => s + (autoPlanResult.summary.hg[e]?.count || 0),
    0,
  );
  showToast(`Auto-Plan übernommen: ${totalBD} BD + ${totalHG} HG`);
  autoPlanResult = null;
}

function init() {
  if (IS_MOBILE) document.body.classList.add("is-mobile");
  loadFromStorage();
  const repaired = ensurePostBDFreiDays();
  if (!Object.keys(DATA).length) {
    const k = monthKey(state.year, state.month);
    DATA[k] = {
      employees: [
        "Prof. Schäfer",
        "Dr. Lurz",
        "Dr. Polednia",
        "Fr. Dalitz",
        "Fr. Thaler",
        "Dr. Becker",
        "Dr. Martin",
        "Hr. El Houba",
        "Fr. Licenji",
        "Hr. Torki",
        "Hr. Sebastian",
      ],
      assignments: {},
    };
    saveToStorage();
  }
  wireEvents();
  render();
  if (repaired > 0) showToast(`${repaired} Ruhetage ergänzt`);
}

document.addEventListener("DOMContentLoaded", init);
