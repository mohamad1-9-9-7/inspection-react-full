/* Render smoke tests: the new billing screens mount with realistic server
   data and show what matters, without a server or a browser. */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MyBilling from "./MyBilling";
import BillingDueBanner from "./BillingDueBanner";
import ReferrerPortal from "../referrer/ReferrerPortal";
import PaymentProofsPanel from "../settings/invoices/PaymentProofsPanel";

jest.mock("../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

global.IS_REACT_ACT_ENVIRONMENT = true;
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(Date.now() + n * 86400000));

const MY_BILLING = {
  ok: true,
  company: { id: 7, name: "Acme Foods", branches: 2, is_trial: false, promo_code: "TAWFIQ", promo_kind: "pct", promo_amount: 10,
    promo_until: plus(30), status: "active", start_date: plus(-335), end_date: plus(6), price: 1000, currency: "AED", plan_name: "Professional" },
  invoices: [
    { id: 4, invoice_number: "INV-2026-0004", issue_date: plus(-2), due_date: plus(12), period_start: plus(7), period_end: plus(37),
      amount: "900.00", currency: "AED", status: "unpaid", display_status: "unpaid", kind: "", lines: [], seller: {} },
    { id: 2, invoice_number: "INV-2026-0002", issue_date: plus(-40), period_start: plus(-30), period_end: plus(6),
      amount: "900.00", currency: "AED", status: "paid", display_status: "paid", kind: "", lines: [], seller: {} },
  ],
  proofs: [{ id: 1, invoice_id: 4, image_url: "https://res.cloudinary.com/x/r.jpg", amount: 900, reference: "FT1", paid_on: plus(0), status: "rejected", reject_reason: "Not received yet", created_at: plus(0) }],
  bank: { payee: "INSPECT PRO", bank_name: "Test Bank", account_name: "INSPECT PRO", iban: "AE07 0331 2345 6789 0123 456", swift: "TESTAEAD" },
  rateLock: { eligible: true, daysLeft: 30, promoUntil: plus(30), code: "TAWFIQ", currency: "AED", monthly: 1000, monthlyOff: 100,
    monthlyNet: 900, months: 12, subtotal: 10800, savings: 1200, periodStart: plus(7), periodEnd: plus(371) },
};

const REFERRER = {
  ok: true,
  referrer: { code: "TAWFIQ", holder: "Tawfiq", kind: "pct", amount: 10, active: true, expiresAt: "", usable: true, commissionPct: 10, commissionMonths: 12 },
  funnel: { visits: 14, visits30: 9, leads: 3, demos: 2, trials: 1, customers: 1, activeCustomers: 1 },
  leads: [{ day: plus(-3), kind: "trial" }],
  customers: [{ name: "Acme Foods", since: plus(-335), status: "active", paid_invoices: 3 }],
  earnings: [{ currency: "AED", base: 10800, earned: 1080, paid: 300, balance: 780 }],
  payouts: [{ amount: 300, currency: "AED", paid_on: plus(-1), note: "cash" }],
};

const PROOFS = {
  ok: true,
  proofs: [{ id: 9, company_name: "Acme Foods", invoice_number: "INV-2026-0004", invoice_amount: 900, amount: 900, currency: "AED",
    reference: "FT26278XK91", paid_on: plus(0), image_url: "https://res.cloudinary.com/x/r.jpg", submitted_by: "acme-admin", created_at: plus(0),
    period_end: plus(37), invoice_kind: "", note: "", ocr: { amounts: [900], references: ["FT26278XK91"], invoiceNumberSeen: true } }],
};

function mockFetch(map) {
  global.fetch = jest.fn(async (url) => {
    const key = Object.keys(map).find((k) => String(url).includes(k));
    return { ok: !!key, status: key ? 200 : 404, json: async () => (key ? map[key] : { ok: false, error: "not_found" }) };
  });
}

let host;
let root;
beforeEach(() => {
  host = document.createElement("div");
  host.id = "root";
  document.body.appendChild(host);
  root = createRoot(host);
  localStorage.clear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

test("My billing: subscription, promo, rate lock, invoices, bank, rejected receipt", async () => {
  localStorage.setItem("currentUser", JSON.stringify({ isAdmin: true, companyId: 7, username: "acme-admin" }));
  mockFetch({ "/api/my-billing": MY_BILLING });
  await act(async () => { root.render(<MemoryRouter><MyBilling /></MemoryRouter>); });
  await flush();
  const text = host.textContent;
  expect(text).toContain("Acme Foods");
  expect(text).toContain("900.00 AED");                 // net monthly price
  expect(text).toContain("TAWFIQ");
  expect(text).toContain("Keep your promo price for another year");
  expect(text).toContain("10,800.00 AED");
  expect(text).toContain("INV-2026-0004");
  expect(text).toContain("I paid — upload receipt");
  expect(text).toContain("AE07 0331 2345 6789 0123 456");
  expect(text).toContain("Not received yet");
});

test("My billing: a staff account is told to ask the admin, and nothing is fetched", async () => {
  localStorage.setItem("currentUser", JSON.stringify({ isAdmin: false, companyId: 7 }));
  mockFetch({});
  await act(async () => { root.render(<MemoryRouter><MyBilling /></MemoryRouter>); });
  expect(host.textContent).toContain("Only your company's admin");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("Renewal bar: shows for the admin 6 days before the end, hides on /my-billing", async () => {
  localStorage.setItem("currentUser", JSON.stringify({ isAdmin: true, companyId: 7 }));
  localStorage.setItem("subscription_cache", JSON.stringify({ companyId: 7, end_date: plus(6), status: "active", fetchedAt: Date.now() }));
  await act(async () => { root.render(<MemoryRouter initialEntries={["/company-app"]}><BillingDueBanner /></MemoryRouter>); });
  expect(host.textContent).toContain("Your subscription ends in 6 days");
  act(() => root.unmount());
  root = createRoot(host);
  await act(async () => { root.render(<MemoryRouter initialEntries={["/my-billing"]}><BillingDueBanner /></MemoryRouter>); });
  expect(host.textContent).toBe("");
});

test("Referrer page: code, funnel, commission due, customers", async () => {
  mockFetch({ "/api/referrer/": REFERRER });
  await act(async () => {
    root.render(<MemoryRouter initialEntries={["/ref/abcdefghijklmnopqrstuvwx?lang=en"]}><Routes><Route path="/ref/:token" element={<ReferrerPortal />} /></Routes></MemoryRouter>);
  });
  await flush();
  const text = host.textContent;
  expect(text).toContain("TAWFIQ");
  expect(text).toContain("Hello Tawfiq");
  expect(text).toContain("780.00 AED");
  expect(text).toContain("Acme Foods");
  expect(text).toContain("/demo?code=TAWFIQ");
});

test("Owner review panel: receipt with all checks green and Confirm", async () => {
  mockFetch({ "/api/payment-proofs": PROOFS });
  await act(async () => { root.render(<PaymentProofsPanel />); });
  await flush();
  const text = host.textContent;
  expect(text).toContain("Payment receipts to review");
  expect(text).toContain("INV-2026-0004");
  expect(text).toContain("Amount = invoice");
  expect(text).toContain("Invoice no. on the receipt");
  expect(text).toContain("Confirm payment");
});

test("Promo codes (owner): referrer tools open with commission due and payouts", async () => {
  const { default: PromoCodesTab } = await import("../settings/PromoCodesTab");
  mockFetch({
    "/api/promo-codes": {
      ok: true, leads: [],
      codes: [{ id: 1, code: "TAWFIQ", kind: "pct", amount: 10, holder: "Tawfiq", holder_phone: "0501234567", active: true, uses: 3,
        commission_pct: 10, commission_months: 12, portal_token: "abcdefghijklmnopqrstuvwx", customers: 1, visits: 14,
        earnings: [{ currency: "AED", base: 10800, earned: 1080, paid: 300, balance: 780 }] }],
      payouts: [{ id: 5, promo_code_id: 1, amount: 300, currency: "AED", paid_on: "2026-10-04", note: "cash" }],
    },
  });
  await act(async () => { root.render(<PromoCodesTab />); });
  await flush();
  expect(host.textContent).toContain("780.00 AED still due");
  const btn = [...host.querySelectorAll("button")].find((b) => b.textContent.includes("Referrer"));
  await act(async () => { btn.click(); });
  const text = host.textContent;
  expect(text).toContain("/ref/abcdefghijklmnopqrstuvwx");
  expect(text).toContain("Record payout");
  expect(text).toContain("cash");
});
