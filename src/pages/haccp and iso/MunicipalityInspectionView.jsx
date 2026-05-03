// src/pages/haccp and iso/MunicipalityInspectionView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import HaccpLinkBadge from "./FSMSManual/HaccpLinkBadge";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "municipality_inspection";
const DELETE_PASSWORD = String.fromCharCode(57, 57, 57, 57);

// ── helpers ────────────────────────────────────────────────────────────────
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(opts.headers || {}) }, ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

function safeDateLabel(v) {
  if (!v) return "—";
  if (typeof v === "string") return v;
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  } catch { return String(v); }
}

function normalizeImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((x, idx) => {
      if (!x) return null;
      if (typeof x === "object") {
        const src = x.dataUrl || x.url || x.src || "";
        return src ? { src, name: x.name || `Image ${idx + 1}` } : null;
      }
      if (typeof x === "string" && x) return { src: x, name: `Image ${idx + 1}` };
      return null;
    })
    .filter(Boolean);
}

function normalizePDFs(payload) {
  const p = payload || {};
  const candidates = []
    .concat(Array.isArray(p.pdfs) ? p.pdfs : [])
    .concat(Array.isArray(p.files) ? p.files : [])
    .concat(Array.isArray(p.attachments) ? p.attachments : [])
    .concat(p.pdf ? [p.pdf] : [])
    .concat(p.file ? [p.file] : []);

  const seen = new Set();
  return candidates
    .map((x, idx) => {
      if (!x) return null;
      if (typeof x === "object") {
        const src = x.dataUrl || x.url || x.src || "";
        const mime = (x.mime || x.type || "").toLowerCase();
        if (!src) return null;
        const isPdf = mime === "application/pdf" ||
          src.toLowerCase().startsWith("data:application/pdf") ||
          src.toLowerCase().includes(".pdf");
        if (!isPdf) return null;
        return { src, name: x.name || `PDF ${idx + 1}` };
      }
      if (typeof x === "string") {
        const low = x.toLowerCase();
        if (!low.startsWith("data:application/pdf") && !low.includes(".pdf")) return null;
        return { src: x, name: `PDF ${idx + 1}` };
      }
      return null;
    })
    .filter(Boolean)
    .filter((it) => (seen.has(it.src) ? false : seen.add(it.src)));
}

function normalizeItem(raw) {
  const payload = raw?.payload || raw || {};
  return {
    _raw: raw,
    id: getId(raw),
    createdAt: raw?.createdAt || raw?.created_at || payload?.savedAt || null,
    municipality: payload?.municipality || "",
    branchName: payload?.branchName || payload?.branch || "",
    inspectionDate: payload?.inspectionDate || payload?.date || "",
    inspectionGrade: payload?.inspectionGrade || payload?.grade || payload?.score || "",
    notes: payload?.notes || "",
    images: normalizeImages(payload?.images),
    pdfs: normalizePDFs(payload),
  };
}

function isAbortError(e) {
  return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
}

// ── styles ─────────────────────────────────────────────────────────────────
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 24px",
    background: "linear-gradient(150deg,#eef2ff 0%,#f8fafc 55%,#ecfdf5 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    color: "#0f172a",
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "12px 18px", borderRadius: 16,
    background: "#fff", border: "1.5px solid #e2e8f0",
    boxShadow: "0 2px 14px rgba(0,0,0,0.06)", marginBottom: 16, flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0" },
  card: {
    background: "#fff", border: "1.5px solid #e2e8f0",
    borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", padding: 20,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 15, fontWeight: 600,
    outline: "none", background: "#f8fafc",
  },
};

const btnSolid = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 10,
  padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 15, whiteSpace: "nowrap",
});
const btnGhost = {
  background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0",
  borderRadius: 10, padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontSize: 15,
};
const miniBtn = {
  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
  color: "#4338ca", borderRadius: 8, padding: "7px 14px", fontWeight: 700,
  cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", textDecoration: "none",
  display: "inline-block",
};

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(2,6,23,0.60)",
        zIndex: 9999, display: "grid", placeItems: "center", padding: 16,
      }}
    >
      <div style={{
        width: "min(1100px, 98vw)", maxHeight: "92vh", overflow: "auto",
        background: "#fff", borderRadius: 18,
        boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "14px 18px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10,
          borderBottom: "1.5px solid #e2e8f0",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1.5px solid #e2e8f0", background: "#f8fafc",
              borderRadius: 10, padding: "8px 16px",
              fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}
          >✕ Close</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ── InfoBox (used in details modal) ───────────────────────────────────────
function InfoBox({ label, value }) {
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      border: "1.5px solid #e2e8f0", background: "#f8fafc",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{value || "—"}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function MunicipalityInspectionView() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [municipality, setMunicipality] = useState("ALL");
  const [branch, setBranch] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openItem, setOpenItem] = useState(null);
  const [openImage, setOpenImage] = useState(null);
  const [openPdf, setOpenPdf] = useState(null);

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
      const data = await jsonFetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
        { signal: abortRef.current.signal }
      );
      const arr = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.rows) ? data.rows
        : Array.isArray(data?.data) ? data.data : [];

      const normalized = arr.map(normalizeItem).sort((a, b) => {
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
    return () => { try { abortRef.current?.abort?.(); } catch {} };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDeletePass(""); setDeleteErr(""); setDeleting(false);
    setOpenPdf(null); setOpenImage(null);
  }, [openItem]);

  const branches = useMemo(() => {
    const s = new Set();
    for (const it of items) if (it.branchName) s.add(it.branchName);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const municipalities = useMemo(() => {
    const s = new Set();
    for (const it of items) if (it.municipality) s.add(it.municipality);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (municipality !== "ALL" && it.municipality !== municipality) return false;
      if (branch !== "ALL" && it.branchName !== branch) return false;
      const d = safeDateLabel(it.inspectionDate);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (!qq) return true;
      const hay = [it.municipality, it.branchName, it.inspectionDate, it.inspectionGrade, it.notes]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, municipality, branch, dateFrom, dateTo]);

  async function handleDeleteOpenItem() {
    if (!openItem?.id) return;
    setDeleteErr("");
    if (deletePass !== DELETE_PASSWORD) { setDeleteErr("Wrong password."); return; }
    if (!window.confirm("Delete this report permanently? This cannot be undone.")) return;
    try {
      setDeleting(true);
      try {
        await jsonFetch(`${API_BASE}/api/reports/${encodeURIComponent(openItem.id)}`, { method: "DELETE" });
      } catch {
        await jsonFetch(`${API_BASE}/api/reports?id=${encodeURIComponent(openItem.id)}`, { method: "DELETE" });
      }
      setItems((prev) => prev.filter((x) => x.id !== openItem.id));
      setOpenItem(null);
    } catch (e) {
      console.error(e);
      setDeleteErr(String(e?.message || "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  // grade color
  function gradeStyle(grade) {
    const g = String(grade || "").toUpperCase();
    if (g === "A" || g.includes("EXCEL") || parseInt(g) >= 90)
      return { bg: "#f0fdf4", bd: "#86efac", color: "#166534" };
    if (g === "B" || parseInt(g) >= 75)
      return { bg: "#fffbeb", bd: "#fcd34d", color: "#92400e" };
    if (g === "C" || parseInt(g) >= 60)
      return { bg: "#fff7ed", bd: "#fdba74", color: "#9a3412" };
    return { bg: "#f1f5f9", bd: "#cbd5e1", color: "#334155" };
  }

  return (
    <div style={S.shell}>

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.brand}>
          <img src={mawashiLogo} alt="logo" style={S.logo} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
              TRANS EMIRATES LIVESTOCK TRADING L.L.C.
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              AL MAWASHI — Municipality Inspection Reports
            </div>
            <HaccpLinkBadge clauses={["4.2"]} label="Regulatory Authority (Interested Party)" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{
            fontSize: 14, fontWeight: 700, padding: "8px 14px", borderRadius: 999,
            background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8",
          }}>
            {filtered.length} Reports
          </span>
          <button style={btnGhost} onClick={() => navigate("/haccp-iso")}>← Hub</button>
          <button style={btnSolid("#6366f1")} onClick={() => navigate("/haccp-iso/dm-inspection")}>
            + New Entry
          </button>
          <button style={btnSolid("#10b981")} onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 14, alignItems: "end" }}>
          <div>
            <label style={S.label}>Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Branch / grade / date / notes..."
              style={S.input}
            />
          </div>
          <div>
            <label style={S.label}>Municipality</label>
            <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={S.input}>
              <option value="ALL">All</option>
              {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
              <option value="ALL">All</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={S.input} />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ ...S.card, fontSize: 16, fontWeight: 700, color: "#64748b" }}>Loading reports...</div>
      ) : err ? (
        <div style={{ ...S.card, borderColor: "#fca5a5", background: "#fef2f2" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#991b1b" }}>❌ Loading error</div>
          <div style={{ marginTop: 8, fontSize: 14, color: "#7f1d1d", fontWeight: 700 }}>{err}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, fontSize: 16, fontWeight: 700, color: "#64748b" }}>
          No reports match the current filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map((it) => {
            const gs = gradeStyle(it.inspectionGrade);
            return (
              <button
                key={it.id || `${it.branchName}_${it.createdAt}`}
                type="button"
                onClick={() => setOpenItem(it)}
                style={{
                  textAlign: "left", cursor: "pointer",
                  padding: 18, borderRadius: 16,
                  border: "1.5px solid #e2e8f0", background: "#fff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
                    {it.branchName || "—"}
                  </div>
                  {it.inspectionGrade && (
                    <span style={{
                      fontSize: 14, fontWeight: 800, padding: "5px 12px", borderRadius: 999,
                      background: gs.bg, border: `1px solid ${gs.bd}`, color: gs.color,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {it.inspectionGrade}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: "#475569" }}>
                  🏛️ {it.municipality || "—"}
                </div>
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: "#475569" }}>
                  📅 {safeDateLabel(it.inspectionDate)}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 13, fontWeight: 700, color: "#64748b" }}>
                  <span>🖼️ {it.images?.length || 0} images</span>
                  <span>📄 {it.pdfs?.length || 0} PDFs</span>
                </div>

                {it.notes && (
                  <div style={{
                    marginTop: 10, fontSize: 13, fontWeight: 600, color: "#64748b",
                    lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {it.notes}
                  </div>
                )}

                <div style={{
                  marginTop: 12, fontSize: 12, fontWeight: 800,
                  color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  Open details →
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Details Modal ── */}
      <Modal
        open={!!openItem}
        onClose={() => { setOpenItem(null); setOpenImage(null); setOpenPdf(null); }}
        title={openItem ? `${openItem.branchName || "Branch"} — ${safeDateLabel(openItem.inspectionDate)}` : ""}
      >
        {openItem && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <InfoBox label="Municipality" value={openItem.municipality} />
              <InfoBox label="Branch" value={openItem.branchName} />
              <InfoBox label="Inspection Date" value={safeDateLabel(openItem.inspectionDate)} />
              <InfoBox label="Grade / Score" value={openItem.inspectionGrade} />
            </div>

            {openItem.notes && (
              <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#eff6ff" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Notes</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1e3a5f", lineHeight: 1.6 }}>
                  {openItem.notes}
                </div>
              </div>
            )}

            {/* PDFs */}
            <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                📄 PDFs ({openItem.pdfs?.length || 0})
              </div>
              {openItem.pdfs?.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                  {openItem.pdfs.map((pdf, idx) => (
                    <button
                      key={`${pdf.src}_${idx}`}
                      type="button"
                      onClick={() => setOpenPdf(pdf)}
                      style={{
                        textAlign: "left", border: "1.5px solid #e2e8f0",
                        borderRadius: 12, padding: "12px 14px",
                        background: "#f8fafc", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        display: "grid", placeItems: "center",
                        background: "#fef2f2", border: "1.5px solid #fca5a5",
                        fontWeight: 800, color: "#dc2626", fontSize: 13, flexShrink: 0,
                      }}>PDF</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }} title={pdf.name}>{pdf.name || `PDF ${idx + 1}`}</div>
                        <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 700, marginTop: 2 }}>
                          Click to preview
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>No PDFs attached.</div>
              )}
            </div>

            {/* Images */}
            <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                🖼️ Images ({openItem.images?.length || 0})
              </div>
              {openItem.images?.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                  {openItem.images.map((img, idx) => (
                    <button
                      key={`${img.src}_${idx}`}
                      type="button"
                      onClick={() => setOpenImage(img)}
                      style={{
                        border: "1.5px solid #e2e8f0", borderRadius: 14,
                        overflow: "hidden", padding: 0, background: "#fff",
                        cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      <img
                        src={img.src} alt={`img-${idx + 1}`}
                        style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                      />
                      <div style={{
                        padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#475569",
                        display: "flex", justifyContent: "space-between",
                      }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {img.name || `Image ${idx + 1}`}
                        </span>
                        <span style={{ color: "#6366f1" }}>↗</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>No images attached.</div>
              )}
            </div>

            {/* Delete */}
            <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid #fca5a5", background: "#fef2f2" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#991b1b" }}>Delete Report</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#b91c1c", marginTop: 3 }}>
                    Enter password then click Delete — this cannot be undone.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteOpenItem}
                  disabled={deleting || deletePass !== DELETE_PASSWORD}
                  style={{
                    background: deletePass === DELETE_PASSWORD && !deleting ? "#dc2626" : "#fca5a5",
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "11px 20px", fontWeight: 700, fontSize: 15,
                    cursor: deletePass === DELETE_PASSWORD ? "pointer" : "not-allowed",
                  }}
                >
                  {deleting ? "Deleting..." : "Delete Report"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={deletePass}
                  onChange={(e) => setDeletePass(e.target.value)}
                  placeholder="Enter password"
                  type="password"
                  style={{
                    width: 240, boxSizing: "border-box",
                    border: "1.5px solid #fca5a5", borderRadius: 10,
                    padding: "10px 14px", fontSize: 15, fontWeight: 600,
                    outline: "none", background: "#fff",
                  }}
                />
                {deleteErr && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>
                    ❌ {deleteErr}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Image full-view Modal ── */}
      <Modal open={!!openImage} onClose={() => setOpenImage(null)} title={openImage?.name || "Image"}>
        {openImage && (
          <div style={{ display: "grid", gap: 12 }}>
            <a href={openImage.src} target="_blank" rel="noreferrer" style={{ ...miniBtn, width: "fit-content" }}>
              Open in new tab ↗
            </a>
            <img
              src={openImage.src} alt="full"
              style={{ width: "100%", height: "auto", borderRadius: 14, border: "1.5px solid #e2e8f0" }}
            />
          </div>
        )}
      </Modal>

      {/* ── PDF viewer Modal ── */}
      <Modal open={!!openPdf} onClose={() => setOpenPdf(null)} title={openPdf?.name || "PDF"}>
        {openPdf && (
          <div style={{ display: "grid", gap: 12 }}>
            <a href={openPdf.src} target="_blank" rel="noreferrer" style={{ ...miniBtn, width: "fit-content" }}>
              Open in new tab ↗
            </a>
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <iframe
                title="pdf_preview"
                src={openPdf.src}
                style={{ width: "100%", height: "78vh", border: "none", display: "block" }}
              />
            </div>
          </div>
        )}
      </Modal>

      <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
        © Al Mawashi — Quality & Food Safety System
      </div>
    </div>
  );
}
