// src/pages/monitor/branches/qcs/DailyCleanlinessTab.jsx
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

/* -------- Fallbacks / Defaults -------- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

const defaultDCHeader = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF-QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};
const defaultDCFooter = { checkedBy: "", verifiedBy: "" };

/* 🔒 نوع التقرير الخاص بهذا التبويب فقط */
const DC_TYPE = "qcs-cleanliness";

/* Small UI helper (key/value row) */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 170, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}

/* -------- Header / Footer -------- */
function DCEntryHeader({ header, date, logoUrl }) {
  const h = header || defaultDCHeader;
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={logoUrl || LOGO_FALLBACK} alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
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

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ background: "#d9d9d9", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background: "#e5e5e5", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          CLEANING CHECKLIST - WAREHOUSE
        </div>
        {date ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
            <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
            <span>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DCEntryFooter({ footer }) {
  const f = footer || defaultDCFooter;
  return (
    <div style={{ border: "1px solid #000", marginTop: 8 }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #000" }}>
        <div style={{ display: "flex", minHeight: 42 }}>
          <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 180, fontWeight: 900, textDecoration: "underline" }}>
            CHECKED BY: <span style={{ fontWeight: 400 }}>(QC-ASSIST)</span>
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{f.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000", minHeight: 42 }}>
          <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 180, fontWeight: 900, textDecoration: "underline" }}>
            VERIFIED BY:
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{f.verifiedBy || "\u00A0"}</div>
        </div>
      </div>

      <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
        <div>Remark: Frequency — Daily</div>
        <div>* (C = Conform &nbsp;&nbsp; N/C - Non Conform)</div>
      </div>
    </div>
  );
}

function DCHeaderEditor({ header, setHeader, footer, setFooter }) {
  const h = header || defaultDCHeader;
  const f = footer || defaultDCFooter;
  const updateHeader = (k, v) => typeof setHeader === "function" && setHeader({ ...h, [k]: v });
  const updateFooter = (k, v) => typeof setFooter === "function" && setFooter({ ...f, [k]: v });

  const row = { display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, alignItems: "center" };
  const input = { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" };

  return (
    <details style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 12, margin: "10px 0" }}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>⚙️ Edit Header & Footer (Cleaning)</summary>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={row}><span>Document Title</span><input style={input} value={h.documentTitle} onChange={e => updateHeader("documentTitle", e.target.value)} /></label>
          <label style={row}><span>Issue Date</span><input style={input} value={h.issueDate} onChange={e => updateHeader("issueDate", e.target.value)} /></label>
          <label style={row}><span>Area</span><input style={input} value={h.area} onChange={e => updateHeader("area", e.target.value)} /></label>
          <label style={row}><span>Controlling Officer</span><input style={input} value={h.controllingOfficer} onChange={e => updateHeader("controllingOfficer", e.target.value)} /></label>
        </div>
        <div>
          <label style={row}><span>Document No</span><input style={input} value={h.documentNo} onChange={e => updateHeader("documentNo", e.target.value)} /></label>
          <label style={row}><span>Revision No</span><input style={input} value={h.revisionNo} onChange={e => updateHeader("revisionNo", e.target.value)} /></label>
          <label style={row}><span>Issued By</span><input style={input} value={h.issuedBy} onChange={e => updateHeader("issuedBy", e.target.value)} /></label>
          <label style={row}><span>Approved By</span><input style={input} value={h.approvedBy} onChange={e => updateHeader("approvedBy", e.target.value)} /></label>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label style={row}><span>Checked By (QC-ASSIST)</span><input style={input} value={f.checkedBy} onChange={e => updateFooter("checkedBy", e.target.value)} /></label>
        <label style={row}><span>Verified By</span><input style={input} value={f.verifiedBy} onChange={e => updateFooter("verifiedBy", e.target.value)} /></label>
      </div>
    </details>
  );
}

/* -------- Default template -------- */
const TEMPLATE_SECTIONS = [
  { title: "Hand Washing Area", items: ["Tissue available", "Hair Net available", "Face Masks available"] },
  { title: "Chiller Room 1,2", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { title: "Chiller Room 5,6,7", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { title: "Freezer-1 (Room-8)", items: ["Floors", "Drainage", "Proper arrangement of Products", "Door"] },
  { title: "Packaging and Ingredients store Area", items: ["Floors cleaning", "Master cartons stacking", "Proper arrangement of packing products", "Proper arrangement of ingredients"] },
  { title: "Meat Cutting Room 3,4", items: ["Cutting Table", "Walls/Floors", "Cutting board", "Drainage", "Cutting Knife", "Waste basket", "Weighing scale", "Red crates", "Door"] },
  { title: "Machine Cleanliness", items: ["Sasusage machines", "Mincer machine", "Ice machine", "Wrapping machine", "Bone saw machine", "Vaccum packing machine", "Burger machine", "Mixer machine(Grinder)", "Refrigerator"] },
  { title: "Loading Area", items: ["Walls/Floors", "Trolleys"] },
  { title: "Waste Disposal", items: ["Collection of waste", "Disposal"] },
  { title: "Working Conditions & Cleanliness", items: ["Lights", "Fly Catchers", "Floor/wall", "Painting and Plastering", "Weighing Balance", "Tap Water"] },
];

function buildDefaultRows() {
  const rows = [];
  TEMPLATE_SECTIONS.forEach(sec => {
    rows.push({ isSection: true, section: sec.title });
    sec.items.forEach((item, idx) => {
      const letter = String.fromCharCode(97 + idx) + ")"; // a), b), c)...
      rows.push({
        isSection: false,
        letter,
        general: item,
        observation: "",
        informedTo: "",
        remarks: "",
        fromTemplate: true,
      });
    });
  });
  return rows;
}

/* -------- Table -------- */
function DailyCleanlinessTable({ rows, setRows }) {
  const list = Array.isArray(rows) ? rows : [];

  const onCell = (i, key, val) => {
    if (typeof setRows !== "function") return;
    setRows(prev => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const r = { ...(base[i] || {}) };
      r[key] = val;
      base[i] = r;
      return base;
    });
  };

  const addRow = () => {
    if (typeof setRows !== "function") return;
    setRows(prev => (Array.isArray(prev) ? [...prev, emptyRow()] : [emptyRow()]));
  };
  const removeRow = (i) => {
    if (typeof setRows !== "function") return;
    setRows(prev => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev));
  };
  const loadTemplate = () => {
    if (typeof setRows !== "function") return;
    setRows(buildDefaultRows());
  };

  const toolbar = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 };
  const btn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer" };

  return (
    <div>
      <div style={toolbar}>
        <button onClick={loadTemplate} style={btn}>📋 Load Default Template</button>
        <button onClick={addRow} style={btn}>➕ Add Row</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#d9d9d9", color: "#000" }}>
            <th style={th(70)}>SI-No</th>
            <th style={th(360)}>General Cleaning</th>
            <th style={th(110)}>Observation</th>
            <th style={th(240)}>Informed to</th>
            <th style={th(320)}>Remarks &amp; CA</th>
            <th style={th(80)}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => {
            if (r?.isSection) {
              return (
                <tr key={`sec-${i}`} style={{ background: "#f3f4f6", fontWeight: 800 }}>
                  <td style={tdCenter()}>—</td>
                  <td style={{ ...tdLeft(), fontWeight: 800 }}>{r.section || ""}</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>
                    <button onClick={() => removeRow(i)} style={btnDel()}>✖</button>
                  </td>
                </tr>
              );
            }
            const letter = r?.letter || `${i + 1}`;
            return (
              <tr key={i}>
                <td style={tdCenter()}>{letter}</td>

                {/* ثابت نصّياً مثل النموذج */}
                <td style={tdLeft()}>
                  <div style={textCell()} title={r?.general || ""}>{r?.general || ""}</div>
                </td>

                {/* Observation: C / N\C */}
                <td style={tdCenter()}>
                  <select
                    value={r?.observation || ""}
                    onChange={(e) => onCell(i, "observation", e.target.value)}
                    style={sel(64)}
                  >
                    <option value=""></option>
                    <option value="C">C</option>
                    <option value={"N\\C"}>N\C</option>
                  </select>
                </td>

                {/* Informed to */}
                <td style={tdLeft()}>
                  <input value={r?.informedTo || ""} onChange={(e) => onCell(i, "informedTo", e.target.value)} style={inp("100%")} />
                </td>

                {/* Remarks & CA */}
                <td style={tdLeft()}>
                  <input value={r?.remarks || ""} onChange={(e) => onCell(i, "remarks", e.target.value)} style={inp("100%")} />
                </td>

                <td style={tdCenter()}>
                  <button onClick={() => removeRow(i)} style={btnDel()}>✖</button>
                </td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...tdCenter(), color: "#6b7280" }}>
                No rows. Use “Load Default Template” or “Add Row”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* -------- Main Tab -------- */
export default function DailyCleanlinessTab({
  reportDate,
  cleanlinessRows,
  setCleanlinessRows,
  dcHeader,
  setDcHeader,
  dcFooter,
  setDcFooter,
  logoUrl,
}) {
  // تاريخ داخل التبويب
  const [date, setDate] = useState(() =>
    reportDate || new Date().toISOString().split("T")[0]
  );

  // لو ما وصل rows من الأب نبدأ بالتمبلت جاهزًا
  const [localRows, setLocalRows] = useState(() =>
    Array.isArray(cleanlinessRows) && cleanlinessRows.length > 0 ? cleanlinessRows : buildDefaultRows()
  );
  const rows = useMemo(
    () => (Array.isArray(cleanlinessRows) ? cleanlinessRows : localRows),
    [cleanlinessRows, localRows]
  );
  const updateRows = typeof setCleanlinessRows === "function" ? setCleanlinessRows : setLocalRows;

  // headers/footers
  const [localHeader, setLocalHeader] = useState(dcHeader || defaultDCHeader);
  const [localFooter, setLocalFooter] = useState(dcFooter || defaultDCFooter);
  const header = dcHeader || localHeader;
  const footer = dcFooter || localFooter;
  const setHeader = typeof setDcHeader === "function" ? setDcHeader : setLocalHeader;
  const setFooter = typeof setDcFooter === "function" ? setDcFooter : setLocalFooter;

  // حفظ للسيرفر الخارجي فقط
  const [saving, setSaving] = useState(false);

  /* =======================
     Server helpers (DC only)
  ======================= */
  async function listReportsByType(type) {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
      { method: "GET", cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  }

  async function fetchExistingDCByDate(dateStr) {
    const docs = await listReportsByType(DC_TYPE);
    const found = docs.find(r => String(r?.payload?.reportDate || "") === String(dateStr));
    return found ? { id: found._id || found.id, payload: found.payload || {} } : null;
  }

  async function saveDailyCleanliness() {
    try {
      setSaving(true);

      const existing = await fetchExistingDCByDate(date);

      // ✅ payload خاص بنظافة المستودع فقط
      const payload = {
        reportDate: date,
        cleanlinessRows: rows,
        headers: {
          dcHeader: header,
          dcFooter: footer,
        },
      };

      const body = {
        reporter: "QCS/CLEAN",
        type: DC_TYPE,             // 👈 نوع مستقل
        payload,                   // 👈 فقط حقول هذا التبويب
      };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update cleanliness report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create cleanliness report");
      }

      alert(`✅ Daily Cleanliness saved for ${date}. (type: ${DC_TYPE})`);
    } catch (e) {
      alert(`❌ Failed to save: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const card = { background: "#fff", padding: "1rem", marginBottom: "1rem", borderRadius: 12, boxShadow: "0 0 8px rgba(0,0,0,.10)" };

  return (
    <div>
      {/* شريط عنوان صغير مع تاريخ الإدخال داخل التبويب */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🧹 Daily Cleanliness</h3>
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

      <DCEntryHeader header={header} date={date} logoUrl={logoUrl || LOGO_FALLBACK} />
      <DCHeaderEditor header={header} setHeader={setHeader} footer={footer} setFooter={setFooter} />
      <h4 style={{ marginTop: 0 }}>Warehouse Daily Cleanliness</h4>

      <DailyCleanlinessTable rows={rows} setRows={updateRows} />

      <DCEntryFooter footer={footer} />

      {/* زر حفظ خاص بهذا التبويب فقط — على السيرفر الخارجي */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          onClick={saveDailyCleanliness}
          disabled={saving}
          style={{ padding: "10px 16px", borderRadius: 10, background: "#059669", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}
        >
          {saving ? "⏳ Saving..." : "💾 Save Daily Cleanliness"}
        </button>
      </div>
    </div>
  );
}

/* -------- small styles/helpers -------- */
function emptyRow() {
  // صف حر (ليس من التمبلت)
  return { isSection: false, letter: "", general: "", observation: "", informedTo: "", remarks: "" };
}
const th = (w) => ({ padding: "6px", border: "1px solid #000", textAlign: "center", fontSize: "0.85rem", width: w });
const tdCenter = () => ({ padding: "6px", border: "1px solid #000", textAlign: "center" });
const tdLeft = () => ({ padding: "6px", border: "1px solid #000", textAlign: "left" });

const inp = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",          // يمنع كسر الأعمدة
});

const sel = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  boxSizing: "border-box",
});

const textCell = () => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "2px 4px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const btnDel = () => ({ padding: "6px 10px", borderRadius: 8, border: "1px solid #ef4444", color: "#ef4444", background: "#fff", cursor: "pointer" });
