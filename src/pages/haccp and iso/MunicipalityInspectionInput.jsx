// src/pages/haccp and iso/MunicipalityInspectionInput.jsx
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "municipality_inspection";

// ── helpers ────────────────────────────────────────────────────────────────
function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { try { URL.revokeObjectURL(url); } catch {} resolve(img); };
    img.onerror = (e) => { try { URL.revokeObjectURL(url); } catch {} reject(e); };
    img.src = url;
  });
}

async function compressToDataURL(file, { maxDim = 1280, quality = 0.8 } = {}) {
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image dimensions");
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
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
    borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", padding: 22,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 15, fontWeight: 600,
    outline: "none", background: "#f8fafc",
  },
  hint: { fontSize: 13, color: "#94a3b8", marginTop: 5, fontWeight: 600 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "end" },
};

const btnSolid = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 10,
  padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontSize: 15, whiteSpace: "nowrap",
});
const btnGhost = {
  background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0",
  borderRadius: 10, padding: "11px 18px", fontWeight: 700, cursor: "pointer", fontSize: 15,
};

// ── Main ───────────────────────────────────────────────────────────────────
export default function MunicipalityInspectionInput() {
  const navigate = useNavigate();

  const [municipality, setMunicipality] = useState("Dubai Municipality");
  const [branchName, setBranchName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(() => todayDubai());
  const [inspectionGrade, setInspectionGrade] = useState("");
  const [notes, setNotes] = useState("");

  const [images, setImages] = useState([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const busy = saving || processingImages || processingPdfs;

  async function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    try {
      setProcessingImages(true);
      const newItems = [];
      for (const file of picked) {
        const dataUrl = await compressToDataURL(file, { maxDim: 1280, quality: 0.8 });
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: file?.name || "image.jpg",
          mime: "image/jpeg",
          dataUrl,
        });
      }
      setImages((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      alert("Failed to process images. Try fewer or smaller images.");
    } finally {
      setProcessingImages(false);
    }
  }

  async function onPickPdfs(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const MAX_BYTES = 2 * 1024 * 1024;
    try {
      setProcessingPdfs(true);
      const newItems = [];
      for (const file of picked) {
        const lower = String(file?.name || "").toLowerCase();
        if (file?.type !== "application/pdf" && !lower.endsWith(".pdf")) continue;
        if (file.size > MAX_BYTES) {
          alert(`PDF too large: ${file.name}\nLimit: 2 MB`);
          continue;
        }
        const dataUrl = await readFileAsDataURL(file);
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: file?.name || "file.pdf",
          mime: "application/pdf",
          dataUrl,
          size: file.size || 0,
        });
      }
      if (!newItems.length) { alert("No valid PDF files selected."); return; }
      setPdfs((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      alert("Failed to process PDFs.");
    } finally {
      setProcessingPdfs(false);
    }
  }

  async function handleSave() {
    if (!inspectionDate) return alert("Please select the inspection date.");
    if (!inspectionGrade.trim()) return alert("Please enter the inspection grade.");
    if (!branchName.trim()) return alert("Please enter the branch name.");
    if (images.length === 0 && pdfs.length === 0)
      return alert("Please add at least one image or PDF before saving.");
    try {
      setSaving(true);
      const payload = {
        municipality,
        branchName: branchName.trim(),
        inspectionDate,
        inspectionGrade: inspectionGrade.trim(),
        notes: notes.trim(),
        images: images.map(({ name, mime, dataUrl }) => ({ name, mime, dataUrl })),
        pdfs: pdfs.map(({ name, mime, dataUrl, size }) => ({ name, mime, dataUrl, size })),
        savedAt: Date.now(),
        storage: "base64",
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
      });
      const txt = await res.text().catch(() => "");
      if (!res.ok) throw new Error(`HTTP ${res.status} ${txt}`);
      alert("Inspection report saved successfully!");
      setImages([]);
      setPdfs([]);
      setBranchName("");
      setInspectionGrade("");
      setNotes("");
      setMunicipality("Dubai Municipality");
      setInspectionDate(todayDubai());
    } catch (e) {
      console.error(e);
      alert(`Save failed.\n${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
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
              AL MAWASHI — Municipality Inspection
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btnGhost} onClick={() => navigate("/haccp-iso")}>← Back</button>
          <button style={btnSolid("#6366f1")} onClick={() => navigate("/haccp-iso/dm-inspection/view")}>
            View Reports
          </button>
          <button style={btnSolid("#10b981")} onClick={handleSave} disabled={busy}>
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div style={S.card}>
        <h2 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 800 }}>🏛️ Inspection Details</h2>

        <div style={S.grid4}>
          <div>
            <label style={S.label}>Municipality</label>
            <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={S.input}>
              <option>Dubai Municipality</option>
              <option>Abu Dhabi Municipality</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Branch Name</label>
            <input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. QCS Warehouse / POS 15"
              style={S.input}
            />
          </div>
          <div>
            <label style={S.label}>Inspection Date</label>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              style={S.input}
            />
          </div>
          <div>
            <label style={S.label}>Grade / Score</label>
            <input
              value={inspectionGrade}
              onChange={(e) => setInspectionGrade(e.target.value)}
              placeholder="e.g. A / 95% / Good"
              style={S.input}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={S.label}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any short notes..."
            style={{ ...S.input, minHeight: 90, resize: "vertical" }}
          />
        </div>
      </div>

      {/* Images */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🖼️ Inspection Images</h2>
            <div style={S.hint}>Images are compressed to JPEG and kept in memory until saved.</div>
          </div>
          <button
            style={btnSolid("#6366f1")}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {processingImages ? "Processing..." : "+ Add Images"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPickFiles} style={{ display: "none" }} />
        </div>

        {images.length === 0 ? (
          <div style={{
            border: "1.5px dashed #c7d2fe", borderRadius: 14,
            padding: 20, background: "#eef2ff",
            fontSize: 15, fontWeight: 700, color: "#4338ca", textAlign: "center",
          }}>
            No images yet — click <b>Add Images</b> to upload
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {images.map((it, idx) => (
              <div key={it.id} style={{
                border: "1.5px solid #e2e8f0", borderRadius: 14,
                overflow: "hidden", background: "#fff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}>
                <a href={it.dataUrl} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                  <img
                    src={it.dataUrl} alt={`img-${idx + 1}`}
                    style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                  />
                </a>
                <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "#374151",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={it.name}>{it.name}</div>
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((x) => x.id !== it.id))}
                    style={{
                      background: "#fef2f2", border: "1.5px solid #fca5a5",
                      color: "#dc2626", borderRadius: 8,
                      padding: "7px 10px", fontWeight: 700, cursor: "pointer", fontSize: 13,
                    }}
                  >Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDFs */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📄 PDF Attachments</h2>
            <div style={S.hint}>Max 2 MB per PDF file.</div>
          </div>
          <button
            style={btnSolid("#0ea5e9")}
            onClick={() => pdfInputRef.current?.click()}
            disabled={busy}
          >
            {processingPdfs ? "Processing..." : "+ Add PDFs"}
          </button>
          <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={onPickPdfs} style={{ display: "none" }} />
        </div>

        {pdfs.length === 0 ? (
          <div style={{
            border: "1.5px dashed #7dd3fc", borderRadius: 14,
            padding: 20, background: "#f0f9ff",
            fontSize: 15, fontWeight: 700, color: "#0369a1", textAlign: "center",
          }}>
            No PDFs yet — click <b>Add PDFs</b> to upload
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pdfs.map((p) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc",
                borderRadius: 12, padding: "12px 16px", flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, display: "grid", placeItems: "center",
                    background: "#fef2f2", border: "1.5px solid #fca5a5",
                    fontWeight: 800, color: "#dc2626", fontSize: 13, flexShrink: 0,
                  }}>PDF</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: "#0f172a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }} title={p.name}>{p.name}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>
                      {p.size ? `${Math.round(p.size / 1024)} KB` : ""}
                      {" · "}
                      <a href={p.dataUrl} target="_blank" rel="noreferrer"
                        style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
                        Open PDF
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfs((prev) => prev.filter((x) => x.id !== p.id))}
                  style={{
                    background: "#fef2f2", border: "1.5px solid #fca5a5",
                    color: "#dc2626", borderRadius: 8,
                    padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 14,
                  }}
                >Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
        © Al Mawashi — Quality & Food Safety System
      </div>
    </div>
  );
}
