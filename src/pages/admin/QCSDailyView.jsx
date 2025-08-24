// src/pages/admin/QCSDailyView.jsx
import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ============ API base ============ */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  API_ROOT_DEFAULT;

const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ============ API helpers ============ */
async function listQcsDailyReports() {
  const res = await fetch(`${REPORTS_URL}?type=qcs-daily`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to list qcs-daily reports");
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}

async function listReportDates() {
  const rows = await listQcsDailyReports();
  const dates = Array.from(
    new Set(rows.map((r) => String(r?.payload?.reportDate || r?.payload?.date || "")).filter(Boolean))
  );
  return dates.sort((a, b) => b.localeCompare(a));
}

async function getReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find((r) => String(r?.payload?.reportDate || "") === String(date));
  return found?.payload || null;
}

async function deleteReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find((r) => String(r?.payload?.reportDate || "") === String(date));
  const id = found?._id || found?.id;
  if (!id) throw new Error("Report not found");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete report");
  return true;
}

/* ============ Constants ============ */
const LOGO_URL = "/brand/al-mawashi.jpg";
const MIN_PH_ROWS = 21;

/* 4AM → 8PM كل ساعتين (مطابقة للإدخال) */
const COOLER_TIMES = [
  "4:00 AM",
  "6:00 AM",
  "8:00 AM",
  "10:00 AM",
  "12:00 PM",
  "2:00 PM",
  "4:00 PM",
  "6:00 PM",
  "8:00 PM",
];

/* ============ Print CSS ============ */
const printCss = `
  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body { height: auto !important; }
    body { font-family: "Times New Roman", Times, serif; }
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area { position: absolute !important; inset: 0 !important; }
    .no-print { display: none !important; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }

    .one-page {
      width: 281mm;
      height: auto;
      overflow: visible !important;
      transform-origin: top left;
      transform: scale(var(--print-scale, 1));
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

const screenCss = `
  @media screen {
    body { background: linear-gradient(135deg, #f7fafc 0%, #eef2ff 100%); }
    .cooler-card { transition: box-shadow .18s ease, transform .1s ease; }
    .cooler-card:hover { box-shadow: 0 10px 24px rgba(41, 128, 185, 0.16); transform: translateY(-1px); }
    * { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
    *::-webkit-scrollbar { height: 8px; width: 8px; }
    *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    *::-webkit-scrollbar-track { background: #f1f5f9; }
  }
`;

/* ============ print scale ============ */
const PX_PER_MM = 96 / 25.4;
const PRINT_W_MM = 281;
const PRINT_H_MM = 194;

function setAutoPrintScale() {
  const el =
    document.querySelector(".print-area.one-page") ||
    document.querySelector(".print-area");
  if (!el) return 1;
  const rect = el.getBoundingClientRect();
  const maxW = PRINT_W_MM * PX_PER_MM;
  const maxH = PRINT_H_MM * PX_PER_MM;
  const scale = Math.min(maxW / rect.width, maxH / rect.height, 1);
  el.style.setProperty("--print-scale", String(scale));
  return scale;
}

/* ============ Local storage helper ============ */
function useLocalJSON(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

/* ============ Headers (defaults aligned to input page) ============ */
const defaultPHHeader = {
  documentTitle: "Personal Hygiene Checklist",
  documentNo: "FS-QM/REC/PH",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH QC",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};
const defaultPHFooter = { checkedBy: "", verifiedBy: "" };

const defaultCCHeader = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF-QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};
const defaultCCFooter = { checkedBy: "", verifiedBy: "" };

const defaultTMPHeader = {
  documentTitle: "Temperature Control Record",
  documentNo: "FS-QM/REC/TMP",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};

/* ============ Small row component ============ */
function Row({ label, value }) {
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
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}

/* ============ Print headers ============ */
function PHPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ background: "#c0c0c0", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
        </div>
        <div style={{ background: "#d6d6d6", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          PERSONAL HYGIENE CHECKLIST
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
          <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}

function CCPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ background: "#c0c0c0", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background: "#d6d6d6", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          CLEANING CHECKLIST - WAREHOUSE
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
          <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}

/* Temperature Control header for Coolers tab */
function TMPPrintHeader({ header }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued by:" value={header.issuedBy} />
          <Row label="Approved by:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ background: "#c0c0c0", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background: "#d6d6d6", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TEMPERATURE CONTROL CHECKLIST (CCP)
        </div>
        <div style={{ padding: "6px 8px", lineHeight: 1.5 }}>
          <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
          <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
          <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Corrective action: Transfer the meat to another cold room and call maintenance department to check and solve the problem.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Helpers for coolers styles/KPI ============ */
function getRangeForCooler(index) {
  // FREEZER (Cooler 8)
  if (index === 7) return { min: -19, max: -14 };
  // Production Room (Coolers 3 & 4)
  if (index === 2 || index === 3) return { min: 8, max: 12 };
  // Other chillers
  return { min: 0, max: 5 };
}

function getTempCellStyle(temp, coolerIndex) {
  const v = Number(temp);
  const base = {
    minWidth: "62px",
    padding: "7px 7px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: 600,
    fontSize: ".99em",
    boxShadow: "0 0 4px #d6eaf8",
  };
  if (temp === "" || Number.isNaN(v)) {
    return { ...base, background: "#d6eaf8", color: "#2980b9" };
  }
  const { min, max } = getRangeForCooler(coolerIndex);
  if (v < min || v > max) {
    return { ...base, background: "#fdecea", color: "#c0392b", fontWeight: 700 };
  }
  // Soft info near the upper band for chillers
  if ((coolerIndex !== 7) && v >= (max - 2)) {
    return { ...base, background: "#eaf6fb", color: "#2471a3" };
  }
  return { ...base, background: "#eaf6fb", color: "#075985" };
}

function CoolersKPI({ coolers = [] }) {
  let all = [];
  let outOfRange = 0;
  coolers.forEach((c, idx) => {
    COOLER_TIMES.forEach((time) => {
      const raw = c?.temps?.[time];
      const v = Number(raw);
      if (raw !== "" && !Number.isNaN(v)) {
        all.push(v);
        const { min, max } = getRangeForCooler(idx);
        if (v < min || v > max) outOfRange += 1;
      }
    });
  });
  const avgNum = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  const avg = avgNum !== null ? avgNum.toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  const anyBad = outOfRange > 0;

  return (
    <div style={{ display: "flex", gap: "1.2rem", margin: "10px 0 16px 0", flexWrap: "wrap" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "9px 22px", fontWeight: "bold", color: "#512e5f", boxShadow: "0 2px 10px #e8daef33" }}>
        Average:{" "}
        <span style={{ color: anyBad ? "#c0392b" : "#229954", fontWeight: "bolder" }}>
          {avg}°C
        </span>
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: "9px 22px", fontWeight: "bold", color: "#c0392b", boxShadow: "0 2px 10px #fdecea" }}>
        Out of Range: <span style={{ fontWeight: "bolder" }}>{outOfRange}</span>
      </div>
      <div style={{ background: "#fff", borderRadius: 8, padding: "9px 22px", fontWeight: "bold", color: "#884ea0", boxShadow: "0 2px 10px #f5eef8" }}>
        Min / Max: <span style={{ color: "#2471a3" }}>{min}</span>
        <span style={{ color: "#999" }}> / </span>
        <span style={{ color: "#c0392b" }}>{max}</span>
        <span style={{ color: "#884ea0", fontWeight: "normal" }}> °C</span>
      </div>
    </div>
  );
}

/* ============ Page ============ */
export default function QCSDailyView() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("coolers");

  // local editable defaults (used only if report has no headers saved)
  const [phHeaderLS] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooterLS] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);
  const [ccHeaderLS] = useLocalJSON("qcs_cc_header_v1", defaultCCHeader);
  const [ccFooterLS] = useLocalJSON("qcs_cc_footer_v1", defaultCCFooter);
  const [tmpHeaderLS] = useLocalJSON("qcs_tmp_header_v1", defaultTMPHeader);

  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dates = await listReportDates();
        setReports(dates.map((d) => ({ date: d })));
        setSelectedDate(dates[0] || null);
      } catch (e) {
        console.error(e);
        alert("Failed to fetch reports list from server.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedReport(null);
      return;
    }
    setLoadingReport(true);
    (async () => {
      try {
        const payload = await getReportByDate(selectedDate);
        setSelectedReport(payload ? { date: selectedDate, ...payload } : null);
      } catch (e) {
        console.error(e);
        setSelectedReport(null);
        alert("Failed to load the selected report from server.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedDate]);

  const handleDeleteReport = async (dateToDelete) => {
    if (!window.confirm(`Delete report dated ${dateToDelete}?`)) return;
    try {
      await deleteReportByDate(dateToDelete);
      const filtered = reports.filter((r) => r.date !== dateToDelete);
      setReports(filtered);
      if (selectedDate === dateToDelete) setSelectedDate(filtered[0]?.date || null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete report from server.");
    }
  };

  const downloadBlob = (str, mime, filename) => {
    const blob = new Blob([str], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAll = async () => {
    try {
      setExportingAll(true);
      const all = [];
      for (const r of reports) {
        try {
          const data = await getReportByDate(r.date);
          if (data) all.push({ date: r.date, ...data });
        } catch (e) {
          console.warn("Skip date due to fetch error:", r.date, e);
        }
      }
      downloadBlob(JSON.stringify(all, null, 2), "application/json", "qcs_reports_backup_all.json");
    } catch (e) {
      console.error(e);
      alert("Failed to export all.");
    } finally {
      setExportingAll(false);
    }
  };
  const exportCurrent = () =>
    selectedReport &&
    downloadBlob(
      JSON.stringify(selectedReport, null, 2),
      "application/json",
      `qcs_report_${selectedDate}.json`
    );

  const handlePrint = () => {
    setAutoPrintScale();
    setTimeout(() => window.print(), 30);
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const input = document.getElementById("report-container");
      if (!input) {
        alert("Report area not found.");
        setExportingPDF(false);
        return;
      }
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "pt", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `qcs_report_${selectedDate || new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF. Make sure jspdf and html2canvas are installed.");
    } finally {
      setExportingPDF(false);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="app-shell" style={{ padding: "1rem", fontFamily: "Cairo, sans-serif" }}>
        <style>{printCss}</style>
        <style>{screenCss}</style>
        <div className="print-area one-page" id="report-container">
          <p>No reports found.</p>
        </div>
      </div>
    );
  }

  const coolers = Array.isArray(selectedReport?.coolers) ? selectedReport.coolers : [];
  const personalHygiene = Array.isArray(selectedReport?.personalHygiene) ? selectedReport.personalHygiene : [];
  const cleanlinessRows = Array.isArray(selectedReport?.cleanlinessRows) ? selectedReport.cleanlinessRows : [];

  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);
  const phDataForPrint = Array.from({ length: phRowsCount }).map((_, i) => personalHygiene[i] || {});

  // prefer saved headers in report; fallback to LS/defaults
  const headers = selectedReport?.headers || {};
  const phHeader = headers.phHeader || phHeaderLS || defaultPHHeader;
  const phFooter = headers.phFooter || phFooterLS || defaultPHFooter;
  const ccHeader = headers.dcHeader || ccHeaderLS || defaultCCHeader;
  const ccFooter = headers.dcFooter || ccFooterLS || defaultCCFooter;
  const tmpHeader = headers.tmpHeader || tmpHeaderLS || defaultTMPHeader;

  const remarksBox = (text) => (
    <div style={{ minWidth: 240 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Remarks</div>
      <div style={{
        padding: "6px 8px",
        border: "1px solid #94a3b8",
        borderRadius: 8,
        background: "#fff",
        minHeight: 34,
        fontWeight: 600,
        color: "#111827",
        whiteSpace: "pre-wrap"
      }}>
        {text || "—"}
      </div>
    </div>
  );

  const labelForCooler = (i) => (i === 7 ? "FREEZER" : (i === 2 || i === 3) ? "Production Room" : `Cooler ${i + 1}`);

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        gap: "1rem",
        fontFamily: "Cairo, sans-serif",
        padding: "1rem",
      }}
    >
      <style>{printCss}</style>
      <style>{screenCss}</style>

      {/* Sidebar */}
      <aside className="no-print" style={{ flex: "0 0 290px", borderRight: "1px solid #e5e7eb", paddingRight: "1rem" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Reports List</h3>
        </header>

        <div style={{ margin: "10px 0" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Selected Date</label>
          <select
            value={selectedDate ?? ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", outline: "none" }}
          >
            {reports.map((r) => (
              <option key={r.date} value={r.date}>
                {r.date}
              </option>
            ))}
          </select>
        </div>

        <ul style={{ listStyle: "none", padding: 0, maxHeight: "55vh", overflowY: "auto" }}>
          {reports.map((report) => (
            <li
              key={report.date}
              style={{
                marginBottom: "0.5rem",
                backgroundColor: selectedDate === report.date ? "#2980b9" : "#f6f7f9",
                color: selectedDate === report.date ? "white" : "#111827",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: selectedDate === report.date ? "bold" : 600,
              }}
              onClick={() => setSelectedDate(report.date)}
            >
              <span>{report.date}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteReport(report.date);
                }}
                style={{
                  backgroundColor: "#c0392b",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  marginLeft: "6px",
                }}
                title="Delete report"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: "1.2rem", display: "grid", gap: 8 }}>
          <button onClick={exportCurrent} style={btnPrimary} disabled={!selectedReport}>
            ⬇️ Export Current (JSON)
          </button>
          <button onClick={exportAll} style={{ ...btnDark, opacity: exportingAll ? 0.7 : 1 }} disabled={exportingAll}>
            ⬇️⬇️ Export All (JSON)
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 320, maxHeight: "calc(100vh - 3rem)", overflowY: "auto", paddingRight: "1rem" }}>
        {/* Tabs */}
        <nav className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "0.6rem", position: "sticky", top: 0, background: "#fff", paddingTop: 6, paddingBottom: 6, zIndex: 5 }}>
          {[
            { id: "coolers", label: "🧊 Coolers Temperatures" },
            { id: "personalHygiene", label: "🧼 Personal Hygiene" },
            { id: "dailyCleanliness", label: "🧹 Daily Cleanliness" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: activeTab === id ? "2px solid #2980b9" : "1px solid #e5e7eb",
                backgroundColor: activeTab === id ? "#d6eaf8" : "#fff",
                cursor: "pointer",
                flex: 1,
                fontWeight: activeTab === id ? "bold" : 600,
                fontSize: "1.02em",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "flex-end", margin: "0 0 8px 0" }}>
          <button onClick={handlePrint} style={btnOutline}>🖨️ Print Report</button>
          <button onClick={handleExportPDF} style={{ ...btnPrimary, opacity: exportingPDF ? 0.7 : 1 }} disabled={exportingPDF} title="Export as PDF (A4 Landscape)">
            {exportingPDF ? "… Generating PDF" : "📄 Export PDF"}
          </button>
        </div>

        {loadingReport && <div className="no-print" style={{ marginBottom: 8, fontStyle: "italic", color: "#6b7280" }}>Loading report…</div>}

        {/* Print area */}
        <div className="print-area one-page" id="report-container">
          {/* Coolers */}
          {activeTab === "coolers" && (
            <>
              <TMPPrintHeader header={tmpHeader} />
              <h4 style={{ color: "#2980b9", margin: "0 0 10px 0" }}>
                🧊 Coolers Temperatures — <small>{selectedDate}</small>
              </h4>
              <CoolersKPI coolers={coolers} />
              {coolers.length > 0 ? (
                coolers.map((cooler, i) => (
                  <div
                    key={i}
                    className="cooler-card"
                    style={{
                      marginBottom: "1.0rem",
                      background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
                      padding: "1.0rem 0.7rem",
                      borderRadius: "12px",
                      gap: "1rem",
                      boxShadow: "0 3px 14px rgba(0,0,0,.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                      <strong style={{ minWidth: "160px", color: "#34495e", fontWeight: "bold" }}>
                        {labelForCooler(i)}:
                      </strong>

                      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", flex: "1 1 auto" }}>
                        {COOLER_TIMES.map((time) => (
                          <div
                            key={time}
                            style={getTempCellStyle(cooler?.temps?.[time], i)}
                            title={`${time} — ${cooler?.temps?.[time] ?? "-"}°C`}
                          >
                            <div style={{ fontSize: "0.85rem", marginBottom: "2px", color: "#512e5f", fontWeight: 600 }}>
                              {time}
                            </div>
                            <div>
                              {(cooler?.temps?.[time] ?? "") !== "" ? `${cooler?.temps?.[time]}°C` : "-"}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Remarks column (per cooler) */}
                      {remarksBox(cooler?.remarks)}
                    </div>
                  </div>
                ))
              ) : (
                <p>No coolers data.</p>
              )}
            </>
          )}

          {/* Personal Hygiene */}
          {activeTab === "personalHygiene" && (
            <>
              <PHPrintHeader header={phHeader} selectedDate={selectedDate} />
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    {[
                      "S. No",
                      "Employee Name",
                      "Nails",
                      "Hair",
                      "No jewelry",
                      "Wearing clean clothes / hair net / gloves / face mask / shoes",
                      "Communicable disease(s)",
                      "Open wounds / sores / cuts",
                      "Remarks & Corrective Actions",
                    ].map((h, idx) => (
                      <th key={idx} style={{ border: "1px solid #000", padding: "6px 4px", fontWeight: 800 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phDataForPrint.map((emp, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{i + 1}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.employName || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.nails || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.hair || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.notWearingJewelries || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.wearingCleanCloth || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.communicableDisease || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.openWounds || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.remarks || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ border: "1px solid #000", marginTop: 8 }}>
                <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>REMARKS/CORRECTIVE ACTIONS:</div>
                <div style={{ padding: "8px", borderBottom: "1px solid #000", minHeight: 56 }}>
                  <em>*(C – Conform    N / C – Non Conform)</em>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>Checked By :</div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{phFooter.checkedBy || "\u00A0"}</div>
                  </div>
                  <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>Verified  By :</div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{phFooter.verifiedBy || "\u00A0"}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Daily Cleanliness */}
          {activeTab === "dailyCleanliness" && (
            <>
              <CCPrintHeader header={ccHeader} selectedDate={selectedDate} />

              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>SI-No</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>General Cleaning</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>C / NC</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>Time</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>Observation</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>Informed to</th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>Remarks & CA</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const CLEANING_SECTIONS = [
                      { header: "Hand Washing Area", items: ["Tissue available", "Hair Net available", "Face Masks available"] },
                      { header: "Chiller Room 1", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 2", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 3", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 4", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 5", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 6", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 7", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Chiller Room 8", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
                      { header: "Loading Area", items: ["Walls/Floors", "Trolleys"] },
                      { header: "Waste Disposal", items: ["Collection of waste", "Disposal"] },
                      {
                        header: "Working Conditions & Cleanliness",
                        items: ["Lights", "Fly Catchers", "Floor/wall", "Painting and Plastering", "Weighing Balance", "Tap Water"],
                      },
                    ];
                    const norm = (s) => String(s || "").trim().toLowerCase();
                    const findCleanRow = (rows, sectionHeader, itemName) => {
                      const h = norm(sectionHeader);
                      const i = norm(itemName);
                      return (
                        (Array.isArray(rows) &&
                          rows.find(
                            (r) =>
                              (norm(r.groupEn) === h || norm(r.groupAr) === h) &&
                              (norm(r.itemEn) === i || norm(r.itemAr) === i)
                          )) ||
                        null
                      );
                    };

                    const rows = [];
                    let si = 1;
                    CLEANING_SECTIONS.forEach((sec, sIdx) => {
                      rows.push(
                        <tr key={`sec-${sIdx}`} style={{ background: "#f2f2f2", fontWeight: 800 }}>
                          <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }} />
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{sec.header}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }} />
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }} />
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }} />
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }} />
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }} />
                        </tr>
                      );
                      sec.items.forEach((item, iIdx) => {
                        const found = findCleanRow(cleanlinessRows, sec.header, item) || {};
                        rows.push(
                          <tr key={`row-${sIdx}-${iIdx}`}>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{si++}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{item}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{found.result || ""}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{selectedReport?.auditTime || ""}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{found.observation || ""}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{found.informed || ""}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{found.remarks || ""}</td>
                          </tr>
                        );
                      });
                    });
                    return rows;
                  })()}
                </tbody>
              </table>

              <div style={{ marginTop: 6, fontStyle: "italic" }}>
                *(C – Conform &nbsp;&nbsp;&nbsp; N / C – Non Conform)
              </div>
              <div style={{ border: "1px solid #000", marginTop: 8 }}>
                <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
                  REMARKS/CORRECTIVE ACTIONS:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #000" }}>
                  <div style={{ display: "flex", minHeight: 42 }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 180, fontWeight: 900, textDecoration: "underline" }}>
                      CHECKED BY: <span style={{ fontWeight: 400 }}>(QC-ASSIST)</span>
                    </div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{ccFooter.checkedBy || "\u00A0"}</div>
                  </div>
                  <div style={{ display: "flex", borderInlineStart: "1px solid #000", minHeight: 42 }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 180, fontWeight: 900, textDecoration: "underline" }}>
                      VERIFIED BY:
                    </div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{ccFooter.verifiedBy || "\u00A0"}</div>
                  </div>
                </div>

                <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
                  <div>Remark: Frequency — Daily</div>
                  <div>* (C = Conform &nbsp;&nbsp;&nbsp;&nbsp; N / C = Non Conform)</div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ============ Buttons ============ */
const btnBase = {
  padding: "9px 12px",
  borderRadius: 8,
  cursor: "pointer",
  border: "1px solid transparent",
  fontWeight: 700,
};
const btnPrimary = { ...btnBase, background: "#2563eb", color: "#fff" };
const btnDark = { ...btnBase, background: "#111827", color: "#fff" };
const btnOutline = { ...btnBase, background: "#fff", color: "#111827", border: "1px solid #e5e7eb" };
