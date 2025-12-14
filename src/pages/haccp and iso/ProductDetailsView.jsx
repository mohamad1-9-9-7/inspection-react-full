// src/pages/haccp and iso/ProductDetailsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===== API base (same style as other pages) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* Report type */
const TYPE = "product_details";

/* ✅ Cloudinary cloud name (from your working link) */
const CLOUDINARY_CLOUD = "dznmc7amw";

/* Simple JSON helper */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * ✅ Smart split:
 * - if text contains URLs -> extract full URLs (so Cloudinary commas won't break it)
 * - else fallback split on newline/comma (for non-URL lists)
 */
function splitLinesToList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((v) => (v == null ? [] : [String(v)]))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const s = String(value).trim();
  if (!s) return [];

  const urls = s.match(/https?:\/\/[^\s"'<>]+/g);
  if (urls && urls.length) return urls.map((u) => u.trim()).filter(Boolean);

  return s
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function listToMultiline(value) {
  const arr = splitLinesToList(value);
  return arr.join("\n");
}

function multilineToList(text) {
  return splitLinesToList(text);
}

/**
 * ✅ Fix broken image URLs
 */
function normalizeImageUrl(raw) {
  if (!raw) return null;

  let u = String(raw).trim();
  u = u.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
  u = u.replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!u) return null;

  if (u.startsWith("blob:")) return null;

  if (/^res\.cloudinary\.com\//i.test(u)) return `https://${u}`;

  if (/^https?:\/\//i.test(u)) return u;

  const looksCloudinaryPartial =
    u.startsWith("w_") ||
    u.startsWith("c_") ||
    u.startsWith("q_") ||
    u.startsWith("ar_") ||
    /^v\d+\//i.test(u) ||
    u.includes("/v1/") ||
    u.includes("qcs/");

  if (looksCloudinaryPartial) {
    const cleaned = u.replace(/^\/+/, "");
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${cleaned}`;
  }

  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u.replace(/^\.?\//, "")}`;
}

function isLikelyImageUrl(fixedUrl) {
  if (!fixedUrl) return false;

  const noQuery = String(fixedUrl).split("?")[0].toLowerCase();

  if (
    noQuery.endsWith(".pdf") ||
    noQuery.endsWith(".doc") ||
    noQuery.endsWith(".docx") ||
    noQuery.endsWith(".xls") ||
    noQuery.endsWith(".xlsx") ||
    noQuery.endsWith(".txt")
  ) {
    return false;
  }

  if (/\.(png|jpe?g|webp|gif|bmp|tiff?|avif|svg)$/.test(noQuery)) return true;

  if (noQuery.includes("res.cloudinary.com") && noQuery.includes("/image/upload/")) {
    const tail = noQuery.split("/image/upload/")[1] || "";
    return tail.includes("/") || tail.includes(".");
  }

  return false;
}

function filterImageList(value) {
  const rawList = splitLinesToList(value);
  const out = [];
  for (const raw of rawList) {
    const fixed = normalizeImageUrl(raw);
    if (fixed && isLikelyImageUrl(fixed)) out.push(raw);
  }
  return out;
}

/* ✅ Important: always use real server id */
function getServerId(r) {
  return r?.id || r?._id || r?.reportId || r?.report_id || null;
}

function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj || {}));
  } catch {
    return { ...(obj || {}) };
  }
}

/* =========================
   ✨ Luxury UI (styles)
   ========================= */
const UI = {
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", sans-serif',
  pageBg:
    "radial-gradient(1200px 700px at 10% -10%, rgba(56,189,248,0.30), transparent 60%)," +
    "radial-gradient(900px 700px at 110% 0%, rgba(34,197,94,0.18), transparent 55%)," +
    "radial-gradient(900px 700px at 50% 120%, rgba(99,102,241,0.16), transparent 55%)," +
    "linear-gradient(180deg, #fbfdff 0%, #f6f8ff 35%, #ffffff 100%)",
  ink: "#0b1220",
  muted: "#556074",
  border: "rgba(15, 23, 42, 0.10)",
  ring: "0 0 0 4px rgba(59,130,246,0.18)",
  shadow: "0 18px 40px rgba(2, 6, 23, 0.10)",
  shadowSoft: "0 10px 24px rgba(2, 6, 23, 0.08)",
  cardBg: "rgba(255,255,255,0.78)",
  glass: "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.70))",
  chipBg: "rgba(59,130,246,0.10)",
  chipText: "#1d4ed8",
  dangerBg: "rgba(239,68,68,0.10)",
  dangerText: "#b91c1c",
  okBg: "rgba(34,197,94,0.12)",
  okText: "#166534",
  warnBg: "rgba(245,158,11,0.14)",
  warnText: "#92400e",

  // ✅ Dark blue borders ONLY inside details (requested)
  detailBorder: "rgba(30, 58, 138, 0.78)",      // dark blue
  detailBorderSoft: "rgba(30, 58, 138, 0.36)",  // section borders/dividers
  detailBorderThin: "rgba(30, 58, 138, 0.22)",  // subtle row separators
};

function Chip({ tone = "info", children }) {
  const map = {
    info: { bg: UI.chipBg, color: UI.chipText, bd: "rgba(59,130,246,0.18)" },
    ok: { bg: UI.okBg, color: UI.okText, bd: "rgba(34,197,94,0.18)" },
    warn: { bg: UI.warnBg, color: UI.warnText, bd: "rgba(245,158,11,0.20)" },
    danger: { bg: UI.dangerBg, color: UI.dangerText, bd: "rgba(239,68,68,0.18)" },
  };
  const t = map[tone] || map.info;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.01em",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Button({ tone = "ghost", children, ...props }) {
  const map = {
    primary: {
      bg: "linear-gradient(135deg,#2563eb,#06b6d4)",
      color: "#fff",
      bd: "rgba(37,99,235,0.25)",
    },
    ghost: {
      bg: "rgba(255,255,255,0.75)",
      color: "#0f172a",
      bd: "rgba(15,23,42,0.12)",
    },
    ok: {
      bg: "linear-gradient(135deg,#16a34a,#22c55e)",
      color: "#fff",
      bd: "rgba(34,197,94,0.25)",
    },
    danger: {
      bg: "linear-gradient(135deg,#ef4444,#b91c1c)",
      color: "#fff",
      bd: "rgba(239,68,68,0.25)",
    },
  };
  const t = map[tone] || map.ghost;

  return (
    <button
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.color,
        fontSize: 13,
        fontWeight: 900,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.65 : 1,
        boxShadow: props.disabled ? "none" : "0 10px 22px rgba(2,6,23,0.10)",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
      onMouseDown={(e) => {
        if (!props.disabled) e.currentTarget.style.transform = "translateY(1px)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, color: UI.muted, fontWeight: 900, letterSpacing: "0.02em" }}>
        {label}
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="lux-input"
        style={{
          height: 42,
          borderRadius: 14,
          border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border (requested)
          padding: "0 14px",
          fontSize: 14,
          fontWeight: 700,
          outline: "none",
          background: "rgba(255,255,255,0.85)",
          color: UI.ink,
          boxShadow: "0 8px 18px rgba(2,6,23,0.06)",
        }}
      />
    </label>
  );
}

function Area({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, color: UI.muted, fontWeight: 900, letterSpacing: "0.02em" }}>
        {label}
      </span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="lux-input"
        style={{
          borderRadius: 14,
          border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border (requested)
          padding: "12px 14px",
          fontSize: 14,
          fontWeight: 650,
          outline: "none",
          background: "rgba(255,255,255,0.85)",
          color: UI.ink,
          resize: "vertical",
          whiteSpace: "pre-wrap",
          boxShadow: "0 8px 18px rgba(2,6,23,0.06)",
        }}
      />
    </label>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div
      style={{
        background: UI.glass,
        border: `2px solid ${UI.detailBorderSoft}`, // ✅ clearer section separation (requested)
        borderRadius: 18,
        padding: 14,
        boxShadow: UI.shadowSoft,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(34,197,94,0.12))",
            border: `1px solid ${UI.border}`,
          }}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 950, color: UI.ink }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function Thumb({ rawUrl, alt, size = 92 }) {
  const [failed, setFailed] = useState(false);
  const fixed = useMemo(() => normalizeImageUrl(rawUrl), [rawUrl]);

  const shouldShow = fixed && isLikelyImageUrl(fixed) && !failed;
  if (!shouldShow) return null;

  return (
    <a
      href={fixed}
      target="_blank"
      rel="noreferrer"
      title={fixed}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${UI.border}`,
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 12px 24px rgba(2,6,23,0.10)",
          transition: "transform .14s ease, box-shadow .14s ease",
        }}
        className="lux-thumb"
      >
        <img
          src={fixed}
          alt={alt}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    </a>
  );
}

export default function ProductDetailsView() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Loading products...");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  /* ✅ inline edit state */
  const [editingId, setEditingId] = useState(null);
  const [draftById, setDraftById] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStatusMessage("Loading products from server...");

      try {
        const { ok, data, status } = await jsonFetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`
        );

        if (!ok) {
          throw new Error(
            (data && (data.error || data.message)) || `Server error (status ${status})`
          );
        }

        const list =
          (Array.isArray(data?.reports) && data.reports) ||
          (Array.isArray(data?.rows) && data.rows) ||
          (Array.isArray(data?.data) && data.data) ||
          (Array.isArray(data) && data) ||
          [];

        const mapped = list.map((r, idx) => {
          const payload = r.payload || r.data || {};
          const createdAt = r.created_at || r.createdAt || payload.createdAt || null;
          const serverId = getServerId(r);

          return {
            id: serverId ? String(serverId) : `tmp_${createdAt || "na"}_${idx}`,
            serverId: serverId ? String(serverId) : null,
            createdAt,
            payload,
          };
        });

        if (!cancelled) {
          setRows(mapped);
          setStatusMessage(
            mapped.length ? `Loaded ${mapped.length} product(s).` : "No products found."
          );
        }
      } catch (err) {
        console.error("ProductDetailsView load error:", err);
        if (!cancelled) {
          setRows([]);
          setStatusMessage(`Error while loading products: ${err.message || "Unknown error"}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [rows]);

  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const startEditInline = (row) => {
    if (!row?.serverId) {
      alert("⚠️ ما في ID من السيرفر لهذا السجل، ما فينا نفعّل التعديل.");
      return;
    }
    setExpandedId(row.id);
    setEditingId(row.id);
    setDraftById((prev) => {
      const draft = clone(row.payload || {});
      draft.__productImageText = listToMultiline(draft.productImageUrls);
      draft.__testImagesText = listToMultiline(draft.testImagesUrls);
      draft.__dmRegImagesText = listToMultiline(draft.dmRegistrationImagesUrls);
      draft.__assessImagesText = listToMultiline(draft.assessmentCertImagesUrls);
      draft.__halalImagesText = listToMultiline(draft.halalCertImagesUrls);
      draft.__nutritionImagesText = listToMultiline(draft.nutritionFactsImagesUrls);
      if (!Array.isArray(draft.ingredients)) draft.ingredients = [];
      return { ...prev, [row.id]: draft };
    });
  };

  const cancelEditInline = () => {
    setEditingId(null);
  };

  const saveEditInline = async (row) => {
    const rid = row?.serverId;
    if (!rid) return;

    const draft = draftById[row.id] || {};
    const payload = clone(draft);

    payload.productImageUrls = multilineToList(draft.__productImageText);
    payload.testImagesUrls = multilineToList(draft.__testImagesText);
    payload.dmRegistrationImagesUrls = multilineToList(draft.__dmRegImagesText);
    payload.assessmentCertImagesUrls = multilineToList(draft.__assessImagesText);
    payload.halalCertImagesUrls = multilineToList(draft.__halalImagesText);
    payload.nutritionFactsImagesUrls = multilineToList(draft.__nutritionImagesText);

    delete payload.__productImageText;
    delete payload.__testImagesText;
    delete payload.__dmRegImagesText;
    delete payload.__assessImagesText;
    delete payload.__halalImagesText;
    delete payload.__nutritionImagesText;

    if (!Array.isArray(payload.ingredients)) payload.ingredients = [];

    setSavingId(rid);
    setStatusMessage("⏳ Saving changes...");

    const body = JSON.stringify({ type: TYPE, payload });

    async function tryUpdate(method) {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    }

    try {
      let { res, data } = await tryUpdate("PUT");

      if (!res.ok) {
        const maybeMethodNotAllowed = res.status === 404 || res.status === 405;
        if (maybeMethodNotAllowed) {
          ({ res, data } = await tryUpdate("PATCH"));
        }
      }

      if (!res.ok || (data && data.ok === false)) {
        throw new Error(
          (data && (data.error || data.message)) || `Server error (status ${res.status})`
        );
      }

      setRows((prev) =>
        prev.map((x) => (x.serverId === rid ? { ...x, payload: payload } : x))
      );

      setStatusMessage("✅ Updated successfully.");
      setEditingId(null);
    } catch (err) {
      console.error("Update product error:", err);
      setStatusMessage(`❌ Error while saving: ${err.message || "Unknown error"}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (row) => {
    const rid = row?.serverId;
    if (!rid) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete product "${row.payload?.productName || ""}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(rid);
    setStatusMessage("⏳ Deleting product from server...");

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data && data.ok === false)) {
        throw new Error(
          (data && (data.error || data.message)) || `Server error (status ${res.status})`
        );
      }

      setRows((prev) => prev.filter((r) => r.serverId !== rid));
      setStatusMessage("✅ Product deleted successfully.");
      if (expandedId === row.id) setExpandedId(null);
      if (editingId === row.id) setEditingId(null);
    } catch (err) {
      console.error("Delete product error:", err);
      setStatusMessage(`❌ Error while deleting product: ${err.message || "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "26px 18px 40px",
        background: UI.pageBg,
        fontFamily: UI.font,
        color: UI.ink,
      }}
    >
      {/* small CSS for focus/hover polish */}
      <style>{`
        .lux-input:focus {
          box-shadow: ${UI.ring} !important;
          border-color: ${UI.detailBorder} !important; /* ✅ dark blue */
        }
        .lux-thumb:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 18px 36px rgba(2,6,23,0.14); }
        .lux-card:hover { transform: translateY(-1px); box-shadow: 0 22px 50px rgba(2,6,23,0.12); }
      `}</style>

      {/* ✅ WIDER container (تفاصيل أوسع) */}
      <div style={{ maxWidth: 1720, margin: "0 auto" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 260 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 1000,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                background: "linear-gradient(120deg, #1d4ed8, #06b6d4, #22c55e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Saved Products
            </div>
            <div style={{ fontSize: 14, fontWeight: 750, color: UI.muted, marginTop: 6 }}>
              All records saved under <span style={{ fontWeight: 950 }}>"{TYPE}"</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone={loading ? "warn" : "ok"}>{loading ? "Loading…" : `${sortedRows.length} record(s)`}</Chip>

            <Button tone="primary" type="button" onClick={() => navigate("/haccp-iso/product-details")}>
              ← Back to product entry
            </Button>
          </div>
        </header>

        {/* Status message */}
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 18,
            fontSize: 13,
            fontWeight: 800,
            background: UI.glass,
            border: `1px solid ${UI.border}`,
            boxShadow: UI.shadowSoft,
            color: UI.ink,
          }}
        >
          <span style={{ color: "#2563eb" }}>●</span> <span style={{ marginLeft: 6 }}>{statusMessage}</span>
        </div>

        {!loading && sortedRows.length === 0 && (
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: UI.glass,
              border: `1px solid ${UI.border}`,
              boxShadow: UI.shadowSoft,
              color: UI.muted,
              fontWeight: 800,
            }}
          >
            No products found.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedRows.map((row, idx) => {
            const p = row.payload || {};
            const isExpanded = expandedId === row.id;
            const isEditing = editingId === row.id;
            const draft = draftById[row.id] || {};

            const productImages = filterImageList(p.productImageUrls);
            const testImages = filterImageList(p.testImagesUrls);
            const dmRegImages = filterImageList(p.dmRegistrationImagesUrls);
            const assessImages = filterImageList(p.assessmentCertImagesUrls);
            const halalImages = filterImageList(p.halalCertImagesUrls);
            const nutritionImages = filterImageList(p.nutritionFactsImagesUrls);

            const shelfLifeText =
              p.shelfLifeValue && p.shelfLifeUnit
                ? `${p.shelfLifeValue} ${p.shelfLifeUnit}`
                : p.shelfLife || "";

            const dmTone =
              String(p.dmRegisteredStatus || "").toLowerCase().includes("yes")
                ? "ok"
                : String(p.dmRegisteredStatus || "").toLowerCase().includes("no")
                ? "danger"
                : "info";

            return (
              <div
                key={row.id}
                className="lux-card"
                style={{
                  borderRadius: 22,
                  background: UI.cardBg,
                  boxShadow: UI.shadow,
                  border: `1px solid ${UI.border}`,
                  overflow: "hidden",
                  backdropFilter: "blur(10px)",
                  transition: "transform .14s ease, box-shadow .14s ease",
                }}
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => handleToggleExpand(row.id)}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: isExpanded
                      ? "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(6,182,212,0.08), rgba(34,197,94,0.06))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.55))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 14px",
                    cursor: "pointer",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        background: "linear-gradient(135deg,#2563eb,#06b6d4)",
                        display: "grid",
                        placeItems: "center",
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: 1000,
                        flexShrink: 0,
                        boxShadow: "0 14px 26px rgba(37,99,235,0.25)",
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 1000,
                          color: UI.ink,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {p.brand ? `[${p.brand}] ` : ""}
                        {p.productName || "Unnamed product"}
                        {isEditing ? "  • EDIT MODE" : ""}
                      </div>

                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {p.productCode && <Chip>Code: {p.productCode}</Chip>}
                        {p.productType && <Chip>Type: {p.productType}</Chip>}
                        {p.countryOfOrigin && <Chip>Country: {p.countryOfOrigin}</Chip>}
                        {p.dmRegisteredStatus && <Chip tone={dmTone}>DM: {p.dmRegisteredStatus}</Chip>}
                        {shelfLifeText && <Chip tone="warn">Shelf: {shelfLifeText}</Chip>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${UI.border}`,
                        background: "rgba(255,255,255,0.7)",
                        boxShadow: "0 10px 22px rgba(2,6,23,0.08)",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        fontSize: 18,
                        color: "#334155",
                      }}
                    >
                      ▶
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "14px 14px 16px",
                      borderTop: `1px solid ${UI.border}`,
                      background: "rgba(255,255,255,0.60)",
                    }}
                  >
                    {/* ✅ Inline edit form */}
                    {isEditing ? (
                      <div
                        style={{
                          border: `1px solid rgba(59,130,246,0.25)`,
                          background:
                            "linear-gradient(180deg, rgba(239,246,255,0.85), rgba(255,255,255,0.75))",
                          borderRadius: 20,
                          padding: 14,
                          boxShadow: UI.shadowSoft,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontWeight: 1000, color: "#1d4ed8", fontSize: 15 }}>
                            Editing (same page)
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <Button
                              tone="ok"
                              type="button"
                              onClick={() => saveEditInline(row)}
                              disabled={savingId === row.serverId}
                            >
                              {savingId === row.serverId ? "Saving..." : "✅ Save"}
                            </Button>

                            <Button
                              tone="ghost"
                              type="button"
                              onClick={cancelEditInline}
                              disabled={savingId === row.serverId}
                            >
                              ✖ Cancel
                            </Button>
                          </div>
                        </div>

                        <div style={{ height: 14 }} />

                        {/* ✅ Responsive grid (أجمل + أكبر) */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: 12,
                          }}
                        >
                          <Field
                            label="Product Name"
                            value={draft.productName}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, productName: v } }))
                            }
                          />
                          <Field
                            label="Brand"
                            value={draft.brand}
                            onChange={(v) => setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, brand: v } }))}
                          />
                          <Field
                            label="Product Code / SKU"
                            value={draft.productCode}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, productCode: v } }))
                            }
                          />
                          <Field
                            label="Product Type"
                            value={draft.productType}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, productType: v } }))
                            }
                          />
                          <Field
                            label="Country of Origin"
                            value={draft.countryOfOrigin}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, countryOfOrigin: v } }))
                            }
                          />
                          <Field
                            label="Storage Condition"
                            value={draft.storageCondition}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, storageCondition: v } }))
                            }
                          />
                          <Field
                            label="Shelf Life Value"
                            value={draft.shelfLifeValue}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, shelfLifeValue: v } }))
                            }
                            placeholder="مثال: 30"
                          />
                          <Field
                            label="Shelf Life Unit"
                            value={draft.shelfLifeUnit}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, shelfLifeUnit: v } }))
                            }
                            placeholder="days / months"
                          />
                          <Field
                            label="DM Registered Status"
                            value={draft.dmRegisteredStatus}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, dmRegisteredStatus: v } }))
                            }
                          />
                          <Field
                            label="DM Registration No."
                            value={draft.dmRegistrationNo}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, dmRegistrationNo: v } }))
                            }
                          />
                          <Field
                            label="Other Authorities"
                            value={draft.otherAuthorityRegs}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, otherAuthorityRegs: v } }))
                            }
                          />
                        </div>

                        <div style={{ height: 14 }} />

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                            gap: 12,
                          }}
                        >
                          <Area
                            label="Allergens"
                            value={draft.allergens}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, allergens: v } }))
                            }
                            rows={4}
                          />
                          <Area
                            label="Instructions For Use"
                            value={draft.instructionsForUse}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, instructionsForUse: v } }))
                            }
                            rows={4}
                          />
                        </div>

                        <div style={{ height: 14 }} />

                        <div style={{ fontSize: 14, fontWeight: 1000, color: UI.ink, marginBottom: 10 }}>
                          Ingredients
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "separate",
                              borderSpacing: 0,
                              fontSize: 13,
                              background: "rgba(255,255,255,0.78)",
                              border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border
                              borderRadius: 16,
                              overflow: "hidden",
                            }}
                          >
                            <thead>
                              <tr style={{ background: "rgba(59,130,246,0.10)" }}>
                                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>Name</th>
                                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>Amount</th>
                                <th style={{ width: 110, padding: "10px 12px", fontWeight: 1000 }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(draft.ingredients || []).map((ing, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                  <td style={{ padding: "10px 12px" }}>
                                    <input
                                      value={ing?.name ?? ""}
                                      onChange={(e) => {
                                        const next = [...(draft.ingredients || [])];
                                        next[i] = { ...(next[i] || {}), name: e.target.value };
                                        setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, ingredients: next } }));
                                      }}
                                      className="lux-input"
                                      style={{
                                        width: "100%",
                                        height: 42,
                                        borderRadius: 14,
                                        border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border
                                        padding: "0 14px",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        background: "rgba(255,255,255,0.85)",
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <input
                                      value={ing?.amount ?? ""}
                                      onChange={(e) => {
                                        const next = [...(draft.ingredients || [])];
                                        next[i] = { ...(next[i] || {}), amount: e.target.value };
                                        setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, ingredients: next } }));
                                      }}
                                      className="lux-input"
                                      style={{
                                        width: "100%",
                                        height: 42,
                                        borderRadius: 14,
                                        border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border
                                        padding: "0 14px",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        background: "rgba(255,255,255,0.85)",
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <Button
                                      tone="danger"
                                      type="button"
                                      onClick={() => {
                                        const next = [...(draft.ingredients || [])];
                                        next.splice(i, 1);
                                        setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, ingredients: next } }));
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={3} style={{ padding: 12, borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                  <Button
                                    tone="primary"
                                    type="button"
                                    onClick={() => {
                                      const next = [...(draft.ingredients || [])];
                                      next.push({ name: "", amount: "" });
                                      setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, ingredients: next } }));
                                    }}
                                  >
                                    + Add Ingredient
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div style={{ height: 14 }} />

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                            gap: 12,
                          }}
                        >
                          <Area
                            label="Product Images URLs (one per line)"
                            value={draft.__productImageText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __productImageText: v } }))
                            }
                            rows={6}
                          />
                          <Area
                            label="Test Images URLs (one per line)"
                            value={draft.__testImagesText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __testImagesText: v } }))
                            }
                            rows={6}
                          />
                          <Area
                            label="DM Registration Images URLs"
                            value={draft.__dmRegImagesText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __dmRegImagesText: v } }))
                            }
                            rows={5}
                          />
                          <Area
                            label="Assessment Cert Images URLs"
                            value={draft.__assessImagesText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __assessImagesText: v } }))
                            }
                            rows={5}
                          />
                          <Area
                            label="Halal Cert Images URLs"
                            value={draft.__halalImagesText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __halalImagesText: v } }))
                            }
                            rows={5}
                          />
                          <Area
                            label="Nutrition Facts Images URLs"
                            value={draft.__nutritionImagesText || ""}
                            onChange={(v) =>
                              setDraftById((p0) => ({ ...p0, [row.id]: { ...draft, __nutritionImagesText: v } }))
                            }
                            rows={5}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ✅ View mode: 3 luxury sections */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                            gap: 14,
                            marginBottom: 14,
                          }}
                        >
                          <SectionCard title="Basic Information" icon="📦">
                            <div style={{ fontSize: 14, fontWeight: 800, color: UI.muted, lineHeight: 1.8 }}>
                              <div><strong style={{ color: UI.ink }}>Brand:</strong> {p.brand || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Product code / SKU:</strong> {p.productCode || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Product type:</strong> {p.productType || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Country of origin:</strong> {p.countryOfOrigin || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Storage condition:</strong> {p.storageCondition || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Shelf life:</strong> {shelfLifeText || "-"}</div>
                            </div>
                          </SectionCard>

                          <SectionCard title="Registration & Certificates" icon="📜">
                            <div style={{ fontSize: 14, fontWeight: 800, color: UI.muted, lineHeight: 1.8 }}>
                              <div><strong style={{ color: UI.ink }}>DM status:</strong> {p.dmRegisteredStatus || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>DM No.:</strong> {p.dmRegistrationNo || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Other authorities:</strong> {p.otherAuthorityRegs || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Assessment cert. No.:</strong> {p.assessmentCertNo || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Assessment body:</strong> {p.assessmentBody || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Assessment date:</strong> {p.assessmentDate || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Halal cert. No.:</strong> {p.halalCertNo || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Halal CB:</strong> {p.halalCB || "-"}</div>
                              <div><strong style={{ color: UI.ink }}>Halal expiry:</strong> {p.halalCertExpiry || "-"}</div>
                            </div>
                          </SectionCard>

                          <SectionCard title="Allergens & Instructions" icon="🧾">
                            <div style={{ fontSize: 14, fontWeight: 800, color: UI.muted, lineHeight: 1.65 }}>
                              <div style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
                                <strong style={{ color: UI.ink }}>Allergens:</strong>{" "}
                                {p.allergens || "(none specified)"}
                              </div>
                              <div style={{ whiteSpace: "pre-wrap" }}>
                                <strong style={{ color: UI.ink }}>Instructions:</strong>{" "}
                                {p.instructionsForUse || "(no instructions)"}
                              </div>
                            </div>
                          </SectionCard>
                        </div>

                        {/* Ingredients + Images (wide) */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(360px, 1.05fr) minmax(360px, 1.95fr)",
                            gap: 14,
                            alignItems: "start",
                          }}
                        >
                          <SectionCard title="Ingredients" icon="🥣">
                            {Array.isArray(p.ingredients) && p.ingredients.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "separate",
                                    borderSpacing: 0,
                                    fontSize: 13,
                                    border: `1.8px solid ${UI.detailBorder}`, // ✅ dark blue border
                                    borderRadius: 16,
                                    overflow: "hidden",
                                    background: "rgba(255,255,255,0.75)",
                                  }}
                                >
                                  <thead>
                                    <tr style={{ background: "rgba(34,197,94,0.10)" }}>
                                      <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>
                                        Ingredient
                                      </th>
                                      <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>
                                        Amount
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.ingredients.map((ing, i) => (
                                      <tr key={i}>
                                        <td style={{ padding: "10px 12px", borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                          {ing?.name || "-"}
                                        </td>
                                        <td style={{ padding: "10px 12px", borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                          {ing?.amount || "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ color: UI.muted, fontWeight: 850 }}>No ingredients listed.</div>
                            )}
                          </SectionCard>

                          <SectionCard title="Images" icon="🖼️">
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                  Product images
                                </div>
                                {productImages.length > 0 ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    {productImages.map((url, i) => (
                                      <Thumb key={i} rawUrl={url} alt={`Product ${p.productName || ""} ${i + 1}`} size={104} />
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: UI.muted, fontWeight: 850 }}>No product images.</div>
                                )}
                              </div>

                              <div>
                                <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                  Test images
                                </div>
                                {testImages.length > 0 ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    {testImages.map((url, i) => (
                                      <Thumb key={i} rawUrl={url} alt={`Test ${i + 1}`} size={92} />
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: UI.muted, fontWeight: 850 }}>No test images.</div>
                                )}
                              </div>

                              <div style={{ gridColumn: "1 / -1" }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                    gap: 14,
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                      DM registration images
                                    </div>
                                    {dmRegImages.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                        {dmRegImages.map((url, i) => (
                                          <Thumb key={i} rawUrl={url} alt={`DM ${i + 1}`} size={86} />
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ color: UI.muted, fontWeight: 850 }}>No DM registration images.</div>
                                    )}
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                      Assessment certificate images
                                    </div>
                                    {assessImages.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                        {assessImages.map((url, i) => (
                                          <Thumb key={i} rawUrl={url} alt={`Assessment ${i + 1}`} size={86} />
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ color: UI.muted, fontWeight: 850 }}>No assessment images.</div>
                                    )}
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                      Halal certificate images
                                    </div>
                                    {halalImages.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                        {halalImages.map((url, i) => (
                                          <Thumb key={i} rawUrl={url} alt={`Halal ${i + 1}`} size={86} />
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ color: UI.muted, fontWeight: 850 }}>No Halal images.</div>
                                    )}
                                  </div>

                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 1000, marginBottom: 10, color: UI.ink }}>
                                      Nutrition facts images
                                    </div>
                                    {nutritionImages.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                        {nutritionImages.map((url, i) => (
                                          <Thumb key={i} rawUrl={url} alt={`Nutrition ${i + 1}`} size={86} />
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ color: UI.muted, fontWeight: 850 }}>No nutrition facts images.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </SectionCard>
                        </div>
                      </>
                    )}

                    {/* Footer: created date + actions */}
                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 850, color: UI.muted }}>
                        Created at:{" "}
                        <span style={{ color: UI.ink, fontWeight: 1000 }}>
                          {row.createdAt ? String(row.createdAt).slice(0, 19).replace("T", " ") : "-"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button
                          tone="primary"
                          type="button"
                          onClick={() => startEditInline(row)}
                          disabled={!row.serverId || deletingId === row.serverId}
                        >
                          ✏️ Edit (same page)
                        </Button>

                        <Button
                          tone="danger"
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.serverId || !row.serverId}
                        >
                          {deletingId === row.serverId ? "Deleting..." : "🗑 Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
