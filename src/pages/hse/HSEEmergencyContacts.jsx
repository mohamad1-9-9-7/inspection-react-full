// src/pages/hse/HSEEmergencyContacts.jsx
// F-31: قائمة جهات الاتصال للطوارئ — Emergency Contacts List (SBG-HSE-019)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "emergency_contacts";

const T = {
  title:        { ar: "📞 جهات اتصال الطوارئ (F-31) — Emergency Contacts List", en: "📞 Emergency Contacts List (F-31)" },
  subtitle:     { ar: "قائمة موحدة لاتصالات الطوارئ (مطابق SBG-HSE-019)",
                  en: "Consolidated emergency contacts list (per SBG-HSE-019)" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ قائمة جديدة", en: "+ New List" },
  reportNo:     { ar: "رقم القائمة", en: "List No." },
  date:         { ar: "تاريخ التحديث", en: "Update Date" },
  validUntil:   { ar: "صالح حتى", en: "Valid Until" },
  preparedBy:   { ar: "أعدّ القائمة", en: "Prepared By" },

  // Section 1
  s1Title:      { ar: "🏢 معلومات المنشأة", en: "🏢 Site Information" },
  siteAddr:     { ar: "عنوان المنشأة", en: "Site Address" },
  siteTel:      { ar: "هاتف المنشأة", en: "Site Tel" },
  contractsMgr: { ar: "مدير العقود", en: "Contracts Manager" },
  contractsTel: { ar: "هاتفه", en: "His Tel" },
  deputy:       { ar: "النائب", en: "Deputy" },
  deputyTel:    { ar: "هاتف النائب", en: "Deputy Tel" },
  location:     { ar: "الموقع الرئيسي", en: "Main Location" },

  // Section 2
  s2Title:      { ar: "🚨 السلطات المحلية (الإمارات)", en: "🚨 Local Authorities (UAE)" },
  s3Title:      { ar: "🏥 المستشفيات والعيادات", en: "🏥 Hospitals & Clinics" },
  s4Title:      { ar: "⚙️ السلطات النظامية", en: "⚙️ Statutory Authorities" },
  s5Title:      { ar: "🏛️ السلطات التنظيمية", en: "🏛️ Enforcing Authorities" },
  s6Title:      { ar: "📞 اتصالات أخرى خارج ساعات العمل", en: "📞 Other Out-of-Hours Contacts" },
  position:     { ar: "المنصب", en: "Position" },
  contactName:  { ar: "الاسم", en: "Name" },
  tel:          { ar: "الهاتف", en: "Tel" },
  alt:          { ar: "بديل", en: "Alt." },
  notes:        { ar: "ملاحظات", en: "Notes" },
  addRow:       { ar: "+ إضافة جهة", en: "+ Add Contact" },
  removeRow:    { ar: "حذف", en: "Remove" },

  saveBtn:      { ar: "💾 حفظ القائمة", en: "💾 Save List" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needPrep:     { ar: "أدخل اسم المُعِد", en: "Enter preparer name" },
  saved:        { ar: "✅ تم حفظ القائمة", en: "✅ List saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد قوائم", en: "No lists" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "تاريخ التحديث", en: "Update Date" },
    valid:     { ar: "صالح حتى", en: "Valid Until" },
    location:  { ar: "الموقع", en: "Location" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-31 · Emergency Contacts List · AL MAWASHI HSE",
                  en: "Form F-31 · Emergency Contacts List · AL MAWASHI HSE" },
};

const DEFAULT_LOCAL = [
  { position: { ar: "🚒 الإطفاء (الدفاع المدني)", en: "🚒 Fire (Civil Defence)" }, tel: "997" },
  { position: { ar: "🚓 الشرطة", en: "🚓 Police" }, tel: "999" },
  { position: { ar: "🚑 الإسعاف", en: "🚑 Ambulance" }, tel: "998" },
  { position: { ar: "📞 طوارئ موحد", en: "📞 Unified Emergency" }, tel: "112" },
  { position: { ar: "🚨 الإنقاذ البحري", en: "🚨 Coast Guard" }, tel: "996" },
  { position: { ar: "🌊 خدمة كهرباء/مياه (DEWA)", en: "🌊 Electricity/Water (DEWA)" }, tel: "991 / 922" },
];

const DEFAULT_HOSPITALS = [
  { position: { ar: "مستشفى راشد (دبي)", en: "Rashid Hospital (Dubai)" }, tel: "+971 4 219 2000" },
  { position: { ar: "مستشفى دبي (Dubai Hospital)", en: "Dubai Hospital" }, tel: "+971 4 219 5000" },
  { position: { ar: "مستشفى ميديكلينيك", en: "Mediclinic Hospital" }, tel: "" },
  { position: { ar: "مستوصف الشركة", en: "Company Clinic" }, tel: "" },
];

const DEFAULT_STATUTORY = [
  { position: { ar: "بلدية دبي (Dubai Municipality)", en: "Dubai Municipality" }, tel: "800 900" },
  { position: { ar: "MOHRE (وزارة الموارد البشرية)", en: "MOHRE (Ministry of HR)" }, tel: "600 590 000" },
  { position: { ar: "MoCCAE (التغير المناخي)", en: "MoCCAE (Climate Change)" }, tel: "" },
  { position: { ar: "ESMA / MoIAT", en: "ESMA / MoIAT" }, tel: "" },
];

const DEFAULT_ENFORCING = [
  { position: { ar: "🛡️ HSE Manager (داخلي)", en: "🛡️ HSE Manager (Internal)" }, tel: "" },
  { position: { ar: "🦺 ضابط الأمن (Security)", en: "🦺 Security Officer" }, tel: "" },
];

const DEFAULT_OTHER = [
  { position: { ar: "Project Manager", en: "Project Manager" }, name: "", tel: "" },
  { position: { ar: "Logistics Manager", en: "Logistics Manager" }, name: "", tel: "" },
  { position: { ar: "Site Manager", en: "Site Manager" }, name: "", tel: "" },
  { position: { ar: "HSE Manager", en: "HSE Manager" }, name: "", tel: "" },
  { position: { ar: "Maintenance Engineer", en: "Maintenance Engineer" }, name: "", tel: "" },
  { position: { ar: "Cold Chain Supervisor", en: "Cold Chain Supervisor" }, name: "", tel: "" },
];

const blank = () => ({
  reportNo: `EMC-${Date.now().toString().slice(-6)}`,
  date: todayISO(), validUntil: "", preparedBy: "",
  location: SITE_LOCATIONS[0].v,
  siteAddress: "", siteTel: "",
  contractsMgr: "", contractsTel: "", deputy: "", deputyTel: "",
  localAuthorities: DEFAULT_LOCAL.map((x) => ({
    position: x.position, name: "", tel: x.tel || "", alt: "", notes: "",
  })),
  hospitals: DEFAULT_HOSPITALS.map((x) => ({
    position: x.position, name: "", tel: x.tel || "", alt: "", notes: "",
  })),
  statutory: DEFAULT_STATUTORY.map((x) => ({
    position: x.position, name: "", tel: x.tel || "", alt: "", notes: "",
  })),
  enforcing: DEFAULT_ENFORCING.map((x) => ({
    position: x.position, name: "", tel: x.tel || "", alt: "", notes: "",
  })),
  others: DEFAULT_OTHER.map((x) => ({
    position: x.position, name: x.name || "", tel: x.tel || "", alt: "", notes: "",
  })),
});

export default function HSEEmergencyContacts() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function setRow(group, idx, field, val) {
    setDraft((d) => {
      const arr = [...(d[group] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, [group]: arr };
    });
  }
  function addRow(group) {
    setDraft((d) => ({ ...d, [group]: [...(d[group] || []), { position: { ar: "", en: "" }, name: "", tel: "", alt: "", notes: "" }] }));
  }
  function removeRow(group, idx) {
    setDraft((d) => ({ ...d, [group]: d[group].filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!draft.preparedBy.trim()) { alert(pick(T.needPrep)); return; }
    setSaving(true);
    try {
      await apiSave(TYPE, draft, draft.preparedBy || "HSE");
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setTab("list");
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
              <div><label style={labelStyle}>{pick(T.validUntil)}</label><input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.siteAddr)}</label><input type="text" value={draft.siteAddress} onChange={(e) => setDraft({ ...draft, siteAddress: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.siteTel)}</label><input type="tel" value={draft.siteTel} onChange={(e) => setDraft({ ...draft, siteTel: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.contractsMgr)}</label><input type="text" value={draft.contractsMgr} onChange={(e) => setDraft({ ...draft, contractsMgr: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.contractsTel)}</label><input type="tel" value={draft.contractsTel} onChange={(e) => setDraft({ ...draft, contractsTel: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.deputy)}</label><input type="text" value={draft.deputy} onChange={(e) => setDraft({ ...draft, deputy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.deputyTel)}</label><input type="tel" value={draft.deputyTel} onChange={(e) => setDraft({ ...draft, deputyTel: e.target.value })} style={inputStyle} /></div>
            </div>

            {[
              ["localAuthorities", T.s2Title, "#fee2e2"],
              ["hospitals", T.s3Title, "#dbeafe"],
              ["statutory", T.s4Title, "#fef3c7"],
              ["enforcing", T.s5Title, "#dcfce7"],
              ["others", T.s6Title, "#fff7ed"],
            ].map(([group, titleKey, bg]) => (
              <ContactSection
                key={group} group={group} title={pick(titleKey)} bg={bg}
                rows={draft[group]} setRow={setRow} addRow={addRow} removeRow={removeRow}
                pick={pick} t={T} lang={lang}
              />
            ))}

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => setTab("list")} disabled={saving}>{pick(T.cancel)}</button>
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
                  <th style={thStyle}>{pick(T.cols.valid)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{it.validUntil || "—"}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="5" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
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
              maxWidth: 1000, width: "100%", maxHeight: "92vh", overflow: "auto",
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
                <div><b>{pick(T.validUntil)}: </b>{viewing.validUntil || "—"}</div>
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.siteAddr)}: </b>{viewing.siteAddress || "—"}</div>
                <div><b>{pick(T.siteTel)}: </b>{viewing.siteTel || "—"}</div>
                <div><b>{pick(T.contractsMgr)}: </b>{viewing.contractsMgr || "—"} · {viewing.contractsTel}</div>
                <div><b>{pick(T.deputy)}: </b>{viewing.deputy || "—"} · {viewing.deputyTel}</div>
              </div>

              {[
                ["localAuthorities", T.s2Title],
                ["hospitals", T.s3Title],
                ["statutory", T.s4Title],
                ["enforcing", T.s5Title],
                ["others", T.s6Title],
              ].map(([group, titleKey]) => {
                const rows = viewing[group] || [];
                if (!rows.length) return null;
                return (
                  <ViewBlock key={group} title={pick(titleKey)}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ ...tableStyle, fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={thStyle}>{pick(T.position)}</th>
                            <th style={thStyle}>{pick(T.contactName)}</th>
                            <th style={thStyle}>{pick(T.tel)}</th>
                            <th style={thStyle}>{pick(T.alt)}</th>
                            <th style={thStyle}>{pick(T.notes)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i}>
                              <td style={{ ...tdStyle, fontWeight: 800 }}>{typeof r.position === "object" ? r.position[lang] : r.position}</td>
                              <td style={tdStyle}>{r.name || "—"}</td>
                              <td style={{ ...tdStyle, fontWeight: 800 }}>{r.tel || "—"}</td>
                              <td style={tdStyle}>{r.alt || "—"}</td>
                              <td style={tdStyle}>{r.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ViewBlock>
                );
              })}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                fontSize: 13,
              }}>
                <b>{pick(T.preparedBy)}: </b>{viewing.preparedBy || "_______________"}
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

function ContactSection({ group, title, bg, rows, setRow, addRow, removeRow, pick, t, lang }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{
        marginBottom: 10,
        fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark,
        padding: "8px 12px", borderRadius: 10,
        background: bg,
      }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>{pick(t.position)}</th>
              <th style={thStyle}>{pick(t.contactName)}</th>
              <th style={thStyle}>{pick(t.tel)}</th>
              <th style={thStyle}>{pick(t.alt)}</th>
              <th style={thStyle}>{pick(t.notes)}</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, i) => {
              const posStr = typeof r.position === "object" ? r.position[lang] : r.position;
              const isStatic = typeof r.position === "object";
              return (
                <tr key={i}>
                  <td style={tdStyle}>
                    {isStatic ? (
                      <span style={{ fontWeight: 800 }}>{posStr}</span>
                    ) : (
                      <input type="text" value={r.position || ""} onChange={(e) => setRow(group, i, "position", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                    )}
                  </td>
                  <td style={tdStyle}><input type="text" value={r.name || ""} onChange={(e) => setRow(group, i, "name", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                  <td style={tdStyle}><input type="tel" value={r.tel || ""} onChange={(e) => setRow(group, i, "tel", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                  <td style={tdStyle}><input type="tel" value={r.alt || ""} onChange={(e) => setRow(group, i, "alt", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                  <td style={tdStyle}><input type="text" value={r.notes || ""} onChange={(e) => setRow(group, i, "notes", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                  <td style={tdStyle}>
                    <button type="button" onClick={() => removeRow(group, i)} style={{ ...buttonGhost, padding: "3px 8px", fontSize: 11, color: "#b91c1c" }}>{pick(t.removeRow)}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addRow(group)} style={{ ...buttonGhost, marginTop: 6, fontSize: 12 }}>{pick(t.addRow)}</button>
    </div>
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
