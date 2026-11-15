jest.mock("../../../config/api", () => ({ __esModule: true, default: "" }));
import { normalizeBranches, branchRenames, defaultBranches } from "./licensesBranches";

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
