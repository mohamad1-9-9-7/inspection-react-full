import { addPeriod, statusOf, flattenRecords, diffPayloads, applyRenewal, ensureUids, documentVersions } from "./licensesKit";

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
