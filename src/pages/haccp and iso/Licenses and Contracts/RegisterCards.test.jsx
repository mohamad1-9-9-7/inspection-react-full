/* eslint-disable testing-library/no-unnecessary-act -- plain React act + createRoot, no Testing Library here */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import RegisterCards from "./RegisterCards";
import { flattenRecords } from "./licensesKit";

jest.mock("../../dashboard/hubCss", () => ({ fs: (px) => `${px}px` }));

const reports = [
  { id: 1, payload: { branch: "Al Qusais Warehouse", license: { name: "AL QOSAIC", expiryDate: "2027-01-19", fileUrls: ["a.pdf"] }, contracts: [] } },
  { id: 2, payload: { branch: "Al Mamzar Food Truck", license: {}, contracts: [{ uid: "c1", contractType: "Pest Control", expiryDate: "2027-05-01", fileUrls: ["b.pdf"] }] } },
];

test("a parent's licence on a sub-branch page has no edit / delete", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const items = flattenRecords(reports);
  const on = { open: jest.fn(), renew: jest.fn(), edit: jest.fn(), history: jest.fn(), del: jest.fn(), editRecord: jest.fn(), add: jest.fn() };
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(<RegisterCards lang="en" items={items} allItems={items} branchList={["Al Qusais Warehouse", "Al Mamzar Food Truck"]}
      parents={{ "Al Mamzar Food Truck": "Al Qusais Warehouse" }} mayEdit mayDelete on={on} />);
  });
  const navBtn = [...el.querySelectorAll(".lcb-nav")].find((b) => b.textContent.includes("Al Mamzar Food Truck"));
  act(() => { navBtn.click(); });
  const row = [...el.querySelectorAll(".lcb-row")].find((r) => r.textContent.includes("AL QOSAIC"));
  expect(row.textContent).toContain("Licence of Al Qusais Warehouse");
  act(() => { row.querySelector(".lcb-b.more").click(); });
  const menu = row.querySelector(".lcb-menu").textContent;
  expect(menu).not.toMatch(/Delete|Edit whole record|✎ Edit/);
  expect(menu).toContain("Edit or delete in Al Qusais Warehouse");

  // its own contract keeps every action
  const own = [...el.querySelectorAll(".lcb-row")].find((r) => r.textContent.includes("Pest Control"));
  act(() => { own.querySelector(".lcb-b.more").click(); });
  expect(own.querySelector(".lcb-menu").textContent).toContain("Delete");
  act(() => root.unmount());
});
