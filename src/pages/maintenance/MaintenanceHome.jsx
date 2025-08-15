import React from "react";
import { useNavigate } from "react-router-dom";

export default function MaintenanceHome() {
  const navigate = useNavigate();

  // عرض ثنائي اللغة بدون تبديل
  const Title = ({ ar, en }) => (
    <div style={{ fontWeight: 900, color: "#0f172a", textAlign: "center" }}>
      <div style={{ fontSize: 16 }}>{ar}</div>
      <div style={{ fontSize: 12, color: "#475569" }}>{en}</div>
    </div>
  );

  const Card = ({ icon, ar, en, onClick }) => (
    <div
      onClick={onClick}
      style={{
        width: 220,
        height: 180,
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        background: "#fff",
        boxShadow: "0 8px 20px rgba(2,6,23,.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        cursor: "pointer",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(2,6,23,.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(2,6,23,.06)";
      }}
    >
      <div style={{ fontSize: 42 }}>{icon}</div>
      <Title ar={ar} en={en} />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        fontFamily: "Cairo, ui-sans-serif, system-ui",
        direction: "rtl",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
              🛠️ طلبات الصيانة / Maintenance
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              اختر وظيفة / Choose an action
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {/* زر إنشاء الطلب */}
          <Card
            icon="➕"
            ar="إنشاء طلب"
            en="Create Request"
            onClick={() => navigate("/maintenance-requests")}
          />

          {/* زر تصفّح الطلبات - يفتح صفحة BrowseMaintenanceRequests */}
          <Card
            icon="📋"
            ar="تصفّح الطلبات"
            en="Browse Requests"
            onClick={() => navigate("/maintenance-browse")}
          />

          {/* زر تأكيد الطلبات - مؤقت */}
          <Card
            icon="✅"
            ar="تأكيد الطلبات"
            en="Confirm Requests"
            onClick={() => alert("قريبًا / Coming soon")}
          />
        </div>
      </div>
    </div>
  );
}
