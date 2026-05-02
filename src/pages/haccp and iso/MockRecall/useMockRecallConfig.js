// src/pages/haccp and iso/MockRecall/useMockRecallConfig.js
// تحميل/حفظ إعدادات Mock Recall (عتبات النجاح) من السيرفر مع كاش محلي.
// نوع الحفظ: "mock_recall_config" — يُحفظ كتقرير عام يحمل أحدث الإعدادات.

import { useEffect, useState, useCallback } from "react";
import API_BASE from "../../../config/api";

const TYPE = "mock_recall_config";
const CACHE_KEY = "mock_recall_config_v1";

export const DEFAULT_CONFIG = {
  passPctThreshold: 99,        // ≥ X% للاسترجاع
  maxDurationMinutes: 240,     // ≤ X دقيقة
};

/* ===== كاش محلي ===== */
function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setCached(cfg) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch {}
}

/* ===== جلب من السيرفر — أحدث تقرير من نوع mock_recall_config ===== */
export async function fetchConfig() {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    if (!arr.length) return null;
    // أحدث حسب savedAt
    arr.sort(
      (a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0)
    );
    const cfg = arr[0]?.payload || null;
    if (cfg) setCached(cfg);
    return cfg;
  } catch {
    return null;
  }
}

/* ===== حفظ على السيرفر ===== */
export async function saveConfig(partial, reporter = "admin") {
  const current = (await fetchConfig()) || getCached() || {};
  const payload = {
    ...DEFAULT_CONFIG,
    ...current,
    ...partial,
    savedAt: Date.now(),
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter, type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  setCached(payload);
  // أبلغ كل التابات المفتوحة بالتغيير
  try {
    window.dispatchEvent(new CustomEvent("mock_recall_config_changed", { detail: payload }));
  } catch {}
  return payload;
}

/* ===== Hook للاستخدام في المكوّنات ===== */
export function useMockRecallConfig() {
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_CONFIG,
    ...(getCached() || {}),
  }));
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const fresh = await fetchConfig();
    if (fresh) setConfig({ ...DEFAULT_CONFIG, ...fresh });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const onChange = (e) => {
      if (e?.detail) setConfig({ ...DEFAULT_CONFIG, ...e.detail });
    };
    window.addEventListener("mock_recall_config_changed", onChange);
    return () => window.removeEventListener("mock_recall_config_changed", onChange);
  }, [reload]);

  return { config, loading, reload };
}
