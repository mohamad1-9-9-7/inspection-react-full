// src/pages/car/pages/LoadingReportsPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingReports from "./LoadingReports";
import CarsPageShell from "./CarsPageShell";

export default function LoadingReportsPage() {
  const navigate = useNavigate();
  return (
    <CarsPageShell
      title={{ ar: "📄 تقارير أوقات التحميل", en: "📄 Loading Reports" }}
      subtitle={{ ar: "استعراض وتصدير تقارير التحميل", en: "Browse and export loading reports" }}
      accent="#7c3aed"
      onBack={() => navigate("/cars")}
    >
      <LoadingReports />
    </CarsPageShell>
  );
}
