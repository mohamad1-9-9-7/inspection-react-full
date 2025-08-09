import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserShield } from "react-icons/fa";

export default function LoginKPI() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (username === "kpiadmin" && password === "123456") {
        localStorage.setItem("kpi_logged_in", "yes");
        setLoading(false);
        navigate("/kpi");
      } else {
        setError("بيانات الدخول غير صحيحة / Wrong credentials");
        setLoading(false);
      }
    }, 700); // لمحاكاة التحميل فقط
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg, #e8daef 70%, #d6eaf8 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        maxWidth: 370,
        width: "100%",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 8px 36px #b19cd9bb",
        padding: 38,
        textAlign: "center",
        position: "relative"
      }}>
        <div style={{
          fontSize: 52,
          color: "#7d3c98",
          marginBottom: 14
        }}>
          <FaUserShield />
        </div>
        <h2 style={{
          fontWeight: "bold",
          color: "#512e5f",
          marginBottom: 16,
          letterSpacing: "0.01em"
        }}>
          لوحة مؤشرات الأداء<br /><span style={{ fontWeight: 500, fontSize: "0.9em", color: "#a569bd" }}>KPI Dashboard</span>
        </h2>
        <form onSubmit={handleLogin}>
          <input
            placeholder="اسم المستخدم / Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          <input
            placeholder="كلمة المرور / Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />
          {error && <div style={{ color: "#c0392b", marginBottom: 15 }}>{error}</div>}
          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "جاري الدخول ..." : "دخول / Login"}
          </button>
        </form>
        <div style={{
          marginTop: 18,
          color: "#b2babb",
          fontSize: "0.97em"
        }}>
          دخول خاص لإدارة لوحة مؤشرات الأداء. يرجى استخدام بياناتك المعتمدة.
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 13px",
  marginBottom: 18,
  borderRadius: 10,
  border: "1.8px solid #d2b4de",
  fontSize: "1.07em",
  background: "#fcf3ff",
  outline: "none",
  transition: "border 0.18s",
};

const btnStyle = {
  width: "100%",
  background: "linear-gradient(95deg, #884ea0 80%, #5dade2 120%)",
  color: "#fff",
  border: "none",
  padding: "12px 0",
  borderRadius: 9,
  fontWeight: "bold",
  fontSize: "1.12rem",
  letterSpacing: "0.02em",
  cursor: "pointer",
  boxShadow: "0 2px 12px #d2b4de",
  transition: "background 0.2s",
};
