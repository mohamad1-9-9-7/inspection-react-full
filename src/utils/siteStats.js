// src/utils/siteStats.js
// First-party visitor stats for the public pages (/demo, /readiness, /).
//
// Cookieless and anonymous: events are folded into daily counters on our own
// server (POST /api/site-stats → site_stats table) — no IPs, no visitor ids,
// no third-party script. The figures show in Platform Center → Demo Requests.
//
// Not counted: localhost / LAN (development), automated browsers, anyone
// signed in on this browser (staff and the owner), and any browser that once
// opened a page with ?notrack=1 (undo with ?notrack=0).
//
// Usage: const track = useSiteStats("demo", lang, ["features", "pricing"]);
//        track("cta", "hero");
import { useCallback, useEffect, useRef } from "react";
import API_BASE from "../config/api";
import { isShareableOrigin } from "../config/publicOrigin";
import { getCurrentUser } from "./perms";

const OPT_OUT_KEY = "ip_stats_off";
const SOURCE_KEY = "ip_stats_src";

let enabledCache = null;
function enabled() {
  if (enabledCache !== null) return enabledCache;
  let on = true;
  try {
    const flag = new URLSearchParams(window.location.search).get("notrack");
    if (flag === "1") localStorage.setItem(OPT_OUT_KEY, "1");
    if (flag === "0") localStorage.removeItem(OPT_OUT_KEY);
    if (localStorage.getItem(OPT_OUT_KEY) === "1") on = false;
  } catch { /* storage blocked — still count */ }
  if (navigator.webdriver) on = false;
  if (getCurrentUser()?.username) on = false;
  if (!isShareableOrigin(window.location.origin)) on = false;
  enabledCache = on;
  return on;
}

/* Where the visit came from: ?src= / utm_source first, else the referring
   site, else "direct". Kept for the tab's session, so moving between the
   public pages keeps the original source. */
function sourceOf() {
  try {
    const kept = sessionStorage.getItem(SOURCE_KEY);
    if (kept) return kept;
  } catch { /* ignore */ }
  const q = new URLSearchParams(window.location.search);
  let src = q.get("src") || q.get("utm_source") || "";
  if (!src) {
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      if (!host) src = "direct";
      else if (host === window.location.hostname) src = "direct";
      else if (/(^|\.)google\./.test(host)) src = "google";
      else if (/(^|\.)bing\./.test(host)) src = "bing";
      else if (/linkedin|lnkd\.in/.test(host)) src = "linkedin";
      else if (/facebook|fb\.com|fb\.me/.test(host)) src = "facebook";
      else if (/instagram/.test(host)) src = "instagram";
      else if (/^t\.co$|twitter|^x\.com$/.test(host)) src = "x";
      else if (/whatsapp|wa\.me/.test(host)) src = "whatsapp";
      else src = host;
    } catch { src = "direct"; }
  }
  src = String(src).slice(0, 40);
  try { sessionStorage.setItem(SOURCE_KEY, src); } catch { /* ignore */ }
  return src;
}

function deviceOf() {
  const w = window.innerWidth || 1200;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  if (w < 768) return "mobile";
  if (w < 1100 && touch) return "tablet";
  return "desktop";
}

const countryOf = () => document.querySelector('meta[name="x-country"]')?.getAttribute("content") || "";

/* ── batching: a visit sends one or two small requests, not one per event ── */
let queue = [];
let timer = null;
const ctx = { page: "", lang: "en" };

function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const events = queue.splice(0, 25);
  const body = JSON.stringify({ page: ctx.page, lang: ctx.lang, source: sourceOf(), country: countryOf(), device: deviceOf(), events });
  try {
    fetch(`${API_BASE}/api/site-stats`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* stats never block the page */ }
  if (queue.length) flush();
}

let listening = false;
function listenForExit() {
  if (listening) return;
  listening = true;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}

export function trackEvent(page, e, d = "") {
  if (!enabled()) return;
  if (ctx.page && ctx.page !== page) flush(); // one batch = one page
  ctx.page = page;
  queue.push(d ? { e, d: String(d).slice(0, 30) } : { e });
  listenForExit();
  if (!timer) timer = setTimeout(flush, 2500);
}

const today = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10); // Dubai day, like the server

/** view (every load) + visit (once a day per page per browser) + how far down
    the page the visitor got (`sections` = element ids, each counted once). */
export function useSiteStats(page, lang, sections = []) {
  ctx.lang = lang === "ar" ? "ar" : "en";
  const sectionKey = sections.join(",");
  const seen = useRef(new Set());

  useEffect(() => {
    trackEvent(page, "view");
    try {
      const k = `ip_stats_visit_${page}`;
      if (localStorage.getItem(k) !== today()) {
        localStorage.setItem(k, today());
        trackEvent(page, "visit");
      }
    } catch { trackEvent(page, "visit"); }
  }, [page]);

  useEffect(() => {
    if (!sectionKey || !enabled() || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting || seen.current.has(en.target.id)) return;
        seen.current.add(en.target.id);
        trackEvent(page, "reach", en.target.id);
        io.unobserve(en.target);
      });
    }, { threshold: 0.25 });
    // Some sections appear only after the page's config arrives — look again shortly.
    const attach = () => sectionKey.split(",").forEach((id) => {
      const el = document.getElementById(id);
      if (el && !seen.current.has(id)) io.observe(el);
    });
    attach();
    const again = setTimeout(attach, 2500);
    return () => { clearTimeout(again); io.disconnect(); };
  }, [page, sectionKey]);

  return useCallback((e, d) => trackEvent(page, e, d), [page]);
}
