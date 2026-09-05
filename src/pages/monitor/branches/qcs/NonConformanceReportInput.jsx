// src/pages/monitor/branches/qcs/NonConformanceReportInput.jsx
//
// Non-Conformance Report (NCR) — entry form.
//
// The sheet used to be a stack of black-bordered tables that copied the paper
// form cell for cell. It is now a set of numbered cards in the app's own light
// palette; the official document-control block is kept (an auditor still asks
// for Document No / Revision No) but folded away at the top instead of eating
// the first screen.
//
// Three rules the old form got wrong and this one gets right:
//
//  1. Location is a BRANCH, not free text. It is picked from the one master
//     branch list (inspectionBranches.js) and stored as a canonical code in
//     `payload.location` and `payload.branch`, so the reports view and every
//     branch filter in the app can group NCRs without guessing at spelling.
//  2. NC No. is allocated by the SERVER (`payload.refNo`, "AM-NCR-000042"),
//     never typed. Two people writing an NCR at the same moment can no longer
//     hand themselves the same number. Legacy records that carry a hand-typed
//     headRow.ncNo keep showing it.
//  3. An NCR is OPENED open. Only `status = Closed` requires the corrective
//     action and the final QA closure — before that the record saves freely,
//     which is the whole point of raising one.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getReportById,
  getReportRowByDate,
  payloadOf,
  reportId,
} from "../_shared/reportApi";
import {
  INSPECTION_BRANCHES,
  canonicalInspectionBranch,
  isKnownInspectionBranch,
} from "../../../inspection/inspectionBranches";

/* =========================
   API base (CRA + Vite safe)
========================= */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  typeof process !== "undefined" &&
  process.env &&
  process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try {
  VITE_URL = import.meta.env?.VITE_API_URL;
} catch {}

const API_BASE = String(VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ---- Defaults ---- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
const DEFAULT_TYPE = "qcs_non_conformance";
const DEFAULT_REPORTER = "qcs";
const DEFAULT_HEADER_LINE = "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS";
const MAX_EVIDENCE_IMAGES = 10;

const STATUSES = [
  { key: "Open",        en: "Open",        ar: "مفتوح",      color: "#dc2626" },
  { key: "In Progress", en: "In Progress", ar: "قيد التنفيذ", color: "#d97706" },
  { key: "Closed",      en: "Closed",      ar: "مغلق",       color: "#059669" },
];

const SOURCES = [
  { key: "inhouseQC",         en: "In-house QC",       ar: "فحص جودة داخلي" },
  { key: "customerComplaint", en: "Customer Complaint", ar: "شكوى عميل" },
  { key: "internalAudit",     en: "Internal Audit",     ar: "تدقيق داخلي" },
  { key: "externalAudit",     en: "External Audit",     ar: "تدقيق خارجي" },
];

/* =========================
   Images API
========================= */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}
async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

/* =========================
   Server helpers (NC only)
========================= */
async function fetchExistingNCByDate(dateStr, type) {
  const row = await getReportRowByDate(type || DEFAULT_TYPE, dateStr);
  return row ? { id: reportId(row), payload: payloadOf(row) } : null;
}
async function fetchExistingNCById(id) {
  if (!id) return null;
  const row = await getReportById(id);
  return row ? { id: reportId(row) || id, payload: payloadOf(row) } : null;
}

function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

/* =========================
   Stylesheet
   -------------------------
   globals.css sets `#root * { font-size: 14px !important }`, so every size
   here has to come from a selector that both outranks it and carries
   !important — hence the `#root .ncr` prefix on the type rules. The
   `:has()` line is the standard escape for the same file's
   `overflow-x: hidden`, which otherwise kills the sticky action bar.
========================= */
const NCR_CSS = `
html:has(.ncr), body:has(.ncr), #root:has(.ncr) { overflow-x: clip; }

#root .ncr {
  --ncr-bg:      #f1f6fb;
  --ncr-card:    #ffffff;
  --ncr-line:    #e2e8f0;
  --ncr-line-2:  #cbd5e1;
  --ncr-ink:     #0f172a;
  --ncr-muted:   #64748b;
  --ncr-accent:  #0284c7;
  --ncr-accent-soft: #e0f2fe;
  --ncr-danger:  #dc2626;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 12px 60px;
  color: var(--ncr-ink);
  font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif;
}

/* ---------- action bar ---------- */
#root .ncr .ncr-bar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 14px; margin-bottom: 14px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--ncr-line);
  border-radius: 16px;
  box-shadow: 0 6px 22px rgba(2,6,23,.08);
}
#root .ncr .ncr-bar-title { font-size: 18px !important; font-weight: 800; line-height: 1.15; }
#root .ncr .ncr-bar-title small { display: block; font-size: 12px !important; font-weight: 700; color: var(--ncr-muted); direction: rtl; }
#root .ncr .ncr-spacer { flex: 1 1 auto; }

#root .ncr .ncr-ref {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--ncr-accent-soft); color: #075985;
  border: 1px solid #bae6fd;
  font-weight: 800; font-size: 13px !important;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  letter-spacing: .3px;
}
#root .ncr .ncr-ref.is-pending { background: #f8fafc; color: var(--ncr-muted); border-color: var(--ncr-line); font-family: inherit; letter-spacing: 0; }

/* ---------- status stepper ---------- */
#root .ncr .ncr-steps { display: inline-flex; padding: 3px; gap: 3px; background: #f1f5f9; border: 1px solid var(--ncr-line); border-radius: 999px; }
#root .ncr .ncr-step {
  border: 0; cursor: pointer; border-radius: 999px;
  padding: 7px 14px; background: transparent; color: var(--ncr-muted);
  font-weight: 800; font-size: 13px !important; line-height: 1.1;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
}
#root .ncr .ncr-step small { font-size: 10px !important; font-weight: 700; opacity: .85; direction: rtl; }
#root .ncr .ncr-step[data-on="1"] { background: var(--step-color); color: #fff; box-shadow: 0 4px 12px rgba(2,6,23,.16); }

/* ---------- buttons ---------- */
#root .ncr .ncr-btn {
  border: 0; cursor: pointer; border-radius: 12px;
  padding: 10px 18px; font-weight: 800; font-size: 14px !important;
  background: var(--ncr-accent); color: #fff;
  box-shadow: 0 6px 16px rgba(2,132,199,.28);
}
#root .ncr .ncr-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
#root .ncr .ncr-btn.ghost { background: #fff; color: var(--ncr-ink); border: 1px solid var(--ncr-line-2); box-shadow: none; }
#root .ncr .ncr-btn.sky { background: #0ea5e9; }
#root .ncr .ncr-btn.small { padding: 7px 12px; font-size: 13px !important; }

/* ---------- cards ---------- */
#root .ncr .ncr-card {
  background: var(--ncr-card);
  border: 1px solid var(--ncr-line);
  border-radius: 18px;
  margin-bottom: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(2,6,23,.04);
}
#root .ncr .ncr-card-head {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--ncr-line);
  background: linear-gradient(180deg,#f8fbff,#f1f6fb);
}
#root .ncr .ncr-num {
  flex: 0 0 auto; width: 26px; height: 26px; border-radius: 9px;
  display: grid; place-items: center;
  background: var(--ncr-accent); color: #fff;
  font-weight: 900; font-size: 13px !important;
}
#root .ncr .ncr-card-title { font-size: 15px !important; font-weight: 800; line-height: 1.2; }
#root .ncr .ncr-card-title small { display: block; font-size: 12px !important; font-weight: 700; color: var(--ncr-muted); direction: rtl; }
#root .ncr .ncr-card-body { padding: 16px; }
#root .ncr .ncr-card.is-locked .ncr-num { background: var(--ncr-muted); }

#root .ncr .ncr-badge {
  margin-inline-start: auto;
  padding: 4px 10px; border-radius: 999px;
  font-size: 11px !important; font-weight: 800;
  background: #fef2f2; color: var(--ncr-danger); border: 1px solid #fecaca;
}
#root .ncr .ncr-badge.calm { background: #f1f5f9; color: var(--ncr-muted); border-color: var(--ncr-line); }

/* ---------- fields ---------- */
#root .ncr .ncr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
#root .ncr .ncr-grid.wide { grid-template-columns: 1fr; }
#root .ncr .ncr-f { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
#root .ncr .ncr-f.span2 { grid-column: span 2; }
#root .ncr .ncr-lbl { font-size: 12px !important; font-weight: 800; color: #334155; letter-spacing: .2px; }
#root .ncr .ncr-lbl span { color: var(--ncr-muted); font-weight: 700; }
#root .ncr .ncr-lbl b { color: var(--ncr-danger); }

#root .ncr input[type="text"],
#root .ncr input[type="date"],
#root .ncr select,
#root .ncr textarea {
  width: 100%; box-sizing: border-box;
  border: 1px solid var(--ncr-line-2); border-radius: 11px;
  padding: 11px 12px; background: #fff; color: var(--ncr-ink);
  font-size: 14px !important; font-weight: 600; font-family: inherit;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
#root .ncr textarea { min-height: 120px; resize: vertical; line-height: 1.55; font-weight: 500; }
#root .ncr input:focus, #root .ncr select:focus, #root .ncr textarea:focus {
  border-color: var(--ncr-accent); box-shadow: 0 0 0 3px rgba(2,132,199,.14);
}
#root .ncr input[readonly] { background: #f8fafc; color: var(--ncr-muted); font-family: ui-monospace, Menlo, Consolas, monospace; }
#root .ncr .is-missing input, #root .ncr .is-missing select, #root .ncr .is-missing textarea {
  border-color: #fca5a5; background: #fff7f7;
}
#root .ncr .ncr-hint { font-size: 11px !important; font-weight: 700; color: var(--ncr-muted); }

/* ---------- check / radio pills ---------- */
#root .ncr .ncr-pills { display: flex; flex-wrap: wrap; gap: 10px; }
#root .ncr .ncr-pill {
  display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  padding: 9px 14px; border-radius: 12px;
  border: 1px solid var(--ncr-line-2); background: #fff;
  font-size: 13px !important; font-weight: 700; line-height: 1.2;
}
#root .ncr .ncr-pill small { color: var(--ncr-muted); font-size: 11px !important; direction: rtl; }
#root .ncr .ncr-pill[data-on="1"] { border-color: var(--ncr-accent); background: var(--ncr-accent-soft); color: #075985; }
#root .ncr .ncr-pill[data-on="1"].bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
#root .ncr .ncr-pill[data-on="1"].good { border-color: #6ee7b7; background: #ecfdf5; color: #065f46; }
#root .ncr .ncr-pill input { width: 16px; height: 16px; accent-color: var(--ncr-accent); margin: 0; }

/* ---------- document control ---------- */
#root .ncr .ncr-doc { margin-bottom: 14px; border: 1px solid var(--ncr-line); border-radius: 16px; background: #fff; overflow: hidden; }
#root .ncr .ncr-doc > summary {
  list-style: none; cursor: pointer;
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  font-size: 13px !important; font-weight: 800; color: #334155;
}
#root .ncr .ncr-doc > summary::-webkit-details-marker { display: none; }
#root .ncr .ncr-doc-logo { height: 34px; width: auto; object-fit: contain; }
#root .ncr .ncr-doc-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 24px; padding: 4px 16px 16px; border-top: 1px solid var(--ncr-line); }
#root .ncr .ncr-doc-kv div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--ncr-line); font-size: 12px !important; }
#root .ncr .ncr-doc-kv div span:first-child { color: var(--ncr-muted); font-weight: 700; }
#root .ncr .ncr-doc-kv div span:last-child { font-weight: 800; }

/* ---------- guidance ---------- */
#root .ncr .ncr-guide {
  display: grid; gap: 5px; margin-bottom: 14px; padding: 12px 16px;
  border: 1px solid #fed7aa; background: #fff7ed; border-radius: 14px;
  color: #7c2d12; font-size: 12px !important; line-height: 1.5;
}
#root .ncr .ncr-guide b { font-size: 13px !important; }
#root .ncr .ncr-guide .ar { direction: rtl; text-align: right; font-weight: 700; }

/* ---------- evidence ---------- */
#root .ncr .ncr-shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin-top: 14px; }
#root .ncr .ncr-shot { position: relative; border: 1px solid var(--ncr-line); border-radius: 14px; overflow: hidden; background: #0b1220; }
#root .ncr .ncr-shot img { width: 100%; height: 150px; object-fit: cover; display: block; }
#root .ncr .ncr-shot .n { position: absolute; left: 8px; bottom: 8px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,.92); font-size: 11px !important; font-weight: 800; }
#root .ncr .ncr-shot .x { position: absolute; top: 8px; right: 8px; border: 0; cursor: pointer; padding: 5px 9px; border-radius: 10px; background: rgba(220,38,38,.95); color: #fff; font-size: 11px !important; font-weight: 800; }
#root .ncr .ncr-empty { padding: 22px; text-align: center; border: 1px dashed var(--ncr-line-2); border-radius: 14px; color: var(--ncr-muted); font-size: 13px !important; font-weight: 700; }

/* ---------- footer ---------- */
#root .ncr .ncr-foot { margin-top: 6px; padding: 14px; text-align: center; border-radius: 14px; background: #f8fafc; border: 1px solid var(--ncr-line); font-size: 12px !important; font-weight: 700; color: #475569; }
#root .ncr .ncr-msg { font-size: 13px !important; font-weight: 800; }

@media (max-width: 640px) {
  #root .ncr .ncr-bar { position: static; }
  #root .ncr .ncr-f.span2 { grid-column: span 1; }
}
@media print {
  #root .ncr .ncr-bar, #root .ncr .ncr-btn { display: none !important; }
  #root .ncr .ncr-card { break-inside: avoid; box-shadow: none; }
}
`;

/* =========================
   Small building blocks
========================= */
function Card({ n, en, ar, badge, badgeCalm, locked, children }) {
  return (
    <section className={`ncr-card${locked ? " is-locked" : ""}`}>
      <header className="ncr-card-head">
        <div className="ncr-num">{n}</div>
        <div className="ncr-card-title">
          {en}
          <small>{ar}</small>
        </div>
        {badge ? <div className={`ncr-badge${badgeCalm ? " calm" : ""}`}>{badge}</div> : null}
      </header>
      <div className="ncr-card-body">{children}</div>
    </section>
  );
}

function Field({ en, ar, required, hint, missing, span2, children }) {
  return (
    <label className={`ncr-f${span2 ? " span2" : ""}${missing ? " is-missing" : ""}`}>
      <div className="ncr-lbl">
        {en} {required ? <b>*</b> : null} <span>— {ar}</span>
      </div>
      {children}
      {hint ? <div className="ncr-hint">{hint}</div> : null}
    </label>
  );
}

function Pill({ on, tone, onClick, type = "checkbox", en, ar }) {
  return (
    <label className={`ncr-pill${tone ? ` ${tone}` : ""}`} data-on={on ? "1" : "0"}>
      <input type={type} checked={!!on} onChange={onClick} />
      <span>
        {en} {ar ? <small>{ar}</small> : null}
      </span>
    </label>
  );
}

/* =========================
   Component
========================= */
export default function NonConformanceReportInput(props) {
  const {
    logoUrl,
    type: typeProp,
    reporter: reporterProp,
    headerLine,
    defaultBranch,
    bilingual = false,
  } = props || {};
  const TYPE = typeProp || DEFAULT_TYPE;
  const REPORTER = reporterProp || DEFAULT_REPORTER;
  const HEADER_LINE = headerLine || DEFAULT_HEADER_LINE;

  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get("date");
  const queryReportId = searchParams.get("reportId");

  const evidenceInputRef = useRef(null);

  const [header] = useState({
    documentTitle: "NC Report",
    documentNo: "TELL/QA/NC/1",
    issueDate: "30/09/2023",
    revisionNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "QC",
    approvedBy: "Hussam O. Sarhan",
  });

  const [dateISO, setDateISO] = useState(() =>
    isISODate(queryDate) ? queryDate : todayDubaiISO()
  );

  const [location, setLocation] = useState(defaultBranch || "");
  const [refNo, setRefNo] = useState("");       // server-allocated, read-only
  const [legacyNcNo, setLegacyNcNo] = useState(""); // hand-typed number on old records
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [sources, setSources] = useState({
    inhouseQC: false,
    customerComplaint: false,
    internalAudit: false,
    externalAudit: false,
  });

  const [details, setDetails] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [department, setDepartment] = useState("");

  const [implementationOwner, setImplementationOwner] = useState("");
  const [targetCompletionDateISO, setTargetCompletionDateISO] = useState("");
  const [status, setStatus] = useState("Open");

  const [evidenceImages, setEvidenceImages] = useState([]);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceMsg, setEvidenceMsg] = useState("");

  const [verification, setVerification] = useState("Satisfactory");
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [verifiedByQADateISO, setVerifiedByQADateISO] = useState("");
  const [qaVerificationResult, setQaVerificationResult] = useState("Satisfactory");
  const [followupActionsRequired, setFollowupActionsRequired] = useState("");
  const [followupResponsible, setFollowupResponsible] = useState("");
  const [followupTargetDateISO, setFollowupTargetDateISO] = useState("");
  const [closureDateISO, setClosureDateISO] = useState("");

  const [finalQaName, setFinalQaName] = useState("");
  const [finalQaDateISO, setFinalQaDateISO] = useState("");
  const [finalQaApproved, setFinalQaApproved] = useState(false);

  const [signature, setSignature] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsibleSignature, setResponsibleSignature] = useState("");

  const [opMsg, setOpMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false); // show red outlines only after a failed save
  const [editingReportId, setEditingReportId] = useState(queryReportId || "");

  /* A deliberate blank sheet. Several NCRs can share one day (one per branch,
     or two on the same branch), but the by-date lookup below can only return
     the newest — so "New report" has to switch that lookup off, otherwise the
     effect would immediately pull the old record back over the blank form. */
  const [draftNew, setDraftNew] = useState(false);

  /* ---- Closing an NCR is the only state with extra requirements ---- */
  const closing = status === "Closed";
  const missing = useMemo(() => {
    const m = {};
    if (!dateISO) m.date = true;
    if (!location.trim()) m.location = true;
    if (!details.trim()) m.details = true;
    if (closing) {
      if (!correctiveAction.trim()) m.correctiveAction = true;
      if (!finalQaName.trim()) m.finalQaName = true;
      if (!finalQaDateISO) m.finalQaDate = true;
      if (!finalQaApproved) m.finalQaApproved = true;
    }
    return m;
  }, [dateISO, location, details, closing, correctiveAction, finalQaName, finalQaDateISO, finalQaApproved]);

  /* Branch options: the master list, plus whatever a legacy record already
     carries so an old free-text location never silently disappears. */
  const branchOptions = useMemo(() => {
    const list = INSPECTION_BRANCHES.map((b) => ({
      code: b.code,
      label: `${b.icon}  ${b.labelEn}`,
    }));
    if (location && !isKnownInspectionBranch(location)) {
      list.unshift({ code: location, label: `⚠️  ${location} (legacy)` });
    }
    return list;
  }, [location]);

  useEffect(() => {
    if (isISODate(queryDate)) setDateISO(queryDate);
  }, [queryDate]);

  useEffect(() => {
    setEditingReportId(queryReportId || "");
  }, [queryReportId]);

  /* ---- Load the record for the chosen date / id ---- */
  useEffect(() => {
    let cancelled = false;

    function applyPayload(payload = {}) {
      const head = payload.headRow || {};
      const reference = payload.reference || {};
      const extras = payload.correctiveActionExtras || {};
      const evidence = extras.evidence || {};
      const qa = payload.qaVerification || {};
      const finalQa = payload.finalQaClosure || {};
      const sig = payload.signature || {};

      const rawLoc = payload.branch || payload.location || "";
      const code = canonicalInspectionBranch(rawLoc);
      setLocation(code || defaultBranch || "");
      setRefNo(payload.refNo || "");
      setLegacyNcNo(payload.refNo ? "" : head.ncNo || "");
      setIssuedTo(head.issuedTo || "");
      setIssuedBy(head.issuedBy || "");
      setSources({
        inhouseQC: !!reference.inhouseQC,
        customerComplaint: !!reference.customerComplaint,
        internalAudit: !!reference.internalAudit,
        externalAudit: !!reference.externalAudit,
      });
      setDetails(payload.detailsBlock || "");
      setCorrectiveAction(payload.correctiveAction || "");
      setImplementationOwner(extras.implementationOwner || "");
      setTargetCompletionDateISO(extras.targetCompletionDateISO || "");
      setStatus(extras.status || "Open");
      setEvidenceImages(
        Array.isArray(evidence.images) ? evidence.images.slice(0, MAX_EVIDENCE_IMAGES) : []
      );
      setPerformedBy(payload.performedBy || "");
      setDepartment(payload.department || "");
      setVerification(payload.verificationOfCorrectiveAction || "Satisfactory");
      setVerifiedByQA(qa.verifiedByQA || "");
      setVerifiedByQADateISO(qa.dateISO || "");
      setQaVerificationResult(qa.result || "Satisfactory");
      setFollowupActionsRequired(qa.followupActionsRequired || "");
      setFollowupResponsible(qa.followupResponsible || "");
      setFollowupTargetDateISO(qa.followupTargetDateISO || "");
      setClosureDateISO(qa.closureDateISO || "");
      setFinalQaName(finalQa.name || "");
      setFinalQaDateISO(finalQa.dateISO || "");
      setFinalQaApproved(!!finalQa.approved);
      setSignature(sig.signature || "");
      setSignatureDate(sig.date || "");
      setResponsiblePerson(sig.responsiblePerson || "");
      setResponsibleSignature(sig.responsibleSignature || "");
      setTouched(false);
    }

    (async () => {
      if (!dateISO || draftNew) return;
      if (editingReportId && dateISO !== queryDate) return;
      const existing = editingReportId
        ? await fetchExistingNCById(editingReportId)
        : await fetchExistingNCByDate(dateISO, TYPE);
      if (cancelled) return;
      applyPayload(existing?.payload || {});
      if (existing?.id) {
        setEditingReportId(existing.id);
        setOpMsg(`Loaded the report saved on ${dateISO}.`);
        setTimeout(() => setOpMsg(""), 2500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateISO, TYPE, editingReportId, queryDate, draftNew, defaultBranch]);

  const monthText = useMemo(() => {
    const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [dateISO]);

  /* ---- Evidence ---- */
  async function addEvidenceImagesFromFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    const remaining = MAX_EVIDENCE_IMAGES - evidenceImages.length;
    if (remaining <= 0) return alert(`Maximum ${MAX_EVIDENCE_IMAGES} images.`);

    const toUpload = files.slice(0, remaining);

    try {
      setEvidenceBusy(true);
      setEvidenceMsg("Uploading…");

      const urls = [];
      for (const f of toUpload) {
        if (!String(f.type || "").startsWith("image/")) continue;
        try {
          const url = await uploadViaServer(f);
          if (url) urls.push(url);
        } catch (e) {
          console.error(e);
        }
      }

      if (urls.length) {
        setEvidenceImages((prev) => [...prev, ...urls].slice(0, MAX_EVIDENCE_IMAGES));
        setEvidenceMsg(`Uploaded ${urls.length} image(s).`);
      } else {
        setEvidenceMsg("No images uploaded.");
      }
    } finally {
      setEvidenceBusy(false);
      setTimeout(() => setEvidenceMsg(""), 2500);
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
    }
  }

  async function removeEvidenceImageAt(index) {
    const url = evidenceImages[index];
    if (!url) return;
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
    try {
      await deleteImage(url);
      setEvidenceMsg("Image removed.");
    } catch (e) {
      console.error(e);
      setEvidenceMsg("Removed locally (server delete failed).");
    } finally {
      setTimeout(() => setEvidenceMsg(""), 2200);
    }
  }

  /* ---- Status ---- */
  function chooseStatus(next) {
    setStatus(next);
    // Closing without a closure date is the commonest omission — prefill it.
    if (next === "Closed" && !closureDateISO) setClosureDateISO(todayDubaiISO());
  }

  function startNewReport() {
    if (
      details.trim() &&
      !window.confirm("Start a blank NCR? Anything not saved on this one is lost.")
    ) {
      return;
    }
    setDraftNew(true);
    setEditingReportId("");
    setRefNo("");
    setLegacyNcNo("");
    setLocation(defaultBranch || "");
    setIssuedTo("");
    setIssuedBy("");
    setSources({ inhouseQC: false, customerComplaint: false, internalAudit: false, externalAudit: false });
    setDetails("");
    setCorrectiveAction("");
    setImplementationOwner("");
    setTargetCompletionDateISO("");
    setStatus("Open");
    setEvidenceImages([]);
    setPerformedBy("");
    setDepartment("");
    setVerification("Satisfactory");
    setVerifiedByQA("");
    setVerifiedByQADateISO("");
    setQaVerificationResult("Satisfactory");
    setFollowupActionsRequired("");
    setFollowupResponsible("");
    setFollowupTargetDateISO("");
    setClosureDateISO("");
    setFinalQaName("");
    setFinalQaDateISO("");
    setFinalQaApproved(false);
    setSignature("");
    setSignatureDate("");
    setResponsiblePerson("");
    setResponsibleSignature("");
    setTouched(false);
    setOpMsg("New blank NCR — it gets its number when you save.");
    setTimeout(() => setOpMsg(""), 3000);
  }

  /* ---- Save ---- */
  async function saveNCToServer() {
    const keys = Object.keys(missing);
    if (keys.length) {
      setTouched(true);
      const first = {
        date: "Pick the report date.",
        location: "Pick the branch.",
        details: "Describe the non-conformance.",
        correctiveAction: "Closing an NCR needs the corrective action written down.",
        finalQaName: "Closing an NCR needs the QA name.",
        finalQaDate: "Closing an NCR needs the closure date.",
        finalQaApproved: "Closing an NCR needs the QA approval ticked.",
      }[keys[0]];
      alert(first);
      return;
    }

    const payload = {
      headerTop: header,
      title: "TRANS EMIRATES LIVESTOCK LLC • NON-CONFORMANCE REPORT",
      // Canonical branch code, written to both keys: `location` is what the
      // NCR view and the Excel export already read, `branch` is what every
      // branch filter in the app reads.
      location,
      branch: location,
      headRow: {
        reportDate: dateISO,
        ncNo: refNo || legacyNcNo,  // display copy; the server owns payload.refNo
        issuedTo,
        issuedBy,
      },
      reference: { ...sources },
      detailsBlock: details,
      correctiveAction,
      correctiveActionExtras: {
        implementationOwner,
        targetCompletionDateISO,
        status,
        evidence: { images: evidenceImages },
      },
      performedBy,
      department,
      verificationOfCorrectiveAction: verification,
      qaVerification: {
        verifiedByQA,
        dateISO: verifiedByQADateISO,
        result: qaVerificationResult,
        followupActionsRequired,
        followupResponsible,
        followupTargetDateISO,
        closureDateISO,
      },
      finalQaClosure: {
        note: "electronically approved; no signature required",
        name: finalQaName,
        dateISO: finalQaDateISO,
        approved: finalQaApproved,
      },
      signature: {
        signature,
        date: signatureDate,
        responsiblePerson,
        responsibleSignature,
      },
      month: monthText,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setOpMsg("Saving…");

      // A blank sheet always creates; anything else updates the row it loaded.
      const existing = draftNew
        ? null
        : editingReportId
        ? { id: editingReportId }
        : await fetchExistingNCByDate(dateISO, TYPE);

      const body = { reporter: REPORTER, type: TYPE, payload };

      const res = await fetch(
        existing?.id
          ? `${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`
          : `${API_BASE}/api/reports`,
        {
          method: existing?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) || "Failed to save NC report");
      }

      /* The server answers { ok, report } — `report.payload.refNo` is the
         number it just allocated (or kept, on an update). Read it back so the
         NC No. on screen stops saying "assigned on save". */
      const saved = await res.json().catch(() => null);
      const row = saved?.report || saved?.data || saved;
      const savedId = row?.id || row?._id;
      const savedRef = row?.payload?.refNo;
      if (savedId) setEditingReportId(String(savedId));
      if (savedRef) setRefNo(String(savedRef));
      setDraftNew(false);

      setOpMsg(savedRef ? `Saved — ${savedRef}` : `Saved for ${dateISO}.`);
    } catch (e) {
      console.error(e);
      setOpMsg(`Failed: ${e.message || e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 3500);
    }
  }

  const show = (k) => touched && !!missing[k];
  const statusMeta = STATUSES.find((s) => s.key === status) || STATUSES[0];

  return (
    <div className="ncr">
      <style>{NCR_CSS}</style>

      {/* ─── action bar ─── */}
      <div className="ncr-bar">
        <div className="ncr-bar-title">
          🚫 Non-Conformance Report
          <small>تقرير عدم المطابقة</small>
        </div>

        <div className={`ncr-ref${refNo ? "" : " is-pending"}`} title="NC No. — allocated by the server">
          {refNo || legacyNcNo || "No. assigned on save"}
        </div>

        <div className="ncr-steps">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="ncr-step"
              data-on={status === s.key ? "1" : "0"}
              style={{ "--step-color": s.color }}
              onClick={() => chooseStatus(s.key)}
            >
              {s.en}
              <small>{s.ar}</small>
            </button>
          ))}
        </div>

        <div className="ncr-spacer" />

        <button type="button" className="ncr-btn ghost small" onClick={startNewReport}>
          ➕ New NCR
        </button>
        <button type="button" className="ncr-btn" onClick={saveNCToServer} disabled={saving}>
          {saving ? "Saving…" : "💾 Save"}
        </button>

        {opMsg ? <div className="ncr-msg" style={{ width: "100%" }}>{opMsg}</div> : null}
      </div>

      {/* ─── document control (folded) ─── */}
      <details className="ncr-doc">
        <summary>
          <img
            className="ncr-doc-logo"
            src={logoUrl || LOGO_FALLBACK}
            alt="Al Mawashi"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <span>
            {HEADER_LINE} · {header.documentNo} · Rev {header.revisionNo}
          </span>
          <span style={{ marginInlineStart: "auto", color: "#64748b" }}>Document control ▾</span>
        </summary>
        <div className="ncr-doc-kv">
          <div><span>Document Title</span><span>{header.documentTitle}</span></div>
          <div><span>Document No</span><span>{header.documentNo}</span></div>
          <div><span>Issue Date</span><span>{header.issueDate}</span></div>
          <div><span>Revision No</span><span>{header.revisionNo}</span></div>
          <div><span>Area</span><span>{header.area}</span></div>
          <div><span>Issued By</span><span>{header.issuedBy}</span></div>
          <div><span>Controlling Officer</span><span>{header.controllingOfficer}</span></div>
          <div><span>Approved By</span><span>{header.approvedBy}</span></div>
        </div>
      </details>

      {bilingual ? (
        <div className="ncr-guide">
          <b>Operational guidance / ملاحظات تشغيلية</b>
          <div>Describe the nonconformance clearly: what happened, where, date/time, affected product/area, and immediate containment.</div>
          <div className="ar">اشرح عدم المطابقة بوضوح: ماذا حدث، أين، التاريخ/الوقت، المنتج أو المنطقة المتأثرة، وإجراء الاحتواء الفوري.</div>
          <div>Corrective action must remove the cause, assign an owner, set a target date, and verify effectiveness before closure.</div>
          <div className="ar">الإجراء التصحيحي يجب أن يزيل السبب، يحدد المسؤول، يضع تاريخًا مستهدفًا، ويتم التحقق من فعاليته قبل الإغلاق.</div>
        </div>
      ) : null}

      {/* ─── ① identification ─── */}
      <Card n="1" en="Identification" ar="التعريف">
        <div className="ncr-grid">
          <Field en="Branch / Location" ar="الفرع" required missing={show("location")}>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">— pick a branch —</option>
              {branchOptions.map((b) => (
                <option key={b.code} value={b.code}>{b.label}</option>
              ))}
            </select>
          </Field>

          <Field en="Report Date" ar="تاريخ التقرير" required missing={show("date")}>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => { setDraftNew(false); setDateISO(e.target.value); }}
            />
          </Field>

          <Field
            en="NC No."
            ar="رقم عدم المطابقة"
            hint={refNo ? "Allocated by the server — cannot be edited." : "Allocated automatically when you save."}
          >
            <input type="text" readOnly value={refNo || legacyNcNo || "— on save —"} />
          </Field>

          <Field en="Issued to" ar="موجّه إلى">
            <input
              type="text"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
              placeholder="Name / Department"
            />
          </Field>

          <Field en="Issued by" ar="أصدره">
            <input
              type="text"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="Name"
            />
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="ncr-lbl" style={{ marginBottom: 8 }}>
            Raised from <span>— مصدر عدم المطابقة</span>
          </div>
          <div className="ncr-pills">
            {SOURCES.map((s) => (
              <Pill
                key={s.key}
                en={s.en}
                ar={s.ar}
                on={sources[s.key]}
                onClick={() => setSources((p) => ({ ...p, [s.key]: !p[s.key] }))}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* ─── ② description ─── */}
      <Card n="2" en="What went wrong" ar="وصف عدم المطابقة" badge="Required" >
        <div className="ncr-grid wide">
          <Field
            en="Nonconformance / Report Details"
            ar="تفاصيل عدم المطابقة"
            required
            missing={show("details")}
            hint="What happened, where, when, which product or area, and what was done immediately to contain it."
          >
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Write details here…"
            />
          </Field>
        </div>
      </Card>

      {/* ─── ③ corrective action ─── */}
      <Card
        n="3"
        en="Corrective Action"
        ar="الإجراء التصحيحي"
        badge={closing ? "Required to close" : "Fill as work progresses"}
        badgeCalm={!closing}
      >
        <div className="ncr-grid wide">
          <Field
            en="Corrective Action"
            ar="الإجراء التصحيحي"
            required={closing}
            missing={show("correctiveAction")}
            hint="Remove the cause, not only the symptom."
          >
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Corrective action…"
              style={{ minHeight: 100 }}
            />
          </Field>
        </div>

        <div className="ncr-grid" style={{ marginTop: 14 }}>
          <Field en="Implementation Owner" ar="مسؤول التنفيذ">
            <input
              type="text"
              value={implementationOwner}
              onChange={(e) => setImplementationOwner(e.target.value)}
              placeholder="Responsible person"
            />
          </Field>
          <Field en="Target Completion Date" ar="تاريخ الإنجاز المستهدف">
            <input
              type="date"
              value={targetCompletionDateISO}
              onChange={(e) => setTargetCompletionDateISO(e.target.value)}
            />
          </Field>
          <Field en="Performed by" ar="نُفّذ بواسطة">
            <input
              type="text"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="Name"
            />
          </Field>
          <Field en="Department" ar="القسم">
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Department"
            />
          </Field>
        </div>
      </Card>

      {/* ─── ④ evidence ─── */}
      <Card
        n="4"
        en="Evidence"
        ar="الأدلة والمرفقات"
        badge={`${evidenceImages.length}/${MAX_EVIDENCE_IMAGES} images`}
        badgeCalm
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ncr-btn sky small"
            onClick={() => evidenceInputRef.current?.click()}
            disabled={evidenceBusy || evidenceImages.length >= MAX_EVIDENCE_IMAGES}
          >
            ⬆️ Upload images
          </button>
          <button
            type="button"
            className="ncr-btn ghost small"
            onClick={() => {
              if (!evidenceImages.length) return;
              if (!window.confirm("Remove all evidence images?")) return;
              setEvidenceImages([]);
            }}
          >
            Clear all
          </button>
          <input
            ref={evidenceInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addEvidenceImagesFromFiles(e.target.files)}
          />
          {evidenceMsg ? <div className="ncr-msg">{evidenceMsg}</div> : null}
        </div>

        {evidenceImages.length === 0 ? (
          <div className="ncr-empty" style={{ marginTop: 14 }}>
            No evidence images yet — لا توجد صور أدلة بعد
          </div>
        ) : (
          <div className="ncr-shots">
            {evidenceImages.map((src, i) => (
              <div className="ncr-shot" key={src + i}>
                <img src={src} alt={`evidence-${i + 1}`} />
                <div className="n">#{i + 1}</div>
                <button type="button" className="x" onClick={() => removeEvidenceImageAt(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ─── ⑤ QA verification ─── */}
      <Card n="5" en="QA Verification" ar="التحقق من الجودة" badge="Quality only" badgeCalm>
        <div className="ncr-grid">
          <Field en="Verified by (QA)" ar="تحقق بواسطة الجودة">
            <input
              type="text"
              value={verifiedByQA}
              onChange={(e) => setVerifiedByQA(e.target.value)}
              placeholder="Name"
            />
          </Field>
          <Field en="Verification Date" ar="تاريخ التحقق">
            <input
              type="date"
              value={verifiedByQADateISO}
              onChange={(e) => setVerifiedByQADateISO(e.target.value)}
            />
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="ncr-lbl" style={{ marginBottom: 8 }}>
            Verification of Corrective Action <span>— التحقق من الإجراء التصحيحي</span>
          </div>
          <div className="ncr-pills">
            <Pill
              type="radio"
              en="Satisfactory"
              ar="مرضي"
              tone="good"
              on={verification === "Satisfactory"}
              onClick={() => setVerification("Satisfactory")}
            />
            <Pill
              type="radio"
              en="Not Satisfactory"
              ar="غير مرضي"
              tone="bad"
              on={verification === "Not Satisfactory"}
              onClick={() => setVerification("Not Satisfactory")}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="ncr-lbl" style={{ marginBottom: 8 }}>
            QA Verification Result <span>— نتيجة تحقق الجودة</span>
          </div>
          <div className="ncr-pills">
            <Pill
              type="radio"
              en="Satisfactory"
              ar="مرضي"
              tone="good"
              on={qaVerificationResult === "Satisfactory"}
              onClick={() => setQaVerificationResult("Satisfactory")}
            />
            <Pill
              type="radio"
              en="Not Satisfactory"
              ar="غير مرضي"
              tone="bad"
              on={qaVerificationResult === "Not Satisfactory"}
              onClick={() => setQaVerificationResult("Not Satisfactory")}
            />
          </div>
        </div>

        {/* Follow-up only exists because the result was not satisfactory — so it
            only appears then, instead of sitting empty on every report. */}
        {qaVerificationResult === "Not Satisfactory" ? (
          <div className="ncr-grid" style={{ marginTop: 16 }}>
            <Field en="Follow-up Actions Required" ar="إجراءات المتابعة المطلوبة" span2>
              <input
                type="text"
                value={followupActionsRequired}
                onChange={(e) => setFollowupActionsRequired(e.target.value)}
                placeholder="Write actions…"
              />
            </Field>
            <Field en="Follow-up Responsible" ar="مسؤول المتابعة">
              <input
                type="text"
                value={followupResponsible}
                onChange={(e) => setFollowupResponsible(e.target.value)}
                placeholder="Name"
              />
            </Field>
            <Field en="Follow-up Target Date" ar="تاريخ المتابعة المستهدف">
              <input
                type="date"
                value={followupTargetDateISO}
                onChange={(e) => setFollowupTargetDateISO(e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Card>

      {/* ─── ⑥ closure ─── */}
      <Card
        n="6"
        en="Final QA Closure"
        ar="الإغلاق النهائي من الجودة"
        locked={!closing}
        badge={closing ? "Required" : "Only when status = Closed"}
        badgeCalm={!closing}
      >
        {!closing ? (
          <div className="ncr-empty" style={{ marginBottom: 16 }}>
            The NCR is <b>{statusMeta.en}</b> — leave this section empty until the finding is
            actually resolved, then set the status to <b>Closed</b>.
            <div style={{ direction: "rtl", marginTop: 6 }}>
              التقرير <b>{statusMeta.ar}</b> — اتركه فارغاً لحين حل المخالفة، وبعدها اضبط الحالة على «مغلق».
            </div>
          </div>
        ) : null}

        <div className="ncr-grid">
          <Field en="Closure Date" ar="تاريخ الإغلاق">
            <input
              type="date"
              value={closureDateISO}
              onChange={(e) => setClosureDateISO(e.target.value)}
            />
          </Field>
          <Field
            en="QA Name (Sign/Approve)"
            ar="اسم مسؤول الجودة"
            required={closing}
            missing={show("finalQaName")}
          >
            <input
              type="text"
              value={finalQaName}
              onChange={(e) => setFinalQaName(e.target.value)}
              placeholder="QA name"
            />
          </Field>
          <Field
            en="Approval Date"
            ar="تاريخ الاعتماد"
            required={closing}
            missing={show("finalQaDate")}
          >
            <input
              type="date"
              value={finalQaDateISO}
              onChange={(e) => setFinalQaDateISO(e.target.value)}
            />
          </Field>
          <div className={`ncr-f${show("finalQaApproved") ? " is-missing" : ""}`}>
            <div className="ncr-lbl">
              Approve {closing ? <b>*</b> : null} <span>— اعتماد</span>
            </div>
            <div className="ncr-pills">
              <Pill
                en="Approved"
                ar="معتمد"
                tone="good"
                on={finalQaApproved}
                onClick={(e) => {
                  const on = e.target.checked;
                  setFinalQaApproved(on);
                  if (on && !finalQaDateISO) setFinalQaDateISO(todayDubaiISO());
                }}
              />
            </div>
          </div>
        </div>

        <div className="ncr-grid" style={{ marginTop: 16 }}>
          <Field en="Signature" ar="التوقيع">
            <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} />
          </Field>
          <Field en="Signature Date" ar="تاريخ التوقيع">
            <input
              type="text"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              placeholder="dd/mm/yyyy"
            />
          </Field>
          <Field en="Responsible Person" ar="الشخص المسؤول">
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
            />
          </Field>
          <Field en="Responsible Signature" ar="توقيع المسؤول">
            <input
              type="text"
              value={responsibleSignature}
              onChange={(e) => setResponsibleSignature(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="ncr-foot">
        معتمد إلكترونياً؛ لا حاجة للتوقيع — Electronically approved; no signature required.
      </div>
    </div>
  );
}
