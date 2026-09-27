// src/pages/readiness/ReadinessCheck.jsx
// Public "How ready is your company for an inspection?" check (/readiness) —
// no login. Ten questions, one per screen; the score and level show at once,
// the full report (every area + how to close each gap) opens once the visitor
// leaves a name and number, which lands in Platform Center → Demo Requests with
// the score and answers attached.
//
// Server: POST /api/demo-requests (+ quizScore, quizAnswers),
// POST /api/demo-requests/quiz-event (start / done funnel counts),
// GET /api/demo-config (WhatsApp number). `?src=` is kept like on /demo.

import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config/api";
import { DEMO_BRANCHES, WaIcon, usePublicFonts } from "../DemoRequest";
import { BrandLockup } from "./brand";
import { READINESS_QUESTIONS, levelOf, scoreAnswers } from "./readinessQuestions";
import { BeforeAfter, OfferBanner, PROMO_CSS, ReferralNote, StoryCard, useDemoConfig } from "./promoBlocks";

const TXT = {
  en: {
    eyebrow: "InspectPro QMS",
    introTitle: "How ready is your company for a food-safety inspection?",
    introSub: "10 quick questions, about 2 minutes. You get a score out of 100 and the weak points an inspector would find first.",
    introPoints: ["Temperature records, traceability, suppliers, training and more", "Your score straight away — no sign-up", "A full report with how to close each gap"],
    start: "Start the check",
    qOf: (i, n) => `Question ${i} of ${n}`,
    back: "Back",
    yourScore: "Your readiness score",
    gapsCount: (n) => (n ? `${n} of 10 areas need work` : "No gaps found — well done"),
    weakest: "Your weakest area",
    lockedTitle: "Get your full report",
    lockedSub: "See every area, what an inspector would notice, and how to close each gap. We will also offer you a free demo.",
    company: "Company name",
    contact: "Your name",
    phone: "Mobile / WhatsApp",
    email: "E-mail (optional)",
    branches: "Number of branches",
    pick: "Select…",
    unlock: "Show my full report",
    sending: "Sending…",
    required: "Please fill in the company name, your name and a phone number.",
    badPhone: "Please enter a valid phone number.",
    badEmail: "That e-mail address does not look right.",
    failed: "We could not send it. Please try again.",
    tooMany: "Too many requests from this device. Please try again later.",
    privacy: "We use these details only to send your report and contact you about a demo.",
    reportTitle: "Your full report",
    reportSub: "Thank you — we will contact you within one working day.",
    yourAnswer: "Your answer",
    howFix: "How InspectPro closes it",
    full: "Full marks",
    print: "Save / print report",
    whatsapp: "Talk to us on WhatsApp",
    demo: "Book a free demo",
    share: "Share this check",
    copied: "Link copied",
    retake: "Retake the check",
    disclaimer: "An indicative self-check for internal use — not an official assessment by any authority.",
    haveAccount: "Already a customer?",
    signIn: "Sign in",
    lang: "العربية",
  },
  ar: {
    eyebrow: "InspectPro QMS",
    introTitle: "ما مدى جاهزية شركتك لتفتيش سلامة الغذاء؟",
    introSub: "عشرة أسئلة سريعة تستغرق نحو دقيقتين، تحصل بعدها على درجة من 100، وعلى نقاط الضعف التي سيلاحظها المفتش أولًا.",
    introPoints: ["سجلات الحرارة، والتتبّع، والموردون، والتدريب، وغيرها", "تظهر درجتك فورًا — دون تسجيل", "تقرير كامل يوضّح كيفية معالجة كل ثغرة"],
    start: "ابدأ الفحص",
    qOf: (i, n) => `السؤال ${i} من ${n}`,
    back: "السابق",
    yourScore: "درجة الجاهزية",
    gapsCount: (n) => (!n ? "لا توجد ثغرات — أحسنت" : n === 1 ? "جانب واحد من 10 يحتاج إلى تحسين" : n === 2 ? "جانبان من 10 يحتاجان إلى تحسين" : `${n} جوانب من 10 تحتاج إلى تحسين`),
    weakest: "أضعف جانب لديك",
    lockedTitle: "احصل على تقريرك الكامل",
    lockedSub: "اطّلع على كل جانب، وعلى ما قد يلاحظه المفتش، وعلى كيفية معالجة كل ثغرة. وسنعرض عليك كذلك عرضًا تجريبيًا مجانيًا.",
    company: "اسم الشركة",
    contact: "الاسم",
    phone: "رقم الجوال / واتساب",
    email: "البريد الإلكتروني (اختياري)",
    branches: "عدد الفروع",
    pick: "اختر…",
    unlock: "اعرض تقريري الكامل",
    sending: "جارٍ الإرسال…",
    required: "يُرجى إدخال اسم الشركة واسمك ورقم الجوال.",
    badPhone: "يُرجى إدخال رقم جوال صحيح.",
    badEmail: "البريد الإلكتروني غير صحيح.",
    failed: "تعذّر الإرسال. يُرجى المحاولة مرة أخرى.",
    tooMany: "تم إرسال طلبات كثيرة من هذا الجهاز. يُرجى المحاولة لاحقًا.",
    privacy: "نستخدم هذه البيانات فقط لإرسال تقريرك والتواصل معك بشأن العرض.",
    reportTitle: "تقريرك الكامل",
    reportSub: "شكرًا لك — سنتواصل معك خلال يوم عمل واحد.",
    yourAnswer: "إجابتك",
    howFix: "كيف يعالجها InspectPro",
    full: "درجة كاملة",
    print: "حفظ / طباعة التقرير",
    whatsapp: "تواصل معنا عبر واتساب",
    demo: "احجز عرضًا تجريبيًا مجانيًا",
    share: "شارك الفحص",
    copied: "تم نسخ الرابط",
    retake: "أعد الفحص",
    disclaimer: "فحص ذاتي تقريبي للاستخدام الداخلي — وليس تقييمًا رسميًا صادرًا عن أي جهة رقابية.",
    haveAccount: "لديك حساب؟",
    signIn: "تسجيل الدخول",
    lang: "English",
  },
};

const N = READINESS_QUESTIONS.length;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const phoneDigits = (s) => String(s || "").replace(/\D/g, "");
const EMPTY = { companyName: "", contactName: "", phone: "", email: "", branches: "", website: "" };

export default function ReadinessCheck() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [lang, setLang] = useState(() => {
    const q = params.get("lang");
    if (q === "ar" || q === "en") return q;
    try { return String(navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en"; } catch { return "en"; }
  });
  const t = TXT[lang];
  const isAr = lang === "ar";
  const source = useMemo(() => (params.get("src") || params.get("utm_source") || "").slice(0, 60), [params]);

  const [step, setStep] = useState(-1); // -1 intro, 0..N-1 questions, N result
  const [answers, setAnswers] = useState({});
  const [unlocked, setUnlocked] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const sent = useRef({});
  usePublicFonts();

  const { rows, score, gaps } = useMemo(() => scoreAnswers(answers), [answers]);
  const level = levelOf(score);

  const cfg = useDemoConfig();
  const waNumber = cfg.whatsapp;

  // Funnel counts: once per page load each, and never in the way of the visitor.
  const track = (event) => {
    if (sent.current[event]) return;
    sent.current[event] = true;
    try {
      fetch(`${API_BASE}/api/demo-requests/quiz-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, source }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* counting is best-effort */ }
  };

  const begin = () => { track("start"); setStep(0); };
  const moving = useRef(false);
  const choose = (qid, idx) => {
    if (moving.current) return; // a double tap must not skip a question
    moving.current = true;
    setAnswers((a) => ({ ...a, [qid]: idx }));
    const next = step + 1;
    // A short beat so the tap registers visually before the next question.
    setTimeout(() => {
      if (next >= N) { track("done"); window.scrollTo(0, 0); }
      setStep(next);
      moving.current = false;
    }, 220);
  };
  const retake = () => { setAnswers({}); setUnlocked(false); setStep(0); window.scrollTo(0, 0); };

  const summaryText = () => {
    const lines = gaps.map((g) => `- ${g.q.area.en}: ${g.opt.en} (${g.pts}/10)`);
    return `Readiness check: ${score}/100 (${level.en}).${lines.length ? `\nGaps:\n${lines.join("\n")}` : ""}`;
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
          message: summaryText(),
          source: source || "readiness",
          referrer: (typeof document !== "undefined" && document.referrer) || "",
          lang,
          quizScore: score,
          quizAnswers: answers,
        }),
      });
      if (res.status === 429) throw new Error(t.tooMany);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(t.failed);
      setUnlocked(true);
    } catch (err) {
      setError(err?.message || t.failed);
    } finally {
      setSending(false);
    }
  };

  const shareLink = `${window.location.origin}/readiness?src=share`;
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: t.introTitle, url: shareLink }); return; }
      await navigator.clipboard.writeText(shareLink);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  };

  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        (isAr ? `مرحبًا، أجريتُ فحص الجاهزية وحصلتُ على ${score}/100، وأودّ معرفة كيفية معالجة الثغرات.` : `Hello, I took the readiness check and scored ${score}/100. I'd like to know how to close the gaps.`) +
        (source ? ` [${source}]` : ""))}`
    : "";
  const countWa = () => {
    try {
      fetch(`${API_BASE}/api/demo-requests/wa-click`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source || "readiness" }), keepalive: true,
      }).catch(() => {});
    } catch { /* best-effort */ }
  };
  const demoHref = `/demo${source ? `?src=${encodeURIComponent(source)}` : ""}`;

  const q = step >= 0 && step < N ? READINESS_QUESTIONS[step] : null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={lang} className="rd-page" style={S.shell}>
      <style>{CSS + PROMO_CSS}</style>
      <div style={S.wrap}>
        <header style={S.head} className="rd-noprint">
          <BrandLockup size={40} tone="light" />
          <button type="button" onClick={() => setLang(isAr ? "en" : "ar")} style={S.langBtn}>{t.lang}</button>
        </header>

        {(step === -1 || step >= N) && <div className="rd-noprint"><OfferBanner offer={cfg.offer} lang={lang} /></div>}

        {step === -1 && (
          <section style={S.card} className="rd-fade">
            <h1 className="rd-h1" style={S.h1}>{t.introTitle}</h1>
            <p className="rd-lead" style={S.lead}>{t.introSub}</p>
            <ul style={S.points}>
              {t.introPoints.map((p) => <li key={p} style={S.point}><span style={S.tick}>✓</span>{p}</li>)}
            </ul>
            <button type="button" className="rd-primary" style={{ ...S.primary, width: "100%" }} onClick={begin}>{t.start} →</button>
            <p style={S.fine}>{t.disclaimer}</p>
          </section>
        )}

        {q && (
          <section style={S.card} key={q.id} className="rd-fade">
            <div style={S.progressRow}>
              <span style={S.progressLabel}>{t.qOf(step + 1, N)}</span>
              <span style={S.progressLabel}>{q.area[lang]}</span>
            </div>
            <div style={S.bar}><div style={{ ...S.barFill, width: `${(step / N) * 100}%` }} /></div>
            <h2 className="rd-q" style={S.q}>{q.q[lang]}</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {q.options.map((o, i) => {
                const on = answers[q.id] === i;
                return (
                  <button
                    key={i} type="button" onClick={() => choose(q.id, i)}
                    className="rd-opt" style={{ ...S.opt, ...(on ? S.optOn : null) }}
                  >
                    <span style={{ ...S.radio, ...(on ? S.radioOn : null) }} aria-hidden="true" />
                    {o[lang]}
                  </button>
                );
              })}
            </div>
            {step > 0 && (
              <button type="button" style={S.backBtn} onClick={() => setStep((s) => s - 1)}>
                {isAr ? "→" : "←"} {t.back}
              </button>
            )}
          </section>
        )}

        {step >= N && (
          <>
            <section style={S.card} className="rd-fade">
              <div style={S.resultTop}>
                <ScoreRing score={score} color={level.color} />
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <div style={S.progressLabel}>{t.yourScore}</div>
                  <div style={{ ...S.levelChip, color: level.color, background: level.bg }}>{level[lang]}</div>
                  <p style={{ ...S.lead, margin: "10px 0 0" }}>{isAr ? level.sumAr : level.sumEn}</p>
                  <p style={{ margin: "8px 0 0", fontWeight: 900, color: "#334155" }}>{t.gapsCount(gaps.length)}</p>
                  {gaps[0] && (
                    <p style={{ margin: "6px 0 0", fontWeight: 800, color: "#64748b" }}>
                      {t.weakest}: <b style={{ color: "#dc2626" }}>{gaps[0].q.area[lang]}</b>
                    </p>
                  )}
                </div>
              </div>
            </section>

            {!unlocked ? (
              <section style={{ ...S.card, position: "relative", overflow: "hidden" }} className="rd-noprint">
                <div aria-hidden="true" style={S.blurred}>
                  {rows.slice(0, 4).map((r) => <AreaRow key={r.q.id} r={r} lang={lang} t={t} />)}
                </div>
                <div style={S.lockOverlay}>
                  <form onSubmit={submit} noValidate style={S.lockCard}>
                    <h2 className="rd-h2" style={S.h2}>🔒 {t.lockedTitle}</h2>
                    <p style={{ ...S.lead, margin: 0 }}>{t.lockedSub}</p>
                    <div className="rd-grid" style={S.grid}>
                      <input className="rd-input" style={S.input} placeholder={`${t.company} *`} value={form.companyName} onChange={set("companyName")} maxLength={150} autoComplete="organization" />
                      <input className="rd-input" style={S.input} placeholder={`${t.contact} *`} value={form.contactName} onChange={set("contactName")} maxLength={120} autoComplete="name" />
                      <input className="rd-input" style={{ ...S.input, direction: "ltr" }} type="tel" placeholder={`${t.phone} *`} value={form.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" />
                      <input className="rd-input" style={{ ...S.input, direction: "ltr" }} type="email" placeholder={t.email} value={form.email} onChange={set("email")} maxLength={160} autoComplete="email" />
                      <select className="rd-input" style={S.input} value={form.branches} onChange={set("branches")}>
                        <option value="">{t.branches}: {t.pick}</option>
                        {DEMO_BRANCHES.map((b) => <option key={b} value={b}>{t.branches}: {b}</option>)}
                      </select>
                    </div>
                    <div aria-hidden="true" style={S.honeypot}>
                      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                    </div>
                    {error && <div role="alert" style={S.error}>{error}</div>}
                    <button type="submit" disabled={sending} className="rd-primary" style={{ ...S.primary, width: "100%", opacity: sending ? 0.7 : 1 }}>
                      {sending ? t.sending : t.unlock}
                    </button>
                    <p style={S.fine}>{t.privacy}</p>
                  </form>
                </div>
              </section>
            ) : (
              <section style={S.card} className="rd-fade">
                <h2 className="rd-h2" style={S.h2}>{t.reportTitle}</h2>
                <p style={{ ...S.lead, margin: "0 0 12px" }}>{t.reportSub}</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {[...rows].sort((a, b) => a.pts - b.pts).map((r) => <AreaRow key={r.q.id} r={r} lang={lang} t={t} full />)}
                </div>
                <div style={S.actions} className="rd-noprint">
                  {waHref && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={countWa} style={S.waBtn}>
                      <WaIcon size={20} /> {t.whatsapp}
                    </a>
                  )}
                  <button type="button" style={S.ghost} onClick={() => window.print()}>🖨 {t.print}</button>
                </div>
              </section>
            )}

            <div style={S.actions} className="rd-noprint">
              {!unlocked && <button type="button" style={S.ghost} onClick={() => navigate(demoHref)}>{t.demo}</button>}
              <button type="button" style={S.ghost} onClick={share}>🔗 {copied ? t.copied : t.share}</button>
              <button type="button" style={S.ghost} onClick={retake}>↺ {t.retake}</button>
            </div>
            <div style={{ display: "grid", gap: 14, marginTop: 16 }} className="rd-noprint">
              <StoryCard story={cfg.story} lang={lang} />
              <BeforeAfter lang={lang} />
              <ReferralNote referral={cfg.referral} lang={lang} />
            </div>
            <p style={{ ...S.fine, marginTop: 10 }}>{t.disclaimer}</p>
          </>
        )}

        <div style={S.footer} className="rd-noprint">
          {t.haveAccount}{" "}
          <button type="button" onClick={() => navigate("/")} style={S.link}>{t.signIn}</button>
        </div>
      </div>
    </main>
  );
}

function ScoreRing({ score, color }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 140, height: 140, flex: "0 0 140px" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 70 70)"
          className="rd-ring"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="rd-score" style={{ fontSize: 38, fontWeight: 1000, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontWeight: 900, color: "#94a3b8" }}>/ 100</div>
        </div>
      </div>
    </div>
  );
}

function AreaRow({ r, lang, t, full }) {
  const color = r.pts >= 10 ? "#059669" : r.pts >= 5 ? "#d97706" : "#dc2626";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderInlineStart: `4px solid ${color}`, borderRadius: 10, padding: "12px 14px", background: "#fff", breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 1000 }}>
        <span>{r.q.area[lang]}</span>
        <span style={{ color }}>{r.pts}/10</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "#f1f5f9", marginTop: 8, overflow: "hidden" }}>
        <div style={{ width: `${r.pts * 10}%`, height: "100%", background: color }} />
      </div>
      {full && r.opt && (
        <div style={{ marginTop: 8, display: "grid", gap: 4, fontWeight: 700, color: "#475569", lineHeight: 1.6 }}>
          <div><b>{t.yourAnswer}:</b> {r.opt[lang]}</div>
          {r.pts < 10 ? <div style={{ color: "#0f766e" }}><b>{t.howFix}:</b> {r.q.fix[lang]}</div> : <div style={{ color: "#059669" }}>✓ {t.full}</div>}
        </div>
      )}
    </div>
  );
}

const CSS = `
#root .rd-page.rd-page .rd-h1 { font-size: 30px !important; line-height: 1.3 !important; }
#root .rd-page.rd-page .rd-h2 { font-size: 22px !important; }
#root .rd-page.rd-page .rd-q { font-size: 22px !important; line-height: 1.45 !important; }
#root .rd-page.rd-page .rd-lead { font-size: 16px !important; }
#root .rd-page.rd-page .rd-opt,
#root .rd-page.rd-page .rd-input,
#root .rd-page.rd-page .rd-primary { font-size: 16px !important; }
#root .rd-page.rd-page .rd-score { font-size: 38px !important; }
#root .rd-page.rd-page .brand-word { font-size: 20px !important; }
#root .rd-page.rd-page .brand-word span:not(.brand-tag) { font-size: inherit !important; }
#root .rd-page.rd-page .brand-tag { font-size: 10px !important; }
@media (max-width: 620px) {
  #root .rd-page.rd-page .rd-h1 { font-size: 24px !important; }
  #root .rd-page.rd-page .rd-q { font-size: 19px !important; }
  .rd-page .rd-grid { grid-template-columns: 1fr !important; }
}
.rd-page .rd-opt:hover { border-color: #0f766e !important; background: #f0fdfa !important; }
.rd-page .rd-input:focus { border-color: #0f766e !important; box-shadow: 0 0 0 4px rgba(15,118,110,.18) !important; background: #fff !important; outline: none; }
.rd-page .rd-primary:not(:disabled):hover { transform: translateY(-2px); }
@keyframes rd-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.rd-page .rd-fade { animation: rd-fade .28s ease-out; }
@keyframes rd-ring { from { stroke-dashoffset: 327; } }
.rd-page .rd-ring { animation: rd-ring 1s ease-out; }
@media (prefers-reduced-motion: reduce) { .rd-page .rd-fade, .rd-page .rd-ring { animation: none; } }
@media print {
  .rd-noprint { display: none !important; }
  .rd-page { background: #fff !important; padding: 0 !important; }
}
`;

// Same type as /demo: IBM Plex Sans Arabic, Plus Jakarta Sans for Latin.
const isArFont = '"IBM Plex Sans Arabic", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px 40px", boxSizing: "border-box",
    background: "radial-gradient(1200px 600px at 10% -10%, #ccfbf1 0%, transparent 60%), linear-gradient(180deg,#f0fdfa 0%,#f8fafc 100%)",
    fontFamily: isArFont, color: "#0f172a",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  langBtn: {
    border: "1px solid #cbd5e1", background: "#fff", color: "#0f766e", borderRadius: 8,
    padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
  },
  card: {
    background: "#fff", borderRadius: 16, padding: "26px 24px", marginBottom: 14,
    border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 20px 50px rgba(15,23,42,.08)",
  },
  h1: { margin: 0, fontSize: 30, fontWeight: 1000, lineHeight: 1.3 },
  h2: { margin: 0, fontSize: 22, fontWeight: 1000 },
  lead: { margin: "12px 0 0", color: "#475569", fontWeight: 700, lineHeight: 1.7, fontSize: 16 },
  points: { listStyle: "none", padding: 0, margin: "18px 0 22px", display: "grid", gap: 10 },
  point: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800 },
  tick: {
    width: 26, height: 26, flex: "0 0 26px", borderRadius: 8, display: "grid", placeItems: "center",
    background: "#ccfbf1", color: "#0f766e", fontWeight: 1000,
  },
  primary: {
    border: "none", borderRadius: 12, padding: "14px 20px", minHeight: 56, fontWeight: 1000, fontSize: 16,
    background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", cursor: "pointer",
    fontFamily: "inherit", boxShadow: "0 16px 30px rgba(15,118,110,.24)", transition: "transform .16s ease",
  },
  fine: { margin: "12px 0 0", color: "#94a3b8", fontWeight: 700, fontSize: 13, textAlign: "center" },
  progressRow: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  progressLabel: { color: "#64748b", fontWeight: 900, fontSize: 13 },
  bar: { height: 8, borderRadius: 8, background: "#e2e8f0", margin: "8px 0 18px", overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg,#0f766e,#0891b2)", transition: "width .3s ease" },
  q: { margin: "0 0 16px", fontSize: 22, fontWeight: 1000, lineHeight: 1.45 },
  opt: {
    display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "start", minHeight: 56,
    padding: "12px 14px", borderRadius: 12, border: "1.5px solid #dbe4ef", background: "#f8fafc",
    color: "#0f172a", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
    transition: "border-color .15s, background .15s",
  },
  optOn: { borderColor: "#0f766e", background: "#f0fdfa" },
  radio: { width: 20, height: 20, flex: "0 0 20px", borderRadius: "50%", border: "2px solid #94a3b8", boxSizing: "border-box" },
  radioOn: { border: "6px solid #0f766e" },
  backBtn: {
    marginTop: 16, border: "none", background: "none", color: "#64748b", fontWeight: 900,
    cursor: "pointer", fontFamily: "inherit", padding: 0,
  },
  resultTop: { display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" },
  levelChip: { display: "inline-block", marginTop: 6, padding: "6px 14px", borderRadius: 999, fontWeight: 1000, fontSize: 16 },
  blurred: { display: "grid", gap: 10, filter: "blur(5px)", opacity: 0.55, pointerEvents: "none", userSelect: "none", minHeight: 420 },
  lockOverlay: {
    position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,.9))",
  },
  lockCard: {
    width: "100%", maxWidth: 520, display: "grid", gap: 12, background: "#fff", borderRadius: 14,
    padding: "20px 18px", boxShadow: "0 20px 50px rgba(15,23,42,.16)", border: "1px solid rgba(15,23,42,.08)",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input: {
    width: "100%", minHeight: 48, padding: "11px 13px", borderRadius: 8, border: "1.5px solid #dbe4ef",
    background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", fontWeight: 700, fontSize: 15, boxSizing: "border-box",
  },
  honeypot: { position: "absolute", left: -10000, top: "auto", width: 1, height: 1, overflow: "hidden" },
  error: { padding: "10px 12px", borderRadius: 8, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 900 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 16 },
  ghost: {
    border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 16px", minHeight: 46, fontWeight: 900,
    background: "#fff", color: "#0f172a", cursor: "pointer", fontFamily: "inherit",
  },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "10px 16px", minHeight: 46,
    background: "#25d366", color: "#fff", fontWeight: 1000, textDecoration: "none",
  },
  footer: { marginTop: 18, textAlign: "center", color: "#64748b", fontWeight: 800 },
  link: {
    border: "none", background: "none", padding: 0, color: "#0f766e", fontWeight: 1000,
    cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline",
  },
};
