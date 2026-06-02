// src/pages/SubscriptionExpired.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang } from "./settings/_shared/settingsI18n";

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

/* Support contact shown on the block screen — configurable via localStorage
   key "appSupportContact" ({ email, phone }); falls back to these defaults.
   Exported so a Settings field can read/write the same source later. */
export const SUPPORT_DEFAULTS = { email: "support@qms-system.com", phone: "" };
export function getSupportContact() {
  try {
    return { ...SUPPORT_DEFAULTS, ...JSON.parse(localStorage.getItem("appSupportContact") || "{}") };
  } catch {
    return { ...SUPPORT_DEFAULTS };
  }
}

export default function SubscriptionExpired() {
  const navigate         = useNavigate();
  const { t, dir, isAr } = useSettingsLang();
  const user             = getUser();
  const isSuperAdmin     = user.isSuperAdmin || false;
  const support          = getSupportContact();

  function handleLogout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("subscription_cache");
    navigate("/");
  }

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Cairo, sans-serif", padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "52px 44px",
        maxWidth: 480, width: "100%", textAlign: "center",
        boxShadow: "0 24px 80px rgba(0,0,0,.35)",
      }}>
        <div style={{ fontSize: 72, marginBottom: 20, lineHeight: 1 }}>🔒</div>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1e293b", marginBottom: 10 }}>
          {t("subExpTitle")}
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
          {t("subExpEnded")}<br />
          {t("subExpRenew")}
        </p>

        {/* Contact box */}
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "18px 20px",
          border: "1px solid #e2e8f0", marginBottom: 28,
          textAlign: isAr ? "right" : "left",
        }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>
            {t("subExpContactSupport")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }} dir="ltr">
            📧 {support.email}
          </div>
          {support.phone && (
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginTop: 4 }} dir="ltr">
              📞 {support.phone}
            </div>
          )}
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            ℹ️ {t("subExpMention")}
          </div>
        </div>

        {/* Super admin bypass */}
        {isSuperAdmin && (
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 28px", fontWeight: 800, fontSize: 15,
              cursor: "pointer", width: "100%", marginBottom: 10,
              boxShadow: "0 6px 18px rgba(124,58,237,.3)",
            }}
          >
            ⚙️ {t("subExpGoAdmin")}
          </button>
        )}

        <button
          onClick={handleLogout}
          style={{
            background: "transparent", color: "#94a3b8", border: "none",
            padding: "10px", fontWeight: 600, fontSize: 13,
            cursor: "pointer", width: "100%",
          }}
        >
          {t("subExpSignDifferent")}
        </button>
      </div>
    </div>
  );
}
