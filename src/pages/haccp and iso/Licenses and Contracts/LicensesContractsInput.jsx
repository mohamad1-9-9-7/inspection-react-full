// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsInput.jsx
import React, { useMemo, useState } from "react";
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

/* ===== Branches (EN) ===== */
const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

/* ===== Helpers ===== */
function isEmptyObj(obj) {
  return !Object.values(obj || {}).some((v) => String(v || "").trim() !== "");
}

function niceName(file) {
  try {
    return file?.name || "";
  } catch {
    return "";
  }
}

function isPdf(file) {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}

async function uploadFileToServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error || data?.message || `Upload failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  // Support multiple possible response shapes
  const url =
    data?.url ||
    data?.secure_url ||
    data?.fileUrl ||
    data?.file_url ||
    data?.path ||
    data?.result?.secure_url ||
    data?.result?.url ||
    "";

  if (!url) throw new Error("Upload succeeded but no URL returned from server.");
  return { url, raw: data };
}

async function uploadMany(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const { url } = await uploadFileToServer(files[i]);
    urls.push(url);
  }
  return urls;
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

const layoutStyle = { maxWidth: "1100px", margin: "0 auto" };

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(15, 23, 42, 0.30)",
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
  border: "1px solid rgba(15, 23, 42, 0.22)",
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
  border: "1px solid rgba(15, 23, 42, 0.30)",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const cardStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15, 23, 42, 0.30)",
  borderRadius: 18,
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
  padding: 16,
};

const sectionTitle = {
  fontSize: 15,
  fontWeight: 950,
  margin: 0,
  marginBottom: 10,
  letterSpacing: "0.01em",
};

const hintStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  marginTop: 4,
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr 1.2fr",
  gap: 12,
  alignItems: "end",
};

const rowStyle2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  alignItems: "end",
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
  border: "1px solid rgba(15, 23, 42, 0.34)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  outline: "none",
  background: "rgba(255,255,255,0.95)",
};

const smallLink = {
  fontSize: 12,
  fontWeight: 900,
  color: "#2563eb",
  textDecoration: "none",
};

function FilesChips({ urls, names }) {
  const arr = Array.isArray(urls) ? urls : [];
  if (arr.length === 0) return null;

  const nm = Array.isArray(names) ? names : [];
  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      {arr.map((u, i) => (
        <div
          key={`${u}-${i}`}
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: "#0b1f4d",
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.36)",
              padding: "6px 10px",
              borderRadius: 999,
            }}
            title={nm[i] || u}
          >
            {nm[i] ? `Uploaded: ${nm[i]}` : `File ${i + 1}`}
          </span>
          <a href={u} target="_blank" rel="noreferrer" style={smallLink}>
            Open file
          </a>
        </div>
      ))}
    </div>
  );
}

function ContractRow({ idx, item, onChange, onRemove, uploading, onPickFiles }) {
  return (
    <div
      style={{
        border: "1px solid rgba(15, 23, 42, 0.28)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.95)",
      }}
    >
      <div style={rowStyle}>
        <div>
          <div style={fieldLabel}>Contract Type</div>
          <input
            value={item.contractType}
            onChange={(e) => onChange(idx, "contractType", e.target.value)}
            style={inputStyle}
            placeholder="e.g., Pest Control / Waste / Cleaning / Maintenance"
          />
        </div>

        <div>
          <div style={fieldLabel}>Expiry Date</div>
          <input
            type="date"
            value={item.expiryDate}
            onChange={(e) => onChange(idx, "expiryDate", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={fieldLabel}>Company Name</div>
          <input
            value={item.companyName}
            onChange={(e) => onChange(idx, "companyName", e.target.value)}
            style={inputStyle}
            placeholder="Company / Supplier name"
          />
        </div>
      </div>

      <div style={{ ...rowStyle2, marginTop: 12 }}>
        <div>
          <div style={fieldLabel}>Upload (PDF / Images up to 20)</div>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={(e) => onPickFiles(idx, e.target.files)}
            style={{ ...inputStyle, padding: "8px 10px" }}
            disabled={uploading}
          />
          <div style={hintStyle}>
            {uploading ? "Uploading..." : "Images: up to 20 files • PDF: 1 file"}
          </div>

          {/* ✅ keep old single fileUrl/fileName, but show list too */}
          <FilesChips urls={item.fileUrls?.length ? item.fileUrls : (item.fileUrl ? [item.fileUrl] : [])}
                      names={item.fileNames?.length ? item.fileNames : (item.fileName ? [item.fileName] : [])} />
        </div>

        <div>
          <div style={fieldLabel}>Notes (optional)</div>
          <input
            value={item.notes}
            onChange={(e) => onChange(idx, "notes", e.target.value)}
            style={inputStyle}
            placeholder="Short note"
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
          #{idx + 1}
        </div>
        {onRemove ? (
          <button type="button" style={btn("#ef4444")} onClick={() => onRemove(idx)}>
            Remove
          </button>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
            (Default)
          </span>
        )}
      </div>
    </div>
  );
}

export default function LicensesContractsInput() {
  const navigate = useNavigate();

  // Branch
  const [branch, setBranch] = useState(BRANCHES[0]);

  // License (single)
  const [license, setLicense] = useState({
    name: "",
    expiryDate: "",
    fileUrl: "",
    fileName: "",
    fileUrls: [],     // ✅ NEW
    fileNames: [],    // ✅ NEW
    notes: "",
  });

  // Contracts
  const [contracts, setContracts] = useState(() => [
    {
      contractType: "Pest Control",
      companyName: "",
      expiryDate: "",
      fileUrl: "",
      fileName: "",
      fileUrls: [],   // ✅ NEW
      fileNames: [],  // ✅ NEW
      notes: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(""); // "license" or `contract:${idx}`
  const [uploadProgress, setUploadProgress] = useState(""); // text

  const canSave = useMemo(() => {
    const anyLicense =
      String(license.name || "").trim() ||
      String(license.expiryDate || "").trim() ||
      String(license.fileUrl || "").trim() ||
      (Array.isArray(license.fileUrls) && license.fileUrls.length) ||
      String(license.notes || "").trim();

    const anyContract = contracts.some((c) => !isEmptyObj(c));
    return Boolean(anyLicense || anyContract);
  }, [license, contracts]);

  function updateLicense(key, val) {
    setLicense((p) => ({ ...p, [key]: val }));
  }

  function updateContract(idx, key, val) {
    setContracts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  function addContract() {
    setContracts((prev) => [
      ...prev,
      {
        contractType: "",
        companyName: "",
        expiryDate: "",
        fileUrl: "",
        fileName: "",
        fileUrls: [],
        fileNames: [],
        notes: "",
      },
    ]);
  }

  function removeContract(idx) {
    setContracts((prev) => prev.filter((_, i) => i !== idx));
  }

  // ✅ License: upload up to 20 images OR 1 PDF
  async function pickLicenseFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const slice = files.slice(0, 20);
    const pdfs = slice.filter(isPdf);
    const imgs = slice.filter((f) => !isPdf(f));

    if (pdfs.length > 0 && imgs.length > 0) {
      alert("❌ Please upload PDF alone OR images alone (do not mix).");
      return;
    }
    if (pdfs.length > 1) {
      alert("❌ Only 1 PDF is allowed.");
      return;
    }

    try {
      setUploadingKey("license");
      setUploadProgress("");

      if (pdfs.length === 1) {
        const pdf = pdfs[0];
        const { url } = await uploadFileToServer(pdf);

        // keep backwards compatibility
        updateLicense("fileUrl", url);
        updateLicense("fileName", niceName(pdf));
        updateLicense("fileUrls", [url]);
        updateLicense("fileNames", [niceName(pdf)]);
        return;
      }

      // images
      setUploadProgress(`Uploading 1/${imgs.length}...`);
      const urls = await uploadMany(imgs, (i, total) =>
        setUploadProgress(`Uploading ${i}/${total}...`)
      );
      const names = imgs.map(niceName);

      setLicense((p) => {
        const prevUrls = Array.isArray(p.fileUrls) ? p.fileUrls : [];
        const prevNames = Array.isArray(p.fileNames) ? p.fileNames : [];
        const mergedUrls = [...prevUrls, ...urls].slice(0, 20);
        const mergedNames = [...prevNames, ...names].slice(0, 20);

        // set single fields if empty
        const firstUrl = p.fileUrl || mergedUrls[0] || "";
        const firstName = p.fileName || mergedNames[0] || "";

        return {
          ...p,
          fileUrls: mergedUrls,
          fileNames: mergedNames,
          fileUrl: firstUrl,
          fileName: firstName,
        };
      });
    } catch (e) {
      console.error(e);
      alert(`❌ Upload failed: ${e.message || e}`);
    } finally {
      setUploadingKey("");
      setUploadProgress("");
    }
  }

  // ✅ Contract: upload up to 20 images OR 1 PDF
  async function pickContractFiles(idx, fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const slice = files.slice(0, 20);
    const pdfs = slice.filter(isPdf);
    const imgs = slice.filter((f) => !isPdf(f));

    if (pdfs.length > 0 && imgs.length > 0) {
      alert("❌ Please upload PDF alone OR images alone (do not mix).");
      return;
    }
    if (pdfs.length > 1) {
      alert("❌ Only 1 PDF is allowed.");
      return;
    }

    try {
      setUploadingKey(`contract:${idx}`);
      setUploadProgress("");

      if (pdfs.length === 1) {
        const pdf = pdfs[0];
        const { url } = await uploadFileToServer(pdf);

        updateContract(idx, "fileUrl", url);
        updateContract(idx, "fileName", niceName(pdf));
        updateContract(idx, "fileUrls", [url]);
        updateContract(idx, "fileNames", [niceName(pdf)]);
        return;
      }

      setUploadProgress(`Uploading 1/${imgs.length}...`);
      const urls = await uploadMany(imgs, (i, total) =>
        setUploadProgress(`Uploading ${i}/${total}...`)
      );
      const names = imgs.map(niceName);

      setContracts((prev) => {
        const next = [...prev];
        const cur = next[idx] || {};
        const prevUrls = Array.isArray(cur.fileUrls) ? cur.fileUrls : [];
        const prevNames = Array.isArray(cur.fileNames) ? cur.fileNames : [];
        const mergedUrls = [...prevUrls, ...urls].slice(0, 20);
        const mergedNames = [...prevNames, ...names].slice(0, 20);

        next[idx] = {
          ...cur,
          fileUrls: mergedUrls,
          fileNames: mergedNames,
          fileUrl: cur.fileUrl || mergedUrls[0] || "",
          fileName: cur.fileName || mergedNames[0] || "",
        };
        return next;
      });
    } catch (e) {
      console.error(e);
      alert(`❌ Upload failed: ${e.message || e}`);
    } finally {
      setUploadingKey("");
      setUploadProgress("");
    }
  }

  async function handleSave() {
    if (!canSave) {
      alert("No data to save.");
      return;
    }

    const cleanContracts = contracts.filter((c) => !isEmptyObj(c));

    const payload = {
      branch,
      license: {
        name: license.name,
        expiryDate: license.expiryDate,
        fileUrl: license.fileUrl,
        fileName: license.fileName,
        fileUrls: Array.isArray(license.fileUrls) ? license.fileUrls : [],
        fileNames: Array.isArray(license.fileNames) ? license.fileNames : [],
        notes: license.notes,
      },
      contracts: cleanContracts.map((c) => ({
        contractType: c.contractType,
        companyName: c.companyName,
        expiryDate: c.expiryDate,
        fileUrl: c.fileUrl,
        fileName: c.fileName,
        fileUrls: Array.isArray(c.fileUrls) ? c.fileUrls : [],
        fileNames: Array.isArray(c.fileNames) ? c.fileNames : [],
        notes: c.notes,
      })),
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Saved successfully!");
    } catch (e) {
      console.error(e);
      alert("❌ Save failed. Check server/network.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setBranch(BRANCHES[0]);
    setLicense({
      name: "",
      expiryDate: "",
      fileUrl: "",
      fileName: "",
      fileUrls: [],
      fileNames: [],
      notes: "",
    });
    setContracts([
      {
        contractType: "Pest Control",
        companyName: "",
        expiryDate: "",
        fileUrl: "",
        fileName: "",
        fileUrls: [],
        fileNames: [],
        notes: "",
      },
    ]);
  }

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
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
                AL MAWASHI — Licenses & Contracts
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" style={btnGhost} onClick={() => navigate("/haccp-iso")}>
              ← Back
            </button>

            <button
              type="button"
              style={btn("#6366f1")}
              onClick={() => navigate("/haccp-iso/licenses-contracts/view")}
              title="View saved licenses & contracts"
            >
              View
            </button>

            <button
              type="button"
              style={btn("#10b981")}
              onClick={handleSave}
              disabled={saving || uploadingKey}
              title={!canSave ? "No data" : "Save"}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>
                Licenses & Contracts
              </h1>
              <div style={hintStyle}>
                Upload images (up to 20) or 1 PDF
              </div>
              {uploadProgress ? (
                <div style={{ ...hintStyle, color: "#0b1f4d" }}>{uploadProgress}</div>
              ) : null}
            </div>

            <div style={{ minWidth: 260 }}>
              <div style={fieldLabel}>Branch</div>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={inputStyle}>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <div style={hintStyle}>Select the branch for this entry</div>
            </div>
          </div>
        </div>

        {/* License section */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <h2 style={sectionTitle}>Company License</h2>

          <div style={rowStyle}>
            <div>
              <div style={fieldLabel}>License Name</div>
              <input
                value={license.name}
                onChange={(e) => updateLicense("name", e.target.value)}
                style={inputStyle}
                placeholder="e.g., Trade License / Municipality License"
              />
            </div>

            <div>
              <div style={fieldLabel}>Expiry Date</div>
              <input
                type="date"
                value={license.expiryDate}
                onChange={(e) => updateLicense("expiryDate", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabel}>Upload (PDF / Images up to 20)</div>
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => pickLicenseFiles(e.target.files)}
                style={{ ...inputStyle, padding: "8px 10px" }}
                disabled={uploadingKey === "license"}
              />
              <div style={hintStyle}>
                {uploadingKey === "license"
                  ? "Uploading..."
                  : "Images: up to 20 files • PDF: 1 file"}
              </div>

              <FilesChips
                urls={license.fileUrls?.length ? license.fileUrls : (license.fileUrl ? [license.fileUrl] : [])}
                names={license.fileNames?.length ? license.fileNames : (license.fileName ? [license.fileName] : [])}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={fieldLabel}>Notes (optional)</div>
            <input
              value={license.notes}
              onChange={(e) => updateLicense("notes", e.target.value)}
              style={inputStyle}
              placeholder="Short note"
            />
          </div>
        </div>

        {/* Contracts section */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Contracts</h2>
              <div style={hintStyle}>
                Pest Control contract is pre-added + you can add more contracts
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" style={btn("#6366f1")} onClick={addContract}>
                + Add Contract
              </button>
              <button type="button" style={btnGhost} onClick={handleReset} disabled={saving || uploadingKey}>
                Reset
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {contracts.map((c, idx) => (
              <ContractRow
                key={`${idx}-${c.contractType || "contract"}`}
                idx={idx}
                item={c}
                onChange={updateContract}
                onRemove={idx === 0 ? null : removeContract}
                uploading={uploadingKey === `contract:${idx}`}
                onPickFiles={pickContractFiles}
              />
            ))}
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
