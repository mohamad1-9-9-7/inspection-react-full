// src/pages/settings/_shared/sellerProfile.js
// -----------------------------------------------------------------------------
// The SELLER on every commercial document: INSPECT PRO, the platform owner.
//
// One row on the server (/api/billing-profile, super-admin only). Quotations
// and invoices read it through here and nowhere else, so "who is issuing
// this" and "may it charge VAT" have exactly one answer.
//
// VAT rule (UAE): only a business registered for VAT — i.e. holding a
// 15-digit TRN — may charge VAT or title a document "Tax Invoice". A
// freelancer still waiting for a licence is not, so vatRegistered=false
// means: VAT 0 %, and the document is a plain "Invoice" / "Quotation".
// -----------------------------------------------------------------------------

import API_BASE from "../../../config/api";

export const SELLER_DEFAULT_NAME = "INSPECT PRO";

/* Server row → the shape screens use. Tolerates a missing row and the
   columns an older server has not added yet. */
export function normalizeSeller(row) {
  const r = row || {};
  return {
    name: r.company_name || SELLER_DEFAULT_NAME,
    ownerName: r.owner_name || "",
    address: r.company_address || "",
    email: r.contact_email || "",
    phone: r.contact_phone || "",
    website: r.website || "",
    logoUrl: /^https?:\/\//i.test(r.logo_url || "") ? r.logo_url : "",
    licenseStatus: r.license_status === "issued" ? "issued" : "pending",
    licenseNo: r.license_no || "",
    licenseAuthority: r.license_authority || "",
    licenseExpiry: r.license_expiry ? String(r.license_expiry).slice(0, 10) : "",
    vatRegistered: r.vat_registered === true,
    trn: r.tax_id || "",
    bankName: r.bank_name || "",
    accountName: r.account_name || "",
    iban: r.iban || "",
    swift: r.swift || "",
    paymentTermsDays: Number.isFinite(Number(r.payment_terms_days)) ? Number(r.payment_terms_days) : 14,
    notes: r.notes || "",
    updatedAt: r.updated_at || null,
  };
}

/* The screen shape → the columns the server knows. */
export function sellerToRow(s) {
  return {
    company_name: s.name,
    owner_name: s.ownerName,
    company_address: s.address,
    contact_email: s.email,
    contact_phone: s.phone,
    website: s.website,
    logo_url: s.logoUrl,
    license_status: s.licenseStatus,
    license_no: s.licenseNo,
    license_authority: s.licenseAuthority,
    license_expiry: s.licenseExpiry || null,
    vat_registered: !!s.vatRegistered,
    tax_id: s.trn,
    bank_name: s.bankName,
    account_name: s.accountName,
    iban: s.iban,
    swift: s.swift,
    payment_terms_days: s.paymentTermsDays,
    notes: s.notes,
  };
}

export async function loadSeller() {
  const r = await fetch(`${API_BASE}/api/billing-profile`, { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return normalizeSeller(d.profile);
}

/* Server error codes → something a person can act on. */
const SAVE_ERRORS = {
  trn_required_15_digits: { en: "VAT registration needs a 15-digit TRN.", ar: "التسجيل بالضريبة بحاجة لرقم ضريبي (TRN) من 15 رقم." },
  logo_must_be_hosted_url: { en: "The logo must be uploaded, not pasted.", ar: "الشعار لازم ينرفع، مش ينلصق." },
  iban_invalid: { en: "The IBAN does not look right (e.g. AE07 0331 2345 6789 0123 456).", ar: "رقم الـIBAN غير صحيح (مثال: AE07 0331 2345 6789 0123 456)." },
  email_invalid: { en: "The e-mail address is not valid.", ar: "الإيميل غير صحيح." },
  super_admin_required: { en: "Only the platform owner can change this.", ar: "مالك المنصّة وحده يقدر يعدّل هون." },
};

export async function saveSeller(seller, lang = "en") {
  const r = await fetch(`${API_BASE}/api/billing-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sellerToRow(seller)),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) {
    const m = SAVE_ERRORS[d.error];
    throw new Error(m ? m[lang === "ar" ? "ar" : "en"] : d.error || `HTTP ${r.status}`);
  }
  return normalizeSeller(d.profile);
}

/* ─────────── What documents print ─────────── */

/* VAT a document may charge. Not registered → always 0, whatever was typed. */
export const allowedVatPct = (seller, wanted) =>
  seller?.vatRegistered ? Math.max(0, Number(wanted) || 0) : 0;

/* "Tax Invoice" is a legal title — only with a TRN. */
export const invoiceTitle = (seller) => (seller?.vatRegistered ? "Tax Invoice" : "Invoice");

/* The licence line under the seller's name. Pending → says nothing false. */
export function licenseLine(seller) {
  if (!seller) return "";
  if (seller.licenseStatus === "issued" && seller.licenseNo) {
    return [`Licence No. ${seller.licenseNo}`, seller.licenseAuthority].filter(Boolean).join(" · ");
  }
  return "";
}

/* What is still missing before documents look finished, most important
   first. Drives the checklist on the profile tab. */
export function sellerGaps(s) {
  const gaps = [];
  if (!s) return gaps;
  if (!s.name.trim()) gaps.push({ key: "name", en: "Business name", ar: "الاسم التجاري" });
  if (!s.email.trim() && !s.phone.trim()) gaps.push({ key: "contact", en: "An e-mail or phone for customers", ar: "إيميل أو هاتف للعملاء" });
  if (!s.iban.trim()) gaps.push({ key: "iban", en: "Bank IBAN, so customers can pay you", ar: "رقم IBAN حتى يقدر العميل يدفعلك" });
  if (!s.logoUrl) gaps.push({ key: "logo", en: "Logo", ar: "الشعار" });
  if (s.licenseStatus === "issued" && !s.licenseNo.trim()) gaps.push({ key: "license", en: "Licence number", ar: "رقم الرخصة" });
  return gaps;
}
