// src/pages/SelectCompany.jsx
// PLATFORM CENTER — the super-admin's home, OUTSIDE every company. Tabs:
//   🏢 Companies            enter a company (below)
//   👥 Accounts & Perms     every company's accounts; the permission list
//                           follows the account's company (AccountsManagementTab)
//   💳 Billing              overview, companies (add / edit / disable, card
//                           picture), plans, quotations, invoices (BillingPlansTab)
//   🛡️ Security & Server    security controls
// None of these live in a company's own Settings any more.
//
// ONE language button (the header) drives every tab: they all read the
// shared useSettingsLang() store, and none of them carries its own toggle.
// A screen is one language at a time — never a label beside its twin.
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
import { BrandMark } from "./readiness/brand";
import { setActiveCompany, clearActiveCompany } from "../utils/companyContext";
import { clearAppSession } from "../utils/authFetch";
import { confirmLogoutWithOutbox } from "../utils/offlineOutbox";
import { INDUSTRY_CATEGORIES, categoryOf } from "../industries/catalog";
import { useSettingsLang, LangToggle } from "./settings/_shared/settingsI18n";
import { companyStatus } from "./settings/_shared/companyBilling";

const AccountsManagementTab = lazy(() => import("./settings/AccountsManagementTab"));
const BillingPlansTab       = lazy(() => import("./settings/BillingPlansTab"));
const SecurityControlsTab   = lazy(() => import("./settings/SecurityControlsTab"));
const DemoRequestsTab       = lazy(() => import("./settings/DemoRequestsTab"));
const PromoCodesTab         = lazy(() => import("./settings/PromoCodesTab"));

const CENTER_TABS = [
  { id: "companies", icon: "🏢", en: "Companies",              ar: "الشركات",             hint: "Pick a company to work inside it",                              hintAr: "اختر شركة لتشتغل جوّاها" },
  { id: "accounts",  icon: "👥", en: "Accounts & Permissions", ar: "الحسابات والصلاحيات", hint: "Every company's accounts and what they can open",               hintAr: "حسابات كل الشركات وشو بيقدروا يفتحوا" },
  { id: "billing",   icon: "💳", en: "Billing & Subscriptions", ar: "الاشتراكات والفوترة", hint: "Revenue, companies, plans, quotations and invoices",           hintAr: "الإيراد، الشركات، الخطط، عروض الأسعار والفواتير" },
  { id: "leads",     icon: "📨", en: "Demo Requests",          ar: "طلبات العرض التجريبي", hint: "Companies that asked for a demo on the public /demo page",      hintAr: "الشركات اللي طلبت عرض تجريبي من صفحة /demo" },
  { id: "promo",     icon: "🏷️", en: "Promo Codes",            ar: "أكواد الخصم",          hint: "A code per person who brings customers — discount, validity, and who came through it", hintAr: "كود لكل شخص بيجبلك عملاء — الخصم، الصلاحية، ومين إجا عن طريقه" },
  { id: "security",  icon: "🛡️", en: "Security & Server",      ar: "الأمان والسيرفر",      hint: "Record deletion, read-only mode, session timeout and screen lock", hintAr: "حذف السجلات، وضع القراءة فقط، مهلة الجلسة وقفل الشاشة" },
];

const STATUS_META = {
  active:    { bg: "#d1fae5", text: "#065f46", dot: "#10b981", en: "Active",      ar: "فعّالة" },
  trial:     { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", en: "Trial",       ar: "تجريبية" },
  expired:   { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", en: "Expired",     ar: "منتهية" },
  suspended: { bg: "#e2e8f0", text: "#475569", dot: "#94a3b8", en: "Suspended",   ar: "موقوفة" },
  // Disabled: its own accounts are locked out; only the super-admin enters.
  disabled:  { bg: "#1f2937", text: "#f9fafb", dot: "#111827", en: "⛔ Disabled", ar: "⛔ معطّلة" },
};
// The same rule the Billing tabs and the login lock use (end date passed = expired).
const statusKey = (c) => companyStatus(c);

const OPENS_AR = { "Al Mawashi QMS": "نظام المواشي", "Company app": "تطبيق الشركة" };

// Which category a company belongs to (industries/catalog.js) — drives its
// colour, icon, the "opens X" tag and the category section it is filed under.
function industryMeta(raw) {
  const c = categoryOf(raw);
  return { key: c.id, icon: c.icon, label: c.label, labelAr: c.labelAr, opens: c.opens, grad: c.grad, glow: c.glow, tint: c.tint, order: c.order };
}

const SORTS = {
  name:   { en: "Name (A→Z)", ar: "الاسم (أ←ي)", cmp: (a, b) => (a.name || "").localeCompare(b.name || "") },
  status: { en: "Status",     ar: "الحالة",      cmp: (a, b) => statusKey(a).localeCompare(statusKey(b)) || (a.name || "").localeCompare(b.name || "") },
  plan:   { en: "Plan",       ar: "الخطة",       cmp: (a, b) => (a.plan_name || "~").localeCompare(b.plan_name || "~") || (a.name || "").localeCompare(b.name || "") },
};

function readView() {
  try { return localStorage.getItem("pc_view") === "list" ? "list" : "grid"; } catch { return "grid"; }
}

/* The company's card picture (Billing → Companies → Edit), else its initial. */
function Ava({ c, grad, small }) {
  if (c.logo_url) {
    return <span className={`pc-ava pic${small ? " sm" : ""}`}><img src={c.logo_url} alt="" /></span>;
  }
  return <span className={`pc-ava${small ? " sm" : ""}`} style={{ background: grad }}>{c.name?.[0]?.toUpperCase() || "?"}</span>;
}

export default function SelectCompany() {
  const navigate = useNavigate();
  const { lang, dir, toggle: toggleLang } = useSettingsLang();
  const ar = lang === "ar";
  const L = (en, arText) => (ar ? arText : en);
  const [params, setParams] = useSearchParams();
  const tab = CENTER_TABS.some((x) => x.id === params.get("tab")) ? params.get("tab") : "companies";
  const tabMeta = CENTER_TABS.find((x) => x.id === tab);
  const setTab = (id) => {
    setParams((p) => { const n = new URLSearchParams(p); n.set("tab", id); return n; }, { replace: true });
    /* a new tab starts at its own header, not wherever the last list was scrolled */
    try { window.scrollTo({ top: 0 }); } catch {}
  };
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(""); // "" | "load" | "net"
  const [now, setNow] = useState(new Date());

  // tools
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all"); // "all" | category id (industries/catalog.js)
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
      else setErr("load");
    } catch {
      setErr("net");
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

  // companies per category, for the category bar
  const catCounts = useMemo(() => {
    const c = {};
    companies.forEach((x) => { const k = industryMeta(x.industry).key; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [companies]);
  // every catalogue category (even empty ones, so the owner sees what exists)
  // plus a bucket for any unknown industry value that is actually in use
  const categories = useMemo(() => {
    const list = [...INDUSTRY_CATEGORIES];
    if (catCounts.other) list.push(categoryOf("__other__"));
    return list.sort((a, b) => a.order - b.order);
  }, [catCounts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .filter((c) => statusFilter === "all" || statusKey(c) === statusFilter)
      .filter((c) => catFilter === "all" || industryMeta(c.industry).key === catFilter)
      .filter((c) => {
        if (!q) return true;
        const ind = industryMeta(c.industry);
        return [c.name, c.plan_name, c.contact_name, c.industry, ind.label, ind.labelAr]
          .some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort(SORTS[sortKey].cmp);
  }, [companies, query, statusFilter, catFilter, sortKey]);

  // the visible companies filed under their category, in catalogue order
  const sections = useMemo(() => {
    const by = {};
    visible.forEach((c) => { const m = industryMeta(c.industry); (by[m.key] = by[m.key] || { meta: m, items: [] }).items.push(c); });
    return Object.values(by).sort((a, b) => a.meta.order - b.meta.order);
  }, [visible]);

  function enter(company) {
    setActiveCompany(company);
    // النشاط يقرّر أي نظام يفتح: 'meat' (أو غير محدّد) = داشبورد المواشي،
    // أي نشاط تاني = المحرّك العام المبني من قالب النشاط.
    const industry = company.industry || "meat";
    navigate(industry !== "meat" ? "/company-app" : "/named-dashboard");
  }

  function logout() {
    if (!confirmLogoutWithOutbox()) return;
    clearAppSession();
    navigate("/", { replace: true });
  }

  const locale = ar ? "ar-AE-u-nu-latn" : "en-GB";
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hour = now.getHours();
  const greeting = ar
    ? (hour < 12 ? "صباح الخير" : "مساء الخير")
    : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const ownerName = currentUser.displayName || currentUser.name || currentUser.username || L("Owner", "المالك");
  const catLabel = (c) => (ar ? c.labelAr || c.label : c.label);
  const statusLabel = (m) => (ar ? m.ar : m.en);
  const opensLabel = (o) => (ar ? OPENS_AR[o] || o : o);
  const tabLabel = (x) => (ar ? x.ar : x.en);

  const pct = (n) => (counts.all ? Math.round((n / counts.all) * 100) : 0);
  const STAT_TILES = [
    { key: "all",      icon: "🏢", label: L("All companies", "كل الشركات"), val: counts.all,      tint: "#0f766e", share: 100 },
    { key: "active",   icon: "✅", label: L("Active", "فعّالة"),            val: counts.active,   tint: "#10b981", share: pct(counts.active) },
    { key: "trial",    icon: "⏳", label: L("Trial", "تجريبية"),            val: counts.trial,    tint: "#f59e0b", share: pct(counts.trial) },
    { key: "expired",  icon: "⚠️", label: L("Expired", "منتهية"),           val: counts.expired,  tint: "#ef4444", share: pct(counts.expired) },
    { key: "disabled", icon: "⛔", label: L("Disabled", "معطّلة"),          val: counts.disabled, tint: "#334155", share: pct(counts.disabled) },
  ];
  // "Suspended" is a legacy stored value — shown as a chip only while a
  // company still carries it (new ones are switched off with Disable).
  const FILTERS = [
    { key: "all", label: L("All", "الكل"), n: counts.all },
    { key: "active", label: L("Active", "فعّالة"), n: counts.active },
    { key: "trial", label: L("Trial", "تجريبية"), n: counts.trial },
    { key: "expired", label: L("Expired", "منتهية"), n: counts.expired },
    ...(counts.suspended ? [{ key: "suspended", label: L("Suspended", "موقوفة"), n: counts.suspended }] : []),
    { key: "disabled", label: L("Disabled", "معطّلة"), n: counts.disabled },
  ];
  const filtered = query.trim() || statusFilter !== "all" || catFilter !== "all";

  return (
    <div className="pc pc-shell" dir={dir}>
      <style>{PC_CSS}</style>

      {/* ── Sidebar ── */}
      <aside className="pc-side">
        <div aria-hidden="true" className="pc-side-glow" />
        <div className="pc-brand">
          <span className="pc-logo" aria-hidden="true" style={{ display: "block", boxShadow: "0 10px 24px rgba(0,0,0,.35)", background: "none" }}><BrandMark size={48} /></span>
          <div className="pc-brand-txt">
            <span className="pc-eyebrow">INSPECT PRO</span>
            <span className="pc-brand-name">{L("Platform Center", "مركز المنصّة")}</span>
          </div>
        </div>

        <nav className="pc-nav" role="tablist" aria-label={L("Platform Center", "مركز المنصّة")}>
          {CENTER_TABS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`pc-nav-btn${tab === x.id ? " on" : ""}`}>
              <span aria-hidden="true" className="pc-nav-ico">{x.icon}</span>
              <span className="pc-nav-txt">
                <span className="pc-nav-label">{tabLabel(x)}</span>
              </span>
              {x.id === "companies" && <span className="pc-nav-n">{counts.all}</span>}
            </button>
          ))}
        </nav>

        <div className="pc-side-fill" />

        <div className="pc-clock" title={dateStr}>
          <span className="pc-clock-time">{timeStr}</span>
          <span className="pc-clock-date">{dateStr}</span>
          <span className="pc-live"><span className="pc-pulse" /> {ar ? `${counts.active} من ${counts.all} شركات فعّالة` : `${counts.active} of ${counts.all} companies active`}</span>
        </div>

        <button type="button" className="pc-logout" onClick={logout}>🚪 {L("Back to Login", "رجوع لتسجيل الدخول")}</button>
        <div className="pc-credit">{L("Built by Eng. Mohammed Abdullah", "تطوير م. محمد عبدالله")}</div>
      </aside>

      {/* ── Main ── */}
      <main className="pc-main">
        <header className="pc-top">
          <div className="pc-top-txt">
            <span className="pc-crumb">{L("Platform Center", "مركز المنصّة")} <span aria-hidden="true">{ar ? "‹" : "›"}</span> {tabLabel(tabMeta)}</span>
            <h1 className="pc-h1"><span aria-hidden="true">{tabMeta.icon}</span> {tab === "companies" ? `${greeting}${ar ? "، " : ", "}${ownerName}` : tabLabel(tabMeta)}</h1>
            <p className="pc-sub">{ar ? tabMeta.hintAr : tabMeta.hint}</p>
          </div>
          <div className="pc-top-actions">
            {tab === "companies" && (
              <button type="button" className="pc-btn" onClick={load} disabled={loading}>
                <span className={loading ? "pc-spin-inline" : ""} aria-hidden="true">↻</span> {L("Refresh", "تحديث")}
              </button>
            )}
            {/* The one language switch for the whole Platform Center. */}
            <LangToggle lang={lang} toggle={toggleLang}
              style={{ background: "#0f172a", border: "1px solid #0f172a", minHeight: 42, padding: "0 16px" }} />
          </div>
        </header>

        <div className="pc-content">
          {tab !== "companies" && (
            <section className="pc-panel" key={tab}>
              <Suspense fallback={<div className="pc-empty"><span className="pc-spinner" /> {L("Loading…", "جاري التحميل…")}</div>}>
                {tab === "accounts" && <AccountsManagementTab />}
                {tab === "billing" && <BillingPlansTab />}
                {tab === "security" && <SecurityControlsTab />}
                {tab === "leads" && <DemoRequestsTab />}
                {tab === "promo" && <PromoCodesTab />}
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
                  <span className="pc-stat-pct">{loading ? "" : t.key === "all" ? L("total", "المجموع") : L(`${t.share}% of all`, `${t.share}% من الكل`)}</span>
                </button>
              ))}
            </section>

            {/* ── Categories: every company is filed under its industry ── */}
            <section className="pc-cats" aria-label={L("Categories", "الفئات")}>
              <button type="button" onClick={() => setCatFilter("all")} className={`pc-cat${catFilter === "all" ? " on" : ""}`} style={{ "--tint": "#0f766e", "--grad": "linear-gradient(135deg,#0f766e,#0891b2)" }}>
                <span className="pc-cat-ico" aria-hidden="true">🗂️</span>
                <span className="pc-cat-txt"><span className="pc-cat-label">{L("All categories", "كل الفئات")}</span></span>
                <span className="pc-cat-n">{loading ? "–" : companies.length}</span>
              </button>
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => setCatFilter(c.id)} className={`pc-cat${catFilter === c.id ? " on" : ""}${catCounts[c.id] ? "" : " empty"}`} style={{ "--tint": c.tint, "--grad": c.grad }}>
                  <span className="pc-cat-ico" aria-hidden="true">{c.icon}</span>
                  <span className="pc-cat-txt"><span className="pc-cat-label">{catLabel(c)}</span></span>
                  <span className="pc-cat-n">{loading ? "–" : catCounts[c.id] || 0}</span>
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
                  placeholder={L("Search by name, plan, contact or industry…", "ابحث بالاسم، الخطة، جهة التواصل أو النشاط…")}
                  className="pc-search-in"
                />
                {query
                  ? <button type="button" className="pc-clear" onClick={() => setQuery("")} aria-label={L("Clear search", "مسح البحث")}>✕</button>
                  : <kbd className="pc-kbd" title={L("Press / to search", "اضغط / للبحث")}>/</kbd>}
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
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="pc-select" aria-label={L("Sort", "الترتيب")}>
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>{L("Sort", "ترتيب")}: {ar ? v.ar : v.en}</option>
                  ))}
                </select>
                <div className="pc-seg" role="group" aria-label={L("View", "العرض")}>
                  <button type="button" className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} title={L("Cards", "بطاقات")}>▦</button>
                  <button type="button" className={view === "list" ? "on" : ""} onClick={() => setView("list")} title={L("List", "قائمة")}>☰</button>
                </div>
              </div>
            </section>

            {!loading && !err && companies.length > 0 && (
              <div className="pc-result">
                {ar ? <>عرض <b>{visible.length}</b> من {companies.length}</> : <>Showing <b>{visible.length}</b> of {companies.length}</>}
                {filtered && (
                  <button type="button" className="pc-reset" onClick={() => { setQuery(""); setStatusFilter("all"); setCatFilter("all"); }}>{L("Clear filters", "مسح الفلاتر")}</button>
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
                {err === "net" ? L("Could not connect to server.", "تعذّر الاتصال بالسيرفر.") : L("Could not load companies.", "تعذّر تحميل الشركات.")}
                <button type="button" className="pc-btn light" onClick={load}>↻ {L("Retry", "إعادة المحاولة")}</button>
              </div>
            ) : companies.length === 0 ? (
              <div className="pc-empty">
                <span className="pc-empty-ico">🏗️</span>
                {L("No companies yet. Add one from Billing & Subscriptions.", "ما في شركات بعد. أضف وحدة من الاشتراكات والفوترة.")}
                <button type="button" className="pc-btn light" onClick={() => setTab("billing")}>💳 {L("Open Billing", "افتح الفوترة")}</button>
              </div>
            ) : visible.length === 0 ? (
              <div className="pc-empty">
                <span className="pc-empty-ico">🔍</span>
                <b>{L("No matches", "ما في نتائج")}</b>
                {L("Try another search term or clear the filter.", "جرّب كلمة بحث تانية أو امسح الفلتر.")}
              </div>
            ) : sections.map((sec) => (
              <section key={sec.meta.key} className="pc-sec" style={{ "--tint": sec.meta.tint, "--grad": sec.meta.grad }}>
                <header className="pc-sec-head">
                  <span className="pc-sec-ico" aria-hidden="true">{sec.meta.icon}</span>
                  <span className="pc-sec-label">{catLabel(sec.meta)}</span>
                  <span className="pc-sec-n">{ar ? `${sec.items.length} ${sec.items.length === 1 ? "شركة" : "شركات"}` : `${sec.items.length} ${sec.items.length === 1 ? "company" : "companies"}`}</span>
                </header>
                {view === "list" ? (
                  <div className="pc-list">
                    {sec.items.map((c, i) => {
                      const meta = STATUS_META[statusKey(c)] || STATUS_META.active;
                      const ind = industryMeta(c.industry);
                      return (
                        <button key={c.id} type="button" className="pc-row" onClick={() => enter(c)}
                          style={{ "--tint": ind.tint, animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                          <Ava c={c} grad={ind.grad} small />
                          <span className="pc-row-name">{c.name}<span className="pc-row-ind">{ind.icon} {catLabel(ind)}</span></span>
                          <span className="pc-row-meta"><span className="pc-k">{L("Plan", "الخطة")}</span>{c.plan_name || "—"}</span>
                          <span className="pc-row-meta"><span className="pc-k">{L("Contact", "التواصل")}</span>{c.contact_name || "—"}</span>
                          <span className="pc-badge" style={{ background: meta.bg, color: meta.text }}>
                            <span className="pc-badge-dot" style={{ background: meta.dot }} />{statusLabel(meta)}
                          </span>
                          <span className="pc-enter">{L("Enter →", "دخول ←")}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pc-grid">
                    {sec.items.map((c, i) => {
                      const meta = STATUS_META[statusKey(c)] || STATUS_META.active;
                      const ind = industryMeta(c.industry);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`pc-card${c.logo_url ? " has-logo" : ""}`}
                          style={{ "--grad": ind.grad, "--glow": ind.glow, "--tint": ind.tint, animationDelay: `${Math.min(i, 12) * 0.04}s` }}
                          onClick={() => enter(c)}
                        >
                          {c.logo_url ? (
                            /* With a picture: the logo gets the whole head of the card. */
                            <span className="pc-card-logo">
                              <img src={c.logo_url} alt="" />
                              <span className="pc-badge pc-badge-float" style={{ background: meta.bg, color: meta.text }}>
                                <span className="pc-badge-dot" style={{ background: meta.dot }} />{statusLabel(meta)}
                              </span>
                            </span>
                          ) : (<>
                            <span className="pc-card-band" aria-hidden="true" />
                            <span className="pc-card-top">
                              <Ava c={c} grad={ind.grad} />
                              <span className="pc-badge" style={{ background: meta.bg, color: meta.text }}>
                                <span className="pc-badge-dot" style={{ background: meta.dot }} />{statusLabel(meta)}
                              </span>
                            </span>
                          </>)}

                          <span className="pc-card-name">{c.name}</span>
                          <span className="pc-ind"><span aria-hidden="true">{ind.icon}</span> {catLabel(ind)}</span>

                          <span className="pc-meta">
                            <span className="pc-meta-row"><span className="pc-k">{L("Plan", "الخطة")}</span><span className="pc-v">{c.plan_name || "—"}</span></span>
                            <span className="pc-meta-row"><span className="pc-k">{L("Contact", "التواصل")}</span><span className="pc-v">{c.contact_name || "—"}</span></span>
                          </span>

                          <span className="pc-card-foot">
                            <span className="pc-opens">{L("Opens", "بيفتح")} {opensLabel(ind.opens)}</span>
                            <span className="pc-enter">{L("Enter", "دخول")} <span aria-hidden="true" className="pc-arrow">{ar ? "←" : "→"}</span></span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </>)}
        </div>
      </main>
    </div>
  );
}

const PC_CSS = `
@keyframes pcSpin{to{transform:rotate(360deg)}}
@keyframes pcIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
/* the panel only fades: a held transform (even translate 0) makes it the
   containing block of every position:fixed modal inside it, so pop-ups opened
   lower down the page landed off-screen */
@keyframes pcFade{from{opacity:0}to{opacity:1}}
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
.pc .pc-logo svg{width:100% !important; height:100% !important}
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
  padding:clamp(10px,1.6vw,22px); animation:pcFade .25s ease both}

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
.pc .pc-card-band{position:absolute; inset:0 0 auto 0; height:96px; background:linear-gradient(180deg,color-mix(in srgb,var(--tint) 13%,transparent),transparent); opacity:.8; transition:opacity .18s}
.pc .pc-card:hover, .pc .pc-card:focus-visible{transform:translateY(-4px); border-color:var(--tint); box-shadow:0 26px 50px var(--glow); outline:none}
.pc .pc-card:hover .pc-card-band, .pc .pc-card:focus-visible .pc-card-band{opacity:1}
.pc .pc-card > span:not(.pc-card-band){position:relative}
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
/* a company with a picture: the logo gets the head of the card — a quiet
   full-width stage, logo centred, status pinned in the corner */
.pc .pc-card.has-logo{padding-top:0}
.pc .pc-card-logo{display:grid; place-items:center; height:112px; margin:0 -22px 4px; padding:18px 28px;
  background:#f8fafc; border-bottom:1px solid #eef2f6; box-sizing:border-box}
.pc .pc-card-logo{overflow:hidden}
/* explicit px: a % max-height resolves against the grid row (auto) and lets a
   tall logo spill over the company name */
.pc .pc-card-logo img{max-width:72%; max-height:76px; width:auto; height:auto; object-fit:contain; display:block; transition:transform .18s}
.pc .pc-card:hover .pc-card-logo img{transform:scale(1.03)}
.pc .pc-badge-float{position:absolute; top:12px; inset-inline-end:12px; box-shadow:0 2px 6px rgba(15,23,42,.08)}
/* list rows: same square as the letter avatar, logo contained inside */
.pc .pc-ava.pic{background:#fff; border:1px solid #e2e8f0; padding:5px; box-sizing:border-box; overflow:hidden; box-shadow:none}
.pc .pc-ava.pic img{width:100%; height:100%; object-fit:contain; display:block}
.pc[dir=rtl] .pc-card:hover .pc-arrow{transform:translateX(-4px)}
.pc[dir=rtl] .pc-nav-btn.on{box-shadow:inset -3px 0 0 #2dd4bf, 0 10px 22px rgba(0,0,0,.18)}

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

/* categories bar */
.pc .pc-cats{display:grid; grid-template-columns:repeat(auto-fill,minmax(178px,1fr)); gap:10px}
.pc .pc-cat{display:flex; align-items:center; gap:10px; text-align:start; padding:10px 12px; border-radius:14px; background:#fff; cursor:pointer;
  border:1px solid rgba(15,23,42,.08); box-shadow:0 6px 16px rgba(15,23,42,.05); transition:transform .15s, box-shadow .15s, border-color .15s}
.pc .pc-cat:hover{transform:translateY(-2px); border-color:var(--tint)}
.pc .pc-cat.on{background:var(--grad); color:#fff; border-color:transparent; box-shadow:0 12px 26px color-mix(in srgb,var(--tint) 35%,transparent)}
.pc .pc-cat.empty:not(.on){opacity:.6}
.pc .pc-cat-ico{width:36px; height:36px; border-radius:11px; display:grid; place-items:center; background:color-mix(in srgb,var(--tint) 12%,#fff); flex-shrink:0}
.pc .pc-cat.on .pc-cat-ico{background:rgba(255,255,255,.2)}
.pc .pc-cat-txt{display:grid; gap:1px; min-width:0; flex:1}
.pc .pc-cat-label{font-weight:900; color:inherit; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.pc .pc-cat-ar{font-weight:700; opacity:.7}
.pc .pc-cat-n{min-width:26px; text-align:center; padding:2px 8px; border-radius:999px; font-weight:900; background:color-mix(in srgb,var(--tint) 12%,#fff); color:var(--tint)}
.pc .pc-cat.on .pc-cat-n{background:rgba(255,255,255,.25); color:#fff}

/* one section per category */
.pc .pc-sec{display:grid; gap:12px}
.pc .pc-sec-head{display:flex; align-items:center; gap:10px; padding:4px 2px 8px; border-bottom:2px solid color-mix(in srgb,var(--tint) 25%,transparent)}
.pc .pc-sec-ico{width:34px; height:34px; border-radius:10px; display:grid; place-items:center; background:var(--grad); color:#fff}
.pc .pc-sec-label{font-weight:900; color:#0f172a}
.pc .pc-sec-ar{font-weight:800; color:var(--tint)}
.pc .pc-sec-n{margin-inline-start:auto; color:#64748b; font-weight:800}

/* type scale — must out-rank globals.css #root * {font-size:14px !important} */
#root .pc.pc .pc-cat-ico{font-size:18px !important}
#root .pc.pc .pc-cat-label{font-size:13.5px !important}
#root .pc.pc .pc-cat-ar, #root .pc.pc .pc-cat-n{font-size:12px !important}
#root .pc.pc .pc-sec-ico{font-size:17px !important}
#root .pc.pc .pc-sec-label{font-size:17px !important}
#root .pc.pc .pc-sec-ar, #root .pc.pc .pc-sec-n{font-size:13px !important}
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
