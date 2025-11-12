// src/pages/monitor/branches/qcs/NonConformanceReportInput.jsx
import React, { useMemo, useState } from "react";

/* =========================
   API base (CRA + Vite safe)
========================= */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try { VITE_URL = import.meta.env?.VITE_API_URL; } catch {}

const API_BASE = (VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ---- Fallbacks ---- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
const TYPE = "qcs_non_conformance";

/* ---- Small UI helpers (نفس PH) ---- */
function RowKV({ label, value }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>
        {label}
      </div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}

/* ======= Header (مطابق لترويسة PH) ======= */
function NCEntryHeader({ header, date, logoUrl }) {
  const h = header;
  return (
    <div style={{ border:"1px solid #000", marginBottom:8 }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={logoUrl || LOGO_FALLBACK} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
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

      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          NON-CONFORMANCE REPORT
        </div>
        {date ? (
          <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
            <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
            <span>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---- أنماط عامة ---- */
const sheet = {
  width: "210mm",
  minHeight: "297mm",
  margin: "0 auto",
  background: "#fff",
  color: "#000",
  border: "1px solid #d1d5db",
  boxShadow: "0 4px 14px rgba(0,0,0,.08)",
  fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif",
  fontSize: 12,
  padding: "8mm",
};
const table = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
const cell = { border: "1px solid #000", padding: "6px 8px", verticalAlign: "middle" };
const inputInline = { width: "100%", border: "none", outline: "none", padding: 0, margin: 0, fontSize: 12, background: "transparent" };
const area = { width: "100%", border: "none", outline: "none", minHeight: "38mm", resize: "vertical", padding: "6px 8px", fontSize: 12, boxSizing: "border-box" };
const smallArea = { ...area, minHeight: "28mm" };
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 800, cursor: "pointer" });

/* =========================
   Server helpers (NC only)
========================= */
async function listReportsByType(type) {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
    { method: "GET", cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function fetchExistingNCByDate(dateStr) {
  const rows = await listReportsByType(TYPE);
  const found = rows.find(r => String(r?.payload?.headRow?.reportDate || r?.payload?.reportDate || "") === String(dateStr));
  return found ? { id: found._id || found.id, payload: found.payload || {} } : null;
}

/* =========================
   Component
========================= */
export default function NonConformanceReportInput(props) {
  const { logoUrl } = props || {};

  /* قيمك الأصلية كما هي */
  const [header, setHeader] = useState({
    documentTitle: "NC Report",
    documentNo: "TELL/QA/NC/1",
    issueDate: "30/09/2023",
    revisionNo: "0",
    area: "QA",
    issuedBy: "Suresh Sekar",
    controllingOfficer: "QC",
    approvedBy: "Hussam",
  });

  /* تاريخ للحفظ على السيرفر: ISO yyyy-mm-dd */
  const [dateISO, setDateISO] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });

  /* الموقع قابل للتعديل وفارغ افتراضيًا */
  const [location, setLocation] = useState("");

  /* الحقول الأساسية */
  const [ncNo, setNcNo] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  /* المرجع */
  const [refInhouse, setRefInhouse] = useState(false);
  const [refCustComplaint, setRefCustComplaint] = useState(false);
  const [refInternalAudit, setRefInternalAudit] = useState(false);
  const [refExternalAudit, setRefExternalAudit] = useState(false);

  /* تفاصيل */
  const [details, setDetails] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [department, setDepartment] = useState("");

  /* التحقق من الإجراء */
  const [verification, setVerification] = useState("Satisfactory");

  /* التواقيع */
  const [signature, setSignature] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsibleSignature, setResponsibleSignature] = useState("");

  const [opMsg, setOpMsg] = useState("");

  const monthText = useMemo(() => {
    const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [dateISO]);

  /* ===== Save to server by date (no local save) ===== */
  async function saveNCToServer() {
    if (!dateISO) return alert("اختر التاريخ.");
    if (!details.trim()) return alert("اكتب تفاصيل عدم المطابقة.");

    const payload = {
      headerTop: header,
      title: "TRANS EMIRATES LIVESTOCK LLC • NON-CONFORMANCE REPORT",
      location,                           // يحفظ ما تكتبه هنا
      headRow: {
        reportDate: dateISO,              // مفتاح المطابقة
        ncNo,
        issuedTo,
        issuedBy,
      },
      reference: {
        inhouseQC: refInhouse,
        customerComplaint: refCustComplaint,
        internalAudit: refInternalAudit,
        externalAudit: refExternalAudit,
      },
      detailsBlock: details,
      rootCause,
      correctiveAction,
      performedBy,
      department,
      verificationOfCorrectiveAction: verification,
      signature: {
        signature,
        date: signatureDate,
        responsiblePerson,
        responsibleSignature,
      },
      month: monthText,
      savedAt: Date.now(),
    };

    try {
      setOpMsg("Saving…");
      const existing = await fetchExistingNCByDate(dateISO);

      const body = { reporter: "qcs", type: TYPE, payload };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update NC report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create NC report");
      }

      setOpMsg(`Saved for ${dateISO}.`);
    } catch (e) {
      console.error(e);
      setOpMsg(`Failed: ${e.message || e}`);
    } finally {
      setTimeout(() => setOpMsg(""), 3500);
    }
  }

  return (
    <div style={{ padding: 8 }}>
      {/* شريط علوي مع تاريخ مخصّص للحفظ */}
      <div style={{
        background:"#fff", padding:"12px 14px", marginBottom:12, borderRadius:12,
        boxShadow:"0 0 8px rgba(0,0,0,.10)", display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:12
      }}>
        <h3 style={{ margin:0 }}>🚫 Non-Conformance Report</h3>
        <label style={{ fontWeight:700 }}>
          Date:{" "}
          <input
            type="date"
            value={dateISO}
            onChange={(e)=>setDateISO(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #cbd5e1" }}
          />
        </label>
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8 }}>
          <button style={btn("#2563eb")} onClick={saveNCToServer}>Save</button>
        </div>
        {opMsg && <div style={{ fontWeight:800 }}>{opMsg}</div>}
      </div>

      <div style={sheet}>
        {/* ترويسة مطابقة لملف PH */}
        <NCEntryHeader header={header} date={dateISO} logoUrl={props?.logoUrl} />

        {/* Location editable and empty by default */}
        <table style={table}>
          <tbody>
            <tr>
              <td style={{ ...cell, width:"22mm" }}><b>Location:</b></td>
              <td style={cell}>
                <input
                  style={inputInline}
                  value={location}
                  onChange={(e)=>setLocation(e.target.value)}
                  placeholder=""
                />
              </td>
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
              <td style={cell}><b>Date:</b></td>
              <td style={cell}><input style={inputInline} value={dateISO} readOnly /></td>
              <td style={cell}><b>NC No.:</b></td>
              <td style={cell}><input style={inputInline} value={ncNo} onChange={(e)=>setNcNo(e.target.value)} /></td>
            </tr>
            <tr>
              <td style={cell}><b>Issued to:</b></td>
              <td style={cell}><input style={inputInline} value={issuedTo} onChange={(e)=>setIssuedTo(e.target.value)} /></td>
              <td style={cell}><b>Issued by:</b></td>
              <td style={cell}><input style={inputInline} value={issuedBy} onChange={(e)=>setIssuedBy(e.target.value)} /></td>
            </tr>
          </tbody>
        </table>

        {/* Reference */}
        <table style={{ ...table, marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: "22mm" }}><b>Reference</b></td>
              <td style={cell}>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={refInhouse} onChange={(e)=>setRefInhouse(e.target.checked)} /> In-house QC
                </label>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={refCustComplaint} onChange={(e)=>setRefCustComplaint(e.target.checked)} /> Customer Complaint
                </label>
                <label style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={refInternalAudit} onChange={(e)=>setRefInternalAudit(e.target.checked)} /> Internal Audit
                </label>
                <label>
                  <input type="checkbox" checked={refExternalAudit} onChange={(e)=>setRefExternalAudit(e.target.checked)} /> External Audit
                </label>
              </td>
            </tr>
          </tbody>
        </table>

        {/* تفاصيل */}
        <table style={{ ...table, marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: "60mm" }}><b>Nonconformance/Report Details</b></td>
              <td style={{ ...cell, padding: 0 }}>
                <textarea style={area} value={details} onChange={(e)=>setDetails(e.target.value)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Root Cause */}
        <table style={{ ...table, marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: "60mm" }}><b>Root Cause(s) of Nonconformance</b></td>
              <td style={{ ...cell, padding: 0 }}>
                <textarea style={smallArea} value={rootCause} onChange={(e)=>setRootCause(e.target.value)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Corrective Action */}
        <table style={{ ...table, marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: "60mm" }}><b>Corrective Action</b></td>
              <td style={{ ...cell, padding: 0 }}>
                <textarea style={smallArea} value={correctiveAction} onChange={(e)=>setCorrectiveAction(e.target.value)} />
              </td>
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
              <td style={cell}><b>Performed by:</b></td>
              <td style={cell}><input style={inputInline} value={performedBy} onChange={(e)=>setPerformedBy(e.target.value)} /></td>
              <td style={cell}><b>Department:</b></td>
              <td style={cell}><input style={inputInline} value={department} onChange={(e)=>setDepartment(e.target.value)} /></td>
            </tr>
          </tbody>
        </table>

        {/* Verification */}
        <table style={{ ...table, marginTop: 6 }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: "60mm" }}><b>Verification of Corrective Action:</b></td>
              <td style={cell}>
                <label style={{ marginRight: 16 }}>
                  <input type="radio" name="veri" checked={verification === "Satisfactory"} onChange={() => setVerification("Satisfactory")} /> Satisfactory
                </label>
                <label>
                  <input type="radio" name="veri" checked={verification === "Not Satisfactory"} onChange={() => setVerification("Not Satisfactory")} /> Not Satisfactory
                </label>
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
              <td style={cell}><b>Signature:</b></td>
              <td style={cell}><input style={inputInline} value={signature} onChange={(e)=>setSignature(e.target.value)} /></td>
              <td style={cell}><b>Date:</b></td>
              <td style={cell}><input style={inputInline} value={signatureDate} onChange={(e)=>setSignatureDate(e.target.value)} placeholder="dd/mm/yyyy" /></td>
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
              <td style={cell}><b>Responsible Person:</b></td>
              <td style={cell}><input style={inputInline} value={responsiblePerson} onChange={(e)=>setResponsiblePerson(e.target.value)} /></td>
              <td style={cell}><b>Signature:</b></td>
              <td style={cell}><input style={inputInline} value={responsibleSignature} onChange={(e)=>setResponsibleSignature(e.target.value)} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
