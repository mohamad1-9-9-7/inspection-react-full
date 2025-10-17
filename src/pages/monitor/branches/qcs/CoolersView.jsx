// src/pages/monitor/branches/qcs/CoolersView.jsx
import React, { useEffect, useMemo, useState } from "react";

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
async function getReportByTypeAndDate(type, date) {
  const rows = await listReportsByType(type);
  const found = rows.find((r) => {
    const p = r?.payload || {};
    const d = String(
      p.reportDate ||
      p.date ||
      p.header?.reportEntryDate ||
      p.meta?.entryDate ||
      ""
    ).trim();
    return d === String(date);
  });
  return found?.payload || null;
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

/* ===== ثوابت/مساعدات محلية (تصميم/هيدر) ===== */
const LOGO_URL = "/brand/al-mawashi.jpg";
const COOLER_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];
const thB = (center=false)=>({
  border:"1px solid #000", padding:"4px", fontWeight:800,
  textAlign:center?"center":"left", whiteSpace:"nowrap",
});
const tdB = (center=false)=>({
  border:"1px solid #000", padding:"4px", textAlign:center?"center":"left",
});
function labelForCooler(i){
  return i===7 ? "FREEZER" : (i===2||i===3) ? "Production Room" : `Cooler ${i+1}`;
}

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

        {/* ✅ Report Date (داخل الهيدر) */}
        <div style={{ borderTop:"1px solid #000" }}>
          <div style={{ display:"flex" }}>
            <div style={{padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700}}>
              Report Date:
            </div>
            <div style={{padding:"6px 8px", flex:1}}>
              {reportDate || "—"}
            </div>
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
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);             // YYYY-MM-DD
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);          // ISO
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);               // already D/M/Y
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

/* ===== المكوّن ===== */
export default function CoolersView({ selectedDate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [report, setReport] = useState(null);               // payload + {date}
  const [editing, setEditing] = useState(false);
  const [editCoolers, setEditCoolers] = useState([]);
  const [editLoadingArea, setEditLoadingArea] = useState({ temps:{}, remarks:"" });

  // ✅ تاريخ معروض يدعم القديم والجديد
  const reportDateText = useMemo(() => {
    const d =
      selectedDate ||
      report?.reportDate ||
      report?.date ||
      report?.header?.reportEntryDate ||
      report?.meta?.entryDate ||
      report?.created_at ||
      "";
    return formatDMYSmart(d);
  }, [selectedDate, report]);

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

  // تحميل التقرير
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let repPayload = null;
        let repDate = selectedDate;

        if (selectedDate) {
          repPayload = await getReportByTypeAndDate(TYPE_COOLERS, selectedDate);
        } else {
          const rows = await listReportsByType(TYPE_COOLERS);
          if (rows.length) {
            rows.sort((a,b) => {
              const da = new Date(extractAnyDate(a)).getTime() || 0;
              const db = new Date(extractAnyDate(b)).getTime() || 0;
              return db - da; // أحدث أولاً
            });
            repPayload = rows[0]?.payload || null;
            repDate = toYMD(extractAnyDate(rows[0]));
          }
        }

        const rep = repPayload ? { date: repDate, ...repPayload } : null;
        if (cancelled) return;

        setReport(rep);

        // إعداد النسخ القابلة للتحرير
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

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
      const dateToSave =
        report?.reportDate ||
        selectedDate ||
        report?.date ||
        report?.header?.reportEntryDate ||
        report?.meta?.entryDate ||
        toYMD(report?.created_at) ||
        "";
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
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save coolers.");
    } finally {
      setSaving(false);
    }
  };

  const hasCoolers = Array.isArray(report?.coolers) && report.coolers.length > 0;
  const hasLoadingArea = !!report?.loadingArea;

  return (
    <>
      <TMPPrintHeader header={tmpHeader} reportDate={reportDateText} />

      {/* أدوات التحرير */}
      <div className="no-print" style={{ display:"flex", gap:8, justifyContent:"flex-end", margin:"8px 0" }}>
        {!editing ? (
          <button onClick={()=>setEditing(true)} style={btnOutline} disabled={loading || !report}>✏️ Edit</button>
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
            {COOLER_TIMES.map((t) => (
              <th key={t} style={thB(true)}>{t}</th>
            ))}
            <th style={thB(false)}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {/* ✅ سطر التاريخ أعلى الجدول (داخل tbody لضمان الظهور) */}
          <tr>
            <td
              colSpan={COOLER_TIMES.length + 2}
              style={{
                ...tdB(false),
                textAlign: "left",
                background: "#f3f4f6",
                fontWeight: 800,
              }}
            >
              Report Date: <span style={{ fontWeight: 900 }}>{reportDateText || "—"}</span>
            </td>
          </tr>

          {hasCoolers &&
            (editing ? editCoolers : report.coolers).map((c, i) => (
              <tr key={i}>
                <td style={tdB(false)}>{labelForCooler(i)}</td>
                {COOLER_TIMES.map((time) => {
                  const srcTemps = editing ? editCoolers[i]?.temps || {} : report.coolers[i]?.temps || {};
                  const raw = srcTemps[time];
                  const val =
                    raw === undefined || raw === "" || raw === null
                      ? editing ? "" : "—"
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
            ))}

          {(hasLoadingArea || editing) && (
            <tr>
              <td style={{ ...tdB(false), fontWeight: 800 }}>Loading Area</td>
              {COOLER_TIMES.map((time) => {
                const srcTemps = editing ? editLoadingArea?.temps || {} : report?.loadingArea?.temps || {};
                const raw = srcTemps?.[time];
                const val =
                  raw === undefined || raw === "" || raw === null
                    ? editing ? "" : "—"
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

          {!hasCoolers && !hasLoadingArea && (
            <tr>
              <td colSpan={COOLER_TIMES.length + 2} style={{ ...tdB(true), color: "#6b7280" }}>
                No coolers data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
