// src/pages/complaints/complaintsEmail.js
// -----------------------------------------------------------------------------
// Bilingual e-mail HTML/text + PDF for a Quality Complaint.
// The e-mail carries TWO copies side-by-side: English (LTR) then Arabic (RTL),
// so the branch/supplier can read whichever language they operate in.
// -----------------------------------------------------------------------------

import {
  CATEGORIES, SEVERITY, STATUSES, catById, sevById, statusById,
  targetLabelOf, dmy,
} from "./complaintsCore";

const esc = (s) => String(s || "").replace(/[<>&"]/g, (m) =>
  ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;" }[m]));

const unitLabel = (r) => r.qtyUnit === "أخرى" ? (r.customQtyUnit || "") : (r.qtyUnit || "");
const catAr = (id) => catById(id)?.ar || id;
const catEn = (id) => catById(id)?.en || id;

/* ═══════════════════════════ PDF (English) ══════════════════════════
   jsPDF does not shape Arabic reliably, so the PDF stays English.
   The Arabic copy travels inside the HTML e-mail body. */

async function ensureJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}
async function ensureAutoTable() {
  if (window.jspdf?.jsPDF?.API?.autoTable) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";
    s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF-AutoTable"));
    document.head.appendChild(s);
  });
}

export async function generateComplaintPdf(rep) {
  const JsPDF = await ensureJsPDF();
  await ensureAutoTable();
  const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const marginL = 40, marginR = 40;
  const pageWidth = doc.internal.pageSize.getWidth();

  const target = rep?.target === "supplier" ? "Supplier" : "Branch";
  const targetName = rep?.target === "supplier"
    ? (rep?.supplier || "")
    : (rep?.branch === "OTHER" ? rep?.customBranch : rep?.branch || "");

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("AL MAWASHI", marginL, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Trans Emirates Livestock Trading L.L.C.", marginL, 56);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(180, 0, 0);
    doc.text("QUALITY COMPLAINT", pageWidth - marginR, 40, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(`Ref: ${rep?.refNo || "-"}`, pageWidth - marginR, 56, { align: "right" });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.6);
    doc.line(marginL, 66, pageWidth - marginR, 66);
    doc.setTextColor(0);
  };
  drawHeader();

  const sev = sevById(rep?.severity);
  const st  = statusById(rep?.status);
  const meta = [
    ["Complaint Date", rep?.complaintDate || "-"],
    [target,           targetName || "-"],
    ["Severity",       sev.en],
    ["Status",         st.en],
    ["Categories",     (rep?.categories || []).map(catEn).join(", ") || "-"],
    ["Subject",        rep?.subject || "-"],
  ];
  doc.autoTable({
    startY: 84,
    margin: { top: 80, left: marginL, right: marginR },
    head: [["Field", "Value"]],
    body: meta,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 130, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: "auto" } },
    didDrawPage: () => drawHeader(),
  });

  const items = (rep?.items || []).filter((r) => r.itemCode || r.productName || r.quantity);
  if (items.length) {
    const body = items.map((r, i) => [
      String(i + 1),
      r.itemCode || "",
      r.productName || "",
      String(r.quantity || ""),
      unitLabel(r),
      r.expiry || "",
      r.remarks || "",
    ]);
    doc.autoTable({
      startY: (doc.lastAutoTable?.finalY || 100) + 12,
      margin: { top: 80, left: marginL, right: marginR },
      head: [["#", "Code", "Product", "Qty", "Unit", "Expiry", "Remarks"]],
      body,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "center", cellWidth: 24 }, 3: { halign: "right" }, 4: { halign: "center" } },
      didDrawPage: () => drawHeader(),
    });
  }

  const noteY = (doc.lastAutoTable?.finalY || 100) + 18;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text("An Arabic copy of this complaint is included in the e-mail body.", marginL, noteY);

  const imgs = rep?.images || [];
  if (imgs.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(`Photos (${imgs.length}):`, marginL, noteY + 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(37, 99, 235);
    imgs.slice(0, 12).forEach((u, i) => {
      doc.textWithLink(`  ${i + 1}. ${u}`, marginL, noteY + 32 + i * 11, { url: u });
    });
    if (imgs.length > 12) {
      doc.setTextColor(100, 116, 139);
      doc.text(`  … +${imgs.length - 12} more (see e-mail body).`, marginL, noteY + 32 + 12 * 11);
    }
  }

  doc.setTextColor(0);
  const filename = `qa_complaint_${(rep?.refNo || rep?.id || "new").toString().replace(/[^\w-]/g, "_")}_${(rep?.complaintDate || "").replace(/-/g, "")}.pdf`;
  const blob = doc.output("blob");
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] || "";
  return { blob, base64, filename };
}

/* ═══════════════════════════ Plain text (bilingual) ══════════════════════ */

export function buildComplaintText(rep) {
  const items = (rep?.items || []).filter((r) => r.itemCode || r.productName || r.quantity);
  const itemsEn = items.length
    ? items.map((r, i) => `  ${i + 1}. ${r.itemCode || "-"} ${r.productName || ""} — ${r.quantity || ""} ${unitLabel(r)}${r.expiry ? " · exp " + r.expiry : ""}${r.remarks ? " · " + r.remarks : ""}`).join("\n")
    : "";
  const itemsAr = items.length
    ? items.map((r, i) => `  ${i + 1}. ${r.itemCode || "—"} ${r.productName || ""} — ${r.quantity || ""} ${unitLabel(r)}${r.expiry ? " · تنتهي " + r.expiry : ""}${r.remarks ? " · " + r.remarks : ""}`).join("\n")
    : "";
  const catsEn = (rep?.categories || []).map(catEn).join(", ") || "-";
  const catsAr = (rep?.categories || []).map(catAr).join("، ") || "—";
  const sev = sevById(rep?.severity);
  const st  = statusById(rep?.status);

  return [
    "AL MAWASHI — Quality Complaint",
    `Ref: ${rep?.refNo || "-"} · Date: ${rep?.complaintDate || "-"}`,
    `Target: ${targetLabelOf(rep)} (${rep?.target === "supplier" ? "Supplier" : "Branch"})`,
    `Severity: ${sev.en} · Status: ${st.en}`,
    `Categories: ${catsEn}`,
    `Subject: ${rep?.subject || "-"}`,
    "",
    rep?.description || "",
    "",
    itemsEn ? "Items:\n" + itemsEn : "",
    (rep?.images || []).length ? "\nPhotos:\n" + rep.images.map((u, i) => `  ${i + 1}. ${u}`).join("\n") : "",
    "",
    "────────────────────────────────────────",
    "",
    "المواشي – شكوى جودة",
    `المرجع: ${rep?.refNo || "—"} · التاريخ: ${rep?.complaintDate || "—"}`,
    `الجهة: ${targetLabelOf(rep)} (${rep?.target === "supplier" ? "مورد" : "فرع"})`,
    `الخطورة: ${sev.ar} · الحالة: ${st.ar}`,
    `الأسباب: ${catsAr}`,
    `الموضوع: ${rep?.subject || "—"}`,
    "",
    itemsAr ? "الأصناف:\n" + itemsAr : "",
  ].filter(Boolean).join("\n");
}

/* ═══════════════════════════ HTML e-mail (bilingual) ══════════════════════
   Consumed by EmailSendModal as `config.buildHtml(payload, opts)`. */

export function buildEmailHtml(c, opts = {}) {
  const extraNote = typeof opts === "string" ? opts : (opts.note || "");

  const items   = (c.items || []).filter((r) => r.itemCode || r.productName || r.quantity);
  const catsEn  = (c.categories || []).map(catEn).join(", ") || "—";
  const catsAr  = (c.categories || []).map(catAr).join("، ") || "—";
  const sev     = sevById(c.severity);
  const st      = statusById(c.status);
  const partyEn = c.target === "supplier"
    ? `Supplier: ${esc(targetLabelOf(c))}`
    : `Branch: ${esc(targetLabelOf(c))}`;
  const partyAr = c.target === "supplier"
    ? `المورد: ${esc(targetLabelOf(c))}`
    : `الفرع: ${esc(targetLabelOf(c))}`;

  const itemsHead = (labels) => `
    <thead>
      <tr>
        ${labels.map((l) => `<th style="border:1px solid #dbe4ec;padding:6px;background:#eef2f7;font-weight:900">${l}</th>`).join("")}
      </tr>
    </thead>`;
  const rowsHtml = (arabic) => items.map((r, i) => `
    <tr>
      <td style="border:1px solid #dbe4ec;padding:6px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #dbe4ec;padding:6px;font-family:monospace">${esc(r.itemCode)}</td>
      <td style="border:1px solid #dbe4ec;padding:6px">${esc(r.productName)}</td>
      <td style="border:1px solid #dbe4ec;padding:6px;text-align:center">${esc(r.quantity)} ${esc(unitLabel(r))}</td>
      <td style="border:1px solid #dbe4ec;padding:6px">${esc(r.expiry) || (arabic ? "—" : "-")}</td>
      <td style="border:1px solid #dbe4ec;padding:6px">${esc(r.remarks) || (arabic ? "—" : "-")}</td>
    </tr>`).join("");

  const imgs = (c.images || []).map((u) => `
    <a href="${esc(u)}" style="display:inline-block;margin:4px">
      <img src="${esc(u)}" alt="photo" style="max-width:220px;max-height:180px;border-radius:8px;border:1px solid #cbd5e1" />
    </a>`).join("");

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;line-height:1.7">

  <!-- ═════ ENGLISH (LTR) ═════ -->
  <div dir="ltr" style="text-align:left">
    <div style="background:linear-gradient(90deg,#0f172a,#1e3a8a,#4f46e5);color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">
      <div style="font-weight:900;font-size:18px">AL MAWASHI — Official Quality Complaint</div>
      <div style="opacity:.9;font-size:12px;margin-top:4px">
        Complaint date: ${dmy(c.complaintDate)} · ${partyEn} ${c.refNo ? "· Ref: " + esc(c.refNo) : ""}
      </div>
    </div>
    <div style="border:1px solid #dbe4ec;border-top:0;padding:16px 18px;border-radius:0 0 10px 10px;background:#fff">
      ${extraNote ? `<div style="background:#fff7ed;border:1px dashed #fdba74;color:#7c2d12;padding:10px 12px;border-radius:8px;margin-bottom:10px">${esc(extraNote)}</div>` : ""}
      <p style="margin:0 0 8px"><b>Subject:</b> ${esc(c.subject) || "-"}</p>
      <p style="margin:0 0 8px">
        <b>Severity:</b>
        <span style="display:inline-block;background:${sev.tone};color:#fff;padding:2px 8px;border-radius:999px;font-weight:900">${sev.en}</span>
        &nbsp;·&nbsp; <b>Status:</b>
        <span style="display:inline-block;background:${st.tone};color:#fff;padding:2px 8px;border-radius:999px;font-weight:900">${st.en}</span>
      </p>
      <p style="margin:0 0 8px"><b>Categories:</b> ${esc(catsEn)}</p>
      ${c.description ? `<p style="margin:0 0 8px"><b>Details:</b></p><div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;line-height:1.9">${esc(c.description)}</div>` : ""}
      ${items.length ? `
        <div style="margin-top:12px"><b>Items:</b></div>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px">
          ${itemsHead(["#","Code","Product","Qty","Expiry","Remarks"])}
          <tbody>${rowsHtml(false)}</tbody>
        </table>` : ""}
      ${imgs ? `<div style="margin-top:12px"><b>Photos:</b></div><div style="margin-top:6px">${imgs}</div>` : ""}
      <p style="margin-top:16px;font-size:12px;color:#64748b">
        This complaint is issued automatically by the Al Mawashi QMS. Please reply within 48 hours with a corrective action.
      </p>
    </div>
  </div>

  <!-- ═════ separator ═════ -->
  <div style="height:1px;background:linear-gradient(90deg,transparent,#cbd5e1,transparent);margin:24px 0"></div>

  <!-- ═════ ARABIC (RTL) ═════ -->
  <div dir="rtl" style="text-align:right;font-family:Cairo,'Segoe UI',Arial,sans-serif">
    <div style="background:linear-gradient(90deg,#4f46e5,#1e3a8a,#0f172a);color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">
      <div style="font-weight:900;font-size:18px">شكوى رسمية من قسم الجودة – AL MAWASHI</div>
      <div style="opacity:.9;font-size:12px;margin-top:4px">
        تاريخ الشكوى: ${dmy(c.complaintDate)} · ${partyAr} ${c.refNo ? "· مرجع: " + esc(c.refNo) : ""}
      </div>
    </div>
    <div style="border:1px solid #dbe4ec;border-top:0;padding:16px 18px;border-radius:0 0 10px 10px;background:#fff">
      ${extraNote ? `<div style="background:#fff7ed;border:1px dashed #fdba74;color:#7c2d12;padding:10px 12px;border-radius:8px;margin-bottom:10px">${esc(extraNote)}</div>` : ""}
      <p style="margin:0 0 8px"><b>الموضوع:</b> ${esc(c.subject) || "—"}</p>
      <p style="margin:0 0 8px">
        <b>الخطورة:</b>
        <span style="display:inline-block;background:${sev.tone};color:#fff;padding:2px 8px;border-radius:999px;font-weight:900">${sev.ar}</span>
        &nbsp;·&nbsp; <b>الحالة:</b>
        <span style="display:inline-block;background:${st.tone};color:#fff;padding:2px 8px;border-radius:999px;font-weight:900">${st.ar}</span>
      </p>
      <p style="margin:0 0 8px"><b>الأسباب:</b> ${esc(catsAr)}</p>
      ${c.description ? `<p style="margin:0 0 8px"><b>التفاصيل:</b></p><div style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;line-height:2">${esc(c.description)}</div>` : ""}
      ${items.length ? `
        <div style="margin-top:12px"><b>الأصناف:</b></div>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px">
          ${itemsHead(["#","الكود","الصنف","الكمية","الصلاحية","ملاحظة"])}
          <tbody>${rowsHtml(true)}</tbody>
        </table>` : ""}
      ${imgs ? `<div style="margin-top:12px"><b>الصور:</b></div><div style="margin-top:6px">${imgs}</div>` : ""}
      <p style="margin-top:16px;font-size:12px;color:#64748b">
        تُصدر هذه الشكوى تلقائيًا من نظام Al Mawashi QMS. يُرجى الردّ خلال ٤٨ ساعة بإجراء تصحيحي.
      </p>
    </div>
  </div>

</div>`;
}

/* Suggested "intro" line for the EmailSendModal — bilingual by default. */
export const defaultIntro = () =>
`Dear Sir / Madam,

Please find below the official Quality Complaint dated {date}. Kindly take the required corrective action within 48 hours and share the supporting evidence with us.

Best regards,
Quality Assurance — AL MAWASHI

────────────────────────────────────────

السّادة الكرام،
تحيّة طيّبة وبعد،

مرفق أدناه شكوى الجودة الرسمية بتاريخ {date}. يُرجى الاطّلاع على التفاصيل واتخاذ الإجراء التصحيحي المطلوب خلال ٤٨ ساعة، وموافاتنا بالمرفقات الداعمة.

مع الشكر،
إدارة ضبط الجودة – AL MAWASHI`;
