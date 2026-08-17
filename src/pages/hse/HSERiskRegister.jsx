// src/pages/hse/HSERiskRegister.jsx
// سجل المخاطر التشغيلية — تصميم كروت + مودال (على طراز كرت ISO/HACCP) ثنائي اللغة.
// يعالج تكرار/خلط لغة البيانات القديمة عبر دمجها مع المرجع الثنائي اللغة.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import {
  pageStyle, containerStyle, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiDelete, apiUpdate, calcRiskScore, riskLevelLabel,
  SITE_LOCATIONS, HAZARD_CATEGORIES, tableStyle, thStyle, tdStyle,
  useHSELang,
} from "./hseShared";

const T = {
  pageTitle:    { ar: "⚠️ سجل المخاطر التشغيلية", en: "⚠️ Operational Risk Register" },
  pageSubtitle: { ar: "التقييم = الاحتمالية × الشدة (1-5 لكل منهما) → 1 إلى 25",
                  en: "Score = Likelihood × Severity (1–5 each) → 1 to 25" },
  pageIntro: {
    ar: "يُعدّ سجل المخاطر (Risk Register) الوثيقة الأهم في نظام إدارة HSE، لأنه الأساس الذي تُبنى عليه جميع السياسات وإجراءات التحكم. يُراجَع سنوياً أو عند: إدخال معدات جديدة، تغيير عمليات، حادث كبير، أو ملاحظة تفتيش حكومي. يحتوي على 20 خطر مُعرّف مسبقاً، ويمكن إضافة المزيد.",
    en: "The Risk Register is the most important document in an HSE management system — the foundation on which all policies and controls are built. Reviewed annually or when new equipment is introduced, processes change, a major incident occurs, or a government inspection finding is raised. It contains 20 pre-identified risks; more can be added.",
  },
  methodologyTitle: { ar: "🧮 منهجية التقييم", en: "🧮 Assessment Methodology" },
  methodologyExplain: {
    ar: "يُحسب مستوى الخطورة بضرب الاحتمالية (1–5) في الشدة (1–5). الاحتمالية: 1=نادر جداً … 5=شبه مؤكد. الشدة: 1=لا أثر … 5=وفاة/كارثة.",
    en: "Risk Score = Likelihood (1–5) × Severity (1–5). Likelihood: 1=very rare … 5=almost certain. Severity: 1=no impact … 5=fatality/disaster.",
  },
  back:         { ar: "← HSE", en: "← HSE" },
  add:          { ar: "+ إضافة خطر", en: "+ Add Risk" },
  newTitle:     { ar: "➕ إضافة خطر جديد", en: "➕ Add new risk" },
  editTitle:    { ar: "✏️ تعديل الخطر", en: "✏️ Edit risk" },
  search:       { ar: "بحث…", en: "Search…" },
  shown:        { ar: "المعروض:", en: "Showing:" },
  fAll:         { ar: "الكل", en: "All" },
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
  edit:         { ar: "تعديل", en: "Edit" },
  del:          { ar: "حذف", en: "Delete" },
  viewDetails:  { ar: "عرض التفاصيل", en: "View Details" },
  noResults:    { ar: "لا توجد مخاطر بهذه الفلاتر", en: "No risks match these filters" },
  enterHazard:  { ar: "اكتب وصف الخطر أولاً", en: "Enter the hazard description first" },
  confirmDel:   { ar: "حذف هذا الخطر؟", en: "Delete this risk?" },
  cleanDup:     { ar: "🧹 حذف المكرر", en: "🧹 Remove duplicates" },
  cleaning:     { ar: "⏳ جارٍ التنظيف…", en: "⏳ Cleaning…" },
  dupFound:     { ar: "سجلات مكررة", en: "duplicate records" },
  confirmClean: { ar: "سيتم حذف السجلات المكررة من السيرفر والإبقاء على نسخة واحدة لكل خطر. متابعة؟",
                  en: "This deletes duplicate records from the server, keeping one per risk. Continue?" },
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

// Default owners per seed (kept separate so seed text stays untouched).
const SEED_OWNERS = {
  "seed-1": "HSE Site Officer", "seed-2": "HSE Manager", "seed-3": "Maintenance + HSE",
  "seed-4": "Maintenance + HSE", "seed-5": "HSE Site Officer", "seed-6": "HSE Manager",
  "seed-7": "Food Safety Officer", "seed-8": "HSE Site Officer", "seed-9": "HSE Site Officer",
  "seed-10": "HSE Site Officer", "seed-11": "HSE Site Officer", "seed-12": "Food Safety Officer",
  "seed-13": "HSE Manager", "seed-14": "Maintenance + HSE", "seed-15": "Food Safety Officer",
  "seed-16": "Food Safety Officer", "seed-17": "Fleet + Food Safety", "seed-18": "Fleet Manager",
  "seed-19": "HSE Manager", "seed-20": "HSE Coordinator",
};

// Al Mawashi document control (issue year 2025)
const DOC_CONTROL = {
  docTitle: { ar: "سجل المخاطر التشغيلية", en: "Operational Risk Register" },
  docNumber: "HSE-REG/RISK/01",
  issueDate: "01/01/2025",
  revision: "01",
  area: "HSE",
  issuedBy: "HSE Manager",
  approvedBy: "Top Management",
};

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

/* ---- normalise + dedupe old bilingual/duplicate records against the seed ---- */
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const SEED_LOOKUP = (() => {
  const m = new Map();
  SEED_RISKS.forEach((s) => { m.set(norm(s.hazard.ar), s); m.set(norm(s.hazard.en), s); });
  return m;
})();

// Given the raw server records, collapse seed duplicates (any language form) into a
// single bilingual record so the language toggle works, and report deletable dup ids.
function enrichAndDedupe(rawList) {
  const seen = new Map();
  const out = [];
  const dupIds = [];
  for (const r of rawList) {
    const cands = [];
    if (typeof r.hazard === "string") cands.push(r.hazard);
    else if (r.hazard && typeof r.hazard === "object") { cands.push(r.hazard.ar, r.hazard.en); }
    let seed = null;
    for (const c of cands) { const hit = SEED_LOOKUP.get(norm(c)); if (hit) { seed = hit; break; } }
    if (seed) {
      const key = "seed:" + seed.id;
      const enriched = {
        ...r,
        area: r.area || seed.area,
        category: r.category || seed.category,
        likelihood: r.likelihood ?? seed.likelihood,
        severity: r.severity ?? seed.severity,
        owner: r.owner || SEED_OWNERS[seed.id] || "",
        hazard: seed.hazard, consequence: seed.consequence, controls: seed.controls,
        _seedId: seed.id,
      };
      if (!seen.has(key)) { seen.set(key, enriched); out.push(enriched); }
      else {
        const existing = seen.get(key);
        // Prefer keeping the record that actually carries an owner value.
        if (!(existing._rawOwner) && r.owner) {
          dupIds.push(existing.id);
          const idx = out.indexOf(existing);
          enriched._rawOwner = r.owner;
          if (idx >= 0) out[idx] = enriched;
          seen.set(key, enriched);
        } else {
          dupIds.push(r.id);
        }
      }
      if (r.owner) seen.get(key)._rawOwner = r.owner;
    } else {
      const key = "id:" + r.id;
      if (!seen.has(key)) { seen.set(key, r); out.push(r); }
    }
  }
  return { list: out, dupIds };
}

/* ---------------- PDF: capture a node and slice across A4 pages ---------------- */
async function exportNodeToPdf(node, filename) {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF("p", "pt", "a4");
  const margin = 22;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - margin * 2;
  const ratio = imgW / canvas.width;
  const sliceH = Math.floor((pageH - margin * 2) / ratio);
  let y = 0, first = true;
  while (y < canvas.height) {
    const h = Math.min(sliceH, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width; slice.height = h;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage("a4", "p");
    pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, imgW, h * ratio);
    first = false; y += h;
  }
  pdf.save(filename);
}

/* ---------------- CSV export of the register rows ---------------- */
function exportRegisterCsv(rows, lang) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const headers = ["Area", "Hazard", "Consequence", "Likelihood", "Severity", "Score", "Level", "Controls", "Owner", "Next Review"];
  const lines = [headers.map(esc).join(",")];
  rows.forEach((r) => {
    const score = calcRiskScore(r.likelihood, r.severity);
    const areaItem = SITE_LOCATIONS.find((s) => s.v === r.area);
    lines.push([
      areaItem ? areaItem[lang] : r.area,
      txt(r.hazard, lang), txt(r.consequence, lang),
      r.likelihood, r.severity, score, riskLevelLabel(score, lang).level,
      txt(r.controls, lang), r.owner || "", r.reviewDate || "",
    ].map(esc).join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Risk_Register_${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Off-screen controlled register document for PDF ---------------- */
function RegisterPrintable({ rows, lang, stats, innerRef }) {
  const isAr = lang === "ar";
  const cell = { border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 10.5, verticalAlign: "top", textAlign: isAr ? "right" : "left" };
  const th = { ...cell, background: "#f1f5f9", fontWeight: 900, color: "#475569" };
  return (
    <div aria-hidden="true" style={{ position: "fixed", left: -14000, top: 0, pointerEvents: "none" }}>
      <div ref={innerRef} style={{ width: 900, background: "#fff", padding: 30, boxSizing: "border-box", direction: isAr ? "rtl" : "ltr", fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif', color: "#0f172a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #ea580c", paddingBottom: 12, marginBottom: 12 }}>
          <img src={mawashiLogo} alt="Al Mawashi" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 950 }}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{isAr ? "المواشي — نظام إدارة HSE" : "AL MAWASHI — HSE Management System"}</div>
          </div>
          <div style={{ textAlign: isAr ? "left" : "right", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: "#ea580c" }}>{isAr ? "سجل المخاطر التشغيلية" : "Operational Risk Register"}</div>
          </div>
        </div>

        {/* Al Mawashi document-control table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <tbody>
            {[
              [isAr ? "عنوان الوثيقة" : "Document Title", txt(DOC_CONTROL.docTitle, lang), isAr ? "رقم الوثيقة" : "Document No.", DOC_CONTROL.docNumber],
              [isAr ? "تاريخ الإصدار" : "Issue Date", DOC_CONTROL.issueDate, isAr ? "رقم المراجعة" : "Revision", DOC_CONTROL.revision],
              [isAr ? "القسم" : "Area", DOC_CONTROL.area, isAr ? "أصدره" : "Issued By", DOC_CONTROL.issuedBy],
              [isAr ? "اعتمده" : "Approved By", DOC_CONTROL.approvedBy, isAr ? "تاريخ الطباعة" : "Printed", todayISO()],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ ...th, width: "16%" }}>{r[0]}</td>
                <td style={{ ...cell, width: "34%", fontWeight: 700 }}>{r[1]}</td>
                <td style={{ ...th, width: "16%" }}>{r[2]}</td>
                <td style={{ ...cell, width: "34%", fontWeight: 700 }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            [isAr ? "الإجمالي" : "Total", stats.total, "#3730a3"],
            [isAr ? "حرج" : "Critical", stats.critical, "#7f1d1d"],
            [isAr ? "عالي" : "High", stats.high, "#9a3412"],
            [isAr ? "متوسط" : "Medium", stats.medium, "#854d0e"],
            [isAr ? "منخفض" : "Low", stats.low, "#166534"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 16, fontWeight: 950, color: c }}>{v}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginInlineStart: 6 }}>{l}</span>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "13%" }}>{isAr ? "المنطقة" : "Area"}</th>
              <th style={{ ...th, width: "24%" }}>{isAr ? "الخطر / العواقب" : "Hazard / Consequence"}</th>
              <th style={{ ...th, width: "8%", textAlign: "center" }}>L×S</th>
              <th style={{ ...th, width: "10%" }}>{isAr ? "المستوى" : "Level"}</th>
              <th style={{ ...th, width: "30%" }}>{isAr ? "إجراءات التحكم" : "Controls"}</th>
              <th style={{ ...th, width: "15%" }}>{isAr ? "المسؤول" : "Owner"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const score = calcRiskScore(r.likelihood, r.severity);
              const lvl = riskLevelLabel(score, lang);
              const areaItem = SITE_LOCATIONS.find((s) => s.v === r.area);
              return (
                <tr key={r.id}>
                  <td style={cell}>{areaItem ? areaItem[lang] : r.area}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 800 }}>{txt(r.hazard, lang)}</div>
                    {r.consequence && <div style={{ color: "#64748b", marginTop: 2 }}>↳ {txt(r.consequence, lang)}</div>}
                  </td>
                  <td style={{ ...cell, textAlign: "center", fontWeight: 900 }}>{r.likelihood}×{r.severity}={score}</td>
                  <td style={cell}><span style={{ padding: "2px 6px", borderRadius: 6, background: lvl.bg, color: lvl.color, fontWeight: 900 }}>{lvl.level}</span></td>
                  <td style={cell}>{txt(r.controls, lang)}</td>
                  <td style={cell}>{r.owner || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 14, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
          © Al Mawashi — HSE Management System · {isAr ? "سجل المخاطر التشغيلية" : "Operational Risk Register"} · {rows.length} {isAr ? "خطر" : "risks"}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Icons ---------------- */
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
// Row background tint by risk level (light shade of the level colour).
const LEVEL_ROW_BG = { "#7f1d1d": "#fef2f2", "#9a3412": "#fff7ed", "#854d0e": "#fefce8", "#166534": "#f0fdf4" };

/* ============================================================ */
export default function HSERiskRegister() {
  const navigate = useNavigate();
  const { lang, setLang, dir, pick } = useHSELang();
  const isAr = lang === "ar";
  const [rawRisks, setRawRisks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const printRef = useRef(null);

  const { list: risks, dupIds } = useMemo(() => enrichAndDedupe(rawRisks), [rawRisks]);

  async function reload() {
    const arr = await apiList("risk_register");
    if (!arr || arr.length === 0) {
      try {
        for (const seed of SEED_RISKS) await apiSave("risk_register", { ...seed, owner: SEED_OWNERS[seed.id] || "" }, "HSE_seed");
        setRawRisks(await apiList("risk_register"));
        return;
      } catch (e) {
        console.warn("Risk Register seed failed, showing local SEED:", e?.message || e);
        setRawRisks(SEED_RISKS.map((s) => ({ ...s, owner: SEED_OWNERS[s.id] || "" })));
        return;
      }
    }
    setRawRisks(arr);
  }
  useEffect(() => { reload(); }, []);

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }
  function startEdit(r) {
    setDraft({
      ...r,
      hazard: txt(r.hazard, lang),
      consequence: txt(r.consequence, lang),
      controls: txt(r.controls, lang),
    });
    setEditingId(r.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.hazard).trim()) { alert(pick(T.enterHazard)); return; }
    setSaving(true);
    try {
      const payload = { ...draft };
      delete payload._seedId; delete payload._rawOwner;
      if (editingId === "__new__") await apiSave("risk_register", payload);
      else await apiUpdate("risk_register", editingId, payload);
      await reload();
      setShowForm(false); setEditingId(null);
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  async function cleanDuplicates() {
    if (!dupIds.length) return;
    if (!window.confirm(pick(T.confirmClean))) return;
    setCleaning(true);
    try {
      for (const id of dupIds) { if (id) await apiDelete(id); }
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالتنظيف: ", en: "❌ Cleanup error: " })) + (e?.message || e));
    } finally {
      setCleaning(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const node = printRef.current;
      if (!node) throw new Error("PDF content not ready.");
      await exportNodeToPdf(node, `Risk_Register_${todayISO()}.pdf`);
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بتصدير PDF: ", en: "❌ PDF export error: " })) + (e?.message || e));
    } finally {
      setExporting(false);
    }
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
        const hay = `${txt(r.hazard, lang)} ${txt(r.hazard, "en")} ${r.area} ${txt(r.controls, lang)}`.toLowerCase();
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

  const FILTERS = [
    { key: "all", label: pick(T.fAll), color: "#334155" },
    { key: "critical", label: pick(T.critical), color: "#7f1d1d" },
    { key: "high", label: pick(T.high), color: "#9a3412" },
    { key: "medium", label: pick(T.medium), color: "#854d0e" },
    { key: "low", label: pick(T.low), color: "#166534" },
  ];

  return (
    <main style={pageStyle} dir={dir}>
      <RegisterPrintable rows={filtered} lang={lang} stats={stats} innerRef={printRef} />

      <div style={containerStyle}>
        {/* Glassy top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,0.86)", border: "1px solid rgba(120,53,15,0.18)", boxShadow: "0 14px 40px rgba(234,88,12,0.12)", backdropFilter: "blur(12px)", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src={mawashiLogo} alt="Al Mawashi" style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(234,88,12,0.18)", background: "#fff" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 950, lineHeight: 1.2 }}>{pick(T.pageTitle)}</div>
              <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 3 }}>{pick(T.pageSubtitle)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(234,88,12,0.40)" }}>
              {["en", "ar"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "7px 15px", fontSize: 13, fontWeight: 900, cursor: "pointer",
                  background: lang === l ? "linear-gradient(135deg,rgba(251,146,60,0.30),rgba(245,158,11,0.20))" : "rgba(255,255,255,0.70)",
                  border: "none", color: lang === l ? "#7c2d12" : "#64748b",
                }}>
                  {l === "en" ? "EN" : "العربية"}
                </button>
              ))}
            </div>
            {dupIds.length > 0 && (
              <button style={{ ...buttonGhost, color: "#b45309", borderColor: "#fcd34d", background: "#fffbeb", opacity: cleaning ? 0.6 : 1 }} disabled={cleaning} onClick={cleanDuplicates}>
                {cleaning ? pick(T.cleaning) : `${pick(T.cleanDup)} (${dupIds.length})`}
              </button>
            )}
            <button style={{ ...buttonGhost, opacity: exporting ? 0.6 : 1 }} disabled={exporting} onClick={exportPdf}>⬇️ PDF</button>
            <button style={buttonGhost} onClick={() => exportRegisterCsv(filtered, lang)}>⬇️ CSV</button>
            <button style={buttonPrimary} onClick={startNew}>{pick(T.add)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Al Mawashi document-control header */}
        <div style={{ ...cardStyle, marginBottom: 14, padding: "16px 20px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
          <img src={mawashiLogo} alt="AL MAWASHI" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "1px solid #fed7aa" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {[
              { l: pick({ ar: "عنوان الوثيقة", en: "Document Title" }), v: pick(DOC_CONTROL.docTitle) },
              { l: pick({ ar: "رقم الوثيقة", en: "Document No." }), v: DOC_CONTROL.docNumber },
              { l: pick({ ar: "تاريخ الإصدار", en: "Issue Date" }), v: DOC_CONTROL.issueDate },
              { l: pick({ ar: "رقم المراجعة", en: "Revision" }), v: DOC_CONTROL.revision },
              { l: pick({ ar: "القسم", en: "Area" }), v: DOC_CONTROL.area },
              { l: pick({ ar: "أصدره", en: "Issued By" }), v: DOC_CONTROL.issuedBy },
              { l: pick({ ar: "اعتمده", en: "Approved By" }), v: DOC_CONTROL.approvedBy },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1f0f00" }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Intro + methodology */}
        <details style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #fff7ed, #ffffff)", borderInlineStart: "5px solid #ea580c" }}>
          <summary style={{ cursor: "pointer", fontWeight: 900, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{pick(T.methodologyTitle)}</summary>
          <p style={{ fontSize: 13.5, lineHeight: 1.9, color: "#1f0f00", margin: "10px 0 8px" }}>{pick(T.pageIntro)}</p>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "#475569", margin: 0 }}>{pick(T.methodologyExplain)}</p>
        </details>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {[
            { label: pick(T.total), val: stats.total, color: "#3730a3" },
            { label: pick(T.critical), val: stats.critical, color: "#7f1d1d" },
            { label: pick(T.high), val: stats.high, color: "#9a3412" },
            { label: pick(T.medium), val: stats.medium, color: "#854d0e" },
            { label: pick(T.low), val: stats.low, color: "#166534" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15,23,42,0.12)", boxShadow: "0 6px 18px rgba(234,88,12,0.08)" }}>
              <div style={{ fontSize: 22, fontWeight: 980, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.16)", flex: 1, minWidth: 220, maxWidth: 320 }}>
            <IconSearch />
            <input style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "#071b2d", flex: 1 }} placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: "pointer",
                background: active ? f.color : "rgba(255,255,255,0.8)",
                border: active ? `1px solid ${f.color}` : "1px solid rgba(15,23,42,0.14)",
                color: active ? "#fff" : "#334155",
              }}>
                {f.label}
              </button>
            );
          })}
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{pick(T.shown)} {filtered.length} / {risks.length}</span>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 16, border: `2px solid ${HSE_COLORS.primary}` }}>
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
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.save)}
              </button>
              <button style={buttonGhost} onClick={() => { setShowForm(false); setEditingId(null); }} disabled={saving}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {/* Risk table — coloured by level */}
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.area)}</th>
                <th style={thStyle}>{pick(T.hazard)}</th>
                <th style={{ ...thStyle, textAlign: "center" }}>L × S</th>
                <th style={thStyle}>{isAr ? "المستوى" : "Level"}</th>
                <th style={thStyle}>{pick(T.controls)}</th>
                <th style={thStyle}>{pick(T.owner)}</th>
                <th style={thStyle}>{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const score = calcRiskScore(r.likelihood, r.severity);
                const lvl = riskLevelLabel(score, lang);
                const areaItem = SITE_LOCATIONS.find((s) => s.v === r.area);
                const areaTxt = areaItem ? areaItem[lang] : r.area;
                const rowBg = LEVEL_ROW_BG[lvl.color] || "#fff";
                return (
                  <tr key={r.id} style={{ background: rowBg }}>
                    <td style={{ ...tdStyle, borderInlineStart: `4px solid ${lvl.color}`, fontWeight: 700 }}>{areaTxt}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {txt(r.hazard, lang)}
                      {r.consequence && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>↳ {txt(r.consequence, lang)}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{r.likelihood} × {r.severity} = {score}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 10px", borderRadius: 999, background: lvl.bg, color: lvl.color, fontWeight: 900, fontSize: 12 }}>{lvl.level}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, maxWidth: 300 }}>{txt(r.controls, lang)}</td>
                    <td style={tdStyle}>{r.owner || "—"}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c", borderColor: "#fecaca", marginInlineStart: 4 }} onClick={() => remove(r.id)}>{pick(T.del)}</button>
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
