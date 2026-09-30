// src/companies/exaltis/ohc/view/OhcEditPanel.jsx
// OHC view — edit panel for one record.
// (Extracted from OHCView.jsx — the code is unchanged.)
import { Field, DateField, Select } from "./ohcViewUi";

export function OhcEditPanel({ filtered, editingIndex, edit, setEditField, editImage, handleEditImageSelect, setEditImage, saveEdit, cancelEdit }) {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background:
          "linear-gradient(135deg,#f9fafb,#f3f4f6,#e5e7eb)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 10,
          fontSize: 16,
          color: "#0f172a",
        }}
      >
        Edit Certificate{" "}
        <span
          style={{
            fontWeight: 400,
            fontSize: 13,
            color: "#4b5563",
          }}
        >
          {`(Employee Number: ${
            filtered[editingIndex]?.appNo || "N/A"
          })`}
        </span>
      </h3>

      {/* Status flags row (Outside Dubai + Left Company) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        {/* Outside Dubai toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            background: edit.outsideDubai
              ? "linear-gradient(135deg,#e0f2fe,#bae6fd)"
              : "linear-gradient(135deg,#ffffff,#f1f5f9)",
            border: `1px solid ${
              edit.outsideDubai ? "#0369a1" : "rgba(148,163,184,0.7)"
            }`,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!edit.outsideDubai}
            onChange={(e) =>
              setEditField("outsideDubai", e.target.checked)
            }
            style={{ width: 18, height: 18, margin: 0 }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              📍 Outside Dubai (Exempt from OHC)
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#475569",
                marginTop: 2,
              }}
            >
              Hidden from main view & expiry alerts. Useful when an
              employee may transfer to Dubai later.
            </div>
          </div>
        </label>

        {/* Left Company toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            background: edit.leftCompany
              ? "linear-gradient(135deg,#fef2f2,#fecaca)"
              : "linear-gradient(135deg,#ffffff,#f1f5f9)",
            border: `1px solid ${
              edit.leftCompany ? "#7c2d12" : "rgba(148,163,184,0.7)"
            }`,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={!!edit.leftCompany}
            onChange={(e) =>
              setEditField("leftCompany", e.target.checked)
            }
            style={{ width: 18, height: 18, margin: 0 }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              🚪 Left Company (Former Employee)
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#475569",
                marginTop: 2,
              }}
            >
              Record is kept but hidden from main view & expiry
              alerts. Restore anytime if the employee returns.
            </div>
          </div>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          opacity:
            edit.outsideDubai || edit.leftCompany ? 0.6 : 1,
        }}
      >
        <Field
          label="Name"
          value={edit.name}
          onChange={(v) => setEditField("name", v)}
        />
        <Field
          label="Nationality"
          value={edit.nationality}
          onChange={(v) => setEditField("nationality", v)}
        />
        <Field
          label="Occupation"
          value={edit.job}
          onChange={(v) => setEditField("job", v)}
        />
        <DateField
          label="Certificate Expiry Date"
          value={edit.expiryDate}
          onChange={(v) => setEditField("expiryDate", v)}
        />
        <Select
          label="Result"
          value={edit.result}
          onChange={(v) => setEditField("result", v)}
          options={[
            { value: "", label: "-- Select --" },
            { value: "FIT", label: "FIT" },
            { value: "UNFIT", label: "UNFIT" },
          ]}
        />
        {/* Branch text field */}
        <Field
          label="Branch"
          value={edit.branch}
          onChange={(v) => setEditField("branch", v)}
        />
      </div>

      {/* Image edit block */}
      <div
        style={{
          marginTop: 16,
          padding: 10,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#111827",
            minWidth: 120,
          }}
        >
          Certificate Image
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            {(editImage?.dataUrl ||
              filtered[editingIndex]?.image) && (
              <img
                src={
                  editImage?.dataUrl ||
                  filtered[editingIndex]?.image
                }
                alt="preview"
                style={{
                  height: 60,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  objectFit: "cover",
                  boxShadow:
                    "0 6px 14px rgba(15,23,42,0.35)",
                }}
              />
            )}
            {!editImage?.dataUrl &&
              !filtered[editingIndex]?.image && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  No image attached.
                </span>
              )}
          </div>

          <label
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              background:
                "linear-gradient(135deg,#0ea5e9,#0369a1)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              border: "none",
            }}
          >
            Change / Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleEditImageSelect}
              style={{ display: "none" }}
            />
          </label>

          {editImage && (
            <button
              type="button"
              onClick={() => setEditImage(null)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg,#94a3b8,#64748b)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset Image
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button
          onClick={saveEdit}
          style={{
            padding: "8px 16px",
            background:
              "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
            boxShadow: "0 10px 24px rgba(22,163,74,0.55)",
          }}
        >
          Save
        </button>
        <button
          onClick={cancelEdit}
          style={{
            padding: "8px 16px",
            background:
              "linear-gradient(135deg,#94a3b8,#64748b,#475569)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
