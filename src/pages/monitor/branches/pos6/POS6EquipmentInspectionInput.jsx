// src/pages/monitor/branches/pos6/POS6EquipmentInspectionInput.jsx
// Equipment condition + sanitizing rounds, drawn in the same Production style
// as the rest of POS 6. The payload keeps the shape the POS 15 sheet writes
// (entries / slots / formRef / section), so existing viewers read it unchanged.
import React, { useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";

/* Sanitizing rounds through the day. */
const SLOTS = [
  { key: "s_8_9_AM",  label: "8–9 AM" },
  { key: "s_12_1_PM", label: "12–1 PM" },
  { key: "s_4_5_PM",  label: "4–5 PM" },
  { key: "s_8_9_PM",  label: "8–9 PM" },
  { key: "s_12_1_AM", label: "12–1 AM" },
];

const YES_NO = [
  { key: "freeFromDamage",       label: "Free from damage" },
  { key: "freeFromBrokenPieces", label: "Free from broken pieces" },
];

const DEFAULT_EQUIPMENT = [
  "Cutting board, knives, wrapping machine, weighing scale",
  "Slicer, grater",
  "Bone saw machine, mincer",
];

const emptyRow = (equipment = "") => {
  const row = { equipment, correctiveAction: "", checkedByRow: "" };
  YES_NO.forEach((c) => { row[c.key] = ""; });
  SLOTS.forEach((s) => { row[s.key] = ""; });
  return row;
};

const hasRisk = (r) =>
  YES_NO.some((c) => r[c.key] === "No") || SLOTS.some((s) => r[s.key] === "✗");

const isFilled = (r) => Object.values(r).some((v) => String(v ?? "").trim() !== "");

export default function POS6EquipmentInspectionInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const [date, setDate] = useState(todayISO);
  const [formRef, setFormRef] = useState("FSMS/BR/F17");
  const [section, setSection] = useState("");
  const [rows, setRows] = useState(() => DEFAULT_EQUIPMENT.map((n) => emptyRow(n)));
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const onVal = (i, k, v) =>
    setRows((prev) => {
      const a = [...prev];
      a[i] = { ...a[i], [k]: v };
      return a;
    });

  const addRow = () => setRows((p) => [...p, emptyRow()]);
  const removeRow = (idx) =>
    setRows((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));

  const handleSave = () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    const entries = rows.filter(isFilled);
    if (entries.length === 0) return alert("⚠️ " + t("eq_req_row"));

    for (let i = 0; i < entries.length; i++) {
      if (hasRisk(entries[i]) && !String(entries[i].correctiveAction || "").trim()) {
        return alert(`⚠️ ${i + 1}: ${t("eq_req_action")}`);
      }
    }
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));

    save(TYPES.equipmentInspection, {
      uniqueKey: `${TYPES.equipmentInspection}__${BRANCH}__${date}`,
      branch: BRANCH,
      formRef,
      section,
      reportDate: date,
      slots: SLOTS.map((s) => s.key),
      entries,
      checkedBy,
      verifiedBy,
    });
  };

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Equipment Inspection & Sanitizing Log"
        titleAr="سجل فحص وتعقيم المعدات"
        subtitle={t("tab_equipment_sub")}
        accent="#f59e0b"
        fields={[
          { label: "Form ref.",          value: formRef, onChange: setFormRef },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: BRANCH },
          { label: t("eq_section"),      value: section, onChange: setSection },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#f59e0b" items={GUIDANCE.equipment} />

      <div className="ph-toolbar">
        <div className="ph-legend">
          <span><b className="ph-chip-c">√</b> {t("eq_done")}</span>
          <span><b className="ph-chip-nc">✗</b> {t("eq_not_done")}</span>
        </div>
        <button onClick={addRow} className="ph-btn ph-btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          {t("btn_add_row")}
        </button>
      </div>

      <div className="ph-table-wrap ph-scroll-x">
        <table className="ph-table" style={{ minWidth: 1250 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("ph_col_no")}</th>
              <th style={{ minWidth: 240, textAlign: alignStart }}>{t("eq_col_equipment")}</th>
              {YES_NO.map((c) => (
                <th key={c.key} className="ph-col-compact" style={{ width: 118 }}>{c.label}</th>
              ))}
              {SLOTS.map((s) => (
                <th key={s.key} className="ph-col-compact" style={{ width: 96 }}>{s.label}</th>
              ))}
              <th style={{ minWidth: 200, textAlign: alignStart }}>{t("eq_col_action")}</th>
              <th style={{ width: 140, textAlign: alignStart }}>{t("sig_checked_by")}</th>
              <th style={{ width: 52 }} className="no-print" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const risky = hasRisk(r);
              return (
                <tr key={i}>
                  <td className="ph-num">{i + 1}</td>
                  <td>
                    <input
                      className="ph-input"
                      value={r.equipment}
                      onChange={(e) => onVal(i, "equipment", e.target.value)}
                      placeholder={t("eq_col_equipment")}/>
                  </td>

                  {YES_NO.map((c) => {
                    const v = r[c.key];
                    return (
                      <td key={c.key} className="ph-cell-select">
                        <select
                          value={v}
                          onChange={(e) => onVal(i, c.key, e.target.value)}
                          className={`ph-select ph-select-${v === "Yes" ? "ok" : v === "No" ? "bad" : "empty"}`}>
                          <option value="">—</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                    );
                  })}

                  {SLOTS.map((s) => {
                    const v = r[s.key];
                    return (
                      <td key={s.key} className="ph-cell-select">
                        <select
                          value={v}
                          onChange={(e) => onVal(i, s.key, e.target.value)}
                          className={`ph-select ph-select-${v === "√" ? "ok" : v === "✗" ? "bad" : "empty"}`}>
                          <option value="">—</option>
                          <option value="√">√</option>
                          <option value="✗">✗</option>
                        </select>
                      </td>
                    );
                  })}

                  <td>
                    <input
                      className="ph-input"
                      value={r.correctiveAction}
                      onChange={(e) => onVal(i, "correctiveAction", e.target.value)}
                      placeholder={risky ? t("eq_req_action") : t("ph_optional")}/>
                  </td>
                  <td>
                    <input
                      className="ph-input"
                      value={r.checkedByRow}
                      onChange={(e) => onVal(i, "checkedByRow", e.target.value)}
                      placeholder={t("sig_name_sig")}/>
                  </td>
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
              );
            })}
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
