// src/pages/haccp and iso/MunicipalityInspectionView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import mawashiLogo from "../../assets/almawashi-logo.jpg";

/* ===== API base (same style as your project) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* Report type (must match input) */
const TYPE = "municipality_inspection";

/* ===== Helpers ===== */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : "") ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

function safeDateLabel(v) {
  if (!v) return "-";
  if (typeof v === "string") return v;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

/**
 * Supports:
 * 1) Base64 objects: { name, mime, dataUrl }
 * 2) old urls: "https://..." or data URLs
 * Returns unified array: [{ src, name }]
 */
function normalizeImages(images) {
  const arr = Array.isArray(images) ? images : [];
  return arr
    .map((x, idx) => {
      if (!x) return null;

      // Base64 object
      if (typeof x === "object") {
        const src = x.dataUrl || x.url || x.src || "";
        const name = x.name || `Image ${idx + 1}`;
        if (!src) return null;
        return { src, name };
      }

      // string URL/dataURL
      if (typeof x === "string") {
        const src = x;
        const name = `Image ${idx + 1}`;
        return { src, name };
      }

      return null;
    })
    .filter(Boolean);
}

/**
 * Normalize PDFs from payload.
 * Supports common keys:
 * - payload.pdfs
 * - payload.files
 * - payload.attachments
 * - payload.documents
 * Also supports string URL or object {name,mime,dataUrl/url/src}
 *
 * Returns: [{ src, name }]
 */
function normalizePDFs(payload) {
  const p = payload || {};

  const candidates = []
    .concat(Array.isArray(p.pdfs) ? p.pdfs : [])
    .concat(Array.isArray(p.files) ? p.files : [])
    .concat(Array.isArray(p.attachments) ? p.attachments : [])
    .concat(Array.isArray(p.documents) ? p.documents : [])
    .concat(p.pdf ? [p.pdf] : [])
    .concat(p.file ? [p.file] : [])
    .concat(p.attachment ? [p.attachment] : []);

  const norm = candidates
    .map((x, idx) => {
      if (!x) return null;

      if (typeof x === "object") {
        const src = x.dataUrl || x.url || x.src || "";
        const mime = (x.mime || x.type || "").toLowerCase();
        const name = x.name || `PDF ${idx + 1}`;

        if (!src) return null;

        const isPdfByMime = mime === "application/pdf";
        const isPdfByDataUrl =
          typeof src === "string" &&
          src.toLowerCase().startsWith("data:application/pdf");

        // allow url without mime if it ends with .pdf
        const isPdfByExt =
          typeof src === "string" && src.toLowerCase().includes(".pdf");

        if (isPdfByMime || isPdfByDataUrl || isPdfByExt) return { src, name };
        return null;
      }

      if (typeof x === "string") {
        const src = x;
        const low = src.toLowerCase();
        const isPdf =
          low.startsWith("data:application/pdf") || low.includes(".pdf");
        if (!isPdf) return null;
        return { src, name: `PDF ${idx + 1}` };
      }

      return null;
    })
    .filter(Boolean);

  // remove duplicates by src
  const seen = new Set();
  return norm.filter((it) => {
    if (seen.has(it.src)) return false;
    seen.add(it.src);
    return true;
  });
}

function normalizeReportItem(raw) {
  const payload = raw?.payload || raw || {};
  const imgs = normalizeImages(payload?.images);
  const pdfs = normalizePDFs(payload);

  return {
    _raw: raw,
    id: getId(raw),
    createdAt:
      raw?.createdAt ||
      raw?.created_at ||
      raw?.created ||
      payload?.savedAt ||
      payload?.createdAt ||
      null,
    municipality: payload?.municipality || "",
    branchName: payload?.branchName || payload?.branch || "",
    inspectionDate: payload?.inspectionDate || payload?.date || "",
    inspectionGrade:
      payload?.inspectionGrade || payload?.grade || payload?.score || "",
    notes: payload?.notes || "",
    images: imgs, // [{src, name}]
    pdfs: pdfs, // [{src, name}]
  };
}

/* Ignore Abort errors (prevents "signal is aborted without reason" UI) */
function isAbortError(e) {
  const name = e?.name || "";
  const msg = String(e?.message || "").toLowerCase();
  return (
    name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("signal is aborted")
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 18,
          border: "1px solid rgba(15,23,42,0.18)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderBottom: "1px solid rgba(15,23,42,0.10)",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14, color: "#0b1f4d" }}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(15,23,42,0.16)",
              background: "rgba(15,23,42,0.04)",
              borderRadius: 12,
              padding: "8px 10px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function MunicipalityInspectionView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [municipality, setMunicipality] = useState("ALL");
  const [branch, setBranch] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openItem, setOpenItem] = useState(null);
  const [openImage, setOpenImage] = useState(null); // {src, name} | null
  const [openPdf, setOpenPdf] = useState(null); // {src, name} | null

  // ✅ Delete (password protected) — stored without showing it in UI text
  const DELETE_PASSWORD = String.fromCharCode(57, 57, 57, 57);
  const [deletePass, setDeletePass] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const abortRef = useRef(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const url = `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`;
      const data = await jsonFetch(url, { signal: abortRef.current.signal });

      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const normalized = arr
        .map(normalizeReportItem)
        .sort((a, b) => {
          const ta = new Date(a.inspectionDate || a.createdAt || 0).getTime();
          const tb = new Date(b.inspectionDate || b.createdAt || 0).getTime();
          return tb - ta;
        });

      setItems(normalized);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDeletePass("");
    setDeleteErr("");
    setDeleting(false);
    setOpenPdf(null);
    setOpenImage(null);
  }, [openItem]);

  const branches = useMemo(() => {
    const set = new Set();
    for (const it of items) if (it.branchName) set.add(it.branchName);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const municipalities = useMemo(() => {
    const set = new Set();
    for (const it of items) if (it.municipality) set.add(it.municipality);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((it) => {
      if (municipality !== "ALL" && (it.municipality || "") !== municipality)
        return false;
      if (branch !== "ALL" && (it.branchName || "") !== branch) return false;

      const d = safeDateLabel(it.inspectionDate);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;

      if (!qq) return true;

      const hay = [
        it.municipality,
        it.branchName,
        it.inspectionDate,
        it.inspectionGrade,
        it.notes,
      ]
        .filter(Boolean)
        .join(" | ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [items, q, municipality, branch, dateFrom, dateTo]);

  const styles = useMemo(() => {
    const card = {
      background: "rgba(255,255,255,0.92)",
      border: "1px solid rgba(30, 41, 59, 0.18)",
      borderRadius: 16,
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    };

    const input = {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid rgba(99,102,241,0.35)",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 13,
      outline: "none",
      background: "#fff",
    };

    const btn = (bg) => ({
      background: bg,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
      whiteSpace: "nowrap",
    });

    const badge = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      background: "rgba(99,102,241,0.10)",
      border: "1px solid rgba(99,102,241,0.32)",
      color: "#0b1f4d",
    };

    return { card, input, btn, badge };
  }, []);

  async function deleteReportById(reportId) {
    const id = String(reportId || "").trim();
    if (!id) throw new Error("Missing report id");

    try {
      await jsonFetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return true;
    } catch (e1) {
      await jsonFetch(`${API_BASE}/api/reports?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return true;
    }
  }

  async function handleDeleteOpenItem() {
    if (!openItem?.id) return;

    setDeleteErr("");

    if (deletePass !== DELETE_PASSWORD) {
      setDeleteErr("Wrong password.");
      return;
    }

    const ok = window.confirm(
      "Are you sure you want to delete this report?\nThis action cannot be undone."
    );
    if (!ok) return;

    try {
      setDeleting(true);

      await deleteReportById(openItem.id);

      setItems((prev) => prev.filter((x) => x.id !== openItem.id));

      setOpenPdf(null);
      setOpenImage(null);
      setOpenItem(null);
    } catch (e) {
      console.error(e);
      setDeleteErr(String(e?.message || e || "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 18,
        background:
          "radial-gradient(circle at 12% 6%, rgba(99,102,241,0.12) 0, rgba(249,250,251,1) 40%, rgba(255,255,255,1) 100%)," +
          "radial-gradient(circle at 88% 18%, rgba(16,185,129,0.10) 0, rgba(255,255,255,0) 52%)",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#0b1f4d",
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            ...styles.card,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img
              src={mawashiLogo}
              alt="Al Mawashi Logo"
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                objectFit: "cover",
                border: "1px solid rgba(15, 23, 42, 0.14)",
                background: "#fff",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>
                TRANS EMIRATES LIVESTOCK TRADING L.L.C.
              </div>
              <div style={{ fontWeight: 800, opacity: 0.75, fontSize: 12 }}>
                Municipality Inspection — View
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={styles.badge}>Reports: {filtered.length}</div>
            <button type="button" onClick={load} style={styles.btn("#4f46e5")}>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...styles.card, marginTop: 12, padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Search
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type branch / grade / date ..."
                style={styles.input}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Municipality
              </div>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                style={styles.input}
              >
                <option value="ALL">All</option>
                {municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Branch
              </div>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={styles.input}
              >
                <option value="ALL">All</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Date From
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={styles.input}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Date To
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div
              style={{
                ...styles.card,
                padding: 16,
                fontWeight: 900,
                opacity: 0.85,
              }}
            >
              Loading reports...
            </div>
          ) : err ? (
            <div
              style={{
                ...styles.card,
                padding: 16,
                borderColor: "rgba(239,68,68,0.35)",
                background: "rgba(239,68,68,0.06)",
              }}
            >
              <div style={{ fontWeight: 950, color: "#991b1b" }}>
                ❌ Loading error
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 800,
                  color: "#7f1d1d",
                }}
              >
                {err}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  opacity: 0.85,
                }}
              >
                Note: This page expects the server to support{" "}
                <b>/api/reports?type=municipality_inspection</b>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                ...styles.card,
                padding: 16,
                fontWeight: 900,
                opacity: 0.85,
              }}
            >
              No results for the current filters.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {filtered.map((it) => {
                const dateLabel = safeDateLabel(it.inspectionDate);
                const imgCount = it.images?.length || 0;
                const pdfCount = it.pdfs?.length || 0;

                return (
                  <button
                    key={it.id || `${it.branchName}_${it.createdAt}`}
                    type="button"
                    onClick={() => setOpenItem(it)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(30, 41, 59, 0.18)",
                      background: "rgba(255,255,255,0.93)",
                      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
                      transition: "transform .16s ease, box-shadow .16s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 16px 36px rgba(15, 23, 42, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 26px rgba(15, 23, 42, 0.08)";
                    }}
                    title="Open details"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 950,
                          fontSize: 14,
                          color: "#0b1f4d",
                        }}
                      >
                        {it.branchName || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 950,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "rgba(16,185,129,0.10)",
                          border: "1px solid rgba(16,185,129,0.25)",
                          color: "#065f46",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.inspectionGrade || "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#374151",
                      }}
                    >
                      🏛️ {it.municipality || "—"}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#374151",
                      }}
                    >
                      📅 {dateLabel}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#6b7280",
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>🖼️ Images: {imgCount}</span>
                      <span>📄 PDFs: {pdfCount}</span>
                    </div>

                    {it.notes ? (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#4b5563",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {it.notes}
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        fontWeight: 950,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.10em",
                      }}
                    >
                      Open details
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Details Modal */}
        <Modal
          open={!!openItem}
          onClose={() => {
            setOpenItem(null);
            setOpenImage(null);
            setOpenPdf(null);
          }}
          title={
            openItem
              ? `${openItem.branchName || "Branch"} — ${safeDateLabel(
                  openItem.inspectionDate
                )}`
              : ""
          }
        >
          {openItem ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(15,23,42,0.03)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.75 }}>
                    Municipality
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>
                    {openItem.municipality || "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(15,23,42,0.03)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.75 }}>
                    Branch
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>
                    {openItem.branchName || "—"}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(15,23,42,0.03)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.75 }}>
                    Inspection Date
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>
                    {safeDateLabel(openItem.inspectionDate)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(15,23,42,0.03)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.75 }}>
                    Inspection Grade
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>
                    {openItem.inspectionGrade || "—"}
                  </div>
                </div>
              </div>

              {openItem.notes ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(99,102,241,0.05)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 6 }}>
                    Notes
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      lineHeight: 1.6,
                    }}
                  >
                    {openItem.notes}
                  </div>
                </div>
              ) : null}

              {/* ✅ PDFs Section */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>
                  Inspection PDFs ({openItem.pdfs?.length || 0})
                </div>

                {openItem.pdfs?.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {openItem.pdfs.map((pdf, idx) => (
                      <button
                        key={`${pdf.src}_${idx}`}
                        type="button"
                        onClick={() => setOpenPdf(pdf)}
                        style={{
                          textAlign: "left",
                          border: "1px solid rgba(15,23,42,0.14)",
                          borderRadius: 14,
                          overflow: "hidden",
                          padding: 12,
                          background: "rgba(15,23,42,0.03)",
                          cursor: "pointer",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                          display: "grid",
                          gap: 8,
                        }}
                        title="Open PDF"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              display: "grid",
                              placeItems: "center",
                              background: "rgba(220,38,38,0.10)",
                              border: "1px solid rgba(220,38,38,0.25)",
                              fontWeight: 950,
                              color: "#991b1b",
                            }}
                          >
                            PDF
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 950,
                                color: "#0b1f4d",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={pdf.name}
                            >
                              {pdf.name || `PDF ${idx + 1}`}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280" }}>
                              Click to preview
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280" }}>
                    No PDFs.
                  </div>
                )}
              </div>

              {/* ✅ Delete Section (Protected) */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(239,68,68,0.30)",
                  background: "rgba(239,68,68,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 950, color: "#991b1b" }}>
                      Delete Report (Protected)
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#7f1d1d",
                        opacity: 0.9,
                      }}
                    >
                      Enter password to enable delete.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDeleteOpenItem}
                    disabled={deleting || deletePass !== DELETE_PASSWORD}
                    style={{
                      background:
                        deleting || deletePass !== DELETE_PASSWORD
                          ? "rgba(239,68,68,0.35)"
                          : "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontWeight: 950,
                      cursor:
                        deleting || deletePass !== DELETE_PASSWORD
                          ? "not-allowed"
                          : "pointer",
                      boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
                      whiteSpace: "nowrap",
                    }}
                    title={
                      deletePass !== DELETE_PASSWORD
                        ? "Enter the correct password to delete"
                        : "Delete this report"
                    }
                  >
                    {deleting ? "Deleting..." : "Delete Report"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 320px) 1fr",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    value={deletePass}
                    onChange={(e) => setDeletePass(e.target.value)}
                    placeholder="Enter password"
                    type="password"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid rgba(239,68,68,0.35)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontSize: 13,
                      outline: "none",
                      background: "#fff",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                    }}
                  />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#7f1d1d" }}>
                    {deleteErr ? `❌ ${deleteErr}` : " "}
                  </div>
                </div>
              </div>

              {/* Images Section */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>
                  Inspection Images ({openItem.images?.length || 0})
                </div>

                {openItem.images?.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(170px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {openItem.images.map((img, idx) => (
                      <button
                        key={`${img.src}_${idx}`}
                        type="button"
                        onClick={() => setOpenImage(img)}
                        style={{
                          border: "1px solid rgba(15,23,42,0.14)",
                          borderRadius: 14,
                          overflow: "hidden",
                          padding: 0,
                          background: "#fff",
                          cursor: "pointer",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                        title="Open image"
                      >
                        <img
                          src={img.src}
                          alt={`inspection_${idx + 1}`}
                          style={{
                            width: "100%",
                            height: 130,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <div
                          style={{
                            padding: 10,
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#4b5563",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>{img.name || `Image ${idx + 1}`}</span>
                          <span style={{ opacity: 0.7 }}>↗</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280" }}>
                    No images.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Single Image Modal */}
        <Modal
          open={!!openImage}
          onClose={() => setOpenImage(null)}
          title={openImage?.name || "Inspection Image"}
        >
          {openImage ? (
            <div style={{ display: "grid", gap: 10 }}>
              <a
                href={openImage.src}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  color: "#1d4ed8",
                  textDecoration: "none",
                }}
              >
                Open in new tab
              </a>
              <img
                src={openImage.src}
                alt="inspection_full"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 16,
                  border: "1px solid rgba(15,23,42,0.14)",
                }}
              />
            </div>
          ) : null}
        </Modal>

        {/* Single PDF Modal */}
        <Modal
          open={!!openPdf}
          onClose={() => setOpenPdf(null)}
          title={openPdf?.name || "PDF"}
        >
          {openPdf ? (
            <div style={{ display: "grid", gap: 10 }}>
              <a
                href={openPdf.src}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  color: "#1d4ed8",
                  textDecoration: "none",
                }}
              >
                Open in new tab
              </a>

              <div
                style={{
                  border: "1px solid rgba(15,23,42,0.14)",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <iframe
                  title="pdf_preview"
                  src={openPdf.src}
                  style={{
                    width: "100%",
                    height: "78vh",
                    border: "none",
                    display: "block",
                  }}
                />
              </div>
            </div>
          ) : null}
        </Modal>

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </div>
  );
}
