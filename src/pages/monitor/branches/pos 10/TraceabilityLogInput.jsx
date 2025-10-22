// D:\inspection-react-full\src\pages\monitor\branches\pos 10\TraceabilityLogInput.jsx
import React, { useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== ثابت التقرير ===== */
const TYPE   = "pos10_traceability_log";
const BRANCH = "POS 10";

/* ===== الأعمدة ===== */
const COLS = [
  { key: "rawName",       label: "Name of Raw Material Used for Preparation" },
  { key: "origProdDate",  label: "Original Production Date" },
  { key: "origExpDate",   label: "Original Expiry Date" },
  { key: "openedDate",    label: "Opened Date" },
  { key: "bestBefore",    label: "Best Before Date" },
  { key: "finalName",     label: "Name of Product Prepared (Final Product)" },
  { key: "finalProdDate", label: "Production Date (Final Product)" },
  { key: "finalExpDate",  label: "Expiry Date (Final Product)" },
];

function emptyRow() {
  const base = {};
  COLS.forEach((c) => (base[c.key] = ""));
  return base;
}

export default function TraceabilityLogInput() {
  /* ===== ترويسة ===== */
  const [section, setSection] = useState("");
  const [date, setDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });

  /* ===== بيانات ===== */
  const [rows, setRows] = useState(() => Array.from({ length: 6 }, () => emptyRow()));
  const [checkedBy, setCheckedBy]   = useState(""); // يسار (أسفل)
  const [verifiedBy, setVerifiedBy] = useState(""); // يمين (أسفل)
  const [saving, setSaving] = useState(false);

  /* ===== تنسيقات ===== */
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

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

  /* ===== colgroup ===== */
  const colDefs = useMemo(() => {
    const arr = [
      <col key="del" style={{ width: 44 }} />,
      <col key="rawName" style={{ width: 260 }} />,
      <col key="origProdDate" style={{ width: 140 }} />,
      <col key="origExpDate" style={{ width: 140 }} />,
      <col key="openedDate" style={{ width: 120 }} />,
      <col key="bestBefore" style={{ width: 140 }} />,
      <col key="finalName" style={{ width: 260 }} />,
      <col key="finalProdDate" style={{ width: 160 }} />,
      <col key="finalExpDate" style={{ width: 160 }} />,
    ];
    return arr;
  }, []);

  /* ===== عمليات الصف ===== */
  function updateRow(i, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }
  const addRow    = () => setRows((r) => [...r, emptyRow()]);
  const deleteRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  /* ===== حفظ ===== */
  async function handleSave() {
    // 1) تاريخ إلزامي
    if (!date) { alert("الرجاء تحديد التاريخ."); return; }

    // 2) وجود صف واحد على الأقل فيه بيانات
    const rowKeys = ["rawName","origProdDate","origExpDate","openedDate","bestBefore","finalName","finalProdDate","finalExpDate"];
    const hasAtLeastOneFilledRow = rows.some(r =>
      rowKeys.some(k => (r[k] ?? "").toString().trim() !== "")
    );
    if (!hasAtLeastOneFilledRow) {
      alert("الرجاء تعبئة سطر واحد على الأقل في الجدول قبل الحفظ.");
      return;
    }

    // 3) الحقول الإلزامية أسفل الصفحة
    if (!checkedBy.trim()) {
      alert("حقل Checked by إلزامي. الرجاء إدخال الاسم.");
      return;
    }
    if (!verifiedBy.trim()) {
      alert("حقل Verified by إلزامي. الرجاء إدخال الاسم.");
      return;
    }

    setSaving(true);

    // تنظيف القيم (trim) قبل الإرسال، وإسقاط الصفوف الفارغة
    const entries = rows
      .map((r) => ({
        rawName:       (r.rawName || "").trim(),
        origProdDate:  (r.origProdDate || "").trim(),
        origExpDate:   (r.origExpDate || "").trim(),
        openedDate:    (r.openedDate || "").trim(),
        bestBefore:    (r.bestBefore || "").trim(),
        finalName:     (r.finalName || "").trim(),
        finalProdDate: (r.finalProdDate || "").trim(),
        finalExpDate:  (r.finalExpDate || "").trim(),
      }))
      .filter((r) => rowKeys.some((k) => (r[k] ?? "").toString().trim() !== ""));

    const payload = {
      branch: BRANCH,
      section: section.trim(),
      reportDate: date,
      entries,
      checkedBy: checkedBy.trim(),   // إلزامي
      verifiedBy: verifiedBy.trim(), // إلزامي
      savedAt: Date.now(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos10", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Traceability Log – {BRANCH}</div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 180px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Section :</div><input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Date :</div><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>—</th>
              <th style={thCell}>Name of Raw Material Used for Preparation</th>
              <th style={thCell}>Original Production Date</th>
              <th style={thCell}>Original Expiry Date</th>
              <th style={thCell}>Opened Date</th>
              <th style={thCell}>Best Before Date</th>
              <th style={thCell}>Name of Product Prepared (Final Product)</th>
              <th style={thCell}>Production Date (Final Product)</th>
              <th style={thCell}>Expiry Date (Final Product)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdCell, padding:"2px" }}>
                  <button
                    onClick={() => deleteRow(i)}
                    title="Delete row"
                    style={{
                      width: "32px", height: "28px",
                      border: "1px solid #ef4444",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      borderRadius: 6,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </td>

                <td style={tdCell}>
                  <input
                    type="text"
                    placeholder="Raw material name"
                    value={r.rawName}
                    onChange={(e) => updateRow(i, "rawName", e.target.value)}
                    style={inputStyle}
                  />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.origProdDate} onChange={(e) => updateRow(i, "origProdDate", e.target.value)} style={inputStyle} />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.origExpDate} onChange={(e) => updateRow(i, "origExpDate", e.target.value)} style={inputStyle} />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.openedDate} onChange={(e) => updateRow(i, "openedDate", e.target.value)} style={inputStyle} />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.bestBefore} onChange={(e) => updateRow(i, "bestBefore", e.target.value)} style={inputStyle} />
                </td>

                <td style={tdCell}>
                  <input
                    type="text"
                    placeholder="Final product name"
                    value={r.finalName}
                    onChange={(e) => updateRow(i, "finalName", e.target.value)}
                    style={inputStyle}
                  />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.finalProdDate} onChange={(e) => updateRow(i, "finalProdDate", e.target.value)} style={inputStyle} />
                </td>

                <td style={tdCell}>
                  <input type="date" value={r.finalExpDate} onChange={(e) => updateRow(i, "finalExpDate", e.target.value)} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addRow} style={btnStyle("#10b981")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Log"}
        </button>
      </div>

      {/* Footer – Checked يسار | Verified يمين */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
          gap: 12,
          width: "100%",
        }}
      >
        {/* يسار: Checked by (إلزامي) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <span style={{ fontSize: 12 }}>Checked by:</span>
          <input
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={inputStyle}
            placeholder="Operator / Preparer"
          />
        </div>

        {/* يمين: Verified by (إلزامي) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <span style={{ fontSize: 12 }}>Verified by:</span>
          <input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={inputStyle}
            placeholder="Supervisor / QA"
          />
        </div>
      </div>

      {/* ===== Note (أسفل التقرير) ===== */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "2px solid #1f3b70",
          fontSize: 12,
          color: "#0b1f4d",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#0b1f4d" }}>Note:</strong>
        <span style={{ marginInlineStart: 4 }}>
          The raw materials used for the preparation and the final product details should be recorded in the
          <span style={{ fontWeight: 800 }}> “Traceability Record Form”</span>.
        </span>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}
