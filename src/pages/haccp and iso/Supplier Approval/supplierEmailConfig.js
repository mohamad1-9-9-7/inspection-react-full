// src/pages/haccp and iso/Supplier Approval/supplierEmailConfig.js
//
// E-mail configs for the Sent-Links tracker, built on the shared EmailSendModal
// (same recipients book, templates, classification and /api/email-history audit
// trail the rest of the system uses).
//
// What is different here: the message is not a report going *out* to management,
// it is an invitation going out to an external supplier. So instead of one body
// there is a set of ready-made clichés (كليشيهات) — first invitation, reminder,
// final notice, expired link, thank-you, missing documents — and each one gets
// the subject, the opening text, the call-to-action and the PDF letter that fit
// that moment. The tracker picks the one that matches the row's status; the
// sender can still switch to any of the others.
//
// The "what you'll need" checklist is driven by the supplier type, because a
// packaging supplier and a pest-control contractor are asked for different
// paperwork by the questionnaire itself.

import { escapeHtml } from "../../shared/emailReportUtils";

/* ============================================================
   Supplier types + the paperwork each one is asked for
============================================================ */
export const SUPPLIER_TYPE_LABEL = {
  food: { en: "Food / Raw Materials", ar: "مواد غذائية / مواد خام" },
  cleaning_chemicals: { en: "Cleaning Materials / Chemicals", ar: "مواد تنظيف / كيماويات" },
  packaging: { en: "Packaging Materials", ar: "مواد تعبئة وتغليف" },
  services: { en: "Services (Pest Control / Calibration / Transport)", ar: "خدمات (مكافحة آفات / معايرة / نقل)" },
  other: { en: "Other / Equipment / Uniforms", ar: "أخرى / معدات / ملابس" },
};

const COMMON_DOCS = [
  { en: "Trade / Company licence (commercial registration)", ar: "الرخصة التجارية (السجل التجاري)" },
  { en: "Quality / food-safety certificates (ISO, HACCP, HALAL, BRC…)", ar: "شهادات الجودة وسلامة الغذاء (ISO، HACCP، حلال، BRC…)" },
];

const TYPE_DOCS = {
  food: [
    { en: "HACCP plan for every product supplied", ar: "خطة HACCP لكل منتج يتم توريده" },
    { en: "Staff hygiene / food-safety training certificates", ar: "شهادات تدريب الموظفين على النظافة وسلامة الغذاء" },
    { en: "Laboratory test reports (micro / chemical)", ar: "تقارير الفحص المخبري (ميكروبي / كيميائي)" },
    { en: "Product specifications and full allergen list", ar: "مواصفات المنتجات وقائمة مسببات الحساسية" },
    { en: "Vehicle registration / Dubai Municipality card, if you deliver yourself", ar: "رخصة المركبة / بطاقة بلدية دبي إذا كان التوصيل بمركباتكم" },
  ],
  cleaning_chemicals: [
    { en: "Safety Data Sheets (SDS / MSDS) for every product", ar: "صحائف بيانات السلامة (SDS/MSDS) لكل منتج" },
    { en: "A sample Certificate of Analysis (COA)", ar: "نموذج شهادة تحليل (COA)" },
    { en: "Sample product labels (GHS pictograms visible)", ar: "نماذج ملصقات المنتجات (مع رموز GHS)" },
    { en: "Food-grade / food-contact suitability statement where applicable", ar: "إفادة الصلاحية للتلامس مع الغذاء عند الاقتضاء" },
  ],
  packaging: [
    { en: "Declaration of Compliance for food-contact materials", ar: "إقرار المطابقة لمواد التلامس مع الغذاء" },
    { en: "Migration test reports", ar: "تقارير اختبار الهجرة (Migration)" },
    { en: "Technical datasheet / specification of each material", ar: "البطاقة الفنية / مواصفات كل مادة" },
  ],
  services: [
    { en: "Municipal permit / professional registration for the service", ar: "تصريح البلدية / التسجيل المهني للخدمة" },
    { en: "Liability insurance certificate", ar: "شهادة تأمين المسؤولية" },
    { en: "Technician training / competency certificates", ar: "شهادات تدريب وكفاءة الفنيين" },
    { en: "A sample service report or service certificate", ar: "نموذج تقرير خدمة أو شهادة خدمة" },
    { en: "SDS for any chemical used on our site", ar: "صحائف السلامة لأي مادة كيميائية تُستخدم في مواقعنا" },
  ],
  other: [
    { en: "Product specifications / technical datasheets", ar: "مواصفات المنتجات / البطاقات الفنية" },
  ],
};

export function docsFor(type) {
  return [...COMMON_DOCS, ...(TYPE_DOCS[type] || TYPE_DOCS.other)];
}

/* ============================================================
   Reading one tracker row
============================================================ */
function toDMY(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function daysFromNow(v) {
  if (!v) return null;
  const t = new Date(v).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

/** Everything the subject, the body and the PDF read — resolved once so the
 *  three of them can never disagree about what the link says. */
export function linkMeta(payload) {
  const p = payload || {};
  const f = p.fields || {};
  const pub = p.public || {};
  const type = f.supplier_type || pub.supplierType || "other";
  const submitted = !!pub.submittedAt || (p.meta?.submitted === true && !pub.disabled);
  const expiresAt = pub.expiresAt || "";
  const daysLeft = daysFromNow(expiresAt);

  return {
    company: String(f.company_name || "").trim(),
    email: String(f.supplier_email || "").trim(),
    type,
    typeLabel: SUPPLIER_TYPE_LABEL[type] || SUPPLIER_TYPE_LABEL.other,
    token: String(pub.token || ""),
    url: String(pub.url || ""),
    sentAt: pub.sentAt || pub.createdAt || "",
    openedAt: pub.openedAt || "",
    submittedAt: pub.submittedAt || "",
    expiresAt,
    daysLeft,
    submitted,
    disabled: !!pub.disabled,
    expired: !!expiresAt && daysLeft !== null && daysLeft < 0,
    /* Whether the URL still opens. Every call-to-action is gated on this, so a
       cliché chosen by hand can never send a supplier to a dead link. */
    alive: !!pub.url && !pub.disabled && !(!!expiresAt && daysLeft !== null && daysLeft < 0),
    docs: docsFor(type),
  };
}

/* ============================================================
   The clichés — one per moment in the link's life
============================================================ */
const ORG_EN = "Al Mawashi — Trans Emirates Livestock Trading LLC";
const ORG_AR = "المواشي — ترانس إمارات لتجارة المواشي";
const TEAM_EN = "Quality Assurance & Food Safety Department";
const TEAM_AR = "إدارة ضمان الجودة وسلامة الغذاء";

/**
 * Each cliché carries its own subject, opening text (EN + AR), accent colour
 * and whether the call-to-action button still makes sense — a thank-you note
 * or an expired-link notice must not push the supplier at a dead URL.
 */
export const CLICHES = {
  invite: {
    id: "invite",
    icon: "🆕",
    name: { en: "First invitation", ar: "دعوة أولى" },
    hint: { en: "Brand-new supplier — explain who we are and what we need.", ar: "مورد جديد — تعريف بنا وبالمطلوب منه." },
    accent: "#0891b2",
    showCta: true,
    subject: (m) => `Supplier Self-Assessment Questionnaire — ${m.company || "your company"}`,
    headline: { en: "Supplier Self-Assessment Questionnaire", ar: "استبيان التقييم الذاتي للموردين" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "As part of our approved-supplier programme under our HACCP / ISO 22000 food safety system, " +
        "we kindly ask you to complete the supplier self-assessment questionnaire linked below. " +
        "It takes about 15 minutes and can be saved and continued later.\n\n" +
        "Completing it is a requirement for being listed — and staying listed — as an approved supplier of {org}.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "ضمن برنامج اعتماد الموردين المطبّق لدينا وفق نظام سلامة الغذاء HACCP / ISO 22000، " +
        "نرجو منكم تعبئة استبيان التقييم الذاتي للموردين عبر الرابط أدناه. " +
        "تستغرق التعبئة حوالي ١٥ دقيقة ويمكن حفظها ومتابعتها لاحقاً.\n\n" +
        "تعبئة الاستبيان شرط لإدراجكم — والاستمرار — ضمن قائمة الموردين المعتمدين لدى {org}.",
    },
  },

  reminder: {
    id: "reminder",
    icon: "🔔",
    name: { en: "Friendly reminder", ar: "تذكير ودّي" },
    hint: { en: "The link was sent a while ago and nothing came back yet.", ar: "مضى وقت على الإرسال ولم يصل رد بعد." },
    accent: "#d97706",
    showCta: true,
    subject: (m) => `Reminder — Supplier Self-Assessment pending · ${m.company || ""}`.trim(),
    headline: { en: "Reminder — your questionnaire is still open", ar: "تذكير — الاستبيان ما زال بانتظار تعبئتكم" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "We are following up on the supplier self-assessment questionnaire we sent you on {sentAt}. " +
        "We have not received your submission yet, and your link is still active.\n\n" +
        "If you have already started, simply reopen the link and continue where you stopped. " +
        "If anything in the form is unclear, reply to this e-mail and we will help.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "نتابع معكم استبيان التقييم الذاتي المرسل بتاريخ {sentAt}. " +
        "لم يصلنا ردّكم حتى الآن، والرابط ما زال فعّالاً.\n\n" +
        "إذا كنتم قد بدأتم التعبئة، يكفي فتح الرابط والمتابعة من حيث توقفتم. " +
        "وإن كان هناك أي استفسار حول النموذج، يُرجى الرد على هذه الرسالة وسنساعدكم.",
    },
  },

  final: {
    id: "final",
    icon: "⏰",
    name: { en: "Final notice (link expiring)", ar: "تنبيه أخير (الرابط يوشك أن ينتهي)" },
    hint: { en: "Few days left before the link closes.", ar: "أيام قليلة قبل إغلاق الرابط." },
    accent: "#dc2626",
    showCta: true,
    subject: (m) =>
      `Final notice — Supplier Self-Assessment closes ${toDMY(m.expiresAt) || "soon"} · ${m.company || ""}`.trim(),
    headline: { en: "Final notice — the questionnaire closes soon", ar: "تنبيه أخير — الاستبيان يُغلق قريباً" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "This is a final reminder: your supplier self-assessment link closes on {expiresAt} ({daysLeft}). " +
        "After that date the link stops working and the questionnaire has to be re-issued.\n\n" +
        "Please complete and submit it before the deadline so your approved-supplier status is not affected.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "هذا تذكير أخير: ينتهي رابط التقييم الذاتي الخاص بكم بتاريخ {expiresAt} ({daysLeft}). " +
        "بعد هذا التاريخ يتوقف الرابط عن العمل ويلزم إصدار استبيان جديد.\n\n" +
        "نرجو إتمام التعبئة والإرسال قبل الموعد النهائي حتى لا يتأثر وضعكم كمورد معتمد.",
    },
  },

  expired: {
    id: "expired",
    icon: "🔁",
    name: { en: "Link expired — new one on request", ar: "الرابط منتهي — إصدار رابط جديد" },
    hint: { en: "The deadline passed with no submission.", ar: "انتهى الموعد دون استلام رد." },
    accent: "#7c3aed",
    showCta: false,
    subject: (m) => `Supplier Self-Assessment link expired · ${m.company || ""}`.trim(),
    headline: { en: "Your questionnaire link has expired", ar: "انتهت صلاحية رابط الاستبيان" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "The supplier self-assessment link issued to you on {sentAt} expired on {expiresAt} without a submission, " +
        "so it is no longer accessible.\n\n" +
        "If you still wish to be evaluated as an approved supplier of {org}, reply to this e-mail and we will " +
        "issue a fresh link for you the same day.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "انتهت صلاحية رابط التقييم الذاتي الصادر لكم بتاريخ {sentAt} في {expiresAt} دون استلام أي رد، " +
        "وبالتالي لم يعد الرابط قابلاً للفتح.\n\n" +
        "إذا كنتم لا تزالون ترغبون بالتقييم كمورد معتمد لدى {org}، يُرجى الرد على هذه الرسالة " +
        "وسنصدر لكم رابطاً جديداً في نفس اليوم.",
    },
  },

  thanks: {
    id: "thanks",
    icon: "✅",
    name: { en: "Thank you — submission received", ar: "شكر — تم استلام التقييم" },
    hint: { en: "The supplier submitted; acknowledge and say what happens next.", ar: "المورد أرسل التقييم؛ إشعار بالاستلام والخطوة التالية." },
    accent: "#059669",
    showCta: false,
    subject: (m) => `Thank you — Supplier Self-Assessment received · ${m.company || ""}`.trim(),
    headline: { en: "We have received your self-assessment", ar: "تم استلام التقييم الذاتي الخاص بكم" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "Thank you — your supplier self-assessment was received on {submittedAt} and is now with our " +
        "Quality Assurance team for review.\n\n" +
        "We will contact you only if a clarification or a missing document is needed. " +
        "Once the review is complete you will be informed of your approval status.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "شكراً لكم — تم استلام التقييم الذاتي بتاريخ {submittedAt} وهو الآن قيد المراجعة " +
        "لدى فريق ضمان الجودة.\n\n" +
        "سنتواصل معكم فقط في حال الحاجة إلى توضيح أو مستند ناقص، " +
        "وسيتم إعلامكم بحالة الاعتماد فور انتهاء المراجعة.",
    },
  },

  docs: {
    id: "docs",
    icon: "📎",
    name: { en: "Missing documents", ar: "مستندات ناقصة" },
    hint: { en: "The form came back incomplete — ask for the paperwork.", ar: "وصل النموذج ناقص المرفقات — طلب المستندات." },
    accent: "#0f766e",
    showCta: true,
    subject: (m) => `Documents required to complete your evaluation · ${m.company || ""}`.trim(),
    headline: { en: "Documents needed to finish your evaluation", ar: "مستندات مطلوبة لاستكمال تقييمكم" },
    intro: {
      en:
        "Dear {company} team,\n\n" +
        "Thank you for completing the self-assessment questionnaire. Before we can finalise your evaluation " +
        "we still need the supporting documents listed below.\n\n" +
        "Please attach them as a reply to this e-mail, or upload them through your questionnaire link, " +
        "which is still open.",
      ar:
        "السادة {company} المحترمين،\n\n" +
        "شكراً لتعبئتكم استبيان التقييم الذاتي. لاستكمال التقييم ما زلنا بحاجة إلى المستندات المساندة " +
        "المذكورة أدناه.\n\n" +
        "يُرجى إرفاقها بالرد على هذه الرسالة، أو رفعها عبر رابط الاستبيان الخاص بكم وهو ما زال مفتوحاً.",
    },
  },
};

export const CLICHE_LIST = [
  CLICHES.invite,
  CLICHES.reminder,
  CLICHES.final,
  CLICHES.expired,
  CLICHES.thanks,
  CLICHES.docs,
];

/** Which cliché fits this row right now. The sender can override it. */
export function suggestCliche(payload) {
  const m = linkMeta(payload);
  if (m.submitted) return "thanks";
  /* A revoked link is as dead as an expired one from the supplier's side. */
  if (m.disabled || m.expired) return "expired";
  if (m.daysLeft !== null && m.daysLeft <= 7) return "final";
  const sentDays = m.sentAt ? Math.floor((Date.now() - new Date(m.sentAt).getTime()) / 86400000) : 0;
  if (m.openedAt || sentDays >= 3) return "reminder";
  return "invite";
}

/* Fill {company}/{sentAt}/… in a cliché's opening text. */
function fillIntro(text, m, lang) {
  const daysLeftTxt =
    m.daysLeft === null
      ? ""
      : m.daysLeft < 0
      ? lang === "ar" ? `منتهٍ منذ ${Math.abs(m.daysLeft)} يوم` : `${Math.abs(m.daysLeft)} days ago`
      : m.daysLeft === 0
      ? lang === "ar" ? "ينتهي اليوم" : "today"
      : lang === "ar" ? `${m.daysLeft} يوم متبقٍ` : `${m.daysLeft} days left`;

  const vars = {
    "{company}": m.company || (lang === "ar" ? "المورد" : "Supplier"),
    "{org}": lang === "ar" ? ORG_AR : ORG_EN,
    "{sentAt}": toDMY(m.sentAt) || "—",
    "{expiresAt}": toDMY(m.expiresAt) || "—",
    "{submittedAt}": toDMY(m.submittedAt) || "—",
    "{daysLeft}": daysLeftTxt,
    "{type}": lang === "ar" ? m.typeLabel.ar : m.typeLabel.en,
  };
  return Object.entries(vars).reduce((s, [k, v]) => s.split(k).join(v), text);
}

/* ============================================================
   QR code — rendered offscreen so the PDF can carry it as an image
============================================================ */
async function qrDataUrl(text, size = 190) {
  if (!text) return "";
  try {
    const [React, { createRoot }, qr] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("qrcode.react"),
    ]);
    const QRCodeCanvas = qr.QRCodeCanvas || qr.default?.QRCodeCanvas;
    if (!QRCodeCanvas) return "";

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden";
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(
      React.createElement(QRCodeCanvas, { value: text, size, level: "M", marginSize: 2 })
    );
    /* Two frames is enough for the canvas to have painted. */
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = host.querySelector("canvas");
    const url = canvas ? canvas.toDataURL("image/png") : "";
    root.unmount();
    host.remove();
    return url;
  } catch {
    /* A letter without a QR is still a valid letter. */
    return "";
  }
}

/* ============================================================
   PDF — a one-page invitation letter, not a report
============================================================ */
export async function generateSupplierLetter(payload, clicheId) {
  const m = linkMeta(payload);
  const cl = CLICHES[clicheId] || CLICHES.invite;

  const [jspdfMod, autoTableMod, qr] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    cl.showCta && m.alive ? qrDataUrl(m.url) : Promise.resolve(""),
  ]);
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const autoTable = autoTableMod.autoTable || autoTableMod.default;

  const pdf = new JsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 40;

  /* Header band */
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 66, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold").setFontSize(15);
  pdf.text(cl.headline.en.toUpperCase(), M, 29);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  pdf.text(`${ORG_EN}  ·  ${TEAM_EN}`, M, 47);
  pdf.setTextColor(15, 23, 42);

  let y = 84;

  /* Opening letter text */
  const body = fillIntro(cl.intro.en, m, "en");
  pdf.setFont("helvetica", "normal").setFontSize(10);
  const lines = pdf.splitTextToSize(body, W - M * 2);
  pdf.text(lines, M, y);
  y += lines.length * 13 + 12;

  const kv = (label, value) => [label, String(value || "—")];
  const section = (title, rows, colWidth = 135) => {
    autoTable(pdf, {
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows,
      theme: "grid",
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", lineColor: [226, 232, 240] },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9.5 },
      columnStyles: { 0: { cellWidth: colWidth, fontStyle: "bold", fillColor: [248, 250, 252] } },
    });
    y = pdf.lastAutoTable.finalY + 12;
  };

  section("SUPPLIER", [
    kv("Company", m.company),
    kv("Supplier category", m.typeLabel.en),
    kv("Contact e-mail", m.email),
    kv("Reference", m.token ? m.token.slice(0, 16) : ""),
    kv("Issued on", toDMY(m.sentAt)),
    kv("Valid until", m.expiresAt ? toDMY(m.expiresAt) : "No expiry"),
  ]);

  /* Only a live link deserves steps, a URL and a QR. */
  if (cl.showCta && m.alive) {
    section("HOW TO COMPLETE IT", [
      kv("1", "Open the link below (or scan the QR code) on a computer or phone."),
      kv("2", "Fill in every section; answers are saved as you go."),
      kv("3", "Attach the supporting documents listed on this page."),
      kv("4", "Press Submit. You will see a confirmation on screen."),
    ], 26);

    autoTable(pdf, {
      startY: y,
      body: [[{ content: m.url, styles: { textColor: [8, 145, 178], fontStyle: "bold", fontSize: 9 } }]],
      theme: "grid",
      margin: { left: M, right: M + 120 },
      styles: { cellPadding: 8, overflow: "linebreak", lineColor: [186, 230, 253], fillColor: [240, 249, 255] },
    });
    const linkBottom = pdf.lastAutoTable.finalY;
    if (qr) {
      pdf.addImage(qr, "PNG", W - M - 104, y, 104, 104);
      y = Math.max(linkBottom, y + 104) + 14;
    } else {
      y = linkBottom + 12;
    }
  }

  section(
    "DOCUMENTS TO PREPARE",
    m.docs.map((d, i) => kv(String(i + 1), d.en)),
    26
  );

  /* Footer */
  pdf.setFontSize(8).setTextColor(120, 130, 145);
  pdf.text(
    `${TEAM_EN} — ${ORG_EN}   ·   Electronically issued; no signature required`,
    W / 2,
    H - 22,
    { align: "center" }
  );

  const blob = pdf.output("blob");
  const base64 = pdf.output("datauristring").split(",")[1];
  const safe = (m.company || "supplier").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 40);
  return { blob, base64, filename: `Supplier_Assessment_${safe}_${cl.id}.pdf` };
}

/* ============================================================
   Message bodies
============================================================ */
const A = (s) => escapeHtml(String(s || ""));

function paraHtml(text) {
  return A(text).replace(/\n{2,}/g, "</p><p style='margin:0 0 12px'>").replace(/\n/g, "<br/>");
}

function docsListHtml(m, lang) {
  const items = m.docs
    .map(
      (d) =>
        `<li style="margin:0 0 5px">${A(lang === "ar" ? d.ar : d.en)}</li>`
    )
    .join("");
  return `<ul style="margin:6px 0 0;padding-inline-start:20px;font-size:13px">${items}</ul>`;
}

function ctaHtml(m, cl, lang) {
  if (!cl.showCta || !m.alive) return "";
  const label = lang === "ar" ? "فتح الاستبيان" : "Open the questionnaire";
  return `
  <div style="text-align:center;margin:18px 0 6px">
    <a href="${A(m.url)}" style="display:inline-block;background:${cl.accent};color:#fff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:800;font-size:15px">${A(label)}</a>
    <div style="margin-top:8px;font-size:11px;color:#64748b;word-break:break-all">${A(m.url)}</div>
  </div>`;
}

function deadlineHtml(m, lang) {
  if (!m.expiresAt) return "";
  const late = m.daysLeft !== null && m.daysLeft < 0;
  const soon = m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 7;
  const bg = late ? "#fef2f2" : soon ? "#fffbeb" : "#f0f9ff";
  const bd = late ? "#fca5a5" : soon ? "#fcd34d" : "#bae6fd";
  const fg = late ? "#991b1b" : soon ? "#92400e" : "#0c4a6e";
  const txt =
    lang === "ar"
      ? late
        ? `انتهت صلاحية الرابط بتاريخ ${toDMY(m.expiresAt)}`
        : `آخر موعد للتعبئة: ${toDMY(m.expiresAt)}${m.daysLeft !== null ? ` (${m.daysLeft} يوم متبقٍ)` : ""}`
      : late
      ? `The link expired on ${toDMY(m.expiresAt)}`
      : `Deadline: ${toDMY(m.expiresAt)}${m.daysLeft !== null ? ` (${m.daysLeft} days left)` : ""}`;
  return `<div style="background:${bg};border:1px solid ${bd};color:${fg};padding:9px 14px;border-radius:9px;font-size:13px;font-weight:700;margin:14px 0">⏳ ${A(txt)}</div>`;
}

/** One language block — used twice, English then Arabic. */
function blockHtml(m, cl, lang, { note, showDocs, introOverride }) {
  const rtl = lang === "ar";
  /* The composer's opening box edits the English greeting; the Arabic block
     keeps the cliché's own wording so the two never drift apart. */
  const intro = (lang === "en" && introOverride) || fillIntro(cl.intro[lang], m, lang);
  const docsTitle = rtl ? "المستندات المطلوبة" : "Documents to prepare";
  const noteTitle = rtl ? "ملاحظة" : "Note";
  const sign = rtl ? `${TEAM_AR}<br/>${ORG_AR}` : `${TEAM_EN}<br/>${ORG_EN}`;

  return `
  <div dir="${rtl ? "rtl" : "ltr"}" style="text-align:${rtl ? "right" : "left"};padding:${rtl ? "18px 20px 4px" : "18px 20px 0"};${rtl ? "border-top:1px dashed #cbd5e1;margin-top:6px" : ""}">
    <div style="font-size:16px;font-weight:800;color:#0f172a;margin:0 0 10px">${A(cl.headline[lang])}</div>
    <p style="margin:0 0 12px">${paraHtml(intro)}</p>
    ${ctaHtml(m, cl, lang)}
    ${deadlineHtml(m, lang)}
    ${showDocs ? `<div style="margin-top:12px"><div style="font-weight:800;font-size:13.5px;color:#0f172a">📎 ${A(docsTitle)}</div>${docsListHtml(m, lang)}</div>` : ""}
    ${note ? `<p style="margin:14px 0 0;white-space:pre-wrap"><b>${A(noteTitle)}:</b> ${A(note)}</p>` : ""}
    <p style="margin:16px 0 0;font-size:13px;color:#334155">${sign}</p>
  </div>`;
}

function buildHtmlBody(payload, clicheId, { note, attachmentsCount, intro } = {}) {
  const m = linkMeta(payload);
  const cl = CLICHES[clicheId] || CLICHES.invite;
  /* A thank-you note does not need a shopping list of paperwork. */
  const showDocs = cl.id !== "thanks" && cl.id !== "expired";

  return `
<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.65;max-width:760px;margin:auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
  <div style="background:${cl.accent};color:#fff;padding:16px 20px">
    <div style="font-size:17px;font-weight:800">${cl.icon} ${A(cl.headline.en)}</div>
    <div style="opacity:.85;font-size:12.5px;margin-top:4px">${A(m.company || "Supplier")} · ${A(m.typeLabel.en)}${m.token ? ` · Ref ${A(m.token.slice(0, 10))}` : ""}</div>
  </div>
  ${blockHtml(m, cl, "en", { note, showDocs, introOverride: intro })}
  ${blockHtml(m, cl, "ar", { note, showDocs })}
  <div style="padding:12px 20px 16px;color:#94a3b8;font-size:11px;border-top:1px solid #eef2f7">
    ${attachmentsCount ? `📎 ${attachmentsCount} attachment(s) — ${A(cl.showCta ? "invitation letter (PDF)" : "letter (PDF)")}.<br/>` : ""}
    Electronically issued; no signature required — صادر إلكترونياً؛ لا حاجة للتوقيع
  </div>
</div>`.trim();
}

function buildTextBody(payload, clicheId, { note, pdfUrl, intro } = {}) {
  const m = linkMeta(payload);
  const cl = CLICHES[clicheId] || CLICHES.invite;
  const showDocs = cl.id !== "thanks" && cl.id !== "expired";

  const out = [
    cl.headline.en.toUpperCase(),
    "",
    intro || fillIntro(cl.intro.en, m, "en"),
  ];
  if (cl.showCta && m.alive) out.push("", `Link: ${m.url}`);
  if (m.expiresAt) out.push("", `Deadline: ${toDMY(m.expiresAt)}`);
  if (showDocs) {
    out.push("", "Documents to prepare:");
    m.docs.forEach((d, i) => out.push(`  ${i + 1}. ${d.en}`));
  }
  out.push("", "— — —", "", fillIntro(cl.intro.ar, m, "ar"));
  if (cl.showCta && m.alive) out.push("", `الرابط: ${m.url}`);
  if (note) out.push("", `Note / ملاحظة: ${note}`);
  if (pdfUrl) out.push("", `PDF: ${pdfUrl}`);
  out.push("", `${TEAM_EN} — ${ORG_EN}`);
  return out.join("\n");
}

/* ============================================================
   Config factory — one per (row, cliché)
============================================================ */
export const SUPPLIER_EMAIL_TYPE = "supplier_self_assessment_form";

/**
 * @param clicheId  which cliché to compose with
 * @param onSent    called after a successful send, so the tracker can stamp the
 *                  record's activity log with who was mailed and when
 */
export function makeSupplierEmailConfig(clicheId, onSent) {
  const cl = CLICHES[clicheId] || CLICHES.invite;

  return {
    reportTitle: `${cl.icon} ${cl.name.en}`,
    reportType: SUPPLIER_EMAIL_TYPE,
    allowServerSend: true,
    clicheId: cl.id,

    /* Keys the per-record send history — the token identifies this exact link. */
    getReportRef: (payload) => linkMeta(payload).token || null,
    /* Pre-fills "To" with the supplier's own address. */
    getDefaultTo: (payload) => {
      const e = linkMeta(payload).email;
      return e ? [e] : [];
    },
    getDefaultIntro: (payload) => fillIntro(cl.intro.en, linkMeta(payload), "en"),
    getSubject: (payload) => cl.subject(linkMeta(payload)),

    generatePdf: (payload) => generateSupplierLetter(payload, cl.id),
    buildHtml: (payload, opts = {}) => buildHtmlBody(payload, cl.id, opts),
    buildText: (payload, opts = {}) => buildTextBody(payload, cl.id, opts),
    getImages: () => [],

    getSummary: (payload) => {
      const m = linkMeta(payload);
      const status = m.submitted
        ? "SUBMITTED"
        : m.disabled
        ? "REVOKED"
        : m.expired
        ? "EXPIRED"
        : "PENDING";
      return {
        status,
        statusKind: m.submitted ? "ok" : m.disabled || m.expired ? "bad" : "warn",
        fields: [
          { label: "Cliché", value: `${cl.icon} ${cl.name.en}` },
          { label: "Supplier", value: m.company || "—" },
          { label: "Category", value: m.typeLabel.en },
          { label: "E-mail", value: m.email || "—" },
          { label: "Sent", value: toDMY(m.sentAt) || "—" },
          { label: "Deadline", value: m.expiresAt ? toDMY(m.expiresAt) : "No expiry" },
          { label: "Documents listed", value: `${m.docs.length}` },
        ],
      };
    },

    onSent,
  };
}

export default makeSupplierEmailConfig;
