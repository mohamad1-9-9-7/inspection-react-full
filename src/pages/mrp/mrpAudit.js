// src/pages/mrp/mrpAudit.js
//
// 🧾 سجل تغييرات التصنيع — كل تعديل على إعدادات الوحدة يُسجَّل تلقائياً.
// MRP change log: every edit to the manufacturing config is captured here.
//
// الفكرة: كل تعديل (صنف · قائمة تقطيع · مسار · منشأ · نوع · فئة · مورّد ·
// عملية) بيمرق من `saveConfig` بملف mrpApi. فبدل ما نرقّع كل صفحة تحرير على
// حدة، منقارن **حالة السيرفر قبل الحفظ** بالحالة بعده ومنستخرج الأحداث:
//   إنشاء · تعديل · تعطيل · إعادة تفعيل · حذف
// وبنخزّنها كسجل واحد لكل عملية حفظ (دفعة أحداث) على السيرفر.
//
// التخزين:  type = mrp_audit_log ، وكل سجل بمفتاح فريد بـ reportDate
// (`log_<ts><rand>`) لأن على السيرفر فهرس فريد على (type, reportDate)،
// والتاريخ الحقيقي بحقل `date`.
//
// ⚠️ السجل يبدأ من AUDIT_START — ما قبله ما في تاريخ (كل شي كان مفعّلاً).

import API_BASE from "../../config/api";

export const AUDIT_TYPE = "mrp_audit_log";

/** أول يوم صار فيه تسجيل — قبله ما في أحداث، وكل العناصر كانت مفعّلة. */
export const AUDIT_START = "2026-08-23";

/* ══════════════ أدوات صغيرة (مستقلّة عن mrpApi لتفادي الاستيراد الدائري) ══════════════ */

const num = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** اسم عنصر للعرض بالسجل — عربي أولاً ثم إنجليزي ثم الكود. */
const label = (x) =>
  (x && (x.ar || x.en || x.name || x.sku || x.code || x.ref || x.id)) || "";

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

/** الحساب اللي عمل التعديل — الاسم الظاهر + اسم الدخول + الدور. */
export function auditActor() {
  const u = currentUser();
  return {
    user: u.username || u.name || "—",
    name: u.displayName || u.name || "",
    role: u.isSuperAdmin ? "super-admin" : u.isAdmin ? "admin" : (u.role || "staff"),
  };
}

/* ══════════════ ما الذي نرصده ══════════════ */

/* مجموعات الإعدادات المرصودة — المفتاح داخل cfg ونوع الحدث الناتج. */
const COLLECTIONS = [
  { key: "items", kind: "item", code: (x) => x.sku || "" },
  { key: "boms", kind: "bom", code: (x) => x.ref || "" },
  { key: "categories", kind: "category", code: () => "" },
  { key: "bomCategories", kind: "bomCategory", code: () => "" },
  { key: "bomOrigins", kind: "bomOrigin", code: () => "" },
  { key: "bomKinds", kind: "bomKind", code: () => "" },
  { key: "suppliers", kind: "supplier", code: (x) => x.code || "" },
  { key: "operations", kind: "operation", code: (x) => x.code || "" },
];

export const KIND_LABELS = {
  item: { ar: "صنف", en: "Item", icon: "📦", color: "#1f6fd0" },
  bom: { ar: "قائمة تقطيع", en: "Cutting BOM", icon: "🔪", color: "#0f766e" },
  pathway: { ar: "مسار توزيع", en: "Routing pathway", icon: "🔀", color: "#6d28d9" },
  category: { ar: "فئة أصناف", en: "Item category", icon: "🏷️", color: "#14507f" },
  bomCategory: { ar: "فئة قوائم", en: "BOM category", icon: "🏷️", color: "#14507f" },
  bomOrigin: { ar: "منشأ", en: "Origin", icon: "🌍", color: "#b45309" },
  bomKind: { ar: "نوع", en: "Type", icon: "🐑", color: "#b45309" },
  supplier: { ar: "مورّد", en: "Supplier", icon: "🚚", color: "#3c5a75" },
  operation: { ar: "عملية تصنيع", en: "Operation", icon: "⚙️", color: "#3c5a75" },
};

export const ACTION_LABELS = {
  created: { ar: "إنشاء", en: "Created", icon: "＋", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  updated: { ar: "تعديل", en: "Updated", icon: "✎", color: "#1f6fd0", bg: "#eff6ff", border: "#bfdbfe" },
  activated: { ar: "إعادة تفعيل", en: "Reactivated", icon: "⏻", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  deactivated: { ar: "تعطيل", en: "Deactivated", icon: "⏸", color: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
  deleted: { ar: "حذف", en: "Deleted", icon: "✕", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};

/* أسماء الحقول بالعربي/الإنجليزي — أي حقل غير مذكور يظهر باسمه الخام. */
export const FIELD_LABELS = {
  ar: { ar: "الاسم (عربي)", en: "Name (AR)" },
  en: { ar: "الاسم (إنجليزي)", en: "Name (EN)" },
  name: { ar: "الاسم", en: "Name" },
  sku: { ar: "كود الصنف", en: "SKU" },
  code: { ar: "الكود", en: "Code" },
  ref: { ar: "رقم القائمة", en: "Reference" },
  uom: { ar: "وحدة القياس", en: "UoM" },
  type: { ar: "الدور", en: "Role" },
  roles: { ar: "الأدوار", en: "Roles" },
  categoryId: { ar: "الفئة", en: "Category" },
  supplierId: { ar: "المورّد", en: "Supplier" },
  originId: { ar: "المنشأ", en: "Origin" },
  kindId: { ar: "النوع", en: "Type" },
  inputId: { ar: "المادة الداخلة", en: "Input item" },
  inputQty: { ar: "كمية الداخل", en: "Input qty" },
  outputs: { ar: "النواتج", en: "Outputs" },
  wastes: { ar: "الهدر", en: "Waste" },
  bomType: { ar: "نوع القائمة", en: "BOM type" },
  multiPathways: { ar: "المسارات المتعددة", en: "Multi-routing" },
  allowSameIO: { ar: "السماح بتطابق الداخل والناتج", en: "Allow same input/output" },
  stdYield: { ar: "النسبة المعيارية", en: "Standard yield" },
  requireRawExpiry: { ar: "تاريخ انتهاء المادة الخام", en: "Raw expiry date" },
  stdTolPct: { ar: "نسبة التسامح ±", en: "Tolerance ±" },
  stdPct: { ar: "النسبة المعيارية ٪", en: "Standard %" },
  cost: { ar: "التكلفة", en: "Cost" },
  price: { ar: "السعر", en: "Price" },
  notes: { ar: "ملاحظات", en: "Notes" },
  barcode: { ar: "الباركود", en: "Barcode" },
  minQty: { ar: "الحد الأدنى", en: "Min qty" },
  qty: { ar: "الكمية", en: "Qty" },
  required: { ar: "إلزامي", en: "Required" },
  any: { ar: "مشترك (Any)", en: "Shared (Any)" },
};

/* حقول لا تُقارَن: داخلية، أو لها رصد خاص (المسارات)، أو ضجيج حفظ. */
const SKIP_FIELDS = new Set([
  "id", "pathways", "pathwaySeq", "updatedAt", "updatedBy",
  "createdAt", "createdBy", "_rid", "savedAt",
]);

/* حقول تشير لعنصر آخر — نحلّها لاسم مقروء وقت التسجيل. */
const REF_FIELDS = {
  inputId: "items", itemId: "items", supplierId: "suppliers",
  originId: "bomOrigins", kindId: "bomKinds", operationId: "operations",
};

/** اسم مرجع (فئة/منشأ/صنف…) وقت التسجيل — منخزّنه نصّاً لأنه ممكن ينحذف بعدين. */
function refName(cfg, kind, field, value) {
  if (value === undefined || value === null || value === "") return "";
  const key = field === "categoryId"
    ? (kind === "bom" ? "bomCategories" : "categories")
    : REF_FIELDS[field];
  if (!key) return String(value);
  const hit = (cfg?.[key] || []).find((x) => x.id === value);
  return hit ? label(hit) : String(value);
}

/** اسم صنف مع كوده — لسطور النواتج والهدر. */
function itemLabel(cfg, itemId) {
  const it = (cfg?.items || []).find((x) => x.id === itemId);
  if (!it) return String(itemId || "—");
  return it.sku ? `[${it.sku}] ${label(it)}` : label(it);
}

/** قيمة جاهزة للتخزين: نص/رقم/منطقي فقط (المصفوفات والكائنات تُلخَّص). */
function plain(v) {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? label(x) : String(x))).join(" · ");
  return label(v) || "…";
}

/** فرق سطور قائمة (نواتج/هدر) — إضافة · حذف · تغيير كمية. */
function lineChanges(prevArr, nextArr, cfg, field) {
  const out = [];
  const pa = new Map((prevArr || []).filter((l) => l?.itemId).map((l) => [l.itemId, l]));
  const na = new Map((nextArr || []).filter((l) => l?.itemId).map((l) => [l.itemId, l]));
  const fmtLine = (l) => {
    const bits = [String(num(l.qty))];
    if (l.any === true) bits.push("Any");
    if (l.required === true) bits.push("★");
    return bits.join(" · ");
  };
  na.forEach((l, id) => {
    const p = pa.get(id);
    if (!p) { out.push({ field, item: itemLabel(cfg, id), from: "", to: fmtLine(l) }); return; }
    if (num(p.qty) !== num(l.qty) || !!p.any !== !!l.any || !!p.required !== !!l.required) {
      out.push({ field, item: itemLabel(cfg, id), from: fmtLine(p), to: fmtLine(l) });
    }
  });
  pa.forEach((l, id) => {
    if (!na.has(id)) out.push({ field, item: itemLabel(cfg, id), from: fmtLine(l), to: "" });
  });
  return out;
}

/** الحقول المتغيّرة بين نسختين من نفس العنصر. */
function fieldChanges(prev, next, cfg, kind) {
  const changes = [];
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  keys.forEach((k) => {
    if (SKIP_FIELDS.has(k) || k === "active") return;      // الحالة لها حدث مستقل
    const a = prev?.[k];
    const b = next?.[k];
    if (k === "outputs" || k === "wastes") {
      changes.push(...lineChanges(a, b, cfg, k));
      return;
    }
    if (JSON.stringify(a ?? "") === JSON.stringify(b ?? "")) return;
    if (REF_FIELDS[k] || k === "categoryId") {
      changes.push({ field: k, from: refName(cfg, kind, k, a), to: refName(cfg, kind, k, b) });
      return;
    }
    changes.push({ field: k, from: plain(a), to: plain(b) });
  });
  return changes;
}

/** بذرة حدث — الهوية والاسم كما هي وقت التسجيل. */
function seed(kind, action, entity, code, parent) {
  return {
    kind,
    action,
    entityId: entity?.id || "",
    code: code || "",
    name: entity?.ar || entity?.name || "",
    nameEn: entity?.en || "",
    parentKind: parent?.kind || "",
    parentId: parent?.id || "",
    parentCode: parent?.code || "",
    changes: [],
  };
}

const byId = (list) => new Map((list || []).filter((x) => x?.id).map((x) => [x.id, x]));

/**
 * مقارنة نسختين من إعدادات التصنيع → مصفوفة أحداث.
 * `prev` أو `next` ناقص ⇒ ما في مقارنة موثوقة، فبنرجّع فاضي بدل ما نغرق
 * السجل بأحداث «إنشاء» وهمية.
 */
export function diffConfigs(prev, next) {
  if (!prev || !next) return [];
  const events = [];

  COLLECTIONS.forEach((col) => {
    const before = byId(prev[col.key]);
    const after = byId(next[col.key]);

    after.forEach((nx, id) => {
      const pv = before.get(id);
      const code = col.code(nx);
      if (!pv) {
        events.push(seed(col.kind, "created", nx, code));
        return;
      }
      const wasOn = pv.active !== false;
      const isOn = nx.active !== false;
      if (wasOn !== isOn) events.push(seed(col.kind, isOn ? "activated" : "deactivated", nx, code));
      const changes = fieldChanges(pv, nx, next, col.kind);
      if (changes.length) events.push({ ...seed(col.kind, "updated", nx, code), changes });
    });

    before.forEach((pv, id) => {
      if (!after.has(id)) events.push(seed(col.kind, "deleted", pv, col.code(pv)));
    });
  });

  /* المسارات مركّبة داخل الوصفات — نقارنها لكل وصفة على حدة */
  const bomsBefore = byId(prev.boms);
  byId(next.boms).forEach((nb, bid) => {
    const pb = bomsBefore.get(bid);
    const parent = { kind: "bom", id: bid, code: nb.ref || "" };
    const before = byId(pb?.pathways);
    const after = byId(nb.pathways);

    after.forEach((np, pid) => {
      const pp = before.get(pid);
      if (!pp) { events.push(seed("pathway", "created", np, np.code, parent)); return; }
      const wasOn = pp.active !== false;
      const isOn = np.active !== false;
      if (wasOn !== isOn) {
        events.push(seed("pathway", isOn ? "activated" : "deactivated", np, np.code, parent));
      }
      const changes = fieldChanges(pp, np, next, "pathway");
      if (changes.length) {
        events.push({ ...seed("pathway", "updated", np, np.code, parent), changes });
      }
    });
    before.forEach((pp, pid) => {
      if (!after.has(pid)) events.push(seed("pathway", "deleted", pp, pp.code, parent));
    });
  });

  return events;
}

/* ══════════════ الكتابة ══════════════ */

const freshKey = () =>
  `log_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * تسجيل دفعة أحداث لعملية حفظ واحدة. بترجّع الدفعة أو null إذا ما في تغيير.
 * أي فشل شبكة بينبلع — السجل مساعد، ما بيوقف الحفظ.
 */
export async function recordConfigChange(prev, next) {
  const events = diffConfigs(prev, next);
  if (!events.length) return null;

  const now = new Date();
  const actor = auditActor();
  const batch = {
    reportDate: freshKey(),               // مفتاح فريد (مش تاريخ) — قيد السيرفر
    date: now.toISOString().slice(0, 10), // اليوم الفعلي
    at: now.toISOString(),
    by: actor.user,
    byName: actor.name,
    byRole: actor.role,
    events: events.map((e) => ({ ...e, at: now.toISOString(), by: actor.user, byName: actor.name })),
  };

  try {
    await fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reporter: actor.user || "mrp", type: AUDIT_TYPE, payload: batch }),
    });
  } catch {
    /* بلا نت ما ينكتب السجل — الحفظ نفسه أهم من سطر السجل */
  }
  return batch;
}

/* ══════════════ القراءة ══════════════ */

const rowsOf = (data) =>
  (Array.isArray(data) && data) ||
  (Array.isArray(data?.data) && data.data) ||
  (Array.isArray(data?.items) && data.items) ||
  (Array.isArray(data?.rows) && data.rows) ||
  [];

/** كل الأحداث مسطّحة ومرتّبة (الأحدث أولاً). */
export async function fetchAuditEvents() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(AUDIT_TYPE)}&limit=5000`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const out = [];
  rowsOf(await res.json()).forEach((r) => {
    const p = r?.payload || {};
    (p.events || []).forEach((e, i) => {
      out.push({
        ...e,
        id: `${p.reportDate || r.id}_${i}`,
        at: e.at || p.at || "",
        day: String(e.at || p.at || p.date || "").slice(0, 10),
        by: e.by || p.by || "—",
        byName: e.byName || p.byName || "",
        byRole: p.byRole || "",
      });
    });
  });
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/**
 * دورات التعطيل/التفعيل — كل دورة سطر واحد:
 *   العنصر · تاريخ التعطيل ومن عطّله · تاريخ إعادة التفعيل ومن فعّله.
 * لسّا معطّل ⇒ خانة التفعيل فاضية. فُعِّل بلا تعطيل مسجّل (أُنشئ معطّلاً مثلاً)
 * ⇒ خانة التعطيل فاضية.
 */
export function lifecycleCycles(events) {
  const groups = new Map();
  [...events]
    .filter((e) => e.action === "activated" || e.action === "deactivated")
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .forEach((e) => {
      const k = `${e.kind}:${e.entityId}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    });

  const rows = [];
  groups.forEach((list, key) => {
    const head = (e) => ({
      key: `${key}_${rows.length}`,
      kind: e.kind,
      entityId: e.entityId,
      code: e.code,
      name: e.name,
      nameEn: e.nameEn,
      parentCode: e.parentCode,
    });
    let open = null;
    list.forEach((e) => {
      if (e.action === "deactivated") {
        // تعطيل فوق تعطيل (ما بيصير عادةً) — منمسك الأول
        if (!open) open = { ...head(e), offAt: e.at, offBy: e.by, offByName: e.byName };
      } else if (open) {
        rows.push({ ...open, onAt: e.at, onBy: e.by, onByName: e.byName });
        open = null;
      } else {
        rows.push({ ...head(e), offAt: "", offBy: "", onAt: e.at, onBy: e.by, onByName: e.byName });
      }
    });
    if (open) rows.push({ ...open, onAt: "", onBy: "", onByName: "" });
  });

  return rows.sort((a, b) =>
    String(b.offAt || b.onAt).localeCompare(String(a.offAt || a.onAt))
  );
}

/** فرق الأيام بين تاريخين ISO (للمدّة بين التعطيل والتفعيل). */
export function daysBetween(fromIso, toIso) {
  const a = new Date(fromIso);
  const b = toIso ? new Date(toIso) : new Date();
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}
