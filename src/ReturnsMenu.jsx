// src/ReturnsMenu.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ReturnsMenu() {
  const [hoveredId, setHoveredId] = useState(null);

  const tiles = [
    { id: "create", title: "إنشاء تقرير", icon: "📝", path: "/returns" },
    { id: "browse", title: "تصفح التقارير", icon: "📂", path: "/returns/browse" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "start",
        paddingTop: "4rem",
        fontFamily: "Cairo, sans-serif",
        background: "linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)",
        color: "#fff",
        direction: "rtl",
      }}
    >
      {/* عنوان الصفحة */}
      <h2
        style={{
          marginBottom: "2rem",
          fontWeight: "bold",
          textShadow: "1px 1px 4px rgba(0,0,0,0.4)",
        }}
      >
        مرتجعات — اختر الإجراء
      </h2>

      {/* الشبكة بنفس نمط صفحة الدخول */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          flexWrap: "wrap",
          maxWidth: "700px",
        }}
      >
        {tiles.map((t) => (
          <Link key={t.id} to={t.path} style={{ textDecoration: "none" }}>
            <div
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                fontSize: "3rem",
                padding: "1rem 2rem",
                borderRadius: "16px",
                cursor: "pointer",
                border: "3px solid #fff",
                backgroundColor:
                  hoveredId === t.id
                    ? "rgba(255, 255, 255, 0.35)"
                    : "rgba(255, 255, 255, 0.2)",
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
                transform: hoveredId === t.id ? "scale(1.05)" : "scale(1)",
                textAlign: "center",
              }}
            >
              <span>{t.icon}</span>
              <span style={{ fontSize: "1.1rem" }}>{t.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
