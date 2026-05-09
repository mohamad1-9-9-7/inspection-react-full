// src/pages/haccp and iso/GlassRegister/GlassRegisterInput.jsx
// Glass & Brittle Plastic — inventory item input (Policy 2 + ISO/TS 22002-1 PRP)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "glass_register_item";

const empty = {
  itemName: "",
  itemCode: "",
  itemType: "Glass",
  location: "",
  branch: "",
  zone: "Production",
  quantity: 1,
  protection: "Shatterproof",
  riskAssessment: "Medium",
  lastInspection: new Date().toISOString().slice(0, 10),
  nextInspection: "",
  inspectionFreq: "Monthly",
  condition: "Intact",
  responsible: "",
  notes: "",
};

const FREQ_DAYS = { Daily: 1, Weekly: 7, Monthly: 30, Quarterly: 90 };

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)", color: "#0f172a" },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #bfdbfe",
    boxShadow: "0 8px 24px rgba(37,99,235,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#1e3a8a", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#1d4ed8", marginTop: 4, fontWeight: 700 },

  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #bfdbfe", boxShadow: "0 6px 16px rgba(37,99,235,0.06)" },
  sectionTitle: {
    fontSize: 15, fontWeight: 950, color: "#1e3a8a",
    margin: "0 0 12px", paddingBottom: 6,
    borderBottom: "2px solid #3b82f6",
  },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#1e3a8a", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 70, resize: "vertical", background: "#fff" },
  select: { width: "100%", padding: "9px 11px", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff", cursor: "pointer" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #3b82f6, #2563eb)", color: "#fff", border: "#1d4ed8" },
      secondary: { bg: "#fff",                                      color: "#1e3a8a", border: "#bfdbfe" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "9px 18px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13,
    };
  },
};

export default function GlassRegisterInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p });
      })
      .catch(() => {});
  }, [editId]);

  function setField(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-calculate nextInspection from lastInspection + frequency
      if (k === "lastInspection" || k === "inspectionFreq") {
        const last = k === "lastInspection" ? v : f.lastInspection;
        const freq = k === "inspectionFreq" ? v : f.inspectionFreq;
        const days = FREQ_DAYS[freq];
        if (last && days) {
          const d = new Date(last);
          d.setDate(d.getDate() + days);
          next.nextInspection = d.toISOString().slice(0, 10);
        }
      }
      return next;
    });
  }

  // Auto-suggested next inspection date display
  const suggestedNext = useMemo(() => {
    const days = FREQ_DAYS[form.inspectionFreq];
    if (form.lastInspection && days) {
      const d = new Date(form.lastInspection);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }
    return "";
  }, [form.lastInspection, form.inspectionFreq]);

  async function save() {
    if (!form.itemName || !form.location || !form.branch) {
      alert(t("requiredField"));
      return;
    }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.responsible || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/glass-register/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("grInputTitle")}</div>
            <div style={S.subtitle}>{t("grSubtitle")}</div>
            <HaccpLinkBadge clauses={["8.2"]} label={isAr ? "PRP — الزجاج والبلاستيك الهش" : "PRP — Glass & Brittle Plastic"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/glass-register/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Item details */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("grDetails")}</div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("grItemName")}</label>
              <input style={S.input} value={form.itemName} onChange={(e) => setField("itemName", e.target.value)} placeholder={t("grItemNamePh")} />
            </div>
            <div>
              <label style={S.label}>{t("grItemCode")}</label>
              <input style={S.input} value={form.itemCode} onChange={(e) => setField("itemCode", e.target.value)} placeholder={t("grItemCodePh")} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("grItemType")}</label>
              <select style={S.select} value={form.itemType} onChange={(e) => setField("itemType", e.target.value)}>
                <option value="Glass">{t("grTypeGlass")}</option>
                <option value="BrittlePlastic">{t("grTypeBrittlePlastic")}</option>
                <option value="Acrylic">{t("grTypeAcrylic")}</option>
                <option value="Ceramic">{t("grTypeCeramic")}</option>
                <option value="Other">{t("grTypeOther")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("grQuantity")}</label>
              <input type="number" min="1" style={S.input} value={form.quantity} onChange={(e) => setField("quantity", parseInt(e.target.value, 10) || 1)} placeholder={t("grQuantityPh")} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الموقع" : "Location"}</div>

          <label style={S.label}>{t("grLocation")}</label>
          <input style={S.input} value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder={t("grLocationPh")} />

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("grBranch")}</label>
              <input style={S.input} value={form.branch} onChange={(e) => setField("branch", e.target.value)} placeholder={t("grBranchPh")} />
            </div>
            <div>
              <label style={S.label}>{t("grZone")}</label>
              <select style={S.select} value={form.zone} onChange={(e) => setField("zone", e.target.value)}>
                <option value="Production">{t("grZoneProduction")}</option>
                <option value="Storage">{t("grZoneStorage")}</option>
                <option value="Packaging">{t("grZonePackaging")}</option>
                <option value="Office">{t("grZoneOffice")}</option>
                <option value="Retail">{t("grZoneRetail")}</option>
                <option value="Other">{t("grZoneOther")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Risk & Protection */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "تقييم المخاطر والحماية" : "Risk & Protection"}</div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("grRiskAssessment")}</label>
              <select style={S.select} value={form.riskAssessment} onChange={(e) => setField("riskAssessment", e.target.value)}>
                <option value="High">{t("grRiskHigh")}</option>
                <option value="Medium">{t("grRiskMedium")}</option>
                <option value="Low">{t("grRiskLow")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("grProtection")}</label>
              <select style={S.select} value={form.protection} onChange={(e) => setField("protection", e.target.value)}>
                <option value="Shatterproof">{t("grProtectionShatterproof")}</option>
                <option value="Shield">{t("grProtectionShield")}</option>
                <option value="Cover">{t("grProtectionCover")}</option>
                <option value="Enclosed">{t("grProtectionEnclosed")}</option>
                <option value="None">{t("grProtectionNone")}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{t("grCondition")}</label>
          <select style={S.select} value={form.condition} onChange={(e) => setField("condition", e.target.value)}>
            <option value="Intact">{t("grConditionIntact")}</option>
            <option value="Cracked">{t("grConditionCracked")}</option>
            <option value="Broken">{t("grConditionBroken")}</option>
            <option value="Removed">{t("grConditionRemoved")}</option>
          </select>
        </div>

        {/* Inspection schedule */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "جدول الفحص" : "Inspection Schedule"}</div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("grInspectionFreq")}</label>
              <select style={S.select} value={form.inspectionFreq} onChange={(e) => setField("inspectionFreq", e.target.value)}>
                <option value="Daily">{t("grFreqDaily")}</option>
                <option value="Weekly">{t("grFreqWeekly")}</option>
                <option value="Monthly">{t("grFreqMonthly")}</option>
                <option value="Quarterly">{t("grFreqQuarterly")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("grLastInspection")}</label>
              <input type="date" style={S.input} value={form.lastInspection} onChange={(e) => setField("lastInspection", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("grNextInspection")}</label>
              <input type="date" style={S.input} value={form.nextInspection} onChange={(e) => setField("nextInspection", e.target.value)} placeholder={suggestedNext} />
              <div style={S.hint}>
                {form.nextInspection
                  ? (isAr ? "✓ مُحدد يدوياً" : "✓ Manually set")
                  : (suggestedNext ? (isAr ? `💡 افتراضي: ${suggestedNext}` : `💡 Default: ${suggestedNext}`) : "")}
              </div>
            </div>
          </div>

          <label style={S.label}>{t("grResponsible")}</label>
          <input style={S.input} value={form.responsible} onChange={(e) => setField("responsible", e.target.value)} placeholder={t("grResponsiblePh")} />

          <label style={S.label}>{t("grNotes")}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder={t("grNotesPh")} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("grSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
