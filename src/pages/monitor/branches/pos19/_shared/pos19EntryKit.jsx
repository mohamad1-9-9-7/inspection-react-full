// src/pages/monitor/branches/pos19/_shared/pos19EntryKit.jsx
// ───────────────────────────────────────────────────────────────────────────
// Shared helpers that make the POS 19 (Al Warqa Kitchen) input sheets quicker
// to fill:
//
//   usePos19Day(type, date, { onLoad, onBlank })
//       Opens the day's saved report in the same page (edit mode) instead of
//       locking the sheet and sending the user to the View screen.
//   savePos19Report({ ... })
//       One save path: PUT over the opened record, POST a new one, keep it on
//       the device when offline (utils/reportOutbox).
//   useCheckedBy() + <CheckedByField />
//       "Checked by" the FTR 1 way: employee number → locked name from the
//       Staff Directory. (Only Checked by — FTR 1's extra "Created by" box is
//       deliberately not added here.)
//   <TickCell /> + tickAll()
//       One tap cycles a cell  empty → √ → ✗ → empty;  "All √" fills a sheet.
//   <FoodItemInput />
//       Pick a product from the catalog, or keep typing free text.
// ───────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from "react";
import { saveReport as outboxSave, newOutboxId, queuedMessage } from "../../../../../utils/reportOutbox";
import { getReportByDate, reportId, invalidateReportDates } from "./reportsApi";
import { useStaffDirectory } from "../../_shared/staffRegistry";
import { makeEmployeeFinder } from "../../ftr1/ftr1Signatures";
import { EmpNoField } from "../../ftr1/CreatorBadge";
import {
  ItemNameInput,
  useCatalogIndex,
  normalizeName as normalizeCatalogName,
} from "../../_shared/CodedProductField";

export const REPORTER = "pos19";
export const TICK_OK = "√";
export const TICK_BAD = "✗";

const norm = (s) => String(s ?? "").trim();

/** Today in Dubai as YYYY-MM-DD. */
export function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/* ══════════════════════════════════════ Day record (edit in place) */

/**
 * Loads the saved report for (type, reportDate) and hands its payload to
 * `onLoad`. When the date has no report, `onBlank` runs — but only if the
 * screen was showing another day's saved record, so a slow reply never wipes
 * what the user has already started typing on a fresh sheet.
 */
export function usePos19Day(type, reportDate, { onLoad, onBlank } = {}) {
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const reqRef = useRef(0);
  const baseRef = useRef({}); // the loaded payload — unknown fields survive an update
  const loadedRef = useRef(false);
  const cbRef = useRef({ onLoad, onBlank });
  cbRef.current = { onLoad, onBlank };
  const sheetIdRef = useRef(newOutboxId());

  const flash = useCallback((text, ms = 2500) => {
    setMsg(text);
    if (ms) setTimeout(() => setMsg((m) => (m === text ? "" : m)), ms);
  }, []);

  useEffect(() => {
    if (!type || !reportDate) return undefined;
    const myReq = ++reqRef.current;
    setLoading(true);
    (async () => {
      try {
        const row = await getReportByDate(type, reportDate);
        if (myReq !== reqRef.current) return;
        if (row) {
          const p = row.payload || {};
          baseRef.current = p;
          loadedRef.current = true;
          setExistingId(reportId(row));
          cbRef.current.onLoad?.(p);
          setMsg("📝 Loaded the saved report — edit mode");
        } else {
          baseRef.current = {};
          setExistingId(null);
          if (loadedRef.current) cbRef.current.onBlank?.();
          loadedRef.current = false;
          flash("✏️ New report");
        }
      } catch {
        if (myReq === reqRef.current) flash("⚠️ Could not load the saved report", 3500);
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    })();
    return undefined;
  }, [type, reportDate, flash]);

  /** Clear back to a new sheet (the 🆕 button). */
  const startNew = useCallback(() => {
    baseRef.current = {};
    loadedRef.current = false;
    setExistingId(null);
    cbRef.current.onBlank?.();
  }, []);

  return {
    existingId,
    editing: !!existingId,
    loading,
    msg,
    flash,
    startNew,
    base: () => baseRef.current,
    sheetId: sheetIdRef.current,
    setSaved: (id, payload) => {
      if (id != null) setExistingId(id);
      baseRef.current = payload || baseRef.current;
      loadedRef.current = true;
    },
  };
}

/**
 * Save the sheet. `day` is the usePos19Day() result; `dateStatus` the
 * useReportDateStatus() result. Returns true when it was saved or queued.
 */
export async function savePos19Report({ type, payload, day, dateStatus, label }) {
  const merged = { ...(day?.base?.() || {}), ...payload, savedAt: Date.now() };
  const id = day?.existingId || null;
  if (!id && !merged._outboxId) merged._outboxId = `${day?.sheetId || newOutboxId()}:${merged.reportDate || ""}`;
  try {
    const r = await outboxSave({
      body: { reporter: REPORTER, type, payload: merged },
      id,
      label: label || `POS 19 ${type} ${merged.reportDate || ""}`,
    });
    if (r.queued) {
      day?.flash?.(queuedMessage("ar"), 6000);
      return true;
    }
    const savedId = reportId(r.report) ?? id;
    day?.setSaved?.(savedId, merged);
    invalidateReportDates(type);
    dateStatus?.refresh?.();
    day?.flash?.(id ? "✅ Updated" : "✅ Saved");
    return true;
  } catch (err) {
    if (err?.status === 409) {
      alert("⚠️ A report already exists for this date — reload the page to open it.\nيوجد تقرير محفوظ لنفس التاريخ — أعد فتح الصفحة لتعديله.");
      dateStatus?.refresh?.();
      return false;
    }
    alert("❌ Save failed: " + (err?.message || String(err)));
    return false;
  }
}

/** Small status pill + 🆕 button for the toolbar. */
export function DayStatus({ day, style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", ...style }}>
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

/* ══════════════════════════════════════ Checked by (FTR 1 pattern) */

/**
 * Employee number → locked name. A report saved before this change carries
 * only a typed name; it is kept as-is until a number is entered.
 */
export function useCheckedBy(directory) {
  const dir = directory || {};
  const find = makeEmployeeFinder(dir.byNo);
  const [empNo, setEmpNo] = useState("");
  const [legacyName, setLegacyName] = useState("");

  const match = find(empNo);
  const name = match ? match.name : norm(empNo) ? "" : legacyName;
  const unknown = !!norm(empNo) && !dir.loading && !match;

  const errors = [];
  if (!norm(empNo) && !legacyName) errors.push("Checked by: enter the employee number.");
  else if (unknown) errors.push(`Checked by: employee number "${norm(empNo)}" was not found in the Staff Directory.`);

  return {
    empNo,
    setEmpNo,
    name,
    unknown,
    errors,
    /** payload fields */
    fields: () => ({ checkedBy: name, checkedByEmpNo: norm(empNo) }),
    load: (p = {}) => {
      setEmpNo(norm(p.checkedByEmpNo));
      setLegacyName(norm(p.checkedByEmpNo) ? "" : norm(p.checkedBy));
    },
    reset: () => { setEmpNo(""); setLegacyName(""); },
  };
}

/** useCheckedBy over its own Staff Directory read (pages without a roster). */
export function usePos19CheckedBy() {
  return useCheckedBy(useStaffDirectory());
}

export function CheckedByField({ sig, label = "Checked by:" }) {
  return (
    <EmpNoField
      label={label}
      icon="🧑‍💼"
      title="Employee number of the person who checked the sheet"
      empNo={sig.empNo}
      name={sig.name}
      unknown={sig.unknown}
      onEmpNoChange={sig.setEmpNo}
    />
  );
}

/* ══════════════════════════════════════ √ / ✗ tap cells */

const NEXT = { "": TICK_OK, [TICK_OK]: TICK_BAD, [TICK_BAD]: "" };

/** One tap: empty → √ → ✗ → empty. */
export function TickCell({ value = "", onChange, disabled = false, title }) {
  const v = value === TICK_OK || value === TICK_BAD ? value : value ? value : "";
  const ok = v === TICK_OK;
  const bad = v === TICK_BAD;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(NEXT[v] ?? TICK_OK)}
      title={title || "Tap: √ Satisfactory → ✗ Needs improvement → empty"}
      aria-label={ok ? "Satisfactory" : bad ? "Needs improvement" : "Not marked"}
      style={{
        width: "100%",
        minWidth: 44,
        height: 34,
        borderRadius: 8,
        border: `1px solid ${ok ? "#16a34a" : bad ? "#dc2626" : "#cbd5e1"}`,
        background: ok ? "#16a34a" : bad ? "#dc2626" : "#fff",
        color: ok || bad ? "#fff" : "#94a3b8",
        fontWeight: 900,
        fontSize: 16,
        cursor: disabled ? "default" : "pointer",
        lineHeight: 1,
      }}
    >
      {v || "·"}
    </button>
  );
}

/**
 * Fill every empty tick in `keys` with √ (rows where `isActive(row)` is true —
 * by default every row). Cells already marked ✗ are left alone.
 */
export function tickAll(rows, keys, isActive = () => true) {
  return rows.map((r) => {
    if (!isActive(r)) return r;
    const next = { ...r };
    keys.forEach((k) => { if (!norm(next[k])) next[k] = TICK_OK; });
    return next;
  });
}

export function AllTickButton({ onClick, label = "All √", style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Mark every empty cell as √ (cells already ✗ stay)"
      style={{
        background: "#16a34a",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(22,163,74,.25)",
        ...style,
      }}
    >
      ✓ {label}
    </button>
  );
}

/* ══════════════════════════════════════ Catalog item (free text allowed) */

/**
 * Product name from the catalog. Picking a suggestion also hands back the
 * item code (`onChange(name, code)`); free text is still accepted.
 */
export function FoodItemInput({ value = "", code = "", onChange, style, placeholder = "Item (catalog or free text)", title }) {
  const { byName } = useCatalogIndex();
  return (
    <ItemNameInput
      name={value}
      code={code}
      placeholder={placeholder}
      title={title}
      style={style}
      // Free text keeps no code: a code only sticks while the name is a catalog name.
      onChange={({ name, code: c }) => onChange(name, byName.has(normalizeCatalogName(name)) ? c || "" : "")}
    />
  );
}

/* ══════════════════════════════════════ Staff roster (Personal Hygiene) */

export const POS19_HYGIENE_FORM_KEY = "pos19_personal_hygiene";
