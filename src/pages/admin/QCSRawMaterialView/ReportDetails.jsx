// src/pages/admin/QCSRawMaterialView/ReportDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ATTRIBUTES,
  defaultDocMeta,
  GENERAL_FIELDS_ORDER,
  keyLabels,
  uploadImageViaServer, // من viewUtils
  deleteImageUrl,       // من viewUtils
} from "./viewUtils";

const headerStyles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #000",
  },
  th: {
    border: "1px solid #000",
    background: "#f8fafc",
    textAlign: "left",
    padding: "10px 12px",
    width: "220px",
    color: "#111827",
    fontWeight: 800,
  },
  td: { border: "1px solid #000", padding: "10px 12px", background: "#fff" },
  spacerCol: { borderLeft: "1px solid #000", width: "10px" },
};

const sectionTitle = {
  marginBottom: "0.8rem",
  fontWeight: 800,
  color: "#111827",
  borderBottom: "2px solid #000",
  paddingBottom: "0.3rem",
};

const isUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const isPdfUrl = (u) => typeof u === "string" && /\.pdf(\?|#|$)/i.test(u);
const isBase64Image = (u) =>
  typeof u === "string" && u.startsWith("data:image/");

export default function ReportDetails({
  selectedReport,
  getDisplayId,
  getCreatedDate,
  updateSelectedReport,
}) {
  const [showAttachments, setShowAttachments] = useState(true);

  // refs
  const imagesUploadRef = useRef(null);
  const certUploadRef = useRef(null);

  // ====== IMAGE VIEWER (Modal) ======
  const [viewer, setViewer] = useState({
    open: false,
    kind: null, // 'image' | 'cert'
    index: 0,
    src: "",
    name: "",
    canDelete: false,
  });

  const openImageViewer = (index, src) => {
    setViewer({
      open: true,
      kind: "image",
      index,
      src,
      name: `image-${index + 1}`,
      canDelete: isUrl(src),
    });
  };
  const openCertViewer = () => {
    const url = selectedReport?.certificateUrl;
    const b64 = selectedReport?.certificateFile;
    const name = selectedReport?.certificateName || "Certificate";
    // افتح فقط لو صورة (رابط أو Base64). الـ PDF يضل لينك عادي.
    const src = url || b64 || "";
    if (!src || isPdfUrl(src)) return;
    setViewer({
      open: true,
      kind: "cert",
      index: 0,
      src,
      name,
      canDelete: isUrl(url), // حذف فعلي من السيرفر فقط لو URL
    });
  };
  const closeViewer = () => setViewer((v) => ({ ...v, open: false }));

  // قفل سكرول الخلفية وقت فتح المودال
  useEffect(() => {
    if (viewer.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [viewer.open]);

  // ESC لإغلاق
  useEffect(() => {
    if (!viewer.open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer.open]);

  const Modal = () =>
    !viewer.open ? null : (
      <div
        onClick={closeViewer}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.65)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            background: "#0b0f19",
            borderRadius: 12,
            border: "1px solid #1f2937",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                color: "#e5e7eb",
                fontWeight: 800,
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "60vw",
              }}
              title={viewer.name}
            >
              {viewer.name}
            </div>
            <button
              onClick={closeViewer}
              title="Close"
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "6px 10px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              background: "#0b0f19",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <img
              src={viewer.src}
              alt={viewer.name}
              style={{
                maxWidth: "88vw",
                maxHeight: "76vh",
                display: "block",
                borderRadius: 8,
              }}
            />
          </div>

          <div
            className="no-print"
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  if (viewer.kind === "image") {
                    // استبدال صورة من المعرض
                    handleReplaceImage(viewer.index);
                  } else {
                    // استبدال شهادة: افتح مدخل الشهادة ثم سكّر المودال
                    certUploadRef.current?.click();
                  }
                  closeViewer();
                }}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                title="Replace"
              >
                Replace
              </button>

              {viewer.canDelete && (
                <button
                  onClick={() => {
                    if (viewer.kind === "image") {
                      handleDeleteImage(viewer.index);
                    } else {
                      handleDeleteCertificate();
                    }
                    closeViewer();
                  }}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              )}
            </div>

            {isUrl(viewer.src) && (
              <a
                href={viewer.src}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#111827",
                  color: "#fff",
                  border: "1px solid #374151",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
                title="Open in new tab"
              >
                Open
              </a>
            )}
          </div>
        </div>
      </div>
    );

  const idForTitle = useMemo(() => {
    if (!selectedReport) return null;
    const awb = selectedReport?.generalInfo?.airwayBill;
    const inv = selectedReport?.generalInfo?.invoiceNo;
    const norm = (s) => String(s ?? "").trim();
    return norm(awb) || norm(inv) || null;
  }, [selectedReport]);

  if (!selectedReport) {
    return (
      <p
        style={{
          textAlign: "center",
          fontWeight: 800,
          color: "#dc2626",
          padding: "2rem",
        }}
      >
        ❌ No report selected.
      </p>
    );
  }

  // ===== Helpers =====
  const displayFieldValue = (k) => {
    const v = selectedReport?.generalInfo?.[k];
    const sentinels = ["", "NIL", "NA", "N/A", "NONE", "NULL", "-", "—", "0"];
    if ((k === "airwayBill" || k === "invoiceNo") && sentinels.includes(String(v || "").toUpperCase())) {
      return "-";
    }
    return v ?? "-";
  };

  // ===== صور المعرض (الصور العادية) =====
  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const urls = [];
    for (const f of files) {
      try {
        const u = await uploadImageViaServer(f); // يرفع ويعيد URL
        urls.push(u);
      } catch (err) {
        console.warn("Upload failed:", err);
      }
    }
    if (!urls.length) return;

    updateSelectedReport((rec) => {
      const prev = Array.isArray(rec.images) ? rec.images : [];
      rec.images = [...prev, ...urls];
    });
    setShowAttachments(true);
  };

  const handleReplaceImage = (idx) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      const oldUrl = (selectedReport.images || [])[idx];

      try {
        const newUrl = await uploadImageViaServer(f);
        if (isUrl(oldUrl)) {
          try { await deleteImageUrl(oldUrl); } catch {}
        }
        updateSelectedReport((rec) => {
          const arr = Array.isArray(rec.images) ? [...rec.images] : [];
          arr[idx] = newUrl;
          rec.images = arr;
        });
      } catch (err) {
        alert("❌ Failed to replace image.");
      }
    };
    input.click();
  };

  const handleDeleteImage = async (idx) => {
    const url = (selectedReport.images || [])[idx];
    if (!isUrl(url)) return; // نحذف فقط الصور المرفوعة كرابط
    if (!window.confirm("Delete this image from server?")) return;
    try {
      try { await deleteImageUrl(url); } catch {}
      updateSelectedReport((rec) => {
        const arr = Array.isArray(rec.images) ? [...rec.images] : [];
        arr.splice(idx, 1);
        rec.images = arr;
      });
    } catch {
      alert("❌ Failed to delete image.");
    }
  };

  // ===== شهادة الحلال =====
  const handleUploadOrReplaceCertificate = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const wasUrl = selectedReport.certificateUrl || "";

    if (file.type.startsWith("image/")) {
      try {
        const newUrl = await uploadImageViaServer(file);
        if (wasUrl && isUrl(wasUrl)) {
          try { await deleteImageUrl(wasUrl); } catch {}
        }
        updateSelectedReport((rec) => {
          rec.certificateUrl = newUrl;
          rec.certificateFile = "";
          rec.certificateName = file.name;
        });
        setShowAttachments(true);
      } catch (err) {
        alert("❌ Failed to upload certificate image.");
      }
      return;
    }

    if (file.type === "application/pdf") {
      const toBase64 = (f) =>
        new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(String(r.result || ""));
          r.readAsDataURL(f);
        });
      const data = await toBase64(file);
      if (wasUrl && isUrl(wasUrl)) {
        try { await deleteImageUrl(wasUrl); } catch {}
      }
      updateSelectedReport((rec) => {
        rec.certificateUrl = "";
        rec.certificateFile = data;
        rec.certificateName = file.name;
      });
      setShowAttachments(true);
      return;
    }

    alert("Unsupported certificate file type. Please upload an image or PDF.");
  };

  const handleDeleteCertificate = async () => {
    const url = selectedReport.certificateUrl;
    if (!isUrl(url)) return; // حذف فعلي فقط لو URL
    if (!window.confirm("Delete certificate image from server?")) return;
    try {
      try { await deleteImageUrl(url); } catch {}
      updateSelectedReport((rec) => {
        rec.certificateUrl = "";
        rec.certificateName = "";
      });
    } catch {
      alert("❌ Failed to delete certificate.");
    }
  };

  // ===== Derived totals from product lines =====
  const lines = Array.isArray(selectedReport.productLines)
    ? selectedReport.productLines
    : [];
  const sumQty = lines.reduce((a, l) => a + (parseFloat(l?.qty) || 0), 0);
  const sumWgt = lines.reduce((a, l) => a + (parseFloat(l?.weight) || 0), 0);
  const avgW = sumQty > 0 ? (sumWgt / sumQty).toFixed(3) : "";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "10px" }}>
        <table className="headerTable" style={headerStyles.table}>
          <colgroup>
            <col />
            <col />
            <col style={headerStyles.spacerCol} />
            <col />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th style={headerStyles.th}>Document Title</th>
              <td style={headerStyles.td}>
                {selectedReport?.docMeta?.documentTitle || defaultDocMeta.documentTitle}
              </td>
              <td />
              <th style={headerStyles.th}>Document No</th>
              <td style={headerStyles.td}>
                {selectedReport?.docMeta?.documentNo || defaultDocMeta.documentNo}
              </td>
            </tr>
            <tr>
              <th style={headerStyles.th}>Issue Date</th>
              <td style={headerStyles.td}>
                {selectedReport?.docMeta?.issueDate || defaultDocMeta.issueDate}
              </td>
              <td />
              <th style={headerStyles.th}>Revision No</th>
              <td style={headerStyles.td}>
                {selectedReport?.docMeta?.revisionNo || defaultDocMeta.revisionNo}
              </td>
            </tr>
            <tr>
              <th style={headerStyles.th}>Area</th>
              <td style={headerStyles.td} colSpan={4}>
                {selectedReport?.docMeta?.area || defaultDocMeta.area}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Title + toggles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ margin: 0, color: "#111827", fontWeight: 800 }}>
          {idForTitle
            ? (selectedReport?.generalInfo?.airwayBill
                ? `📦 Air Way Bill: ${idForTitle}`
                : `🧾 Invoice No: ${idForTitle}`)
            : "📋 Incoming Shipment Report"}
        </h3>

        <button
          onClick={() => setShowAttachments((s) => !s)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: 800,
            color: "#0f172a",
          }}
          className="no-print"
          title={showAttachments ? "Hide attachments" : "Show attachments"}
        >
          {showAttachments ? "🙈 Hide attachments" : "👀 Show attachments"}
        </button>
      </div>

      {/* General Info grid */}
      <section style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 0,
            border: "1px solid #000",
            background: "#fff",
          }}
        >
          {GENERAL_FIELDS_ORDER.map((k) => (
            <div key={k} style={{ border: "1px solid #000", padding: 12, minHeight: 66 }}>
              <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
                {keyLabels[k] || k}
              </div>
              <div>{displayFieldValue(k)}</div>
            </div>
          ))}
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Shipment Type
            </div>
            <div>{selectedReport.shipmentType || "-"}</div>
          </div>
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Shipment Status
            </div>
            <div>{selectedReport.status || "-"}</div>
          </div>
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Entry Date
            </div>
            <div>{selectedReport.date || "-"}</div>
          </div>
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Created Date
            </div>
            <div>{getCreatedDate(selectedReport) || "-"}</div>
          </div>
          {selectedReport.sequence ? (
            <div style={{ border: "1px solid #000", padding: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
                Sequence (day)
              </div>
              <div>#{selectedReport.sequence}</div>
            </div>
          ) : null}
          {selectedReport.uniqueKey ? (
            <div style={{ border: "1px solid #000", padding: 12, gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
                Unique Key
              </div>
              <div style={{ wordBreak: "break-all" }}>{selectedReport.uniqueKey}</div>
            </div>
          ) : null}
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Total Quantity (pcs)
            </div>
            <div>{selectedReport.totalQuantity || (sumQty ? String(sumQty) : "-")}</div>
          </div>
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Total Weight (kg)
            </div>
            <div>{selectedReport.totalWeight || (sumWgt ? String(sumWgt) : "-")}</div>
          </div>
          <div style={{ border: "1px solid #000", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 5, color: "#111827" }}>
              Average Weight (kg)
            </div>
            <div>{selectedReport.averageWeight || (avgW || "-")}</div>
          </div>
        </div>
      </section>

      {/* Samples */}
      <section>
        <h4 style={sectionTitle}>Test Samples</h4>
        <div style={{ overflowX: "auto", border: "1px solid #000" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
              minWidth: "900px",
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "center", fontWeight: 800 }}>
                <th
                  style={{
                    padding: "10px 6px",
                    border: "1px solid #000",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                  }}
                >
                  Attribute
                </th>
                {selectedReport.samples?.map((_, idx) => (
                  <th
                    key={idx}
                    style={{ padding: "10px 6px", border: "1px solid #000", whiteSpace: "nowrap" }}
                  >
                    Sample {idx + 1}
                  </th>
                ))}
              </tr>
              <tr style={{ background: "#fafafa", textAlign: "center" }}>
                <th style={{ padding: "10px 6px", border: "1px solid #000", textAlign: "left" }}>
                  PRODUCT NAME
                </th>
                {selectedReport.samples?.map((s, idx) => (
                  <th
                    key={`pn-${idx}`}
                    style={{ padding: "8px 6px", border: "1px solid #000", fontWeight: 600 }}
                  >
                    {s?.productName || "-"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTES.map((attr) => (
                <tr
                  key={attr.key}
                  style={
                    ["temperature", "ph", "slaughterDate", "expiryDate"].includes(attr.key)
                      ? { background: "#f9fafb" }
                      : undefined
                  }
                >
                  <td style={{ padding: "8px 6px", border: "1px solid #000", fontWeight: 600 }}>
                    {attr.label}
                  </td>
                  {selectedReport.samples?.map((s, i) => (
                    <td
                      key={`${attr.key}-${i}`}
                      style={{ padding: "8px 6px", border: "1px solid #000", textAlign: "center" }}
                    >
                      {s?.[attr.key] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notes */}
      <section style={{ marginTop: "1rem" }}>
        <h4 style={{ marginBottom: "0.5rem", fontWeight: 800, color: "#111827" }}>📝 Notes</h4>
        <div
          style={{
            border: "1px solid #000",
            padding: "10px 12px",
            minHeight: "6em",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            background: "#fff",
          }}
        >
          {(selectedReport?.notes ?? selectedReport?.generalInfo?.notes ?? "")?.trim() || "—"}
        </div>
      </section>

      {/* Attachments */}
      {showAttachments && (
        <section style={{ marginTop: "1.5rem" }}>
          {(selectedReport.certificateUrl ||
            selectedReport.certificateFile ||
            (Array.isArray(selectedReport.images) && selectedReport.images.length > 0)) && (
            <h4 style={{ marginBottom: 8, fontWeight: 800, color: "#111827" }}>Attachments</h4>
          )}

          {/* أزرار الرفع */}
          <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => certUploadRef.current?.click()}
              title="Upload/Replace halal certificate (image/PDF)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff7ed",
                cursor: "pointer",
                fontWeight: 800,
                color: "#7c2d12",
              }}
            >
              🕌 Upload / Replace certificate
            </button>
            <input
              ref={certUploadRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleUploadOrReplaceCertificate}
              style={{ display: "none" }}
            />

            <button
              onClick={() => imagesUploadRef.current?.click()}
              title="Upload images"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#eff6ff",
                cursor: "pointer",
                fontWeight: 800,
                color: "#1e3a8a",
              }}
            >
              📸 Upload images
            </button>
            <input
              ref={imagesUploadRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddImages}
              style={{ display: "none" }}
            />
          </div>

          {/* Certificate preview */}
          {(selectedReport.certificateUrl || selectedReport.certificateFile) && (
            <div style={{ margin: "0.5rem 0 1rem" }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: "#111827" }}>
                {selectedReport.certificateName || "Certificate"}
              </div>

              {/* رابط/صورة الشهادة */}
              {selectedReport.certificateUrl ? (
                isPdfUrl(selectedReport.certificateUrl) ? (
                  <a
                    href={selectedReport.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 700 }}
                  >
                    📄 Open certificate (PDF)
                  </a>
                ) : (
                  <img
                    src={selectedReport.certificateUrl}
                    alt={selectedReport.certificateName || "Certificate"}
                    onClick={openCertViewer}
                    style={{
                      maxWidth: 350,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      display: "block",
                      marginBottom: 6,
                      cursor: "zoom-in",
                    }}
                  />
                )
              ) : null}

              {/* Base64 قديم */}
              {!selectedReport.certificateUrl && selectedReport.certificateFile ? (
                isBase64Image(selectedReport.certificateFile) ? (
                  <img
                    src={selectedReport.certificateFile}
                    alt={selectedReport.certificateName || "Certificate"}
                    onClick={openCertViewer}
                    style={{
                      maxWidth: 350,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      display: "block",
                      marginBottom: 6,
                      cursor: "zoom-in",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "8px 12px",
                      border: "1px dashed #94a3b8",
                      display: "inline-block",
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  >
                    📄 PDF attached — file name:{" "}
                    <strong>{selectedReport.certificateName}</strong>
                  </div>
                )
              ) : null}

              {/* أزرار الشهادة */}
              <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => certUploadRef.current?.click()}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Replace certificate"
                >
                  Replace
                </button>

                {isUrl(selectedReport.certificateUrl) && (
                  <button
                    onClick={handleDeleteCertificate}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    title="Delete certificate from server"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Images grid */}
          {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {selectedReport.images.map((src, i) => {
                const canDelete = isUrl(src);
                return (
                  <div
                    key={`${src}-${i}`}
                    style={{
                      position: "relative",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#f8fafc",
                    }}
                    title={`Image ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt={`image-${i + 1}`}
                      onClick={() => openImageViewer(i, src)}
                      style={{ width: "100%", height: 150, objectFit: "cover", display: "block", cursor: "zoom-in" }}
                    />
                    <div
                      className="no-print"
                      style={{
                        position: "absolute",
                        left: 6,
                        right: 6,
                        bottom: 6,
                        display: "flex",
                        gap: 6,
                        justifyContent: "space-between",
                      }}
                    >
                      <button
                        onClick={() => handleReplaceImage(i)}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                        title="Replace image"
                      >
                        Replace
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteImage(i)}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "4px 8px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                          title="Delete image from server"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modal component */}
      <Modal />
    </div>
  );
}
