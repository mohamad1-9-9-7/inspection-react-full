// src/pages/haccp and iso/ProductDetailsInput.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HaccpLinkBadge from "./FSMSManual/HaccpLinkBadge";
import API_BASE from "../../config/api";

const TYPE = "product_details";

async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data || data.ok === false)
    throw new Error(data?.error || data?.message || "Upload failed");
  return data.optimized_url || data.url || data.secure_url;
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

function parseUrls(v) {
  return String(v || "").split("\n").map((s) => s.trim()).filter(Boolean);
}
function joinUrls(arr) {
  return (Array.isArray(arr) ? arr : []).filter(Boolean).join("\n");
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const FIELDS = [
  { key: "dmRegistrationImagesUrls",  label: "DM registration",       max: 10 },
  { key: "assessmentCertImagesUrls",  label: "Assessment certificate", max: 10 },
  { key: "halalCertImagesUrls",       label: "Halal certificate",      max: 10 },
  { key: "nutritionFactsImagesUrls",  label: "Nutrition facts",        max: 10 },
  { key: "testImagesUrls",            label: "Tests",                  max: 10 },
  { key: "productImageUrls",          label: "Product images",         max: null },
];

const BLANK_FORM = {
  productName: "", productCode: "", brand: "", productType: "", countryOfOrigin: "",
  storageCondition: "", shelfLifeValue: "", shelfLifeUnit: "",
  ingredients: [{ name: "", amount: "" }],
  allergens: "", instructionsForUse: "",
  dmRegisteredStatus: "", dmRegistrationNo: "", otherAuthorityRegs: "",
  assessmentCertNo: "", assessmentBody: "", assessmentDate: "",
  halalCertNo: "", halalCB: "", halalCertExpiry: "",
  dmRegistrationImagesUrls: "", assessmentCertImagesUrls: "",
  halalCertImagesUrls: "", nutritionFactsImagesUrls: "",
  productImageUrls: "", testImagesUrls: "",
};

/* ─── Static styles ───────────────────────────────────── */
const card = {
  borderRadius: 20,
  padding: "24px 26px",
  marginBottom: 18,
  background: "#ffffff",
  boxShadow: "0 1px 4px rgba(15,23,42,0.05), 0 6px 20px rgba(15,23,42,0.05)",
  border: "1px solid rgba(226,232,240,0.8)",
};

const labelSt = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputSt = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 11,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fafafa",
  color: "#0f172a",
  fontFamily: "inherit",
};

const textareaSt = { ...inputSt, minHeight: 72, resize: "vertical" };

const hint = { fontSize: 11, color: "#94a3b8", marginTop: 3 };

const numBadge = {
  width: 30, height: 30, borderRadius: 999,
  background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
  color: "#fff", fontWeight: 900, fontSize: 13,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, boxShadow: "0 3px 10px rgba(37,99,235,0.3)",
};

const sectionHead = {
  display: "flex", alignItems: "center", gap: 12,
  marginBottom: 20, paddingBottom: 14,
  borderBottom: "1.5px solid #f1f5f9",
};

const thumbsWrap = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 };

const thumbBox = {
  width: 82, height: 82, borderRadius: 14,
  border: "1.5px solid #e2e8f0",
  background: "#f8fafc", overflow: "hidden",
  position: "relative",
  boxShadow: "0 2px 8px rgba(15,23,42,0.07)",
  cursor: "pointer",
};

const thumbImg = { width: "100%", height: "100%", objectFit: "cover", display: "block" };

const removeBtn = {
  position: "absolute", top: 5, right: 5,
  width: 20, height: 20, borderRadius: 999,
  border: "none",
  background: "rgba(15,23,42,0.55)",
  color: "#fff", fontWeight: 900, fontSize: 12,
  cursor: "pointer", lineHeight: "20px", textAlign: "center",
  display: "flex", alignItems: "center", justifyContent: "center",
};

/* ─── Gallery (outside parent — stable component type) ────── */
function Gallery({
  title, fieldKey, max,
  remoteUrls, pendingArr,
  onAddFiles, onOpenImage, onClearAll, onRemoveRemote, onRemovePending,
}) {
  const total = remoteUrls.length + pendingArr.length;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <label style={labelSt}>{title}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "2px 9px", borderRadius: 999, border: "1px solid #bfdbfe" }}>
              {total}{typeof max === "number" ? ` / ${max}` : ""} images
            </span>
          )}
          {pendingArr.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "2px 9px", borderRadius: 999, border: "1px solid #fde68a" }}>
              {pendingArr.length} pending
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 10, cursor: "pointer",
          border: "1.5px dashed #93c5fd", background: "#eff6ff",
          fontSize: 12, fontWeight: 700, color: "#1d4ed8",
        }}>
          + Choose images
          <input type="file" accept="image/*" multiple onChange={onAddFiles} style={{ display: "none" }} />
        </label>
        {total > 0 && (
          <button type="button" onClick={onClearAll}
            style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>
            Clear all
          </button>
        )}
      </div>
      <div style={hint}>اختر صور للمعاينة — الرفع يتم فقط عند الضغط على Save</div>

      {(remoteUrls.length > 0 || pendingArr.length > 0) && (
        <div style={thumbsWrap}>
          {remoteUrls.map((u, idx) => (
            <div key={`r_${u}_${idx}`} className="pd-thumb" style={thumbBox} onClick={() => onOpenImage(u, title)} title="Preview">
              <img src={u} alt={`${title} ${idx + 1}`} style={thumbImg} />
              <button type="button" className="pd-xbtn" style={removeBtn} title="Remove"
                onClick={(ev) => { ev.stopPropagation(); onRemoveRemote(fieldKey, u); }}>×</button>
            </div>
          ))}
          {pendingArr.map((it, idx) => (
            <div key={`p_${it.id}_${idx}`} className="pd-thumb" style={{ ...thumbBox, border: "1.5px dashed #60a5fa", background: "#eff6ff" }}
              onClick={() => onOpenImage(it.previewUrl, `${title} (Pending)`)} title="Pending — not uploaded yet">
              <img src={it.previewUrl} alt={`Pending ${idx + 1}`} style={thumbImg} />
              <button type="button" className="pd-xbtn" style={{ ...removeBtn, background: "rgba(29,78,216,0.7)" }} title="Remove"
                onClick={(ev) => { ev.stopPropagation(); onRemovePending(fieldKey, it.id); }}>×</button>
            </div>
          ))}
        </div>
      )}

      {!remoteUrls.length && !pendingArr.length && (
        <div style={{ ...hint, marginTop: 6, fontStyle: "italic" }}>No images selected</div>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────── */
export default function ProductDetailsInput() {
  const navigate = useNavigate();
  const [itemsAll, setItemsAll] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      try {
        const r1 = await fetch("/data/items.json", { cache: "no-store" });
        if (r1.ok) {
          const j = await r1.json();
          if (!cancelled && Array.isArray(j)) { setItemsAll(j); return; }
        }
        const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
        const r2 = await fetch(`${base}/data/items.json`, { cache: "no-store" });
        if (r2.ok) {
          const j = await r2.json();
          if (!cancelled && Array.isArray(j)) setItemsAll(j);
        }
      } catch (err) {
        console.error("items.json load failed:", err);
      }
    }
    loadItems();
    return () => { cancelled = true; };
  }, []);

  const [form, setForm] = useState({ ...BLANK_FORM });
  const [pendingFiles, setPendingFiles] = useState({});
  const [preview, setPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });

  const openImage = (url, title = "Image preview") => setImgModal({ open: true, url, title });
  const closeImage = () => setImgModal({ open: false, url: "", title: "" });

  useEffect(() => {
    return () => {
      try {
        Object.values(pendingFiles || {}).forEach((arr) =>
          (arr || []).forEach((it) => { if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl); })
        );
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleProductCodeChange = (e) => {
    const code = e.target.value;
    setForm((prev) => {
      let nextName = prev.productName;
      const tc = String(code || "").trim();
      if (tc && Array.isArray(itemsAll) && itemsAll.length) {
        const hit = itemsAll.find((it) => String(it.item_code || "").trim().toLowerCase() === tc.toLowerCase());
        if (hit?.description) nextName = hit.description;
      }
      return { ...prev, productCode: code, productName: nextName };
    });
  };

  const handleIngredientChange = (index, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const list = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      const cur = list[index] || { name: "", amount: "" };
      list[index] = { ...cur, [field]: value };
      return { ...prev, ingredients: list };
    });
  };

  const addIngredientRow = () =>
    setForm((prev) => ({
      ...prev,
      ingredients: [...(Array.isArray(prev.ingredients) ? prev.ingredients : []), { name: "", amount: "" }],
    }));

  const removeIngredientRow = (index) =>
    setForm((prev) => {
      const list = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      if (list.length <= 1) return { ...prev, ingredients: [{ name: "", amount: "" }] };
      list.splice(index, 1);
      return { ...prev, ingredients: list };
    });

  const addFilesToPending = (fieldKey, label, max) => (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setStatusMessage("");
    setPendingFiles((prev) => {
      const prevArr = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      const totalExisting = parseUrls(form[fieldKey]).length + prevArr.length;
      let allowed = files;
      if (typeof max === "number") {
        const remaining = Math.max(0, max - totalExisting);
        if (remaining <= 0) { setStatusMessage(`❌ Limit reached (${max}) for ${label}.`); e.target.value = ""; return prev; }
        allowed = files.slice(0, remaining);
        if (files.length > remaining)
          setStatusMessage(`ℹ️ Added ${allowed.length} of ${files.length} images for ${label} (limit ${max}).`);
        else
          setStatusMessage(`✅ Added ${allowed.length} image(s) for ${label}.`);
      } else {
        setStatusMessage(`✅ Added ${allowed.length} image(s) for ${label}.`);
      }
      const mapped = allowed.map((file) => ({ id: uid(), file, previewUrl: URL.createObjectURL(file) }));
      return { ...prev, [fieldKey]: [...prevArr, ...mapped] };
    });
    e.target.value = "";
  };

  const removePending = (fieldKey, idToRemove) =>
    setPendingFiles((prev) => {
      const arr = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      const hit = arr.find((x) => x?.id === idToRemove);
      if (hit?.previewUrl) { try { URL.revokeObjectURL(hit.previewUrl); } catch {} }
      return { ...prev, [fieldKey]: arr.filter((x) => x?.id !== idToRemove) };
    });

  const removeRemoteUrl = (fieldKey, urlToRemove) =>
    setForm((prev) => ({ ...prev, [fieldKey]: joinUrls(parseUrls(prev[fieldKey]).filter((u) => u !== urlToRemove)) }));

  const clearAllForField = (fieldKey) => {
    const arr = Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [];
    arr.forEach((it) => { if (it?.previewUrl) { try { URL.revokeObjectURL(it.previewUrl); } catch {} } });
    setPendingFiles((prev) => ({ ...prev, [fieldKey]: [] }));
    setForm((prev) => ({ ...prev, [fieldKey]: "" }));
  };

  const gp = (fieldKey, label, max) => ({
    remoteUrls: parseUrls(form[fieldKey]),
    pendingArr: Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [],
    onAddFiles: addFilesToPending(fieldKey, label, max),
    onOpenImage: openImage,
    onClearAll: () => clearAllForField(fieldKey),
    onRemoveRemote: removeRemoteUrl,
    onRemovePending: removePending,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName.trim()) { setStatusMessage("❌ Product name is required."); return; }

    setLoading(true);
    setStatusMessage("⏳ Preparing...");

    let payload = { ...form };
    const uploadedIdsByField = {};
    const uploadedUrlsByField = {};

    try {
      const anyPending = Object.values(pendingFiles || {}).some((arr) => Array.isArray(arr) && arr.length);

      if (anyPending) {
        setStatusMessage("⏳ Uploading images...");
        for (const f of FIELDS) {
          const { key: fieldKey } = f;
          const pendingArr = Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [];
          if (!pendingArr.length) continue;
          uploadedIdsByField[fieldKey] = [];
          uploadedUrlsByField[fieldKey] = [];
          for (let i = 0; i < pendingArr.length; i++) {
            setStatusMessage(`⏳ Uploading ${f.label} (${i + 1}/${pendingArr.length})...`);
            const url = await uploadViaServer(pendingArr[i].file);
            uploadedIdsByField[fieldKey].push(pendingArr[i].id);
            uploadedUrlsByField[fieldKey].push(url);
          }
          payload[fieldKey] = joinUrls([...parseUrls(payload[fieldKey]), ...uploadedUrlsByField[fieldKey]]);
        }
        setStatusMessage("⏳ Saving record...");
      }

      const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({ type: TYPE, payload }),
      });

      if (!ok || !data || data.ok === false)
        throw new Error((data && (data.error || data.message)) || `Server error ${status}`);

      const savedPayload = data.report?.payload || data.row?.payload || payload;

      setPendingFiles((prev) => {
        const next = { ...prev };
        for (const fieldKey of Object.keys(uploadedIdsByField)) {
          const ids = uploadedIdsByField[fieldKey] || [];
          const remain = (Array.isArray(next[fieldKey]) ? next[fieldKey] : []).filter((it) => {
            if (ids.includes(it.id)) { try { URL.revokeObjectURL(it.previewUrl); } catch {} return false; }
            return true;
          });
          next[fieldKey] = remain;
        }
        return next;
      });

      setPreview(savedPayload);
      setStatusMessage("✅ Product saved! Form cleared for next entry.");
      setForm({ ...BLANK_FORM });
      setPendingFiles({});
    } catch (err) {
      console.error("Save error:", err);
      try {
        const nf = { ...form };
        for (const f of FIELDS) {
          const nu = uploadedUrlsByField[f.key] || [];
          if (nu.length) nf[f.key] = joinUrls([...parseUrls(nf[f.key]), ...nu]);
        }
        setForm(nf);
        setPendingFiles((prev) => {
          const next = { ...prev };
          for (const fieldKey of Object.keys(uploadedIdsByField)) {
            const ids = uploadedIdsByField[fieldKey] || [];
            next[fieldKey] = (Array.isArray(next[fieldKey]) ? next[fieldKey] : []).filter((it) => {
              if (ids.includes(it.id)) { try { URL.revokeObjectURL(it.previewUrl); } catch {} return false; }
              return true;
            });
          }
          return next;
        });
      } catch {}
      setStatusMessage(`❌ ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  /* total pending images across all fields */
  const totalPending = Object.values(pendingFiles).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <>
      {/* ── CSS classes for hover / focus effects ── */}
      <style>{`
        .pd-input, .pd-select, .pd-textarea {
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .pd-input:focus, .pd-select:focus, .pd-textarea:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.13);
          background: #fff !important;
          outline: none;
        }
        .pd-card { transition: box-shadow .2s; }
        .pd-card:hover { box-shadow: 0 4px 20px rgba(15,23,42,0.09), 0 16px 40px rgba(15,23,42,0.06) !important; }
        .pd-thumb { transition: transform .15s; }
        .pd-thumb:hover { transform: scale(1.06); z-index: 2; }
        .pd-xbtn { transition: opacity .15s, transform .1s; }
        .pd-xbtn:hover { opacity: 1 !important; transform: scale(1.15); }
        .pd-save { transition: transform .15s, box-shadow .15s; }
        .pd-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(37,99,235,0.55) !important; }
        .pd-save:active:not(:disabled) { transform: translateY(0); }
        .pd-secondary { transition: background .15s, border-color .15s; }
        .pd-secondary:hover { background: #dbeafe !important; border-color: #60a5fa !important; }
        .pd-ingrow:hover { background: #f8fafc; border-radius: 10px; }
        @media (max-width: 980px) {
          .pd-form-layout { grid-template-columns: 1fr !important; }
        }
        .pd-ingrow { transition: background .1s; }
        .pd-file-label { transition: background .15s, border-color .15s; }
        .pd-file-label:hover { background: #dbeafe !important; border-color: #3b82f6 !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: "#0f172a",
        direction: "ltr",
        fontSize: 14,
      }}>

        {/* ── Image Preview Modal ── */}
        {imgModal.open && (
          <div onClick={closeImage} style={{
            position: "fixed", inset: 0,
            background: "rgba(2,6,23,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16,
            backdropFilter: "blur(4px)",
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: "min(960px, 95vw)", maxHeight: "90vh",
              background: "#fff", borderRadius: 20, overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                padding: "12px 16px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{imgModal.title}</span>
                <button type="button" onClick={closeImage} style={{
                  width: 30, height: 30, borderRadius: 999, border: "1.5px solid #e2e8f0",
                  background: "#f8fafc", cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#64748b",
                }} aria-label="Close">×</button>
              </div>
              <div style={{ background: "#0b1220", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <img src={imgModal.url} alt="Preview" style={{
                  maxWidth: "100%", maxHeight: "80vh", objectFit: "contain",
                  borderRadius: 12,
                }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 1720, margin: "0 auto", padding: "28px clamp(14px, 2.4vw, 36px) 48px", boxSizing: "border-box" }}>

          {/* ── Header banner ── */}
          <div style={{
            borderRadius: 22,
            padding: "26px 32px 22px",
            marginBottom: 24,
            background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0284c7 100%)",
            boxShadow: "0 8px 32px rgba(29,78,216,0.28)",
            color: "#fff",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: 999, background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -30, left: "35%", width: 120, height: 120, borderRadius: 999, background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, position: "relative" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.65, marginBottom: 6 }}>
                  Trans Emirates Livestock Trading L.L.C – Al Mawashi
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  Product Details & Specifications
                </div>
                <div style={{ fontSize: 13, opacity: 0.72, marginTop: 5 }}>
                  One product per record – assessment, registration, images & tests
                </div>
                <div style={{ marginTop: 10 }}>
                  <HaccpLinkBadge clauses={["8.5", "products"]} label="Hazard Control + Product Description" />
                </div>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(6px)",
                borderRadius: 14, padding: "10px 14px", fontSize: 12,
                border: "1px solid rgba(255,255,255,0.2)", maxWidth: 220,
                lineHeight: 1.5,
              }}>
                Images upload <strong>only</strong> when you press Save — not on selection.
              </div>
            </div>
          </div>

          {/* ── Status message ── */}
          {statusMessage && (
            <div style={{
              marginBottom: 18, padding: "12px 16px", borderRadius: 14,
              display: "flex", alignItems: "center", gap: 10,
              background: statusMessage.startsWith("✅") ? "#f0fdf4"
                : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️") ? "#eff6ff"
                : "#fef2f2",
              border: `1.5px solid ${statusMessage.startsWith("✅") ? "#bbf7d0" : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️") ? "#bfdbfe" : "#fecaca"}`,
              color: statusMessage.startsWith("✅") ? "#15803d"
                : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️") ? "#1d4ed8"
                : "#dc2626",
              fontSize: 13, fontWeight: 600,
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            }}>
              {statusMessage}
            </div>
          )}

          {/* ── Two-column layout ── */}
          <form className="pd-form-layout" onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 20, alignItems: "flex-start" }}>

            {/* ══ LEFT: form sections ══ */}
            <div>

              {/* 1. Basic product info */}
              <div className="pd-card" style={card}>
                <div style={sectionHead}>
                  <div style={numBadge}>1</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Basic Product Information</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelSt}>Product name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input className="pd-input" style={inputSt} value={form.productName} onChange={handleChange("productName")} placeholder="AUS CHILLED LAMB CARCASS" />
                  </div>
                  <div>
                    <label style={labelSt}>Product code / SKU</label>
                    <input className="pd-input" style={inputSt} value={form.productCode} onChange={handleProductCodeChange} placeholder="Internal code, barcode…" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelSt}>Brand</label>
                    <select className="pd-select" style={inputSt} value={form.brand} onChange={handleChange("brand")}>
                      <option value="">Select…</option>
                      <option value="Al Mawashi">Al Mawashi</option>
                      <option value="BBayti">BBayti</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Product type</label>
                    <select className="pd-select" style={inputSt} value={form.productType} onChange={handleChange("productType")}>
                      <option value="">Select…</option>
                      <option value="Raw">Raw</option>
                      <option value="Raw marinated">Raw marinated</option>
                      <option value="Cooked">Cooked / Ready to eat</option>
                      <option value="Frozen">Frozen</option>
                      <option value="Chilled">Chilled</option>
                      <option value="Ambient">Ambient / Shelf stable</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Country of origin</label>
                    <input className="pd-input" style={inputSt} value={form.countryOfOrigin} onChange={handleChange("countryOfOrigin")} placeholder="Australia, UAE…" />
                  </div>
                </div>
              </div>

              {/* 2. Label & shelf life */}
              <div className="pd-card" style={card}>
                <div style={sectionHead}>
                  <div style={numBadge}>2</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Label & Shelf Life</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelSt}>Storage condition</label>
                    <input className="pd-input" style={inputSt} value={form.storageCondition} onChange={handleChange("storageCondition")} placeholder="Keep chilled 0–5°C, frozen ≤ -18°C…" />
                  </div>
                  <div>
                    <label style={labelSt}>Shelf life</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 8 }}>
                      <input type="number" min="0" className="pd-input" style={inputSt} value={form.shelfLifeValue} onChange={handleChange("shelfLifeValue")} placeholder="e.g. 12" />
                      <select className="pd-select" style={inputSt} value={form.shelfLifeUnit} onChange={handleChange("shelfLifeUnit")}>
                        <option value="">Unit</option>
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Ingredients</label>
                  <div style={{
                    border: "1.5px solid #e2e8f0", borderRadius: 14,
                    overflow: "hidden", background: "#fafafa",
                  }}>
                    {(Array.isArray(form.ingredients) ? form.ingredients : []).map((row, idx) => (
                      <div key={idx} className="pd-ingrow" style={{
                        display: "grid", gridTemplateColumns: "2fr 1fr auto",
                        gap: 0, borderBottom: idx < form.ingredients.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}>
                        <input
                          className="pd-input"
                          style={{ ...inputSt, border: "none", borderRight: "1px solid #f1f5f9", borderRadius: 0, background: "transparent" }}
                          value={row.name} onChange={handleIngredientChange(idx, "name")}
                          placeholder={`Ingredient ${idx + 1}…`}
                        />
                        <input
                          className="pd-input"
                          style={{ ...inputSt, border: "none", borderRight: "1px solid #f1f5f9", borderRadius: 0, background: "transparent" }}
                          value={row.amount} onChange={handleIngredientChange(idx, "amount")}
                          placeholder="% or weight"
                        />
                        <button type="button" onClick={() => removeIngredientRow(idx)} style={{
                          padding: "0 14px", border: "none", background: "transparent",
                          fontSize: 16, color: "#94a3b8", cursor: "pointer",
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addIngredientRow} style={{
                    marginTop: 8, padding: "6px 14px", borderRadius: 999,
                    border: "1.5px dashed #93c5fd", background: "#eff6ff",
                    fontSize: 12, fontWeight: 700, color: "#1d4ed8", cursor: "pointer",
                  }}>+ Add row</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelSt}>Allergens</label>
                    <textarea className="pd-textarea" style={textareaSt} value={form.allergens} onChange={handleChange("allergens")} placeholder="Contains: milk, wheat (gluten), soy, egg…" />
                  </div>
                  <div>
                    <label style={labelSt}>Instructions for use</label>
                    <textarea className="pd-textarea" style={textareaSt} value={form.instructionsForUse} onChange={handleChange("instructionsForUse")} placeholder="Cooking instructions, reheating, handling…" />
                  </div>
                </div>
              </div>

              {/* 3. Registration & Certificates */}
              <div className="pd-card" style={card}>
                <div style={sectionHead}>
                  <div style={numBadge}>3</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Registration & Certificates</h3>
                </div>

                {/* DM */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    3.1 Dubai Municipality Registration
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelSt}>Status</label>
                      <select className="pd-select" style={inputSt} value={form.dmRegisteredStatus} onChange={handleChange("dmRegisteredStatus")}>
                        <option value="">Select…</option>
                        <option value="Registered">Registered</option>
                        <option value="Pending">Pending</option>
                        <option value="Not required">Not required</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelSt}>Registration No.</label>
                      <input className="pd-input" style={inputSt} value={form.dmRegistrationNo} onChange={handleChange("dmRegistrationNo")} placeholder="Registration ID" />
                    </div>
                    <div>
                      <label style={labelSt}>Other authorities</label>
                      <input className="pd-input" style={inputSt} value={form.otherAuthorityRegs} onChange={handleChange("otherAuthorityRegs")} placeholder="ADAFSA, ESMA…" />
                    </div>
                  </div>
                  <Gallery title="3.2 DM Registration Images" fieldKey="dmRegistrationImagesUrls" max={10} {...gp("dmRegistrationImagesUrls", "DM registration", 10)} />
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    3.3 Assessment Certificate
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelSt}>Certificate No.</label>
                      <input className="pd-input" style={inputSt} value={form.assessmentCertNo} onChange={handleChange("assessmentCertNo")} placeholder="Certificate number" />
                    </div>
                    <div>
                      <label style={labelSt}>Assessment body</label>
                      <input className="pd-input" style={inputSt} value={form.assessmentBody} onChange={handleChange("assessmentBody")} placeholder="SGS, Geochem…" />
                    </div>
                    <div>
                      <label style={labelSt}>Assessment date</label>
                      <input type="date" className="pd-input" style={inputSt} value={form.assessmentDate} onChange={handleChange("assessmentDate")} />
                    </div>
                  </div>
                  <Gallery title="3.4 Assessment Certificate Images" fieldKey="assessmentCertImagesUrls" max={10} {...gp("assessmentCertImagesUrls", "Assessment certificate", 10)} />
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    3.5 Halal Certificate
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelSt}>Certificate No.</label>
                      <input className="pd-input" style={inputSt} value={form.halalCertNo} onChange={handleChange("halalCertNo")} placeholder="Halal reference" />
                    </div>
                    <div>
                      <label style={labelSt}>Halal CB</label>
                      <input className="pd-input" style={inputSt} value={form.halalCB} onChange={handleChange("halalCB")} placeholder="IHC, ESMA-approved body" />
                    </div>
                    <div>
                      <label style={labelSt}>Expiry date</label>
                      <input type="date" className="pd-input" style={inputSt} value={form.halalCertExpiry} onChange={handleChange("halalCertExpiry")} />
                    </div>
                  </div>
                  <Gallery title="3.6 Halal Certificate Images" fieldKey="halalCertImagesUrls" max={10} {...gp("halalCertImagesUrls", "Halal certificate", 10)} />
                  <div style={{ marginTop: 14 }}>
                    <Gallery title="3.7 Nutrition Facts Images" fieldKey="nutritionFactsImagesUrls" max={10} {...gp("nutritionFactsImagesUrls", "Nutrition facts", 10)} />
                  </div>
                </div>
              </div>

              {/* 4. Tests */}
              <div className="pd-card" style={card}>
                <div style={sectionHead}>
                  <div style={numBadge}>4</div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Tests & Analysis</h3>
                </div>
                <Gallery title="4.1 Test Images" fieldKey="testImagesUrls" max={10} {...gp("testImagesUrls", "Test images", 10)} />
              </div>
            </div>

            {/* ══ RIGHT: sticky save panel ══ */}
            <div style={{ position: "sticky", top: 24 }}>

              {/* Save card */}
              <div className="pd-card" style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: loading ? "#f59e0b" : "#22c55e" }} />
                  Save Product
                </div>

                {/* Mini preview */}
                {form.productName ? (
                  <div style={{
                    padding: "12px 14px", borderRadius: 14, marginBottom: 14,
                    background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                    border: "1.5px solid #dbeafe",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a", marginBottom: 3 }}>{form.productName}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                      {form.productCode && <span style={{ fontSize: 11, color: "#64748b" }}>#{form.productCode}</span>}
                      {form.brand && <span style={{ fontSize: 11, color: "#64748b" }}>{form.brand}</span>}
                      {form.productType && <span style={{ fontSize: 11, color: "#64748b" }}>{form.productType}</span>}
                      {form.countryOfOrigin && <span style={{ fontSize: 11, color: "#64748b" }}>🌍 {form.countryOfOrigin}</span>}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1.5px dashed #e2e8f0", marginBottom: 14, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                    Fill in product name to start
                  </div>
                )}

                {/* Image counts */}
                {FIELDS.some((f) => parseUrls(form[f.key]).length + (pendingFiles[f.key] || []).length > 0) && (
                  <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Attached images</div>
                    {FIELDS.map((f) => {
                      const remote = parseUrls(form[f.key]).length;
                      const pending = (pendingFiles[f.key] || []).length;
                      const total = remote + pending;
                      if (!total) return null;
                      return (
                        <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{f.label}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {remote > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "1px 7px", borderRadius: 999, border: "1px solid #bbf7d0" }}>{remote}</span>}
                            {pending > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "1px 7px", borderRadius: 999, border: "1px solid #fde68a" }}>+{pending}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPending > 0 && (
                  <div style={{ fontSize: 11, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "6px 10px", marginBottom: 12, fontWeight: 600 }}>
                    {totalPending} image(s) pending upload — will upload on Save
                  </div>
                )}

                <button type="submit" disabled={loading} className="pd-save" style={{
                  width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
                  fontWeight: 800, fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  background: "linear-gradient(135deg, #1d4ed8, #2563eb, #0284c7)",
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(37,99,235,0.38)",
                  marginBottom: 8,
                }}>
                  {loading ? "Saving…" : "Save product to server"}
                </button>

                <button type="button" className="pd-secondary" onClick={() => navigate("/haccp-iso/product-details/view")} style={{
                  width: "100%", padding: "10px 0", borderRadius: 14,
                  border: "1.5px solid #bfdbfe",
                  background: "#eff6ff",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#1d4ed8",
                }}>
                  View saved products
                </button>

                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, textAlign: "center" }}>
                  الصور لا تُرفع عند الاختيار — تُرفع فقط عند Save
                </div>
              </div>

              {/* 5. Product images */}
              <div className="pd-card" style={{ ...card, marginBottom: 14 }}>
                <div style={sectionHead}>
                  <div style={numBadge}>5</div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Product Images</h3>
                </div>
                <Gallery title="Product images" fieldKey="productImageUrls" max={null} {...gp("productImageUrls", "Product images", null)} />
              </div>

              {/* Last saved preview */}
              {preview && (
                <div className="pd-card" style={card}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✅</span> Last saved
                  </div>
                  <div style={{
                    fontSize: 11, maxHeight: 220, overflow: "auto",
                    background: "#f8fafc", borderRadius: 10, padding: "8px 10px",
                    border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word",
                    color: "#475569",
                  }}>
                    {JSON.stringify(preview, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
