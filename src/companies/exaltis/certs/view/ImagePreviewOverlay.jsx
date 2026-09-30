// src/companies/exaltis/certs/view/ImagePreviewOverlay.jsx
// Certificates view — full-size image preview.
// (Extracted from CertView.jsx — the code is unchanged.)

export function ImagePreviewOverlay({ setPreviewImage, previewImage }) {
  return (
    <div
      onClick={() => setPreviewImage(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "90%",
          maxHeight: "90%",
        }}
      >
        <img
          src={previewImage}
          alt="Certificate full"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            border: "2px solid #e5e7eb",
          }}
        />
        <button
          type="button"
          onClick={() => setPreviewImage(null)}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 32,
            height: 32,
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg,#111827,#1f2937,#111827)",
            color: "#f9fafb",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
