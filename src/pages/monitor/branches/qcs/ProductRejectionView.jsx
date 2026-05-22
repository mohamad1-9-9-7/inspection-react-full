// src/pages/monitor/branches/qcs/ProductRejectionView.jsx
// QCS — Product Rejection Report — Records list

import React, { useEffect, useMemo, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_product_rejection";

const DISPOSITION_COLOR = {
  "Returned to Supplier / إعادة للمورد": "#0ea5e9",
  "Destroyed / إتلاف":                  "#dc2626",
  "Quarantine / عزل":                    "#f59e0b",
  "Downgraded / تخفيض الدرجة":          "#8b5cf6",
};

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 8px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(2,6,23,0.06)" },
  th: { padding: "10px 12px", background: "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 12.5 },
  td: { padding: "9px 12px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle" },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  imgThumb: { width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: color + "22", color, border: `1px solid ${color}55` }),
};

function fmtDate(s) {
  if (!s) return "—";
  try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString(); }
  catch { return s; }
}

export default function ProductRejectionView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [catFilter, setCatFilter] = useState("all");
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

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((r) => { const c = r?.payload?.category; if (c) set.add(c); });
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.productName, p.category, p.batchNo, p.supplier, p.reason, p.disposition, p.inspectedBy, p.approvedBy, p.notes]
        .map((x) => String(x || "").toLowerCase()).join(" ");
      const matchesQ = !q || txt.includes(q);
      const matchesMonth = !month || String(p.reportDate || "").startsWith(month);
      const matchesCat = catFilter === "all" || p.category === catFilter;
      return matchesQ && matchesMonth && matchesCat;
    });
  }, [items, search, month, catFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    let totalQty = 0;
    const byDisposition = {};
    filtered.forEach((r) => {
      const p = r?.payload || {};
      totalQty += Number(p.quantity) || 0;
      const d = p.disposition || "—";
      byDisposition[d] = (byDisposition[d] || 0) + 1;
    });
    const topDisp = Object.entries(byDisposition).sort((a, b) => b[1] - a[1])[0];
    return { total, totalQty: Math.round(totalQty * 100) / 100, topDisp: topDisp?.[0] || "—" };
  }, [filtered]);

  return (
    <div style={{ padding: 4 }}>
      <div style={S.topbar}>
        <h2 style={S.title}>🚫 سجلات رفض المنتجات / Product Rejection Records</h2>
        <button style={S.btn} onClick={load} disabled={loading}>{loading ? "⏳" : "↻ Refresh"}</button>
      </div>

      <div style={S.kpiRow}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي السجلات</div>
          <div style={{ ...S.kpiValue, color: "#dc2626" }}>{kpis.total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي الكميات</div>
          <div style={{ ...S.kpiValue, color: "#0369a1" }}>{kpis.totalQty}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>أكثر إجراء</div>
          <div style={{ ...S.kpiValue, fontSize: 14, color: "#7c3aed", paddingTop: 6 }}>{kpis.topDisp}</div>
        </div>
      </div>

      <div style={S.filters}>
        <input style={S.input} placeholder="🔍 ابحث (منتج، مورد، سبب، مفتش...)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">كل الفئات</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || month || catFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setCatFilter("all"); }}>✖ مسح الفلاتر</button>
        )}
      </div>

      {loading && <div style={S.empty}>⏳ جاري التحميل...</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>{items.length === 0 ? "لا يوجد سجلات بعد." : "لا توجد نتائج مطابقة."}</div>
      )}

      {filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>التاريخ</th>
                <th style={S.th}>المنتج</th>
                <th style={S.th}>الفئة</th>
                <th style={S.th}>رقم الدفعة</th>
                <th style={S.th}>المورد</th>
                <th style={S.th}>الكمية</th>
                <th style={S.th}>سبب الرفض</th>
                <th style={S.th}>الإجراء</th>
                <th style={S.th}>المفتش</th>
                <th style={S.th}>صور</th>
                <th style={S.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => {
                const p = rec?.payload || {};
                const dispColor = DISPOSITION_COLOR[p.disposition] || "#64748b";
                const photoList = Array.isArray(p.photos) ? p.photos : [];
                return (
                  <tr key={rec.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={S.td}>{fmtDate(p.reportDate)}</td>
                    <td style={S.td}><strong>{p.productName || "—"}</strong></td>
                    <td style={S.td}>{p.category || "—"}</td>
                    <td style={S.td}>{p.batchNo || "—"}</td>
                    <td style={S.td}>{p.supplier || "—"}</td>
                    <td style={S.td}>{p.quantity ? `${p.quantity} ${p.unit || ""}` : "—"}</td>
                    <td style={S.td}>{p.reason || "—"}</td>
                    <td style={S.td}>
                      <span style={S.badge(dispColor)}>{p.disposition || "—"}</span>
                    </td>
                    <td style={S.td}>{p.inspectedBy || "—"}</td>
                    <td style={S.td}>
                      {photoList.length === 0 ? "—" : (
                        <div style={{ display: "flex", gap: 4 }}>
                          {photoList.slice(0, 3).map((u, j) => (
                            <img key={`${u}-${j}`} src={u} alt={`Rejection ${j+1}`} style={S.imgThumb} onClick={() => setPreview({ open: true, src: u })} />
                          ))}
                          {photoList.length > 3 && <span style={{ alignSelf: "center", fontWeight: 800, color: "#64748b" }}>+{photoList.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td style={S.td}>
                      <button style={S.btnDanger} onClick={() => del(rec.id)}>🗑️ حذف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview.open && (
        <div onClick={() => setPreview({ open: false, src: "" })}
             style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={preview.src} alt="Preview" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
