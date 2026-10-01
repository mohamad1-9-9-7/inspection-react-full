// Double-tap guard: an identical POST /api/reports within a minute must reach
// the server once; anything else (different sheet, failed first try, reads)
// must go through untouched.
// config/api reads import.meta, which Jest cannot parse
jest.mock("../config/api", () => ({ API_BASE: "https://api.test", IMAGE_API_BASE: "" }));
jest.mock("./reportWindow", () => ({
  windowRuleForType: () => null, canSeeFullHistory: () => true, filterRowsByWindow: (t, r) => r,
}));
const API_BASE = "https://api.test";

/* jsdom has no fetch Response — the wrapper only needs these members. */
class FakeResponse {
  constructor(body, status) { this._body = body; this.status = status; this.ok = status < 400; this.headers = new Map(); }
  clone() { return new FakeResponse(this._body, this.status); }
  async json() { return JSON.parse(this._body); }
}

let calls;
let nextStatus;

beforeAll(() => {
  calls = [];
  nextStatus = 201;
  // a plain function: CRA runs Jest with resetMocks, which would blank a jest.fn
  window.fetch = (input, init) => {
    calls.push({ input, init });
    const status = nextStatus;
    return Promise.resolve(new FakeResponse(JSON.stringify({ ok: status < 400, id: calls.length }), status));
  };
  // installs the wrapper over the mock above
  require("./authFetch");
});

beforeEach(() => {
  calls.length = 0;
  nextStatus = 201;
});

const post = (payload, type = "pos10_personal_hygiene") =>
  window.fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "pos10", type, payload }),
  });

test("two taps of the same sheet file one record", async () => {
  const a = post({ reportDate: "2026-09-17", entries: [1, 2], savedAt: 1, _outboxId: "a" });
  const b = post({ reportDate: "2026-09-17", entries: [1, 2], savedAt: 2, _outboxId: "b" });
  const [ra, rb] = await Promise.all([a, b]);
  expect(calls).toHaveLength(1);
  // both callers can read their own body
  expect((await ra.json()).id).toBe(1);
  expect((await rb.json()).id).toBe(1);
});

test("a different sheet still goes out", async () => {
  await post({ reportDate: "2026-09-18", entries: [1] });
  await post({ reportDate: "2026-09-18", entries: [1, 2] });
  expect(calls).toHaveLength(2);
});

test("a failed first save does not block the retry", async () => {
  nextStatus = 500;
  await post({ reportDate: "2026-09-19", entries: [9] });
  nextStatus = 201;
  await post({ reportDate: "2026-09-19", entries: [9] });
  expect(calls).toHaveLength(2);
});

test("updates (PUT) are never collapsed", async () => {
  const put = () => window.fetch(`${API_BASE}/api/reports/5`, {
    method: "PUT",
    body: JSON.stringify({ type: "x", payload: { a: 1 } }),
  });
  await put();
  await put();
  expect(calls).toHaveLength(2);
});
