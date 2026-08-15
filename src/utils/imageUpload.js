// src/utils/imageUpload.js
// ---------------------------------------------------------------------------
// The only sanctioned way to attach a file to a report.
//
// A `data:image/jpeg;base64,…` string inside a payload gets re-sent on every
// list read of that report type, forever. Measured on production in Aug 2026:
// one row of ftr2_receiving_log_butchery was 101,947 bytes, 99.5% of it a
// single embedded photo, and opening that page shipped 27.6 MB. Base64 of a
// JPEG also barely compresses (1.54x at the edge, against 22x for ordinary
// report JSON), so those rows dominated the bandwidth bill.
//
// Upload here instead: the server puts the file on Cloudinary and hands back a
// URL, and the payload stores ~90 bytes rather than ~90 KB. The server now
// rejects payloads carrying base64 outright (utils/noBase64.cjs), so this is
// not a preference — a form that skips it cannot save.
// ---------------------------------------------------------------------------

import { IMAGE_API_BASE } from "../config/api";

const DATA_URI = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?;base64,/i;

/** True for a stored value that is an embedded file rather than a URL. */
export function isDataUri(v) {
  return typeof v === "string" && DATA_URI.test(v);
}

/**
 * Upload one file and get back its hosted URL.
 * Compression happens server-side (1280px longest side, quality 80), so
 * callers no longer need their own canvas resize step.
 */
export async function uploadImage(file, purpose = "report_photo") {
  if (!file) throw new Error("No file provided");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  fd.append("compress", "true");
  fd.append("maxDim", "1280");
  fd.append("quality", "80");

  const res = await fetch(`${IMAGE_API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  }
  return data.optimized_url || data.url;
}

/** Upload several files, preserving order. */
export async function uploadImages(files, purpose = "report_photo") {
  const list = Array.from(files || []).filter(Boolean);
  return Promise.all(list.map((f) => uploadImage(f, purpose)));
}

/**
 * What to feed an <img src>. Accepts the current shape (a URL) and the legacy
 * one (an embedded data URI) so a screen keeps rendering whatever is still in
 * hand; new saves only ever produce the former.
 */
export function imageSrc(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.url || v.photoUrl || v.imageUrl || v.src || "";
}

/**
 * The photo on a table row, whichever field carries it. New saves write
 * `photoUrl`; `photoBase64` is what the old embedded-file rows used, kept here
 * so a screen renders correctly against data from either era without every
 * call site having to know.
 */
export function photoOf(row) {
  if (!row) return "";
  return row.photoUrl || row.photoBase64 || "";
}

/**
 * Save a row photo to disk. A hosted image opens in a new tab — the browser
 * ignores `download` on a cross-origin link, so pretending otherwise would
 * just produce a button that does nothing.
 */
export function downloadImage(src, filename = "image.jpg") {
  if (!src) return;
  const a = document.createElement("a");
  a.href = src;
  if (isDataUri(src)) {
    a.download = filename;
  } else {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Last-resort scrub before a save. The server rejects base64 with a 400, which
 * is the behaviour we want while forms are being converted — but a screen that
 * only ever held a stale data URI for preview should not be blocked by it.
 * Returns a clean copy; never mutates the input.
 */
export function stripBase64Deep(value) {
  if (isDataUri(value)) return "";
  if (Array.isArray(value)) return value.map(stripBase64Deep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripBase64Deep(v);
    return out;
  }
  return value;
}
