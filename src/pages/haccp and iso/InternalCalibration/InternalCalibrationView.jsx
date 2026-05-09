// src/pages/haccp and iso/InternalCalibration/InternalCalibrationView.jsx
// Internal Calibration — List view with KPIs, filters per branch, and CSV export.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "internal_calibration_record";

const METHOD_LABELS = {
  ice_point:    { ar: "نقطة التجمّد",       en: "Ice-point" },
  boiling:      { ar: "نقطة الغليان",       en: "Boiling-point" },
  master_probe: { ar: "مسبار مرجعي",        en: "Master probe" },
  other:        { ar: "أخرى",               en: "Other" },
};

function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function escapeCSV(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename, mime, content) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) { alert("Export failed: " + (e?.message || e)); }
}

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #fefce8 0%, #fff7ed 60%, #f8fafc 100%)" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)", borderRadius: 14,
    border: "1px solid #fde68a", boxShadow: "0 8px 24px rgba(202,138,4,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#854d0e", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#a16207", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #fde68a", boxShadow: "0 6px 16px rgba(202,138,4,0.06)" },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #eab308, #ca8a04)", color: "#fff", border: "#a16207" },
      secondary: { bg: "#fff", color: "#854d0e", border: "#fde68a" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "#fefce8", color: "#854d0e", border: "#fde68a" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${color}33`, boxShadow: "0 6px 16px rgba(202,138,4,0.06)",
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 24, fontWeight: 950, color }),
  kpiLabel: { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },

  toolbar: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  filterInput: { padding: "8px 11px", border: "1.5px solid #fde68a", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff", minWidth: 110 },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "start", background: "#854d0e", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #fefce8", verticalAlign: "top" },

  badge: (kind) => {
    const map = {
      pass: { bg: "#dcfce7", color: "#166534" },
      fail: { bg: "#fee2e2", color: "#991b1b" },
      none: { bg: "#f1f5f9", color: "#475569" },
    };
    const c = map[kind] || map.none;
    return { padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color, fontWeight: 900, fontSize: 11, whiteSpace: "nowrap" };
  },
};

export default function InternalCalibrationView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => {
        const da = `${a?.payload?.date || ""}T${a?.payload?.time || "00:00"}`;
        const db = `${b?.payload?.date || ""}T${b?.payload?.time || "00:00"}`;
        return db.localeCompare(da);
      });
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    const ok = window.confirm(isAr ? "حذف هذا السجل؟" : "Delete this record?");
    if (!ok) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) { alert("Delete error: " + (e?.message || e)); }
  }

  const branches = useMemo(() => {
    const s = new Set();
    items.forEach((rec) => { const b = rec?.payload?.branch; if (b) s.add(b); });
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const fromD = safeDate(fromDate);
    const toD = safeDate(toDate);
    const q = search.trim().toLowerCase();
    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (branchFilter !== "all" && p.branch !== branchFilter) return false;
      if (resultFilter !== "all" && (p.result || "").toLowerCase() !== resultFilter) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (fromD || toD) {
        const d = safeDate(p.date);
        if (!d) return false;
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
      }
      if (q) {
        const hay = [
          p.equipmentId, p.equipmentName, p.equipmentType, p.serialNumber,
          p.branch, p.performedBy, p.notes, p.actionTaken,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, branchFilter, resultFilter, methodFilter, fromDate, toDate, search]);

  const stats = useMemo(() => {
    let total = items.length, pass = 0, fail = 0;
    const equipmentSeen = new Set();
    const branchSeen = new Set();
    items.forEach((rec) => {
      const p = rec?.payload || {};
      if ((p.result || "").toLowerCase() === "pass") pass++;
      if ((p.result || "").toLowerCase() === "fail") fail++;
      if (p.equipmentName) equipmentSeen.add(`${p.branch}::${p.equipmentName}`);
      if (p.branch) branchSeen.add(p.branch);
    });
    const passRate = total ? Math.round((pass / total) * 100) : 0;
    return { total, pass, fail, passRate, equipmentCount: equipmentSeen.size, branchCount: branchSeen.size };
  }, [items]);

  const branchBreakdown = useMemo(() => {
    const map = new Map();
    items.forEach((rec) => {
      const p = rec?.payload || {};
      const b = p.branch || "—";
      if (!map.has(b)) map.set(b, { branch: b, total: 0, pass: 0, fail: 0 });
      const e = map.get(b);
      e.total++;
      if ((p.result || "").toLowerCase() === "pass") e.pass++;
      if ((p.result || "").toLowerCase() === "fail") e.fail++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  function exportCSV() {
    const headers = ["Date", "Time", "Branch", "Equipment ID", "Equipment Name", "Type", "Serial", "Method", "Reference", "Reading", "Tolerance", "Unit", "Result", "Action Taken", "Performed By", "Notes"];
    const rows = filtered.map((rec) => {
      const p = rec?.payload || {};
      return [
        p.date, p.time, p.branch, p.equipmentId, p.equipmentName, p.equipmentType, p.serialNumber,
        METHOD_LABELS[p.method]?.en || p.method, p.referenceValue, p.actualReading, p.tolerance, p.unit,
        p.result, p.actionTaken, p.performedBy, p.notes,
      ].map(escapeCSV).join(",");
    });
    const csv = "﻿" + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n");
    downloadBlob(`internal-calibration_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;", csv);
  }

  function clearFilters() {
    setBranchFilter("all"); setResultFilter("all"); setMethodFilter("all");
    setSearch(""); setFromDate(""); setToDate("");
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{isAr ? "🌡 سجل المعايرة الداخلية" : "🌡 Internal Calibration Log"}</div>
            <div style={S.subtitle}>{isAr ? "كل الفروع — ice-point / boiling / master-probe" : "All branches — ice-point / boiling / master-probe"}</div>
            <HaccpLinkBadge clauses={["8.7"]} label={isAr ? "معايرة المراقبة والقياس (داخلية)" : "Monitoring & Measurement (Internal)"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : (isAr ? "تحديث" : "Refresh")}</button>
            <button style={S.btn("ghost")} onClick={exportCSV} disabled={!filtered.length}>📊 CSV</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/internal-calibration")}>{isAr ? "+ سجل جديد" : "+ New record"}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{isAr ? "← الرئيسية" : "← Hub"}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#854d0e")}>
            <div style={S.kpiVal("#854d0e")}>{stats.total}</div>
            <div style={S.kpiLabel}>{isAr ? "إجمالي السجلات" : "Total Records"}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.pass} <span style={{ fontSize: 14 }}>({stats.passRate}%)</span></div>
            <div style={S.kpiLabel}>{isAr ? "ناجحة" : "Passed"}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{stats.fail}</div>
            <div style={S.kpiLabel}>{isAr ? "فشلت" : "Failed"}</div>
          </div>
          <div style={S.kpi("#0891b2")}>
            <div style={S.kpiVal("#0891b2")}>{stats.equipmentCount}</div>
            <div style={S.kpiLabel}>{isAr ? "أجهزة فريدة" : "Unique Devices"}</div>
          </div>
          <div style={S.kpi("#7c3aed")}>
            <div style={S.kpiVal("#7c3aed")}>{stats.branchCount}</div>
            <div style={S.kpiLabel}>{isAr ? "فروع نشطة" : "Active Branches"}</div>
          </div>
        </div>

        {/* Branch breakdown */}
        {branchBreakdown.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 950, color: "#854d0e", marginBottom: 8 }}>
              {isAr ? "📍 الأداء حسب الفرع" : "📍 Performance per Branch"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {branchBreakdown.map((b) => {
                const passPct = b.total ? (b.pass / b.total) * 100 : 0;
                return (
                  <div key={b.branch} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <div style={{ minWidth: 220, fontWeight: 800, color: "#1e293b" }}>{b.branch}</div>
                    <div style={{ flex: 1, height: 8, background: "#fefce8", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${passPct}%`, height: "100%", background: passPct >= 90 ? "#16a34a" : passPct >= 70 ? "#eab308" : "#dc2626" }} />
                    </div>
                    <div style={{ minWidth: 140, fontWeight: 900, color: "#64748b", textAlign: "end" }}>
                      {b.pass} ✓ / {b.fail} ✗ ({b.total})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter toolbar */}
        <div style={{ ...S.card, ...S.toolbar }}>
          <input type="text" placeholder={isAr ? "🔍 بحث…" : "🔍 Search…"} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...S.filterInput, flex: 1, minWidth: 200 }} />
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={S.filterInput}>
            <option value="all">{isAr ? "كل الفروع" : "All branches"}</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} style={S.filterInput}>
            <option value="all">{isAr ? "كل الطرق" : "All methods"}</option>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} style={S.filterInput}>
            <option value="all">{isAr ? "كل النتائج" : "All results"}</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#854d0e", fontWeight: 800 }}>
            {isAr ? "من" : "From"}
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={S.filterInput} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#854d0e", fontWeight: 800 }}>
            {isAr ? "إلى" : "To"}
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={S.filterInput} />
          </label>
          <button style={S.btn("ghost")} onClick={clearFilters}>↺ {isAr ? "مسح" : "Reset"}</button>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>
            {isAr ? "المعروض:" : "Showing:"} <strong style={{ color: "#854d0e" }}>{filtered.length}</strong> / {items.length}
          </span>
        </div>

        {/* Table */}
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{isAr ? "التاريخ" : "Date"}</th>
                  <th style={S.th}>{isAr ? "الفرع" : "Branch"}</th>
                  <th style={S.th}>{isAr ? "الجهاز" : "Equipment"}</th>
                  <th style={S.th}>{isAr ? "الطريقة" : "Method"}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "المرجع" : "Ref"}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "القراءة" : "Reading"}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "النتيجة" : "Result"}</th>
                  <th style={S.th}>{isAr ? "المنفذ" : "Performer"}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "أدوات" : "Tools"}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="9" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>⏳</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="9" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>
                    {items.length === 0 ? (isAr ? "لا توجد سجلات" : "No records") : (isAr ? "لا توجد نتائج بهذه الفلاتر" : "No matches")}
                  </td></tr>
                )}
                {!loading && filtered.map((rec) => {
                  const p = rec?.payload || {};
                  const result = (p.result || "").toLowerCase();
                  const kind = result === "pass" ? "pass" : result === "fail" ? "fail" : "none";
                  return (
                    <tr key={rec.id}>
                      <td style={{ ...S.td, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                        <div>{p.date || "—"}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{p.time || ""}</div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, fontWeight: 700 }}>{p.branch || "—"}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        <div style={{ fontWeight: 800 }}>{p.equipmentName || "—"}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>
                          {[p.equipmentId, p.equipmentType, p.serialNumber].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 11 }}>{METHOD_LABELS[p.method]?.[lang] || p.method || "—"}</td>
                      <td style={{ ...S.td, textAlign: "center", fontSize: 12, fontWeight: 700 }}>{p.referenceValue ?? "—"} {p.unit || ""}</td>
                      <td style={{ ...S.td, textAlign: "center", fontSize: 12, fontWeight: 700, color: kind === "fail" ? "#991b1b" : "#1e293b" }}>{p.actualReading ?? "—"} {p.unit || ""}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={S.badge(kind)}>{p.result || "—"}</span>
                        {kind === "fail" && p.actionTaken && (
                          <div style={{ fontSize: 10, color: "#991b1b", marginTop: 4, maxWidth: 180 }}>↳ {p.actionTaken}</div>
                        )}
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>{p.performedBy || "—"}</td>
                      <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                        <button style={{ ...S.btn("secondary"), padding: "4px 10px", fontSize: 11 }} onClick={() => navigate(`/haccp-iso/internal-calibration?edit=${rec.id}`)}>
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                        <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11, marginInlineStart: 4 }} onClick={() => del(rec.id)}>
                          {isAr ? "حذف" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
