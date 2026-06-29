// src/pages/settings/SettingsPage.jsx
// Settings & Admin Tools Hub - aligned with the refreshed NamedDashboard design.

import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiArrowLeft,
  FiBell,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiCreditCard,
  FiDatabase,
  FiDownloadCloud,
  FiGrid,
  FiHardDrive,
  FiHeart,
  FiImage,
  FiLayers,
  FiSearch,
  FiShield,
  FiSliders,
  FiUsers,
} from "react-icons/fi";
import logo from "../../assets/almawashi-logo.jpg";

import BackupTab from "./BackupTab";
import ExcelBackupTab from "./ExcelBackupTab";
import ProductsTab from "./ProductsTab";
import NotificationsTab from "./NotificationsTab";
import DataInventory from "./tools/DataInventory";
import ServerHealth from "./tools/ServerHealth";
import BulkExport from "./tools/BulkExport";
import DateTree from "./tools/DateTree";
import AppearanceAndLanguage from "./tools/AppearanceAndLanguage";
import ImageMigration from "../admin/ImageMigration";
import ComplaintNumberBackfill from "../admin/ComplaintNumberBackfill";
import AccountsManagementTab from "./AccountsManagementTab";
import SecurityControlsTab from "./SecurityControlsTab";
import SubscriptionTab from "../admin/SubscriptionTab";
import PlansTab from "./PlansTab";
import CompaniesTab from "./CompaniesTab";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";

const SECTIONS = [
  {
    id: "general",
    label: "General",
    lk: "secGeneral",
    items: [
      {
        id: "appearance",
        Icon: FiSliders,
        title: "Appearance & Language",
        desc: "Theme, AR/EN preferences",
        tk: "tAppearance",
        dk: "tAppearanceD",
        grad: "linear-gradient(135deg,#06b6d4,#0284c7)",
        glow: "rgba(6,182,212,.30)",
      },
      {
        id: "notifications",
        Icon: FiBell,
        title: "Notifications",
        desc: "Daily reminders, alerts",
        tk: "tNotifications",
        dk: "tNotificationsD",
        grad: "linear-gradient(135deg,#f59e0b,#d97706)",
        glow: "rgba(245,158,11,.30)",
      },
    ],
  },
  {
    id: "data",
    label: "Data Tools",
    lk: "secData",
    items: [
      {
        id: "inventory",
        Icon: FiDatabase,
        title: "Data Inventory",
        desc: "Count + size per record type",
        tk: "tInventory",
        dk: "tInventoryD",
        grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
        glow: "rgba(59,130,246,.30)",
      },
      {
        id: "date-tree",
        Icon: FiCalendar,
        title: "Date Tree Explorer",
        desc: "Browse by Year / Month / Day",
        tk: "tDateTree",
        dk: "tDateTreeD",
        grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
        glow: "rgba(139,92,246,.30)",
      },
      {
        id: "export",
        Icon: FiDownloadCloud,
        title: "Bulk Export",
        desc: "Download as JSON / CSV",
        tk: "tExport",
        dk: "tExportD",
        grad: "linear-gradient(135deg,#10b981,#059669)",
        glow: "rgba(16,185,129,.30)",
      },
      {
        id: "backup",
        Icon: FiHardDrive,
        title: "Backup & Restore",
        desc: "Full local backup",
        tk: "tBackup",
        dk: "tBackupD",
        grad: "linear-gradient(135deg,#0891b2,#0e7490)",
        glow: "rgba(8,145,178,.30)",
      },
      {
        id: "excel-backup",
        Icon: FiArchive,
        title: "Excel Backup",
        desc: "All branches to ZIP + Excel",
        tk: "tExcelBackup",
        dk: "tExcelBackupD",
        grad: "linear-gradient(135deg,#84cc16,#65a30d)",
        glow: "rgba(132,204,22,.30)",
      },
      {
        id: "products",
        Icon: FiBox,
        title: "Products Catalog",
        desc: "Add/edit products & barcodes",
        tk: "tProducts",
        dk: "tProductsD",
        grad: "linear-gradient(135deg,#14b8a6,#0d9488)",
        glow: "rgba(20,184,166,.30)",
      },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    lk: "secAccounts",
    items: [
      {
        id: "accounts-mgmt",
        Icon: FiUsers,
        title: "Account Management",
        desc: "Users, permissions, activity log",
        tk: "tAccounts",
        dk: "tAccountsD",
        grad: "linear-gradient(135deg,#7c3aed,#6d28d9)",
        glow: "rgba(124,58,237,.30)",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing & Plans",
    lk: "secBilling",
    items: [
      {
        id: "subscription",
        Icon: FiCreditCard,
        title: "Subscription",
        desc: "Current plan, activation, expiry",
        tk: "tSubscription",
        dk: "tSubscriptionD",
        grad: "linear-gradient(135deg,#059669,#065f46)",
        glow: "rgba(5,150,105,.30)",
      },
      {
        id: "plans",
        Icon: FiLayers,
        title: "Plans",
        desc: "Create, edit, price, limits",
        tk: "tPlans",
        dk: "tPlansD",
        grad: "linear-gradient(135deg,#0891b2,#0e7490)",
        glow: "rgba(8,145,178,.30)",
      },
      {
        id: "companies",
        Icon: FiBriefcase,
        title: "Companies",
        desc: "Clients, assign plans, track",
        tk: "tCompanies",
        dk: "tCompaniesD",
        grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
        glow: "rgba(59,130,246,.30)",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    lk: "secSecurity",
    items: [
      {
        id: "security-controls",
        Icon: FiShield,
        title: "Security Controls",
        desc: "Delete permissions, read-only mode, session timeout",
        tk: "tSecurity",
        dk: "tSecurityD",
        grad: "linear-gradient(135deg,#dc2626,#9f1239)",
        glow: "rgba(220,38,38,.30)",
      },
    ],
  },
  {
    id: "admin",
    label: "Admin Tools",
    lk: "secAdmin",
    items: [
      {
        id: "image-migration",
        Icon: FiImage,
        title: "Image Cleanup",
        desc: "Convert base64 to Cloudinary URLs",
        tk: "tImageMigration",
        dk: "tImageMigrationD",
        grad: "linear-gradient(135deg,#ec4899,#db2777)",
        glow: "rgba(236,72,153,.30)",
      },
      {
        id: "complaint-numbers",
        Icon: FiGrid,
        title: "Complaint Numbers",
        desc: "Backfill missing complaint No.",
        tk: "tComplaintNumbers",
        dk: "tComplaintNumbersD",
        grad: "linear-gradient(135deg,#f97316,#ea580c)",
        glow: "rgba(249,115,22,.30)",
      },
      {
        id: "server-health",
        Icon: FiHeart,
        title: "Server Health",
        desc: "Ping + latency monitor",
        tk: "tServerHealth",
        dk: "tServerHealthD",
        grad: "linear-gradient(135deg,#ef4444,#dc2626)",
        glow: "rgba(239,68,68,.30)",
      },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, sectionId: section.id, sectionLabel: section.label, sectionKey: section.lk }))
);

const findItem = (id) => ALL_ITEMS.find((item) => item.id === id);

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
}

function toolComponent(active) {
  switch (active) {
    case "appearance":
      return <AppearanceAndLanguage />;
    case "notifications":
      return <NotificationsTab />;
    case "inventory":
      return <DataInventory />;
    case "date-tree":
      return <DateTree />;
    case "export":
      return <BulkExport />;
    case "backup":
      return <BackupTab />;
    case "excel-backup":
      return <ExcelBackupTab />;
    case "products":
      return <ProductsTab />;
    case "image-migration":
      return <ImageMigration />;
    case "complaint-numbers":
      return <ComplaintNumberBackfill />;
    case "server-health":
      return <ServerHealth />;
    case "security-controls":
      return <SecurityControlsTab />;
    case "subscription":
      return <SubscriptionTab />;
    case "plans":
      return <PlansTab />;
    case "companies":
      return <CompaniesTab />;
    default:
      return null;
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t, dir, lang, toggle } = useSettingsLang();
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [query, setQuery] = useState("");
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  })();

  const displayName = currentUser.displayName || currentUser.username || "User";
  const isAdmin = !!currentUser.isAdmin;
  const permissions = currentUser.permissions || [];
  const isFullAccess = permissions.includes("*") || permissions.length === 0;
  const canOpenSettings = isAdmin || isFullAccess || permissions.includes("settings");
  const activeItem = active ? findItem(active) : null;
  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;

    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const haystack = [
          section.label,
          t(section.lk),
          item.title,
          item.desc,
          t(item.tk),
          t(item.dk),
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      }),
    })).filter((section) => section.items.length > 0);
  }, [query, t]);

  const filteredCount = filteredSections.reduce((sum, section) => sum + section.items.length, 0);

  if (!canOpenSettings) {
    return (
      <main className="settings-new-page" style={styles.page} dir={dir}>
        <div style={styles.layout}>
          <section style={styles.empty}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              {lang === "ar" ? "لا توجد صلاحية لفتح الإعدادات" : "Settings access is not assigned"}
            </div>
            <div style={{ marginBottom: 18 }}>
              {lang === "ar" ? "تواصل مع المدير لتحديث صلاحيات حسابك." : "Contact an administrator to update your account permissions."}
            </div>
            <button type="button" onClick={() => navigate(-1)} style={styles.backToTools}>
              <FiArrowLeft aria-hidden="true" />
              {t("back")}
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (active === "accounts-mgmt") {
    return (
      <main className="settings-new-page" style={styles.page} dir={dir}>
        <AccountsManagementTab onClose={() => setActive(null)} />
      </main>
    );
  }

  return (
    <main className="settings-new-page" style={styles.page} dir={dir}>
      <style>{`
        .settings-new-page h1 { font-size: clamp(26px, 4vw, 44px) !important; }
        .settings-new-page h2 { font-size: 20px !important; }
        .settings-card-title { font-size: 20px !important; }
        .settings-hero-subtitle { font-size: 15px !important; }
        .settings-new-page button,
        .settings-new-page input {
          font-family: inherit;
        }
        .settings-card {
          animation: settingsCardIn .32s ease both;
        }
        .settings-card:focus-visible,
        .settings-hero-button:focus-visible,
        .settings-search-input:focus-visible {
          outline: 3px solid rgba(14,165,233,.35);
          outline-offset: 3px;
        }
        @keyframes settingsSweep {
          0% { transform: translateX(-18%); opacity: .45; }
          50% { opacity: .95; }
          100% { transform: translateX(118%); opacity: .45; }
        }
        @keyframes settingsCardIn {
          from { opacity: 0; filter: saturate(.75); }
          to { opacity: 1; filter: saturate(1); }
        }
        @media (max-width: 980px) {
          .settings-hero-inner,
          .settings-toolbar,
          .settings-panel-shell {
            grid-template-columns: 1fr !important;
          }
          .settings-hero-actions,
          .settings-summary {
            min-width: 0 !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      <div style={styles.layout}>
        <section style={styles.hero}>
          <div aria-hidden="true" style={styles.heroGlow} />
          <div aria-hidden="true" style={styles.heroSweep} />
          <div aria-hidden="true" style={styles.heroLine} />

          <div className="settings-hero-inner" style={styles.heroInner}>
            <div style={styles.brand}>
              <img src={logo} alt="Al Mawashi" style={styles.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={styles.eyebrow}>Al Mawashi QMS</p>
                <h1 style={styles.title}>{t("settingsTitle")}</h1>
                <p className="settings-hero-subtitle" style={styles.subtitle}>
                  {ALL_ITEMS.length} {t(ALL_ITEMS.length !== 1 ? "settingsSubPlural" : "settingsSub")} - {t("clickToOpen")}
                </p>
              </div>
            </div>

            <div className="settings-hero-actions" style={styles.heroActions}>
              <div style={styles.userPanel}>
                <div style={styles.userTop}>
                  <div style={styles.avatar}>{displayName[0]?.toUpperCase() || "U"}</div>
                  <div>
                    <div style={styles.userMeta}>{t(greetingKey())}</div>
                    <div style={styles.userName}>
                      {displayName}
                      {isAdmin && <span style={styles.adminBadge}>{t("adminTag")}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.actionRow}>
                <button type="button" className="settings-hero-button" style={styles.heroButton()} title={dateStr}>
                  {timeStr}
                </button>
                <LangToggle lang={lang} toggle={toggle} style={styles.langButton} />
                <button type="button" className="settings-hero-button" onClick={() => navigate(-1)} style={styles.heroButton("ghost")}>
                  <FiArrowLeft aria-hidden="true" />
                  {t("back")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {active === null ? (
          <>
            <section className="settings-toolbar" style={styles.toolbar}>
              <label style={styles.searchWrap}>
                <FiSearch aria-hidden="true" />
                <input
                  className="settings-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={lang === "ar" ? "ابحث في الإعدادات..." : "Search settings tools..."}
                  style={styles.searchInput}
                />
              </label>

              <div className="settings-summary" style={styles.summary}>
                <div style={styles.chip}>{filteredCount} {t(filteredCount !== 1 ? "settingsSubPlural" : "settingsSub")}</div>
                <div style={styles.chip}>{SECTIONS.length} {lang === "ar" ? "مجموعات" : "Groups"}</div>
                {isAdmin && <div style={styles.chip}>{t("adminTag")}</div>}
              </div>
            </section>

            {filteredSections.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>{lang === "ar" ? "لا توجد نتائج" : "No tools found"}</div>
                <div>{lang === "ar" ? "جرّب كلمة بحث مختلفة." : "Try another search term."}</div>
              </div>
            ) : (
              filteredSections.map((section) => (
                <section key={section.id} style={styles.section}>
                  <div style={styles.sectionHead}>
                    <span>{t(section.lk)}</span>
                    <span style={styles.sectionCount}>{section.items.length}</span>
                  </div>

                  <div style={styles.grid}>
                    {section.items.map((item) => {
                      const isHover = hovered === item.id;
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="settings-card"
                          onClick={() => setActive(item.id)}
                          onMouseEnter={() => setHovered(item.id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(item.id)}
                          onBlur={() => setHovered(null)}
                          style={styles.card(isHover, item)}
                        >
                          <div style={styles.cardTop}>
                            <div style={styles.iconWrap(item)}>
                              <Icon aria-hidden="true" size={25} />
                            </div>
                            <span style={styles.cardTag}>{t(section.lk)}</span>
                          </div>

                          <div>
                            <h2 className="settings-card-title" style={styles.cardTitle}>{t(item.tk)}</h2>
                            <div style={styles.cardSub}>{t(item.dk)}</div>
                          </div>

                          <div style={styles.cardBottom}>
                            <span>{lang === "ar" ? "فتح الأداة" : "Open tool"}</span>
                            <span aria-hidden="true">{dir === "rtl" ? "<-" : "->"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </>
        ) : (
          <section className="settings-panel-shell" style={styles.panelShell}>
            <aside style={styles.panelAside}>
              <button type="button" onClick={() => setActive(null)} style={styles.backToTools}>
                <FiArrowLeft aria-hidden="true" />
                {t("allTools")}
              </button>

              {activeItem && (
                <div style={styles.activeTool}>
                  <div style={styles.iconWrap(activeItem)}>
                    <activeItem.Icon aria-hidden="true" size={25} />
                  </div>
                  <div>
                    <div style={styles.activeSection}>{t(activeItem.sectionKey)}</div>
                    <h2 style={styles.activeTitle}>{t(activeItem.tk)}</h2>
                    <p style={styles.activeDesc}>{t(activeItem.dk)}</p>
                  </div>
                </div>
              )}
            </aside>

            <div style={styles.panelCard}>
              {toolComponent(active)}
            </div>
          </section>
        )}

        <footer style={styles.footer}>Built by Eng. Mohammed Abdullah</footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px clamp(18px, 3vw, 48px) 38px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  layout: {
    width: "min(1760px, 100%)",
    margin: "0 auto",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "26px clamp(22px, 4vw, 54px)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
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
  heroSweep: {
    position: "absolute",
    left: "-22%",
    top: 0,
    width: "42%",
    height: 5,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
    animation: "settingsSweep 5.8s ease-in-out infinite",
  },
  heroLine: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: 6,
    background: "linear-gradient(90deg, #22c55e, #06b6d4, #f59e0b, #22c55e)",
    backgroundSize: "220% 100%",
    opacity: .86,
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 24,
    alignItems: "center",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },
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
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 0",
    fontWeight: 1000,
    lineHeight: 1.05,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 980,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  heroActions: {
    display: "grid",
    gap: 12,
    minWidth: 360,
  },
  userPanel: {
    borderRadius: 8,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  userTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    fontWeight: 1000,
    flexShrink: 0,
  },
  userMeta: {
    color: "rgba(255,255,255,0.74)",
    fontWeight: 800,
    lineHeight: 1.3,
  },
  userName: {
    marginTop: 4,
    color: "#fff",
    fontWeight: 1000,
    lineHeight: 1.2,
  },
  adminBadge: {
    marginInlineStart: 8,
    display: "inline-flex",
    alignItems: "center",
    minHeight: 22,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(245,158,11,.24)",
    border: "1px solid rgba(245,158,11,.40)",
    color: "#fde68a",
    fontWeight: 950,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  heroButton: (tone = "ghost") => ({
    minHeight: 52,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: "10px 18px",
    borderRadius: 8,
    border: tone === "danger" ? "1px solid rgba(254,202,202,0.35)" : "1px solid rgba(255,255,255,0.24)",
    background: tone === "danger" ? "rgba(220,38,38,0.34)" : "rgba(255,255,255,0.13)",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
  }),
  langButton: {
    minHeight: 52,
    borderRadius: 8,
    background: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.24)",
  },
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
  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#0f172a",
    fontWeight: 800,
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  chip: {
    minHeight: 52,
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: 8,
    background: "#fff",
    color: "#334155",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 10px 20px rgba(15,23,42,0.07)",
    fontWeight: 950,
  },
  section: {
    marginBottom: 24,
  },
  sectionHead: {
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#334155",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  sectionCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#0f766e",
    letterSpacing: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
    gap: 18,
  },
  card: (isHover, item) => ({
    position: "relative",
    minHeight: 210,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 18,
    padding: "24px 24px 22px",
    borderRadius: 8,
    border: isHover ? "1px solid rgba(15,118,110,0.48)" : "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "start",
    boxShadow: isHover ? `0 24px 52px ${item.glow}` : "0 12px 30px rgba(15,23,42,0.08)",
    transform: isHover ? "translateY(-3px)" : "translateY(0)",
    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
    overflow: "hidden",
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  iconWrap: (item) => ({
    width: 60,
    height: 60,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    background: item.grad,
    boxShadow: `0 14px 26px ${item.glow}`,
    flexShrink: 0,
  }),
  cardTag: {
    padding: "7px 12px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  cardTitle: {
    margin: 0,
    lineHeight: 1.2,
    fontWeight: 1000,
    color: "#0f172a",
  },
  cardSub: {
    marginTop: 10,
    lineHeight: 1.45,
    fontWeight: 700,
    color: "#64748b",
  },
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 16,
    borderTop: "1px solid rgba(15,23,42,0.09)",
    color: "#0f766e",
    fontWeight: 950,
  },
  empty: {
    padding: 34,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    textAlign: "center",
    color: "#64748b",
    fontWeight: 850,
  },
  panelShell: {
    marginTop: 22,
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 18,
    alignItems: "start",
  },
  panelAside: {
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 18,
    display: "grid",
    gap: 18,
  },
  backToTools: {
    minHeight: 46,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 950,
    cursor: "pointer",
  },
  activeTool: {
    display: "grid",
    gap: 14,
  },
  activeSection: {
    marginBottom: 8,
    color: "#0f766e",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  activeTitle: {
    margin: 0,
    color: "#0f172a",
    fontWeight: 1000,
    lineHeight: 1.2,
  },
  activeDesc: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.55,
    fontWeight: 750,
  },
  panelCard: {
    minWidth: 0,
    minHeight: 520,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: "22px clamp(16px, 2vw, 26px)",
    overflow: "auto",
  },
  footer: {
    marginTop: 26,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 800,
  },
};
