// Approved Supplier List (ASL) — the register an auditor asks for first.
// One landscape A4 sheet per ~25 suppliers, under the same document-control
// header as the Halal declaration form, printed through printHtmlDocument.
//
// Status rule (printed under the table so the sheet explains itself):
//   Approved     — compliance ≥ 80%, signed declaration on file, Halal on
//                  file when required, evaluation not overdue;
//   Conditional  — compliance ≥ 60% but something above is missing/overdue;
//   Not approved — compliance below 60%, or never answered.
import { printHtmlDocument } from "./halalDeclaration";

export const ASL_DOC = { docNo: "FS-QM/REC/ASL", issueDate: "01/11/2026", revision: "00" };

export function aslStatus({ pct, declSigned, halalOk, overdue }) {
  if (pct == null || pct < 60) return "rejected";
  if (pct >= 80 && declSigned && halalOk && !overdue) return "approved";
  return "conditional";
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TXT = {
  en: {
    title: "APPROVED SUPPLIER LIST",
    docTitle: "Document Title",
    docTitleV: "Approved Supplier List",
    docNo: "Document No",
    issueDate: "Issue Date",
    revision: "Revision No",
    owned: "Owned by",
    ownedV: "QA",
    authorised: "Authorised by",
    authorisedV: "Director",
    printed: "Printed on",
    cols: ["#", "Supplier", "Category", "Risk", "Compliance", "Declaration", "Halal", "Evaluated", "Next evaluation", "Deliveries (12 m)", "Status"],
    status: { approved: "Approved", conditional: "Conditional", rejected: "Not approved" },
    totals: (a, c, r) => `Approved: ${a} · Conditional: ${c} · Not approved: ${r}`,
    rule:
      "Approved = compliance ≥ 80%, signed declaration on file, Halal documents on file where required and evaluation not overdue. " +
      "Conditional = compliance ≥ 60% with one of these missing or overdue. Not approved = compliance below 60%. " +
      "Re-evaluation every 6 / 12 / 24 months for high / medium / low risk.",
    prepared: "Prepared by (QA)",
    approvedBy: "Approved by",
    sig: "Signature / Date",
  },
  ar: {
    title: "قائمة الموردين المعتمدين",
    docTitle: "عنوان الوثيقة",
    docTitleV: "قائمة الموردين المعتمدين",
    docNo: "رقم الوثيقة",
    issueDate: "تاريخ الإصدار",
    revision: "رقم المراجعة",
    owned: "المالك",
    ownedV: "ضبط الجودة",
    authorised: "المعتمِد",
    authorisedV: "المدير",
    printed: "تاريخ الطباعة",
    cols: ["#", "المورد", "الفئة", "الخطر", "المطابقة", "الإقرار", "الحلال", "تاريخ التقييم", "التقييم القادم", "الاستلامات (12 شهر)", "الحالة"],
    status: { approved: "معتمد", conditional: "معتمد بشروط", rejected: "غير معتمد" },
    totals: (a, c, r) => `معتمد: ${a} · بشروط: ${c} · غير معتمد: ${r}`,
    rule:
      "معتمد = مطابقة 80% فأكثر، إقرار موقّع مرفوع، مستندات الحلال مرفوعة حيث تلزم، والتقييم غير متأخر. " +
      "معتمد بشروط = مطابقة 60% فأكثر مع نقص أو تأخر في أحدها. غير معتمد = مطابقة أقل من 60%. " +
      "إعادة التقييم كل 6 / 12 / 24 شهراً للخطر العالي / المتوسط / المنخفض.",
    prepared: "أعدّه (ضبط الجودة)",
    approvedBy: "اعتمده",
    sig: "التوقيع / التاريخ",
  },
};

const STATUS_COLOR = {
  approved: ["#dcfce7", "#166534"],
  conditional: ["#fef3c7", "#92400e"],
  rejected: ["#fee2e2", "#991b1b"],
};

/**
 * rows: [{ name, category, risk, pct, decl, halal, evaluated, next, overdue, deliveries, status }]
 * (all display strings except pct/status/overdue)
 */
export function printApprovedSupplierList({ lang = "en", rows = [], buyer = "", logoUrl = "" }) {
  const L = TXT[lang] || TXT.en;
  const rtl = lang === "ar";
  const today = new Date().toLocaleDateString("en-GB");
  const count = (s) => rows.filter((r) => r.status === s).length;
  const dc = (label, value) => `<td><span class="k">${esc(label)}:</span> <b>${esc(value)}</b></td>`;

  const html = `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${esc(L.title)}</title>
<style>
  @page { size: A4 landscape; margin: 9mm 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; font-size: 10.5px; margin: 0; }
  .dc { width: 100%; border-collapse: collapse; font-size: 10px; }
  .dc td { border: 1px solid #64748b; padding: 3px 7px; }
  .dc .logo { width: 100px; text-align: center; padding: 3px; }
  .dc .logo img { height: 50px; width: auto; }
  .k { color: #475569; }
  .band { display: flex; justify-content: space-between; align-items: center; background: #0f766e; color: #fff; padding: 5px 10px; margin: 6px 0; }
  .band h1 { margin: 0; font-size: 16px; letter-spacing: ${rtl ? "0" : "1.2px"}; }
  table.l { width: 100%; border-collapse: collapse; }
  table.l th, table.l td { border: 1px solid #94a3b8; padding: 3px 5px; text-align: ${rtl ? "right" : "left"}; vertical-align: top; }
  table.l th { background: #f0fdfa; font-size: 9.5px; }
  table.l tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .st { font-weight: 700; border-radius: 4px; padding: 1px 5px; white-space: nowrap; }
  .late { color: #b91c1c; font-weight: 700; }
  .rule { margin-top: 6px; font-size: 9px; color: #475569; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 14px; }
  .sign div { border-top: 1px solid #0f172a; padding-top: 3px; }
</style>
</head>
<body>
  <table class="dc">
    <tr>
      <td class="logo" rowspan="3">${logoUrl ? `<img src="${esc(logoUrl)}" alt="" />` : `<b>${esc(buyer)}</b>`}</td>
      ${dc(L.docTitle, L.docTitleV)}${dc(L.docNo, ASL_DOC.docNo)}
    </tr>
    <tr>${dc(L.issueDate, ASL_DOC.issueDate)}${dc(L.revision, ASL_DOC.revision)}</tr>
    <tr>${dc(L.owned, L.ownedV)}${dc(L.authorised, L.authorisedV)}</tr>
  </table>
  <div class="band"><h1>${esc(L.title)}</h1><div>${esc(L.totals(count("approved"), count("conditional"), count("rejected")))} &nbsp;·&nbsp; ${esc(L.printed)}: <b>${esc(today)}</b></div></div>
  <table class="l">
    <thead><tr>${L.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map((r, i) => {
          const [bg, fg] = STATUS_COLOR[r.status] || STATUS_COLOR.conditional;
          return `<tr>
            <td>${i + 1}</td>
            <td><b>${esc(r.name)}</b></td>
            <td>${esc(r.category)}</td>
            <td>${esc(r.risk)}</td>
            <td>${r.pct == null ? "—" : r.pct + "%"}</td>
            <td>${esc(r.decl)}</td>
            <td>${esc(r.halal)}</td>
            <td>${esc(r.evaluated)}</td>
            <td class="${r.overdue ? "late" : ""}">${esc(r.next)}</td>
            <td>${esc(r.deliveries)}</td>
            <td><span class="st" style="background:${bg};color:${fg}">${esc(L.status[r.status] || r.status)}</span></td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  <div class="rule">${esc(L.rule)}</div>
  <div class="sign">
    <div>${esc(L.prepared)} — ${esc(L.sig)}</div>
    <div>${esc(L.approvedBy)} — ${esc(L.sig)}</div>
  </div>
</body>
</html>`;

  return printHtmlDocument(html, { title: `${L.title} ${today}` });
}
