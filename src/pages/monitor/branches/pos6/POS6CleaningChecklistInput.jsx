// src/pages/monitor/branches/pos6/POS6CleaningChecklistInput.jsx
// Production-style checklist, POS-butchery areas (the POS 15 sheet), so the
// sections match what a retail butchery actually cleans.
import React, { useMemo, useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";

const GENERAL_CLEANER = "bh-20 (General purpose) 10 ml/litr / Multi clean";
const SURFACE_SANITIZER = "bh-30 (surface sanitizer) 30 ml/bottle";

const TPL = [
  { title: "HAND WASHING AREA", items: [
    { t: "Hand wash sink", c: GENERAL_CLEANER },
    { t: "Hand wash soap available", c: "" },
    { t: "Tissue available", c: "" },
    { t: "Hairnet available", c: "" },
    { t: "Face mask available", c: "" },
  ]},
  { title: "MEAT CUTTING AREA", items: [
    { t: "Cutting tables", c: SURFACE_SANITIZER },
    { t: "Cutting board", c: SURFACE_SANITIZER },
    { t: "Cutting knives", c: SURFACE_SANITIZER },
    { t: "Waste basket", c: GENERAL_CLEANER },
    { t: "Weighing scale", c: SURFACE_SANITIZER },
    { t: "Crates", c: GENERAL_CLEANER },
    { t: "Washing sink", c: GENERAL_CLEANER },
    { t: "Knife sharpener", c: SURFACE_SANITIZER },
  ]},
  { title: "DISPLAY CHILLER", items: [
    { t: "Proper arrangement of meat", c: "" },
    { t: "Shelves", c: GENERAL_CLEANER },
    { t: "Display glass and inside", c: GENERAL_CLEANER },
    { t: "Door", c: GENERAL_CLEANER },
  ]},
  { title: "CHILLER ROOM", items: [
    { t: "Proper arrangement of meat", c: "" },
    { t: "Shelves", c: GENERAL_CLEANER },
    { t: "Door", c: GENERAL_CLEANER },
    { t: "Hooks / Trolleys", c: GENERAL_CLEANER },
  ]},
  { title: "MACHINE CLEANLINESS", items: [
    { t: "Mincer", c: SURFACE_SANITIZER },
    { t: "Wrapping machine", c: SURFACE_SANITIZER },
    { t: "Bone saw machine", c: SURFACE_SANITIZER },
  ]},
  { title: "WASTE DISPOSAL", items: [
    { t: "Collection of waste", c: "" },
    { t: "Disposal", c: "" },
  ]},
  { title: "WORKING CONDITIONS & CLEANLINESS", items: [
    { t: "Lights", c: "" },
    { t: "Fly catchers", c: "" },
    { t: "Floor / wall", c: GENERAL_CLEANER },
    { t: "Painting and plastering", c: "" },
    { t: "Weighing balance", c: GENERAL_CLEANER },
    { t: "Tap water", c: "" },
    { t: "Knife sterilizer", c: "" },
  ]},
];

function buildDefaultRows() {
  const out = [];
  TPL.forEach((sec, secIdx) => {
    out.push({ isSection: true, sectionNo: secIdx + 1, section: sec.title });
    sec.items.forEach((it, idx) => {
      out.push({
        isSection: false,
        letter: String.fromCharCode(97 + idx) + ")",
        general: it.t,
        chemical: it.c,
        cnc: "",
        doneBy: "",
        remarks: "",
      });
    });
  });
  return out;
}

export default function POS6CleaningChecklistInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const [date, setDate] = useState(todayISO);
  const [rows, setRows] = useState(buildDefaultRows);
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const onVal = (i, k, v) =>
    setRows((prev) => {
      const a = [...prev];
      a[i] = { ...a[i], [k]: v };
      return a;
    });

  const stats = useMemo(() => {
    const checkable = rows.filter((r) => !r.isSection);
    const filled = checkable.filter((r) => r.cnc).length;
    return {
      total: checkable.length,
      filled,
      conform: checkable.filter((r) => r.cnc === "C").length,
      nonConform: checkable.filter((r) => r.cnc === "NC").length,
      pct: checkable.length ? Math.round((filled / checkable.length) * 100) : 0,
    };
  }, [rows]);

  const handleSave = () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));
    if (stats.filled === 0) return alert("⚠️ " + t("ph_req_nc"));

    save(TYPES.cleaningChecklist, {
      branch: BRANCH,
      reportDate: date,
      entries: rows,
      checkedBy,
      verifiedBy,
    });
  };

  const alignStart = isAr ? "right" : "left";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Cleaning Checklist"
        titleAr="قائمة فحص النظافة"
        subtitle={t("tab_cleaning_sub")}
        accent="#22c55e"
        fields={[
          { labelKey: "hdr_document_no", value: "FF-QM/REC/CC" },
          { labelKey: "hdr_issue_date",  value: "05/02/2020" },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: BRANCH },
          { labelKey: "hdr_issued_by",   value: "QA" },
          { labelKey: "hdr_controlling", value: "Quality Controller" },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}
      />

      <GuidanceNote isAr={isAr} accent="#22c55e" items={GUIDANCE.cleaning} />

      <div className="ph-stats">
        <div className="ph-stat">
          <div className="ph-stat-label">Checked</div>
          <div className="ph-stat-value">{stats.filled} / {stats.total}</div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">C</div>
          <div className="ph-stat-value">{stats.conform}</div>
        </div>
        <div className={`ph-stat ${stats.nonConform ? "ph-stat-bad" : ""}`}>
          <div className="ph-stat-label">NC</div>
          <div className="ph-stat-value">{stats.nonConform}</div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">%</div>
          <div className="ph-stat-value">{stats.pct}%</div>
        </div>
      </div>

      <div className="ph-table-wrap ph-scroll-x">
        <table className="ph-table">
          <thead>
            <tr>
              <th style={{ width: 54 }}>{t("ph_col_no")}</th>
              <th style={{ minWidth: 220, textAlign: alignStart }}>General Cleanliness</th>
              <th style={{ minWidth: 210, textAlign: alignStart }}>Chemical Used</th>
              <th style={{ width: 110 }}>C / NC</th>
              <th style={{ width: 150, textAlign: alignStart }}>{t("sig_checked_by")}</th>
              <th style={{ minWidth: 180, textAlign: alignStart }}>{t("ph_col_remarks")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) =>
              r.isSection ? (
                <tr key={i} className="ph-section-row">
                  <td>{r.sectionNo}</td>
                  <td colSpan={5} style={{ textAlign: alignStart }}>{r.section}</td>
                </tr>
              ) : (
                <tr key={i}>
                  <td className="ph-num">{r.letter}</td>
                  <td style={{ textAlign: alignStart }}>{r.general}</td>
                  <td style={{ textAlign: alignStart, color: "#64748b", fontSize: 12 }}>{r.chemical || "—"}</td>
                  <td className="ph-cell-select">
                    <select
                      value={r.cnc}
                      onChange={(e) => onVal(i, "cnc", e.target.value)}
                      className={`ph-select ph-select-${r.cnc === "C" ? "ok" : r.cnc === "NC" ? "bad" : "empty"}`}
                    >
                      <option value="">—</option>
                      <option value="C">C</option>
                      <option value="NC">NC</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="ph-input"
                      value={r.doneBy}
                      onChange={(e) => onVal(i, "doneBy", e.target.value)}
                      placeholder={t("sig_name_sig")}
                    />
                  </td>
                  <td>
                    <input
                      className="ph-input"
                      value={r.remarks}
                      onChange={(e) => onVal(i, "remarks", e.target.value)}
                      placeholder={r.cnc === "NC" ? t("ph_req_nc") : t("ph_optional")}
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <SignatureFooter
        t={t}
        checkedBy={checkedBy}
        setCheckedBy={setCheckedBy}
        verifiedBy={verifiedBy}
        setVerifiedBy={setVerifiedBy}
      />
      <SaveBar t={t} opMsg={opMsg} saving={saving} onSave={handleSave} />
    </FormShell>
  );
}
