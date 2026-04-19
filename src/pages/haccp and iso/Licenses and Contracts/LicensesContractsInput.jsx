// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsInput.jsx
import React, { useMemo, useState } from "react";
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
function isEmptyObj(obj) {
  return !Object.values(obj || {}).some((v) =>
    Array.isArray(v) ? v.length > 0 : String(v || "").trim()
  );
}
function isPdf(file) {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  const url =
    data?.url || data?.secure_url || data?.fileUrl ||
    data?.file_url || data?.path || data?.result?.secure_url || "";
  if (!url) throw new Error("No URL returned from server.");
  return url;
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
    borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", padding: 20,
    marginBottom: 14,
  },
  label: { fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 15, fontWeight: 600,
    outline: "none", background: "#f8fafc",
  },
  hint: { fontSize: 13, color: "#94a3b8", marginTop: 5, fontWeight: 600 },
  row3: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1.2fr", gap: 14, alignItems: "end" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "end" },
};

const btnSolid = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 10,
  padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontSize: 15, whiteSpace: "nowrap",
});
const btnGhost = {
  background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0",
  borderRadius: 10, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 15,
};

// ── FilesChips (with remove button) ───────────────────────────────────────
function FilesChips({ urls = [], names = [], onRemove }) {
  if (!urls.length) return null;
  return (
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {urls.map((u, i) => (
        <span
          key={`${u}-${i}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
          }}
        >
          <a href={u} target="_blank" rel="noreferrer"
            style={{ color: "#2563eb", textDecoration: "none" }}>
            {names[i] || `File ${i + 1}`}
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              title="Remove file"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#ef4444", fontWeight: 900, padding: "0 2px",
                fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center",
              }}
            >✕</button>
          )}
        </span>
      ))}
    </div>
  );
}

// ── ContractRow ────────────────────────────────────────────────────────────
function ContractRow({ idx, item, onChange, onRemove, onRemoveFile, uploading, onPickFiles }) {
  return (
    <div style={{
      border: "1.5px solid #e2e8f0", borderRadius: 14,
      padding: 16, background: "#f8fafc",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#64748b" }}>Contract #{idx + 1}</span>
        {onRemove && (
          <button type="button" style={{ ...btnSolid("#ef4444"), padding: "5px 12px", fontSize: 12 }}
            onClick={() => onRemove(idx)}>
            Remove
          </button>
        )}
      </div>

      <div style={S.row3}>
        <div>
          <label style={S.label}>Contract Type</label>
          <input value={item.contractType}
            onChange={(e) => onChange(idx, "contractType", e.target.value)}
            style={S.input} placeholder="e.g. Pest Control / Cleaning" />
        </div>
        <div>
          <label style={S.label}>Expiry Date</label>
          <input type="date" value={item.expiryDate}
            onChange={(e) => onChange(idx, "expiryDate", e.target.value)}
            style={S.input} />
        </div>
        <div>
          <label style={S.label}>Company Name</label>
          <input value={item.companyName}
            onChange={(e) => onChange(idx, "companyName", e.target.value)}
            style={S.input} placeholder="Company / Supplier name" />
        </div>
      </div>

      <div style={{ ...S.row2, marginTop: 12 }}>
        <div>
          <label style={S.label}>Upload Files</label>
          <input type="file" accept="application/pdf,image/*" multiple
            onChange={(e) => onPickFiles(idx, e.target.files)}
            style={{ ...S.input, padding: "7px 10px" }}
            disabled={uploading} />
          <div style={S.hint}>
            {uploading ? "Uploading..." : "PDF: 1 file • Images: up to 20"}
          </div>
          <FilesChips
            urls={item.fileUrls || []}
            names={item.fileNames || []}
            onRemove={(fi) => onRemoveFile(idx, fi)}
          />
        </div>
        <div>
          <label style={S.label}>Notes (optional)</label>
          <input value={item.notes}
            onChange={(e) => onChange(idx, "notes", e.target.value)}
            style={S.input} placeholder="Short note" />
        </div>
      </div>
    </div>
  );
}

// ── initial state factories ────────────────────────────────────────────────
const mkLicense = () => ({ name: "", expiryDate: "", fileUrls: [], fileNames: [], notes: "" });
const mkContract = (type = "") => ({
  contractType: type, companyName: "", expiryDate: "",
  fileUrls: [], fileNames: [], notes: "",
});

// ── Main ───────────────────────────────────────────────────────────────────
export default function LicensesContractsInput() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [license, setLicense] = useState(mkLicense);
  const [contracts, setContracts] = useState(() => [mkContract("Pest Control")]);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const canSave = useMemo(() => {
    const hasLic = !isEmptyObj(license);
    return hasLic || contracts.some((c) => !isEmptyObj(c));
  }, [license, contracts]);

  // ── shared file picker logic ─────────────────────────────────────────────
  async function handleFilePick(fileList, currentUrls, currentNames, onDone, uploadKey) {
    const list = Array.from(fileList || []).slice(0, 20);
    if (!list.length) return;

    const pdfs = list.filter(isPdf);
    const imgs = list.filter((f) => !isPdf(f));

    if (pdfs.length && imgs.length) {
      alert("Please upload PDF alone OR images alone — not both.");
      return;
    }
    if (pdfs.length > 1) {
      alert("Only 1 PDF allowed.");
      return;
    }

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

  // ── license file handlers ─────────────────────────────────────────────
  function pickLicenseFiles(fileList) {
    handleFilePick(
      fileList,
      license.fileUrls,
      license.fileNames,
      (urls, names) => setLicense((p) => ({ ...p, fileUrls: urls, fileNames: names })),
      "license"
    );
  }

  function removeLicenseFile(i) {
    setLicense((p) => {
      const urls = p.fileUrls.filter((_, j) => j !== i);
      const names = p.fileNames.filter((_, j) => j !== i);
      return { ...p, fileUrls: urls, fileNames: names };
    });
  }

  // ── contract helpers ──────────────────────────────────────────────────
  function updateContract(idx, key, val) {
    setContracts((p) => {
      const n = [...p];
      n[idx] = { ...n[idx], [key]: val };
      return n;
    });
  }

  function pickContractFiles(idx, fileList) {
    const cur = contracts[idx] || {};
    handleFilePick(
      fileList,
      cur.fileUrls || [],
      cur.fileNames || [],
      (urls, names) =>
        setContracts((p) => {
          const n = [...p];
          n[idx] = { ...n[idx], fileUrls: urls, fileNames: names };
          return n;
        }),
      `contract:${idx}`
    );
  }

  function removeContractFile(idx, fi) {
    setContracts((p) => {
      const n = [...p];
      const c = n[idx];
      n[idx] = {
        ...c,
        fileUrls: (c.fileUrls || []).filter((_, j) => j !== fi),
        fileNames: (c.fileNames || []).filter((_, j) => j !== fi),
      };
      return n;
    });
  }

  function addContract() {
    setContracts((p) => [...p, mkContract()]);
  }

  function removeContract(idx) {
    setContracts((p) => p.filter((_, i) => i !== idx));
  }

  // ── save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canSave) return alert("No data to save.");

    const payload = {
      branch,
      license: {
        ...license,
        fileUrl: license.fileUrls[0] || "",
        fileName: license.fileNames[0] || "",
      },
      contracts: contracts
        .filter((c) => !isEmptyObj(c))
        .map((c) => ({
          ...c,
          fileUrl: c.fileUrls[0] || "",
          fileName: c.fileNames[0] || "",
        })),
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Save failed. Check network / server.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setBranch(BRANCHES[0]);
    setLicense(mkLicense());
    setContracts([mkContract("Pest Control")]);
  }

  const busy = saving || !!uploadingKey;

  return (
    <main style={S.shell}>
      <div style={S.layout}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.brand}>
            <img src={mawashiLogo} alt="logo" style={S.logo} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>
                TRANS EMIRATES LIVESTOCK TRADING L.L.C.
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                AL MAWASHI — Licenses & Contracts
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btnGhost} onClick={() => navigate("/haccp-iso")}>← Back</button>
            <button style={btnSolid("#6366f1")} onClick={() => navigate("/haccp-iso/licenses-contracts/view")}>
              View Records
            </button>
            <button style={btnSolid("#10b981")} onClick={handleSave} disabled={busy}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Header + branch */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Licenses & Contracts</h1>
              {uploadProgress && (
                <div style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700, marginTop: 4 }}>
                  {uploadProgress}
                </div>
              )}
            </div>
            <div style={{ minWidth: 240 }}>
              <label style={S.label}>Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* License section */}
        <div style={S.card}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>
            🪪 Company License
          </h2>

          <div style={S.row3}>
            <div>
              <label style={S.label}>License Name</label>
              <input
                value={license.name}
                onChange={(e) => setLicense((p) => ({ ...p, name: e.target.value }))}
                style={S.input}
                placeholder="e.g. Trade License / Municipality License"
              />
            </div>
            <div>
              <label style={S.label}>Expiry Date</label>
              <input
                type="date"
                value={license.expiryDate}
                onChange={(e) => setLicense((p) => ({ ...p, expiryDate: e.target.value }))}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Upload (PDF or images)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => pickLicenseFiles(e.target.files)}
                style={{ ...S.input, padding: "7px 10px" }}
                disabled={uploadingKey === "license"}
              />
              <div style={S.hint}>
                {uploadingKey === "license" ? "Uploading..." : "PDF: 1 file • Images: up to 20"}
              </div>
              <FilesChips
                urls={license.fileUrls}
                names={license.fileNames}
                onRemove={removeLicenseFile}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Notes (optional)</label>
            <input
              value={license.notes}
              onChange={(e) => setLicense((p) => ({ ...p, notes: e.target.value }))}
              style={S.input}
              placeholder="Short note"
            />
          </div>
        </div>

        {/* Contracts section */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📄 Contracts</h2>
              <div style={S.hint}>Pest Control pre-added • Add more as needed</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnSolid("#6366f1")} onClick={addContract}>+ Add Contract</button>
              <button style={btnGhost} onClick={handleReset} disabled={busy}>Reset</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {contracts.map((c, idx) => (
              <ContractRow
                key={idx}
                idx={idx}
                item={c}
                onChange={updateContract}
                onRemove={idx > 0 ? removeContract : null}
                onRemoveFile={removeContractFile}
                uploading={uploadingKey === `contract:${idx}`}
                onPickFiles={pickContractFiles}
              />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
