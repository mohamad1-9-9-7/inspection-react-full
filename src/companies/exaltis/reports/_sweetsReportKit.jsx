// src/pages/monitor/branches/sweets/_sweetsReportKit.jsx
// Unified action toolbar + faithful export helpers for ALL sweets view reports.
//
// The company standard is ONE toolbar per report, always the same five actions
// in the same order: Edit · Export Excel · Export PDF · Print · Delete.
// A button appears only when its handler is supplied, so a report that cannot
// be edited simply omits onEdit. Delete keeps data-delete-action so the global
// security toggle still governs it.
//
// The three export helpers all work off the RENDERED report node (a ref you
// wrap around the printable area), so Excel/PDF/Print mirror what is on screen
// instead of each report re-describing its own layout:
//   • printNode  — clones the node into an isolated iframe (page styles copied)
//   • pdfFromNode — html2canvas → jsPDF image (Arabic-safe, matches the view)
//   • excelFromNode — serialises every <table> in the node into one sheet
// html2canvas / jspdf / xlsx are imported lazily so they never weigh on the
// first paint.

import React from "react";

/* ========= Toolbar ========= */
const BTN = {
  padding: "8px 14px",
  borderRadius: 8,
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const tone = (bg) => ({ ...BTN, background: bg });

export function SweetsReportActions({
  onEdit,
  onExcel,
  onPdf,
  onPrint,
  onDelete,
  busy = false,
  extra = null, // e.g. an email button, rendered before Delete
  style,
}) {
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", ...style }}>
      {onEdit && (
        <button disabled={busy} onClick={onEdit} style={tone("#0ea5e9")}>✏️ Edit</button>
      )}
      {onExcel && (
        <button disabled={busy} onClick={onExcel} style={tone("#059669")}>📊 Export Excel</button>
      )}
      {onPdf && (
        <button disabled={busy} onClick={onPdf} style={tone("#7c3aed")}>📄 Export PDF</button>
      )}
      {onPrint && (
        <button disabled={busy} onClick={onPrint} style={tone("#0f766e")}>🖨️ Print</button>
      )}
      {extra}
      {onDelete && (
        <button
          disabled={busy}
          onClick={onDelete}
          style={{ ...tone("#ef4444"), marginInlineStart: "auto" }}
          data-delete-action="true"
        >
          🗑️ Delete
        </button>
      )}
    </div>
  );
}

/* ========= Print (faithful to the on-screen report) ========= */
export function printNode(node, title = "Report") {
  if (!node) return;
  const styleTags = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((el) => el.outerHTML)
    .join("\n");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<!doctype html><html dir="${document.dir || "ltr"}"><head><meta charset="utf-8"><title>${title}</title>` +
      styleTags +
      `<style>
         body{margin:16px;background:#fff;}
         .no-print,[data-delete-action],.action-buttons{display:none !important;}
         @page{size:A4;margin:10mm;}
       </style></head><body>${node.innerHTML}</body></html>`
  );
  doc.close();

  const fire = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 800);
    }
  };
  if (doc.readyState === "complete") setTimeout(fire, 350);
  else iframe.onload = () => setTimeout(fire, 350);
}

/* ========= PDF (image of the report — Arabic shaping safe) ========= */
export async function pdfFromNode(node, filename = "report") {
  if (!node) return;
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  let w = pw;
  let h = (canvas.height * w) / canvas.width;
  if (h > ph) {
    h = ph;
    w = (canvas.width * h) / canvas.height;
  }
  pdf.addImage(img, "PNG", (pw - w) / 2, 16, w, h, undefined, "FAST");
  pdf.save(`${filename}.pdf`);
}

/* ========= Excel (serialise the report's tables — mirrors the view) ========= */
function nodeToAoa(node) {
  const aoa = [];
  const tables = node.querySelectorAll("table");
  tables.forEach((t, ti) => {
    if (ti) aoa.push([]); // blank row between tables
    t.querySelectorAll("tr").forEach((tr) => {
      const row = [];
      tr.querySelectorAll("th, td").forEach((cell) => {
        const span = parseInt(cell.getAttribute("colspan") || "1", 10);
        row.push((cell.innerText || "").trim());
        for (let k = 1; k < span; k++) row.push("");
      });
      if (row.length) aoa.push(row);
    });
  });
  return aoa;
}

export async function excelFromNode(node, filename = "report", sheetName = "Report", aoaOverride = null) {
  const XLSX = await import("xlsx-js-style");
  const aoa = aoaOverride || (node ? nodeToAoa(node) : []);
  if (!aoa.length) {
    alert("Nothing to export.");
    return;
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // auto width from the longest cell per column
  const widths = [];
  aoa.forEach((row) =>
    row.forEach((c, i) => {
      const len = String(c || "").length;
      widths[i] = Math.max(widths[i] || 10, Math.min(60, len + 2));
    })
  );
  ws["!cols"] = widths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
