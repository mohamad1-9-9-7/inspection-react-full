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
    (c) => !q || c.label.toLowerCase().includes(q) || (c.desc || "").toLowerCase().includes(q)
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
        .gia-item:hover{background:#f1f5f9}
        .gia-item.on:hover{background:linear-gradient(135deg,#0f766e,#0891b2)}
        .gia-shell{display:flex;align-items:stretch;min-height:calc(100vh - 70px)}
        .gia-side{width:264px;flex-shrink:0}
        .gia-fab{display:none}
        @media (max-width:860px){
          .gia-shell{flex-direction:column}
          .gia-side{width:auto}
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
                <p style={S.eyebrow}>{template.icon} {template.label} · {template.branch}</p>
                <h1 style={S.title}>{companyName}</h1>
              </div>
            </div>
            <div style={S.heroActions}>
              <span style={S.clock}>{timeStr}</span>
              <button style={S.btn} onClick={() => go({})}>🏠 Home</button>
              {isSuperAdmin && (
                <button style={S.btn} onClick={() => { clearActiveCompany(); navigate("/select-company"); }}>
                  🏢 Switch
                </button>
              )}
              <button style={S.btnDanger} onClick={logout}>Logout</button>
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
                  <p style={S.bigEyebrow}>{template.icon} {template.label} · {template.branch}</p>
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
                      🏢 Switch Company
                    </button>
                  )}
                  <button type="button" style={S.heroBtnDanger} onClick={logout}>Logout</button>
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
                placeholder="Find a module…"
                style={S.searchInput}
              />
            </label>
            <div className="gia-summary" style={S.summary}>
              <div style={S.chip}>{(template.cards || []).length} Modules</div>
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
                        {c.reports ? `${c.reports.length} reports` : (c.kind === "pair" ? "Add · View" : "Module")}
                      </span>
                    </div>
                    <div className="gia-ct" style={S.cardTitle}>{c.label}</div>
                    <div style={S.cardDesc}>{c.desc || `Open your ${c.label} workspace.`}</div>
                    <div style={S.cardFoot}>
                      <span>{c.kind === "viewer" ? "Browse" : "Open"}</span>
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
            <div style={S.introTitle}>{card.icon} {card.label}</div>
            {card.desc && <div style={S.introSub}>{card.desc}</div>}
          </div>
          <div style={S.grid}>
            {[
              { m: "input", label: card.inputLabel || "Add", desc: card.inputDesc, icon: card.inputIcon || "➕" },
              { m: "view", label: card.viewLabel || "View", desc: card.viewDesc, icon: card.viewIcon || "🗂️" },
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
                <div className="gia-ct" style={S.cardTitle}>{x.label}</div>
                {x.desc && <div style={S.cardDesc}>{x.desc}</div>}
                <div style={S.cardFoot}>
                  <span>{x.m === "view" ? "Browse" : "Open"}</span>
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
            <span style={S.mainHeadTitle}>{mode === "view" ? card.viewLabel : card.inputLabel}</span>
            <button style={{ ...S.btn, marginInlineStart: "auto", color: ACCENT, borderColor: "rgba(15,118,110,.3)", background: "#ccfbf1" }} onClick={() => go({ card: cardId })}>← Back</button>
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
          <aside className="gia-side" style={S.side}>
            <div style={S.sideHead}>
              <span style={S.sideHeadIcon}>{card.icon}</span>
              <div>
                <div style={S.sideHeadTitle}>{card.label}</div>
                <div style={S.sideHeadSub}>{card.kind === "viewer" ? "View mode" : "Data entry"}</div>
              </div>
            </div>
            <div style={S.sideList}>
              {card.reports.map((r) => {
                const on = r.type === activeType;
                return (
                  <button
                    key={r.type}
                    className={`gia-item${on ? " on" : ""}`}
                    style={{ ...S.sideItem, ...(on ? S.sideItemOn : null) }}
                    onClick={() => go({ card: cardId, type: r.type })}
                  >
                    <span style={S.sideItemIcon}>{r.icon || "📄"}</span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section style={S.main}>
            {found && (
              <div style={S.mainHead}>
                <span style={S.mainHeadIcon}>{found.report.icon || "📄"}</span>
                <span style={S.mainHeadTitle}>{found.report.label}</span>
                <span style={S.mainHeadTag}>{card.kind === "viewer" ? "View" : "Entry"}</span>
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
                <div style={S.loading}>Select a report from the list.</div>
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

  side: { background: "#fff", borderInlineEnd: "1px solid rgba(15,23,42,.08)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "6px 0 24px rgba(15,23,42,.04)" },
  sideHead: { display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 12px", borderBottom: "1px solid #eef2f7" },
  sideHeadIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontSize: 18, flexShrink: 0 },
  sideHeadTitle: { fontWeight: 1000, fontSize: 15, color: "#0f172a" },
  sideHeadSub: { fontSize: 11.5, fontWeight: 800, color: "#94a3b8" },
  sideList: { display: "flex", flexDirection: "column", gap: 3 },
  sideItem: { display: "flex", alignItems: "center", gap: 10, textAlign: "start", border: "none", background: "transparent", color: "#334155", fontWeight: 800, fontSize: 13.5, padding: "10px 11px", borderRadius: 10, cursor: "pointer", transition: "background .14s ease, color .14s ease" },
  sideItemOn: { background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", boxShadow: "0 8px 18px rgba(15,118,110,.28)" },
  sideItemIcon: { fontSize: 16, flexShrink: 0 },

  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  mainHead: { display: "flex", alignItems: "center", gap: 10, padding: "12px clamp(10px,2vw,18px)", background: "rgba(255,255,255,.7)", borderBottom: "1px solid rgba(15,23,42,.06)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 2 },
  mainHeadIcon: { fontSize: 18 },
  mainHeadTitle: { fontWeight: 1000, fontSize: 16, color: "#0f172a" },
  mainHeadTag: { marginInlineStart: "auto", fontSize: 11, fontWeight: 900, color: ACCENT, background: "#ccfbf1", borderRadius: 999, padding: "4px 12px" },
  mainBody: { flex: 1, minWidth: 0, background: "#fff", padding: "10px clamp(6px,1.4vw,14px)", overflowX: "auto" },

  loading: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 60, color: "#64748b", fontWeight: 800 },
  spinner: { width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(15,118,110,.25)", borderTopColor: ACCENT },
};
