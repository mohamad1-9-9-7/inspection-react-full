// src/utils/nodeToPdf.js
// تصدير أي عنصر DOM إلى ملف PDF — يُستخدم في HSE وفي نظام التدريب،
// لكن html2canvas و jsPDF تُحمّلان ديناميكياً حتى لا تكبر حزمة البناء.

/**
 * يلتقط عنصر DOM ويحوّله إلى PDF متعدد الصفحات ثم ينزّله.
 * @param {HTMLElement} node   العنصر المراد التقاطه
 * @param {string} filename    اسم الملف (بدون أو مع .pdf)
 * @param {{orientation?: "p"|"l", margin?: number, scale?: number}} opts
 */
export async function exportNodeToPdf(node, filename, opts = {}) {
  if (!node) throw new Error("PDF content not ready.");
  const { orientation = "p", margin = 26, scale = 2 } = opts;

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, { scale, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF(orientation, "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - margin * 2;
  const ratio = imgW / canvas.width;
  const sliceH = Math.floor((pageH - margin * 2) / ratio);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    let h = Math.min(sliceH, canvas.height - y);
    // Don't cut through a table row or a boxed block: back off to the nearest
    // blank scanline above the ideal cut (up to 22% of a page).
    if (y + h < canvas.height) h = safeSliceHeight(canvas, y, h);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage("a4", orientation);
    pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, imgW, h * ratio);
    first = false;
    y += h;
  }

  pdf.save(/\.pdf$/i.test(filename) ? filename : `${filename}.pdf`);
}

/**
 * يبحث عن أقرب سطر أبيض فوق موضع القص المثالي حتى لا يُقطع صفٌّ من الجدول
 * أو صندوق إلى نصفين بين صفحتين. يرجع الارتفاع الأصلي إن لم يجد سطراً فارغاً.
 */
function safeSliceHeight(canvas, y, idealH) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return idealH;
  const maxBackoff = Math.floor(idealH * 0.22);
  const step = 2;
  let data;
  try {
    data = ctx.getImageData(0, y + idealH - maxBackoff, canvas.width, maxBackoff).data;
  } catch {
    return idealH; // tainted canvas — keep the plain cut
  }
  const w = canvas.width;
  for (let row = maxBackoff - 1; row >= 0; row -= step) {
    let blank = true;
    for (let x = 0; x < w; x += 3) {
      const i = (row * w + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) { blank = false; break; }
    }
    if (blank) return idealH - maxBackoff + row;
  }
  return idealH;
}

/** اسم ملف آمن */
export function safeFileName(s) {
  return String(s || "document").replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 80);
}

/**
 * ستايل حاوية الوثيقة المخفية.
 * تُركّب عبر createPortal على document.body (خارج #root) للهروب من
 * قاعدة globals.css: `#root * { font-size: 14px !important }`.
 */
export function pdfStageStyle(width = 1120) {
  return {
    position: "fixed",
    left: -20000,
    top: 0,
    width,
    background: "#fff",
    color: "#111827",
    padding: 28,
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    lineHeight: 1.5,
    zIndex: -1,
  };
}

/* ---------- عناصر مشتركة لتنسيق وثائق PDF ---------- */

export const PDF_UI = {
  h1: { fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: 0.3 },
  sub: { fontSize: 12, color: "#4b5563", marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 800, margin: "16px 0 6px", color: "#111827" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 10 },
  th: {
    border: "1px solid #9ca3af",
    background: "#e5e7eb",
    padding: "5px 6px",
    fontSize: 10,
    fontWeight: 800,
    textAlign: "center",
    color: "#111827",
  },
  td: {
    border: "1px solid #9ca3af",
    padding: "5px 6px",
    fontSize: 10,
    verticalAlign: "top",
    color: "#111827",
  },
  metaTable: { width: "100%", borderCollapse: "collapse", fontSize: 10, marginTop: 10 },
  signBox: {
    border: "1px solid #9ca3af",
    padding: "8px 10px",
    fontSize: 10,
    minHeight: 62,
    verticalAlign: "top",
  },
};
