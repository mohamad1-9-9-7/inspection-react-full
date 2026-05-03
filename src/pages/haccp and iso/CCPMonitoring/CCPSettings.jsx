// src/pages/haccp and iso/CCPMonitoring/CCPSettings.jsx
// إدارة قائمة CCPs المعرّفة (إضافة/تعديل/حذف)

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang, LangToggle, DEFAULT_CCPS } from "./i18n";
import { useCCPCatalog, saveCatalog } from "./useCCPCatalog";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const NEW_CCP_TEMPLATE = () => ({
  id: `ccp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  nameEn: "", nameAr: "",
  hazardEn: "", hazardAr: "",
  criticalLimit: { type: "max", min: null, max: 0, unit: "°C", descEn: "", descAr: "" },
  monitoringMethodEn: "", monitoringMethodAr: "",
  frequencyEn: "", frequencyAr: "",
  defaultActionEn: "", defaultActionAr: "",
});

export default function CCPSettings() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useLang();
  const { ccps, reload } = useCCPCatalog();
  const [list, setList] = useState(ccps);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  // مزامنة محليّة عند تحميل القائمة من السيرفر
  React.useEffect(() => { setList(ccps); }, [ccps]);

  function updateItem(idx, patch) {
    setList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function updateLimit(idx, patch) {
    setList((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        criticalLimit: { ...(next[idx].criticalLimit || {}), ...patch },
      };
      return next;
    });
  }
  function removeItem(idx) {
    if (!window.confirm(t("deleteCCPConfirm"))) return;
    setList((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setList((prev) => [...prev, NEW_CCP_TEMPLATE()]);
  }
  function resetDefaults() {
    if (!window.confirm(t("resetToDefaults") + " ?")) return;
    setList(DEFAULT_CCPS.map((c) => ({ ...c })));
  }

  async function handleSave() {
    setSaving(true);
    setMsg({ kind: "", text: "" });
    try {
      // ضمان وجود ID فريد
      const cleaned = list.map((c, i) => ({ ...c, id: c.id || `ccp_${Date.now()}_${i}` }));
      await saveCatalog(cleaned);
      setMsg({ kind: "ok", text: t("catalogSaved") });
      await reload();
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e?.message || e}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ kind: "", text: "" }), 4000);
    }
  }

  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.frame}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate(-1)} style={S.backBtn}>{t("back")}</button>
          <LangToggle lang={lang} toggle={toggle} />
        </div>

        <div style={S.header}>
          <h1 style={S.title}>{t("settingsTitle")}</h1>
          <div style={S.subtitle}>{t("settingsSubtitle")}</div>
          <HaccpLinkBadge clauses={["8.5", "ccp"]} label={lang === "ar" ? "كتالوج CCP — ضبط المخاطر" : "CCP Catalog — Hazard Control"} />
        </div>

        {/* List */}
        {list.length === 0 ? (
          <div style={S.empty}>{t("noResults")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {list.map((c, idx) => (
              <div key={c.id || idx} style={S.card}>
                <div style={S.cardHead}>
                  <div style={{ fontWeight: 800, color: "#0b1f4d" }}>🎯 {c.nameEn || c.nameAr || `CCP #${idx + 1}`}</div>
                  <button type="button" onClick={() => removeItem(idx)} style={S.btnDanger}>✖</button>
                </div>

                <div style={S.grid2}>
                  <Field label={t("ccpName")}>
                    <input style={S.input} value={c.nameEn || ""}
                      onChange={(e) => updateItem(idx, { nameEn: e.target.value })} />
                  </Field>
                  <Field label={t("ccpNameAr")}>
                    <input style={S.input} value={c.nameAr || ""} dir="rtl"
                      onChange={(e) => updateItem(idx, { nameAr: e.target.value })} />
                  </Field>
                  <Field label={t("ccpHazardEn")}>
                    <input style={S.input} value={c.hazardEn || ""}
                      onChange={(e) => updateItem(idx, { hazardEn: e.target.value })} />
                  </Field>
                  <Field label={t("ccpHazardAr")}>
                    <input style={S.input} value={c.hazardAr || ""} dir="rtl"
                      onChange={(e) => updateItem(idx, { hazardAr: e.target.value })} />
                  </Field>
                </div>

                {/* Limit */}
                <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac" }}>
                  <div style={{ fontWeight: 800, color: "#065f46", marginBottom: 8 }}>🎯 {t("criticalLimit")}</div>
                  <div style={S.grid3}>
                    <Field label={t("limitType")}>
                      <select style={S.input} value={c.criticalLimit?.type || "max"}
                        onChange={(e) => updateLimit(idx, { type: e.target.value })}>
                        <option value="max">{t("limitMax")}</option>
                        <option value="min">{t("limitMin")}</option>
                        <option value="range">{t("limitRange")}</option>
                      </select>
                    </Field>
                    {(c.criticalLimit?.type === "min" || c.criticalLimit?.type === "range") && (
                      <Field label={t("minValue")}>
                        <input type="number" step="0.1" style={S.input} value={c.criticalLimit?.min ?? ""}
                          onChange={(e) => updateLimit(idx, { min: e.target.value === "" ? null : Number(e.target.value) })} />
                      </Field>
                    )}
                    {(c.criticalLimit?.type === "max" || c.criticalLimit?.type === "range") && (
                      <Field label={t("maxValue")}>
                        <input type="number" step="0.1" style={S.input} value={c.criticalLimit?.max ?? ""}
                          onChange={(e) => updateLimit(idx, { max: e.target.value === "" ? null : Number(e.target.value) })} />
                      </Field>
                    )}
                    <Field label={t("unit")}>
                      <input style={S.input} value={c.criticalLimit?.unit || ""}
                        placeholder="°C, %, ppm, ..."
                        onChange={(e) => updateLimit(idx, { unit: e.target.value })} />
                    </Field>
                  </div>
                  <div style={{ ...S.grid2, marginTop: 10 }}>
                    <Field label={`Description (EN)`}>
                      <input style={S.input} value={c.criticalLimit?.descEn || ""}
                        placeholder="e.g. ≤ 4°C"
                        onChange={(e) => updateLimit(idx, { descEn: e.target.value })} />
                    </Field>
                    <Field label={`الوصف (عربي)`}>
                      <input style={S.input} value={c.criticalLimit?.descAr || ""} dir="rtl"
                        placeholder="مثلاً: ≤ 4°C"
                        onChange={(e) => updateLimit(idx, { descAr: e.target.value })} />
                    </Field>
                  </div>
                </div>

                <div style={{ ...S.grid2, marginTop: 10 }}>
                  <Field label={`${t("monitorMethod")} (EN)`}>
                    <input style={S.input} value={c.monitoringMethodEn || ""}
                      onChange={(e) => updateItem(idx, { monitoringMethodEn: e.target.value })} />
                  </Field>
                  <Field label={`${t("monitorMethod")} (AR)`}>
                    <input style={S.input} value={c.monitoringMethodAr || ""} dir="rtl"
                      onChange={(e) => updateItem(idx, { monitoringMethodAr: e.target.value })} />
                  </Field>
                  <Field label={`${t("frequency")} (EN)`}>
                    <input style={S.input} value={c.frequencyEn || ""}
                      onChange={(e) => updateItem(idx, { frequencyEn: e.target.value })} />
                  </Field>
                  <Field label={`${t("frequency")} (AR)`}>
                    <input style={S.input} value={c.frequencyAr || ""} dir="rtl"
                      onChange={(e) => updateItem(idx, { frequencyAr: e.target.value })} />
                  </Field>
                  <Field label={`${t("defaultAction")} (EN)`}>
                    <textarea rows={2} style={{ ...S.input, fontFamily: "inherit" }} value={c.defaultActionEn || ""}
                      onChange={(e) => updateItem(idx, { defaultActionEn: e.target.value })} />
                  </Field>
                  <Field label={`${t("defaultAction")} (AR)`}>
                    <textarea rows={2} style={{ ...S.input, fontFamily: "inherit" }} value={c.defaultActionAr || ""} dir="rtl"
                      onChange={(e) => updateItem(idx, { defaultActionAr: e.target.value })} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={addItem} style={S.btnSecondary}>{t("addCCP")}</button>
            <button onClick={resetDefaults} style={S.btnLight}>{t("resetToDefaults")}</button>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "⏳..." : t("saveCatalog")}
          </button>
        </div>

        {msg.text && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 10, fontWeight: 700,
            background: msg.kind === "ok" ? "#ecfdf5" : "#fef2f2",
            color: msg.kind === "ok" ? "#065f46" : "#991b1b",
            border: `1px solid ${msg.kind === "ok" ? "#86efac" : "#fca5a5"}`,
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.85rem" }}>{label}</span>
      {children}
    </label>
  );
}

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#fef2f2)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  frame: { maxWidth: 1100, margin: "0 auto" },
  header: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff", padding: "18px 22px", borderRadius: 14, marginBottom: 14,
    boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
  },
  title: { margin: 0, fontSize: "1.4rem", fontWeight: 900 },
  subtitle: { marginTop: 6, opacity: 0.9, fontSize: "0.9rem" },
  card: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #e5e7eb",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  input: {
    padding: "8px 10px", border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: "0.9rem", width: "100%", boxSizing: "border-box", background: "#fff",
  },
  empty: {
    background: "#fff", padding: 40, textAlign: "center", borderRadius: 12,
    color: "#64748b", fontWeight: 700,
  },
  btnPrimary: {
    background: "linear-gradient(180deg,#10b981,#059669)",
    color: "#fff", border: "none", padding: "11px 22px",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: "0.95rem",
  },
  btnSecondary: {
    background: "#eef2ff", color: "#1e40af", border: "1px solid #c7d2fe",
    padding: "10px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
  },
  btnLight: {
    background: "#f1f5f9", color: "#0b1f4d", border: "1px solid #cbd5e1",
    padding: "10px 16px", borderRadius: 10, fontWeight: 700, cursor: "pointer",
  },
  btnDanger: {
    background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5",
    padding: "6px 10px", borderRadius: 8, fontWeight: 800, cursor: "pointer",
  },
  backBtn: {
    background: "#fff", color: "#0b1f4d", border: "1.5px solid #cbd5e1",
    padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: "0.9rem",
  },
};
