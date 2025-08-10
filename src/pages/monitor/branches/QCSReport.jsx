import React, { useEffect, useMemo, useState } from "react";
import QCSRawMaterialInspection from "./shipment_recc/QCSRawMaterialInspection";
import PersonalHygieneTab from "./qcs/PersonalHygieneTab";
import DailyCleanlinessTab from "./qcs/DailyCleanlinessTab";

/* =========================
   شعار + إعدادات عامة
========================= */
const LOGO_URL = "/brand/al-mawashi.jpg"; // ضع الصورة في public/brand/al-mawashi.jpg
const MIN_PH_ROWS = 21;

/* =========================
   أوقات كل ساعتين من 4AM إلى 8PM
========================= */
function generateTimes() {
  const times = [];
  let hour = 4;
  for (let i = 0; i < 9; i++) {
    const suffix = hour < 12 ? "AM" : "PM";
    const dispHour = hour % 12 === 0 ? 12 : hour % 12;
    times.push(`${dispHour}:00 ${suffix}`);
    hour += 2;
  }
  return times;
}
const TIMES = generateTimes();

/* =========================
   ترجمة مختصرة (عربي/إنكليزي مدمج)
========================= */
function Bidi({ ar, en, inline }) {
  if (inline) {
    return (
      <span>
        <bdi>{ar}</bdi> / <bdi>{en}</bdi>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-block", lineHeight: 1.2 }}>
      <bdi>{ar}</bdi>
      <br />
      <span style={{ opacity: 0.8, fontSize: ".92em" }}>
        <bdi>{en}</bdi>
      </span>
    </span>
  );
}

/* =========================
   ثوابت + دوال مساعدة
========================= */
const DEFAULT_NAMES = [
  "WELSON","GHITH","ROTIC","RAJU","ABED","KIDANY","MARK","SOULEMAN",
  "THEOPHIAUS","PRINCE","KWAKU ANTWI","KARTHICK","BHUVANESHWARAN",
  "JAYABHARATHI","PURUSHOTH","NASIR"
];

const makeEmptyHygieneRow = (name = "") => ({
  employName: name,
  nails: "",
  hair: "",
  notWearingJewelries: "",
  wearingCleanCloth: "",
  communicableDisease: "",
  openWounds: "",
  remarks: "",
});

const makeDefaultCoolers = () =>
  Array(8).fill(null).map(() => ({
    temps: TIMES.reduce((acc, t) => { acc[t] = ""; return acc; }, {}),
  }));

const makeDefaultHygiene = (min = MIN_PH_ROWS) => {
  const rows = DEFAULT_NAMES.map(n => makeEmptyHygieneRow(n));
  while (rows.length < min) rows.push(makeEmptyHygieneRow(""));
  return rows;
};

const makeDefaultVehicles = () => ([
  { startTime: "", endTime: "", temperature: "", cleanliness: false, plateNumber: "", driverName: "" }
]);

const makeEmptyReport = (date) => ({
  date,
  auditTime: "",
  coolers: makeDefaultCoolers(),
  personalHygiene: makeDefaultHygiene(),
  cleanlinessRows: [],
  vehicleReport: makeDefaultVehicles(),
});

// حفظ بنسختين: مصفوفة + قاموس حسب التاريخ (للتوافق مع صفحة العرض)
function saveReportToStorage(report) {
  try {
    const prevArr = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
    const filtered = Array.isArray(prevArr) ? prevArr.filter(r => r?.date !== report.date) : [];
    localStorage.setItem("qcs_reports", JSON.stringify([...filtered, report]));
  } catch {}
  try {
    const dict = JSON.parse(localStorage.getItem("qcs_daily_reports_v1") || "{}");
    const { date, ...rest } = report;
    dict[report.date] = rest;
    localStorage.setItem("qcs_daily_reports_v1", JSON.stringify(dict));
  } catch {}
}

function loadReportByDate(date) {
  try {
    const dict = JSON.parse(localStorage.getItem("qcs_daily_reports_v1") || "{}");
    if (dict && dict[date]) return { date, ...dict[date] };
  } catch {}
  try {
    const arr = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
    if (Array.isArray(arr)) {
      const found = arr.find(r => r?.date === date);
      if (found) return found;
    }
  } catch {}
  return null;
}

/* =========================
   KPI للبرادات
========================= */
function calcCoolersKPI(coolers) {
  const all = [];
  let outOfRange = 0;
  (coolers || []).forEach(c => {
    TIMES.forEach(t => {
      const v = c?.temps?.[t];
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) outOfRange += 1;
      }
    });
  });
  const avg = all.length ? (all.reduce((a,b)=>a+b,0) / all.length) : null;
  return {
    avg: avg === null ? "—" : avg.toFixed(2),
    min: all.length ? Math.min(...all) : "—",
    max: all.length ? Math.max(...all) : "—",
    outOfRange
  };
}

/* =========================
   ترويسة/فوتر تبويب "النظافة الشخصية" (عرض + تحرير)
========================= */
const defaultPHHeader = {
  documentTitle: "Personal Hygiene Check List",
  documentNo: "FS-QM /REC/PH",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH  QC",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam.O.Sarhan",
};
const defaultPHFooter = { checkedBy: "", verifiedBy: "" };

/* =========================
   ترويسة/فوتر تبويب "النظافة اليومية" (Cleaning Checklist)
========================= */
const defaultDCHeader = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF -QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O.Sarhan",
};
const defaultDCFooter = { checkedBy: "", verifiedBy: "" };

function useLocalJSON(key, initialValue) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initialValue; } catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function RowKV({ label, value }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>{label}</div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}

/* === Personal Hygiene Header/Footer (نفس السابق) === */
function PHEntryHeader({ header, date }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8 }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
          <RowKV label="Document Title:" value={header.documentTitle} />
          <RowKV label="Issue  Date:" value={header.issueDate} />
          <RowKV label="Area:" value={header.area} />
          <RowKV label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={header.documentNo} />
          <RowKV label="Revision  No:" value={header.revisionNo} />
          <RowKV label="Issued By:" value={header.issuedBy} />
          <RowKV label="Approved By:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC-AL QUSAIS
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          PERSONAL HYGIENE CHECK LIST
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
          <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
          <span>{date || ""}</span>
        </div>
      </div>
    </div>
  );
}
function PHEntryFooter({ footer }) {
  return (
    <div style={{ border:"1px solid #000", marginTop:8 }}>
      <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>
      <div style={{ padding:"8px", borderBottom:"1px solid #000", minHeight:40 }}>
        <em>*(C - Conform    N / C - Non Conform)</em>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        <div style={{ display:"flex" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>
            Checked By :
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display:"flex", borderInlineStart:"1px solid #000" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>
            Verified  By :
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.verifiedBy || "\u00A0"}</div>
        </div>
      </div>
    </div>
  );
}
function PHHeaderEditor({ header, setHeader, footer, setFooter }) {
  const row = { display:"grid", gridTemplateColumns:"160px 1fr", gap:8, alignItems:"center" };
  const input = { padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8 };
  return (
    <details style={{ border:"1px dashed #cbd5e1", borderRadius:8, padding:12, margin: "10px 0" }}>
      <summary style={{ cursor:"pointer", fontWeight:800 }}>
        ⚙️ <Bidi ar="تعديل الترويسة والفوتر (اختياري)" en="Edit Header & Footer (optional)" inline />
      </summary>
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <label style={row}><span>Document Title</span><input style={input} value={header.documentTitle} onChange={e=>setHeader({ ...header, documentTitle:e.target.value })}/></label>
          <label style={row}><span>Issue Date</span><input style={input} value={header.issueDate} onChange={e=>setHeader({ ...header, issueDate:e.target.value })}/></label>
          <label style={row}><span>Area</span><input style={input} value={header.area} onChange={e=>setHeader({ ...header, area:e.target.value })}/></label>
          <label style={row}><span>Controlling Officer</span><input style={input} value={header.controllingOfficer} onChange={e=>setHeader({ ...header, controllingOfficer:e.target.value })}/></label>
        </div>
        <div>
          <label style={row}><span>Document No</span><input style={input} value={header.documentNo} onChange={e=>setHeader({ ...header, documentNo:e.target.value })}/></label>
          <label style={row}><span>Revision No</span><input style={input} value={header.revisionNo} onChange={e=>setHeader({ ...header, revisionNo:e.target.value })}/></label>
          <label style={row}><span>Issued By</span><input style={input} value={header.issuedBy} onChange={e=>setHeader({ ...header, issuedBy:e.target.value })}/></label>
          <label style={row}><span>Approved By</span><input style={input} value={header.approvedBy} onChange={e=>setHeader({ ...header, approvedBy:e.target.value })}/></label>
        </div>
      </div>
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <label style={row}><span>Checked By</span><input style={input} value={footer.checkedBy} onChange={e=>setFooter({ ...footer, checkedBy:e.target.value })}/></label>
        <label style={row}><span>Verified By</span><input style={input} value={footer.verifiedBy} onChange={e=>setFooter({ ...footer, verifiedBy:e.target.value })}/></label>
      </div>
      <div style={{ marginTop:8, fontSize:12, color:"#64748b" }}>
        * سيتم حفظ هذه القيم تلقائياً في المتصفح (localStorage).
      </div>
    </details>
  );
}

/* === Daily Cleanliness Header/Footer + Editor === */
function DCEntryHeader({ header, date }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8 }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
          <RowKV label="Document Title:" value={header.documentTitle} />
          <RowKV label="Issue Date:" value={header.issueDate} />
          <RowKV label="Area:" value={header.area} />
          <RowKV label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={header.documentNo} />
          <RowKV label="Revision No:" value={header.revisionNo} />
          <RowKV label="Issued By:" value={header.issuedBy} />
          <RowKV label="Approved By:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          CLEANING CHECKLIST-WAREHOUSE
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
          <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
          <span>{date || ""}</span>
        </div>
      </div>
    </div>
  );
}
function DCEntryFooter({ footer }) {
  return (
    <div style={{ border:"1px solid #000", marginTop:8 }}>
      <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #000" }}>
        <div style={{ display:"flex", minHeight:42 }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
            CHECKED BY: <span style={{ fontWeight:400 }}>(QC-ASSIST)</span>
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display:"flex", borderInlineStart:"1px solid #000", minHeight:42 }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
            VERIFIED BY:
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.verifiedBy || "\u00A0"}</div>
        </div>
      </div>

      <div style={{ padding:"8px 10px", lineHeight:1.6 }}>
        <div>Remark:-Frequency-Daily</div>
        <div>* (C = Conform&nbsp;&nbsp;&nbsp;&nbsp; N / C = Non Conform)</div>
      </div>
    </div>
  );
}
function DCHeaderEditor({ header, setHeader, footer, setFooter }) {
  const row = { display:"grid", gridTemplateColumns:"200px 1fr", gap:8, alignItems:"center" };
  const input = { padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8 };
  return (
    <details style={{ border:"1px dashed #cbd5e1", borderRadius:8, padding:12, margin:"10px 0" }}>
      <summary style={{ cursor:"pointer", fontWeight:800 }}>
        ⚙️ Edit Header/Footer (Cleaning Checklist)
      </summary>
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <label style={row}><span>Document Title</span><input style={input} value={header.documentTitle} onChange={e=>setHeader({ ...header, documentTitle:e.target.value })}/></label>
          <label style={row}><span>Issue Date</span><input style={input} value={header.issueDate} onChange={e=>setHeader({ ...header, issueDate:e.target.value })}/></label>
          <label style={row}><span>Area</span><input style={input} value={header.area} onChange={e=>setHeader({ ...header, area:e.target.value })}/></label>
          <label style={row}><span>Controlling Officer</span><input style={input} value={header.controllingOfficer} onChange={e=>setHeader({ ...header, controllingOfficer:e.target.value })}/></label>
        </div>
        <div>
          <label style={row}><span>Document No</span><input style={input} value={header.documentNo} onChange={e=>setHeader({ ...header, documentNo:e.target.value })}/></label>
          <label style={row}><span>Revision No</span><input style={input} value={header.revisionNo} onChange={e=>setHeader({ ...header, revisionNo:e.target.value })}/></label>
          <label style={row}><span>Issued By</span><input style={input} value={header.issuedBy} onChange={e=>setHeader({ ...header, issuedBy:e.target.value })}/></label>
          <label style={row}><span>Approved By</span><input style={input} value={header.approvedBy} onChange={e=>setHeader({ ...header, approvedBy:e.target.value })}/></label>
        </div>
      </div>
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <label style={row}><span>Checked By (QC-ASSIST)</span><input style={input} value={footer.checkedBy} onChange={e=>setFooter({ ...footer, checkedBy:e.target.value })}/></label>
        <label style={row}><span>Verified By</span><input style={input} value={footer.verifiedBy} onChange={e=>setFooter({ ...footer, verifiedBy:e.target.value })}/></label>
      </div>
    </details>
  );
}

/* =========================
   المكوّن الرئيسي
========================= */
export default function QCSReport() {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("coolers");

  // الحالة (state)
  const [coolers, setCoolers] = useState(makeDefaultCoolers());
  const [personalHygiene, setPersonalHygiene] = useState(makeDefaultHygiene());
  const [auditTime, setAuditTime] = useState("");
  const [cleanlinessRows, setCleanlinessRows] = useState([]);
  const [vehicleReport, setVehicleReport] = useState(makeDefaultVehicles());

  // ترويسة/فوتر النظافة الشخصية
  const [phHeader, setPhHeader] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooter, setPhFooter] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);

  // ترويسة/فوتر النظافة اليومية (Cleaning)
  const [dcHeader, setDcHeader] = useLocalJSON("qcs_dc_header_v1", defaultDCHeader);
  const [dcFooter, setDcFooter] = useLocalJSON("qcs_dc_footer_v1", defaultDCFooter);

  // حمل التقرير عند تغيّر التاريخ (إن وُجد)
  useEffect(() => {
    const existing = loadReportByDate(reportDate);
    if (existing) {
      setAuditTime(existing.auditTime || "");
      setCoolers(Array.isArray(existing.coolers) ? existing.coolers : makeDefaultCoolers());
      setPersonalHygiene(Array.isArray(existing.personalHygiene) ? existing.personalHygiene : makeDefaultHygiene());
      setCleanlinessRows(Array.isArray(existing.cleanlinessRows) ? existing.cleanlinessRows : []);
      setVehicleReport(Array.isArray(existing.vehicleReport) ? existing.vehicleReport : makeDefaultVehicles());
    } else {
      const empty = makeEmptyReport(reportDate);
      setAuditTime(empty.auditTime);
      setCoolers(empty.coolers);
      setPersonalHygiene(empty.personalHygiene);
      setCleanlinessRows(empty.cleanlinessRows);
      setVehicleReport(empty.vehicleReport);
    }
  }, [reportDate]);

  const kpi = useMemo(() => calcCoolersKPI(coolers), [coolers]);

  /* ========== معالجات ========= */
  const handleCoolerChange = (index, time, value) => {
    setCoolers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], temps: { ...next[index].temps, [time]: value } };
      return next;
    });
  };
  const handleVehicleChange = (index, field, value) => {
    setVehicleReport(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // النظافة الشخصية: أدوات
  const addHygieneRow = () => setPersonalHygiene(prev => [...prev, makeEmptyHygieneRow("")]);
  const removeHygieneRow = (i) => setPersonalHygiene(prev => prev.filter((_, idx) => idx !== i));
  const fillDefaultNames = () => {
    setPersonalHygiene(prev => {
      const next = [...prev];
      for (let i = 0; i < DEFAULT_NAMES.length; i++) {
        if (!next[i]) next[i] = makeEmptyHygieneRow(DEFAULT_NAMES[i]);
        else next[i].employName = DEFAULT_NAMES[i];
      }
      return next;
    });
  };
  const ensureMinHygieneRows = () => {
    setPersonalHygiene(prev => {
      const next = [...prev];
      while (next.length < MIN_PH_ROWS) next.push(makeEmptyHygieneRow(""));
      return next;
    });
  };

  // السيارات
  const addVehicle = () => setVehicleReport(prev => [...prev, { startTime:"", endTime:"", temperature:"", cleanliness:false, plateNumber:"", driverName:"" }]);
  const removeVehicle = (i) => setVehicleReport(prev => prev.filter((_, idx) => idx !== i));

  /* ========== حفظ التقرير ========= */
  const saveReport = () => {
    const report = {
      date: reportDate,
      auditTime,
      coolers,
      personalHygiene,
      cleanlinessRows,
      vehicleReport,
    };
    saveReportToStorage(report);
    alert(`✅ تم حفظ تقرير ${reportDate} بنجاح`);
  };

  /* ========== شكل عام ========= */
  const card = { background: "#fff", padding: "1rem", marginBottom: "1rem", borderRadius: 12, boxShadow: "0 0 8px rgba(0,0,0,.10)" };
  const toolbar = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
  const tabBtn = (active) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    backgroundColor: active ? "#2980b9" : "#e5e7eb",
    color: active ? "#fff" : "#374151",
  });
  const tabs = [
    { id: "coolers", label: <Bidi ar="🧊 درجات حرارة البرادات" en="🧊 Coolers Temperatures" /> },
    { id: "personalHygiene", label: <Bidi ar="🧼 النظافة الشخصية" en="🧼 Personal Hygiene" /> },
    { id: "dailyCleanliness", label: <Bidi ar="🧹 النظافة اليومية للمستودع" en="🧹 Daily Cleanliness" /> },
    { id: "vehicleReport", label: <Bidi ar="🚚 تقارير السيارات" en="🚚 Vehicle Reports" /> },
    { id: "shipment", label: <Bidi ar="📦 تقرير استلام الشحنات" en="📦 Raw Material Receipt" /> },
  ];

  return (
    <div style={{
      padding: "1rem",
      direction: "rtl",
      background: "#f8fafc",
      color: "#111827",
      fontFamily: "Cairo, sans-serif",
      minHeight: "100vh",
    }}>
      {/* العنوان والتاريخ */}
      <div style={{ ...card, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>
          <Bidi ar="📋 تقرير فرع QCS اليومي" en="📋 QCS Branch Daily Report" />
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 700 }}>
            <Bidi ar="التاريخ" en="Date" inline />:{" "}
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ fontWeight: 700 }}>
            <Bidi ar="وقت التحقق (اختياري)" en="Audit Time (optional)" inline />:{" "}
            <input
              type="time"
              value={auditTime}
              onChange={(e) => setAuditTime(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
        </div>
      </div>

      {/* تبويبات */}
      <div style={{ ...card, display: "flex", gap: 8, justifyContent: "center" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(activeTab === t.id)}>{t.label}</button>
        ))}
      </div>

      {/* المحتوى */}
      <div>
        {/* تبويب البرادات (بدون أزرار التعبئة/النسخ) */}
        {activeTab === "coolers" && (
          <div style={card}>
            {/* KPIs */}
            <div style={{
              display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: 16
            }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
                <div style={{ color: "#7c3aed", fontWeight: 700 }}><Bidi ar="متوسط الحرارة" en="Average Temp" inline /></div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: kpi.avg !== "—" && (kpi.avg < 0 || kpi.avg > 5) ? "#b91c1c" : "#16a34a" }}>
                  {kpi.avg}<span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
                <div style={{ color: "#b91c1c", fontWeight: 700 }}><Bidi ar="خارج النطاق" en="Out of Range" inline /></div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{kpi.outOfRange}</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
                <div style={{ color: "#0ea5e9", fontWeight: 700 }}><Bidi ar="أقل / أعلى" en="Min / Max" inline /></div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                  <span style={{ color: "#0369a1" }}>{kpi.min}</span>
                  <span style={{ color: "#94a3b8" }}> / </span>
                  <span style={{ color: "#b91c1c" }}>{kpi.max}</span>
                  <span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
                </div>
              </div>
            </div>

            {/* برادات */}
            <h3 style={{ color: "#2980b9", marginBottom: "1rem", textAlign: "center" }}>
              🧊 درجات حرارة البرادات (كل ساعتين من 4AM حتى 8PM)
            </h3>
            {coolers.map((cooler, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "1.2rem",
                  padding: "1rem",
                  backgroundColor: i % 2 === 0 ? "#ecf6fc" : "#d6eaf8",
                  borderRadius: "10px",
                  boxShadow: "inset 0 0 6px rgba(0, 131, 230, 0.15)",
                }}
              >
                <strong style={{ display: "block", marginBottom: "0.8rem", fontSize: "1.1rem" }}>
                  <Bidi ar={`براد ${i + 1}`} en={`Cooler ${i + 1}`} inline />
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "0.7rem",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                  }}
                >
                  {TIMES.map((time) => (
                    <label
                      key={time}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontSize: "0.93rem",
                        color: "#34495e",
                        minWidth: "78px",
                      }}
                    >
                      <span style={{ marginBottom: "7px", fontWeight: "600" }}>{time}</span>
                      <input
                        type="number"
                        value={cooler.temps[time]}
                        onChange={(e) => handleCoolerChange(i, time, e.target.value)}
                        style={tempInputStyle(cooler.temps[time])}
                        placeholder="°C"
                        min="-50"
                        max="50"
                        step="0.1"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* تبويب النظافة الشخصية */}
        {activeTab === "personalHygiene" && (
          <div style={card}>
            <PHEntryHeader header={phHeader} date={reportDate} />
            <PHHeaderEditor header={phHeader} setHeader={setPhHeader} footer={phFooter} setFooter={setPhFooter} />

            <div style={{ ...toolbar, marginBottom: 12 }}>
              <button onClick={fillDefaultNames} style={btnSecondary}><Bidi ar="إعادة الأسماء الافتراضية" en="Reset Default Names" inline /></button>
              <button onClick={ensureMinHygieneRows} style={btnGhost}><Bidi ar={`إكمال تلقائي إلى ${MIN_PH_ROWS} صف`} en={`Autofill to ${MIN_PH_ROWS} rows`} inline /></button>
              <button onClick={addHygieneRow} style={btnGhost}><Bidi ar="➕ إضافة صف" en="➕ Add Row" inline /></button>
            </div>

            <PersonalHygieneTab
              personalHygiene={personalHygiene}
              setPersonalHygiene={setPersonalHygiene}
              onRemoveRow={removeHygieneRow}
            />

            <PHEntryFooter footer={phFooter} />
          </div>
        )}

        {/* تبويب النظافة اليومية */}
        {activeTab === "dailyCleanliness" && (
          <div style={card}>
            <DCEntryHeader header={dcHeader} date={reportDate} />
            <DCHeaderEditor header={dcHeader} setHeader={setDcHeader} footer={dcFooter} setFooter={setDcFooter} />

            <h3 style={{ marginTop: 0 }}><Bidi ar="🧹 النظافة اليومية للمستودع" en="🧹 Warehouse Daily Cleanliness" /></h3>
            <DailyCleanlinessTab
              cleanlinessRows={cleanlinessRows}
              setCleanlinessRows={setCleanlinessRows}
              auditTime={auditTime}
              setAuditTime={setAuditTime}
            />

            <DCEntryFooter footer={dcFooter} />
          </div>
        )}

        {/* تبويب السيارات */}
        {activeTab === "vehicleReport" && (
          <div style={card}>
            <div style={{ ...toolbar, marginBottom: 12 }}>
              <button onClick={() => setVehicleReport(prev => [...prev, { startTime:"", endTime:"", temperature:"", cleanliness:false, plateNumber:"", driverName:"" }])} style={btnGhost}>
                <Bidi ar="➕ إضافة سيارة" en="➕ Add Vehicle" inline />
              </button>
            </div>

            {vehicleReport.map((v, i) => (
              <div key={i} style={{
                background: "#fff7ed", border: "1px solid #fed7aa",
                padding: "0.75rem", borderRadius: 10, marginBottom: 10
              }}>
                <div style={{ ...toolbar, justifyContent: "space-between", marginBottom: 8 }}>
                  <strong><Bidi ar={`سيارة #${i + 1}`} en={`Vehicle #${i + 1}`} inline /></strong>
                  {vehicleReport.length > 1 && (
                    <button onClick={() => setVehicleReport(prev => prev.filter((_, idx) => idx !== i))} style={btnDangerLight}>
                      <Bidi ar="حذف" en="Delete" inline />
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label style={fieldLbl}><Bidi ar="🕐 وقت التحميل" en="🕐 Loading Start" />
                    <input type="time" value={v.startTime} onChange={(e)=>handleVehicleChange(i,"startTime",e.target.value)} style={fieldInput} />
                  </label>
                  <label style={fieldLbl}><Bidi ar="🕔 وقت الانتهاء" en="🕔 Finish Time" />
                    <input type="time" value={v.endTime} onChange={(e)=>handleVehicleChange(i,"endTime",e.target.value)} style={fieldInput} />
                  </label>
                  <label style={fieldLbl}><Bidi ar="🌡️ درجة الحرارة" en="🌡️ Temperature" />
                    <input type="number" value={v.temperature} onChange={(e)=>handleVehicleChange(i,"temperature",e.target.value)} style={{ ...fieldInput, width: "100%" }} />
                  </label>
                  <label style={{ ...fieldLbl, display: "flex", alignItems: "center", gap: 8 }}><Bidi ar="🚿 نظافة السيارة" en="🚿 Cleanliness" />
                    <input type="checkbox" checked={v.cleanliness} onChange={(e)=>handleVehicleChange(i,"cleanliness",e.target.checked)} />
                  </label>
                  <label style={fieldLbl}><Bidi ar="🚗 رقم اللوحة" en="🚗 Plate Number" />
                    <input type="text" value={v.plateNumber} onChange={(e)=>handleVehicleChange(i,"plateNumber",e.target.value)} style={fieldInput} />
                  </label>
                  <label style={fieldLbl}><Bidi ar="👤 اسم السائق" en="👤 Driver Name" />
                    <input type="text" value={v.driverName} onChange={(e)=>handleVehicleChange(i,"driverName",e.target.value)} style={fieldInput} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* تبويب الشحنات */}
        {activeTab === "shipment" && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}><Bidi ar="📦 تقرير استلام الشحنات" en="📦 Raw Material Receipt" /></h3>
            <QCSRawMaterialInspection />
          </div>
        )}
      </div>

      {/* شريط الحفظ */}
      <div style={{ ...card, display: "flex", justifyContent: "center" }}>
        <button onClick={saveReport} style={btnSave}>
          <Bidi ar="💾 حفظ التقرير" en="💾 Save Report" inline />
        </button>
      </div>
    </div>
  );
}

/* =========================
   أنماط صغيرة
========================= */
function tempInputStyle(temp) {
  const t = Number(temp);
  const base = {
    width: 80,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1.7px solid #94a3b8",
    textAlign: "center",
    fontWeight: 600,
    color: "#111827",
    background: "#ffffff",
    transition: "all .18s",
  };
  if (Number.isNaN(t) || temp === "") return base;
  if (t > 5 || t < 0) return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
  if (t >= 3) return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
  return base;
}
const btnBase = {
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  border: "1px solid transparent",
  fontWeight: 800,
};
const btnSecondary = { ...btnBase, background: "#111827", color: "#fff" };
const btnGhost = { ...btnBase, background: "#fff", color: "#111827", border: "1px solid #e5e7eb" };
const btnSave = { ...btnBase, background: "#059669", color: "#fff", padding: "12px 22px", boxShadow: "0 4px 10px rgba(5,150,105,.35)" };
const btnDangerLight = { ...btnBase, background: "#fff", color: "#b91c1c", border: "1px solid #fecaca" };

const fieldLbl = { display: "grid", gap: 6, fontWeight: 700 };
const fieldInput = { padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" };
