// src/pages/monitor/branches/qcs/CorrectiveActionReportInput.jsx
import React, { useState, useMemo } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "qcs_corrective_action";
const BRANCH = "QCS";

export default function CorrectiveActionReportInput() {
  const [form, setForm] = useState({
    department: "",
    reportDate: "",          // ✅ تاريخ التقرير (يعتمد عليه الحفظ)
    initiatedBy: "QA",
    originOfNC: "",
    carCompletedDate: "",
    ncDetails: "",
    correctiveAction: "",
    preventiveAction: "",
    signedQA: "",
    dateClosedOut: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const td = useMemo(() => ({
    border: "1px solid #cbd5e1",
    padding: "6px 8px",
    verticalAlign: "middle",
    fontSize: 14,
  }), []);
  const th = { ...td, background:"#f1f5f9", fontWeight:800 };

  const input = {
    width:"100%", boxSizing:"border-box",
    border:"1px solid #cbd5e1", borderRadius:8, padding:"6px 8px",
    background:"#fff"
  };
  const textarea = { ...input, minHeight:120, resize:"vertical" };
  const btn = (bg) => ({
    background:bg, color:"#fff", border:"none", borderRadius:10,
    padding:"10px 14px", fontWeight:800, cursor:"pointer",
    boxShadow:"0 4px 12px rgba(0,0,0,.12)"
  });

  function setVal(k, v){ setForm(p => ({ ...p, [k]: v })); }

  async function handleSave(){
    // تحقق أساسي
    if (!form.reportDate)     return alert("يرجى تعبئة Report Date.");
    if (!form.ncDetails)      return alert("يرجى تعبئة Details of Non-Conformity.");
    if (!form.correctiveAction) return alert("يرجى تعبئة Corrective Action.");

    const payload = {
      branch: BRANCH,
      header: {
        departmentInvolved: form.department,
        // ✅ Date issued يعتمد على Report Date
        dateIssued: form.reportDate,
        initiatedBy: form.initiatedBy || "QA",
        originOfNonConformity: form.originOfNC,
        carCompletedDate: form.carCompletedDate || "",
      },
      body: {
        detailsOfNC: form.ncDetails,
        correctiveAction: form.correctiveAction,
        preventiveAction: form.preventiveAction,
      },
      footer: {
        signedQA: form.signedQA,
        dateClosedOut: form.dateClosedOut || "",
      },
      savedAt: Date.now(),
    };

    try{
      setSaving(true); setMsg("Saving…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ reporter:"qcs", type: TYPE, payload }),
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ Saved successfully");
    }catch(e){
      console.error(e);
      setMsg("❌ Failed to save");
    }finally{
      setSaving(false);
      setTimeout(()=>setMsg(""), 3000);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:900, fontSize:18 }}>Corrective Action Report</div>
        <div style={{ color:"#64748b", fontWeight:700 }}>FS-QM/REP/CCA/2025</div>
      </div>

      {/* Meta table */}
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width:180 }}>Department involved</td>
            <td style={td}>
              <input style={input} value={form.department} onChange={e=>setVal("department", e.target.value)} />
            </td>
            <td style={{ ...th, width:160 }}>Report Date</td>
            <td style={td}>
              <input
                type="date"
                style={input}
                value={form.reportDate}
                onChange={e=>setVal("reportDate", e.target.value)}
                title="This date will be saved as Date issued"
              />
            </td>
          </tr>
          <tr>
            <td style={th}>Initiated by</td>
            <td style={td}>
              <input style={input} value={form.initiatedBy} onChange={e=>setVal("initiatedBy", e.target.value)} />
            </td>
            <td style={th}>Origin of non-conformity</td>
            <td style={td}>
              <input style={input} value={form.originOfNC} onChange={e=>setVal("originOfNC", e.target.value)} />
            </td>
          </tr>
          <tr>
            <td style={th}>CAR Completed date</td>
            <td style={td}>
              <input
                type="date"
                style={input}
                value={form.carCompletedDate}
                onChange={e=>setVal("carCompletedDate", e.target.value)}
              />
            </td>
            <td style={th}></td>
            <td style={td}></td>
          </tr>
        </tbody>
      </table>

      {/* Details of NC */}
      <div style={{ fontWeight:800, background:"#f1f5f9", padding:"6px 8px", border:"1px solid #cbd5e1" }}>
        Details of Non-Conformity
      </div>
      <textarea style={{ ...textarea, borderTop:"none" }}
        placeholder="Describe the non-conformity…"
        value={form.ncDetails} onChange={e=>setVal("ncDetails", e.target.value)}
      />

      {/* Corrective Action */}
      <div style={{ fontWeight:800, background:"#f1f5f9", padding:"6px 8px", border:"1px solid #cbd5e1", marginTop:12 }}>
        Corrective Action
      </div>
      <textarea style={{ ...textarea, borderTop:"none" }}
        placeholder="List corrective actions…"
        value={form.correctiveAction} onChange={e=>setVal("correctiveAction", e.target.value)}
      />

      {/* Action to prevent recurrence */}
      <div style={{ fontWeight:800, background:"#f1f5f9", padding:"6px 8px", border:"1px solid #cbd5e1", marginTop:12 }}>
        Action taken to prevent recurrence
      </div>
      <textarea style={{ ...textarea, borderTop:"none" }}
        placeholder="Describe preventive actions…"
        value={form.preventiveAction} onChange={e=>setVal("preventiveAction", e.target.value)}
      />

      {/* Sign-off */}
      <table style={{ width:"100%", borderCollapse:"collapse", marginTop:12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width:160 }}>Signed QA</td>
            <td style={td}>
              <input style={input} value={form.signedQA} onChange={e=>setVal("signedQA", e.target.value)} />
            </td>
            <td style={{ ...th, width:160 }}>Date Closed out</td>
            <td style={td}>
              <input type="date" style={input} value={form.dateClosedOut} onChange={e=>setVal("dateClosedOut", e.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Actions */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span style={{ alignSelf:"center", fontWeight:800, color:"#334155" }}>{msg}</span>}
      </div>
    </div>
  );
}
