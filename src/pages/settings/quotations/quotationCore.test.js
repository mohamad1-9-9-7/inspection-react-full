import { computeTotals, emptyLine, freeMonthsOf, freeMonthsText, makeTerm, quoteSummaryText, termText } from "./quotationCore";

jest.mock("../../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

const base = {
  cycle: "monthly", contractMonths: 12, currency: "AED", discountPct: 0, vatPct: 0,
  lines: [
    emptyLine({ titleEn: "Subscription", qty: 1, unitPrice: 1000, kind: "recurring" }),
    emptyLine({ titleEn: "Setup", qty: 1, unitPrice: 4000, kind: "one_time" }),
  ],
};

describe("free months", () => {
  test("the first month free takes one month off the contract and the first invoice", () => {
    const t = computeTotals({ ...base, freeMonths: 1 });
    expect(t.freeMonths).toBe(1);
    expect(t.freeValue).toBe(1000);
    expect(t.contractValue).toBe(11000 + 4000);
    expect(t.firstInvoice).toBe(4000); // only the one-time fees on signing
    expect(t.savings).toBe(1000);
  });

  test("no free months leaves the numbers as they were", () => {
    const t = computeTotals(base);
    expect(t.contractValue).toBe(16000);
    expect(t.firstInvoice).toBe(5000);
  });

  test("never more than the contract, never on a one-time cycle", () => {
    expect(freeMonthsOf({ ...base, freeMonths: 99 })).toBe(12);
    expect(freeMonthsOf({ ...base, cycle: "one_time", freeMonths: 1 })).toBe(0);
  });

  test("a yearly cycle frees one twelfth per month", () => {
    const t = computeTotals({ ...base, cycle: "yearly", lines: [emptyLine({ qty: 1, unitPrice: 12000, kind: "recurring" })], freeMonths: 1 });
    expect(t.freeValue).toBe(1000);
    expect(t.contractValue).toBe(11000);
  });

  test("the sentence and the summary say it plainly", () => {
    expect(freeMonthsText({ ...base, freeMonths: 1 }, "en")).toMatch(/first month .* free of charge, counted from the contract signing date/);
    expect(freeMonthsText({ ...base, freeMonths: 2 }, "ar")).toMatch(/أول 2 أشهر/);
    expect(freeMonthsText(base, "en")).toBe("");
    expect(quoteSummaryText({ ...base, number: "Q-1", clientName: "X", freeMonths: 1 })).toMatch(/First month free/);
  });
});

describe("early termination term", () => {
  test("states the period, the penalty and its amount", () => {
    const term = makeTerm("early_exit");
    expect(term.on).toBe(true);
    expect(termText(term, base, "en")).toBe(
      "If the Client terminates the contract before 6 months from the signing date, the Client shall pay a penalty equal to 2 months of the monthly subscription value stated in this contract (2,000.00 AED)."
    );
    expect(termText(term, base, "ar")).toMatch(/قبل انقضاء 6 أشهر .* قيمة 2 شهر .*2,000.00 AED/);
  });

  test("follows the tuned numbers", () => {
    const term = makeTerm("early_exit", { params: { months: 3, penalty: 1 } });
    expect(termText(term, base, "en")).toMatch(/before 3 months .* equal to 1 months .*\(1,000.00 AED\)/);
  });
});

describe("standard plans", () => {
  const { smartBuildLines, standardBranchPrice, computeTotals: ct } = require("./quotationCore");
  test("per-branch price by plan, cycle and volume", () => {
    expect(standardBranchPrice(1, "monthly")).toBe(350);
    expect(standardBranchPrice(2, "yearly")).toBe(300 * 12);
    expect(standardBranchPrice(3, "monthly")).toBe(490);
    expect(standardBranchPrice(10, "monthly", "professional")).toBe(416.5);
    expect(standardBranchPrice(5, "monthly", "enterprise")).toBe(621);
    expect(standardBranchPrice(20, "yearly", "enterprise")).toBe(6018);
  });
  test("Essential is the floor: no volume discount below 300", () => {
    expect(standardBranchPrice(30, "monthly", "essential")).toBe(350);
    expect(standardBranchPrice(30, "yearly", "essential")).toBe(3600);
  });
  test("standard build: one priced line, the rest included", () => {
    const lines = smartBuildLines({ industry: "restaurant", branches: 4, pricing: "standard", cycle: "monthly", trainingHours: 2 });
    const t = ct({ cycle: "monthly", lines, discountPct: 0, vatPct: 0 });
    expect(t.recurringTotal).toBe(4 * 490);
    expect(t.oneTimeTotal).toBe(1000);
    const picked = smartBuildLines({ industry: "restaurant", branches: 4, pricing: "standard", cycle: "monthly", plan: "essential" });
    expect(ct({ cycle: "monthly", lines: picked, discountPct: 0, vatPct: 0 }).recurringTotal).toBe(4 * 350);
    const yearly = smartBuildLines({ industry: "restaurant", branches: 4, pricing: "standard", cycle: "yearly" });
    expect(ct({ cycle: "yearly", lines: yearly, discountPct: 0, vatPct: 0 }).oneTimeTotal).toBe(0);
  });
});
