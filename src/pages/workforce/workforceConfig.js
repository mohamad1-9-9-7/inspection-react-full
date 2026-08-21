// src/pages/workforce/workforceConfig.js
//
// 👥 سجل القوى العاملة — الملاحم · المشرفون · الجزارون · قواعد الصلاحيات.
// Workforce registry: sites, supervisors, butchers and the access rules.
//
// ⚠️ وحدة مستقلّة تماماً عن `butcher_config`:
//   نوع السجل هنا = workforce_config  ← لا يلمس إعدادات الجزار الحالية إطلاقاً.
//   الهدف: نبني الآلية الجديدة ونجرّبها بلا ما نخاطر بالنظام الشغّال.
//
// التخزين (مصدر الحقيقة = السيرفر): سجل واحد فقط
//   type = workforce_config ، payload.reportDate = "config"
// نستعمل PUT /api/reports لأنه upsert على (type, reportDate) — فيبقى سجل واحد.
// الـ localStorage كاش فقط لتسريع أول رسم — لا يُعتمد كمخزن مستقل.

import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { INSPECTION_BRANCHES } from "../inspection/inspectionBranches";
import { EMPLOYEES } from "../ohc/OHCUpload";

export const WF_TYPE = "workforce_config";
const WF_KEY = "config";
const CACHE_KEY = "workforce_config_cache"; // cache only — never a standalone store
const EVT = "workforce_config_changed";

/* ══════════════════════════════════════════════ الثوابت */

/** الأدوار — واحد فقط لكل شخص. */
export const ROLES = [
  { id: "butcher",    icon: "🔪",   ar: "جزار",       en: "Butcher" },
  { id: "supervisor", icon: "🧑‍🍳", ar: "مشرف",       en: "Supervisor" },
  { id: "manager",    icon: "🗂️",   ar: "مدير منطقة", en: "Area manager" },
];

/** حالات الموظف. */
export const STATUSES = [
  { id: "active",    ar: "نشط",   en: "Active",    bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  { id: "suspended", ar: "موقوف", en: "Suspended", bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  { id: "left",      ar: "مغادر", en: "Left",      bg: "#f8fafc", fg: "#64748b", bd: "#e2e8f0" },
];

/** فروع الشركة — المصدر الموحّد، لا نكرّر قائمة ثانية. */
export const ALL_BRANCHES = INSPECTION_BRANCHES.map((b) => ({
  code: b.code, ar: b.labelAr, en: b.labelEn, icon: b.icon,
}));

/* ══════════════════════════════════════════════ دليل الموظفين
   نفس السجل اللي بتقرأ منه شاشة تسجيل الجزار (`EMPLOYEES` من OHCUpload).
   ما منبني قائمة موظفين ثانية: الرقم الوظيفي بيتاخد من هون وبس.

   ⚠️ منقرأ **الرقم والاسم فقط**. حقلا الفرع والمسمّى الوظيفي بهالسجل قديمين
   وما بينتحدّثوا مع كل نقل، فعرضهم بيضلّل، وبناء اقتراح ملحمة عليهم بيحطّ
   الموظف بمكان غلط. الملحمة بتنحدّد يدوياً من هون وبس — وهي مصدر الحقيقة. */

/** كل موظفي الشركة كمصفوفة مرتّبة بالرقم — { empNo, name }. */
export const DIRECTORY = Object.entries(EMPLOYEES)
  .map(([empNo, rec]) => ({
    empNo: String(empNo).trim(),
    name: rec?.name || "",
  }))
  .sort((a, b) => Number(a.empNo) - Number(b.empNo) || a.empNo.localeCompare(b.empNo));

const DIR_BY_NO = new Map(DIRECTORY.map((d) => [d.empNo, d]));

/** موظف من الدليل حسب رقمه (أو null). */
export const directoryEntry = (empNo) => DIR_BY_NO.get(String(empNo || "").trim()) || null;

/**
 * بحث بالدليل — بالرقم أو الاسم فقط، وهنّ الحقلان الوحيدان المعروضان.
 * (البحث بحقل غير ظاهر بيرجّع نتائج ما إلها تفسير مرئي.)
 *
 * `taken` = أرقام مسجّلة مسبقاً بالقوى العاملة — بتظهر معلّمة لا محذوفة،
 * حتى يعرف المستخدم إنه لقى الشخص الصحيح بس مضاف من قبل.
 */
export function searchDirectory(query, { taken = new Set(), limit = 40 } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const hit = (d) => !q || d.empNo.includes(q) || d.name.toLowerCase().includes(q);

  const out = [];
  for (const d of DIRECTORY) {
    if (!hit(d)) continue;
    out.push({ ...d, taken: taken.has(d.empNo) });
    if (out.length >= limit) break;
  }
  return out;
}

/* القواعد — كلها قابلة للتبديل من تبويب «القواعد» بلا تعديل كود.
   كلها بتخصّ بوابة الكشك ونموذج البيانات؛ ما في قاعدة بتقيّد مين بيفتح
   الصفحة أو مين بيعدّل عليها — الصفحة مفتوحة للكل. */
export const DEFAULT_RULES = {
  multiSite: false,           // هل يُسمح للجزار بأكثر من ملحمة
  lockUnknownEmp: true,       // رقم وظيفي غير مسجّل = ممنوع الدخول
  autoSiteFromPerson: true,   // الملحمة تُملأ تلقائياً وتُقفل (لا قائمة مفتوحة)
  requirePin: false,          // رقم وظيفي + PIN من ٤ أرقام
  supervisorCanEnter: false,  // هل يقدر المشرف يسجّل تقطيع بنفسه
  blockOnLeft: true,          // "مغادر" = ممنوع نهائياً (لا استثناء)
};

/** الإعدادات الافتراضية — كل القوائم فارغة عمداً، تُبنى من الشاشة. */
export function defaultWorkforce() {
  return {
    sites: [],       // [{ code, ar, en, icon, active, note, custom }]
    people: [],      // انظر newPerson()
    rules: { ...DEFAULT_RULES },
    updatedAt: null,
    updatedBy: "",
  };
}

/** دمج المحفوظ فوق الافتراضي — القوائم يملكها المستخدم بالكامل. */
export function mergeWorkforce(saved) {
  const base = defaultWorkforce();
  if (!saved || typeof saved !== "object") return base;
  return {
    sites:  Array.isArray(saved.sites)  ? saved.sites.map(normalizeSite)    : base.sites,
    people: Array.isArray(saved.people) ? saved.people.map(normalizePerson) : base.people,
    rules:  { ...base.rules, ...(saved.rules || {}) },
    updatedAt: saved.updatedAt || null,
    updatedBy: saved.updatedBy || "",
  };
}

function normalizeSite(s) {
  const ref = ALL_BRANCHES.find((b) => b.code === s?.code);
  return {
    code:   String(s?.code || "").trim(),
    ar:     s?.ar || ref?.ar || s?.code || "",
    en:     s?.en || ref?.en || s?.code || "",
    icon:   s?.icon || ref?.icon || "🥩",
    active: s?.active !== false,
    note:   s?.note || "",
    custom: !ref,
  };
}

function normalizePerson(p) {
  const sites = Array.isArray(p?.sites) ? p.sites.filter(Boolean) : [];
  const site  = String(p?.site || sites[0] || "").trim();
  return {
    id:            String(p?.id || newId()),
    empNo:         String(p?.empNo || "").trim(),
    name:          p?.name || "",
    nameEn:        p?.nameEn || "",
    role:          ROLES.some((r) => r.id === p?.role) ? p.role : "butcher",
    site,
    sites:         sites.length ? sites : (site ? [site] : []),
    supervisorId:  String(p?.supervisorId || ""),
    username:      String(p?.username || "").trim(),
    pin:           String(p?.pin || "").trim(),
    status:        STATUSES.some((s) => s.id === p?.status) ? p.status : "active",
    effectiveFrom: p?.effectiveFrom || "",
    note:          p?.note || "",
    createdAt:     p?.createdAt || null,
    createdBy:     p?.createdBy || "",
    history:       Array.isArray(p?.history) ? p.history : [],
  };
}

/** مُعرّف ثابت لا يتغيّر أبداً — الأرقام الوظيفية تتكرّر وتُكتب غلط، هذا لا. */
export function newId() {
  return `wp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** موظف جديد فارغ. */
export function newPerson(role = "butcher") {
  return {
    id: newId(), empNo: "", name: "", nameEn: "", role,
    site: "", sites: [], supervisorId: "", username: "", pin: "",
    status: "active", effectiveFrom: todayISO(), note: "",
    createdAt: null, createdBy: "", history: [],
  };
}

/* ══════════════════════════════════════════════ الشبكة */

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? mergeWorkforce(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(wf) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(wf)); } catch { /* ignore */ }
}

/** جلب السجل من السيرفر. */
export async function fetchWorkforce() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(WF_TYPE)}&reportDate=${WF_KEY}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const data = await res.json();
  const arr =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    [];
  const wf = mergeWorkforce(arr[0]?.payload);
  writeCache(wf);
  return wf;
}

/** حفظ السجل (upsert على (type, reportDate) — سجل واحد للأبد). */
export async function saveWorkforce(wf, user = "") {
  const payload = {
    ...wf,
    reportDate: WF_KEY,
    updatedAt: new Date().toISOString(),
    updatedBy: user || wf.updatedBy || "",
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "workforce", type: WF_TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  const saved = mergeWorkforce(payload);
  writeCache(saved);
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: saved })); } catch { /* ignore */ }
  return saved;
}

/**
 * سجل القوى العاملة الحيّ.
 * يبدأ من الكاش (أو الافتراضي) ثم يحدّث من السيرفر — فلا تنتظر الشاشة الشبكة.
 * commit() = حفظ فوري لكل إجراء (لا لوحة حفظ مؤجّلة).
 */
export function useWorkforce() {
  const [wf, setWf] = useState(() => readCache() || defaultWorkforce());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchWorkforce()
      .then((w) => { if (alive) setWf(w); })
      .catch((e) => { if (alive) setError(e?.message || "load failed"); })
      .finally(() => { if (alive) setLoading(false); });

    const onChange = (e) => { if (e?.detail) setWf(e.detail); };
    window.addEventListener(EVT, onChange);
    return () => { alive = false; window.removeEventListener(EVT, onChange); };
  }, []);

  const commit = useCallback(async (next, user) => {
    setSaving(true);
    setError("");
    try {
      const saved = await saveWorkforce(next, user);
      setWf(saved);
      return saved;
    } catch (e) {
      setError(e?.message || "save failed");
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  // كائن ثابت المرجع ما دامت القيم هي هي — يمنع إعادة حساب النطاق كل رسمة
  return useMemo(
    () => ({ wf, setWf, commit, loading, saving, error, setError }),
    [wf, commit, loading, saving, error]
  );
}

/* ══════════════════════════════════════════════ مساعدات القراءة */

export const activeSites = (wf) => (wf?.sites || []).filter((s) => s.active !== false);

export const siteByCode = (wf, code) =>
  (wf?.sites || []).find((s) => s.code === code) ||
  ALL_BRANCHES.find((b) => b.code === code) ||
  null;

export const siteLabel = (wf, code, isAr) => {
  const s = siteByCode(wf, code);
  if (!s) return code || "—";
  return (isAr ? s.ar : s.en) || s.ar || s.en || code;
};

export const personById = (wf, id) =>
  (wf?.people || []).find((p) => p.id === id) || null;

export const personByEmpNo = (wf, empNo) => {
  const key = String(empNo || "").trim();
  if (!key) return null;
  return (wf?.people || []).find((p) => String(p.empNo).trim() === key) || null;
};

/** الشخص المرتبط بحساب دخول (بالـ username) — للمشرف والمدير. */
export const personByUsername = (wf, username) => {
  const key = String(username || "").trim().toLowerCase();
  if (!key) return null;
  return (wf?.people || []).find(
    (p) => String(p.username || "").trim().toLowerCase() === key
  ) || null;
};

/** كل الملاحم التي يغطّيها شخص — الجزار ملحمة، المشرف قائمة. */
export function sitesOfPerson(person) {
  if (!person) return [];
  if (person.role === "butcher") return person.site ? [person.site] : [];
  const list = Array.isArray(person.sites) ? person.sites.filter(Boolean) : [];
  return list.length ? list : (person.site ? [person.site] : []);
}

export const peopleOfSite = (wf, code, role) =>
  (wf?.people || []).filter(
    (p) => (!role || p.role === role) && sitesOfPerson(p).includes(code)
  );

export const supervisorsOfSite = (wf, code) => peopleOfSite(wf, code, "supervisor");

export const butchersOfSupervisor = (wf, supervisorId) =>
  (wf?.people || []).filter((p) => p.role === "butcher" && p.supervisorId === supervisorId);

/** اسم للعرض حسب اللغة مع رجوع للّغة الأخرى. */
export const personName = (p, isAr) =>
  (isAr ? p?.name : p?.nameEn) || p?.name || p?.nameEn || p?.empNo || "—";

/* ══════════════════════════════════════════════ التحقّق */

/**
 * تحقّق من موظف قبل الحفظ. يرجّع مصفوفة رسائل ثنائية اللغة (فارغة = سليم).
 * `existingId` يُستثنى من فحص التكرار (حالة التعديل).
 */
export function validatePerson(wf, draft, existingId = "") {
  const errs = [];
  const add = (ar, en) => errs.push({ ar, en });

  const empNo = String(draft.empNo || "").trim();
  if (!empNo) {
    add("اختر الموظف من سجل الموظفين", "Pick the employee from the staff directory");
  } else if (!directoryEntry(empNo) && !existingId) {
    // الإضافة الجديدة لازم تكون من الدليل. التعديل بيتساهل حتى ما نقفل
    // على سجلات قديمة انحفظت برقم يدوي قبل ما نربط الدليل.
    add(
      `الرقم ${empNo} مش موجود بسجل الموظفين — اختر من القائمة`,
      `Employee number ${empNo} is not in the staff directory — pick from the list`
    );
  }

  if (!String(draft.name || "").trim() && !String(draft.nameEn || "").trim()) {
    add("الاسم مطلوب (عربي أو إنجليزي)", "Name is required (Arabic or English)");
  }

  const dup = (wf?.people || []).find(
    (p) => p.id !== existingId && String(p.empNo).trim() === empNo
  );
  if (empNo && dup) {
    add(`الرقم الوظيفي ${empNo} مستعمل مسبقاً`, `Employee number ${empNo} already exists`);
  }

  const sites = sitesOfPerson(draft);
  if (sites.length === 0) add("لازم تختار ملحمة", "A site must be selected");
  if (draft.role === "butcher" && !wf?.rules?.multiSite && sites.length > 1) {
    add("الجزار مربوط بملحمة واحدة حسب القواعد", "Butchers are limited to one site by the rules");
  }

  if (draft.role === "butcher" && !draft.supervisorId) {
    add("لازم تختار المشرف المسؤول", "A responsible supervisor must be selected");
  }
  if (draft.role === "butcher" && draft.supervisorId) {
    const sup = personById(wf, draft.supervisorId);
    if (!sup) add("المشرف المختار غير موجود", "Selected supervisor no longer exists");
    else if (!sitesOfPerson(sup).includes(draft.site)) {
      add("المشرف المختار مش على نفس الملحمة", "The supervisor does not cover this site");
    }
  }

  // اسم المستخدم اختياري عمداً: بتقدر تسجّل ٣ مشرفين للملحمة بثانية وتربطهم
  // بحساباتهم بعدين. غير المربوط بيظهر بشارة تحذير بالشاشة، ما بينرفض.
  const dupUser = String(draft.username || "").trim().toLowerCase();
  if (dupUser) {
    const clash = (wf?.people || []).find(
      (p) => p.id !== existingId && String(p.username || "").trim().toLowerCase() === dupUser
    );
    if (clash) {
      add(`اسم المستخدم ${draft.username} مربوط بموظف آخر`, `Username ${draft.username} is already linked`);
    }
  }

  if (wf?.rules?.requirePin && draft.role === "butcher" && !/^\d{4}$/.test(String(draft.pin || ""))) {
    add("القواعد تطلب PIN من ٤ أرقام", "The rules require a 4-digit PIN");
  }

  return errs;
}

/* ══════════════════════════════════════════════ الإجراءات (كلها نقيّة) */

const stamp = (by, kind, extra = {}) => ({
  at: new Date().toISOString(),
  by: by || "—",
  kind,
  ...extra,
});

/** إضافة/تعديل موظف — يرجّع سجلاً جديداً بلا تعديل الأصل. */
export function upsertPerson(wf, draft, by) {
  const people = [...(wf.people || [])];
  const i = people.findIndex((p) => p.id === draft.id);
  const clean = normalizePerson(draft);

  if (i === -1) {
    people.push({
      ...clean,
      createdAt: new Date().toISOString(),
      createdBy: by || "",
      history: [stamp(by, "created", { to: clean.site })],
    });
  } else {
    const prev = people[i];
    const moved = prev.site !== clean.site;
    people[i] = {
      ...prev,
      ...clean,
      createdAt: prev.createdAt,
      createdBy: prev.createdBy,
      // تغيير الملحمة من شاشة التعديل يُسجَّل كنقل — لا تعديل صامت للموقع
      history: moved
        ? [...prev.history, stamp(by, "transfer", { from: prev.site, to: clean.site, reason: "تعديل مباشر" })]
        : [...prev.history, stamp(by, "edit")],
    };
  }
  return { ...wf, people };
}

/**
 * نقل موظف لملحمة ثانية.
 * ⚠️ لا يلمس السجلات القديمة إطلاقاً — كل سجل تقطيع بيحمل ملحمته وقت التنفيذ،
 * فتقارير التصافي التاريخية بتضل صحيحة بعد النقل.
 */
export function transferPerson(wf, id, toSite, { by, reason, effectiveFrom } = {}) {
  const people = (wf.people || []).map((p) => {
    if (p.id !== id) return p;
    const from = p.site;
    const sites = p.role === "butcher"
      ? [toSite]
      : [...new Set([...(p.sites || []).filter((s) => s !== from), toSite])];
    return {
      ...p,
      site: toSite,
      sites,
      // المشرف السابق ما بيضل مسؤولاً عن جزار انتقل لملحمة ثانية
      supervisorId: p.role === "butcher" ? "" : p.supervisorId,
      effectiveFrom: effectiveFrom || todayISO(),
      status: p.status === "left" ? p.status : "active",
      history: [...p.history, stamp(by, "transfer", { from, to: toSite, reason: reason || "" })],
    };
  });
  return { ...wf, people };
}

/** تغيير حالة موظف (نشط/موقوف/مغادر) مع سبب. */
export function setPersonStatus(wf, id, status, { by, reason } = {}) {
  const people = (wf.people || []).map((p) =>
    p.id === id
      ? {
          ...p,
          status,
          history: [...p.history, stamp(by, "status", { from: p.status, to: status, reason: reason || "" })],
        }
      : p
  );
  return { ...wf, people };
}

/** حذف موظف — للسجلات الجديدة الغلط فقط. الموظف اللي اشتغل يُنقل لـ«مغادر». */
export function removePerson(wf, id) {
  return { ...wf, people: (wf.people || []).filter((p) => p.id !== id) };
}

/** إضافة/تعديل ملحمة. */
export function upsertSite(wf, site) {
  const sites = [...(wf.sites || [])];
  const clean = normalizeSite(site);
  const i = sites.findIndex((s) => s.code === clean.code);
  if (i === -1) sites.push(clean); else sites[i] = { ...sites[i], ...clean };
  return { ...wf, sites };
}

/** حذف ملحمة — الشاشة تمنعها إن كان فيها موظفون. */
export function removeSite(wf, code) {
  return { ...wf, sites: (wf.sites || []).filter((s) => s.code !== code) };
}

/** كل حركات النقل/الحالة عبر كل الموظفين — الأحدث أولاً. */
export function transferLog(wf) {
  const out = [];
  (wf?.people || []).forEach((p) => {
    (p.history || []).forEach((h) => {
      if (h.kind === "transfer" || h.kind === "status") {
        out.push({
          ...h,
          personId: p.id, empNo: p.empNo,
          name: p.name, nameEn: p.nameEn, role: p.role,
        });
      }
    });
  });
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
