// src/pages/hse/HSEMenu.jsx
// 🦺 HSE Department Hub — Health, Safety & Environment

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { useHSELang, HSELangToggle } from "./hseShared";
import HSELocalMigration from "./HSELocalMigration";
import { isItemAllowed } from "../../utils/sectionItems";
import FloatingSettingsButton from "../../components/FloatingSettingsButton";

const T = {
  brandSub:    { ar: "AL MAWASHI — قسم الصحة والسلامة والبيئة", en: "AL MAWASHI — HSE Department" },
  badgeText:   { ar: "🦺 الصحة · السلامة · البيئة",                  en: "🦺 Health · Safety · Environment" },
  hubTitle:    { ar: "🦺 مركز قسم HSE",                                en: "🦺 HSE Department Hub" },
  hubSubtitle: {
    ar: "منظومة متكاملة للصحة والسلامة المهنية، سلامة الغذاء، وحماية البيئة — مطابقة لتشريعات الإمارات و ISO 45001 / FSSC 22000.",
    en: "Integrated system for occupational health, safety, food safety, and environmental compliance — aligned with UAE regulations and ISO 45001 / FSSC 22000.",
  },
  tagline: {
    ar: "سلسلة التبريد · لحم مجمّد · لحم مبرّد · مستورد جواً · تخزين · تصنيع · توزيع",
    en: "Cold-chain · Frozen meat · Chilled meat · Air-imported · Warehousing · Processing · Distribution",
  },
  open:        { ar: "افتح", en: "Open" },
  searchLabel: { ar: "بحث", en: "Search" },
  searchPlaceholder: { ar: "ابحث عن نموذج أو إجراء…", en: "Find a form or procedure…" },
  allGroups:   { ar: "الكل", en: "All" },
  noResults:   { ar: "لا توجد أقسام مطابقة.", en: "No matching HSE sections." },
  footer: {
    ar: "© Al Mawashi — نظام إدارة HSE · مبني وفق الإطار القانوني الإماراتي ومعايير ISO الدولية",
    en: "© Al Mawashi — HSE Management System · Built per UAE legal framework & international ISO standards",
  },
};

const sections = [
  // ═════ Strategic / Reference ═════
  {
    id: "company-profile", group: { ar: "📌 الإطار الاستراتيجي", en: "📌 Strategic Framework" },
    icon: "🏛️",
    title:    { ar: "ملف الشركة (الرؤية + الهيكل)", en: "Company Profile (Vision + Org)" },
    subtitle: { ar: "تبويبان: الرؤية والرسالة والأهداف · الهيكل التنظيمي والأدوار",
                en: "Two tabs: Vision/Mission/Goals · Organizational Structure & Roles" },
    route: "/hse/company-profile",
  },

  // ═════ Policies & Procedures ═════
  {
    id: "policies", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "📜",
    title:    { ar: "السياسات — 17 سياسة أساسية", en: "Policies — 17 Core Policies" },
    subtitle: { ar: "HSE العامة، سلامة الغذاء، سلسلة التبريد، PPE، الطوارئ، التدريب، النفايات…",
                en: "HSE General, Food Safety, Cold Chain, PPE, Emergency, Training, Waste…" },
    route: "/hse/policies",
  },
  {
    id: "sops", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "📘",
    title:    { ar: "SOPs — 33 إجراء قياسي", en: "SOPs — 33 Standard Operating Procedures" },
    subtitle: { ar: "سلامة الغذاء (9) + السلامة المهنية (11) + الطوارئ (4) + البيئة (4) + الإدارة (5)",
                en: "Food Safety (9) + OHS (11) + Emergency (4) + Environment (4) + Admin (5)" },
    route: "/hse/sops",
  },
  {
    id: "risk-register", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "⚠️",
    title:    { ar: "سجل المخاطر التشغيلية", en: "Risk Register" },
    subtitle: { ar: "28 خطراً مُحمّلاً + إضافة + تقييم واعتماد وتصدير PDF",
                en: "28 pre-loaded risks + add + scoring, approval and PDF export" },
    route: "/hse/risk-register",
  },

  // ═════ Daily Operations Forms ═════
  {
    id: "incident-report", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚨",
    title:    { ar: "F-01 · تقرير حادث", en: "F-01 · Incident Report" },
    subtitle: { ar: "إصابات، حرائق، تسربات، تلوث غذائي + تحقيق + 5 Whys + إجراءات تصحيحية",
                en: "Injuries, fires, leaks, food contamination + Investigation + 5 Whys + CAPA" },
    route: "/hse/incident-report",
  },
  {
    id: "ncr", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚫",
    title:    { ar: "F-26 · تقرير عدم المطابقة (NCR)", en: "F-26 · Non-Conformance Report (NCR)" },
    subtitle: { ar: "بلاغ عدم مطابقة + سبب جذري + إجراء تصحيحي/وقائي + فحص فاعلية",
                en: "Non-conformance + Root cause + Corrective/Preventive action + Effectiveness check" },
    route: "/hse/ncr",
  },
  {
    id: "fire-equipment", group: { ar: "🧯 السلامة من الحريق", en: "🧯 Fire Safety" },
    icon: "🧯",
    title:    { ar: "F-28 · فحص معدات الإطفاء", en: "F-28 · Fire Equipment Inspection" },
    subtitle: { ar: "فحص دوري لكل معدات الإطفاء (طفايات/خراطيم/كواشف/إنذار) + الضغط + الصلاحية",
                en: "Periodic inspection (extinguishers/hoses/detectors/alarms) + Pressure + Validity" },
    route: "/hse/fire-equipment",
  },
  {
    id: "emergency-contacts", group: { ar: "🧯 السلامة من الحريق", en: "🧯 Fire Safety" },
    icon: "📞",
    title:    { ar: "F-31 · جهات الطوارئ", en: "F-31 · Emergency Contacts" },
    subtitle: { ar: "قائمة موحدة (998/999/997/112) + المستشفيات + السلطات + الإدارة الداخلية",
                en: "Consolidated list (998/999/997/112) + Hospitals + Authorities + Internal management" },
    route: "/hse/emergency-contacts",
  },
  {
    id: "welfare", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🏠",
    title:    { ar: "F-34 · فحص رعاية العمال", en: "F-34 · Worker Welfare" },
    subtitle: { ar: "مياه شرب + دورات مياه + استراحة + إسعافات + تخزين PPE + مرافق عامة",
                en: "Drinking water + Toilets + Rest area + First aid + PPE storage + General facilities" },
    route: "/hse/welfare",
  },
  {
    id: "forklift-inspection", group: { ar: "🚜 المعدات", en: "🚜 Equipment" },
    icon: "🚜",
    title:    { ar: "F-35 · فحص الرافعة الشوكية", en: "F-35 · Forklift Inspection" },
    subtitle: { ar: "فحص يومي قبل التشغيل (50+ بند) — بصري/شوكتان/هيدروليك/مكابح/تشغيل/سلامة/سائق",
                en: "Daily pre-shift check (50+ items) — Visual/Forks/Hydraulic/Brakes/Operation/Safety/Operator" },
    route: "/hse/forklift-inspection",
  },
  {
    id: "toolbox-meeting", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🗣️",
    title:    { ar: "F-29 · اجتماع Toolbox", en: "F-29 · Toolbox Meeting" },
    subtitle: { ar: "محضر اجتماعات السلامة اليومية + المخاطر + PPE + سجل الحضور والتوقيعات",
                en: "Daily safety meeting minutes + Hazards + PPE + Attendance & signatures" },
    route: "/hse/toolbox-meeting",
  },
  {
    id: "monthly-safety", group: { ar: "📊 التقارير الدورية", en: "📊 Periodic Reports" },
    icon: "📊",
    title:    { ar: "F-21 · التقرير الشهري للسلامة", en: "F-21 · Monthly Safety Report" },
    subtitle: { ar: "KPI تجميعي: ساعات عمل، LTA، Near Miss، تدريب، تدقيق، SPI",
                en: "Consolidated KPIs: man-hours, LTA, Near Miss, training, audits, SPI" },
    route: "/hse/monthly-safety-report",
  },
  {
    id: "kpis", group: { ar: "📊 التقارير الدورية", en: "📊 Periodic Reports" },
    icon: "📈",
    title:    { ar: "لوحة مؤشرات الأداء (KPI Dashboard)", en: "KPI Dashboard" },
    subtitle: { ar: "Lagging + Leading — LTIFR، TRIR، Near Miss، إغلاق CAPA، حرارة، تراخيص — تُحسب آلياً",
                en: "Lagging + Leading — LTIFR, TRIR, Near Miss, CAPA closure, temperature, licenses — auto-calculated" },
    route: "/hse/kpis",
  },
  {
    id: "work-permit", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "📋",
    title:    { ar: "F-07 · تصاريح العمل", en: "F-07 · Work Permits" },
    subtitle: { ar: "أعمال ساخنة، ارتفاعات، كهرباء، كيماويات، رفع",
                en: "Hot work, Heights, Electrical, Chemicals, Lifting" },
    route: "/hse/work-permit",
  },
  {
    id: "cleaning-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧼",
    title:    { ar: "F-10 · التنظيف والتعقيم", en: "F-10 · Cleaning & Sanitation" },
    subtitle: { ar: "يومي/أسبوعي/شهري للمناطق الحرجة + المعقّمات + التركيز",
                en: "Daily/Weekly/Monthly for critical areas + Sanitizers + Concentration" },
    route: "/hse/cleaning-log",
  },
  {
    id: "swabs-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧫",
    title:    { ar: "F-11 · المسحات الميكروبية", en: "F-11 · Microbiological Swabs" },
    subtitle: { ar: "Salmonella, E. coli, Listeria, TPC, ATP — مسحات أسطح + أيدي العمال",
                en: "Salmonella, E.coli, Listeria, TPC, ATP — Surface + Hand swabs" },
    route: "/hse/swabs-log",
  },
  {
    id: "pest-control", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🪳",
    title:    { ar: "F-12 · مكافحة الحشرات", en: "F-12 · Pest Control" },
    subtitle: { ar: "زيارات شهرية من شركة معتمدة من البلدية + سجلات المصائد",
                en: "Monthly visits by DM-approved company + Trap logs" },
    route: "/hse/pest-control",
  },
  {
    id: "equipment-maintenance", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🔧",
    title:    { ar: "F-13/F-18 · صيانة المعدات والتبريد", en: "F-13/F-18 · Equipment & Refrigeration Maintenance" },
    subtitle: { ar: "رافعات، آلات تقطيع، ضواغط تبريد، كواشف غازات + LOTO",
                en: "Forklifts, slicers, refrigeration compressors, gas detectors + LOTO" },
    route: "/hse/equipment-maintenance",
  },
  {
    id: "evacuation-drills", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚨",
    title:    { ar: "F-16 · تجارب الإخلاء", en: "F-16 · Evacuation Drills" },
    subtitle: { ar: "ربع سنوي إلزامي · حريق/أمونيا/كهرباء/زلزال + قياس زمن الإخلاء",
                en: "Quarterly mandatory · Fire/Ammonia/Power/Earthquake + Evacuation time measurement" },
    route: "/hse/evacuation-drills",
  },
  {
    id: "ppe-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧤",
    title:    { ar: "PPE · سجل صرف معدات الوقاية", en: "PPE · Issue Log" },
    subtitle: { ar: "13 صنف معدات + إحصائيات الاستهلاك",
                en: "13 PPE items + Consumption statistics" },
    route: "/hse/ppe-log",
  },
  {
    id: "waste-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🗑️",
    title:    { ar: "F-19 · النفايات والتخلص", en: "F-19 · Waste Disposal" },
    subtitle: { ar: "نفايات عضوية + كرتون + غازات تبريد + شركة معتمدة + Manifest",
                en: "Organic waste + Cardboard + Refrigerant gases + Licensed company + Manifest" },
    route: "/hse/waste-log",
  },
  {
    id: "capa-tracker", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "📌",
    title:    { ar: "F-20 · CAPA Tracker", en: "F-20 · CAPA Tracker" },
    subtitle: { ar: "متابعة الإجراءات التصحيحية والوقائية + المتأخرة + نسبة الإغلاق",
                en: "Track Corrective/Preventive Actions + Overdue + Closure rate" },
    route: "/hse/capa-tracker",
  },

  // ═════ Training & Compliance ═════
  {
    id: "training-matrix", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🎓",
    title:    { ar: "التدريب الداخلي (النظام الموحّد)", en: "Internal Training (single system)" },
    subtitle: { ar: "وحدات تدريب + بنك أسئلة + شهادات + كشف حضور موقّع + تحليل الفجوة",
                en: "Modules + Question bank + Certificates + Signed attendance sheet + Gap analysis" },
    route: "/training",
  },
  {
    id: "licenses", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🪪",
    title:    { ar: "التراخيص والشهادات", en: "Licenses & Certifications" },
    subtitle: { ar: "13 ترخيص محلي ودولي + إنذار 60 يوماً قبل الانتهاء",
                en: "13 local + international licenses + 60-day expiry alert" },
    route: "/hse/licenses",
  },

];

/* ===== Styles — نفس نمط وألوان صفحة ISO 22000 و HACCP ===== */
const shellStyle = {
  minHeight: "100vh",
  padding: "10px clamp(8px, 0.8vw, 16px) 26px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#071b2d",
};
const layoutStyle = { width: "100%", margin: "0 auto" };
const topBarStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: "14px", padding: "12px clamp(12px, 1.4vw, 22px)", borderRadius: 12,
  background: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(15, 23, 42, 0.18)",
  boxShadow: "0 10px 28px rgba(2, 132, 199, 0.10)",
  backdropFilter: "blur(12px)",
  flexWrap: "wrap", position: "relative", overflow: "hidden",
};
const brandLeftStyle = { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 };
const logoStyle = {
  width: "46px", height: "46px", borderRadius: "10px", objectFit: "cover",
  border: "1px solid rgba(2, 132, 199, 0.18)",
  boxShadow: "0 8px 22px rgba(2, 132, 199, 0.14)", background: "#fff",
};
const companyNameStyle = { fontWeight: 950, letterSpacing: "0.01em", margin: 0, lineHeight: 1.2 };
const companySubStyle = { fontWeight: 750, opacity: 0.78, marginTop: "3px" };
const badgeStyle = {
  display: "inline-flex", alignItems: "center", gap: "8px",
  padding: "8px 12px", borderRadius: "999px",
  fontWeight: 900, color: "#052336",
  background: "linear-gradient(135deg, rgba(34,211,238,0.20), rgba(34,197,94,0.14))",
  border: "1px solid rgba(34,211,238,0.38)",
  whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(34,211,238,0.14)",
};
const headerStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
  gap: "16px", margin: "12px 0 10px", flexWrap: "wrap",
};
const titleStyle = { fontWeight: 980, letterSpacing: "0.01em" };
const subtitleStyle = { fontWeight: 750, opacity: 0.82, marginTop: "5px", maxWidth: 980 };
const taglineStyle = { fontWeight: 750, color: "#334155", maxWidth: "560px", margin: 0 };

const complianceStrip = {
  display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4,
};
const complianceChip = {
  padding: "5px 11px", borderRadius: 999,
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(34,211,238,0.30)",
  color: "#0c4a6e", fontWeight: 850,
  boxShadow: "0 3px 10px rgba(2,132,199,0.06)",
  whiteSpace: "nowrap",
};

const toolbarStyle = {
  position: "sticky", top: 0, zIndex: 6,
  margin: "12px 0 14px", padding: "9px 0",
  display: "grid", gridTemplateColumns: "minmax(200px, 340px) 1fr",
  gap: 12, alignItems: "center",
  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 62%, rgba(255,255,255,0))",
  backdropFilter: "blur(8px)",
};
const searchWrapStyle = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "9px 14px", borderRadius: 10,
  background: "#fff", border: "1px solid rgba(15,23,42,0.13)",
  boxShadow: "0 8px 20px rgba(2,132,199,0.08)",
};
const searchInputStyle = {
  width: "100%", minWidth: 0, border: "none", outline: "none",
  background: "transparent", color: "#071b2d", fontWeight: 800, fontFamily: "inherit",
};
const filtersStyle = { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" };
const filterBtnStyle = (active) => ({
  minHeight: 36, padding: "7px 14px", borderRadius: 999,
  border: active ? "1px solid rgba(2,132,199,0.55)" : "1px solid rgba(15,23,42,0.14)",
  background: active
    ? "linear-gradient(135deg, rgba(34,211,238,0.30), rgba(34,197,94,0.20))"
    : "rgba(255,255,255,0.92)",
  color: "#052336", fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
  boxShadow: active ? "0 8px 18px rgba(34,211,238,0.20)" : "0 4px 12px rgba(15,23,42,0.05)",
  transition: "background .16s ease, box-shadow .16s ease, border-color .16s ease",
  whiteSpace: "nowrap",
});

const groupHeadRow = {
  display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
};
const groupBadgeStyle = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "7px 14px", borderRadius: 10,
  background: "linear-gradient(135deg, rgba(34,211,238,0.20), rgba(34,197,94,0.14))",
  border: "1px solid rgba(34,211,238,0.34)",
  color: "#052336", fontWeight: 950,
  boxShadow: "0 4px 12px rgba(34,211,238,0.12)",
  whiteSpace: "nowrap",
};
const groupRuleStyle = {
  flex: 1, height: 1,
  background: "linear-gradient(90deg, rgba(34,211,238,0.34), rgba(15,23,42,0))",
};

const gridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
  gap: "12px", alignItems: "stretch",
};
const cardBaseStyle = {
  position: "relative", display: "flex", gap: "12px", height: "100%",
  padding: "14px 16px 12px", borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15, 23, 42, 0.16)",
  cursor: "pointer", textAlign: "left",
  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
  boxShadow: "0 6px 18px rgba(2, 132, 199, 0.08)", overflow: "hidden",
  fontFamily: "inherit",
};
const cardAccentStyle = (isHover) => ({
  position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 3,
  background: "linear-gradient(180deg, #22d3ee, #22c55e)",
  opacity: isHover ? 1 : 0.34, transition: "opacity .18s ease",
});
const iconWrapStyle = {
  width: "44px", height: "44px", borderRadius: 12,
  background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,197,94,0.12))",
  color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
  border: "1px solid rgba(34,211,238,0.34)",
  boxShadow: "0 8px 16px rgba(34,211,238,0.14)",
};
const cardBodyStyle = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" };
const cardTitleStyle = { fontWeight: 950, marginBottom: "3px", color: "#071b2d", lineHeight: 1.3 };
const cardSubStyle = { color: "#475569", lineHeight: 1.45, flex: 1 };
const cardFooterStyle = {
  fontWeight: 950, color: "#0369a1",
  marginTop: "10px", paddingTop: 9,
  borderTop: "1px solid rgba(15,23,42,0.08)",
  textTransform: "uppercase", letterSpacing: "0.10em",
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
};
const emptyStyle = {
  padding: 26, borderRadius: 12, background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15,23,42,0.14)", color: "#64748b",
  fontWeight: 850, textAlign: "center",
};

/* globals.css يفرض `#root * { font-size: 14px !important }` فيُلغي كل أحجام
   الخطوط المكتوبة داخل الصفحة. المحدِّدات التالية (كلاس مضاعف) تتفوق عليه
   وتُعيد التدرّج الطباعي. الألوان كما هي. */
const HSE_CSS = `
  html:has(.hsx-shell), body:has(.hsx-shell), #root:has(.hsx-shell) { overflow-x: clip; }

  #root .hsx.hsx-company { font-size: 13px !important; }
  #root .hsx.hsx-company-sub { font-size: 11px !important; }
  #root .hsx.hsx-badge { font-size: 11.5px !important; }
  #root .hsx.hsx-title { font-size: clamp(19px, 1.9vw, 28px) !important; }
  #root .hsx.hsx-subtitle { font-size: 13px !important; }
  #root .hsx.hsx-tagline { font-size: 12.5px !important; }
  #root .hsx.hsx-compliance { font-size: 10.5px !important; letter-spacing: .02em; }
  #root .hsx.hsx-search-label { font-size: 11px !important; letter-spacing: .10em; text-transform: uppercase; color: #64748b; font-weight: 900; }
  #root .hsx.hsx-search-input { font-size: 13.5px !important; }
  #root .hsx.hsx-filter { font-size: 12px !important; }
  #root .hsx.hsx-group { font-size: 13px !important; }
  #root .hsx.hsx-icon { font-size: 22px !important; line-height: 1; }
  #root .hsx.hsx-card-title { font-size: 14.5px !important; }
  #root .hsx.hsx-card-sub { font-size: 12.5px !important; }
  #root .hsx.hsx-card-foot { font-size: 10.5px !important; }
  #root .hsx.hsx-footer { font-size: 11px !important; }

  #root .hsx-card:focus-visible { outline: 2px solid #0369a1; outline-offset: 2px; }
  #root .hsx-search-input::placeholder { color: #94a3b8; font-weight: 700; }

  @media (max-width: 980px) {
    .hsx-toolbar {
      position: static !important;
      grid-template-columns: 1fr !important;
    }
    .hsx-filters { justify-content: flex-start !important; }
  }
`;

export default function HSEMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const { lang, toggle, dir, pick } = useHSELang();

  const cardStyle = useMemo(() => {
    return (isHover) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-3px)" : "translateY(0)",
      background: isHover
        ? "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(236,254,255,0.72))"
        : cardBaseStyle.background,
      boxShadow: isHover ? "0 16px 38px rgba(34,211,238,0.20)" : cardBaseStyle.boxShadow,
      borderColor: isHover ? "rgba(34,211,238,0.55)" : "rgba(15, 23, 42, 0.16)",
      textAlign: dir === "rtl" ? "right" : "left",
    });
  }, [dir]);

  const allowedSections = useMemo(
    () => sections.filter((s) => isItemAllowed("hse", s.id)),
    []
  );

  // مفتاح المجموعة ثابت (النص الإنجليزي) حتى لا يتغيّر عند تبديل اللغة
  const groupList = useMemo(() => {
    const seen = [];
    allowedSections.forEach((s) => {
      if (!seen.some((g) => g.id === s.group.en)) {
        seen.push({ id: s.group.en, label: pick(s.group) });
      }
    });
    return seen;
  }, [allowedSections, pick]);

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allowedSections.filter((s) => {
      if (activeGroup !== "all" && s.group.en !== activeGroup) return false;
      if (!q) return true;
      const text = `${pick(s.title)} ${pick(s.subtitle)} ${s.title.en} ${s.title.ar}`.toLowerCase();
      return text.includes(q);
    });
  }, [activeGroup, allowedSections, pick, query]);

  const groupedVisible = useMemo(() => {
    const map = new Map();
    visibleSections.forEach((s) => {
      const key = s.group.en;
      if (!map.has(key)) map.set(key, { label: pick(s.group), items: [] });
      map.get(key).items.push(s);
    });
    return Array.from(map.values());
  }, [pick, visibleSections]);

  return (
    <main className="hsx-shell" style={shellStyle} dir={dir}>
      <FloatingSettingsButton />
      <style>{HSE_CSS}</style>

      <div style={layoutStyle}>
        <div style={topBarStyle}>
          {/* توهج زخرفي — نفس الشريط في صفحة HACCP/ISO */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background:
                "radial-gradient(800px 220px at 15% 0%, rgba(34,211,238,0.18), transparent 60%)," +
                "radial-gradient(800px 220px at 85% 10%, rgba(34,197,94,0.14), transparent 60%)",
              opacity: 0.9,
            }}
          />
          <div style={{ ...brandLeftStyle, position: "relative" }}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={logoStyle} />
            <div style={{ minWidth: 0 }}>
              <div className="hsx hsx-company" style={companyNameStyle}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
              <div className="hsx hsx-company-sub" style={companySubStyle}>{pick(T.brandSub)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative", flexWrap: "wrap" }}>
            <HSELocalMigration />
            <HSELangToggle lang={lang} toggle={toggle} />
            <div className="hsx hsx-badge" style={badgeStyle}>{pick(T.badgeText)}</div>
          </div>
        </div>

        <header style={headerStyle}>
          <div style={{ minWidth: 0 }}>
            <div className="hsx hsx-title" style={titleStyle}>{pick(T.hubTitle)}</div>
            <div className="hsx hsx-subtitle" style={subtitleStyle}>{pick(T.hubSubtitle)}</div>
          </div>
          <p className="hsx hsx-tagline" style={taglineStyle}>{pick(T.tagline)}</p>
        </header>

        <div style={complianceStrip}>
          {[
            "✅ MOHRE (33/2021)",
            "✅ Dubai Municipality",
            "✅ Civil Defence",
            "✅ MoCCAE",
            "✅ ESMA / MoIAT (Halal)",
            "✅ ISO 45001 · ISO 14001 · ISO 22000 · HACCP",
          ].map((c) => (
            <span key={c} className="hsx hsx-compliance" style={complianceChip}>{c}</span>
          ))}
        </div>

        {/* بحث + فلترة حسب المجموعة */}
        <section className="hsx-toolbar" style={toolbarStyle}>
          <label style={searchWrapStyle}>
            <span className="hsx hsx-search-label" aria-hidden="true">{pick(T.searchLabel)}</span>
            <input
              className="hsx hsx-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pick(T.searchPlaceholder)}
              style={searchInputStyle}
            />
          </label>

          <div className="hsx-filters" style={filtersStyle}>
            <button
              type="button"
              className="hsx hsx-filter"
              onClick={() => setActiveGroup("all")}
              style={filterBtnStyle(activeGroup === "all")}
            >
              {pick(T.allGroups)} ({allowedSections.length})
            </button>
            {groupList.map((g) => (
              <button
                key={g.id}
                type="button"
                className="hsx hsx-filter"
                onClick={() => setActiveGroup(g.id)}
                style={filterBtnStyle(activeGroup === g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Cards — filtered by per-user HSE permissions */}
        <section aria-label="HSE sections">
          {groupedVisible.length ? (
            groupedVisible.map((group) => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <div style={groupHeadRow}>
                  <span className="hsx hsx-group" style={groupBadgeStyle}>
                    {group.label}
                    <span style={{ opacity: 0.7, fontWeight: 800 }}>({group.items.length})</span>
                  </span>
                  <span aria-hidden="true" style={groupRuleStyle} />
                </div>

                <div style={gridStyle}>
                  {group.items.map((item) => {
                    const isHover = hoverId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="hsx-card"
                        style={cardStyle(isHover)}
                        onClick={() => navigate(item.route)}
                        onMouseEnter={() => setHoverId(item.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(item.id)}
                        onBlur={() => setHoverId(null)}
                        title={pick(item.title)}
                      >
                        <span aria-hidden="true" style={cardAccentStyle(isHover)} />
                        <div
                          aria-hidden="true"
                          style={{
                            position: "absolute", inset: 0, pointerEvents: "none",
                            background:
                              "radial-gradient(260px 180px at 0% 0%, rgba(34,211,238,0.14), transparent 60%)," +
                              "radial-gradient(240px 160px at 100% 100%, rgba(34,197,94,0.12), transparent 55%)",
                            opacity: isHover ? 1 : 0.7,
                            transition: "opacity .18s ease",
                          }}
                        />
                        <div className="hsx hsx-icon" style={{ ...iconWrapStyle, position: "relative" }}>{item.icon}</div>
                        <div style={{ ...cardBodyStyle, position: "relative" }}>
                          <div className="hsx hsx-card-title" style={cardTitleStyle}>{pick(item.title)}</div>
                          <div className="hsx hsx-card-sub" style={cardSubStyle}>{pick(item.subtitle)}</div>
                          <div className="hsx hsx-card-foot" style={cardFooterStyle}>
                            <span>{pick(T.open)}</span>
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true"
                              style={{ transform: dir === "rtl" ? "scaleX(-1)" : "none", opacity: isHover ? 1 : 0.7, transition: "opacity .18s ease" }}
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={emptyStyle}>{pick(T.noResults)}</div>
          )}
        </section>

        <div className="hsx hsx-footer" style={{ marginTop: 16, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          {pick(T.footer)}
        </div>
      </div>
    </main>
  );
}
