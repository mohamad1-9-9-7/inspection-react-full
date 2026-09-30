// src/pages/training/TrainingReferenceModal.jsx
// Shared trainer reference card — used by TrainingSessionCreate AND TrainingSessionsList
import React, { useState } from 'react';
import { CompanyMark, companyLine } from "./brand";
import { SWEETS_MODULE_DETAILS_BI } from "./content";
import { useGlobalLang, getModuleName } from './TrainingSessionsList.helpers';

/* ===================== Letter colour palette (A–L) ===================== */
export const LETTER_PALETTE = [
  '#4338ca','#0d9488','#dc2626','#7c3aed','#d97706','#059669',
  '#2563eb','#db2777','#0891b2','#65a30d','#ea580c','#9333ea',
];

export const DEFAULT_DETAILS_BI = `A) General food safety & hygiene requirements (site rules).
   أ) متطلبات السلامة الغذائية والنظافة العامة (قواعد الموقع).
B) Time/Temperature control basics and monitoring.
   ب) أساسيات التحكم بالوقت/الحرارة والمراقبة.
C) Date control: production/expiry/use-by and FEFO.
   ج) التحكم بالتواريخ: إنتاج/انتهاء/صلاحية الاستعمال وتطبيق FEFO.
D) Segregation: expired/hold/reject identification.
   د) العزل: تمييز منتهي/معلّق/مرفوض.
E) Cross contamination prevention (tools, surfaces, covering).
   هـ) منع التلوث المتبادل (أدوات، أسطح، تغطية).
F) Cleaning and sanitation basics (sequence and records).
   و) أساسيات التنظيف والتعقيم (التسلسل والسجلات).
G) Chemical storage & safe handling (SDS/PPE).
   ز) تخزين واستخدام المواد الكيميائية بأمان (SDS/PPE).
H) Personal hygiene & PPE compliance.
   ح) نظافة شخصية والالتزام بوسائل الوقاية.
I) Waste handling and housekeeping.
   ط) إدارة النفايات ونظافة الموقع.
J) Incident/NC reporting and corrective action.
   ي) الإبلاغ عن الحوادث/عدم المطابقة والإجراء التصحيحي.
K) Verification: supervisor/QA checks.
   ك) التحقق: تفتيش المشرف/QA.
L) Documentation: fill records correctly and on time.
   ل) التوثيق: تعبئة السجلات بشكل صحيح وفي الوقت المحدد.`;

/* This company's modules — references live in ./content/references.js. */
export const MODULE_DETAILS_BI = {
  ...SWEETS_MODULE_DETAILS_BI,
  __DEFAULT__: DEFAULT_DETAILS_BI,
};

/* ===================== Parse A–L bilingual text ===================== */
export function parseRefSections(text) {
  if (!text) return [];
  const result = [];
  const lines = text.split('\n');
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^([A-L])\)\s*(.+)/);
    if (m) {
      if (cur) result.push(cur);
      cur = { letter: m[1], en: m[2].trim(), ar: '', body: [] };
      continue;
    }
    if (cur) {
      const tr = line.trim();
      if (!tr) continue;
      if (/^[أ-ي]\)\s/.test(tr)) {
        cur.ar = tr.replace(/^[أ-ي]\)\s*/, '').trim();
      } else {
        cur.body.push(tr);
      }
    }
  }
  if (cur) result.push(cur);
  return result;
}

/* ===================== Module Illustrations (SVG) ===================== */
export function getModuleIllustration(n) {
  n = n || '';
  const Svg = ({ children }) => (
    <svg viewBox="0 0 320 88" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', maxWidth:360, height:'auto', display:'block', margin:'0 auto' }}>
      {children}
    </svg>
  );

  if (n.includes('Hygiene')) {
    const steps = [
      { x:28,  col:'#3b82f6', t1:'WET',   t2:'ابلل' },
      { x:83,  col:'#8b5cf6', t1:'SOAP',  t2:'صابون' },
      { x:138, col:'#ec4899', t1:'SCRUB', t2:'افرك' },
      { x:193, col:'#0ea5e9', t1:'RINSE', t2:'اشطف' },
      { x:248, col:'#10b981', t1:'DRY',   t2:'جفف' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HANDWASHING PROCEDURE — طريقة غسل اليدين</text>
      {steps.map((s, i) => <g key={i}>
        <circle cx={s.x} cy={48} r={21} fill={s.col} opacity={0.15}/>
        <circle cx={s.x} cy={48} r={21} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={44} textAnchor="middle" fontSize={12} fontWeight="800" fill={s.col}>{i+1}</text>
        <text x={s.x} y={55} textAnchor="middle" fontSize={7} fontWeight="700" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={79} textAnchor="middle" fontSize={8} fill="#64748b">{s.t2}</text>
        {i < 4 && <text x={s.x+30} y={52} textAnchor="middle" fontSize={13} fill="#cbd5e1">›</text>}
      </g>)}
      <text x={160} y={88} textAnchor="middle" fontSize={7} fill="#94a3b8">20 seconds minimum each step | 20 ثانية على الأقل</text>
    </Svg>;
  }

  if (n.includes('GHP') || n.includes('Cleaning')) {
    const steps = [
      { col:'#0ea5e9', t:'PRE-RINSE' },
      { col:'#8b5cf6', t:'DETERGENT' },
      { col:'#f59e0b', t:'SCRUB' },
      { col:'#3b82f6', t:'RINSE' },
      { col:'#10b981', t:'SANITIZE' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">5-STEP CLEANING SEQUENCE — تسلسل التنظيف الخماسي</text>
      {steps.map((s, i) => {
        const x = 14 + i * 59;
        return <g key={i}>
          <rect x={x} y={19} width={54} height={52} fill={s.col} opacity={0.15} rx={8}/>
          <rect x={x} y={19} width={54} height={52} stroke={s.col} strokeWidth={1.5} fill="none" rx={8}/>
          <text x={x+27} y={38} textAnchor="middle" fontSize={15} fontWeight="900" fill={s.col}>{i+1}</text>
          <text x={x+27} y={52} textAnchor="middle" fontSize={7} fontWeight="700" fill={s.col}>{s.t}</text>
          {i < 4 && <text x={x+58} y={48} textAnchor="middle" fontSize={13} fill={s.col}>›</text>}
        </g>;
      })}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Sanitizer on dirty surface = INEFFECTIVE — never skip a step</text>
    </Svg>;
  }

  if (n.includes('Receiving')) {
    const checks = [
      { col:'#3b82f6', t:'TEMP',  ar:'حرارة' },
      { col:'#8b5cf6', t:'DATES', ar:'تواريخ' },
      { col:'#ec4899', t:'PACK',  ar:'تغليف' },
      { col:'#f59e0b', t:'LABEL', ar:'ملصق' },
      { col:'#10b981', t:'DOCS',  ar:'وثائق' },
    ];
    return <Svg>
      <text x={150} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">RECEIVING CHECKLIST — قائمة فحص الاستلام</text>
      {checks.map((c, i) => {
        const x = 22 + i * 57;
        return <g key={i}>
          <circle cx={x} cy={46} r={21} fill={c.col} opacity={0.15}/>
          <circle cx={x} cy={46} r={21} stroke={c.col} strokeWidth={1.8}/>
          <text x={x} y={42} textAnchor="middle" fontSize={7.5} fontWeight="800" fill={c.col}>{c.t}</text>
          <text x={x} y={53} textAnchor="middle" fontSize={8.5} fill="#64748b">{c.ar}</text>
          {i < 4 && <text x={x+26} y={49} textAnchor="middle" fontSize={12} fill="#94a3b8">›</text>}
        </g>;
      })}
      <rect x={286} y={22} width={30} height={52} fill="#f8fafc" rx={6} stroke="#e2e8f0" strokeWidth={1}/>
      <text x={301} y={38} textAnchor="middle" fontSize={7} fontWeight="700" fill="#16a34a">ACC</text>
      <text x={301} y={50} textAnchor="middle" fontSize={7} fontWeight="700" fill="#f59e0b">HOLD</text>
      <text x={301} y={62} textAnchor="middle" fontSize={7} fontWeight="700" fill="#dc2626">REJ</text>
      <text x={160} y={83} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Any single check failure = immediate action — never accept under pressure</text>
    </Svg>;
  }

  if (n.includes('Storage')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">CHILLER SEGREGATION — عزل البراد (منع التلوث بالتنقيط)</text>
      <rect x={26} y={17} width={268} height={64} fill="#f0f9ff" rx={10} stroke="#bae6fd" strokeWidth={1.5}/>
      <line x1={36} y1={37} x2={284} y2={37} stroke="#e0f2fe" strokeWidth={1}/>
      <line x1={36} y1={56} x2={284} y2={56} stroke="#e0f2fe" strokeWidth={1}/>
      <rect x={36} y={19} width={240} height={16} fill="#dcfce7" rx={4} opacity={0.8}/>
      <text x={156} y={30} textAnchor="middle" fontSize={8} fontWeight="700" fill="#15803d">TOP — RTE / COOKED — جاهز / مطبوخ</text>
      <rect x={36} y={39} width={240} height={15} fill="#fef9c3" rx={4} opacity={0.8}/>
      <text x={156} y={49} textAnchor="middle" fontSize={8} fontWeight="700" fill="#92400e">MIDDLE — PROCESSED / SEMI</text>
      <rect x={36} y={58} width={240} height={20} fill="#fee2e2" rx={4} opacity={0.8}/>
      <text x={156} y={71} textAnchor="middle" fontSize={8} fontWeight="700" fill="#dc2626">BOTTOM — RAW MEAT — لحم نيء (prevents drip)</text>
      <text x={10} y={52} textAnchor="middle" fontSize={7.5} fontWeight="800" fill="#1d4ed8">0-5°C</text>
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#0891b2" fontWeight="600">FEFO: First Expired First Out — الأقرب للانتهاء يُستخدم أولاً</text>
    </Svg>;
  }

  if (n.includes('Temperature') || n.includes('CCP')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">TEMPERATURE CONTROL ZONES — مناطق التحكم الحراري</text>
      <rect x={4}   y={20} width={68} height={52} fill="#dbeafe" rx={9}/>
      <text x={38}  y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#1d4ed8">FROZEN</text>
      <text x={38}  y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#1e40af">-18°C</text>
      <text x={38}  y={64} textAnchor="middle" fontSize={8} fill="#3b82f6">مجمّد</text>
      <rect x={80}  y={20} width={68} height={52} fill="#e0f2fe" rx={9}/>
      <text x={114} y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#0369a1">CHILLED</text>
      <text x={114} y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#075985">≤5°C</text>
      <text x={114} y={64} textAnchor="middle" fontSize={8} fill="#0ea5e9">مبرد</text>
      <rect x={156} y={14} width={88} height={60} fill="#fee2e2" rx={9}/>
      <text x={200} y={30} textAnchor="middle" fontSize={7} fontWeight="800" fill="#991b1b">DANGER ZONE</text>
      <text x={200} y={46} textAnchor="middle" fontSize={14} fontWeight="900" fill="#dc2626">5–60°C</text>
      <text x={200} y={58} textAnchor="middle" fontSize={8} fill="#ef4444">منطقة الخطر</text>
      <text x={200} y={68} textAnchor="middle" fontSize={6.5} fill="#b91c1c">bacteria multiply fast</text>
      <rect x={252} y={20} width={64} height={52} fill="#ffedd5" rx={9}/>
      <text x={284} y={37} textAnchor="middle" fontSize={7} fontWeight="800" fill="#c2410c">HOT HOLD</text>
      <text x={284} y={50} textAnchor="middle" fontSize={13} fontWeight="900" fill="#ea580c">60°C+</text>
      <text x={284} y={64} textAnchor="middle" fontSize={8} fill="#f97316">تسخين</text>
    </Svg>;
  }

  if (n.includes('HACCP')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HACCP CONTROL PYRAMID — هرم تحكم HACCP</text>
      <path d="M155,16 L310,82 L10,82 Z" fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.5}/>
      <line x1={62} y1={62} x2={248} y2={62} stroke="#16a34a" strokeWidth={1} strokeDasharray="3,2"/>
      <line x1={103} y1={42} x2={207} y2={42} stroke="#ea580c" strokeWidth={1} strokeDasharray="3,2"/>
      <text x={155} y={77} textAnchor="middle" fontSize={8} fontWeight="700" fill="#15803d">PRP — Prerequisite Programs — البرامج الأساسية</text>
      <text x={155} y={56} textAnchor="middle" fontSize={8} fontWeight="700" fill="#c2410c">OPRP — Operational PRPs</text>
      <text x={155} y={36} textAnchor="middle" fontSize={8} fontWeight="800" fill="#dc2626">CCP — Critical Control Points</text>
    </Svg>;
  }

  if (n.includes('Allergen')) {
    const allergens = ['GLUTEN','CRUSTACEANS','EGGS','FISH','PEANUTS','SOYBEANS','MILK','TREE NUTS','CELERY','MUSTARD','SESAME','SULPHITES','LUPIN','MOLLUSCS'];
    const cols = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#84cc16','#0ea5e9','#a855f7','#f43f5e'];
    return <Svg>
      <text x={160} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">14 MAJOR ALLERGENS — 14 مسبباً رئيسياً للحساسية</text>
      {allergens.map((a, i) => {
        const col = cols[i], x = 12 + (i % 7) * 42, y = i < 7 ? 16 : 53;
        return <g key={i}>
          <rect x={x} y={y} width={38} height={18} fill={col} opacity={0.18} rx={5}/>
          <rect x={x} y={y} width={38} height={18} stroke={col} strokeWidth={1} fill="none" rx={5}/>
          <text x={x+19} y={y+12} textAnchor="middle" fontSize={5.5} fontWeight="700" fill={col}>{a}</text>
        </g>;
      })}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Cooking does NOT destroy allergen proteins — once contaminated, always contaminated</text>
    </Svg>;
  }

  if (n.includes('Cross')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">SEPARATION RULE — قاعدة الفصل المطلق</text>
      <rect x={6}   y={18} width={130} height={56} fill="#fee2e2" rx={10}/>
      <text x={71}  y={38} textAnchor="middle" fontSize={10} fontWeight="800" fill="#dc2626">RAW MEAT</text>
      <text x={71}  y={51} textAnchor="middle" fontSize={9} fill="#ef4444">لحم نيء</text>
      <text x={71}  y={65} textAnchor="middle" fontSize={7} fill="#b91c1c">RED tools only</text>
      <rect x={141} y={14} width={38} height={60} fill="#1e293b" rx={8}/>
      <text x={160} y={39} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff">NO</text>
      <text x={160} y={50} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fbbf24">MIX</text>
      <text x={160} y={61} textAnchor="middle" fontSize={7} fontWeight="800" fill="#fff">EVER</text>
      <rect x={184} y={18} width={130} height={56} fill="#dcfce7" rx={10}/>
      <text x={249} y={38} textAnchor="middle" fontSize={10} fontWeight="800" fill="#16a34a">RTE / COOKED</text>
      <text x={249} y={51} textAnchor="middle" fontSize={9} fill="#22c55e">جاهز للأكل</text>
      <text x={249} y={65} textAnchor="middle" fontSize={7} fill="#15803d">Blue/White tools</text>
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">ONE TOUCH raw→RTE = contaminated — RTE has NO further kill step</text>
    </Svg>;
  }

  if (n.includes('Chemical')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">NEVER MIX CHEMICALS — لا تخلط الكيميائيات أبداً</text>
      <rect x={18}  y={20} width={42} height={55} fill="#dbeafe" rx={7}/>
      <rect x={28}  y={16} width={22} height={8}  fill="#93c5fd" rx={3}/>
      <text x={39}  y={41} textAnchor="middle" fontSize={7} fontWeight="700" fill="#1d4ed8">CHLORINE</text>
      <text x={39}  y={52} textAnchor="middle" fontSize={8} fill="#3b82f6">كلور</text>
      <text x={39}  y={65} textAnchor="middle" fontSize={13} fontWeight="900" fill="#1d4ed8">Cl</text>
      <text x={104} y={56} textAnchor="middle" fontSize={34} fontWeight="900" fill="#dc2626">+</text>
      <rect x={148} y={20} width={42} height={55} fill="#fef3c7" rx={7}/>
      <rect x={158} y={16} width={22} height={8}  fill="#fcd34d" rx={3}/>
      <text x={169} y={41} textAnchor="middle" fontSize={7} fontWeight="700" fill="#92400e">ACID</text>
      <text x={169} y={52} textAnchor="middle" fontSize={8} fill="#d97706">حامض</text>
      <text x={169} y={65} textAnchor="middle" fontSize={12} fontWeight="900" fill="#92400e">H+</text>
      <text x={215} y={54} textAnchor="middle" fontSize={20} fill="#7c3aed">→</text>
      <rect x={232} y={18} width={82} height={58} fill="#fee2e2" rx={10}/>
      <text x={273} y={38} textAnchor="middle" fontSize={18} fill="#dc2626">!</text>
      <text x={273} y={52} textAnchor="middle" fontSize={8} fontWeight="800" fill="#991b1b">TOXIC GAS</text>
      <text x={273} y={63} textAnchor="middle" fontSize={8} fontWeight="700" fill="#b91c1c">FATAL</text>
      <text x={273} y={73} textAnchor="middle" fontSize={7.5} fill="#dc2626">غاز كلور قاتل</text>
      <text x={160} y={85} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">If unsure about mixing — ASK SUPERVISOR FIRST. SDS Section 7 = incompatibilities</text>
    </Svg>;
  }

  if (n.includes('Pest')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">PEST PREVENTION TRIANGLE — مثلث الوقاية من الآفات</text>
      {[
        { x:55,  col:'#3b82f6', t1:'SEAL',   t2:'Entry Points', t3:'أغلق المداخل' },
        { x:160, col:'#8b5cf6', t1:'CLEAN',  t2:'Food/Water/Shelter', t3:'ازل الجذب الثلاثي' },
        { x:265, col:'#10b981', t1:'REPORT', t2:'Sightings same shift', t3:'أبلغ فوراً' },
      ].map((s, i) => <g key={i}>
        <circle cx={s.x} cy={47} r={27} fill={s.col} opacity={0.12}/>
        <circle cx={s.x} cy={47} r={27} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={41} textAnchor="middle" fontSize={10} fontWeight="900" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={52} textAnchor="middle" fontSize={7} fontWeight="600" fill={s.col}>{s.t2}</text>
        <text x={s.x} y={64} textAnchor="middle" fontSize={8} fill="#64748b">{s.t3}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">NEVER touch bait stations — contractor only — report any sighting same shift</text>
    </Svg>;
  }

  if (n.includes('Waste')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">WASTE STREAMS — مسارات النفايات الثلاثة</text>
      {[
        { x:56,  col:'#a16207', t1:'FOOD WASTE', t2:'نفايات غذائية', t3:'Every 2 hrs كل ساعتين' },
        { x:160, col:'#475569', t1:'GENERAL',    t2:'عامة', t3:'Daily — يومياً' },
        { x:264, col:'#dc2626', t1:'HAZARDOUS',  t2:'خطرة', t3:'Specialist disposal' },
      ].map((s, i) => {
        const bx = s.x - 40;
        return <g key={i}>
          <rect x={bx} y={18} width={80} height={58} fill={s.col} opacity={0.1} rx={10}/>
          <rect x={bx} y={18} width={80} height={58} stroke={s.col} strokeWidth={1.8} fill="none" rx={10}/>
          <text x={s.x} y={38} textAnchor="middle" fontSize={8.5} fontWeight="800" fill={s.col}>{s.t1}</text>
          <text x={s.x} y={51} textAnchor="middle" fontSize={9} fill="#475569">{s.t2}</text>
          <text x={s.x} y={63} textAnchor="middle" fontSize={7} fontWeight="600" fill={s.col}>{s.t3}</text>
        </g>;
      })}
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Overflowing bin = pest + contamination NC — empty BEFORE overflow every 2 hours</text>
    </Svg>;
  }

  if (n.includes('PPE')) {
    const rows = [
      { x:14, w:292, col:'#16a34a', t:'1  ELIMINATE the hazard — ازل الخطر' },
      { x:26, w:268, col:'#059669', t:'2  SUBSTITUTE with safer option — استبدل' },
      { x:42, w:236, col:'#d97706', t:'3  ENGINEERING CONTROLS — ضوابط هندسية' },
      { x:60, w:200, col:'#ea580c', t:'4  ADMINISTRATIVE CONTROLS — ضوابط إدارية' },
      { x:82, w:156, col:'#dc2626', t:'5  PPE — Last Resort — آخر خط دفاع' },
    ];
    return <Svg>
      <text x={160} y={11} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">HIERARCHY OF CONTROLS — التسلسل الهرمي للتحكم</text>
      {rows.map((r, i) => <g key={i}>
        <rect x={r.x} y={15 + i*13} width={r.w} height={11} fill={r.col} opacity={0.2} rx={4}/>
        <text x={160} y={24 + i*13} textAnchor="middle" fontSize={7.5} fontWeight="700" fill={r.col}>{r.t}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">PPE is the LAST line of defence — it reduces exposure, does NOT eliminate hazard</text>
    </Svg>;
  }

  if (n.includes('Knife')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">KNIFE SAFETY — CORRECT vs WRONG — صح وغلط</text>
      <rect x={6}   y={18} width={145} height={56} fill="#dcfce7" rx={10}/>
      <text x={78}  y={34} textAnchor="middle" fontSize={9} fontWeight="800" fill="#16a34a">BEAR CLAW GRIP</text>
      <text x={78}  y={46} textAnchor="middle" fontSize={8} fill="#15803d">Fingertips CURLED back</text>
      <text x={78}  y={57} textAnchor="middle" fontSize={8} fill="#15803d">Knuckles GUIDE blade</text>
      <text x={78}  y={68} textAnchor="middle" fontSize={8} fill="#16a34a">مخلب الدب — مفاصل مرشدة</text>
      <rect x={165} y={18} width={149} height={56} fill="#fee2e2" rx={10}/>
      <text x={239} y={34} textAnchor="middle" fontSize={9} fontWeight="800" fill="#dc2626">NEVER DO</text>
      <text x={239} y={46} textAnchor="middle" fontSize={8} fill="#b91c1c">Fingers extended toward blade</text>
      <text x={239} y={57} textAnchor="middle" fontSize={8} fill="#b91c1c">Forcing through hard material</text>
      <text x={239} y={68} textAnchor="middle" fontSize={8} fill="#dc2626">أصابع نحو الشفرة — إجبار</text>
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#1d4ed8" fontWeight="600">Dull knife = more force needed = higher slip risk — report dull knives immediately</text>
    </Svg>;
  }

  if (n.includes('Manual')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">CORRECT LIFTING — الرفع الصحيح</text>
      <rect x={6}   y={18} width={148} height={56} fill="#dcfce7" rx={10}/>
      <text x={80}  y={33} textAnchor="middle" fontSize={9} fontWeight="800" fill="#16a34a">CORRECT</text>
      {['Bend KNEES (not waist)', 'Load CLOSE to body', 'Back stays STRAIGHT', 'Pivot FEET to turn'].map((t, i) =>
        <text key={i} x={80} y={46 + i*10} textAnchor="middle" fontSize={7.5} fill="#15803d">{t}</text>
      )}
      <rect x={165} y={18} width={149} height={56} fill="#fee2e2" rx={10}/>
      <text x={239} y={33} textAnchor="middle" fontSize={9} fontWeight="800" fill="#dc2626">AVOID</text>
      {['Bending from the WAIST', 'Holding load FAR away', 'TWISTING spine under load', 'Jerking movements'].map((t, i) =>
        <text key={i} x={239} y={46 + i*10} textAnchor="middle" fontSize={7.5} fill="#b91c1c">{t}</text>
      )}
      <text x={160} y={84} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">Back injuries = 40% of occupational injuries — most preventable with correct technique</text>
    </Svg>;
  }

  if (n.includes('Fire')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">FIRE TRIANGLE + RACE PROTOCOL — مثلث الحريق + بروتوكول RACE</text>
      <path d="M80,78 L30,78 L55,34 Z" fill="#fee2e2" stroke="#dc2626" strokeWidth={1.5}/>
      <text x={52}  y={63} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#991b1b">FUEL</text>
      <text x={52}  y={73} textAnchor="middle" fontSize={8}   fill="#dc2626">وقود</text>
      <path d="M80,78 L130,78 L105,34 Z" fill="#ffedd5" stroke="#ea580c" strokeWidth={1.5}/>
      <text x={108} y={63} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#c2410c">OXYGEN</text>
      <text x={108} y={73} textAnchor="middle" fontSize={8}   fill="#ea580c">أكسجين</text>
      <text x={80}  y={55} textAnchor="middle" fontSize={7}   fontWeight="700" fill="#7f1d1d">HEAT</text>
      <text x={80}  y={65} textAnchor="middle" fontSize={8}   fill="#991b1b">حرارة</text>
      <path d="M62,32 Q65,22 60,16 Q68,24 70,32 Q73,20 67,12 Q78,28 73,36 Q67,23 62,32 Z" fill="#f97316" opacity={0.9}/>
      <rect x={150} y={16} width={164} height={62} fill="#fafafa" rx={10} stroke="#e2e8f0" strokeWidth={1}/>
      {[
        { col:'#dc2626', l:'R', t:'RESCUE — إنقاذ' },
        { col:'#f97316', l:'A', t:'ALARM 997/998 — إنذار' },
        { col:'#3b82f6', l:'C', t:'CONTAIN (close doors) — احتواء' },
        { col:'#10b981', l:'E', t:'EXTINGUISH (small fire only)' },
      ].map((row, i) => <g key={i}>
        <circle cx={165} cy={28 + i*14} r={7} fill={row.col}/>
        <text x={165}  y={32 + i*14} textAnchor="middle" fontSize={8}   fontWeight="800" fill="#fff">{row.l}</text>
        <text x={178}  y={32 + i*14} textAnchor="start"  fontSize={7.5} fontWeight="600" fill="#1e293b">{row.t}</text>
      </g>)}
      <text x={160} y={86} textAnchor="middle" fontSize={7} fill="#dc2626" fontWeight="600">If in doubt — GET OUT. UAE Emergency: 997 Civil Defence / 998 Ambulance</text>
    </Svg>;
  }

  if (n.includes('First Aid')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">FIRST AID KEY ACTIONS — إجراءات الإسعاف الرئيسية</text>
      {[
        { x:45,  col:'#dc2626', t1:'CUTS',     t2:'Press 10 min',    t3:'اضغط 10 دقائق' },
        { x:120, col:'#f97316', t1:'BURNS',    t2:'Cool 20 min',     t3:'برّد 20 دقيقة' },
        { x:197, col:'#eab308', t1:'EYE',      t2:'Eyewash 15 min',  t3:'محطة 15 دقيقة' },
        { x:272, col:'#8b5cf6', t1:'CHEMICAL', t2:'Flush + SDS §4',  t3:'شطف + SDS' },
      ].map((s, i) => <g key={i}>
        <circle cx={s.x} cy={47} r={26} fill={s.col} opacity={0.13}/>
        <circle cx={s.x} cy={47} r={26} stroke={s.col} strokeWidth={1.8}/>
        <text x={s.x} y={38} textAnchor="middle" fontSize={9}   fontWeight="800" fill={s.col}>{s.t1}</text>
        <text x={s.x} y={50} textAnchor="middle" fontSize={7.5} fontWeight="600" fill={s.col}>{s.t2}</text>
        <text x={s.x} y={63} textAnchor="middle" fontSize={8}   fill="#64748b">{s.t3}</text>
      </g>)}
      <text x={160} y={84} textAnchor="middle" fontSize={7.5} fill="#dc2626" fontWeight="700">EMERGENCY: 998 — ALL incidents reported same shift — no exceptions</text>
    </Svg>;
  }

  if (n.includes('TESTO') || n.includes('Oil Quality')) {
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">TPM% OIL QUALITY METER — مقياس جودة الزيت TPM%</text>
      <path d="M52,75 A72,72 0 0 1 160,3"   stroke="#22c55e" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <path d="M160,3 A72,72 0 0 1 205,18"  stroke="#eab308" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <path d="M205,18 A72,72 0 0 1 268,75" stroke="#ef4444" strokeWidth={20} fill="none" strokeLinecap="round"/>
      <text x={72}  y={72} textAnchor="middle" fontSize={8}   fontWeight="700" fill="#16a34a">0–24%</text>
      <text x={72}  y={83} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#16a34a">ACCEPT</text>
      <text x={160} y={28} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#ca8a04">24–27%</text>
      <text x={160} y={38} textAnchor="middle" fontSize={7}   fill="#ca8a04">MONITOR</text>
      <text x={248} y={72} textAnchor="middle" fontSize={8}   fontWeight="700" fill="#dc2626">&gt;27%</text>
      <text x={248} y={83} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#dc2626">DISCARD</text>
      <text x={160} y={60} textAnchor="middle" fontSize={10}  fontWeight="800" fill="#1e293b">TPM%</text>
      <text x={160} y={72} textAnchor="middle" fontSize={8}   fill="#475569">نسبة المواد القطبية</text>
    </Svg>;
  }

  if (n.includes('Quality System')) {
    const mods = [
      { col:'#3b82f6', t1:'CERTS',    t2:'شهادات' },
      { col:'#8b5cf6', t1:'REPORTS',  t2:'تقارير' },
      { col:'#ec4899', t1:'RETURNS',  t2:'مرتجعات' },
      { col:'#f59e0b', t1:'MEAT',     t2:'حالة اللحم' },
      { col:'#10b981', t1:'RECEIVING',t2:'الاستلام' },
    ];
    return <Svg>
      <text x={160} y={12} textAnchor="middle" fontSize={7.5} fontWeight="700" fill="#64748b">QCS SYSTEM MODULES — وحدات نظام جودة QCS</text>
      {mods.map((m, i) => {
        const x = 16 + i * 59;
        return <g key={i}>
          <rect x={x} y={19} width={54} height={54} fill={m.col} opacity={0.13} rx={9}/>
          <rect x={x} y={19} width={54} height={54} stroke={m.col} strokeWidth={1.5} fill="none" rx={9}/>
          <text x={x+27} y={42} textAnchor="middle" fontSize={8}   fontWeight="800" fill={m.col}>{m.t1}</text>
          <text x={x+27} y={56} textAnchor="middle" fontSize={8.5} fill="#64748b">{m.t2}</text>
        </g>;
      })}
      <text x={160} y={83} textAnchor="middle" fontSize={7} fill="#0369a1" fontWeight="600">Filter by Date + Branch FIRST — data is only useful when acted upon</text>
    </Svg>;
  }

  return null;
}

/* ===================== Training Reference Modal ===================== */
export default function TrainingReferenceModal({
  open, onClose, moduleName, branch, date,
  details, objectives, conductedBy,
  quickCheckQuestions,   // optional: array of {q_en|q, q_ar, options_en|options, options_ar, correct}
}) {
  const [openIdx, setOpenIdx] = useState(0);
  const [globalLang, setGlobalLang] = useGlobalLang();
  // "both" = show EN+AR (default for unified flow); "en" / "ar" filter the body lines
  const [viewMode, setViewMode] = useState(globalLang); // synced with global lang
  // sync when global lang changes
  React.useEffect(() => { setViewMode(globalLang); }, [globalLang]);

  if (!open) return null;

  const sections     = parseRefSections(details);
  const isAr         = t => /[؀-ۿ]/.test(t);
  const isLabel      = t => /^[A-Z][A-Z\s]{1,}:/.test(t);
  const isArLabel    = t => /^[؀-ۿ].{0,8}:/.test(t);
  const isQuestion   = t => /[?؟]\s*$/.test(t.trimEnd());
  const illustration = getModuleIllustration(moduleName);
  const qqList       = Array.isArray(quickCheckQuestions) ? quickCheckQuestions : [];

  const doPrint = () => {
    const s = document.createElement('style');
    s.id = '_tref_ps_';
    s.textContent = `@media print{body>*{display:none!important}#tm-ref-print,#tm-ref-print *{visibility:visible!important}#tm-ref-print{position:fixed!important;inset:0!important;overflow:visible!important;background:#fff!important;padding:16px!important;max-width:none!important;border-radius:0!important;box-shadow:none!important}.tm-noprint{display:none!important}}`;
    document.head.appendChild(s);
    window.print();
    setTimeout(() => document.getElementById('_tref_ps_')?.remove(), 1400);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(8,12,28,0.85)', backdropFilter:'blur(10px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'20px 14px', overflowY:'auto',
      }}
    >
      <div id="tm-ref-print" style={{
        width:'100%', maxWidth:920,
        background:'#fff', borderRadius:24,
        boxShadow:'0 48px 130px rgba(0,0,0,.6)',
        overflow:'hidden',
        fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{
          background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#4338ca 100%)',
          padding:'22px 28px',
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:18, flexWrap:'wrap' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:5, boxShadow:'0 4px 20px rgba(0,0,0,.4)', flexShrink:0 }}>
              <CompanyMark size={62} />
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ color:'rgba(255,255,255,.45)', fontSize:9.5, fontWeight:800, letterSpacing:2.5, textTransform:'uppercase', marginBottom:5 }}>
                {companyLine("Training Reference Guide")}
              </div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', lineHeight:1.2 }}>{getModuleName(moduleName, viewMode)}</div>
              <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
                {[['🏢', branch], ['📅', date], conductedBy && ['👤', conductedBy]].filter(Boolean).map(([icon, label], i) => (
                  <span key={i} style={{ color:'rgba(255,255,255,.75)', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="tm-noprint" style={{ display:'flex', gap:8, alignSelf:'flex-start', flexShrink:0 }}>
              {/* ✅ Language toggle */}
              <div style={{ display:'flex', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, overflow:'hidden' }}>
                <button onClick={() => { setViewMode('en'); setGlobalLang('en'); }} style={{
                  background: viewMode === 'en' ? '#fff' : 'transparent',
                  color: viewMode === 'en' ? '#1e3a8a' : '#fff',
                  border:'none', padding:'9px 12px', fontWeight:700, fontSize:12, cursor:'pointer',
                }}>EN</button>
                <button onClick={() => { setViewMode('ar'); setGlobalLang('ar'); }} style={{
                  background: viewMode === 'ar' ? '#fff' : 'transparent',
                  color: viewMode === 'ar' ? '#1e3a8a' : '#fff',
                  border:'none', padding:'9px 12px', fontWeight:700, fontSize:12, cursor:'pointer',
                }}>عربي</button>
              </div>
              <button onClick={doPrint} style={{
                background:'#fff', color:'#1e3a8a', border:'none', borderRadius:10,
                padding:'9px 16px', fontWeight:700, fontSize:12.5, cursor:'pointer',
                boxShadow:'0 2px 10px rgba(0,0,0,.2)',
              }}>🖨️ {viewMode === 'ar' ? 'طباعة' : 'Print'}</button>
              <button onClick={onClose} style={{
                background:'rgba(255,255,255,.1)', color:'#fff',
                border:'1px solid rgba(255,255,255,.2)',
                borderRadius:10, padding:'9px 13px', fontWeight:700, fontSize:13, cursor:'pointer',
              }}>✕</button>
            </div>
          </div>
        </div>

        {/* ── Objectives ── */}
        {objectives && (
          <div style={{ background:'#f0fdf4', borderBottom:'1px solid #bbf7d0', padding:'13px 28px' }}>
            <div style={{ fontSize:9.5, fontWeight:800, color:'#16a34a', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
              🎯 Objectives — الأهداف ومعايير التقييم
            </div>
            <div style={{ fontSize:14, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap' }}>{objectives}</div>
          </div>
        )}

        {/* ── Illustration ── */}
        {illustration && (
          <div style={{ padding:'18px 28px 0' }}>
            <div style={{
              background:'linear-gradient(135deg,#f8faff 0%,#eef2ff 100%)',
              borderRadius:16, padding:'16px 20px',
              border:'1px solid #e0e7ff',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {illustration}
            </div>
          </div>
        )}

        {/* ── Quick-nav letter pills ── */}
        {sections.length > 0 && (
          <div className="tm-noprint" style={{ padding:'16px 28px 4px', display:'flex', gap:5, flexWrap:'wrap' }}>
            {sections.map((sec, idx) => {
              const col = LETTER_PALETTE[idx % LETTER_PALETTE.length];
              const active = openIdx === idx;
              return (
                <button key={sec.letter} onClick={() => setOpenIdx(idx)} style={{
                  width:30, height:30, borderRadius:8, border:'none',
                  background: active ? col : '#f1f5f9',
                  color: active ? '#fff' : '#64748b',
                  fontWeight:800, fontSize:12.5, cursor:'pointer',
                  boxShadow: active ? `0 2px 8px ${col}55` : 'none',
                  transition:'background 0.15s, color 0.15s, box-shadow 0.15s',
                }}>{sec.letter}</button>
              );
            })}
          </div>
        )}

        {/* ── Accordion sections ── */}
        <div style={{ padding:'12px 28px 8px' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#4338ca', letterSpacing:2, textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span>📋</span><span>Training Content — محتوى التدريب</span>
          </div>

          {sections.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {sections.map((sec, idx) => {
                const col     = LETTER_PALETTE[idx % LETTER_PALETTE.length];
                const isOpen  = openIdx === idx;
                const hasBody = sec.body?.length > 0;
                return (
                  <div key={sec.letter} style={{
                    borderRadius:14, overflow:'hidden',
                    border:`1.5px solid ${isOpen ? col : '#e8ecf2'}`,
                    boxShadow: isOpen ? `0 6px 24px ${col}22` : '0 1px 3px rgba(0,0,0,.05)',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                  }}>
                    {/* Section header */}
                    <div
                      onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                      style={{
                        display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                        background: isOpen ? `linear-gradient(135deg,${col}22,${col}0a)` : '#f9fafb',
                        cursor:'pointer', transition:'background 0.2s',
                      }}
                    >
                      <div style={{
                        flexShrink:0, width:36, height:36, borderRadius:11,
                        background: isOpen ? col : '#e2e8f0',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: isOpen ? '#fff' : '#64748b',
                        fontWeight:800, fontSize:15,
                        boxShadow: isOpen ? `0 4px 12px ${col}55` : 'none',
                        transition:'background 0.2s, box-shadow 0.2s, color 0.2s',
                      }}>{sec.letter}</div>

                      <div style={{ flex:1, minWidth:0 }}>
                        {viewMode !== 'ar' && (
                          <div style={{ fontSize:15, fontWeight:700, color: isOpen ? '#0f172a' : '#374151', lineHeight:1.35 }}>{sec.en}</div>
                        )}
                        {sec.ar && viewMode !== 'en' && (
                          <div style={{ fontSize:15, fontWeight:600, color: viewMode === 'ar' ? '#0f172a' : '#475569', marginTop: viewMode === 'ar' ? 0 : 3, direction:'rtl', textAlign:'right', lineHeight:1.5 }}>{sec.ar}</div>
                        )}
                      </div>

                      {hasBody && (
                        <div style={{
                          flexShrink:0, width:28, height:28, borderRadius:8,
                          background: isOpen ? `${col}22` : '#f1f5f9',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: isOpen ? col : '#94a3b8',
                          fontSize:13, fontWeight:900,
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition:'transform 0.2s, background 0.2s, color 0.2s',
                        }}>▼</div>
                      )}
                    </div>

                    {/* Body */}
                    {isOpen && hasBody && (
                      <div style={{ borderTop:`1px solid ${col}30`, background:'#fff', padding:'14px 20px 18px' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                          {sec.body.map((line, li) => {
                            const arabic  = isAr(line);
                            // ✅ filter by chosen language
                            if (viewMode === 'ar' && !arabic) return null;
                            if (viewMode === 'en' && arabic)  return null;
                            const lbl     = isLabel(line);
                            const arLbl   = isArLabel(line);
                            const isQ     = isQuestion(line);
                            return (
                              <div key={li} style={{
                                direction:    arabic ? 'rtl' : 'ltr',
                                textAlign:    arabic ? 'right' : 'left',
                                fontSize:     arabic ? 15 : 14,
                                fontWeight:   isQ ? 700 : (lbl || arLbl) ? 700 : (arabic ? 500 : 400),
                                color:        isQ ? '#92400e' : (lbl || arLbl) ? '#0f172a' : (arabic ? '#1e293b' : '#374151'),
                                lineHeight:   1.8,
                                padding:      isQ ? '5px 10px' : '3px 0',
                                marginTop:    isQ ? 6 : 0,
                                marginBottom: isQ ? 4 : 0,
                                borderBottom: !isQ && li < sec.body.length - 1 ? '1px solid #f8fafc' : 'none',
                                paddingTop:   !isQ && (lbl || arLbl) && li > 0 ? 10 : isQ ? 5 : 3,
                                // ── Question highlight ──
                                background:   isQ ? 'linear-gradient(90deg,#fef9c3,#fefce8)' : 'transparent',
                                borderLeft:   isQ ? '4px solid #f59e0b' : 'none',
                                borderRadius: isQ ? 7 : 0,
                              }}>
                                {isQ && <span style={{ marginRight: arabic ? 0 : 6, marginLeft: arabic ? 6 : 0, fontSize:13 }}>🔶</span>}
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:20, fontSize:14, color:'#334155', lineHeight:1.85, whiteSpace:'pre-wrap' }}>
              {details || 'No details available.'}
            </div>
          )}
        </div>

        {/* ── Quick Check / الفحص السريع ── */}
        {qqList.length > 0 && (
          <div style={{ padding:'4px 28px 12px' }}>
            <div style={{
              fontSize:10, fontWeight:800, letterSpacing:2, textTransform:'uppercase',
              marginBottom:12, display:'flex', alignItems:'center', gap:8, color:'#b45309',
            }}>
              <span>🎯</span><span>Quick Check — الفحص السريع</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {qqList.map((qq, i) => {
                const qText  = qq.q_en  || qq.q  || '';
                const qAr    = qq.q_ar  || '';
                const opts   = qq.options_en || qq.options || [];
                const optsAr = qq.options_ar || [];
                const right  = typeof qq.correct === 'number' ? qq.correct : -1;
                return (
                  <div key={i} style={{
                    borderRadius:12, overflow:'hidden',
                    border:'1.5px solid #fde68a',
                    boxShadow:'0 2px 8px rgba(245,158,11,.12)',
                  }}>
                    {/* Question — highlighted */}
                    <div style={{
                      background:'linear-gradient(90deg,#fef9c3 0%,#fefce8 100%)',
                      borderLeft:'4px solid #f59e0b',
                      padding:'10px 16px',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                        <span style={{
                          flexShrink:0, background:'#f59e0b', color:'#fff',
                          borderRadius:6, padding:'2px 7px',
                          fontSize:11, fontWeight:800,
                        }}>Q{i+1}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14.5, fontWeight:700, color:'#78350f', lineHeight:1.5 }}>{qText}</div>
                          {qAr && (
                            <div style={{ fontSize:15, fontWeight:600, color:'#92400e', direction:'rtl', textAlign:'right', lineHeight:1.6, marginTop:4 }}>{qAr}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Options */}
                    {opts.length > 0 && (
                      <div style={{ background:'#fffbeb', padding:'8px 16px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                        {opts.map((opt, oi) => {
                          const isRight = oi === right;
                          return (
                            <div key={oi} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              <div style={{
                                display:'flex', alignItems:'center', gap:8,
                                fontSize:13.5, fontWeight: isRight ? 700 : 400,
                                color: isRight ? '#15803d' : '#64748b',
                                background: isRight ? '#f0fdf4' : 'transparent',
                                borderRadius: isRight ? 7 : 0,
                                padding: isRight ? '3px 8px' : '1px 0',
                                border: isRight ? '1px solid #bbf7d0' : 'none',
                              }}>
                                <span style={{ fontSize:14 }}>{isRight ? '✅' : '○'}</span>
                                <span>{opt}</span>
                              </div>
                              {optsAr[oi] && (
                                <div style={{
                                  fontSize:13, fontWeight: isRight ? 600 : 400,
                                  color: isRight ? '#166534' : '#94a3b8',
                                  direction:'rtl', textAlign:'right',
                                  paddingRight:8, lineHeight:1.5,
                                }}>{optsAr[oi]}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ margin:'16px 28px 28px', paddingTop:16, borderTop:'2px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CompanyMark size={26} style={{ opacity: .5 }} />
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{companyLine("QA / Food Safety Training Reference")}</span>
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'right', lineHeight:1.7 }}>
            <div>Doc No: FS-QM/REC/TR/1 | Rev: 0</div>
            <div>Issued: 05/02/2020 | {date}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
