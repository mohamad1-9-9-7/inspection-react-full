// src/pages/monitor/branches/pos19/view pos 19/VegSanitationView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";
import SignatureName from "../../../../shared/SignatureName";

const DEFAULT_TYPE     = "pos19_veg_sanitation_ccp";
const DEFAULT_BRANCH   = "POS 19";
const DEFAULT_FORM_REF = "TELT/CK/QA/SR/1";

const safe = (v) => (v == null ? "" : v);
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" });
const formatDMY = (iso) => { if (!iso) return iso; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const isFilledRow = (r = {}) => Object.values(r).some((v) => String(v ?? "").trim() !== "");

function emptyRow() {
  return {
    date: "", time: "", productDetails: "", quantitySanitized: "",
    contactTime: "", peratekConc: "", remarks: "", verifiedBy: "",
  };
}

export default function VegSanitationView({
  reportType = DEFAULT_TYPE,
  branch = DEFAULT_BRANCH,
  formRef = DEFAULT_FORM_REF,
  reporter = "pos19",
  exportPrefix = "POS19_VegSanitation",
  branchLabel = "POS 19",
  areaLabel = "Central Kitchen",
  showEntryDateTime = false,
} = {}) {
  const TYPE = reportType;
  const BRANCH = branch;
  const FORM_REF = formRef;
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  }, []);

  const [date, setDate]               = useState(todayDubai);
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState("");
  const [record, setRecord]           = useState(null);
  const [editRows, setEditRows]       = useState([]);
  const [editing, setEditing]         = useState(false);
  const [allDates, setAllDates]       = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const thCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d" };
  const tdCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", verticalAlign: "middle" };
  const inputStyle = { width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" };

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(
        list.map((r) => r?.payload).filter((p) => p && p.branch === BRANCH && p.reportDate).map((p) => p.reportDate)
      )).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) { console.warn(e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null); setEditRows([]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);
      const rows = match?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
    } catch (e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (date) fetchRecord(date); /* eslint-disable-next-line */ }, [date]);

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const rows = record?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
      return;
    }

    setEditing(true);
  }

  function upd(i, key, val) { setEditRows((p) => { const n = [...p]; n[i] = { ...n[i], [key]: val }; return n; }); }
  function addRow() { setEditRows((p) => [...p, emptyRow()]); }
  function delRow(i) { setEditRows((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i))); }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    const rid = getId(record);
    const cleaned = editRows.filter(isFilledRow);
    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned,
      savedAt: Date.now(),
    };
    try {
      setLoading(true);
      // PUT on the existing id (never DELETE+POST: a failed POST would lose the report)
      const r = await fetch(rid ? `${API_BASE}/api/reports/${encodeURIComponent(rid)}` : `${API_BASE}/api/reports`, {
        method: rid ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter, type: TYPE, payload }),
      });
      if (!r.ok) throw new Error();
      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
    } catch (e) { console.error(e); alert("❌ Saving failed."); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure?")) return;
    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      alert("✅ Deleted");
      await fetchAllDates();
      setDate(allDates.find((d) => d !== record?.payload?.reportDate) || todayDubai);
    } catch (e) { alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  function exportJSON() {
    if (!record) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ type: TYPE, payload: record.payload }, null, 2)], { type: "application/json" }));
    a.download = `${exportPrefix}_${record?.payload?.reportDate || date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record?.payload || {};
      const rows = (p.entries || []).filter(isFilledRow);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("VegSanitation");
      const border = { top: { style: "thin", color: { argb: "1F3B70" } }, left: { style: "thin", color: { argb: "1F3B70" } }, bottom: { style: "thin", color: { argb: "1F3B70" } }, right: { style: "thin", color: { argb: "1F3B70" } } };
      const COL_HEADERS = ["SL No", ...(showEntryDateTime ? ["Date", "Time"] : []), "RM / Product Details", "Quantity Sanitized", "Contact Time", "Conc. of Peratek (ppm)", "Remarks / CA", "Verified By / Signature"];
      ws.columns = [{ width: 6 }, ...(showEntryDateTime ? [{ width: 12 }, { width: 10 }] : []), { width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 20 }];
      ws.mergeCells(1, 1, 1, COL_HEADERS.length);
      const r1 = ws.getCell(1, 1);
      r1.value = `AL MAWASHI BRAAI RESTAURANT LLC | SANITATION RECORD (CCP) – ${String(areaLabel).toUpperCase()}`;
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 13, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E9F0FF" } };
      ws.getRow(1).height = 22;
      ws.mergeCells(2, 1, 2, COL_HEADERS.length);
      ws.getCell(2, 1).value = `Branch: ${BRANCH} | Form Ref: ${FORM_REF} | Date: ${safe(p.reportDate)} | Required Peratek concentration: 60–80 ppm`;
      ws.getCell(2, 1).alignment = { horizontal: "center" };
      ws.getRow(2).height = 18;
      const hr = ws.getRow(4);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCE6F1" } };
        cell.border = border;
      });
      hr.height = 28;
      let rIdx = 5;
      rows.forEach((e, i) => {
        ws.getRow(rIdx).values = [
          i + 1, ...(showEntryDateTime ? [safe(e.date), safe(e.time)] : []), safe(e.productDetails),
          safe(e.quantitySanitized), safe(e.contactTime), safe(e.peratekConc),
          safe(e.remarks), safe(e.verifiedBy),
        ];
        ws.getRow(rIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = border;
        });
        ws.getRow(rIdx).height = 20;
        rIdx++;
      });
      // Methodology note
      rIdx += 1;
      ws.mergeCells(rIdx, 1, rIdx, COL_HEADERS.length);
      ws.getCell(rIdx, 1).value = `Sanitizing Methodology: ${safe(p.methodologyNote)}`;
      ws.getCell(rIdx, 1).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(rIdx, 1).border = border;
      ws.getRow(rIdx).height = 40;

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = `${exportPrefix}_${p.reportDate || date}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { console.error(e); alert("⚠️ XLSX export failed."); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node = reportRef.current;
    const canvas = await html2canvas(node, { scale: 2, windowWidth: node.scrollWidth, windowHeight: node.scrollHeight });
    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20, headerH = 50;
    const drawH = () => {
      pdf.setFillColor(233, 240, 255);
      pdf.rect(0, 0, pageW, headerH, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(`${branchLabel} | Sanitation Record (CCP) — ${record?.payload?.reportDate || date}`, pageW / 2, 28, { align: "center" });
    };
    drawH();
    const usableW = pageW - margin * 2;
    const ratio = usableW / canvas.width;
    const availH = pageH - (headerH + 10) - margin;
    let ypx = 0;
    while (ypx < canvas.height) {
      const sliceH = Math.min(canvas.height - ypx, availH / ratio);
      const pc = document.createElement("canvas");
      pc.width = canvas.width; pc.height = sliceH;
      pc.getContext("2d").drawImage(canvas, 0, ypx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      pdf.addImage(pc.toDataURL("image/png"), "PNG", margin, headerH + 10, usableW, sliceH * ratio);
      ypx += sliceH;
      if (ypx < canvas.height) { pdf.addPage("a4", "l"); drawH(); }
    }
    pdf.save(`${exportPrefix}_${record?.payload?.reportDate || date}.pdf`);
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error();
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter, type: TYPE, payload }),
      });
      if (!res.ok) throw new Error();
      alert("✅ Imported");
      setDate(payload.reportDate);
      await fetchAllDates();
      await fetchRecord(payload.reportDate);
    } catch (e) { console.error(e); alert("❌ Invalid JSON or save failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; setLoading(false); }
  }

  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out)) {
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([m, arr]) => [m, arr.sort((a, b) => b.localeCompare(a))])
      );
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(b) - Number(a)));
  }, [allDates]);

  const toggleYear = (y) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));
  const rows = record?.payload?.entries || [];

  return (
    <div style={{ background: "#fff", border: "1px solid #dbe3f4", borderRadius: 12, padding: 16, color: "#0b1f4d", direction: "ltr" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Sanitation Record (CCP) — View ({branchLabel})</div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>{editing ? "Cancel Edit" : "Edit"}</button>
          {editing && (
            <>
              <button onClick={addRow} style={btn("#0ea5e9")}>+ Row</button>
              <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
            </>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")} data-delete-action="true">Delete (password)</button>
          <button onClick={exportXLSX} disabled={!rows.filter(isFilledRow).length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{ ...btn("#059669"), display: "inline-block" }}>
            Import JSON
            <input ref={fileInputRef} type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0])} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
        {/* Date tree sidebar */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fafafa" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📅 Date Tree</div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {Object.keys(grouped).length ? Object.entries(grouped).map(([year, months]) => {
              const yOpen = !!expandedYears[year];
              return (
                <div key={year} style={{ marginBottom: 8 }}>
                  <button onClick={() => toggleYear(year)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 800 }}>
                    <span>Year {year}</span><span>{yOpen ? "▾" : "▸"}</span>
                  </button>
                  {yOpen && Object.entries(months).map(([month, days]) => {
                    const key = `${year}-${month}`;
                    const mOpen = !!expandedMonths[key];
                    return (
                      <div key={key} style={{ marginTop: 6, marginLeft: 8 }}>
                        <button onClick={() => toggleMonth(year, month)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
                          <span>Month {month}</span><span>{mOpen ? "▾" : "▸"}</span>
                        </button>
                        {mOpen && (
                          <ul style={{ listStyle: "none", padding: "6px 2px 0 2px", margin: 0 }}>
                            {days.map((d) => (
                              <li key={d} style={{ marginBottom: 6 }}>
                                <button onClick={() => setDate(d)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: d === date ? "#2563eb" : "#fff", color: d === date ? "#fff" : "#111827", fontWeight: 700, cursor: "pointer" }}>
                                  {formatDMY(d)}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }) : <div style={{ color: "#6b7280" }}>No available dates.</div>}
          </div>
        </div>

        {/* Main content */}
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
          {!loading && !err && !record && (
            <div style={{ padding: 12, border: "1px dashed #9ca3af", borderRadius: 8, textAlign: "center" }}>
              No report for this date.
            </div>
          )}
          {record && (
            <div ref={reportRef}>
              <ReportHeader
                title="Sanitation Record (CCP)"
                subtitle={`Fruits & Vegetables — ${areaLabel}`}
                fields={[
                  { label: "Report Date", value: safe(record.payload?.reportDate) },
                  { label: "Branch",      value: safe(record.payload?.branch) },
                  { label: "Form Ref",    value: FORM_REF },
                  { label: "Document No", value: safe(record.payload?.docMeta?.documentNo) || "TELT/CK/QA/SR/1" },
                ]}
              />
              <div style={{
                textAlign: "center", padding: "10px 12px", marginBottom: 10,
                background: "#1e3a5f", color: "#fff", borderRadius: 8,
                fontWeight: 800, letterSpacing: 0.3,
              }}>
                <div style={{ fontSize: 13 }}>AL MAWASHI BRAAI RESTAURANT LLC</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>SANITATION RECORD (CCP) – {String(areaLabel).toUpperCase()}</div>
              </div>

              <div style={{display:"flex",gap:10,alignItems:"center",padding:"11px 14px",marginBottom:10,background:"#fffbeb",border:"1px solid #f59e0b",borderRadius:8,color:"#78350f",fontSize:13,fontWeight:700}}>
                <span style={{fontSize:18}}>⚠️</span>
                <span>Required Peratek concentration: <strong>60–80 ppm</strong>. <span dir="rtl">يجب أن تكون القراءة بين <strong>60–80 ppm</strong>.</span></span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }}>
                  <colgroup>
                    <col style={{ width: 50 }} />
                    {showEntryDateTime && <col style={{ width: 120 }} />}
                    {showEntryDateTime && <col style={{ width: 100 }} />}
                    <col style={{ width: 220 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 150 }} />
                    {editing && <col style={{ width: 70 }} />}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>SL NO</th>
                      {showEntryDateTime && <th style={thCell}>Date</th>}
                      {showEntryDateTime && <th style={thCell}>Time</th>}
                      <th style={thCell}>RM / Product Details</th>
                      <th style={thCell}>Quantity Sanitized</th>
                      <th style={thCell}>Contact Time</th>
                      <th style={thCell}>Conc. Peratek (ppm)</th>
                      <th style={thCell}>Remarks / CA</th>
                      <th style={thCell}>Verified By / Signature</th>
                      {editing && <th style={thCell}>—</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      rows.filter(isFilledRow).map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{idx + 1}</td>
                          {showEntryDateTime && <td style={tdCell}>{safe(r.date)}</td>}
                          {showEntryDateTime && <td style={tdCell}>{safe(r.time)}</td>}
                          <td style={tdCell}>{safe(r.productDetails)}</td>
                          <td style={tdCell}>{safe(r.quantitySanitized)}</td>
                          <td style={tdCell}>{safe(r.contactTime)}</td>
                          <td style={tdCell}>{safe(r.peratekConc)}</td>
                          <td style={tdCell}>{safe(r.remarks)}</td>
                          <td style={tdCell}>
                            {r.verifiedBy ? <SignatureName name={safe(r.verifiedBy)} underline={false} /> : ""}
                          </td>
                        </tr>
                      ))
                    ) : (
                      editRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{i + 1}</td>
                          {showEntryDateTime && <td style={tdCell}><input type="date" value={r.date || ""} onChange={(e) => upd(i, "date", e.target.value)} style={inputStyle} /></td>}
                          {showEntryDateTime && <td style={tdCell}><input type="time" value={r.time || ""} onChange={(e) => upd(i, "time", e.target.value)} style={inputStyle} /></td>}
                          <td style={tdCell}><input value={r.productDetails || ""} onChange={(e) => upd(i, "productDetails", e.target.value)} style={inputStyle} /></td>
                          <td style={tdCell}><input value={r.quantitySanitized || ""} onChange={(e) => upd(i, "quantitySanitized", e.target.value)} style={inputStyle} /></td>
                          <td style={tdCell}>
                            <select value={r.contactTime || ""} onChange={(e) => upd(i, "contactTime", e.target.value)} style={inputStyle}>
                              <option value=""></option>
                              <option value="90 sec (hard-skin)">90 sec (hard-skin)</option>
                              <option value="60 sec (soft-skin)">60 sec (soft-skin)</option>
                              <option value="3 min (leafy)">3 min (leafy)</option>
                            </select>
                          </td>
                          <td style={tdCell}><input type="number" step="1" value={r.peratekConc || ""} onChange={(e) => upd(i, "peratekConc", e.target.value)} style={inputStyle} placeholder="ppm" /></td>
                          <td style={tdCell}><input value={r.remarks || ""} onChange={(e) => upd(i, "remarks", e.target.value)} style={inputStyle} /></td>
                          <td style={tdCell}><input value={r.verifiedBy || ""} onChange={(e) => upd(i, "verifiedBy", e.target.value)} style={inputStyle} /></td>
                          <td style={tdCell}><button onClick={() => delRow(i)} style={btn("#dc2626")}>Del</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Methodology note */}
              <div style={{ marginTop: 14, padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0c4a6e" }}>
                <strong>Sanitizing Methodology:</strong> {safe(record.payload?.methodologyNote) || "—"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
