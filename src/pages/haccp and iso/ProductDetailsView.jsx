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

/* ✅ Cloudinary cloud name */
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

/* Upload via server (ONLY when saving edits with new images) */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data || data.ok === false) {
    throw new Error(data?.error || data?.message || "Upload failed");
  }

  return data.optimized_url || data.url || data.secure_url;
}

/**
 * ✅ Smart split:
 * - if text contains URLs -> extract full URLs
 * - else fallback split on newline/comma
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

function listToStoredString(value) {
  // keep storage consistent (newline string)
  const arr = splitLinesToList(value);
  return arr.join("\n");
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

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

  // ✅ Dark blue borders inside details
  detailBorder: "rgba(30, 58, 138, 0.78)",
  detailBorderSoft: "rgba(30, 58, 138, 0.36)",
  detailBorderThin: "rgba(30, 58, 138, 0.22)",
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
          border: `1.8px solid ${UI.detailBorder}`,
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
          border: `1.8px solid ${UI.detailBorder}`,
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

/* =========================
   ✅ SectionCard (table-like header + clear lines)
   ========================= */
function SectionCard({ title, icon, tone = "blue", children }) {
  const tones = {
    blue: { headBg: "rgba(59,130,246,0.12)", headText: "#1e3a8a" },
    green: { headBg: "rgba(34,197,94,0.12)", headText: "#166534" },
    amber: { headBg: "rgba(245,158,11,0.14)", headText: "#92400e" },
    red: { headBg: "rgba(239,68,68,0.12)", headText: "#b91c1c" },
    slate: { headBg: "rgba(15,23,42,0.06)", headText: "#0f172a" },
  };
  const t = tones[tone] || tones.blue;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.75)",
        border: `1.8px solid ${UI.detailBorder}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: UI.shadowSoft,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: t.headBg,
          borderBottom: `1px solid ${UI.detailBorderThin}`,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.85)",
            border: `1px solid ${UI.detailBorderThin}`,
          }}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 1000, color: t.headText }}>{title}</div>
      </div>

      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

/* =========================
   ✅ KVTable (same table vibe as Ingredients)
   ========================= */
function KVTable({ headLeft = "Field", headRight = "Value", rows = [], tone = "blue" }) {
  const tones = {
    blue: "rgba(59,130,246,0.10)",
    green: "rgba(34,197,94,0.10)",
    amber: "rgba(245,158,11,0.12)",
    slate: "rgba(15,23,42,0.06)",
  };
  const theadBg = tones[tone] || tones.blue;

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 13,
          background: "rgba(255,255,255,0.78)",
          border: `1.8px solid ${UI.detailBorder}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: theadBg }}>
            <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>{headLeft}</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>{headRight}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const left = r?.[0];
            const right = r?.[1];

            return (
              <tr key={i}>
                <td
                  style={{
                    padding: "10px 12px",
                    borderTop: `1px solid ${UI.detailBorderThin}`,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    verticalAlign: "top",
                  }}
                >
                  {left}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderTop: `1px solid ${UI.detailBorderThin}`,
                    fontWeight: 800,
                    color: UI.muted,
                    whiteSpace: "pre-wrap",
                    verticalAlign: "top",
                  }}
                >
                  {right}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   ✅ Image Modal (preview + download)
   ========================= */
function ImageModal({ open, title, url, onClose }) {
  if (!open) return null;
  const fixed = normalizeImageUrl(url);

  const fileName = (() => {
    try {
      const clean = String(fixed || "").split("?")[0];
      const last = clean.split("/").pop() || "image";
      return last.includes(".") ? last : `${last}.jpg`;
    } catch {
      return "image.jpg";
    }
  })();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "88vh",
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg,#eff6ff,#ffffff)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#1e3a8a", fontSize: 14 }}>{title || "Image preview"}</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a
              href={fixed || "#"}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                padding: "9px 12px",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.12)",
                background: "rgba(255,255,255,0.85)",
                fontSize: 13,
                fontWeight: 900,
                color: "#0f172a",
                boxShadow: "0 10px 22px rgba(2,6,23,0.10)",
              }}
              title="Download image"
            >
              ⬇ Download
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 24,
                cursor: "pointer",
                lineHeight: 1,
                padding: "2px 6px",
              }}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0b1220",
          }}
        >
          {fixed ? (
            <img
              src={fixed}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                borderRadius: 12,
                background: "#fff",
              }}
            />
          ) : (
            <div style={{ color: "#fff", fontWeight: 900 }}>Invalid image URL</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   ✅ Thumb (opens modal, not link)
   ========================= */
function Thumb({ rawUrl, alt, size = 92, onOpen }) {
  const [failed, setFailed] = useState(false);
  const fixed = useMemo(() => normalizeImageUrl(rawUrl), [rawUrl]);

  const shouldShow = fixed && isLikelyImageUrl(fixed) && !failed;
  if (!shouldShow) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(fixed, alt || "Image")}
      title="Click to preview"
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
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
    </button>
  );
}

/* =========================
   ✅ Gallery editor (no URLs shown)
   - remove existing (from record)
   - add pending (preview)
   - upload ONLY on Save
   ========================= */
function GalleryEditor({
  title,
  fieldKey,
  max,
  rowId,
  draft,
  pendingForRow,
  updateDraftField,
  updatePendingField,
  onOpenImage,
}) {
  const remoteList = useMemo(() => splitLinesToList(draft?.[fieldKey]), [draft, fieldKey]);
  const pendingArr = Array.isArray(pendingForRow?.[fieldKey]) ? pendingForRow[fieldKey] : [];
  const total = remoteList.length + pendingArr.length;

  const addFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = typeof max === "number" ? Math.max(0, max - total) : files.length;
    if (typeof max === "number" && remaining <= 0) {
      e.target.value = "";
      return;
    }

    const take = typeof max === "number" ? files.slice(0, remaining) : files;

    const mapped = take.map((file) => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    updatePendingField(rowId, fieldKey, [...pendingArr, ...mapped]);
    e.target.value = "";
  };

  const removeRemote = (url) => {
    const next = remoteList.filter((u) => u !== url);
    updateDraftField(rowId, fieldKey, next);
  };

  const removePending = (id) => {
    const hit = pendingArr.find((x) => x?.id === id);
    if (hit?.previewUrl) {
      try {
        URL.revokeObjectURL(hit.previewUrl);
      } catch {}
    }
    const next = pendingArr.filter((x) => x?.id !== id);
    updatePendingField(rowId, fieldKey, next);
  };

  const clearAll = () => {
    pendingArr.forEach((it) => {
      if (it?.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      }
    });
    updatePendingField(rowId, fieldKey, []);
    updateDraftField(rowId, fieldKey, []);
  };

  const box = {
    borderRadius: 16,
    border: `1.8px solid ${UI.detailBorder}`,
    background: "rgba(255,255,255,0.78)",
    padding: 12,
  };

  const thumbsWrap = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  };

  const thumbWrap = (isPending) => ({
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    border: isPending ? "1px dashed rgba(29,78,216,0.55)" : `1px solid ${UI.border}`,
    background: "#fff",
    position: "relative",
    boxShadow: "0 12px 24px rgba(2,6,23,0.10)",
    cursor: "pointer",
  });

  const removeBtn = {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.55)",
    background: "rgba(254,242,242,0.95)",
    color: "#b91c1c",
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: "20px",
    textAlign: "center",
  };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 1000, color: UI.ink }}>
          {title}{" "}
          <span style={{ fontSize: 12, color: UI.muted, fontWeight: 900 }}>
            {typeof max === "number" ? `(max ${max})` : `(no limit)`}
          </span>
        </div>
        <Chip tone={pendingArr.length ? "warn" : "info"}>
          Total: {total} {typeof max === "number" ? `/ ${max}` : ""}{" "}
          {pendingArr.length ? `| Pending: ${pendingArr.length}` : ""}
        </Chip>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept="image/*" multiple onChange={addFiles} style={{ fontSize: 13 }} />

        {(remoteList.length > 0 || pendingArr.length > 0) && (
          <Button tone="danger" type="button" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <div style={{ fontSize: 12, color: UI.muted, fontWeight: 850, marginTop: 8 }}>
        ✅ معاينة فقط. الرفع يتم عند الضغط على Save.
      </div>

      {(remoteList.length > 0 || pendingArr.length > 0) ? (
        <div style={thumbsWrap}>
          {/* remote */}
          {remoteList.map((raw, i) => {
            const fixed = normalizeImageUrl(raw);
            if (!fixed || !isLikelyImageUrl(fixed)) return null;

            return (
              <div
                key={`r_${raw}_${i}`}
                style={thumbWrap(false)}
                onClick={() => onOpenImage?.(fixed, `${title} (${i + 1})`)}
                title="Preview"
              >
                <img
                  src={fixed}
                  alt={`${title} ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  style={removeBtn}
                  title="Remove from record"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeRemote(raw);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* pending */}
          {pendingArr.map((it, i) => (
            <div
              key={`p_${it.id}_${i}`}
              style={thumbWrap(true)}
              onClick={() => onOpenImage?.(it.previewUrl, `${title} (Pending)`)}
              title="Pending preview"
            >
              <img
                src={it.previewUrl}
                alt={`${title} pending ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <button
                type="button"
                style={removeBtn}
                title="Remove pending"
                onClick={(ev) => {
                  ev.stopPropagation();
                  removePending(it.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 10, color: UI.muted, fontWeight: 900 }}>No images.</div>
      )}
    </div>
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

  /* ✅ pending images (per row) */
  const [pendingByRow, setPendingByRow] = useState({}); // { [rowId]: { fieldKey: [{id,file,previewUrl}] } }

  /* ✅ modal */
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });
  const openImage = (url, title) => setImgModal({ open: true, url, title });
  const closeImage = () => setImgModal({ open: false, url: "", title: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStatusMessage("Loading products from server...");

      try {
        const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);

        if (!ok) {
          throw new Error((data && (data.error || data.message)) || `Server error (status ${status})`);
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
          setStatusMessage(mapped.length ? `Loaded ${mapped.length} product(s).` : "No products found.");
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

  const updateDraftField = (rowId, fieldKey, value) => {
    setDraftById((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [fieldKey]: value },
    }));
  };

  const updatePendingField = (rowId, fieldKey, value) => {
    setPendingByRow((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [fieldKey]: value },
    }));
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
      // normalize image fields to arrays (UI uses previews only)
      draft.productImageUrls = splitLinesToList(draft.productImageUrls);
      draft.testImagesUrls = splitLinesToList(draft.testImagesUrls);
      draft.dmRegistrationImagesUrls = splitLinesToList(draft.dmRegistrationImagesUrls);
      draft.assessmentCertImagesUrls = splitLinesToList(draft.assessmentCertImagesUrls);
      draft.halalCertImagesUrls = splitLinesToList(draft.halalCertImagesUrls);
      draft.nutritionFactsImagesUrls = splitLinesToList(draft.nutritionFactsImagesUrls);

      if (!Array.isArray(draft.ingredients)) draft.ingredients = [];
      return { ...prev, [row.id]: draft };
    });

    setPendingByRow((p) => ({ ...p, [row.id]: p[row.id] || {} }));
  };

  const cleanupPendingForRow = (rowId) => {
    const obj = pendingByRow?.[rowId] || {};
    Object.values(obj).forEach((arr) => {
      (arr || []).forEach((it) => {
        if (it?.previewUrl) {
          try {
            URL.revokeObjectURL(it.previewUrl);
          } catch {}
        }
      });
    });
  };

  const cancelEditInline = () => {
    if (editingId) cleanupPendingForRow(editingId);
    setEditingId(null);
  };

  const saveEditInline = async (row) => {
    const rid = row?.serverId;
    if (!rid) return;

    const rowId = row.id;
    const draft = draftById[rowId] || {};
    const pendingForRow = pendingByRow[rowId] || {};

    setSavingId(rid);
    setStatusMessage("⏳ Uploading new images (if any) & saving changes...");

    const imageFields = [
      { key: "productImageUrls", max: null },
      { key: "testImagesUrls", max: 10 },
      { key: "dmRegistrationImagesUrls", max: 10 },
      { key: "assessmentCertImagesUrls", max: 10 },
      { key: "halalCertImagesUrls", max: 10 },
      { key: "nutritionFactsImagesUrls", max: 10 },
    ];

    try {
      // 1) upload pending files then append
      const updatedDraft = clone(draft);

      for (const f of imageFields) {
        const fieldKey = f.key;
        const remoteArr = splitLinesToList(updatedDraft[fieldKey]);
        const pendArr = Array.isArray(pendingForRow[fieldKey]) ? pendingForRow[fieldKey] : [];

        if (!pendArr.length) {
          updatedDraft[fieldKey] = remoteArr;
          continue;
        }

        const room = typeof f.max === "number" ? Math.max(0, f.max - remoteArr.length) : pendArr.length;
        const toUpload = typeof f.max === "number" ? pendArr.slice(0, room) : pendArr;

        for (let i = 0; i < toUpload.length; i++) {
          setStatusMessage(`⏳ Uploading ${fieldKey} (${i + 1}/${toUpload.length})...`);
          const url = await uploadViaServer(toUpload[i].file);
          remoteArr.push(url);
        }

        updatedDraft[fieldKey] = remoteArr;
      }

      // 2) build payload (store images as newline string)
      const payload = clone(updatedDraft);
      payload.productImageUrls = listToStoredString(payload.productImageUrls);
      payload.testImagesUrls = listToStoredString(payload.testImagesUrls);
      payload.dmRegistrationImagesUrls = listToStoredString(payload.dmRegistrationImagesUrls);
      payload.assessmentCertImagesUrls = listToStoredString(payload.assessmentCertImagesUrls);
      payload.halalCertImagesUrls = listToStoredString(payload.halalCertImagesUrls);
      payload.nutritionFactsImagesUrls = listToStoredString(payload.nutritionFactsImagesUrls);

      if (!Array.isArray(payload.ingredients)) payload.ingredients = [];

      // 3) update server
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

      let { res, data } = await tryUpdate("PUT");
      if (!res.ok) {
        const maybeMethodNotAllowed = res.status === 404 || res.status === 405;
        if (maybeMethodNotAllowed) {
          ({ res, data } = await tryUpdate("PATCH"));
        }
      }

      if (!res.ok || (data && data.ok === false)) {
        throw new Error((data && (data.error || data.message)) || `Server error (status ${res.status})`);
      }

      // 4) update local rows
      setRows((prev) => prev.map((x) => (x.serverId === rid ? { ...x, payload } : x)));

      // 5) cleanup pending previews
      cleanupPendingForRow(rowId);
      setPendingByRow((p) => ({ ...p, [rowId]: {} }));

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

    const confirmDelete = window.confirm(`Are you sure you want to delete product "${row.payload?.productName || ""}"?`);
    if (!confirmDelete) return;

    setDeletingId(rid);
    setStatusMessage("⏳ Deleting product from server...");

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data && data.ok === false)) {
        throw new Error((data && (data.error || data.message)) || `Server error (status ${res.status})`);
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
      {/* ✅ Image modal */}
      <ImageModal open={imgModal.open} title={imgModal.title} url={imgModal.url} onClose={closeImage} />

      <style>{`
        .lux-input:focus {
          box-shadow: ${UI.ring} !important;
          border-color: ${UI.detailBorder} !important;
        }
        .lux-thumb:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 18px 36px rgba(2,6,23,0.14); }
        .lux-card:hover { transform: translateY(-1px); box-shadow: 0 22px 50px rgba(2,6,23,0.12); }
      `}</style>

      <div style={{ maxWidth: 1720, margin: "0 auto" }}>
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
            const pendingForRow = pendingByRow[row.id] || {};

            const productImages = filterImageList(p.productImageUrls);
            const testImages = filterImageList(p.testImagesUrls);
            const dmRegImages = filterImageList(p.dmRegistrationImagesUrls);
            const assessImages = filterImageList(p.assessmentCertImagesUrls);
            const halalImages = filterImageList(p.halalCertImagesUrls);
            const nutritionImages = filterImageList(p.nutritionFactsImagesUrls);

            const shelfLifeText =
              p.shelfLifeValue && p.shelfLifeUnit ? `${p.shelfLifeValue} ${p.shelfLifeUnit}` : p.shelfLife || "";

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

                {isExpanded && (
                  <div
                    style={{
                      padding: "14px 14px 16px",
                      borderTop: `1px solid ${UI.border}`,
                      background: "rgba(255,255,255,0.60)",
                    }}
                  >
                    {isEditing ? (
                      <div
                        style={{
                          border: `1px solid rgba(59,130,246,0.25)`,
                          background: "linear-gradient(180deg, rgba(239,246,255,0.85), rgba(255,255,255,0.75))",
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
                          <div style={{ fontWeight: 1000, color: "#1d4ed8", fontSize: 15 }}>Editing (same page)</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <Button
                              tone="ok"
                              type="button"
                              onClick={() => saveEditInline(row)}
                              disabled={savingId === row.serverId}
                            >
                              {savingId === row.serverId ? "Saving..." : "✅ Save"}
                            </Button>

                            <Button tone="ghost" type="button" onClick={cancelEditInline} disabled={savingId === row.serverId}>
                              ✖ Cancel
                            </Button>
                          </div>
                        </div>

                        <div style={{ height: 14 }} />

                        {/* ✅ Edit sections with same header vibe */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                            gap: 14,
                            alignItems: "start",
                          }}
                        >
                          <SectionCard title="Basic Information" icon="📦" tone="blue">
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
                                onChange={(v) => updateDraftField(row.id, "productName", v)}
                              />
                              <Field label="Brand" value={draft.brand} onChange={(v) => updateDraftField(row.id, "brand", v)} />
                              <Field
                                label="Product Code / SKU"
                                value={draft.productCode}
                                onChange={(v) => updateDraftField(row.id, "productCode", v)}
                              />
                              <Field
                                label="Product Type"
                                value={draft.productType}
                                onChange={(v) => updateDraftField(row.id, "productType", v)}
                              />
                              <Field
                                label="Country of Origin"
                                value={draft.countryOfOrigin}
                                onChange={(v) => updateDraftField(row.id, "countryOfOrigin", v)}
                              />
                              <Field
                                label="Storage Condition"
                                value={draft.storageCondition}
                                onChange={(v) => updateDraftField(row.id, "storageCondition", v)}
                              />
                              <Field
                                label="Shelf Life Value"
                                value={draft.shelfLifeValue}
                                onChange={(v) => updateDraftField(row.id, "shelfLifeValue", v)}
                                placeholder="مثال: 30"
                              />
                              <Field
                                label="Shelf Life Unit"
                                value={draft.shelfLifeUnit}
                                onChange={(v) => updateDraftField(row.id, "shelfLifeUnit", v)}
                                placeholder="days / months"
                              />
                            </div>
                          </SectionCard>

                          <SectionCard title="Registration & Certificates" icon="📜" tone="slate">
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                gap: 12,
                              }}
                            >
                              <Field
                                label="DM Registered Status"
                                value={draft.dmRegisteredStatus}
                                onChange={(v) => updateDraftField(row.id, "dmRegisteredStatus", v)}
                              />
                              <Field
                                label="DM Registration No."
                                value={draft.dmRegistrationNo}
                                onChange={(v) => updateDraftField(row.id, "dmRegistrationNo", v)}
                              />
                              <Field
                                label="Other Authorities"
                                value={draft.otherAuthorityRegs}
                                onChange={(v) => updateDraftField(row.id, "otherAuthorityRegs", v)}
                              />
                            </div>
                          </SectionCard>

                          <SectionCard title="Allergens & Instructions" icon="🧾" tone="amber">
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
                                onChange={(v) => updateDraftField(row.id, "allergens", v)}
                                rows={4}
                              />
                              <Area
                                label="Instructions For Use"
                                value={draft.instructionsForUse}
                                onChange={(v) => updateDraftField(row.id, "instructionsForUse", v)}
                                rows={4}
                              />
                            </div>
                          </SectionCard>

                          <SectionCard title="Ingredients" icon="🥣" tone="green">
                            <div style={{ overflowX: "auto" }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "separate",
                                  borderSpacing: 0,
                                  fontSize: 13,
                                  background: "rgba(255,255,255,0.78)",
                                  border: `1.8px solid ${UI.detailBorder}`,
                                  borderRadius: 16,
                                  overflow: "hidden",
                                }}
                              >
                                <thead>
                                  <tr style={{ background: "rgba(34,197,94,0.10)" }}>
                                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>Name</th>
                                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 1000 }}>Amount</th>
                                    <th style={{ width: 110, padding: "10px 12px", fontWeight: 1000 }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(draft.ingredients || []).map((ing, i) => (
                                    <tr key={i}>
                                      <td style={{ padding: "10px 12px", borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                        <input
                                          value={ing?.name ?? ""}
                                          onChange={(e) => {
                                            const next = [...(draft.ingredients || [])];
                                            next[i] = { ...(next[i] || {}), name: e.target.value };
                                            updateDraftField(row.id, "ingredients", next);
                                          }}
                                          className="lux-input"
                                          style={{
                                            width: "100%",
                                            height: 42,
                                            borderRadius: 14,
                                            border: `1.8px solid ${UI.detailBorder}`,
                                            padding: "0 14px",
                                            fontSize: 14,
                                            fontWeight: 700,
                                            background: "rgba(255,255,255,0.85)",
                                          }}
                                        />
                                      </td>
                                      <td style={{ padding: "10px 12px", borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                        <input
                                          value={ing?.amount ?? ""}
                                          onChange={(e) => {
                                            const next = [...(draft.ingredients || [])];
                                            next[i] = { ...(next[i] || {}), amount: e.target.value };
                                            updateDraftField(row.id, "ingredients", next);
                                          }}
                                          className="lux-input"
                                          style={{
                                            width: "100%",
                                            height: 42,
                                            borderRadius: 14,
                                            border: `1.8px solid ${UI.detailBorder}`,
                                            padding: "0 14px",
                                            fontSize: 14,
                                            fontWeight: 700,
                                            background: "rgba(255,255,255,0.85)",
                                          }}
                                        />
                                      </td>
                                      <td style={{ padding: "10px 12px", borderTop: `1px solid ${UI.detailBorderThin}` }}>
                                        <Button
                                          tone="danger"
                                          type="button"
                                          onClick={() => {
                                            const next = [...(draft.ingredients || [])];
                                            next.splice(i, 1);
                                            updateDraftField(row.id, "ingredients", next);
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
                                          updateDraftField(row.id, "ingredients", next);
                                        }}
                                      >
                                        + Add Ingredient
                                      </Button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </SectionCard>

                          <SectionCard title="Images (Edit)" icon="🖼️" tone="blue">
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                                gap: 12,
                              }}
                            >
                              <GalleryEditor
                                title="Product images"
                                fieldKey="productImageUrls"
                                max={null}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />

                              <GalleryEditor
                                title="Test images"
                                fieldKey="testImagesUrls"
                                max={10}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />

                              <GalleryEditor
                                title="DM registration images"
                                fieldKey="dmRegistrationImagesUrls"
                                max={10}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />

                              <GalleryEditor
                                title="Assessment certificate images"
                                fieldKey="assessmentCertImagesUrls"
                                max={10}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />

                              <GalleryEditor
                                title="Halal certificate images"
                                fieldKey="halalCertImagesUrls"
                                max={10}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />

                              <GalleryEditor
                                title="Nutrition facts images"
                                fieldKey="nutritionFactsImagesUrls"
                                max={10}
                                rowId={row.id}
                                draft={draft}
                                pendingForRow={pendingForRow}
                                updateDraftField={updateDraftField}
                                updatePendingField={updatePendingField}
                                onOpenImage={openImage}
                              />
                            </div>
                          </SectionCard>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ✅ View mode: all sections in same "table-like" style */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                            gap: 14,
                            marginBottom: 14,
                          }}
                        >
                          <SectionCard title="Basic Information" icon="📦" tone="blue">
                            <KVTable
                              tone="blue"
                              rows={[
                                ["Brand", p.brand || "-"],
                                ["Product code / SKU", p.productCode || "-"],
                                ["Product type", p.productType || "-"],
                                ["Country of origin", p.countryOfOrigin || "-"],
                                ["Storage condition", p.storageCondition || "-"],
                                ["Shelf life", shelfLifeText || "-"],
                              ]}
                            />
                          </SectionCard>

                          <SectionCard title="Registration & Certificates" icon="📜" tone="slate">
                            <KVTable
                              tone="slate"
                              rows={[
                                ["DM status", p.dmRegisteredStatus || "-"],
                                ["DM No.", p.dmRegistrationNo || "-"],
                                ["Other authorities", p.otherAuthorityRegs || "-"],
                                ["Assessment cert. No.", p.assessmentCertNo || "-"],
                                ["Assessment body", p.assessmentBody || "-"],
                                ["Assessment date", p.assessmentDate || "-"],
                                ["Halal cert. No.", p.halalCertNo || "-"],
                                ["Halal CB", p.halalCB || "-"],
                                ["Halal expiry", p.halalCertExpiry || "-"],
                              ]}
                            />
                          </SectionCard>

                          <SectionCard title="Allergens & Instructions" icon="🧾" tone="amber">
                            <KVTable
                              tone="amber"
                              headLeft="Item"
                              headRight="Details"
                              rows={[
                                ["Allergens", p.allergens || "(none specified)"],
                                ["Instructions", p.instructionsForUse || "(no instructions)"],
                              ]}
                            />
                          </SectionCard>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(360px, 1.05fr) minmax(360px, 1.95fr)",
                            gap: 14,
                            alignItems: "start",
                          }}
                        >
                          <SectionCard title="Ingredients" icon="🥣" tone="green">
                            {Array.isArray(p.ingredients) && p.ingredients.length > 0 ? (
                              <div style={{ overflowX: "auto" }}>
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "separate",
                                    borderSpacing: 0,
                                    fontSize: 13,
                                    border: `1.8px solid ${UI.detailBorder}`,
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

                          <SectionCard title="Images" icon="🖼️" tone="blue">
                            <KVTable
                              tone="blue"
                              headLeft="Category"
                              headRight="Images"
                              rows={[
                                [
                                  "Product images",
                                  productImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {productImages.map((url, i) => (
                                        <Thumb
                                          key={i}
                                          rawUrl={url}
                                          alt={`Product ${p.productName || ""} ${i + 1}`}
                                          size={92}
                                          onOpen={(fixed, t) => openImage(fixed, t)}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No product images.</span>
                                  ),
                                ],
                                [
                                  "Test images",
                                  testImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {testImages.map((url, i) => (
                                        <Thumb key={i} rawUrl={url} alt={`Test ${i + 1}`} size={92} onOpen={openImage} />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No test images.</span>
                                  ),
                                ],
                                [
                                  "DM registration images",
                                  dmRegImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {dmRegImages.map((url, i) => (
                                        <Thumb key={i} rawUrl={url} alt={`DM ${i + 1}`} size={92} onOpen={openImage} />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No DM registration images.</span>
                                  ),
                                ],
                                [
                                  "Assessment certificate images",
                                  assessImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {assessImages.map((url, i) => (
                                        <Thumb
                                          key={i}
                                          rawUrl={url}
                                          alt={`Assessment ${i + 1}`}
                                          size={92}
                                          onOpen={openImage}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No assessment images.</span>
                                  ),
                                ],
                                [
                                  "Halal certificate images",
                                  halalImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {halalImages.map((url, i) => (
                                        <Thumb key={i} rawUrl={url} alt={`Halal ${i + 1}`} size={92} onOpen={openImage} />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No Halal images.</span>
                                  ),
                                ],
                                [
                                  "Nutrition facts images",
                                  nutritionImages.length ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      {nutritionImages.map((url, i) => (
                                        <Thumb
                                          key={i}
                                          rawUrl={url}
                                          alt={`Nutrition ${i + 1}`}
                                          size={92}
                                          onOpen={openImage}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 900 }}>No nutrition facts images.</span>
                                  ),
                                ],
                              ]}
                            />
                          </SectionCard>
                        </div>
                      </>
                    )}

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
