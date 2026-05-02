// src/utils/expiryTracker.js
// وحدة موحّدة لفحص تواريخ الانتهاء عبر كل الكيانات (شهادات/رخص/معايرة/...)
// تُستخدم من قِبل: NotificationManager, AdminDashboard widget, /admin/expiry-center

import API_BASE from "../config/api";

/* =================================================================
   عتبات افتراضية (يمكن تجاوزها من إعدادات الأدمن)
   ================================================================= */
export const DEFAULT_THRESHOLDS = {
  expired: 0,         // أصغر أو يساوي → منتهي
  expiringSoon: 30,   // ≤ 30 يوم → ينتهي قريباً جداً
  expiring: 90,       // ≤ 90 يوم → ينتهي قريباً
  // أي شيء أكبر = صالح
};

const STATUS_META = {
  expired:       { key: "expired",       label: "منتهي",          labelEn: "Expired",        color: "#b91c1c", bg: "#fee2e2", rank: 0 },
  expiring_soon: { key: "expiring_soon", label: "ينتهي قريباً جداً", labelEn: "Expiring Soon",  color: "#c2410c", bg: "#ffedd5", rank: 1 },
  expiring:     { key: "expiring",      label: "ينتهي قريباً",    labelEn: "Expiring",       color: "#a16207", bg: "#fef3c7", rank: 2 },
  valid:        { key: "valid",         label: "صالح",            labelEn: "Valid",          color: "#15803d", bg: "#d1fae5", rank: 3 },
  no_date:      { key: "no_date",       label: "بدون تاريخ",       labelEn: "No Expiry",      color: "#6b7280", bg: "#f3f4f6", rank: 4 },
};

/* =================================================================
   تحويل التاريخ + حساب الأيام المتبقية
   (نفس منطق TrainingCertificatesView لتجنّب فروقات التوقيت)
   ================================================================= */
export function parseDateOnly(s) {
  if (!s) return null;
  const str = String(s).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const da = parseInt(m[3], 10);
  return new Date(y, mo, da, 12, 0, 0, 0);
}

export function daysUntil(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function getStatus(dateStr, thresholds = DEFAULT_THRESHOLDS) {
  const days = daysUntil(dateStr);
  if (days === null) return { ...STATUS_META.no_date, days: null };
  if (days < thresholds.expired) return { ...STATUS_META.expired, days };
  if (days <= thresholds.expiringSoon) return { ...STATUS_META.expiring_soon, days };
  if (days <= thresholds.expiring) return { ...STATUS_META.expiring, days };
  return { ...STATUS_META.valid, days };
}

/* إضافة أشهر إلى تاريخ — للحقول التي تستخدم دورة سنوية */
function addMonths(dateStr, months) {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out.toISOString().slice(0, 10);
}

/* =================================================================
   تعريف الكيانات — كل كيان له:
   - type: نوع التقرير على السيرفر
   - category: مجموعة (للفلترة)
   - label/icon: للعرض
   - extract(report): يُرجع مصفوفة عناصر [{id, name, branch, expiryDate, link, extra}]
   - link: رابط للعرض (يُمرَّر له id الصف لاحقاً)
   ================================================================= */
const ENTITY_DEFS = [
  /* ─── شهادات تدريب BFS / PIC / EFST / HACCP ─── */
  {
    type: "training_certificate",
    category: "training",
    icon: "🎓",
    label: "شهادات تدريب",
    labelEn: "Training Certificates",
    link: "/training-certificates/view",
    extract: (rep) => {
      const p = rep?.payload || {};
      // كل تقرير يمثّل شهادة واحدة لموظف
      const name = p.fullName || p.name || p.employeeName || "—";
      const branch = p.branch || p.branchName || "—";
      const course = p.courseType || p.courseName || "Course";
      return [{
        id: rep?.id || rep?._id || `${name}-${course}-${p.expiryDate || ""}`,
        name: `${name} — ${course}`,
        branch,
        expiryDate: p.expiryDate || null,
        extra: { issueDate: p.issueDate, course, employeeId: p.employeeId },
      }];
    },
  },

  /* ─── الشهادة الصحية OHC ─── */
  {
    type: "ohc_certificate",
    category: "health",
    icon: "🩺",
    label: "شهادات صحية (OHC)",
    labelEn: "Occupational Health Certificates",
    link: "/ohc/view",
    extract: (rep) => {
      const p = rep?.payload || {};
      const name = p.fullName || p.name || p.employeeName || "—";
      const branch = p.branch || p.branchName || "—";
      return [{
        id: rep?.id || rep?._id || `ohc-${name}-${p.expiryDate || ""}`,
        name,
        branch,
        expiryDate: p.expiryDate || null,
        extra: { employeeId: p.employeeId || p.id, position: p.position },
      }];
    },
  },

  /* ─── الرخص والعقود (مصفوفات داخل التقرير) ─── */
  {
    type: "licenses_contracts",
    category: "documents",
    icon: "📜",
    label: "رخص وعقود",
    labelEn: "Licenses & Contracts",
    link: "/haccp-iso/licenses-contracts/view",
    extract: (rep) => {
      const p = rep?.payload || {};
      const branch = p.branch || p.branchName || "—";
      const out = [];
      const id = rep?.id || rep?._id || "";
      // licenses array
      if (Array.isArray(p.licenses)) {
        p.licenses.forEach((lic, idx) => {
          if (!lic) return;
          out.push({
            id: `${id}-lic-${idx}`,
            name: lic.name || `License ${idx + 1}`,
            branch,
            expiryDate: lic.expiryDate || null,
            extra: { kind: "license", notes: lic.notes },
          });
        });
      }
      // contracts array
      if (Array.isArray(p.contracts)) {
        p.contracts.forEach((c, idx) => {
          if (!c) return;
          out.push({
            id: `${id}-ct-${idx}`,
            name: `${c.contractType || "Contract"} — ${c.companyName || ""}`.trim(),
            branch,
            expiryDate: c.expiryDate || null,
            extra: { kind: "contract", company: c.companyName },
          });
        });
      }
      return out;
    },
  },

  /* ─── التفتيش البلدي (دورة سنوية) ─── */
  {
    type: "municipality_inspection",
    category: "documents",
    icon: "🏛️",
    label: "تفتيش البلدية",
    labelEn: "Municipality Inspection",
    link: "/haccp-iso/dm-inspection/view",
    extract: (rep) => {
      const p = rep?.payload || {};
      const branch = p.branch || p.branchName || "—";
      // التفتيش البلدي: نفترض دورة 12 شهر من تاريخ التفتيش (قابل للتعديل لاحقاً)
      const nextDue = p.nextInspectionDate || addMonths(p.inspectionDate, 12);
      return [{
        id: rep?.id || rep?._id || `muni-${branch}-${p.inspectionDate || ""}`,
        name: `Municipality — ${branch}`,
        branch,
        expiryDate: nextDue,
        extra: { lastInspection: p.inspectionDate, assumed: !p.nextInspectionDate },
      }];
    },
  },

  /* ─── سجلات معايرة المعدات (لكل فرع) ─── */
  ...["pos10", "pos11", "pos15", "ftr1", "ftr2"].map((b) => ({
    type: `${b}_calibration_log`,
    category: "calibration",
    icon: "🧰",
    label: `معايرة ${b.toUpperCase()}`,
    labelEn: `${b.toUpperCase()} Calibration`,
    link: `/admin/${b}`,
    extract: (rep) => {
      const p = rep?.payload || {};
      const branch = p.branch || b.toUpperCase();
      const out = [];
      const id = rep?.id || rep?._id || "";
      if (Array.isArray(p.entries)) {
        p.entries.forEach((e, idx) => {
          if (!e) return;
          out.push({
            id: `${id}-cal-${idx}`,
            name: e.equipmentName || `Equipment ${idx + 1}`,
            branch,
            expiryDate: e.nextDueDate || null,
            extra: { lastCalibration: e.calibrationDate },
          });
        });
      }
      return out;
    },
  })),

  /* ─── معايرة الزيت FTR1 / FTR2 ─── */
  ...["ftr1", "ftr2"].map((b) => ({
    type: `${b}_oil_calibration`,
    category: "calibration",
    icon: "🛢️",
    label: `معايرة الزيت ${b.toUpperCase()}`,
    labelEn: `${b.toUpperCase()} Oil Calibration`,
    link: `/admin/${b}`,
    extract: (rep) => {
      const p = rep?.payload || {};
      const branch = p.branch || b.toUpperCase();
      const out = [];
      const id = rep?.id || rep?._id || "";
      if (Array.isArray(p.entries)) {
        p.entries.forEach((e, idx) => {
          if (!e) return;
          out.push({
            id: `${id}-oil-${idx}`,
            name: e.equipmentName || e.fryerName || `Fryer ${idx + 1}`,
            branch,
            expiryDate: e.nextDueDate || null,
            extra: { lastCalibration: e.calibrationDate || e.testDate },
          });
        });
      }
      return out;
    },
  })),

  /* ─── تمرين السحب الوهمي (Mock Recall) ─── */
  // ينبّه إذا مرّ 90+ يوم على آخر تمرين (دورة ربعية مطلوبة من ISO 22000)
  {
    type: "mock_recall_drill",
    category: "compliance",
    icon: "🔄",
    label: "تمرين السحب الوهمي",
    labelEn: "Mock Recall Drill",
    link: "/haccp-iso/mock-recall/view",
    extract: (rep) => {
      const p = rep?.payload || {};
      const drillDate = p.drillDate;
      if (!drillDate) return [];
      // التمرين القادم متوقّع بعد 90 يوم من آخر تمرين
      const next = new Date(drillDate);
      if (isNaN(next.getTime())) return [];
      next.setDate(next.getDate() + 90);
      const branch = p?.product?.branch || "—";
      const productName = p?.product?.name || "Drill";
      return [{
        id: rep?.id || rep?._id || `drill-${drillDate}`,
        name: `Next drill due (last: ${productName})`,
        branch,
        expiryDate: next.toISOString().slice(0, 10),
        extra: { lastDrill: drillDate, lastResult: p?.autoKpi?.overallPass },
      }];
    },
  },
];

export const ENTITY_REGISTRY = ENTITY_DEFS;

export function getEntityByType(type) {
  return ENTITY_DEFS.find((e) => e.type === type) || null;
}

/* =================================================================
   جلب من السيرفر (مع fallback آمن)
   ================================================================= */
async function fetchByType(type, signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.items)) return json.items;
    return [];
  } catch {
    return [];
  }
}

/* =================================================================
   كاش بسيط في localStorage (يمنع التحميل المتكرر بين الصفحات)
   ================================================================= */
const CACHE_KEY = "expiry_scan_cache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 دقائق

export function getCachedScan() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedScan(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items }));
  } catch {}
}

export function clearScanCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

/* =================================================================
   الفحص الموحّد
   options:
     - thresholds: تجاوز العتبات الافتراضية
     - enabledTypes: مصفوفة types مسموح بها (إذا حُدّدت)
     - useCache: استخدم الكاش إذا موجود وما زال صالح
     - signal: AbortController signal
   ================================================================= */
export async function scanExpiry({
  thresholds = DEFAULT_THRESHOLDS,
  enabledTypes = null,
  useCache = true,
  signal = undefined,
} = {}) {
  if (useCache) {
    const cached = getCachedScan();
    if (cached) return computeFromRaw(cached.items, thresholds, enabledTypes);
  }

  const defs = enabledTypes
    ? ENTITY_DEFS.filter((d) => enabledTypes.includes(d.type))
    : ENTITY_DEFS;

  // جلب كل الـ types بالتوازي
  const results = await Promise.all(
    defs.map(async (def) => {
      const reports = await fetchByType(def.type, signal);
      const items = [];
      for (const rep of reports) {
        try {
          const list = def.extract(rep) || [];
          for (const it of list) {
            items.push({
              ...it,
              type: def.type,
              category: def.category,
              icon: def.icon,
              entityLabel: def.label,
              entityLabelEn: def.labelEn,
              link: def.link,
              reportId: rep?.id || rep?._id || null,
            });
          }
        } catch {
          // تجاهل تقرير معطوب
        }
      }
      return items;
    })
  );

  const flat = results.flat();
  saveCachedScan(flat);
  return computeFromRaw(flat, thresholds, enabledTypes);
}

function computeFromRaw(rawItems, thresholds, enabledTypes) {
  const filtered = enabledTypes
    ? rawItems.filter((it) => enabledTypes.includes(it.type))
    : rawItems;

  return filtered.map((it) => {
    const status = getStatus(it.expiryDate, thresholds);
    return { ...it, status, daysLeft: status.days };
  });
}

/* =================================================================
   تجميع المخرجات للوحة التحكم
   ================================================================= */
export function summarize(items) {
  const summary = {
    total: items.length,
    expired: 0,
    expiringSoon: 0,
    expiring: 0,
    valid: 0,
    noDate: 0,
    byCategory: {},
    byBranch: {},
  };
  for (const it of items) {
    const k = it.status.key;
    if (k === "expired") summary.expired++;
    else if (k === "expiring_soon") summary.expiringSoon++;
    else if (k === "expiring") summary.expiring++;
    else if (k === "valid") summary.valid++;
    else summary.noDate++;

    const cat = it.category || "other";
    summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;
    const br = it.branch || "—";
    summary.byBranch[br] = (summary.byBranch[br] || 0) + 1;
  }
  return summary;
}

/* =================================================================
   ترتيب: المنتهية أولاً → الأقرب انتهاءً → الباقي
   ================================================================= */
export function sortByUrgency(items) {
  return [...items].sort((a, b) => {
    const ra = a.status?.rank ?? 99;
    const rb = b.status?.rank ?? 99;
    if (ra !== rb) return ra - rb;
    const da = a.daysLeft;
    const db = b.daysLeft;
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

/* =================================================================
   اختيار العناصر "اللي محتاجة تنبيه" حسب العتبة
   ================================================================= */
export function pickAlertable(items, thresholdDays = 30) {
  return items.filter((it) => {
    const k = it.status.key;
    if (k === "expired") return true;
    if (k === "no_date") return false;
    return it.daysLeft !== null && it.daysLeft <= thresholdDays;
  });
}
