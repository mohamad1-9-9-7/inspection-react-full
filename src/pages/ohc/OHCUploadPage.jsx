// src/pages/ohc/OHCUploadPage.jsx
// Wraps OHCUpload with the OHC hub navigation shell.

import React from "react";
import { useNavigate } from "react-router-dom";
import OHCUpload from "./OHCUpload";
import OHCPageShell from "./OHCPageShell";

export default function OHCUploadPage() {
  const navigate = useNavigate();
  return (
    <OHCPageShell
      title={{ ar: "📥 إدخال بطاقة صحية", en: "📥 Upload OHC Certificate" }}
      subtitle={{
        ar: "تسجيل بطاقة صحية جديدة + رفع الملفات والصور",
        en: "Register a new Occupational Health Card with files and images",
      }}
      accent="#2563eb"
      onBack={() => navigate("/ohc")}
    >
      <OHCUpload />
    </OHCPageShell>
  );
}
