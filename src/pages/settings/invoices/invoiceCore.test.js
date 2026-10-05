import { day, invoiceKpis, moneyMap, netPriceOf, nextPeriod, priceOf, promoLineFor, promoMonthlyOff, promoRunsOn, statusOf } from "./invoiceCore";

jest.mock("../../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

const company = { id: 2, start_date: "2026-01-15T00:00:00.000Z" };

describe("next invoice period", () => {
  test("first invoice starts on the company's start date, for one month", () => {
    expect(nextPeriod(company, [], "2026-09-25")).toEqual({ start: "2026-01-15", end: "2026-02-14" });
  });

  test("continues the day after the latest invoice, ignoring void ones and other companies", () => {
    const inv = [
      { company_id: 2, status: "paid", period_end: "2026-08-31T00:00:00.000Z" },
      { company_id: 2, status: "void", period_end: "2026-09-30" },
      { company_id: 3, status: "paid", period_end: "2026-12-31" },
    ];
    expect(nextPeriod(company, inv, "2026-09-25")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });

  test("month ends are clamped, not rolled over", () => {
    expect(nextPeriod({ id: 9, start_date: "2026-01-31" }, [], "2026-09-25")).toEqual({ start: "2026-01-31", end: "2026-02-27" });
  });

  test("no start date → today", () => {
    expect(nextPeriod({ id: 9 }, [], "2026-09-25").start).toBe("2026-09-25");
  });
});

describe("kpis", () => {
  const inv = [
    { status: "unpaid", display_status: "overdue", amount: 100, currency: "AED", issue_date: "2026-05-01" },
    { status: "unpaid", amount: 50, currency: "AED", issue_date: "2026-09-01" },
    { status: "unpaid", amount: 10, currency: "USD", issue_date: "2026-09-01" },
    { status: "paid", amount: 70, currency: "AED", paid_at: "2026-09-03", issue_date: "2026-09-01" },
    { status: "paid", amount: 999, currency: "AED", paid_at: "2026-08-03", issue_date: "2026-08-01" },
    { status: "void", amount: 5000, currency: "AED", issue_date: "2026-09-01" },
  ];
  const k = invoiceKpis(inv, "2026-09-25");

  test("outstanding counts unpaid + overdue, per currency, never void", () => {
    expect(k.outstanding).toEqual({ AED: 150, USD: 10 });
  });
  test("overdue", () => {
    expect(k.overdue).toEqual({ AED: 100 });
    expect(k.overdueCount).toBe(1);
  });
  test("collected = paid this month only", () => {
    expect(k.collected).toEqual({ AED: 70 });
  });
  test("issued this year excludes void", () => {
    expect(k.issuedThisYear).toBe(5);
  });
  test("currencies are never added together", () => {
    expect(moneyMap(k.outstanding)).toBe("150.00 AED · 10.00 USD");
  });
});

test("helpers", () => {
  expect(statusOf({ status: "unpaid", display_status: "overdue" })).toBe("overdue");
  expect(day("2026-10-09T00:00:00.000Z")).toBe("2026-10-09");
  expect(priceOf({ price: "1200.00", plan_price: 1500 })).toBe(1200);
  expect(priceOf({ price: null, plan_price: "1500.00" })).toBe(1500);
});

describe("amount in words", () => {
  const { amountInWords } = require("./invoiceCore");
  test("whole dirhams, fils and big numbers", () => {
    expect(amountInWords(3200, "AED")).toBe("UAE Dirhams Three Thousand Two Hundred Only");
    expect(amountInWords(1250.5, "AED")).toBe("UAE Dirhams One Thousand Two Hundred Fifty and Fifty Fils Only");
    expect(amountInWords(2001021, "USD")).toBe("US Dollars Two Million One Thousand Twenty-One Only");
    expect(amountInWords(0)).toBe("UAE Dirhams Zero Only");
  });
});

describe("company promo code", () => {
  const c = { price: 1000, branches: 2, promo_code: "TAWFIQ", promo_kind: "pct", promo_amount: "10.00", promo_until: "2027-09-30" };

  test("runs until promo_until, then stops", () => {
    expect(promoRunsOn(c, "2027-09-30")).toBe(true);
    expect(promoRunsOn(c, "2027-10-01")).toBe(false);
    expect(netPriceOf(c, "2026-12-01")).toBe(900);
    expect(netPriceOf(c, "2027-10-01")).toBe(1000);
  });

  test("AED per branch, capped at the price; a negative invoice line", () => {
    expect(promoMonthlyOff({ ...c, promo_kind: "aed", promo_amount: 150 })).toBe(300);
    expect(promoMonthlyOff({ ...c, promo_kind: "aed", promo_amount: 900 })).toBe(1000);
    expect(promoLineFor(c, "2026-11-01").unit_price).toBe(-100);
    expect(promoLineFor(c, "2027-11-01")).toBeNull();
    expect(promoLineFor({ price: 1000 }, "2026-11-01")).toBeNull();
  });
});
