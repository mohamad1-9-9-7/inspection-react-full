import { daysUntil, isBillingAdmin, matchReceipt, parseReceipt } from "./myBillingCore";
import { dueState } from "./BillingDueBanner";

jest.mock("../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

describe("receipt reader", () => {
  const enbd = `Emirates NBD
Transfer Successful
Amount AED 2,520.00
To: INSPECT PRO
Reference No: FT26278XK91
Date 05/10/2026
Remarks INV-2026-0004`;

  test("reads amount, reference, date and the invoice number", () => {
    const r = parseReceipt(enbd, ["INV-2026-0004", "INV-2026-0001"]);
    expect(r.amounts).toContain(2520);
    expect(r.references).toContain("FT26278XK91");
    expect(r.dates).toContain("2026-10-05");
    expect(r.invoiceNumberSeen).toBe(true);
    expect(matchReceipt(r, { amount: "2520.00" })).toEqual({ amountMatch: true, invoiceNumberSeen: true });
  });

  test("month-name dates, spaced invoice numbers, no false match", () => {
    const r = parseReceipt("Paid 1,000.00 DHS on 12 Sep 2026 · ref: 99887766 · inv 2026 0007", ["INV-2026-0007"]);
    expect(r.amounts).toContain(1000);
    expect(r.dates).toContain("2026-09-12");
    expect(r.references).toContain("99887766");
    expect(matchReceipt(r, { amount: 1050 }).amountMatch).toBe(false);
  });

  test("empty text is harmless", () => {
    expect(parseReceipt("", [])).toEqual({ amounts: [], references: [], dates: [], invoiceNumberSeen: false, text: "" });
    expect(matchReceipt(null, { amount: 5 }).amountMatch).toBe(false);
  });
});

describe("who sees billing / the renewal bar", () => {
  const admin = { isAdmin: true, companyId: 7 };
  const now = new Date(2026, 9, 5); // 5 Oct 2026

  test("only a company admin — not staff, the owner, or a trial", () => {
    expect(isBillingAdmin(admin)).toBe(true);
    expect(isBillingAdmin({ ...admin, isAdmin: false })).toBe(false);
    expect(isBillingAdmin({ ...admin, isSuperAdmin: true })).toBe(false);
    expect(isBillingAdmin({ ...admin, companyTrial: true })).toBe(false);
    expect(isBillingAdmin({ isAdmin: true })).toBe(false);
  });

  test("shows from 10 days before the end, for its own company's cache", () => {
    expect(dueState(admin, { companyId: 7, end_date: "2026-10-15" }, now)).toEqual({ days: 10, endDate: "2026-10-15" });
    expect(dueState(admin, { companyId: 7, end_date: "2026-10-16" }, now)).toBeNull();
    expect(dueState(admin, { companyId: 7, end_date: "2026-10-01" }, now).days).toBe(-4);
    expect(dueState(admin, { companyId: 8, end_date: "2026-10-06" }, now)).toBeNull();
    expect(dueState({ ...admin, isAdmin: false }, { companyId: 7, end_date: "2026-10-06" }, now)).toBeNull();
    expect(daysUntil("2026-10-05", now)).toBe(0);
  });
});
