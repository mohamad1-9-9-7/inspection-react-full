// src/components/CertPdfExportModal.jsx
//
// Bulk export of certificate images as ONE PDF — shared by the OHC register
// (/ohc/view) and the training certificates register (/training-certificates/view).
//   • scope: the ticked rows, or every row the table shows (its filters + sort)
//   • 1, 2 or 4 images per A4 page, each under a header strip
//     (name · employee no. · course · branch · expiry · result · status)
//   • a row with two images (EFST: municipality + institute) gives two slots
//   • optional cover page: the list + which employees have no image attached
//   • jsPDF is loaded on demand; images are pulled through Cloudinary as JPEG
//     at a size that fits the layout (keeps the file small)
//
// Each register passes `describe(row)` →
//   { name, no, branch, expiry, result?, job?, course?, statusKey, statusText,
//     images: [{ url, label? }] }
//
// Text is English/Latin only — jsPDF can't shape Arabic (see the PDF note in
// the project memory); non-Latin characters are dropped from the strips.

import React, { useEffect, useMemo, useRef, useState } from "react";

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10; // page margin, mm

const LAYOUTS = [
  { key: 1, label: "1 per page", hint: "Largest — best to print and file", cols: 1, rows: 1, px: 1800 },
  { key: 2, label: "2 per page", hint: "Two stacked certificates", cols: 1, rows: 2, px: 1400 },
  { key: 4, label: "4 per page", hint: "Compact overview (2 × 2)", cols: 2, rows: 2, px: 1000 },
];

const fmt = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};
/** jsPDF's built-in fonts are Latin-1 only. */
const latin = (v) => String(v ?? "").replace(/[^\x20-\x7E -ÿ]/g, "").replace(/\s+/g, " ").trim();

function jpegUrl(src, px) {
  const u = String(src || "");
  if (!u.includes("/image/upload/")) return u;
  return u.replace("/image/upload/", `/image/upload/f_jpg,q_80,w_${px},c_limit/`);
}

/** → { data: "data:image/jpeg…", w, h } (w/h in px), or throws. */
async function loadJpeg(src, px) {
  const url = jpegUrl(src, px);
  let objectUrl = "";
  let imgSrc = url;
  if (!url.startsWith("data:")) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    objectUrl = URL.createObjectURL(await res.blob());
    imgSrc = objectUrl;
  }
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("not an image"));
      im.src = imgSrc;
    });
    const scale = Math.min(1, px / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { data: c.toDataURL("image/jpeg", 0.85), w, h };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

const STATUS_RGB = {
  expired: [185, 28, 28],
  expiring_soon: [194, 65, 12],
  expiring: [161, 98, 7],
  valid: [21, 128, 61],
  no_expiry: [107, 114, 128],
};

function sortInfos(list, order) {
  const out = list.slice();
  const str = (a, b) => String(a || "").localeCompare(String(b || ""));
  const exp = (d) => (d.days === null || d.days === undefined ? Infinity : d.days);
  if (order === "branch") out.sort((a, b) => str(a.branch, b.branch) || str(a.name, b.name));
  else if (order === "name") out.sort((a, b) => str(a.name, b.name) || str(a.course, b.course));
  else if (order === "course") out.sort((a, b) => str(a.course, b.course) || str(a.name, b.name));
  else if (order === "expiry") out.sort((a, b) => exp(a) - exp(b));
  return out;
}

/* ───────────────────────── PDF builder ───────────────────────── */
async function buildPdf({ infos, layout, cover, title, onProgress, cancelled }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const L = LAYOUTS.find((x) => x.key === layout) || LAYOUTS[0];
  const hasCourse = infos.some((d) => d.course);
  const hasResult = infos.some((d) => d.result);
  // one slot per image
  const slots = [];
  infos.forEach((d) => d.images.forEach((img) => slots.push({ d, img })));
  const noImg = infos.filter((d) => !d.images.length);
  const failed = [];
  const today = fmt(new Date().toISOString());

  /* cover */
  let pageUsed = false;
  if (cover) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(latin(title), M, M + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Generated ${today}  ·  ${infos.length} certificate record(s)  ·  ${slots.length} image(s)`, M, M + 15);
    doc.setTextColor(0);
    // widths add up to 190 mm (page minus margins)
    const cols = [
      ["#", 8, (d, i) => String(i + 1)],
      ["Emp. No", 20, (d) => latin(d.no)],
      ["Name", hasCourse && hasResult ? 46 : hasCourse || hasResult ? 54 : 66, (d) => latin(d.name)],
      ...(hasCourse ? [["Course", 22, (d) => latin(d.course)]] : []),
      ["Branch", hasCourse ? 34 : 42, (d) => latin(d.branch)],
      ["Expiry", 20, (d) => fmt(d.expiry)],
      ...(hasResult ? [["Result", 14, (d) => latin(d.result) || "—"]] : []),
      ["Status", 0, (d) => d.statusText],
    ];
    const used = cols.reduce((n, c) => n + c[1], 0);
    cols[cols.length - 1][1] = PAGE_W - 2 * M - used;

    let y = M + 24;
    const head = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(M, y - 5, PAGE_W - 2 * M, 7, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      let x = M + 1.5;
      cols.forEach(([h, w]) => { doc.text(h, x, y); x += w; });
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      y += 6;
    };
    head();
    infos.forEach((d, i) => {
      if (y > PAGE_H - M - 6) {
        doc.addPage();
        y = M + 8;
        head();
      }
      if (i % 2) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 4.2, PAGE_W - 2 * M, 5.6, "F");
      }
      let x = M + 1.5;
      doc.setFontSize(8.5);
      cols.forEach(([h, w, get], k) => {
        if (k === cols.length - 1) doc.setTextColor(...(STATUS_RGB[d.statusKey] || [0, 0, 0]));
        doc.text(doc.splitTextToSize(get(d, i) || "—", w - 2)[0] || "", x, y);
        doc.setTextColor(0);
        x += w;
      });
      if (!d.images.length) {
        doc.setTextColor(185, 28, 28);
        doc.setFontSize(7);
        doc.text("no image", PAGE_W - M - 1, y, { align: "right" });
        doc.setTextColor(0);
      }
      y += 5.6;
    });
    if (noImg.length) {
      y += 4;
      if (y > PAGE_H - M - 10) { doc.addPage(); y = M + 8; }
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text(`${noImg.length} record(s) have no certificate image attached — not included in the pages that follow.`, M, y);
      doc.setTextColor(0);
    }
    pageUsed = true;
  }

  /* certificate pages */
  const perPage = L.cols * L.rows;
  const gap = 6;
  const cellW = (PAGE_W - 2 * M - gap * (L.cols - 1)) / L.cols;
  const cellH = (PAGE_H - 2 * M - 6 - gap * (L.rows - 1)) / L.rows; // 6 = footer
  const small = L.key === 4;
  const strip = small ? 11 : 13;

  for (let i = 0; i < slots.length; i++) {
    if (cancelled()) throw new Error("__cancelled__");
    onProgress(i + 1, slots.length);
    const { d, img: image } = slots[i];
    const slot = i % perPage;
    if (slot === 0 && pageUsed) doc.addPage();
    pageUsed = true;
    const col = slot % L.cols;
    const row = Math.floor(slot / L.cols);
    const x = M + col * (cellW + gap);
    const y = M + row * (cellH + gap);

    // header strip
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cellW, strip, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(small ? 9 : 11);
    doc.setTextColor(15, 23, 42);
    const headLine = [latin(d.name) || "—", d.course ? `· ${latin(d.course)}` : "", image.label ? `(${latin(image.label)})` : ""]
      .filter(Boolean).join(" ");
    doc.text(doc.splitTextToSize(headLine, cellW - 40)[0] || "—", x + 2.5, y + (small ? 4.6 : 5.4));
    doc.setFontSize(small ? 8 : 9);
    doc.setTextColor(...(STATUS_RGB[d.statusKey] || [0, 0, 0]));
    doc.text(d.statusText, x + cellW - 2.5, y + (small ? 4.6 : 5.4), { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(small ? 7 : 8.5);
    const meta = [`#${latin(d.no) || "—"}`, latin(d.branch), `Expiry ${fmt(d.expiry)}`, d.result ? `Result ${latin(d.result)}` : "", latin(d.job)]
      .filter(Boolean).join("  ·  ");
    doc.text(doc.splitTextToSize(meta, cellW - 5)[0] || "", x + 2.5, y + (small ? 8.8 : 10.4));
    doc.setTextColor(0);

    // image, fitted with its aspect ratio
    const boxY = y + strip + 1.5;
    const boxH = cellH - strip - 1.5;
    try {
      const pic = await loadJpeg(image.url, L.px);
      const k = Math.min(cellW / pic.w, boxH / pic.h);
      const w = pic.w * k;
      const h = pic.h * k;
      doc.addImage(pic.data, "JPEG", x + (cellW - w) / 2, boxY + (boxH - h) / 2, w, h, undefined, "FAST");
    } catch (e) {
      failed.push(d);
      doc.setDrawColor(252, 165, 165);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.rect(x, boxY, cellW, boxH);
      doc.setLineDashPattern([], 0);
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(10);
      doc.text("Image could not be loaded", x + cellW / 2, boxY + boxH / 2, { align: "center" });
      doc.setTextColor(0);
    }
  }

  /* footer on every page */
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`${latin(title)}  ·  ${today}`, M, PAGE_H - M + 3);
    doc.text(`Page ${p} / ${n}`, PAGE_W - M, PAGE_H - M + 3, { align: "right" });
  }
  doc.setTextColor(0);
  return { doc, included: slots.length - failed.length, noImg, failed };
}

/* ───────────────────────── Modal ───────────────────────── */
export function CertPdfExportModal({
  open,
  onClose,
  selectedRows,
  shownRows,
  onClearSelection,
  describe,
  title = "Certificates",
  filePrefix = "certificates",
}) {
  const [scope, setScope] = useState("shown");
  const [layout, setLayout] = useState(1);
  const [order, setOrder] = useState("table");
  const [cover, setCover] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ i: 0, n: 0 });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setScope(selectedRows.length ? "selected" : "shown");
    setResult(null);
    setErr("");
    setProgress({ i: 0, n: 0 });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const infos = useMemo(() => {
    if (!open) return [];
    const list = (scope === "selected" ? selectedRows : shownRows).map((r) => {
      const d = describe(r);
      return { ...d, images: (d.images || []).filter((x) => x && x.url) };
    });
    return sortInfos(list, order);
  }, [open, scope, selectedRows, shownRows, order, describe]);

  const hasCourse = infos.some((d) => d.course);
  const orders = [
    { key: "table", label: "Same order as the table" },
    { key: "branch", label: "By branch, then name" },
    { key: "name", label: "By name" },
    ...(hasCourse ? [{ key: "course", label: "By course, then name" }] : []),
    { key: "expiry", label: "By expiry (soonest first)" },
  ];
  const imgCount = infos.reduce((n, d) => n + d.images.length, 0);
  const missing = infos.filter((d) => !d.images.length).length;
  const L = LAYOUTS.find((x) => x.key === layout);
  const pages = Math.ceil(imgCount / (L.cols * L.rows)) + (cover ? Math.max(1, Math.ceil((infos.length + 6) / 44)) : 0);

  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function run() {
    if (!imgCount) return setErr("None of these records has a certificate image attached.");
    setErr("");
    setResult(null);
    setBusy(true);
    cancelRef.current = false;
    try {
      const out = await buildPdf({
        infos,
        layout,
        cover,
        title,
        onProgress: (i, n) => setProgress({ i, n }),
        cancelled: () => cancelRef.current,
      });
      out.doc.save(`${filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setResult(out);
    } catch (e) {
      if (e?.message !== "__cancelled__") setErr(`PDF export failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  const opt = (on) => ({
    flex: 1, minWidth: 120, textAlign: "start", cursor: busy ? "default" : "pointer",
    border: `2px solid ${on ? "#e11d48" : "#e2e8f0"}`, background: on ? "#fff1f2" : "#fff",
    borderRadius: 12, padding: "10px 12px", color: "#0f172a",
  });
  const pct = progress.n ? Math.round((progress.i / progress.n) * 100) : 0;

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(2,6,23,0.6)", display: "grid", placeItems: "center", padding: 14 }}
      dir="ltr"
      lang="en"
    >
      <div role="dialog" aria-modal="true" aria-label="Export certificates as PDF"
        style={{ width: "min(620px, 96vw)", maxHeight: "92vh", overflow: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.35)", color: "#0f172a", textAlign: "start" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#f43f5e,#be123c)", color: "#fff", fontWeight: 900 }}>📑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>Export {title.toLowerCase()} as one PDF</div>
            <div style={{ color: "#64748b", fontWeight: 600 }}>{infos.length} record(s) · {imgCount} image(s) · ≈ {pages} page(s)</div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8, padding: "4px 10px", fontWeight: 900, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Which certificates</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy || !selectedRows.length} onClick={() => setScope("selected")}
                style={{ ...opt(scope === "selected"), opacity: selectedRows.length ? 1 : 0.5 }}>
                <b>☑ Ticked rows ({selectedRows.length})</b>
                <div style={{ color: "#64748b" }}>{selectedRows.length ? "Only the rows you ticked" : "Tick rows in the table first"}</div>
              </button>
              <button type="button" disabled={busy} onClick={() => setScope("shown")} style={opt(scope === "shown")}>
                <b>☰ Everything shown ({shownRows.length})</b>
                <div style={{ color: "#64748b" }}>The table with its current filters</div>
              </button>
            </div>
            {scope === "selected" && selectedRows.length > 0 && (
              <button type="button" onClick={onClearSelection} disabled={busy}
                style={{ marginTop: 6, border: "none", background: "none", color: "#be123c", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                ✕ Clear the ticks
              </button>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Page layout</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LAYOUTS.map((l) => (
                <button key={l.key} type="button" disabled={busy} onClick={() => setLayout(l.key)} style={opt(layout === l.key)}>
                  <b>{l.label}</b>
                  <div style={{ color: "#64748b" }}>{l.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Order</span>
              <select value={orders.some((o) => o.key === order) ? order : "table"} onChange={(e) => setOrder(e.target.value)} disabled={busy}
                style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 10px", background: "#f8fafc", fontWeight: 600 }}>
                {orders.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, cursor: "pointer", paddingBottom: 8 }}>
              <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} disabled={busy} />
              Cover page with the list
            </label>
          </div>

          {missing > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontWeight: 700 }}>
              ⚠ {missing} record(s) have no certificate image — they appear on the cover list only.
            </div>
          )}

          {busy && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 4 }}>
                <span>Adding image {progress.i} of {progress.n}…</span><span>{pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#f43f5e,#be123c)", transition: "width .2s" }} />
              </div>
            </div>
          )}

          {result && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", fontWeight: 700 }}>
              ✓ PDF downloaded — {result.included} image(s).
              {result.failed.length > 0 && (
                <div style={{ color: "#b91c1c", marginTop: 4 }}>
                  {result.failed.length} image(s) could not be loaded: {result.failed.map((d) => d.name || d.no).join(", ")}
                </div>
              )}
            </div>
          )}
          {err && <div style={{ padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontWeight: 700 }}>{err}</div>}
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1.5px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {busy ? (
            <button type="button" onClick={() => { cancelRef.current = true; }}
              style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "9px 16px", fontWeight: 800, cursor: "pointer" }}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={onClose}
              style={{ border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "9px 16px", fontWeight: 800, cursor: "pointer" }}>
              Close
            </button>
          )}
          <button type="button" onClick={run} disabled={busy || !imgCount}
            style={{ border: "none", background: "linear-gradient(135deg,#f43f5e,#be123c)", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 800, cursor: busy || !imgCount ? "default" : "pointer", opacity: busy || !imgCount ? 0.6 : 1 }}>
            {busy ? "Building PDF…" : `⬇ Download PDF (${imgCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Status words for a strip / the cover list. */
export function certStatusText({ days, leftCompany, outsideDubai } = {}) {
  if (leftCompany) return "Left company";
  if (outsideDubai) return "Outside Dubai";
  if (days === null || days === undefined) return "No expiry";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  return `${days} days left`;
}
