// LoginShowcase.jsx - the marketing side of the login page: an auto-playing
// product tour where every slide carries a small LIVE mock screen (pure
// CSS/SVG, no images) plus a "book a demo" call to action.
import React, { useEffect, useRef, useState } from "react";

const SLIDE_MS = 7000;

/* ------------------------------------------------------------------ copy */
export const SLIDES = {
  en: [
    {
      key: "ccp", short: "HACCP", icon: "🌡️", tag: "HACCP · ISO 22000",
      title: "Critical limits, caught the moment they happen",
      text: "Temperature, CCP and hygiene logs flag a deviation as it is entered — with the corrective action attached.",
      points: ["Auto-flags out-of-range readings", "Verification & sign-off trail", "Audit-ready on any day"],
    },
    {
      key: "trace", short: "Traceability", icon: "🔗", tag: "Traceability",
      title: "From supplier to shelf in one search",
      text: "Every batch keeps its origin, slaughter and expiry dates from receiving through production to the branch.",
      points: ["Lot & item-code binding", "Recall scope in seconds", "Shelf life → expiry, automatically"],
    },
    {
      key: "audit", short: "Audits", icon: "📋", tag: "Inspections & audits",
      title: "Audits that score themselves",
      text: "Branch checklists and internal audits with photo evidence, weighted scores and shareable finding links.",
      points: ["Photo evidence per finding", "Scores & trends per branch", "Secure links for branch follow-up"],
    },
    {
      key: "capa", short: "NCR & CAPA", icon: "🛠️", tag: "NCR & CAPA",
      title: "Every finding closed — with proof",
      text: "Non-conformances move from open to verified with root cause, owner, due date and evidence of closure.",
      points: ["Root cause & owner", "Due dates that chase themselves", "Verified closure evidence"],
    },
    {
      key: "supplier", short: "Suppliers", icon: "🚚", tag: "Supplier control",
      title: "Know which suppliers you can trust",
      text: "Evaluations, self-assessment questionnaires and documents keep your approved supplier list honest.",
      points: ["Online supplier questionnaires", "Pass mark & scoring", "Expiring documents tracked"],
    },
    {
      key: "risk", short: "Training & HSE", icon: "🎓", tag: "Training & HSE",
      title: "Training and safety without the paperwork",
      text: "Staff training with quizzes, risk registers with residual scoring, health records — all in one place.",
      points: ["Quizzes & attendance sheets", "Risk matrix with residual risk", "Medical & health records"],
    },
  ],
  ar: [
    {
      key: "ccp", short: "HACCP", icon: "🌡️", tag: "HACCP · ISO 22000",
      title: "الحدود الحرجة تُكتشف لحظة حدوثها",
      text: "سجلات الحرارة ونقاط التحكم الحرجة والنظافة تنبّه على أي انحراف فور إدخاله — مع الإجراء التصحيحي.",
      points: ["تنبيه تلقائي للقراءات الخارجة عن الحد", "سجل تحقق وتوقيع كامل", "جاهز للتدقيق في أي يوم"],
    },
    {
      key: "trace", short: "التتبع", icon: "🔗", tag: "التتبع",
      title: "من المورّد إلى الرف ببحث واحد",
      text: "كل دفعة تحتفظ بمنشئها وتاريخ ذبحها وانتهائها من الاستلام إلى الإنتاج حتى الفرع.",
      points: ["ربط رقم الدفعة ورمز الصنف", "نطاق الاستدعاء خلال ثوانٍ", "مدة الصلاحية ← تاريخ انتهاء تلقائي"],
    },
    {
      key: "audit", short: "التدقيق", icon: "📋", tag: "التفتيش والتدقيق",
      title: "تدقيقات تحسب نتيجتها بنفسها",
      text: "قوائم تفتيش الفروع والتدقيق الداخلي مع صور الأدلة ونقاط موزونة وروابط مشاركة للملاحظات.",
      points: ["صورة دليل لكل ملاحظة", "نتائج واتجاهات لكل فرع", "روابط آمنة لمتابعة الفرع"],
    },
    {
      key: "capa", short: "عدم المطابقة", icon: "🛠️", tag: "عدم المطابقة والإجراءات التصحيحية",
      title: "كل ملاحظة تُغلق — بالدليل",
      text: "حالات عدم المطابقة تنتقل من مفتوحة إلى متحقَّق منها مع السبب الجذري والمسؤول والموعد ودليل الإغلاق.",
      points: ["السبب الجذري والمسؤول", "مواعيد تتابع نفسها", "دليل إغلاق موثّق"],
    },
    {
      key: "supplier", short: "المورّدون", icon: "🚚", tag: "رقابة المورّدين",
      title: "اعرف أي مورّد تستطيع أن تثق به",
      text: "التقييمات واستبيانات التقييم الذاتي والمستندات تُبقي قائمة المورّدين المعتمدين دقيقة.",
      points: ["استبيانات إلكترونية للمورّدين", "درجة نجاح وتقييم", "متابعة المستندات قبل انتهائها"],
    },
    {
      key: "risk", short: "التدريب والسلامة", icon: "🎓", tag: "التدريب والسلامة",
      title: "تدريب وسلامة بلا أوراق",
      text: "تدريب الموظفين مع اختبارات، سجلات مخاطر مع تقييم المخاطر المتبقية، والسجلات الصحية — في مكان واحد.",
      points: ["اختبارات وكشوف حضور", "مصفوفة مخاطر مع المخاطر المتبقية", "السجلات الطبية والصحية"],
    },
  ],
};

const SCREEN_T = {
  en: {
    ccp: "CCP-2 · Cold storage", ok: "OK", dev: "Deviation", moved: "Product moved · CA raised",
    chA: "Chiller A", chB: "Chiller B", frz: "Freezer 1", chC: "Chiller C", limit: "Limit 5°C",
    lot: "LOT 2610-0427",
    chain: ["Supplier", "Receiving", "Production", "Branch", "Customer"],
    chainSub: ["Approved · 96%", "Slaughter 01/10", "Cutting batch 14", "Branch 01 · Chiller B", "Best before 09/10"],
    score: "Audit score", branch: "Branch 10 · Internal audit",
    checks: ["Personal hygiene", "Temperature control", "Pest control", "Labelling & dates"], minor: "Minor",
    cols: ["Open", "In progress", "Verified"],
    cards: [["NCR-031", "Seal damaged on delivery"], ["CAPA-118", "Chiller C door gasket"], ["NCR-029", "Label missing origin"], ["CAPA-112", "Hand-wash station"]],
    sup: "Supplier scorecard", pass: "Pass 80",
    sups: ["Fresh meat supplier", "Packaging supplier", "Spices supplier", "Cleaning chemicals"],
    risk: "Risk register", likelihood: "Likelihood", impact: "Impact", residual: "Residual",
  },
  ar: {
    ccp: "نقطة تحكم 2 · التخزين البارد", ok: "سليم", dev: "انحراف", moved: "نُقل المنتج · فُتح إجراء",
    chA: "ثلاجة أ", chB: "ثلاجة ب", frz: "فريزر 1", chC: "ثلاجة ج", limit: "الحد 5°م",
    lot: "دفعة 2610-0427",
    chain: ["المورّد", "الاستلام", "الإنتاج", "الفرع", "العميل"],
    chainSub: ["معتمد · 96%", "ذبح 01/10", "دفعة تقطيع 14", "فرع 01 · ثلاجة ب", "يُفضّل قبل 09/10"],
    score: "نتيجة التدقيق", branch: "فرع 10 · تدقيق داخلي",
    checks: ["النظافة الشخصية", "التحكم بالحرارة", "مكافحة الآفات", "الملصقات والتواريخ"], minor: "بسيطة",
    cols: ["مفتوحة", "قيد التنفيذ", "متحقَّق منها"],
    cards: [["NCR-031", "ختم تالف عند التسليم"], ["CAPA-118", "مطاط باب ثلاجة ج"], ["NCR-029", "ملصق بلا منشأ"], ["CAPA-112", "محطة غسل اليدين"]],
    sup: "بطاقة أداء المورّدين", pass: "النجاح 80",
    sups: ["مورّد اللحوم الطازجة", "مورّد التغليف", "مورّد البهارات", "مواد التنظيف"],
    risk: "سجل المخاطر", likelihood: "الاحتمالية", impact: "الأثر", residual: "متبقية",
  },
};

// Floating notifications that pop around the device - the story each slide tells.
const TOASTS = {
  en: {
    ccp: [["!", "bad", "Deviation on Chiller C", "CAPA-118 opened · QA notified"], ["✓", "ok", "Signed by QA", "Verification complete"]],
    trace: [["🔍", "info", "Recall scope: 3 branches", "Found in 0.4 s"], ["✓", "ok", "Expiry set automatically", "Shelf life 8 days"]],
    audit: [["★", "ok", "Branch 10 scored 94 %", "+6 vs last audit"], ["↗", "info", "Findings link sent", "Branch follows up online"]],
    capa: [["✓", "ok", "CAPA-112 verified", "Closed with photo evidence"], ["⏰", "warn", "NCR-031 due tomorrow", "Owner reminded"]],
    supplier: [["!", "warn", "Spices supplier below 80", "Re-evaluation requested"], ["📄", "info", "Halal certificate expires in 14 days", "Supplier e-mailed"]],
    risk: [["↓", "ok", "Residual risk 16 → 4", "Controls approved"], ["🎓", "info", "12 staff passed HACCP quiz", "Attendance sheet ready"]],
  },
  ar: {
    ccp: [["!", "bad", "انحراف في ثلاجة ج", "فُتح CAPA-118 · أُبلغ قسم الجودة"], ["✓", "ok", "وقّعها قسم الجودة", "اكتمل التحقق"]],
    trace: [["🔍", "info", "نطاق الاستدعاء: 3 فروع", "خلال 0.4 ثانية"], ["✓", "ok", "تاريخ الانتهاء تلقائياً", "الصلاحية 8 أيام"]],
    audit: [["★", "ok", "فرع 10 حصل على 94 %", "+6 عن التدقيق السابق"], ["↗", "info", "أُرسل رابط الملاحظات", "الفرع يتابع إلكترونياً"]],
    capa: [["✓", "ok", "تم التحقق من CAPA-112", "أُغلقت بصورة دليل"], ["⏰", "warn", "NCR-031 مستحقة غداً", "تم تذكير المسؤول"]],
    supplier: [["!", "warn", "مورّد البهارات أقل من 80", "طُلب إعادة التقييم"], ["📄", "info", "شهادة الحلال تنتهي خلال 14 يوماً", "أُرسل بريد للمورّد"]],
    risk: [["↓", "ok", "المخاطر المتبقية 16 ← 4", "اعتُمدت الضوابط"], ["🎓", "info", "12 موظفاً اجتازوا اختبار HACCP", "كشف الحضور جاهز"]],
  },
};

// Counts 0 → n once on mount (respects reduced motion).
function useCount(n, ms = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(n); return undefined; }
    let raf; const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(n * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, ms]);
  return v;
}

/* ------------------------------------------------------------- screens */
function ScreenCCP({ t }) {
  const rows = [
    ["08:00", t.chA, "2.1°C", 0],
    ["10:00", t.chB, "3.4°C", 0],
    ["12:00", t.frz, "-19.2°C", 0],
    ["14:00", t.chC, "6.8°C", 1],
  ];
  return (
    <div className="ms ms-ccp">
      <div className="ms-head"><span className="ms-led" />{t.ccp}</div>
      <svg className="ms-spark" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="22" x2="300" y2="22" className="ms-limit" />
        <path className="ms-line" d="M0 52 L40 48 L80 50 L120 44 L160 46 L200 40 L240 34 L270 14 L300 18" />
        <circle cx="270" cy="14" r="5" className="ms-hot" />
      </svg>
      <div className="ms-limit-lbl">{t.limit}</div>
      {rows.map(([time, unit, val, bad], i) => (
        <div key={time} className={`ms-row${bad ? " is-bad" : ""}`} style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
          <span className="ms-time">{time}</span>
          <span className="ms-unit">{unit}</span>
          <b className="ms-val">{val}</b>
          <span className={`ms-chip ${bad ? "bad" : "ok"}`}>{bad ? t.dev : t.ok}</span>
          {bad ? <span className="ms-note">↳ {t.moved}</span> : null}
        </div>
      ))}
    </div>
  );
}

function ScreenTrace({ t }) {
  return (
    <div className="ms ms-trace">
      <div className="ms-head"><span className="ms-led" />{t.lot}</div>
      <div className="ms-chain">
        <span className="ms-runner" />
        {t.chain.map((c, i) => (
          <div key={c} className="ms-node" style={{ animationDelay: `${0.2 + i * 0.16}s` }}>
            <span className="ms-dotnode">{i + 1}</span>
            <span>
              <b>{c}</b>
              <small>{t.chainSub[i]}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenAudit({ t }) {
  const C = 2 * Math.PI * 40;
  const score = useCount(94);
  return (
    <div className="ms ms-audit">
      <div className="ms-head"><span className="ms-led" />{t.branch}</div>
      <div className="ms-audit-body">
        <div className="ms-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="40" className="ms-ring-bg" />
            <circle cx="50" cy="50" r="40" className="ms-ring-fg" style={{ strokeDasharray: C, "--off": C * 0.06, "--c": C }} />
          </svg>
          <div className="ms-ring-num"><b>{score}</b><small>{t.score}</small></div>
        </div>
        <ul className="ms-checks">
          {t.checks.map((c, i) => (
            <li key={c} style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
              <span className={`ms-tick ${i === 2 ? "warn" : ""}`}>{i === 2 ? "!" : "✓"}</span>
              {c}
              {i === 2 ? <em>{t.minor}</em> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScreenCapa({ t }) {
  const place = [[0], [1, 2], [3]];
  return (
    <div className="ms ms-capa">
      {t.cols.map((col, ci) => (
        <div key={col} className={`ms-col c${ci}`}>
          <div className="ms-col-h">{col}<span>{place[ci].length}</span></div>
          {place[ci].map((k, i) => (
            <div key={k} className="ms-card" style={{ animationDelay: `${0.2 + (ci * 2 + i) * 0.14}s` }}>
              <b>{t.cards[k][0]}</b>
              <small>{t.cards[k][1]}</small>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ScreenSupplier({ t }) {
  const scores = [96, 91, 84, 72];
  return (
    <div className="ms ms-sup">
      <div className="ms-head"><span className="ms-led" />{t.sup}<span className="ms-pass">{t.pass}</span></div>
      {t.sups.map((s, i) => (
        <div key={s} className="ms-bar-row" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
          <span className="ms-bar-name">{s}</span>
          <span className="ms-bar"><i className={scores[i] < 80 ? "low" : ""} style={{ "--w": `${scores[i]}%` }} /><span className="ms-pass-line" /></span>
          <b className={scores[i] < 80 ? "low" : ""}>{scores[i]}</b>
        </div>
      ))}
    </div>
  );
}

function ScreenRisk({ t }) {
  const cells = [];
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const s = (5 - r) * (c + 1);
      const lvl = s >= 15 ? "h" : s >= 8 ? "m" : "l";
      cells.push(<span key={`${r}-${c}`} className={`ms-cell ${lvl}`} style={{ animationDelay: `${(r + c) * 0.05}s` }} />);
    }
  }
  return (
    <div className="ms ms-risk">
      <div className="ms-head"><span className="ms-led" />{t.risk}</div>
      <div className="ms-risk-body">
        <div className="ms-grid">
          {cells}
          <span className="ms-pin from" />
          <span className="ms-pin to" />
        </div>
        <div className="ms-risk-legend">
          <span><i className="h" />{t.likelihood} × {t.impact}</span>
          <span className="ms-arrow">16 → 4</span>
          <span><i className="l" />{t.residual}</span>
        </div>
      </div>
    </div>
  );
}

const SCREENS = { ccp: ScreenCCP, trace: ScreenTrace, audit: ScreenAudit, capa: ScreenCapa, supplier: ScreenSupplier, risk: ScreenRisk };

/* ------------------------------------------------------------ showcase */
export default function LoginShowcase({ lang, labels, onDemo }) {
  const slides = SLIDES[lang];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    timer.current = setTimeout(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearTimeout(timer.current);
  }, [idx, paused, slides.length]);

  // 3D tilt following the cursor - CSS vars only.
  const tiltRef = useRef(null);
  const onTilt = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 14}deg`);
    el.style.setProperty("--rx", `${-y * 10}deg`);
  };
  const resetTilt = () => {
    tiltRef.current?.style.removeProperty("--ry");
    tiltRef.current?.style.removeProperty("--rx");
  };

  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);
  const s = slides[idx];
  const Screen = SCREENS[s.key];
  const rtl = lang === "ar";

  return (
    <div
      className="sc"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={labels.tour}
    >
      <div className="sc-stage" key={`${lang}-${s.key}`}>
        <div className="sc-copy">
          <span className="sc-tag">{s.tag}</span>
          <h2 className="sc-title">{s.title}</h2>
          <p className="sc-text">{s.text}</p>
          <ul className="sc-points">
            {s.points.map((p) => (
              <li key={p}><span className="sc-check">✓</span>{p}</li>
            ))}
          </ul>
        </div>
        <div className="sc-device-wrap" ref={tiltRef} onMouseMove={onTilt} onMouseLeave={resetTilt} aria-hidden="true">
          <div className="sc-device">
            <div className="sc-device-bar"><i /><i /><i /><span>inspectpro</span></div>
            <Screen t={SCREEN_T[lang]} />
          </div>
          {TOASTS[lang][s.key].map(([ic, tone, title, sub], i) => (
            <div key={title} className={`sc-toast sc-toast-${i} ${tone}`}>
              <span className="sc-toast-ic">{ic}</span>
              <span><b>{title}</b><small>{sub}</small></span>
            </div>
          ))}
        </div>
      </div>

      <div className="sc-banner" key={`b-${lang}-${s.key}`}>
        <span className="sc-banner-ic" aria-hidden="true">{s.icon}</span>
        <span className="sc-banner-txt">{labels.demoOf} <b>{s.short}</b></span>
        <button type="button" className="sc-cta" onClick={() => onDemo(s.key)}>
          {labels.seeIt}
          <span className="sc-cta-arrow" aria-hidden="true">{rtl ? "←" : "→"}</span>
        </button>
      </div>

      <div className="sc-nav">
        <button type="button" className="sc-arrow" onClick={() => go(rtl ? 1 : -1)} aria-label={labels.prev}>‹</button>
        <div className="sc-tabs" role="tablist">
          {slides.map((sl, i) => (
            <button
              key={sl.key}
              type="button"
              role="tab"
              aria-selected={i === idx}
              title={sl.tag}
              className={`sc-tab${i === idx ? " on" : ""}${i < idx ? " done" : ""}`}
              onClick={() => setIdx(i)}
            >
              <span className="sc-tab-ic" aria-hidden="true">{sl.icon}</span>
              <span className="sc-tab-l">{sl.short}</span>
              <i className="sc-tab-bar"
                key={i === idx ? `run-${idx}` : "idle"}
                style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
              />
            </button>
          ))}
        </div>
        <button type="button" className="sc-arrow" onClick={() => go(rtl ? -1 : 1)} aria-label={labels.next}>›</button>
      </div>
    </div>
  );
}

// Scoped under `.lp.lp` (doubled class) to out-rank globals.css' forced 14px.
export const SC_CSS = `
#root .lp.lp .sc { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; }
#root .lp.lp .sc-stage {
  display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.1fr); gap: clamp(24px, 3vw, 48px); align-items: center;
  min-height: 400px;
}
#root .lp.lp .sc-copy > * { animation: sc-in .7s cubic-bezier(.2,.7,.2,1) both; }
#root .lp.lp .sc-copy > *:nth-child(2) { animation-delay: .06s; }
#root .lp.lp .sc-copy > *:nth-child(3) { animation-delay: .12s; }
#root .lp.lp .sc-copy > *:nth-child(4) { animation-delay: .18s; }
#root .lp.lp .sc-copy > *:nth-child(5) { animation-delay: .24s; }
#root .lp.lp .sc-tag {
  display: inline-flex; padding: 6px 12px; border-radius: 999px;
  background: rgba(94,234,212,.12); border: 1px solid rgba(94,234,212,.35); color: #5eead4;
  font-weight: 700; letter-spacing: .06em; font-size: calc(14px * var(--app-fs, 1)) !important; padding: 7px 14px;
}
#root .lp.lp .sc-title {
  margin: 14px 0 0; color: #fff; font-weight: 800; line-height: 1.18; letter-spacing: -.01em;
  font-size: calc(clamp(26px, 2.3vw, 38px) * var(--app-fs, 1)) !important;
}
#root .lp.lp .sc-text { margin: 12px 0 0; color: #b6c6dd; line-height: 1.6; font-size: calc(clamp(16px, 1.15vw, 19px) * var(--app-fs, 1)) !important; }
#root .lp.lp .sc-points { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 11px; }
#root .lp.lp .sc-points li { display: flex; align-items: center; gap: 12px; color: #e2ebf7; font-weight: 600; font-size: calc(clamp(15.5px, 1.1vw, 18px) * var(--app-fs, 1)) !important; }
#root .lp.lp .sc-check {
  width: 24px; height: 24px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center;
  background: linear-gradient(135deg, #14b8a6, #0ea5a4); color: #fff; font-weight: 900;
  font-size: calc(13px * var(--app-fs, 1)) !important;
}
#root .lp.lp .sc-cta {
  margin-top: 20px; display: inline-flex; align-items: center; gap: 10px;
  min-height: 50px; padding: 0 22px; border-radius: 12px; cursor: pointer; font-size: calc(16px * var(--app-fs, 1)) !important;
  border: 1px solid rgba(94,234,212,.5); background: rgba(14,165,164,.16); color: #ecfeff;
  font-family: inherit; font-weight: 800; transition: background .2s, transform .2s, box-shadow .2s;
}
#root .lp.lp .sc-cta:hover { background: #0EA5A4; transform: translateY(-2px); box-shadow: 0 12px 28px rgba(14,165,164,.35); }
#root .lp.lp .sc-cta-arrow { transition: transform .2s; }
#root .lp.lp .sc-cta:hover .sc-cta-arrow { transform: translateX(4px); }
#root .lp.lp[dir="rtl"] .sc-cta:hover .sc-cta-arrow { transform: translateX(-4px); }

/* ---- device frame ---- */
#root .lp.lp .sc-device {
  position: relative; border-radius: 16px; overflow: hidden;
  background: rgba(255,255,255,.97); color: #0f172a;
  box-shadow: 0 40px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.18), 0 0 60px rgba(14,165,164,.25);
  transform: perspective(1200px) rotateY(var(--ry, -8deg)) rotateX(var(--rx, 3deg));
  transition: transform .25s ease-out;
  animation: sc-float 7s ease-in-out infinite, sc-pop .8s cubic-bezier(.2,.7,.2,1) both;
}
#root .lp.lp[dir="rtl"] .sc-device { transform: perspective(1200px) rotateY(var(--ry, 8deg)) rotateX(var(--rx, 3deg)); }
#root .lp.lp .sc-device-wrap { position: relative; padding: 22px 0 30px; }
#root .lp.lp .sc-toast {
  position: absolute; z-index: 3; display: flex; align-items: center; gap: 10px;
  max-width: 320px; padding: 12px 16px 12px 12px; border-radius: 16px;
  background: rgba(255,255,255,.96); color: #0f172a; backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.6);
  opacity: 0; animation: sc-toast .6s cubic-bezier(.2,.9,.3,1.3) forwards, sc-float 6s 1s ease-in-out infinite;
}
#root .lp.lp .sc-toast-0 { top: -4px; inset-inline-end: -22px; animation-delay: 1.4s, 2s; }
#root .lp.lp .sc-toast-1 { bottom: 0; inset-inline-start: -30px; animation-delay: 2.6s, 3.2s; }
#root .lp.lp .sc-toast b { display: block; font-weight: 800; font-size: calc(15px * var(--app-fs, 1)) !important; line-height: 1.3; }
#root .lp.lp .sc-toast small { display: block; color: #64748b; font-weight: 600; font-size: calc(13px * var(--app-fs, 1)) !important; }
#root .lp.lp .sc-toast-ic {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 11px; display: grid; place-items: center;
  color: #fff; font-weight: 900; font-size: calc(17px * var(--app-fs, 1)) !important;
}
#root .lp.lp .sc-toast.ok .sc-toast-ic { background: linear-gradient(135deg, #10b981, #059669); }
#root .lp.lp .sc-toast.bad .sc-toast-ic { background: linear-gradient(135deg, #f87171, #dc2626); box-shadow: 0 0 0 0 rgba(239,68,68,.6); animation: sc-ping 1.6s 2s infinite; }
#root .lp.lp .sc-toast.warn .sc-toast-ic { background: linear-gradient(135deg, #fbbf24, #d97706); }
#root .lp.lp .sc-toast.info .sc-toast-ic { background: linear-gradient(135deg, #38bdf8, #0284c7); }
#root .lp.lp .sc-device-bar {
  display: flex; align-items: center; gap: 6px; padding: 9px 12px; background: #eef2f7; border-bottom: 1px solid #e2e8f0;
}
#root .lp.lp .sc-device-bar i { width: 9px; height: 9px; border-radius: 50%; background: #f87171; }
#root .lp.lp .sc-device-bar i:nth-child(2) { background: #fbbf24; }
#root .lp.lp .sc-device-bar i:nth-child(3) { background: #34d399; }
#root .lp.lp .sc-device-bar span {
  margin-inline-start: 10px; flex: 1; padding: 3px 10px; border-radius: 6px; background: #fff; color: #94a3b8;
  font-size: calc(10.5px * var(--app-fs, 1)) !important; font-weight: 600;
}

/* ---- nav ---- */
#root .lp.lp .sc-nav { display: flex; align-items: center; gap: 12px; }
#root .lp.lp .sc-arrow {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
  border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color: #fff;
  font-size: calc(20px * var(--app-fs, 1)) !important; line-height: 1; transition: background .2s;
}
#root .lp.lp .sc-arrow:hover { background: rgba(255,255,255,.16); }
#root .lp.lp .sc-tabs {
  flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 4px; padding: 5px; border-radius: 16px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(8px);
}
#root .lp.lp .sc-tabs::-webkit-scrollbar { display: none; }
#root .lp.lp .sc-tab {
  position: relative; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 50px; padding: 0 14px; border: 0; border-radius: 12px; overflow: hidden; cursor: pointer;
  background: transparent; color: #a9bad3; font-family: inherit; font-weight: 700; white-space: nowrap;
  transition: background .2s, color .2s;
}
#root .lp.lp .sc-tab:hover { color: #fff; background: rgba(255,255,255,.06); }
#root .lp.lp .sc-tab.on { color: #0B1E3F; background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,.25); }
#root .lp.lp .sc-tab-l { font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .lp.lp .sc-tab-ic { font-size: calc(18px * var(--app-fs, 1)) !important; line-height: 1; }
#root .lp.lp .sc-tab-bar { position: absolute; left: 10px; right: 10px; bottom: 4px; height: 3px; border-radius: 3px; transform-origin: left; transform: scaleX(0); background: linear-gradient(90deg, #0EA5A4, #22d3ee); }
#root .lp.lp[dir="rtl"] .sc-tab-bar { transform-origin: right; }
#root .lp.lp .sc-tab.on .sc-tab-bar { animation-name: sc-progress; animation-timing-function: linear; animation-fill-mode: forwards; }

#root .lp.lp .sc-banner {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 12px 12px 18px; border-radius: 18px; animation: sc-in .6s .2s cubic-bezier(.2,.7,.2,1) both;
  background: linear-gradient(90deg, rgba(14,165,164,.32), rgba(56,189,248,.18)); border: 1px solid rgba(94,234,212,.35);
}
#root .lp.lp[dir="rtl"] .sc-banner { padding: 10px 16px 10px 10px; }
#root .lp.lp .sc-banner-ic { font-size: calc(24px * var(--app-fs, 1)) !important; line-height: 1; }
#root .lp.lp .sc-banner-txt { flex: 1; min-width: 180px; color: #e2f7f5; font-weight: 600; font-size: calc(17px * var(--app-fs, 1)) !important; }
#root .lp.lp .sc-banner-txt b { color: #fff; font-weight: 800; }
#root .lp.lp .sc-banner .sc-cta { margin-top: 0; background: #fff; color: #0B1E3F; border-color: #fff; }
#root .lp.lp .sc-banner .sc-cta:hover { background: #0EA5A4; color: #fff; border-color: #0EA5A4; }

/* ---- mini screens ---- */
#root .lp.lp .ms { --ms: 1.18; padding: 16px; display: grid; gap: 9px; min-height: 250px; align-content: start; }
@media (max-width: 1500px) { #root .lp.lp .ms { --ms: 1; } }
@media (max-width: 640px) { #root .lp.lp .ms { --ms: 1; } }
#root .lp.lp .ms small, #root .lp.lp .ms em { font-size: calc(10.5px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-head {
  display: flex; align-items: center; gap: 8px; color: #0B1E3F; font-weight: 800;
  font-size: calc(12.5px * var(--app-fs, 1) * var(--ms, 1)) !important;
}
#root .lp.lp .ms-led { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.2); animation: lp-pulse 1.6s infinite; }
#root .lp.lp .ms-row, #root .lp.lp .ms-node, #root .lp.lp .ms-checks li, #root .lp.lp .ms-card, #root .lp.lp .ms-bar-row {
  animation: sc-in .55s cubic-bezier(.2,.7,.2,1) both;
}
/* ccp */
#root .lp.lp .ms-spark { width: 100%; height: 56px; }
#root .lp.lp .ms-limit { stroke: #ef4444; stroke-width: 1.5; stroke-dasharray: 5 5; opacity: .7; }
#root .lp.lp .ms-line { fill: none; stroke: #0EA5A4; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 420; stroke-dashoffset: 420; animation: sc-draw 1.6s .2s ease forwards; }
#root .lp.lp .ms-hot { fill: #ef4444; animation: sc-blink 1s 1.6s infinite; opacity: 0; }
#root .lp.lp .ms-limit-lbl { margin-top: -10px; text-align: end; color: #ef4444; font-weight: 700; font-size: calc(10px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-row {
  display: grid; grid-template-columns: 42px 1fr auto auto; gap: 8px; align-items: center;
  padding: 7px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #edf2f7;
  font-size: calc(11.5px * var(--app-fs, 1) * var(--ms, 1)) !important;
}
#root .lp.lp .ms-row * { font-size: calc(11.5px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-row.is-bad { background: #fef2f2; border-color: #fecaca; }
#root .lp.lp .ms-time { color: #94a3b8; font-weight: 700; }
#root .lp.lp .ms-unit { color: #334155; font-weight: 600; }
#root .lp.lp .ms-val { color: #0f172a; font-variant-numeric: tabular-nums; }
#root .lp.lp .ms-chip { padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: calc(10px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-chip.ok { background: #dcfce7; color: #166534; }
#root .lp.lp .ms-chip.bad { background: #ef4444; color: #fff; }
#root .lp.lp .ms-note { grid-column: 2 / -1; color: #b91c1c; font-weight: 700; font-size: calc(10.5px * var(--app-fs, 1) * var(--ms, 1)) !important; }
/* trace */
#root .lp.lp .ms-chain { position: relative; display: grid; gap: 8px; padding-inline-start: 4px; }
#root .lp.lp .ms-chain::before { content: ""; position: absolute; inset-inline-start: 17px; top: 14px; bottom: 14px; width: 2px; background: linear-gradient(#0EA5A4, #0B1E3F); opacity: .3; }
#root .lp.lp .ms-runner { position: absolute; inset-inline-start: 13px; top: 10px; width: 10px; height: 10px; border-radius: 50%; background: #0EA5A4; box-shadow: 0 0 0 5px rgba(14,165,164,.2); animation: sc-run 3.2s .6s ease-in-out infinite; z-index: 2; }
#root .lp.lp .ms-node { position: relative; display: flex; align-items: center; gap: 10px; }
#root .lp.lp .ms-dotnode {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; z-index: 1;
  background: #fff; border: 2px solid #0EA5A4; color: #0f766e; font-weight: 800; font-size: calc(11px * var(--app-fs, 1) * var(--ms, 1)) !important;
}
#root .lp.lp .ms-node b { display: block; color: #0B1E3F; font-size: calc(12px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-node small { display: block; color: #64748b; font-weight: 600; }
/* audit */
#root .lp.lp .ms-audit-body { display: grid; grid-template-columns: 110px 1fr; gap: 14px; align-items: center; }
#root .lp.lp .ms-ring { position: relative; width: 110px; height: 110px; }
#root .lp.lp .ms-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
#root .lp.lp .ms-ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 10; }
#root .lp.lp .ms-ring-fg { fill: none; stroke: #0EA5A4; stroke-width: 10; stroke-linecap: round; stroke-dashoffset: var(--c); animation: sc-ring 1.4s .2s cubic-bezier(.2,.7,.2,1) forwards; }
#root .lp.lp .ms-ring-num { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
#root .lp.lp .ms-ring-num b { color: #0B1E3F; font-weight: 900; font-size: calc(28px * var(--app-fs, 1) * var(--ms, 1)) !important; line-height: 1; }
#root .lp.lp .ms-ring-num small { color: #64748b; font-weight: 700; }
#root .lp.lp .ms-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
#root .lp.lp .ms-checks li { display: flex; align-items: center; gap: 8px; color: #334155; font-weight: 600; font-size: calc(12px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-checks em { margin-inline-start: auto; font-style: normal; padding: 1px 7px; border-radius: 999px; background: #fef3c7; color: #92400e; font-weight: 800; }
#root .lp.lp .ms-tick { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: #dcfce7; color: #166534; font-weight: 900; font-size: calc(10px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-tick.warn { background: #fef3c7; color: #b45309; }
/* capa */
#root .lp.lp .ms-capa { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
#root .lp.lp .ms-col { background: #f1f5f9; border-radius: 10px; padding: 8px; display: grid; gap: 6px; align-content: start; min-height: 200px; }
#root .lp.lp .ms-col-h { display: flex; justify-content: space-between; color: #334155; font-weight: 800; font-size: calc(11px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-col-h span { min-width: 18px; text-align: center; border-radius: 999px; background: #fff; font-size: calc(10px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-card { background: #fff; border-radius: 8px; padding: 7px; box-shadow: 0 2px 6px rgba(15,23,42,.08); border-inline-start: 3px solid #ef4444; }
#root .lp.lp .c1 .ms-card { border-color: #f59e0b; }
#root .lp.lp .c2 .ms-card { border-color: #10b981; }
#root .lp.lp .ms-card b { display: block; color: #0B1E3F; font-size: calc(11px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-card small { display: block; color: #64748b; line-height: 1.35; font-weight: 600; }
/* supplier */
#root .lp.lp .ms-pass { margin-inline-start: auto; padding: 2px 8px; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: calc(10px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-bar-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) 28px; gap: 10px; align-items: center; padding: 6px 0; }
#root .lp.lp .ms-bar-name { color: #334155; font-weight: 600; font-size: calc(11.5px * var(--app-fs, 1) * var(--ms, 1)) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#root .lp.lp .ms-bar { position: relative; height: 9px; border-radius: 9px; background: #e2e8f0; overflow: visible; }
#root .lp.lp .ms-bar i { position: absolute; inset-block: 0; inset-inline-start: 0; width: 0; border-radius: inherit; background: linear-gradient(90deg, #14b8a6, #0EA5A4); animation: sc-grow 1.1s .3s cubic-bezier(.2,.7,.2,1) forwards; }
#root .lp.lp .ms-bar i.low { background: linear-gradient(90deg, #f97316, #ef4444); }
#root .lp.lp .ms-pass-line { position: absolute; inset-inline-start: 80%; top: -4px; bottom: -4px; width: 2px; background: #0B1E3F; opacity: .35; }
#root .lp.lp .ms-bar-row b { color: #0f766e; text-align: end; font-size: calc(12px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-bar-row b.low { color: #dc2626; }
/* risk */
#root .lp.lp .ms-risk-body { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: center; }
#root .lp.lp .ms-grid { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
#root .lp.lp .ms-cell { aspect-ratio: 1; border-radius: 4px; animation: sc-pop .5s both; }
#root .lp.lp .ms-cell.l { background: #bbf7d0; }
#root .lp.lp .ms-cell.m { background: #fde68a; }
#root .lp.lp .ms-cell.h { background: #fca5a5; }
#root .lp.lp .ms-pin { position: absolute; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
#root .lp.lp .ms-pin.from { background: #dc2626; left: 66%; top: 6%; }
#root .lp.lp .ms-pin.to { background: #16a34a; left: 6%; top: 66%; opacity: 0; animation: sc-move 1.4s 1s cubic-bezier(.2,.7,.2,1) forwards; }
#root .lp.lp .ms-risk-legend { display: grid; gap: 10px; color: #334155; font-weight: 700; font-size: calc(11.5px * var(--app-fs, 1) * var(--ms, 1)) !important; }
#root .lp.lp .ms-risk-legend span { display: flex; align-items: center; gap: 8px; font-size: inherit !important; }
#root .lp.lp .ms-risk-legend i { width: 12px; height: 12px; border-radius: 3px; }
#root .lp.lp .ms-risk-legend i.h { background: #fca5a5; }
#root .lp.lp .ms-risk-legend i.l { background: #bbf7d0; }
#root .lp.lp .ms-arrow { color: #0f766e; font-weight: 900; font-size: calc(20px * var(--app-fs, 1) * var(--ms, 1)) !important; }

@keyframes sc-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes sc-pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; } }
@keyframes sc-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -10px; } }
@keyframes sc-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes sc-draw { to { stroke-dashoffset: 0; } }
@keyframes sc-blink { 0%, 100% { opacity: 1; r: 5; } 50% { opacity: .4; r: 8; } }
@keyframes sc-run { 0% { top: 10px; } 85%, 100% { top: calc(100% - 22px); } }
@keyframes sc-ring { to { stroke-dashoffset: var(--off); } }
@keyframes sc-toast { from { opacity: 0; transform: translateY(14px) scale(.85); } to { opacity: 1; transform: none; } }
@keyframes sc-ping { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.55); } 100% { box-shadow: 0 0 0 14px rgba(239,68,68,0); } }
@keyframes sc-grow { to { width: var(--w); } }
@keyframes sc-move { 0% { opacity: 0; left: 66%; top: 6%; } 30% { opacity: 1; } 100% { opacity: 1; left: 6%; top: 66%; } }

@media (max-width: 1180px) {
  #root .lp.lp .sc-stage { grid-template-columns: 1fr; min-height: 0; }
  #root .lp.lp .sc-device-wrap { max-width: 460px; }
}
@media (max-width: 640px) {
  #root .lp.lp .sc-toast { position: relative; inset: auto; margin-top: 10px; max-width: none; }
  #root .lp.lp .sc-device-wrap { padding: 0; }
}
`;
