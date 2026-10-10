// src/pages/monitor/branches/ftr1/FTR1Report.jsx
// FTR 1 — Input Tabs. Same shared hub as POS 6/10/11/15/19 (BranchInputLayout):
// sidebar list, active tab in ?tab=, one form loaded at a time.
import React, { lazy } from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";

const FTR1PersonalHygiene            = lazy(() => import("./FTR1PersonalHygiene"));
const FTR1DailyCleanliness           = lazy(() => import("./FTR1DailyCleanliness"));
const FTR1Temperature                = lazy(() => import("./FTR1Temperature"));
const FTR1OilCalibration             = lazy(() => import("./FTR1OilCalibration"));
const FTR1ReceivingLog               = lazy(() => import("./FTR1ReceivingLog"));
const FTR1CookingTemperatureLogInput = lazy(() => import("./FTR1CookingTemperatureLogInput"));

const config = {
  branch: "FTR 1",
  source: "ftr1-tabs",
  title: "📋 FTR 1 — Operations Inputs",
  description:
    "All input tabs (Personal Hygiene, Daily Cleanliness, Temperature, Oil Calibration, Receiving Log and Cooking Temperature Log) in one place.",
  defaultTab: "personal",
  // keys kept from the old tab bar so existing links/bookmarks still land
  tabs: [
    { key: "personal",  label: "🧑‍🔬 Personal Hygiene",   Component: FTR1PersonalHygiene,            loadingText: "Loading Personal Hygiene…" },
    { key: "daily",     label: "🧹 Daily Cleanliness",    Component: FTR1DailyCleanliness,           loadingText: "Loading Daily Cleanliness…" },
    { key: "temp",      label: "🌡️ Temperature",          Component: FTR1Temperature,                loadingText: "Loading Temperature…" },
    { key: "oil",       label: "🛢️ Oil Calibration",      Component: FTR1OilCalibration,             loadingText: "Loading Oil Calibration…" },
    { key: "receiving", label: "🚚 Receiving Log",        Component: FTR1ReceivingLog,               loadingText: "Loading Receiving Log…" },
    { key: "cook",     label: "🍳 Cooking Temp Log",     Component: FTR1CookingTemperatureLogInput, loadingText: "Loading Cooking Temp Log…" },
  ],
};

export default function FTR1Report() {
  return <BranchInputLayout config={config} />;
}
