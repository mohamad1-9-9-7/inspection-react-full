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
      inset: 0,
      background: "rgba(17,24,39,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        padding: "2.2rem 2.5rem",
        borderRadius: "18px",
        minWidth: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        textAlign: "center",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.6)",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, left: 14,
            fontSize: 22, background: "transparent", border: "none", color: "#b91c1c",
            cursor: "pointer"
          }}
          title="إغلاق / Close"
        >✖</button>

        <div style={{ fontWeight: "bold", fontSize: "1.1em", color: "#1f2937", marginBottom: 12 }}>
          🔒 كلمة سر الدخول لقسم / Password to access:
        </div>
        <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 16 }}>{roleLabel}</div>

        <form onSubmit={e => { e.preventDefault(); onSubmit(password); }}>
          <input
            type="password"
            autoFocus
            placeholder="ادخل كلمة السر / Enter password"
            style={{
              width: "92%",
              padding: "12px",
              fontSize: "1.07em",
              border: "1.8px solid #c7d2fe",
              borderRadius: "12px",
              marginBottom: 14,
              background: "#eef2ff",
              outline: "none",
            }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff",
              border: "none",
              padding: "12px 0",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "1.06rem",
              marginBottom: 8,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(124,58,237,0.35)"
            }}
          >
            دخول / Sign in
          </button>
          {error && <div style={{ color: "#b91c1c", fontWeight: "bold", marginTop: 6 }}>{error}</div>}
        </form>

        <div style={{ marginTop: 8, fontSize: "0.93em", color: "#374151", opacity: 0.9 }}>
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

  // 🔐 كلمات السر: الافتراضي 9999 لكل الأدوار، وreturns = 0000
  const PASSWORDS = {
    returns: "0000",
    default: "9999",
  };

  const handleRoleClick = (role) => {
    // ✅ KPI يدخل مباشرة بدون كلمة سر (في حال كان موجود كزر خارجي)
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
    const expected =
      (selectedRole && PASSWORDS[selectedRole.id]) || PASSWORDS.default;

    if (password === expected) {
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

  // ==== Styles shared with ReturnsMenu look ====
  const brandWrap = {
    position: "fixed",
    top: 12,
    right: 16,
    textAlign: "right",
    zIndex: 3,
    pointerEvents: "none",
  };
  const brandTitle = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 900,
    letterSpacing: "1px",
    fontSize: 18,
    color: "#fef2f2",
    textShadow: "0 1px 8px rgba(0,0,0,0.25)"
  };
  const brandSub = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 600,
    fontSize: 11,
    color: "#f1f5f9",
    opacity: 0.9,
    textShadow: "0 1px 6px rgba(0,0,0,0.25)"
  };

  const card = {
    width: "min(100%, 980px)",
    margin: "0 auto",
    padding: "28px 28px 30px",
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.78))",
    boxShadow: "0 20px 60px rgba(30,58,138,0.25)",
    border: "1px solid rgba(255,255,255,0.65)",
    backdropFilter: "blur(8px)",
    position: "relative",
    zIndex: 2,
  };

  const roleTile = (active) => ({
    width: 160,              // أكبر وضوحاً
    height: 160,
    borderRadius: 24,
    cursor: "pointer",
    border: "2px solid rgba(255,255,255,0.7)",
    background: active
      ? "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.28))"
      : "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18))",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.55rem",
    color: "#0b1220",
    fontWeight: 800,
    boxShadow: active
      ? "0 14px 30px rgba(2,132,199,0.30)"
      : "0 10px 24px rgba(2,132,199,0.22)",
    transition: "transform .2s ease, box-shadow .2s ease, background .25s ease",
    transform: active ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    textAlign: "center",
    userSelect: "none",
  });

  return (
    <div
      className="login-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '4rem 1.2rem 3rem',
        fontFamily: 'Cairo, sans-serif',
        color: '#0b1220',
        position: 'relative',
        overflow: 'hidden',
        // خلفية متدرجة + طبقات
        background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 55%, #111827 100%)',
      }}
    >
      {/* زخرفة موجية علوية */}
      <svg
        viewBox="0 0 1440 320"
        style={{ position: "absolute", top: -60, left: 0, width: "140%", opacity: 0.15, zIndex: 0 }}
      >
        <path
          fill="#ffffff"
          d="M0,224L60,229.3C120,235,240,245,360,213.3C480,181,600,107,720,117.3C840,128,960,224,1080,224C1200,224,1320,128,1380,80L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
        />
      </svg>

      {/* زخرفة موجية سفلية */}
      <svg
        viewBox="0 0 1440 320"
        style={{ position: "absolute", bottom: -90, right: -80, width: "150%", opacity: 0.12, zIndex: 0 }}
      >
        <path
          fill="#ffffff"
          d="M0,96L80,112C160,128,320,160,480,176C640,192,800,192,960,165.3C1120,139,1280,85,1360,58.7L1440,32L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </svg>

      {/* Brand text (top-right) */}
      <div style={brandWrap}>
        <div style={brandTitle}>AL MAWASHI</div>
        <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
      </div>

      {/* بطاقة ترحيب + شبكة الأدوار */}
      <div style={card}>
        {/* شعار أعلى البطاقة */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <img
            src={logo}
            alt="شعار المواشي / Almawashi logo"
            style={{
              width: 160,
              borderRadius: 18,
              boxShadow: "0 8px 26px rgba(0,0,0,0.17)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        </div>

        <h2 style={{
          textAlign: 'center',
          fontWeight: '900',
          marginBottom: 8,
          color: '#0b1220',
          letterSpacing: ".2px"
        }}>
          مرحبًا بك — اختر دورك / Welcome — choose your role
        </h2>
        <div style={{ textAlign: "center", color: "#334155", marginBottom: 20, fontWeight: 600 }}>
          تسجيل دخول سريع بالأدوار المتاحة / Quick role-based access
        </div>

        {errorMsg && (
          <div style={{
            margin: "0 auto 16px",
            color: "#fef2f2",
            background: "#b91c1c",
            borderRadius: 12,
            padding: "10px 18px",
            fontWeight: "bold",
            fontSize: "1.02em",
            boxShadow: "0 6px 14px rgba(185,28,28,0.35)",
            width: "fit-content",
            border: "1.5px solid #fecaca"
          }}>
            {errorMsg}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.2rem',
            flexWrap: 'wrap',
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => handleRoleClick(role)}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
              style={roleTile(hoveredRoleId === role.id)}
              title={role.label}
            >
              <div style={{ fontSize: "3rem", lineHeight: 1 }}>{role.icon}</div>
              <div style={{
                fontSize: "0.95rem",
                textAlign: "center",
                marginTop: "0.2rem",
                color: "#0b1220"
              }}>
                {role.label}
              </div>
            </button>
          ))}
        </div>

        {/* زر خاص بلوحة KPI بدون كلمة سر */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
          <button
            onClick={() => {
              localStorage.setItem('currentUser', JSON.stringify({
                username: 'kpi',
                role: 'لوحة المؤشرات / KPI Dashboard',
              }));
              navigate('/kpi-login');
            }}
            onMouseEnter={() => setHoveredRoleId("kpi")}
            onMouseLeave={() => setHoveredRoleId(null)}
            style={{
              padding: "14px 26px",
              borderRadius: 14,
              background: hoveredRoleId === "kpi"
                ? "linear-gradient(135deg, #22d3ee, #3b82f6)"
                : "linear-gradient(135deg, #06b6d4, #2563eb)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.9)",
              fontSize: "1.05rem",
              fontWeight: "900",
              boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
              transition: "transform .2s ease, box-shadow .2s ease, background .25s ease",
              transform: hoveredRoleId === "kpi" ? "translateY(-2px)" : "translateY(0)",
              cursor: "pointer",
              letterSpacing: "0.3px"
            }}
          >
            📊 دخول لوحة المؤشرات (KPI) / Open KPI Dashboard
          </button>
        </div>
      </div>

      {/* تذييل بسيط */}
      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "left",
        paddingInline: "1rem",
        marginTop: 8,
        color: "#e5e7eb"
      }}>
        تم الإنشاء بواسطة م.محمد عبدالله / Built by Eng. Mohammed Abdullah
      </div>

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
