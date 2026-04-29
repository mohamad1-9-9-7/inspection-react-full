// src/pages/settings/SettingsPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackupTab from "./BackupTab";
import NotificationsTab from "./NotificationsTab";

const TABS = [
  { id: "backup", label: "💾 النسخ الاحتياطي / Backup" },
  { id: "notifications", label: "🔔 التنبيهات / Notifications" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("backup");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
        padding: "1.5rem",
        fontFamily: "Cairo, system-ui, sans-serif",
        direction: "rtl",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
            color: "#fff",
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>
              ⚙️ الإعدادات / Settings
            </h1>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: 4 }}>
              إدارة بيانات التطبيق والتفضيلات
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,.18)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.3)",
              borderRadius: 10,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ← رجوع
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            overflowX: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: "0 0 auto",
                background: activeTab === t.id ? "#fff" : "transparent",
                color: activeTab === t.id ? "#1e3a5f" : "#6b7280",
                border: "none",
                borderBottom: activeTab === t.id ? "3px solid #2d5a8e" : "3px solid transparent",
                padding: "12px 24px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
                transition: "all .18s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {activeTab === "backup" && <BackupTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}
