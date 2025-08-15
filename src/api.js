// نقرأ رابط الـ API من متغيّر نتلايف، ولو مش موجود نستخدم رابط Render مباشرة
const BASE = import.meta?.env?.VITE_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchWithRetry(url, options = {}, tries = 1) {
  try {
    return await fetch(url, options);
  } catch (e) {
    if (tries <= 0) throw e;
    await new Promise(r => setTimeout(r, 2000)); // انتظر 2 ثواني وأعد المحاولة
    return fetchWithRetry(url, options, tries - 1);
  }
}

export async function createReport({ type, payload, reporter }) {
  const res = await fetchWithRetry(`${BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload, reporter })
  });
  if (!res.ok) throw new Error("create failed");
  return res.json();
}

export async function listReports(type) {
  const url = type ? `${BASE}/api/reports?type=${encodeURIComponent(type)}` : `${BASE}/api/reports`;
  const res = await fetchWithRetry(url, { cache: "no-store" });
  if (!res.ok) throw new Error("list failed");
  return res.json();
}
