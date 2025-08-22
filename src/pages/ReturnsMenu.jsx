// src/ReturnsMenu.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function PasswordModal({ show, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");
  React.useEffect(() => { if (show) setPassword(""); }, [show]);
  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, width: "100vw", height: "100vh",
      background: "rgba(44,62,80,0.24)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 2000, direction: "rtl",
    }}>
      <div style={{
        background: "#fff", padding: "2.2rem 2.5rem", borderRadius: "17px",
        minWidth: 320, boxShadow: "0 4px 32px #2c3e5077", textAlign: "center",
        position: "relative", fontFamily: "Cairo, sans-serif",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, left: 15, fontSize: 22,
          background: "transparent", border: "none", color: "#c0392b", cursor: "pointer",
        }}>✖</button>

        <div style={{ fontWeight: "bold", fontSize: "1.18em", color: "#2980b9", marginBottom: 14 }}>
          🔒 كلمة سر إنشاء تقرير المرتجعات
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(password); }}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            placeholder="أدخل كلمة السر / Enter password"
            style={{
              width: "90%", padding: "11px", fontSize: "1.1em",
              border: "1.8px solid #b2babb", borderRadius: "10px",
              marginBottom: 16, background: "#f4f6f7",
            }}
            value={password}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPassword(onlyDigits);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button type="submit" style={{
            width: "100%", background: "#884ea0", color: "#fff", border: "none",
            padding: "11px 0", borderRadius: "8px", fontWeight: "bold",
            fontSize: "1.13rem", marginBottom: 10, cursor: "pointer",
            boxShadow: "0 2px 12px #d2b4de",
          }}>
            دخول
          </button>
          {error && <div style={{ color: "#c0392b", fontWeight: "bold", marginTop: 5 }}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function ReturnsMenu() {
  const [hoveredId, setHoveredId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const navigate = useNavigate();

  // 🔐 Password for creating report
  const PASSWORD = "9999";

  const tileStyle = (active) => ({
    fontSize: "3rem",
    padding: "1rem 2rem",
    borderRadius: "16px",
    cursor: "pointer",
    border: "3px solid #fff",
    backgroundColor: active ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.2)",
    width: "140px",
    height: "140px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
    color: "#fff",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(255, 255, 255, 0.4)",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    backdropFilter: "blur(5px)",
    transform: active ? "scale(1.05)" : "scale(1)",
    textAlign: "center",
  });

  // ✅ Brand text (top-right)
  const brandWrap = {
    position: "fixed",
    top: 10,
    right: 16,
    textAlign: "right",
    zIndex: 9999,
    pointerEvents: "none",
  };
  const brandTitle = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 900,
    letterSpacing: "1px",
    fontSize: "18px",
    color: "#b91c1c",
  };
  const brandSub = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 600,
    fontSize: "11px",
    color: "#374151",
    opacity: 0.9,
  };

  const openPassword = () => { setModalOpen(true); setModalError(""); };
  const handleSubmitPassword = (val) => {
    if (val === PASSWORD) {
      setModalOpen(false);
      setModalError("");
      navigate("/returns");
    } else {
      setModalError("❌ كلمة السر غير صحيحة!");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "start", paddingTop: "4rem", fontFamily: "Cairo, sans-serif",
      background: "linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)", color: "#fff", direction: "rtl",
    }}>
      {/* Brand text (no image) */}
      <div style={brandWrap}>
        <div style={brandTitle}>AL MAWASHI</div>
        <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
      </div>

      <h2 style={{ marginBottom: "2rem", fontWeight: "bold", textShadow: "1px 1px 4px rgba(0,0,0,0.4)" }}>
        مرتجعات — اختر الإجراء
      </h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", maxWidth: "700px" }}>
        {/* إنشاء تقرير (محمي بكلمة سر) */}
        <div
          role="button" tabIndex={0}
          onClick={openPassword}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPassword()}
          onMouseEnter={() => setHoveredId("create")}
          onMouseLeave={() => setHoveredId(null)}
          style={tileStyle(hoveredId === "create")}
        >
          <span>📝</span>
          <span style={{ fontSize: "1.1rem" }}>إنشاء تقرير</span>
        </div>

        {/* تصفّح التقارير (بدون كلمة سر) */}
        <Link to="/returns/browse" style={{ textDecoration: "none" }}>
          <div
            onMouseEnter={() => setHoveredId("browse")}
            onMouseLeave={() => setHoveredId(null)}
            style={tileStyle(hoveredId === "browse")}
          >
            <span>📂</span>
            <span style={{ fontSize: "1.1rem" }}>تصفح التقارير</span>
          </div>
        </Link>
      </div>

      <PasswordModal
        show={modalOpen}
        onSubmit={handleSubmitPassword}
        onClose={() => setModalOpen(false)}
        error={modalError}
      />
    </div>
  );
}
