// qcsReportPdf.js
// Builds a professional PDF for QCS Incoming Shipment Report.
// Returns { blob, base64, filename } via generateReportPdf(payload).

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ATTR_LABELS = {
  temperature: "Product Temp",
  ph: "Product PH",
  slaughterDate: "Slaughter Date",
  expiryDate: "Expiry Date",
  broken: "Broken / Cut",
  appearance: "Appearance",
  bloodClots: "Blood Clots",
  colour: "Colour",
  fatDiscoloration: "Fat Discoloration",
  meatDamage: "Meat Damage",
  foreignMatter: "Hair / Foreign Matter",
  texture: "Texture",
  testicles: "Testicles",
  smell: "Smell",
};

const ATTR_ORDER = [
  "temperature","ph","slaughterDate","expiryDate","broken","appearance",
  "bloodClots","colour","fatDiscoloration","meatDamage","foreignMatter",
  "texture","testicles","smell",
];

function safe(v) {
  return v === null || v === undefined ? "" : String(v);
}

function fmtDate(ymd) {
  if (!ymd) return "";
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(ymd);
}

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("acceptable")) return [22, 163, 74];     // green
  if (s.includes("average") && !s.includes("below")) return [217, 119, 6]; // amber
  return [220, 38, 38];                                    // red
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Build a PDF Blob from the form payload.
 * @param {object} payload  full form data (same shape as buildReportPayload)
 * @returns {Promise<{blob: Blob, base64: string, filename: string}>}
 */
export async function generateReportPdf(payload) {
  const {
    docMeta = {},
    shipmentType = "",
    shipmentStatus = "",
    generalInfo = {},
    samples = [],
    productLines = [],
    totalQuantity = "",
    totalWeight = "",
    averageWeight = "",
    inspectedBy = "",
    verifiedBy = "",
    notes = "",
    certificateUrl = "",
    images = [],
    createdDate = "",
    entrySequence = "",
    uniqueKey = "",
  } = payload || {};

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 36;
  const marginR = 36;
  const contentW = pageW - marginL - marginR;

  /* ========== Header ========== */
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("AL MAWASHI", marginL, 32);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Trans Emirates Livestock Trading L.L.C.", marginL, 48);

  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text("QCS Incoming Shipment Report", pageW - marginR, 32, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Date: ${fmtDate(createdDate)}   #${safe(entrySequence)}`, pageW - marginR, 48, { align: "right" });

  doc.setTextColor(0, 0, 0);

  /* ========== Status Banner ========== */
  const [r, g, b] = statusColor(shipmentStatus);
  let y = 90;
  doc.setFillColor(r, g, b);
  doc.roundedRect(marginL, y, contentW, 26, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(`STATUS:  ${safe(shipmentStatus).toUpperCase()}`, pageW / 2, y + 17, { align: "center" });
  doc.setTextColor(0, 0, 0);

  /* ========== Doc Meta Strip ========== */
  y += 38;
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    head: [["Document Title", "Document No", "Issue Date", "Rev No", "Area"]],
    body: [[
      safe(docMeta.documentTitle),
      safe(docMeta.documentNo),
      fmtDate(docMeta.issueDate),
      safe(docMeta.revisionNo),
      safe(docMeta.area),
    ]],
  });

  /* ========== Shipment Identification ========== */
  y = doc.lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Shipment Identification", marginL, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold", fillColor: [248, 250, 252] },
      1: { cellWidth: (contentW - 130) / 2 - 65 },
      2: { cellWidth: 130, fontStyle: "bold", fillColor: [248, 250, 252] },
      3: { cellWidth: (contentW - 130) / 2 - 65 },
    },
    body: [
      ["Shipment Type", safe(shipmentType), "Entry Key", safe(uniqueKey)],
      ["Supplier", safe(generalInfo.supplierName), "Brand", safe(generalInfo.brand)],
      ["Origin", safe(generalInfo.origin), "Invoice No", safe(generalInfo.invoiceNo)],
      ["Airway Bill", safe(generalInfo.airwayBill), "Receiving Address", safe(generalInfo.receivingAddress)],
      ["Report On", fmtDate(generalInfo.reportOn), "Sample Received On", fmtDate(generalInfo.receivedOn)],
      ["Inspection Date", fmtDate(generalInfo.inspectionDate), "Local / International Logger", `${safe(generalInfo.localLogger) || "—"} / ${safe(generalInfo.internationalLogger) || "—"}`],
      ["Avg Product Temp (°C)", safe(generalInfo.temperature), "Vehicle Temp (°C)", safe(generalInfo.vehicleTemperature)],
      ["Avg PH", safe(generalInfo.ph), "", ""],
    ],
  });

  /* ========== Samples Table ========== */
  y = doc.lastAutoTable.finalY + 14;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`Test Samples (${samples.length})`, marginL, y);
  y += 6;

  const sampleHead = ["Attribute", ...samples.map((_, i) => `Sample ${i + 1}`)];
  const productNameRow = ["PRODUCT NAME", ...samples.map((s) => safe(s.productName))];
  const attrRows = ATTR_ORDER.map((k) => [
    ATTR_LABELS[k],
    ...samples.map((s) => {
      const v = s[k];
      if (k === "slaughterDate" || k === "expiryDate") return fmtDate(v);
      return safe(v);
    }),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 95 } },
    head: [sampleHead],
    body: [productNameRow, ...attrRows],
  });

  /* ========== Product Lines + Totals ========== */
  if (productLines.length) {
    y = doc.lastAutoTable.finalY + 14;
    if (y > pageH - 200) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Product Lines", marginL, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      head: [["#", "Product Name", "Qty (pcs)", "Weight (kg)"]],
      body: productLines.map((l, i) => [
        String(i + 1),
        safe(l.name),
        safe(l.qty),
        safe(l.weight),
      ]),
      foot: [[
        { content: "TOTAL", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
        { content: safe(totalQuantity), styles: { fontStyle: "bold" } },
        { content: safe(totalWeight), styles: { fontStyle: "bold" } },
      ], [
        { content: `Average Weight (kg/pc): ${safe(averageWeight)}`, colSpan: 4, styles: { halign: "right", fontStyle: "italic" } },
      ]],
      footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
    });
  }

  /* ========== Notes ========== */
  if (notes && String(notes).trim()) {
    y = doc.lastAutoTable.finalY + 14;
    if (y > pageH - 150) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Notes", marginL, y);
    y += 14;
    doc.setFont("helvetica", "normal").setFontSize(9);
    const wrapped = doc.splitTextToSize(String(notes), contentW);
    doc.text(wrapped, marginL, y);
    y += wrapped.length * 11 + 4;
  } else {
    y = doc.lastAutoTable.finalY + 14;
  }

  /* ========== Attachments info ========== */
  if (certificateUrl || (images && images.length)) {
    if (y > pageH - 120) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Digital Attachments", marginL, y); y += 14;
    doc.setFont("helvetica", "normal").setFontSize(9);
    if (certificateUrl) {
      doc.setTextColor(37, 99, 235);
      doc.textWithLink("📎 Halal Certificate (click to open)", marginL, y, { url: certificateUrl });
      doc.setTextColor(0, 0, 0);
      y += 14;
    }
    if (images && images.length) {
      doc.text(`📸 ${images.length} image(s) attached in digital record`, marginL, y);
      y += 14;
    }
  }

  /* ========== Signatures ========== */
  if (y > pageH - 90) { doc.addPage(); y = 50; }
  y = Math.max(y + 20, pageH - 80);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);

  const sigW = (contentW - 20) / 2;
  doc.line(marginL, y, marginL + sigW, y);
  doc.line(marginL + sigW + 20, y, marginL + sigW + 20 + sigW, y);
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`Inspected By: ${safe(inspectedBy)}`, marginL, y + 14);
  doc.text(`Verified By: ${safe(verifiedBy)}`, marginL + sigW + 20, y + 14);

  /* ========== Footer ========== */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic").setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} · Page ${i} of ${pageCount}`,
      pageW / 2, pageH - 20, { align: "center" }
    );
  }

  const blob = doc.output("blob");
  const base64 = await blobToBase64(blob);
  const datePart = (createdDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const typePart = String(shipmentType || "REPORT").replace(/[^A-Za-z0-9]+/g, "_");
  const filename = `Shipment_${typePart}_${datePart}_${safe(entrySequence) || "1"}.pdf`;

  return { blob, base64, filename };
}
