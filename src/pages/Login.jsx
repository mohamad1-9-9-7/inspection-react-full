// Login.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import logo from '../assets/almawashi-logo.jpg';

// الأدوار (ثنائي اللغة فقط دون تغيير أي من المسارات/المنطق)
const roles = [
  { id: 'admin',        label: 'مدير / Admin',                    route: '/admin',                  icon: '👑' },
  { id: 'inspector',    label: 'مفتش / Inspector',                route: '/inspection',             icon: '🔍' },
  { id: 'supervisor',   label: 'مشرف / Supervisor',               route: '/supervisor',             icon: '🛠️' },
  { id: 'daily',        label: 'مراقبة يومية / Daily Monitor',    route: '/monitor',                icon: '📅' },
  { id: 'ohc',          label: 'OHC',                             route: '/ohc',                    icon: '🩺' },
  { id: 'returns',      label: 'مرتجعات / Returns',               route: '/returns/menu',           icon: '♻️' }, // ✅ كما هو
  { id: 'finalProduct', label: 'تقرير المنتج النهائي / Final Product Report', route: '/finished-product-entry', icon: '🏷️' },
  { id: 'cars',         label: 'السيارات / Cars',                 route: '/cars',                   icon: '🚗' },
  // 🆕 صفحة الهب للصيانة
  { id: 'maintenance',  label: 'طلبات الصيانة / Maintenance',     route: '/maintenance-home',       icon: '🔧' },
];

function PasswordModal({ show, roleLabel, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");

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
          title="إغلاق / Close"
        >✖</button>

        <div style={{ fontWeight: "bold", fontSize: "1.18em", color: "#2980b9", marginBottom: 14 }}>
          🔒 كلمة سر الدخول لقسم / Password to access: <span style={{ color: "#8e44ad" }}>{roleLabel}</span>
        </div>

        <form onSubmit={e => {
          e.preventDefault();
          onSubmit(password);
        }}>
          <input
            type="password"
            autoFocus
            placeholder="ادخل كلمة السر / Enter password"
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
            دخول / Sign in
          </button>
          {error && <div style={{ color: "#c0392b", fontWeight: "bold", marginTop: 5 }}>{error}</div>}
        </form>

        <div style={{ marginTop: 7, fontSize: "0.99em", color: "#808b96" }}>
          يلزم كلمة المرور للدخول / Password required for access
        </div>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredRoleId, setHoveredRoleId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalError, setModalError] = useState("");

  const PASSWORD = "0000";

  const handleRoleClick = (role) => {
    // ✅ KPI يدخل مباشرة بدون كلمة سر
    if (role.id === "kpi") {
      localStorage.setItem('currentUser', JSON.stringify({
        username: role.id,
        role: role.label,
      }));
      navigate(role.route);
      return;
    }
    setSelectedRole(role);
    setModalOpen(true);
    setModalError("");
  };

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

  const handleModalClose = () => {
    setModalOpen(false);
    setModalError("");
    setSelectedRole(null);
  };

  if (location.pathname !== "/") {
    return null;
  }

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
        alt="شعار المواشي / Almawashi logo"
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
        اختر دورك للدخول / Choose your role to sign in
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
              width: '140px',
              height: '140px',
              borderRadius: '50%', // 🔵 دائرة
              cursor: 'pointer',
              border: '3px solid #fff',
              backgroundColor: hoveredRoleId === role.id ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#fff',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.4)',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              backdropFilter: 'blur(5px)',
              transform: hoveredRoleId === role.id ? "scale(1.08)" : "scale(1)"
            }}
          >
            <div style={{
              fontSize: "2.2rem", // حجم الأيقونة
              lineHeight: "1.2",
            }}>
              {role.icon}
            </div>
            <div style={{
              fontSize: "0.95rem",
              textAlign: "center",
              marginTop: "0.3rem",
            }}>
              {role.label}
            </div>
          </button>
        ))}
      </div>

      {/* زر خاص بلوحة KPI بدون كلمة سر */}
      <button
        onClick={() => {
          localStorage.setItem('currentUser', JSON.stringify({
            username: 'kpi',
            role: 'لوحة المؤشرات / KPI Dashboard',
          }));
          navigate('/kpi-login');
        }}
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
        📊 دخول لوحة المؤشرات (KPI) / Open KPI Dashboard
      </button>

      <PasswordModal
        show={modalOpen}
        roleLabel={selectedRole?.label}
        onSubmit={handleModalSubmit}
        onClose={handleModalClose}
        error={modalError}
      />

      <div style={{
        position: "fixed",
        bottom: "10px",
        left: "15px",
        fontSize: "0.75rem",
        color: "#000",
        opacity: 0.8
      }}>
        تم الإنشاء بواسطة م.محمد عبدالله / Built by Eng. Mohammed Abdullah
      </div>
    </div>
  );
}

export default Login;
