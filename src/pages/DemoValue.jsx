// src/pages/DemoValue.jsx
// Two selling blocks for the public /demo page (styles: DemoRequest.css, .dp-cmp / .dp-calc):
//  • PaperVsTable     — paper logs vs InspectPro, row by row.
//  • SavingsCalculator — the visitor sets their branch count and sees what paper
//    costs them against the subscription, plus the founding-customer offer and
//    what every subscription includes.
// Prices and savings assumptions live in PRICING / SAVINGS below. They are
// estimates for a sales page; the written quote after the demo is what binds.

import React, { useCallback, useEffect, useState } from "react";
import API_BASE from "../config/api";

/* Per branch, per month, AED (same numbers as STANDARD_PLANS in
   settings/quotations/quotationCore.js — change both together). The visitor
   gives a branch count and picks a plan by budget; any plan fits any count.
   Essential annual (300) is the floor, so it never takes a volume discount;
   Professional and Enterprise get 5–9 branches −10 %, 10+ −15 %. Setup is
   charged once and waived on annual billing. */
export const PRICING = {
  essential: { monthly: 350, annual: 300, volume: false },
  professional: { monthly: 490, annual: 420, volume: true },
  enterprise: { monthly: 690, annual: 590, volume: true },
  volume: [
    { from: 10, off: 0.15 },
    { from: 5, off: 0.10 },
  ],
  setup: 1000,
  maxSites: 20,                 // above this: custom quote
};

/** The plan we suggest for a branch count (the savings calculator uses it). */
export const planFor = (sites) => (sites <= 2 ? "essential" : "professional");

export const volumeOff = (sites, planId) =>
  (PRICING[planId].volume ? PRICING.volume.find((v) => sites >= v.from)?.off || 0 : 0);

/** Price per branch per month in AED, volume discount included. */
export const branchPrice = (sites, planId, annual = true) =>
  Math.round(PRICING[planId][annual ? "annual" : "monthly"] * (1 - volumeOff(sites, planId)));

/* Promo codes (Platform Center → Promo codes; server routes/promoCodes.cjs).
   One code per person who brings customers; it takes a percent or AED off the
   per-branch monthly price. The server decides whether a code is usable. */
export const promoPrice = (per, promo) => {
  if (!promo) return per;
  const off = promo.kind === "aed" ? promo.amount : per * (promo.amount / 100);
  return Math.max(0, Math.round(per - off));
};

const PROMO_KEY = "inspectpro.promo";

/** The visitor's code: from ?code= on the link, or typed on the page. Checked on the server. */
export function usePromo(initialCode) {
  const [promo, setPromo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const apply = useCallback(async (raw) => {
    const code = String(raw || "").trim().toUpperCase();
    if (!code) return false;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/promo-codes/check?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.status === 429) { setError("busy"); return false; }
      if (!res.ok || !j.promo) { setError("invalid"); setPromo(null); return false; }
      setPromo(j.promo);
      try { sessionStorage.setItem(PROMO_KEY, j.promo.code); } catch { /* private mode */ }
      return true;
    } catch {
      setError("offline");
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const clear = useCallback(() => {
    setPromo(null);
    setError("");
    try { sessionStorage.removeItem(PROMO_KEY); } catch { /* private mode */ }
  }, []);

  // The link's code wins; otherwise the one applied earlier in this visit.
  useEffect(() => {
    let saved = "";
    try { saved = sessionStorage.getItem(PROMO_KEY) || ""; } catch { /* private mode */ }
    const code = initialCode || saved;
    if (code) apply(code);
  }, [initialCode, apply]);

  return { promo, apply, clear, checking, error };
}

/** Monthly subscription in AED for the whole account, billed annually. */
export function monthlyPrice(sites, planId = planFor(sites)) {
  return sites * branchPrice(sites, planId, true);
}

/* Monthly, AED. Supervisor time: ½ hour of paperwork per branch per working
   day (26 days), hourly cost = salary × 1.3 on-costs ÷ 208 hours. QA manager:
   3 days a month (AED 650/day) spread over 8 branches. Paper: printing,
   binders, storage. Fines: one AED 10,000 hygiene fine avoided a year. */
export const SAVINGS = {
  hoursPerDay: 0.5,
  workDays: 26,
  onCost: 1.3,
  qaPerSite: (3 * 650) / 8,
  paperPerSite: 60,
  finePerYear: 10000,
};

export function monthlySavings(sites, salary) {
  const hourly = (salary * SAVINGS.onCost) / 208;
  const parts = {
    staff: sites * SAVINGS.hoursPerDay * SAVINGS.workDays * hourly,
    qa: sites * SAVINGS.qaPerSite,
    paper: sites * SAVINGS.paperPerSite,
    fines: SAVINGS.finePerYear / 12,
  };
  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return { parts, total };
}

/* The form's branch buckets (DEMO_BRANCHES in DemoRequest.jsx). */
export const branchBucket = (n) => (n <= 1 ? "1" : n <= 5 ? "2-5" : n <= 20 ? "6-20" : "20+");

const fmt = (n) => Math.round(n).toLocaleString("en-US");

const T = {
  en: {
    cmpPaper: "Paper logs",
    cmpApp: "InspectPro",
    cmp: [
      ["Finding a record", "Hours going through folders", "Under 2 minutes, by branch and date"],
      ["Lost or damaged records", "Water, grease and misplaced files", "Kept in the cloud, nothing to lose"],
      ["Missing signatures and checks", "Found when the inspector finds them", "Seen the same day, with who and when"],
      ["Temperature out of limit", "Noticed days later, if at all", "Stands out the moment it is entered"],
      ["Preparing for an inspection", "Days of collecting and copying", "Any record as PDF or Excel in one click"],
      ["Head office view", "Wait for the folders to arrive", "Every branch live on one screen"],
    ],
    branches: "Number of branches",
    salary: "Supervisor monthly salary (AED)",
    saveLbl: "Paper costs you about",
    perMonth: "AED / month",
    subLbl: "InspectPro subscription",
    subNote: (p, d) => `${p} plan, billed annually · about AED ${d} a day`,
    planName: { essential: "Essential", professional: "Professional", enterprise: "Enterprise" },
    net: (n) => `You keep AED ${n} a month`,
    roi: (x) => `The system returns ${x}× its cost`,
    custom: "More than 20 branches? We prepare a custom quote.",
    parts: { staff: "Supervisors' paperwork time", qa: "QA manager's reporting time", paper: "Printing, binders and storage", fines: "One avoided fine a year" },
    note: "Estimates: half an hour of paperwork saved per branch per day, three QA-manager days a month per 8 branches, printing, and one AED 10,000 fine avoided a year. The demo confirms your real numbers.",
    cta: "Confirm my numbers in a free demo",
    foundTag: "Founding customers",
    foundTitle: "For the first 10 companies",
    found: ["Price locked for 2 years", "No setup fee"],
    inclTitle: "Every subscription includes",
    incl: ["First month free", "Team training", "Support", "Maintenance and updates"],
  },
  ar: {
    cmpPaper: "السجلات الورقية",
    cmpApp: "InspectPro",
    cmp: [
      ["الوصول إلى سجل", "ساعات من البحث في الملفات", "أقل من دقيقتين، بالفرع والتاريخ"],
      ["السجلات الضائعة أو التالفة", "ماء ودهون وملفات في غير مكانها", "محفوظة سحابيًا، لا شيء يضيع"],
      ["التواقيع والفحوصات الناقصة", "تُكتشف عندما يكتشفها المفتش", "تظهر في اليوم نفسه، مع المسؤول والوقت"],
      ["حرارة خارج الحد المسموح", "تُلاحظ بعد أيام، هذا إن لوحظت", "تبرز لحظة إدخالها"],
      ["التحضير للتفتيش", "أيام من الجمع والتصوير", "أي سجل PDF أو Excel بنقرة واحدة"],
      ["اطّلاع الإدارة", "انتظار وصول الملفات", "جميع الفروع مباشرةً على شاشة واحدة"],
    ],
    branches: "عدد الفروع",
    salary: "راتب المشرف الشهري (درهم)",
    saveLbl: "تكلّفك الأوراق نحو",
    perMonth: "درهم / شهريًا",
    subLbl: "اشتراك InspectPro",
    subNote: (p, d) => `باقة ${p}، دفع سنوي · نحو ${d} درهم يوميًا`,
    planName: { essential: "الأساسية", professional: "الاحترافية", enterprise: "المتكاملة" },
    net: (n) => `يبقى لك ${n} درهم شهريًا`,
    roi: (x) => `يعيد النظام تكلفته ${x} مرة`,
    custom: "أكثر من 20 فرعًا؟ نعدّ لك عرض سعر خاصًا.",
    parts: { staff: "وقت المشرفين في الأوراق", qa: "وقت مدير الجودة في التقارير", paper: "الطباعة والملفات والتخزين", fines: "تجنّب مخالفة واحدة سنويًا" },
    note: "تقديرات: توفير نصف ساعة من الأعمال الورقية لكل فرع يوميًا، وثلاثة أيام شهريًا لمدير الجودة لكل 8 فروع، والطباعة، وتجنّب مخالفة واحدة بقيمة 10,000 درهم سنويًا. يؤكد العرض التجريبي أرقامك الفعلية.",
    cta: "أكّد أرقامي في عرض مجاني",
    foundTag: "العملاء المؤسسون",
    foundTitle: "لأول 10 شركات",
    found: ["سعر ثابت لمدة سنتين", "بدون رسوم تأسيس"],
    inclTitle: "يشمل كل اشتراك",
    incl: ["الشهر الأول مجانًا", "تدريب فريقك", "الدعم الفني", "الصيانة والتحديثات"],
  },
};

export function PaperVsTable({ lang }) {
  const t = T[lang];
  return (
    <div className="dp-cmp" role="table" aria-label={`${t.cmpPaper} / ${t.cmpApp}`}>
      <div className="dp-cmp-row head" role="row">
        <span role="columnheader" />
        <span role="columnheader" className="bad fs-sm">{t.cmpPaper}</span>
        <span role="columnheader" className="good fs-sm">{t.cmpApp}</span>
      </div>
      {t.cmp.map(([what, paper, app]) => (
        <div className="dp-cmp-row" role="row" key={what}>
          <b role="rowheader" className="fs-md">{what}</b>
          <span role="cell" className="bad fs-sm"><i aria-hidden="true">✕</i>{paper}</span>
          <span role="cell" className="good fs-sm"><i aria-hidden="true">✓</i>{app}</span>
        </div>
      ))}
    </div>
  );
}

export function SavingsCalculator({ lang, onBook }) {
  const t = T[lang];
  const [sites, setSites] = useState(4);
  const [salary, setSalary] = useState(6000);
  const over = sites > PRICING.maxSites;
  const n = Math.min(sites, PRICING.maxSites);
  const price = monthlyPrice(n);
  const { parts, total } = monthlySavings(n, Number(salary) || 0);
  const net = total - price;
  const partMax = Math.max(...Object.values(parts), 1);

  return (
    <div className="dp-calc">
      <div className="dp-calc-in">
        <div className="dp-calc-inputs">
          <label htmlFor="calc-sites" className="fs-sm">{t.branches}</label>
          <div className="dp-calc-sites">
            <input
              id="calc-sites" type="range" min={1} max={PRICING.maxSites + 1} step={1}
              value={sites} onChange={(e) => setSites(Number(e.target.value))}
              aria-valuetext={over ? `${PRICING.maxSites}+` : String(sites)}
            />
            <b className="fs-kpi" dir="ltr">{over ? `${PRICING.maxSites}+` : sites}</b>
          </div>

          <label htmlFor="calc-sal" className="fs-sm" style={{ marginTop: 18 }}>{t.salary}</label>
          <input
            id="calc-sal" className="dp-input" type="number" inputMode="numeric" min={2000} max={30000} step={500}
            value={salary} onChange={(e) => setSalary(e.target.value)} style={{ direction: "ltr" }}
          />

          <ul className="dp-calc-parts">
            {Object.entries(parts).map(([k, v]) => (
              <li key={k} className="fs-sm">
                <span>{t.parts[k]}</span>
                <b dir="ltr">{fmt(v)}</b>
                <i aria-hidden="true"><em style={{ width: `${(v / partMax) * 100}%` }} /></i>
              </li>
            ))}
          </ul>
        </div>

        <div className="dp-calc-out" aria-live="polite">
          <span className="lbl fs-sm">{t.saveLbl}</span>
          <div className="big"><b className="fs-stat" dir="ltr">{fmt(total)}</b> <span className="fs-sm">{t.perMonth}</span></div>

          <div className="dp-calc-sub">
            <span className="fs-sm">{t.subLbl}</span>
            {over ? (
              <b className="fs-md">{t.custom}</b>
            ) : (
              <>
                <div><b className="fs-kpi" dir="ltr">{fmt(price)}</b> <span className="fs-sm">{t.perMonth}</span></div>
                <small className="fs-xs">{t.subNote(t.planName[planFor(n)], fmt(price / 30))}</small>
              </>
            )}
          </div>

          {!over && net > 0 && (
            <div className="dp-calc-net">
              <b className="fs-md">{t.net(fmt(net))}</b>
              <span className="fs-sm">{t.roi((total / price).toFixed(1))}</span>
            </div>
          )}

          <button type="button" className="dp-btn primary fs-md" onClick={() => onBook(branchBucket(sites))}>
            {t.cta}
          </button>
        </div>
      </div>

      <div className="dp-calc-offer">
        <div className="found">
          <span className="tag fs-xs">★ {t.foundTag}</span>
          <b className="fs-md">{t.foundTitle}</b>
          <div className="chips">{t.found.map((x) => <span key={x} className="fs-sm">{x}</span>)}</div>
        </div>
        <div className="incl">
          <b className="fs-md">{t.inclTitle}</b>
          <div className="chips">{t.incl.map((x) => <span key={x} className="fs-sm"><i aria-hidden="true">✓</i>{x}</span>)}</div>
        </div>
      </div>

      <p className="dp-calc-note fs-xs">{t.note}</p>
    </div>
  );
}

/* ───────── Plans — branch count first, then a budget to pick ───────── */
const PLANS_T = {
  en: {
    step1: "1 · How many branches do you have?",
    step2: "2 · Choose the monthly budget that suits you",
    branchesUnit: (n) => (n === 1 ? "branch" : "branches"),
    over: (n) => `${n}+`,
    monthly: "Monthly",
    annual: "Annual",
    save: "save ~15 %",
    perMonth: "AED / month",
    perBranch: (p) => `AED ${p} per branch`,
    billedAnnually: "billed annually",
    billedMonthly: "billed monthly",
    volume: (x) => `−${x} % for your branch count`,
    setup: (p) => `Setup AED ${p} once`,
    setupFree: "Setup free",
    was: (p) => `AED ${p} on monthly billing`,
    yearSave: (p) => `You save AED ${p} a year`,
    orAnnual: (p, y) => `or AED ${p} a month on annual billing, save AED ${y} a year`,
    promoAsk: "Have a promo code?",
    promoPh: "Enter your code",
    promoApply: "Apply",
    promoOn: (c, off) => `Code ${c} applied: ${off}`,
    promoOff: (pr) => (pr.kind === "aed" ? `AED ${pr.amount} off per branch a month, first year` : `${pr.amount} % off the first year`),
    promoRemove: "Remove code",
    promoErr: { invalid: "This code isn't valid or has expired.", busy: "Too many tries, please wait a little.", offline: "Couldn't check the code, please try again." },
    pickedCode: (c) => ` Promo code: ${c}.`,
    popular: "Most popular",
    quote: "Custom quote",
    quoteSub: "More than 20 branches: we prepare a price for your group.",
    choose: "Choose this budget",
    talk: "Talk to us",
    note: "Prices exclude VAT where it applies. A central kitchen, warehouse or factory counts as a branch. Professional and Enterprise: 5–9 branches −10 %, 10 or more −15 %.",
    picked: (plan, n, total, annual) => `Chosen budget: ${plan}, ${n} ${n === 1 ? "branch" : "branches"}, about AED ${total} a month (${annual ? "billed annually" : "billed monthly"}).`,
    plans: [
      {
        id: "essential", name: "Essential", tag: "Economy",
        feats: ["All daily food-safety logs for your business type", "Limits checked as you type, corrective actions", "OHC cards and training certificates, with expiry alerts", "Excel & PDF exports, works offline", "Arabic & English · unlimited users"],
      },
      {
        id: "professional", name: "Professional", tag: "Balanced",
        feats: ["Everything in Essential", "Every branch live on one screen", "Traceability, suppliers, CAPA and training", "Your own forms set up for you", "Team training at your site · priority support"],
      },
      {
        id: "enterprise", name: "Enterprise", tag: "Complete",
        feats: ["Everything in Professional", "The full quality system: production & yield, audits, HSE", "A system built around your operation", "Dedicated onboarding and account manager"],
      },
    ],
  },
  ar: {
    step1: "١ · كم فرعًا لديك؟",
    step2: "٢ · اختر البدجت الشهري الذي يناسبك",
    branchesUnit: (n) => (n <= 2 ? "فرع" : n <= 10 ? "فروع" : "فرعًا"),
    over: (n) => `${n}+`,
    monthly: "شهري",
    annual: "سنوي",
    save: "وفّر نحو 15%",
    perMonth: "درهم / شهريًا",
    perBranch: (p) => `${p} درهم لكل فرع`,
    billedAnnually: "بالدفع السنوي",
    billedMonthly: "بالدفع الشهري",
    volume: (x) => `خصم ${x}% لعدد فروعك`,
    setup: (p) => `التجهيز ${p} درهم مرة واحدة`,
    setupFree: "التجهيز مجاني",
    was: (p) => `${p} درهم بالدفع الشهري`,
    yearSave: (p) => `توفّر ${p} درهم في السنة`,
    orAnnual: (p, y) => `أو ${p} درهم شهريًا بالدفع السنوي، وتوفّر ${y} درهم في السنة`,
    promoAsk: "لديك كود خصم؟",
    promoPh: "أدخل الكود",
    promoApply: "تطبيق",
    promoOn: (c, off) => `تم تطبيق الكود ${c}: ${off}`,
    promoOff: (pr) => (pr.kind === "aed" ? `خصم ${pr.amount} درهم لكل فرع شهريًا للسنة الأولى` : `خصم ${pr.amount}% للسنة الأولى`),
    promoRemove: "إزالة الكود",
    promoErr: { invalid: "الكود غير صالح أو انتهت صلاحيته.", busy: "محاولات كثيرة، انتظر قليلًا.", offline: "تعذّر التحقق من الكود، حاول مرة أخرى." },
    pickedCode: (c) => ` كود الخصم: ${c}.`,
    popular: "الأكثر طلبًا",
    quote: "عرض سعر خاص",
    quoteSub: "أكثر من 20 فرعًا: نعدّ سعرًا خاصًا لمجموعتك.",
    choose: "اختر هذا البدجت",
    talk: "تواصل معنا",
    note: "الأسعار لا تشمل ضريبة القيمة المضافة حيث تنطبق. المطبخ المركزي أو المستودع أو المصنع يُحتسب فرعًا. الاحترافية والمتكاملة: من 5 إلى 9 فروع خصم 10%، و10 فروع فأكثر خصم 15%.",
    picked: (plan, n, total, annual) => `البدجت المختار: ${plan}، ${n} ${n <= 2 ? "فرع" : n <= 10 ? "فروع" : "فرعًا"}، نحو ${total} درهم شهريًا (${annual ? "بالدفع السنوي" : "بالدفع الشهري"}).`,
    plans: [
      {
        id: "essential", name: "الأساسية", tag: "اقتصادي",
        feats: ["جميع سجلات سلامة الغذاء اليومية لنوع نشاطك", "فحص الحدود لحظة الإدخال مع الإجراءات التصحيحية", "البطاقات الصحية وشهادات التدريب مع تنبيه قبل الانتهاء", "تصدير Excel وPDF، ويعمل دون إنترنت", "عربي وإنجليزي · مستخدمون بلا حدود"],
      },
      {
        id: "professional", name: "الاحترافية", tag: "متوازن",
        feats: ["كل ما في الأساسية", "جميع الفروع مباشرةً على شاشة واحدة", "التتبّع والموردون والإجراءات التصحيحية والتدريب", "نجهّز نماذجك الخاصة لك", "تدريب فريقك في موقعك · دعم بأولوية"],
      },
      {
        id: "enterprise", name: "المتكاملة", tag: "متكامل",
        feats: ["كل ما في الاحترافية", "نظام الجودة الكامل: الإنتاج والمردود، التدقيق، السلامة المهنية", "نظام مبني حول عملياتك", "تهيئة مخصصة ومدير حساب"],
      },
    ],
  },
};

const SITE_PRESETS = [1, 3, 5, 10];

export function PricingPlans({ lang, onBook, promoState }) {
  const t = PLANS_T[lang];
  const [sites, setSites] = useState(1);
  const [annual, setAnnual] = useState(true);
  const promo = promoState?.promo || null;
  const [codeDraft, setCodeDraft] = useState("");
  const submitCode = async (e) => {
    e.preventDefault();
    if (await promoState.apply(codeDraft)) setCodeDraft("");
  };
  const over = sites > PRICING.maxSites;
  const bump = (d) => setSites((n) => Math.min(PRICING.maxSites + 1, Math.max(1, n + d)));

  return (
    <div className="dp-plans">
      <div className="dp-plans-step">
        <b className="fs-md">{t.step1}</b>
        <div className="dp-plans-sites">
          <button type="button" className="fs-md" onClick={() => bump(-1)} disabled={sites <= 1} aria-label="−">−</button>
          <output className="fs-kpi" dir="ltr" aria-live="polite">{over ? t.over(PRICING.maxSites) : sites}</output>
          <button type="button" className="fs-md" onClick={() => bump(1)} disabled={over} aria-label="+">+</button>
          <span className="unit fs-sm">{t.branchesUnit(sites)}</span>
        </div>
        <div className="dp-plans-presets" role="group">
          {SITE_PRESETS.map((n) => (
            <button key={n} type="button" className={`fs-sm${sites === n ? " on" : ""}`} aria-pressed={sites === n} onClick={() => setSites(n)} dir="ltr">{n}</button>
          ))}
          <button type="button" className={`fs-sm${over ? " on" : ""}`} aria-pressed={over} onClick={() => setSites(PRICING.maxSites + 1)} dir="ltr">{t.over(PRICING.maxSites)}</button>
        </div>
      </div>

      <div className="dp-plans-step">
        <b className="fs-md">{t.step2}</b>
        <div className="dp-plans-toggle" role="group">
          <button type="button" className={`fs-sm${!annual ? " on" : ""}`} aria-pressed={!annual} onClick={() => setAnnual(false)}>{t.monthly}</button>
          <button type="button" className={`fs-sm${annual ? " on" : ""}`} aria-pressed={annual} onClick={() => setAnnual(true)}>
            {t.annual} <em className="fs-xs">{t.save}</em>
          </button>
        </div>
        {promoState && (promo ? (
          <div className="dp-promo on fs-md" role="status">
            <span>🏷️ {t.promoOn(promo.code, t.promoOff(promo))}</span>
            <button type="button" className="fs-sm" onClick={promoState.clear}>{t.promoRemove}</button>
          </div>
        ) : (
          // Always on show: the people the owner sends a code to should not have to hunt for it.
          <form className="dp-promo fs-md" onSubmit={submitCode}>
            <label htmlFor="promo-code" className="ask fs-md">🏷️ {t.promoAsk}</label>
            <div className="row">
              <input
                id="promo-code" className="dp-input fs-md" dir="ltr" value={codeDraft} maxLength={30}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                placeholder={t.promoPh} autoComplete="off"
              />
              <button type="submit" className="dp-btn primary fs-md" disabled={promoState.checking || !codeDraft.trim()}>
                {promoState.checking ? "…" : t.promoApply}
              </button>
            </div>
            {promoState.error && <span className="err fs-sm" role="alert">{t.promoErr[promoState.error] || t.promoErr.invalid}</span>}
          </form>
        ))}
      </div>

      <div className="dp-plans-grid">
        {t.plans.map((p) => {
          const featured = p.id === "professional";
          const basePer = branchPrice(sites, p.id, annual);
          const per = promoPrice(basePer, promo);
          const total = sites * per;
          const off = volumeOff(sites, p.id);
          /* Before/after is real: the struck "before" is the same plan on monthly
             billing (annual), or its list price before the promo code (monthly). */
          const monthlyTotal = sites * branchPrice(sites, p.id, false);
          const wasTotal = annual ? monthlyTotal : sites * basePer;
          const showWas = !over && wasTotal > total;
          // Monthly: point at what the same plan costs on annual billing.
          const annualTotal = sites * promoPrice(branchPrice(sites, p.id, true), promo);
          const showAnnualHint = !annual && !over && annualTotal < total;
          return (
            <div key={p.id} className={`dp-plan${featured ? " featured" : ""}`}>
              {featured && <span className="badge fs-xs">{t.popular}</span>}
              <span className="tag fs-xs">{p.tag}</span>
              <b className="name fs-md">{p.name}</b>
              {showWas && (
                <span className="was fs-sm">
                  <s dir="ltr" aria-label={annual ? t.was(fmt(wasTotal)) : undefined}>{fmt(wasTotal)}</s>
                  <em className="fs-xs">{t.yearSave(fmt((wasTotal - total) * 12))}</em>
                </span>
              )}
              <div className={`price${showWas ? " after" : ""}`}>
                {over ? (
                  <b className="fs-kpi">{t.quote}</b>
                ) : (
                  <>
                    <b className="fs-stat" dir="ltr">{fmt(total)}</b>
                    <span className="fs-xs">{t.perMonth}<br />{annual ? t.billedAnnually : t.billedMonthly}</span>
                  </>
                )}
              </div>
              <span className="for fs-sm">
                {over ? t.quoteSub : (
                  <>
                    {t.perBranch(fmt(per))}
                    {off > 0 && <> · <em className="off">{t.volume(Math.round(off * 100))}</em></>}
                    <br />{annual ? <><s className="setup-was">{t.setup(fmt(PRICING.setup))}</s> {t.setupFree}</> : t.setup(fmt(PRICING.setup))}
                    {showAnnualHint && <><br /><button type="button" className="annual-hint" onClick={() => setAnnual(true)}>{t.orAnnual(fmt(annualTotal), fmt((total - annualTotal) * 12))}</button></>}
                  </>
                )}
              </span>
              {/* Higher plans open with "Everything in …" and mark what they ADD with +. */}
              <ul>
                {p.feats.map((f, i) => {
                  const base = p.id !== "essential" && i === 0;
                  const extra = p.id !== "essential" && i > 0;
                  return (
                    <li key={f} className={`fs-sm${base ? " base" : ""}${extra ? " plus" : ""}`}>
                      <i aria-hidden="true">{extra ? "+" : "✓"}</i>{f}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`dp-btn ${featured ? "primary" : "dark"} fs-md`}
                onClick={() => onBook(branchBucket(sites), over ? "" : t.picked(p.name, sites, fmt(total), annual) + (promo ? t.pickedCode(promo.code) : ""))}
              >
                {over ? t.talk : t.choose}
              </button>
            </div>
          );
        })}
      </div>
      <p className="dp-calc-note fs-xs">{t.note}</p>
    </div>
  );
}
