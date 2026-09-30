// src/companies/exaltis/training/sessions/SessionPhotos.jsx
// Training sessions — session photos (max 2, Cloudinary).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { MAX_PARTICIPANT_IMAGES } from "./participants";

export function SessionPhotos({ sessionImages, openSessionPhotoViewer, btn, deletingSession, handleSessionImageUpload, uploadingSessionPhoto, savingSessionPhotos, removeSessionImage }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "linear-gradient(180deg,#ffffff,#f8fafc)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontWeight: 1100, color: "#0f172a", fontSize: 14 }}>
          📷 Session Photos <span style={{ color: "#64748b", fontWeight: 900, fontSize: 12 }}>(max {MAX_PARTICIPANT_IMAGES})</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {sessionImages.length > 0 && (
            <button
              onClick={() => openSessionPhotoViewer(0)}
              style={btn("light")}
              disabled={deletingSession}
            >
              👁 View Photos
            </button>
          )}
          {sessionImages.length < MAX_PARTICIPANT_IMAGES && (
            <>
              <input
                id="session-image-upload"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  handleSessionImageUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="session-image-upload"
                style={{
                  ...btn("dark"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: (uploadingSessionPhoto || savingSessionPhotos || deletingSession) ? "not-allowed" : "pointer",
                  opacity: (uploadingSessionPhoto || savingSessionPhotos || deletingSession) ? 0.6 : 1,
                  pointerEvents: (uploadingSessionPhoto || savingSessionPhotos || deletingSession) ? "none" : "auto",
                }}
              >
                {uploadingSessionPhoto ? "⏳ Uploading..." : `📤 Upload Photo (${sessionImages.length}/${MAX_PARTICIPANT_IMAGES})`}
              </label>
            </>
          )}
        </div>
      </div>

      {sessionImages.length === 0 ? (
        <div style={{ color: "#94a3b8", fontWeight: 900, fontSize: 13 }}>
          No photos uploaded for this session yet.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {sessionImages.map((im, ii) => (
            <div
              key={ii}
              style={{
                position: "relative",
                width: 110, height: 110,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(2,6,23,0.08)",
              }}
              onClick={() => openSessionPhotoViewer(ii)}
              title={im.name || `Image ${ii + 1}`}
            >
              <img
                src={im.url}
                alt={im.name || `img${ii + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this photo?")) removeSessionImage(ii); }}
                title="Remove"
                disabled={savingSessionPhotos}
                style={{
                  position: "absolute",
                  top: 4, right: 4,
                  width: 24, height: 24, borderRadius: "50%",
                  border: "1px solid #fecaca", background: "#fef2f2",
                  color: "#b91c1c", fontWeight: 1000, fontSize: 13,
                  lineHeight: 1, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: savingSessionPhotos ? 0.6 : 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
