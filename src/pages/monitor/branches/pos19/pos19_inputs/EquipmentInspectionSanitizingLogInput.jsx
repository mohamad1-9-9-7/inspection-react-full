// src/pages/monitor/branches/pos19/pos19_inputs/EquipmentInspectionSanitizingLogInput.jsx
import React, { useMemo, useState } from "react";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "pos19_equipment_inspection";
const BRANCH = "POS 19";

// نوافذ التعقيم الثابتة
const SLOTS = [
  { key: "s_8_9_AM",   label: "8-9 AM" },
  { key: "s_12_1_PM",  label: "12-1 PM" },
  { key: "s_4_5_PM",   label: "4-5 PM" },
  { key: "s_8_9_PM",   label: "8-9 PM" },
  { key: "s_12_1_AM",  label: "12-1 AM" },
];

// قالب صف (بدون عمود التاريخ)
function emptyRow(name = "") {
  const base = {
    equipment: name,
    freeFromDamage: "",        // Yes / No
    freeFromBrokenPieces: "",  // Yes / No
    correctiveAction: "",
    checkedByRow: "",
  };
  SLOTS.forEach(s => (base[s.key] = ""));  // "", "√", "✗"
  return base;
}

// قائمة افتراضية مثل الصورة
const DEFAULT_EQUIP = [
  "Cutting Board, Knives, Wrapping Machine, Weighing Scale",
  "Slicer, Grater",
  "Bone saw Machine , Mincer",
];

export default function EquipmentInspectionSanitizingLogInput() {
  const [date, setDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  const [section, setSection] = useState("");
  const [classification] = useState("Official"); // ثابت مثل النموذج
  const [rows, setRows] = useState(() => DEFAULT_EQUIP.map(n => emptyRow(n)));

  const [verifiedBy, setVerifiedBy] = useState("");
  const [revDate, setRevDate]       = useState("");
  const [revNo, setRevNo]           = useState("");
  const [saving, setSaving]         = useState(false);

  // styles
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

  const th = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };
  const td = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const input = {
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
  const btn = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  const legend = (
    <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
      <strong>Legend: (√) — Satisfactory ; (✗) — Needs Improvement</strong>
    </div>
  );

  function updateCell(rIdx, key, val) {
    setRows(prev => {
      const next = [...prev];
      next[rIdx] = { ...next[rIdx], [key]: val };
      return next;
    });
  }
  function addRow()   { setRows(prev => [...prev, emptyRow("")]); }
  function removeRow(i){ setRows(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ"); return; }

    // شرط منطقي: وجود No أو ✗ يستلزم Corrective Action
    for (const r of rows) {
      const hasRisk =
        r.freeFromDamage === "No" ||
        r.freeFromBrokenPieces === "No" ||
        SLOTS.some(s => r[s.key] === "✗");
      if (hasRisk && !r.correctiveAction.trim()) {
        alert("هناك صف به ملاحظة (✗ أو No) بدون إجراء تصحيحي. الرجاء تعبئة Corrective Action.");
        return;
      }
    }

    const payload = {
      branch: BRANCH,
      formRef: "UC/HACCP/BR/F17",
      classification,
      section,
      reportDate: date,            // تاريخ عام للتقرير
      slots: SLOTS.map(s => s.key),
      entries: rows.map(r => ({ ...r })),
      verifiedBy,
      revDate,
      revNo,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  // colgroup: بدون عمود التاريخ
  const colDefs = useMemo(() => {
    const arr = [
      <col key="equip" style={{ width: 280 }} />,
      <col key="freeDamage" style={{ width: 140 }} />,
      <col key="freeBroken" style={{ width: 160 }} />,
      ...SLOTS.map((_, i) => <col key={`s${i}`} style={{ width: 90 }} />),
      <col key="corr" style={{ width: 220 }} />,
      <col key="checkedBy" style={{ width: 140 }} />,
      <col key="actions" style={{ width: 80 }} />,
    ];
    return arr;
  }, []);

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:72, height:72, objectFit:"contain" }} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Union Coop</div>
          <div style={{ fontWeight:800, fontSize:16 }}>Equipment Inspection &amp; Sanitizing Log</div>
        </div>

        {/* حقول الهيدر على اليمين */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 200px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>UC/HACCP/BR/F17</div>
          <div>Section :</div>       <input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...input, borderColor:"#1f3b70" }} />
          <div>Classification :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{classification}</div>
          <div>Date :</div>          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...input, borderColor:"#1f3b70" }} />
          <div>Branch :</div>        <div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{BRANCH}</div>
        </div>
      </div>

      {/* عنوان مجموعة التعقيم + الليجند */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...th, background:"#e9f0ff" }}>Sanitize every 4 hours</div>
        <div style={{ fontSize:11, textAlign:"center", padding:"6px 0", color:"#0b1f4d" }}>
          <strong>Legend: (√) — Satisfactory ; (✗) — Needs Improvement</strong>
        </div>
      </div>

      {/* الجدول */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={th}>Equipment’s</th>
              <th style={th}>Free from{"\n"}damage{"\n"}(yes/no)</th>
              <th style={th}>Free from{"\n"}broken{"\n"}metal/plastic pieces{"\n"}(yes/no)</th>
              {SLOTS.map(s => <th key={s.key} style={th}>{s.label}</th>)}
              <th style={th}>Corrective{"\n"}Action{"\n"}(if any)</th>
              <th style={th}>Checked{"\n"}by</th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const risky =
                r.freeFromDamage === "No" ||
                r.freeFromBrokenPieces === "No" ||
                SLOTS.some(s => r[s.key] === "✗");
              return (
                <tr key={i}>
                  <td style={td}>
                    <input
                      value={r.equipment}
                      onChange={(e)=>updateCell(i, "equipment", e.target.value)}
                      style={input}
                      placeholder="Equipment name"
                    />
                  </td>
                  <td style={td}>
                    <select
                      value={r.freeFromDamage}
                      onChange={(e)=>updateCell(i, "freeFromDamage", e.target.value)}
                      style={input}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td style={td}>
                    <select
                      value={r.freeFromBrokenPieces}
                      onChange={(e)=>updateCell(i, "freeFromBrokenPieces", e.target.value)}
                      style={input}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  {SLOTS.map(s => (
                    <td style={td} key={s.key}>
                      <select
                        value={r[s.key]}
                        onChange={(e)=>updateCell(i, s.key, e.target.value)}
                        style={{
                          ...input,
                          background: r[s.key]==="√" ? "#e7f7ec" : r[s.key]==="✗" ? "#fde8e8" : "#fff"
                        }}
                        title="√ = Satisfactory, ✗ = Needs Improvement"
                      >
                        <option value=""></option>
                        <option value="√">√</option>
                        <option value="✗">✗</option>
                      </select>
                    </td>
                  ))}

                  <td style={td}>
                    <input
                      value={r.correctiveAction}
                      onChange={(e)=>updateCell(i, "correctiveAction", e.target.value)}
                      style={{ ...input, background: risky ? "#fff7ed" : "#fff" }}
                      placeholder={risky ? "Required when ✗ or No" : "Optional"}
                    />
                  </td>
                  <td style={td}>
                    <input
                      value={r.checkedByRow}
                      onChange={(e)=>updateCell(i, "checkedByRow", e.target.value)}
                      style={input}
                    />
                  </td>
                  <td style={td}>
                    <button onClick={()=>removeRow(i)} style={btn("#dc2626")}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* أزرار التحكم */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addRow} style={btn("#0ea5e9")}>Add Row</button>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Equipment Log"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={input} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev.Date:</span>
          <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={input} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev.No:</span>
          <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={input} />
        </div>
        <div />
      </div>
    </div>
  );
}
