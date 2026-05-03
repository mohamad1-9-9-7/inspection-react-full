// src/pages/hse/HSENearMiss.jsx
// F-02: تقرير شبه حادث — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS, HAZARD_CATEGORIES,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "near_miss_reports";

const T = {
  pageTitle:    { ar: "👁️ شبه حادث (F-02) — Near-Miss", en: "👁️ Near-Miss (F-02)" },
  pageSubtitle: { ar: "المستهدف: ≥ 10 بلاغات شهرياً · هذا الشهر:", en: "Target: ≥10 reports/month · This month:" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ بلاغ جديد", en: "+ New Report" },
  hint:         { ar: "💡 شبه الحوادث هي مؤشرات تحذير للحوادث الحقيقية. الإبلاغ عنها واجب يحمي الجميع.",
                  en: "💡 Near-misses are early-warning indicators of real accidents. Reporting them protects everyone." },
  reportNo:     { ar: "رقم البلاغ", en: "Report No." },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  reporter:     { ar: "المُبلِّغ (اختياري)", en: "Reporter (optional)" },
  anonymous:    { ar: "بلاغ مجهول الهوية (Anonymous)", en: "Anonymous report" },
  anonLabel:    { ar: "مجهول", en: "Anonymous" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  category:     { ar: "تصنيف الخطر المحتمل", en: "Potential Hazard Category" },
  desc:         { ar: "وصف ما حدث (Near-miss)", en: "What happened (Near-miss)" },
  descPh:       { ar: "مثلاً: كادت رافعة شوكية تصدم عاملاً عند تقاطع الممر…",
                  en: "e.g., A forklift nearly hit a worker at a corridor intersection…" },
  consequence:  { ar: "العواقب المحتملة لو وقع الحادث", en: "Potential consequences if it had occurred" },
  immediate:    { ar: "الإجراء الفوري المتخذ", en: "Immediate action taken" },
  prevention:   { ar: "اقتراح للوقاية المستقبلية", en: "Suggestion for future prevention" },
  saveBtn:      { ar: "💾 حفظ البلاغ", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needDesc:     { ar: "اكتب وصف ما حدث", en: "Enter what happened" },
  saved:        { ar: "✅ شكراً للإبلاغ — كل بلاغ يحفظ حياة!", en: "✅ Thank you for reporting — every report saves a life!" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  noRecords:    { ar: "لا توجد بلاغات بعد", en: "No reports yet" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    location:  { ar: "الموقع", en: "Location" },
    category:  { ar: "التصنيف", en: "Category" },
    desc:      { ar: "الوصف", en: "Description" },
    reporter:  { ar: "المُبلِّغ", en: "Reporter" },
    status:    { ar: "الحالة", en: "Status" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  stNew:      { ar: "🆕 جديد", en: "🆕 New" },
  stReviewed: { ar: "🔵 مُراجَع", en: "🔵 Reviewed" },
  stClosed:   { ar: "✅ مغلق", en: "✅ Closed" },
  anonShort:  { ar: "🕵️ مجهول", en: "🕵️ Anonymous" },
  del:        { ar: "حذف", en: "Delete" },
};

const blank = () => ({
  reportNo: `NM-${Date.now().toString().slice(-6)}`,
  reportDate: todayISO(),
  reportTime: nowHHMM(),
  reporter: "",
  reporterAnonymous: false,
  location: SITE_LOCATIONS[0].v,
  area: "",
  category: HAZARD_CATEGORIES[0].v,
  description: "",
  potentialConsequence: "",
  immediateAction: "",
  suggestedPrevention: "",
  status: "new",
  reviewedBy: "",
  closedDate: "",
});

export default function HSENearMiss() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);

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

  const monthCount = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return items.filter((it) => (it.reportDate || "").startsWith(ym)).length;
  }, [items]);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>
              {pick(T.pageSubtitle)} <b>{monthCount}</b>
            </div>
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
            <div style={{ padding: 12, marginBottom: 14, borderRadius: 10, background: "#dbeafe", color: "#1e40af", fontWeight: 800 }}>
              {pick(T.hint)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.reportDate} onChange={(e) => setDraft({ ...draft, reportDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.reportTime} onChange={(e) => setDraft({ ...draft, reportTime: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.reporter)}</label>
                <input type="text" disabled={draft.reporterAnonymous} value={draft.reporterAnonymous ? pick(T.anonLabel) : draft.reporter} onChange={(e) => setDraft({ ...draft, reporter: e.target.value })} style={inputStyle} />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4, fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.reporterAnonymous} onChange={(e) => setDraft({ ...draft, reporterAnonymous: e.target.checked })} />
                  {pick(T.anonymous)}
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.area)}</label>
                <input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.category)}</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={inputStyle}>
                  {HAZARD_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.desc)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={pick(T.descPh)} style={{ ...inputStyle, minHeight: 90 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.consequence)}</label>
              <textarea value={draft.potentialConsequence} onChange={(e) => setDraft({ ...draft, potentialConsequence: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.immediate)}</label>
              <textarea value={draft.immediateAction} onChange={(e) => setDraft({ ...draft, immediateAction: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.prevention)}</label>
              <textarea value={draft.suggestedPrevention} onChange={(e) => setDraft({ ...draft, suggestedPrevention: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
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
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.category)}</th>
                  <th style={thStyle}>{pick(T.cols.desc)}</th>
                  <th style={thStyle}>{pick(T.cols.reporter)}</th>
                  <th style={thStyle}>{pick(T.cols.status)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const cat = HAZARD_CATEGORIES.find((c) => c.v === it.category);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.reportDate}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={{ ...tdStyle, fontSize: 11 }}>{cat ? cat[lang] : it.category}</td>
                      <td style={{ ...tdStyle, maxWidth: 300, fontSize: 12 }}>{it.description}</td>
                      <td style={tdStyle}>{it.reporterAnonymous ? pick(T.anonShort) : (it.reporter || "—")}</td>
                      <td style={tdStyle}>{it.status === "new" ? pick(T.stNew) : it.status === "reviewed" ? pick(T.stReviewed) : pick(T.stClosed)}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
