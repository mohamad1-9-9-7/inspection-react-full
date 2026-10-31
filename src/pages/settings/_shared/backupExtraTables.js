// src/pages/settings/_shared/backupExtraTables.js
// 🗄️ جداول قاعدة البيانات اللي مش «تقارير» — كانت برّا كل نسخة احتياطية
// داخل البرنامج (محمية بنسخة Neon بس). هلق بتنزل بمجلد «99 Database Tables»:
//
//   • Products Catalog  — product_catalog (scope default + returns_items)
//   • Accounts          — app_users بلا كلمات سر (السيرفر أصلاً ما بيرجّعها)
//   • Audit Trail       — report_audit (مين أنشأ/عدّل/حذف شو ومتى) ضمن نفس المدة
//
// كل جدول ورقة وحدة فيها فلترة/فرز. الطلبات نفسها اللي بتستعملها شاشات
// الإدارة، فما في أي صلاحية جديدة: حساب بلا صلاحية بياخد ملاحظة بالـREADME.

import API_BASE from "../../../config/api";
import { COLORS, BORDER_BLACK, fillSolid, center, left } from "../excel-exporters/_lib";

const CELL_MAX = 32000; // سقف Excel للخلية 32767 حرف

async function getJson(path, signal) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const asDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : new Date(d.getTime() + 4 * 3600 * 1000); // UAE
};
const clip = (s) => {
  const t = typeof s === "string" ? s : s == null ? "" : JSON.stringify(s);
  return t.length > CELL_MAX ? `${t.slice(0, CELL_MAX)} …[truncated]` : t;
};

/** ورقة جدول بسيطة: عنوان، رؤوس، فلترة، رأس مثبّت. cols: [label, width, numFmt?] */
function sheetTable(wb, name, heading, cols, rows) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 2, showGridLines: false }] });
  ws.columns = cols.map(([, w]) => ({ width: w }));
  ws.mergeCells(1, 1, 1, cols.length);
  const t = ws.getCell(1, 1);
  t.value = heading;
  t.font = { bold: true, size: 12, color: { argb: COLORS.NAVY } };
  t.fill = fillSolid(COLORS.SKY_LIGHT);
  t.alignment = { ...left, indent: 1 };
  ws.getRow(1).height = 24;
  cols.forEach(([label], i) => {
    const c = ws.getCell(2, i + 1);
    c.value = label;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  rows.forEach((vals, ri) => {
    vals.forEach((v, ci) => {
      const c = ws.getCell(ri + 3, ci + 1);
      c.value = v;
      if (cols[ci][2]) c.numFmt = cols[ci][2];
      c.font = { size: 10 };
      c.border = BORDER_BLACK;
      c.alignment = cols[ci][1] >= 30 ? { ...left, wrapText: false } : center;
      if (ri % 2) c.fill = fillSolid(COLORS.GRAY_ALT);
    });
  });
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: rows.length + 2, column: cols.length } };
  return ws;
}

/* ─── المصادر ─── */

export async function fetchProductCatalog(signal) {
  const out = [];
  for (const scope of ["default", "returns_items"]) {
    const j = await getJson(`/api/product-catalog?scope=${scope}&limit=5000`, signal);
    (j?.items || []).forEach((r) => out.push(r));
  }
  return out;
}

export async function fetchAccounts(signal) {
  const j = await getJson(`/api/app-users`, signal);
  return Array.isArray(j?.users) ? j.users : [];
}

/** سجل التعديلات صفحة صفحة (السيرفر بيسقّف 500 بالطلب). */
export async function fetchAuditTrail({ from = "", to = "", signal, onPage, cap = 60000 } = {}) {
  const rows = [];
  let total = null;
  for (let offset = 0; offset < cap; offset += 500) {
    const qs = new URLSearchParams({ limit: "500", offset: String(offset) });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const j = await getJson(`/api/audit?${qs.toString()}`, signal);
    const page = Array.isArray(j?.rows) ? j.rows : [];
    if (total == null) total = Number(j?.total) || 0;
    rows.push(...page);
    onPage?.(rows.length, total);
    if (page.length < 500) break;
  }
  return { rows, total: total ?? rows.length, capped: total != null && rows.length < total };
}

/* ─── الأوراق ─── */

export function addProductsSheet(wb, items) {
  sheetTable(wb, "Products Catalog", `Products catalog — ${items.length} rows (product_catalog)`, [
    ["Scope", 14], ["Code", 14], ["Name", 46], ["Created", 18, "dd/mm/yyyy hh:mm"], ["Updated", 18, "dd/mm/yyyy hh:mm"],
  ], items.map((r) => [r.scope, String(r.code ?? ""), r.name, asDate(r.created_at), asDate(r.updated_at)]));
}

export function addAccountsSheet(wb, users) {
  const list = (v) => (Array.isArray(v) ? v.join(", ") : v && typeof v === "object" ? clip(v) : String(v ?? ""));
  sheetTable(wb, "Accounts", `Accounts — ${users.length} (app_users, no passwords)`, [
    ["ID", 7, "0"], ["Username", 18], ["Display name", 24], ["Active", 8], ["Admin", 8], ["Super admin", 11],
    ["Permissions", 40], ["Allowed branches", 34], ["CRUD perms", 34], ["Employees", 30],
    ["Created", 18, "dd/mm/yyyy hh:mm"], ["Last login", 18, "dd/mm/yyyy hh:mm"],
  ], users.map((u) => [
    u.id, u.username, u.display_name || "", u.is_active ? "Yes" : "No", u.is_admin ? "Yes" : "No",
    u.is_super_admin ? "Yes" : "No", list(u.permissions), list(u.allowed_branches), list(u.crud_perms),
    list(u.employees), asDate(u.created_at), asDate(u.last_login),
  ]));
}

/** أسماء الحقول (أول مستوى) اللي تغيّرت بين النسختين — للقراءة السريعة. */
function changedKeys(oldP, newP) {
  if (!oldP || !newP || typeof oldP !== "object" || typeof newP !== "object") return "";
  const keys = new Set([...Object.keys(oldP), ...Object.keys(newP)]);
  const out = [];
  for (const k of keys) {
    if (JSON.stringify(oldP[k]) !== JSON.stringify(newP[k])) out.push(k);
  }
  return out.join(", ");
}

export function addAuditSheet(wb, rows, label) {
  sheetTable(wb, "Audit Trail", `Audit trail — ${rows.length} entries${label ? ` · ${label}` : ""} (report_audit)`, [
    ["ID", 8, "0"], ["When (UAE)", 18, "dd/mm/yyyy hh:mm"], ["Action", 9], ["User", 16], ["Report type", 26],
    ["Report ID", 10, "0"], ["Changed fields", 34], ["Flags", 20], ["Route", 22], ["IP", 15],
    ["Old payload (JSON)", 50], ["New payload (JSON)", 50],
  ], rows.map((r) => {
    const f = r.flags || {};
    const flags = [f.deleted && "deleted", f.backdated && "backdated", f.offHours && "off-hours", f.bulk && "bulk"]
      .filter(Boolean).join(", ");
    return [
      Number(r.id) || r.id, asDate(r.created_at), r.action, r.username || "", r.report_type || "",
      Number(r.report_id) || r.report_id || "", changedKeys(r.old_payload, r.new_payload), flags,
      r.route || "", r.ip_addr || "", clip(r.old_payload), clip(r.new_payload),
    ];
  }));
}
