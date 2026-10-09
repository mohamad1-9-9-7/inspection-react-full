// src/pages/monitor/branches/qcs/employeeWarningCore.js
// -----------------------------------------------------------------------------
// Employee Warning / Notice (إنذار / تنبيه داخلي) — shared by the input and the
// viewer: levels, violation categories, the employee's warning history, the
// e-mail body, the English PDF (jsPDF cannot shape Arabic) and the printable
// sheet (browser print, so typed Arabic text prints correctly).
// -----------------------------------------------------------------------------

import API_BASE from "../../../../config/api";
import { thumbUrl } from "../../../../utils/imageUpload";
import { normalizeEmpNo, normalizeName } from "../_shared/staffRegistry";

export const TYPE = "qcs_employee_warning";

export const DOC_META = {
  docTitle: "Employee Warning / Notice",
  docNo: "AM/QA/EW/1",
  issueDate: "2026-10-09",
  area: "QA — All Sites",
  controllingOfficer: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
};

/* Ordered from mildest to most serious — the history uses the order to
   suggest the next step. */
export const LEVELS = [
  { id: "notice", en: "Notice (Advisory)",       ar: "تنبيه",             color: "#0284c7",
    consequence: "This is an advisory notice. Repeating the same violation will lead to a formal warning." },
  { id: "verbal", en: "Verbal Warning",           ar: "إنذار شفهي",        color: "#d97706",
    consequence: "Repeating this violation will lead to a first written warning." },
  { id: "first",  en: "First Written Warning",    ar: "إنذار كتابي أول",   color: "#ea580c",
    consequence: "Repeating this violation will lead to a second written warning and may affect your evaluation." },
  { id: "second", en: "Second Written Warning",   ar: "إنذار كتابي ثانٍ",  color: "#dc2626",
    consequence: "Repeating this violation will lead to a final warning and disciplinary action." },
  { id: "final",  en: "Final Warning",            ar: "إنذار نهائي",       color: "#7f1d1d",
    consequence: "Any further violation will be referred to management/HR for disciplinary action, which may include termination." },
];
export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
export const levelIndex = (id) => Math.max(0, LEVELS.findIndex((l) => l.id === id));

export const CATEGORIES = [
  { id: "hygiene",      en: "Personal Hygiene" },
  { id: "uniform",      en: "Uniform / PPE" },
  { id: "food_safety",  en: "Food Safety Procedure" },
  { id: "temperature",  en: "Temperature Control" },
  { id: "cleaning",     en: "Cleaning & Sanitation" },
  { id: "cross",        en: "Cross-Contamination" },
  { id: "records",      en: "Records / Documentation" },
  { id: "hse",          en: "Health & Safety" },
  { id: "attendance",   en: "Attendance / Punctuality" },
  { id: "conduct",      en: "Conduct / Behaviour" },
  { id: "other",        en: "Other" },
];
export const catEn = (id) => CATEGORIES.find((c) => c.id === id)?.en || id;

export const SITES = [
  "QCS", "Production", "POS 6", "POS 10", "POS 11", "POS 15", "POS 19",
  "POS 24", "POS 26", "FTR 1", "FTR 2",
];

export const dmy = (d) => {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d);
};

export const recId = (r) => r?._id || r?.id || null;

/* Same person = same employee number, or the same name when either side has
   no number. */
export function sameEmployee(a, b) {
  const na = normalizeEmpNo(a?.employeeNo), nb = normalizeEmpNo(b?.employeeNo);
  if (na && nb) return na === nb;
  const xa = normalizeName(a?.employeeName), xb = normalizeName(b?.employeeName);
  return !!xa && xa === xb;
}

export async function fetchWarnings(reporter = "qcs", type = TYPE, signal) {
  const res = await fetch(
    `${API_BASE}/api/reports?reporter=${encodeURIComponent(reporter)}&type=${encodeURIComponent(type)}`,
    { cache: "no-store", signal }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : (data.reports || data.data || []);
  return arr
    .map((r, i) => ({ ...r, _id: r._id || r.id || `rec-${i}` }))
    .sort((a, b) => String(b.payload?.date || "").localeCompare(String(a.payload?.date || ""))
      || (b.payload?.savedAt || 0) - (a.payload?.savedAt || 0));
}

/* Warnings older than this no longer count toward the next step. */
export const ACTIVE_MONTHS = 12;

export function isActive(p, today = new Date()) {
  if (!p?.date) return true;
  const d = new Date(p.date);
  const cut = new Date(today);
  cut.setMonth(cut.getMonth() - ACTIVE_MONTHS);
  return d >= cut;
}

/** The employee's other warnings (newest first) and the suggested next level. */
export function historyFor(records, who, excludeId = null) {
  const list = (records || []).filter((r) => recId(r) !== excludeId && sameEmployee(r.payload, who));
  const active = list.filter((r) => isActive(r.payload));
  const top = active.reduce((m, r) => Math.max(m, levelIndex(r.payload?.level)), -1);
  const suggested = LEVELS[Math.min(LEVELS.length - 1, top + 1)].id;
  return { list, active, suggested };
}

/* ═══════════════════════════ E-mail ══════════════════════════════ */

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (m) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[m]));

export function warningSubject(p) {
  return `${levelById(p?.level).en} — ${p?.employeeName || "Employee"}${p?.employeeNo ? ` (${p.employeeNo})` : ""}`;
}

const detailRows = (p) => [
  ["Date", dmy(p?.date)],
  ["Employee", `${p?.employeeName || "—"}${p?.employeeNo ? ` · No. ${p.employeeNo}` : ""}`],
  ["Position", p?.position || "—"],
  ["Site / Branch", p?.site || "—"],
  ["Warning level", levelById(p?.level).en],
  ["Violation", (p?.categories || []).map(catEn).join(", ") || "—"],
  ["Incident", `${dmy(p?.incidentDate)}${p?.incidentTime ? ` ${p.incidentTime}` : ""}${p?.location ? ` · ${p.location}` : ""}`],
  ["Active warnings before this one", String(p?.previousCount ?? 0)],
];

export function buildWarningText(p, opts = {}) {
  const intro = String(opts?.intro || "").trim();
  const note = String(opts?.note || "").trim();
  return [
    intro,
    `${levelById(p?.level).en.toUpperCase()}`,
    ...detailRows(p).map(([k, v]) => `${k}: ${v}`),
    "",
    `Description:\n${p?.description || "—"}`,
    "",
    `Required corrective action:\n${p?.correctiveAction || "—"}${p?.improvementBy ? `\nBy: ${dmy(p.improvementBy)}` : ""}`,
    "",
    `Consequence of repetition:\n${p?.consequence || levelById(p?.level).consequence}`,
    (p?.photos || []).length ? `\nPhotos: ${(p.photos || []).length} attached` : "",
    note ? `\n${note}` : "",
  ].filter((x) => x !== "").join("\n");
}

export function buildWarningHtml(p, opts = {}) {
  const note = typeof opts === "string" ? opts : String(opts?.note || "");
  const intro = typeof opts === "string" ? "" : String(opts?.intro || "").trim();
  const lv = levelById(p?.level);
  const block = (s) => `<div dir="auto" style="white-space:pre-wrap;unicode-bidi:plaintext;text-align:start">${esc(s || "—")}</div>`;
  const rows = detailRows(p).map(([k, v]) => `
    <tr>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:190px">${esc(k)}</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0">${esc(v)}</td>
    </tr>`).join("");
  const photos = (p?.photos || []).filter(Boolean).map((u) =>
    `<a href="${esc(u)}"><img src="${esc(thumbUrl(u, 320))}" alt="" style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;margin:0 6px 6px 0"/></a>`).join("");
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.5">
    ${intro ? `<div dir="auto" style="white-space:pre-wrap;margin-bottom:12px">${esc(intro)}</div>` : ""}
    <div style="border-left:6px solid ${lv.color};background:#fff7ed;padding:10px 14px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:18px;font-weight:800;color:${lv.color}">${esc(lv.en)}</div>
      <div style="color:#475569">AL MAWASHI — ${esc(DOC_META.docTitle)} · ${esc(DOC_META.docNo)}</div>
    </div>
    <table style="border-collapse:collapse;width:100%;max-width:720px;margin-bottom:12px">${rows}</table>
    <h4 style="margin:12px 0 4px">Description of the violation</h4>${block(p?.description)}
    <h4 style="margin:12px 0 4px">Required corrective action${p?.improvementBy ? ` (by ${esc(dmy(p.improvementBy))})` : ""}</h4>${block(p?.correctiveAction)}
    <h4 style="margin:12px 0 4px">Consequence of repetition</h4>${block(p?.consequence || lv.consequence)}
    ${photos ? `<h4 style="margin:12px 0 6px">Photos of the violation</h4><div>${photos}</div>` : ""}
    <p style="color:#475569;margin-top:12px">Issued by: <b>${esc(p?.issuedBy?.name || "—")}</b>${p?.approvedBy?.name ? ` · Approved by: <b>${esc(p.approvedBy.name)}</b>` : ""}</p>
    ${note ? `<div dir="auto" style="white-space:pre-wrap;margin-top:10px">${esc(note)}</div>` : ""}
  </div>`;
}

/* ═══════════════════════════ PDF (English) ══════════════════════════ */

async function loadScript(src, ready) {
  if (ready()) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export async function generateWarningPdf(p) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => !!window.jspdf?.jsPDF);
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js", () => !!window.jspdf?.jsPDF?.API?.autoTable);
  const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const mL = 40, mR = 40, W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const lv = levelById(p?.level);

  const header = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text("AL MAWASHI", mL, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
    doc.text("Trans Emirates Livestock Trading L.L.C.", mL, 56);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(180, 0, 0);
    doc.text(lv.en.toUpperCase(), W - mR, 40, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`${DOC_META.docNo} · ${dmy(p?.date)}`, W - mR, 56, { align: "right" });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.6); doc.line(mL, 66, W - mR, 66);
  };
  header();

  const tbl = { styles: { font: "helvetica", fontSize: 10, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.4 },
    headStyles: { fillColor: [15, 61, 46], textColor: 255, fontStyle: "bold" },
    margin: { top: 80, left: mL, right: mR }, didDrawPage: header };

  doc.autoTable({ ...tbl, startY: 82, head: [["Field", "Details"]], body: detailRows(p),
    columnStyles: { 0: { cellWidth: 170, fontStyle: "bold", fillColor: [248, 250, 252] } } });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [["Description of the violation"]], body: [[p?.description || "-"]] });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [[`Required corrective action${p?.improvementBy ? ` (by ${dmy(p.improvementBy)})` : ""}`]],
    body: [[p?.correctiveAction || "-"]] });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [["Consequence of repetition"]], body: [[p?.consequence || lv.consequence]] });

  const ack = p?.employeeAck || {};
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [["Issued by", "Employee acknowledgement", "Witness", "Approved by"]],
    body: [[
      `${p?.issuedBy?.name || ""}\n${dmy(p?.issuedBy?.date)}`,
      ack.refused ? "Employee refused to sign" : `${ack.name || ""}\n${dmy(ack.date)}`,
      p?.witness?.name || "",
      `${p?.approvedBy?.name || ""}\n${dmy(p?.approvedBy?.date)}`,
    ]],
    bodyStyles: { minCellHeight: 46 } });

  const photos = (p?.photos || []).filter((u) => u && !String(u).startsWith("blob:"));
  if (photos.length) {
    let y = doc.lastAutoTable.finalY + 20, x = mL;
    const w = 160, h = 120;
    if (y + 16 + h > H - 40) { doc.addPage(); header(); y = 82; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Photos of the violation", mL, y); y += 10;
    for (const u of photos.slice(0, 9)) {
      if (x + w > W - mR) { x = mL; y += h + 10; }
      if (y + h > H - 40) { doc.addPage(); header(); y = 82; x = mL; }
      try { doc.addImage(await urlToDataUrl(thumbUrl(u, 640)), "JPEG", x, y, w, h); }
      catch { doc.setDrawColor(203, 213, 225); doc.rect(x, y, w, h); }
      x += w + 10;
    }
  }

  const safe = (s) => String(s || "").replace(/[^\w-]+/g, "_");
  const filename = `warning_${safe(p?.employeeNo || p?.employeeName)}_${String(p?.date || "").replace(/-/g, "")}.pdf`;
  const blob = doc.output("blob");
  const base64 = (doc.output("datauristring").split(",")[1]) || "";
  return { blob, base64, filename };
}

/* ═══════════════════════════ Print sheet ═══════════════════════════
   Browser print, not jsPDF, so free text typed in Arabic prints shaped. */
export function printWarning(p) {
  const lv = levelById(p?.level);
  const ack = p?.employeeAck || {};
  const box = (title, body) => `<div class="box"><div class="bt">${esc(title)}</div><div class="bb" dir="auto">${esc(body || "—")}</div></div>`;
  const sign = (title, name, date) => `<div class="sg"><div class="st">${esc(title)}</div><div class="sn">${esc(name || "")}</div><div class="sl">Signature</div><div class="sd">Date: ${esc(date ? dmy(date) : "")}</div></div>`;
  const photos = (p?.photos || []).filter((u) => u && !String(u).startsWith("blob:"))
    .map((u) => `<img src="${esc(thumbUrl(u, 640))}" alt=""/>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(warningSubject(p))}</title>
<style>
  @page{size:A4;margin:14mm}
  body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:12px;margin:0}
  .hd{display:flex;justify-content:space-between;border-bottom:2px solid #0f3d2e;padding-bottom:8px;margin-bottom:10px}
  .co{font-size:18px;font-weight:800}.sub{color:#475569}
  .lv{font-size:17px;font-weight:800;color:${lv.color};text-align:right}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top}
  td.k{background:#f1f5f9;font-weight:700;width:30%}
  .box{border:1px solid #cbd5e1;border-radius:6px;margin-bottom:8px;page-break-inside:avoid}
  .bt{background:#0f3d2e;color:#fff;font-weight:700;padding:5px 8px}
  .bb{padding:8px;white-space:pre-wrap;unicode-bidi:plaintext;min-height:28px}
  .ph{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .ph img{width:31%;height:150px;object-fit:cover;border:1px solid #cbd5e1;border-radius:4px}
  .sgs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;page-break-inside:avoid}
  .sg{border:1px solid #cbd5e1;border-radius:6px;padding:8px;min-height:90px}
  .st{font-weight:700;color:#475569;font-size:11px;text-transform:uppercase}
  .sn{font-weight:700;margin-top:4px;min-height:16px}
  .sl{border-top:1px dashed #94a3b8;margin-top:26px;font-size:10px;color:#64748b}
  .sd{font-size:10px;color:#64748b;margin-top:4px}
  .ack{font-size:11px;color:#475569;margin-top:10px}
</style></head><body>
<div class="hd"><div><div class="co">AL MAWASHI</div><div class="sub">Trans Emirates Livestock Trading L.L.C. · ${esc(DOC_META.docTitle)} · ${esc(DOC_META.docNo)}</div></div>
<div><div class="lv">${esc(lv.en)}</div><div class="sub" style="text-align:right">Date: ${esc(dmy(p?.date))}</div></div></div>
<table>${detailRows(p).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td dir="auto">${esc(v)}</td></tr>`).join("")}</table>
${box("Description of the violation", p?.description)}
${box(`Required corrective action${p?.improvementBy ? ` (by ${dmy(p.improvementBy)})` : ""}`, p?.correctiveAction)}
${box("Consequence of repetition", p?.consequence || lv.consequence)}
${photos ? `<div class="box"><div class="bt">Photos of the violation</div><div class="bb"><div class="ph">${photos}</div></div></div>` : ""}
<div class="ack">I acknowledge that I have received this ${esc(lv.en.toLowerCase())} and that its content was explained to me. My signature does not necessarily mean I agree with it.</div>
<div class="sgs">
  ${sign("Issued by", p?.issuedBy?.name, p?.issuedBy?.date)}
  ${sign("Employee", ack.refused ? "Refused to sign" : ack.name, ack.date)}
  ${sign("Witness", p?.witness?.name, "")}
  ${sign("Approved by", p?.approvedBy?.name, p?.approvedBy?.date)}
</div>
<script>window.onload=function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r})})).then(function(){setTimeout(function(){window.print()},150)})}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
