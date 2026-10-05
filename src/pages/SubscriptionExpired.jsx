// src/pages/SubscriptionExpired.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang } from "./settings/_shared/settingsI18n";
import { clearAppSession } from "../utils/authFetch";
import { isBillingAdmin } from "./billing/myBillingCore";

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
  const { t, isAr: settingsAr } = useSettingsLang();
  const user             = getUser();
  // A trial speaks the language its visitor signed up in on /demo.
  const isAr             = user.companyTrial && user.trialLang ? user.trialLang === "ar" : settingsAr;
  const dir              = isAr ? "rtl" : "ltr";
  const isSuperAdmin     = user.isSuperAdmin || false;
  const support          = getSupportContact();

  function handleLogout() {
    clearAppSession();
    navigate("/");
  }

  /* A free-trial company (pages/trial): nothing in it is kept, so the screen
     says so plainly and points at subscribing, not at renewing. */
  if (user.companyTrial && !isSuperAdmin) {
    return (
      <div dir={dir} style={{
        minHeight: "100vh", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", padding: 24,
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "48px 40px", maxWidth: 500, width: "100%",
          textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,.35)",
        }}>
          <div style={{ fontSize: 64, marginBottom: 18, lineHeight: 1 }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1e293b", marginBottom: 10 }}>
            {isAr ? "انتهت التجربة المجانية" : "Your free trial has ended"}
          </h1>
          <p style={{ color: "#64748b", fontSize: 15, marginBottom: 18, lineHeight: 1.7 }}>
            {isAr
              ? "شكرًا لتجربة InspectPro. هذا الحساب التجريبي مقفل الآن."
              : "Thank you for trying InspectPro. This trial account is now locked."}
          </p>
          <div style={{
            background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 12,
            padding: "14px 16px", marginBottom: 24, fontWeight: 700, lineHeight: 1.6, textAlign: isAr ? "right" : "left",
          }}>
            ⚠️ {isAr
              ? "تُحذف جميع بيانات هذا الحساب نهائيًا ولا يمكن استعادتها. عند الاشتراك ننشئ لك شركة جديدة من البداية."
              : "All data in this account is being deleted for good and cannot be recovered. When you subscribe, we set up a new company for you from scratch."}
          </div>
          <button
            onClick={() => { clearAppSession(); navigate(`/demo${isAr ? "?lang=ar" : ""}#demo-form`); }}
            style={{
              background: "linear-gradient(135deg, #0f766e, #14b8a6)", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 10,
            }}
          >
            {isAr ? "اشترك — تواصل معنا" : "Subscribe — contact us"}
          </button>
          <button
            onClick={handleLogout}
            style={{ background: "transparent", color: "#94a3b8", border: "none", padding: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" }}
          >
            {isAr ? "الدخول بحساب آخر" : "Sign in with a different account"}
          </button>
        </div>
      </div>
    );
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

        {/* A company admin can pay right away: invoices + receipt upload stay open (/my-billing). */}
        {isBillingAdmin(user) && (
          <button
            onClick={() => navigate("/my-billing")}
            style={{
              background: "linear-gradient(135deg, #0369a1, #0ea5e9)", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 10,
            }}
          >
            💳 {isAr ? "عرض الفواتير ورفع إيصال الدفع" : "View invoices & upload the payment receipt"}
          </button>
        )}

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
