// src/pages/admin/QCSDailyView.jsx
import React, { useEffect, useState, useRef } from "react";
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

/* ============ Types per tab ============ */
const TYPES = {
  coolers: "qcs-coolers",
  personalHygiene: "qcs-ph",
  dailyCleanliness: "qcs-clean",
  freshChicken: "pos_al_qusais_fresh_chicken_receiving",
};

/* ⛳ رابط صفحة العرض الجديدة */
const FRESH_VIEWER_URL = "/admin/monitor/branches/qcs/fresh-chicken-reports";

/* ============ API helpers (per type) ============ */
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list reports for ${type}`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function listDatesByType(type) {
  const rows = await listReportsByType(type);
  const dates = Array.from(
    new Set(
      rows
        .map((r) => {
          const p = r?.payload || {};
          return String(
            p.reportDate ||
              p.date ||
              p.header?.reportEntryDate ||
              p.meta?.entryDate ||
              ""
          ).trim();
        })
        .filter(Boolean)
    )
  );
  return dates.sort((a, b) => b.localeCompare(a));
}

/* ✅ المطابقة المرنة للتاريخ */
async function getReportByTypeAndDate(type, date) {
  const rows = await listReportsByType(type);
  const found = rows.find((r) => {
    const p = r?.payload || {};
    const d = String(
      p.reportDate ||
        p.date ||
        p.header?.reportEntryDate ||
        p.meta?.entryDate ||
        ""
    ).trim();
    return d === String(date);
  });
  return found?.payload || null;
}
async function getIdByTypeAndDate(type, date) {
  const rows = await listReportsByType(type);
  const found = rows.find((r) => {
    const p = r?.payload || {};
    const d = String(
      p.reportDate ||
        p.date ||
        p.header?.reportEntryDate ||
        p.meta?.entryDate ||
        ""
    ).trim();
    return d === String(date);
  });
  return found?._id || found?.id || null;
}
async function deleteReportByTypeAndDate(type, date) {
  const id = await getIdByTypeAndDate(type, date);
  if (!id) throw new Error("Report not found");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete report");
  return true;
}
async function createReportByType(type, payload) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: "admin-import", type, payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Failed to create report (${res.status})`);
  }
  return res.json().catch(() => ({}));
}
async function upsertReportByType(type, payload) {
  const res = await fetch(REPORTS_URL, {
    method: "PUT",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: "admin-edit", type, payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Failed to update report (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/* ============ Constants ============ */
const LOGO_URL = "/brand/al-mawashi.jpg";
const MIN_PH_ROWS = 21;
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
    .one-page { width: 281mm; height: auto; transform-origin: top left; transform: scale(var(--print-scale,1)); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
const screenCss = `
  @media screen {
    body { background: linear-gradient(135deg,#f7fafc 0%,#eef2ff 100%); }
    * { scrollbar-width: thin; scrollbar-color:#cbd5e1 #f1f5f9; }
    *::-webkit-scrollbar{height:8px;width:8px}
    *::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}
    *::-webkit-scrollbar-track{background:#f1f5f9}
  }
`;

/* ============ print scale ============ */
const PX_PER_MM = 96 / 25.4,
  PRINT_W_MM = 281,
  PRINT_H_MM = 194;
function setAutoPrintScale() {
  const el =
    document.querySelector(".print-area.one-page") ||
    document.querySelector(".print-area");
  if (!el) return 1;
  const rect = el.getBoundingClientRect();
  const maxW = PRINT_W_MM * PX_PER_MM,
    maxH = PRINT_H_MM * PX_PER_MM;
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

/* ============ Headers Defaults ============ */
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

/* ============ Helpers ============ */
const thB =
  (txtCenter = false) =>
  ({
    border: "1px solid #000",
    padding: "4px",
    fontWeight: 800,
    textAlign: txtCenter ? "center" : "left",
    whiteSpace: "nowrap",
  });
const tdB =
  (txtCenter = false) =>
  ({
    border: "1px solid #000",
    padding: "4px",
    textAlign: txtCenter ? "center" : "left",
  });
function labelForCooler(i) {
  return i === 7
    ? "FREEZER"
    : i === 2 || i === 3
    ? "Production Room"
    : `Cooler ${i + 1}`;
}

/* ============ Print Headers ============ */
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
function PHPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
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
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
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
function TMPPrintHeader({ header }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
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

/* ============ Page ============ */
export default function QCSDailyView() {
  const [activeTab, setActiveTab] = useState("coolers");

  /* dates per tab */
  const [coolersDates, setCoolersDates] = useState([]);
  const [phDates, setPhDates] = useState([]);
  const [cleanDates, setCleanDates] = useState([]);
  const [freshDates, setFreshDates] = useState([]);

  /* selected date per tab */
  const [selectedCoolersDate, setSelectedCoolersDate] = useState(null);
  const [selectedPHDate, setSelectedPHDate] = useState(null);
  const [selectedCleanDate, setSelectedCleanDate] = useState(null);
  const [selectedFreshDate, setSelectedFreshDate] = useState(null);

  /* loaded report per tab */
  const [coolersReport, setCoolersReport] = useState(null);
  const [phReport, setPhReport] = useState(null);
  const [cleanReport, setCleanReport] = useState(null);
  const [freshReport, setFreshReport] = useState(null);

  /* headers (local) */
  const [phHeaderLS] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooterLS] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);
  const [ccHeaderLS] = useLocalJSON("qcs_cc_header_v1", defaultCCHeader);
  const [ccFooterLS] = useLocalJSON("qcs_cc_footer_v1", defaultCCFooter);
  const [tmpHeaderLS] = useLocalJSON("qcs_tmp_header_v1", defaultTMPHeader);

  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  /* XLSX exporting state */
  const [exportingXLSX, setExportingXLSX] = useState(false);

  /* editing coolers */
  const [editingCoolers, setEditingCoolers] = useState(false);
  const [editCoolers, setEditCoolers] = useState([]);

  /* Loading Area edit */
  const [editLoadingArea, setEditLoadingArea] = useState({
    temps: {},
    remarks: "",
  });

  /* JSON export/import (all tabs) */
  const [exportingJSONAll, setExportingJSONAll] = useState(false);
  const [importingJSONAll, setImportingJSONAll] = useState(false);
  const jsonInputRef = useRef(null);

  /* refresh dates */
  const refreshDates = async () => {
    const [c, p, d, f] = await Promise.all([
      listDatesByType(TYPES.coolers),
      listDatesByType(TYPES.personalHygiene),
      listDatesByType(TYPES.dailyCleanliness),
      listDatesByType(TYPES.freshChicken),
    ]);
    setCoolersDates(c);
    setPhDates(p);
    setCleanDates(d);
    setFreshDates(f);
    if (!selectedCoolersDate && c.length) setSelectedCoolersDate(c[0]);
    if (!selectedPHDate && p.length) setSelectedPHDate(p[0]);
    if (!selectedCleanDate && d.length) setSelectedCleanDate(d[0]);
    if (!selectedFreshDate && f.length) setSelectedFreshDate(f[0]);

    if (selectedCoolersDate && !c.includes(selectedCoolersDate))
      setSelectedCoolersDate(c[0] || null);
    if (selectedPHDate && !p.includes(selectedPHDate))
      setSelectedPHDate(p[0] || null);
    if (selectedCleanDate && !d.includes(selectedCleanDate))
      setSelectedCleanDate(d[0] || null);
    if (selectedFreshDate && !f.includes(selectedFreshDate))
      setSelectedFreshDate(f[0] || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshDates();
      } catch (e) {
        console.error(e);
        alert("Failed to fetch reports list from server.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* load per date */
  useEffect(() => {
    if (!selectedCoolersDate) return;
    setLoadingReport(true);
    (async () => {
      try {
        const payload = await getReportByTypeAndDate(
          TYPES.coolers,
          selectedCoolersDate
        );
        setCoolersReport(payload ? { date: selectedCoolersDate, ...payload } : null);
      } catch (e) {
        console.error(e);
        setCoolersReport(null);
        alert("Failed to load coolers report from server.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedCoolersDate]);

  useEffect(() => {
    if (!selectedPHDate) return;
    setLoadingReport(true);
    (async () => {
      try {
        const payload = await getReportByTypeAndDate(
          TYPES.personalHygiene,
          selectedPHDate
        );
        setPhReport(payload ? { date: selectedPHDate, ...payload } : null);
      } catch (e) {
        console.error(e);
        setPhReport(null);
        alert("Failed to load personal hygiene report from server.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedPHDate]);

  useEffect(() => {
    if (!selectedCleanDate) return;
    setLoadingReport(true);
    (async () => {
      try {
        const payload = await getReportByTypeAndDate(
          TYPES.dailyCleanliness,
          selectedCleanDate
        );
        setCleanReport(payload ? { date: selectedCleanDate, ...payload } : null);
      } catch (e) {
        console.error(e);
        setCleanReport(null);
        alert("Failed to load daily cleanliness report from server.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedCleanDate]);

  useEffect(() => {
    if (!selectedFreshDate) return;
    setLoadingReport(true);
    (async () => {
      try {
        const payload = await getReportByTypeAndDate(
          TYPES.freshChicken,
          selectedFreshDate
        );
        setFreshReport(payload ? { date: selectedFreshDate, ...payload } : null);
      } catch (e) {
        console.error(e);
        setFreshReport(null);
        alert("Failed to load fresh chicken report from server.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedFreshDate]);

  /* copy coolers for edit */
  useEffect(() => {
    const src = Array.isArray(coolersReport?.coolers)
      ? coolersReport.coolers
      : [];
    const clone = src.map((c) => ({
      remarks: c?.remarks || "",
      temps: { ...(c?.temps || {}) },
    }));
    setEditCoolers(clone);
    const la = coolersReport?.loadingArea || { temps: {}, remarks: "" };
    setEditLoadingArea({ remarks: la.remarks || "", temps: { ...(la.temps || {}) } });
    setEditingCoolers(false);
  }, [coolersReport?.coolers, coolersReport?.loadingArea, selectedCoolersDate]);

  const setTemp = (rowIdx, time, val) => {
    setEditCoolers((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps: {} }) };
      row.temps = { ...(row.temps || {}), [time]: val };
      next[rowIdx] = row;
      return next;
    });
  };
  const setRemarksRow = (rowIdx, val) => {
    setEditCoolers((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps: {} }) };
      row.remarks = val;
      next[rowIdx] = row;
      return next;
    });
  };
  const setLoadingTemp = (time, val) =>
    setEditLoadingArea((prev) => ({
      ...prev,
      temps: { ...(prev.temps || {}), [time]: val },
    }));
  const setLoadingRemarks = (val) =>
    setEditLoadingArea((prev) => ({ ...prev, remarks: val }));
  const cancelCoolersEdit = () => {
    const src = Array.isArray(coolersReport?.coolers)
      ? coolersReport.coolers
      : [];
    const clone = src.map((c) => ({
      remarks: c?.remarks || "",
      temps: { ...(c?.temps || {}) },
    }));
    setEditCoolers(clone);
    const la = coolersReport?.loadingArea || { temps: {}, remarks: "" };
    setEditLoadingArea({ remarks: la.remarks || "", temps: { ...(la.temps || {}) } });
    setEditingCoolers(false);
  };
  const saveCoolersEdit = async () => {
    try {
      const payloadToSave = {
        ...(coolersReport || {}),
        reportDate: selectedCoolersDate,
        coolers: editCoolers,
        loadingArea: editLoadingArea,
      };
      delete payloadToSave.date;
      await upsertReportByType(TYPES.coolers, payloadToSave);
      const fresh = await getReportByTypeAndDate(TYPES.coolers, selectedCoolersDate);
      setCoolersReport(fresh ? { date: selectedCoolersDate, ...fresh } : null);
      await refreshDates();
      setEditingCoolers(false);
      alert("✅ Saved coolers temperatures.");
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save coolers.");
    }
  };

  /* delete current-date report of active tab */
  const handleDeleteActive = async (dateToDelete) => {
    const type =
      activeTab === "coolers"
        ? TYPES.coolers
        : activeTab === "personalHygiene"
        ? TYPES.personalHygiene
        : activeTab === "dailyCleanliness"
        ? TYPES.dailyCleanliness
        : TYPES.freshChicken;

    if (!window.confirm(`Delete ${type} report dated ${dateToDelete}?`)) return;
    try {
      await deleteReportByTypeAndDate(type, dateToDelete);
      await refreshDates();
    } catch (e) {
      console.error(e);
      alert("Failed to delete report from server.");
    }
  };

  /* helpers */
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

  /* Export JSON (All) */
  const exportAllJSON = async () => {
    try {
      setExportingJSONAll(true);
      const [c, p, d] = await Promise.all([
        listReportsByType(TYPES.coolers),
        listReportsByType(TYPES.personalHygiene),
        listReportsByType(TYPES.dailyCleanliness),
      ]);
      const onlyPayloads = (arr) =>
        arr.map((x) => x?.payload || x).filter((x) => x && typeof x === "object");
      const backup = {
        meta: {
          version: 1,
          exportedAt: new Date().toISOString(),
          apiBase: API_BASE,
          types: TYPES,
        },
        data: {
          [TYPES.coolers]: onlyPayloads(c),
          [TYPES.personalHygiene]: onlyPayloads(p),
          [TYPES.dailyCleanliness]: onlyPayloads(d),
        },
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(
        JSON.stringify(backup, null, 2),
        "application/json",
        `qcs_all_tabs_backup_${stamp}.json`
      );
    } catch (e) {
      console.error(e);
      alert("Failed to export JSON.");
    } finally {
      setExportingJSONAll(false);
    }
  };

  /* Import JSON (All) */
  const triggerImportAll = () => jsonInputRef.current?.click();
  const importArrayForType = async (type, arr, counters) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      try {
        const payload = { ...item };
        const dateStr = String(
          payload.reportDate ||
            payload.date ||
            payload.header?.reportEntryDate ||
            payload.meta?.entryDate ||
            ""
        ).trim();
        if (!dateStr) {
          counters.skipped++;
          continue;
        }
        if (type === TYPES.coolers) {
          if (!Array.isArray(payload.coolers)) {
            counters.skipped++;
            continue;
          }
          payload.reportDate = dateStr;
          delete payload.date;
          delete payload.personalHygiene;
          delete payload.cleanlinessRows;
        } else if (type === TYPES.personalHygiene) {
          if (!Array.isArray(payload.personalHygiene)) {
            counters.skipped++;
            continue;
          }
          payload.reportDate = dateStr;
          delete payload.date;
          delete payload.coolers;
          delete payload.cleanlinessRows;
        } else if (type === TYPES.dailyCleanliness) {
          if (!Array.isArray(payload.cleanlinessRows)) {
            counters.skipped++;
            continue;
          }
          payload.reportDate = dateStr;
          delete payload.date;
          delete payload.coolers;
          delete payload.personalHygiene;
        } else if (type === TYPES.freshChicken) {
          payload.reportDate = dateStr;
        }
        try {
          await deleteReportByTypeAndDate(type, dateStr);
        } catch {}
        await createReportByType(type, payload);
        counters.ok++;
      } catch (err) {
        console.error("Import item failed:", err);
        counters.failed++;
      }
    }
  };
  const handleImportAllFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImportingJSONAll(true);
      const text = await file.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file.");
      }
      const byType = {
        [TYPES.coolers]: [],
        [TYPES.personalHygiene]: [],
        [TYPES.dailyCleanliness]: [],
        [TYPES.freshChicken]: [],
      };
      const inferType = (payload) => {
        if (payload?.coolers) return TYPES.coolers;
        if (payload?.personalHygiene) return TYPES.personalHygiene;
        if (payload?.cleanlinessRows) return TYPES.dailyCleanliness;
        if (payload?.reportVariant && payload?.samplesTable) return TYPES.freshChicken;
        return null;
      };
      if (data?.data && typeof data.data === "object") {
        byType[TYPES.coolers] = Array.isArray(data.data[TYPES.coolers])
          ? data.data[TYPES.coolers]
          : [];
        byType[TYPES.personalHygiene] = Array.isArray(
          data.data[TYPES.personalHygiene]
        )
          ? data.data[TYPES.personalHygiene]
          : [];
        byType[TYPES.dailyCleanliness] = Array.isArray(
          data.data[TYPES.dailyCleanliness]
        )
          ? data.data[TYPES.dailyCleanliness]
          : [];
        byType[TYPES.freshChicken] = Array.isArray(
          data.data[TYPES.freshChicken]
        )
          ? data.data[TYPES.freshChicken]
          : [];
      } else if (
        data &&
        (Array.isArray(data[TYPES.coolers]) ||
          Array.isArray(data[TYPES.personalHygiene]) ||
          Array.isArray(data[TYPES.dailyCleanliness]) ||
          Array.isArray(data[TYPES.freshChicken]))
      ) {
        byType[TYPES.coolers] = Array.isArray(data[TYPES.coolers])
          ? data[TYPES.coolers]
          : [];
        byType[TYPES.personalHygiene] = Array.isArray(
          data[TYPES.personalHygiene]
        )
          ? data[TYPES.personalHygiene]
          : [];
        byType[TYPES.dailyCleanliness] = Array.isArray(
          data[TYPES.dailyCleanliness]
        )
          ? data[TYPES.dailyCleanliness]
          : [];
        byType[TYPES.freshChicken] = Array.isArray(
          data[TYPES.freshChicken]
        )
          ? data[TYPES.freshChicken]
          : [];
      } else if (Array.isArray(data)) {
        for (const item of data) {
          const payload = item?.payload || item;
          const t = inferType(payload);
          if (t) byType[t].push(payload);
        }
      } else {
        throw new Error("Unsupported JSON structure.");
      }

      const counters = { ok: 0, skipped: 0, failed: 0 };
      await importArrayForType(TYPES.coolers, byType[TYPES.coolers], counters);
      await importArrayForType(
        TYPES.personalHygiene,
        byType[TYPES.personalHygiene],
        counters
      );
      await importArrayForType(
        TYPES.dailyCleanliness,
        byType[TYPES.dailyCleanliness],
        counters
      );
      await importArrayForType(
        TYPES.freshChicken,
        byType[TYPES.freshChicken],
        counters
      );

      await refreshDates();
      alert(`Import finished (All Tabs).
✅ Imported: ${counters.ok}
⏭️ Skipped: ${counters.skipped}
❌ Failed: ${counters.failed}`);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Import failed.");
    } finally {
      setImportingJSONAll(false);
    }
  };

  /* Print / PDF */
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
      let position = 0,
        heightLeft = imgHeight;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const dateStr =
        activeTab === "coolers"
          ? selectedCoolersDate || ""
          : activeTab === "personalHygiene"
          ? selectedPHDate || ""
          : activeTab === "dailyCleanliness"
          ? selectedCleanDate || ""
          : selectedFreshDate || "";
      const fileName = `qcs_${activeTab}_${
        dateStr || new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error(e);
      alert(
        "Failed to generate PDF. Make sure jspdf and html2canvas are installed."
      );
    } finally {
      setExportingPDF(false);
    }
  };

  /* ===== اختيارات حسب التبويب ===== */
  const datesForActiveTab =
    activeTab === "coolers"
      ? coolersDates
      : activeTab === "personalHygiene"
      ? phDates
      : activeTab === "dailyCleanliness"
      ? cleanDates
      : freshDates;

  const selectedDateForTab =
    activeTab === "coolers"
      ? selectedCoolersDate
      : activeTab === "personalHygiene"
      ? selectedPHDate
      : activeTab === "dailyCleanliness"
      ? selectedCleanDate
      : selectedFreshDate;

  const setSelectedDateForTab =
    activeTab === "coolers"
      ? setSelectedCoolersDate
      : activeTab === "personalHygiene"
      ? setSelectedPHDate
      : activeTab === "dailyCleanliness"
      ? setSelectedCleanDate
      : setSelectedFreshDate;

  const currentReport =
    activeTab === "coolers"
      ? coolersReport
      : activeTab === "personalHygiene"
      ? phReport
      : activeTab === "dailyCleanliness"
      ? cleanReport
      : freshReport;

  // headers
  const headersObj = currentReport?.headers || {};
  const phHeader = headersObj.phHeader || phHeaderLS || defaultPHHeader;
  const phFooter = headersObj.phFooter || phFooterLS || defaultPHFooter;
  const ccHeader = headersObj.dcHeader || ccHeaderLS || defaultCCHeader;
  const ccFooter = headersObj.dcFooter || ccFooterLS || defaultCCFooter;
  const tmpHeader = headersObj.tmpHeader || tmpHeaderLS || defaultTMPHeader;

  const coolers = Array.isArray(currentReport?.coolers)
    ? currentReport.coolers
    : [];
  const personalHygiene = Array.isArray(currentReport?.personalHygiene)
    ? currentReport.personalHygiene
    : [];
  const cleanlinessRows = Array.isArray(currentReport?.cleanlinessRows)
    ? currentReport.cleanlinessRows
    : [];
  const loadingArea = currentReport?.loadingArea || null;

  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);

  const hasCoolers = Array.isArray(coolers) && coolers.length > 0;
  const hasLoadingArea = !!loadingArea;

  /* ✅ تاريخ التقرير للكولرز */
  const coolersReportDateText = React.useMemo(() => {
    const p = coolersReport || {};
    return (
      selectedCoolersDate ||
      p.reportDate ||
      p.date ||
      p.header?.reportEntryDate ||
      p.meta?.entryDate ||
      ""
    );
  }, [selectedCoolersDate, coolersReport]);

  const verifiedByManager = React.useMemo(() => {
    const p = coolersReport || {};
    return (
      p.verifiedByManager ||
      p.headers?.verifiedByManager ||
      p.headers?.tmpHeader?.verifiedByManager ||
      p.meta?.verifiedByManager ||
      "—"
    );
  }, [coolersReport]);

  /* ============ ExcelJS helpers & builders ============ */
  const getExcelWorkbook = async () => {
    const Excel = await import("exceljs");
    const Workbook = Excel?.Workbook || Excel?.default?.Workbook;
    return new Workbook();
  };

  // تحويل الشعار إلى Base64 مع استخراج الامتداد بدون استخدام Sparse Array
  const toBase64Parts = (blob) =>
    new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = String(r.result || "");
        const [head, data] = dataUrl.split(",");
        const match = head.match(/data:image\/([a-zA-Z0-9+.-]+);base64/);
        const ext = match ? match[1] : "jpeg";
        resolve({ base64: data, ext });
      };
      r.readAsDataURL(blob);
    });

  const fetchLogoBase64 = async () => {
    try {
      const res = await fetch(LOGO_URL, { mode: "cors" });
      if (!res || !res.ok) return null;
      const b = await res.blob();
      return await toBase64Parts(b); // { base64, ext }
    } catch {
      return null;
    }
  };

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  const paintHeaderBlock = (ws, startRow, headerLeft, headerRight) => {
    let r = startRow;
    const rowsHeader = [
      ["Document Title:", headerLeft.documentTitle, "Document No:", headerRight.documentNo],
      ["Issue Date:", headerLeft.issueDate, "Revision No:", headerRight.revisionNo],
      ["Area:", headerLeft.area, "Issued By:", headerRight.issuedBy],
      ["Controlling Officer:", headerLeft.controllingOfficer, "Approved By:", headerRight.approvedBy],
    ];
    rowsHeader.forEach((row) => {
      ws.mergeCells(r, 3, r, 4); // C..D
      ws.mergeCells(r, 5, r, 6); // E..F
      ws.getCell(r, 3).value = `${row[0]} ${row[1] || ""}`;
      ws.getCell(r, 5).value = `${row[2]} ${row[3] || ""}`;
      ws.getRow(r).height = 20;
      [3, 4, 5, 6].forEach((c) => {
        const cell = ws.getCell(r, c);
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = thinBorder;
      });
      r++;
    });
    return r - 1;
  };

  async function buildCoolersSheetExcel({ workbook, data, reportDate, verifiedBy }) {
    const ws = workbook.addWorksheet("Coolers", {
      pageSetup: { orientation: "landscape", paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3 } },
      views: [{ state: "frozen", ySplit: 10 }],
    });

    // أعمدة الجدول
    const columns = [{ header: "Cooler", key: "cooler", width: 20 }];
    COOLER_TIMES.forEach((t) => columns.push({ header: t, key: t, width: 12 }));
    columns.push({ header: "Remarks", key: "remarks", width: 30 });
    ws.columns = columns;

    // مساحة الترويسة
    ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); // r1..r9

    // شعار
    try {
      const logo = await fetchLogoBase64();
      if (logo) {
        const imgId = workbook.addImage({ base64: logo.base64, extension: logo.ext });
        ws.mergeCells("A1:B6");
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 6 } });
        ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6"].forEach(addr => {
          ws.getCell(addr).border = thinBorder;
        });
      }
    } catch {}

    // حقول الترويسة
    const h = data?.headers?.tmpHeader || tmpHeader;
    paintHeaderBlock(ws, 1, h, h);

    // سطر اسم الشركة
    ws.mergeCells("A7:K7");
    Object.assign(ws.getCell("A7"), {
      value: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD0D0D0" } },
      border: thinBorder,
    });
    ws.getRow(7).height = 20;

    // عنوان النموذج
    ws.mergeCells("A8:K8");
    Object.assign(ws.getCell("A8"), {
      value: "TEMPERATURE CONTROL CHECKLIST (CCP)",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } },
      border: thinBorder,
    });
    ws.getRow(8).height = 20;

    // التاريخ
    ws.mergeCells("A9:C9");
    const rd = ws.getCell("A9");
    rd.value = `Date: ${reportDate || ""}`;
    rd.font = { bold: true };
    rd.alignment = { vertical: "middle", horizontal: "left" };
    rd.border = thinBorder;

    // سطر التعليمات
    ws.mergeCells("A10:K10");
    ws.getCell("A10").value =
      "1) If the temp is +5°C or more, check product temperature – CA should be taken.  2) If the loading area is more than +16°C – CA should be taken.  3) If the preparation area is more than +10°C – CA should be taken.  Corrective action: Transfer meat & call maintenance.";
    ws.getCell("A10").alignment = { wrapText: true };
    ws.getCell("A10").border = thinBorder;
    ws.getRow(10).height = 42;

    // رؤوس الجدول
    const head = ws.addRow(columns.map((c) => c.header));
    head.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { vertical: "middle", horizontal: "center" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      c.border = thinBorder;
    });
    ws.getRow(head.number).height = 20;

    // بيانات
    const coolersArr = Array.isArray(data?.coolers) ? data.coolers : [];
    coolersArr.forEach((row, idx) => {
      const excelRow = {};
      excelRow["cooler"] = labelForCooler(idx);
      COOLER_TIMES.forEach((t) => (excelRow[t] = row?.temps?.[t] ?? ""));
      excelRow["remarks"] = row?.remarks || "";
      const r = ws.addRow(excelRow);
      r.eachCell((c, col) => {
        c.border = thinBorder;
        c.alignment = { vertical: "middle", horizontal: col === 1 || col === columns.length ? "left" : "center", wrapText: true };
      });
    });
    if (data?.loadingArea) {
      const la = {};
      la["cooler"] = "Loading Area";
      COOLER_TIMES.forEach((t) => (la[t] = data.loadingArea?.temps?.[t] ?? ""));
      la["remarks"] = data.loadingArea?.remarks || "";
      const rla = ws.addRow(la);
      rla.eachCell((c, col) => {
        c.border = thinBorder;
        c.alignment = { vertical: "middle", horizontal: col === 1 || col === columns.length ? "left" : "center", wrapText: true };
      });
    }

    // Verified by
    const last = ws.lastRow.number + 1;
    ws.mergeCells(`I${last}:K${last}`);
    const v = ws.getCell(`I${last}`);
    v.value = `Verified by (Manager): ${verifiedBy || ""}`;
    v.font = { bold: true };
    v.alignment = { vertical: "middle", horizontal: "right" };
  }

  async function buildPHSheetExcel({ workbook, data, reportDate, phHeader, phFooter }) {
    const ws = workbook.addWorksheet("PersonalHygiene", {
      pageSetup: { orientation: "landscape", paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3 } },
      views: [{ state: "frozen", ySplit: 9 }],
    });

    // شعار + ترويسة
    ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); // r1..r8

    try {
      const logo = await fetchLogoBase64();
      if (logo) {
        const imgId = workbook.addImage({ base64: logo.base64, extension: logo.ext });
        ws.mergeCells("A1:B6");
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 6 } });
        ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6"].forEach(addr => {
          ws.getCell(addr).border = thinBorder;
        });
      }
    } catch {}

    paintHeaderBlock(ws, 1, phHeader, phHeader);

    ws.mergeCells("A7:I7");
    Object.assign(ws.getCell("A7"), {
      value: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD0D0D0" } },
      border: thinBorder,
    });
    ws.mergeCells("A8:I8");
    Object.assign(ws.getCell("A8"), {
      value: "PERSONAL HYGIENE CHECKLIST",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } },
      border: thinBorder,
    });
    ws.mergeCells("A9:C9");
    Object.assign(ws.getCell("A9"), {
      value: `Date: ${reportDate || ""}`,
      font: { bold: true },
      alignment: { vertical: "middle", horizontal: "left" },
      border: thinBorder,
    });

    // أعمدة الجدول
    const columns = [
      { header: "S. No", key: "s", width: 7 },
      { header: "Employee Name", key: "name", width: 28 },
      { header: "Nails", key: "nails", width: 10 },
      { header: "Hair", key: "hair", width: 10 },
      { header: "No jewelry", key: "noj", width: 12 },
      { header: "Wearing clean clothes / hair net / gloves / face mask / shoes", key: "ppe", width: 42 },
      { header: "Communicable disease(s)", key: "cd", width: 24 },
      { header: "Open wounds / sores / cuts", key: "ow", width: 20 },
      { header: "Remarks & Corrective Actions", key: "rem", width: 36 },
    ];
    ws.columns = columns;

    const headerRow = ws.addRow(columns.map((c) => c.header));
    headerRow.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      c.border = thinBorder;
    });
    ws.getRow(headerRow.number).height = 28;

    const rows = Array.isArray(data?.personalHygiene) ? data.personalHygiene : [];
    const totalRows = Math.max(rows.length, MIN_PH_ROWS);
    for (let i = 0; i < totalRows; i++) {
      const e = rows[i] || {};
      const r = ws.addRow({
        s: i + 1,
        name: e?.employName || e?.employeeName || "",
        nails: e?.nails || "",
        hair: e?.hair || "",
        noj: e?.notWearingJewelries || "",
        ppe: e?.wearingCleanCloth || "",
        cd: e?.communicableDisease || "",
        ow: e?.openWounds || "",
        rem: e?.remarks || "",
      });
      r.eachCell((c, col) => {
        c.border = thinBorder;
        c.alignment = { vertical: "middle", horizontal: col === 2 || col === 9 ? "left" : "center", wrapText: true };
      });
    }

    // الفوتر (Checked/Verified)
    const last = ws.lastRow.number + 1;
    ws.mergeCells(`A${last}:I${last}`);
    Object.assign(ws.getCell(`A${last}`), {
      value: "REMARKS/CORRECTIVE ACTIONS:",
      font: { bold: true },
      border: thinBorder,
    });
    ws.mergeCells(`A${last + 1}:I${last + 1}`);
    Object.assign(ws.getCell(`A${last + 1}`), {
      value: "*(C – Conform   N / C – Non Conform)",
      border: thinBorder,
    });

    ws.mergeCells(`A${last + 2}:E${last + 2}`);
    Object.assign(ws.getCell(`A${last + 2}`), {
      value: `Checked By : ${phFooter?.checkedBy || ""}`,
      border: thinBorder,
    });
    ws.mergeCells(`F${last + 2}:I${last + 2}`);
    Object.assign(ws.getCell(`F${last + 2}`), {
      value: `Verified By : ${phFooter?.verifiedBy || ""}`,
      border: thinBorder,
    });
  }

  async function buildCleanSheetExcel({ workbook, data, reportDate, ccHeader, ccFooter }) {
    const ws = workbook.addWorksheet("DailyCleanliness", {
      pageSetup: { orientation: "landscape", paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3 } },
      views: [{ state: "frozen", ySplit: 9 }],
    });

    // شعار + ترويسة
    ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); ws.addRow([]); // r1..r8
    try {
      const logo = await fetchLogoBase64();
      if (logo) {
        const imgId = workbook.addImage({ base64: logo.base64, extension: logo.ext });
        ws.mergeCells("A1:B6");
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 6 } });
        ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5","B6"].forEach(addr => {
          ws.getCell(addr).border = thinBorder;
        });
      }
    } catch {}

    paintHeaderBlock(ws, 1, ccHeader, ccHeader);

    ws.mergeCells("A7:E7");
    Object.assign(ws.getCell("A7"), {
      value: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD0D0D0" } },
      border: thinBorder,
    });
    ws.mergeCells("A8:E8");
    Object.assign(ws.getCell("A8"), {
      value: "CLEANING CHECKLIST - WAREHOUSE",
      alignment: { vertical: "middle", horizontal: "center" },
      font: { bold: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } },
      border: thinBorder,
    });
    ws.mergeCells("A9:B9");
    Object.assign(ws.getCell("A9"), {
      value: `Date: ${reportDate || ""}`,
      font: { bold: true },
      alignment: { vertical: "middle", horizontal: "left" },
      border: thinBorder,
    });

    // أعمدة الجدول
    const columns = [
      { header: "SI-No", key: "si", width: 10 },
      { header: "General Cleaning", key: "gen", width: 46 },
      { header: "Observation (C / N / C)", key: "obs", width: 24 },
      { header: "Informed to", key: "inf", width: 22 },
      { header: "Remarks & CA", key: "rem", width: 36 },
    ];
    ws.columns = columns;

    const headerRow = ws.addRow(columns.map((c) => c.header));
    headerRow.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
      c.border = thinBorder;
    });
    ws.getRow(headerRow.number).height = 22;

    const rows = Array.isArray(data?.cleanlinessRows) ? data.cleanlinessRows : [];
    rows.forEach((r, i) => {
      const isSection = !!r?.isSection;
      const si = r?.letter || (typeof r?.slNo !== "undefined" ? r.slNo : i + 1);
      const gen = r?.general || r?.itemEn || r?.itemAr || r?.groupEn || r?.groupAr || r?.section || "";
      const obs = r?.observation || r?.result || "";
      const inf = r?.informedTo || r?.informed || "";
      const rem = r?.remarks || "";

      const row = ws.addRow({
        si: isSection ? "—" : si,
        gen,
        obs: isSection ? "" : obs,
        inf: isSection ? "" : inf,
        rem: isSection ? "" : rem,
      });
      if (isSection) {
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
          c.font = { bold: true };
        });
      }
      row.eachCell((c, col) => {
        c.border = thinBorder;
        c.alignment = { vertical: "middle", horizontal: col === 2 || col === 5 ? "left" : "center", wrapText: true };
      });
    });

    // الفوتر
    const last = ws.lastRow.number + 1;
    ws.mergeCells(`A${last}:E${last}`);
    Object.assign(ws.getCell(`A${last}`), {
      value: "REMARKS/CORRECTIVE ACTIONS:",
      font: { bold: true },
      border: thinBorder,
    });

    ws.mergeCells(`A${last + 1}:C${last + 1}`);
    Object.assign(ws.getCell(`A${last + 1}`), {
      value: `CHECKED BY: (QC-ASSIST) ${ccFooter?.checkedBy || ""}`,
      border: thinBorder,
    });
    ws.mergeCells(`D${last + 1}:E${last + 1}`);
    Object.assign(ws.getCell(`D${last + 1}`), {
      value: `VERIFIED BY: ${ccFooter?.verifiedBy || ""}`,
      border: thinBorder,
    });

    ws.mergeCells(`A${last + 2}:E${last + 2}`);
    Object.assign(ws.getCell(`A${last + 2}`), {
      value: "Remark: Frequency — Daily   * (C = Conform    N / C = Non Conform)",
      border: thinBorder,
    });
  }

  /* ============ XLSX Export (current tab & day only) — ExcelJS مع ترويسة وشعار ============ */
  const exportXLSXForCurrentTab = async () => {
    try {
      setExportingXLSX(true);

      const dateStr =
        activeTab === "coolers"
          ? selectedCoolersDate
          : activeTab === "personalHygiene"
          ? selectedPHDate
          : activeTab === "dailyCleanliness"
          ? selectedCleanDate
          : selectedFreshDate;

      if (!currentReport || !dateStr) {
        alert("No report data for this date.");
        return;
      }

      const wb = await getExcelWorkbook();

      if (activeTab === "coolers") {
        await buildCoolersSheetExcel({
          workbook: wb,
          data: currentReport,
          reportDate: dateStr,
          verifiedBy: verifiedByManager || "",
        });
      } else if (activeTab === "personalHygiene") {
        await buildPHSheetExcel({
          workbook: wb,
          data: currentReport,
          reportDate: dateStr,
          phHeader,
          phFooter,
        });
      } else if (activeTab === "dailyCleanliness") {
        await buildCleanSheetExcel({
          workbook: wb,
          data: currentReport,
          reportDate: dateStr,
          ccHeader,
          ccFooter,
        });
      } else if (activeTab === "freshChicken") {
        // تصدير مبسط
        const ws = wb.addWorksheet("FreshChicken", {
          pageSetup: { orientation: "landscape" },
        });
        ws.columns = [
          { header: "Date", key: "d", width: 16 },
          { header: "Variant", key: "v", width: 18 },
          { header: "SummaryJSON", key: "j", width: 80 },
        ];
        const r0 = ws.addRow(["Date", "Variant", "SummaryJSON"]);
        r0.font = { bold: true };
        ws.addRow([dateStr, currentReport?.reportVariant || "", JSON.stringify(currentReport || {})]);
        if (Array.isArray(currentReport?.samplesTable)) {
          const ws2 = wb.addWorksheet("Samples");
          const rows = currentReport.samplesTable;
          const cols = Object.keys(rows[0] || {}).map((k) => ({ header: String(k), key: k, width: 18 }));
          ws2.columns = cols;
          rows.forEach((row) => ws2.addRow(row));
        }
      }

      const safeTab =
        activeTab === "personalHygiene"
          ? "ph"
          : activeTab === "dailyCleanliness"
          ? "clean"
          : activeTab;

      const fname = `qcs_${safeTab}_${dateStr}.xlsx`;

      // كتابة الملف (browser)
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export XLSX. Make sure 'exceljs' is installed.");
    } finally {
      setExportingXLSX(false);
    }
  };

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
      <aside
        className="no-print"
        style={{
          flex: "0 0 300px",
          borderRight: "1px solid #e5e7eb",
          paddingRight: "1rem",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Reports</h3>
        </header>

        {/* Date Select (per active tab) */}
        <div style={{ margin: "10px 0" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
            {activeTab === "coolers"
              ? "Selected Date (Coolers)"
              : activeTab === "personalHygiene"
              ? "Selected Date (PH)"
              : activeTab === "dailyCleanliness"
              ? "Selected Date (Cleanliness)"
              : "Selected Date (Fresh Chicken)"}
          </label>
          <select
            value={selectedDateForTab ?? ""}
            onChange={(e) => setSelectedDateForTab(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              outline: "none",
            }}
          >
            {datesForActiveTab.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Dates list */}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            maxHeight: "55vh",
            overflowY: "auto",
          }}
        >
          {datesForActiveTab.map((date) => (
            <li
              key={date}
              style={{
                marginBottom: ".5rem",
                backgroundColor:
                  selectedDateForTab === date ? "#2980b9" : "#f6f7f9",
                color: selectedDateForTab === date ? "#fff" : "#111827",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: selectedDateForTab === date ? "bold" : 600,
              }}
              onClick={() => setSelectedDateForTab(date)}
            >
              <span>{date}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteActive(date);
                }}
                style={{
                  background: "#c0392b",
                  color: "#fff",
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
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          minWidth: 320,
          maxHeight: "calc(100vh - 3rem)",
          overflowY: "auto",
          paddingRight: "1rem",
        }}
      >
        {/* Tabs */}
        <div
          className="no-print"
          style={{ display: "flex", justifyContent: "center", margin: "0 0 12px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              width: "min(900px, 100%)",
            }}
          >
            {[
              { id: "coolers", label: "🧊 Coolers" },
              { id: "personalHygiene", label: "🧼 Personal Hygiene" },
              { id: "dailyCleanliness", label: "🧹 Daily Cleanliness" },
              { id: "freshChicken", label: "🍗 FRESH CHICKEN REBORT" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: activeTab === id ? "2px solid #0b132b" : "1px solid #e5e7eb",
                  background: activeTab === id ? "#0b132b" : "#eef2f7",
                  color: activeTab === id ? "#fff" : "#0b132b",
                  fontWeight: 900,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            margin: "0 0 8px 0",
            flexWrap: "wrap",
          }}
        >
          <button onClick={handlePrint} style={btnOutline} disabled={activeTab === "freshChicken"}>
            🖨️ Print
          </button>
          <button
            onClick={handleExportPDF}
            style={{ ...btnPrimary, opacity: exportingPDF ? 0.7 : 1 }}
            disabled={exportingPDF || activeTab === "freshChicken"}
            title="Export as PDF (A4 Landscape)"
          >
            {exportingPDF ? "… Generating PDF" : "📄 Export PDF"}
          </button>

          {/* ✅ زر تصدير XLSX للتبويب والتاريخ الحاليين فقط (ExcelJS مع ترويسة وشعار) */}
          <button
            onClick={exportXLSXForCurrentTab}
            style={{ ...btnDark, opacity: exportingXLSX ? 0.7 : 1 }}
            disabled={exportingXLSX}
            title="Export current tab & selected date to Excel"
          >
            📊 Export XLSX (This tab)
          </button>

          {/* JSON (backup) */}
          <button
            onClick={exportAllJSON}
            style={{ ...btnDark, opacity: exportingJSONAll ? 0.7 : 1 }}
            disabled={exportingJSONAll}
            title="Export ALL tabs as one JSON"
          >
            ⬇️ Export JSON (All)
          </button>
          <button
            onClick={triggerImportAll}
            style={{ ...btnOutline, opacity: importingJSONAll ? 0.7 : 1 }}
            disabled={importingJSONAll}
            title="Import JSON (All tabs)"
          >
            ⬆️ Import JSON (All)
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportAllFile}
            style={{ display: "none" }}
          />
        </div>

        {loadingReport && (
          <div className="no-print" style={{ marginBottom: 8, fontStyle: "italic", color: "#6b7280" }}>
            Loading…
          </div>
        )}

        {/* Print area */}
        <div className="print-area one-page" id="report-container">
          {/* ================= Coolers ================= */}
          {activeTab === "coolers" && (
            <>
              <TMPPrintHeader header={tmpHeader} />

              {/* Report date (top-left) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "6px 0 8px 0",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  <span style={{ textDecoration: "underline" }}>Report Date:</span>{" "}
                  <span>{coolersReportDateText || "—"}</span>
                </div>

                {/* edit controls */}
                <div className="no-print" style={{ display: "flex", gap: 8 }}>
                  {!editingCoolers ? (
                    <button onClick={() => setEditingCoolers(true)} style={btnOutline}>
                      ✏️ Edit
                    </button>
                  ) : (
                    <>
                      <button onClick={saveCoolersEdit} style={btnPrimary}>
                        💾 Save
                      </button>
                      <button onClick={cancelCoolersEdit} style={btnOutline}>
                        ↩️ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                  border: "1px solid #000",
                  fontSize: "12px",
                  tableLayout: "fixed",
                  wordBreak: "word-break",
                }}
              >
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    <th style={thB(true)}>Cooler</th>
                    {COOLER_TIMES.map((t) => (
                      <th key={t} style={thB(true)}>
                        {t}
                      </th>
                    ))}
                    <th style={thB(false)}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {hasCoolers &&
                    (editingCoolers ? editCoolers : coolers).map((c, i) => (
                      <tr key={i}>
                        <td style={tdB(false)}>{labelForCooler(i)}</td>
                        {COOLER_TIMES.map((time) => {
                          const srcTemps = editingCoolers
                            ? editCoolers[i]?.temps || {}
                            : coolers[i]?.temps || {};
                          const raw = srcTemps[time];
                          const val =
                            raw === undefined || raw === "" || raw === null
                              ? editingCoolers
                                ? ""
                                : "—"
                              : String(raw).trim() +
                                (!editingCoolers ? "°C" : "");
                          return (
                            <td key={time} style={tdB(true)}>
                              {editingCoolers ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={String(raw ?? "")}
                                  onChange={(e) => setTemp(i, time, e.target.value)}
                                  style={{ width: 70, padding: "4px 6px" }}
                                  placeholder=".."
                                />
                              ) : (
                                val
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {editingCoolers ? (
                            <input
                              value={c?.remarks ?? ""}
                              onChange={(e) => setRemarksRow(i, e.target.value)}
                              style={{ width: "100%", padding: "4px 6px" }}
                              placeholder="Remarks"
                            />
                          ) : (
                            c?.remarks || ""
                          )}
                        </td>
                      </tr>
                    ))}

                  {(hasLoadingArea || editingCoolers) && (
                    <tr>
                      <td style={{ ...tdB(false), fontWeight: 800 }}>Loading Area</td>
                      {COOLER_TIMES.map((time) => {
                        const srcTemps = editingCoolers
                          ? editLoadingArea?.temps || {}
                          : loadingArea?.temps || {};
                        const raw = srcTemps?.[time];
                        const val =
                          raw === undefined || raw === "" || raw === null
                            ? editingCoolers
                              ? ""
                              : "—"
                            : String(raw).trim() +
                              (!editingCoolers ? "°C" : "");
                        return (
                          <td key={`la-${time}`} style={tdB(true)}>
                            {editingCoolers ? (
                              <input
                                type="number"
                                step="0.1"
                                value={String(raw ?? "")}
                                onChange={(e) => setLoadingTemp(time, e.target.value)}
                                style={{ width: 70, padding: "4px 6px" }}
                                placeholder=".."
                              />
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {editingCoolers ? (
                          <input
                            value={editLoadingArea?.remarks ?? ""}
                            onChange={(e) => setLoadingRemarks(e.target.value)}
                            style={{ width: "100%", padding: "4px 6px" }}
                            placeholder="Remarks"
                          />
                        ) : (
                          loadingArea?.remarks || ""
                        )}
                      </td>
                    </tr>
                  )}

                  {!hasCoolers && !hasLoadingArea && (
                    <tr>
                      <td
                        colSpan={COOLER_TIMES.length + 2}
                        style={{ ...tdB(true), color: "#6b7280" }}
                      >
                        No coolers data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Verified by (keep under table) */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                  <span>Verified by (Manager):</span>
                  <span style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 240, background: "#fff", fontWeight: 700 }}>
                    {verifiedByManager}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ================= Personal Hygiene ================= */}
          {activeTab === "personalHygiene" && (
            <>
              <PHPrintHeader header={phHeader} selectedDate={selectedPHDate} />
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                  border: "1px solid #000",
                  tableLayout: "fixed",
                  wordBreak: "word-break",
                }}
              >
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
                      <th key={idx} style={{ border: "1px solid #000", padding: "6px 4px", fontWeight: 800 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phRowsCount ? (
                    Array.from({ length: phRowsCount }).map((_, i) => {
                      const emp = personalHygiene[i] || {};
                      return (
                        <tr key={i}>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{i + 1}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.employName || emp?.employeeName || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.nails || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.hair || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.notWearingJewelries || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.wearingCleanCloth || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.communicableDisease || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.openWounds || ""}</td>
                          <td style={{ border: "1px solid #000", padding: "6px 4px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{emp?.remarks || ""}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ ...tdB(true), color: "#6b7280" }}>
                        No rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ border: "1px solid #000", marginTop: 8 }}>
                <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>REMARKS/CORRECTIVE ACTIONS:</div>
                <div style={{ padding: "8px", borderBottom: "1px solid #000", minHeight: 56 }}>
                  <em>*(C – Conform &nbsp;&nbsp; N / C – Non Conform)</em>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>Checked By :</div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{(phFooter?.checkedBy ?? "") || "\u00A0"}</div>
                  </div>
                  <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
                    <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>Verified  By :</div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{(phFooter?.verifiedBy ?? "") || "\u00A0"}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= Daily Cleanliness ================= */}
          {activeTab === "dailyCleanliness" && (
            <>
              <CCPrintHeader header={ccHeader} selectedDate={selectedCleanDate} />
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  border: "1px solid #000",
                  tableLayout: "fixed",
                  wordBreak: "word-break",
                }}
              >
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    <th style={thB(true)}>SI-No</th>
                    <th style={thB(false)}>General Cleaning</th>
                    <th style={thB(true)}>Observation (C / N / C)</th>
                    <th style={thB(false)}>Informed to</th>
                    <th style={thB(false)}>Remarks & CA</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(cleanlinessRows) && cleanlinessRows.length > 0 ? (
                    cleanlinessRows.map((r, i) => {
                      const isSection = !!r?.isSection;
                      const letter = r?.letter || (typeof r?.slNo !== "undefined" ? r.slNo : i + 1);
                      const general =
                        r?.general ||
                        r?.itemEn ||
                        r?.itemAr ||
                        r?.groupEn ||
                        r?.groupAr ||
                        "";
                      const observation = r?.observation || r?.result || "";
                      const informedTo = r?.informedTo || r?.informed || "";
                      const remarks = r?.remarks || "";
                      if (isSection) {
                        return (
                          <tr key={`sec-${i}`} style={{ background: "#f2f2f2", fontWeight: 800 }}>
                            <td style={tdB(true)}>—</td>
                            <td style={tdB(false)}>{r.section || general}</td>
                            <td style={tdB(true)} />
                            <td style={tdB(false)} />
                            <td style={tdB(false)} />
                          </tr>
                        );
                      }
                      return (
                        <tr key={`row-${i}`}>
                          <td style={tdB(true)}>{letter}</td>
                          <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{general}</td>
                          <td style={tdB(true)}>{observation}</td>
                          <td style={tdB(false)}>{informedTo}</td>
                          <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{remarks}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ ...tdB(true), color: "#6b7280" }}>
                        No rows.
                      </td>
                    </tr>
                  )}
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
                    <div
                      style={{
                        padding: "6px 8px",
                        borderInlineEnd: "1px solid #000",
                        minWidth: 180,
                        fontWeight: 900,
                        textDecoration: "underline",
                      }}
                    >
                      CHECKED BY: <span style={{ fontWeight: 400 }}>(QC-ASSIST)</span>
                    </div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{(ccFooter?.checkedBy ?? "") || "\u00A0"}</div>
                  </div>
                  <div style={{ display: "flex", borderInlineStart: "1px solid #000", minHeight: 42 }}>
                    <div
                      style={{
                        padding: "6px 8px",
                        borderInlineEnd: "1px solid #000",
                        minWidth: 180,
                        fontWeight: 900,
                        textDecoration: "underline",
                      }}
                    >
                      VERIFIED BY:
                    </div>
                    <div style={{ padding: "6px 8px", flex: 1 }}>{(ccFooter?.verifiedBy ?? "") || "\u00A0"}</div>
                  </div>
                </div>
                <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
                  <div>Remark: Frequency — Daily</div>
                  <div>* (C = Conform &nbsp;&nbsp;&nbsp;&nbsp; N / C = Non Conform)</div>
                </div>
              </div>
            </>
          )}

          {/* ================= FRESH CHICKEN REBORT -> linked to viewer ================= */}
          {activeTab === "freshChicken" && (
            <div className="no-print" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>FRESH CHICKEN REBORT</h2>
                <a
                  href={FRESH_VIEWER_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "2px solid #0b132b",
                    background: "#0b132b",
                    color: "#fff",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                title="Fresh Chicken Reports Viewer"
                src={FRESH_VIEWER_URL}
                style={{
                  width: "100%",
                  minHeight: "75vh",
                  border: "2px solid #cbd5e1",
                  borderRadius: 12,
                  background: "#fff",
                }}
              />
            </div>
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
const btnOutline = {
  ...btnBase,
  background: "#fff",
  color: "#111827",
  border: "1px solid #e5e7eb",
};
