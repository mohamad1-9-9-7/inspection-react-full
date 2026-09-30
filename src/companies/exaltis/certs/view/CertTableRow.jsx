// src/companies/exaltis/certs/view/CertTableRow.jsx
// Certificates view — one certificate row (view and inline edit).
// (Extracted from CertView.jsx — the code is unchanged.)
import { tdStyle } from "./certViewUi";
import { COURSE_OPTIONS } from "./certViewModel";

export function CertTableRow({ r, rowBg, showLeftBar, idx, isEditing, editDraft, updateEditField, setPreviewImage, handleEditImageSelect, handleRemoveEditImage, saveEdit, savingEdit, cancelEdit, startEdit, toggleLeftCompany, handleDeleteCert, deletingRid }) {
  return (
    <tr
      key={r._rid || r.idx}
      style={{
        backgroundColor: rowBg,
        borderLeft: showLeftBar
          ? `4px solid ${
              r.status.key === "expired"
                ? "#b91c1c"
                : r.status.key === "expiring_soon"
                ? "#c2410c"
                : "#a16207"
            }`
          : "4px solid transparent",
      }}
    >
      <td style={tdStyle}>{idx + 1}</td>

      {/* Employee No */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="text"
            value={editDraft?.employeeNo || ""}
            onChange={(e) =>
              updateEditField(
                "employeeNo",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.employeeNo
        )}
      </td>

      {/* Name */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="text"
            value={editDraft?.name || ""}
            onChange={(e) =>
              updateEditField("name", e.target.value)
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.name
        )}
      </td>

      {/* Nationality */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="text"
            value={editDraft?.nationality || ""}
            onChange={(e) =>
              updateEditField(
                "nationality",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.nationality
        )}
      </td>

      {/* Branch */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="text"
            value={editDraft?.branch || ""}
            onChange={(e) =>
              updateEditField(
                "branch",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span>{r.branch}</span>
            {r.leftCompany && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#fff",
                  background:
                    "linear-gradient(135deg,#dc2626,#7c2d12)",
                  padding: "1px 6px",
                  borderRadius: 999,
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  width: "fit-content",
                }}
              >
                🚪 LEFT COMPANY
              </span>
            )}
          </div>
        )}
      </td>

      {/* Job */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="text"
            value={editDraft?.job || ""}
            onChange={(e) =>
              updateEditField("job", e.target.value)
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.job
        )}
      </td>

      {/* Course Type */}
      <td style={tdStyle}>
        {isEditing ? (
          <select
            value={editDraft?.courseType || ""}
            onChange={(e) =>
              updateEditField(
                "courseType",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          >
            {COURSE_OPTIONS.map((o) => (
              <option
                key={o.value}
                value={o.value}
              >
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          r.courseType
        )}
      </td>

      {/* Issue Date */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="date"
            value={editDraft?.issueDate || ""}
            onChange={(e) =>
              updateEditField(
                "issueDate",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.issueDate
        )}
      </td>

      {/* Expiry Date */}
      <td style={tdStyle}>
        {isEditing ? (
          <input
            type="date"
            value={editDraft?.expiryDate || ""}
            onChange={(e) =>
              updateEditField(
                "expiryDate",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "4px 6px",
              borderRadius: 6,
              border:
                "1px solid rgba(148,163,184,0.9)",
              fontSize: 12,
            }}
          />
        ) : (
          r.expiryDate || "—"
        )}
      </td>

      {/* Days Left */}
      <td style={{ ...tdStyle, textAlign: "center" }}>
        {r.status.days === null ? (
          <span style={{ color: "#9ca3af" }}>—</span>
        ) : r.status.days < 0 ? (
          <span
            style={{
              fontWeight: 700,
              color: "#b91c1c",
            }}
            title={`Expired ${Math.abs(
              r.status.days
            )} day(s) ago`}
          >
            -{Math.abs(r.status.days)}
          </span>
        ) : (
          <span
            style={{
              fontWeight: 700,
              color:
                r.status.key === "expiring_soon"
                  ? "#c2410c"
                  : r.status.key === "expiring"
                  ? "#a16207"
                  : "#15803d",
            }}
            title={`${r.status.days} day(s) remaining`}
          >
            {r.status.days}
          </span>
        )}
      </td>

      {/* Status */}
      <td style={tdStyle}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            color: "#fff",
            background: r.status.bg,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
          }}
        >
          {r.status.label}
        </span>
      </td>

      {/* Saved At */}
      <td style={tdStyle}>
        {r.savedAt
          ? String(r.savedAt).slice(0, 10)
          : "—"}
      </td>

      {/* Image */}
      <td style={tdStyle}>
        {isEditing ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            {editDraft?.imageData ? (
              <button
                type="button"
                onClick={() =>
                  setPreviewImage(editDraft.imageData)
                }
                style={{
                  border: "none",
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <img
                  src={editDraft.imageData}
                  alt="Certificate"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid #d1d5db",
                    boxShadow:
                      "0 2px 6px rgba(15,23,42,0.25)",
                  }}
                />
              </button>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                No image
              </span>
            )}

            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg,#0ea5e9,#0369a1)",
                  color: "#f9fafb",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Change
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageSelect}
                  style={{ display: "none" }}
                />
              </label>

              {editDraft?.imageData && (
                <button
                  type="button"
                  onClick={handleRemoveEditImage}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#ef4444,#b91c1c)",
                    color: "#f9fafb",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : r.hasImage ? (
          <button
            type="button"
            onClick={() =>
              setPreviewImage(r.imageData)
            }
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <img
              src={r.imageData}
              alt="Certificate"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                objectFit: "cover",
                border: "1px solid #d1d5db",
                boxShadow:
                  "0 2px 6px rgba(15,23,42,0.25)",
              }}
            />
          </button>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            No image
          </span>
        )}
      </td>

      {/* Actions */}
      <td style={tdStyle}>
        {!r._rid ? (
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            —
          </span>
        ) : isEditing ? (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={saveEdit}
              disabled={savingEdit}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: savingEdit
                  ? "default"
                  : "pointer",
              }}
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#e5e7eb,#d1d5db)",
                color: "#111827",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => startEdit(r)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#0ea5e9,#0369a1)",
                color: "#f9fafb",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => toggleLeftCompany(r)}
              title={
                r.leftCompany
                  ? "Restore as active employee"
                  : "Mark as Left Company (hide from main view)"
              }
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background: r.leftCompany
                  ? "linear-gradient(135deg,#10b981,#047857)"
                  : "linear-gradient(135deg,#dc2626,#7c2d12)",
                color: "#f9fafb",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {r.leftCompany ? "↩ Restore" : "🚪 Left"}
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCert(r)}
              disabled={deletingRid === r._rid}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#ef4444,#b91c1c)",
                color: "#f9fafb",
                fontSize: 11,
                fontWeight: 700,
                cursor:
                  deletingRid === r._rid
                    ? "default"
                    : "pointer",
              }}
             data-delete-action="true">
              {deletingRid === r._rid
                ? "Deleting…"
                : "Delete"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
