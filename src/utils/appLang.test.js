import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { isUnifiedLang, getAppLang, setAppLang, useLangState, LEGACY_LANG_KEYS } from "./appLang";

jest.mock("../config/api", () => ({ __esModule: true, default: "", API_BASE: "", IMAGE_API_BASE: "" }));

function signIn(user) {
  localStorage.setItem("currentUser", JSON.stringify({ username: "u1", ...user }));
}

function Probe({ id, initial = "en", echoEvent }) {
  const [lang, setLang] = useLangState(initial);
  React.useEffect(() => {
    if (!echoEvent) return undefined;
    // Like settingsI18n / hseShared: an old listener that feeds the event back.
    const on = (e) => setLang(e.detail);
    window.addEventListener(echoEvent, on);
    return () => window.removeEventListener(echoEvent, on);
  }, [echoEvent, setLang]);
  return <span data-testid={id} onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}>{lang}</span>;
}

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
function mount(ui) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  // eslint-disable-next-line testing-library/no-unnecessary-act -- React's own root, not Testing Library
  act(() => { root.render(ui); });
  return { byId: (id) => host.querySelector(`[data-testid="${id}"]`) };
}
afterEach(() => { if (root) act(() => root.unmount()); root = null; if (host) host.remove(); });

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

test("Al Mawashi (company 1) is unified; other companies are not", () => {
  signIn({ companyId: 1 });
  expect(isUnifiedLang()).toBe(true);
  signIn({ companyId: 7 });
  expect(isUnifiedLang()).toBe(false);
  signIn({ isSuperAdmin: true, companyId: null });
  localStorage.setItem("activeCompany", JSON.stringify({ id: 1 }));
  expect(isUnifiedLang()).toBe(true);
});

test("one change moves every section, saves on the server and writes the old keys", async () => {
  signIn({ companyId: 1, uiLang: "en" });
  const { byId } = mount(<><Probe id="a" /><Probe id="b" echoEvent="settings_lang_changed" /></>);
  act(() => { byId("a").click(); });
  expect(byId("a").textContent).toBe("ar");
  expect(byId("b").textContent).toBe("ar");
  expect(getAppLang()).toBe("ar");
  expect(JSON.parse(localStorage.getItem("currentUser")).uiLang).toBe("ar");
  LEGACY_LANG_KEYS.forEach((k) => expect(localStorage.getItem(k)).toBe("ar"));
  // Exactly one save, even with an echoing listener mounted.
  await new Promise((r) => setTimeout(r, 0)); // the save loads config/api lazily
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ lang: "ar" });
});

test("each account keeps its own language", () => {
  signIn({ companyId: 1, uiLang: "ar" });
  expect(getAppLang()).toBe("ar");
  signIn({ username: "u2", companyId: 1, uiLang: "en" });
  expect(getAppLang()).toBe("en");
});

test("other companies keep the old per-page state", () => {
  signIn({ companyId: 7 });
  const { byId } = mount(<><Probe id="a" /><Probe id="b" /></>);
  act(() => { byId("a").click(); });
  expect(byId("a").textContent).toBe("ar");
  expect(byId("b").textContent).toBe("en");
  expect(global.fetch).not.toHaveBeenCalled();
  setAppLang("ar"); // no-op for the page state of company 7
  expect(byId("b").textContent).toBe("en");
});
