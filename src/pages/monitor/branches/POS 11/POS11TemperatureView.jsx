// src/pages/monitor/branches/POS 11/POS11TemperatureView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== API base (متوافق مع نمط المشروع) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== ثوابت التقرير ===== */
const TYPE   = "pos11_temperature";
const BRANCH = "POS 11";
const ADMIN_PIN = "9999";

/* ===== Helpers عامة ===== */
const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 10,
  padding: "10px 14px", fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 14px #00000022"
});
const toISODate = (s) => {
  try {
    if (!s) return "";
    const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  } catch { return ""; }
};
const formatDMY = (s) => {
  const d = toISODate(s);
  if (!d) return "—";
  const [y,m,dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

const isFreezer = (name = "") => /freezer/i.test(String(name).trim());
const isRoom    = (name = "") => /production\s*room/i.test(String(name).trim());
const isChiller = (name = "") => /(cooler|chiller)/i.test(String(name).trim());

/* KPI للمبرّدات/الشيلرات فقط (0–5°C) */
function calculateKPI(rows = []) {
  const all = [];
  let out = 0;
  for (const r of rows) {
    if (!isChiller(r.name) || isFreezer(r.name) || isRoom(r.name)) continue;
    for (const [k, v] of Object.entries(r.temps || {})) {
      if (k === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out += 1;
      }
    }
  }
  const avg = all.length ? (all.reduce((a,b)=>a+b,0)/all.length).toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

/* ====== المكوّن ====== */
export default function POS11TemperatureView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [opMsg, setOpMsg] = useState("");
  const printRef = useRef(null);

  /* جلب كل تقارير النوع */
  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json = await res.json().catch(()=>[]);
        const arr  = Array.isArray(json) ? json : (json?.data || json?.items || []);
        if (!abort) {
          // ترتيب تنازلي بالتاريخ
          const sorted = [...arr].sort((a,b) => {
            const da = new Date(a?.payload?.date || a?.created_at || 0).getTime();
            const db = new Date(b?.payload?.date || b?.created_at || 0).getTime();
            return db - da;
          });
          setReports(sorted);
          if (sorted.length && !selectedId) setSelectedId(getId(sorted[0]));
        }
      } catch (e) {
        if (!abort) setReports([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
  }, []);

  const selected = useMemo(() => reports.find(r => getId(r) === selectedId), [reports, selectedId]);
  const payload  = selected?.payload ?? selected ?? {};
  const times    = (payload?.times || []).filter(t => t !== "Corrective Action");
  const rows     = payload?.coolers || [];
  const kpi      = useMemo(() => calculateKPI(rows), [rows]);

  /* PDF تصدير */
  const exportPDF = async () => {
    if (!printRef.current) return;
    const node = printRef.current;
    const canvas = await html2canvas(node, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    // احتفاظ بنسبة العرض/الارتفاع
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio, h = canvas.height * ratio;
    pdf.addImage(imgData, "PNG", (pageW - w)/2, 16, w, h);
    pdf.save(`POS11_Temperature_${formatDMY(payload?.date)}.pdf`);
  };

  /* CSV تصدير (Excel) */
  const exportCSV = () => {
    const headers = ["Cooler/Freezer", ...times, "Remarks"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const row = [csvSafe(r.name)];
      for (const t of times) row.push(csvSafe(r?.temps?.[t] ?? ""));
      row.push(csvSafe(r?.remarks ?? r?.temps?.["Corrective Action"] ?? ""));
      lines.push(row.join(","));
    }
    const meta = [
      `Document Title:,Temperature Control Record`,
      `Document No:,FS-QM/REC/TMP`,
      `Area:,${BRANCH}`,
      `Date:,${formatDMY(payload?.date)}`
    ].join("\n");
    const csv = meta + "\n\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `POS11_Temperature_${toISODate(payload?.date) || "report"}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const csvSafe = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  /* حذف تقرير بعد PIN */
  const handleDelete = async () => {
    if (!selected) return;
    const pin = window.prompt("Enter PIN to delete:");
    if (pin !== ADMIN_PIN) { alert("❌ Wrong PIN."); return; }
    try {
      setOpMsg("⏳ Deleting…");
      const id = getId(selected);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReports((prev) => prev.filter((r) => getId(r) !== id));
      setSelectedId((prevId) => {
        const rest = reports.filter((r) => getId(r) !== id);
        return rest[0] ? getId(rest[0]) : "";
      });
      setOpMsg("✅ Deleted.");
    } catch (e) {
      setOpMsg("❌ Failed to delete.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>POS 11 — Temperature Records (View)</h2>

      {/* اختيار التقرير بالتاريخ */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontWeight: 700 }}>Select Date:</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #9aa4ae", minWidth: 200 }}
        >
          {loading && <option>Loading…</option>}
          {!loading && !reports.length && <option>No data</option>}
          {!loading && reports.map((r) => {
            const p = r?.payload ?? r;
            const d = p?.date || r?.created_at;
            return (
              <option key={getId(r)} value={getId(r)}>
                {formatDMY(d)} — {BRANCH}
              </option>
            );
          })}
        </select>

        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportPDF} style={btn("#0ea5e9")}>⬇️ Export PDF</button>
          <button onClick={exportCSV} style={btn("#10b981")}>⬇️ Export Excel (CSV)</button>
          <button onClick={handleDelete} style={btn("#ef4444")}>🗑️ Delete</button>
        </div>
      </div>

      {opMsg && (
        <div style={{ marginBottom: 8, fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>
          {opMsg}
        </div>
      )}

      {/* منطقة الطباعة/التصدير */}
      <div ref={printRef} style={{ background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)", padding: 16, borderRadius: 14, boxShadow: "0 4px 18px #d2b4de44" }}>
        {/* ترويسة المستند نفسها */}
        <table style={topTable}>
          <tbody>
            <tr>
              <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                  AL<br/>MAWASHI
                </div>
              </td>
              <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
              <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
            </tr>
            <tr>
              <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
              <td style={tdHeader}><b>Revision No:</b> 0</td>
            </tr>
            <tr>
              <td style={tdHeader}><b>Area:</b> {BRANCH}</td>
              <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
            </tr>
            <tr>
              <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
              <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
            </tr>
          </tbody>
        </table>

        <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
        <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

        {/* معلومات اليوم المختار */}
        <div style={{ margin: "8px 0 10px", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>
            📅 Date: <span style={{ fontWeight: 800 }}>{formatDMY(payload?.date)}</span>
          </div>
          <div style={{ fontWeight: 700 }}>
            Checked By: <span style={{ fontWeight: 800 }}>{safe(payload?.checkedBy) || "—"}</span>
            <span style={{ marginInline: 10 }}></span>
            Verified By: <span style={{ fontWeight: 800 }}>{safe(payload?.verifiedBy) || "—"}</span>
          </div>
        </div>

        {/* تعليمات مختصرة من ملف الإدخال */}
        <div style={rulesBox}>
          <div>1. If the cooler temp is +5°C or more – corrective action should be taken.</div>
          <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
          <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
          <div style={{ marginTop: 6 }}>
            <b>Note (Freezers):</b> acceptable range -25°C to -12°C.
          </div>
          <div style={{ marginTop: 6 }}>
            <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
          </div>
        </div>

        {/* جدول العرض */}
        <table style={gridTable}>
          <thead>
            <tr>
              <th style={thCell}>Cooler/Freezer</th>
              {times.map((t) => <th key={t} style={thCell}>{t}</th>)}
              <th style={thCell}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCellLeft}><b>{safe(r.name)}</b></td>
                {times.map((t) => (
                  <td key={t} style={tdCellCenter}>{safe(r?.temps?.[t])}</td>
                ))}
                <td style={tdCellLeft}>
                  {safe(r?.remarks || r?.temps?.["Corrective Action"])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* KPI */}
        <div style={{ marginTop: 10, fontWeight: 800 }}>
          KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
          <span style={{ marginInlineStart: 10, fontWeight: 600, color: "#374151" }}>
            (Chillers/Coolers only)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ===== Styles (مطابقة لأسلوب الإدخال) ===== */
const topTable = { width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "0.9rem", border: "1px solid #9aa4ae", background: "#f8fbff" };
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1 = { width: "100%", textAlign: "center", background: "#bfc7cf", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none" };
const band2 = { width: "100%", textAlign: "center", background: "#dde3e9", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none", marginBottom: "8px" };
const rulesBox = { border: "1px solid #9aa4ae", background: "#f1f5f9", padding: "8px 10px", fontSize: "0.92rem", marginBottom: "10px" };
const gridTable = { width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae", background: "#ffffff" };
const thCell = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center", background: "#e0e6ed", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" };
const tdCellCenter = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center" };
const tdCellLeft = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "left" };
