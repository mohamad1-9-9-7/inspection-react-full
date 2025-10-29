// src/pages/monitor/branches/qcs/QCSReportsView.jsx
import React, { useState } from "react";
import CoolersView from "./CoolersView";
import DailyCleanlinessView from "./DailyCleanlinessView";
import PersonalHygieneView from "./PersonalHygieneView";
import FreshChickenReportsView from "./FreshChickenReportsView";

// 🆕 عارِض ما قبل التحميل (FTR 1 • Mushrif) و (FTR 2 • Mamzar)
import FTR1PreloadingViewer from "./FTR1PreloadingViewer";
import FTR2PreloadingViewer from "./FTR2PreloadingViewer";

// 🆕 عارِض تقارير المواد الخام: المكوّنات + مواد التغليف
import RMInspectionReportIngredientsView from "./RMInspectionReportIngredientsView";
import RMInspectionReportPackagingView from "./RMInspectionReportPackagingView";

export default function QCSReportsView() {
  const [tab, setTab] = useState("coolers");

  const btn = (id) => ({
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid " + (tab === id ? "#0b132b" : "#e5e7eb"),
    background: tab === id ? "#0b132b" : "#eef2f7",
    color: tab === id ? "#fff" : "#0b132b",
    fontWeight: 800,
    cursor: "pointer",
    margin: "0 6px 8px 0",
  });

  // قيم افتراضية آمنة
  const ccHeader = {
    documentTitle: "QCS — Daily Cleanliness",
    documentNo: "FS-QM/REC/CLN",
    revisionNo: "01",
    area: "QCS Warehouse",
    issuedBy: "QA Manager",
    approvedBy: "Food Safety Team Leader",
    issueDate: "",
    controllingOfficer: "",
  };
  const selectedCleanDate = "";
  const cleanlinessRows = [];
  const ccFooter = { checkedBy: "", verifiedBy: "" };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
      }}
    >
      {/* 🔝 الهيدر + التبويبات (Sticky) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 9999,
          background: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ padding: "1rem 1.5rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: 12 }}>
            📊 QCS — Reports (View)
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 4,
              gap: 6,
            }}
          >
            <button style={btn("coolers")} onClick={() => setTab("coolers")}>
              🧊 Coolers
            </button>
            <button style={btn("ph")} onClick={() => setTab("ph")}>
              🧼 Personal Hygiene
            </button>
            <button style={btn("clean")} onClick={() => setTab("clean")}>
              🧹 Daily Cleanliness
            </button>
            <button style={btn("fresh")} onClick={() => setTab("fresh")}>
              🍗 Fresh Chicken
            </button>

            {/* ما قبل التحميل */}
            <button
              style={btn("ftr1_preload")}
              onClick={() => setTab("ftr1_preload")}
            >
              🚚 FTR 1 • Preloading (Mushrif)
            </button>
            <button
              style={btn("ftr2_preload")}
              onClick={() => setTab("ftr2_preload")}
            >
              🚚 FTR 2 • Preloading (Mamzar)
            </button>

            {/* 🆕 تبويبات تقارير المواد الخام */}
            <button
              style={btn("rm_ing")}
              onClick={() => setTab("rm_ing")}
              title="Raw Material Inspection — Ingredients"
            >
              🧪 RM — Ingredients
            </button>
            <button
              style={btn("rm_pack")}
              onClick={() => setTab("rm_pack")}
              title="Raw Material Inspection — Packaging"
            >
              📦 RM — Packaging
            </button>
          </div>
        </div>
      </div>

      {/* 🧾 المحتوى */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "1rem",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,.1)",
            overflow: "visible",
          }}
        >
          {tab === "coolers" && <CoolersView />}

          {tab === "ph" && <PersonalHygieneView />}

          {tab === "clean" && (
            <DailyCleanlinessView
              ccHeader={ccHeader}
              selectedCleanDate={selectedCleanDate}
              cleanlinessRows={cleanlinessRows}
              ccFooter={ccFooter}
            />
          )}

          {tab === "fresh" && (
            <div style={{ position: "relative", maxWidth: "100%", overflow: "visible" }}>
              <FreshChickenReportsView />
            </div>
          )}

          {tab === "ftr1_preload" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <FTR1PreloadingViewer />
            </div>
          )}

          {tab === "ftr2_preload" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <FTR2PreloadingViewer />
            </div>
          )}

          {/* 🆕 عروض تقارير المواد الخام */}
          {tab === "rm_ing" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <RMInspectionReportIngredientsView />
            </div>
          )}

          {tab === "rm_pack" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <RMInspectionReportPackagingView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
