// src/pages/billing/BillingDueBanner.jsx
// The renewal reminder a company ADMIN sees on every screen in the last
// DUE_SOON_DAYS of the subscription (mounted once in App.jsx). It replaces
// reminder e-mails: the admin sees it while working, and one tap opens
// /my-billing to pay. Staff accounts never see it (they cannot pay), nor do
// trial companies (TrialBanner speaks to them) or the platform owner.
//
// Data: the subscription cache App.jsx already keeps for the in-app lock
// (utils/subscriptionLock.js) — no extra request. It can be closed for the
// day, and it steps aside once a receipt was sent for this end date.

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SUB_CACHE_KEY } from "../../utils/subscriptionLock";
import { getSettingsLang } from "../settings/_shared/settingsI18n";
import { currentAccount, daysUntil, DUE_SOON_DAYS, isBillingAdmin, todayISO } from "./myBillingCore";

const HIDDEN_ON = ["/", "/demo", "/readiness", "/subscription-expired", "/my-billing"];

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; }
}
function read(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

/* What the bar should say right now, or null. Pure apart from storage. */
export function dueState(user, cache, now = new Date()) {
  if (!isBillingAdmin(user)) return null;
  if (!cache?.end_date || Number(cache.companyId) !== Number(user.companyId)) return null;
  const days = daysUntil(cache.end_date, now);
  if (days == null || days > DUE_SOON_DAYS) return null;
  return { days, endDate: String(cache.end_date).slice(0, 10) };
}

export default function BillingDueBanner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  // Re-read on navigation: sign-in, sign-out and the hourly cache refresh happen elsewhere.
  useEffect(() => { setTick((n) => n + 1); }, [pathname]);

  const user = currentAccount();
  const state = HIDDEN_ON.includes(pathname) ? null : dueState(user, readJson(SUB_CACHE_KEY));
  const key = String(user?.companyId || "");
  const dismissed = state && read(`billing_due_dismissed_${key}`) === todayISO();
  const proofSent = state && read(`billing_proof_sent_${key}`) === state.endDate;
  const show = !!state && !dismissed && !proofSent;

  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "64px";
    return () => { document.body.style.paddingBottom = prev; };
  }, [show]);

  if (!show) return null;
  const ar = getSettingsLang() === "ar";
  const d = state.days;
  const text = ar
    ? d < 0 ? `انتهى اشتراك شركتكم قبل ${-d} يوم` : d === 0 ? "اشتراك شركتكم بينتهي اليوم" : `اشتراك شركتكم بينتهي بعد ${d} ${d === 1 ? "يوم" : "أيام"}`
    : d < 0 ? `Your subscription ended ${-d} day${d === -1 ? "" : "s"} ago` : d === 0 ? "Your subscription ends today" : `Your subscription ends in ${d} day${d === 1 ? "" : "s"}`;
  const urgent = d <= 3;

  return (
    <div role="status" dir={ar ? "rtl" : "ltr"} data-billing-banner="" data-tick={tick} style={{
      position: "fixed", insetInline: 0, bottom: 0, zIndex: 8990,
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px 14px", flexWrap: "wrap",
      padding: "9px 16px calc(9px + env(safe-area-inset-bottom))",
      background: urgent ? "linear-gradient(90deg,#991b1b,#dc2626)" : "linear-gradient(90deg,#0c4a6e,#0369a1)",
      color: "#fff", boxShadow: "0 -6px 20px rgba(0,0,0,.18)", fontWeight: 800, textAlign: "center",
    }}>
      <span>💳 {text}</span>
      <button type="button" onClick={() => navigate("/my-billing")} style={{
        color: urgent ? "#991b1b" : "#0c4a6e", background: "#fff", border: "none", borderRadius: 999,
        padding: "5px 14px", fontWeight: 900, cursor: "pointer",
      }}>{ar ? "ادفع الفاتورة" : "Pay the invoice"}</button>
      <button type="button" aria-label={ar ? "إخفاء لليوم" : "Hide for today"} title={ar ? "إخفاء لليوم" : "Hide for today"}
        onClick={() => { try { localStorage.setItem(`billing_due_dismissed_${key}`, todayISO()); } catch { /* ignore */ } setTick((n) => n + 1); }}
        style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.5)", borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontWeight: 900 }}>
        ✕
      </button>
    </div>
  );
}
