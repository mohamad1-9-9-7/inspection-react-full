// src/pages/haccp and iso/Kitchen/MenuNutrition/MenuNutritionHub.jsx
// Entry point for the menu nutrition module — splits data entry from outputs,
// the same Input / View split used elsewhere in the app.
// Visual language mirrors the ISO 22000 & HACCP Command Center / Kitchen hub:
// dark-teal hero + stats, folder-icon cards, mint accents.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../../assets/almawashi-logo.jpg";
import { can } from "../../../../utils/perms";
import { HaccpLangToggle } from "../../_shared/haccpI18n";
import { useKitchenLang } from "../kitchenI18n";
import { BASE_FONT_PX, Btn, FS, UI, layout, shell } from "../kitchenUI";
import { itemStatus } from "./nutritionCalc";
import { loadItems } from "./menuStore";

/* Same folder mark used across the ISO / HACCP hub. */
function IconFolder() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M3 6.75A1.75 1.75 0 0 1 4.75 5h4.086a1.75 1.75 0 0 1 1.237.513l1.414 1.414A1.75 1.75 0 0 0 12.724 7H19.25A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25v-10.5Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M4.75 5h4.086a1.75 1.75 0 0 1 1.237.513l1.414 1.414A1.75 1.75 0 0 0 12.724 7H19.25A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25v-10.5A1.75 1.75 0 0 1 4.75 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

export default function MenuNutritionHub() {
  const navigate = useNavigate();
  const { t, lang, toggle, isAr, dir } = useKitchenLang();
  const [hovered, setHovered] = useState(null);
  const [items, setItems] = useState(null);

  const mayWrite = can("iso", "write") || can("iso", "edit");

  useEffect(() => {
    let alive = true;
    loadItems()
      .then((list) => alive && setItems(list))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(() => {
    if (!items) return null;
    const st = items.map(itemStatus);
    return {
      total: items.length,
      complete: st.filter((s) => s.status === "complete").length,
      issues: st.filter((s) => s.status !== "complete" || s.needsRecalc).length,
    };
  }, [items]);

  const cards = [
    {
      id: "entry",
      icon: "📝",
      title: t("mnEntry"),
      body: t("mnEntryLong"),
      route: "/haccp-iso/kitchen/menu-nutrition/input",
      pill: isAr ? "إدخال" : "Data entry",
      enabled: mayWrite,
      badges: counts ? [t("countItems", { n: counts.total })] : [],
    },
    {
      id: "view",
      icon: "📊",
      title: t("mnView"),
      body: t("mnViewLong"),
      route: "/haccp-iso/kitchen/menu-nutrition/view",
      pill: isAr ? "مخرجات" : "Outputs",
      enabled: true,
      badges: counts
        ? [t("countComplete", { n: counts.complete }), t("countIssues", { n: counts.issues })]
        : [],
    },
  ];

  return (
    <main style={shell(dir, BASE_FONT_PX)}>
      <style>{`
        @media (max-width: 980px) {
          .mn-hero-inner { grid-template-columns: 1fr !important; }
          .mn-hero-stats { min-width: 0 !important; }
        }
        @media (max-width: 820px) { .kt-hub2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={layout}>
        {/* Controls above the hero — back + language */}
        <div style={S.controls}>
          <Btn onClick={() => navigate("/haccp-iso/kitchen")}>{t("backToHub")}</Btn>
          <HaccpLangToggle lang={lang} toggle={toggle} />
        </div>

        {/* Hero */}
        <section style={S.hero}>
          <div aria-hidden="true" style={S.heroGlow} />

          <div className="mn-hero-inner" style={S.heroInner}>
            <div style={S.brand}>
              <img src={mawashiLogo} alt="Al Mawashi" style={S.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>
                  HACCP / ISO 22000 · {t("kitchenTitle")} · ADG 10/2026
                </p>
                <h1 style={S.title}>🔥 {t("mnHubTitle")}</h1>
                <p style={S.subtitle}>{t("mnSubtitle")}</p>
              </div>
            </div>

            <div className="mn-hero-stats" style={S.heroStats}>
              <div style={S.stat}>
                <div style={S.statValue}>{counts ? counts.total : "—"}</div>
                <div style={S.statLabel}>{t("cmpTotal")}</div>
              </div>
              <div style={S.stat}>
                <div style={S.statValue}>{counts ? counts.complete : "—"}</div>
                <div style={S.statLabel}>{t("cmpComplete")}</div>
              </div>
            </div>
          </div>
        </section>

        <div style={S.kicker}>{t("mnHubKicker")}</div>

        <section className="kt-hub2" style={S.grid}>
          {cards.map((c) => {
            const active = hovered === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!c.enabled}
                style={S.card(active, c.enabled)}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.id)}
                onBlur={() => setHovered(null)}
                onClick={() => c.enabled && navigate(c.route)}
                title={c.title}
              >
                <div style={S.cardTop}>
                  <div style={S.iconWrap}>
                    <IconFolder />
                  </div>
                  <span style={S.pill}>{c.pill}</span>
                </div>

                <div>
                  <h2 style={S.cardTitle}>
                    <span style={{ marginInlineEnd: 8 }}>{c.icon}</span>
                    {c.title}
                  </h2>
                  <div style={S.cardBody}>{c.body}</div>
                  {c.badges.length ? (
                    <div style={S.tags}>
                      {c.badges.map((b) => (
                        <span key={b} style={S.tag}>
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={S.cardBottom}>
                  <span>{c.enabled ? t("openModule") : t("noPermission")}</span>
                  <span aria-hidden="true" style={S.arrow(active)}>{isAr ? "←" : "→"}</span>
                </div>
              </button>
            );
          })}
        </section>

        <div style={S.footer}>© Al Mawashi — Quality &amp; Food Safety System</div>
      </div>
    </main>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const S = {
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "28px clamp(22px, 4vw, 56px)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
      "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 24,
  },
  brand: { display: "flex", alignItems: "center", gap: 16, minWidth: 0 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)",
    background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  eyebrow: {
    margin: 0,
    fontSize: FS.xxs,
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: { margin: "8px 0 0", fontSize: FS.xl, fontWeight: 1000, lineHeight: 1.05 },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 980,
    fontSize: FS.sm,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
    gap: 12,
    minWidth: 340,
  },
  stat: {
    borderRadius: 8,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  statValue: { fontSize: FS.lg, fontWeight: 1000, lineHeight: 1 },
  statLabel: { marginTop: 8, fontSize: FS.xs, color: "rgba(255,255,255,0.76)", fontWeight: 800 },

  kicker: {
    fontSize: FS.xxs,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: UI.inkMuted,
    margin: "22px 0 14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  card: (active, enabled) => ({
    position: "relative",
    minHeight: 240,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 18,
    padding: "24px 24px 22px",
    borderRadius: 8,
    border:
      active && enabled ? "1px solid rgba(15,118,110,0.48)" : "1px solid rgba(15,23,42,0.12)",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "start",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.55,
    boxShadow:
      active && enabled ? "0 24px 52px rgba(15,23,42,0.16)" : "0 12px 30px rgba(15,23,42,0.08)",
    transform: active && enabled ? "translateY(-3px)" : "translateY(0)",
    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
    overflow: "hidden",
    fontFamily: "inherit",
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: "#0f766e",
    background: "#ccfbf1",
    border: "1px solid #99f6e4",
    flexShrink: 0,
  },
  pill: {
    padding: "7px 12px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontSize: FS.xxs,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  cardTitle: { margin: 0, fontSize: FS.md, fontWeight: 1000, color: "#0f172a", lineHeight: 1.22 },
  cardBody: {
    marginTop: 10,
    fontSize: FS.sm,
    fontWeight: 700,
    color: "#475569",
    lineHeight: 1.55,
  },
  tags: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tag: {
    fontSize: FS.xxs,
    fontWeight: 900,
    color: "#0f766e",
    padding: "5px 11px",
    borderRadius: 999,
    background: "#f0fdfa",
    border: "1px solid #99f6e4",
    whiteSpace: "nowrap",
  },
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 16,
    borderTop: "1px solid rgba(15,23,42,0.09)",
    fontSize: FS.sm,
    fontWeight: 950,
    color: "#0f766e",
  },
  arrow: (active) => ({
    transform: active ? "translateX(3px)" : "none",
    transition: "transform .18s ease",
  }),
  footer: {
    marginTop: 26,
    textAlign: "center",
    fontSize: FS.xs,
    color: "#64748b",
    fontWeight: 800,
  },
};
