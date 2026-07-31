// src/pages/haccp and iso/Kitchen/KitchenHub.jsx
// 🍽️ Kitchen (المطبخ) — sub-hub inside the HACCP / ISO 22000 section.
// Same visual language as the ISO 22000 & HACCP Command Center (HaccpIsoMenu):
// dark-teal hero + stats, search & category filters, folder-icon module cards.
// Holds the kitchen-specific modules. More icons get added to MODULES below.

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import { isItemAllowed } from "../../../utils/sectionItems";
import { HaccpLangToggle } from "../_shared/haccpI18n";
import { useKitchenLang } from "./kitchenI18n";
import { BASE_FONT_PX, Btn, FS, UI, layout, shell } from "./kitchenUI";

/**
 * Kitchen modules.
 *  - `permId`   — id checked against the "iso" section permissions
 *  - `category` — drives the filter chips + the pill on the card
 *  - `ready:false` renders the card as a disabled "coming soon" placeholder
 */
export const MODULES = [
  {
    id: "menu-nutrition",
    permId: "kitchen.menu-nutrition",
    category: "labelling",
    icon: "🔥",
    titleEn: "Menu Calories & Nutrition",
    titleAr: "سعرات وقيم المنيو الغذائية",
    subEn: "ADG 10/2026 — calories per portion, 9 nutrients, bilingual menu, booklet & QR",
    subAr: "لائحة ADG 10/2026 — السعرات لكل حصة، 9 عناصر غذائية، منيو وكتيّب و QR ثنائي اللغة",
    route: "/haccp-iso/kitchen/menu-nutrition",
    tags: ["ADG 10/2026", "EN / العربية"],
    ready: true,
  },
];

/** Category labels — kept local to the hub (bilingual). */
const CATEGORY_LABEL = {
  labelling: { en: "Labelling", ar: "الوسم" },
  recipes: { en: "Recipes", ar: "الوصفات" },
  records: { en: "Records", ar: "السجلات" },
  hygiene: { en: "Hygiene", ar: "النظافة" },
};

function categoryLabel(id, isAr) {
  const c = CATEGORY_LABEL[id];
  if (!c) return id;
  return isAr ? c.ar : c.en;
}

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

export default function KitchenHub() {
  const navigate = useNavigate();
  const { t, lang, toggle, isAr, dir } = useKitchenLang();
  const [hovered, setHovered] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const visible = useMemo(() => MODULES.filter((m) => isItemAllowed("iso", m.permId)), []);

  // Only offer filters for categories that actually exist on this hub.
  const filters = useMemo(() => {
    const seen = [];
    visible.forEach((m) => {
      if (m.category && !seen.includes(m.category)) seen.push(m.category);
    });
    return seen;
  }, [visible]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter((m) => {
      const matchesCategory = activeCategory === "all" || m.category === activeCategory;
      const text = `${m.titleEn} ${m.titleAr} ${m.subEn} ${m.subAr} ${(m.tags || []).join(" ")}`.toLowerCase();
      return matchesCategory && (!q || text.includes(q));
    });
  }, [visible, activeCategory, query]);

  return (
    <main style={shell(dir, BASE_FONT_PX)}>
      <style>{`
        @media (max-width: 980px) {
          .kt-hero-inner, .kt-toolbar { grid-template-columns: 1fr !important; }
          .kt-hero-stats, .kt-filters { min-width: 0 !important; justify-content: flex-start !important; }
        }
        @media (max-width: 760px) { .kt-hub-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={layout}>
        {/* Controls above the hero — back + language */}
        <div style={S.controls}>
          <Btn onClick={() => navigate("/haccp-iso")}>{t("backToIso")}</Btn>
          <HaccpLangToggle lang={lang} toggle={toggle} />
        </div>

        {/* Hero */}
        <section style={S.hero}>
          <div aria-hidden="true" style={S.heroGlow} />

          <div className="kt-hero-inner" style={S.heroInner}>
            <div style={S.brand}>
              <img src={mawashiLogo} alt="Al Mawashi" style={S.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>HACCP / ISO 22000 · {t("kitchenEyebrow")}</p>
                <h1 style={S.title}>🍽️ {t("kitchenTitle")}</h1>
                <p style={S.subtitle}>{t("kitchenSubtitle")}</p>
              </div>
            </div>

            <div className="kt-hero-stats" style={S.heroStats}>
              <div style={S.stat}>
                <div style={S.statValue}>{visible.length}</div>
                <div style={S.statLabel}>{isAr ? "وحدات" : "Modules"}</div>
              </div>
              <div style={S.stat}>
                <div style={S.statValue}>ADG</div>
                <div style={S.statLabel}>10 / 2026</div>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar — search + category filters */}
        <section className="kt-toolbar" style={S.toolbar}>
          <label style={S.searchWrap}>
            <span aria-hidden="true" style={S.searchLabel}>{isAr ? "بحث" : "Search"}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث عن وحدة..." : "Find a module..."}
              style={S.searchInput}
            />
          </label>

          <div className="kt-filters" style={S.filters}>
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              style={S.filterButton(activeCategory === "all")}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {filters.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={S.filterButton(activeCategory === cat)}
              >
                {categoryLabel(cat, isAr)}
              </button>
            ))}
          </div>
        </section>

        {/* Module cards */}
        <section className="kt-hub-grid" style={S.grid} aria-label={t("kitchenTitle")}>
          {shown.map((m) => {
            const active = hovered === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!m.ready}
                style={S.card(m, active)}
                onMouseEnter={() => setHovered(m.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(m.id)}
                onBlur={() => setHovered(null)}
                onClick={() => m.ready && navigate(m.route)}
                title={isAr ? m.titleAr : m.titleEn}
              >
                <div style={S.cardTop}>
                  <div style={S.iconWrap}>
                    <IconFolder />
                  </div>
                  <span style={S.pill}>
                    {m.ready ? categoryLabel(m.category, isAr) : t("soon")}
                  </span>
                </div>

                <div>
                  <h2 style={S.cardTitle}>
                    <span style={{ marginInlineEnd: 8 }}>{m.icon}</span>
                    {isAr ? m.titleAr : m.titleEn}
                  </h2>
                  <div style={S.cardSub}>{isAr ? m.subAr : m.subEn}</div>
                  {(m.tags || []).length ? (
                    <div style={S.tags}>
                      {m.tags.map((tag) => (
                        <span key={tag} style={S.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={S.cardBottom}>
                  <span>{m.ready ? (isAr ? "فتح الوحدة" : "Open module") : t("soon")}</span>
                  <span aria-hidden="true" style={S.arrow(active)}>{isAr ? "←" : "→"}</span>
                </div>
              </button>
            );
          })}

          {!shown.length && (
            <div style={S.empty}>
              {visible.length
                ? isAr
                  ? "لا توجد وحدات مطابقة."
                  : "No matching kitchen modules found."
                : t("noPermission")}
            </div>
          )}
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
  title: {
    margin: "8px 0 0",
    fontSize: FS.xl,
    fontWeight: 1000,
    lineHeight: 1.05,
  },
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

  toolbar: {
    margin: "22px 0",
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) auto",
    gap: 14,
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.13)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  },
  searchLabel: { fontSize: FS.xs, fontWeight: 900, color: UI.inkMuted, whiteSpace: "nowrap" },
  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#0f172a",
    fontSize: FS.sm,
    fontWeight: 800,
    fontFamily: "inherit",
  },
  filters: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 },
  filterButton: (active) => ({
    minHeight: 52,
    padding: "10px 18px",
    borderRadius: 8,
    border: active ? "1px solid #0f766e" : "1px solid rgba(15,23,42,0.14)",
    background: active ? "#0f766e" : "#fff",
    color: active ? "#fff" : "#334155",
    fontSize: FS.sm,
    fontWeight: 950,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: active ? "0 14px 28px rgba(15,118,110,0.22)" : "0 10px 20px rgba(15,23,42,0.07)",
  }),

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))",
    gap: 18,
  },
  card: (m, active) => ({
    position: "relative",
    minHeight: 220,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 18,
    padding: "24px 24px 22px",
    borderRadius: 8,
    border:
      active && m.ready ? "1px solid rgba(15,118,110,0.48)" : "1px solid rgba(15,23,42,0.12)",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "start",
    cursor: m.ready ? "pointer" : "not-allowed",
    opacity: m.ready ? 1 : 0.6,
    boxShadow:
      active && m.ready ? "0 24px 52px rgba(15,23,42,0.16)" : "0 12px 30px rgba(15,23,42,0.08)",
    transform: active && m.ready ? "translateY(-3px)" : "translateY(0)",
    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
    overflow: "hidden",
    fontFamily: "inherit",
  }),
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 },
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
  cardTitle: {
    margin: 0,
    fontSize: FS.md,
    lineHeight: 1.22,
    fontWeight: 1000,
    color: "#0f172a",
  },
  cardSub: {
    marginTop: 10,
    fontSize: FS.sm,
    lineHeight: 1.5,
    fontWeight: 700,
    color: "#475569",
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
  empty: {
    gridColumn: "1 / -1",
    padding: 28,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#64748b",
    fontSize: FS.sm,
    fontWeight: 800,
    textAlign: "center",
  },
  footer: {
    marginTop: 26,
    textAlign: "center",
    fontSize: FS.xs,
    color: "#64748b",
    fontWeight: 800,
  },
};
