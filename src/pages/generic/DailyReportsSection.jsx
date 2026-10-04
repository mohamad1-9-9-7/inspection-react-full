// src/pages/generic/DailyReportsSection.jsx
// The "Daily Reports" card spread out on the home screen of a kit company
// (restaurant / retail / warehouse / factory): every report as its own card,
// grouped like the sidebar (card.groups + report.group). A card opens its
// report directly — same URL as picking it in the sidebar.

import React from "react";
import { HomeSection, HomeGroup, OpenCard } from "./HomeSection";

const GROUP_COLORS = {
  operations: "#0f766e",
  hygiene: "#0891b2",
  storage: "#2563eb",
  safety: "#dc2626",
  people: "#7c3aed",
  quality: "#ea580c",
};
const FALLBACK_COLOR = "#475569";

/** `reports` = the (already search-filtered) reports of `card`. */
export default function DailyReportsSection({ card, reports, Two, accent, onOpen }) {
  const groups = [...(card.groups || [])];
  const known = new Set(groups.map((g) => g.id));
  if (reports.some((r) => !known.has(r.group))) groups.push({ id: null, icon: "📄", label: "Other", labelAr: "أخرى" });

  let n = 0;
  return (
    <HomeSection
      Two={Two}
      icon={card.icon}
      logoBg={card.grad}
      bg="linear-gradient(180deg,#f8fafc 0%,#fff 46%)"
      title={card.label}
      titleAr={card.labelAr}
      sub={`${card.reports.length} reports ready to fill in today`}
      subAr={`${card.reports.length} تقرير جاهز للتعبئة اليوم`}
      pill="✓ Ready to use"
      pillAr="جاهز للاستخدام"
      pillStyle={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}
    >
      {groups.map((g) => {
        const items = reports.filter((r) => (g.id === null ? !known.has(r.group) : r.group === g.id));
        if (!items.length) return null;
        const color = GROUP_COLORS[g.id] || FALLBACK_COLOR;
        return (
          <HomeGroup key={g.id || "other"} Two={Two} icon={g.icon} color={color} label={g.label} labelAr={g.labelAr} count={items.length}>
            {items.map((r) => (
              <OpenCard key={r.type} item={r} color={color} accent={accent} index={n++} onOpen={() => onOpen(r.type)} />
            ))}
          </HomeGroup>
        );
      })}
    </HomeSection>
  );
}
