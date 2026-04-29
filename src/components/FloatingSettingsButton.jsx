// src/components/FloatingSettingsButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function FloatingSettingsButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/settings")}
      title="الإعدادات / Settings"
      aria-label="Settings"
      style={{
        position: "fixed",
        top: 14,
        insetInlineEnd: 14,
        zIndex: 9999,
        width: 46,
        height: 46,
        borderRadius: "50%",
        border: "none",
        background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
        color: "#fff",
        fontSize: 22,
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(30,58,95,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform .18s, box-shadow .18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(30,58,95,.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,58,95,.35)";
      }}
    >
      ⚙️
    </button>
  );
}
