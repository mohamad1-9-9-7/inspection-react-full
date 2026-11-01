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
    sub: "Supplier Halal Compliance Undertaking",
    to: "To",
    ref: "Ref.",
    date: "Date",
    supplier: "Supplier Details",
    company: "Company name",
    address: "Address",
    license: "Trade licence no.",
    contact: "Contact person",
    phone: "Telephone",
    email: "E-mail",
    products: "Products covered by this declaration",
    pName: "Product name",
    pBrand: "Brand / Origin",
    pCert: "Halal certificate no. (if product-specific)",
    intro: (buyer) =>
      `We, the undersigned, hereby declare to ${buyer} that all products listed above and supplied to you:`,
    points: [
      "Are Halal and comply with Islamic Sharia requirements and the applicable UAE Halal standards (UAE.S 2055-1 / OIC/SMIIC 1).",
      "Do not contain pork or any pork derivatives, blood, alcohol (ethanol) added as an ingredient, or any ingredient, additive or processing aid from a non-Halal source.",
      "Where they contain meat or poultry, come from animals slaughtered according to Islamic rites in Halal-approved establishments.",
      "Are produced, packed, stored and transported separately from non-Halal products, with no risk of cross-contamination.",
      "Will not be changed in ingredients, source or Halal status without informing you in writing before supply.",
      "Are covered by records and certificates that we will make available on request, and our premises may be audited for Halal compliance.",
    ],
    certTitle: "Company Halal Certificate",
    certYes: "Our company holds a valid Halal certificate — a copy is attached to this declaration.",
    certNo: "Certificate no.",
    certBody: "Issuing / certification body",
    certAccr: "Accreditation (e.g. MoIAT / EIAC)",
    certExp: "Expiry date",
    certNone: "Our company does not currently hold a Halal certificate. Reason / remarks:",
    sign: "Authorised Signatory",
    sName: "Name",
    sPos: "Position",
    sSig: "Signature",
    sDate: "Date",
    stamp: "Company stamp",
    returnNote: (buyer) =>
      `Please sign and stamp this declaration and return it to ${buyer} together with a copy of your Halal certificate (if available). It will be attached to your supplier evaluation.`,
    popup: "Could not open print window — please allow pop-ups.",
  },
  ar: {
    title: "إقرار حلال",
    sub: "تعهّد المورد بمطابقة متطلبات الحلال",
    to: "إلى",
    ref: "المرجع",
    date: "التاريخ",
    supplier: "بيانات المورد",
    company: "اسم الشركة",
    address: "العنوان",
    license: "رقم الرخصة التجارية",
    contact: "مسؤول التواصل",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    products: "المنتجات المشمولة بهذا الإقرار",
    pName: "اسم المنتج",
    pBrand: "العلامة التجارية / المنشأ",
    pCert: "رقم شهادة الحلال (إن كانت خاصة بالمنتج)",
    intro: (buyer) => `نقرّ نحن الموقّعين أدناه لشركة ${buyer} بأن جميع المنتجات المذكورة أعلاه والمورَّدة إليكم:`,
    points: [
      "حلال ومطابقة لأحكام الشريعة الإسلامية ولمواصفات الحلال المعتمدة في دولة الإمارات (UAE.S 2055-1 / OIC/SMIIC 1).",
      "لا تحتوي على لحم الخنزير أو أيٍّ من مشتقاته، ولا على الدم، ولا على الكحول (الإيثانول) كمكوّن مضاف، ولا على أي مكوّن أو مادة مضافة أو مساعد تصنيع من مصدر غير حلال.",
      "إن احتوت على لحوم أو دواجن فهي من حيوانات مذبوحة وفق الشريعة الإسلامية في منشآت معتمدة للحلال.",
      "تُنتَج وتُعبّأ وتُخزَّن وتُنقل بشكل منفصل عن المنتجات غير الحلال دون أي خطر للتلوث المتبادل.",
      "لن يتم تغيير مكوّناتها أو مصدرها أو حالتها من حيث الحلال دون إبلاغكم كتابياً قبل التوريد.",
      "مدعومة بسجلات وشهادات نلتزم بتقديمها عند الطلب، ويحق لكم تدقيق منشآتنا للتحقق من مطابقة الحلال.",
    ],
    certTitle: "شهادة الحلال للشركة",
    certYes: "لدى شركتنا شهادة حلال سارية — مرفق نسخة منها مع هذا الإقرار.",
    certNo: "رقم الشهادة",
    certBody: "الجهة المانحة للشهادة",
    certAccr: "الاعتماد (مثل وزارة الصناعة MoIAT / EIAC)",
    certExp: "تاريخ الانتهاء",
    certNone: "لا تملك شركتنا حالياً شهادة حلال. السبب / الملاحظات:",
    sign: "المفوَّض بالتوقيع",
    sName: "الاسم",
    sPos: "المنصب",
    sSig: "التوقيع",
    sDate: "التاريخ",
    stamp: "ختم الشركة",
    returnNote: (buyer) =>
      `يرجى توقيع هذا الإقرار وختمه وإعادته إلى ${buyer} مع نسخة من شهادة الحلال لشركتكم (إن وُجدت)، وسيتم إرفاقه بتقييم المورد الخاص بكم.`,
    popup: "فشل فتح النافذة — يرجى السماح بالنوافذ المنبثقة",
  },
};

/**
 * Opens a print window with the declaration pre-filled from the evaluation.
 * @returns {boolean} false when the pop-up was blocked
 */
export function printHalalDeclaration({ lang = "en", buyer, fields = {}, products = [], refNo = "" }) {
  const L = TXT[lang] || TXT.en;
  const rtl = lang === "ar";
  const buyerName = buyer || (rtl ? "شركتنا" : "our company");
  const today = new Date().toLocaleDateString(rtl ? "ar-AE" : "en-GB");

  const prodNames = (Array.isArray(products) ? products : [])
    .map((p) => (typeof p === "string" ? p : p?.name))
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const rows = [...prodNames];
  while (rows.length < 6) rows.push("");

  const line = (label, value) =>
    `<div class="kv"><span class="k">${esc(label)}:</span><span class="v">${esc(value || "")}</span></div>`;

  const html = `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${esc(L.title)} — ${esc(fields.company_name || "")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; font-size: 12.5px; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0f766e; padding-bottom: 8px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: ${rtl ? "0" : "1px"}; color: #0f766e; }
  .sub { color: #475569; font-weight: 600; margin-top: 2px; }
  .meta { text-align: ${rtl ? "left" : "right"}; line-height: 1.7; }
  h2 { font-size: 13.5px; margin: 14px 0 6px; padding: 4px 8px; background: #f0fdfa; border-${rtl ? "right" : "left"}: 4px solid #0f766e; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .kv { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px dotted #94a3b8; min-height: 22px; }
  .k { color: #475569; white-space: nowrap; }
  .v { font-weight: 700; flex: 1; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: ${rtl ? "right" : "left"}; height: 24px; }
  th { background: #f1f5f9; font-size: 11.5px; }
  ol { margin: 6px 0 0; padding-${rtl ? "right" : "left"}: 20px; line-height: 1.6; }
  .box { display: inline-block; width: 13px; height: 13px; border: 1.5px solid #0f172a; vertical-align: -2px; margin-${rtl ? "left" : "right"}: 6px; }
  .opt { margin: 6px 0; font-weight: 600; }
  .blank { display: inline-block; min-width: 160px; border-bottom: 1px solid #0f172a; }
  .certgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 6px 0 10px; padding-${rtl ? "right" : "left"}: 20px; }
  .sign { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-top: 6px; }
  .stamp { border: 1.5px dashed #64748b; border-radius: 10px; min-height: 120px; display: flex; align-items: flex-start; justify-content: center; padding-top: 6px; color: #64748b; font-weight: 600; }
  .note { margin-top: 14px; padding: 8px 10px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; font-size: 11.5px; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${esc(L.title)}</h1>
      <div class="sub">${esc(L.sub)}</div>
    </div>
    <div class="meta">
      <div>${esc(L.to)}: <b>${esc(buyerName)}</b></div>
      ${refNo ? `<div>${esc(L.ref)}: <b>${esc(refNo)}</b></div>` : ""}
      <div>${esc(L.date)}: <b>${esc(today)}</b></div>
    </div>
  </div>

  <h2>${esc(L.supplier)}</h2>
  <div class="grid">
    ${line(L.company, fields.company_name)}
    ${line(L.license, fields.trade_license_no || fields.trade_license)}
    ${line(L.address, fields.company_address)}
    ${line(L.contact, fields.tqm_contact_name)}
    ${line(L.phone, fields.tqm_telephone)}
    ${line(L.email, fields.supplier_email)}
  </div>

  <h2>${esc(L.products)}</h2>
  <table>
    <thead><tr><th style="width:34px">#</th><th>${esc(L.pName)}</th><th style="width:28%">${esc(L.pBrand)}</th><th style="width:28%">${esc(L.pCert)}</th></tr></thead>
    <tbody>
      ${rows.map((n, i) => `<tr><td>${i + 1}</td><td>${esc(n)}</td><td></td><td></td></tr>`).join("")}
    </tbody>
  </table>

  <h2>${esc(L.title)}</h2>
  <div>${esc(L.intro(buyerName))}</div>
  <ol>${L.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>

  <h2>${esc(L.certTitle)}</h2>
  <div class="opt"><span class="box"></span>${esc(L.certYes)}</div>
  <div class="certgrid">
    <div>${esc(L.certNo)}: <span class="blank"></span></div>
    <div>${esc(L.certBody)}: <span class="blank"></span></div>
    <div>${esc(L.certAccr)}: <span class="blank"></span></div>
    <div>${esc(L.certExp)}: <span class="blank"></span></div>
  </div>
  <div class="opt"><span class="box"></span>${esc(L.certNone)} <span class="blank" style="min-width:260px"></span></div>

  <h2>${esc(L.sign)}</h2>
  <div class="sign">
    <div>
      ${line(L.sName, "")}
      ${line(L.sPos, "")}
      <div class="kv" style="min-height:44px"><span class="k">${esc(L.sSig)}:</span><span class="v"></span></div>
      ${line(L.sDate, "")}
    </div>
    <div class="stamp">${esc(L.stamp)}</div>
  </div>

  <div class="note">${esc(L.returnNote(buyerName))}</div>

  <script>
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=900");
  if (!win) {
    alert(L.popup);
    return false;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
