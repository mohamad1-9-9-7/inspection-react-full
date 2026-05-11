// src/pages/hse/HSEMenu.jsx
// 🦺 HSE Department Hub — Health, Safety & Environment

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { useHSELang, HSELangToggle } from "./hseShared";
import HSELocalMigration from "./HSELocalMigration";

const T = {
  brandSub:    { ar: "AL MAWASHI — قسم الصحة والسلامة والبيئة", en: "AL MAWASHI — HSE Department" },
  badgeText:   { ar: "🦺 الصحة · السلامة · البيئة",                  en: "🦺 Health · Safety · Environment" },
  hubTitle:    { ar: "🦺 مركز قسم HSE",                                en: "🦺 HSE Department Hub" },
  hubSubtitle: {
    ar: "منظومة متكاملة للصحة والسلامة المهنية، سلامة الغذاء، وحماية البيئة — مطابقة لتشريعات الإمارات و ISO 45001 / FSSC 22000.",
    en: "Integrated system for occupational health, safety, food safety, and environmental compliance — aligned with UAE regulations and ISO 45001 / FSSC 22000.",
  },
  tagline: {
    ar: "سلسلة التبريد · لحم مجمّد · لحم مبرّد · مستورد جواً · تخزين · تصنيع · توزيع",
    en: "Cold-chain · Frozen meat · Chilled meat · Air-imported · Warehousing · Processing · Distribution",
  },
  open:        { ar: "افتح ›", en: "Open ›" },
  footer: {
    ar: "© Al Mawashi — نظام إدارة HSE · مبني وفق الإطار القانوني الإماراتي ومعايير ISO الدولية",
    en: "© Al Mawashi — HSE Management System · Built per UAE legal framework & international ISO standards",
  },
};

const sections = [
  // ═════ Strategic / Reference ═════
  {
    id: "company-profile", group: { ar: "📌 الإطار الاستراتيجي", en: "📌 Strategic Framework" },
    icon: "🏛️",
    title:    { ar: "ملف الشركة (الرؤية + الهيكل)", en: "Company Profile (Vision + Org)" },
    subtitle: { ar: "تبويبان: الرؤية والرسالة والأهداف · الهيكل التنظيمي والأدوار",
                en: "Two tabs: Vision/Mission/Goals · Organizational Structure & Roles" },
    route: "/hse/company-profile",
  },

  // ═════ Policies & Procedures ═════
  {
    id: "policies", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "📜",
    title:    { ar: "السياسات — 17 سياسة أساسية", en: "Policies — 17 Core Policies" },
    subtitle: { ar: "HSE العامة، سلامة الغذاء، سلسلة التبريد، PPE، الطوارئ، التدريب، النفايات…",
                en: "HSE General, Food Safety, Cold Chain, PPE, Emergency, Training, Waste…" },
    route: "/hse/policies",
  },
  {
    id: "sops", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "📘",
    title:    { ar: "SOPs — 28 إجراء قياسي", en: "SOPs — 28 Standard Operating Procedures" },
    subtitle: { ar: "سلامة الغذاء (9) + السلامة المهنية (10) + الطوارئ (4) + البيئة (4) + الإدارة (5)",
                en: "Food Safety (9) + OHS (10) + Emergency (4) + Environment (4) + Admin (5)" },
    route: "/hse/sops",
  },
  {
    id: "risk-register", group: { ar: "📚 السياسات والإجراءات", en: "📚 Policies & Procedures" },
    icon: "⚠️",
    title:    { ar: "سجل المخاطر التشغيلية", en: "Risk Register" },
    subtitle: { ar: "20 خطر مُحمّل + إضافة + تقييم Likelihood × Severity",
                en: "20 pre-loaded risks + add + Likelihood × Severity scoring" },
    route: "/hse/risk-register",
  },

  // ═════ Daily Operations Forms ═════
  {
    id: "incident-report", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚨",
    title:    { ar: "F-01 · تقرير حادث", en: "F-01 · Incident Report" },
    subtitle: { ar: "إصابات، حرائق، تسربات، تلوث غذائي + تحقيق + 5 Whys + إجراءات تصحيحية",
                en: "Injuries, fires, leaks, food contamination + Investigation + 5 Whys + CAPA" },
    route: "/hse/incident-report",
  },
  {
    id: "ncr", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚫",
    title:    { ar: "F-26 · تقرير عدم المطابقة (NCR)", en: "F-26 · Non-Conformance Report (NCR)" },
    subtitle: { ar: "بلاغ عدم مطابقة + سبب جذري + إجراء تصحيحي/وقائي + فحص فاعلية",
                en: "Non-conformance + Root cause + Corrective/Preventive action + Effectiveness check" },
    route: "/hse/ncr",
  },
  {
    id: "fire-equipment", group: { ar: "🧯 السلامة من الحريق", en: "🧯 Fire Safety" },
    icon: "🧯",
    title:    { ar: "F-28 · فحص معدات الإطفاء", en: "F-28 · Fire Equipment Inspection" },
    subtitle: { ar: "فحص دوري لكل معدات الإطفاء (طفايات/خراطيم/كواشف/إنذار) + الضغط + الصلاحية",
                en: "Periodic inspection (extinguishers/hoses/detectors/alarms) + Pressure + Validity" },
    route: "/hse/fire-equipment",
  },
  {
    id: "emergency-contacts", group: { ar: "🧯 السلامة من الحريق", en: "🧯 Fire Safety" },
    icon: "📞",
    title:    { ar: "F-31 · جهات الطوارئ", en: "F-31 · Emergency Contacts" },
    subtitle: { ar: "قائمة موحدة (998/999/997/112) + المستشفيات + السلطات + الإدارة الداخلية",
                en: "Consolidated list (998/999/997/112) + Hospitals + Authorities + Internal management" },
    route: "/hse/emergency-contacts",
  },
  {
    id: "welfare", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🏠",
    title:    { ar: "F-34 · فحص رعاية العمال", en: "F-34 · Worker Welfare" },
    subtitle: { ar: "مياه شرب + دورات مياه + استراحة + إسعافات + تخزين PPE + مرافق عامة",
                en: "Drinking water + Toilets + Rest area + First aid + PPE storage + General facilities" },
    route: "/hse/welfare",
  },
  {
    id: "forklift-inspection", group: { ar: "🚜 المعدات", en: "🚜 Equipment" },
    icon: "🚜",
    title:    { ar: "F-35 · فحص الرافعة الشوكية", en: "F-35 · Forklift Inspection" },
    subtitle: { ar: "فحص يومي قبل التشغيل (50+ بند) — بصري/شوكتان/هيدروليك/مكابح/تشغيل/سلامة/سائق",
                en: "Daily pre-shift check (50+ items) — Visual/Forks/Hydraulic/Brakes/Operation/Safety/Operator" },
    route: "/hse/forklift-inspection",
  },
  {
    id: "toolbox-meeting", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🗣️",
    title:    { ar: "F-29 · اجتماع Toolbox", en: "F-29 · Toolbox Meeting" },
    subtitle: { ar: "محضر اجتماعات السلامة اليومية + المخاطر + PPE + سجل الحضور والتوقيعات",
                en: "Daily safety meeting minutes + Hazards + PPE + Attendance & signatures" },
    route: "/hse/toolbox-meeting",
  },
  {
    id: "monthly-safety", group: { ar: "📊 التقارير الدورية", en: "📊 Periodic Reports" },
    icon: "📊",
    title:    { ar: "F-21 · التقرير الشهري للسلامة", en: "F-21 · Monthly Safety Report" },
    subtitle: { ar: "KPI تجميعي: ساعات عمل، LTA، Near Miss، تدريب، تدقيق، SPI",
                en: "Consolidated KPIs: man-hours, LTA, Near Miss, training, audits, SPI" },
    route: "/hse/monthly-safety-report",
  },
  {
    id: "work-permit", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "📋",
    title:    { ar: "F-07 · تصاريح العمل", en: "F-07 · Work Permits" },
    subtitle: { ar: "أعمال ساخنة، ارتفاعات، كهرباء، كيماويات، رفع",
                en: "Hot work, Heights, Electrical, Chemicals, Lifting" },
    route: "/hse/work-permit",
  },
  {
    id: "shipment-receiving", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "📦",
    title:    { ar: "F-09 · استلام الشحنات", en: "F-09 · Shipment Receiving" },
    subtitle: { ar: "✈️ شحنات اللحوم بالطيارة (مبردة/مجمدة) + AWB + الشهادات + الحرارة",
                en: "✈️ Air-imported meat (chilled/frozen) + AWB + Certificates + Temperature" },
    route: "/hse/shipment-receiving",
  },
  {
    id: "cleaning-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧼",
    title:    { ar: "F-10 · التنظيف والتعقيم", en: "F-10 · Cleaning & Sanitation" },
    subtitle: { ar: "يومي/أسبوعي/شهري للمناطق الحرجة + المعقّمات + التركيز",
                en: "Daily/Weekly/Monthly for critical areas + Sanitizers + Concentration" },
    route: "/hse/cleaning-log",
  },
  {
    id: "swabs-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧫",
    title:    { ar: "F-11 · المسحات الميكروبية", en: "F-11 · Microbiological Swabs" },
    subtitle: { ar: "Salmonella, E. coli, Listeria, TPC, ATP — مسحات أسطح + أيدي العمال",
                en: "Salmonella, E.coli, Listeria, TPC, ATP — Surface + Hand swabs" },
    route: "/hse/swabs-log",
  },
  {
    id: "pest-control", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🪳",
    title:    { ar: "F-12 · مكافحة الحشرات", en: "F-12 · Pest Control" },
    subtitle: { ar: "زيارات شهرية من شركة معتمدة من البلدية + سجلات المصائد",
                en: "Monthly visits by DM-approved company + Trap logs" },
    route: "/hse/pest-control",
  },
  {
    id: "equipment-maintenance", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🔧",
    title:    { ar: "F-13/F-18 · صيانة المعدات والتبريد", en: "F-13/F-18 · Equipment & Refrigeration Maintenance" },
    subtitle: { ar: "رافعات، آلات تقطيع، ضواغط تبريد، كواشف غازات + LOTO",
                en: "Forklifts, slicers, refrigeration compressors, gas detectors + LOTO" },
    route: "/hse/equipment-maintenance",
  },
  {
    id: "medical-checks", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🩺",
    title:    { ar: "F-14 · الفحوصات الطبية", en: "F-14 · Medical Checks" },
    subtitle: { ar: "بطاقة صحية + فحص سنوي + TB + لياقة العمل في البيئات الباردة",
                en: "Health Card + Annual check + TB + Cold-environment fitness" },
    route: "/hse/medical-checks",
  },
  {
    id: "evacuation-drills", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🚨",
    title:    { ar: "F-16 · تجارب الإخلاء", en: "F-16 · Evacuation Drills" },
    subtitle: { ar: "ربع سنوي إلزامي · حريق/أمونيا/كهرباء/زلزال + قياس زمن الإخلاء",
                en: "Quarterly mandatory · Fire/Ammonia/Power/Earthquake + Evacuation time measurement" },
    route: "/hse/evacuation-drills",
  },
  {
    id: "ppe-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🧤",
    title:    { ar: "PPE · سجل صرف معدات الوقاية", en: "PPE · Issue Log" },
    subtitle: { ar: "13 صنف معدات + إحصائيات الاستهلاك",
                en: "13 PPE items + Consumption statistics" },
    route: "/hse/ppe-log",
  },
  {
    id: "contractors-visitors", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "👥",
    title:    { ar: "F-17 · المقاولون والزوار", en: "F-17 · Contractors & Visitors" },
    subtitle: { ar: "Induction + PPE + بطاقة صحية + متابعة الدخول والخروج",
                en: "Induction + PPE + Health card + Entry/exit tracking" },
    route: "/hse/contractors-visitors",
  },
  {
    id: "waste-log", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "🗑️",
    title:    { ar: "F-19 · النفايات والتخلص", en: "F-19 · Waste Disposal" },
    subtitle: { ar: "نفايات عضوية + كرتون + غازات تبريد + شركة معتمدة + Manifest",
                en: "Organic waste + Cardboard + Refrigerant gases + Licensed company + Manifest" },
    route: "/hse/waste-log",
  },
  {
    id: "capa-tracker", group: { ar: "📝 النماذج التشغيلية", en: "📝 Operational Forms" },
    icon: "📌",
    title:    { ar: "F-20 · CAPA Tracker", en: "F-20 · CAPA Tracker" },
    subtitle: { ar: "متابعة الإجراءات التصحيحية والوقائية + المتأخرة + نسبة الإغلاق",
                en: "Track Corrective/Preventive Actions + Overdue + Closure rate" },
    route: "/hse/capa-tracker",
  },

  // ═════ Training & Compliance ═════
  {
    id: "training-matrix", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🎓",
    title:    { ar: "مصفوفة التدريب", en: "Training Matrix" },
    subtitle: { ar: "16 دورة × 6 وظائف + سجلات الجلسات + شهادات",
                en: "16 courses × 6 roles + Session records + Certificates" },
    route: "/hse/training-matrix",
  },
  {
    id: "licenses", group: { ar: "🎓 التدريب والامتثال", en: "🎓 Training & Compliance" },
    icon: "🪪",
    title:    { ar: "التراخيص والشهادات", en: "Licenses & Certifications" },
    subtitle: { ar: "13 ترخيص محلي ودولي + إنذار 60 يوماً قبل الانتهاء",
                en: "13 local + international licenses + 60-day expiry alert" },
    route: "/hse/licenses",
  },

];

/* ===== Styles (Orange + Red HSE theme) ===== */
const shellStyle = {
  minHeight: "100vh",
  padding: "28px 18px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(251,146,60,0.20) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(239,68,68,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(245,158,11,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#1f0f00",
};
const layoutStyle = { maxWidth: "1100px", margin: "0 auto" };
const topBarStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: "14px", padding: "14px 16px", borderRadius: "18px",
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(120, 53, 15, 0.18)",
  boxShadow: "0 14px 40px rgba(234, 88, 12, 0.14)",
  marginBottom: "18px", flexWrap: "wrap", position: "relative", overflow: "hidden",
};
const brandLeftStyle = { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 };
const logoStyle = {
  width: "46px", height: "46px", borderRadius: "12px", objectFit: "cover",
  border: "1px solid rgba(120, 53, 15, 0.18)",
  boxShadow: "0 8px 22px rgba(234, 88, 12, 0.16)", background: "#fff",
};
const companyNameStyle = { fontSize: "14px", fontWeight: 950, letterSpacing: "0.01em", margin: 0, lineHeight: 1.2 };
const companySubStyle = { fontSize: "12px", fontWeight: 750, opacity: 0.78, marginTop: "4px" };
const badgeStyle = {
  display: "inline-flex", alignItems: "center", gap: "8px",
  padding: "9px 12px", borderRadius: "999px",
  fontSize: "12px", fontWeight: 900, color: "#7c2d12",
  background: "linear-gradient(135deg, rgba(251,146,60,0.22), rgba(239,68,68,0.16))",
  border: "1px solid rgba(234,88,12,0.40)",
  whiteSpace: "nowrap", boxShadow: "0 10px 22px rgba(234,88,12,0.16)",
};
const headerStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
  gap: "16px", margin: "14px 0 18px", flexWrap: "wrap",
};
const titleStyle = { fontSize: "26px", fontWeight: 980, letterSpacing: "0.02em" };
const subtitleStyle = { fontSize: "13px", fontWeight: 750, opacity: 0.82, marginTop: "6px" };
const taglineStyle = { fontSize: "14px", fontWeight: 750, color: "#7c2d12", maxWidth: "520px", margin: 0 };
const gridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px",
};
const cardBaseStyle = {
  position: "relative", display: "flex", gap: "12px",
  padding: "16px 18px", borderRadius: "18px",
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(120, 53, 15, 0.16)",
  cursor: "pointer", textAlign: "left",
  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
  boxShadow: "0 12px 30px rgba(234, 88, 12, 0.12)", overflow: "hidden",
};
const iconWrapStyle = {
  width: "48px", height: "48px", borderRadius: "999px",
  background: "linear-gradient(135deg, rgba(251,146,60,0.22), rgba(239,68,68,0.14))",
  color: "#9a3412", display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, fontSize: 26,
  border: "1px solid rgba(234,88,12,0.36)",
  boxShadow: "0 10px 20px rgba(234,88,12,0.16)",
};
const cardBodyStyle = { flex: 1, minWidth: 0 };
const cardTitleStyle = { fontSize: "15px", fontWeight: 950, marginBottom: "4px", color: "#1f0f00" };
const cardSubStyle = { fontSize: "13px", color: "#475569", lineHeight: 1.45 };
const cardFooterStyle = {
  fontSize: "11px", fontWeight: 950, color: "#7c2d12",
  marginTop: "10px", textTransform: "uppercase", letterSpacing: "0.10em",
};

export default function HSEMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);
  const { lang, toggle, dir, pick } = useHSELang();

  const cardStyle = useMemo(() => {
    return (isHover) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-3px)" : "translateY(0)",
      background: isHover
        ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,237,213,0.72))"
        : cardBaseStyle.background,
      boxShadow: isHover ? "0 18px 46px rgba(234,88,12,0.22)" : cardBaseStyle.boxShadow,
      borderColor: isHover ? "rgba(234,88,12,0.56)" : "rgba(120, 53, 15, 0.16)",
      textAlign: dir === "rtl" ? "right" : "left",
    });
  }, [dir]);

  return (
    <main style={shellStyle} dir={dir}>
      <div style={layoutStyle}>
        <div style={topBarStyle}>
          <div style={brandLeftStyle}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={logoStyle} />
            <div style={{ minWidth: 0 }}>
              <div style={companyNameStyle}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
              <div style={companySubStyle}>{pick(T.brandSub)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <HSELocalMigration />
            <HSELangToggle lang={lang} toggle={toggle} />
            <div style={badgeStyle}>{pick(T.badgeText)}</div>
          </div>
        </div>

        <header style={headerStyle}>
          <div>
            <div style={titleStyle}>{pick(T.hubTitle)}</div>
            <div style={subtitleStyle}>{pick(T.hubSubtitle)}</div>
          </div>
          <p style={taglineStyle}>{pick(T.tagline)}</p>
        </header>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16,
          padding: "10px 14px", borderRadius: 14,
          background: "rgba(255,255,255,0.86)",
          border: "1px solid rgba(120, 53, 15, 0.16)",
          boxShadow: "0 6px 20px rgba(234,88,12,0.10)",
          fontSize: 12, fontWeight: 800, color: "#7c2d12",
        }}>
          <span>✅ MOHRE (33/2021)</span>
          <span>✅ Dubai Municipality</span>
          <span>✅ Civil Defence</span>
          <span>✅ MoCCAE</span>
          <span>✅ ESMA / MoIAT (Halal)</span>
          <span>✅ ISO 45001 · ISO 14001 · ISO 22000 · HACCP</span>
        </div>

        <section aria-label="HSE sections">
          {(() => {
            const groups = {};
            sections.forEach((s) => {
              const g = pick(s.group) || "Sections";
              if (!groups[g]) groups[g] = [];
              groups[g].push(s);
            });
            return Object.entries(groups).map(([groupName, groupItems]) => (
              <div key={groupName} style={{ marginBottom: 22 }}>
                <div style={{
                  display: "inline-block", padding: "8px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
                  color: "#7c2d12", fontWeight: 950, fontSize: 14,
                  marginBottom: 10, boxShadow: "0 4px 12px rgba(234,88,12,0.10)",
                }}>{groupName} <span style={{ opacity: 0.7, fontWeight: 800 }}>({groupItems.length})</span></div>
                <div style={gridStyle}>
                  {groupItems.map((item) => {
                    const isHover = hoverId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={cardStyle(isHover)}
                        onClick={() => navigate(item.route)}
                        onMouseEnter={() => setHoverId(item.id)}
                        onMouseLeave={() => setHoverId(null)}
                        title={pick(item.title)}
                      >
                        <div style={iconWrapStyle}>{item.icon}</div>
                        <div style={cardBodyStyle}>
                          <div style={cardTitleStyle}>{pick(item.title)}</div>
                          <div style={cardSubStyle}>{pick(item.subtitle)}</div>
                          <div style={cardFooterStyle}>{pick(T.open)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </section>

        <div style={{ marginTop: 18, fontSize: 12, color: "#7c2d12", fontWeight: 800, textAlign: "center", opacity: 0.9 }}>
          {pick(T.footer)}
        </div>
      </div>
    </main>
  );
}
