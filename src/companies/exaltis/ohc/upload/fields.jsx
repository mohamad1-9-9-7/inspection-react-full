// src/companies/exaltis/ohc/upload/fields.jsx
// OHC upload — form fields.
// (Split out of OHCUpload.jsx — the code is unchanged.)
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
        className="ohc-in"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          outline: "none",
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
        className="ohc-in"
        type="date"
        value={value}
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
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
        className="ohc-in"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
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
