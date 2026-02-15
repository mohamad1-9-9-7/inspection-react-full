import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base (robust) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form"; // ✅ لازم يطابق صفحة النتائج/Public

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

/* ✅ Verify token exists on server */
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
  const publicPath = useMemo(() => `/supplier-approval/t/${encodeURIComponent(publicToken)}`, [publicToken]);
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

      // ✅ أهم تعديل: reportDate لازم يكون UNIQUE (لأن عندك unique index type + reportDate)
      // هيك بتقدر تعمل أكتر من رابط بنفس اليوم بدون ما يصير DUPLICATE
      const reportDate = `${day}__${publicToken}`;

      const payload = {
        reportDate,              // ✅ UNIQUE FOR DB INDEX
        recordDate: nowISO(),    // ✅ DISPLAY ONLY

        fields: {
          company_name: name,
          supplier_email: mail,
        },

        answers: {}, // supplier fills later
        questions: DEFAULT_QUESTIONS,
        notes, // internal admin notes
        attachments: [],

        meta: {
          savedAt: new Date().toISOString(),
          createdBy: "MANUAL_PUBLIC_LINK",
          submitted: false,
        },

        public: {
          mode: "PUBLIC",
          token: publicToken, // ✅ MUST MATCH LINK TOKEN
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

      // ✅ Verify immediately (this prevents “send link then 404”)
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

  /* ===================== Styles (match your hub) ===================== */
  const shellStyle = {
    minHeight: "100vh",
    padding: "28px 18px",
    background:
      "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
      "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
      "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#071b2d",
    direction: "rtl",
  };

  const layoutStyle = { maxWidth: 1100, margin: "0 auto" };

  const panel = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15, 23, 42, 0.14)",
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(2, 132, 199, 0.10)",
    padding: 16,
  };

  const topBar = {
    ...panel,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };

  const btn = {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    fontWeight: 950,
  };

  const btnPrimary = {
    ...btn,
    background: "linear-gradient(135deg, #0ea5e9, #22c55e)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.85)",
  };

  const input = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid rgba(2,6,23,0.14)",
    outline: "none",
    background: "rgba(255,255,255,0.98)",
    fontWeight: 850,
  };

  const label = { fontSize: 12, fontWeight: 950, color: "#64748b", marginBottom: 6 };

  const linkBox = {
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
  };

  const small = { fontSize: 12, fontWeight: 850, color: "#64748b" };

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
        {/* Header */}
        <div style={topBar}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 980 }}>Create Supplier Evaluation</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#64748b" }}>
              Create → generate link → send to supplier → supplier submits → you review in Results.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation")}>
              ↩ Back to Hub
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div>
              <div style={label}>Supplier Name *</div>
              <input
                style={input}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثال: ABC Meat Trading"
              />
            </div>

            <div>
              <div style={label}>Supplier Email (optional)</div>
              <input
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@supplier.com"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={label}>Internal Notes (Admin only)</div>
            <textarea
              style={{ ...input, minHeight: 90, resize: "vertical" }}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="أي ملاحظات داخلية... (لن تظهر للمورد)"
            />
          </div>

          {/* Public Link */}
          <div style={{ marginTop: 14, ...linkBox }}>
            <div style={{ fontWeight: 980 }}>Public Supplier Link</div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#334155", fontWeight: 850, wordBreak: "break-word" }}>
              {publicUrl}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btn} onClick={copyLink}>📋 Copy Link</button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                style={{ ...btn, textDecoration: "none", color: "#071b2d", display: "inline-flex", alignItems: "center" }}
              >
                🔗 Open Public Page
              </a>
            </div>
            <div style={{ marginTop: 8, ...small }}>
              Token: <b style={{ color: "#0f172a" }}>{publicToken}</b>
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnPrimary} onClick={onCreate} disabled={saving}>
              {saving ? "Saving..." : "✅ Save Evaluation (Server) + Verify"}
            </button>
            <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation/results")}>
              📄 Go to Submitted Results
            </button>
          </div>

          {msg ? (
            <div style={{ marginTop: 12, fontWeight: 950, color: msg.startsWith("✅") ? "#065f46" : "#991b1b" }}>
              {msg}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          © Al Mawashi — Supplier Evaluation
        </div>
      </div>
    </main>
  );
}
