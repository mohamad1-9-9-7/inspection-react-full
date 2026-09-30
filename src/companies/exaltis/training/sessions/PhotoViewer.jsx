// src/companies/exaltis/training/sessions/PhotoViewer.jsx
// Training sessions — participant photos viewer.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)

export function PhotoViewer({ setPhotoViewer, photoViewer }) {
  return (
    <div
      onClick={() => setPhotoViewer(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(2,6,23,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 18, padding: 18,
          maxWidth: 1000, width: "100%", maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 30px 80px rgba(2,6,23,0.5)",
          border: "1px solid rgba(148,163,184,0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 1100, color: "#0f172a", fontSize: 16 }}>
            📷 {photoViewer.title || "Session Photos"}
          </div>
          <button
            onClick={() => setPhotoViewer(null)}
            style={{
              padding: "8px 14px", borderRadius: 10,
              border: "1px solid #e5e7eb", background: "#f8fafc",
              color: "#0f172a", fontWeight: 1000, cursor: "pointer",
            }}
          >
            Close ✖
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {photoViewer.images.map((im, i) => (
            <a
              key={i}
              href={im.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                overflow: "hidden",
                background: "#f8fafc",
              }}
              title="Open photo in a new tab"
            >
              <img
                src={im.url}
                alt={im.name || `image-${i + 1}`}
                style={{ width: "100%", height: "auto", display: "block", maxHeight: "70vh", objectFit: "contain" }}
              />
              {im.name ? (
                <div style={{ padding: 8, fontSize: 12, color: "#475569", fontWeight: 900, wordBreak: "break-all" }}>
                  {im.name}
                </div>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
