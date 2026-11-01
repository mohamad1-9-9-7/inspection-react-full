// Halal declaration for suppliers who did not send one with their evaluation.
// QA prints a pre-filled form, the supplier signs + stamps it (and attaches
// their Halal certificate if they hold one), and the returned scan is stored
// on the evaluation record under payload.halal:
//   { requestedAt, requestedLang, declarationFile, certificateFile,
//     hasCertificate: true|false|null, certNo, certBody, certExpiry,
//     receivedAt, signedOn, notes }
// A declaration is valid for one year from the signing date written on the
// form (signedOn; receipt date until QA enters it), or until the Halal
// certificate expires if that comes first. A Halal file found in the
// questionnaire counts from the questionnaire's submission date.

const HALAL_RE = /halal|حلال/i;

/** Document control for the printed form (FSMS record numbering). */
export const HALAL_FORM_DOC = {
  docNo: "FS-QM/REC/HAL",
  issueDate: "01/11/2026",
  revision: "00",
};

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

const toDay = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Last day the declaration counts: signing (or receipt / submission) + 1 year, capped by the certificate expiry. */
export function halalValidUntil(halal, fallbackStart) {
  const h = halal || {};
  const start = toDay(h.signedOn) || toDay(h.receivedAt) || toDay(fallbackStart);
  if (!start) return null;
  const oneYear = new Date(start);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const certEnd = h.hasCertificate === true ? toDay(h.certExpiry) : null;
  return certEnd && certEnd < oneYear ? certEnd : oneYear;
}

/** "received" | "expired" | "requested" | "missing" */
export function halalStatus(payload, submissionFiles, submittedAt) {
  const h = getHalal(payload);
  const today = toDay(new Date());
  if (h.declarationFile?.url) {
    const until = halalValidUntil(h);
    return until && until < today ? "expired" : "received";
  }
  if (Array.isArray(submissionFiles) && submissionFiles.length) {
    // no signedOn/receivedAt of our own — the questionnaire date starts the year
    const until = halalValidUntil({ hasCertificate: h.hasCertificate, certExpiry: h.certExpiry }, submittedAt);
    return until && until < today ? "expired" : "received";
  }
  if (h.requestedAt) return "requested";
  return "missing";
}

export const HALAL_STATUS_STYLE = {
  received: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
  expired: { bg: "#ffedd5", fg: "#9a3412", border: "#fdba74" },
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
    docTitle: "Document Title",
    docTitleV: "Supplier Halal Declaration",
    docNo: "Document No",
    issueDate: "Issue Date",
    revision: "Revision No",
    owned: "Owned by",
    ownedV: "QA",
    authorised: "Authorised by",
    authorisedV: "Director",
    page: "Page",
    pageV: "1 of 1",
    to: "To",
    date: "Date",
    company: "Supplier",
    license: "Trade licence no.",
    address: "Address",
    contact: "Contact / Tel.",
    products: "Products supplied",
    pName: "Product",
    pBrand: "Brand",
    pOrigin: "Country of origin",
    pCert: "Halal certificate no.",
    pSlaughter: "Slaughterhouse & approval no. (meat / poultry)",
    intro: (buyer) => `We hereby declare to ${buyer} that all products we supply:`,
    points: [
      "Are Halal according to Islamic Sharia and UAE Halal standards (UAE.S 2055-1).",
      "Contain no pork or its derivatives, no blood, no alcohol and no ingredient from a non-Halal source.",
      "If they contain meat or poultry, come from animals slaughtered by Islamic rites in Halal-approved plants.",
      "Are produced, stored and transported separately from non-Halal products.",
      "Will not change in ingredients, source or Halal status without informing you in writing first.",
    ],
    validity: "Valid for one year from signing, or until the company Halal certificate expires — whichever comes first.",
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
    office: (buyer) => `For ${buyer} use only`,
    oReceivedBy: "Received by",
    oReceivedOn: "Received on",
    oVerified: "Certificate verified (body, scope, expiry)",
    oDecision: "Decision",
    oAccepted: "Accepted",
    oRejected: "Rejected",
    oSig: "QA signature",
  },
  ar: {
    title: "إقرار حلال",
    docTitle: "عنوان الوثيقة",
    docTitleV: "إقرار الحلال للمورد",
    docNo: "رقم الوثيقة",
    issueDate: "تاريخ الإصدار",
    revision: "رقم المراجعة",
    owned: "المالك",
    ownedV: "ضبط الجودة",
    authorised: "المعتمِد",
    authorisedV: "المدير",
    page: "الصفحة",
    pageV: "1 من 1",
    to: "إلى",
    date: "التاريخ",
    company: "المورد",
    license: "رقم الرخصة التجارية",
    address: "العنوان",
    contact: "المسؤول / الهاتف",
    products: "المنتجات المورَّدة",
    pName: "المنتج",
    pBrand: "العلامة التجارية",
    pOrigin: "بلد المنشأ",
    pCert: "رقم شهادة الحلال",
    pSlaughter: "المسلخ ورقم اعتماده (لحوم / دواجن)",
    intro: (buyer) => `نقرّ لشركة ${buyer} بأن جميع المنتجات التي نورّدها:`,
    points: [
      "حلال وفق أحكام الشريعة الإسلامية ومواصفة الحلال الإماراتية (UAE.S 2055-1).",
      "لا تحتوي على لحم الخنزير أو مشتقاته، ولا الدم، ولا الكحول، ولا أي مكوّن من مصدر غير حلال.",
      "إن احتوت على لحوم أو دواجن فهي مذبوحة وفق الشريعة الإسلامية في منشآت معتمدة للحلال.",
      "تُنتَج وتُخزَّن وتُنقل بشكل منفصل عن المنتجات غير الحلال.",
      "لن تتغيّر مكوّناتها أو مصدرها أو حالتها الحلال دون إبلاغكم كتابياً مسبقاً.",
    ],
    validity: "ساري لمدة سنة من تاريخ التوقيع، أو حتى انتهاء شهادة الحلال للشركة — أيّهما أسبق.",
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
    office: (buyer) => `للاستخدام الداخلي — ${buyer}`,
    oReceivedBy: "استلمه",
    oReceivedOn: "تاريخ الاستلام",
    oVerified: "تم التحقق من الشهادة (الجهة، النطاق، الصلاحية)",
    oDecision: "القرار",
    oAccepted: "مقبول",
    oRejected: "مرفوض",
    oSig: "توقيع ضبط الجودة",
  },
};

/**
 * Prints the one-page declaration (pre-filled from the evaluation) — print dialog only.
 * onAfterPrint runs once the print dialog has closed (printed or cancelled).
 */
export function printHalalDeclaration({ lang = "en", buyer, fields = {}, products = [], logoUrl = "", onAfterPrint }) {
  const L = TXT[lang] || TXT.en;
  const rtl = lang === "ar";
  const buyerName = buyer || (rtl ? "شركتنا" : "our company");
  const today = new Date().toLocaleDateString(rtl ? "ar-AE" : "en-GB");

  const prodNames = (Array.isArray(products) ? products : [])
    .map((p) => (typeof p === "string" ? p : p?.name))
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  // Always leave blank rows for the supplier to add products; shrink the
  // table text on long lists so the page stays one A4 sheet.
  const rows = [...prodNames, "", ""];
  while (rows.length < 5) rows.push("");
  const tableFs = rows.length > 14 ? 9 : rows.length > 10 ? 10.5 : 11.5;
  const rowH = rows.length > 14 ? 14 : rows.length > 10 ? 18 : 21;

  const cell = (label, value, wide) =>
    `<div class="f${wide ? " wide" : ""}"><span class="k">${esc(label)}</span><span class="v">${esc(value || "")}</span></div>`;
  const dc = (label, value) => `<td><span class="k">${esc(label)}:</span> <b>${esc(value)}</b></td>`;
  const contact = [fields.tqm_contact_name, fields.tqm_telephone].filter(Boolean).join(" / ");

  const html = `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${esc(L.title)} — ${esc(fields.company_name || "")}</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.4; margin: 0; }
  .dc { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .dc td { border: 1px solid #64748b; padding: 3px 7px; }
  .dc .logo { width: 110px; text-align: center; padding: 4px; }
  .dc .logo img { height: 62px; width: auto; }
  .band { display: flex; align-items: center; justify-content: space-between; background: #0f766e; color: #fff; padding: 6px 10px; margin-top: 6px; }
  .band h1 { margin: 0; font-size: 18px; letter-spacing: ${rtl ? "0" : "1.5px"}; }
  .band .m { font-size: 11px; }
  .sec { margin-top: 8px; }
  .sec-t { font-weight: 700; font-size: 12px; color: #0f766e; margin-bottom: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 16px; }
  .f { display: flex; gap: 6px; border-bottom: 1px dotted #94a3b8; min-height: 21px; align-items: flex-end; padding-bottom: 2px; }
  .f.wide { grid-column: 1 / -1; }
  .k { color: #475569; white-space: nowrap; }
  .v { font-weight: 700; flex: 1; }
  .pt { width: 100%; border-collapse: collapse; font-size: ${tableFs}px; line-height: 1.15; }
  .pt th, .pt td { border: 1px solid #94a3b8; padding: 2px 5px; text-align: ${rtl ? "right" : "left"}; height: ${rowH}px; }
  .pt th { background: #f0fdfa; font-size: ${tableFs - 0.5}px; font-weight: 700; }
  .pt td.n { width: 24px; text-align: center; color: #64748b; }
  ol { margin: 3px 0 0; padding-${rtl ? "right" : "left"}: 18px; }
  li { margin: 0; }
  .valid { margin-top: 3px; font-weight: 700; color: #0f766e; }
  .box { display: inline-block; width: 11px; height: 11px; border: 1.5px solid #0f172a; vertical-align: -2px; margin-${rtl ? "left" : "right"}: 5px; }
  .cert { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; }
  .row { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin: 3px 0; }
  .blank { display: inline-block; min-width: 90px; border-bottom: 1px solid #0f172a; height: 13px; }
  .sign { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
  .stamp { border: 1.5px dashed #64748b; border-radius: 8px; min-height: 104px; text-align: center; padding-top: 4px; color: #64748b; }
  .note { margin-top: 7px; padding: 5px 10px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; font-size: 10.5px; text-align: center; }
  .office { margin-top: 8px; border: 1.5px solid #334155; border-radius: 6px; padding: 4px 10px 6px; background: #f8fafc; font-size: 10.5px; }
  .office .sec-t { color: #334155; font-size: 11px; }
</style>
</head>
<body>
  <table class="dc">
    <tr>
      <td class="logo" rowspan="3">${logoUrl ? `<img src="${esc(logoUrl)}" alt="" />` : `<b>${esc(buyerName)}</b>`}</td>
      ${dc(L.docTitle, L.docTitleV)}${dc(L.docNo, HALAL_FORM_DOC.docNo)}
    </tr>
    <tr>${dc(L.issueDate, HALAL_FORM_DOC.issueDate)}${dc(L.revision, HALAL_FORM_DOC.revision)}</tr>
    <tr>${dc(L.owned, L.ownedV)}${dc(L.authorised, `${L.authorisedV} · ${L.page} ${L.pageV}`)}</tr>
  </table>

  <div class="band">
    <h1>${esc(L.title)}</h1>
    <div class="m">${esc(L.to)}: <b>${esc(buyerName)}</b> &nbsp;·&nbsp; ${esc(L.date)}: <b>${esc(today)}</b></div>
  </div>

  <div class="sec grid">
    ${cell(L.company, fields.company_name)}
    ${cell(L.license, fields.trade_license_no || fields.trade_license)}
    ${cell(L.address, fields.company_address)}
    ${cell(L.contact, contact)}
  </div>

  <div class="sec">
    <div class="sec-t">${esc(L.products)}</div>
    <table class="pt">
      <thead><tr>
        <th>#</th><th style="width:27%">${esc(L.pName)}</th><th style="width:13%">${esc(L.pBrand)}</th>
        <th style="width:13%">${esc(L.pOrigin)}</th><th style="width:17%">${esc(L.pCert)}</th><th>${esc(L.pSlaughter)}</th>
      </tr></thead>
      <tbody>
        ${rows.map((n, i) => `<tr><td class="n">${i + 1}</td><td>${esc(n)}</td><td></td><td></td><td></td><td></td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="sec">
    <div>${esc(L.intro(buyerName))}</div>
    <ol>${L.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
    <div class="valid">${esc(L.validity)}</div>
  </div>

  <div class="sec">
    <div class="sec-t">${esc(L.certTitle)}</div>
    <div class="cert">
      <div class="row">
        <span><span class="box"></span>${esc(L.certYes)}</span>
        <span>${esc(L.certNo)}: <span class="blank"></span></span>
        <span>${esc(L.certBody)}: <span class="blank"></span></span>
        <span>${esc(L.certExp)}: <span class="blank" style="min-width:60px"></span></span>
      </div>
      <div class="row"><span><span class="box"></span>${esc(L.certNone)}</span><span class="blank" style="flex:1"></span></div>
    </div>
  </div>

  <div class="sec sign">
    <div>
      ${cell(L.sName, "")}
      ${cell(L.sPos, "")}
      <div class="f" style="min-height:32px"><span class="k">${esc(L.sSig)}</span><span class="v"></span></div>
      ${cell(L.sDate, "")}
    </div>
    <div class="stamp">${esc(L.stamp)}</div>
  </div>

  <div class="note">${esc(L.returnNote(buyerName))}</div>

  <div class="office">
    <div class="sec-t">${esc(L.office(buyerName))}</div>
    <div class="row">
      <span>${esc(L.oReceivedBy)}: <span class="blank"></span></span>
      <span>${esc(L.oReceivedOn)}: <span class="blank" style="min-width:80px"></span></span>
      <span><span class="box"></span>${esc(L.oVerified)}</span>
    </div>
    <div class="row">
      <span>${esc(L.oDecision)}: <span class="box"></span>${esc(L.oAccepted)} &nbsp; <span class="box"></span>${esc(L.oRejected)}</span>
      <span>${esc(L.oSig)}: <span class="blank" style="min-width:150px"></span></span>
    </div>
  </div>
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
    // the browser does not say whether the user printed or cancelled — the caller asks
    if (typeof onAfterPrint === "function") setTimeout(onAfterPrint, 50);
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
