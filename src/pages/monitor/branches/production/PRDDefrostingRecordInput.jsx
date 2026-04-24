// src/pages/monitor/branches/production/PRDDefrostingRecordInput.jsx
import React, { useEffect, useRef, useState } from "react";
import PRDReportHeader from "./_shared/PRDReportHeader";
import { useLang } from "./_shared/i18n";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

const TYPE = "prod_defrosting_record";
const today = () => new Date().toISOString().slice(0, 10);

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function toIsoYMD(value) {
  const s = String(value || "").trim();
  if (!s) return today();
  const normalized = /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return today();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* صف فارغ لبنائه عند الحاجة */
const EMPTY_ROW = () => ({
  rawMaterial: "",
  quantity: "",
  brand: "",
  rmProdDate: "",
  rmExpDate: "",
  defStartDate: "",
  defStartTime: "",
  startTemp: "",
  defEndDate: "",
  defEndTime: "",
  endTemp: "",
  defrostTemp: "",
  remarks: "",
});

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function PRDDefrostingRecordInput() {
  const { t, dir } = useLang();

  // ✅ قيم الترويسة ثابتة وغير قابلة للتعديل
  const ISSUE_DATE_TEXT = "05/05/2022";
  const docNo = "TELT /PROD/ DR";
  const revisionNo = "0";
  const area = "PRODUCTION";
  const issuedBy = "Suresh Sekar";
  const coveringOfficer = "Production Officer";
  const approvedBy = "Hussam O Sarhan";

  const [recordDate, setRecordDate] = useState(today()); // YYYY-MM-DD
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  // ✅ 3 أسطر افتراضيًا (بدل 16) مع إمكانية الإضافة/الحذف
  const [entries, setEntries] = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);

  // ✅ حالة التعديل: إذا يوجد تقرير سابق لنفس التاريخ نحمّله تلقائيًا
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingReport, setExistingReport]   = useState(null); // { id, savedAt }
  const [loadMsg, setLoadMsg]                 = useState("");
  const reqIdRef                               = useRef(0);

  const chRow = (i, v) => setEntries(entries.map((r, ix) => (ix === i ? v : r)));
  const addRow = () => setEntries((prev) => [...prev, EMPTY_ROW()]);
  const rmRow = (i) => setEntries(entries.filter((_, ix) => ix !== i));

  function resetToBlank() {
    setEntries([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
    setCheckedBy("");
    setVerifiedBy("");
    setExistingReport(null);
  }

  // ✅ عند تغيير التاريخ، نفحص السيرفر ونحمّل التقرير إن وُجد
  useEffect(() => {
    const iso = toIsoYMD(recordDate);
    if (!iso) return;

    // كل fetch له id فريد — الأحدث فقط يطبّق نتيجته
    const myReq = ++reqIdRef.current;

    (async () => {
      setLoadingExisting(true);
      setLoadMsg("");
      try {
        const base = String(API_BASE).replace(/\/$/, "");
        const res = await fetch(`${base}/api/reports?type=${TYPE}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data ?? [];

        // كل التقارير اللي تاريخها == iso
        const matches = arr.filter((r) => {
          const h = r?.payload?.header || {};
          const d = toIsoYMD(h.reportDate || h.issueDate || h.month || r.createdAt || "");
          return d === iso;
        });

        // إذا صار fetch أحدث، نتجاهل هذا الرد
        if (myReq !== reqIdRef.current) return;

        if (matches.length > 0) {
          matches.sort(
            (a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0)
          );
          const latest = matches[0];
          const p = latest?.payload || {};
          const loadedEntries = Array.isArray(p.entries) && p.entries.length
            ? p.entries.map((r) => ({ ...EMPTY_ROW(), ...r }))
            : [EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()];
          setEntries(loadedEntries);
          setCheckedBy(p?.signatures?.checkedBy || "");
          setVerifiedBy(p?.signatures?.verifiedBy || "");
          setExistingReport({
            id: latest?._id || latest?.id || null,
            savedAt: p?.savedAt || 0,
          });
          setLoadMsg(`📝 ${t("status_loaded_edit")}`);
        } else {
          resetToBlank();
          const newMsg = `✏️ ${t("status_new_report")}`;
          setLoadMsg(newMsg);
          setTimeout(() => {
            setLoadMsg((m) => (m === newMsg ? "" : m));
          }, 2500);
        }
      } catch (e) {
        console.warn("Failed to load existing defrosting report:", e);
        if (myReq === reqIdRef.current) {
          setLoadMsg(`⚠️ ${t("status_fail")}`);
          setTimeout(() => setLoadMsg(""), 3500);
        }
      } finally {
        // نرجع loading=false دائمًا للـ request الأحدث
        if (myReq === reqIdRef.current) {
          setLoadingExisting(false);
        }
      }
    })();
  }, [recordDate]);

  const rowHasData = (r) =>
    [
      "rawMaterial",
      "quantity",
      "brand",
      "rmProdDate",
      "rmExpDate",
      "defStartDate",
      "defStartTime",
      "startTemp",
      "defEndDate",
      "defEndTime",
      "endTemp",
      "defrostTemp",
      "remarks",
    ].some((k) => String(r[k] ?? "").trim() !== "");

  async function save() {
    const reportDate = toIsoYMD(recordDate || ISSUE_DATE_TEXT); // YYYY-MM-DD ثابت
    const cleanEntries = entries.filter(rowHasData);

    if (cleanEntries.length === 0) {
      alert("يرجى إدخال صف واحد على الأقل قبل الحفظ.");
      return;
    }

    try {
      setSaving(true);

      const header = {
        documentTitle: "Defrosting Report",
        documentNo: docNo,
        revisionNo,
        issueDate: ISSUE_DATE_TEXT, // ✅ ثابت بالنص
        area,
        issuedBy,
        coveringOfficer,
        approvedBy,
        reportDate,
      };

      const payload = {
        reportDate,
        header,
        entries: cleanEntries,
        signatures: { checkedBy, verifiedBy },
        savedAt: Date.now(),
      };

      const base = String(API_BASE).replace(/\/$/, "");

      // ✅ إذا كنا نعدّل تقرير موجود، نحذفه أولًا ثم نحفظ
      if (existingReport?.id) {
        try {
          await fetch(
            `${base}/api/reports/${encodeURIComponent(existingReport.id)}`,
            { method: "DELETE" }
          );
        } catch (e) {
          console.warn("Delete old failed, trying fallbacks…", e);
          // fallback: endpoint يعتمد على type + reportDate
          try {
            await fetch(
              `${base}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(reportDate)}`,
              { method: "DELETE" }
            );
          } catch {}
        }
      }

      const res = await fetch(`${base}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "production", type: TYPE, payload }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().catch(() => "")}`);

      // تحديث الحالة لتعكس أن التقرير الآن "موجود" تحت هذا التاريخ
      const savedJson = await res.json().catch(() => null);
      setExistingReport({
        id: savedJson?._id || savedJson?.id || existingReport?.id || null,
        savedAt: payload.savedAt,
      });
      setLoadMsg(`✅ ${existingReport?.id ? t("status_updated") : t("status_saved")}`);
      setTimeout(() => setLoadMsg(""), 2500);
    } catch (e) {
      alert("Error saving: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="df-wrap" dir={dir}>
      <style>{DEFROST_STYLES}</style>

      <PRDReportHeader
        title="Defrosting Record"
        titleAr="سجل إذابة التجميد"
        subtitle={t("df_subtitle")}
        accent="#3b82f6"
        fields={[
          { labelKey: "hdr_document_no",  value: docNo },
          { labelKey: "hdr_issue_date",   value: ISSUE_DATE_TEXT },
          { labelKey: "hdr_revision_no",  value: revisionNo },
          { labelKey: "hdr_area",         value: area },
          { labelKey: "hdr_issued_by",    value: issuedBy },
          { labelKey: "hdr_controlling",  value: coveringOfficer },
          { labelKey: "hdr_approved_by",  value: approvedBy },
          { labelKey: "hdr_report_date",  type: "date", value: recordDate, onChange: setRecordDate },
        ]}
      />

      {/* Edit-mode status + actions */}
      <div className="df-actions no-print">
        <button className="df-btn df-btn-ghost" onClick={addRow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          {t("btn_add_row")}
        </button>

        {existingReport?.id && (
          <button
            className="df-btn df-btn-ghost"
            onClick={() => {
              if (window.confirm(t("status_new_report") + "?")) {
                resetToBlank();
                setLoadMsg(t("status_new_report"));
              }
            }}
            title={t("btn_new")}
          >
            🆕 {t("btn_new")}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {loadingExisting && (
          <div className="df-status df-status-loading">
            <div className="df-mini-spinner" />
            {t("status_loading")}
          </div>
        )}
        {!loadingExisting && loadMsg && (
          <div className={`df-status ${existingReport?.id ? "df-status-edit" : "df-status-new"}`}>
            {loadMsg}
          </div>
        )}

        <button
          className="df-btn df-btn-primary"
          disabled={saving || loadingExisting}
          onClick={save}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving ? t("btn_saving") : existingReport?.id ? t("btn_update") : t("btn_save")}
        </button>
      </div>

      {/* Critical info banner */}
      <div className="df-notice">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <div>
          <strong>{t("df_critical")}:</strong> {t("df_critical_text")}
        </div>
      </div>

      {/* Table */}
      <div className="df-table-wrap">
        <div className="df-table">
          <div className="df-head">
            <div className="df-head-group df-group-material">
              <div className="df-group-title">{t("df_grp_material")}</div>
              <div className="df-sub-cols df-sub-cols-material">
                <div>{t("df_col_item")}</div>
                <div>{t("df_col_qty")}</div>
                <div>{t("df_col_brand")}</div>
                <div>{t("df_col_prod_date")}</div>
                <div>{t("df_col_exp_date")}</div>
              </div>
            </div>
            <div className="df-head-group df-group-start">
              <div className="df-group-title">{t("df_grp_start")}</div>
              <div className="df-sub-cols df-sub-cols-3">
                <div>{t("df_col_date")}</div>
                <div>{t("df_col_time")}</div>
                <div>{t("df_col_temp")}</div>
              </div>
            </div>
            <div className="df-head-group df-group-end">
              <div className="df-group-title">{t("df_grp_end")}</div>
              <div className="df-sub-cols df-sub-cols-3">
                <div>{t("df_col_date")}</div>
                <div>{t("df_col_time")}</div>
                <div>{t("df_col_temp")}</div>
              </div>
            </div>
            <div className="df-head-group df-group-rest">
              <div className="df-group-title">{t("df_grp_result")}</div>
              <div className="df-sub-cols df-sub-cols-rest">
                <div>{t("df_col_defrost_t")}</div>
                <div>{t("df_col_remarks")}</div>
                <div className="no-print">—</div>
              </div>
            </div>
          </div>

          {entries.map((row, idx) => (
            <DefrostRow
              key={idx}
              idx={idx}
              row={row}
              onChange={chRow}
              onRemove={rmRow}
              canRemove={entries.length > 1}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="df-footer">
        <div className="df-sig">
          <label>{t("sig_checked_by")}</label>
          <input
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
          />
        </div>
        <div className="df-sig">
          <label>{t("sig_verified_by")}</label>
          <input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Redesigned Row component ─── */
function DefrostRow({ idx, row, onChange, onRemove, canRemove, t }) {
  const set = (k, v) => onChange(idx, { ...row, [k]: v });
  const isTempHigh = (val) => val && parseFloat(val) > 5;
  const tt = t || ((k) => k);
  return (
    <div className="df-row">
      <div className="df-sub-cols df-sub-cols-material">
        <input className="df-in" value={row.rawMaterial || ""} onChange={(e) => set("rawMaterial", e.target.value)} placeholder={tt("df_col_item")} />
        <input className="df-in" value={row.quantity || ""} onChange={(e) => set("quantity", e.target.value)} placeholder={tt("df_col_qty")} />
        <input className="df-in" value={row.brand || ""} onChange={(e) => set("brand", e.target.value)} placeholder={tt("df_col_brand")} />
        <input className="df-in" type="date" value={row.rmProdDate || ""} onChange={(e) => set("rmProdDate", e.target.value)} />
        <input className="df-in" type="date" value={row.rmExpDate || ""} onChange={(e) => set("rmExpDate", e.target.value)} />
      </div>
      <div className="df-sub-cols df-sub-cols-3">
        <input className="df-in" type="date" value={row.defStartDate || ""} onChange={(e) => set("defStartDate", e.target.value)} />
        <input className="df-in" type="time" value={row.defStartTime || ""} onChange={(e) => set("defStartTime", e.target.value)} />
        <input className={`df-in ${isTempHigh(row.startTemp) ? "df-in-warn" : ""}`} value={row.startTemp || ""} onChange={(e) => set("startTemp", e.target.value)} placeholder="°C" />
      </div>
      <div className="df-sub-cols df-sub-cols-3">
        <input className="df-in" type="date" value={row.defEndDate || ""} onChange={(e) => set("defEndDate", e.target.value)} />
        <input className="df-in" type="time" value={row.defEndTime || ""} onChange={(e) => set("defEndTime", e.target.value)} />
        <input className={`df-in ${isTempHigh(row.endTemp) ? "df-in-warn" : ""}`} value={row.endTemp || ""} onChange={(e) => set("endTemp", e.target.value)} placeholder="°C" />
      </div>
      <div className="df-sub-cols df-sub-cols-rest">
        <input className={`df-in ${isTempHigh(row.defrostTemp) ? "df-in-warn" : ""}`} value={row.defrostTemp || ""} onChange={(e) => set("defrostTemp", e.target.value)} placeholder="°C" />
        <input className="df-in" value={row.remarks || ""} onChange={(e) => set("remarks", e.target.value)} placeholder={tt("df_col_remarks")} />
        <button
          className="df-btn-icon df-btn-danger no-print"
          title={tt("btn_remove")}
          disabled={!canRemove}
          onClick={() => onRemove(idx)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

const DEFROST_STYLES = `
  @media print { .no-print{ display:none !important; } }

  .df-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  .df-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .df-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .15s ease;
  }
  .df-btn-ghost {
    background: #fff;
    color: #334155;
    border-color: #e2e8f0;
  }
  .df-btn-ghost:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  .df-btn-primary {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: #fff;
    box-shadow: 0 4px 12px rgba(59,130,246,.3);
    padding: 11px 20px;
    font-size: 14px;
  }
  .df-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(59,130,246,.4);
    transform: translateY(-1px);
  }
  .df-btn-primary:disabled {
    opacity: .6; cursor: not-allowed;
  }

  .df-btn-icon {
    width: 32px; height: 32px;
    border: none;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 800;
    cursor: pointer;
    transition: all .15s;
  }
  .df-btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .df-btn-danger:hover:not(:disabled) { background: #fee2e2; }
  .df-btn-danger:disabled { opacity: .3; cursor: not-allowed; }

  .df-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 700;
  }
  .df-status-loading {
    background: #f1f5f9; color: #475569;
    border: 1px solid #e2e8f0;
  }
  .df-status-edit {
    background: #fef3c7; color: #92400e;
    border: 1px solid #fde68a;
  }
  .df-status-new {
    background: #e0f2fe; color: #075985;
    border: 1px solid #bae6fd;
  }
  .df-mini-spinner {
    width: 14px; height: 14px;
    border: 2px solid #cbd5e1;
    border-top-color: #475569;
    border-radius: 50%;
    animation: df-spin .8s linear infinite;
  }
  @keyframes df-spin { to { transform: rotate(360deg); } }

  .df-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    border-radius: 8px;
    color: #78350f;
    font-size: 12.5px;
    line-height: 1.55;
    margin-bottom: 14px;
  }
  .df-notice svg { flex-shrink: 0; color: #f59e0b; margin-top: 1px; }

  /* ── Table ── */
  .df-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow-x: auto;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .df-table {
    min-width: 1400px;
    display: flex;
    flex-direction: column;
  }
  .df-head {
    display: grid;
    grid-template-columns: 2.8fr 1.8fr 1.8fr 1.8fr;
    background: #0f172a;
    color: #fff;
  }
  .df-head-group {
    border-right: 1px solid rgba(255,255,255,.1);
  }
  .df-head-group:last-child { border-right: none; }
  .df-group-title {
    padding: 10px 12px;
    font-size: 11.5px;
    font-weight: 800;
    text-align: center;
    letter-spacing: .06em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255,255,255,.1);
  }
  .df-group-material { background: rgba(14,165,233,.15); }
  .df-group-start    { background: rgba(59,130,246,.15); }
  .df-group-end      { background: rgba(168,85,247,.15); }
  .df-group-rest     { background: rgba(34,197,94,.12); }

  .df-sub-cols {
    display: grid;
    padding: 2px;
    gap: 2px;
  }
  .df-sub-cols-material { grid-template-columns: 1.6fr 0.9fr 1.1fr 1.1fr 1.1fr; }
  .df-sub-cols-3        { grid-template-columns: 1.2fr 1fr 0.9fr; }
  .df-sub-cols-rest     { grid-template-columns: 1.2fr 1.4fr 44px; }

  .df-head .df-sub-cols > div {
    padding: 8px 6px;
    font-size: 10.5px;
    font-weight: 700;
    text-align: center;
    color: #e2e8f0;
    letter-spacing: .03em;
  }

  .df-row {
    display: grid;
    grid-template-columns: 2.8fr 1.8fr 1.8fr 1.8fr;
    border-bottom: 1px solid #f1f5f9;
  }
  .df-row:hover { background: #f8fafc; }
  .df-row:last-child { border-bottom: none; }
  .df-row .df-sub-cols {
    border-right: 1px solid #f1f5f9;
  }
  .df-row .df-sub-cols:last-child { border-right: none; }

  .df-in {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12.5px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .df-in:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  }
  .df-in::placeholder { color: #cbd5e1; }
  .df-in-warn {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
    font-weight: 700;
  }

  /* ── Footer signatures ── */
  .df-footer {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .df-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .df-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .df-sig input {
    width: 100%; box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .df-sig input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  }
  .df-sig input::placeholder { color: #cbd5e1; }

  @media (max-width: 900px) {
    .df-wrap { padding: 14px; }
    .df-footer { grid-template-columns: 1fr; }
  }
`;
