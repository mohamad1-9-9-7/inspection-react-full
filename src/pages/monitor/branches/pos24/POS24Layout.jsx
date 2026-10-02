// src/pages/monitor/branches/pos24/POS24Layout.jsx
// POS 24 — Input Tabs. يستخدم المكوّن المشترك BranchInputLayout.
// Incoming shipments are a QCS-only form (QCS → qcs-raw-material-inspection).
import React from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";


const config = {
  branch: "POS 24",
  source: "pos24-tabs",
  title: "📋 POS 24 — Operations Inputs",
  description:
    "All input tabs (Personal Hygiene, Daily Cleaning, Oil Calibration, and Detergent Calibration) in one place.",
  defaultTab: "personal",
  tabs: [
    { key: "personal",  label: "🧑‍🔬 Personal Hygiene" /* placeholder */ },
    { key: "daily",     label: "🧹 Daily Cleaning"      /* placeholder */ },
    { key: "oil",       label: "🛢️ Oil Calibration"      /* placeholder */ },
    { key: "detergent", label: "🧴 Detergent Calibration" /* placeholder */ },
  ],
};

export default function POS24Layout() {
  return <BranchInputLayout config={config} />;
}
