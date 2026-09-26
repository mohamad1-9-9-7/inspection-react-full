// src/pages/DemoRequest.jsx
// Public "Request a demo" page (/demo) — no login. A visitor leaves their
// company details; the server stores the request and e-mails the owner, and
// the super-admin follows it up in Platform Center → Demo Requests.
//
// Server contract: POST /api/demo-requests (public, rate-limited). See
// docs/server/demo-requests/README.md for the server side.
//
// `?src=linkedin` (or any value) on the link is saved with the request, so
// each channel you share the link on can be counted separately.

import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";

export const DEMO_ACTIVITIES = [
  { v: "meat", en: "Meat / butchery / slaughterhouse", ar: "لحوم / ملاحم / مسالخ" },
  { v: "sweets", en: "Sweets / bakery / confectionery", ar: "حلويات / مخابز" },
  { v: "restaurant", en: "Restaurant / café chain", ar: "مطاعم / مقاهي" },
  { v: "kitchen", en: "Central kitchen / catering", ar: "مطبخ مركزي / تموين" },
  { v: "factory", en: "Food factory / manufacturing", ar: "مصنع أغذية" },
  { v: "retail", en: "Supermarket / retail", ar: "سوبرماركت / تجزئة" },
  { v: "distribution", en: "Distribution / import / cold store", ar: "توزيع / استيراد / تخزين مبرد" },
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
    eyebrow: "InspectPro QMS",
    heroTitle: "See your food-safety records run on one screen.",
    heroSub:
      "HACCP & ISO 22000 logs, branch inspections, returns and condemnation, supplier approval, and reports ready for the auditor — for every branch, from any device.",
    points: ["Daily logs replace paper and Excel", "Every branch live on one dashboard", "PDF & Excel reports in one click"],
    title: "Request a free demo",
    sub: "Leave your details and we will call you within one working day to book a short demo.",
    company: "Company name",
    activity: "Business type",
    branches: "Number of branches / sites",
    contact: "Your name",
    job: "Job title",
    phone: "Mobile / WhatsApp",
    email: "E-mail",
    emirate: "Emirate / country",
    message: "What would you like to solve? (optional)",
    messagePh: "e.g. we still do HACCP logs on paper across 6 branches",
    pick: "Select…",
    submit: "Send request",
    sending: "Sending…",
    required: "Please fill in the company name, your name and a phone number.",
    badEmail: "That e-mail address does not look right.",
    badPhone: "Please enter a valid phone number.",
    failed: "We could not send your request. Please try again, or contact us directly.",
    tooMany: "Too many requests from this device. Please try again later.",
    doneTitle: "Thank you — request received",
    doneSub: "We will contact you within one working day to arrange your demo.",
    back: "Back to sign in",
    another: "Send another request",
    haveAccount: "Already a customer?",
    signIn: "Sign in",
    privacy: "We use these details only to contact you about the demo.",
  },
  ar: {
    eyebrow: "InspectPro QMS",
    heroTitle: "سجلات سلامة الغذاء لكل فروعك على شاشة وحدة.",
    heroSub:
      "سجلات HACCP و ISO 22000، تفتيش الفروع، المرتجعات والإتلاف، اعتماد الموردين، وتقارير جاهزة للمدقق — لكل الفروع ومن أي جهاز.",
    points: ["السجلات اليومية بدل الورق والإكسل", "كل الفروع مباشرة على لوحة وحدة", "تقارير PDF و Excel بكبسة زر"],
    title: "اطلب عرض تجريبي مجاني",
    sub: "اترك بياناتك ومنتواصل معك خلال يوم عمل لنحدد موعد عرض قصير.",
    company: "اسم الشركة",
    activity: "نوع النشاط",
    branches: "عدد الفروع / المواقع",
    contact: "اسمك",
    job: "المسمى الوظيفي",
    phone: "الموبايل / واتساب",
    email: "البريد الإلكتروني",
    emirate: "الإمارة / الدولة",
    message: "شو المشكلة اللي بدك تحلها؟ (اختياري)",
    messagePh: "مثلاً: لسا منعبّي سجلات HACCP على الورق بـ 6 فروع",
    pick: "اختر…",
    submit: "إرسال الطلب",
    sending: "جارٍ الإرسال…",
    required: "عبّي اسم الشركة واسمك ورقم الموبايل.",
    badEmail: "البريد الإلكتروني مش مكتوب صح.",
    badPhone: "اكتب رقم موبايل صحيح.",
    failed: "ما قدرنا نبعت الطلب. جرّب مرة تانية أو تواصل معنا مباشرة.",
    tooMany: "طلبات كتير من هالجهاز. جرّب بعد شوي.",
    doneTitle: "شكراً — وصلنا طلبك",
    doneSub: "رح نتواصل معك خلال يوم عمل لنحدد موعد العرض.",
    back: "رجوع لتسجيل الدخول",
    another: "إرسال طلب آخر",
    haveAccount: "عندك حساب؟",
    signIn: "تسجيل الدخول",
    privacy: "منستخدم هالبيانات بس لنتواصل معك بخصوص العرض.",
  },
};

const EMPTY = {
  companyName: "",
  activity: "",
  branches: "",
  contactName: "",
  jobTitle: "",
  phone: "",
  email: "",
  emirate: "",
  message: "",
  website: "", // honeypot — hidden from people, bots fill it
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const phoneDigits = (s) => String(s || "").replace(/\D/g, "");

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

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const source = useMemo(() => (params.get("src") || params.get("utm_source") || "").slice(0, 60), [params]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={lang} style={S.shell} className="demo-page">
      <style>{CSS}</style>
      <section className="demo-layout" style={S.layout}>
        <aside className="demo-side" style={S.side}>
          <div style={S.sideGlow} aria-hidden="true" />
          <div style={S.brandRow}>
            <img src={logo} alt="" style={S.logo} />
            <span style={S.eyebrow}>{t.eyebrow}</span>
          </div>
          <h1 className="demo-hero-title" style={S.heroTitle}>{t.heroTitle}</h1>
          <p className="demo-hero-sub" style={S.heroSub}>{t.heroSub}</p>
          <ul style={S.points}>
            {t.points.map((p) => (
              <li key={p} style={S.point}><span style={S.tick} aria-hidden="true">✓</span>{p}</li>
            ))}
          </ul>
        </aside>

        <section style={S.card}>
          <div style={S.cardTop}>
            <div>
              <h2 className="demo-title" style={S.title}>{done ? t.doneTitle : t.title}</h2>
              <p style={S.sub}>{done ? t.doneSub : t.sub}</p>
            </div>
            <button type="button" onClick={() => setLang(isAr ? "en" : "ar")} style={S.langBtn}>
              {isAr ? "English" : "العربية"}
            </button>
          </div>

          {done ? (
            <div style={S.doneBox}>
              <div style={S.doneIcon} aria-hidden="true">✅</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" style={S.ghostBtn} onClick={() => setDone(false)}>{t.another}</button>
                <button type="button" style={S.primaryBtn} className="demo-primary" onClick={() => navigate("/")}>{t.back}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} style={S.form} noValidate>
              <div className="demo-grid" style={S.grid}>
                <Field label={t.company} required>
                  <input className="demo-input" style={S.input} value={form.companyName} onChange={set("companyName")} autoComplete="organization" maxLength={150} />
                </Field>
                <Field label={t.activity}>
                  <select className="demo-input" style={S.input} value={form.activity} onChange={set("activity")}>
                    <option value="">{t.pick}</option>
                    {DEMO_ACTIVITIES.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                  </select>
                </Field>
                <Field label={t.branches}>
                  <select className="demo-input" style={S.input} value={form.branches} onChange={set("branches")}>
                    <option value="">{t.pick}</option>
                    {DEMO_BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label={t.emirate}>
                  <select className="demo-input" style={S.input} value={form.emirate} onChange={set("emirate")}>
                    <option value="">{t.pick}</option>
                    {DEMO_EMIRATES.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                  </select>
                </Field>
                <Field label={t.contact} required>
                  <input className="demo-input" style={S.input} value={form.contactName} onChange={set("contactName")} autoComplete="name" maxLength={120} />
                </Field>
                <Field label={t.job}>
                  <input className="demo-input" style={S.input} value={form.jobTitle} onChange={set("jobTitle")} autoComplete="organization-title" maxLength={120} />
                </Field>
                <Field label={t.phone} required>
                  <input className="demo-input" style={{ ...S.input, direction: "ltr" }} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+971 5x xxx xxxx" maxLength={40} />
                </Field>
                <Field label={t.email}>
                  <input className="demo-input" style={{ ...S.input, direction: "ltr" }} type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} />
                </Field>
              </div>

              <Field label={t.message}>
                <textarea className="demo-input" style={{ ...S.input, minHeight: 96, resize: "vertical" }} value={form.message} onChange={set("message")} placeholder={t.messagePh} maxLength={2000} />
              </Field>

              {/* Honeypot: off-screen and skipped by keyboard / screen readers. */}
              <div aria-hidden="true" style={S.honeypot}>
                <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
              </div>

              {error && <div role="alert" style={S.error}>{error}</div>}

              <button type="submit" disabled={sending} className="demo-primary" style={{ ...S.primaryBtn, width: "100%", minHeight: 56, opacity: sending ? 0.7 : 1 }}>
                {sending ? t.sending : t.submit}
              </button>
              <p style={S.privacy}>{t.privacy}</p>
            </form>
          )}

          <div style={S.footer}>
            {t.haveAccount}{" "}
            <button type="button" onClick={() => navigate("/")} style={S.link}>{t.signIn}</button>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={S.field}>
      <span style={S.label}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      {children}
    </label>
  );
}

const CSS = `
@media (max-width: 980px) {
  .demo-page .demo-layout { grid-template-columns: 1fr !important; }
  .demo-page .demo-side { min-height: auto !important; }
}
@media (max-width: 620px) {
  .demo-page .demo-grid { grid-template-columns: 1fr !important; }
}
.demo-page .demo-input:focus {
  border-color: #0f766e !important;
  box-shadow: 0 0 0 4px rgba(15,118,110,.18) !important;
  background: #fff !important;
  outline: none;
}
/* globals.css pins every #root element to 14px !important; the doubled class
   out-specifies it so the page keeps its type scale. */
#root .demo-page.demo-page .demo-hero-title { font-size: 30px !important; line-height: 1.25 !important; }
#root .demo-page.demo-page .demo-hero-sub { font-size: 16px !important; }
#root .demo-page.demo-page .demo-title { font-size: 26px !important; }
#root .demo-page.demo-page .demo-input,
#root .demo-page.demo-page .demo-primary { font-size: 16px !important; }
@media (max-width: 620px) {
  #root .demo-page.demo-page .demo-hero-title { font-size: 24px !important; }
  #root .demo-page.demo-page .demo-title { font-size: 22px !important; }
}
.demo-page .demo-primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 22px 40px rgba(15,118,110,.30) !important; }
`;

const S = {
  shell: {
    minHeight: "100vh",
    padding: "24px 16px",
    boxSizing: "border-box",
    background: "radial-gradient(1200px 600px at 10% -10%, #ccfbf1 0%, transparent 60%), linear-gradient(180deg,#f0fdfa 0%,#f8fafc 100%)",
    fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif',
    color: "#0f172a",
  },
  layout: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
    gap: 20,
    alignItems: "stretch",
  },
  side: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    padding: "34px 30px",
    minHeight: 560,
    background: "linear-gradient(145deg,#0f766e 0%,#0e7490 55%,#155e75 100%)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxShadow: "0 24px 60px rgba(15,118,110,.28)",
  },
  sideGlow: {
    position: "absolute",
    inset: "auto -120px -160px auto",
    width: 380,
    height: 380,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,.22), transparent 70%)",
    pointerEvents: "none",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  logo: { width: 54, height: 54, borderRadius: 12, objectFit: "cover", background: "#fff" },
  eyebrow: { fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.9 },
  heroTitle: { margin: "10px 0 0", fontSize: 30, lineHeight: 1.25, fontWeight: 1000 },
  heroSub: { margin: 0, fontSize: 16, lineHeight: 1.7, opacity: 0.92, fontWeight: 600 },
  points: { listStyle: "none", padding: 0, margin: "6px 0 0", display: "grid", gap: 10 },
  point: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 15 },
  tick: {
    width: 26, height: 26, flex: "0 0 26px", borderRadius: 8, display: "grid", placeItems: "center",
    background: "rgba(255,255,255,.18)", fontWeight: 1000,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "28px 26px",
    border: "1px solid rgba(15,23,42,.08)",
    boxShadow: "0 24px 60px rgba(15,23,42,.10)",
    display: "flex",
    flexDirection: "column",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  title: { margin: 0, fontSize: 26, fontWeight: 1000 },
  sub: { margin: "6px 0 0", color: "#64748b", fontWeight: 700, lineHeight: 1.6 },
  langBtn: {
    border: "1px solid #cbd5e1", background: "#fff", color: "#0f766e", borderRadius: 8,
    padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  },
  form: { display: "grid", gap: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { display: "grid", gap: 6, minWidth: 0 },
  label: { fontWeight: 900, color: "#334155", fontSize: 14 },
  input: {
    width: "100%", minHeight: 48, padding: "11px 13px", borderRadius: 8, border: "1.5px solid #dbe4ef",
    background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", fontWeight: 700, fontSize: 15,
    boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s, background .15s",
  },
  honeypot: { position: "absolute", left: -10000, top: "auto", width: 1, height: 1, overflow: "hidden" },
  error: {
    padding: "12px 14px", borderRadius: 8, background: "#fef2f2", color: "#991b1b",
    border: "1px solid #fecaca", fontWeight: 900,
  },
  primaryBtn: {
    border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 1000, fontSize: 16,
    background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", cursor: "pointer",
    fontFamily: "inherit", boxShadow: "0 16px 30px rgba(15,118,110,.24)",
    transition: "transform .16s ease, box-shadow .16s ease, opacity .16s ease",
  },
  ghostBtn: {
    border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 20px", fontWeight: 900, fontSize: 15,
    background: "#fff", color: "#0f172a", cursor: "pointer", fontFamily: "inherit",
  },
  privacy: { margin: 0, color: "#94a3b8", fontWeight: 700, fontSize: 13, textAlign: "center" },
  doneBox: { display: "grid", gap: 18, justifyItems: "center", padding: "30px 0" },
  doneIcon: { fontSize: 56 },
  footer: { marginTop: "auto", paddingTop: 20, textAlign: "center", color: "#64748b", fontWeight: 800 },
  link: {
    border: "none", background: "none", padding: 0, color: "#0f766e", fontWeight: 1000,
    cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline",
  },
};
