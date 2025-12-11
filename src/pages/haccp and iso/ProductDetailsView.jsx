// src/pages/haccp and iso/ProductDetailsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===== API base (same style as other pages) ===== */
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

/* Simple JSON helper */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
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

function splitLinesToList(value) {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProductDetailsView() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Loading products...");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStatusMessage("Loading products from server...");

      try {
        const { ok, data, status } = await jsonFetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`
        );

        if (!ok) {
          throw new Error(
            (data && (data.error || data.message)) ||
              `Server error (status ${status})`
          );
        }

        const list =
          (Array.isArray(data?.reports) && data.reports) ||
          (Array.isArray(data?.rows) && data.rows) ||
          (Array.isArray(data?.data) && data.data) ||
          [];

        const mapped = list.map((r) => {
          const payload = r.payload || r.data || {};
          const createdAt =
            r.created_at || r.createdAt || payload.createdAt || null;
          const id = r.id || r._id || payload.id || Math.random().toString(36);

          return {
            id,
            createdAt,
            payload,
          };
        });

        if (!cancelled) {
          setRows(mapped);
          setStatusMessage(
            mapped.length
              ? `Loaded ${mapped.length} product(s).`
              : "No products found."
          );
        }
      } catch (err) {
        console.error("ProductDetailsView load error:", err);
        if (!cancelled) {
          setRows([]);
          setStatusMessage(
            `Error while loading products: ${err.message || "Unknown error"}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [rows]);

  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEdit = (row) => {
    navigate("/haccp-iso/product-details", {
      state: {
        reportId: row.id,
        payload: row.payload,
      },
    });
  };

  const handleDelete = async (row) => {
    if (!row.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete product "${row.payload?.productName ||
        ""}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(row.id);
    setStatusMessage("⏳ Deleting product from server...");

    try {
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(row.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data && data.ok === false)) {
        throw new Error(
          (data && (data.error || data.message)) ||
            `Server error (status ${res.status})`
        );
      }

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setStatusMessage("✅ Product deleted successfully.");
      if (expandedId === row.id) setExpandedId(null);
    } catch (err) {
      console.error("Delete product error:", err);
      setStatusMessage(
        `❌ Error while deleting product: ${err.message || "Unknown error"}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 18px 32px",
        background:
          "radial-gradient(circle at top left, #e0f2fe 0, #f9fafb 40%, #ffffff 100%)",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background:
                  "linear-gradient(120deg, #1d4ed8, #0ea5e9, #22c55e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Saved Products
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#4b5563",
              }}
            >
              All records saved under type &quot;{TYPE}&quot; from /api/reports.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/haccp-iso/product-details")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #93c5fd",
                background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#1d4ed8",
              }}
            >
              ← Back to product entry
            </button>
          </div>
        </header>

        {/* Status message */}
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 12,
            background: "rgba(239,246,255,0.9)",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
          }}
        >
          {statusMessage}
        </div>

        {/* Cards list */}
        {loading && (
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Loading...
          </div>
        )}

        {!loading && sortedRows.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            No products found.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedRows.map((row, idx) => {
            const p = row.payload || {};
            const isExpanded = expandedId === row.id;

            const productImages = splitLinesToList(p.productImageUrls);
            const testImages = splitLinesToList(p.testImagesUrls);

            const shelfLifeText =
              p.shelfLifeValue && p.shelfLifeUnit
                ? `${p.shelfLifeValue} ${p.shelfLifeUnit}`
                : p.shelfLife || "";

            return (
              <div
                key={row.id || idx}
                style={{
                  borderRadius: 16,
                  background: "#ffffff",
                  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  overflow: "hidden",
                }}
              >
                {/* Header (collapsed bar) */}
                <button
                  type="button"
                  onClick={() => handleToggleExpand(row.id)}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: isExpanded
                      ? "linear-gradient(135deg,#eff6ff,#e0f2fe)"
                      : "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background:
                          "linear-gradient(135deg,#2563eb,#0ea5e9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {p.brand ? `[${p.brand}] ` : ""}
                        {p.productName || "Unnamed product"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {p.productCode && <span>Code: {p.productCode}</span>}
                        {p.productType && <span>Type: {p.productType}</span>}
                        {p.countryOfOrigin && (
                          <span>Country: {p.countryOfOrigin}</span>
                        )}
                        {p.dmRegisteredStatus && (
                          <span>DM: {p.dmRegisteredStatus}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {shelfLifeText && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#0369a1",
                          background: "#e0f2fe",
                          borderRadius: 999,
                          padding: "3px 8px",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        Shelf life: {shelfLifeText}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 18,
                        color: "#6b7280",
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      ▶
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "12px 14px 14px",
                      borderTop: "1px solid #e5e7eb",
                      background: "#ffffff",
                    }}
                  >
                    {/* Basic info */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.3fr",
                        gap: 12,
                        marginBottom: 10,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Basic information
                        </h4>
                        <div>Brand: {p.brand || "-"}</div>
                        <div>Product code / SKU: {p.productCode || "-"}</div>
                        <div>Product type: {p.productType || "-"}</div>
                        <div>Country of origin: {p.countryOfOrigin || "-"}</div>
                        <div>Storage condition: {p.storageCondition || "-"}</div>
                        <div>Shelf life: {shelfLifeText || "-"}</div>
                      </div>

                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Registration & certificates
                        </h4>
                        <div>
                          DM registration status:{" "}
                          {p.dmRegisteredStatus || "-"}
                        </div>
                        <div>DM registration No.: {p.dmRegistrationNo || "-"}</div>
                        <div>
                          Other authorities: {p.otherAuthorityRegs || "-"}
                        </div>
                        <div>
                          Assessment cert. No.: {p.assessmentCertNo || "-"}
                        </div>
                        <div>Assessment body: {p.assessmentBody || "-"}</div>
                        <div>Assessment date: {p.assessmentDate || "-"}</div>
                        <div>Halal cert. No.: {p.halalCertNo || "-"}</div>
                        <div>Halal CB: {p.halalCB || "-"}</div>
                        <div>Halal expiry: {p.halalCertExpiry || "-"}</div>
                      </div>
                    </div>

                    {/* Ingredients + allergens + instructions */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 1.7fr",
                        gap: 12,
                        marginBottom: 10,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Ingredients
                        </h4>
                        {Array.isArray(p.ingredients) &&
                        p.ingredients.length > 0 ? (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 11,
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    textAlign: "left",
                                    padding: "4px 6px",
                                    borderBottom: "1px solid #e5e7eb",
                                  }}
                                >
                                  Ingredient
                                </th>
                                <th
                                  style={{
                                    textAlign: "left",
                                    padding: "4px 6px",
                                    borderBottom: "1px solid #e5e7eb",
                                  }}
                                >
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.ingredients.map((ing, i) => (
                                <tr key={i}>
                                  <td
                                    style={{
                                      padding: "3px 6px",
                                      borderBottom: "1px solid #f3f4f6",
                                    }}
                                  >
                                    {ing?.name || "-"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "3px 6px",
                                      borderBottom: "1px solid #f3f4f6",
                                    }}
                                  >
                                    {ing?.amount || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ color: "#6b7280" }}>
                            No ingredients listed.
                          </div>
                        )}
                      </div>

                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Allergens & Instructions
                        </h4>
                        <div
                          style={{
                            marginBottom: 6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <strong>Allergens:</strong>{" "}
                          {p.allergens || "(none specified)"}
                        </div>
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <strong>Instructions:</strong>{" "}
                          {p.instructionsForUse || "(no instructions)"}
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr",
                        gap: 12,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Product images
                        </h4>
                        {productImages.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {productImages.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none" }}
                              >
                                <img
                                  src={url}
                                  alt={`Product ${p.productName || ""} ${
                                    i + 1
                                  }`}
                                  style={{
                                    width: 90,
                                    height: 90,
                                    objectFit: "cover",
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: "#6b7280" }}>
                            No product images.
                          </div>
                        )}
                      </div>

                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#111827",
                          }}
                        >
                          Test images
                        </h4>
                        {testImages.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {testImages.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none" }}
                              >
                                <img
                                  src={url}
                                  alt={`Test ${i + 1}`}
                                  style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: "cover",
                                    borderRadius: 10,
                                    border: "1px solid #e5e7eb",
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: "#6b7280" }}>
                            No test images.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: created date + actions */}
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 11,
                        color: "#6b7280",
                      }}
                    >
                      <div>
                        Created at:{" "}
                        {row.createdAt
                          ? String(row.createdAt)
                              .slice(0, 19)
                              .replace("T", " ")
                          : "-"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "1px solid #93c5fd",
                            background:
                              "linear-gradient(135deg,#eff6ff,#dbeafe)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#1d4ed8",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "1px solid #fecaca",
                            background:
                              "linear-gradient(135deg,#fef2f2,#fee2e2)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor:
                              deletingId === row.id
                                ? "not-allowed"
                                : "pointer",
                            color: "#b91c1c",
                            opacity: deletingId === row.id ? 0.7 : 1,
                          }}
                        >
                          {deletingId === row.id ? "Deleting..." : "🗑 Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
