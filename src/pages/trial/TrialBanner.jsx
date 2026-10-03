// src/pages/trial/TrialBanner.jsx
// The bar every screen of a TRIAL company shows (mounted once in App.jsx).
// It cannot be closed: the visitor must keep seeing that nothing typed into a
// trial is kept, and how many days are left. Signed-out pages, the public
// pages and non-trial accounts render nothing.

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { currentTrial } from "./trialSession";
import { SETTINGS_LANG_KEY } from "../settings/_shared/settingsI18n";

const PUBLIC = ["/", "/demo", "/readiness", "/subscription-expired"];

/* The language the visitor signed up in on /demo, else the Settings language. */
function langNow(trial) {
  try {
    const l = trial?.lang || localStorage.getItem(SETTINGS_LANG_KEY) || "en";
    return String(l).startsWith("ar") ? "ar" : "en";
  } catch {
    return "en";
  }
}

const TXT = {
  en: {
    left: (n) => (n <= 1 ? "Free trial — last day" : `Free trial — ${n} days left`),
    note: "Nothing here is saved: all data will be deleted and cannot be recovered.",
    cta: "Subscribe",
  },
  ar: {
    left: (n) => (n <= 1 ? "تجربة مجانية — آخر يوم" : n === 2 ? "تجربة مجانية — باقي يومان" : `تجربة مجانية — باقي ${n} أيام`),
    note: "لا يُحفظ شيء هنا: ستُحذف جميع البيانات ولا يمكن استعادتها.",
    cta: "اشترك الآن",
  },
};

const S = {
  bar: {
    position: "fixed", insetInline: 0, bottom: 0, zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px 14px", flexWrap: "wrap",
    padding: "9px 16px calc(9px + env(safe-area-inset-bottom))",
    background: "linear-gradient(90deg,#7c2d12,#c2410c)", color: "#fff",
    boxShadow: "0 -6px 20px rgba(0,0,0,.18)", fontFamily: "inherit", lineHeight: 1.45, textAlign: "center",
  },
  left: { fontWeight: 900 },
  note: { fontWeight: 600, opacity: 0.95 },
  cta: {
    color: "#7c2d12", background: "#fff", borderRadius: 999, padding: "5px 14px",
    fontWeight: 900, textDecoration: "none", whiteSpace: "nowrap",
  },
};

export default function TrialBanner() {
  const { pathname } = useLocation();
  const [trial, setTrial] = useState(currentTrial);

  // Re-read on navigation (sign-in / sign-out happen on other routes).
  useEffect(() => { setTrial(currentTrial()); }, [pathname]);

  // Keep the last screen row clear of the bar.
  const show = !!trial && !PUBLIC.includes(pathname);
  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "64px";
    return () => { document.body.style.paddingBottom = prev; };
  }, [show]);

  if (!show) return null;
  const lang = langNow(trial);
  const t = TXT[lang];
  const days = trial.daysLeft ?? 0;
  return (
    <div style={S.bar} role="status" dir={lang === "ar" ? "rtl" : "ltr"} data-trial-banner="">
      <span style={S.left}>⏳ {t.left(days)}</span>
      <span style={S.note}>{t.note}</span>
      <a href="/demo#demo-form" style={S.cta}>{t.cta}</a>
    </div>
  );
}
