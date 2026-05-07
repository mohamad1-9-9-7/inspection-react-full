// src/pages/monitor/branches/qcs/StaffSicknessInput.jsx
import React, { useState } from "react";

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
const TYPE = "qcs_staff_sickness";

const DOC_META = {
  docTitle: "Staff Sickness Form",
  docNo: "AM/BK/CK/SS/1",
  issueDate: "2022-05-05",
  area: "Central Kitchen",
  controllingOfficer: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
};

/* ===== UI helpers ===== */
const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  border: "1px solid #cbd5e1",
  background: "#0f3d2e",
  color: "#fff",
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 800,
  fontSize: 13,
};
const td = {
  border: "1px solid #cbd5e1",
  padding: "6px 8px",
  verticalAlign: "top",
  background: "#fff",
};
const input = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  boxSizing: "border-box",
  background: "#fff",
  fontSize: 13,
};
const textarea = { ...input, minHeight: 90, resize: "vertical" };
const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  marginBottom: 6,
};

const submitBtn = (disabled) => ({
  width: "100%",
  background: disabled ? "#94a3b8" : "linear-gradient(135deg,#0f3d2e,#0b5236)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 16,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: "0 6px 16px rgba(11,82,54,.25)",
  marginTop: 16,
});

const addRowBtn = {
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 10,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const delRowBtn = {
  background: "#fee2e2",
  color: "#dc2626",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "6px 10px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

/* ===== Component ===== */
export default function StaffSicknessInput() {
  const [headerDate, setHeaderDate] = useState("");
  const [rows, setRows] = useState([
    { staffName: "", details: "", action: "", dateFrom: "", dateReturned: "", comments: "" },
    { staffName: "", details: "", action: "", dateFrom: "", dateReturned: "", comments: "" },
  ]);
  const [remarks, setRemarks] = useState("");
  const [checkedBy, setCheckedBy] = useState({ name: "", date: "" });
  const [verifiedBy, setVerifiedBy] = useState({ name: "", date: "" });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setRow(idx, field, v) {
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, [field]: v } : r)));
  }
  function addRow() {
    setRows((p) => [...p, { staffName: "", details: "", action: "", dateFrom: "", dateReturned: "", comments: "" }]);
  }
  function delRow(idx) {
    setRows((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));
  }

  function resetForm() {
    setHeaderDate("");
    setRows([
      { staffName: "", details: "", action: "", dateFrom: "", dateReturned: "", comments: "" },
      { staffName: "", details: "", action: "", dateFrom: "", dateReturned: "", comments: "" },
    ]);
    setRemarks("");
    setCheckedBy({ name: "", date: "" });
    setVerifiedBy({ name: "", date: "" });
  }

  async function handleSave() {
    if (!headerDate) return alert("Please select the header date.");
    const filledRows = rows.filter((r) => (r.staffName || r.details || r.action || r.dateFrom || r.dateReturned || r.comments));
    if (filledRows.length === 0) return alert("Please fill at least one row.");

    const payload = {
      headerTop: {
        documentTitle: DOC_META.docTitle,
        documentNo:    DOC_META.docNo,
        issueDate:     DOC_META.issueDate,
        area:          DOC_META.area,
        controllingOfficer: DOC_META.controllingOfficer,
        issuedBy:      DOC_META.issuedBy,
        approvedBy:    DOC_META.approvedBy,
      },
      date: headerDate,
      rows: rows.map((r, i) => ({
        sNo: i + 1,
        staffName:    r.staffName.trim(),
        details:      r.details.trim(),
        action:       r.action.trim(),
        dateFrom:     r.dateFrom,
        dateReturned: r.dateReturned,
        comments:     r.comments.trim(),
      })),
      remarks: remarks.trim(),
      footer: {
        checkedBy:  { name: checkedBy.name.trim(),  date: checkedBy.date },
        verifiedBy: { name: verifiedBy.name.trim(), date: verifiedBy.date },
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setMsg("Saving…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "qcs", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ Saved successfully");
      resetForm();
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <div style={card}>
      {/* ===== Header band ===== */}
      <div
        style={{
          background: "linear-gradient(135deg,#0f3d2e,#0b5236)",
          color: "#fff",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: ".5px" }}>
            AL MAWASHI <span style={{ opacity: 0.85, fontWeight: 700 }}>المواشي</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Central Kitchen — QA</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: 0.95, lineHeight: 1.7 }}>
          <div>Doc No: <b>{DOC_META.docNo}</b></div>
          <div>Issue: <b>05/05/2022</b></div>
          <div>Area: <b>{DOC_META.area}</b></div>
        </div>
      </div>

      {/* ===== Issued/Approved row ===== */}
      <table style={{ ...table, marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 180, color: "#fff" }}>Controlling Officer</td>
            <td style={td}>{DOC_META.controllingOfficer}</td>
            <td style={{ ...th, width: 180, color: "#fff" }}>Document</td>
            <td style={td}>{DOC_META.docTitle}</td>
          </tr>
          <tr>
            <td style={th}>Issued by</td>
            <td style={td}>{DOC_META.issuedBy}</td>
            <td style={th}>Approved by</td>
            <td style={td}>{DOC_META.approvedBy}</td>
          </tr>
        </tbody>
      </table>

      {/* ===== Title ===== */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontStyle: "italic", color: "#0b5236", fontWeight: 800, fontSize: 17 }}>
          Staff Sickness / Occupational Injury Record
        </div>
      </div>

      {/* ===== Header Date ===== */}
      <div style={{ marginBottom: 14, maxWidth: 360 }}>
        <span style={label}>Date</span>
        <input style={input} type="date" value={headerDate} onChange={(e) => setHeaderDate(e.target.value)} />
      </div>

      {/* ===== Table ===== */}
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <colgroup>
            <col style={{ width: 60 }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 150 }} />
            <col />
            <col style={{ width: 70 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>S.No</th>
              <th style={th}>Staff Name</th>
              <th style={th}>Details of Sickness</th>
              <th style={th}>Action Taken</th>
              <th style={th}>Date From</th>
              <th style={th}>Date Returned</th>
              <th style={th}>Comments</th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 800, textAlign: "center", color: "#475569" }}>{i + 1}</td>
                <td style={td}>
                  <input style={input} placeholder="Name" value={r.staffName} onChange={(e) => setRow(i, "staffName", e.target.value)} />
                </td>
                <td style={td}>
                  <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="Details…" value={r.details} onChange={(e) => setRow(i, "details", e.target.value)} />
                </td>
                <td style={td}>
                  <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="Action…" value={r.action} onChange={(e) => setRow(i, "action", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input} type="date" value={r.dateFrom} onChange={(e) => setRow(i, "dateFrom", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input} type="date" value={r.dateReturned} onChange={(e) => setRow(i, "dateReturned", e.target.value)} />
                </td>
                <td style={td}>
                  <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="Comments…" value={r.comments} onChange={(e) => setRow(i, "comments", e.target.value)} />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <button type="button" onClick={() => delRow(i)} style={delRowBtn} disabled={rows.length <= 1}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} style={addRowBtn}>
        ＋ Add Row
      </button>

      {/* ===== Remarks ===== */}
      <div style={{ marginTop: 16, padding: 14, border: "1px solid #cbd5e1", borderRadius: 12, background: "#f8fafc" }}>
        <span style={label}>Remarks / Corrective Actions</span>
        <textarea
          style={textarea}
          placeholder="Enter corrective actions taken…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* ===== Sign-off ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
          <span style={label}>Checked By</span>
          <input
            style={{ ...input, marginBottom: 8 }}
            placeholder="Signature (type full name)"
            value={checkedBy.name}
            onChange={(e) => setCheckedBy((p) => ({ ...p, name: e.target.value }))}
          />
          <input style={input} type="date" value={checkedBy.date} onChange={(e) => setCheckedBy((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
          <span style={label}>Verified By</span>
          <input
            style={{ ...input, marginBottom: 8 }}
            placeholder="Signature (type full name)"
            value={verifiedBy.name}
            onChange={(e) => setVerifiedBy((p) => ({ ...p, name: e.target.value }))}
          />
          <input style={input} type="date" value={verifiedBy.date} onChange={(e) => setVerifiedBy((p) => ({ ...p, date: e.target.value }))} />
        </div>
      </div>

      {/* ===== Submit ===== */}
      <button onClick={handleSave} disabled={saving} style={submitBtn(saving)}>
        {saving ? "Saving…" : "📝 Submit Record"}
      </button>
      {msg && (
        <div style={{ textAlign: "center", marginTop: 10, fontWeight: 800, color: msg.startsWith("✅") ? "#16a34a" : msg.startsWith("❌") ? "#dc2626" : "#334155" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
