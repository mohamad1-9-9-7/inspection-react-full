// src/pages/hse/HSELicenses.jsx — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiDelete, apiUpdate,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "licenses_certs";

const T = {
  title: { ar: "🪪 التراخيص والشهادات", en: "🪪 Licenses & Certifications" },
  subtitle: { ar: "تتبع التراخيص المحلية والدولية + إنذارات قبل الانتهاء",
              en: "Track local and international licenses + pre-expiry alerts" },
  pageIntro: {
    ar: "تهدف الشركة إلى تحقيق منظومة متكاملة من التراخيص المحلية والشهادات الدولية، مما يعزز موقفها القانوني وفرصها التجارية، خاصة مع العملاء الكبار وسلاسل الفنادق والمطاعم. تنقسم لقسمين: التراخيص المحلية الإلزامية (بدونها لا تستطيع الشركة العمل) والشهادات الدولية المستهدفة (تفتح أسواق جديدة وعقود كبيرة). كل ترخيص هنا له تاريخ انتهاء، أولوية، وجهة مانحة. النظام ينبّه قبل الانتهاء بـ 60 يوماً وقبل 30 يوماً تتغير الأولوية لحرجة. لا يُسمح بانتهاء أي ترخيص حرج تحت أي ظرف.",
    en: "The company aims for an integrated set of local licenses and international certifications — strengthening its legal position and commercial opportunities, especially with large customers, hotels, and restaurant chains. Divided in two: Mandatory local licenses (without which the company cannot operate) and Targeted international certifications (open new markets and major contracts). Each license here has an expiry date, priority, and issuing authority. The system alerts 60 days before expiry, and within 30 days the priority becomes critical. No critical license is allowed to expire under any circumstance.",
  },
  back: { ar: "← HSE", en: "← HSE" },
  list: { ar: "📋 السجل", en: "📋 Records" },
  newCert: { ar: "+ ترخيص جديد", en: "+ New License" },
  ok: { ar: "سارية", en: "Valid" },
  expiring: { ar: "ستنتهي خلال 60 يوم", en: "Expiring in 60 days" },
  expired: { ar: "منتهية", en: "Expired" },
  missing: { ar: "تواريخ مفقودة", en: "Missing dates" },
  fAll: { ar: "الكل", en: "All" },
  fLocal: { ar: "محلي", en: "Local" },
  fIntl: { ar: "دولي", en: "International" },
  category: { ar: "التصنيف", en: "Category" },
  catLocal: { ar: "محلي (UAE)", en: "Local (UAE)" },
  catIntl: { ar: "دولي (ISO/FSSC/BRCGS)", en: "International (ISO/FSSC/BRCGS)" },
  priority: { ar: "الأولوية", en: "Priority" },
  pCrit: { ar: "🔴 حرج", en: "🔴 Critical" },
  pHigh: { ar: "🟠 عالي", en: "🟠 High" },
  pMed:  { ar: "🟡 متوسط", en: "🟡 Medium" },
  name: { ar: "اسم الترخيص", en: "License Name" },
  issuer: { ar: "الجهة المانحة", en: "Issuing Authority" },
  number: { ar: "رقم الترخيص", en: "License No." },
  issueDate: { ar: "تاريخ الإصدار", en: "Issue Date" },
  expDate: { ar: "تاريخ الانتهاء", en: "Expiry Date" },
  cycle: { ar: "دورة التجديد", en: "Renewal Cycle" },
  cMonthly: { ar: "شهري", en: "Monthly" },
  cQuarterly: { ar: "ربع سنوي", en: "Quarterly" },
  cYearly: { ar: "سنوي", en: "Yearly" },
  cBiennial: { ar: "كل سنتين", en: "Every 2 years" },
  c3Years: { ar: "كل 3 سنوات", en: "Every 3 years" },
  cOngoing: { ar: "مستمر", en: "Ongoing" },
  notes: { ar: "ملاحظات", en: "Notes" },
  save: { ar: "💾 حفظ", en: "💾 Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needName: { ar: "اكتب اسم الترخيص", en: "Enter license name" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  noRecords: { ar: "لا توجد تراخيص", en: "No licenses" },
  badgeExpired: { ar: "🔴 منتهية منذ", en: "🔴 Expired" },
  badgeDay: { ar: "يوم", en: "days" },
  badgeAgo: { ar: "منذ", en: "ago" },
  cols: {
    priority: { ar: "الأولوية", en: "Priority" },
    license: { ar: "الترخيص", en: "License" },
    issuer: { ar: "الجهة", en: "Issuer" },
    number: { ar: "الرقم", en: "Number" },
    issue: { ar: "الإصدار", en: "Issued" },
    expiry: { ar: "الانتهاء", en: "Expires" },
    remaining: { ar: "المتبقي", en: "Remaining" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  edit: { ar: "تعديل", en: "Edit" },
  del: { ar: "حذف", en: "Delete" },
  catLocalShort: { ar: "🇦🇪 محلي", en: "🇦🇪 Local" },
  catIntlShort:  { ar: "🌍 دولي", en: "🌍 International" },
};

const SEED = [
  { id: "seed-l1", category: "local", priority: "critical", name: { ar: "رخصة المنشأة الغذائية", en: "Food Establishment License" }, issuer: { ar: "بلدية دبي", en: "Dubai Municipality" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: { ar: "ترخيص رئيسي للمنشأة", en: "Primary establishment license" } },
  { id: "seed-l2", category: "local", priority: "critical", name: { ar: "شهادة سلامة المبنى", en: "Building Safety Certificate" }, issuer: { ar: "الدفاع المدني بدبي", en: "Dubai Civil Defence" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: "" },
  { id: "seed-l3", category: "local", priority: "critical", name: { ar: "بطاقة صحية للشخص المسؤول (PIC)", en: "Health Card (PIC)" }, issuer: { ar: "بلدية دبي", en: "Dubai Municipality" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "biennial", notes: { ar: "كل سنتين", en: "Every 2 years" } },
  { id: "seed-l4", category: "local", priority: "critical", name: { ar: "شهادة HACCP", en: "HACCP Certificate" }, issuer: { ar: "جهة اعتماد", en: "Certification body" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: { ar: "متوفرة", en: "Available" } },
  { id: "seed-l5", category: "local", priority: "high", name: { ar: "شهادة مكافحة الحشرات", en: "Pest Control Certificate" }, issuer: { ar: "شركة معتمدة من البلدية", en: "DM-approved company" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "monthly", notes: { ar: "زيارة شهرية", en: "Monthly visit" } },
  { id: "seed-l6", category: "local", priority: "high", name: { ar: "ترخيص إدارة النفايات", en: "Waste Management License" }, issuer: { ar: "بلدية دبي - قسم البيئة", en: "Dubai Municipality - Env. Dept" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: "" },
  { id: "seed-l7", category: "local", priority: "critical", name: { ar: "شهادة مطابقة الحلال", en: "Halal Compliance Certificate" }, issuer: "MoIAT / ESMA", number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: { ar: "إلزامية لاستيراد اللحوم", en: "Mandatory for meat import" } },
  { id: "seed-l8", category: "local", priority: "high", name: { ar: "شهادة نظام التبريد", en: "Refrigeration System Certificate" }, issuer: { ar: "الدفاع المدني / MoCCAE", en: "Civil Defence / MoCCAE" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: { ar: "للأمونيا/الفريون", en: "For ammonia/freon" } },
  { id: "seed-l9", category: "local", priority: "critical", name: { ar: "تسجيل العمال في التأمين الصحي", en: "Worker Health Insurance Registration" }, issuer: { ar: "هيئة الصحة بدبي (DHA)", en: "Dubai Health Authority (DHA)" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "ongoing", notes: "" },

  { id: "seed-i1", category: "international", priority: "high", name: { ar: "ISO 45001:2018 - السلامة المهنية", en: "ISO 45001:2018 — OHS Management" }, issuer: { ar: "جهة اعتماد دولية", en: "International certification body" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "3years", notes: { ar: "مستهدفة خلال 12-18 شهر · 45-70k AED", en: "Targeted within 12–18 months · 45–70k AED" } },
  { id: "seed-i2", category: "international", priority: "high", name: { ar: "FSSC 22000 - سلامة الغذاء", en: "FSSC 22000 — Food Safety" }, issuer: { ar: "جهة اعتماد دولية", en: "International certification body" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "3years", notes: { ar: "مطلوبة من كبار العملاء · 55-85k AED", en: "Required by major customers · 55–85k AED" } },
  { id: "seed-i3", category: "international", priority: "medium", name: { ar: "ISO 14001:2015 - إدارة البيئة", en: "ISO 14001:2015 — Environment Management" }, issuer: { ar: "جهة اعتماد دولية", en: "International certification body" }, number: "", issueDate: "", expiryDate: "", renewalCycle: "3years", notes: { ar: "اختياري · 35-55k AED", en: "Optional · 35–55k AED" } },
  { id: "seed-i4", category: "international", priority: "medium", name: "BRCGS Food Safety", issuer: "BRCGS", number: "", issueDate: "", expiryDate: "", renewalCycle: "yearly", notes: { ar: "للأسواق الأوروبية · 60-90k AED", en: "For European markets · 60–90k AED" } },
];

const blank = () => ({
  category: "local", priority: "high",
  name: "", issuer: "", number: "",
  issueDate: todayISO(), expiryDate: "",
  renewalCycle: "yearly", notes: "",
});

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); const today = new Date();
  today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] ?? v.ar ?? v.en ?? "";
}

/* ── Rules: a licence is only tracked if it can be found again (name,
   authority, number) and its dates make sense — issued in the past, expiring
   after issue, and no longer than its renewal cycle allows. ── */
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12, biennial: 24, "3years": 36 };
const LICENSE_RULES = [
  { key: "category", label: T.category, required: true, oneOf: ["local", "international"] },
  { key: "priority", label: T.priority, required: true, oneOf: ["critical", "high", "medium"] },
  { key: "name", label: T.name, required: true, minLength: 3, maxLength: 150 },
  { key: "issuer", label: T.issuer, required: true, maxLength: 120 },
  { key: "number", label: T.number, required: true, maxLength: 60 },
  { key: "issueDate", label: T.issueDate, type: "date", required: true, notFuture: true },
  { key: "renewalCycle", label: T.cycle, required: true, oneOf: ["monthly", "quarterly", "yearly", "biennial", "3years", "ongoing"] },
  { key: "expiryDate", label: T.expDate, type: "date", after: "issueDate",
    requiredIf: (d) => d.renewalCycle !== "ongoing",
    custom: (v, d) => {
      const months = CYCLE_MONTHS[d.renewalCycle];
      if (!v || !d.issueDate || !months) return null;
      const limit = new Date(d.issueDate);
      limit.setMonth(limit.getMonth() + months);
      limit.setDate(limit.getDate() + 31);       // a month of grace for renewal paperwork
      return new Date(v) > limit
        ? { ar: "تاريخ الانتهاء أبعد مما تسمح به دورة التجديد", en: "The expiry is further away than the renewal cycle allows" } : null;
    } },
  { key: "notes", label: T.notes, maxLength: 2000 },
];
const LICENSE_STEPS = [
  { ar: "اختر التصنيف (محلي/دولي) والأولوية.", en: "Choose the category (local/international) and the priority." },
  { ar: "اكتب اسم الترخيص، الجهة المانحة ورقمه كما هو مطبوع على الشهادة.", en: "Enter the licence name, the issuing authority and its number exactly as printed." },
  { ar: "تاريخ الإصدار لا يكون في المستقبل، وتاريخ الانتهاء بعده وضمن دورة التجديد المختارة.", en: "The issue date cannot be in the future; the expiry must follow it and fit the chosen renewal cycle." },
  { ar: "الترخيص «المستمر» فقط يُقبل بدون تاريخ انتهاء.", en: "Only an “Ongoing” licence may be saved without an expiry date." },
];
const LICENSE_GUIDANCE = [
  { kind: "warn", ar: "ابدأ التجديد قبل 60 يوماً من الانتهاء — يظهر الترخيص بالبرتقالي في القائمة.", en: "Start renewal 60 days before expiry — the licence turns amber in the list." },
];

export default function HSELicenses() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(LICENSE_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    if (!arr || arr.length === 0) {
      // Seed the server once with default licenses
      try {
        for (const seed of SEED) {
          await apiSave(TYPE, seed, "HSE_seed");
        }
        const fresh = await apiList(TYPE);
        setItems(fresh);
        return;
      } catch (e) {
        console.warn("HSE Licenses seed failed, showing local SEED:", e?.message || e);
        setItems(SEED);
        return;
      }
    }
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(it) {
    setDraft({ ...it,
      name: txt(it.name, lang),
      issuer: txt(it.issuer, lang),
      notes: txt(it.notes, lang),
    });
    setEditingId(it.id); validation.reset(); setTab("new");
  }
  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) await apiUpdate(TYPE, editingId, draft);
      else await apiSave(TYPE, draft);
      await reload();
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

  const filtered = useMemo(() => items.filter((it) => {
    if (filter === "expiring") {
      const d = daysUntil(it.expiryDate); return d !== null && d >= 0 && d <= 60;
    }
    if (filter === "expired") {
      const d = daysUntil(it.expiryDate); return d !== null && d < 0;
    }
    if (filter === "local" && it.category !== "local") return false;
    if (filter === "international" && it.category !== "international") return false;
    return true;
  }), [items, filter]);

  const stats = useMemo(() => {
    let expired = 0, expiring = 0, ok = 0, missing = 0;
    items.forEach((it) => {
      const d = daysUntil(it.expiryDate);
      if (d === null) missing++;
      else if (d < 0) expired++;
      else if (d <= 60) expiring++;
      else ok++;
    });
    return { expired, expiring, ok, missing };
  }, [items]);

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
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => { setTab("list"); setEditingId(null); }}>{pick(T.list)}</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newCert)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardStyle, padding: 12, background: "#dcfce7" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{pick(T.ok)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#166534" }}>{stats.ok}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fef9c3" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#854d0e" }}>{pick(T.expiring)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#854d0e" }}>{stats.expiring}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.expired)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#7f1d1d" }}>{stats.expired}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#e5e7eb" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#374151" }}>{pick(T.missing)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#374151" }}>{stats.missing}</div>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "التراخيص والشهادات", en: "Licenses & Certifications" }}
              subtitle={T.subtitle}
              docNo="LIC"
              accent={HSE_COLORS.primary}
              steps={LICENSE_STEPS}
              guidance={LICENSE_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات الترخيص" : "Licence details"}>
                <HSEField {...f("category")} type="select" label={pick(T.category)} options={[
                  { v: "local", label: pick(T.catLocal) },
                  { v: "international", label: pick(T.catIntl) },
                ]} />
                <HSEField {...f("priority")} type="select" label={pick(T.priority)} options={[
                  { v: "critical", label: pick(T.pCrit) },
                  { v: "high", label: pick(T.pHigh) },
                  { v: "medium", label: pick(T.pMed) },
                ]} />
                <HSEField {...f("name")} label={pick(T.name)} />
                <HSEField {...f("issuer")} label={pick(T.issuer)} />
                <HSEField {...f("number")} label={pick(T.number)} />
              </HSEPanel>
              <HSEPanel title={lang === "ar" ? "الصلاحية" : "Validity"}>
                <HSEField {...f("issueDate")} type="date" label={pick(T.issueDate)} />
                <HSEField {...f("renewalCycle")} type="select" label={pick(T.cycle)} options={[
                  { v: "monthly", label: pick(T.cMonthly) },
                  { v: "quarterly", label: pick(T.cQuarterly) },
                  { v: "yearly", label: pick(T.cYearly) },
                  { v: "biennial", label: pick(T.cBiennial) },
                  { v: "3years", label: pick(T.c3Years) },
                  { v: "ongoing", label: pick(T.cOngoing) },
                ]} />
                <HSEField {...f("expiryDate")} type="date" label={pick(T.expDate)} />
                <HSEField {...f("notes")} type="textarea" full label={pick(T.notes)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <>
            <div style={{ ...cardStyle, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 240 }}>
                <option value="all">{pick(T.fAll)} ({items.length})</option>
                <option value="local">{pick(T.fLocal)} ({items.filter(i => i.category === "local").length})</option>
                <option value="international">{pick(T.fIntl)} ({items.filter(i => i.category === "international").length})</option>
                <option value="expiring">{pick(T.expiring)}</option>
                <option value="expired">{pick(T.expired)}</option>
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.cols.priority)}</th>
                    <th style={thStyle}>{pick(T.cols.license)}</th>
                    <th style={thStyle}>{pick(T.cols.issuer)}</th>
                    <th style={thStyle}>{pick(T.cols.number)}</th>
                    <th style={thStyle}>{pick(T.cols.issue)}</th>
                    <th style={thStyle}>{pick(T.cols.expiry)}</th>
                    <th style={thStyle}>{pick(T.cols.remaining)}</th>
                    <th style={thStyle}>{pick(T.cols.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const d = daysUntil(it.expiryDate);
                    let badge;
                    if (d === null) badge = { text: "—", color: "#64748b", bg: "#f1f5f9" };
                    else if (d < 0) badge = { text: `${pick(T.badgeExpired)} ${Math.abs(d)} ${pick(T.badgeDay)}`, color: "#7f1d1d", bg: "#fee2e2" };
                    else if (d <= 30) badge = { text: `🟠 ${d} ${pick(T.badgeDay)}`, color: "#9a3412", bg: "#fed7aa" };
                    else if (d <= 60) badge = { text: `🟡 ${d} ${pick(T.badgeDay)}`, color: "#854d0e", bg: "#fef9c3" };
                    else badge = { text: `✅ ${d} ${pick(T.badgeDay)}`, color: "#166534", bg: "#dcfce7" };
                    const prio = { critical: "🔴", high: "🟠", medium: "🟡" }[it.priority] || "";
                    return (
                      <tr key={it.id}>
                        <td style={{ ...tdStyle, textAlign: "center", fontSize: 18 }}>{prio}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>
                          {txt(it.name, lang)}
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            {it.category === "local" ? pick(T.catLocalShort) : pick(T.catIntlShort)}
                            {it.notes && ` · ${txt(it.notes, lang)}`}
                          </div>
                        </td>
                        <td style={tdStyle}>{txt(it.issuer, lang)}</td>
                        <td style={tdStyle}>{it.number || "—"}</td>
                        <td style={tdStyle}>{it.issueDate || "—"}</td>
                        <td style={tdStyle}>{it.expiryDate || "—"}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: "3px 8px", borderRadius: 6, background: badge.bg, color: badge.color, fontWeight: 800, fontSize: 12 }}>
                            {badge.text}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c", marginInlineStart: 4 }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
