// src/pages/monitor/branches/qcs/PersonalHygieneTab.jsx
import React, { useState } from "react";

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
const MIN_ROWS_FALLBACK = 21;
const DEFAULT_NAMES = [
  "WELSON","GHITH","ROTIC","RAJU","ABED","KIDANY","MARK","SOULEMAN",
  "THEOPHIAUS","PRINCE","KWAKU ANTWI","KARTHICK","BHUVANESHWARAN",
  "JAYABHARATHI","PURUSHOTH","NASIR"
];
const defaultPHHeader = {
  documentTitle: "Personal Hygiene Checklist",
  documentNo: "FS-QM/REC/PH",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH QC",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};
const defaultPHFooter = { checkedBy: "", verifiedBy: "" };

/* ---- Small UI helpers ---- */
function RowKV({ label, value }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>{label}</div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}
function PHEntryHeader({ header, date, logoUrl }) {
  const h = header || defaultPHHeader;
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
          PERSONAL HYGIENE CHECKLIST
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
function PHEntryFooter({ footer }) {
  const f = footer || defaultPHFooter;
  return (
    <div style={{ border:"1px solid #000", marginTop:8 }}>
      <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>
      <div style={{ padding:"8px", borderBottom:"1px solid #000", minHeight:40 }}>
        <em>*(C - Conform &nbsp;&nbsp; N/C - Non Conform)</em>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        <div style={{ display:"flex" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>
            Checked By:
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{f.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display:"flex", borderInlineStart:"1px solid #000" }}>
          <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>
            Verified By:
          </div>
          <div style={{ padding:"6px 8px", flex:1 }}>{f.verifiedBy || "\u00A0"}</div>
        </div>
      </div>
    </div>
  );
}
function PHHeaderEditor({ header, setHeader, footer, setFooter }) {
  const h = header || defaultPHHeader;
  const f = footer || defaultPHFooter;
  const updateHeader = (k, v) => (typeof setHeader === "function") && setHeader({ ...h, [k]: v });
  const updateFooter = (k, v) => (typeof setFooter === "function") && setFooter({ ...f, [k]: v });

  const row = { display:"grid", gridTemplateColumns:"160px 1fr", gap:8, alignItems:"center" };
  const input = { padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8 };

  return (
    <details style={{ border:"1px dashed #cbd5e1", borderRadius:8, padding:12, margin: "10px 0" }}>
      <summary style={{ cursor:"pointer", fontWeight:800 }}>⚙️ Edit Header & Footer (Personal Hygiene)</summary>
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <label style={row}><span>Document Title</span><input style={input} value={h.documentTitle} onChange={e=>updateHeader("documentTitle", e.target.value)} /></label>
          <label style={row}><span>Issue Date</span><input style={input} value={h.issueDate} onChange={e=>updateHeader("issueDate", e.target.value)} /></label>
          <label style={row}><span>Area</span><input style={input} value={h.area} onChange={e=>updateHeader("area", e.target.value)} /></label>
          <label style={row}><span>Controlling Officer</span><input style={input} value={h.controllingOfficer} onChange={e=>updateHeader("controllingOfficer", e.target.value)} /></label>
        </div>
        <div>
          <label style={row}><span>Document No</span><input style={input} value={h.documentNo} onChange={e=>updateHeader("documentNo", e.target.value)} /></label>
          <label style={row}><span>Revision No</span><input style={input} value={h.revisionNo} onChange={e=>updateHeader("revisionNo", e.target.value)} /></label>
          <label style={row}><span>Issued By</span><input style={input} value={h.issuedBy} onChange={e=>updateHeader("issuedBy", e.target.value)} /></label>
          <label style={row}><span>Approved By</span><input style={input} value={h.approvedBy} onChange={e=>updateHeader("approvedBy", e.target.value)} /></label>
        </div>
      </div>
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <label style={row}><span>Checked By</span><input style={input} value={f.checkedBy} onChange={e=>updateFooter("checkedBy", e.target.value)} /></label>
        <label style={row}><span>Verified By</span><input style={input} value={f.verifiedBy} onChange={e=>updateFooter("verifiedBy", e.target.value)} /></label>
      </div>
    </details>
  );
}

/* ---- Table config ---- */
const COLUMNS = [
  { key: "nails", label: "Nails" },
  { key: "hair", label: "Hair" },
  { key: "notWearingJewelries", label: "Not wearing Jewelry" },
  { key: "wearingCleanCloth", label: "Wearing Clean Cloth / Hair Net / Hand Glove / Face masks / Shoe" },
  { key: "communicableDisease", label: "Communicable Disease" },
  { key: "openWounds", label: "Open wounds/sores & cut" },
];

/* ---- Helpers ---- */
function makeEmptyRow(name="") {
  return {
    employName: name,
    nails: "",
    hair: "",
    notWearingJewelries: "",
    wearingCleanCloth: "",
    communicableDisease: "",
    openWounds: "",
    remarks: "",
  };
}
function makeDefaultHygiene(min = MIN_ROWS_FALLBACK) {
  const rows = DEFAULT_NAMES.map(n => makeEmptyRow(n));
  while (rows.length < min) rows.push(makeEmptyRow(""));
  return rows;
}
const th = (w)=>({ padding:"6px", border:"1px solid #ccc", textAlign:"center", fontSize:"0.85rem", width:w });
const td = ()=>({ padding:"6px", border:"1px solid #ccc", textAlign:"center" });
const inp = (w)=>({
  width: w, maxWidth: "100%", padding:"6px 8px", borderRadius:8, border:"1px solid #cbd5e1", boxSizing:"border-box"
});
const sel = (w)=>({
  width: w, maxWidth:"100%", padding:"6px 8px", borderRadius:8, border:"1px solid #cbd5e1", background:"#fff", boxSizing:"border-box"
});

/* =========================
   Server helpers (external only)
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
async function fetchExistingByDate(dateStr) {
  const rows = await listReportsByType("qcs-daily");
  const found = rows.find(r => String(r?.payload?.reportDate || "") === String(dateStr));
  return found ? { id: found._id || found.id, payload: found.payload || {} } : null;
}

/* ================================================================== */
/*                        PersonalHygieneTab                           */
/* ================================================================== */
export default function PersonalHygieneTab(props) {
  const {
    reportDate,
    personalHygiene,
    setPersonalHygiene,
    phHeader,
    setPhHeader,
    phFooter,
    setPhFooter,
    minRows = MIN_ROWS_FALLBACK,
    logoUrl,
    onSave,
    saving = false,
  } = props || {};

  const [date, setDate] = useState(() => reportDate || new Date().toISOString().split("T")[0]);

  const useExternalRows = Array.isArray(personalHygiene) && typeof setPersonalHygiene === "function";
  const [localRows, setLocalRows] = useState(() => makeDefaultHygiene(minRows));
  const rows = useExternalRows ? personalHygiene : localRows;
  const setRows = useExternalRows ? setPersonalHygiene : setLocalRows;

  const useExternalHeader = phHeader && typeof setPhHeader === "function";
  const [localHeader, setLocalHeader] = useState(defaultPHHeader);
  const header = useExternalHeader ? phHeader : localHeader;
  const setHeader = useExternalHeader ? setPhHeader : setLocalHeader;

  const useExternalFooter = phFooter && typeof setPhFooter === "function";
  const [localFooter, setLocalFooter] = useState(defaultPHFooter);
  const footer = useExternalFooter ? phFooter : localFooter;
  const setFooter = useExternalFooter ? setPhFooter : setLocalFooter;

  const [savingLocal, setSavingLocal] = useState(false);

  async function savePHToServer() {
    try {
      setSavingLocal(true);

      const existing = await fetchExistingByDate(date);
      const mergedPayload = {
        ...(existing?.payload || {}),
        reportDate: date,
        personalHygiene: rows,
        headers: {
          ...(existing?.payload?.headers || {}),
          phHeader: header,
          phFooter: footer,
        },
      };

      const body = {
        reporter: "QCS",
        type: "qcs-daily",
        payload: mergedPayload,
      };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create report");
      }

      alert(`✅ Personal Hygiene saved for ${date}.`);
    } catch (e) {
      alert(`❌ Failed to save: ${e.message || e}`);
    } finally {
      setSavingLocal(false);
    }
  }

  const addRow = () => setRows(prev => ([...(Array.isArray(prev) ? prev : []), makeEmptyRow("")]));
  const removeRow = (i) => setRows(prev => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev));
  const fillDefaultNames = () => {
    setRows(prev => {
      const base = Array.isArray(prev) ? [...prev] : [];
      for (let i = 0; i < DEFAULT_NAMES.length; i++) {
        if (!base[i]) base[i] = makeEmptyRow(DEFAULT_NAMES[i]);
        else base[i] = { ...base[i], employName: DEFAULT_NAMES[i] };
      }
      return base;
    });
  };
  const ensureMin = () => {
    setRows(prev => {
      const base = Array.isArray(prev) ? [...prev] : [];
      while (base.length < (minRows || MIN_ROWS_FALLBACK)) base.push(makeEmptyRow(""));
      return base;
    });
  };

  const onCellChange = (rowIdx, key, value) => {
    setRows(prev => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const r = base[rowIdx] || makeEmptyRow("");
      base[rowIdx] = { ...r, [key]: value };
      return base;
    });
  };

  const toolbar = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 };
  const btnBase = { padding:"10px 14px", borderRadius: 10, cursor:"pointer", border:"1px solid #e5e7eb", background:"#fff", fontWeight:700 };
  const btnPrimary = { ...btnBase, background:"#059669", color:"#fff", border:"1px solid transparent" };
  const card = { background: "#fff", padding: "1rem", marginBottom: "1rem", borderRadius: 12, boxShadow: "0 0 8px rgba(0,0,0,.10)" };

  return (
    <div>
      {/* عنوان صغير + تاريخ إدخال داخل التبويب */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🧼 Personal Hygiene</h3>
        <label style={{ fontWeight: 700 }}>
          Date:{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </label>
      </div>

      <PHEntryHeader header={header} date={date} logoUrl={logoUrl} />
      <PHHeaderEditor header={header} setHeader={setHeader} footer={footer} setFooter={setFooter} />

      <div style={toolbar}>
        <button onClick={fillDefaultNames} style={btnBase}>Reset Default Names</button>
        <button onClick={ensureMin} style={btnBase}>Autofill to {minRows || MIN_ROWS_FALLBACK} rows</button>
        <button onClick={addRow} style={btnBase}>➕ Add Row</button>
      </div>

      {/* جدول */}
      <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
        <thead>
          <tr style={{ background:"#2980b9", color:"#fff" }}>
            <th style={th(60)}>S.No</th>
            <th style={th(180)}>Employee Name</th>
            {COLUMNS.map((c, i) => <th key={i} style={th(150)}>{c.label}</th>)}
            <th style={th(240)}>Remarks and Corrective Actions</th>
            <th style={th(70)}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td()}>{i + 1}</td>

              {/* Employee Name remains a free text input */}
              <td style={td()}>
                <input
                  value={r?.employName || ""}
                  onChange={(e)=>onCellChange(i, "employName", e.target.value)}
                  style={inp(180)}
                />
              </td>

              {/* All other hygiene columns are dropdowns: C / N\C */}
              {COLUMNS.map((c, idx) => (
                <td key={idx} style={td()}>
                  <select
                    value={r?.[c.key] || ""}
                    onChange={(e)=>onCellChange(i, c.key, e.target.value)}
                    style={sel(140)}
                  >
                    <option value=""></option>
                    <option value="C">C</option>
                    <option value={"N\\C"}>N\C</option>
                  </select>
                </td>
              ))}

              <td style={td()}>
                <input
                  value={r?.remarks || ""}
                  onChange={(e)=>onCellChange(i, "remarks", e.target.value)}
                  style={inp(240)}
                />
              </td>

              <td style={{ ...td(), textAlign:"center" }}>
                <button onClick={()=>removeRow(i)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #ef4444", color:"#ef4444", background:"#fff" }}>
                  ✖
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 3} style={{ ...td(), textAlign:"center", color:"#6b7280" }}>
                No rows yet. Use “Autofill” or “Add Row”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <PHEntryFooter footer={footer} />

      {/* زر الحفظ — إذا الأب مرّر onSave سنستعمله، وإلا نستعمل الحفظ المحلي للسيرفر الخارجي */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:12 }}>
        <button
          onClick={typeof onSave === "function" ? onSave : savePHToServer}
          disabled={saving || savingLocal}
          style={btnPrimary}
        >
          {saving || savingLocal ? "⏳ Saving..." : "💾 Save Personal Hygiene"}
        </button>
      </div>
    </div>
  );
}
