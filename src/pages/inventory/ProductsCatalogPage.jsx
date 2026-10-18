// src/pages/inventory/ProductsCatalogPage.jsx
//
// 📦 كتالوج المنتجات — نفس أداة الإعدادات، بس بمدخل تاني من المخزون.
// Standalone route for the Products Catalog tool. It renders the very same
// <ProductsTab /> used by Settings ▸ Data Tools — one component, two doors.
// The tool draws its own header; this page only adds the way back
// (Inventory / Home) into it and the page background.
// صفحة عادية مفتوحة: بتظهر لكل من بيوصل للمخزون بلا صلاحية خاصة.

import React from "react";
import { useNavigate } from "react-router-dom";
import ProductsTab from "../settings/ProductsTab";

export default function ProductsCatalogPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "#f2f7fc", padding: "12px 12px 24px" }}>
      <ProductsTab
        navActions={
          <>
            <button type="button" className="b" onClick={() => navigate("/inventory")}>← Inventory</button>
            <button type="button" className="b" onClick={() => navigate("/named-dashboard")}>🏠 Home</button>
          </>
        }
      />
    </div>
  );
}
