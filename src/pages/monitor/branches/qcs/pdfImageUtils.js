export async function loadPdfImage(src, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 1;
        const height = img.naturalHeight || img.height || 1;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          format: "JPEG",
          width,
          height,
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Image could not be loaded"));
    img.src = src;
  });
}

export function fitImageInsideBox(imageWidth, imageHeight, boxWidth, boxHeight) {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { width, height };
}

export function pdfSafeText(value, fallback = "-") {
  const text = String(value ?? "").replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "");
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

export async function addFullPageImage(doc, src, options = {}) {
  const {
    title = "Attachment Image",
    subtitle = "",
    margin = 12,
    accent = [21, 128, 61],
    imageQuality = 0.9,
  } = options;

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const image = await loadPdfImage(src, imageQuality);
  const headerH = subtitle ? 20 : 15;
  const footerH = 8;
  const boxX = margin;
  const boxY = margin + headerH;
  const boxW = pw - margin * 2;
  const boxH = ph - margin * 2 - headerH - footerH;
  const fitted = fitImageInsideBox(image.width, image.height, boxW, boxH);
  const x = boxX + (boxW - fitted.width) / 2;
  const y = boxY + (boxH - fitted.height) / 2;

  doc.setFillColor(...accent);
  doc.roundedRect(margin, margin, pw - margin * 2, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, pw / 2, margin + 6.4, { align: "center" });

  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(subtitle, pw - margin * 2);
    doc.text(lines.slice(0, 2), pw / 2, margin + 14, { align: "center" });
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "S");
  doc.addImage(image.dataUrl, image.format, x, y, fitted.width, fitted.height, undefined, "FAST");
}
