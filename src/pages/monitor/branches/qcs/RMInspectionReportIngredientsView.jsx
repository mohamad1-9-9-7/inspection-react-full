// src/pages/monitor/branches/qcs/RMInspectionReportIngredientsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs_rm_ingredients";

/* ====== نفس الترويسة المستخدمـة في الإدخال (نصوص بالحرف) ====== */
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
};

const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

/* ===== ترتيب الأعمدة مطابق للإدخال بعد تعديل Quantity -> Invoice No ===== */
const FIXED_COLUMNS = [
  { label: "S. No",                  aliases: ["s_no","sno","no","serial","sample_no","sampleNo"], isSerial: true },
  { label: "Item Name",              aliases: ["item_name","itemName","item","product","product_name","productName"] },
  { label: "Supplier Details",       aliases: ["supplier","supplier_name","supplierDetails","supplier_details","supplierInfo"] },
  { label: "Prod Date",              aliases: ["prod_date","prodDate","production_date","productionDate","mfg","mfg_date"] },
  { label: "Exp Date",               aliases: ["exp_date","expDate","expiry","expiry_date","expiryDate"] },
  { label: "Invoice No",             aliases: ["invoiceNo","invoice","inv","invoice_no","bill","bill_no","ref","reference"] },
  { label: "Pest Activity",          aliases: ["pest_activity","pestActivity","pest"] },
  { label: "Broken / Damaged",       aliases: ["broken_damaged","brokenDamaged","broken","damaged"] },
  { label: "Physical Contamination", aliases: ["physical_contamination","physicalContamination","physical"] },
  { label: "Remarks",                aliases: ["remarks","remark","comment","comments","note","notes"] },
];

/* جلب أول مفتاح مطابق لأي alias داخل صف */
function findKeyInRow(row, aliases) {
  if (!row) return null;
  const keys = Object.keys(row);
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g,"").replace(/[_-]+/g,"");
  const map = new Map(keys.map(k => [norm(k), k]));
  for (const a of aliases) {
    const hit = map.get(norm(a));
    if (hit) return hit;
  }
  return null;
}

/* إرجاع قيمة الخلية وفق العمود (مع حساب S. No) */
function getVal(row, col, index) {
  if (col.isSerial) return String(index + 1);
  const key = findKeyInRow(row, col.aliases);
  const v = key ? row?.[key] : "";
  return v == null ? "" : String(v);
}

export default function RMInspectionReportIngredientsView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const getReportDate = (r) => {
    const p = r?.payload || {};
    const d = new Date(p?.reportDate || p?.date || r?.created_at);
    return isNaN(d) ? new Date(0) : d;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];
        arr.sort((a,b)=> getReportDate(a) - getReportDate(b)); // الأقدم أولاً
        setReports(arr);
        setSelected(arr[0] || null);
      } catch (e) {
        console.error(e);
        alert("⚠️ Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const payload = useMemo(() => selected?.payload || selected || {}, [selected]);

  const handleExportPDF = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      windowWidth: ref.current.scrollWidth,
      windowHeight: ref.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI - QCS", pageWidth/2, 28, { align: "center" }); // استبدال em-dash
    pdf.setFontSize(12); pdf.setFont("helvetica", "normal");
    pdf.text(DOC.reportTitle, pageWidth/2, 46, { align: "center" });

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 60, imgWidth, imgHeight);
    pdf.save(`QCS_RM_Ingredients_${payload?.reportDate || "report"}.pdf`);
  };

  const handleExportJSON = () => {
    try {
      const bundle = {
        type: TYPE, exportedAt: new Date().toISOString(),
        items: reports.map((r) => r?.payload ?? r),
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QCS_RM_Ingredients_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("❌ Failed to export JSON.");
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this report?")) return;
    const rid = getId(r);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Deleted.");
      const fresh = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
      const js = await fresh.json();
      const arr = Array.isArray(js) ? js : js?.data || js?.items || js?.rows || [];
      arr.sort((a,b)=> getReportDate(a) - getReportDate(b));
      setReports(arr);
      setSelected(arr[0] || null);
    } catch (e) {
      console.error(e); alert("❌ Failed to delete.");
    }
  };

  // تجميع بالتاريخ (سنة/شهر/يوم)
  const grouped = reports.reduce((acc, r) => {
    const d = getReportDate(r);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    acc[y] ??= {}; acc[y][m] ??= [];
    acc[y][m].push({ ...r, _dt: d.getTime(), _day: day });
    return acc;
  }, {});

  /* ================= Styles (خطوط سوداء مثل الإدخال) ================= */
  const tdHeader = {
    border: "1.5px solid #000",
    padding: "6px 8px",
    fontSize: 12,
  };
  const topTable = { width: "100%", borderCollapse: "collapse", marginBottom: 8 };
  const band = (bg) => ({
    background: bg,
    color: "#0f172a",
    fontWeight: 800,
    textAlign: "center",
    padding: "6px 8px",
    border: "1.5px solid #000",
  });

  const gridStyle = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 };
  const thCell = { border: "1.5px solid #000", padding: "6px 4px", background: "#f5f5f5" };
  const tdCell = { border: "1.5px solid #000", padding: "6px 4px", textAlign: "center", background: "#fff" };

  return (
    <div style={{ display:"flex", gap:"1rem" }}>
      <aside style={{ minWidth:260, background:"#f9f9f9", padding:"1rem", borderRadius:10, boxShadow:"0 3px 10px rgba(0,0,0,.1)" }}>
        <h4 style={{ textAlign:"center", marginBottom:10 }}>🗓️ Saved Reports</h4>
        {loading ? "⏳ Loading..." : Object.keys(grouped).length===0 ? "❌ No reports" : (
          Object.entries(grouped).sort(([a],[b])=>Number(a)-Number(b)).map(([y, months]) => (
            <details key={y} open>
              <summary style={{ fontWeight:800 }}>📅 Year {y}</summary>
              {Object.entries(months).sort(([a],[b])=>Number(a)-Number(b)).map(([m, arr])=> {
                const days = [...arr].sort((a,b)=>a._dt-b._dt);
                return (
                  <details key={m} style={{ marginLeft:12 }}>
                    <summary style={{ fontWeight:600 }}>📅 Month {m}</summary>
                    <ul style={{ listStyle:"none", paddingLeft:12 }}>
                      {days.map((r,i)=>{
                        const active = getId(selected) && getId(selected)===getId(r);
                        const d = new Date(r?._dt || 0);
                        const label = isNaN(d) ? "-" : `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
                        return (
                          <li key={i}
                              onClick={()=>setSelected(r)}
                              style={{
                                padding:"6px 10px", margin:"4px 0", borderRadius:6,
                                cursor:"pointer", textAlign:"center",
                                background: active ? "#0b132b" : "#ecf0f1",
                                color: active ? "#fff" : "#333", fontWeight:600
                              }}>
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </details>
          ))
        )}
      </aside>

      <main style={{ flex:1, background:"linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)", padding:"1rem", borderRadius:14, boxShadow:"0 4px 18px #d2b4de44" }}>
        {!selected ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:12 }}>
              <button onClick={handleExportPDF} style={{ padding:"6px 12px", borderRadius:6, background:"#27ae60", color:"#fff", fontWeight:600, border:"none", cursor:"pointer" }}>⬇ Export PDF</button>
              <button onClick={handleExportJSON} style={{ padding:"6px 12px", borderRadius:6, background:"#16a085", color:"#fff", fontWeight:600, border:"none", cursor:"pointer" }}>⬇ Export JSON</button>
              <button onClick={() => handleDelete(selected)} style={{ padding:"6px 12px", borderRadius:6, background:"#c0392b", color:"#fff", fontWeight:600, border:"none", cursor:"pointer" }}>🗑 Delete</button>
            </div>

            {/* العارض مع الترويسة وخطوط سوداء */}
            <div ref={ref} style={{ background:"#fff", border:"1.5px solid #000", borderRadius:12, padding:16 }}>
              {/* ترويسة مطابقة */}
              <table style={topTable}>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                      <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                        AL<br/>MAWASHI
                      </div>
                    </td>
                    <td style={tdHeader}><b>Document Title:</b> {DOC.title}</td>
                    <td style={tdHeader}><b>Document No:</b> {DOC.no}</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Issue Date:</b> {DOC.issueDate}</td>
                    <td style={tdHeader}><b>Revision No:</b> {DOC.revNo}</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Area:</b> {DOC.area}</td>
                    <td style={tdHeader}><b>Issued by:</b> {DOC.issuedBy}</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Controlling Officer:</b> {DOC.controllingOfficer}</td>
                    <td style={tdHeader}><b>Approved by:</b> {DOC.approvedBy}</td>
                  </tr>
                </tbody>
              </table>

              <div style={band("#e5e7eb")}>{DOC.company}</div>
              <div style={band("#f3f4f6")}>{DOC.reportTitle}</div>

              {/* معلومات عامة للتقرير */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, margin:"10px 0 12px" }}>
                <div><b>Report Date:</b> {payload?.reportDate || "-"}</div>
                <div><b>Branch/Area:</b> {payload?.branch || payload?.area || "QCS"}</div>
              </div>

              {/* الجدول - ترتيب مطابق للإدخال */}
              {Array.isArray(payload?.entries) && payload.entries.length ? (
                <div style={{ overflowX:"auto" }}>
                  <table style={gridStyle}>
                    <thead>
                      <tr>
                        {FIXED_COLUMNS.map((c)=>(<th key={c.label} style={thCell}>{c.label}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {payload.entries.map((row,i)=>(
                        <tr key={i}>
                          {FIXED_COLUMNS.map((c)=>(<td key={c.label} style={tdCell}>{getVal(row, c, i)}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color:"#6b7280" }}>No entries available.</div>
              )}

              {/* Corrective Action مطابق */}
              {payload?.correctiveAction && String(payload.correctiveAction).trim() !== "" && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Corrective Action:</div>
                  <div style={{ border:"1.5px solid #000", borderRadius:6, padding:"8px 10px", whiteSpace:"pre-wrap", background:"#fff" }}>
                    {payload.correctiveAction}
                  </div>
                </div>
              )}

              {/* التواقيع يمين/يسار بخانات صغيرة */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16, alignItems:"end" }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>CHECKED BY :</div>
                  <div style={{ border:"1.5px solid #000", borderRadius:6, padding:"8px 10px", minHeight:36, background:"#fff" }}>
                    {payload?.checkedBy || ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6, textAlign:"right" }}>VERIFIED BY :</div>
                  <div style={{ border:"1.5px solid #000", borderRadius:6, padding:"8px 10px", minHeight:36, background:"#fff", textAlign:"right" }}>
                    {payload?.verifiedBy || ""}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
