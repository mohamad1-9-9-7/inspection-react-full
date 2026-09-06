// src/pages/monitor/branches/qcs/ncrEmailConfig.js
//
// Config for the shared EmailSendModal, customised for the Non-Conformance
// Report — same modal the Returns log uses, so recipients, templates,
// classification, auto-routing and the /api/email-history audit trail all
// behave identically here.
//
// The PDF is generated standalone (jsPDF + autoTable) rather than screenshotted
// from the DOM: the mail must be sendable from anywhere, not only while the
// report card happens to be rendered.

import { escapeHtml } from "../../../shared/emailReportUtils";
import { getInspectionBranchLabel } from "../../../inspection/inspectionBranches";

const DEFAULT_INTRO =
  "Dear {name},\n\nPlease find attached Non-Conformance Report {ncNo} raised at {branch} on {date}.\n" +
  "Kindly review the finding and confirm the corrective action by the target date shown below.";

/* `2026-09-05` → `05/09/2026`; anything else passes through untouched. */
function toDMY(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : s;
}

const SOURCE_LABEL = {
  inhouseQC: "In-house QC",
  customerComplaint: "Customer Complaint",
  internalAudit: "Internal Audit",
  externalAudit: "External Audit",
};

/* Everything the subject, body and PDF need, read once from the payload so the
   three of them can never disagree about what the report says. */
export function ncrMeta(payload) {
  const p = payload || {};
  const head = p.headRow || {};
  const extras = p.correctiveActionExtras || {};
  const qa = p.qaVerification || {};
  const finalQa = p.finalQaClosure || {};

  const branchCode = p.branch || p.location || "";
  const status = extras.status || "Open";

  return {
    ncNo: p.refNo || head.ncNo || "—",
    branchCode,
    branch: branchCode ? getInspectionBranchLabel(branchCode) : "—",
    date: head.reportDate || "",
    issuedTo: head.issuedTo || "",
    issuedBy: head.issuedBy || "",
    sources: Object.keys(SOURCE_LABEL).filter((k) => p.reference?.[k]).map((k) => SOURCE_LABEL[k]),
    details: p.detailsBlock || "",
    correctiveAction: p.correctiveAction || "",
    owner: extras.implementationOwner || "",
    targetDate: extras.targetCompletionDateISO || "",
    status,
    isClosed: status === "Closed",
    images: Array.isArray(extras.evidence?.images) ? extras.evidence.images.filter(Boolean) : [],
    performedBy: p.performedBy || "",
    department: p.department || "",
    verification: p.verificationOfCorrectiveAction || "",
    qaBy: qa.verifiedByQA || "",
    qaDate: qa.dateISO || "",
    qaResult: qa.result || "",
    followup: qa.followupActionsRequired || "",
    followupBy: qa.followupResponsible || "",
    followupTarget: qa.followupTargetDateISO || "",
    closureDate: qa.closureDateISO || "",
    finalQaName: finalQa.name || "",
    finalQaDate: finalQa.dateISO || "",
    finalQaApproved: !!finalQa.approved,
    docNo: p.headerTop?.documentNo || "",
    revision: p.headerTop?.revisionNo || "",
  };
}

/* ============================================================
   PDF
============================================================ */
export async function generateNcrPdf(payload) {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTable = autoTableMod.autoTable || autoTableMod.default;

  const m = ncrMeta(payload);
  const pdf = new JsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 36;

  /* Header band — the status is the first thing a reader should see. */
  const statusColor = m.isClosed ? [5, 150, 105] : m.status === "In Progress" ? [217, 119, 6] : [220, 38, 38];
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 62, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold").setFontSize(15);
  pdf.text("NON-CONFORMANCE REPORT", M, 27);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  pdf.text(
    `${m.ncNo}   ·   ${m.branch}   ·   ${toDMY(m.date)}${m.docNo ? `   ·   ${m.docNo} Rev ${m.revision}` : ""}`,
    M,
    44
  );
  pdf.setFillColor(...statusColor);
  pdf.roundedRect(W - M - 96, 18, 96, 26, 6, 6, "F");
  pdf.setFont("helvetica", "bold").setFontSize(11);
  pdf.text(String(m.status).toUpperCase(), W - M - 48, 35, { align: "center" });
  pdf.setTextColor(15, 23, 42);

  const kv = (label, value) => [label, String(value || "—")];
  let y = 78;

  const section = (title, rows, colWidth = 120) => {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows,
      theme: "grid",
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", lineColor: [226, 232, 240] },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9.5 },
      columnStyles: { 0: { cellWidth: colWidth, fontStyle: "bold", fillColor: [248, 250, 252] } },
    });
    y = pdf.lastAutoTable.finalY + 12;
  };

  section("IDENTIFICATION", [
    kv("NC No.", m.ncNo),
    kv("Branch / Location", m.branch),
    kv("Report Date", toDMY(m.date)),
    kv("Issued to", m.issuedTo),
    kv("Issued by", m.issuedBy),
    kv("Raised from", m.sources.join(", ")),
  ]);

  section("NONCONFORMANCE DETAILS", [kv("Description", m.details)]);

  section("CORRECTIVE ACTION", [
    kv("Action", m.correctiveAction),
    kv("Implementation Owner", m.owner),
    kv("Target Completion", toDMY(m.targetDate)),
    kv("Performed by", m.performedBy),
    kv("Department", m.department),
    kv("Status", m.status),
  ]);

  const qaRows = [
    kv("Verified by (QA)", m.qaBy),
    kv("Verification Date", toDMY(m.qaDate)),
    kv("Verification of Action", m.verification),
    kv("QA Result", m.qaResult),
  ];
  if (m.qaResult === "Not Satisfactory") {
    qaRows.push(
      kv("Follow-up Actions", m.followup),
      kv("Follow-up Responsible", m.followupBy),
      kv("Follow-up Target", toDMY(m.followupTarget))
    );
  }
  section("QA VERIFICATION", qaRows);

  /* A report still open has no closure to print — saying so beats four blanks. */
  if (m.isClosed) {
    section("FINAL QA CLOSURE", [
      kv("Closure Date", toDMY(m.closureDate)),
      kv("QA Name", m.finalQaName),
      kv("Approval Date", toDMY(m.finalQaDate)),
      kv("Approved", m.finalQaApproved ? "YES — electronically approved" : "NO"),
    ]);
  } else {
    section("FINAL QA CLOSURE", [kv("Status", `Not closed yet — the NCR is ${m.status}.`)]);
  }

  if (m.images.length) {
    section("EVIDENCE", [kv("Attached images", `${m.images.length} image(s) attached to this e-mail`)]);
  }

  pdf.setFontSize(8).setTextColor(120, 130, 145);
  pdf.text(
    "Electronically approved; no signature required — معتمد إلكترونياً؛ لا حاجة للتوقيع",
    W / 2,
    pdf.internal.pageSize.getHeight() - 20,
    { align: "center" }
  );

  const blob = pdf.output("blob");
  const base64 = pdf.output("datauristring").split(",")[1];
  const safeRef = String(m.ncNo).replace(/[^A-Za-z0-9_-]+/g, "-");
  return { blob, base64, filename: `NCR_${safeRef}_${m.date || ""}.pdf` };
}

/* ============================================================
   Message bodies
============================================================ */
function row(label, value) {
  if (!value) return "";
  return `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:190px">${escapeHtml(
    label
  )}</td><td style="padding:7px 10px;border:1px solid #e2e8f0">${escapeHtml(String(value)).replace(
    /\n/g,
    "<br/>"
  )}</td></tr>`;
}

function buildHtmlBody(payload, { note, pdfUrl, attachmentsCount, intro } = {}) {
  const m = ncrMeta(payload);
  const tone = m.isClosed ? "#059669" : m.status === "In Progress" ? "#d97706" : "#dc2626";

  const followupRows =
    m.qaResult === "Not Satisfactory"
      ? row("Follow-up Actions", m.followup) +
        row("Follow-up Responsible", m.followupBy) +
        row("Follow-up Target", toDMY(m.followupTarget))
      : "";

  return `
<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.6;max-width:760px">
  <div style="background:#0f172a;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
    <div style="font-size:17px;font-weight:800">Non-Conformance Report</div>
    <div style="opacity:.75;font-size:13px;margin-top:3px">${escapeHtml(m.ncNo)} · ${escapeHtml(
    m.branch
  )} · ${escapeHtml(toDMY(m.date))}</div>
  </div>
  <div style="padding:14px 20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
    <div style="display:inline-block;padding:5px 14px;border-radius:999px;background:${tone};color:#fff;font-weight:800;font-size:12px;margin-bottom:12px">
      ${escapeHtml(String(m.status).toUpperCase())}
    </div>
    ${intro ? `<p style="white-space:pre-wrap;margin:0 0 14px">${escapeHtml(intro)}</p>` : ""}

    <table style="border-collapse:collapse;width:100%;font-size:13px">
      ${row("NC No.", m.ncNo)}
      ${row("Branch / Location", m.branch)}
      ${row("Report Date", toDMY(m.date))}
      ${row("Issued to", m.issuedTo)}
      ${row("Issued by", m.issuedBy)}
      ${row("Raised from", m.sources.join(", "))}
      ${row("Nonconformance Details", m.details)}
      ${row("Corrective Action", m.correctiveAction)}
      ${row("Implementation Owner", m.owner)}
      ${row("Target Completion", toDMY(m.targetDate))}
      ${row("Verified by (QA)", m.qaBy)}
      ${row("QA Result", m.qaResult)}
      ${followupRows}
      ${m.isClosed ? row("Closure Date", toDMY(m.closureDate)) + row("Approved by QA", m.finalQaApproved ? `${m.finalQaName} — ${toDMY(m.finalQaDate)}` : "Not approved") : ""}
    </table>

    ${note ? `<p style="margin:14px 0 0;white-space:pre-wrap"><b>Note:</b> ${escapeHtml(note)}</p>` : ""}
    ${attachmentsCount ? `<p style="margin:12px 0 0;color:#64748b;font-size:12px">📎 ${attachmentsCount} attachment(s), evidence photographs included.</p>` : ""}
    ${pdfUrl ? `<p style="margin:10px 0 0"><a href="${pdfUrl}">Download the PDF</a></p>` : ""}
    <p style="margin:16px 0 0;color:#94a3b8;font-size:11px">
      Electronically approved; no signature required — معتمد إلكترونياً؛ لا حاجة للتوقيع
    </p>
  </div>
</div>`.trim();
}

function buildPlainTextBody(payload, { note, pdfUrl, intro } = {}) {
  const m = ncrMeta(payload);
  const lines = [
    intro || "",
    "",
    "NON-CONFORMANCE REPORT",
    `NC No.        : ${m.ncNo}`,
    `Branch        : ${m.branch}`,
    `Report Date   : ${toDMY(m.date)}`,
    `Status        : ${m.status}`,
    `Issued to     : ${m.issuedTo || "—"}`,
    `Issued by     : ${m.issuedBy || "—"}`,
    `Raised from   : ${m.sources.join(", ") || "—"}`,
    "",
    "DETAILS",
    m.details || "—",
    "",
    "CORRECTIVE ACTION",
    m.correctiveAction || "—",
    `Owner         : ${m.owner || "—"}`,
    `Target        : ${toDMY(m.targetDate) || "—"}`,
    "",
    "QA VERIFICATION",
    `Verified by   : ${m.qaBy || "—"}`,
    `Result        : ${m.qaResult || "—"}`,
  ];
  if (m.qaResult === "Not Satisfactory") {
    lines.push(`Follow-up     : ${m.followup || "—"} (${m.followupBy || "—"}, ${toDMY(m.followupTarget) || "—"})`);
  }
  if (m.isClosed) {
    lines.push("", `CLOSED ${toDMY(m.closureDate)} — approved by ${m.finalQaName || "—"}`);
  }
  if (note) lines.push("", `Note: ${note}`);
  if (pdfUrl) lines.push("", `PDF: ${pdfUrl}`);
  return lines.join("\n");
}

/* ============================================================
   Config
============================================================ */
export function makeNcrEmailConfig({ reportType = "qcs_non_conformance", reportTitle = "Non-Conformance Report" } = {}) {
  return {
    reportTitle,
    /* Drives Settings → per-type To/CC auto-routing and the email history log. */
    reportType,
    allowServerSend: true,
    /* Keys the per-report send history — see EmailSendHistory.jsx. */
    getReportRef: (payload) => ncrMeta(payload).ncNo.replace(/^—$/, "") || null,
    getDefaultIntro: (payload) => {
      const m = ncrMeta(payload || {});
      return DEFAULT_INTRO
        .replace("{name}", m.issuedTo || "Team")
        .replace("{ncNo}", m.ncNo)
        .replace("{branch}", m.branch)
        .replace("{date}", toDMY(m.date));
    },
    getSubject: (payload) => {
      const m = ncrMeta(payload || {});
      return `[NCR ${m.status}] ${m.ncNo} · ${m.branch} · ${toDMY(m.date)}`;
    },
    generatePdf: (payload) => generateNcrPdf(payload),
    buildHtml: buildHtmlBody,
    buildText: buildPlainTextBody,
    getImages: (payload) => ncrMeta(payload).images,
    getSummary: (payload) => {
      const m = ncrMeta(payload || {});
      return {
        status: String(m.status).toUpperCase(),
        statusKind: m.isClosed ? "ok" : m.status === "In Progress" ? "warn" : "bad",
        fields: [
          { label: "NC No.", value: m.ncNo },
          { label: "Branch", value: m.branch },
          { label: "Date", value: toDMY(m.date) || "—" },
          { label: "Issued to", value: m.issuedTo || "—" },
          { label: "Owner", value: m.owner || "—" },
          { label: "Target", value: toDMY(m.targetDate) || "—" },
          { label: "Evidence", value: `${m.images.length} image(s)` },
        ],
      };
    },
  };
}

export const ncrEmailConfig = makeNcrEmailConfig();
export default ncrEmailConfig;
