// src/pages/workforce/workforceAccess.js
//
// 🗝️ فحص متزامن لدور صاحب الحساب بالقوى العاملة — للحرّاس والأزرار.
//
// ليش ملف لحاله بدل ما نستعمل `useWorkforce()`:
//   ① الحرّاس (canOpenMrp · canOpenButcherPage · SectionRoute) دوالّ متزامنة،
//      ما بتقدر تنتظر طلب شبكة.
//   ② هالملف بينستورد من App.jsx يعني بيدخل بالحزمة الأساسية، فلازم يضل
//      خفيف: ما بيستورد `workforceConfig.js` لأنها بتجرّ معها سجل الموظفين
//      كامل (`EMPLOYEES` من OHCUpload) وهو ضخم.
//
// المصدر: نفس كاش `workforce_config` — الثابتان تحت **مرآة** لما بـ
// `workforceConfig.js`؛ إذا تغيّروا هناك لازم يتغيّروا هون.

import { useEffect, useState } from "react";
import API_BASE from "../../config/api";

/* ⚠️ مرآة لثوابت workforceConfig.js — لا تعدّل واحداً بلا التاني. */
const WF_TYPE = "workforce_config";
const WF_KEY = "config";
const CACHE_KEY = "workforce_config_cache";
const EVT = "workforce_config_changed";

/** الدور اللي بياخد صلاحيات كاملة داخل كرت المخزون. */
export const INVENTORY_ADMIN_ROLE = "inventoryOfficer";

const key = (u) => String(u || "").trim().toLowerCase();

/* ══════════════════════════════════════════════ اللقطة */

let snap = null;        // { byUser: Map, resolved: boolean }
let fetched = false;    // هل جرّبنا نجيبها من السيرفر بهالجلسة
const listeners = new Set();

function currentUsername() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? key(JSON.parse(raw)?.username) : "";
  } catch {
    return "";
  }
}

function buildSnapshot(people) {
  const byUser = new Map();
  for (const p of people || []) {
    const k = key(p?.username);
    if (k) byUser.set(k, p);
  }
  return { byUser, resolved: true };
}

function readCacheSnapshot() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.people)) return null;
    return buildSnapshot(parsed.people);
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

/** اللقطة الحالية — من الذاكرة، فالكاش، وإلا «لسّا ما وصلت». */
function snapshot() {
  if (snap) return snap;
  snap = readCacheSnapshot() || { byUser: new Map(), resolved: false };
  /* كاش فاضي (جهاز جديد، أو فتح رابط داخلي مباشرةً بلا ما يمرق عالرئيسية):
     منشغّل الجلب هون كمان، فحتى الدوالّ المتزامنة بتصير صحيحة بعد أول
     تحديث للصفحة بدل ما يضل الموظف محروم بلا سبب. */
  if (!snap.resolved) refresh();
  return snap;
}

/**
 * تحديث من السيرفر مرّة بالجلسة.
 * الكاش وحده ما بيكفي: أول دخول على جهاز جديد بيكون فاضي، والموظف بينحرم من
 * صلاحياته بلا سبب ظاهر. منجيبها مرّة وبس — الشاشات اللي بدها السجل الكامل
 * عندها `useWorkforce()`.
 */
async function refresh() {
  if (fetched) return;
  fetched = true;
  if (!currentUsername()) return;   // شاشة الدخول: ما في مين نفحص له

  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(WF_TYPE)}&reportDate=${WF_KEY}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return;
    const data = await res.json();
    const arr = (Array.isArray(data) && data) || data?.data || [];
    const payload = arr[0]?.payload || arr[0] || null;
    if (!payload) return;
    snap = buildSnapshot(payload.people);
    notify();
  } catch {
    /* بلا شبكة = منضل على الكاش. الحرمان بيبان بالواجهة، ما منكسر الصفحة. */
  }
}

/* أي حفظ بالقوى العاملة بيبطّل اللقطة — الدور ممكن يكون تغيّر. */
if (typeof window !== "undefined") {
  window.addEventListener(EVT, (e) => {
    if (e?.detail?.people) snap = buildSnapshot(e.detail.people);
    else snap = null;
    notify();
  });
}

/* ══════════════════════════════════════════════ الفحوصات */

/** سجل صاحب الحساب الحالي بالقوى العاملة (أو null). */
export function currentWorkforcePerson() {
  const k = currentUsername();
  if (!k) return null;
  return snapshot().byUser.get(k) || null;
}

/**
 * هل صاحب الحساب «مسؤول مخزون» نشط؟
 *
 * الدور بيعطي صلاحيات كاملة **داخل كرت المخزون وحده**: بيشوف كل الملاحم،
 * بيفتح كل الشاشات، بيعدّل، وبيقبل ويرفض — متل الأدمن بس محصور بالمخزون.
 * برّا المخزون ما إلو أي أثر: صلاحياته هناك بتضل من قسمها الطبيعي.
 */
export function isInventoryOfficer() {
  const p = currentWorkforcePerson();
  return !!p && p.role === INVENTORY_ADMIN_ROLE && p.status === "active";
}

/** هل وصلنا لجواب مؤكّد؟ (لتمييز «ممنوع» عن «لسّا عم نفحص») */
export const workforceResolved = () => snapshot().resolved;

/**
 * نسخة للمكوّنات — بترجّع { officer, resolved } وبتعيد الرسم لما توصل اللقطة.
 * استعملها بالحرّاس اللي بيقدروا يستنّوا؛ الدوالّ المتزامنة فوق للباقي.
 */
export function useInventoryOfficer() {
  const [, bump] = useState(0);

  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    refresh();
    return () => { listeners.delete(fn); };
  }, []);

  return { officer: isInventoryOfficer(), resolved: workforceResolved() };
}
