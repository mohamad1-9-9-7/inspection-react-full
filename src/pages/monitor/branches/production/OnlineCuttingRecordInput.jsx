// src/pages/monitor/branches/production/OnlineCuttingRecordInput.jsx
// On-Line Cutting Record (Marinated/Non-Marinated Product — Retail Branches)
// Supports up to 4 product blocks per report + 5-sample log per product + 9 quality parameters

import React, { useEffect, useMemo, useRef, useState } from "react";
import PRDReportHeader from "./_shared/PRDReportHeader";
import { useLang } from "./_shared/i18n";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "prod_online_cutting";
const BRANCH = "PRODUCTION";

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};

/* ─── Templates ─── */
const QUALITY_KEYS = [
  { key: "shape",       labelKey: "oc_q_shape" },
  { key: "color",       labelKey: "oc_q_color" },
  { key: "fat",         labelKey: "oc_q_fat" },
  { key: "bloodSpot",   labelKey: "oc_q_blood" },
  { key: "whitePatches",labelKey: "oc_q_white" },
  { key: "badOdor",     labelKey: "oc_q_odor" },
  { key: "foreign",     labelKey: "oc_q_foreign" },
  { key: "cartilage",   labelKey: "oc_q_cartilage" },
  { key: "overall",     labelKey: "oc_q_overall" },
];

const DEFAULT_PRODUCT_NAMES = [
  "Caliberated Chicken White Shish Tawook",
  "Caliberated Chicken Red Shish Tawook",
  "Caliberated Lamb Tikka",
];

function emptySample() {
  return { sampleNo: "", time: "", pdtTemp: "" };
}
function emptyQuality() {
  const q = {};
  QUALITY_KEYS.forEach((p) => { q[p.key] = ""; });
  return q;
}
function emptyProduct(name = "", cuttingSpec = "", marinatedSpec = "") {
  return {
    productName: name,
    customerName: "Al Mawashi Retail Branches",
    brand: "",
    prodDate: "",
    expDate: "",
    batchNo: "",
    pdtTemp: "",
    // Two weight groups, each with spec + 4 measurements
    cuttingWeightSpec: cuttingSpec,
    cuttingWeights:    ["", "", "", ""],
    marinatedWeightSpec: marinatedSpec,
    marinatedWeights:    ["", "", "", ""],
    samples: Array.from({ length: 5 }, () => emptySample()),
    quality: emptyQuality(),
  };
}

export default function OnlineCuttingRecordInput() {
  const { t, dir, isAr } = useLang();

  // Header metadata (fixed)
  const ISSUE_DATE = "05/05/2022";
  const DOC_NO     = "TELT /QA/CCB/1";
  const REV_NO     = "0";
  const AREA       = "QA";
  const ISSUED_BY  = "MOHAMAD ABDULLAH";
  const CONTROLLER = "QC Assistant";
  const APPROVED   = "Hussam O.Sarhan — Director";

  // Report state
  const [reportDate, setReportDate]   = useState(today());
  const [batchCode, setBatchCode]     = useState("");
  const [products, setProducts]       = useState(() => [
    emptyProduct(DEFAULT_PRODUCT_NAMES[0], "20-25 g", "28-33 g"),
    emptyProduct(DEFAULT_PRODUCT_NAMES[1], "20-25 g", "28-33 g"),
    emptyProduct(DEFAULT_PRODUCT_NAMES[2], "15-18 g", ""),
  ]);
  const [remarks, setRemarks]         = useState("");
  const [recordedBy, setRecordedBy]   = useState("");
  const [verifiedBy, setVerifiedBy]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingReport, setExistingReport]   = useState(null);
  const [loadMsg, setLoadMsg]         = useState("");
  const reqIdRef = useRef(0);

  function resetToBlank() {
    setProducts([
      emptyProduct(DEFAULT_PRODUCT_NAMES[0], "20-25 g", "28-33 g"),
      emptyProduct(DEFAULT_PRODUCT_NAMES[1], "20-25 g", "28-33 g"),
      emptyProduct(DEFAULT_PRODUCT_NAMES[2], "15-18 g", ""),
    ]);
    setBatchCode("");
    setRemarks("");
    setRecordedBy("");
    setVerifiedBy("");
    setExistingReport(null);
  }

  // Auto-load existing report when date changes
  useEffect(() => {
    if (!reportDate) return;
    const myReq = ++reqIdRef.current;

    (async () => {
      setLoadingExisting(true);
      setLoadMsg("");
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data ?? [];

        const matches = arr.filter((r) => r?.payload?.reportDate === reportDate);
        if (myReq !== reqIdRef.current) return;

        if (matches.length > 0) {
          matches.sort((a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0));
          const latest = matches[0];
          const p = latest?.payload || {};

          setBatchCode(p.batchCode || "");
          setRemarks(p.remarks || "");
          setRecordedBy(p.recordedBy || "");
          setVerifiedBy(p.verifiedBy || "");

          const loadedProducts = Array.isArray(p.products) && p.products.length
            ? p.products.map((prod) => ({
                ...emptyProduct(),
                ...prod,
                samples: Array.isArray(prod.samples) && prod.samples.length
                  ? prod.samples.map((s) => ({ ...emptySample(), ...s }))
                  : Array.from({ length: 5 }, () => emptySample()),
                quality: { ...emptyQuality(), ...(prod.quality || {}) },
                // Legacy support: migrate old `pieceWeight` → cuttingWeightSpec
                cuttingWeightSpec: prod.cuttingWeightSpec ?? prod.pieceWeight ?? "",
                cuttingWeights:    Array.isArray(prod.cuttingWeights)   && prod.cuttingWeights.length   ? prod.cuttingWeights.concat(["", "", "", ""]).slice(0, 4)   : ["", "", "", ""],
                marinatedWeightSpec: prod.marinatedWeightSpec ?? "",
                marinatedWeights:    Array.isArray(prod.marinatedWeights) && prod.marinatedWeights.length ? prod.marinatedWeights.concat(["", "", "", ""]).slice(0, 4) : ["", "", "", ""],
              }))
            : [emptyProduct(DEFAULT_PRODUCT_NAMES[0], "20-25 g", "28-33 g")];
          setProducts(loadedProducts);

          setExistingReport({
            id: latest?._id || latest?.id || null,
            savedAt: p?.savedAt || 0,
          });
          setLoadMsg(`📝 ${t("status_loaded_edit")}`);
        } else {
          resetToBlank();
          const newMsg = `✏️ ${t("status_new_report")}`;
          setLoadMsg(newMsg);
          setTimeout(() => setLoadMsg((m) => (m === newMsg ? "" : m)), 2500);
        }
      } catch (e) {
        console.warn("Failed to load existing cutting report:", e);
        if (myReq === reqIdRef.current) {
          setLoadMsg(`⚠️ ${t("status_fail")}`);
          setTimeout(() => setLoadMsg(""), 3500);
        }
      } finally {
        if (myReq === reqIdRef.current) setLoadingExisting(false);
      }
    })();
  }, [reportDate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Product handlers ─── */
  const updateProduct = (idx, patch) =>
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const updateSample = (pIdx, sIdx, key, val) =>
    setProducts((prev) => {
      const next = [...prev];
      const samples = [...next[pIdx].samples];
      samples[sIdx] = { ...samples[sIdx], [key]: val };
      next[pIdx] = { ...next[pIdx], samples };
      return next;
    });

  const updateQuality = (pIdx, key, val) =>
    setProducts((prev) => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], quality: { ...next[pIdx].quality, [key]: val } };
      return next;
    });

  const addProduct = () => {
    if (products.length >= 4) {
      alert(isAr ? "الحد الأقصى 4 منتجات لكل تقرير" : "Maximum 4 products per report");
      return;
    }
    setProducts((prev) => [...prev, emptyProduct()]);
  };

  const removeProduct = (idx) => {
    if (products.length === 1) return;
    if (!window.confirm(isAr ? "إزالة هذا المنتج؟" : "Remove this product?")) return;
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ─── Save ─── */
  async function save() {
    if (!reportDate) return alert(isAr ? "الرجاء تحديد التاريخ" : "Please select a date");

    setSaving(true);
    try {
      const payload = {
        branch: BRANCH,
        reportDate,
        batchCode,
        header: {
          documentTitle: "On-Line Cutting Record",
          documentNo: DOC_NO,
          issueDate: ISSUE_DATE,
          revisionNo: REV_NO,
          area: AREA,
          issuedBy: ISSUED_BY,
          controllingOfficer: CONTROLLER,
          approvedBy: APPROVED,
        },
        products,
        remarks,
        recordedBy,
        verifiedBy,
        savedAt: Date.now(),
      };

      // If existing report, delete first
      if (existingReport?.id) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existingReport.id)}`, { method: "DELETE" });
        } catch (e) { console.warn("Delete old failed:", e); }
      }

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "production", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const saved = await res.json().catch(() => null);
      setExistingReport({
        id: saved?._id || saved?.id || existingReport?.id || null,
        savedAt: payload.savedAt,
      });
      setLoadMsg(`✅ ${existingReport?.id ? t("status_updated") : t("status_saved")}`);
      setTimeout(() => setLoadMsg(""), 2500);
    } catch (e) {
      console.error(e);
      alert((isAr ? "فشل الحفظ: " : "Failed to save: ") + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="oc-wrap" dir={dir}>
      <style>{STYLES}</style>

      <PRDReportHeader
        title="On-Line Cutting Record"
        titleAr="سجل التقطيع المباشر"
        subtitle={t("oc_subtitle")}
        accent="#e11d48"
        fields={[
          { labelKey: "hdr_document_no",  value: DOC_NO },
          { labelKey: "hdr_issue_date",   value: ISSUE_DATE },
          { labelKey: "hdr_revision_no",  value: REV_NO },
          { labelKey: "hdr_area",         value: AREA },
          { labelKey: "hdr_issued_by",    value: ISSUED_BY },
          { labelKey: "hdr_controlling",  value: CONTROLLER },
          { labelKey: "hdr_approved_by",  value: APPROVED },
          { labelKey: "hdr_report_date",  type: "date", value: reportDate, onChange: setReportDate },
        ]}
      />

      {/* Top info bar */}
      <div className="oc-topinfo">
        <div className="oc-topinfo-cell oc-topinfo-wide">
          <label>{t("oc_customer")}</label>
          <div className="oc-topinfo-fixed">Al Mawashi Retail Branches</div>
        </div>
        <div className="oc-topinfo-cell">
          <label>{t("oc_batch_code")}</label>
          <input
            type="text"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            placeholder="—"
            className="oc-input"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="oc-actions no-print">
        <button className="oc-btn oc-btn-ghost" onClick={addProduct} disabled={products.length >= 4}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          {t("oc_add_product")} ({products.length}/4)
        </button>

        {existingReport?.id && (
          <button
            className="oc-btn oc-btn-ghost"
            onClick={() => {
              if (window.confirm(isAr ? "بدء تقرير جديد لهذا التاريخ؟" : "Start a new report for this date?")) {
                resetToBlank();
                setLoadMsg(`✏️ ${t("status_new_report")}`);
              }
            }}
          >
            🆕 {t("btn_new")}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {loadingExisting && (
          <div className="oc-status oc-status-loading">
            <div className="oc-mini-spinner" />
            {t("status_loading")}
          </div>
        )}
        {!loadingExisting && loadMsg && (
          <div className={`oc-status ${existingReport?.id ? "oc-status-edit" : "oc-status-new"}`}>
            {loadMsg}
          </div>
        )}

        <button
          className="oc-btn oc-btn-primary"
          disabled={saving || loadingExisting}
          onClick={save}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saving ? t("btn_saving") : existingReport?.id ? t("btn_update") : t("btn_save")}
        </button>
      </div>

      {/* Products grid */}
      <div className="oc-products">
        {products.map((prod, pIdx) => (
          <ProductCard
            key={pIdx}
            idx={pIdx}
            product={prod}
            t={t}
            onUpdate={(patch) => updateProduct(pIdx, patch)}
            onUpdateSample={(sIdx, key, val) => updateSample(pIdx, sIdx, key, val)}
            onUpdateQuality={(key, val) => updateQuality(pIdx, key, val)}
            onRemove={() => removeProduct(pIdx)}
            canRemove={products.length > 1}
          />
        ))}
      </div>

      {/* Remarks */}
      <div className="oc-remarks">
        <label>{t("oc_remarks")}</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="…"
          rows={3}
          className="oc-textarea"
        />
      </div>

      {/* Footer signatures */}
      <div className="oc-footer">
        <div className="oc-sig">
          <label>{t("oc_recorded_by")}</label>
          <input
            type="text"
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
            className="oc-input"
          />
        </div>
        <div className="oc-sig">
          <label>{t("oc_verified_by")}</label>
          <input
            type="text"
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder={t("sig_name_sig")}
            className="oc-input"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Product Card Component ─── */
function ProductCard({ idx, product, t, onUpdate, onUpdateSample, onUpdateQuality, onRemove, canRemove }) {
  const ACCENTS = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7"];
  const accent = ACCENTS[idx % ACCENTS.length];

  return (
    <div className="oc-product-card" style={{ "--accent": accent }}>
      {/* Header */}
      <div className="oc-product-header">
        <div className="oc-product-badge" style={{ background: accent }}>
          {t("oc_product")} {idx + 1}
        </div>
        {canRemove && (
          <button
            className="oc-product-remove no-print"
            onClick={onRemove}
            title={t("oc_remove_product")}
          >
            ×
          </button>
        )}
      </div>

      {/* Product Name */}
      <div className="oc-field">
        <label>{t("oc_product_name")}</label>
        <input
          type="text"
          value={product.productName}
          onChange={(e) => onUpdate({ productName: e.target.value })}
          className="oc-input"
          placeholder="—"
        />
      </div>

      {/* Piece Weights — two groups: Cutting + Marinated */}
      <WeightGroup
        t={t}
        titleKey="oc_cutting_weight"
        spec={product.cuttingWeightSpec}
        weights={product.cuttingWeights}
        onSpecChange={(v) => onUpdate({ cuttingWeightSpec: v })}
        onWeightChange={(i, v) => {
          const next = [...product.cuttingWeights];
          next[i] = v;
          onUpdate({ cuttingWeights: next });
        }}
      />
      <WeightGroup
        t={t}
        titleKey="oc_marinated_weight"
        spec={product.marinatedWeightSpec}
        weights={product.marinatedWeights}
        onSpecChange={(v) => onUpdate({ marinatedWeightSpec: v })}
        onWeightChange={(i, v) => {
          const next = [...product.marinatedWeights];
          next[i] = v;
          onUpdate({ marinatedWeights: next });
        }}
      />

      {/* R/M Details */}
      <div className="oc-section-title">{t("oc_rm_details")}</div>
      <div className="oc-grid-2">
        <div className="oc-field">
          <label>{t("oc_brand")}</label>
          <input
            type="text"
            value={product.brand}
            onChange={(e) => onUpdate({ brand: e.target.value })}
            className="oc-input"
          />
        </div>
        <div className="oc-field">
          <label>{t("oc_batch_no")}</label>
          <input
            type="text"
            value={product.batchNo}
            onChange={(e) => onUpdate({ batchNo: e.target.value })}
            className="oc-input"
          />
        </div>
        <div className="oc-field">
          <label>{t("oc_prod_date")}</label>
          <input
            type="date"
            value={product.prodDate}
            onChange={(e) => onUpdate({ prodDate: e.target.value })}
            className="oc-input"
          />
        </div>
        <div className="oc-field">
          <label>{t("oc_exp_date")}</label>
          <input
            type="date"
            value={product.expDate}
            onChange={(e) => onUpdate({ expDate: e.target.value })}
            className="oc-input"
          />
        </div>
        <div className="oc-field oc-field-span2">
          <label>{t("oc_pdt_temp")}</label>
          <input
            type="number"
            step="0.1"
            value={product.pdtTemp}
            onChange={(e) => onUpdate({ pdtTemp: e.target.value })}
            className={`oc-input ${product.pdtTemp && parseFloat(product.pdtTemp) >= 10 ? "oc-input-warn" : ""}`}
            placeholder="°C"
          />
        </div>
      </div>

      {/* Samples */}
      <div className="oc-section-title">{t("oc_samples")}</div>
      <div className="oc-samples-wrap">
        <table className="oc-samples">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th>{t("oc_pdt_temp")}</th>
            </tr>
          </thead>
          <tbody>
            {product.samples.map((s, sIdx) => (
              <tr key={sIdx}>
                <td className="oc-sample-no">{sIdx + 1}</td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    value={s.pdtTemp}
                    onChange={(e) => onUpdateSample(sIdx, "pdtTemp", e.target.value)}
                    className={`oc-input oc-input-sm ${s.pdtTemp && parseFloat(s.pdtTemp) >= 10 ? "oc-input-warn" : ""}`}
                    placeholder="°C"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quality */}
      <div className="oc-section-title">{t("oc_quality")}</div>
      <div className="oc-quality">
        {QUALITY_KEYS.map((q) => {
          const val = product.quality[q.key] || "";
          return (
            <div key={q.key} className="oc-quality-row">
              <span className="oc-quality-label">{t(q.labelKey)}</span>
              <select
                value={val}
                onChange={(e) => onUpdateQuality(q.key, e.target.value)}
                className={`oc-select oc-select-${val === "C" ? "ok" : val === "NC" ? "bad" : "empty"}`}
              >
                <option value="">—</option>
                <option value="C">C</option>
                <option value="NC">NC</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Weight Group Component ─── */
function WeightGroup({ t, titleKey, spec, weights, onSpecChange, onWeightChange }) {
  return (
    <div className="oc-weight-group">
      <div className="oc-weight-group-header">
        <span className="oc-weight-group-title">{t(titleKey)}</span>
        <div className="oc-weight-spec">
          <label className="oc-weight-spec-label">{t("oc_weight_spec")}:</label>
          <input
            type="text"
            value={spec || ""}
            onChange={(e) => onSpecChange(e.target.value)}
            className="oc-input oc-input-sm"
            placeholder="e.g. 20-25 g"
          />
        </div>
      </div>
      <div className="oc-weight-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="oc-weight-cell">
            <label>#{i + 1}</label>
            <input
              type="number"
              step="0.1"
              value={weights?.[i] || ""}
              onChange={(e) => onWeightChange(i, e.target.value)}
              className="oc-input oc-input-sm"
              placeholder="g"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const STYLES = `
  @media print { .no-print { display: none !important; } }

  .oc-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  /* Top info */
  .oc-topinfo {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .oc-topinfo-cell {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .oc-topinfo-cell label {
    font-size: 10px; font-weight: 800;
    color: #e11d48;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .oc-topinfo-fixed {
    font-size: 14px; font-weight: 700;
    color: #0f172a;
    padding: 4px 0;
  }

  /* Actions bar */
  .oc-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .oc-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px; font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .15s ease;
  }
  .oc-btn-ghost {
    background: #fff; color: #334155;
    border-color: #e2e8f0;
  }
  .oc-btn-ghost:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  .oc-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .oc-btn-primary {
    background: linear-gradient(135deg, #e11d48, #f43f5e);
    color: #fff;
    box-shadow: 0 4px 12px rgba(225,29,72,.3);
    padding: 11px 20px;
    font-size: 14px;
  }
  .oc-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(225,29,72,.4);
    transform: translateY(-1px);
  }
  .oc-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  .oc-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 12.5px; font-weight: 700;
  }
  .oc-status-loading { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .oc-status-edit    { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .oc-status-new     { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
  .oc-mini-spinner {
    width: 14px; height: 14px;
    border: 2px solid #cbd5e1;
    border-top-color: #475569;
    border-radius: 50%;
    animation: oc-spin .8s linear infinite;
  }
  @keyframes oc-spin { to { transform: rotate(360deg); } }

  /* Products grid */
  .oc-products {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 14px;
    margin-bottom: 14px;
  }
  .oc-product-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--accent, #e11d48);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }

  .oc-product-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .oc-product-badge {
    color: #fff;
    font-size: 11px; font-weight: 800;
    padding: 4px 10px;
    border-radius: 999px;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .oc-product-remove {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626;
    font-size: 18px; font-weight: 800;
    cursor: pointer;
    line-height: 1;
  }
  .oc-product-remove:hover { background: #fee2e2; }

  .oc-field {
    display: flex; flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }
  .oc-field label {
    font-size: 10.5px; font-weight: 800;
    color: #64748b;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .oc-field-span2 { grid-column: 1 / -1; }

  .oc-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .oc-input {
    width: 100%;
    box-sizing: border-box;
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
  .oc-input:focus {
    border-color: var(--accent, #e11d48);
    box-shadow: 0 0 0 3px rgba(225,29,72,.12);
  }
  .oc-input::placeholder { color: #cbd5e1; }
  .oc-input-sm { padding: 5px 8px; font-size: 12px; }
  .oc-input-warn {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
    font-weight: 700;
  }

  .oc-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    resize: vertical;
    min-height: 70px;
  }
  .oc-textarea:focus {
    border-color: #e11d48;
    box-shadow: 0 0 0 3px rgba(225,29,72,.12);
  }

  /* Weight groups */
  .oc-weight-group {
    background: #fafbfc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--accent, #e11d48);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }
  .oc-weight-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
  .oc-weight-group-title {
    font-size: 12px;
    font-weight: 800;
    color: var(--accent, #e11d48);
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .oc-weight-spec {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .oc-weight-spec-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .04em;
    white-space: nowrap;
  }
  .oc-weight-spec .oc-input {
    max-width: 120px;
  }
  .oc-weight-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .oc-weight-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .oc-weight-cell label {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-align: center;
  }

  /* Section titles inside product card */
  .oc-section-title {
    font-size: 11px; font-weight: 800;
    color: var(--accent, #e11d48);
    margin: 12px 0 8px;
    padding-bottom: 5px;
    border-bottom: 2px solid #f1f5f9;
    letter-spacing: .05em;
    text-transform: uppercase;
  }

  /* Samples table */
  .oc-samples-wrap {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .oc-samples {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .oc-samples thead th {
    background: #0f172a;
    color: #fff;
    padding: 6px 8px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    text-align: center;
  }
  .oc-samples tbody td {
    padding: 4px 6px;
    border-bottom: 1px solid #f1f5f9;
  }
  .oc-samples tbody tr:last-child td { border-bottom: none; }
  .oc-sample-no {
    text-align: center;
    font-weight: 800;
    color: #94a3b8;
  }

  /* Quality assessment */
  .oc-quality {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .oc-quality-row {
    display: grid;
    grid-template-columns: 1fr 80px;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .oc-quality-label {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
  }
  .oc-select {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-family: inherit;
    font-size: 12px; font-weight: 700;
    cursor: pointer;
    outline: none;
    text-align: center;
    text-align-last: center;
    background: #fff;
  }
  .oc-select-empty { color: #94a3b8; }
  .oc-select-ok    { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .oc-select-bad   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  /* Remarks */
  .oc-remarks {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }
  .oc-remarks label {
    display: block;
    font-size: 11px; font-weight: 800;
    color: #e11d48;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }

  /* Footer signatures */
  .oc-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .oc-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .oc-sig label {
    display: block;
    font-size: 11px; font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }

  @media (max-width: 900px) {
    .oc-wrap { padding: 14px; }
    .oc-topinfo { grid-template-columns: 1fr; }
    .oc-footer { grid-template-columns: 1fr; }
    .oc-grid-2 { grid-template-columns: 1fr; }
  }
`;
