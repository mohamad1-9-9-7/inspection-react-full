// src/pages/dashboard/dashboardSearch.js
// The dashboard's search: forgiving Arabic matching, and a "deep" index that
// finds a single report inside a branch ("POS 15 temperature", "حرارة 15")
// and opens it directly instead of stopping at the section card.
//
// The deep index is built from the report registry (utils/reportPerms.js) —
// the same list the permissions screen uses — so a report added there is
// searchable here, and a report the account may not open is never listed.
import { BRANCH_REPORTS, canReport } from "../../utils/reportPerms";
import { getPerms, branchAllowed } from "../../utils/perms";

/** Lower-case + fold the Arabic spellings people actually type:
    أ إ آ → ا · ة → ه · ى → ي · ؤ → و · ئ → ي · no diacritics / tatweel. */
export function normText(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every word of the query must appear somewhere in the haystack. */
export function matches(hay, query) {
  const q = normText(query);
  if (!q) return true;
  return q.split(" ").every((w) => hay.includes(w));
}

/* Where each branch's hubs live. Inputs open ?tab=, reports open ?rtab=. */
const BRANCH_ROUTES = {
  QCS: { input: "/monitor/qcs", view: "/admin/qcs" },
  "POS 6": { input: "/monitor/pos6", view: "/admin/pos6" },
  "POS 10": { input: "/monitor/pos10", view: "/admin/pos10" },
  "POS 11": { input: "/monitor/pos11", view: "/admin/pos11" },
  "POS 15": { input: "/monitor/pos15", view: "/admin/pos15" },
  "POS 19": { input: "/monitor/pos19", view: "/admin/pos19" },
  "POS 24": { input: "/monitor/pos24" },
  "POS 26": { input: "/monitor/pos26" },
  "FTR 1": { input: "/monitor/ftr1", view: "/admin/ftr1" },
  "FTR 2": { input: "/monitor/ftr2", view: "/admin/ftr2" },
  PRODUCTION: { input: "/monitor/production", view: "/admin/production" },
};

/* Arabic words for what the (English) report names say, so an Arabic search
   finds them. Key = a piece of the English label, lower-case. */
const AR_WORDS = [
  ["temperature", "حراره درجه"], ["cooler", "براد ثلاجه تبريد"], ["hygiene", "نظافه شخصيه"],
  ["clean", "نظافه تنظيف"], ["receiving", "استلام"], ["raw material", "مواد خام شحنه استلام"],
  ["traceability", "تتبع"], ["pest", "افات حشرات مكافحه"], ["sanitiz", "تعقيم معقم"],
  ["sanitation", "تعقيم خضار"], ["equipment", "معدات"], ["calibration", "معايره"],
  ["oil", "زيت"], ["cook", "طبخ طهي"], ["garbage", "نفايات قمامه"], ["waste", "نفايات هدر"],
  ["visitor", "زائر زوار"], ["non-conformance", "عدم مطابقه"], ["corrective", "اجراء تصحيحي"],
  ["audit", "تدقيق"], ["sickness", "مرض اصابه"], ["return to work", "عوده للعمل"],
  ["chicken", "دجاج"], ["meat", "لحم لحوم"], ["defrost", "تذويب اذابه"], ["cutting", "تقطيع"],
  ["rejection", "رفض"], ["warning", "انذار"], ["stock rotation", "تدوير مخزون"],
  ["certificates", "شهادات"], ["overview", "نظره عامه ملخص"], ["packaging", "تغليف"],
  ["ingredients", "مكونات"], ["glass", "زجاج"], ["wooden", "خشب"], ["reheating", "اعاده تسخين"],
  ["cooling", "تبريد"], ["hot holding", "حفظ ساخن"], ["freezer", "مجمد فريزر"],
  ["dry store", "مخزن جاف"], ["dried", "مجفف"], ["finished product", "منتج نهائي"],
  ["production", "انتاج"],
];

function arabicFor(labelLc) {
  return AR_WORDS.filter(([en]) => labelLc.includes(en)).map(([, ar]) => ar).join(" ");
}

/** Every report the current account may open, as search entries:
    { k, branch, label, mode: "input" | "view", route, hay } */
export function buildReportIndex() {
  const p = getPerms();
  const full = p.isAdmin || p.isFullAccess;
  const hasCard = (id) => full || p.permissions.includes(id);
  const out = [];
  // inputs live behind the Daily Monitor card, reports behind "View reports"
  const MODES = [["input", "daily", "tab", "ادخال تعبئه enter input"], ["view", "admin", "rtab", "عرض تقارير view reports"]];
  Object.entries(BRANCH_REPORTS).forEach(([branch, reports]) => {
    const routes = BRANCH_ROUTES[branch];
    if (!routes) return;
    MODES.forEach(([mode, section, param, modeWords]) => {
      if (!routes[mode] || !hasCard(section) || !branchAllowed(section, branch)) return;
      reports.forEach((rep) => {
        if (!rep[mode] || !canReport(branch, rep.id, mode)) return;
        const labelLc = rep.label.toLowerCase();
        out.push({
          k: `rep:${branch}:${rep.id}:${mode}`,
          branch,
          label: rep.label,
          mode,
          route: `${routes[mode]}?${param}=${encodeURIComponent(rep[mode])}`,
          // "pos 15" and "pos15" both match
          hay: normText(`${branch} ${branch.replace(/\s+/g, "")} ${rep.label} ${arabicFor(labelLc)} ${modeWords}`),
        });
      });
    });
  });
  return out;
}
