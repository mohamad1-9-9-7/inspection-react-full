// src/pages/SelectCompany.jsx
// PLATFORM CENTER — the super-admin's home, OUTSIDE every company. Tabs:
//   🏢 Companies            enter a company (below)
//   👥 Accounts & Perms     every company's accounts; the permission list
//                           follows the account's company (AccountsManagementTab)
//   💳 Billing              companies (disable / re-enable), plans, invoices,
//                           quotations, seller profile (BillingPlansTab)
//   🛡️ Security & Server    security controls
// None of these live in a company's own Settings any more.
//
// Companies tab — one card per company, shown right after
// login for a super-admin account only. Picking one sets the active company
// context (utils/companyContext.js) that authFetch.js then attaches to every
// scoped API call, and sends the owner into the normal dashboard "as" that
// company. Regular accounts never see this screen — their company is fixed
// by their own login token, so App.jsx never routes them here.
//
// Layout: a full-viewport app shell (sidebar + scrolling main area) that
// fills the screen at any size; below 900px the sidebar folds into a top bar.
// Styling lives in PC_CSS, not inline styles: globals.css forces
// `#root * { font-size:14px !important }`, so sizes need the doubled-class
// `#root .pc.pc` escape (see ProductTracePage.jsx for the same pattern).
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../config/api";
import logo from "../assets/almawashi-logo.jpg";
import { setActiveCompany, clearActiveCompany } from "../utils/companyContext";
import { clearAppSession } from "../utils/authFetch";

const AccountsManagementTab = lazy(() => import("./settings/AccountsManagementTab"));
const BillingPlansTab       = lazy(() => import("./settings/BillingPlansTab"));
const SecurityControlsTab   = lazy(() => import("./settings/SecurityControlsTab"));

const CENTER_TABS = [
  { id: "companies", icon: "🏢", label: "Companies",              ar: "الشركات",             hint: "Pick a company to work inside it" },
  { id: "accounts",  icon: "👥", label: "Accounts & Permissions", ar: "الحسابات والصلاحيات", hint: "Every company's accounts and what they can open" },
  { id: "billing",   icon: "💳", label: "Billing & Subscriptions", ar: "الاشتراكات والفوترة", hint: "Plans, invoices, quotations and company status" },
  { id: "security",  icon: "🛡️", label: "Security & Server",      ar: "الأمان والسيرفر",      hint: "Record deletion, read-only mode, session timeout and screen lock" },
];

const STATUS_META = {
  active:    { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Active" },
  trial:     { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Trial" },
  expired:   { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Expired" },
  suspended: { bg: "#e2e8f0", text: "#475569", dot: "#94a3b8", label: "Suspended" },
  // Disabled: its own accounts are locked out; only the super-admin enters.
  disabled:  { bg: "#1f2937", text: "#f9fafb", dot: "#111827", label: "⛔ Disabled" },
};
const statusKey = (c) => (c.disabled_at ? "disabled" : String(c.status || "active").toLowerCase());

// Which internal system a company opens — drives its colour, icon and the
// "opens X" tag so the owner sees at a glance where a card leads.
function industryMeta(raw) {
  const k = String(raw || "meat").toLowerCase();
  if (k.includes("sweet") || k.includes("confection") || k.includes("bakery") || k.includes("dessert"))
    return { key: "sweets", icon: "🍬", label: "Confectionery", opens: "Generic app", grad: "linear-gradient(135deg,#ec4899,#be185d)", glow: "rgba(190,24,93,.35)", tint: "#be185d" };
  if (k === "meat" || k === "")
    return { key: "meat", icon: "🥩", label: "Meat / Al Mawashi", opens: "Al Mawashi QMS", grad: "linear-gradient(135deg,#0f766e,#0891b2)", glow: "rgba(15,118,110,.35)", tint: "#0f766e" };
  return { key: "generic", icon: "🏭", label: raw || "General", opens: "Generic app", grad: "linear-gradient(135deg,#6366f1,#4f46e5)", glow: "rgba(99,102,241,.35)", tint: "#4f46e5" };
}

const SORTS = {
  name:   { label: "Name (A→Z)", cmp: (a, b) => (a.name || "").localeCompare(b.name || "") },
  status: { label: "Status",     cmp: (a, b) => statusKey(a).localeCompare(statusKey(b)) || (a.name || "").localeCompare(b.name || "") },
  plan:   { label: "Plan",       cmp: (a, b) => (a.plan_name || "~").localeCompare(b.plan_name || "~") || (a.name || "").localeCompare(b.name || "") },
};

function readView() {
  try { return localStorage.getItem("pc_view") === "list" ? "list" : "grid"; } catch { return "grid"; }
}

export default function SelectCompany() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = CENTER_TABS.some((x) => x.id === params.get("tab")) ? params.get("tab") : "companies";
  const tabMeta = CENTER_TABS.find((x) => x.id === tab);
  const setTab = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", id); return n; }, { replace: true });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(new Date());

  // tools
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [view, setViewState] = useState(readView);
  const searchRef = useRef(null);
  const setView = (v) => { setViewState(v); try { localStorage.setItem("pc_view", v); } catch { /* per-viewer convenience only */ } };

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/companies`);
      const d = await r.json();
      if (d.ok) setCompanies(d.companies || []);
      else setErr("Could not load companies.");
    } catch {
      setErr("Could not connect to server.");
    }
    setLoading(false);
  }

  useEffect(() => {
    // بوابة ثانية غير راوت App.jsx: أي حدا وصل هون بدون سوبر أدمن (رابط
    // مباشر، جلسة قديمة...) بيرجع عالداشبورد العادي فوراً.
    if (!currentUser.isSuperAdmin) {
      navigate("/named-dashboard", { replace: true });
      return;
    }
    // The center is OUTSIDE every company: no active company, so the account
    // list and the rest read across all of them (authFetch adds ?company_id
    // only while one is picked).
    clearActiveCompany();
    load();
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" jumps to the search box on the Companies tab (unless already typing).
  useEffect(() => {
    if (tab !== "companies") return undefined;
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && t === searchRef.current) { setQuery(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  // status counts for the stat tiles + filter chips
  const counts = useMemo(() => {
    const c = { all: companies.length, active: 0, trial: 0, expired: 0, suspended: 0, disabled: 0 };
    companies.forEach((x) => { const k = statusKey(x); if (c[k] != null) c[k] += 1; });
    return c;
  }, [companies]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .filter((c) => statusFilter === "all" || statusKey(c) === statusFilter)
      .filter((c) =>
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.plan_name || "").toLowerCase().includes(q) ||
        (c.contact_name || "").toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q)
      )
      .sort(SORTS[sortKey].cmp);
  }, [companies, query, statusFilter, sortKey]);

  function enter(company) {
    setActiveCompany(company);
    // النشاط يقرّر أي نظام يفتح: 'meat' (أو غير محدّد) = داشبورد المواشي،
    // أي نشاط تاني = المحرّك العام المبني من قالب النشاط.
    const industry = company.industry || "meat";
    navigate(industry !== "meat" ? "/company-app" : "/named-dashboard");
  }

  function logout() {
    clearAppSession();
    navigate("/", { replace: true });
  }

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const ownerName = currentUser.displayName || currentUser.name || currentUser.username || "Owner";

  const pct = (n) => (counts.all ? Math.round((n / counts.all) * 100) : 0);
  const STAT_TILES = [
    { key: "all",      icon: "🏢", label: "All companies", val: counts.all,      tint: "#0f766e", share: 100 },
    { key: "active",   icon: "✅", label: "Active",        val: counts.active,   tint: "#10b981", share: pct(counts.active) },
    { key: "trial",    icon: "⏳", label: "Trial",         val: counts.trial,    tint: "#f59e0b", share: pct(counts.trial) },
    { key: "expired",  icon: "⚠️", label: "Expired",       val: counts.expired,  tint: "#ef4444", share: pct(counts.expired) },
    { key: "disabled", icon: "⛔", label: "Disabled",      val: counts.disabled, tint: "#334155", share: pct(counts.disabled) },
  ];
  const FILTERS = [
    { key: "all", label: "All", n: counts.all },
    { key: "active", label: "Active", n: counts.active },
    { key: "trial", label: "Trial", n: counts.trial },
    { key: "expired", label: "Expired", n: counts.expired },
    { key: "suspended", label: "Suspended", n: counts.suspended },
    { key: "disabled", label: "Disabled", n: counts.disabled },
  ];
  const filtered = query.trim() || statusFilter !== "all";

  return (
    <div className="pc pc-shell">
      <style>{PC_CSS}</style>

      {/* ── Sidebar ── */}
      <aside className="pc-side">
        <div aria-hidden="true" className="pc-side-glow" />
        <div className="pc-brand">
          <img src={logo} alt="Al Mawashi" className="pc-logo" />
          <div className="pc-brand-txt">
            <span className="pc-eyebrow">INSPECT PRO</span>
            <span className="pc-brand-name">Platform Center</span>
          </div>
        </div>

        <nav className="pc-nav" role="tablist" aria-label="Platform Center">
          {CENTER_TABS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`pc-nav-btn${tab === x.id ? " on" : ""}`}>
              <span aria-hidden="true" className="pc-nav-ico">{x.icon}</span>
              <span className="pc-nav-txt">
                <span className="pc-nav-label">{x.label}</span>
                <span className="pc-nav-ar" lang="ar">{x.ar}</span>
              </span>
              {x.id === "companies" && <span className="pc-nav-n">{counts.all}</span>}
            </button>
          ))}
        </nav>

        <div className="pc-side-fill" />

        <div className="pc-clock" title={dateStr}>
          <span className="pc-clock-time">{timeStr}</span>
          <span className="pc-clock-date">{dateStr}</span>
          <span className="pc-live"><span className="pc-pulse" /> {counts.active} of {counts.all} companies active</span>
        </div>

        <button type="button" className="pc-logout" onClick={logout}>🚪 Back to Login</button>
        <div className="pc-credit">Built by Eng. Mohammed Abdullah</div>
      </aside>

      {/* ── Main ── */}
      <main className="pc-main">
        <header className="pc-top">
          <div className="pc-top-txt">
            <span className="pc-crumb">Platform Center <span aria-hidden="true">›</span> {tabMeta.label}</span>
            <h1 className="pc-h1"><span aria-hidden="true">{tabMeta.icon}</span> {tab === "companies" ? `${greeting}, ${ownerName}` : tabMeta.label}</h1>
            <p className="pc-sub">{tabMeta.hint}</p>
          </div>
          <div className="pc-top-actions">
            {tab === "companies" && (
              <button type="button" className="pc-btn" onClick={load} disabled={loading}>
                <span className={loading ? "pc-spin-inline" : ""} aria-hidden="true">↻</span> Refresh
              </button>
            )}
            {tab !== "billing" && (
              <button type="button" className="pc-btn" onClick={() => setTab("billing")}>💳 Billing</button>
            )}
          </div>
        </header>

        <div className="pc-content">
          {tab !== "companies" && (
            <section className="pc-panel" key={tab}>
              <Suspense fallback={<div className="pc-empty"><span className="pc-spinner" /> Loading…</div>}>
                {tab === "accounts" && <AccountsManagementTab />}
                {tab === "billing" && <BillingPlansTab />}
                {tab === "security" && <SecurityControlsTab />}
              </Suspense>
            </section>
          )}

          {tab === "companies" && (<>
            {/* ── Stat tiles ── */}
            <section className="pc-stats">
              {STAT_TILES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusFilter(t.key)}
                  className={`pc-stat${statusFilter === t.key ? " on" : ""}`}
                  style={{ "--tint": t.tint }}
                >
                  <span className="pc-stat-head">
                    <span className="pc-stat-ico" aria-hidden="true">{t.icon}</span>
                    <span className="pc-stat-label">{t.label}</span>
                  </span>
                  <span className="pc-stat-val">{loading ? "–" : t.val}</span>
                  <span className="pc-stat-bar"><span style={{ width: `${loading ? 0 : t.share}%` }} /></span>
                  <span className="pc-stat-pct">{loading ? "" : t.key === "all" ? "total" : `${t.share}% of all`}</span>
                </button>
              ))}
            </section>

            {/* ── Toolbar: search · filters · sort · view ── */}
            <section className="pc-toolbar">
              <label className="pc-search">
                <span aria-hidden="true">🔎</span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, plan, contact or industry…"
                  className="pc-search-in"
                />
                {query
                  ? <button type="button" className="pc-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
                  : <kbd className="pc-kbd" title="Press / to search">/</kbd>}
              </label>

              <div className="pc-chips">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`pc-chip${statusFilter === f.key ? " on" : ""}`}
                  >
                    {f.label}<span className="pc-chip-n">{f.n}</span>
                  </button>
                ))}
              </div>

              <div className="pc-tool-end">
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="pc-select" aria-label="Sort">
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>Sort: {v.label}</option>
                  ))}
                </select>
                <div className="pc-seg" role="group" aria-label="View">
                  <button type="button" className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} title="Cards">▦</button>
                  <button type="button" className={view === "list" ? "on" : ""} onClick={() => setView("list")} title="List">☰</button>
                </div>
              </div>
            </section>

            {!loading && !err && companies.length > 0 && (
              <div className="pc-result">
                Showing <b>{visible.length}</b> of {companies.length}
                {filtered && (
                  <button type="button" className="pc-reset" onClick={() => { setQuery(""); setStatusFilter("all"); }}>Clear filters</button>
                )}
              </div>
            )}

            {/* ── Body ── */}
            {loading ? (
              <div className={view === "list" ? "pc-list" : "pc-grid"}>
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`pc-skel${view === "list" ? " row" : ""}`} />)}
              </div>
            ) : err ? (
              <div className="pc-empty err">
                <span className="pc-empty-ico">📡</span>
                {err}
                <button type="button" className="pc-btn light" onClick={load}>↻ Retry</button>
              </div>
            ) : companies.length === 0 ? (
              <div className="pc-empty">
                <span className="pc-empty-ico">🏗️</span>
                No companies yet. Add one from Billing &amp; Subscriptions.
                <button type="button" className="pc-btn light" onClick={() => setTab("billing")}>💳 Open Billing</button>
              </div>
            ) : visible.length === 0 ? (
              <div className="pc-empty">
                <span className="pc-empty-ico">🔍</span>
                <b>No matches</b>
                Try another search term or clear the filter.
              </div>
            ) : view === "list" ? (
              <div className="pc-list">
                {visible.map((c, i) => {
                  const meta = STATUS_META[statusKey(c)] || STATUS_META.active;
                  const ind = industryMeta(c.industry);
                  return (
                    <button key={c.id} type="button" className="pc-row" onClick={() => enter(c)}
                      style={{ "--tint": ind.tint, animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                      <span className="pc-ava sm" style={{ background: ind.grad }}>{c.name?.[0]?.toUpperCase() || "?"}</span>
                      <span className="pc-row-name">{c.name}<span className="pc-row-ind">{ind.icon} {ind.label}</span></span>
                      <span className="pc-row-meta"><span className="pc-k">Plan</span>{c.plan_name || "—"}</span>
                      <span className="pc-row-meta"><span className="pc-k">Contact</span>{c.contact_name || "—"}</span>
                      <span className="pc-badge" style={{ background: meta.bg, color: meta.text }}>
                        <span className="pc-badge-dot" style={{ background: meta.dot }} />{meta.label}
                      </span>
                      <span className="pc-enter">Enter →</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pc-grid">
                {visible.map((c, i) => {
                  const meta = STATUS_META[statusKey(c)] || STATUS_META.active;
                  const ind = industryMeta(c.industry);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="pc-card"
                      style={{ "--grad": ind.grad, "--glow": ind.glow, "--tint": ind.tint, animationDelay: `${Math.min(i, 12) * 0.04}s` }}
                      onClick={() => enter(c)}
                    >
                      <span className="pc-card-band" aria-hidden="true" />
                      <span className="pc-card-top">
                        <span className="pc-ava" style={{ background: ind.grad }}>{c.name?.[0]?.toUpperCase() || "?"}</span>
                        <span className="pc-badge" style={{ background: meta.bg, color: meta.text }}>
                          <span className="pc-badge-dot" style={{ background: meta.dot }} />{meta.label}
                        </span>
                      </span>

                      <span className="pc-card-name">{c.name}</span>
                      <span className="pc-ind"><span aria-hidden="true">{ind.icon}</span> {ind.label}</span>

                      <span className="pc-meta">
                        <span className="pc-meta-row"><span className="pc-k">Plan</span><span className="pc-v">{c.plan_name || "—"}</span></span>
                        <span className="pc-meta-row"><span className="pc-k">Contact</span><span className="pc-v">{c.contact_name || "—"}</span></span>
                      </span>

                      <span className="pc-card-foot">
                        <span className="pc-opens">Opens {ind.opens}</span>
                        <span className="pc-enter">Enter <span aria-hidden="true" className="pc-arrow">→</span></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>)}
        </div>
      </main>
    </div>
  );
}

const PC_CSS = `
@keyframes pcSpin{to{transform:rotate(360deg)}}
@keyframes pcIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pcPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.45}}
@keyframes pcShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}

.pc.pc-shell{
  position:relative; display:grid; grid-template-columns:272px minmax(0,1fr);
  width:100%; height:100vh; height:100dvh; overflow:hidden;
  background:#f1f5f9; color:#0f172a;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.pc button{font-family:inherit}

/* ── sidebar ── */
.pc .pc-side{
  position:relative; overflow:hidden auto; display:flex; flex-direction:column; gap:18px;
  padding:22px 16px 72px; color:#fff;
  background:linear-gradient(170deg,#0b1220 0%,#0f2e35 45%,#0f766e 100%);
  border-right:1px solid rgba(255,255,255,.08);
}
.pc .pc-side-glow{position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(420px 260px at 0% 0%,rgba(45,212,191,.22),transparent 65%),radial-gradient(360px 300px at 100% 100%,rgba(125,211,252,.18),transparent 60%)}
.pc .pc-side > *{position:relative}
.pc .pc-brand{display:flex; align-items:center; gap:12px; padding:4px 6px 16px; border-bottom:1px solid rgba(255,255,255,.1)}
.pc .pc-logo{width:48px; height:48px; border-radius:12px; object-fit:cover; background:#fff; box-shadow:0 10px 24px rgba(0,0,0,.35); flex-shrink:0}
.pc .pc-brand-txt{display:grid; gap:2px; min-width:0}
.pc .pc-nav{display:grid; gap:6px}
.pc .pc-nav-btn{display:flex; align-items:center; gap:12px; width:100%; text-align:start; padding:11px 12px; border-radius:12px;
  border:1px solid transparent; background:transparent; color:rgba(255,255,255,.78); cursor:pointer; transition:background .15s, color .15s, border-color .15s}
.pc .pc-nav-btn:hover{background:rgba(255,255,255,.08); color:#fff}
.pc .pc-nav-btn.on{background:rgba(255,255,255,.16); border-color:rgba(255,255,255,.22); color:#fff; box-shadow:inset 3px 0 0 #2dd4bf, 0 10px 22px rgba(0,0,0,.18)}
.pc .pc-nav-ico{width:34px; height:34px; border-radius:10px; display:grid; place-items:center; background:rgba(255,255,255,.1); flex-shrink:0}
.pc .pc-nav-btn.on .pc-nav-ico{background:linear-gradient(135deg,#14b8a6,#0891b2)}
.pc .pc-nav-txt{display:grid; gap:1px; min-width:0; flex:1}
.pc .pc-nav-label{font-weight:800; line-height:1.2}
.pc .pc-nav-ar{opacity:.65; font-weight:700}
.pc .pc-nav-n{min-width:26px; text-align:center; padding:2px 8px; border-radius:999px; background:rgba(45,212,191,.25); font-weight:900}
.pc .pc-side-fill{flex:1}
.pc .pc-clock{display:grid; gap:4px; padding:14px; border-radius:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12)}
.pc .pc-clock-time{font-weight:900; letter-spacing:.02em; line-height:1}
.pc .pc-clock-date{color:rgba(255,255,255,.7); font-weight:700}
.pc .pc-live{display:flex; align-items:center; gap:8px; margin-top:6px; color:#a7f3d0; font-weight:800}
.pc .pc-pulse{width:9px; height:9px; border-radius:999px; background:#22c55e; box-shadow:0 0 12px rgba(34,197,94,.9); animation:pcPulse 2.1s ease-in-out infinite; flex-shrink:0}
.pc .pc-logout{min-height:44px; border-radius:12px; border:1px solid rgba(254,202,202,.3); background:rgba(220,38,38,.28); color:#fff; font-weight:800; cursor:pointer}
.pc .pc-logout:hover{background:rgba(220,38,38,.45)}
.pc .pc-credit{text-align:center; color:rgba(255,255,255,.5); font-weight:700}

/* ── main ── */
.pc .pc-main{display:flex; flex-direction:column; min-width:0; min-height:0; overflow:auto;
  background:radial-gradient(1200px 500px at 100% -10%,rgba(20,184,166,.10),transparent 60%),linear-gradient(180deg,#f8fafc,#eef4f7)}
.pc .pc-top{display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:16px;
  padding:26px clamp(18px,3vw,44px) 18px}
.pc .pc-top-txt{display:grid; gap:4px; min-width:0}
.pc .pc-crumb{color:#64748b; font-weight:800}
.pc .pc-h1{margin:0; font-weight:900; line-height:1.15; color:#0f172a}
.pc .pc-sub{margin:0; color:#64748b; font-weight:600}
.pc .pc-top-actions{display:flex; gap:10px; flex-wrap:wrap}
.pc .pc-btn{min-height:42px; padding:0 16px; border-radius:11px; border:1px solid rgba(15,23,42,.12); background:#fff; color:#0f172a; font-weight:800; cursor:pointer;
  box-shadow:0 6px 16px rgba(15,23,42,.06); display:inline-flex; align-items:center; gap:8px; transition:transform .12s, box-shadow .12s}
.pc .pc-btn:hover:not(:disabled){transform:translateY(-1px); box-shadow:0 10px 22px rgba(15,23,42,.1)}
.pc .pc-btn:disabled{opacity:.6; cursor:default}
.pc .pc-spin-inline{display:inline-block; animation:pcSpin .8s linear infinite}
.pc .pc-content{flex:1; display:flex; flex-direction:column; gap:16px; padding:0 clamp(18px,3vw,44px) 32px}

.pc .pc-panel{flex:1; border-radius:18px; background:#fff; border:1px solid rgba(15,23,42,.08); box-shadow:0 14px 34px rgba(15,23,42,.06);
  padding:clamp(10px,1.6vw,22px); animation:pcIn .25s ease both}

/* stat tiles */
.pc .pc-stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px}
.pc .pc-stat{position:relative; display:grid; gap:8px; text-align:start; padding:16px 18px; border-radius:16px; background:#fff; cursor:pointer;
  border:1px solid rgba(15,23,42,.08); box-shadow:0 10px 26px rgba(15,23,42,.06); transition:transform .15s, box-shadow .15s, border-color .15s; overflow:hidden}
.pc .pc-stat::before{content:""; position:absolute; inset:0 auto 0 0; width:4px; background:var(--tint)}
.pc .pc-stat:hover{transform:translateY(-2px); box-shadow:0 16px 32px rgba(15,23,42,.1)}
.pc .pc-stat.on{border-color:var(--tint); box-shadow:0 0 0 3px color-mix(in srgb,var(--tint) 18%,transparent),0 16px 32px rgba(15,23,42,.1)}
.pc .pc-stat-head{display:flex; align-items:center; gap:8px}
.pc .pc-stat-ico{width:30px; height:30px; border-radius:9px; display:grid; place-items:center; background:color-mix(in srgb,var(--tint) 12%,#fff)}
.pc .pc-stat-label{color:#475569; font-weight:800}
.pc .pc-stat-val{font-weight:900; line-height:1; color:#0f172a}
.pc .pc-stat-bar{height:6px; border-radius:999px; background:#eef2f6; overflow:hidden}
.pc .pc-stat-bar > span{display:block; height:100%; border-radius:999px; background:var(--tint); transition:width .6s ease}
.pc .pc-stat-pct{color:#94a3b8; font-weight:700}

/* toolbar */
.pc .pc-toolbar{position:sticky; top:0; z-index:5; display:grid; grid-template-columns:minmax(240px,1.2fr) auto auto; gap:12px; align-items:center;
  padding:10px; margin:0 -10px; border-radius:16px; background:rgba(241,245,249,.86); backdrop-filter:blur(10px)}
.pc .pc-search{display:flex; align-items:center; gap:10px; min-height:46px; padding:0 14px; border-radius:12px; background:#fff; border:1px solid rgba(15,23,42,.12);
  box-shadow:0 8px 20px rgba(15,23,42,.06); transition:border-color .15s, box-shadow .15s}
.pc .pc-search:focus-within{border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.18)}
.pc .pc-search-in{flex:1; min-width:0; border:none; outline:none; background:transparent; color:#0f172a; font-weight:700; font-family:inherit}
.pc .pc-clear{border:none; background:#f1f5f9; color:#64748b; border-radius:8px; width:26px; height:26px; cursor:pointer; font-weight:900; flex-shrink:0}
.pc .pc-kbd{border:1px solid #cbd5e1; border-bottom-width:2px; border-radius:6px; padding:0 7px; color:#64748b; background:#f8fafc; font-family:inherit; font-weight:800}
.pc .pc-chips{display:flex; flex-wrap:wrap; gap:4px; padding:4px; border-radius:12px; background:#fff; border:1px solid rgba(15,23,42,.1)}
.pc .pc-chip{display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; color:#475569; font-weight:800; padding:8px 11px; border-radius:9px; cursor:pointer}
.pc .pc-chip:hover{background:#f1f5f9}
.pc .pc-chip.on{background:linear-gradient(135deg,#0f766e,#0891b2); color:#fff; box-shadow:0 6px 14px rgba(15,118,110,.3)}
.pc .pc-chip-n{font-weight:900; opacity:.85; background:rgba(15,23,42,.08); border-radius:999px; padding:0 7px}
.pc .pc-chip.on .pc-chip-n{background:rgba(255,255,255,.22)}
.pc .pc-tool-end{display:flex; gap:8px; align-items:center; justify-content:flex-end}
.pc .pc-select{min-height:46px; padding:0 12px; border-radius:12px; border:1px solid rgba(15,23,42,.12); background:#fff; color:#334155; font-weight:800; font-family:inherit; cursor:pointer}
.pc .pc-seg{display:flex; padding:4px; gap:2px; border-radius:12px; background:#fff; border:1px solid rgba(15,23,42,.1)}
.pc .pc-seg button{width:38px; height:36px; border:none; border-radius:9px; background:transparent; color:#64748b; cursor:pointer; font-weight:900}
.pc .pc-seg button.on{background:#0f766e; color:#fff}
.pc .pc-result{display:flex; align-items:center; gap:12px; color:#64748b; font-weight:700; margin-top:-6px}
.pc .pc-result b{color:#0f172a}
.pc .pc-reset{border:none; background:none; color:#0f766e; font-weight:800; cursor:pointer; text-decoration:underline; padding:0}

/* cards */
.pc .pc-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr)); gap:18px}
.pc .pc-card{position:relative; display:flex; flex-direction:column; gap:10px; text-align:start; padding:22px 22px 18px; min-height:236px; border-radius:18px;
  background:#fff; border:1px solid rgba(15,23,42,.08); box-shadow:0 12px 30px rgba(15,23,42,.07); cursor:pointer; overflow:hidden;
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease; animation:pcIn .32s ease both}
.pc .pc-card-band{position:absolute; inset:0 0 auto 0; height:84px; background:var(--grad); opacity:.1; transition:opacity .18s}
.pc .pc-card:hover, .pc .pc-card:focus-visible{transform:translateY(-4px); border-color:var(--tint); box-shadow:0 26px 50px var(--glow); outline:none}
.pc .pc-card:hover .pc-card-band, .pc .pc-card:focus-visible .pc-card-band{opacity:.18}
.pc .pc-card > span{position:relative}
.pc .pc-card-top{display:flex; align-items:center; justify-content:space-between; gap:10px}
.pc .pc-ava{width:54px; height:54px; border-radius:15px; display:grid; place-items:center; color:#fff; font-weight:900; flex-shrink:0; box-shadow:0 12px 24px var(--glow, rgba(15,23,42,.2))}
.pc .pc-ava.sm{width:42px; height:42px; border-radius:12px; box-shadow:none}
.pc .pc-badge{display:inline-flex; align-items:center; gap:6px; font-weight:800; border-radius:999px; padding:4px 11px; white-space:nowrap}
.pc .pc-badge-dot{width:7px; height:7px; border-radius:999px}
.pc .pc-card-name{font-weight:900; color:#0f172a; line-height:1.2; margin-top:4px}
.pc .pc-ind{display:inline-flex; align-items:center; gap:7px; width:fit-content; font-weight:800; color:var(--tint); background:color-mix(in srgb,var(--tint) 9%,#fff); border-radius:999px; padding:4px 12px}
.pc .pc-meta{flex:1; display:grid; gap:6px; align-content:start; padding-top:4px}
.pc .pc-meta-row{display:flex; justify-content:space-between; gap:10px}
.pc .pc-k{color:#94a3b8; font-weight:700}
.pc .pc-v{color:#334155; font-weight:800; text-align:end; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pc .pc-card-foot{display:flex; align-items:center; justify-content:space-between; gap:10px; padding-top:12px; border-top:1px dashed #e2e8f0}
.pc .pc-opens{color:#94a3b8; font-weight:700}
.pc .pc-enter{font-weight:900; color:var(--tint, #0f766e); white-space:nowrap}
.pc .pc-arrow{display:inline-block; transition:transform .18s}
.pc .pc-card:hover .pc-arrow{transform:translateX(4px)}

/* list view */
.pc .pc-list{display:grid; gap:8px}
.pc .pc-row{display:grid; grid-template-columns:auto minmax(180px,1.6fr) minmax(110px,1fr) minmax(110px,1fr) auto 90px; gap:16px; align-items:center;
  text-align:start; padding:12px 18px; border-radius:14px; background:#fff; border:1px solid rgba(15,23,42,.08); cursor:pointer;
  box-shadow:0 6px 16px rgba(15,23,42,.04); transition:border-color .15s, box-shadow .15s, transform .15s; animation:pcIn .28s ease both}
.pc .pc-row:hover, .pc .pc-row:focus-visible{border-color:var(--tint); box-shadow:0 12px 28px rgba(15,23,42,.1); transform:translateX(3px); outline:none}
.pc .pc-row-name{display:grid; gap:2px; font-weight:900; color:#0f172a; min-width:0}
.pc .pc-row-ind{color:#64748b; font-weight:700}
.pc .pc-row-meta{display:grid; gap:1px; color:#334155; font-weight:800; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pc .pc-row .pc-enter{text-align:end}

/* states */
.pc .pc-empty{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:56px 20px; text-align:center;
  border-radius:18px; background:#fff; border:1px dashed #cbd5e1; color:#64748b; font-weight:700}
.pc .pc-empty.err{color:#991b1b; border-color:#fca5a5; background:#fff7f7}
.pc .pc-empty b{color:#0f172a}
.pc .pc-empty-ico{line-height:1}
.pc .pc-btn.light{margin-top:6px}
.pc .pc-spinner{width:26px; height:26px; border-radius:50%; border:3px solid rgba(15,118,110,.25); border-top-color:#0f766e; display:inline-block; animation:pcSpin .8s linear infinite}
.pc .pc-skel{height:236px; border-radius:18px; border:1px solid rgba(15,23,42,.06);
  background:linear-gradient(90deg,#fff 0%,#eef2f6 50%,#fff 100%); background-size:800px 100%; animation:pcShimmer 1.3s linear infinite}
.pc .pc-skel.row{height:68px; border-radius:14px}

/* type scale — must out-rank globals.css #root * {font-size:14px !important} */
#root .pc.pc .pc-eyebrow{font-size:11px !important; font-weight:900; letter-spacing:.12em; color:#5eead4}
#root .pc.pc .pc-brand-name{font-size:18px !important; font-weight:900; line-height:1.1}
#root .pc.pc .pc-nav-ico{font-size:17px !important}
#root .pc.pc .pc-nav-label{font-size:14px !important}
#root .pc.pc .pc-nav-ar{font-size:12px !important}
#root .pc.pc .pc-nav-n{font-size:12px !important}
#root .pc.pc .pc-clock-time{font-size:30px !important}
#root .pc.pc .pc-clock-date, #root .pc.pc .pc-live{font-size:12.5px !important}
#root .pc.pc .pc-credit{font-size:11.5px !important}
#root .pc.pc .pc-crumb{font-size:12.5px !important}
#root .pc.pc .pc-h1, #root .pc.pc .pc-h1 *{font-size:clamp(22px,2.2vw,30px) !important}
#root .pc.pc .pc-sub{font-size:14.5px !important}
#root .pc.pc .pc-stat-ico{font-size:15px !important}
#root .pc.pc .pc-stat-label{font-size:13px !important}
#root .pc.pc .pc-stat-val{font-size:32px !important}
#root .pc.pc .pc-stat-pct{font-size:12px !important}
#root .pc.pc .pc-search-in{font-size:15px !important}
#root .pc.pc .pc-chip{font-size:13px !important}
#root .pc.pc .pc-chip-n, #root .pc.pc .pc-kbd{font-size:11.5px !important}
#root .pc.pc .pc-seg button{font-size:16px !important}
#root .pc.pc .pc-result, #root .pc.pc .pc-result *{font-size:13px !important}
#root .pc.pc .pc-ava{font-size:22px !important}
#root .pc.pc .pc-ava.sm{font-size:17px !important}
#root .pc.pc .pc-badge{font-size:12px !important}
#root .pc.pc .pc-card-name{font-size:20px !important}
#root .pc.pc .pc-ind, #root .pc.pc .pc-ind *{font-size:12.5px !important}
#root .pc.pc .pc-k{font-size:12.5px !important}
#root .pc.pc .pc-v{font-size:13.5px !important}
#root .pc.pc .pc-opens{font-size:12px !important}
#root .pc.pc .pc-enter, #root .pc.pc .pc-enter *{font-size:14.5px !important}
#root .pc.pc .pc-row-name{font-size:16px !important}
#root .pc.pc .pc-row-ind{font-size:12.5px !important}
#root .pc.pc .pc-row-meta{font-size:13.5px !important}
#root .pc.pc .pc-row-meta .pc-k{font-size:11.5px !important}
#root .pc.pc .pc-empty, #root .pc.pc .pc-empty b{font-size:15px !important}
#root .pc.pc .pc-empty-ico{font-size:40px !important}

/* ── wide screens: more room for cards ── */
@media (min-width:1700px){
  .pc.pc-shell{grid-template-columns:300px minmax(0,1fr)}
  .pc .pc-grid{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
}

/* ── tablets: toolbar wraps ── */
@media (max-width:1280px){
  .pc .pc-toolbar{grid-template-columns:1fr auto}
  .pc .pc-chips{grid-column:1 / -1; grid-row:2}
  .pc .pc-row{grid-template-columns:auto minmax(160px,1.6fr) minmax(100px,1fr) auto 80px}
  .pc .pc-row .pc-row-meta:nth-of-type(4){display:none}
}

/* ── phones: sidebar folds into a top bar, page scrolls normally ── */
@media (max-width:900px){
  .pc.pc-shell{display:block; height:auto; min-height:100vh; overflow:visible}
  .pc .pc-side{flex-direction:row; flex-wrap:wrap; align-items:center; gap:10px; padding:12px 14px; overflow:visible}
  .pc .pc-brand{border:none; padding:0; flex:1}
  .pc .pc-logo{width:40px; height:40px}
  .pc .pc-nav{order:3; width:100%; display:flex; overflow-x:auto; gap:6px; padding-bottom:2px}
  .pc .pc-nav-btn{width:auto; flex-shrink:0; padding:8px 10px}
  .pc .pc-nav-ar, .pc .pc-side-fill, .pc .pc-clock, .pc .pc-credit{display:none}
  .pc .pc-logout{min-height:38px; padding:0 12px}
  .pc .pc-main{overflow:visible}
  .pc .pc-toolbar{grid-template-columns:1fr; position:static}
  .pc .pc-chips{grid-row:auto}
  .pc .pc-tool-end{justify-content:space-between}
  .pc .pc-row{grid-template-columns:auto minmax(0,1fr) auto}
  .pc .pc-row .pc-row-meta, .pc .pc-row .pc-enter{display:none}
}
`;
