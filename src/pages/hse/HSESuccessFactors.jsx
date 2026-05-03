// src/pages/hse/HSESuccessFactors.jsx — bilingual

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost,
  cardStyle, HSE_COLORS, useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  title: { ar: "🌟 عوامل النجاح والتوصيات الختامية", en: "🌟 Success Factors & Final Recommendations" },
  subtitle: { ar: "العوامل الحرجة للنجاح + المخاطر الواجب تجنّبها + الإجراءات الفورية",
              en: "Critical success factors + risks to avoid + immediate actions" },
  back: { ar: "← HSE", en: "← HSE" },
  successTitle: { ar: "✅ عوامل النجاح الحرجة", en: "✅ Critical Success Factors" },
  risksTitle: { ar: "⚠️ مخاطر التطبيق التي يجب تجنّبها", en: "⚠️ Implementation Risks to Avoid" },
  immediateTitle: { ar: "🔥 الإجراءات الفورية — أول 30 يوماً", en: "🔥 Immediate Actions — First 30 Days" },
  conclusion: { ar: "🏁 الخلاصة", en: "🏁 Bottom Line" },
  conclusionText: {
    ar: "بناء قسم HSE احترافي ليس مشروعاً تكتمل آثاره خلال أشهر، بل استثمار طويل الأمد في سمعة الشركة واستدامتها وحماية موظفيها. الشركات التي تنجح في هذا المجال ليست التي تمتلك أفضل الوثائق، بل التي تحوّل السلامة وسلامة الغذاء إلى ثقافة يومية في كل طبقة من طبقاتها.",
    en: "Building a professional HSE department is not a project that completes within months — it's a long-term investment in the company's reputation, sustainability, and employee protection. The companies that succeed in this field are not those with the best documentation, but those that turn safety and food safety into a daily culture across every layer of the organization.",
  },
  conclusionEnd: {
    ar: "هذه الوثيقة تمنحكم الهيكل، والتنفيذ الحقيقي سيحدّد النتيجة.",
    en: "This document gives you the framework — real execution determines the outcome.",
  },
};

const SUCCESS_FACTORS = [
  { icon: "👑", title: { ar: "دعم القيادة", en: "Leadership Support" },                 desc: { ar: "دعم واضح ومعلَن من الإدارة العليا منذ اليوم الأول", en: "Clear, public top-management support from day one" } },
  { icon: "🎯", title: { ar: "اختيار مدير HSE المناسب", en: "Right HSE Manager" },        desc: { ar: "من ذوي الخبرة في قطاع الأغذية تحديداً لا العمومية", en: "Hire someone with food-sector experience specifically, not generic" } },
  { icon: "👥", title: { ar: "إشراك العمال", en: "Worker Engagement" },                  desc: { ar: "ممثلون عن العمال في لجنة السلامة في كل مرحلة", en: "Worker representatives on the safety committee at every stage" } },
  { icon: "💪", title: { ar: "HSE كميزة تنافسية", en: "HSE as Competitive Edge" },        desc: { ar: "ليس عبئاً، بل عامل تفوّق أمام العملاء الكبار", en: "Not a burden — a differentiator with large customers" } },
  { icon: "💻", title: { ar: "الاستثمار في الأنظمة الرقمية", en: "Invest in Digital Systems" }, desc: { ar: "منذ البداية لتجنب فوضى الأوراق", en: "From day one to avoid paper chaos" } },
  { icon: "🌐", title: { ar: "التواصل بلغات العمال", en: "Multilingual Communication" },  desc: { ar: "الأوردو، الهندية، العربية، الإنجليزية", en: "Urdu, Hindi, Arabic, English" } },
  { icon: "⚖️", title: { ar: "ربط المؤشرات بالحوافز", en: "Link KPIs to Incentives" },    desc: { ar: "بشكل عادل وشفاف بين المكافأة والعقوبة", en: "Fair and transparent — reward and consequence" } },
];

const RISKS_TO_AVOID = [
  { icon: "❌", title: { ar: "إسناد HSE لشخص بدوام جزئي", en: "Part-time HSE assignment" },  desc: { ar: "من قسم آخر — تفشل التجربة عادة", en: "Pulling someone from another department — usually fails" } },
  { icon: "📋", title: { ar: "نماذج من الإنترنت دون تعديل", en: "Off-the-shelf forms" },     desc: { ar: "يجب تكييفها لواقع شركة اللحوم تحديداً", en: "Must be tailored to the meat company's reality" } },
  { icon: "📚", title: { ar: "التدريب الشكلي", en: "Tick-box training" },                   desc: { ar: "دون تقييم الفهم الفعلي للعمال", en: "Without testing actual worker understanding" } },
  { icon: "🗂️", title: { ar: "إهمال التوثيق", en: "Neglecting documentation" },             desc: { ar: "ما لم يُوثَّق، لم يحدث من منظور المدقق", en: "If it isn't documented, it didn't happen — from the auditor's view" } },
  { icon: "👁️", title: { ar: "تجاهل شبه الحوادث", en: "Ignoring near-misses" },              desc: { ar: "هي مؤشرات تحذير للحوادث الحقيقية", en: "These are warning signs for real accidents" } },
  { icon: "⏰", title: { ar: "تأجيل الإجراءات التصحيحية", en: "Delaying corrective actions" }, desc: { ar: "بحجة الانشغال التشغيلي", en: "Under the excuse of operational busyness" } },
];

const IMMEDIATE_ACTIONS = [
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

export default function HSESuccessFactors() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();

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

        <div style={{ ...cardStyle, marginBottom: 16, background: "linear-gradient(135deg, #dcfce7, #f0fdf4)" }}>
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 14, color: "#166534" }}>{pick(T.successTitle)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {SUCCESS_FACTORS.map((f, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(22,101,52,0.25)" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 950, fontSize: 14, color: "#166534", marginBottom: 6 }}>{pick(f.title)}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{pick(f.desc)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, background: "linear-gradient(135deg, #fee2e2, #fef2f2)" }}>
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 14, color: "#7f1d1d" }}>{pick(T.risksTitle)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {RISKS_TO_AVOID.map((r, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(127,29,29,0.25)" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontWeight: 950, fontSize: 14, color: "#7f1d1d", marginBottom: 6 }}>{pick(r.title)}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{pick(r.desc)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16, background: "linear-gradient(135deg, #fed7aa, #fef3c7)" }}>
          <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 14, color: "#9a3412" }}>{pick(T.immediateTitle)}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {IMMEDIATE_ACTIONS.map((action, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "center",
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.9)", border: "1px solid rgba(154,52,18,0.20)",
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, #f97316, #dc2626)",
                  color: "#fff", fontWeight: 950, fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{pick(action)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, background: "linear-gradient(135deg, #1f2937, #111827)", color: "#fff", textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 950, marginBottom: 10 }}>{pick(T.conclusion)}</div>
          <div style={{ fontSize: 14, lineHeight: 1.9, maxWidth: 700, margin: "0 auto" }}>
            {pick(T.conclusionText)}
            <br /><br />
            {pick(T.conclusionEnd)}
          </div>
        </div>
      </div>
    </main>
  );
}
