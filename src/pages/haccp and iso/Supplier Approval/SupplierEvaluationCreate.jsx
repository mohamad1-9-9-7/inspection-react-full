import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupplierApproval.css";

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
 * ✅ matches App.jsx:
 * path="/supplier-approval/t/:token"
 */
const PUBLIC_ROUTE_PREFIX = "";

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
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
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

/* ===================== Supplier Types ===================== */
const SUPPLIER_TYPES = [
  {
    value: "food",
    label: "Food / Raw Materials (Meat, Dairy, Produce, etc.)",
    labelAr: "مواد غذائية / مواد خام (لحوم، ألبان، خضروات…)",
    desc: "Food, ingredients, raw materials — full food safety questionnaire.",
  },
  {
    value: "cleaning_chemicals",
    label: "Cleaning Materials / Chemicals",
    labelAr: "مواد تنظيف / كيماويات",
    desc: "Detergents, sanitizers, disinfectants — SDS/GHS/COA questions.",
  },
  {
    value: "packaging",
    label: "Packaging Materials",
    labelAr: "مواد تعبئة وتغليف",
    desc: "Food-contact packaging — compliance & migration tests.",
  },
  {
    value: "services",
    label: "Services (Pest Control / Calibration / Transport / Waste)",
    labelAr: "خدمات (مكافحة آفات / معايرة / نقل / نفايات)",
    desc: "Service providers — licenses, training, service reports.",
  },
  {
    value: "other",
    label: "Other / Equipment / Uniforms",
    labelAr: "أخرى / معدات / ملابس",
    desc: "Miscellaneous suppliers — general questions only.",
  },
];

export default function SupplierEvaluationCreate() {
  const nav = useNavigate();

  const [supplierName, setSupplierName] = useState("");
  const [supplierType, setSupplierType] = useState("food");
  const [email, setEmail] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const publicToken = useMemo(() => makeToken(30), []);

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
    const type = String(supplierType || "").trim();

    if (!name || !/\S/.test(name)) {
      setMsg("❌ Please enter a valid supplier name (not whitespace only)");
      return;
    }

    if (name.length < 2) {
      setMsg("❌ Supplier name is too short (min 2 characters)");
      return;
    }

    if (!type || !SUPPLIER_TYPES.find((t) => t.value === type)) {
      setMsg("❌ Please select a valid supplier type");
      return;
    }

    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setMsg("❌ Please enter a valid email address");
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
          supplier_type: type,
        },

        answers: {},
        questions: DEFAULT_QUESTIONS,
        notes,
        attachments: [],

        meta: {
          savedAt: new Date().toISOString(),
          createdBy: "MANUAL_PUBLIC_LINK",
          submitted: false,
          supplierType: type,
        },

        public: {
          mode: "PUBLIC",
          token: publicToken,
          url: publicUrl,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          submittedAt: null,
          supplierType: type,
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

  /* ===================== Better Styles (Pro Inputs) ===================== */
  const S = {
    page: {
      minHeight: "100vh",
      padding: "20px 24px",
      background:
        "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 46%, rgba(255,255,255,1) 100%)," +
        "radial-gradient(circle at 88% 10%, rgba(34,197,94,0.12) 0, rgba(255,255,255,0) 55%)," +
        "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.12) 0, rgba(255,255,255,0) 58%)",
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      color: "#071b2d",
      boxSizing: "border-box",
    },
    wrap: { maxWidth: "100%", width: "100%", margin: "0 auto" },

    topbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap",
      marginBottom: 16,
    },

    title: { fontSize: 24, fontWeight: 980, letterSpacing: 0.2 },
    subtitle: { fontSize: 15, opacity: 0.78, fontWeight: 750, marginTop: 4 },

    card: {
      background: "rgba(255,255,255,0.94)",
      border: "1px solid rgba(2,6,23,0.10)",
      borderRadius: 20,
      padding: 22,
      boxShadow: "0 18px 42px rgba(2, 132, 199, 0.08)",
      backdropFilter: "blur(10px)",
    },

    sectionTitle: { fontSize: 14, fontWeight: 950, marginBottom: 12, opacity: 0.85 },

    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 16,
    },

    field: { display: "flex", flexDirection: "column", gap: 8 },

    label: {
      fontSize: 14,
      fontWeight: 900,
      opacity: 0.9,
      letterSpacing: 0.2,
    },

    controlWrap: {
      borderRadius: 14,
      border: "1px solid rgba(2,6,23,0.12)",
      background: "rgba(255,255,255,0.96)",
      padding: 2,
      transition: "border-color .15s ease, box-shadow .15s ease, transform .15s ease",
    },

    controlWrapFocused: {
      borderColor: "rgba(34,211,238,0.55)",
      boxShadow: "0 0 0 4px rgba(34,211,238,0.18)",
      transform: "translateY(-1px)",
    },

    input: {
      width: "100%",
      borderRadius: 12,
      border: "1px solid transparent",
      padding: "13px 14px",
      outline: "none",
      background: "transparent",
      fontSize: 16,
      fontWeight: 700,
      color: "#071b2d",
    },

    textarea: {
      width: "100%",
      borderRadius: 12,
      border: "1px solid transparent",
      padding: "13px 14px",
      outline: "none",
      background: "transparent",
      fontSize: 16,
      fontWeight: 700,
      color: "#071b2d",
      minHeight: 120,
      resize: "vertical",
      lineHeight: 1.55,
    },

    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

    btn: {
      border: "1px solid rgba(2,6,23,0.12)",
      background: "#fff",
      borderRadius: 12,
      padding: "11px 14px",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 15,
    },

    btnPrimary: {
      border: "1px solid rgba(34,197,94,0.30)",
      background: "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,211,238,0.18))",
      borderRadius: 12,
      padding: "11px 14px",
      cursor: "pointer",
      fontWeight: 950,
      fontSize: 15,
    },

    btnDanger: {
      border: "1px solid rgba(239,68,68,0.20)",
      background: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(255,255,255,0.9))",
      borderRadius: 12,
      padding: "11px 14px",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 15,
    },

    monoBox: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      padding: 14,
      borderRadius: 14,
      border: "1px dashed rgba(2,6,23,0.20)",
      background: "rgba(2,6,23,0.02)",
      overflow: "auto",
      lineHeight: 1.5,
    },

    pill: {
      fontSize: 14,
      fontWeight: 900,
      padding: "7px 12px",
      borderRadius: 999,
      border: "1px solid rgba(2,6,23,0.12)",
      background: "rgba(255,255,255,0.85)",
    },

    msgOk: { marginTop: 10, fontWeight: 900, fontSize: 15, color: "#065f46" },
    msgBad: { marginTop: 10, fontWeight: 900, fontSize: 15, color: "#991b1b" },

    footer: { textAlign: "center", marginTop: 14, fontSize: 13, opacity: 0.65, fontWeight: 850 },
  };

  const isError = msg && msg.startsWith("❌");

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Top Bar */}
        <div style={S.topbar}>
          <button style={S.btn} onClick={() => nav("/haccp-iso/supplier-evaluation")}>
            Back to Hub ↩
          </button>

          <div>
            <div style={S.title}>Create Supplier Evaluation</div>
            <div style={S.subtitle}>Create → generate link → send → supplier submits → review in Results</div>
          </div>

          <span style={S.pill}>Token pre-generated</span>
        </div>

        {/* Form Card */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Supplier Details</div>

          <div style={S.grid2} data-grid2="true">
            <div style={S.field}>
              <div style={S.label}>Supplier Name *</div>

              <input
                className="sa-input"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. ABC Food Trading LLC"
              />
            </div>

            <div style={S.field}>
              <div style={S.label}>Supplier Email (optional)</div>

              <input
                className="sa-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Supplier Type Selector */}
          <div style={{ marginTop: 14 }}>
            <div style={S.label}>Supplier Type *</div>
            <div
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {SUPPLIER_TYPES.map((st) => {
                const active = supplierType === st.value;
                return (
                  <label
                    key={st.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: active
                        ? "2px solid rgba(34,197,94,0.55)"
                        : "1px solid rgba(2,6,23,0.12)",
                      background: active ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.96)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: active ? "0 4px 14px rgba(34,197,94,0.15)" : "none",
                    }}
                  >
                    <input
                      type="radio"
                      name="supplier_type"
                      value={st.value}
                      checked={active}
                      onChange={() => setSupplierType(st.value)}
                      style={{
                        marginTop: 3,
                        width: 17,
                        height: 17,
                        cursor: "pointer",
                        accentColor: "#16a34a",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: "#071b2d", lineHeight: 1.35 }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 3, fontWeight: 600, lineHeight: 1.4 }}>
                        {st.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
              ⚠ This determines which questionnaire sections the supplier will see.
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={S.label}>Internal Notes (Admin only)</div>

            <div>
              <textarea
                className="sa-textarea"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Write notes for QA/Admin only…"
              />
            </div>
          </div>
        </div>

        {/* Link Card */}
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.sectionTitle}>Public Supplier Link</div>

          <div className="sa-mono-box">{publicUrl}</div>

          <div style={{ marginTop: 10, ...S.row }}>
            <button className="sa-btn" onClick={() => window.open(publicUrl, "_blank")}>
              Open ↗
            </button>
            <button className="sa-btn" onClick={copyLink}>
              📋 Copy Link
            </button>
            <span className="sa-badge sa-badge-blue">Token: {publicToken}</span>
          </div>

          <div style={{ marginTop: 12, ...S.row }}>
            <button className="sa-btn" onClick={() => nav("/haccp-iso/supplier-evaluation/results")}>
              Go to Submitted Results →
            </button>

            <button
              className={`sa-btn sa-btn-primary${saving ? " sa-btn-saving" : ""}`}
              disabled={saving}
              onClick={onCreate}
            >
              {saving ? "Saving..." : "Save Evaluation + Verify ✅"}
            </button>
          </div>

          {msg ? <div className={isError ? "sa-msg-err" : "sa-msg-ok"}>{msg}</div> : null}
        </div>

        <div style={S.footer}>Al Mawashi — Supplier Evaluation ©</div>

        {/* Placeholder + Responsive */}
        <style>{`
          input::placeholder, textarea::placeholder { 
            color: rgba(7,27,45,0.45);
            font-weight: 650;
          }
          @media (max-width: 760px) {
            [data-grid2="true"] { 
              grid-template-columns: 1fr !important; 
            }
          }
        `}</style>
      </div>
    </div>
  );
}
