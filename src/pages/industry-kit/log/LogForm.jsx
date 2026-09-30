// src/pages/industry-kit/log/LogForm.jsx
// Entry form of one log sheet. One sheet per (company, type, day): picking a
// date that already has a sheet re-opens it, and saving updates that sheet.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bi, bi } from "../i18n/bilingual";
import { reportDateOf, reportId } from "../../monitor/branches/_shared/reportApi";
import { newOutboxId } from "../../../utils/reportOutbox";
import { getSheetByDate, listSheets, saveSheet } from "./api";
import { useLookupOptions, useOpenItems } from "./hooks";
import EntryTable from "./EntryTable";
import { blankRow, fmtDate, isRowEmpty, listOf, nowHHMM, shiftISO, summarize, todayISO, withComputed } from "./rows";
import { ACCENT, S, TONE } from "./styles";

/* A saved table padded with blank rows ready to fill. */
function hydrateTable(t, saved) {
  const rows = Array.isArray(saved)
    ? saved.map((r) => {
      const row = { ...blankRow(t), ...r };
      t.columns.forEach((c) => { if (c.type === "list") row[c.key] = listOf(c, row[c.key]); });
      return row;
    })
    : [];
  const pad = rows.length ? 2 : t.defaultRows || 3;
  return [...rows, ...Array.from({ length: pad }, () => blankRow(t))];
}

function Banner({ msg }) {
  if (!msg) return null;
  const t = TONE[msg.level];
  return (
    <div style={{ ...S.card, padding: "10px 14px", background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontWeight: 700 }}>
      <Bi en={msg.text} ar={msg.ar || ""} />
    </div>
  );
}

function OpenItems({ items, onOpen }) {
  if (!items.length) return null;
  return (
    <div style={{ ...S.card, background: TONE.warn.bg, border: `1px solid ${TONE.warn.bd}` }}>
      <div style={{ fontWeight: 900, color: TONE.warn.fg, marginBottom: 8 }}>
        ⏳ <Bi en={`Still open on earlier sheets (${items.length}) — close them on the sheet where they started`} ar={`مفتوحة في أوراق سابقة (${items.length}) — أغلقها في ورقة يوم البدء`} />
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: "#334155", minWidth: 90 }}>{fmtDate(o.day)}</span>
            <span style={{ flex: "1 1 240px", color: "#475569", fontWeight: 600 }}>{o.text}</span>
            <button type="button" onClick={() => onOpen(o.day)} style={{ ...S.btn("#fff", TONE.warn.fg), border: `1px solid ${TONE.warn.bd}`, padding: "5px 12px" }}>
              <Bi en="Open that sheet →" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LogForm({ schema, record = null, onSaved, onCancel }) {
  const lockedDate = record ? reportDateOf(record) : null;
  const [date, setDate] = useState(lockedDate || todayISO());
  const [existingId, setExistingId] = useState(record ? reportId(record) : null);
  const [header, setHeader] = useState({});
  const [notes, setNotes] = useState("");
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const lookupCol = useMemo(() => schema.tables.flatMap((t) => t.columns).find((c) => c.lookup) || null, [schema]);
  const lookupOptions = useLookupOptions(lookupCol);
  const openPrev = useOpenItems(schema, date, !record);
  const dirtyRef = useRef(false);
  // One id per NEW sheet, reused on every save of it (online or kept offline),
  // so saving twice never files the day twice. Renewed when another day opens.
  const outboxIdRef = useRef(newOutboxId());

  const hydrate = useCallback((payload) => {
    const p = payload || {};
    setHeader(p.header || {});
    setNotes(p.notes || "");
    setTables(Object.fromEntries(schema.tables.map((t) => [t.key, hydrateTable(t, p[t.key])])));
    dirtyRef.current = false;
  }, [schema]);

  // Load the sheet of the chosen day (or start a blank one) — one request.
  useEffect(() => {
    if (record) { hydrate(record.payload); return undefined; }
    if (!date) return undefined;
    const ctl = new AbortController();
    setLoading(true);
    setMsg(null);
    outboxIdRef.current = newOutboxId();
    getSheetByDate(schema.type, date, { signal: ctl.signal })
      .then((row) => {
        if (ctl.signal.aborted) return;
        setExistingId(row ? reportId(row) : null);
        hydrate(row?.payload);
        if (row) setMsg({ level: "warn", text: `A sheet for ${fmtDate(date)} already exists — you are continuing it. Saving updates the same sheet.`, ar: `توجد ورقة بتاريخ ${fmtDate(date)} — أنت تكمل عليها، والحفظ يحدّث نفس الورقة.` });
      })
      .catch(() => {
        if (ctl.signal.aborted) return;
        setExistingId(null);
        hydrate(null);
        setMsg({
          level: "warn",
          text: `Could not load the sheet of ${fmtDate(date)} (no connection?). You can still fill it in — if that day already has a sheet, the rows you save are added to it.`,
          ar: `تعذّر تحميل ورقة ${fmtDate(date)} (لا يوجد اتصال؟). يمكنك التعبئة — وإن كانت لذلك اليوم ورقة، تُضاف الأسطر التي تحفظها إليها.`,
        });
      })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [date, record, schema.type, hydrate]);

  const ctxHeader = useMemo(() => ({ ...header, reportDate: date }), [header, date]);

  const setCell = (t, i, cKey, v) => {
    setTables((prev) => {
      const rows = [...(prev[t.key] || [])];
      const was = rows[i];
      const col = t.columns.find((c) => c.key === cKey);
      const hit = col?.lookup ? lookupOptions.find((o) => o.value === v) : null;
      // Stamp the time / sheet date the first time a row gets data.
      const base = { ...was };
      if (isRowEmpty(t, was)) t.columns.forEach((c) => {
        if (c.key === cKey || base[c.key]) return;
        if (c.autoNow) base[c.key] = nowHHMM();
        if (c.autoDate) base[c.key] = date;
      });
      rows[i] = { ...base, [cKey]: v, ...(col?.fill ? col.fill(v, base) : {}), ...(hit ? hit.patch : {}) };
      return { ...prev, [t.key]: rows };
    });
    dirtyRef.current = true;
    setMsg(null);
  };

  const openDay = (d) => {
    if (dirtyRef.current && !window.confirm(`Open the sheet of ${fmtDate(d)}? Unsaved changes on this sheet will be lost.`)) return;
    setDate(d);
  };

  // Lists that repeat every day (units, stations, staff) start from the newest
  // sheet of the last 30 days — one ranged read, only the carry keys copied.
  async function copyFromLast(t) {
    try {
      const rows = await listSheets(schema.type, { from: shiftISO(date, -30), to: shiftISO(date, -1) });
      const last = rows[0];
      const src = (last?.payload?.[t.key] || []).filter((r) => t.carry.some((k) => String(r[k] ?? "").trim()));
      if (!src.length) return setMsg({ level: "warn", text: "No previous sheet in the last 30 days to copy from.", ar: "لا توجد ورقة سابقة خلال آخر 30 يوماً للنسخ منها." });
      const copied = src.map((r) => ({ ...blankRow(t), ...Object.fromEntries(t.carry.map((k) => [k, r[k] ?? ""])) }));
      setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []).filter((r) => !isRowEmpty(t, r)), ...copied] }));
      dirtyRef.current = true;
      setMsg({ level: "ok", text: `Copied ${copied.length} row(s) from ${fmtDate(reportDateOf(last))} — fill today's readings.`, ar: `تم نسخ ${copied.length} سطر من ${fmtDate(reportDateOf(last))} — عبّئ قراءات اليوم.` });
    } catch {
      setMsg({ level: "fail", text: "Could not load the last sheet.", ar: "تعذّر تحميل آخر ورقة." });
    }
  }

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
    try {
      const res = await saveSheet(schema, payload, existingId, outboxIdRef.current);
      dirtyRef.current = false;
      if (res.queued) {
        setMsg({
          level: "warn",
          text: "No connection — the sheet is kept on this device and will be sent automatically when the connection is back.",
          ar: "لا يوجد اتصال — حُفظت الورقة على هذا الجهاز وستُرسل تلقائياً عند عودة الاتصال.",
        });
        return;
      }
      const { saved, id } = res;
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

  const tableOps = (t) => ({
    onCell: (i, k, v) => setCell(t, i, k, v),
    onAdd: () => setTables((p) => ({ ...p, [t.key]: [...(p[t.key] || []), blankRow(t)] })),
    onRemove: (i) => setTables((p) => ({ ...p, [t.key]: (p[t.key] || []).filter((_, idx) => idx !== i) })),
    onCopy: () => copyFromLast(t),
  });

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} <Bi en={schema.title} /></h2>
          <p style={S.sub}>
            {record
              ? <Bi en={`Editing the sheet of ${fmtDate(lockedDate)}`} ar={`تعديل ورقة ${fmtDate(lockedDate)}`} />
              : <Bi en="One sheet per day — rows are checked against the limits as you type." ar="ورقة واحدة يومياً — تُفحص الأسطر مقابل الحدود أثناء الكتابة." />}
          </p>
        </div>
        {onCancel && <button type="button" onClick={onCancel} style={S.btn("#e2e8f0", "#334155")}>← <Bi en="Back" /></button>}
      </div>

      <Banner msg={msg} />
      <OpenItems items={openPrev} onOpen={openDay} />

      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div>
            <span style={S.label}><Bi en="Date *" /></span>
            <input type="date" style={S.input} value={date} disabled={!!record} onChange={(e) => openDay(e.target.value)} />
          </div>
          {schema.header.map((f) => (
            <div key={f.key}>
              <span style={S.label}><Bi en={f.label} /></span>
              {f.type === "select" ? (
                <select style={S.input} value={header[f.key] || ""} onChange={(e) => { setHeader((h) => ({ ...h, [f.key]: e.target.value })); dirtyRef.current = true; }}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
                </select>
              ) : (
                <input style={S.input} value={header[f.key] || ""} onChange={(e) => { setHeader((h) => ({ ...h, [f.key]: e.target.value })); dirtyRef.current = true; }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", color: "#64748b", fontWeight: 700 }}>⏳ <Bi en="Loading the sheet…" ar="جارٍ تحميل الورقة…" /></div>
      ) : schema.tables.map((t) => (
        <EntryTable
          key={t.key}
          schema={schema}
          table={t}
          rows={tables[t.key] || []}
          header={ctxHeader}
          lookupOptions={lookupOptions}
          {...tableOps(t)}
        />
      ))}

      <div style={S.card}>
        <span style={S.label}><Bi en="Notes" /></span>
        <textarea style={{ ...S.input, minHeight: 64, resize: "vertical" }} value={notes} onChange={(e) => { setNotes(e.target.value); dirtyRef.current = true; }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" onClick={save} disabled={saving || loading} style={{ ...S.btn(ACCENT), opacity: saving ? 0.75 : 1 }}>
            {saving ? <Bi en="Saving…" /> : <>💾 <Bi en={existingId ? "Update Sheet" : "Save Sheet"} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
