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
  { v: "fe_foam",   ar: "طفاية رغوة (Foam)",            en: "Foam Extinguisher" },
  { v: "fe_water",  ar: "طفاية مياه",                    en: "Water Extinguisher" },
  { v: "fe_kclass", ar: "طفاية مطبخ (Class K)",          en: "Kitchen Extinguisher (K-Class)" },
  { v: "hose",      ar: "خرطوم إطفاء (Fire Hose Reel)",  en: "Fire Hose Reel" },
  { v: "hydrant",   ar: "حنفية إطفاء (Hydrant)",          en: "Fire Hydrant" },
  { v: "sprink",    ar: "نظام رشاشات (Sprinkler)",        en: "Sprinkler System" },
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

export default function HSEFireEquipment() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    if (!draft.inspector.trim()) { alert(pick(T.needInspector)); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.inspector || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.inspector || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); setTab("list");
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.inspector)}</label><input type="text" value={draft.inspector} onChange={(e) => setDraft({ ...draft, inspector: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
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
                    <th style={thStyle}>{lang === "ar" ? "الفحوصات" : "Checks"}</th>
                    <th style={thStyle}>{pick(T.lastService)}</th>
                    <th style={thStyle}>{pick(T.nextDue)}</th>
                    <th style={thStyle}>{pick(T.status)}</th>
                    <th style={thStyle}>{pick(T.remarks)}</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.rows || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}>
                        <select value={r.type} onChange={(e) => setRow(i, "type", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, minWidth: 130 }}>
                          {EQUIPMENT_TYPES.map((eq) => <option key={eq.v} value={eq.v}>{eq[lang]}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}><input type="text" value={r.id} onChange={(e) => setRow(i, "id", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, width: 80 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.location} onChange={(e) => setRow(i, "location", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.capacity} onChange={(e) => setRow(i, "capacity", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, width: 70 }} /></td>
                      <td style={tdStyle}>
                        <select value={r.pressure} onChange={(e) => setRow(i, "pressure", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }}>
                          <option value="ok">{pick(T.pressOk)}</option>
                          <option value="low">{pick(T.pressLow)}</option>
                          <option value="high">{pick(T.pressHigh)}</option>
                          <option value="na">N/A</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 10 }}>
                          {[
                            ["seal", T.sealCheck], ["pin", T.pinCheck], ["hose", T.hoseCheck],
                            ["body", T.bodyCheck], ["label", T.labelCheck], ["access", T.accessCheck], ["sign", T.signCheck],
                          ].map(([k, lbl]) => (
                            <label key={k} style={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}>
                              <input type="checkbox" checked={!!r[k]} onChange={(e) => setRow(i, k, e.target.checked)} />
                              <span>{pick(lbl)}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={tdStyle}><input type="date" value={r.lastService} onChange={(e) => setRow(i, "lastService", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="date" value={r.nextDue} onChange={(e) => setRow(i, "nextDue", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}>
                        <select value={r.status} onChange={(e) => setRow(i, "status", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }}>
                          <option value="ok">{pick(T.stOk)}</option>
                          <option value="defective">{pick(T.stDefective)}</option>
                          <option value="replace">{pick(T.stReplace)}</option>
                          <option value="missing">{pick(T.stMissing)}</option>
                        </select>
                      </td>
                      <td style={tdStyle}><input type="text" value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}>
                        <button type="button" onClick={() => copyRow(i)} style={{ ...buttonGhost, padding: "2px 6px", fontSize: 10, marginInlineEnd: 2 }}>{pick(T.copyRow)}</button>
                        {(draft.rows || []).length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} style={{ ...buttonGhost, padding: "2px 6px", fontSize: 10, color: "#b91c1c" }}>{pick(T.removeRow)}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} style={{ ...buttonGhost, marginTop: 8, fontSize: 12 }}>{pick(T.addRow)}</button>

            <div style={{ marginTop: 12, padding: 10, background: "#fff7ed", borderRadius: 10, display: "flex", gap: 18, fontSize: 13, fontWeight: 800, flexWrap: "wrap" }}>
              <span>{pick(T.totalEq)}: <b>{total}</b></span>
              <span style={{ color: "#166534" }}>{pick(T.okCount)}: <b>{okCount}</b></span>
              <span style={{ color: "#b91c1c" }}>{pick(T.defCount)}: <b>{defCount}</b></span>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.notes)}</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hseManager)}</label><input type="text" value={draft.hseManager} onChange={(e) => setDraft({ ...draft, hseManager: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => { setTab("list"); setEditingId(null); setDraft(blank()); }} disabled={saving}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

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
