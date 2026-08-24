// src/pages/monitor/branches/pos 10/POS10ReceivingLogInput.jsx
// Incoming-delivery inspection for POS 10, drawn in the same form style as the
// POS 6 receiving log: shared shell, guidance panel, one column definition list
// that the header row and the body row are both generated from.
//
// The old hand-rolled table set every input to `white-space: nowrap` with an
// ellipsis and gave the headers fixed narrow widths, so a supplier name, a
// product name or the packaging header was cut off with no way to read it. The
// shared table wraps its headers and lets each cell show its own value.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "../production/_shared/i18n";
import useTakenDates from "../_shared/useTakenDates";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { RECEIVING_GUIDANCE } from "../_shared/receivingGuidance";
import { ItemCodeInput, ItemNameInput } from "../_shared/CodedProductField";

const TYPE = "pos10_receiving_log_butchery";
const BRANCH = "POS 10";

/* Columns judged C / NC on arrival. `hint` carries the full sheet wording for
   the short header — the paper form spells the packaging check out in a whole
   sentence, which is unreadable as a column heading. */
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean",    w: 105 },
  { key: "handlerHygiene", label: "Handler hygiene",  w: 115, hint: "Food handler hygiene" },
  { key: "appearanceOK",   label: "Appearance",       w: 105, hint: "Normal colour, free from discoloration" },
  { key: "firmnessOK",     label: "Firmness",         w: 100, hint: "Firm rather than soft" },
  { key: "smellOK",        label: "Smell",            w: 95,  hint: "Normal smell — no rancid or strange smell" },
  { key: "packagingGood",  label: "Packaging intact", w: 125,
    hint: "Packaging of food is good and undamaged, clean and no signs of pest infestation" },
];

/* Free-text / numeric columns, in the order they appear on the sheet.
   itemCode ⟷ foodItem lead the sheet: the catalog code that ties this line to
   the same product everywhere else (QCS shipment, traceability, final product). */
const TEXT_COLS = [
  { key: "itemCode",    label: "Item code",       type: "code",    w: 115 },
  { key: "foodItem",    label: "Food item",       type: "product", w: 195 },
  { key: "supplier",    label: "Name of the supplier", type: "text", w: 175 },
  { key: "quantity",    label: "Quantity KG / PCS",    type: "text", w: 125, placeholder: "e.g. 10 KG / 5 PCS" },
  { key: "vehicleTemp", label: "Vehicle °C",      type: "number",  w: 95, step: "0.1", placeholder: "°C" },
  { key: "foodTemp",    label: "Food °C",         type: "number",  w: 95, step: "0.1", placeholder: "°C" },
];

const TAIL_COLS = [
  { key: "countryOfOrigin", label: "Country of origin", type: "text", w: 135 },
  { key: "productionDate",  label: "Production date",   type: "date", w: 145 },
  { key: "expiryDate",      label: "Expiry date",       type: "date", w: 145 },
  { key: "remarks",         label: "Remarks (if any)",  type: "text", w: 195 },
];

/* Sum of every column above plus the row number and the delete button, so the
   table scrolls instead of squeezing its columns to nothing. */
const TABLE_MIN_WIDTH =
  44 + 52 + [...TEXT_COLS, ...TICK_COLS, ...TAIL_COLS].reduce((n, c) => n + c.w, 0);

const STARTING_ROWS = 10;

const emptyRow = () => {
  const row = {};
  [...TEXT_COLS, ...TICK_COLS, ...TAIL_COLS].forEach((c) => { row[c.key] = ""; });
  return row;
};

const isFilled = (r) => Object.values(r).some((v) => String(v ?? "").trim() !== "");

/* Today in the branch's own timezone. A receiving log filed just after midnight
   in Dubai must not be dated to the previous day because the browser is on UTC. */
function todayISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

/* Only the handful of strings this screen says itself — everything else comes
   from the shared header and shell. */
const STR = {
  subtitle:      { en: "Incoming deliveries — POS 10", ar: "استلام البضائع — POS 10" },
  form_ref:      { en: "Form ref.",        ar: "رقم النموذج" },
  revision:      { en: "Revision no.",     ar: "رقم المراجعة" },
  branch:        { en: "Branch",           ar: "الفرع" },
  issued_by:     { en: "Issued by",        ar: "صادر عن" },
  controlling:   { en: "Controlling officer", ar: "مسؤول الضبط" },
  report_date:   { en: "Report date",      ar: "تاريخ التقرير" },
  invoice_no:    { en: "Invoice no. *",    ar: "رقم الفاتورة *" },
  invoice_ph:    { en: "Required",         ar: "إلزامي" },
  conform:       { en: "Conform",          ar: "مطابق" },
  nonconform:    { en: "Non-conform",      ar: "غير مطابق" },
  col_no:        { en: "#",                ar: "#" },
  add_row:       { en: "Add row",          ar: "إضافة صف" },
  remove_row:    { en: "Remove this row",  ar: "حذف هذا الصف" },
  received_by:   { en: "Received by",      ar: "استلمها" },
  verified_by:   { en: "Verified by",      ar: "تم التحقق بواسطة" },
  name_sig:      { en: "Name & signature", ar: "الاسم والتوقيع" },
  btn_save:      { en: "Save receiving log", ar: "حفظ سجل الاستلام" },
  btn_saving:    { en: "Saving…",          ar: "جاري الحفظ…" },
  msg_saving:    { en: "Saving…",          ar: "جاري الحفظ…" },
  msg_saved:     { en: "Saved",            ar: "تم الحفظ" },

  date_checking: { en: "Checking whether this date is free…", ar: "جاري التحقق من توفر التاريخ…" },
  date_free:     { en: "This date is free.", ar: "التاريخ متاح لإدخال التقرير." },
  date_taken:    { en: "A report is already filed for this date.", ar: "يوجد تقرير محفوظ بالفعل لهذا التاريخ." },
  date_future:   { en: "This date is in the future — goods cannot be received yet.", ar: "التاريخ مستقبلي — لا يمكن استلام بضاعة بتاريخ لم يأتِ بعد." },
  date_unknown:  { en: "Could not check this date (server unreachable) — save will still be checked by the server.", ar: "تعذر التحقق من التاريخ (لا اتصال بالسيرفر) — السيرفر سيتحقق عند الحفظ." },

  err_no_date:   { en: "Choose the report date.", ar: "يرجى اختيار التاريخ." },
  err_invoice:   { en: "Invoice no. is required.", ar: "رقم الفاتورة إلزامي." },
  err_no_rows:   { en: "Nothing to save — fill at least one line.", ar: "لا يوجد بيانات للحفظ — عبّئ سطراً واحداً على الأقل." },
  err_dates:     { en: "row %n: expiry date must be later than the production date.", ar: "الصف %n: تاريخ الصلاحية يجب أن يكون أكبر من تاريخ الإنتاج." },
  err_sign:      { en: "Received by and Verified by are both required.", ar: "حقلا «استلمها» و«تم التحقق بواسطة» إلزاميان." },
  err_save:      { en: "Save failed — check the server or the network.", ar: "فشل الحفظ. تحقق من السيرفر أو الشبكة." },
  saved:         { en: "Saved successfully.", ar: "تم الحفظ بنجاح!" },
};

export default function POS10ReceivingLogInput() {
  const { lang, dir, isAr } = useLang();
  const t = useCallback((k) => STR[k]?.[lang] ?? STR[k]?.en ?? k, [lang]);

  const [reportDate, setReportDate] = useState(todayISO);
  const [formRef, setFormRef] = useState("FSMS/BR/F01A");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceTouched, setInvoiceTouched] = useState(false);
  const [rows, setRows] = useState(() => Array.from({ length: STARTING_ROWS }, emptyRow));
  const [receivedBy, setReceivedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const msgTimer = useRef(null);
  useEffect(() => () => clearTimeout(msgTimer.current), []);

  // "Is this day already filed?" — answered from the lightweight date index,
  // so changing the date costs nothing and never downloads the archive.
  const { isTaken, markTaken, loading: datesLoading, failed: datesFailed } =
    useTakenDates(TYPE);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const updateRow = (idx, key, val) =>
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });

  // Code and name are one unit — a catalog pick on either side rewrites both.
  const updateProduct = (idx, { code, name }) =>
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], itemCode: code, foodItem: name };
      return next;
    });

  const addRow = () => setRows((p) => [...p, emptyRow()]);
  const removeRow = (idx) =>
    setRows((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : [emptyRow()]));

  /* ── report date state ──────────────────────────────────────────────
     "future" is checked before "taken": a date the branch cannot possibly have
     received goods on is wrong whether or not a record already exists for it. */
  const dateStatus = (() => {
    if (!reportDate) return "none";
    if (reportDate > todayISO()) return "future";
    if (datesLoading) return "checking";
    if (datesFailed) return "unknown";
    return isTaken(reportDate) ? "taken" : "free";
  })();

  const dateNote = {
    none: "",
    future: t("date_future"),
    checking: t("date_checking"),
    unknown: t("date_unknown"),
    taken: t("date_taken"),
    free: t("date_free"),
  }[dateStatus];

  const dateNoteColor = {
    none: undefined,
    future: "#b91c1c",
    checking: "#92400e",
    unknown: "#92400e",
    taken: "#b91c1c",
    free: "#065f46",
  }[dateStatus];

  const invoiceMissing = !String(invoiceNo).trim();
  const saveBlocked =
    saving || !reportDate || dateStatus === "taken" || dateStatus === "future" ||
    dateStatus === "checking";

  const flash = (text, keep = 3500) => {
    setOpMsg(text);
    clearTimeout(msgTimer.current);
    if (keep) msgTimer.current = setTimeout(() => setOpMsg(""), keep);
  };

  async function handleSave() {
    setOpMsg("");

    if (!reportDate) return flash("⚠️ " + t("err_no_date"));
    if (dateStatus === "future") return flash("⚠️ " + t("date_future"));
    if (dateStatus === "taken") return flash("⚠️ " + t("date_taken"));

    if (invoiceMissing) {
      setInvoiceTouched(true);
      return flash("⚠️ " + t("err_invoice"));
    }

    const entries = rows.filter(isFilled);
    if (entries.length === 0) return flash("⚠️ " + t("err_no_rows"));

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.productionDate && e.expiryDate && e.expiryDate <= e.productionDate) {
        return flash("⚠️ " + t("err_dates").replace("%n", String(i + 1)));
      }
    }

    if (!receivedBy.trim() || !verifiedBy.trim()) return flash("⚠️ " + t("err_sign"));

    const payload = {
      branch: BRANCH,
      formRef,
      reportDate,
      month: monthText,
      invoiceNo,
      entries,
      verifiedBy,
      receivedBy,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setOpMsg("⏳");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos10", type: TYPE, payload }),
      });

      const data = await res.json().catch(() => null);

      // The server holds the same one-per-day rule on a unique index, so it is
      // the last word even if this screen's index was stale.
      if (res.status === 409) {
        markTaken(reportDate);
        return flash("⚠️ " + (data?.message || t("date_taken")), 6000);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      markTaken(reportDate);
      flash("✅ " + t("saved"));
    } catch (e) {
      console.error(e);
      flash("❌ " + t("err_save"), 6000);
    } finally {
      setSaving(false);
    }
  }

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Receiving Log (Butchery)"
        titleAr="سجل استلام البضائع"
        subtitle={t("subtitle")}
        accent="#f97316"
        fields={[
          { label: t("form_ref"),    value: formRef, onChange: setFormRef },
          { label: t("revision"),    value: "0" },
          { label: t("branch"),      value: BRANCH },
          { label: t("issued_by"),   value: "QA" },
          { label: t("controlling"), value: "Quality Controller" },
          {
            label: t("report_date"),
            type: "date",
            value: reportDate,
            onChange: setReportDate,
            invalid: dateStatus === "taken" || dateStatus === "future",
            note: dateNote,
            noteColor: dateNoteColor,
          },
          {
            label: t("invoice_no"),
            value: invoiceNo,
            onChange: (v) => { setInvoiceNo(v); if (v.trim()) setInvoiceTouched(false); },
            placeholder: t("invoice_ph"),
            invalid: invoiceTouched && invoiceMissing,
            note: invoiceTouched && invoiceMissing ? t("err_invoice") : "",
            noteColor: "#b91c1c",
          },
        ]}
      />

      <GuidanceNote isAr={isAr} accent="#f97316" items={RECEIVING_GUIDANCE} />

      <div className="ph-toolbar">
        <div className="ph-legend">
          <span><b className="ph-chip-c">C</b> {t("conform")}</span>
          <span><b className="ph-chip-nc">NC</b> {t("nonconform")}</span>
        </div>
        <button onClick={addRow} className="ph-btn ph-btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          {t("add_row")}
        </button>
      </div>

      <div className="ph-table-wrap ph-scroll-x">
        <table className="ph-table" style={{ minWidth: TABLE_MIN_WIDTH }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("col_no")}</th>
              {TEXT_COLS.map((c) => (
                <th key={c.key} style={{ width: c.w, textAlign: alignStart }}>{c.label}</th>
              ))}
              {TICK_COLS.map((c) => (
                <th key={c.key} className="ph-col-compact" style={{ width: c.w }} title={c.hint || c.label}>
                  {c.label}
                </th>
              ))}
              {TAIL_COLS.map((c) => (
                <th key={c.key} style={{ width: c.w, textAlign: alignStart }}>{c.label}</th>
              ))}
              <th style={{ width: 52 }} className="no-print" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="ph-num">{i + 1}</td>

                {TEXT_COLS.map((c) => (
                  <td key={c.key}>
                    {c.type === "code" ? (
                      <ItemCodeInput
                        code={row.itemCode || ""}
                        name={row.foodItem || ""}
                        onChange={(pair) => updateProduct(i, pair)}
                        className="ph-input"
                      />
                    ) : c.type === "product" ? (
                      <ItemNameInput
                        code={row.itemCode || ""}
                        name={row.foodItem || ""}
                        onChange={(pair) => updateProduct(i, pair)}
                        className="ph-input"
                        placeholder="Search code or product…"
                      />
                    ) : (
                      <input
                        type={c.type}
                        step={c.step}
                        value={row[c.key]}
                        placeholder={c.placeholder}
                        onChange={(e) => updateRow(i, c.key, e.target.value)}
                        className="ph-input"/>
                    )}
                  </td>
                ))}

                {TICK_COLS.map((c) => {
                  const v = row[c.key];
                  return (
                    <td key={c.key} className="ph-cell-select">
                      <select
                        value={v}
                        onChange={(e) => updateRow(i, c.key, e.target.value)}
                        title={c.hint || c.label}
                        className={`ph-select ph-select-${v === "C" ? "ok" : v === "NC" ? "bad" : "empty"}`}>
                        <option value="">—</option>
                        <option value="C">C</option>
                        <option value="NC">NC</option>
                      </select>
                    </td>
                  );
                })}

                {TAIL_COLS.map((c) => (
                  <td key={c.key}>
                    <input
                      type={c.type}
                      value={row[c.key]}
                      onChange={(e) => updateRow(i, c.key, e.target.value)}
                      className="ph-input"/>
                  </td>
                ))}

                <td className="no-print">
                  <button
                    onClick={() => removeRow(i)}
                    className="ph-btn-icon ph-btn-danger"
                    title={t("remove_row")}
                    disabled={rows.length === 1}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The acceptance limits the sheet is judged against — kept under the
          table where the checker can read them while filling it in. */}
      <div className="ph-guide" style={{ "--guide-accent": "#0f766e", marginTop: 14 }}>
        <div className="ph-guide-head">
          {isAr ? "حدود القبول" : "Acceptance limits"}
        </div>
        <ul className="ph-guide-list">
          <li className="ph-guide-item tip">
            <span className="ph-guide-mark">i</span>
            <span>Chilled food: target ≤ 5 °C (critical limit 5 °C; short deviations up to 15 minutes during transfer).</span>
          </li>
          <li className="ph-guide-item tip">
            <span className="ph-guide-mark">i</span>
            <span>Frozen food: target ≤ −18 °C (critical limits: RTE frozen ≤ −18 °C, raw frozen ≤ −10 °C).</span>
          </li>
          <li className="ph-guide-item tip">
            <span className="ph-guide-mark">i</span>
            <span>Hot food: target ≥ 60 °C (critical limit 60 °C). Dry / low-risk food: cool dry condition or ≤ 25 °C, or as per product requirement.</span>
          </li>
          <li className="ph-guide-item tip">
            <span className="ph-guide-mark">i</span>
            <span>Organoleptic checks — appearance: normal colour, free from discoloration. Firmness: firm rather than soft. Smell: normal, no rancid or strange smell.</span>
          </li>
        </ul>
      </div>

      <SignatureFooter
        t={(k) => (k === "sig_checked_by" ? t("received_by") : k === "sig_verified_by" ? t("verified_by") : t("name_sig"))}
        checkedBy={receivedBy}
        setCheckedBy={setReceivedBy}
        verifiedBy={verifiedBy}
        setVerifiedBy={setVerifiedBy}
      />

      <SaveBar
        t={(k) => (k === "msg_saving" ? t("msg_saving") : k === "msg_saved" ? t("msg_saved") : k === "btn_saving" ? t("btn_saving") : t("btn_save"))}
        opMsg={opMsg}
        saving={saving}
        disabled={saveBlocked}
        onSave={handleSave}
      />
    </FormShell>
  );
}
