// src/pages/car/pages/LoadingLogPage.jsx
// Wrapper page for the LoadingLog component — adds a "Back to Hub" header.

import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingLog from "./LoadingLog";
import CarsPageShell from "./CarsPageShell";

export default function LoadingLogPage() {
  const navigate = useNavigate();
  return (
    <CarsPageShell
      title={{ ar: "🕐 إدخال أوقات التحميل", en: "🕐 Loading Time — Data Entry" }}
      subtitle={{ ar: "تسجيل أوقات تحميل الشاحنات يومياً", en: "Record daily truck loading times" }}
      accent="#2563eb"
      onBack={() => navigate("/cars")}
    >
      <LoadingLog />
    </CarsPageShell>
  );
}
