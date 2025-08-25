// src/pages/maintenance/MaintenanceHome.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function MaintenanceHome() {
  const navigate = useNavigate();

  const Button = ({ icon, label, kind = "primary", onClick }) => {
    const base = {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 20px",
      borderRadius: 28,
      cursor: "pointer",
      fontWeight: 800,
      letterSpacing: 0.2,
      transition: "transform .15s ease, box-shadow .15s ease, opacity .15s",
      justifyContent: "center",
      fontSize: 14,
      userSelect: "none",
      border: "1px solid rgba(255,255,255,0.25)",
      boxShadow: "0 10px 24px rgba(2,6,23,.16)",
    };

    const styles =
      kind === "primary"
        ? {
            ...base,
            color: "#fff",
            background:
              "linear-gradient(180deg, rgba(124,58,237,1) 0%, rgba(59,130,246,1) 100%)",
          }
        : {
            ...base,
            color: "#111827",
            background: "linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)",
          };

    return (
      <div
        onClick={onClick}
        style={styles}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 14px 32px rgba(2,6,23,.22)";
          e.currentTarget.style.opacity = "0.95";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 10px 24px rgba(2,6,23,.16)";
          e.currentTarget.style.opacity = "1";
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        {label}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        direction: "ltr",
        fontFamily: "Cairo, ui-sans-serif, system-ui",
        background:
          "linear-gradient(135deg,#5b21b6 0%,#3b82f6 45%,#06b6d4 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* زخارف خافتة بدون لون أبيض مزعج */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          top: -120,
          left: -120,
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0))",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          bottom: -180,
          right: -160,
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.10), rgba(255,255,255,0))",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      {/* watermark */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 14,
          color: "rgba(255,255,255,0.85)",
          fontSize: 11,
          fontWeight: 700,
          textShadow: "0 1px 4px rgba(0,0,0,.25)",
          pointerEvents: "none",
        }}
      >
        Trans Emirates Livestock Trading L.L.C.
      </div>

      {/* بطاقة زجاجية ناعمة (بدون الشريط الأبيض) */}
      <div
        style={{
          maxWidth: 920,
          margin: "90px auto",
          padding: "36px 28px 40px",
          borderRadius: 22,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 22px 55px rgba(31,38,135,0.35)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#ffffff",
            fontSize: 28,
            fontWeight: 900,
            margin: "4px 0 28px",
            textShadow: "0 2px 8px rgba(0,0,0,0.35)",
            letterSpacing: 0.3,
          }}
        >
          Maintenance Requests
        </h1>

        {/* أزرار */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          <Button
            icon="📁"
            label="Browse Requests"
            kind="primary"
            onClick={() => navigate("/maintenance-browse")}
          />
          <Button
            icon="🧾"
            label="Create Request"
            kind="secondary"
            onClick={() => navigate("/maintenance-requests")}
          />
        </div>
      </div>
    </div>
  );
}
