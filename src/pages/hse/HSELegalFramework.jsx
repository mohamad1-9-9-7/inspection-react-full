// src/pages/hse/HSELegalFramework.jsx
// الإطار القانوني والتنظيمي

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, HSE_COLORS, tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  title:    { ar: "⚖️ الإطار القانوني والتنظيمي", en: "⚖️ Legal & Regulatory Framework" },
  subtitle: { ar: "التشريعات الاتحادية والمحلية + المعايير الدولية المستهدفة",
              en: "Federal & local legislation + targeted international standards" },
  pageIntro: {
    ar: "يجب أن يعمل قسم HSE ضمن منظومة متكاملة من التشريعات والمتطلبات في دولة الإمارات العربية المتحدة. أي إخلال بها قد يؤدي إلى غرامات مالية، إيقاف نشاط، إغلاق المنشأة، أو حتى مسؤولية جنائية على الإدارة. هذه الصفحة تجمع التشريعات الاتحادية الرئيسية، الجهات الرقابية في إمارة دبي، والمعايير الدولية المستهدفة مع شرح أثرها على عمليات الشركة. يجب على مدير HSE معرفة كل بند منها وتحديث الفريق بأي تعديلات حكومية.",
    en: "The HSE department must operate within an integrated framework of UAE legislation and requirements. Any breach can lead to fines, activity suspension, facility closure, or even criminal liability on management. This page brings together the main federal legislation, Dubai regulatory bodies, and targeted international standards — explaining their impact on company operations. The HSE Manager must understand every clause and update the team on any government changes.",
  },
  back:     { ar: "← HSE", en: "← HSE" },
  banTitle: { ar: "⛔ الحظر الصيفي للعمل تحت الشمس", en: "⛔ Summer Midday Work Ban" },
  period:   { ar: "📅 الفترة:", en: "📅 Period:" },
  banPeriod:{ ar: "15 يونيو – 15 سبتمبر", en: "15 Jun – 15 Sep" },
  banHours: { ar: "🕐 الساعات المحظورة:", en: "🕐 Banned hours:" },
  banHoursVal: { ar: "12:30 ظهراً – 3:00 عصراً", en: "12:30 PM – 3:00 PM" },
  banDesc:  {
    ar: "إلزامي بقرار MOHRE — عدم العمل في الأماكن المكشوفة خلال هذه الفترة. مهم لأنشطة التحميل والتفريغ في فناء الاستلام والشحن.",
    en: "Mandated by MOHRE decree — outdoor work prohibited during this period. Critical for loading/unloading at the receiving and dispatch yards.",
  },
  tabFederal: { ar: "🇦🇪 الاتحادي (UAE Federal)", en: "🇦🇪 UAE Federal" },
  tabDubai:   { ar: "🏙️ دبي (Local)", en: "🏙️ Dubai (Local)" },
  tabIso:     { ar: "🌐 المعايير الدولية", en: "🌐 International Standards" },
  federalTitle: { ar: "📜 التشريعات الاتحادية", en: "📜 Federal Legislation" },
  colLaw:    { ar: "التشريع", en: "Legislation" },
  colImpact: { ar: "الأثر على الشركة", en: "Impact on the Company" },
  priorityCritical: { ar: "🔴 حرج", en: "🔴 Critical" },
  priorityHigh:     { ar: "🟠 عالٍ", en: "🟠 High" },
  priorityMedium:   { ar: "🟡 متوسط", en: "🟡 Medium" },
  priorityActive:   { ar: "✅ مُطبَّق حالياً", en: "✅ Currently active" },
};

const FEDERAL_LAWS = [
  { law: { ar: "المرسوم بقانون اتحادي رقم (33) لسنة 2021 بشأن تنظيم علاقات العمل", en: "Federal Decree-Law No. 33 of 2021 on Labour Relations" },
    impact: { ar: "يُلزم صاحب العمل بتوفير بيئة آمنة وصحية وتدريب العمال على مخاطر المهنة.", en: "Obliges employers to provide a safe, healthy environment and train workers on occupational hazards." } },
  { law: { ar: "القرار الوزاري رقم (32) لسنة 1982 بشأن الوقاية من مخاطر المهنة", en: "Ministerial Resolution No. 32 of 1982 on Occupational Hazard Prevention" },
    impact: { ar: "يُحدّد متطلبات معدات الوقاية الشخصية (PPE) والتهوية والإضاءة والسلامة من الحرائق.", en: "Defines requirements for PPE, ventilation, lighting, and fire safety." } },
  { law: { ar: "المرسوم بقانون اتحادي رقم (10) لسنة 2015 بشأن الصحة العامة", en: "Federal Decree-Law No. 10 of 2015 on Public Health" },
    impact: { ar: "يضع قواعد سلامة الغذاء ومسؤوليات المنشآت الغذائية.", en: "Sets food safety rules and responsibilities of food establishments." } },
  { law: { ar: "القانون الاتحادي رقم (24) لسنة 1999 بشأن حماية البيئة", en: "Federal Law No. 24 of 1999 on Environmental Protection" },
    impact: { ar: "ينظم التعامل مع النفايات، الانبعاثات، والمواد الخطرة.", en: "Governs handling of waste, emissions, and hazardous materials." } },
  { law: { ar: "نظام دولة الإمارات للحلال (UAE.S 2055-1)", en: "UAE Halal Standard (UAE.S 2055-1)" },
    impact: { ar: "متطلبات إلزامية لاستيراد ومعالجة اللحوم الحلال.", en: "Mandatory requirements for importing and processing Halal meat." } },
  { law: { ar: "اللائحة الخليجية الموحدة (GSO 9/2013)", en: "GCC Standardization (GSO 9/2013)" },
    impact: { ar: "وضع بطاقة البيانات على المواد الغذائية المعبأة.", en: "Labeling of pre-packaged food products." } },
];

const DUBAI_AUTHORITIES = [
  { authority: { ar: "بلدية دبي – إدارة سلامة الغذاء", en: "Dubai Municipality – Food Safety Department" }, icon: "🏛️",
    reqs: { ar: "ترخيص المنشأة، شهادة HACCP، برنامج مكافحة الحشرات، سجلات درجات الحرارة، الفحوصات الدورية، شهادات صحية للعاملين (بطاقة صحية).",
            en: "Establishment license, HACCP cert, pest control program, temperature logs, periodic inspections, employee health cards." } },
  { authority: { ar: "بلدية دبي – قسم النفايات", en: "Dubai Municipality – Waste Department" }, icon: "🗑️",
    reqs: { ar: "نظام فصل النفايات العضوية، عقد مع شركة مرخصة لنقل النفايات، سجلات التخلص من الزيوت ومخلفات اللحوم.",
            en: "Organic waste segregation, contract with licensed waste carrier, oil and meat waste disposal records." } },
  { authority: { ar: "الدفاع المدني بدبي", en: "Dubai Civil Defence" }, icon: "🚒",
    reqs: { ar: "شهادة سلامة المبنى، نظام إنذار وإطفاء، مخارج طوارئ، خطة إخلاء، تدريب فريق الإطفاء الداخلي.",
            en: "Building safety certificate, alarm & firefighting systems, emergency exits, evacuation plan, internal fire team training." } },
  { authority: { ar: "وزارة الموارد البشرية والتوطين (MOHRE)", en: "Ministry of Human Resources & Emiratisation (MOHRE)" }, icon: "👷",
    reqs: { ar: "تسجيل إصابات العمل، ساعات الحظر الصيفي للعمل تحت الشمس (15 يونيو – 15 سبتمبر)، سكن العمال.",
            en: "Workplace injury registration, summer midday ban (15 Jun – 15 Sep), workers' accommodation." } },
  { authority: { ar: "هيئة المواصفات والمقاييس (ESMA / MoIAT)", en: "Standards Authority (ESMA / MoIAT)" }, icon: "✅",
    reqs: { ar: "مطابقة المنتجات للمواصفات الإماراتية، شهادات Halal، شهادات الاستيراد.",
            en: "Conformity to UAE standards, Halal certificates, import certificates." } },
  { authority: { ar: "وزارة التغير المناخي والبيئة (MoCCAE)", en: "Ministry of Climate Change & Environment (MoCCAE)" }, icon: "🌍",
    reqs: { ar: "تسجيل المنشآت المتعاملة مع غازات التبريد، الإبلاغ عن الانبعاثات، التخلص الآمن من الغازات المستنفدة للأوزون.",
            en: "Registration of refrigerant-handling facilities, emissions reporting, safe disposal of ozone-depleting gases." } },
];

const ISO_STANDARDS = [
  { code: "ISO 45001:2018",            title: { ar: "نظام إدارة الصحة والسلامة المهنية", en: "Occupational Health & Safety Management" }, priority: "high",     color: "#fed7aa" },
  { code: "ISO 14001:2015",            title: { ar: "نظام إدارة البيئة",                  en: "Environmental Management" },                priority: "medium",   color: "#dcfce7" },
  { code: "ISO 22000:2018 / FSSC 22000",title:{ ar: "نظام إدارة سلامة الغذاء",            en: "Food Safety Management" },                  priority: "critical", color: "#fee2e2" },
  { code: "HACCP",                     title: { ar: "تحليل المخاطر ونقاط التحكم الحرجة (قائم حالياً)", en: "Hazard Analysis & Critical Control Points (active)" }, priority: "active", color: "#dbeafe" },
  { code: "BRCGS Food Safety",         title: { ar: "معيار متقدم مطلوب لبعض الأسواق الأوروبية", en: "Advanced standard required for some European markets" }, priority: "medium", color: "#e9d5ff" },
  { code: "GMP",                       title: { ar: "ممارسات التصنيع الجيدة (Good Manufacturing Practices)", en: "Good Manufacturing Practices" }, priority: "high", color: "#fed7aa" },
  { code: "IIR / Cold Chain Standards",title: { ar: "معايير سلسلة التبريد الدولية", en: "International cold chain standards" }, priority: "high", color: "#fed7aa" },
];

export default function HSELegalFramework() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [tab, setTab] = useState("federal");

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #fef9c3, #fff7ed)", borderInlineStart: "5px solid #f59e0b" }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: "#854d0e", marginBottom: 6 }}>{pick(T.banTitle)}</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 8, fontWeight: 800, flexWrap: "wrap" }}>
            <span>{pick(T.period)} <span style={{ color: HSE_COLORS.primary }}>{pick(T.banPeriod)}</span></span>
            <span>{pick(T.banHours)} <span style={{ color: HSE_COLORS.primary }}>{pick(T.banHoursVal)}</span></span>
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>{pick(T.banDesc)}</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button style={tab === "federal" ? buttonPrimary : buttonGhost} onClick={() => setTab("federal")}>{pick(T.tabFederal)}</button>
          <button style={tab === "dubai" ? buttonPrimary : buttonGhost} onClick={() => setTab("dubai")}>{pick(T.tabDubai)}</button>
          <button style={tab === "iso" ? buttonPrimary : buttonGhost} onClick={() => setTab("iso")}>{pick(T.tabIso)}</button>
        </div>

        {tab === "federal" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>{pick(T.federalTitle)}</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.colLaw)}</th>
                  <th style={thStyle}>{pick(T.colImpact)}</th>
                </tr>
              </thead>
              <tbody>
                {FEDERAL_LAWS.map((l, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{pick(l.law)}</td>
                    <td style={tdStyle}>{pick(l.impact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "dubai" && (
          <div style={{ display: "grid", gap: 12 }}>
            {DUBAI_AUTHORITIES.map((a, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{a.icon}</span>
                  <div style={{ fontSize: 15, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(a.authority)}</div>
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, paddingInlineStart: 38 }}>{pick(a.reqs)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "iso" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {ISO_STANDARDS.map((s) => (
              <div key={s.code} style={{ ...cardStyle, padding: 14, background: s.color }}>
                <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 6, color: HSE_COLORS.primaryDark }}>{s.code}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{pick(s.title)}</div>
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 900, color: HSE_COLORS.primaryDark, textTransform: "uppercase" }}>
                  {s.priority === "critical" && pick(T.priorityCritical)}
                  {s.priority === "high"     && pick(T.priorityHigh)}
                  {s.priority === "medium"   && pick(T.priorityMedium)}
                  {s.priority === "active"   && pick(T.priorityActive)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
