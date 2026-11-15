import { normalizeBranches, branchRenames, defaultBranches, parentMap, normalizeRequirements, defaultRequirements } from "./licensesBranches";
// config/api.js uses import.meta, which Jest cannot parse (babel-jest hoists this above the import)
jest.mock("../../../config/api", () => ({ __esModule: true, default: "" }));

test("defaults include Al Warqa Kitchen", () => {
  expect(defaultBranches().map((b) => b.name)).toContain("Al Warqa Kitchen");
});

test("normalizeBranches trims, drops blanks and duplicate names", () => {
  const out = normalizeBranches([{ id: "a", name: "  Al  Ain " }, { id: "b", name: "al ain" }, { id: "c", name: "" }, "Warqa"]);
  expect(out.map((b) => b.name)).toEqual(["Al Ain", "Warqa"]);
  expect(out[0].id).toBe("a");
  expect(out[1].id).toBeTruthy();
});

test("branchRenames finds a renamed id, ignores added and deleted ones", () => {
  const before = [{ id: "a", name: "Old Kitchen" }, { id: "b", name: "Gone" }];
  const after = [{ id: "a", name: "Al Warqa Kitchen" }, { id: "n", name: "Brand New" }];
  expect(branchRenames(before, after)).toEqual([{ from: "Old Kitchen", to: "Al Warqa Kitchen" }]);
});

test("parentMap: one level, self / missing / chained parents dropped", () => {
  const list = [
    { id: "p", name: "Al Barsha Butchery" },
    { id: "t1", name: "Al Mamzar Food Truck", parentId: "p" },
    { id: "t2", name: "Supervisor Food Truck", parentId: "t1" },
    { id: "x", name: "Self", parentId: "x" },
    { id: "y", name: "Ghost", parentId: "nope" },
  ];
  expect(parentMap(list)).toEqual({ "Al Mamzar Food Truck": "Al Barsha Butchery" });
  expect(normalizeBranches(list).find((b) => b.id === "t2").parentId).toBe("");
});


test("requirements: defaults are Trade + Industrial, duplicates and blanks dropped", () => {
  expect(defaultRequirements().map((r) => r.name)).toEqual(["Trade License", "Industrial License"]);
  const out = normalizeRequirements([
    { kind: "license", name: " Trade License " }, { kind: "license", name: "trade license" },
    { kind: "contract", name: "Trade License" }, { kind: "contract", name: "" }, { kind: "x", name: "Pest", branches: ["A", "A", " "] },
  ]);
  expect(out.map((r) => `${r.kind}:${r.name}:${r.branches.join("|")}`)).toEqual(["license:Trade License:", "contract:Trade License:", "license:Pest:A"]);
});
