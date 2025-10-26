// src/pages/monitor/branches/ftr2/FTR2CookingTemperatureLogView.jsx
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

/* ===== ثوابت FTR2 ===== */
const TYPE   = "ftr2_cooking_temperature_log";
const BRANCH = "FTR 2 Food Truck";
const DOC_NO = "FS-QM/REC/CTL";

/* Helpers */
const getId  = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
const requirePassword = (actionLabel = "proceed") => {
  const pwd = window.prompt(`Enter password to ${actionLabel}:`);
  if (pwd === null) return false;
  if (pwd.trim() !== "9999") { alert("❌ Wrong password."); return false; }
  return true;
};

// تنظيف كائن من مفاتيح undefined/null
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null)
  );

// بناء Payload نظيف
const buildPayload = (d) =>
  clean({
    company: "Trans Emirates Livestock Trading L.L.C. (Al Mawashi)",
    documentTitle: "Cooking Temperature Log",
    documentNo: String(d?.documentNo || DOC_NO),
    branch: String(d?.branch || BRANCH),
    reportDate: d?.reportDate || new Date().toISOString().slice(0, 10),
    entries: (d?.entries || []).map((e) =>
      clean({
        date: String(e?.date || ""),
        timeOfCooking: String(e?.timeOfCooking || ""),
        foodName: String(e?.foodName || ""),
        coreTemp: String(e?.coreTemp || ""),
        holdTime: String(e?.holdTime || ""),
        correctiveAction: String(e?.correctiveAction || ""),
        checkedBy: String(e?.checkedBy || ""),
      })
    ),
    verifiedBy: String(d?.verifiedBy || ""),
    savedAt: Date.now(),
  });

/* ===== Styles ===== */
const topTable = { width:"100%", borderCollapse:"collapse", marginBottom:"8px", fontSize:"0.9rem", border:"1px solid #9aa4ae", background:"#f8fbff" };
const tdHeader = { border:"1px solid #9aa4ae", padding:"6px 8px", verticalAlign:"middle" };
const band1 = { width:"100%", textAlign:"center", background:"#bfc7cf", color:"#2c3e50", fontWeight:700, padding:"6px 4px", border:"1px solid #9aa4ae", borderTop:"none" };
const band2 = { width:"100%", textAlign:"center", background:"#dde3e9", color:"#2c3e50", fontWeight:700, padding:"6px 4px", border:"1px solid #9aa4ae", borderTop:"none", marginBottom:"8px" };
const rulesBox = { border:"1px solid #9aa4ae", background:"#f1f5f9", padding:"8px 10px", fontSize:"0.92rem", marginBottom:"10px" };
const gridTable = { width:"100%", borderCollapse:"collapse", border:"1px solid #9aa4ae", background:"#ffffff" };
const thCell = { border:"1px solid #9aa4ae", padding:"6px 8px", textAlign:"center", background:"#e0e6ed", fontWeight:700, fontSize:"0.9rem", whiteSpace:"nowrap" };
const tdCellCenter = { border:"1px solid #9aa4ae", padding:"6px 8px", textAlign:"center", color:"#2c3e50", fontWeight:600 };
const tdCellLeft   = { border:"1px solid #9aa4ae", padding:"6px 8px", textAlign:"left" };
const signRow = { display:"flex", justifyContent:"space-between", marginTop:"12px", fontWeight:700 };
const inputHidden = { display:"none" };
const btn = (bg) => ({ padding:"6px 12px", borderRadius:"6px", background:bg, color:"#fff", fontWeight:600, border:"none", cursor:"pointer" });
const input = { width:"100%", boxSizing:"border-box", border:"1px solid #cbd5e1", borderRadius:6, padding:"6px 8px" };

export default function FTR2CookingTemperatureLogView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);

  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const gridCols = useMemo(() => ([
    <col key="date" style={{ width: 120 }} />,
    <col key="toc"  style={{ width: 140 }} />,
    <col key="food" style={{ width: 260 }} />,
    <col key="temp" style={{ width: 140 }} />,
    <col key="time" style={{ width: 140 }} />,
    <col key="ca"   style={{ width: 240 }} />,
    <col key="chk"  style={{ width: 160 }} />,
  ]), []);

  async function fetchReports(preserveId) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=200`, { cache: "no-store" });
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a,b) => {
        const da = toDate(a?.payload?.reportDate)?.getTime() || 0;
        const db = toDate(b?.payload?.reportDate)?.getTime() || 0;
        return db - da;
      });
      setReports(arr);
      if (preserveId) {
        const found = arr.find((r) => getId(r) === preserveId);
        setSelectedReport(found || arr[0] || null);
      } else {
        setSelectedReport(arr[0] || null);
      }
      setEditMode(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data from server.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchReports(); }, []);

  /* ===== Export PDF ===== */
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const toolbar = reportRef.current.querySelector(".action-toolbar");
    const prev = toolbar?.style.display;
    if (toolbar) toolbar.style.display = "none";
    const canvas = await html2canvas(reportRef.current, { scale: 4, windowWidth: reportRef.current.scrollWidth, windowHeight: reportRef.current.scrollHeight });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
    let imgW = w - 20, imgH = (canvas.height * imgW) / canvas.width;
    if (imgH > h - 20) { imgH = h - 20; imgW = (canvas.width * imgH) / canvas.height; }
    pdf.addImage(imgData, "PNG", (w - imgW)/2, (h - imgH)/2, imgW, imgH);
    pdf.save(`FTR2_CookingTemp_${selectedReport?.payload?.reportDate || "report"}.pdf`);
    if (toolbar) toolbar.style.display = prev || "flex";
  };

  /* ===== Export XLS ===== */
  const handleExportXLS = () => {
    const cur = (editMode ? draft : selectedReport?.payload); if (!cur) return;
    const header = ["Date","Time of cooking","Name of the Food","Core Temp (°C)","Time","Corrective Action (if any)","Checked by"];
    const body = (cur.entries || []).map((r) => [
      r.date || "", r.timeOfCooking || "", r.foodName || "", r.coreTemp || "", r.holdTime || "", r.correctiveAction || "", r.checkedBy || ""
    ]);
    const rows = [header, ...body];
    const csv = rows.map(r => r.map(c => {
      const s = String(c ?? ""); const needQ = /[",\n;]/.test(s); const esc = s.replace(/"/g,'""'); return needQ ? `"${esc}"` : esc;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `FTR2_CookingTemp_${cur.reportDate || "report"}.xls`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  /* ===== Export JSON ===== */
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = { type: TYPE, exportedAt: new Date().toISOString(), count: payloads.length, items: payloads };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url; a.download = `FTR2_CookingTemp_ALL_${ts}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert("❌ Failed to export JSON."); }
  };

  /* ===== Import JSON ===== */
  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);
      const itemsRaw = Array.isArray(json) ? json :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.data) ? json.data : [];
      if (!itemsRaw.length) { alert("⚠️ ملف JSON لا يحتوي عناصر."); return; }
      let ok=0, fail=0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reporter: "ftr2", type: TYPE, payload }),
          });
          res.ok ? ok++ : fail++;
        } catch { fail++; }
      }
      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) {
      console.error(err); alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false); if (e?.target) e.target.value = "";
    }
  };

  /* ===== Delete (password) ===== */
  const handleDelete = async (report) => {
    if (!requirePassword("delete this report")) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report); if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      fetchReports();
    } catch (e) { console.error(e); alert("⚠️ Failed to delete report."); }
  };

  /* ===== Edit (password) ===== */
  const startEdit = () => {
    if (!selectedReport) return;
    if (!requirePassword("edit this report")) return;
    setDraft({
      ...(selectedReport.payload || {}),
      documentNo: selectedReport?.payload?.documentNo || DOC_NO,
      branch: selectedReport?.payload?.branch || BRANCH,
      entries: [...(selectedReport?.payload?.entries || [])].map((r) => ({ ...r })),
    });
    setEditMode(true);
  };
  const cancelEdit = () => { setEditMode(false); setDraft(null); };
  const updateDraftRow = (i, key, val) => {
    setDraft((prev) => {
      const next = { ...prev, entries: [...(prev.entries || [])] };
      next.entries[i] = { ...next.entries[i], [key]: val };
      return next;
    });
  };
  const addDraftRow = () =>
    setDraft((prev) => ({
      ...prev,
      entries: [...(prev.entries || []), { date:"", timeOfCooking:"", foodName:"", coreTemp:"", holdTime:"", correctiveAction:"", checkedBy:"" }],
    }));
  const removeDraftRow = (i) =>
    setDraft((prev) => ({ ...prev, entries: prev.entries.filter((_, idx) => idx !== i) }));

  /* ===== Save: DELETE القديم → POST الجديد (نفس reportDate) ===== */
  const saveEdit = async () => {
    if (!draft || !selectedReport) return;
    if (!requirePassword("save changes")) return;

    const oldId = getId(selectedReport);
    const payload = buildPayload(draft);

    try {
      // 1) احذف القديم أولًا لتفادي unique constraint على (type, reportDate)
      const delRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(oldId)}`, { method: "DELETE" });
      if (!delRes.ok) {
        const body = await delRes.text().catch(()=> "");
        throw new Error(`DELETE ${delRes.status}${body ? ` → ${body}` : ""}`);
      }

      // 2) أنشئ الجديد
      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr2", type: TYPE, payload }),
      });
      if (!postRes.ok) {
        const body = await postRes.text().catch(()=> "");
        throw new Error(`POST ${postRes.status}${body ? ` → ${body}` : ""}`);
      }

      // حاول التقاط الـID الجديد (اختياري)
      let newId = null;
      try {
        const data = await postRes.json();
        newId = getId(data) || getId(data?.data) || data?.insertedId || null;
      } catch {}

      setEditMode(false);
      setDraft(null);
      await fetchReports(newId || undefined);
      alert("✅ Saved changes (deleted old and uploaded new).");
    } catch (e) {
      console.error(e);
      alert(`❌ Failed to save changes.\n${e?.message || ""}`);
      // ملاحظة: بما أننا حذفنا القديم أولًا، لا يمكن الاسترجاع من الواجهة.
    }
  };

  /* ===== شجرة التاريخ ===== */
  const groupedReports = reports.reduce((acc, r) => {
    const d = toDate(r?.payload?.reportDate); if (!d) return acc;
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0");
    acc[y] ??= {}; acc[y][m] ??= []; acc[y][m].push({ ...r, day, _dt:d.getTime() }); return acc;
  }, {});

  return (
    <div style={{ display:"flex", gap:"1rem" }}>
      {/* Sidebar */}
      <div style={{ minWidth:"260px", background:"#f9f9f9", padding:"1rem", borderRadius:"10px", boxShadow:"0 3px 10px rgba(0,0,0,0.1)", height:"fit-content" }}>
        <h4 style={{ marginBottom:"1rem", color:"#6d28d9", textAlign:"center" }}>🗓️ Saved Reports</h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(groupedReports).sort(([a],[b]) => Number(b)-Number(a)).map(([year, months]) => (
              <details key={year} open>
                <summary style={{ fontWeight:"bold", marginBottom:"6px" }}>📅 Year {year}</summary>
                {Object.entries(months).sort(([a],[b]) => Number(b)-Number(a)).map(([month, days]) => {
                  const daysSorted = [...days].sort((x,y)=> y._dt - x._dt);
                  return (
                    <details key={month} style={{ marginLeft:"1rem" }} open>
                      <summary style={{ fontWeight:500 }}>📅 Month {month}</summary>
                      <ul style={{ listStyle:"none", paddingLeft:"1rem" }}>
                        {daysSorted.map((r,i) => {
                          const active = getId(selectedReport) && getId(selectedReport) === getId(r);
                          return (
                            <li key={i} onClick={() => { setSelectedReport(r); setEditMode(false); setDraft(null); }}
                                style={{ padding:"6px 10px", marginBottom:"4px", borderRadius:"6px", cursor:"pointer",
                                         background: active ? "#dcd6f7" : "#ecf0f1", color: active ? "#222" : "#333",
                                         fontWeight:600, textAlign:"center" }}>
                              {`${r.day}/${month}/${year}`}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Report display + Toolbar */}
      <div style={{ flex:1, background:"#eef3f8", padding:"1.5rem", borderRadius:"14px", boxShadow:"0 4px 18px #d2b4de44" }}>
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef}>
            <div className="action-toolbar" style={{ position:"sticky", top:0, zIndex:5, display:"flex", justifyContent:"flex-end", gap:"0.6rem", padding:"8px 0 12px", background:"linear-gradient(to bottom,#eef3f8,#eef3f8cc)", flexWrap:"wrap" }}>
              {!editMode && (
                <button onClick={startEdit} style={btn("#8b5cf6")}>✏️ Edit</button>
              )}
              {editMode && (
                <>
                  <button onClick={saveEdit} style={btn("#22c55e")}>💾 Save Changes</button>
                  <button onClick={cancelEdit} style={btn("#ef4444")}>✖ Cancel</button>
                </>
              )}
              <button onClick={() => handleDelete(selectedReport)} style={btn("#c0392b")} title="Delete (password: 9999)">🗑 Delete</button>
              <button onClick={handleExportPDF}  style={btn("#27ae60")}>⬇ Export PDF</button>
              <button onClick={handleExportJSON} style={btn("#16a085")}>⬇ Export JSON</button>
              <button onClick={handleExportXLS}  style={btn("#0ea5e9")}>⬇ Export XLS</button>
              <button onClick={triggerImport}    style={btn("#f39c12")}>⬆ Import JSON</button>
              <button onClick={fetchReports}     style={btn("#16a34a")} disabled={loading}>{loading ? "Refreshing…" : "⟳ Refresh"}</button>
              <input ref={fileInputRef} type="file" accept="application/json" style={inputHidden} onChange={handleImportJSON} />
            </div>

            {/* Header */}
            <table style={topTable}>
              <tbody>
                <tr>
                  <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                      AL<br/>MAWASHI
                    </div>
                  </td>
                  <td style={tdHeader}><b>Document Title:</b> Cooking Temperature Log</td>
                  <td style={tdHeader}><b>Document No:</b> {(editMode ? (draft?.documentNo || DOC_NO) : (selectedReport?.payload?.documentNo || DOC_NO))}</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                  <td style={tdHeader}><b>Revision No:</b> 0</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Area:</b> QA</td>
                  <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
                  <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
                </tr>
              </tbody>
            </table>

            <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
            <div style={band2}>COOKING TEMPERATURE LOG</div>

            {/* Notes */}
            <div style={rulesBox}>
              <div>Direction: Record date, time and food/dish name. Take the core temperature with time combination. Record deviation and corrective action if any. Put the name/signature of the person in charge.</div>
              <div dir="rtl" style={{ marginTop: 6 }}>التوجيه: دوّن التاريخ والوقت واسم الغذاء/الطبق. خذ درجة الحرارة القلبية مع زمن الطهي/الاحتفاظ. سجّل أي انحراف والإجراء التصحيحي المتخذ، ووقّع المسؤول عن المتابعة.</div>
              <div style={{ marginTop: 8 }}><b>Limit:</b> Cooking (core temperature of <b>75°C for 30 sec</b> / <b>70°C for 2 minutes</b>).</div>
            </div>

            {/* Table */}
            <table style={gridTable}>
              <colgroup>{gridCols}</colgroup>
              <thead>
                <tr>
                  <th style={thCell}>Date</th>
                  <th style={thCell}>Time of cooking</th>
                  <th style={thCell}>Name of the Food</th>
                  <th style={thCell}>Core Temp (°C)</th>
                  <th style={thCell}>Time</th>
                  <th style={thCell}>Corrective Action (if any)</th>
                  <th style={thCell}>Checked by</th>
                </tr>
              </thead>
              <tbody>
                {(editMode ? (draft?.entries || []) : (selectedReport?.payload?.entries || [])).map((row, i) => (
                  <tr key={i}>
                    <td style={tdCellCenter}>
                      {editMode ? (
                        <input type="date" value={row.date || ""} onChange={(e)=>updateDraftRow(i,"date",e.target.value)} style={input} />
                      ) : (row.date || "")}
                    </td>
                    <td style={tdCellCenter}>
                      {editMode ? (
                        <input type="time" value={row.timeOfCooking || ""} onChange={(e)=>updateDraftRow(i,"timeOfCooking",e.target.value)} style={input} />
                      ) : (row.timeOfCooking || "")}
                    </td>
                    <td style={tdCellLeft}>
                      {editMode ? (
                        <input type="text" value={row.foodName || ""} onChange={(e)=>updateDraftRow(i,"foodName",e.target.value)} style={input} />
                      ) : (row.foodName || "")}
                    </td>
                    <td style={tdCellCenter}>
                      {editMode ? (
                        <input type="number" step="0.1" value={row.coreTemp || ""} onChange={(e)=>updateDraftRow(i,"coreTemp",e.target.value)} style={input} />
                      ) : (row.coreTemp || "")}
                    </td>
                    <td style={tdCellCenter}>
                      {editMode ? (
                        <input type="text" value={row.holdTime || ""} onChange={(e)=>updateDraftRow(i,"holdTime",e.target.value)} style={input} />
                      ) : (row.holdTime || "")}
                    </td>
                    <td style={tdCellLeft}>
                      {editMode ? (
                        <input type="text" value={row.correctiveAction || ""} onChange={(e)=>updateDraftRow(i,"correctiveAction",e.target.value)} style={input} />
                      ) : (row.correctiveAction || "")}
                    </td>
                    <td style={tdCellLeft}>
                      {editMode ? (
                        <input type="text" value={row.checkedBy || ""} onChange={(e)=>updateDraftRow(i,"checkedBy",e.target.value)} style={input} />
                      ) : (row.checkedBy || "")}
                    </td>
                    {editMode && (
                      <td style={{ ...tdCellCenter, border:"1px solid #9aa4ae" }}>
                        <button onClick={() => removeDraftRow(i)} style={btn("#e11d48")}>🗑 Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
                {editMode && (
                  <tr>
                    <td colSpan={7} style={{ ...tdCellCenter, textAlign:"left" }}>
                      <button onClick={addDraftRow} style={btn("#16a34a")}>➕ Add Row</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signatures */}
            <div style={signRow}>
              <div>
                Verified By:-{" "}
                {editMode ? (
                  <input
                    value={draft?.verifiedBy || ""}
                    onChange={(e)=>setDraft((p)=>({ ...(p||{}), verifiedBy: e.target.value }))}
                    style={{ ...input, width: 260 }}
                  />
                ) : (
                  <span style={{ fontWeight: 500 }}>{selectedReport?.payload?.verifiedBy || "—"}</span>
                )}
              </div>
              <div>Branch:- <span style={{ fontWeight: 500 }}>{(editMode ? (draft?.branch||BRANCH) : (selectedReport?.payload?.branch||BRANCH))}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
