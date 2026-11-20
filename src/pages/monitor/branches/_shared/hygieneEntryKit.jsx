// src/pages/monitor/branches/_shared/hygieneEntryKit.jsx
// ───────────────────────────────────────────────────────────────────────────
// Quick-entry helpers for the branch Personal Hygiene sheets (POS 10, POS 11):
//
//   useDayReport({ type, reporter, date, onLoad, onBlank })
//       Opens the saved report of that date in the same page (edit mode) and
//       saves with PUT /api/reports/:id — never a second POST for the same day
//       (reports upsert landmine). Unknown payload fields survive an update.
//   <CycleCell />   one tap cycles a cell through its values (empty → C → NC …)
//   fillEmpty()     "All C" — fills every empty cell, leaves marked ones alone
//   todayDubai()
//
// Checked by (employee number → locked name, FTR 1 pattern) comes from
// pos19/_shared/pos19EntryKit (useCheckedBy + CheckedByField).
// ───────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import React from "react";
import { saveReport as outboxSave, newOutboxId, queuedMessage } from "../../../../utils/reportOutbox";
import { getReportRowByDate, payloadOf, reportId } from "./reportApi";

const clean = (s) => String(s ?? "").trim();

export function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/**
 * Loads (type, date) and hands the payload to `onLoad`. When the date has no
 * report, `onBlank` runs only if the screen was showing another day's saved
 * record — a slow reply never wipes a sheet the user already started.
 */
export function useDayReport({ type, reporter, date, onLoad, onBlank }) {
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const reqRef = useRef(0);
  const baseRef = useRef({});
  const loadedRef = useRef(false);
  const cbRef = useRef({ onLoad, onBlank });
  cbRef.current = { onLoad, onBlank };
  const sheetIdRef = useRef(newOutboxId());

  const flash = useCallback((text, ms = 3000) => {
    setMsg(text);
    if (ms) setTimeout(() => setMsg((m) => (m === text ? "" : m)), ms);
  }, []);

  useEffect(() => {
    if (!type || !date) return undefined;
    const myReq = ++reqRef.current;
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const row = await getReportRowByDate(type, date, { signal: ctrl.signal });
        if (myReq !== reqRef.current) return;
        if (row) {
          const p = payloadOf(row) || {};
          baseRef.current = p;
          loadedRef.current = true;
          setExistingId(reportId(row));
          cbRef.current.onLoad?.(p);
          setMsg("📝 Loaded the saved report for this date — edit mode");
        } else {
          baseRef.current = {};
          setExistingId(null);
          if (loadedRef.current) cbRef.current.onBlank?.();
          loadedRef.current = false;
          flash("✏️ New report");
        }
      } catch {
        if (myReq === reqRef.current && !ctrl.signal.aborted) flash("⚠️ Could not load the saved report", 4000);
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [type, date, flash]);

  const startNew = useCallback(() => {
    baseRef.current = {};
    loadedRef.current = false;
    setExistingId(null);
    cbRef.current.onBlank?.();
  }, []);

  /** PUT over the opened record, or POST a new one; offline → kept on the device. */
  const save = useCallback(
    async (payload, label) => {
      const id = existingId || null;
      const merged = { ...baseRef.current, ...payload, savedAt: Date.now() };
      if (!id && !merged._outboxId) merged._outboxId = `${sheetIdRef.current}:${merged.reportDate || ""}`;
      try {
        const r = await outboxSave({ body: { reporter, type, payload: merged }, id, label });
        if (r.queued) {
          flash(queuedMessage("en"), 6000);
          return true;
        }
        const savedId = reportId(r.report) ?? id;
        if (savedId != null) setExistingId(savedId);
        baseRef.current = merged;
        loadedRef.current = true;
        flash(id ? "✅ Updated" : "✅ Saved successfully!");
        return true;
      } catch (err) {
        if (err?.status === 409) {
          alert("⚠️ A report already exists for this date — reopen the page to edit it.\nيوجد تقرير محفوظ لنفس التاريخ — أعد فتح الصفحة لتعديله.");
          return false;
        }
        flash("❌ Failed to save: " + (err?.message || String(err)), 6000);
        return false;
      }
    },
    [existingId, reporter, type, flash]
  );

  return { existingId, editing: !!existingId, loading, msg, flash, startNew, save };
}

/** Small status pill + 🆕 button. */
export function DayStatus({ day }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {day.loading && <span style={PILL.load}>Loading…</span>}
      {!day.loading && day.msg && <span style={day.editing ? PILL.edit : PILL.ok}>{day.msg}</span>}
      {day.editing && (
        <button
          type="button"
          onClick={() => { if (window.confirm("Start a new blank sheet?")) day.startNew(); }}
          style={PILL.btn}
        >
          🆕 New
        </button>
      )}
    </span>
  );
}

const PILL = {
  load: { padding: "6px 10px", background: "#f1f5f9", color: "#475569", borderRadius: 8, fontSize: 12, fontWeight: 700 },
  edit: { padding: "6px 10px", background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: 12, fontWeight: 700 },
  ok: { padding: "6px 10px", background: "#e0f2fe", color: "#075985", borderRadius: 8, fontSize: 12, fontWeight: 700 },
  btn: { background: "#fff", color: "#334155", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontWeight: 700, cursor: "pointer" },
};

/* ══════════════════════════════════════ one-tap cells */

/** Colours for the usual values; anything else falls back to neutral. */
const TONE = {
  C: "good", Yes: "good", "√": "good",
  NC: "bad", No: "bad", "✗": "bad",
};

/**
 * One tap moves to the next value of `cycle` (default "" → C → NC → "").
 * `tones` overrides which value is green/red (e.g. a "Yes = bad" question).
 */
export function CycleCell({ value = "", onChange, cycle = ["", "C", "NC"], disabled = false, tones, title }) {
  const v = clean(value);
  const idx = cycle.indexOf(v);
  const next = cycle[(idx + 1) % cycle.length] ?? cycle[0];
  const tone = (tones && tones[v]) || TONE[v] || (v ? "neutral" : "empty");
  const look = {
    good: { bg: "#16a34a", bd: "#16a34a", fg: "#fff" },
    bad: { bg: "#dc2626", bd: "#dc2626", fg: "#fff" },
    neutral: { bg: "#e2e8f0", bd: "#94a3b8", fg: "#0f172a" },
    empty: { bg: "#fff", bd: "#cbd5e1", fg: "#94a3b8" },
  }[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      title={title || `Tap to change (${cycle.map((c) => c || "empty").join(" → ")})`}
      style={{
        width: "100%",
        minWidth: 44,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${look.bd}`,
        background: disabled ? "#f1f5f9" : look.bg,
        color: disabled ? "#cbd5e1" : look.fg,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        lineHeight: 1,
      }}
    >
      {disabled ? "—" : v || "·"}
    </button>
  );
}

/** Fill every empty `keys` cell with `value` on rows where `isActive(row)`. */
export function fillEmpty(rows, keys, value, isActive = () => true) {
  return rows.map((r) => {
    if (!isActive(r)) return r;
    const n = { ...r };
    keys.forEach((k) => { if (!clean(n[k])) n[k] = value; });
    return n;
  });
}

export function FillAllButton({ onClick, label = "All C", title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || "Fill every empty cell (cells already marked stay)"}
      style={{
        background: "#16a34a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      ✓ {label}
    </button>
  );
}
