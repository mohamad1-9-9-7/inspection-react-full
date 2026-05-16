// qcsEmailConfig.js
// Config object for the generic EmailSendModal, customised for the QCS Incoming Shipment Report.

import { generateReportPdf } from "./qcsReportPdf";
import { escapeHtml } from "../../../shared/emailReportUtils";

const ATTR_ROWS = [
  ["temperature",      "Product Temp"],
  ["ph",               "Product PH"],
  ["slaughterDate",    "Slaughter Date"],
  ["expiryDate",       "Expiry Date"],
  ["broken",           "Broken / Cut"],
  ["appearance",       "Appearance"],
  ["bloodClots",       "Blood Clots"],
  ["colour",           "Colour"],
  ["fatDiscoloration", "Fat Discoloration"],
  ["meatDamage",       "Meat Damage"],
  ["foreignMatter",    "Foreign Matter"],
  ["texture",          "Texture"],
  ["testicles",        "Testicles"],
  ["smell",            "Smell"],
];

function padR(s, n) {
  s = String(s ?? "");
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function statusKind(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("acceptable")) return "ok";
  if (s.includes("average") && !s.includes("below")) return "warn";
  return "bad";
}

function buildPlainTextBody(payload, { note, pdfUrl, includeTable = false } = {}) {
  const gi = payload?.generalInfo || {};
  const meta = payload?.docMeta || {};
  const samples = Array.isArray(payload?.samples) ? payload.samples : [];
  const lines = Array.isArray(payload?.productLines) ? payload.productLines : [];
  const v = (x) => (x === null || x === undefined || x === "" ? "—" : String(x));

  const out = [];
  out.push("═══════════════════════════════════════════════");
  out.push("       QCS INCOMING SHIPMENT REPORT");
  out.push("═══════════════════════════════════════════════");
  out.push("");
  out.push(`  STATUS:  ${(payload?.shipmentStatus || payload?.status || "—").toUpperCase()}`);
  out.push("");

  out.push("─── DOCUMENT ──────────────────────────────────");
  out.push(`  Title : ${v(meta.documentTitle)}`);
  out.push(`  No    : ${v(meta.documentNo)}`);
  out.push(`  Rev   : ${v(meta.revisionNo)}`);
  out.push(`  Issue : ${v(meta.issueDate)}`);
  out.push(`  Area  : ${v(meta.area)}`);
  out.push("");

  out.push("─── ENTRY ─────────────────────────────────────");
  out.push(`  Date  : ${v(payload?.createdDate)}`);
  out.push(`  #     : ${v(payload?.entrySequence)}`);
  if (payload?.uniqueKey) out.push(`  Key   : ${payload.uniqueKey}`);
  out.push("");

  out.push("─── GENERAL INFO ──────────────────────────────");
  out.push(`  Shipment Type      : ${v(payload?.shipmentType)}`);
  out.push(`  Supplier           : ${v(gi.supplierName)}`);
  out.push(`  Brand              : ${v(gi.brand)}`);
  out.push(`  Origin             : ${v(gi.origin)}`);
  out.push(`  Invoice No         : ${v(gi.invoiceNo)}`);
  out.push(`  Airway Bill        : ${v(gi.airwayBill)}`);
  out.push(`  Receiving Address  : ${v(gi.receivingAddress)}`);
  out.push(`  Report On          : ${v(gi.reportOn)}`);
  out.push(`  Sample Received On : ${v(gi.receivedOn)}`);
  out.push(`  Inspection Date    : ${v(gi.inspectionDate)}`);
  out.push(`  Local Logger       : ${v(gi.localLogger)}`);
  out.push(`  Int'l Logger       : ${v(gi.internationalLogger)}`);
  out.push(`  Avg Product Temp   : ${v(gi.temperature)} °C`);
  out.push(`  Vehicle Temp       : ${v(gi.vehicleTemperature)} °C`);
  out.push(`  Avg PH             : ${v(gi.ph)}`);
  out.push("");

  if (includeTable && samples.length) {
    out.push(`─── TEST SAMPLES (${samples.length}) ─────────────────────────`);
    samples.forEach((s, idx) => {
      out.push("");
      out.push(`  • Sample ${idx + 1}: ${v(s.productName)}`);
      ATTR_ROWS.forEach(([key, label]) => {
        out.push(`      ${padR(label, 18)} : ${v(s[key])}`);
      });
    });
    out.push("");
  }

  if (includeTable && lines.length) {
    out.push(`─── PRODUCT LINES (${lines.length}) ──────────────────────────`);
    out.push(`  ${padR("#", 3)}${padR("Product", 24)}${padR("Qty (pcs)", 12)}Weight (kg)`);
    out.push("  ───────────────────────────────────────────");
    lines.forEach((l, i) => {
      out.push(`  ${padR(String(i + 1), 3)}${padR(v(l.name), 24)}${padR(v(l.qty), 12)}${v(l.weight)}`);
    });
    out.push("  ───────────────────────────────────────────");
    out.push(`  TOTAL:${" ".repeat(21)}${padR(v(payload?.totalQuantity), 12)}${v(payload?.totalWeight)}`);
    out.push(`  Avg Weight (kg/pc): ${v(payload?.averageWeight)}`);
    out.push("");
  }

  if (!includeTable) {
    out.push("📄 تفاصيل العيّنات وخطوط الإنتاج كاملة في ملف الـ PDF المرفق.");
    out.push("");
  }

  if (note && String(note).trim()) {
    out.push("─── INSPECTOR NOTE ────────────────────────────");
    out.push(String(note).trim().split("\n").map((x) => "  " + x).join("\n"));
    out.push("");
  }

  out.push("─── SIGNATURES ────────────────────────────────");
  out.push(`  Inspected By : ${v(payload?.inspectedBy)}`);
  out.push(`  Verified By  : ${v(payload?.verifiedBy)}`);
  out.push("");

  if (pdfUrl) {
    out.push("═══════════════════════════════════════════════");
    out.push("📎 FULL PDF REPORT:");
    out.push(pdfUrl);
    out.push("═══════════════════════════════════════════════");
  }
  return out.join("\n");
}

function buildHtmlBody(payload, { note, pdfUrl, attachmentsCount, includeTable = false } = {}) {
  const gi = payload?.generalInfo || {};
  const meta = payload?.docMeta || {};
  const samples = Array.isArray(payload?.samples) ? payload.samples : [];
  const lines = Array.isArray(payload?.productLines) ? payload.productLines : [];
  const status = String(payload?.shipmentStatus || payload?.status || "").toLowerCase();
  const statusColor =
    status.includes("acceptable") ? "#16a34a" :
    (status.includes("average") && !status.includes("below")) ? "#d97706" :
    "#dc2626";
  const safe = (v) => escapeHtml(String(v == null || v === "" ? "—" : v));

  const noteHtml = note && String(note).trim()
    ? `<div style="margin-top:16px;padding:12px 14px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;"><b>Note from inspector:</b><br/>${escapeHtml(note).replace(/\n/g, "<br/>")}</div>`
    : "";

  const pdfHtml = pdfUrl
    ? `<div style="margin-top:16px;text-align:center;"><a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:800;">📎 Download Full PDF Report</a></div>`
    : "";

  const attachInfo = attachmentsCount
    ? `<div style="margin-top:8px;padding:10px 14px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;font-size:13px;color:#1e3a8a;">📎 <b>${attachmentsCount} file(s) attached</b> — PDF report + images.</div>`
    : "";

  let samplesTable = "";
  if (includeTable && samples.length) {
    const cols = samples.map((_s, i) => `<th style="background:#0f172a;color:#fff;border:1px solid #1e293b;padding:6px 8px;font-size:11px;">Sample ${i + 1}</th>`).join("");
    const productRow = samples.map((s) => `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:11px;">${safe(s.productName)}</td>`).join("");
    const attrRows = ATTR_ROWS.map(([key, label]) => {
      const cells = samples.map((s) => `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:11px;">${safe(s[key])}</td>`).join("");
      return `<tr><td style="background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 8px;font-size:11px;font-weight:700;">${label}</td>${cells}</tr>`;
    }).join("");
    samplesTable = `
      <h4 style="margin:18px 0 8px;color:#0f172a;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:4px;">Test Samples (${samples.length})</h4>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11px;">
        <tr><th style="background:#0f172a;color:#fff;border:1px solid #1e293b;padding:6px 8px;font-size:11px;text-align:left;">Attribute</th>${cols}</tr>
        <tr><td style="background:#f1f5f9;border:1px solid #cbd5e1;padding:5px 8px;font-weight:700;">PRODUCT NAME</td>${productRow}</tr>
        ${attrRows}
      </table>`;
  }

  let linesTable = "";
  if (includeTable && lines.length) {
    const rows = lines.map((l, i) =>
      `<tr><td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:12px;text-align:center;">${i + 1}</td>` +
      `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:12px;">${safe(l.name)}</td>` +
      `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:12px;text-align:right;">${safe(l.qty)}</td>` +
      `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:12px;text-align:right;">${safe(l.weight)}</td></tr>`
    ).join("");
    linesTable = `
      <h4 style="margin:18px 0 8px;color:#0f172a;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:4px;">Product Lines (${lines.length})</h4>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;width:40px;">#</th>
          <th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;">Product Name</th>
          <th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;width:90px;">Qty (pcs)</th>
          <th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;width:110px;">Weight (kg)</th>
        </tr>
        ${rows}
        <tr style="background:#f8fafc;font-weight:800;">
          <td colspan="2" style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">TOTAL</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">${safe(payload?.totalQuantity)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">${safe(payload?.totalWeight)}</td>
        </tr>
        <tr><td colspan="4" style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;font-style:italic;color:#475569;">Average Weight (kg/pc): ${safe(payload?.averageWeight)}</td></tr>
      </table>`;
  }

  return `
  <div style="font-family:Inter,Roboto,Arial,sans-serif;background:#f1f5f9;padding:20px;color:#0f172a;">
    <table cellpadding="0" cellspacing="0" style="max-width:780px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.08);">
      <tr><td style="background:#0f172a;color:#fff;padding:18px 22px;">
        <table style="width:100%;"><tr>
          <td><div style="font-size:18px;font-weight:900;letter-spacing:.5px;">AL MAWASHI</div>
              <div style="font-size:12px;opacity:.85;">Trans Emirates Livestock Trading L.L.C.</div></td>
          <td style="text-align:right;"><div style="font-size:14px;font-weight:800;">QCS Incoming Shipment Report</div>
              <div style="font-size:11px;opacity:.85;">Date: ${safe(payload?.createdDate)} · #${safe(payload?.entrySequence)}</div></td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 22px;">
        <div style="background:${statusColor};color:#fff;padding:8px 16px;border-radius:6px;font-weight:800;font-size:14px;text-align:center;letter-spacing:1px;">
          STATUS: ${safe(payload?.shipmentStatus || payload?.status || "—").toUpperCase()}
        </div>
        ${attachInfo}

        <h4 style="margin:18px 0 8px;color:#0f172a;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:4px;">Shipment Identification</h4>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;width:25%;font-weight:700;">Shipment Type</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(payload?.shipmentType)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;width:25%;font-weight:700;">Entry Key</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(payload?.uniqueKey)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Supplier</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.supplierName)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Brand</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.brand)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Origin</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.origin)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Invoice No</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.invoiceNo)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Airway Bill</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.airwayBill)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Receiving Address</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.receivingAddress)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Inspection Date</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.inspectionDate)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Local / Int'l Logger</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.localLogger)} / ${safe(gi.internationalLogger)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Avg Product Temp (°C)</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.temperature)}</td>
              <td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Vehicle Temp (°C)</td><td style="border:1px solid #cbd5e1;padding:6px 8px;">${safe(gi.vehicleTemperature)}</td></tr>
          <tr><td style="background:#f8fafc;border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">Avg PH</td><td style="border:1px solid #cbd5e1;padding:6px 8px;" colspan="3">${safe(gi.ph)}</td></tr>
        </table>

        ${samplesTable}
        ${linesTable}
        ${!includeTable ? `<div style="margin-top:16px;padding:12px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;color:#64748b;text-align:center;">📄 تفاصيل العيّنات وخطوط الإنتاج كاملة في ملف الـ PDF المرفق.</div>` : ""}

        <h4 style="margin:18px 0 8px;color:#0f172a;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:4px;">Signatures</h4>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr><td style="border:1px solid #cbd5e1;padding:10px 12px;width:50%;"><b>Inspected By:</b> ${safe(payload?.inspectedBy)}</td>
              <td style="border:1px solid #cbd5e1;padding:10px 12px;width:50%;"><b>Verified By:</b> ${safe(payload?.verifiedBy)}</td></tr>
        </table>

        ${noteHtml}
        ${pdfHtml}
      </td></tr>

      <tr><td style="background:#f8fafc;padding:14px 22px;color:#64748b;font-size:11px;text-align:center;">
        Generated automatically by Al Mawashi QCS System
      </td></tr>
    </table>
  </div>`;
}

/* ===== Exported config ===== */
export const qcsEmailConfig = {
  reportTitle: "QCS Shipment Report",
  getSubject: (payload) => {
    const supplier = payload?.generalInfo?.supplierName || "";
    const inv = payload?.generalInfo?.invoiceNo || "";
    const type = payload?.shipmentType || "";
    const date = payload?.createdDate || new Date().toISOString().slice(0, 10);
    return `[QCS] Shipment Report — ${type || "Raw Material"}${supplier ? " · " + supplier : ""}${inv ? " · Invoice " + inv : ""} · ${date}`;
  },
  generatePdf: async (payload) => generateReportPdf(payload),
  buildHtml: buildHtmlBody,
  buildText: buildPlainTextBody,
  getImages: (payload) => Array.isArray(payload?.images) ? payload.images.filter(Boolean) : [],
  getCertificate: (payload) => payload?.certificateUrl
    ? { url: payload.certificateUrl, name: payload.certificateName }
    : null,
  getSummary: (payload) => ({
    status: payload?.shipmentStatus || payload?.status || "—",
    statusKind: statusKind(payload?.shipmentStatus || payload?.status),
    fields: [
      { label: "Type",     value: payload?.shipmentType || "—" },
      { label: "Supplier", value: payload?.generalInfo?.supplierName || "—" },
      { label: "Invoice",  value: payload?.generalInfo?.invoiceNo || "—" },
      { label: "Date",     value: payload?.createdDate || "—" },
      { label: "Samples",  value: String(payload?.samples?.length || 0) },
      { label: "Lines",    value: String(payload?.productLines?.length || 0) },
    ],
  }),
};
