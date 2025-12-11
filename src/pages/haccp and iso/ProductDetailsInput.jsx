// src/pages/haccp and iso/ProductDetailsInput.jsx
import React, { useState, useEffect } from "react";
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

/* Helper for uploading images via server */
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

export default function ProductDetailsInput() {
  const navigate = useNavigate();

  /* ===== Load items.json to auto-fill product name from code ===== */
  const [itemsAll, setItemsAll] = useState([]); // [{ item_code, description }]

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        // المحاولة الأولى: /data/items.json
        const r1 = await fetch("/data/items.json", { cache: "no-store" });
        if (r1.ok) {
          const j = await r1.json();
          if (!cancelled && Array.isArray(j)) {
            setItemsAll(j);
            return;
          }
        }

        // fallback: PUBLIC_URL/data/items.json
        const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
        const r2 = await fetch(`${base}/data/items.json`, {
          cache: "no-store",
        });
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
    productType: "", // Raw / Raw marinated / Cooked / Frozen / Chilled / Ambient
    countryOfOrigin: "",

    // Label & shelf life
    storageCondition: "",
    shelfLifeValue: "",
    shelfLifeUnit: "",
    ingredients: [
      {
        name: "",
        amount: "",
      },
    ],
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

    // Images for each registration line
    dmRegistrationImagesUrls: "",
    assessmentCertImagesUrls: "",
    halalCertImagesUrls: "",
    nutritionFactsImagesUrls: "",

    // Product images (URLs)
    productImageUrls: "",

    // Test images (URLs) – max 10 images
    testImagesUrls: "",
  });

  const [preview, setPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState(null); // "images" | "test-images" | section name

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  // ✅ خاص لـ Product code: يجيب الاسم من items.json
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
      const list = Array.isArray(prev.ingredients)
        ? [...prev.ingredients]
        : [];
      const current = list[index] || { name: "", amount: "" };
      list[index] = {
        ...current,
        [field]: value,
      };
      return {
        ...prev,
        ingredients: list,
      };
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
      const list = Array.isArray(prev.ingredients)
        ? [...prev.ingredients]
        : [];
      if (list.length <= 1) {
        return {
          ...prev,
          ingredients: [{ name: "", amount: "" }],
        };
      }
      list.splice(index, 1);
      return {
        ...prev,
        ingredients: list,
      };
    });
  };

  // Upload multiple product images
  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingField("images");
    setStatusMessage("⏳ Uploading product images to the server...");

    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadViaServer(file);
        urls.push(url);
      }

      setForm((prev) => ({
        ...prev,
        productImageUrls: (
          (prev.productImageUrls || "").trim() +
          (prev.productImageUrls ? "\n" : "") +
          urls.join("\n")
        ).trim(),
      }));

      setStatusMessage("✅ Product images uploaded and URLs stored in the form.");
    } catch (err) {
      console.error("Product images upload error:", err);
      setStatusMessage(
        `❌ Error while uploading product images: ${err.message || "Upload error"}`
      );
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  // Upload multiple test images – max 10
  const handleTestImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const existing = (form.testImagesUrls || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (existing.length >= 10) {
      setStatusMessage("❌ Maximum limit reached (10 test images).");
      e.target.value = "";
      return;
    }

    const remainingSlots = 10 - existing.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setUploadingField("test-images");
    setStatusMessage("⏳ Uploading test report images to the server...");

    try {
      const newUrls = [];
      for (const file of filesToUpload) {
        const url = await uploadViaServer(file);
        newUrls.push(url);
      }

      const combined = [...existing, ...newUrls];

      setForm((prev) => ({
        ...prev,
        testImagesUrls: combined.join("\n"),
      }));

      if (files.length > remainingSlots) {
        setStatusMessage(
          `✅ Uploaded ${newUrls.length} test images, skipped ${
            files.length - remainingSlots
          } file(s) because the maximum limit is 10 images.`
        );
      } else {
        setStatusMessage("✅ Test report images uploaded and URLs stored.");
      }
    } catch (err) {
      console.error("Test images upload error:", err);
      setStatusMessage(
        `❌ Error while uploading test images: ${err.message || "Upload error"}`
      );
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  /* 🔹 upload handler for registration lines (10 images per line) */
  const handleSectionImagesUpload =
    (fieldKey, labelForStatus) =>
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const existing = (form[fieldKey] || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (existing.length >= 10) {
        setStatusMessage(`❌ Maximum limit reached (10 images) for ${labelForStatus}.`);
        e.target.value = "";
        return;
      }

      const remainingSlots = 10 - existing.length;
      const filesToUpload = files.slice(0, remainingSlots);

      setUploadingField(labelForStatus);
      setStatusMessage(`⏳ Uploading images for ${labelForStatus}...`);

      try {
        const newUrls = [];
        for (const file of filesToUpload) {
          const url = await uploadViaServer(file);
          newUrls.push(url);
        }

        const combined = [...existing, ...newUrls];

        setForm((prev) => ({
          ...prev,
          [fieldKey]: combined.join("\n"),
        }));

        if (files.length > remainingSlots) {
          setStatusMessage(
            `✅ Uploaded ${newUrls.length} images for ${labelForStatus}, skipped ${
              files.length - remainingSlots
            } file(s) (limit is 10).`
          );
        } else {
          setStatusMessage(`✅ Images for ${labelForStatus} uploaded and URLs stored.`);
        }
      } catch (err) {
        console.error(`Section images upload error (${labelForStatus}):`, err);
        setStatusMessage(
          `❌ Error while uploading images for ${labelForStatus}: ${
            err.message || "Upload error"
          }`
        );
      } finally {
        setUploadingField(null);
        e.target.value = "";
      }
    };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.productName.trim()) {
      setStatusMessage("❌ Please enter at least the product name.");
      setPreview(null);
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Saving product data to the external server...");

    try {
      const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          type: TYPE,
          payload: form,
        }),
      });

      if (!ok || !data || data.ok === false) {
        throw new Error(
          (data && (data.error || data.message)) ||
            `Server error (status ${status})`
        );
      }

      const savedPayload =
        data.report?.payload || data.row?.payload || form;

      setPreview(savedPayload);
      setStatusMessage("✅ Product details saved successfully on the server.");
    } catch (err) {
      console.error("Product details save error:", err);
      setStatusMessage(
        `❌ Error while saving to the server: ${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

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
    color: "#1e3a8a", // أزرق غامق وواضح
    marginBottom: 4,
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid #000000", // أسود غامق
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
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
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
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#4b5563",
              }}
            >
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
            Unified template to capture product details, assessment, registration
            and laboratory tests. One product per record, saved directly to the
            external server.
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
                : statusMessage.startsWith("⏳")
                ? "linear-gradient(135deg,#eff6ff,#dbeafe)"
                : "linear-gradient(135deg,#fef2f2,#fee2e2)",
              color: statusMessage.startsWith("✅")
                ? "#166534"
                : statusMessage.startsWith("⏳")
                ? "#1d4ed8"
                : "#b91c1c",
              fontSize: 13,
              border: statusMessage.startsWith("✅")
                ? "1px solid #bbf7d0"
                : statusMessage.startsWith("⏳")
                ? "1px solid #bfdbfe"
                : "1px solid #fecaca",
              boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* FORM full width */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          {/* القسم الأول: الإدخال + التسجيل + الاختبارات */}
          <div>
            {/* 1. Basic information */}
            <section style={sectionBox}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#1e3a8a",
                }}
              >
                1. Basic Product Information
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1fr",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    1.1 Product name{" "}
                    <span style={{ color: "#b91c1c" }}>*</span>
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>1.2 Brand</label>
                  <select
                    style={inputStyle}
                    value={form.brand}
                    onChange={handleChange("brand")}
                  >
                    <option value="">Select brand...</option>
                    <option value="Al Mawashi">Al Mawashi</option>
                    <option value="BBayti">BBayti</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Product type</label>
                  <select
                    style={inputStyle}
                    value={form.productType}
                    onChange={handleChange("productType")}
                  >
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

              <div
                style={{
                  marginTop: 12,
                }}
              >
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
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#1e3a8a",
                }}
              >
                2. Label & Shelf Life
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
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
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 0.9fr",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      style={inputStyle}
                      value={form.shelfLifeValue}
                      onChange={handleChange("shelfLifeValue")}
                      placeholder="e.g. 12"
                    />
                    <select
                      style={inputStyle}
                      value={form.shelfLifeUnit}
                      onChange={handleChange("shelfLifeUnit")}
                    >
                      <option value="">Unit</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                  <div style={smallHint}>
                    Example: 12 months, 10 days, etc.
                  </div>
                </div>
              </div>

              {/* Ingredients dynamic rows */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>2.2 Ingredients</label>
                {(Array.isArray(form.ingredients)
                  ? form.ingredients
                  : []
                ).map((row, index) => (
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
                      placeholder="Ingredient name (e.g. beef, water, salt, spice mix...)"
                    />
                    <input
                      style={inputStyle}
                      value={row.amount}
                      onChange={handleIngredientChange(index, "amount")}
                      placeholder="% or weight (e.g. 70%, 2.5%)"
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
                <div style={smallHint}>
                  One ingredient per row with its percentage or weight. You can
                  add unlimited rows as needed.
                </div>
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
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#1e3a8a",
                }}
              >
                3. Registration & Certificates
              </h3>

              {/* DM registration row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
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

              {/* DM registration images */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>
                  DM registration images (max 10)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSectionImagesUpload(
                    "dmRegistrationImagesUrls",
                    "DM registration"
                  )}
                  style={{ marginBottom: 4, fontSize: 13 }}
                />
                <div style={smallHint}>
                  Upload images of DM product registration / approval. URLs will
                  be stored below (one per line).
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 4 }}
                  value={form.dmRegistrationImagesUrls}
                  onChange={handleChange("dmRegistrationImagesUrls")}
                  placeholder="DM registration image URLs (one URL per line)"
                />
              </div>

              {/* Assessment certificate row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
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
                    Assessment date{" "}
                    <span style={{ fontSize: 11 }}> (يوم/شهر/سنة)</span>
                  </label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.assessmentDate}
                    onChange={handleChange("assessmentDate")}
                  />
                </div>
              </div>

              {/* Assessment certificate images */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>
                  Assessment certificate images (max 10)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSectionImagesUpload(
                    "assessmentCertImagesUrls",
                    "Assessment certificate"
                  )}
                  style={{ marginBottom: 4, fontSize: 13 }}
                />
                <div style={smallHint}>
                  Upload images of label assessment / product assessment
                  certificates. URLs will be stored below (one per line).
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 4 }}
                  value={form.assessmentCertImagesUrls}
                  onChange={handleChange("assessmentCertImagesUrls")}
                  placeholder="Assessment certificate image URLs (one URL per line)"
                />
              </div>

              {/* Halal certificate row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
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
                    Halal certificate expiry{" "}
                    <span style={{ fontSize: 11 }}> (يوم/شهر/سنة)</span>
                  </label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.halalCertExpiry}
                    onChange={handleChange("halalCertExpiry")}
                  />
                </div>
              </div>

              {/* Halal certificate images */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>
                  3.6 Halal certificate images (max 10)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSectionImagesUpload(
                    "halalCertImagesUrls",
                    "Halal certificate"
                  )}
                  style={{ marginBottom: 4, fontSize: 13 }}
                />
                <div style={smallHint}>
                  Upload images of Halal certificates and approvals. URLs will be
                  stored below (one per line).
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 4 }}
                  value={form.halalCertImagesUrls}
                  onChange={handleChange("halalCertImagesUrls")}
                  placeholder="Halal certificate image URLs (one URL per line)"
                />
              </div>

              {/* Nutrition facts images */}
              <div>
                <label style={labelStyle}>
                  3.7 Nutrition facts images (max 10)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSectionImagesUpload(
                    "nutritionFactsImagesUrls",
                    "Nutrition facts"
                  )}
                  style={{ marginBottom: 4, fontSize: 13 }}
                />
                <div style={smallHint}>
                  Upload images of the nutrition facts panel on the label. URLs will
                  be stored below (one per line).
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 4 }}
                  value={form.nutritionFactsImagesUrls}
                  onChange={handleChange("nutritionFactsImagesUrls")}
                  placeholder="Nutrition facts image URLs (one URL per line)"
                />
              </div>
            </section>

            {/* 4. Tests & analysis – images only */}
            <section style={sectionBox}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#1e3a8a",
                }}
              >
                4. Tests & Analysis
              </h3>
              <div>
                <label style={labelStyle}>Test images (max 10)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleTestImagesUpload}
                  style={{ marginBottom: 6, fontSize: 13 }}
                />
                <div style={smallHint}>
                  Upload up to 10 images for test reports or results (microbiology,
                  chemical, packaging, shelf-life studies, etc.). Images are uploaded
                  to the external server and URLs are stored below.
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 6 }}
                  value={form.testImagesUrls}
                  onChange={handleChange("testImagesUrls")}
                  placeholder="Test images URLs (one URL per line)"
                />
              </div>
            </section>
          </div>

          {/* القسم الثاني: صور المنتج + الحفظ + المعاينة */}
          <div>
            {/* Product images */}
            <section style={sectionBox}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#1e3a8a",
                }}
              >
                5. Attachments – Product Images
              </h3>

              <div>
                <label style={labelStyle}>Product images (upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesUpload}
                  style={{ marginBottom: 6, fontSize: 13 }}
                />
                <div style={smallHint}>
                  You can select multiple images. They will be uploaded to the external
                  server (with compression handled server-side), and the URLs will be
                  stored in the field below.
                </div>
                <textarea
                  style={{ ...textareaStyle, marginTop: 6 }}
                  value={form.productImageUrls}
                  onChange={handleChange("productImageUrls")}
                  placeholder="Product image URLs (one URL per line)"
                />
              </div>

              {uploadingField && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#1d4ed8",
                  }}
                >
                  ⏳ Uploading files ({uploadingField})...
                </div>
              )}
            </section>

            {/* Save + view buttons */}
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
                  background:
                    "linear-gradient(135deg, #4f46e5, #2563eb, #0ea5e9)",
                  color: "#ffffff",
                  boxShadow: "0 12px 30px rgba(37,99,235,0.5)",
                  marginBottom: 8,
                  transition: "transform 0.15s.ease, box-shadow 0.15s ease",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(1px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(37,99,235,0.4)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(37,99,235,0.5)";
                }}
              >
                {loading ? "Saving to server..." : "Save product to server"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/haccp-iso/product-details/view")}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 999,
                  border: "1px solid #93c5fd",
                  background:
                    "linear-gradient(135deg, #eff6ff, #dbeafe)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  color: "#1d4ed8",
                }}
              >
                View saved products
              </button>

              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                Data is always saved to the external server via /api/reports (type:
                {` "${TYPE}"`}). No local storage is used, only a preview of the saved
                payload below.
              </div>
            </section>

            {/* Preview */}
            {preview && (
              <section style={sectionBox}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    marginBottom: 8,
                    color: "#1e3a8a",
                  }}
                >
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
