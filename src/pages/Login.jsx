import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../assets/almawashi-logo.jpg';

// الأدوار
const roles = [
  { id: 'admin', label: 'مدير', route: '/admin', icon: '👑' },
  { id: 'inspector', label: 'مفتش', route: '/inspection', icon: '🔍' },
  { id: 'supervisor', label: 'مشرف', route: '/supervisor', icon: '🛠️' },
  { id: 'daily', label: 'مراقبة يومية', route: '/monitor', icon: '📅' },
  { id: 'ohc', label: 'OHC', route: '/ohc', icon: '🩺' },
  { id: 'returns', label: 'مرتجعات', route: '/returns', icon: '♻️' },
  // ⬇️⬇️⬇️ الإضافة الجديدة:
  { id: 'finalProduct', label: 'تقرير المنتج النهائي', route: '/finished-product-entry', icon: '🏷️' },

];

// نافذة كلمة السر
function PasswordModal({ show, roleLabel, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");

  // عندما تظهر النافذة يتم تصفير كلمة السر
  React.useEffect(() => {
    if (show) setPassword("");
  }, [show]);

  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, width: "100vw", height: "100vh",
      background: "rgba(44,62,80,0.24)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "#fff",
        padding: "2.2rem 2.5rem",
        borderRadius: "17px",
        minWidth: 320,
        boxShadow: "0 4px 32px #2c3e5077",
        textAlign: "center",
        position: "relative"
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, left: 15,
            fontSize: 22, background: "transparent", border: "none", color: "#c0392b",
            cursor: "pointer"
          }}
          title="إغلاق"
        >✖</button>
        <div style={{ fontWeight: "bold", fontSize: "1.18em", color: "#2980b9", marginBottom: 14 }}>
          🔒 كلمة سر الدخول لقسم: <span style={{ color: "#8e44ad" }}>{roleLabel}</span>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          onSubmit(password);
        }}>
          <input
            type="password"
            autoFocus
            placeholder="ادخل كلمة السر"
            style={{
              width: "90%",
              padding: "11px",
              fontSize: "1.1em",
              border: "1.8px solid #b2babb",
              borderRadius: "10px",
              marginBottom: 16,
              background: "#f4f6f7"
            }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#884ea0",
              color: "#fff",
              border: "none",
              padding: "11px 0",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "1.13rem",
              marginBottom: 10,
              cursor: "pointer",
              boxShadow: "0 2px 12px #d2b4de",
              transition: "background 0.2s"
            }}
          >
            دخول
          </button>
          {error && <div style={{ color: "#c0392b", fontWeight: "bold", marginTop: 5 }}>{error}</div>}
        </form>
        <div style={{ marginTop: 7, fontSize: "0.99em", color: "#808b96" }}>
          Password required for access
        </div>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [hoveredRoleId, setHoveredRoleId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalError, setModalError] = useState("");

  // كلمة السر الموحدة:
  const PASSWORD = "0000";

  // عند ضغط زر
  const handleRoleClick = (role) => {
    setSelectedRole(role);
    setModalOpen(true);
    setModalError("");
  };

  // فحص كلمة السر
  const handleModalSubmit = (password) => {
    if (password === PASSWORD) {
      setModalOpen(false);
      setErrorMsg("");
      localStorage.setItem('currentUser', JSON.stringify({
        username: selectedRole.id,
        role: selectedRole.label,
      }));
      navigate(selectedRole.route);
    } else {
      setModalError("❌ كلمة السر غير صحيحة! / Wrong password!");
    }
  };

  // عند إغلاق المودال
  const handleModalClose = () => {
    setModalOpen(false);
    setModalError("");
    setSelectedRole(null);
  };

  return (
    <div
      className="login-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'start',
        paddingTop: '4rem',
        fontFamily: 'Cairo, sans-serif',
        background: 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)',
        color: '#fff',
      }}
    >
      <img
        src={logo}
        alt="شعار المواشي"
        style={{
          width: '180px',
          marginBottom: '3rem',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(255, 255, 255, 0.6)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 255, 255, 0.9)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.6)';
        }}
      />
      <h2 style={{ marginBottom: '2rem', fontWeight: 'bold', textShadow: '1px 1px 4px rgba(0,0,0,0.4)' }}>
        اختر دورك للدخول
      </h2>
      {errorMsg && (
        <div style={{
          marginBottom: 20,
          color: "#ffe0e0",
          background: "#c0392b",
          borderRadius: 12,
          padding: "10px 22px",
          fontWeight: "bold",
          fontSize: "1.12em",
          boxShadow: "0 2px 12px #fff6",
          border: "1.5px solid #fff"
        }}>
          {errorMsg}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          maxWidth: '700px',
        }}
      >
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => handleRoleClick(role)}
            onMouseEnter={() => setHoveredRoleId(role.id)}
            onMouseLeave={() => setHoveredRoleId(null)}
            style={{
              fontSize: '3rem',
              padding: '1rem 2rem',
              borderRadius: '16px',
              cursor: 'pointer',
              border: '3px solid #fff',
              backgroundColor: hoveredRoleId === role.id ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
              width: '140px',
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#fff',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.4)',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              backdropFilter: 'blur(5px)',
              transform: hoveredRoleId === role.id ? "scale(1.05)" : "scale(1)"
            }}
          >
            <span>{role.icon}</span>
            <span style={{ fontSize: '1.2rem' }}>{role.label}</span>
          </button>
        ))}
      </div>
      {/* زر خاص بلوحة KPI */}
      <button
        onClick={() => handleRoleClick({
          id: 'kpi',
          label: 'لوحة المؤشرات',
          route: '/kpi-login',
          icon: '📊'
        })}
        style={{
          marginTop: "2.5rem",
          padding: "1.2rem 2.5rem",
          borderRadius: "20px",
          background: "#fff",
          color: "#2980b9",
          border: "2px solid #2980b9",
          fontSize: "1.45rem",
          fontWeight: "bold",
          boxShadow: "0 4px 14px rgba(41,128,185,0.13)",
          transition: "background 0.3s, color 0.3s, transform 0.2s",
          cursor: "pointer",
          letterSpacing: "1px",
          transform: hoveredRoleId === "kpi" ? "scale(1.05)" : "scale(1)"
        }}
        onMouseEnter={() => setHoveredRoleId("kpi")}
        onMouseLeave={() => setHoveredRoleId(null)}
      >
        📊 دخول لوحة المؤشرات (KPI)
      </button>
      {/* نافذة كلمة السر */}
      <PasswordModal
        show={modalOpen}
        roleLabel={selectedRole?.label}
        onSubmit={handleModalSubmit}
        onClose={handleModalClose}
        error={modalError}
      />
    </div>
  );
}

export default Login;
