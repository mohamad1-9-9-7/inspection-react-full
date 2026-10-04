// src/pages/DemoRequest.jsx
// Public landing page (/demo) — the first thing a prospect sees of InspectPro.
// No login. Hero with a live-looking product mock-up, who it is for, the
// feature bento, before/after + paper-vs-app table, how it works, the savings
// calculator (DemoValue.jsx), the demo-request form, FAQ. Styles: DemoRequest.css (scoped under .dp).
//
// Server contract: POST /api/demo-requests (public, rate-limited),
// GET /api/demo-config (WhatsApp number, offer, referral, story — all set by
// the owner in Platform Center → Demo Requests). `?src=linkedin` (or any value)
// on the link is saved with the request, so each channel can be counted.

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../config/api";
import "./DemoRequest.css";
import { BrandLockup } from "./readiness/brand";
import { PaperVsTable, PricingPlans, SavingsCalculator } from "./DemoValue";
import { usePublicTitle } from "../config/pageTitles";
import { useSiteStats } from "../utils/siteStats";
import { SECTORS, SECTOR_ORDER, SECTOR_UI, withSector } from "./demoSectors";
import DemoSectorFlex from "./DemoSectorFlex";
import { BeforeAfter, PROMO_CSS, ReferralNote, StoryCard, useDemoConfig } from "./readiness/promoBlocks";

// The free-trial window loads only when opened (it pulls in the demo-record generator).
const TrialSignup = lazy(() => import("./trial/TrialSignup"));

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100070850094338";

export const DEMO_ACTIVITIES = [
  { v: "meat", en: "Meat / butchery / slaughterhouse", ar: "لحوم / ملاحم / مسالخ" },
  { v: "sweets", en: "Sweets / bakery / confectionery", ar: "حلويات / مخابز" },
  { v: "restaurant", en: "Restaurant / café chain", ar: "مطاعم / مقاهٍ" },
  { v: "kitchen", en: "Central kitchen / catering", ar: "مطبخ مركزي / تموين" },
  { v: "factory", en: "Food factory / manufacturing", ar: "مصنع أغذية" },
  { v: "retail", en: "Supermarket / retail", ar: "سوبرماركت / تجزئة" },
  { v: "distribution", en: "Distribution / import / cold store", ar: "توزيع / استيراد / تخزين مبرّد" },
  { v: "other", en: "Other", ar: "أخرى" },
];

export const DEMO_BRANCHES = ["1", "2-5", "6-20", "20+"];

export const DEMO_EMIRATES = [
  { v: "dubai", en: "Dubai", ar: "دبي" },
  { v: "abudhabi", en: "Abu Dhabi", ar: "أبوظبي" },
  { v: "sharjah", en: "Sharjah", ar: "الشارقة" },
  { v: "ajman", en: "Ajman", ar: "عجمان" },
  { v: "rak", en: "Ras Al Khaimah", ar: "رأس الخيمة" },
  { v: "fujairah", en: "Fujairah", ar: "الفجيرة" },
  { v: "uaq", en: "Umm Al Quwain", ar: "أم القيوين" },
  { v: "gcc", en: "Outside UAE (GCC)", ar: "خارج الإمارات (الخليج)" },
  { v: "other", en: "Other country", ar: "دولة أخرى" },
];

const TXT = {
  en: {
    nav: { features: "Features", pricing: "Pricing", savings: "Savings", how: "How it works", about: "About us", check: "Readiness check", signIn: "Sign in", book: "Book a demo" },
    pill: "Food-safety & quality management platform",
    pillTag: "New",
    offerTag: "Offer",
    offerPill: (d) => `No setup fee until ${d}`,
    h1a: "Every branch. Every record.",
    h1b: "Inspection‑ready, always.",
    lead: "InspectPro replaces paper logs with one live platform for HACCP, ISO 22000, internal audits, traceability and suppliers — so any record is in front of the inspector in minutes, not days.",
    ctaDemo: "Book a free demo",
    ctaCheck: "Check your readiness — 2 min",
    ctaPrices: "See prices",
    ctaTrial: "Try it free — 3 days",
    mock: {
      title: "Dashboard", today: "Today",
      k1: "Branches reporting", k2: "Open NCRs", k3: "Readiness",
      chart: "Cooler temperatures", range: "Limit 0–5 °C",
      r1: "Receiving check — Branch 01", r2: "Cleaning checklist — Branch 02", r3: "Pest control — Central kitchen",
      ok: "Done", due: "Due 4 pm",
      f1: "Cooler 03 · 2.4 °C", f1s: "Within limit",
      f2: "NCR-0012", f2s: "Closed with evidence",
    },
    featEyebrow: "Platform",
    featTitle: "Everything an inspector asks for, in one place",
    featSub: "Daily logs, audits and follow-ups your team fills on the phone — and head office sees the same day.",
    feats: {
      haccp: ["HACCP & temperature logs", "Coolers, freezers and cooking checks filled on a phone, each unit with its own limits — readings outside them stand out."],
      trace: ["Traceability in one search", "Item codes link shipment, receiving and branch records."],
      trace3: ["Supplier", "Receiving", "Branch"],
      ncr: ["NCR & CAPA", "Every non-conformance gets its own reference and stays open until it is closed."],
      audit: ["Internal audits with evidence", "Audit on the phone; each finding sends the branch a link to upload its proof."],
      supp: ["Supplier approval", "Suppliers self-assess through a link; their score shows on every receiving record."],
    },
    baEyebrow: "Before & after",
    baTitle: "From paper folders to one live screen",
    priceEyebrow: "Pricing",
    priceTitle: "Pick the budget that fits you",
    priceSub: "Tell us how many branches you have, then choose the monthly budget that suits you. Every plan starts with a free 30-day pilot on one branch.",
    calcEyebrow: "Savings calculator",
    calcTitle: "What does paper cost you?",
    calcSub: "Move the slider to your number of branches.",
    howEyebrow: "How it works",
    howTitle: "Live in three steps",
    steps: [
      ["Book a short demo", "We show InspectPro on your own kind of branch and records — no commitment."],
      ["We set it up with you", "Your branches, forms, users and permissions — ready for your team."],
      ["Your team records, you see it live", "Staff fill checks on their phones; QA and management follow every branch from one dashboard."],
    ],
    formEyebrow: "Free demo",
    formTitle: "See InspectPro on your own branches",
    formSub: "Leave your details and we will contact you within one working day to book a short demo.",
    gets: [
      "A walkthrough built around your business type and number of branches",
      "How your current paper forms become phone checklists",
      "A clear quote for your company — no obligation",
    ],
    cardTitle: "Request a free demo",
    cardHint: "Takes less than a minute.",
    company: "Company name", activity: "Business type", branches: "Number of branches / sites", emirate: "Emirate / country",
    contact: "Your name", phone: "Mobile / WhatsApp", email: "E-mail",
    message: "What would you like to solve? (optional)", messagePh: "e.g. we still do HACCP logs on paper across 6 branches",
    referredBy: "Who recommended us? (optional)", referredPh: "Company or person",
    pick: "Select…",
    submit: "Send request", sending: "Sending…",
    required: "Please fill in the company name, your name and a phone number.",
    badEmail: "That e-mail address does not look right.",
    badPhone: "Please enter a valid phone number.",
    failed: "We could not send your request. Please try again, or contact us directly.",
    tooMany: "Too many requests from this device. Please try again later.",
    privacy: "We use these details only to contact you about the demo.",
    doneTitle: "Thank you — request received",
    doneSub: "We will contact you within one working day to arrange your demo.",
    another: "Send another request",
    doneCheck: "Meanwhile, check your readiness",
    faqEyebrow: "Questions",
    faqTitle: "Frequently asked",
    faq: [
      ["Does it work in Arabic?", "Yes. Every screen works in Arabic and English, and each user works in their own language."],
      ["Do we need our own server or IT team?", "No. InspectPro runs in the cloud and opens in any browser — on a phone at the branch or a computer at head office."],
      ["Can our current forms be kept?", "Yes. Your paper forms are turned into digital checklists that follow the same layout, and reports print in that layout too."],
      ["How is it priced?", "Per branch, and you choose the plan that fits your budget: Essential AED 350 a month (300 billed annually), Professional 490 (420), Enterprise 690 (590). Professional and Enterprise get −10 % from 5 branches and −15 % from 10. Setup is AED 1,000 once, free on annual billing. More than 20 branches get a custom quote."],
    ],
    footRights: "All rights reserved.",
    footSignIn: "Customer sign-in",
    footCheck: "Readiness check",
    waFab: "Chat on WhatsApp",
    waMsg: "Hello, I'd like to know more about InspectPro and book a demo.",
    lang: "العربية",
  },
  ar: {
    nav: { features: "المزايا", pricing: "الأسعار", savings: "التوفير", how: "آلية العمل", about: "من نحن", check: "فحص الجاهزية", signIn: "تسجيل الدخول", book: "احجز عرضًا" },
    pill: "منصة إدارة سلامة الغذاء والجودة",
    pillTag: "جديد",
    offerTag: "عرض",
    offerPill: (d) => `إعفاء من رسوم التأسيس حتى ${d}`,
    h1a: "كل فرع، وكل سجل،",
    h1b: "جاهزٌ للتفتيش دائمًا.",
    lead: "يستبدل InspectPro السجلات الورقية بمنصة واحدة مباشرة لـ HACCP و ISO 22000 والتدقيق الداخلي والتتبّع والموردين — ليكون أي سجل بين يدي المفتش خلال دقائق، لا أيام.",
    ctaDemo: "احجز عرضًا تجريبيًا مجانيًا",
    ctaCheck: "قِس جاهزيتك — دقيقتان",
    ctaPrices: "اطّلع على الأسعار",
    ctaTrial: "جرّبه مجانًا — 3 أيام",
    mock: {
      title: "لوحة التحكم", today: "اليوم",
      k1: "فروع سجّلت", k2: "حالات عدم مطابقة مفتوحة", k3: "الجاهزية",
      chart: "درجات حرارة الثلاجات", range: "الحد 0–5 °م",
      r1: "فحص الاستلام — فرع 01", r2: "قائمة النظافة — فرع 02", r3: "مكافحة الآفات — المطبخ المركزي",
      ok: "مكتمل", due: "الساعة 4 م",
      f1: "ثلاجة 03 · 2.4 °م", f1s: "ضمن الحد المسموح",
      f2: "NCR-0012", f2s: "أُغلقت بدليل موثّق",
    },
    featEyebrow: "المنصة",
    featTitle: "كل ما يطلبه المفتش، في مكان واحد",
    featSub: "سجلات يومية وتدقيق ومتابعة يعبّئها فريقك من الجوال — وتطّلع عليها الإدارة في اليوم نفسه.",
    feats: {
      haccp: ["سجلات HACCP ودرجات الحرارة", "فحوصات الثلاجات والمجمِّدات والطهي تُعبّأ من الجوال، ولكل وحدة حدودها — وتبرز القراءات الخارجة عنها."],
      trace: ["التتبّع ببحث واحد", "يربط رمز الصنف سجلات الشحن والاستلام والفروع."],
      trace3: ["المورّد", "الاستلام", "الفرع"],
      ncr: ["عدم المطابقة والإجراءات التصحيحية", "لكل حالة رقم مرجعي خاص، وتبقى مفتوحة حتى تُغلق."],
      audit: ["تدقيق داخلي بالأدلة", "التدقيق من الجوال، ولكل ملاحظة رابط يرفع الفرع من خلاله الدليل."],
      supp: ["اعتماد الموردين", "يقيّم المورّد نفسه عبر رابط، وتظهر نتيجته في كل سجل استلام."],
    },
    baEyebrow: "قبل وبعد",
    baTitle: "من الملفات الورقية إلى شاشة واحدة مباشرة",
    priceEyebrow: "الأسعار",
    priceTitle: "اختر البدجت المناسب لك",
    priceSub: "أخبرنا كم فرعًا لديك، ثم اختر البدجت الشهري الذي يناسبك. كل باقة تبدأ بتجربة مجانية 30 يومًا على فرع واحد.",
    calcEyebrow: "حاسبة التوفير",
    calcTitle: "كم تكلّفك السجلات الورقية؟",
    calcSub: "حرّك المؤشر إلى عدد فروعك.",
    howEyebrow: "آلية العمل",
    howTitle: "ثلاث خطوات للانطلاق",
    steps: [
      ["احجز عرضًا قصيرًا", "نعرض لك InspectPro على نوع فروعك وسجلاتك — دون أي التزام."],
      ["نجهّز النظام معك", "فروعك ونماذجك ومستخدموك وصلاحياتهم — جاهزة لفريقك."],
      ["يسجّل فريقك وتتابع مباشرةً", "يعبّئ الموظفون الفحوصات من جوالاتهم، ويتابع قسم الجودة والإدارة كل فرع من لوحة واحدة."],
    ],
    formEyebrow: "عرض مجاني",
    formTitle: "شاهد InspectPro على فروعك أنت",
    formSub: "اترك بياناتك، وسنتواصل معك خلال يوم عمل واحد لتحديد موعد عرض قصير.",
    gets: [
      "جولة مصمَّمة وفق نوع نشاطك وعدد فروعك",
      "كيف تتحول نماذجك الورقية الحالية إلى قوائم فحص على الجوال",
      "عرض سعر واضح لشركتك — دون أي التزام",
    ],
    cardTitle: "اطلب عرضًا تجريبيًا مجانيًا",
    cardHint: "يستغرق أقل من دقيقة.",
    company: "اسم الشركة", activity: "نوع النشاط", branches: "عدد الفروع / المواقع", emirate: "الإمارة / الدولة",
    contact: "الاسم", phone: "رقم الجوال / واتساب", email: "البريد الإلكتروني",
    message: "ما المشكلة التي تودّ حلّها؟ (اختياري)", messagePh: "مثال: ما زلنا نعبّئ سجلات HACCP ورقيًا في 6 فروع",
    referredBy: "من رشّحنا لك؟ (اختياري)", referredPh: "اسم الشركة أو الشخص",
    pick: "اختر…",
    submit: "إرسال الطلب", sending: "جارٍ الإرسال…",
    required: "يُرجى إدخال اسم الشركة واسمك ورقم الجوال.",
    badEmail: "البريد الإلكتروني غير صحيح.",
    badPhone: "يُرجى إدخال رقم جوال صحيح.",
    failed: "تعذّر إرسال الطلب. يُرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.",
    tooMany: "تم إرسال طلبات كثيرة من هذا الجهاز. يُرجى المحاولة لاحقًا.",
    privacy: "نستخدم هذه البيانات فقط للتواصل معك بشأن العرض.",
    doneTitle: "شكرًا لك — تم استلام طلبك",
    doneSub: "سنتواصل معك خلال يوم عمل واحد لتحديد موعد العرض.",
    another: "إرسال طلب آخر",
    doneCheck: "وإلى ذلك الحين، قِس جاهزيتك",
    faqEyebrow: "أسئلة",
    faqTitle: "الأسئلة الشائعة",
    faq: [
      ["هل يعمل النظام باللغة العربية؟", "نعم. جميع الشاشات تعمل بالعربية والإنجليزية، ويعمل كل مستخدم بلغته."],
      ["هل نحتاج إلى خادم خاص أو فريق تقنية معلومات؟", "لا. يعمل InspectPro سحابيًا ويُفتح من أي متصفح — من الجوال في الفرع أو من الحاسوب في الإدارة."],
      ["هل يمكن الإبقاء على نماذجنا الحالية؟", "نعم. تتحول نماذجكم الورقية إلى قوائم فحص رقمية بالتصميم نفسه، وتُطبع التقارير بذلك التصميم أيضًا."],
      ["كيف يُحتسب السعر؟", "لكل فرع، وأنت تختار الباقة حسب البدجت: الأساسية 350 درهمًا شهريًا (300 بالدفع السنوي)، والاحترافية 490 (420)، والمتكاملة 690 (590). الاحترافية والمتكاملة عليهما خصم 10% من 5 فروع و15% من 10 فروع. رسوم التجهيز 1,000 درهم مرة واحدة، ومجانية بالدفع السنوي. أكثر من 20 فرعًا: عرض سعر خاص."],
    ],
    footRights: "جميع الحقوق محفوظة.",
    footSignIn: "دخول العملاء",
    footCheck: "فحص الجاهزية",
    waFab: "راسلنا عبر واتساب",
    waMsg: "مرحبًا، أودّ معرفة المزيد عن InspectPro وحجز عرض تجريبي.",
    lang: "English",
  },
};

// Conversion pass (Oct 2026): interest chips, shorter form,
// best-time picker, "what happens next", demo host, mobile sticky bar.
// Interest keys match the login page's product-tour slide keys (login links ?interest=<key>).
// The tour itself lives only on the login page — it is not repeated here.
const PLUS = {
  en: {
    stdLbl: "Built around",
    standards: ["HACCP", "ISO 22000", "GMP / GHP", "ISO 45001 (HSE)", "Arabic & English"],
    interestQ: "What interests you?",
    interests: [["ccp", "🌡️ HACCP & CCP logs"], ["trace", "🔗 Traceability"], ["audit", "📋 Inspections & audits"], ["capa", "🛠️ NCR & CAPA"], ["supplier", "🚚 Supplier control"], ["risk", "🎓 Training & HSE"]],
    interestTag: "Interested in",
    more: "More details (optional)", less: "Fewer details",
    when: "Best time to talk (optional)",
    days: [["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "This week"]],
    times: [["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"]],
    whenTag: "Best time",
    nextTitle: "What happens next",
    next3: [
      ["1", "We reply within one working day", "By WhatsApp or a call — your choice."],
      ["2", "30-minute live demo", "On your own business type, branches and forms."],
      ["3", "Clear quote, no obligation", "Start with one branch if you like."],
    ],
    hostKicker: "Your demo host",
    hostName: "Eng. Mohammed Abdullah",
    hostRole: "The engineer behind INSPECT PRO · Arabic & English",
    hostQuote: "I will show you your own records inside the system — not a generic slideshow.",
    stickyBook: "Book a free demo",
    stickyNote: "30 min · no obligation",
    aboutEyebrow: "About us",
    aboutTitle: "Built by food-safety people, for food-safety teams",
    aboutP: [
      "INSPECT PRO is a UAE-based company building software for food safety and quality. InspectPro started inside the daily work of a multi-branch meat business — real coolers, real receiving checks, real municipality inspections.",
      "Every screen was shaped by the people who fill the logs and the QA teams who answer to the inspector. That is why it is quick on a phone at the branch, and complete enough for head office and the auditor.",
    ],
    aboutChips: ["Based in the UAE", "Arabic & English", "Cloud — no server needed"],
    values: [
      ["clipboard", "Inspection-first", "Every record is built to be shown to an inspector or auditor in minutes."],
      ["route", "From the floor up", "Designed with branch staff and QA teams, not around a template."],
      ["file", "Your forms, your layout", "Paper forms become digital checklists that keep the same look."],
      ["check", "Your data stays yours", "Export your records to Excel or PDF any time."],
    ],
    tmEyebrow: "Customer stories",
    tmTitle: "What our customers say",
  },
  ar: {
    stdLbl: "مبني وفق",
    standards: ["HACCP", "ISO 22000", "GMP / GHP", "ISO 45001 (السلامة)", "عربي وإنجليزي"],
    interestQ: "ما الذي يهمّك؟",
    interests: [["ccp", "🌡️ HACCP ونقاط التحكم"], ["trace", "🔗 التتبع"], ["audit", "📋 التفتيش والتدقيق"], ["capa", "🛠️ عدم المطابقة والإجراءات"], ["supplier", "🚚 رقابة المورّدين"], ["risk", "🎓 التدريب والسلامة"]],
    interestTag: "مهتم بـ",
    more: "تفاصيل إضافية (اختياري)", less: "تفاصيل أقل",
    when: "أفضل وقت للتواصل (اختياري)",
    days: [["today", "اليوم"], ["tomorrow", "غداً"], ["week", "هذا الأسبوع"]],
    times: [["morning", "صباحاً"], ["afternoon", "بعد الظهر"], ["evening", "مساءً"]],
    whenTag: "أفضل وقت",
    nextTitle: "ماذا يحدث بعد ذلك",
    next3: [
      ["1", "نردّ خلال يوم عمل واحد", "عبر واتساب أو مكالمة — كما تفضّل."],
      ["2", "عرض مباشر لمدة 30 دقيقة", "على نوع نشاطك وفروعك ونماذجك أنت."],
      ["3", "عرض سعر واضح دون التزام", "ويمكنك البدء بفرع واحد."],
    ],
    hostKicker: "مقدّم العرض",
    hostName: "م. محمد عبدالله",
    hostRole: "المهندس الذي بنى INSPECT PRO · عربي وإنجليزي",
    hostQuote: "سأعرض لك سجلاتك أنت داخل النظام — لا عرضاً تقديمياً عاماً.",
    stickyBook: "احجز عرضاً مجانياً",
    stickyNote: "30 دقيقة · دون التزام",
    aboutEyebrow: "من نحن",
    aboutTitle: "صنعه أهل سلامة الغذاء، لفرق سلامة الغذاء",
    aboutP: [
      "INSPECT PRO شركة مقرّها الإمارات تبني أنظمة لسلامة الغذاء والجودة. وُلد InspectPro من قلب العمل اليومي في شركة لحوم متعددة الفروع — ثلاجات حقيقية، وفحوصات استلام حقيقية، وزيارات تفتيش بلدية حقيقية.",
      "كل شاشة صمّمها من يعبّئ السجلات ومن يقف أمام المفتش من فرق الجودة. لذلك هو سريع على الجوال في الفرع، ومتكامل بما يكفي للإدارة والمدقق.",
    ],
    aboutChips: ["مقرّنا الإمارات", "عربي وإنجليزي", "سحابي — دون خادم"],
    values: [
      ["clipboard", "التفتيش أولًا", "كل سجل مبني ليُعرض على المفتش أو المدقق خلال دقائق."],
      ["route", "من أرض الفرع", "صُمّم مع موظفي الفروع وفرق الجودة، لا حول قالب جاهز."],
      ["file", "نماذجك بتصميمها", "تتحول نماذجك الورقية إلى قوائم فحص رقمية بالشكل نفسه."],
      ["check", "بياناتك ملكك", "صدّر سجلاتك إلى Excel أو PDF في أي وقت."],
    ],
    tmEyebrow: "قصص عملائنا",
    tmTitle: "ماذا يقول عملاؤنا",
  },
};

const EMPTY = {
  companyName: "", activity: "", branches: "", contactName: "", phone: "", email: "",
  emirate: "", message: "", referredBy: "",
  website: "", // honeypot — hidden from people, bots fill it
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const phoneDigits = (s) => String(s || "").replace(/\D/g, "");
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

/* Load the page fonts once (the app shell only ships calligraphy fonts). */
export function usePublicFonts() {
  useEffect(() => {
    if (document.getElementById("dp-fonts")) return;
    const l = document.createElement("link");
    l.id = "dp-fonts"; l.rel = "stylesheet"; l.href = FONTS_HREF;
    document.head.appendChild(l);
  }, []);
}

const DOCK_QUERY = "(min-width: 1440px)";

function useMedia(query) {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [on, setOn] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const fn = () => setOn(mq.matches);
    fn();
    mq.addEventListener?.("change", fn);
    window.addEventListener("resize", fn); // some engines skip the media "change" event
    return () => { mq.removeEventListener?.("change", fn); window.removeEventListener("resize", fn); };
  }, [query]);
  return on;
}

/* Fade sections in as they scroll into view; everything shows at once when
   IntersectionObserver or motion is unavailable. */
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce) { root.classList.add("dp-noio"); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    root.querySelectorAll(".dp-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

const fmtOfferDate = (iso, lang) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "long" });
};

export default function DemoRequest() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [lang, setLang] = useState(() => {
    const q = params.get("lang");
    // English by default; Arabic only when the link asks for it (?lang=ar) or the visitor taps the switch.
    return q === "ar" ? "ar" : "en";
  });
  // "What's your business?" — the hero, mock-up and pain cards follow the pick; ?sector= opens one directly.
  const [sector, setSector] = useState(() => (SECTORS[params.get("sector")] ? params.get("sector") : ""));
  const t = withSector(TXT[lang], sector, lang);
  const sec = sector ? SECTORS[sector][lang] : null;
  const SU = SECTOR_UI[lang];
  const isAr = lang === "ar";
  usePublicTitle("/demo", lang);
  // Visitor stats (Platform Center → Demo Requests): how far down people get, and what they click.
  const track = useSiteStats("demo", lang, ["features", "how", "stories", "pricing", "savings", "about", "demo-form", "faq"]);
  const formStarted = useRef(false);
  const markFormStart = () => { if (!formStarted.current) { formStarted.current = true; track("form_start"); } };
  const arrow = isAr ? "←" : "→";

  const [form, setForm] = useState(() => ({ ...EMPTY, activity: sector }));
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [when, setWhen] = useState({ day: "", time: "" });
  const [interests, setInterests] = useState(() => {
    const k = params.get("interest");
    return PLUS.en.interests.some(([v]) => v === k) ? [k] : [];
  });
  const [sticky, setSticky] = useState(false);
  // ?trial=1 (a Facebook post, an ad) opens the free-trial window straight away.
  const [trialOpen, setTrialOpen] = useState(() => params.get("trial") === "1");
  const openTrial = (where) => { track("cta", `trial-${where}`); setTrialOpen(true); };
  // Wide screens: the form lives in a fixed panel on the right, always in view.
  const docked = useMedia(DOCK_QUERY);
  const dockRef = useRef(null);
  const P = PLUS[lang];
  const toggleInterest = (k) => setInterests((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const mockRef = useRef(null);
  usePublicFonts();
  useReveal(rootRef);

  const source = useMemo(() => (params.get("src") || params.get("utm_source") || "").slice(0, 60), [params]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // WhatsApp number, launch offer, referral and customer story are all set by
  // the owner in Platform Center → Demo Requests; anything unset is not shown.
  const cfg = useDemoConfig();
  const waNumber = cfg.whatsapp;
  const quizHref = `/readiness${source ? `?src=${encodeURIComponent(source)}` : ""}`;
  // The source rides along in the message, so the chat itself says which link it came from.
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t.waMsg + (source ? ` [${source}]` : ""))}`
    : "";
  const countWaTap = () => {
    track("wa");
    try {
      fetch(`${API_BASE}/api/demo-requests/wa-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* counting never blocks the chat */ }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Docked: the panel is already in view, so point at it (flash + first field).
  // Otherwise scroll down to the form section.
  const focusForm = () => {
    const dock = dockRef.current;
    if (!dock) {
      document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    dock.scrollTo({ top: 0, behavior: "smooth" });
    dock.classList.remove("flash");
    void dock.offsetWidth; // restart the animation
    dock.classList.add("flash");
    document.getElementById("f-co")?.focus({ preventScroll: true });
  };

  // Arriving from a login-page product tab: go straight to the form.
  useEffect(() => {
    if (!params.get("interest")) return undefined;
    const id = setTimeout(focusForm, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Mobile sticky "book" bar: after the hero, hidden while the form is on screen.
  useEffect(() => {
    const formEl = document.getElementById("demo-form");
    let formVisible = false;
    const update = () => setSticky(window.scrollY > 520 && !formVisible);
    let io;
    if (formEl && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([en]) => { formVisible = en.isIntersecting; update(); }, { threshold: 0.05 });
      io.observe(formEl);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", update); if (io) io.disconnect(); };
  }, []);

  // Spotlight + mock-up tilt follow the pointer; CSS variables only, no re-render.
  const onHeroMove = (e) => {
    const h = heroRef.current;
    if (!h) return;
    const r = h.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    h.style.setProperty("--mx", `${x * 100}%`);
    h.style.setProperty("--my", `${y * 100}%`);
    if (mockRef.current) {
      mockRef.current.style.setProperty("--tx", (x - 0.5).toFixed(3));
      mockRef.current.style.setProperty("--ty", (y - 0.5).toFixed(3));
    }
  };
  const onCardMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  };

  const goForm = (e, where = "cta") => {
    e?.preventDefault?.();
    track("cta", where);
    focusForm();
  };

  // The calculator hands over its branch count, so the form arrives pre-filled.
  const bookFromCalc = (bucket, where = "calc", note = "") => {
    setForm((f) => ({ ...f, branches: bucket, message: note && !f.message ? note : f.message }));
    setMoreOpen(true);
    goForm(null, where);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()]));
    if (!f.companyName || !f.contactName || !f.phone) return setError(t.required);
    if (phoneDigits(f.phone).length < 7) return setError(t.badPhone);
    if (f.email && !isEmail(f.email)) return setError(t.badEmail);

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          message: withExtras(f.message, interests, when, P),
          source,
          referrer: (typeof document !== "undefined" && document.referrer) || "",
          lang,
        }),
      });
      if (res.status === 429) throw new Error(t.tooMany);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(t.failed);
      setDone(true);
      track("lead");
      setForm(EMPTY);
      setWhen({ day: "", time: "" });
      setInterests([]);
      setMoreOpen(false);
    } catch (err) {
      setError(err?.message || t.failed);
    } finally {
      setSending(false);
    }
  };

  const pickSector = (v) => {
    const next = v === sector ? "" : v;
    setSector(next);
    if (next) track("cta", `sector-${next}`);
    // The form follows the pick unless the visitor already chose a type themselves.
    setForm((f) => (!f.activity || f.activity === sector ? { ...f, activity: next } : f));
    try {
      const u = new URL(window.location.href);
      if (next) u.searchParams.set("sector", next); else u.searchParams.delete("sector");
      window.history.replaceState(window.history.state, "", u);
    } catch { /* the address bar is a convenience only */ }
  };

  // accordion "see it for my business": pick the sector (unless already picked) and jump to its pains
  const exploreSector = (v) => {
    if (v !== sector) pickSector(v);
    setTimeout(() => document.getElementById("sector")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const m = t.mock;
  const F = t.feats;

  const formCard = (
      <div className="dp-formcard">{/* no dp-reveal: it can move between panel and section after load */}
        {done ? (
          <div className="dp-done">
            <div className="dp-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</div>
            <div className="dp-done-ic"><Icon name="check" size={40} color="#fff" /></div>
            <h3 className="fs-h2">{t.doneTitle}</h3>
            <p className="hint fs-md" style={{ margin: "10px 0 0" }}>{t.doneSub}</p>
            <NextSteps P={P} />
            <div className="dp-done-act">
              <button type="button" className="dp-btn dark fs-md" onClick={() => navigate(quizHref)}>📊 {t.doneCheck}</button>
              <button type="button" className="dp-btn fs-md" style={{ border: "1px solid #e2e8f0", background: "#fff" }} onClick={() => setDone(false)}>{t.another}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} onFocusCapture={markFormStart} noValidate>
            <h3 className="fs-h2">{t.cardTitle}</h3>
            <p className="hint fs-md">{t.cardHint}</p>
            <div className="dp-fields">
              <Field id="f-co" label={t.company} required>
                <input id="f-co" className="dp-input" value={form.companyName} onChange={set("companyName")} autoComplete="organization" maxLength={150} />
              </Field>
              <Field id="f-act" label={t.activity}>
                <select id="f-act" className="dp-input" value={form.activity} onChange={set("activity")}>
                  <option value="">{t.pick}</option>
                  {DEMO_ACTIVITIES.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                </select>
              </Field>
              <Field id="f-nm" label={t.contact} required>
                <input id="f-nm" className="dp-input" value={form.contactName} onChange={set("contactName")} autoComplete="name" maxLength={120} />
              </Field>
              <Field id="f-ph" label={t.phone} required>
                <input id="f-ph" className="dp-input" style={{ direction: "ltr" }} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+971 5x xxx xxxx" maxLength={40} />
              </Field>
            </div>

            <fieldset className="dp-interest">
              <legend className="fs-sm">{P.interestQ}</legend>
              <div className="dp-interest-grid">
                {P.interests.map(([k, l]) => (
                  <label key={k} className={`dp-check fs-sm${interests.includes(k) ? " on" : ""}`}>
                    <input type="checkbox" checked={interests.includes(k)} onChange={() => toggleInterest(k)} />
                    <span className="dp-check-box" aria-hidden="true" />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="dp-when">
              <span className="dp-when-l fs-sm">{P.when}</span>
              <div className="dp-when-row">
                {P.days.map(([v, l]) => (
                  <button key={v} type="button" className={`dp-pick fs-sm${when.day === v ? " on" : ""}`} aria-pressed={when.day === v} onClick={() => setWhen((w) => ({ ...w, day: w.day === v ? "" : v }))}>{l}</button>
                ))}
                <span className="dp-when-sep" aria-hidden="true" />
                {P.times.map(([v, l]) => (
                  <button key={v} type="button" className={`dp-pick fs-sm${when.time === v ? " on" : ""}`} aria-pressed={when.time === v} onClick={() => setWhen((w) => ({ ...w, time: w.time === v ? "" : v }))}>{l}</button>
                ))}
              </div>
            </div>

            <button type="button" className="dp-more fs-sm" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
              <span className="dp-more-ic" aria-hidden="true">{moreOpen ? "−" : "+"}</span>
              {moreOpen ? P.less : P.more}
            </button>
            {moreOpen && (
              <div className="dp-fields dp-fields-more">
                <Field id="f-br" label={t.branches}>
                  <select id="f-br" className="dp-input" value={form.branches} onChange={set("branches")}>
                    <option value="">{t.pick}</option>
                    {DEMO_BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field id="f-em" label={t.emirate}>
                  <select id="f-em" className="dp-input" value={form.emirate} onChange={set("emirate")}>
                    <option value="">{t.pick}</option>
                    {DEMO_EMIRATES.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                  </select>
                </Field>
                <Field id="f-ml" label={t.email} full>
                  <input id="f-ml" className="dp-input" style={{ direction: "ltr" }} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} />
                </Field>
                <Field id="f-msg" label={t.message} full>
                  <textarea id="f-msg" className="dp-input" value={form.message} onChange={set("message")} placeholder={t.messagePh} maxLength={2000} />
                </Field>
                <Field id="f-ref" label={t.referredBy} full>
                  <input id="f-ref" className="dp-input" value={form.referredBy} onChange={set("referredBy")} placeholder={t.referredPh} maxLength={150} />
                </Field>
              </div>
            )}

            {/* Honeypot: off-screen and skipped by keyboard / screen readers. */}
            <div aria-hidden="true" className="dp-honey">
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
            </div>

            {error && <div role="alert" className="dp-err fs-sm" style={{ marginTop: 14 }}>{error}</div>}

            <button type="submit" disabled={sending} className="dp-btn primary dp-submit fs-md">
              {sending ? t.sending : <>{t.submit} <span className="arr" aria-hidden="true">{arrow}</span></>}
            </button>
            <p className="dp-privacy fs-xs">🔒 {t.privacy}</p>
            <NextSteps P={P} />
          </form>
        )}
      </div>
  );

  return (
    <main ref={rootRef} dir={isAr ? "rtl" : "ltr"} lang={lang} className={`dp${sticky ? " dp-has-sticky" : ""}${docked ? " dp-docked" : ""}`}>
      <style>{PROMO_CSS}</style>

      {/* ── nav ── */}
      <header className={`dp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="dp-wrap dp-nav-in">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ textDecoration: "none" }} aria-label="InspectPro">
            <BrandLockup size={36} tone="dark" />
          </a>
          <nav className="dp-nav-links fs-sm" aria-label="Page">
            <a href="#features">{t.nav.features}</a>
            <a href="#pricing">{t.nav.pricing}</a>
            <a href="#savings">{t.nav.savings}</a>
            <a href="#how">{t.nav.how}</a>
            <a href="#about">{t.nav.about}</a>
            <a href={quizHref} onClick={(e) => { e.preventDefault(); navigate(quizHref); }}>{t.nav.check}</a>
          </nav>
          <div className="dp-nav-act">
            <button type="button" className="dp-lang fs-sm" onClick={() => { track("lang", isAr ? "en" : "ar"); setLang(isAr ? "en" : "ar"); }}>{t.lang}</button>
            <button type="button" className="dp-btn ghost-d sm fs-sm dp-signin" onClick={() => navigate("/")}>{t.nav.signIn}</button>
            <button type="button" className="dp-btn primary sm fs-sm dp-nav-book" onClick={(e) => goForm(e, "nav")}>{t.nav.book}</button>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section id="top" className="dp-hero" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="dp-aurora" aria-hidden="true"><span /><span /><span /></div>
        <div className="dp-wrap dp-hero-grid">
          <div>
            {cfg.offer?.endsAt ? (
              <a href="#demo-form" onClick={(e) => goForm(e, "offer")} className="dp-pill fs-sm">
                <b className="fs-xs">🎁 {t.offerTag}</b> {t.offerPill(fmtOfferDate(cfg.offer.endsAt, lang))} <span aria-hidden="true">{arrow}</span>
              </a>
            ) : (
              <span className="dp-pill teal fs-sm"><b className="fs-xs">{t.pillTag}</b> {t.pill}</span>
            )}
            <h1 className="dp-h1 fs-hero">
              {t.h1a}<br /><span className="dp-grad">{t.h1b}</span>
            </h1>
            <p className="dp-lead fs-lead">{t.lead}</p>
            <div className="dp-cta">
              <button type="button" className="dp-btn primary fs-md" onClick={(e) => goForm(e, "hero")}>
                {t.ctaDemo} <span className="arr" aria-hidden="true">{arrow}</span>
              </button>
              <button type="button" className="dp-btn ghost-d fs-md dp-trial-cta" onClick={() => openTrial("hero")}>
                🚀 {t.ctaTrial}
              </button>
              <button type="button" className="dp-btn ghost-d fs-md" onClick={() => navigate(quizHref)}>
                📊 {t.ctaCheck}
              </button>
              <a href="#pricing" className="dp-btn ghost-d fs-md">💰 {t.ctaPrices}</a>
            </div>
          </div>

          <div className="dp-stage" aria-hidden="true">
            <div className="dp-mock" ref={mockRef}>
              <div className="dp-screen" dir={isAr ? "rtl" : "ltr"}>
                <div className="dp-side"><i className="on" /><i /><i /><i /><i /></div>
                <div className="dp-main">
                  <div className="dp-bar">
                    <b className="fs-md">{m.title}</b>
                    <span className="fs-xs" style={{ color: "#64748b", fontWeight: 700 }}>{m.today} · 09:42</span>
                  </div>
                  <div className="dp-kpis">
                    <div className="dp-kpi"><small className="fs-2xs">{m.k1}</small><b className="fs-kpi">12<span className="fs-sm" style={{ color: "#94a3b8" }}>/12</span></b><em className="fs-2xs" style={{ color: "#059669" }}>▲ 100%</em></div>
                    <div className="dp-kpi"><small className="fs-2xs">{m.k2}</small><b className="fs-kpi">3</b><em className="fs-2xs" style={{ color: "#059669" }}>▼ 5</em></div>
                    <div className="dp-kpi"><small className="fs-2xs">{m.k3}</small><b className="fs-kpi" style={{ color: "#0d9488" }}>94%</b><em className="fs-2xs" style={{ color: "#059669" }}>▲ 12</em></div>
                  </div>
                  <div className="dp-chart">
                    <div className="dp-chart-h fs-2xs"><span>{m.chart}</span><span>{m.range}</span></div>
                    <svg viewBox="0 0 300 96" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dp-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#14b8a6" stopOpacity=".28" />
                          <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect x="0" y="22" width="300" height="52" fill="#14b8a6" opacity=".06" />
                      <line x1="0" y1="22" x2="300" y2="22" stroke="#14b8a6" strokeDasharray="4 4" opacity=".5" />
                      <line x1="0" y1="74" x2="300" y2="74" stroke="#14b8a6" strokeDasharray="4 4" opacity=".5" />
                      <path d="M0 58 C20 52 30 44 50 47 S80 60 100 52 130 36 150 40 180 55 200 50 230 34 250 38 280 48 300 44 L300 96 L0 96 Z" fill="url(#dp-area)" />
                      <path className="dp-line" d="M0 58 C20 52 30 44 50 47 S80 60 100 52 130 36 150 40 180 55 200 50 230 34 250 38 280 48 300 44" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="250" cy="38" r="4.5" fill="#fff" stroke="#0d9488" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div className="dp-rows">
                    {[[m.r1, m.ok, "#10b981", "#d1fae5", "#047857"], [m.r2, m.ok, "#10b981", "#d1fae5", "#047857"], [m.r3, m.due, "#f59e0b", "#fef3c7", "#b45309"]].map(([a, s, dot, bg, fg]) => (
                      <div className="dp-row fs-xs" key={a}>
                        <span className="dot" style={{ background: dot }} />{a}
                        <span className="st fs-2xs" style={{ background: bg, color: fg }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="dp-float f1 fs-sm">
              <span className="ic" style={{ background: "#ccfbf1", color: "#0f766e" }}><Icon name="thermo" size={18} /></span>
              <span>{m.f1}<small className="fs-xs">{m.f1s}</small></span>
            </div>
            <div className="dp-float f2 fs-sm">
              <span className="ic" style={{ background: "#dcfce7", color: "#15803d" }}><Icon name="check" size={18} /></span>
              <span dir="auto">{m.f2}<small className="fs-xs">{m.f2s}</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── built for ── */}
      <div className="dp-strip">
        <div className="dp-wrap dp-strip-in fs-sm">
          <span className="lbl">{SU.ask}</span>
          {SECTOR_ORDER.map((v) => (
            <button key={v} type="button" className={`dp-chip-d dp-sec${sector === v ? " on" : ""}`} aria-pressed={sector === v} onClick={() => pickSector(v)}>
              {SECTORS[v][lang].chip}
            </button>
          ))}
          {sector && <button type="button" className="dp-sec-all" onClick={() => pickSector("")}>✕ {SU.all}</button>}
        </div>
        <div className="dp-wrap dp-strip-in dp-std fs-sm">
          <span className="lbl">{P.stdLbl}</span>
          {P.standards.map((x) => <span key={x} className="dp-std-b"><i aria-hidden="true">✓</i>{x}</span>)}
        </div>
      </div>

      {/* ── what we solve for the picked sector (no dp-reveal: it mounts after load) ── */}
      {sec && (
        <section id="sector" className="dp-section tight dp-sec-pains">
          <div className="dp-wrap">
            <div className="dp-center">
              <span className="dp-eyebrow fs-xs">{SU.painEyebrow}</span>
              <h2 className="dp-h2 fs-h2">{SU.painTitle(sec.who)}</h2>
            </div>
            <div className="dp-steps">
              {sec.pains.map(([ic, h, p]) => (
                <div key={h} className="dp-step">
                  <span className="n fs-md" aria-hidden="true">{ic}</span>
                  <h3 className="fs-h3">{h}</h3>
                  <p className="fs-md">{p}</p>
                </div>
              ))}
            </div>
            <div className="dp-center" style={{ marginTop: 28 }}>
              <button type="button" className="dp-btn primary fs-md" onClick={() => openTrial(`sector-${sector}`)}>
                🚀 {t.ctaTrial}
              </button>
              <button type="button" className="dp-btn dark fs-md" onClick={(e) => goForm(e, `sector-${sector}`)} style={{ marginInlineStart: 10 }}>
                {t.ctaDemo} <span className="arr" aria-hidden="true">{arrow}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <DemoSectorFlex lang={lang} sector={sector} ctaTrial={t.ctaTrial} arrow={arrow}
        onTrial={(v) => openTrial(`sector-${v}`)} onExplore={exploreSector} />

      {/* ── features ── */}
      <section id="features" className="dp-section">
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.featEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.featTitle}</h2>
            <p className="dp-sub fs-lead">{t.featSub}</p>
          </div>
          <div className="dp-bento">
            <article className="dp-card dark c4 wide dp-reveal" onMouseMove={onCardMove}>
              <div className="dp-ico"><Icon name="thermo" /></div>
              <h3 className="fs-h3">{F.haccp[0]}</h3>
              <p className="fs-md">{F.haccp[1]}</p>
              <div className="dp-mini">
                <svg viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden="true">
                  <rect x="0" y="24" width="400" height="56" fill="#2dd4bf" opacity=".07" />
                  <line x1="0" y1="24" x2="400" y2="24" stroke="#2dd4bf" strokeDasharray="5 5" opacity=".45" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#2dd4bf" strokeDasharray="5 5" opacity=".45" />
                  <path d="M0 62 C30 55 50 48 80 52 S120 64 150 58 190 40 220 44 260 60 290 55 330 36 360 42 390 50 400 48" fill="none" stroke="#5eead4" strokeWidth="2.5" />
                  <path d="M0 70 C30 72 60 66 90 68 S140 76 170 72 210 64 240 66 280 74 310 70 350 62 400 66" fill="none" stroke="#22d3ee" strokeWidth="2" opacity=".7" />
                  <circle cx="300" cy="14" r="5" fill="#f59e0b" />
                  <path d="M300 14 L300 40" stroke="#f59e0b" strokeDasharray="3 3" />
                </svg>
              </div>
            </article>
            <article className="dp-card c2 dp-reveal" style={{ "--d": ".05s" }} onMouseMove={onCardMove}>
              <div className="dp-ico"><Icon name="route" /></div>
              <h3 className="fs-h3">{F.trace[0]}</h3>
              <p className="fs-md">{F.trace[1]}</p>
              <div className="dp-flow fs-xs">
                <span>{F.trace3[0]}</span><i>{arrow}</i><span>{F.trace3[1]}</span><i>{arrow}</i><span>{F.trace3[2]}</span>
              </div>
            </article>
            <article className="dp-card c2 dp-reveal" onMouseMove={onCardMove}>
              <div className="dp-ico"><Icon name="alert" /></div>
              <h3 className="fs-h3">{F.ncr[0]}</h3>
              <p className="fs-md">{F.ncr[1]}</p>
            </article>
            <article className="dp-card c2 dp-reveal" style={{ "--d": ".05s" }} onMouseMove={onCardMove}>
              <div className="dp-ico"><Icon name="clipboard" /></div>
              <h3 className="fs-h3">{F.audit[0]}</h3>
              <p className="fs-md">{F.audit[1]}</p>
            </article>
            <article className="dp-card c2 dp-reveal" style={{ "--d": ".1s" }} onMouseMove={onCardMove}>
              <div className="dp-ico"><Icon name="truck" /></div>
              <h3 className="fs-h3">{F.supp[0]}</h3>
              <p className="fs-md">{F.supp[1]}</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── pricing plans ── */}
      <section id="pricing" className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.priceEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.priceTitle}</h2>
            <p className="dp-sub fs-lead">{t.priceSub}</p>
          </div>
          <div className="dp-reveal"><PricingPlans lang={lang} onBook={(b, note) => bookFromCalc(b, "pricing", note)} /></div>
        </div>
      </section>

      {/* ── before / after ── */}
      <section className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.baEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.baTitle}</h2>
          </div>
          <div className="dp-ba-wrap dp-reveal"><BeforeAfter lang={lang} /></div>
          <div className="dp-ba-wrap dp-reveal"><PaperVsTable lang={lang} /></div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.howEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.howTitle}</h2>
          </div>
          <div className="dp-steps">
            {t.steps.map(([h, p], i) => (
              <div key={h} className="dp-step dp-reveal" style={{ "--d": `${i * 0.1}s` }}>
                <span className="n fs-md">{i + 1}</span>
                <h3 className="fs-h3">{h}</h3>
                <p className="fs-md">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── customer stories (real quotes the owner adds in Platform Center; hidden when none) ── */}
      <Testimonials items={cfg.testimonials} lang={lang} P={P} />

      {/* ── savings calculator + offer ── */}
      <section id="savings" className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.calcEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.calcTitle}</h2>
            <p className="dp-sub fs-lead">{t.calcSub}</p>
          </div>
          <div className="dp-reveal"><SavingsCalculator lang={lang} onBook={(b) => bookFromCalc(b, "calc")} /></div>
        </div>
      </section>

      {/* ── about us ── */}
      <section id="about" className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap dp-about">
          <div className="dp-reveal">
            <span className="dp-eyebrow fs-xs">{P.aboutEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{P.aboutTitle}</h2>
            {P.aboutP.map((x) => <p key={x} className="dp-sub fs-md">{x}</p>)}
            <div className="dp-about-chips">
              {P.aboutChips.map((c) => <span key={c} className="fs-sm">✓ {c}</span>)}
            </div>
          </div>
          <div className="dp-values">
            {P.values.map(([ic, h, d], i) => (
              <div key={h} className="dp-value dp-reveal" style={{ "--d": `${i * 0.08}s` }}>
                <span className="dp-value-ic"><Icon name={ic} size={22} /></span>
                <h3 className="fs-md">{h}</h3>
                <p className="fs-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── form ── */}
      <section id="demo-form" className="dp-formsec dp-section">
        <div className="dp-wrap dp-form-grid">
          <div className="dp-reveal">
            <span className="dp-eyebrow fs-xs" style={{ color: "#5eead4" }}>{t.formEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.formTitle}</h2>
            <p className="dp-sub fs-lead" style={{ color: "#9fb0c8" }}>{t.formSub}</p>
            <ul className="dp-gets fs-md">
              {t.gets.map((g) => <li key={g}><i className="fs-sm">✓</i><span>{g}</span></li>)}
            </ul>
            <div className="dp-host">
              <span className="dp-host-av" aria-hidden="true">MA<i /></span>
              <div>
                <small className="fs-2xs">{P.hostKicker}</small>
                <b className="fs-md">{P.hostName}</b>
                <span className="fs-xs">{P.hostRole}</span>
                <q className="fs-sm">{P.hostQuote}</q>
              </div>
            </div>
            <div className="dp-side-promos">
              <StoryCard story={cfg.story} lang={lang} />
              <ReferralNote referral={cfg.referral} lang={lang} />
            </div>
          </div>

          {!docked && formCard}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="dp-section tight">
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.faqEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.faqTitle}</h2>
          </div>
          <div className="dp-faq">
            {t.faq.map(([q, a]) => (
              <details key={q} className="dp-reveal">
                <summary className="fs-md">{q}</summary>
                <p className="fs-md">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {trialOpen && (
        <Suspense fallback={null}>
          <TrialSignup lang={lang} sector={sector} source={source} track={track} onClose={() => setTrialOpen(false)} />
        </Suspense>
      )}

      {/* ── footer ── */}
      <footer className="dp-foot">
        <div className="dp-wrap dp-foot-in fs-sm">
          <BrandLockup size={30} tone="dark" tag="" />
          <div className="dp-foot-links">
            <a href="#about">{t.nav.about}</a>
            <button type="button" onClick={() => navigate(quizHref)}>{t.footCheck}</button>
            <button type="button" onClick={() => navigate("/")}>{t.footSignIn}</button>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="dp-foot-social">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              Facebook
            </a>
          </div>
          <span>© {new Date().getFullYear()} INSPECT PRO. {t.footRights}</span>
        </div>
      </footer>

      <div className={`dp-sticky${sticky && !done ? " on" : ""}`} aria-hidden={!sticky}>
        <span className="fs-xs">{P.stickyNote}</span>
        <button type="button" className="dp-btn primary fs-md" onClick={(e) => goForm(e, "sticky")} tabIndex={sticky ? 0 : -1}>
          {P.stickyBook} <span className="arr" aria-hidden="true">{arrow}</span>
        </button>
      </div>

      {docked && (
        <aside ref={dockRef} className="dp-dock" aria-label={t.cardTitle}>
          {formCard}
        </aside>
      )}

      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={countWaTap} className="dp-wa-fab fs-md" aria-label={t.waFab} title={t.waFab}>
          <WaIcon size={30} />
          <span className="lbl">{t.waFab}</span>
        </a>
      )}
    </main>
  );
}

// Interests + chosen slot ride inside the message, so no server change is needed.
function withExtras(message, interests, when, P) {
  const lines = [];
  const picked = P.interests.filter(([k]) => interests.includes(k)).map(([, l]) => l.replace(/^\S+\s/, ""));
  if (picked.length) lines.push(`[${P.interestTag}: ${picked.join(", ")}]`);
  const day = P.days.find(([v]) => v === when.day)?.[1];
  const time = P.times.find(([v]) => v === when.time)?.[1];
  if (day || time) lines.push(`[${P.whenTag}: ${[day, time].filter(Boolean).join(" · ")}]`);
  if (!lines.length) return message;
  return [message, ...lines].filter(Boolean).join("\n");
}

/* One language per page: a quote shows only on the page of the language it was written in. */
function Testimonials({ items, lang, P }) {
  const list = (items || []).filter((x) => x?.[lang]);
  if (!list.length) return null;
  return (
    <section id="stories" className="dp-section tight" style={{ paddingTop: 0 }}>
      <div className="dp-wrap">
        <div className="dp-center dp-reveal">
          <span className="dp-eyebrow fs-xs">{P.tmEyebrow}</span>
          <h2 className="dp-h2 fs-h2">{P.tmTitle}</h2>
        </div>
        <div className="dp-tm-grid">
          {list.map((x, i) => {
            const initials = String(x.name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
            const stars = Math.min(5, Math.max(1, Number(x.stars) || 5));
            return (
              <figure key={`${x.name}-${i}`} className="dp-tm dp-reveal" style={{ "--d": `${i * 0.08}s` }}>
                <div className="dp-tm-stars fs-md" aria-label={`${stars}/5`}>{"★".repeat(stars)}<span>{"★".repeat(5 - stars)}</span></div>
                <blockquote className="fs-md">“{x[lang]}”</blockquote>
                <figcaption>
                  <span className="dp-tm-av fs-sm" aria-hidden="true">{initials}</span>
                  <span>
                    <b className="fs-sm">{x.name}</b>
                    {(x.role || x.company) && <small className="fs-xs">{[x.role, x.company].filter(Boolean).join(" · ")}</small>}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NextSteps({ P }) {
  return (
    <div className="dp-next">
      <b className="fs-sm">{P.nextTitle}</b>
      <ol>
        {P.next3.map(([n, h, d]) => (
          <li key={n}>
            <span className="dp-next-n fs-xs">{n}</span>
            <span><strong className="fs-sm">{h}</strong><small className="fs-xs">{d}</small></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({ id, label, required, full, children }) {
  return (
    <div className={`dp-field${full ? " full" : ""}`}>
      <label htmlFor={id} className="fs-sm">{label}{required && <em> *</em>}</label>
      {children}
    </div>
  );
}

/* Small stroke icons, drawn to one 24px grid. */
const ICONS = {
  thermo: <><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6.5" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M8.5 12l2.2 2.2L15.5 9.5" /></>,
  truck: <><path d="M2.5 6.5h11v9h-11zM13.5 10h4l3 3v2.5h-7" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

function Icon({ name, size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function WaIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: `0 0 ${size}px` }}>
      <path fill="currentColor" d="M16.02 3C8.84 3 3 8.83 3 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.96 12.96 0 0 0 16.02 29C23.2 29 29 23.17 29 16S23.2 3 16.02 3Zm0 23.8c-2 0-3.95-.54-5.65-1.55l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.74 10.74 0 0 1 5.2 16c0-5.96 4.85-10.8 10.82-10.8 5.96 0 10.8 4.84 10.8 10.8 0 5.96-4.84 10.8-10.8 10.8Zm5.93-8.09c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.16-.22.33-.84 1.06-1.03 1.28-.19.22-.38.24-.7.08-.33-.16-1.38-.51-2.62-1.62-.97-.86-1.62-1.93-1.81-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.73-1.77-1-2.42-.27-.64-.54-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.72 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.5 5.56 4.91.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.41.19-1.55-.08-.13-.3-.21-.62-.37Z" />
    </svg>
  );
}
