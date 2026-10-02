/* eslint-disable testing-library/no-unnecessary-act -- plain react-dom root, no Testing Library here */
// Smoke test for the shared receiving log: an old flat sheet (supplier on every
// line, √/✗ ticks) must open as delivery blocks, and saving must write both
// `deliveries` and the flat `entries` the viewers read — as an UPDATE of the
// day's record, never a second record.
import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("../../../../config/api", () => ({ __esModule: true, default: "https://api.test", API_BASE: "https://api.test", IMAGE_API_BASE: "" }));
jest.mock("../../../../utils/imageUpload", () => ({ uploadImage: async () => "https://img.test/x.jpg" }));
jest.mock("./CodedProductField", () => {
  const R = require("react");
  const Field = ({ code, name, onChange }) => R.createElement("input", {
    value: `${code}|${name}`, onChange: (e) => { const [c, n] = e.target.value.split("|"); onChange({ code: c, name: n }); },
  });
  return { ItemCodeInput: Field, ItemNameInput: Field };
});

const saved = [];
jest.mock("../../../../utils/reportOutbox", () => ({
  queuedMessage: () => "queued",
  saveReport: async (spec) => { saved.push(spec); return { queued: false, report: { id: 77 } }; },
}));

const OLD_ROW = {
  id: 77,
  payload: {
    reportDate: "2026-09-30",
    verifiedBy: "QA", receivedBy: "Ali",
    entries: [
      { supplier: "Al Ain Farms", invoiceNo: "INV-1", vehicleTemp: "3", foodItem: "Beef", itemCode: "100", vehicleClean: "√", smellOK: "✗" },
      { supplier: "Al Ain Farms", invoiceNo: "INV-1", vehicleTemp: "3", foodItem: "Lamb", itemCode: "101" },
      { supplier: "Siniora", invoiceNo: "S-9", vehicleTemp: "4", foodItem: "Mortadella", itemCode: "200" },
    ],
  },
};
jest.mock("./reportApi", () => ({
  getReportRowByDate: async () => OLD_ROW,
  payloadOf: (r) => r.payload,
  reportId: (r) => r.id,
}));

window.IS_REACT_ACT_ENVIRONMENT = true;
const ReceivingLogForm = require("./ReceivingLogForm").default;

test("old flat sheet opens as deliveries and saves as an update of the same record", async () => {
  window.confirm = () => true;
  window.alert = () => {};
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<ReceivingLogForm branch="POS 19" type="pos19_receiving_log_butchery" reporter="pos19" />);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  // two suppliers → two delivery blocks; √/✗ read back as C/NC
  expect(host.querySelectorAll(".rl-delivery")).toHaveLength(2);
  const selects = [...host.querySelectorAll("select")].map((s) => s.value);
  expect(selects).toContain("C");
  expect(selects).toContain("NC");

  // sign + save (the date input defaults to today; use the record's date)
  const inputs = [...host.querySelectorAll(".ph-footer input")];
  const setVal = (el, v) => {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    proto.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  await act(async () => { setVal(inputs[0], "Ali"); setVal(inputs[1], "QA"); });
  const saveBtn = host.querySelector(".ph-savebar button");
  await act(async () => { saveBtn.click(); await new Promise((r) => setTimeout(r, 0)); });

  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(77);                       // update, not a new record
  const p = saved[0].body.payload;
  expect(p.deliveries).toHaveLength(2);
  expect(p.entries).toHaveLength(3);
  expect(p.entries[2]).toMatchObject({ supplier: "Siniora", invoiceNo: "S-9", foodItem: "Mortadella" });
  expect(p.supplier).toBe("Al Ain Farms / Siniora");
  root.unmount();
});
