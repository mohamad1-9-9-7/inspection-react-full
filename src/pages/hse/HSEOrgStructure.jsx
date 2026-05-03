// src/pages/hse/HSEOrgStructure.jsx
// الهيكل التنظيمي + الأدوار والمسؤوليات

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, HSE_COLORS, tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  title:    { ar: "🏢 الهيكل التنظيمي والأدوار", en: "🏢 Organizational Structure & Roles" },
  subtitle: { ar: "7 مواقع وظيفية أساسية + لجنتان دائمتان · يتبع للرئيس التنفيذي للعمليات (COO)",
              en: "7 core functional positions + 2 permanent committees · reports to the COO" },
  pageIntro: {
    ar: "بناءً على حجم الشركة (50-200 موظف) وعدد المواقع (2-3 مستودعات)، يُقترح هيكل تنظيمي متوازن يتكوّن من 5-6 مواقع وظيفية أساسية، يتبع إدارياً للرئيس التنفيذي للعمليات (COO) أو المدير العام مباشرة لضمان استقلالية القرار وقوة التنفيذ. هذا الهيكل يمثل 3-4% من إجمالي موظفي الشركة وهو المعدل الموصى به دولياً للشركات الغذائية. كل دور هنا له مؤهلات إلزامية ومسؤوليات محددة لا يجوز التساهل فيها — مكتوبة بناءً على متطلبات NEBOSH و IOSH و HACCP و PIC.",
    en: "Based on company size (50–200 employees) and number of sites (2–3 warehouses), a balanced organizational structure of 5–6 core functional positions is proposed, reporting administratively to the COO or General Manager directly — ensuring decision independence and execution power. This structure represents 3–4% of total company employees, the internationally recommended ratio for food companies. Each role here has mandatory qualifications and defined responsibilities that cannot be relaxed — written per NEBOSH, IOSH, HACCP, and PIC requirements.",
  },
  back:     { ar: "← HSE", en: "← HSE" },
  chartTitle: { ar: "🌳 المخطط التنظيمي", en: "🌳 Org Chart" },
  coo:        { ar: "👑 المدير العام / COO", en: "👑 General Manager / COO" },
  hseManager: { ar: "👔 مدير HSE — يرأس القسم", en: "👔 HSE Manager — Heads the Department" },
  reportsTo:  { ar: "↑ يتبع له مباشرة ↑", en: "↑ Reports directly ↑" },
  fso:        { ar: "🥩 مسؤول سلامة الغذاء", en: "🥩 Food Safety Officer" },
  hseSO:      { ar: "🦺 ضباط HSE للمواقع", en: "🦺 HSE Site Officers" },
  coordinator:{ ar: "📋 منسق HSE / إداري", en: "📋 HSE Coordinator / Admin" },
  totalNote:  { ar: "👥 إجمالي القسم: ", en: "👥 Department total: " },
  totalVal:   { ar: "5 – 6 موظفين (3-4% من إجمالي موظفي الشركة — المعدل الموصى به)",
                en: "5 – 6 staff (3–4% of total company employees — recommended ratio)" },
  rolesTitle: { ar: "📋 الأدوار والمسؤوليات التفصيلية", en: "📋 Roles & Responsibilities" },
  qualifications: { ar: "🎓 المؤهلات المطلوبة:", en: "🎓 Required Qualifications:" },
  responsibilities: { ar: "📌 المسؤوليات الرئيسية:", en: "📌 Main Responsibilities:" },
  count:      { ar: "العدد:", en: "Count:" },
  committeesTitle: { ar: "🤝 اللجان الدائمة", en: "🤝 Standing Committees" },
  cols: {
    committee: { ar: "اللجنة", en: "Committee" },
    chair:     { ar: "الرئاسة", en: "Chair" },
    members:   { ar: "الأعضاء", en: "Members" },
    frequency: { ar: "الدورية", en: "Frequency" },
  },
};

const ROLES = [
  {
    id: "manager",
    title: { ar: "مدير HSE (HSE Manager)", en: "HSE Manager" },
    icon: "👔",
    type: { ar: "دوام كامل", en: "Full-time" },
    count: "1",
    qualifications: [
      { ar: "بكالوريوس في هندسة السلامة، الهندسة الكيميائية، علوم البيئة أو مجال مرتبط", en: "Bachelor's in Safety Engineering, Chemical Engineering, Environmental Science, or related field" },
      { ar: "شهادة NEBOSH International General Certificate (إلزامية)", en: "NEBOSH International General Certificate (mandatory)" },
      { ar: "شهادة IOSH Managing Safely (مفضلة)", en: "IOSH Managing Safely (preferred)" },
      { ar: "شهادة HACCP Lead Auditor أو FSSC 22000 Lead Auditor", en: "HACCP Lead Auditor or FSSC 22000 Lead Auditor certificate" },
      { ar: "خبرة لا تقل عن 7 سنوات في مجال HSE، منها 3 سنوات في قطاع الأغذية أو سلاسل التبريد", en: "Min. 7 years HSE experience, including 3 years in food sector or cold chain" },
      { ar: "إجادة اللغتين العربية والإنجليزية", en: "Fluent in Arabic and English" },
      { ar: "معرفة ممتازة بتشريعات دولة الإمارات (بلدية دبي، الدفاع المدني، MoHRE)", en: "Excellent knowledge of UAE legislation (DM, Civil Defence, MOHRE)" },
    ],
    responsibilities: [
      { ar: "وضع الاستراتيجية العامة للقسم والإشراف على تنفيذها", en: "Set department strategy and oversee execution" },
      { ar: "إعداد ومراجعة جميع السياسات والإجراءات (SOPs)", en: "Develop and review all policies and SOPs" },
      { ar: "رئاسة لجنتي السلامة وسلامة الغذاء", en: "Chair Safety and Food Safety committees" },
      { ar: "التمثيل أمام الجهات الحكومية والتعامل مع المفتشين", en: "Represent the company to government bodies and inspectors" },
      { ar: "إعداد الموازنة السنوية للقسم ومتابعة الإنفاق", en: "Prepare annual department budget and track spending" },
      { ar: "قيادة تحقيقات الحوادث الكبرى ورفع التقارير للإدارة العليا", en: "Lead major incident investigations and report to senior management" },
      { ar: "الإشراف على عمليات التدقيق الداخلي والخارجي", en: "Oversee internal and external audits" },
      { ar: "اعتماد برامج التدريب السنوية وتقييم كفاءتها", en: "Approve and evaluate annual training programs" },
    ],
  },
  {
    id: "site_officer",
    title: { ar: "ضابط HSE للموقع (HSE Site Officer)", en: "HSE Site Officer" },
    icon: "🦺",
    type: { ar: "دوام كامل — موقع لكل ضابط", en: "Full-time — one officer per site" },
    count: "2 – 3",
    qualifications: [
      { ar: "دبلوم أو بكالوريوس في السلامة المهنية، الصحة البيئية، أو مجال مرتبط", en: "Diploma or Bachelor's in OHS, Environmental Health, or related field" },
      { ar: "شهادة NEBOSH IGC أو IOSH Managing Safely", en: "NEBOSH IGC or IOSH Managing Safely" },
      { ar: "شهادة HACCP أساسيات أو مستوى 2", en: "HACCP Basics or Level 2 certificate" },
      { ar: "خبرة 3 – 5 سنوات، ويفضّل في قطاع الأغذية أو الصناعات المبردة", en: "3–5 years experience, preferably in food sector or cold industries" },
    ],
    responsibilities: [
      { ar: "التفتيش اليومي على الموقع وتعبئة قوائم الفحص", en: "Daily site inspection and checklist completion" },
      { ar: "الإشراف على التزام العمال بمعدات الوقاية الشخصية", en: "Supervise worker compliance with PPE" },
      { ar: "التحقيق في شبه الحوادث والحوادث البسيطة", en: "Investigate near-misses and minor incidents" },
      { ar: "تدريب العمال الجدد قبل بدء العمل (Induction Training)", en: "Train new workers before starting (Induction)" },
      { ar: "متابعة سجلات درجات الحرارة في غرف التبريد والتجميد", en: "Monitor chiller/freezer temperature logs" },
      { ar: "التنسيق مع مقاولي الصيانة ومكافحة الحشرات", en: "Coordinate with maintenance and pest-control contractors" },
      { ar: "رفع تقرير أسبوعي لمدير HSE", en: "Submit weekly report to HSE Manager" },
    ],
  },
  {
    id: "food_safety",
    title: { ar: "مسؤول سلامة الغذاء (Food Safety Officer)", en: "Food Safety Officer" },
    icon: "🥩",
    type: { ar: "دوام كامل (يمكن الترقية من الداخل)", en: "Full-time (can be promoted from within)" },
    count: "1",
    qualifications: [
      { ar: "بكالوريوس في علوم الأغذية، الأحياء الدقيقة، أو الطب البيطري", en: "Bachelor's in Food Science, Microbiology, or Veterinary Medicine" },
      { ar: "شهادة HACCP Level 3 أو Lead Auditor", en: "HACCP Level 3 or Lead Auditor certificate" },
      { ar: "شهادة Person In Charge – PIC معتمدة من بلدية دبي (إلزامية)", en: "PIC certificate by Dubai Municipality (mandatory)" },
      { ar: "خبرة 3 – 5 سنوات في مصنع أغذية أو مستودع مبرد", en: "3–5 years in a food factory or cold warehouse" },
    ],
    responsibilities: [
      { ar: "متابعة خطة HACCP وتحديثها", en: "Maintain and update the HACCP plan" },
      { ar: "إجراء اختبارات المسحات الميكروبية الدورية (Swabs)", en: "Conduct periodic microbiological swab tests" },
      { ar: "مراجعة سجلات درجات الحرارة وتحليل الانحرافات", en: "Review temperature logs and analyze deviations" },
      { ar: "التحقق من صلاحية المواد المستوردة والشهادات الصحية", en: "Verify imported goods validity and health certificates" },
      { ar: "الإشراف على برنامج النظافة والتعقيم", en: "Oversee cleaning and sanitation program" },
      { ar: "متابعة شهادات الحلال وشهادات المنشأ", en: "Track Halal and origin certificates" },
      { ar: "إدارة برنامج استرجاع المنتجات (Product Recall) عند الحاجة", en: "Manage product recall program when needed" },
    ],
  },
  {
    id: "coordinator",
    title: { ar: "منسق HSE الإداري (HSE Coordinator)", en: "HSE Administrative Coordinator" },
    icon: "📋",
    type: { ar: "دوام كامل", en: "Full-time" },
    count: "1",
    qualifications: [
      { ar: "خبرة إدارية في الأرشفة والمتابعة", en: "Administrative experience in archiving and tracking" },
      { ar: "إجادة استخدام برامج Office والأنظمة الرقمية", en: "Proficient with Office and digital systems" },
      { ar: "مهارات تنظيمية ممتازة", en: "Excellent organizational skills" },
    ],
    responsibilities: [
      { ar: "أرشفة جميع سجلات ووثائق القسم", en: "Archive all department records and documents" },
      { ar: "جدولة الدورات التدريبية ومتابعة نسب الحضور", en: "Schedule training courses and track attendance" },
      { ar: "إعداد لوحات البيانات الشهرية (Dashboards)", en: "Prepare monthly dashboards" },
      { ar: "تجهيز ملفات التدقيق الخارجي", en: "Prepare files for external audits" },
      { ar: "متابعة تجديد التراخيص والشهادات وإخطار المدير قبل شهرين من انتهائها", en: "Track license/certificate renewals and notify the manager 2 months before expiry" },
    ],
  },
];

const COMMITTEES = [
  { name: { ar: "لجنة السلامة والصحة المهنية (Safety Committee)", en: "Safety & Occupational Health Committee" },
    chair: { ar: "مدير HSE", en: "HSE Manager" },
    members: { ar: "ممثلون عن كل إدارة + ممثلون عن العمال", en: "Representatives from each department + worker representatives" },
    frequency: { ar: "اجتماع شهري", en: "Monthly meeting" } },
  { name: { ar: "لجنة سلامة الغذاء / فريق HACCP", en: "Food Safety / HACCP Committee" },
    chair: { ar: "مدير HSE", en: "HSE Manager" },
    members: { ar: "مسؤول سلامة الغذاء + مدير الإنتاج + مدير المستودع", en: "Food Safety Officer + Production Manager + Warehouse Manager" },
    frequency: { ar: "اجتماع شهري", en: "Monthly meeting" } },
];

export default function HSEOrgStructure() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [expandedRole, setExpandedRole] = useState("manager");

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

        <div style={{ ...cardStyle, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 16, color: HSE_COLORS.primaryDark }}>{pick(T.chartTitle)}</div>

          <div style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #1f2937, #111827)", color: "#fff", fontWeight: 950, fontSize: 15, boxShadow: "0 8px 18px rgba(0,0,0,0.25)" }}>
            {pick(T.coo)}
          </div>
          <div style={{ fontSize: 24, color: "#94a3b8", margin: "4px 0" }}>↑</div>

          <div style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #f97316, #dc2626)", color: "#fff", fontWeight: 950, fontSize: 15, boxShadow: "0 8px 18px rgba(234,88,12,0.30)" }}>
            {pick(T.hseManager)}
          </div>
          <div style={{ fontSize: 24, color: "#94a3b8", margin: "4px 0" }}>{pick(T.reportsTo)}</div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "12px 0" }}>
            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#dbeafe", color: "#1e40af", fontWeight: 800, fontSize: 13, minWidth: 160 }}>
              {pick(T.fso)}<br /><small>×1</small>
            </div>
            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fed7aa", color: "#9a3412", fontWeight: 800, fontSize: 13, minWidth: 160 }}>
              {pick(T.hseSO)}<br /><small>×2 – 3</small>
            </div>
            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 13, minWidth: 160 }}>
              {pick(T.coordinator)}<br /><small>×1</small>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: "#fff7ed", fontSize: 12, color: HSE_COLORS.primaryDark, fontWeight: 700 }}>
            {pick(T.totalNote)}<b>{pick(T.totalVal)}</b>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>{pick(T.rolesTitle)}</div>
        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          {ROLES.map((r) => {
            const open = expandedRole === r.id;
            return (
              <div key={r.id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedRole(open ? null : r.id)}
                  style={{
                    width: "100%", textAlign: dir === "rtl" ? "right" : "left",
                    padding: "14px 18px", border: "none",
                    background: open ? "linear-gradient(135deg, #fed7aa, #fef3c7)" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 32 }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(r.title)}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {pick(r.type)} · {pick(T.count)} <b>{r.count}</b>
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: HSE_COLORS.primary }}>{open ? "▼" : (dir === "rtl" ? "◀" : "▶")}</span>
                </button>
                {open && (
                  <div style={{ padding: "0 18px 18px" }}>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#1e40af", marginBottom: 6 }}>{pick(T.qualifications)}</div>
                      <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.8 }}>
                        {r.qualifications.map((q, i) => <li key={i}>{pick(q)}</li>)}
                      </ul>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#9a3412", marginBottom: 6 }}>{pick(T.responsibilities)}</div>
                      <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.8 }}>
                        {r.responsibilities.map((q, i) => <li key={i}>{pick(q)}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>{pick(T.committeesTitle)}</div>
        <div style={cardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.cols.committee)}</th>
                <th style={thStyle}>{pick(T.cols.chair)}</th>
                <th style={thStyle}>{pick(T.cols.members)}</th>
                <th style={thStyle}>{pick(T.cols.frequency)}</th>
              </tr>
            </thead>
            <tbody>
              {COMMITTEES.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{pick(c.name)}</td>
                  <td style={tdStyle}>{pick(c.chair)}</td>
                  <td style={tdStyle}>{pick(c.members)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: HSE_COLORS.primary }}>{pick(c.frequency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
