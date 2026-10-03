// Login.jsx - username + password login page (INSPECT PRO platform screen)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import API_BASE from "../config/api";
import { SUB_CACHE_KEY, writeSubscriptionCache } from "../utils/subscriptionLock";
import LoginShowcase, { SC_CSS } from "./LoginShowcase";
import { usePublicTitle } from "../config/pageTitles";
import { useSiteStats } from "../utils/siteStats";

const BRAND = "/brand/inspect-pro";
// Per-viewer conveniences only (never a source of truth).
const PREF_LANG = "lp_lang";
const PREF_THEME = "lp_theme";
const PREF_USER = "lp_remember_user";

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* storage blocked - fine */ }
}

// The approved "Scan ring" mark (same paths as public/brand/inspect-pro/mark*.svg).
function ScanRing({ ring = "#fff", className }) {
  return (
    <svg className={className} viewBox="0 0 124 124" aria-hidden="true">
      <g transform="translate(4,4)">
        <path d="M88 52 A36 36 0 1 1 52 16" fill="none" stroke={ring} strokeWidth="11" strokeLinecap="round" />
        <path className="lp-arc" d="M52 16 A36 36 0 0 1 88 52" fill="none" stroke="#0EA5A4" strokeWidth="11" strokeLinecap="round" />
        <path d="M80 80 L104 104" stroke={ring} strokeWidth="14" strokeLinecap="round" />
        <path className="lp-check" d="M33 53 L47 67 L73 39" fill="none" stroke="#0EA5A4" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const Icon = {
  user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />,
  lock: <path d="M6 11h12v10H6z M8 11V8a4 4 0 018 0v3 M12 15v2" />,
  eye: <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z" />,
  eyeOff: <path d="M3 3l18 18 M10.6 5.1A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4 M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1 M9.9 9.9a3 3 0 004.2 4.2" />,
  arrow: <path d="M5 12h14 M13 6l6 6-6 6" />,
  sun: <path d="M12 16a4 4 0 100-8 4 4 0 000 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4" />,
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
  globe: <path d="M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />,
  caps: <path d="M12 4l7 8h-4v5H9v-5H5l7-8z M9 20h6" />,
  info: <path d="M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v5 M12 8h.01" />,
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-5" />,
};
function Ico({ name, className = "lp-ico" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Icon[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ copy */
const T = {
  en: {
    tagline: "FOOD SAFETY · QUALITY · COMPLIANCE",
    heroA: "The quality system built for",
    industries: ["butcheries", "restaurants", "food factories", "warehouses", "retail stores", "bakeries & sweets"],
    heroB: "Every check, record and audit — in one trusted place.",
    trust: ["HACCP & ISO 22000", "Role-based access", "Full audit trail", "Works offline", "English & Arabic"],
    tour: "Product tour", seeIt: "Book a demo", demoOf: "Get a personal demo of", prev: "Previous", next: "Next",
    welcome: "Welcome back",
    greet: ["Good morning", "Good afternoon", "Good evening"],
    status: { checking: "Connecting…", up: "All systems operational", down: "Server unreachable" },
    enter: "Press Enter to sign in",
    welcomeSub: "Sign in with your company account to continue.",
    username: "Username", usernamePh: "Enter your username",
    password: "Password", passwordPh: "Enter your password",
    show: "Show password", hide: "Hide password",
    remember: "Remember my username", forgot: "Forgot password?",
    forgotTitle: "Password reset",
    forgotText: "For your security, passwords are reset by your company administrator from Settings → Accounts. Ask them for a new one — it takes a minute.",
    capsOn: "Caps Lock is on",
    signIn: "Sign in", signingIn: "Signing in…", success: "Signed in — opening your workspace",
    secure: "Encrypted connection · your data stays with your company",
    newTitle: "New to INSPECT PRO?",
    newText: "Get a personal walkthrough for your company — free.",
    demo: "Request a free demo",
    pickLang: "Select language", themeDark: "Dark mode", themeLight: "Light mode",
    built: "Built by Eng. Mohammed Abdullah",
    err: {
      empty: "Please enter username and password",
      deploy: "Server not updated yet - deploy index.cjs first",
      invalid_credentials: "Wrong username or password",
      account_disabled: "This account is disabled",
      too_many_attempts: "Too many attempts - wait 1 minute",
      company_disabled: "This company is disabled. Contact the platform administrator.",
      subscription_lapsed: "This company's subscription has ended. Contact the platform administrator.",
      trial_ended: "Your free trial has ended and its data is being deleted. Subscribe to start with a new account.",
      failed: "Login failed",
      network: "Could not connect to server",
    },
  },
  ar: {
    tagline: "سلامة الغذاء · الجودة · الامتثال",
    heroA: "نظام الجودة المصمَّم لـ",
    industries: ["الملاحم", "المطاعم", "مصانع الأغذية", "المستودعات", "متاجر التجزئة", "المخابز والحلويات"],
    heroB: "كل فحص وسجل وتدقيق — في مكان واحد موثوق.",
    trust: ["HACCP و ISO 22000", "صلاحيات حسب الدور", "سجل تدقيق كامل", "يعمل دون اتصال", "عربي وإنجليزي"],
    tour: "جولة في النظام", seeIt: "احجز عرضاً", demoOf: "احصل على عرض شخصي لـ", prev: "السابق", next: "التالي",
    welcome: "أهلاً بعودتك",
    greet: ["صباح الخير", "مساء الخير", "مساء الخير"],
    status: { checking: "جارٍ الاتصال…", up: "جميع الأنظمة تعمل", down: "تعذّر الوصول للخادم" },
    enter: "اضغط Enter لتسجيل الدخول",
    welcomeSub: "سجّل الدخول بحساب شركتك للمتابعة.",
    username: "اسم المستخدم", usernamePh: "أدخل اسم المستخدم",
    password: "كلمة المرور", passwordPh: "أدخل كلمة المرور",
    show: "إظهار كلمة المرور", hide: "إخفاء كلمة المرور",
    remember: "تذكّر اسم المستخدم", forgot: "نسيت كلمة المرور؟",
    forgotTitle: "إعادة تعيين كلمة المرور",
    forgotText: "حفاظاً على أمانك، يعيد مدير النظام في شركتك تعيين كلمة المرور من الإعدادات ← الحسابات. اطلب منه كلمة جديدة — تستغرق دقيقة.",
    capsOn: "زر الأحرف الكبيرة (Caps Lock) مفعّل",
    signIn: "تسجيل الدخول", signingIn: "جارٍ تسجيل الدخول…", success: "تم الدخول — جارٍ فتح مساحة عملك",
    secure: "اتصال مشفّر · بياناتك تبقى لشركتك",
    newTitle: "جديد على INSPECT PRO؟",
    newText: "احصل على عرض شخصي مجاني لشركتك.",
    demo: "اطلب عرضاً مجانياً",
    pickLang: "اختر اللغة", themeDark: "الوضع الداكن", themeLight: "الوضع الفاتح",
    built: "تطوير م. محمد عبدالله",
    err: {
      empty: "الرجاء إدخال اسم المستخدم وكلمة المرور",
      deploy: "الخادم غير محدَّث بعد - انشر index.cjs أولاً",
      invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
      account_disabled: "هذا الحساب معطّل",
      too_many_attempts: "محاولات كثيرة - انتظر دقيقة",
      company_disabled: "هذه الشركة معطّلة. تواصل مع مدير المنصّة.",
      subscription_lapsed: "انتهى اشتراك هذه الشركة. تواصل مع مدير المنصّة.",
      trial_ended: "انتهت التجربة المجانية وتُحذف بياناتها. اشترك للبدء بحساب جديد.",
      failed: "تعذّر تسجيل الدخول",
      network: "تعذّر الاتصال بالخادم",
    },
  },
};

// SVG flags - Windows does not draw flag emoji.
const FLAG_GB = (
  <svg className="lp-flag" viewBox="0 0 60 30" aria-hidden="true">
    <clipPath id="lp-gb"><path d="M0 0v30h60V0z" /></clipPath>
    <clipPath id="lp-gb-t"><path d="M30 15h30v15zv15H0zH0V0zV0h30z" /></clipPath>
    <g clipPath="url(#lp-gb)">
      <path d="M0 0v30h60V0z" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" clipPath="url(#lp-gb-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);
const FLAG_AE = (
  <svg className="lp-flag" viewBox="0 0 12 6" aria-hidden="true">
    <path fill="#00732F" d="M0 0h12v2H0z" />
    <path fill="#fff" d="M0 2h12v2H0z" />
    <path fill="#000" d="M0 4h12v2H0z" />
    <path fill="#FF0000" d="M0 0h3v6H0z" />
  </svg>
);
const LANGS = [
  { v: "en", name: "English", flag: FLAG_GB },
  { v: "ar", name: "العربية", flag: FLAG_AE },
];

/* Rotating industry word in the hero line. */
function RotatingWord({ words }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const id = setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % words.length); }, 2400);
    return () => clearInterval(id);
  }, [words]);
  return (
    <span className="lp-rot" aria-live="off">
      <span key={words[i]} className="lp-rot-word">{words[i]}</span>
    </span>
  );
}

function greetIndex() {
  const h = new Date().getHours();
  return h < 12 ? 0 : h < 18 ? 1 : 2;
}

/* One no-DB ping on load (also wakes the API before the first sign-in). */
function useServerStatus() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let alive = true;
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 8000);
    fetch(`${API_BASE}/healthz`, { signal: ctrl ? ctrl.signal : undefined, cache: "no-store" })
      .then((r) => { if (alive) setStatus(r.ok ? "up" : "down"); })
      .catch(() => { if (alive) setStatus("down"); })
      .finally(() => clearTimeout(timer));
    return () => { alive = false; clearTimeout(timer); if (ctrl) ctrl.abort(); };
  }, []);
  return status;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // A link may ask for a language (?lang=ar — the Arabic link previews and
  // Google's Arabic result point here); otherwise the visitor's saved choice.
  const [lang, setLang] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "ar" || q === "en") return q;
    return readPref(PREF_LANG, "en") === "ar" ? "ar" : "en";
  });
  usePublicTitle("/", lang);
  // Visitor stats: only people who are NOT signed in are counted (see utils/siteStats.js).
  const stat = useSiteStats("login", lang);
  const [theme, setTheme] = useState(() => (readPref(PREF_THEME, "light") === "dark" ? "dark" : "light"));
  const [username, setUsername] = useState(() => readPref(PREF_USER, ""));
  const [remember, setRemember] = useState(() => !!readPref(PREF_USER, ""));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [caps, setCaps] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [shake, setShake] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const sideRef = useRef(null);
  const server = useServerStatus();
  const passRef = useRef(null);

  const t = T[lang];

  if (location.pathname !== "/") return null;

  const switchLang = (next) => {
    setLangOpen(false);
    if (next === lang) return;
    setLang(next);
    setError("");
    writePref(PREF_LANG, next);
  };
  const switchTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    writePref(PREF_THEME, next);
  };

  // Cursor spotlight on the brand side - CSS vars only, no re-render.
  const onSideMove = (e) => {
    const el = sideRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const fail = (msg) => {
    setError(msg);
    setShake((n) => n + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      fail(t.err.empty);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.status === 404) {
        fail(t.err.deploy);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.ok && data.user) {
        writePref(PREF_USER, remember ? username.trim() : "");
        if (data.token) localStorage.setItem("authToken", data.token);
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: data.user.username,
            displayName: data.user.displayName,
            role: data.user.isAdmin ? "Admin" : "Staff",
            permissions: data.user.permissions,
            employees: data.user.employees || [],
            crudPerms: data.user.crudPerms || {},
            allowedBranches: data.user.allowedBranches || [],
            isAdmin: data.user.isAdmin,
            isSuperAdmin: data.user.isSuperAdmin || false,
            // نوع نشاط شركة الحساب — يثبّت أي نظام يفتح له (مواشي = النظام
            // الحالي، غيره = المحرّك العام). مخزّن هنا حتى يقرأه getActiveIndustry
            // بلا نداء إضافي.
            companyIndustry: data.user.company?.industry || "meat",
            // Which code module the company runs (src/companies/<module>/).
            companyModule: data.user.company?.module || "",
            companyName: data.user.company?.name || "",
            // null = platform account (super-admin). The in-app subscription
            // lock in App.jsx only ever judges an account by its OWN company.
            companyId: data.user.companyId || null,
            // Self-service trial (pages/trial): the in-app bar counts down to this date.
            companyTrial: !!data.user.company?.isTrial,
            companyEndDate: data.user.company?.endDate ? String(data.user.company.endDate).slice(0, 10) : null,
            type: "named",
            loginAt: Date.now(),
          })
        );
        // The login response already carries the company's subscription
        // state — seed the lock's cache from it instead of a pre-login read.
        if (data.user.company?.id && !data.user.isSuperAdmin) {
          writeSubscriptionCache(data.user.company.id, data.user.company);
        } else {
          localStorage.removeItem(SUB_CACHE_KEY);
        }
        // مالك المنصّة (سوبر أدمن) ما إلوش شركة ثابتة بالتوكن — بيختارها كل
        // مرة من شاشة الكروت. الحساب العادي بيروح لنظام شركته: نشاط 'meat'
        // = الداشبورد الحالي، أي نشاط تاني = المحرّك العام.
        let target = "/named-dashboard";
        if (data.user.isSuperAdmin) {
          target = "/select-company";
        } else if (data.user.company?.industry && data.user.company.industry !== "meat") {
          target = "/company-app";
        }
        // A short success beat (the scan ring ticks) before the workspace opens.
        setDone(true);
        setTimeout(() => navigate(target), 650);
        return;
      }
      const code = data.error === "subscription_lapsed" && data.company?.isTrial ? "trial_ended" : data.error;
      fail(t.err[code] || t.err.failed);
    } catch {
      fail(t.err.network);
    }

    setLoading(false);
  };

  const onPassKey = (e) => {
    if (typeof e.getModifierState === "function") setCaps(e.getModifierState("CapsLock"));
  };

  const rtl = lang === "ar";

  return (
    <main className="lp" dir={rtl ? "rtl" : "ltr"} lang={lang} data-theme={theme}>
      <style>{LP_CSS}{SC_CSS}</style>

      {/* ============ brand / marketing side ============ */}
      <aside className="lp-side" ref={sideRef} onMouseMove={onSideMove}>
        <div className="lp-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="lp-grid" aria-hidden="true" />
        <div className="lp-spot" aria-hidden="true" />
        <ScanRing className="lp-watermark" ring="rgba(255,255,255,0.05)" />

        <div className="lp-side-inner">
          <header className="lp-brand">
            <ScanRing className="lp-brand-mark" />
            <div>
              <div className="lp-word" dir="ltr">INSPECT <span>PRO</span></div>
              <div className="lp-tagline">{t.tagline}</div>
            </div>
          </header>

          <div className="lp-hero">
            <h1 className="lp-title">
              {t.heroA} <RotatingWord words={t.industries} />
            </h1>
            <p className="lp-sub">{t.heroB}</p>
          </div>

          <LoginShowcase lang={lang} labels={t} onDemo={(k) => { stat("cta", `tour-${k}`); navigate(`/demo?interest=${k}&lang=${lang}`); }} />

          <div className="lp-trust">
            {t.trust.map((x) => (
              <span key={x} className="lp-chip"><span className="lp-dot" />{x}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ============ sign-in side ============ */}
      <section className="lp-panel">
        <div className="lp-topbar">
          <span className={`lp-status ${server}`} role="status">
            <span className="lp-status-dot" />{t.status[server]}
          </span>
          <div className="lp-lang" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setLangOpen(false); }}>
            <button type="button" className="lp-tool" onClick={() => setLangOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={langOpen}>
              {LANGS.find((l) => l.v === lang).flag}
              <span>{LANGS.find((l) => l.v === lang).name}</span>
              <span className={`lp-caret${langOpen ? " up" : ""}`} aria-hidden="true">▾</span>
            </button>
            {langOpen && (
              <ul className="lp-lang-menu" role="listbox">
                <li className="lp-lang-h">{t.pickLang}</li>
                {LANGS.map((l) => (
                  <li key={l.v}>
                    <button type="button" role="option" aria-selected={l.v === lang} className={l.v === lang ? "on" : ""} onClick={() => switchLang(l.v)}>
                      {l.flag}
                      <span lang={l.v}>{l.name}</span>
                      {l.v === lang ? <span className="lp-tickm" aria-hidden="true">✓</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="lp-tool lp-tool-icon"
            onClick={switchTheme}
            aria-label={theme === "light" ? t.themeDark : t.themeLight}
            title={theme === "light" ? t.themeDark : t.themeLight}
          >
            <Ico name={theme === "light" ? "moon" : "sun"} />
          </button>
        </div>

        <div className="lp-card">
          <div className="lp-card-brand">
            <ScanRing className={`lp-card-mark${done ? " is-done" : ""}`} ring={theme === "dark" ? "#fff" : "#0B1E3F"} />
            <span className="lp-card-word" dir="ltr">INSPECT <b>PRO</b></span>
          </div>

          <div className="lp-card-head">
            <span className="lp-greet">{t.greet[greetIndex()]} 👋</span>
            <h2 className="lp-card-title">{t.welcome}</h2>
            <p className="lp-card-sub">{t.welcomeSub}</p>
          </div>

          <form onSubmit={handleSubmit} className={`lp-form${shake ? (shake % 2 ? " is-shake-a" : " is-shake-b") : ""}`} noValidate>
            <label className="lp-field">
              <span className="lp-label">{t.username}</span>
              <span className="lp-input-wrap">
                <Ico name="user" className="lp-ico lp-input-ico" />
                <input
                  className="lp-input"
                  type="text"
                  dir="ltr"
                  autoFocus={!username}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.usernamePh}
                />
              </span>
            </label>

            <label className="lp-field">
              <span className="lp-label">{t.password}</span>
              <span className="lp-input-wrap">
                <Ico name="lock" className="lp-ico lp-input-ico" />
                <input
                  ref={passRef}
                  className="lp-input lp-input-pass"
                  type={showPass ? "text" : "password"}
                  dir="ltr"
                  autoFocus={!!username}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={onPassKey}
                  onKeyDown={onPassKey}
                  onBlur={() => setCaps(false)}
                  placeholder={t.passwordPh}
                />
                <button
                  type="button"
                  className="lp-show"
                  onClick={() => { setShowPass((v) => !v); passRef.current?.focus(); }}
                  aria-label={showPass ? t.hide : t.show}
                  title={showPass ? t.hide : t.show}
                >
                  <Ico name={showPass ? "eyeOff" : "eye"} />
                </button>
              </span>
              {caps && <span className="lp-caps"><Ico name="caps" /> {t.capsOn}</span>}
            </label>

            <div className="lp-row">
              <label className="lp-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="lp-box" aria-hidden="true" />
                {t.remember}
              </label>
              <button type="button" className="lp-link" onClick={() => setShowForgot((v) => !v)} aria-expanded={showForgot}>
                {t.forgot}
              </button>
            </div>

            {showForgot && (
              <div className="lp-forgot" role="note">
                <Ico name="info" />
                <div>
                  <strong>{t.forgotTitle}</strong>
                  <span>{t.forgotText}</span>
                </div>
              </div>
            )}

            {error && <div className="lp-error" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className={`lp-submit${done ? " is-done" : ""}`}>
              {done ? (
                <><span className="lp-ok">✓</span> {t.success}</>
              ) : loading ? (
                <><span className="lp-spin" /> {t.signingIn}</>
              ) : (
                <>{t.signIn} <Ico name="arrow" className="lp-ico lp-arrow" /></>
              )}
            </button>
            <span className="lp-enter"><kbd>Enter ↵</kbd> {t.enter}</span>
          </form>

          <div className="lp-secure">
            <Ico name="shield" /> {t.secure}
          </div>

          <div className="lp-demo">
            <div className="lp-demo-glow" aria-hidden="true" />
            <div>
              <strong className="lp-demo-title">{t.newTitle}</strong>
              <span className="lp-demo-text">{t.newText}</span>
            </div>
            <button type="button" onClick={() => { stat("cta", "demo-button"); navigate("/demo"); }} className="lp-demo-btn">
              {t.demo}
            </button>
          </div>
        </div>

        <footer className="lp-footer">
          © {new Date().getFullYear()} INSPECT PRO · {t.built}
        </footer>
      </section>
    </main>
  );
}

// globals.css forces `#root * { font-size: 14px !important }`, so every size here
// is scoped under a doubled class (`.lp.lp`) with !important to out-rank it.
const LP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Cairo:wght@500;600;700;800&display=swap');

/* The page has its own light/dark switch (top), so the app-wide night filter stays off here. */
@media screen {
  html[data-theme="dark"]:has(main.lp) { filter: none !important; }
  html[data-theme="dark"]:has(main.lp) img { filter: none !important; }
}

#root .lp.lp {
  --navy: #0B1E3F; --teal: #0EA5A4; --teal-d: #0f766e;
  --bg: #f4f7fb; --panel: #ffffff; --ink: #0f172a; --ink-2: #334155; --muted: #64748b; --faint: #94a3b8;
  --field: #f8fafc; --field-b: #dbe4ef; --hover: #eef2f7; --heading: #0B1E3F;
  min-height: 100vh; box-sizing: border-box;
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(480px, 0.75fr);
  background: var(--bg); color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
#root .lp.lp[lang="ar"] { font-family: Cairo, system-ui, "Segoe UI", sans-serif; }
#root .lp.lp[data-theme="dark"] {
  --bg: #060f22; --panel: #0a1730; --ink: #e2e8f0; --ink-2: #cbd5e1; --muted: #94a3b8; --faint: #64748b;
  --field: #0f1f3d; --field-b: #22375c; --hover: #15284a; --heading: #f1f5f9;
}
#root .lp.lp * { box-sizing: border-box; }
#root .lp.lp form button[type="submit"] { display: inline-flex !important; }

/* ================= brand side ================= */
#root .lp.lp .lp-side {
  --mx: 50%; --my: 30%;
  position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(160deg, #06132b 0%, #0B1E3F 45%, #0b2f4a 100%);
  padding: clamp(28px, 3.2vw, 56px) clamp(24px, 3.4vw, 64px);
  display: flex; align-items: center;
}
#root .lp.lp .lp-aurora { position: absolute; inset: -20%; filter: blur(70px); opacity: .75; pointer-events: none; }
#root .lp.lp .lp-aurora i { position: absolute; border-radius: 50%; }
#root .lp.lp .lp-aurora i:nth-child(1) { width: 55%; height: 55%; left: 5%; top: 0; background: radial-gradient(circle, rgba(14,165,164,.55), transparent 65%); animation: lp-drift1 18s ease-in-out infinite; }
#root .lp.lp .lp-aurora i:nth-child(2) { width: 50%; height: 50%; right: 0; top: 30%; background: radial-gradient(circle, rgba(56,189,248,.35), transparent 65%); animation: lp-drift2 22s ease-in-out infinite; }
#root .lp.lp .lp-aurora i:nth-child(3) { width: 45%; height: 45%; left: 25%; bottom: 0; background: radial-gradient(circle, rgba(45,212,191,.30), transparent 65%); animation: lp-drift1 26s ease-in-out infinite reverse; }
#root .lp.lp .lp-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%);
          mask-image: radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%);
}
#root .lp.lp .lp-spot {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(420px circle at var(--mx) var(--my), rgba(94,234,212,.12), transparent 60%);
}
#root .lp.lp .lp-watermark { position: absolute; width: 620px; height: 620px; right: -180px; bottom: -200px; pointer-events: none; animation: lp-spin 80s linear infinite; }
#root .lp.lp[dir="rtl"] .lp-watermark { right: auto; left: -180px; }
#root .lp.lp .lp-watermark .lp-arc, #root .lp.lp .lp-watermark .lp-check { stroke: rgba(14,165,164,0.12); }
#root .lp.lp .lp-side-inner {
  position: relative; z-index: 1; width: min(1180px, 100%); margin: 0 auto;
  display: flex; flex-direction: column; gap: clamp(20px, 3vh, 34px);
}
#root .lp.lp .lp-brand { display: flex; align-items: center; gap: 16px; animation: lp-up .7s both; }
#root .lp.lp .lp-brand-mark { width: 64px; height: 64px; flex-shrink: 0; filter: drop-shadow(0 6px 18px rgba(14,165,164,.45)); }
#root .lp.lp .lp-brand-mark .lp-arc { animation: lp-pulse 2.8s ease-in-out infinite; }
#root .lp.lp .lp-word {
  font-family: Montserrat, system-ui, sans-serif; font-weight: 900;
  font-size: calc(34px * var(--app-fs, 1)) !important; letter-spacing: 0.03em; line-height: 1;
}
#root .lp.lp .lp-word span { color: var(--teal); font-size: inherit !important; }
#root .lp.lp .lp-tagline {
  margin-top: 8px; font-weight: 700; letter-spacing: 0.22em; color: #9fb3cf;
  font-size: calc(13px * var(--app-fs, 1)) !important;
}
#root .lp.lp[lang="ar"] .lp-tagline { letter-spacing: 0; font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-hero { max-width: 980px; animation: lp-up .7s .08s both; }
#root .lp.lp .lp-title {
  margin: 0; font-weight: 900; line-height: 1.12; letter-spacing: -0.02em;
  font-size: calc(clamp(34px, 3.4vw, 56px) * var(--app-fs, 1)) !important;
}
#root .lp.lp[lang="ar"] .lp-title { letter-spacing: 0; line-height: 1.35; }
#root .lp.lp .lp-rot { display: inline-block; position: relative; vertical-align: bottom; font-size: inherit !important; }
#root .lp.lp .lp-rot-word {
  display: inline-block; font-size: inherit !important;
  background: linear-gradient(90deg, #5eead4, #38bdf8 60%, #a5f3fc); -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: lp-word .6s cubic-bezier(.2,.7,.2,1) both;
}
#root .lp.lp .lp-sub { margin: 14px 0 0; color: #c3d1e6; line-height: 1.6; font-weight: 500; font-size: calc(clamp(17px, 1.3vw, 21px) * var(--app-fs, 1)) !important; }
#root .lp.lp .sc { animation: lp-up .7s .16s both; }
#root .lp.lp .lp-trust { display: flex; flex-wrap: wrap; gap: 10px; animation: lp-up .7s .24s both; }
#root .lp.lp .lp-chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 999px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(6px);
  color: #dbe6f5; font-weight: 600; font-size: calc(15px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-dot { width: 7px; height: 7px; border-radius: 50%; background: #2dd4bf; box-shadow: 0 0 0 3px rgba(45,212,191,0.2); }

/* ================= sign-in side ================= */
#root .lp.lp .lp-panel {
  position: relative; background: var(--panel);
  display: flex; flex-direction: column; align-items: center;
  padding: 20px clamp(24px, 3.4vw, 64px) 18px;
  box-shadow: -30px 0 80px rgba(6,19,43,.25);
  transition: background .3s;
}
#root .lp.lp .lp-topbar { width: 100%; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
#root .lp.lp .lp-status {
  margin-inline-end: auto; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
  background: var(--field); border: 1px solid var(--field-b); color: var(--muted); font-weight: 700;
  font-size: calc(14px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-status-dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; }
#root .lp.lp .lp-status-dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: inherit; animation: lp-ring 1.8s ease-out infinite; }
#root .lp.lp .lp-status.up { color: #047857; }
#root .lp.lp .lp-status.up .lp-status-dot { background: #10b981; }
#root .lp.lp .lp-status.down { color: #b91c1c; }
#root .lp.lp .lp-status.down .lp-status-dot { background: #ef4444; }
#root .lp.lp[data-theme="dark"] .lp-status.up { color: #6ee7b7; }
#root .lp.lp[data-theme="dark"] .lp-status.down { color: #fca5a5; }
#root .lp.lp .lp-greet { display: block; margin-bottom: 6px; color: var(--teal); font-weight: 800; letter-spacing: .02em; font-size: calc(18px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-enter { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: -6px; color: var(--faint); font-weight: 600; font-size: calc(14px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-enter kbd {
  padding: 2px 7px; border-radius: 6px; border: 1px solid var(--field-b); border-bottom-width: 2px;
  background: var(--field); color: var(--ink-2); font-family: inherit; font-weight: 800; font-size: calc(11px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-tool {
  display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 12px;
  font-size: calc(15px * var(--app-fs, 1)) !important;
  border: 1px solid var(--field-b); background: transparent; color: var(--ink-2); cursor: pointer;
  font-family: inherit; font-weight: 700; transition: background .15s, color .15s;
}
#root .lp.lp .lp-tool:hover { background: var(--hover); color: var(--teal); }
#root .lp.lp .lp-lang { position: relative; }
#root .lp.lp .lp-flag { width: 24px; height: 16px; flex-shrink: 0; border-radius: 3px; box-shadow: 0 0 0 1px rgba(15,23,42,.12); display: block; }
#root .lp.lp .lp-caret { transition: transform .2s; font-size: calc(11px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-caret.up { transform: rotate(180deg); }
#root .lp.lp .lp-lang-menu {
  position: absolute; z-index: 20; top: calc(100% + 8px); inset-inline-end: 0; min-width: 200px;
  list-style: none; margin: 0; padding: 6px; border-radius: 14px;
  background: var(--panel); border: 1px solid var(--field-b); box-shadow: 0 20px 50px rgba(6,19,43,.25);
  animation: lp-up .2s both;
}
#root .lp.lp .lp-lang-menu::before {
  content: ""; position: absolute; top: -6px; inset-inline-end: 22px; width: 10px; height: 10px; transform: rotate(45deg);
  background: var(--panel); border-left: 1px solid var(--field-b); border-top: 1px solid var(--field-b);
}
#root .lp.lp .lp-lang-h { padding: 8px 10px 6px; color: var(--muted); font-weight: 800; font-size: calc(12px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-lang-menu button {
  width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px; border: 0; border-radius: 10px;
  background: transparent; color: var(--ink); cursor: pointer; font-family: Cairo, system-ui, sans-serif; font-weight: 700; text-align: start;
}
#root .lp.lp .lp-lang-menu button:hover { background: var(--hover); }
#root .lp.lp .lp-lang-menu button.on { color: var(--teal); }
#root .lp.lp .lp-tickm { margin-inline-start: auto; font-weight: 900; }
#root .lp.lp .lp-tool-icon { width: 44px; padding: 0; justify-content: center; }
#root .lp.lp .lp-tool span { font-family: Cairo, Montserrat, system-ui, sans-serif; }

#root .lp.lp .lp-card {
  width: min(540px, 100%); margin: auto 0; padding: 24px 0;
  display: flex; flex-direction: column; animation: lp-up .7s .1s both;
}
#root .lp.lp .lp-card-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
#root .lp.lp .lp-card-mark { width: 54px; height: 54px; }
#root .lp.lp .lp-card-mark .lp-check { stroke-dasharray: 60; stroke-dashoffset: 0; }
#root .lp.lp .lp-card-mark.is-done .lp-check { animation: lp-tick .6s ease both; }
#root .lp.lp .lp-card-mark.is-done .lp-arc { animation: lp-spin .6s linear; transform-origin: 52px 52px; }
#root .lp.lp .lp-card-word { font-family: Montserrat, system-ui, sans-serif; font-weight: 900; letter-spacing: .03em; color: var(--heading); font-size: calc(24px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-card-word b { color: var(--teal); font-size: inherit !important; }
#root .lp.lp .lp-card-head { margin-bottom: 26px; }
#root .lp.lp .lp-card-title { margin: 0; font-weight: 900; color: var(--heading); letter-spacing: -.01em; font-size: calc(42px * var(--app-fs, 1)) !important; line-height: 1.15; }
#root .lp.lp .lp-card-sub { margin: 10px 0 0; color: var(--muted); font-weight: 500; font-size: calc(18px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-form { display: grid; gap: 20px; }
#root .lp.lp .lp-form.is-shake-a { animation: lp-shake .45s; }
#root .lp.lp .lp-form.is-shake-b { animation: lp-shake2 .45s; }
#root .lp.lp .lp-field { display: grid; gap: 8px; }
#root .lp.lp .lp-label { color: var(--ink-2); font-weight: 700; font-size: calc(16px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-input-wrap { position: relative; display: block; }
#root .lp.lp .lp-input-ico { position: absolute; inset-inline-start: 15px; top: 50%; transform: translateY(-50%); color: var(--faint); pointer-events: none; transition: color .15s; }
#root .lp.lp .lp-input {
  width: 100%; min-height: 62px; margin: 0;
  padding: 14px 18px; padding-inline-start: 52px; border-radius: 14px;
  border: 1.5px solid var(--field-b); background: var(--field); color: var(--ink);
  font-family: inherit; font-weight: 600; box-shadow: none; text-align: start;
  font-size: calc(18px * var(--app-fs, 1)) !important;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
#root .lp.lp[dir="rtl"] .lp-input { text-align: right; }
#root .lp.lp .lp-input::placeholder { color: var(--faint); font-weight: 500; }
#root .lp.lp .lp-input-pass { padding-inline-end: 56px; }
#root .lp.lp .lp-input:focus { outline: none; border-color: var(--teal); background: var(--panel); box-shadow: 0 0 0 4px rgba(14,165,164,0.18); }
#root .lp.lp .lp-input-wrap:focus-within .lp-input-ico { color: var(--teal); }
#root .lp.lp .lp-show {
  position: absolute; inset-inline-end: 8px; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; border-radius: 10px; border: none; background: transparent;
  color: var(--muted); cursor: pointer; display: grid; place-items: center;
}
#root .lp.lp .lp-show:hover { background: var(--hover); color: var(--teal); }
#root .lp.lp .lp-ico { width: 22px; height: 22px; display: block; flex-shrink: 0; }
#root .lp.lp .lp-caps { display: inline-flex; align-items: center; gap: 6px; color: #b45309; font-weight: 700; font-size: calc(14.5px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-caps .lp-ico { width: 16px; height: 16px; }
#root .lp.lp .lp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: -4px; }
#root .lp.lp .lp-remember { position: relative; display: inline-flex; align-items: center; gap: 10px; color: var(--ink-2); font-weight: 600; font-size: calc(15.5px * var(--app-fs, 1)) !important; cursor: pointer; user-select: none; }
#root .lp.lp .lp-remember input { position: absolute; opacity: 0; width: 1px; height: 1px; }
#root .lp.lp .lp-box { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--field-b); background: var(--field); display: grid; place-items: center; transition: background .15s, border-color .15s; }
#root .lp.lp .lp-remember input:checked + .lp-box { background: var(--teal); border-color: var(--teal); }
#root .lp.lp .lp-remember input:checked + .lp-box::after { content: "✓"; color: #fff; font-weight: 900; font-size: calc(12px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-remember input:focus-visible + .lp-box { box-shadow: 0 0 0 4px rgba(14,165,164,0.25); }
#root .lp.lp .lp-link { border: 0; background: none; padding: 4px 0; cursor: pointer; color: var(--teal); font-family: inherit; font-weight: 700; font-size: calc(15.5px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-link:hover { text-decoration: underline; }
#root .lp.lp .lp-forgot {
  display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px; animation: lp-up .35s both;
  background: rgba(14,165,164,.08); border: 1px solid rgba(14,165,164,.3); color: var(--ink-2); line-height: 1.5;
}
#root .lp.lp .lp-forgot .lp-ico { color: var(--teal); margin-top: 2px; }
#root .lp.lp .lp-forgot strong { display: block; color: var(--heading); }
#root .lp.lp .lp-forgot span { display: block; font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-error {
  padding: 12px 14px; border-radius: 12px;
  background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; font-weight: 700; line-height: 1.4; font-size: calc(15.5px * var(--app-fs, 1)) !important;
}
#root .lp.lp[data-theme="dark"] .lp-error { background: rgba(239,68,68,.12); color: #fecaca; border-color: rgba(239,68,68,.35); }
#root .lp.lp .lp-submit {
  position: relative; overflow: hidden;
  min-height: 64px; width: 100%; border-radius: 14px; border: none;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  background: linear-gradient(135deg, #0B1E3F, #0f766e 65%, #0EA5A4);
  background-size: 180% 100%; background-position: 0 0;
  color: #fff; cursor: pointer; font-weight: 800; font-family: inherit;
  font-size: calc(19px * var(--app-fs, 1)) !important;
  box-shadow: 0 16px 34px rgba(11,30,63,0.25);
  transition: transform .16s, box-shadow .16s, background-position .4s, opacity .16s;
}
#root .lp.lp .lp-submit::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent);
  animation: lp-shine 3.6s 1.2s ease-in-out infinite;
}
#root .lp.lp .lp-submit:not(:disabled):hover { transform: translateY(-2px); background-position: 100% 0; box-shadow: 0 22px 44px rgba(14,165,164,0.35); }
#root .lp.lp .lp-submit:disabled { cursor: progress; }
#root .lp.lp .lp-submit.is-done { background: linear-gradient(135deg, #059669, #10b981); }
#root .lp.lp .lp-arrow { transition: transform .16s; }
#root .lp.lp[dir="rtl"] .lp-arrow { transform: scaleX(-1); }
#root .lp.lp .lp-submit:hover .lp-arrow { transform: translateX(4px); }
#root .lp.lp[dir="rtl"] .lp-submit:hover .lp-arrow { transform: scaleX(-1) translateX(4px); }
#root .lp.lp .lp-ok { width: 24px; height: 24px; border-radius: 50%; background: #fff; color: #059669; display: grid; place-items: center; font-weight: 900; animation: lp-pop .4s both; }
#root .lp.lp .lp-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff;
  animation: lp-spin .8s linear infinite;
}
#root .lp.lp .lp-secure {
  margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 7px; text-align: center;
  color: var(--muted); font-weight: 500; font-size: calc(14.5px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-secure .lp-ico { width: 15px; height: 15px; color: var(--teal); }
#root .lp.lp .lp-demo {
  position: relative; overflow: hidden;
  margin-top: 26px; padding: 20px 22px; border-radius: 18px;
  background: linear-gradient(135deg, #0B1E3F, #0c3550);
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  box-shadow: 0 14px 30px rgba(11,30,63,.2);
}
#root .lp.lp .lp-demo > * { position: relative; }
#root .lp.lp .lp-demo-glow { position: absolute !important; inset: 0; background: radial-gradient(260px 120px at 100% 0%, rgba(14,165,164,.45), transparent 70%); }
#root .lp.lp[dir="rtl"] .lp-demo-glow { background: radial-gradient(260px 120px at 0% 0%, rgba(14,165,164,.45), transparent 70%); }
#root .lp.lp .lp-demo-title { display: block; color: #fff; font-weight: 800; font-size: calc(18px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-demo-text { display: block; margin-top: 4px; color: #b6c6dd; font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-demo-btn {
  min-height: 48px; padding: 0 20px; border-radius: 12px; border: 0; font-size: calc(16px * var(--app-fs, 1)) !important;
  background: #fff; color: var(--navy); cursor: pointer; font-weight: 800; font-family: inherit; white-space: nowrap;
  transition: transform .15s, box-shadow .15s, background .15s, color .15s;
}
#root .lp.lp .lp-demo-btn:hover { background: var(--teal); color: #fff; transform: translateY(-1px); box-shadow: 0 10px 22px rgba(14,165,164,.4); }
#root .lp.lp .lp-footer { text-align: center; color: var(--faint); font-weight: 500; font-size: calc(14px * var(--app-fs, 1)) !important; }

@keyframes lp-spin { to { transform: rotate(360deg); } }
@keyframes lp-ring { from { transform: scale(1); opacity: .7; } to { transform: scale(3); opacity: 0; } }
@keyframes lp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
@keyframes lp-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes lp-word { from { opacity: 0; transform: translateY(60%); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes lp-drift1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(12%, 10%) scale(1.15); } }
@keyframes lp-drift2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-14%, -8%) scale(1.1); } }
@keyframes lp-shine { 0% { left: -60%; } 40%, 100% { left: 130%; } }
@keyframes lp-shake { 0%, 100% { transform: none; } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
@keyframes lp-shake2 { 0%, 100% { transform: none; } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
@keyframes lp-tick { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
@keyframes lp-pop { from { transform: scale(0); } 70% { transform: scale(1.2); } to { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  #root .lp.lp *, #root .lp.lp *::before, #root .lp.lp *::after { animation: none !important; transition: none !important; }
}

@media (max-width: 1100px) {
  #root .lp.lp { grid-template-columns: 1fr; }
  #root .lp.lp .lp-panel { order: -1; box-shadow: none; min-height: 100vh; }
  #root .lp.lp .lp-side { padding: 40px 24px; }
}
@media (max-width: 560px) {
  #root .lp.lp .lp-enter { display: none; }
  #root .lp.lp .lp-status { font-size: calc(11px * var(--app-fs, 1)) !important; }
  #root .lp.lp .lp-panel { padding: 14px 16px; }
  #root .lp.lp .lp-card { padding: 16px 0; }
  #root .lp.lp .lp-card-title { font-size: calc(26px * var(--app-fs, 1)) !important; }
  #root .lp.lp .lp-side { padding: 32px 16px; }
  #root .lp.lp .lp-word { font-size: calc(22px * var(--app-fs, 1)) !important; }
  #root .lp.lp .lp-title { font-size: calc(26px * var(--app-fs, 1)) !important; }
}
`;

export default Login;
