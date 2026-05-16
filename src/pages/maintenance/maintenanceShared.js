// maintenanceShared.js
// Shared model, helpers, and bilingual print/PDF for the Maintenance module.

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export const TYPE = "maintenance";

/* ===== Status workflow ===== */
export const STATUS = {
  NEW:         "جديد / New",
  IN_PROGRESS: "جاري التنفيذ / In Progress",
  COMPLETED:   "مكتمل / Completed",
  REJECTED:    "مرفوض / Rejected",
};
export const STATUS_ORDER = [STATUS.NEW, STATUS.IN_PROGRESS, STATUS.COMPLETED, STATUS.REJECTED];

export function statusTone(s) {
  const v = String(s || STATUS.NEW);
  if (v.includes("Completed") || v.includes("مكتمل")) return { bg: "#dcfce7", fg: "#166534", bd: "#86efac" };
  if (v.includes("Rejected") || v.includes("مرفوض"))  return { bg: "#fee2e2", fg: "#991b1b", bd: "#fecaca" };
  if (v.includes("In Progress") || v.includes("جاري")) return { bg: "#dbeafe", fg: "#1e40af", bd: "#93c5fd" };
  return { bg: "#fef9c3", fg: "#854d0e", bd: "#fde68a" }; // New
}

export const BRANCHES = [
  "QCS","POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17",
  "POS 19","POS 21","POS 24","POS 25","POS 37","POS 38","POS 42","POS 44","POS 45","FTR1","FTR2",
];

export const PRIORITIES = [
  { ar: "منخفضة", en: "Low" },
  { ar: "متوسطة", en: "Medium" },
  { ar: "عالية", en: "High" },
  { ar: "طارئة", en: "Urgent" },
];

/* ===== API ===== */
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...opts,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${opts.method || "GET"} ${url} -> ${res.status} ${res.statusText}\n${t}`);
  }
  try { return await res.json(); } catch { return { ok: true }; }
}

export function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}

const dateOnly = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : (() => {
    const d = new Date(v || "");
    return isNaN(d) ? "" : d.toISOString().slice(0, 10);
  })();

/** Fetch + normalise + dedupe maintenance records (newest first). */
export async function fetchMaintenance() {
  const raw = await apiFetch(`${API_BASE}/api/reports?type=${TYPE}`);
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const mapped = (arr || [])
    .filter((r) => r?.payload)
    .map((r) => {
      const p = r.payload || {};
      return {
        _id: r._id ?? r.id ?? null,
        _clientSavedAt: p._clientSavedAt,
        createdAt: p.createdAt || r.createdAt || r.created_at,
        requestNo: p.requestNo || "",
        reportDate: p.reportDate || p.requestDate || r.reportDate || dateOnly(p.createdAt),
        branch: p.branch || "",
        dateOfForm: p.dateOfForm || p.requestDate || "",
        applicant: p.applicant || p.reporter || "",
        dateReceived: p.dateReceived || "",
        recipient: p.recipient || "",
        priority: p.priority || "",
        reporter: p.reporter || "",
        problems: Array.isArray(p.problems) ? p.problems : [],
        images: Array.isArray(p.images) ? p.images : [],
        maintenanceComment: p.maintenanceComment || "",
        workshop: p.workshop || "",
        materials: Array.isArray(p.materials) ? p.materials : [],
        totalCost: p.totalCost || "",
        procurement: p.procurement || { name: "", date: "" },
        management: p.management || { name: "", date: "" },
        status: p.status || STATUS.NEW,
        timeline: Array.isArray(p.timeline) ? p.timeline : [],
        proofs: Array.isArray(p.proofs) ? p.proofs : [],          // Cloudinary URLs: repair proof + invoices
        completionNote: p.completionNote || "",
        completedAt: p.completedAt || "",
        rejectionReason: p.rejectionReason || "",
        technician: p.technician || "",
        // legacy single-issue fields (back-compat with old records)
        title: p.title || "",
        description: p.description || "",
        issueType: p.issueType || "",
      };
    });

  const byKey = new Map();
  for (const rec of mapped) {
    const key = rec.requestNo || rec.createdAt || rec._id;
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, rec); continue; }
    const a = toTs(prev.updatedAt) || toTs(prev.createdAt) || toTs(prev._id) || toTs(prev._clientSavedAt);
    const b = toTs(rec.updatedAt) || toTs(rec.createdAt) || toTs(rec._id) || toTs(rec._clientSavedAt);
    byKey.set(key, b >= a ? rec : prev);
  }
  return Array.from(byKey.values()).sort((x, y) => toTs(y.createdAt) - toTs(x.createdAt));
}

/**
 * Next sequential request number: MR-YYYY-NNN (per calendar year).
 * Pass `afterNo` (the number just used) as a floor so the result is always
 * greater than it — this defeats the read-after-write race where a fresh
 * fetch doesn't yet include the request we just saved.
 */
export async function nextRequestNo(afterNo) {
  const year = new Date().getFullYear();
  let max = 0;
  const fm = String(afterNo || "").match(/^MR-(\d{4})-(\d+)$/);
  if (fm && Number(fm[1]) === year) max = Number(fm[2]);
  try {
    const list = await fetchMaintenance();
    for (const r of list) {
      const m = String(r.requestNo || "").match(/^MR-(\d{4})-(\d+)$/);
      if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
    }
  } catch { /* offline → keep floor from afterNo (or start at 1) */ }
  return `MR-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function pushTimeline(record, action, by) {
  const entry = { at: new Date().toISOString(), by: by || record.reporter || "—", action };
  return [...(Array.isArray(record.timeline) ? record.timeline : []), entry];
}

/** Save / upsert a maintenance record (server pattern requires reportDate). */
export async function saveMaintenance(record, { by } = {}) {
  const ymd = record.reportDate || record.dateOfForm || dateOnly(record.createdAt) || new Date().toISOString().slice(0, 10);
  const createdAtISO = record.createdAt || new Date(`${ymd}T12:00:00`).toISOString();
  const payload = {
    ...record,
    requestDate: ymd,
    reportDate: ymd,
    createdAt: createdAtISO,
    status: record.status || STATUS.NEW,
    _clientSavedAt: Date.now(),
  };
  const reporter = record.reporter || by || "anonymous";
  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify({ reporter, type: TYPE, payload }) },
    { url: `${API_BASE}/api/reports?type=${TYPE}`, method: "PUT", body: JSON.stringify({ reporter, payload }) },
  ];
  let lastErr = null;
  for (const a of attempts) {
    try { return await apiFetch(a.url, a); } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Save failed");
}

/** Delete a maintenance record by its server numeric id. */
export async function deleteMaintenance(record) {
  const id = record?._id;
  if (id === null || id === undefined || id === "") {
    throw new Error("لا يمكن الحذف: معرّف السجل غير متوفر / Missing record id");
  }
  const tryUrls = [
    `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
    `${API_BASE}/api/reports/${encodeURIComponent(id)}?type=${TYPE}`,
  ];
  let lastErr = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { method: "DELETE", headers: { Accept: "application/json" } });
      if (res.ok || res.status === 404) return true; // 404 = already gone
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Delete failed");
}

/* ===== Derived helpers ===== */
export function isOverdue(record) {
  if (String(record.status || "").includes("Completed") || String(record.status || "").includes("Rejected")) return false;
  const deadlines = (record.problems || [])
    .map((p) => p.deadline)
    .filter(Boolean)
    .map((d) => toTs(d))
    .filter(Boolean);
  if (!deadlines.length) return false;
  return Math.min(...deadlines) < Date.now();
}

export function sumCost(materials) {
  return (materials || []).reduce((acc, m) => {
    const n = parseFloat(String(m?.cost ?? "").replace(/[^\d.\-]/g, ""));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/* ===== Bilingual print HTML (mirrors the paper form) ===== */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildMaintenanceFormHtml(rec) {
  const probRows = (rec.problems?.length ? rec.problems : [{}, {}, {}, {}, {}])
    .map((p, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(p.location)}</td>
        <td>${esc(p.problem)}</td>
        <td class="c">${esc(p.startedDate)}</td>
        <td class="c">${esc(p.deadline)}</td>
      </tr>`).join("");

  const matRows = (rec.materials?.length ? rec.materials : [{}, {}, {}, {}, {}, {}])
    .map((m, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(m.item)}</td>
        <td>${esc(m.description)}</td>
        <td class="c">${esc(m.cost)}</td>
      </tr>`).join("");

  const total = rec.totalCost || (sumCost(rec.materials) || "");
  const wInt = rec.workshop === "internal" ? "☑" : "☐";
  const wExt = rec.workshop === "external" ? "☑" : "☐";
  const tone = statusTone(rec.status);

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
  <title>${esc(rec.requestNo || "Maintenance Enquiry Form")}</title>
  <style>
    *{box-sizing:border-box;font-family:'Cairo','Segoe UI',Arial,sans-serif;}
    body{margin:0;padding:24px;color:#111;background:#fff;}
    .sheet{max-width:820px;margin:auto;}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #b91c1c;padding-bottom:8px;}
    .brand{color:#b91c1c;font-weight:900;font-size:22px;}
    .brand small{display:block;color:#444;font-weight:600;font-size:11px;}
    h1{text-align:center;font-size:18px;margin:14px 0 4px;}
    .reqno{text-align:center;font-weight:900;color:#b91c1c;margin-bottom:10px;}
    .badge{display:inline-block;padding:3px 12px;border-radius:999px;font-weight:800;font-size:12px;
           background:${tone.bg};color:${tone.fg};border:1px solid ${tone.bd};}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;margin:10px 0;}
    .meta div{padding:3px 0;border-bottom:1px dotted #999;}
    .meta b{display:inline-block;min-width:150px;}
    table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}
    th,td{border:1px solid #333;padding:6px 8px;}
    th{background:#b91c1c;color:#fff;font-weight:800;}
    td.c{text-align:center;}
    .secT{font-weight:900;border-bottom:2px solid #111;margin:16px 0 6px;padding-bottom:3px;}
    .ws{font-size:13px;margin:6px 0;}
    .ws span{margin-inline-start:24px;font-weight:700;}
    .appr{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;font-size:13px;}
    .appr .line{border-top:1px solid #111;margin-top:34px;padding-top:4px;font-weight:700;}
    .cmt{min-height:48px;border:1px solid #333;padding:8px;font-size:13px;border-radius:4px;white-space:pre-wrap;}
    @media print{body{padding:0;} .noprint{display:none;}}
  </style></head><body><div class="sheet">
    <div class="top">
      <div class="brand">المواشي<small>Trans Emirates Livestock Trading L.L.C.</small></div>
      <div class="brand" style="text-align:left;">AL MAWASHI</div>
    </div>
    <h1>طلب أعمال صيانة عامة &nbsp;—&nbsp; Maintenance Enquiry Form</h1>
    <div class="reqno">${esc(rec.requestNo || "")} &nbsp; <span class="badge">${esc(rec.status || STATUS.NEW)}</span></div>

    <div class="meta">
      <div><b>الفرع / Branch:</b> ${esc(rec.branch)}</div>
      <div><b>تاريخ تقديم الطلب / Date of form:</b> ${esc(rec.dateOfForm)}</div>
      <div><b>مقدم الطلب / Applicant:</b> ${esc(rec.applicant)}</div>
      <div><b>تاريخ استلام الطلب / Date received:</b> ${esc(rec.dateReceived)}</div>
      <div><b>مستلم الطلب / Recipient:</b> ${esc(rec.recipient)}</div>
      <div><b>الأولوية / Priority:</b> ${esc(rec.priority)}</div>
    </div>

    <div class="secT">الرجاء القيام بأعمال الصيانة التالية / Please provide maintenance as follows</div>
    <table>
      <tr><th style="width:36px;">S. م</th><th>الموقع بالضبط<br>Exact location</th>
          <th>المشكلة<br>Problem</th><th>تاريخ بداية المشكلة<br>Problem started</th>
          <th>وقت التنفيذ<br>Deadline</th></tr>
      ${probRows}
    </table>

    <div class="secT">تعليق قسم الصيانة / Maintenance comment</div>
    <div class="cmt">${esc(rec.maintenanceComment)}</div>
    <div class="ws">ورشة داخلية / Internal workshop <span>${wInt}</span>
        &nbsp;&nbsp; ورشة خارجية / External workshop <span>${wExt}</span></div>

    <div class="secT">المواد / Material</div>
    <table>
      <tr><th style="width:36px;">S. م</th><th>المادة<br>Item</th>
          <th>الوصف<br>Description</th><th>التكلفة<br>Cost</th></tr>
      ${matRows}
      <tr><td colspan="3" style="text-align:left;font-weight:900;">الإجمالي / Total</td>
          <td class="c" style="font-weight:900;">${esc(total)}</td></tr>
    </table>

    <div class="appr">
      <div>موافقة المشتريات / Procurement approval
        <div class="line">${esc(rec.procurement?.name || "")} ${rec.procurement?.date ? "— " + esc(rec.procurement.date) : ""}</div>
      </div>
      <div>موافقة الإدارة / Management approval
        <div class="line">${esc(rec.management?.name || "")} ${rec.management?.date ? "— " + esc(rec.management.date) : ""}</div>
      </div>
    </div>
  </div></body></html>`;
}

export function printMaintenanceForm(rec) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert("المتصفح منع فتح نافذة الطباعة."); return; }
  w.document.write(buildMaintenanceFormHtml(rec));
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch {} }, 400);
}

export async function downloadMaintenancePdf(rec) {
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-99999px";
  holder.style.top = "0";
  holder.style.width = "820px";
  holder.style.background = "#fff";
  const html = buildMaintenanceFormHtml(rec);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  holder.innerHTML = (styleMatch ? `<style>${styleMatch[1]}</style>` : "") + (bodyMatch ? bodyMatch[1] : html);
  document.body.appendChild(holder);
  try {
    const canvas = await html2canvas(holder, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    let y = 0;
    if (imgH <= pageH) {
      pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
    } else {
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(img, "JPEG", 0, y, pageW, imgH);
        remaining -= pageH;
        if (remaining > 0) { pdf.addPage(); y -= pageH; }
      }
    }
    pdf.save(`${rec.requestNo || "maintenance"}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}
