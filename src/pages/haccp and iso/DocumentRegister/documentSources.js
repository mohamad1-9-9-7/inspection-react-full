// src/pages/haccp and iso/DocumentRegister/documentSources.js
// Aggregates all controlled documents from existing data sources
// + merges in user-provided metadata stored as `document_metadata` reports.

import { sopsData, ssopsData, policiesData } from "../SOP/sopData";

/* ─────────────────────────────────────────────────────────────
   ISO Clause auto-mapping per category (per ISO 22000:2018)
   ───────────────────────────────────────────────────────────── */
export const CATEGORY_TO_CLAUSE = {
  Hygiene: "8.2(j) Personal hygiene",
  Sanitation: "8.2(h)(i) Cleaning & sanitizing",
  "Pest Control": "8.2(d) Pest control",
  Quality: "8.5 Hazard control",
  Temperature: "8.5.4 Hazard control plan",
  Recall: "8.9.5 Withdrawal/recall",
  Traceability: "8.3 Traceability system",
  Allergens: "8.5.2 Hazard identification",
  Suppliers: "7.1.6 External providers",
  Maintenance: "8.2(e) Equipment maintenance",
  Policy: "5.2 Food safety policy",
};

/* ─────────────────────────────────────────────────────────────
   Document type metadata (color, icon, default retention)
   ───────────────────────────────────────────────────────────── */
export const DOC_TYPE_META = {
  Manual:  { color: "#7c3aed", icon: "📕", defaultRetentionYears: 5,  i18nKey: "drTypeManual"  },
  Policy:  { color: "#0891b2", icon: "📜", defaultRetentionYears: 5,  i18nKey: "drTypePolicy"  },
  SOP:     { color: "#0f766e", icon: "📋", defaultRetentionYears: 2,  i18nKey: "drTypeSOP"     },
  sSOP:    { color: "#16a34a", icon: "🧼", defaultRetentionYears: 2,  i18nKey: "drTypeSSOP"    },
  Form:    { color: "#d97706", icon: "📝", defaultRetentionYears: 2,  i18nKey: "drTypeForm"    },
  Record:  { color: "#dc2626", icon: "💾", defaultRetentionYears: 2,  i18nKey: "drTypeRecord"  },
  Other:   { color: "#64748b", icon: "📁", defaultRetentionYears: 2,  i18nKey: "drTypeOther"   },
};

export const DOC_STATUS_META = {
  Active:    { color: "#16a34a", bg: "#dcfce7", i18nKey: "drStatusActive"    },
  Review:    { color: "#d97706", bg: "#fef3c7", i18nKey: "drStatusReview"    },
  Obsolete:  { color: "#64748b", bg: "#f1f5f9", i18nKey: "drStatusObsolete"  },
  Draft:     { color: "#7c3aed", bg: "#ede9fe", i18nKey: "drStatusDraft"     },
};

/* ─────────────────────────────────────────────────────────────
   Date helpers
   ───────────────────────────────────────────────────────────── */
function parseDate(s) {
  if (!s) return null;
  // Accept DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY etc.
  if (s instanceof Date) return s;
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function toISO(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : parseDate(d);
  if (!dt || isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export function addYears(date, years) {
  const d = parseDate(date);
  if (!d) return null;
  const nd = new Date(d);
  nd.setFullYear(nd.getFullYear() + years);
  return nd;
}

export function daysBetween(from, to) {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─────────────────────────────────────────────────────────────
   Compute review status & days to review
   ───────────────────────────────────────────────────────────── */
export function computeReviewStatus(doc, todayDate = new Date()) {
  // Use explicit nextReviewDate if provided, otherwise issueDate + 1 year
  let next = doc.nextReviewDate
    ? parseDate(doc.nextReviewDate)
    : addYears(doc.issueDate, 1);
  if (!next) return { daysToReview: null, label: "active", overdue: false };
  const diff = daysBetween(todayDate, next);
  if (diff === null) return { daysToReview: null, label: "active", overdue: false };
  if (diff < 0) return { daysToReview: diff, label: "overdue", overdue: true };
  if (diff <= 30) return { daysToReview: diff, label: "due", overdue: false };
  return { daysToReview: diff, label: "active", overdue: false };
}

/* ─────────────────────────────────────────────────────────────
   Auto-import: SOP/sSOP/Policy from sopData.js
   ───────────────────────────────────────────────────────────── */
export function getAutoImportedDocs() {
  const out = [];

  // SOPs
  for (const s of sopsData || []) {
    out.push({
      _src: "auto-sop",
      docNo: s.docNo,
      title: s.title,
      titleAr: s.titleAr,
      type: "SOP",
      category: s.category,
      isoClause: CATEGORY_TO_CLAUSE[s.category] || "",
      owner: s.preparedBy || "",
      issueDate: s.issueDate,
      revision: s.revision,
      facility: s.facility,
      sopId: s.id,           // links back to SopSsopPage
      sopNumber: s.number,   // e.g. "SOP 1"
    });
  }

  // sSOPs
  for (const s of ssopsData || []) {
    out.push({
      _src: "auto-ssop",
      docNo: s.docNo,
      title: s.title,
      titleAr: s.titleAr,
      type: "sSOP",
      category: s.category,
      isoClause: CATEGORY_TO_CLAUSE[s.category] || "",
      owner: s.preparedBy || "",
      issueDate: s.issueDate,
      revision: s.revision,
      facility: s.facility,
      sopId: s.id,
      sopNumber: s.number,
    });
  }

  // Policies
  for (const s of policiesData || []) {
    out.push({
      _src: "auto-policy",
      docNo: s.docNo,
      title: s.title,
      titleAr: s.titleAr,
      type: "Policy",
      category: s.category,
      isoClause: CATEGORY_TO_CLAUSE[s.category] || "",
      owner: s.preparedBy || "",
      issueDate: s.issueDate,
      revision: s.revision,
      facility: s.facility,
      sopId: s.id,
      sopNumber: s.number,
    });
  }

  // Add the FSMS Manual itself as Manual type
  out.push({
    _src: "auto-manual",
    docNo: "TELT-FSMS-MN-01",
    title: "FSMS Manual",
    titleAr: "دليل نظام إدارة سلامة الغذاء",
    type: "Manual",
    category: "Manual",
    isoClause: "4–10 (full FSMS)",
    owner: "Food Safety Team Leader",
    issueDate: "01/04/2026",
    revision: "02",
    facility: "All Sites",
    sopId: null,
    sopNumber: "Manual",
  });

  return out;
}

/* ─────────────────────────────────────────────────────────────
   Merge auto-imported docs with user metadata records
   meta records come from /api/reports?type=document_metadata
   payload shape: { docNo (key), ownerOverride?, distribution?, retentionYears?, nextReviewDate?, status?, storage?, approvedBy?, replacedBy?, notes? }
   ───────────────────────────────────────────────────────────── */
export function mergeDocs(autoDocs, metaRecords) {
  // Build metadata map by docNo
  const metaByDocNo = new Map();
  for (const rec of metaRecords || []) {
    const p = rec?.payload || {};
    if (!p.docNo) continue;
    metaByDocNo.set(p.docNo, { ...p, _recordId: rec.id });
  }

  // Merge: every auto doc gets metadata applied (if available)
  const merged = autoDocs.map((d) => {
    const m = metaByDocNo.get(d.docNo);
    if (!m) return { ...d, _hasMeta: false };
    return {
      ...d,
      ...m,
      // Preserve the auto fields when meta is empty
      title: m.title || d.title,
      titleAr: m.titleAr || d.titleAr,
      owner: m.owner || d.owner,
      issueDate: m.issueDate || d.issueDate,
      revision: m.revision || d.revision,
      isoClause: m.isoClause || d.isoClause,
      _hasMeta: true,
      _src: d._src,
      _recordId: m._recordId,
    };
  });

  // Add any metadata records that have NO matching auto doc (manual entries)
  const autoDocNos = new Set(autoDocs.map((d) => d.docNo));
  for (const [docNo, m] of metaByDocNo) {
    if (autoDocNos.has(docNo)) continue;
    merged.push({
      _src: "manual",
      _hasMeta: true,
      _recordId: m._recordId,
      docNo,
      title: m.title || "",
      titleAr: m.titleAr || "",
      type: m.type || "Other",
      category: m.category || "",
      isoClause: m.isoClause || "",
      owner: m.owner || "",
      issueDate: m.issueDate || "",
      revision: m.revision || "",
      ...m,
    });
  }

  return merged;
}

/* ─────────────────────────────────────────────────────────────
   CSV export helper
   ───────────────────────────────────────────────────────────── */
export function docsToCSV(docs) {
  const headers = [
    "Doc No.",
    "Title",
    "Title (AR)",
    "Type",
    "Category",
    "ISO Clause",
    "Owner",
    "Approved By",
    "Issue Date",
    "Revision",
    "Next Review",
    "Status",
    "Distribution",
    "Retention (yrs)",
    "Storage",
    "Notes",
  ];
  const rows = docs.map((d) => [
    d.docNo || "",
    d.title || "",
    d.titleAr || "",
    d.type || "",
    d.category || "",
    d.isoClause || "",
    d.owner || "",
    d.approvedBy || "",
    d.issueDate || "",
    d.revision || "",
    d.nextReviewDate || "",
    d.status || "Active",
    d.distribution || "",
    d.retentionYears || "",
    d.storage || "",
    d.notes || "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return "﻿" + csv; // BOM for Excel UTF-8
}

export function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
