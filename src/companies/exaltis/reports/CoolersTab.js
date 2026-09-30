// src/companies/exaltis/reports/CoolersTab.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getLatestReport } from "../../../pages/monitor/branches/_shared/reportApi";
import CoolerSetupPanel from "./CoolerSetupPanel";
import { accentOf, emojiOf, fetchCoolerConfig, inRange, loadDefsCache, makeDefaultCoolerDefs, defaultLoadingDef, normalizeLoadingDef, productLimitFor, rangeLabel, rangeOf, saveCoolerConfig, storageOptions } from "./coolerDefs";
import { canEdit, getCurrentUser } from "../../../utils/perms";
import { notifyOutOfRange } from "../../../utils/notifications";
import { Bi, bi } from "./bilingual";
import API_BASE from "../../../config/api";
import { todayDubaiISO, MIN_MATCHES, countValidMatches, draftKey, loadDraft, IS_SAME_ORIGIN, COOLERS_TYPE, TIMES, DEFAULT_MATCH_TIME, defaultTMPHeader, makeDefaultCoolers, makeDefaultLoadingArea, makeProductVerificationRow, makeDefaultProductVerifications, calcCoolersKPI, formatDMYSmart, fetchExistingByDate, clearTemps } from "./coolers/coolersModel";
import { TMPEntryHeader, tempInputStyle } from "./coolers/TMPEntryHeader";
import { remarksInputStyle, btnSave, sectionSubLabel, statusChip, rangeBadge } from "./coolers/coolersStyles";
import { MatchPanel } from "./coolers/MatchPanel";

/* ================================================================== */
/*                          CoolersTab Component                       */
/* ================================================================== */
export default function CoolersTab(props) {
  const {
    coolers,
    setCoolers,
    tmpHeader,
    setTmpHeader,
    kpi,
    logoUrl,
  } = props || {};

  const [date, setDate] = useState(() => {
    const d = loadDraft();
    return d.date || todayDubaiISO();
  });

  /* Manager verification name (signature line) */
  const [verifiedByManager, setVerifiedByManager] = useState(() => loadDraft().verifiedByManager || "");

  const useExternalCoolers = Array.isArray(coolers) && typeof setCoolers === "function";
  const useExternalHeader = tmpHeader && typeof setTmpHeader === "function";

  const [localCoolers, setLocalCoolers] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.localCoolers) && d.localCoolers.length ? d.localCoolers : makeDefaultCoolers();
  });
  const [localHeader, setLocalHeader] = useState(defaultTMPHeader);

  const [loadingArea, setLoadingArea] = useState(() => {
    const d = loadDraft();
    return d.loadingArea && typeof d.loadingArea === "object" ? d.loadingArea : makeDefaultLoadingArea();
  });
  const [productVerifications, setProductVerifications] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.productVerifications) && d.productVerifications.length
      ? d.productVerifications
      : makeDefaultProductVerifications();
  });

  /* ---- Storage-unit setup (name · type · limits) ----
     Served from the localStorage cache for the first paint so the sheet never
     flashes the wrong limits, then replaced by the server copy. */
  const [defs, setDefs] = useState(
    () => loadDefsCache() || { coolerDefs: makeDefaultCoolerDefs(), loadingDef: defaultLoadingDef() }
  );
  const { coolerDefs, loadingDef } = defs;
  const [setupOpen, setSetupOpen] = useState(null); // "cooler-3" | "loading-area" | null
  const [savingSetup, setSavingSetup] = useState(false);
  const canEditSetup = canEdit("daily");

  /* Set the moment the user applies a manual setup change, so a slower
     initial config GET that resolves afterward can't overwrite it with the
     pre-edit config it fetched before the edit happened. */
  const userEditedDefsRef = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const cfg = await fetchCoolerConfig(ctrl.signal);
      if (cfg && !userEditedDefsRef.current) setDefs(cfg);
    })();
    return () => ctrl.abort();
  }, []);

  /** Applies one edited definition and writes the whole setup back. */
  async function applySetup(target, def) {
    const nextCoolers =
      target === "loading-area"
        ? coolerDefs
        : coolerDefs.map((d, i) => (i === Number(String(target).split("-")[1]) ? def : d));
    const nextLoading = target === "loading-area" ? normalizeLoadingDef(def) : loadingDef;

    userEditedDefsRef.current = true;
    setDefs({ coolerDefs: nextCoolers, loadingDef: nextLoading });
    setSavingSetup(true);
    try {
      await saveCoolerConfig(nextCoolers, nextLoading, getCurrentUser()?.username || "");
      setSetupOpen(null);
    } catch (e) {
      alert(`❌ The limits were applied here but could not be saved for next time · طُبّقت الحدود هنا لكن تعذّر حفظها: ${e.message || e}`);
    } finally {
      setSavingSetup(false);
    }
  }

  const dataCoolers = useExternalCoolers ? coolers : localCoolers;
  const updateCoolers = useExternalCoolers ? setCoolers : setLocalCoolers;

  const header = useExternalHeader ? tmpHeader : localHeader;

  const storageOpts = useMemo(
    () => storageOptions(coolerDefs, loadingDef),
    [coolerDefs, loadingDef]
  );
  const optionForKey = (key) => storageOpts.find((x) => x.key === key);

  const computedKpi = useMemo(() => calcCoolersKPI(dataCoolers, coolerDefs), [dataCoolers, coolerDefs]);
  const safeKPI = kpi || computedKpi || { avg: "—", min: "—", max: "—", outOfRange: 0 };

  /* Auto-save draft to localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({
          date,
          verifiedByManager,
          localCoolers: useExternalCoolers ? dataCoolers : localCoolers,
          loadingArea,
          productVerifications,
          ts: Date.now(),
        })
      );
    } catch {}
  }, [date, verifiedByManager, localCoolers, loadingArea, productVerifications, dataCoolers, useExternalCoolers]);

  const handleCoolerChange = (index, time, value) => {
    updateCoolers((prev) => {
      const next = [...(prev || [])];
      const curr = next[index] || { temps: {}, remarks: "" };
      next[index] = { ...curr, temps: { ...curr.temps, [time]: value } };
      return next;
    });
  };
  /* The one producer behind Settings → Notifications → «تنبيه عند درجة حرارة
     خارج المجال». Fires on blur, not on every keystroke: typing "-18" passes
     through "-" and "-1" first, and both of those are out of a freezer band.
     notifyOutOfRange() is itself a no-op unless the admin turned the toggle on. */
  const alertOutOfRange = (def, raw) => {
    const n = Number(raw);
    if (raw === "" || raw === null || !Number.isFinite(n)) return;
    if (inRange(def, n)) return;
    const { min, max } = rangeOf(def);
    notifyOutOfRange({ location: def?.label || "Storage unit", value: n, min, max });
  };

  const handleCoolerRemarksChange = (index, value) => {
    updateCoolers((prev) => {
      const next = [...(prev || [])];
      const curr = next[index] || { temps: {}, remarks: "" };
      next[index] = { ...curr, remarks: value };
      return next;
    });
  };

  const handleLoadingChange = (time, value) => {
    setLoadingArea((prev) => ({
      ...prev,
      temps: { ...(prev?.temps || {}), [time]: value },
    }));
  };
  const handleLoadingRemarksChange = (value) => {
    setLoadingArea((prev) => ({ ...prev, remarks: value }));
  };

  /* ---- Product matching (now grouped per storage area) ---- */
  const getRoomTempForVerification = (row) => {
    const opt = optionForKey(row.storageKey);
    if (!opt) return "";
    if (opt.key === "loading-area") return loadingArea?.temps?.[row.time] ?? "";
    return dataCoolers?.[opt.coolerIndex]?.temps?.[row.time] ?? "";
  };

  const getProductVerificationStatus = (row) => {
    const opt = optionForKey(row.storageKey);
    const n = Number(row.productTemp);
    if (!opt || row.productTemp === "" || Number.isNaN(n)) {
      return { text: "Pending", color: "#475569", bg: "#f1f5f9", limit: opt ? productLimitFor(opt.def).label : "" };
    }
    const limit = productLimitFor(opt.def);
    return limit.pass(n)
      ? { text: "PASS", color: "#065f46", bg: "#dcfce7", limit: limit.label }
      : { text: "FAIL", color: "#991b1b", bg: "#fee2e2", limit: limit.label };
  };

  /* Group verifications by storage area, keeping each row's global index */
  const verificationsByStorage = useMemo(() => {
    const map = {};
    (productVerifications || []).forEach((row, idx) => {
      const key = row.storageKey || "cooler-0";
      (map[key] = map[key] || []).push({ row, idx });
    });
    return map;
  }, [productVerifications]);

  /* Matching KPI (pass / fail / pending) */
  const productKpi = useMemo(() => {
    let pass = 0, fail = 0, pending = 0;
    (productVerifications || []).forEach((row) => {
      const opt = optionForKey(row.storageKey);
      const n = Number(row.productTemp);
      if (!opt || row.productTemp === "" || Number.isNaN(n)) { pending += 1; return; }
      if (productLimitFor(opt.def).pass(n)) pass += 1; else fail += 1;
    });
    return { pass, fail, pending, total: pass + fail + pending };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productVerifications, storageOpts]);

  const updateProductVerification = (index, key, value) => {
    setProductVerifications((prev) => {
      const next = [...(prev || [])];
      next[index] = { ...makeProductVerificationRow(), ...(next[index] || {}), [key]: value };
      return next;
    });
  };

  const addProductVerificationFor = (storageKey) => {
    setProductVerifications((prev) => [
      ...(prev || []),
      makeProductVerificationRow({ storageKey, time: DEFAULT_MATCH_TIME }),
    ]);
  };

  const removeProductVerification = (index) => {
    setProductVerifications((prev) => (prev || []).filter((_, i) => i !== index));
  };

  /* Per-section live status (in-range summary) */
  const sectionStatus = (temps, isInRange) => {
    let filled = 0, out = 0;
    TIMES.forEach((t) => {
      const v = temps?.[t];
      const n = Number(v);
      if (v !== "" && v != null && !Number.isNaN(n)) { filled += 1; if (!isInRange(n)) out += 1; }
    });
    if (!filled) return { text: "No data", color: "#475569", bg: "#f1f5f9" };
    if (out) return { text: `${out} out of range`, color: "#991b1b", bg: "#fee2e2" };
    return { text: "All in range", color: "#065f46", bg: "#dcfce7" };
  };

  const [saving, setSaving] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);

  /* Restores the SHAPE of the last record — which products were verified, in
     which storage area, plus the header and the verifying manager — and clears
     the date and every temperature reading. Readings are measurements of
     today's cold chain and must never be carried over from another day. */
  async function loadFromLast() {
    try {
      setLoadingLast(true);
      const hit = await getLatestReport(COOLERS_TYPE);
      if (!hit) {
        alert("ℹ️ No previous Coolers report found. · لا يوجد تقرير برادات سابق.");
        return;
      }
      const p = hit.payload || {};

      const prevCoolers = Array.isArray(p.coolers) ? p.coolers : [];
      updateCoolers(
        makeDefaultCoolers().map((c, i) => (prevCoolers[i] ? clearTemps(prevCoolers[i]) : c))
      );
      setLoadingArea(p.loadingArea ? clearTemps(p.loadingArea) : makeDefaultLoadingArea());

      const prevChecks = Array.isArray(p.productVerifications) ? p.productVerifications : [];
      setProductVerifications(
        prevChecks.length
          ? prevChecks.map((r) =>
              makeProductVerificationRow({
                time: r?.time,
                storageKey: r?.storageKey,
                itemCode: r?.itemCode,
                productName: r?.productName,
                country: r?.country,
                productTemp: "", // measured today, never copied
                remarks: "",
              })
            )
          : makeDefaultProductVerifications()
      );

      if (p.headers?.tmpHeader && !useExternalHeader) {
        setLocalHeader({ ...defaultTMPHeader, ...p.headers.tmpHeader });
      }
      if (p.verifiedByManager) setVerifiedByManager(p.verifiedByManager);

      setDate("");
      alert(
        `✅ Loaded the layout from ${hit.reportDate}. Temperatures were left blank — pick today's date and record the readings. · تم تحميل التخطيط وتُركت الحرارة فارغة — اختر تاريخ اليوم وسجّل القراءات.`
      );
    } catch (e) {
      alert(`❌ Could not load the last report · تعذّر تحميل آخر تقرير: ${e.message || e}`);
    } finally {
      setLoadingLast(false);
    }
  }

  async function saveCoolersToServer() {
    const matchCount = countValidMatches(productVerifications);
    if (matchCount < MIN_MATCHES) {
      alert(`⚠️ At least ${MIN_MATCHES} product matches (product + temperature) are required before saving. You currently have ${matchCount}. · مطلوب ${MIN_MATCHES} مطابقات منتج على الأقل قبل الحفظ، والموجود حالياً ${matchCount}.`);
      return;
    }
    try {
      setSaving(true);
      if (!date) {
        alert("⚠️ Pick a report date first. · اختر تاريخ التقرير أولاً.");
        return;
      }
      const existing = await fetchExistingByDate(date);

      const payload = {
        reportDate: date,
        coolers: dataCoolers,
        loadingArea,
        productVerifications,
        headers: { tmpHeader: header },
        verifiedByManager,
        /* The limits these readings were judged against, frozen into the
           record. Retuning a unit tomorrow must not re-score today's sheet. */
        coolerDefs,
        loadingDef,
      };

      const body = { reporter: "sweets", type: COOLERS_TYPE, payload };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update coolers report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create coolers report");
      }

      try { localStorage.removeItem(draftKey()); } catch {}
      alert(`✅ Coolers saved for ${date}. · تم حفظ البرادات.`);
    } catch (e) {
      alert(`❌ Failed to save · فشل الحفظ: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  /* ---- Styles ---- */
  

  const accentFor = (i) => accentOf(coolerDefs[i]);

  /* The ⚙️ that opens the setup panel for one unit. */
  const setupBtn = (key, accent) => (
    <button
      type="button"
      onClick={() => setSetupOpen((cur) => (cur === key ? null : key))}
      title={bi("Change this unit's name, type and temperature limits", "تغيير اسم الوحدة ونوعها وحدود الحرارة")}
      style={{
        padding: "5px 11px",
        borderRadius: 999,
        border: `1px solid ${setupOpen === key ? accent : "#cbd5e1"}`,
        background: setupOpen === key ? `${accent}14` : "#fff",
        color: setupOpen === key ? accent : "#475569",
        fontWeight: 800,
        fontSize: ".78rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ⚙️ <Bi en="Limits & type" ar="الحدود والنوع" />
    </button>
  );

  /* ---- Inline product-match panel (scoped to one storage area) ---- */
  const renderMatchPanel = (storageKey, accent) => {
    const list = verificationsByStorage[storageKey] || [];
    return (
      <MatchPanel accent={accent} list={list} addProductVerificationFor={addProductVerificationFor} storageKey={storageKey} getProductVerificationStatus={getProductVerificationStatus} getRoomTempForVerification={getRoomTempForVerification} updateProductVerification={updateProductVerification} removeProductVerification={removeProductVerification} />
    );
  };

  /* ---- Temperature time-grid (shared by coolers & loading area) ---- */
  const renderTempGrid = (temps, onChange, styleFn, color, onBlurCheck) => (
    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      {TIMES.map((time) => (
        <label
          key={time}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.92rem", color, minWidth: 78 }}
        >
          <span style={{ marginBottom: 7, fontWeight: 600 }}>{time}</span>
          <input
            type="number"
            value={temps?.[time] ?? ""}
            onChange={(e) => onChange(time, e.target.value)}
            onBlur={(e) => onBlurCheck && onBlurCheck(e.target.value)}
            style={styleFn(temps?.[time] ?? "")}
            placeholder="°C"
            min="-50"
            max="50"
            step="0.1"
          />
        </label>
      ))}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <TMPEntryHeader
        header={header}
        logoUrl={logoUrl}
        reportDate={formatDMYSmart(date)}
        dateValue={date}
        onDateChange={(e) => setDate(e.target.value)}
      />

      {/* KPI */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#7c3aed", fontWeight: 700 }}><Bi en="Average Temp" ar="متوسط الحرارة" /></div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: safeKPI.outOfRange > 0 ? "#b91c1c" : "#16a34a" }}>
            {safeKPI.avg}<span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#b91c1c", fontWeight: 700 }}><Bi en="Out of Range" ar="خارج النطاق" /></div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{safeKPI.outOfRange}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#0ea5e9", fontWeight: 700 }}><Bi en="Min / Max" ar="الأدنى / الأعلى" /></div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            <span style={{ color: "#0369a1" }}>{safeKPI.min}</span>
            <span style={{ color: "#94a3b8" }}> / </span>
            <span style={{ color: "#b91c1c" }}>{safeKPI.max}</span>
            <span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#0f766e", fontWeight: 700 }}><Bi en="Product Match" ar="مطابقة المنتج" /></div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            <span style={{ color: "#16a34a" }}>{productKpi.pass} ✓</span>
            <span style={{ color: "#94a3b8" }}> · </span>
            <span style={{ color: productKpi.fail ? "#b91c1c" : "#94a3b8" }}>{productKpi.fail} ✗</span>
            {productKpi.pending ? <span style={{ color: "#64748b", fontSize: ".8em" }}> · {productKpi.pending} pending · معلّق</span> : null}
          </div>
        </div>
      </div>

      {/* Section intro */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h4 style={{ color: "#2980b9", margin: 0, fontWeight: 900 }}>
          <Bi en="Temperatures & Product Matching" ar="الحرارة ومطابقة المنتج" />
        </h4>
        <div style={{ color: "#64748b", fontWeight: 600, marginTop: 4 }}>
          <Bi en="4 AM — 8 PM (every 2 hours) · record each storage temperature and match a product right beside it." ar="4 ص — 8 م (كل ساعتين) · سجّل حرارة كل وحدة وطابق منتجاً بجانبها." />
        </div>
      </div>

      {/* Coolers (each with its own inline product matching) */}
      {(dataCoolers || []).map((cooler, i) => {
        const def = coolerDefs[i] || makeDefaultCoolerDefs()[i];
        const accent = accentFor(i);
        const status = sectionStatus(cooler?.temps, (n) => inRange(def, n));
        return (
          <div
            key={i}
            style={{
              marginBottom: "1.1rem",
              padding: "1rem 1.1rem",
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              borderLeft: `5px solid ${accent}`,
              boxShadow: "0 4px 16px rgba(2,132,199,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.15rem" }}>{emojiOf(def)}</span>
                <strong style={{ fontSize: "1.08rem", color: "#0f172a" }}>{def.label}</strong>
                <span style={{ ...rangeBadge, background: `${accent}14`, color: accent, border: `1px solid ${accent}55` }}>
                  {rangeLabel(def)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={statusChip(status)}>{status.text}</span>
                {canEditSetup ? setupBtn(`cooler-${i}`, accent) : null}
              </div>
            </div>

            {setupOpen === `cooler-${i}` ? (
              <CoolerSetupPanel
                def={def}
                accent={accent}
                busy={savingSetup}
                onCancel={() => setSetupOpen(null)}
                onApply={(next) => applySetup(`cooler-${i}`, next)}
              />
            ) : null}

            <span style={sectionSubLabel}><Bi en="Temperatures (°C)" ar="درجات الحرارة (°م)" /></span>
            {renderTempGrid(cooler?.temps, (time, val) => handleCoolerChange(i, time, val), (t) => tempInputStyle(t, def), "#34495e", (v) => alertOutOfRange(def, v))}

            <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}><Bi en="Remarks" /></span>
              <input
                type="text"
                value={cooler?.remarks || ""}
                onChange={(e) => handleCoolerRemarksChange(i, e.target.value)}
                placeholder="Notes / observations · ملاحظات"
                style={remarksInputStyle}
              />
            </label>

            {renderMatchPanel(`cooler-${i}`, accent)}
          </div>
        );
      })}

      {/* Loading Area (with its own inline product matching) */}
      {(() => {
        const accent = accentOf(loadingDef);
        const status = sectionStatus(loadingArea?.temps, (n) => inRange(loadingDef, n));
        return (
          <div
            style={{
              marginBottom: "1.1rem",
              padding: "1rem 1.1rem",
              background: "#fffbeb",
              borderRadius: 14,
              border: "1px solid #fde68a",
              borderLeft: `5px solid ${accent}`,
              boxShadow: "0 4px 16px rgba(217,119,6,.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.15rem" }}>{emojiOf(loadingDef)}</span>
                <strong style={{ fontSize: "1.08rem", color: "#b45309" }}>{loadingDef.label}</strong>
                <span style={{ ...rangeBadge, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                  {rangeLabel(loadingDef)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={statusChip(status)}>{status.text}</span>
                {canEditSetup ? setupBtn("loading-area", accent) : null}
              </div>
            </div>

            {setupOpen === "loading-area" ? (
              <CoolerSetupPanel
                def={loadingDef}
                accent={accent}
                busy={savingSetup}
                onCancel={() => setSetupOpen(null)}
                onApply={(next) => applySetup("loading-area", next)}
              />
            ) : null}

            <span style={{ ...sectionSubLabel, color: "#a16207" }}><Bi en="Temperatures (°C)" ar="درجات الحرارة (°م)" /></span>
            {renderTempGrid(loadingArea?.temps, handleLoadingChange, (t) => tempInputStyle(t, loadingDef), "#92400e", (v) => alertOutOfRange(loadingDef, v))}

            <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, color: "#92400e" }}><Bi en="Remarks" /></span>
              <input
                type="text"
                value={loadingArea?.remarks || ""}
                onChange={(e) => handleLoadingRemarksChange(e.target.value)}
                placeholder="Notes / observations · ملاحظات"
                style={remarksInputStyle}
              />
            </label>

            {renderMatchPanel("loading-area", accent)}
          </div>
        );
      })()}

      {/* Verification statement */}
      <div
        style={{
          marginTop: 8,
          marginBottom: 12,
          padding: "12px 14px",
          background: "#f1f5f9",
          borderRadius: 12,
          color: "#334155",
          fontWeight: 700,
          lineHeight: 1.6,
        }}
      >
        <Bi en="Verification statement: a product was checked from the same storage area and compared with the recorded room/cooler temperature." ar="بيان التحقق: تم فحص منتج من نفس منطقة التخزين ومقارنته بحرارة الغرفة / البراد المسجلة." />
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <button
          onClick={loadFromLast}
          disabled={loadingLast}
          title={bi("Bring back the products and layout from the last report — temperatures stay blank", "استرجاع المنتجات والتخطيط من آخر تقرير — تبقى الحرارة فارغة")}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 800,
            cursor: loadingLast ? "wait" : "pointer",
          }}
        >
          {loadingLast ? <>⏳ <Bi en="Loading…" /></> : <>📋 <Bi en="Load from last report" ar="تحميل من آخر تقرير" /></>}
        </button>

        <button onClick={saveCoolersToServer} disabled={saving} style={btnSave}>
          {saving ? <>⏳ <Bi en="Saving..." /></> : <>💾 <Bi en="Save Coolers" ar="حفظ البرادات" /></>}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700 }}><Bi en="Verified by:" /></span>
          <input
            type="text"
            value={verifiedByManager}
            onChange={(e) => setVerifiedByManager(e.target.value)}
            placeholder="Manager name / signature · اسم المدير / التوقيع"
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 260, fontWeight: 700 }}
          />
        </label>
      </div>
    </div>
  );
}
