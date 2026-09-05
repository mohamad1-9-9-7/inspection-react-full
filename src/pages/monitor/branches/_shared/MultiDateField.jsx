// MultiDateField.jsx
//
// A cell that holds ONE OR MORE dates.
//
// Some sheets (Raw Material Receipt) carry a slaughter/production date and an
// expiry date per sample, and a single shipment can mix two or three lots — so
// the cell has to hold several dates instead of one free-typed string.
//
// Every row is a real <input type="date">, which means the app's global
// calendar (components/GlobalDatePicker.jsx) opens on it automatically; no page
// has to wire a picker.
//
// The value stays a plain string so every reader downstream (the View page, the
// Excel exporter, the PDF, AllReportsView's date scanner) keeps working:
//
//     "01/09/2026"                 → one date
//     "01/09/2026 , 05/09/2026"    → two dates in the same cell
//
// Text that was typed before this field existed and is not a date is kept as a
// plain text row rather than thrown away.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DATE_SEP, DATE_SPLIT_RE, tokenToIso, isoToDMY } from "./dateTokens";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `d_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/** stored string → editable rows */
function parseValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [{ id: uid(), kind: "date", iso: "", text: "" }];
  return raw
    .split(DATE_SPLIT_RE)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const iso = tokenToIso(t);
      return iso
        ? { id: uid(), kind: "date", iso, text: "" }
        : { id: uid(), kind: "text", iso: "", text: t };
    });
}

/** editable rows → stored string */
function serialize(rows) {
  return rows
    .map((r) => (r.kind === "date" ? (r.iso ? isoToDMY(r.iso) : "") : r.text.trim()))
    .filter(Boolean)
    .join(DATE_SEP);
}

export default function MultiDateField({
  value,
  onChange,
  style,
  disabled = false,
  addLabel = "+ date",
  max = 12,
  hint = null,
}) {
  const [rows, setRows] = useState(() => parseValue(value));
  const mine = useRef(serialize(rows));

  // Re-read the prop only when it changed somewhere else (load, reset, undo);
  // our own emits must not rebuild the rows or an empty row would vanish while
  // the user is still filling it.
  useEffect(() => {
    const incoming = String(value ?? "");
    if (incoming !== mine.current) {
      mine.current = incoming;
      setRows(parseValue(incoming));
    }
  }, [value]);

  function commit(next) {
    setRows(next);
    const out = serialize(next);
    mine.current = out;
    if (out !== String(value ?? "")) onChange(out);
  }

  const inputStyle = useMemo(
    () => ({ ...(style || {}), width: "100%", minWidth: 0, flex: "1 1 0%" }),
    [style]
  );

  const setRow = (id, patch) =>
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    commit([...rows, { id: uid(), kind: "date", iso: "", text: "" }]);

  const removeRow = (id) => {
    const next = rows.filter((r) => r.id !== id);
    commit(next.length ? next : [{ id: uid(), kind: "date", iso: "", text: "" }]);
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {r.kind === "date" ? (
            <input
              type="date"
              value={r.iso}
              disabled={disabled}
              onChange={(e) => setRow(r.id, { iso: e.target.value })}
              style={inputStyle}
              title={rows.length > 1 ? `Date ${i + 1} of ${rows.length}` : undefined}
            />
          ) : (
            <input
              type="text"
              value={r.text}
              disabled={disabled}
              onChange={(e) => setRow(r.id, { text: e.target.value })}
              style={inputStyle}
              title="Old free text — clear it to use the calendar"
            />
          )}
          {rows.length > 1 && !disabled && (
            <button
              type="button"
              onClick={() => removeRow(r.id)}
              title="Remove this date"
              aria-label="Remove this date"
              style={{
                flex: "0 0 auto",
                width: 24,
                height: 24,
                lineHeight: "20px",
                padding: 0,
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {hint ? <div style={{ fontSize: ".78rem", lineHeight: 1.3 }}>{hint}</div> : null}

      {!disabled && rows.length < max && (
        <button
          type="button"
          onClick={addRow}
          style={{
            justifySelf: "start",
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px dashed #a5b4fc",
            background: "#eef2ff",
            color: "#4338ca",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}
