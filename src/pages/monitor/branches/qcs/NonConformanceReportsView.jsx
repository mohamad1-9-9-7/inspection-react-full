// src/pages/monitor/branches/qcs/NonConformanceReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== API base ===== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  undefined;
let VITE;
try {
  VITE = import.meta.env?.VITE_API_URL;
} catch {}
const API_BASE = (VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

const TYPE = "qcs_non_conformance";
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

/* ===== Header view ===== */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "6px 8px",
          borderInlineEnd: "1px solid #000",
          minWidth: 170,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value || "\u00A0"}</div>
    </div>
  );
}
function NCHeaderView({ header, date, logoUrl }) {
  const h = header || {};
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 1fr",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <RowKV label="Document Title:" value={h.documentTitle} />
          <RowKV label="Issue Date:" value={h.issueDate} />
          <RowKV label="Area:" value={h.area} />
          <RowKV label="Controlling Officer:" value={h.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={h.documentNo} />
          <RowKV label="Revision No:" value={h.revisionNo} />
          <RowKV label="Issued By:" value={h.issuedBy} />
          <RowKV label="Approved By:" value={h.approvedBy} />
        </div>
      </div>
      <div style={{ borderTop: "1px solid #000" }}>
        <div
          style={{
            background: "#c0c0c0",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
        </div>
        <div
          style={{
            background: "#d6d6d6",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          NON-CONFORMANCE REPORT
        </div>
        {date ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "6px 8px",
            }}
          >
            <span style={{ fontWeight: 900, textDecoration: "underline" }}>
              Date:
            </span>
            <span>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
const cell = {
  border: "1px solid #000",
  padding: "6px 8px",
  verticalAlign: "middle",
};

/* ===== Server helpers ===== */
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

/* ===== Grouping yyyy-mm => days ===== */
function groupByMonth(reports) {
  const map = {};
  for (const r of reports) {
    const d = String(r?.payload?.headRow?.reportDate || "");
    const m = d.match(/^(\d{4})-(\d{2})-\d{2}$/);
    const key = m ? `${m[1]}-${m[2]}` : "Unknown";
    (map[key] ||= []).push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([month, items]) => [
      month,
      items.sort((a, b) =>
        String(b?.payload?.headRow?.reportDate || "").localeCompare(
          String(a?.payload?.headRow?.reportDate || "")
        )
      ),
    ]);
}

/* ===== Component ===== */
export default function NonConformanceReportsView() {
  const [data, setData] = useState([]);
  const [activeMonth, setActiveMonth] = useState("");
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);

  const current = useMemo(
    () => data.find((r) => r.id === activeId) || null,
    [data, activeId]
  );
  const safeRouteId = current?._id || current?.id || current?.rawId;
  const view = current?.payload;

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

  /* ===== actions (view-only) ===== */
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
    if (!view) return;
    const p = view;
    const aoa = [
      ["NON-CONFORMANCE REPORT"],
      [],
      [
        "Document Title",
        p?.headerTop?.documentTitle || "",
        "Document No",
        p?.headerTop?.documentNo || "",
      ],
      [
        "Issue Date",
        p?.headerTop?.issueDate || "",
        "Revision No",
        p?.headerTop?.revisionNo || "",
      ],
      [
        "Area",
        p?.headerTop?.area || "",
        "Controlling Officer",
        p?.headerTop?.controllingOfficer || "",
      ],
      ["Issued By", p?.headerTop?.issuedBy || "", "Approved By", p?.headerTop?.approvedBy || ""],
      [],
      ["Location", p?.location || ""],
      ["Date", p?.headRow?.reportDate || "", "NC No.", p?.headRow?.ncNo || ""],
      ["Issued to", p?.headRow?.issuedTo || "", "Issued by", p?.headRow?.issuedBy || ""],
      [
        "",
        "",
      ],
      [
        "Reference",
        `${p?.reference?.inhouseQC ? "In-house QC; " : ""}${
          p?.reference?.customerComplaint ? "Customer Complaint; " : ""
        }${p?.reference?.internalAudit ? "Internal Audit; " : ""}${
          p?.reference?.externalAudit ? "External Audit" : ""
        }`,
      ],
      [],
      ["Nonconformance/Report Details", p?.detailsBlock || ""],
      ["Root Cause(s)", p?.rootCause || ""],
      ["Corrective Action", p?.correctiveAction || ""],
      ["Performed by", p?.performedBy || "", "Department", p?.department || ""],
      ["Verification of Corrective Action", p?.verificationOfCorrectiveAction || ""],
      ["Signature", p?.signature?.signature || "", "Date", p?.signature?.date || ""],
      [
        "Responsible Person",
        p?.signature?.responsiblePerson || "",
        "Signature",
        p?.signature?.responsibleSignature || "",
      ],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["A1"].s = { font: { bold: true, sz: 14 } };
    XLSX.utils.book_append_sheet(wb, ws, "NC Report");
    XLSX.writeFile(wb, `NC_${p?.headRow?.reportDate || "report"}.xlsx`);
  }

  async function exportPdf() {
    if (!sheetRef.current) return;
    const canvas = await html2canvas(sheetRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = (canvas.width * 25.4) / 96;
    const imgH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pageW / imgW, pageH / imgH);
    pdf.addImage(
      imgData,
      "PNG",
      (pageW - imgW * ratio) / 2,
      5,
      imgW * ratio,
      imgH * ratio,
      undefined,
      "FAST"
    );
    pdf.save(`${view?.headRow?.reportDate || "NC_Report"}.pdf`);
  }

  const grouped = useMemo(() => groupByMonth(data), [data]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      {/* left tree */}
      <div
        style={{
          background: "#fafafa",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <h4 style={{ marginTop: 0 }}>📂 Non-Conformance • Archive</h4>
        {grouped.length === 0 && (
          <div style={{ color: "#64748b" }}>لا توجد تقارير.</div>
        )}
        {grouped.map(([month, items]) => (
          <div key={month} style={{ marginBottom: 10 }}>
            <button
              onClick={() =>
                setActiveMonth(activeMonth === month ? "" : month)
              }
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fff",
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              {month} ({items.length})
            </button>
            {activeMonth === month && (
              <div style={{ paddingInlineStart: 8 }}>
                {items.map((r) => {
                  const d = r?.payload?.headRow?.reportDate || "";
                  const label = d || "No date";
                  return (
                    <div
                      key={r.id}
                      style={{ display: "flex", gap: 8, margin: "6px 0" }}
                    >
                      <button
                        onClick={() => setActiveId(r.id)}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          padding: "6px 8px",
                          border:
                            "1px solid " +
                            (activeId === r.id ? "#0b132b" : "#e5e7eb"),
                          borderRadius: 8,
                          background: activeId === r.id ? "#0b132b" : "#fff",
                          color: activeId === r.id ? "#fff" : "#0b132b",
                          fontWeight: 700,
                        }}
                      >
                        {label} — {r?.payload?.headRow?.ncNo || "NC"}
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
        {!view ? (
          <div style={{ color: "#64748b" }}>اختر تقريرًا من الشجرة.</div>
        ) : (
          <>
            {/* toolbar — view-only */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button
                disabled={busy}
                onClick={exportXlsx}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 800,
                }}
              >
                📄 Export XLSX
              </button>
              <button
                disabled={busy}
                onClick={exportPdf}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 800,
                }}
              >
                🖨️ Export PDF
              </button>
              <button
                disabled={busy}
                onClick={onDelete}
                style={{
                  marginLeft: "auto",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ef4444",
                  background: "#fff",
                  color: "#ef4444",
                  fontWeight: 800,
                }}
              >
                🗑️ Delete
              </button>
            </div>

            <div ref={sheetRef} style={{ ...sheet }}>
              <NCHeaderView
                header={view?.headerTop}
                date={view?.headRow?.reportDate}
                logoUrl={view?.logoUrl}
              />

              {/* Location */}
              <table style={table}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "22mm" }}>
                      <b>Location:</b>
                    </td>
                    <td style={cell}>{view?.location || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Date | NC No | Issued to/by */}
              <table style={{ ...table, marginTop: 6 }}>
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "38%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={cell}>
                      <b>Date:</b>
                    </td>
                    <td style={cell}>{view?.headRow?.reportDate || "\u00A0"}</td>
                    <td style={cell}>
                      <b>NC No.:</b>
                    </td>
                    <td style={cell}>{view?.headRow?.ncNo || "\u00A0"}</td>
                  </tr>
                  <tr>
                    <td style={cell}>
                      <b>Issued to:</b>
                    </td>
                    <td style={cell}>{view?.headRow?.issuedTo || "\u00A0"}</td>
                    <td style={cell}>
                      <b>Issued by:</b>
                    </td>
                    <td style={cell}>{view?.headRow?.issuedBy || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Reference */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "22mm" }}>
                      <b>Reference</b>
                    </td>
                    <td style={cell}>
                      {(view?.reference?.inhouseQC
                        ? "☑ In-house QC  "
                        : "□ In-house QC  ")}
                      {(view?.reference?.customerComplaint
                        ? "☑ Customer Complaint  "
                        : "□ Customer Complaint  ")}
                      {(view?.reference?.internalAudit
                        ? "☑ Internal Audit  "
                        : "□ Internal Audit  ")}
                      {(view?.reference?.externalAudit
                        ? "☑ External Audit"
                        : "□ External Audit")}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Details */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}>
                      <b>Nonconformance/Report Details</b>
                    </td>
                    <td style={cell}>{view?.detailsBlock || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Root Cause */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}>
                      <b>Root Cause(s) of Nonconformance</b>
                    </td>
                    <td style={cell}>{view?.rootCause || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Corrective Action */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}>
                      <b>Corrective Action</b>
                    </td>
                    <td style={cell}>{view?.correctiveAction || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Performed by / Department */}
              <table style={{ ...table, marginTop: 6 }}>
                <colgroup>
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "33%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "33%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={cell}>
                      <b>Performed by:</b>
                    </td>
                    <td style={cell}>{view?.performedBy || "\u00A0"}</td>
                    <td style={cell}>
                      <b>Department:</b>
                    </td>
                    <td style={cell}>{view?.department || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Verification */}
              <table style={{ ...table, marginTop: 6 }}>
                <tbody>
                  <tr>
                    <td style={{ ...cell, width: "60mm" }}>
                      <b>Verification of Corrective Action:</b>
                    </td>
                    <td style={cell}>
                      {view?.verificationOfCorrectiveAction || "\u00A0"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature + Date */}
              <table style={{ ...table, marginTop: 6 }}>
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "38%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={cell}>
                      <b>Signature:</b>
                    </td>
                    <td style={cell}>{view?.signature?.signature || "\u00A0"}</td>
                    <td style={cell}>
                      <b>Date:</b>
                    </td>
                    <td style={cell}>{view?.signature?.date || "\u00A0"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Responsible Person | Signature */}
              <table style={{ ...table, marginTop: 6 }}>
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={cell}>
                      <b>Responsible Person:</b>
                    </td>
                    <td style={cell}>
                      {view?.signature?.responsiblePerson || "\u00A0"}
                    </td>
                    <td style={cell}>
                      <b>Signature:</b>
                    </td>
                    <td style={cell}>
                      {view?.signature?.responsibleSignature || "\u00A0"}
                    </td>
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
