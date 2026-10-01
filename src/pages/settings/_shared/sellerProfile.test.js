import {
  allowedVatPct,
  invoiceTitle,
  licenseLine,
  normalizeSeller,
  sellerGaps,
  sellerToRow,
} from "./sellerProfile";
import { quoteInsights } from "../quotations/quotationCore";

// config/api.js reads import.meta, which CRA's Jest cannot parse. Nothing
// here touches the network, so a stub base URL is all it needs (babel-jest
// hoists this above the imports).
jest.mock("../../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

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

  test("the licence is always printed, defaulting to INSPECT PRO's own", () => {
    expect(licenseLine(freelancer)).toBe("Licence No. CN-6791275 · Abu Dhabi Registration Authority (ADRA)");
    expect(licenseLine({ ...freelancer, licenseNo: "FL-123", licenseAuthority: "Dubai" })).toBe("Licence No. FL-123 · Dubai");
    expect(licenseLine({ ...freelancer, licenseNo: "" })).toBe("");
    expect(sellerToRow(freelancer)).not.toHaveProperty("license_status");
  });

  test("the full company name defaults to the one on the licence", () => {
    expect(freelancer.legalName).toBe("INSPECT PRO ARTIFICIAL INTELLIGENCE DEVELOPING SERVICES");
    expect(normalizeSeller({ legal_name: "X LLC" }).legalName).toBe("X LLC");
    expect(sellerToRow(freelancer).legal_name).toBe(freelancer.legalName);
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

  test("a quotation without the licence line gets a tip", () => {
    const q0 = { ...q, vatPct: 0 };
    expect(quoteInsights(q0, freelancer).some((x) => /licence/.test(x.en))).toBe(true);
    expect(quoteInsights({ ...q0, issuerLicense: licenseLine(freelancer) }, freelancer).some((x) => /licence/.test(x.en))).toBe(true);
    const full = { ...q0, issuerLicense: licenseLine(freelancer), issuerLegalName: freelancer.legalName };
    expect(quoteInsights(full, freelancer).some((x) => /licence/.test(x.en))).toBe(false);
    expect(quoteInsights(q0, { ...freelancer, licenseNo: "", legalName: "" }).some((x) => /licence/.test(x.en))).toBe(false);
  });

  test("old callers without a seller keep working", () => {
    expect(() => quoteInsights(q)).not.toThrow();
  });
});

describe("quotation VAT term", () => {
  const { termText, makeTerm } = require("../quotations/quotationCore");
  test("a 0 % quotation says no VAT is charged instead of 'VAT at 0 % is added'", () => {
    expect(termText(makeTerm("vat"), { vatPct: 0 }, "en")).toMatch(/No VAT is charged/);
    expect(termText(makeTerm("vat"), { vatPct: 5 }, "en")).toMatch(/VAT at 5% is added/);
    expect(termText(makeTerm("vat", { en: "Custom." }), { vatPct: 0 }, "en")).toBe("Custom.");
  });
});
