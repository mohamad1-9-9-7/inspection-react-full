// src/pages/monitor/branches/_shared/resilientFetch.js
// Resilient fetch wrapper with automatic retry + exponential backoff.
// Designed for Render's free tier (cold-start 502/504 errors + CORS glitches).

/**
 * Fetch with retry.
 *
 * @param {string} url
 * @param {RequestInit} options - fetch options
 * @param {object} retryOpts
 *   - retries: number (default 3)
 *   - initialDelay: ms (default 1000)
 *   - maxDelay: ms (default 8000)
 *   - timeout: ms per attempt (default 30000 — cold starts can be slow)
 *   - onAttempt: (attempt, error?) => void — callback for progress UI
 *   - fallbackUrl: alternate URL to try as last resort
 * @returns {Promise<Response>}
 */
export async function resilientFetch(url, options = {}, retryOpts = {}) {
  const {
    retries = 3,
    initialDelay = 1000,
    maxDelay = 8000,
    timeout = 30000,
    onAttempt = () => {},
    fallbackUrl = null,
  } = retryOpts;

  let lastError = null;
  const urls = fallbackUrl ? [url, fallbackUrl] : [url];

  for (const currentUrl of urls) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        onAttempt(attempt);

        // Attach timeout via AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(currentUrl, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Success or client error → return directly (don't retry 4xx)
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return res;
        }

        // Retry on 5xx
        lastError = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastError = e;
      }

      if (attempt < retries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        onAttempt(attempt, lastError);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}

/**
 * Classify error for user-friendly messages.
 */
export function classifyError(error) {
  const msg = error?.message || String(error || "");

  if (msg.includes("abort") || error?.name === "AbortError") {
    return { type: "timeout", label: "Request timed out", labelAr: "انتهت مهلة الطلب" };
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ERR_FAILED")) {
    return {
      type: "network",
      label: "Server is waking up or network issue. Retrying…",
      labelAr: "السيرفر قيد الاستيقاظ أو مشكلة شبكة. جارٍ المحاولة…",
    };
  }
  if (/HTTP 5\d\d/.test(msg)) {
    return {
      type: "server",
      label: "Server error — the free-tier service may be restarting",
      labelAr: "خطأ في السيرفر — قد يكون قيد إعادة التشغيل",
    };
  }
  if (/HTTP 4\d\d/.test(msg)) {
    return { type: "client", label: msg, labelAr: msg };
  }
  return { type: "unknown", label: msg, labelAr: msg };
}
