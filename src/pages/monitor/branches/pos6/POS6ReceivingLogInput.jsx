// src/pages/monitor/branches/pos6/POS6ReceivingLogInput.jsx
// Incoming-delivery inspection for POS 6, drawn in the Production form style.
import React, { useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";
import { ItemCodeInput, ItemNameInput } from "../_shared/CodedProductField";

/* Columns judged C / NC on arrival. */
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean",        w: 110 },
  { key: "handlerHygiene", label: "Handler hygiene",      w: 120 },
  { key: "appearanceOK",   label: "Appearance",           w: 105 },
  { key: "firmnessOK",     label: "Firmness",             w: 100 },
  { key: "smellOK",        label: "Smell",                w: 95 },
  { key: "packagingGood",  label: "Packaging intact",     w: 125 },
];

/* Free-text / numeric columns, in the order they appear on the sheet. */
const TEXT_COLS = [
  // itemCode ⟷ foodItem lead the sheet: the catalog code that ties this line to
  // the same product everywhere else (QCS shipment, traceability, final product).
  { key: "itemCode",       label: "Item code",        type: "code",    w: 120 },
  { key: "foodItem",       label: "Food item",        type: "product", w: 180 },
  { key: "supplier",       label: "Supplier",         type: "text",    w: 160 },
  { key: "netWeight",      label: "Net weight (kg)",  type: "number", w: 110 },
  { key: "vehicleTemp",    label: "Vehicle °C",       type: "number", w: 95 },
  { key: "foodTemp",       label: "Food °C",          type: "number", w: 95 },
];

const TAIL_COLS = [
  { key: "countryOfOrigin", label: "Country of origin", type: "text", w: 130 },
  { key: "productionDate",  label: "Production date",   type: "date", w: 140 },
  { key: "expiryDate",      label: "Expiry date",       type: "date", w: 140 },
  { key: "invoiceNo",       label: "Invoice no.",       type: "text", w: 120 },
  { key: "receivedBy",      label: "Received by",       type: "text", w: 130 },
  { key: "remarks",         label: "Remarks",           type: "text", w: 180 },
];

const STARTING_ROWS = 5;

const emptyRow = () => {
  const row = {};
  [...TEXT_COLS, ...TAIL_COLS].forEach((c) => { row[c.key] = ""; });
  TICK_COLS.forEach((c) => { row[c.key] = ""; });
  return row;
};

const isFilled = (r) => Object.values(r).some((v) => String(v ?? "").trim() !== "");

export default function POS6ReceivingLogInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const [date, setDate] = useState(todayISO);
  const [formRef, setFormRef] = useState("FSMS/BR/F01A");
  const [rows, setRows] = useState(() => Array.from({ length: STARTING_ROWS }, emptyRow));
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

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
    setRows((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));

  const handleSave = () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    const entries = rows.filter(isFilled);
    if (entries.length === 0) return alert("⚠️ " + t("rc_req_row"));

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.productionDate && e.expiryDate && e.expiryDate <= e.productionDate) {
        return alert(`⚠️ ${i + 1}: ${t("rc_bad_dates")}`);
      }
    }
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));

    save(TYPES.receivingLog, {
      branch: BRANCH,
      formRef,
      reportDate: date,
      entries,
      checkedBy,
      verifiedBy,
    });
  };

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Receiving Log"
        titleAr="سجل استلام البضائع"
        subtitle={t("rc_subtitle")}
        accent="#f97316"
        fields={[
          { label: "Form ref.",          value: formRef, onChange: setFormRef },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: BRANCH },
          { labelKey: "hdr_issued_by",   value: "QA" },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#f97316" items={GUIDANCE.receiving} />

      <div className="ph-toolbar">
        <div className="ph-legend">
          <span><b className="ph-chip-c">C</b> {t("ph_conform")}</span>
          <span><b className="ph-chip-nc">NC</b> {t("ph_nonconform")}</span>
        </div>
        <button onClick={addRow} className="ph-btn ph-btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          {t("rc_add_row")}
        </button>
      </div>

      <div className="ph-table-wrap ph-scroll-x">
        <table className="ph-table" style={{ minWidth: 1660 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("ph_col_no")}</th>
              {TEXT_COLS.map((c) => (
                <th key={c.key} style={{ width: c.w }}>{c.label}</th>
              ))}
              {TICK_COLS.map((c) => (
                <th key={c.key} className="ph-col-compact" style={{ width: c.w }}>{c.label}</th>
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
                        value={row[c.key]}
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
                    title={t("btn_remove")}
                    disabled={rows.length === 1}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SignatureFooter
        t={t}
        checkedBy={checkedBy}
        setCheckedBy={setCheckedBy}
        verifiedBy={verifiedBy}
        setVerifiedBy={setVerifiedBy}/>
      <SaveBar t={t} opMsg={opMsg} saving={saving} onSave={handleSave} />
    </FormShell>
  );
}
