// src/pages/settings/_shared/reportBackupFetch.js
// 📥 قراءة *كل* سجلات نوع تقرير، مهما كان عددها + تدقيق نافذة الرؤية.
//
// المشكلة: السيرفر بيسقّف `GET /api/reports?type=X` بـ 5000 صف
// (`clampInt(req.query.limit, 200, 1, 5000)` في routes/reports.cjs) وما بيدعم
// `offset` ولا cursor. utils/authFetch.js بيحقن `limit=5000` تلقائياً، فالنسخة
// الاحتياطية كانت بتاخد أحدث 5000 سجل وبتسكت — نسخة ناقصة اسمها كاملة.
//
// الحل بدون أي تعديل على السيرفر: نفس الراوت بيدعم `from`/`to` وبيفلتر على
// BUSINESS_DATE داخل SQL. فلما نضرب بالسقف، منقسّم المدة سنة سنة، واللي بيضرب
// بالسقف منها منقسّمه شهر شهر، واللي بعده يوم يوم. معظم الأنواع بتخلص بطلب
// واحد لأنها تحت السقف أصلاً، فما في كلفة إضافية عليها.

import API_BASE from "../../../config/api";
import {
  windowRuleForType,
  canSeeFullHistory,
  cutoffISOForRule,
} from "../../../utils/reportWindow";

/** سقف السيرفر لكل طلب. ضربه يعني «في كمان، قسّم المدة». */
export const PAGE_CAP = 5000;

/** أقدم سنة منطقية بالنظام — حدّ صلب يمنع المشي للخلف بلا نهاية. */
const FLOOR_YEAR = 2015;

/* ─────────────────────────── طلب صفحة واحدة ─────────────────────────── */

/**
 * فهرس تواريخ النوع: `?type=X&dates=1` بيرجّع { id, reportDate } لكل سجل
 * **بلا LIMIT** (شوف routes/reports.cjs). منه منعرف بالضبط أي أيام فيها سجلات
 * وكم سجل بكل يوم، فمنقدر نفصّل نوافذ كل وحدة تحت السقف — بدل التخمين.
 *
 * سيرفر قديم ما بيعرف `dates=1` بيقع على فرع lite المسقّف بـ 5000، وبيرجّع نفس
 * الشكل. فطول ما الردّ بالضبط 5000 صف منعتبره غير موثوق ومنرجع للمشي سنة سنة.
 *
 * @returns {Promise<{dates: Map<string, number>, total: number} | null>}
 */
async function getDateIndex(type) {
  try {
    const qs = new URLSearchParams({ type, dates: "1" });
    const res = await fetch(`${API_BASE}/api/reports?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || [];
    if (!rows.length) return null;
    if (rows.length === PAGE_CAP) return null; // غالباً ردّ lite مسقّف، مش فهرس كامل

    const dates = new Map();
    for (const r of rows) {
      const d = isoOf(r?.reportDate);
      if (!d) continue;
      dates.set(d, (dates.get(d) || 0) + 1);
    }
    return dates.size ? { dates, total: rows.length } : null;
  } catch {
    return null;
  }
}

async function getPage(type, from, to) {
  const qs = new URLSearchParams({ type, limit: String(PAGE_CAP) });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  try {
    const res = await fetch(`${API_BASE}/api/reports?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  } catch {
    return [];
  }
}

/* ─────────────────────────── مفاتيح ودمج ─────────────────────────── */

/** مفتاح فريد للصف. `id` هو الأصل؛ الباقي احتياط لصفوف قديمة بلا id. */
function rowKey(row) {
  if (row?.id != null && row.id !== "") return `id:${row.id}`;
  if (row?._id != null && row._id !== "") return `id:${row._id}`;
  return `x:${row?.type || ""}|${row?.created_at || row?.createdAt || ""}|${row?.reporter || ""}`;
}

function mergeInto(map, rows) {
  for (const r of rows || []) {
    const k = rowKey(r);
    if (!map.has(k)) map.set(k, r);
  }
}

/* ─────────────────────────── حدود التواريخ ─────────────────────────── */

const pad = (n) => String(n).padStart(2, "0");

function isoOf(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
  return "";
}

function rowYear(row) {
  const p = row?.payload || {};
  const d =
    isoOf(p.cutDate) || isoOf(p.date) || isoOf(p.reportDate) ||
    isoOf(p.header?.reportDate) || isoOf(p.header?.date) ||
    isoOf(row?.created_at) || isoOf(row?.createdAt);
  const y = Number(d.slice(0, 4));
  return Number.isFinite(y) && y >= FLOOR_YEAR ? y : 0;
}

/** آخر يوم في الشهر — شباط الكبيسة محسوبة. */
function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/* ───────────────────── تفصيل النوافذ من فهرس التواريخ ───────────────────── */

/**
 * يلمّ الأيام المتتالية بنوافذ، كل نافذة أقلّ من السقف — فأقلّ عدد طلبات ممكن
 * وبلا أي نافذة بتضرب بالسقف. يوم لحاله فوق السقف بيصير نافذته وبينتعلّم.
 *
 * @param {Map<string, number>} dateCounts
 * @returns {{from:string, to:string, count:number, overCap:boolean}[]}
 */
function packWindows(dateCounts) {
  const days = [...dateCounts.keys()].sort();
  const out = [];
  let cur = null;

  for (const day of days) {
    const n = dateCounts.get(day) || 0;

    if (n >= PAGE_CAP) {
      if (cur) { out.push(cur); cur = null; }
      out.push({ from: day, to: day, count: n, overCap: true });
      continue;
    }
    if (!cur) { cur = { from: day, to: day, count: n, overCap: false }; continue; }
    if (cur.count + n >= PAGE_CAP) { out.push(cur); cur = { from: day, to: day, count: n, overCap: false }; continue; }
    cur.to = day;
    cur.count += n;
  }
  if (cur) out.push(cur);
  return out;
}

/* ─────────────────────────── القسمة المتدرّجة ─────────────────────────── */

/**
 * يجيب مدة واحدة، وإذا ضربت بالسقف بيقسّمها للمستوى الأدقّ.
 * @returns {boolean} true لو وصلنا ليوم واحد وبعده ضارب بالسقف (تعذّر التقسيم).
 */
async function fetchSpan(type, from, to, level, map, onStep) {
  const rows = await getPage(type, from, to);
  onStep?.(rows.length);
  mergeInto(map, rows);

  if (rows.length < PAGE_CAP) return false;

  const y = Number(from.slice(0, 4));

  if (level === "year") {
    let hitFloor = false;
    for (let m = 1; m <= 12; m++) {
      const last = lastDayOfMonth(y, m);
      const deeper = await fetchSpan(
        type, `${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(last)}`, "month", map, onStep
      );
      hitFloor = hitFloor || deeper;
    }
    return hitFloor;
  }

  if (level === "month") {
    const m = Number(from.slice(5, 7));
    const last = lastDayOfMonth(y, m);
    let hitFloor = false;
    for (let d = 1; d <= last; d++) {
      const day = `${y}-${pad(m)}-${pad(d)}`;
      const deeper = await fetchSpan(type, day, day, "day", map, onStep);
      hitFloor = hitFloor || deeper;
    }
    return hitFloor;
  }

  // يوم واحد فيه 5000 سجل أو أكتر — ما في مستوى أدقّ من اليوم بهالراوت.
  return true;
}

/* ─────────────────────────── الواجهة ─────────────────────────── */

/**
 * كل سجلات نوع واحد.
 *
 * @param {string} type
 * @param {object} [opts]
 * @param {(info:{requests:number,rows:number}) => void} [opts.onProgress]
 * @returns {Promise<{
 *   rows: object[],
 *   requests: number,
 *   paged: boolean,        // اضطرّينا نقسّم المدة
 *   truncated: boolean,    // يوم واحد تجاوز السقف — في سجلات ما وصلناها
 *   mayMissUndated: boolean // سجلات بلا تاريخ أقدم من أحدث 5000 ما بتوصلها القسمة
 * }>}
 */
export async function fetchAllOfType(type, opts = {}) {
  const { onProgress } = opts;
  let requests = 0;
  const map = new Map();
  const step = (n) => {
    requests += 1;
    onProgress?.({ requests, rows: map.size + n });
  };

  // ١) طلب واحد بلا مدة. الحالة الغالبة: النوع تحت السقف وبنخلص هون.
  const probe = await getPage(type);
  step(probe.length);
  mergeInto(map, probe);

  if (probe.length < PAGE_CAP) {
    return {
      rows: [...map.values()],
      requests,
      paged: false,
      truncated: false,
      mayMissUndated: false,
    };
  }

  // ٢) ضربنا بالسقف. المفضّل: فهرس التواريخ الكامل، منه منفصّل نوافذ مضمونة.
  let truncated = false;
  const index = await getDateIndex(type);
  requests += 1;

  if (index) {
    const windows = packWindows(index.dates);
    for (const w of windows) {
      const rows = await getPage(type, w.from, w.to);
      step(rows.length);
      mergeInto(map, rows);
      if (w.overCap) truncated = true;
    }
    // الفهرس بيعدّ السجلات المؤرّخة بالضبط، فمنقدر نتأكد إننا جبناها كلها.
    if (map.size < index.total) truncated = true;

    return {
      rows: [...map.values()],
      requests,
      paged: true,
      truncated,
      indexedTotal: index.total,
      mayMissUndated: true,
    };
  }

  // ٣) ما في فهرس موثوق (سيرفر قديم أو ردّ مقصوص): منمشي سنة سنة لحدّ الأرضية.
  //    ما منوقف بدري على «سنتين فاضيات» — بيانات فيها فجوة سنين بتضيع هيك.
  const newestYear = Math.max(
    ...probe.map(rowYear).filter(Boolean),
    new Date().getFullYear()
  );

  for (let y = newestYear; y >= FLOOR_YEAR; y--) {
    const hitFloor = await fetchSpan(type, `${y}-01-01`, `${y}-12-31`, "year", map, step);
    truncated = truncated || hitFloor;
  }

  return {
    rows: [...map.values()],
    requests,
    paged: true,
    truncated,
    indexedTotal: null,
    // القسمة بتشتغل على BUSINESS_DATE، والسيرفر ما بيرجّع فيها الصفوف اللي
    // payload‑ها بلا تاريخ. أحدث 5000 منها وصلتنا بالطلب الأول، وأقدم من هيك
    // ما فينا نوصلها بدون `offset` على السيرفر.
    mayMissUndated: true,
  };
}

/* ─────────────────────────── تدقيق نافذة الرؤية ─────────────────────────── */

/**
 * أي أنواع مختارة بتتقصّ لهالحساب قبل ما توصل للنسخة الاحتياطية؟
 * utils/authFetch.js بيفلتر ردّ السيرفر مركزياً، فحساب بلا صلاحية `history`
 * بياخد آخر ٣٠ يوم لفروع POS وشهرين للمرتجعات — وبتطلع نسخة ناقصة بصمت.
 *
 * @param {string[]} types
 * @returns {{ affected: {type:string, section:string, cutoff:string}[],
 *             sections: string[] }}
 */
export function auditVisibilityWindow(types) {
  const affected = [];
  const sections = new Set();
  for (const type of types || []) {
    const rule = windowRuleForType(type);
    if (!rule) continue;
    if (canSeeFullHistory(rule.section)) continue;
    affected.push({ type, section: rule.section, cutoff: cutoffISOForRule(rule) });
    sections.add(rule.section);
  }
  return { affected, sections: [...sections] };
}

/** جملة تحذير جاهزة بالعربي، أو "" إذا ما في نوع متقصوص. */
export function visibilityWarningText(types) {
  const { affected, sections } = auditVisibilityWindow(types);
  if (!affected.length) return "";
  const oldest = affected.map((a) => a.cutoff).sort()[0];
  return (
    `⚠️ ${affected.length} نوع من المختار بينقصّ لحسابك: رح توصلك بس السجلات ` +
    `من ${oldest} وطالع. القصّ بيصير مركزياً حسب صلاحية «history» على ` +
    `${sections.join(" و ")}. لنسخة كاملة لازم حساب مدير أو صلاحية history.`
  );
}
