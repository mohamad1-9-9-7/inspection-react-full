// src/companies/exaltis/reports/dailyLog/LogForm.jsx
// Daily log engine — the entry form (one day's rows).
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import { reportDateOf, reportId, getReportRowByDate, getLatestReport } from "../../../../pages/monitor/branches/_shared/reportApi";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Bi, bi } from "../bilingual";
import { REPORTS_URL, credentials, todayISO, nowHHMM, fmtDate, blankRow, listOf, isRowEmpty, withComputed, statusOf, summarize, matrixPatch } from "./logCore";
import { ACCENT, S, TONE, StatusPill, Hint } from "./logStyles";
import { useLotSuggestions, useLookupOptions, useOpenItems, useMatrixProducts } from "./logHooks";
import { Cell } from "./Cell";

/* ═════════════════════════ Entry form ═════════════════════════ */
export function LogForm({ schema, record = null, onSaved, onCancel }) {
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
  const lookupCol = schema.tables.flatMap((t) => t.columns).find((c) => c.lookup) || null;
  const lookupOptions = useLookupOptions(lookupCol);
  const openPrev = useOpenItems(schema, date, !record);
  const dirtyRef = useRef(false);

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
    dirtyRef.current = false;
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
        if (row) setMsg({ level: "warn", text: `A sheet for ${fmtDate(date)} already exists — you are continuing it. Saving updates the same sheet.`, ar: `توجد ورقة بتاريخ ${fmtDate(date)} — أنت تكمل عليها، والحفظ يحدّث نفس الورقة.` });
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
      const hit = col?.lookup ? lookupOptions.find((o) => o.value === v) : null;
      // Stamp the time / sheet date the first time a row gets data — before
      // `fill`, which may read them.
      const base = { ...was };
      if (isRowEmpty(t, was)) t.columns.forEach((c) => {
        if (c.key === cKey || base[c.key]) return;
        if (c.autoNow) base[c.key] = nowHHMM();
        if (c.autoDate) base[c.key] = date;
      });
      const row = { ...base, [cKey]: v, ...(col?.fill ? col.fill(v, base) : {}), ...matrixPatch(col, v, matrixProducts), ...(hit ? hit.patch : {}) };
      rows[i] = row;
      return { ...prev, [tKey]: rows };
    });
    dirtyRef.current = true;
    setMsg(null);
  };
  const openDay = (d) => {
    if (dirtyRef.current && !window.confirm(`Open the sheet of ${fmtDate(d)}? Unsaved changes on this sheet will be lost.`)) return;
    setDate(d);
  };
  // Lists that repeat every day (registers, display units, equipment) start
  // from the newest saved sheet — only the table's carry keys are copied.
  async function copyFromLast(t) {
    try {
      const last = await getLatestReport(schema.type);
      const src = (last?.payload?.[t.key] || []).filter((r) => t.carry.some((k) => String(r[k] ?? "").trim()));
      if (!src.length) return setMsg({ level: "warn", text: "No previous sheet to copy from.", ar: "لا توجد ورقة سابقة للنسخ منها." });
      const copied = src.map((r) => ({ ...blankRow(t), ...Object.fromEntries(t.carry.map((k) => [k, r[k] ?? ""])) }));
      setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []).filter((r) => !isRowEmpty(t, r)), ...copied] }));
      setMsg({ level: "ok", text: `Copied ${copied.length} row(s) from ${fmtDate(reportDateOf(last))} — fill today's readings.`, ar: `تم نسخ ${copied.length} سطر من ${fmtDate(reportDateOf(last))} — عبّئ قراءات اليوم.` });
    } catch {
      setMsg({ level: "fail", text: "Could not load the last sheet.", ar: "تعذّر تحميل آخر ورقة." });
    }
  }
  const addRow = (t) => setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []), blankRow(t)] }));
  const removeRow = (t, i) => setTables((p) => ({ ...p, [t.key]: (p[t.key] || []).filter((_, idx) => idx !== i) }));

  async function save() {
    if (!date) return setMsg({ level: "fail", text: "Pick the sheet date first.", ar: "اختر تاريخ الورقة أولاً." });
    const payload = { reportDate: date, header, notes, savedAt: new Date().toISOString() };
    let count = 0;
    schema.tables.forEach((t) => {
      payload[t.key] = (tables[t.key] || []).filter((r) => !isRowEmpty(t, r)).map((r) => withComputed(t, r));
      count += payload[t.key].length;
    });
    if (!count) return setMsg({ level: "fail", text: "Fill at least one row before saving.", ar: "عبّئ سطراً واحداً على الأقل قبل الحفظ." });
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
      dirtyRef.current = false;
      setExistingId(saved ? reportId(saved) : id);
      const s = payload.summary;
      setMsg({
        level: s.fails ? "fail" : s.warns ? "warn" : "ok",
        text: `Saved — ${s.rows} row(s)${s.fails ? `, ${s.fails} non-compliant` : ""}${s.warns ? `, ${s.warns} to review` : ""}.`,
        ar: `تم الحفظ — ${s.rows} سطر${s.fails ? `، ${s.fails} غير مطابق` : ""}${s.warns ? `، ${s.warns} للمراجعة` : ""}.`,
      });
      onSaved && onSaved(saved);
    } catch (e) {
      setMsg({ level: "fail", text: `Failed to save: ${e.message || e}`, ar: "فشل الحفظ" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} <Bi en={schema.title} /></h2>
          <p style={S.sub}>{record ? <Bi en={`Editing the sheet of ${fmtDate(lockedDate)}`} ar={`تعديل ورقة ${fmtDate(lockedDate)}`} /> : <Bi en="One sheet per day — rows are checked against the limits as you type." ar="ورقة واحدة يومياً — تُفحص الأسطر مقابل الحدود أثناء الكتابة." />}</p>
        </div>
        {onCancel && <button onClick={onCancel} style={S.btn("#e2e8f0", "#334155")}>← Back</button>}
      </div>

      {msg && (
        <div style={{ ...S.card, padding: "10px 14px", background: TONE[msg.level].bg, border: `1px solid ${TONE[msg.level].bd}`, color: TONE[msg.level].fg, fontWeight: 700 }}>
          <Bi en={msg.text} ar={msg.ar || ""} />
        </div>
      )}

      {openPrev.length > 0 && (
        <div style={{ ...S.card, background: TONE.warn.bg, border: `1px solid ${TONE.warn.bd}` }}>
          <div style={{ fontWeight: 900, color: TONE.warn.fg, marginBottom: 8 }}>
            ⏳ <Bi en={`Still open on earlier sheets (${openPrev.length}) — close them on the sheet where they started`} ar={`مفتوحة في أوراق سابقة (${openPrev.length}) — أغلقها في ورقة يوم البدء`} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {openPrev.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, color: "#334155", minWidth: 90 }}>{fmtDate(o.day)}</span>
                <span style={{ flex: "1 1 240px", color: "#475569", fontWeight: 600 }}>{o.text}</span>
                <button onClick={() => openDay(o.day)} style={{ ...S.btn("#fff", TONE.warn.fg), border: `1px solid ${TONE.warn.bd}`, padding: "5px 12px" }}>
                  <Bi en="Open that sheet →" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div>
            <span style={S.label}><Bi en="Date *" /></span>
            <input type="date" style={S.input} value={date} disabled={!!record} onChange={(e) => setDate(e.target.value)} />
          </div>
          {schema.header.map((f) => (
            <div key={f.key}>
              <span style={S.label}><Bi en={f.label} /></span>
              {f.type === "select" ? (
                <select style={S.input} value={header[f.key] || ""} onChange={(e) => setHeader((h) => ({ ...h, [f.key]: e.target.value }))}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
                </select>
              ) : (
                <input style={S.input} value={header[f.key] || ""} onChange={(e) => setHeader((h) => ({ ...h, [f.key]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", color: "#64748b", fontWeight: 700 }}>⏳ <Bi en="Loading the sheet…" ar="جارٍ تحميل الورقة…" /></div>
      ) : schema.tables.map((t) => {
        const rows = tables[t.key] || [];
        return (
          <div key={t.key} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#134e4a" }}><Bi en={t.title} /></h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {t.carry && <button onClick={() => copyFromLast(t)} style={S.btn("#e0f2fe", "#0369a1")}>⎘ <Bi en="Copy from last sheet" /></button>}
                <button onClick={() => addRow(t)} style={S.btn(ACCENT)}><Bi en="+ Add Row" /></button>
              </div>
            </div>
            {t.columns.filter((c) => (c.options && c.type !== "select") || c.matrix).map((c) => (
              <datalist key={c.key} id={`dl-${schema.type}-${t.key}-${c.key}`}>
                {(c.matrix ? matrixProducts.map((p) => p.name) : c.options).map((o) => <option key={o} value={o} />)}
              </datalist>
            ))}
            {t.columns.filter((c) => c.lookup).map((c) => (
              <datalist key={c.key} id={`dl-${schema.type}-${t.key}-${c.key}`}>
                {lookupOptions.map((o) => <option key={o.value} value={o.value} label={o.label} />)}
              </datalist>
            ))}
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 34 }}>#</th>
                    {t.columns.map((c) => <th key={c.key} style={{ ...S.th, minWidth: c.width || 110 }}><Bi en={c.label} ar={c.ar} stack /><Hint c={c} /></th>)}
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
        <span style={S.label}><Bi en="Notes" /></span>
        <textarea style={{ ...S.input, minHeight: 64, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={save} disabled={saving || loading} style={{ ...S.btn(ACCENT), opacity: saving ? 0.75 : 1 }}>
            {saving ? <Bi en="Saving…" /> : <>💾 <Bi en={existingId ? "Update Sheet" : "Save Sheet"} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
