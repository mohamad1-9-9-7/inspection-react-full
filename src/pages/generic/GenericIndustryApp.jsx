// src/pages/generic/GenericIndustryApp.jsx
// Generic shell for any company whose industry is not 'meat'. Home shows the
// template's cards; opening a card shows a LEFT SIDEBAR listing that card's
// reports, and the selected report's real page component fills the rest of the
// screen. For sweets these components are exact copies of the QCS report
// designs (English, sweets_* types, Al Mawashi branding stripped), so data
// stays isolated per company (company_id at the API layer).
//
// URL-driven: (none)=home cards · ?card=X=that card (sidebar) · ?card=X&type=Y=report.
import React, { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config/api";
import { clearAppSession } from "../../utils/authFetch";
import { getActiveCompany, getActiveCompanyName, getActiveIndustry, clearActiveCompany } from "../../utils/companyContext";
import { getIndustryTemplate, findReportType } from "../../industries";
import ReportGuide from "./ReportGuide";

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function Loading() {
  return (
    <div style={S.loading}>
      <div className="gia-spin" style={S.spinner} />
      <span>Loading…</span>
    </div>
  );
}


/** English with its Arabic twin (smaller, muted) — or English alone. */
function Two({ en, ar, className = "" }) {
  if (!ar || ar === en) return <>{en}</>;
  return (
    <span className={`gia-two ${className}`}>
      <span>{en}</span>
      <span className="gia-ar" lang="ar" dir="rtl">{ar}</span>
    </span>
  );
}

const RAIL_KEY = "gia_side_rail_v1";
function readRail() {
  try { return localStorage.getItem(RAIL_KEY) === "1"; } catch { return false; }
}

/* ── Report sidebar: grouped, searchable, bilingual, collapsible to a rail ──
   `card.groups` ([{ id, icon, label, labelAr }]) + `report.group` put the
   reports under headings; without them it is one flat list. `twin` is the
   card showing the same reports in the other mode (entry ↔ view). */
function SideNav({ card, twin, activeType, onPick, onSwitch, onHome }) {
  const [rail, setRail] = useState(readRail);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false); // phones: list folded under the active report

  const toggleRail = () => setRail((v) => {
    try { localStorage.setItem(RAIL_KEY, v ? "0" : "1"); } catch { /* per-viewer nicety only */ }
    return !v;
  });

  const all = card.reports || [];
  const needle = q.trim().toLowerCase();
  const shown = all.filter((r) => !needle || [r.label, r.labelAr, r.desc, r.descAr].some((x) => String(x || "").toLowerCase().includes(needle)));
  const known = new Set((card.groups || []).map((g) => g.id));
  const groups = card.groups?.length
    ? [
      ...card.groups.map((g) => ({ ...g, items: shown.filter((r) => r.group === g.id) })),
      { id: "_other", icon: "📄", label: "Other", labelAr: "أخرى", items: shown.filter((r) => !known.has(r.group)) },
    ]
    : [{ id: "_all", icon: "📄", label: "Reports", labelAr: "التقارير", items: shown }];
  const active = all.find((r) => r.type === activeType);
  const isView = card.kind === "viewer";
  const pick = (type) => { onPick(type); setOpen(false); };

  return (
    <aside className={`gia-side${rail ? " rail" : ""}${open ? " open" : ""}`} aria-label="Reports">
      <div className="gia-side-in">
        <div className="gia-sh">
          <span className="gia-sh-ic" style={{ background: card.grad || "linear-gradient(135deg,#0f766e,#0891b2)" }}>{card.icon}</span>
          <div className="gia-sh-tx">
            <div className="gia-sh-t">{card.label}</div>
            {card.labelAr && <div className="gia-sh-a gia-ar" lang="ar" dir="rtl">{card.labelAr}</div>}
          </div>
          <button
            type="button"
            className="gia-sh-btn"
            onClick={toggleRail}
            title={rail ? "Expand · توسيع" : "Collapse · طيّ"}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          >
            {rail ? "»" : "«"}
          </button>
        </div>

        {twin && (
          <div className="gia-seg" role="tablist">
            <button type="button" role="tab" aria-selected={!isView} className={!isView ? "on" : ""} title="Entry · إدخال" onClick={() => isView && onSwitch(twin)}>
              ✏️ <span className="gia-lbl"><Two en="Entry" ar="إدخال" /></span>
            </button>
            <button type="button" role="tab" aria-selected={isView} className={isView ? "on" : ""} title="View · عرض" onClick={() => !isView && onSwitch(twin)}>
              🗂️ <span className="gia-lbl"><Two en="View" ar="عرض" /></span>
            </button>
          </div>
        )}

        <button type="button" className="gia-mtoggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span className="gia-it-ic">{active?.icon || "📄"}</span>
          <span style={{ flex: 1, minWidth: 0 }}><Two en={active?.label || "Reports"} ar={active?.labelAr || "التقارير"} /></span>
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>

        <nav className="gia-nav">
          <label className="gia-find">
            <span aria-hidden="true">🔎</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports… · ابحث في التقارير…" />
            {q && <button type="button" onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontWeight: 900 }} aria-label="Clear">✕</button>}
          </label>

          {groups.filter((g) => g.items.length).map((g) => (
            <div key={g.id} className="gia-grp">
              <div className="gia-gh" title={[g.label, g.labelAr].filter(Boolean).join(" · ")}>
                <span aria-hidden="true">{g.icon}</span>
                <span className="gia-lbl gia-gh-t"><Two en={g.label} ar={g.labelAr} /></span>
                <span className="gia-gh-n">{g.items.length}</span>
              </div>
              {g.items.map((r) => {
                const on = r.type === activeType;
                return (
                  <button
                    key={r.type}
                    type="button"
                    className={`gia-it${on ? " on" : ""}`}
                    onClick={() => pick(r.type)}
                    aria-current={on ? "page" : undefined}
                    title={[[r.label, r.labelAr].filter(Boolean).join(" · "), r.desc].filter(Boolean).join("\n")}
                  >
                    <span className="gia-it-ic">{r.icon || "📄"}</span>
                    <span className="gia-lbl gia-it-tx">
                      <span className="gia-it-en">{r.label}</span>
                      {r.labelAr && <span className="gia-it-ar gia-ar" lang="ar" dir="rtl">{r.labelAr}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {!shown.length && <div className="gia-none"><Two en="No report matches." ar="لا يوجد تقرير مطابق." /></div>}
        </nav>

        <button type="button" className="gia-home" onClick={onHome} title="Home · الرئيسية">
          🏠 <span className="gia-lbl"><Two en="Home" ar="الرئيسية" /></span>
        </button>
      </div>
    </aside>
  );
}

export default function GenericIndustryApp() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState(null);
  const currentUser = getCurrentUser();
  const isSuperAdmin = !!currentUser.isSuperAdmin;

  const industry = getActiveIndustry();
  const template = getIndustryTemplate(industry);

  const cardId = params.get("card") || null;
  const activeType = params.get("type") || null;
  const mode = params.get("mode") || null; // for "pair" cards: "input" | "view"
  const card = template && cardId ? (template.cards || []).find((c) => c.id === cardId) : null;
  const isPair = card?.kind === "pair";
  const isHub = card?.kind === "hub";
  // The card showing the same reports in the other mode (Daily ↔ View).
  const twinCard = card?.reports
    ? (template?.cards || []).find((c) => c.id !== card.id && c.reports && (c.kind === "viewer") !== (card.kind === "viewer"))
    : null;

  useEffect(() => {
    if (!template) navigate("/named-dashboard", { replace: true });
  }, [template, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // When a report card is opened without a report, auto-select its first one.
  // Pair cards (OHC) are excluded — they show their two inner cards first.
  useEffect(() => {
    if (card && card.kind !== "pair" && card.kind !== "hub" && !activeType && card.reports?.length) {
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("type", card.reports[0].type);
        return p;
      }, { replace: true });
    }
  }, [card, activeType, setParams]);

  if (!template) return null;

  const found = activeType ? findReportType(template, activeType) : null;
  const companyName = isSuperAdmin
    ? (getActiveCompany()?.name || template.label)
    : (getActiveCompanyName() || currentUser.displayName || template.label);
  const monogram = (companyName || "?").trim()[0]?.toUpperCase() || "?";

  const go = (next) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      // date/reportId/tab belong to one report's edit link (e.g. NCR → Edit);
      // leaving them behind would re-open that record on the next report.
      ["card", "type", "mode", "date", "reportId", "tab"].forEach((k) => p.delete(k));
      Object.entries(next || {}).forEach(([k, v]) => { if (v) p.set(k, v); });
      return p;
    });
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username }),
      });
    } catch {}
    clearAppSession();
    navigate("/", { replace: true });
  };

  let Leaf = null;
  if (isPair) {
    if (mode === "view") Leaf = card.View;
    else if (mode === "input") Leaf = card.Input;
  } else if (isHub) {
    Leaf = card.Hub;
  } else if (card && found) {
    Leaf = card.kind === "viewer" ? found.report.View : found.report.Input;
  }
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const q = query.trim().toLowerCase();
  const homeCards = (template.cards || []).filter(
    (c) => !q || [c.label, c.desc, c.labelAr, c.descAr].some((x) => String(x || "").toLowerCase().includes(q))
  );

  return (
    <main className="gia" style={S.page} dir="ltr">
      <style>{`
        #root .gia.gia h1{font-size:21px !important}
        #root .gia.gia .gia-ct{font-size:17px !important}
        #root .gia.gia .gia-hero-title{font-size:30px !important}
        @keyframes giaSpin{to{transform:rotate(360deg)}}
        @keyframes giaIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes giaSweep{0%{transform:translateX(-18%);opacity:.45}50%{opacity:.95}100%{transform:translateX(118%);opacity:.45}}
        @keyframes giaPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.72);opacity:.48}}
        @keyframes giaGlowLine{0%,100%{opacity:.4;transform:translateY(0)}50%{opacity:.92;transform:translateY(5px)}}
        .gia-spin{animation:giaSpin .8s linear infinite}
        .gia-card{animation:giaIn .3s ease both}
        .gia-card:hover{transform:translateY(-3px)}
        .gia-pulse{animation:giaPulse 2.1s ease-in-out infinite}
        @media (max-width:980px){
          .gia-hero-inner{grid-template-columns:1fr !important}
          .gia-hero-actions{min-width:0 !important}
          .gia-toolbar{grid-template-columns:1fr !important}
          .gia-summary{justify-content:flex-start !important}
        }
        /* ── Arabic twins (EN · AR) ── */
        .gia-two{display:inline-flex;flex-wrap:wrap;align-items:baseline;column-gap:.45em;row-gap:0}
        .gia-ar{font-family:var(--font-arabic,'Cairo','Tajawal',sans-serif);font-weight:700;opacity:.78;unicode-bidi:isolate}
        #root .gia.gia .gia-ar{font-size:12px !important}
        #root .gia.gia .gia-card-ar{font-size:13px !important}

        /* ── Report sidebar ── */
        html:has(.gia-shell),body:has(.gia-shell),#root:has(.gia-shell){overflow-x:clip}
        .gia-shell{display:flex;align-items:stretch;min-height:calc(100vh - 70px)}
        .gia-side{width:292px;flex-shrink:0;background:#fff;border-inline-end:1px solid rgba(15,23,42,.08);box-shadow:6px 0 24px rgba(15,23,42,.04);transition:width .2s ease}
        .gia-side-in{position:sticky;top:0;max-height:100vh;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:14px 12px;box-sizing:border-box;min-height:calc(100vh - 70px)}
        .gia-sh{display:flex;align-items:center;gap:10px;padding:2px 2px 12px;border-bottom:1px solid #eef2f7}
        .gia-sh-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 8px 18px rgba(15,118,110,.25)}
        .gia-sh-tx{min-width:0;flex:1}
        .gia-sh-t{font-weight:1000;color:#0f172a;line-height:1.15}
        .gia-sh-a{color:#0f766e;margin-top:2px;opacity:1}
        .gia-sh-btn{width:30px;height:30px;border-radius:9px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:900;cursor:pointer;flex-shrink:0;font-family:inherit}
        .gia-sh-btn:hover{background:#ecfdf5;color:#0f766e;border-color:#99f6e4}
        .gia-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#f1f5f9;border-radius:12px}
        .gia-seg button{border:none;background:transparent;border-radius:9px;padding:7px 6px;font-weight:900;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit}
        .gia-seg button:hover:not(.on){color:#0f766e}
        .gia-seg button.on{background:#fff;color:#0f766e;box-shadow:0 2px 8px rgba(15,23,42,.08);cursor:default}
        .gia-find{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}
        .gia-find:focus-within{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.15);background:#fff}
        .gia-find input{border:none;outline:none;background:transparent;width:100%;min-width:0;font-family:inherit;font-weight:700;color:#0f172a}
        .gia-nav{display:flex;flex-direction:column;gap:12px}
        .gia-grp{display:flex;flex-direction:column;gap:2px}
        .gia-gh{display:flex;align-items:center;gap:7px;padding:4px 8px 3px;color:#64748b;font-weight:900;letter-spacing:.03em}
        .gia-gh-t{flex:1;min-width:0;text-transform:uppercase}
        .gia-gh-n{background:#f1f5f9;color:#64748b;border-radius:999px;padding:0 8px;font-weight:900}
        .gia-it{position:relative;display:flex;align-items:center;gap:10px;width:100%;text-align:start;border:none;background:transparent;color:#334155;padding:6px 8px;border-radius:11px;cursor:pointer;font-family:inherit;transition:background .14s,color .14s}
        .gia-it:hover{background:#f1f5f9}
        .gia-it:focus-visible,.gia-seg button:focus-visible,.gia-home:focus-visible,.gia-sh-btn:focus-visible{outline:2px solid #14b8a6;outline-offset:2px}
        .gia-it-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:#f0fdfa;border:1px solid #ccfbf1;flex-shrink:0}
        .gia-it-tx{display:flex;flex-direction:column;min-width:0;line-height:1.25}
        .gia-it-en{font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gia-it-ar{color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start}
        .gia-it.on{background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;box-shadow:0 8px 18px rgba(15,118,110,.28)}
        .gia-it.on .gia-it-ic{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3)}
        .gia-it.on .gia-it-ar{color:rgba(255,255,255,.88);opacity:1}
        .gia-it.on::before{content:"";position:absolute;inset-inline-start:-12px;top:9px;bottom:9px;width:4px;border-radius:0 4px 4px 0;background:#f59e0b}
        .gia-home{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:11px;padding:9px;font-weight:900;color:#334155;cursor:pointer;font-family:inherit}
        .gia-home:hover{background:#ecfdf5;color:#0f766e;border-color:#99f6e4}
        .gia-none{padding:14px 8px;color:#94a3b8;font-weight:800;text-align:center}
        .gia-mtoggle{display:none}
        #root .gia.gia .gia-sh-t{font-size:15px !important}
        #root .gia.gia .gia-sh-ic{font-size:20px !important}
        #root .gia.gia .gia-it-ic{font-size:16px !important}
        #root .gia.gia .gia-it-en{font-size:13.5px !important}
        #root .gia.gia .gia-it-ar{font-size:11.5px !important}
        #root .gia.gia .gia-seg button{font-size:12.5px !important}
        #root .gia.gia .gia-gh,#root .gia.gia .gia-gh .gia-ar{font-size:11px !important}
        @media (min-width:861px){
          .gia-side.rail{width:78px}
          .gia-side.rail .gia-lbl,.gia-side.rail .gia-find,.gia-side.rail .gia-sh-tx,.gia-side.rail .gia-gh-n{display:none}
          .gia-side.rail .gia-sh{flex-direction:column}
          .gia-side.rail .gia-seg{grid-template-columns:1fr}
          .gia-side.rail .gia-gh{justify-content:center;padding:6px 0 2px;border-top:1px solid #eef2f7}
          .gia-side.rail .gia-it{justify-content:center;padding:5px}
        }
        @media (max-width:860px){
          .gia-shell{flex-direction:column}
          .gia-side{width:auto;border-inline-end:none;border-bottom:1px solid rgba(15,23,42,.08)}
          .gia-side-in{position:static;max-height:none;min-height:0}
          .gia-sh-btn{display:none}
          .gia-mtoggle{display:flex;align-items:center;gap:10px;width:100%;border:1px solid #e2e8f0;background:#f8fafc;border-radius:11px;padding:9px 12px;font-weight:900;cursor:pointer;font-family:inherit;color:#0f172a;text-align:start}
          .gia-side:not(.open) .gia-nav,.gia-side:not(.open) .gia-home{display:none}
        }
      `}</style>

      {/* ── Compact top bar (only inside a card / report) ── */}
      {card && (
        <header style={S.hero}>
          <div aria-hidden="true" style={S.heroGlow} />
          <div style={S.heroInner}>
            <div style={S.brand}>
              <div style={S.avatar}>{monogram}</div>
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>{template.icon} <Two en={`${template.label} · ${template.branch}`} ar={template.labelAr && `${template.labelAr} · ${template.branchAr || ""}`} /></p>
                <h1 style={S.title}>{companyName}</h1>
              </div>
            </div>
            <div style={S.heroActions}>
              <span style={S.clock}>{timeStr}</span>
              <button style={S.btn} onClick={() => go({})}>🏠 <Two en="Home" ar="الرئيسية" /></button>
              {isSuperAdmin && (
                <button style={S.btn} onClick={() => { clearActiveCompany(); navigate("/select-company"); }}>
                  🏢 <Two en="Switch" ar="تبديل" />
                </button>
              )}
              <button style={S.btnDanger} onClick={logout}><Two en="Logout" ar="خروج" /></button>
            </div>
          </div>
          <div aria-hidden="true" style={S.heroLine} />
        </header>
      )}

      {/* ── Home: rich hero + search + cards ── */}
      {!card && (
        <div style={S.homeShell}>
          <section style={S.bigHero}>
            <div aria-hidden="true" style={S.bigHeroGlow} />
            <div aria-hidden="true" style={S.bigHeroSweep} />
            <div className="gia-hero-inner" style={S.bigHeroInner}>
              <div style={S.brand}>
                <div style={S.bigAvatar}>{monogram}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={S.bigEyebrow}>{template.icon} <Two en={`${template.label} · ${template.branch}`} ar={template.labelAr && `${template.labelAr} · ${template.branchAr || ""}`} /></p>
                  <h1 className="gia-hero-title" style={S.bigTitle}>{greeting()}, {companyName}</h1>
                  <p style={S.bigSubtitle}>
                    Central access to your quality, hygiene, inspection, training and certification modules.
                  </p>
                  <div style={S.bigBadge}>
                    <span className="gia-pulse" style={S.bigPulse} />
                    <span>Dashboard Home · module selector</span>
                  </div>
                </div>
              </div>

              <div className="gia-hero-actions" style={S.bigHeroActions}>
                <div style={S.userPanel}>
                  <div style={S.userTop}>
                    <div style={S.userAvatar}>{monogram}</div>
                    <div>
                      <div style={S.userMeta}>{template.label}</div>
                      <div style={S.userName}>{companyName}</div>
                    </div>
                  </div>
                </div>
                <div style={S.actionRow}>
                  <button type="button" style={S.heroBtn} title={dateStr}>{timeStr}</button>
                  {isSuperAdmin && (
                    <button type="button" style={S.heroBtn} onClick={() => { clearActiveCompany(); navigate("/select-company"); }}>
                      🏢 <Two en="Switch Company" ar="تبديل الشركة" />
                    </button>
                  )}
                  <button type="button" style={S.heroBtnDanger} onClick={logout}><Two en="Logout" ar="خروج" /></button>
                </div>
              </div>
            </div>
            <div aria-hidden="true" style={S.bigHeroLine} />
          </section>

          <section className="gia-toolbar" style={S.toolbar}>
            <label style={S.searchWrap}>
              <span aria-hidden="true">🔎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a module… · ابحث عن وحدة…"
                style={S.searchInput}
              />
            </label>
            <div className="gia-summary" style={S.summary}>
              <div style={S.chip}><Two en={`${(template.cards || []).length} Modules`} ar={`${(template.cards || []).length} وحدات`} /></div>
              {isSuperAdmin && <div style={S.chip}>🏢 {companyName}</div>}
            </div>
          </section>

          {homeCards.length === 0 ? (
            <div style={S.emptyBox}>
              <div style={{ fontWeight: 1000, marginBottom: 6 }}>No modules found</div>
              <div>Try another search term.</div>
            </div>
          ) : (
            <div style={S.grid}>
              {homeCards.map((c, i) => {
                const on = hovered === c.id;
                return (
                  <button
                    key={c.id}
                    className="gia-card"
                    style={{
                      ...S.card,
                      animationDelay: `${i * 0.05}s`,
                      borderColor: on ? "rgba(15,118,110,.48)" : "rgba(15,23,42,.08)",
                      boxShadow: on ? "0 24px 52px rgba(15,118,110,.22)" : "0 14px 34px rgba(15,23,42,.09)",
                    }}
                    onClick={() => go({ card: c.id })}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(c.id)}
                    onBlur={() => setHovered(null)}
                  >
                    <div style={S.cardTop}>
                      <div style={{ ...S.cardIcon, background: c.grad || "#0f766e" }}>{c.icon}</div>
                      <span style={S.cardCount}>
                        {c.reports ? `${c.reports.length} reports · تقرير` : (c.kind === "pair" ? "Add · View · إضافة · عرض" : "Module · وحدة")}
                      </span>
                    </div>
                    <div className="gia-ct" style={S.cardTitle}>{c.label}{c.labelAr && <div className="gia-ar gia-card-ar" lang="ar" dir="rtl" style={{ color: ACCENT, marginTop: 3 }}>{c.labelAr}</div>}</div>
                    <div style={S.cardDesc}>{c.desc || `Open your ${c.label} workspace.`}{c.descAr && <div className="gia-ar" lang="ar" dir="rtl" style={{ marginTop: 2 }}>{c.descAr}</div>}</div>
                    <div style={S.cardFoot}>
                      <span>{c.kind === "viewer" ? <Two en="Browse" ar="تصفح" /> : <Two en="Open" ar="فتح" />}</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <footer style={S.homeFooter}>Built by Eng. Mohammed Abdullah</footer>
        </div>
      )}

      {/* ── Pair card (e.g. OHC), inner picker: two centered cards ── */}
      {isPair && !mode && (
        <div style={S.homeWrap}>
          <div style={S.homeIntro}>
            <div style={S.introTitle}>{card.icon} <Two en={card.label} ar={card.labelAr} /></div>
            {card.desc && <div style={S.introSub}><Two en={card.desc} ar={card.descAr} /></div>}
          </div>
          <div style={S.grid}>
            {[
              { m: "input", label: card.inputLabel || "Add", labelAr: card.inputLabelAr, desc: card.inputDesc, descAr: card.inputDescAr, icon: card.inputIcon || "➕" },
              { m: "view", label: card.viewLabel || "View", labelAr: card.viewLabelAr, desc: card.viewDesc, descAr: card.viewDescAr, icon: card.viewIcon || "🗂️" },
            ].map((x, i) => (
              <button
                key={x.m}
                className="gia-card"
                style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
                onClick={() => go({ card: cardId, mode: x.m })}
              >
                <div style={S.cardTop}>
                  <div style={{ ...S.cardIcon, background: card.grad || "#0f766e" }}>{x.icon}</div>
                </div>
                <div className="gia-ct" style={S.cardTitle}>{x.label}{x.labelAr && <div className="gia-ar gia-card-ar" lang="ar" dir="rtl" style={{ color: ACCENT, marginTop: 3 }}>{x.labelAr}</div>}</div>
                {x.desc && <div style={S.cardDesc}>{x.desc}{x.descAr && <div className="gia-ar" lang="ar" dir="rtl" style={{ marginTop: 2 }}>{x.descAr}</div>}</div>}
                <div style={S.cardFoot}>
                  <span>{x.m === "view" ? <Two en="Browse" ar="تصفح" /> : <Two en="Open" ar="فتح" />}</span>
                  <span aria-hidden="true">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Pair card, chosen Add/View page: FULL WIDTH (no centered wrapper) ── */}
      {isPair && mode && (
        <section style={S.main}>
          <div style={S.mainHead}>
            <span style={S.mainHeadIcon}>{card.icon}</span>
            <span style={S.mainHeadTitle}>{mode === "view" ? <Two en={card.viewLabel} ar={card.viewLabelAr} /> : <Two en={card.inputLabel} ar={card.inputLabelAr} />}</span>
            <button style={{ ...S.btn, marginInlineStart: "auto", color: ACCENT, borderColor: "rgba(15,118,110,.3)", background: "#ccfbf1" }} onClick={() => go({ card: cardId })}>← <Two en="Back" ar="رجوع" /></button>
          </div>
          <div style={{ ...S.mainBody, padding: 0 }}>
            {Leaf ? (
              <Suspense fallback={<Loading />}><Leaf /></Suspense>
            ) : (
              <div style={S.loading}>Nothing to show.</div>
            )}
          </div>
        </section>
      )}

      {/* ── Hub card (e.g. HACCP): full-width, no sidebar, no report picker ── */}
      {isHub && (
        <section style={S.main}>
          <div style={{ ...S.mainBody, padding: 0 }}>
            {Leaf ? (
              <Suspense fallback={<Loading />}><Leaf /></Suspense>
            ) : (
              <div style={S.loading}>Nothing to show.</div>
            )}
          </div>
        </section>
      )}

      {/* ── Card: sidebar + full-width report ── */}
      {card && !isPair && !isHub && (
        <div className="gia-shell">
          <SideNav
            card={card}
            twin={twinCard}
            activeType={activeType}
            onPick={(type) => go({ card: cardId, type })}
            onSwitch={(c) => go({ card: c.id, type: activeType })}
            onHome={() => go({})}
          />

          <section style={S.main}>
            {found && (
              <div style={S.mainHead}>
                <span style={S.mainHeadIcon}>{found.report.icon || "📄"}</span>
                <span style={S.mainHeadTitle}><Two en={found.report.label} ar={found.report.labelAr} /></span>
                <span style={S.mainHeadTag}>
                  {card.kind === "viewer" ? <Two en="View" ar="عرض" /> : <Two en="Entry" ar="إدخال" />}
                </span>
              </div>
            )}
            <div style={S.mainBody}>
              {Leaf && found?.report?.guide && (
                <ReportGuide
                  key={`${card.id}:${found.report.type}`}
                  id={found.report.type}
                  guide={found.report.guide}
                  compact={card.kind === "viewer"}
                />
              )}
              {Leaf ? (
                <Suspense fallback={<Loading />}>
                  <Leaf />
                </Suspense>
              ) : (
                <div style={S.loading}><Two en="Select a report from the list." ar="اختر تقريراً من القائمة." /></div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const ACCENT = "#0f766e";
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc 0%,#eef7f4 44%,#f8fafc 100%)", color: "#0f172a", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' },

  hero: { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.94) 52%, rgba(8,145,178,.92))", color: "#fff", padding: "14px clamp(14px,3vw,30px)" },
  heroGlow: { position: "absolute", inset: 0, background: "radial-gradient(600px 180px at 15% 0%, rgba(45,212,191,.28), transparent 60%), radial-gradient(500px 200px at 92% 30%, rgba(125,211,252,.22), transparent 60%)", pointerEvents: "none" },
  heroLine: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 3, background: "linear-gradient(90deg,#22c55e,#06b6d4,#f59e0b,#22c55e)", backgroundSize: "220% 100%", opacity: .9 },
  heroInner: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 13, minWidth: 0 },
  avatar: { width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", color: "#fff", fontWeight: 1000, fontSize: 20, flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 700, opacity: .8, fontSize: 12, letterSpacing: ".02em" },
  title: { margin: "2px 0 0", fontWeight: 1000, fontSize: 21, lineHeight: 1.1 },
  heroActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  clock: { fontWeight: 900, fontVariantNumeric: "tabular-nums", opacity: .9, marginInlineEnd: 4 },
  btn: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 800, cursor: "pointer", backdropFilter: "blur(6px)" },
  btnDanger: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(254,202,202,.3)", background: "rgba(220,38,38,.32)", color: "#fff", fontWeight: 800, cursor: "pointer" },

  homeWrap: { width: "100%", boxSizing: "border-box", margin: 0, padding: "14px clamp(10px,1.2vw,18px) 24px" },
  homeIntro: { marginBottom: 22 },
  introTitle: { fontWeight: 1000, fontSize: 24, color: "#0f172a", letterSpacing: "-.01em" },
  introSub: { marginTop: 4, color: "#64748b", fontWeight: 700 },

  /* ── Rich home hero (Al-Mawashi-grade, sweets palette) ── */
  homeShell: { width: "100%", boxSizing: "border-box", margin: 0, padding: "14px clamp(10px,1.2vw,18px) 24px" },
  bigHero: { position: "relative", overflow: "hidden", borderRadius: 18, padding: "26px clamp(22px,4vw,46px)", background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.94) 52%, rgba(8,145,178,.92))", color: "#fff", border: "1px solid rgba(255,255,255,.2)", boxShadow: "0 24px 64px rgba(15,23,42,.22)" },
  bigHeroGlow: { position: "absolute", inset: 0, background: "radial-gradient(760px 260px at 12% 0%, rgba(45,212,191,.28), transparent 62%), radial-gradient(700px 300px at 90% 20%, rgba(125,211,252,.22), transparent 60%)", pointerEvents: "none" },
  bigHeroSweep: { position: "absolute", left: "-22%", top: 0, width: "42%", height: 5, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent)", animation: "giaSweep 5.8s ease-in-out infinite", pointerEvents: "none" },
  bigHeroLine: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 6, background: "linear-gradient(90deg,#22c55e,#06b6d4,#f59e0b,#22c55e)", backgroundSize: "220% 100%", opacity: .86, animation: "giaGlowLine 2.8s ease-in-out infinite" },
  bigHeroInner: { position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center" },
  bigAvatar: { width: 66, height: 66, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", color: "#fff", fontWeight: 1000, fontSize: 28, flexShrink: 0 },
  bigEyebrow: { margin: 0, fontWeight: 900, fontSize: 12, color: "rgba(255,255,255,.78)", letterSpacing: ".06em", textTransform: "uppercase" },
  bigTitle: { margin: "8px 0 0", fontWeight: 1000, fontSize: 30, lineHeight: 1.05 },
  bigSubtitle: { margin: "10px 0 0", maxWidth: 640, color: "rgba(255,255,255,.82)", lineHeight: 1.45, fontWeight: 700, fontSize: 14 },
  bigBadge: { display: "inline-flex", alignItems: "center", gap: 10, minHeight: 40, padding: "6px 14px", marginTop: 16, borderRadius: 10, color: "#ecfeff", background: "rgba(14,165,233,.18)", border: "1px solid rgba(125,211,252,.34)", fontWeight: 950, fontSize: 13 },
  bigPulse: { width: 11, height: 11, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 16px rgba(34,197,94,.82)" },
  bigHeroActions: { display: "grid", gap: 12, minWidth: 320 },
  userPanel: { borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(12px)" },
  userTop: { display: "flex", alignItems: "center", gap: 12 },
  userAvatar: { width: 50, height: 50, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.24)", color: "#fff", fontWeight: 1000, fontSize: 20, flexShrink: 0 },
  userMeta: { color: "rgba(255,255,255,.74)", fontWeight: 800, fontSize: 12 },
  userName: { marginTop: 3, color: "#fff", fontWeight: 1000, fontSize: 16 },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  heroBtn: { minHeight: 46, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.24)", background: "rgba(255,255,255,.13)", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(6px)" },
  heroBtnDanger: { minHeight: 46, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(254,202,202,.35)", background: "rgba(220,38,38,.34)", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" },

  toolbar: { margin: "22px 0 18px", display: "grid", gridTemplateColumns: "minmax(260px,1fr) auto", gap: 14, alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#fff", border: "1px solid rgba(15,23,42,.13)", boxShadow: "0 12px 28px rgba(15,23,42,.08)" },
  searchInput: { width: "100%", minWidth: 0, border: "none", outline: "none", background: "transparent", color: "#0f172a", fontWeight: 800, fontFamily: "inherit", fontSize: 14 },
  summary: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 },
  chip: { minHeight: 46, display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: 10, background: "#fff", color: "#334155", border: "1px solid rgba(15,23,42,.12)", boxShadow: "0 10px 20px rgba(15,23,42,.07)", fontWeight: 950, fontSize: 13 },
  emptyBox: { padding: 34, borderRadius: 12, background: "#fff", border: "1px solid rgba(15,23,42,.12)", boxShadow: "0 12px 30px rgba(15,23,42,.08)", textAlign: "center", color: "#64748b", fontWeight: 850 },
  homeFooter: { marginTop: 26, textAlign: "center", color: "#64748b", fontWeight: 800, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 18 },
  card: { position: "relative", minHeight: 200, display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 12, textAlign: "start", padding: "22px 24px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 14px 34px rgba(15,23,42,.09)", cursor: "pointer", transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease", overflow: "hidden" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardIcon: { width: 54, height: 54, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", fontSize: 26, boxShadow: "0 10px 22px rgba(15,118,110,.28)" },
  cardCount: { fontSize: 12, fontWeight: 900, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "5px 11px" },
  cardTitle: { fontWeight: 1000, fontSize: 18, color: "#0f172a" },
  cardDesc: { color: "#64748b", fontWeight: 600, fontSize: 13.5, lineHeight: 1.5 },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 14, borderTop: "1px solid #f1f5f9", color: ACCENT, fontWeight: 950 },


  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  mainHead: { display: "flex", alignItems: "center", gap: 10, padding: "12px clamp(10px,2vw,18px)", background: "rgba(255,255,255,.7)", borderBottom: "1px solid rgba(15,23,42,.06)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 2 },
  mainHeadIcon: { fontSize: 18 },
  mainHeadTitle: { fontWeight: 1000, fontSize: 16, color: "#0f172a" },
  mainHeadTag: { marginInlineStart: "auto", fontSize: 11, fontWeight: 900, color: ACCENT, background: "#ccfbf1", borderRadius: 999, padding: "4px 12px" },
  mainBody: { flex: 1, minWidth: 0, background: "#fff", padding: "10px clamp(6px,1.4vw,14px)", overflowX: "auto" },

  loading: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 60, color: "#64748b", fontWeight: 800 },
  spinner: { width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(15,118,110,.25)", borderTopColor: ACCENT },
};
