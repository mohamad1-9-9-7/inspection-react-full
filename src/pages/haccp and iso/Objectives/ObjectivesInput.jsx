// src/pages/haccp and iso/Objectives/ObjectivesInput.jsx
// FSMS Objective — Input form (ISO 22000:2018 Clause 6.2)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_objective";

const empty = {
  name: "",
  description: "",
  category: "FoodSafety",
  target: "",
  unit: "%",
  direction: "higher",
  frequency: "Monthly",
  owner: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  method: "",
  linkedClause: "6.2",
  linkedModule: "none",
  currentValue: "",
  currentValueDate: new Date().toISOString().slice(0, 10),
  status: "OnTrack",
  notes: "",
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#eef2ff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #c7d2fe", boxShadow: "0 8px 22px rgba(67,56,202,0.06)" },
  title: { fontSize: 20, fontWeight: 950, color: "#3730a3", marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#3730a3", margin: "12px 0 8px", borderBottom: "2px solid #6366f1", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#3730a3", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  select: { width: "100%", padding: "8px 10px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #6366f1, #4f46e5)", color: "#fff", border: "#4338ca" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#3730a3", border: "#c7d2fe" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },
};

export default function ObjectivesInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
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

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Auto-suggest status based on current value vs target
  function autoStatus() {
    const target = parseFloat(form.target);
    const current = parseFloat(form.currentValue);
    if (isNaN(target) || isNaN(current)) return;
    const ratio = form.direction === "higher" ? current / target : target / current;
    let next = "OnTrack";
    if (ratio >= 1) next = "Achieved";
    else if (ratio >= 0.8) next = "OnTrack";
    else if (ratio >= 0.5) next = "AtRisk";
    else next = "OffTrack";
    setField("status", next);
  }

  async function save() {
    if (!form.name || !form.target || !form.owner) {
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
        body: JSON.stringify({ reporter: form.owner || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/objectives/view");
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
            <div style={S.title}>{t("objTitle")}</div>
            <HaccpLinkBadge clauses={["6.2"]} label={lang === "ar" ? "أهداف FSMS" : "FSMS Objectives"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/objectives/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("objDetails")}</div>

          <label style={S.label}>{t("objName")}</label>
          <input style={S.input} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder={t("objNamePh")} />

          <label style={S.label}>{t("objDescription")}</label>
          <textarea style={S.textarea} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={t("objDescriptionPh")} />

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("objCategory")}</label>
              <select style={S.select} value={form.category} onChange={(e) => setField("category", e.target.value)}>
                <option value="FoodSafety">{t("objCategoryFoodSafety")}</option>
                <option value="Quality">{t("objCategoryQuality")}</option>
                <option value="Customer">{t("objCategoryCustomer")}</option>
                <option value="Supplier">{t("objCategorySupplier")}</option>
                <option value="Training">{t("objCategoryTraining")}</option>
                <option value="Operations">{t("objCategoryOperations")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("objLinkedClause")}</label>
              <input style={S.input} value={form.linkedClause} onChange={(e) => setField("linkedClause", e.target.value)} placeholder={t("objLinkedClausePh")} />
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{lang === "ar" ? "هدف SMART" : "SMART Target"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("objTarget")}</label>
              <input style={S.input} value={form.target} onChange={(e) => setField("target", e.target.value)} placeholder={t("objTargetPh")} />
            </div>
            <div>
              <label style={S.label}>{t("objUnit")}</label>
              <input style={S.input} value={form.unit} onChange={(e) => setField("unit", e.target.value)} placeholder={t("objUnitPh")} />
            </div>
            <div>
              <label style={S.label}>{t("objDirection")}</label>
              <select style={S.select} value={form.direction} onChange={(e) => setField("direction", e.target.value)}>
                <option value="higher">{t("objDirectionHigher")}</option>
                <option value="lower">{t("objDirectionLower")}</option>
              </select>
            </div>
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("objFrequency")}</label>
              <select style={S.select} value={form.frequency} onChange={(e) => setField("frequency", e.target.value)}>
                <option value="Daily">{t("objFrequencyDaily")}</option>
                <option value="Weekly">{t("objFrequencyWeekly")}</option>
                <option value="Monthly">{t("objFrequencyMonthly")}</option>
                <option value="Quarterly">{t("objFrequencyQuarterly")}</option>
                <option value="Annual">{t("objFrequencyAnnual")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("objStartDate")}</label>
              <input type="date" style={S.input} value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("objEndDate")}</label>
              <input type="date" style={S.input} value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
            </div>
          </div>

          <label style={S.label}>{t("objOwner")}</label>
          <input style={S.input} value={form.owner} onChange={(e) => setField("owner", e.target.value)} placeholder={t("objOwnerPh")} />

          <label style={S.label}>{t("objMethod")}</label>
          <textarea style={S.textarea} value={form.method} onChange={(e) => setField("method", e.target.value)} placeholder={t("objMethodPh")} />

          <label style={S.label}>{t("objLinkedModule")}</label>
          <select style={S.select} value={form.linkedModule} onChange={(e) => setField("linkedModule", e.target.value)}>
            <option value="none">{t("objLinkedModuleNone")}</option>
            <option value="ccp">{t("objLinkedModuleCCP")}</option>
            <option value="mock_recall">{t("objLinkedModuleMockRecall")}</option>
            <option value="audit">{t("objLinkedModuleAudit")}</option>
            <option value="supplier">{t("objLinkedModuleSupplier")}</option>
            <option value="calibration">{t("objLinkedModuleCalib")}</option>
            <option value="complaints">{t("objLinkedModuleComplaints")}</option>
            <option value="training">{t("objLinkedModuleTraining")}</option>
          </select>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{lang === "ar" ? "القياس الحالي" : "Current Measurement"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("objCurrentValue")}</label>
              <input style={S.input} value={form.currentValue} onChange={(e) => setField("currentValue", e.target.value)} placeholder={t("objCurrentValuePh")} onBlur={autoStatus} />
            </div>
            <div>
              <label style={S.label}>{t("objCurrentValueDate")}</label>
              <input type="date" style={S.input} value={form.currentValueDate} onChange={(e) => setField("currentValueDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("objStatus")}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="OnTrack">{t("objStatusOnTrack")}</option>
                <option value="AtRisk">{t("objStatusAtRisk")}</option>
                <option value="OffTrack">{t("objStatusOffTrack")}</option>
                <option value="Achieved">{t("objStatusAchieved")}</option>
                <option value="OnHold">{t("objStatusOnHold")}</option>
              </select>
            </div>
          </div>
          <div style={S.hint}>
            {lang === "ar"
              ? "💡 الحالة بتنحدّد تلقائياً بناءً على القيمة الحالية مقارنة بالمستهدف عند الخروج من الحقل."
              : "💡 Status is auto-suggested based on current value vs target when leaving the field."}
          </div>

          <label style={S.label}>{t("objNotes")}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder={t("objNotesPh")} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("objSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
