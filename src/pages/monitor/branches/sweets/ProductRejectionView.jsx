// src/pages/monitor/branches/sweets/ProductRejectionView.jsx
// Product Rejection Report — records list with filters, KPIs and exports.

import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canDelete } from "../../../../utils/perms";
import { SweetsReportActions, printNode, pdfFromNode, excelFromNode } from "./_sweetsReportKit";
import { businessDateOf, enLabel } from "./sweetsRecord";

const TYPE = "sweets_product_rejection";

const DISPOSITION_COLOR = {
  "Returned to Supplier": "#0ea5e9",
  Destroyed: "#dc2626",
  Quarantine: "#f59e0b",
  Downgraded: "#8b5cf6",
};

function fmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return d ? `${d}/${m}/${y}` : String(s);
}

export default function ProductRejectionView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [preview, setPreview] = useState("");
  const tableRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) =>
        String(b?.payload?.reportDate || "").localeCompare(String(a?.payload?.reportDate || ""))
      );
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("Delete this record permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) {
      alert(`Delete failed: ${e?.message || e}`);
    }
  }

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((r) => { const c = enLabel(r?.payload?.category); if (c) set.add(c); });
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.productName, p.category, p.batchNo, p.supplier, p.reason, p.disposition, p.inspectedBy, p.approvedBy, p.notes]
        .map((x) => String(x || "").toLowerCase()).join(" ");
      return (
        (!q || txt.includes(q)) &&
        (!month || businessDateOf(p).startsWith(month)) &&
        (catFilter === "all" || enLabel(p.category) === catFilter)
      );
    });
  }, [items, search, month, catFilter]);

  const kpis = useMemo(() => {
    const byDisp = {};
    const byReason = {};
    const bySupplier = {};
    let destroyed = 0;
    filtered.forEach((r) => {
      const p = r?.payload || {};
      const d = enLabel(p.disposition) || "—";
      byDisp[d] = (byDisp[d] || 0) + 1;
      const why = enLabel(p.reason);
      if (why) byReason[why] = (byReason[why] || 0) + 1;
      const sup = String(p.supplier || "").trim();
      if (sup) bySupplier[sup] = (bySupplier[sup] || 0) + 1;
      if (d === "Destroyed") destroyed += 1;
    });
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    const r = top(byReason);
    const s = top(bySupplier);
    return {
      total: filtered.length,
      destroyed,
      topReason: r ? `${r[0]} (${r[1]})` : "—",
      topSupplier: s ? `${s[0]} (${s[1]})` : "—",
    };
  }, [filtered]);

  const fileName = `product-rejections${month ? `-${month}` : ""}`;

  return (
    <div style={{ padding: 4 }}>
      <div style={S.topbar}>
        <h2 style={S.title}>🚫 Product Rejection Records</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SweetsReportActions
            onExcel={() => excelFromNode(tableRef.current, fileName, "Rejections")}
            onPdf={() => pdfFromNode(tableRef.current, fileName)}
            onPrint={() => printNode(tableRef.current, "Product Rejection Records")}
          />
          <button style={S.btn} onClick={load} disabled={loading}>{loading ? "⏳" : "↻ Refresh"}</button>
        </div>
      </div>

      <div style={S.kpiRow}>
        <Kpi label="Records" value={kpis.total} color="#0f766e" />
        <Kpi label="Destroyed" value={kpis.destroyed} color="#dc2626" />
        <Kpi label="Top reason" value={kpis.topReason} color="#7c3aed" small />
        <Kpi label="Most rejected supplier" value={kpis.topSupplier} color="#0369a1" small />
      </div>

      <div style={S.filters}>
        <input style={S.input} placeholder="🔍 Search product, supplier, reason, inspector…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || month || catFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setCatFilter("all"); }}>✖ Clear filters</button>
        )}
      </div>

      {loading && <div style={S.empty}>⏳ Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>{items.length === 0 ? "No records yet." : "No matching records."}</div>
      )}

      {filtered.length > 0 && (
        <div style={{ overflowX: "auto" }} ref={tableRef}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Date", "Product", "Category", "Batch No.", "Supplier", "Qty", "Reason", "Disposition", "Inspector", "Approved By", "Photos", ""].map((h, i) => (
                  <th key={i} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => {
                const p = rec?.payload || {};
                const disp = enLabel(p.disposition);
                const dispColor = DISPOSITION_COLOR[disp] || "#64748b";
                const photoList = Array.isArray(p.photos) ? p.photos : [];
                return (
                  <tr key={rec.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={S.td}>{fmtDate(businessDateOf(p))}</td>
                    <td style={S.td}><strong>{p.productName || "—"}</strong></td>
                    <td style={S.td}>{enLabel(p.category) || "—"}</td>
                    <td style={S.td}>{p.batchNo || "—"}</td>
                    <td style={S.td}>{p.supplier || "—"}</td>
                    <td style={S.td}>{p.quantity ? `${p.quantity} ${p.unit || ""}` : "—"}</td>
                    <td style={S.td}>{enLabel(p.reason) || "—"}</td>
                    <td style={S.td}><span style={S.badge(dispColor)}>{disp || "—"}</span></td>
                    <td style={S.td}>{p.inspectedBy || "—"}</td>
                    <td style={S.td}>{p.approvedBy || "—"}</td>
                    <td style={S.td}>
                      {photoList.length === 0 ? "—" : (
                        <div style={{ display: "flex", gap: 4 }}>
                          {photoList.slice(0, 3).map((u, j) => (
                            <img key={`${u}-${j}`} src={u} alt={`Rejection ${j + 1}`} style={S.imgThumb} onClick={() => setPreview(u)} />
                          ))}
                          {photoList.length > 3 && <span style={{ alignSelf: "center", fontWeight: 800, color: "#64748b" }}>+{photoList.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td style={S.td}>
                      {canDelete("daily") && (
                        <button style={S.btnDanger} onClick={() => del(rec.id)} data-delete-action="true">🗑️ Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview("")} style={S.lightbox}>
          <img src={preview} alt="Preview" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color, small }) {
  return (
    <div style={S.kpi}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color, ...(small ? { fontSize: 15, paddingTop: 6 } : null) }}>{value}</div>
    </div>
  );
}

const S = {
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: 0 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(2,6,23,0.06)" },
  th: { padding: "11px 12px", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle", fontSize: 14 },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  imgThumb: { width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: color + "22", color, border: `1px solid ${color}55`, whiteSpace: "nowrap" }),
  lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" },
};
