// src/utils/companyContext.js
// Which company the platform owner (isSuperAdmin) is currently "inside".
// Regular accounts never touch this — their company is fixed server-side
// by their own token. This is only the super-admin's picked context, read
// by authFetch.js (attaches ?company_id= to scoped calls) and by any screen
// that wants to show which company is active right now.

const KEY = "activeCompany"; // { id, name } | null

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
      localStorage.setItem(KEY, JSON.stringify({ id: company.id, name: company.name || "" }));
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
