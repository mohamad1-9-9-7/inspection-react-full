// Halal declaration for suppliers who did not send one with their evaluation.
// QA prints a pre-filled form, the supplier signs + stamps it (and attaches
// their Halal certificate if they hold one), and the returned scan is stored
// on the evaluation record under payload.halal:
//   { requestedAt, requestedLang, declarationFile, certificateFile,
//     hasCertificate: true|false|null, certNo, certBody, certExpiry,
//     receivedAt, notes }

const HALAL_RE = /halal|حلال/i;

/** Halal matters for food suppliers (and records saved before the type existed). */
export function halalApplies(supplierType) {
  const st = String(supplierType || "").toLowerCase();
  return !st || st === "food";
}

export function getHalal(payload) {
  const h = payload?.halal;
  return h && typeof h === "object" && !Array.isArray(h) ? h : {};
}

/** Files the supplier already uploaded in the questionnaire that look like a Halal document. */
export function findHalalFilesInSubmission(attachments, fieldAttachments) {
  const out = [];
  const looks = (f, key) => f && f.url && (HALAL_RE.test(String(f.name || f.filename || "")) || HALAL_RE.test(String(key || "")));
  (Array.isArray(attachments) ? attachments : []).forEach((f) => {
    if (looks(f)) out.push(f);
  });
  Object.entries(fieldAttachments && typeof fieldAttachments === "object" ? fieldAttachments : {}).forEach(([key, list]) => {
    (Array.isArray(list) ? list : []).forEach((f) => {
      if (looks(f, key)) out.push(f);
    });
  });
  return out;
}

/** "received" | "requested" | "missing" */
export function halalStatus(payload, submissionFiles) {
  const h = getHalal(payload);
  if (h.declarationFile?.url) return "received";
  if (Array.isArray(submissionFiles) && submissionFiles.length) return "received";
  if (h.requestedAt) return "requested";
  return "missing";
}

export const HALAL_STATUS_STYLE = {
  received: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
  requested: { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
  missing: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
};

/* ===================== Printable form ===================== */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TXT = {
  en: {
    title: "HALAL DECLARATION",
    to: "To",
    date: "Date",
    company: "Supplier",
    license: "Trade licence no.",
    address: "Address",
    contact: "Contact / Tel.",
    products: "Products supplied",
    otherProducts: "Other products",
    intro: (buyer) => `We hereby declare to ${buyer} that all products we supply:`,
    points: [
      "Are Halal according to Islamic Sharia and UAE Halal standards (UAE.S 2055-1).",
      "Contain no pork or its derivatives, no blood, no alcohol and no ingredient from a non-Halal source.",
      "If they contain meat or poultry, come from animals slaughtered by Islamic rites in Halal-approved plants.",
      "Are produced, stored and transported separately from non-Halal products.",
      "Will not change in ingredients, source or Halal status without informing you in writing first.",
    ],
    certTitle: "Company Halal certificate",
    certYes: "Available — copy attached",
    certNo: "Certificate no.",
    certBody: "Issued by",
    certExp: "Expiry date",
    certNone: "Not available — reason:",
    sName: "Name",
    sPos: "Position",
    sSig: "Signature",
    sDate: "Date",
    stamp: "Company stamp",
    returnNote: (buyer) =>
      `Please sign, stamp and return this page to ${buyer} with a copy of your Halal certificate (if available).`,
  },
  ar: {
    title: "إقرار حلال",
    to: "إلى",
    date: "التاريخ",
    company: "المورد",
    license: "رقم الرخصة التجارية",
    address: "العنوان",
    contact: "المسؤول / الهاتف",
    products: "المنتجات المورَّدة",
    otherProducts: "منتجات أخرى",
    intro: (buyer) => `نقرّ لشركة ${buyer} بأن جميع المنتجات التي نورّدها:`,
    points: [
      "حلال وفق أحكام الشريعة الإسلامية ومواصفة الحلال الإماراتية (UAE.S 2055-1).",
      "لا تحتوي على لحم الخنزير أو مشتقاته، ولا الدم، ولا الكحول، ولا أي مكوّن من مصدر غير حلال.",
      "إن احتوت على لحوم أو دواجن فهي مذبوحة وفق الشريعة الإسلامية في منشآت معتمدة للحلال.",
      "تُنتَج وتُخزَّن وتُنقل بشكل منفصل عن المنتجات غير الحلال.",
      "لن تتغيّر مكوّناتها أو مصدرها أو حالتها الحلال دون إبلاغكم كتابياً مسبقاً.",
    ],
    certTitle: "شهادة الحلال للشركة",
    certYes: "متوفرة — مرفق نسخة منها",
    certNo: "رقم الشهادة",
    certBody: "الجهة المانحة",
    certExp: "تاريخ الانتهاء",
    certNone: "غير متوفرة — السبب:",
    sName: "الاسم",
    sPos: "المنصب",
    sSig: "التوقيع",
    sDate: "التاريخ",
    stamp: "ختم الشركة",
    returnNote: (buyer) => `يرجى توقيع هذه الصفحة وختمها وإعادتها إلى ${buyer} مع نسخة من شهادة الحلال (إن وُجدت).`,
  },
};

/**
 * Prints the one-page declaration (pre-filled from the evaluation) — print dialog only.
 * @returns {boolean} always true (kept so the panel can stamp requestedAt)
 */
export function printHalalDeclaration({ lang = "en", buyer, fields = {}, products = [] }) {
  const L = TXT[lang] || TXT.en;
  const rtl = lang === "ar";
  const buyerName = buyer || (rtl ? "شركتنا" : "our company");
  const today = new Date().toLocaleDateString(rtl ? "ar-AE" : "en-GB");
  const logo = `${window.location.origin}/mawashi-logo.jpg`;

  const prodNames = (Array.isArray(products) ? products : [])
    .map((p) => (typeof p === "string" ? p : p?.name))
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const cell = (label, value, wide) =>
    `<div class="f${wide ? " wide" : ""}"><span class="k">${esc(label)}</span><span class="v">${esc(value || "")}</span></div>`;
  const contact = [fields.tqm_contact_name, fields.tqm_telephone].filter(Boolean).join(" / ");

  const html = `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${esc(L.title)} — ${esc(fields.company_name || "")}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.45; margin: 0; }
  .head { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #0f766e; padding-bottom: 8px; }
  .head img { height: 86px; width: auto; }
  .head .t { flex: 1; text-align: center; }
  h1 { margin: 0; font-size: 22px; color: #0f766e; letter-spacing: ${rtl ? "0" : "1.5px"}; }
  .meta { font-size: 11px; line-height: 1.6; text-align: ${rtl ? "left" : "right"}; white-space: nowrap; }
  .sec { margin-top: 10px; }
  .sec-t { font-weight: 700; font-size: 12.5px; color: #0f766e; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
  .f { display: flex; gap: 6px; border-bottom: 1px dotted #94a3b8; min-height: 22px; align-items: flex-end; padding-bottom: 2px; }
  .f.wide { grid-column: 1 / -1; }
  .k { color: #475569; white-space: nowrap; }
  .v { font-weight: 700; flex: 1; }
  .prods { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; min-height: 30px; }
  ol { margin: 4px 0 0; padding-${rtl ? "right" : "left"}: 18px; }
  li { margin: 1px 0; }
  .box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #0f172a; vertical-align: -2px; margin-${rtl ? "left" : "right"}: 6px; }
  .cert { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; }
  .row { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin: 4px 0; }
  .blank { display: inline-block; min-width: 120px; border-bottom: 1px solid #0f172a; height: 14px; }
  .sign { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
  .stamp { border: 1.5px dashed #64748b; border-radius: 8px; min-height: 130px; text-align: center; padding-top: 4px; color: #64748b; }
  .note { margin-top: 10px; padding: 6px 10px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <img src="${logo}" alt="" />
    <div class="t"><h1>${esc(L.title)}</h1></div>
    <div class="meta">
      <div>${esc(L.to)}: <b>${esc(buyerName)}</b></div>
      <div>${esc(L.date)}: <b>${esc(today)}</b></div>
    </div>
  </div>

  <div class="sec grid">
    ${cell(L.company, fields.company_name)}
    ${cell(L.license, fields.trade_license_no || fields.trade_license)}
    ${cell(L.address, fields.company_address)}
    ${cell(L.contact, contact)}
  </div>

  <div class="sec">
    <div class="sec-t">${esc(L.products)}</div>
    <div class="prods">${prodNames.length ? esc(prodNames.join(" · ")) : "&nbsp;"}</div>
    <div class="f" style="margin-top:4px"><span class="k">${esc(L.otherProducts)}:</span><span class="v"></span></div>
  </div>

  <div class="sec">
    <div>${esc(L.intro(buyerName))}</div>
    <ol>${L.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
  </div>

  <div class="sec">
    <div class="sec-t">${esc(L.certTitle)}</div>
    <div class="cert">
      <div class="row"><span><span class="box"></span>${esc(L.certYes)}</span></div>
      <div class="row">
        <span>${esc(L.certNo)}: <span class="blank"></span></span>
        <span>${esc(L.certBody)}: <span class="blank"></span></span>
        <span>${esc(L.certExp)}: <span class="blank" style="min-width:90px"></span></span>
      </div>
      <div class="row"><span><span class="box"></span>${esc(L.certNone)}</span><span class="blank" style="flex:1"></span></div>
    </div>
  </div>

  <div class="sec sign">
    <div>
      ${cell(L.sName, "")}
      ${cell(L.sPos, "")}
      <div class="f" style="min-height:36px"><span class="k">${esc(L.sSig)}</span><span class="v"></span></div>
      ${cell(L.sDate, "")}
    </div>
    <div class="stamp">${esc(L.stamp)}</div>
  </div>

  <div class="note">${esc(L.returnNote(buyerName))}</div>
</body>
</html>`;

  // Print from a hidden iframe so only the browser's print dialog shows —
  // no extra window. srcdoc's load fires after the logo has loaded.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const pageTitle = document.title;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = pageTitle;
    frame.remove();
  };
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) return cleanup();
    w.addEventListener("afterprint", () => setTimeout(cleanup, 100));
    // "Save as PDF" names the file after the top page's title
    document.title = `${L.title} - ${fields.company_name || ""}`.trim();
    w.focus();
    w.print();
    setTimeout(cleanup, 60000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  return true;
}
