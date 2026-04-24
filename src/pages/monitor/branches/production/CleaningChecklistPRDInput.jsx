// src/pages/monitor/branches/production/CleaningChecklistPRDInput.jsx
// Redesigned — unified production design + bilingual EN/AR
import React, { useState, useMemo } from "react";
import PRDReportHeader from "./_shared/PRDReportHeader";
import { useLang } from "./_shared/i18n";

/* ===== API base ===== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

/* ================== Default metadata ================== */
const HEAD_DEFAULT = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF-QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O.Sarhan",
};

/* ================== Template ================== */
const TPL = [
  { no: 1, title: "Hand Washing Area", items: [
    { t: "Hand wash Sink", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Hand wash soap available upon the request", c: "" },
    { t: "Tissue available", c: "" },
    { t: "Hair Net available", c: "" },
    { t: "Face Masks available", c: "" },
  ]},
  { no: 2, title: "Meat Cutting Room", items: [
    { t: "Cutting Tables", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Walls/Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Cutting Board", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Cutting Knife", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Waste Basket", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "weighing scales", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Red crates", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 3, title: "Chiller Room 3", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 4, title: "Chiller Room 4", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 5, title: "Chiller Room 1", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 7, title: "Machine Cleanliness", items: [
    { t: "Sausage Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Mincer", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Wrapping Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Bone saw Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
  ]},
  { no: 8, title: "Packing Store", items: [
    { t: "Master Carton Stacking", c: "" },
    { t: "Polythene bags", c: "" },
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 9, title: "Waste Disposal", items: [
    { t: "Collection of waste", c: "" },
    { t: "Disposal", c: "" },
  ]},
  { no: 10, title: "Working Conditions & Cleanliness", items: [
    { t: "Lights", c: "" },
    { t: "Fly Catchers", c: "" },
    { t: "Floor/wall", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Painting and Plastering", c: "" },
    { t: "Weighing Balance", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Tap Water", c: "" },
  ]},
];

const emptyRow = () => ({
  isSection: false,
  letter: "",
  general: "",
  chemical: "",
  cnc: "",
  doneBy: "",
  remarks: "",
});

function buildDefaultRows() {
  const out = [];
  TPL.forEach((sec) => {
    out.push({ isSection: true, sectionNo: sec.no, section: sec.title });
    sec.items.forEach((it, idx) => {
      out.push({
        ...emptyRow(),
        letter: String.fromCharCode(97 + idx) + ")",
        general: it.t,
        chemical: it.c || "",
      });
    });
  });
  return out;
}

export default function CleaningChecklistPRDInput() {
  const { t, dir, isAr } = useLang();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rowsState, setRowsState] = useState(() => buildDefaultRows());
  const [footer, setFooter] = useState({ checkedBy: "", verifiedBy: "" });
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  const onVal = (i, k, v) =>
    setRowsState((prev) => {
      const a = [...prev];
      a[i] = { ...a[i], [k]: v };
      return a;
    });

  // Progress stats
  const stats = useMemo(() => {
    const checkable = rowsState.filter((r) => !r.isSection);
    const filled = checkable.filter((r) => r.cnc).length;
    const conform = checkable.filter((r) => r.cnc === "C").length;
    const nonConform = checkable.filter((r) => r.cnc === "N\\C").length;
    return {
      total: checkable.length,
      filled,
      conform,
      nonConform,
      pct: checkable.length ? Math.round((filled / checkable.length) * 100) : 0,
    };
  }, [rowsState]);

  async function saveToServer() {
    try {
      setSaving(true);
      setOpMsg("⏳ Saving...");
      const payload = {
        reportDate: date,
        entries: rowsState,
        header: HEAD_DEFAULT,
        footer,
        savedAt: Date.now(),
      };
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "production", type: "prod_cleaning_checklist", payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully");
    } catch (e) {
      setOpMsg("❌ Error: " + (e?.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 4000);
    }
  }

  const alignStart = isAr ? "right" : "left";

  return (
    <div className="cc-wrap" dir={dir}>
      <style>{STYLES}</style>

      <PRDReportHeader
        title="Cleaning Checklist"
        titleAr="قائمة تفتيش النظافة"
        subtitle={t("cc_subtitle")}
        accent="#22c55e"
        fields={[
          { labelKey: "hdr_document_no",  value: HEAD_DEFAULT.documentNo },
          { labelKey: "hdr_issue_date",   value: HEAD_DEFAULT.issueDate },
          { labelKey: "hdr_revision_no",  value: HEAD_DEFAULT.revisionNo },
          { labelKey: "hdr_area",         value: HEAD_DEFAULT.area },
          { labelKey: "hdr_issued_by",    value: HEAD_DEFAULT.issuedBy },
          { labelKey: "hdr_controlling",  value: HEAD_DEFAULT.controllingOfficer },
          { labelKey: "hdr_approved_by",  value: HEAD_DEFAULT.approvedBy },
          { labelKey: "hdr_report_date",  type: "date", value: date, onChange: setDate },
        ]}
      />

      {/* Stats cards */}
      <div className="cc-stats">
        <div className="cc-stat">
          <div className="cc-stat-label">{t("cc_stat_progress")}</div>
          <div className="cc-stat-value">{stats.filled} / {stats.total}</div>
          <div className="cc-stat-bar">
            <div className="cc-stat-bar-fill" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
        <div className="cc-stat cc-stat-ok">
          <div className="cc-stat-label">{t("cc_stat_conform")}</div>
          <div className="cc-stat-value">{stats.conform}</div>
        </div>
        <div className="cc-stat cc-stat-bad">
          <div className="cc-stat-label">{t("cc_stat_noncnf")}</div>
          <div className="cc-stat-value">{stats.nonConform}</div>
        </div>
        <div className="cc-stat cc-stat-muted">
          <div className="cc-stat-label">{t("cc_stat_pending")}</div>
          <div className="cc-stat-value">{stats.total - stats.filled}</div>
        </div>
      </div>

      {/* Table */}
      <div className="cc-table-wrap">
        <table className="cc-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th style={{ width: 280, textAlign: alignStart }}>{t("cc_col_general")}</th>
              <th style={{ minWidth: 220, textAlign: alignStart }}>{t("cc_col_chemical")}</th>
              <th style={{ width: 90 }}>{t("cc_col_status")}</th>
              <th style={{ width: 160, textAlign: alignStart }}>{t("cc_col_doneby")}</th>
              <th style={{ minWidth: 200, textAlign: alignStart }}>{t("cc_col_remarks")}</th>
            </tr>
          </thead>
          <tbody>
            {rowsState.map((r, i) => {
              if (r.isSection) {
                return (
                  <tr key={`sec-${i}`} className="cc-section-row">
                    <td className="cc-section-num">{r.sectionNo}</td>
                    <td className="cc-section-title" colSpan={5}>{r.section}</td>
                  </tr>
                );
              }
              return (
                <tr key={i} className={`cc-row ${r.cnc === "N\\C" ? "cc-row-bad" : r.cnc === "C" ? "cc-row-ok" : ""}`}>
                  <td className="cc-letter">{r.letter || "—"}</td>
                  <td className="cc-general" title={r.general}>{r.general}</td>
                  <td>
                    <input
                      value={r.chemical || ""}
                      onChange={(e) => onVal(i, "chemical", e.target.value)}
                      className="cc-input"
                      placeholder="—"
                    />
                  </td>
                  <td className="cc-cell-select">
                    <select
                      value={r.cnc || ""}
                      onChange={(e) => onVal(i, "cnc", e.target.value)}
                      className={`cc-select cc-select-${r.cnc === "C" ? "ok" : r.cnc === "N\\C" ? "bad" : "empty"}`}
                    >
                      <option value="">—</option>
                      <option value="C">C</option>
                      <option value={"N\\C"}>N\C</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={r.doneBy || ""}
                      onChange={(e) => onVal(i, "doneBy", e.target.value)}
                      className="cc-input"
                      placeholder={t("sig_name_sig")}
                    />
                  </td>
                  <td>
                    <input
                      value={r.remarks || ""}
                      onChange={(e) => onVal(i, "remarks", e.target.value)}
                      className="cc-input"
                      placeholder={r.cnc === "N\\C" ? t("cc_req_nc") : t("ph_optional")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend + footer */}
      <div className="cc-note">
        <strong>{isAr ? "ملاحظة:" : "Note:"}</strong> {t("cc_note_daily")} &nbsp;•&nbsp;
        <span className="cc-chip-c">C</span> = {t("ph_conform")} &nbsp;•&nbsp;
        <span className="cc-chip-nc">N\C</span> = {t("ph_nonconform")}
      </div>

      <div className="cc-footer">
        <div className="cc-sig">
          <label>{t("sig_checked_by")}</label>
          <input
            type="text"
            value={footer.checkedBy}
            onChange={(e) => setFooter((f) => ({ ...f, checkedBy: e.target.value }))}
            className="cc-input"
            placeholder={t("sig_name_sig")}
          />
        </div>
        <div className="cc-sig">
          <label>{t("sig_verified_by")}</label>
          <input
            type="text"
            value={footer.verifiedBy}
            onChange={(e) => setFooter((f) => ({ ...f, verifiedBy: e.target.value }))}
            className="cc-input"
            placeholder={t("sig_name_sig")}
          />
        </div>
      </div>

      <div className="cc-savebar">
        {opMsg && (
          <div className={`cc-msg ${opMsg.startsWith("❌") ? "cc-msg-err" : ""}`}>{opMsg}</div>
        )}
        <button onClick={saveToServer} disabled={saving} className="cc-btn cc-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving ? t("btn_saving") : t("btn_save")}
        </button>
      </div>
    </div>
  );
}

const STYLES = `
  .cc-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  .cc-stats {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .cc-stat {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .cc-stat-label {
    font-size: 10px;
    font-weight: 800;
    color: #64748b;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .cc-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
  }
  .cc-stat-bar {
    margin-top: 8px;
    height: 6px;
    background: #f1f5f9;
    border-radius: 3px;
    overflow: hidden;
  }
  .cc-stat-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    transition: width .3s ease;
  }
  .cc-stat-ok .cc-stat-value    { color: #16a34a; }
  .cc-stat-bad .cc-stat-value   { color: #dc2626; }
  .cc-stat-muted .cc-stat-value { color: #64748b; }

  .cc-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .cc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .cc-table thead th {
    background: #0f172a;
    color: #fff;
    padding: 12px 12px;
    font-weight: 700;
    font-size: 11.5px;
    letter-spacing: .04em;
    text-align: center;
    border-right: 1px solid rgba(255,255,255,.08);
  }
  .cc-table thead th:last-child { border-right: none; }
  .cc-table tbody td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .cc-section-row {
    background: linear-gradient(90deg, #0f766e 0%, #14b8a6 100%);
    color: #fff;
  }
  .cc-section-row td {
    padding: 10px 14px !important;
    border-bottom: 1px solid #e2e8f0;
  }
  .cc-section-num {
    text-align: center;
    font-weight: 800;
    font-size: 14px;
    width: 60px;
  }
  .cc-section-title {
    font-weight: 800;
    font-size: 14px;
    letter-spacing: .02em;
  }
  .cc-letter {
    text-align: center;
    color: #94a3b8;
    font-weight: 700;
    font-size: 12px;
  }
  .cc-general {
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
  }
  .cc-row-ok  { background: #f0fdf4; }
  .cc-row-bad { background: #fef2f2; }
  .cc-row:hover { background: #eff6ff; }
  .cc-row-ok:hover  { background: #dcfce7; }
  .cc-row-bad:hover { background: #fee2e2; }

  .cc-input {
    width: 100%; box-sizing: border-box;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .cc-input:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,.12);
  }
  .cc-input::placeholder { color: #cbd5e1; }

  .cc-cell-select { text-align: center; padding: 4px !important; }
  .cc-select {
    width: 100%;
    padding: 6px 4px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    outline: none;
    text-align: center;
    text-align-last: center;
    background: #fff;
  }
  .cc-select-empty { color: #94a3b8; }
  .cc-select-ok    { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .cc-select-bad   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  .cc-note {
    margin-top: 14px;
    padding: 10px 14px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 12.5px;
    color: #475569;
    font-weight: 600;
  }
  .cc-chip-c, .cc-chip-nc {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 11px;
    margin: 0 2px;
  }
  .cc-chip-c  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .cc-chip-nc { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .cc-footer {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .cc-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .cc-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }

  .cc-savebar {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .cc-msg {
    font-size: 13px;
    font-weight: 700;
    color: #16a34a;
  }
  .cc-msg-err { color: #dc2626; }

  .cc-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px;
    border-radius: 10px;
    border: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all .15s ease;
  }
  .cc-btn-primary {
    background: linear-gradient(135deg, #16a34a, #22c55e);
    color: #fff;
    box-shadow: 0 4px 12px rgba(34,197,94,.3);
  }
  .cc-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(34,197,94,.4);
    transform: translateY(-1px);
  }
  .cc-btn-primary:disabled {
    opacity: .6; cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .cc-wrap { padding: 14px; }
    .cc-stats { grid-template-columns: 1fr 1fr; }
    .cc-footer { grid-template-columns: 1fr; }
    .cc-general { max-width: 180px; }
  }
`;
