// src/pages/industry-kit/log/Cell.jsx
// One editable cell of a log sheet, plus the status pill and the limit hint.

import React from "react";
import { Bi, bi } from "../i18n/bilingual";
import { blankItem, listOf } from "./rows";
import { MARK, S, TONE } from "./styles";

export function StatusPill({ status }) {
  if (!status) return <span style={{ color: "#cbd5e1" }}>—</span>;
  const t = TONE[status.level] || TONE.ok;
  return (
    <span style={{ display: "inline-block", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {MARK[status.level] || "✓"} {status.text}
    </span>
  );
}

export const Hint = ({ c }) =>
  c.hint ? <span style={{ display: "block", fontWeight: 700, color: "#0f766e", opacity: 0.8 }}>{c.hint}</span> : null;

/* A "list" column: a mini-table inside the cell (value = array of objects). */
function ListCell({ col, value, onChange }) {
  const items = listOf(col, value);
  const setItem = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {col.fields.map((f) => (
            <span key={f.key} style={{ flex: `1 1 ${f.width || 90}px`, minWidth: Math.min(f.width || 90, 110) }}>
              {f.type === "select" ? (
                <select style={S.cell} value={it[f.key] || ""} onChange={(e) => setItem(i, f.key, e.target.value)}>
                  {f.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
                </select>
              ) : (
                <input
                  style={S.cell}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  placeholder={bi(f.label)}
                  value={it[f.key] ?? ""}
                  onChange={(e) => setItem(i, f.key, e.target.value)}
                />
              )}
            </span>
          ))}
          <button
            type="button"
            title="Remove line"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            style={{ ...S.btn("#fee2e2", "#b91c1c"), padding: "4px 8px", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...items, blankItem(col)])} style={{ ...S.btn("#f1f5f9", "#334155"), padding: "5px 10px" }}>
          <Bi en={col.addLabel || "+ Add line"} />
        </button>
      </div>
    </div>
  );
}

export default function Cell({ col, value, row, onChange, listId }) {
  if (col.type === "computed") {
    return <div style={{ ...S.cell, background: "#f1f5f9", color: "#475569", fontWeight: 700 }}>{col.compute(row) || "—"}</div>;
  }
  if (col.type === "select") {
    return (
      <select style={S.cell} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
      </select>
    );
  }
  if (col.type === "list") return <ListCell col={col} value={value} onChange={onChange} />;

  const type = col.type === "number" ? "number" : col.type === "time" ? "time" : col.type === "date" ? "date" : "text";
  return (
    <input
      style={S.cell}
      type={type}
      step={type === "number" ? "any" : undefined}
      value={value ?? ""}
      list={col.options || col.lookup ? listId : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
