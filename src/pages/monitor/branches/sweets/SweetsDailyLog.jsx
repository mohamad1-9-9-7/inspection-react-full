// src/pages/monitor/branches/sweets/SweetsDailyLog.jsx
// One engine for every schema-driven sweets daily log (dailyLogSchemas.js):
// the entry sheet, the saved-sheets browser and the read-only sheet with the
// standard toolbar (Edit · Excel · PDF · Print · Delete from _sweetsReportKit).
//
// One sheet per (type, day): the server enforces a unique reportDate per type,
// so picking a date that already has a sheet re-opens it and the save updates
// it by id (PUT /api/reports/:id) instead of creating a duplicate.
//
// The shell renders report pages without props, so index.js asks for a
// ready-made component through inputFor(type) / viewFor(type).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canDelete, canEdit } from "../../../../utils/perms";
import { getLatestReport, getReportRowByDate, listReports, reportDateOf, reportId } from "../_shared/reportApi";
import { SweetsReportActions, excelFromNode, pdfFromNode, printNode } from "./_sweetsReportKit";
import { schemaByType } from "./dailyLogSchemas";
import { containsOf, loadAllergenMatrix, mayContainOf } from "./allergenMatrixData";

const REPORTS_URL = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;
const credentials = (() => {
  try { return new URL(API_BASE).origin === window.location.origin ? "include" : "omit"; } catch { return "omit"; }
})();

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
};

/* ───────── row helpers ───────── */
const blankRow = (table) => Object.fromEntries(table.columns.map((c) => [c.key, c.type === "list" ? [] : ""]));
const blankItem = (col) => Object.fromEntries(col.fields.map((f) => [f.key, f.type === "select" ? f.options[0] : ""]));
// A list item counts only when a TYPED field holds something (a pre-selected
// unit alone is not data).
const itemFilled = (col, it) => col.fields.some((f) => f.type !== "select" && String(it?.[f.key] ?? "").trim());
const listOf = (col, v) => (Array.isArray(v) ? v : v && col.parseText ? col.parseText(v) : []);
const cellFilled = (col, v) =>
  col.type === "list" ? listOf(col, v).some((it) => itemFilled(col, it)) : !!String(v ?? "").trim();
const isRowEmpty = (table, row) =>
  table.columns.every((c) => c.type === "computed" || c.autoNow || !cellFilled(c, row?.[c.key]));
const withComputed = (table, row) => {
  const out = { ...row };
  table.columns.forEach((c) => {
    if (c.type === "computed") out[c.key] = c.compute(row);
    if (c.type === "list") out[c.key] = listOf(c, row?.[c.key]).filter((it) => itemFilled(c, it));
  });
  return out;
};
const listText = (col, v) =>
  listOf(col, v).filter((it) => itemFilled(col, it))
    .map((it) => col.fields.map((f) => (f.type === "date" ? (it[f.key] ? fmtDate(it[f.key]) : "") : it[f.key])).filter((x) => String(x ?? "").trim()).join(" · "));
const statusOf = (table, row, header) => (isRowEmpty(table, row) ? null : table.check ? table.check(withComputed(table, row), header) : null);

function summarize(schema, payload) {
  let rows = 0, fails = 0, warns = 0;
  const header = { ...(payload.header || {}), reportDate: payload.reportDate };
  schema.tables.forEach((t) => (payload[t.key] || []).forEach((r) => {
    rows += 1;
    const s = statusOf(t, r, header);
    if (s?.level === "fail") fails += 1;
    else if (s?.level === "warn") warns += 1;
  }));
  return { rows, fails, warns };
}

/* ───────── styles (Mawashi teal) ───────── */
const ACCENT = "#0f766e";
const S = {
  wrap: { minHeight: "100%", padding: "1.2rem clamp(.75rem,2.5vw,2rem)", background: "#f6f7fb", color: "#0f172a", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif' },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.1rem 1.2rem", marginBottom: 14, boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  h2: { margin: 0, fontSize: 21, fontWeight: 900 },
  sub: { margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13 },
  label: { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 14, outline: "none", background: "#f8fafc", fontFamily: "inherit" },
  cell: { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 7px", fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit" },
  th: { border: "1px solid #cbd5e1", background: "#ecfdf5", color: "#134e4a", padding: "7px 6px", fontSize: 12, fontWeight: 800, textAlign: "left", whiteSpace: "nowrap" },
  td: { border: "1px solid #e2e8f0", padding: 4, verticalAlign: "top" },
  tdView: { border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: 13 },
  btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }),
};
const TONE = {
  ok: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  warn: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  fail: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
};
function StatusPill({ status }) {
  if (!status) return <span style={{ color: "#cbd5e1" }}>—</span>;
  const t = TONE[status.level] || TONE.ok;
  return (
    <span style={{ display: "inline-block", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {status.level === "ok" ? "✓ " : status.level === "warn" ? "! " : "✕ "}{status.text}
    </span>
  );
}

const Hint = ({ c }) => (c.hint ? <span style={{ display: "block", fontWeight: 700, color: "#0f766e", opacity: 0.8 }}>{c.hint}</span> : null);

/* ───────── raw-lot suggestions for "lots" columns ───────── */
function useLotSuggestions(type, active) {
  const [lots, setLots] = useState([]);
  useEffect(() => {
    if (!active || !type) return undefined;
    const ctl = new AbortController();
    (async () => {
      try {
        const rows = await listReports(type, { signal: ctl.signal });
        const since = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
        const seen = new Set();
        const out = [];
        rows
          .filter((r) => reportDateOf(r) >= since)
          .sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a)))
          .forEach((r) => (r.payload?.rows || []).forEach((x) => {
            if (!x.lot || x.decision === "Rejected") return;
            const label = `${x.material || "Material"} · ${x.lot}`;
            if (seen.has(label)) return;
            seen.add(label);
            const unit = ["kg", "g", "L", "pcs"].includes(x.unit) ? x.unit : "kg";
            out.push({ label, material: x.material || "", lot: x.lot, unit });
          }));
        setLots(out);
      } catch { /* suggestions are optional */ }
    })();
    return () => ctl.abort();
  }, [type, active]);
  return lots;
}

/* ───────── allergen matrix → production allergens ───────── */
// A column with `matrix: "<target key>"` suggests the matrix's products and,
// when the typed name matches one, fills the target column with its allergens.
function useMatrixProducts(active) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!active) return undefined;
    const ctl = new AbortController();
    loadAllergenMatrix(ctl.signal)
      .then((m) => { if (!ctl.signal.aborted) setProducts((m?.products || []).filter((p) => p.name)); })
      .catch(() => { /* matrix is optional */ });
    return () => ctl.abort();
  }, [active]);
  return products;
}
function matrixPatch(col, value, products) {
  if (!col?.matrix) return {};
  const hit = products.find((p) => p.name.trim().toLowerCase() === String(value || "").trim().toLowerCase());
  if (!hit) return {};
  const name = (c) => (c.key === "treeNuts" && hit.nutTypes ? `${c.en} (${hit.nutTypes})` : c.en);
  const c = containsOf(hit).map(name).join(", ");
  const m = mayContainOf(hit).map(name).join(", ");
  return { [col.matrix]: [c || "None", m && `may contain: ${m}`].filter(Boolean).join(" · ") };
}

/* ───────── one editable cell ───────── */
function Cell({ col, value, row, onChange, lotOptions, listId }) {
  if (col.type === "computed") {
    return <div style={{ ...S.cell, background: "#f1f5f9", color: "#475569", fontWeight: 700 }}>{col.compute(row) || "—"}</div>;
  }
  if (col.type === "select") {
    return (
      <select style={S.cell} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === "list") {
    const items = listOf(col, value);
    const setItem = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
    const pickLot = (label) => {
      const hit = lotOptions.find((l) => l.label === label);
      if (!hit || items.some((it) => it.lot === hit.lot && it.material === hit.material)) return;
      // Reuse a blank line if there is one, otherwise append.
      const blank = items.findIndex((it) => !itemFilled(col, it));
      const next = { ...blankItem(col), material: hit.material, lot: hit.lot, unit: hit.unit };
      onChange(blank >= 0 ? items.map((it, i) => (i === blank ? next : it)) : [...items, next]);
    };
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {col.fields.map((f) => (
              <span key={f.key} style={{ flex: `1 1 ${f.width || 90}px`, minWidth: Math.min(f.width || 90, 110) }}>
                {f.type === "select" ? (
                  <select style={S.cell} value={it[f.key] || ""} onChange={(e) => setItem(i, f.key, e.target.value)}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    style={S.cell}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    step={f.type === "number" ? "any" : undefined}
                    placeholder={f.label}
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
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {col.lotsFrom && lotOptions.length > 0 && (
            <select
              style={{ ...S.cell, flex: "1 1 180px", width: "auto", background: "#f0fdfa", color: ACCENT, fontWeight: 700 }}
              value=""
              onChange={(e) => pickLot(e.target.value)}
            >
              <option value="">+ Add received lot…</option>
              {lotOptions.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => onChange([...items, blankItem(col)])}
            style={{ ...S.btn("#f1f5f9", "#334155"), padding: "5px 10px" }}
          >
            {col.addLabel || "+ Add line"}
          </button>
        </div>
      </div>
    );
  }
  const type = col.type === "number" ? "number" : col.type === "time" ? "time" : col.type === "date" ? "date" : "text";
  return (
    <input
      style={S.cell}
      type={type}
      step={type === "number" ? "any" : undefined}
      value={value ?? ""}
      list={col.options || col.matrix ? listId : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ═════════════════════════ Entry form ═════════════════════════ */
function LogForm({ schema, record = null, onSaved, onCancel }) {
  const lockedDate = record ? reportDateOf(record) : null;
  const [date, setDate] = useState(lockedDate || todayISO());
  const [existingId, setExistingId] = useState(record ? reportId(record) : null);
  const [header, setHeader] = useState({});
  const [notes, setNotes] = useState("");
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const lotsType = schema.tables.flatMap((t) => t.columns).find((c) => c.lotsFrom)?.lotsFrom || null;
  const lotOptions = useLotSuggestions(lotsType, !!lotsType);
  const matrixProducts = useMatrixProducts(schema.tables.some((t) => t.columns.some((c) => c.matrix)));

  const hydrate = useCallback((payload) => {
    const p = payload || {};
    setHeader(p.header || {});
    setNotes(p.notes || "");
    const next = {};
    schema.tables.forEach((t) => {
      const saved = Array.isArray(p[t.key])
        ? p[t.key].map((r) => {
          const row = { ...blankRow(t), ...r };
          t.columns.forEach((c) => { if (c.type === "list") row[c.key] = listOf(c, row[c.key]); });
          return row;
        })
        : [];
      const pad = Math.max(saved.length ? 2 : t.defaultRows || 3, 0);
      next[t.key] = [...saved, ...Array.from({ length: pad }, () => blankRow(t))];
    });
    setTables(next);
  }, [schema]);

  // Load the sheet for the chosen day (or start a blank one).
  useEffect(() => {
    if (record) { hydrate(record.payload); return undefined; }
    if (!date) return undefined;
    const ctl = new AbortController();
    setLoading(true);
    setMsg(null);
    getReportRowByDate(schema.type, date, { signal: ctl.signal })
      .then((row) => {
        if (ctl.signal.aborted) return;
        setExistingId(row ? reportId(row) : null);
        hydrate(row?.payload);
        if (row) setMsg({ level: "warn", text: `A sheet for ${fmtDate(date)} already exists — you are continuing it. Saving updates the same sheet.` });
      })
      .catch(() => { if (!ctl.signal.aborted) { setExistingId(null); hydrate(null); } })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [date, record, schema.type, hydrate]);

  const ctxHeader = useMemo(() => ({ ...header, reportDate: date }), [header, date]);

  const setCell = (tKey, i, cKey, v) => {
    const t = schema.tables.find((x) => x.key === tKey);
    setTables((prev) => {
      const rows = [...(prev[tKey] || [])];
      const was = rows[i];
      const col = t.columns.find((c) => c.key === cKey);
      const row = { ...was, [cKey]: v, ...(col?.fill ? col.fill(v, was) : {}), ...matrixPatch(col, v, matrixProducts) };
      // Stamp the time the first time a row gets data.
      if (isRowEmpty(t, was)) t.columns.forEach((c) => { if (c.autoNow && !row[c.key] && c.key !== cKey) row[c.key] = nowHHMM(); });
      rows[i] = row;
      return { ...prev, [tKey]: rows };
    });
    setMsg(null);
  };
  // Lists that repeat every day (registers, display units, equipment) start
  // from the newest saved sheet — only the table's carry keys are copied.
  async function copyFromLast(t) {
    try {
      const last = await getLatestReport(schema.type);
      const src = (last?.payload?.[t.key] || []).filter((r) => t.carry.some((k) => String(r[k] ?? "").trim()));
      if (!src.length) return setMsg({ level: "warn", text: "No previous sheet to copy from." });
      const copied = src.map((r) => ({ ...blankRow(t), ...Object.fromEntries(t.carry.map((k) => [k, r[k] ?? ""])) }));
      setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []).filter((r) => !isRowEmpty(t, r)), ...copied] }));
      setMsg({ level: "ok", text: `Copied ${copied.length} row(s) from ${fmtDate(reportDateOf(last))} — fill today's readings.` });
    } catch {
      setMsg({ level: "fail", text: "Could not load the last sheet." });
    }
  }
  const addRow = (t) => setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []), blankRow(t)] }));
  const removeRow = (t, i) => setTables((p) => ({ ...p, [t.key]: (p[t.key] || []).filter((_, idx) => idx !== i) }));

  async function save() {
    if (!date) return setMsg({ level: "fail", text: "Pick the sheet date first." });
    const payload = { reportDate: date, header, notes, savedAt: new Date().toISOString() };
    let count = 0;
    schema.tables.forEach((t) => {
      payload[t.key] = (tables[t.key] || []).filter((r) => !isRowEmpty(t, r)).map((r) => withComputed(t, r));
      count += payload[t.key].length;
    });
    if (!count) return setMsg({ level: "fail", text: "Fill at least one row before saving." });
    payload.summary = summarize(schema, payload);

    setSaving(true);
    setMsg(null);
    const body = JSON.stringify({ reporter: "sweets", type: schema.type, payload });
    const send = (id) => fetch(id ? `${REPORTS_URL}/${encodeURIComponent(id)}` : REPORTS_URL, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials,
      body,
    });
    try {
      let id = existingId;
      let res = await send(id);
      if (res.status === 409) {
        // Someone filed this day meanwhile — update their sheet instead.
        const row = await getReportRowByDate(schema.type, date);
        id = row ? reportId(row) : null;
        if (!id) throw new Error("Sheet exists but could not be found");
        res = await send(id);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => null);
      const saved = json?.report || null;
      setExistingId(saved ? reportId(saved) : id);
      const s = payload.summary;
      setMsg({
        level: s.fails ? "fail" : s.warns ? "warn" : "ok",
        text: `Saved — ${s.rows} row(s)${s.fails ? `, ${s.fails} non-compliant` : ""}${s.warns ? `, ${s.warns} to review` : ""}.`,
      });
      onSaved && onSaved(saved);
    } catch (e) {
      setMsg({ level: "fail", text: `Failed to save: ${e.message || e}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} {schema.title}</h2>
          <p style={S.sub}>{record ? `Editing the sheet of ${fmtDate(lockedDate)}` : "One sheet per day — rows are checked against the limits as you type."}</p>
        </div>
        {onCancel && <button onClick={onCancel} style={S.btn("#e2e8f0", "#334155")}>← Back</button>}
      </div>

      {msg && (
        <div style={{ ...S.card, padding: "10px 14px", background: TONE[msg.level].bg, border: `1px solid ${TONE[msg.level].bd}`, color: TONE[msg.level].fg, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div>
            <span style={S.label}>Date *</span>
            <input type="date" style={S.input} value={date} disabled={!!record} onChange={(e) => setDate(e.target.value)} />
          </div>
          {schema.header.map((f) => (
            <div key={f.key}>
              <span style={S.label}>{f.label}</span>
              {f.type === "select" ? (
                <select style={S.input} value={header[f.key] || ""} onChange={(e) => setHeader((h) => ({ ...h, [f.key]: e.target.value }))}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input style={S.input} value={header[f.key] || ""} onChange={(e) => setHeader((h) => ({ ...h, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", color: "#64748b", fontWeight: 700 }}>⏳ Loading the sheet…</div>
      ) : schema.tables.map((t) => {
        const rows = tables[t.key] || [];
        return (
          <div key={t.key} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#134e4a" }}>{t.title}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {t.carry && <button onClick={() => copyFromLast(t)} style={S.btn("#e0f2fe", "#0369a1")}>⎘ Copy from last sheet</button>}
                <button onClick={() => addRow(t)} style={S.btn(ACCENT)}>+ Add Row</button>
              </div>
            </div>
            {t.columns.filter((c) => (c.options && c.type !== "select") || c.matrix).map((c) => (
              <datalist key={c.key} id={`dl-${schema.type}-${t.key}-${c.key}`}>
                {(c.matrix ? matrixProducts.map((p) => p.name) : c.options).map((o) => <option key={o} value={o} />)}
              </datalist>
            ))}
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 34 }}>#</th>
                    {t.columns.map((c) => <th key={c.key} style={{ ...S.th, minWidth: c.width || 110 }}>{c.label}<Hint c={c} /></th>)}
                    <th style={{ ...S.th, minWidth: 150 }}>Status</th>
                    <th style={{ ...S.th, width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, textAlign: "center", color: "#94a3b8", fontWeight: 700, paddingTop: 10 }}>{i + 1}</td>
                      {t.columns.map((c) => (
                        <td key={c.key} style={S.td}>
                          <Cell
                            col={c}
                            value={r[c.key]}
                            row={r}
                            lotOptions={lotOptions}
                            listId={`dl-${schema.type}-${t.key}-${c.key}`}
                            onChange={(v) => setCell(t.key, i, c.key, v)}
                          />
                        </td>
                      ))}
                      <td style={{ ...S.td, paddingTop: 8 }}><StatusPill status={statusOf(t, r, ctxHeader)} /></td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button onClick={() => removeRow(t, i)} title="Remove row" style={{ ...S.btn("#fee2e2", "#b91c1c"), padding: "5px 9px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div style={S.card}>
        <span style={S.label}>Notes</span>
        <textarea style={{ ...S.input, minHeight: 64, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={save} disabled={saving || loading} style={{ ...S.btn(ACCENT), opacity: saving ? 0.75 : 1 }}>
            {saving ? "Saving…" : existingId ? "💾 Update Sheet" : "💾 Save Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════ Saved sheet (read-only) ═════════════════════════ */
function LogSheet({ schema, record, onBack, onEdit, onDeleted }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const p = record.payload || {};
  const date = reportDateOf(record);
  const header = { ...(p.header || {}), reportDate: date };
  const s = summarize(schema, p);
  const file = `${schema.type}_${date}`;

  async function del() {
    if (!window.confirm(`Delete the ${schema.label} sheet of ${fmtDate(date)}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(reportId(record))}`, { method: "DELETE", credentials });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onDeleted();
    } catch (e) {
      alert(`Failed to delete: ${e.message || e}`);
      setBusy(false);
    }
  }
  const run = (fn) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={S.btn("#e2e8f0", "#334155")}>← All sheets</button>
        <SweetsReportActions
          busy={busy}
          onEdit={canEdit("daily") ? onEdit : undefined}
          onExcel={run(() => excelFromNode(ref.current, file, schema.label))}
          onPdf={run(() => pdfFromNode(ref.current, file))}
          onPrint={() => printNode(ref.current, `${schema.title} — ${fmtDate(date)}`)}
          onDelete={canDelete("daily") ? del : undefined}
        />
      </div>

      <div ref={ref} style={{ ...S.card, padding: "1.2rem" }}>
        <h2 style={{ ...S.h2, marginBottom: 10 }}>{schema.icon} {schema.title}</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 14 }}>
          <tbody>
            <tr>
              <th style={S.th}>Date</th><td style={S.tdView}>{fmtDate(date)}</td>
              {schema.header.map((f) => (
                <React.Fragment key={f.key}><th style={S.th}>{f.label}</th><td style={S.tdView}>{header[f.key] || "—"}</td></React.Fragment>
              ))}
            </tr>
            <tr>
              <th style={S.th}>Rows</th><td style={S.tdView}>{s.rows}</td>
              <th style={S.th}>Non-compliant</th><td style={{ ...S.tdView, color: s.fails ? "#b91c1c" : "#047857", fontWeight: 800 }}>{s.fails}</td>
              <th style={S.th}>To review</th><td style={{ ...S.tdView, color: s.warns ? "#b45309" : "#047857", fontWeight: 800 }}>{s.warns}</td>
              <td colSpan={2} style={S.tdView} />
            </tr>
          </tbody>
        </table>

        {schema.tables.map((t) => {
          const rows = p[t.key] || [];
          return (
            <div key={t.key} style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 900, color: "#134e4a" }}>{t.title}</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>#</th>
                      {t.columns.map((c) => <th key={c.key} style={S.th}>{c.label}<Hint c={c} /></th>)}
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const st = statusOf(t, r, header);
                      const tone = st && st.level !== "ok" ? TONE[st.level].bg : undefined;
                      return (
                        <tr key={i} style={{ background: tone }}>
                          <td style={{ ...S.tdView, color: "#94a3b8" }}>{i + 1}</td>
                          {t.columns.map((c) => (
                            <td key={c.key} style={S.tdView}>
                              {c.type === "list"
                                ? listText(c, r[c.key]).map((line, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{line}</div>)
                                : c.type === "date" ? (r[c.key] ? fmtDate(r[c.key]) : "") : (r[c.key] ?? "")}
                            </td>
                          ))}
                          <td style={S.tdView}>{st ? `${st.level === "ok" ? "✓" : st.level === "warn" ? "!" : "✕"} ${st.text}` : ""}</td>
                        </tr>
                      );
                    })}
                    {!rows.length && <tr><td colSpan={t.columns.length + 2} style={{ ...S.tdView, color: "#94a3b8" }}>No rows.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {p.notes && (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody><tr><th style={{ ...S.th, width: 120 }}>Notes</th><td style={S.tdView}>{p.notes}</td></tr></tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════ Saved sheets browser ═════════════════════════ */
function LogBrowser({ schema }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listReports(schema.type);
      setRecords(rows.sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a))));
    } catch {
      setError("Failed to load sheets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [schema.type]);
  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => [...new Set(records.map((r) => reportDateOf(r).slice(0, 7)).filter(Boolean))], [records]);
  const enriched = useMemo(() => records.map((r) => ({ r, s: summarize(schema, r.payload || {}), text: JSON.stringify(r.payload || {}).toLowerCase() })), [records, schema]);
  const q = search.trim().toLowerCase();
  const shown = enriched.filter(({ r, s, text }) =>
    (!month || reportDateOf(r).startsWith(month)) && (!onlyIssues || s.fails || s.warns) && (!q || text.includes(q)));

  const open = records.find((r) => reportId(r) === openId) || null;
  if (open && editing) {
    return <LogForm schema={schema} record={open} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />;
  }
  if (open) {
    return (
      <LogSheet
        schema={schema}
        record={open}
        onBack={() => setOpenId(null)}
        onEdit={() => setEditing(true)}
        onDeleted={() => { setOpenId(null); load(); }}
      />
    );
  }

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} {schema.title}</h2>
          <p style={S.sub}>{records.length} sheet(s)</p>
        </div>
        <button onClick={load} style={S.btn("#0891b2")}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          style={{ ...S.input, flex: "1 1 260px", background: "#fff" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search anything — product, supplier, lot / batch no., equipment…"
        />
        <select style={{ ...S.input, flex: "0 0 160px", background: "#fff" }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#334155" }}>
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Only with issues
        </label>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 }}>⏳ Loading…</div>}
      {error && <div style={{ ...S.card, background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }}>⚠️ {error}</div>}
      {!loading && !error && !shown.length && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontWeight: 700 }}>{records.length ? "No sheet matches the filters." : "No sheets saved yet."}</div>
      )}

      {!loading && !error && shown.map(({ r, s }) => {
        const h = r.payload?.header || {};
        return (
          <button key={reportId(r)} onClick={() => setOpenId(reportId(r))} style={{ ...S.card, display: "block", width: "100%", textAlign: "left", cursor: "pointer", padding: "0.9rem 1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>📅 {fmtDate(reportDateOf(r))}</div>
                <div style={{ color: "#64748b", fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                  {[h.shift, h.checkedBy && `Checked: ${h.checkedBy}`, h.verifiedBy && `Verified: ${h.verifiedBy}`].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <StatusPill status={{ level: "ok", text: `${s.rows} rows` }} />
                {s.fails > 0 && <StatusPill status={{ level: "fail", text: `${s.fails} non-compliant` }} />}
                {s.warns > 0 && <StatusPill status={{ level: "warn", text: `${s.warns} to review` }} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═════════════════════════ factories for index.js ═════════════════════════ */
const cache = new Map();
function make(kind, type) {
  const key = `${kind}:${type}`;
  if (!cache.has(key)) {
    const schema = schemaByType(type);
    const Comp = kind === "input"
      ? function SweetsLogInput() { return <LogForm schema={schema} />; }
      : function SweetsLogView() { return <LogBrowser schema={schema} />; };
    cache.set(key, Comp);
  }
  return cache.get(key);
}
export const inputFor = (type) => make("input", type);
export const viewFor = (type) => make("view", type);
