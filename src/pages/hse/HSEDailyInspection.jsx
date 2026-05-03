// src/pages/hse/HSEDailyInspection.jsx
// F-04: التفتيش اليومي على الموقع — bilingual + view + print

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "daily_inspections";

const T = {
  pageTitle:    { ar: "📋 التفتيش اليومي (F-04) — Daily Inspection", en: "📋 Daily Inspection (F-04)" },
  pageSubtitle: { ar: "قائمة فحص يومية مفصّلة في 8 محاور", en: "Detailed daily checklist across 8 axes" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تفتيش جديد", en: "+ New Inspection" },
  reportNo:     { ar: "رقم التفتيش", en: "Inspection No." },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  inspector:    { ar: "المفتش", en: "Inspector" },
  location:     { ar: "الموقع", en: "Location" },
  shift:        { ar: "الورديّة", en: "Shift" },
  shiftMorning: { ar: "صباحية", en: "Morning" },
  shiftEvening: { ar: "مسائية", en: "Evening" },
  shiftNight:   { ar: "ليلية", en: "Night" },
  liveStatsOk:  { ar: "✅ مطابق:", en: "✅ Pass:" },
  liveStatsFail:{ ar: "❌ مخالف:", en: "❌ Fail:" },
  liveStatsNa:  { ar: "⊘ غير مطبق:", en: "⊘ N/A:" },
  liveStatsTotal:{ ar: "الإجمالي المُجاب:", en: "Total answered:" },
  observations: { ar: "ملاحظات إضافية", en: "Additional Observations" },
  capa:         { ar: "إجراءات تصحيحية مطلوبة", en: "Corrective Actions Required" },
  followUp:     { ar: "تاريخ المتابعة", en: "Follow-up Date" },
  saveBtn:      { ar: "💾 حفظ التفتيش", en: "💾 Save Inspection" },
  clearBtn:     { ar: "🔄 مسح", en: "🔄 Clear" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needInspector:{ ar: "أدخل اسم المفتش", en: "Enter inspector's name" },
  saved:        { ar: "✅ تم حفظ التفتيش", en: "✅ Inspection saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  noRecords:    { ar: "لا يوجد تفتيش بعد", en: "No inspections yet" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    location:  { ar: "الموقع", en: "Location" },
    shift:     { ar: "الورديّة", en: "Shift" },
    inspector: { ar: "المفتش", en: "Inspector" },
    result:    { ar: "النتيجة", en: "Result" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  // print modal
  modalTitle:   { ar: "📋 تقرير التفتيش اليومي — F-04", en: "📋 Daily Inspection Report — F-04" },
  modalSubtitle:{ ar: "AL MAWASHI · قسم HSE · Trans Emirates Livestock Trading L.L.C.",
                  en: "AL MAWASHI · HSE Department · Trans Emirates Livestock Trading L.L.C." },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  close:        { ar: "✖ إغلاق", en: "✖ Close" },
  noLabel:      { ar: "🔢 الرقم:", en: "🔢 No.:" },
  dateLabel:    { ar: "📅 التاريخ:", en: "📅 Date:" },
  timeLabel:    { ar: "🕐 الوقت:", en: "🕐 Time:" },
  locLabel:     { ar: "📍 الموقع:", en: "📍 Location:" },
  shiftLabel:   { ar: "🌅 الورديّة:", en: "🌅 Shift:" },
  inspectorLabel:{ ar: "👤 المفتش:", en: "👤 Inspector:" },
  notesLabel:   { ar: "📝 الملاحظات:", en: "📝 Notes:" },
  capaLabel:    { ar: "⚠️ إجراءات تصحيحية مطلوبة:", en: "⚠️ Corrective actions required:" },
  followUpLabel:{ ar: "📅 تاريخ المتابعة:", en: "📅 Follow-up date:" },
  signInspector:{ ar: "توقيع المفتش", en: "Inspector Signature" },
  signHse:      { ar: "توقيع HSE Manager", en: "HSE Manager Signature" },
  signSiteMgr:  { ar: "توقيع مدير الموقع", en: "Site Manager Signature" },
  formFooter:   { ar: "Form F-04 · HSE Daily Site Inspection · AL MAWASHI Quality & Food Safety System",
                  en: "Form F-04 · HSE Daily Site Inspection · AL MAWASHI Quality & Food Safety System" },
};

const CHECKLIST = [
  { id: "ppe", title: { ar: "1. معدات الوقاية الشخصية (PPE)", en: "1. Personal Protective Equipment (PPE)" }, items: [
    { ar: "ارتداء جميع العاملين للمعاطف المعزولة في الغرف الباردة", en: "All workers wear insulated coats in cold rooms" },
    { ar: "القفازات المقاومة للقطع لعمال خط التصنيع", en: "Cut-resistant gloves for processing line workers" },
    { ar: "أحذية مضادة للانزلاق متوفرة وسليمة", en: "Anti-slip boots available and intact" },
    { ar: "خوذات السلامة للعمل في المستودع", en: "Safety helmets for warehouse work" },
    { ar: "أقنعة الوجه/الشبكات لعمال الغذاء", en: "Face masks/hairnets for food handlers" },
  ]},
  { id: "temp", title: { ar: "2. درجات الحرارة وسلسلة التبريد", en: "2. Temperature & Cold Chain" }, items: [
    { ar: "غرف التبريد بين 0 إلى +4°م", en: "Chiller rooms between 0 to +4°C" },
    { ar: "غرف التجميد عند -18°م أو أقل", en: "Freezer rooms at -18°C or below" },
    { ar: "أجهزة التسجيل (Data Loggers) تعمل ومُعايَرة", en: "Data loggers operating and calibrated" },
    { ar: "إنذار الغرف الباردة يعمل", en: "Cold room alarm functioning" },
    { ar: "بوابات التبريد مغلقة ومحكمة", en: "Refrigeration doors closed and sealed" },
  ]},
  { id: "hyg", title: { ar: "3. النظافة والتعقيم", en: "3. Hygiene & Sanitation" }, items: [
    { ar: "أحواض غسل اليدين تعمل ومزوّدة بالصابون", en: "Hand-wash sinks working with soap supplied" },
    { ar: "محطات التعقيم متوفرة ومعبأة", en: "Sanitizing stations available and refilled" },
    { ar: "أرضيات التصنيع نظيفة وجافة", en: "Processing floors clean and dry" },
    { ar: "أدوات منفصلة للحوم النيئة والمجهزة (ألوان مختلفة)", en: "Separate tools for raw vs processed meat (color-coded)" },
    { ar: "حاويات النفايات مغطاة وغير ممتلئة", en: "Waste containers covered and not overflowing" },
  ]},
  { id: "fire", title: { ar: "4. أنظمة الإطفاء والطوارئ", en: "4. Fire & Emergency Systems" }, items: [
    { ar: "طفايات الحريق سارية المفعول وفي مواقعها", en: "Fire extinguishers in date and in place" },
    { ar: "ممرات الطوارئ خالية من الحواجز", en: "Emergency aisles clear of obstacles" },
    { ar: "إنارة الطوارئ تعمل", en: "Emergency lighting operational" },
    { ar: "كواشف الدخان والإنذار تعمل", en: "Smoke detectors & alarm working" },
    { ar: "خراطيم الإطفاء سليمة وغير متضررة", en: "Fire hoses intact and undamaged" },
  ]},
  { id: "amm", title: { ar: "5. غازات التبريد والكواشف", en: "5. Refrigerant Gases & Detectors" }, items: [
    { ar: "كواشف الأمونيا (NH3) تعمل", en: "Ammonia (NH3) detectors operational" },
    { ar: "كواشف الفريون / CO تعمل", en: "Freon / CO detectors operational" },
    { ar: "نظام التهوية الطارئة في غرف التبريد جاهز", en: "Emergency ventilation in refrigeration rooms ready" },
    { ar: "أقنعة واقية متوفرة قرب غرف الماكينات", en: "Respirators available near plant rooms" },
    { ar: "لا توجد روائح غاز مشبوهة", en: "No suspicious gas odors" },
  ]},
  { id: "fork", title: { ar: "6. الرافعات الشوكية والمعدات", en: "6. Forklifts & Equipment" }, items: [
    { ar: "الفحص اليومي للرافعات تم", en: "Daily forklift inspection completed" },
    { ar: "السائقون يحملون رخصاً سارية", en: "Drivers hold valid licenses" },
    { ar: "ممرات المشاة محددة وواضحة", en: "Pedestrian aisles defined and visible" },
    { ar: "السرعة ضمن الحد المسموح (10 كم/س)", en: "Speed within allowed limit (10 km/h)" },
    { ar: "لا توجد بضائع متراكمة في الممرات", en: "No goods piled in aisles" },
  ]},
  { id: "pest", title: { ar: "7. مكافحة الحشرات والقوارض", en: "7. Pest & Rodent Control" }, items: [
    { ar: "المصائد سليمة وفي مواقعها", en: "Traps intact and in place" },
    { ar: "لا توجد آثار قوارض/حشرات داخل المستودع", en: "No rodent/pest signs in the warehouse" },
    { ar: "الفتحات الخارجية مغلقة بإحكام", en: "External openings sealed tightly" },
    { ar: "زيارة شركة مكافحة الحشرات في موعدها", en: "Pest-control company visit on schedule" },
  ]},
  { id: "elec", title: { ar: "8. الكهرباء والصيانة", en: "8. Electrical & Maintenance" }, items: [
    { ar: "اللوحات الكهربائية مغلقة", en: "Electrical panels closed" },
    { ar: "لا توجد أسلاك مكشوفة", en: "No exposed wires" },
    { ar: "إجراءات LOTO مفعّلة عند الصيانة", en: "LOTO procedures applied during maintenance" },
    { ar: "صيانة الأنظمة في موعدها", en: "Systems maintenance on schedule" },
  ]},
];

const blank = () => ({
  reportNo: `INS-${Date.now().toString().slice(-6)}`,
  date: todayISO(), time: nowHHMM(),
  inspector: "", location: SITE_LOCATIONS[0].v, shift: "morning",
  results: {}, observations: "", correctiveActionsRequired: "", followUpDate: "",
});

export default function HSEDailyInspection() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setResult(itemKey, val) {
    setDraft((d) => ({ ...d, results: { ...d.results, [itemKey]: val } }));
  }
  function save() {
    if (!draft.inspector.trim()) { alert(pick(T.needInspector)); return; }
    appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    alert(pick(T.saved));
    setDraft(blank()); setTab("list");
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id);
    setItems(loadLocal(TYPE));
  }

  const stats = useMemo(() => {
    const all = Object.values(draft.results);
    return { ok: all.filter(v => v === "ok").length, fail: all.filter(v => v === "fail").length, na: all.filter(v => v === "na").length, total: all.length };
  }, [draft.results]);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.inspector)}</label><input type="text" value={draft.inspector} onChange={(e) => setDraft({ ...draft, inspector: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.shift)}</label>
                <select value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value })} style={inputStyle}>
                  <option value="morning">{pick(T.shiftMorning)}</option>
                  <option value="evening">{pick(T.shiftEvening)}</option>
                  <option value="night">{pick(T.shiftNight)}</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff7ed", border: "1px dashed rgba(120,53,15,0.18)", display: "flex", gap: 14, fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: "#166534" }}>{pick(T.liveStatsOk)} {stats.ok}</span>
              <span style={{ color: "#b91c1c" }}>{pick(T.liveStatsFail)} {stats.fail}</span>
              <span style={{ color: "#64748b" }}>{pick(T.liveStatsNa)} {stats.na}</span>
              <span>{pick(T.liveStatsTotal)} {stats.total}</span>
            </div>

            {CHECKLIST.map((sec) => (
              <div key={sec.id} style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(sec.title)}</div>
                {sec.items.map((it, idx) => {
                  const key = `${sec.id}-${idx}`;
                  const val = draft.results[key];
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(120,53,15,0.08)", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>{pick(it)}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { v: "ok", label: "✅", color: "#dcfce7", border: "#166534" },
                          { v: "fail", label: "❌", color: "#fee2e2", border: "#b91c1c" },
                          { v: "na", label: "⊘", color: "#f1f5f9", border: "#64748b" },
                        ].map((opt) => (
                          <button key={opt.v} type="button" onClick={() => setResult(key, opt.v)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            background: val === opt.v ? opt.color : "#fff",
                            border: `2px solid ${val === opt.v ? opt.border : "rgba(120,53,15,0.18)"}`,
                            cursor: "pointer", fontWeight: 800, fontSize: 13,
                          }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.observations)}</label>
              <textarea value={draft.observations} onChange={(e) => setDraft({ ...draft, observations: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.capa)}</label>
              <textarea value={draft.correctiveActionsRequired} onChange={(e) => setDraft({ ...draft, correctiveActionsRequired: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.followUp)}</label>
              <input type="date" value={draft.followUpDate} onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })} style={{ ...inputStyle, maxWidth: 250 }} />
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => setDraft(blank())}>{pick(T.clearBtn)}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{pick(T.cancel)}</button>
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
                  <th style={thStyle}>{pick(T.cols.shift)}</th>
                  <th style={thStyle}>{pick(T.cols.inspector)}</th>
                  <th style={thStyle}>{pick(T.cols.result)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const all = Object.values(it.results || {});
                  const ok = all.filter((v) => v === "ok").length;
                  const fail = all.filter((v) => v === "fail").length;
                  const total = all.length;
                  const passRate = total ? Math.round((ok / total) * 100) : 0;
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date} · {it.time}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{it.shift === "morning" ? pick(T.shiftMorning) : it.shift === "evening" ? pick(T.shiftEvening) : pick(T.shiftNight)}</td>
                      <td style={tdStyle}>{it.inspector}</td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 800, color: passRate >= 80 ? "#166534" : passRate >= 60 ? "#854d0e" : "#b91c1c" }}>
                          {passRate}% ✅
                        </span>
                        {fail > 0 && <span style={{ color: "#b91c1c", marginInlineStart: 8 }}>· {fail} {lang === "ar" ? "مخالفة" : "fail"}</span>}
                      </td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
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
              maxWidth: 800, width: "100%", maxHeight: "92vh", overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)", direction: dir,
            }}>
              <div style={{
                borderBottom: `3px solid ${HSE_COLORS.primary}`, paddingBottom: 12, marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.modalTitle)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{pick(T.modalSubtitle)}</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.close)}</button>
                </div>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16,
              }}>
                <div><b>{pick(T.noLabel)}</b> {viewing.reportNo}</div>
                <div><b>{pick(T.dateLabel)}</b> {viewing.date}</div>
                <div><b>{pick(T.timeLabel)}</b> {viewing.time}</div>
                <div><b>{pick(T.locLabel)}</b> {(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.shiftLabel)}</b> {viewing.shift === "morning" ? pick(T.shiftMorning) : viewing.shift === "evening" ? pick(T.shiftEvening) : pick(T.shiftNight)}</div>
                <div><b>{pick(T.inspectorLabel)}</b> {viewing.inspector}</div>
              </div>

              {(() => {
                const all = Object.values(viewing.results || {});
                const ok = all.filter((v) => v === "ok").length;
                const fail = all.filter((v) => v === "fail").length;
                const na = all.filter((v) => v === "na").length;
                const passRate = all.length ? Math.round((ok / all.length) * 100) : 0;
                const scoreBg = passRate >= 80 ? "#dcfce7" : passRate >= 60 ? "#fef9c3" : "#fee2e2";
                const scoreColor = passRate >= 80 ? "#166534" : passRate >= 60 ? "#854d0e" : "#b91c1c";
                return (
                  <div style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: scoreBg, color: scoreColor, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {pick(T.liveStatsOk)} <b>{ok}</b> · {pick(T.liveStatsFail)} <b>{fail}</b> · {pick(T.liveStatsNa)} <b>{na}</b>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 950 }}>{passRate}%</div>
                  </div>
                );
              })()}

              {CHECKLIST.map((sec) => (
                <div key={sec.id} style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                  <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{pick(sec.title)}</div>
                  {sec.items.map((it, i) => {
                    const key = `${sec.id}-${i}`;
                    const val = viewing.results?.[key];
                    const sym = val === "ok" ? "✅" : val === "fail" ? "❌" : val === "na" ? "⊘" : "—";
                    const symColor = val === "ok" ? "#166534" : val === "fail" ? "#b91c1c" : "#64748b";
                    const rowBg = val === "fail" ? "#fee2e2" : "transparent";
                    return (
                      <div key={key} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 8px", borderBottom: "1px solid rgba(120,53,15,0.08)",
                        fontSize: 12, background: rowBg, borderRadius: 6,
                      }}>
                        <div style={{ flex: 1 }}>{pick(it)}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: symColor, minWidth: 30, textAlign: "center" }}>{sym}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {viewing.observations && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fef9c3", border: "1px solid #fde047" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#854d0e" }}>{pick(T.notesLabel)}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{viewing.observations}</div>
                </div>
              )}

              {viewing.correctiveActionsRequired && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fee2e2", border: "1px solid #fca5a5" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#7f1d1d" }}>{pick(T.capaLabel)}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{viewing.correctiveActionsRequired}</div>
                  {viewing.followUpDate && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#7f1d1d" }}>
                      {pick(T.followUpLabel)} <b>{viewing.followUpDate}</b>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signInspector)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.inspector || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signHse)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>_______________</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signSiteMgr)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>_______________</div>
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
