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

/* INSPECT PRO's identity on every document it issues (public/brand/inspect-pro). */
export const DOC_BRAND = { navy: "#0B1E3F", teal: "#0EA5A4", soft: "#f0fdfa", line: "#ccfbf1" };
export const DOC_FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap">`;

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

/* Resolves once the document, its images and its web fonts have loaded —
   a capture taken before the fonts arrive prints the fallback face. Fonts
   get 3 s at most, so a slow or offline network never blocks the PDF. */
export const waitFor = (iframe) => new Promise((resolve) => {
  const w = iframe.contentWindow;
  const fonts = () => Promise.race([w.document.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]).catch(() => {});
  const done = () => fonts().then(() => setTimeout(resolve, 150));
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

/* ═══════════════════════════ Page breaks ═══════════════════════════
   The PDF is one tall picture cut into A4 slices, so a cut through the
   middle of a line is easy to make and looks broken. Before the picture is
   taken, every block that must stay whole (a table row, a term, a card, the
   signatures…) is checked against the page edges: one that would straddle an
   edge is pushed to the next page by a blank spacer, and a table that
   continues on a new page gets its header row again. Headings keep at least
   KEEP_NEXT px of what follows them on the same page.
   A block taller than ~90 % of a page is allowed to split (its children are
   then checked one by one instead). */

const KEEP_WHOLE = [
  "tr", ".term", ".tg-h", ".sec-h", ".card", ".hero", ".tcard", ".tots", ".sums", ".sum", ".valid",
  ".sign", ".foot", ".notes", ".intro", ".title", ".opt-note", ".box", ".totals", ".words",
  ".facts", ".parties", ".pay", ".sumrow", ".avoid", "h1", "h2", "h3", "p",
].join(", ");
const HEADINGS = ".sec-h, .tg-h, .title, thead tr";
const KEEP_NEXT = 70;

/* The block to push: flex / grid children move together with their row. */
function movable(el) {
  let cur = el;
  while (cur.parentElement && !cur.parentElement.classList.contains("doc")) {
    const d = cur.ownerDocument.defaultView.getComputedStyle(cur.parentElement).display;
    if (!/flex|grid/.test(d)) break;
    cur = cur.parentElement;
  }
  return cur;
}

function pushDown(el, gap) {
  const doc = el.ownerDocument;
  if (el.tagName === "TR") {
    const cols = Math.max(1, ...[...el.closest("table").rows].map((r) => r.cells.length));
    const blank = doc.createElement("tr");
    blank.className = "pg-spacer";
    blank.innerHTML = `<td colspan="${cols}" style="height:${gap}px;padding:0;border:0;background:#fff"></td>`;
    el.parentElement.insertBefore(blank, el);
    const head = el.closest("table").tHead?.rows[0];
    if (head && el.parentElement.tagName === "TBODY") {
      // a <th> row inside <tbody> is valid and picks up the same `th` styles
      const again = head.cloneNode(true);
      again.className = "pg-spacer";
      el.parentElement.insertBefore(again, el);
    }
    return;
  }
  const target = movable(el);
  const spacer = doc.createElement("div");
  spacer.className = "pg-spacer";
  spacer.style.cssText = `height:${gap}px;flex:none;`;
  target.parentElement.insertBefore(spacer, target);
}

export function paginate(root, pageH) {
  for (let guard = 0; guard < 300; guard++) {
    const base = root.getBoundingClientRect().top;
    let moved = false;
    for (const el of root.querySelectorAll(KEEP_WHOLE)) {
      if (el.classList.contains("pg-spacer")) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0 || r.height > pageH * 0.9) continue;
      const top = r.top - base;
      const bottom = r.bottom - base + (el.matches(HEADINGS) ? KEEP_NEXT : 0);
      const edge = (Math.floor(top / pageH) + 1) * pageH;
      if (bottom > edge + 0.5) {
        pushDown(el, Math.ceil(edge - top));
        moved = true;
        break; // the layout below changed — measure again from the top
      }
    }
    if (!moved) break;
  }
  return Math.max(1, Math.ceil((root.scrollHeight - 1) / pageH));
}

/* A4 PDF: whole blocks per page, "label · Page n of N" in every footer. */
export async function htmlToPdf(html, filename, { label = "" } = {}) {
  const [{ jsPDF }, h2c] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const html2canvas = h2c.default || h2c;
  const iframe = mountFrame(html);
  try {
    await waitFor(iframe);
    const docEl = iframe.contentWindow.document.querySelector(".doc");

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const side = 18, top = 20, bottom = 34; // room at the foot for the page number
    const imgW = pageW - side * 2;
    const ptPerCss = imgW / docEl.offsetWidth;
    const pageCss = Math.floor((pageH - top - bottom) / ptPerCss);

    docEl.style.minHeight = "0"; // a full-page min-height would add an empty page
    const pages = paginate(docEl, pageCss);
    iframe.style.height = `${pages * pageCss + 40}px`;
    docEl.style.height = `${pages * pageCss}px`; // whole pages, white to the end

    const canvas = await html2canvas(docEl, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 794 });
    const pxPerCss = canvas.width / docEl.offsetWidth;
    const slice = Math.round(pageCss * pxPerCss);

    for (let p = 0; p < pages; p++) {
      const y = p * slice;
      const h = Math.min(slice, canvas.height - y);
      if (h <= 0) break;
      const part = document.createElement("canvas");
      part.width = canvas.width; part.height = h;
      part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (p > 0) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", side, top, imgW, h / pxPerCss * ptPerCss);
      if (pages > 1) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${label ? `${label}  ·  ` : ""}Page ${p + 1} of ${pages}`, pageW - side, pageH - 14, { align: "right" });
      }
    }
    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

/* Print uses the browser's own engine; these rules keep the same blocks
   whole there. Documents include it in their <style>. */
export const PRINT_BREAK_CSS = `
  tr, .term, .card, .hero, .tcard, .sum, .box, .sign, .valid, .words, .totals, .avoid { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  .sec-h, .tg-h, .title { break-after: avoid; page-break-after: avoid; }
`;
