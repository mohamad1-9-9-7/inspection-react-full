// src/pages/monitor/branches/sweets/DailyCleanlinessView.jsx
import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import { DateTreeSidebar } from "../_shared/branchViewKit";
import { SweetsReportActions, printNode, excelFromNode } from "./_sweetsReportKit";
import useReportIndex from "../_shared/useReportIndex";
import { canDelete } from "../../../../utils/perms";

/* ===== API base (نفس أسلوب مشروعك) ===== */


/* Daily-cleanliness report type (sweets only) */
const TYPE = "sweets-clean";

/* ===== أدوات عرض بسيطة ===== */
const thStyle = { padding: "10px", border: "1px solid #ccc", textAlign: "center", fontSize: "1.1rem" };
const tdStyle = { padding: "9px", border: "1px solid #ccc", textAlign: "left", fontSize: "1.15rem" };

/* Defaults آمنة */
const DEFAULT_HEADER = {
  documentTitle: "",
  documentNo: "",
  revisionNo: "",
  issueDate: "",
  area: "",
  issuedBy: "",
  approvedBy: "",
  controllingOfficer: "",
};
const DEFAULT_FOOTER = { checkedBy: "", verifiedBy: "" };

/* مساعد: أخذ المعرّف */
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

export default function DailyCleanlinessView() {
  /* The date tree needs one date per record, not the records themselves. */
  const {
    treeItems,
    selected: selectedReport,
    selectedKey,
    loading,
    open,
    rowForKey,
    reload: fetchReports,
  } = useReportIndex(TYPE);

  const reportRef = useRef(null);

  /* ===== PDF ===== */
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const btns = reportRef.current.querySelector(".action-buttons");
    if (btns) btns.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 4,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    let w = pw;
    let h = (canvas.height * w) / canvas.width;
    if (h > ph) { h = ph; w = (canvas.width * h) / canvas.height; }
    pdf.addImage(img, "PNG", (pw - w) / 2, 20, w, h);
    const d = selectedReport?.payload?.reportDate || "report";
    pdf.save(`Cleanliness_${d}.pdf`);

    if (btns) btns.style.display = "flex";
  };

  /* ===== حذف ===== */
  const handleDelete = async (report) => {
    if (!window.confirm("⚠️ Delete this report?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${getId(report)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Report deleted.");
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };

  /* ===== استخراج الحقول بمرونة (header/footer/rows) ===== */
  const p = selectedReport?.payload || {};
  const hdr = p.header || p.headers?.dcHeader || DEFAULT_HEADER;
  const ftr = p.footer || p.headers?.dcFooter || DEFAULT_FOOTER;

  const rows = (() => {
    const raw =
      p.cleanlinessRows ||
      p.entries ||
      p.rows ||
      [];
    return Array.isArray(raw) ? raw : [];
  })();

  return (
    <div style={{ display: "flex", gap: "1rem", direction: "ltr" }}>
      {/* الشجرة الجانبية */}
      <div style={{ width: 285, flexShrink: 0 }}>
        <DateTreeSidebar
          items={treeItems}
          activeKey={selectedKey}
          onPick={(it) => open(rowForKey(it.key))}
          title="📅 Saved Reports"
          loading={loading}
          maxHeight="calc(100vh - 200px)"
        />
      </div>

      {/* مساحة العرض */}
      <div
        style={{
          flex: 1,
          background: "#fff",
          padding: "1.5rem",
          borderRadius: 14,
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef} style={{ paddingBottom: 100 }}>
            {/* العنوان وأزرار الإجراءات */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <h3 style={{ color:"#2980b9" }}>🧹 Report: {p.reportDate || ""}</h3>
              <div className="action-buttons">
                <SweetsReportActions
                  onExcel={() => excelFromNode(reportRef.current, `DailyCleanliness_${p.reportDate || "report"}`, "Daily Cleanliness")}
                  onPdf={handleExportPDF}
                  onPrint={() => printNode(reportRef.current, "Daily Cleanliness")}
                  onDelete={canDelete("daily") ? () => handleDelete(selectedReport) : undefined}
                />
              </div>
            </div>

            {/* ترويسة المستند */}
            <table style={{ width:"100%", border:"1px solid #ccc", marginBottom:"1rem", fontSize:"1.15rem", borderCollapse:"collapse" }}>
              <tbody>
                <tr>
                  <td style={tdStyle}><b>Document Title:</b> {hdr.documentTitle || DEFAULT_HEADER.documentTitle}</td>
                  <td style={tdStyle}><b>Document No:</b> {hdr.documentNo || DEFAULT_HEADER.documentNo}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Issue Date:</b> {hdr.issueDate || DEFAULT_HEADER.issueDate}</td>
                  <td style={tdStyle}><b>Revision No:</b> {hdr.revisionNo || DEFAULT_HEADER.revisionNo}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Area:</b> {hdr.area || DEFAULT_HEADER.area}</td>
                  <td style={tdStyle}><b>Issued By:</b> {hdr.issuedBy || DEFAULT_HEADER.issuedBy}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Controlling Officer:</b> {hdr.controllingOfficer || DEFAULT_HEADER.controllingOfficer}</td>
                  <td style={tdStyle}><b>Approved By:</b> {hdr.approvedBy || DEFAULT_HEADER.approvedBy}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ textAlign:"center", background:"#e5e7eb", padding:"6px", marginBottom:"1rem" }}>
               <br />
              DAILY CLEANING CHECKLIST
            </h3>

            {/* جدول النظافة */}
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"1.15rem" }}>
              <thead>
                <tr style={{ background:"#2980b9", color:"#fff" }}>
                  <th style={thStyle}>SI-No</th>
                  <th style={thStyle}>General Cleaning</th>
                  <th style={thStyle}>Observation (C / N / C)</th>
                  <th style={thStyle}>Informed to</th>
                  <th style={thStyle}>Remarks & CA</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r, i) => {
                  const isSection = !!r?.isSection;
                  const letter = r?.letter || r?.secNo || r?.slNo || (i+1);
                  const general = r?.general || r?.section || r?.item || r?.itemEn || r?.itemAr || r?.groupEn || r?.groupAr || "";
                  const observation = r?.observation || r?.result || r?.status || "";
                  const informedTo = r?.informedTo || r?.informed || "";
                  const remarks = r?.remarks || "";
                  return (
                    <tr key={i} style={isSection ? { fontWeight:700, background:"#f8fafc" } : undefined}>
                      <td style={tdStyle}>{isSection ? "—" : letter}</td>
                      <td style={{ ...tdStyle, whiteSpace:"pre-wrap" }}>{general}</td>
                      <td style={tdStyle}>{isSection ? "—" : observation}</td>
                      <td style={tdStyle}>{isSection ? "—" : informedTo}</td>
                      <td style={{ ...tdStyle, whiteSpace:"pre-wrap" }}>{isSection ? "—" : remarks}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign:"center", color:"#6b7280" }}>No rows.</td></tr>
                )}
              </tbody>
            </table>

            {/* التذييل */}
            <div style={{ marginTop:"1.5rem", display:"flex", justifyContent:"space-between", fontWeight:600, padding:"0 1rem" }}>
              <SignatureName label="Checked By" name={ftr?.checkedBy} align="start" />
              <SignatureName label="Verified By" name={ftr?.verifiedBy} align="end" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
