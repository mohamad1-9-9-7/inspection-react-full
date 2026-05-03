// src/pages/admin/ExpiryCenter.jsx
// لوحة موحّدة لكل تواريخ الانتهاء عبر النظام (شهادات / رخص / معايرة / ...)
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  scanExpiry,
  summarize,
  sortByUrgency,
  ENTITY_REGISTRY,
  clearScanCache,
  DEFAULT_THRESHOLDS,
} from "../../utils/expiryTracker";
import CCPKPIWidget from "../haccp and iso/CCPMonitoring/CCPKPIWidget";

/* ============ Excel export helper (نفس التعامل في كل الصفحات) ============ */
function downloadCSV(filename, rows) {
  const csvEscape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============ UI atoms ============ */
const COLORS = {
  expired:       { bg: "linear-gradient(135deg,#ef4444,#b91c1c)", soft: "rgba(239,68,68,0.10)", text: "#fff" },
  expiring_soon: { bg: "linear-gradient(135deg,#f97316,#c2410c)", soft: "rgba(249,115,22,0.10)", text: "#fff" },
  expiring:     { bg: "linear-gradient(135deg,#facc15,#a16207)", soft: "rgba(250,204,21,0.10)", text: "#fff" },
  valid:        { bg: "linear-gradient(135deg,#22c55e,#15803d)", soft: "transparent",            text: "#fff" },
  no_date:      { bg: "linear-gradient(135deg,#9ca3af,#6b7280)", soft: "transparent",            text: "#fff" },
};

const Pill = ({ status }) => {
  const c = COLORS[status?.key] || COLORS.no_date;
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.text,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {status?.label || "—"}
      {status?.days !== null && status?.days !== undefined && (
        <span style={{ marginInlineStart: 6, opacity: 0.92, fontWeight: 700 }}>
          ({status.days >= 0 ? `${status.days}d` : `${Math.abs(status.days)}d ago`})
        </span>
      )}
    </span>
  );
};

const StatCard = ({ label, value, color, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      flex: "1 1 140px",
      minWidth: 140,
      background: active ? color : "#fff",
      color: active ? "#fff" : "#0b1f4d",
      border: `2px solid ${active ? color : "#e5e7eb"}`,
      borderRadius: 14,
      padding: "14px 12px",
      cursor: "pointer",
      textAlign: "center",
      boxShadow: active ? `0 6px 18px ${color}44` : "0 1px 3px rgba(0,0,0,0.04)",
      transition: "all .15s",
      fontFamily: "inherit",
    }}
  >
    <div style={{ fontSize: "0.85rem", fontWeight: 700, opacity: active ? 0.95 : 0.7 }}>{label}</div>
    <div style={{ fontSize: "1.9rem", fontWeight: 900, marginTop: 4 }}>{value}</div>
  </button>
);

/* ============ Main ============ */
export default function ExpiryCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all | expired | expiring_soon | expiring | valid | no_date
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function load(force = false) {
    setLoading(true);
    setError("");
    try {
      if (force) clearScanCache();
      const result = await scanExpiry({
        thresholds: DEFAULT_THRESHOLDS,
        useCache: !force,
      });
      setItems(sortByUrgency(result));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(false); }, []);

  const summary = useMemo(() => summarize(items), [items]);

  const branches = useMemo(() => {
    const set = new Set();
    items.forEach((it) => it.branch && set.add(it.branch));
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set();
    ENTITY_REGISTRY.forEach((d) => set.add(d.category));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "all" && it.status.key !== statusFilter) return false;
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (branchFilter !== "all" && it.branch !== branchFilter) return false;
      if (q) {
        const hay = `${it.name} ${it.branch} ${it.entityLabel} ${it.entityLabelEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, branchFilter, search]);

  function handleExport() {
    const rows = [
      ["#", "النوع", "الفئة", "الاسم", "الفرع", "تاريخ الانتهاء", "الأيام المتبقية", "الحالة"],
    ];
    filtered.forEach((it, idx) => {
      rows.push([
        idx + 1,
        it.entityLabel,
        it.category,
        it.name,
        it.branch,
        it.expiryDate || "",
        it.daysLeft ?? "",
        it.status.labelEn,
      ]);
    });
    downloadCSV(`expiry_center_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const styles = {
    shell: { padding: "20px 24px", background: "#f8fafc", minHeight: "100vh", direction: "rtl", fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" },
    header: {
      background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
      color: "#fff",
      padding: "18px 22px",
      borderRadius: 16,
      boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    },
    title: { fontSize: "1.5rem", fontWeight: 900, margin: 0 },
    sub: { fontSize: "0.92rem", opacity: 0.85, marginTop: 2 },
    btn: {
      background: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.35)",
      color: "#fff",
      padding: "8px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: "0.92rem",
    },
    statsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
    filtersCard: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
    },
    select: {
      padding: "9px 12px",
      borderRadius: 10,
      border: "1.5px solid #e2e8f0",
      background: "#f8fafc",
      fontWeight: 700,
      fontSize: "0.92rem",
      minWidth: 140,
    },
    searchInput: {
      flex: 1,
      minWidth: 200,
      padding: "9px 12px",
      borderRadius: 10,
      border: "1.5px solid #e2e8f0",
      background: "#f8fafc",
      fontSize: "0.95rem",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
    th: {
      background: "#f1f5f9",
      padding: "12px 10px",
      fontSize: "0.85rem",
      fontWeight: 800,
      color: "#0b1f4d",
      textAlign: "right",
      borderBottom: "2px solid #e5e7eb",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "10px 10px",
      fontSize: "0.92rem",
      color: "#1f2937",
      borderBottom: "1px solid #f1f5f9",
      verticalAlign: "middle",
    },
  };

  return (
    <div style={styles.shell}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⏰ مركز تواريخ الانتهاء</h1>
          <div style={styles.sub}>
            فحص موحّد للشهادات والرخص والمعايرات عبر كل النظام
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => load(true)} disabled={loading}>
            {loading ? "⏳ جارٍ التحميل..." : "🔄 تحديث"}
          </button>
          <button style={styles.btn} onClick={handleExport} disabled={!filtered.length}>
            📤 تصدير CSV
          </button>
          <button style={styles.btn} onClick={() => navigate(-1)}>← رجوع</button>
        </div>
      </div>

      {/* 🆕 CCP KPI Widget */}
      <CCPKPIWidget />

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard
          label="المجموع"
          value={summary.total}
          color="#1e40af"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          label="منتهية"
          value={summary.expired}
          color="#b91c1c"
          active={statusFilter === "expired"}
          onClick={() => setStatusFilter("expired")}
        />
        <StatCard
          label="ينتهي خلال 30 يوم"
          value={summary.expiringSoon}
          color="#c2410c"
          active={statusFilter === "expiring_soon"}
          onClick={() => setStatusFilter("expiring_soon")}
        />
        <StatCard
          label="ينتهي خلال 90 يوم"
          value={summary.expiring}
          color="#a16207"
          active={statusFilter === "expiring"}
          onClick={() => setStatusFilter("expiring")}
        />
        <StatCard
          label="صالح"
          value={summary.valid}
          color="#15803d"
          active={statusFilter === "valid"}
          onClick={() => setStatusFilter("valid")}
        />
        <StatCard
          label="بدون تاريخ"
          value={summary.noDate}
          color="#6b7280"
          active={statusFilter === "no_date"}
          onClick={() => setStatusFilter("no_date")}
        />
      </div>

      {/* Filters */}
      <div style={styles.filtersCard}>
        <select
          style={styles.select}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "كل الفئات" : c}
            </option>
          ))}
        </select>
        <select
          style={styles.select}
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? "كل الفروع" : b}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="🔎 بحث بالاسم / الفرع / النوع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Errors */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
            fontWeight: 700,
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ background: "#fff", padding: 40, textAlign: "center", borderRadius: 14, color: "#6b7280" }}>
          ⏳ جارٍ تحميل البيانات من السيرفر...
        </div>
      ) : !filtered.length ? (
        <div style={{ background: "#fff", padding: 40, textAlign: "center", borderRadius: 14, color: "#6b7280" }}>
          🎉 لا توجد عناصر تطابق الفلاتر الحالية
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>النوع</th>
                <th style={styles.th}>الاسم / العنصر</th>
                <th style={styles.th}>الفرع</th>
                <th style={styles.th}>تاريخ الانتهاء</th>
                <th style={styles.th}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, idx) => {
                const c = COLORS[it.status.key] || COLORS.no_date;
                return (
                  <tr key={`${it.type}-${it.id}-${idx}`} style={{ background: c.soft }}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <span style={{ marginInlineEnd: 6 }}>{it.icon}</span>
                      <span style={{ fontWeight: 700 }}>{it.entityLabel}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>
                      {it.link ? (
                        <button
                          type="button"
                          onClick={() => navigate(it.link)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#1e40af",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontWeight: 700,
                            padding: 0,
                            fontFamily: "inherit",
                            fontSize: "inherit",
                          }}
                        >
                          {it.name}
                        </button>
                      ) : (
                        it.name
                      )}
                    </td>
                    <td style={styles.td}>{it.branch}</td>
                    <td style={{ ...styles.td, fontFamily: "monospace", fontWeight: 700 }}>
                      {it.expiryDate || "—"}
                    </td>
                    <td style={styles.td}>
                      <Pill status={it.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
