/* eslint-disable testing-library/no-unnecessary-act -- plain React act(), no Testing Library here */
// Smoke test: every EXALTIS screen the manifest can open mounts, loads its
// data (an empty server) and renders without throwing.
//
// Its job is to guard refactors (item 6 splits the big files): the same
// screens must still mount afterwards. Nothing here judges the layout.
import React, { Suspense, act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TextEncoder, TextDecoder } from "util";
import manifest from "../manifest";

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

// config/api.js reads import.meta (fine for webpack, a syntax error for Jest).
jest.mock("../../../config/api", () => ({
  __esModule: true,
  default: "http://api.test",
  API_BASE: "http://api.test",
  IMAGE_API_BASE: "http://api.test",
}));

/* An empty but well-formed server: every list is empty, every save "works". */
function emptyServer() {
  const body = { ok: true, data: [], rows: [], items: [], reports: [], users: [], companies: [], report: null };
  // A plain function, not jest.fn(): CRA's Jest config resets mocks before
  // every test, which would leave fetch returning undefined after the first.
  return async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => body,
    text: async () => JSON.stringify(body),
    blob: async () => new Blob([]),
    clone() { return this; },
  });
}

beforeAll(() => {
  global.fetch = emptyServer();
  window.fetch = global.fetch;
  window.scrollTo = () => {};
  window.alert = () => {};
  window.confirm = () => true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  global.IntersectionObserver = global.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };
  window.URL.createObjectURL = window.URL.createObjectURL || (() => "blob:x");
  localStorage.setItem("currentUser", JSON.stringify({
    username: "smoke", displayName: "Smoke Test", isAdmin: true, isSuperAdmin: false,
    permissions: ["*"], crudPerms: {}, companyId: 4, companyIndustry: "sweets", companyModule: "exaltis", companyName: "EXALTIS",
  }));
});

/* Every screen the manifest can open: report entry/view pages, hubs, pairs. */
function screensOf(m) {
  const out = [];
  for (const card of m.cards || []) {
    for (const r of card.reports || []) {
      if (r.Input) out.push([`${card.id} · ${r.type} · input`, r.Input]);
      if (r.View) out.push([`${card.id} · ${r.type} · view`, r.View]);
    }
    if (card.Hub) out.push([`${card.id} · hub`, card.Hub]);
    if (card.Input) out.push([`${card.id} · input`, card.Input]);
    if (card.View) out.push([`${card.id} · view`, card.View]);
  }
  // one entry per component (viewer and entry cards share the same pages)
  const seen = new Set();
  return out.filter(([, C]) => (seen.has(C) ? false : seen.add(C)));
}

class Catch extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { this.props.onError(error); }
  render() { return this.state.error ? null : this.props.children; }
}

const SCREENS = screensOf(manifest);

test("the manifest exposes screens", () => {
  expect(SCREENS.length).toBeGreaterThan(20);
});

test.each(SCREENS)("%s renders", async (_name, Screen) => {
  let crash = null;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <Catch onError={(e) => { crash = e; }}>
          <Suspense fallback={<i data-loading="1" />}>
            <Screen />
          </Suspense>
        </Catch>
      </MemoryRouter>
    );
  });
  // let the lazy chunk resolve and the first data load settle
  for (let i = 0; i < 20 && el.querySelector("[data-loading]"); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  }
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const html = el.innerHTML;
  act(() => root.unmount());
  el.remove();
  expect(crash).toBeNull();
  expect(html.length).toBeGreaterThan(0);
}, 20000);
