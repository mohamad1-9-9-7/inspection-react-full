// src/pages/hse/hseFormKit.jsx
// The input-form kit for every HSE report.
//
// HSE pages used to draw their own orange cards and check two or three fields
// with alert(). The other cards (POS 6, Production, QCS) all share one design:
// a banner header with the document-control fields, a guidance panel that says
// how to fill the sheet, panels of fields, and a save bar. This file gives HSE
// that same design (it reuses BranchFormShell + PRDReportHeader directly), plus
// one rules engine so a value outside its allowed range can never be saved.
//
// A page declares its rules once:
//   const RULES = [
//     { key: "reportDate", label: {ar,en}, type: "date", required: true, notFuture: true },
//     { key: "age",        label: {ar,en}, type: "int",  min: 16, max: 70 },
//     { key: "deadline",   label: {ar,en}, type: "date", afterOrEqual: "reportDate" },
//   ];
// and gets: live red fields while typing, a summary of every problem on Save,
// and a save that refuses to run until the list is empty.

import React, { useCallback, useMemo, useRef, useState } from "react";
import FormShell, { GuidanceNote } from "../monitor/branches/_shared/BranchFormShell";
import PRDReportHeader from "../monitor/branches/production/_shared/PRDReportHeader";

/* ───────────────────────── messages ───────────────────────── */

const M = {
  required:   { ar: "حقل إلزامي",                      en: "Required" },
  number:     { ar: "يجب أن يكون رقماً",                en: "Must be a number" },
  int:        { ar: "يجب أن يكون رقماً صحيحاً",          en: "Must be a whole number" },
  min:        { ar: "أقل قيمة مسموحة {n}",              en: "Minimum allowed is {n}" },
  max:        { ar: "أعلى قيمة مسموحة {n}",              en: "Maximum allowed is {n}" },
  minLength:  { ar: "اكتب {n} أحرف على الأقل",          en: "Write at least {n} characters" },
  maxLength:  { ar: "الحد الأقصى {n} حرف",               en: "Maximum {n} characters" },
  date:       { ar: "تاريخ غير صالح",                    en: "Invalid date" },
  time:       { ar: "وقت غير صالح",                      en: "Invalid time" },
  notFuture:  { ar: "لا يمكن أن يكون تاريخاً مستقبلياً", en: "Cannot be a future date" },
  notPast:    { ar: "لا يمكن أن يكون تاريخاً ماضياً",    en: "Cannot be a past date" },
  maxPastDays:{ ar: "لا يُقبل تاريخ أقدم من {n} يوماً",   en: "Cannot be older than {n} days" },
  after:      { ar: "يجب أن يكون بعد «{f}»",             en: "Must be after “{f}”" },
  afterOrEq:  { ar: "لا يمكن أن يكون قبل «{f}»",          en: "Cannot be before “{f}”" },
  before:     { ar: "يجب أن يكون قبل «{f}»",             en: "Must be before “{f}”" },
  oneOf:      { ar: "اختر قيمة من القائمة",               en: "Pick a value from the list" },
  email:      { ar: "بريد إلكتروني غير صالح",             en: "Invalid e-mail address" },
  phone:      { ar: "رقم هاتف غير صالح (أرقام فقط، 5–15)", en: "Invalid phone (digits only, 5–15)" },
  pattern:    { ar: "الصيغة غير صحيحة",                   en: "Invalid format" },
  files:      { ar: "أرفق ملفاً واحداً على الأقل",          en: "Attach at least one file" },
};

const fmt = (msg, lang, vars = {}) =>
  String(msg[lang] ?? msg.en).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));

export const pickText = (v, lang) =>
  v == null ? "" : typeof v === "string" ? v : (v[lang] ?? v.en ?? v.ar ?? "");

const isEmpty = (v) =>
  v == null || v === false ||
  (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/* ───────────────────────── rules engine ───────────────────────── */

/**
 * Checks one value against one rule. Returns a message or null.
 * `includeRequired` is false while typing (an empty field is not an error until
 * the user presses Save) and true on Save.
 */
function checkRule(rule, draft, lang, includeRequired, ruleByKey) {
  if (rule.when && !rule.when(draft)) return null;     // rule applies only in some cases
  const v = draft[rule.key];
  const required = typeof rule.requiredIf === "function" ? rule.requiredIf(draft) : rule.required;

  if (isEmpty(v)) {
    if (!required || !includeRequired) return null;
    return pickText(rule.requiredMsg, lang) || fmt(rule.type === "files" ? M.files : M.required, lang);
  }

  const s = String(v).trim();
  const labelOf = (k) => pickText(ruleByKey[k]?.label, lang) || k;

  switch (rule.type) {
    case "number":
    case "int": {
      const n = Number(s);
      if (!Number.isFinite(n)) return fmt(M.number, lang);
      if (rule.type === "int" && !Number.isInteger(n)) return fmt(M.int, lang);
      if (rule.min != null && n < rule.min) return fmt(M.min, lang, { n: rule.min });
      if (rule.max != null && n > rule.max) return fmt(M.max, lang, { n: rule.max });
      break;
    }
    case "date": {
      if (!DATE_RE.test(s) || Number.isNaN(new Date(s).getTime())) return fmt(M.date, lang);
      const today = todayStr();
      if (rule.notFuture && s > today) return fmt(M.notFuture, lang);
      // "Not in the past" and "at most N days back" stop late NEW reports.
      // A saved record (it has an id) keeps its real date, so correcting an
      // old inspection is never blocked by the calendar moving on.
      const isNew = !draft.id;
      if (isNew && rule.notPast && s < today) return fmt(M.notPast, lang);
      if (isNew && rule.maxPastDays != null && daysBetween(s, today) > rule.maxPastDays)
        return fmt(M.maxPastDays, lang, { n: rule.maxPastDays });
      break;
    }
    case "time":
      if (!TIME_RE.test(s)) return fmt(M.time, lang);
      break;
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return fmt(M.email, lang);
      break;
    case "phone":
      if (!/^\+?\d{5,15}$/.test(s.replace(/[\s()-]/g, ""))) return fmt(M.phone, lang);
      break;
    default:
      break;
  }

  if (rule.minLength != null && s.length < rule.minLength) return fmt(M.minLength, lang, { n: rule.minLength });
  if (rule.maxLength != null && s.length > rule.maxLength) return fmt(M.maxLength, lang, { n: rule.maxLength });
  if (rule.pattern && !rule.pattern.test(s)) return pickText(rule.patternMsg, lang) || fmt(M.pattern, lang);
  if (rule.oneOf && !rule.oneOf.includes(v)) return fmt(M.oneOf, lang);

  // Ordering against another field (dates or times, compared as strings — both ISO).
  const other = (k) => (k && !isEmpty(draft[k]) ? String(draft[k]) : null);
  if (rule.after && other(rule.after) && !(s > other(rule.after)))
    return fmt(M.after, lang, { f: labelOf(rule.after) });
  if (rule.afterOrEqual && other(rule.afterOrEqual) && s < other(rule.afterOrEqual))
    return fmt(M.afterOrEq, lang, { f: labelOf(rule.afterOrEqual) });
  if (rule.before && other(rule.before) && !(s < other(rule.before)))
    return fmt(M.before, lang, { f: labelOf(rule.before) });

  if (typeof rule.custom === "function") {
    const msg = rule.custom(v, draft);
    if (msg) return pickText(msg, lang);
  }
  return null;
}

/** Validates a whole draft. Returns an ordered list [{ key, label, message }]. */
export function validateHSE(rules, draft, lang, includeRequired = true) {
  const byKey = Object.fromEntries(rules.map((r) => [r.key, r]));
  const out = [];
  for (const r of rules) {
    const msg = checkRule(r, draft || {}, lang, includeRequired, byKey);
    if (msg) out.push({ key: r.key, label: pickText(r.label, lang) || r.key, message: msg });
  }
  return out;
}

/**
 * Form state for the rules: live range/format errors while typing, required
 * errors only after the first Save. `attempt()` returns true when the draft
 * may be saved; otherwise it lights up every field and scrolls to the summary.
 */
export function useHSEValidation(rules, draft, lang) {
  const [attempted, setAttempted] = useState(false);
  const summaryRef = useRef(null);

  const list = useMemo(
    () => validateHSE(rules, draft, lang, attempted),
    [rules, draft, lang, attempted]
  );
  const errors = useMemo(() => Object.fromEntries(list.map((e) => [e.key, e.message])), [list]);

  const attempt = useCallback(() => {
    const full = validateHSE(rules, draft, lang, true);
    setAttempted(true);
    if (full.length) {
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
      return false;
    }
    return true;
  }, [rules, draft, lang]);

  const reset = useCallback(() => setAttempted(false), []);
  const ruleFor = useCallback((key) => rules.find((r) => r.key === key), [rules]);

  return { errors, list: attempted ? list : [], attempt, reset, ruleFor, summaryRef };
}

/** HTML attributes that stop a value breaking its rule at the keyboard. */
export function ruleAttrs(rule) {
  if (!rule) return {};
  const a = {};
  if (rule.type === "number" || rule.type === "int") {
    if (rule.min != null) a.min = rule.min;
    if (rule.max != null) a.max = rule.max;
    a.step = rule.type === "int" ? 1 : (rule.step ?? "any");
    a.inputMode = rule.type === "int" ? "numeric" : "decimal";
  }
  if (rule.type === "date") {
    const today = todayStr();
    if (rule.notFuture) a.max = today;
    if (rule.notPast) a.min = today;
  }
  if (rule.type === "time" && rule.seconds) a.step = 1;   // HH:MM:SS (drill timings)
  if (rule.maxLength != null) a.maxLength = rule.maxLength;
  return a;
}

/* ───────────────────────── layout ───────────────────────── */

const T = {
  docNo:     { ar: "رقم النموذج",     en: "Form No." },
  revision:  { ar: "رقم الإصدار",     en: "Revision" },
  owner:     { ar: "الجهة المسؤولة",  en: "Controlled by" },
  ownerVal:  { ar: "قسم الصحة والسلامة (HSE)", en: "HSE Department" },
  mode:      { ar: "الحالة",          en: "Mode" },
  modeNew:   { ar: "تقرير جديد",       en: "New report" },
  modeEdit:  { ar: "تعديل تقرير محفوظ", en: "Editing a saved report" },
  howTo:     { ar: "طريقة تعبئة التقرير", en: "How to fill this report" },
  fixTitle:  { ar: "لا يمكن الحفظ — صحّح الحقول التالية:", en: "Cannot save — fix the following fields:" },
  save:      { ar: "حفظ التقرير",     en: "Save report" },
  update:    { ar: "حفظ التعديلات",   en: "Save changes" },
  saving:    { ar: "جارٍ الحفظ…",      en: "Saving…" },
  cancel:    { ar: "إلغاء",            en: "Cancel" },
  reqNote:   { ar: "الحقول المعلَّمة بـ * إلزامية، والقيم خارج الحدود المسموحة لا تُحفظ.",
               en: "Fields marked * are required; values outside the allowed limits will not save." },
};

/**
 * The page frame of an HSE input form.
 *
 *  title / subtitle   {ar,en}
 *  docNo              "F-01" — shown in the document-control strip
 *  headerFields       extra header cells (PRDReportHeader field shape)
 *  steps              how-to-fill instructions [{ar,en}] — numbered list
 *  guidance           [{kind:"tip"|"warn", ar, en}] — rules and warnings
 *  validation         the object returned by useHSEValidation
 */
export function HSEReportForm({
  lang, dir, title, subtitle, docNo, revision = "01", accent = "#0f766e",
  headerFields = [], steps = [], guidance = [], validation,
  editing = false, saving = false, onSave, onCancel, extraActions, children,
}) {
  const isAr = lang === "ar";
  const p = (x) => pickText(x, lang);
  const list = validation?.list || [];

  return (
    <FormShell dir={dir}>
      <style>{KIT_STYLES}</style>
      <PRDReportHeader
        lang={lang}
        title={pickText(title, "en")}
        titleAr={pickText(title, "ar")}
        subtitle={pickText(subtitle, "en")}
        subtitleAr={pickText(subtitle, "ar")}
        accent={accent}
        fields={[
          { label: p(T.docNo), value: docNo || "—" },
          { label: p(T.revision), value: revision },
          { label: p(T.owner), value: p(T.ownerVal) },
          { label: p(T.mode), value: p(editing ? T.modeEdit : T.modeNew) },
          ...headerFields,
        ]}
      />

      {steps.length > 0 && (
        <div className="ph-guide hk-steps" style={{ "--guide-accent": accent }}>
          <div className="ph-guide-head">📝 {p(T.howTo)}</div>
          <ol className="hk-steps-list">
            {steps.map((s, i) => <li key={i}>{p(s)}</li>)}
          </ol>
        </div>
      )}

      <GuidanceNote isAr={isAr} accent="#b45309" items={guidance} />

      <div ref={validation?.summaryRef}>
        {list.length > 0 && (
          <div className="hk-errors" role="alert">
            <div className="hk-errors-head">⛔ {p(T.fixTitle)}</div>
            <ul>
              {list.map((e, i) => (
                <li key={e.key + i}>
                  <button type="button" onClick={() => focusField(e.key)}>
                    <b>{e.label}</b> — {e.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {children}

      <div className="ph-savebar">
        <div className="hk-req-note">{p(T.reqNote)}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {extraActions}
          {onCancel && (
            <button type="button" className="ph-btn ph-btn-ghost" onClick={onCancel} disabled={saving}>
              {p(T.cancel)}
            </button>
          )}
          <button type="button" className="ph-btn ph-btn-primary ph-btn-lg" onClick={onSave} disabled={saving}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? p(T.saving) : p(editing ? T.update : T.save)}
          </button>
        </div>
      </div>
    </FormShell>
  );
}

function focusField(key) {
  const el = document.querySelector(`[data-hk-field="${CSS.escape(key)}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const input = el.querySelector("input, select, textarea");
  if (input) setTimeout(() => input.focus({ preventScroll: true }), 250);
}

/** A titled group of fields (same look as the FieldPanel on the other cards). */
export function HSEPanel({ title, note, children, cols }) {
  return (
    <div className="ph-fieldbar">
      {title && <div className="ph-fieldbar-title">{title}</div>}
      {note && <div className="hk-panel-note">{note}</div>}
      <div className="ph-fieldbar-grid" style={cols ? { gridTemplateColumns: cols } : undefined}>
        {children}
      </div>
    </div>
  );
}

/**
 * One labelled field. Pass `rule` (from validation.ruleFor(key)) to get the
 * required star and the keyboard limits; pass `error` to show the message.
 *
 * type: text | number | int | date | time | email | phone | textarea | select | checkbox
 */
export function HSEField({
  k, label, value, onChange, type = "text", rule, error, hint,
  options, placeholder, full, rows = 3, disabled, readOnly, lang = "en", children,
}) {
  const required = !!(rule && (rule.required || rule.requiredIf));
  const hintText = hint || pickText(rule?.hint, lang);
  const attrs = ruleAttrs(rule);
  const cls = `ph-input${error ? " hk-bad" : ""}`;
  const inputType =
    type === "int" || type === "number" ? "number"
    : type === "phone" ? "tel"
    : ["textarea", "select", "checkbox"].includes(type) ? undefined
    : type;

  let control;
  if (children) {
    control = children;
  } else if (type === "textarea") {
    control = (
      <textarea className={cls} rows={rows} value={value ?? ""} placeholder={placeholder}
        disabled={disabled} readOnly={readOnly} maxLength={attrs.maxLength}
        onChange={(e) => onChange?.(e.target.value)} style={{ resize: "vertical", minHeight: 80 }} />
    );
  } else if (type === "select") {
    control = (
      <select className={`ph-input hk-select${error ? " hk-bad" : ""}`} value={value ?? ""}
        disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
        {/* An empty value must look empty — otherwise the browser shows the
            first option as if it were chosen while nothing is stored. */}
        {!(options || []).some((o) => (typeof o === "string" ? o : (o.v ?? o.value ?? "")) === "") && (
          <option value="">{lang === "ar" ? "— اختر —" : "— Select —"}</option>
        )}
        {(options || []).map((o) => {
          const v = typeof o === "string" ? o : (o.v ?? o.value ?? "");
          const l = typeof o === "string" ? o : (o[lang] ?? o.label ?? o.en ?? o.ar ?? v);
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    );
  } else if (type === "checkbox") {
    control = (
      <label className={`hk-check${value ? " on" : ""}`}>
        <input type="checkbox" checked={!!value} disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)} />
        <span>{label}</span>
      </label>
    );
  } else {
    control = (
      <input className={cls} type={inputType} value={value ?? ""} placeholder={placeholder}
        disabled={disabled} readOnly={readOnly} {...attrs}
        onKeyDown={type === "int" ? blockNonInt : type === "number" ? blockNonNumber : undefined}
        onChange={(e) => onChange?.(e.target.value)} />
    );
  }

  return (
    <div className={`ph-field${full ? " hk-full" : ""}`} data-hk-field={k}>
      {type !== "checkbox" && (
        <span className="ph-field-label">
          {label}{required && <span className="ph-req"> *</span>}
        </span>
      )}
      {control}
      {error ? <span className="hk-err">{error}</span>
        : hintText ? <span className="hk-hint">{hintText}</span> : null}
    </div>
  );
}

/* number inputs accept "e", "+" and "-" by default — a negative count or 1e9
   hours is exactly the kind of value the rules are meant to keep out. */
function blockNonNumber(e) {
  if (["e", "E", "+"].includes(e.key)) e.preventDefault();
  if (e.key === "-" && e.currentTarget.min !== "" && Number(e.currentTarget.min) >= 0) e.preventDefault();
}
function blockNonInt(e) {
  if (["e", "E", "+", ".", ","].includes(e.key)) e.preventDefault();
  if (e.key === "-" && e.currentTarget.min !== "" && Number(e.currentTarget.min) >= 0) e.preventDefault();
}

const KIT_STYLES = `
  .ph-wrap { background: transparent; padding: 0; }
  .hk-full { grid-column: 1 / -1; }
  .ph-field-label { font-size: 11px; }
  .ph-input.hk-bad, .hk-select.hk-bad { border-color: #dc2626 !important; background: #fef2f2 !important; }
  .hk-err  { font-size: 12px; font-weight: 800; color: #b91c1c; line-height: 1.4; }
  .hk-hint { font-size: 12px; font-weight: 600; color: #64748b; line-height: 1.4; }
  .hk-select { cursor: pointer; }
  textarea.ph-input { line-height: 1.6; }
  .hk-panel-note { margin: -4px 0 10px; font-size: 12.5px; font-weight: 600; color: #64748b; }
  .hk-check {
    display: flex; align-items: center; gap: 10px; min-height: 46px;
    padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 7px;
    background: #fff; font-size: 14px; font-weight: 700; color: #334155; cursor: pointer;
  }
  .hk-check.on { background: #f0fdf4; border-color: #86efac; color: #14532d; }
  .hk-check input { width: 18px; height: 18px; accent-color: #0f766e; }
  .hk-steps-list { margin: 0; padding-inline-start: 22px; display: grid; gap: 6px;
    font-size: 14px; line-height: 1.65; font-weight: 600; color: #334155; }
  .hk-errors {
    margin: 0 0 14px; padding: 14px 18px; border-radius: 12px;
    background: #fef2f2; border: 1px solid #fecaca; border-inline-start: 4px solid #dc2626;
  }
  .hk-errors-head { font-size: 14px; font-weight: 900; color: #991b1b; margin-bottom: 8px; }
  .hk-errors ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
  .hk-errors button {
    all: unset; cursor: pointer; font-size: 13.5px; font-weight: 600; color: #7f1d1d;
  }
  .hk-errors button:hover { text-decoration: underline; }
  .ph-select.hk-warn { background: #fef9c3; color: #854d0e; border-color: #fde047; }
  .ph-select.hk-na { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
  .hk-req-note { font-size: 12.5px; font-weight: 700; color: #64748b; max-width: 560px; }
`;
