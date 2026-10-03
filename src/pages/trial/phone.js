// src/pages/trial/phone.js
// Mobile numbers for the free-trial form. Mirror of the server's
// utils/phone.cjs — keep the two rule tables identical.
// "0501234567", "+971 50 123 4567" and "00971501234567" are one UAE mobile,
// "+971501234567"; only the right digit count and a mobile first digit pass.

export const MOBILE_COUNTRIES = [
  { id: "AE", code: "971", len: 9, first: /^5[024568]/, flag: "🇦🇪", en: "UAE", ar: "الإمارات", example: "50 123 4567" },
  { id: "SA", code: "966", len: 9, first: /^5/, flag: "🇸🇦", en: "Saudi Arabia", ar: "السعودية", example: "55 123 4567" },
  { id: "QA", code: "974", len: 8, first: /^[3567]/, flag: "🇶🇦", en: "Qatar", ar: "قطر", example: "3312 3456" },
  { id: "KW", code: "965", len: 8, first: /^[569]/, flag: "🇰🇼", en: "Kuwait", ar: "الكويت", example: "9912 3456" },
  { id: "BH", code: "973", len: 8, first: /^[36]/, flag: "🇧🇭", en: "Bahrain", ar: "البحرين", example: "3612 3456" },
  { id: "OM", code: "968", len: 8, first: /^[79]/, flag: "🇴🇲", en: "Oman", ar: "عُمان", example: "9212 3456" },
];

const BY_ID = Object.fromEntries(MOBILE_COUNTRIES.map((c) => [c.id, c]));
export const countryOf = (id) => BY_ID[id] || BY_ID.AE;

/** → "+971501234567", or null when it is not a valid mobile of that country. */
export function normalizeMobile(countryId, input) {
  const rule = BY_ID[countryId];
  if (!rule) return null;
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(rule.code) && d.length === rule.code.length + rule.len) d = d.slice(rule.code.length);
  else if (d.startsWith("0") && d.length === rule.len + 1) d = d.slice(1); // national trunk 0
  if (d.length !== rule.len || !rule.first.test(d)) return null;
  return `+${rule.code}${d}`;
}
