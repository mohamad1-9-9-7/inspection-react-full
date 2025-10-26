// src/pages/monitor/branches/pos15/POS15PestControlInput.jsx
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

/* ===== ثابت التقرير ===== */
const TYPE   = "pos15_pest_control";
const BRANCH = "POS 15";

export default function POS15PestControlInput() {
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    branch: BRANCH,
    serviceProvider: "",
    visitType: "Scheduled", // Scheduled | Complaint | Follow-up
    checkedBy: "",
    verifiedBy: "",
    // Sightings rows: Location + Photo (Base64)
    sightings: [{ location: "", photoBase64: "" }],
  });

  const [saving, setSaving] = useState(false);

  // Modal state
  const [modal, setModal] = useState({
    open: false,
    text: "",
    kind: "info", // info | success | error
  });

  const openModal   = (text, kind = "info") => setModal({ open: true, text, kind });
  const updateModal = (text, kind = modal.kind) => setModal((m) => ({ ...m, text, kind }));
  const closeModal  = () => setModal((m) => ({ ...m, open: false }));

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const setRow = (i, k, v) =>
    setForm((s) => {
      const arr = [...s.sightings];
      arr[i] = { ...arr[i], [k]: v };
      return { ...s, sightings: arr };
    });

  const addRow = () =>
    setForm((s) => ({
      ...s,
      sightings: [...s.sightings, { location: "", photoBase64: "" }],
    }));

  const removeRow = (i) =>
    setForm((s) => ({ ...s, sightings: s.sightings.filter((_, idx) => idx !== i) }));

  // تحويل الصورة إلى Base64 وتخزينها في الصف
  const setRowImage = (i, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setRow(i, "photoBase64", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearRowImage = (i) => setRow(i, "photoBase64", "");

  async function handleSave() {
    try {
      if (!form.reportDate) return alert("⚠️ Please select a date.");
      if (!form.checkedBy.trim() || !form.verifiedBy.trim()) {
        return alert("⚠️ Checked By and Verified By are required.");
      }

      setSaving(true);
      openModal("⏳ جاري الحفظ…", "info");

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos15", type: TYPE, payload: form }),
      });
      if (!res.ok) throw new Error("save failed");

      setSaving(false);
      updateModal("✅ تم الحفظ", "success");
      setTimeout(() => closeModal(), 1400);

      // إعادة تهيئة بسيطة (نبقي التاريخ/الفرع/نوع الزيارة)
      setForm((s) => ({
        ...s,
        serviceProvider: "",
        checkedBy: "",
        verifiedBy: "",
        sightings: [{ location: "", photoBase64: "" }],
      }));
    } catch (e) {
      console.error(e);
      setSaving(false);
      updateModal("❌ فشل الحفظ", "error");
      setTimeout(() => closeModal(), 2000);
    }
  }

  return (
    <div style={wrap}>
      {/* ===== ترويسة موحّدة AL MAWASHI ===== */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 8,
          fontSize: "0.9rem",
          border: "1px solid #9aa4ae",
          background: "#f8fbff",
        }}
      >
        <tbody>
          <tr>
            <td
              rowSpan={3}
              style={{
                border: "1px solid #9aa4ae",
                padding: "8px",
                width: 120,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL
                <br />
                MAWASHI
              </div>
            </td>
            <td style={tdHeader2}>
              <b>Document Title:</b> Pest Control Visit Log
            </td>
            <td style={tdHeader2}>
              <b>Document No:</b> FS-QM/REC/PC
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Issue Date:</b> 05/02/2020
            </td>
            <td style={tdHeader2}>
              <b>Revision No:</b> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Area:</b> {form.branch || BRANCH}
            </td>
            <td style={tdHeader2}>
              <b>Date:</b> {form.reportDate || "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#dde3e9",
          fontWeight: 700,
          padding: "6px 4px",
          border: "1px solid #9aa4ae",
          borderTop: "none",
          marginBottom: 12,
        }}
      >
        PEST CONTROL — {form.branch || BRANCH}
      </div>

      {/* Meta */}
      <div style={grid2}>
        <label style={label}>
          Date
          <input
            type="date"
            value={form.reportDate}
            onChange={(e) => setField("reportDate", e.target.value)}
            style={input}
            disabled={saving}
          />
        </label>

        <label style={label}>
          Visit Type
          <select
            value={form.visitType}
            onChange={(e) => setField("visitType", e.target.value)}
            style={input}
            disabled={saving}
          >
            <option>Scheduled</option>
            <option>Complaint</option>
            <option>Follow-up</option>
          </select>
        </label>

        <label style={label}>
          Service Provider
          <input
            value={form.serviceProvider}
            onChange={(e) => setField("serviceProvider", e.target.value)}
            style={input}
            placeholder="مثال: شركة X لمكافحة الحشرات"
            disabled={saving}
          />
        </label>

        {/* فراغ للمحاذاة */}
        <div />
      </div>

      {/* Sightings Table */}
      <h4 style={{ margin: "10px 0" }}>Sightings</h4>
      <table style={table}>
        <thead>
          <tr style={{ background: "#2563eb", color: "#fff" }}>
            <th style={th}>#</th>
            <th style={th}>Location</th>
            <th style={th}>Photo (Base64)</th>
            <th style={th} />
          </tr>
        </thead>
        <tbody>
          {form.sightings.map((row, i) => (
            <tr key={i}>
              <td style={tdCenter}>{i + 1}</td>

              <td style={tdCell}>
                <input
                  value={row.location}
                  onChange={(e) => setRow(i, "location", e.target.value)}
                  style={input}
                  disabled={saving}
                />
              </td>

              <td style={{ ...tdCell, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRowImage(i, e.target.files?.[0] || null)}
                    disabled={saving}
                  />
                  {row.photoBase64 ? (
                    <>
                      <img
                        src={row.photoBase64}
                        alt="preview"
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
                      />
                      <button type="button" onClick={() => clearRowImage(i)} style={btnDangerSmall} disabled={saving}>
                        Clear
                      </button>
                    </>
                  ) : (
                    <small style={{ color: "#6b7280" }}>No image</small>
                  )}
                </div>
              </td>

              <td style={tdCenter}>
                <button type="button" onClick={() => removeRow(i)} style={btnDanger} disabled={saving}>
                  ✖
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={addRow} style={btnLight} disabled={saving}>
          ＋ Add Row
        </button>
      </div>

      {/* Sign-off */}
      <div style={grid2}>
        <label style={label}>
          Checked By
          <input
            value={form.checkedBy}
            onChange={(e) => setField("checkedBy", e.target.value)}
            style={input}
            disabled={saving}
          />
        </label>
        <label style={label}>
          Verified By
          <input
            value={form.verifiedBy}
            onChange={(e) => setField("verifiedBy", e.target.value)}
            style={input}
            disabled={saving}
          />
        </label>
      </div>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <button type="button" onClick={handleSave} style={btnPrimary} disabled={saving}>
          {saving ? "⏳ جاري الحفظ…" : "💾 Save"}
        </button>
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={modalOverlay}>
          <div
            style={{
              ...modalBox,
              borderTopColor:
                modal.kind === "success" ? "#22c55e" :
                modal.kind === "error" ? "#ef4444" : "#2563eb",
            }}
          >
            <div style={modalHeader}>
              <span
                style={{
                  fontSize: 20,
                  color:
                    modal.kind === "success" ? "#22c55e" :
                    modal.kind === "error" ? "#ef4444" : "#2563eb",
                  marginRight: 8,
                }}
              >
                {modal.kind === "success" ? "✔" : modal.kind === "error" ? "✖" : "ℹ"}
              </span>
              <strong>{modal.text}</strong>
            </div>
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button onClick={closeModal} style={btnClose} disabled={saving}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Styles (بسيطة) ===== */
const wrap = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};
const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 8,
};
const label = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 600,
  color: "#374151",
};
const input = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
};
const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 8,
  border: "1px solid #d1d5db",
};
const th = {
  padding: 8,
  border: "1px solid #d1d5db",
  fontWeight: 700,
  textAlign: "center",
};
const tdCell = { padding: 6, border: "1px solid #e5e7eb" };
const tdCenter = { ...tdCell, textAlign: "center", width: 60 };
const btnPrimary = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
};
const btnLight = {
  padding: "6px 10px",
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};
const btnDanger = {
  padding: "4px 8px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 700,
};
const btnDangerSmall = {
  padding: "4px 8px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 700,
};

/* Modal styles */
const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};
const modalBox = {
  background: "#fff",
  borderRadius: 12,
  padding: "14px 16px",
  minWidth: 280,
  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
  borderTop: "4px solid #2563eb",
};
const modalHeader = { display: "flex", alignItems: "center", gap: 6, fontSize: 16 };
const btnClose = {
  padding: "6px 10px",
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

// ترويسة موحّدة (مطابقة لباقي النماذج)
const tdHeader2 = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  verticalAlign: "middle",
};
