// src/pages/hse/HSEPPELog.jsx — bilingual
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
  canDeleteHSE, HSE_DELETE_DENIED,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

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
  rNew:        { ar: "صرف جديد",  en: "New issue (Onboarding)" },
  rReplace:    { ar: "استبدال",  en: "Replacement (Damaged/Worn)" },
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
  { v: "vest",       ar: "🦺 صدرية عاكسة",        en: "🦺 Hi-Vis vest" },
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

/* ── Rules: one issue = one person, real quantities (whole numbers 0–20
   per item), at least one item, and a signature from the receiver. ── */
const PPE_MAX_QTY = 20;
const PPE_RULES = [
  { key: "date", label: T.date, type: "date", required: true, notFuture: true, maxPastDays: 30 },
  { key: "employeeName", label: T.empName, required: true, minLength: 2, maxLength: 80 },
  { key: "employeeId", label: T.empId, maxLength: 20,
    requiredIf: (d) => d.reason !== "visitor",
    requiredMsg: { ar: "رقم الموظف إلزامي (إلا للزوار والمقاولين)", en: "Employee ID is required (except visitors/contractors)" } },
  { key: "department", label: T.dept, required: true, maxLength: 60 },
  { key: "reason", label: T.reason, required: true, oneOf: ["new_issue", "replacement", "periodic", "visitor"] },
  { key: "issuedBy", label: T.issuedBy, required: true, maxLength: 80,
    custom: (v, d) => v && d.employeeName && v.trim().toLowerCase() === d.employeeName.trim().toLowerCase()
      ? { ar: "الموظف لا يصرف لنفسه", en: "An employee cannot issue PPE to themselves" } : null },
  { key: "itemsIssued", label: T.itemsTitle,
    custom: (v) => {
      const vals = Object.values(v || {}).map(Number);
      if (vals.some((n) => !Number.isInteger(n) || n < 0 || n > PPE_MAX_QTY))
        return { ar: `الكمية لكل عنصر رقم صحيح من 0 إلى ${PPE_MAX_QTY}`, en: `Each quantity must be a whole number from 0 to ${PPE_MAX_QTY}` };
      return vals.reduce((a, b) => a + b, 0) === 0
        ? { ar: "اختر عنصراً واحداً على الأقل", en: "Select at least one item" } : null;
    } },
  { key: "signature", label: T.signature, required: true, maxLength: 80,
    requiredMsg: { ar: "توقيع المستلم إلزامي", en: "The receiver's signature is required" } },
];

const PPE_STEPS = [
  { ar: "اكتب التاريخ (حتى 30 يوماً للخلف)، الموظف ورقمه وقسمه، وسبب الصرف.", en: "Enter the date (up to 30 days back), the employee with ID and department, and the reason." },
  { ar: "أدخل الكمية لكل عنصر مصروف — رقم صحيح من 0 إلى 20؛ اترك الباقي فارغاً.", en: "Enter the quantity for each item issued — a whole number from 0 to 20; leave the rest empty." },
  { ar: "يوقّع المستلم بنفسه، ويكتب أمين المستودع اسمه في «صرف بواسطة».", en: "The receiver signs, and the storekeeper writes their name under “Issued by”." },
];
const PPE_GUIDANCE = [
  { kind: "tip", ar: "عند الاستبدال: استلم القطعة التالفة قبل صرف الجديدة.", en: "On replacement: collect the damaged item before issuing the new one." },
  { kind: "warn", ar: "المعطف المعزول والقفازات إلزامية لكل من يدخل غرف التجميد.", en: "Insulated coat and gloves are mandatory for anyone entering freezer rooms." },
];

export default function HSEPPELog() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(PPE_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function setQty(itemKey, val) {
    // Whole units only, never negative or above the per-issue cap.
    const v = Math.max(0, Math.min(PPE_MAX_QTY, Math.floor(Number(val) || 0)));
    setDraft((d) => ({ ...d, itemsIssued: { ...d.itemsIssued, [itemKey]: v } }));
  }
  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    validation.reset();
    setTab("new");
  }
  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.issuedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.issuedBy || "HSE");
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
    if (!canDeleteHSE()) { alert(pick(HSE_DELETE_DENIED)); return; }
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newIssue)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "سجل صرف معدات الوقاية", en: "PPE Issue Log" }}
              subtitle={T.subtitle}
              docNo="PPE"
              accent={HSE_COLORS.primary}
              steps={PPE_STEPS}
              guidance={PPE_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات الصرف" : "Issue details"}>
                <HSEField {...f("date")} type="date" label={pick(T.date)} />
                <HSEField {...f("employeeName")} label={pick(T.empName)} />
                <HSEField {...f("employeeId")} label={pick(T.empId)} />
                <HSEField {...f("department")} label={pick(T.dept)} />
                <HSEField {...f("reason")} type="select" label={pick(T.reason)} options={[
                  { v: "new_issue", label: pick(T.rNew) },
                  { v: "replacement", label: pick(T.rReplace) },
                  { v: "periodic", label: pick(T.rPeriodic) },
                  { v: "visitor", label: pick(T.rVisitor) },
                ]} />
                <HSEField {...f("issuedBy")} label={pick(T.issuedBy)} />
              </HSEPanel>

              <div className="ph-fieldbar" data-hk-field="itemsIssued"
                style={validation.errors.itemsIssued ? { borderColor: "#dc2626" } : undefined}>
                <div className="ph-fieldbar-title">{pick(T.itemsTitle)} <span className="ph-req">*</span></div>
                <div className="ph-fieldbar-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                  {PPE_ITEMS.map((it) => {
                    const q = draft.itemsIssued[it.v] || 0;
                    return (
                      <label key={it.v} className={`hk-check${q > 0 ? " on" : ""}`} style={{ justifyContent: "space-between" }}>
                        <span>{it[lang]}</span>
                        <input type="number" className="ph-input" min="0" max={PPE_MAX_QTY} step="1" inputMode="numeric"
                          value={draft.itemsIssued[it.v] || ""} placeholder="0"
                          onKeyDown={(e) => { if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => setQty(it.v, e.target.value)}
                          style={{ width: 80, minHeight: 38, padding: "6px 8px", textAlign: "center", fontWeight: 800 }} />
                      </label>
                    );
                  })}
                </div>
                {validation.errors.itemsIssued && <div className="hk-err" style={{ marginTop: 8 }}>{validation.errors.itemsIssued}</div>}
              </div>

              <HSEPanel title={lang === "ar" ? "الاستلام" : "Receipt"}>
                <HSEField {...f("signature")} label={pick(T.signature)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

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
                          {canDeleteHSE() && <button data-delete-action="true" style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(rec.id)}>{pick(T.del)}</button>}
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
