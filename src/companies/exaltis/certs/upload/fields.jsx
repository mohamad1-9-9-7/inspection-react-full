// src/companies/exaltis/certs/upload/fields.jsx
// Certificate upload — form fields.
// (Split out of CertUpload.jsx — the code is unchanged.)
import { Bi } from "../../reports/bilingual";

/* ========= Tiny UI helpers ========= */
export function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span><Bi en={label} /></span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

export function ReadOnlyField({ label, value }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span><Bi en={label} /></span>
      <input
        type="text"
        value={value}
        readOnly
        placeholder="Auto-calculated / N/A · يُحسب تلقائياً"
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#e5e7eb,#e5e7eb,#e5e7eb)",
          fontSize: 13,
          outline: "none",
          color: "#374151",
        }}
      />
    </label>
  );
}

export function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span><Bi en={label} /></span>
      <input
        type="date"
        value={value}
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span><Bi en={label} /></span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
