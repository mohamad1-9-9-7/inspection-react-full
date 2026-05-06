// src/pages/monitor/branches/qcs/StockRotationView.jsx
// QCS — Stock Rotation Audit (FIFO/FEFO) — Records list

import React, { useEffect, useMemo, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_stock_rotation";

const COMPLIANCE_COLORS = {
  compliant: { color: "#16a34a", label: "✅ مطابق" },
  minor:     { color: "#f59e0b", label: "⚠️ مخالفة طفيفة" },
  major:     { color: "#dc2626", label: "❌ مخالفة جسيمة" },
};

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 8px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  btnDetails: { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontWeight: 800, fontSize: 11, cursor: "pointer" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(2,6,23,0.06)" },
  th: { padding: "10px 12px", background: "linear-gradient(180deg,#0ea5e9,#0284c7)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 12.5 },
  td: { padding: "9px 12px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle" },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  badge: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${color}22`, color, fontWeight: 900, fontSize: 11 }),
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  modal: { background: "#fff", borderRadius: 14, padding: 16, maxWidth: 900, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  itemRow: { padding: "8px 10px", borderTop: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 80px", gap: 8, fontSize: 12, fontWeight: 700 },
  itemHead: { padding: "8px 10px", background: "#f1f5f9", display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 80px", gap: 8, fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase" },
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString(); } catch { return s; } }

export default function StockRotationView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.reportDate || 0) - new Date(a?.payload?.reportDate || 0));
      setItems(arr);
    } catch (e) {
      console.error("Stock rotation load failed:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteRecord(id) {
    if (!id) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE", credentials: IS_SAME_ORIGIN ? "include" : "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert("فشل الحذف: " + (e?.message || e));
    }
  }

  const locations = useMemo(() => {
    const set = new Set();
    items.forEach((r) => { const l = r?.payload?.location; if (l) set.add(l); });
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      const p = r?.payload || {};
      if (month) {
        const d = String(p.reportDate || "").slice(0, 7);
        if (d !== month) return false;
      }
      if (locationFilter !== "all" && p.location !== locationFilter) return false;
      if (complianceFilter !== "all" && p.summary?.overallCompliance !== complianceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const itemsText = (Array.isArray(p.items) ? p.items : []).map((it) => `${it.productCode} ${it.productName} ${it.batchNo}`).join(" ");
        const hay = [p.location, p.storageArea, p.auditedBy, p.verifiedBy, p.findings, itemsText].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, month, locationFilter, complianceFilter]);

  /* KPIs */
  const totalAudits = filtered.length;
  const totalItems = filtered.reduce((s, r) => s + (Array.isArray(r?.payload?.items) ? r.payload.items.length : 0), 0);
  const totalExpired = filtered.reduce((s, r) => s + (Number(r?.payload?.summary?.expiredQty) || 0), 0);
  const totalNearExpiry = filtered.reduce((s, r) => s + (Number(r?.payload?.summary?.nearExpiryQty) || 0), 0);

  return (
    <div>
      <div style={S.topbar}>
        <h2 style={S.title}>📦 تدقيق دوران المخزون / Stock Rotation Audits</h2>
        <button style={S.btn} onClick={load} disabled={loading}>{loading ? "⏳ تحديث..." : "🔄 تحديث"}</button>
      </div>

      {/* Filters */}
      <div style={S.card}>
        <div style={S.filters}>
          <input
            style={S.input}
            placeholder="🔍 بحث (موقع، كود، اسم صنف...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
          <select style={S.input} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            {locations.map((l) => <option key={l} value={l}>{l === "all" ? "جميع المواقع" : l}</option>)}
          </select>
          <select style={S.input} value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value)}>
            <option value="all">كل التقييمات</option>
            <option value="compliant">مطابق فقط</option>
            <option value="minor">مخالفة طفيفة</option>
            <option value="major">مخالفة جسيمة</option>
          </select>
          {(search || month || locationFilter !== "all" || complianceFilter !== "all") && (
            <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setLocationFilter("all"); setComplianceFilter("all"); }}>
              مسح المرشحات
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={S.kpiRow}>
        <div style={S.kpi}><div style={S.kpiLabel}>إجمالي التدقيقات</div><div style={{ ...S.kpiValue, color: "#0ea5e9" }}>{totalAudits}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>إجمالي الأصناف</div><div style={{ ...S.kpiValue, color: "#7c3aed" }}>{totalItems}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>منتهية الصلاحية</div><div style={{ ...S.kpiValue, color: "#dc2626" }}>{totalExpired}</div></div>
        <div style={S.kpi}><div style={S.kpiLabel}>قريبة الانتهاء</div><div style={{ ...S.kpiValue, color: "#f59e0b" }}>{totalNearExpiry}</div></div>
      </div>

      {/* Records table */}
      {loading ? (
        <div style={S.empty}>⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>لا توجد سجلات.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>التاريخ</th>
                <th style={S.th}>الموقع</th>
                <th style={S.th}>منطقة التخزين</th>
                <th style={S.th}>الطريقة</th>
                <th style={S.th}>الأصناف</th>
                <th style={S.th}>منتهية</th>
                <th style={S.th}>قريبة الانتهاء</th>
                <th style={S.th}>التقييم</th>
                <th style={S.th}>المدقق</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = r?.payload || {};
                const compliance = COMPLIANCE_COLORS[p.summary?.overallCompliance] || COMPLIANCE_COLORS.compliant;
                return (
                  <tr key={r._id || r.id || `${p.savedAt}-${p.reportDate}`}>
                    <td style={S.td}>{fmtDate(p.reportDate)}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}>{(p.storageArea || "—").split("/")[0].trim()}</td>
                    <td style={S.td}>{(p.rotationMethod || "—").split("(")[0].trim()}</td>
                    <td style={S.td}>{Array.isArray(p.items) ? p.items.length : 0}</td>
                    <td style={S.td}><span style={S.badge("#dc2626")}>{p.summary?.expiredQty || 0}</span></td>
                    <td style={S.td}><span style={S.badge("#f59e0b")}>{p.summary?.nearExpiryQty || 0}</span></td>
                    <td style={S.td}><span style={S.badge(compliance.color)}>{compliance.label}</span></td>
                    <td style={S.td}>{p.auditedBy || "—"}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={S.btnDetails} onClick={() => setDetail(r)}>تفاصيل</button>
                        <button style={S.btnDanger} onClick={() => deleteRecord(r._id || r.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detail && (() => {
        const p = detail?.payload || {};
        const items = Array.isArray(p.items) ? p.items : [];
        return (
          <div style={S.modalOverlay} onClick={() => setDetail(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>تفاصيل التدقيق — {fmtDate(p.reportDate)}</h3>
                <button style={S.btn} onClick={() => setDetail(null)}>إغلاق ✕</button>
              </div>

              <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                <div><b>الموقع:</b> {p.location}</div>
                <div><b>منطقة التخزين:</b> {p.storageArea}</div>
                <div><b>الطريقة:</b> {p.rotationMethod}</div>
                <div><b>المدقق:</b> {p.auditedBy}</div>
                <div><b>المعتمد:</b> {p.verifiedBy || "—"}</div>
                <div><b>وقت التدقيق:</b> {p.auditTime || "—"}</div>
              </div>

              <h4 style={{ margin: "12px 0 6px", fontWeight: 900 }}>الأصناف المدققة ({items.length})</h4>
              <div style={S.itemHead}>
                <div>كود</div>
                <div>الصنف</div>
                <div>الدفعة</div>
                <div>الانتهاء</div>
                <div>الكمية</div>
                <div>الترتيب</div>
              </div>
              {items.map((it, i) => {
                const days = Number(it.daysToExpiry);
                const bg = days < 0 ? "#fee2e2" : days <= 7 ? "#fef3c7" : "#fff";
                return (
                  <div key={i} style={{ ...S.itemRow, background: bg }}>
                    <div>{it.productCode || "—"}</div>
                    <div>{it.productName || "—"}</div>
                    <div>{it.batchNo || "—"}</div>
                    <div>{fmtDate(it.expiryDate)} ({it.daysToExpiry}d)</div>
                    <div>{it.quantity} {it.unit}</div>
                    <div>{it.positionCorrect ? "✅" : "❌"}</div>
                  </div>
                );
              })}

              {(p.findings || p.correctiveActions) && (
                <div style={{ marginTop: 12, padding: 10, background: "#f8fafc", borderRadius: 8 }}>
                  {p.findings && <div style={{ marginBottom: 6 }}><b>الملاحظات:</b> {p.findings}</div>}
                  {p.correctiveActions && <div><b>الإجراءات التصحيحية:</b> {p.correctiveActions}</div>}
                </div>
              )}

              {Array.isArray(p.images?.extras) && p.images.extras.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ margin: "0 0 6px", fontWeight: 900 }}>الصور</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                    {p.images.extras.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img src={u} alt={`Audit attachment ${i + 1}`} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
