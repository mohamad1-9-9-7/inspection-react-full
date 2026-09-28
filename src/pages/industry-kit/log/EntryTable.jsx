// src/pages/industry-kit/log/EntryTable.jsx
// One editable table of a log sheet: header row, datalists, rows with their
// live compliance status, and the row / copy buttons.

import React from "react";
import { Bi } from "../i18n/bilingual";
import Cell, { Hint, StatusPill } from "./Cell";
import { statusOf } from "./rows";
import { ACCENT, S } from "./styles";

export default function EntryTable({ schema, table: t, rows, header, lookupOptions, onCell, onAdd, onRemove, onCopy }) {
  const listId = (c) => `kdl-${schema.type}-${t.key}-${c.key}`;
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h3 style={S.h3}><Bi en={t.title} /></h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {t.carry && <button type="button" onClick={onCopy} style={S.btn("#e0f2fe", "#0369a1")}>⎘ <Bi en="Copy from last sheet" /></button>}
          <button type="button" onClick={onAdd} style={S.btn(ACCENT)}><Bi en="+ Add Row" /></button>
        </div>
      </div>

      {t.columns.filter((c) => c.options && c.type !== "select").map((c) => (
        <datalist key={c.key} id={listId(c)}>
          {c.options.map((o) => <option key={o} value={o} />)}
        </datalist>
      ))}
      {t.columns.filter((c) => c.lookup).map((c) => (
        <datalist key={c.key} id={listId(c)}>
          {lookupOptions.map((o) => <option key={o.value} value={o.value} label={o.label} />)}
        </datalist>
      ))}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 34 }}>#</th>
              {t.columns.map((c) => (
                <th key={c.key} style={{ ...S.th, minWidth: c.width || 110 }}><Bi en={c.label} stack /><Hint c={c} /></th>
              ))}
              <th style={{ ...S.th, minWidth: 150 }}><Bi en="Status" stack /></th>
              <th style={{ ...S.th, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...S.td, textAlign: "center", color: "#94a3b8", fontWeight: 700, paddingTop: 10 }}>{i + 1}</td>
                {t.columns.map((c) => (
                  <td key={c.key} style={S.td}>
                    <Cell col={c} value={r[c.key]} row={r} listId={listId(c)} onChange={(v) => onCell(i, c.key, v)} />
                  </td>
                ))}
                <td style={{ ...S.td, paddingTop: 8 }}><StatusPill status={statusOf(t, r, header)} /></td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <button type="button" onClick={() => onRemove(i)} title="Remove row" style={{ ...S.btn("#fee2e2", "#b91c1c"), padding: "5px 9px" }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
