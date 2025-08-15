// src/pages/AdminDashboard.js

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReportsTab from "./admin/ReportsTab";
import DailyReportsTab from "./admin/DailyReportsTab";
import QCSDailyView from "./admin/QCSDailyView";
import POS19DailyView from "./admin/POS19DailyView";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard from "./KPIDashboard";
import ReturnView from "./ReturnView";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView] = useState("reports");
  const [language, setLanguage] = useState("ar");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user) {
      navigate("/");
      return;
    }
    setReports(JSON.parse(localStorage.getItem("reports") || "[]"));
    setDailyReports(JSON.parse(localStorage.getItem("dailyReports") || "[]"));
  }, [navigate, language]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  // لمسة عصرية لأزرار التبويب
  function tabButtonStyle(view) {
    const isActive = activeView === view;
    return {
      padding: "13px 28px",
      borderRadius: "14px 14px 0 0",
      border: "none",
      cursor: "pointer",
      background: isActive
        ? "linear-gradient(90deg, #6d28d9 0%, #8e44ad 70%)"
        : "rgba(255,255,255,0.6)",
      color: isActive ? "#fff" : "#5b2c6f",
      transition: "transform .18s ease, box-shadow .18s ease, background .3s",
      fontWeight: 800,
      fontSize: "1.07em",
      boxShadow: isActive
        ? "0 10px 26px rgba(141, 73, 170, 0.25)"
        : "0 4px 12px rgba(141, 73, 170, 0.08)",
      borderBottom: isActive ? "4px solid #4a148c" : "4px solid transparent",
      marginBottom: isActive ? 0 : 5,
      outline: "none",
      backdropFilter: "blur(6px)",
    };
  }

  function exportToJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          alert(
            language === "ar"
              ? "ملف غير صالح: يجب أن يحتوي على مصفوفة بيانات."
              : "Invalid file: must contain an array."
          );
          return;
        }
        switch (activeView) {
          case "reports": {
            const mergedReports = [...reports, ...importedData];
            setReports(mergedReports);
            localStorage.setItem("reports", JSON.stringify(mergedReports));
            alert(
              language === "ar"
                ? "تم استيراد بيانات التقارير بنجاح."
                : "Reports data imported successfully."
            );
            break;
          }
          case "dailyReports": {
            const mergedDailyReports = [...dailyReports, ...importedData];
            setDailyReports(mergedDailyReports);
            localStorage.setItem(
              "dailyReports",
              JSON.stringify(mergedDailyReports)
            );
            alert(
              language === "ar"
                ? "تم استيراد بيانات التقارير اليومية بنجاح."
                : "Daily reports data imported successfully."
            );
            break;
          }
          default:
            alert(language === "ar" ? "التبويب غير معروف." : "Unknown tab.");
        }
      } catch {
        alert(
          language === "ar"
            ? "فشل في قراءة الملف أو تنسيقه غير صالح."
            : "Failed to read file or invalid format."
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div
      style={{
        padding: "2.7rem 1.5rem 2rem 1.5rem",
        direction: language === "ar" ? "rtl" : "ltr",
        fontFamily:
          language === "ar" ? "Cairo, Segoe UI" : "Inter, Arial, sans-serif",
        background:
          "linear-gradient(120deg, #f6f8fa 55%, #f4ecf7 75%, #efe7f5 100%)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* اختيار اللغة */}
      <div
        style={{
          marginBottom: "1.7rem",
          textAlign: language === "ar" ? "left" : "right",
          fontWeight: "bold",
        }}
      >
        <label>
          {language === "ar" ? "اختر اللغة: " : "Select Language: "}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: "8px 18px",
              fontSize: "1.05em",
              borderRadius: 12,
              border: "2px solid #8e44ad",
              background: "linear-gradient(180deg,#ffffff,#fcf3ff)",
              fontWeight: 800,
              color: "#5b2c6f",
              boxShadow: "0 6px 18px rgba(141,73,170,.12)",
            }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      {/* ترويسة وعمل logout */}
      <div
        style={{
          background: "rgba(255,255,255,0.8)",
          padding: "1.2rem 1.5rem",
          borderRadius: "18px",
          marginBottom: "1.7rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 12px 36px rgba(141, 73, 170, 0.12)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(141,73,170,0.12)",
        }}
      >
        <h2
          style={{
            color: "#4a148c",
            letterSpacing: "0.01em",
            margin: 0,
            fontWeight: 900,
            fontSize: "2.1em",
          }}
        >
          {language === "ar" ? "📊 لوحة تحكم المدير" : "📊 Admin Dashboard"}
        </h2>
        <button
          onClick={handleLogout}
          style={{
            background:
              "linear-gradient(180deg, #ff6b6b 0%, #e74c3c 100%)",
            color: "white",
            border: "none",
            padding: "12px 28px",
            borderRadius: "14px",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: "1.02em",
            boxShadow: "0 10px 24px rgba(231,76,60,.25)",
            letterSpacing: ".01em",
            transform: "translateZ(0)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          {language === "ar" ? "🚪 تسجيل الخروج" : "🚪 Logout"}
        </button>
      </div>

      {/* التبويبات الرئيسية */}
      <div
        style={{
          display: "flex",
          gap: "0.85rem",
          marginBottom: "2.3rem",
          flexWrap: "wrap",
          borderBottom: "2.5px solid #e1bee7",
          paddingBottom: 10,
          background: "transparent",
        }}
      >
        <button
          onClick={() => setActiveView("reports")}
          style={tabButtonStyle("reports")}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 12px 32px rgba(141,73,170,.18)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.boxShadow =
              activeView === "reports"
                ? "0 10px 26px rgba(141, 73, 170, 0.25)"
                : "0 4px 12px rgba(141, 73, 170, 0.08)")
          }
        >
          {language === "ar" ? "📑 التقارير" : "📑 Reports"}
        </button>

        <button
          onClick={() => setActiveView("dailyReports")}
          style={tabButtonStyle("dailyReports")}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 12px 32px rgba(141,73,170,.18)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.boxShadow =
              activeView === "dailyReports"
                ? "0 10px 26px rgba(141, 73, 170, 0.25)"
                : "0 4px 12px rgba(141, 73, 170, 0.08)")
          }
        >
          {language === "ar" ? "🗓️ التقارير اليومية" : "🗓️ Daily Reports"}
        </button>

        <button
          onClick={() => setActiveView("qcsShipment")}
          style={tabButtonStyle("qcsShipment")}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 12px 32px rgba(141,73,170,.18)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.boxShadow =
              activeView === "qcsShipment"
                ? "0 10px 26px rgba(141, 73, 170, 0.25)"
                : "0 4px 12px rgba(141, 73, 170, 0.08)")
          }
        >
          {language === "ar" ? "📦 شحنات QCS" : "📦 QCS Shipments"}
        </button>

        <button
          onClick={() => setActiveView("returns")}
          style={tabButtonStyle("returns")}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 12px 32px rgba(141,73,170,.18)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.boxShadow =
              activeView === "returns"
                ? "0 10px 26px rgba(141, 73, 170, 0.25)"
                : "0 4px 12px rgba(141, 73, 170, 0.08)")
          }
        >
          {language === "ar" ? "🛒 المرتجعات" : "🛒 Returns"}
        </button>

        <button
          onClick={() => setActiveView("kpi")}
          style={tabButtonStyle("kpi")}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 12px 32px rgba(141,73,170,.18)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.boxShadow =
              activeView === "kpi"
                ? "0 10px 26px rgba(141, 73, 170, 0.25)"
                : "0 4px 12px rgba(141, 73, 170, 0.08)")
          }
        >
          {language === "ar" ? "📈 لوحة الـ KPI" : "📈 KPI Dashboard"}
        </button>
      </div>

      {/* أزرار التصدير والاستيراد */}
      {["reports", "dailyReports"].includes(activeView) && (
        <div style={{ marginBottom: "1.4rem" }}>
          <button
            onClick={() => {
              let data = [];
              let name = "";
              if (activeView === "reports") {
                data = reports;
                name = "reports_backup.json";
              }
              if (activeView === "dailyReports") {
                data = dailyReports;
                name = "daily_reports_backup.json";
              }
              exportToJson(data, name);
            }}
            style={{
              marginInlineStart: 15,
              background:
                "linear-gradient(180deg,#8e44ad 0%, #6d28d9 100%)",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: "1.02em",
              boxShadow: "0 10px 22px rgba(141,73,170,.20)",
              letterSpacing: ".01em",
            }}
          >
            {language === "ar"
              ? "⬇️ تصدير البيانات (JSON)"
              : "⬇️ Export Data (JSON)"}
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              background:
                "linear-gradient(180deg,#27ae60 0%, #1e8449 100%)",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: "1.02em",
              boxShadow: "0 10px 22px rgba(30,132,73,.20)",
              letterSpacing: ".01em",
            }}
          >
            {language === "ar"
              ? "⬆️ استيراد البيانات (JSON)"
              : "⬆️ Import Data (JSON)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* عرض المحتوى حسب التبويب */}
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          borderRadius: "18px",
          boxShadow: "0 16px 40px rgba(141,73,170,.10)",
          padding: "1.5rem 1rem",
          minHeight: "67vh",
          border: "1px solid rgba(141,73,170,0.10)",
          backdropFilter: "blur(6px)",
        }}
      >
        {activeView === "reports" ? (
          <ReportsTab reports={reports} setReports={setReports} language={language} />
        ) : activeView === "dailyReports" ? (
          <DailyReportsTab
            dailyReports={dailyReports}
            setDailyReports={setDailyReports}
            onOpenQCSReport={() => setActiveView("qcs")}
            onOpenPOS19Report={() => setActiveView("pos19")}
            onOpenQCSShipmentReport={() => setActiveView("qcsShipment")}
            language={language}
          />
        ) : activeView === "qcsShipment" ? (
          <QCSRawMaterialView language={language} />
        ) : activeView === "returns" ? (
          <ReturnView />
        ) : activeView === "kpi" ? (
          <KPIDashboard />
        ) : activeView === "qcs" ? (
          <QCSDailyView language={language} />
        ) : activeView === "pos19" ? (
          <POS19DailyView language={language} />
        ) : null}
      </div>

      <div
        style={{
          marginTop: 55,
          textAlign: "center",
          color: "#a3a4a8",
          fontSize: "1.05em",
          fontWeight: 700,
        }}
      >
        {language === "ar"
          ? "جميع الحقوق محفوظة © نظام إدارة الجودة"
          : "All rights reserved © Quality Management System"}
      </div>
    </div>
  );
}
