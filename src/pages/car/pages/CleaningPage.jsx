// src/pages/car/pages/CleaningPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Cleaning from "./Cleaning";
import CarsPageShell from "./CarsPageShell";

export default function CleaningPage() {
  const navigate = useNavigate();
  return (
    <CarsPageShell
      title={{ ar: "🧼 إدخال سجل التنظيف", en: "🧼 Cleaning — Data Entry" }}
      subtitle={{ ar: "سجل التنظيف اليومي للسيارات المبردة", en: "Daily cleaning log for refrigerated trucks" }}
      accent="#0891b2"
      onBack={() => navigate("/cars")}
    >
      <Cleaning />
    </CarsPageShell>
  );
}
