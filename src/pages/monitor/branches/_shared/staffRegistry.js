// src/pages/monitor/branches/_shared/staffRegistry.js
//
// 👥 سجل الموظفين — الرقم الوظيفي · الاسم · أين يظهر تلقائياً.
// Staff registry: employee number, name, and which report forms the person is
// listed on automatically.
//
// Why it exists: the roster used to be a hardcoded `DEFAULT_NAMES` array inside
// PersonalHygieneTab.js, so adding one worker meant a code change and a deploy.
//
// ── Where the people come from ──────────────────────────────────────────────
// Employee numbers are NOT invented here. They come from the company directory
// (`EMPLOYEES` in pages/ohc/OHCUpload.jsx) — the same register the butcher /
// workforce screens read. This module only records WHO is on the QA forms and
// WHERE they appear; it never becomes a second source of employee numbers.
//
// ⚠️ The company record's `branch` and `job` fields are stale — they are not
// updated on every transfer or promotion. `branch` is used only to pre-filter the
// import list, and `job` is copied in as a starting value that stays editable
// here. What this module stores is what the forms actually read.
//
// ── Storage ─────────────────────────────────────────────────────────────────
// One config record on the server, exactly like `workforce_config`:
//   type = staff_directory , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is a cache for first paint only — never a standalone store.

import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import { EMPLOYEES } from "../../../ohc/OHCUpload";

export const STAFF_TYPE = "staff_directory";
const STAFF_KEY = "config";
export const STAFF_CACHE_KEY = "staff_directory_cache_v1";
export const STAFF_EVENT = "staff_directory_changed";

/* ══════════════════════════════════════ أين يظهر الموظف تلقائياً
   Forms an employee can be listed on automatically.

   ⚠️ "Personal Hygiene" is NOT one form — every site keeps its own checklist,
   under its own report type, and a worker belongs to one site's sheet, not to
   all of them. So each site's checklist is its own entry here, carrying the
   real report type it saves under (verified against each input screen).

   `wired` says whether that screen reads this registry yet. QCS is connected;
   the rest are listed so the roster can be prepared now, and wiring one is a
   single `useStaffDirectory(key)` call in its input file. */
export const STAFF_FORMS = [
  // ── Personal hygiene, one per site ──
  { key: "qcs_personal_hygiene",   reportType: "qcs-ph",                   site: "QCS",     siteAr: "القصيص",        en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: true },
  { key: "pos10_personal_hygiene", reportType: "pos10_personal_hygiene",   site: "POS 10",  siteAr: "أبوظبي",        en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "pos11_personal_hygiene", reportType: "pos11_personal_hygiene",   site: "POS 11",  siteAr: "العين",         en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "pos15_personal_hygiene", reportType: "pos15_personal_hygiene",   site: "POS 15",  siteAr: "البرشاء",       en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "pos19_personal_hygiene", reportType: "pos19_personal_hygiene",   site: "POS 19",  siteAr: "موتور سيتي",    en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "ftr1_personal_hygiene",  reportType: "ftr1_personal_hygiene",    site: "FTR 1",   siteAr: "حديقة المشرف",  en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "ftr2_personal_hygiene",  reportType: "ftr2_personal_hygiene",    site: "FTR 2",   siteAr: "الممزر",        en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },
  { key: "prod_personal_hygiene",  reportType: "prod_personal_hygiene",    site: "Production", siteAr: "الإنتاج",    en: "Personal Hygiene", ar: "النظافة الشخصية", autoFills: true,  wired: false },

  // ── QCS people forms (pickers, not row pre-fill) ──
  { key: "qcs_staff_sickness",     reportType: "qcs_staff_sickness",           site: "QCS", siteAr: "القصيص", en: "Staff Sickness", ar: "مرض الموظفين",  autoFills: false, wired: true },
  { key: "qcs_return_to_work",     reportType: "qcs_employee_return_to_work",  site: "QCS", siteAr: "القصيص", en: "Return to Work", ar: "العودة للعمل",  autoFills: false, wired: true },
];

export const STAFF_FORM_KEYS = STAFF_FORMS.map((f) => f.key);
const FORM_BY_KEY = new Map(STAFF_FORMS.map((f) => [f.key, f]));
export const staffForm = (key) => FORM_BY_KEY.get(key) || null;

/** Sites that own at least one form, in registry order. */
export const STAFF_SITES = STAFF_FORMS.reduce((acc, f) => {
  if (!acc.some((s) => s.site === f.site)) acc.push({ site: f.site, siteAr: f.siteAr });
  return acc;
}, []);

/** Forms grouped by site — the shape both the picker and the editor render. */
export function formsBySite() {
  return STAFF_SITES.map(({ site, siteAr }) => ({
    site,
    siteAr,
    forms: STAFF_FORMS.filter((f) => f.site === site),
  }));
}

/** Short label for a chip: "QCS · Personal Hygiene" → "QCS · Hygiene". */
export function formShortLabel(key) {
  const f = FORM_BY_KEY.get(key);
  if (!f) return key;
  const short = f.en.replace("Personal Hygiene", "Hygiene").replace("Return to Work", "Return");
  return `${f.site} · ${short}`;
}

/** No form is assumed — a person appears only where they are explicitly put. */
export const DEFAULT_FORMS = [];

/* ══════════════════════════════════════ Normalisation */

/** Employee numbers compare loosely: "0012", " 12", "EMP-12" → "12". */
export function normalizeEmpNo(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_()/\\.]/g, "")
    .replace(/^emp/, "")
    .replace(/^0+(?=\d)/, "");
}

export function normalizeName(v) {
  return String(v ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Accepts every shape the server, the cache and the old catalog rows produce. */
export function normalizeStaff(raw) {
  if (!raw) return null;
  const empNo = String(raw.empNo ?? raw.code ?? raw.item_code ?? raw.employeeNo ?? "").trim();
  const name = String(raw.name ?? raw.description ?? raw.employeeName ?? "").trim();
  if (!empNo || !name) return null;

  const job = String(raw.job ?? raw.jobTitle ?? raw.position ?? raw.designation ?? "").trim();

  const forms = Array.isArray(raw.forms) ? raw.forms.filter((f) => FORM_BY_KEY.has(f)) : [];
  return {
    empNo,
    name,
    job,
    forms,
    active: raw.active === false ? false : true,
  };
}

const sortStaff = (list) =>
  [...list].sort((a, b) => {
    const na = Number(normalizeEmpNo(a.empNo));
    const nb = Number(normalizeEmpNo(b.empNo));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.empNo).localeCompare(String(b.empNo), undefined, { numeric: true });
  });

/* ══════════════════════════════════════ دليل الشركة (read-only) */

/** All company employees as { empNo, name, job, branch }, sorted by number. */
export const COMPANY_DIRECTORY = Object.entries(EMPLOYEES || {})
  .map(([empNo, rec]) => ({
    empNo: String(empNo).trim(),
    name: String(rec?.name || "").trim(),
    job: String(rec?.job || "").trim(),
    branch: String(rec?.branch || "").trim(),
  }))
  .filter((d) => d.empNo && d.name)
  .sort((a, b) => Number(a.empNo) - Number(b.empNo) || a.empNo.localeCompare(b.empNo));

/** Branch labels present in the company record, with a head count each. */
export function companyBranches() {
  const counts = new Map();
  COMPANY_DIRECTORY.forEach((d) => {
    if (!d.branch) return;
    counts.set(d.branch, (counts.get(d.branch) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([branch, count]) => ({ branch, count }))
    .sort((a, b) => b.count - a.count);
}

/** Job titles present in the company record, with a head count each. */
export function companyJobs(branches = []) {
  const branchSet = branches.length ? new Set(branches) : null;
  const counts = new Map();
  COMPANY_DIRECTORY.forEach((d) => {
    if (!d.job) return;
    if (branchSet && !branchSet.has(d.branch)) return;
    counts.set(d.job, (counts.get(d.job) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([job, count]) => ({ job, count }))
    .sort((a, b) => b.count - a.count || a.job.localeCompare(b.job));
}

/** The company branches that make up the QCS site — the sensible import default. */
export const QCS_COMPANY_BRANCHES = COMPANY_DIRECTORY.map((d) => d.branch)
  .filter((b, i, arr) => b && arr.indexOf(b) === i)
  .filter((b) => /QUASIS/i.test(b));

/**
 * Search the company directory. Every term in the query must match somewhere on
 * the row (number, name, job or branch), so "butcher qusais" narrows instead of
 * widening — that is what makes typing a couple of words feel like a filter.
 */
export function searchCompany(query, { branches = [], jobs = [], exclude = new Set(), limit = 1000 } = {}) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const branchSet = branches.length ? new Set(branches) : null;
  const jobSet = jobs.length ? new Set(jobs) : null;

  const out = [];
  for (const d of COMPANY_DIRECTORY) {
    if (branchSet && !branchSet.has(d.branch)) continue;
    if (jobSet && !jobSet.has(d.job)) continue;
    if (exclude.has(normalizeEmpNo(d.empNo))) continue;
    if (terms.length) {
      const hay = `${d.empNo} ${d.name} ${d.job} ${d.branch}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) continue;
    }
    out.push(d);
    if (out.length >= limit) break;
  }
  return out;
}

/* ══════════════════════════════════════ Cache layer */

export function loadStaffCache() {
  try {
    const raw = localStorage.getItem(STAFF_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeStaff).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveStaffCache(list) {
  const clean = sortStaff((Array.isArray(list) ? list : []).map(normalizeStaff).filter(Boolean));
  try {
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(clean));
  } catch {
    /* quota / private mode — the server copy stays authoritative */
  }
  try {
    window.dispatchEvent(new CustomEvent(STAFF_EVENT));
  } catch {
    /* ignore */
  }
  return clean;
}

/* ══════════════════════════════════════ Server layer */

/** Returns the staff list, or null when the server could not be reached. */
export async function fetchStaff(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(STAFF_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row =
      rows.find((r) => String(r?.payload?.reportDate || "") === STAFF_KEY) || rows[0] || null;
    const list = row?.payload?.staff;
    return sortStaff((Array.isArray(list) ? list : []).map(normalizeStaff).filter(Boolean));
  } catch {
    return null;
  }
}

/** Writes the whole list back. PUT upserts on (type, reportDate) — one row. */
export async function saveStaffList(list, user = "") {
  const staff = sortStaff((Array.isArray(list) ? list : []).map(normalizeStaff).filter(Boolean));
  const payload = {
    reportDate: STAFF_KEY,
    staff,
    updatedAt: new Date().toISOString(),
    updatedBy: user || "",
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "staff-directory", type: STAFF_TYPE, payload }),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  }
  saveStaffCache(staff);
  return staff;
}

/* ══════════════════════════════════════ List operations (pure) */

/** Adds or replaces one person, matching on employee number. */
export function upsertStaff(list, entry) {
  const rec = normalizeStaff(entry);
  if (!rec) throw new Error("Employee number and name are both required");
  const key = normalizeEmpNo(rec.empNo);
  const rest = (list || []).filter((s) => normalizeEmpNo(s.empNo) !== key);
  return sortStaff([...rest, rec]);
}

/** Adds or replaces one person whose number is changing. */
export function renumberStaff(list, oldEmpNo, entry) {
  const oldKey = normalizeEmpNo(oldEmpNo);
  const rec = normalizeStaff(entry);
  if (!rec) throw new Error("Employee number and name are both required");
  const newKey = normalizeEmpNo(rec.empNo);
  const clash = (list || []).some(
    (s) => normalizeEmpNo(s.empNo) === newKey && normalizeEmpNo(s.empNo) !== oldKey
  );
  if (clash) throw new Error(`Employee number "${rec.empNo}" already exists.`);
  const rest = (list || []).filter(
    (s) => normalizeEmpNo(s.empNo) !== oldKey && normalizeEmpNo(s.empNo) !== newKey
  );
  return sortStaff([...rest, rec]);
}

export function removeStaff(list, empNo) {
  const key = normalizeEmpNo(empNo);
  return (list || []).filter((s) => normalizeEmpNo(s.empNo) !== key);
}

/* ══════════════════════════════════════ Lookup helpers (used by the forms) */

export function buildStaffIndex(list) {
  const byNo = new Map();
  const byName = new Map();
  (Array.isArray(list) ? list : []).forEach((s) => {
    const rec = normalizeStaff(s);
    if (!rec) return;
    const kNo = normalizeEmpNo(rec.empNo);
    const kName = normalizeName(rec.name);
    if (kNo && !byNo.has(kNo)) byNo.set(kNo, rec);
    if (kName && !byName.has(kName)) byName.set(kName, rec);
  });
  return { byNo, byName };
}

export function lookupByEmpNo(list, empNo) {
  return buildStaffIndex(list).byNo.get(normalizeEmpNo(empNo)) || null;
}

export function lookupByName(list, name) {
  return buildStaffIndex(list).byName.get(normalizeName(name)) || null;
}

/** The active people a given form should list automatically. */
export function rosterForForm(list, formKey) {
  return (Array.isArray(list) ? list : []).filter(
    (s) => s.active !== false && (s.forms || []).includes(formKey)
  );
}

/* ══════════════════════════════════════ React hook
   Serves the cached list immediately so a form never renders an empty
   dropdown, then replaces it with the server copy. */
export function useStaffDirectory(formKey = "") {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const reload = useCallback(async (signal) => {
    setLoading(true);
    const server = await fetchStaff(signal);
    if (signal?.aborted) return;
    if (Array.isArray(server)) {
      setStaff(server);
      saveStaffCache(server);
      setOnline(true);
    } else {
      setStaff(loadStaffCache());
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    reload(ctrl.signal);
    return () => ctrl.abort();
  }, [reload]);

  // Stay in sync when Settings edits the list in this tab or another one.
  useEffect(() => {
    const onChange = () => setStaff(loadStaffCache());
    window.addEventListener(STAFF_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STAFF_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const index = useMemo(() => buildStaffIndex(staff), [staff]);
  const roster = useMemo(
    () => (formKey ? rosterForForm(staff, formKey) : staff.filter((s) => s.active !== false)),
    [staff, formKey]
  );

  return { staff, roster, loading, online, reload, setStaff, ...index };
}
