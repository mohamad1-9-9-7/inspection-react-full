// src/pages/monitor/branches/pos19/POS19Layout.jsx
// POS 19 — Al Warqa Kitchen — Input forms.
// Collapsible smart sidebar (same shell as QCSReport.jsx), kitchen-tuned.

import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiArchive,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiDroplet,
  FiLink,
  FiPackage,
  FiSearch,
  FiShield,
  FiSliders,
  FiThermometer,
  FiTool,
  FiTruck,
  FiUserCheck,
  FiX,
} from "react-icons/fi";

/* ===== Lazy Inputs ===== */
const CleaningProgrammeScheduleInput = lazy(() => import("./pos19_inputs/CleaningProgrammeScheduleInput"));
const DailyCleaningButcheryInput = lazy(() => import("./pos19_inputs/DailyCleaningButcheryInput"));
const EquipmentInspectionSanitizingLogInput = lazy(() => import("./pos19_inputs/EquipmentInspectionSanitizingLogInput"));
const FoodTemperatureVerificationInput = lazy(() => import("./pos19_inputs/FoodTemperatureVerificationInput"));
const GlassItemsConditionChecklistInput = lazy(() => import("./pos19_inputs/GlassItemsConditionChecklistInput"));
const HotHoldingTemperatureLogInput = lazy(() => import("./pos19_inputs/HotHoldingTemperatureLogInput"));
const OilQualityMonitoringInput = lazy(() => import("./pos19_inputs/OilQualityMonitoringInput"));
const PersonalHygieneChecklistInput = lazy(() => import("./pos19_inputs/PersonalHygieneChecklistInput"));
const ReceivingLogInput = lazy(() => import("./pos19_inputs/ReceivingLogInput"));
const SanitizerConcentrationVerificationInput = lazy(() => import("./pos19_inputs/SanitizerConcentrationVerificationInput"));
const TemperatureMonitoringLogInput = lazy(() => import("./pos19_inputs/TemperatureMonitoringLogInput"));
const TraceabilityLogInput = lazy(() => import("./pos19_inputs/TraceabilityLogInput"));
const WoodenItemsConditionChecklistInput = lazy(() => import("./pos19_inputs/WoodenItemsConditionChecklistInput"));
const CookingTemperatureMonitoringInput = lazy(() => import("./pos19_inputs/CookingTemperatureMonitoringInput"));
const DefrostingRecordInput = lazy(() => import("./pos19_inputs/DefrostingRecordInput"));
const CoolingLogInput = lazy(() => import("./pos19_inputs/CoolingLogInput"));
const ReheatingLogInput = lazy(() => import("./pos19_inputs/ReheatingLogInput"));
const CalibrationLogInput = lazy(() => import("./pos19_inputs/CalibrationLogInput"));
const NonConformanceReportInput = lazy(() => import("./pos19_inputs/NonConformanceReportInput"));
const FinishedProductMonitoringInput = lazy(() => import("./pos19_inputs/FinishedProductMonitoringInput"));
const VegSanitationInput = lazy(() => import("./pos19_inputs/VegSanitationInput"));
const BlastFreezerInput = lazy(() => import("./pos19_inputs/BlastFreezerInput"));
const DryStoreTempHumidityInput = lazy(() => import("./pos19_inputs/DryStoreTempHumidityInput"));
/* نفس نموذجي QCS: مرض الموظفين / إصابات العمل + عودة الموظف للعمل */
const StaffSicknessInput = lazy(() => import("../qcs/StaffSicknessInput"));
const EmployeeReturnToWorkInput = lazy(() => import("../qcs/EmployeeReturnToWorkInput"));

/* Module-level wrappers keep a stable component identity (no remount on re-render). */
const StaffSicknessPOS19 = () => <StaffSicknessInput type="pos19_staff_sickness" reporter="pos19" />;
const ReturnToWorkPOS19  = () => <EmployeeReturnToWorkInput type="pos19_employee_return_to_work" reporter="pos19" />;

/* ===== Brand icon (chef hat) ===== */
const IconChefHat = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 17V12.9A4 4 0 0 1 4.6 5.6a4.2 4.2 0 0 1 3.8-2.5 4.3 4.3 0 0 1 7.2 0 4.2 4.2 0 0 1 3.8 2.5A4 4 0 0 1 18 12.9V17" />
    <path d="M6 17h12v2.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5z" />
  </svg>
);
const IconStar = ({ size = 14, filled }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);

/* ===== Groups (kitchen flow: receive → cook/store → clean → verify) ===== */
const GROUPS = [
  { key: "operations",  label: "RECEIVING & TRACEABILITY", labelAr: "الاستلام والتتبع", color: "#c084fc", Icon: FiTruck },
  { key: "temperature", label: "TEMPERATURE CONTROL",      labelAr: "مراقبة الحرارة",   color: "#38bdf8", Icon: FiThermometer },
  { key: "cleaning",    label: "CLEANING & SANITIZING",    labelAr: "التنظيف والتعقيم", color: "#2dd4bf", Icon: FiDroplet },
  { key: "quality",     label: "QUALITY & COMPLIANCE",     labelAr: "الجودة والامتثال", color: "#f87171", Icon: FiShield },
];

const IconStarFilled = (p) => <IconStar {...p} filled />;

/* ===== Reports ===== */
const TABS = [
  // ── Receiving & Traceability ──
  { key: "receivingLog",           group: "operations",  title: "Receiving Log",                        titleAr: "سجل الاستلام",                          cadence: "Per Delivery", cadenceAr: "لكل استلام",         Icon: FiTruck,        accent: "#7c3aed", Comp: ReceivingLogInput },
  { key: "traceability",           group: "operations",  title: "Traceability Log",                     titleAr: "سجل التتبع",                            cadence: "Per Batch",    cadenceAr: "لكل دفعة",           Icon: FiLink,         accent: "#a855f7", Comp: TraceabilityLogInput },
  { key: "finishedProduct",        group: "operations",  title: "Finished Product Monitoring",          titleAr: "قائمة مراقبة المنتج النهائي",           cadence: "Daily",        cadenceAr: "يومي",               Icon: FiPackage,      accent: "#8b5cf6", Comp: FinishedProductMonitoringInput },

  // ── Temperature Control ──
  { key: "temperatureMonitoring",  group: "temperature", title: "Temperature Monitoring Log",           titleAr: "سجل مراقبة درجات الحرارة",              cadence: "Daily",        cadenceAr: "يومي",               Icon: FiThermometer,  accent: "#0369a1", Comp: TemperatureMonitoringLogInput },
  { key: "foodTempVerification",   group: "temperature", title: "Food Temperature Verification",        titleAr: "سجل التحقق من درجات حرارة الطعام",      cadence: "Daily",        cadenceAr: "يومي",               Icon: FiThermometer,  accent: "#0284c7", Comp: FoodTemperatureVerificationInput },
  { key: "cookingTemperature",     group: "temperature", title: "Cooking Temperature Record",           titleAr: "سجل مراقبة درجة حرارة الطبخ",           cadence: "Per Batch",    cadenceAr: "لكل دفعة",           Icon: FiThermometer,  accent: "#f97316", Comp: CookingTemperatureMonitoringInput },
  { key: "hotHoldingTemp",         group: "temperature", title: "Hot Holding Temperature Log",          titleAr: "سجل مراقبة درجة حرارة الحفظ الساخن",    cadence: "Daily",        cadenceAr: "يومي",               Icon: FiThermometer,  accent: "#ef4444", Comp: HotHoldingTemperatureLogInput },
  { key: "reheating",              group: "temperature", title: "Reheating Temperature Log",            titleAr: "سجل مراقبة درجة حرارة إعادة التسخين",   cadence: "Per Batch",    cadenceAr: "لكل دفعة",           Icon: FiThermometer,  accent: "#fb923c", Comp: ReheatingLogInput },
  { key: "cooling",                group: "temperature", title: "Cooling Temperature Log",              titleAr: "سجل مراقبة درجة حرارة التبريد",         cadence: "Per Batch",    cadenceAr: "لكل دفعة",           Icon: FiThermometer,  accent: "#3b82f6", Comp: CoolingLogInput },
  { key: "defrosting",             group: "temperature", title: "Defrosting Record",                    titleAr: "سجل إذابة التجميد",                     cadence: "Per Batch",    cadenceAr: "لكل دفعة",           Icon: FiThermometer,  accent: "#38bdf8", Comp: DefrostingRecordInput },
  { key: "blastFreezer",           group: "temperature", title: "Blast Freezer / Chiller Log",          titleAr: "سجل التجميد والتبريد السريع",           cadence: "CCP",          cadenceAr: "نقطة تحكم حرجة",     Icon: FiThermometer,  accent: "#0ea5e9", Comp: BlastFreezerInput },
  { key: "dryStore",               group: "temperature", title: "Dry Store Temp & Humidity",            titleAr: "سجل حرارة ورطوبة المخزن الجاف",         cadence: "Daily",        cadenceAr: "يومي",               Icon: FiArchive,      accent: "#78716c", Comp: DryStoreTempHumidityInput },
  { key: "calibration",            group: "temperature", title: "Thermometer Calibration Log",          titleAr: "سجل معايرة موازين الحرارة",             cadence: "Weekly",       cadenceAr: "أسبوعي",             Icon: FiSliders,      accent: "#6366f1", Comp: CalibrationLogInput },

  // ── Cleaning & Sanitizing ──
  { key: "cleaningProgramme",      group: "cleaning",    title: "Cleaning Programme Schedule",          titleAr: "جدول برنامج التنظيف",                   cadence: "Monthly",      cadenceAr: "شهري",               Icon: FiCalendar,     accent: "#0d9488", Comp: CleaningProgrammeScheduleInput },
  { key: "dailyCleaningButchery",  group: "cleaning",    title: "Daily Cleaning — Butchery",            titleAr: "التنظيف اليومي – الملحمة",              cadence: "Daily",        cadenceAr: "يومي",               Icon: FiDroplet,      accent: "#14b8a6", Comp: DailyCleaningButcheryInput },
  { key: "equipmentInspection",    group: "cleaning",    title: "Equipment Inspection & Sanitizing",    titleAr: "سجل فحص وتعقيم المعدات",                cadence: "Every 4 Hours",cadenceAr: "كل 4 ساعات",         Icon: FiTool,         accent: "#0f766e", Comp: EquipmentInspectionSanitizingLogInput },
  { key: "sanitizerConcentration", group: "cleaning",    title: "Sanitizer Concentration",              titleAr: "سجل التحقق من تركيز المطهر",            cadence: "Daily",        cadenceAr: "يومي",               Icon: FiDroplet,      accent: "#06b6d4", Comp: SanitizerConcentrationVerificationInput },
  { key: "vegSanitation",          group: "cleaning",    title: "Sanitation Record — Veg / Fruits",     titleAr: "سجل تعقيم الخضروات والفواكه",           cadence: "CCP",          cadenceAr: "نقطة تحكم حرجة",     Icon: FiDroplet,      accent: "#22c55e", Comp: VegSanitationInput },

  // ── Quality & Compliance ──
  { key: "personalHygiene",        group: "quality",     title: "Personal Hygiene Checklist",           titleAr: "قائمة التحقق من النظافة الشخصية",       cadence: "Daily",        cadenceAr: "يومي",               Icon: FiShield,       accent: "#d97706", Comp: PersonalHygieneChecklistInput },
  { key: "oilQuality",             group: "quality",     title: "Oil Quality Monitoring",               titleAr: "نموذج مراقبة جودة الزيت",               cadence: "Daily",        cadenceAr: "يومي",               Icon: FiActivity,     accent: "#ca8a04", Comp: OilQualityMonitoringInput },
  { key: "glassItemsCondition",    group: "quality",     title: "Glass Items Condition",                titleAr: "قائمة مراقبة حالة الأدوات الزجاجية",    cadence: "Weekly",       cadenceAr: "أسبوعي",             Icon: FiShield,       accent: "#f59e0b", Comp: GlassItemsConditionChecklistInput },
  { key: "woodenItemsCondition",   group: "quality",     title: "Wooden Items Condition",               titleAr: "قائمة مراقبة حالة الأدوات الخشبية",     cadence: "Weekly",       cadenceAr: "أسبوعي",             Icon: FiArchive,      accent: "#b45309", Comp: WoodenItemsConditionChecklistInput },
  { key: "nonConformance",         group: "quality",     title: "Non-Conformance Report",               titleAr: "تقرير عدم المطابقة",                    cadence: "As Needed",    cadenceAr: "عند الحاجة",         Icon: FiAlertTriangle,accent: "#dc2626", Comp: NonConformanceReportInput },
  { key: "staffSickness",          group: "quality",     title: "Staff Sickness / Injury",              titleAr: "مرض الموظفين / إصابات العمل",           cadence: "As Needed",    cadenceAr: "عند الحاجة",         Icon: FiActivity,     accent: "#ec4899", Comp: StaffSicknessPOS19 },
  { key: "employeeReturnToWork",   group: "quality",     title: "Employee Return to Work",              titleAr: "عودة الموظف إلى العمل",                 cadence: "As Needed",    cadenceAr: "عند الحاجة",         Icon: FiUserCheck,    accent: "#10b981", Comp: ReturnToWorkPOS19 },
];

const TAB_IDS = new Set(TABS.map((t) => t.key));
const validTab = (tab) => (TAB_IDS.has(tab) ? tab : TABS[0].key);
const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.key, `${g.label} ${g.labelAr}`]));

/* ===== UI preferences (localStorage — UI only, no report data) ===== */
const LS_PINNED   = "pos19_nav_pinned_v1";
const LS_RECENT   = "pos19_nav_recent_v1";
const LS_GROUPS   = "pos19_nav_closed_groups_v1";
const LS_COLLAPSE = "pos19_nav_collapsed_v1";

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
};
const writeLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ }
};

/* ===== Search (bilingual) ===== */
const norm = (s) =>
  (s || "").toLowerCase().replace(/[_\-/•().]/g, " ").replace(/\s+/g, " ").trim();

const tabHaystack = (tab) =>
  norm(`${tab.title} ${tab.titleAr} ${tab.cadence} ${tab.cadenceAr} ${GROUP_LABEL[tab.group] || ""} ${tab.key}`);

const matchesTokens = (tab, tokens) => {
  if (!tokens.length) return true;
  const hay = tabHaystack(tab);
  return tokens.every((t) => hay.includes(t));
};

/** Wraps matched substrings in <mark> so search hits are visible. */
function Highlight({ text, tokens }) {
  if (!tokens || !tokens.length) return text;
  const lower = text.toLowerCase();
  const hits = [];
  tokens.forEach((t) => {
    let i = lower.indexOf(t);
    while (i !== -1) { hits.push([i, i + t.length]); i = lower.indexOf(t, i + t.length); }
  });
  if (!hits.length) return text;
  hits.sort((a, b) => a[0] - b[0]);
  const merged = [];
  hits.forEach((r) => {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  });
  const out = [];
  let cur = 0;
  merged.forEach(([s, e], i) => {
    if (s > cur) out.push(text.slice(cur, s));
    out.push(<mark className="k19-mark" key={i}>{text.slice(s, e)}</mark>);
    cur = e;
  });
  if (cur < text.length) out.push(text.slice(cur));
  return out;
}

export default function POS19Layout() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [active, setActive] = useState(() => validTab(requestedTab));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readLS(LS_COLLAPSE, false));
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState(() => readLS(LS_PINNED, []));
  const [recent, setRecent] = useState(() => readLS(LS_RECENT, []));
  const [closedGroups, setClosedGroups] = useState(() => readLS(LS_GROUPS, []));
  const [cursor, setCursor] = useState(-1);

  const searchRef = useRef(null);

  useEffect(() => {
    if (requestedTab && TAB_IDS.has(requestedTab)) setActive(requestedTab);
  }, [requestedTab]);

  const activeTab = TABS.find((tb) => tb.key === active) || TABS[0];
  const ActiveComp = activeTab.Comp;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  /* ── Search / filtering ── */
  const tokens = useMemo(() => norm(query).split(" ").filter(Boolean), [query]);
  const searching = tokens.length > 0;
  const results = useMemo(
    () => (searching ? TABS.filter((tb) => matchesTokens(tb, tokens)) : TABS),
    [searching, tokens]
  );

  /* ── Sections to render ── */
  const sections = useMemo(() => {
    if (searching) {
      return [{ key: "__results", label: `RESULTS · ${results.length}`, color: "#f59e0b", Icon: FiSearch, items: results, pinnable: true, collapsible: false }];
    }
    const out = [];
    const pinnedItems = pinned.map((k) => TABS.find((t) => t.key === k)).filter(Boolean);
    if (pinnedItems.length) {
      out.push({ key: "__pinned", label: "PINNED · المثبتة", color: "#facc15", Icon: IconStarFilled, items: pinnedItems, pinnable: true, collapsible: true });
    }
    const recentItems = recent
      .map((k) => TABS.find((t) => t.key === k))
      .filter(Boolean)
      .filter((t) => !pinned.includes(t.key) && t.key !== active)
      .slice(0, 3);
    if (recentItems.length) {
      out.push({ key: "__recent", label: "RECENT · الأخيرة", color: "#94a3b8", Icon: FiClock, items: recentItems, pinnable: false, collapsible: true });
    }
    GROUPS.forEach((g) => {
      const items = TABS.filter((t) => t.group === g.key);
      if (items.length) out.push({ key: g.key, label: g.label, color: g.color, Icon: g.Icon, items, pinnable: true, collapsible: true });
    });
    return out;
  }, [searching, results, pinned, recent, active]);

  /* Flat list of currently visible rows — drives arrow-key navigation. */
  const visibleItems = useMemo(() => {
    const out = [];
    sections.forEach((s) => {
      if (s.collapsible && closedGroups.includes(s.key)) return;
      s.items.forEach((it) => out.push(it));
    });
    return out;
  }, [sections, closedGroups]);

  useEffect(() => { setCursor(searching ? 0 : -1); }, [query, searching]);

  /* ── Actions ── */
  const selectTab = useCallback((key) => {
    setActive(key);
    setRecent((prev) => {
      const next = [key, ...prev.filter((k) => k !== key)].slice(0, 6);
      writeLS(LS_RECENT, next);
      return next;
    });
  }, []);

  const togglePin = useCallback((key, e) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      writeLS(LS_PINNED, next);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((key) => {
    setClosedGroups((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      writeLS(LS_GROUPS, next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => { writeLS(LS_COLLAPSE, !v); return !v; });
  }, []);

  /* ── Ctrl/⌘+K focuses search ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSidebarCollapsed(false);
        writeLS(LS_COLLAPSE, false);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, visibleItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = visibleItems[cursor];
      if (it) { selectTab(it.key); setQuery(""); searchRef.current?.blur(); }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
    }
  };

  /* Keep the keyboard cursor inside the visible scroll area. */
  const cursorRef = useCallback((node) => {
    if (node) node.scrollIntoView({ block: "nearest" });
  }, []);

  const isCCP = activeTab.cadence === "CCP";

  return (
    <div className={`k19-hub ${sidebarCollapsed ? "collapsed" : ""}`}>
      <style>{STYLES}</style>

      {/* ── Sidebar ── */}
      <aside className={`k19-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand */}
        <div className="k19-brand">
          <div className="k19-brand-icon">
            <IconChefHat size={22} />
          </div>
          {!sidebarCollapsed && (
            <div className="k19-brand-text">
              <div className="k19-brand-title">Al Warqa Kitchen</div>
              <div className="k19-brand-sub">POS 19 · Inputs</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="k19-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>

        {/* Search */}
        {sidebarCollapsed ? (
          <button
            className="k19-search-mini"
            title="Search reports (Ctrl+K)"
            onClick={() => {
              setSidebarCollapsed(false);
              writeLS(LS_COLLAPSE, false);
              requestAnimationFrame(() => searchRef.current?.focus());
            }}
          >
            <FiSearch size={18} />
          </button>
        ) : (
          <div className="k19-search">
            <span className="k19-search-icon"><FiSearch size={16} /></span>
            <input
              ref={searchRef}
              className="k19-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search / ابحث عن تقرير…"
              aria-label="Search reports"
            />
            {query ? (
              <button className="k19-search-clear" onClick={() => { setQuery(""); searchRef.current?.focus(); }} title="Clear">
                <FiX size={14} />
              </button>
            ) : (
              <span className="k19-kbd">Ctrl K</span>
            )}
          </div>
        )}

        {/* Nav sections */}
        <nav className="k19-nav">
          {(() => {
            let flatIdx = -1;
            return sections.map((sec) => {
              const isClosed = sec.collapsible && closedGroups.includes(sec.key);
              return (
                <React.Fragment key={sec.key}>
                  {!sidebarCollapsed ? (
                    <div
                      className={`k19-nav-heading ${sec.collapsible ? "toggle" : ""} ${isClosed ? "closed" : ""}`}
                      style={{ "--g": sec.color, "--g-soft": `${sec.color}22` }}
                      onClick={sec.collapsible ? () => toggleGroup(sec.key) : undefined}
                      role={sec.collapsible ? "button" : undefined}
                      title={sec.collapsible ? (isClosed ? "Expand section" : "Collapse section") : undefined}
                    >
                      {sec.collapsible && (
                        <span className="k19-heading-chev"><FiChevronDown size={12} /></span>
                      )}
                      <span className="k19-heading-icon"><sec.Icon size={11} /></span>
                      <span className="k19-heading-label">{sec.label}</span>
                      <span className="k19-heading-count">{sec.items.length}</span>
                    </div>
                  ) : (
                    <div className="k19-nav-divider" />
                  )}

                  {!isClosed && sec.items.map((tab) => {
                    flatIdx += 1;
                    const idx = flatIdx;
                    const isActive = tab.key === active;
                    const isCursor = searching && idx === cursor;
                    const isPinned = pinned.includes(tab.key);
                    const critical = tab.cadence === "CCP";
                    return (
                      <button
                        key={`${sec.key}:${tab.key}`}
                        ref={isCursor ? cursorRef : undefined}
                        className={`k19-nav-item ${isActive ? "active" : ""} ${isCursor ? "cursor" : ""}`}
                        onClick={() => selectTab(tab.key)}
                        title={`${tab.title} / ${tab.titleAr}`}
                        style={isActive ? { "--accent": tab.accent } : undefined}
                      >
                        <span className="k19-nav-icon" style={{ color: tab.accent }}>
                          <tab.Icon size={19} />
                        </span>
                        {!sidebarCollapsed && (
                          <>
                            <span className="k19-nav-text">
                              <span className="k19-nav-title">
                                <Highlight text={tab.title} tokens={tokens} />
                              </span>
                              <span className="k19-nav-sub" dir="rtl">
                                <Highlight text={tab.titleAr} tokens={tokens} />
                              </span>
                              <span className="k19-nav-meta">
                                <span className={`k19-cadence ${critical ? "ccp" : ""}`} title={`${tab.cadence} / ${tab.cadenceAr}`}>
                                  {tab.cadence}
                                </span>
                                {sec.pinnable && (
                                  <span
                                    role="button"
                                    tabIndex={-1}
                                    className={`k19-pin ${isPinned ? "on" : ""}`}
                                    onClick={(e) => togglePin(tab.key, e)}
                                    title={isPinned ? "Unpin" : "Pin to top"}
                                  >
                                    <IconStar size={14} filled={isPinned} />
                                  </span>
                                )}
                              </span>
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}

          {searching && results.length === 0 && (
            <div className="k19-empty">
              <FiSearch size={22} />
              <div className="k19-empty-title">No reports match “{query}”</div>
              <div className="k19-empty-sub" dir="rtl">لا توجد تقارير مطابقة</div>
              <button className="k19-empty-btn" onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="k19-sidebar-footer">
            <div className="k19-footer-pill">
              <span className="k19-pulse" />
              TRANS EMIRATES
            </div>
            <div className="k19-footer-sub">
              {TABS.length} reports{pinned.length ? ` · ${pinned.length} pinned` : ""}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="k19-main">
        {/* Top bar */}
        <header className="k19-topbar">
          <div className="k19-topbar-left">
            <div
              className="k19-topbar-icon"
              style={{ background: `${activeTab.accent}15`, color: activeTab.accent }}
            >
              <activeTab.Icon size={22} />
            </div>
            <div>
              <div className="k19-topbar-title">{activeTab.title}</div>
              <div className="k19-topbar-sub" dir="rtl">{activeTab.titleAr}</div>
            </div>
            <span className={`k19-topbar-cadence ${isCCP ? "ccp" : ""}`}>
              {activeTab.cadence} · {activeTab.cadenceAr}
            </span>
          </div>
          <div className="k19-topbar-right">
            <div className="k19-date-chip">
              <FiClock size={13} />
              {today}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="k19-breadcrumb">
          <span>POS 19</span>
          <span className="k19-sep">›</span>
          <span>Al Warqa Kitchen</span>
          <span className="k19-sep">›</span>
          <span className="k19-current" style={{ color: activeTab.accent }}>{activeTab.title}</span>
        </div>

        {/* Content panel */}
        <section className="k19-panel">
          <Suspense fallback={
            <div className="k19-loading">
              <div className="k19-spinner" />
              <span>Loading… / جارٍ التحميل</span>
            </div>
          }>
            <ActiveComp />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .k19-hub {
    --brand:    #b45309;
    --brand-2:  #f59e0b;
    --ink:      #0f172a;
    --muted:    #64748b;
    --border:   #e2e8f0;
    --canvas:   #f8fafc;
    --surface:  #ffffff;
    --sb-w:     304px;

    display: block;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--canvas);
    color: var(--ink);
    direction: ltr;
  }
  .k19-hub.collapsed { --sb-w: 76px; }

  /* ── Sidebar ── */
  .k19-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sb-w);
    height: 100vh;
    z-index: 40;
    background: linear-gradient(180deg, #1c1917 0%, #292524 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 18px 12px;
    gap: 4px;
    transition: width .2s ease;
  }
  .k19-sidebar.collapsed { padding: 18px 8px; }

  .k19-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 8px 18px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    margin-bottom: 6px;
    flex-shrink: 0;
  }
  .k19-brand-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    box-shadow: 0 8px 20px rgba(245,158,11,.28);
    flex-shrink: 0;
  }
  .k19-brand-text { overflow: hidden; }
  .k19-brand-title {
    font-size: 15px; font-weight: 800;
    letter-spacing: -.01em;
    white-space: nowrap;
  }
  .k19-brand-sub {
    font-size: 11px; color: #a8a29e;
    margin-top: 2px; white-space: nowrap;
    text-transform: uppercase; letter-spacing: .08em;
    font-weight: 600;
  }

  .k19-collapse-btn {
    position: absolute;
    top: 22px; right: -12px;
    width: 24px; height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--muted);
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    z-index: 10;
  }
  .k19-collapse-btn:hover { color: var(--brand); border-color: var(--brand-2); }

  /* ── Search ── */
  .k19-search {
    position: relative;
    display: flex; align-items: center;
    margin: 4px 4px 8px;
    flex-shrink: 0;
  }
  .k19-search-icon {
    position: absolute; left: 10px;
    display: flex; color: #78716c;
    pointer-events: none;
  }
  .k19-search-input {
    width: 100%;
    padding: 9px 62px 9px 34px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.05);
    color: #fff;
    font-family: inherit;
    font-size: 12.5px; font-weight: 600;
    outline: none;
    transition: border-color .15s, background .15s;
  }
  .k19-search-input::placeholder { color: #78716c; font-weight: 500; }
  .k19-search-input:focus {
    border-color: var(--brand-2);
    background: rgba(255,255,255,.08);
    box-shadow: 0 0 0 3px rgba(245,158,11,.14);
  }
  .k19-search-clear {
    position: absolute; right: 8px;
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    border: none; border-radius: 50%;
    background: rgba(255,255,255,.10);
    color: #d6d3d1;
    cursor: pointer;
  }
  .k19-search-clear:hover { background: rgba(255,255,255,.2); color: #fff; }
  .k19-kbd {
    position: absolute; right: 8px;
    font-size: 9.5px; font-weight: 800;
    letter-spacing: .04em;
    color: #78716c;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 5px;
    padding: 2px 5px;
    pointer-events: none;
  }
  .k19-search-mini {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 38px;
    margin: 2px auto 8px;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 10px;
    background: rgba(255,255,255,.05);
    color: #a8a29e;
    cursor: pointer;
    flex-shrink: 0;
  }
  .k19-search-mini:hover { color: #fff; border-color: var(--brand-2); }

  .k19-mark {
    background: rgba(245,158,11,.30);
    color: #fef3c7;
    border-radius: 3px;
    padding: 0 1px;
  }

  /* ── Nav ── */
  /* Section headings are colour-coded and badged so groups are easy to tell apart. */
  .k19-nav-heading {
    display: flex; align-items: center; gap: 7px;
    font-size: 10px; font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--g, #78716c);
    padding: 5px 8px;
    margin-top: 14px;
    border-radius: 8px;
    border-left: 2px solid var(--g, transparent);
    background: linear-gradient(90deg, var(--g-soft, transparent) 0%, transparent 75%);
    flex-shrink: 0;
    user-select: none;
  }
  .k19-nav-heading:first-child { margin-top: 0; }
  .k19-nav-heading.toggle { cursor: pointer; transition: filter .15s; }
  .k19-nav-heading.toggle:hover { filter: brightness(1.18); }

  .k19-heading-chev {
    display: flex; flex-shrink: 0;
    opacity: .75;
    transition: transform .18s ease;
  }
  .k19-nav-heading.closed .k19-heading-chev { transform: rotate(-90deg); }

  .k19-heading-icon {
    display: flex; align-items: center; justify-content: center;
    width: 19px; height: 19px;
    border-radius: 6px;
    background: var(--g-soft, rgba(255,255,255,.07));
    color: var(--g, #a8a29e);
    flex-shrink: 0;
  }

  .k19-heading-label {
    flex: 1;
    min-width: 0;
    line-height: 1.25;
  }
  .k19-heading-count {
    font-size: 9.5px; font-weight: 800;
    background: var(--g-soft, rgba(255,255,255,.07));
    color: var(--g, #a8a29e);
    border-radius: 999px;
    padding: 1.5px 7px;
    flex-shrink: 0;
  }

  .k19-nav-divider {
    height: 1px;
    background: rgba(255,255,255,.08);
    margin: 8px 6px;
    flex-shrink: 0;
  }
  .k19-nav-divider:first-child { display: none; }

  .k19-nav {
    display: flex; flex-direction: column;
    gap: 6px;
    padding-bottom: 6px;
    flex: 1 1 auto;
    min-height: 0;                 /* lets the flex child shrink & scroll */
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;  /* sidebar scroll never chains to the report */
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.18) transparent;
  }
  .k19-nav::-webkit-scrollbar { width: 6px; }
  .k19-nav::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.15);
    border-radius: 999px;
  }

  .k19-nav-item {
    position: relative;
    display: flex; align-items: flex-start;
    gap: 11px;
    padding: 11px 12px;
    flex-shrink: 0;   /* never squash a row — the nav scrolls instead */
    border: none;
    border-radius: 11px;
    background: rgba(255,255,255,.022);
    color: #d6d3d1;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background .15s ease, color .15s ease, box-shadow .15s ease;
    overflow: hidden;
  }
  .k19-nav-item:hover { background: rgba(255,255,255,.06); color: #fff; }
  .k19-nav-item.active { background: rgba(255,255,255,.09); color: #fff; }
  .k19-nav-item.active .k19-nav-icon { background: rgba(255,255,255,.08); }
  .k19-nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 18%; bottom: 18%;
    width: 3px;
    background: var(--accent, var(--brand-2));
    border-radius: 0 3px 3px 0;
  }
  .k19-nav-item.cursor {
    background: rgba(245,158,11,.14);
    box-shadow: inset 0 0 0 1px rgba(245,158,11,.45);
    color: #fff;
  }

  .k19-nav-icon {
    width: 34px; height: 34px;
    border-radius: 9px;
    background: rgba(255,255,255,.04);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }

  /* Each line gets the full width of the text column — nothing competes
     for horizontal space, so neither language has to truncate. */
  .k19-nav-text {
    display: flex; flex-direction: column;
    min-width: 0; flex: 1;
  }
  .k19-nav-title {
    font-size: 12.5px; font-weight: 700;
    line-height: 1.35;
    letter-spacing: -.005em;
    white-space: normal;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .k19-nav-sub {
    margin-top: 4px;
    min-width: 0;
    font-size: 11px; font-weight: 500;
    line-height: 1.5;
    color: #a8a29e;
    white-space: normal;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .k19-nav-meta {
    display: flex; align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 7px;
    min-width: 0;
  }
  .k19-cadence {
    font-size: 8.5px; font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #a8a29e;
    background: rgba(255,255,255,.07);
    border-radius: 5px;
    padding: 2.5px 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .k19-cadence.ccp {
    background: rgba(220,38,38,.22);
    color: #fca5a5;
  }

  /* Pin (star) — sits at the end of the meta line */
  .k19-pin {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    margin: -3px -3px -3px 0;
    border-radius: 6px;
    color: #ffffff;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity .15s, color .15s, background .15s;
  }
  .k19-nav-item:hover .k19-pin { opacity: 1; }
  .k19-pin:hover { background: rgba(255,255,255,.12); color: #fbbf24; }
  .k19-pin.on { opacity: 1; color: #fbbf24; }

  /* Empty state */
  .k19-empty {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px;
    padding: 30px 14px;
    color: #78716c;
    text-align: center;
  }
  .k19-empty-title { font-size: 12px; font-weight: 700; color: #a8a29e; }
  .k19-empty-sub { font-size: 11px; font-weight: 600; }
  .k19-empty-btn {
    margin-top: 4px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.05);
    color: #d6d3d1;
    border-radius: 8px;
    padding: 5px 12px;
    font-family: inherit;
    font-size: 11px; font-weight: 700;
    cursor: pointer;
  }
  .k19-empty-btn:hover { background: rgba(255,255,255,.1); color: #fff; }

  .k19-sidebar-footer {
    padding: 12px 8px 4px;
    border-top: 1px solid rgba(255,255,255,.08);
    margin-top: 10px;
    flex-shrink: 0;
  }
  .k19-footer-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(245,158,11,.15);
    color: #fcd34d;
    font-size: 11px; font-weight: 800;
    letter-spacing: .05em;
  }
  .k19-pulse {
    width: 6px; height: 6px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(34,197,94,.7);
    animation: k19-pulse 2s infinite;
  }
  @keyframes k19-pulse {
    70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  .k19-footer-sub {
    font-size: 10px;
    color: #a8a29e;
    margin-top: 6px;
    padding: 0 2px;
  }

  /* ── Main ── */
  .k19-main {
    margin-left: var(--sb-w);
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 100vh;
    overflow-x: hidden;
    transition: margin-left .2s ease;
  }

  .k19-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .k19-topbar-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .k19-topbar-icon {
    width: 46px; height: 46px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .k19-topbar-title {
    font-size: 18px; font-weight: 800;
    letter-spacing: -.01em;
  }
  .k19-topbar-sub {
    font-size: 12.5px; color: var(--muted);
    margin-top: 2px;
    font-weight: 600;
  }
  .k19-topbar-cadence {
    font-size: 10.5px; font-weight: 800;
    letter-spacing: .03em;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
    white-space: nowrap;
  }
  .k19-topbar-cadence.ccp {
    background: #fff1f2;
    border-color: #fecdd3;
    color: #be123c;
  }

  .k19-topbar-right { display: flex; align-items: center; gap: 10px; }

  .k19-date-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--canvas);
    border: 1px solid var(--border);
    font-size: 12px; font-weight: 700;
    color: var(--muted);
    letter-spacing: .01em;
  }

  .k19-breadcrumb {
    padding: 14px 24px 0;
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600;
    color: var(--muted);
  }
  .k19-sep { color: #cbd5e1; }
  .k19-current { font-weight: 800; }

  /* ── Panel ── */
  .k19-panel {
    margin: 14px 24px 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    min-height: 60vh;
    overflow: hidden;
  }

  .k19-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px;
    padding: 80px 20px;
    color: var(--muted);
    font-weight: 700;
  }
  .k19-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--brand-2);
    border-radius: 50%;
    animation: k19-spin .8s linear infinite;
  }
  @keyframes k19-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 980px) {
    .k19-sidebar {
      position: sticky;
      top: 0;
      width: 100% !important;
      height: auto;
      padding: 14px;
    }
    .k19-collapse-btn { display: none; }
    .k19-brand { padding-bottom: 12px; margin-bottom: 8px; }
    .k19-nav { flex-direction: row; overflow-x: auto; overflow-y: hidden; gap: 8px; padding-bottom: 0; }
    .k19-nav-item { flex-shrink: 0; padding: 8px 12px; align-items: center; }
    .k19-nav-text { display: none; }
    .k19-nav-heading { display: none; }
    .k19-nav-divider { display: none; }
    .k19-empty { display: none; }
    .k19-sidebar-footer { display: none; }
    .k19-main { margin-left: 0; }
    .k19-topbar { padding: 12px 16px; }
    .k19-panel { margin: 10px 12px 14px; border-radius: 12px; }
    .k19-breadcrumb { padding: 10px 16px 0; }
  }
`;
