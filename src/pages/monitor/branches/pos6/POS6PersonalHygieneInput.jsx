// src/pages/monitor/branches/pos6/POS6PersonalHygieneInput.jsx
// Production-style form, POS 6 data. Rows start blank on purpose — the branch
// is newly wired, so no staff list is invented here.
import React, { useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";

const COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];
const COL_KEYS = [
  "ph_col_nails",
  "ph_col_hair",
  "ph_col_jewelry",
  "ph_col_ppe",
  "ph_col_disease",
  "ph_col_wounds",
];

const STARTING_ROWS = 5;

const makeRow = () =>
  COLUMNS.reduce((row, col) => ({ ...row, [col]: "" }), { name: "", remarks: "" });

export default function POS6PersonalHygieneInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const [date, setDate] = useState(todayISO);
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [entries, setEntries] = useState(() =>
    Array.from({ length: STARTING_ROWS }, makeRow)
  );

  const handleChange = (rowIndex, field, value) =>
    setEntries((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      return updated;
    });

  const addRow = () => setEntries((p) => [...p, makeRow()]);
  const removeRow = (idx) =>
    setEntries((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));

  const handleSave = () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));

    const cleaned = entries.filter(
      (e) =>
        String(e.name || "").trim() !== "" ||
        COLUMNS.some((c) => String(e[c] || "").trim() !== "") ||
        String(e.remarks || "").trim() !== ""
    );
    if (cleaned.length === 0) return alert("⚠️ " + t("ph_req_name"));

    save(TYPES.personalHygiene, {
      branch: BRANCH,
      reportDate: date,
      entries: cleaned,
      checkedBy,
      verifiedBy,
    });
  };

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Personal Hygiene Checklist"
        titleAr="قائمة فحص النظافة الشخصية"
        subtitle={t("ph_subtitle")}
        accent="#0ea5e9"
        fields={[
          { labelKey: "hdr_document_no", value: "FS-QM/REC/PH" },
          { labelKey: "hdr_issue_date",  value: "05/02/2020" },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: BRANCH },
          { labelKey: "hdr_issued_by",   value: "QA" },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#0ea5e9" items={GUIDANCE.personalHygiene} />

      <div className="ph-toolbar">
        <div className="ph-legend">
          <span><b className="ph-chip-c">C</b> {t("ph_conform")}</span>
          <span><b className="ph-chip-nc">NC</b> {t("ph_nonconform")}</span>
        </div>
        <button onClick={addRow} className="ph-btn ph-btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          {t("btn_add_row")}
        </button>
      </div>

      <div className="ph-table-wrap">
        <table className="ph-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("ph_col_no")}</th>
              <th style={{ width: 200, textAlign: alignStart }}>{t("ph_col_name")}</th>
              {COL_KEYS.map((k, i) => (
                <th key={k} className="ph-col-compact" title={COLUMNS[i]}>{t(k)}</th>
              ))}
              <th style={{ width: 220, textAlign: alignStart }}>{t("ph_col_remarks")}</th>
              <th style={{ width: 52 }} className="no-print" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td className="ph-num">{i + 1}</td>
                <td>
                  <input
                    type="text"
                    value={entry.name}
                    onChange={(e) => handleChange(i, "name", e.target.value)}
                    className="ph-input"
                    placeholder={t("ph_req_name")}/>
                </td>
                {COLUMNS.map((col) => {
                  const v = entry[col];
                  return (
                    <td key={col} className="ph-cell-select">
                      <select
                        value={v}
                        onChange={(e) => handleChange(i, col, e.target.value)}
                        className={`ph-select ph-select-${v === "C" ? "ok" : v === "NC" ? "bad" : "empty"}`}>
                        <option value="">—</option>
                        <option value="C">C</option>
                        <option value="NC">NC</option>
                      </select>
                    </td>
                  );
                })}
                <td>
                  <input
                    type="text"
                    value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    className="ph-input"
                    placeholder={COLUMNS.some((c) => entry[c] === "NC") ? t("ph_req_nc") : t("ph_optional")}/>
                </td>
                <td className="no-print">
                  <button
                    onClick={() => removeRow(i)}
                    className="ph-btn-icon ph-btn-danger"
                    title={t("btn_remove")}
                    disabled={entries.length === 1}>
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
