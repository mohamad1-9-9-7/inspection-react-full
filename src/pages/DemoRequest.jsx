// src/pages/DemoRequest.jsx
// Public landing page (/demo) — the first thing a prospect sees of InspectPro.
// No login. Hero with a live-looking product mock-up, who it is for, the
// feature bento, before/after, how it works, the demo-request form, FAQ. Styles: DemoRequest.css (scoped under .dp).
//
// Server contract: POST /api/demo-requests (public, rate-limited),
// GET /api/demo-config (WhatsApp number, offer, referral, story — all set by
// the owner in Platform Center → Demo Requests). `?src=linkedin` (or any value)
// on the link is saved with the request, so each channel can be counted.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../config/api";
import "./DemoRequest.css";
import { BrandLockup } from "./readiness/brand";
import { BeforeAfter, PROMO_CSS, ReferralNote, StoryCard, useDemoConfig } from "./readiness/promoBlocks";

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
    nav: { features: "Features", how: "How it works", check: "Readiness check", signIn: "Sign in", book: "Book a demo" },
    pill: "Food-safety & quality management platform",
    pillTag: "New",
    offerTag: "Offer",
    offerPill: (d) => `No setup fee until ${d}`,
    h1a: "Every branch. Every record.",
    h1b: "Inspection‑ready, always.",
    lead: "InspectPro replaces paper logs with one live platform for HACCP, ISO 22000, internal audits, traceability and suppliers — so any record is in front of the inspector in minutes, not days.",
    ctaDemo: "Book a free demo",
    ctaCheck: "Check your readiness — 2 min",
    mock: {
      title: "Dashboard", today: "Today",
      k1: "Branches reporting", k2: "Open NCRs", k3: "Readiness",
      chart: "Cooler temperatures", range: "Limit 0–5 °C",
      r1: "Receiving check — POS 10", r2: "Cleaning checklist — POS 15", r3: "Pest control — QCS",
      ok: "Done", due: "Due 4 pm",
      f1: "Cooler 03 · 2.4 °C", f1s: "Within limit",
      f2: "NCR-000087", f2s: "Closed with evidence",
    },
    forLbl: "Built for",
    forList: ["Meat & butchery", "Sweets & bakery", "Restaurants", "Central kitchens", "Food factories", "Retail & cold stores"],
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
    contact: "Your name", job: "Job title", phone: "Mobile / WhatsApp", email: "E-mail",
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
      ["How is it priced?", "Per company, depending on the number of branches and modules. You get a clear quote after the demo."],
    ],
    footRights: "All rights reserved.",
    footSignIn: "Customer sign-in",
    footCheck: "Readiness check",
    waFab: "Chat on WhatsApp",
    waMsg: "Hello, I'd like to know more about InspectPro and book a demo.",
    lang: "العربية",
  },
  ar: {
    nav: { features: "المزايا", how: "آلية العمل", check: "فحص الجاهزية", signIn: "تسجيل الدخول", book: "احجز عرضًا" },
    pill: "منصة إدارة سلامة الغذاء والجودة",
    pillTag: "جديد",
    offerTag: "عرض",
    offerPill: (d) => `إعفاء من رسوم التأسيس حتى ${d}`,
    h1a: "كل فرع، وكل سجل،",
    h1b: "جاهزٌ للتفتيش دائمًا.",
    lead: "يستبدل InspectPro السجلات الورقية بمنصة واحدة مباشرة لـ HACCP و ISO 22000 والتدقيق الداخلي والتتبّع والموردين — ليكون أي سجل بين يدي المفتش خلال دقائق، لا أيام.",
    ctaDemo: "احجز عرضًا تجريبيًا مجانيًا",
    ctaCheck: "قِس جاهزيتك — دقيقتان",
    mock: {
      title: "لوحة التحكم", today: "اليوم",
      k1: "فروع سجّلت", k2: "حالات عدم مطابقة مفتوحة", k3: "الجاهزية",
      chart: "درجات حرارة الثلاجات", range: "الحد 0–5 °م",
      r1: "فحص الاستلام — POS 10", r2: "قائمة النظافة — POS 15", r3: "مكافحة الآفات — QCS",
      ok: "مكتمل", due: "الساعة 4 م",
      f1: "ثلاجة 03 · 2.4 °م", f1s: "ضمن الحد المسموح",
      f2: "NCR-000087", f2s: "أُغلقت بدليل موثّق",
    },
    forLbl: "مصمَّم لـ",
    forList: ["اللحوم والملاحم", "الحلويات والمخابز", "المطاعم", "المطابخ المركزية", "مصانع الأغذية", "التجزئة والتخزين المبرّد"],
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
    contact: "الاسم", job: "المسمى الوظيفي", phone: "رقم الجوال / واتساب", email: "البريد الإلكتروني",
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
      ["كيف يُحتسب السعر؟", "لكل شركة بحسب عدد الفروع والوحدات المطلوبة، وتحصل على عرض سعر واضح بعد العرض التجريبي."],
    ],
    footRights: "جميع الحقوق محفوظة.",
    footSignIn: "دخول العملاء",
    footCheck: "فحص الجاهزية",
    waFab: "راسلنا عبر واتساب",
    waMsg: "مرحبًا، أودّ معرفة المزيد عن InspectPro وحجز عرض تجريبي.",
    lang: "English",
  },
};

const EMPTY = {
  companyName: "", activity: "", branches: "", contactName: "", jobTitle: "", phone: "", email: "",
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
    if (q === "ar" || q === "en") return q;
    try { return String(navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en"; } catch { return "en"; }
  });
  const t = TXT[lang];
  const isAr = lang === "ar";
  const arrow = isAr ? "←" : "→";

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const goForm = (e) => {
    e?.preventDefault?.();
    document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          source,
          referrer: (typeof document !== "undefined" && document.referrer) || "",
          lang,
        }),
      });
      if (res.status === 429) throw new Error(t.tooMany);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(t.failed);
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err?.message || t.failed);
    } finally {
      setSending(false);
    }
  };

  const m = t.mock;
  const F = t.feats;

  return (
    <main ref={rootRef} dir={isAr ? "rtl" : "ltr"} lang={lang} className="dp">
      <style>{PROMO_CSS}</style>

      {/* ── nav ── */}
      <header className={`dp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="dp-wrap dp-nav-in">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ textDecoration: "none" }} aria-label="InspectPro">
            <BrandLockup size={36} tone="dark" />
          </a>
          <nav className="dp-nav-links fs-sm" aria-label="Page">
            <a href="#features">{t.nav.features}</a>
            <a href="#how">{t.nav.how}</a>
            <a href={quizHref} onClick={(e) => { e.preventDefault(); navigate(quizHref); }}>{t.nav.check}</a>
          </nav>
          <div className="dp-nav-act">
            <button type="button" className="dp-lang fs-sm" onClick={() => setLang(isAr ? "en" : "ar")}>{t.lang}</button>
            <button type="button" className="dp-btn ghost-d sm fs-sm dp-signin" onClick={() => navigate("/")}>{t.nav.signIn}</button>
            <button type="button" className="dp-btn primary sm fs-sm" onClick={goForm}>{t.nav.book}</button>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section id="top" className="dp-hero" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="dp-aurora" aria-hidden="true"><span /><span /><span /></div>
        <div className="dp-wrap dp-hero-grid">
          <div>
            {cfg.offer?.endsAt ? (
              <a href="#demo-form" onClick={goForm} className="dp-pill fs-sm">
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
              <button type="button" className="dp-btn primary fs-md" onClick={goForm}>
                {t.ctaDemo} <span className="arr" aria-hidden="true">{arrow}</span>
              </button>
              <button type="button" className="dp-btn ghost-d fs-md" onClick={() => navigate(quizHref)}>
                📊 {t.ctaCheck}
              </button>
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
          <span className="lbl">{t.forLbl}</span>
          {t.forList.map((x) => <span key={x} className="dp-chip-d">{x}</span>)}
        </div>
      </div>

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

      {/* ── before / after ── */}
      <section className="dp-section tight" style={{ paddingTop: 0 }}>
        <div className="dp-wrap">
          <div className="dp-center dp-reveal">
            <span className="dp-eyebrow fs-xs">{t.baEyebrow}</span>
            <h2 className="dp-h2 fs-h2">{t.baTitle}</h2>
          </div>
          <div className="dp-ba-wrap dp-reveal"><BeforeAfter lang={lang} /></div>
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
            <div className="dp-side-promos">
              <StoryCard story={cfg.story} lang={lang} />
              <ReferralNote referral={cfg.referral} lang={lang} />
            </div>
          </div>

          <div className="dp-formcard dp-reveal" style={{ "--d": ".08s" }}>
            {done ? (
              <div className="dp-done">
                <div className="dp-done-ic"><Icon name="check" size={40} color="#fff" /></div>
                <h3 className="fs-h2">{t.doneTitle}</h3>
                <p className="hint fs-md" style={{ margin: "10px 0 0" }}>{t.doneSub}</p>
                <div className="dp-done-act">
                  <button type="button" className="dp-btn dark fs-md" onClick={() => navigate(quizHref)}>📊 {t.doneCheck}</button>
                  <button type="button" className="dp-btn fs-md" style={{ border: "1px solid #e2e8f0", background: "#fff" }} onClick={() => setDone(false)}>{t.another}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
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
                  <Field id="f-nm" label={t.contact} required>
                    <input id="f-nm" className="dp-input" value={form.contactName} onChange={set("contactName")} autoComplete="name" maxLength={120} />
                  </Field>
                  <Field id="f-jb" label={t.job}>
                    <input id="f-jb" className="dp-input" value={form.jobTitle} onChange={set("jobTitle")} autoComplete="organization-title" maxLength={120} />
                  </Field>
                  <Field id="f-ph" label={t.phone} required>
                    <input id="f-ph" className="dp-input" style={{ direction: "ltr" }} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+971 5x xxx xxxx" maxLength={40} />
                  </Field>
                  <Field id="f-ml" label={t.email}>
                    <input id="f-ml" className="dp-input" style={{ direction: "ltr" }} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} />
                  </Field>
                  <Field id="f-msg" label={t.message} full>
                    <textarea id="f-msg" className="dp-input" value={form.message} onChange={set("message")} placeholder={t.messagePh} maxLength={2000} />
                  </Field>
                  <Field id="f-ref" label={t.referredBy} full>
                    <input id="f-ref" className="dp-input" value={form.referredBy} onChange={set("referredBy")} placeholder={t.referredPh} maxLength={150} />
                  </Field>
                </div>

                {/* Honeypot: off-screen and skipped by keyboard / screen readers. */}
                <div aria-hidden="true" className="dp-honey">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
                </div>

                {error && <div role="alert" className="dp-err fs-sm" style={{ marginTop: 14 }}>{error}</div>}

                <button type="submit" disabled={sending} className="dp-btn primary dp-submit fs-md">
                  {sending ? t.sending : <>{t.submit} <span className="arr" aria-hidden="true">{arrow}</span></>}
                </button>
                <p className="dp-privacy fs-xs">🔒 {t.privacy}</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="dp-section tight">
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

      {/* ── footer ── */}
      <footer className="dp-foot">
        <div className="dp-wrap dp-foot-in fs-sm">
          <BrandLockup size={30} tone="dark" tag="" />
          <div className="dp-foot-links">
            <button type="button" onClick={() => navigate(quizHref)}>{t.footCheck}</button>
            <button type="button" onClick={() => navigate("/")}>{t.footSignIn}</button>
          </div>
          <span>© {new Date().getFullYear()} INSPECT PRO. {t.footRights}</span>
        </div>
      </footer>

      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={countWaTap} className="dp-wa-fab fs-md" aria-label={t.waFab} title={t.waFab}>
          <WaIcon size={30} />
          <span className="lbl">{t.waFab}</span>
        </a>
      )}
    </main>
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
