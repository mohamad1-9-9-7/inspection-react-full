// src/pages/workforce/workforceScope.js
//
// 👥 نطاق صفحة القوى العاملة — صفحة عادية مفتوحة، بلا تقييد أدمن.
// Workforce scope: the page is open to anyone who reaches it — no admin gate.
//
// الملف باقٍ كنقطة واحدة تستدعيها كل الشاشات (useWorkforceScope)، فإذا رجعنا
// يوماً بدنا نضيّق النطاق منغيّرو هون بس — ما في شرط صلاحية موزّع على الشاشات.
//
// بوابة الكشك تحت (checkEntry) شي تاني تماماً: بتفحص الرقم الوظيفي وحالة
// الموظف وقت التسجيل — ما إلها علاقة بمين بيفتح هالصفحة.

import { useMemo } from "react";
import { getPerms } from "../../utils/perms";
import {
  personByEmpNo,
  personByUsername,
  sitesOfPerson,
  useWorkforce,
} from "./workforceConfig";


const todayStr = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════ النطاق */

/**
 * حالة الصفحة للمستخدم الحالي — كل الصلاحيات مفتوحة.
 *
 * @returns {{
 *   wf: object, loading: boolean, saving: boolean, error: string,
 *   commit: Function, setWf: Function,
 *   me: object|null,          الشخص المرتبط بحساب الدخول (أو null) — للعرض فقط
 *   role: string,             دور الشخص المرتبط (شارة عرض لا أكثر)
 *   isAdmin: boolean,
 *   seesAll: true, sites: [],
 *   canView/canManage/canTransfer/canRules/canEditSites: true,
 *   canSeeSite(), canSeePerson(), canManagePerson(), canDeletePerson(): true
 * }}
 */
export function useWorkforceScope() {
  const store = useWorkforce();
  const { wf } = store;

  return useMemo(() => {
    const perms = getPerms();
    const isAdmin = !!(perms.isAdmin || perms.isFullAccess);
    const username = perms.user?.username || "";
    const me = personByUsername(wf, username);

    // الدور للعرض فقط (شارة الترويسة) — ما بيمنع ولا إجراء.
    const role = me?.role || (isAdmin ? "admin" : "user");

    return {
      ...store,
      me, role, isAdmin, username,

      /* صفحة مفتوحة: الكل يشوف الكل ويعدّل */
      seesAll: true,
      sites: [],
      canView: true,
      canManage: true,
      canTransfer: true,
      canRules: true,
      canEditSites: true,
      canSetManagerRole: true,
      canDelete: true,
      canDeletePerson: () => true,
      canSeeSite: () => true,
      canSeePerson: () => true,
      canManagePerson: () => true,
    };
  }, [store, wf]);
}

/* ══════════════════════════════════════════════ بوابة الكشك */

/** نتيجة موحّدة لبوابة الدخول. */
const deny = (code, ar, en, extra = {}) => ({ ok: false, code, ar, en, ...extra });

/**
 * البوابة التي ستُركَّب لاحقاً على شاشة تسجيل التقطيع.
 * تُرجّع قراراً واحداً واضحاً — لا منطق موزّع على الشاشة.
 *
 * @param wf         سجل القوى العاملة
 * @param empNo      الرقم الوظيفي المُدخل
 * @param opts.pin   الـ PIN المُدخل (إن كانت القاعدة مفعّلة)
 */
export function checkEntry(wf, empNo, opts = {}) {
  const rules = wf?.rules || {};
  const key = String(empNo || "").trim();

  if (!key) {
    return deny("empty", "أدخل رقمك الوظيفي", "Enter your employee number");
  }

  const person = personByEmpNo(wf, key);

  /* ① بوابة الهوية */
  if (!person) {
    if (rules.lockUnknownEmp) {
      return deny(
        "unknown",
        `الرقم ${key} غير مسجّل في سجل القوى العاملة — راجع مشرفك`,
        `Employee number ${key} is not registered — ask your supervisor`
      );
    }
    return { ok: true, person: null, site: "", warn: "unknown" };
  }

  /* ② بوابة الحالة */
  if (person.status === "left") {
    return deny("left", "هذا الموظف مغادر — الدخول ممنوع", "This employee has left — entry blocked", { person });
  }
  if (person.status === "suspended") {
    return deny("suspended", "حسابك موقوف — راجع المشرف", "Your account is suspended — see your supervisor", { person });
  }

  /* ③ بوابة الدور */
  if (person.role !== "butcher" && !rules.supervisorCanEnter) {
    return deny(
      "role",
      "المشرفون لا يسجّلون تقطيعاً — استعمل لوحة المشرف",
      "Supervisors do not record cuts — use the supervisor board",
      { person }
    );
  }

  /* ④ بوابة الـ PIN */
  if (rules.requirePin && person.role === "butcher") {
    const pin = String(opts.pin || "").trim();
    if (!pin) return deny("pin_required", "أدخل رمزك السرّي (٤ أرقام)", "Enter your 4-digit PIN", { person });
    if (pin !== String(person.pin || "")) {
      return deny("pin_wrong", "الرمز السرّي غير صحيح", "Wrong PIN", { person });
    }
  }

  /* ⑤ بوابة الموقع — أهم بوابة */
  const mySites = sitesOfPerson(person);
  if (mySites.length === 0) {
    return deny(
      "no_site",
      "لست مربوطاً بأي ملحمة — راجع المشرف",
      "You are not assigned to any site — see your supervisor",
      { person }
    );
  }

  /* ⑤ تاريخ سريان النقل */
  if (person.effectiveFrom && person.effectiveFrom > todayStr()) {
    return deny(
      "not_yet",
      `نقلك يبدأ من ${person.effectiveFrom} — لسّا ما بلّش`,
      `Your transfer starts on ${person.effectiveFrom} — not active yet`,
      { person }
    );
  }

  /* الملحمة تأتي من سجل الموظف نفسه — لا قائمة مفتوحة ولا اختيار حرّ */
  return {
    ok: true, person, site: mySites[0], sites: mySites,
    locked: !!rules.autoSiteFromPerson,
  };
}

/**
 * فلترة صفوف تقارير التقطيع حسب النطاق.
 * حالياً النطاق مفتوح (seesAll) فبترجّع الصفوف كما هي؛ الدالة باقية لأنها
 * المكان الوحيد اللي منضيّق منه لو رجعنا بدنا نطاقات لاحقاً.
 */
export function filterRowsByScope(rows, scope) {
  if (!Array.isArray(rows)) return [];
  if (!scope || scope.seesAll) return rows;

  if (scope.role === "butcher") {
    const my = String(scope.me?.empNo || "");
    return rows.filter((r) => String(r.empNo || r.employeeNoRaw || "") === my);
  }

  const sites = scope.sites || [];
  if (sites.length === 0) return [];
  return rows.filter((r) => sites.includes(r.site || r.branchCode || r.branch));
}
