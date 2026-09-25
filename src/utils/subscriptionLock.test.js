import { isLocked, needsRefresh, SUB_CACHE_MAX_AGE } from "./subscriptionLock";

const NOW = new Date(2026, 8, 25, 10, 0); // 25 Sep 2026, local
const tenant = { companyId: 2 };
const owner = { isSuperAdmin: true, companyId: null };
const cache = (over) => ({ companyId: 2, status: "active", end_date: "2026-12-31", ...over });

describe("in-app subscription lock", () => {
  test("an active company inside its dates is let through", () => {
    expect(isLocked(tenant, cache(), NOW)).toBe(false);
  });

  test("expired or suspended locks", () => {
    expect(isLocked(tenant, cache({ status: "expired" }), NOW)).toBe(true);
    expect(isLocked(tenant, cache({ status: "suspended" }), NOW)).toBe(true);
  });

  test("the end date itself is still usable; the day after is not (server rule)", () => {
    expect(isLocked(tenant, cache({ end_date: "2026-09-25" }), NOW)).toBe(false);
    expect(isLocked(tenant, cache({ end_date: "2026-09-24" }), NOW)).toBe(true);
    expect(isLocked(tenant, cache({ end_date: "2026-09-24T20:00:00.000Z" }), NOW)).toBe(true);
  });

  test("the platform owner is never locked, whatever is cached", () => {
    expect(isLocked(owner, cache({ status: "expired" }), NOW)).toBe(false);
  });

  test("another company's cache never locks this account (the old Al Mawashi bug)", () => {
    expect(isLocked(tenant, cache({ companyId: 1, status: "expired" }), NOW)).toBe(false);
  });

  test("a cache written before the fix (no companyId) is ignored", () => {
    expect(isLocked(tenant, { status: "expired", end_date: "2020-01-01" }, NOW)).toBe(false);
  });

  test("refresh when stale or when it belongs to another company, never for the owner", () => {
    const t = NOW.getTime();
    expect(needsRefresh(tenant, { companyId: 2, fetchedAt: t }, t)).toBe(false);
    expect(needsRefresh(tenant, { companyId: 2, fetchedAt: t - SUB_CACHE_MAX_AGE }, t)).toBe(true);
    expect(needsRefresh(tenant, { companyId: 1, fetchedAt: t }, t)).toBe(true);
    expect(needsRefresh(owner, {}, t)).toBe(false);
  });
});
