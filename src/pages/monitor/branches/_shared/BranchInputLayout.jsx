// src/pages/monitor/branches/_shared/BranchInputLayout.jsx
// مكوّن موحّد لصفحات الإدخال متعدّدة التبويبات (POS 10/11/15/24/26 ...)
//
// Same config shape as before — the five branch layouts were not touched — but
// it now draws the Production / QCS / POS 6 sidebar instead of the old purple
// gradient with a wall of ten stretched tab buttons. What that fixes:
//
//   • the active tab lives in the URL (?tab=…), so a screen can be linked and
//     survives a refresh; before it was local state only
//   • ten tabs read as a scannable list instead of wrapping into four ragged
//     rows that pushed the form itself below the fold
//   • a tab with no component yet shows a real empty state, not the note to
//     the developer that used to ship to the branch
//
//   <BranchInputLayout config={{
//     branch: "POS 11",
//     source: "pos11-tabs",
//     title: "📋 POS 11 — Operations Inputs",
//     description: "All input tabs ... in one place.",
//     defaultTab: "shipments",
//     tabs: [
//       { key: "shipments", label: "📦 Shipments", Component: SomeLazy, loadingText: "Loading..." },
//       // a tab without a Component renders the empty state
//     ],
//   }} />

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BranchSidebarHub from "./BranchSidebarHub";

/* Accents cycle so neighbouring tabs never share a colour. */
const ACCENTS = [
  "#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#f97316",
  "#3b82f6", "#14b8a6", "#e11d48", "#8b5cf6", "#0891b2",
];

/* Labels carry their icon as a leading emoji ("📦 Shipments"); split it off so
   it can sit in the hub's icon slot instead of inside the text. */
const EMOJI_HEAD = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

function splitLabel(label = "") {
  const m = String(label).match(EMOJI_HEAD);
  return m ? { emoji: m[1], text: String(label).slice(m[0].length) } : { emoji: "📄", text: String(label) };
}

const makeIcon = (emoji) => function TabIcon({ size = 20 }) {
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">{emoji}</span>;
};

const IconClipboard = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

function EmptyTab({ label }) {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>🚧</div>
      <div style={emptyStyles.title}>{label}</div>
      <div style={emptyStyles.body}>
        This form is not available for this branch yet.
        <br />
        لم يتم تفعيل هذا النموذج لهذا الفرع بعد.
      </div>
    </div>
  );
}

function LoadingTab({ text }) {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.spinner} />
      <div style={emptyStyles.body}>{text}</div>
    </div>
  );
}

export default function BranchInputLayout({ config }) {
  const { branch, source, description, defaultTab, tabs = [] } = config || {};

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const validKeys = useMemo(() => new Set(tabs.map((t) => t.key)), [tabs]);

  const [activeTab, setActiveTab] = useState(
    () => (urlTab && validKeys.has(urlTab) ? urlTab : defaultTab || tabs[0]?.key || "")
  );

  /* Stamp branch / source once, the way the old layout did. */
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (branch && !qs.get("branch")) { qs.set("branch", branch); changed = true; }
    if (source && !qs.get("source")) { qs.set("source", source); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Back / forward and pasted links pick the tab. */
  useEffect(() => {
    if (urlTab && validKeys.has(urlTab) && urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const selectTab = useCallback((key) => {
    setActiveTab(key);
    const qs = new URLSearchParams(window.location.search);
    qs.set("tab", key);
    setSearchParams(qs, { replace: true });
  }, [setSearchParams]);

  const hubTabs = useMemo(
    () =>
      tabs.map((tab, i) => {
        const { emoji, text } = splitLabel(tab.label);
        const Cmp = tab.Component;
        return {
          key: tab.key,
          title: text,
          subtitle: tab.subtitle || "",
          Icon: makeIcon(emoji),
          accent: tab.accent || ACCENTS[i % ACCENTS.length],
          render: () => (Cmp ? <Cmp /> : <EmptyTab label={text} />),
          loadingText: tab.loadingText || `Loading ${text}…`,
        };
      }),
    [tabs]
  );

  const active = hubTabs.find((t) => t.key === activeTab) || hubTabs[0];

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <BranchSidebarHub
      brandTitle={branch || "Branch"}
      brandSubtitle="Daily Inputs"
      BrandIcon={IconClipboard}
      todayText={today}
      breadcrumb={[branch || "Branch", "Inputs"]}
      tabs={hubTabs}
      activeKey={activeTab}
      onSelect={selectTab}
      labels={{
        forms: "FORMS",
        footer: "TRANS EMIRATES",
        footerSub: description || "Livestock Trading LLC",
        loading: active?.loadingText || "Loading…",
      }}
      loadingFallback={<LoadingTab text={active?.loadingText || "Loading…"} />}
    />
  );
}

const emptyStyles = {
  wrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, padding: "72px 20px", textAlign: "center",
  },
  icon: { fontSize: 34 },
  title: { fontSize: 17, fontWeight: 900, color: "#0f172a" },
  body: { fontSize: 13.5, fontWeight: 600, color: "#64748b", lineHeight: 1.8 },
  spinner: {
    width: 36, height: 36,
    border: "3px solid #e2e8f0",
    borderTopColor: "#0f766e",
    borderRadius: "50%",
    animation: "prd-spin .8s linear infinite",
  },
};
