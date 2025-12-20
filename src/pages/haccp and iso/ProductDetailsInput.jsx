// src/pages/haccp and iso/ProductDetailsInput.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===== API base (aligned with the rest of the project) ===== */
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
const TYPE = "product_details";

/* Helper for uploading images via server (ONLY on Save) */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data || data.ok === false) {
    throw new Error(data?.error || data?.message || "Upload failed");
  }

  return data.optimized_url || data.url || data.secure_url;
}

/* Helper for JSON fetch */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/* ===== Helpers for URL lists ===== */
function parseUrls(multiline) {
  return String(multiline || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function joinUrls(arr) {
  return (Array.isArray(arr) ? arr : []).filter(Boolean).join("\n");
}

/* ===== ID helper ===== */
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * pendingFiles structure:
 * {
 *   fieldKey: [{ id, file, previewUrl }]
 * }
 */

export default function ProductDetailsInput() {
  const navigate = useNavigate();

  /* ===== Load items.json to auto-fill product name from code ===== */
  const [itemsAll, setItemsAll] = useState([]); // [{ item_code, description }]

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        const r1 = await fetch("/data/items.json", { cache: "no-store" });
        if (r1.ok) {
          const j = await r1.json();
          if (!cancelled && Array.isArray(j)) {
            setItemsAll(j);
            return;
          }
        }

        const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
        const r2 = await fetch(`${base}/data/items.json`, { cache: "no-store" });
        if (r2.ok) {
          const j = await r2.json();
          if (!cancelled && Array.isArray(j)) {
            setItemsAll(j);
          }
        }
      } catch (err) {
        console.error("items.json load failed in ProductDetailsInput:", err);
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState({
    // Basic product information
    productName: "",
    productCode: "",
    brand: "",
    productType: "",
    countryOfOrigin: "",

    // Label & shelf life
    storageCondition: "",
    shelfLifeValue: "",
    shelfLifeUnit: "",
    ingredients: [{ name: "", amount: "" }],
    allergens: "",
    instructionsForUse: "",

    // Registration & certificates
    dmRegisteredStatus: "",
    dmRegistrationNo: "",
    otherAuthorityRegs: "",
    assessmentCertNo: "",
    assessmentBody: "",
    assessmentDate: "",
    halalCertNo: "",
    halalCB: "",
    halalCertExpiry: "",

    // Images URLs (stored but not shown)
    dmRegistrationImagesUrls: "",
    assessmentCertImagesUrls: "",
    halalCertImagesUrls: "",
    nutritionFactsImagesUrls: "",
    productImageUrls: "",
    testImagesUrls: "",
  });

  const [pendingFiles, setPendingFiles] = useState({});
  const [preview, setPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ===== Image modal ===== */
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });
  const openImage = (url, title = "Image preview") =>
    setImgModal({ open: true, url, title });
  const closeImage = () => setImgModal({ open: false, url: "", title: "" });

  /* ===== Fields config (limits) ===== */
  const FIELDS = useMemo(
    () => [
      { key: "dmRegistrationImagesUrls", label: "DM registration images", max: 10 },
      { key: "assessmentCertImagesUrls", label: "Assessment certificate images", max: 10 },
      { key: "halalCertImagesUrls", label: "Halal certificate images", max: 10 },
      { key: "nutritionFactsImagesUrls", label: "Nutrition facts images", max: 10 },
      { key: "testImagesUrls", label: "Test images", max: 10 },
      { key: "productImageUrls", label: "Product images", max: null }, // no limit
    ],
    []
  );

  /* ===== cleanup object URLs on unmount ===== */
  useEffect(() => {
    return () => {
      try {
        Object.values(pendingFiles || {}).forEach((arr) => {
          (arr || []).forEach((it) => {
            if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
          });
        });
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  // ✅ Product code: auto fill name from items.json
  const handleProductCodeChange = (e) => {
    const code = e.target.value;

    setForm((prev) => {
      let nextName = prev.productName;
      const trimmedCode = String(code || "").trim();

      if (trimmedCode && Array.isArray(itemsAll) && itemsAll.length) {
        const hit = itemsAll.find(
          (it) =>
            String(it.item_code || "").trim().toLowerCase() ===
            trimmedCode.toLowerCase()
        );
        if (hit && hit.description) {
          nextName = hit.description;
        }
      }

      return {
        ...prev,
        productCode: code,
        productName: nextName,
      };
    });
  };

  // Ingredients handlers
  const handleIngredientChange = (index, field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const list = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      const current = list[index] || { name: "", amount: "" };
      list[index] = { ...current, [field]: value };
      return { ...prev, ingredients: list };
    });
  };

  const addIngredientRow = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [
        ...(Array.isArray(prev.ingredients) ? prev.ingredients : []),
        { name: "", amount: "" },
      ],
    }));
  };

  const removeIngredientRow = (index) => {
    setForm((prev) => {
      const list = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      if (list.length <= 1) return { ...prev, ingredients: [{ name: "", amount: "" }] };
      list.splice(index, 1);
      return { ...prev, ingredients: list };
    });
  };

  /* ===== Add selected files (NO upload here) ===== */
  const addFilesToPending = (fieldKey, label, max) => (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setStatusMessage(""); // clear previous message

    setPendingFiles((prev) => {
      const prevArr = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      const existingRemote = parseUrls(form[fieldKey]).length;
      const existingPending = prevArr.length;
      const totalExisting = existingRemote + existingPending;

      let allowed = files;

      if (typeof max === "number") {
        const remaining = Math.max(0, max - totalExisting);
        if (remaining <= 0) {
          setStatusMessage(`❌ Maximum limit reached (${max}) for ${label}.`);
          e.target.value = "";
          return prev;
        }
        allowed = files.slice(0, remaining);
        if (files.length > remaining) {
          setStatusMessage(
            `ℹ️ Added ${allowed.length} image(s) for ${label}. Skipped ${
              files.length - remaining
            } file(s) (limit is ${max}).`
          );
        } else {
          setStatusMessage(`✅ Added ${allowed.length} image(s) for ${label} (pending upload).`);
        }
      } else {
        setStatusMessage(`✅ Added ${allowed.length} image(s) for ${label} (pending upload).`);
      }

      const mapped = allowed.map((file) => ({
        id: uid(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      return {
        ...prev,
        [fieldKey]: [...prevArr, ...mapped],
      };
    });

    e.target.value = "";
  };

  /* ===== Remove pending file ===== */
  const removePending = (fieldKey, idToRemove) => {
    setPendingFiles((prev) => {
      const arr = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      const hit = arr.find((x) => x?.id === idToRemove);
      if (hit?.previewUrl) {
        try {
          URL.revokeObjectURL(hit.previewUrl);
        } catch {}
      }
      const next = arr.filter((x) => x?.id !== idToRemove);
      return { ...prev, [fieldKey]: next };
    });
  };

  /* ===== Remove remote URL (already stored in form) ===== */
  const removeRemoteUrl = (fieldKey, urlToRemove) => {
    setForm((prev) => {
      const arr = parseUrls(prev[fieldKey]);
      const next = arr.filter((u) => u !== urlToRemove);
      return { ...prev, [fieldKey]: joinUrls(next) };
    });
  };

  /* ===== Clear all images (remote + pending) for a field ===== */
  const clearAllForField = (fieldKey) => {
    // revoke previews
    const arr = Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [];
    arr.forEach((it) => {
      if (it?.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      }
    });

    setPendingFiles((prev) => ({ ...prev, [fieldKey]: [] }));
    setForm((prev) => ({ ...prev, [fieldKey]: "" }));
  };

  const uploadingSummaryText = (payload) => {
    // show count for UX
    const parts = FIELDS.map((f) => {
      const remote = parseUrls(payload[f.key]).length;
      const pend = Array.isArray(pendingFiles[f.key]) ? pendingFiles[f.key].length : 0;
      return `${f.label}: ${remote + pend}`;
    });
    return parts.join(" | ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.productName.trim()) {
      setStatusMessage("❌ Please enter at least the product name.");
      setPreview(null);
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Preparing to upload images (only on Save) ...");

    // we will build payload with uploaded URLs
    let payload = { ...form };
    // track which pending items successfully uploaded, so we can remove them from pending
    const uploadedIdsByField = {};
    const uploadedUrlsByField = {};

    try {
      // 1) Upload all pending files field-by-field
      const anyPending = Object.values(pendingFiles || {}).some(
        (arr) => Array.isArray(arr) && arr.length
      );

      if (anyPending) {
        setStatusMessage(`⏳ Uploading pending images... (${uploadingSummaryText(payload)})`);

        for (const f of FIELDS) {
          const fieldKey = f.key;
          const pendingArr = Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [];
          if (!pendingArr.length) continue;

          uploadedIdsByField[fieldKey] = [];
          uploadedUrlsByField[fieldKey] = [];

          for (let i = 0; i < pendingArr.length; i++) {
            const it = pendingArr[i];
            setStatusMessage(
              `⏳ Uploading ${f.label} (${i + 1}/${pendingArr.length})...`
            );

            const url = await uploadViaServer(it.file);

            uploadedIdsByField[fieldKey].push(it.id);
            uploadedUrlsByField[fieldKey].push(url);
          }

          // merge into payload
          const existingRemote = parseUrls(payload[fieldKey]);
          payload[fieldKey] = joinUrls([...existingRemote, ...uploadedUrlsByField[fieldKey]]);
        }

        setStatusMessage("✅ Images uploaded. Now saving the report...");
      } else {
        setStatusMessage("⏳ No pending images. Saving the report...");
      }

      // 2) Save report
      const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          type: TYPE,
          payload,
        }),
      });

      if (!ok || !data || data.ok === false) {
        throw new Error(
          (data && (data.error || data.message)) || `Server error (status ${status})`
        );
      }

      const savedPayload = data.report?.payload || data.row?.payload || payload;

      // 3) Commit local form to reflect saved payload (includes URLs)
      setForm((prev) => ({ ...prev, ...savedPayload }));

      // 4) Remove uploaded pending items (and revoke their preview URLs)
      setPendingFiles((prev) => {
        const next = { ...prev };

        for (const fieldKey of Object.keys(uploadedIdsByField)) {
          const ids = uploadedIdsByField[fieldKey] || [];
          const arr = Array.isArray(next[fieldKey]) ? [...next[fieldKey]] : [];
          const remain = [];

          for (const it of arr) {
            if (ids.includes(it.id)) {
              if (it?.previewUrl) {
                try {
                  URL.revokeObjectURL(it.previewUrl);
                } catch {}
              }
            } else {
              remain.push(it);
            }
          }

          next[fieldKey] = remain;
        }
        return next;
      });

      setPreview(savedPayload);
      setStatusMessage("✅ Product details saved successfully on the server.");
    } catch (err) {
      console.error("Save error:", err);

      // If some uploads succeeded before failure, we keep payload URLs locally to avoid re-upload duplicates
      try {
        const nextForm = { ...form };
        for (const f of FIELDS) {
          const fieldKey = f.key;
          const newUrls = uploadedUrlsByField[fieldKey] || [];
          if (newUrls.length) {
            nextForm[fieldKey] = joinUrls([...parseUrls(nextForm[fieldKey]), ...newUrls]);
          }
        }
        setForm(nextForm);

        // remove only uploaded pending items
        setPendingFiles((prev) => {
          const next = { ...prev };
          for (const fieldKey of Object.keys(uploadedIdsByField)) {
            const ids = uploadedIdsByField[fieldKey] || [];
            const arr = Array.isArray(next[fieldKey]) ? [...next[fieldKey]] : [];
            const remain = [];
            for (const it of arr) {
              if (ids.includes(it.id)) {
                if (it?.previewUrl) {
                  try {
                    URL.revokeObjectURL(it.previewUrl);
                  } catch {}
                }
              } else remain.push(it);
            }
            next[fieldKey] = remain;
          }
          return next;
        });
      } catch {}

      setStatusMessage(`❌ Error: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Styles ===== */
  const sectionBox = {
    borderRadius: 18,
    padding: "18px 20px",
    marginBottom: 18,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
    boxShadow: "0 10px 26px rgba(15,23,42,0.08)",
    border: "1px solid rgba(148,163,184,0.4)",
    borderLeft: "4px solid #3b82f6",
  };

  const labelStyle = {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 4,
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid #000000",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.9)",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 70,
    resize: "vertical",
  };

  const smallHint = {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  };

  const thumbsWrap = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  };

  const thumbBox = {
    width: 86,
    height: 86,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.55)",
    background: "#fff",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
    cursor: "pointer",
  };

  const thumbImg = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  const removeBtn = {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.55)",
    background: "rgba(254,242,242,0.95)",
    color: "#b91c1c",
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: "20px",
    textAlign: "center",
  };

  const badge = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(255,255,255,0.75)",
    fontSize: 12,
    color: "#334155",
    fontWeight: 700,
  };

  /* ===== Gallery component (shows remote + pending previews, NO textarea, NO upload here) ===== */
  const Gallery = useMemo(() => {
    return function Gallery({ title, fieldKey, max, labelForStatus }) {
      const remoteUrls = parseUrls(form[fieldKey]);
      const pendingArr = Array.isArray(pendingFiles[fieldKey]) ? pendingFiles[fieldKey] : [];
      const total = remoteUrls.length + pendingArr.length;

      return (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <label style={labelStyle}>
              {title}{" "}
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {typeof max === "number" ? `(max ${max})` : `(no limit)`}
              </span>
            </label>

            <div style={badge}>
              Total: {total}{" "}
              {typeof max === "number" ? `/ ${max}` : ""}
              {pendingArr.length ? (
                <span style={{ color: "#1d4ed8" }}>
                  | Pending: {pendingArr.length} (not uploaded)
                </span>
              ) : null}
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={addFilesToPending(fieldKey, labelForStatus || title, max)}
            style={{ marginBottom: 6, fontSize: 13 }}
          />

          <div style={smallHint}>
            اختر صور للمعاينة فقط. الرفع يتم عند الضغط على <b>Save</b>.
          </div>

          {(remoteUrls.length > 0 || pendingArr.length > 0) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => clearAllForField(fieldKey)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(239,68,68,0.35)",
                  background: "rgba(254,242,242,0.85)",
                  color: "#b91c1c",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Clear all
              </button>

              <div style={{ fontSize: 12, color: "#64748b" }}>
                (Links are stored internally only after Save)
              </div>
            </div>
          )}

          {(remoteUrls.length > 0 || pendingArr.length > 0) && (
            <div style={thumbsWrap}>
              {/* Remote */}
              {remoteUrls.map((u, idx) => (
                <div
                  key={`remote_${u}_${idx}`}
                  style={thumbBox}
                  onClick={() => openImage(u, title)}
                  title="Click to preview"
                >
                  <img src={u} alt={`${title} ${idx + 1}`} style={thumbImg} />
                  <button
                    type="button"
                    style={removeBtn}
                    title="Remove"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeRemoteUrl(fieldKey, u);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Pending (local previews) */}
              {pendingArr.map((it, idx) => (
                <div
                  key={`pending_${it.id}_${idx}`}
                  style={{
                    ...thumbBox,
                    border: "1px dashed rgba(29,78,216,0.55)",
                  }}
                  onClick={() => openImage(it.previewUrl, `${title} (Pending)`)}
                  title="Pending (not uploaded) - Click to preview"
                >
                  <img
                    src={it.previewUrl}
                    alt={`Pending ${title} ${idx + 1}`}
                    style={thumbImg}
                  />
                  <button
                    type="button"
                    style={removeBtn}
                    title="Remove"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removePending(fieldKey, it.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!remoteUrls.length && !pendingArr.length && (
            <div style={{ ...smallHint, marginTop: 8 }}>No images selected.</div>
          )}
        </div>
      );
    };
  }, [form, pendingFiles]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "26px 20px 34px",
        background:
          "radial-gradient(circle at top left, #bfdbfe 0, #e0f2fe 30%, #fef3c7 60%, #ffffff 100%)",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: "#0f172a",
        direction: "ltr",
        fontSize: 14,
      }}
    >
      {/* ===== Image Preview Modal ===== */}
      {imgModal.open && (
        <div
          onClick={closeImage}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 96vw)",
              maxHeight: "88vh",
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(135deg,#eff6ff,#ffffff)",
              }}
            >
              <div style={{ fontWeight: 900, color: "#1e3a8a" }}>
                {imgModal.title || "Image Preview"}
              </div>
              <button
                type="button"
                onClick={closeImage}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0b1220",
              }}
            >
              <img
                src={imgModal.url}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "78vh",
                  objectFit: "contain",
                  borderRadius: 12,
                  background: "#fff",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top left company name */}
        <div
          style={{
            marginBottom: 10,
            fontSize: 13,
            fontWeight: 700,
            color: "#1e3a8a",
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 12px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(191,219,254,0.9), rgba(224,231,255,0.95))",
            border: "1px solid rgba(129,140,248,0.6)",
          }}
        >
          Trans Emirates Livestock Trading L.L.C – Al Mawashi
        </div>

        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background:
                  "linear-gradient(120deg, #1d4ed8, #0ea5e9, #22c55e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Product Details & Specifications
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>
              One product per record – assessment, registration, images & tests
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 13,
              color: "#64748b",
              maxWidth: 300,
              background: "rgba(255,255,255,0.8)",
              padding: "9px 11px",
              borderRadius: 12,
              border: "1px solid rgba(209,213,219,0.7)",
            }}
          >
            Images will NOT upload on selection. Upload happens only when you Save.
          </div>
        </header>

        {/* Status message */}
        {statusMessage && (
          <div
            style={{
              marginBottom: 16,
              padding: "11px 13px",
              borderRadius: 12,
              background: statusMessage.startsWith("✅")
                ? "linear-gradient(135deg,#ecfdf3,#dcfce7)"
                : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️")
                ? "linear-gradient(135deg,#eff6ff,#dbeafe)"
                : "linear-gradient(135deg,#fef2f2,#fee2e2)",
              color: statusMessage.startsWith("✅")
                ? "#166534"
                : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️")
                ? "#1d4ed8"
                : "#b91c1c",
              fontSize: 13,
              border: statusMessage.startsWith("✅")
                ? "1px solid #bbf7d0"
                : statusMessage.startsWith("⏳") || statusMessage.startsWith("ℹ️")
                ? "1px solid #bfdbfe"
                : "1px solid #fecaca",
              boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
            }}
          >
            {statusMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          <div>
            {/* 1. Basic information */}
            <section style={sectionBox}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#1e3a8a" }}>
                1. Basic Product Information
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>
                    1.1 Product name <span style={{ color: "#b91c1c" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    value={form.productName}
                    onChange={handleChange("productName")}
                    placeholder="Example: AUS CHILLED LAMB CARCASS"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Product code / SKU</label>
                  <input
                    style={inputStyle}
                    value={form.productCode}
                    onChange={handleProductCodeChange}
                    placeholder="Internal code, barcode..."
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>1.2 Brand</label>
                  <select style={inputStyle} value={form.brand} onChange={handleChange("brand")}>
                    <option value="">Select brand...</option>
                    <option value="Al Mawashi">Al Mawashi</option>
                    <option value="BBayti">BBayti</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Product type</label>
                  <select style={inputStyle} value={form.productType} onChange={handleChange("productType")}>
                    <option value="">Select...</option>
                    <option value="Raw">Raw</option>
                    <option value="Raw marinated">Raw marinated</option>
                    <option value="Cooked">Cooked / Ready to eat</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Chilled">Chilled</option>
                    <option value="Ambient">Ambient / Shelf stable</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>1.3 Country of origin</label>
                <input
                  style={inputStyle}
                  value={form.countryOfOrigin}
                  onChange={handleChange("countryOfOrigin")}
                  placeholder="Australia, UAE..."
                />
              </div>
            </section>

            {/* 2. Label & shelf life */}
            <section style={sectionBox}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#1e3a8a" }}>
                2. Label & Shelf Life
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>2.1 Storage condition</label>
                  <input
                    style={inputStyle}
                    value={form.storageCondition}
                    onChange={handleChange("storageCondition")}
                    placeholder="Keep chilled 0–5°C, frozen ≤ -18°C..."
                  />
                </div>

                <div>
                  <label style={labelStyle}>Shelf life</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      min="0"
                      style={inputStyle}
                      value={form.shelfLifeValue}
                      onChange={handleChange("shelfLifeValue")}
                      placeholder="e.g. 12"
                    />
                    <select style={inputStyle} value={form.shelfLifeUnit} onChange={handleChange("shelfLifeUnit")}>
                      <option value="">Unit</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                  <div style={smallHint}>Example: 12 months, 10 days, etc.</div>
                </div>
              </div>

              {/* Ingredients */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>2.2 Ingredients</label>

                {(Array.isArray(form.ingredients) ? form.ingredients : []).map((row, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr auto",
                      gap: 8,
                      marginBottom: 6,
                      alignItems: "center",
                    }}
                  >
                    <input
                      style={inputStyle}
                      value={row.name}
                      onChange={handleIngredientChange(index, "name")}
                      placeholder="Ingredient name..."
                    />
                    <input
                      style={inputStyle}
                      value={row.amount}
                      onChange={handleIngredientChange(index, "amount")}
                      placeholder="% or weight..."
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addIngredientRow}
                  style={{
                    marginTop: 6,
                    padding: "7px 13px",
                    borderRadius: 999,
                    border: "1px solid #cbd5f5",
                    background: "linear-gradient(135deg,#eff6ff,#e0f2fe)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add ingredient row
                </button>

                <div style={smallHint}>One ingredient per row with its percentage or weight.</div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>2.3 Allergens</label>
                <textarea
                  style={textareaStyle}
                  value={form.allergens}
                  onChange={handleChange("allergens")}
                  placeholder="Contains: milk, wheat (gluten), soy, egg..."
                />
              </div>

              <div>
                <label style={labelStyle}>2.4 Instructions for use</label>
                <textarea
                  style={textareaStyle}
                  value={form.instructionsForUse}
                  onChange={handleChange("instructionsForUse")}
                  placeholder="Cooking instructions, reheating, handling..."
                />
              </div>
            </section>

            {/* 3. Registration & certificates */}
            <section style={sectionBox}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#1e3a8a" }}>
                3. Registration & Certificates
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 6 }}>
                <div>
                  <label style={labelStyle}>3.1 DM registration status</label>
                  <select
                    style={inputStyle}
                    value={form.dmRegisteredStatus}
                    onChange={handleChange("dmRegisteredStatus")}
                  >
                    <option value="">Select...</option>
                    <option value="Registered">Registered</option>
                    <option value="Pending">Pending</option>
                    <option value="Not required">Not required</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>DM registration No.</label>
                  <input
                    style={inputStyle}
                    value={form.dmRegistrationNo}
                    onChange={handleChange("dmRegistrationNo")}
                    placeholder="Product registration ID"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Other authorities</label>
                  <input
                    style={inputStyle}
                    value={form.otherAuthorityRegs}
                    onChange={handleChange("otherAuthorityRegs")}
                    placeholder="e.g. ADAFSA, ESMA..."
                  />
                </div>
              </div>

              <Gallery
                title="DM registration images"
                fieldKey="dmRegistrationImagesUrls"
                labelForStatus="DM registration"
                max={10}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 6 }}>
                <div>
                  <label style={labelStyle}>3.3 Assessment certificate No.</label>
                  <input
                    style={inputStyle}
                    value={form.assessmentCertNo}
                    onChange={handleChange("assessmentCertNo")}
                    placeholder="Certificate number"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Assessment body</label>
                  <input
                    style={inputStyle}
                    value={form.assessmentBody}
                    onChange={handleChange("assessmentBody")}
                    placeholder="e.g. SGS, Geochem..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Assessment date <span style={{ fontSize: 11 }}> (يوم/شهر/سنة)</span>
                  </label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.assessmentDate}
                    onChange={handleChange("assessmentDate")}
                  />
                </div>
              </div>

              <Gallery
                title="Assessment certificate images"
                fieldKey="assessmentCertImagesUrls"
                labelForStatus="Assessment certificate"
                max={10}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 6 }}>
                <div>
                  <label style={labelStyle}>3.5 Halal certificate No.</label>
                  <input
                    style={inputStyle}
                    value={form.halalCertNo}
                    onChange={handleChange("halalCertNo")}
                    placeholder="Halal certificate reference"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Halal CB</label>
                  <input
                    style={inputStyle}
                    value={form.halalCB}
                    onChange={handleChange("halalCB")}
                    placeholder="e.g. IHC, ESMA-approved body"
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Halal certificate expiry <span style={{ fontSize: 11 }}> (يوم/شهر/سنة)</span>
                  </label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.halalCertExpiry}
                    onChange={handleChange("halalCertExpiry")}
                  />
                </div>
              </div>

              <Gallery
                title="Halal certificate images"
                fieldKey="halalCertImagesUrls"
                labelForStatus="Halal certificate"
                max={10}
              />

              <Gallery
                title="Nutrition facts images"
                fieldKey="nutritionFactsImagesUrls"
                labelForStatus="Nutrition facts"
                max={10}
              />
            </section>

            {/* 4. Tests */}
            <section style={sectionBox}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#1e3a8a" }}>
                4. Tests & Analysis
              </h3>

              <Gallery title="Test images" fieldKey="testImagesUrls" labelForStatus="Test images" max={10} />
            </section>
          </div>

          {/* Attachments + Save */}
          <div>
            <section style={sectionBox}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: "#1e3a8a" }}>
                5. Attachments – Product Images
              </h3>

              <Gallery
                title="Product images"
                fieldKey="productImageUrls"
                labelForStatus="Product images"
                max={null}
              />
            </section>

            <section style={sectionBox}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 999,
                  border: "none",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  background: "linear-gradient(135deg, #4f46e5, #2563eb, #0ea5e9)",
                  color: "#ffffff",
                  boxShadow: "0 12px 30px rgba(37,99,235,0.5)",
                  marginBottom: 8,
                }}
              >
                {loading ? "Saving (uploading images now)..." : "Save product to server"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/haccp-iso/product-details/view")}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 999,
                  border: "1px solid #93c5fd",
                  background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#1d4ed8",
                }}
              >
                View saved products
              </button>

              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                ✅ الصور لا تُرفع عند الاختيار — تُرفع فقط عند الضغط على Save.
              </div>
            </section>

            {preview && (
              <section style={sectionBox}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: "#1e3a8a" }}>
                  Preview – Saved Product Payload
                </h3>
                <div
                  style={{
                    fontSize: 12,
                    maxHeight: 260,
                    overflow: "auto",
                    background: "#f9fafb",
                    borderRadius: 10,
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(preview, null, 2)}
                </div>
              </section>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
