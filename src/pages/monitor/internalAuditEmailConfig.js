// internalAuditEmailConfig.js
// Config object for the generic EmailSendModal, customised for the
// Internal Audit (CAPA) report shown in monitor/internal-audit.
//
// Two deliberate rules, both mirroring what the branch sees in the public
// evidence portal:
//   1. The e-mail leads with the OPEN findings — closed items are summarised
//      as a count, never listed. Nobody needs to read a wall of already-fixed
//      items to find the one thing still pending.
//   2. QA-only fields (reviewer, next-audit comment, risk notes) never leave
//      the internal PDF. The HTML body is what branches read.

import { escapeHtml } from "../shared/emailReportUtils";
import { isClosedStatus, getRowVerification } from "../../utils/auditVerification";

export { isClosedStatus };

const DEFAULT_INTRO =
  "Dear Team,\n\nPlease find attached the Internal Audit (CAPA) report for {branch} dated {date}.\n" +
  "Kindly upload the corrective-action evidence for every open finding using the secure link below.";

/* `2026-06-28` → `28/06/2026`; anything else passes through untouched. */
function toDMY(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : s;
}

function imgUrl(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  return String(
    img.url || img.optimized_url || img.optimizedUrl || img.secure_url ||
    img.secureUrl || img.originalUrl || img.src || ""
  );
}

function imgList(v) {
  return (Array.isArray(v) ? v : []).map(imgUrl).filter(Boolean);
}

/* Findings split into what still needs action vs. what is done.
   `no` is the ORIGINAL 1-based row number so QA, the e-mail and the branch
   portal all refer to the same finding even though the lists differ. */
export function splitFindings(payload) {
  const table = Array.isArray(payload?.table) ? payload.table : [];
  const open = [];
  const closed = [];
  /* "Open" and "waiting on QA" are not the same ask: only the former needs
     the branch to do something. Both stay out of the closed bucket because
     neither is verified yet. */
  const awaitingQa = [];
  table.forEach((row, idx) => {
    const entry = { ...(row || {}), no: idx + 1, rowIndex: idx };
    if (isClosedStatus(row?.status)) { closed.push(entry); return; }
    open.push(entry);
    if (getRowVerification(row).state === "pending") awaitingQa.push(entry);
  });
  const actionRequired = open.filter((row) => getRowVerification(row).state !== "pending");
  return { open, closed, awaitingQa, actionRequired, total: table.length };
}

export function auditMeta(payload) {
  const header = payload?.header || {};
  const { open, closed, awaitingQa, actionRequired, total } = splitFindings(payload);
  const pct = total ? Math.round((closed.length / total) * 100) : 0;
  return {
    header,
    open,
    closed,
    awaitingQa,
    actionRequired,
    total,
    closedPct: pct,
    // header.location is legacy-only — the Location field no longer exists.
    branch: payload?.branch || header.branch || header.location || "—",
    date: header.date || payload?.reportDate || "",
    reportNo: header.reportNo || "—",
    auditor: header.auditConductedBy || "—",
    evidenceUrl: payload?.evidenceUrl || payload?.public?.url || "",
  };
}

/* ============================================================
   PDF — standalone (does NOT depend on the report card being
   open in the DOM, unlike the on-screen "Export PDF" button).
   ============================================================ */
async function loadLogo() {
  try {
    const res = await fetch("/assets/almawashi-logo.jpg");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInternalAuditPdf(payload) {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  /* jspdf exposes the constructor as both a named and a default export; which
     one survives depends on the bundler's interop, so accept either. */
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTable = autoTableMod.autoTable || autoTableMod.default;

  const m = auditMeta(payload);
  const logo = await loadLogo();

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const HEAD_H = 66;

  const drawHead = () => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, W, HEAD_H, "F");
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(1.5);
    pdf.line(0, HEAD_H - 1, W, HEAD_H - 1);
    if (logo) {
      try { pdf.addImage(logo, "JPEG", 10, 7, 80, 48); } catch { /* logo is cosmetic */ }
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text("INTERNAL AUDIT REPORT", W / 2, 24, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      "CORRECTIVE & PREVENTIVE ACTION  |  FS-QM/REC/CA/1  |  Rev 00",
      W / 2, 35, { align: "center" }
    );
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    const rx = W - 12;
    pdf.text(`Branch: ${m.branch}`, rx, 16, { align: "right" });
    pdf.text(`Date: ${m.date || "—"}`, rx, 28, { align: "right" });
    pdf.text(`Report No: ${m.reportNo}`, rx, 40, { align: "right" });
    pdf.text(`Audited By: ${m.auditor}`, rx, 52, { align: "right" });
  };

  const cell = (v) => (v == null || v === "" ? "—" : String(v));

  /* Summary band */
  autoTable(pdf, {
    startY: HEAD_H + 14,
    margin: { left: 24, right: 24 },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225] },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    head: [["Total Findings", "Need Action", "Awaiting QA", "Closed", "Closure Rate", "Next Audit"]],
    body: [[
      String(m.total),
      String(m.actionRequired.length),
      String(m.awaitingQa.length),
      String(m.closed.length),
      `${m.closedPct}%`,
      cell(payload?.footer?.nextAudit),
    ]],
    didDrawPage: drawHead,
  });

  const findingsBody = (list) => list.map((row) => [
    String(row.no),
    cell(row.nonConformance),
    cell(row.rootCause),
    cell(row.corrective),
    cell(row.risk),
    cell(row.status || "Open"),
    String(imgList(row.evidenceImgs).length),
    String(imgList(row.closedEvidenceImgs).length),
  ]);

  const findingsCols = [
    "#",
    "Non-Conformance",
    "Root Cause",
    "Corrective / Preventive Action",
    "Risk",
    "Status",
    "Evid.",
    "Closed Evid.",
  ];

  /* Only the narrow columns are pinned; the three long text columns share
     whatever is left so the table always fits the page width. */
  const findingsStyles = {
    0: { cellWidth: 22, halign: "center" },
    4: { cellWidth: 52 },
    5: { cellWidth: 50, halign: "center" },
    6: { cellWidth: 34, halign: "center" },
    7: { cellWidth: 46, halign: "center" },
  };

  const H = pdf.internal.pageSize.getHeight();

  /* Section title drawn as plain text rather than a colSpan header row —
     autoTable infers the column count from the first head row, so a 1-cell
     banner row would collapse the table to a single column. */
  const section = (title, list, fill) => {
    if (!list.length) return;
    let y = (pdf.lastAutoTable?.finalY || HEAD_H) + 22;
    if (y > H - 90) {
      pdf.addPage();
      drawHead();
      y = HEAD_H + 26;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(fill[0], fill[1], fill[2]);
    pdf.text(`${title} (${list.length})`, 24, y);
    autoTable(pdf, {
      startY: y + 8,
      margin: { left: 24, right: 24, top: HEAD_H + 10 },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, valign: "top", lineColor: [203, 213, 225], overflow: "linebreak" },
      headStyles: { fillColor: fill, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: findingsStyles,
      head: [findingsCols],
      body: findingsBody(list),
      didDrawPage: drawHead,
    });
  };

  section("OPEN FINDINGS — ACTION REQUIRED", m.actionRequired, [185, 28, 28]);
  section("AWAITING QA VERIFICATION", m.awaitingQa, [29, 78, 216]);
  section("CLOSED FINDINGS", m.closed, [22, 101, 52]);

  /* Signatures */
  autoTable(pdf, {
    startY: (pdf.lastAutoTable?.finalY || HEAD_H) + 18,
    margin: { left: 24, right: 24, top: HEAD_H + 10 },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 8, lineColor: [203, 213, 225] },
    body: [[
      `Audit Conducted By: ${m.auditor}`,
      `Issued By: ${cell(m.header.issuedBy)}`,
      `Approved By: ${cell(m.header.approvedBy)}`,
      `Reviewed & Verified By: ${cell(payload?.footer?.reviewedAndVerifiedBy)}`,
    ]],
    didDrawPage: drawHead,
  });

  const comment = String(payload?.footer?.commentForNextAudit || "").trim();
  if (comment) {
    autoTable(pdf, {
      startY: (pdf.lastAutoTable?.finalY || HEAD_H) + 12,
      margin: { left: 24, right: 24, top: HEAD_H + 10 },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 8, lineColor: [203, 213, 225] },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      head: [["Comment for Next Audit"]],
      body: [[comment]],
      didDrawPage: drawHead,
    });
  }

  /* Page numbers, once the total is known */
  const total = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${i} / ${total}`, W / 2, HEAD_H - 6, { align: "center" });
  }

  const blob = pdf.output("blob");
  const safeBranch = String(m.branch || "report").replace(/[^\w\d-]+/g, "-");
  const filename = `Internal-Audit_${safeBranch}_${m.date || "report"}.pdf`;
  return { blob, filename };
}

/* ============================================================
   E-mail bodies
   ============================================================ */
function introText(payload, intro) {
  const m = auditMeta(payload);
  return (
    String(intro ?? "").trim() ||
    DEFAULT_INTRO.replace("{branch}", m.branch).replace("{date}", toDMY(m.date))
  );
}

function buildPlainTextBody(payload, { note, pdfUrl, includeTable = false, intro } = {}) {
  const m = auditMeta(payload);
  const v = (x) => (x == null || x === "" ? "—" : String(x));
  const out = [];

  out.push(...introText(payload, intro).split("\n"));
  out.push("");
  out.push("===============================================");
  out.push("     INTERNAL AUDIT REPORT — CAPA");
  out.push("===============================================");
  out.push("");
  out.push(`  Branch      : ${m.branch}`);
  out.push(`  Date        : ${v(m.date)}`);
  out.push(`  Report No   : ${m.reportNo}`);
  out.push(`  Audited By  : ${m.auditor}`);
  out.push("");
  out.push(`  Findings    : ${m.total}  (Need action: ${m.actionRequired.length} · With QA: ${m.awaitingQa.length} · Closed: ${m.closed.length})`);
  out.push(`  Closure     : ${m.closedPct}%`);
  out.push("");

  if (m.open.length) {
    out.push(`--- OPEN FINDINGS — ACTION REQUIRED (${m.open.length}) ---`);
    m.open.forEach((row) => {
      out.push("");
      out.push(`  #${row.no} [${v(row.status) || "Open"}]`);
      out.push(`      Non-Conformance : ${v(row.nonConformance)}`);
      if (includeTable) out.push(`      Root Cause      : ${v(row.rootCause)}`);
      out.push(`      Corrective Act. : ${v(row.corrective)}`);
    });
    out.push("");
  } else {
    out.push("  ✔ All findings in this report are already closed.");
    out.push("");
  }

  if (m.closed.length) {
    out.push(`  ${m.closed.length} closed finding(s) are not listed here — full detail is in the attached PDF.`);
    out.push("");
  }

  if (m.evidenceUrl) {
    out.push("===============================================");
    out.push("  UPLOAD CORRECTIVE EVIDENCE (branch link):");
    out.push(`  ${m.evidenceUrl}`);
    out.push("  Only the open findings above are shown on that page.");
    out.push("===============================================");
    out.push("");
  }

  if (note && String(note).trim()) {
    out.push("--- NOTE FROM QA ---");
    out.push(String(note).trim().split("\n").map((x) => "  " + x).join("\n"));
    out.push("");
  }

  if (pdfUrl) {
    out.push("FULL PDF REPORT:");
    out.push(pdfUrl);
  }
  return out.join("\n");
}

/* Outlook-safe: solid background colours only, table-based layout,
   no gradients / flexbox / box-shadow (Word's renderer drops them). */
function buildHtmlBody(payload, { note, pdfUrl, attachmentsCount, includeTable = false, intro } = {}) {
  const m = auditMeta(payload);
  const safe = (v) => escapeHtml(String(v == null || v === "" ? "—" : v));

  const barColor = m.closedPct >= 80 ? "#166534" : m.closedPct >= 50 ? "#92400e" : "#991b1b";

  const introHtml = introText(payload, intro)
    .split("\n")
    .map((line, i) => {
      if (!line.trim()) return `<div style="height:8px;line-height:8px;">&nbsp;</div>`;
      const weight = i === 0 ? "font-weight:700;" : "";
      return `<div style="${weight}">${escapeHtml(line)}</div>`;
    })
    .join("");

  const openRows = m.open.map((row) => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;font-weight:800;background:#fef2f2;">${row.no}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(row.nonConformance)}</td>
      ${includeTable ? `<td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(row.rootCause)}</td>` : ""}
      <td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(row.corrective)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${safe(row.risk)}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;color:#991b1b;font-weight:800;">${safe(row.status || "Open")}</td>
    </tr>`).join("");

  const openTable = m.open.length ? `
    <h4 style="margin:18px 0 8px;color:#991b1b;font-size:14px;border-bottom:2px solid #991b1b;padding-bottom:4px;">
      Open Findings — Action Required (${m.open.length})
    </h4>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr>
        <th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;width:34px;">#</th>
        <th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;text-align:left;">Non-Conformance</th>
        ${includeTable ? `<th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;text-align:left;">Root Cause</th>` : ""}
        <th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;text-align:left;">Corrective / Preventive Action</th>
        <th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;width:80px;">Risk</th>
        <th style="background:#991b1b;color:#ffffff;border:1px solid #7f1d1d;padding:6px 8px;width:70px;">Status</th>
      </tr>
      ${openRows}
    </table>` : `
    <div style="margin-top:18px;padding:14px;background:#dcfce7;border:1px solid #86efac;color:#166534;font-size:14px;font-weight:800;text-align:center;">
      ✔ All findings in this report are closed — no action pending.
    </div>`;

  const closedNote = m.closed.length ? `
    <div style="margin-top:10px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:12px;">
      ✔ <b>${m.closed.length} closed finding(s)</b> are intentionally not listed above — they are already verified.
      Full detail is in the attached PDF.
    </div>` : "";

  const linkHtml = m.evidenceUrl ? `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:18px;border-collapse:collapse;">
      <tr><td style="background:#0f766e;padding:16px 18px;text-align:center;">
        <div style="color:#ffffff;font-size:14px;font-weight:800;margin-bottom:10px;">
          Upload the corrective-action evidence
        </div>
        <a href="${escapeHtml(m.evidenceUrl)}"
           style="display:inline-block;background:#ffffff;color:#0f766e;padding:10px 22px;text-decoration:none;font-weight:800;font-size:14px;border:2px solid #ffffff;">
          Open the Evidence Portal
        </a>
        <div style="color:#ccfbf1;font-size:11px;margin-top:10px;">
          The page shows only the ${m.open.length} finding(s) not yet closed. Verified items are hidden.
        </div>
      </td></tr>
    </table>` : "";

  const noteHtml = note && String(note).trim()
    ? `<div style="margin-top:16px;padding:12px 14px;background:#fffbeb;border-left:4px solid #f59e0b;"><b>Note from QA:</b><br/>${escapeHtml(note).replace(/\n/g, "<br/>")}</div>`
    : "";

  const pdfHtml = pdfUrl
    ? `<div style="margin-top:16px;text-align:center;"><a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 18px;text-decoration:none;font-weight:800;">Download Full PDF Report</a></div>`
    : "";

  const attachInfo = attachmentsCount
    ? `<div style="margin-top:8px;padding:10px 14px;background:#eff6ff;border:1px solid #93c5fd;font-size:12px;color:#1e3a8a;">📎 <b>${attachmentsCount} file(s) attached</b> — PDF report + evidence photos.</div>`
    : "";

  return `
  <div style="font-family:Inter,Roboto,Arial,sans-serif;background:#f1f5f9;padding:20px;color:#0f172a;">
    <table cellpadding="0" cellspacing="0" border="0" style="max-width:820px;margin:auto;background:#ffffff;border-collapse:collapse;">
      <tr><td style="background:#0f172a;color:#ffffff;padding:18px 22px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>
          <td><div style="font-size:18px;font-weight:900;letter-spacing:.5px;">AL MAWASHI</div>
              <div style="font-size:12px;color:#cbd5e1;">Trans Emirates Livestock Trading L.L.C.</div></td>
          <td style="text-align:right;"><div style="font-size:14px;font-weight:800;">Internal Audit Report — CAPA</div>
              <div style="font-size:11px;color:#cbd5e1;">${safe(m.branch)} · ${safe(m.date)} · ${safe(m.reportNo)}</div></td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 22px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="background:#991b1b;color:#ffffff;padding:10px;text-align:center;font-weight:800;font-size:13px;width:25%;">
              ${m.actionRequired.length} NEED ACTION
            </td>
            <td style="background:#1d4ed8;color:#ffffff;padding:10px;text-align:center;font-weight:800;font-size:13px;width:25%;">
              ${m.awaitingQa.length} WITH QA
            </td>
            <td style="background:#166534;color:#ffffff;padding:10px;text-align:center;font-weight:800;font-size:13px;width:25%;">
              ${m.closed.length} CLOSED
            </td>
            <td style="background:${barColor};color:#ffffff;padding:10px;text-align:center;font-weight:800;font-size:13px;">
              ${m.closedPct}% CLOSURE
            </td>
          </tr>
        </table>

        <div style="margin-top:16px;font-size:14px;line-height:1.7;color:#0f172a;">
          ${introHtml}
        </div>

        ${attachInfo}

        <h4 style="margin:18px 0 8px;color:#0f172a;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:4px;">Audit Identification</h4>
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;width:25%;font-weight:700;">Branch</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(m.branch)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;width:25%;font-weight:700;">Audit Date</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(m.date)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Report No</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(m.reportNo)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Audited By</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(m.auditor)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Next Audit</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(payload?.footer?.nextAudit)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Total Findings</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${m.total}</td></tr>
        </table>

        ${openTable}
        ${closedNote}
        ${linkHtml}
        ${noteHtml}
        ${pdfHtml}
      </td></tr>

      <tr><td style="background:#f8fafc;padding:14px 22px;color:#64748b;font-size:11px;text-align:center;">
        Generated automatically by Al Mawashi QMS · Internal Audit (CAPA)
      </td></tr>
    </table>
  </div>`;
}

/* ===== Exported config ===== */
export const internalAuditEmailConfig = {
  reportTitle: "Internal Audit Report",
  /* Drives Settings → per-type To/CC auto-routing and the email history log. */
  reportType: "internal_multi_audit",
  allowServerSend: true,
  getDefaultIntro: (payload) => {
    const m = auditMeta(payload || {});
    return DEFAULT_INTRO.replace("{branch}", m.branch || "{branch}");
  },
  getSubject: (payload) => {
    const m = auditMeta(payload || {});
    const n = m.actionRequired.length;
    const openPart = n
      ? `${n} finding${n === 1 ? "" : "s"} need action`
      : m.awaitingQa.length
      ? `${m.awaitingQa.length} awaiting QA verification`
      : "all findings closed";
    return `[Internal Audit] ${m.branch} · ${m.date || ""} · ${openPart}`;
  },
  generatePdf: (payload) => generateInternalAuditPdf(payload),
  buildHtml: buildHtmlBody,
  buildText: buildPlainTextBody,
  /* Only evidence from OPEN findings is attached — closed items stay out of
     the mail, same rule as the body and the branch portal. */
  getImages: (payload) => {
    const { open } = splitFindings(payload || {});
    const urls = open.flatMap((row) => [
      ...imgList(row.evidenceImgs),
      ...imgList(row.closedEvidenceImgs),
    ]);
    return Array.from(new Set(urls));
  },
  getSummary: (payload) => {
    const m = auditMeta(payload || {});
    return {
      status: m.actionRequired.length
        ? `${m.actionRequired.length} NEED ACTION`
        : m.awaitingQa.length
        ? `${m.awaitingQa.length} WITH QA`
        : "ALL CLOSED",
      statusKind: m.open.length === 0 ? "ok" : m.actionRequired.length === 0 ? "warn" : m.closedPct >= 50 ? "warn" : "bad",
      fields: [
        { label: "Branch",      value: m.branch },
        { label: "Date",        value: m.date || "—" },
        { label: "Report No",   value: m.reportNo },
        { label: "Findings",    value: String(m.total) },
        { label: "Need action", value: String(m.actionRequired.length) },
        { label: "With QA",     value: String(m.awaitingQa.length) },
        { label: "Closure",     value: `${m.closedPct}%` },
      ],
    };
  },
};

export default internalAuditEmailConfig;
