import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base (robust + normalized) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form";

/* ===================== PUBLIC ORIGIN ===================== */
let VITE_PUBLIC_ORIGIN;
try {
  VITE_PUBLIC_ORIGIN = import.meta.env?.VITE_PUBLIC_ORIGIN;
} catch {
  VITE_PUBLIC_ORIGIN = undefined;
}

const PUBLIC_ORIGIN = String(
  (typeof window !== "undefined" && window.__QCS_PUBLIC_ORIGIN__) ||
    VITE_PUBLIC_ORIGIN ||
    (typeof process !== "undefined" && process.env?.REACT_APP_PUBLIC_ORIGIN) ||
    (typeof window !== "undefined" && window.location ? window.location.origin : "")
).replace(/\/$/, "");

/**
 * ✅ FIX: مطابق لـ App.jsx
 * App.jsx عندك:
 *  path="/supplier-approval/t/:token" element={<SupplierEvaluationPublic />}
 */
const PUBLIC_ROUTE_PREFIX = ""; // ✅ لازم تكون فاضية عندك

function buildPublicUrl(pathname = "") {
  const p = String(pathname || "");
  if (!p) return PUBLIC_ORIGIN;
  return `${PUBLIC_ORIGIN}${p.startsWith("/") ? "" : "/"}${p}`;
}

/* ===================== Helpers ===================== */
function makeToken(len = 28) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);

  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

async function createReport(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await safeJson(res);

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function verifyPublicToken(token) {
  const t = String(token || "").trim();
  if (!t) throw new Error("token missing");
  const res = await fetch(`${API_BASE}/api/reports/public/${encodeURIComponent(t)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await safeJson(res);

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ===================== UI helpers ===================== */
function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function nowISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/* ===================== Minimal questions (optional) ===================== */
const DEFAULT_QUESTIONS = [
  { key: "certified", label: "Are your facilities/products certified to any food safety scheme?", type: "yesno" },
  { key: "hygiene_training", label: "Have staff received Food Hygiene training (certificates available)?", type: "yesno" },
  { key: "provide_specs", label: "Will you provide full product specifications with each product?", type: "yesno" },
  { key: "notes", label: "Additional notes", type: "text" },
];

export default function SupplierEvaluationCreate() {
  const nav = useNavigate();

  const [supplierName, setSupplierName] = useState("");
  const [email, setEmail] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ token created once
  const publicToken = useMemo(() => makeToken(30), []);

  // ✅ FIX: route matches App.jsx exactly
  const publicPath = useMemo(
    () => `${PUBLIC_ROUTE_PREFIX}/supplier-approval/t/${encodeURIComponent(publicToken)}`,
    [publicToken]
  );

  const publicUrl = useMemo(() => buildPublicUrl(publicPath), [publicPath]);

  const copyLink = async () => {
    setMsg("");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        setMsg("✅ Link copied");
        return;
      }
    } catch {}
    try {
      window.prompt("Copy link:", publicUrl);
      setMsg("✅ Copy and send to supplier");
    } catch {}
  };

  const onCreate = async () => {
    setMsg("");
    const name = String(supplierName || "").trim();
    const mail = String(email || "").trim();
    const notes = String(internalNotes || "").trim();

    if (!name) {
      setMsg("❌ Please enter supplier name");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const day = todayDateOnly();
      const reportDate = `${day}__${publicToken}`; // unique

      const payload = {
        reportDate,
        recordDate: nowISO(),

        fields: {
          company_name: name,
          supplier_email: mail,
        },

        answers: {},
        questions: DEFAULT_QUESTIONS,
        notes,
        attachments: [],

        meta: {
          savedAt: new Date().toISOString(),
          createdBy: "MANUAL_PUBLIC_LINK",
          submitted: false,
        },

        public: {
          mode: "PUBLIC",
          token: publicToken,
          url: publicUrl,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          submittedAt: null,
        },

        uniqueKey: `${String(name).trim().toLowerCase()}__${day}__${publicToken}`,
        _clientSavedAt: now,
      };

      await createReport({
        reporter: "public",
        type: TYPE,
        payload,
      });

      await verifyPublicToken(publicToken);

      setMsg("✅ Created & VERIFIED on server. Send the link to supplier.");
    } catch (e) {
      const status = e?.status ? ` (HTTP ${e.status})` : "";
      const extra =
        e?.data && typeof e.data === "object"
          ? ` | ${e.data?.error || ""} ${e.data?.message || ""}`.trim()
          : "";
      setMsg(`❌ ${String(e?.message || "Failed")}${status}${extra ? " — " + extra : ""}`);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== Styles ===================== */
  const page = {
    minHeight: "100vh",
    padding: 18,
    background:
      "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
      "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
      "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#071b2d",
  };

  const wrap = { maxWidth: 1100, margin: "0 auto" };

  const panel = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(2,6,23,0.12)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 14px 40px rgba(2, 132, 199, 0.10)",
  };

  const btn = {
    border: "1px solid rgba(2,6,23,0.12)",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
  };

  const primary = {
    ...btn,
    background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,211,238,0.16))",
    borderColor: "rgba(34,197,94,0.28)",
  };

  const input = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(2,6,23,0.12)",
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  };

  return (
    <div style={page}>
      <div style={wrap}>
        <div style={{ ...panel, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation")}>
            Back to Hub ↩
          </button>
          <div style={{ fontWeight: 980 }}>Create Supplier Evaluation</div>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 850 }}>
            Create → generate link → send to supplier → supplier submits → you review in Results
          </div>
        </div>

        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Supplier Name *</div>
              <input style={input} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Supplier Email (optional)</div>
              <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Internal Notes (Admin only)</div>
            <textarea style={{ ...input, minHeight: 90 }} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
          </div>

          <div style={{ ...panel, marginTop: 12, borderRadius: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Public Supplier Link</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, opacity: 0.85 }}>
              {publicUrl}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button style={btn} onClick={() => window.open(publicUrl, "_blank")}>Open Public Page</button>
              <button style={btn} onClick={copyLink}>Copy Link</button>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Token: {publicToken}</span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation/results")}>
                Go to Submitted Results
              </button>
              <button style={primary} disabled={saving} onClick={onCreate}>
                {saving ? "Saving..." : "Save Evaluation (Server) + Verify ✅"}
              </button>
            </div>

            {msg ? <div style={{ marginTop: 10, fontWeight: 900, fontSize: 13 }}>{msg}</div> : null}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, opacity: 0.65, fontWeight: 850 }}>
          Al Mawashi — Supplier Evaluation ©
        </div>
      </div>
    </div>
  );
}
