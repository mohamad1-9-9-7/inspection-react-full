import React from "react";

/* ===================== API base ===================== */
import { SWEETS_MODULES_AR, SWEETS_MODULES_AR_SHORT, SWEETS_QUIZ_BANK } from "./content";

export const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

export const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

export const REPORTS_URL = `${API_BASE}/api/reports`;
export const TYPE = "sweets_training_session";
export const PASS_MARK = 80;

/* ===================== ✅ Unified language ===================== */
export const LANG_STORAGE_KEY = "qcs_training_lang";

export function getStoredLang() {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "ar" || v === "AR") return "ar";
    if (v === "en" || v === "EN") return "en";
  } catch {}
  return "en";
}

export function setStoredLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang === "ar" || lang === "AR" ? "ar" : "en");
  } catch {}
}

export function useGlobalLang() {
  const [lang, setLangState] = React.useState(getStoredLang);

  React.useEffect(() => {
    function onStorage(e) {
      if (e.key === LANG_STORAGE_KEY && e.newValue) {
        setLangState(e.newValue === "ar" ? "ar" : "en");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = React.useCallback((next) => {
    const norm = next === "ar" || next === "AR" ? "ar" : "en";
    setStoredLang(norm);
    setLangState(norm);
    // notify other tabs/components
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: LANG_STORAGE_KEY, newValue: norm }));
    } catch {}
  }, []);

  return [lang, setLang];
}

/* ===================== ✅ Module names AR translations ===================== */
export const MODULES_AR = SWEETS_MODULES_AR;

export const MODULES_AR_SHORT = SWEETS_MODULES_AR_SHORT;

/** Returns module name in the requested language. Falls back to English. */
export function getModuleName(name, lang = "en") {
  if (!name) return "";
  const l = lang === "ar" || lang === "AR" ? "ar" : "en";
  if (l === "ar") return MODULES_AR[name] || name;
  return name;
}

export function getModuleNameShort(name, lang = "en") {
  if (!name) return "";
  const l = lang === "ar" || lang === "AR" ? "ar" : "en";
  if (l === "ar") return MODULES_AR_SHORT[name] || MODULES_AR[name] || name;
  return name;
}

/* ===================== ✅ PUBLIC ORIGIN (Netlify/Vite/CRA) ===================== */
/**
 * الهدف: أي رابط يتولد يكون أونلاين حتى لو أنت فاتح محلي.
 * Netlify/Vite:  import.meta.env.VITE_PUBLIC_ORIGIN
 * CRA:           process.env.REACT_APP_PUBLIC_ORIGIN
 * Window override (اختياري): window.__QCS_PUBLIC_ORIGIN__
 */
let VITE_PUBLIC_ORIGIN;
try {
  VITE_PUBLIC_ORIGIN = import.meta.env?.VITE_PUBLIC_ORIGIN;
} catch {
  VITE_PUBLIC_ORIGIN = undefined;
}

export const PUBLIC_ORIGIN = String(
  (typeof window !== "undefined" && window.__QCS_PUBLIC_ORIGIN__) ||
    VITE_PUBLIC_ORIGIN ||
    (typeof process !== "undefined" && process.env?.REACT_APP_PUBLIC_ORIGIN) ||
    (typeof window !== "undefined" && window.location ? window.location.origin : "")
).replace(/\/$/, "");

export function buildPublicUrl(pathname = "") {
  const p = String(pathname || "");
  if (!p) return PUBLIC_ORIGIN;
  return `${PUBLIC_ORIGIN}${p.startsWith("/") ? "" : "/"}${p}`;
}

/* ===================== QUIZ BANK (AR/EN) ===================== */
/* ===================== QUIZ BANK (AR/EN) =====================
   This company's modules — see ./content (5 Easy / 5 Medium / 5 Hard each). */
export const QUIZ_BANK = SWEETS_QUIZ_BANK;

/* ===================== Helpers ===================== */
export async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to load");
  }
  return await res.json();
}

export async function updateReportOnServer(id, updatedReportBody) {
  let res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedReportBody),
  });

  if (!res.ok) {
    res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedReportBody),
    });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to update report");
  }
  return await res.json();
}

/* ✅ delete training session (report) */
export async function deleteReportOnServer(id) {
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to delete report");
  }
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

export function normalizeToArray(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.items, data?.reports, data?.data, data?.result, data?.rows];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

export function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id || r?.clientId;
}

export function safeDate(r) {
  const d = r?.payload?.date || r?.payload?.reportDate || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  return d ? String(d).slice(0, 10) : "";
}
export function safeBranch(r) {
  return r?.branch || r?.payload?.branch || r?.payload?.BRANCH || "";
}
export function safeModule(r) {
  return r?.payload?.moduleName || r?.payload?.module || "";
}
export function safeTitle(r) {
  return r?.title || r?.payload?.title || r?.payload?.documentTitle || "";
}
export function sortByNewest(a, b) {
  const da = new Date(a?.created_at || a?.createdAt || a?.payload?.date || 0).getTime();
  const db = new Date(b?.created_at || b?.createdAt || b?.payload?.date || 0).getTime();
  return db - da;
}

export function makeBlankParticipant() {
  return {
    slNo: "",
    name: "",
    designation: "",
    result: "",
    score: "",
    lastQuizAt: "",
    quizAttempt: null,
  };
}
export function renumberParticipants(list) {
  return (Array.isArray(list) ? list : []).map((p, idx) => ({
    ...p,
    slNo: p?.slNo ? String(p.slNo) : String(idx + 1),
  }));
}
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ===== UI atoms ===== */
export function Badge({ text, tone = "gray" }) {
  const map = {
    gray: { bg: "#f3f4f6", fg: "#111827", bd: "#e5e7eb" },
    blue: { bg: "#eff6ff", fg: "#1d4ed8", bd: "#bfdbfe" },
    green: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
    red: { bg: "#fff1f2", fg: "#be123c", bd: "#fecdd3" },
    violet: { bg: "#f5f3ff", fg: "#6d28d9", bd: "#ddd6fe" },
    amber: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  };
  const c = map[tone] || map.gray;
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function KPI({ label, value, tone = "gray" }) {
  const colors = {
    gray: { bg: "linear-gradient(135deg,#ffffff,#f8fafc)", bd: "#e5e7eb", fg: "#111827", sub: "#6b7280" },
    blue: { bg: "linear-gradient(135deg,#eff6ff,#ffffff)", bd: "#bfdbfe", fg: "#1d4ed8", sub: "#64748b" },
    green: { bg: "linear-gradient(135deg,#ecfdf5,#ffffff)", bd: "#a7f3d0", fg: "#047857", sub: "#64748b" },
    red: { bg: "linear-gradient(135deg,#fff1f2,#ffffff)", bd: "#fecdd3", fg: "#be123c", sub: "#64748b" },
    violet: { bg: "linear-gradient(135deg,#f5f3ff,#ffffff)", bd: "#ddd6fe", fg: "#6d28d9", sub: "#64748b" },
  };
  const c = colors[tone] || colors.gray;
  return (
    <div
      style={{
        border: `1px solid ${c.bd}`,
        background: c.bg,
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        minHeight: 78,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: c.sub }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: c.fg }}>{value}</div>
    </div>
  );
}

export function Modal({ show, title, onClose, children, footer }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0f172a" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✖
          </button>
        </div>

        <div style={{ padding: 16 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: 16,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
