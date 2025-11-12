// src/pages/monitor/branches/qcs/CorrectiveActionReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== API base (مطابق لملف NC) ===== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  undefined;
let VITE;
try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = (VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; }
})();

/* ===== Constants ===== */
const TYPE = "qcs_corrective_action";
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

/* ===== Helpers ===== */
const pad2 = (v) => String(v || "").padStart(2, "0");
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

/* ===== Styles ===== */
const sheet = {
  width: "210mm",
  margin: "0 auto",
  background: "#fff",
  color: "#000",
  border: "1px solid #d1d5db",
  boxShadow: "0 4px 14px rgba(0,0,0,.08)",
  fontFamily: "Arial,'Segoe UI',Tahoma,sans-serif",
  fontSize: 12,
  padding: "8mm",
};
const table = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
const cell = { border: "1px solid #000", padding: "6px 8px", verticalAlign: "middle" };

/* ===== Small view row ===== */
function RowKV({ label, value }) {
  return (
    <tr>
      <td style={{ ...cell, width: "38mm" }}><b>{label}</b></td>
      <td style={cell}>{value || "\u00A0"}</td>
    </tr>
  );
}

/* ===== Header band (بسيط) ===== */
function CARHeaderView({ date, logoUrl }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={logoUrl || LOGO_FALLBACK} alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ background: "#c0c0c0", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
            TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
          </div>
          <div style={{ background: "#d6d6d6", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
            CORRECTIVE ACTION REPORT
          </div>
          {date ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
              <span style={{ fontWeight: 900, textDecoration: "underline" }}>Report Date:</span>
              <span>{date}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ===== Server helpers (مطابقة لنهج NC) ===== */
async function listReports() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
    { method: "GET", cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const arr = Array.isArray(json) ? json : json?.data || [];
  return arr
    .map((r) => ({ id: r._id || r.id, _id: r._id, rawId: r.id, ...r }))
    .filter((r) => r?.payload);
}
async function deleteReport(anyId) {
  const id = encodeURIComponent(anyId);
  const res = await fetch(`${API_BASE}/api/reports/${id}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  return res.ok;
}

/* ===== Grouping: yyyy-mm => items (من dateIssued) ===== */
function groupByMonth(reports) {
  const map = {};
  for (const r of reports) {
    const d = String(r?.payload?.header?.dateIssued || "");
    const m = d.match(/^(\d{4})-(\d{2})-\d{2}$/);
    const key = m ? `${m[1]}-${m[2]}` : "Unknown";
    (map[key] ||= []).push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([month, items]) => [
      month,
      items.sort((a, b) =>
        String(b?.payload?.header?.dateIssued || "").localeCompare(
          String(a?.payload?.header?.dateIssued || "")
        )
      ),
    ]);
}

/* ===== Component ===== */
export default function CorrectiveActionReportsView() {
  const [data, setData] = useState([]);
  const [activeMonth, setActiveMonth] = useState("");
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);

  const current = useMemo(() => data.find((r) => r.id === activeId) || null, [data, activeId]);
  const safeRouteId = current?._id || current?.id || current?.rawId;
  const p = current?.payload;
  const h = p?.header || {};
  const b = p?.body || {};
  const f = p?.footer || {};

  useEffect(() => {
    (async () => {
      const rows = await listReports();
      setData(rows);
      const g = groupByMonth(rows);
      if (g.length) {
        setActiveMonth(g[0][0]);
        if (g[0][1]?.length) setActiveId(g[0][1][0].id);
      }
    })();
  }, []);

  /* ===== actions ===== */
  async function onDelete() {
    if (!safeRouteId) return;
    if (!window.confirm("حذف التقرير نهائيًا؟")) return;
    setBusy(true);
    const ok = await deleteReport(safeRouteId);
    if (!ok) alert("فشل الحذف");
    const rows = await listReports();
    setData(rows);
    setActiveId("");
    setBusy(false);
  }

  function exportXlsx() {
    if (!p) return;
    const aoa = [
      ["CORRECTIVE ACTION REPORT"],
      [],
      ["Report Date", h?.dateIssued || ""],
      ["Department involved", h?.departmentInvolved || ""],
      ["Initiated by", h?.initiatedBy || ""],
      ["Origin of non-conformity", h?.originOfNonConformity || ""],
      ["CAR Completed date", h?.carCompletedDate || ""],
      [],
      ["Details of Non-Conformity", b?.detailsOfNC || ""],
      ["Corrective Action", b?.correctiveAction || ""],
      ["Action taken to prevent recurrence", b?.preventiveAction || ""],
      [],
      ["Signed QA", f?.signedQA || "", "Date Closed out", f?.dateClosedOut || ""],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["A1"].s = { font: { bold: true, sz: 14 } };
    XLSX.utils.book_append_sheet(wb, ws, "CAR");
    XLSX.writeFile(wb, `CAR_${h?.dateIssued || "report"}.xlsx`);
  }

  async function exportPdf() {
    if (!sheetRef.current) return;
    const canvas = await html2canvas(sheetRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = (canvas.width * 25.4) / 96;
    const imgH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pageW / imgW, pageH / imgH);
    pdf.addImage(imgData, "PNG", (pageW - imgW * ratio) / 2, 5, imgW * ratio, imgH * ratio, undefined, "FAST");
    pdf.save(`${h?.dateIssued || "CAR_Report"}.pdf`);
  }

  const grouped = useMemo(() => groupByMonth(data), [data]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      {/* left tree (شهر ← أيام) */}
      <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>📂 Corrective Action • Archive</h4>
        {grouped.length === 0 && <div style={{ color: "#64748b" }}>لا توجد تقارير.</div>}
        {grouped.map(([month, items]) => (
          <div key={month} style={{ marginBottom: 10 }}>
            <button
              onClick={() => setActiveMonth(activeMonth === month ? "" : month)}
              style={{
                width: "100%", textAlign: "left", padding: "8px 10px",
                border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff",
                fontWeight: 800, marginBottom: 6,
              }}
            >
              {month} ({items.length})
            </button>
            {activeMonth === month && (
              <div style={{ paddingInlineStart: 8 }}>
                {items
                  .sort((a, b) =>
                    String(b?.payload?.header?.dateIssued || "").localeCompare(
                      String(a?.payload?.header?.dateIssued || "")
                    )
                  )
                  .map((r) => {
                    const d = toYMD(r?.payload?.header?.dateIssued || "");
                    const label = d || "No date";
                    const dept = r?.payload?.header?.departmentInvolved || "";
                    return (
                      <div key={r.id} style={{ display: "flex", gap: 8, margin: "6px 0" }}>
                        <button
                          onClick={() => setActiveId(r.id)}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            padding: "6px 8px",
                            border: "1px solid " + (activeId === r.id ? "#0b132b" : "#e5e7eb"),
                            borderRadius: 8,
                            background: activeId === r.id ? "#0b132b" : "#fff",
                            color: activeId === r.id ? "#fff" : "#0b132b",
                            fontWeight: 700,
                          }}
                          title={dept}
                        >
                          {label}{dept ? ` — ${dept}` : ""}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* right pane */}
      <div>
        {!p ? (
          <div style={{ color: "#64748b" }}>اختر تقريرًا من الشجرة.</div>
        ) : (
          <>
            {/* toolbar */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button
                disabled={busy}
                onClick={exportXlsx}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800 }}
              >
                📄 Export XLSX
              </button>
              <button
                disabled={busy}
                onClick={exportPdf}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800 }}
              >
                🖨️ Export PDF
              </button>
              <button
                disabled={busy}
                onClick={async () => { await onDelete(); }}
                style={{ marginLeft: "auto", padding: "10px 14px", borderRadius: 10, border: "1px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 800 }}
              >
                🗑️ Delete
              </button>
            </div>

            {/* printable sheet */}
            <div ref={sheetRef} style={{ ...sheet }}>
              <CARHeaderView date={h?.dateIssued} logoUrl={p?.logoUrl} />

              {/* Meta */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <RowKV label="Department involved" value={h?.departmentInvolved} />
                  <RowKV label="Initiated by" value={h?.initiatedBy} />
                  <RowKV label="Origin of non-conformity" value={h?.originOfNonConformity} />
                  <RowKV label="CAR Completed date" value={h?.carCompletedDate} />
                </tbody>
              </table>

              {/* Details */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}><b>Details of Non-Conformity</b></td>
                    <td style={cell}>{b?.detailsOfNC || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Corrective */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}><b>Corrective Action</b></td>
                    <td style={cell}>{b?.correctiveAction || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Preventive */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}><b>Action taken to prevent recurrence</b></td>
                    <td style={cell}>{b?.preventiveAction || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Sign-off */}
              <table style={{ ...table, marginTop: 6 }}>
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={cell}><b>Signed QA</b></td>
                    <td style={cell}>{f?.signedQA || "\u00A0"}</td>
                    <td style={cell}><b>Date Closed out</b></td>
                    <td style={cell}>{f?.dateClosedOut || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
