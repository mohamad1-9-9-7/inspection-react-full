// src/pages/monitor/branches/pos19/view pos 19/FoodTemperatureVerificationView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE   = "pos19_food_temperature_verification";
const BRANCH = "POS 19";

/* ===== Helpers & styles ===== */
const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
});
const formatDMY = (iso) => {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
async function loadImageDataURL(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* جدول بنفس روح DailyCleaning */
const gridStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: 12,
};
const thCell = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 700,
  background: "#f5f8ff",
  color: "#0b1f4d",
};
const tdCell = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  verticalAlign: "middle",
};
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #c7d2fe",
  borderRadius: 6,
  padding: "4px 6px",
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

/* صف فارغ (نفس هيكل الإدخال) */
function emptyRow() {
  return {
    date: "",             // يُعرض فقط في الترويسة — نتركه هنا للتوافق
    food_am: "", temp_am: "", sign_am: "",
    food_pm: "", temp_pm: "", sign_pm: "",
    correctiveAction: "",
  };
}

export default function FoodTemperatureVerificationView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }, []);

  // state
  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  // وضع التعديل (يحرر كامل rows لليوم)
  const [editRows, setEditRows] = useState([]); // array of dayReports rows
  const [editing, setEditing] = useState(false);

  // شجرة التواريخ
  const [allDates, setAllDates] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM -> boolean

  // colgroup (عرض الأعمدة)
  const colDefs = useMemo(() => {
    return [
      <col key="food_am"  style={{ width: 240 }} />,
      <col key="temp_am"  style={{ width: 90 }} />,
      <col key="sign_am"  style={{ width: 90 }} />,
      <col key="food_pm"  style={{ width: 240 }} />,
      <col key="temp_pm"  style={{ width: 90 }} />,
      <col key="sign_pm"  style={{ width: 90 }} />,
      <col key="action"   style={{ width: 260 }} />,
      <col key="del"      style={{ width: 70 }} />,
    ];
  }, []);

  const legendBox = (
    <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
      <strong>Time Windows:</strong> 10:00–10:30 <span style={{textTransform:"uppercase"}}>am</span> &nbsp;/&nbsp;
      10:00–10:30 <span style={{textTransform:"uppercase"}}>pm</span>
    </div>
  );

  /* ============ Fetch ============ */
  function extractDate(r) {
    return r?.payload?.header?.reportDate || r?.payload?.reportDate || r?.reportDate;
  }
  function extractBranch(r) {
    return r?.branch || r?.payload?.branch;
  }

  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list.filter((r) => extractBranch(r) === BRANCH && extractDate(r));
      const uniq = Array.from(new Set(filtered.map((r) => extractDate(r)))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);

      if (uniq.length) {
        const [y, m] = uniq[0].split("-");
        setExpandedYears((prev) => ({ ...prev, [y]: true }));
        setExpandedMonths((prev) => ({ ...prev, [`${y}-${m}`]: true }));
      }
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) {
      console.warn("Failed to fetch dates", e);
    }
  }

  async function fetchRecord(d = date) {
    setLoading(true);
    setErr("");
    setRecord(null);
    setEditRows([]);
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find(
        (r) => extractBranch(r) === BRANCH && extractDate(r) === d
      ) || null;

      setRecord(match);

      const rows = match?.payload?.dayReports;
      setEditRows(Array.isArray(rows) && rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ====== Edit / Save / Delete (password 9999) ====== */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      // cancel -> رجوع للأصل
      const rows = record?.payload?.dayReports;
      setEditRows(Array.isArray(rows) && rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    const rows = record?.payload?.dayReports;
    setEditRows(Array.isArray(rows) && rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
    setEditing(true);
  }

  function addRow() { setEditRows((p) => [...p, emptyRow()]); }
  function deleteRow(i) {
    setEditRows((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));
  }
  function updateRow(i, field, val) {
    setEditRows((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: val };
      return n;
    });
  }

  // SAVE: DELETE ثم POST
  async function saveEdit() {
    if (!record) return;
    if (!askPass("Save changes")) return alert("❌ Wrong password");

    const rid = getId(record);
    const old = record?.payload || {};
    const payload = {
      ...old,
      dayReports: editRows,
      // حافظ على الهيدر كما هو
    };

    try {
      setLoading(true);

      if (rid) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
        } catch (e) { console.warn("DELETE (ignored)", e); }
      }

      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // لاحظ: النوع محفوظ على body الأعلى في الإدخال، نحافظ عليه هنا كذلك
        body: JSON.stringify({
          type: TYPE,
          branch: BRANCH,
          uniqueKey: record?.uniqueKey || undefined,
          payload,
        }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(extractDate(record));
      await fetchAllDates();
    } catch (e) {
      console.error(e);
      alert("❌ Saving failed.\n" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      await fetchAllDates();
      const next = allDates.find((d) => d !== extractDate(record)) || todayDubai;
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("❌ Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ====== Export / Import ====== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload, branch: extractBranch(record) || BRANCH };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_FoodTempLog_${extractDate(record) || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // XLSX مصمم (ExcelJS)
  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const FileSaver = await import("file-saver");

      const p = record?.payload || {};
      const header = p?.header || {};
      const rows = Array.isArray(p?.dayReports) ? p.dayReports : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("FoodTempLog");

      const lightBlue = "D9E2F3";
      const headerBlue = "BDD7EE";
      const tableHeaderBlue = "DCE6F1";
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };

      const COL_HEADERS = [
        "Food (AM)", "TEMP", "SIGN",
        "Food (PM)", "TEMP", "SIGN",
        "Corrective Action"
      ];
      ws.columns = [
        { header: COL_HEADERS[0], width: 26 },
        { header: COL_HEADERS[1], width: 10 },
        { header: COL_HEADERS[2], width: 10 },
        { header: COL_HEADERS[3], width: 26 },
        { header: COL_HEADERS[4], width: 10 },
        { header: COL_HEADERS[5], width: 10 },
        { header: COL_HEADERS[6], width: 28 },
      ];

      // Title
      ws.mergeCells(1,1,1,COL_HEADERS.length);
      const r1 = ws.getCell(1,1);
      r1.value = `Union Coop — ${BRANCH} | Food Temperature Verification Log (${header.reportDate || ""})`;
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(1).height = 22;

      // Logo
      const dataUrl = await loadImageDataURL(unionLogo);
      if (dataUrl) {
        const base64 = dataUrl.split(",")[1];
        const imgId = wb.addImage({ base64, extension: "png" });
        ws.mergeCells(2,1,5,3);
        ws.addImage(imgId, { tl: { col: 0.2, row: 1.3 }, ext: { width: 260, height: 90 }, editAs: "oneCell" });
      }

      // Meta (right)
      const meta = [
        ["Form Ref:", "UC/HACCP/BR/F04A"],
        ["Classification:", header.classification || "Official"],
        ["Ref.Unit Code:", header.referenceUnitCode || ""],
        ["Date:", header.reportDate || ""],
      ];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i;
        ws.mergeCells(rowIdx, 4, rowIdx, COL_HEADERS.length);
        const c = ws.getCell(rowIdx, 4);
        c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerBlue } };
        ws.getRow(rowIdx).height = 18;
      }

      // Legend
      ws.mergeCells(6,1,6,COL_HEADERS.length);
      const lg = ws.getCell(6,1);
      lg.value = "Time: 10:00–10:30 am  /  10:00–10:30 pm";
      lg.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(6).height = 18;

      // Header row
      const headerRowIdx = 7;
      const hr = ws.getRow(headerRowIdx);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tableHeaderBlue } };
        cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });
      hr.height = 28;

      // Data rows
      let rowIdx = headerRowIdx + 1;
      for (const r of rows) {
        const vals = [
          r.food_am || "",
          r.temp_am || "",
          r.sign_am || "",
          r.food_pm || "",
          r.temp_pm || "",
          r.sign_pm || "",
          r.correctiveAction || "",
        ];
        ws.getRow(rowIdx).values = vals;
        ws.getRow(rowIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 22;
        rowIdx++;
      }

      const buf = await wb.xlsx.writeBuffer();
      FileSaver.saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS19_FoodTempLog_${header.reportDate || extractDate(record) || ""}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("⚠️ XLSX export failed. Ensure exceljs & file-saver are available.");
    }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      const recDate = payload?.header?.reportDate || payload?.reportDate;
      if (!recDate) throw new Error("Invalid payload: missing reportDate");

      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: TYPE, branch: BRANCH, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("✅ Imported and saved");
      setDate(recDate);
      await fetchAllDates();
      await fetchRecord(recDate);
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON or save failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setLoading(false);
    }
  }

  /* ====== PDF (يلتقط التقرير فقط) ====== */
  async function exportPDF() {
    if (!reportRef.current) return;

    const node = reportRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
    const logo = await loadImageDataURL(unionLogo);

    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const headerH = 60;

    const header = record?.payload?.header || {};
    // header band
    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    if (logo) {
      const logoW = 110;
      const logoH = 110 * 0.5 * 0.9;
      pdf.addImage(logo, "PNG", margin, 8, logoW, logoH);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(
      `Union Coop — ${BRANCH} | Food Temperature Verification Log (${header.reportDate || ""})`,
      pageW / 2,
      28,
      { align: "center" }
    );

    const usableW = pageW - margin * 2;
    const availableH = pageH - (headerH + 10) - margin;

    const ratio = usableW / canvas.width;
    const totalHpx = canvas.height;
    let ypx = 0;

    while (ypx < totalHpx) {
      const sliceHpx = Math.min(totalHpx - ypx, availableH / ratio);

      const partCanvas = document.createElement("canvas");
      partCanvas.width = canvas.width;
      partCanvas.height = sliceHpx;
      const ctx = partCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, ypx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      const partData = partCanvas.toDataURL("image/png");

      const partHpt = sliceHpx * ratio;
      pdf.addImage(partData, "PNG", margin, headerH + 10, usableW, partHpt);

      ypx += sliceHpx;
      if (ypx < totalHpx) {
        pdf.addPage("a4", "l");
        pdf.setFillColor(247, 249, 252);
        pdf.rect(0, 0, pageW, headerH, "F");
        if (logo) {
          const logoW = 110;
          const logoH = 110 * 0.5 * 0.9;
          pdf.addImage(logo, "PNG", margin, 8, logoW, logoH);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(
          `Union Coop — ${BRANCH} | Food Temperature Verification Log (${header.reportDate || ""})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS19_FoodTempLog_${header.reportDate || date}.pdf`);
  }

  /* ====== Group dates ====== */
  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out))
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a],[b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a,b)=>a.localeCompare(b))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(a) - Number(b)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ====== UI ====== */
  const header = record?.payload?.header || {};
  const rows = record?.payload?.dayReports || [];

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ fontWeight:800, fontSize:18 }}>
          Food Temperature Verification Log — View (POS 19)
        </div>

        {/* Actions */}
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <>
              <button onClick={addRow} style={btn("#16a34a")}>+ Add Row</button>
              <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
            </>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>

          <button onClick={exportXLSX} disabled={!rows.length} style={btn("#0ea5e9")}>
            Export XLSX
          </button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>
            Export JSON
          </button>
          <button onClick={exportPDF} style={btn("#374151")}>
            Export PDF
          </button>

          <label style={{ ...btn("#059669"), display:"inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e)=>importJSON(e.target.files?.[0])}
              style={{ display:"none" }}
            />
          </label>
        </div>
      </div>

      {/* Layout: Date tree + content */}
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* Date tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? (
              Object.entries(grouped).map(([year, months]) => {
                const yOpen = !!expandedYears[year];
                return (
                  <div key={year} style={{ marginBottom:8 }}>
                    <button
                      onClick={()=>toggleYear(year)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        width:"100%", padding:"6px 10px", borderRadius:8,
                        border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800
                      }}
                      title={yOpen ? "Collapse" : "Expand"}
                    >
                      <span>Year {year}</span>
                      <span aria-hidden="true">{yOpen ? "▾" : "▸"}</span>
                    </button>

                    {yOpen && Object.entries(months).map(([month, days]) => {
                      const key = `${year}-${month}`;
                      const mOpen = !!expandedMonths[key];
                      return (
                        <div key={key} style={{ marginTop:6, marginLeft:8 }}>
                          <button
                            onClick={()=>toggleMonth(year, month)}
                            style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              width:"100%", padding:"6px 10px", borderRadius:8,
                              border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700
                            }}
                            title={mOpen ? "Collapse" : "Expand"}
                          >
                            <span>Month {month}</span>
                            <span aria-hidden="true">{mOpen ? "▾" : "▸"}</span>
                          </button>

                          {mOpen && (
                            <div style={{ padding:"6px 2px 0 2px" }}>
                              <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                                {days.map((d)=>(
                                  <li key={d} style={{ marginBottom:6 }}>
                                    <button
                                      onClick={()=>setDate(d)}
                                      style={{
                                        width:"100%", textAlign:"left", padding:"8px 10px",
                                        borderRadius:8, border:"1px solid #d1d5db",
                                        background: d===date ? "#2563eb" : "#fff",
                                        color: d===date ? "#fff" : "#111827",
                                        fontWeight:700, cursor:"pointer"
                                      }}
                                      title={formatDMY(d)}
                                    >
                                      {formatDMY(d)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div style={{ color:"#6b7280" }}>No available dates.</div>
            )}
          </div>
        </div>

        {/* Report content */}
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && (
            <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>
              No report for this date.
            </div>
          )}

          {record && (
            <div ref={reportRef}>
              {/* Info band */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(header.reportDate)}</div>
                <div><strong>Branch:</strong> {BRANCH}</div>
                <div><strong>Form Ref:</strong> UC/HACCP/BR/F04A</div>
                <div><strong>Classification:</strong> {safe(header.classification || "Official")}</div>
                <div><strong>Ref.Unit Code:</strong> {safe(header.referenceUnitCode)}</div>
              </div>

              {/* Title + Legend */}
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>DAILY READINGS (Single Reference Unit)</div>
                {legendBox}
              </div>

              {/* Table (قد يحتوي عدة صفوف في اليوم) */}
              <div style={{ overflowX:"auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Name of the Food (AM)</th>
                      <th style={thCell}>TEMP</th>
                      <th style={thCell}>SIGN</th>
                      <th style={thCell}>Name of the Food (PM)</th>
                      <th style={thCell}>TEMP</th>
                      <th style={thCell}>SIGN</th>
                      <th style={thCell}>CORRECTIVE ACTION</th>
                      <th style={thCell}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      (rows && rows.length ? rows : [emptyRow()]).map((r, i) => (
                        <tr key={i}>
                          <td style={tdCell}>{safe(r.food_am)}</td>
                          <td style={tdCell}>{safe(r.temp_am)}</td>
                          <td style={tdCell}>{safe(r.sign_am)}</td>
                          <td style={tdCell}>{safe(r.food_pm)}</td>
                          <td style={tdCell}>{safe(r.temp_pm)}</td>
                          <td style={tdCell}>{safe(r.sign_pm)}</td>
                          <td style={tdCell}>{safe(r.correctiveAction)}</td>
                          <td style={tdCell}>—</td>
                        </tr>
                      ))
                    ) : (
                      editRows.map((r, i) => (
                        <tr key={i}>
                          <td style={tdCell}>
                            <input value={r.food_am || ""} onChange={(e)=>updateRow(i,"food_am",e.target.value)} style={inputStyle} placeholder="Food name" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.temp_am || ""} onChange={(e)=>updateRow(i,"temp_am",e.target.value)} style={{...inputStyle, textAlign:"center"}} placeholder="°C" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.sign_am || ""} onChange={(e)=>updateRow(i,"sign_am",e.target.value)} style={{...inputStyle, textAlign:"center"}} placeholder="Sign" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.food_pm || ""} onChange={(e)=>updateRow(i,"food_pm",e.target.value)} style={inputStyle} placeholder="Food name" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.temp_pm || ""} onChange={(e)=>updateRow(i,"temp_pm",e.target.value)} style={{...inputStyle, textAlign:"center"}} placeholder="°C" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.sign_pm || ""} onChange={(e)=>updateRow(i,"sign_pm",e.target.value)} style={{...inputStyle, textAlign:"center"}} placeholder="Sign" />
                          </td>
                          <td style={tdCell}>
                            <input value={r.correctiveAction || ""} onChange={(e)=>updateRow(i,"correctiveAction",e.target.value)} style={inputStyle} placeholder="Action if limits exceeded" />
                          </td>
                          <td style={tdCell}>
                            <button onClick={()=>deleteRow(i)} style={btn("#dc2626")}>X</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
