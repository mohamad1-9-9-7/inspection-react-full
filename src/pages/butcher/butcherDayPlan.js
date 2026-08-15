// src/pages/butcher/butcherDayPlan.js
//
// 🎯 خطة اليوم — المشرف يحدّد هدف الملحمة، والجزار يشوف تقدّمه لحظياً.
// Daily plan: the supervisor sets a per-butchery target, the kiosk shows progress.
//
// التخزين على السيرفر (مصدر الحقيقة): سجل واحد لكل (يوم × ملحمة)
//   type = butcher_day_plan
//   payload.reportDate = "YYYY-MM-DD__BRANCH"   ← مفتاح فريد
// نستعمل PUT /api/reports لأنه upsert على (type, reportDate) — وهذا بالضبط
// ما نريده هنا: خطة واحدة لكل ملحمة باليوم، والحفظ الثاني يحدّث الأولى.
// (انتبه: الأنواع متعددة السجلات باليوم لا يجوز لها PUT العام — أما هنا فالمفتاح
//  فريد بحد ذاته فالسلوك صحيح.)

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config/api";
import { TYPE as CUT_TYPE } from "./butcherOptions";

export const PLAN_TYPE = "butcher_day_plan";

/* حدود السحب. السقف يُطبَّق **بعد** فلتر التاريخ على السيرفر، فهو سقف
   لسجلات يوم واحد لا لكل التاريخ — ٢٠٠٠ تنفيذ باليوم الواحد لكل الملاحم
   هامش لا يُبلَغ عملياً. (قبل الفلتر كان سقفاً على كل الجدول، وهذا كان
   يقصّ سجلات اليوم بصمت لو كثُرت السجلات الأحدث منها.) */
const DAY_FETCH_LIMIT = 2000;
const PLAN_FETCH_LIMIT = 120;   // خطة واحدة لكل (يوم × ملحمة)

/** رابط سجلات يوم واحد — الفلتر على السيرفر، فلا نسحب ما لا نحتاجه. */
const dayUrl = (date) =>
  `${API_BASE}/api/reports?type=${encodeURIComponent(CUT_TYPE)}`
  + `&from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`
  + `&limit=${DAY_FETCH_LIMIT}`;

export const planKey = (date, branch) => `${date}__${branch || "ALL"}`;

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

const num = (v) => Number(v) || 0;

/* ══════════════ الخطط ══════════════ */

/**
 * خطة واحدة بعينها — يضرب الفهرس الفريد ويرجّع **صفاً واحداً**.
 * هذا ما يحتاجه الكشك، فلا داعي لسحب كل الخطط لديه.
 */
export async function fetchPlan(date, branch) {
  const key = planKey(date, branch);
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(PLAN_TYPE)}`
    + `&reportDate=${encodeURIComponent(key)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const row = toArray(await res.json())[0];
  return row?.payload || null;
}

/** كل الخطط المحفوظة (للوحة المشرف — يحتاج كل الملاحم). */
export async function fetchPlans() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(PLAN_TYPE)}&limit=${PLAN_FETCH_LIMIT}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  return toArray(await res.json()).map((r) => r?.payload || {}).filter((p) => p.date);
}

/** حفظ/تحديث خطة يوم لملحمة — upsert على المفتاح الفريد. */
export async function savePlan({ date, branch, targetCount, targetKg, note, by }) {
  const payload = {
    reportDate: planKey(date, branch),
    date,
    branch: branch || "",
    targetCount: Math.max(0, Math.round(num(targetCount))),
    targetKg: Math.max(0, num(targetKg)),
    note: String(note || ""),
    updatedBy: by || "",
    updatedAt: new Date().toISOString(),
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: by || "supervisor", type: PLAN_TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return payload;
}

/* ══════════════ التقدّم الفعلي ══════════════ */

/** مجموع منتجات سجل — يتجاهل الهدر (نفس منطق التقارير). */
const recordProductsKg = (p) =>
  Array.isArray(p?.cuts)
    ? p.cuts.reduce((s, c) => s + (c?.kind === "product" ? num(c.weightKg) : 0), 0)
    : 0;

/**
 * تقدّم اليوم من سجلات التقطيع — للملحمة كلها ولموظف بعينه بنفس الطلب.
 * طلب واحد يخدم الاثنين حتى لا نُثقل الشبكة على جهاز الكشك.
 */
export async function fetchTodayProgress({ date, branch, employeeNo }) {
  const res = await fetch(dayUrl(date), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const rows = toArray(await res.json());

  const sameDay = (p) =>
    String(p.cutDate || p.date || p.reportDate || "").slice(0, 10) === date;

  const tally = (list) => ({
    count: list.length,
    rawKg: list.reduce((s, p) => s + num(p.carcassWeightKg), 0),
    productsKg: list.reduce((s, p) => s + recordProductsKg(p), 0),
  });

  const today = rows.map((r) => r?.payload || {}).filter(sameDay);
  const ofBranch = branch ? today.filter((p) => String(p.branch || "") === branch) : today;
  const ofMine = employeeNo
    ? today.filter((p) => String(p.employeeNo || "") === String(employeeNo))
    : [];

  return { branch: tally(ofBranch), mine: tally(ofMine) };
}

/**
 * تقدّم اليوم لكل الملاحم دفعة واحدة — **طلب واحد** لا طلب لكل فرع.
 * (سحب السجلات مرة لكل ملحمة يضاعف النطاق بلا داعٍ.)
 * يرجّع { [branchCode]: {count, rawKg, productsKg}, __all: {...} }
 */
export async function fetchTodayProgressByBranch(date) {
  const res = await fetch(dayUrl(date), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Server ${res.status}`);

  const out = { __all: { count: 0, rawKg: 0, productsKg: 0 } };
  toArray(await res.json())
    .map((r) => r?.payload || {})
    .filter((p) => String(p.cutDate || p.date || p.reportDate || "").slice(0, 10) === date)
    .forEach((p) => {
      const code = String(p.branch || "");
      if (!out[code]) out[code] = { count: 0, rawKg: 0, productsKg: 0 };
      const raw = num(p.carcassWeightKg);
      const prod = recordProductsKg(p);
      out[code].count += 1;
      out[code].rawKg += raw;
      out[code].productsKg += prod;
      out.__all.count += 1;
      out.__all.rawKg += raw;
      out.__all.productsKg += prod;
    });
  return out;
}

/** نسبة الإنجاز (٠–١٠٠) مع حماية من القسمة على صفر. */
export const progressPct = (done, target) =>
  target > 0 ? Math.min(100, (done / target) * 100) : 0;

/* ══════════════ هوك الكشك ══════════════ */

/**
 * خطة اليوم لملحمة + التقدّم الفعلي.
 * التحديث بالأحداث فقط (فتح · عودة للتبويب · بعد الحفظ) — بلا مؤقّتات.
 * يعيد null للخطة إذا المشرف ما حدّد هدفاً — عندها الكشك لا يعرض شيئاً.
 */
export function useDayPlan({ date, branch, employeeNo }) {
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  // فشل التحميل يجب أن يُقال، لا أن يختفي الشريط وكأن لا خطة أصلاً
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // التقدّم يُحسب متى وُجد موظف أو ملحمة؛ الخطة تحتاج ملحمة
    if (!date || (!branch && !employeeNo)) {
      setPlan(null); setProgress(null); setError("");
      return;
    }
    setLoading(true);
    try {
      // خطة واحدة مفهرسة (لا كل الخطط) + تقدّم اليوم مقيّد باليوم نفسه
      const [p, prog] = await Promise.all([
        branch ? fetchPlan(date, branch) : Promise.resolve(null),
        fetchTodayProgress({ date, branch, employeeNo }),
      ]);
      setPlan(p);
      setProgress(prog);
      setError("");
    } catch (e) {
      // نُبقي آخر قيم ناجحة معروضة، ونرفع الخطأ ليظهر للمستخدم
      setError(e?.message || "load failed");
    } finally {
      setLoading(false);
    }
  }, [date, branch, employeeNo]);

  useEffect(() => {
    let alive = true;
    if (!document.hidden) load();
    // ⚠️ بلا استقصاء دوري بالمرّة — جهاز الكشك مفتوح طول الدوام، ومؤقّت كل بضع
    // دقائق كان يعني مئات الطلبات الثقيلة يومياً ويُبقي قاعدة البيانات صاحية.
    // التحديث يكفي عند: فتح الشاشة · العودة للتبويب · بعد كل حفظ (reload).
    const onVisible = () => { if (alive && !document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { plan, progress, loading, error, reload: load };
}
