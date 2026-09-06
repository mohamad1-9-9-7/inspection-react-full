// src/pages/butcher/butcherScore.js
//
// 🎯 سكور التنفيذ — تقييم عملية التقطيع الواحدة، والمسار متوسّطها الموزون.
// Per-job cutting score; a pathway/day score is the kg-weighted average of it.
//
// ── ليش على مستوى العملية؟ ──
// لو قيّمنا المسار مباشرة بتضيع العملية السيّئة جوّا مسار كويس. فالوحدة هون
// **التنفيذ الواحد**، وأي تجميع فوقه (مسار · مادة · يوم · جزار) بيصير
// متوسّط موزون بالكيلو — لأنّ ذبيحة ٧٤ كجم ما بتساوي رقبة ١.٢ كجم بمتوسط
// حسابي ساذج.
//
// ── ليش المعياري مش التصافي؟ ──
// التصافي المطلق ما بيقارن: LEG BONE IN تصافيه ٧٩٪ و AUS CARCASS ٩٥٪، مش
// لأنّ جزار أشطر من جزار. فالسكور بيقيس **بعد كل سطر عن نسبته المعيارية**
// المحفوظة باللقطة وقت التسجيل (`stdCheck`)، لا عن رقم مطلق.
//
// ── ليش الحساب هون مش بالسيرفر؟ ──
// السجل بيحفظ `stdPct` و`stdTolPct` وقت التسجيل، فالحساب من اللقطة **ثابت**
// حتى لو تعدّلت معايير الوصفة بكرة — بلا تخزين وبلا backfill، والأوزان
// بتتعدّل من هون بلا نشرة سيرفر. لمّا يحتاجها ترتيب السيرفر، وقتها بينخزّن
// `score` + `scoreVer` بالسجل لحظة اعتماد المشرف.
//
// ── قاعدة العدل ──
// المعيار اللي ما إله بيانات بهالعملية (ما في وقت مكتوب · وصفة بلا نسب)
// **بينشال ووزنه بينوزّع على الباقي** — لا بيفيد ولا بيضرّ. ووصفة بلا أي
// نسبة معيارية = بلا سكور (`null`)، مش ١٠٠: رقم بلا أساس أسوأ من لا رقم.

/* ══════════════ الأوزان والثوابت ══════════════ */

/** مجموعها ١٠٠. الجودة ٨٠٪ · السرعة ٢٠٪ (منها الاكتمال جزء من الجودة). */
export const SCORE_WEIGHTS = {
  std: 60,        // مطابقة الأسطر للنسب المعيارية
  waste: 20,      // الهدر مقابل الهدر المعياري
  complete: 10,   // اكتمال الوزن (أسطر ما انوزنت + فاقد غير مسجّل)
  speed: 10,      // الوقت لكل كيلو مقابل وسيط نفس المسار
};

/** الصفر عند ٣× التسامح: جوّا التسامح ١٠٠، وبعده بينزل خطّي. */
const OVER_SPAN = 2;

/** وسيط السرعة ما بيعني إشي بأقل من هيك عيّنة — وقتها معيار الوقت بينشال. */
export const MIN_SPEED_SAMPLES = 3;

/** كل سطر معياري ما انوزن إطلاقاً بيحسم من الاكتمال. */
const SKIPPED_PENALTY = 25;

/** كل نقطة مئوية فاقد غير مسجّل (خام − نواتج − هدر) بتحسم من الاكتمال. */
const UNACCOUNTED_PENALTY = 10;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** مفتاح المقارنة للسرعة — نفس المسار، وإلا نفس الوصفة، وإلا نفس المادة. */
const speedKeyOf = (r) =>
  r.pathwayId || r.pathwayCode || r.bomRef || r.inputItemId || r.inputName || "—";

/* ══════════════ المعايير الأربعة ══════════════ */

/**
 * ① المطابقة المعيارية — لكل سطر مفحوص: بعده بالنقاط عن نسبته المعيارية،
 * مقيس بالتسامح. السطر بيتوزن **بحصّته المعيارية**، فالمنتج الرئيسي بيأثّر
 * أكتر من قصاصة ٢٪.
 */
function stdPart(r) {
  const sc = r.stdCheck;
  const lines = sc?.on ? (sc.lines || []) : [];
  if (!lines.length) return null;

  const tol = Math.max(num(sc.tolPct), 1);   // تسامح صفر = نقطة وحدة على الأقل
  let sum = 0;
  let wsum = 0;
  lines.forEach((c) => {
    const w = Math.max(num(c.stdPct), 1);
    const over = Math.max(0, Math.abs(num(c.stdDeltaPts)) - tol);
    sum += clamp(100 - (over / (OVER_SPAN * tol)) * 100, 0, 100) * w;
    wsum += w;
  });
  return wsum > 0 ? sum / wsum : null;
}

/**
 * ② الهدر — مقابل **الهدر المعياري** للوصفة (مجموع نسب أسطر الهدر)، مش
 * مقابل رقم مطلق. بلا هدر معياري بالوصفة ما في مقارنة عادلة ⇒ المعيار بينشال.
 */
function wastePart(r) {
  const sc = r.stdCheck;
  if (!sc?.on) return null;
  const expected = (sc.lines || [])
    .filter((c) => c.isWaste)
    .reduce((s, c) => s + num(c.stdPct), 0);
  if (expected <= 0) return null;

  const tol = Math.max(num(sc.tolPct), 1);
  const over = Math.max(0, num(r.wastePct) - expected);
  return clamp(100 - (over / (OVER_SPAN * tol)) * 100, 0, 100);
}

/**
 * ③ اكتمال الوزن — سطر معياري ما انوزن إطلاقاً، وفاقد غير مسجّل (خام ناقص
 * ما انحسب). هاد المعيار محسوب دايماً: ما بيحتاج نسب معيارية.
 */
function completePart(r) {
  const skipped = num(r.stdCheck?.skipped);
  const unaccPts = num(r.carcassKg) > 0
    ? (Math.abs(num(r.unaccountedKg)) / num(r.carcassKg)) * 100
    : 0;
  return clamp(
    100 - skipped * SKIPPED_PENALTY - unaccPts * UNACCOUNTED_PENALTY,
    0, 100,
  );
}

/**
 * ④ الوقت لكل كيلو — مقابل **وسيط نفس المسار** (مش رقم مطلق: تفكيك ذبيحة
 * غير تصفية رقبة). بالوسيط = ١٠٠، ضِعف الوسيط = صفر، وأسرع من الوسيط بيتسقّف
 * على ١٠٠ — السرعة الزائدة مش إنجاز لحالها.
 */
function speedPart(r, refMinPerKg) {
  if (!(num(r.durationMin) > 0) || !(num(r.baseKg) > 0) || !(refMinPerKg > 0)) return null;
  const ratio = (num(r.durationMin) / num(r.baseKg)) / refMinPerKg;
  return clamp(100 - (ratio - 1) * 100, 0, 100);
}

/* ══════════════ سكور عملية وحدة ══════════════ */

/**
 * سكور تنفيذ واحد.
 * @param {object} r صف مطبَّع من `useNormalizedRows`
 * @param {number} refMinPerKg وسيط الدقائق/كجم لنفس المسار (0 = بلا مرجع)
 * @returns {{score:number|null, parts:object, worst:object|null}}
 */
export function scoreJob(r, refMinPerKg = 0) {
  const parts = {
    std: stdPart(r),
    waste: wastePart(r),
    complete: completePart(r),
    speed: speedPart(r, refMinPerKg),
  };

  /* بلا أي نسبة معيارية ما في أساس للتقييم — «—» أصدق من رقم مخترع */
  if (parts.std === null && parts.waste === null) {
    return { score: null, parts, worst: null };
  }

  let sum = 0;
  let wsum = 0;
  Object.entries(parts).forEach(([id, v]) => {
    if (v === null) return;                 // معيار بلا بيانات بينشال ووزنه بينوزّع
    sum += v * SCORE_WEIGHTS[id];
    wsum += SCORE_WEIGHTS[id];
  });

  /* أسوأ سطر — السبب اللي بينكتب جنب الرقم. رقم بلا سبب بيصير ضغط، مش تدريب */
  const worst = (r.stdCheck?.lines || [])
    .filter((c) => !c.stdOk)
    .sort((a, b) => Math.abs(num(b.stdDeltaPts)) - Math.abs(num(a.stdDeltaPts)))[0] || null;

  return {
    score: wsum > 0 ? Math.round(sum / wsum) : null,
    parts,
    worst: worst
      ? { name: worst.name, deltaPts: num(worst.stdDeltaPts), isWaste: !!worst.isWaste }
      : null,
  };
}

/* ══════════════ تعليق السكور على الصفوف ══════════════ */

/** وسيط قائمة أرقام. */
function median(list) {
  if (!list.length) return 0;
  const s = list.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * مراجع السرعة — وسيط الدقائق/كجم لكل مسار داخل نفس المجموعة المعروضة.
 * المسار اللي عيّنته أصغر من `MIN_SPEED_SAMPLES` ما إله مرجع (معيار الوقت
 * بينشال عن عملياته) — وسيط من عمليّتين صدفة مش معيار.
 */
export function speedRefs(rows) {
  const map = new Map();
  (rows || []).forEach((r) => {
    if (!(num(r.durationMin) > 0) || !(num(r.baseKg) > 0)) return;
    const k = speedKeyOf(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(num(r.durationMin) / num(r.baseKg));
  });
  const out = new Map();
  map.forEach((list, k) => {
    if (list.length >= MIN_SPEED_SAMPLES) out.set(k, median(list));
  });
  return out;
}

/**
 * بيرجّع نفس الصفوف + { score, scoreParts, scoreWorst }.
 * بينحسب مرّة وحدة بأعلى الشاشة، فكل الكروت تحته بتقرا `r.score` جاهز.
 */
export function attachScores(rows) {
  const list = rows || [];
  const refs = speedRefs(list);
  return list.map((r) => {
    const { score, parts, worst } = scoreJob(r, refs.get(speedKeyOf(r)) || 0);
    return { ...r, score, scoreParts: parts, scoreWorst: worst };
  });
}

/**
 * متوسّط موزون بالكيلو — سكور مسار أو مادة أو يوم.
 * الصف اللي بلا سكور (وصفة بلا نسب معيارية) بينشال من الوزن كمان.
 */
export function avgScore(rows) {
  let sum = 0;
  let wsum = 0;
  (rows || []).forEach((r) => {
    if (r.score === null || r.score === undefined) return;
    const w = Math.max(num(r.baseKg) || num(r.carcassKg), 0.001);
    sum += r.score * w;
    wsum += w;
  });
  return wsum > 0 ? Math.round(sum / wsum) : null;
}

/** ألوان النطاقات — أخضر ≥٩٠ · كهرماني ٧٥–٨٩ · أحمر تحت ٧٥. */
export function scoreTone(v) {
  if (v === null || v === undefined) return { fg: "#7b93a8", bg: "#f4f7fb", bd: "#e2eaf3" };
  if (v >= 90) return { fg: "#047857", bg: "#ecfdf5", bd: "#a7f3d0" };
  if (v >= 75) return { fg: "#8a5a12", bg: "#fff7ed", bd: "#fcd9a4" };
  return { fg: "#991b1b", bg: "#fef2f2", bd: "#fecaca" };
}
