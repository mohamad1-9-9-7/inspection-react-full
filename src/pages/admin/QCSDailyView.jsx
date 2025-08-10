import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   إعدادات عامة
========================= */
const LOGO_URL = "/brand/al-mawashi.jpg";
const MIN_PH_ROWS = 21;

const COOLER_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM",
  "2:00 PM","4:00 PM","6:00 PM","8:00 PM"
];

// عناوين تبويب النظافة الشخصية
const PH_COLUMNS = [
  { ar: "الرقم", en: "S. No" },
  { ar: "اسم الموظف", en: "Employ Name" },
  { ar: "الأظافر", en: "Nails" },
  { ar: "الشعر", en: "Hair" },
  { ar: "عدم ارتداء الحُلي", en: "Not wearing Jewelries" },
  { ar: "ارتداء ملابس نظيفة/شبكة شعر/قفازات يد/كمامات وجه/حذاء", en: "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/ Shoe" },
  { ar: "الأمراض المعدية", en: "Communicable disease" },
  { ar: "جروح/قروح/قطوع مفتوحة", en: "Open wounds/ sores & cut" },
  { ar: "ملاحظات وإجراءات تصحيحية", en: "Remarks and Corrective Actions" },
];

const I18N = {
  reportsTitle: { ar: "قائمة التقارير", en: "Reports List" },
  selectedDate: { ar: "التاريخ المحدد", en: "Selected Date" },
  exportCurrent: { ar: "⬇️ تصدير التقرير الحالي (JSON)", en: "⬇️ Export Current Report (JSON)" },
  exportAll: { ar: "⬇️⬇️ تصدير كل التقارير (JSON)", en: "⬇️⬇️ Export All Reports (JSON)" },
  importBtn: { ar: "⬆️ استيراد التقارير", en: "⬆️ Import Reports" },
  delete: { ar: "حذف", en: "Delete" },
  noReportsHeader: { ar: "📋 تقارير القصيص", en: "📋 QCS Reports" },
  noReportsText: { ar: "لا يوجد تقارير محفوظة على هذا الجهاز.", en: "No reports found on this device." },
  tabs: {
    coolers: { ar: "🧊 درجات حرارة البرادات", en: "🧊 Coolers Temperatures" },
    personalHygiene: { ar: "🧼 النظافة الشخصية", en: "🧼 Personal Hygiene" },
    dailyCleanliness: { ar: "🧹 النظافة اليومية", en: "🧹 Daily Cleanliness" },
    vehicleReport: { ar: "🚚 تقارير السيارات", en: "🚚 Vehicle Reports" },
  },
  sections: {
    coolers: { ar: "🧊 درجات حرارة البرادات", en: "🧊 Coolers Temperatures" },
    personalHygiene: { ar: "🧼 النظافة الشخصية للموظفين", en: "🧼 Employees Personal Hygiene" },
    dailyCleanliness: { ar: "🧹 النظافة اليومية للمستودع", en: "🧹 Warehouse Daily Cleanliness" },
    vehicleReport: { ar: "🚚 تقارير السيارات", en: "🚚 Vehicle Reports" },
  },
  kpi: {
    avg: { ar: "المتوسط", en: "Average" },
    outOfRange: { ar: "خارج النطاق", en: "Out of Range" },
    minmax: { ar: "أقل / أعلى", en: "Min / Max" },
  },
  vehicle: {
    loadStart: { ar: "⏱️ وقت التحميل", en: "⏱️ Loading Start" },
    loadEnd: { ar: "⏱️ الانتهاء", en: "⏱️ Finish" },
    temp: { ar: "🌡️ درجة الحرارة", en: "🌡️ Temperature" },
    clean: { ar: "🧼 نظافة", en: "🧼 Cleanliness" },
    plate: { ar: "🚗 رقم اللوحة", en: "🚗 Plate Number" },
    driver: { ar: "👨‍✈️ اسم السائق", en: "👨‍✈️ Driver Name" },
    cleanYes: { ar: "✅ نظيفة", en: "✅ Clean" },
    cleanNo: { ar: "❌ غير نظيفة", en: "❌ Not Clean" },
  },
  tabActions: {
    print: { ar: "🖨️ طباعة التقرير", en: "🖨️ Print Report" },
  }
};

// ثنائي بسيط
function Bidi({ ar, en }) {
  return (
    <span style={{ display: "inline-block" }}>
      <bdi>{ar}</bdi>
      <br />
      <span style={{ opacity: .75, fontSize: ".92em" }}><bdi>{en}</bdi></span>
    </span>
  );
}
function LangText({ lang, ar, en, strong=false, inline=false }) {
  const wrap = (n) => strong ? <strong>{n}</strong> : n;
  if (lang === "ar") return wrap(<bdi>{ar}</bdi>);
  if (lang === "en") return wrap(<bdi>{en}</bdi>);
  return wrap(
    <span style={{ display: inline ? "inline" : "inline-block" }}>
      <bdi>{ar}</bdi><br/><span style={{ opacity:.7, fontSize:".92em" }}><bdi>{en}</bdi></span>
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

    /* إجبار المحتوى على صفحة واحدة مع سكيل ديناميكي */
    .one-page {
      width: 281mm;                 /* 297 - (8+8)mm */
      height: auto;
      overflow: visible !important;
      transform-origin: top left;
      transform: scale(var(--print-scale, 1));
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

/* ========= سكيل الطباعة الديناميكي ========= */
const PX_PER_MM = 96 / 25.4;     // تحويل mm إلى px
const PRINT_W_MM = 281;          // عرض المساحة القابلة للطباعة (A4 Landscape مع هامش 8mm)
const PRINT_H_MM = 194;          // الارتفاع القابل للطباعة

function setAutoPrintScale() {
  const el = document.querySelector('.print-area.one-page') || document.querySelector('.print-area');
  if (!el) return 1;
  const rect = el.getBoundingClientRect(); // أبعاد المحتوى على الشاشة (بدون سكيل الطباعة)
  const maxW = PRINT_W_MM * PX_PER_MM;
  const maxH = PRINT_H_MM * PX_PER_MM;
  const scale = Math.min(maxW / rect.width, maxH / rect.height, 1);
  el.style.setProperty('--print-scale', String(scale));
  return scale;
}

// ستايل شاشة بسيط
const thStyle = { padding: "8px", borderBottom: "2px solid #2980b9" };
const tdStyle = { padding: "8px", borderBottom: "1px solid #ccc" };

/* =========================
   Helpers
========================= */
function getTempCellStyle(temp) {
  const t = Number(temp);
  if (temp === "" || isNaN(t)) return { background: "#d6eaf8", color: "#2980b9" };
  if (t < 0 || t > 5) return { background: "#fdecea", color: "#c0392b", fontWeight: 700 };
  if (t >= 3) return { background: "#eaf6fb", color: "#2471a3", fontWeight: 600 };
  return { background: "#d6eaf8", color: "#2980b9" };
}
function downloadBlob(str, mime, filename) {
  const blob = new Blob([str], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function headerByLang(ar, en, lang) {
  if (lang === "ar") return ar;
  if (lang === "en") return en;
  return `${ar} / ${en}`;
}
function loadUnifiedReports() {
  const arr = [];
  try { const oldRaw = localStorage.getItem("qcs_reports"); if (oldRaw) { const a = JSON.parse(oldRaw); if (Array.isArray(a)) arr.push(...a); } } catch {}
  try { const newRaw = localStorage.getItem("qcs_daily_reports_v1"); if (newRaw) { const dict = JSON.parse(newRaw); if (dict && typeof dict === "object") Object.keys(dict).forEach(d => { const rec = dict[d]; if (rec && typeof rec === "object") arr.push({ date: d, ...rec }); }); } } catch {}
  const map = new Map(); arr.forEach(r => r?.date && map.set(r.date, r));
  return Array.from(map.values()).sort((a,b)=> (a.date < b.date ? 1 : -1));
}

/* =========================
   KPIs للبرادات
========================= */
function CoolersKPI({ coolers = [], lang }) {
  const all = []; let outOfRange = 0;
  coolers.forEach(c => {
    COOLER_TIMES.forEach(time => {
      const v = c?.temps?.[time]; const t = Number(v);
      if (v !== "" && !isNaN(t)) { all.push(t); if (t < 0 || t > 5) outOfRange += 1; }
    });
  });
  const avgNum = all.length ? all.reduce((a,b)=>a+b,0)/all.length : null;
  const avg = avgNum !== null ? avgNum.toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  const avgBad = avgNum !== null && (avgNum < 0 || avgNum > 5);

  return (
    <div style={{ display:"flex", gap:"1.2rem", margin:"10px 0 25px 0", flexWrap:"wrap" }}>
      <div style={{ background:"#fff", borderRadius:8, padding:"9px 26px", fontWeight:"bold", color:"#512e5f", boxShadow:"0 2px 10px #e8daef33" }}>
        <LangText lang={lang} {...I18N.kpi.avg} inline />:{" "}
        <span style={{ color: avgBad ? "#c0392b" : "#229954", fontWeight: "bolder" }}>{avg}°C</span>
      </div>
      <div style={{ background:"#fff", borderRadius:8, padding:"9px 26px", fontWeight:"bold", color:"#c0392b", boxShadow:"0 2px 10px #fdecea" }}>
        <LangText lang={lang} {...I18N.kpi.outOfRange} inline />: <span style={{ fontWeight:"bolder" }}>{outOfRange}</span>
      </div>
      <div style={{ background:"#fff", borderRadius:8, padding:"9px 22px", fontWeight:"bold", color:"#884ea0", boxShadow:"0 2px 10px #f5eef8" }}>
        <LangText lang={lang} {...I18N.kpi.minmax} inline />:{" "}
        <span style={{ color:"#2471a3" }}>{min}</span>
        <span style={{ color:"#999" }}> / </span>
        <span style={{ color:"#c0392b" }}>{max}</span>
        <span style={{ color:"#884ea0", fontWeight:"normal" }}>°C</span>
      </div>
    </div>
  );
}

/* =========================
   ترويسة/فوتر تبويب النظافة الشخصية
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

/* =========================
   ترويسة/فوتر تبويب النظافة اليومية (Cleaning Checklist)
========================= */
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
const defaultCCFooter = {
  checkedBy: "",
  verifiedBy: "",
};

function useLocalJSON(key, initialValue) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initialValue; } catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function Row({ label, value }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>{label}</div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}

/* ===== Personal Hygiene Header/Footer (عرض) ===== */
function PHPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue  Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision  No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
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
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}
function PHPrintFooter({ footer }) {
  return (
    <div style={{ border:"1px solid #000", marginTop:8, breakInside:"avoid" }}>
      <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>
      <div style={{ padding:"8px", borderBottom:"1px solid #000", minHeight:56 }}>
        <em>*(C – Conform    N / C – Non Conform)</em>
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

// محرر قيم النظافة الشخصية — حفظ عند الضغط فقط
function PHHeaderEditor({ header, setHeader, footer, setFooter }) {
  const [localHeader, setLocalHeader] = useState(header);
  const [localFooter, setLocalFooter] = useState(footer);

  useEffect(() => { setLocalHeader(header); }, [header]);
  useEffect(() => { setLocalFooter(footer); }, [footer]);

  const Input = ({ label, value, onChange }) => (
    <label style={{ display:"grid", gridTemplateColumns:"160px 1fr", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ fontWeight:700 }}>{label}</span>
      <input value={value} onChange={e=>onChange(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #ccc", borderRadius:6 }} />
    </label>
  );

  return (
    <div className="no-print" style={{ border:"1px dashed #bbb", padding:12, borderRadius:8, margin:"8px 0" }}>
      <details>
        <summary style={{ cursor:"pointer", fontWeight:800 }}>⚙️ Edit Header/Footer (Personal Hygiene)</summary>
        <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <Input label="Document Title" value={localHeader.documentTitle} onChange={v=>setLocalHeader({...localHeader, documentTitle:v})}/>
            <Input label="Issue Date" value={localHeader.issueDate} onChange={v=>setLocalHeader({...localHeader, issueDate:v})}/>
            <Input label="Area" value={localHeader.area} onChange={v=>setLocalHeader({...localHeader, area:v})}/>
            <Input label="Controlling Officer" value={localHeader.controllingOfficer} onChange={v=>setLocalHeader({...localHeader, controllingOfficer:v})}/>
          </div>
          <div>
            <Input label="Document No" value={localHeader.documentNo} onChange={v=>setLocalHeader({...localHeader, documentNo:v})}/>
            <Input label="Revision No" value={localHeader.revisionNo} onChange={v=>setLocalHeader({...localHeader, revisionNo:v})}/>
            <Input label="Issued By" value={localHeader.issuedBy} onChange={v=>setLocalHeader({...localHeader, issuedBy:v})}/>
            <Input label="Approved By" value={localHeader.approvedBy} onChange={v=>setLocalHeader({...localHeader, approvedBy:v})}/>
          </div>
        </div>

        <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Input label="Checked By" value={localFooter.checkedBy} onChange={v=>setLocalFooter({...localFooter, checkedBy:v})}/>
          <Input label="Verified By" value={localFooter.verifiedBy} onChange={v=>setLocalFooter({...localFooter, verifiedBy:v})}/>
        </div>

        <div style={{ marginTop:10, display:"flex", gap:8 }}>
          <button onClick={() => { setHeader(localHeader); setFooter(localFooter); }}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #16a34a", background:"#16a34a", color:"#fff", fontWeight:800, cursor:"pointer" }}>
            Save
          </button>
          <button onClick={() => { setLocalHeader(header); setLocalFooter(footer); }}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#111827", fontWeight:800, cursor:"pointer" }}>
            Cancel
          </button>
        </div>

        <div style={{ marginTop:8, fontSize:12, color:"#666" }}>
          * القيم لا تُحفظ أثناء الكتابة. يتم الحفظ فقط عند الضغط على Save.
        </div>
      </details>
    </div>
  );
}

/* ===== Cleaning Checklist Header/Footer (عرض) ===== */
function CCPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
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

      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          CLEANING CHECKLIST-WAREHOUSE
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
          <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}
function CCPrintFooter({ footer }) {
  return (
    <div style={{ border:"1px solid #000", marginTop:8, breakInside:"avoid" }}>
      <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
        REMARKS/CORRECTIVE ACTIONS:
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        <div style={{ display:"flex" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:160, fontWeight:900, textDecoration:"underline" }}>
            CHECKED BY: <span style={{ fontWeight:400 }}>(QC-ASSIST)</span>
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display:"flex", borderInlineStart:"1px solid #000" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:140, fontWeight:900, textDecoration:"underline" }}>
            VERIFIED BY:
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{footer.verifiedBy || "\u00A0"}</div>
        </div>
      </div>

      <div style={{ padding:"8px 8px 2px", fontStyle:"italic" }}>
        Remark:-Frequency-Daily
      </div>
      <div style={{ padding:"0 8px 8px", fontStyle:"italic" }}>
        *(C = Conform &nbsp;&nbsp;&nbsp; N / C = Non Conform)
      </div>
    </div>
  );
}

// محرر قيم Cleaning Checklist — حفظ عند الضغط فقط
function CCHeaderEditor({ header, setHeader, footer, setFooter }) {
  const [localHeader, setLocalHeader] = useState(header);
  const [localFooter, setLocalFooter] = useState(footer);

  useEffect(() => { setLocalHeader(header); }, [header]);
  useEffect(() => { setLocalFooter(footer); }, [footer]);

  const Input = ({ label, value, onChange }) => (
    <label style={{ display:"grid", gridTemplateColumns:"160px 1fr", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ fontWeight:700 }}>{label}</span>
      <input value={value} onChange={e=>onChange(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #ccc", borderRadius:6 }} />
    </label>
  );

  return (
    <div className="no-print" style={{ border:"1px dashed #bbb", padding:12, borderRadius:8, margin:"8px 0" }}>
      <details>
        <summary style={{ cursor:"pointer", fontWeight:800 }}>⚙️ Edit Header/Footer (Daily Cleanliness)</summary>
        <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <Input label="Document Title" value={localHeader.documentTitle} onChange={v=>setLocalHeader({...localHeader, documentTitle:v})}/>
            <Input label="Issue Date" value={localHeader.issueDate} onChange={v=>setLocalHeader({...localHeader, issueDate:v})}/>
            <Input label="Area" value={localHeader.area} onChange={v=>setLocalHeader({...localHeader, area:v})}/>
            <Input label="Controlling Officer" value={localHeader.controllingOfficer} onChange={v=>setLocalHeader({...localHeader, controllingOfficer:v})}/>
          </div>
          <div>
            <Input label="Document No" value={localHeader.documentNo} onChange={v=>setLocalHeader({...localHeader, documentNo:v})}/>
            <Input label="Revision No" value={localHeader.revisionNo} onChange={v=>setLocalHeader({...localHeader, revisionNo:v})}/>
            <Input label="Issued By" value={localHeader.issuedBy} onChange={v=>setLocalHeader({...localHeader, issuedBy:v})}/>
            <Input label="Approved By" value={localHeader.approvedBy} onChange={v=>setLocalHeader({...localHeader, approvedBy:v})}/>
          </div>
        </div>

        <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Input label="Checked By" value={localFooter.checkedBy} onChange={v=>setLocalFooter({...localFooter, checkedBy:v})}/>
          <Input label="Verified By" value={localFooter.verifiedBy} onChange={v=>setLocalFooter({...localFooter, verifiedBy:v})}/>
        </div>

        <div style={{ marginTop:10, display:"flex", gap:8 }}>
          <button onClick={() => { setHeader(localHeader); setFooter(localFooter); }}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #16a34a", background:"#16a34a", color:"#fff", fontWeight:800, cursor:"pointer" }}>
            Save
          </button>
          <button onClick={() => { setLocalHeader(header); setLocalFooter(footer); }}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#111827", fontWeight:800, cursor:"pointer" }}>
            Cancel
          </button>
        </div>

        <div style={{ marginTop:8, fontSize:12, color:"#666" }}>
          * القيم لا تُحفظ أثناء الكتابة. يتم الحفظ فقط عند الضغط على Save.
        </div>
      </details>
    </div>
  );
}

/* =========================
   هيكل جدول النظافة اليومية المثبّت (حسب النموذج)
========================= */
const CLEANING_SECTIONS = [
  { header: "Hand Washing Area", items: ["Tissue available", "Hair Net available", "Face Masks available"] },
  { header: "Chiller Room 1",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 2",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 3",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 4",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 5",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 6",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 7",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Chiller Room 8",     items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { header: "Loading Area",       items: ["Walls/Floors", "Trolleys"] },
  { header: "Waste Disposal",     items: ["Collection of waste", "Disposal"] },
  { header: "Working Conditions & Cleanliness",
    items: ["Lights","Fly Catchers","Floor/wall","Painting and Plastering","Weighing Balance","Tap Water"] },
];

// جد مطابقة بين صف محفوظ وقيمة الجدول الثابت
function findCleanRow(rows, sectionHeader, itemName) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const norm = s => String(s || "").trim().toLowerCase();
  const h = norm(sectionHeader);
  const i = norm(itemName);
  // نحاول مطابقة بالإنكليزي أولاً ثم العربي إن وجد
  return rows.find(r =>
    (norm(r.groupEn) === h || norm(r.groupAr) === h) &&
    (norm(r.itemEn)  === i || norm(r.itemAr)  === i)
  ) || null;
}

/* =========================
   الصفحة الرئيسية
========================= */
export default function QCSDailyView() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("coolers");
  const [lang, setLang] = useState("both"); // واجهة فقط
  const fileInputRef = useRef(null);

  // ترويسات تبويبَي النظافة
  const [phHeader, setPhHeader] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooter, setPhFooter] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);

  const [ccHeader, setCcHeader] = useLocalJSON("qcs_cc_header_v1", defaultCCHeader);
  const [ccFooter, setCcFooter] = useLocalJSON("qcs_cc_footer_v1", defaultCCFooter);

  useEffect(() => {
    const unified = loadUnifiedReports();
    setReports(unified);
    if (unified.length > 0) setSelectedDate(unified[0].date);
  }, []);

  const selectedReport = useMemo(() => reports.find(r => r.date === selectedDate) || null, [reports, selectedDate]);

  // حذف نهائي من المصدرين
  const handleDeleteReport = (dateToDelete) => {
    if (window.confirm(lang === "en"
      ? `Are you sure you want to delete report dated ${dateToDelete}?`
      : `هل أنت متأكد من حذف التقرير الخاص بتاريخ ${dateToDelete}؟`)) {

      const filtered = reports.filter(r => r.date !== dateToDelete);
      setReports(filtered);
      localStorage.setItem("qcs_reports", JSON.stringify(filtered));

      try {
        const dictRaw = localStorage.getItem("qcs_daily_reports_v1");
        if (dictRaw) {
          const dict = JSON.parse(dictRaw) || {};
          delete dict[dateToDelete];
          localStorage.setItem("qcs_daily_reports_v1", JSON.stringify(dict));
        }
      } catch {}

      if (selectedDate === dateToDelete) setSelectedDate(filtered.length > 0 ? filtered[0].date : null);
    }
  };

  // تصدير/استيراد JSON فقط
  const exportAll = () => downloadBlob(JSON.stringify(reports, null, 2), "application/json", "qcs_reports_backup_all.json");
  const exportCurrent = () =>
    selectedReport && downloadBlob(JSON.stringify(selectedReport, null, 2), "application/json", `qcs_report_${selectedReport.date}.json`);

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        const asArray = Array.isArray(imported) ? imported : imported?.date ? [imported] : [];
        if (!asArray.length) {
          alert(lang === "en" ? "Invalid file: must be one report object or an array of reports." : "ملف غير صالح: يجب أن يكون تقريرًا واحدًا أو مصفوفة تقارير."); return;
        }
        const map = new Map(reports.map(r => [r.date, r]));
        asArray.forEach(r => r?.date && map.set(r.date, r));
        const merged = Array.from(map.values()).sort((a,b)=> (a.date < b.date ? 1 : -1));

        // خزّن المصفوفة
        setReports(merged);
        localStorage.setItem("qcs_reports", JSON.stringify(merged));

        // خزّن القاموس المتزامن
        try {
          const dict = JSON.parse(localStorage.getItem("qcs_daily_reports_v1") || "{}");
          asArray.forEach(r => { if (r?.date) { const { date, ...rest } = r; dict[date] = rest; }});
          localStorage.setItem("qcs_daily_reports_v1", JSON.stringify(dict));
        } catch {}

        alert(lang === "en" ? "Imported and merged successfully." : "تم الاستيراد والدمج بنجاح.");
      } catch {
        alert(lang === "en" ? "Failed to read or invalid format." : "فشل في قراءة الملف أو تنسيقه غير صالح.");
      }
    };
    reader.readAsText(file); e.target.value = "";
  };

  // 🖨️ طباعة مع سكيل ديناميكي
  const handlePrint = () => {
    setAutoPrintScale();
    setTimeout(() => window.print(), 30);
  };

  // before/after print للتنظيف
  useEffect(() => {
    const before = () => setAutoPrintScale();
    const after  = () => {
      const el = document.querySelector('.print-area.one-page') || document.querySelector('.print-area');
      if (el) el.style.removeProperty('--print-scale');
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  if (!selectedReport) {
    return (
      <div style={{ padding: "1rem", fontFamily: "Cairo, sans-serif", direction: lang === "en" ? "ltr" : "rtl" }}>
        <style>{printCss}</style>
        <header className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3><LangText lang={lang} {...I18N.noReportsHeader} /></h3>
          <LangSwitch lang={lang} setLang={setLang} />
        </header>
        <div className="print-area one-page">
          <p><LangText lang={lang} {...I18N.noReportsText} /></p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={btnStyleSuccess} className="no-print">
          <LangText lang={lang} {...I18N.importBtn} inline />
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: "none" }} />
      </div>
    );
  }

  const coolers = Array.isArray(selectedReport.coolers) ? selectedReport.coolers : [];
  const personalHygiene = Array.isArray(selectedReport.personalHygiene) ? selectedReport.personalHygiene : [];
  const cleanlinessRows = Array.isArray(selectedReport.cleanlinessRows) ? selectedReport.cleanlinessRows : [];
  const vehicleReport = Array.isArray(selectedReport.vehicleReport) ? selectedReport.vehicleReport : [];

  // حد أدنى لطباعة النظافة الشخصية
  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);
  const phDataForPrint = Array.from({ length: phRowsCount }).map((_, i) => personalHygiene[i] || {});

  return (
    <div style={{
      display: "flex",
      gap: "1rem",
      fontFamily: "Cairo, sans-serif",
      padding: "1rem",
      direction: lang === "en" ? "ltr" : "rtl"
    }}>
      <style>{printCss}</style>

      {/* الشريط الجانبي */}
      <aside className="no-print" style={{ flex: "0 0 290px", borderRight: "1px solid #e5e7eb", paddingRight: "1rem" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}><LangText lang={lang} {...I18N.reportsTitle} /></h3>
          <LangSwitch small lang={lang} setLang={setLang} />
        </header>

        {/* اختيار التاريخ */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
            <LangText lang={lang} {...I18N.selectedDate} />
          </label>
          <select
            value={selectedDate ?? ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", outline: "none" }}
          >
            {reports.map((r) => (
              <option key={r.date} value={r.date}>{r.date}</option>
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
                onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.date); }}
                style={{ backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", marginLeft: "6px" }}
                title={lang === "en" ? "Delete report" : "حذف التقرير"}
              >
                <LangText lang={lang} {...I18N.delete} inline />
              </button>
            </li>
          ))}
        </ul>

        {/* أزرار الاستيراد/تصدير JSON فقط */}
        <div style={{ marginTop: "1.2rem", display: "grid", gap: 8 }}>
          <button onClick={exportCurrent} style={btnStylePrimary} title="Export current report as JSON">
            <LangText lang={lang} {...I18N.exportCurrent} inline />
          </button>
          <button onClick={exportAll} style={btnStyleSecondary} title="Export all reports as JSON">
            <LangText lang={lang} {...I18N.exportAll} inline />
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyleSuccess }}>
            <LangText lang={lang} {...I18N.importBtn} inline />
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: "none" }} />
        </div>
      </aside>

      {/* المحتوى */}
      <main style={{ flex: 1, minWidth: 320, maxHeight: "calc(100vh - 3rem)", overflowY: "auto", paddingRight: "1rem" }}>
        {/* التبويبات */}
        <nav className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "0.6rem", position: "sticky", top: 0, background: "#fff", paddingTop: 6, paddingBottom: 6, zIndex: 5 }}>
          {[
            { id: "coolers", label: I18N.tabs.coolers },
            { id: "personalHygiene", label: I18N.tabs.personalHygiene },
            { id: "dailyCleanliness", label: I18N.tabs.dailyCleanliness },
            { id: "vehicleReport", label: I18N.tabs.vehicleReport },
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
                fontSize: "1.02em"
              }}
            >
              <LangText lang={lang} {...label} />
            </button>
          ))}
        </nav>

        {/* زر الطباعة فقط */}
        <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "flex-end", margin: "0 0 8px 0" }}>
          <button onClick={handlePrint} style={btnStyleOutline}>
            <LangText lang={lang} {...I18N.tabActions.print} inline />
          </button>
        </div>

        {/* محررات التواقيع/الترويسات */}
        {activeTab === "personalHygiene" && (
          <PHHeaderEditor header={phHeader} setHeader={setPhHeader} footer={phFooter} setFooter={setPhFooter} />
        )}
        {activeTab === "dailyCleanliness" && (
          <CCHeaderEditor header={ccHeader} setHeader={setCcHeader} footer={ccFooter} setFooter={setCcFooter} />
        )}

        {/* ===== منطقة الطباعة ===== */}
        <div className="print-area one-page">
          {/* البرادات */}
          {activeTab === "coolers" && (
            <>
              <h4 style={{ color: "#2980b9", margin: "0 0 10px 0" }}>
                <LangText lang={lang} {...I18N.sections.coolers} />
                {" "}- <small>{selectedDate}</small>
              </h4>
              <CoolersKPI coolers={coolers} lang={lang} />
              {coolers.length > 0 ? (
                coolers.map((cooler, i) => (
                  <div key={i} style={{ marginBottom: "1.2rem", background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa", padding: "1.1rem 0.7rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 0 6px #d6eaf8aa" }}>
                    <strong style={{ minWidth: "80px", color: "#34495e", fontWeight: "bold" }}>
                      <bdi>{lang === "en" ? "Cooler" : "براد"} {i + 1}:</bdi>
                    </strong>
                    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                      {COOLER_TIMES.map((time) => (
                        <div key={time} style={{ minWidth: "62px", padding: "7px 7px", borderRadius: "8px", textAlign: "center", fontWeight: "600", fontSize: ".99em", boxShadow: "0 0 4px #d6eaf8", ...getTempCellStyle(cooler?.temps?.[time]) }} title={`${time} — ${cooler?.temps?.[time] ?? "-"}°C`}>
                          <div style={{ fontSize: "0.85rem", marginBottom: "2px", color: "#512e5f", fontWeight: 600 }}>{time}</div>
                          <div>{(cooler?.temps?.[time] ?? "") !== "" ? `${cooler?.temps?.[time]}°C` : "-"}</div>
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
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "#d9d9d9" }}>
                    {PH_COLUMNS.map((c, idx) => (
                      <th key={idx} style={{ border: "1px solid #000", padding: "6px 4px", fontWeight: 800 }}>
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
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.notWearingJewelries || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.wearingCleanCloth || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.communicableDisease || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.openWounds || ""}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px" }}>{emp?.remarks || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PHPrintFooter footer={phFooter} />
            </>
          )}

          {/* النظافة اليومية — النموذج النهائي مع C/NC */}
          {activeTab === "dailyCleanliness" && (
            <>
              <CCPrintHeader header={ccHeader} selectedDate={selectedDate} />

              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background:"#d9d9d9" }}>
                    <th style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>SI-No</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px" }}>General Cleaning</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>C / NC</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>Time</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px" }}>Observation</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px" }}>Informed to</th>
                    <th style={{ border:"1px solid #000", padding:"6px 4px" }}>Remarks & CA</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [];
                    let si = 1;
                    CLEANING_SECTIONS.forEach((sec, sIdx) => {
                      // صف عنوان القسم
                      rows.push(
                        <tr key={`sec-${sIdx}`} style={{ background:"#f2f2f2", fontWeight:800 }}>
                          <td style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}></td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{sec.header}</td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}></td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}></td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}></td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}></td>
                          <td style={{ border:"1px solid #000", padding:"6px 4px" }}></td>
                        </tr>
                      );
                      // عناصر القسم
                      sec.items.forEach((item, iIdx) => {
                        const found = findCleanRow(cleanlinessRows, sec.header, item) || {};
                        rows.push(
                          <tr key={`row-${sIdx}-${iIdx}`}>
                            <td style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>{si++}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{item}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>{found.result || ""}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px", textAlign:"center" }}>{selectedReport?.auditTime || ""}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{found.observation || ""}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{found.informed || ""}</td>
                            <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{found.remarks || ""}</td>
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

          {/* تقارير السيارات */}
          {activeTab === "vehicleReport" && (
            <>
              <h4>
                <LangText lang={lang} {...I18N.sections.vehicleReport} />
                {" "}- <small>{selectedDate}</small>
              </h4>
              {vehicleReport.length > 0 ? (
                vehicleReport.map((vehicle, i) => (
                  <div key={i} style={{ marginBottom: "1rem", background: "#fef9e7", padding: "1rem", borderRadius: "8px", border: "1px solid #fdebd0" }}>
                    <p><LangText lang={lang} {...I18N.vehicle.loadStart} inline />: {vehicle?.startTime || "-"}</p>
                    <p><LangText lang={lang} {...I18N.vehicle.loadEnd} inline />: {vehicle?.endTime || "-"}</p>
                    <p><LangText lang={lang} {...I18N.vehicle.temp} inline />: {vehicle?.temperature ?? "-"}°</p>
                    <p>
                      <LangText lang={lang} {...I18N.vehicle.clean} inline />:{" "}
                      {vehicle?.cleanliness
                        ? <LangText lang={lang} {...I18N.vehicle.cleanYes} inline />
                        : <LangText lang={lang} {...I18N.vehicle.cleanNo} inline />}
                    </p>
                    <p><LangText lang={lang} {...I18N.vehicle.plate} inline />: {vehicle?.plateNumber || "-"}</p>
                    <p><LangText lang={lang} {...I18N.vehicle.driver} inline />: {vehicle?.driverName || "-"}</p>
                  </div>
                ))
              ) : (
                <p>لا توجد بيانات للسيارات</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================
   مبدّل اللغة UI (واجهة فقط)
========================= */
function LangSwitch({ lang, setLang, small=false }) {
  const base = {
    padding: small ? "4px 8px" : "6px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };
  const active = { ...base, background: "#111827", color: "#fff", borderColor: "#111827" };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => setLang("ar")} style={lang === "ar" ? active : base}>AR</button>
      <button onClick={() => setLang("en")} style={lang === "en" ? active : base}>EN</button>
      <button onClick={() => setLang("both")} style={lang === "both" ? active : base}>BOTH</button>
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
const btnStyleSuccess = { ...btnBase, background: "#059669", color: "#fff" };
const btnStyleOutline = { ...btnBase, background: "#fff", color: "#111827", border: "1px solid #e5e7eb" };
