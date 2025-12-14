// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";

/* ===== API base (same style as the project) ===== */
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
const TYPE = "licenses_contracts";

/* ✅ Branches (EN) — same as input */
const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

/* ===== Helpers ===== */
function safeArr(x) {
  return Array.isArray(x) ? x : [];
}
function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}
function parseDateAny(r) {
  // used only for sorting (NOT displayed)
  const d =
    (r?.created_at && new Date(r.created_at)) ||
    (r?.createdAt && new Date(r.createdAt)) ||
    (r?.payload?.savedAt && new Date(r.payload.savedAt)) ||
    (r?.payload?.reportDate && new Date(r.payload.reportDate)) || // legacy
    new Date(NaN);
  return d;
}
function daysUntil(ymdStr) {
  const s = String(ymdStr || "").trim();
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
function expiryBadge(expiryDate) {
  const n = daysUntil(expiryDate);
  if (n === null)
    return {
      text: "No Expiry",
      bg: "rgba(100,116,139,0.10)",
      bd: "rgba(100,116,139,0.28)",
      color: "#334155",
    };
  if (n < 0)
    return {
      text: `Expired (${Math.abs(n)}d)`,
      bg: "rgba(239,68,68,0.10)",
      bd: "rgba(239,68,68,0.34)",
      color: "#991b1b",
    };
  if (n <= 30)
    return {
      text: `Expiring (${n}d)`,
      bg: "rgba(245,158,11,0.12)",
      bd: "rgba(245,158,11,0.34)",
      color: "#92400e",
    };
  return {
    text: `Valid (${n}d)`,
    bg: "rgba(16,185,129,0.10)",
    bd: "rgba(16,185,129,0.30)",
    color: "#065f46",
  };
}
function shortId(r) {
  const id = String(getId(r) || "").trim();
  if (!id) return "—";
  return id.length > 8 ? id.slice(-8) : id;
}

/* ===== Files / Images helpers ===== */
function toUrlArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean).map(String);
  if (typeof x === "string") return [x];
  return [];
}
function normalizeFiles(obj) {
  // supports old + new shapes safely
  const o = obj || {};
  const urls = [
    ...toUrlArray(o.fileUrl),
    ...toUrlArray(o.fileUrls),
    ...toUrlArray(o.files),
    ...toUrlArray(o.images),
    ...toUrlArray(o.imageUrls),
    ...toUrlArray(o.attachments),
    ...toUrlArray(o.attachmentUrls),
  ]
    .map((u) => String(u || "").trim())
    .filter(Boolean);

  // remove duplicates
  const seen = new Set();
  return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}
function isImageUrl(url) {
  const u = String(url || "").toLowerCase().trim();
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  if (u.includes("image/upload")) return true; // cloudinary common pattern
  // basic extension check
  return (
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".png") ||
    u.endsWith(".webp") ||
    u.endsWith(".gif") ||
    u.includes(".jpg?") ||
    u.includes(".jpeg?") ||
    u.includes(".png?") ||
    u.includes(".webp?") ||
    u.includes(".gif?")
  );
}
function isPdfUrl(url) {
  const u = String(url || "").toLowerCase().trim();
  return u.endsWith(".pdf") || u.includes(".pdf?");
}
function niceFileLabel(url, idx) {
  const u = String(url || "");
  const kind = isImageUrl(u) ? "Image" : isPdfUrl(u) ? "PDF" : "File";
  return `${kind} #${idx + 1}`;
}

/* ===== UI styles ===== */
const shellStyle = {
  minHeight: "100vh",
  padding: "28px 18px",
  background:
    "radial-gradient(circle at 12% 6%, rgba(99,102,241,0.15) 0, rgba(249,250,251,1) 38%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 18%, rgba(16,185,129,0.10) 0, rgba(255,255,255,0) 52%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.10) 0, rgba(255,255,255,0) 55%)",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#0b1f4d",
};

/* ✅ أوسع بالعرض */
const layoutStyle = { maxWidth: "1440px", margin: "0 auto" };

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(30, 41, 59, 0.28)",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(10px)",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const brandLeftStyle = { display: "flex", alignItems: "center", gap: "12px" };

const logoStyle = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  objectFit: "cover",
  border: "1px solid rgba(15, 23, 42, 0.18)",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.10)",
  background: "#fff",
};

const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
});

const btnGhost = {
  background: "rgba(255,255,255,0.9)",
  color: "#0b1f4d",
  border: "1px solid rgba(30, 41, 59, 0.28)",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const cardStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(30, 41, 59, 0.26)",
  borderRadius: 18,
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
  padding: 16,
};

const fieldLabel = {
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 6,
  color: "#0b1f4d",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(30, 41, 59, 0.30)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  outline: "none",
  background: "rgba(255,255,255,0.95)",
};

const miniBtn = {
  background: "rgba(99,102,241,0.10)",
  border: "1px solid rgba(99,102,241,0.28)",
  color: "#3730a3",
  borderRadius: 10,
  padding: "7px 10px",
  fontWeight: 950,
  cursor: "pointer",
};

const miniBtnDanger = {
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.28)",
  color: "#991b1b",
  borderRadius: 10,
  padding: "7px 10px",
  fontWeight: 950,
  cursor: "pointer",
};

const thumbWrap = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
};

const thumbBtn = {
  width: 74,
  height: 56,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid rgba(30,41,59,0.22)",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
  background: "#fff",
  cursor: "pointer",
  padding: 0,
};

const thumbImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

function Badge({ expiryDate }) {
  const b = expiryBadge(expiryDate);
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "6px 10px",
        borderRadius: 999,
        background: b.bg,
        border: `1px solid ${b.bd}`,
        color: b.color,
        whiteSpace: "nowrap",
      }}
    >
      {b.text}
    </span>
  );
}

/* ===== Modal ===== */
function PreviewModal({ open, title, urls, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;

  const current = urls?.[index] || "";
  const img = isImageUrl(current);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.65)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 96vw)",
          maxHeight: "92vh",
          borderRadius: 18,
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid rgba(30,41,59,0.18)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 950 }}>
            {title || "Preview"}{" "}
            <span style={{ color: "#64748b", fontWeight: 900 }}>
              ({index + 1}/{urls.length})
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={current}
              target="_blank"
              rel="noreferrer"
              style={{ ...miniBtn, textDecoration: "none" }}
            >
              Open
            </a>

            <a
              href={current}
              download
              style={{ ...miniBtn, textDecoration: "none" }}
            >
              Download
            </a>

            <button
              type="button"
              style={miniBtn}
              onClick={onPrev}
              disabled={urls.length <= 1}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              style={miniBtn}
              onClick={onNext}
              disabled={urls.length <= 1}
            >
              Next ▶
            </button>

            <button type="button" style={miniBtnDanger} onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            overflow: "auto",
            background: "rgba(248,250,252,1)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {img ? (
            <img
              src={current}
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: "76vh",
                borderRadius: 14,
                border: "1px solid rgba(30,41,59,0.18)",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.10)",
              }}
            />
          ) : (
            <div style={{ padding: 18, fontWeight: 900, color: "#475569" }}>
              This file is not an image preview. Use <b>Open</b> to view it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LicensesContractsView() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  // ✅ Branch filter
  const [branchFilter, setBranchFilter] = useState("ALL");

  // ✅ Preview modal state
  const [preview, setPreview] = useState({
    open: false,
    title: "",
    urls: [],
    index: 0,
  });

  // ✅ Details collapse (default: collapsed)
  const [detailsOpen, setDetailsOpen] = useState(false);

  const firstLoad = useRef(true);

  function openPreview(title, urls, startIndex = 0) {
    const list = safeArr(urls).filter(Boolean);
    if (list.length === 0) return;
    setPreview({
      open: true,
      title: title || "Preview",
      urls: list,
      index: Math.max(0, Math.min(startIndex, list.length - 1)),
    });
  }
  function closePreview() {
    setPreview((p) => ({ ...p, open: false }));
  }
  function prevPreview() {
    setPreview((p) => {
      const n = p.urls.length || 1;
      return { ...p, index: (p.index - 1 + n) % n };
    });
  }
  function nextPreview() {
    setPreview((p) => {
      const n = p.urls.length || 1;
      return { ...p, index: (p.index + 1) % n };
    });
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      let arr = Array.isArray(json)
        ? json
        : json?.data || json?.items || json?.rows || [];

      arr = safeArr(arr)
        .filter((r) => !isNaN(parseDateAny(r)))
        .sort((a, b) => parseDateAny(b) - parseDateAny(a));

      setReports(arr);

      if (firstLoad.current) {
        setSelected(arr[0] || null);
        firstLoad.current = false;
      } else {
        const sid = getId(selected);
        const still = sid && arr.find((x) => getId(x) === sid);
        if (!still) setSelected(arr[0] || null);
      }
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(r) {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(r);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Report deleted.");
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete report.");
    }
  }

  // ✅ filter by search + branch + expiring
  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();

    return reports.filter((r) => {
      const p = r?.payload || {};
      const lic = p.license || {};
      const cons = safeArr(p.contracts);

      const br = String(p.branch || "").trim();
      const matchBranch = branchFilter === "ALL" ? true : br === branchFilter;

      const text = [
        p.branch,
        lic.name,
        lic.notes,
        ...cons.map((c) => c.contractType),
        ...cons.map((c) => c.companyName),
        ...cons.map((c) => c.notes),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchText = !needle || text.includes(needle);

      if (!onlyExpiring) return matchBranch && matchText;

      const licDays = daysUntil(lic.expiryDate);
      const licHit = licDays !== null && licDays <= 30;

      const conHit = cons.some((c) => {
        const d = daysUntil(c.expiryDate);
        return d !== null && d <= 30;
      });

      return matchBranch && matchText && (licHit || conHit);
    });
  }, [reports, q, onlyExpiring, branchFilter]);

  // ✅ group by branch (no dates shown)
  const groupedByBranch = useMemo(() => {
    const acc = {};
    for (const r of filtered) {
      const p = r?.payload || {};
      const br = String(p.branch || "").trim() || "Unspecified Branch";
      acc[br] ||= [];
      acc[br].push(r);
    }
    for (const br of Object.keys(acc)) {
      acc[br].sort((a, b) => parseDateAny(b) - parseDateAny(a));
    }
    return acc;
  }, [filtered]);

  const payload = selected?.payload || {};
  const license = payload?.license || {};
  const contracts = safeArr(payload?.contracts);
  const selectedBranch = String(payload?.branch || "").trim() || "—";

  const licenseFiles = useMemo(() => normalizeFiles(license), [license]);
  const licenseImages = useMemo(
    () => licenseFiles.filter((u) => isImageUrl(u)),
    [licenseFiles]
  );

  // Sidebar summary
  function sidebarBadges(r) {
    const p = r?.payload || {};
    const lic = p.license || {};
    const cons = safeArr(p.contracts);

    const licUrls = normalizeFiles(lic);
    const hasLic =
      String(lic.name || "").trim() ||
      String(lic.expiryDate || "").trim() ||
      licUrls.length > 0;

    let worst = null;
    const pickWorst = (b) => {
      const rank =
        b.text.startsWith("Expired")
          ? 0
          : b.text.startsWith("Expiring")
          ? 1
          : b.text.startsWith("Valid")
          ? 2
          : 3;
      if (!worst || rank < worst.rank) worst = { ...b, rank };
    };

    if (hasLic) pickWorst(expiryBadge(lic.expiryDate));
    for (const c of cons) pickWorst(expiryBadge(c.expiryDate));

    const countContracts = cons.filter((c) =>
      Object.values(c || {}).some((v) => String(v || "").trim() !== "")
    ).length;

    return { worst, countContracts, hasLic };
  }

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
        <PreviewModal
          open={preview.open}
          title={preview.title}
          urls={preview.urls}
          index={preview.index}
          onClose={closePreview}
          onPrev={prevPreview}
          onNext={nextPreview}
        />

        {/* Top bar */}
        <div style={topBarStyle}>
          <div style={brandLeftStyle}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={logoStyle} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 950, lineHeight: 1.2 }}>
                TRANS EMIRATES LIVESTOCK TRADING L.L.C.
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  opacity: 0.75,
                  marginTop: 4,
                }}
              >
                AL MAWASHI — Licenses & Contracts (View)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnGhost}
              onClick={() => navigate("/haccp-iso")}
            >
              ← Hub
            </button>
            <button
              type="button"
              style={btn("#6366f1")}
              onClick={() => navigate("/haccp-iso/licenses-contracts")}
            >
              + New Entry
            </button>
            <button
              type="button"
              style={btn("#10b981")}
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 260px 240px",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabel}>Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={inputStyle}
                placeholder="Search by branch, license, contract type, company..."
              />
            </div>

            <div>
              <div style={fieldLabel}>Branch</div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All Branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#64748b",
                }}
              >
                Showing: {filtered.length}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  fontWeight: 900,
                  color: "#0b1f4d",
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyExpiring}
                  onChange={(e) => setOnlyExpiring(e.target.checked)}
                />
                Expiring/Expired ≤ 30 days
              </label>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr", // ✅ أوسع للتفاصيل
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* Sidebar */}
          <div style={{ ...cardStyle, height: "fit-content" }}>
            <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 10 }}>
              Branches
            </div>

            {loading ? (
              <div style={{ fontWeight: 900, color: "#64748b" }}>Loading...</div>
            ) : Object.keys(groupedByBranch).length === 0 ? (
              <div style={{ fontWeight: 900, color: "#64748b" }}>No reports</div>
            ) : (
              Object.keys(groupedByBranch)
                .sort((a, b) => a.localeCompare(b))
                .map((br) => (
                  <details key={br} open style={{ marginBottom: 10 }}>
                    <summary style={{ fontWeight: 950, cursor: "pointer" }}>
                      {br}{" "}
                      <span style={{ color: "#64748b", fontWeight: 900 }}>
                        ({groupedByBranch[br].length})
                      </span>
                    </summary>

                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {groupedByBranch[br].map((r, i) => {
                        const active = getId(selected) && getId(selected) === getId(r);
                        const meta = sidebarBadges(r);

                        return (
                          <button
                            key={`${getId(r) || i}-${i}`}
                            type="button"
                            onClick={() => {
                              setSelected(r);
                              setDetailsOpen(false); // ✅ كل ما تختار سجل: التفاصيل ترجع مطوية
                            }}
                            style={{
                              textAlign: "left",
                              borderRadius: 14,
                              padding: 10,
                              cursor: "pointer",
                              border: active
                                ? "1px solid rgba(99,102,241,0.50)"
                                : "1px solid rgba(30,41,59,0.26)",
                              background: active
                                ? "rgba(99,102,241,0.08)"
                                : "rgba(255,255,255,0.9)",
                            }}
                            title="Open record"
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <div style={{ fontWeight: 950, color: "#0b1f4d" }}>
                                Record #{i + 1} • ID {shortId(r)}
                              </div>
                              {meta?.worst ? (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 900,
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    background: meta.worst.bg,
                                    border: `1px solid ${meta.worst.bd}`,
                                    color: meta.worst.color,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {meta.worst.text.replace("Valid", "OK")}
                                </span>
                              ) : null}
                            </div>

                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                fontWeight: 900,
                                color: "#64748b",
                              }}
                            >
                              {meta.hasLic ? "License" : "No License"} • Contracts:{" "}
                              {meta.countContracts}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ))
            )}
          </div>

          {/* Details */}
          <div style={{ ...cardStyle, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Report Details
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#64748b",
                  }}
                >
                  Branch: <span style={{ color: "#0b1f4d" }}>{selectedBranch}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* ✅ Toggle details */}
                <button
                  type="button"
                  style={miniBtn}
                  onClick={() => setDetailsOpen((v) => !v)}
                  disabled={!selected}
                  title="Show/Hide report details"
                >
                  {detailsOpen ? "▲ Hide Details" : "▼ Show Details"}
                </button>

                {selected ? (
                  <button
                    type="button"
                    style={btn("#ef4444")}
                    onClick={() => handleDelete(selected)}
                  >
                    Delete Report
                  </button>
                ) : null}
              </div>
            </div>

            {!selected ? (
              <div style={{ marginTop: 14, fontWeight: 900, color: "#64748b" }}>
                Select a record from the left.
              </div>
            ) : !detailsOpen ? (
              /* ✅ مطوي افتراضياً */
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px dashed rgba(30,41,59,0.30)",
                  background: "rgba(248,250,252,0.9)",
                  fontWeight: 900,
                  color: "#475569",
                }}
              >
                Details are collapsed. Click <b>Show Details</b> to open the report.
              </div>
            ) : (
              <>
                {/* License */}
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid rgba(30,41,59,0.26)",
                    background: "rgba(255,255,255,0.95)",
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
                    <div style={{ fontSize: 14, fontWeight: 950 }}>
                      Company License
                    </div>
                    <Badge expiryDate={license?.expiryDate} />
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "1fr 220px 220px",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={fieldLabel}>Name</div>
                      <div style={{ fontWeight: 900, color: "#0b1f4d" }}>
                        {license?.name || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={fieldLabel}>Expiry</div>
                      <div style={{ fontWeight: 900, color: "#0b1f4d" }}>
                        {license?.expiryDate || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={fieldLabel}>Files</div>

                      {licenseFiles.length === 0 ? (
                        <div style={{ fontWeight: 900, color: "#64748b" }}>—</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div
                            style={{
                              fontWeight: 950,
                              color: "#0b1f4d",
                              fontSize: 12,
                            }}
                          >
                            {licenseImages.length > 0
                              ? `Images: ${licenseImages.length}`
                              : `Files: ${licenseFiles.length}`}
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {licenseImages.length > 0 ? (
                              <button
                                type="button"
                                style={miniBtn}
                                onClick={() =>
                                  openPreview("License Images", licenseImages, 0)
                                }
                              >
                                Preview
                              </button>
                            ) : null}

                            <a
                              href={licenseFiles[0]}
                              target="_blank"
                              rel="noreferrer"
                              style={{ ...miniBtn, textDecoration: "none" }}
                            >
                              Open
                            </a>

                            <a
                              href={licenseFiles[0]}
                              download
                              style={{ ...miniBtn, textDecoration: "none" }}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thumbnails */}
                  {licenseImages.length > 0 ? (
                    <div style={thumbWrap}>
                      {licenseImages.slice(0, 8).map((u, idx) => (
                        <button
                          key={u}
                          type="button"
                          style={thumbBtn}
                          title={`Open image #${idx + 1}`}
                          onClick={() => openPreview("License Images", licenseImages, idx)}
                        >
                          <img src={u} alt={`thumb-${idx + 1}`} style={thumbImg} />
                        </button>
                      ))}
                      {licenseImages.length > 8 ? (
                        <button
                          type="button"
                          style={{
                            ...thumbBtn,
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 950,
                            color: "#0b1f4d",
                            background: "rgba(99,102,241,0.08)",
                          }}
                          onClick={() => openPreview("License Images", licenseImages, 0)}
                          title="Open all images"
                        >
                          +{licenseImages.length - 8}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {license?.notes ? (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#334155",
                      }}
                    >
                      Notes: <span style={{ fontWeight: 800 }}>{license.notes}</span>
                    </div>
                  ) : null}
                </div>

                {/* Contracts */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 10 }}>
                    Contracts ({contracts.length})
                  </div>

                  {contracts.length === 0 ? (
                    <div style={{ fontWeight: 900, color: "#64748b" }}>
                      No contracts
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "separate",
                          borderSpacing: 0,
                        }}
                      >
                        <thead>
                          <tr>
                            {["Type", "Company", "Expiry", "Status", "Files", "Notes"].map(
                              (h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: "left",
                                    padding: "10px 10px",
                                    fontSize: 12,
                                    fontWeight: 950,
                                    color: "#0b1f4d",
                                    borderBottom: "1px solid rgba(30,41,59,0.22)",
                                    background: "rgba(99,102,241,0.08)",
                                  }}
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.map((c, i) => {
                            const cFiles = normalizeFiles(c);
                            const cImages = cFiles.filter((u) => isImageUrl(u));
                            const hasAny = cFiles.length > 0;

                            return (
                              <tr key={i}>
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                    fontWeight: 900,
                                  }}
                                >
                                  {c.contractType || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                    fontWeight: 900,
                                  }}
                                >
                                  {c.companyName || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                    fontWeight: 900,
                                  }}
                                >
                                  {c.expiryDate || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                  }}
                                >
                                  <Badge expiryDate={c.expiryDate} />
                                </td>

                                {/* Files */}
                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                  }}
                                >
                                  {!hasAny ? (
                                    <span style={{ fontWeight: 900, color: "#64748b" }}>
                                      —
                                    </span>
                                  ) : (
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 950,
                                          color: "#0b1f4d",
                                        }}
                                      >
                                        {cImages.length > 0
                                          ? `Images: ${cImages.length}`
                                          : `Files: ${cFiles.length}`}
                                      </div>

                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {cImages.length > 0 ? (
                                          <button
                                            type="button"
                                            style={miniBtn}
                                            onClick={() =>
                                              openPreview(
                                                `${c.contractType || "Contract"} Images`,
                                                cImages,
                                                0
                                              )
                                            }
                                          >
                                            Preview
                                          </button>
                                        ) : null}

                                        <a
                                          href={cFiles[0]}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ ...miniBtn, textDecoration: "none" }}
                                        >
                                          Open
                                        </a>

                                        <a
                                          href={cFiles[0]}
                                          download
                                          style={{ ...miniBtn, textDecoration: "none" }}
                                        >
                                          Download
                                        </a>
                                      </div>

                                      {/* optional: list all files */}
                                      {cFiles.length > 1 ? (
                                        <div style={{ display: "grid", gap: 6 }}>
                                          {cFiles.slice(0, 4).map((u, idx) => (
                                            <div
                                              key={u}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 8,
                                                fontSize: 12,
                                                fontWeight: 900,
                                                color: "#334155",
                                              }}
                                            >
                                              <span style={{ opacity: 0.85 }}>
                                                {niceFileLabel(u, idx)}
                                              </span>

                                              <span style={{ display: "flex", gap: 8 }}>
                                                {isImageUrl(u) ? (
                                                  <button
                                                    type="button"
                                                    style={miniBtn}
                                                    onClick={() =>
                                                      openPreview(
                                                        `${c.contractType || "Contract"} Images`,
                                                        cImages,
                                                        Math.max(0, cImages.indexOf(u))
                                                      )
                                                    }
                                                  >
                                                    View
                                                  </button>
                                                ) : (
                                                  <a
                                                    href={u}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ ...miniBtn, textDecoration: "none" }}
                                                  >
                                                    Open
                                                  </a>
                                                )}

                                                <a
                                                  href={u}
                                                  download
                                                  style={{ ...miniBtn, textDecoration: "none" }}
                                                >
                                                  DL
                                                </a>
                                              </span>
                                            </div>
                                          ))}
                                          {cFiles.length > 4 ? (
                                            <div
                                              style={{
                                                fontSize: 12,
                                                fontWeight: 900,
                                                color: "#64748b",
                                              }}
                                            >
                                              + {cFiles.length - 4} more...
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding: 10,
                                    borderBottom: "1px solid rgba(30,41,59,0.16)",
                                    fontWeight: 900,
                                    color: "#334155",
                                  }}
                                >
                                  {c.notes || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 800,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
