// config/api.js reads import.meta, which CRA's Jest cannot parse; nothing
// here touches the network, so a stub base URL is all it needs.
jest.mock("../../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

import {
  allowedVatPct,
  invoiceTitle,
  licenseLine,
  normalizeSeller,
  sellerGaps,
  sellerToRow,
} from "./sellerProfile";
import { quoteInsights } from "../quotations/quotationCore";

const freelancer = normalizeSeller({ company_name: "INSPECT PRO", owner_name: "M. Abdullah" });
const registered = normalizeSeller({ company_name: "INSPECT PRO", vat_registered: true, tax_id: "100123456700003" });

describe("seller profile", () => {
  test("a missing row still names the platform owner", () => {
    expect(normalizeSeller(null).name).toBe("INSPECT PRO");
    expect(normalizeSeller(undefined).vatRegistered).toBe(false);
  });

  test("row ⇄ screen shape round-trips", () => {
    const row = sellerToRow(registered);
    expect(normalizeSeller(row)).toEqual({ ...registered, updatedAt: null });
  });

  test("a pasted base64 logo is never treated as a logo", () => {
    expect(normalizeSeller({ logo_url: "data:image/png;base64,AAA" }).logoUrl).toBe("");
    expect(normalizeSeller({ logo_url: "https://res.cloudinary.com/x/logo.png" }).logoUrl).toMatch(/^https:/);
  });

  test("no TRN → no VAT and no 'Tax Invoice', whatever is asked for", () => {
    expect(allowedVatPct(freelancer, 5)).toBe(0);
    expect(invoiceTitle(freelancer)).toBe("Invoice");
    expect(allowedVatPct(registered, 5)).toBe(5);
    expect(invoiceTitle(registered)).toBe("Tax Invoice");
  });

  test("a pending licence prints nothing", () => {
    expect(licenseLine(freelancer)).toBe("");
    expect(licenseLine({ ...freelancer, licenseStatus: "issued", licenseNo: "FL-123", licenseAuthority: "Dubai" }))
      .toBe("Licence No. FL-123 · Dubai");
  });

  test("the readiness list asks for the IBAN and a contact", () => {
    const keys = sellerGaps(freelancer).map((g) => g.key);
    expect(keys).toEqual(expect.arrayContaining(["iban", "contact", "logo"]));
    expect(keys).not.toContain("license");
  });
});

describe("quotation VAT check", () => {
  const q = { clientName: "Acme", lines: [{ id: 1, titleEn: "Plan", unitPrice: 100, qty: 1 }], vatPct: 5 };

  test("charging VAT while unregistered is an error", () => {
    expect(quoteInsights(q, freelancer).some((x) => x.level === "err" && /VAT/.test(x.en))).toBe(true);
    expect(quoteInsights({ ...q, vatPct: 0 }, freelancer).some((x) => /VAT/.test(x.en))).toBe(false);
  });

  test("registered + VAT but no TRN on the document is flagged", () => {
    expect(quoteInsights(q, registered).some((x) => /TRN/.test(x.en))).toBe(true);
    expect(quoteInsights({ ...q, issuerTaxId: "100123456700003" }, registered).some((x) => /TRN/.test(x.en))).toBe(false);
  });

  test("old callers without a seller keep working", () => {
    expect(() => quoteInsights(q)).not.toThrow();
  });
});
