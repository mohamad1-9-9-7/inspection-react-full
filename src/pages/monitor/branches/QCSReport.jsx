// src/pages/monitor/branches/QCSReport.jsx
// Redesigned — Professional collapsible sidebar layout for QCS inputs
// (same shell as production/ProductionHub.jsx)

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";

/* ===== Lazy Inputs ===== */
const QCSRawMaterialInspection      = lazy(() => import("./shipment_recc/QCSRawMaterialInspection"));
const CoolersTab                    = lazy(() => import("./qcs/CoolersTab"));
const PersonalHygieneTab            = lazy(() => import("./qcs/PersonalHygieneTab"));
const DailyCleanlinessTab           = lazy(() => import("./qcs/DailyCleanlinessTab"));
const FreshChickenInter             = lazy(() => import("./qcs/FreshChickenInter"));
const MamzarMeatInspection          = lazy(() => import("./qcs/MeatProductInspectionReport"));      // FTR 2 (Mamzar)
const MushrifMeatInspection         = lazy(() => import("./qcs/MeatProductInspectionReportFTR1"));  // FTR 1 (Mushrif)
const RMInspectionReportIngredients = lazy(() => import("./qcs/RMInspectionReportIngredients"));
const RMInspectionReportPackaging   = lazy(() => import("./qcs/RMInspectionReportPackaging"));
const NonConformanceReportInput     = lazy(() => import("./qcs/NonConformanceReportInput"));
const CorrectiveActionReportInput   = lazy(() => import("./qcs/CorrectiveActionReportInput"));
const InternalAuditInput            = lazy(() => import("./qcs/InternalAuditInput"));
const GarbageDisposalInput          = lazy(() => import("./qcs/GarbageDisposalInput"));
const MeatWasteDisposalInput        = lazy(() => import("./qcs/MeatWasteDisposalInput"));
const PestControlInput              = lazy(() => import("./qcs/PestControlInput"));
const StockRotationInput            = lazy(() => import("./qcs/StockRotationInput"));
const VisitorChecklistInput         = lazy(() => import("./qcs/VisitorChecklistInput"));
const StaffSicknessInput            = lazy(() => import("./qcs/StaffSicknessInput"));
const EmployeeReturnToWorkInput     = lazy(() => import("./qcs/EmployeeReturnToWorkInput"));
const ProductRejectionInput         = lazy(() => import("./qcs/ProductRejectionInput"));

/* ===== Icons (modern stroke icons) ===== */
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconShield    = (p) => <Icon {...p}><path d="M12 2l8 4v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></Icon>;
const IconBox       = (p) => <Icon {...p}><path d="M21 8l-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Icon>;
const IconSnow      = (p) => <Icon {...p}><path d="M12 2v20" /><path d="M4.2 4.2l15.6 15.6" /><path d="M19.8 4.2L4.2 19.8" /><circle cx="12" cy="12" r="2" /></Icon>;
const IconHygiene   = (p) => <Icon {...p}><circle cx="12" cy="7" r="4" /><path d="M5 22v-2a7 7 0 0 1 14 0v2" /><path d="M12 11v2" /></Icon>;
const IconCleaning  = (p) => <Icon {...p}><path d="M3 21h18" /><rect x="7" y="13" width="10" height="8" rx="1" /><path d="M12 13V3" /><path d="M9 6h6" /></Icon>;
const IconChicken   = (p) => <Icon {...p}><path d="M15 3a6 6 0 0 0-6 6c0 1.4-.6 2.3-1.6 3.3l-2 2a3.3 3.3 0 0 0 4.6 4.6l2-2C13 16 13.9 15.4 15.3 15A6 6 0 0 0 15 3Z" /><path d="M7.5 16.5 4 20" /></Icon>;
const IconTruck     = (p) => <Icon {...p}><path d="M1 3h13v13H1z" /><path d="M14 8h4l3 3v5h-7z" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></Icon>;
const IconFlask     = (p) => <Icon {...p}><path d="M9 2h6" /><path d="M10 2v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9.5V2" /><path d="M7 15h10" /></Icon>;
const IconPackage   = (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 12h18" /><path d="M12 7V4" /><path d="M8 4h8" /></Icon>;
const IconAlert     = (p) => <Icon {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Icon>;
const IconWrench    = (p) => <Icon {...p}><path d="M14.7 6.3a4 4 0 0 0 5.3 5.3l-8.4 8.4a2.8 2.8 0 0 1-4-4Z" /><path d="M18 2l4 4-2.5 2.5" /></Icon>;
const IconClipboard = (p) => <Icon {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14l2 2 4-4" /></Icon>;
const IconTrash     = (p) => <Icon {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Icon>;
const IconMeat      = (p) => <Icon {...p}><path d="M13.5 3A7.5 7.5 0 0 0 6 10.5c0 2-1 3-2 4a3.5 3.5 0 0 0 5 5c1-1 2-2 4-2A7.5 7.5 0 0 0 13.5 3Z" /><circle cx="13" cy="10" r="2.5" /></Icon>;
const IconBug       = (p) => <Icon {...p}><rect x="8" y="6" width="8" height="14" rx="4" /><path d="M9 6a3 3 0 0 1 6 0" /><path d="M3 10h5M16 10h5M3 16h5M16 16h5M5 6l3 2M19 6l-3 2M5 20l3-2M19 20l-3-2" /></Icon>;
const IconRotate    = (p) => <Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></Icon>;
const IconUserCheck = (p) => <Icon {...p}><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a6 6 0 0 1 6-6h2" /><path d="M15 18l2 2 5-5" /></Icon>;
const IconHealth    = (p) => <Icon {...p}><path d="M3 12h4l2-5 3 10 2-5h7" /></Icon>;
const IconReturn    = (p) => <Icon {...p}><path d="M3 21V9l9-6 9 6v12z" /><path d="M12 11v6M9 14h6" /></Icon>;
const IconReject    = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></Icon>;
const IconSearch    = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
const IconClose     = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>;
const IconChevron   = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
const IconStar      = ({ size = 14, filled }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
const IconStarFilled = (p) => <IconStar {...p} filled />;
const IconClock     = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;

/* ===== Tabs ===== */
const TABS = [
  // ── Receiving & Storage ──
  { key: "shipment",             group: "receiving",  title: "Raw Material Receipt",   subtitle: "Shipment inspection",          Icon: IconBox,       accent: "#0ea5e9", Comp: QCSRawMaterialInspection },
  { key: "coolers",              group: "receiving",  title: "Coolers Temperatures",   subtitle: "Cold chain monitoring",        Icon: IconSnow,      accent: "#3b82f6", Comp: CoolersTab },
  { key: "stockRotation",        group: "receiving",  title: "Stock Rotation",         subtitle: "FIFO / FEFO log",              Icon: IconRotate,    accent: "#6366f1", Comp: StockRotationInput },

  // ── Hygiene & Cleaning ──
  { key: "personalHygiene",      group: "hygiene",    title: "Personal Hygiene",       subtitle: "Employee checklist",           Icon: IconHygiene,   accent: "#14b8a6", Comp: PersonalHygieneTab },
  { key: "dailyCleanliness",     group: "hygiene",    title: "Daily Cleanliness",      subtitle: "Facility cleaning record",     Icon: IconCleaning,  accent: "#22c55e", Comp: DailyCleanlinessTab },
  { key: "visitorChecklist",     group: "hygiene",    title: "Visitor Checklist",      subtitle: "Entry screening",              Icon: IconUserCheck, accent: "#84cc16", Comp: VisitorChecklistInput },

  // ── Product Inspection ──
  { key: "qusaisFreshChicken",   group: "inspection", title: "Fresh Chicken",          subtitle: "Al Qusais receiving",          Icon: IconChicken,   accent: "#f59e0b", Comp: FreshChickenInter },
  { key: "meatInspectionMamzar", group: "inspection", title: "Meat Inspection FTR 2",  subtitle: "Mamzar Park • pre-loading",     Icon: IconTruck,     accent: "#e11d48", Comp: MamzarMeatInspection },
  { key: "meatInspectionMushrif",group: "inspection", title: "Meat Inspection FTR 1",  subtitle: "Mushrif Park • pre-loading",    Icon: IconTruck,     accent: "#be123c", Comp: MushrifMeatInspection },
  { key: "physical_ing",         group: "inspection", title: "Physical — Ingredients", subtitle: "Ingredient inspection report",  Icon: IconFlask,     accent: "#a855f7", Comp: RMInspectionReportIngredients },
  { key: "physical_pack",        group: "inspection", title: "Physical — Packaging",   subtitle: "Packaging inspection report",   Icon: IconPackage,   accent: "#8b5cf6", Comp: RMInspectionReportPackaging },

  // ── Quality & Compliance ──
  { key: "nonConformance",       group: "quality",    title: "Non-Conformance",        subtitle: "NCR report",                   Icon: IconAlert,     accent: "#f97316", Comp: NonConformanceReportInput },
  { key: "car",                  group: "quality",    title: "Corrective Action",      subtitle: "CAPA report",                  Icon: IconWrench,    accent: "#0891b2", Comp: CorrectiveActionReportInput },
  { key: "internalAudit",        group: "quality",    title: "Internal Audit",         subtitle: "Audit checklist",              Icon: IconClipboard, accent: "#0f766e", Comp: InternalAuditInput },
  { key: "productRejection",     group: "quality",    title: "Product Rejection",      subtitle: "Rejection report",             Icon: IconReject,    accent: "#dc2626", Comp: ProductRejectionInput },

  // ── Waste & Pest ──
  { key: "garbageDisposal",      group: "waste",      title: "Garbage Disposal",       subtitle: "Daily disposal log",           Icon: IconTrash,     accent: "#64748b", Comp: GarbageDisposalInput },
  { key: "meatWasteDisposal",    group: "waste",      title: "Meat Waste Disposal",    subtitle: "Condemned product log",        Icon: IconMeat,      accent: "#b45309", Comp: MeatWasteDisposalInput },
  { key: "pestControl",          group: "waste",      title: "Pest Control",           subtitle: "Monitoring log",               Icon: IconBug,       accent: "#7c3aed", Comp: PestControlInput },

  // ── People & Health ──
  { key: "staffSickness",        group: "people",     title: "Staff Sickness",         subtitle: "Illness / occupational injury",Icon: IconHealth,    accent: "#ec4899", Comp: StaffSicknessInput },
  { key: "returnToWork",         group: "people",     title: "Return to Work",         subtitle: "Fitness clearance",            Icon: IconReturn,    accent: "#10b981", Comp: EmployeeReturnToWorkInput },
];

const GROUPS = [
  { key: "receiving",  label: "RECEIVING & STORAGE",  color: "#60a5fa", Icon: IconBox },
  { key: "hygiene",    label: "HYGIENE & CLEANING",   color: "#2dd4bf", Icon: IconCleaning },
  { key: "inspection", label: "PRODUCT INSPECTION",   color: "#fbbf24", Icon: IconFlask },
  { key: "quality",    label: "QUALITY & COMPLIANCE", color: "#c084fc", Icon: IconClipboard },
  { key: "waste",      label: "WASTE & PEST",         color: "#f97316", Icon: IconTrash },
  { key: "people",     label: "PEOPLE & HEALTH",      color: "#f472b6", Icon: IconHealth },
];

const QCS_TAB_IDS = new Set(TABS.map((t) => t.key));
const validQcsTab = (tab) => (QCS_TAB_IDS.has(tab) ? tab : "shipment");

const GROUP_LABEL = Object.fromEntries(GROUPS.map((g) => [g.key, g.label]));

/* ===== UI preferences (localStorage — UI only, no report data) ===== */
const LS_PINNED   = "qcs_nav_pinned_v1";
const LS_RECENT   = "qcs_nav_recent_v1";
const LS_GROUPS   = "qcs_nav_closed_groups_v1";
const LS_COLLAPSE = "qcs_nav_collapsed_v1";

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
};
const writeLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ }
};

/* ===== Search ===== */
const norm = (s) =>
  (s || "").toLowerCase().replace(/[_\-/•().]/g, " ").replace(/\s+/g, " ").trim();

const tabHaystack = (tab) =>
  norm(`${tab.title} ${tab.subtitle} ${GROUP_LABEL[tab.group] || ""} ${tab.key}`);

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
    out.push(<mark className="qcs-mark" key={i}>{text.slice(s, e)}</mark>);
    cur = e;
  });
  if (cur < text.length) out.push(text.slice(cur));
  return out;
}

export default function QCSReport() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [active, setActive] = useState(() => validQcsTab(requestedTab));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readLS(LS_COLLAPSE, false));
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState(() => readLS(LS_PINNED, []));
  const [recent, setRecent] = useState(() => readLS(LS_RECENT, []));
  const [closedGroups, setClosedGroups] = useState(() => readLS(LS_GROUPS, []));
  const [cursor, setCursor] = useState(-1);

  const searchRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (requestedTab && QCS_TAB_IDS.has(requestedTab)) setActive(requestedTab);
  }, [requestedTab]);

  const activeTab = TABS.find((tb) => tb.key === active) || TABS[0];
  const ActiveComp = activeTab.Comp;

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
      return [{
        key: "__results",
        label: `RESULTS · ${results.length}`,
        color: "#22d3ee",
        Icon: IconSearch,
        items: results,
        pinnable: true,
        collapsible: false,
      }];
    }
    const out = [];
    const pinnedItems = pinned.map((k) => TABS.find((t) => t.key === k)).filter(Boolean);
    if (pinnedItems.length) {
      out.push({ key: "__pinned", label: "PINNED", color: "#facc15", Icon: IconStarFilled, items: pinnedItems, pinnable: true, collapsible: true });
    }
    const recentItems = recent
      .map((k) => TABS.find((t) => t.key === k))
      .filter(Boolean)
      .filter((t) => !pinned.includes(t.key) && t.key !== active)
      .slice(0, 3);
    if (recentItems.length) {
      out.push({ key: "__recent", label: "RECENT", color: "#94a3b8", Icon: IconClock, items: recentItems, pinnable: false, collapsible: true });
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

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className={`qcs-hub ${sidebarCollapsed ? "collapsed" : ""}`}>
      <style>{STYLES}</style>

      {/* ── Sidebar ── */}
      <aside className={`qcs-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand */}
        <div className="qcs-brand">
          <div className="qcs-brand-icon">
            <IconShield size={22} />
          </div>
          {!sidebarCollapsed && (
            <div className="qcs-brand-text">
              <div className="qcs-brand-title">QCS</div>
              <div className="qcs-brand-sub">Daily Inputs</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="qcs-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>

        {/* Search */}
        {sidebarCollapsed ? (
          <button
            className="qcs-search-mini"
            title="Search forms (Ctrl+K)"
            onClick={() => {
              setSidebarCollapsed(false);
              writeLS(LS_COLLAPSE, false);
              requestAnimationFrame(() => searchRef.current?.focus());
            }}
          >
            <IconSearch size={18} />
          </button>
        ) : (
          <div className="qcs-search">
            <span className="qcs-search-icon"><IconSearch size={16} /></span>
            <input
              ref={searchRef}
              className="qcs-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search forms…"
              aria-label="Search forms"
            />
            {query ? (
              <button className="qcs-search-clear" onClick={() => { setQuery(""); searchRef.current?.focus(); }} title="Clear">
                <IconClose size={14} />
              </button>
            ) : (
              <span className="qcs-kbd">Ctrl K</span>
            )}
          </div>
        )}

        {/* Nav sections */}
        <nav className="qcs-nav" ref={navRef}>
          {(() => {
            let flatIdx = -1;
            return sections.map((sec) => {
              const isClosed = sec.collapsible && closedGroups.includes(sec.key);
              return (
                <React.Fragment key={sec.key}>
                  {!sidebarCollapsed ? (
                    <div
                      className={`qcs-nav-heading ${sec.collapsible ? "toggle" : ""} ${isClosed ? "closed" : ""}`}
                      style={{ "--g": sec.color, "--g-soft": `${sec.color}22` }}
                      onClick={sec.collapsible ? () => toggleGroup(sec.key) : undefined}
                      role={sec.collapsible ? "button" : undefined}
                      title={sec.collapsible ? (isClosed ? "Expand section" : "Collapse section") : undefined}
                    >
                      {sec.collapsible && (
                        <span className="qcs-heading-chev"><IconChevron size={12} /></span>
                      )}
                      <span className="qcs-heading-icon"><sec.Icon size={11} /></span>
                      <span className="qcs-heading-label">{sec.label}</span>
                      <span className="qcs-heading-count">{sec.items.length}</span>
                    </div>
                  ) : (
                    <div className="qcs-nav-divider" />
                  )}

                  {!isClosed && sec.items.map((tab) => {
                    flatIdx += 1;
                    const idx = flatIdx;
                    const isActive = tab.key === active;
                    const isCursor = searching && idx === cursor;
                    const isPinned = pinned.includes(tab.key);
                    return (
                      <button
                        key={`${sec.key}:${tab.key}`}
                        ref={isCursor ? cursorRef : undefined}
                        className={`qcs-nav-item ${isActive ? "active" : ""} ${isCursor ? "cursor" : ""}`}
                        onClick={() => selectTab(tab.key)}
                        title={sidebarCollapsed ? tab.title : ""}
                        style={isActive ? { "--accent": tab.accent } : undefined}
                      >
                        <span className="qcs-nav-icon" style={{ color: tab.accent }}>
                          <tab.Icon size={20} />
                        </span>
                        {!sidebarCollapsed && (
                          <>
                            <span className="qcs-nav-text">
                              <span className="qcs-nav-title">
                                <Highlight text={tab.title} tokens={tokens} />
                              </span>
                              <span className="qcs-nav-sub">
                                <Highlight text={tab.subtitle} tokens={tokens} />
                              </span>
                            </span>
                            {sec.pinnable && (
                              <span
                                role="button"
                                tabIndex={-1}
                                className={`qcs-pin ${isPinned ? "on" : ""}`}
                                onClick={(e) => togglePin(tab.key, e)}
                                title={isPinned ? "Unpin" : "Pin to top"}
                              >
                                <IconStar size={14} filled={isPinned} />
                              </span>
                            )}
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
            <div className="qcs-empty">
              <IconSearch size={22} />
              <div className="qcs-empty-title">No forms match “{query}”</div>
              <button className="qcs-empty-btn" onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="qcs-sidebar-footer">
            <div className="qcs-footer-pill">
              <span className="qcs-pulse" />
              TRANS EMIRATES
            </div>
            <div className="qcs-footer-sub">
              {TABS.length} forms{pinned.length ? ` · ${pinned.length} pinned` : ""}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="qcs-main">
        {/* Top bar */}
        <header className="qcs-topbar">
          <div className="qcs-topbar-left">
            <div
              className="qcs-topbar-icon"
              style={{ background: `${activeTab.accent}15`, color: activeTab.accent }}
            >
              <activeTab.Icon size={22} />
            </div>
            <div>
              <div className="qcs-topbar-title">{activeTab.title}</div>
              <div className="qcs-topbar-sub">{activeTab.subtitle}</div>
            </div>
          </div>
          <div className="qcs-topbar-right">
            <div className="qcs-date-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {today}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="qcs-breadcrumb">
          <span>QCS</span>
          <span className="qcs-sep">›</span>
          <span>Inputs</span>
          <span className="qcs-sep">›</span>
          <span className="qcs-current" style={{ color: activeTab.accent }}>{activeTab.title}</span>
        </div>

        {/* Content panel */}
        <section className="qcs-panel">
          <Suspense fallback={
            <div className="qcs-loading">
              <div className="qcs-spinner" />
              <span>Loading…</span>
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

  .qcs-hub {
    --brand:    #1d4ed8;
    --brand-2:  #38bdf8;
    --ink:      #0f172a;
    --muted:    #64748b;
    --border:   #e2e8f0;
    --canvas:   #f8fafc;
    --surface:  #ffffff;

    --sb-w: 262px;

    display: block;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--canvas);
    color: var(--ink);
    direction: ltr;
  }
  .qcs-hub.collapsed { --sb-w: 76px; }

  /* ── Sidebar ── */
  .qcs-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sb-w);
    height: 100vh;
    z-index: 40;
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 18px 12px;
    gap: 4px;
    transition: width .2s ease;
  }
  .qcs-sidebar.collapsed { padding: 18px 8px; }

  .qcs-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 8px 18px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    margin-bottom: 6px;
    flex-shrink: 0;
  }
  .qcs-brand-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    box-shadow: 0 8px 20px rgba(56,189,248,.3);
    flex-shrink: 0;
  }
  .qcs-brand-text { overflow: hidden; }
  .qcs-brand-title {
    font-size: 15px; font-weight: 800;
    letter-spacing: -.01em;
    white-space: nowrap;
  }
  .qcs-brand-sub {
    font-size: 11px; color: #94a3b8;
    margin-top: 2px; white-space: nowrap;
    text-transform: uppercase; letter-spacing: .08em;
    font-weight: 600;
  }

  .qcs-collapse-btn {
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
  .qcs-collapse-btn:hover { color: var(--brand); border-color: var(--brand-2); }

  /* ── Search ── */
  .qcs-search {
    position: relative;
    display: flex; align-items: center;
    margin: 4px 4px 8px;
    flex-shrink: 0;
  }
  .qcs-search-icon {
    position: absolute; left: 10px;
    display: flex; color: #64748b;
    pointer-events: none;
  }
  .qcs-search-input {
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
  .qcs-search-input::placeholder { color: #64748b; font-weight: 500; }
  .qcs-search-input:focus {
    border-color: var(--brand-2);
    background: rgba(255,255,255,.08);
    box-shadow: 0 0 0 3px rgba(56,189,248,.12);
  }
  .qcs-search-clear {
    position: absolute; right: 8px;
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    border: none; border-radius: 50%;
    background: rgba(255,255,255,.10);
    color: #cbd5e1;
    cursor: pointer;
  }
  .qcs-search-clear:hover { background: rgba(255,255,255,.2); color: #fff; }
  .qcs-kbd {
    position: absolute; right: 8px;
    font-size: 9.5px; font-weight: 800;
    letter-spacing: .04em;
    color: #64748b;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 5px;
    padding: 2px 5px;
    pointer-events: none;
  }
  .qcs-search-mini {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 38px;
    margin: 2px auto 8px;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 10px;
    background: rgba(255,255,255,.05);
    color: #94a3b8;
    cursor: pointer;
    flex-shrink: 0;
  }
  .qcs-search-mini:hover { color: #fff; border-color: var(--brand-2); }

  .qcs-mark {
    background: rgba(56,189,248,.28);
    color: #e0f2fe;
    border-radius: 3px;
    padding: 0 1px;
  }

  /* Section headings are colour-coded and badged so groups are easy to tell apart. */
  .qcs-nav-heading {
    display: flex; align-items: center; gap: 7px;
    font-size: 10px; font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--g, #64748b);
    padding: 5px 8px;
    margin-top: 14px;
    border-radius: 8px;
    border-left: 2px solid var(--g, transparent);
    background: linear-gradient(90deg, var(--g-soft, transparent) 0%, transparent 75%);
    flex-shrink: 0;
    user-select: none;
  }
  .qcs-nav-heading:first-child { margin-top: 0; }
  .qcs-nav-heading.toggle { cursor: pointer; transition: filter .15s; }
  .qcs-nav-heading.toggle:hover { filter: brightness(1.18); }

  .qcs-heading-chev {
    display: flex; flex-shrink: 0;
    opacity: .75;
    transition: transform .18s ease;
  }
  .qcs-nav-heading.closed .qcs-heading-chev { transform: rotate(-90deg); }

  .qcs-heading-icon {
    display: flex; align-items: center; justify-content: center;
    width: 19px; height: 19px;
    border-radius: 6px;
    background: var(--g-soft, rgba(255,255,255,.07));
    color: var(--g, #94a3b8);
    flex-shrink: 0;
  }

  .qcs-heading-label { flex: 1; min-width: 0; line-height: 1.25; }
  .qcs-heading-count {
    font-size: 9.5px; font-weight: 800;
    background: var(--g-soft, rgba(255,255,255,.07));
    color: var(--g, #94a3b8);
    border-radius: 999px;
    padding: 1.5px 7px;
    flex-shrink: 0;
  }
  .qcs-nav-divider {
    height: 1px;
    background: rgba(255,255,255,.08);
    margin: 8px 6px;
    flex-shrink: 0;
  }
  .qcs-nav-divider:first-child { display: none; }

  .qcs-nav {
    display: flex; flex-direction: column;
    gap: 3px;
    flex: 1 1 auto;
    min-height: 0;              /* lets the flex child actually shrink & scroll */
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain; /* keeps sidebar scroll from chaining to the report */
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.18) transparent;
  }
  .qcs-nav::-webkit-scrollbar { width: 6px; }
  .qcs-nav::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.15);
    border-radius: 999px;
  }

  .qcs-nav-item {
    position: relative;
    display: flex; align-items: center;
    gap: 12px;
    padding: 9px 12px;
    flex-shrink: 0;   /* never squash a row — the nav scrolls instead */
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #cbd5e1;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: all .15s ease;
    overflow: hidden;
  }
  .qcs-nav-item:hover {
    background: rgba(255,255,255,.05);
    color: #fff;
  }
  .qcs-nav-item.active {
    background: rgba(255,255,255,.08);
    color: #fff;
  }
  .qcs-nav-item.active .qcs-nav-icon {
    background: rgba(255,255,255,.08);
  }
  .qcs-nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 18%; bottom: 18%;
    width: 3px;
    background: var(--accent, var(--brand-2));
    border-radius: 0 3px 3px 0;
  }
  .qcs-nav-item.cursor {
    background: rgba(56,189,248,.14);
    box-shadow: inset 0 0 0 1px rgba(56,189,248,.45);
    color: #fff;
  }

  /* Pin (star) */
  .qcs-pin {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px;
    border-radius: 6px;
    color: #ffffff;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity .15s, color .15s, background .15s;
  }
  .qcs-nav-item:hover .qcs-pin { opacity: 1; }
  .qcs-pin:hover { background: rgba(255,255,255,.12); color: #fbbf24; }
  .qcs-pin.on { opacity: 1; color: #fbbf24; }

  /* Empty state */
  .qcs-empty {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 10px;
    padding: 30px 14px;
    color: #64748b;
    text-align: center;
  }
  .qcs-empty-title { font-size: 12px; font-weight: 700; color: #94a3b8; }
  .qcs-empty-btn {
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.05);
    color: #cbd5e1;
    border-radius: 8px;
    padding: 5px 12px;
    font-family: inherit;
    font-size: 11px; font-weight: 700;
    cursor: pointer;
  }
  .qcs-empty-btn:hover { background: rgba(255,255,255,.1); color: #fff; }

  .qcs-nav-icon {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: rgba(255,255,255,.04);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }

  .qcs-nav-text {
    display: flex; flex-direction: column;
    min-width: 0; flex: 1;
  }
  .qcs-nav-title {
    font-size: 13px; font-weight: 700;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .qcs-nav-sub {
    font-size: 11px; font-weight: 500;
    color: #94a3b8;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .qcs-sidebar-footer {
    padding: 12px 8px 4px;
    border-top: 1px solid rgba(255,255,255,.08);
    margin-top: 10px;
    flex-shrink: 0;
  }
  .qcs-footer-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(56,189,248,.15);
    color: #7dd3fc;
    font-size: 11px; font-weight: 800;
    letter-spacing: .05em;
  }
  .qcs-pulse {
    width: 6px; height: 6px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(34,197,94,.7);
    animation: qcs-pulse 2s infinite;
  }
  @keyframes qcs-pulse {
    70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  .qcs-footer-sub {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 6px;
    padding: 0 2px;
  }

  /* ── Main ── */
  .qcs-main {
    margin-left: var(--sb-w);
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 100vh;
    overflow-x: hidden;
    transition: margin-left .2s ease;
  }

  .qcs-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .qcs-topbar-left { display: flex; align-items: center; gap: 14px; }
  .qcs-topbar-icon {
    width: 46px; height: 46px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qcs-topbar-title {
    font-size: 18px; font-weight: 800;
    letter-spacing: -.01em;
  }
  .qcs-topbar-sub {
    font-size: 12px; color: var(--muted);
    margin-top: 2px;
    font-weight: 500;
  }

  .qcs-topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .qcs-date-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--canvas);
    border: 1px solid var(--border);
    font-size: 12px; font-weight: 700;
    color: var(--muted);
    letter-spacing: .01em;
  }

  .qcs-breadcrumb {
    padding: 14px 24px 0;
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600;
    color: var(--muted);
  }
  .qcs-sep { color: #cbd5e1; }
  .qcs-current { font-weight: 800; }

  /* ── Panel ── */
  .qcs-panel {
    margin: 14px 24px 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    min-height: 60vh;
    overflow: hidden;
  }

  .qcs-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px;
    padding: 80px 20px;
    color: var(--muted);
    font-weight: 700;
  }
  .qcs-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--brand);
    border-radius: 50%;
    animation: qcs-spin .8s linear infinite;
  }
  @keyframes qcs-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .qcs-sidebar {
      position: sticky;
      top: 0;
      width: 100% !important;
      height: auto;
      padding: 14px;
    }
    .qcs-collapse-btn { display: none; }
    .qcs-brand { padding-bottom: 12px; margin-bottom: 8px; }
    .qcs-nav { flex-direction: row; overflow-x: auto; overflow-y: hidden; gap: 8px; }
    .qcs-nav-item { flex-shrink: 0; padding: 8px 12px; }
    .qcs-nav-text { display: none; }
    .qcs-nav-heading { display: none; }
    .qcs-nav-divider { display: none; }
    .qcs-pin { display: none; }
    .qcs-empty { display: none; }
    .qcs-sidebar-footer { display: none; }
    .qcs-main { margin-left: 0; }
    .qcs-topbar { padding: 12px 16px; flex-wrap: wrap; gap: 10px; }
    .qcs-panel { margin: 10px 12px 14px; border-radius: 12px; }
    .qcs-breadcrumb { padding: 10px 16px 0; }
  }
`;
