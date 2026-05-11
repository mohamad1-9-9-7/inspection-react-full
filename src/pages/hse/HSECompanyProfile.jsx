// src/pages/hse/HSECompanyProfile.jsx
// 🏛️ Company Profile — يدمج Vision/Mission + Org Structure في صفحة واحدة بتبويبين

import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  HSE_COLORS, useHSELang, HSELangToggle,
} from "./hseShared";
import HSEVisionMission from "./HSEVisionMission";
import HSEOrgStructure from "./HSEOrgStructure";

const T = {
  pageTitle:  { ar: "🏛️ ملف الشركة", en: "🏛️ Company Profile" },
  subtitle:   { ar: "الإطار الاستراتيجي + الهيكل التنظيمي لقسم HSE", en: "Strategic framework + organizational structure" },
  back:       { ar: "← HSE", en: "← HSE" },
  vision:     { ar: "🎯 الرؤية والرسالة والأهداف", en: "🎯 Vision, Mission & Goals" },
  org:        { ar: "🏢 الهيكل التنظيمي والأدوار", en: "🏢 Org Structure & Roles" },
};

export default function HSECompanyProfile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lang, toggle, dir, pick } = useHSELang();

  const initialTab = params.get("tab") === "org" ? "org" : "vision";
  const [tab, setTab] = useState(initialTab);

  function changeTab(t) {
    setTab(t);
    setParams({ tab: t }, { replace: true });
  }

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          padding: 6,
          background: "rgba(255,255,255,0.96)",
          borderRadius: 999,
          border: "1px solid rgba(120, 53, 15, 0.12)",
          width: "fit-content",
        }}>
          <button
            style={tab === "vision" ? buttonPrimary : buttonGhost}
            onClick={() => changeTab("vision")}
          >
            {pick(T.vision)}
          </button>
          <button
            style={tab === "org" ? buttonPrimary : buttonGhost}
            onClick={() => changeTab("org")}
          >
            {pick(T.org)}
          </button>
        </div>

        {/* Tab content — render the existing pages inside (their page wrappers will overlap visually,
            but functionally they render the content correctly) */}
        <div style={{ marginTop: -22 /* offset their pageStyle padding */ }}>
          {tab === "vision" && <HSEVisionMission embedded />}
          {tab === "org" && <HSEOrgStructure embedded />}
        </div>
      </div>
    </main>
  );
}
