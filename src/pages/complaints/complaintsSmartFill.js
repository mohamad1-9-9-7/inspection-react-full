// src/pages/complaints/complaintsSmartFill.js
// -----------------------------------------------------------------------------
// Smart fill: turn a pasted e-mail (or a photo of a paper note) into a
// pre-filled complaint. Text is parsed with plain heuristics; photos are read
// with the shared in-browser OCR engine (src/utils/ocrScan.js) — the same one
// the returns note scanner uses — so nothing is uploaded and no new dependency
// is added.
//
// It only ever SUGGESTS: the form page shows a preview and the user applies it,
// so a wrong guess costs a click, never a bad record.
// -----------------------------------------------------------------------------

import { ocrImages } from "../../utils/ocrScan";
import { BRANCHES, SEVERITY, getAllCategories, emptyItem } from "./complaintsCore";

/* ── photo → text (reuses the shared OCR engine, single fast pass) ── */
export async function imageToText(file, onProgress) {
  const pages = await ocrImages(
    [file],
    onProgress ? (p) => onProgress(Math.round((p.overall || 0) * 100)) : undefined,
    { deep: false }
  );
  return String(pages?.[0]?.text || "").trim();
}

/* ── reason keywords (EN + AR) → category id ── */
const CAT_KEYWORDS = [
  ["EXPIRED",     [/expired?/i, /past\s*expiry/i, /منته/i, /منتهي\s*الصلاح/i]],
  ["NEAR_EXPIRY", [/near\s*expiry/i, /short\s*shelf/i, /قرب\s*الانتهاء/i, /قارب/i]],
  ["CRITICAL",    [/critical/i, /food\s*safety\s*risk/i, /حرج/i, /خطر\s*جودة/i]],
  ["DAMAGE",      [/damage/i, /broken/i, /torn/i, /leak/i, /تلف/i, /كسر/i, /تسريب/i, /تمزق/i]],
  ["BAD_SMELL",   [/odou?r/i, /smell/i, /rancid/i, /رائحة/i, /نتن/i]],
  ["TEMPERATURE", [/temperature/i, /thaw/i, /not\s*frozen/i, /warm/i, /حرارة/i, /غير\s*مجمد/i, /ذائب/i]],
  ["WRONG_ITEM",  [/wrong\s*item/i, /mismatch/i, /incorrect/i, /غير\s*مطابق/i, /خطأ\s*في\s*الصنف/i]],
  ["OVER_QUANTITY",[/excess/i, /over\s*quantity/i, /extra\s*qty/i, /كمية\s*زائدة/i]],
  ["REPEATED",    [/repeated/i, /again/i, /recurr/i, /تكرار/i, /متكرر/i]],
  ["HYGIENE",     [/hygiene/i, /sanitation/i, /dirty/i, /نظافة/i, /صحّ?ي/i, /اتساخ/i]],
  ["DOCUMENT",    [/missing\s*doc/i, /no\s*certificate/i, /halal\s*cert/i, /وثائق/i, /شهادة/i, /مستند/i]],
];

const HIGH_HINT = [/urgent/i, /عاجل/i, /immediately/i, /فور/i];

const norm = (s) => String(s || "").replace(/\u00a0/g, " ").trim();

/* A YYYY-MM-DD out of DD/MM/YYYY, MM/YYYY, or an already-ISO date; else "". */
function toISO(raw) {
  const s = norm(raw);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})[/.-](\d{4})$/); // MM/YYYY → first of month
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}-01`;
  return "";
}

/* Match any known branch token in the text ("POS15", "POS 15", "QCS", "KMC"). */
function findBranch(text) {
  for (const b of BRANCHES) {
    const flex = b.replace(/\s+/g, "\\s*").replace(/[.*+?^${}()|[\]\\]/g, (c) =>
      /\s/.test(c) ? c : `\\${c}`);
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${flex}(?![A-Za-z0-9])`, "i");
    if (re.test(text)) return b;
  }
  return "";
}

function findSupplier(text, suppliers = []) {
  const labelled = text.match(/(?:supplier|vendor|المورّ?د)\s*[:：\-]\s*(.+)/i);
  if (labelled) {
    const name = norm(labelled[1]).split(/[\n,;]/)[0].slice(0, 80);
    if (name) return name;
  }
  const low = text.toLowerCase();
  const hit = suppliers
    .filter((s) => s && s.length >= 3 && low.includes(s.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return hit || "";
}

/* Pull item rows: bracketed [code] name, or a code + qty/unit/expiry on a line. */
function findItems(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const qtyRe = /(\d+(?:[.,]\d+)?)\s*(kg|kgs|pcs|pc|box|ctn|carton|plate|حبة|كيلو|علبة|كرتون)\b/i;
  const dateRe = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[/.-]\d{4})/;
  const unitMap = { kgs: "KG", kg: "KG", pc: "PCS", pcs: "PCS", box: "BOX", ctn: "BOX", carton: "BOX", plate: "PLATE", "كيلو": "KG", "حبة": "PCS", "علبة": "BOX", "كرتون": "BOX" };

  for (const rawLine of lines) {
    const line = norm(rawLine);
    if (!line) continue;
    const bracket = line.match(/\[(\d{3,6})\]\s*([^\n\[\]]*)/);
    const bare = !bracket && line.match(/(?:^|[^\d])(\d{5,6})(?![\d])/);
    const code = bracket ? bracket[1] : bare ? bare[1] : "";
    const qtyM = line.match(qtyRe);
    // Skip a bare number that is really a date/qty/phone with no supporting signal.
    if (!code && !qtyM) continue;
    if (!bracket && !qtyM && !/[a-zA-Z\u0600-\u06FF]{3,}/.test(line)) continue;

    let name = bracket ? norm(bracket[2]) : "";
    name = name.replace(qtyRe, "").replace(dateRe, "").replace(/[-–—:]+$/, "").trim();
    const dM = line.match(dateRe);
    out.push({
      ...emptyItem(),
      itemCode: code,
      productName: name.slice(0, 80),
      quantity: qtyM ? qtyM[1].replace(",", ".") : "",
      qtyUnit: qtyM ? (unitMap[qtyM[2].toLowerCase()] || "KG") : "KG",
      expiry: dM ? toISO(dM[1]) : "",
      remarks: "",
    });
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Parse free text into a complaint patch.
 * @param {string} text
 * @param {{suppliers?: string[]}} ctx
 * @returns {{patch: object, found: string[]}}  found = human labels of what was detected
 */
export function parseComplaint(text, ctx = {}) {
  const src = norm(text);
  const found = [];
  const patch = { description: src };

  // Subject
  const subjM = src.match(/(?:subject|re|الموضوع)\s*[:：]\s*(.+)/i);
  if (subjM) {
    patch.subject = norm(subjM[1]).slice(0, 120);
    found.push(`Subject: “${patch.subject}”`);
  } else {
    const firstLine = src.split(/\r?\n/).map(norm).find((l) => l.length >= 4);
    if (firstLine) { patch.subject = firstLine.slice(0, 120); found.push("Subject (from first line)"); }
  }

  // Target: supplier wins if named, else a branch token, else leave as-is
  const supplier = findSupplier(src, ctx.suppliers || []);
  const branch = findBranch(src);
  if (supplier) {
    patch.target = "supplier"; patch.supplier = supplier;
    found.push(`Supplier: ${supplier}`);
  } else if (branch) {
    patch.target = "branch"; patch.branch = branch;
    found.push(`Branch: ${branch}`);
  }

  // Categories
  const cats = [];
  for (const [id, res] of CAT_KEYWORDS) if (res.some((re) => re.test(src))) cats.push(id);
  if (cats.length) {
    patch.categories = cats;
    const all = getAllCategories();
    found.push("Reasons: " + cats.map((id) => all.find((c) => c.id === id)?.en || id).join(", "));
  }

  // Severity
  if (cats.includes("EXPIRED") || cats.includes("CRITICAL") || HIGH_HINT.some((re) => re.test(src))) {
    patch.severity = "HIGH";
    found.push(`Severity: ${SEVERITY.find((s) => s.id === "HIGH").en}`);
  }

  // Items
  const items = findItems(src);
  if (items.length) {
    patch.items = items;
    found.push(`${items.length} item(s)`);
  }

  return { patch, found };
}
