// src/pages/hse/HSEImplementationPlan.jsx — bilingual

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost,
  cardStyle, HSE_COLORS, todayISO,
  loadLocal, saveLocal, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "implementation_progress";

const T = {
  title: { ar: "🗓️ خطة التنفيذ — 12 شهراً", en: "🗓️ 12-Month Implementation Plan" },
  subtitle: { ar: "4 مراحل متتالية + 10 إجراءات فورية في أول 30 يوم",
              en: "4 sequential phases + 10 immediate actions in the first 30 days" },
  pageIntro: {
    ar: "يُقترح تقسيم تنفيذ نظام HSE إلى أربع مراحل متتالية على مدى 12 شهراً، تركّز أولاً على المتطلبات الحرجة التي تُجنّب الشركة المخالفات الفورية، ثم تبني تدريجياً نحو الشهادات الدولية. التتابع مهم — لا تقفز للمرحلة الثانية قبل اكتمال الأولى. كل مرحلة لها إنجاز مستهدف واضح. هذه الصفحة تتيح متابعة التقدم بضغطة واحدة على كل مهمة، وحساب نسبة الإنجاز العامة بشكل آلي.",
    en: "Implementing the HSE system is proposed in 4 sequential phases over 12 months — focusing first on critical requirements that avoid immediate violations, then building gradually toward international certifications. Sequencing matters — don't jump to phase 2 before phase 1 completes. Each phase has a clear target deliverable. This page lets you track progress with a single click per task and calculates overall completion automatically.",
  },
  back: { ar: "← HSE", en: "← HSE" },
  overall: { ar: "📈 التقدّم العام", en: "📈 Overall Progress" },
  immediateTitle: { ar: "🔥 الإجراءات الفورية — أول 30 يوم", en: "🔥 Immediate Actions — First 30 Days" },
  budgetTitle: { ar: "💰 الميزانية التقديرية للسنة الأولى", en: "💰 Year 1 Budget Estimate" },
  budgetCapex: { ar: "تكاليف التأسيس (CAPEX):", en: "CAPEX Setup costs:" },
  budgetCapexVal: { ar: "195,000 – 425,000 درهم", en: "AED 195,000 – 425,000" },
  budgetOpex: { ar: "التكاليف التشغيلية السنوية (OPEX):", en: "OPEX Annual operating costs:" },
  budgetOpexVal: { ar: "1,150,000 – 1,880,000 درهم", en: "AED 1,150,000 – 1,880,000" },
  budgetROI: { ar: "العائد المتوقع: تجنب غرامات تتجاوز الميزانية + فتح أسواق FSSC 22000 (عقود > 5 مليون درهم)",
               en: "Expected return: Avoid fines that exceed the budget + Open FSSC 22000 markets (contracts > AED 5M)" },
  deliverable: { ar: "الإنجاز المستهدف:", en: "Target deliverable:" },
};

const PHASES = [
  {
    id: "phase1",
    title: { ar: "المرحلة الأولى — التأسيس والتشخيص (الشهر 1 – 3)", en: "Phase 1 — Setup & Diagnosis (Months 1–3)" },
    color: "#dbeafe", borderColor: "#1e40af",
    deliverable: { ar: "📄 وثيقة التقييم + تقرير الفجوات + خطة سد الفجوات", en: "📄 Assessment doc + Gap report + Gap-closing plan" },
    tasks: [
      { ar: "تعيين مدير HSE والبدء بعملية التوظيف للمناصب الأخرى", en: "Hire HSE Manager and begin recruiting other positions" },
      { ar: "إجراء تقييم شامل للوضع الحالي (Gap Analysis) في جميع المواقع", en: "Conduct comprehensive Gap Analysis at all sites" },
      { ar: "حصر جميع المخالفات والفجوات أمام التشريعات المحلية", en: "List all violations/gaps against local legislation" },
      { ar: "إعداد السياسة العامة للـ HSE وتوقيعها من الإدارة العليا", en: "Draft the general HSE policy and have it signed by top management" },
      { ar: "تشكيل لجنتي السلامة وسلامة الغذاء", en: "Form Safety and Food Safety committees" },
      { ar: "تحديث سجل المخاطر وإجراءات الطوارئ الأولية", en: "Update the risk register and initial emergency procedures" },
    ],
  },
  {
    id: "phase2",
    title: { ar: "المرحلة الثانية — السياسات والإجراءات (الشهر 4 – 6)", en: "Phase 2 — Policies & Procedures (Months 4–6)" },
    color: "#dcfce7", borderColor: "#166534",
    deliverable: { ar: "📚 دليل HSE الكامل + نسبة تدريب أولي 100%", en: "📚 Complete HSE manual + 100% initial training rate" },
    tasks: [
      { ar: "استكمال إعداد جميع السياسات الـ17", en: "Complete all 17 policies" },
      { ar: "كتابة الإجراءات التشغيلية القياسية (SOPs) الحرجة (Food Safety + OHS)", en: "Write critical SOPs (Food Safety + OHS)" },
      { ar: "إعداد وطباعة جميع النماذج (F-01 إلى F-20) ونشرها", en: "Prepare and print all forms (F-01 to F-20) and distribute" },
      { ar: "إطلاق نظام إدارة الوثائق الإلكتروني", en: "Launch the electronic document management system" },
      { ar: "البدء ببرنامج التدريب التعريفي لجميع الموظفين الحاليين", en: "Begin induction training for all existing employees" },
      { ar: "تنفيذ أول تجربة إخلاء شاملة في كل موقع", en: "Conduct the first full evacuation drill at each site" },
    ],
  },
  {
    id: "phase3",
    title: { ar: "المرحلة الثالثة — التنفيذ والمراقبة (الشهر 7 – 9)", en: "Phase 3 — Execution & Monitoring (Months 7–9)" },
    color: "#fef9c3", borderColor: "#854d0e",
    deliverable: { ar: "📊 تقرير تدقيق داخلي + تحسّن قابل للقياس في KPIs", en: "📊 Internal audit report + measurable KPI improvements" },
    tasks: [
      { ar: "تفعيل جميع الإجراءات في العمليات اليومية", en: "Activate all procedures in daily operations" },
      { ar: "إطلاق نظام بلاغات شبه الحوادث (Near-miss) مع حوافز", en: "Launch the near-miss reporting system with incentives" },
      { ar: "إجراء التدقيق الداخلي الأول وإعداد تقرير بالملاحظات", en: "Conduct the first internal audit and produce a findings report" },
      { ar: "تنفيذ الإجراءات التصحيحية لإغلاق 80% من الملاحظات", en: "Execute corrective actions to close 80% of findings" },
      { ar: "تشغيل لوحة KPIs الشهرية وعرضها للإدارة", en: "Run monthly KPI dashboard and present to management" },
      { ar: "إجراء تدريبات تنشيطية ربع سنوية", en: "Conduct quarterly refresher training" },
    ],
  },
  {
    id: "phase4",
    title: { ar: "المرحلة الرابعة — الاعتماد والتحسين (الشهر 10 – 12)", en: "Phase 4 — Certification & Improvement (Months 10–12)" },
    color: "#fed7aa", borderColor: "#9a3412",
    deliverable: { ar: "🏆 شهادتان دوليتان (ISO 45001 + FSSC 22000) + تقرير سنوي شامل",
                   en: "🏆 Two international certifications (ISO 45001 + FSSC 22000) + comprehensive annual report" },
    tasks: [
      { ar: "التعاقد مع جهة اعتماد خارجية لـ ISO 45001 و FSSC 22000", en: "Engage external certification body for ISO 45001 and FSSC 22000" },
      { ar: "إجراء تدقيق مرحلة 1 (Stage 1 Audit)", en: "Conduct Stage 1 Audit" },
      { ar: "معالجة جميع الملاحظات غير المطابقة", en: "Address all non-conformances" },
      { ar: "إجراء تدقيق مرحلة 2 والحصول على الشهادات", en: "Conduct Stage 2 Audit and obtain certifications" },
      { ar: "إعداد التقرير السنوي الأول لـ HSE للإدارة", en: "Prepare the first annual HSE report for management" },
      { ar: "تحديث سجل المخاطر بناءً على خبرة السنة الأولى", en: "Update the risk register based on Year-1 experience" },
      { ar: "وضع خطة السنة الثانية مع أهداف أكثر طموحاً", en: "Set Year-2 plan with more ambitious goals" },
    ],
  },
];

const IMMEDIATE_30DAYS = [
  { ar: "اعتماد وثيقة الإطار من مجلس الإدارة رسمياً", en: "Officially adopt the framework document by the Board" },
  { ar: "تحديد ميزانية السنة الأولى والموافقة عليها", en: "Define and approve the Year-1 budget" },
  { ar: "الإعلان عن وظيفة مدير HSE فوراً", en: "Post the HSE Manager job opening immediately" },
  { ar: "إجراء جولة تفقدية عاجلة لكل المواقع لرصد المخاطر الحرجة", en: "Urgent site walk-around at all sites to identify critical risks" },
  { ar: "التأكد من سريان جميع التراخيص الحالية (بلدية، دفاع مدني، حلال)", en: "Verify all current licenses are valid (DM, Civil Defence, Halal)" },
  { ar: "التعاقد مع شركة مكافحة حشرات معتمدة إذا لم يكن هناك عقد حالي", en: "Contract with an approved pest control company if none exists" },
  { ar: "التأكد من وجود جميع البطاقات الصحية للموظفين الذين يتعاملون مع الغذاء", en: "Ensure all food handlers have valid health cards" },
  { ar: "إرسال إعلان داخلي لجميع الموظفين بنية تأسيس القسم", en: "Send internal announcement to all staff about department setup" },
  { ar: "اختيار ضابط سلامة مؤقت من الداخل يدير الأمور حتى اكتمال التوظيف", en: "Appoint an interim safety officer from within until full hiring" },
  { ar: "تحديد موعد مراجعة بعد 90 يوماً لتقييم التقدم", en: "Schedule a 90-day review meeting to evaluate progress" },
];

export default function HSEImplementationPlan() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const arr = loadLocal(TYPE);
    const map = {};
    arr.forEach((p) => { map[p.taskKey] = p; });
    setProgress(map);
  }, []);

  function toggleTask(taskKey, label) {
    const existing = progress[taskKey];
    let updated;
    if (existing && existing.done) {
      updated = { ...existing, done: false, completedDate: "" };
    } else {
      updated = { taskKey, label: typeof label === "object" ? label.ar : label, done: true, completedDate: todayISO() };
    }
    const map = { ...progress, [taskKey]: updated };
    setProgress(map);
    saveLocal(TYPE, Object.values(map));
  }

  const allTasks = PHASES.flatMap((p) => p.tasks.map((t, i) => ({ key: `${p.id}-${i}`, label: t, phase: p.id })));
  const allImmediate = IMMEDIATE_30DAYS.map((t, i) => ({ key: `immediate-${i}`, label: t }));
  const everyTask = [...allImmediate, ...allTasks];
  const doneCount = everyTask.filter((t) => progress[t.key]?.done).length;
  const totalCount = everyTask.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 950 }}>{pick(T.overall)}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: HSE_COLORS.primaryDark }}>{doneCount} / {totalCount} ({pct}%)</div>
          </div>
          <div style={{ height: 16, background: "#fef3c7", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(120,53,15,0.18)" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #fb923c, #dc2626)", transition: "width .3s ease" }} />
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, border: "2px solid #b91c1c", background: "#fee2e2" }}>
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12, color: "#7f1d1d" }}>{pick(T.immediateTitle)}</div>
          {IMMEDIATE_30DAYS.map((task, i) => {
            const key = `immediate-${i}`;
            const done = progress[key]?.done;
            return (
              <div key={key} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                background: done ? "#dcfce7" : "#fff7ed",
                cursor: "pointer", border: `1px solid ${done ? "#166534" : "rgba(120,53,15,0.18)"}`,
              }} onClick={() => toggleTask(key, task)}>
                <input type="checkbox" checked={done || false} readOnly style={{ marginTop: 3 }} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>
                  {i + 1}. {pick(task)}
                </div>
                {done && <span style={{ fontSize: 11, color: "#166534", fontWeight: 800 }}>✅ {progress[key].completedDate}</span>}
              </div>
            );
          })}
        </div>

        {PHASES.map((phase) => {
          const phaseDone = phase.tasks.filter((_, i) => progress[`${phase.id}-${i}`]?.done).length;
          const phasePct = phase.tasks.length > 0 ? Math.round((phaseDone / phase.tasks.length) * 100) : 0;
          return (
            <div key={phase.id} style={{ ...cardStyle, marginBottom: 16, borderInlineStart: `5px solid ${phase.borderColor}`, background: phase.color }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 950, color: phase.borderColor }}>{pick(phase.title)}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: phase.borderColor }}>{phaseDone} / {phase.tasks.length} ({phasePct}%)</div>
              </div>
              <div style={{ height: 8, background: "#fff", borderRadius: 999, marginBottom: 12, border: "1px solid rgba(120,53,15,0.18)" }}>
                <div style={{ height: "100%", width: `${phasePct}%`, background: phase.borderColor, borderRadius: 999 }} />
              </div>
              <div style={{ padding: "8px 12px", marginBottom: 12, borderRadius: 8, background: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 800, color: phase.borderColor }}>
                <b>{pick(T.deliverable)}</b> {pick(phase.deliverable)}
              </div>
              {phase.tasks.map((task, i) => {
                const key = `${phase.id}-${i}`;
                const done = progress[key]?.done;
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                    background: done ? "#fff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer", border: `1px solid ${done ? "#166534" : "rgba(120,53,15,0.18)"}`,
                  }} onClick={() => toggleTask(key, task)}>
                    <input type="checkbox" checked={done || false} readOnly style={{ marginTop: 3 }} />
                    <div style={{ flex: 1, fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>
                      {pick(task)}
                    </div>
                    {done && <span style={{ fontSize: 11, color: "#166534", fontWeight: 800 }}>✅ {progress[key].completedDate}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ ...cardStyle, marginTop: 16, background: "#fff7ed" }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 8, color: HSE_COLORS.primaryDark }}>{pick(T.budgetTitle)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            • {pick(T.budgetCapex)} <b>{pick(T.budgetCapexVal)}</b><br />
            • {pick(T.budgetOpex)} <b>{pick(T.budgetOpexVal)}</b><br />
            • {pick(T.budgetROI)}
          </div>
        </div>
      </div>
    </main>
  );
}
