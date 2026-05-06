// src/pages/monitor/branches/qcs/GarbageDisposalView.jsx
// QCS — Garbage / Waste Disposal — Records list (with month filter, search, KPIs)

import React, { useEffect, useMemo, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_garbage_disposal";

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
  th: { padding: "10px 12px", background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 12.5 },
  td: { padding: "9px 12px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle" },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  imgThumb: { width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString(); } catch { return s; } }

export default function GarbageDisposalView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [wasteFilter, setWasteFilter] = useState("all");
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

  const wasteTypes = useMemo(() => {
    const set = new Set();
    items.forEach((r) => { const t = r?.payload?.wasteType; if (t) set.add(t); });
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.location, p.vendor?.name, p.vendor?.invoiceNumber, p.disposedBy, p.supervisor, p.notes]
        .map((x) => String(x || "").toLowerCase()).join(" ");
      const matchesQ = !q || txt.includes(q);
      const matchesMonth = !month || String(p.reportDate || "").startsWith(month);
      const matchesType = wasteFilter === "all" || p.wasteType === wasteFilter;
      return matchesQ && matchesMonth && matchesType;
    });
  }, [items, search, month, wasteFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    let totalKg = 0, totalAmount = 0;
    filtered.forEach((r) => {
      const p = r?.payload || {};
      const q = Number(p.quantity) || 0;
      if (p.unit === "kg") totalKg += q;
      else if (p.unit === "ton") totalKg += q * 1000;
      totalAmount += Number(p.vendor?.invoiceAmount) || 0;
    });
    return { total, totalKg: Math.round(totalKg), totalAmount: totalAmount.toFixed(2) };
  }, [filtered]);

  return (
    <div style={{ padding: 4 }}>
      <div style={S.topbar}>
        <h2 style={S.title}>🗑️ سجلات التخلص من النفايات / Garbage Disposal Records</h2>
        <button style={S.btn} onClick={load} disabled={loading}>{loading ? "⏳" : "↻ Refresh"}</button>
      </div>

      <div style={S.kpiRow}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي السجلات</div>
          <div style={{ ...S.kpiValue, color: "#0369a1" }}>{kpis.total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي الكمية (كغ)</div>
          <div style={{ ...S.kpiValue, color: "#16a34a" }}>{kpis.totalKg}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>إجمالي الفواتير (AED)</div>
          <div style={{ ...S.kpiValue, color: "#a16207" }}>{kpis.totalAmount}</div>
        </div>
      </div>

      <div style={S.filters}>
        <input style={S.input} placeholder="🔍 ابحث (شركة، موقع، اسم، فاتورة...)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={wasteFilter} onChange={(e) => setWasteFilter(e.target.value)}>
          <option value="all">كل الأنواع</option>
          {wasteTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || month || wasteFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setWasteFilter("all"); }}>✖ مسح الفلاتر</button>
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
                <th style={S.th}>الموقع</th>
                <th style={S.th}>نوع النفايات</th>
                <th style={S.th}>الكمية</th>
                <th style={S.th}>الشركة</th>
                <th style={S.th}>رقم الفاتورة</th>
                <th style={S.th}>المبلغ</th>
                <th style={S.th}>قام بالتخلص</th>
                <th style={S.th}>الفاتورة</th>
                <th style={S.th}>صور</th>
                <th style={S.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => {
                const p = rec?.payload || {};
                const inv = p?.images?.invoice;
                const extras = p?.images?.extras || [];
                return (
                  <tr key={rec.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={S.td}>{fmtDate(p.reportDate)}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}>{p.wasteType || "—"}</td>
                    <td style={S.td}>{p.quantity ? `${p.quantity} ${p.unit || ""}` : "—"}</td>
                    <td style={S.td}>{p.vendor?.name || "—"}</td>
                    <td style={S.td}>{p.vendor?.invoiceNumber || "—"}</td>
                    <td style={S.td}>{p.vendor?.invoiceAmount ? `${p.vendor.invoiceAmount} AED` : "—"}</td>
                    <td style={S.td}>{p.disposedBy || "—"}</td>
                    <td style={S.td}>
                      {inv ? (
                        <img src={inv} alt="Invoice" style={S.imgThumb} onClick={() => setPreview({ open: true, src: inv })} />
                      ) : "—"}
                    </td>
                    <td style={S.td}>
                      {extras.length === 0 ? "—" : (
                        <div style={{ display: "flex", gap: 4 }}>
                          {extras.slice(0, 3).map((u, j) => (
                            <img key={`${u}-${j}`} src={u} alt={`Extra ${j+1}`} style={S.imgThumb} onClick={() => setPreview({ open: true, src: u })} />
                          ))}
                          {extras.length > 3 && <span style={{ alignSelf: "center", fontWeight: 800, color: "#64748b" }}>+{extras.length - 3}</span>}
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
