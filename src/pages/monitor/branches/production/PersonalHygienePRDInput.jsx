// src/pages/monitor/branches/production/PersonalHygienePRDInput.jsx
// Redesigned — unified production design + bilingual EN/AR
import React, { useState } from "react";
import PRDReportHeader from "./_shared/PRDReportHeader";
import { useLang } from "./_shared/i18n";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

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

const DEFAULT_NAMES = [
  "El Arbi Azar",
  "Mamdouh Salah Ali Rezk",
  "Imran Khan",
  "Sherif Eid Mohamed Mahmoud",
  "MOHSEN HASAN HAIDAR",
  "Mohammed Asif",
  "MOHAMED NASR MOHAMED HASSAN",
  "Bakr Bakr Shaban Mohamed Elsayed",
  "Mohammed Khalid alahmad",
  "Aallaa AlDin Mohammed Ali Almaad",
  "Mohammad Salman",
  "LEMEUIL",
];

const makeRow = (name = "") => ({
  name,
  Nails: "",
  Hair: "",
  "Not wearing Jewelry": "",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
  "Communicable Disease": "",
  "Open wounds/sores & cut": "",
  remarks: "",
});

const today = () => new Date().toISOString().slice(0, 10);

export default function PersonalHygienePRDInput() {
  const { t, dir, isAr } = useLang();
  const [date, setDate]             = useState(today());
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg]           = useState("");
  const [saving, setSaving]         = useState(false);

  const [entries, setEntries] = useState(DEFAULT_NAMES.map((n) => makeRow(n)));

  const handleChange = (rowIndex, field, value) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      return updated;
    });
  };

  const addRow = () => setEntries((p) => [...p, makeRow("")]);
  const removeRow = (idx) =>
    setEntries((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));

  const handleSave = async () => {
    if (!date) return alert("⚠️ Please select a date");
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ Checked By and Verified By are required");

    const cleaned = entries.filter(
      (e) =>
        String(e.name || "").trim() !== "" ||
        COLUMNS.some((c) => String(e[c] || "").trim() !== "") ||
        String(e.remarks || "").trim() !== ""
    );
    if (cleaned.length === 0) return alert("⚠️ أدخل اسمًا أو بيانات واحدة على الأقل.");

    try {
      setSaving(true);
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "Production",
        reportDate: date,
        entries: cleaned,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "production",
          type: "prod_personal_hygiene",
          payload,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully!");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 3500);
    }
  };

  const alignStart = isAr ? "right" : "left";

  return (
    <div className="ph-wrap" dir={dir}>
      <style>{STYLES}</style>

      <PRDReportHeader
        title="Personal Hygiene Checklist"
        titleAr="قائمة فحص النظافة الشخصية"
        subtitle={t("ph_subtitle")}
        accent="#0ea5e9"
        fields={[
          { labelKey: "hdr_document_no",  value: "FS-QM/REC/PH" },
          { labelKey: "hdr_issue_date",   value: "05/02/2020" },
          { labelKey: "hdr_revision_no",  value: "0" },
          { labelKey: "hdr_area",         value: "Production" },
          { labelKey: "hdr_issued_by",    value: "QA" },
          { labelKey: "hdr_controlling",  value: "Quality Controller" },
          { labelKey: "hdr_report_date",  type: "date", value: date, onChange: setDate },
        ]}
      />

      {/* Toolbar */}
      <div className="ph-toolbar">
        <div className="ph-toolbar-left">
          <div className="ph-legend">
            <span><b className="ph-chip-c">C</b> {t("ph_conform")}</span>
            <span><b className="ph-chip-nc">NC</b> {t("ph_nonconform")}</span>
          </div>
        </div>
        <div className="ph-toolbar-right">
          <button onClick={addRow} className="ph-btn ph-btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
            {t("btn_add_row")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="ph-table-wrap">
        <table className="ph-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>{t("ph_col_no")}</th>
              <th style={{ width: 200, textAlign: alignStart }}>{t("ph_col_name")}</th>
              {COL_KEYS.map((k, i) => (
                <th key={i} className="ph-col-compact" title={COLUMNS[i]}>{t(k)}</th>
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
                    placeholder={t("ph_req_name")}
                  />
                </td>
                {COLUMNS.map((col) => {
                  const v = entry[col];
                  return (
                    <td key={col} className="ph-cell-select">
                      <select
                        value={v}
                        onChange={(e) => handleChange(i, col, e.target.value)}
                        className={`ph-select ph-select-${v === "C" ? "ok" : v === "NC" ? "bad" : "empty"}`}
                      >
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
                    placeholder={COLUMNS.some((c) => entry[c] === "NC") ? t("ph_req_nc") : t("ph_optional")}
                  />
                </td>
                <td className="no-print">
                  <button
                    onClick={() => removeRow(i)}
                    className="ph-btn-icon ph-btn-danger"
                    title={t("btn_remove")}
                    disabled={entries.length === 1}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer signatures */}
      <div className="ph-footer">
        <div className="ph-sig">
          <label>{t("sig_checked_by")} <span className="ph-req">*</span></label>
          <input
            type="text"
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
            className="ph-input"
          />
        </div>
        <div className="ph-sig">
          <label>{t("sig_verified_by")} <span className="ph-req">*</span></label>
          <input
            type="text"
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
            className="ph-input"
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="ph-savebar">
        {opMsg && <div className="ph-msg">{opMsg}</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ph-btn ph-btn-primary ph-btn-lg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving ? t("btn_saving") : t("btn_save")}
        </button>
      </div>
    </div>
  );
}

const STYLES = `
  .ph-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  .ph-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }
  .ph-legend {
    display: inline-flex; gap: 16px;
    font-size: 12px; font-weight: 600; color: #64748b;
  }
  .ph-legend b {
    display: inline-block;
    min-width: 22px; text-align: center;
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 11px; font-weight: 800;
    margin-right: 4px;
  }
  .ph-chip-c  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .ph-chip-nc { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .ph-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px;
    font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer; border: 1px solid transparent;
    transition: all .15s ease;
  }
  .ph-btn-ghost {
    background: #fff; color: #334155;
    border-color: #e2e8f0;
  }
  .ph-btn-ghost:hover {
    background: #f1f5f9; border-color: #cbd5e1;
  }
  .ph-btn-primary {
    background: linear-gradient(135deg, #0f766e, #14b8a6);
    color: #fff;
    box-shadow: 0 4px 12px rgba(15,118,110,.25);
  }
  .ph-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(15,118,110,.35);
    transform: translateY(-1px);
  }
  .ph-btn-primary:disabled {
    opacity: .6; cursor: not-allowed;
  }
  .ph-btn-lg { padding: 11px 22px; font-size: 14px; }

  .ph-btn-icon {
    width: 28px; height: 28px;
    border-radius: 6px;
    border: none;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
    cursor: pointer;
    transition: all .15s;
  }
  .ph-btn-danger {
    background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
  }
  .ph-btn-danger:hover:not(:disabled) { background: #fee2e2; }
  .ph-btn-danger:disabled { opacity: .3; cursor: not-allowed; }

  .ph-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .ph-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .ph-table thead th {
    background: #0f172a;
    color: #fff;
    padding: 12px 10px;
    font-weight: 700;
    font-size: 11.5px;
    letter-spacing: .03em;
    text-align: center;
    border-right: 1px solid rgba(255,255,255,.08);
  }
  .ph-table thead th:last-child { border-right: none; }
  .ph-col-compact { min-width: 90px; }
  .ph-table tbody td {
    padding: 6px 8px;
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .ph-table tbody tr:nth-child(even) { background: #fafbfc; }
  .ph-table tbody tr:hover { background: #eff6ff; }
  .ph-num {
    text-align: center;
    color: #94a3b8;
    font-weight: 700;
    font-size: 12px;
  }

  .ph-input {
    width: 100%; box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .ph-input:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,.12);
  }
  .ph-input::placeholder { color: #cbd5e1; }

  .ph-cell-select { text-align: center; padding: 4px !important; }
  .ph-select {
    width: 100%;
    padding: 7px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    outline: none;
    text-align: center;
    text-align-last: center;
    transition: all .15s;
  }
  .ph-select-empty { background: #fff; color: #94a3b8; }
  .ph-select-ok    { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .ph-select-bad   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  .ph-footer {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ph-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .ph-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .ph-req { color: #dc2626; }

  .ph-savebar {
    margin-top: 18px;
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
  .ph-msg {
    font-size: 13px;
    font-weight: 700;
    color: #0f766e;
  }

  @media (max-width: 900px) {
    .ph-wrap { padding: 14px; }
    .ph-footer { grid-template-columns: 1fr; }
    .ph-table thead th { font-size: 10.5px; padding: 8px 4px; }
    .ph-select, .ph-input { font-size: 12px; padding: 6px 8px; }
  }
`;
