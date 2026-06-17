// src/pages/settings/SettingsPage.jsx
// ⚙️ Settings & Admin Tools Hub — matched to NamedDashboard aesthetic (dark glass + blobs + tiles)

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import PlansTab        from "./PlansTab";
import CompaniesTab    from "./CompaniesTab";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";

/* ─── Sections + per-item colored gradients (matched to NamedDashboard tiles) ─── */
const SECTIONS = [
  {
    id: "general",
    label: "General", lk: "secGeneral",
    items: [
      { id: "appearance",    icon: "🎨", title: "Appearance & Language", desc: "Theme, AR/EN preferences", tk: "tAppearance", dk: "tAppearanceD",
        grad: "linear-gradient(135deg,#06b6d4,#0284c7)", glow: "rgba(6,182,212,.45)" },
      { id: "notifications", icon: "🔔", title: "Notifications",         desc: "Daily reminders, alerts", tk: "tNotifications", dk: "tNotificationsD",
        grad: "linear-gradient(135deg,#f59e0b,#d97706)", glow: "rgba(245,158,11,.45)" },
    ],
  },
  {
    id: "data",
    label: "Data Tools", lk: "secData",
    items: [
      { id: "inventory",     icon: "📊", title: "Data Inventory",     desc: "Count + size per record type", tk: "tInventory", dk: "tInventoryD",
        grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)", glow: "rgba(59,130,246,.45)" },
      { id: "date-tree",     icon: "🗂️", title: "Date Tree Explorer", desc: "Browse by Year / Month / Day", tk: "tDateTree", dk: "tDateTreeD",
        grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)", glow: "rgba(139,92,246,.45)" },
      { id: "export",        icon: "📦", title: "Bulk Export",        desc: "Download as JSON / CSV", tk: "tExport", dk: "tExportD",
        grad: "linear-gradient(135deg,#10b981,#059669)", glow: "rgba(16,185,129,.45)" },
      { id: "backup",        icon: "💾", title: "Backup & Restore",   desc: "Full local backup", tk: "tBackup", dk: "tBackupD",
        grad: "linear-gradient(135deg,#0891b2,#0e7490)", glow: "rgba(8,145,178,.45)" },
      { id: "excel-backup",  icon: "📑", title: "Excel Backup",       desc: "All branches → ZIP + Excel", tk: "tExcelBackup", dk: "tExcelBackupD",
        grad: "linear-gradient(135deg,#84cc16,#65a30d)", glow: "rgba(132,204,22,.45)" },
      { id: "products",      icon: "🏷️", title: "Products Catalog",   desc: "Add/edit products & barcodes", tk: "tProducts", dk: "tProductsD",
        grad: "linear-gradient(135deg,#14b8a6,#0d9488)", glow: "rgba(20,184,166,.45)" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts", lk: "secAccounts",
    items: [
      { id: "accounts-mgmt", icon: "👥", title: "Account Management", desc: "Users · permissions · activity log", tk: "tAccounts", dk: "tAccountsD",
        grad: "linear-gradient(135deg,#7c3aed,#6d28d9)", glow: "rgba(124,58,237,.45)" },
    ],
  },
  {
    id: "billing",
    label: "Billing & Plans", lk: "secBilling",
    items: [
      { id: "subscription", icon: "💳", title: "Subscription",  desc: "Current plan · activation · expiry", tk: "tSubscription", dk: "tSubscriptionD",
        grad: "linear-gradient(135deg,#059669,#065f46)", glow: "rgba(5,150,105,.45)" },
      { id: "plans",        icon: "📋", title: "Plans",         desc: "Create · edit · price · limits", tk: "tPlans", dk: "tPlansD",
        grad: "linear-gradient(135deg,#0891b2,#0e7490)", glow: "rgba(8,145,178,.45)" },
      { id: "companies",    icon: "🏢", title: "Companies",     desc: "Clients · assign plans · track", tk: "tCompanies", dk: "tCompaniesD",
        grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)", glow: "rgba(59,130,246,.45)" },
    ],
  },
  {
    id: "security",
    label: "Security", lk: "secSecurity",
    items: [
      { id: "security-controls", icon: "🔐", title: "Security Controls",
        desc: "Delete permissions · read-only mode · session timeout", tk: "tSecurity", dk: "tSecurityD",
        grad: "linear-gradient(135deg,#dc2626,#9f1239)", glow: "rgba(220,38,38,.45)" },
    ],
  },
  {
    id: "admin",
    label: "Admin Tools", lk: "secAdmin",
    items: [
      { id: "image-migration",  icon: "🖼️", title: "Image Cleanup",      desc: "Convert base64 → Cloudinary URLs", tk: "tImageMigration", dk: "tImageMigrationD",
        grad: "linear-gradient(135deg,#ec4899,#db2777)", glow: "rgba(236,72,153,.45)" },
      { id: "complaint-numbers", icon: "🔢", title: "Complaint Numbers", desc: "Backfill missing complaint No.", tk: "tComplaintNumbers", dk: "tComplaintNumbersD",
        grad: "linear-gradient(135deg,#f97316,#ea580c)", glow: "rgba(249,115,22,.45)" },
      { id: "server-health",    icon: "🩺", title: "Server Health",      desc: "Ping + latency monitor", tk: "tServerHealth", dk: "tServerHealthD",
        grad: "linear-gradient(135deg,#ef4444,#dc2626)", glow: "rgba(239,68,68,.45)" },
    ],
  },
];

/* Flatten for lookup */
const ALL_ITEMS = SECTIONS.flatMap(s => s.items);
const findItem  = (id) => ALL_ITEMS.find(it => it.id === id);

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const [active, setActive] = useState(null);   // null = hub (grid), id = open panel
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();
  const displayName = currentUser.displayName || currentUser.username || "User";
  const isAdmin     = !!currentUser.isAdmin;

  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const activeItem = active ? findItem(active) : null;

  return (
    <div style={s.page} dir={dir}>
      <style>{`
        @keyframes ndFloat{
          0%  {transform:translate(0,0)   scale(1);}
          50% {transform:translate(40px,-24px) scale(1.08);}
          100%{transform:translate(0,0)   scale(1);}
        }
        .nd-tile{transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;}
        .nd-tile:hover{
          transform:translateY(-6px) scale(1.04) !important;
          filter:brightness(1.08);
        }
        .nd-tile:active{transform:scale(.96) !important;}
        .nd-btn{transition:all .18s ease;}
        .nd-btn:hover{opacity:.85;transform:translateY(-1px);}
        .nd-btn:active{transform:scale(.96);}
      `}</style>

      {/* ── animated blobs (same as NamedDashboard) ── */}
      <div style={{...s.blob,
        left:-220, top:-200,
        background:"radial-gradient(circle,rgba(34,211,238,.55),transparent 68%)",
        animation:"ndFloat 18s ease-in-out infinite",
      }}/>
      <div style={{...s.blob,
        right:-240, top:-150,
        background:"radial-gradient(circle,rgba(124,58,237,.55),transparent 68%)",
        animation:"ndFloat 21s ease-in-out infinite reverse",
      }}/>
      <div style={{...s.blob,
        left:"30%", bottom:-240,
        background:"radial-gradient(circle,rgba(16,185,129,.45),transparent 68%)",
        animation:"ndFloat 24s ease-in-out infinite",
      }}/>

      {/* ════════════ TOP BAR ════════════ */}
      <header style={s.header}>
        <div style={s.brandRow}>
          <img src={logo} alt="logo" style={s.brandLogo}/>
          <div>
            <div style={s.brandName}>Al Mawashi QMS</div>
            <div style={s.brandSub}>⚙️ {t("settingsTitle")}</div>
          </div>
        </div>

        <div style={s.clockBox}>
          <div style={s.clockTime}>{timeStr}</div>
          <div style={s.clockDate}>{dateStr}</div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <div style={s.userChip}>
            <div style={s.avatar}>{displayName[0]?.toUpperCase() || "U"}</div>
            <div>
              <div style={s.userHello}>{t(greetingKey())}</div>
              <div style={s.userName}>
                {displayName}
                {isAdmin && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 900,
                    background: "rgba(245,158,11,.3)", color: "#fcd34d",
                    border: "1px solid rgba(245,158,11,.4)",
                    padding: "1px 6px", borderRadius: 999,
                  }}>
                    👑 {t("adminTag")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <LangToggle lang={lang} toggle={toggle} style={{ marginRight: 8 }} />
          <button className="nd-btn" onClick={() => navigate(-1)} style={s.btnBack}>
            ← {t("back")}
          </button>
        </div>
      </header>

      {/* ════════════ MAIN ════════════ */}
      <main style={s.main}>
        {active === null ? (
          /* ── HUB VIEW: colored tiles grouped by section ── */
          <>
            <div style={s.hero}>
              <h1 style={s.heroTitle}>{t("settingsTitle")}</h1>
              <p style={s.heroSub}>
                {ALL_ITEMS.length} {t(ALL_ITEMS.length !== 1 ? "settingsSubPlural" : "settingsSub")} · {t("clickToOpen")}
              </p>
            </div>

            {SECTIONS.map(sec => (
              <section key={sec.id} style={{ marginBottom: 28 }}>
                <div style={s.sectionLabel}>{t(sec.lk)}</div>
                <div style={s.grid}>
                  {sec.items.map(item => (
                    <button
                      key={item.id}
                      className="nd-tile"
                      onClick={() => setActive(item.id)}
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        ...s.tile,
                        background: item.grad,
                        boxShadow: hovered === item.id
                          ? `0 20px 50px ${item.glow}, 0 0 0 2px rgba(255,255,255,.25)`
                          : `0 8px 24px ${item.glow}`,
                      }}
                    >
                      <div style={s.tileShimmer}/>
                      <div style={s.tileIconWrap}>
                        <span style={s.tileIcon}>{item.icon}</span>
                      </div>
                      <div style={s.tileLabel}>{t(item.tk)}</div>
                      <div style={s.tileDesc}>{t(item.dk)}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          /* ── PANEL VIEW ── */
          <>
            {/* Account Management → full-screen overlay, handles its own layout */}
            {active === "accounts-mgmt" && (
              <AccountsManagementTab onClose={() => setActive(null)} />
            )}

            {/* All other tools: breadcrumb + white glass card */}
            {active !== "accounts-mgmt" && (
              <>
                <div style={s.panelHeader}>
                  <button className="nd-btn" onClick={() => setActive(null)} style={s.btnHub}>
                    ← {t("allTools")}
                  </button>
                  {activeItem && (
                    <div style={s.crumb}>
                      <div style={{ ...s.crumbIcon, background: activeItem.grad, boxShadow: `0 6px 18px ${activeItem.glow}` }}>
                        {activeItem.icon}
                      </div>
                      <div>
                        <div style={s.crumbTitle}>{t(activeItem.tk)}</div>
                        <div style={s.crumbDesc}>{t(activeItem.dk)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={s.panelCard}>
                  {active === "appearance"        && <AppearanceAndLanguage />}
                  {active === "notifications"     && <NotificationsTab />}
                  {active === "inventory"         && <DataInventory />}
                  {active === "date-tree"         && <DateTree />}
                  {active === "export"            && <BulkExport />}
                  {active === "backup"            && <BackupTab />}
                  {active === "excel-backup"      && <ExcelBackupTab />}
                  {active === "products"          && <ProductsTab />}
                  {active === "image-migration"   && <ImageMigration />}
                  {active === "complaint-numbers" && <ComplaintNumberBackfill />}
                  {active === "server-health"     && <ServerHealth />}
                  {active === "security-controls" && <SecurityControlsTab />}
                  {active === "subscription"      && <SubscriptionTab />}
                  {active === "plans"             && <PlansTab />}
                  {active === "companies"         && <CompaniesTab />}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer style={s.footer}>Built by Eng. Mohammed Abdullah</footer>
    </div>
  );
}

/* ─── Styles (mirrors NamedDashboard) ─── */
const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(140deg,#0f172a 0%,#1e1b4b 45%,#0f172a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 1.2rem 2.5rem",
    fontFamily: "Cairo,'Segoe UI',system-ui,sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  blob: {
    position: "absolute",
    width: 520, height: 520,
    borderRadius: "50%",
    filter: "blur(42px)",
    opacity: .65,
    pointerEvents: "none",
    zIndex: 0,
    mixBlendMode: "screen",
  },

  /* ── header ── */
  header: {
    width: "100%", maxWidth: 1200,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 0 16px",
    zIndex: 2, flexWrap: "wrap", gap: 14,
    borderBottom: "1px solid rgba(255,255,255,.08)",
    marginBottom: 10,
  },
  brandRow: { display:"flex", alignItems:"center", gap:12 },
  brandLogo: {
    width: 46, height: 46, borderRadius: 12,
    objectFit: "cover",
    boxShadow: "0 6px 18px rgba(0,0,0,.4)",
    border: "2px solid rgba(255,255,255,.2)",
  },
  brandName: { fontWeight: 1000, fontSize: 16, color: "#f1f5f9", lineHeight: 1.1 },
  brandSub:  { fontWeight: 700,  fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 },

  clockBox: {
    textAlign: "center",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 14, padding: "8px 20px",
    backdropFilter: "blur(8px)",
  },
  clockTime: { fontWeight: 1000, fontSize: 22, color: "#f1f5f9", letterSpacing: ".04em", lineHeight: 1 },
  clockDate: { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 700, marginTop: 3 },

  userChip: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,.1)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 999,
    padding: "7px 16px 7px 7px",
    boxShadow: "0 4px 14px rgba(0,0,0,.25)",
  },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg,#f97316,#ec4899)",
    color: "#fff", fontWeight: 1000, fontSize: 15,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 3px 10px rgba(0,0,0,.3)",
    flexShrink: 0,
  },
  userHello: { fontSize: 10, color: "rgba(255,255,255,.6)", fontWeight: 700 },
  userName:  { fontSize: 14, color: "#fff", fontWeight: 900 },

  btnBack: {
    padding: "9px 18px",
    background: "rgba(255,255,255,.12)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 12, color: "#fff",
    fontWeight: 900, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(0,0,0,.2)",
  },

  /* ── main ── */
  main: { width: "100%", maxWidth: 1200, zIndex: 2, flex: 1 },

  hero: { textAlign: "center", marginBottom: 32, paddingTop: 12 },
  heroTitle: {
    margin: 0, fontWeight: 1000, fontSize: 32, color: "#f1f5f9",
    letterSpacing: "-.01em",
    textShadow: "0 4px 24px rgba(0,0,0,.4)",
  },
  heroSub: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,.55)",
    fontWeight: 700, fontSize: 15,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,.55)",
    textTransform: "uppercase", letterSpacing: ".18em",
    marginBottom: 12, paddingLeft: 4,
    display: "flex", alignItems: "center", gap: 10,
  },

  /* ── grid + tiles ── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))",
    gap: "1.1rem",
  },
  tile: {
    position: "relative", overflow: "hidden",
    borderRadius: 22,
    border: "1.5px solid rgba(255,255,255,.22)",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "0.55rem",
    padding: "22px 16px 20px",
    cursor: "pointer",
    fontFamily: "Cairo,'Segoe UI',sans-serif",
    color: "#fff",
    minHeight: 170,
    textAlign: "center",
  },
  tileShimmer: {
    position: "absolute", top: 0, left: "-100%",
    width: "60%", height: "100%",
    background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)",
    transform: "skewX(-20deg)", pointerEvents: "none",
  },
  tileIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    background: "rgba(255,255,255,.18)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(0,0,0,.2)",
    border: "1.5px solid rgba(255,255,255,.25)",
    flexShrink: 0,
  },
  tileIcon:  { fontSize: "1.9rem", lineHeight: 1 },
  tileLabel: {
    fontWeight: 900, fontSize: "0.95rem",
    color: "#fff",
    textShadow: "0 1px 4px rgba(0,0,0,.35)",
    lineHeight: 1.25,
  },
  tileDesc: {
    fontWeight: 700, fontSize: "0.78rem",
    color: "rgba(255,255,255,.85)",
    lineHeight: 1.35,
    maxWidth: 180,
  },

  /* ── panel (opened tool) ── */
  panelHeader: {
    display: "flex", alignItems: "center", gap: 16,
    marginBottom: 18, flexWrap: "wrap",
  },
  btnHub: {
    padding: "9px 16px",
    background: "rgba(255,255,255,.1)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 12, color: "#fff",
    fontWeight: 900, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit",
  },
  crumb: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  crumbIcon: {
    width: 48, height: 48, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, color: "#fff",
    border: "1.5px solid rgba(255,255,255,.25)",
    flexShrink: 0,
  },
  crumbTitle: { fontWeight: 1000, fontSize: 20, color: "#f1f5f9", lineHeight: 1.15 },
  crumbDesc:  { fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 2 },

  panelCard: {
    background: "#fff",
    borderRadius: 22,
    padding: "24px 26px",
    boxShadow: "0 20px 60px rgba(0,0,0,.35)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "#0f172a",
    minHeight: 400,
  },

  footer: {
    color: "rgba(255,255,255,.3)",
    fontSize: 12, fontWeight: 700,
    marginTop: 20, zIndex: 2,
  },
};
