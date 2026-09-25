// src/pages/monitor/branches/sweets/VisitorChecklistInput.jsx
import React, { useMemo, useState } from "react";
import { getActiveCompanyName } from "../../../../utils/companyContext";
import API_BASE from "../../../../config/api";
import { getLatestReport } from "../_shared/reportApi";
import { Bi } from "./bilingual";

/* ===== API base ===== */


/* ===== Constants ===== */
const TYPE = "sweets_visitor_checklist";

const DOC_META = {
  docTitle: "Visitor Checklist",
  docNo: "SW-QA-VC-01",
  revision: "0",
  issueDate: "",
  area: "",
  issuedBy: "",
  approvedBy: "",
  controllingOfficer: "",
};

const Q1_ITEMS = [
  { code: "i",   text: "Diarrhoea, Vomiting, food poisoning or any stomach or bowel disorders", ar: "إسهال، تقيؤ، تسمم غذائي أو أي اضطراب في المعدة أو الأمعاء" },
  { code: "ii",  text: "Fever, pneumonia, sore throat or very bad cold / flu", ar: "حمى، التهاب رئوي، التهاب حلق أو زكام / إنفلونزا شديدة" },
  { code: "iii", text: "Hepatitis / Jaundice", ar: "التهاب الكبد / اليرقان" },
  { code: "iv",  text: "Typhoid / Paratyphoid fever", ar: "حمى التيفوئيد / نظيرة التيفوئيد" },
];

const Q_ADDITIONAL = [
  { code: "Q2", text: "Have you any naked cut, wound, burn or abrasions?", ar: "هل لديك جرح مكشوف أو حرق أو خدش؟" },
  { code: "Q3", text: "Are you suffering from any skin disease (boils / lesion / rash / eczema) etc?", ar: "هل تعاني من مرض جلدي (دمامل / تقرحات / طفح / إكزيما) وغيرها؟" },
];

const DECLARATION_AR =
  "سألتزم / سنلتزم بإجراءات سلامة الغذاء في الشركة، وارتداء الكمامة وغطاء الشعر والمعطف وأغطية الأحذية، وخلع كل المقتنيات الشخصية (المجوهرات) التي قد تلامس الغذاء أو الآلات.";
const DECLARATION_TEXT =
  "I/We will follow the food safety procedures of the company & will use the mask/hair net/coat/shoe covers and remove all loose personal articles (Jewelry) that might come into contact with food/machines.";

/* ===== UI helpers ===== */
const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  border: "1px solid #cbd5e1",
  background: "#f1f5f9",
  padding: "8px",
  textAlign: "left",
  fontWeight: 800,
};
const td = {
  border: "1px solid #cbd5e1",
  padding: "6px 8px",
  verticalAlign: "top",
};
const input = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  boxSizing: "border-box",
  background: "#fff",
  fontSize: 14,
};
const textarea = { ...input, minHeight: 90, resize: "vertical" };
const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  marginBottom: 6,
};
const sectionTitle = {
  fontWeight: 900,
  background: "#e5e7eb",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  marginBottom: 10,
  marginTop: 16,
  color: "#0f172a",
};

const ynBtn = (active, kind) => {
  const palette = kind === "yes"
    ? { bg: "#16a34a", border: "#15803d" }
    : { bg: "#dc2626", border: "#b91c1c" };
  return {
    padding: "8px 18px",
    minWidth: 70,
    borderRadius: 999,
    border: `2px solid ${active ? palette.border : "#cbd5e1"}`,
    background: active ? palette.bg : "#fff",
    color: active ? "#fff" : "#334155",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? "0 4px 10px rgba(0,0,0,.12)" : "none",
    transition: "all .15s ease",
  };
};

const decisionBtn = (active, kind) => {
  const palette = kind === "allowed"
    ? { bg: "#16a34a", border: "#15803d" }
    : { bg: "#dc2626", border: "#b91c1c" };
  return {
    padding: "10px 24px",
    borderRadius: 12,
    border: `2px solid ${active ? palette.border : "#cbd5e1"}`,
    background: active ? palette.bg : "#fff",
    color: active ? "#fff" : "#334155",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: active ? "0 6px 14px rgba(0,0,0,.15)" : "none",
    transition: "all .15s ease",
  };
};

const submitBtn = (disabled) => ({
  width: "100%",
  background: disabled ? "#94a3b8" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 16,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: "0 6px 16px rgba(37,99,235,.25)",
  marginTop: 16,
});

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button type="button" style={ynBtn(value === "Yes", "yes")} onClick={() => onChange("Yes")}><Bi en="Yes" /></button>
      <button type="button" style={ynBtn(value === "No", "no")} onClick={() => onChange("No")}><Bi en="No" /></button>
    </div>
  );
}

/* ===== Component ===== */
export default function VisitorChecklistInput() {
  const initialAnswers = useMemo(() => {
    const obj = {};
    [...Q1_ITEMS, ...Q_ADDITIONAL].forEach((it) => { obj[it.code] = ""; });
    return obj;
  }, []);

  const [meta, setMeta] = useState({
    visitorName: "",
    visitDate: "",
    companyName: "",
    mobileNumber: "",
    purposeOfVisit: "",
  });
  const [answers, setAnswers] = useState(initialAnswers);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [visitorSignature, setVisitorSignature] = useState("");
  const [managementRemarks, setManagementRemarks] = useState("");
  const [decision, setDecision] = useState("");
  const [managerSignature, setManagerSignature] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [msg, setMsg] = useState("");

  /* Repeat-visit shortcut. Only the details that genuinely recur for a
     returning contractor are brought back — company, purpose, and the manager
     signing off. The visitor's own name, the date, the health declaration and
     the entry decision are always answered fresh: they are the record. */
  async function loadFromLast() {
    try {
      setLoadingLast(true);
      setMsg("Loading the last visitor record… · جارٍ تحميل آخر سجل زائر…");
      const hit = await getLatestReport(TYPE);
      if (!hit) {
        setMsg("ℹ️ No previous visitor record found. · لا يوجد سجل زائر سابق.");
        return;
      }
      const p = hit.payload || {};
      setMeta((prev) => ({
        ...prev,
        companyName: String(p?.visitor?.companyName || ""),
        purposeOfVisit: String(p?.visitor?.purposeOfVisit || ""),
      }));
      setManagerSignature(String(p?.signatures?.managerSignature || ""));
      setMsg("✅ Company, purpose and manager filled in — enter the visitor's own details. · تمت تعبئة الشركة والغرض والمدير — أدخل بيانات الزائر.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Could not load the last record · تعذّر تحميل آخر سجل");
    } finally {
      setLoadingLast(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  function setMetaVal(k, v) { setMeta((p) => ({ ...p, [k]: v })); }
  function setAnswer(code, v) { setAnswers((p) => ({ ...p, [code]: v })); }

  function resetForm() {
    setMeta({ visitorName: "", visitDate: "", companyName: "", mobileNumber: "", purposeOfVisit: "" });
    setAnswers(initialAnswers);
    setDeclarationAccepted(false);
    setVisitorSignature("");
    setManagementRemarks("");
    setDecision("");
    setManagerSignature("");
  }

  async function handleSave() {
    if (!meta.visitorName.trim()) return alert("Please enter the visitor name. · أدخل اسم الزائر.");
    if (!meta.visitDate)            return alert("Please pick the visit date. · اختر تاريخ الزيارة.");
    if (!decision)                  return alert("Please choose Allowed / Not Allowed. · اختر مسموح / غير مسموح.");

    const payload = {
      headerTop: {
        documentTitle: DOC_META.docTitle,
        documentNo:    DOC_META.docNo,
        revisionNo:    DOC_META.revision,
        issueDate:     DOC_META.issueDate,
        area:          DOC_META.area,
        issuedBy:      DOC_META.issuedBy,
        approvedBy:    DOC_META.approvedBy,
        controllingOfficer: DOC_META.controllingOfficer,
      },
      visitor: {
        visitorName:   meta.visitorName.trim(),
        visitDate:     meta.visitDate,
        companyName:   meta.companyName.trim(),
        mobileNumber:  meta.mobileNumber.trim(),
        purposeOfVisit: meta.purposeOfVisit.trim(),
      },
      healthQuestions: {
        q1: Q1_ITEMS.map((it) => ({ code: it.code, text: it.text, answer: answers[it.code] || "" })),
        additional: Q_ADDITIONAL.map((it) => ({ code: it.code, text: it.text, answer: answers[it.code] || "" })),
      },
      declaration: {
        text: DECLARATION_TEXT,
        accepted: !!declarationAccepted,
      },
      signatures: {
        visitorSignature: visitorSignature.trim(),
        managerSignature: managerSignature.trim(),
      },
      management: {
        remarks: managementRemarks.trim(),
        decision, // "Allowed" | "Not Allowed"
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setMsg("Saving… · جارٍ الحفظ…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ Saved successfully · تم الحفظ بنجاح");
      resetForm();
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save · فشل الحفظ");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <div style={card}>
      {/* ===== Header band ===== */}
      <div
        style={{
          background: "linear-gradient(135deg,#0f3d2e,#0b5236)",
          color: "#fff",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: ".5px" }}>
             <span style={{ opacity: 0.85, fontWeight: 700 }}>{getActiveCompanyName()}</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{DOC_META.docTitle}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: 0.95, lineHeight: 1.7 }}>
          <div><Bi en="Doc No:" ar="رقم الوثيقة:" /> <b>{DOC_META.docNo}</b></div>
          <div><Bi en="Rev:" ar="المراجعة:" /> <b>{DOC_META.revision}</b></div>
          <div><Bi en="Area:" /> <b>{DOC_META.area}</b></div>
        </div>
      </div>

      {/* ===== Issued/Approved row ===== */}
      <table style={{ ...table, marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 180 }}><Bi en="Issued by" ar="أصدر بواسطة" /></td>
            <td style={td}>{DOC_META.issuedBy}</td>
            <td style={{ ...th, width: 180 }}><Bi en="Approved by" ar="اعتمد بواسطة" /></td>
            <td style={td}>{DOC_META.approvedBy}</td>
          </tr>
          <tr>
            <td style={th}><Bi en="Controlling Officer" /></td>
            <td style={td}>{DOC_META.controllingOfficer}</td>
            <td style={th}><Bi en="Document" ar="الوثيقة" /></td>
            <td style={td}>{DOC_META.docTitle}</td>
          </tr>
        </tbody>
      </table>

      {/* ===== Title ===== */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
          
        </div>
        <div style={{ fontStyle: "italic", color: "#0b5236", fontWeight: 700, marginTop: 2 }}>
          <Bi en="Visitor Checklist" />
        </div>
      </div>

      {/* ===== Visitor info ===== */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          onClick={loadFromLast}
          disabled={loadingLast}
          title="Fill in company, purpose and manager from the last visitor record · تعبئة الشركة والغرض والمدير من آخر زيارة"
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 800,
            cursor: loadingLast ? "wait" : "pointer",
          }}
        >
          {loadingLast ? <>⏳ <Bi en="Loading…" /></> : <>📋 <Bi en="Repeat visit — load company & purpose" ar="زيارة متكررة — تحميل الشركة والغرض" /></>}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div>
          <span style={label}><Bi en="Visitor Name" ar="اسم الزائر" /></span>
          <input style={input} placeholder="Full name · الاسم الكامل" value={meta.visitorName} onChange={(e) => setMetaVal("visitorName", e.target.value)} />
        </div>
        <div>
          <span style={label}><Bi en="Date" /></span>
          <input style={input} type="date" value={meta.visitDate} onChange={(e) => setMetaVal("visitDate", e.target.value)} />
        </div>
        <div>
          <span style={label}><Bi en="Company Name" ar="اسم الشركة" /></span>
          <input style={input} placeholder="Organization / Company · الجهة / الشركة" value={meta.companyName} onChange={(e) => setMetaVal("companyName", e.target.value)} />
        </div>
        <div>
          <span style={label}><Bi en="Mobile Number" ar="رقم الجوال" /></span>
          <input style={input} placeholder="+971 …" value={meta.mobileNumber} onChange={(e) => setMetaVal("mobileNumber", e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={label}><Bi en="Purpose Of Visit" ar="الغرض من الزيارة" /></span>
        <input style={input} placeholder="Reason for visit · سبب الزيارة" value={meta.purposeOfVisit} onChange={(e) => setMetaVal("purposeOfVisit", e.target.value)} />
      </div>

      {/* ===== Q1 ===== */}
      <div style={sectionTitle}><Bi en="Q.1 — Do you suffer from any of the following now or during the last 2 weeks?" ar="س1 — هل تعاني من أي مما يلي الآن أو خلال الأسبوعين الماضيين؟" /></div>
      <div style={{ display: "grid", gap: 8 }}>
        {Q1_ITEMS.map((it) => (
          <div
            key={it.code}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 14, color: "#0f172a" }}>
              <b style={{ marginRight: 6 }}>{it.code})</b>
              <Bi en={it.text} ar={it.ar} />
            </div>
            <YesNo value={answers[it.code]} onChange={(v) => setAnswer(it.code, v)} />
          </div>
        ))}
      </div>

      {/* ===== Additional ===== */}
      <div style={sectionTitle}><Bi en="Additional Health Questions" ar="أسئلة صحية إضافية" /></div>
      <div style={{ display: "grid", gap: 8 }}>
        {Q_ADDITIONAL.map((it) => (
          <div
            key={it.code}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 14, color: "#0f172a" }}>
              <b style={{ marginRight: 6 }}>{it.code} —</b>
              <Bi en={it.text} ar={it.ar} />
            </div>
            <YesNo value={answers[it.code]} onChange={(v) => setAnswer(it.code, v)} />
          </div>
        ))}
      </div>

      {/* ===== Declaration ===== */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6, color: "#0f172a" }}><Bi en="DECLARATION BY VISITOR/S" ar="إقرار الزائر / الزوار" /></div>
        <div style={{ fontStyle: "italic", color: "#334155", lineHeight: 1.7 }}>{`"${DECLARATION_TEXT}"`}</div>
        <div lang="ar" dir="rtl" style={{ color: "#64748b", lineHeight: 1.7, marginTop: 4 }}>{DECLARATION_AR}</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontWeight: 700, color: "#0f172a" }}>
          <input type="checkbox" checked={declarationAccepted} onChange={(e) => setDeclarationAccepted(e.target.checked)} />
          <Bi en="I/We agree to the declaration above" ar="أوافق / نوافق على الإقرار أعلاه" />
        </label>
      </div>

      {/* ===== Signatures + remarks ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
        <div>
          <span style={label}><Bi en="Visitor's Signature" ar="توقيع الزائر" /></span>
          <input style={input} placeholder="Sign here (type full name) · وقّع هنا (الاسم الكامل)" value={visitorSignature} onChange={(e) => setVisitorSignature(e.target.value)} />
        </div>
        <div>
          <span style={label}><Bi en="Management Remarks" ar="ملاحظات الإدارة" /></span>
          <textarea style={textarea} placeholder="Remarks… · ملاحظات…" value={managementRemarks} onChange={(e) => setManagementRemarks(e.target.value)} />
        </div>
      </div>

      {/* ===== Decision + manager sig ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 12,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <div>
          <span style={label}><Bi en="Management Decision" ar="قرار الإدارة" /></span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={decisionBtn(decision === "Allowed", "allowed")} onClick={() => setDecision("Allowed")}>
              ✓ <Bi en="Allowed" ar="مسموح" />
            </button>
            <button type="button" style={decisionBtn(decision === "Not Allowed", "not")} onClick={() => setDecision("Not Allowed")}>
              ✗ <Bi en="Not Allowed" ar="غير مسموح" />
            </button>
          </div>
        </div>
        <div>
          <span style={label}><Bi en="Manager Signature" ar="توقيع المدير" /></span>
          <input style={input} placeholder="Sign here (type full name) · وقّع هنا (الاسم الكامل)" value={managerSignature} onChange={(e) => setManagerSignature(e.target.value)} />
        </div>
      </div>

      {/* ===== Submit ===== */}
      <button onClick={handleSave} disabled={saving} style={submitBtn(saving)}>
        {saving ? <Bi en="Saving…" /> : <>📝 <Bi en="Submit Visitor Checklist" ar="إرسال قائمة الزائر" /></>}
      </button>
      {msg && (
        <div style={{ textAlign: "center", marginTop: 10, fontWeight: 800, color: msg.startsWith("✅") ? "#16a34a" : msg.startsWith("❌") ? "#dc2626" : "#334155" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
