// src/pages/monitor/branches/pos6/POS6PersonalHygieneInput.jsx
//
// 👥 Who appears on this sheet is not typed here and is not hardcoded here.
// It comes from Settings → Staff Directory (the `staff_directory` config
// record): every person carrying the `pos6_personal_hygiene` form key. The
// employee number is the key — typing it fills the name and the job title from
// the company register, and typing a known name fills the number back.
// See ../_shared/staffRegistry.js.
import React, { useEffect, useMemo, useRef, useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, DOCS, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";
import {
  useStaffDirectory,
  normalizeEmpNo,
  normalizeName,
} from "../_shared/staffRegistry";

/** The registry entry this sheet reads (staffRegistry.STAFF_FORMS). */
const PH_FORM_KEY = "pos6_personal_hygiene";

/** Document control for this sheet — shared with the viewer (pos6Api.DOCS). */
const DOC = DOCS[TYPES.personalHygiene];

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

const makeRow = (name = "", empNo = "", job = "") =>
  COLUMNS.reduce((row, col) => ({ ...row, [col]: "" }), { empNo, name, job, remarks: "" });

const rowFromStaff = (s) => makeRow(s?.name || "", s?.empNo || "", s?.job || "");

const isBlankRow = (r) =>
  !String(r?.empNo || "").trim() &&
  !String(r?.name || "").trim() &&
  !String(r?.remarks || "").trim() &&
  COLUMNS.every((c) => !String(r?.[c] || "").trim());

export default function POS6PersonalHygieneInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const [date, setDate] = useState(todayISO);
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [entries, setEntries] = useState(() =>
    Array.from({ length: STARTING_ROWS }, () => makeRow())
  );

  /* ===== Staff directory =====
     `roster` is only the people assigned to POS 6, so the daily sheet lists
     exactly who belongs to this branch. `staff` still backs the lookups, so a
     number typed for somebody outside the roster is still resolved. */
  const {
    roster,
    staff: allStaff,
    loading: staffLoading,
    online: staffOnline,
    byNo,
    byName,
  } = useStaffDirectory(PH_FORM_KEY);

  /* Seed the table from the directory once it arrives — but only while nothing
     has been typed, so a late server reply never wipes work in progress. */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading) return;
    seededRef.current = true;
    if (!roster.length) return;
    setEntries((prev) => (prev.every(isBlankRow) ? roster.map(rowFromStaff) : prev));
  }, [roster, staffLoading]);

  const empNoOptions = useMemo(() => allStaff.map((s) => s.empNo), [allStaff]);
  const nameOptions = useMemo(() => allStaff.map((s) => s.name), [allStaff]);

  const handleChange = (rowIndex, field, value) =>
    setEntries((prev) => {
      const updated = [...prev];
      const row = updated[rowIndex] || makeRow();

      // Either identifier fills the rest of the person straight from the register.
      if (field === "empNo") {
        const match = byNo.get(normalizeEmpNo(value));
        updated[rowIndex] = match
          ? { ...row, empNo: value, name: match.name, job: match.job || row.job }
          : { ...row, empNo: value };
        return updated;
      }
      if (field === "name") {
        const match = byName.get(normalizeName(value));
        updated[rowIndex] = match
          ? { ...row, name: value, empNo: match.empNo, job: match.job || row.job }
          : { ...row, name: value };
        return updated;
      }

      updated[rowIndex] = { ...row, [field]: value };
      return updated;
    });

  const addRow = () => setEntries((p) => [...p, makeRow()]);
  const removeRow = (idx) =>
    setEntries((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));

  /** Rebuild the sheet from the directory on demand. */
  const loadRoster = () => {
    if (!roster.length) return;
    const typed = entries.some(
      (e) => !isBlankRow(e) && !roster.some((s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(e.empNo))
    );
    if (typed && !window.confirm(t("ph_roster_replace"))) return;
    setEntries(roster.map(rowFromStaff));
  };

  const handleSave = () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));

    const cleaned = entries.filter((e) => !isBlankRow(e));
    if (cleaned.length === 0) return alert("⚠️ " + t("ph_req_name"));

    save(TYPES.personalHygiene, {
      branch: BRANCH,
      documentNo: DOC.documentNo,
      reportDate: date,
      entries: cleaned,
      checkedBy,
      verifiedBy,
    });
  };

  const alignStart = isAr ? "right" : "left";
  const showRosterHint = !staffLoading && roster.length === 0;

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Personal Hygiene Checklist"
        titleAr="قائمة فحص النظافة الشخصية"
        subtitle={t("ph_subtitle")}
        accent="#0ea5e9"
        fields={[
          { labelKey: "hdr_document_no", value: DOC.documentNo },
          { labelKey: "hdr_issue_date",  value: DOC.issueDate },
          { labelKey: "hdr_revision_no", value: DOC.revision },
          { label: t("hdr_branch"),      value: BRANCH },
          { labelKey: "hdr_issued_by",   value: "QA" },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#0ea5e9" items={GUIDANCE.personalHygiene} />

      <div className="ph-toolbar">
        <div className="ph-toolbar-left">
          <div className="ph-legend">
            <span><b className="ph-chip-c">C</b> {t("ph_conform")}</span>
            <span><b className="ph-chip-nc">NC</b> {t("ph_nonconform")}</span>
          </div>
        </div>
        <div className="ph-toolbar-right">
          <button
            onClick={loadRoster}
            className="ph-btn ph-btn-ghost"
            disabled={staffLoading || !roster.length}
            title={t("ph_roster_hint")}>
            👥 {t("ph_load_roster")}{roster.length ? ` (${roster.length})` : ""}
          </button>
          <button onClick={addRow} className="ph-btn ph-btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            {t("btn_add_row")}
          </button>
        </div>
      </div>

      {showRosterHint && <div className="ph-hint">👥 {t("ph_roster_empty")}</div>}
      {!staffLoading && !staffOnline && (
        <div className="ph-hint ph-hint-warn">📴 {t("ph_roster_offline")}</div>
      )}

      {/* Directory-backed suggestions for both employee columns */}
      <datalist id="pos6-ph-empno-options">
        {empNoOptions.map((n) => {
          const rec = byNo.get(normalizeEmpNo(n));
          return <option key={n} value={n}>{rec?.name || ""}</option>;
        })}
      </datalist>
      <datalist id="pos6-ph-name-options">
        {nameOptions.map((n) => {
          const rec = byName.get(normalizeName(n));
          return <option key={n} value={n}>{rec?.empNo || ""}</option>;
        })}
      </datalist>

      <div className="ph-table-wrap ph-scroll-x">
        <table className="ph-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("ph_col_no")}</th>
              <th style={{ width: 96 }}>{t("ph_col_empno")}</th>
              <th style={{ width: 190, textAlign: alignStart }}>{t("ph_col_name")}</th>
              <th style={{ width: 140, textAlign: alignStart }}>{t("ph_col_job")}</th>
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
                    list="pos6-ph-empno-options"
                    value={entry.empNo || ""}
                    onChange={(e) => handleChange(i, "empNo", e.target.value)}
                    className="ph-input ph-input-no"
                    placeholder={t("ph_req_empno")}/>
                </td>
                <td>
                  <input
                    type="text"
                    list="pos6-ph-name-options"
                    value={entry.name}
                    onChange={(e) => handleChange(i, "name", e.target.value)}
                    className="ph-input"
                    placeholder={t("ph_req_name")}/>
                </td>
                <td>
                  <input
                    type="text"
                    value={entry.job || ""}
                    onChange={(e) => handleChange(i, "job", e.target.value)}
                    className="ph-input ph-input-job"
                    placeholder={t("ph_optional")}/>
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
