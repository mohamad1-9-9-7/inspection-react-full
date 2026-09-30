// src/companies/exaltis/ohc/view/ImageModal.jsx
// OHC view — full-size image modal.
// (Extracted from OHCView.jsx — the code is unchanged.)

export function ImageModal({ closeModal, modalImage, handleDeleteImage }) {
  return (
    <div
      onClick={closeModal}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(15,23,42,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(135deg,#f9fafb,#e5e7eb,#d1d5db)",
          borderRadius: 16,
          padding: 16,
          maxWidth: "90%",
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(15,23,42,0.85)",
          border: "1px solid rgba(148,163,184,0.9)",
        }}
      >
        <div
          style={{
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#0f172a",
            }}
          >
            {modalImage.name || "OHC Certificate"}{" "}
            {modalImage.appNo
              ? ` (Employee Number: ${modalImage.appNo})`
              : ""}
          </div>
          <button
            onClick={closeModal}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 20,
              fontWeight: 700,
              cursor: "pointer",
              lineHeight: 1,
              color: "#111827",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#020617",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={modalImage.src}
            alt="OHC certificate"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <a
            href={modalImage.src}
            download={`OHC-${modalImage.appNo || "certificate"}.jpg`}
            style={{
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 999,
              border: 0,
              background:
                "linear-gradient(135deg,#0ea5e9,#0369a1)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Download
          </a>
          <button
            onClick={() => handleDeleteImage(modalImage)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: 0,
              background:
                "linear-gradient(135deg,#ef4444,#b91c1c)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
           data-delete-action="true">
            Remove Image
          </button>
          <button
            onClick={closeModal}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: 0,
              background:
                "linear-gradient(135deg,#94a3b8,#64748b)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
