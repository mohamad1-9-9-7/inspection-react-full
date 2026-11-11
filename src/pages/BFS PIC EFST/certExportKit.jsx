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

function writeMatrixSheet(ws, rows, cols, opts, meta, courseFilter) {
  const empCols = cols.filter((c) => COL_BY_KEY.get(c.key).emp || c.key === "seq");
  const courses = (courseFilter && courseFilter.length ? courseFilter.slice() : Array.from(new Set(rows.map((r) => r.courseType).filter(Boolean)))).sort(courseCmp);

  // one entry per employee; latest record wins for employee details; latest expiry per course
  const map = new Map();
  rows.forEach((r) => {
    const k = employeeKey(r);
    const cur = map.get(k) || { info: r, certs: {} };
    if (String(r.savedAt || "") > String(cur.info.savedAt || "")) cur.info = r;
    const prev = cur.certs[r.courseType];
    if (!prev || d10(r.expiryDate || "9999") > d10(prev.expiryDate || "9999")) cur.certs[r.courseType] = r;
    map.set(k, cur);
  });
  let emps = Array.from(map.values());
  emps = sortRows(emps.map((e) => ({ ...e.info, __e: e })), opts.sort1 && COL_BY_KEY.get(opts.sort1)?.emp ? opts.sort1 : "name", opts.dir1, "name", "asc").map((x) => x.__e);

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
    // keep saved order, drop unknown keys, append new columns
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

const COLUMN_PRESETS = [
  { id: "default", label: "Standard", keys: CERT_COLUMNS.filter((c) => c.def).map((c) => c.key) },
  { id: "renewal", label: "Renewal list", keys: ["seq", "employeeNo", "name", "branch", "courseName", "expiryDate", "daysLeft", "status"] },
  { id: "audit", label: "Audit evidence", keys: ["seq", "employeeNo", "name", "job", "branch", "courseName", "issueDate", "expiryDate", "status", "hasImage", "imageUrl", "instituteUrl"] },
  { id: "hr", label: "HR roster", keys: ["seq", "employeeNo", "name", "nationality", "job", "branch", "leftCompany"] },
  { id: "all", label: "All columns", keys: CERT_COLUMNS.map((c) => c.key) },
];

export function CertExportModal({ open, onClose, allRows, initialFilters, lists }) {
  const [f, setF] = useState(initialFilters || EMPTY_FILTERS);
  const [cols, setCols] = useState(() => loadPrefs()?.cols || defaultCols());
  const [opts, setOpts] = useState(() => loadPrefs()?.opts || DEFAULT_OPTS);
  const [dragKey, setDragKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setF(initialFilters || EMPTY_FILTERS);
      setErr("");
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
  const activeCols = cols.filter((c) => c.on);
  const filterChips = describeFilters(f);

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

  const matrixEmployees = useMemo(() => (opts.layout === "matrix" ? new Set(filtered.map(employeeKey)).size : 0), [filtered, opts.layout]);

  if (!open) return null;

  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setO = (patch) => setOpts((p) => ({ ...p, ...patch }));
  const toggleStatus = (k) => set({ statuses: f.statuses.includes(k) ? f.statuses.filter((x) => x !== k) : [...f.statuses, k] });

  function moveCol(key, delta) {
    setCols((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function dropOn(targetKey) {
    if (!dragKey || dragKey === targetKey) return;
    setCols((prev) => {
      const from = prev.findIndex((c) => c.key === dragKey);
      const to = prev.findIndex((c) => c.key === targetKey);
      const next = prev.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    setDragKey(null);
  }
  function applyPreset(p) {
    setCols((prev) => {
      const byKey = new Map(prev.map((c) => [c.key, c]));
      const first = p.keys.map((k) => ({ ...byKey.get(k), on: true }));
      const rest = prev.filter((c) => !p.keys.includes(c.key)).map((c) => ({ ...c, on: false }));
      return [...first, ...rest];
    });
  }

  async function doExport() {
    if (!activeCols.length) {
      setErr("Choose at least one column.");
      return;
    }
    if (!sorted.length) {
      setErr("No certificates match these filters.");
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

  const previewRows = sorted.slice(0, 6);

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(2,6,23,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        direction: "ltr",
      }}
    >
      <div
        style={{
          width: "min(1280px, 100%)",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          background: "#f8fafc",
          borderRadius: 18,
          boxShadow: "0 30px 80px rgba(2,6,23,0.55)",
          overflow: "hidden",
          fontFamily: "Inter, Tahoma, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(135deg,#065f46,#047857,#10b981)", color: "#fff" }}>
          <div style={{ fontSize: 22 }}>📊</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Custom Excel Export</div>
            <div style={{ opacity: 0.9 }}>Pick the records, the columns and how the workbook is laid out.</div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} style={{ ...ghostBtn, color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 14, alignItems: "start" }}>
          {/* ---- 1. Filters ---- */}
          <section style={card}>
            <div style={cardHead}>
              <span>① Records</span>
              <span style={{ flex: 1 }} />
              <button type="button" style={miniLink} onClick={() => setF(initialFilters || EMPTY_FILTERS)}>
                Page filters
              </button>
              <button type="button" style={miniLink} onClick={() => setF(EMPTY_FILTERS)}>
                Reset
              </button>
            </div>

            <input value={f.search} onChange={(e) => set({ search: e.target.value })} placeholder="🔎 Name, employee no, job…" style={inputSt} />

            <div style={lbl}>Status</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUS_DEFS.map((s) => {
                const on = f.statuses.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleStatus(s.key)}
                    style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.color}`, background: on ? s.color : "#fff", color: on ? "#fff" : s.color, fontWeight: 700, cursor: "pointer" }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                ["exclude", "Active staff"],
                ["include", "+ Left company"],
                ["only", "Left company only"],
              ].map(([v, t]) => (
                <button key={v} type="button" onClick={() => set({ leftMode: v })} style={segBtn(f.leftMode === v)}>
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <MultiSelect inline icon="🏢" label="Branches" options={lists.branches} value={f.branches} onChange={(v) => set({ branches: v })} counts={counts.branch} />
              <MultiSelect inline icon="🎓" label="Courses" options={lists.courses} value={f.courses} onChange={(v) => set({ courses: v })} counts={counts.course} />
              <MultiSelect inline icon="🌍" label="Nationalities" options={lists.nationalities} value={f.nationalities} onChange={(v) => set({ nationalities: v })} counts={counts.nat} />
              <MultiSelect inline icon="💼" label="Job titles" options={lists.jobs} value={f.jobs} onChange={(v) => set({ jobs: v })} counts={counts.job} />
            </div>

            <div style={lbl}>Expiry date</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
              {EXPIRY_PRESETS.map((p) => (
                <button key={p.id} type="button" style={chipBtn} onClick={() => set(p.range())}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={rangeRow}>
              <input type="date" value={f.expiryFrom} onChange={(e) => set({ expiryFrom: e.target.value })} style={inputSt} />
              <span>→</span>
              <input type="date" value={f.expiryTo} onChange={(e) => set({ expiryTo: e.target.value })} style={inputSt} />
            </div>

            <div style={lbl}>Issue date</div>
            <div style={rangeRow}>
              <input type="date" value={f.issueFrom} onChange={(e) => set({ issueFrom: e.target.value })} style={inputSt} />
              <span>→</span>
              <input type="date" value={f.issueTo} onChange={(e) => set({ issueTo: e.target.value })} style={inputSt} />
            </div>

            <div style={lbl}>Days left</div>
            <div style={rangeRow}>
              <input type="number" placeholder="min" value={f.daysMin} onChange={(e) => set({ daysMin: e.target.value })} style={inputSt} />
              <span>→</span>
              <input type="number" placeholder="max" value={f.daysMax} onChange={(e) => set({ daysMax: e.target.value })} style={inputSt} />
            </div>

            <div style={lbl}>Certificate image</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                ["any", "Any"],
                ["with", "Attached"],
                ["without", "Missing"],
              ].map(([v, t]) => (
                <button key={v} type="button" onClick={() => set({ image: v })} style={segBtn(f.image === v)}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* ---- 2. Columns ---- */}
          <section style={card}>
            <div style={cardHead}>
              <span>② Columns</span>
              <span style={{ color: "#64748b", fontWeight: 600 }}>
                {activeCols.length}/{cols.length}
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" style={miniLink} onClick={() => setCols((p) => p.map((c) => ({ ...c, on: true })))}>
                All
              </button>
              <button type="button" style={miniLink} onClick={() => setCols((p) => p.map((c) => ({ ...c, on: false })))}>
                None
              </button>
              <button type="button" style={miniLink} onClick={() => setCols(defaultCols())}>
                Reset
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {COLUMN_PRESETS.map((p) => (
                <button key={p.id} type="button" style={chipBtn} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ color: "#64748b", marginBottom: 6 }}>Tick to include · drag or use ↑↓ to reorder · edit the header text</div>
            <div style={{ display: "grid", gap: 4 }}>
              {cols.map((c, i) => (
                <div
                  key={c.key}
                  draggable
                  onDragStart={() => setDragKey(c.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(c.key)}
                  onDragEnd={() => setDragKey(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 6px",
                    borderRadius: 9,
                    border: dragKey === c.key ? "1.5px dashed #2563eb" : "1px solid #e2e8f0",
                    background: c.on ? "#fff" : "#f1f5f9",
                    opacity: c.on ? 1 : 0.7,
                  }}
                >
                  <span style={{ cursor: "grab", color: "#94a3b8" }}>⋮⋮</span>
                  <input type="checkbox" checked={c.on} onChange={() => setCols((p) => p.map((x) => (x.key === c.key ? { ...x, on: !x.on } : x)))} style={{ margin: 0 }} />
                  <input
                    value={c.label}
                    onChange={(e) => setCols((p) => p.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))}
                    style={{ flex: 1, minWidth: 0, border: "1px solid transparent", background: "transparent", padding: "3px 4px", borderRadius: 6, fontWeight: 600, color: "#0f172a" }}
                    onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                    onBlur={(e) => (e.target.style.borderColor = "transparent")}
                    title={COL_BY_KEY.get(c.key).label}
                  />
                  {opts.layout === "matrix" && c.on && !COL_BY_KEY.get(c.key).emp && c.key !== "seq" && (
                    <span title="Not used in the matrix layout" style={{ color: "#a16207" }}>
                      ⓘ
                    </span>
                  )}
                  <button type="button" style={arrowBtn} disabled={i === 0} onClick={() => moveCol(c.key, -1)}>
                    ↑
                  </button>
                  <button type="button" style={arrowBtn} disabled={i === cols.length - 1} onClick={() => moveCol(c.key, 1)}>
                    ↓
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ---- 3. Layout ---- */}
          <section style={card}>
            <div style={cardHead}>③ Layout & options</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button type="button" style={bigSeg(opts.layout === "list")} onClick={() => setO({ layout: "list" })}>
                <b>📄 List</b>
                <span>One row per certificate</span>
              </button>
              <button type="button" style={bigSeg(opts.layout === "matrix")} onClick={() => setO({ layout: "matrix" })}>
                <b>▦ Training matrix</b>
                <span>Employee × course</span>
              </button>
            </div>

            {opts.layout === "list" ? (
              <>
                <div style={lbl}>Group / split</div>
                <select value={opts.groupBy} onChange={(e) => setO({ groupBy: e.target.value })} style={inputSt}>
                  <option value="none">No grouping — one sheet</option>
                  <option value="rows_branch">Group rows by branch (one sheet)</option>
                  <option value="rows_course">Group rows by course (one sheet)</option>
                  <option value="sheet_branch">One sheet per branch</option>
                  <option value="sheet_course">One sheet per course</option>
                  <option value="sheet_status">One sheet per status</option>
                </select>
                {opts.groupBy.startsWith("sheet_") && (
                  <Check label='Also add an "All" sheet' checked={opts.allSheet} onChange={(v) => setO({ allSheet: v })} />
                )}
              </>
            ) : (
              <>
                <div style={lbl}>Matrix cell shows</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    ["expiry", "Expiry date"],
                    ["status", "Status"],
                    ["days", "Days left"],
                  ].map(([v, t]) => (
                    <button key={v} type="button" onClick={() => setO({ matrixCell: v })} style={segBtn(opts.matrixCell === v)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Uses the employee columns you ticked (No, Name, Branch, Job…). Courses = the course filter, or every course found. "—" = no certificate.
                </div>
              </>
            )}

            <div style={lbl}>Sort by</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
              <select value={opts.sort1} onChange={(e) => setO({ sort1: e.target.value })} style={inputSt}>
                {CERT_COLUMNS.filter((c) => !c.noSort).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button type="button" style={segBtn(true)} onClick={() => setO({ dir1: opts.dir1 === "asc" ? "desc" : "asc" })}>
                {opts.dir1 === "asc" ? "↑ A→Z" : "↓ Z→A"}
              </button>
              <select value={opts.sort2} onChange={(e) => setO({ sort2: e.target.value })} style={inputSt}>
                <option value="">— then by —</option>
                {CERT_COLUMNS.filter((c) => !c.noSort).map((c) => (
                  <option key={c.key} value={c.key}>
                    then {c.label}
                  </option>
                ))}
              </select>
              <button type="button" style={segBtn(true)} onClick={() => setO({ dir2: opts.dir2 === "asc" ? "desc" : "asc" })} disabled={!opts.sort2}>
                {opts.dir2 === "asc" ? "↑ A→Z" : "↓ Z→A"}
              </button>
            </div>

            <div style={lbl}>Workbook</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px" }}>
              <Check label="Summary sheet" checked={opts.summary} onChange={(v) => setO({ summary: v })} />
              <Check label="Status colours" checked={opts.colorStatus} onChange={(v) => setO({ colorStatus: v })} />
              <Check label="Title & filters block" checked={opts.titleBlock} onChange={(v) => setO({ titleBlock: v })} />
              <Check label="Striped rows" checked={opts.zebra} onChange={(v) => setO({ zebra: v })} />
              <Check label="Freeze header" checked={opts.freeze} onChange={(v) => setO({ freeze: v })} />
              <Check label="Excel filter buttons" checked={opts.autoFilter} onChange={(v) => setO({ autoFilter: v })} />
              {opts.layout === "list" && <Check label="Totals row" checked={opts.totalsRow} onChange={(v) => setO({ totalsRow: v })} />}
            </div>

            <div style={lbl}>Date format</div>
            <select value={opts.dateFormat} onChange={(e) => setO({ dateFormat: e.target.value })} style={inputSt}>
              <option value="dd/mm/yyyy">31/12/2026</option>
              <option value="dd-mmm-yyyy">31-Dec-2026</option>
              <option value="yyyy-mm-dd">2026-12-31</option>
              <option value="mm/dd/yyyy">12/31/2026</option>
            </select>

            <div style={lbl}>File name</div>
            <input value={opts.fileName} onChange={(e) => setO({ fileName: e.target.value })} placeholder={`training_certificates_${new Date().toISOString().slice(0, 10)}`} style={inputSt} />
          </section>
        </div>

        {/* Preview */}
        <div style={{ padding: "0 14px 10px" }}>
          <div style={{ ...card, padding: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <b>Preview</b>
              {filterChips.length === 0 ? (
                <span style={{ color: "#64748b" }}>No filters — every active certificate</span>
              ) : (
                filterChips.map((c) => (
                  <span key={c.id} style={{ padding: "2px 8px", borderRadius: 999, background: "#e0f2fe", color: "#075985", fontWeight: 600 }}>
                    {c.text}
                  </span>
                ))
              )}
            </div>
            {opts.layout === "matrix" ? (
              <div style={{ color: "#334155" }}>
                {matrixEmployees} employee row(s) built from {sorted.length} certificate(s).
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      {activeCols.map((c) => (
                        <th key={c.key} style={{ background: "#0f172a", color: "#fff", padding: "5px 8px", textAlign: "left", border: "1px solid #334155" }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={r._rid || r.idx}>
                        {activeCols.map((c) => {
                          const def = COL_BY_KEY.get(c.key);
                          let v = def.value(r, i);
                          if (def.type === "link") v = v ? "Open ↗" : "";
                          const s = def.type === "status" ? STATUS_ARGB[statusKeyOf(r)] : null;
                          return (
                            <td
                              key={c.key}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #e2e8f0",
                                background: s ? `#${s.fill.slice(2)}` : i % 2 ? "#f8fafc" : "#fff",
                                color: s ? `#${s.font.slice(2)}` : "#0f172a",
                                fontWeight: s ? 700 : 400,
                              }}
                            >
                              {v === null || v === undefined ? "" : String(v)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {sorted.length > previewRows.length && (
                      <tr>
                        <td colSpan={Math.max(activeCols.length, 1)} style={{ padding: 5, color: "#64748b", textAlign: "center" }}>
                          … and {sorted.length - previewRows.length} more row(s)
                        </td>
                      </tr>
                    )}
                    {!sorted.length && (
                      <tr>
                        <td colSpan={Math.max(activeCols.length, 1)} style={{ padding: 8, color: "#b91c1c", textAlign: "center", fontWeight: 700 }}>
                          No certificates match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
          <div style={{ fontWeight: 700 }}>
            <span style={{ color: "#047857", fontSize: 18 }}>{sorted.length}</span> certificate(s) · {activeCols.length} column(s)
          </div>
          {err && <div style={{ color: "#b91c1c", fontWeight: 700 }}>{err}</div>}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} disabled={busy} style={ghostBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={doExport}
            disabled={busy || !sorted.length || !activeCols.length}
            style={{
              padding: "9px 20px",
              borderRadius: 999,
              border: "none",
              background: busy || !sorted.length ? "#94a3b8" : "linear-gradient(135deg,#10b981,#047857)",
              color: "#fff",
              fontWeight: 800,
              cursor: busy || !sorted.length ? "not-allowed" : "pointer",
              boxShadow: "0 6px 16px rgba(16,185,129,0.35)",
            }}
          >
            {busy ? "⏳ Building…" : "⬇ Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", cursor: "pointer", color: "#0f172a" }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ margin: 0 }} />
      {label}
    </label>
  );
}

/* ---- dialog styles ---- */
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, boxShadow: "0 2px 8px rgba(15,23,42,0.05)" };
const cardHead = { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#065f46", marginBottom: 10 };
const lbl = { fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3, margin: "12px 0 5px" };
const inputSt = { width: "100%", boxSizing: "border-box", padding: "6px 9px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", outline: "none" };
const rangeRow = { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center" };
const chipBtn = { padding: "3px 9px", borderRadius: 999, border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#065f46", fontWeight: 700, cursor: "pointer" };
const miniLink = { padding: "2px 8px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", fontWeight: 700, cursor: "pointer" };
const arrowBtn = { width: 26, height: 24, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", color: "#0f172a", padding: 0 };
const ghostBtn = { padding: "8px 16px", borderRadius: 999, border: "1px solid #cbd5e1", background: "transparent", color: "#0f172a", fontWeight: 700, cursor: "pointer" };
const segBtn = (on) => ({
  flex: 1,
  padding: "5px 10px",
  borderRadius: 9,
  border: on ? "1.5px solid #047857" : "1px solid #cbd5e1",
  background: on ? "#d1fae5" : "#fff",
  color: on ? "#065f46" : "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
});
const bigSeg = (on) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  alignItems: "flex-start",
  padding: "9px 10px",
  borderRadius: 12,
  border: on ? "2px solid #047857" : "1px solid #cbd5e1",
  background: on ? "#ecfdf5" : "#fff",
  color: "#0f172a",
  cursor: "pointer",
  textAlign: "left",
});
