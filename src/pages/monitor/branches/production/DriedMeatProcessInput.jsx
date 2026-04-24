// src/pages/monitor/branches/production/DriedMeatProcessInput.jsx
// Dried Meat Process Record — Curing, Drying & Packaging (HACCP)
// Supports multi-day drying log, auto-load on date change, critical limits visualization

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

const TYPE   = "prod_dried_meat";
const BRANCH = "PRODUCTION";

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};

function emptyDryingRow() {
  return {
    elapsedHrs: "",
    date: "", time: "",
    temperature: "", humidity: "",
    position: "", // top / middle / bottom
    weight: "",
    notes: "",
  };
}

function defaultState() {
  return {
    // Batch
    batchId: "",
    productType: "",
    productName: "",
    rawMeatType: "",
    rawSource: "",
    rawLotNo: "",
    rawProdDate: "",
    rawExpDate: "",
    initialWeight: "",
    receivedDate: "",
    startDate: today(),
    expectedEndDate: "",

    // Curing
    saltPct: "",
    nitritePpm: "",
    curingTemp: "",
    curingHours: "",
    curingStart: "",
    curingEnd: "",
    spices: "",
    curingNotes: "",

    // Dehydrator Setup (single vertical hanging machine)
    batchCapacity:  "",
    hangingPieces:  "",
    hangingLevels:  "",
    targetTemp:     "",
    targetHumidity: "",
    fanSpeed:       "",
    programMode:    "",
    cycleHours:     "",

    // Drying log
    dryingLog: Array.from({ length: 3 }, () => emptyDryingRow()),

    // Post-drying & cooling
    coolingTime:    "",
    coolingTemp:    "",
    rotationCount:  "",
    rotationNote:   "",

    // Final params
    waterActivity: "",
    ph: "",
    finalMoisture: "",
    saltContent: "",
    finalWeight: "",
    yieldPct: "",

    // Sensory (C / NC)
    senColor: "",
    senTexture: "",
    senOdor: "",
    senAppearance: "",

    // Packaging
    packagingType: "",
    storageTemp: "",
    bestBefore: "",
    outputCount: "",

    // Signatures
    checkedBy: "",
    verifiedBy: "",
    approvedBy: "",
  };
}

export default function DriedMeatProcessInput() {
  const { t, dir, isAr } = useLang();

  // Header metadata (fixed)
  const ISSUE_DATE = "05/05/2022";
  const DOC_NO     = "TELT /PROD/DMP";
  const REV_NO     = "0";
  const AREA       = "PRODUCTION";
  const ISSUED_BY  = "MOHAMAD ABDULLAH";
  const CONTROLLER = "Production Officer";
  const APPROVED   = "Hussam O.Sarhan";

  const [reportDate, setReportDate] = useState(today());
  const [form, setForm]             = useState(defaultState());
  const [saving, setSaving]         = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingReport, setExistingReport]   = useState(null);
  const [loadMsg, setLoadMsg]       = useState("");
  const reqIdRef = useRef(0);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const updateDryingRow = (idx, k, v) =>
    setForm((p) => {
      const next = [...p.dryingLog];
      next[idx] = { ...next[idx], [k]: v };
      return { ...p, dryingLog: next };
    });
  const addDryingRow    = () => setForm((p) => ({ ...p, dryingLog: [...p.dryingLog, emptyDryingRow()] }));
  const removeDryingRow = (idx) =>
    setForm((p) => ({ ...p, dryingLog: p.dryingLog.length <= 1 ? p.dryingLog : p.dryingLog.filter((_, i) => i !== idx) }));

  function resetToBlank() {
    setForm(defaultState());
    setExistingReport(null);
  }

  /* ── Computed metrics ── */
  const metrics = useMemo(() => {
    const initial = parseFloat(form.initialWeight);
    const final   = parseFloat(form.finalWeight);
    const aw      = parseFloat(form.waterActivity);
    const ph      = parseFloat(form.ph);

    let loss = "", yieldPct = "";
    if (!Number.isNaN(initial) && !Number.isNaN(final) && initial > 0) {
      loss     = (((initial - final) / initial) * 100).toFixed(1);
      yieldPct = ((final / initial) * 100).toFixed(1);
    }

    const awStatus = Number.isNaN(aw) ? "empty" : aw <= 0.85 ? "ok" : "bad";
    const phStatus = Number.isNaN(ph) ? "empty" : ph <= 5.2  ? "ok" : "bad";

    return { loss, yieldPct, awStatus, phStatus };
  }, [form.initialWeight, form.finalWeight, form.waterActivity, form.ph]);

  // Auto-fill yield when we can compute it
  useEffect(() => {
    if (metrics.yieldPct && form.yieldPct !== metrics.yieldPct) {
      setForm((p) => ({ ...p, yieldPct: metrics.yieldPct }));
    }
  }, [metrics.yieldPct]); // eslint-disable-line

  /* ── Auto-load existing report on date change ── */
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

          setForm({
            ...defaultState(),
            ...(p.form || {}),
            dryingLog: Array.isArray(p.form?.dryingLog) && p.form.dryingLog.length
              ? p.form.dryingLog.map((r) => ({ ...emptyDryingRow(), ...r }))
              : Array.from({ length: 3 }, () => emptyDryingRow()),
          });

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
        console.warn("Failed to load existing dried-meat report:", e);
        if (myReq === reqIdRef.current) {
          setLoadMsg(`⚠️ ${t("status_fail")}`);
          setTimeout(() => setLoadMsg(""), 3500);
        }
      } finally {
        if (myReq === reqIdRef.current) setLoadingExisting(false);
      }
    })();
  }, [reportDate]); // eslint-disable-line

  /* ── Save ── */
  async function save() {
    if (!reportDate) return alert(isAr ? "الرجاء تحديد التاريخ" : "Please select a date");
    setSaving(true);
    try {
      const payload = {
        branch: BRANCH,
        reportDate,
        header: {
          documentTitle: "Dried Meat Process Record",
          documentNo: DOC_NO,
          issueDate: ISSUE_DATE,
          revisionNo: REV_NO,
          area: AREA,
          issuedBy: ISSUED_BY,
          controllingOfficer: CONTROLLER,
          approvedBy: APPROVED,
        },
        form,
        metrics: {
          weightLossPct: metrics.loss,
          yieldPct: metrics.yieldPct,
          awPass: metrics.awStatus === "ok",
          phPass: metrics.phStatus === "ok",
        },
        savedAt: Date.now(),
      };

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
    <div className="dm-wrap" dir={dir}>
      <style>{STYLES}</style>

      <PRDReportHeader
        title="Dried Meat Process Record"
        titleAr="سجل تصنيع اللحم المجفف"
        subtitle={t("dm_subtitle")}
        accent="#b45309"
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

      {/* Status + save bar */}
      <div className="dm-actions no-print">
        {existingReport?.id && (
          <button
            className="dm-btn dm-btn-ghost"
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
          <div className="dm-status dm-status-loading">
            <div className="dm-mini-spinner" />
            {t("status_loading")}
          </div>
        )}
        {!loadingExisting && loadMsg && (
          <div className={`dm-status ${existingReport?.id ? "dm-status-edit" : "dm-status-new"}`}>
            {loadMsg}
          </div>
        )}
        <button
          className="dm-btn dm-btn-primary"
          disabled={saving || loadingExisting}
          onClick={save}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {saving ? t("btn_saving") : existingReport?.id ? t("btn_update") : t("btn_save")}
        </button>
      </div>

      {/* ════ BATCH INFORMATION ════ */}
      <Section title={t("dm_batch_section")} icon="📦" accent="#0ea5e9">
        <div className="dm-grid-3">
          <Field label={t("dm_batch_id")} value={form.batchId} onChange={(v) => set("batchId", v)} placeholder="B-20251023-001" required />
          <Field label={t("dm_product_type")} value={form.productType} onChange={(v) => set("productType", v)} placeholder="Basturma / Jerky / Qadid" />
          <Field label={t("dm_product_name")} value={form.productName} onChange={(v) => set("productName", v)} placeholder="—" />
          <Field label={t("dm_raw_type")} value={form.rawMeatType} onChange={(v) => set("rawMeatType", v)} placeholder="Beef / Lamb / Camel" />
          <Field label={t("dm_raw_source")} value={form.rawSource} onChange={(v) => set("rawSource", v)} placeholder="Supplier name" />
          <Field label={t("dm_raw_lot")} value={form.rawLotNo} onChange={(v) => set("rawLotNo", v)} placeholder="Lot / SIF No" />
          <Field
            label={t("dm_raw_prod_date")}
            type="date"
            value={form.rawProdDate}
            onChange={(v) => set("rawProdDate", v)}
          />
          <Field
            label={t("dm_raw_exp_date")}
            type="date"
            value={form.rawExpDate}
            onChange={(v) => set("rawExpDate", v)}
            warn={(() => {
              // Warn if expired, or if prod > exp, or if exp is within 7 days
              if (!form.rawExpDate) return false;
              const exp = new Date(form.rawExpDate);
              const nowD = new Date();
              if (form.rawProdDate) {
                const prod = new Date(form.rawProdDate);
                if (prod > exp) return true; // prod after exp
              }
              const diffDays = (exp - nowD) / (1000 * 60 * 60 * 24);
              return diffDays < 7; // expired or near-expired
            })()}
          />
          <Field label={t("dm_initial_weight")} type="number" step="0.01" value={form.initialWeight} onChange={(v) => set("initialWeight", v)} placeholder="0.00" />
          <Field label={t("dm_received_date")} type="date" value={form.receivedDate} onChange={(v) => set("receivedDate", v)} />
          <Field label={t("dm_start_date")} type="date" value={form.startDate} onChange={(v) => set("startDate", v)} />
          <Field label={t("dm_expected_end")} type="date" value={form.expectedEndDate} onChange={(v) => set("expectedEndDate", v)} />
        </div>
      </Section>

      {/* ════ CURING STAGE ════ */}
      <Section title={t("dm_curing_section")} icon="🧂" accent="#8b5cf6" ccp>
        <div className="dm-grid-3">
          <Field label={t("dm_salt_pct")}   type="number" step="0.1" value={form.saltPct}     onChange={(v) => set("saltPct", v)}     placeholder="%" />
          <Field label={t("dm_nitrite_ppm")} type="number" step="0.1" value={form.nitritePpm}  onChange={(v) => set("nitritePpm", v)}  placeholder="ppm" />
          <Field label={t("dm_curing_temp")}  type="number" step="0.1" value={form.curingTemp}  onChange={(v) => set("curingTemp", v)}
            warn={form.curingTemp && parseFloat(form.curingTemp) > 5} placeholder="°C" />
          <Field label={t("dm_curing_hours")}type="number" step="1"   value={form.curingHours} onChange={(v) => set("curingHours", v)} placeholder="hours" />
          <Field label={t("dm_curing_start")}type="datetime-local"     value={form.curingStart} onChange={(v) => set("curingStart", v)} />
          <Field label={t("dm_curing_end")}  type="datetime-local"     value={form.curingEnd}   onChange={(v) => set("curingEnd", v)} />
        </div>
        <div className="dm-grid-2">
          <Field label={t("dm_spices")}       value={form.spices}      onChange={(v) => set("spices", v)}      placeholder="Paprika, Garlic, Fenugreek…" />
          <Field label={t("dm_curing_notes")} value={form.curingNotes} onChange={(v) => set("curingNotes", v)} placeholder="…" />
        </div>
      </Section>

      {/* ════ DEHYDRATOR SETUP (single vertical hanging) ════ */}
      <Section title={t("dm_machine_section")} icon="🏭" accent="#f97316">
        <div className="dm-grid-3">
          <Field label={t("dm_batch_capacity")}  type="number" step="0.1" value={form.batchCapacity}  onChange={(v) => set("batchCapacity", v)}  placeholder="kg" />
          <Field label={t("dm_hanging_pieces")}  type="number" step="1"   value={form.hangingPieces}  onChange={(v) => set("hangingPieces", v)}  placeholder="count" />
          <Field label={t("dm_hanging_levels")}  type="number" step="1"   value={form.hangingLevels}  onChange={(v) => set("hangingLevels", v)}  placeholder="rows" />
          <Field label={t("dm_target_temp")}     type="number" step="0.1" value={form.targetTemp}     onChange={(v) => set("targetTemp", v)}     placeholder="°C" />
          <Field label={t("dm_target_humidity")} type="number" step="0.1" value={form.targetHumidity} onChange={(v) => set("targetHumidity", v)} placeholder="%" />
          <div className="dm-field">
            <label>{t("dm_fan_speed")}</label>
            <select
              value={form.fanSpeed}
              onChange={(e) => set("fanSpeed", e.target.value)}
              className="dm-input"
            >
              <option value="">—</option>
              <option value="low">{t("dm_fan_low")}</option>
              <option value="medium">{t("dm_fan_medium")}</option>
              <option value="high">{t("dm_fan_high")}</option>
            </select>
          </div>
          <Field label={t("dm_program_mode")}   value={form.programMode} onChange={(v) => set("programMode", v)} placeholder="—" />
          <Field label={t("dm_cycle_hours")}    type="number" step="0.5" value={form.cycleHours}  onChange={(v) => set("cycleHours", v)}  placeholder="hrs" />
        </div>
      </Section>

      {/* ════ DRYING LOG ════ */}
      <Section title={t("dm_drying_section")} icon="🌬️" accent="#ef4444" ccp>
        <div className="dm-drying-toolbar">
          <button className="dm-btn dm-btn-ghost dm-btn-sm" onClick={addDryingRow}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
            {t("dm_add_drying")}
          </button>
          <div className="dm-drying-legend">
            {form.dryingLog.length} {isAr ? "قراءة" : "readings"}
          </div>
        </div>
        <div className="dm-drying-wrap">
          <table className="dm-drying">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 80 }}>{t("dm_elapsed_time")}</th>
                <th>{t("dm_drying_date")}</th>
                <th>{t("dm_drying_time")}</th>
                <th>{t("dm_temp")}</th>
                <th>{t("dm_humidity")}</th>
                <th>{t("dm_position")}</th>
                <th>{t("dm_current_weight")}</th>
                <th>{t("dm_reading_notes")}</th>
                <th style={{ width: 40 }} className="no-print" />
              </tr>
            </thead>
            <tbody>
              {form.dryingLog.map((r, i) => {
                const initial = parseFloat(form.initialWeight);
                const w = parseFloat(r.weight);
                const rowLoss = !Number.isNaN(initial) && !Number.isNaN(w) && initial > 0
                  ? (((initial - w) / initial) * 100).toFixed(1)
                  : "";
                const target = parseFloat(form.targetTemp);
                const curTemp = parseFloat(r.temperature);
                const tempWarn = !Number.isNaN(target) && !Number.isNaN(curTemp) && Math.abs(curTemp - target) > 5;
                return (
                  <tr key={i}>
                    <td className="dm-row-no">{i + 1}</td>
                    <td><input type="number" step="0.5" value={r.elapsedHrs} onChange={(e) => updateDryingRow(i, "elapsedHrs", e.target.value)} className="dm-input dm-input-sm" placeholder="0h" /></td>
                    <td><input type="date" value={r.date} onChange={(e) => updateDryingRow(i, "date", e.target.value)} className="dm-input dm-input-sm" /></td>
                    <td><input type="time" value={r.time} onChange={(e) => updateDryingRow(i, "time", e.target.value)} className="dm-input dm-input-sm" /></td>
                    <td>
                      <input
                        type="number" step="0.1"
                        value={r.temperature}
                        onChange={(e) => updateDryingRow(i, "temperature", e.target.value)}
                        className={`dm-input dm-input-sm ${tempWarn ? "dm-input-warn" : ""}`}
                        placeholder="°C"
                        title={tempWarn ? `Differs from target (${target}°C) by > 5°C` : ""}
                      />
                    </td>
                    <td><input type="number" step="0.1" value={r.humidity} onChange={(e) => updateDryingRow(i, "humidity", e.target.value)} className="dm-input dm-input-sm" placeholder="%" /></td>
                    <td>
                      <select
                        value={r.position}
                        onChange={(e) => updateDryingRow(i, "position", e.target.value)}
                        className="dm-input dm-input-sm"
                      >
                        <option value="">—</option>
                        <option value="top">{t("dm_pos_top")}</option>
                        <option value="middle">{t("dm_pos_middle")}</option>
                        <option value="bottom">{t("dm_pos_bottom")}</option>
                      </select>
                    </td>
                    <td>
                      <div className="dm-weight-cell">
                        <input type="number" step="0.01" value={r.weight} onChange={(e) => updateDryingRow(i, "weight", e.target.value)} className="dm-input dm-input-sm" placeholder="kg" />
                        {rowLoss !== "" && <span className="dm-loss-chip">−{rowLoss}%</span>}
                      </div>
                    </td>
                    <td><input type="text" value={r.notes} onChange={(e) => updateDryingRow(i, "notes", e.target.value)} className="dm-input dm-input-sm" placeholder="…" /></td>
                    <td className="no-print">
                      <button className="dm-btn-icon dm-btn-danger" onClick={() => removeDryingRow(i)} disabled={form.dryingLog.length === 1}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ════ POST-DRYING & COOLING ════ */}
      <Section title={t("dm_post_section")} icon="🧊" accent="#0ea5e9">
        <div className="dm-grid-4">
          <Field label={t("dm_cooling_time")}   type="number" step="1"   value={form.coolingTime}   onChange={(v) => set("coolingTime", v)}   placeholder="min" />
          <Field label={t("dm_cooling_temp")}   type="number" step="0.1" value={form.coolingTemp}   onChange={(v) => set("coolingTemp", v)}   placeholder="°C" />
          <Field label={t("dm_rotation_count")} type="number" step="1"   value={form.rotationCount} onChange={(v) => set("rotationCount", v)} placeholder="0" />
          <Field label={t("dm_rotation_note")}  value={form.rotationNote} onChange={(v) => set("rotationNote", v)} placeholder="…" />
        </div>
      </Section>

      {/* ════ FINAL PARAMETERS — CRITICAL LIMITS ════ */}
      <Section title={t("dm_final_section")} icon="🧪" accent="#dc2626" ccp>
        <div className="dm-critical-cards">
          {/* Water Activity — most critical */}
          <div className={`dm-crit-card dm-crit-${metrics.awStatus}`}>
            <div className="dm-crit-title">💧 {t("dm_aw")}</div>
            <input
              type="number" step="0.001" value={form.waterActivity}
              onChange={(e) => set("waterActivity", e.target.value)}
              className="dm-crit-input"
              placeholder="0.000"
            />
            <div className="dm-crit-status">
              {metrics.awStatus === "ok"  && <>✅ {isAr ? "مطابق" : "Pass"}</>}
              {metrics.awStatus === "bad" && <>⚠️ {isAr ? "خارج الحد" : "Out of limit"}</>}
              {metrics.awStatus === "empty" && <>— {isAr ? "لم يُدخل" : "Not set"}</>}
            </div>
          </div>

          <div className={`dm-crit-card dm-crit-${metrics.phStatus}`}>
            <div className="dm-crit-title">⚗️ {t("dm_ph")}</div>
            <input
              type="number" step="0.01" value={form.ph}
              onChange={(e) => set("ph", e.target.value)}
              className="dm-crit-input"
              placeholder="0.00"
            />
            <div className="dm-crit-status">
              {metrics.phStatus === "ok"  && <>✅ {isAr ? "مطابق" : "Pass"}</>}
              {metrics.phStatus === "bad" && <>⚠️ {isAr ? "خارج الحد" : "Out of limit"}</>}
              {metrics.phStatus === "empty" && <>— {isAr ? "لم يُدخل" : "Not set"}</>}
            </div>
          </div>
        </div>

        <div className="dm-grid-3">
          <Field label={t("dm_final_moisture")} type="number" step="0.1" value={form.finalMoisture} onChange={(v) => set("finalMoisture", v)} placeholder="%" />
          <Field label={t("dm_salt_content")}   type="number" step="0.1" value={form.saltContent}   onChange={(v) => set("saltContent", v)}   placeholder="%" />
          <Field label={t("dm_final_weight")}   type="number" step="0.01" value={form.finalWeight} onChange={(v) => set("finalWeight", v)} placeholder="kg" />
        </div>

        {/* Derived metrics */}
        <div className="dm-metrics">
          <div className="dm-metric">
            <div className="dm-metric-label">{t("dm_weight_loss")}</div>
            <div className="dm-metric-value">{metrics.loss ? `${metrics.loss}%` : "—"}</div>
            {metrics.loss && (
              <div className="dm-progress">
                <div className="dm-progress-fill" style={{ width: `${Math.min(parseFloat(metrics.loss), 100)}%` }} />
              </div>
            )}
          </div>
          <div className="dm-metric">
            <div className="dm-metric-label">{t("dm_yield")}</div>
            <div className="dm-metric-value">{metrics.yieldPct ? `${metrics.yieldPct}%` : "—"}</div>
          </div>
        </div>
      </Section>

      {/* ════ SENSORY EVALUATION ════ */}
      <Section title={t("dm_sensory_section")} icon="👃" accent="#06b6d4">
        <div className="dm-sensory-grid">
          <SensoryField label={t("dm_color")}      value={form.senColor}      onChange={(v) => set("senColor", v)} />
          <SensoryField label={t("dm_texture")}    value={form.senTexture}    onChange={(v) => set("senTexture", v)} />
          <SensoryField label={t("dm_odor")}       value={form.senOdor}       onChange={(v) => set("senOdor", v)} />
          <SensoryField label={t("dm_appearance")} value={form.senAppearance} onChange={(v) => set("senAppearance", v)} />
        </div>
      </Section>

      {/* ════ PACKAGING ════ */}
      <Section title={t("dm_pkg_section")} icon="📦" accent="#16a34a">
        <div className="dm-grid-4">
          <div className="dm-field">
            <label>{t("dm_pkg_type")}</label>
            <select
              value={form.packagingType}
              onChange={(e) => set("packagingType", e.target.value)}
              className="dm-input"
            >
              <option value="">—</option>
              <option value="vacuum">{t("dm_pkg_vacuum")}</option>
              <option value="map">{t("dm_pkg_map")}</option>
              <option value="regular">{t("dm_pkg_regular")}</option>
            </select>
          </div>
          <Field label={t("dm_storage_temp")} type="number" step="0.1" value={form.storageTemp} onChange={(v) => set("storageTemp", v)} placeholder="°C" />
          <Field label={t("dm_best_before")}  type="date" value={form.bestBefore}  onChange={(v) => set("bestBefore", v)} />
          <Field label={t("dm_output_count")} type="number" step="1" value={form.outputCount} onChange={(v) => set("outputCount", v)} placeholder="0" />
        </div>
      </Section>

      {/* ════ SIGNATURES ════ */}
      <div className="dm-footer">
        <div className="dm-sig">
          <label>{t("dm_checked")}</label>
          <input value={form.checkedBy} onChange={(e) => set("checkedBy", e.target.value)} className="dm-input" placeholder={t("sig_name_sig")} />
        </div>
        <div className="dm-sig">
          <label>{t("dm_verified")}</label>
          <input value={form.verifiedBy} onChange={(e) => set("verifiedBy", e.target.value)} className="dm-input" placeholder={t("sig_name_sig")} />
        </div>
        <div className="dm-sig">
          <label>{t("dm_approved")}</label>
          <input value={form.approvedBy} onChange={(e) => set("approvedBy", e.target.value)} className="dm-input" placeholder={t("sig_name_sig")} />
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function Section({ title, icon, accent, ccp, children }) {
  return (
    <section className="dm-section" style={{ "--accent": accent }}>
      <header className="dm-section-header">
        <span className="dm-section-icon" style={{ background: `${accent}20`, color: accent }}>{icon}</span>
        <span className="dm-section-title">{title}</span>
        {ccp && <span className="dm-ccp-badge">CCP</span>}
      </header>
      <div className="dm-section-body">
        {children}
      </div>
    </section>
  );
}

function Field({ label, type = "text", step, value, onChange, placeholder, warn, required }) {
  return (
    <div className="dm-field">
      <label>
        {label}
        {required && <span className="dm-req">*</span>}
      </label>
      <input
        type={type}
        step={step}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`dm-input ${warn ? "dm-input-warn" : ""}`}
      />
    </div>
  );
}

function SensoryField({ label, value, onChange }) {
  return (
    <div className="dm-sensory-row">
      <span className="dm-sensory-label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`dm-select dm-select-${value === "C" ? "ok" : value === "NC" ? "bad" : "empty"}`}
      >
        <option value="">—</option>
        <option value="C">C</option>
        <option value="NC">NC</option>
      </select>
    </div>
  );
}

/* ─── Styles ─── */
const STYLES = `
  @media print { .no-print { display: none !important; } }

  .dm-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  /* Actions bar */
  .dm-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .dm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px; font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .15s ease;
  }
  .dm-btn-sm { padding: 6px 10px; font-size: 12px; }
  .dm-btn-ghost {
    background: #fff; color: #334155;
    border-color: #e2e8f0;
  }
  .dm-btn-ghost:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
  .dm-btn-primary {
    background: linear-gradient(135deg, #b45309, #d97706);
    color: #fff;
    box-shadow: 0 4px 12px rgba(180,83,9,.3);
    padding: 11px 20px;
    font-size: 14px;
  }
  .dm-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(180,83,9,.4);
    transform: translateY(-1px);
  }
  .dm-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
  .dm-btn-icon {
    width: 26px; height: 26px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 5px;
    font-size: 16px; font-weight: 800;
    cursor: pointer;
  }
  .dm-btn-icon:disabled { opacity: .3; cursor: not-allowed; }

  .dm-status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 12.5px; font-weight: 700;
  }
  .dm-status-loading { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .dm-status-edit    { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .dm-status-new     { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
  .dm-mini-spinner {
    width: 14px; height: 14px;
    border: 2px solid #cbd5e1;
    border-top-color: #475569;
    border-radius: 50%;
    animation: dm-spin .8s linear infinite;
  }
  @keyframes dm-spin { to { transform: rotate(360deg); } }

  /* Section */
  .dm-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--accent);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    margin-bottom: 14px;
  }
  .dm-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .dm-section-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .dm-section-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: .02em;
  }
  .dm-ccp-badge {
    margin-left: auto;
    background: #fee2e2;
    color: #991b1b;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .06em;
    border: 1px solid #fecaca;
  }

  /* Field */
  .dm-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dm-field label {
    font-size: 10.5px;
    font-weight: 800;
    color: #64748b;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .dm-req { color: #dc2626; margin-left: 3px; }
  .dm-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .dm-input:focus {
    border-color: var(--accent, #b45309);
    box-shadow: 0 0 0 3px rgba(180,83,9,.1);
  }
  .dm-input::placeholder { color: #cbd5e1; }
  .dm-input-sm { padding: 6px 8px; font-size: 12px; }
  .dm-input-warn {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
    font-weight: 700;
  }

  /* Grids */
  .dm-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px; }
  .dm-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .dm-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  /* Drying log */
  .dm-drying-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .dm-drying-legend {
    font-size: 11px;
    color: #64748b;
    font-weight: 700;
  }
  .dm-drying-wrap {
    background: #fafbfc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow-x: auto;
  }
  .dm-drying {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 900px;
  }
  .dm-drying thead th {
    background: #0f172a;
    color: #fff;
    padding: 8px 6px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    text-align: center;
  }
  .dm-drying tbody td {
    padding: 4px 5px;
    border-bottom: 1px solid #f1f5f9;
  }
  .dm-drying tbody tr:last-child td { border-bottom: none; }
  .dm-row-no {
    text-align: center;
    font-weight: 800;
    color: #94a3b8;
  }
  .dm-weight-cell {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dm-loss-chip {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: 800;
    white-space: nowrap;
  }

  /* Critical limit cards */
  .dm-critical-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .dm-crit-card {
    border-radius: 12px;
    padding: 16px 18px;
    border: 2px solid;
    background: #fff;
    transition: all .2s;
  }
  .dm-crit-card.dm-crit-empty { border-color: #e2e8f0; background: #f8fafc; }
  .dm-crit-card.dm-crit-ok    { border-color: #bbf7d0; background: #f0fdf4; }
  .dm-crit-card.dm-crit-bad   { border-color: #fecaca; background: #fef2f2; box-shadow: 0 0 0 3px rgba(220,38,38,.08); }
  .dm-crit-title {
    font-size: 12px;
    font-weight: 800;
    color: #334155;
    margin-bottom: 10px;
    letter-spacing: .03em;
  }
  .dm-crit-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    background: #fff;
    outline: none;
    text-align: center;
    letter-spacing: .02em;
  }
  .dm-crit-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(180,83,9,.12);
  }
  .dm-crit-status {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    color: #64748b;
  }
  .dm-crit-ok .dm-crit-status    { color: #16a34a; }
  .dm-crit-bad .dm-crit-status   { color: #dc2626; }

  /* Metrics */
  .dm-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
  }
  .dm-metric {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
  }
  .dm-metric-label {
    font-size: 10.5px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .dm-metric-value {
    margin-top: 4px;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }
  .dm-progress {
    margin-top: 8px;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
  }
  .dm-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #b45309, #d97706);
    transition: width .3s ease;
  }

  /* Sensory */
  .dm-sensory-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .dm-sensory-row {
    display: grid;
    grid-template-columns: 1fr 80px;
    gap: 8px;
    align-items: center;
    padding: 7px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
  }
  .dm-sensory-label {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
  }
  .dm-select {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    outline: none;
    text-align: center;
    text-align-last: center;
    background: #fff;
  }
  .dm-select-empty { color: #94a3b8; }
  .dm-select-ok    { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .dm-select-bad   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  /* Footer */
  .dm-footer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .dm-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .dm-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }

  @media (max-width: 900px) {
    .dm-wrap { padding: 14px; }
    .dm-grid-2, .dm-grid-3, .dm-grid-4 { grid-template-columns: 1fr; }
    .dm-critical-cards { grid-template-columns: 1fr; }
    .dm-metrics { grid-template-columns: 1fr; }
    .dm-footer { grid-template-columns: 1fr; }
    .dm-sensory-grid { grid-template-columns: 1fr; }
  }
`;
