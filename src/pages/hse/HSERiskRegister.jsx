// src/pages/hse/HSERiskRegister.jsx
// سجل المخاطر التشغيلية — ثنائي اللغة

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, saveLocal, calcRiskScore, riskLevelLabel,
  SITE_LOCATIONS, HAZARD_CATEGORIES, tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  pageTitle:    { ar: "⚠️ سجل المخاطر التشغيلية — Risk Register", en: "⚠️ Operational Risk Register" },
  pageSubtitle: { ar: "التقييم = الاحتمالية × الشدة (1-5 لكل منهما) → 1 إلى 25",
                  en: "Score = Likelihood × Severity (1–5 each) → 1 to 25" },
  pageIntro: {
    ar: "يُعدّ سجل المخاطر (Risk Register) الوثيقة الأهم في نظام إدارة HSE، لأنه الأساس الذي تُبنى عليه جميع السياسات وإجراءات التحكم. يجب أن يُحدَّث ميدانياً من قِبَل مدير HSE فور تعيينه، ويُراجَع سنوياً أو عند: إدخال معدات جديدة، تغيير عمليات، حادث كبير، أو ملاحظة تفتيش حكومي. السجل التالي يحتوي على 20 خطر مُعرّف مسبقاً تغطي طبيعة عمل شركة استيراد وتخزين وتصنيع اللحوم المبردة والمجمدة، ويمكن إضافة المزيد عبر زر «إضافة خطر».",
    en: "The Risk Register is the most important document in an HSE management system — it's the foundation on which all policies and controls are built. It must be field-updated by the HSE Manager upon hire, and reviewed annually or when: new equipment is introduced, processes change, a major incident occurs, or a government inspection finding is raised. The following register contains 20 pre-identified risks covering the nature of an air-imported chilled & frozen meat company's operations. More can be added via the «Add Risk» button.",
  },
  methodologyTitle: { ar: "🧮 منهجية التقييم", en: "🧮 Assessment Methodology" },
  methodologyExplain: {
    ar: "يُحسب مستوى الخطورة (Risk Score) بضرب احتمالية الحدوث (Likelihood من 1 إلى 5) في شدة التأثير (Severity من 1 إلى 5). الاحتمالية: 1 = نادر جداً، 2 = نادر، 3 = ممكن، 4 = محتمل، 5 = شبه مؤكد. الشدة: 1 = لا أثر، 2 = إصابة طفيفة، 3 = إصابة متوسطة، 4 = إصابة شديدة/فقدان وقت، 5 = وفاة/كارثة. النتيجة تُحدّد المستوى والإجراء الواجب اتخاذه.",
    en: "Risk Score = Likelihood (1–5) × Severity (1–5). Likelihood: 1 = very rare, 2 = rare, 3 = possible, 4 = likely, 5 = almost certain. Severity: 1 = no impact, 2 = minor injury, 3 = moderate injury, 4 = severe injury/lost time, 5 = fatality/disaster. The result determines the level and required action.",
  },
  methCols: {
    score:  { ar: "النتيجة", en: "Score" },
    level:  { ar: "المستوى", en: "Level" },
    action: { ar: "الإجراء المطلوب", en: "Required Action" },
  },
  methLow:  { ar: "منخفض (Low)",     en: "Low" },
  methMed:  { ar: "متوسط (Medium)",   en: "Medium" },
  methHigh: { ar: "عالٍ (High)",       en: "High" },
  methCrit: { ar: "حرج (Critical)",    en: "Critical" },
  methActLow:  { ar: "قبول مع مراقبة دورية", en: "Accept with periodic monitoring" },
  methActMed:  { ar: "إجراءات تحكم مطلوبة ضمن 30 يوماً", en: "Control actions required within 30 days" },
  methActHigh: { ar: "إجراء فوري خلال 7 أيام + مراجعة من مدير HSE", en: "Immediate action within 7 days + HSE Manager review" },
  methActCrit: { ar: "إيقاف النشاط فوراً حتى معالجته", en: "Immediately stop activity until treated" },
  back:         { ar: "← HSE", en: "← HSE" },
  add:          { ar: "+ إضافة خطر", en: "+ Add Risk" },
  newTitle:     { ar: "➕ إضافة خطر جديد", en: "➕ Add new risk" },
  editTitle:    { ar: "✏️ تعديل الخطر", en: "✏️ Edit risk" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  shown:        { ar: "المعروض:", en: "Showing:" },
  fAll:         { ar: "كل المستويات", en: "All levels" },
  fCritical:    { ar: "حرج فقط", en: "Critical only" },
  fHigh:        { ar: "عالي فقط", en: "High only" },
  fMedium:      { ar: "متوسط فقط", en: "Medium only" },
  fLow:         { ar: "منخفض فقط", en: "Low only" },
  total:        { ar: "الإجمالي", en: "Total" },
  critical:     { ar: "حرج", en: "Critical" },
  high:         { ar: "عالي", en: "High" },
  medium:       { ar: "متوسط", en: "Medium" },
  low:          { ar: "منخفض", en: "Low" },
  area:         { ar: "المنطقة / الموقع", en: "Area / Location" },
  category:     { ar: "تصنيف الخطر", en: "Hazard category" },
  owner:        { ar: "المسؤول", en: "Owner" },
  ownerPh:      { ar: "HSE Manager / Site Officer...", en: "HSE Manager / Site Officer..." },
  likelihood:   { ar: "الاحتمالية (1-5)", en: "Likelihood (1–5)" },
  severity:     { ar: "الشدة (1-5)", en: "Severity (1–5)" },
  reviewDate:   { ar: "تاريخ المراجعة القادمة", en: "Next review date" },
  hazard:       { ar: "الخطر", en: "Hazard" },
  hazardPh:     { ar: "مثال: تسرب غاز الأمونيا", en: "e.g., Ammonia gas leak" },
  consequence:  { ar: "العواقب المحتملة", en: "Potential consequences" },
  controls:     { ar: "إجراءات التحكم", en: "Controls" },
  currentScore: { ar: "التقييم الحالي:", en: "Current score:" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  cols: {
    area: { ar: "المنطقة", en: "Area" },
    hazard: { ar: "الخطر", en: "Hazard" },
    score: { ar: "L × S", en: "L × S" },
    level: { ar: "المستوى", en: "Level" },
    controls: { ar: "التحكم", en: "Controls" },
    owner: { ar: "المسؤول", en: "Owner" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  edit: { ar: "تعديل", en: "Edit" },
  del:  { ar: "حذف", en: "Delete" },
  noResults: { ar: "لا توجد مخاطر بهذه الفلاتر", en: "No risks match these filters" },
  enterHazard: { ar: "اكتب وصف الخطر أولاً", en: "Enter the hazard description first" },
  confirmDel:  { ar: "حذف هذا الخطر؟", en: "Delete this risk?" },
};

const SEED_RISKS = [
  { id: "seed-1", area: "Frozen Room (-18°C)", hazard: { ar: "انخفاض حرارة الجسم / قضمة الصقيع", en: "Hypothermia / frostbite" }, consequence: { ar: "إصابات جلدية، فقدان وعي، نوبات قلبية", en: "Skin injuries, loss of consciousness, heart attacks" }, likelihood: 4, severity: 4, controls: { ar: "حد أقصى للدخول 45 دقيقة، ملابس معزولة معتمدة، نظام تدوير للعمال، زر طوارئ داخل الغرفة", en: "Max 45 min entry, certified insulated clothing, worker rotation system, emergency button inside room" }, category: "cold" },
  { id: "seed-2", area: "Frozen Room (-18°C)", hazard: { ar: "انحصار العامل داخل الغرفة", en: "Worker trapped inside the room" }, consequence: { ar: "وفاة اختناقاً أو بالبرودة", en: "Death by suffocation or hypothermia" }, likelihood: 3, severity: 5, controls: { ar: "نظام فتح من الداخل، نظام إنذار، اتصال لاسلكي، تفقّد قبل الإغلاق", en: "Inside-release system, alarm, two-way radio, pre-close inspection" }, category: "cold" },
  { id: "seed-3", area: "Chiller Room (0 to +4°C)", hazard: { ar: "تسرب غاز الأمونيا (NH3)", en: "Ammonia (NH3) gas leak" }, consequence: { ar: "تسمم، حرق الجهاز التنفسي، الوفاة عند تركيز عالٍ", en: "Poisoning, respiratory burns, death at high concentration" }, likelihood: 4, severity: 5, controls: { ar: "كواشف غاز ذات إنذار، تهوية طارئة، أقنعة واقية، خطة إخلاء، تدريب ربع سنوي", en: "Alarmed gas detectors, emergency ventilation, respirators, evacuation plan, quarterly drill" }, category: "chemical" },
  { id: "seed-4", area: "Chiller Room (0 to +4°C)", hazard: { ar: "تسرب غاز الفريون", en: "Freon gas leak" }, consequence: { ar: "اختناق، تلف بيئي", en: "Asphyxiation, environmental damage" }, likelihood: 3, severity: 4, controls: { ar: "كواشف، صيانة دورية، شهادة فنيي التبريد", en: "Detectors, periodic maintenance, certified refrigeration technicians" }, category: "chemical" },
  { id: "seed-5", area: "Production / Processing Line", hazard: { ar: "قطوع من السكاكين والمناشير", en: "Cuts from knives & saws" }, consequence: { ar: "جروح عميقة، قطع أصابع", en: "Deep wounds, finger amputation" }, likelihood: 4, severity: 4, controls: { ar: "قفازات مقاومة للقطع، صدرية واقية، تدريب استخدام الآلات، أغطية واقية للشفرات", en: "Cut-resistant gloves, protective apron, machine training, blade guards" }, category: "physical" },
  { id: "seed-6", area: "Production / Processing Line", hazard: { ar: "التعامل مع آلات التقطيع الكهربائية", en: "Electric slicing machines" }, consequence: { ar: "بتر، صعق كهربائي", en: "Amputation, electric shock" }, likelihood: 4, severity: 5, controls: { ar: "إيقاف طارئ، حساسات أمان، قفل وسم (LOTO) عند الصيانة، تدريب مكثف", en: "E-stop, safety sensors, LOTO during maintenance, intensive training" }, category: "fire" },
  { id: "seed-7", area: "Production / Processing Line", hazard: { ar: "التلوث المتبادل (Cross-contamination)", en: "Cross-contamination" }, consequence: { ar: "سحب منتج، تسمم عملاء، غرامات", en: "Product recall, customer poisoning, fines" }, likelihood: 3, severity: 5, controls: { ar: "فصل لحوم نيئة/مجهزة، ألوان أدوات، غسل يدين إلزامي، برنامج تعقيم", en: "Raw/processed segregation, color-coded tools, mandatory hand wash, sanitation program" }, category: "cross" },
  { id: "seed-8", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "حوادث الرافعات الشوكية", en: "Forklift accidents" }, consequence: { ar: "وفاة، إصابات بليغة، تلف منشآت", en: "Fatality, severe injuries, facility damage" }, likelihood: 3, severity: 5, controls: { ar: "رخصة سائق معتمدة، فحص يومي، سرعة قصوى 10 كم/س، ممرات محددة للمشاة", en: "Certified driver license, daily inspection, max 10 km/h, defined pedestrian lanes" }, category: "physical" },
  { id: "seed-9", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "سقوط بضائع من الرفوف", en: "Goods falling from racks" }, consequence: { ar: "إصابات رأس، كسور", en: "Head injuries, fractures" }, likelihood: 3, severity: 3, controls: { ar: "فحص رفوف ربع سنوي، حدود وزن، توزيع صحيح، خوذات إلزامية", en: "Quarterly rack inspection, weight limits, proper distribution, mandatory helmets" }, category: "physical" },
  { id: "seed-10", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "انزلاق على الأرضيات الرطبة", en: "Slip on wet floors" }, consequence: { ar: "كسور، إصابات ظهر", en: "Fractures, back injuries" }, likelihood: 4, severity: 3, controls: { ar: "أحذية مضادة للانزلاق، لافتات تحذيرية، تجفيف فوري، برنامج نظافة منظم", en: "Anti-slip footwear, warning signs, immediate drying, organized cleaning program" }, category: "physical" },
  { id: "seed-11", area: "Receiving Bay — Air Cargo Reception", hazard: { ar: "الرفع اليدوي للأحمال الثقيلة", en: "Manual lifting of heavy loads" }, consequence: { ar: "إصابات ظهر، فتق", en: "Back injuries, hernia" }, likelihood: 4, severity: 3, controls: { ar: "حد أقصى 25 كجم، تدريب الرفع الصحيح، استخدام العربات والرافعات", en: "Max 25 kg, lifting technique training, use of trolleys and lifts" }, category: "ergonomic" },
  { id: "seed-12", area: "Receiving Bay — Air Cargo Reception", hazard: { ar: "استقبال بضائع خارج نطاق درجة الحرارة", en: "Receiving goods outside temperature range" }, consequence: { ar: "فساد، سحب منتج", en: "Spoilage, product recall" }, likelihood: 3, severity: 5, controls: { ar: "فحص حرارة إلزامي، رفض البضائع المخالفة، سجلات استلام", en: "Mandatory temperature check, reject non-conforming goods, receiving logs" }, category: "coldchain" },
  { id: "seed-13", area: "All sites", hazard: { ar: "حرائق (كهربائية / مواد تغليف)", en: "Fire (electrical / packaging materials)" }, consequence: { ar: "خسائر بشرية ومادية ضخمة", en: "Massive human and material losses" }, likelihood: 4, severity: 4, controls: { ar: "أنظمة رش آلية، طفايات كل 15م، إنذار متصل بالدفاع المدني، تدريب إخلاء", en: "Automatic sprinklers, extinguishers every 15m, alarm linked to Civil Defence, evacuation training" }, category: "fire" },
  { id: "seed-14", area: "All sites", hazard: { ar: "صعق كهربائي", en: "Electric shock" }, consequence: { ar: "وفاة، حروق", en: "Death, burns" }, likelihood: 3, severity: 5, controls: { ar: "قفل/وسم (LOTO)، فنيون معتمدون فقط، قواطع تيار، فحص دوري", en: "LOTO, certified technicians only, circuit breakers, periodic inspection" }, category: "fire" },
  { id: "seed-15", area: "All sites", hazard: { ar: "تلوث بكتيري (Salmonella, E. coli, Listeria)", en: "Bacterial contamination (Salmonella, E. coli, Listeria)" }, consequence: { ar: "تسمم غذائي جماعي، دعاوى قضائية", en: "Mass food poisoning, lawsuits" }, likelihood: 4, severity: 4, controls: { ar: "مسحات أسبوعية، تعقيم، تحكم بدرجة الحرارة، فحص طبي للعمال", en: "Weekly swabs, sanitation, temperature control, employee medical checks" }, category: "biological" },
  { id: "seed-16", area: "All sites", hazard: { ar: "الإصابة بالحشرات والقوارض", en: "Pest / rodent infestation" }, consequence: { ar: "تلوث، إغلاق من البلدية", en: "Contamination, DM closure" }, likelihood: 3, severity: 4, controls: { ar: "عقد مع شركة معتمدة، فحص شهري، مصائد حول المحيط، سدّ الفتحات", en: "Approved company contract, monthly inspection, perimeter traps, seal openings" }, category: "pest" },
  { id: "seed-17", area: "Distribution Fleet (Refrigerated trucks)", hazard: { ar: "عطل التبريد أثناء النقل", en: "Refrigeration failure during transport" }, consequence: { ar: "فساد الشحنة، خسائر مالية", en: "Shipment spoilage, financial loss" }, likelihood: 3, severity: 4, controls: { ar: "أجهزة تسجيل حرارة (Data loggers)، صيانة دورية، خطة بديلة", en: "Data loggers, periodic maintenance, contingency plan" }, category: "coldchain" },
  { id: "seed-18", area: "Distribution Fleet (Refrigerated trucks)", hazard: { ar: "حوادث مرورية", en: "Road traffic accidents" }, consequence: { ar: "إصابات، خسائر", en: "Injuries, losses" }, likelihood: 3, severity: 3, controls: { ar: "تتبع GPS، قيود سرعة، راحة السائق، فحص دوري للمركبات", en: "GPS tracking, speed limits, driver rest, periodic vehicle inspection" }, category: "physical" },
  { id: "seed-19", area: "All sites", hazard: { ar: "تصريف مياه ملوثة للصرف", en: "Discharge of contaminated water" }, consequence: { ar: "غرامات بيئية من البلدية", en: "Environmental fines from DM" }, likelihood: 3, severity: 3, controls: { ar: "مصائد دهون، معالجة أولية، سجلات صيانة، التعاقد مع شركة معتمدة", en: "Grease traps, primary treatment, maintenance logs, approved-company contract" }, category: "env" },
  { id: "seed-20", area: "All sites", hazard: { ar: "سوء إدارة النفايات العضوية", en: "Mismanagement of organic waste" }, consequence: { ar: "روائح، حشرات، غرامات", en: "Odors, pests, fines" }, likelihood: 4, severity: 3, controls: { ar: "حاويات مغطاة، إخلاء يومي، شركة نقل معتمدة من البلدية", en: "Covered containers, daily emptying, DM-approved waste carrier" }, category: "env" },
];

const blank = () => ({
  id: "",
  area: SITE_LOCATIONS[0].v,
  hazard: "",
  consequence: "",
  likelihood: 3,
  severity: 3,
  controls: "",
  category: HAZARD_CATEGORIES[0].v,
  owner: "",
  status: "active",
  reviewDate: todayISO(),
  createdAt: new Date().toISOString(),
});

// resolve a stored value (string or {ar,en}) to the active language
function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v[lang] ?? v.ar ?? v.en ?? "";
  return String(v);
}

export default function HSERiskRegister() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [risks, setRisks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let arr = loadLocal("risk_register");
    if (!arr || arr.length === 0) {
      arr = SEED_RISKS;
      saveLocal("risk_register", arr);
    }
    setRisks(arr);
  }, []);

  function persist(arr) { setRisks(arr); saveLocal("risk_register", arr); }

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }
  function startEdit(r) {
    // when editing existing, expose ar text in single-language fields
    setDraft({
      ...r,
      hazard: typeof r.hazard === "object" ? (r.hazard[lang] ?? r.hazard.ar ?? "") : r.hazard,
      consequence: typeof r.consequence === "object" ? (r.consequence[lang] ?? r.consequence.ar ?? "") : r.consequence,
      controls: typeof r.controls === "object" ? (r.controls[lang] ?? r.controls.ar ?? "") : r.controls,
    });
    setEditingId(r.id);
    setShowForm(true);
  }

  function save() {
    if (!String(draft.hazard).trim()) { alert(pick(T.enterHazard)); return; }
    if (editingId === "__new__") {
      const id = `risk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      persist([{ ...draft, id }, ...risks]);
    } else {
      persist(risks.map((r) => (r.id === editingId ? { ...draft, id: editingId } : r)));
    }
    setShowForm(false); setEditingId(null);
  }

  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    persist(risks.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (filter === "critical" && score < 20) return false;
      if (filter === "high" && (score < 13 || score >= 20)) return false;
      if (filter === "medium" && (score < 6 || score >= 13)) return false;
      if (filter === "low" && score >= 6) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = `${txt(r.hazard, lang)} ${r.area} ${txt(r.controls, lang)}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [risks, filter, search, lang]);

  const stats = useMemo(() => {
    const out = { total: risks.length, critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (score >= 20) out.critical++;
      else if (score >= 13) out.high++;
      else if (score >= 6) out.medium++;
      else out.low++;
    });
    return out;
  }, [risks]);

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
            <button style={buttonPrimary} onClick={startNew}>{pick(T.add)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        {/* Methodology block */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 8, color: HSE_COLORS.primaryDark }}>{pick(T.methodologyTitle)}</div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.methodologyExplain)}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.methCols.score)}</th>
                  <th style={thStyle}>{pick(T.methCols.level)}</th>
                  <th style={thStyle}>{pick(T.methCols.action)}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, background: "#dcfce7", color: "#166534" }}>1 – 5</td>   <td style={{ ...tdStyle, fontWeight: 800, color: "#166534" }}>{pick(T.methLow)}</td>   <td style={tdStyle}>{pick(T.methActLow)}</td></tr>
                <tr><td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, background: "#fef9c3", color: "#854d0e" }}>6 – 12</td>  <td style={{ ...tdStyle, fontWeight: 800, color: "#854d0e" }}>{pick(T.methMed)}</td>   <td style={tdStyle}>{pick(T.methActMed)}</td></tr>
                <tr><td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, background: "#fed7aa", color: "#9a3412" }}>13 – 19</td> <td style={{ ...tdStyle, fontWeight: 800, color: "#9a3412" }}>{pick(T.methHigh)}</td>  <td style={tdStyle}>{pick(T.methActHigh)}</td></tr>
                <tr><td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, background: "#fee2e2", color: "#7f1d1d" }}>20 – 25</td> <td style={{ ...tdStyle, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.methCrit)}</td>  <td style={tdStyle}>{pick(T.methActCrit)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { label: pick(T.total), val: stats.total, bg: "#e0e7ff", color: "#3730a3" },
            { label: pick(T.critical), val: stats.critical, bg: "#fee2e2", color: "#7f1d1d" },
            { label: pick(T.high), val: stats.high, bg: "#fed7aa", color: "#9a3412" },
            { label: pick(T.medium), val: stats.medium, bg: "#fef9c3", color: "#854d0e" },
            { label: pick(T.low), val: stats.low, bg: "#dcfce7", color: "#166534" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: s.bg, color: s.color, border: "1px solid rgba(120,53,15,0.18)", boxShadow: HSE_COLORS.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 950 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
            <option value="all">{pick(T.fAll)}</option>
            <option value="critical">{pick(T.fCritical)}</option>
            <option value="high">{pick(T.fHigh)}</option>
            <option value="medium">{pick(T.fMedium)}</option>
            <option value="low">{pick(T.fLow)}</option>
          </select>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{pick(T.shown)} {filtered.length} / {risks.length}</span>
        </div>

        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 14, border: `2px solid ${HSE_COLORS.primary}` }}>
            <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>
              {editingId === "__new__" ? pick(T.newTitle) : pick(T.editTitle)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.area)}</label>
                <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.category)}</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={inputStyle}>
                  {HAZARD_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.owner)}</label>
                <input type="text" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder={pick(T.ownerPh)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.likelihood)}</label>
                <input type="number" min="1" max="5" value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: Number(e.target.value) || 1 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.severity)}</label>
                <input type="number" min="1" max="5" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) || 1 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.reviewDate)}</label>
                <input type="date" value={draft.reviewDate} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.hazard)}</label>
              <input type="text" value={draft.hazard} onChange={(e) => setDraft({ ...draft, hazard: e.target.value })} placeholder={pick(T.hazardPh)} style={inputStyle} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.consequence)}</label>
              <textarea value={draft.consequence} onChange={(e) => setDraft({ ...draft, consequence: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.controls)}</label>
              <textarea value={draft.controls} onChange={(e) => setDraft({ ...draft, controls: e.target.value })} style={{ ...inputStyle, minHeight: 80 }} />
            </div>

            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fff7ed", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{pick(T.currentScore)}</span>
              <span style={{ padding: "4px 10px", borderRadius: 999, background: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).bg, color: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).color, fontWeight: 900 }}>
                {calcRiskScore(draft.likelihood, draft.severity)} — {riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).level}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.save)}</button>
              <button style={buttonGhost} onClick={() => { setShowForm(false); setEditingId(null); }}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.cols.area)}</th>
                <th style={thStyle}>{pick(T.cols.hazard)}</th>
                <th style={thStyle}>{pick(T.cols.score)}</th>
                <th style={thStyle}>{pick(T.cols.level)}</th>
                <th style={thStyle}>{pick(T.cols.controls)}</th>
                <th style={thStyle}>{pick(T.cols.owner)}</th>
                <th style={thStyle}>{pick(T.cols.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const score = calcRiskScore(r.likelihood, r.severity);
                const lvl = riskLevelLabel(score, lang);
                // localize area name from constants
                const areaItem = SITE_LOCATIONS.find((s) => s.v === r.area);
                const areaTxt = areaItem ? areaItem[lang] : r.area;
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}>{areaTxt}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {txt(r.hazard, lang)}
                      {r.consequence && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>↳ {txt(r.consequence, lang)}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{r.likelihood} × {r.severity} = {score}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 8px", borderRadius: 8, background: lvl.bg, color: lvl.color, fontWeight: 900, fontSize: 12 }}>
                        {lvl.level}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, maxWidth: 280 }}>{txt(r.controls, lang)}</td>
                    <td style={tdStyle}>{r.owner}</td>
                    <td style={tdStyle}>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c", marginInlineStart: 4 }} onClick={() => remove(r.id)}>{pick(T.del)}</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="7" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
