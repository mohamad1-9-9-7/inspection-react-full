// src/pages/AdminDashboard.js

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReportsTab from "./admin/ReportsTab";
import QuestionsTab from "./admin/QuestionsTab";
import DailyReportsTab from "./admin/DailyReportsTab";
import QCSDailyView from "./admin/QCSDailyView";
import POS19DailyView from "./admin/POS19DailyView";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard from "./KPIDashboard";
import ReturnView from "./ReturnView";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
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
    setQuestions(JSON.parse(localStorage.getItem("allQuestions") || "[]"));
    setUsers(JSON.parse(localStorage.getItem("readonlyUsers") || "[]"));
    setDailyReports(JSON.parse(localStorage.getItem("dailyReports") || "[]"));
  }, [navigate, language]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  function tabButtonStyle(view) {
    return {
      padding: "13px 28px",
      borderRadius: "15px 15px 0 0",
      border: "none",
      cursor: "pointer",
      background: activeView === view
        ? "linear-gradient(90deg, #8e44ad 85%, #e8daef 140%)"
        : "#f6f8fa",
      color: activeView === view ? "#fff" : "#512e5f",
      transition: "0.22s",
      fontWeight: "bold",
      fontSize: "1.07em",
      boxShadow: activeView === view
        ? "0 2px 16px #d2b4de99"
        : "none",
      borderBottom: activeView === view
        ? "4px solid #512e5f"
        : "4px solid transparent",
      marginBottom: activeView === view ? 0 : 5,
      outline: "none",
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
          case "reports":
            const mergedReports = [...reports, ...importedData];
            setReports(mergedReports);
            localStorage.setItem("reports", JSON.stringify(mergedReports));
            alert(language === "ar" ? "تم استيراد بيانات التقارير بنجاح." : "Reports data imported successfully.");
            break;
          case "questions":
            const mergedQuestions = [...questions, ...importedData];
            setQuestions(mergedQuestions);
            localStorage.setItem("allQuestions", JSON.stringify(mergedQuestions));
            alert(language === "ar" ? "تم استيراد بيانات الأسئلة بنجاح." : "Questions data imported successfully.");
            break;
          case "users":
            const mergedUsers = [...users, ...importedData];
            setUsers(mergedUsers);
            localStorage.setItem("readonlyUsers", JSON.stringify(mergedUsers));
            alert(language === "ar" ? "تم استيراد بيانات المستخدمين بنجاح." : "Users data imported successfully.");
            break;
          case "dailyReports":
            const mergedDailyReports = [...dailyReports, ...importedData];
            setDailyReports(mergedDailyReports);
            localStorage.setItem("dailyReports", JSON.stringify(mergedDailyReports));
            alert(language === "ar" ? "تم استيراد بيانات التقارير اليومية بنجاح." : "Daily reports data imported successfully.");
            break;
          default:
            alert(language === "ar" ? "التبويب غير معروف." : "Unknown tab.");
        }
      } catch {
        alert(language === "ar" ? "فشل في قراءة الملف أو تنسيقه غير صالح." : "Failed to read file or invalid format.");
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
        fontFamily: language === "ar" ? "Cairo, Segoe UI" : "Arial, sans-serif",
        background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
        minHeight: "100vh",
        overflowX: "hidden"
      }}
    >
      {/* اختيار اللغة */}
      <div style={{
        marginBottom: "1.7rem",
        textAlign: language === "ar" ? "left" : "right",
        fontWeight: "bold"
      }}>
        <label>
          {language === "ar" ? "اختر اللغة: " : "Select Language: "}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: "7px 18px",
              fontSize: "1.08em",
              borderRadius: 10,
              border: "2px solid #884ea0",
              background: "#fcf3ff",
              fontWeight: "bold"
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
          background: "#fff",
          padding: "1.2rem 1.5rem",
          borderRadius: "16px",
          marginBottom: "1.7rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 22px #d2b4de22"
        }}
      >
        <h2 style={{
          color: "#512e5f",
          letterSpacing: "0.01em",
          margin: 0,
          fontWeight: "bold",
          fontSize: "2.2em"
        }}>
          {language === "ar" ? "📊 لوحة تحكم المدير" : "📊 Admin Dashboard"}
        </h2>
        <button
          onClick={handleLogout}
          style={{
            background: "#e74c3c",
            color: "white",
            border: "none",
            padding: "12px 28px",
            borderRadius: "13px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1.09em",
            boxShadow: "0 2px 8px #f9ebea",
            letterSpacing: ".01em"
          }}
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
          background: "transparent"
        }}
      >
        <button onClick={() => setActiveView("reports")} style={tabButtonStyle("reports")}>
          {language === "ar" ? "📑 التقارير" : "📑 Reports"}
        </button>
        <button onClick={() => setActiveView("dailyReports")} style={tabButtonStyle("dailyReports")}>
          {language === "ar" ? "🗓️ التقارير اليومية" : "🗓️ Daily Reports"}
        </button>
        <button onClick={() => setActiveView("qcsShipment")} style={tabButtonStyle("qcsShipment")}>
          {language === "ar" ? "📦 شحنات QCS" : "📦 QCS Shipments"}
        </button>
        <button onClick={() => setActiveView("returns")} style={tabButtonStyle("returns")}>
          {language === "ar" ? "🛒 المرتجعات" : "🛒 Returns"}
        </button>
        <button onClick={() => setActiveView("kpi")} style={tabButtonStyle("kpi")}>
          {language === "ar" ? "📈 لوحة الـ KPI" : "📈 KPI Dashboard"}
        </button>
        <button onClick={() => setActiveView("questions")} style={tabButtonStyle("questions")}>
          {language === "ar" ? "📚 عرض الأسئلة" : "📚 View Questions"}
        </button>
        {/* زر إدارة المستخدمين محذوف فقط من هنا */}
      </div>

      {/* أزرار التصدير والاستيراد */}
      {["reports", "questions", "users", "dailyReports"].includes(activeView) && (
        <div style={{ marginBottom: "1.4rem" }}>
          <button
            onClick={() => {
              let data = [];
              let name = "";
              if (activeView === "reports") { data = reports; name = "reports_backup.json"; }
              if (activeView === "questions") { data = questions; name = "questions_backup.json"; }
              if (activeView === "users") { data = users; name = "users_backup.json"; }
              if (activeView === "dailyReports") { data = dailyReports; name = "daily_reports_backup.json"; }
              exportToJson(data, name);
            }}
            style={{
              marginRight: 15,
              background: "#884ea0",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1.06em",
              boxShadow: "0 2px 8px #e8daef",
              letterSpacing: ".01em"
            }}
          >
            {language === "ar"
              ? "⬇️ تصدير البيانات (JSON)"
              : "⬇️ Export Data (JSON)"}
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              background: "#229954",
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1.06em",
              boxShadow: "0 2px 8px #d4efdf",
              letterSpacing: ".01em"
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
      <div style={{
        background: "#fff",
        borderRadius: "17px",
        boxShadow: "0 4px 32px #d2b4de26",
        padding: "1.5rem 1rem",
        minHeight: "67vh",
      }}>
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
        ) : activeView === "questions" ? (
          <QuestionsTab questions={questions} setQuestions={setQuestions} language={language} />
        ) : activeView === "qcs" ? (
          <QCSDailyView language={language} />
        ) : activeView === "pos19" ? (
          <POS19DailyView language={language} />
        ) : null}
      </div>
      <div style={{ marginTop: 55, textAlign: "center", color: "#b2babb", fontSize: "1.09em" }}>
        {language === "ar"
          ? "جميع الحقوق محفوظة © نظام إدارة الجودة"
          : "All rights reserved © Quality Management System"}
      </div>
    </div>
  );
}
