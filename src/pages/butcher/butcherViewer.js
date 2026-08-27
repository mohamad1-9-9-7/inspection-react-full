// src/pages/butcher/butcherViewer.js
//
// 👁️ «مين عم يتفرّج؟» — سياق واحد بتشترك فيه كل شاشات الجزار.
//
// كانت كل شاشة بتركّب الجواب لحالها (الأدمن؟ مسؤول مخزون؟ مربوط بأي ملاحم؟)،
// وثلاث نسخ من نفس المنطق يعني ثلاث فرص تختلف عن بعضها. هون نسخة وحدة.
//
// بتستعملها:
//   • حجب السجلات المحجورة/الملغاة (`canSeeRow` بـbutcherReportKit).
//   • حصر لوحة المشرف على ملاحمه.
//   • قفل الرقم الوظيفي على صاحب الحساب.

import { useMemo } from "react";
import { getCurrentUser, getPerms } from "../../utils/perms";
import { accountIdentity, useWorkforce } from "../workforce/workforceConfig";
import { useInventoryOfficer } from "../workforce/workforceAccess";

/**
 * @returns {{
 *   wf: object,                سجل القوى العاملة
 *   identity: object|null,     الموظف المربوط بالحساب (أو null)
 *   isAdmin: boolean,
 *   isOfficer: boolean,        مسؤول مخزون — صلاحياته داخل المخزون كاملة
 *   isFull: boolean,           أدمن أو مسؤول مخزون: بيشوف كل شي بلا حصر
 *   siteScope: string[],       ملاحمه هو (فاضية للأدمن/المسؤول = بلا حصر)
 *   canRequestFor(branchCode): هل يقدر يرفع طلب تعديل على ملحمة معيّنة؟
 *   canDecide: boolean,        هل يقدر يبتّ بطلبات التعديل؟
 * }}
 */
export function useRowViewer(isAr = true) {
  const { wf } = useWorkforce();
  const { officer } = useInventoryOfficer();

  const account = useMemo(() => getCurrentUser(), []);
  const isAdmin = useMemo(() => {
    const p = getPerms();
    return !!(p.isAdmin || p.isFullAccess);
  }, []);

  const identity = useMemo(
    () => accountIdentity(wf, account?.username, isAr),
    [wf, account, isAr]
  );

  return useMemo(() => {
    const isFull = isAdmin || officer;
    const siteScope = isFull ? [] : (identity?.sites || []);

    /* الطلب بيرفعه **مشرف الملحمة نفسها** وبس: مشرف البرشا للبرشا.
       الأدمن ومسؤول المخزون ما بيرفعوا طلبات — بيقرّروا مباشرة. */
    const canRequestFor = (branchCode) =>
      !isFull &&
      identity?.role === "supervisor" &&
      (identity.sites || []).includes(String(branchCode || ""));

    return {
      wf, identity, isAdmin, isOfficer: officer, isFull, siteScope,
      canRequestFor,
      canDecide: isFull,
      username: account?.username || "",
      displayName: account?.displayName || account?.username || "",
    };
  }, [wf, identity, isAdmin, officer, account]);
}
