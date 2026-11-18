/* Render smoke tests: the alerts page and bell mount with realistic server
   answers, without a server or a browser. */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import AlertsPage from "./AlertsPage";
import AlertsBell from "../../components/AlertsBell";

jest.mock("../../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const now = new Date().toISOString();
const ALERTS = [
  { id: 1, rule: "temperature", severity: "critical", branch: "POS 10", title: "POS 10 — Chiller 1: 9°C out of range", body: "Reading 9°C at 8:00 AM", link: "", status: "open", data: {}, created_at: now },
  { id: 2, rule: "expiries", severity: "warning", branch: "QCS", title: "Calibration — Probe B — expires 02/11/2026 (10 day(s))", body: "", link: "/haccp-iso/calibration/view", status: "open", data: {}, created_at: now, emailed_at: now },
];
const RULES = {
  temperature: { enabled: true, emails: ["qa@x.ae"] },
  missedReports: { enabled: true, emails: [], checks: [{ type: "pos10_temperature", branch: "POS 10", label: "POS 10 temperature" }] },
  noReadingToday: { enabled: true, emails: [] },
  expiries: { enabled: true, emails: [], days: 30 },
  capa: { enabled: false, emails: [], openDays: 30 },
  contacts: [], // the updated server always sends this array
};

let host;
let root;
beforeEach(() => {
  localStorage.setItem("currentUser", JSON.stringify({ isAdmin: true, companyId: 1, username: "admin", loginAt: Date.now() }));
  global.fetch = jest.fn((url) => {
    const body = String(url).includes("/rules") ? { ok: true, rules: RULES, branches: ["POS 10", "POS 15", "QCS"], mailbox: true } : { ok: true, data: ALERTS };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

// not Testing Library's render: React's own root (a named helper keeps the lint rule from confusing the two)
const draw = (el) => root.render(el);
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const button = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent));

test("the alerts page lists open alerts and opens the settings", async () => {
  await act(async () => { draw(<MemoryRouter><AlertsPage /></MemoryRouter>); });
  await flush();
  expect(host.textContent).toContain("9°C out of range");
  expect(host.textContent).toContain("Probe B");
  const settingsTab = button(/Settings & recipients|الإعدادات والمستلمون/);
  expect(settingsTab).toBeTruthy();
  await act(async () => { settingsTab.click(); });
  await flush();
  // the old per-check list became a recipient (all branches)
  expect(host.textContent).toContain("qa@x.ae");
  expect(host.textContent).toMatch(/moved into Recipients|تم نقل/);
  // branches come from the server + the daily checks
  expect(host.textContent).toContain("POS 15");
  // a new recipient is picked from the e-mail center's contacts (shared picker)
  await act(async () => { button(/Add recipient|إضافة مستلم/).click(); });
  await flush();
  expect(host.textContent).toMatch(/People \(from the e-mail contacts\)|الأشخاص \(من جهات اتصال الإيميل\)/);
  expect(host.querySelector('input[placeholder*="Search by name or email"], input[placeholder*="ابحث بالاسم أو الإيميل"]')).toBeTruthy();
  await act(async () => { button(/^(Cancel|إلغاء)$/).click(); });
  // coverage map: POS 15 has the all-branch recipient for temperature
  await act(async () => { button(/Coverage map|خريطة التغطية/).click(); });
  expect(host.querySelector("table")).toBeTruthy();
  // checks view keeps the daily list
  await act(async () => { button(/^⚙️\s*(Checks|الفحوصات)/).click(); });
  expect(host.textContent).toContain("POS 10 temperature");
});

test("the bell shows the open count", async () => {
  await act(async () => { draw(<MemoryRouter initialEntries={["/named-dashboard"]}><AlertsBell /></MemoryRouter>); });
  await flush();
  const badge = host.querySelector(".abl-badge");
  expect(badge && badge.textContent).toBe("2");
});
