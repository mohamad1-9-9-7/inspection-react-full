// src/pages/SelectCompany.jsx
// Platform-owner landing screen: one card per company, shown right after
// login for a super-admin account only. Picking one sets the active company
// context (utils/companyContext.js) that authFetch.js then attaches to every
// scoped API call, and sends the owner into the normal dashboard "as" that
// company. Regular accounts never see this screen — their company is fixed
// by their own login token, so App.jsx never routes them here.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import logo from "../assets/almawashi-logo.jpg";
import { setActiveCompany } from "../utils/companyContext";
import { clearAppSession } from "../utils/authFetch";

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
    return { key: "sweets", icon: "🍬", label: "Confectionery", opens: "Generic app", grad: "linear-gradient(135deg,#ec4899,#be185d)", glow: "rgba(190,24,93,.4)" };
  if (k === "meat" || k === "")
    return { key: "meat", icon: "🥩", label: "Meat / Al Mawashi", opens: "Al Mawashi QMS", grad: "linear-gradient(135deg,#0f766e,#0891b2)", glow: "rgba(15,118,110,.4)" };
  return { key: "generic", icon: "🏭", label: raw || "General", opens: "Generic app", grad: "linear-gradient(135deg,#6366f1,#4f46e5)", glow: "rgba(99,102,241,.4)" };
}

const SORTS = {
  name:   { label: "Name (A→Z)", cmp: (a, b) => (a.name || "").localeCompare(b.name || "") },
  status: { label: "Status",     cmp: (a, b) => statusKey(a).localeCompare(statusKey(b)) || (a.name || "").localeCompare(b.name || "") },
  plan:   { label: "Plan",       cmp: (a, b) => (a.plan_name || "~").localeCompare(b.plan_name || "~") || (a.name || "").localeCompare(b.name || "") },
};

export default function SelectCompany() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(new Date());

  // tools
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [hovered, setHovered] = useState(null);

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
    load();
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const STAT_TILES = [
    { key: "all",     label: "Companies", val: counts.all,     tint: "#0f766e" },
    { key: "active",  label: "Active",    val: counts.active,  tint: "#10b981" },
    { key: "trial",   label: "Trial",     val: counts.trial,   tint: "#f59e0b" },
    { key: "expired", label: "Expired",   val: counts.expired, tint: "#ef4444" },
  ];
  const FILTERS = [
    { key: "all", label: "All", n: counts.all },
    { key: "active", label: "Active", n: counts.active },
    { key: "trial", label: "Trial", n: counts.trial },
    { key: "expired", label: "Expired", n: counts.expired },
    { key: "suspended", label: "Suspended", n: counts.suspended },
    { key: "disabled", label: "Disabled", n: counts.disabled },
  ];

  return (
    <main style={S.page}>
      <style>{`
        @keyframes scSpin{to{transform:rotate(360deg)}}
        @keyframes scIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes scSweep{0%{transform:translateX(-18%);opacity:.45}50%{opacity:.95}100%{transform:translateX(118%);opacity:.45}}
        @keyframes scPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.72);opacity:.48}}
        @keyframes scGlow{0%,100%{opacity:.4}50%{opacity:.92}}
        .sc-spin{animation:scSpin .8s linear infinite}
        .sc-card{animation:scIn .32s ease both}
        .sc-pulse{animation:scPulse 2.1s ease-in-out infinite}
        @media (max-width:900px){
          .sc-hero-inner{grid-template-columns:1fr !important}
          .sc-toolbar{grid-template-columns:1fr !important}
        }
      `}</style>

      <div style={S.layout}>
        {/* ── Hero ── */}
        <section style={S.hero}>
          <div aria-hidden="true" style={S.heroGlow} />
          <div aria-hidden="true" style={S.heroSweep} />
          <div className="sc-hero-inner" style={S.heroInner}>
            <div style={S.brand}>
              <img src={logo} alt="Al Mawashi" style={S.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>Al Mawashi QMS · Platform Owner</p>
                <h1 style={S.title}>Choose a company</h1>
                <p style={S.subtitle}>
                  You're signed in as the platform owner. Pick a company to work inside it —
                  switch to another anytime from the dashboard.
                </p>
                <div style={S.badge}>
                  <span className="sc-pulse" style={S.badgeDot} />
                  <span>{counts.all} companies · {counts.active} active</span>
                </div>
              </div>
            </div>

            <div style={S.heroActions}>
              <button type="button" style={S.ghostBtn} title={dateStr}>🕑 {timeStr}</button>
              <button type="button" style={S.ghostBtn} onClick={load} disabled={loading}>
                {loading ? "…" : "↻"} Refresh
              </button>
              <button type="button" style={S.ghostBtn} onClick={() => navigate("/settings")}>🏢 Manage</button>
              <button type="button" style={S.dangerBtn} onClick={logout}>🚪 Back to Login</button>
            </div>
          </div>
          <div aria-hidden="true" style={S.heroLine} />
        </section>

        {/* ── Stat tiles ── */}
        <section style={S.stats}>
          {STAT_TILES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              style={{ ...S.stat, borderColor: statusFilter === t.key ? t.tint : "rgba(15,23,42,.1)" }}
            >
              <span style={{ ...S.statBar, background: t.tint }} />
              <span style={S.statVal}>{t.val}</span>
              <span style={S.statLabel}>{t.label}</span>
            </button>
          ))}
        </section>

        {/* ── Toolbar: search · filters · sort ── */}
        <section className="sc-toolbar" style={S.toolbar}>
          <label style={S.searchWrap}>
            <span aria-hidden="true">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, plan, contact or industry…"
              style={S.searchInput}
            />
            {query && <button type="button" style={S.clearBtn} onClick={() => setQuery("")}>✕</button>}
          </label>

          <div style={S.rightTools}>
            <div style={S.filters}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  style={{ ...S.filterChip, ...(statusFilter === f.key ? S.filterChipOn : null) }}
                >
                  {f.label}<span style={S.filterN}>{f.n}</span>
                </button>
              ))}
            </div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={S.sortSel}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>Sort: {v.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Body ── */}
        {loading ? (
          <div style={S.empty}><span className="sc-spin" style={S.spinner} /> Loading companies…</div>
        ) : err ? (
          <div style={{ ...S.empty, color: "#991b1b" }}>
            {err}
            <button type="button" style={{ ...S.ghostBtn, marginTop: 14, color: "#991b1b", borderColor: "#fca5a5" }} onClick={load}>↻ Retry</button>
          </div>
        ) : companies.length === 0 ? (
          <div style={S.empty}>No companies yet. Add one from Settings → Companies.</div>
        ) : visible.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontWeight: 1000, marginBottom: 6 }}>No matches</div>
            <div>Try another search term or clear the filter.</div>
          </div>
        ) : (
          <div style={S.grid}>
            {visible.map((c, i) => {
              const meta = STATUS_META[statusKey(c)] || STATUS_META.active;
              const ind = industryMeta(c.industry);
              const on = hovered === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="sc-card"
                  style={{
                    ...S.card,
                    animationDelay: `${i * 0.04}s`,
                    borderColor: on ? ind.glow.replace(/[\d.]+\)$/, ".5)") : "rgba(15,23,42,.1)",
                    boxShadow: on ? `0 24px 52px ${ind.glow}` : "0 12px 30px rgba(15,23,42,.08)",
                    transform: on ? "translateY(-3px)" : "none",
                  }}
                  onClick={() => enter(c)}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(c.id)}
                  onBlur={() => setHovered(null)}
                >
                  <div style={S.cardTop}>
                    <div style={{ ...S.avatar, background: ind.grad, boxShadow: `0 12px 24px ${ind.glow}` }}>
                      {c.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span style={{ ...S.badge2, background: meta.bg, color: meta.text }}>
                      <span style={{ ...S.badgeDot2, background: meta.dot }} />{meta.label}
                    </span>
                  </div>

                  <div style={S.cardName}>{c.name}</div>
                  <div style={S.indTag}><span>{ind.icon}</span> {ind.label}</div>

                  <div style={S.metaRows}>
                    {c.plan_name && <div style={S.metaRow}><span style={S.metaK}>Plan</span><span style={S.metaV}>{c.plan_name}</span></div>}
                    {c.contact_name && <div style={S.metaRow}><span style={S.metaK}>Contact</span><span style={S.metaV}>{c.contact_name}</span></div>}
                  </div>

                  <div style={S.cardFoot}>
                    <span style={S.opensTag}>Opens {ind.opens}</span>
                    <span style={S.enterTag}>Enter <span aria-hidden="true">→</span></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <footer style={S.footer}>Built by Eng. Mohammed Abdullah</footer>
      </div>
    </main>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: "26px clamp(16px, 3.5vw, 56px) 40px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  layout: { width: "min(1240px, 100%)", margin: "0 auto" },

  /* hero */
  hero: {
    position: "relative", overflow: "hidden", borderRadius: 18,
    padding: "26px clamp(22px, 4vw, 48px)",
    background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.94) 52%, rgba(8,145,178,.92))",
    color: "#fff", border: "1px solid rgba(255,255,255,.2)", boxShadow: "0 24px 64px rgba(15,23,42,.22)",
  },
  heroGlow: { position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(760px 260px at 12% 0%, rgba(45,212,191,.28), transparent 62%), radial-gradient(700px 300px at 90% 20%, rgba(125,211,252,.22), transparent 60%)" },
  heroSweep: { position: "absolute", left: "-22%", top: 0, width: "42%", height: 5, pointerEvents: "none", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)", animation: "scSweep 5.8s ease-in-out infinite" },
  heroLine: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 6, background: "linear-gradient(90deg,#22c55e,#06b6d4,#f59e0b,#22c55e)", backgroundSize: "220% 100%", opacity: .86, animation: "scGlow 2.8s ease-in-out infinite" },
  heroInner: { position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 22, alignItems: "center" },
  brand: { display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0 },
  logo: { width: 68, height: 68, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(255,255,255,.34)", background: "#fff", boxShadow: "0 16px 30px rgba(0,0,0,.25)", flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 900, fontSize: 12, color: "rgba(255,255,255,.78)", letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "6px 0 0", fontWeight: 1000, fontSize: 28, lineHeight: 1.05 },
  subtitle: { margin: "8px 0 0", maxWidth: 620, color: "rgba(255,255,255,.82)", lineHeight: 1.45, fontWeight: 700, fontSize: 14 },
  badge: { display: "inline-flex", alignItems: "center", gap: 10, minHeight: 38, padding: "6px 14px", marginTop: 14, borderRadius: 10, color: "#ecfeff", background: "rgba(14,165,233,.18)", border: "1px solid rgba(125,211,252,.34)", fontWeight: 950, fontSize: 13 },
  badgeDot: { width: 11, height: 11, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 16px rgba(34,197,94,.82)" },
  heroActions: { display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start" },
  ghostBtn: { minHeight: 44, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.24)", background: "rgba(255,255,255,.13)", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(6px)" },
  dangerBtn: { minHeight: 44, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(254,202,202,.35)", background: "rgba(220,38,38,.34)", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" },

  /* stat tiles */
  stats: { marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 },
  stat: { position: "relative", overflow: "hidden", textAlign: "start", display: "grid", gap: 2, padding: "16px 18px", borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 10px 24px rgba(15,23,42,.06)", cursor: "pointer" },
  statBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  statVal: { fontWeight: 1000, fontSize: 26, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontWeight: 800, fontSize: 12.5, color: "#64748b" },

  /* toolbar */
  toolbar: { margin: "18px 0", display: "grid", gridTemplateColumns: "minmax(260px,1fr) auto", gap: 14, alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "#fff", border: "1px solid rgba(15,23,42,.13)", boxShadow: "0 12px 28px rgba(15,23,42,.08)" },
  searchInput: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: "#0f172a", fontWeight: 800, fontFamily: "inherit", fontSize: 14 },
  clearBtn: { border: "none", background: "#f1f5f9", color: "#64748b", borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontWeight: 900, flexShrink: 0 },
  rightTools: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", alignItems: "center" },
  filters: { display: "flex", flexWrap: "wrap", gap: 6, background: "#fff", padding: 5, borderRadius: 12, border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 10px 20px rgba(15,23,42,.06)" },
  filterChip: { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#475569", fontWeight: 900, fontSize: 13, padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" },
  filterChipOn: { background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", boxShadow: "0 6px 14px rgba(15,118,110,.3)" },
  filterN: { fontSize: 11, fontWeight: 900, opacity: .8, background: "rgba(15,23,42,.08)", borderRadius: 999, padding: "1px 7px" },
  sortSel: { minHeight: 44, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(15,23,42,.13)", background: "#fff", color: "#334155", fontWeight: 900, fontFamily: "inherit", cursor: "pointer" },

  /* grid + cards */
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 },
  card: { position: "relative", minHeight: 210, display: "grid", gridTemplateRows: "auto auto auto 1fr auto", gap: 10, textAlign: "start", padding: "20px 22px", borderRadius: 16, cursor: "pointer", background: "#fff", border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 12px 30px rgba(15,23,42,.08)", transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease", overflow: "hidden" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 13, display: "grid", placeItems: "center", color: "#fff", fontWeight: 1000, fontSize: 21, flexShrink: 0 },
  badge2: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, borderRadius: 999, padding: "4px 11px" },
  badgeDot2: { width: 7, height: 7, borderRadius: 999 },
  cardName: { fontWeight: 1000, fontSize: 19, color: "#0f172a", lineHeight: 1.2 },
  indTag: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 900, color: "#475569", background: "#f1f5f9", borderRadius: 999, padding: "5px 12px", width: "fit-content" },
  metaRows: { display: "grid", gap: 5, alignContent: "start" },
  metaRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 },
  metaK: { color: "#94a3b8", fontWeight: 800 },
  metaV: { color: "#334155", fontWeight: 900, textAlign: "end", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTop: "1px solid #f1f5f9" },
  opensTag: { fontSize: 11.5, fontWeight: 800, color: "#94a3b8" },
  enterTag: { fontWeight: 1000, color: "#0f766e", fontSize: 14 },

  empty: { padding: 46, textAlign: "center", borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.12)", color: "#64748b", fontWeight: 850, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner: { width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(15,118,110,.25)", borderTopColor: "#0f766e", display: "inline-block" },
  footer: { marginTop: 28, textAlign: "center", color: "#64748b", fontWeight: 800, fontSize: 13 },
};
