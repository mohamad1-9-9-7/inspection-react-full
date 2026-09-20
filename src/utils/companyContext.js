// src/utils/companyContext.js
// Which company the platform owner (isSuperAdmin) is currently "inside".
// Regular accounts never touch this — their company is fixed server-side
// by their own token. This is only the super-admin's picked context, read
// by authFetch.js (attaches ?company_id= to scoped calls) and by any screen
// that wants to show which company is active right now.

const KEY = "activeCompany"; // { id, name, industry } | null

export function getActiveCompany() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function setActiveCompany(company) {
  try {
    if (company && company.id != null) {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          id: company.id,
          name: company.name || "",
          industry: company.industry || "meat",
        })
      );
    } else {
      localStorage.removeItem(KEY);
    }
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent("app:active-company-changed", { detail: getActiveCompany() }));
  } catch { /* ignore */ }
}

export function clearActiveCompany() {
  setActiveCompany(null);
}

/** نوع نشاط الشركة الفعّالة الآن:
 *  - سوبر أدمن: من الشركة المختارة (activeCompany).
 *  - حساب عادي: مثبّت من التوكن وقت تسجيل الدخول (currentUser.companyIndustry).
 *  الافتراضي 'meat' حتى لا ينكسر أي حساب قديم لا يحمل القيمة. */
export function getActiveIndustry() {
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (cu.isSuperAdmin) {
      const ac = getActiveCompany();
      return ac?.industry || null; // null = ما اختار شركة بعد
    }
    return cu.companyIndustry || "meat";
  } catch {
    return "meat";
  }
}
