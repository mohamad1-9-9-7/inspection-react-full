// src/pages/admin/QCSDailyView.jsx
import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ======================================
   API (Server) — كشف العنوان + تجنّب CORS
====================================== */
// عنوان السيرفر (تقدر تغيّره من window.__QCS_API__ أو REACT_APP_API_URL)
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  API_ROOT_DEFAULT;

// نضمن ما في / بالأخير
const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ======================================
   دوال API متوافقة مع السيرفر الجديد
====================================== */

// جلب كل تقارير qcs-daily (ترجع مصفوفة سجلات من السيرفر)
async function listQcsDailyReports() {
  const res = await fetch(`${REPORTS_URL}?type=qcs-daily`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to list qcs-daily reports");
  const json = await res.json().catch(() => null);
  // ندعم الشكلين: [] مباشرة أو {data: []}
  return Array.isArray(json) ? json : json?.data || [];
}

// إرجاع قائمة التواريخ (مميزة ومرتبة تنازليًا)
async function listReportDates() {
  const rows = await listQcsDailyReports();
  const dates = Array.from(
    new Set(
      rows
        .map((r) => String(r?.payload?.reportDate || r?.payload?.date || ""))
        .filter(Boolean)
    )
  );
  return dates.sort((a, b) => b.localeCompare(a));
}

// جلب تقرير (payload) حسب التاريخ
async function getReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find(
    (r) => String(r?.payload?.reportDate || "") === String(date)
  );
  return found?.payload || null;
}

// حذف تقرير حسب التاريخ (نبحث عن السجل ثم نحذف بالـ id)
async function deleteReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find(
    (r) => String(r?.payload?.reportDate || "") === String(date)
  );
  const id = found?._id || found?.id;
  if (!id) throw new Error("Report not found");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete report");
  return true;
}

/* =========================
   إعدادات عامة
========================= */
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

const PH_COLUMNS = [
  { ar: "الرقم", en: "S. No" },
  { ar: "اسم الموظف", en: "Employee Name" },
  { ar: "الأظافر", en: "Nails" },
  { ar: "الشعر", en: "Hair" },
  { ar: "عدم ارتداء الحُلي", en: "No jewelry" },
  {
    ar: "ارتداء ملابس نظيفة/شبكة شعر/قفازات يد/كمامة/حذاء",
    en: "Wearing clean clothes / hair net / gloves / face mask / shoes",
  },
  { ar: "الأمراض المعدية", en: "Communicable disease(s)" },
  { ar: "جروح/قروح/قطوع مفتوحة", en: "Open wounds / sores / cuts" },
  { ar: "ملاحظات وإجراءات تصحيحية", en: "Remarks & Corrective Actions" },
];

const I18N = {
  reportsTitle: { ar: "قائمة التقارير", en: "Reports List" },
  selectedDate: { ar: "التاريخ المحدد", en: "Selected Date" },
  exportCurrent: {
    ar: "⬇️ تصدير التقرير الحالي (JSON)",
    en: "⬇️ Export Current Report (JSON)",
  },
  exportAll: {
    ar: "⬇️⬇️ تصدير كل التقارير (JSON)",
    en: "⬇️⬇️ Export All Reports (JSON)",
  },
  delete: { ar: "حذف", en: "Delete" },
  noReportsHeader: { ar: "📋 تقارير القصيص", en: "📋 QCS Reports" },
  noReportsText: {
    ar: "لا يوجد تقارير محفوظة على هذا الجهاز.",
    en: "No reports found on this device.",
  },
  tabs: {
    coolers: { ar: "🧊 درجات حرارة البرادات", en: "🧊 Coolers Temperatures" },
    personalHygiene: { ar: "🧼 النظافة الشخصية", en: "🧼 Personal Hygiene" },
    dailyCleanliness: { ar: "🧹 النظافة اليومية", en: "🧹 Daily Cleanliness" },
  },
  sections: {
    coolers: { ar: "🧊 درجات حرارة البرادات", en: "🧊 Coolers Temperatures" },
    personalHygiene: {
      ar: "🧼 النظافة الشخصية للموظفين",
      en: "🧼 Employees Personal Hygiene",
    },
    dailyCleanliness: {
      ar: "🧹 النظافة اليومية للمستودع",
      en: "🧹 Warehouse Daily Cleanliness",
    },
  },
  kpi: {
    avg: { ar: "المتوسط", en: "Average" },
    outOfRange: { ar: "خارج النطاق", en: "Out of Range" },
    minmax: { ar: "أقل / أعلى", en: "Min / Max" },
  },
  tabActions: {
    print: { ar: "🖨️ طباعة التقرير", en: "🖨️ Print Report" },
  },
};

// ثنائي بسيط
function Bidi({ ar, en }) {
  return (
    <span style={{ display: "inline-block" }}>
      <bdi>{ar}</bdi>
      <br />
      <span style={{ opacity: 0.75, fontSize: ".92em" }}>
        <bdi>{en}</bdi>
      </span>
    </span>
  );
}
function LangText({ lang, ar, en, strong = false, inline = false }) {
  const wrap = (n) => (strong ? <strong>{n}</strong> : n);
  if (lang === "ar") return wrap(<bdi>{ar}</bdi>);
  if (lang === "en") return wrap(<bdi>{en}</bdi>);
  return wrap(
    <span style={{ display: inline ? "inline" : "inline-block" }}>
      <bdi>{ar}</bdi>
      <br />
      <span style={{ opacity: 0.7, fontSize: ".92em" }}>
        <bdi>{en}</bdi>
      </span>
    </span>
  );
}

/* =========================
   CSS الطباعة (A4 Landscape + صفحة واحدة)
========================= */
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

/* ========= ستايل شاشة خفيف ========= */
const screenCss = `
  @media screen {
    body { background: linear-gradient(135deg, #f7fafc 0%, #eef2ff 100%); }
    .app-shell { backdrop-filter: saturate(1.1); }
    nav.no-print button {
      transition: transform .08s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease;
    }
    nav.no-print button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
    }
    .cooler-card { transition: box-shadow .18s ease, transform .1s ease; }
    .cooler-card:hover { box-shadow: 0 10px 24px rgba(41, 128, 185, 0.16); transform: translateY(-1px); }
    * { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
    *::-webkit-scrollbar { height: 8px; width: 8px; }
    *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    *::-webkit-scrollbar-track { background: #f1f5f9; }
  }
`;

/* ========= سكيل الطباعة الديناميكي ========= */
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

/* =========================
   Helpers
========================= */
function getTempCellStyle(temp) {
  const t = Number(temp);
  if (temp === "" || isNaN(t))
    return { background: "#d6eaf8", color: "#2980b9" };
  if (t < 0 || t > 5)
    return { background: "#fdecea", color: "#c0392b", fontWeight: 700 };
  if (t >= 3)
    return { background: "#eaf6fb", color: "#2471a3", fontWeight: 600 };
  return { background: "#d6eaf8", color: "#2980b9" };
}
function downloadBlob(str, mime, filename) {
  const blob = new Blob([str], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =========================
   KPIs للبرادات
========================= */
function CoolersKPI({ coolers = [], lang }) {
  const all = [];
  let outOfRange = 0;
  coolers.forEach((c) => {
    COOLER_TIMES.forEach((time) => {
      const v = c?.temps?.[time];
      const t = Number(v);
      if (v !== "" && !isNaN(t)) {
        all.push(t);
        if (t < 0 || t > 5) outOfRange += 1;
      }
    });
  });
  const avgNum = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  const avg = avgNum !== null ? avgNum.toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  const avgBad = avgNum !== null && (avgNum < 0 || avgNum > 5);

  return (
    <div
      style={{
        display: "flex",
        gap: "1.2rem",
        margin: "10px 0 25px 0",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "9px 26px",
          fontWeight: "bold",
          color: "#512e5f",
          boxShadow: "0 2px 10px #e8daef33",
        }}
      >
        <LangText lang={lang} {...I18N.kpi.avg} inline />:{" "}
        <span
          style={{
            color: avgBad ? "#c0392b" : "#229954",
            fontWeight: "bolder",
          }}
        >
          {avg}°C
        </span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "9px 26px",
          fontWeight: "bold",
          color: "#c0392b",
          boxShadow: "0 2px 10px #fdecea",
        }}
      >
        <LangText lang={lang} {...I18N.kpi.outOfRange} inline />:{" "}
        <span style={{ fontWeight: "bolder" }}>{outOfRange}</span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "9px 22px",
          fontWeight: "bold",
          color: "#884ea0",
          boxShadow: "0 2px 10px #f5eef8",
        }}
      >
        <LangText lang={lang} {...I18N.kpi.minmax} inline />:{" "}
        <span style={{ color: "#2471a3" }}>{min}</span>
        <span style={{ color: "#999" }}> / </span>
        <span style={{ color: "#c0392b" }}>{max}</span>
        <span style={{ color: "#884ea0", fontWeight: "normal" }}>°C</span>
      </div>
    </div>
  );
}

/* =========================
   ترويسة/فوتر التبويبات المطبوعة
========================= */
const defaultPHHeader = {
  documentTitle: "Personal Hygiene Check List",
  documentNo: "FS-QM /REC/PH",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "Hussam.O.Sarhan",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam.O.ASarhan",
};
const defaultPHFooter = { checkedBy: "MOHAMAD", verifiedBy: "" };

const defaultCCHeader = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF -QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O.Sarhan",
};
const defaultCCFooter = { checkedBy: "", verifiedBy: "" };

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
            src={LOGO_URL}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue  Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row
            label="Controlling Officer:"
            value={header.controllingOfficer}
          />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision  No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
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
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC-AL QUSAIS
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
          PERSONAL HYGIENE CHECK LIST
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
          <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}
function PHPrintFooter({ footer }) {
  return (
    <div style={{ border: "1px solid #000", marginTop: 8, breakInside: "avoid" }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>
      <div style={{ padding: "8px", borderBottom: "1px solid #000", minHeight: 56 }}>
        <em>*(C – Conform    N / C – Non Conform)</em>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "flex" }}>
          <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>
            Checked By :
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{footer.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
          <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 120, fontWeight: 700 }}>
            Verified  By :
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{footer.verifiedBy || "\u00A0"}</div>
        </div>
      </div>
    </div>
  );
}

function CCPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
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
            src={LOGO_URL}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row
            label="Controlling Officer:"
            value={header.controllingOfficer}
          />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
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
          TRANS EMIRATES LIVESTOCK TRADING LLC
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
          CLEANING CHECKLIST-WAREHOUSE
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
          <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}
function CCPrintFooter({ footer }) {
  return (
    <div style={{ border: "1px solid #000", marginTop: 8, breakInside: "avoid" }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "flex" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 160,
              fontWeight: 900,
              textDecoration: "underline",
            }}
          >
            CHECKED BY: <span style={{ fontWeight: 400 }}>(QC-ASSIST)</span>
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{footer.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 140,
              fontWeight: 900,
              textDecoration: "underline",
            }}
          >
            VERIFIED BY:
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{footer.verifiedBy || "\u00A0"}</div>
        </div>
      </div>

      <div style={{ padding: "8px 8px 2px", fontStyle: "italic" }}>
        Remark:-Frequency-Daily
      </div>
      <div style={{ padding: "0 8px 8px", fontStyle: "italic" }}>
        *(C = Conform &nbsp;&nbsp;&nbsp; N / C = Non Conform)
      </div>
    </div>
  );
}

/* =========================
   جدول النظافة اليومية المثبّت
========================= */
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

function findCleanRow(rows, sectionHeader, itemName) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const norm = (s) => String(s || "").trim().toLowerCase();
  const h = norm(sectionHeader);
  const i = norm(itemName);
  return (
    rows.find(
      (r) =>
        (norm(r.groupEn) === h || norm(r.groupAr) === h) &&
        (norm(r.itemEn) === i || norm(r.itemAr) === i)
    ) || null
  );
}

/* =========================
   الصفحة الرئيسية
========================= */
export default function QCSDailyView() {
  const [reports, setReports] = useState([]); // [{date}]
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("coolers");
  const [lang, setLang] = useState("both");

  const [phHeader, setPhHeader] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooter, setPhFooter] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);
  const [ccHeader, setCcHeader] = useLocalJSON("qcs_cc_header_v1", defaultCCHeader);
  const [ccFooter, setCcFooter] = useLocalJSON("qcs_cc_footer_v1", defaultCCFooter);

  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  // تحميل قائمة التواريخ
  useEffect(() => {
    (async () => {
      try {
        const dates = await listReportDates();
        const items = dates.map((d) => ({ date: d }));
        setReports(items);
        setSelectedDate(dates[0] || null);
      } catch (e) {
        console.error(e);
        alert("تعذّر جلب قائمة التقارير من السيرفر.");
      }
    })();
  }, []);

  // جلب تقرير التاريخ المختار
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
        alert("تعذّر جلب التقرير المحدّد من السيرفر.");
      } finally {
        setLoadingReport(false);
      }
    })();
  }, [selectedDate]);

  // حذف نهائي من السيرفر
  const handleDeleteReport = async (dateToDelete) => {
    const msgEn = `Are you sure you want to delete report dated ${dateToDelete}?`;
    const msgAr = `هل أنت متأكد من حذف التقرير الخاص بتاريخ ${dateToDelete}؟`;
    if (!window.confirm(lang === "en" ? msgEn : msgAr)) return;

    try {
      await deleteReportByDate(dateToDelete);
      const filtered = reports.filter((r) => r.date !== dateToDelete);
      setReports(filtered);
      if (selectedDate === dateToDelete) setSelectedDate(filtered[0]?.date || null);
    } catch (e) {
      console.error(e);
      alert(lang === "en" ? "Failed to delete report from server." : "فشل حذف التقرير من السيرفر.");
    }
  };

  // تصدير JSON
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
      downloadBlob(
        JSON.stringify(all, null, 2),
        "application/json",
        "qcs_reports_backup_all.json"
      );
    } catch (e) {
      console.error(e);
      alert(lang === "en" ? "Failed to export all." : "فشل تصدير الكل.");
    } finally {
      setExportingAll(false);
    }
  };
  const exportCurrent =
    () =>
      selectedReport &&
      downloadBlob(
        JSON.stringify(selectedReport, null, 2),
        "application/json",
        `qcs_report_${selectedDate}.json`
      );

  // طباعة
  const handlePrint = () => {
    setAutoPrintScale();
    setTimeout(() => window.print(), 30);
  };

  // تصدير PDF
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const input = document.getElementById("report-container");
      if (!input) {
        alert("لم يتم العثور على منطقة التقرير.");
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
      alert("تعذّر إنشاء ملف PDF. تأكد من تثبيت jspdf و html2canvas.");
    } finally {
      setExportingPDF(false);
    }
  };

  // before/after print للتنظيف
  useEffect(() => {
    const before = () => setAutoPrintScale();
    const after = () => {
      const el =
        document.querySelector(".print-area.one-page") ||
        document.querySelector(".print-area");
      if (el) el.style.removeProperty("--print-scale");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  // حالة لا يوجد تقارير
  if (reports.length === 0) {
    return (
      <div
        className="app-shell"
        style={{
          padding: "1rem",
          fontFamily: "Cairo, sans-serif",
          direction: lang === "en" ? "ltr" : "rtl",
        }}
      >
        <style>{printCss}</style>
        <style>{screenCss}</style>
        <header
          className="no-print"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h3>
            <LangText lang={lang} {...I18N.noReportsHeader} />
          </h3>
          <LangSwitch lang={lang} setLang={setLang} />
        </header>
        <div className="print-area one-page" id="report-container">
          <p>
            <LangText lang={lang} {...I18N.noReportsText} />
          </p>
        </div>
      </div>
    );
  }

  const coolers = Array.isArray(selectedReport?.coolers)
    ? selectedReport.coolers
    : [];
  const personalHygiene = Array.isArray(selectedReport?.personalHygiene)
    ? selectedReport.personalHygiene
    : [];
  const cleanlinessRows = Array.isArray(selectedReport?.cleanlinessRows)
    ? selectedReport.cleanlinessRows
    : [];

  // حد أدنى لطباعة النظافة الشخصية
  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);
  const phDataForPrint = Array.from({ length: phRowsCount }).map(
    (_, i) => personalHygiene[i] || {}
  );

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        gap: "1rem",
        fontFamily: "Cairo, sans-serif",
        padding: "1rem",
        direction: lang === "en" ? "ltr" : "rtl",
      }}
    >
      <style>{printCss}</style>
      <style>{screenCss}</style>

      {/* الشريط الجانبي */}
      <aside
        className="no-print"
        style={{ flex: "0 0 290px", borderRight: "1px solid #e5e7eb", paddingRight: "1rem" }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>
            <LangText lang={lang} {...I18N.reportsTitle} />
          </h3>
          <LangSwitch small lang={lang} setLang={setLang} />
        </header>

        {/* اختيار التاريخ */}
        <div style={{ margin: "10px 0" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
            <LangText lang={lang} {...I18N.selectedDate} />
          </label>
          <select
            value={selectedDate ?? ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              outline: "none",
            }}
          >
            {reports.map((r) => (
              <option key={r.date} value={r.date}>
                {r.date}
              </option>
            ))}
          </select>
        </div>

        {/* قائمة التواريخ + حذف */}
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
                title={lang === "en" ? "Delete report" : "حذف التقرير"}
              >
                <LangText lang={lang} {...I18N.delete} inline />
              </button>
            </li>
          ))}
        </ul>

        {/* أزرار التصدير */}
        <div style={{ marginTop: "1.2rem", display: "grid", gap: 8 }}>
          <button
            onClick={exportCurrent}
            style={btnStylePrimary}
            title="Export current report as JSON"
            disabled={!selectedReport}
          >
            <LangText lang={lang} {...I18N.exportCurrent} inline />
          </button>
          <button
            onClick={exportAll}
            style={{ ...btnStyleSecondary, opacity: exportingAll ? 0.7 : 1 }}
            title="Export all reports as JSON"
            disabled={exportingAll}
          >
            {exportingAll ? "… جارِ تجميع كل التقارير" : <LangText lang={lang} {...I18N.exportAll} inline />}
          </button>
        </div>
      </aside>

      {/* المحتوى */}
      <main style={{ flex: 1, minWidth: 320, maxHeight: "calc(100vh - 3rem)", overflowY: "auto", paddingRight: "1rem" }}>
        {/* التبويبات */}
        <nav
          className="no-print"
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "0.6rem",
            position: "sticky",
            top: 0,
            background: "#fff",
            paddingTop: 6,
            paddingBottom: 6,
            zIndex: 5,
          }}
        >
          {[
            { id: "coolers", label: I18N.tabs.coolers },
            { id: "personalHygiene", label: I18N.tabs.personalHygiene },
            { id: "dailyCleanliness", label: I18N.tabs.dailyCleanliness },
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
              <LangText lang={lang} {...label} />
            </button>
          ))}
        </nav>

        {/* أزرار الطباعة/تصدير PDF */}
        <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "flex-end", margin: "0 0 8px 0" }}>
          <button onClick={handlePrint} style={btnStyleOutline}>
            <LangText lang={lang} {...I18N.tabActions.print} inline />
          </button>
          <button
            onClick={handleExportPDF}
            style={{ ...btnStylePrimary, opacity: exportingPDF ? 0.7 : 1 }}
            disabled={exportingPDF}
            title="Export as PDF (A4 Landscape)"
          >
            {exportingPDF ? "… جاري إنشاء PDF" : "📄 تصدير PDF"}
          </button>
        </div>

        {/* حالة التحميل */}
        {loadingReport && (
          <div className="no-print" style={{ marginBottom: 8, fontStyle: "italic", color: "#6b7280" }}>
            {lang === "en" ? "Loading report..." : "جارِ تحميل التقرير..."}
          </div>
        )}

        {/* ===== منطقة الطباعة ===== */}
        <div className="print-area one-page" id="report-container">
          {/* البرادات */}
          {activeTab === "coolers" && (
            <>
              <h4 style={{ color: "#2980b9", margin: "0 0 10px 0" }}>
                <LangText lang={lang} {...I18N.sections.coolers} />{" "}
                - <small>{selectedDate}</small>
              </h4>
              <CoolersKPI coolers={coolers} lang={lang} />
              {coolers.length > 0 ? (
                coolers.map((cooler, i) => (
                  <div
                    key={i}
                    className="cooler-card"
                    style={{
                      marginBottom: "1.2rem",
                      background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
                      padding: "1.1rem 0.7rem",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      boxShadow: "0 3px 14px rgba(0,0,0,.06)",
                    }}
                  >
                    <strong style={{ minWidth: "80px", color: "#34495e", fontWeight: "bold" }}>
                      <bdi>{lang === "en" ? "Cooler" : "براد"} {i + 1}:</bdi>
                    </strong>
                    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                      {COOLER_TIMES.map((time) => (
                        <div
                          key={time}
                          style={{
                            minWidth: "62px",
                            padding: "7px 7px",
                            borderRadius: "8px",
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: ".99em",
                            boxShadow: "0 0 4px #d6eaf8",
                            ...getTempCellStyle(cooler?.temps?.[time]),
                          }}
                          title={`${time} — ${cooler?.temps?.[time] ?? "-"}°C`}
                        >
                          <div
                            style={{
                              fontSize: "0.85rem",
                              marginBottom: "2px",
                              color: "#512e5f",
                              fontWeight: 600,
                            }}
                          >
                            {time}
                          </div>
                          <div>
                            {(cooler?.temps?.[time] ?? "") !== ""
                              ? `${cooler?.temps?.[time]}°C`
                              : "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات للبرادات</p>
              )}
            </>
          )}

          {/* النظافة الشخصية */}
          {activeTab === "personalHygiene" && (
            <>
              <PHPrintHeader header={phHeader} selectedDate={selectedDate} />
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                  border: "1px solid #000",
                }}
              >
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    {PH_COLUMNS.map((c, idx) => (
                      <th
                        key={idx}
                        style={{ border: "1px solid #000", padding: "6px 4px", fontWeight: 800 }}
                      >
                        <Bidi ar={c.ar} en={c.en} />
                      </th>
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
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                        {emp?.notWearingJewelries || ""}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                        {emp?.wearingCleanCloth || ""}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                        {emp?.communicableDisease || ""}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                        {emp?.openWounds || ""}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.remarks || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PHPrintFooter footer={phFooter} />
            </>
          )}

          {/* النظافة اليومية */}
          {activeTab === "dailyCleanliness" && (
            <>
              <CCPrintHeader header={ccHeader} selectedDate={selectedDate} />

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  border: "1px solid #000",
                }}
              >
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                      SI-No
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>
                      General Cleaning
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                      C / NC
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                      Time
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>
                      Observation
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>
                      Informed to
                    </th>
                    <th style={{ border: "1px solid #000", padding: "6px 4px" }}>
                      Remarks & CA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [];
                    let si = 1;
                    CLEANING_SECTIONS.forEach((sec, sIdx) => {
                      // عنوان القسم
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
                      // عناصر القسم
                      sec.items.forEach((item, iIdx) => {
                        const found = findCleanRow(cleanlinessRows, sec.header, item) || {};
                        rows.push(
                          <tr key={`row-${sIdx}-${iIdx}`}>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                              {si++}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{item}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                              {found.result || ""}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>
                              {selectedReport?.auditTime || ""}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                              {found.observation || ""}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                              {found.informed || ""}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "6px 4px" }}>
                              {found.remarks || ""}
                            </td>
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

              <CCPrintFooter footer={ccFooter} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================
   مبدّل اللغة UI
========================= */
function LangSwitch({ lang, setLang, small = false }) {
  const base = {
    padding: small ? "4px 8px" : "6px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };
  const active = {
    ...base,
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => setLang("ar")} style={lang === "ar" ? active : base}>
        AR
      </button>
      <button onClick={() => setLang("en")} style={lang === "en" ? active : base}>
        EN
      </button>
      <button onClick={() => setLang("both")} style={lang === "both" ? active : base}>
        BOTH
      </button>
    </div>
  );
}

/* =========================
   أزرار
========================= */
const btnBase = {
  padding: "9px 12px",
  borderRadius: 8,
  cursor: "pointer",
  border: "1px solid transparent",
  fontWeight: 700,
};
const btnStylePrimary = { ...btnBase, background: "#2563eb", color: "#fff" };
const btnStyleSecondary = { ...btnBase, background: "#111827", color: "#fff" };
const btnStyleOutline = {
  ...btnBase,
  background: "#fff",
  color: "#111827",
  border: "1px solid #e5e7eb",
};
