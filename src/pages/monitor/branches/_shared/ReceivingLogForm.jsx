// src/pages/monitor/branches/_shared/ReceivingLogForm.jsx
// The ONE receiving-log input every branch uses (POS 6/10/11/15/19, FTR 1/2),
// drawn after the POS 6 sheet: document header, guidance, then the deliveries.
//
// One record per branch per day — the server keeps a unique index on
// (company, type, reportDate) — and a day can bring several suppliers. So the
// sheet holds DELIVERY blocks: each block asks supplier / invoice / receiver /
// vehicle °C once, above its own table of lines. Opening a date that already has
// a sheet loads it, so the second delivery of the day is added to the same
// record instead of being refused.
//
// Saved payload:
//   deliveries: [{ supplier, invoiceNo, receivedBy, vehicleTemp, images?, entries: [...] }]
//   entries:    every line of every delivery, flattened, with its delivery's
//               supplier / invoiceNo / receivedBy / vehicleTemp (and `quantity`)
//               stamped on — the shape the branch viewers and the Excel
//               backups already read, so nothing downstream had to change.
import React, { useCallback, useEffect, useRef, useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "../pos6/pos6I18n";
import FormShell, { FieldPanel, GuidanceNote, SaveBar, SignatureFooter } from "./BranchFormShell";
import { RECEIVING_GUIDANCE } from "./receivingGuidance";
import { ItemCodeInput, ItemNameInput } from "./CodedProductField";
import { getReportRowByDate, payloadOf, reportId } from "./reportApi";
import { queuedMessage, saveReport } from "../../../../utils/reportOutbox";
import { uploadImage } from "../../../../utils/imageUpload";

/* Columns judged C / NC on arrival. */
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean",    w: 110 },
  { key: "handlerHygiene", label: "Handler hygiene",  w: 120 },
  { key: "appearanceOK",   label: "Appearance",       w: 105 },
  { key: "firmnessOK",     label: "Firmness",         w: 100 },
  { key: "smellOK",        label: "Smell",            w: 95 },
  { key: "packagingGood",  label: "Packaging intact", w: 125 },
];

const TEXT_COLS = [
  { key: "itemCode",  label: "Item code",       type: "code",    w: 120 },
  { key: "foodItem",  label: "Food item",       type: "product", w: 180 },
  { key: "netWeight", label: "Net weight (kg)", type: "number",  w: 110 },
  { key: "foodTemp",  label: "Food °C",         type: "number",  w: 95 },
];

const TAIL_COLS = [
  { key: "countryOfOrigin", label: "Country of origin", type: "text", w: 130 },
  { key: "productionDate",  label: "Production date",   type: "date", w: 140 },
  { key: "expiryDate",      label: "Expiry date",       type: "date", w: 140 },
  { key: "remarks",         label: "Remarks",           type: "text", w: 180 },
];

const LINE_KEYS = [...TEXT_COLS, ...TICK_COLS, ...TAIL_COLS].map((c) => c.key);
/* Fields that belong to the delivery, not the line. */
const DELIVERY_KEYS = ["supplier", "invoiceNo", "receivedBy", "vehicleTemp"];
const STARTING_ROWS = 5;
const PHOTO_SLOTS = 4;

/* Older sheets stored √ / ✗ (POS 19); the form speaks C / NC. */
const toCNC = (v) => (v === "√" || v === "✓" ? "C" : v === "✗" || v === "×" ? "NC" : v || "");

const emptyRow = () => Object.fromEntries(LINE_KEYS.map((k) => [k, ""]));
const emptyDelivery = (rows = STARTING_ROWS) => ({
  supplier: "", invoiceNo: "", receivedBy: "", vehicleTemp: "", extra: {},
  images: Array(PHOTO_SLOTS).fill(""),
  rows: Array.from({ length: rows }, emptyRow),
});
const isFilled = (r) => LINE_KEYS.some((k) => String(r?.[k] ?? "").trim() !== "");

function todayDubai() {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/* A stored record → delivery blocks. New records carry `deliveries`; older
   ones only have flat `entries` with the supplier on every line, so lines are
   grouped back by supplier + invoice. */
function deliveriesFromPayload(p = {}, extraKeys = []) {
  const extraOf = (src, top = {}) => Object.fromEntries(extraKeys.map((k) => [k, String(src?.[k] ?? top?.[k] ?? "")]));
  const lineOf = (e) => {
    const r = emptyRow();
    LINE_KEYS.forEach((k) => { if (e?.[k] != null) r[k] = String(e[k]); });
    if (!r.netWeight && e?.quantity) r.netWeight = String(e.quantity).replace(/[^\d.]/g, "");
    TICK_COLS.forEach((c) => { r[c.key] = toCNC(r[c.key]); });
    return r;
  };
  const padImages = (imgs) => {
    const a = Array.isArray(imgs) ? imgs.slice(0, PHOTO_SLOTS) : [];
    while (a.length < PHOTO_SLOTS) a.push("");
    return a.map((x) => (typeof x === "string" ? x : x?.url || ""));
  };

  if (Array.isArray(p.deliveries) && p.deliveries.length) {
    return p.deliveries.map((d) => ({
      supplier: d.supplier || "", invoiceNo: d.invoiceNo || "",
      receivedBy: d.receivedBy || "", vehicleTemp: d.vehicleTemp ?? "",
      extra: extraOf(d),
      images: padImages(d.images),
      rows: (d.entries || []).map(lineOf),
    }));
  }

  const groups = new Map();
  (Array.isArray(p.entries) ? p.entries : []).filter((e) => e && typeof e === "object").forEach((e) => {
    const supplier = e.supplier || p.supplier || "";
    const invoiceNo = e.invoiceNo || p.invoiceNo || "";
    const key = `${supplier}|${invoiceNo}`;
    if (!groups.has(key)) {
      groups.set(key, {
        supplier, invoiceNo,
        receivedBy: e.receivedBy || p.receivedBy || "",
        vehicleTemp: e.vehicleTemp ?? p.vehicleTemp ?? "",
        extra: extraOf(e, p),
        images: padImages([]),
        rows: [],
      });
    }
    const g = groups.get(key);
    if (Array.isArray(e.images) && e.images.some(Boolean) && !g.images.some(Boolean)) g.images = padImages(e.images);
    g.rows.push(lineOf(e));
  });
  return groups.size ? [...groups.values()] : [emptyDelivery()];
}

const STYLES = `
  .rl-delivery { background:#fff; border:1px solid #fed7aa; border-radius:14px; padding:12px 14px 14px; margin:14px 0; box-shadow:0 4px 14px rgba(249,115,22,.06); }
  .rl-delivery-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .rl-delivery-no { background:#fff7ed; color:#c2410c; border:1px solid #fdba74; border-radius:999px; padding:3px 12px; font-weight:900; }
  .rl-delivery-sum { color:#64748b; font-weight:700; }
  .rl-delivery-head .ph-btn { margin-inline-start:auto; }
  .rl-delivery .ph-fieldbar { margin:6px 0 10px; }
  .rl-add-delivery { width:100%; padding:12px; border:2px dashed #fdba74; border-radius:14px; background:#fffbf5; color:#c2410c; font-weight:900; cursor:pointer; }
  .rl-add-delivery:hover { background:#fff7ed; }
  .rl-banner { margin:10px 0; padding:10px 14px; border-radius:12px; font-weight:700; }
  .rl-banner.info { background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; }
  .rl-banner.warn { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
  .rl-photos { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:center; }
  .rl-photo { width:96px; height:72px; border:1px dashed #cbd5e1; border-radius:10px; display:grid; place-items:center; position:relative; overflow:hidden; background:#f8fafc; cursor:pointer; color:#64748b; font-weight:700; }
  .rl-photo img { width:100%; height:100%; object-fit:cover; }
  .rl-photo button { position:absolute; top:3px; inset-inline-end:3px; border:0; border-radius:6px; background:rgba(15,23,42,.65); color:#fff; cursor:pointer; padding:0 6px; }
`;

const L = (isAr, en, ar) => (isAr ? ar : en);

/**
 * @param {string}  branch      "POS 10"
 * @param {string}  type        "pos10_receiving_log_butchery"
 * @param {string}  reporter    "pos10"
 * @param {string}  documentNo  default form reference
 * @param {boolean} photos      4 photo slots per delivery (FTR trucks)
 * @param {Array}   extraFields more per-delivery fields, e.g. FTR's
 *                              [{ key: "dmApprovalNo", label, labelAr }]
 */
export default function ReceivingLogForm({ branch, type, reporter, documentNo = "FSMS/BR/F01A", photos = false, extraFields = [] }) {
  const { t, dir, isAr } = useLang();

  const [date, setDate] = useState(todayDubai);
  const [formRef, setFormRef] = useState(documentNo);
  const [deliveries, setDeliveries] = useState(() => [emptyDelivery()]);
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const [recordId, setRecordId] = useState(null);   // the day's record, once it exists
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const [uploading, setUploading] = useState("");
  const msgTimer = useRef(null);

  const flash = (text, keep = 4000) => {
    setOpMsg(text);
    clearTimeout(msgTimer.current);
    if (keep) msgTimer.current = setTimeout(() => setOpMsg(""), keep);
  };

  /* Load the day's sheet (if any) whenever the date changes. */
  const loadDay = useCallback(async (d) => {
    setLoadingDay(true);
    setLoadError("");
    try {
      const row = await getReportRowByDate(type, d);
      if (row) {
        const p = payloadOf(row) || {};
        setRecordId(reportId(row));
        setDeliveries(deliveriesFromPayload(p, extraFields.map((f) => f.key)));
        if (p.formRef) setFormRef(p.formRef);
        setCheckedBy(p.checkedBy || p.receivedBy || "");
        setVerifiedBy(p.verifiedBy || "");
      } else {
        setRecordId(null);
        setDeliveries([emptyDelivery()]);
        setCheckedBy("");
        setVerifiedBy("");
      }
    } catch (e) {
      // Without knowing whether the day has a sheet, saving could file a
      // second one — keep the form but block saving until a reload works.
      setRecordId(null);
      setLoadError(String(e?.message || e));
    } finally {
      setLoadingDay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => { if (date) loadDay(date); }, [date, loadDay]);

  /* ── editing helpers ── */
  const patchDelivery = (di, patch) =>
    setDeliveries((prev) => prev.map((d, i) => (i === di ? { ...d, ...patch } : d)));
  const updateRow = (di, ri, key, val) =>
    setDeliveries((prev) => prev.map((d, i) => (i !== di ? d : {
      ...d, rows: d.rows.map((r, j) => (j === ri ? { ...r, [key]: val } : r)),
    })));
  // Code and name are one unit — a catalog pick on either side rewrites both.
  const updateProduct = (di, ri, { code, name }) =>
    setDeliveries((prev) => prev.map((d, i) => (i !== di ? d : {
      ...d, rows: d.rows.map((r, j) => (j === ri ? { ...r, itemCode: code, foodItem: name } : r)),
    })));
  const addRow = (di) => patchDelivery(di, { rows: [...deliveries[di].rows, emptyRow()] });
  const removeRow = (di, ri) =>
    setDeliveries((prev) => prev.map((d, i) => (i !== di || d.rows.length <= 1 ? d : { ...d, rows: d.rows.filter((_, j) => j !== ri) })));
  const addDelivery = () => setDeliveries((prev) => [...prev, emptyDelivery(3)]);
  const removeDelivery = (di) => {
    const d = deliveries[di];
    const hasData = d.rows.some(isFilled) || DELIVERY_KEYS.some((k) => String(d[k] ?? "").trim());
    if (hasData && !window.confirm(L(isAr, "Remove this delivery and its lines from the sheet?", "حذف هالتوريدة وأسطرها من الورقة؟"))) return;
    setDeliveries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== di) : [emptyDelivery()]));
  };

  async function pickPhoto(di, slot, file) {
    if (!file) return;
    setUploading(`${di}:${slot}`);
    try {
      const url = await uploadImage(file, `${type}_photo`);
      setDeliveries((prev) => prev.map((d, i) => {
        if (i !== di) return d;
        const images = [...d.images];
        images[slot] = url;
        return { ...d, images };
      }));
    } catch (e) {
      alert(L(isAr, "Photo upload failed: ", "فشل رفع الصورة: ") + (e?.message || e));
    } finally {
      setUploading("");
    }
  }
  const removePhoto = (di, slot) =>
    setDeliveries((prev) => prev.map((d, i) => {
      if (i !== di) return d;
      const images = [...d.images];
      images[slot] = "";
      return { ...d, images };
    }));

  /* ── save ── */
  async function handleSave() {
    if (!date) return flash("⚠️ " + t("hdr_report_date"));
    if (date > todayDubai()) {
      return flash("⚠️ " + L(isAr, `${date} is in the future — check the report date.`, `التاريخ ${date} بالمستقبل — تأكد من تاريخ التقرير.`), 6000);
    }
    if (loadError) return flash("⚠️ " + L(isAr, "Couldn't check this date's sheet — reload and try again.", "ما قدرنا نتأكد من ورقة هاليوم — حدّث الصفحة وجرّب مرة تانية."), 6000);

    const used = deliveries
      .map((d) => ({ ...d, lines: d.rows.filter(isFilled) }))
      .filter((d) => d.lines.length || DELIVERY_KEYS.some((k) => String(d[k] ?? "").trim()));
    if (!used.length || !used.some((d) => d.lines.length)) return flash("⚠️ " + t("rc_req_row"));

    for (let di = 0; di < used.length; di++) {
      const d = used[di];
      const n = di + 1;
      // The invoice number is what tells one delivery from another.
      if (!String(d.supplier).trim() || !String(d.invoiceNo).trim()) {
        return flash(`⚠️ ${L(isAr, "Delivery", "التوريدة")} ${n}: ${t("rc_req_delivery")}`, 7000);
      }
      if (!d.lines.length) return flash(`⚠️ ${L(isAr, "Delivery", "التوريدة")} ${n}: ${t("rc_req_row")}`);
      for (let i = 0; i < d.lines.length; i++) {
        const e = d.lines[i];
        if (e.productionDate && e.expiryDate && e.expiryDate <= e.productionDate) {
          return flash(`⚠️ ${L(isAr, "Delivery", "التوريدة")} ${n}, ${i + 1}: ${t("rc_bad_dates")}`, 6000);
        }
      }
    }
    if (!checkedBy.trim() || !verifiedBy.trim()) {
      return flash("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));
    }

    const outDeliveries = used.map((d) => ({
      supplier: d.supplier.trim(),
      invoiceNo: d.invoiceNo.trim(),
      receivedBy: d.receivedBy.trim(),
      vehicleTemp: d.vehicleTemp,
      ...Object.fromEntries(extraFields.map((f) => [f.key, String(d.extra?.[f.key] ?? "").trim()])),
      ...(photos ? { images: d.images.filter(Boolean) } : {}),
      entries: d.lines,
    }));
    // Flat, per-line copy in the shape every existing viewer/exporter reads.
    const entries = outDeliveries.flatMap((d) =>
      d.entries.map((e, i) => ({
        ...e,
        supplier: d.supplier,
        invoiceNo: d.invoiceNo,
        receivedBy: d.receivedBy,
        vehicleTemp: d.vehicleTemp,
        ...Object.fromEntries(extraFields.map((f) => [f.key, d[f.key] || ""])),
        // aliases older viewers read the weight under (POS 10 / POS 11)
        quantity: e.netWeight ? `${e.netWeight} KG` : "",
        weightKg: e.netWeight || "",
        ...(photos && i === 0 && d.images?.length ? { images: d.images } : {}),
      }))
    );
    const uniq = (k) => [...new Set(outDeliveries.map((d) => d[k]).filter(Boolean))].join(" / ");

    const payload = {
      branch,
      documentNo,
      formRef,
      reportDate: date,
      deliveries: outDeliveries,
      entries,
      supplier: uniq("supplier"),
      invoiceNo: uniq("invoiceNo"),
      receivedBy: uniq("receivedBy"),
      vehicleTemp: outDeliveries[0]?.vehicleTemp ?? "",
      checkedBy,
      verifiedBy,
      savedAt: Date.now(),
    };

    setSaving(true);
    setOpMsg("⏳");
    try {
      const { queued, report } = await saveReport({
        body: { reporter, type, payload },
        id: recordId || null,
        label: `${branch} Receiving Log ${date}`,
      });
      if (!queued && !recordId) {
        const newId = report?.id ?? report?._id ?? null;
        if (newId) setRecordId(newId);
      }
      flash(queued ? queuedMessage(isAr ? "ar" : "en") : "✅", queued ? 7000 : 4000);
    } catch (e) {
      if (e?.status === 409) {
        // Someone filed this day meanwhile — load it so nothing is overwritten.
        flash("⚠️ " + L(isAr,
          "A sheet for this date was just saved from another device. It is loaded now — add your delivery to it and save again.",
          "انحفظت ورقة لهاليوم من جهاز تاني هلّق. فتحناها — ضيف توريدتك عليها واحفظ مرة تانية."), 9000);
        loadDay(date);
      } else {
        flash("❌ " + (e?.message || t("msg_failed")), 7000);
      }
    } finally {
      setSaving(false);
    }
  }

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <style>{STYLES}</style>
      <PRDReportHeader
        title="Receiving Log"
        titleAr="سجل استلام البضائع"
        subtitle={t("rc_subtitle")}
        accent="#f97316"
        fields={[
          { label: "Form ref.",          value: formRef, onChange: setFormRef },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: branch },
          { labelKey: "hdr_issued_by",   value: "QA" },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#f97316" items={RECEIVING_GUIDANCE} />

      {loadingDay ? (
        <div className="rl-banner info">⏳ {L(isAr, "Checking this date…", "عم نتأكد من هاليوم…")}</div>
      ) : loadError ? (
        <div className="rl-banner warn">⚠️ {L(isAr, "Couldn't check whether this date already has a sheet. Reload before saving.", "ما قدرنا نتأكد إذا هاليوم إله ورقة. حدّث الصفحة قبل الحفظ.")}</div>
      ) : recordId ? (
        <div className="rl-banner info">
          📄 {L(isAr,
            "This date already has a sheet — it is open below. Add the new delivery with “Add delivery”; saving updates the same sheet.",
            "هاليوم إله ورقة محفوظة — فتحناها تحت. ضيف التوريدة الجديدة من «إضافة توريدة»، والحفظ بيحدّث نفس الورقة.")}
        </div>
      ) : (
        <div className="ph-hint">🧾 {L(isAr,
          "One sheet per day. Each delivery (supplier + invoice) gets its own block; a second delivery the same day is added as another block.",
          "ورقة وحدة لكل يوم. كل توريدة (مورد + فاتورة) إلها بلوك؛ التوريدة التانية بنفس اليوم بتنضاف كبلوك جديد.")}</div>
      )}

      {deliveries.map((d, di) => {
        const filled = d.rows.filter(isFilled).length;
        return (
          <section className="rl-delivery" key={di}>
            <div className="rl-delivery-head">
              <span className="rl-delivery-no">{L(isAr, "Delivery", "توريدة")} {di + 1}</span>
              <span className="rl-delivery-sum">
                {[d.supplier, d.invoiceNo && `#${d.invoiceNo}`, filled ? `${filled} ${L(isAr, "line(s)", "سطر")}` : ""].filter(Boolean).join(" · ")}
              </span>
              {deliveries.length > 1 && (
                <button type="button" onClick={() => removeDelivery(di)} className="ph-btn ph-btn-ghost">
                  ✕ {L(isAr, "Remove delivery", "حذف التوريدة")}
                </button>
              )}
            </div>

            <FieldPanel
              title={t("rc_delivery")}
              align={alignStart}
              fields={[
                { key: "supplier",    label: t("rc_supplier"),     value: d.supplier,    onChange: (v) => patchDelivery(di, { supplier: v }),    required: true },
                { key: "invoiceNo",   label: t("rc_invoice_no"),   value: d.invoiceNo,   onChange: (v) => patchDelivery(di, { invoiceNo: v }),   required: true },
                { key: "receivedBy",  label: t("rc_received_by"),  value: d.receivedBy,  onChange: (v) => patchDelivery(di, { receivedBy: v }) },
                { key: "vehicleTemp", label: t("rc_vehicle_temp"), value: d.vehicleTemp, onChange: (v) => patchDelivery(di, { vehicleTemp: v }), type: "number" },
                ...extraFields.map((f) => ({
                  key: f.key,
                  label: isAr && f.labelAr ? f.labelAr : f.label,
                  value: d.extra?.[f.key] || "",
                  onChange: (v) => patchDelivery(di, { extra: { ...(d.extra || {}), [f.key]: v } }),
                })),
              ]}
            />

            <div className="ph-toolbar">
              <div className="ph-legend">
                <span><b className="ph-chip-c">C</b> {t("ph_conform")}</span>
                <span><b className="ph-chip-nc">NC</b> {t("ph_nonconform")}</span>
              </div>
              <button type="button" onClick={() => addRow(di)} className="ph-btn ph-btn-ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
                {L(isAr, "Add line", "إضافة سطر")}
              </button>
            </div>

            <div className="ph-table-wrap ph-scroll-x">
              <table className="ph-table" style={{ minWidth: 1280 }}>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>{t("ph_col_no")}</th>
                    {TEXT_COLS.map((c) => <th key={c.key} style={{ width: c.w }}>{c.label}</th>)}
                    {TICK_COLS.map((c) => <th key={c.key} className="ph-col-compact" style={{ width: c.w }}>{c.label}</th>)}
                    {TAIL_COLS.map((c) => <th key={c.key} style={{ width: c.w, textAlign: alignStart }}>{c.label}</th>)}
                    <th style={{ width: 52 }} className="no-print" />
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="ph-num">{ri + 1}</td>
                      {TEXT_COLS.map((c) => (
                        <td key={c.key}>
                          {c.type === "code" ? (
                            <ItemCodeInput code={row.itemCode || ""} name={row.foodItem || ""}
                              onChange={(pair) => updateProduct(di, ri, pair)} className="ph-input" />
                          ) : c.type === "product" ? (
                            <ItemNameInput code={row.itemCode || ""} name={row.foodItem || ""}
                              onChange={(pair) => updateProduct(di, ri, pair)} className="ph-input"
                              placeholder="Search code or product…" />
                          ) : (
                            <input type={c.type} value={row[c.key]} className="ph-input"
                              onChange={(e) => updateRow(di, ri, c.key, e.target.value)} />
                          )}
                        </td>
                      ))}
                      {TICK_COLS.map((c) => {
                        const v = row[c.key];
                        return (
                          <td key={c.key} className="ph-cell-select">
                            <select value={v} onChange={(e) => updateRow(di, ri, c.key, e.target.value)}
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
                          <input type={c.type} value={row[c.key]} className="ph-input"
                            onChange={(e) => updateRow(di, ri, c.key, e.target.value)} />
                        </td>
                      ))}
                      <td className="no-print">
                        {/* removing a draft line is editing, not deleting data — no data-delete-action */}
                        <button type="button" onClick={() => removeRow(di, ri)} className="ph-btn-icon ph-btn-danger"
                          title={t("btn_remove")} disabled={d.rows.length === 1}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {photos && (
              <div className="rl-photos">
                <span className="rl-delivery-sum">📷 {L(isAr, "Delivery photos", "صور التوريدة")}</span>
                {d.images.map((src, slot) => (
                  <label key={slot} className="rl-photo" title={L(isAr, "Add photo", "إضافة صورة")}>
                    {uploading === `${di}:${slot}` ? "⏳" : src ? (
                      <>
                        <img src={src} alt="" />
                        <button type="button" onClick={(e) => { e.preventDefault(); removePhoto(di, slot); }}>×</button>
                      </>
                    ) : "+"}
                    {!src && (
                      <input type="file" accept="image/*" hidden
                        onChange={(e) => { pickPhoto(di, slot, e.target.files?.[0]); e.target.value = ""; }} />
                    )}
                  </label>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <button type="button" className="rl-add-delivery" onClick={addDelivery}>
        ＋ {L(isAr, "Add delivery (another supplier / invoice)", "إضافة توريدة (مورد / فاتورة تانية)")}
      </button>

      <SignatureFooter
        t={t}
        checkedBy={checkedBy}
        setCheckedBy={setCheckedBy}
        verifiedBy={verifiedBy}
        setVerifiedBy={setVerifiedBy}/>
      <SaveBar t={t} opMsg={opMsg} saving={saving} disabled={loadingDay} onSave={handleSave} />
    </FormShell>
  );
}
