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

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
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
  const currentUser = getCurrentUser();
  const isSuperAdmin = !!currentUser.isSuperAdmin;

  const industry = getActiveIndustry();
  const template = getIndustryTemplate(industry);

  const cardId = params.get("card") || null;
  const activeType = params.get("type") || null;
  const card = template && cardId ? (template.cards || []).find((c) => c.id === cardId) : null;

  useEffect(() => {
    if (!template) navigate("/named-dashboard", { replace: true });
  }, [template, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // When a card is opened without a report, auto-select its first one.
  useEffect(() => {
    if (card && !activeType && card.reports?.length) {
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
      ["card", "type"].forEach((k) => p.delete(k));
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
  if (card && found) Leaf = card.kind === "viewer" ? found.report.View : found.report.Input;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="gia" style={S.page} dir="ltr">
      <style>{`
        #root .gia.gia h1{font-size:21px !important}
        #root .gia.gia .gia-ct{font-size:17px !important}
        @keyframes giaSpin{to{transform:rotate(360deg)}}
        @keyframes giaIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .gia-spin{animation:giaSpin .8s linear infinite}
        .gia-card{animation:giaIn .3s ease both}
        .gia-card:hover{transform:translateY(-3px)}
        .gia-item:hover{background:#f1f5f9}
        .gia-item.on:hover{background:linear-gradient(135deg,#be185d,#db2777)}
        .gia-shell{display:flex;align-items:stretch;min-height:calc(100vh - 70px)}
        .gia-side{width:264px;flex-shrink:0}
        .gia-fab{display:none}
        @media (max-width:860px){
          .gia-shell{flex-direction:column}
          .gia-side{width:auto}
        }
      `}</style>

      {/* ── Top bar ── */}
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
            {card && <button style={S.btn} onClick={() => go({})}>🏠 Home</button>}
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

      {/* ── Home: cards ── */}
      {!card && (
        <div style={S.homeWrap}>
          <div style={S.homeIntro}>
            <div style={S.introTitle}>Welcome{companyName ? `, ${companyName}` : ""}</div>
            <div style={S.introSub}>Choose what you want to do.</div>
          </div>
          <div style={S.grid}>
            {template.cards.map((c, i) => (
              <button
                key={c.id}
                className="gia-card"
                style={{ ...S.card, animationDelay: `${i * 0.05}s` }}
                onClick={() => go({ card: c.id })}
              >
                <div style={S.cardTop}>
                  <div style={{ ...S.cardIcon, background: c.grad || "#0f766e" }}>{c.icon}</div>
                  <span style={S.cardCount}>{c.reports.length} reports</span>
                </div>
                <div className="gia-ct" style={S.cardTitle}>{c.label}</div>
                {c.desc && <div style={S.cardDesc}>{c.desc}</div>}
                <div style={S.cardFoot}>
                  <span>{c.kind === "viewer" ? "Browse" : "Open"}</span>
                  <span aria-hidden="true">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Card: sidebar + full-width report ── */}
      {card && (
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

const ACCENT = "#be185d";
const S = {
  page: { minHeight: "100vh", background: "#eef2f7", color: "#0f172a", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' },

  hero: { position: "relative", overflow: "hidden", background: "linear-gradient(120deg,#1e1b2e 0%,#4c1d3d 48%,#831843 100%)", color: "#fff", padding: "14px clamp(14px,3vw,30px)" },
  heroGlow: { position: "absolute", inset: 0, background: "radial-gradient(600px 180px at 15% 0%, rgba(236,72,153,.35), transparent 60%), radial-gradient(500px 200px at 92% 30%, rgba(8,145,178,.25), transparent 60%)", pointerEvents: "none" },
  heroLine: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 3, background: "linear-gradient(90deg,#ec4899,#f59e0b,#0891b2,#ec4899)", backgroundSize: "220% 100%", opacity: .9 },
  heroInner: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 13, minWidth: 0 },
  avatar: { width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", color: "#fff", fontWeight: 1000, fontSize: 20, flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 700, opacity: .8, fontSize: 12, letterSpacing: ".02em" },
  title: { margin: "2px 0 0", fontWeight: 1000, fontSize: 21, lineHeight: 1.1 },
  heroActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  clock: { fontWeight: 900, fontVariantNumeric: "tabular-nums", opacity: .9, marginInlineEnd: 4 },
  btn: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 800, cursor: "pointer", backdropFilter: "blur(6px)" },
  btnDanger: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(254,202,202,.3)", background: "rgba(220,38,38,.32)", color: "#fff", fontWeight: 800, cursor: "pointer" },

  homeWrap: { width: "min(1080px,100%)", margin: "0 auto", padding: "34px clamp(16px,4vw,40px)" },
  homeIntro: { marginBottom: 22 },
  introTitle: { fontWeight: 1000, fontSize: 24, color: "#0f172a", letterSpacing: "-.01em" },
  introSub: { marginTop: 4, color: "#64748b", fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 18 },
  card: { position: "relative", display: "grid", gap: 12, textAlign: "start", padding: "22px 24px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 14px 34px rgba(15,23,42,.09)", cursor: "pointer", transition: "transform .16s ease, box-shadow .16s ease", overflow: "hidden" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardIcon: { width: 54, height: 54, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", fontSize: 26, boxShadow: "0 10px 22px rgba(190,24,93,.28)" },
  cardCount: { fontSize: 12, fontWeight: 900, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "5px 11px" },
  cardTitle: { fontWeight: 1000, fontSize: 18, color: "#0f172a" },
  cardDesc: { color: "#64748b", fontWeight: 600, fontSize: 13.5, lineHeight: 1.5 },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 14, borderTop: "1px solid #f1f5f9", color: ACCENT, fontWeight: 950 },

  side: { background: "#fff", borderInlineEnd: "1px solid rgba(15,23,42,.08)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "6px 0 24px rgba(15,23,42,.04)" },
  sideHead: { display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 12px", borderBottom: "1px solid #eef2f7" },
  sideHeadIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff", fontSize: 18, flexShrink: 0 },
  sideHeadTitle: { fontWeight: 1000, fontSize: 15, color: "#0f172a" },
  sideHeadSub: { fontSize: 11.5, fontWeight: 800, color: "#94a3b8" },
  sideList: { display: "flex", flexDirection: "column", gap: 3 },
  sideItem: { display: "flex", alignItems: "center", gap: 10, textAlign: "start", border: "none", background: "transparent", color: "#334155", fontWeight: 800, fontSize: 13.5, padding: "10px 11px", borderRadius: 10, cursor: "pointer", transition: "background .14s ease, color .14s ease" },
  sideItemOn: { background: "linear-gradient(135deg,#be185d,#db2777)", color: "#fff", boxShadow: "0 8px 18px rgba(190,24,93,.28)" },
  sideItemIcon: { fontSize: 16, flexShrink: 0 },

  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  mainHead: { display: "flex", alignItems: "center", gap: 10, padding: "12px clamp(10px,2vw,18px)", background: "rgba(255,255,255,.7)", borderBottom: "1px solid rgba(15,23,42,.06)", backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 2 },
  mainHeadIcon: { fontSize: 18 },
  mainHeadTitle: { fontWeight: 1000, fontSize: 16, color: "#0f172a" },
  mainHeadTag: { marginInlineStart: "auto", fontSize: 11, fontWeight: 900, color: ACCENT, background: "#fce7f3", borderRadius: 999, padding: "4px 12px" },
  mainBody: { flex: 1, minWidth: 0, background: "#fff", padding: "10px clamp(6px,1.4vw,14px)", overflowX: "auto" },

  loading: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 60, color: "#64748b", fontWeight: 800 },
  spinner: { width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(190,24,93,.25)", borderTopColor: ACCENT },
};
