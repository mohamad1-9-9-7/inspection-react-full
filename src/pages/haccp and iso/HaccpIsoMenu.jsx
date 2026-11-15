// src/pages/haccp and iso/HaccpIsoMenu.jsx
// The ISO 22000 & HACCP hub — every module of the food safety system.
//
// Same look and tools as the home dashboard (pages/dashboard/hubCss.js):
// light header, search that forgives Arabic spelling, modules grouped by
// area, pins saved on the account, and the open alerts that belong here.
//
// One card per module. A card opens the module's REGISTER; when the module
// has an entry form, a small "+ New" on the same card opens it directly —
// never a second card for the same module.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { isItemAllowed } from "../../utils/sectionItems";
import { getPerms, canWrite } from "../../utils/perms";
import { useLangState } from "../../utils/appLang";
import { fetchOpenAlertsShared, ALERTS_EVENT, SEVERITY } from "../../utils/alertsApi";
import { HUB_CSS } from "../dashboard/hubCss";
import { normText, matches } from "../dashboard/dashboardSearch";
import { useDashPrefs, toggleFav, pushRecent } from "../dashboard/dashboardPrefs";

const T = {
  en: {
    eyebrow: "Al Mawashi — Food Safety System",
    title: "ISO 22000 & HACCP",
    sub: "Documents, registers, inspections and performance of the food safety system.",
    back: "Dashboard", modules: (n) => `${n} modules`,
    search: "Find a module…  ( / )", clearSearch: "Clear search",
    all: "All", governance: "Governance", operations: "Operations", records: "Records", performance: "Performance",
    pinned: "Pinned", open: "Open", add: "+ New",
    pin: (name) => `Pin ${name}`, unpin: (name) => `Unpin ${name}`,
    addTitle: (name) => `New entry — ${name}`,
    attention: "Needs attention in this section",
    allAlerts: (n) => `All alerts (${n})`,
    nAlerts: (n) => `${n} alert${n !== 1 ? "s" : ""}`,
    none: "No module matches.", noAccess: "No module of this section is assigned to this account.",
    master: "Master controlled document", adminOnly: "Admins only",
    footer: "Al Mawashi — Quality & Food Safety System",
  },
  ar: {
    eyebrow: "المواشي — نظام سلامة الغذاء",
    title: "الأيزو 22000 والهاسب",
    sub: "وثائق نظام سلامة الغذاء وسجلاته وتفتيشاته ومؤشرات أدائه.",
    back: "الرئيسية", modules: (n) => `${n} وحدة`,
    search: "ابحث عن وحدة…  ( / )", clearSearch: "مسح البحث",
    all: "الكل", governance: "الحوكمة", operations: "العمليات", records: "السجلات", performance: "الأداء",
    pinned: "المفضلة", open: "فتح", add: "+ جديد",
    pin: (name) => `تثبيت ${name}`, unpin: (name) => `إلغاء تثبيت ${name}`,
    addTitle: (name) => `إدخال جديد — ${name}`,
    attention: "يحتاج انتباهك في هذا القسم",
    allAlerts: (n) => `كل التنبيهات (${n})`,
    nAlerts: (n) => (n === 1 ? "تنبيه واحد" : n === 2 ? "تنبيهان" : n <= 10 ? `${n} تنبيهات` : `${n} تنبيهًا`),
    none: "لا توجد وحدة مطابقة.", noAccess: "لم تُحدَّد لهذا الحساب أي وحدة من هذا القسم.",
    master: "الوثيقة المرجعية المعتمدة", adminOnly: "للمدراء فقط",
    footer: "المواشي — نظام الجودة وسلامة الغذاء",
  },
};

/* One colour per area — the icon tile tells you where a module belongs. */
const CATS = ["governance", "operations", "records", "performance"];
const CAT_STYLE = {
  governance:  { grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)", glow: "rgba(59,130,246,.28)" },
  operations:  { grad: "linear-gradient(135deg,#14b8a6,#0f766e)", glow: "rgba(20,184,166,.28)" },
  records:     { grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)", glow: "rgba(139,92,246,.28)" },
  performance: { grad: "linear-gradient(135deg,#f59e0b,#d97706)", glow: "rgba(245,158,11,.28)" },
};

/* ── The modules ──────────────────────────────────────────────────────────
   route = the register (what the card opens) · add = the entry form, when the
   module has one · permId = the permission item when it differs from the id.
   Adding a module = one object here (+ its item in utils/sectionItems.js). */
const MODULES = [
  {
    id: "haccp-manual", cat: "governance", icon: "📕", master: true, route: "/haccp-iso/haccp-manual",
    tags: ["ISO 22000:2018", "Clauses 4–10", "HACCP Plan"],
    en: { t: "HACCP / FSMS Manual", d: "Hazard analysis, CCPs and the HACCP plan, product descriptions and the full ISO 22000 clauses — signed and audit-ready." },
    ar: { t: "دليل الهاسب ونظام سلامة الغذاء", d: "تحليل المخاطر ونقاط التحكم الحرجة وخطة الهاسب ووصف المنتجات وبنود الأيزو 22000 كاملة — موقّع وجاهز للتدقيق." },
  },
  {
    id: "food-safety-policy", cat: "governance", icon: "📜", route: "/haccp-iso/food-safety-policy",
    en: { t: "Food Safety Policy", d: "ISO 5.2 — the controlled policy, staff acknowledgements and a printable copy for posting." },
    ar: { t: "سياسة سلامة الغذاء", d: "البند 5.2 — السياسة المعتمدة وإقرارات الموظفين ونسخة للطباعة والتعليق." },
  },
  {
    id: "risk-register", cat: "governance", icon: "🎯", route: "/haccp-iso/risk-register/view", add: "/haccp-iso/risk-register",
    en: { t: "FSMS Risk Register", d: "ISO 6.1 — strategic and operational risks: regulatory, supply chain, halal, cold storage, transport." },
    ar: { t: "سجل مخاطر النظام", d: "البند 6.1 — المخاطر الاستراتيجية والتشغيلية: التشريعات، سلسلة التوريد، الحلال، التخزين المبرّد، النقل." },
  },
  {
    id: "opportunity-register", cat: "governance", icon: "💡", route: "/haccp-iso/opportunity-register/view", add: "/haccp-iso/opportunity-register",
    en: { t: "Opportunity Register", d: "ISO 6.1 — actions to address opportunities, the companion of the risk register." },
    ar: { t: "سجل الفرص", d: "البند 6.1 — إجراءات اغتنام الفرص، وهو المكمّل لسجل المخاطر." },
  },
  {
    id: "change-management", cat: "governance", icon: "🔄", route: "/haccp-iso/change-management/view", add: "/haccp-iso/change-management",
    en: { t: "Change Management Log", d: "ISO 6.3 — planned changes: relocations, suppliers, equipment and IT, with their approval steps." },
    ar: { t: "سجل إدارة التغيير", d: "البند 6.3 — التغييرات المخططة: المواقع والمورّدون والمعدات والأنظمة، مع خطوات اعتمادها." },
  },
  {
    id: "food-defense", cat: "governance", icon: "🛡️", route: "/haccp-iso/food-defense/view", add: "/haccp-iso/food-defense",
    en: { t: "Food Defense Plan", d: "TACCP / VACCP — defense team, site and personnel security, vulnerability assessment and incident response." },
    ar: { t: "خطة الدفاع الغذائي", d: "TACCP / VACCP — فريق الدفاع وأمن الموقع والأفراد وتقييم نقاط الضعف والاستجابة للحوادث." },
  },
  {
    id: "licenses-contracts", cat: "governance", icon: "📑", route: "/haccp-iso/licenses-contracts/view", add: "/haccp-iso/licenses-contracts",
    en: { t: "Licenses & Contracts", d: "Every branch licence and service contract in one register: expiry, renewals, documents and reminders." },
    ar: { t: "التراخيص والعقود", d: "كل تراخيص الفروع وعقود الخدمات في سجل واحد: الانتهاء والتجديد والمستندات والتذكيرات." },
  },
  {
    id: "site-certificates", cat: "governance", icon: "🏅", route: "/haccp-iso/site-certificates",
    en: { t: "Site Certificates", d: "ISO 22000 and HACCP certificates per site — each branch opens and downloads its own." },
    ar: { t: "شهادات المواقع", d: "شهادات الأيزو 22000 والهاسب لكل موقع — كل فرع يفتح شهادته ويحمّلها." },
  },
  {
    id: "document-register", cat: "governance", icon: "📚", route: "/haccp-iso/document-register/view", add: "/haccp-iso/document-register",
    en: { t: "Document Master Register", d: "ISO 7.5 — every controlled document: version, owner, review date and retention." },
    ar: { t: "السجل الرئيسي للوثائق", d: "البند 7.5 — كل وثيقة معتمدة: الإصدار والمالك وتاريخ المراجعة ومدة الحفظ." },
  },
  {
    id: "legal-register", cat: "governance", icon: "🏛️", route: "/haccp-iso/legal-register/view", add: "/haccp-iso/legal-register",
    en: { t: "Legal Register", d: "Statutory, regulatory and customer requirements with owner, review date and compliance evidence." },
    ar: { t: "السجل القانوني", d: "المتطلبات القانونية والتنظيمية ومتطلبات العملاء مع المسؤول وتاريخ المراجعة ودليل الالتزام." },
  },
  {
    id: "external-documents", cat: "governance", icon: "🌐", route: "/haccp-iso/external-documents/view",
    en: { t: "External Documents", d: "Master list of external standards, regulations, customer specifications and authority references." },
    ar: { t: "الوثائق الخارجية", d: "القائمة الرئيسية للمواصفات والأنظمة الخارجية ومواصفات العملاء ومراجع الجهات الرسمية." },
  },
  {
    id: "audit-trail", cat: "governance", icon: "🕵️", adminOnly: true, route: "/haccp-iso/audit-trail",
    en: { t: "Audit Trail", d: "Every edit and delete across the system: which account, when, old value and new value." },
    ar: { t: "سجل التعديلات", d: "كل تعديل وحذف في النظام: أي حساب، ومتى، والقيمة القديمة والجديدة." },
  },

  {
    id: "product-details", cat: "operations", icon: "📦", route: "/haccp-iso/product-details",
    en: { t: "Product Details & Specifications", d: "Product specs, labels, shelf life, allergens and claims." },
    ar: { t: "تفاصيل المنتجات ومواصفاتها", d: "مواصفات المنتج والملصقات ومدة الصلاحية ومسببات الحساسية والادعاءات." },
  },
  {
    id: "kitchen", cat: "operations", icon: "🍽️", route: "/haccp-iso/kitchen",
    en: { t: "Kitchen", d: "Kitchen modules — menu calorie and nutrition labelling." },
    ar: { t: "المطبخ", d: "وحدات المطبخ — السعرات والبيانات الغذائية لقائمة الطعام." },
  },
  {
    id: "supplier-evaluation", cat: "operations", icon: "🤝", route: "/haccp-iso/supplier-evaluation",
    en: { t: "Supplier Evaluation", d: "Approved suppliers, self-assessment links, evaluation results and performance." },
    ar: { t: "تقييم المورّدين", d: "المورّدون المعتمدون وروابط التقييم الذاتي ونتائج التقييم والأداء." },
  },
  {
    id: "sop-ssop", cat: "operations", icon: "📘", route: "/haccp-iso/sop-ssop",
    en: { t: "SOP & sSOP", d: "Standard operating and sanitation procedures — documents, versions and records." },
    ar: { t: "إجراءات التشغيل والتعقيم", d: "إجراءات التشغيل القياسية وإجراءات التعقيم — الوثائق والإصدارات والسجلات." },
  },
  {
    id: "ccp-monitoring", cat: "operations", icon: "🌡️", route: "/haccp-iso/ccp-monitoring/view", add: "/haccp-iso/ccp-monitoring",
    en: { t: "CCP Monitoring Log", d: "Critical control points — readings, deviations and corrective actions." },
    ar: { t: "سجل مراقبة نقاط التحكم الحرجة", d: "نقاط التحكم الحرجة — القراءات والانحرافات والإجراءات التصحيحية." },
  },
  {
    id: "calibration", cat: "operations", icon: "📐", route: "/haccp-iso/calibration/view", add: "/haccp-iso/calibration",
    en: { t: "Calibration — External Certificates", d: "Equipment calibrated by an outside lab: certificates, due dates and alerts." },
    ar: { t: "المعايرة — الشهادات الخارجية", d: "المعدات المعايَرة لدى مختبر خارجي: الشهادات وتواريخ الاستحقاق والتنبيهات." },
  },
  {
    id: "internal-calibration", cat: "operations", icon: "🧊", route: "/haccp-iso/internal-calibration/view", add: "/haccp-iso/internal-calibration",
    en: { t: "Calibration — In-house Checks", d: "Probe verification by our own staff (ice point, boiling point, master probe) in every branch." },
    ar: { t: "المعايرة — الفحص الداخلي", d: "تحقق موظفينا من المجسّات (نقطة التجمد، نقطة الغليان، المجسّ المرجعي) في كل الفروع." },
  },
  {
    id: "water-testing", cat: "operations", icon: "💧", route: "/haccp-iso/water-testing/view", add: "/haccp-iso/water-testing",
    en: { t: "Water & Ice Testing Log", d: "ISO 8.2.4 — potable water and ice lab results against the limits, with corrective actions." },
    ar: { t: "سجل فحص الماء والثلج", d: "البند 8.2.4 — نتائج مختبر الماء والثلج مقابل الحدود، مع الإجراءات التصحيحية." },
  },
  {
    id: "glass-register", cat: "operations", icon: "🪟", route: "/haccp-iso/glass-register/view", add: "/haccp-iso/glass-register",
    en: { t: "Glass & Brittle Plastic Register", d: "Inventory of glass and brittle plastic items — risk, protection and inspection." },
    ar: { t: "سجل الزجاج والبلاستيك القابل للكسر", d: "جرد القطع الزجاجية والبلاستيكية القابلة للكسر — الخطر والحماية والفحص." },
  },

  {
    id: "dm-inspection", cat: "records", icon: "🏢", route: "/haccp-iso/dm-inspection/view", add: "/haccp-iso/dm-inspection",
    en: { t: "Dubai Municipality Inspection", d: "Municipality visits — checklist, findings, photos and corrective actions." },
    ar: { t: "تفتيش بلدية دبي", d: "زيارات البلدية — قائمة التحقق والملاحظات والصور والإجراءات التصحيحية." },
  },
  {
    id: "mock-recall", cat: "records", icon: "🔁", route: "/haccp-iso/mock-recall/view", add: "/haccp-iso/mock-recall",
    en: { t: "Mock Recall / Traceability Drill", d: "Traceability drills — backward and forward trace, timing and audit-ready logs." },
    ar: { t: "تمرين الاستدعاء الوهمي والتتبع", d: "تمارين التتبع — للخلف وللأمام، مع التوقيت وسجلات جاهزة للتدقيق." },
  },
  {
    id: "real-recall", cat: "records", icon: "🚨", route: "/haccp-iso/real-recall/view", add: "/haccp-iso/real-recall",
    en: { t: "Real Product Recall", d: "ISO 8.9.5 — actual recalls: class, authority notification and cost." },
    ar: { t: "استدعاء المنتج الفعلي", d: "البند 8.9.5 — حالات الاستدعاء الفعلية: الفئة وإبلاغ الجهات والتكلفة." },
  },
  {
    id: "product-withdrawal", cat: "records", icon: "↩️", route: "/haccp-iso/product-withdrawal/view", add: "/haccp-iso/product-withdrawal",
    en: { t: "Product Withdrawal", d: "ISO 8.9.5 — withdrawal before the product reaches the consumer: stock hold and quarantine per branch." },
    ar: { t: "سحب المنتج", d: "البند 8.9.5 — السحب قبل وصول المنتج للمستهلك: حجز المخزون وعزله في كل فرع." },
  },
  {
    id: "customer-complaints", cat: "records", icon: "📞", route: "/haccp-iso/customer-complaints/view", add: "/haccp-iso/customer-complaints",
    en: { t: "Customer Complaints", d: "Complaint log, root cause (5 Whys), corrective action and trend analysis." },
    ar: { t: "شكاوى العملاء", d: "سجل الشكاوى والسبب الجذري (لماذا ×5) والإجراء التصحيحي وتحليل الاتجاهات." },
  },
  {
    id: "communication-log", cat: "records", icon: "📢", route: "/haccp-iso/communication-log/view", add: "/haccp-iso/communication-log",
    en: { t: "Communication Log", d: "ISO 7.4 — internal and external communication matrix with follow-up." },
    ar: { t: "سجل التواصل", d: "البند 7.4 — مصفوفة التواصل الداخلي والخارجي مع المتابعة." },
  },

  {
    id: "haccp-dashboard", cat: "performance", icon: "📊", route: "/haccp-iso/haccp-dashboard",
    en: { t: "HACCP Linkage Dashboard", d: "Live figures: CCP records, mock recalls, suppliers, calibration and management review." },
    ar: { t: "لوحة ربط الهاسب", d: "أرقام حيّة: سجلات نقاط التحكم والاستدعاء الوهمي والمورّدون والمعايرة ومراجعة الإدارة." },
  },
  {
    id: "objectives", cat: "performance", icon: "🏁", route: "/haccp-iso/objectives/view", add: "/haccp-iso/objectives",
    en: { t: "FSMS Objectives", d: "ISO 6.2 — measurable objectives: targets, progress, owners and review." },
    ar: { t: "أهداف النظام", d: "البند 6.2 — الأهداف القابلة للقياس: المستهدف والتقدّم والمسؤول والمراجعة." },
  },
  {
    id: "continual-improvement", cat: "performance", icon: "🌱", route: "/haccp-iso/continual-improvement/view", add: "/haccp-iso/continual-improvement",
    en: { t: "Continual Improvement Log", d: "ISO 10.2 — from idea to approval, implementation and effectiveness." },
    ar: { t: "سجل التحسين المستمر", d: "البند 10.2 — من الفكرة إلى الاعتماد فالتنفيذ فقياس الفاعلية." },
  },
  {
    id: "mrm", cat: "performance", icon: "🗓️", route: "/haccp-iso/mrm/view", add: "/haccp-iso/mrm",
    en: { t: "Management Review Meeting", d: "Review sessions — inputs, decisions, action items and sign-off." },
    ar: { t: "اجتماع مراجعة الإدارة", d: "جلسات المراجعة — المدخلات والقرارات وبنود العمل والتوقيع." },
  },
];

// Sub-hubs are gated by their leaf permission ids, not by the card id itself.
const SUBHUB_LEAVES = {
  "product-details": ["product-details.entry", "product-details.view"],
  kitchen: ["kitchen.menu-nutrition"],
};

function moduleVisible(item) {
  // Admin-only cards (Audit Trail) never show for regular accounts,
  // regardless of section permissions.
  if (item.adminOnly) return !!getPerms().isAdmin;
  const leaves = SUBHUB_LEAVES[item.id];
  if (leaves) return leaves.some((leaf) => isItemAllowed("iso", leaf));
  return isItemAllowed("iso", item.permId || item.id);
}

/** What the search looks through for a module — both languages, folded. */
const moduleHay = (m) =>
  normText([m.en.t, m.en.d, m.ar.t, m.ar.d, m.id, T.en[m.cat], T.ar[m.cat], ...(m.tags || [])].join(" "));

/** The module an alert belongs to: its link sits under the module's address. */
function alertModuleId(a) {
  const link = String(a?.link || "");
  if (!link.startsWith("/haccp-iso")) return null;
  let best = null;
  MODULES.forEach((m) => {
    const base = m.route.replace(/\/view$/, "");
    if ((link === base || link.startsWith(`${base}/`)) && (!best || base.length > best.base.length)) best = { id: m.id, base };
  });
  return best?.id || null;
}

const favKey = (id) => `iso:${id}`;

export default function HaccpIsoMenu() {
  const navigate = useNavigate();
  const [lang] = useLangState("en");
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const searchRef = useRef(null);
  const prefs = useDashPrefs();

  const allowed = useMemo(() => MODULES.filter(moduleVisible), []);
  const mayAdd = useMemo(() => canWrite("iso"), []); // "+ New" follows the add permission
  const hays = useMemo(() => new Map(MODULES.map((m) => [m.id, moduleHay(m)])), []);

  /* open alerts of this section — the same request the bell already made */
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.hidden) return;
      fetchOpenAlertsShared()
        .then((list) => { if (alive) setAlerts(list.filter((a) => String(a.link || "").startsWith("/haccp-iso"))); })
        .catch(() => { /* the hub works without them */ });
    };
    load();
    window.addEventListener(ALERTS_EVENT, load);
    return () => { alive = false; window.removeEventListener(ALERTS_EVENT, load); };
  }, []);

  const alertsByModule = useMemo(() => {
    const m = {};
    alerts.forEach((a) => {
      const id = alertModuleId(a);
      if (!id) return;
      if (!m[id]) m[id] = { n: 0, critical: false };
      m[id].n += 1;
      if (a.severity === "critical") m[id].critical = true;
    });
    return m;
  }, [alerts]);

  /* "/" jumps to the search box. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = normText(query);
  const shown = allowed.filter((m) => (q ? matches(hays.get(m.id), q) : cat === "all" || m.cat === cat));
  const catsShown = CATS.filter((c) => allowed.some((m) => m.cat === c));
  const pinned = prefs.favs
    .filter((k) => k.startsWith("iso:"))
    .map((k) => allowed.find((m) => favKey(m.id) === k))
    .filter(Boolean);

  const text = (m) => (isAr ? m.ar : m.en);
  const go = (m, route) => {
    pushRecent({ k: favKey(m.id), l: text(m).t, r: m.route });
    navigate(route);
  };
  const onSearchKey = (e) => {
    if (e.key === "Enter" && shown.length) go(shown[0], shown[0].route);
    if (e.key === "Escape") setQuery("");
  };
  const arrow = isAr ? "←" : "→";

  const renderCard = (m) => {
    const tx = text(m);
    const style = CAT_STYLE[m.cat];
    const isPinned = prefs.favs.includes(favKey(m.id));
    const al = alertsByModule[m.id];
    return (
      <div
        key={m.id}
        className={`ndx-card${m.master ? " big master" : ""}${m.add && mayAdd ? " has-add" : ""}`}
        style={{ "--glow": m.master ? "rgba(245,158,11,.28)" : style.glow }}
      >
        <button type="button" className="ndx-cmain" onClick={() => go(m, m.route)}>
          <span className="ndx-ico" style={{ background: m.master ? "linear-gradient(135deg,#f59e0b,#b45309)" : style.grad }} aria-hidden="true">{m.icon}</span>
          <span className="ndx-ctxt">
            {m.master && <span className="ndx-kicker">★ {t.master}</span>}
            <span className="ndx-ctitle">{tx.t}</span>
            <span className="ndx-csub">{tx.d}</span>
            {m.tags && (
              <span className="ndx-tags">
                {m.tags.map((x) => <span key={x} className="ndx-tag">{x}</span>)}
              </span>
            )}
          </span>
          <span className="ndx-cfoot">
            {al
              ? <span className={`ndx-badge ${al.critical ? "red" : "amber"}`}>{t.nAlerts(al.n)}</span>
              : m.adminOnly
                ? <span className="ndx-badge blue">{t.adminOnly}</span>
                : <span>{t.open}</span>}
            <span className="ndx-arrow" aria-hidden="true">{arrow}</span>
          </span>
        </button>
        <button
          type="button"
          className={`ndx-star${isPinned ? " on" : ""}`}
          aria-pressed={isPinned}
          aria-label={isPinned ? t.unpin(tx.t) : t.pin(tx.t)}
          title={isPinned ? t.unpin(tx.t) : t.pin(tx.t)}
          onClick={() => toggleFav(favKey(m.id))}
        >
          {isPinned ? "★" : "☆"}
        </button>
        {m.add && mayAdd && (
          <button type="button" className="ndx-add" title={t.addTitle(tx.t)} aria-label={t.addTitle(tx.t)} onClick={() => go(m, m.add)}>
            {t.add}
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="ndx ndx" dir={isAr ? "rtl" : "ltr"} lang={lang}>
      <style>{HUB_CSS}</style>

      <header className="ndx-hero">
        <img src={mawashiLogo} alt="Al Mawashi" className="ndx-logo" />
        <div className="ndx-hello">
          <p className="ndx-eyebrow">{t.eyebrow}</p>
          <h1 className="ndx-title">{t.title}</h1>
          <p className="ndx-sub">{t.sub}</p>
        </div>
        <div className="ndx-hside">
          <span className="ndx-count">{t.modules(allowed.length)}</span>
          <button type="button" className="ndx-back" onClick={() => navigate("/named-dashboard")} aria-label={t.back}>
            {isAr ? "→" : "←"} <span>{t.back}</span>
          </button>
        </div>
      </header>

      {alerts.length > 0 && (
        <section className="ndx-att" aria-label={t.attention}>
          <div className="ndx-att-head">
            <h2 className="ndx-att-title">🔔 {t.attention}</h2>
            <button type="button" className="ndx-sbtn" onClick={() => navigate("/alerts")}>{t.allAlerts(alerts.length)}</button>
          </div>
          <div className="ndx-att-list">
            {alerts.slice(0, 4).map((a) => {
              const sv = SEVERITY[a.severity] || SEVERITY.warning;
              return (
                <div key={a.id} className="ndx-att-item" style={{ background: sv.bg, borderColor: sv.border }}>
                  <span aria-hidden="true">{sv.icon}</span>
                  <div className="ndx-att-txt">
                    <div className="ndx-att-t" style={{ color: sv.color }} dir="auto">{a.title}</div>
                    {a.branch && <div className="ndx-att-s">{a.branch}</div>}
                  </div>
                  {a.link && <button type="button" className="ndx-sbtn" onClick={() => navigate(a.link)}>{t.open}</button>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="ndx-toolbar">
        <label className="ndx-search">
          <span className="ndx-sicon" aria-hidden="true">🔍</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t.search}
            aria-label={t.search}
          />
          {query && (
            <button type="button" className="ndx-x" aria-label={t.clearSearch} onClick={() => setQuery("")}>✕</button>
          )}
        </label>
        {!q && catsShown.length > 1 && (
          <div className="ndx-chips" role="group" aria-label={t.title}>
            {["all", ...catsShown].map((c) => (
              <button
                key={c}
                type="button"
                className={`ndx-chip${cat === c ? " on" : ""}`}
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
              >
                {t[c]}
              </button>
            ))}
          </div>
        )}
      </section>

      {shown.length === 0 ? (
        <div className="ndx-empty">
          <div className="ndx-empty-t">{allowed.length ? t.none : t.noAccess}</div>
        </div>
      ) : q ? (
        <section className="ndx-grid" style={{ marginTop: 14 }} aria-label={t.title}>{shown.map(renderCard)}</section>
      ) : (
        <>
          {cat === "all" && pinned.length > 0 && (
            <>
              <h2 className="ndx-gtitle">⭐ {t.pinned}</h2>
              <section className="ndx-grid">{pinned.map(renderCard)}</section>
            </>
          )}
          {catsShown
            .filter((c) => cat === "all" || cat === c)
            .map((c) => (
              <React.Fragment key={c}>
                <h2 className="ndx-gtitle">{t[c]}</h2>
                <section className="ndx-grid" aria-label={t[c]}>
                  {shown.filter((m) => m.cat === c).map(renderCard)}
                </section>
              </React.Fragment>
            ))}
        </>
      )}

      <footer className="ndx-foot">{t.footer}</footer>
    </main>
  );
}
