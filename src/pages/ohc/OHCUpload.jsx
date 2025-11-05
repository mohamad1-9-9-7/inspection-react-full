// src/pages/ohc/OHCUpload.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* Server report type */
const TYPE = "ohc_certificate";

/* ========= Helpers ========= */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

// Normalize server list
function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;
  return arr
    .filter(x => (x?.type ? x.type === TYPE : true))
    .map(x => x.payload || x);
}

// Try to detect duplicates on server by appNo (two passes)
async function appNoExistsOnServer(appNo) {
  // 1) Direct filter (if backend supports it)
  const direct = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&appNo=${encodeURIComponent(appNo)}&limit=1`
  );
  if (direct.ok) {
    const list = extractReportsList(direct.data);
    if (list.some(p => String(p?.appNo || "").trim() === String(appNo).trim())) return true;
  }
  // 2) Fallback: list recent batch and check locally
  const wide = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=1000&sort=-createdAt`
  );
  if (wide.ok) {
    const list = extractReportsList(wide.data);
    return list.some(p => String(p?.appNo || "").trim() === String(appNo).trim());
  }
  // If we can't confirm, allow save (fail open) — optional: you can flip to "fail closed"
  return false;
}

// Compress image in-memory to ~1280px longest side, quality ≈ 0.8 (JPEG)
async function compressImage(file) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });

  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  // Export JPEG ~80%
  const out = canvas.toDataURL("image/jpeg", 0.8);
  return out;
}

/* ========= UI ========= */
const BRANCHES = [
  "QCS","POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16",
  "POS 17","POS 19","POS 21","POS 24","POS 25","POS 37","POS 38","POS 42","POS 45","POS 44"
];

export default function OHCUpload() {
  const navigate = useNavigate();

  // Main fields (App Number added back + required)
  const [form, setForm] = useState({
    appNo: "",
    name: "",
    nationality: "",
    job: "",
    issueDate: "",
    expiryDate: "",
    result: "",   // FIT | UNFIT
    branch: "",
  });

  // Single image (optional)
  const [imageData, setImageData] = useState(""); // base64 (dataURL)
  const [imageMeta, setImageMeta] = useState({ name: "", type: "" });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setMsg({ type: "", text: "" });
  };

  // Required fields (App Number included)
  const requiredKeys = ["appNo", "name", "nationality", "job", "issueDate", "expiryDate", "result", "branch"];

  async function handleSave() {
    // Required validation
    for (const k of requiredKeys) {
      if (!String(form[k] || "").trim()) {
        setMsg({ type: "error", text: "Please complete all required fields before saving." });
        return;
      }
    }

    // Duplicate check (by App Number) before confirm
    setBusy(true);
    const exists = await appNoExistsOnServer(form.appNo.trim());
    setBusy(false);
    if (exists) {
      setMsg({
        type: "error",
        text: `Duplicate App Number: "${form.appNo}". A certificate with this number already exists.`,
      });
      return;
    }

    // Confirm
    if (!window.confirm("Save this OHC certificate to the server?")) return;

    setBusy(true);
    setMsg({ type: "", text: "" });

    // Server-only save
    const payload = {
      ...form,
      // attach image if provided
      imageData: imageData || undefined,
      imageName: imageData ? imageMeta.name : undefined,
      imageType: imageData ? imageMeta.type : undefined,
      savedAt: new Date().toISOString(),
    };

    const body = JSON.stringify({
      reporter: "MOHAMAD ABDULLAH",
      type: TYPE,
      payload,
    });

    const { ok, status, data } = await jsonFetch(`${API_BASE}/api/reports`, {
      method: "POST",
      body,
    });

    setBusy(false);

    if (!ok) {
      setMsg({
        type: "error",
        text: `Failed to save to server (HTTP ${status}). ${data?.message || "Check connectivity or API permissions."}`,
      });
      return;
    }

    setMsg({ type: "ok", text: "✅ Saved to server successfully." });

    // Reset form
    setForm({
      appNo: "",
      name: "",
      nationality: "",
      job: "",
      issueDate: "",
      expiryDate: "",
      result: "",
      branch: "",
    });
    setImageData("");
    setImageMeta({ name: "", type: "" });
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setMsg({ type: "error", text: "Please select an image file." });
      e.target.value = "";
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      setImageMeta({ name: file.name, type: "image/jpeg" });
      setMsg({ type: "", text: "" });
    } catch {
      setMsg({ type: "error", text: "Image processing failed. Try another image." });
    } finally {
      e.target.value = "";
    }
  }

  function removeImage() {
    setImageData("");
    setImageMeta({ name: "", type: "" });
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "#fff",
        borderRadius: 12,
        direction: "ltr",
        maxWidth: 900,
        margin: "2rem auto",
        boxShadow: "0 4px 12px rgba(0,0,0,.08)",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8, color: "#1f2937" }}>
        🧾 OHC Certificate Entry — Server Save Only
      </h2>

      {msg.text && (
        <div
          style={{
            margin: "10px 0",
            padding: "10px 12px",
            borderRadius: 8,
            background: msg.type === "ok" ? "#ecfdf5" : "#fef2f2",
            color: msg.type === "ok" ? "#065f46" : "#991b1b",
            border: `1px solid ${msg.type === "ok" ? "#a7f3d0" : "#fecaca"}`,
            fontWeight: 600,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 8,
        }}
      >
        <Field label="App Number" value={form.appNo} onChange={(v) => setField("appNo", v)} />
        <Field label="Name" value={form.name} onChange={(v) => setField("name", v)} />

        <Field label="Nationality" value={form.nationality} onChange={(v) => setField("nationality", v)} />
        <Field label="Occupation" value={form.job} onChange={(v) => setField("job", v)} />

        <Select
          label="Result"
          value={form.result}
          onChange={(v) => setField("result", v)}
          options={[
            { value: "", label: "-- Select --" },
            { value: "FIT", label: "FIT" },
            { value: "UNFIT", label: "UNFIT" },
          ]}
        />
        <Select
          label="Branch"
          value={form.branch}
          onChange={(v) => setField("branch", v)}
          options={[{ value: "", label: "-- Select Branch --" }, ...BRANCHES.map((b) => ({ value: b, label: b }))]}
        />

        <DateField label="Certificate Issue Date" value={form.issueDate} onChange={(v) => setField("issueDate", v)} />
        <DateField label="Certificate Expiry Date" value={form.expiryDate} onChange={(v) => setField("expiryDate", v)} />

        {/* Single Image (optional) */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
            Certificate Image (Optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
            />
          </label>

          {imageData && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={imageData}
                alt="Preview"
                style={{ height: 90, borderRadius: 8, border: "1px solid #e5e7eb", objectFit: "cover" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={removeImage}
                  style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}
                >
                  Remove Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={busy}
          style={{
            padding: "10px 16px",
            background: "#16a34a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "Saving..." : "💾 Save to Server"}
        </button>

        <button
          onClick={() => navigate("/ohc/view")}
          style={{
            padding: "10px 16px",
            background: "#334155",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📋 View All Certificates
        </button>
      </div>
    </div>
  );
}

/* ========= Tiny UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <input
        type="date"
        value={value}
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
