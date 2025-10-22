  // src/pages/monitor/branches/pos19/pos19_inputs/PersonalHygieneChecklistInput.jsx
  import React, { useMemo, useState } from "react";
  import unionLogo from "../../../../../assets/unioncoop-logo.png";

  const API_BASE = String(
    (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
  ).replace(/\/$/, "");

  const TYPE = "pos19_personal_hygiene";
  const BRANCH = "POS 19";

  const COLS = [
    { key: "cleanUniform", label: "Clean\nUniform" },
    { key: "cleanShoes", label: "Clean\nShoes" },
    { key: "handwashGloves", label: "Hand washing and\nwearing disposable\ngloves when handling\nhigh risk food" },
    { key: "hairCovered", label: "Hair is short\nand clean\ncovered" },
    { key: "fingernails", label: "Fingernail\nis clean\nand short" },
    { key: "mustacheShaved", label: "Mustache/\nbeard properly\nshaved" },
    { key: "noJewelry", label: "No\nJewelry" },
    { key: "noIllness", label: "No Illness,\nNo Septic\nCuts, No Skin\nInfection" },
  ];

  function emptyRow() {
    const base = { staffName: "", correctiveAction: "" };
    COLS.forEach((c) => (base[c.key] = ""));
    return base;
  }

  export default function PersonalHygieneChecklistInput() {
    const [date, setDate] = useState(() => {
      try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
      catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
    });
    const [section, setSection] = useState("");
    const [rows, setRows] = useState(() => Array.from({ length: 5 }, () => emptyRow()));
    const [checkedBy, setCheckedBy] = useState("");
    const [verifiedBy, setVerifiedBy] = useState("");
    const [revDate, setRevDate] = useState("");
    const [revNo, setRevNo] = useState("");
    const [saving, setSaving] = useState(false);

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

    const legendBox = (
      <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
        <strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong>
      </div>
    );

    function updateRow(i, key, val) {
      setRows((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], [key]: val };
        return next;
      });
    }
    function addRow() { setRows((r) => [...r, emptyRow()]); }
    function deleteRow(i) { setRows((r) => r.filter((_, idx) => idx !== i)); }

    // ✅ نبني أعمدة <col> كمصفوفة لتجنّب أي مسافات/تعليقات داخل <colgroup>
    const colDefs = useMemo(() => {
      const arr = [
        <col key="del" style={{ width: 44 }} />,
        <col key="name" style={{ width: 170 }} />,
      ];
      COLS.forEach((_, i) => arr.push(<col key={`c${i}`} style={{ width: 110 }} />));
      arr.push(<col key="action" style={{ width: 190 }} />);
      return arr;
    }, []);

    // حفظ على نفس نمط FTR2: POST /api/reports { reporter, type, payload }
    async function handleSave() {
      if (!date) { alert("الرجاء تحديد التاريخ"); return; }
      if (!rows.length) { alert("أضف على الأقل صفًا واحدًا"); return; }

      setSaving(true);

      // rows -> entries
      const entries = rows.map(r => ({
        name: r.staffName || "",
        cleanUniform: r.cleanUniform || "",
        cleanShoes: r.cleanShoes || "",
        handwashGloves: r.handwashGloves || "",
        hairCovered: r.hairCovered || "",
        fingernails: r.fingernails || "",
        mustacheShaved: r.mustacheShaved || "",
        noJewelry: r.noJewelry || "",
        noIllness: r.noIllness || "",
        remarks: r.correctiveAction || "",
      }));

      const payload = {
        branch: BRANCH,
        reportDate: date,
        entries,
        checkedBy,
        verifiedBy,
        revDate,
        revNo,
        section,
        savedAt: Date.now(),
      };

      try {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reporter: "pos19",
            type: TYPE,
            payload,
          }),
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

    return (
      <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:18 }}>Union Coop</div>
            <div style={{ fontWeight:800, fontSize:16 }}>Personal Hygiene Checklist</div>
          </div>

          {/* بيانات الهيدر + تاريخ موحّد */}
          <div style={{ display:"grid", gridTemplateColumns:"auto 160px", gap:6, alignItems:"center", fontSize:12 }}>
            <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>UC/HACCP/BR/F06</div>
            <div>Section :</div><input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
            <div>Classification :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>
            <div>Date :</div><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          </div>
        </div>

        {/* Title band */}
        <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
          <div style={{ ...thCell, background:"#e9f0ff" }}>Good Hygiene Practices</div>
          {legendBox}
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={gridStyle}>
            <colgroup>{colDefs}</colgroup>
            <thead>
              <tr>
                <th style={thCell}>—</th>
                <th style={thCell}>Staff Name</th>
                {COLS.map((c) => <th key={c.key} style={thCell}>{c.label}</th>)}
                <th style={thCell}>Corrective Action</th>
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
                      placeholder="Name"
                      value={r.staffName}
                      onChange={(e) => updateRow(i, "staffName", e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  {COLS.map((c) => (
                    <td style={tdCell} key={c.key}>
                      <select
                        value={r[c.key]}
                        onChange={(e) => updateRow(i, c.key, e.target.value)}
                        style={inputStyle}
                        title="√ = Satisfactory, ✗ = Needs Improvement"
                      >
                        <option value=""></option>
                        <option value="√">√</option>
                        <option value="✗">✗</option>
                      </select>
                    </td>
                  ))}
                  <td style={tdCell}>
                    <input
                      type="text"
                      placeholder="Action"
                      value={r.correctiveAction}
                      onChange={(e) => updateRow(i, "correctiveAction", e.target.value)}
                      style={inputStyle}
                    />
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
            {saving ? "Saving…" : "Save Checklist"}
          </button>
        </div>

        {/* Footer */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Checked by:</span>
            <input value={checkedBy} onChange={(e)=>setCheckedBy(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Verified by:</span>
            <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Rev.Date:</span>
            <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Rev.No:</span>
            <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>
    );
  }

  function btnStyle(bg) {
    return {
      background: bg, color: "#fff", border: "none",
      borderRadius: 10, padding: "10px 14px", fontWeight: 700,
      cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
    };
  }
