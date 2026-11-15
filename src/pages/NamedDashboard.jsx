// src/pages/NamedDashboard.jsx
// The home screen of a signed-in account: what needs attention today, then
// the sections it may open — grouped, searchable, pinnable.
//
//   dashboard/dashboardLive.js    open alerts · daily logs filed today · connection
//   dashboard/dashboardPrefs.js   pinned cards + recently opened (saved on the account)
//   dashboard/dashboardSearch.js  forgiving Arabic search + report-level results
//   dashboard/OperatorPicker.jsx  "who is working now?"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";
import { clearAppSession } from "../utils/authFetch";
import { confirmLogoutWithOutbox } from "../utils/offlineOutbox";
import { getActiveCompany, clearActiveCompany } from "../utils/companyContext";
import { useInventoryOfficer } from "./workforce/workforceAccess";
import { DM_CHECKED_URL, openExternal } from "../config/externalLinks";
import { useLangState } from "../utils/appLang";
import { SEVERITY } from "../utils/alertsApi";
import TodayFoodSafetyStrip from "./dashboard/TodayFoodSafetyStrip";
import OperatorPicker from "./dashboard/OperatorPicker";
import { useDashboardLive, alertCardId } from "./dashboard/dashboardLive";
import { useDashPrefs, toggleFav, pushRecent } from "./dashboard/dashboardPrefs";
import { normText, matches, buildReportIndex } from "./dashboard/dashboardSearch";

/* Every visible string, in both languages. The language is the ACCOUNT's
   (utils/appLang.js) — the ع|EN switcher flips this screen live. */
const T = {
  en: {
    morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening",
    eyebrow: "Al Mawashi QMS",
    fullAccess: (n) => `Full access · ${n} sections`,
    available: (n) => `${n} section${n !== 1 ? "s" : ""} available to you`,
    admin: "👑 Admin · ", account: "Account:",
    changeOperator: "🔄 Change operator",
    currently: (name) => `Currently: ${name}`, switchCompany: "Switch company",
    signOut: "🚪 Sign out", menu: "Account menu",
    online: "Online", offline: "Offline",
    waitingShort: (n) => `${n} waiting`,
    search: "Find a section or a report…  ( / )", clearSearch: "Clear search",
    expires: (m) => `Session expires in ${m} minute${m !== 1 ? "s" : ""} — please save your work`,
    noneFound: "Nothing found", contactAdmin: "No section is assigned to this account yet. Contact your administrator.", tryAnother: "Try another search term.",
    sectionsAria: "Dashboard sections",
    open: "Open", openPortal: "Open portal",
    footer: "Built by Eng. Mohammed Abdullah",
    // groups
    all: "All", g_ops: "Operations", g_quality: "Quality", g_mgmt: "Management", g_tools: "Tools",
    favs: "Pinned", recent: "Continue where you left off", reports: "Reports",
    pin: (name) => `Pin ${name}`, unpin: (name) => `Unpin ${name}`,
    enter: "Enter", view: "View",
    // live
    attention: "Needs your attention today",
    allClear: "All clear — no open alerts.",
    allAlerts: (n) => `All alerts (${n})`,
    nAlerts: (n) => `${n} alert${n !== 1 ? "s" : ""}`,
    filedToday: (d, e) => `${d} of ${e} logs filed today`,
    offlineMsg: "You are offline. Saves stay on this device and upload when the connection is back.",
    waitingMsg: (n) => `${n} saved report${n !== 1 ? "s" : ""} still waiting to upload from this device.`,
    // operator picker
    whoTitle: "Who is working now?", pickSub: "Select your name to log this session",
    fromList: "📋 Select from list", typeName: "✏️ Type name",
    enterName: "Enter your name…", findName: "Find your name…", noName: "No name matches.",
    start: "✅ Start Session",
  },
  ar: {
    morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء الخير",
    eyebrow: "نظام الجودة — المواشي",
    fullAccess: (n) => `صلاحية كاملة · ${n} أقسام`,
    available: (n) => (n === 1 ? "قسم واحد متاح لك" : `${n} أقسام متاحة لك`),
    admin: "👑 مدير · ", account: "الحساب:",
    changeOperator: "🔄 تغيير المشغّل",
    currently: (name) => `الحالية: ${name}`, switchCompany: "تبديل الشركة",
    signOut: "🚪 تسجيل الخروج", menu: "قائمة الحساب",
    online: "متصل", offline: "غير متصل",
    waitingShort: (n) => `${n} بالانتظار`,
    search: "ابحث عن قسم أو تقرير…  ( / )", clearSearch: "مسح البحث",
    expires: (m) => `تنتهي الجلسة خلال ${m} ${m === 1 ? "دقيقة" : "دقائق"} — يرجى حفظ عملك`,
    noneFound: "لا توجد نتائج", contactAdmin: "لم يُحدَّد أي قسم لهذا الحساب بعد. تواصل مع مدير النظام.", tryAnother: "جرّب كلمة بحث أخرى.",
    sectionsAria: "أقسام لوحة التحكم",
    open: "فتح", openPortal: "فتح البوابة",
    footer: "تطوير م. محمد عبدالله",
    all: "الكل", g_ops: "العمليات", g_quality: "الجودة", g_mgmt: "الإدارة", g_tools: "أدوات",
    favs: "المفضلة", recent: "تابع من حيث توقفت", reports: "التقارير",
    pin: (name) => `تثبيت ${name}`, unpin: (name) => `إلغاء تثبيت ${name}`,
    enter: "إدخال", view: "عرض",
    attention: "يحتاج انتباهك اليوم",
    allClear: "كل شيء تمام — لا يوجد تنبيه مفتوح.",
    allAlerts: (n) => `كل التنبيهات (${n})`,
    nAlerts: (n) => (n === 1 ? "تنبيه واحد" : n === 2 ? "تنبيهان" : n <= 10 ? `${n} تنبيهات` : `${n} تنبيهًا`),
    filedToday: (d, e) => `${d} من ${e} سجل اليوم`,
    offlineMsg: "أنت غير متصل. ما تحفظه يبقى على هذا الجهاز ويُرفع عند عودة الاتصال.",
    waitingMsg: (n) => (n === 1 ? "تقرير واحد محفوظ ينتظر الرفع من هذا الجهاز." : `${n} تقارير محفوظة تنتظر الرفع من هذا الجهاز.`),
    whoTitle: "من يعمل الآن؟", pickSub: "اختر اسمك لتسجيل هذه الجلسة",
    fromList: "📋 اختيار من القائمة", typeName: "✏️ كتابة الاسم",
    enterName: "اكتب اسمك…", findName: "ابحث عن اسمك…", noName: "لا يوجد اسم مطابق.",
    start: "✅ بدء الجلسة",
  },
};

/* ── Each card: label · route · icon · its own colour · the group it sits in ── */
const GROUPS = ["ops", "quality", "mgmt", "tools"];
const ALL_ROLES = [
  {
    id: "kpi", group: "mgmt", label: "KPI Dashboard", route: "/kpi", icon: "📈",
    grad: "linear-gradient(135deg,#0f766e,#14b8a6)", glow: "rgba(20,184,166,.30)",
  },
  {
    id: "inspector", group: "ops", label: "Inspector", route: "/inspection", icon: "🔍",
    grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)", glow: "rgba(59,130,246,.30)",
  },
  {
    // "admin" = View reports — its doors live on /monitor now, so an
    // account holding only that section still needs this card.
    id: "daily", group: "ops", label: "Daily Monitor", route: "/monitor", icon: "📅", anyOf: ["admin"],
    grad: "linear-gradient(135deg,#06b6d4,#0284c7)", glow: "rgba(6,182,212,.30)",
  },
  {
    id: "ohc", group: "ops", label: "OHC", route: "/ohc", icon: "🩺",
    grad: "linear-gradient(135deg,#10b981,#059669)", glow: "rgba(16,185,129,.30)",
  },
  {
    id: "returns", group: "ops", label: "Returns", route: "/returns/menu", icon: "♻️",
    grad: "linear-gradient(135deg,#f97316,#ea580c)", glow: "rgba(249,115,22,.30)",
  },
  {
    id: "finalProduct", group: "ops", label: "Final Product", route: "/finished-product", icon: "🏷️",
    grad: "linear-gradient(135deg,#ec4899,#db2777)", glow: "rgba(236,72,153,.30)",
  },
  {
    id: "cars", group: "mgmt", label: "Cars", route: "/cars", icon: "🚗",
    grad: "linear-gradient(135deg,#64748b,#475569)", glow: "rgba(100,116,139,.30)",
  },
  {
    id: "maintenance", group: "mgmt", label: "Maintenance", route: "/maintenance-home", icon: "🔧",
    grad: "linear-gradient(135deg,#ef4444,#dc2626)", glow: "rgba(239,68,68,.30)",
  },
  {
    id: "qcsView", group: "ops", label: "QCS Shipments", route: "/qcs-raw-material-view", icon: "📦",
    grad: "linear-gradient(135deg,#6366f1,#4f46e5)", glow: "rgba(99,102,241,.30)",
  },
  {
    id: "training", group: "quality", label: "Training Certs", route: "/training-certificates", icon: "🎓",
    grad: "linear-gradient(135deg,#a855f7,#9333ea)", glow: "rgba(168,85,247,.30)",
  },
  {
    id: "internalTraining", group: "quality", label: "Internal Training", route: "/training", icon: "🧑‍🏫",
    grad: "linear-gradient(135deg,#2563eb,#1e40af)", glow: "rgba(37,99,235,.30)",
  },
  {
    id: "iso", group: "quality", label: "ISO & HACCP", route: "/iso-haccp", icon: "📘",
    grad: "linear-gradient(135deg,#0891b2,#0e7490)", glow: "rgba(8,145,178,.30)",
  },
  {
    id: "hse", group: "quality", label: "HSE", route: "/hse", icon: "🦺",
    grad: "linear-gradient(135deg,#eab308,#ca8a04)", glow: "rgba(234,179,8,.30)",
  },
  {
    // كرت واحد بيجمع الجزار والتصنيع — الظهور إذا كان عنده صلاحية أي وحدة منهم
    id: "inventory", group: "ops", label: "Inventory", route: "/inventory", icon: "🏭",
    anyOf: ["butcher", "mrp", "workforce", "labels"],
    keywords: ["butcher", "manufacturing", "bom", "stock", "workforce", "label", "مخزون", "جزار", "تصنيع", "قوى عاملة", "ملصق"],
    grad: "linear-gradient(135deg,#b45309,#92400e)", glow: "rgba(180,83,9,.30)",
  },
  {
    // 🧬 منظومة تتبع المنتج — كود واحد يعرض رحلة المنتج من الشحنة حتى العميل
    id: "productTrace", group: "quality", label: "Product Traceability", route: "/product-trace", icon: "🧬",
    keywords: ["trace", "traceability", "recall", "item code", "تتبع", "كود", "استدعاء"],
    grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", glow: "rgba(124,58,237,.30)",
  },
  {
    // 🧊 غرف التبريد ثلاثية الأبعاد — 8 غرف (4 مقابل 4) مربوطة بسجل الحرارة والمعايرة
    id: "coldRooms", group: "ops", label: "Cold Rooms 3D", route: "/cold-rooms", icon: "🧊",
    keywords: ["cold room", "chiller", "freezer", "3d", "temperature", "calibration", "غرف التبريد", "مبرد", "مجمد", "حرارة"],
    grad: "linear-gradient(135deg,#0ea5e9,#1e3a8a)", glow: "rgba(14,165,233,.30)",
  },
  {
    id: "emailCenter", group: "tools", label: "Email Center", route: "/email-center", icon: "📨",
    grad: "linear-gradient(135deg,#1e40af,#7c3aed)", glow: "rgba(30,64,175,.30)",
  },
  {
    // 🏛️ بوابة تقارير بلدية دبي — رابط خارجي فقط (يفتح بتبويب جديد)
    id: "dmChecked", group: "tools", label: "Dubai Municipality", href: DM_CHECKED_URL, icon: "🏛️",
    keywords: ["dm", "dm checked", "municipality", "dubai", "بلدية", "بلدية دبي"],
    grad: "linear-gradient(135deg,#b91c1c,#7f1d1d)", glow: "rgba(185,28,28,.30)",
  },
  {
    id: "settings", group: "tools", label: "Settings", route: "/settings", icon: "⚙️",
    grad: "linear-gradient(135deg,#475569,#334155)", glow: "rgba(71,85,105,.30)",
  },
];

/* What each card opens — a real one-liner instead of a generic subtitle. */
const ROLE_INFO = {
  kpi:              "Performance indicators and trends",
  inspector:        "Branch inspections and audits",
  daily:            "Daily reports from every branch",
  ohc:              "Staff health certificates",
  returns:          "Branch and customer returns",
  finalProduct:     "Finished product checks",
  cars:             "Delivery vehicles",
  maintenance:      "Maintenance requests and repairs",
  qcsView:          "Incoming shipments and raw material",
  training:         "Training certificates register",
  internalTraining: "Courses, quizzes and attendance",
  iso:              "FSMS manual, HACCP and documents",
  hse:              "Health, safety and risk register",
  inventory:        "Butcher, manufacturing and workforce",
  productTrace:     "From shipment to customer by item code",
  coldRooms:        "3D view of the eight cold rooms with live temperatures",
  emailCenter:      "Send and track report e-mails",
  dmChecked:        "Dubai Municipality portal — opens in a new tab",
  settings:         "Accounts, permissions and setup",
};

/* The same cards in Arabic — label and one-liner. */
const ROLE_INFO_AR = {
  kpi:              { label: "مؤشرات الأداء",          desc: "مؤشرات الأداء واتجاهاتها" },
  inspector:        { label: "التفتيش",                desc: "تفتيش الفروع والتدقيق" },
  daily:            { label: "المتابعة اليومية",        desc: "التقارير اليومية من كل الفروع" },
  ohc:              { label: "الشهادات الصحية",         desc: "الشهادات الصحية للموظفين" },
  returns:          { label: "المرتجعات",              desc: "مرتجعات الفروع والعملاء" },
  finalProduct:     { label: "المنتج النهائي",          desc: "فحص المنتج النهائي" },
  cars:             { label: "السيارات",               desc: "سيارات التوصيل" },
  maintenance:      { label: "الصيانة",                desc: "طلبات الصيانة والإصلاح" },
  qcsView:          { label: "شحنات QCS",              desc: "الشحنات الواردة والمواد الخام" },
  training:         { label: "شهادات التدريب",          desc: "سجل شهادات التدريب" },
  internalTraining: { label: "التدريب الداخلي",         desc: "الدورات والاختبارات والحضور" },
  iso:              { label: "الأيزو والهاسب",          desc: "دليل نظام سلامة الغذاء والهاسب والوثائق" },
  hse:              { label: "الصحة والسلامة والبيئة",   desc: "الصحة والسلامة وسجل المخاطر" },
  inventory:        { label: "المخزون",                desc: "الجزارة والتصنيع والقوى العاملة" },
  productTrace:     { label: "تتبع المنتج",             desc: "من الشحنة حتى العميل برمز الصنف" },
  coldRooms:        { label: "غرف التبريد 3D",          desc: "عرض ثلاثي الأبعاد للغرف الثماني مع الحرارة الحالية" },
  emailCenter:      { label: "مركز البريد",             desc: "إرسال رسائل التقارير ومتابعتها" },
  dmChecked:        { label: "بلدية دبي",               desc: "بوابة بلدية دبي — تُفتح في تبويب جديد" },
  settings:         { label: "الإعدادات",               desc: "الحسابات والصلاحيات والإعداد" },
};

/** A card's label / one-liner in the screen's language. */
function roleText(role, lang) {
  const ar = lang === "ar" ? ROLE_INFO_AR[role.id] : null;
  return { label: ar?.label || role.label, desc: ar?.desc || ROLE_INFO[role.id] || "" };
}

/** What the search looks through for a card — both languages, folded. */
const roleHay = (role) =>
  normText([
    role.label, ROLE_INFO[role.id], ROLE_INFO_AR[role.id]?.label, ROLE_INFO_AR[role.id]?.desc,
    T.en[`g_${role.group}`], T.ar[`g_${role.group}`], ...(role.keywords || []),
  ].join(" "));

/* globals.css forces every #root font-size with !important, so real sizes
   live here (doubled class beats `#root *`) and follow the Aa text-size
   slider via --app-fs. Light "Soft Sky" surfaces; hover is plain CSS. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const ND_CSS = `
.ndx { min-height:100vh; box-sizing:border-box; display:flex; flex-direction:column;
  padding:16px clamp(12px,1.6vw,26px) 14px; background:linear-gradient(180deg,#f3f8fe 0%,#eef6fb 50%,#f6f9fd 100%);
  color:#0f172a; font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.ndx *, .ndx *::before, .ndx *::after { box-sizing:border-box; }
.ndx button { font-family:inherit; }

/* ── header ── */
.ndx-hero { position:relative; display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:18px;
  background:linear-gradient(120deg,#ffffff 0%,#eef6ff 60%,#e3f2fd 100%); border:1px solid #d7e6f7;
  box-shadow:0 6px 22px rgba(30,64,120,.08); }
.ndx-logo { width:58px; height:58px; border-radius:14px; object-fit:cover; background:#fff; border:1px solid #dbeafe; flex-shrink:0; }
.ndx-hello { min-width:0; flex:1; }
#root .ndx.ndx .ndx-eyebrow { font-size:${fs(12)}; margin:0; font-weight:800; color:#2563eb; letter-spacing:.07em; text-transform:uppercase; }
#root .ndx.ndx[dir="rtl"] .ndx-eyebrow { letter-spacing:0; }
#root .ndx.ndx .ndx-title { font-size:${fs(25)}; margin:3px 0 0; font-weight:900; line-height:1.2; color:#0f172a;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-sub { font-size:${fs(13.5)}; margin:5px 0 0; color:#526581; font-weight:600; line-height:1.45; }
.ndx-hside { display:flex; align-items:center; gap:10px; flex-shrink:0; position:relative; }
.ndx-net { display:inline-flex; align-items:center; gap:7px; padding:7px 12px; border-radius:999px; font-weight:800;
  background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; white-space:nowrap; }
.ndx-net::before { content:""; width:9px; height:9px; border-radius:50%; background:currentColor; }
.ndx-net.off { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.ndx-net.wait { background:#fffbeb; color:#b45309; border-color:#fde68a; }
#root .ndx.ndx .ndx-net { font-size:${fs(13)}; }
#root .ndx.ndx .ndx-clock { font-size:${fs(21)}; font-weight:900; color:#1e3a5f; font-variant-numeric:tabular-nums;
  padding-inline:12px; border-inline:1px solid #d7e6f7; line-height:1.4; }
.ndx-actions { display:flex; gap:8px; align-items:center; }
.ndx-hbtn { min-height:42px; padding:8px 14px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  font-weight:800; cursor:pointer; white-space:nowrap; transition:background .15s,border-color .15s; }
.ndx-hbtn:hover { background:#eff6ff; border-color:#93c5fd; }
.ndx-hbtn.danger { color:#b91c1c; border-color:#fecaca; background:#fff5f5; }
.ndx-hbtn.danger:hover { background:#fee2e2; }
#root .ndx.ndx .ndx-hbtn { font-size:${fs(13.5)}; }
.ndx-more { display:none; width:42px; height:42px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  cursor:pointer; font-weight:900; }
#root .ndx.ndx .ndx-more { font-size:${fs(20)}; line-height:1; }

/* ── needs attention ── */
.ndx-att { margin-top:14px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; padding:12px 14px;
  box-shadow:0 1px 2px rgba(15,23,42,.04); }
.ndx-att-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
#root .ndx.ndx .ndx-att-title { font-size:${fs(15)}; font-weight:900; color:#0f172a; margin:0; }
.ndx-att-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:8px; }
.ndx-att-item { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:12px; border:1px solid; min-width:0; }
.ndx-att-txt { min-width:0; flex:1; }
#root .ndx.ndx .ndx-att-t { font-size:${fs(14)}; font-weight:800; line-height:1.4; }
#root .ndx.ndx .ndx-att-s { font-size:${fs(12.5)}; color:#64748b; margin-top:2px; }
.ndx-sbtn { border:1px solid #cbd5e1; background:#fff; border-radius:9px; padding:6px 12px; cursor:pointer; font-weight:800;
  color:#1e3a5f; white-space:nowrap; flex-shrink:0; }
.ndx-sbtn:hover { background:#eff6ff; border-color:#93c5fd; }
#root .ndx.ndx .ndx-sbtn { font-size:${fs(13)}; }
.ndx-clear-ok { display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 14px; border-radius:12px;
  background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; font-weight:800; }
#root .ndx.ndx .ndx-clear-ok { font-size:${fs(14)}; }
#root .ndx.ndx .tfs.tfs { margin:14px 0 0; }

/* ── toolbar ── */
.ndx-toolbar { margin:16px 0 4px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.ndx-search { flex:1 1 280px; display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:12px; background:#fff;
  border:1px solid #cfe0f3; box-shadow:0 2px 8px rgba(30,64,120,.05); }
.ndx-search:focus-within { border-color:#60a5fa; box-shadow:0 0 0 3px rgba(59,130,246,.16); }
.ndx-search input { width:100%; min-width:0; border:none; outline:none; background:transparent; color:#0f172a; font-weight:700; font-family:inherit; }
#root .ndx.ndx .ndx-search input { font-size:${fs(15)}; }
#root .ndx.ndx .ndx-sicon { font-size:${fs(16)}; }
.ndx-x { border:none; background:none; color:#94a3b8; cursor:pointer; padding:0 2px; }
#root .ndx.ndx .ndx-x { font-size:${fs(15)}; }
.ndx-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ndx-chip { min-height:40px; padding:6px 14px; border-radius:999px; border:1px solid #cfe0f3; background:#fff; color:#475569;
  font-weight:800; cursor:pointer; }
.ndx-chip:hover { border-color:#93c5fd; }
.ndx-chip.on { background:#2563eb; border-color:#2563eb; color:#fff; }
#root .ndx.ndx .ndx-chip { font-size:${fs(13.5)}; }

/* ── sections ── */
#root .ndx.ndx .ndx-gtitle { font-size:${fs(13)}; margin:18px 2px 9px; font-weight:900; color:#526581; letter-spacing:.06em;
  text-transform:uppercase; display:flex; align-items:center; gap:8px; }
#root .ndx.ndx[dir="rtl"] .ndx-gtitle { letter-spacing:0; }
.ndx-gtitle::after { content:""; flex:1; height:1px; background:#dbe6f3; }
.ndx-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr)); gap:14px; }
.ndx-card { position:relative; border-radius:16px; background:#fff; border:1px solid #e2e8f0;
  box-shadow:0 2px 8px rgba(15,23,42,.05); transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  animation:ndxIn .3s ease both; }
.ndx-card:hover, .ndx-card:focus-within { transform:translateY(-2px); border-color:#93c5fd; box-shadow:0 14px 30px var(--glow, rgba(37,99,235,.2)); }
.ndx-cmain { width:100%; height:100%; min-height:138px; display:flex; flex-direction:column; gap:10px; padding:16px 16px 12px;
  border:none; background:none; cursor:pointer; text-align:start; color:inherit; border-radius:16px; }
.ndx-cmain:focus-visible, .ndx-tool:focus-visible, .ndx-star:focus-visible, .ndx-chip:focus-visible, .ndx-hbtn:focus-visible, .ndx-rrow:focus-visible
  { outline:3px solid rgba(59,130,246,.45); outline-offset:2px; }
.ndx-ico { width:50px; height:50px; border-radius:13px; display:grid; place-items:center; color:#fff; flex-shrink:0; }
#root .ndx.ndx .ndx-ico { font-size:${fs(25)}; line-height:1; }
#root .ndx.ndx .ndx-ctitle { font-size:${fs(17.5)}; font-weight:900; color:#0f172a; line-height:1.25; display:block; }
#root .ndx.ndx .ndx-csub { font-size:${fs(13)}; font-weight:600; color:#64748b; line-height:1.45; display:block; margin-top:4px; }
.ndx-cfoot { margin-top:auto; padding-top:9px; border-top:1px solid #eef2f7; display:flex; align-items:center; gap:6px;
  flex-wrap:wrap; color:#2563eb; font-weight:800; }
#root .ndx.ndx .ndx-cfoot { font-size:${fs(13.5)}; }
.ndx-arrow { margin-inline-start:auto; transition:transform .16s ease; }
.ndx-card:hover .ndx-arrow, .ndx-tool:hover .ndx-arrow { transform:translateX(4px); }
.ndx[dir="rtl"] .ndx-card:hover .ndx-arrow, .ndx[dir="rtl"] .ndx-tool:hover .ndx-arrow { transform:translateX(-4px); }
.ndx-badge { padding:3px 9px; border-radius:999px; font-weight:800; border:1px solid; white-space:nowrap; }
#root .ndx.ndx .ndx-badge { font-size:${fs(12.5)}; }
.ndx-badge.red { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.ndx-badge.amber { background:#fffbeb; color:#b45309; border-color:#fde68a; }
.ndx-badge.green { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
.ndx-badge.blue { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.ndx-star { position:absolute; top:10px; inset-inline-end:10px; width:36px; height:36px; border-radius:10px; border:none;
  background:none; color:#cbd5e1; cursor:pointer; display:grid; place-items:center; }
.ndx-star:hover { background:#f1f5f9; color:#f59e0b; }
.ndx-star.on { color:#f59e0b; }
#root .ndx.ndx .ndx-star { font-size:${fs(20)}; line-height:1; }

/* small one-line cards: tools, recent */
.ndx-tools { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr)); gap:10px; }
.ndx-tool { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:13px; background:#fff; border:1px solid #e2e8f0;
  cursor:pointer; color:#0f172a; text-align:start; min-width:0; transition:border-color .15s, box-shadow .15s; }
.ndx-tool:hover { border-color:#93c5fd; box-shadow:0 6px 16px rgba(37,99,235,.12); }
.ndx-tool .ndx-ico { width:36px; height:36px; border-radius:10px; }
#root .ndx.ndx .ndx-tool .ndx-ico { font-size:${fs(18)}; }
.ndx-tool-txt { min-width:0; flex:1; }
#root .ndx.ndx .ndx-tool-t { font-size:${fs(14.5)}; font-weight:800; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-tool-s { font-size:${fs(12.5)}; color:#64748b; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-tool .ndx-arrow { font-size:${fs(14)}; color:#2563eb; }

/* report-level search results */
.ndx-rlist { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)); gap:8px; }
.ndx-rrow { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#fff; border:1px solid #e2e8f0;
  cursor:pointer; text-align:start; color:#0f172a; min-width:0; }
.ndx-rrow:hover { border-color:#93c5fd; background:#f8fbff; }
#root .ndx.ndx .ndx-rrow-ic { font-size:${fs(18)}; }

.ndx-empty { margin-top:16px; padding:30px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; text-align:center; color:#64748b; font-weight:700; }
#root .ndx.ndx .ndx-empty, #root .ndx.ndx .ndx-empty div { font-size:${fs(14.5)}; }
#root .ndx.ndx .ndx-empty .ndx-empty-t { font-size:${fs(17)}; font-weight:900; color:#0f172a; margin-bottom:6px; }
#root .ndx.ndx .ndx-foot { font-size:${fs(12)}; margin-top:auto; padding-top:18px; text-align:center; color:#7b8aa1; font-weight:700; }

@keyframes ndxIn { from { opacity:0; } to { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  .ndx-card { animation:none; transition:none; }
  .ndx-card:hover, .ndx-card:focus-within { transform:none; }
  .ndx-arrow { transition:none; }
}

/* ── phone: one compact header row, the buttons fold into ⋮ ── */
@media (max-width: 860px) {
  .ndx-hero { padding:12px; gap:10px; border-radius:14px; }
  .ndx-logo { width:44px; height:44px; border-radius:11px; }
  .ndx-eyebrow, #root .ndx.ndx .ndx-clock { display:none; }
  #root .ndx.ndx .ndx-title { font-size:${fs(18)}; }
  #root .ndx.ndx .ndx-sub { font-size:${fs(12.5)}; margin-top:2px; }
  .ndx-net span { display:none; }
  .ndx-net { padding:8px; }
  .ndx-more { display:grid; place-items:center; }
  .ndx-actions { display:none; position:absolute; top:calc(100% + 8px); inset-inline-end:0; z-index:30; flex-direction:column;
    align-items:stretch; min-width:210px; padding:8px; border-radius:14px; background:#fff; border:1px solid #d7e6f7;
    box-shadow:0 18px 40px rgba(15,23,42,.18); }
  .ndx-actions.open { display:flex; }
  .ndx-cmain { min-height:0; flex-direction:row; flex-wrap:wrap; align-items:center; padding:12px; }
  .ndx-cmain .ndx-ctxt { flex:1; min-width:0; padding-inline-end:34px; }
  .ndx-cfoot { width:100%; }
  .ndx-ico { width:44px; height:44px; }
}
`;

/* greeting based on time */
function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t.morning;
  if (h < 17) return t.afternoon;
  return t.evening;
}

/** Re-render the caller every `ms` — keeps the clock/notice fresh without
    re-rendering the whole dashboard. */
function useTick(ms) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function Clock() {
  useTick(15_000);
  return (
    <div className="ndx-clock">
      {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

/** Minutes left before the 8-hour session ends, when under 30; else 0. */
function sessionMinutesLeft(user) {
  if (user.remember) return 0; // "Keep me signed in" — no 8-hour cut-off
  const remaining = 8 * 60 * 60 * 1000 - (Date.now() - (user.loginAt || 0));
  const mins = Math.floor(remaining / 60000);
  return mins > 0 && mins < 30 ? mins : 0;
}

/* ── "Needs your attention today" ── */
function Attention({ t, isAr, live, user, onOpen }) {
  useTick(60_000);
  const minsLeft = sessionMinutesLeft(user);
  const amber = SEVERITY.warning;
  const red = SEVERITY.critical;

  const rows = [];
  if (!live.online) rows.push({ key: "off", sv: red, icon: "📡", title: t.offlineMsg });
  if (minsLeft) rows.push({ key: "sess", sv: amber, icon: "⏳", title: t.expires(minsLeft) });
  if (live.waiting > 0) rows.push({ key: "wait", sv: amber, icon: "📤", title: t.waitingMsg(live.waiting) });
  live.alerts.slice(0, 4).forEach((a) => {
    const sv = SEVERITY[a.severity] || amber;
    const when = new Date(a.created_at).toLocaleString(isAr ? "ar-AE-u-nu-latn" : "en-GB", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    rows.push({ key: `a${a.id}`, sv, icon: sv.icon, title: a.title, sub: `${a.branch ? `${a.branch} · ` : ""}${when}`, link: a.link });
  });

  if (!rows.length) {
    return live.alertsLoaded ? <div className="ndx-clear-ok">✅ {t.allClear}</div> : null;
  }
  return (
    <section className="ndx-att" aria-label={t.attention}>
      <div className="ndx-att-head">
        <h2 className="ndx-att-title">🔔 {t.attention}</h2>
        {live.alerts.length > 0 && (
          <button type="button" className="ndx-sbtn" onClick={() => onOpen("/alerts")}>{t.allAlerts(live.alerts.length)}</button>
        )}
      </div>
      <div className="ndx-att-list">
        {rows.map((r) => (
          <div key={r.key} className="ndx-att-item" style={{ background: r.sv.bg, borderColor: r.sv.border }}>
            <span aria-hidden="true">{r.icon}</span>
            <div className="ndx-att-txt">
              <div className="ndx-att-t" style={{ color: r.sv.color }} dir="auto">{r.title}</div>
              {r.sub && <div className="ndx-att-s">{r.sub}</div>}
            </div>
            {r.link && <button type="button" className="ndx-sbtn" onClick={() => onOpen(r.link)}>{t.open}</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function NamedDashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const [lang] = useLangState("en");
  const t = T[lang] || T.en;
  const isAr = lang === "ar";

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  const displayName = currentUser.displayName || currentUser.username || (isAr ? "مستخدم" : "User");
  const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
  const isSuperAdmin = !!currentUser.isSuperAdmin;
  const isAdmin = !!currentUser.isAdmin || isSuperAdmin;
  /* Full access = "*" or an admin — the same rule as utils/perms.js. An
     account with NO sections is not full access: it sees none, and is told
     to contact the administrator. */
  const isFullAccess = permissions.includes("*") || isAdmin;
  const employees = Array.isArray(currentUser.employees) ? currentUser.employees : [];
  const activeCompany = isSuperAdmin ? getActiveCompany() : null;

  /* «مسؤول المخزون» — نفس القاعدة تحت: الكرت بابه الوحيد. */
  const { officer: invOfficer } = useInventoryOfficer();
  const permKey = permissions.join(",");
  const visibleRoles = useMemo(
    () =>
      isFullAccess
        ? ALL_ROLES
        // anyOf = كرت مجمّع (مثل «المخزون») — يظهر إذا كان يملك أي وحدة بداخله
        : ALL_ROLES.filter(
            (r) =>
              permissions.includes(r.id) ||
              (invOfficer && r.id === "inventory") ||
              (Array.isArray(r.anyOf) && r.anyOf.some((x) => permissions.includes(x)))
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isFullAccess, permKey, invOfficer]
  );
  const hasCard = (id) => visibleRoles.some((r) => r.id === id);

  /* ── live: alerts, daily logs filed today, connection ── */
  const live = useDashboardLive({ wantDaily: hasCard("daily") });
  const prefs = useDashPrefs();

  const alertsByCard = useMemo(() => {
    const m = {};
    live.alerts.forEach((a) => {
      const id = alertCardId(a);
      if (!id) return;
      if (!m[id]) m[id] = { n: 0, critical: false };
      m[id].n += 1;
      if (a.severity === "critical") m[id].critical = true;
    });
    return m;
  }, [live.alerts]);

  /* ── operator ── */
  const sessionKey = `operator_${currentUser.username}`;
  const [operator, setOperator] = useState(() => {
    if (isAdmin) return displayName;
    return sessionStorage.getItem(sessionKey) || null;
  });
  const [showPicker, setShowPicker] = useState(() => {
    if (isAdmin) return false;
    return !sessionStorage.getItem(sessionKey);
  });

  const handleOperatorConfirm = async (name) => {
    sessionStorage.setItem(sessionKey, name);
    setOperator(name);
    setShowPicker(false);
    try {
      await fetch(`${API_BASE}/api/auth/operator-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator: name }),
      });
    } catch { /* the session works without the log line */ }
  };

  const handleLogout = async () => {
    if (!confirmLogoutWithOutbox()) return;
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator }),
      });
    } catch { /* signing out locally is what matters */ }
    clearAppSession();
    navigate("/", { replace: true });
  };

  /* ── search ── */
  const q = normText(query);
  const reportIndex = useMemo(
    () => buildReportIndex(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser.username, permKey]
  );
  const hays = useMemo(() => new Map(ALL_ROLES.map((r) => [r.id, roleHay(r)])), []);
  const filteredRoles = visibleRoles.filter(
    (role) => (q ? matches(hays.get(role.id), q) : group === "all" || role.group === group)
  );
  const reportHits = q.length >= 2 ? reportIndex.filter((e) => matches(e.hay, q)).slice(0, 8) : [];

  const openRole = (role) => {
    if (role.href) { openExternal(role.href); return; }
    pushRecent({ k: `card:${role.id}`, r: role.route });
    navigate(role.route);
  };
  const openReport = (e) => {
    pushRecent({ k: e.k, l: `${e.branch} · ${e.label}`, r: e.route });
    navigate(e.route);
  };
  const onSearchKey = (e) => {
    if (e.key === "Enter") {
      if (filteredRoles.length) openRole(filteredRoles[0]);
      else if (reportHits.length) openReport(reportHits[0]);
    }
    if (e.key === "Escape") setQuery("");
  };

  /* "/" jumps to the search box from anywhere on the page. */
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

  /* ── pinned + recent ── */
  const favRoles = prefs.favs.map((id) => visibleRoles.find((r) => r.id === id)).filter(Boolean);
  const recent = prefs.recent
    .map((x) => {
      if (x.k.startsWith("card:")) {
        const role = visibleRoles.find((r) => r.id === x.k.slice(5));
        return role ? { key: x.k, icon: role.icon, grad: role.grad, title: roleText(role, lang).label, sub: "", go: () => openRole(role) } : null;
      }
      const entry = reportIndex.find((e) => e.k === x.k); // still allowed?
      return entry
        ? { key: x.k, icon: entry.mode === "input" ? "📝" : "📊", grad: "linear-gradient(135deg,#60a5fa,#2563eb)", title: entry.label, sub: `${entry.branch} · ${entry.mode === "input" ? t.enter : t.view}`, go: () => openReport(entry) }
        : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  const locale = isAr ? "ar-AE-u-nu-latn" : "en-GB";
  const dateStr = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const arrow = isAr ? "←" : "→";

  /* the live line at the bottom of a card */
  const cardFoot = (role) => {
    const out = [];
    if (role.id === "daily" && live.daily) {
      const { done, expected } = live.daily;
      out.push(<span key="d" className={`ndx-badge ${done >= expected ? "green" : "blue"}`}>{t.filedToday(done, expected)}</span>);
    }
    const al = alertsByCard[role.id];
    if (al) out.push(<span key="a" className={`ndx-badge ${al.critical ? "red" : "amber"}`}>{t.nAlerts(al.n)}</span>);
    return out.length ? out : <span>{role.href ? t.openPortal : t.open}</span>;
  };

  const renderCard = (role) => {
    const txt = roleText(role, lang);
    const pinned = prefs.favs.includes(role.id);
    return (
      <div key={role.id} className="ndx-card" style={{ "--glow": role.glow }}>
        <button type="button" className="ndx-cmain" onClick={() => openRole(role)}>
          <span className="ndx-ico" style={{ background: role.grad }} aria-hidden="true">{role.icon}</span>
          <span className="ndx-ctxt">
            <span className="ndx-ctitle">{txt.label}</span>
            <span className="ndx-csub">{txt.desc}</span>
          </span>
          <span className="ndx-cfoot">
            {cardFoot(role)}
            <span className="ndx-arrow" aria-hidden="true">{role.href ? (isAr ? "↖" : "↗") : arrow}</span>
          </span>
        </button>
        <button
          type="button"
          className={`ndx-star${pinned ? " on" : ""}`}
          aria-pressed={pinned}
          aria-label={pinned ? t.unpin(txt.label) : t.pin(txt.label)}
          title={pinned ? t.unpin(txt.label) : t.pin(txt.label)}
          onClick={() => toggleFav(role.id)}
        >
          {pinned ? "★" : "☆"}
        </button>
      </div>
    );
  };

  const renderTool = (role) => {
    const txt = roleText(role, lang);
    return (
      <button key={role.id} type="button" className="ndx-tool" onClick={() => openRole(role)}>
        <span className="ndx-ico" style={{ background: role.grad }} aria-hidden="true">{role.icon}</span>
        <span className="ndx-tool-txt">
          <span className="ndx-tool-t">{txt.label}</span>
          <span className="ndx-tool-s">{txt.desc}</span>
        </span>
        <span className="ndx-arrow" aria-hidden="true">{role.href ? (isAr ? "↖" : "↗") : arrow}</span>
      </button>
    );
  };

  const groupsShown = GROUPS.filter((g) => visibleRoles.some((r) => r.group === g));
  const nothing = filteredRoles.length === 0 && reportHits.length === 0;

  return (
    <main className="ndx ndx" dir={isAr ? "rtl" : "ltr"} lang={lang}>
      <style>{ND_CSS}</style>
      {showPicker && (
        <OperatorPicker
          employees={employees}
          accountName={displayName}
          onConfirm={handleOperatorConfirm}
          t={t}
          lang={lang}
        />
      )}

      <header className="ndx-hero">
        <img src={logo} alt="Al Mawashi" className="ndx-logo" />
        <div className="ndx-hello">
          <p className="ndx-eyebrow">{t.eyebrow}</p>
          <h1 className="ndx-title">{greeting(t)}{isAr ? "، " : ", "}{operator || displayName}</h1>
          <p className="ndx-sub">
            {dateStr} · {isAdmin ? t.admin : ""}{t.account} {displayName} ·{" "}
            {isFullAccess ? t.fullAccess(visibleRoles.length) : t.available(visibleRoles.length)}
          </p>
        </div>

        <div className="ndx-hside">
          <div
            className={`ndx-net${!live.online ? " off" : live.waiting ? " wait" : ""}`}
            role="status"
            title={live.waiting ? t.waitingMsg(live.waiting) : live.online ? t.online : t.offline}
          >
            <span>
              {live.online ? t.online : t.offline}
              {live.waiting ? ` · ${t.waitingShort(live.waiting)}` : ""}
            </span>
          </div>
          <Clock />
          <button
            type="button"
            className="ndx-more"
            aria-label={t.menu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          <div className={`ndx-actions${menuOpen ? " open" : ""}`}>
            {operator && !isAdmin && (
              <button
                type="button"
                className="ndx-hbtn"
                onClick={() => { sessionStorage.removeItem(sessionKey); setOperator(null); setShowPicker(true); setMenuOpen(false); }}
              >
                {t.changeOperator}
              </button>
            )}
            {isSuperAdmin && (
              <button
                type="button"
                className="ndx-hbtn"
                title={activeCompany ? t.currently(activeCompany.name) : ""}
                onClick={() => { clearActiveCompany(); navigate("/select-company"); }}
              >
                🏢 {activeCompany ? activeCompany.name : t.switchCompany}
              </button>
            )}
            <button type="button" className="ndx-hbtn danger" onClick={handleLogout}>
              {t.signOut}
            </button>
          </div>
        </div>
      </header>

      <Attention t={t} isAr={isAr} live={live} user={currentUser} onOpen={(to) => navigate(to)} />

      <TodayFoodSafetyStrip lang={lang} />

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
            <button type="button" className="ndx-x" aria-label={t.clearSearch} onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </label>

        {!q && groupsShown.length > 1 && (
          <div className="ndx-chips" role="group" aria-label={t.sectionsAria}>
            {["all", ...groupsShown].map((g) => (
              <button
                key={g}
                type="button"
                className={`ndx-chip${group === g ? " on" : ""}`}
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
              >
                {g === "all" ? t.all : t[`g_${g}`]}
              </button>
            ))}
          </div>
        )}
      </section>

      {nothing ? (
        <div className="ndx-empty">
          <div className="ndx-empty-t">{t.noneFound}</div>
          <div>{visibleRoles.length === 0 ? t.contactAdmin : t.tryAnother}</div>
        </div>
      ) : q ? (
        /* searching: one flat list of cards, then matching reports */
        <>
          {filteredRoles.length > 0 && (
            <section aria-label={t.sectionsAria} className="ndx-grid" style={{ marginTop: 14 }}>
              {filteredRoles.map(renderCard)}
            </section>
          )}
          {reportHits.length > 0 && (
            <>
              <h2 className="ndx-gtitle">{t.reports}</h2>
              <div className="ndx-rlist">
                {reportHits.map((e) => (
                  <button key={e.k} type="button" className="ndx-rrow" onClick={() => openReport(e)}>
                    <span className="ndx-rrow-ic" aria-hidden="true">{e.mode === "input" ? "📝" : "📊"}</span>
                    <span className="ndx-tool-txt">
                      <span className="ndx-tool-t">{e.label}</span>
                      <span className="ndx-tool-s">{e.branch} · {e.mode === "input" ? t.enter : t.view}</span>
                    </span>
                    <span className="ndx-arrow" aria-hidden="true">{arrow}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {group === "all" && recent.length > 0 && (
            <>
              <h2 className="ndx-gtitle">{t.recent}</h2>
              <div className="ndx-tools">
                {recent.map((r) => (
                  <button key={r.key} type="button" className="ndx-tool" onClick={r.go}>
                    <span className="ndx-ico" style={{ background: r.grad }} aria-hidden="true">{r.icon}</span>
                    <span className="ndx-tool-txt">
                      <span className="ndx-tool-t">{r.title}</span>
                      {r.sub && <span className="ndx-tool-s">{r.sub}</span>}
                    </span>
                    <span className="ndx-arrow" aria-hidden="true">{arrow}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {group === "all" && favRoles.length > 0 && (
            <>
              <h2 className="ndx-gtitle">⭐ {t.favs}</h2>
              <section className="ndx-grid">{favRoles.map(renderCard)}</section>
            </>
          )}

          {groupsShown
            .filter((g) => group === "all" || group === g)
            .map((g) => {
              const roles = filteredRoles.filter((r) => r.group === g);
              if (!roles.length) return null;
              return (
                <React.Fragment key={g}>
                  <h2 className="ndx-gtitle">{t[`g_${g}`]}</h2>
                  {g === "tools" ? (
                    <div className="ndx-tools">{roles.map(renderTool)}</div>
                  ) : (
                    <section className="ndx-grid" aria-label={t[`g_${g}`]}>{roles.map(renderCard)}</section>
                  )}
                </React.Fragment>
              );
            })}
        </>
      )}

      <footer className="ndx-foot">{t.footer}</footer>
    </main>
  );
}
