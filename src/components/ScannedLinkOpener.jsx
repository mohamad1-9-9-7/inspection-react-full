// src/components/ScannedLinkOpener.jsx
//
// 🔫 A handheld barcode reader only TYPES what it reads — it cannot open a
// website by itself. So the app listens for it: when the reader types the
// link of a unit's QR sticker (cooler temperature / goods screen), that unit
// opens right here, on any screen, without a reload. Any other scan is left
// to the screen that is open.
//
// Mounted once in App.jsx, inside the router.

import { useNavigate } from "react-router-dom";
import useWedgeScanner from "../utils/useWedgeScanner";

const UNIT_PATHS = ["/monitor/qcs/coolers/quick", "/monitor/branch-temp/"];

export function unitPathOf(text) {
  let u;
  try { u = new URL(String(text || "").trim()); } catch { return ""; }
  if (!/^https?:$/.test(u.protocol)) return "";
  // HashRouter (desktop app) links carry the path after "#"
  const path = u.hash.startsWith("#/") ? u.hash.slice(1) : u.pathname + u.search;
  return UNIT_PATHS.some((p) => path.startsWith(p)) ? path : "";
}

export default function ScannedLinkOpener() {
  const navigate = useNavigate();
  useWedgeScanner((text) => {
    const path = unitPathOf(text);
    if (!path) return false;
    navigate(path);
    return true;
  });
  return null;
}
