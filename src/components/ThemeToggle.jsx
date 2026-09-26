// src/components/ThemeToggle.jsx
// Small round button, fixed bottom-left on every page: ☀️ day ⇄ 🌙 night.
// Mounted once in App.jsx. The mode itself: utils/theme.js + styles/theme-dark.css.
import React, { useEffect, useState } from "react";
import { getTheme, setTheme } from "../utils/theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail === "dark" ? "dark" : "light");
    window.addEventListener("app:theme-changed", onChange);
    return () => window.removeEventListener("app:theme-changed", onChange);
  }, []);

  const dark = theme === "dark";
  const label = dark ? "الوضع النهاري / Day mode" : "الوضع الليلي / Night mode";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={label}
      aria-label={label}
      aria-pressed={dark}
      style={{
        position: "fixed",
        bottom: 14,
        left: 14,
        zIndex: 9990,
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid rgba(15,23,42,.15)",
        background: dark ? "#fef9c3" : "#1e293b",
        color: dark ? "#1e293b" : "#fff",
        fontSize: 18,
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(15,23,42,.25)",
        display: "grid",
        placeItems: "center",
        opacity: 0.85,
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
