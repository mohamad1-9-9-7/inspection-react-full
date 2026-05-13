// src/pages/car/pages/CleaningReportsPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import CleaningReports from "./CleaningReports";
import CarsPageShell from "./CarsPageShell";

export default function CleaningReportsPage() {
  const navigate = useNavigate();
  return (
    <CarsPageShell
      title={{ ar: "🧾 تقارير التنظيف", en: "🧾 Cleaning Reports" }}
      subtitle={{ ar: "استعراض وتصدير سجلات التنظيف", en: "Browse and export cleaning logs" }}
      accent="#9333ea"
      onBack={() => navigate("/cars")}
    >
      <CleaningReports />
    </CarsPageShell>
  );
}
