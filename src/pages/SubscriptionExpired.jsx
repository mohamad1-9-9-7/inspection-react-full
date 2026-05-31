// src/pages/SubscriptionExpired.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

export default function SubscriptionExpired() {
  const navigate     = useNavigate();
  const user         = getUser();
  const isSuperAdmin = user.isSuperAdmin || false;

  function handleLogout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("subscription_cache");
    navigate("/");
  }

  return (
    <div style={{
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
          Subscription Expired
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
          Your system subscription has ended.<br />
          Please contact the administrator to renew access.
        </p>

        {/* Contact box */}
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "18px 20px",
          border: "1px solid #e2e8f0", marginBottom: 28, textAlign: "left",
        }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>
            Contact Support
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            📧 support@qms-system.com
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            📞 Mention your company name and current plan
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
            ⚙️ Go to Admin — Activate Subscription
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
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
