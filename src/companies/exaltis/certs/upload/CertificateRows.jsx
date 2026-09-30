// src/companies/exaltis/certs/upload/CertificateRows.jsx
// Certificate upload — the list of certificate rows (course, dates, image) of one employee.
// (Extracted from CertUpload.jsx — the code is unchanged.)
import { Bi, bi } from "../../reports/bilingual";
import { Select, Field, DateField, ReadOnlyField } from "./fields";
import { COURSE_TYPES, COURSE_DURATION_YEARS } from "./certUploadModel";

export function CertificateRows({ certs, removeCertificateRow, updateCertField, handleCertImageSelect, removeCertImage }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {certs.map((cert, index) => (
        <div
          key={index}
          style={{
            padding: "12px 12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.6)",
            background:
              "linear-gradient(135deg,rgba(249,250,251,0.96),rgba(241,245,249,0.95))",
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              <Bi en={`Certificate #${index + 1}`} ar={`شهادة #${index + 1}`} />
            </div>
            <button
              type="button"
              onClick={() => removeCertificateRow(index)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                background:
                  certs.length === 1
                    ? "linear-gradient(135deg,#e5e7eb,#e5e7eb)"
                    : "linear-gradient(135deg,#f97373,#ef4444)",
                color:
                  certs.length === 1 ? "#4b5563" : "#f9fafb",
                cursor: certs.length === 1 ? "default" : "pointer",
              }}
              disabled={certs.length === 1}
            >
              {certs.length === 1
                ? bi("Cannot remove last", "لا يمكن حذف الأخيرة")
                : bi("Remove")}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",
              gap: 12,
            }}
          >
            <Select
              label="Course Type"
              value={cert.courseType}
              onChange={(v) =>
                updateCertField(index, "courseType", v)
              }
              options={COURSE_TYPES}
            />

            {cert.courseType === "OTHER" ? (
              <Field
                label="Custom Course Name"
                value={cert.customCourseName}
                onChange={(v) =>
                  updateCertField(index, "customCourseName", v)
                }
              />
            ) : (
              <DateField
                label="Issue Date"
                value={cert.issueDate}
                onChange={(v) =>
                  updateCertField(index, "issueDate", v)
                }
              />
            )}

            {COURSE_DURATION_YEARS[cert.courseType] ? (
              <ReadOnlyField
                label="Expiry Date (auto)"
                value={cert.expiryDate || ""}
              />
            ) : (
              <DateField
                label={
                  cert.courseType === "HACCP"
                    ? "Expiry Date (optional / HACCP usually no expiry)"
                    : "Expiry Date (manual)"
                }
                value={cert.expiryDate}
                onChange={(v) =>
                  updateCertField(index, "expiryDate", v)
                }
              />
            )}

            {cert.courseType === "OTHER" && (
              <DateField
                label="Issue Date"
                value={cert.issueDate}
                onChange={(v) =>
                  updateCertField(index, "issueDate", v)
                }
              />
            )}
          </div>

          {/* Image per certificate */}
          <div style={{ marginTop: 10 }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontWeight: 600,
                color: "#0f172a",
                fontSize: 13,
              }}
            >
              <Bi en="Certificate Image (Optional)" ar="صورة الشهادة (اختياري)" />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleCertImageSelect(index, e)
                  }
                  style={{
                    flex: 1,
                    padding: 8,
                    border:
                      "1px dashed rgba(148,163,184,0.9)",
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                    fontSize: 12,
                  }}
                />
              </div>
            </label>

            {cert.imageUrl === "__uploading__" && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                ⏳ <Bi en="Uploading…" ar="جارٍ الرفع…" />
              </div>
            )}

            {cert.imageUrl && cert.imageUrl !== "__uploading__" && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 8,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg,rgba(15,23,42,0.03),rgba(8,47,73,0.03))",
                  border:
                    "1px solid rgba(148,163,184,0.4)",
                }}
              >
                <img
                  src={cert.imageUrl}
                  alt={`Certificate ${index + 1}`}
                  style={{
                    height: 90,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    objectFit: "cover",
                    boxShadow:
                      "0 8px 20px rgba(15,23,42,0.28)",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => removeCertImage(index)}
                    style={{
                      padding: "8px 14px",
                      background:
                        "linear-gradient(135deg,#ef4444,#b91c1c)",
                      color: "#fff",
                      border: 0,
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Bi en="Remove Image" ar="حذف الصورة" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
