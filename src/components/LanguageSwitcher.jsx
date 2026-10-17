// src/components/LanguageSwitcher.jsx
// The one language switch for Al Mawashi: a round button, fixed bottom-left
// above the "Aa" and day/night buttons (same size and look, same 48px step),
// on every signed-in page. It shows the language a tap switches TO
// ("ع" while in English, "EN" while in Arabic).
// It changes the ACCOUNT's language for every section at once
// (utils/appLang.js). Mounted once in App.jsx; other companies don't see it.
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAppLang, setAppLang, onAppLang, isUnifiedLang } from "../utils/appLang";

// Pages outside an account (login, sales, public links) keep their own switch.
const PUBLIC_PAGES = ["/", "/demo", "/readiness", "/subscription-expired"];
const PUBLIC_PREFIXES = [
  "/ref/", "/t/", "/training/quiz/", "/training/verify", "/sweets-training/",
  "/supplier-approval/", "/supplier-evaluation/", "/inspection/evidence/", "/menu-nutrition",
];

// globals.css forces `#root *` font sizes with !important — a doubled class
// out-ranks it (same trick as AccessibilityMenu).
const CSS = `
#root .lsw.lsw { font-size: 15px !important; font-weight: 800; }
#root .lsw.lsw[lang="ar"] { font-size: 19px !important; }
.lsw { position: fixed; bottom: 110px; left: 14px; z-index: 9990; width: 40px; height: 40px; padding: 0;
  border-radius: 50%; border: 1px solid rgba(15,23,42,.15); background: #fff; color: #1e3a5f;
  box-shadow: 0 4px 14px rgba(15,23,42,.22); cursor: pointer; display: grid; place-items: center;
  font-family: inherit; line-height: 1; opacity: .9; transition: transform .15s, opacity .15s; }
.lsw:hover { opacity: 1; transform: scale(1.06); }
.lsw:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
@media print { .lsw { display: none !important; } }
`;

export default function LanguageSwitcher() {
  const { pathname } = useLocation();
  const [lang, setLang] = useState(getAppLang);
  const [, setTick] = useState(0);

  useEffect(() => {
    const off = onAppLang(setLang);
    // The super-admin switching company turns the switch on/off.
    const onCompany = () => { setLang(getAppLang()); setTick((n) => n + 1); };
    window.addEventListener("app:active-company-changed", onCompany);
    return () => { off(); window.removeEventListener("app:active-company-changed", onCompany); };
  }, []);

  // Re-read after navigation (a fresh login lands on a new route).
  useEffect(() => { setLang(getAppLang()); }, [pathname]);

  if (PUBLIC_PAGES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!isUnifiedLang()) return null;

  const next = lang === "ar" ? "en" : "ar";
  const label = next === "ar" ? "التبديل إلى العربية" : "Switch to English";

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className="lsw lsw"
        lang={next}
        onClick={() => setAppLang(next)}
        title={label}
        aria-label={label}
      >
        {next === "ar" ? "ع" : "EN"}
      </button>
    </>
  );
}
