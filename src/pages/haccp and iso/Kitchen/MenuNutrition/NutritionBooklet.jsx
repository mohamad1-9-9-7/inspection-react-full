// src/pages/haccp and iso/Kitchen/MenuNutrition/NutritionBooklet.jsx
// Bilingual nutrient panels — shared by the internal View page and the public
// QR-linked booklet, so both always show identical numbers.

import React from "react";
import { FS, UI, notice } from "../kitchenUI";
import { DAYS, SECTIONS, parseWeight } from "./menuData";
import {
  DAILY_INTAKE_AR,
  DAILY_INTAKE_EN,
  NUTRIENTS,
  computePortion,
  fmt,
} from "./nutritionCalc";

/** Group items the way the menu is organised: days first, then the fixed sections. */
export function groupForMenu(items, t) {
  const groups = [];
  for (const sec of SECTIONS) {
    const inSec = items.filter((i) => i.section === sec.id);
    if (!inSec.length) continue;
    if (sec.id === "day") {
      for (const day of DAYS) {
        const dayItems = inSec.filter((i) => i.day === day);
        if (dayItems.length) groups.push({ key: `day-${day}`, label: t(day), icon: "📅", items: dayItems });
      }
      const noDay = inSec.filter((i) => !DAYS.includes(i.day));
      if (noDay.length) groups.push({ key: "day-other", label: t("secDay"), icon: "📅", items: noDay });
    } else {
      groups.push({ key: sec.id, label: t(sec.labelKey), icon: sec.icon, items: inSec });
    }
  }
  return groups;
}

/** The mandatory daily-intake reference statement, both languages, verbatim. */
export function DailyIntakeStatement({ label }) {
  return (
    <div style={B.intake}>
      {label && <div style={B.intakeLabel}>{label}</div>}
      <div style={B.intakeEn} dir="ltr">
        {DAILY_INTAKE_EN}
      </div>
      <div style={B.intakeAr} dir="rtl">
        {DAILY_INTAKE_AR}
      </div>
    </div>
  );
}

/** One item's nutrient panel — this is also the "digital channel" panel. */
export function NutrientPanel({ item }) {
  const weight = parseWeight(item.weightRaw);
  const portion = computePortion(item.per100, weight.total);

  return (
    <article style={B.panel} className="mn-panel">
      <header style={B.panelHead}>
        <div style={{ minWidth: 0 }}>
          <div style={B.nameEn} dir="ltr">
            {item.nameEn || "—"}
          </div>
          <div style={B.nameAr} dir="rtl">
            {item.nameAr || "—"}
          </div>
          {(item.servedWith || item.servedWithAr) && (
            <div style={B.served}>
              {item.servedWith ? <span dir="ltr">Served with: {item.servedWith}</span> : null}
              {item.servedWithAr ? <span dir="rtl"> · يُقدّم مع: {item.servedWithAr}</span> : null}
            </div>
          )}
        </div>
        <div style={B.kcalBox}>
          <div style={B.kcalValue}>{fmt(portion.calories, 0, "")}</div>
          <div style={B.kcalUnit}>kcal</div>
          <div style={B.kcalPortion}>{weight.total !== null ? `${weight.total} g` : "—"}</div>
        </div>
      </header>

      <table style={B.table}>
        <tbody>
          {NUTRIENTS.filter((n) => n.key !== "calories").map((n) => (
            <tr key={n.key}>
              <td style={B.td}>
                <span dir="ltr" style={B.tdEn}>
                  {n.en}
                </span>
                <span style={B.tdAr} dir="rtl">
                  {n.ar}
                </span>
              </td>
              <td style={B.tdNum}>{fmt(portion[n.key], n.digits, n.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(item.ingredients || item.ingredientsAr) && (
        <div style={B.ingredients}>
          {item.ingredients ? (
            <div dir="ltr">
              <b>Ingredients:</b> {item.ingredients}
            </div>
          ) : null}
          {item.ingredientsAr ? (
            <div dir="rtl" style={{ marginTop: 4 }}>
              <b>المكوّنات:</b> {item.ingredientsAr}
            </div>
          ) : null}
        </div>
      )}

      {item.doc?.source && (
        <footer style={B.source} dir="ltr">
          Source: {item.doc.source}
          {item.doc.ref ? ` · ${item.doc.ref}` : ""}
          {item.doc.date ? ` · ${item.doc.date}` : ""}
        </footer>
      )}
    </article>
  );
}

/** Full booklet: every group, every panel, plus the daily-intake statement. */
export default function NutritionBooklet({ items, t, heading }) {
  const groups = groupForMenu(items, t);

  return (
    <div>
      {heading && <h2 style={B.heading}>{heading}</h2>}
      <DailyIntakeStatement label={t("dailyIntakeLabel")} />

      {groups.map((g) => (
        <section key={g.key} style={B.group} className="mn-group">
          <h3 style={B.groupTitle}>
            <span>
              {g.icon} {g.label}
            </span>
            <span style={B.groupRule} />
          </h3>
          <div style={B.panelGrid}>
            {g.items.map((it) => (
              <NutrientPanel key={it.code} item={it} />
            ))}
          </div>
        </section>
      ))}

      {!groups.length && <div style={B.empty}>—</div>}
    </div>
  );
}

const B = {
  heading: { margin: "0 0 18px", fontSize: FS.lg, fontWeight: 900, color: UI.ink, lineHeight: 1.2 },

  intake: { ...notice("sky"), marginBottom: 26 },
  intakeLabel: {
    fontSize: FS.xxs,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    opacity: 0.75,
    marginBottom: 8,
  },
  intakeEn: { fontSize: FS.sm, fontWeight: 700, lineHeight: 1.6 },
  intakeAr: { fontSize: FS.sm, fontWeight: 700, lineHeight: 1.9, marginTop: 8 },

  group: { marginBottom: 30, breakInside: "avoid" },
  groupTitle: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    margin: "0 0 16px",
    fontSize: FS.md,
    fontWeight: 900,
    color: UI.ink,
  },
  groupRule: { flex: 1, height: 1, background: UI.line },
  panelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
    gap: 16,
  },
  panel: {
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.md,
    background: UI.surface,
    padding: 18,
    breakInside: "avoid",
    boxShadow: UI.shadow.card,
  },
  panelHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 14,
    borderBottom: `1px solid ${UI.line}`,
    marginBottom: 12,
  },
  nameEn: { fontSize: FS.sm, fontWeight: 900, color: UI.ink, lineHeight: 1.3 },
  nameAr: { fontSize: FS.sm, fontWeight: 800, color: UI.inkSoft, lineHeight: 1.7, marginTop: 3 },
  served: { fontSize: FS.xxs, fontWeight: 700, color: UI.inkMuted, marginTop: 7, lineHeight: 1.6 },
  kcalBox: {
    textAlign: "center",
    flexShrink: 0,
    minWidth: 92,
    padding: "10px 12px",
    borderRadius: UI.r.sm,
    background: UI.skySoft,
    border: `1px solid #cbe9f3`,
  },
  kcalValue: {
    fontSize: FS.lg,
    fontWeight: 900,
    color: UI.sky,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  kcalUnit: { fontSize: FS.xxs, fontWeight: 900, color: UI.sky, marginTop: 4, opacity: 0.8 },
  kcalPortion: { fontSize: FS.xxs, fontWeight: 700, color: UI.inkMuted, marginTop: 6 },

  table: { width: "100%", borderCollapse: "collapse" },
  td: { padding: "8px 0", borderBottom: `1px solid ${UI.surfaceAlt}` },
  tdEn: { display: "block", fontSize: FS.xs, fontWeight: 700, color: UI.inkSoft },
  tdAr: { display: "block", fontSize: FS.xxs, fontWeight: 700, color: UI.inkMuted, marginTop: 2 },
  tdNum: {
    padding: "8px 0",
    borderBottom: `1px solid ${UI.surfaceAlt}`,
    textAlign: "end",
    whiteSpace: "nowrap",
    fontSize: FS.xs,
    fontWeight: 900,
    color: UI.ink,
    fontVariantNumeric: "tabular-nums",
  },

  ingredients: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: UI.r.sm,
    background: UI.surfaceAlt,
    fontSize: FS.xxs,
    fontWeight: 600,
    color: UI.inkSoft,
    lineHeight: 1.6,
  },
  source: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px dashed ${UI.line}`,
    fontSize: FS.xxs,
    color: UI.inkMuted,
    fontWeight: 700,
  },
  empty: { padding: 30, textAlign: "center", color: UI.inkMuted, fontWeight: 700 },
};
