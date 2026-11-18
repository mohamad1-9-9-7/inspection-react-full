import { canonBranch, sameBranch } from "./branchCanon";

// The real spellings found in the reports (Alerts page, Nov 2026).
const GROUPS = {
  "POS 15": ["POS 15", "AL BARSHA BUTCHERY (POS15)", "ALBARSHA BUTCHERY (POS 15)", "BARSHA BUTCHERY-POS 15", "Al Barsha Butchery"],
  "POS 10": ["POS 10", "ABU DHABI BUTCHERY (POS 10)", "Abu Dhabi Butchery"],
  "POS 14": ["AL AIN BUTCHERY (POS 14)", "Al Ain Butchery"],
  "POS 19": ["POS 19", "MOTOR CITY (POS 19)"],
  "POS 26": ["Al BARSHA SOUTH COOP (POS26)"],
  "FTR 1": ["FTR 1", "FOOD TRUCK (MUSHRIF PARK) - FTR 1", "Supervisor Food Truck", "SUPERVISOR FOOD TRUCK"],
  "FTR 2": ["FOOD TRUCK (AL MAMZAR) - FTR 2", "Al Mamzar Food Truck"],
  QCS: ["QCS", "QUSAIS", "AL QUSAI STORE", "AL QUASIS (STORE)", "Al Qusais Warehouse", "Al Qusais (QCS) — Central Warehouse"],
  PRODUCTION: ["AL QUASIS (PRODUCTION)"],
  "AL WARQA KITCHEN": ["AL WARKA KITCHEN", "Al Warqa Kitchen"],
};

test("every spelling of a branch gives the same key", () => {
  for (const [key, names] of Object.entries(GROUPS)) {
    for (const n of names) expect([n, canonBranch(n)]).toEqual([n, key]);
  }
});

test("a South Barsha co-op is not the Barsha butchery", () => {
  expect(sameBranch("Al BARSHA SOUTH COOP (POS26)", "Al Barsha Butchery")).toBe(false);
});

test("leading zeros, empty and unknown names", () => {
  expect(canonBranch("POS 06")).toBe("POS 6");
  expect(canonBranch("")).toBe("");
  expect(canonBranch("  Some   New Shop ")).toBe("SOME NEW SHOP");
});
