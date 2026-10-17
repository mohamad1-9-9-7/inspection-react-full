// src/components/LanguageSwitcher.jsx
// The one language switch for Al Mawashi: a small عربي | EN pill, fixed
// bottom-left above the "Aa" and day/night buttons, on every signed-in page.
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
#root .lsw.lsw, #root .lsw.lsw * { font-size: 13px !important; font-weight: 800; }
.lsw { position: fixed; bottom: 110px; left: 14px; z-index: 9990; display: flex; flex-direction: column;
  border-radius: 14px; overflow: hidden; border: 1px solid rgba(15,23,42,.15); background: #fff;
  box-shadow: 0 4px 14px rgba(15,23,42,.22); opacity: .92; }
.lsw:hover { opacity: 1; }
.lsw button { width: 40px; height: 30px; border: none; background: transparent; color: #1e3a5f;
  cursor: pointer; padding: 0; font-family: inherit; line-height: 1; }
.lsw button + button { border-top: 1px solid #e2e8f0; }
.lsw button[aria-pressed="true"] { background: #0ea5e9; color: #fff; }
.lsw button:focus-visible { outline: 3px solid #38bdf8; outline-offset: -3px; }
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

  const pick = (l) => { if (l !== lang) setAppLang(l); };

  return (
    <div className="lsw" role="group" aria-label="Language / اللغة">
      <style>{CSS}</style>
      <button type="button" lang="ar" aria-pressed={lang === "ar"} onClick={() => pick("ar")} title="العربية">
        ع
      </button>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => pick("en")} title="English">
        EN
      </button>
    </div>
  );
}
