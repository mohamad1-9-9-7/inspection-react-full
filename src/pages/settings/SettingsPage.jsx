// src/pages/settings/SettingsPage.jsx
// ⚙️ Settings & Admin Tools Hub — sidebar layout with all power-user tools.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import BackupTab from "./BackupTab";
import NotificationsTab from "./NotificationsTab";
import DataInventory from "./tools/DataInventory";
import ServerHealth from "./tools/ServerHealth";
import BulkExport from "./tools/BulkExport";
import DateTree from "./tools/DateTree";
import AppearanceAndLanguage from "./tools/AppearanceAndLanguage";
import ImageMigration from "../admin/ImageMigration";

const SECTIONS = [
  {
    id: "general",
    label: "General",
    items: [
      { id: "appearance",     icon: "🎨", title: "Appearance & Language", desc: "Theme, AR/EN preferences" },
      { id: "notifications",  icon: "🔔", title: "Notifications",         desc: "Daily reminders, alerts" },
    ],
  },
  {
    id: "data",
    label: "Data Tools",
    items: [
      { id: "inventory",      icon: "📊", title: "Data Inventory",        desc: "Count + size per record type" },
      { id: "date-tree",      icon: "🗂️", title: "Date Tree Explorer",    desc: "Browse by Year / Month / Day" },
      { id: "export",         icon: "📦", title: "Bulk Export",           desc: "Download as JSON / CSV" },
      { id: "backup",         icon: "💾", title: "Backup & Restore",      desc: "Full local backup" },
    ],
  },
  {
    id: "admin",
    label: "Admin Tools",
    items: [
      { id: "image-migration", icon: "🖼️", title: "Image Cleanup",         desc: "Convert base64 → Cloudinary URLs" },
      { id: "server-health",   icon: "🩺", title: "Server Health",         desc: "Ping + latency monitor" },
    ],
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("appearance");

  return (
    <div style={s.shell}>
      <div style={s.layout}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.brand}>
            <div style={s.brandIco}>⚙️</div>
            <div>
              <div style={s.brandTop}>Settings</div>
              <div style={s.brandSub}>Admin & Tools</div>
            </div>
          </div>

          <nav style={s.nav}>
            {SECTIONS.map((sec) => (
              <div key={sec.id} style={s.navSection}>
                <div style={s.navLabel}>{sec.label}</div>
                {sec.items.map((it) => {
                  const isActive = active === it.id;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setActive(it.id)}
                      style={s.navItem(isActive)}
                    >
                      <span style={s.navIco}>{it.icon}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.navTitle}>
                          {it.title}
                          {it.badge && <span style={s.navBadge}>{it.badge}</span>}
                        </span>
                        <span style={s.navDesc}>{it.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div style={s.sidebarFoot}>
            <button type="button" onClick={() => navigate(-1)} style={s.backBtn}>
              ← Back
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={s.content}>
          <div style={s.contentInner}>
            {active === "appearance"       && <AppearanceAndLanguage />}
            {active === "notifications"    && <NotificationsTab />}
            {active === "inventory"        && <DataInventory />}
            {active === "date-tree"        && <DateTree />}
            {active === "export"           && <BulkExport />}
            {active === "backup"           && <BackupTab />}
            {active === "image-migration"  && <ImageMigration />}
            {active === "server-health"    && <ServerHealth />}
          </div>
        </main>
      </div>
    </div>
  );
}

const s = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Cairo, sans-serif',
    color: "#0f172a",
  },
  layout: {
    maxWidth: 1400, margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    minHeight: "100vh",
    gap: 0,
  },
  sidebar: {
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    padding: "20px 14px",
    display: "flex", flexDirection: "column",
    position: "sticky", top: 0, alignSelf: "flex-start",
    height: "100vh", overflow: "auto",
    boxShadow: "2px 0 12px rgba(2,6,23,.04)",
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0 6px 14px",
    borderBottom: "2px dashed #e2e8f0",
    marginBottom: 14,
  },
  brandIco: {
    width: 42, height: 42, borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff", display: "grid", placeItems: "center", fontSize: 20,
    boxShadow: "0 10px 20px rgba(37,99,235,.30)",
  },
  brandTop: { fontWeight: 1000, fontSize: 16, lineHeight: 1.1 },
  brandSub: { fontWeight: 800, fontSize: 11, color: "#64748b", marginTop: 2 },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 12 },
  navSection: {},
  navLabel: {
    fontSize: 10, fontWeight: 1000, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: ".08em",
    padding: "8px 8px 4px",
  },
  navItem: (active) => ({
    width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 12px",
    background: active ? "linear-gradient(135deg, #dbeafe, #eff6ff)" : "transparent",
    border: active ? "1px solid #3b82f6" : "1px solid transparent",
    borderRadius: 12,
    cursor: "pointer", textAlign: "start",
    fontFamily: "inherit", color: "#0f172a",
    transition: "all .15s",
    marginBottom: 2,
  }),
  navIco: { fontSize: 18, flexShrink: 0, marginTop: 2 },
  navTitle: {
    display: "flex", alignItems: "center", gap: 6,
    fontWeight: 1000, fontSize: 13, color: "#0f172a",
  },
  navDesc: { display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2, lineHeight: 1.4 },
  navBadge: {
    fontSize: 9, fontWeight: 1000, letterSpacing: ".05em",
    padding: "1px 6px", borderRadius: 999,
    background: "linear-gradient(135deg,#fed7aa,#fef3c7)",
    color: "#92400e",
  },
  sidebarFoot: {
    paddingTop: 14,
    borderTop: "1px solid #e2e8f0",
    marginTop: 10,
  },
  backBtn: {
    width: "100%", padding: "9px 14px", borderRadius: 12,
    background: "#fff", color: "#0f172a",
    border: "1px solid #cbd5e1",
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  content: {
    padding: "24px 28px",
    overflow: "auto",
  },
  contentInner: { maxWidth: 1100 },
};
