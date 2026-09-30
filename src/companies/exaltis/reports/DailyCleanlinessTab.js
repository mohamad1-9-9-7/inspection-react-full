// src/pages/monitor/branches/sweets/DailyCleanlinessTab.js
import { Bi } from "./bilingual";
import React, { useMemo, useState } from "react";
import {
  getLatestReport,
  getReportRowByDate,
  payloadOf,
  reportId,
} from "../_shared/reportApi";

/* =========================
   API base (CRA + Vite safe)
========================= */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try {
  VITE_URL = import.meta.env?.VITE_API_URL;
} catch {}

const API_BASE = (VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* -------- Fallbacks / Defaults -------- */
const LOGO_FALLBACK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/* new Date().toISOString() is UTC — a UAE user (UTC+4) opening this tab
   between local midnight and ~4am would silently default to "yesterday". */
function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

const defaultDCHeader = {
  documentTitle: "",
  documentNo: "",
  issueDate: "",
  revisionNo: "",
  area: "",
  issuedBy: "",
  controllingOfficer: "",
  approvedBy: "",
};

// ✅ Auto-fill  (editable)
const DEFAULT_SIGN_NAME = "";
const defaultDCFooter = { checkedBy: DEFAULT_SIGN_NAME, verifiedBy: DEFAULT_SIGN_NAME };

/* --------- النوع المستقل لهذا التبويب --------- */
const CLEAN_TYPE = "sweets-clean";

/* Small UI helper (key/value row) */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "6px 8px",
          borderInlineEnd: "1px solid #000",
          minWidth: 170,
          fontWeight: 700,
        }}
      >
        <Bi en={label} />
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
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt=""
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
          />
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
        <div
          style={{
            background: "#d9d9d9",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          
        </div>
        <div
          style={{
            background: "#e5e5e5",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          <Bi en="DAILY CLEANING CHECKLIST" ar="قائمة فحص التنظيف اليومي" />
        </div>
        {date ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
            <span style={{ fontWeight: 900, textDecoration: "underline" }}><Bi en="Date:" /></span>
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
        <Bi en="REMARKS / CORRECTIVE ACTIONS:" ar="الملاحظات / الإجراءات التصحيحية:" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #000" }}>
        <div style={{ display: "flex", minHeight: 42 }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 180,
              fontWeight: 900,
              textDecoration: "underline",
            }}
          >
            {/* ✅ label only */}
            <Bi en="CHECKED BY:" />
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{f.checkedBy || "\u00A0"}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000", minHeight: 42 }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 180,
              fontWeight: 900,
              textDecoration: "underline",
            }}
          >
            <Bi en="VERIFIED BY:" />
          </div>
          <div style={{ padding: "6px 8px", flex: 1 }}>{f.verifiedBy || "\u00A0"}</div>
        </div>
      </div>

      <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
        <div><Bi en="Remark: Frequency — Daily" ar="ملاحظة: التكرار — يومي" /></div>
        <div>* (C = Conform &nbsp;&nbsp; N/C - Non Conform) <Bi en="" ar="(C = مطابق · N/C = غير مطابق)" /></div>
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
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>⚙️ <Bi en="Edit Header & Footer (Cleaning)" ar="تعديل الترويسة والتذييل (التنظيف)" /></summary>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={row}>
            <span><Bi en="Document Title" /></span>
            <input style={input} value={h.documentTitle} onChange={(e) => updateHeader("documentTitle", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Issue Date" /></span>
            <input style={input} value={h.issueDate} onChange={(e) => updateHeader("issueDate", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Area" /></span>
            <input style={input} value={h.area} onChange={(e) => updateHeader("area", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Controlling Officer" /></span>
            <input
              style={input}
              value={h.controllingOfficer}
              onChange={(e) => updateHeader("controllingOfficer", e.target.value)}
            />
          </label>
        </div>
        <div>
          <label style={row}>
            <span><Bi en="Document No" /></span>
            <input style={input} value={h.documentNo} onChange={(e) => updateHeader("documentNo", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Revision No" /></span>
            <input style={input} value={h.revisionNo} onChange={(e) => updateHeader("revisionNo", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Issued By" /></span>
            <input style={input} value={h.issuedBy} onChange={(e) => updateHeader("issuedBy", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Approved By" /></span>
            <input style={input} value={h.approvedBy} onChange={(e) => updateHeader("approvedBy", e.target.value)} />
          </label>
        </div>
      </div>

      {/* ✅ auto-filled but editable */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label style={row}>
          <span><Bi en="Checked By" /></span>
          <input style={input} value={f.checkedBy} onChange={(e) => updateFooter("checkedBy", e.target.value)} />
        </label>
        <label style={row}>
          <span><Bi en="Verified By" /></span>
          <input style={input} value={f.verifiedBy} onChange={(e) => updateFooter("verifiedBy", e.target.value)} />
        </label>
      </div>
    </details>
  );
}

/* -------- Default template --------
   Confectionery premises (one branch, see src/industries/sweets/index.js).
   Only a NEW sheet starts from this list; a saved report keeps its own rows. */
const TEMPLATE_SECTIONS = [
  { title: "Hand Washing Station", items: ["Soap & sanitizer available", "Paper towels available", "Hair nets / masks / gloves available", "Hot & cold water"] },
  { title: "Raw Material & Dry Store", items: ["Floors / shelves clean", "Items off the floor (on pallets)", "Nuts & allergens stored separately and labelled", "Opened bags sealed and dated", "No spillage / pest signs"] },
  { title: "Chillers & Freezer", items: ["Floors / walls clean", "Door gaskets clean", "Cream & dairy covered and dated", "Raw and finished products separated"] },
  { title: "Mixing & Preparation Area", items: ["Work tables", "Walls / floors", "Mixers & bowls", "Utensils & spatulas", "Sieves", "Weighing scale", "Drainage"] },
  { title: "Baking Area", items: ["Ovens (inside / outside)", "Baking trays & moulds", "Proofer", "Cooling racks", "Floor / walls"] },
  { title: "Cream & Decoration Room", items: ["Tables & turntables", "Piping bags / nozzles", "Cream machines", "Room temperature controlled", "Floor / walls"] },
  { title: "Machine Cleanliness", items: ["Planetary mixers", "Dough sheeter", "Depositor / filling machine", "Blast chiller", "Nut grinder / roaster", "Packing / sealing machine"] },
  { title: "Packaging & Finished Goods", items: ["Packing tables", "Packaging material covered", "Labels / dates correct", "Finished products protected"] },
  { title: "Waste Disposal", items: ["Bins covered with lids", "Waste removed on time", "Waste area clean"] },
  { title: "Working Conditions", items: ["Lights covered / working", "Insect killers (EFK) working", "Floor / wall / ceiling condition", "No glass / brittle plastic hazard", "Toilets & changing room clean"] },
];

// ✅ Default observation = "C" for all NON-section rows (editable later)
function buildDefaultRows() {
  const rows = [];
  TEMPLATE_SECTIONS.forEach((sec) => {
    rows.push({ isSection: true, section: sec.title });
    sec.items.forEach((item, idx) => {
      const letter = String.fromCharCode(97 + idx) + ")"; // a), b), c)...
      rows.push({
        isSection: false,
        letter,
        general: item,
        observation: "C", // ✅ default
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
    setRows((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const r = { ...(base[i] || {}) };
      r[key] = val;
      base[i] = r;
      return base;
    });
  };

  const addRow = () => {
    if (typeof setRows !== "function") return;
    setRows((prev) => (Array.isArray(prev) ? [...prev, emptyRow()] : [emptyRow()]));
  };
  const removeRow = (i) => {
    if (typeof setRows !== "function") return;
    setRows((prev) => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev));
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
        <button onClick={loadTemplate} style={btn}>📋 <Bi en="Load Default Template" ar="تحميل القالب الافتراضي" /></button>
        <button onClick={addRow} style={btn}>➕ <Bi en="Add Row" /></button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#d9d9d9", color: "#000" }}>
            <th style={th(70)}><Bi en="SI-No" ar="م" stack center /></th>
            <th style={th(360)}><Bi en="General Cleaning" ar="التنظيف العام" stack center /></th>
            <th style={th(110)}><Bi en="Observation" stack center /></th>
            <th style={th(240)}><Bi en="Informed to" ar="أُبلغ إلى" stack center /></th>
            <th style={th(320)}><Bi en="Remarks & CA" ar="الملاحظات والإجراء التصحيحي" stack center /></th>
            <th style={th(80)}><Bi en="Actions" stack center /></th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => {
            if (r?.isSection) {
              return (
                <tr key={`sec-${i}`} style={{ background: "#f3f4f6", fontWeight: 800 }}>
                  <td style={tdCenter()}>—</td>
                  <td style={{ ...tdLeft(), fontWeight: 800 }}><Bi en={r.section || ""} /></td>
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
                  <div style={textCell()} title={r?.general || ""}><Bi en={r?.general || ""} nowrap /></div>
                </td>

                {/* Observation: default "C" (editable) */}
                <td style={tdCenter()}>
                  <select
                    value={r?.observation || "C"}
                    onChange={(e) => onCell(i, "observation", e.target.value)}
                    style={sel(64)}
                  >
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
                <Bi en="No rows. Use “Load Default Template” or “Add Row”." ar="لا توجد أسطر — استخدم «تحميل القالب» أو «إضافة سطر»." />
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
  const [date, setDate] = useState(() => reportDate || todayDubaiISO());

  // لو ما وصل rows من الأب نبدأ بالتمبلت جاهزًا
  const [localRows, setLocalRows] = useState(() =>
    Array.isArray(cleanlinessRows) && cleanlinessRows.length > 0 ? cleanlinessRows : buildDefaultRows()
  );
  const rows = useMemo(() => (Array.isArray(cleanlinessRows) ? cleanlinessRows : localRows), [cleanlinessRows, localRows]);
  const updateRows = typeof setCleanlinessRows === "function" ? setCleanlinessRows : setLocalRows;

  // headers/footers
  const [localHeader, setLocalHeader] = useState(dcHeader || defaultDCHeader);

  // ✅ ensure defaults on footer if empty/undefined
  const initFooter = () => {
    const incoming = dcFooter || defaultDCFooter;
    const checkedBy = String(incoming?.checkedBy || "").trim() ? incoming.checkedBy : DEFAULT_SIGN_NAME;
    const verifiedBy = String(incoming?.verifiedBy || "").trim() ? incoming.verifiedBy : DEFAULT_SIGN_NAME;
    return { ...incoming, checkedBy, verifiedBy };
  };

  const [localFooter, setLocalFooter] = useState(initFooter);

  const header = dcHeader || localHeader;
  const footer = dcFooter || localFooter;

  const setHeader = typeof setDcHeader === "function" ? setDcHeader : setLocalHeader;
  const setFooter = typeof setDcFooter === "function" ? setDcFooter : setLocalFooter;

  // حفظ للسيرفر (على نوع sweets-clean فقط)
  const [saving, setSaving] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);

  /* Targeted read — this used to download every cleanliness report ever saved
     just to discover whether this one date already had a record. */
  async function fetchExistingByDate(dateStr) {
    const row = await getReportRowByDate(CLEAN_TYPE, dateStr);
    return row ? { id: reportId(row), payload: payloadOf(row) } : null;
  }

  /* Brings the last saved checklist back and clears the date, so the user
     picks the day they are filling in rather than overwriting yesterday. */
  async function loadFromLast() {
    try {
      setLoadingLast(true);
      const hit = await getLatestReport(CLEAN_TYPE);
      if (!hit) {
        alert("ℹ️ No previous Daily Cleanliness report found. · لا يوجد تقرير سابق.");
        return;
      }
      const p = hit.payload || {};
      if (Array.isArray(p.cleanlinessRows) && p.cleanlinessRows.length) {
        updateRows(p.cleanlinessRows.map((r) => ({ ...emptyRow(), ...r })));
      }
      if (p.headers?.dcHeader) setHeader({ ...defaultDCHeader, ...p.headers.dcHeader });
      if (p.headers?.dcFooter) setFooter({ ...defaultDCFooter, ...p.headers.dcFooter });
      setDate("");
      alert(`✅ Loaded from ${hit.reportDate}. Now pick the date for today's record. · تم التحميل — اختر تاريخ سجل اليوم.`);
    } catch (e) {
      alert(`❌ Could not load the last report · تعذّر تحميل آخر تقرير: ${e.message || e}`);
    } finally {
      setLoadingLast(false);
    }
  }

  async function saveDailyCleanliness() {
    if (!date) {
      alert("⚠️ Pick a report date first. · اختر تاريخ التقرير أولاً.");
      return;
    }
    try {
      setSaving(true);

      const existing = await fetchExistingByDate(date);

      const mergedPayload = {
        ...(existing?.payload || {}),
        reportDate: date,
        cleanlinessRows: rows,
        headers: {
          ...(existing?.payload?.headers || {}),
          dcHeader: header,
          dcFooter: footer,
        },
      };

      const body = {
        reporter: "sweets",
        type: CLEAN_TYPE, // 👈 النوع الصحيح
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

      alert(`✅ Daily Cleanliness saved for ${date}. · تم حفظ النظافة اليومية.`);
    } catch (e) {
      alert(`❌ Failed to save · فشل الحفظ: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const card = {
    background: "#fff",
    padding: "1rem",
    marginBottom: "1rem",
    borderRadius: 12,
    boxShadow: "0 0 8px rgba(0,0,0,.10)",
  };

  return (
    <div>
      {/* شريط عنوان صغير مع تاريخ الإدخال داخل التبويب */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🧹 <Bi en="Daily Cleanliness" /></h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={loadFromLast}
            disabled={loadingLast}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 700,
              cursor: loadingLast ? "wait" : "pointer",
            }}
          >
            {loadingLast ? <>⏳ <Bi en="Loading…" /></> : <>📋 <Bi en="Load from last report" ar="تحميل من آخر تقرير" /></>}
          </button>
          <label style={{ fontWeight: 700 }}>
            <Bi en="Date:" />{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: date ? "1px solid #cbd5e1" : "2px solid #f59e0b",
              }}
            />
          </label>
        </div>
      </div>

      <DCEntryHeader header={header} date={date} logoUrl={logoUrl || LOGO_FALLBACK} />
      <DCHeaderEditor header={header} setHeader={setHeader} footer={footer} setFooter={setFooter} />
      <h4 style={{ marginTop: 0 }}><Bi en="Daily Cleanliness" /></h4>

      <DailyCleanlinessTable rows={rows} setRows={updateRows} />

      <DCEntryFooter footer={footer} />

      {/* زر حفظ خاص بهذا التبويب فقط */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          onClick={saveDailyCleanliness}
          disabled={saving}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#059669",
            color: "#fff",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
          }}
        >
          {saving ? <>⏳ <Bi en="Saving..." /></> : <>💾 <Bi en="Save Daily Cleanliness" ar="حفظ النظافة اليومية" /></>}
        </button>
      </div>
    </div>
  );
}

/* -------- small styles/helpers -------- */
function emptyRow() {
  // ✅ new free row defaults to C
  return { isSection: false, letter: "", general: "", observation: "C", informedTo: "", remarks: "" };
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
  boxSizing: "border-box", // يمنع كسر الأعمدة
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

const btnDel = () => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  color: "#ef4444",
  background: "#fff",
  cursor: "pointer",
});
