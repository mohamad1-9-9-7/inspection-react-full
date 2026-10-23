// src/pages/labels/labelsApi.js
//
// 🏷️ Product labels — what goes on a label, how it is drawn, and the log of
// what was printed.
//
// A label is plain HTML in mm, drawn into its own iframe (preview AND print),
// so globals.css (forced 14px fonts, #root overflow) never reaches it.
//
// The barcode is GS1 — the same language the cooler goods scanner already
// reads (utils/gs1Barcode.parseBarcode):
//   (11) production  (17) expiry  (3103) net weight  (10) lot  (240) item code
// Our own products have no GTIN, so the item code rides in (240): scanning a
// label we printed picks the product, its dates and its lot in one go.
//
// Print log: type `label_print_log`, ONE record per day (the server keeps
// type + reportDate unique), payload.jobs[] = every print of that day.
// Saving re-reads the day and appends, so two devices only lose a job when
// they print within the same second.

import API_BASE from "../../config/api";
import { encodeCode128, gs1Tokens, gs1Raw, code128Svg } from "../../utils/code128";
import { qrSvg } from "../../utils/qrSvg";

import { LOG_TYPE } from "./labelLog";

export { LOG_TYPE };

/* Label stock. `sheet` = A4 paper with a grid of stickers instead of a roll. */
export const SIZES = [
  { id: "50x30", w: 50, h: 30, en: "50 × 30 mm (roll)", ar: "50 × 30 ملم (رول)" },
  { id: "60x40", w: 60, h: 40, en: "60 × 40 mm (roll)", ar: "60 × 40 ملم (رول)" },
  { id: "75x50", w: 75, h: 50, en: "75 × 50 mm (roll)", ar: "75 × 50 ملم (رول)" },
  { id: "100x50", w: 100, h: 50, en: "100 × 50 mm (roll)", ar: "100 × 50 ملم (رول)" },
  { id: "100x100", w: 100, h: 100, en: "100 × 100 mm (roll)", ar: "100 × 100 ملم (رول)" },
  { id: "a4-24", w: 70, h: 37, sheet: { cols: 3, rows: 8 }, en: "A4 sheet — 24 stickers (70 × 37)", ar: "ورقة A4 — 24 ملصق (70 × 37)" },
];
export const sizeOf = (id) => SIZES.find((s) => s.id === id) || SIZES[1];

/* A Code 128 bar narrower than this does not scan reliably off a 203 dpi
   thermal printer (one module = 2 dots). */
export const MIN_MODULE_MM = 0.25;

const pad = (n) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
export const dmy = (iso) => (isISO(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const yymmdd = (iso) => (isISO(iso) ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : "");
export function addDays(iso, days) {
  if (!isISO(iso)) return "";
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Default lot = production day (yymmdd) — all digits, so it packs small in the barcode. */
export const defaultLot = (prodISO) => yymmdd(prodISO);

/* GS1 text allows letters, digits and a few signs; a lot is kept to those. */
export const cleanLot = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9\-./]/g, "").slice(0, 20);

/** "(11)261023(17)261030(3103)001250(10)261023(240)30024" — fixed fields first, variable last. */
export function gs1Text({ code, prodDate, expDate, weightKg, lot }) {
  let s = "";
  if (isISO(prodDate)) s += `(11)${yymmdd(prodDate)}`;
  if (isISO(expDate)) s += `(17)${yymmdd(expDate)}`;
  const kg = Number(weightKg);
  if (Number.isFinite(kg) && kg > 0 && kg < 1000) s += `(3103)${String(Math.round(kg * 1000)).padStart(6, "0")}`;
  const l = cleanLot(lot);
  if (l) s += `(10)${l}`;
  const c = String(code || "").trim().replace(/[^A-Za-z0-9\-./]/g, "").slice(0, 30);
  if (c) s += `(240)${c}`;
  return s;
}

/** How wide one Code 128 module would print on this label (mm). */
export function code128ModuleMm(text, size) {
  if (!text) return 0;
  const { modules } = encodeCode128(gs1Tokens(text));
  const usable = size.w - 6; // 3 mm side margins incl. quiet zone
  return usable / (modules + 20);
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Layouts. All carry the same data; they differ in what leads. */
export const TEMPLATES = [
  { id: "standard", en: "Standard", ar: "قياسي" },
  { id: "useby", en: "Big use-by box (with weekday)", ar: "مربّع انتهاء كبير (مع اليوم)" },
  { id: "compact", en: "Compact (small labels)", ar: "مختصر (للملصقات الصغيرة)" },
];

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const weekday = (iso) => (isISO(iso) ? DAYS[new Date(`${iso}T00:00:00`).getDay()] : "");

/**
 * One label as HTML (no <html> wrapper).
 * data: { company, product, code, prodDate, expDate, lot, weightKg, branch,
 *         storage, allergens[], packedBy, note }
 * opts: { symbol: "qr" | "code128", template, show: { company, storage, allergens, branch, packer, weight, halal } }
 */
export function labelHtml(data, size, { symbol = "qr", template = "standard", show = {} } = {}) {
  const k = Math.min(size.w / 60, size.h / 40); // 60 × 40 = the reference size
  const pt = (n) => `${(n * k).toFixed(2)}pt`;
  const gs1 = gs1Text(data);
  const bars = symbol === "code128" && gs1;
  const qr = symbol === "qr" && gs1;
  const tpl = TEMPLATES.some((t) => t.id === template) ? template : "standard";
  const qrMm = Math.min(size.h * (tpl === "standard" ? 1 : 0.62) - 4, size.w * (tpl === "compact" ? 0.38 : 0.42));

  const line = (label, value, strong) =>
    value
      ? `<div class="r${strong ? " s" : ""}"><span class="k">${esc(label)}</span><span class="v">${esc(value)}</span></div>`
      : "";

  const weight = Number(data.weightKg) > 0 ? `${Number(data.weightKg).toFixed(3).replace(/\.?0+$/, "")} kg` : "";
  const lot = cleanLot(data.lot);
  const halal = show.halal ? `<div class="hl" style="font-size:${pt(5.2)}"><b>HALAL</b><span>حلال</span></div>` : "";
  const company = show.company !== false && data.company ? `<div class="co" style="font-size:${pt(6)}">${esc(data.company)}</div>` : "";
  const head = company || halal ? `<div class="hd">${company || "<span></span>"}${halal}</div>` : "";
  const name = `<div class="nm" style="font-size:${pt(tpl === "compact" ? 8.5 : 9)}">${esc(data.product || "—")}</div>`;
  const code = data.code ? `<div class="cd" style="font-size:${pt(6.5)}">Item ${esc(data.code)}</div>` : "";
  const qrBox = qr ? `<div class="qr" style="width:${qrMm.toFixed(1)}mm;height:${qrMm.toFixed(1)}mm">${qrSvg(gs1Raw(gs1))}</div>` : "";
  const barsHtml = bars
    ? `<div class="bars"><div class="bw">${code128Svg(encodeCode128(gs1Tokens(gs1)).widths, { height: 40 })}</div><div class="hr">${esc(gs1)}</div></div>`
    : "";

  const extra = (withNote = true) => [
    show.storage !== false && data.storage ? `<div class="x">${esc(data.storage)}</div>` : "",
    show.allergens !== false && data.allergens?.length ? `<div class="x a">Contains: ${esc(data.allergens.join(", "))}</div>` : "",
    show.packer && data.packedBy ? `<div class="x">Packed by: ${esc(data.packedBy)}</div>` : "",
    withNote && data.note ? `<div class="x n" dir="auto">${esc(data.note)}</div>` : "",
  ].join("");

  let body;
  if (tpl === "useby") {
    const rows = [
      line("PROD", dmy(data.prodDate)),
      line("LOT", lot),
      show.weight !== false ? line("NET", weight) : "",
      show.branch !== false ? line("SITE", data.branch) : "",
    ].join("");
    body = `${head}${name}${code}
    <div class="ub" style="font-size:${pt(7)}"><span class="ubk">USE BY</span><span class="ubd" style="font-size:${pt(11)}">${esc(weekday(data.expDate))}</span><span class="ubv" style="font-size:${pt(11)}">${esc(dmy(data.expDate) || "—")}</span></div>
    <div class="mid"><div class="info">${rows}${extra()}</div>${qrBox}</div>`;
  } else if (tpl === "compact") {
    body = `${name}${code}
    <div class="mid"><div class="info">${line("EXP", dmy(data.expDate), true)}${line("LOT", lot)}${show.allergens !== false && data.allergens?.length ? `<div class="x a">Contains: ${esc(data.allergens.join(", "))}</div>` : ""}</div>${qrBox}</div>`;
  } else {
    const rows = [
      line("PROD", dmy(data.prodDate)),
      line("EXP", dmy(data.expDate), true),
      line("LOT", lot),
      show.weight !== false ? line("NET", weight) : "",
      show.branch !== false ? line("SITE", data.branch) : "",
    ].join("");
    body = `${head}${name}${code}<div class="mid"><div class="info">${rows}${extra()}</div>${qrBox}</div>`;
  }

  return `<div class="lb t-${tpl}" style="width:${size.w}mm;height:${size.h}mm">
  <div class="in" style="font-size:${pt(7)}">
    ${body}
    ${barsHtml}
  </div>
</div>`;
}

/* The page CSS shared by the preview and the print document. */
export const LABEL_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}
.lb{overflow:hidden;background:#fff;position:relative;page-break-inside:avoid;break-inside:avoid}
.in{height:100%;padding:1.6mm 2mm;display:flex;flex-direction:column;gap:.4mm;line-height:1.12}
.co{font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-bottom:.25mm solid #000;padding-bottom:.4mm}
.nm{font-weight:900;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cd{font-weight:700}
.mid{flex:1;display:flex;gap:1.5mm;min-height:0;overflow:hidden}
.info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.25mm;overflow:hidden}
.r{display:flex;gap:1.2mm;white-space:nowrap}
.r .k{font-weight:700;min-width:2.4em}
.r.s{font-weight:900;font-size:1.25em}
.r.s .v{border:.3mm solid #000;padding:0 .8mm}
.x{font-size:.88em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.x.a{font-weight:700}
.x.n{font-weight:700;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:1mm}
.hd .co{flex:1}
.hl{flex:none;border:.35mm solid #000;border-radius:999px;padding:.2mm 1.2mm;display:flex;flex-direction:column;align-items:center;line-height:1}
.ub{display:flex;align-items:center;gap:1.4mm;background:#000;color:#fff;border-radius:.8mm;padding:.6mm 1.4mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ubk{font-weight:700;letter-spacing:.06em}
.ubd{font-weight:900;border:.3mm solid #fff;border-radius:.6mm;padding:0 .8mm}
.ubv{font-weight:900;margin-inline-start:auto}
.t-compact .nm{-webkit-line-clamp:1}
.t-compact .r.s{font-size:1.45em}
.qr{flex:none;align-self:center}
.bars{flex:none;padding:0 1mm}
.bw{height:7mm}
.hr{font-size:.8em;text-align:center;letter-spacing:.02em;white-space:nowrap;overflow:hidden}
`;

/** A whole print document: `copies` labels, one per page on a roll, or a grid on A4. */
export function printDocument(one, size, copies) {
  const n = Math.max(1, Math.min(500, Number(copies) || 1));
  if (size.sheet) {
    const per = size.sheet.cols * size.sheet.rows;
    const pages = [];
    for (let i = 0; i < n; i += per) {
      const cells = Array.from({ length: Math.min(per, n - i) }, () => `<div class="cell">${one}</div>`).join("");
      pages.push(`<div class="sheet">${cells}</div>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8"><style>${LABEL_CSS}
@page{size:A4;margin:0}
.sheet{width:210mm;height:296mm;padding:.5mm 0;display:grid;grid-template-columns:repeat(${size.sheet.cols},${size.w}mm);grid-auto-rows:${size.h}mm;page-break-after:always}
.sheet:last-child{page-break-after:auto}
</style></head><body>${pages.join("")}</body></html>`;
  }
  const labels = Array.from({ length: n }, () => `<div class="pg">${one}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${LABEL_CSS}
@page{size:${size.w}mm ${size.h}mm;margin:0}
.pg{width:${size.w}mm;height:${size.h}mm;page-break-after:always}
.pg:last-child{page-break-after:auto}
</style></head><body>${labels}</body></html>`;
}

/** Print through a hidden iframe (its own document, away from the app's CSS). */
export function printHtml(html) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      setTimeout(() => frame.remove(), 60000);
    }
  };
  // let the SVGs lay out before the print dialog snapshots the page
  setTimeout(go, 250);
}

/* ═══════════════ print log ═══════════════ */

async function readDay(day) {
  const qs = new URLSearchParams({ type: LOG_TYPE, from: day, to: day, limit: "5" });
  const res = await fetch(`${API_BASE}/api/reports?${qs}`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Label log read failed (${res.status})`);
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  return rows.find((r) => String(r?.payload?.reportDate || "") === day) || null;
}

/** Today's (or another day's) print jobs, newest first. */
export async function fetchPrintJobs(day = todayISO()) {
  const row = await readDay(day);
  const jobs = Array.isArray(row?.payload?.jobs) ? row.payload.jobs : [];
  return [...jobs].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

/** Append one print job to its day. */
export async function logPrintJob(job, user = "") {
  const day = todayISO();
  const entry = { ...job, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, by: user, at: new Date().toISOString() };
  const row = await readDay(day);
  const jobs = [...(Array.isArray(row?.payload?.jobs) ? row.payload.jobs : []), entry];
  const id = row?.id || row?._id;
  const body = JSON.stringify({ reporter: user || "labels", type: LOG_TYPE, payload: { ...(row?.payload || {}), reportDate: day, jobs } });
  const res = await fetch(id ? `${API_BASE}/api/reports/${encodeURIComponent(id)}` : `${API_BASE}/api/reports`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Label log save failed (${res.status})`);
  return entry;
}
