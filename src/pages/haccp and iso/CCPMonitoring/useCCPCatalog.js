// src/pages/haccp and iso/CCPMonitoring/useCCPCatalog.js
// تحميل/حفظ قائمة CCPs المعرّفة من السيرفر مع كاش محلي
// نوع الحفظ: "ccp_catalog_config"

import { useEffect, useState, useCallback } from "react";
import API_BASE from "../../../config/api";
import { DEFAULT_CCPS } from "./i18n";

const TYPE = "ccp_catalog_config";
const CACHE_KEY = "ccp_catalog_v1";

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setCached(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

export async function fetchCatalog() {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    if (!arr.length) return null;
    arr.sort((a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0));
    const latest = arr[0]?.payload || null;
    if (latest?.ccps) {
      setCached(latest);
      return latest;
    }
    return null;
  } catch { return null; }
}

export async function saveCatalog(ccps, reporter = "admin") {
  const payload = {
    ccps: Array.isArray(ccps) ? ccps : DEFAULT_CCPS,
    savedAt: Date.now(),
    savedBy: reporter,
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter, type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  setCached(payload);
  try { window.dispatchEvent(new CustomEvent("ccp_catalog_changed", { detail: payload })); } catch {}
  return payload;
}

export function useCCPCatalog() {
  const [catalog, setCatalog] = useState(() => {
    const cached = getCached();
    return cached?.ccps ? cached : { ccps: DEFAULT_CCPS };
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const fresh = await fetchCatalog();
    if (fresh?.ccps) setCatalog(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const onChange = (e) => { if (e?.detail?.ccps) setCatalog(e.detail); };
    window.addEventListener("ccp_catalog_changed", onChange);
    return () => window.removeEventListener("ccp_catalog_changed", onChange);
  }, [reload]);

  return { catalog, ccps: catalog.ccps || [], loading, reload };
}
