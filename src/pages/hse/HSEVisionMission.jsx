// src/pages/hse/HSEVisionMission.jsx
// الرؤية والرسالة والأهداف الاستراتيجية + نطاق العمل

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost,
  cardStyle, HSE_COLORS, tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  pageTitle:    { ar: "🎯 الرؤية والرسالة والأهداف الاستراتيجية", en: "🎯 Vision, Mission & Strategic Objectives" },
  pageSubtitle: { ar: "الإطار الاستراتيجي الكامل لقسم HSE + الملخص التنفيذي + نطاق العمل + الفوائد",
                  en: "Full strategic framework + executive summary + scope + benefits" },
  back:         { ar: "← HSE", en: "← HSE" },
  execTitle:    { ar: "📜 الملخص التنفيذي", en: "📜 Executive Summary" },
  execP1: {
    ar: "تُمثّل صناعة استيراد وتخزين وتصنيع اللحوم المبردة قطاعاً عالي الحساسية يجمع بين متطلبات سلامة الغذاء (Food Safety)، السلامة المهنية (Occupational Safety)، والاستدامة البيئية (Environmental Compliance). ونظراً لطبيعة عمليات الشركة التي تشمل الاستيراد من أستراليا وأفريقيا والتخزين في مستودعات مبردة وإعادة التصنيع والتوزيع، فإن إنشاء قسم متخصص للصحة والسلامة والبيئة أصبح ضرورة تشغيلية وقانونية لا تحتمل التأجيل.",
    en: "The chilled-meat import, storage, and processing industry is a high-sensitivity sector that combines requirements of Food Safety, Occupational Safety, and Environmental Compliance. Given the nature of the company's operations — importing from Australia and Africa, cold-storage warehousing, re-processing, and distribution — establishing a dedicated Health, Safety, and Environment department has become an operational and legal necessity that cannot be postponed.",
  },
  execP2: {
    ar: "تهدف هذه الوثيقة إلى تقديم إطار عمل متكامل وقابل للتطبيق لتأسيس قسم HSE داخل الشركة، يشمل الهيكل التنظيمي، السياسات، إجراءات إدارة المخاطر، نماذج السجلات والتقارير، مؤشرات الأداء، متطلبات التدريب، والشهادات المستهدفة، إضافة إلى خطة تنفيذ زمنية مدتها اثنا عشر شهراً وميزانية تقديرية.",
    en: "This document aims to provide an integrated, applicable framework for establishing an HSE department within the company — covering the organizational structure, policies, risk management procedures, records and reporting forms, performance indicators, training requirements, and targeted certifications, in addition to a 12-month implementation timeline and an estimated budget.",
  },
  vision:       { ar: "🌟 الرؤية", en: "🌟 Vision" },
  mission:      { ar: "🚀 الرسالة", en: "🚀 Mission" },
  visionText: {
    ar: "أن نكون النموذج الرائد إقليمياً في تطبيق أعلى معايير الصحة والسلامة والبيئة ضمن قطاع تجارة وتصنيع اللحوم، بحيث تصبح ثقافة السلامة قيمة راسخة في كل عملية داخل الشركة.",
    en: "To be the regional leader in applying the highest health, safety, and environmental standards in the meat trading and processing sector, so that a safety culture becomes embedded in every operation across the company.",
  },
  missionText: {
    ar: "حماية موظفينا وعملائنا ومجتمعنا وبيئتنا عبر بناء نظام إدارة HSE متكامل، قائم على الوقاية، والتحسين المستمر، والامتثال الكامل للتشريعات المحلية والدولية، مع الحفاظ على سلامة سلسلة التبريد وجودة المنتج النهائي.",
    en: "To protect our employees, customers, community, and environment through an integrated HSE management system based on prevention, continuous improvement, and full compliance with local and international regulations — while preserving the cold chain and final product quality.",
  },
  goalsTitle: { ar: "🎯 الأهداف الاستراتيجية (السنة الأولى والثانية)", en: "🎯 Strategic Objectives (Years 1–2)" },
  goalsIntro: {
    ar: "تسعى الشركة إلى تحقيق الأهداف التالية خلال السنة الأولى والثانية من تأسيس القسم، وتُقاس بمؤشرات أداء واضحة قابلة للقياس وتُراجَع شهرياً من قِبَل مدير HSE وربع سنوياً من قِبَل الإدارة العليا:",
    en: "The company aims to achieve the following goals during the first and second year of department establishment. Each goal is measured by clear, quantifiable KPIs reviewed monthly by the HSE Manager and quarterly by senior management:",
  },
  cols: {
    goal:    { ar: "الهدف الاستراتيجي", en: "Strategic Goal" },
    indicator: { ar: "المؤشر المستخدم للقياس", en: "Measurement Indicator" },
    target:  { ar: "المستهدف", en: "Target" },
  },
  pillarsTitle: { ar: "🏛️ المحاور الأربعة الرئيسية", en: "🏛️ The Four Main Pillars" },
  pillarsIntro: {
    ar: "يغطي قسم HSE في الشركة أربعة محاور متكاملة، كل منها يُعالج مجموعة محددة من المخاطر التشغيلية الخاصة بطبيعة عمل الشركة (استيراد جوي، تخزين مبرد ومجمد، تصنيع، توزيع):",
    en: "The HSE department covers four integrated pillars, each addressing a specific set of operational risks unique to the company's business (air import, chilled & frozen storage, processing, distribution):",
  },
  scopeTitle:   { ar: "📍 نطاق عمل القسم", en: "📍 Scope of Work" },
  scopeIntro: {
    ar: "يشمل نطاق قسم HSE جميع الأنشطة والمواقع والأشخاص المرتبطين بعمليات الشركة، بما في ذلك المرافق المملوكة، الأسطول، الموظفين الدائمين والمؤقتين، المقاولين، والزوار. كل من يدخل أيّ موقع تابع للشركة أو يتعامل مع منتجاتها يخضع لمتطلبات HSE.",
    en: "The HSE department's scope covers all activities, locations, and individuals involved in company operations — including owned facilities, the fleet, permanent and temporary staff, contractors, and visitors. Anyone entering any company site or handling its products is subject to HSE requirements.",
  },
  scopeGeo:     { ar: "🌍 النطاق الجغرافي والتشغيلي", en: "🌍 Geographical & Operational Scope" },
  scopePeople:  { ar: "👥 الأشخاص المشمولون", en: "👥 People Covered" },
  benefitsTitle:{ ar: "💰 الفوائد المتوقعة من إنشاء القسم", en: "💰 Expected Benefits" },
  benefitsIntro: {
    ar: "يمكن تبرير الاستثمار في قسم HSE بسهولة عبر العائدات الملموسة التالية، التي تتجاوز قيمتها التراكمية ميزانية القسم خلال فترة قصيرة:",
    en: "The investment in the HSE department is easily justified through the following tangible returns — the cumulative value of which exceeds the department budget within a short period:",
  },
};

const STRATEGIC_GOALS = [
  { goal: { ar: "صفر حوادث مميتة", en: "Zero fatal incidents" }, indicator: { ar: "عدد الحوادث المميتة السنوية", en: "Annual fatal incidents" }, target: "0" },
  { goal: { ar: "خفض إصابات العمل", en: "Reduce work injuries" }, indicator: { ar: "معدل تكرار إصابات ضياع الوقت (LTIFR)", en: "Lost Time Injury Frequency Rate (LTIFR)" }, target: "< 1.0" },
  { goal: { ar: "امتثال كامل للقوانين", en: "Full legal compliance" }, indicator: { ar: "نسبة إغلاق الملاحظات التفتيشية الحكومية", en: "Closure rate of govt inspection findings" }, target: "100%" },
  { goal: { ar: "تدريب شامل للموظفين", en: "Comprehensive employee training" }, indicator: { ar: "نسبة الموظفين المُدرّبين على HSE سنوياً", en: "% employees trained on HSE annually" }, target: "≥ 95%" },
  { goal: { ar: "سلامة سلسلة التبريد", en: "Cold chain integrity" }, indicator: { ar: "نسبة الالتزام بدرجات الحرارة المستهدفة", en: "% compliance with target temperatures" }, target: "≥ 99%" },
  { goal: { ar: "رفع ثقافة الإبلاغ", en: "Raise reporting culture" }, indicator: { ar: "عدد بلاغات شبه الحوادث شهرياً", en: "Monthly near-miss reports" }, target: "≥ 10" },
  { goal: { ar: "شهادات دولية", en: "International certifications" }, indicator: { ar: "الحصول على ISO 45001 و FSSC 22000", en: "Achieve ISO 45001 & FSSC 22000" }, target: { ar: "خلال 18 شهراً", en: "Within 18 months" } },
  { goal: { ar: "خفض استهلاك الطاقة", en: "Reduce energy consumption" }, indicator: { ar: "نسبة الانخفاض في استهلاك الكهرباء للمستودعات", en: "% reduction in warehouse electricity use" }, target: "≥ 8%" },
];

const SCOPE_LOCATIONS = [
  { ar: "جميع المستودعات المبردة (2-3 مواقع) — غرف التجميد والتبريد", en: "All cold storage warehouses (2–3 sites) — freezer & chiller rooms" },
  { ar: "خط إعادة التصنيع ومنطقة تجهيز اللحوم (Meat Processing Area)", en: "Re-processing line and meat preparation area" },
  { ar: "منطقة الاستلام (Receiving Bay) ومنطقة الشحن (Dispatch Bay)", en: "Receiving Bay and Dispatch Bay" },
  { ar: "المكاتب الإدارية وصالات العرض", en: "Administrative offices and showrooms" },
  { ar: "أسطول المركبات المبردة الخاصة بالتوزيع", en: "Refrigerated distribution fleet" },
  { ar: "عمليات النقل من الموانئ والمطارات (Jebel Ali / Dubai Cargo Village) إلى المستودعات", en: "Transport from ports/airports (Jebel Ali / Dubai Cargo Village) to warehouses" },
];

const SCOPE_PEOPLE = [
  { ar: "جميع الموظفين الدائمين والمؤقتين", en: "All permanent and temporary employees" },
  { ar: "العمال المتعاقدون عبر مكاتب التوظيف الخارجية", en: "Workers contracted via external recruitment agencies" },
  { ar: "سائقو الشاحنات المبردة وعمال التحميل والتفريغ", en: "Refrigerated truck drivers and loading/unloading workers" },
  { ar: "الزوار، المراجعون، ومفتشو الجهات الرسمية", en: "Visitors, auditors, and government inspectors" },
  { ar: "المقاولون والموردون (صيانة معدات التبريد، مكافحة الحشرات، النظافة)", en: "Contractors & suppliers (refrigeration maintenance, pest control, cleaning)" },
];

const PILLARS = [
  { title: { ar: "الصحة المهنية", en: "Occupational Health" }, icon: "🩺", desc: { ar: "حماية الموظفين من برودة غرف التجميد، رفع الأحمال، الاتصال بالأسطح الباردة، الإرهاق الحراري عند التحميل الخارجي، والمخاطر الجرثومية.", en: "Protect employees from freezer cold, manual lifting, contact with cold surfaces, heat stress during outdoor loading, and microbial hazards." } },
  { title: { ar: "السلامة المهنية", en: "Occupational Safety" }, icon: "🦺", desc: { ar: "سلامة الرافعات الشوكية، معدات التقطيع، الآلات الميكانيكية، مخاطر الانزلاق والسقوط، وسلامة الحرائق.", en: "Forklift safety, cutting equipment, mechanical machines, slip & fall hazards, and fire safety." } },
  { title: { ar: "البيئة", en: "Environment" }, icon: "🌱", desc: { ar: "إدارة النفايات العضوية، تسريبات غازات التبريد (الأمونيا / الفريون)، معالجة مياه الصرف، واستهلاك الطاقة.", en: "Organic waste management, refrigerant leaks (ammonia/freon), wastewater treatment, and energy consumption." } },
  { title: { ar: "سلامة الغذاء", en: "Food Safety" }, icon: "🥩", desc: { ar: "سلسلة التبريد، مكافحة التلوث المتبادل، مكافحة الحشرات، النظافة الشخصية، تتبّع المنتج (Traceability)، ومطابقة الحلال.", en: "Cold chain, cross-contamination control, pest control, personal hygiene, product traceability, and Halal compliance." } },
];

const BENEFITS = [
  { ar: "تجنّب المخالفات والغرامات الصادرة عن بلدية دبي والدفاع المدني ووزارة الموارد البشرية", en: "Avoid violations and fines from Dubai Municipality, Civil Defence, and MOHRE" },
  { ar: "تقليل معدلات الحوادث وإصابات العمل بنسبة لا تقل عن 60% خلال السنة الأولى", en: "Reduce incident and injury rates by at least 60% during the first year" },
  { ar: "حماية سلسلة التبريد وضمان جودة المنتج، مما ينعكس إيجاباً على ثقة العملاء", en: "Protect the cold chain and product quality, boosting customer trust" },
  { ar: "تهيئة الشركة للحصول على شهادات دولية (FSSC 22000, ISO 45001) تفتح أسواقاً جديدة", en: "Prepare the company for FSSC 22000 / ISO 45001 — opening new markets" },
  { ar: "خفض تكاليف التأمين وتعويضات إصابات العمل على المدى المتوسط", en: "Lower insurance and injury compensation costs in the mid-term" },
  { ar: "تعزيز سمعة الشركة كمورّد موثوق أمام كبار العملاء من الفنادق والمطاعم وسلاسل البيع", en: "Strengthen reputation as a trusted supplier for hotels, restaurants, and retail chains" },
];

export default function HSEVisionMission() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Executive Summary — full opening narrative */}
        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: "#1f2937", marginBottom: 10 }}>{pick(T.execTitle)}</div>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.execP1)}</p>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "#1f0f00", marginTop: 12 }}>{pick(T.execP2)}</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #fed7aa, #fef3c7)" }}>
          <div style={{ fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark, marginBottom: 8 }}>{pick(T.vision)}</div>
          <div style={{ fontSize: 16, lineHeight: 1.8, fontWeight: 700, color: "#1f0f00" }}>{pick(T.visionText)}</div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #dbeafe, #f0f9ff)" }}>
          <div style={{ fontSize: 14, fontWeight: 950, color: "#1e40af", marginBottom: 8 }}>{pick(T.mission)}</div>
          <div style={{ fontSize: 16, lineHeight: 1.8, fontWeight: 700, color: "#1f0f00" }}>{pick(T.missionText)}</div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 6, color: HSE_COLORS.primaryDark }}>{pick(T.goalsTitle)}</div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.goalsIntro)}</p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.cols.goal)}</th>
                <th style={thStyle}>{pick(T.cols.indicator)}</th>
                <th style={thStyle}>{pick(T.cols.target)}</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIC_GOALS.map((g, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{pick(g.goal)}</td>
                  <td style={tdStyle}>{pick(g.indicator)}</td>
                  <td style={{ ...tdStyle, fontWeight: 900, color: HSE_COLORS.primary, textAlign: "center" }}>{pick(g.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 6, color: HSE_COLORS.primaryDark }}>{pick(T.pillarsTitle)}</div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.pillarsIntro)}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {PILLARS.map((p, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: "#fff7ed", border: `1px solid ${HSE_COLORS.border}` }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>{p.icon}</div>
                <div style={{ fontWeight: 950, fontSize: 14, color: HSE_COLORS.primaryDark, marginBottom: 6 }}>{pick(p.title)}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "#475569" }}>{pick(p.desc)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 6, color: HSE_COLORS.primaryDark }}>{pick(T.scopeTitle)}</div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.scopeIntro)}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 13, color: HSE_COLORS.primaryDark, marginBottom: 8 }}>{pick(T.scopeGeo)}</div>
              <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.9 }}>
                {SCOPE_LOCATIONS.map((s, i) => <li key={i}>{pick(s)}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 13, color: HSE_COLORS.primaryDark, marginBottom: 8 }}>{pick(T.scopePeople)}</div>
              <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.9 }}>
                {SCOPE_PEOPLE.map((s, i) => <li key={i}>{pick(s)}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #dcfce7, #f0fdf4)" }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 6, color: "#166534" }}>{pick(T.benefitsTitle)}</div>
          <p style={{ fontSize: 13, color: "#166534", lineHeight: 1.8, margin: "0 0 12px", opacity: 0.85 }}>{pick(T.benefitsIntro)}</p>
          <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 14, lineHeight: 2 }}>
            {BENEFITS.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{pick(b)}</li>)}
          </ul>
        </div>
      </div>
    </main>
  );
}
