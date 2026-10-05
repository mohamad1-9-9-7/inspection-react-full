// src/pages/trial/TrialSignup.jsx
// "Try it free for 3 days" — the sign-up window on /demo.
//
// 1. the visitor fills a short form and MUST tick that nothing in a trial is
//    kept (the server refuses without it);
// 2. POST /api/trial/start creates their own company + admin account and
//    answers like a login, so they are signed in on the spot;
// 3. the new company is filled with two weeks of demo records (the same
//    generator as Settings → Demo data), through the normal /api/reports
//    routes as that account, and the app opens.
// A failed fill never blocks: the app opens with whatever got in.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { DEMO_ACTIVITIES } from "../DemoRequest";
import { SECTOR_KIT, TRIAL_DAYS, storeTrialSession } from "./trialSession";
import { MOBILE_COUNTRIES, countryOf, normalizeMobile } from "./phone";

const DEMO_DAYS = 14;
const PARALLEL = 4;

const T = {
  en: {
    title: `Try InspectPro free for ${TRIAL_DAYS} days`,
    sub: "Your own company, filled with realistic sample records. Open it on your phone and fill a check yourself.",
    company: "Company name", contact: "Your name", phone: "Mobile / WhatsApp", country: "Country code", email: "E-mail (optional)",
    sector: "Business type", password: "Choose a password", passwordHint: "At least 8 characters",
    pick: "Select…",
    warnTitle: "This is a trial account",
    warn: [
      `It works for ${TRIAL_DAYS} days, then locks.`,
      "Nothing in it is saved: all data is deleted for good and cannot be recovered.",
      "When you subscribe, we set up a new company for you from scratch.",
    ],
    accept: "I understand that all data in this trial account will be deleted and cannot be recovered.",
    start: "Start my free trial", cancel: "Cancel",
    creating: "Creating your company…",
    filling: "Adding sample records…",
    ready: "Ready — opening your system",
    loginNote: (u) => `To sign in again later: username ${u} and the password you chose.`,
    err: {
      required: "Please fill in the company name, your name, phone, business type and a password.",
      bad_phone: (c) => `Please enter a valid ${c.en} mobile number: ${c.len} digits, e.g. ${c.example}.`,
      bad_email: "That e-mail address does not look right.",
      weak_password: "The password needs at least 8 characters.",
      not_accepted: "Please tick the box to confirm you understand the data will not be kept.",
      trial_used: "This mobile number has already been used for a free trial — each number gets one. Book a demo and we will help you.",
      trial_full: "Too many trials started today. Please try again tomorrow, or book a demo.",
      too_many: "Too many attempts from this device. Please try again later.",
      failed: "We could not start the trial. Please try again.",
    },
  },
  ar: {
    title: `جرّب InspectPro مجانًا لمدة ${TRIAL_DAYS} أيام`,
    sub: "شركة خاصة بك فيها سجلات تجريبية واقعية. افتحها من جوالك وعبّئ فحصًا بنفسك.",
    company: "اسم الشركة", contact: "اسمك", phone: "الجوال / واتساب", country: "رمز الدولة", email: "البريد الإلكتروني (اختياري)",
    sector: "نوع النشاط", password: "اختر كلمة مرور", passwordHint: "8 أحرف على الأقل",
    pick: "اختر…",
    warnTitle: "هذا حساب تجريبي",
    warn: [
      `يعمل لمدة ${TRIAL_DAYS} أيام ثم يُقفل.`,
      "لا يُحفظ أي شيء فيه: تُحذف جميع البيانات نهائيًا ولا يمكن استعادتها.",
      "عند الاشتراك ننشئ لك شركة جديدة من البداية.",
    ],
    accept: "أفهم أن جميع البيانات في هذا الحساب التجريبي ستُحذف ولا يمكن استعادتها.",
    start: "ابدأ التجربة المجانية", cancel: "إلغاء",
    creating: "جارٍ إنشاء شركتك…",
    filling: "جارٍ إضافة السجلات التجريبية…",
    ready: "جاهز — جارٍ فتح النظام",
    loginNote: (u) => `للدخول لاحقًا: اسم المستخدم ${u} وكلمة المرور التي اخترتها.`,
    err: {
      required: "يرجى تعبئة اسم الشركة واسمك والجوال ونوع النشاط وكلمة المرور.",
      bad_phone: (c) => `يرجى إدخال رقم جوال صحيح في ${c.ar}: ${c.len} أرقام، مثل ${c.example}.`,
      bad_email: "البريد الإلكتروني غير صحيح.",
      weak_password: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      not_accepted: "يرجى التأشير على المربع لتأكيد أنك تفهم أن البيانات لن تُحفظ.",
      trial_used: "هذا الرقم استُخدم للتجربة المجانية من قبل — لكل رقم تجربة واحدة. احجز عرضًا وسنساعدك.",
      trial_full: "بدأ عدد كبير من التجارب اليوم. حاول غدًا أو احجز عرضًا.",
      too_many: "محاولات كثيرة من هذا الجهاز. حاول لاحقًا.",
      failed: "تعذّر بدء التجربة. حاول مرة أخرى.",
    },
  },
};

const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

/** Fills the new company with demo records as the signed-in trial account. */
async function fillDemo(industry, companyId, token, onTick) {
  const { buildDemoPlan } = await import("../industry-kit/settings/demo/demoGenerators");
  const plan = buildDemoPlan(industry, { today: todayISO(), days: DEMO_DAYS, companyKey: String(companyId) });
  onTick(0, plan.length);
  let done = 0;
  let next = 0;
  const url = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;
  const worker = async () => {
    while (next < plan.length) {
      const item = plan[next];
      next += 1;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ reporter: industry, type: item.type, payload: item.payload }),
        });
      } catch { /* one missing sample sheet is not worth stopping for */ }
      done += 1;
      onTick(done, plan.length);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

export default function TrialSignup({ lang, sector, source, promoCode, onClose, track }) {
  const navigate = useNavigate();
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const [f, setF] = useState({
    companyName: "", contactName: "", phone: "", phoneCountry: "AE", email: "",
    sector: SECTOR_KIT[sector] ? sector : "", password: "",
  });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("form"); // form | creating | filling | ready
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [username, setUsername] = useState("");
  const firstRef = useRef(null);
  const busy = stage !== "form";

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const sectors = DEMO_ACTIVITIES.filter((a) => SECTOR_KIT[a.v]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const d = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v).trim()]));
    if (!d.companyName || !d.contactName || !d.phone || !d.sector || !f.password) return setError(t.err.required);
    const mobile = normalizeMobile(d.phoneCountry, d.phone);
    if (!mobile) return setError(t.err.bad_phone(countryOf(d.phoneCountry)));
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return setError(t.err.bad_email);
    if (f.password.length < 8) return setError(t.err.weak_password);
    if (!accept) return setError(t.err.not_accepted);

    setStage("creating");
    track?.("cta", "trial-submit");
    try {
      const res = await fetch(`${API_BASE}/api/trial/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, password: f.password, accept: true, lang, source, promoCode }),
      });
      if (res.status === 429) throw new Error(t.err.too_many);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.user) {
        const msg = data.error === "bad_phone" ? t.err.bad_phone(countryOf(d.phoneCountry)) : t.err[data.error];
        throw new Error(msg || t.err.failed);
      }

      storeTrialSession(data, lang);
      setUsername(data.user.username);
      track?.("lead");
      setStage("filling");
      await fillDemo(data.user.company?.industry || SECTOR_KIT[d.sector], data.user.companyId, data.token,
        (done, total) => setProgress({ done, total }));
      setStage("ready");
      setTimeout(() => navigate("/company-app"), 2600);
    } catch (err) {
      setStage("form");
      setError(err?.message || t.err.failed);
    }
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="dp-trial-back" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dp-trial dp-formcard" role="dialog" aria-modal="true" aria-labelledby="trial-title" dir={isAr ? "rtl" : "ltr"}>
        <h3 id="trial-title" className="fs-h3">{t.title}</h3>
        <p className="hint fs-sm">{t.sub}</p>

        {stage === "form" ? (
          <form onSubmit={submit} noValidate>
            <div className="dp-fields">
              <div className="dp-field">
                <label htmlFor="t-co" className="fs-sm">{t.company}<em> *</em></label>
                <input ref={firstRef} id="t-co" className="dp-input" value={f.companyName} onChange={set("companyName")} autoComplete="organization" maxLength={120} />
              </div>
              <div className="dp-field">
                <label htmlFor="t-name" className="fs-sm">{t.contact}<em> *</em></label>
                <input id="t-name" className="dp-input" value={f.contactName} onChange={set("contactName")} autoComplete="name" maxLength={120} />
              </div>
              <div className="dp-field">
                <label htmlFor="t-phone" className="fs-sm">{t.phone}<em> *</em></label>
                <div className="dp-trial-phone" dir="ltr" style={{ display: "grid", gridTemplateColumns: "minmax(104px, auto) 1fr", gap: 8 }}>
                  <select className="dp-input" aria-label={t.country} value={f.phoneCountry} onChange={set("phoneCountry")}>
                    {MOBILE_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} +{c.code}</option>)}
                  </select>
                  <input id="t-phone" className="dp-input" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel-national" placeholder={countryOf(f.phoneCountry).example} maxLength={20} />
                </div>
              </div>
              <div className="dp-field">
                <label htmlFor="t-email" className="fs-sm">{t.email}</label>
                <input id="t-email" className="dp-input" type="email" dir="ltr" value={f.email} onChange={set("email")} autoComplete="email" maxLength={160} />
              </div>
              <div className="dp-field">
                <label htmlFor="t-sec" className="fs-sm">{t.sector}<em> *</em></label>
                <select id="t-sec" className="dp-input" value={f.sector} onChange={set("sector")}>
                  <option value="">{t.pick}</option>
                  {sectors.map((a) => <option key={a.v} value={a.v}>{isAr ? a.ar : a.en}</option>)}
                </select>
              </div>
              <div className="dp-field">
                <label htmlFor="t-pw" className="fs-sm">{t.password}<em> *</em></label>
                <input id="t-pw" className="dp-input" type="password" dir="ltr" value={f.password} onChange={set("password")} autoComplete="new-password" minLength={8} maxLength={100} placeholder={t.passwordHint} />
              </div>
            </div>

            <div className="dp-trial-warn fs-sm" role="note">
              <b>⚠️ {t.warnTitle}</b>
              <ul>{t.warn.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>

            <label className={`dp-check fs-sm dp-trial-accept${accept ? " on" : ""}`}>
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span className="dp-check-box" aria-hidden="true" />
              <span>{t.accept}</span>
            </label>

            {error && <div className="dp-err fs-sm" role="alert" style={{ marginTop: 12 }}>{error}</div>}

            <div className="dp-trial-act">
              <button type="submit" className="dp-btn primary fs-md">{t.start}</button>
              <button type="button" className="dp-btn dp-trial-cancel fs-md" onClick={onClose}>{t.cancel}</button>
            </div>
          </form>
        ) : (
          <div className="dp-trial-progress" aria-live="polite">
            <p className="fs-md"><b>{stage === "creating" ? t.creating : stage === "filling" ? t.filling : `✅ ${t.ready}`}</b></p>
            {stage !== "creating" && (
              <div className="dp-trial-bar"><span style={{ width: `${stage === "ready" ? 100 : pct}%` }} /></div>
            )}
            {stage === "filling" && progress.total > 0 && <p className="fs-sm">{progress.done} / {progress.total}</p>}
            {username && <p className="dp-trial-login fs-sm" dir={isAr ? "rtl" : "ltr"}>🔑 {t.loginNote(username)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
