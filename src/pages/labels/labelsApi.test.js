import { gs1Text, labelHtml, sizeOf, code128ModuleMm, printDocument } from "./labelsApi";
import { gs1Raw } from "../../utils/code128";
import { parseBarcode } from "../../utils/gs1Barcode";

// jest hoists these above the imports; the real modules read import.meta
jest.mock("../../config/api", () => ({ __esModule: true, default: "http://test", API_BASE: "http://test" }));

const data = { company: "Al Mawashi", product: "Lamb Leg", code: "30024", prodDate: "2026-10-23", expDate: "2026-10-30", lot: "261023", weightKg: 1.25, branch: "QCS", storage: "Keep chilled 0 to 4 °C", allergens: ["Milk"] };

test("the label's GS1 data reads back through our own scanner parser", () => {
  const text = gs1Text(data);
  expect(text).toBe("(11)261023(17)261030(3103)001250(10)261023(240)30024");
  const r = parseBarcode(gs1Raw(text));
  expect(r).toMatchObject({ itemCode: "30024", prodDate: "2026-10-23", expDate: "2026-10-30", batch: "261023", weightKg: 1.25 });
});

test("labels render with a QR, and with bars when the label is wide enough", () => {
  expect(labelHtml(data, sizeOf("60x40"), { symbol: "qr" })).toMatch(/<svg[^>]*viewBox/);
  expect(code128ModuleMm(gs1Text(data), sizeOf("60x40"))).toBeLessThan(0.25);
  expect(code128ModuleMm(gs1Text(data), sizeOf("100x50"))).toBeGreaterThan(0.3);
  const html = labelHtml(data, sizeOf("100x50"), { symbol: "code128" });
  expect(html).toContain("<rect");
  expect(html).toContain("Contains: Milk");
});

test("an A4 sheet holds 24 labels per page", () => {
  const doc = printDocument("<div>L</div>", sizeOf("a4-24"), 30);
  expect((doc.match(/class="sheet"/g) || []).length).toBe(2);
  expect((doc.match(/class="cell"/g) || []).length).toBe(30);
});

test("the use-by template leads with the weekday; the halal badge and extra line show when asked", () => {
  const html = labelHtml({ ...data, note: "منتج إماراتي" }, sizeOf("75x50"), { template: "useby", show: { halal: true } });
  expect(html).toContain("USE BY");
  expect(html).toContain(">FRI<");
  expect(html).toContain("HALAL");
  expect(html).toContain("منتج إماراتي");
  const small = labelHtml(data, sizeOf("50x30"), { template: "compact" });
  expect(small).toContain("t-compact");
  expect(small).not.toContain("Keep chilled");
});
