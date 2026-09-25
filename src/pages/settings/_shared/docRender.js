// src/pages/settings/_shared/docRender.js
// -----------------------------------------------------------------------------
// Turn a self-contained HTML document (quotation, invoice) into a print job
// or an A4 PDF. The document is rendered in an iframe so its CSS never leaks
// into — or gets overridden by — the app's global stylesheet.
//
// The document's printable root must carry class="doc".
// PDFs are rasterised (html2canvas → jsPDF): keep documents English, see the
// Arabic-shaping note in project memory.
// -----------------------------------------------------------------------------

export function mountFrame(html, visible = false) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, visible
    ? { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" }
    : { position: "fixed", left: "-10000px", top: "0", width: "794px", height: "1123px", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  return iframe;
}

/* Resolves once the document (and its images) have loaded. */
export const waitFor = (iframe) => new Promise((resolve) => {
  const w = iframe.contentWindow;
  const done = () => setTimeout(resolve, 150);
  if (w.document.readyState === "complete") done();
  else w.addEventListener("load", done, { once: true });
});

export async function printHtml(html) {
  const iframe = mountFrame(html, true);
  await waitFor(iframe);
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 2000);
}

/* A4 PDF, sliced across pages when the document is taller than one. */
export async function htmlToPdf(html, filename) {
  const [{ jsPDF }, h2c] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const html2canvas = h2c.default || h2c;
  const iframe = mountFrame(html);
  try {
    await waitFor(iframe);
    const docEl = iframe.contentWindow.document.querySelector(".doc");
    iframe.style.height = `${docEl.scrollHeight + 40}px`;
    const canvas = await html2canvas(docEl, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 794 });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const imgW = pageW - margin * 2;
    const scale = imgW / canvas.width;
    const sliceH = Math.floor((pageH - margin * 2) / scale); // canvas px per page

    for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
      const h = Math.min(sliceH, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width; part.height = h;
      part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h * scale);
    }
    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}
