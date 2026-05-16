// emailReportUtils.js
// Shared utilities for building & sending report emails (EML / mailto / WhatsApp / clipboard).

import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";

/* ============== Encoding ============== */

export function toBase64Utf8(s) {
  const bytes = new TextEncoder().encode(String(s));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function chunkBase64(s, n = 76) {
  const parts = [];
  for (let i = 0; i < s.length; i += n) parts.push(s.slice(i, i + n));
  return parts.join("\r\n");
}

export function encodeMimeHeader(s) {
  // eslint-disable-next-line no-control-regex
  const NON_ASCII = /[^\x00-\x7F]/;
  if (!NON_ASCII.test(String(s))) return String(s);
  return `=?utf-8?B?${toBase64Utf8(s)}?=`;
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============== Fetching ============== */

export async function fetchAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve({
        base64: i >= 0 ? s.slice(i + 1) : s,
        contentType: blob.type || "application/octet-stream",
        size: blob.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ============== EML builder ============== */

export function buildEml({ to, cc, bcc, subject, html, attachments, extraHeaders }) {
  const boundary = `_QCS_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const safeFn = (n) => String(n || "file").replace(/[\r\n"\\]/g, "_");

  const out = [];
  if (to) out.push(`To: ${to}`);
  if (cc) out.push(`Cc: ${cc}`);
  if (bcc) out.push(`Bcc: ${bcc}`);
  out.push(`Subject: ${encodeMimeHeader(subject)}`);
  out.push(`X-Unsent: 1`);
  if (Array.isArray(extraHeaders)) {
    for (const h of extraHeaders) if (h) out.push(h);
  }
  out.push(`MIME-Version: 1.0`);
  out.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  out.push("");

  // HTML body
  out.push(`--${boundary}`);
  out.push(`Content-Type: text/html; charset=utf-8`);
  out.push(`Content-Transfer-Encoding: base64`);
  out.push("");
  out.push(chunkBase64(toBase64Utf8(html)));
  out.push("");

  // Attachments
  for (const att of attachments || []) {
    const fn = safeFn(att.filename);
    out.push(`--${boundary}`);
    out.push(`Content-Type: ${att.contentType || "application/octet-stream"}; name="${fn}"`);
    out.push(`Content-Disposition: attachment; filename="${fn}"`);
    out.push(`Content-Transfer-Encoding: base64`);
    out.push("");
    out.push(chunkBase64(att.base64));
    out.push("");
  }

  out.push(`--${boundary}--`);
  return out.join("\r\n");
}

/* ============== Helpers ============== */

export function downloadBlobLocally(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function uploadPdfBlob(blob, filename) {
  const file = new File([blob], filename, { type: "application/pdf" });
  return uploadImageToServer(file, "qcs_report_pdf");
}

export function emailListSplit(s) {
  return String(s || "")
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validEmails(list) {
  return list.every((e) => EMAIL_RE.test(e));
}

/* ============== Pre-built helpers for image attachments ============== */

/**
 * Fetch a list of image URLs and convert to attachment objects.
 * Returns the successful ones; logs warnings for failures.
 */
export async function fetchImagesAsAttachments(urls, onProgress) {
  const attachments = [];
  for (let i = 0; i < urls.length; i++) {
    if (onProgress) onProgress(i + 1, urls.length);
    try {
      const { base64, contentType } = await fetchAsBase64(urls[i]);
      const ext = ((contentType.split("/")[1] || "jpg") + "").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
      attachments.push({
        filename: `image_${String(i + 1).padStart(2, "0")}.${ext || "jpg"}`,
        base64,
        contentType: contentType || "image/jpeg",
      });
    } catch (e) {
      console.warn(`Failed to fetch image ${i + 1}:`, e);
    }
  }
  return attachments;
}
