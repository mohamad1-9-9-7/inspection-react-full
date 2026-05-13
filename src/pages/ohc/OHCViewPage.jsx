// src/pages/ohc/OHCViewPage.jsx
// Wraps OHCView with the OHC hub navigation shell.

import React from "react";
import { useNavigate } from "react-router-dom";
import OHCView from "./OHCView";
import OHCPageShell from "./OHCPageShell";

export default function OHCViewPage() {
  const navigate = useNavigate();
  return (
    <OHCPageShell
      title={{ ar: "📋 عرض البطاقات الصحية", en: "📋 OHC Browser" }}
      subtitle={{
        ar: "كل البطاقات الصحية + تنبيهات الانتهاء + تصدير وطباعة",
        en: "All cards + expiry alerts + export and print",
      }}
      accent="#7c3aed"
      onBack={() => navigate("/ohc")}
    >
      <OHCView />
    </OHCPageShell>
  );
}
