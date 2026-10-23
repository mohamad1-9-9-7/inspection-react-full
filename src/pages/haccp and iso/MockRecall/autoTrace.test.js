jest.mock("../../../config/api", () => ({ __esModule: true, default: "http://test", API_BASE: "http://test" }));
jest.mock("../../monitor/branches/_shared/ProductPicker", () => ({ normalizeCode: (s) => String(s || "").trim().toUpperCase() }));
jest.mock("../../monitor/branches/_shared/CodedProductField", () => ({ normalizeName: (s) => String(s || "").trim().toLowerCase() }));
import { traceShipment, drillFill } from "./autoTrace";

const full = {
  shipments: [
    { id: "s2", date: "2026-10-01", weight: 1000, supplier: "BRF", invoiceNo: "INV-9", prodDate: "2026-09-25", expiryDate: "2026-10-20", matchedName: "Chicken" },
    { id: "s1", date: "2026-08-01", weight: 500, expiryDate: "2026-08-20" },
  ],
  receiving: [
    { date: "2026-10-03", branch: "POS 10", amount: 300, prodDate: "2026-09-25", expiryDate: "2026-10-20" },
    { date: "2026-10-04", branch: "POS 15", amount: 150, expiryDate: "2026-10-20" },
  ],
  batches: [],
  dispatch: [
    { date: "2026-10-02", customer: "POS10/Stock", qty: 300, unit: "KG", expiryDate: "2026-10-20" },
    { date: "2026-10-02", customer: "POS15/Stock", qty: 200, unit: "KG", expiryDate: "2026-10-20" },
    { date: "2026-10-05", customer: "Some Hotel LLC", qty: 400, unit: "KG" },
    { date: "2026-09-20", customer: "POS10/Stock", qty: 999, unit: "KG" }, // before the shipment
    { date: "2026-11-30", customer: "POS10/Stock", qty: 999, unit: "KG" }, // after the window
  ],
  conditions: [],
  returns: [{ date: "2026-09-30", qty: 5, expiryDate: "2026-10-20" }],
  failed: [],
};

test("one shipment is followed through its window", () => {
  const res = traceShipment(full, "s2");
  expect(res.inKg).toBe(1000);
  expect(res.sentOur).toBe(500);
  expect(res.sentCustomers).toBe(400);
  expect(res.unaccounted).toBe(100);
  expect(res.returnsBefore).toBe(1);
  const pos15 = res.branches.find((b) => b.id === "POS 15");
  expect(pos15.logged).toBe(150);
  expect(pos15.diff).toBe(50);
});

test("the drill form is filled from the trace", () => {
  const prev = {
    product: { name: "", batch: "", productionDate: "", expiryDate: "", qtyProduced: "", qtyUnit: "kg", temp: "", branch: "" },
    backwardTrace: [], forwardTrace: [], timing: { startTime: "09:00", endTime: "" },
    results: { qtyTraced: "", gaps: "", correctiveActions: "" }, linked: {},
  };
  const f = drillFill(prev, traceShipment(full, "s2"), { code: "1234", name: "Chicken Griller", endTime: "09:12" });
  expect(f.product.name).toBe("Chicken Griller [1234]");
  expect(f.product.qtyProduced).toBe("1000");
  expect(f.backwardTrace[0].supplier).toBe("BRF");
  expect(f.forwardTrace).toHaveLength(3); // POS 10, POS 15, customers
  expect(f.forwardTrace.find((r) => r.customer.startsWith("POS 10")).podConfirmed).toBe(true);
  expect(f.forwardTrace.find((r) => r.customer.startsWith("POS 15")).podConfirmed).toBe(false);
  expect(f.results.qtyTraced).toBe("900");
  expect(f.timing.endTime).toBe("09:12");
  expect(f.results.gaps).toMatch(/100 kg of 1000 kg/);
  expect(f.linked.autoTrace.shipmentId).toBe("s2");
});
