// src/pages/monitor/branches/qcs/PestControlView.jsx
// QCS — Pest Control Log — Records list (with month filter, search, KPIs)

import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GlassShell, KpiGrid, ReportActions, ResponsiveTableWrap } from "../_shared/branchViewKit";
import { deleteReport, downloadReportsJson, listReports, reportId } from "../_shared/reportApi";
import { pdfSafeText } from "./pdfImageUtils";

const TYPE = "qcs_pest_control";

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
  table: { width: "100%", borderCollapse: "collapse", fontSize: 18, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(2,6,23,0.06)" },
  th: { padding: "12px 14px", background: "linear-gradient(180deg,#7c3aed,#6d28d9)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 15 },
  td: { padding: "11px 14px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle", fontSize: 18 },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  imgThumb: { width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
  pillTag: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${color}22`, color, fontWeight: 800, fontSize: 14, marginInlineEnd: 4, marginBottom: 2 }),
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString(); } catch { return s; } }

function buildPestPDF(records) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const M = 12;

  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, pw, 24, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Pest Control Log", pw / 2, 10, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`QCS | Generated: ${new Date().toLocaleString("en-GB")} | Records: ${records.length}`, pw / 2, 17, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["#", "Date", "Location", "Company", "Technician", "Visit Type", "Targeted", "Stations", "Inspector", "Next Visit"]],
    body: records.map((row, index) => {
      const p = row?.payload || {};
      const targeted = Array.isArray(p.pestsTargeted) ? p.pestsTargeted.map((x) => String(x).split("/")[0].trim()).join(", ") : "";
      const stations = Array.isArray(p.stations) ? p.stations.length : 0;
      return [
        index + 1,
        fmtDate(p.reportDate),
        pdfSafeText(p.location),
        pdfSafeText(p.company?.name),
        pdfSafeText(p.technician),
        pdfSafeText(p.visitType),
        pdfSafeText(targeted),
        stations,
        pdfSafeText(p.inspector),
        fmtDate(p.nextVisitDate),
      ];
    }),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3, font: "helvetica", overflow: "linebreak" },
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    margin: { left: M, right: M },
  });

  return doc;
}

export default function PestControlView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [locationFilter, setLocationFilter] = useState("all");
  const [preview, setPreview] = useState({ open: false, src: "" });
  const [exportingPDF, setExportingPDF] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const arr = await listReports(TYPE);
      arr.sort((a, b) => new Date(b?.payload?.reportDate || 0) - new Date(a?.payload?.reportDate || 0));
      setItems(arr);
    } catch (e) {
      console.error("Pest control load failed:", e);
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
      await deleteReport(id);
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
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          p.company?.name, p.company?.serviceReportNo, p.technician,
          p.inspector, p.location, p.findings, p.correctiveActions,
          ...(Array.isArray(p.pestsTargeted) ? p.pestsTargeted : []),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, month, locationFilter]);

  /* KPIs */
  const totalVisits = filtered.length;
  const thisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return items.filter((r) => String(r?.payload?.reportDate || "").slice(0, 7) === m).length;
  }, [items]);
  const totalStations = useMemo(() => filtered.reduce((s, r) => s + (Array.isArray(r?.payload?.stations) ? r.payload.stations.length : 0), 0), [filtered]);
  const activitySpotted = useMemo(() => filtered.filter((r) => {
    const stations = r?.payload?.stations || [];
    return stations.some((st) => /captur|نشاط|صيد/i.test(String(st?.status || ""))) || /نشاط|capture|rodent|fly|pest/i.test(String(r?.payload?.findings || ""));
  }).length, [filtered]);

  const exportJSON = () => downloadReportsJson(TYPE, filtered, "QCS_Pest_Control");
  const exportPDF = async () => {
    if (!filtered.length) return;
    setExportingPDF(true);
    try {
      const doc = buildPestPDF(filtered);
      doc.save(`Pest_Control_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("PDF export failed: " + (e?.message || e));
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <GlassShell
      icon="🛡️"
      title="Pest Control Log"
      actions={
        <ReportActions
          onPdf={exportPDF}
          onJson={exportJSON}
          onRefresh={load}
          exportingPdf={exportingPDF}
          refreshing={loading}
          pdfDisabled={filtered.length === 0}
          jsonDisabled={filtered.length === 0}
        />
      }
    >

      {/* Filters */}
      <div style={S.card}>
        <div style={S.filters}>
          <input
            style={S.input}
            placeholder="🔍 بحث (شركة، فني، مفتش، آفة...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
          <select style={S.input} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            {locations.map((l) => <option key={l} value={l}>{l === "all" ? "جميع المواقع" : l}</option>)}
          </select>
          {(search || month || locationFilter !== "all") && (
            <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setLocationFilter("all"); }}>
              مسح المرشحات
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <KpiGrid
        items={[
          { label: "إجمالي الزيارات", value: totalVisits, color: "#7c3aed" },
          { label: "هذا الشهر", value: thisMonth, color: "#0ea5e9" },
          { label: "محطات الطعم", value: totalStations, color: "#16a34a" },
          { label: "زيارات بنشاط", value: activitySpotted, color: "#dc2626" },
        ]}
      />

      {/* Records table */}
      {loading ? (
        <div style={S.empty}>⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>لا توجد سجلات.</div>
      ) : (
        <ResponsiveTableWrap>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>التاريخ</th>
                <th style={S.th}>الموقع</th>
                <th style={S.th}>الشركة</th>
                <th style={S.th}>الفني</th>
                <th style={S.th}>نوع الزيارة</th>
                <th style={S.th}>الآفات</th>
                <th style={S.th}>المحطات</th>
                <th style={S.th}>المفتش</th>
                <th style={S.th}>التقرير</th>
                <th style={S.th}>الزيارة القادمة</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = r?.payload || {};
                const stations = Array.isArray(p.stations) ? p.stations : [];
                const pests = Array.isArray(p.pestsTargeted) ? p.pestsTargeted : [];
                return (
                  <tr key={reportId(r) || `${p.savedAt}-${p.reportDate}`}>
                    <td style={S.td}>{fmtDate(p.reportDate)}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}>
                      <div>{p.company?.name || "—"}</div>
                      {p.company?.serviceReportNo && <div style={{ fontSize: 11, color: "#64748b" }}>SR: {p.company.serviceReportNo}</div>}
                    </td>
                    <td style={S.td}>{p.technician || "—"}</td>
                    <td style={S.td}>{p.visitType || "—"}</td>
                    <td style={S.td}>
                      {pests.length === 0 ? "—" : pests.map((x, i) => <span key={i} style={S.pillTag("#dc2626")}>{x.split("/")[0].trim()}</span>)}
                    </td>
                    <td style={S.td}>{stations.length}</td>
                    <td style={S.td}>{p.inspector || "—"}</td>
                    <td style={S.td}>
                      {p.images?.serviceReport ? (
                        <img
                          src={p.images.serviceReport}
                          alt="Service Report"
                          style={S.imgThumb}
                          onClick={() => setPreview({ open: true, src: p.images.serviceReport })}
                        />
                      ) : "—"}
                    </td>
                    <td style={S.td}>{fmtDate(p.nextVisitDate)}</td>
                    <td style={S.td}>
                      <button style={S.btnDanger} onClick={() => deleteRecord(reportId(r))} data-delete-action="true">حذف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTableWrap>
      )}

      {/* Preview modal */}
      {preview.open && (
        <div
          onClick={() => setPreview({ open: false, src: "" })}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}
        >
          <img src={preview.src} alt="Preview" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </GlassShell>
  );
}
