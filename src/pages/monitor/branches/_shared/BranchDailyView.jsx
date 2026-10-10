// src/pages/monitor/branches/_shared/BranchDailyView.jsx
// Every branch's "View reports" page (POS 6/10/11/15/19, FTR 1/2, Production).
//
// Since Oct 2026 this is a thin adapter over _shared/QcsSidebarHub — the same
// dark grouped sidebar as the QCS input and reports hubs (search + Ctrl K,
// pins, collapsible sections, collapsed rail). Callers did not change: they
// still pass `tabs` with { key, icon, label, element } and the selected report
// still lives in ?rtab=.
//
// Branch tabs carry no section, so each one is placed by its name into the
// QCS headings (temperature, cleaning, receiving, quality, waste, people);
// a tab may pass `group` to choose itself. One language per page: labelAr is
// no longer shown next to the English name.
import React, { useMemo } from "react";
import QcsSidebarHub, { IconChart } from "./QcsSidebarHub";
import PrintStyles from "./PrintStyles";
import PrintButton from "./PrintButton";
import { BRANCHES } from "../../../../config/branches";

/* "POS-19" → "POS 19" → the registry label ("Al Warqa Kitchen"). */
function branchLabelOf(code) {
  const id = String(code || "").replace(/-/g, " ").trim().toUpperCase();
  const hit = BRANCHES.find((b) => b.id.toUpperCase() === id);
  return hit && hit.label.toUpperCase() !== hit.id.toUpperCase() ? hit.label : "";
}

const Emoji = (ch) => function EmojiIcon({ size = 20 }) {
  return <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}>{ch}</span>;
};

/* First match wins — order matters ("Equipment … Sanitizing" is cleaning,
   "Pest Control" is waste & pest, "Cooking Temperature" is temperature). */
const SECTIONS = [
  { key: "waste",       label: "WASTE & PEST",          color: "#f97316", test: /waste|garbage|pest|dispos|condemn/ },
  { key: "people",      label: "PEOPLE & HEALTH",       color: "#f472b6", test: /sick|return to work|injur|training|staff|employee|warning/ },
  { key: "temperature", label: "TEMPERATURE CONTROL",   color: "#38bdf8", test: /temp|cool|chill|freez|fridge|defrost|thaw|cook|heat|hot hold|blast|oil|calibrat|thermo|humid/ },
  { key: "hygiene",     label: "HYGIENE & CLEANING",    color: "#2dd4bf", test: /hygien|clean|sanit|visitor|glass|wood|equipment|washing/ },
  { key: "receiving",   label: "RECEIVING & STORAGE",   color: "#60a5fa", test: /receiv|traceab|shipment|raw|deliver|stock|storage|rotation|loading|store/ },
  { key: "quality",     label: "QUALITY & COMPLIANCE",  color: "#c084fc", test: /conform|ncr|correct|capa|audit|reject|complaint|inspect|product|finished|label|quality|halal|allergen/ },
];
const OTHER = { key: "other", label: "OTHER REPORTS", color: "#94a3b8" };
/* Sidebar order (matching order above is only about which test wins). */
const DISPLAY_ORDER = ["overview", "receiving", "temperature", "hygiene", "quality", "waste", "people", "other"];
const OVERVIEW = { key: "overview", label: "OVERVIEW", color: "#22d3ee", Icon: IconChart };

const sectionOf = (tab) => {
  if (tab.key === "overview") return "overview";
  if (tab.group) return tab.group;
  const name = `${tab.label || ""} ${tab.key || ""}`.toLowerCase();
  return (SECTIONS.find((s) => s.test.test(name)) || OTHER).key;
};

/**
 * Props (unchanged):
 *  - branchCode   "POS-10"
 *  - title / subtitle   kept for callers; the hub shows the branch name instead
 *  - tabs: Array<{ key, icon, label, labelAr?, element, group?, subtitle? }>
 *  - defaultTabKey?
 *  - direction?   "rtl" | "ltr" — reading direction of the REPORT PAGES inside
 *                 (the sidebar itself is always left-to-right English)
 *  - showPrint?   generic print button (off when panels print themselves)
 */
export default function BranchDailyView({
  branchCode,
  tabs = [],
  defaultTabKey,
  direction = "rtl",
  showPrint = true,
}) {
  const code = String(branchCode || "").replace(/-/g, " ").trim();
  const branchName = branchLabelOf(branchCode);

  const { hubTabs, groups } = useMemo(() => {
    const colorOf = Object.fromEntries([OVERVIEW, ...SECTIONS, OTHER].map((g) => [g.key, g.color]));
    const hubTabs = tabs.map((t) => {
      const group = sectionOf(t);
      return {
        key: t.key,
        group,
        title: t.label,
        subtitle: t.subtitle || (t.key === "overview" ? "All reports at a glance" : ""),
        Icon: t.key === "overview" ? IconChart : Emoji(t.icon || "📄"),
        accent: colorOf[group] || OTHER.color,
        element: t.element,
      };
    });
    const used = new Set(hubTabs.map((t) => t.group));
    const known = [OVERVIEW, ...SECTIONS, OTHER]
      .map(({ key, label, color, Icon }) => ({ key, label, color, Icon: Icon || IconChart }))
      .sort((a, b) => DISPLAY_ORDER.indexOf(a.key) - DISPLAY_ORDER.indexOf(b.key));
    // A custom `group` a caller passed gets its own heading at the end.
    const custom = [...used].filter((g) => !known.some((k) => k.key === g))
      .map((g) => ({ key: g, label: String(g).toUpperCase(), color: OTHER.color, Icon: IconChart }));
    return { hubTabs, groups: [...known, ...custom] };
  }, [tabs]);

  return (
    <>
      <PrintStyles />
      <QcsSidebarHub
        tabs={hubTabs}
        groups={groups}
        brandTitle={code || "Reports"}
        brandSub={branchName || "Reports"}
        crumb="Reports"
        param="rtab"
        defaultKey={defaultTabKey}
        storagePrefix={`bdv_${code.replace(/\s+/g, "").toLowerCase() || "branch"}`}
        itemNoun="reports"
        bodyDir={direction}
        viewer
        topbarExtra={showPrint ? (active) => (active?.key !== "overview" ? (
          <PrintButton
            title={active?.title || code}
            documentNo=""
            reportDate={new Date().toLocaleDateString("en-CA")}
            lang={direction === "rtl" ? "ar" : "en"}
          />
        ) : null) : null}
      />
    </>
  );
}
