// Licenses & Contracts — uploads and record writes (network side of licensesKit).
import API_BASE from "../../../config/api";
import { TYPE } from "./licensesKit";

/* ───────────────────────── upload ───────────────────────── */
function isPdfFile(file) {
  const t = String(file?.type || "").toLowerCase();
  return t === "application/pdf" || String(file?.name || "").toLowerCase().endsWith(".pdf");
}
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  const url = data?.url || data?.secure_url || data?.fileUrl || data?.file_url || data?.path || data?.result?.secure_url || "";
  if (!url) throw new Error("No URL returned from server.");
  return url;
}
/** PDF alone (1) or images (≤20). Returns { urls, names } or throws a user message. */
export async function uploadPicked(fileList, onProgress) {
  const list = Array.from(fileList || []).slice(0, 20);
  if (!list.length) return { urls: [], names: [] };
  const pdfs = list.filter(isPdfFile);
  const imgs = list.filter((f) => !isPdfFile(f));
  if (pdfs.length && imgs.length) throw new Error("Please upload a PDF alone OR images alone — not both.");
  if (pdfs.length > 1) throw new Error("Only 1 PDF at a time.");
  const files = pdfs.length ? pdfs : imgs;
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`${i + 1} / ${files.length}`);
    urls.push(await uploadFile(files[i]));
  }
  return { urls, names: files.map((f) => f.name) };
}

/* ───────────────────────── server write ───────────────────────── */
export async function writeRecord(rid, payload) {
  const put = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: TYPE, payload }),
  });
  if (put.ok) return;
  // Fallback for a server without PUT :id — create the new one FIRST, then drop the old.
  const post = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
  });
  if (!post.ok) throw new Error(`HTTP ${put.status}/${post.status}`);
  await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }).catch(() => {});
}

