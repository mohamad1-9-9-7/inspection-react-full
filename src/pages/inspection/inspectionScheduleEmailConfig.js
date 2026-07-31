// src/pages/inspection/inspectionScheduleEmailConfig.js
// Config for the shared EmailSendModal, used by the Annual Inspection Schedule
// to send an OVERDUE REMINDER: which branches missed consecutive months, plus
// each branch's findings / closure KPIs for the year.
import { escapeHtml } from "../shared/emailReportUtils";
import { MONTHS } from "./inspectionBranches";

const DEFAULT_INTRO =
  "Dear team,\n\n" +
  "Per the internal audit programme every branch must be inspected at least once per month. " +
  "The branches below have missed two or more consecutive months and need to be scheduled immediately.";

const monthName = (i) => MONTHS.find((m) => m.i === i)?.full || String(i);
const monthShort = (i) => MONTHS.find((m) => m.i === i)?.short || String(i);
const v = (x) => (x == null || x === "" ? "—" : String(x));

function meta(payload = {}) {
  const overdue = Array.isArray(payload.overdue) ? payload.overdue : [];
  const all = Array.isArray(payload.all) ? payload.all : [];
  const stats = payload.stats || {};
  return {
    year: payload.year || new Date().getFullYear(),
    generatedAt: payload.generatedAt || "",
    overdue,
    all,
    stats,
    worst: overdue.reduce((a, b) => (b.currentStreak > (a?.currentStreak ?? -1) ? b : a), null),
  };
}

/* ============================================================
   PDF
   ============================================================ */
export async function generateSchedulePdf(payload) {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTable = autoTableMod.autoTable || autoTableMod.default;

  const m = meta(payload);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const HEAD_H = 58;

  const drawHead = () => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, W, HEAD_H, "F");
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(1.5);
    pdf.line(0, HEAD_H - 1, W, HEAD_H - 1);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`ANNUAL INSPECTION SCHEDULE — ${m.year}`, W / 2, 24, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      "Rule: every branch must be inspected at least once per month",
      W / 2, 36, { align: "center" }
    );
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Compliance: ${m.stats.compliance ?? 0}%`, W - 12, 20, { align: "right" });
    pdf.text(`Missing visits: ${m.stats.missing ?? 0}`, W - 12, 33, { align: "right" });
    pdf.text(`Generated: ${v(m.generatedAt)}`, W - 12, 46, { align: "right" });
  };

  autoTable(pdf, {
    startY: HEAD_H + 14,
    margin: { left: 24, right: 24, top: HEAD_H + 10 },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225] },
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: "bold" },
    head: [["OVERDUE BRANCH", "Consecutive missed", "Missed months", "Last inspection", "Visits this year"]],
    body: m.overdue.length
      ? m.overdue.map((b) => [
          b.label,
          `${b.currentStreak || b.maxStreak} month(s)`,
          (b.missingMonths || []).map(monthShort).join(", ") || "—",
          v(b.lastVisit),
          String(b.visits ?? 0),
        ])
      : [["No branch has missed two consecutive months.", "", "", "", ""]],
    didDrawPage: drawHead,
  });

  autoTable(pdf, {
    startY: (pdf.lastAutoTable?.finalY || HEAD_H) + 16,
    margin: { left: 24, right: 24, top: HEAD_H + 10 },
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4.5, lineColor: [203, 213, 225] },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    head: [["Branch", "Visits", "Gaps", "Findings", "Closed", "Closure %", "High risk", "Last inspection"]],
    body: m.all.map((b) => [
      b.label,
      String(b.visits ?? 0),
      String((b.missingMonths || []).length),
      String(b.findings ?? 0),
      String(b.closed ?? 0),
      `${b.closurePct ?? 0}%`,
      String(b.high ?? 0),
      v(b.lastVisit),
    ]),
    didDrawPage: drawHead,
  });

  const total = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${i} / ${total}`, W / 2, HEAD_H - 6, { align: "center" });
  }

  return {
    blob: pdf.output("blob"),
    filename: `Inspection-Schedule_${m.year}_overdue.pdf`,
  };
}

/* ============================================================
   E-mail bodies
   ============================================================ */
function introText(payload, intro) {
  return String(intro ?? "").trim() || DEFAULT_INTRO;
}

/* Outlook-safe: solid colors, tables, no gradients / flex / css vars. */
function buildHtmlBody(payload, { note, intro } = {}) {
  const m = meta(payload);
  const esc = (s) => escapeHtml(String(s ?? ""));

  const overdueRows = m.overdue.length
    ? m.overdue
        .map(
          (b) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:bold;color:#0f172a;">${esc(b.label)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;background:#fee2e2;color:#991b1b;font-weight:bold;">
          ${esc(b.currentStreak || b.maxStreak)}
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;color:#334155;">
          ${esc((b.missingMonths || []).map(monthShort).join(", ") || "—")}
        </td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc(v(b.lastVisit))}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="padding:12px;border:1px solid #e2e8f0;text-align:center;color:#065f46;background:#ecfdf5;font-weight:bold;">
         No branch has missed two consecutive months.
       </td></tr>`;

  const kpiRows = m.all
    .map((b) => {
      const pct = Number(b.closurePct ?? 0);
      const pctBg = pct >= 80 ? "#d1fae5" : pct >= 50 ? "#fef3c7" : "#fee2e2";
      const pctFg = pct >= 80 ? "#065f46" : pct >= 50 ? "#92400e" : "#991b1b";
      return `
      <tr>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;color:#0f172a;font-weight:bold;">${esc(b.label)}</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc(b.visits ?? 0)}</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc((b.missingMonths || []).length)}</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc(b.findings ?? 0)}</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc(b.closed ?? 0)}</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;background:${pctBg};color:${pctFg};font-weight:bold;">${esc(pct)}%</td>
        <td style="padding:6px 9px;border:1px solid #e2e8f0;text-align:center;color:#334155;">${esc(v(b.lastVisit))}</td>
      </tr>`;
    })
    .join("");

  return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:1.6;">
  <p style="white-space:pre-line;margin:0 0 16px;">${esc(introText(payload, intro))}</p>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 18px;">
    <tr>
      <td style="background:#0f172a;color:#ffffff;padding:12px 14px;font-size:16px;font-weight:bold;">
        Annual Inspection Schedule — ${esc(m.year)}
      </td>
      <td style="background:#0f172a;color:#cbd5e1;padding:12px 14px;font-size:12px;text-align:right;">
        Compliance ${esc(m.stats.compliance ?? 0)}% &nbsp;·&nbsp; ${esc(m.stats.missing ?? 0)} missing visit(s)
      </td>
    </tr>
  </table>

  <h3 style="margin:0 0 8px;font-size:15px;color:#991b1b;">Branches overdue (2+ consecutive months)</h3>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;margin:0 0 20px;">
    <tr>
      <th align="left"   style="padding:8px 10px;border:1px solid #e2e8f0;background:#b91c1c;color:#ffffff;">Branch</th>
      <th align="center" style="padding:8px 10px;border:1px solid #e2e8f0;background:#b91c1c;color:#ffffff;">Consecutive missed</th>
      <th align="center" style="padding:8px 10px;border:1px solid #e2e8f0;background:#b91c1c;color:#ffffff;">Missed months</th>
      <th align="center" style="padding:8px 10px;border:1px solid #e2e8f0;background:#b91c1c;color:#ffffff;">Last inspection</th>
    </tr>
    ${overdueRows}
  </table>

  <h3 style="margin:0 0 8px;font-size:15px;color:#0f172a;">Performance by branch — ${esc(m.year)}</h3>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:12px;">
    <tr>
      <th align="left"   style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Branch</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Visits</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Gaps</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Findings</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Closed</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Closure %</th>
      <th align="center" style="padding:7px 9px;border:1px solid #e2e8f0;background:#1e293b;color:#ffffff;">Last inspection</th>
    </tr>
    ${kpiRows}
  </table>

  ${
    note
      ? `<div style="margin:18px 0 0;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;">
           <b>Note:</b> ${esc(note)}
         </div>`
      : ""
  }

  <p style="margin:18px 0 0;font-size:12px;color:#64748b;">
    Full month-by-month matrix is in the attached PDF.
  </p>
</div>`;
}

function buildPlainTextBody(payload, { note, intro } = {}) {
  const m = meta(payload);
  const out = [];

  out.push(...introText(payload, intro).split("\n"));
  out.push("");
  out.push("===============================================");
  out.push(`   ANNUAL INSPECTION SCHEDULE — ${m.year}`);
  out.push("===============================================");
  out.push("");
  out.push(`  Compliance     : ${m.stats.compliance ?? 0}%`);
  out.push(`  Missing visits : ${m.stats.missing ?? 0}`);
  out.push(`  Branches       : ${m.all.length}`);
  out.push("");

  if (m.overdue.length) {
    out.push(`--- OVERDUE — 2+ CONSECUTIVE MONTHS (${m.overdue.length}) ---`);
    m.overdue.forEach((b) => {
      out.push("");
      out.push(`  ${b.label}`);
      out.push(`      Consecutive missed : ${b.currentStreak || b.maxStreak} month(s)`);
      out.push(`      Missed months      : ${(b.missingMonths || []).map(monthName).join(", ") || "—"}`);
      out.push(`      Last inspection    : ${v(b.lastVisit)}`);
    });
    out.push("");
  } else {
    out.push("  ✔ No branch has missed two consecutive months.");
    out.push("");
  }

  out.push("--- PERFORMANCE BY BRANCH ---");
  m.all.forEach((b) => {
    out.push(
      `  ${String(b.label).padEnd(34)} visits ${String(b.visits ?? 0).padStart(2)} · ` +
      `gaps ${String((b.missingMonths || []).length).padStart(2)} · ` +
      `findings ${String(b.findings ?? 0).padStart(3)} · closure ${b.closurePct ?? 0}%`
    );
  });
  out.push("");

  if (note) {
    out.push(`NOTE: ${note}`);
    out.push("");
  }
  out.push("Full month-by-month matrix is in the attached PDF.");
  return out.join("\n");
}

/* ============================================================
   Config
   ============================================================ */
export const inspectionScheduleEmailConfig = {
  reportTitle: "Annual Inspection Schedule",
  /* Drives Settings → per-type To/CC auto-routing and the email history log. */
  reportType: "inspection_annual_plan",
  allowServerSend: true,
  getDefaultIntro: () => DEFAULT_INTRO,
  getSubject: (payload) => {
    const m = meta(payload);
    const n = m.overdue.length;
    return n
      ? `[Inspection Schedule ${m.year}] ${n} branch${n === 1 ? "" : "es"} overdue — 2+ consecutive months missed`
      : `[Inspection Schedule ${m.year}] all branches on schedule · ${m.stats.compliance ?? 0}% compliance`;
  },
  generatePdf: (payload) => generateSchedulePdf(payload),
  buildHtml: buildHtmlBody,
  buildText: buildPlainTextBody,
  getImages: () => [],
  getSummary: (payload) => {
    const m = meta(payload);
    return {
      status: m.overdue.length ? `${m.overdue.length} OVERDUE` : "ON SCHEDULE",
      statusKind: m.overdue.length === 0 ? "ok" : m.overdue.length <= 2 ? "warn" : "bad",
      fields: [
        { label: "Year",        value: String(m.year) },
        { label: "Branches",    value: String(m.all.length) },
        { label: "Overdue",     value: String(m.overdue.length) },
        { label: "Missing",     value: String(m.stats.missing ?? 0) },
        { label: "Compliance",  value: `${m.stats.compliance ?? 0}%` },
        { label: "Worst streak", value: m.worst ? `${m.worst.label} · ${m.worst.currentStreak || m.worst.maxStreak}m` : "—" },
      ],
    };
  },
};

export default inspectionScheduleEmailConfig;
