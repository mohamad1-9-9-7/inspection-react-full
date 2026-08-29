// src/pages/butcher/butcherStats.js
//
// 🏆 أداء الجزارين — الأرقام من السيرفر، والنتيجة والترتيب هون.
// Butcher performance: facts from the server, score and ranking on the client.
//
// ليش القسمة هيك؟ المسار `/api/reports/butcher-stats` بيرجّع **حقائق** مجمّعة
// لكل جزار (عمليات · خام · هدر · دقائق · مطابقة · تذبذب التصافي) محسوبة
// بالـSQL، بضع كيلوبايتات مهما كبر التاريخ — بدل ما كل جزار يفتح الشاشة
// فينزّل سجلات كل الملاحم بالـpayload كامل. أما **الأوزان والنتيجة** فهون،
// حتى تتعدّل معادلة التقييم بلا نشرة سيرفر.
//
// المعايير الستّة (وزنها الافتراضي تحت):
//   ① نسبة الهدر            الأقل أفضل
//   ② المطابقة مع المعياري  الأعلى أفضل
//   ③ الثبات                تذبذب التصافي بين عملية وعملية — الأقل أفضل
//   ④ الوقت لكل كيلو        الأقل أفضل
//   ⑤ عدد العمليات          الأعلى أفضل
//   ⑥ كمية الخام            الأعلى أفضل
//
// قاعدة العدل: كل معيار **بينعاير جوّا مجموعة المقارنة نفسها** (ملحمته أو
// الكل)، فجزار بملحمة صغيرة ما بينظلم بمقارنة كمية مع ملحمة كبيرة. والمعيار
// اللي ما إله بيانات عند جزار (ما كتب وقت، أو وصفته بلا نسب معيارية) بينشال
// من حسابه هو وحده ووزنه بينوزّع على الباقي — لا بيفيده ولا بيضرّه.

import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";

/* ══════════════ الثوابت ══════════════ */

/** الأوزان — مجموعها ١٠٠. الجودة ٧٠٪ · السرعة ١٥٪ · الكمية ١٥٪. */
export const STAT_WEIGHTS = {
  waste: 25,   // نسبة الهدر
  std: 25,     // المطابقة مع النسب المعيارية
  steady: 20,  // الثبات
  speed: 15,   // الوقت لكل كيلو
  ops: 10,     // عدد العمليات
  raw: 5,      // كمية الخام
};

/** أقل عدد عمليات حتى ينحسب ترتيب — تحت هيك الرقم صدفة مش أداء. */
export const MIN_OPS = 5;

/** الثبات بلا ٣ عمليات ما بيعني إشي (الانحراف المعياري بده عيّنة). */
export const MIN_STEADY_OPS = 3;

/** تعريف كل معيار — للعرض وللحساب معاً، حتى ما يفترقوا. */
export const METRICS = [
  {
    id: "waste", higherBetter: false, unit: "%",
    ar: "نسبة الهدر", en: "Waste %",
    hintAr: "الهدر مقارنة بوزن الخام الداخل.",
    hintEn: "Waste against the raw weight that went in.",
  },
  {
    id: "std", higherBetter: true, unit: "%",
    ar: "المطابقة المعيارية", en: "Standard match",
    hintAr: "نسبة عملياتك اللي وقعت أوزانها ضمن التسامح المعياري للوصفة.",
    hintEn: "Share of your operations that landed inside the recipe tolerance.",
  },
  {
    id: "steady", higherBetter: false, unit: "±",
    ar: "الثبات", en: "Consistency",
    hintAr: "تذبذب تصافيك بين عملية وعملية — كل ما قلّ، شغلك أثبت.",
    hintEn: "How much your yield swings between jobs — lower is steadier.",
  },
  {
    id: "speed", higherBetter: false, unit: "د/كجم",
    ar: "الوقت لكل كيلو", en: "Minutes per kg",
    hintAr: "دقائق التقطيع مقسومة على الكيلوات — محسوبة من العمليات اللي فيها وقت مكتوب.",
    hintEn: "Recorded minutes divided by kilos — only from jobs with a time entered.",
  },
  {
    id: "ops", higherBetter: true, unit: "",
    ar: "عدد العمليات", en: "Operations",
    hintAr: "كم عملية تقطيع نفّذت بالفترة.",
    hintEn: "How many cutting jobs you completed in the period.",
  },
  {
    id: "raw", higherBetter: true, unit: "كجم",
    ar: "كمية الخام", en: "Raw kg",
    hintAr: "إجمالي وزن المادة الخام اللي قطّعتها.",
    hintEn: "Total raw weight you cut.",
  },
];

/* ══════════════ السحب ══════════════ */

export function useButcherStats({ from = "", to = "", enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) { setRows([]); setError(""); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const qs = [
        from ? `from=${encodeURIComponent(from)}` : "",
        to ? `to=${encodeURIComponent(to)}` : "",
      ].filter(Boolean).join("&");
      const res = await fetch(`${API_BASE}/api/reports/butcher-stats${qs ? `?${qs}` : ""}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.message || "failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, enabled]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}

/* ══════════════ الحساب ══════════════ */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** حقائق السيرفر → المعايير الستّة. القيمة null = ما في بيانات لهالمعيار. */
export function toMetrics(r) {
  const baseKg = num(r.baseKg);
  const durBase = num(r.durBaseKg);
  return {
    empNo: String(r.empNo || ""),
    name: r.name || `#${r.empNo}`,
    branch: r.branch || "",
    branches: Array.isArray(r.branches) ? r.branches : [],
    ops: num(r.ops),
    lastDay: r.lastDay || "",
    values: {
      waste: baseKg > 0 ? (num(r.wasteKg) / baseKg) * 100 : null,
      std: num(r.stdOps) > 0 ? (num(r.stdPassOps) / num(r.stdOps)) * 100 : null,
      steady: num(r.yieldOps) >= MIN_STEADY_OPS && Number.isFinite(Number(r.yieldSd))
        ? Number(r.yieldSd) : null,
      speed: num(r.durOps) > 0 && durBase > 0 ? num(r.durMin) / durBase : null,
      ops: num(r.ops),
      raw: num(r.rawKg),
    },
    // تغطية المعايير اللي بتعتمد على إدخال اختياري — تُعرض جنب الرقم
    coverage: { std: num(r.stdOps), speed: num(r.durOps) },
    yieldPct: Number.isFinite(Number(r.avgYieldPct)) ? Number(r.avgYieldPct) : null,
  };
}

/**
 * ترتيب مجموعة: تعيير كل معيار ٠–١٠٠ جوّا المجموعة، وبعدين متوسّط موزون.
 * @param list صفوف من `toMetrics`
 * @returns نفس الصفوف + { score, rank, parts, eligible }
 */
export function rankGroup(list) {
  const eligible = list.filter((x) => x.ops >= MIN_OPS);

  // مدى كل معيار من المؤهّلين وحدهم — قيمة شاذّة لجزار بعمليتين ما بتشوّه السلّم
  const range = {};
  METRICS.forEach((m) => {
    const vals = eligible
      .map((x) => x.values[m.id])
      .filter((v) => v !== null && Number.isFinite(v));
    range[m.id] = vals.length ? { lo: Math.min(...vals), hi: Math.max(...vals) } : null;
  });

  const scoreOf = (x) => {
    const parts = {};
    let sum = 0;
    let wsum = 0;
    METRICS.forEach((m) => {
      const v = x.values[m.id];
      const r = range[m.id];
      if (v === null || !Number.isFinite(v) || !r) { parts[m.id] = null; return; }
      const s = r.hi === r.lo
        ? 100                                   // الكل متساوي → علامة كاملة للكل
        : ((m.higherBetter ? (v - r.lo) : (r.hi - v)) / (r.hi - r.lo)) * 100;
      parts[m.id] = Math.round(s);
      sum += s * STAT_WEIGHTS[m.id];
      wsum += STAT_WEIGHTS[m.id];
    });
    return { parts, score: wsum > 0 ? Math.round(sum / wsum) : null };
  };

  const scored = list.map((x) => {
    const ok = x.ops >= MIN_OPS;
    const { parts, score } = ok ? scoreOf(x) : { parts: {}, score: null };
    return { ...x, eligible: ok, parts, score };
  });

  scored
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score - a.score || b.ops - a.ops)
    .forEach((x, i) => { x.rank = i + 1; });

  return scored.sort((a, b) => {
    if (a.score === null && b.score === null) return b.ops - a.ops;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return a.rank - b.rank;
  });
}

/** متوسّط المجموعة لمعيار — للمقارنة «أنا مقابل المتوسّط». */
export function groupAvg(list, id) {
  const vals = list
    .map((x) => x.values[id])
    .filter((v) => v !== null && Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/**
 * اللوحتان الجاهزتان للعرض.
 * @param rows   جواب السيرفر الخام
 * @param empNo  رقم الجزار الحالي
 */
export function buildBoards(rows, empNo) {
  const all = (rows || []).map(toMetrics);
  const me = all.find((x) => x.empNo === String(empNo || "")) || null;
  const myBranch = me?.branch || "";

  const branchList = myBranch
    ? all.filter((x) => x.branch === myBranch || x.branches.includes(myBranch))
    : [];

  return {
    myBranch,
    branchBoard: rankGroup(branchList),
    allBoard: rankGroup(all),
  };
}
