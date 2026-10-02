// src/pages/DemoValue.jsx
// Two selling blocks for the public /demo page (styles: DemoRequest.css, .dp-cmp / .dp-calc):
//  • PaperVsTable     — paper logs vs InspectPro, row by row.
//  • SavingsCalculator — the visitor sets their branch count and sees what paper
//    costs them against the subscription, plus the founding-customer offer and
//    what every subscription includes.
// Prices and savings assumptions live in PRICING / SAVINGS below. They are
// estimates for a sales page; the written quote after the demo is what binds.

import React, { useState } from "react";

/* Per branch, per month, AED. Essential covers 1–2 branches, Professional
   3 or more; annual billing is about two months free. A volume discount
   applies to the whole account: 6–15 branches −15 %, 16–25 −25 %. */
export const PRICING = {
  essential: { monthly: 249, annual: 199, maxSites: 2 },
  professional: { monthly: 399, annual: 329, minSites: 3 },
  volume: [
    { from: 16, off: 0.25 },
    { from: 6, off: 0.15 },
  ],
  maxSites: 25,                 // above this: custom quote (Enterprise)
};

export const planFor = (sites) => (sites <= PRICING.essential.maxSites ? "essential" : "professional");

/** Monthly subscription in AED, billed annually. */
export function monthlyPrice(sites) {
  const plan = PRICING[planFor(sites)];
  const off = PRICING.volume.find((v) => sites >= v.from)?.off || 0;
  return Math.round(sites * plan.annual * (1 - off));
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
    planName: { essential: "Essential", professional: "Professional" },
    net: (n) => `You keep AED ${n} a month`,
    roi: (x) => `The system returns ${x}× its cost`,
    custom: "More than 25 branches? We prepare a custom quote.",
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
    planName: { essential: "الأساسية", professional: "الاحترافية" },
    net: (n) => `يبقى لك ${n} درهم شهريًا`,
    roi: (x) => `يعيد النظام تكلفته ${x} مرة`,
    custom: "أكثر من 25 فرعًا؟ نعدّ لك عرض سعر خاصًا.",
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

/* ───────── Plans — the three packages, monthly ↔ annual ───────── */
const PLANS_T = {
  en: {
    monthly: "Monthly",
    annual: "Annual",
    save: "2 months free",
    perBranch: "AED / branch / month",
    billedAnnually: "billed annually",
    billedMonthly: "billed monthly",
    popular: "Most popular",
    quote: "Custom quote",
    choose: "Book a demo",
    talk: "Talk to us",
    note: "Prices exclude VAT where it applies. A central kitchen, warehouse or factory counts as a branch. 6–15 branches −15 %, 16 or more −25 %.",
    plans: [
      {
        id: "essential", name: "Essential", for: "For 1–2 branches",
        feats: ["All daily food-safety logs for your business type", "Limits checked as you type, corrective actions", "OHC cards and training certificates, with expiry alerts", "Excel & PDF exports, works offline", "Arabic & English · unlimited users"],
      },
      {
        id: "professional", name: "Professional", for: "For 3 branches or more",
        feats: ["Everything in Essential", "Your own forms set up for you", "Every branch live on one screen", "Team training at your site", "Priority support"],
      },
      {
        id: "enterprise", name: "Enterprise", for: "Factories & large chains",
        feats: ["The full quality system: production & yield, traceability, suppliers, audits, training", "A system built around your operation", "Dedicated onboarding"],
      },
    ],
  },
  ar: {
    monthly: "شهري",
    annual: "سنوي",
    save: "شهران مجانًا",
    perBranch: "درهم / فرع / شهريًا",
    billedAnnually: "بالدفع السنوي",
    billedMonthly: "بالدفع الشهري",
    popular: "الأكثر طلبًا",
    quote: "عرض سعر خاص",
    choose: "احجز عرضًا",
    talk: "تواصل معنا",
    note: "الأسعار لا تشمل ضريبة القيمة المضافة حيث تنطبق. المطبخ المركزي أو المستودع أو المصنع يُحتسب فرعًا. من 6 إلى 15 فرعًا خصم 15%، و16 فرعًا فأكثر خصم 25%.",
    plans: [
      {
        id: "essential", name: "الأساسية", for: "لفرع أو فرعين",
        feats: ["جميع سجلات سلامة الغذاء اليومية لنوع نشاطك", "فحص الحدود لحظة الإدخال مع الإجراءات التصحيحية", "البطاقات الصحية وشهادات التدريب مع تنبيه قبل الانتهاء", "تصدير Excel وPDF، ويعمل دون إنترنت", "عربي وإنجليزي · مستخدمون بلا حدود"],
      },
      {
        id: "professional", name: "الاحترافية", for: "لـ3 فروع فأكثر",
        feats: ["كل ما في الأساسية", "نجهّز نماذجك الخاصة لك", "جميع الفروع مباشرةً على شاشة واحدة", "تدريب فريقك في موقعك", "دعم بأولوية"],
      },
      {
        id: "enterprise", name: "المؤسسات", for: "المصانع والسلاسل الكبيرة",
        feats: ["نظام الجودة الكامل: الإنتاج والمردود، التتبّع، الموردون، التدقيق، التدريب", "نظام مبني حول عملياتك", "تهيئة مخصصة"],
      },
    ],
  },
};

export function PricingPlans({ lang, onBook }) {
  const t = PLANS_T[lang];
  const [annual, setAnnual] = useState(true);
  return (
    <div className="dp-plans">
      <div className="dp-plans-toggle" role="group">
        <button type="button" className={`fs-sm${!annual ? " on" : ""}`} aria-pressed={!annual} onClick={() => setAnnual(false)}>{t.monthly}</button>
        <button type="button" className={`fs-sm${annual ? " on" : ""}`} aria-pressed={annual} onClick={() => setAnnual(true)}>
          {t.annual} <em className="fs-xs">{t.save}</em>
        </button>
      </div>
      <div className="dp-plans-grid">
        {t.plans.map((p) => {
          const price = PRICING[p.id];
          const featured = p.id === "professional";
          return (
            <div key={p.id} className={`dp-plan${featured ? " featured" : ""}`}>
              {featured && <span className="badge fs-xs">{t.popular}</span>}
              <b className="name fs-md">{p.name}</b>
              <span className="for fs-sm">{p.for}</span>
              <div className="price">
                {price ? (
                  <>
                    <b className="fs-stat" dir="ltr">{annual ? price.annual : price.monthly}</b>
                    <span className="fs-xs">{t.perBranch}<br />{annual ? t.billedAnnually : t.billedMonthly}</span>
                  </>
                ) : (
                  <b className="fs-kpi">{t.quote}</b>
                )}
              </div>
              <ul>
                {p.feats.map((f) => <li key={f} className="fs-sm"><i aria-hidden="true">✓</i>{f}</li>)}
              </ul>
              <button
                type="button"
                className={`dp-btn ${featured ? "primary" : "dark"} fs-md`}
                onClick={() => onBook(p.id === "essential" ? "1" : p.id === "professional" ? "2-5" : "20+")}
              >
                {price ? t.choose : t.talk}
              </button>
            </div>
          );
        })}
      </div>
      <p className="dp-calc-note fs-xs">{t.note}</p>
    </div>
  );
}
