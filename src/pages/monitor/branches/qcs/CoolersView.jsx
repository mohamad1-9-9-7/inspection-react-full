// src/pages/monitor/branches/qcs/CoolersView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===== API مستقل داخل الملف ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL)) ||
  API_ROOT_DEFAULT;

const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE_COOLERS = "qcs-coolers";

const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ===== API helpers ===== */
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list reports for ${type}`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function getReportRowByDate(type, date) {
  const rows = await listReportsByType(type);
  return rows.find((r) => {
    const p = r?.payload || {};
    const d = String(
      p.reportDate || p.date || p.header?.reportEntryDate || p.meta?.entryDate || ""
    ).trim();
    return d === String(date);
  }) || null;
}
async function getReportByTypeAndDate(type, date) {
  const row = await getReportRowByDate(type, date);
  return row?.payload || null;
}
async function upsertReportByType(type, payload) {
  const res = await fetch(REPORTS_URL, {
    method: "PUT",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: "admin-edit", type, payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Failed to update report (${res.status})`);
  }
  return res.json().catch(() => ({}));
}
async function deleteByDate(type, date) {
  const row = await getReportRowByDate(type, date);
  const id = row?._id || row?.id;
  if (!id) return true;
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) throw new Error("Delete failed");
  return true;
}

/* ===== ثوابت/مساعدات محلية (تصميم/هيدر) ===== */
const LOGO_URL = "/brand/al-mawashi.jpg";
const COOLER_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];
const thB = (center=false)=>({ border:"1px solid #000", padding:"4px", fontWeight:800, textAlign:center?"center":"left", whiteSpace:"nowrap" });
const tdB = (center=false)=>({ border:"1px solid #000", padding:"4px", textAlign:center?"center":"left" });
function labelForCooler(i){ return i===7 ? "FREEZER" : (i===2||i===3) ? "Production Room" : `Cooler ${i+1}`; }

function Row({label, value}) {
  return (
    <div style={{display:"flex", borderBottom:"1px solid #000"}}>
      <div style={{padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700}}>
        {label}
      </div>
      <div style={{padding:"6px 8px", flex:1}}>{value}</div>
    </div>
  );
}

function TMPPrintHeader({ header, reportDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }}/>
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
          <Row label="Issued by:" value={header.issuedBy} />
          <Row label="Approved by:" value={header.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TEMPERATURE CONTROL CHECKLIST (CCP)
        </div>
        <div style={{ padding:"6px 8px", lineHeight:1.5 }}>
          <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
          <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
          <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
          <div style={{ marginTop:6, fontWeight:700 }}>
            Corrective action: Transfer the meat to another cold room and call maintenance department to check and solve the problem.
          </div>
        </div>
        <div style={{ borderTop:"1px solid #000" }}>
          <div style={{ display:"flex" }}>
            <div style={{padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700}}>Report Date:</div>
            <div style={{padding:"6px 8px", flex:1}}>{reportDate || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== أدوات مساعدة للتاريخ ===== */
function formatDMYSmart(value) {
  if (!value) return "";
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return s;
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return s;
}
function extractAnyDate(payloadOrRow) {
  const p = payloadOrRow?.payload || payloadOrRow || {};
  return (
    p.reportDate ||
    p.date ||
    p.header?.reportEntryDate ||
    p.meta?.entryDate ||
    payloadOrRow?.created_at ||
    ""
  );
}
function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return s;
}

/* ===== أزرار محلية ===== */
const btnBase = { padding:"9px 12px", borderRadius:8, cursor:"pointer", border:"1px solid transparent", fontWeight:700 };
const btnPrimary = { ...btnBase, background:"#2563eb", color:"#fff" };
const btnOutline = { ...btnBase, background:"#fff", color:"#111827", border:"1px solid #e5e7eb" };
const btnJson   = { ...btnBase, background:"#16a085", color:"#fff" };
const btnImport = { ...btnBase, background:"#f39c12", color:"#fff" };
const btnDelete = { ...btnBase, background:"#c0392b", color:"#fff" };

/* ===== المكوّن ===== */
export default function CoolersView() {
  // ملاحظة: فصلنا حالات التحميل:
  // loadingList: تحميل/تحديث قائمة التقارير (للشجرة فقط)
  // نحمّل التقرير المحدد بصمت بدون أي مؤشر UI.
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ شجرة التواريخ + التاريخ المختار
  const [allRows, setAllRows] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [report, setReport] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editCoolers, setEditCoolers] = useState([]);
  const [editLoadingArea, setEditLoadingArea] = useState({ temps:{}, remarks:"" });

  const fileInputRef = useRef(null);

  // تحميل كل السجلات للتجميع + اختيار أحدث تاريخ تلقائيًا
  async function refreshList() {
    setLoadingList(true);
    try {
      const rows = await listReportsByType(TYPE_COOLERS);
      rows.sort((a,b) => {
        const da = new Date(extractAnyDate(a)).getTime() || 0;
        const db = new Date(extractAnyDate(b)).getTime() || 0;
        return da - db; // أقدم ← أحدث
      });
      setAllRows(rows);
      if (!selectedDate && rows.length) {
        const newest = rows[rows.length - 1];
        setSelectedDate(toYMD(extractAnyDate(newest)));
      } else if (selectedDate) {
        const exists = rows.some(r => toYMD(extractAnyDate(r)) === selectedDate);
        if (!exists && rows.length) setSelectedDate(toYMD(extractAnyDate(rows[rows.length - 1])));
      }
    } catch (e) {
      console.error(e);
      setAllRows([]);
      alert("Failed to list coolers reports.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { refreshList(); }, []);

  // تحميل تقرير تاريخ محدد (بصمت)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedDate) { setReport(null); return; }
      try {
        const payload = await getReportByTypeAndDate(TYPE_COOLERS, selectedDate);
        const rep = payload ? { date: selectedDate, ...payload } : null;
        if (cancelled) return;

        setReport(rep);

        const src = Array.isArray(rep?.coolers) ? rep.coolers : [];
        const clone = src.map((c)=>({ remarks: c?.remarks || "", temps: { ...(c?.temps || {}) } }));
        setEditCoolers(clone);

        const la = rep?.loadingArea || { temps:{}, remarks:"" };
        setEditLoadingArea({ remarks: la.remarks || "", temps: { ...(la.temps || {}) } });

        setEditing(false);
      } catch (e) {
        console.error(e);
        setReport(null);
        alert("Failed to load coolers report.");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

  // تجميع Year → Month → Day
  const grouped = useMemo(() => {
    return allRows.reduce((acc, r) => {
      const d = new Date(extractAnyDate(r));
      if (isNaN(d)) return acc;
      const Y = d.getFullYear();
      const M = String(d.getMonth()+1).padStart(2,"0");
      const D = String(d.getDate()).padStart(2,"0");
      if (!acc[Y]) acc[Y] = {};
      if (!acc[Y][M]) acc[Y][M] = [];
      acc[Y][M].push({ r, _dt: d.getTime(), _day: D, ymd: toYMD(d) });
      return acc;
    }, {});
  }, [allRows]);

  // عرض التاريخ النصي
  const reportDateText = useMemo(() => formatDMYSmart(selectedDate), [selectedDate]);

  const tmpHeader = useMemo(() => ({
    documentTitle: "Temperature Control Record",
    documentNo: "FS-QM/REC/TMP",
    issueDate: "05/02/2020",
    revisionNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy: "Hussam O. Sarhan",
  }), []);

  // معدلّات التحرير
  const setTemp = (rowIdx, time, val) => {
    setEditCoolers(prev => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps:{} }) };
      row.temps = { ...(row.temps || {}), [time]: val };
      next[rowIdx] = row;
      return next;
    });
  };
  const setRemarksRow = (rowIdx, val) => {
    setEditCoolers(prev => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps:{} }) };
      row.remarks = val;
      next[rowIdx] = row;
      return next;
    });
  };
  const setLoadingTemp = (time, val) => {
    setEditLoadingArea(prev => ({ ...prev, temps: { ...(prev.temps||{}), [time]: val } }));
  };
  const setLoadingRemarks = (val) => {
    setEditLoadingArea(prev => ({ ...prev, remarks: val }));
  };

  const cancelEditing = () => {
    const src = Array.isArray(report?.coolers) ? report.coolers : [];
    const clone = src.map((c)=>({ remarks: c?.remarks || "", temps: { ...(c?.temps || {}) } }));
    setEditCoolers(clone);

    const la = report?.loadingArea || { temps:{}, remarks:"" };
    setEditLoadingArea({ remarks: la.remarks || "", temps: { ...(la.temps || {}) } });

    setEditing(false);
  };

  const saveEditing = async () => {
    try {
      const dateToSave = selectedDate || toYMD(report?.reportDate) || toYMD(report?.date);
      if (!dateToSave) {
        alert("⚠️ No date to save with this report.");
        return;
      }

      setSaving(true);
      const payloadToSave = {
        ...(report || {}),
        reportDate: String(dateToSave),
        coolers: editCoolers,
        loadingArea: editLoadingArea,
      };
      delete payloadToSave.date;

      await upsertReportByType(TYPE_COOLERS, payloadToSave);

      const fresh = await getReportByTypeAndDate(TYPE_COOLERS, dateToSave);
      const rep = fresh ? { date: dateToSave, ...fresh } : null;
      setReport(rep);
      setEditing(false);
      alert("✅ Saved coolers temperatures.");
      await refreshList();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save coolers.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ اسم المدير من التقرير (إن وُجد)
  const verifiedByManager = report?.verifiedByManager || "—";

  /* ====== عمليات الشجرة: حذف / تصدير / استيراد ====== */
  const handleDeleteCurrent = async () => {
    if (!selectedDate) return;
    if (!window.confirm(`⚠️ Delete coolers report dated ${selectedDate}?`)) return;
    try {
      await deleteByDate(TYPE_COOLERS, selectedDate);
      alert("✅ Report deleted.");
      await refreshList();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };

  const handleExportJSON = async () => {
    try {
      const rows = await listReportsByType(TYPE_COOLERS);
      const payloads = rows.map(r => r?.payload ?? r);
      const out = {
        type: TYPE_COOLERS,
        exportedAt: new Date().toISOString(),
        count: payloads.length,
        items: payloads,
      };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QCS_Coolers_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export JSON.");
    }
  };

  const handleImportTrigger = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingList(true);
      const txt = await file.text();
      const data = JSON.parse(txt);
      const items =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data : [];
      if (!items.length) { alert("⚠️ JSON file has no items."); return; }
      let ok = 0, fail = 0;
      for (const it of items) {
        try {
          const payload = it?.payload ?? it;
          if (!payload || typeof payload !== "object") { fail++; continue; }
          const res = await fetch(`${REPORTS_URL}`, {
            method: "POST",
            credentials: IS_SAME_ORIGIN ? "include" : "omit",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ reporter: "admin-import", type: TYPE_COOLERS, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await refreshList();
    } catch (e2) {
      console.error(e2);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoadingList(false);
      if (e?.target) e.target.value = "";
    }
  };

  /* ====== UI ====== */
  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Sidebar: شجرة التواريخ + إجراءات عامة */}
      <aside
        style={{
          minWidth: 260,
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: 10,
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}
      >
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>

        {loadingList ? (
          <p>⏳ Loading…</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          Object.entries(grouped)
            .sort(([a],[b]) => Number(a) - Number(b))
            .map(([Y, months]) => (
              <details key={Y}>{/* ✨ افتراضيًا مغلق */}
                <summary style={{ fontWeight: 700 }}>📅 Year {Y}</summary>
                {Object.entries(months)
                  .sort(([a],[b]) => Number(a) - Number(b))
                  .map(([M, days]) => {
                    const sorted = [...days].sort((x,y) => x._dt - y._dt);
                    return (
                      <details key={M} style={{ marginLeft: "1rem" }}>
                        {/* ✨ افتراضيًا مغلق */}
                        <summary style={{ fontWeight: 500 }}>📅 Month {M}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                          {sorted.map((obj,i) => {
                            const active = selectedDate === obj.ymd;
                            return (
                              <li
                                key={i}
                                onClick={() => setSelectedDate(obj.ymd)}
                                style={{
                                  padding: "6px 10px",
                                  marginBottom: 4,
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  background: active ? "#6d28d9" : "#ecf0f1",
                                  color: active ? "#fff" : "#333",
                                  fontWeight: 600,
                                  textAlign: "center",
                                  borderLeft: active ? "4px solid #4c1d95" : "4px solid transparent",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                                title={active ? "Currently open" : "Open report"}
                              >
                                <span>{`${obj._day}/${M}/${Y}`}</span>
                                {active ? <span>✔️</span> : <span style={{ opacity: .5 }}>•</span>}
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

        {/* إجراءات عامة */}
        <div style={{ display:"grid", gap:8, marginTop:12 }}>
          <button onClick={refreshList} style={btnOutline} disabled={loadingList}>↻ Refresh</button>
          <button onClick={handleExportJSON} style={btnJson}>⬇ Export JSON</button>
          <button onClick={handleImportTrigger} style={btnImport}>⬆ Import JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display:"none" }} onChange={handleImportJSON} />
          <button onClick={handleDeleteCurrent} style={btnDelete} disabled={!selectedDate}>🗑 Delete</button>
        </div>
      </aside>

      {/* Main: الهيدر + جدول + التحرير/حفظ */}
      <main style={{ flex: 1 }}>
        <TMPPrintHeader
          header={{
            documentTitle: "Temperature Control Record",
            documentNo: "FS-QM/REC/TMP",
            issueDate: "05/02/2020",
            revisionNo: "0",
            area: "QA",
            issuedBy: "MOHAMAD ABDULLAH",
            controllingOfficer: "Quality Controller",
            approvedBy: "Hussam O. Sarhan",
          }}
          reportDate={reportDateText}
        />

        {/* أدوات التحرير أعلى الجدول */}
        <div className="no-print" style={{ display:"flex", gap:8, justifyContent:"flex-end", margin:"8px 0" }}>
          {!editing ? (
            <button onClick={()=>setEditing(true)} style={btnOutline} disabled={!report}>✏️ Edit</button>
          ) : (
            <>
              <button onClick={saveEditing} style={{...btnPrimary, opacity: saving?0.7:1}} disabled={saving}>💾 Save</button>
              <button onClick={cancelEditing} style={btnOutline} disabled={saving}>↩️ Cancel</button>
            </>
          )}
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "center",
            border: "1px solid #000",
            fontSize: "12px",
            tableLayout: "fixed",
            wordBreak: "word-break",
          }}
        >
          <thead>
            <tr style={{ background: "#d9d9d9" }}>
              <th style={thB(true)}>Cooler</th>
              {COOLER_TIMES.map((t) => (<th key={t} style={thB(true)}>{t}</th>))}
              <th style={thB(false)}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {/* سطر التاريخ */}
            <tr>
              <td colSpan={COOLER_TIMES.length + 2} style={{ ...tdB(false), textAlign: "left", background: "#f3f4f6", fontWeight: 800 }}>
                Report Date: <span style={{ fontWeight: 900 }}>{reportDateText || "—"}</span>
              </td>
            </tr>

            {Array.isArray(report?.coolers) && report.coolers.length > 0 ? (
              (editing ? editCoolers : report.coolers).map((c, i) => (
                <tr key={i}>
                  <td style={tdB(false)}>{labelForCooler(i)}</td>
                  {COOLER_TIMES.map((time) => {
                    const srcTemps = editing ? editCoolers[i]?.temps || {} : report.coolers[i]?.temps || {};
                    const raw = srcTemps[time];
                    const val = raw === undefined || raw === "" || raw === null
                      ? (editing ? "" : "—")
                      : String(raw).trim() + (!editing ? "°C" : "");
                    return (
                      <td key={time} style={tdB(true)}>
                        {editing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={String(raw ?? "")}
                            onChange={(e) => setTemp(i, time, e.target.value)}
                            style={{ width: 70, padding: "4px 6px" }}
                            placeholder=".."
                          />
                        ) : val}
                      </td>
                    );
                  })}
                  <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {editing ? (
                      <input
                        value={c?.remarks ?? ""}
                        onChange={(e) => setRemarksRow(i, e.target.value)}
                        style={{ width: "100%", padding: "4px 6px" }}
                        placeholder="Remarks"
                      />
                    ) : (c?.remarks || "")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COOLER_TIMES.length + 2} style={{ ...tdB(true), color: "#6b7280" }}>
                  No coolers data.
                </td>
              </tr>
            )}

            {(report?.loadingArea || editing) && (
              <tr>
                <td style={{ ...tdB(false), fontWeight: 800 }}>Loading Area</td>
                {COOLER_TIMES.map((time) => {
                  const srcTemps = editing ? editLoadingArea?.temps || {} : report?.loadingArea?.temps || {};
                  const raw = srcTemps?.[time];
                  const val = raw === undefined || raw === "" || raw === null
                    ? (editing ? "" : "—")
                    : String(raw).trim() + (!editing ? "°C" : "");
                  return (
                    <td key={`la-${time}`} style={tdB(true)}>
                      {editing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={String(raw ?? "")}
                          onChange={(e) => setLoadingTemp(time, e.target.value)}
                          style={{ width: 70, padding: "4px 6px" }}
                          placeholder=".."
                        />
                      ) : val}
                    </td>
                  );
                })}
                <td style={{ ...tdB(false), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {editing ? (
                    <input
                      value={editLoadingArea?.remarks ?? ""}
                      onChange={(e) => setLoadingRemarks(e.target.value)}
                      style={{ width: "100%", padding: "4px 6px" }}
                      placeholder="Remarks"
                    />
                  ) : (report?.loadingArea?.remarks || "")}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* أسفل التقرير: Verified by */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontWeight: 700 }}>Verified by:</span>
            <span
              style={{
                padding: "6px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                minWidth: 240,
                background: "#fff",
                fontWeight: 700,
              }}
            >
              {report?.verifiedByManager || "—"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
