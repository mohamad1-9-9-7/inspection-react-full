/**
 * safeGetJSON — يقرأ من localStorage بأمان
 * إذا كانت البيانات فاسدة أو غير موجودة يرجع fallback بدل ما ينهار التطبيق
 */
export function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    console.warn(`[storage] Failed to parse localStorage key "${key}". Returning fallback.`);
    return fallback;
  }
}

/**
 * safeSetJSON — يحفظ في localStorage بأمان
 */
export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] Failed to save key "${key}":`, e);
  }
}
