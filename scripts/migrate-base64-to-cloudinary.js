/* eslint-disable no-console */
/**
 * migrate-base64-to-cloudinary.js
 *
 * Server-side migration script — bypasses the frontend OOM problem entirely.
 *
 * What it does:
 *   1. Fetches reports of a given TYPE from the SAME backend (use the local URL on Render shell).
 *   2. Walks each record's payload recursively for base64 data URLs.
 *   3. Uploads each base64 image to /api/images → gets a public URL.
 *   4. Replaces the base64 string in-place with the URL.
 *   5. PUTs the updated record back via /api/reports/<id>.
 *
 * Usage (on Render shell):
 *   cd /opt/render/project/src           # (or wherever the backend is deployed)
 *   node /tmp/migrate-base64-to-cloudinary.js internal_multi_audit
 *
 * Or locally (against the live server):
 *   API_BASE=https://your-server.onrender.com node scripts/migrate-base64-to-cloudinary.js internal_multi_audit
 *
 * Requires: Node 18+ (has fetch + FormData + Blob built in).
 */

const TYPE = process.argv[2];
const LIMIT = Number(process.env.LIMIT) || 0;      // 0 = no limit
const DRY_RUN = process.env.DRY_RUN === "1";
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 500;
const API_BASE = (process.env.API_BASE || "http://127.0.0.1:10000").replace(/\/$/, "");

if (!TYPE) {
  console.error("Usage: node migrate-base64-to-cloudinary.js <TYPE> [LIMIT=N] [DRY_RUN=1]");
  console.error("Example: node migrate-base64-to-cloudinary.js internal_multi_audit");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== Helpers ===== */

function isBase64Image(s) {
  return typeof s === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(s);
}

function approxBase64Bytes(s) {
  const comma = s.indexOf(",");
  const payload = comma >= 0 ? s.slice(comma + 1) : s;
  return Math.floor(payload.length * 0.75);
}

async function uploadBase64(dataUrl) {
  // Decode base64 → Buffer → multipart
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) throw new Error("Invalid data URL");
  const contentType = m[1];
  const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
  const buf = Buffer.from(m[2], "base64");
  const blob = new Blob([buf], { type: contentType });
  const fd = new FormData();
  fd.append("file", blob, `image.${ext}`);

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data.optimized_url || data.url;
}

async function fetchReports(type, limit) {
  let url = `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const data = await res.json().catch(() => null);
  const arr = Array.isArray(data) ? data
            : Array.isArray(data?.data) ? data.data
            : Array.isArray(data?.items) ? data.items
            : Array.isArray(data?.rows) ? data.rows
            : [];
  return arr.filter((r) => r?.type === type || !r?.type);
}

async function updateReport(id, type, payload) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, reporter: "image_migration_script", payload }),
  });
  if (!res.ok) throw new Error(`Update failed: HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

async function replaceBase64(obj, counter, path = "$") {
  if (isBase64Image(obj)) {
    try {
      const url = await uploadBase64(obj);
      counter.uploaded++;
      return url;
    } catch (e) {
      counter.failed++;
      counter.errors.push(`${path}: ${e.message}`);
      return obj;
    }
  }
  if (Array.isArray(obj)) {
    const out = [];
    for (let i = 0; i < obj.length; i++) {
      out.push(await replaceBase64(obj[i], counter, `${path}[${i}]`));
    }
    return out;
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = await replaceBase64(v, counter, `${path}.${k}`);
    }
    return out;
  }
  return obj;
}

function scanBase64(obj, acc = { count: 0, bytes: 0 }) {
  if (isBase64Image(obj)) {
    acc.count++;
    acc.bytes += approxBase64Bytes(obj);
    return acc;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) scanBase64(v, acc);
    return acc;
  }
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) scanBase64(v, acc);
  }
  return acc;
}

function fmt(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* ===== Main ===== */

(async () => {
  console.log(`\n🖼️  base64 → URL migration`);
  console.log(`📡 API: ${API_BASE}`);
  console.log(`📋 TYPE: ${TYPE}`);
  console.log(`🔢 LIMIT: ${LIMIT || "no limit"}`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? "YES (no writes)" : "no — writes enabled"}`);
  console.log("");

  console.log(`📥 Fetching records…`);
  const records = await fetchReports(TYPE, LIMIT);
  console.log(`✅ Got ${records.length} record(s).\n`);

  // Pre-scan
  let totalImages = 0, totalBytes = 0;
  for (const r of records) {
    const s = scanBase64(r?.payload || {});
    totalImages += s.count;
    totalBytes += s.bytes;
  }
  console.log(`📊 Total base64 images: ${totalImages}  (~${fmt(totalBytes)})\n`);

  if (totalImages === 0) {
    console.log("✨ Nothing to migrate.");
    return;
  }
  if (DRY_RUN) {
    console.log("✋ DRY_RUN=1 — exiting without changes.");
    return;
  }

  let uploaded = 0, failed = 0, recordsUpdated = 0, recordsSkipped = 0;
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const id = rec.id || rec._id;
    if (!id) {
      recordsSkipped++;
      console.log(`⏭️  [${i + 1}/${records.length}] no id — skipped`);
      continue;
    }
    const counter = { uploaded: 0, failed: 0, errors: [] };
    let newPayload;
    try {
      newPayload = await replaceBase64(rec.payload || {}, counter, "$");
    } catch (e) {
      failed++;
      console.log(`❌ [${i + 1}/${records.length}] ${id} — walk error: ${e.message}`);
      continue;
    }
    if (counter.uploaded === 0 && counter.failed === 0) {
      recordsSkipped++;
      console.log(`⏭️  [${i + 1}/${records.length}] ${id} — no images`);
      continue;
    }
    try {
      await updateReport(id, TYPE, newPayload);
      recordsUpdated++;
      uploaded += counter.uploaded;
      failed += counter.failed;
      console.log(`✅ [${i + 1}/${records.length}] ${id} — uploaded ${counter.uploaded}, failed ${counter.failed}`);
      for (const err of counter.errors) console.log(`   ↳ ${err}`);
    } catch (e) {
      failed += counter.failed + 1;
      console.log(`❌ [${i + 1}/${records.length}] ${id} — save error: ${e.message}`);
    }
    if (BATCH_DELAY_MS > 0) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\n🎉 Migration complete.`);
  console.log(`   Records updated: ${recordsUpdated}`);
  console.log(`   Records skipped: ${recordsSkipped}`);
  console.log(`   Images uploaded: ${uploaded}`);
  console.log(`   Images failed:   ${failed}`);
})().catch((e) => {
  console.error("\n💥 Fatal error:", e?.message || e);
  process.exit(1);
});
