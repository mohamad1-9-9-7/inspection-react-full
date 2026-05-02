// src/pages/monitor/branches/_shared/PreloadingKPIBar.jsx
// شريط مؤشرات KPI لتقارير Preloading (FTR1/FTR2/...)
// يحسب: عدد العينات، متوسط حرارة الشاحنة، متوسط حرارة المنتج، نسبة المطابقة، عدد عدم المطابقة

import React, { useMemo } from "react";

/* ===== الحقول التي تُحسب فيها C/NC ===== */
const QUALITY_KEYS = [
  "labelling",
  "appearance",
  "color",
  "brokenDamage",
  "badSmell",
  "overallCondition",
];

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avgList(list) {
  const valid = list.filter((x) => x !== null);
  if (!valid.length) return null;
  return valid.reduce((s, x) => s + x, 0) / valid.length;
}

function maxList(list) {
  const valid = list.filter((x) => x !== null);
  if (!valid.length) return null;
  return Math.max(...valid);
}

/* ===== Card UI ===== */
const cardBase = {
  flex: "1 1 160px",
  minWidth: 160,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  transition: "transform .12s ease, box-shadow .12s ease",
};

function Card({ icon, label, value, sub, accent, bad }) {
  return (
    <div
      style={{
        ...cardBase,
        borderInlineStart: `4px solid ${bad ? "#ef4444" : accent || "#1d4ed8"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.55rem",
          fontWeight: 900,
          color: bad ? "#b91c1c" : accent || "#0b1f4d",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ===== Main ===== */
export default function PreloadingKPIBar({ columns = [] }) {
  const stats = useMemo(() => {
    const totalSamples = columns.length;

    const truckTemps = columns.map((c) => num(c?.truckTemp));
    const productTemps = columns.map((c) => num(c?.productTemp));
    const avgTruck = avgList(truckTemps);
    const avgProduct = avgList(productTemps);
    const maxProduct = maxList(productTemps);

    let okCount = 0;
    let ncCount = 0;
    let nilCount = 0;
    let totalChecks = 0;
    for (const c of columns) {
      for (const k of QUALITY_KEYS) {
        const v = String(c?.[k] || "").trim().toUpperCase();
        if (!v) continue;
        totalChecks++;
        if (v === "OK") okCount++;
        else if (v === "NC") ncCount++;
        else if (v === "NIL") nilCount++;
      }
    }
    const conformPct = totalChecks ? Math.round((okCount / totalChecks) * 100) : null;

    return {
      totalSamples,
      avgTruck,
      avgProduct,
      maxProduct,
      okCount,
      ncCount,
      nilCount,
      totalChecks,
      conformPct,
    };
  }, [columns]);

  if (!columns.length) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14,
        marginTop: 4,
      }}
    >
      <Card
        icon="📦"
        label="Samples"
        value={stats.totalSamples}
        sub="عدد العينات"
        accent="#1d4ed8"
      />

      <Card
        icon="🚚"
        label="Avg Truck Temp"
        value={stats.avgTruck !== null ? `${stats.avgTruck.toFixed(1)}°C` : "—"}
        sub="متوسط حرارة الشاحنة"
        accent="#0891b2"
      />

      <Card
        icon="🌡️"
        label="Avg Product Temp"
        value={stats.avgProduct !== null ? `${stats.avgProduct.toFixed(1)}°C` : "—"}
        sub={
          stats.maxProduct !== null
            ? `أعلى قراءة: ${stats.maxProduct.toFixed(1)}°C`
            : "متوسط حرارة المنتج"
        }
        accent="#0891b2"
        bad={stats.maxProduct !== null && stats.maxProduct > 5}
      />

      <Card
        icon={stats.conformPct !== null && stats.conformPct >= 95 ? "✅" : "⚠️"}
        label="Conform %"
        value={stats.conformPct !== null ? `${stats.conformPct}%` : "—"}
        sub={
          stats.totalChecks
            ? `${stats.okCount}/${stats.totalChecks} مطابق`
            : "نسبة المطابقة"
        }
        accent={stats.conformPct !== null && stats.conformPct >= 95 ? "#15803d" : "#a16207"}
        bad={stats.conformPct !== null && stats.conformPct < 80}
      />

      <Card
        icon="🚫"
        label="Non-Conform"
        value={stats.ncCount}
        sub={stats.nilCount ? `NIL: ${stats.nilCount}` : "عدم المطابقة"}
        accent="#dc2626"
        bad={stats.ncCount > 0}
      />
    </div>
  );
}
