// src/pages/monitor/branches/qcs/RMInspectionReportIngredients.jsx
import React, { useMemo, useState } from "react";

/* ====== API & هوية التقرير ====== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs_rm_ingredients";
const BRANCH_ID = "QCS";
const FILE_ID   = "RMInspectionReportIngredients";

export default function RMInspectionReportIngredients() {
  /* ====== ترويسة (عرض فقط) ====== */
  const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
  const DOC = {
    title: "RM INSPECTION REPORT [INGREDIANTS MATERIAL]",
    no: "FF-QM/RMR/ING",
    issueDate: "05/02/2020",
    revNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy: "Hussam O. Sarhan",
    company: "TRANS EMIRATES LIVESTOCK TRADING LLC",
    reportTitle: "RAW MATERIAL INSPECTION REPORT-TRANS EMIRATES LIVESTOCK [INGREDIANTS]",
    logoSrc: LOGO_FALLBACK,
  };

  const COLORS = {
    ink: "#111827", sub: "#374151", bg: "#f8fafc", white: "#ffffff",
    line: "#111827", lightLine: "#cbd5e1", thBg: "#f3f4f6", headBg: "#ffffff",
    ok: "#16a34a", err: "#dc2626", primary: "#0b132b"
  };

  const page = {
    padding: "1rem", background: COLORS.bg, color: COLORS.ink, direction: "ltr",
    fontFamily: "Cairo, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 14, lineHeight: 1.6,
  };

  /* ====== ترويسة (مطابقة للصورة) ====== */
  const headWrap = { background: COLORS.white, border: `2px solid ${COLORS.line}`, borderRadius: 4, padding: 0, overflow: "hidden", marginBottom: 12 };
  const headTbl  = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
  const headCell = { border: `1px solid ${COLORS.line}`, padding: "8px 10px", background: COLORS.headBg, fontWeight: 700 };
  const headVal  = { border: `1px solid ${COLORS.line}`, padding: "8px 10px", background: COLORS.white, fontWeight: 600 };
  const logoCell = { border: `1px solid ${COLORS.line}`, width: 110, textAlign: "center", verticalAlign: "middle", padding: 8 };
  const companyRow = { borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}`, textAlign: "center", fontWeight: 900, padding: "10px 6px" };
  const titleRow   = { borderBottom: `1px solid ${COLORS.line}`, textAlign: "center", fontWeight: 900, padding: "10px 6px" };

  /* ====== بقية الصفحة ====== */
  const card = { background: COLORS.white, border: `1.5px solid ${COLORS.lightLine}`, borderRadius: 8, padding: "1rem" };
  const tbl  = { width: "100%", borderCollapse: "collapse", marginTop: 8, tableLayout: "fixed" };
  const th   = { border: `1.5px solid ${COLORS.lightLine}`, background: COLORS.thBg, padding: 10, fontWeight: 900, textAlign: "center", fontSize: 13.5 };
  const td   = { border: `1.5px solid ${COLORS.lightLine}`, padding: 8, textAlign: "center", verticalAlign: "middle", background: "#fff" };
  const inp  = { width: "100%", border: `1.5px solid ${COLORS.lightLine}`, borderRadius: 10, padding: "8px 10px", boxSizing: "border-box", height: 38, background: "#fff" };
  const select = { ...inp, appearance: "menulist" };
  const btn = (bg) => ({ background: bg, color:"#fff", border:"none", borderRadius:10, padding:"10px 14px", fontWeight:800, cursor:"pointer" });
  const btnGhost = { border:"1px solid #94a3b8", background:"#fff", color:"#0f172a", borderRadius:10, padding:"8px 12px", fontWeight:700, cursor:"pointer" };

  /* ====== الحقول ====== */
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));

  // ✅ عدّلنا الحقل qty → invoiceNo
  const emptyRow = () => ({
    item:"", supplier:"", prodDate:"", expDate:"",
    invoiceNo:"", // ← كان qty
    pest:"", broken:"", physical:"", remarks:""
  });

  const [rows, setRows] = useState(Array.from({ length: 8 }, () => emptyRow()));
  const setCell = (i, key, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };

  const yesNoOptions = (<><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option></>);

  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");

  /* ====== إضافة/حذف أسطر ====== */
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const deleteRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  /* ====== حفظ على السيرفر (مثل باقي الملفات) ====== */
  const [saving, setSaving] = useState(false);
  const [modal, setModal]   = useState({ open:false, text:"", kind:"info" }); // info | success | error

  const filteredRows = useMemo(() => {
    // تجاهل الصفوف الفارغة بالكامل
    return rows.filter((r) => Object.values(r).some((v) => String(v || "").trim() !== ""));
  }, [rows]);

  const buildPayload = () => ({
    reportDate,
    branch: BRANCH_ID,
    file: FILE_ID,
    entries: filteredRows,
    checkedBy,
    verifiedBy,
    correctiveAction,
    // معلومات مرجعية مفيدة عند العرض/التصدير
    meta: {
      doc: { ...DOC },
      savedAt: new Date().toISOString(),
    },
  });

  const handleSave = async () => {
    if (!reportDate) {
      setModal({ open:true, text:"⚠️ الرجاء اختيار تاريخ التقرير.", kind:"error" });
      return;
    }
    setModal({ open:true, text:"⏳ يتم الحفظ الآن…", kind:"info" });
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: TYPE, payload: buildPayload() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModal({ open:true, text:"✅ تم الحفظ على السيرفر بنجاح.", kind:"success" });
    } catch (e) {
      console.error(e);
      setModal({ open:true, text:"❌ فشل الحفظ على السيرفر.", kind:"error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={page}>
      {/* ====== الترويسة ====== */}
      <div style={headWrap}>
        <table style={headTbl}>
          <colgroup>
            <col style={{ width: "110px" }} />
            <col style={{ width: "44%" }} />
            <col style={{ width: "44%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={4} style={logoCell}>
                <img
                  src={DOC.logoSrc}
                  alt="Al Mawashi"
                  style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        `<div style="width:90px;height:90px;margin:0 auto;border:1px solid ${COLORS.lightLine};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;line-height:1.2;">AL MAWASHI<br/>Company Logo</div>`;
                    }
                  }}
                />
              </td>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Document Title:</div><div style={headVal}>{DOC.title}</div></div></td>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Document No:</div><div style={headVal}>{DOC.no}</div></div></td>
            </tr>
            <tr>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Issue Date:</div><div style={headVal}>{DOC.issueDate}</div></div></td>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Revision No:</div><div style={headVal}>{DOC.revNo}</div></div></td>
            </tr>
            <tr>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Area:</div><div style={headVal}>{DOC.area}</div></div></td>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Issued by:</div><div style={headVal}>{DOC.issuedBy}</div></div></td>
            </tr>
            <tr>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Controlling Officer:</div><div style={headVal}>{DOC.controllingOfficer}</div></div></td>
              <td><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}><div style={headCell}>Approved by:</div><div style={headVal}>{DOC.approvedBy}</div></div></td>
            </tr>
            <tr><td colSpan={3} style={companyRow}>{DOC.company}</td></tr>
            <tr><td colSpan={3} style={titleRow}>{DOC.reportTitle}</td></tr>
          </tbody>
        </table>

        {/* تاريخ + أزرار */}
        <div style={{ borderTop:`1px solid ${COLORS.line}`, padding:"8px 10px", display:"flex", alignItems:"center", gap:10, justifyContent:"space-between", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <b>Report Date:</b>
            <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ border:`1px solid ${COLORS.line}`, borderRadius:6, padding:"6px 8px", height:36 }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addRow} style={btnGhost} title="Add a row">+ Add Row</button>
            <button onClick={handleSave} disabled={saving} style={btn(saving ? "#94a3b8" : COLORS.primary)} title="Save to server">
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ====== الجدول ====== */}
      <div style={card}>
        <table style={tbl}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />  {/* Invoice No */}
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "6%" }} />   {/* delete */}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>S. No</th>
              <th style={th}>Item Name</th>
              <th style={th}>Supplier Details</th>
              <th style={th}>Prod Date</th>
              <th style={th}>Exp Date</th>
              <th style={th}>Invoice No</th> {/* ← كان Quantity */}
              <th style={th}>Pest Activity</th>
              <th style={th}>Broken / Damaged</th>
              <th style={th}>Physical Contamination</th>
              <th style={th}>Remarks</th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{i + 1}</td>
                <td style={td}><input style={inp} value={r.item} onChange={(e)=>setCell(i,"item",e.target.value)} /></td>
                <td style={td}><input style={inp} value={r.supplier} onChange={(e)=>setCell(i,"supplier",e.target.value)} /></td>
                <td style={td}><input style={inp} type="date" value={r.prodDate} onChange={(e)=>setCell(i,"prodDate",e.target.value)} /></td>
                <td style={td}><input style={inp} type="date" value={r.expDate} onChange={(e)=>setCell(i,"expDate",e.target.value)} /></td>
                <td style={td}><input style={inp} value={r.invoiceNo} onChange={(e)=>setCell(i,"invoiceNo",e.target.value)} placeholder="e.g., INV-12345" /></td>
                <td style={td}>
                  <select style={select} value={r.pest} onChange={(e)=>setCell(i,"pest",e.target.value)}>
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}>
                  <select style={select} value={r.broken} onChange={(e)=>setCell(i,"broken",e.target.value)}>
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}>
                  <select style={select} value={r.physical} onChange={(e)=>setCell(i,"physical",e.target.value)}>
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}><input style={inp} value={r.remarks} onChange={(e)=>setCell(i,"remarks",e.target.value)} /></td>
                <td style={{ ...td, padding: 4 }}>
                  <button
                    onClick={() => deleteRow(i)}
                    title="Delete row"
                    style={{ width:32, height:32, border:"1px solid #ef4444", background:"#fef2f2", color:"#b91c1c", borderRadius:8, fontWeight:800, cursor:"pointer" }}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Corrective Action + التواقيع */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Corrective Action:</div>
          <textarea rows={4} style={{ ...inp, width: "100%", height: "unset" }} value={correctiveAction} onChange={(e)=>setCorrectiveAction(e.target.value)} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16, alignItems:"end" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>CHECKED BY :</div>
            <input style={inp} value={checkedBy} onChange={(e)=>setCheckedBy(e.target.value)} />
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>VERIFIED BY :</div>
            <input style={inp} value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ====== Modal ====== */}
      {modal.open && (
        <div
          onClick={() => setModal((m) => ({ ...m, open: false }))}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width:"min(520px, 92vw)", background:"#fff", borderRadius:12, padding:"18px 16px",
              boxShadow:"0 10px 30px rgba(0,0,0,.25)",
              border:`2px solid ${modal.kind==="success" ? COLORS.ok : modal.kind==="error" ? COLORS.err : COLORS.primary}`,
            }}
          >
            <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>
              {modal.kind === "success" ? "تم الحفظ" : modal.kind === "error" ? "خطأ" : "جارٍ الحفظ"}
            </div>
            <div style={{ color:"#334155", marginBottom:12 }}>{modal.text}</div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} style={btn(COLORS.primary)}>تم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
