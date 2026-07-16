// src/pages/monitor/branches/pos19/_shared/AlMawashiHeader.jsx
// AL MAWASHI document-control table header for POS 19 INPUT forms.
//
// Drop-in replacement for ReportHeader (identical props: title, subtitle,
// titleAr, fields) but renders the classic AL MAWASHI document-control table
// (logo + Document Title / Document No / Issue Date / … grid) instead of the
// gradient banner. It also keeps the bilingual auto-labelling that decorates
// every <th>/<label>/<strong> in the surrounding form with an Arabic twin.

import React, { useEffect, useRef } from "react";
import { BilingualGuidance, FIELD_AR, TITLE_AR, TERM_AR } from "./ReportHeader";

const NOTE_TONES = {
  ok:      { color: "#166534", background: "#dcfce7", border: "#bbf7d0" },
  blocked: { color: "#991b1b", background: "#fee2e2", border: "#fecaca" },
  edit:    { color: "#92400e", background: "#fef3c7", border: "#fde68a" },
  warn:    { color: "#9a3412", background: "#ffedd5", border: "#fed7aa" },
  muted:   { color: "#475569", background: "#f1f5f9", border: "#e2e8f0" },
};

const topTable = {
  width: "100%", borderCollapse: "collapse", marginBottom: 10,
  fontSize: "0.9rem", border: "1px solid #9aa4ae", background: "#f8fbff",
};
const tdHeader = {
  border: "1px solid #9aa4ae", padding: "6px 8px",
  verticalAlign: "middle", color: "#0b1f4d",
};
const bandTitle = {
  textAlign: "center", background: "#dde3e9", fontWeight: 700,
  padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none",
  marginBottom: 10, color: "#0b1f4d",
};
const cellLabel = { fontWeight: 800 };
const cellLabelAr = { direction: "rtl", fontWeight: 700, color: "#475569", fontSize: 11 };
const cellInput = {
  fontSize: 13, fontWeight: 600, color: "#0b1f4d", background: "#fff",
  border: "1px solid #1f3b70", borderRadius: 4, padding: "3px 6px",
  width: "100%", boxSizing: "border-box", outline: "none", marginTop: 3,
};

const normalizeTerm = (value) =>
  String(value || "")
    .replace(/\s*ⓘ/g, "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

function getArabicTerm(value) {
  const raw = String(value || "").trim();
  if (!raw || /[؀-ۿ]/.test(raw)) return "";
  return TERM_AR[raw] || TERM_AR[normalizeTerm(raw)] || "";
}

function HeaderCell({ cell }) {
  if (!cell) return <td style={tdHeader} />;
  const { label, value, onChange, type, placeholder, note, labelAr } = cell;
  const ar = labelAr || FIELD_AR[label] || "";
  const tone = note ? NOTE_TONES[note.tone] || NOTE_TONES.muted : null;
  const editable = typeof onChange === "function";
  return (
    <td style={tdHeader}>
      {editable ? (
        <>
          <b style={cellLabel}>{label}:</b>
          {ar ? <span style={{ ...cellLabelAr, marginInlineStart: 6 }}>{ar}</span> : null}
          <input
            type={type || "text"}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || ""}
            style={cellInput}
          />
        </>
      ) : (
        <>
          <b style={cellLabel}>{label}:</b> <span>{value || "—"}</span>
          {ar ? <span style={{ ...cellLabelAr, marginInlineStart: 6 }}>{ar}</span> : null}
        </>
      )}
      {note ? (
        <div style={{
          marginTop: 3, padding: "3px 6px", borderRadius: 4,
          fontSize: 10.5, fontWeight: 700, lineHeight: 1.4,
          direction: "rtl", textAlign: "right",
          color: tone.color, background: tone.background,
          border: `1px solid ${tone.border}`,
        }}>
          {note.text}
        </div>
      ) : null}
    </td>
  );
}

export default function AlMawashiHeader({ title, subtitle, titleAr, fields = [] }) {
  const rootRef = useRef(null);
  const resolvedTitleAr = titleAr || TITLE_AR[title] || "";

  // Decorate the surrounding form's headers/labels with their Arabic twin
  // (same behaviour the previous gradient ReportHeader provided).
  useEffect(() => {
    const root = rootRef.current?.parentElement;
    if (!root) return;
    root.classList.add("pos19-bilingual-scope");
    const cells = root.querySelectorAll("th, label, strong");
    cells.forEach((el) => {
      const ar = getArabicTerm(el.textContent);
      if (ar) el.setAttribute("data-ar", ar);
    });
  });

  // First cell is always "Document Title", the passed fields follow.
  const cells = [{ label: "Document Title", value: title }, ...fields];
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push([cells[i], cells[i + 1] || null]);
  }

  return (
    <>
      <style>{`
        .pos19-bilingual-scope th[data-ar]::after,
        .pos19-bilingual-scope label[data-ar]::after,
        .pos19-bilingual-scope strong[data-ar]::after {
          content: attr(data-ar);
          display: block;
          margin-top: 2px;
          direction: rtl;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0;
          text-transform: none;
          white-space: normal;
        }
      `}</style>

      {/* AL MAWASHI document-control table */}
      <table ref={rootRef} style={topTable}>
        <tbody>
          {rows.map((pair, ri) => (
            <tr key={ri}>
              {ri === 0 ? (
                <td rowSpan={rows.length} style={{ ...tdHeader, width: 120, textAlign: "center" }}>
                  <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                    AL<br />MAWASHI
                  </div>
                </td>
              ) : null}
              <HeaderCell cell={pair[0]} />
              <HeaderCell cell={pair[1]} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Title band (EN + AR) */}
      <div style={bandTitle}>
        {String(title || "").toUpperCase()}
        {subtitle ? (
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 2 }}>{subtitle}</div>
        ) : null}
        {resolvedTitleAr ? (
          <div style={{ direction: "rtl", fontSize: 13, marginTop: 4, color: "#475569", fontWeight: 700 }}>
            {resolvedTitleAr}
          </div>
        ) : null}
      </div>

      <BilingualGuidance title={title} />
    </>
  );
}
