// src/pages/monitor/branches/pos19/pos19_inputs/EquipmentInspectionSanitizingLogInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_equipment_inspection";
const BRANCH   = "WARQA KITCHEN";
const FORM_REF = "FS-HACCP/KTCH/EQP/02";

const SLOTS = [
  { key: "s_8_9_AM",  label: "8-9 AM" },
  { key: "s_12_1_PM", label: "12-1 PM" },
  { key: "s_4_5_PM",  label: "4-5 PM" },
  { key: "s_8_9_PM",  label: "8-9 PM" },
  { key: "s_12_1_AM", label: "12-1 AM" },
];

function emptyRow(name = "") {
  const base = {
    equipment: name,
    freeFromDamage: "",
    freeFromBrokenPieces: "",
    correctiveAction: "",
    checkedByRow: "",
  };
  SLOTS.forEach(s => (base[s.key] = ""));
  return base;
}

const DEFAULT_EQUIP = [
  "Cutting Board, Knives, Wrapping Machine, Weighing Scale",
  "Slicer, Grater",
  "Bone saw Machine , Mincer",
];

/* ── الخارق 1 Design Tokens ── */
const C = {
  navy:      "#1e3a5f",
  navyLight: "#2d5a8e",
  accent:    "#3b82f6",
  accentBg:  "#eff6ff",
  teal:      "#0d9488",
  tealBg:    "#f0fdfa",
  red:       "#dc2626",
  green:     "#16a34a",
  gray50:    "#f9fafb",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#374151",
  white:     "#ffffff",
  border:    "#dbeafe",
};

const thCell = {
  border: `1px solid ${C.navy}`, padding: "10px 6px",
  textAlign: "center", whiteSpace: "pre-line",
  fontWeight: 700, fontSize: 12,
  background: "#dbeafe", color: C.navy, lineHeight: 1.4,
};
const tdCell = {
  border: `1px solid #bfdbfe`, padding: "8px 6px",
  textAlign: "center", verticalAlign: "middle",
  fontSize: 13, background: C.white,
};
const inputSt = {
  width: "100%", boxSizing: "border-box",
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "7px 8px", display: "block",
  overflow: "hidden", textOverflow: "ellipsis",
  whiteSpace: "nowrap", minWidth: 0, fontSize: 13,
};
const actionBtn = (bg, disabled = false) => ({
  background: disabled ? C.gray200 : bg,
  color: disabled ? C.gray400 : C.white,
  border: "none", borderRadius: 8,
  padding: "8px 14px", fontWeight: 700,
  fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
});

export default function EquipmentInspectionSanitizingLogInput() {
  const [date, setDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  const [section, setSection]       = useState("");
  const [classification]            = useState("Official");
  const [rows, setRows]             = useState(() => DEFAULT_EQUIP.map(n => emptyRow(n)));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving]         = useState(false);

  const colDefs = useMemo(() => [
    <col key="equip"      style={{ width: 280 }} />,
    <col key="freeDamage" style={{ width: 140 }} />,
    <col key="freeBroken" style={{ width: 160 }} />,
    ...SLOTS.map((_, i) => <col key={`s${i}`} style={{ width: 90 }} />),
    <col key="corr"       style={{ width: 220 }} />,
    <col key="checkedBy"  style={{ width: 140 }} />,
    <col key="actions"    style={{ width: 70  }} />,
  ], []);

  function updateCell(rIdx, key, val) {
    setRows(prev => {
      const next = [...prev];
      next[rIdx] = { ...next[rIdx], [key]: val };
      return next;
    });
  }
  const addRow    = () => setRows(prev => [...prev, emptyRow("")]);
  const removeRow = (i) => setRows(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ"); return; }
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
      branch: BRANCH, formRef: FORM_REF, classification,
      section, reportDate: date,
      slots: SLOTS.map(s => s.key),
      entries: rows.map(r => ({ ...r })),
      verifiedBy, savedAt: Date.now(),
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
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background:C.gray50, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.gray700, direction:"ltr", borderRadius:12, overflow:"hidden", padding:"14px 16px 0" }}>

      <ReportHeader
        title="Equipment Inspection & Sanitizing Log"
        subtitle={BRANCH}
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: classification },
          { label: "Report Date", type: "date", value: date, onChange: setDate },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* ── Action buttons ── */}
      <div style={{ display:"flex", gap:8, padding:"0 0 10px", justifyContent:"flex-end" }}>
        <button onClick={addRow} style={actionBtn("#0ea5e9")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving} style={actionBtn(saving ? "#6b7280" : "#10b981", saving)}>
          {saving ? "Saving…" : "💾 Save"}
        </button>
      </div>

      {/* ── Legend band ── */}
      <div style={{ background:`linear-gradient(90deg,${C.navy},${C.navyLight})`, borderRadius:"8px 8px 0 0", padding:"9px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
        <span style={{ color:C.white, fontWeight:800, fontSize:13 }}>Sanitize every 4 hours</span>
        <span style={{ color:"#93c5fd", fontSize:11 }}>✔ Satisfactory &nbsp;|&nbsp; ✗ Needs Improvement</span>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:13 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Equipment's</th>
              <th style={thCell}>Free from{"\n"}damage{"\n"}(yes/no)</th>
              <th style={thCell}>Free from{"\n"}broken{"\n"}metal/plastic{"\n"}(yes/no)</th>
              {SLOTS.map(s => <th key={s.key} style={thCell}>{s.label}</th>)}
              <th style={thCell}>Corrective{"\n"}Action{"\n"}(if any)</th>
              <th style={thCell}>Checked{"\n"}by</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const risky =
                r.freeFromDamage === "No" ||
                r.freeFromBrokenPieces === "No" ||
                SLOTS.some(s => r[s.key] === "✗");
              const rowBg = i % 2 === 0 ? C.white : "#f8faff";
              return (
                <tr key={i}>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input value={r.equipment} onChange={e=>updateCell(i,"equipment",e.target.value)} style={inputSt} placeholder="Equipment name" />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <select value={r.freeFromDamage} onChange={e=>updateCell(i,"freeFromDamage",e.target.value)}
                      style={{ ...inputSt, color: r.freeFromDamage==="Yes"?C.green : r.freeFromDamage==="No"?C.red : C.gray700,
                        fontWeight: r.freeFromDamage ? 700 : 400,
                        background: r.freeFromDamage==="Yes"?"#dcfce7" : r.freeFromDamage==="No"?"#fee2e2" : C.white }}>
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <select value={r.freeFromBrokenPieces} onChange={e=>updateCell(i,"freeFromBrokenPieces",e.target.value)}
                      style={{ ...inputSt, color: r.freeFromBrokenPieces==="Yes"?C.green : r.freeFromBrokenPieces==="No"?C.red : C.gray700,
                        fontWeight: r.freeFromBrokenPieces ? 700 : 400,
                        background: r.freeFromBrokenPieces==="Yes"?"#dcfce7" : r.freeFromBrokenPieces==="No"?"#fee2e2" : C.white }}>
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  {SLOTS.map(s => (
                    <td key={s.key} style={{ ...tdCell, background: r[s.key]==="√"?"#dcfce7" : r[s.key]==="✗"?"#fee2e2" : rowBg }}>
                      <select value={r[s.key]} onChange={e=>updateCell(i,s.key,e.target.value)}
                        style={{ ...inputSt,
                          background: r[s.key]==="√"?"#dcfce7" : r[s.key]==="✗"?"#fee2e2" : C.white,
                          color:      r[s.key]==="√"?C.green   : r[s.key]==="✗"?C.red      : C.gray700,
                          fontWeight: r[s.key] ? 700 : 400, fontSize:15 }}
                        title="√ = Satisfactory, ✗ = Needs Improvement">
                        <option value=""></option>
                        <option value="√">√</option>
                        <option value="✗">✗</option>
                      </select>
                    </td>
                  ))}
                  <td style={{ ...tdCell, background: risky?"#fff7ed":rowBg }}>
                    <input value={r.correctiveAction} onChange={e=>updateCell(i,"correctiveAction",e.target.value)}
                      style={{ ...inputSt, background: risky?"#fff7ed":C.white }}
                      placeholder={risky ? "⚠️ Required" : "Optional"} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input value={r.checkedByRow} onChange={e=>updateCell(i,"checkedByRow",e.target.value)} style={inputSt} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg, padding:4 }}>
                    <button onClick={()=>removeRow(i)} disabled={rows.length===1}
                      style={{ background:rows.length===1?"#e5e7eb":"#fee2e2",
                        color:rows.length===1?C.gray400:C.red,
                        border:"none", borderRadius:6, width:36, height:34,
                        cursor:rows.length===1?"not-allowed":"pointer",
                        fontWeight:700, fontSize:17 }}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add row button ── */}
      <div style={{ padding:"10px 0 0" }}>
        <button onClick={addRow}
          style={{ background:C.accentBg, color:C.accent, border:`1px dashed ${C.accent}`,
            borderRadius:8, padding:"7px 18px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
          + إضافة صف
        </button>
      </div>

      {/* ── Footer card ── */}
      <div style={{ padding:"14px 0 16px" }}>
        <div style={{ background:C.tealBg, border:`1px solid #99f6e4`, borderRadius:8, padding:"10px 14px", maxWidth:300 }}>
          <div style={{ fontSize:10, color:C.teal, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", marginBottom:4 }}>✅ Verified by</div>
          <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)}
            style={{ ...inputSt, border:`1px solid #5eead4`, background:C.white, fontWeight:600, fontSize:14 }} />
        </div>
      </div>

    </div>
  );
}