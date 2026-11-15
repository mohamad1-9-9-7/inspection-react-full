import { addPeriod, statusOf, flattenRecords, diffPayloads, applyRenewal, ensureUids, documentVersions, applyItemEdit, removeItem, buildSuggestions, findContractPos, missingRequirements, docMatches } from "./licensesKit";

test("addPeriod clamps month end", () => {
  expect(addPeriod("2028-02-29", { years: 1 })).toBe("2029-02-28");
  expect(addPeriod("2026-01-31", { months: 1 })).toBe("2026-02-28");
  expect(addPeriod("2026-05-10", { years: 2 })).toBe("2028-05-10");
});

test("statusOf buckets", () => {
  expect(statusOf("").key).toBe("none");
  expect(statusOf(addPeriod(new Date().toISOString().slice(0, 10), { days: -1 })).key).toBe("expired");
  expect(statusOf(addPeriod(new Date().toISOString().slice(0, 10), { days: 10 })).key).toBe("soon");
  expect(statusOf(addPeriod(new Date().toISOString().slice(0, 10), { days: 60 })).key).toBe("upcoming");
  expect(statusOf(addPeriod(new Date().toISOString().slice(0, 10), { days: 200 })).key).toBe("valid");
});

const legacy = {
  id: 7,
  payload: {
    branch: "Al Ain Butchery",
    license: { name: "Trade", expiryDate: "2026-01-01", fileUrls: ["a.pdf"] },
    contracts: [{ contractType: "Pest Control", companyName: "X", expiryDate: "2026-03-01", fileUrls: ["p.pdf"] }],
  },
};

test("flatten gives license + contract rows", () => {
  const rows = flattenRecords([legacy]);
  expect(rows.map((r) => r.kind)).toEqual(["license", "contract"]);
  expect(rows[1].uid).toBe("idx0");
});

test("renewal of a legacy contract archives the old one and logs history", () => {
  const next = applyRenewal(legacy.payload, { kind: "contract", uid: "idx0" },
    { newExpiry: "2027-03-01", renewedOn: "2026-11-12", files: ["new.pdf"], fileNames: ["new.pdf"], keepOldFiles: false, note: "ok" });
  const c = next.contracts[0];
  expect(c.uid).toBeTruthy();
  expect(c.expiryDate).toBe("2027-03-01");
  expect(c.fileUrls).toEqual(["new.pdf"]);
  expect(c.renewals[0].prevExpiryDate).toBe("2026-03-01");
  expect(c.renewals[0].prevFiles).toEqual(["p.pdf"]);
  expect(next.history[0].action).toBe("renewed");
  expect(next.history[0].target.uid).toBe(c.uid);
});

test("diffPayloads: field edits, added and removed contracts", () => {
  const base = ensureUids(legacy.payload);
  const edited = {
    ...base,
    license: { ...base.license, expiryDate: "2027-01-01" },
    contracts: [{ uid: "new1", contractType: "Cleaning", companyName: "Y" }],
  };
  const ev = diffPayloads(base, edited);
  expect(ev.map((e) => e.action).sort()).toEqual(["contract_added", "contract_removed", "edited"]);
  expect(ev.find((e) => e.action === "edited").changes[0]).toMatchObject({ field: "expiryDate", from: "2026-01-01", to: "2027-01-01" });
});

test("documentVersions: current first, archive from renewals", () => {
  const next = applyRenewal(legacy.payload, { kind: "license", uid: "license" },
    { newExpiry: "2027-01-01", renewedOn: "2026-01-02", files: ["new.pdf"], fileNames: ["New.pdf"], keepOldFiles: false, note: "n" });
  const item = flattenRecords([{ id: 1, payload: next }])[0];
  const v = documentVersions(item);
  expect(v.length).toBe(2);
  expect(v[0]).toMatchObject({ current: true, validUntil: "2027-01-01", issuedOn: "2026-01-02" });
  expect(v[0].files[0]).toMatchObject({ url: "new.pdf", name: "New.pdf" });
  expect(v[1]).toMatchObject({ current: false, validUntil: "2026-01-01", replacedOn: "2026-01-02", note: "n" });
  expect(v[1].files[0].url).toBe("a.pdf");
});

test("findContractPos matches uid or legacy idx", () => {
  expect(findContractPos([{ uid: "a" }, { uid: "b" }], "b")).toBe(1);
  expect(findContractPos([{}, {}], "idx1")).toBe(1);
  expect(findContractPos([{ uid: "a" }], "zz")).toBe(-1);
});

test("applyItemEdit edits one legacy contract and logs the change", () => {
  const res = applyItemEdit(legacy.payload, { kind: "contract", uid: "idx0" }, {
    branch: "Al Ain Butchery", contractType: "Pest Control", companyName: "Y Co", expiryDate: "2027-01-01",
    notes: "", fileUrls: ["p.pdf"], fileNames: ["p.pdf"],
  });
  const c = res.payload.contracts[0];
  expect(c.companyName).toBe("Y Co");
  expect(c.expiryDate).toBe("2027-01-01");
  expect(c.uid).toBeTruthy();
  expect(res.events).toHaveLength(1);
  expect(res.events[0].changes.map((x) => x.field).sort()).toEqual(["companyName", "expiryDate"]);
  expect(res.payload.history).toHaveLength(1);
  expect(legacy.payload.contracts[0].companyName).toBe("X"); // input untouched
});

test("applyItemEdit with no change gives no events", () => {
  const res = applyItemEdit(legacy.payload, { kind: "license", uid: "license" }, {
    branch: "Al Ain Butchery", name: "Trade", expiryDate: "2026-01-01", notes: "", fileUrls: ["a.pdf"], fileNames: [],
  });
  expect(res.events).toHaveLength(0);
});

test("applyItemEdit records a branch move", () => {
  const res = applyItemEdit(legacy.payload, { kind: "license", uid: "license" }, {
    branch: "Al Barsha Butchery", name: "Trade", expiryDate: "2026-01-01", notes: "", fileUrls: ["a.pdf"], fileNames: [],
  });
  expect(res.payload.branch).toBe("Al Barsha Butchery");
  expect(res.events[0].changes[0].field).toBe("branch");
});

test("removeItem drops a contract, then the license empties the record", () => {
  const a = removeItem(legacy.payload, { kind: "contract", uid: "idx0" });
  expect(a.payload.contracts).toHaveLength(0);
  expect(a.empty).toBe(false);
  expect(a.payload.history[0].action).toBe("contract_removed");
  expect(a.payload.history[0].prev.files).toEqual(["p.pdf"]);
  const b = removeItem(a.payload, { kind: "license", uid: "license" });
  expect(b.empty).toBe(true);
  expect(b.payload.history.map((e) => e.action)).toEqual(["contract_removed", "license_removed"]);
});

test("buildSuggestions counts usage and keeps the fixed lists", () => {
  const s = buildSuggestions([legacy, legacy]);
  expect(s.contractTypes[0]).toEqual({ value: "Pest Control", count: 2 });
  expect(s.companies).toEqual([{ value: "X", count: 2 }]);
  expect(s.licenseNames.some((x) => x.value === "Trade License")).toBe(true);
});

test("applyItemEdit: a removed file does not come back from legacy keys", () => {
  const p = { branch: "B", license: { name: "L", files: ["old.pdf"], fileUrl: "old.pdf" } };
  const res = applyItemEdit(p, { kind: "license", uid: "license" }, { branch: "B", name: "L", expiryDate: "", notes: "", fileUrls: [], fileNames: [] });
  expect(flattenRecords([{ id: 1, payload: res.payload }])[0].files).toEqual([]);
});

/* ── several licences per branch (payload.licenses) ── */
const twoLic = {
  id: 9,
  payload: {
    branch: "Al Ain Butchery",
    license: { name: "Trade License", expiryDate: "2026-12-01", fileUrls: ["t.pdf"] },
    licenses: [{ uid: "lind", name: "Industrial License", expiryDate: "2026-12-20", fileUrls: ["i.pdf"] }],
    contracts: [],
  },
};

test("flatten lists the extra licence as its own license row", () => {
  const rows = flattenRecords([twoLic]);
  expect(rows.map((r) => [r.kind, r.uid, r.name])).toEqual([
    ["license", "license", "Trade License"],
    ["license", "lind", "Industrial License"],
  ]);
});

test("renew / edit / remove touch only the extra licence", () => {
  const ren = applyRenewal(twoLic.payload, { kind: "license", uid: "lind" },
    { newExpiry: "2027-12-20", renewedOn: "2026-12-01", files: ["i2.pdf"], fileNames: ["i2.pdf"], keepOldFiles: false, note: "" });
  expect(ren.licenses[0].expiryDate).toBe("2027-12-20");
  expect(ren.license.expiryDate).toBe("2026-12-01");
  expect(ren.history[0].target.uid).toBe("lind");

  const ed = applyItemEdit(twoLic.payload, { kind: "license", uid: "lind" },
    { name: "Industrial License", expiryDate: "2028-01-01", notes: "", fileUrls: ["i.pdf"], fileNames: [] });
  expect(ed.payload.licenses[0].expiryDate).toBe("2028-01-01");
  expect(ed.payload.license.expiryDate).toBe("2026-12-01");
  expect(ed.events[0].target.uid).toBe("lind");

  const rm = removeItem(twoLic.payload, { kind: "license", uid: "lind" });
  expect(rm.payload.licenses).toEqual([]);
  expect(rm.payload.license.name).toBe("Trade License");
  expect(rm.empty).toBe(false);
});

test("diffPayloads logs an added extra licence", () => {
  const base = ensureUids(legacy.payload);
  const ev = diffPayloads(base, { ...base, licenses: [{ uid: "l1", name: "Industrial License", expiryDate: "2027-01-01" }] });
  expect(ev.map((e) => e.action)).toEqual(["license_added"]);
});

/* ── required documents ── */

test("missingRequirements: licence type, old name match, sub-branch via parent, branch-scoped rules", () => {
  const recs = [
    { id: 1, payload: { branch: "QCS", license: { name: "AL QOSAIC", licType: "Trade License", expiryDate: "2027-01-19" }, contracts: [] } },
    { id: 2, payload: { branch: "Barsha", license: { name: "Industrial License", expiryDate: "2027-01-01" }, contracts: [{ uid: "c", contractType: "Pest Control" }] } },
  ];
  const items = flattenRecords(recs);
  const reqs = [
    { id: "t", kind: "license", name: "Trade License", branches: [] },
    { id: "i", kind: "license", name: "Industrial License", branches: [] },
    { id: "p", kind: "contract", name: "Pest Control", branches: ["Barsha"] },
  ];
  const miss = missingRequirements(items, reqs, ["QCS", "Truck", "Barsha"], { Truck: "QCS" });
  expect(miss.map((m) => `${m.branch}:${m.reqId}`).sort()).toEqual(["Barsha:t", "QCS:i"]);
  // the truck's licences come from QCS: its gaps are reported once, on QCS
  expect(miss.some((m) => m.branch === "Truck")).toBe(false);
  expect(docMatches(items[0], "license", "trade license")).toBe(true);
});

test("applyItemEdit stores the licence type and logs it", () => {
  const res = applyItemEdit(legacy.payload, { kind: "license", uid: "license" },
    { name: "Trade", licType: "Trade License", expiryDate: "2026-01-01", notes: "", fileUrls: ["a.pdf"], fileNames: [] });
  expect(res.payload.license.licType).toBe("Trade License");
  expect(res.events[0].changes.map((c) => c.field)).toContain("licType");
});
