// src/pages/complaints/complaintsEmail.js
// -----------------------------------------------------------------------------
// E-mail subject, HTML/text body and PDF for a Quality Complaint.
// The e-mail repeats the entry page word for word: its subject is the typed
// "Short subject" and its body leads with the typed complaint text, followed by
// one reference card with bilingual (EN / AR) labels.
// -----------------------------------------------------------------------------

import {
  catById, sevById, statusById, targetLabelOf, dmy,
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
  doc.text("The full complaint text (as written) is in the e-mail body.", marginL, noteY);

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

/* ═══════════════════════════ Subject ══════════════════════════════
   The e-mail subject IS the "Short subject" typed on the entry page — no
   prefixes, refs or party names bolted on (those live in the body). */

export function complaintEmailSubject(rep) {
  const typed = String(rep?.subject || "").trim();
  if (typed) return typed;
  return `Quality Complaint — ${targetLabelOf(rep)}`;
}

/* ═══════════════════════════ Shared details ═════════════════════════ */

const cleanItems = (rep) =>
  (rep?.items || []).filter((r) => r.itemCode || r.productName || r.quantity);

const partyLabels = (rep) => rep?.target === "supplier"
  ? { en: "Supplier", ar: "المورد" }
  : { en: "Branch",   ar: "الفرع" };

/* The complaint text exactly as typed — only trailing whitespace trimmed
   and Windows line breaks normalised, never reworded or re-ordered. */
const typedText = (rep) => String(rep?.description || "").replace(/\r\n?/g, "\n").trim();

/* ═══════════════════════════ Plain text ══════════════════════════════
   Used by the WhatsApp / copy options. Same order as the HTML: the typed
   complaint text first, verbatim, then the reference details. */

export function buildComplaintText(rep, opts = {}) {
  const intro = String(opts?.intro || "").trim();
  const note  = String(opts?.note || "").trim();
  const text  = typedText(rep);
  const items = cleanItems(rep);
  const party = partyLabels(rep);
  const sev   = sevById(rep?.severity);
  const cats  = (rep?.categories || []);

  const details = [
    `Ref / المرجع: ${rep?.refNo || "—"}`,
    `Date / التاريخ: ${dmy(rep?.complaintDate)}`,
    `${party.en} / ${party.ar}: ${targetLabelOf(rep)}`,
    cats.length ? `Reasons / الأسباب: ${cats.map(catEn).join(", ")} — ${cats.map(catAr).join("، ")}` : "",
    `Severity / الخطورة: ${sev.en} — ${sev.ar}`,
  ].filter(Boolean);

  const itemLines = items.map((r, i) =>
    `  ${i + 1}. ${[r.itemCode, r.productName].filter(Boolean).join(" · ")} — ${r.quantity || ""} ${unitLabel(r)}`.trimEnd()
    + (r.expiry ? ` · Exp ${dmy(r.expiry)}` : "")
    + (r.remarks ? ` · ${r.remarks}` : ""));

  const photos = (rep?.images || []).filter(Boolean);

  return [
    intro,
    note,
    text,
    "────────────────────",
    details.join("\n"),
    itemLines.length ? `\nItems / الأصناف:\n${itemLines.join("\n")}` : "",
    photos.length ? `\nPhotos / الصور:\n${photos.map((u, i) => `  ${i + 1}. ${u}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n");
}

/* ═══════════════════════════ HTML e-mail ══════════════════════════════
   Consumed by EmailSendModal as `config.buildHtml(payload, opts)`.
   The body leads with the subject and the complaint text EXACTLY as typed on
   the entry page (dir="auto" + plaintext bidi, so Arabic lines read RTL and
   English lines LTR, just like in the form). One reference card follows with
   bilingual labels — no second, re-worded copy of the text. */

const FONT = "'Segoe UI',Tahoma,Cairo,Arial,sans-serif";
const TD_LABEL = "padding:9px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:12px;font-weight:700;width:34%;vertical-align:top";
const TD_VALUE = "padding:9px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top";
const TH_ITEM  = "padding:8px 10px;background:#0f766e;color:#ffffff;font-size:12px;font-weight:700;text-align:start;white-space:nowrap";
const TD_ITEM  = "padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;vertical-align:top";

const pill = (bg, text) =>
  `<span style="display:inline-block;background:${bg};color:#ffffff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;margin:2px 4px 2px 0">${text}</span>`;

const sectionTitle = (en, ar) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
    <tr>
      <td dir="ltr" style="font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#0f766e">${en}</td>
      <td dir="rtl" style="font-size:13px;font-weight:800;color:#0f766e;text-align:right">${ar}</td>
    </tr>
  </table>`;

export function buildEmailHtml(c, opts = {}) {
  const extraNote = typeof opts === "string" ? opts : (opts?.note || "");
  const intro     = typeof opts === "string" ? "" : String(opts?.intro || "").trim();
  const text      = typedText(c);
  const items     = cleanItems(c);
  const party     = partyLabels(c);
  const sev       = sevById(c?.severity);
  const cats      = (c?.categories || []);
  const photos    = (c?.images || []).filter(Boolean);
  const subject   = complaintEmailSubject(c);

  const autoText = (s, extra = "") =>
    `<div dir="auto" style="white-space:pre-wrap;unicode-bidi:plaintext;text-align:start;${extra}">${esc(s)}</div>`;

  const detailRow = (en, ar, value) => `
    <tr>
      <td style="${TD_LABEL}">${en}<br><span dir="rtl" style="font-weight:600;color:#64748b">${ar}</span></td>
      <td style="${TD_VALUE}">${value}</td>
    </tr>`;

  const catPills = cats.length
    ? cats.map((id) => {
        const cat = catById(id);
        const en = catEn(id), ar = catAr(id);
        return pill(cat?.tone || "#475569", esc(en === ar ? en : `${en} · ${ar}`));
      }).join("")
    : "—";

  const itemsHtml = items.length ? `
    ${sectionTitle("Items involved", "الأصناف")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px">
      <tr>
        <th style="${TH_ITEM};text-align:center">#</th>
        <th style="${TH_ITEM}">Code / الكود</th>
        <th style="${TH_ITEM}">Product / الصنف</th>
        <th style="${TH_ITEM};text-align:center">Qty / الكمية</th>
        <th style="${TH_ITEM}">Expiry / الصلاحية</th>
        <th style="${TH_ITEM}">Remarks / ملاحظات</th>
      </tr>
      ${items.map((r, i) => `
      <tr style="background:${i % 2 ? "#f8fafc" : "#ffffff"}">
        <td style="${TD_ITEM};text-align:center;color:#64748b">${i + 1}</td>
        <td style="${TD_ITEM};font-family:Consolas,monospace">${esc(r.itemCode) || "—"}</td>
        <td dir="auto" style="${TD_ITEM};font-weight:600">${esc(r.productName) || "—"}</td>
        <td style="${TD_ITEM};text-align:center;white-space:nowrap">${esc(r.quantity) || "—"} ${esc(unitLabel(r))}</td>
        <td style="${TD_ITEM};white-space:nowrap">${r.expiry ? esc(dmy(r.expiry)) : "—"}</td>
        <td dir="auto" style="${TD_ITEM}">${esc(r.remarks) || "—"}</td>
      </tr>`).join("")}
    </table>` : "";

  const photosHtml = photos.length ? `
    ${sectionTitle(`Photos (${photos.length})`, "الصور")}
    <div>${photos.map((u, i) => `
      <a href="${esc(u)}" target="_blank" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none">
        <img src="${esc(u)}" alt="Photo ${i + 1}" width="200" style="display:block;width:200px;max-width:100%;height:auto;border-radius:8px;border:1px solid #cbd5e1" />
      </a>`).join("")}
    </div>` : "";

  return `
<div style="background:#f1f5f9;padding:20px 12px;font-family:${FONT};color:#0f172a;line-height:1.7">
  <div style="max-width:780px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">

    <!-- header -->
    <div style="background:#0f766e;background:linear-gradient(135deg,#115e59,#0f766e 55%,#0891b2);color:#ffffff;padding:18px 22px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td dir="ltr" style="color:#ffffff;vertical-align:top">
            <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.85">AL MAWASHI · Quality Assurance</div>
            <div style="font-size:19px;font-weight:800;margin-top:2px">Quality Complaint</div>
          </td>
          <td dir="rtl" style="color:#ffffff;text-align:right;vertical-align:top">
            <div style="font-size:12px;font-weight:700;opacity:.85">المواشي · ضبط الجودة</div>
            <div style="font-size:19px;font-weight:800;margin-top:2px">شكوى جودة</div>
          </td>
        </tr>
      </table>
      <div style="margin-top:12px">
        ${c?.refNo ? `<span style="display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;font-family:Consolas,monospace;margin-right:6px">${esc(c.refNo)}</span>` : ""}
        <span style="display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;margin-right:6px">${dmy(c?.complaintDate)}</span>
        <span style="display:inline-block;background:${sev.tone};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700">${sev.en} · ${sev.ar}</span>
      </div>
    </div>

    <div style="padding:20px 22px 8px">
      ${intro ? autoText(intro, "margin:0 0 14px;font-size:14px;color:#334155") : ""}
      ${extraNote ? autoText(extraNote, "background:#fff7ed;border:1px solid #fdba74;color:#7c2d12;padding:10px 12px;border-radius:8px;margin:0 0 14px;font-size:13px") : ""}

      <!-- subject: exactly as typed -->
      ${autoText(subject, "font-size:18px;font-weight:800;color:#0f172a;margin:0 0 12px;line-height:1.5")}

      <!-- complaint text: exactly as typed -->
      ${text ? autoText(text, "font-size:15px;line-height:1.9;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0f766e;border-radius:8px;padding:14px 16px") : ""}

      ${sectionTitle("Complaint details", "بيانات الشكوى")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-bottom:0">
        ${detailRow("Reference", "المرجع", `<span style="font-family:Consolas,monospace">${esc(c?.refNo) || "—"}</span>`)}
        ${detailRow("Complaint date", "تاريخ الشكوى", dmy(c?.complaintDate))}
        ${detailRow(party.en, party.ar, `<span dir="auto">${esc(targetLabelOf(c))}</span>`)}
        ${detailRow("Reasons", "الأسباب", catPills)}
        ${detailRow("Severity", "الخطورة", pill(sev.tone, `${sev.en} · ${sev.ar}`))}
      </table>

      ${itemsHtml}
      ${photosHtml}
    </div>

    <!-- footer -->
    <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11.5px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td dir="ltr" style="color:#64748b;font-size:11.5px">Sent from the Al Mawashi Quality Management System.</td>
          <td dir="rtl" style="color:#64748b;font-size:11.5px;text-align:right">أُرسلت من نظام إدارة الجودة – المواشي.</td>
        </tr>
      </table>
    </div>
  </div>
</div>`;
}
