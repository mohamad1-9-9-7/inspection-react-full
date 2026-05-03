// src/pages/haccp and iso/CCPMonitoring/generateMonthlyPDF.js
// مولّد تقرير شهري لمراجعة CCPs (PDF)

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generateMonthlyCCPReport({ year, month, records, ccps, lang = "en" }) {
  const isAr = lang === "ar";

  // تحويل الشهر لاسم
  const monthName = new Date(year, month - 1, 1).toLocaleString(
    isAr ? "ar-EG" : "en-US",
    { month: "long" }
  );
  const periodLabel = `${monthName} ${year}`;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // فلترة سجلات الشهر
  const monthRecords = (records || []).filter((it) => {
    const d = it?.payload?.reportDate || "";
    return d.startsWith(monthKey);
  });

  // إحصائيات
  const total = monthRecords.length;
  let compliant = 0, deviation = 0, pending = 0;
  for (const it of monthRecords) {
    const w = it?.payload?.autoEval?.withinLimit;
    if (w === true) compliant++;
    else if (w === false) deviation++;
    else pending++;
  }
  const rate = total ? Math.round((compliant / total) * 100) : 0;

  // إحصائيات لكل CCP
  const byCCP = {};
  for (const it of monthRecords) {
    const p = it?.payload || {};
    const id = p.ccpId || "unknown";
    if (!byCCP[id]) {
      byCCP[id] = { id, name: "", total: 0, compliant: 0, deviation: 0 };
      const ccp = (ccps || []).find((c) => c.id === id);
      byCCP[id].name = ccp
        ? (isAr ? (ccp.nameAr || ccp.nameEn) : (ccp.nameEn || ccp.nameAr))
        : (p?.ccpSnapshot?.[isAr ? "nameAr" : "nameEn"] || id);
    }
    byCCP[id].total++;
    const w = p?.autoEval?.withinLimit;
    if (w === true) byCCP[id].compliant++;
    else if (w === false) byCCP[id].deviation++;
  }

  // قائمة الانحرافات
  const deviations = monthRecords
    .filter((it) => it?.payload?.autoEval?.withinLimit === false)
    .map((it) => {
      const p = it?.payload || {};
      return {
        date: p.reportDate,
        time: p.timeRecorded,
        ccp: p?.ccpSnapshot?.[isAr ? "nameAr" : "nameEn"] || p.ccpId,
        product: p?.product?.name || "—",
        batch: p?.product?.batch || "—",
        branch: p?.product?.branch || "—",
        reading: `${p?.reading?.value ?? "—"}${p?.ccpSnapshot?.criticalLimit?.unit || ""}`,
        limit: p?.ccpSnapshot?.criticalLimit?.[isAr ? "descAr" : "descEn"] || "—",
        action: p?.deviation?.correctiveAction || "—",
        status: p?.deviation?.productStatus || "—",
        finalReading: p?.deviation?.finalReading
          ? `${p.deviation.finalReading}${p?.ccpSnapshot?.criticalLimit?.unit || ""}`
          : "—",
        monitor: p?.signoff?.monitoredBy || "—",
        verifier: p?.signoff?.verifiedBy || "—",
      };
    });

  /* ===== PDF ===== */
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AL MAWASHI", pageW / 2, 28, { align: "center" });
  doc.setFontSize(13);
  doc.text("CCP Monthly Monitoring Report", pageW / 2, 48, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Period: ${periodLabel}`, pageW / 2, 64, { align: "center" });
  y = 90;

  // Summary box
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Summary", margin, y);
  y += 6;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const summaryLines = [
    `Total Records: ${total}`,
    `Compliance Rate: ${rate}%`,
    `Compliant: ${compliant}`,
    `Deviations: ${deviation}`,
    `Pending: ${pending}`,
  ];
  // عمودين
  const halfW = (pageW - margin * 2) / 2;
  summaryLines.forEach((line, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    doc.text(line, margin + col * halfW, y + row * 16);
  });
  y += Math.ceil(summaryLines.length / 2) * 16 + 16;

  // Compliance status banner
  const bannerColor = rate >= 95 ? [22, 163, 74]
                    : rate >= 80 ? [217, 119, 6]
                    : [185, 28, 28];
  doc.setFillColor(...bannerColor);
  doc.roundedRect(margin, y, pageW - margin * 2, 26, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const statusText = rate >= 95
    ? "COMPLIANT - within target"
    : rate >= 80
    ? "WARNING - below target"
    : "CRITICAL - urgent review required";
  doc.text(`${statusText} (${rate}%)`, pageW / 2, y + 17, { align: "center" });
  y += 40;

  // CCP-by-CCP breakdown
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Breakdown by CCP", margin, y);
  y += 8;

  const ccpRows = Object.values(byCCP).map((c) => [
    c.name,
    c.total,
    c.compliant,
    c.deviation,
    c.total ? `${Math.round((c.compliant / c.total) * 100)}%` : "—",
  ]);

  if (ccpRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["CCP", "Total", "Compliant", "Deviation", "Rate"]],
      body: ccpRows,
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 6 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 20;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("No CCP records this month.", margin, y + 16);
    y += 30;
  }

  // Deviations section
  if (y > 700) { doc.addPage(); y = margin; }
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Deviations Log (${deviations.length})`, margin, y);
  y += 8;

  if (deviations.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.text("No deviations recorded - excellent compliance.", margin, y + 16);
    y += 30;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Date", "CCP", "Product", "Reading", "Limit", "Action"]],
      body: deviations.map((d) => [
        `${d.date}\n${d.time || ""}`,
        d.ccp,
        `${d.product}\n${d.batch !== "—" ? "Lot: " + d.batch : ""}`,
        d.reading,
        d.limit,
        d.action,
      ]),
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5, valign: "top" },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 75 },
        2: { cellWidth: 90 },
        3: { cellWidth: 55, halign: "center", fontStyle: "bold" },
        4: { cellWidth: 75 },
        5: { cellWidth: "auto" },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 30;
  }

  // Sign-off
  if (y > 720) { doc.addPage(); y = margin; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Review & Approval", margin, y);
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 30;

  const sigW = (pageW - margin * 2 - 40) / 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("QA Manager:", margin, y);
  doc.line(margin + 70, y + 2, margin + sigW, y + 2);
  doc.text("Date:", margin + sigW + 20, y);
  doc.line(margin + sigW + 50, y + 2, pageW - margin, y + 2);
  y += 30;

  doc.text("Food Safety Lead:", margin, y);
  doc.line(margin + 90, y + 2, margin + sigW, y + 2);
  doc.text("Date:", margin + sigW + 20, y);
  doc.line(margin + sigW + 50, y + 2, pageW - margin, y + 2);

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated: ${new Date().toLocaleString()} · Page ${i}/${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  const filename = `CCP_Monthly_Report_${monthKey}.pdf`;
  doc.save(filename);
  return { filename, total, compliant, deviation, rate };
}
