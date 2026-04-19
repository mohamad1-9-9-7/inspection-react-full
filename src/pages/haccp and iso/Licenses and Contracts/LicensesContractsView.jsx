// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "licenses_contracts";

const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

// ── helpers ────────────────────────────────────────────────────────────────
function safeArr(x) { return Array.isArray(x) ? x : []; }

function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}

function parseDateAny(r) {
  return (
    (r?.created_at && new Date(r.created_at)) ||
    (r?.createdAt && new Date(r.createdAt)) ||
    (r?.payload?.savedAt && new Date(r.payload.savedAt)) ||
    new Date(NaN)
  );
}

function daysUntil(ymdStr) {
  const s = String(ymdStr || "").trim();
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function expiryBadge(expiryDate) {
  const n = daysUntil(expiryDate);
  if (n === null) return { text: "No Expiry", bg: "#f1f5f9", bd: "#cbd5e1", color: "#475569" };
  if (n < 0)     return { text: `Expired (${Math.abs(n)}d ago)`, bg: "#fef2f2", bd: "#fca5a5", color: "#991b1b" };
  if (n <= 30)   return { text: `Expiring in ${n}d`, bg: "#fffbeb", bd: "#fcd34d", color: "#92400e" };
  return { text: `Valid (${n}d)`, bg: "#f0fdf4", bd: "#86efac", color: "#166534" };
}

function shortId(r) {
  const id = String(getId(r) || "").trim();
  return id.length > 8 ? "…" + id.slice(-8) : id || "—";
}

function toUrlArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean).map(String);
  if (typeof x === "string" && x) return [x];
  return [];
}

function normalizeFiles(obj) {
  const o = obj || {};
  const seen = new Set();
  return [
    ...toUrlArray(o.fileUrls), ...toUrlArray(o.fileUrl),
    ...toUrlArray(o.files), ...toUrlArray(o.images),
    ...toUrlArray(o.imageUrls), ...toUrlArray(o.attachments),
  ]
    .map((u) => String(u).trim())
    .filter((u) => u && (seen.has(u) ? false : seen.add(u)));
}

function isImageUrl(url) {
  const u = String(url || "").toLowerCase();
  return (
    u.startsWith("data:image/") ||
    u.includes("image/upload") ||
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(u)
  );
}

function isPdfUrl(url) {
  return /\.pdf(\?|$)/.test(String(url || "").toLowerCase());
}

function cloudinaryThumb(url, w) {
  const u = String(url || "");
  if (!u.includes("/image/upload/")) return u;
  return u.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${w},c_limit/`);
}

function displayUrl(url, size = 1200) {
  return isImageUrl(url) ? cloudinaryThumb(url, size) : url;
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
  layout: { width: "100%" },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "12px 16px", borderRadius: 16,
    background: "#fff", border: "1.5px solid #e2e8f0",
    boxShadow: "0 2px 14px rgba(0,0,0,0.06)", marginBottom: 16, flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0" },
  card: {
    background: "#fff", border: "1.5px solid #e2e8f0",
    borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", padding: 18,
  },
  label: { fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 15, fontWeight: 600,
    outline: "none", background: "#f8fafc",
  },
  tblInput: {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "8px 10px", fontSize: 14, fontWeight: 600,
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
  cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
};
const miniBtnRed = {
  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
  color: "#991b1b", borderRadius: 8, padding: "7px 14px", fontWeight: 700,
  cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
};

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ expiryDate }) {
  const b = expiryBadge(expiryDate);
  return (
    <span style={{
      fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 999,
      background: b.bg, border: `1px solid ${b.bd}`, color: b.color, whiteSpace: "nowrap",
    }}>
      {b.text}
    </span>
  );
}

// ── File chip (removable) ──────────────────────────────────────────────────
function FileChip({ url, label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#eff6ff", border: "1px solid #bfdbfe",
      borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
    }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
        {label}
      </a>
      {onRemove && (
        <button type="button" onClick={onRemove}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#ef4444", fontWeight: 900, fontSize: 14, padding: "0 2px",
            display: "flex", alignItems: "center",
          }}
          title="Remove file">✕</button>
      )}
    </span>
  );
}

// ── PreviewModal ───────────────────────────────────────────────────────────
function PreviewModal({ open, title, urls, index, onClose, onPrev, onNext }) {
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    const list = Array.isArray(urls) ? urls : [];
    [list[index], list[(index - 1 + list.length) % (list.length || 1)], list[(index + 1) % (list.length || 1)]]
      .filter(Boolean).forEach((u) => {
        if (isImageUrl(u)) {
          const img = new Image();
          img.decoding = "async";
          img.src = displayUrl(u, 1400);
        }
      });
  }, [open, index, urls]);

  if (!open) return null;

  const current = urls?.[index] || "";
  const isImg = isImageUrl(current);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(2,6,23,0.65)",
        zIndex: 9999, display: "grid", placeItems: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 96vw)", maxHeight: "92vh", borderRadius: 18,
          background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "12px 14px", borderBottom: "1.5px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {title || "Preview"}{" "}
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>
              ({index + 1} / {urls?.length})
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={current} target="_blank" rel="noreferrer"
              style={{ ...miniBtn, textDecoration: "none" }}>Open</a>
            <a href={current} download
              style={{ ...miniBtn, textDecoration: "none" }}>Download</a>
            <button type="button" style={miniBtn} onClick={onPrev} disabled={(urls?.length || 0) <= 1}>◀</button>
            <button type="button" style={miniBtn} onClick={onNext} disabled={(urls?.length || 0) <= 1}>▶</button>
            <button type="button" style={miniBtnRed} onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflow: "auto", background: "#f8fafc", display: "grid", placeItems: "center", padding: 16 }}>
          {isImg ? (
            <>
              {!loaded && (
                <div style={{ fontWeight: 700, color: "#6366f1", marginBottom: 10 }}>Loading...</div>
              )}
              <img
                src={displayUrl(current, 1400)}
                alt="preview"
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                style={{
                  maxWidth: "100%", maxHeight: "76vh",
                  borderRadius: 12, border: "1.5px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              />
            </>
          ) : (
            <div style={{ padding: 20, fontWeight: 700, color: "#64748b" }}>
              This file cannot be previewed. Use <b>Open</b> to view it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── upload helper (shared with Input page) ─────────────────────────────────
function isPdf(file) {
  const t = String(file?.type || "").toLowerCase();
  return t === "application/pdf" || String(file?.name || "").toLowerCase().endsWith(".pdf");
}
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  const url = data?.url || data?.secure_url || data?.fileUrl || data?.file_url || data?.path || data?.result?.secure_url || "";
  if (!url) throw new Error("No URL returned from server.");
  return url;
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LicensesContractsView() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  const [preview, setPreview] = useState({ open: false, title: "", urls: [], index: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);

  // edit state
  const [editing, setEditing] = useState(false);
  const [editLicense, setEditLicense] = useState({});
  const [editContracts, setEditContracts] = useState([]);

  // upload state (during edit)
  const [uploadingKey, setUploadingKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const firstLoad = useRef(true);

  // ── fetch ──────────────────────────────────────────────────────────────
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      let arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];
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
      alert("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── delete ─────────────────────────────────────────────────────────────
  async function handleDelete(r) {
    if (!window.confirm("Delete this report permanently?")) return;
    const rid = getId(r);
    if (!rid) return alert("Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("Report deleted.");
      setEditing(false);
      setDetailsOpen(false);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  }

  // ── filter & group ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reports.filter((r) => {
      const p = r?.payload || {};
      const lic = p.license || {};
      const cons = safeArr(p.contracts);
      if (branchFilter !== "ALL" && String(p.branch || "").trim() !== branchFilter) return false;
      if (needle) {
        const text = [p.branch, lic.name, lic.notes, ...cons.map((c) => c.contractType), ...cons.map((c) => c.companyName)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(needle)) return false;
      }
      if (onlyExpiring) {
        const licDays = daysUntil(lic.expiryDate);
        const licHit = licDays !== null && licDays <= 30;
        const conHit = cons.some((c) => { const d = daysUntil(c.expiryDate); return d !== null && d <= 30; });
        if (!licHit && !conHit) return false;
      }
      return true;
    });
  }, [reports, q, branchFilter, onlyExpiring]);

  const groupedByBranch = useMemo(() => {
    const acc = {};
    for (const r of filtered) {
      const br = String(r?.payload?.branch || "").trim() || "Unspecified";
      acc[br] = acc[br] || [];
      acc[br].push(r);
    }
    return acc;
  }, [filtered]);

  // ── selected data ──────────────────────────────────────────────────────
  const payload = selected?.payload || {};
  const license = payload?.license || {};
  const contracts = safeArr(payload?.contracts);
  const selectedBranch = String(payload?.branch || "").trim() || "—";

  const licenseFiles = useMemo(() => normalizeFiles(license), [license]);
  const licenseImages = useMemo(() => licenseFiles.filter(isImageUrl), [licenseFiles]);

  // prefetch thumbs
  useEffect(() => {
    licenseImages.slice(0, 8).forEach((u) => {
      const img = new Image();
      img.decoding = "async";
      img.src = displayUrl(u, 320);
    });
  }, [licenseImages]);

  // ── preview helpers ────────────────────────────────────────────────────
  function openPreview(title, urls, idx = 0) {
    const list = safeArr(urls).filter(Boolean);
    if (!list.length) return;
    setPreview({ open: true, title, urls: list, index: Math.max(0, Math.min(idx, list.length - 1)) });
  }
  const closePreview = () => setPreview((p) => ({ ...p, open: false }));
  const prevPreview = () => setPreview((p) => ({ ...p, index: (p.index - 1 + p.urls.length) % p.urls.length }));
  const nextPreview = () => setPreview((p) => ({ ...p, index: (p.index + 1) % p.urls.length }));

  // ── sidebar badge summary ──────────────────────────────────────────────
  function sidebarMeta(r) {
    const p = r?.payload || {};
    const lic = p.license || {};
    const cons = safeArr(p.contracts);
    const hasLic = !!(String(lic.name || "").trim() || String(lic.expiryDate || "").trim() || normalizeFiles(lic).length);
    let worst = null;
    const pick = (b) => {
      const rank = b.text.startsWith("Expired") ? 0 : b.text.startsWith("Expiring") ? 1 : b.text.startsWith("Valid") ? 2 : 3;
      if (!worst || rank < worst.rank) worst = { ...b, rank };
    };
    if (hasLic) pick(expiryBadge(lic.expiryDate));
    cons.forEach((c) => pick(expiryBadge(c.expiryDate)));
    const countContracts = cons.filter((c) => Object.values(c || {}).some((v) => String(v || "").trim())).length;
    return { worst, countContracts, hasLic };
  }

  // ── edit ───────────────────────────────────────────────────────────────
  function startEdit() {
    if (!selected) return;
    const pass = window.prompt("Enter password to edit:");
    if ((pass || "") !== "9999") return alert("Wrong password.");

    const licCopy = JSON.parse(JSON.stringify(license || {}));
    licCopy.fileUrls = normalizeFiles(licCopy);
    if (!Array.isArray(licCopy.fileNames)) licCopy.fileNames = [];

    const consCopy = JSON.parse(JSON.stringify(contracts || [])).map((c) => ({
      ...c,
      fileUrls: normalizeFiles(c),
      fileNames: Array.isArray(c.fileNames) ? c.fileNames : [],
    }));

    setEditLicense(licCopy);
    setEditContracts(consCopy);
    setEditing(true);
    setDetailsOpen(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditLicense({});
    setEditContracts([]);
  }

  function updateEditLicense(key, val) {
    setEditLicense((p) => ({ ...p, [key]: val }));
  }

  function removeLicenseFile(i) {
    setEditLicense((p) => ({
      ...p,
      fileUrls: (p.fileUrls || []).filter((_, j) => j !== i),
      fileNames: (p.fileNames || []).filter((_, j) => j !== i),
      fileUrl: ((p.fileUrls || []).filter((_, j) => j !== i))[0] || "",
    }));
  }

  function updateContract(i, field, value) {
    setEditContracts((prev) => {
      const next = [...prev];
      next[i] = { ...(next[i] || {}), [field]: value };
      return next;
    });
  }

  function removeContractFile(ci, fi) {
    setEditContracts((prev) => {
      const next = [...prev];
      const c = { ...next[ci] };
      c.fileUrls = (c.fileUrls || []).filter((_, j) => j !== fi);
      c.fileNames = (c.fileNames || []).filter((_, j) => j !== fi);
      c.fileUrl = c.fileUrls[0] || "";
      next[ci] = c;
      return next;
    });
  }

  // ── shared upload logic (edit mode) ───────────────────────────────────────
  async function handleFilePick(fileList, currentUrls, currentNames, onDone, uploadKey) {
    const list = Array.from(fileList || []).slice(0, 20);
    if (!list.length) return;
    const pdfs = list.filter(isPdf);
    const imgs = list.filter((f) => !isPdf(f));
    if (pdfs.length && imgs.length) return alert("Please upload PDF alone OR images alone — not both.");
    if (pdfs.length > 1) return alert("Only 1 PDF allowed.");
    try {
      setUploadingKey(uploadKey);
      setUploadProgress("");
      if (pdfs.length === 1) {
        setUploadProgress("Uploading PDF...");
        const url = await uploadFile(pdfs[0]);
        onDone([...currentUrls, url], [...currentNames, pdfs[0].name]);
        return;
      }
      const uploaded = [];
      for (let i = 0; i < imgs.length; i++) {
        setUploadProgress(`Uploading ${i + 1} / ${imgs.length}...`);
        uploaded.push(await uploadFile(imgs[i]));
      }
      const merged = [...currentUrls, ...uploaded].slice(0, 20);
      const mergedNames = [...currentNames, ...imgs.map((f) => f.name)].slice(0, 20);
      onDone(merged, mergedNames);
    } catch (e) {
      console.error(e);
      alert(`Upload failed: ${e.message}`);
    } finally {
      setUploadingKey("");
      setUploadProgress("");
    }
  }

  function pickLicenseFiles(fileList) {
    handleFilePick(
      fileList,
      editLicense.fileUrls || [],
      editLicense.fileNames || [],
      (urls, names) => setEditLicense((p) => ({ ...p, fileUrls: urls, fileNames: names, fileUrl: urls[0] || "" })),
      "license"
    );
  }

  function pickContractFiles(ci, fileList) {
    const cur = editContracts[ci] || {};
    handleFilePick(
      fileList,
      cur.fileUrls || [],
      cur.fileNames || [],
      (urls, names) =>
        setEditContracts((prev) => {
          const next = [...prev];
          next[ci] = { ...next[ci], fileUrls: urls, fileNames: names, fileUrl: urls[0] || "" };
          return next;
        }),
      `contract:${ci}`
    );
  }

  function addContractRow() {
    setEditContracts((prev) => [...prev, { contractType: "", companyName: "", expiryDate: "", notes: "", fileUrls: [], fileNames: [] }]);
  }

  function deleteContractRow(i) {
    setEditContracts((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveEdit() {
    if (!selected) return;
    const pass = window.prompt("Confirm password to save:");
    if ((pass || "") !== "9999") return alert("Wrong password.");

    const rid = getId(selected);
    if (!rid) return alert("Missing report ID.");

    const newPayload = {
      ...payload,
      branch: selectedBranch,
      license: { ...editLicense, fileUrl: (editLicense.fileUrls || [])[0] || "" },
      contracts: safeArr(editContracts).map((c) => ({
        ...c, fileUrl: (c.fileUrls || [])[0] || "",
      })),
      savedAt: Date.now(),
    };

    try {
      setLoading(true);
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }).catch(() => {});
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: TYPE, branch: newPayload.branch, payload: newPayload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Changes saved successfully.");
      setEditing(false);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("Save failed: " + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ── thumbnail row ──────────────────────────────────────────────────────
  function ThumbnailRow({ images, title }) {
    if (!images.length) return null;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {images.slice(0, 8).map((u, i) => (
          <button
            key={u} type="button"
            onClick={() => openPreview(title, images, i)}
            style={{
              width: 70, height: 52, borderRadius: 10, overflow: "hidden",
              border: "1.5px solid #e2e8f0", background: "#f8fafc",
              cursor: "pointer", padding: 0,
            }}
            title={`Preview image ${i + 1}`}
          >
            <img
              src={displayUrl(u, 320)} alt={`thumb-${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="eager" decoding="async"
            />
          </button>
        ))}
        {images.length > 8 && (
          <button
            type="button"
            onClick={() => openPreview(title, images, 0)}
            style={{
              width: 70, height: 52, borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#eff6ff",
              cursor: "pointer", fontWeight: 700, color: "#3730a3", fontSize: 13,
            }}
          >+{images.length - 8}</button>
        )}
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <main style={S.shell}>
      <div style={S.layout}>
        <PreviewModal
          open={preview.open} title={preview.title}
          urls={preview.urls} index={preview.index}
          onClose={closePreview} onPrev={prevPreview} onNext={nextPreview}
        />

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.brand}>
            <img src={mawashiLogo} alt="logo" style={S.logo} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
                TRANS EMIRATES LIVESTOCK TRADING L.L.C.
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                AL MAWASHI — Licenses & Contracts (View)
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btnGhost} onClick={() => navigate("/haccp-iso")}>← Hub</button>
            <button style={btnSolid("#6366f1")} onClick={() => navigate("/haccp-iso/licenses-contracts")}>
              + New Entry
            </button>
            <button style={btnSolid("#10b981")} onClick={fetchReports} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...S.card, marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 240px 220px", gap: 12, alignItems: "end" }}>
          <div>
            <label style={S.label}>Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} style={S.input}
              placeholder="Search branch, license name, contract type, company..." />
          </div>
          <div>
            <label style={S.label}>Branch — Showing: {filtered.length}</label>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={S.input}>
              <option value="ALL">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 4 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, cursor: "pointer" }}>
              <input type="checkbox" checked={onlyExpiring} onChange={(e) => setOnlyExpiring(e.target.checked)} />
              Show Expiring / Expired only (≤30 days)
            </label>
          </div>
        </div>

        {/* Main layout: sidebar + details */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ ...S.card, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Records</div>

            {loading && <div style={{ color: "#94a3b8", fontWeight: 700 }}>Loading...</div>}
            {!loading && Object.keys(groupedByBranch).length === 0 && (
              <div style={{ color: "#94a3b8", fontWeight: 700 }}>No records found.</div>
            )}

            {Object.keys(groupedByBranch)
              .sort((a, b) => a.localeCompare(b))
              .map((br) => (
                <details key={br} open style={{ marginBottom: 12 }}>
                  <summary style={{ fontWeight: 800, cursor: "pointer", padding: "4px 0" }}>
                    {br}
                    <span style={{ color: "#94a3b8", fontWeight: 600, marginLeft: 6 }}>
                      ({groupedByBranch[br].length})
                    </span>
                  </summary>

                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    {groupedByBranch[br].map((r, i) => {
                      const active = getId(selected) && getId(selected) === getId(r);
                      const meta = sidebarMeta(r);
                      return (
                        <button
                          key={`${getId(r)}-${i}`}
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setDetailsOpen(false);
                            setEditing(false);
                            setEditLicense({});
                            setEditContracts([]);
                          }}
                          style={{
                            textAlign: "left", borderRadius: 12, padding: 10, cursor: "pointer",
                            border: active ? "1.5px solid #a5b4fc" : "1.5px solid #e2e8f0",
                            background: active ? "#eef2ff" : "#fff",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>Record #{i + 1}</span>
                            {meta.worst && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: "3px 8px",
                                borderRadius: 999, background: meta.worst.bg,
                                border: `1px solid ${meta.worst.bd}`, color: meta.worst.color,
                              }}>
                                {meta.worst.text.replace("Valid", "OK")}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginTop: 4 }}>
                            ID: {shortId(r)} • {meta.hasLic ? "License ✓" : "No License"} • {meta.countContracts} Contract{meta.countContracts !== 1 ? "s" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </details>
              ))}
          </div>

          {/* Details panel */}
          <div style={{ ...S.card, minWidth: 0 }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>Report Details</div>
                {selected && (
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                    Branch: <span style={{ color: "#0f172a" }}>{selectedBranch}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={miniBtn} onClick={() => setDetailsOpen((v) => !v)} disabled={!selected}>
                  {detailsOpen ? "▲ Hide" : "▼ Show Details"}
                </button>

                {selected && !editing && (
                  <button style={btnSolid("#6366f1")} onClick={startEdit}>✎ Edit</button>
                )}

                {editing && (
                  <>
                    <button style={btnSolid("#10b981")} onClick={saveEdit} disabled={loading}>
                      {loading ? "Saving..." : "✓ Save Changes"}
                    </button>
                    <button style={btnGhost} onClick={cancelEdit} disabled={loading}>Cancel</button>
                  </>
                )}

                {selected && (
                  <button style={btnSolid("#ef4444")} onClick={() => handleDelete(selected)}>
                    Delete
                  </button>
                )}
              </div>
            </div>

            {!selected ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                ← Select a record from the list
              </div>
            ) : !detailsOpen ? (
              <div style={{
                padding: 16, borderRadius: 12, border: "1.5px dashed #e2e8f0",
                background: "#f8fafc", color: "#64748b", fontWeight: 700, textAlign: "center",
              }}>
                Click <b>Show Details</b> to view this report.
              </div>
            ) : (
              <>
                {/* ── License ── */}
                <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fafafa", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>🪪 Company License</div>
                    <Badge expiryDate={(editing ? editLicense : license)?.expiryDate} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={S.label}>License Name</label>
                      {editing ? (
                        <input style={S.input} value={editLicense?.name || ""}
                          onChange={(e) => updateEditLicense("name", e.target.value)}
                          placeholder="License name" />
                      ) : (
                        <div style={{ fontWeight: 700 }}>{license?.name || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label style={S.label}>Expiry Date</label>
                      {editing ? (
                        <input type="date" style={S.input} value={editLicense?.expiryDate || ""}
                          onChange={(e) => updateEditLicense("expiryDate", e.target.value)} />
                      ) : (
                        <div style={{ fontWeight: 700 }}>{license?.expiryDate || "—"}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={S.label}>Notes</label>
                    {editing ? (
                      <input style={S.input} value={editLicense?.notes || ""}
                        onChange={(e) => updateEditLicense("notes", e.target.value)}
                        placeholder="Notes..." />
                    ) : (
                      <div style={{ fontWeight: 700, color: license?.notes ? "#0f172a" : "#94a3b8" }}>
                        {license?.notes || "—"}
                      </div>
                    )}
                  </div>

                  {/* Files */}
                  <div>
                    <label style={S.label}>Files ({(editing ? (editLicense.fileUrls || []) : licenseFiles).length})</label>

                    {editing ? (
                      <div>
                        {/* upload input */}
                        <div style={{ marginBottom: 10 }}>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            multiple
                            onChange={(e) => pickLicenseFiles(e.target.files)}
                            style={{ ...S.input, padding: "9px 12px" }}
                            disabled={!!uploadingKey}
                          />
                          <div style={{ fontSize: 13, color: uploadingKey === "license" ? "#6366f1" : "#94a3b8", fontWeight: 600, marginTop: 5 }}>
                            {uploadingKey === "license" ? uploadProgress || "Uploading..." : "PDF: 1 file • Images: up to 20"}
                          </div>
                        </div>
                        {/* existing files as removable chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(editLicense.fileUrls || []).length === 0 && (
                            <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 13 }}>No files attached yet</span>
                          )}
                          {(editLicense.fileUrls || []).map((u, i) => (
                            <FileChip
                              key={`${u}-${i}`}
                              url={u}
                              label={editLicense.fileNames?.[i] || (isImageUrl(u) ? `Image ${i + 1}` : isPdfUrl(u) ? `PDF ${i + 1}` : `File ${i + 1}`)}
                              onRemove={() => removeLicenseFile(i)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {licenseFiles.length === 0 ? (
                          <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>No files</span>
                        ) : (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {licenseImages.length > 0 && (
                              <button type="button" style={miniBtn}
                                onClick={() => openPreview("License Images", licenseImages, 0)}>
                                Preview Images ({licenseImages.length})
                              </button>
                            )}
                            <a href={licenseFiles[0]} target="_blank" rel="noreferrer"
                              style={{ ...miniBtn, textDecoration: "none" }}>Open</a>
                            <a href={licenseFiles[0]} download
                              style={{ ...miniBtn, textDecoration: "none" }}>Download</a>
                          </div>
                        )}
                        <ThumbnailRow images={licenseImages} title="License Images" />
                      </>
                    )}
                  </div>
                </div>

                {/* ── Contracts ── */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>
                      📄 Contracts ({(editing ? editContracts : contracts).length})
                    </div>
                    {editing && (
                      <button type="button" style={miniBtn} onClick={addContractRow}>+ Add Contract</button>
                    )}
                  </div>

                  {(editing ? editContracts : contracts).length === 0 ? (
                    <div style={{ color: "#94a3b8", fontWeight: 700 }}>No contracts</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {["Type", "Company", "Expiry", "Status", "Files", "Notes", ...(editing ? ["Actions"] : [])].map((h) => (
                              <th key={h} style={{
                                textAlign: "left", padding: "12px 12px",
                                fontSize: 14, fontWeight: 700, color: "#475569",
                                borderBottom: "2px solid #e2e8f0",
                                background: "#f8fafc", whiteSpace: "nowrap",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(editing ? editContracts : contracts).map((c, i) => {
                            const cFiles = normalizeFiles(editing ? c : c);
                            const cImages = cFiles.filter(isImageUrl);

                            return (
                              <tr key={i}>
                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 160, fontWeight: 700 }}>
                                  {editing ? (
                                    <input style={S.tblInput} value={c.contractType || ""}
                                      onChange={(e) => updateContract(i, "contractType", e.target.value)}
                                      placeholder="Type" />
                                  ) : c.contractType || "—"}
                                </td>

                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 180, fontWeight: 700 }}>
                                  {editing ? (
                                    <input style={S.tblInput} value={c.companyName || ""}
                                      onChange={(e) => updateContract(i, "companyName", e.target.value)}
                                      placeholder="Company" />
                                  ) : c.companyName || "—"}
                                </td>

                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 140, fontWeight: 700 }}>
                                  {editing ? (
                                    <input type="date" style={S.tblInput} value={c.expiryDate || ""}
                                      onChange={(e) => updateContract(i, "expiryDate", e.target.value)} />
                                  ) : c.expiryDate || "—"}
                                </td>

                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 140 }}>
                                  <Badge expiryDate={c.expiryDate} />
                                </td>

                                {/* Files */}
                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 240 }}>
                                  {editing ? (
                                    <div>
                                      {/* upload input */}
                                      <input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        multiple
                                        onChange={(e) => pickContractFiles(i, e.target.files)}
                                        style={{ ...S.tblInput, marginBottom: 6 }}
                                        disabled={!!uploadingKey}
                                      />
                                      {uploadingKey === `contract:${i}` && (
                                        <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>
                                          {uploadProgress || "Uploading..."}
                                        </div>
                                      )}
                                      {/* existing files as chips */}
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {(c.fileUrls || []).length === 0 && (
                                          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>No files yet</span>
                                        )}
                                        {(c.fileUrls || []).map((u, fi) => (
                                          <FileChip
                                            key={`${u}-${fi}`}
                                            url={u}
                                            label={c.fileNames?.[fi] || (isImageUrl(u) ? `Img ${fi + 1}` : `File ${fi + 1}`)}
                                            onRemove={() => removeContractFile(i, fi)}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  ) : cFiles.length === 0 ? (
                                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>—</span>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {cImages.length > 0 && (
                                          <button type="button" style={miniBtn}
                                            onClick={() => openPreview(`${c.contractType || "Contract"} Images`, cImages, 0)}>
                                            Preview ({cImages.length})
                                          </button>
                                        )}
                                        <a href={cFiles[0]} target="_blank" rel="noreferrer"
                                          style={{ ...miniBtn, textDecoration: "none" }}>Open</a>
                                        <a href={cFiles[0]} download
                                          style={{ ...miniBtn, textDecoration: "none" }}>DL</a>
                                      </div>
                                      {cFiles.length > 1 && (
                                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                                          {cFiles.length} files total
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: "12px 12px", borderBottom: "1px solid #f1f5f9", minWidth: 200, fontWeight: 700 }}>
                                  {editing ? (
                                    <input style={S.tblInput} value={c.notes || ""}
                                      onChange={(e) => updateContract(i, "notes", e.target.value)}
                                      placeholder="Notes" />
                                  ) : c.notes || "—"}
                                </td>

                                {editing && (
                                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9" }}>
                                    <button type="button" style={miniBtnRed} onClick={() => deleteContractRow(i)}>
                                      Remove
                                    </button>
                                  </td>
                                )}
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

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
