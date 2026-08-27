// src/pages/workforce/workforceAccounts.js
//
// 🔗 دليل حسابات الدخول — الجسر بين «مركز إضافة الحسابات» و«القوى العاملة».
// Login-account directory: the bridge between the Accounts Control Center and
// the Workforce registry.
//
// ليش هالملف موجود:
//   الحساب بينعمل بمركز الحسابات (اسم مستخدم + كلمة سر + صلاحيات) وبس.
//   الرقم الوظيفي والملحمة ما بينكتبوا هناك أبداً — بينحدّدوا هون بالقوى
//   العاملة لما نربط الموظف بحسابه. فبيصير:
//     مركز الحسابات = مين بيقدر يسجّل دخول.
//     القوى العاملة  = مين هوّ هالحساب، ورقمه الوظيفي، وبأي ملحمة.
//   ولما الجزار يفتح شاشة تسجيل الأوزان، اسمه ورقمه وملحمته بتطلع لحالها.
//
// المصدر الوحيد: GET /api/app-users (نفس الـendpoint اللي بيقرأ منه
// AccountsManagementTab) — ما منبني قائمة حسابات ثانية ولا منخزّنها كمخزن
// مستقل؛ الكاش تحت للتسريع بس.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config/api";

const CACHE_KEY = "workforce_accounts_cache"; // cache only — never a standalone store
const FRESH_MS = 60_000;                      // بعدها منجدّد بالخلفية

/* ══════════════════════════════════════════════ الشكل الموحّد */

/** صف الحساب كما تستعمله شاشات القوى العاملة. */
function normalizeAccount(u) {
  const username = String(u?.username || "").trim();
  if (!username) return null;
  return {
    id:          u?.id ?? null,
    username,
    displayName: String(u?.display_name || u?.displayName || "").trim() || username,
    isAdmin:     !!(u?.is_admin ?? u?.isAdmin),
    isActive:    (u?.is_active ?? u?.isActive) !== false,
    companyName: u?.company_name || u?.companyName || "",
  };
}

/** المفتاح الموحّد للمقارنة — اسم المستخدم بحروف صغيرة. */
export const accountKey = (username) => String(username || "").trim().toLowerCase();

/* ══════════════════════════════════════════════ الشبكة + الكاش */

let memo = null;        // آخر قائمة نجحت
let memoAt = 0;
let inflight = null;    // طلب واحد فقط بنفس اللحظة مهما كان عدد الشاشات

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalizeAccount).filter(Boolean);
  } catch {
    return null;
  }
}

function writeCache(list) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** جلب كل حسابات الدخول من السيرفر. */
export async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/api/app-users`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("accounts_endpoint_missing");
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "server_error");

  const list = (data.users || [])
    .map(normalizeAccount)
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { numeric: true }));

  memo = list;
  memoAt = Date.now();
  writeCache(list);
  return list;
}

/** نفس الطلب مهما ناداه كم مكوّن بنفس اللحظة. */
function loadOnce(force = false) {
  if (!force && memo && Date.now() - memoAt < FRESH_MS) return Promise.resolve(memo);
  if (inflight) return inflight;
  inflight = fetchAccounts().finally(() => { inflight = null; });
  return inflight;
}

/**
 * حسابات الدخول للشاشة الحالية.
 * بترسم فوراً من الكاش (إن وُجد) وبتجدّد من السيرفر بالخلفية.
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState(() => memo || readCache() || []);
  const [loading, setLoading]   = useState(!memo);
  const [error, setError]       = useState("");

  const reload = useCallback(async (force = true) => {
    setLoading(true);
    try {
      const list = await loadOnce(force);
      setAccounts(list);
      setError("");
    } catch (e) {
      setError(
        e?.message === "accounts_endpoint_missing"
          ? "accounts_endpoint_missing"
          : (e?.message || "network_error")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(false); }, [reload]);

  return { accounts, loading, error, reload };
}

/* ══════════════════════════════════════════════ البحث */

/**
 * بحث بالحسابات — بالاسم الظاهر أو اسم المستخدم.
 *
 * `taken` = أسماء مستخدمين مربوطة أصلاً بموظف آخر بالقوى العاملة. بتظهر
 * معلّمة لا محذوفة، حتى يعرف المستخدم إنه لقى الحساب الصحيح بس مربوط من قبل
 * (نفس سلوك سجل الموظفين بالضبط).
 */
export function searchAccounts(accounts, query, { taken = new Map(), limit = 60 } = {}) {
  const q = accountKey(query);
  const out = [];
  for (const a of accounts || []) {
    if (q && !a.username.toLowerCase().includes(q) && !a.displayName.toLowerCase().includes(q)) {
      continue;
    }
    const holder = taken.get?.(accountKey(a.username)) ?? null;
    out.push({ ...a, taken: !!holder, takenBy: holder });
    if (out.length >= limit) break;
  }
  return out;
}

/** الحساب المطابق لاسم مستخدم (أو null). */
export const accountByUsername = (accounts, username) => {
  const key = accountKey(username);
  if (!key) return null;
  return (accounts || []).find((a) => accountKey(a.username) === key) || null;
};
