// src/pages/hse/HSEFireEquipment.jsx
// F-28: فحص معدات إطفاء الحريق — Fire Fighting Equipment Inspection (SBG-HSE-010)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "fire_equipment_inspections";

const T = {
  title:        { ar: "🧯 فحص معدات الإطفاء (F-28) — Fire Fighting Equipment Inspection", en: "🧯 Fire Fighting Equipment Inspection (F-28)" },
  subtitle:     { ar: "فحص شهري دوري لكل معدات الإطفاء (مطابق SBG-HSE-010)",
                  en: "Monthly inspection of all fire fighting equipment (per SBG-HSE-010)" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ فحص جديد", en: "+ New Inspection" },
  reportNo:     { ar: "رقم الفحص", en: "Inspection No." },
  date:         { ar: "تاريخ الفحص", en: "Inspection Date" },
  inspector:    { ar: "المفتش", en: "Inspector" },
  location:     { ar: "الموقع", en: "Location" },

  s1Title:      { ar: "🧯 سجل المعدات", en: "🧯 Equipment Register" },
  itemNo:       { ar: "#", en: "#" },
  eqType:       { ar: "نوع المعدّة", en: "Equipment Type" },
  eqId:         { ar: "رقم/كود المعدّة", en: "Equipment ID" },
  eqLocation:   { ar: "مكان التركيب", en: "Mounting Location" },
  eqCapacity:   { ar: "السعة/الحجم", en: "Capacity / Size" },
  pressureGauge:{ ar: "مؤشر الضغط", en: "Pressure Gauge" },
  pressOk:      { ar: "ضمن النطاق الأخضر", en: "In Green Zone" },
  pressLow:     { ar: "منخفض", en: "Low" },
  pressHigh:    { ar: "مرتفع", en: "High" },
  sealCheck:    { ar: "الختم سليم", en: "Seal Intact" },
  pinCheck:     { ar: "مسمار الأمان موجود", en: "Safety Pin Present" },
  hoseCheck:    { ar: "الخرطوم سليم", en: "Hose Intact" },
  bodyCheck:    { ar: "الجسم سليم (لا صدأ)", en: "Body OK (No Rust)" },
  labelCheck:   { ar: "الملصق واضح", en: "Label Clear" },
  accessCheck:  { ar: "الوصول سهل (غير معاق)", en: "Easy Access" },
  signCheck:    { ar: "اللافتة واضحة", en: "Sign Visible" },
  lastService:  { ar: "آخر صيانة سنوية", en: "Last Annual Service" },
  nextDue:      { ar: "الصيانة القادمة", en: "Next Service Due" },
  status:       { ar: "الحالة", en: "Status" },
  stOk:         { ar: "صالح", en: "Serviceable" },
  stDefective:  { ar: "معيب", en: "Defective" },
  stReplace:    { ar: "يحتاج استبدال", en: "Replace" },
  stMissing:    { ar: "مفقود", en: "Missing" },
  remarks:      { ar: "ملاحظات", en: "Remarks" },
  addRow:       { ar: "+ إضافة معدّة", en: "+ Add Equipment" },
  removeRow:    { ar: "حذف", en: "Remove" },
  copyRow:      { ar: "نسخ", en: "Copy" },

  s2Title:      { ar: "📊 ملخص الفحص", en: "📊 Inspection Summary" },
  totalEq:      { ar: "إجمالي المعدات", en: "Total Equipment" },
  okCount:      { ar: "صالحة", en: "Serviceable" },
  defCount:     { ar: "معيبة", en: "Defective" },

  s3Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  hseManager:   { ar: "مدير HSE", en: "HSE Manager" },
  notes:        { ar: "ملاحظات عامة", en: "General Notes" },

  saveBtn:      { ar: "💾 حفظ الفحص", en: "💾 Save Inspection" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needInspector:{ ar: "أدخل اسم المفتش", en: "Enter inspector name" },
  saved:        { ar: "✅ تم حفظ الفحص", en: "✅ Inspection saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد سجلات", en: "No records" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    location:  { ar: "الموقع", en: "Location" },
    inspector: { ar: "المفتش", en: "Inspector" },
    total:     { ar: "إجمالي", en: "Total" },
    defects:   { ar: "معيبة", en: "Defects" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-28 · Fire Fighting Equipment Inspection · AL MAWASHI HSE",
                  en: "Form F-28 · Fire Fighting Equipment Inspection · AL MAWASHI HSE" },
};

const EQUIPMENT_TYPES = [
  { v: "fe_dcp",    ar: "طفاية بودرة جافة (DCP)",       en: "Dry Chemical Powder Extinguisher" },
  { v: "fe_co2",    ar: "طفاية CO₂",                    en: "CO₂ Extinguisher" },
  { v: "fe_foam",   ar: "طفاية رغوة",            en: "Foam Extinguisher" },
  { v: "fe_water",  ar: "طفاية مياه",                    en: "Water Extinguisher" },
  { v: "fe_kclass", ar: "طفاية مطبخ (فئة K)",          en: "Kitchen Extinguisher (K-Class)" },
  { v: "hose",      ar: "خرطوم إطفاء",  en: "Fire Hose Reel" },
  { v: "hydrant",   ar: "حنفية إطفاء",          en: "Fire Hydrant" },
  { v: "sprink",    ar: "نظام رشاشات",        en: "Sprinkler System" },
  { v: "smoke",     ar: "كاشف دخان",                      en: "Smoke Detector" },
  { v: "heat",      ar: "كاشف حرارة",                     en: "Heat Detector" },
  { v: "alarm",     ar: "نقطة إنذار يدوية (MCP)",         en: "Manual Call Point (MCP)" },
  { v: "panel",     ar: "لوحة الإنذار المركزية",           en: "Fire Alarm Panel" },
  { v: "exitsign",  ar: "لافتة الخروج (مضاءة)",            en: "Exit Sign (Illuminated)" },
  { v: "emerlight", ar: "إضاءة طوارئ",                     en: "Emergency Light" },
];

const blankRow = () => ({
  type: "fe_dcp", id: "", location: "", capacity: "",
  pressure: "ok", seal: true, pin: true, hose: true, body: true, label: true, access: true, sign: true,
  lastService: "", nextDue: "", status: "ok", remarks: "",
});

const blank = () => ({
  reportNo: `FFE-${Date.now().toString().slice(-6)}`,
  date: todayISO(), inspector: "",
  location: SITE_LOCATIONS[0].v,
  rows: [blankRow()],
  notes: "", preparedBy: "", hseManager: "",
});

/* ── Rules: every unit is identified and located once; a unit that fails any
   check, shows wrong pressure, or is past its service date can never be
   marked "Serviceable", and every non-serviceable unit says why. ── */
const FIRE_CHECKS = ["seal", "pin", "hose", "body", "label", "access", "sign"];
const daysApart = (a, b) => (new Date(b) - new Date(a)) / 86400000;

function fireRowError(r, rows, d) {
  const id = String(r.id || "").trim();
  if (!id) return { ar: "رقم/كود المعدّة إلزامي", en: "Equipment ID is required" };
  if (rows.filter((x) => String(x.id || "").trim().toLowerCase() === id.toLowerCase()).length > 1)
    return { ar: "رقم المعدّة مكرّر في نفس الفحص", en: "Equipment ID is repeated in this inspection" };
  if (!String(r.location || "").trim()) return { ar: "مكان التركيب إلزامي", en: "Mounting location is required" };
  const today = todayISO();
  if (r.lastService && r.lastService > today) return { ar: "آخر صيانة لا تكون في المستقبل", en: "Last service cannot be in the future" };
  if (r.lastService && r.nextDue && r.nextDue <= r.lastService)
    return { ar: "الصيانة القادمة يجب أن تكون بعد آخر صيانة", en: "Next service must be after the last service" };
  if (r.lastService && r.nextDue && daysApart(r.lastService, r.nextDue) > 366)
    return { ar: "الصيانة السنوية لا تتجاوز 12 شهراً", en: "The annual service interval cannot exceed 12 months" };
  const failedCheck = FIRE_CHECKS.some((k) => r[k] === false) || r.pressure === "low" || r.pressure === "high";
  const overdue = r.nextDue && d.date && r.nextDue < d.date;
  if (r.status === "ok" && failedCheck)
    return { ar: "فحص فاشل أو ضغط غير سليم — لا يمكن أن تكون الحالة «صالح»", en: "A failed check or wrong pressure — status cannot be “Serviceable”" };
  if (r.status === "ok" && overdue)
    return { ar: "الصيانة متأخرة — لا يمكن أن تكون الحالة «صالح»", en: "Service is overdue — status cannot be “Serviceable”" };
  if (r.status !== "ok" && !String(r.remarks || "").trim())
    return { ar: "اكتب سبب الحالة والإجراء في الملاحظات", en: "Write the reason and action in the remarks" };
  return null;
}

const FIRE_RULES = [
  { key: "date", label: T.date, type: "date", required: true, notFuture: true },
  { key: "inspector", label: T.inspector, required: true, minLength: 2, maxLength: 80 },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  { key: "rows", label: T.s1Title,
    custom: (v, d) => {
      const rows = v || [];
      if (!rows.length) return { ar: "أضف معدّة واحدة على الأقل", en: "Add at least one unit" };
      for (let i = 0; i < rows.length; i++) {
        const e = fireRowError(rows[i], rows, d);
        if (e) return { ar: `السطر ${i + 1}: ${e.ar}`, en: `Row ${i + 1}: ${e.en}` };
      }
      return null;
    } },
  { key: "notes", label: T.notes, maxLength: 2000 },
  { key: "preparedBy", label: T.preparedBy, required: true, maxLength: 80 },
  { key: "hseManager", label: T.hseManager, required: true, maxLength: 80,
    custom: (v, d) => v && d.preparedBy && v.trim().toLowerCase() === d.preparedBy.trim().toLowerCase()
      ? { ar: "مدير HSE يجب أن يكون غير المُعِد", en: "The HSE manager must differ from the preparer" } : null },
];

const FIRE_STEPS = [
  { ar: "سجّل تاريخ الفحص والمفتش والموقع.", en: "Record the inspection date, the inspector and the location." },
  { ar: "أضف سطراً لكل معدّة برقمها الفريد ومكان تركيبها — لا يتكرر الرقم في نفس الفحص. استخدم «نسخ» للمعدات المتشابهة.", en: "Add one line per unit with its unique ID and mounting location — no ID repeats in one inspection. Use “Copy” for similar units." },
  { ar: "أزل علامة أي فحص فشل (الختم، المسمار، الخرطوم…) واختر قراءة مؤشر الضغط.", en: "Untick any check that failed (seal, pin, hose…) and pick the pressure-gauge reading." },
  { ar: "سجّل آخر صيانة سنوية والقادمة (خلال 12 شهراً). المعدّة المتأخرة أو الفاشلة لا تُسجَّل «صالحة».", en: "Enter the last and next annual service (within 12 months). An overdue or failed unit cannot be “Serviceable”." },
  { ar: "أي معدّة غير صالحة تحتاج ملاحظة بالسبب والإجراء، ثم يوقّع المُعِد ومدير HSE.", en: "Any non-serviceable unit needs a remark with the reason and action; then the preparer and HSE manager sign." },
];

const FIRE_GUIDANCE = [
  { kind: "warn", ar: "الطفاية المعيبة أو المفقودة تُستبدل في نفس اليوم — لا تُترك نقطة بدون حماية.", en: "A defective or missing extinguisher is replaced the same day — never leave a point unprotected." },
  { kind: "tip",  ar: "إبرة مؤشر الضغط يجب أن تكون في النطاق الأخضر؛ طفايات CO₂ تُفحص بالوزن لعدم وجود مؤشر.", en: "The gauge needle must be in the green zone; CO₂ units have no gauge and are checked by weight." },
];

export default function HSEFireEquipment() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(FIRE_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setViewing(null);
    validation.reset();
    setTab("new");
  }

  function setRow(idx, field, val) {
    setDraft((d) => {
      const rows = [...d.rows];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...d, rows };
    });
  }
  function addRow() { setDraft((d) => ({ ...d, rows: [...d.rows, blankRow()] })); }
  function removeRow(idx) { setDraft((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== idx) })); }
  function copyRow(idx) {
    setDraft((d) => {
      const newRow = { ...d.rows[idx], id: "" };
      const rows = [...d.rows];
      rows.splice(idx + 1, 0, newRow);
      return { ...d, rows };
    });
  }

  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.inspector || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.inspector || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); validation.reset(); setTab("list");
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  const total = (draft.rows || []).length;
  const okCount = (draft.rows || []).filter((r) => r.status === "ok").length;
  const defCount = total - okCount;

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newReport)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const showRowErrors = !!validation.errors.rows;
          const rows = draft.rows || [];
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "فحص معدات الإطفاء", en: "Fire Fighting Equipment Inspection" }}
              subtitle={T.subtitle}
              docNo="F-28"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.reportNo), value: draft.reportNo }]}
              steps={FIRE_STEPS}
              guidance={FIRE_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات الفحص" : "Inspection details"}>
                <HSEField {...f("date")} type="date" label={pick(T.date)} />
                <HSEField {...f("inspector")} label={pick(T.inspector)} />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
              </HSEPanel>

              <div className="ph-toolbar">
                <div className="ph-fieldbar-title" style={{ margin: 0 }}>{pick(T.s1Title)}</div>
                <button type="button" onClick={addRow} className="ph-btn ph-btn-ghost">{pick(T.addRow)}</button>
              </div>
              <div className="ph-table-wrap ph-scroll-x" data-hk-field="rows"
                style={{ marginBottom: 12, borderColor: showRowErrors ? "#dc2626" : undefined }}>
                <table className="ph-table" style={{ minWidth: 1400 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ minWidth: 170 }}>{pick(T.eqType)}</th>
                      <th style={{ minWidth: 110 }}>{pick(T.eqId)} *</th>
                      <th style={{ minWidth: 150 }}>{pick(T.eqLocation)} *</th>
                      <th style={{ minWidth: 90 }}>{pick(T.eqCapacity)}</th>
                      <th style={{ minWidth: 130 }}>{pick(T.pressureGauge)}</th>
                      <th style={{ minWidth: 260 }}>{lang === "ar" ? "الفحوصات" : "Checks"}</th>
                      <th style={{ minWidth: 140 }}>{pick(T.lastService)}</th>
                      <th style={{ minWidth: 140 }}>{pick(T.nextDue)}</th>
                      <th style={{ minWidth: 130 }}>{pick(T.status)}</th>
                      <th style={{ minWidth: 180 }}>{pick(T.remarks)}</th>
                      <th style={{ width: 90 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const err = showRowErrors ? fireRowError(r, rows, draft) : null;
                      return (
                        <React.Fragment key={i}>
                          <tr style={err ? { background: "#fef2f2" } : undefined}>
                            <td className="ph-num">{i + 1}</td>
                            <td>
                              <select className="ph-input hk-select" value={r.type} onChange={(e) => setRow(i, "type", e.target.value)}>
                                {EQUIPMENT_TYPES.map((eq) => <option key={eq.v} value={eq.v}>{eq[lang]}</option>)}
                              </select>
                            </td>
                            <td><input className="ph-input" maxLength={30} value={r.id} onChange={(e) => setRow(i, "id", e.target.value)} /></td>
                            <td><input className="ph-input" maxLength={80} value={r.location} onChange={(e) => setRow(i, "location", e.target.value)} /></td>
                            <td><input className="ph-input" maxLength={20} value={r.capacity} onChange={(e) => setRow(i, "capacity", e.target.value)} /></td>
                            <td>
                              <select className={`ph-select ph-select-${r.pressure === "ok" ? "ok" : r.pressure === "na" ? "empty" : "bad"}`}
                                value={r.pressure} onChange={(e) => setRow(i, "pressure", e.target.value)}>
                                <option value="ok">{pick(T.pressOk)}</option>
                                <option value="low">{pick(T.pressLow)}</option>
                                <option value="high">{pick(T.pressHigh)}</option>
                                <option value="na">N/A</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {[
                                  ["seal", T.sealCheck], ["pin", T.pinCheck], ["hose", T.hoseCheck],
                                  ["body", T.bodyCheck], ["label", T.labelCheck], ["access", T.accessCheck], ["sign", T.signCheck],
                                ].map(([k, lbl]) => (
                                  <label key={k} className={`ph-tag ${r[k] ? "ph-chip-c" : "ph-chip-nc"}`}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", textTransform: "none", fontSize: 11 }}>
                                    <input type="checkbox" checked={!!r[k]} onChange={(e) => setRow(i, k, e.target.checked)} />
                                    {pick(lbl)}
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td><input className="ph-input" type="date" max={todayISO()} value={r.lastService} onChange={(e) => setRow(i, "lastService", e.target.value)} /></td>
                            <td><input className="ph-input" type="date" min={r.lastService || undefined} value={r.nextDue} onChange={(e) => setRow(i, "nextDue", e.target.value)} /></td>
                            <td>
                              <select className={`ph-select ph-select-${r.status === "ok" ? "ok" : "bad"}`}
                                value={r.status} onChange={(e) => setRow(i, "status", e.target.value)}>
                                <option value="ok">{pick(T.stOk)}</option>
                                <option value="defective">{pick(T.stDefective)}</option>
                                <option value="replace">{pick(T.stReplace)}</option>
                                <option value="missing">{pick(T.stMissing)}</option>
                              </select>
                            </td>
                            <td><input className="ph-input" maxLength={300} value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} /></td>
                            <td>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button type="button" className="ph-btn ph-btn-ghost" style={{ padding: "6px 8px", fontSize: 12 }} onClick={() => copyRow(i)}>{pick(T.copyRow)}</button>
                                <button type="button" className="ph-btn-icon ph-btn-danger" title={pick(T.removeRow)}
                                  disabled={rows.length === 1} onClick={() => removeRow(i)}>×</button>
                              </div>
                            </td>
                          </tr>
                          {err && (
                            <tr><td colSpan={12} className="hk-err" style={{ padding: "6px 14px", background: "#fef2f2" }}>
                              {lang === "ar" ? `السطر ${i + 1}: ${err.ar}` : `Row ${i + 1}: ${err.en}`}
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ph-stats">
                <div className="ph-stat"><div className="ph-stat-label">{pick(T.totalEq)}</div><div className="ph-stat-value">{total}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{pick(T.okCount)}</div><div className="ph-stat-value" style={{ color: "#166534" }}>{okCount}</div></div>
                <div className={`ph-stat${defCount ? " ph-stat-bad" : ""}`}><div className="ph-stat-label">{pick(T.defCount)}</div><div className="ph-stat-value">{defCount}</div></div>
              </div>

              <HSEPanel title={pick(T.s3Title)}>
                <HSEField {...f("notes")} type="textarea" full label={pick(T.notes)} />
                <HSEField {...f("preparedBy")} label={pick(T.preparedBy)} />
                <HSEField {...f("hseManager")} label={pick(T.hseManager)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.cols.no)}</th>
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.inspector)}</th>
                  <th style={thStyle}>{pick(T.cols.total)}</th>
                  <th style={thStyle}>{pick(T.cols.defects)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const total = (it.rows || []).length;
                  const defects = (it.rows || []).filter((r) => r.status !== "ok").length;
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{it.inspector}</td>
                      <td style={tdStyle}>{total}</td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 800, color: defects === 0 ? "#166534" : "#b91c1c" }}>{defects}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="7" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewing && (
          <div className="hse-modal-backdrop" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 20,
          }} onClick={() => setViewing(null)}>
            <div onClick={(e) => e.stopPropagation()} className="hse-print-area" style={{
              background: "#fff", borderRadius: 14, padding: 30,
              maxWidth: 1100, width: "100%", maxHeight: "92vh", overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)", direction: dir,
            }}>
              <div style={{
                borderBottom: `3px solid ${HSE_COLORS.primary}`, paddingBottom: 12, marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.title)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16 }}>
                <div><b>{pick(T.reportNo)}: </b>{viewing.reportNo}</div>
                <div><b>{pick(T.date)}: </b>{viewing.date}</div>
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.inspector)}: </b>{viewing.inspector}</div>
              </div>

              <SectionHeader title={pick(T.s1Title)} />
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{pick(T.itemNo)}</th>
                      <th style={thStyle}>{pick(T.eqType)}</th>
                      <th style={thStyle}>{pick(T.eqId)}</th>
                      <th style={thStyle}>{pick(T.eqLocation)}</th>
                      <th style={thStyle}>{pick(T.eqCapacity)}</th>
                      <th style={thStyle}>{pick(T.pressureGauge)}</th>
                      <th style={thStyle}>{pick(T.nextDue)}</th>
                      <th style={thStyle}>{pick(T.status)}</th>
                      <th style={thStyle}>{pick(T.remarks)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.rows || []).map((r, i) => {
                      const eq = EQUIPMENT_TYPES.find((e) => e.v === r.type);
                      const stLbl = { ok: T.stOk, defective: T.stDefective, replace: T.stReplace, missing: T.stMissing }[r.status] || T.stOk;
                      const stBg = { ok: "#dcfce7", defective: "#fee2e2", replace: "#fef9c3", missing: "#fecaca" }[r.status] || "#dcfce7";
                      const stColor = { ok: "#166534", defective: "#7f1d1d", replace: "#854d0e", missing: "#7f1d1d" }[r.status] || "#166534";
                      const prLbl = { ok: T.pressOk, low: T.pressLow, high: T.pressHigh }[r.pressure] || { ar: r.pressure, en: r.pressure };
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                          <td style={tdStyle}>{eq ? eq[lang] : r.type}</td>
                          <td style={tdStyle}>{r.id || "—"}</td>
                          <td style={tdStyle}>{r.location || "—"}</td>
                          <td style={tdStyle}>{r.capacity || "—"}</td>
                          <td style={tdStyle}>{r.pressure === "na" ? "N/A" : pick(prLbl)}</td>
                          <td style={tdStyle}>{r.nextDue || "—"}</td>
                          <td style={tdStyle}>
                            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: stBg, color: stColor }}>{pick(stLbl)}</span>
                          </td>
                          <td style={tdStyle}>{r.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {viewing.notes && (
                <div style={{ marginTop: 12, padding: 12, background: "#fef9c3", borderRadius: 10, fontSize: 13 }}>
                  <b>{pick(T.notes)}: </b><div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{viewing.notes}</div>
                </div>
              )}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.preparedBy)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.hseManager)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.hseManager || "_______________"}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" }}>{pick(T.formFooter)}</div>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .hse-print-area, .hse-print-area * { visibility: visible; }
            .hse-print-area {
              position: absolute !important;
              left: 0; top: 0;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .hse-modal-backdrop { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </main>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      marginTop: 18, marginBottom: 10,
      fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark,
      padding: "8px 12px", borderRadius: 10,
      background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
    }}>{title}</div>
  );
}
