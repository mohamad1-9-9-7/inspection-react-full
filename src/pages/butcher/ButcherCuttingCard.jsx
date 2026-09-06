// src/pages/butcher/ButcherCuttingCard.jsx
//
// 🧾 بطاقة التقطيع — تقرير شغل الجزار بنفس محتوى نموذج الملحمة الورقي،
// لكن بتصميم خاص بالنظام (لوحة Soft Sky) لا نسخة مصوّرة عن الورقة.
// The butcher's cutting card: same information as the printed AL MAWASHI form
// (location · cutting date · one box per breakdown · signatures) in the app's
// own visual language.
//
// كل «صندوق» = تنفيذ وصفة واحد (مادة خام داخلة → نواتج + هدر + عظم):
// عنوان الصندوق هو المادة الخام، وأسطره هي القطع الناتجة بأوزانها ونِسبها،
// وشرائح الترويسة تحمل المنشأ/النوع/الفئة/المسار/رقم العملية.
//
// ⚠️ الطباعة تُركِّب نسخة مستقلّة خارج #root وتُخرج A4 أفقي — بلا صفحات فاضية.

import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { isCancelled, kg } from "./butcherReportKit";

/* أحجام الخط: globals.css يفرض `#root *{14px}` و`#root table *{12px}`، وصفحة
   «شغلي» تفرض 20px بكلاس `.mw`. نضاعف الكلاس (`.cc.cc`) لتعلو الأخصّية على
   الاثنين بلا ربط البطاقة بصفحة معيّنة. */
export const CARD_CSS = `
#root .cc.cc, #root .cc.cc *, #root .cc.cc table, #root .cc.cc table * {
  font-size: 13px !important;
}
#root .cc.cc .cc-h1    { font-size: 20px !important; }
#root .cc.cc .cc-h2    { font-size: 15px !important; }
#root .cc.cc .cc-kpiv  { font-size: 19px !important; }
#root .cc.cc .cc-rawv  { font-size: 17px !important; }
#root .cc.cc .cc-lbl   { font-size: 11px !important; }
#root .cc.cc .cc-chip  { font-size: 11.5px !important; }
#root .cc.cc .cc-share em { font-size: 10px !important; }

/* نسخة الطباعة تعيش خارج #root فلا تصلها القواعد أعلاه — نكرّرها لها بمقاس أصغر */
.cc-portal, .cc-portal * { font-size: 10.5px !important; }
.cc-portal .cc-h1    { font-size: 16px !important; }
.cc-portal .cc-h2    { font-size: 12.5px !important; }
.cc-portal .cc-kpiv  { font-size: 15px !important; }
.cc-portal .cc-rawv  { font-size: 14px !important; }
.cc-portal .cc-lbl   { font-size: 9px !important; }
.cc-portal .cc-chip  { font-size: 9.5px !important; }
.cc-portal .cc-share em { font-size: 8.5px !important; }
.cc-portal .cc-doc   { font-size: 9px !important; }
.cc-portal .cc-path  { font-size: 9.5px !important; }
.cc-portal .cc-foot, .cc-portal .cc-foot * { font-size: 8px !important; }

.cc {
  --cc-ink: #0f2740; --cc-ink2: #3c5a75; --cc-mut: #7b93a8;
  --cc-line: #e3edf7; --cc-line2: #d3e2f0; --cc-soft: #f7fbff;
  --cc-blue: #1f6fd0; --cc-teal: #0f766e; --cc-amber: #b45309; --cc-red: #c8102e;
  background: #fff; color: var(--cc-ink); border: 1px solid var(--cc-line2);
  border-radius: 18px; padding: 20px 20px 16px; overflow: hidden;
  font-family: Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* ── الترويسة ── */
.cc-top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cc-logo { height: 42px; width: auto; object-fit: contain; }
.cc-titles { flex: 1 1 220px; min-width: 0; }
.cc-h1 { font-weight: 900; letter-spacing: -.2px; line-height: 1.2; }
.cc-h1 span { color: var(--cc-mut); font-weight: 800; }
.cc-lbl { font-weight: 800; color: var(--cc-mut); letter-spacing: .4px; text-transform: uppercase; }
.cc-facts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.cc-fact {
  display: flex; flex-direction: column; gap: 1px; background: var(--cc-soft);
  border: 1px solid var(--cc-line); border-radius: 12px; padding: 7px 14px;
}
.cc-fact b { font-weight: 900; }

/* ── شريط المؤشّرات ── */
.cc-kpis {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
  margin: 14px 0 16px;
}
.cc-kpi {
  border: 1px solid var(--cc-line); border-radius: 14px; padding: 9px 12px;
  background: linear-gradient(180deg, #fff, var(--cc-soft));
  border-top: 3px solid var(--cc-accent, var(--cc-blue));
}
.cc-kpiv { font-weight: 900; color: var(--cc-accent, var(--cc-blue)); line-height: 1.25; }
.cc-kpiv i { font-style: normal; font-weight: 800; opacity: .55; margin-inline-start: 3px; }

/* ── الصناديق: عمودان مثل الورقة ── */
.cc-grid { columns: 2; column-gap: 14px; }
.cc-box {
  break-inside: avoid; page-break-inside: avoid; display: inline-block; width: 100%;
  border: 1px solid var(--cc-line2); border-radius: 14px; overflow: hidden;
  margin: 0 0 12px; background: #fff;
}
.cc-bhead {
  display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px 8px;
  background: linear-gradient(135deg, var(--cc-soft), #fff);
  border-bottom: 1px solid var(--cc-line);
  border-inline-start: 4px solid var(--cc-accent, var(--cc-blue));
}
.cc-bname { flex: 1; min-width: 0; }
.cc-h2 { font-weight: 900; line-height: 1.3; }
.cc-raw { text-align: end; white-space: nowrap; }
.cc-rawv { font-weight: 900; color: var(--cc-accent, var(--cc-blue)); }
.cc-rawv i { font-style: normal; font-weight: 800; opacity: .6; margin-inline-start: 2px; }
.cc-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
.cc-chip {
  background: #fff; border: 1px solid var(--cc-line2); color: var(--cc-ink2);
  border-radius: 999px; padding: 1px 8px; font-weight: 800; white-space: nowrap;
}
.cc-chip.ref { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
.cc-chip.ok  { background: #dcfce7; border-color: #86efac; color: #166534; }
.cc-chip.no  { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }

/* ── جدول القطع ── */
.cc-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cc-tbl th {
  text-align: start; font-weight: 800; color: var(--cc-mut); background: var(--cc-soft);
  border-bottom: 1px solid var(--cc-line); padding: 5px 10px;
  text-transform: uppercase; letter-spacing: .3px;
}
.cc-tbl td { padding: 5px 10px; border-bottom: 1px solid var(--cc-line); vertical-align: middle; }
.cc-tbl tr:last-child td { border-bottom: none; }
.cc-n { color: var(--cc-mut); font-weight: 800; text-align: center; }
.cc-nm { font-weight: 800; }
.cc-nm i { font-style: normal; font-weight: 600; color: var(--cc-mut); }
.cc-nm b { color: var(--cc-amber); font-weight: 900; margin-inline-end: 4px; }
.cc-kgc { text-align: end; font-weight: 900; }
.cc-pc { text-align: center; color: var(--cc-mut); font-weight: 800; }
.cc-share { padding-inline-end: 12px !important; }
.cc-bar {
  display: block; height: 5px; border-radius: 999px; background: var(--cc-line);
  overflow: hidden;
}
.cc-bar i { display: block; height: 100%; background: var(--cc-teal); border-radius: 999px; }
.cc-share em { font-style: normal; font-weight: 800; color: var(--cc-mut); }
.cc-w td { background: #fffdf7; }
.cc-w .cc-bar i { background: var(--cc-amber); }

.cc-bfoot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 12px; background: var(--cc-soft); border-top: 1px solid var(--cc-line);
}
.cc-bfoot .cc-spacer { flex: 1; }
.cc-pill {
  border-radius: 999px; padding: 2px 10px; font-weight: 900; white-space: nowrap;
  background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
}
.cc-pill.warn { background: #fffbeb; color: var(--cc-amber); border-color: #fcd34d; }
.cc-pill.bad  { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.cc-tot { font-weight: 900; }
.cc-tot span { color: var(--cc-mut); font-weight: 800; margin-inline-end: 4px; }

/* ── التواقيع ── */
.cc-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px; }
.cc-sig { border: 1px dashed var(--cc-line2); border-radius: 12px; padding: 8px 12px 10px; }
.cc-sig b { display: block; font-weight: 900; margin-top: 8px; min-height: 17px; }
.cc-empty {
  border: 1px dashed var(--cc-line2); border-radius: 12px; padding: 26px;
  text-align: center; color: var(--cc-mut); font-weight: 800;
}

@media (max-width: 1000px) {
  .cc-grid { columns: 1; }
  .cc-kpis { grid-template-columns: repeat(2, 1fr); }
  .cc-sign { grid-template-columns: 1fr; }
  .cc-facts { justify-content: flex-start; }
}

/* ══════════ الطباعة ══════════
   ورقة **وحدة** مهما كثرت التنفيذات: البطاقة بتتقاس قبل الطباعة، وبينختار
   عدد الأعمدة ونسبة التصغير اللي بتخلّيها تدخل بصفحة A4 أفقية وحدة
   (fitToOnePage تحت). وشكلها بالورق على طراز تقارير Odoo: مسطّح، حدود
   رفيعة، بلا تدرّجات ولا زوايا كبيرة ولا فراغات واسعة — الحبر للمعلومة. */
.cc-portal { display: none; }

/* القياس: بتنعرض برّا الشاشة بعرض محسوب، بلا ما يشوفها المستخدم */
.cc-portal.cc-measure {
  display: block !important; position: fixed !important;
  inset-inline-start: -20000px !important; top: 0 !important;
  z-index: -1 !important; pointer-events: none !important;
}

/* ══ شكل الورقة ══ طراز تقارير Odoo: مسطّح، خطوط شعرة، ولا حبر على الزينة.
   كل هالقواعد جوّا .cc-portal — يعني نسخة الطباعة وحدها، والشاشة ما بتتغيّر. */
.cc-portal .cc { border: 0; border-radius: 0; padding: 0; }

/* ترويسة: شريط بخط سميك تحته — أول ما تمسك الورقة بتعرف شو هي */
.cc-portal .cc-top { padding-bottom: 7px; border-bottom: 2px solid var(--cc-ink); }
.cc-portal .cc-h1 { text-transform: uppercase; letter-spacing: 1.1px; }
.cc-portal .cc-doc {
  display: inline-block; margin-top: 3px; padding: 1px 7px;
  border: 1px solid var(--cc-line2); border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: .8px; color: var(--cc-ink2); font-weight: 700;
}
.cc-portal .cc-fact { border-radius: 3px; padding: 4px 10px; background: #fff; }

/* سطر المسار — تحت اسم المادة مباشرة، بلون المستوى: الجدول تبعه وحده */
.cc-portal .cc-path {
  display: block; margin-top: 2px; font-weight: 800; letter-spacing: .3px;
  color: var(--cc-accent, var(--cc-blue));
}
/* رقم الصندوق — مربّع صغير بلون مستواه، بيخلّي التسلسل مقروء بلمحة */
.cc-portal .cc-idx {
  display: inline-block; min-width: 15px; margin-inline-end: 6px; padding: 0 3px;
  background: var(--cc-accent, var(--cc-blue)); color: #fff; border-radius: 3px;
  text-align: center; font-weight: 900;
}
/* الهدر: بلا خلفية صفرا — العلامة ◆ والعمود الملوّن بيكفّوا */
.cc-portal .cc-w td { background: #fbfcfd; }
/* سطر المجاميع بخط مزدوج — عُرف المحاسبة، ما بينلخبط مع سطر عادي */
.cc-portal .cc-bfoot { background: #fff; border-top: 3px double var(--cc-ink2); }
/* التواقيع: سطر منقّط للإمضاء بدل صندوق مقصوص */
.cc-portal .cc-sign { grid-template-columns: repeat(3, 1fr); }
.cc-portal .cc-sig {
  border: 0; border-radius: 0; padding: 0; border-top: 1px solid var(--cc-line2); padding-top: 5px;
}
.cc-portal .cc-sig b { border-bottom: 1px dotted var(--cc-mut); min-height: 16px; margin-top: 10px; }
/* ذيل الوثيقة */
.cc-portal .cc-foot {
  display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 5px;
  border-top: 1px solid var(--cc-line); color: var(--cc-mut); font-weight: 700;
  letter-spacing: .3px;
}
.cc-portal .cc-foot .cc-spacer { flex: 1; }
.cc-portal .cc-box, .cc-portal .cc-kpi { border-radius: 4px; }
.cc-portal .cc-kpi {
  background: #fff; border-top-width: 2px; padding: 4px 8px;
}
/* نسخة الورق ما بتتبع استجابة الشاشة — قياسها من مقاس الورقة لا مقاس النافذة */
.cc-portal .cc-kpis { grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0 9px; }
.cc-portal .cc-sign { grid-template-columns: repeat(3, 1fr); }
.cc-portal .cc-facts { justify-content: flex-end; }
.cc-portal .cc-bhead { background: #fff; padding: 5px 8px 4px; border-inline-start-width: 3px; }
/* بلا شريط مؤشّرات بالورق — الصناديق بتبلّش بعد خط الترويسة مباشرة */
.cc-portal .cc-grid { column-gap: 9px; margin-top: 9px; }
.cc-portal .cc-box { margin-bottom: 8px; }
.cc-portal .cc-tbl th { padding: 3px 8px; }
.cc-portal .cc-tbl td { padding: 3px 8px; }
.cc-portal .cc-bfoot { padding: 4px 8px; }
.cc-portal .cc-sign { gap: 9px; margin-top: 9px; }
.cc-portal .cc-sig { border-radius: 4px; padding: 5px 9px 7px; }
.cc-portal .cc-sig b { margin-top: 6px; min-height: 14px; }
.cc-portal .cc-tags { margin-top: 3px; }

@media print {
  /* لو غيّرت الهوامش هون غيّر PAGE_MM بالجافاسكربت — الاتنين لازم يتطابقوا */
  @page { size: A4 landscape; margin: 8mm; }
  body.cc-printing #root { display: none !important; }
  body.cc-printing .cc-portal { display: block !important; }
  /* التصغير المحسوب: البطاقة بتتبني بعرض أوسع وبتنضغط لعرض الصفحة، فالنصّ
     بيضل مرتّب بأعمدة بدل ما ينقص محتوى أو تطلع صفحة تانية */
  body.cc-printing .cc-portal { position: relative; }
  body.cc-printing .cc-portal .cc {
    position: absolute; top: 0; left: 0;    /* فيزيائي: التصغير لازم يثبت بالعربي كمان */
    transform: scale(var(--cc-scale, 1));
    transform-origin: top left;
  }
  .cc-box, .cc-kpi, .cc-chip, .cc-pill, .cc-bhead, .cc-tbl th, .cc-w td, .cc-bfoot {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
`;

/* لون كل مستوى — الجذر أزرق، والتفكيك الفرعي أخضر ثم بنفسجي */
const ACCENTS = ["#1f6fd0", "#0f766e", "#6d28d9", "#b45309"];

/**
 * ترتيب التنفيذات مثل الورقة: المادة الجذر (الذبيحة) أولاً، ثم كل تفكيك بعد
 * الصندوق الذي أنتج مادته الخام — SHOULDER BONE IN يجي بعد CARCASS.
 * يرجّع نسخاً من الصفوف مع `__depth` (عمق السلسلة) للتلوين.
 */
export function orderOperations(rows) {
  const list = [...rows];
  // أول تنفيذ أنتج كل صنف — به نعرف «أب» كل صندوق
  const producer = new Map();
  list.forEach((r, i) => {
    (r.cuts || []).forEach((c) => {
      if (!c.isWaste && c.itemId && !producer.has(c.itemId)) producer.set(c.itemId, i);
    });
  });
  const depth = new Array(list.length).fill(-1);
  const depthOf = (i, seen) => {
    if (depth[i] >= 0) return depth[i];
    if (seen.has(i)) return 0;              // حلقة ببيانات غريبة — نوقف الغوص
    seen.add(i);
    const p = producer.get(list[i].inputItemId);
    const d = p === undefined || p === i ? 0 : depthOf(p, seen) + 1;
    depth[i] = d;
    return d;
  };
  list.forEach((_, i) => depthOf(i, new Set()));
  return list
    .map((r, i) => ({ r, d: depth[i] }))
    .sort(
      (a, b) =>
        a.d - b.d ||
        String(a.r.time).localeCompare(String(b.r.time)) ||
        b.r.carcassKg - a.r.carcassKg
    )
    .map((x) => ({ ...x.r, __depth: x.d }));
}

/**
 * دمج تنفيذات **نفس المادة الخام بنفس المسار** بصندوق واحد.
 *
 * الجزار بيقطّع نفس الرقبة تلات مرّات باليوم، فكانت البطاقة تطلع تلات صناديق
 * بنفس العنوان — ورق أكتر وقراءة أصعب. صار: صندوق واحد، أوزانه مجموع
 * التنفيذات، وأسطر القطع مدموجة على مستوى المنتج، وأرقام العمليات كلها
 * بترويسة الصندوق حتى ما يضيع أثر أي تنفيذ.
 *
 * ⚠️ **المسار جزء من المفتاح**: نفس المادة ممكن تنفكّ بأكثر من مسار
 * (pathway) وكل مسار إله نواتج ونِسب مختلفة — دمجهم بجدول واحد بيخلط
 * تفكيكين ما إلهم علاقة ببعض. فكل مسار = جدول/كرت مستقلّ.
 *
 * والدمج ضمن **نفس المستوى** (`__depth`) فقط: ناتج انفكّك بصندوق تاني بيضل
 * صندوقه لحاله، وإلا انكسرت شجرة «خام → ناتج → تفكيك».
 */
function mergeSameInput(ops) {
  const map = new Map();
  const order = [];

  ops.forEach((r) => {
    const path = r.pathwayId || r.pathwayCode || r.bomRef || "—";
    const key = `${r.__depth || 0}::${r.inputItemId || r.inputName || "—"}::${path}`;
    if (!map.has(key)) {
      map.set(key, { rows: [] });
      order.push(key);
    }
    map.get(key).rows.push(r);
  });

  return order.map((key) => {
    const rows = map.get(key).rows;
    if (rows.length === 1) return rows[0];

    // القطع مدموجة على مستوى المنتج — سطر واحد لكل صنف مهما تكرّر
    const cuts = new Map();
    rows.forEach((r) => (r.cuts || []).forEach((c) => {
      const k = c.itemId || c.name;
      if (!cuts.has(k)) cuts.set(k, { ...c });
      else cuts.get(k).weightKg += c.weightKg;
    }));

    const sum = (fn) => rows.reduce((a, r) => a + (Number(fn(r)) || 0), 0);
    const carcassKg = sum((r) => r.carcassKg);
    const cutsKg = sum((r) => r.cutsKg);
    const wasteKg = sum((r) => r.wasteKg);
    const pieces = sum((r) => r.pieceCount);
    const base = carcassKg > 0 ? carcassKg : cutsKg + wasteKg;

    const uniq = (fn) => [...new Set(rows.map(fn).filter(Boolean))];

    return {
      ...rows[0],
      id: `merged_${key}`,
      carcassKg, cutsKg, wasteKg,
      cuts: [...cuts.values()].sort((a, b) => Number(a.isWaste) - Number(b.isWaste) || b.weightKg - a.weightKg),
      unaccountedKg: carcassKg > 0 ? carcassKg - (cutsKg + wasteKg) : 0,
      yieldPct: base > 0 ? (cutsKg / base) * 100 : 0,
      pieceCount: pieces > 0 ? pieces : rows[0].pieceCount,
      durationMin: sum((r) => r.durationMin) || null,
      partialPiece: rows.some((r) => r.partialPiece),
      // كل أرقام العمليات وأوقاتها — البطاقة وثيقة، وما بيجوز يضيع رقم عملية
      __merged: rows.length,
      __opNos: uniq((r) => r.opNo),
      __times: uniq((r) => r.time).sort(),
      __pathways: uniq((r) => r.pathwayCode),
      __approved: rows.filter((r) => r.reviewStatus === "approved").length,
      __pending: rows.filter((r) => (r.reviewStatus || "pending") === "pending").length,
    };
  });
}

/** خانة معلومة بالترويسة (الموقع/التاريخ/الجزار). */
const Fact = ({ lbl, val }) => (
  <span className="cc-fact">
    <span className="cc-lbl">{lbl}</span>
    <b>{val || "—"}</b>
  </span>
);

/** مؤشّر بالشريط العلوي. */
const Kpi = ({ lbl, val, unit, color }) => (
  <span className="cc-kpi" style={{ "--cc-accent": color }}>
    <span className="cc-lbl">{lbl}</span>
    <span className="cc-kpiv">{val}{unit ? <i>{unit}</i> : null}</span>
  </span>
);

/** صندوق واحد = تنفيذ وصفة واحد (مادة خام → قطعها).
    `paper` = نسخة الطباعة: إنجليزي بالكامل، وبلا نِسب ولا منشأ/نوع/وقت —
    الورقة بدها الأسماء والأوزان وبس. الشاشة بتضل متل ما هي. */
function OpBox({ row, isAr, paper = false, n = 0 }) {
  const cuts = row.cuts && row.cuts.length ? row.cuts : [];
  const accent = ACCENTS[Math.min(row.__depth || 0, ACCENTS.length - 1)];
  const base = row.carcassKg > 0 ? row.carcassKg : row.cutsKg + row.wasteKg;
  const diff = Number(row.unaccountedKg) || 0;
  const inputName = paper ? (row.inputNameEn || row.inputName) : row.inputName;
  const yieldTone = row.yieldPct >= 75 ? "" : row.yieldPct >= 60 ? " warn" : " bad";

  return (
    <div className="cc-box" style={{ "--cc-accent": accent }}>
      <div className="cc-bhead">
        <span className="cc-bname">
          <span className="cc-lbl">{isAr ? "المادة الخام" : "Raw material"}</span>
          <span className="cc-h2" dir="auto">
            {paper && n > 0 ? <span className="cc-idx">{n}</span> : null}
            {inputName}
          </span>
          {/* كل صندوق = مسار واحد، فاسم المسار سطر بالترويسة لا شريحة ضايعة
              بين باقي الشرائح — هيك بيبان إنّ الجدول تحته يخصّ هالمسار وحده */}
          {paper && (row.pathwayLabel || row.bomRef) ? (
            <span className="cc-path">🛤️ {row.pathwayLabel || row.bomRef}</span>
          ) : null}
          <span className="cc-tags">
            {!paper && row.bomOriginName ? <span className="cc-chip">🌍 {row.bomOriginName}</span> : null}
            {!paper && row.bomKindName ? <span className="cc-chip">🐑 {row.bomKindName}</span> : null}
            {row.bomCatName ? <span className="cc-chip">🏷️ {row.bomCatName}</span> : null}
            {!paper && (row.__pathways || (row.pathwayCode ? [row.pathwayCode] : [])).map((c) => (
              <span key={c} className="cc-chip ref">🛤️ {c}</span>
            ))}
            {!paper && row.__merged > 1 ? (
              <span className="cc-chip">
                ×{row.__merged} {isAr ? "تنفيذ" : "jobs"}
              </span>
            ) : null}
            {/* أرقام العمليات كلها — الوثيقة لازم تدلّ على كل تنفيذ دخل فيها */}
            {(row.__opNos || (row.opNo ? [row.opNo] : [])).map((no) => (
              <span key={no} className="cc-chip ref">{no}</span>
            ))}
            {!paper && (row.__times || (row.time ? [row.time] : [])).map((tm) => (
              <span key={tm} className="cc-chip">🕒 {tm}</span>
            ))}
            {row.rawExpiry ? (
              <span className="cc-chip">📅 {isAr ? "ينتهي" : "exp"} {row.rawExpiry}</span>
            ) : null}
            {!paper && row.durationMin > 0 ? (
              <span className="cc-chip">
                ⏱️ {row.durationMin} {isAr ? "دقيقة" : "min"}
              </span>
            ) : null}
            {row.__merged > 1 ? (
              <>
                {row.__approved > 0 ? (
                  <span className="cc-chip ok">✓ {isAr ? "معتمد" : "Approved"} {row.__approved}</span>
                ) : null}
                {row.__pending > 0 ? (
                  <span className="cc-chip">⏳ {isAr ? "بانتظار المراجعة" : "Pending"} {row.__pending}</span>
                ) : null}
              </>
            ) : row.reviewStatus === "approved" ? (
              <span className="cc-chip ok">✓ {isAr ? "معتمد" : "Approved"}</span>
            ) : null}
            {row.reviewStatus === "rejected" ? (
              <span className="cc-chip no">✕ {isAr ? "مرفوض" : "Rejected"}</span>
            ) : null}
          </span>
        </span>
        <span className="cc-raw">
          <span className="cc-lbl">{isAr ? "الوزن الداخل" : "Input weight"}</span>
          <span className="cc-rawv">{kg(row.carcassKg)}<i> {isAr ? "كجم" : "kg"}</i></span>
          {row.pieceCount !== null && row.pieceCount !== undefined ? (
            <span className="cc-lbl">{row.pieceCount} {isAr ? "قطعة" : "pc"}</span>
          ) : null}
          {row.partialPiece ? (
            <span className="cc-lbl">{isAr ? "ليست قطعة كاملة" : "not a whole piece"}</span>
          ) : null}
        </span>
      </div>

      {/* الورقة: ثلاثة أعمدة وبس — رقم · اسم القطعة · الوزن.
          الشاشة بتضل بأعمدتها الخمسة مع شريط النسبة. */}
      <table className="cc-tbl">
        <colgroup>
          {paper ? (
            <>
              <col style={{ width: "9%" }} />
              <col style={{ width: "64%" }} />
              <col style={{ width: "27%" }} />
            </>
          ) : (
            <>
              <col style={{ width: "8%" }} />
              <col style={{ width: "42%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "23%" }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th className="cc-n">#</th>
            <th>{isAr ? "اسم القطعة" : "Cut name"}</th>
            <th style={{ textAlign: "end" }}>{isAr ? "الوزن كجم" : "Weight kg"}</th>
            {!paper && <th style={{ textAlign: "center" }}>{isAr ? "قطع" : "Pc"}</th>}
            {!paper && <th>{isAr ? "النسبة" : "Share"}</th>}
          </tr>
        </thead>
        <tbody>
          {cuts.length === 0 ? (
            <tr>
              <td colSpan={paper ? 3 : 5} className="cc-pc">{isAr ? "بلا قطع" : "No cuts"}</td>
            </tr>
          ) : (
            cuts.map((c, i) => {
              const share = base > 0 ? (c.weightKg / base) * 100 : 0;
              return (
                <tr key={`${c.itemId || c.name}_${i}`} className={c.isWaste ? "cc-w" : ""}>
                  <td className="cc-n">{i + 1}</td>
                  <td className="cc-nm" dir="auto">
                    {c.isWaste ? <b>◆</b> : null}
                    {paper ? (c.nameEn || c.name) : c.name}
                    {!paper && c.nameAlt ? <i> · {c.nameAlt}</i> : null}
                  </td>
                  <td className="cc-kgc">{kg(c.weightKg)}</td>
                  {!paper && <td className="cc-pc">—</td>}
                  {!paper && (
                    <td className="cc-share">
                      <span className="cc-bar"><i style={{ width: `${Math.min(share, 100)}%` }} /></span>
                      <em>{share.toFixed(1)}%</em>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="cc-bfoot">
        <span className={`cc-pill${yieldTone}`}>
          {isAr ? "تصافي" : "Yield"} {row.yieldPct.toFixed(1)}%
        </span>
        <span className="cc-tot">
          <span>{isAr ? "نواتج" : "Products"}</span>{kg(row.cutsKg)}
        </span>
        <span className="cc-tot">
          <span>{isAr ? "هدر" : "Waste"}</span>{kg(row.wasteKg)}
        </span>
        {Math.abs(diff) > 0.05 ? (
          <span className="cc-pill bad">{isAr ? "فرق" : "Diff"} {kg(diff)}</span>
        ) : null}
        <span className="cc-spacer" />
        <span className="cc-tot">
          <span>{isAr ? "المجموع" : "Total"}</span>{kg(row.cutsKg + row.wasteKg)}
        </span>
      </div>
    </div>
  );
}

/**
 * بطاقة يوم واحد لجزار واحد — الترويسة والمؤشّرات والصناديق والتواقيع.
 * `rows` = تنفيذات ذلك اليوم (صفوف مُطبَّعة من butcherReportKit).
 */
const CuttingCard = React.forwardRef(function CuttingCard(
  { rows = [], day, isAr = false, butcherName, employeeNo, branchName, paper = false },
  ref
) {
  /* الملغى ما بيطلع عالورق مهما كان المنادي — البطاقة وثيقة شغل، والعملية
     الملغاة مش شغل. وبعدها منّدمج تنفيذات نفس المادة الخام بصندوق واحد. */
  const ops = useMemo(
    () => mergeSameInput(orderOperations((rows || []).filter((r) => !isCancelled(r)))),
    [rows]
  );
  const sum = useMemo(() => {
    // المادة الخام الحقيقية = مدخلات الصناديق الجذر فقط، فمخرجات صندوق
    // تُعاد كمدخل لصندوق آخر — جمعها كلها يضخّم الخام ويكسر نسبة التصافي.
    const raw = ops.filter((r) => (r.__depth || 0) === 0)
      .reduce((s, r) => s + (r.carcassKg || 0), 0);
    const waste = ops.reduce((s, r) => s + (r.wasteKg || 0), 0);
    // النواتج النهائية = القطع التي لم تدخل صندوقاً آخر كمادة خام (لكل قطعة
    // على حدة — قد يُفكَّك ناتج واحد من صندوق ويبقى باقي نواتجه نهائياً)
    const consumed = new Set(ops.map((o) => o.inputItemId).filter(Boolean));
    const products = ops.reduce(
      (s, r) => s + (r.cuts || []).reduce(
        (a, c) => a + (!c.isWaste && !consumed.has(c.itemId) ? c.weightKg : 0), 0
      ), 0
    );
    return { raw, waste, products, yieldPct: raw > 0 ? (products / raw) * 100 : 0 };
  }, [ops]);
  // اسم الشخص قبل اسم الحساب — في حسابات مسمّاة باسم الملحمة
  const approverRec = ops.find((r) => r.review?.byName || r.review?.by)?.review;
  const approver = approverRec?.byName || approverRec?.by || "";

  return (
    <div className="cc" ref={ref}>
      <div className="cc-top">
        <img className="cc-logo" src={mawashiLogo} alt="AL MAWASHI" />
        <span className="cc-titles">
          <span className="cc-h1">
            {paper
              ? "Cutting card"
              : <>{isAr ? "بطاقة التقطيع" : "Cutting card"} <span>{isAr ? "Cutting card" : "بطاقة التقطيع"}</span></>}
          </span>
          {/* رقم الوثيقة — ما بيتكرّر: جزار + يوم. بيربط الورقة بسجلّها */}
          {paper && (
            <span className="cc-doc">
              CC-{employeeNo || "0000"}-{String(day || "").replace(/-/g, "")}
            </span>
          )}
        </span>
        <span className="cc-facts">
          <Fact lbl={isAr ? "الموقع" : "Location"} val={branchName} />
          <Fact lbl={isAr ? "تاريخ التقطيع" : "Cutting date"} val={day} />
          <Fact
            lbl={isAr ? "الجزار" : "Butcher"}
            val={butcherName ? `${butcherName}${employeeNo ? ` · #${employeeNo}` : ""}`
              : (employeeNo ? `#${employeeNo}` : "")}
          />
        </span>
      </div>

      {/* شريط المؤشّرات على الشاشة وحدها — الورقة بدها التفاصيل، والمجاميع
          موجودة بذيل كل صندوق */}
      {!paper && (
        <div className="cc-kpis">
          <Kpi lbl={isAr ? "التنفيذات" : "Operations"} val={ops.length} color="#1f6fd0" />
          <Kpi lbl={isAr ? "المادة الخام" : "Raw material"} val={kg(sum.raw)} unit={isAr ? "كجم" : "kg"} color="#14507f" />
          <Kpi lbl={isAr ? "النواتج النهائية" : "Final products"} val={kg(sum.products)} unit={isAr ? "كجم" : "kg"} color="#0f766e" />
          <Kpi lbl={isAr ? "الهدر والعظم" : "Waste & bones"} val={kg(sum.waste)} unit={isAr ? "كجم" : "kg"} color="#b45309" />
          <Kpi lbl={isAr ? "نسبة التصافي" : "Net yield"} val={`${sum.yieldPct.toFixed(1)}%`} color="#047857" />
        </div>
      )}

      {ops.length ? (
        <div className="cc-grid">
          {ops.map((r, i) => (
            <OpBox key={r.id} row={r} isAr={isAr} paper={paper} n={i + 1} />
          ))}
        </div>
      ) : (
        <div className="cc-empty">
          {isAr ? "لا تنفيذات في هذا اليوم." : "No operations on this day."}
        </div>
      )}

      <div className="cc-sign">
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "توقيع الجزار" : "Butcher signature"}</span>
          <b dir="auto">{butcherName || ""}</b>
        </span>
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "توقيع المشرف" : "Supervisor signature"}</span>
          <b dir="auto">{approver}</b>
        </span>
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "أُدخلت على Odoo بواسطة" : "Posted on Odoo by"}</span>
          <b />
        </span>
      </div>

      {/* ذيل الوثيقة — بالورق وحده: مين طبعها وإيمتى، ورقمها مرّة تانية */}
      {paper && (
        <div className="cc-foot">
          <span>AL MAWASHI · Butchery cutting record</span>
          <span className="cc-spacer" />
          <span>
            CC-{employeeNo || "0000"}-{String(day || "").replace(/-/g, "")}
            {" · "}
            {new Date().toLocaleString("en-GB", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
});

export default CuttingCard;

/**
 * طابعة البطاقة — تُركِّب نسخة مستقلّة في <body> (خارج #root) وتفتح نافذة
 * الطباعة ثم تُنظّف. `job` = خصائص CuttingCard، وnull = لا شيء يُطبع.
 * الفصل عن الشاشة مقصود: الورقة تطلع بمقاسها الخاص بلا أنماط الصفحة.
 */
/* مقاس الورقة — لازم يطابق `@page` بالـCSS فوق (A4 أفقي بهامش ٨ مم) */
const PAGE_MM = { w: 297, h: 210, margin: 8 };
const PX_PER_MM = 96 / 25.4;               // الطباعة بتحسب البكسل ١/٩٦ إنش
const MIN_SCALE = 0.34;                    // أصغر من هيك ما بينقرا
const COL_TRIES = [2, 3, 4];               // عدد أعمدة الصناديق المسموح تجريبها

/**
 * تجهيز البطاقة لصفحة **وحدة**: بتجرّب عدّة توزيعات أعمدة، وبكل توزيع
 * بتدوّر بالتنصيف على أكبر تصغير بيخلّي الارتفاع يدخل بالورقة، وبتاخد
 * الأحسن. بترجّع دالة تنظيف بترجّع الأنماط لأصلها.
 */
function fitToOnePage(portal) {
  const card = portal?.querySelector(".cc");
  const grid = portal?.querySelector(".cc-grid");
  if (!card) return () => {};

  const pw = (PAGE_MM.w - PAGE_MM.margin * 2) * PX_PER_MM;
  const ph = (PAGE_MM.h - PAGE_MM.margin * 2) * PX_PER_MM;

  portal.classList.add("cc-measure");
  const fits = (k, cols) => {
    if (grid) grid.style.columns = String(cols);
    card.style.width = `${pw / k}px`;
    return card.getBoundingClientRect().height * k <= ph;
  };

  let best = { k: MIN_SCALE, cols: COL_TRIES[0] };
  COL_TRIES.forEach((cols) => {
    if (fits(1, cols)) {                      // بتدخل بحجمها الطبيعي
      if (1 > best.k) best = { k: 1, cols };
      return;
    }
    let lo = MIN_SCALE;
    let hi = 1;
    for (let i = 0; i < 7; i += 1) {          // ٧ تنصيفات = دقّة ~٠.٥٪
      const mid = (lo + hi) / 2;
      if (fits(mid, cols)) lo = mid; else hi = mid;
    }
    if (lo > best.k) best = { k: lo, cols };
  });

  if (grid) grid.style.columns = String(best.cols);
  card.style.width = `${pw / best.k}px`;
  document.documentElement.style.setProperty("--cc-scale", String(best.k));
  /* البوّابة بمقاس الورقة وبتقصّ الزايد — الصندوق المكبّر ما بيولّد صفحة تانية */
  portal.style.width = `${pw}px`;
  portal.style.height = `${ph}px`;
  portal.style.overflow = "hidden";
  portal.classList.remove("cc-measure");

  return () => {
    portal.classList.remove("cc-measure");
    portal.removeAttribute("style");
    card.style.width = "";
    if (grid) grid.style.columns = "";
    document.documentElement.style.removeProperty("--cc-scale");
  };
}

export function CuttingCardPrint({ job, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const portalRef = useRef(null);

  useEffect(() => {
    if (!job) return undefined;
    document.body.classList.add("cc-printing");

    /* اسم ملف الـPDF = عنوان الصفحة عند المتصفّح. بلا هالسطر بيطلع اسم
       التطبيق («نظام التفتيش») على كل بطاقة، فبتضيع الملفات ببعضها.
       الشكل المطلوب: «875- 05-09-2026» — الرقم الوظيفي وتاريخ التقطيع. */
    const prevTitle = document.title;
    const [yy = "", mm = "", dd = ""] = String(job.day || "").split("-");
    const stamp = dd && mm && yy ? `${dd}-${mm}-${yy}` : String(job.day || "");
    const fileName = [job.employeeNo, stamp].filter(Boolean).join("- ");
    if (fileName) document.title = fileName;

    let undoFit = () => {};
    const finish = () => {
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("cc-printing");
      document.title = prevTitle;
      undoFit();
      if (doneRef.current) doneRef.current();
    };
    window.addEventListener("afterprint", finish);

    /* القياس بعد ما يرسم المتصفّح النسخة (والشعار والخط)، وبعده الطباعة */
    const fitTimer = setTimeout(() => { undoFit = fitToOnePage(portalRef.current); }, 60);
    const timer = setTimeout(() => window.print(), 220);

    return () => {
      clearTimeout(fitTimer);
      clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("cc-printing");
      document.title = prevTitle;
      undoFit();
    };
  }, [job]);

  if (!job || typeof document === "undefined") return null;
  return createPortal(
    /* الورقة إنجليزية دايماً ومختصرة — `paper` بيشيل النِسب والمنشأ والنوع
       والوقت، و`isAr={false}` بيخلّي كل عنوان إنجليزي مهما كانت لغة الشاشة */
    <div className="cc-portal" ref={portalRef}>
      <CuttingCard {...job} isAr={false} paper />
    </div>,
    document.body
  );
}
