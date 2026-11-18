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
  contacts: [{ email: "boss@x.ae", name: "Boss" }],
  // the updated server always sends this array — per-branch To / CC / BCC
  distribution: [{ branch: "POS 15", to: ["m15@x.ae"], cc: ["boss@x.ae"], bcc: [] }],
};

const LOG = [
  { id: 7, sent_at: now, sent_by: "admin", report_type: "alerts:expiries", subject: "⏳ Reminder — 1 expiring / expired · POS 15", to_emails: ["m@x.ae"], method: "manual", attachment_count: 1, note: "Contract — Pest control · Rentokil — EXPIRED on 10/11/2026", status: "sent" },
  { id: 6, sent_at: now, sent_by: "system", report_type: "alerts:temperature", subject: "🌡️ POS 10 — Chiller 1", to_emails: ["q@x.ae"], method: "auto", attachment_count: 0, note: "", status: "failed" },
];

let host;
let root;
beforeEach(() => {
  localStorage.setItem("currentUser", JSON.stringify({ isAdmin: true, companyId: 1, username: "admin", loginAt: Date.now() }));
  global.fetch = jest.fn((url) => {
    const u = String(url);
    const body = u.includes("/rules") ? { ok: true, rules: RULES, branches: ["POS 10", "POS 15", "QCS"], mailbox: true }
      : u.includes("/alerts/log") ? { ok: true, data: LOG }
      : { ok: true, data: ALERTS };
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
  // the old per-check list moved into the All-branches To list
  expect(host.textContent).toMatch(/moved into the All-branches To list|تم نقل/);
  expect(host.textContent).toContain("qa@x.ae");
  // the branch e-mail editor: To / CC / BCC pickers, like the send window
  const pickers = host.querySelectorAll('input[placeholder*="Search by name or email"], input[placeholder*="ابحث بالاسم أو الإيميل"]');
  expect(pickers.length).toBe(3);
  expect(button(/Send reminders now — all branches|إرسال التذكيرات الآن — كل الفروع/)).toBeTruthy();
  // a branch: its own To / CC + the All-branches people noted under it
  await act(async () => { button(/^POS 15/).click(); });
  await flush();
  expect(host.textContent).toContain("m15@x.ae");
  expect(host.textContent).toContain("boss@x.ae");
  expect(host.textContent).toMatch(/Also on this e-mail \(All branches\)|كمان على هالإيميل \(كل الفروع\)/);
  expect(host.textContent).toMatch(/People on this e-mail|الأشخاص على هالإيميل/);
  expect(button(/Send this branch's reminders now|إرسال تذكيرات الفرع الآن/)).toBeTruthy();
  // a branch with nobody (beyond All branches) still gets the All list → not red
  await act(async () => { button(/^QCS/).click(); });
  expect(host.textContent).not.toMatch(/Nobody gets this branch's alerts by e-mail yet|ما حدا بيستلم تنبيهات هالفرع بالإيميل لسا/);
  // coverage map: POS 15 → m15 + Boss (CC) + qa for temperature
  await act(async () => { button(/Coverage map|خريطة التغطية/).click(); });
  expect(host.querySelector("table")).toBeTruthy();
  // checks view keeps the daily list
  await act(async () => { button(/^⚙️\s*(Checks|الفحوصات)/).click(); });
  expect(host.textContent).toContain("POS 10 temperature");
  // expiry kinds: "Everything" until one is picked
  expect(button(/Everything|كل شي/)).toBeTruthy();
  await act(async () => { button(/🤝\s*(Contracts|العقود)/).click(); });
  expect(host.textContent).toMatch(/Only these are sent: Contracts|بس هدول بينبعتوا: العقود/);
  // send log: rows, status, filter
  await act(async () => { button(/^📜\s*(Send log|سجل الإرسال)/).click(); });
  await flush();
  expect(host.textContent).toContain("Reminder — 1 expiring / expired · POS 15");
  expect(host.textContent).toMatch(/1 failed|1 فشل/);
});

test("the bell shows the open count", async () => {
  await act(async () => { draw(<MemoryRouter initialEntries={["/named-dashboard"]}><AlertsBell /></MemoryRouter>); });
  await flush();
  const badge = host.querySelector(".abl-badge");
  expect(badge && badge.textContent).toBe("2");
});
