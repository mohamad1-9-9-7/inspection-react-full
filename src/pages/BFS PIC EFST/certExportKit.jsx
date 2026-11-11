// D:\inspection-react-full\src\pages\BFS PIC EFST\certExportKit.jsx
//
// Training certificates — shared filter model, multi-select filter control and
// the custom Excel export dialog (choose filters, columns, order, grouping,
// summary sheet, employee × course matrix).

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===================== Course names ===================== */
export const COURSE_LABELS = {
  BFS: "Basic Food Safety (BFS)",
  PIC: "Person In Charge (PIC)",
  EFST: "EFST",
  HACCP: "HACCP",
  HALAL: "Halal Certificate",
  FIRST_AID: "First Aid",
  EMERGENCY: "Emergency",
  ISO22000_AUDIT: "ISO 22000 Internal Audit",
  OTHER: "Other / Custom",
};
const COURSE_ORDER = ["BFS", "PIC", "EFST", "HACCP", "HALAL", "FIRST_AID", "EMERGENCY", "ISO22000_AUDIT", "OTHER"];
export const courseLabel = (c) => COURSE_LABELS[c] || c || "";
function courseCmp(a, b) {
  const ia = COURSE_ORDER.indexOf(a);
  const ib = COURSE_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return String(a).localeCompare(String(b));
}

/* ===================== Filter model ===================== */
export const STATUS_DEFS = [
  { key: "expired", label: "Expired", color: "#b91c1c" },
  { key: "expiring_soon", label: "≤ 30 Days", color: "#c2410c" },
  { key: "expiring", label: "≤ 90 Days", color: "#a16207" },
  { key: "valid", label: "Valid", color: "#15803d" },
  { key: "no_expiry", label: "No Expiry", color: "#6b7280" },
];

export const EMPTY_ADV = {
  branches: [],
  courses: [],
  nationalities: [],
  jobs: [],
  issueFrom: "",
  issueTo: "",
  expiryFrom: "",
  expiryTo: "",
  daysMin: "",
  daysMax: "",
  image: "any", // any | with | without
};

export const EMPTY_FILTERS = {
  search: "",
  statuses: [], // empty = every status
  leftMode: "exclude", // exclude | include | only
  ...EMPTY_ADV,
};

const d10 = (v) => (v ? String(v).slice(0, 10) : "");

export function applyCertFilters(allRows, f) {
  const q = String(f.search || "").trim().toLowerCase();
  const inSet = (arr, v) => !arr || !arr.length || arr.includes(v);
  const dMin = f.daysMin === "" || f.daysMin == null ? null : Number(f.daysMin);
  const dMax = f.daysMax === "" || f.daysMax == null ? null : Number(f.daysMax);

  return allRows.filter((r) => {
    if (f.leftMode === "only" && !r.leftCompany) return false;
    if ((f.leftMode || "exclude") === "exclude" && r.leftCompany) return false;
    if (f.statuses && f.statuses.length && !f.statuses.includes(r.status.key)) return false;
    if (!inSet(f.branches, r.branch)) return false;
    if (!inSet(f.courses, r.courseType)) return false;
    if (!inSet(f.nationalities, r.nationality)) return false;
    if (!inSet(f.jobs, r.job)) return false;

    const iss = d10(r.issueDate);
    const exp = d10(r.expiryDate);
    if (f.issueFrom && (!iss || iss < f.issueFrom)) return false;
    if (f.issueTo && (!iss || iss > f.issueTo)) return false;
    if (f.expiryFrom && (!exp || exp < f.expiryFrom)) return false;
    if (f.expiryTo && (!exp || exp > f.expiryTo)) return false;

    if (dMin !== null && !Number.isNaN(dMin) && (r.status.days === null || r.status.days < dMin)) return false;
    if (dMax !== null && !Number.isNaN(dMax) && (r.status.days === null || r.status.days > dMax)) return false;

    if (f.image === "with" && !r.hasImage) return false;
    if (f.image === "without" && r.hasImage) return false;

    if (q) {
      const hay = [r.employeeNo, r.name, r.branch, r.job, r.courseType, courseLabel(r.courseType), r.nationality]
        .join(" \u0001 ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Human-readable list of the filters in force (for the sheet header + chips). */
export function describeFilters(f) {
  const out = [];
  const list = (arr) => (arr.length > 4 ? `${arr.slice(0, 4).join(", ")} +${arr.length - 4}` : arr.join(", "));
  if (f.search) out.push({ id: "search", text: `Search: "${f.search}"` });
  if (f.statuses?.length)
    out.push({ id: "statuses", text: `Status: ${f.statuses.map((k) => STATUS_DEFS.find((s) => s.key === k)?.label || k).join(", ")}` });
  if (f.leftMode === "only") out.push({ id: "leftMode", text: "Left company only" });
  if (f.leftMode === "include") out.push({ id: "leftMode", text: "Including left company" });
  if (f.branches?.length) out.push({ id: "branches", text: `Branch: ${list(f.branches)}` });
  if (f.courses?.length) out.push({ id: "courses", text: `Course: ${list(f.courses)}` });
  if (f.nationalities?.length) out.push({ id: "nationalities", text: `Nationality: ${list(f.nationalities)}` });
  if (f.jobs?.length) out.push({ id: "jobs", text: `Job: ${list(f.jobs)}` });
  if (f.issueFrom || f.issueTo) out.push({ id: "issue", text: `Issued: ${f.issueFrom || "…"} → ${f.issueTo || "…"}` });
  if (f.expiryFrom || f.expiryTo) out.push({ id: "expiry", text: `Expiry: ${f.expiryFrom || "…"} → ${f.expiryTo || "…"}` });
  if (f.daysMin !== "" || f.daysMax !== "")
    out.push({ id: "days", text: `Days left: ${f.daysMin !== "" ? f.daysMin : "…"} → ${f.daysMax !== "" ? f.daysMax : "…"}` });
  if (f.image === "with") out.push({ id: "image", text: "With certificate image" });
  if (f.image === "without") out.push({ id: "image", text: "Missing certificate image" });
  return out;
}

/** Remove one described filter (chip ×). */
export function clearFilterPart(f, id) {
  switch (id) {
    case "issue":
      return { ...f, issueFrom: "", issueTo: "" };
    case "expiry":
      return { ...f, expiryFrom: "", expiryTo: "" };
    case "days":
      return { ...f, daysMin: "", daysMax: "" };
    case "image":
      return { ...f, image: "any" };
    case "leftMode":
      return { ...f, leftMode: "exclude" };
    case "search":
      return { ...f, search: "" };
    default:
      return { ...f, [id]: [] };
  }
}

/* Quick expiry windows */
const iso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};
export const EXPIRY_PRESETS = [
  { id: "overdue", label: "Overdue", range: () => ({ expiryFrom: "", expiryTo: iso(addDays(new Date(), -1)) }) },
  { id: "n30", label: "Next 30 days", range: () => ({ expiryFrom: iso(new Date()), expiryTo: iso(addDays(new Date(), 30)) }) },
  { id: "n60", label: "Next 60 days", range: () => ({ expiryFrom: iso(new Date()), expiryTo: iso(addDays(new Date(), 60)) }) },
  { id: "n90", label: "Next 90 days", range: () => ({ expiryFrom: iso(new Date()), expiryTo: iso(addDays(new Date(), 90)) }) },
  {
    id: "thisMonth",
    label: "This month",
    range: () => {
      const n = new Date();
      return { expiryFrom: iso(new Date(n.getFullYear(), n.getMonth(), 1)), expiryTo: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
    },
  },
  {
    id: "nextMonth",
    label: "Next month",
    range: () => {
      const n = new Date();
      return { expiryFrom: iso(new Date(n.getFullYear(), n.getMonth() + 1, 1)), expiryTo: iso(new Date(n.getFullYear(), n.getMonth() + 2, 0)) };
    },
  },
  {
    id: "thisYear",
    label: "This year",
    range: () => {
      const y = new Date().getFullYear();
      return { expiryFrom: `${y}-01-01`, expiryTo: `${y}-12-31` };
    },
  },
  {
    id: "nextYear",
    label: "Next year",
    range: () => {
      const y = new Date().getFullYear() + 1;
      return { expiryFrom: `${y}-01-01`, expiryTo: `${y}-12-31` };
    },
  },
];
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ===================== Columns ===================== */
const yesNo = (b) => (b ? "Yes" : "No");
const isUrl = (s) => /^https?:\/\//i.test(String(s || ""));
function validityYears(r) {
  const a = d10(r.issueDate);
  const b = d10(r.expiryDate);
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((ms / (365.25 * 864e5)) * 10) / 10;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const CERT_COLUMNS = [
  { key: "seq", label: "#", width: 6, type: "number", def: true, noSort: true, value: (r, i) => i + 1 },
  { key: "employeeNo", label: "Employee No", width: 14, def: true, emp: true, value: (r) => r.employeeNo },
  { key: "name", label: "Name", width: 30, def: true, emp: true, value: (r) => r.name },
  { key: "nationality", label: "Nationality", width: 16, def: true, emp: true, value: (r) => r.nationality },
  { key: "branch", label: "Branch", width: 22, def: true, emp: true, value: (r) => r.branch },
  { key: "job", label: "Job Title", width: 24, def: true, emp: true, value: (r) => r.job },
  { key: "courseType", label: "Course", width: 12, def: true, value: (r) => r.courseType },
  { key: "courseName", label: "Course Name", width: 28, value: (r) => courseLabel(r.courseType) },
  { key: "issueDate", label: "Issue Date", width: 13, type: "date", def: true, value: (r) => d10(r.issueDate) },
  { key: "expiryDate", label: "Expiry Date", width: 13, type: "date", def: true, value: (r) => d10(r.expiryDate) },
  { key: "expiryMonth", label: "Expiry Month", width: 13, value: (r) => {
      const e = d10(r.expiryDate);
      return e ? `${MONTHS[Number(e.slice(5, 7)) - 1]} ${e.slice(0, 4)}` : "";
    }, sortValue: (r) => d10(r.expiryDate) },
  { key: "validity", label: "Validity (Years)", width: 14, type: "number", value: validityYears },
  { key: "daysLeft", label: "Days Left", width: 11, type: "number", def: true, value: (r) => r.status.days },
  { key: "status", label: "Status", width: 15, type: "status", def: true,
    value: (r) => (r.leftCompany ? "Left Company" : r.status.label),
    sortValue: (r) => (r.leftCompany ? 9 : r.status.sortRank) },
  { key: "leftCompany", label: "Left Company", width: 13, emp: true, value: (r) => yesNo(r.leftCompany) },
  { key: "hasImage", label: "Certificate Attached", width: 18, value: (r) => yesNo(r.hasImage) },
  { key: "imageUrl", label: "Certificate Link", width: 18, type: "link", value: (r) => (isUrl(r.imageData) ? r.imageData : "") },
  { key: "instituteUrl", label: "Institute Certificate Link", width: 22, type: "link", value: (r) => (isUrl(r.instituteImage) ? r.instituteImage : "") },
  { key: "savedAt", label: "Saved At", width: 13, type: "date", value: (r) => d10(r.savedAt) },
];
const COL_BY_KEY = new Map(CERT_COLUMNS.map((c) => [c.key, c]));

function sortValueOf(col, r) {
  if (col.sortValue) return col.sortValue(r);
  const v = col.value(r, 0);
  if (col.type === "number") return v === null || v === "" || v === undefined ? Number.POSITIVE_INFINITY : Number(v);
  return String(v ?? "").toLowerCase();
}
function cmpBy(key, dir) {
  const col = COL_BY_KEY.get(key);
  if (!col) return () => 0;
  const m = dir === "desc" ? -1 : 1;
  return (a, b) => {
    const va = sortValueOf(col, a);
    const vb = sortValueOf(col, b);
    // empty values always last
    const ea = va === "" || va === Number.POSITIVE_INFINITY;
    const eb = vb === "" || vb === Number.POSITIVE_INFINITY;
    if (ea !== eb) return ea ? 1 : -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * m;
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * m;
  };
}
export function sortRows(rows, s1, d1, s2, d2) {
  const c1 = cmpBy(s1, d1);
  const c2 = s2 ? cmpBy(s2, d2) : () => 0;
  return rows.slice().sort((a, b) => c1(a, b) || c2(a, b));
}

/* ===================== Excel builder ===================== */
const ARGB = {
  navy: "FF0F172A",
  white: "FFFFFFFF",
  border: "FFCBD5E1",
  zebra: "FFF8FAFC",
  title: "FF1D4ED8",
  muted: "FF64748B",
  group: "FFDBEAFE",
};
const STATUS_ARGB = {
  expired: { fill: "FFFEE2E2", font: "FFB91C1C" },
  expiring_soon: { fill: "FFFFEDD5", font: "FFC2410C" },
  expiring: { fill: "FFFEF9C3", font: "FFA16207" },
  valid: { fill: "FFDCFCE7", font: "FF15803D" },
  no_expiry: { fill: "FFF3F4F6", font: "FF6B7280" },
  left: { fill: "FFFFE4E6", font: "FF7C2D12" },
  missing: { fill: "FFF1F5F9", font: "FF94A3B8" },
};
const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin = { style: "thin", color: { argb: ARGB.border } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

function toExcelDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}
function sheetName(raw, used) {
  let base = String(raw || "—").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 28) || "Sheet";
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 26)} ${i++}`;
  used.add(name.toLowerCase());
  return name;
}
const statusKeyOf = (r) => (r.leftCompany ? "left" : r.status.key);

/** Writes title block; returns the header row number. */
function writeTitle(ws, ncols, title, filtersText, count, opts) {
  if (!opts.titleBlock) return 1;
  ws.mergeCells(1, 1, 1, Math.max(ncols, 1));
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 15, color: { argb: ARGB.title } };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, Math.max(ncols, 1));
  ws.getCell(2, 1).value = `Generated: ${new Date().toLocaleString("en-GB")}   ·   Records: ${count}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: ARGB.muted } };

  ws.mergeCells(3, 1, 3, Math.max(ncols, 1));
  ws.getCell(3, 1).value = `Filters: ${filtersText || "None (all records)"}`;
  ws.getCell(3, 1).font = { size: 10, italic: true, color: { argb: ARGB.muted } };
  ws.getCell(3, 1).alignment = { wrapText: true, vertical: "top" };
  return 5;
}

function styleHeader(ws, rowNo, ncols) {
  const row = ws.getRow(rowNo);
  row.height = 22;
  for (let c = 1; c <= ncols; c++) {
    const cell = row.getCell(c);
    cell.fill = solid(ARGB.navy);
    cell.font = { bold: true, color: { argb: ARGB.white }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = box;
  }
}

function writeListSheet(ws, rows, cols, opts, meta) {
  const ncols = cols.length;
  const headerRow = writeTitle(ws, ncols, meta.title, meta.filtersText, rows.length, opts);
  ws.columns = cols.map((c) => ({ width: COL_BY_KEY.get(c.key).width || 14 }));

  const hr = ws.getRow(headerRow);
  cols.forEach((c, i) => (hr.getCell(i + 1).value = c.label));
  styleHeader(ws, headerRow, ncols);

  let r = headerRow + 1;
  const groupKey =
    opts.groupBy === "rows_branch" ? (x) => x.branch || "—" : opts.groupBy === "rows_course" ? (x) => courseLabel(x.courseType) || "—" : null;
  let lastGroup = null;
  let seq = 0;

  rows.forEach((row) => {
    if (groupKey) {
      const g = groupKey(row);
      if (g !== lastGroup) {
        const n = rows.filter((x) => groupKey(x) === g).length;
        ws.mergeCells(r, 1, r, ncols);
        const gc = ws.getCell(r, 1);
        gc.value = `${g}  —  ${n} record${n === 1 ? "" : "s"}`;
        gc.font = { bold: true, color: { argb: ARGB.title } };
        gc.fill = solid(ARGB.group);
        gc.border = box;
        lastGroup = g;
        seq = 0;
        r++;
      }
    }
    seq++;
    const xr = ws.getRow(r);
    const zebra = opts.zebra && seq % 2 === 0;
    cols.forEach((c, i) => {
      const def = COL_BY_KEY.get(c.key);
      const cell = xr.getCell(i + 1);
      const v = def.value(row, seq - 1);
      if (def.type === "date") {
        const dt = toExcelDate(v);
        cell.value = dt || (v || "");
        if (dt) cell.numFmt = opts.dateFormat || "dd/mm/yyyy";
        cell.alignment = { horizontal: "center" };
      } else if (def.type === "number") {
        cell.value = v === null || v === undefined || v === "" ? "" : Number(v);
        cell.alignment = { horizontal: "center" };
      } else if (def.type === "link") {
        cell.value = v ? { text: "Open ↗", hyperlink: v } : "";
        if (v) cell.font = { color: { argb: "FF2563EB" }, underline: true };
      } else {
        cell.value = v ?? "";
      }
      cell.border = box;
      if (zebra) cell.fill = solid(ARGB.zebra);

      if (opts.colorStatus && (def.type === "status" || c.key === "daysLeft" || c.key === "expiryDate")) {
        const s = STATUS_ARGB[statusKeyOf(row)];
        if (s && (def.type === "status" || row.status.key !== "valid")) {
          if (def.type === "status") {
            cell.fill = solid(s.fill);
            cell.alignment = { horizontal: "center" };
          }
          cell.font = { bold: true, color: { argb: s.font } };
        }
      }
    });
    r++;
  });

  if (opts.totalsRow) {
    ws.mergeCells(r, 1, r, Math.max(1, Math.min(ncols, 3)));
    const tc = ws.getCell(r, 1);
    tc.value = `Total: ${rows.length}`;
    tc.font = { bold: true };
    tc.fill = solid("FFE2E8F0");
    for (let c = 1; c <= ncols; c++) ws.getCell(r, c).border = box;
  }

  if (opts.freeze) {
    const xSplit = Math.max(0, cols.findIndex((c) => c.key === "name") + 1);
    ws.views = [{ state: "frozen", ySplit: headerRow, xSplit: Math.min(xSplit, 3) }];
  }
  if (opts.autoFilter && !groupKey && rows.length) {
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + rows.length, column: ncols } };
  }
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  ws.headerFooter = { oddFooter: "&LTraining Certificates&RPage &P of &N" };
}

function employeeKey(r) {
  const no = String(r.employeeNo || "").trim().replace(/^0+/, "");
  return no ? `#${no}` : `n:${String(r.name || "").trim().toLowerCase()}`;
}

/** Employee × course grid: latest record wins for employee details, latest expiry per course. */
export function buildMatrix(rows, courseFilter, opts) {
  const courses = (courseFilter && courseFilter.length ? courseFilter.slice() : Array.from(new Set(rows.map((r) => r.courseType).filter(Boolean)))).sort(courseCmp);
  const map = new Map();
  rows.forEach((r) => {
    const k = employeeKey(r);
    const cur = map.get(k) || { info: r, certs: {} };
    if (String(r.savedAt || "") > String(cur.info.savedAt || "")) cur.info = r;
    const prev = cur.certs[r.courseType];
    if (!prev || d10(r.expiryDate || "9999") > d10(prev.expiryDate || "9999")) cur.certs[r.courseType] = r;
    map.set(k, cur);
  });
  const sortKey = opts.sort1 && COL_BY_KEY.get(opts.sort1)?.emp ? opts.sort1 : "name";
  const emps = sortRows(Array.from(map.values()).map((e) => ({ ...e.info, __e: e })), sortKey, opts.dir1, "name", "asc").map((x) => x.__e);
  return { emps, courses };
}

function writeMatrixSheet(ws, rows, cols, opts, meta, courseFilter) {
  const empCols = cols.filter((c) => COL_BY_KEY.get(c.key).emp || c.key === "seq");
  const { emps, courses } = buildMatrix(rows, courseFilter, opts);

  const extra = ["Held", "Expired", "Missing"];
  const ncols = empCols.length + courses.length + extra.length;
  const headerRow = writeTitle(ws, ncols, `${meta.title} — Employee × Course Matrix`, meta.filtersText, emps.length, opts);
  ws.columns = [
    ...empCols.map((c) => ({ width: COL_BY_KEY.get(c.key).width || 14 })),
    ...courses.map(() => ({ width: 15 })),
    ...extra.map(() => ({ width: 10 })),
  ];
  const hr = ws.getRow(headerRow);
  empCols.forEach((c, i) => (hr.getCell(i + 1).value = c.label));
  courses.forEach((c, i) => (hr.getCell(empCols.length + i + 1).value = c));
  extra.forEach((t, i) => (hr.getCell(empCols.length + courses.length + i + 1).value = t));
  styleHeader(ws, headerRow, ncols);

  emps.forEach((e, idx) => {
    const xr = ws.getRow(headerRow + 1 + idx);
    empCols.forEach((c, i) => {
      const cell = xr.getCell(i + 1);
      cell.value = COL_BY_KEY.get(c.key).value(e.info, idx) ?? "";
      cell.border = box;
      if (opts.zebra && idx % 2 === 1) cell.fill = solid(ARGB.zebra);
    });
    let held = 0;
    let expired = 0;
    courses.forEach((course, i) => {
      const cell = xr.getCell(empCols.length + i + 1);
      const cert = e.certs[course];
      cell.border = box;
      cell.alignment = { horizontal: "center" };
      if (!cert) {
        cell.value = "—";
        cell.font = { color: { argb: STATUS_ARGB.missing.font } };
        if (opts.colorStatus) cell.fill = solid(STATUS_ARGB.missing.fill);
        return;
      }
      held++;
      if (cert.status.key === "expired") expired++;
      if (opts.matrixCell === "status") cell.value = cert.status.label;
      else if (opts.matrixCell === "days") cell.value = cert.status.days === null ? "No Expiry" : cert.status.days;
      else {
        const dt = toExcelDate(d10(cert.expiryDate));
        cell.value = dt || "No Expiry";
        if (dt) cell.numFmt = opts.dateFormat || "dd/mm/yyyy";
      }
      if (opts.colorStatus) {
        const s = STATUS_ARGB[cert.status.key];
        cell.fill = solid(s.fill);
        cell.font = { bold: true, color: { argb: s.font } };
      }
    });
    const base = empCols.length + courses.length;
    [held, expired, courses.length - held].forEach((v, i) => {
      const cell = xr.getCell(base + i + 1);
      cell.value = v;
      cell.border = box;
      cell.alignment = { horizontal: "center" };
      if (i === 1 && v > 0) cell.font = { bold: true, color: { argb: STATUS_ARGB.expired.font } };
      if (i === 2 && v > 0) cell.font = { bold: true, color: { argb: STATUS_ARGB.expiring_soon.font } };
    });
  });

  if (opts.freeze) ws.views = [{ state: "frozen", ySplit: headerRow, xSplit: Math.min(empCols.length, 3) }];
  if (opts.autoFilter && emps.length) {
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + emps.length, column: ncols } };
  }
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
}

function writeSummarySheet(ws, rows, meta) {
  const keys = ["expired", "expiring_soon", "expiring", "valid", "no_expiry"];
  const heads = ["Expired", "≤ 30 Days", "≤ 90 Days", "Valid", "No Expiry"];
  ws.columns = [{ width: 32 }, ...keys.map(() => ({ width: 12 })), { width: 12 }, { width: 14 }];
  ws.mergeCells(1, 1, 1, 8);
  ws.getCell(1, 1).value = `${meta.title} — Summary`;
  ws.getCell(1, 1).font = { bold: true, size: 15, color: { argb: ARGB.title } };
  ws.mergeCells(2, 1, 2, 8);
  ws.getCell(2, 1).value = `Generated: ${new Date().toLocaleString("en-GB")}   ·   Filters: ${meta.filtersText || "None"}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: ARGB.muted } };
  ws.getCell(2, 1).alignment = { wrapText: true };

  let r = 4;
  const block = (title, keyFn, labelFn = (x) => x) => {
    const groups = new Map();
    rows.forEach((x) => {
      const g = keyFn(x) || "—";
      const cur = groups.get(g) || Object.fromEntries(keys.map((k) => [k, 0]));
      if (!x.leftCompany) cur[x.status.key] = (cur[x.status.key] || 0) + 1;
      cur.__left = (cur.__left || 0) + (x.leftCompany ? 1 : 0);
      groups.set(g, cur);
    });
    const hr = ws.getRow(r);
    [title, ...heads, "Left", "Compliance %"].forEach((h, i) => (hr.getCell(i + 1).value = h));
    styleHeader(ws, r, 8);
    r++;
    const totals = Object.fromEntries(keys.map((k) => [k, 0]));
    let totLeft = 0;
    Array.from(groups.keys())
      .sort((a, b) => String(a).localeCompare(String(b)))
      .forEach((g) => {
        const v = groups.get(g);
        const xr = ws.getRow(r);
        xr.getCell(1).value = labelFn(g);
        keys.forEach((k, i) => {
          const cell = xr.getCell(i + 2);
          cell.value = v[k] || 0;
          cell.alignment = { horizontal: "center" };
          if (v[k]) {
            cell.fill = solid(STATUS_ARGB[k].fill);
            cell.font = { bold: true, color: { argb: STATUS_ARGB[k].font } };
          }
          totals[k] += v[k] || 0;
        });
        xr.getCell(7).value = v.__left || 0;
        xr.getCell(7).alignment = { horizontal: "center" };
        totLeft += v.__left || 0;
        const active = keys.reduce((s, k) => s + (v[k] || 0), 0);
        const ok = active - (v.expired || 0);
        xr.getCell(8).value = active ? ok / active : "";
        xr.getCell(8).numFmt = "0%";
        xr.getCell(8).alignment = { horizontal: "center" };
        for (let c = 1; c <= 8; c++) xr.getCell(c).border = box;
        r++;
      });
    const tr = ws.getRow(r);
    tr.getCell(1).value = "Total";
    keys.forEach((k, i) => (tr.getCell(i + 2).value = totals[k]));
    tr.getCell(7).value = totLeft;
    const act = keys.reduce((s, k) => s + totals[k], 0);
    tr.getCell(8).value = act ? (act - totals.expired) / act : "";
    tr.getCell(8).numFmt = "0%";
    for (let c = 1; c <= 8; c++) {
      const cell = tr.getCell(c);
      cell.font = { bold: true };
      cell.fill = solid("FFE2E8F0");
      cell.border = box;
      if (c > 1) cell.alignment = { horizontal: "center" };
    }
    r += 3;
  };
  block("Branch", (x) => x.branch);
  block("Course", (x) => x.courseType, courseLabel);
  block("Nationality", (x) => x.nationality);
}

export async function buildCertWorkbook(rows, cols, opts, meta) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Training Certificates Register";
  wb.created = new Date();
  const used = new Set();

  if (opts.summary) writeSummarySheet(wb.addWorksheet(sheetName("Summary", used)), rows, meta);

  if (opts.layout === "matrix") {
    writeMatrixSheet(wb.addWorksheet(sheetName("Matrix", used)), rows, cols, opts, meta, meta.courseFilter);
  } else if (opts.groupBy && opts.groupBy.startsWith("sheet_")) {
    const keyFn =
      opts.groupBy === "sheet_branch"
        ? (x) => x.branch || "—"
        : opts.groupBy === "sheet_course"
        ? (x) => x.courseType || "—"
        : (x) => (x.leftCompany ? "Left Company" : x.status.label);
    const groups = new Map();
    rows.forEach((x) => {
      const g = keyFn(x);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(x);
    });
    if (opts.allSheet) writeListSheet(wb.addWorksheet(sheetName("All", used)), rows, cols, opts, meta);
    Array.from(groups.keys())
      .sort((a, b) => String(a).localeCompare(String(b)))
      .forEach((g) => writeListSheet(wb.addWorksheet(sheetName(g, used)), groups.get(g), cols, opts, { ...meta, title: `${meta.title} — ${g}` }));
  } else {
    writeListSheet(wb.addWorksheet(sheetName("Certificates", used)), rows, cols, opts, meta);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(opts.fileName || "training_certificates").replace(/[\\/:*?"<>|]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ===================== Multi-select control ===================== */
export function MultiSelect({ icon, label, options, value, onChange, counts, inline = false, minWidth = 190 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open || inline) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, inline]);

  const shown = options.filter((o) => !q || String(o).toLowerCase().includes(q.toLowerCase()));
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const summary = !value.length ? "All" : value.length === 1 ? value[0] : `${value.length} selected`;
  const active = value.length > 0;

  const panel = (
    <div
      style={{
        position: inline ? "static" : "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        zIndex: 60,
        minWidth: inline ? undefined : 260,
        maxWidth: inline ? undefined : 360,
        marginTop: inline ? 6 : 0,
        background: "#fff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        boxShadow: inline ? "none" : "0 14px 34px rgba(15,23,42,0.22)",
        padding: 8,
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 6, outline: "none" }}
      />
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button type="button" style={miniBtn} onClick={() => onChange(Array.from(new Set([...value, ...shown])))}>
          Select all{q ? " shown" : ""}
        </button>
        <button type="button" style={miniBtn} onClick={() => onChange(q ? value.filter((v) => !shown.includes(v)) : [])}>
          Clear
        </button>
      </div>
      <div style={{ maxHeight: 230, overflowY: "auto" }}>
        {shown.length === 0 && <div style={{ color: "#94a3b8", padding: 6 }}>No matches</div>}
        {shown.map((o) => (
          <label
            key={o}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 6px",
              borderRadius: 8,
              cursor: "pointer",
              background: value.includes(o) ? "#eff6ff" : "transparent",
              color: "#0f172a",
            }}
          >
            <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} style={{ margin: 0 }} />
            <span style={{ flex: 1 }}>{o}</span>
            {counts && <span style={{ color: "#64748b", fontWeight: 700 }}>{counts[o] || 0}</span>}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: inline ? "block" : "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={value.join(", ")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: inline ? "100%" : undefined,
          minWidth: inline ? undefined : minWidth,
          maxWidth: inline ? undefined : 320,
          padding: "6px 12px",
          borderRadius: inline ? 10 : 999,
          border: active ? "1.5px solid #2563eb" : "1px solid rgba(148,163,184,0.9)",
          background: active ? "linear-gradient(135deg,#eff6ff,#dbeafe)" : "linear-gradient(135deg,#ffffff,#f1f5f9)",
          color: "#0f172a",
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{icon}</span>
        <span style={{ color: "#475569" }}>{label}:</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? "#1d4ed8" : "#0f172a" }}>
          {summary}
        </span>
        <span style={{ color: "#64748b" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && panel}
    </div>
  );
}

const miniBtn = {
  flex: 1,
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

/* ===================== Export dialog ===================== */
const PREFS_KEY = "tc_excel_export_prefs_v1";
const DEFAULT_OPTS = {
  layout: "list", // list | matrix
  groupBy: "none", // none | rows_branch | rows_course | sheet_branch | sheet_course | sheet_status
  allSheet: true,
  summary: true,
  colorStatus: true,
  zebra: true,
  freeze: true,
  autoFilter: true,
  titleBlock: true,
  totalsRow: true,
  sort1: "expiryDate",
  dir1: "asc",
  sort2: "name",
  dir2: "asc",
  matrixCell: "expiry", // expiry | status | days
  dateFormat: "dd/mm/yyyy",
  fileName: "",
};
const defaultCols = () => CERT_COLUMNS.map((c) => ({ key: c.key, on: !!c.def, label: c.label }));

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (!p) return null;
    const known = (p.cols || []).filter((c) => COL_BY_KEY.has(c.key));
    const missing = CERT_COLUMNS.filter((c) => !known.some((k) => k.key === c.key)).map((c) => ({ key: c.key, on: false, label: c.label }));
    return { cols: [...known, ...missing], opts: { ...DEFAULT_OPTS, ...(p.opts || {}), fileName: "" } };
  } catch {
    return null;
  }
}
function savePrefs(cols, opts) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ cols, opts }));
  } catch {
    /* storage unavailable — prefs are only a convenience */
  }
}

const COLUMN_GROUPS = [
  { id: "emp", label: "Employee", keys: ["seq", "employeeNo", "name", "nationality", "branch", "job", "leftCompany"] },
  { id: "cert", label: "Certificate", keys: ["courseType", "courseName", "issueDate", "expiryDate", "expiryMonth", "validity", "daysLeft", "status"] },
  { id: "evid", label: "Evidence & record", keys: ["hasImage", "imageUrl", "instituteUrl", "savedAt"] },
];

const COLUMN_PRESETS = [
  { id: "default", label: "Standard", hint: "Everyday register", keys: CERT_COLUMNS.filter((c) => c.def).map((c) => c.key) },
  { id: "renewal", label: "Renewal list", hint: "Who must renew", keys: ["seq", "employeeNo", "name", "branch", "courseName", "expiryDate", "daysLeft", "status"] },
  { id: "audit", label: "Audit evidence", hint: "Inspector pack", keys: ["seq", "employeeNo", "name", "job", "branch", "courseName", "issueDate", "expiryDate", "status", "hasImage", "imageUrl", "instituteUrl"] },
  { id: "hr", label: "HR roster", hint: "People only", keys: ["seq", "employeeNo", "name", "nationality", "job", "branch", "leftCompany"] },
  { id: "all", label: "Everything", hint: "All 19 columns", keys: CERT_COLUMNS.map((c) => c.key) },
];

const GROUP_CHOICES = [
  { v: "none", t: "Single sheet", d: "All rows in one table" },
  { v: "rows_branch", t: "Grouped by branch", d: "One sheet, a heading per branch" },
  { v: "rows_course", t: "Grouped by course", d: "One sheet, a heading per course" },
  { v: "sheet_branch", t: "Sheet per branch", d: "A tab for every branch" },
  { v: "sheet_course", t: "Sheet per course", d: "A tab for every course" },
  { v: "sheet_status", t: "Sheet per status", d: "Expired, Valid… each on a tab" },
];

const WORKBOOK_TOGGLES = [
  { k: "summary", t: "Summary sheet", d: "Counts by branch, course and nationality with compliance %" },
  { k: "colorStatus", t: "Status colours", d: "Red / orange / yellow / green fills" },
  { k: "titleBlock", t: "Title & filters block", d: "Report title, date and the filters used above the table" },
  { k: "zebra", t: "Striped rows", d: "Alternate row shading" },
  { k: "freeze", t: "Freeze header", d: "Header and name stay visible while scrolling" },
  { k: "autoFilter", t: "Excel filter buttons", d: "Drop-down filters on every header" },
  { k: "totalsRow", t: "Totals row", d: "Record count under the table", listOnly: true },
];

function planSheets(rows, opts) {
  const out = [];
  if (opts.summary) out.push("Summary");
  if (opts.layout === "matrix") return [...out, "Matrix"];
  if (!opts.groupBy.startsWith("sheet_")) return [...out, "Certificates"];
  if (opts.allSheet) out.push("All");
  const keyFn =
    opts.groupBy === "sheet_branch" ? (x) => x.branch || "—" : opts.groupBy === "sheet_course" ? (x) => x.courseType || "—" : (x) => (x.leftCompany ? "Left Company" : x.status.label);
  return [...out, ...Array.from(new Set(rows.map(keyFn))).sort((a, b) => String(a).localeCompare(String(b)))];
}

const STEPS = [
  { id: "records", t: "Records", icon: "⛃" },
  { id: "columns", t: "Columns", icon: "▥" },
  { id: "layout", t: "Layout", icon: "▦" },
  { id: "review", t: "Review", icon: "✓" },
];

export function CertExportModal({ open, onClose, allRows, initialFilters, lists }) {
  const [f, setF] = useState(initialFilters || EMPTY_FILTERS);
  const [cols, setCols] = useState(() => loadPrefs()?.cols || defaultCols());
  const [opts, setOpts] = useState(() => loadPrefs()?.opts || DEFAULT_OPTS);
  const [step, setStep] = useState(0);
  const [dragKey, setDragKey] = useState(null);
  const [colQ, setColQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setF(initialFilters || EMPTY_FILTERS);
      setErr("");
      setStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const filtered = useMemo(() => applyCertFilters(allRows, f), [allRows, f]);
  const sorted = useMemo(() => sortRows(filtered, opts.sort1, opts.dir1, opts.sort2, opts.dir2), [filtered, opts.sort1, opts.dir1, opts.sort2, opts.dir2]);
  const statusCounts = useMemo(() => {
    const o = {};
    applyCertFilters(allRows, { ...f, statuses: [] }).forEach((r) => (o[r.status.key] = (o[r.status.key] || 0) + 1));
    return o;
  }, [allRows, f]);
  const counts = useMemo(() => {
    const mk = (fn) => {
      const o = {};
      allRows.forEach((r) => {
        const k = fn(r);
        if (k) o[k] = (o[k] || 0) + 1;
      });
      return o;
    };
    return { branch: mk((r) => r.branch), course: mk((r) => r.courseType), nat: mk((r) => r.nationality), job: mk((r) => r.job) };
  }, [allRows]);
  const employees = useMemo(() => new Set(filtered.map(employeeKey)).size, [filtered]);
  const matrix = useMemo(() => (open && opts.layout === "matrix" ? buildMatrix(sorted, f.courses, opts) : null), [open, sorted, f.courses, opts]);
  const sheets = useMemo(() => planSheets(sorted, opts), [sorted, opts]);

  if (!open) return null;

  const activeCols = cols.filter((c) => c.on);
  const filterChips = describeFilters(f);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setO = (patch) => setOpts((p) => ({ ...p, ...patch }));
  const toggleStatus = (k) => set({ statuses: f.statuses.includes(k) ? f.statuses.filter((x) => x !== k) : [...f.statuses, k] });
  const usedInMatrix = (key) => key === "seq" || !!COL_BY_KEY.get(key).emp;

  function moveCol(key, delta) {
    setCols((prev) => {
      const on = prev.filter((c) => c.on);
      const off = prev.filter((c) => !c.on);
      const i = on.findIndex((c) => c.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= on.length) return prev;
      [on[i], on[j]] = [on[j], on[i]];
      return [...on, ...off];
    });
  }
  function dropOn(targetKey) {
    if (!dragKey || dragKey === targetKey) return;
    setCols((prev) => {
      const on = prev.filter((c) => c.on);
      const off = prev.filter((c) => !c.on);
      const from = on.findIndex((c) => c.key === dragKey);
      const to = on.findIndex((c) => c.key === targetKey);
      if (from < 0 || to < 0) return prev;
      const [m] = on.splice(from, 1);
      on.splice(to, 0, m);
      return [...on, ...off];
    });
    setDragKey(null);
  }
  const addCol = (key) =>
    setCols((prev) => {
      const on = prev.filter((c) => c.on);
      const off = prev.filter((c) => !c.on);
      const item = off.find((c) => c.key === key);
      return item ? [...on, { ...item, on: true }, ...off.filter((c) => c.key !== key)] : prev;
    });
  const removeCol = (key) => setCols((prev) => [...prev.filter((c) => c.on && c.key !== key), ...prev.filter((c) => !c.on || c.key === key).map((c) => (c.key === key ? { ...c, on: false } : c))]);
  function applyPreset(p) {
    setCols((prev) => {
      const byKey = new Map(prev.map((c) => [c.key, c]));
      return [...p.keys.map((k) => ({ ...byKey.get(k), on: true })), ...prev.filter((c) => !p.keys.includes(c.key)).map((c) => ({ ...c, on: false }))];
    });
  }
  const presetActive = (p) => activeCols.length === p.keys.length && activeCols.every((c, i) => c.key === p.keys[i]);

  async function doExport() {
    if (!activeCols.length) {
      setErr("Choose at least one column.");
      setStep(1);
      return;
    }
    if (!sorted.length) {
      setErr("No certificates match these filters.");
      setStep(0);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      savePrefs(cols, opts);
      const ts = new Date().toISOString().slice(0, 10);
      await buildCertWorkbook(
        sorted,
        activeCols,
        { ...opts, fileName: opts.fileName || `training_certificates_${opts.layout === "matrix" ? "matrix_" : ""}${ts}` },
        { title: "Training Certificates Register", filtersText: filterChips.map((c) => c.text).join("  ·  "), courseFilter: f.courses }
      );
      onClose();
    } catch (e) {
      console.error("Excel export failed:", e);
      setErr(`Export failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  const stepSub = [
    `${sorted.length} certificate${sorted.length === 1 ? "" : "s"}${filterChips.length ? ` · ${filterChips.length} filter${filterChips.length === 1 ? "" : "s"}` : ""}`,
    `${activeCols.length} column${activeCols.length === 1 ? "" : "s"}`,
    opts.layout === "matrix" ? "Training matrix" : GROUP_CHOICES.find((g) => g.v === opts.groupBy)?.t || "List",
    `${sheets.length} sheet${sheets.length === 1 ? "" : "s"}`,
  ];
  const defaultName = `training_certificates_${opts.layout === "matrix" ? "matrix_" : ""}${new Date().toISOString().slice(0, 10)}`;
  const isLast = step === STEPS.length - 1;
  const cantExport = busy || !sorted.length || !activeCols.length;

  /* ---------- step bodies ---------- */
  const recordsStep = (
    <>
      <StepHead title="Which certificates?" desc="Start from the page filters or build your own selection. Counts update live." />
      <div className="tcx-card">
        <div className="tcx-card-t">
          Search
          <span className="tcx-sp" />
          <button type="button" className="tcx-link" onClick={() => setF(initialFilters || EMPTY_FILTERS)}>
            ↺ Use page filters
          </button>
          <button type="button" className="tcx-link" onClick={() => setF(EMPTY_FILTERS)}>
            Clear all
          </button>
        </div>
        <input className="tcx-input" value={f.search} onChange={(e) => set({ search: e.target.value })} placeholder="Name, employee no., job, course…" />
      </div>

      <div className="tcx-card">
        <div className="tcx-card-t">
          Status
          <span className="tcx-hint">{f.statuses.length ? `${f.statuses.length} selected` : "All statuses"}</span>
        </div>
        <div className="tcx-status">
          {STATUS_DEFS.map((s) => {
            const on = f.statuses.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={`tcx-stile${on ? " on" : ""}`}
                onClick={() => toggleStatus(s.key)}
                style={{ borderLeftColor: s.color, background: on ? `${s.color}14` : undefined, outlineColor: s.color }}
              >
                <span className="tcx-stile-n" style={{ color: s.color }}>
                  {statusCounts[s.key] || 0}
                </span>
                <span className="tcx-stile-l">{s.label}</span>
                {on && (
                  <span className="tcx-tick" style={{ background: s.color }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="tcx-row" style={{ marginTop: 12 }}>
          <span className="tcx-lbl">Staff</span>
          <Seg
            value={f.leftMode}
            onChange={(v) => set({ leftMode: v })}
            items={[
              ["exclude", "Active only"],
              ["include", "Active + left"],
              ["only", "Left company"],
            ]}
          />
        </div>
      </div>

      <div className="tcx-card">
        <div className="tcx-card-t">Organisation</div>
        <div className="tcx-grid2">
          <MultiSelect inline icon="🏢" label="Branches" options={lists.branches} value={f.branches} onChange={(v) => set({ branches: v })} counts={counts.branch} />
          <MultiSelect inline icon="🎓" label="Courses" options={lists.courses} value={f.courses} onChange={(v) => set({ courses: v })} counts={counts.course} />
          <MultiSelect inline icon="🌍" label="Nationalities" options={lists.nationalities} value={f.nationalities} onChange={(v) => set({ nationalities: v })} counts={counts.nat} />
          <MultiSelect inline icon="💼" label="Job titles" options={lists.jobs} value={f.jobs} onChange={(v) => set({ jobs: v })} counts={counts.job} />
        </div>
      </div>

      <div className="tcx-card">
        <div className="tcx-card-t">Dates & evidence</div>
        <div className="tcx-lbl">Expiry date</div>
        <div className="tcx-chips">
          {EXPIRY_PRESETS.map((p) => {
            const r = p.range();
            const on = r.expiryFrom === f.expiryFrom && r.expiryTo === f.expiryTo;
            return (
              <button key={p.id} type="button" className={`tcx-chip${on ? " on" : ""}`} onClick={() => set(on ? { expiryFrom: "", expiryTo: "" } : r)}>
                {p.label}
              </button>
            );
          })}
        </div>
        <Range a={f.expiryFrom} b={f.expiryTo} onA={(v) => set({ expiryFrom: v })} onB={(v) => set({ expiryTo: v })} type="date" />
        <div className="tcx-grid2" style={{ marginTop: 14 }}>
          <div>
            <div className="tcx-lbl">Issue date</div>
            <Range a={f.issueFrom} b={f.issueTo} onA={(v) => set({ issueFrom: v })} onB={(v) => set({ issueTo: v })} type="date" />
          </div>
          <div>
            <div className="tcx-lbl">Days left</div>
            <Range a={f.daysMin} b={f.daysMax} onA={(v) => set({ daysMin: v })} onB={(v) => set({ daysMax: v })} type="number" />
          </div>
        </div>
        <div className="tcx-row" style={{ marginTop: 14 }}>
          <span className="tcx-lbl">Certificate image</span>
          <Seg
            value={f.image}
            onChange={(v) => set({ image: v })}
            items={[
              ["any", "Any"],
              ["with", "Attached"],
              ["without", "Missing"],
            ]}
          />
        </div>
      </div>
    </>
  );

  const offCols = cols.filter((c) => !c.on && (!colQ || c.label.toLowerCase().includes(colQ.toLowerCase())));
  const columnsStep = (
    <>
      <StepHead title="Which columns, in what order?" desc="Pick a preset or build your own. Drag to reorder, click a header name to rename it in the file." />
      <div className="tcx-presets">
        {COLUMN_PRESETS.map((p) => (
          <button key={p.id} type="button" className={`tcx-preset${presetActive(p) ? " on" : ""}`} onClick={() => applyPreset(p)}>
            <b>{p.label}</b>
            <span>
              {p.hint} · {p.keys.length}
            </span>
          </button>
        ))}
      </div>
      <div className="tcx-dual">
        <div className="tcx-pane">
          <div className="tcx-pane-h">
            Available <span className="tcx-badge">{cols.length - activeCols.length}</span>
            <span className="tcx-sp" />
            <button type="button" className="tcx-link" onClick={() => setCols((p) => p.map((c) => ({ ...c, on: true })))}>
              Add all
            </button>
          </div>
          <div style={{ padding: "8px 10px 4px" }}>
            <input className="tcx-input sm" value={colQ} onChange={(e) => setColQ(e.target.value)} placeholder="Find a column…" />
          </div>
          <div className="tcx-list">
            {COLUMN_GROUPS.map((g) => {
              const items = offCols.filter((c) => g.keys.includes(c.key));
              if (!items.length) return null;
              return (
                <div key={g.id}>
                  <div className="tcx-grp">{g.label}</div>
                  {items.map((c) => (
                    <button key={c.key} type="button" className="tcx-item add" onClick={() => addCol(c.key)}>
                      <span className="tcx-plus">+</span>
                      <span className="tcx-grow">{c.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {!offCols.length && <div className="tcx-empty">{colQ ? "No match" : "Every column is in the file"}</div>}
          </div>
        </div>

        <div className="tcx-pane">
          <div className="tcx-pane-h">
            In the file <span className="tcx-badge blue">{activeCols.length}</span>
            <span className="tcx-sp" />
            <button type="button" className="tcx-link" onClick={() => setCols(defaultCols())}>
              Reset
            </button>
            <button type="button" className="tcx-link" onClick={() => setCols((p) => p.map((c) => ({ ...c, on: false })))}>
              Remove all
            </button>
          </div>
          <div className="tcx-list">
            {activeCols.map((c, i) => {
              const warn = opts.layout === "matrix" && !usedInMatrix(c.key);
              return (
                <div
                  key={c.key}
                  className={`tcx-item sel${dragKey === c.key ? " drag" : ""}${warn ? " warn" : ""}`}
                  draggable
                  onDragStart={() => setDragKey(c.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(c.key)}
                  onDragEnd={() => setDragKey(null)}
                  title={warn ? "Not used in the training-matrix layout" : COL_BY_KEY.get(c.key).label}
                >
                  <span className="tcx-grip">⠿</span>
                  <span className="tcx-ord">{i + 1}</span>
                  <input className="tcx-rename" value={c.label} onChange={(e) => setCols((p) => p.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))} />
                  <button type="button" className="tcx-ic" disabled={i === 0} onClick={() => moveCol(c.key, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" className="tcx-ic" disabled={i === activeCols.length - 1} onClick={() => moveCol(c.key, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" className="tcx-ic del" onClick={() => removeCol(c.key)} aria-label="Remove">
                    ×
                  </button>
                </div>
              );
            })}
            {!activeCols.length && <div className="tcx-empty">Add columns from the left</div>}
          </div>
        </div>
      </div>
      {opts.layout === "matrix" && <div className="tcx-note">Training matrix uses only the employee columns (No, Name, Branch, Job…); highlighted ones are skipped there.</div>}
    </>
  );

  const layoutStep = (
    <>
      <StepHead title="How should the workbook look?" desc="Choose the table shape, grouping, sort order and finishing touches." />
      <div className="tcx-layouts">
        <button type="button" className={`tcx-lcard${opts.layout === "list" ? " on" : ""}`} onClick={() => setO({ layout: "list" })}>
          <span className="tcx-ill list" />
          <span>
            <b>Certificate list</b>
            <small>One row per certificate — the classic register</small>
          </span>
        </button>
        <button type="button" className={`tcx-lcard${opts.layout === "matrix" ? " on" : ""}`} onClick={() => setO({ layout: "matrix" })}>
          <span className="tcx-ill matrix" />
          <span>
            <b>Training matrix</b>
            <small>One row per employee, one column per course</small>
          </span>
        </button>
      </div>

      {opts.layout === "list" ? (
        <div className="tcx-card">
          <div className="tcx-card-t">Organise rows</div>
          <div className="tcx-radios">
            {GROUP_CHOICES.map((g) => (
              <button key={g.v} type="button" className={`tcx-radio${opts.groupBy === g.v ? " on" : ""}`} onClick={() => setO({ groupBy: g.v })}>
                <span className="tcx-dot" />
                <span>
                  <b>{g.t}</b>
                  <small>{g.d}</small>
                </span>
              </button>
            ))}
          </div>
          {opts.groupBy.startsWith("sheet_") && <Toggle t='Also add an "All" sheet' d="Every record on its own tab before the split tabs" on={opts.allSheet} onChange={(v) => setO({ allSheet: v })} />}
        </div>
      ) : (
        <div className="tcx-card">
          <div className="tcx-card-t">Each course cell shows</div>
          <Seg
            value={opts.matrixCell}
            onChange={(v) => setO({ matrixCell: v })}
            items={[
              ["expiry", "Expiry date"],
              ["status", "Status"],
              ["days", "Days left"],
            ]}
          />
          <div className="tcx-note">Courses = your course filter, or every course found. "—" means the employee has no certificate for that course.</div>
        </div>
      )}

      <div className="tcx-card">
        <div className="tcx-card-t">Sort order</div>
        <div className="tcx-sort">
          <span className="tcx-lbl">Sort by</span>
          <select className="tcx-input" value={opts.sort1} onChange={(e) => setO({ sort1: e.target.value })}>
            {CERT_COLUMNS.filter((c) => !c.noSort).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <Seg value={opts.dir1} onChange={(v) => setO({ dir1: v })} items={[["asc", "Ascending"], ["desc", "Descending"]]} />
          <span className="tcx-lbl">Then by</span>
          <select className="tcx-input" value={opts.sort2} onChange={(e) => setO({ sort2: e.target.value })}>
            <option value="">— none —</option>
            {CERT_COLUMNS.filter((c) => !c.noSort).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <Seg value={opts.dir2} onChange={(v) => setO({ dir2: v })} items={[["asc", "Ascending"], ["desc", "Descending"]]} disabled={!opts.sort2} />
        </div>
      </div>

      <div className="tcx-card">
        <div className="tcx-card-t">Workbook options</div>
        {WORKBOOK_TOGGLES.filter((t) => !t.listOnly || opts.layout === "list").map((t) => (
          <Toggle key={t.k} t={t.t} d={t.d} on={!!opts[t.k]} onChange={(v) => setO({ [t.k]: v })} />
        ))}
      </div>

      <div className="tcx-card">
        <div className="tcx-card-t">File</div>
        <div className="tcx-grid2">
          <div>
            <div className="tcx-lbl">Date format</div>
            <select className="tcx-input" value={opts.dateFormat} onChange={(e) => setO({ dateFormat: e.target.value })}>
              <option value="dd/mm/yyyy">31/12/2026</option>
              <option value="dd-mmm-yyyy">31-Dec-2026</option>
              <option value="yyyy-mm-dd">2026-12-31</option>
              <option value="mm/dd/yyyy">12/31/2026</option>
            </select>
          </div>
          <div>
            <div className="tcx-lbl">File name</div>
            <div className="tcx-file">
              <input className="tcx-input" value={opts.fileName} onChange={(e) => setO({ fileName: e.target.value })} placeholder={defaultName} />
              <span>.xlsx</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const previewList = sorted.slice(0, 10);
  const reviewStep = (
    <>
      <StepHead title="Review & download" desc="This is what the first rows of your file will look like." />
      <div className="tcx-card">
        <div className="tcx-card-t">Sheets in the workbook</div>
        <div className="tcx-tabs">
          {sheets.slice(0, 14).map((s, i) => (
            <span key={`${s}-${i}`} className="tcx-tab">
              {s}
            </span>
          ))}
          {sheets.length > 14 && <span className="tcx-tab more">+{sheets.length - 14} more</span>}
        </div>
      </div>
      <div className="tcx-card flush">
        <div className="tcx-card-t pad">
          Preview
          <span className="tcx-hint">{opts.layout === "matrix" ? `${matrix?.emps.length || 0} employees × ${matrix?.courses.length || 0} courses` : `${Math.min(10, sorted.length)} of ${sorted.length} rows`}</span>
        </div>
        <div className="tcx-tblwrap">
          {opts.layout === "matrix" && matrix ? (
            <table className="tcx-tbl">
              <thead>
                <tr>
                  {activeCols.filter((c) => usedInMatrix(c.key)).map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  {matrix.courses.map((c) => (
                    <th key={c} className="c">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.emps.slice(0, 10).map((e, i) => (
                  <tr key={i}>
                    {activeCols.filter((c) => usedInMatrix(c.key)).map((c) => (
                      <td key={c.key}>{String(COL_BY_KEY.get(c.key).value(e.info, i) ?? "")}</td>
                    ))}
                    {matrix.courses.map((course) => {
                      const cert = e.certs[course];
                      if (!cert) return <td key={course} className="c miss">—</td>;
                      const s = STATUS_ARGB[cert.status.key];
                      const txt = opts.matrixCell === "status" ? cert.status.label : opts.matrixCell === "days" ? cert.status.days ?? "No Expiry" : d10(cert.expiryDate) || "No Expiry";
                      return (
                        <td key={course} className="c" style={opts.colorStatus ? { background: `#${s.fill.slice(2)}`, color: `#${s.font.slice(2)}`, fontWeight: 700 } : undefined}>
                          {txt}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="tcx-tbl">
              <thead>
                <tr>
                  {activeCols.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewList.map((r, i) => (
                  <tr key={r._rid || r.idx} className={opts.zebra && i % 2 ? "z" : ""}>
                    {activeCols.map((c) => {
                      const def = COL_BY_KEY.get(c.key);
                      let v = def.value(r, i);
                      if (def.type === "link") v = v ? "Open ↗" : "";
                      const s = def.type === "status" && opts.colorStatus ? STATUS_ARGB[statusKeyOf(r)] : null;
                      return (
                        <td key={c.key} className={def.type === "link" && v ? "lnk" : ""} style={s ? { background: `#${s.fill.slice(2)}`, color: `#${s.font.slice(2)}`, fontWeight: 700 } : undefined}>
                          {v === null || v === undefined ? "" : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!sorted.length && <div className="tcx-empty">No certificates match these filters.</div>}
        </div>
      </div>
    </>
  );

  const bodies = [recordsStep, columnsStep, layoutStep, reviewStep];

  return (
    <div className="tcx tcx-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()} lang="en" dir="ltr">
      <style>{TCX_CSS}</style>
      <div className="tcx-dlg" role="dialog" aria-modal="true" aria-label="Export to Excel">
        <header className="tcx-head">
          <div className="tcx-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="tcx-grow">
            <div className="tcx-title">Export to Excel</div>
            <div className="tcx-sub">Training Certificates Register · custom report builder</div>
          </div>
          <button type="button" className="tcx-x" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="tcx-body">
          <nav className="tcx-nav">
            {STEPS.map((s, i) => (
              <button key={s.id} type="button" className={`tcx-step${i === step ? " on" : ""}${i < step ? " done" : ""}`} onClick={() => setStep(i)}>
                <span className="tcx-num">{i < step ? "✓" : i + 1}</span>
                <span className="tcx-grow">
                  <span className="tcx-step-t">{s.t}</span>
                  <span className="tcx-step-s">{stepSub[i]}</span>
                </span>
              </button>
            ))}
          </nav>

          <main className="tcx-main">{bodies[step]}</main>

          <aside className="tcx-aside">
            <div className="tcx-aside-t">Export summary</div>
            <div className="tcx-kpis">
              <div className="tcx-kpi">
                <b className={sorted.length ? "" : "bad"}>{sorted.length}</b>
                <span>Certificates</span>
              </div>
              <div className="tcx-kpi">
                <b>{employees}</b>
                <span>Employees</span>
              </div>
              <div className="tcx-kpi">
                <b>{opts.layout === "matrix" ? activeCols.filter((c) => usedInMatrix(c.key)).length + (matrix?.courses.length || 0) : activeCols.length}</b>
                <span>Columns</span>
              </div>
              <div className="tcx-kpi">
                <b>{sheets.length}</b>
                <span>Sheets</span>
              </div>
            </div>

            <div className="tcx-aside-t">Filters</div>
            {filterChips.length ? (
              <div className="tcx-fchips">
                {filterChips.map((c) => (
                  <span key={c.id} className="tcx-fchip">
                    {c.text}
                    <button type="button" onClick={() => setF((p) => clearFilterPart(p, c.id))} aria-label="Remove filter">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="tcx-muted">None — every active certificate</div>
            )}

            <div className="tcx-aside-t">Layout</div>
            <dl className="tcx-dl">
              <dt>Shape</dt>
              <dd>{opts.layout === "matrix" ? "Training matrix" : "Certificate list"}</dd>
              {opts.layout === "list" && (
                <>
                  <dt>Rows</dt>
                  <dd>{GROUP_CHOICES.find((g) => g.v === opts.groupBy)?.t}</dd>
                </>
              )}
              <dt>Sort</dt>
              <dd>
                {COL_BY_KEY.get(opts.sort1)?.label} {opts.dir1 === "asc" ? "↑" : "↓"}
                {opts.sort2 ? `, ${COL_BY_KEY.get(opts.sort2)?.label} ${opts.dir2 === "asc" ? "↑" : "↓"}` : ""}
              </dd>
              <dt>File</dt>
              <dd className="tcx-ell">{(opts.fileName || defaultName) + ".xlsx"}</dd>
            </dl>
          </aside>
        </div>

        <footer className="tcx-foot">
          <div className="tcx-foot-info">
            {err ? (
              <span className="tcx-err">{err}</span>
            ) : (
              <span>
                Step {step + 1} of {STEPS.length} · <b>{sorted.length}</b> certificates · <b>{activeCols.length}</b> columns
              </span>
            )}
          </div>
          <button type="button" className="tcx-btn" onClick={() => (step ? setStep(step - 1) : onClose())} disabled={busy}>
            {step ? "← Back" : "Cancel"}
          </button>
          {!isLast && (
            <button type="button" className="tcx-btn primary" onClick={() => setStep(step + 1)}>
              Next: {STEPS[step + 1].t} →
            </button>
          )}
          <button type="button" className={`tcx-btn success${isLast ? "" : " ghosty"}`} onClick={doExport} disabled={cantExport}>
            {busy ? "Building…" : "⬇ Download .xlsx"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */
function StepHead({ title, desc }) {
  return (
    <div className="tcx-sh">
      <div className="tcx-h2">{title}</div>
      <div className="tcx-desc">{desc}</div>
    </div>
  );
}
function Seg({ value, onChange, items, disabled }) {
  return (
    <div className={`tcx-seg${disabled ? " dis" : ""}`}>
      {items.map(([v, t]) => (
        <button key={v} type="button" className={value === v ? "on" : ""} onClick={() => !disabled && onChange(v)} disabled={disabled}>
          {t}
        </button>
      ))}
    </div>
  );
}
function Range({ a, b, onA, onB, type }) {
  return (
    <div className="tcx-range">
      <input className="tcx-input" type={type} value={a} onChange={(e) => onA(e.target.value)} placeholder={type === "number" ? "Min" : undefined} />
      <span className="tcx-arrow">to</span>
      <input className="tcx-input" type={type} value={b} onChange={(e) => onB(e.target.value)} placeholder={type === "number" ? "Max" : undefined} />
    </div>
  );
}
function Toggle({ t, d, on, onChange }) {
  return (
    <button type="button" className="tcx-toggle" onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="tcx-grow">
        <b>{t}</b>
        {d && <small>{d}</small>}
      </span>
      <span className={`tcx-sw${on ? " on" : ""}`} />
    </button>
  );
}

/* ---------- styles (scoped; #root prefix beats globals.css forced sizes) ---------- */
const FS = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const TCX_CSS = `
.tcx.tcx-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,"Segoe UI",Tahoma,Arial,sans-serif;color:#0f172a}
.tcx *{box-sizing:border-box}
.tcx .tcx-dlg{width:min(1240px,100%);height:min(860px,100%);background:#fff;border-radius:18px;box-shadow:0 30px 90px rgba(2,6,23,.45);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}
.tcx .tcx-head{display:flex;align-items:center;gap:14px;padding:16px 22px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fbff,#fff)}
.tcx .tcx-logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#10b981,#047857);color:#fff;display:grid;place-items:center;box-shadow:0 6px 14px rgba(16,185,129,.35);flex:none}
.tcx .tcx-title{font-weight:800;letter-spacing:-.01em}
.tcx .tcx-sub{color:#64748b;margin-top:2px}
.tcx .tcx-x{width:38px;height:38px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;flex:none}
.tcx .tcx-x:hover{background:#f1f5f9}
.tcx .tcx-grow{flex:1;min-width:0;display:flex;flex-direction:column}
.tcx .tcx-sp{flex:1}
.tcx .tcx-body{display:grid;grid-template-columns:236px minmax(0,1fr) 296px;min-height:0}
.tcx .tcx-nav{background:#f8fafc;border-right:1px solid #e2e8f0;padding:16px 12px;display:flex;flex-direction:column;gap:6px;overflow:auto}
.tcx .tcx-step{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;border-radius:12px;border:1px solid transparent;background:transparent;text-align:left;cursor:pointer;color:#0f172a}
.tcx .tcx-step:hover{background:#eef2f7}
.tcx .tcx-step.on{background:#fff;border-color:#bfdbfe;box-shadow:0 4px 14px rgba(37,99,235,.10)}
.tcx .tcx-num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e2e8f0;color:#475569;font-weight:800;flex:none}
.tcx .tcx-step.on .tcx-num{background:#2563eb;color:#fff}
.tcx .tcx-step.done .tcx-num{background:#10b981;color:#fff}
.tcx .tcx-step-t{font-weight:700}
.tcx .tcx-step-s{color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tcx .tcx-main{overflow:auto;padding:22px 26px 28px;background:#fff}
.tcx .tcx-sh{margin-bottom:16px}
.tcx .tcx-h2{font-weight:800;letter-spacing:-.01em}
.tcx .tcx-desc{color:#64748b;margin-top:4px}
.tcx .tcx-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;background:#fff}
.tcx .tcx-card.flush{padding:0;overflow:hidden}
.tcx .tcx-card-t{display:flex;align-items:center;gap:8px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
.tcx .tcx-card-t.pad{padding:14px 16px 0}
.tcx .tcx-hint{margin-left:auto;text-transform:none;letter-spacing:0;color:#64748b;font-weight:600}
.tcx .tcx-lbl{font-weight:700;color:#475569;margin-bottom:6px;display:block}
.tcx .tcx-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.tcx .tcx-row .tcx-lbl{margin:0;min-width:120px}
.tcx .tcx-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.tcx .tcx-input{width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;outline:none;transition:border-color .15s,box-shadow .15s}
.tcx .tcx-input.sm{height:34px}
.tcx .tcx-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.tcx select.tcx-input{cursor:pointer}
.tcx .tcx-link{border:0;background:transparent;color:#2563eb;font-weight:700;cursor:pointer;padding:2px 6px;border-radius:6px;text-transform:none;letter-spacing:0}
.tcx .tcx-link:hover{background:#eff6ff}
.tcx .tcx-status{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.tcx .tcx-stile{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border:1px solid #e2e8f0;border-left:4px solid;border-radius:12px;background:#fff;cursor:pointer;text-align:left;color:#0f172a;transition:box-shadow .15s}
.tcx .tcx-stile:hover{box-shadow:0 4px 12px rgba(15,23,42,.08)}
.tcx .tcx-stile.on{outline:2px solid;outline-offset:-1px}
.tcx .tcx-stile-n{font-weight:800;line-height:1.1}
.tcx .tcx-stile-l{color:#475569;font-weight:600}
.tcx .tcx-tick{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;color:#fff;display:grid;place-items:center;font-weight:800}
.tcx .tcx-seg{display:inline-flex;background:#f1f5f9;border-radius:11px;padding:3px;gap:2px;flex-wrap:wrap}
.tcx .tcx-seg button{border:0;background:transparent;padding:7px 14px;border-radius:9px;font-weight:700;color:#475569;cursor:pointer;white-space:nowrap}
.tcx .tcx-seg button.on{background:#fff;color:#1d4ed8;box-shadow:0 1px 4px rgba(15,23,42,.12)}
.tcx .tcx-seg.dis{opacity:.45}
.tcx .tcx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.tcx .tcx-chip{padding:6px 12px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:600;cursor:pointer}
.tcx .tcx-chip:hover{border-color:#93c5fd}
.tcx .tcx-chip.on{background:#eff6ff;border-color:#2563eb;color:#1d4ed8}
.tcx .tcx-range{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.tcx .tcx-arrow{color:#94a3b8;font-weight:600}
.tcx .tcx-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
.tcx .tcx-preset{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;text-align:left;color:#0f172a}
.tcx .tcx-preset span{color:#64748b}
.tcx .tcx-preset:hover{border-color:#93c5fd}
.tcx .tcx-preset.on{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 1px #2563eb inset}
.tcx .tcx-dual{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:14px}
.tcx .tcx-pane{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.tcx .tcx-pane-h{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:800;color:#334155}
.tcx .tcx-badge{min-width:24px;height:22px;padding:0 7px;border-radius:999px;background:#e2e8f0;color:#334155;display:inline-grid;place-items:center;font-weight:800}
.tcx .tcx-badge.blue{background:#dbeafe;color:#1d4ed8}
.tcx .tcx-list{max-height:430px;overflow:auto;padding:4px 0}
.tcx .tcx-grp{padding:10px 12px 4px;color:#94a3b8;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.tcx .tcx-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:0;background:transparent;text-align:left;color:#0f172a}
.tcx .tcx-item.add{cursor:pointer}
.tcx .tcx-item.add:hover{background:#f0fdf4}
.tcx .tcx-item.add:hover .tcx-plus{background:#10b981;color:#fff;border-color:#10b981}
.tcx .tcx-plus{width:24px;height:24px;border-radius:7px;border:1px solid #cbd5e1;display:grid;place-items:center;color:#475569;font-weight:800;flex:none}
.tcx .tcx-item.sel{border-bottom:1px solid #f1f5f9}
.tcx .tcx-item.sel:hover{background:#f8fafc}
.tcx .tcx-item.drag{background:#eff6ff;outline:2px dashed #2563eb;outline-offset:-2px}
.tcx .tcx-item.warn{background:#fffbeb}
.tcx .tcx-grip{color:#cbd5e1;cursor:grab;flex:none}
.tcx .tcx-ord{width:24px;height:24px;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-weight:800;display:grid;place-items:center;flex:none}
.tcx .tcx-rename{flex:1;min-width:0;height:32px;border:1px solid transparent;background:transparent;border-radius:8px;padding:0 8px;font-weight:600;color:#0f172a;outline:none}
.tcx .tcx-rename:hover{border-color:#e2e8f0}
.tcx .tcx-rename:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.tcx .tcx-ic{width:28px;height:28px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;flex:none;padding:0}
.tcx .tcx-ic:hover:not(:disabled){background:#f1f5f9}
.tcx .tcx-ic:disabled{opacity:.35;cursor:default}
.tcx .tcx-ic.del:hover{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
.tcx .tcx-empty{padding:22px;text-align:center;color:#94a3b8;font-weight:600}
.tcx .tcx-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.tcx .tcx-layouts{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:14px}
.tcx .tcx-lcard{display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;cursor:pointer;text-align:left;color:#0f172a}
.tcx .tcx-lcard span{display:flex;flex-direction:column;gap:3px}
.tcx .tcx-lcard small{color:#64748b}
.tcx .tcx-lcard.on{border-color:#2563eb;background:#f5f9ff}
.tcx .tcx-ill{width:64px;height:50px;border-radius:8px;border:1px solid #cbd5e1;flex:none;background-color:#fff}
.tcx .tcx-ill.list{background-image:linear-gradient(#0f172a,#0f172a),repeating-linear-gradient(#fff 0 8px,#e2e8f0 8px 9px);background-size:100% 9px,100% 100%;background-repeat:no-repeat,repeat}
.tcx .tcx-ill.matrix{background-image:linear-gradient(90deg,transparent 22px,#dcfce7 22px 36px,#fee2e2 36px 50px,#fef9c3 50px),repeating-linear-gradient(#fff 0 9px,#e2e8f0 9px 10px)}
.tcx .tcx-radios{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.tcx .tcx-radio{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;text-align:left;color:#0f172a}
.tcx .tcx-radio span{display:flex;flex-direction:column;gap:2px}
.tcx .tcx-radio small{color:#64748b}
.tcx .tcx-radio.on{border-color:#2563eb;background:#f5f9ff}
.tcx .tcx-dot{width:18px;height:18px;border-radius:50%;border:2px solid #cbd5e1;flex:none;margin-top:1px}
.tcx .tcx-radio.on .tcx-dot{border:5px solid #2563eb}
.tcx .tcx-sort{display:grid;grid-template-columns:auto minmax(160px,1fr) auto;gap:10px 12px;align-items:center}
.tcx .tcx-sort .tcx-lbl{margin:0}
.tcx .tcx-toggle{display:flex;align-items:center;gap:14px;width:100%;padding:11px 2px;border:0;border-bottom:1px solid #f1f5f9;background:transparent;text-align:left;cursor:pointer;color:#0f172a}
.tcx .tcx-toggle:last-child{border-bottom:0}
.tcx .tcx-toggle small{color:#64748b;margin-top:1px}
.tcx .tcx-sw{position:relative;width:42px;height:24px;border-radius:999px;background:#cbd5e1;flex:none;transition:background .15s}
.tcx .tcx-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.tcx .tcx-sw.on{background:#10b981}
.tcx .tcx-sw.on::after{left:21px}
.tcx .tcx-file{display:flex;align-items:center;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden}
.tcx .tcx-file .tcx-input{border:0;border-radius:0;box-shadow:none}
.tcx .tcx-file span{padding:0 12px;color:#64748b;background:#f8fafc;align-self:stretch;display:grid;place-items:center;border-left:1px solid #e2e8f0;font-weight:700}
.tcx .tcx-tabs{display:flex;flex-wrap:wrap;gap:6px}
.tcx .tcx-tab{padding:6px 12px;border-radius:8px 8px 0 0;border:1px solid #cbd5e1;border-bottom:3px solid #10b981;background:#f8fafc;font-weight:700;color:#065f46}
.tcx .tcx-tab.more{border-bottom-color:#cbd5e1;color:#64748b}
.tcx .tcx-tblwrap{overflow:auto;max-height:420px;margin-top:12px;border-top:1px solid #e2e8f0}
.tcx .tcx-tbl{border-collapse:collapse;width:100%;white-space:nowrap}
.tcx .tcx-tbl th{position:sticky;top:0;background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-weight:700}
.tcx .tcx-tbl td{padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #f1f5f9;color:#0f172a}
.tcx .tcx-tbl tr.z td{background:#f8fafc}
.tcx .tcx-tbl .c{text-align:center}
.tcx .tcx-tbl td.miss{color:#94a3b8;background:#f8fafc}
.tcx .tcx-tbl td.lnk{color:#2563eb;text-decoration:underline}
.tcx .tcx-aside{background:#f8fafc;border-left:1px solid #e2e8f0;padding:18px 16px;overflow:auto}
.tcx .tcx-aside-t{font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:4px 0 10px}
.tcx .tcx-aside-t:not(:first-child){margin-top:20px}
.tcx .tcx-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tcx .tcx-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column}
.tcx .tcx-kpi b{font-weight:800;color:#0f172a;line-height:1.15}
.tcx .tcx-kpi b.bad{color:#b91c1c}
.tcx .tcx-kpi span{color:#64748b}
.tcx .tcx-fchips{display:flex;flex-direction:column;gap:6px}
.tcx .tcx-fchip{display:flex;align-items:center;gap:6px;padding:6px 6px 6px 10px;border-radius:9px;background:#fff;border:1px solid #dbeafe;color:#1e3a8a;font-weight:600}
.tcx .tcx-fchip button{margin-left:auto;width:22px;height:22px;border-radius:6px;border:0;background:#eff6ff;color:#1d4ed8;cursor:pointer;flex:none}
.tcx .tcx-fchip button:hover{background:#dbeafe}
.tcx .tcx-muted{color:#94a3b8}
.tcx .tcx-dl{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;margin:0}
.tcx .tcx-dl dt{color:#64748b}
.tcx .tcx-dl dd{margin:0;font-weight:700;color:#0f172a;min-width:0}
.tcx .tcx-ell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tcx .tcx-foot{display:flex;align-items:center;gap:10px;padding:12px 22px;border-top:1px solid #e2e8f0;background:#fff;flex-wrap:wrap}
.tcx .tcx-foot-info{flex:1;min-width:180px;color:#475569}
.tcx .tcx-err{color:#b91c1c;font-weight:700}
.tcx .tcx-btn{height:42px;padding:0 18px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:700;cursor:pointer;white-space:nowrap}
.tcx .tcx-btn:hover:not(:disabled){background:#f8fafc}
.tcx .tcx-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.tcx .tcx-btn.primary:hover{background:#1d4ed8}
.tcx .tcx-btn.success{background:linear-gradient(135deg,#10b981,#047857);border:0;color:#fff;box-shadow:0 6px 16px rgba(16,185,129,.3)}
.tcx .tcx-btn.success.ghosty{background:#fff;color:#047857;border:1px solid #10b981;box-shadow:none}
.tcx .tcx-btn:disabled{opacity:.5;cursor:not-allowed}
@media (max-width:1100px){.tcx .tcx-body{grid-template-columns:210px minmax(0,1fr)}.tcx .tcx-aside{display:none}}
@media (max-width:760px){
 .tcx.tcx-overlay{padding:0}
 .tcx .tcx-dlg{height:100%;border-radius:0}
 .tcx .tcx-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
 .tcx .tcx-nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #e2e8f0;padding:8px}
 .tcx .tcx-step{min-width:150px}
 .tcx .tcx-main{padding:16px}
 .tcx .tcx-dual{grid-template-columns:1fr}
 .tcx .tcx-sort{grid-template-columns:1fr}
 .tcx .tcx-head{padding:12px 16px}
}
#root .tcx, #root .tcx *{font-size:${FS(14)}}
#root .tcx .tcx-title{font-size:${FS(19)}}
#root .tcx .tcx-h2{font-size:${FS(20)}}
#root .tcx .tcx-desc, #root .tcx .tcx-sub{font-size:${FS(13.5)}}
#root .tcx .tcx-card-t, #root .tcx .tcx-aside-t, #root .tcx .tcx-grp{font-size:${FS(11.5)}}
#root .tcx .tcx-card-t .tcx-hint, #root .tcx .tcx-card-t .tcx-link{font-size:${FS(13)}}
#root .tcx .tcx-step-s, #root .tcx small, #root .tcx .tcx-preset span, #root .tcx .tcx-kpi span{font-size:${FS(12.5)}}
#root .tcx .tcx-stile-n{font-size:${FS(24)}}
#root .tcx .tcx-kpi b{font-size:${FS(24)}}
#root .tcx .tcx-tbl th, #root .tcx .tcx-tbl td{font-size:${FS(12.5)}}
#root .tcx .tcx-num, #root .tcx .tcx-ord, #root .tcx .tcx-badge{font-size:${FS(12.5)}}
`;
