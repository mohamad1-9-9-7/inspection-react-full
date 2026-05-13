// src/pages/hse/HSEPPELog.jsx — bilingual
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "ppe_issue_log";

const T = {
  title: { ar: "🧤 سجل صرف PPE — معدات الوقاية", en: "🧤 PPE Issue Log" },
  subtitle: { ar: "تتبع توزيع المعدات الوقائية على العاملين + المخزون المستهلك",
              en: "Track PPE distribution to workers + consumed stock" },
  back: { ar: "← HSE", en: "← HSE" },
  list: { ar: "📋 السجل", en: "📋 Records" },
  stats: { ar: "📊 الإحصائيات", en: "📊 Statistics" },
  newIssue: { ar: "+ صرف جديد", en: "+ New Issue" },
  date: { ar: "التاريخ", en: "Date" },
  empName: { ar: "اسم الموظف", en: "Employee Name" },
  empId: { ar: "رقم الموظف", en: "Employee ID" },
  dept: { ar: "القسم", en: "Department" },
  reason: { ar: "سبب الصرف", en: "Issue Reason" },
  rNew:        { ar: "صرف جديد (Onboarding)",  en: "New issue (Onboarding)" },
  rReplace:    { ar: "استبدال (Damaged/Worn)",  en: "Replacement (Damaged/Worn)" },
  rPeriodic:   { ar: "صرف دوري",                 en: "Periodic issue" },
  rVisitor:    { ar: "زائر / مقاول",             en: "Visitor / Contractor" },
  issuedBy: { ar: "صرف بواسطة", en: "Issued by" },
  itemsTitle: { ar: "العناصر المصروفة (الكمية)", en: "Items Issued (Quantity)" },
  signature: { ar: "توقيع الموظف (اسم/ملاحظة)", en: "Employee signature (name/note)" },
  saveBtn: { ar: "💾 حفظ الصرف", en: "💾 Save Issue" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needName: { ar: "أدخل اسم الموظف", en: "Enter employee name" },
  needItem: { ar: "اختر عنصراً واحداً على الأقل", en: "Select at least one item" },
  saved: { ar: "✅ تم تسجيل صرف PPE", en: "✅ PPE issue saved" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  noRecords: { ar: "لا توجد سجلات", en: "No records" },
  totalsTitle: { ar: "📊 إجمالي العناصر المصروفة", en: "📊 Total items issued" },
  cols: {
    date:    { ar: "التاريخ", en: "Date" },
    emp:     { ar: "الموظف", en: "Employee" },
    dept:    { ar: "القسم", en: "Department" },
    reason:  { ar: "السبب", en: "Reason" },
    items:   { ar: "العناصر", en: "Items" },
    issuedBy:{ ar: "صرف بواسطة", en: "Issued by" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  rNewS:      { ar: "🆕 صرف جديد", en: "🆕 New" },
  rReplaceS:  { ar: "♻️ استبدال", en: "♻️ Replace" },
  rPeriodicS: { ar: "🔁 دوري", en: "🔁 Periodic" },
  rVisitorS:  { ar: "👥 زائر", en: "👥 Visitor" },
  del: { ar: "حذف", en: "Delete" },
  edit: { ar: "✏️ تعديل", en: "✏️ Edit" },
};

const PPE_ITEMS = [
  { v: "coat",       ar: "🥶 معطف معزول للغرف الباردة", en: "🥶 Insulated coat (cold rooms)" },
  { v: "cutGloves",  ar: "🧤 قفازات مقاومة للقطع",       en: "🧤 Cut-resistant gloves" },
  { v: "nitrile",    ar: "🧤 قفازات نتريل غذائية",        en: "🧤 Nitrile food gloves" },
  { v: "boots",      ar: "👢 أحذية مضادة للانزلاق",        en: "👢 Anti-slip boots" },
  { v: "helmet",     ar: "⛑️ خوذة سلامة",                  en: "⛑️ Safety helmet" },
  { v: "vest",       ar: "🦺 صدرية عاكسة (Hi-Vis)",        en: "🦺 Hi-Vis vest" },
  { v: "n95",        ar: "😷 قناع وجه N95",                en: "😷 N95 face mask" },
  { v: "hairnet",    ar: "😷 شبكة شعر/لحية",                en: "😷 Hair/beard net" },
  { v: "goggles",    ar: "🥽 نظارات واقية",                en: "🥽 Safety goggles" },
  { v: "earplugs",   ar: "🎧 سدادات أذن",                  en: "🎧 Ear plugs" },
  { v: "respirator", ar: "🫁 قناع تنفسي للأمونيا",         en: "🫁 Ammonia respirator" },
  { v: "apron",      ar: "👕 زي عمل أبيض",                 en: "👕 Food-grade apron" },
  { v: "cutApron",   ar: "🥋 صدرية مقاومة للقطع",          en: "🥋 Cut-resistant apron" },
];

const blank = () => ({
  date: todayISO(), employeeName: "", employeeId: "", department: "",
  itemsIssued: {}, reason: "new_issue", signature: "", issuedBy: "",
});

export default function HSEPPELog() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function setQty(itemKey, val) {
    const v = Number(val) || 0;
    setDraft((d) => ({ ...d, itemsIssued: { ...d.itemsIssued, [itemKey]: v } }));
  }
  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setTab("new");
  }
  async function save() {
    if (!draft.employeeName.trim()) { alert(pick(T.needName)); return; }
    const tot = Object.values(draft.itemsIssued).reduce((a, b) => a + (Number(b) || 0), 0);
    if (tot === 0) { alert(pick(T.needItem)); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.issuedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.issuedBy || "HSE");
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

  const itemTotals = useMemo(() => {
    const map = {};
    items.forEach((rec) => {
      Object.entries(rec.itemsIssued || {}).forEach(([k, v]) => { map[k] = (map[k] || 0) + (Number(v) || 0); });
    });
    return map;
  }, [items]);

  const reasonLabel = (r) =>
    r === "new_issue" ? pick(T.rNewS)
    : r === "replacement" ? pick(T.rReplaceS)
    : r === "periodic" ? pick(T.rPeriodicS)
    : pick(T.rVisitorS);

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
            <button style={tab === "stats" ? buttonPrimary : buttonGhost} onClick={() => setTab("stats")}>{pick(T.stats)}</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newIssue)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.empName)}</label><input type="text" value={draft.employeeName} onChange={(e) => setDraft({ ...draft, employeeName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.empId)}</label><input type="text" value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.dept)}</label><input type="text" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.reason)}</label>
                <select value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} style={inputStyle}>
                  <option value="new_issue">{pick(T.rNew)}</option>
                  <option value="replacement">{pick(T.rReplace)}</option>
                  <option value="periodic">{pick(T.rPeriodic)}</option>
                  <option value="visitor">{pick(T.rVisitor)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.issuedBy)}</label><input type="text" value={draft.issuedBy} onChange={(e) => setDraft({ ...draft, issuedBy: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.itemsTitle)}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
              {PPE_ITEMS.map((it) => (
                <div key={it.v} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  padding: 10, borderRadius: 8,
                  background: (draft.itemsIssued[it.v] || 0) > 0 ? "#fef3c7" : "#fff7ed",
                  border: "1px solid rgba(120,53,15,0.18)",
                }}>
                  <span style={{ fontSize: 13, flex: 1 }}>{it[lang]}</span>
                  <input type="number" min="0" value={draft.itemsIssued[it.v] || ""} onChange={(e) => setQty(it.v, e.target.value)} style={{ ...inputStyle, width: 70, textAlign: "center", fontWeight: 800 }} placeholder="0" />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.signature)}</label>
              <input type="text" value={draft.signature} onChange={(e) => setDraft({ ...draft, signature: e.target.value })} style={inputStyle} />
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
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.emp)}</th>
                  <th style={thStyle}>{pick(T.cols.dept)}</th>
                  <th style={thStyle}>{pick(T.cols.reason)}</th>
                  <th style={thStyle}>{pick(T.cols.items)}</th>
                  <th style={thStyle}>{pick(T.cols.issuedBy)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rec) => {
                  const issued = Object.entries(rec.itemsIssued || {}).filter(([_, v]) => Number(v) > 0);
                  return (
                    <tr key={rec.id}>
                      <td style={tdStyle}>{rec.date}</td>
                      <td style={tdStyle}><b>{rec.employeeName}</b><br /><small>{rec.employeeId}</small></td>
                      <td style={tdStyle}>{rec.department}</td>
                      <td style={tdStyle}>{reasonLabel(rec.reason)}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {issued.map(([k, v]) => {
                          const it = PPE_ITEMS.find((p) => p.v === k);
                          return <div key={k}>• {it ? it[lang] : k} × {v}</div>;
                        })}
                      </td>
                      <td style={tdStyle}>{rec.issuedBy}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(rec)}>{pick(T.edit)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(rec.id)}>{pick(T.del)}</button>
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

        {tab === "stats" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>{pick(T.totalsTitle)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
              {PPE_ITEMS.map((it) => {
                const total = itemTotals[it.v] || 0;
                return (
                  <div key={it.v} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 12, borderRadius: 10,
                    background: total > 0 ? "#fef3c7" : "#fff7ed",
                    border: "1px solid rgba(120,53,15,0.18)",
                  }}>
                    <span style={{ fontSize: 13, flex: 1 }}>{it[lang]}</span>
                    <span style={{ fontSize: 18, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
