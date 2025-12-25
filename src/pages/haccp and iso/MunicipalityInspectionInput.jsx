// src/pages/haccp and iso/MunicipalityInspectionInput.jsx
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

/* Report type on server */
const TYPE = "municipality_inspection";

/* ===== Date helper ===== */
function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/* ===== Image helpers (compress -> base64) ===== */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      resolve(img);
    };
    img.onerror = (e) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Compress image on client:
 * - resize longest side to maxDim (default 1280)
 * - jpeg quality (default 0.8)
 * - returns dataURL (base64)
 */
async function compressToDataURL(file, { maxDim = 1280, quality = 0.8 } = {}) {
  const img = await loadImageFromFile(file);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  if (!w || !h) throw new Error("Invalid image dimensions");

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, nw, nh);

  // Always store as jpeg to reduce size
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl;
}

/* ===== PDF helper (read -> base64 dataURL) ===== */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file); // data:application/pdf;base64,....
  });
}

/* ===== UI helpers ===== */
function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#0b1f4d" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function MunicipalityInspectionInput() {
  const navigate = useNavigate();

  const [municipality, setMunicipality] = useState("Dubai Municipality");
  const [branchName, setBranchName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(() => todayDubai());
  const [inspectionGrade, setInspectionGrade] = useState("");
  const [notes, setNotes] = useState("");

  /**
   * Store NO File and NO ObjectURL.
   * Only Base64 in memory for preview + send.
   * images: [{ id, name, mime, dataUrl }]
   */
  const [images, setImages] = useState([]);
  const [processingImages, setProcessingImages] = useState(false);

  /**
   * PDFs as Base64:
   * pdfs: [{ id, name, mime, dataUrl, size }]
   */
  const [pdfs, setPdfs] = useState([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);

  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

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

    const disabled = saving || processingImages || processingPdfs;

    const btn = (bg) => ({
      background: bg,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
      opacity: disabled ? 0.7 : 1,
      pointerEvents: disabled ? "none" : "auto",
      whiteSpace: "nowrap",
    });

    const ghostBtn = {
      background: "rgba(79,70,229,0.08)",
      color: "#3730a3",
      border: "1px solid rgba(79,70,229,0.25)",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.7 : 1,
      pointerEvents: disabled ? "none" : "auto",
    };

    return { card, input, btn, ghostBtn };
  }, [saving, processingImages, processingPdfs]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openPdfPicker() {
    pdfInputRef.current?.click();
  }

  function goToReports() {
    navigate("/haccp-iso/dm-inspection/view");
  }

  async function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-pick same file
    if (!picked.length) return;

    try {
      setProcessingImages(true);

      const newItems = [];
      for (const file of picked) {
        // Compress + Base64 immediately (no File / no ObjectURL kept)
        const dataUrl = await compressToDataURL(file, {
          maxDim: 1280,
          quality: 0.8,
        });

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
      alert("❌ Failed to process images. Try fewer/smaller images.");
    } finally {
      setProcessingImages(false);
    }
  }

  async function onPickPdfs(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-pick same file
    if (!picked.length) return;

    // Hard-limit to reduce 413 errors (Base64 gets bigger)
    const MAX_MB = 2; // change if you want
    const maxBytes = MAX_MB * 1024 * 1024;

    try {
      setProcessingPdfs(true);

      const newItems = [];
      for (const file of picked) {
        const lower = String(file?.name || "").toLowerCase();
        const isPdf = file?.type === "application/pdf" || lower.endsWith(".pdf");
        if (!isPdf) continue;

        if (file.size > maxBytes) {
          alert(
            `❌ PDF is too large: ${file.name}\nLimit is ${MAX_MB}MB to avoid server errors (413).`
          );
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

      if (newItems.length === 0) {
        alert("No valid PDF files selected.");
        return;
      }

      setPdfs((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to process PDFs. Try smaller PDFs.");
    } finally {
      setProcessingPdfs(false);
    }
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((x) => x.id !== id));
  }

  function removePdf(id) {
    setPdfs((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleSave() {
    if (!inspectionDate) return alert("Please select the inspection date");
    if (!inspectionGrade.trim()) return alert("Please enter the inspection grade");
    if (!branchName.trim()) return alert("Please enter the branch name");
    if (images.length === 0 && pdfs.length === 0)
  return alert("Please add at least one image OR one PDF before saving");

    // PDFs optional. If you want it mandatory, uncomment:
    // if (pdfs.length === 0) return alert("Please add PDF files before saving");

    try {
      setSaving(true);

      const payload = {
        municipality,
        branchName: branchName.trim(),
        inspectionDate,
        inspectionGrade: inspectionGrade.trim(),
        notes: notes.trim(),
        images: images.map(({ name, mime, dataUrl }) => ({ name, mime, dataUrl })), // Base64 images
        pdfs: pdfs.map(({ name, mime, dataUrl, size }) => ({ name, mime, dataUrl, size })), // ✅ Base64 PDFs
        savedAt: Date.now(),
        storage: "base64",
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "haccp-iso",
          type: TYPE,
          payload,
        }),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        throw new Error(`Save failed: HTTP ${res.status} ${txt}`);
      }

      alert("✅ Inspection report saved successfully! (Base64 on server)");

      // reset (nothing persisted locally)
      setImages([]);
      setPdfs([]);
      setBranchName("");
      setInspectionGrade("");
      setNotes("");
      setMunicipality("Dubai Municipality");
      setInspectionDate(todayDubai());
    } catch (e) {
      console.error(e);
      alert(
        `❌ Save failed.\n${String(e?.message || e)}\n\n(If you see 413 / Payload Too Large: Base64 is too big)`
      );
    } finally {
      setSaving(false);
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
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
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
                Municipality Inspection — Input
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
            <button type="button" onClick={goToReports} style={styles.ghostBtn}>
              View Reports
            </button>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                background: "rgba(99,102,241,0.10)",
                border: "1px solid rgba(99,102,241,0.32)",
              }}
            >
              🏛️ Inspection Report
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ ...styles.card, marginTop: 12, padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Field label="Municipality">
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                style={styles.input}
              >
                <option>Dubai Municipality</option>
                <option>Abu Dhabi Municipality</option>
              </select>
            </Field>

            <Field label="Branch Name">
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Example: QCS Warehouse / POS 15 / POS 10 ..."
                style={styles.input}
              />
            </Field>

            <Field label="Inspection Date">
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                style={styles.input}
              />
            </Field>

            <Field label="Inspection Grade / Score">
              <input
                value={inspectionGrade}
                onChange={(e) => setInspectionGrade(e.target.value)}
                placeholder="Example: A / 95% / Good ..."
                style={styles.input}
              />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any short notes..."
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
              />
            </Field>
          </div>

          {/* Images */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 13 }}>
                  Inspection Images
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>
                  No local file storage — Base64 is kept in memory for preview and
                  then saved to the server.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={openFilePicker}
                  style={styles.btn("#4f46e5")}
                >
                  {processingImages ? "Processing images..." : "+ Add Images"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickFiles}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {images.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(99,102,241,0.40)",
                  borderRadius: 14,
                  padding: 14,
                  background: "rgba(99,102,241,0.06)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0b1f4d",
                }}
              >
                No images yet. Click “Add Images” to select and preview them here.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {images.map((it, idx) => (
                  <div
                    key={it.id}
                    style={{
                      border: "1px solid rgba(30, 41, 59, 0.18)",
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "#fff",
                      boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <a
                      href={it.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open full size"
                      style={{ display: "block" }}
                    >
                      <img
                        src={it.dataUrl}
                        alt={`inspection_${idx + 1}`}
                        style={{
                          width: "100%",
                          height: 120,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </a>

                    <div style={{ padding: 10, display: "grid", gap: 8 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: "#374151",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={it.name}
                      >
                        {it.name}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeImage(it.id)}
                        style={{
                          background: "rgba(239,68,68,0.10)",
                          border: "1px solid rgba(239,68,68,0.35)",
                          color: "#b91c1c",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PDFs */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 13 }}>
                  PDF Attachments
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>
                  PDFs are stored as Base64 (may cause 413 if too large).
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={openPdfPicker}
                  style={styles.btn("#0ea5e9")}
                >
                  {processingPdfs ? "Processing PDFs..." : "+ Add PDFs"}
                </button>

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={onPickPdfs}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {pdfs.length === 0 ? (
              <div
                style={{
                  border: "1px dashed rgba(14,165,233,0.40)",
                  borderRadius: 14,
                  padding: 14,
                  background: "rgba(14,165,233,0.06)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0b1f4d",
                }}
              >
                No PDFs yet. Click “Add PDFs” to select and preview them here.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {pdfs.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      border: "1px solid rgba(30, 41, 59, 0.18)",
                      background: "#fff",
                      borderRadius: 12,
                      padding: "10px 12px",
                      boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4, minWidth: 260 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          fontSize: 12,
                          color: "#0b1f4d",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={p.name}
                      >
                        📄 {p.name}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280" }}>
                        {p.size ? `${Math.round(p.size / 1024)} KB` : ""}
                      </div>
                      {p.dataUrl && (
                        <a
                          href={p.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#2563eb",
                          }}
                        >
                          Open PDF
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePdf(p.id)}
                      style={{
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#b91c1c",
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      Remove PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              style={styles.btn("#16a34a")}
              title="Base64 will be saved on the server"
            >
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
        </div>

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
