// src/pages/hse/HSEPreliminaryAccident.jsx
// F-23: التقرير الأوّلي للحوادث (24 ساعة) — Preliminary Accident Report (SBG-HSE-004)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "preliminary_accident_reports";

const T = {
  title:        { ar: "⚠️ التقرير الأوّلي للحادث (F-23) — Preliminary Accident Report", en: "⚠️ Preliminary Accident Report (F-23)" },
  subtitle:     { ar: "تقرير سريع خلال 24 ساعة (مطابق SBG-HSE-004) — يُتبع بتقرير نهائي F-25",
                  en: "Rapid 24-hour report (per SBG-HSE-004) — followed by Final Report F-25" },
  notice:       { ar: "⏰ يجب تسليم هذا التقرير خلال 3 أيام من وقوع الحادث",
                  en: "⏰ This report must be submitted within 3 days of the accident" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },

  // Section 1
  s1Title:      { ar: "🏷️ نوع الحادث", en: "🏷️ Accident Type" },
  typeMVA:      { ar: "حادث مركبة", en: "Motor Vehicle Accident" },
  typeInjury:   { ar: "إصابة شخصية", en: "Personal Injury" },
  typeEnv:      { ar: "بيئي", en: "Environmental" },
  typeNM:       { ar: "شبه حادث", en: "Near Miss" },
  typeFire:     { ar: "حريق", en: "Fire" },
  typeProperty: { ar: "أضرار ممتلكات", en: "Property Damage" },

  // Section 2
  s2Title:      { ar: "🕐 تفاصيل الحادث", en: "🕐 Accident Details" },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  description:  { ar: "وصف ما حدث", en: "Describe What Happened" },
  immediate:    { ar: "الإجراءات الفورية لمنع التكرار", en: "Immediate Corrective Actions" },

  // Section 3
  s3Title:      { ar: "👥 الأشخاص المعنيون", en: "👥 Persons Involved" },
  company:      { ar: "الشركة", en: "Company" },
  injName:      { ar: "اسم/أسماء المصابين والشارة#", en: "Injured Name(s) & Badge #" },
  injuryDesc:   { ar: "نوع الإصابة / المرض", en: "Injury or Illness Description" },
  witness:      { ar: "أقوال الشهود", en: "Witness Statement(s)" },

  // Section 4 (MVA only)
  s4Title:      { ar: "🚗 معلومات مركبة (إذا حادث مركبة)", en: "🚗 Motor Vehicle (If MVA)" },
  driverName:   { ar: "اسم السائق", en: "Driver Name" },
  driverBadge:  { ar: "رقم شارة السائق", en: "Driver Badge No." },
  vehiclePlate: { ar: "رقم/لوحة المركبة", en: "Vehicle # / Plate #" },
  ppl1:         { ar: "عدد ركاب المركبة 1", en: "No. people in 1st vehicle" },
  inj1:         { ar: "كم مصاب؟ (مركبة 1)", en: "How many injured? (V1)" },
  belt1:        { ar: "حزام أمان؟ (مركبة 1)", en: "Wearing seat belts? (V1)" },
  ppl2:         { ar: "عدد ركاب المركبة 2", en: "No. people in 2nd vehicle" },
  inj2:         { ar: "كم مصاب؟ (مركبة 2)", en: "How many injured? (V2)" },
  belt2:        { ar: "حزام أمان؟ (مركبة 2)", en: "Wearing seat belts? (V2)" },

  // Section 5
  s5Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  position:     { ar: "الوظيفة", en: "Position" },
  cmRep:        { ar: "ممثل الإدارة (CM)", en: "CM Representative" },

  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needDesc:     { ar: "اكتب وصف الحادث", en: "Enter accident description" },
  saved:        { ar: "✅ تم حفظ التقرير", en: "✅ Report saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تقارير", en: "No reports" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    type:      { ar: "النوع", en: "Type" },
    location:  { ar: "الموقع", en: "Location" },
    injured:   { ar: "المصاب", en: "Injured" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-23 · Preliminary Accident Report · AL MAWASHI HSE",
                  en: "Form F-23 · Preliminary Accident Report · AL MAWASHI HSE" },
};

const ACC_TYPES = [
  { v: "mva",      key: "typeMVA" },
  { v: "injury",   key: "typeInjury" },
  { v: "env",      key: "typeEnv" },
  { v: "nm",       key: "typeNM" },
  { v: "fire",     key: "typeFire" },
  { v: "property", key: "typeProperty" },
];

const blank = () => ({
  reportNo: `PAR-${Date.now().toString().slice(-6)}`,
  date: todayISO(), time: nowHHMM(),
  location: SITE_LOCATIONS[0].v, area: "",
  accTypes: {},
  description: "", immediateActions: "",
  company: "", injuredName: "", injuryDesc: "", witnessStatements: "",
  // MVA fields
  driverName: "", driverBadge: "", vehiclePlate: "",
  v1People: "", v1Injured: "", v1Belt: "",
  v2People: "", v2Injured: "", v2Belt: "",
  // Approvals
  preparedBy: "", preparedPos: "",
  cmRep: "", cmRepPos: "",
});

export default function HSEPreliminaryAccident() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function toggleType(v) {
    setDraft((d) => ({ ...d, accTypes: { ...d.accTypes, [v]: !d.accTypes[v] } }));
  }

  function save() {
    if (!draft.description.trim()) { alert(pick(T.needDesc)); return; }
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

  const isMVA = !!draft.accTypes?.mva;

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
            <div style={{ padding: 10, background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#854d0e", marginBottom: 14 }}>
              {pick(T.notice)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              {ACC_TYPES.map((tt) => (
                <label key={tt.v} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  background: draft.accTypes[tt.v] ? "#fed7aa" : "#fff",
                  cursor: "pointer", border: `1px solid ${draft.accTypes[tt.v] ? "#9a3412" : "rgba(120,53,15,0.18)"}`,
                  fontSize: 13, fontWeight: 700,
                }}>
                  <input type="checkbox" checked={!!draft.accTypes[tt.v]} onChange={() => toggleType(tt.v)} />
                  {pick(T[tt.key])}
                </label>
              ))}
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div>
              <label style={labelStyle}>{pick(T.description)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 80 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.immediate)}</label>
              <textarea value={draft.immediateActions} onChange={(e) => setDraft({ ...draft, immediateActions: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.company)}</label><input type="text" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.injName)}</label><input type="text" value={draft.injuredName} onChange={(e) => setDraft({ ...draft, injuredName: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.injuryDesc)}</label>
              <textarea value={draft.injuryDesc} onChange={(e) => setDraft({ ...draft, injuryDesc: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.witness)}</label>
              <textarea value={draft.witnessStatements} onChange={(e) => setDraft({ ...draft, witnessStatements: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            {isMVA && (
              <>
                <SectionHeader title={pick(T.s4Title)} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>{pick(T.driverName)}</label><input type="text" value={draft.driverName} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.driverBadge)}</label><input type="text" value={draft.driverBadge} onChange={(e) => setDraft({ ...draft, driverBadge: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.vehiclePlate)}</label><input type="text" value={draft.vehiclePlate} onChange={(e) => setDraft({ ...draft, vehiclePlate: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.ppl1)}</label><input type="number" value={draft.v1People} onChange={(e) => setDraft({ ...draft, v1People: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.inj1)}</label><input type="number" value={draft.v1Injured} onChange={(e) => setDraft({ ...draft, v1Injured: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.belt1)}</label><input type="text" value={draft.v1Belt} onChange={(e) => setDraft({ ...draft, v1Belt: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.ppl2)}</label><input type="number" value={draft.v2People} onChange={(e) => setDraft({ ...draft, v2People: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.inj2)}</label><input type="number" value={draft.v2Injured} onChange={(e) => setDraft({ ...draft, v2Injured: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.belt2)}</label><input type="text" value={draft.v2Belt} onChange={(e) => setDraft({ ...draft, v2Belt: e.target.value })} style={inputStyle} /></div>
                </div>
              </>
            )}

            <SectionHeader title={pick(T.s5Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.position)}</label><input type="text" value={draft.preparedPos} onChange={(e) => setDraft({ ...draft, preparedPos: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.cmRep)}</label><input type="text" value={draft.cmRep} onChange={(e) => setDraft({ ...draft, cmRep: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.position)}</label><input type="text" value={draft.cmRepPos} onChange={(e) => setDraft({ ...draft, cmRepPos: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
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
                  <th style={thStyle}>{pick(T.cols.type)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.injured)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const typeStr = ACC_TYPES.filter((tt) => it.accTypes?.[tt.v]).map((tt) => pick(T[tt.key])).join(", ") || "—";
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date} · {it.time}</td>
                      <td style={tdStyle}>{typeStr}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{it.injuredName || "—"}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="6" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
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
              maxWidth: 900, width: "100%", maxHeight: "92vh", overflow: "auto",
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
                <div><b>{pick(T.date)}: </b>{viewing.date} · {viewing.time}</div>
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.area)}: </b>{viewing.area || "—"}</div>
              </div>

              <ViewBlock title={pick(T.s1Title)}>
                {ACC_TYPES.filter((tt) => viewing.accTypes?.[tt.v]).map((tt) => (
                  <span key={tt.v} style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 6,
                    background: "#fed7aa", color: "#9a3412", fontSize: 12, fontWeight: 800, marginInlineEnd: 6, marginBottom: 4,
                  }}>{pick(T[tt.key])}</span>
                ))}
              </ViewBlock>

              {viewing.description && (
                <ViewBlock title={pick(T.description)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.description}</div></ViewBlock>
              )}
              {viewing.immediateActions && (
                <ViewBlock title={pick(T.immediate)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.immediateActions}</div></ViewBlock>
              )}

              <ViewBlock title={pick(T.s3Title)}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6, fontSize: 13 }}>
                  <div><b>{pick(T.company)}: </b>{viewing.company || "—"}</div>
                  <div><b>{pick(T.injName)}: </b>{viewing.injuredName || "—"}</div>
                </div>
                {viewing.injuryDesc && <div style={{ marginTop: 8, fontSize: 13 }}><b>{pick(T.injuryDesc)}: </b><div style={{ whiteSpace: "pre-wrap" }}>{viewing.injuryDesc}</div></div>}
                {viewing.witnessStatements && <div style={{ marginTop: 8, fontSize: 13 }}><b>{pick(T.witness)}: </b><div style={{ whiteSpace: "pre-wrap" }}>{viewing.witnessStatements}</div></div>}
              </ViewBlock>

              {viewing.accTypes?.mva && (
                <ViewBlock title={pick(T.s4Title)}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 6, fontSize: 13 }}>
                    <div><b>{pick(T.driverName)}: </b>{viewing.driverName || "—"}</div>
                    <div><b>{pick(T.driverBadge)}: </b>{viewing.driverBadge || "—"}</div>
                    <div><b>{pick(T.vehiclePlate)}: </b>{viewing.vehiclePlate || "—"}</div>
                    <div><b>{pick(T.ppl1)}: </b>{viewing.v1People || "—"}</div>
                    <div><b>{pick(T.inj1)}: </b>{viewing.v1Injured || "—"}</div>
                    <div><b>{pick(T.belt1)}: </b>{viewing.v1Belt || "—"}</div>
                    <div><b>{pick(T.ppl2)}: </b>{viewing.v2People || "—"}</div>
                    <div><b>{pick(T.inj2)}: </b>{viewing.v2Injured || "—"}</div>
                    <div><b>{pick(T.belt2)}: </b>{viewing.v2Belt || "—"}</div>
                  </div>
                </ViewBlock>
              )}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.preparedBy)} ({viewing.preparedPos || "—"})</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.cmRep)} ({viewing.cmRepPos || "—"})</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.cmRep || "_______________"}</div>
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

function ViewBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      {children}
    </div>
  );
}
