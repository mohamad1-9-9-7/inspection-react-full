// src/pages/monitor/branches/qcs/MeatWasteDisposalView.jsx
// QCS — Meat Waste Disposal — Records list

import React, { useEffect, useMemo, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_meat_waste_disposal";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  recordCard: { background: "#fff", border: "1.5px solid #fecaca", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(220,38,38,0.06)" },
  recordHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingBottom: 10, borderBottom: "2px solid #fecaca", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 8px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  entryRow: { background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: 10, marginTop: 8 },
  pill: (color, bg) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 950, color, background: bg, border: `1px solid ${color}33`, marginInlineEnd: 6 }),
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginTop: 6 },
  imgThumb: { width: "100%", height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "zoom-in", display: "block" },
  meta: { fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 4 },
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString(); } catch { return s; } }

export default function MeatWasteDisposalView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [meatFilter, setMeatFilter] = useState("all");
  const [preview, setPreview] = useState({ open: false, src: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.reportDate || 0) - new Date(a?.payload?.reportDate || 0));
      setItems(arr);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("حذف هذا السجل نهائياً؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE", credentials: IS_SAME_ORIGIN ? "include" : "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) { alert("فشل الحذف: " + (e?.message || e)); }
  }

  const meatTypes = useMemo(() => {
    const set = new Set();
    items.forEach((r) => (r?.payload?.entries || []).forEach((e) => e.meatType && set.add(e.meatType)));
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.location, p.disposedBy, p.witness, p.supervisor, p.generalNotes,
        ...(p.entries || []).flatMap((e) => [e.meatType, e.reason, e.reasonDetails, e.disposalMethod, e.productCode, e.batchNo, e.notes])
      ].map((x) => String(x || "").toLowerCase()).join(" ");
      const matchesQ = !q || txt.includes(q);
      const matchesMonth = !month || String(p.reportDate || "").startsWith(month);
      const matchesMeat = meatFilter === "all" || (p.entries || []).some((e) => e.meatType === meatFilter);
      return matchesQ && matchesMonth && matchesMeat;
    });
  }, [items, search, month, meatFilter]);

  const kpis = useMemo(() => {
    let totalKg = 0, totalEntries = 0;
    filtered.forEach((r) => {
      const p = r?.payload || {};
      totalKg += Number(p.totals?.totalKg) || (p.entries || []).reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);
      totalEntries += (p.entries || []).length;
    });
    return { records: filtered.length, totalKg: totalKg.toFixed(2), totalEntries };
  }, [filtered]);

  return (
    <div style={{ padding: 4 }}>
      <div style={S.topbar}>
        <h2 style={S.title}>🥩 سجلات هدر اللحوم / Meat Waste Disposal Records</h2>
        <button style={S.btn} onClick={load} disabled={loading}>{loading ? "⏳" : "↻ Refresh"}</button>
      </div>

      <div style={S.kpiRow}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>عدد السجلات</div>
          <div style={{ ...S.kpiValue, color: "#0369a1" }}>{kpis.records}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي الإدخالات</div>
          <div style={{ ...S.kpiValue, color: "#9333ea" }}>{kpis.totalEntries}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي الكمية (كغ)</div>
          <div style={{ ...S.kpiValue, color: "#dc2626" }}>{kpis.totalKg}</div>
        </div>
      </div>

      <div style={S.filters}>
        <input style={S.input} placeholder="🔍 ابحث (لحم، سبب، باتش، اسم...)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={meatFilter} onChange={(e) => setMeatFilter(e.target.value)}>
          <option value="all">كل أنواع اللحوم</option>
          {meatTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || month || meatFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setMeatFilter("all"); }}>✖ مسح الفلاتر</button>
        )}
      </div>

      {loading && <div style={S.empty}>⏳ جاري التحميل...</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>{items.length === 0 ? "لا يوجد سجلات بعد." : "لا توجد نتائج مطابقة."}</div>
      )}

      {filtered.map((rec, i) => {
        const p = rec?.payload || {};
        const entries = p.entries || [];
        const totalKg = Number(p.totals?.totalKg) || entries.reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);
        return (
          <div key={rec.id || i} style={S.recordCard}>
            <div style={S.recordHeader}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 950, color: "#0f172a" }}>
                  📅 {fmtDate(p.reportDate)} — {p.location || "—"}
                </div>
                <div style={S.meta}>
                  👤 قام بالتخلص: {p.disposedBy || "—"}
                  {p.witness && ` • 👁 الشاهد: ${p.witness}`}
                  {p.supervisor && ` • 🎯 المشرف: ${p.supervisor}`}
                </div>
                <div style={S.meta}>
                  <span style={S.pill("#dc2626", "#fee2e2")}>🥩 {totalKg.toFixed(2)} كغ</span>
                  <span style={S.pill("#9333ea", "#f3e8ff")}>📋 {entries.length} إدخال</span>
                </div>
              </div>
              <button style={S.btnDanger} onClick={() => del(rec.id)}>🗑️ حذف السجل</button>
            </div>

            {p.generalNotes && (
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 700, marginBottom: 8 }}>
                📝 {p.generalNotes}
              </div>
            )}

            {entries.map((e, j) => (
              <div key={j} style={S.entryRow}>
                <div style={{ fontWeight: 900, color: "#854d0e", marginBottom: 4 }}>إدخال #{j + 1}</div>
                <div>
                  <span style={S.pill("#0369a1", "#e0f2fe")}>🥩 {e.meatType}</span>
                  <span style={S.pill("#dc2626", "#fee2e2")}>{e.quantityKg} كغ</span>
                  <span style={S.pill("#a16207", "#fef3c7")}>{e.reason}</span>
                  <span style={S.pill("#15803d", "#dcfce7")}>{e.disposalMethod}</span>
                  {e.productCode && <span style={S.pill("#475569", "#f1f5f9")}>كود: {e.productCode}</span>}
                  {e.batchNo && <span style={S.pill("#475569", "#f1f5f9")}>باتش: {e.batchNo}</span>}
                </div>
                {e.reasonDetails && <div style={S.meta}>📌 {e.reasonDetails}</div>}
                {e.notes && <div style={S.meta}>📝 {e.notes}</div>}
                {e.images?.length > 0 && (
                  <div style={S.imgGrid}>
                    {e.images.map((u, k) => (
                      <img key={`${u}-${k}`} src={u} alt={`Attachment ${k+1}`} style={S.imgThumb} onClick={() => setPreview({ open: true, src: u })} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {preview.open && (
        <div onClick={() => setPreview({ open: false, src: "" })}
             style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={preview.src} alt="Preview" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
