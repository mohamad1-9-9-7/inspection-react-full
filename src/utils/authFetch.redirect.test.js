// A 401 signs the user out — except on a call that opted out with
// `authRedirect: false` (the Excel backup's admin-only tables), which must
// get the 401 back without the session being wiped mid-backup.
// config/api reads import.meta, which Jest cannot parse
jest.mock("../config/api", () => ({ API_BASE: "https://api.test", IMAGE_API_BASE: "" }));
jest.mock("./reportWindow", () => ({
  windowRuleForType: () => null, canSeeFullHistory: () => true, filterRowsByWindow: (t, r) => r,
}));
const API_BASE = "https://api.test";

class FakeResponse {
  constructor(status) { this.status = status; this.ok = status < 400; this.headers = new Map(); }
  clone() { return new FakeResponse(this.status); }
  async json() { return {}; }
}

beforeAll(() => {
  // a plain function: CRA runs Jest with resetMocks, which would blank a jest.fn
  window.fetch = () => Promise.resolve(new FakeResponse(401));
  require("./authFetch");
});

beforeEach(() => {
  localStorage.setItem("authToken", "tok");
  localStorage.setItem("currentUser", "{\"username\":\"qa\"}");
});

test("a 401 with authRedirect:false keeps the session", async () => {
  const res = await window.fetch(`${API_BASE}/api/audit?limit=500`, { authRedirect: false });
  expect(res.status).toBe(401);
  expect(localStorage.getItem("authToken")).toBe("tok");
  expect(localStorage.getItem("currentUser")).not.toBeNull();
});

test("a plain 401 still clears the session", async () => {
  const res = await window.fetch(`${API_BASE}/api/app-users`);
  expect(res.status).toBe(401);
  expect(localStorage.getItem("authToken")).toBeNull();
});
