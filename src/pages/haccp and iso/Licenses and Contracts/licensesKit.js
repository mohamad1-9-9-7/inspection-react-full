// src/pages/haccp and iso/Licenses and Contracts/licensesKit.js
//
// Licenses & Contracts — pure helpers shared by the View and Input pages:
// flattening a record into register items, expiry status, the change log
// (payload.history) and the renewal archive (item.renewals).
//
// Storage shape (one report per branch entry, type "licenses_contracts"):
//   payload.branch
//   payload.license   = { name, expiryDate, notes, fileUrls[], fileNames[], renewals[] }
//   payload.contracts = [{ uid, contractType, companyName, expiryDate, notes,
//                          fileUrls[], fileNames[], renewals[] }]
//   payload.history   = [event…]  (newest last)
//
// A history event: { id, at (ISO), by, action, target: { kind, uid, label },
//                    changes: [{ field, from, to }], note, prev }
//   action ∈ created | edited | renewed | contract_added | contract_removed

import { getCurrentUser } from "../../../utils/perms";

export const TYPE = "licenses_contracts";

export const safeArr = (x) => (Array.isArray(x) ? x : []);

export function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}

export function currentActor() {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.fullName || u.name || u.username || u.email || "Unknown").trim();
}

export function newUid(prefix = "c") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* ───────────── files ───────────── */
function toUrlArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean).map(String);
  if (typeof x === "string" && x) return [x];
  return [];
}

export function normalizeFiles(obj) {
  const o = obj || {};
  const seen = new Set();
  return [
    ...toUrlArray(o.fileUrls), ...toUrlArray(o.fileUrl),
    ...toUrlArray(o.files), ...toUrlArray(o.images),
    ...toUrlArray(o.imageUrls), ...toUrlArray(o.attachments),
  ]
    .map((u) => String(u).trim())
    .filter((u) => u && (seen.has(u) ? false : seen.add(u)));
}

export function isImageUrl(url) {
  const u = String(url || "").toLowerCase();
  return u.startsWith("data:image/") || u.includes("image/upload") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(u);
}

export function isPdfUrl(url) {
  return /\.pdf(\?|$)/.test(String(url || "").toLowerCase());
}

export function displayUrl(url, w = 1200) {
  const u = String(url || "");
  if (!isImageUrl(u) || !u.includes("/image/upload/")) return u;
  return u.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${w},c_limit/`);
}

/* ───────────── dates ───────────── */
export function todayYmd() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysUntil(ymd) {
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s.slice(0, 10) + "T00:00:00");
  if (isNaN(d)) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

/** ymd + n years/months/days (clamped to month end, e.g. 29 Feb → 28 Feb). */
export function addPeriod(ymd, { years = 0, months = 0, days = 0 }) {
  const s = String(ymd || "").trim();
  const base = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s.slice(0, 10) + "T00:00:00") : new Date();
  const day = base.getDate();
  const d = new Date(base.getFullYear() + years, base.getMonth() + months, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function diffDays(a, b) {
  const da = new Date(String(a).slice(0, 10) + "T00:00:00");
  const db = new Date(String(b).slice(0, 10) + "T00:00:00");
  if (isNaN(da) || isNaN(db)) return null;
  return Math.round((db - da) / 86400000);
}

export function fmtDate(ymd, lang = "en") {
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return "—";
  const d = new Date(s.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso, lang = "en") {
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ───────────── status ───────────── */
export const STATUS = {
  expired: { rank: 0, bg: "#fef2f2", bd: "#fca5a5", color: "#991b1b", dot: "#ef4444" },
  soon:    { rank: 1, bg: "#fff7ed", bd: "#fdba74", color: "#9a3412", dot: "#f97316" },
  upcoming:{ rank: 2, bg: "#fffbeb", bd: "#fcd34d", color: "#92400e", dot: "#eab308" },
  valid:   { rank: 3, bg: "#f0fdf4", bd: "#86efac", color: "#166534", dot: "#22c55e" },
  none:    { rank: 4, bg: "#f1f5f9", bd: "#cbd5e1", color: "#475569", dot: "#94a3b8" },
};

/** expired (<0) · soon (≤30) · upcoming (≤90) · valid · none */
export function statusOf(expiryDate) {
  const n = daysUntil(expiryDate);
  if (n === null) return { key: "none", days: null };
  if (n < 0) return { key: "expired", days: n };
  if (n <= 30) return { key: "soon", days: n };
  if (n <= 90) return { key: "upcoming", days: n };
  return { key: "valid", days: n };
}

/* ───────────── flatten ───────────── */
const hasAny = (o) => Object.entries(o || {}).some(([k, v]) =>
  k !== "uid" && (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim()));

export function contractUid(c, idx) {
  return String(c?.uid || `idx${idx}`);
}

export function contractLabel(c) {
  const t = String(c?.contractType || "").trim();
  const co = String(c?.companyName || "").trim();
  return [t || "Contract", co].filter(Boolean).join(" — ");
}

/** Every license / contract of every record as one register row. */
export function flattenRecords(reports) {
  const out = [];
  safeArr(reports).forEach((r) => {
    const rid = getId(r);
    const p = r?.payload || {};
    const branch = String(p.branch || "").trim() || "Unspecified";
    const lic = p.license || {};
    if (hasAny(lic)) {
      const st = statusOf(lic.expiryDate);
      const ren = safeArr(lic.renewals);
      out.push({
        key: `${rid}:license`, rid, record: r, branch, kind: "license", uid: "license",
        name: String(lic.name || "").trim() || "License",
        company: "", expiryDate: lic.expiryDate || "", notes: lic.notes || "",
        files: normalizeFiles(lic), fileNames: safeArr(lic.fileNames), status: st.key, days: st.days,
        renewals: ren, lastRenewal: ren[ren.length - 1] || null,
      });
    }
    safeArr(p.contracts).forEach((c, idx) => {
      if (!hasAny(c)) return;
      const st = statusOf(c.expiryDate);
      const ren = safeArr(c.renewals);
      out.push({
        key: `${rid}:${contractUid(c, idx)}`, rid, record: r, branch, kind: "contract",
        uid: contractUid(c, idx), idx,
        name: String(c.contractType || "").trim() || "Contract",
        company: String(c.companyName || "").trim(), expiryDate: c.expiryDate || "",
        notes: c.notes || "", files: normalizeFiles(c), fileNames: safeArr(c.fileNames), status: st.key, days: st.days,
        renewals: ren, lastRenewal: ren[ren.length - 1] || null,
      });
    });
  });
  return out;
}

/** Give every contract a stable uid (kept forever once saved). */
export function ensureUids(payload) {
  const p = { ...(payload || {}) };
  p.contracts = safeArr(p.contracts).map((c) => (c?.uid ? c : { ...c, uid: newUid() }));
  return p;
}

/* ───────────── history ───────────── */
export function mkEvent(action, target, extra = {}) {
  return {
    id: newUid("h"),
    at: new Date().toISOString(),
    by: currentActor(),
    action,
    target,
    changes: [],
    note: "",
    ...extra,
  };
}

const LIC_FIELDS = ["name", "expiryDate", "notes"];
const CON_FIELDS = ["contractType", "companyName", "expiryDate", "notes"];

function filesDiff(a, b) {
  const fa = normalizeFiles(a);
  const fb = normalizeFiles(b);
  const added = fb.filter((u) => !fa.includes(u)).length;
  const removed = fa.filter((u) => !fb.includes(u)).length;
  if (!added && !removed) return null;
  return { field: "files", from: `${fa.length}`, to: `${fb.length}`, added, removed };
}

function fieldDiffs(a, b, fields) {
  const out = [];
  fields.forEach((f) => {
    const x = String(a?.[f] ?? "").trim();
    const y = String(b?.[f] ?? "").trim();
    if (x !== y) out.push({ field: f, from: x, to: y });
  });
  const fd = filesDiff(a, b);
  if (fd) out.push(fd);
  return out;
}

/** Events describing old payload → new payload (an edit). */
export function diffPayloads(oldP, newP) {
  const events = [];
  const oldLic = oldP?.license || {};
  const newLic = newP?.license || {};
  const lc = fieldDiffs(oldLic, newLic, LIC_FIELDS);
  if (String(oldP?.branch || "").trim() !== String(newP?.branch || "").trim()) {
    lc.unshift({ field: "branch", from: String(oldP?.branch || ""), to: String(newP?.branch || "") });
  }
  if (lc.length) {
    events.push(mkEvent("edited", { kind: "license", uid: "license", label: newLic.name || oldLic.name || "License" }, { changes: lc }));
  }
  const oldCons = safeArr(oldP?.contracts);
  const newCons = safeArr(newP?.contracts);
  const oldById = new Map(oldCons.map((c, i) => [contractUid(c, i), c]));
  const seen = new Set();
  newCons.forEach((c, i) => {
    const uid = contractUid(c, i);
    const before = oldById.get(uid);
    const target = { kind: "contract", uid, label: contractLabel(c) };
    if (!before) {
      if (hasAny(c)) events.push(mkEvent("contract_added", target));
      return;
    }
    seen.add(uid);
    const ch = fieldDiffs(before, c, CON_FIELDS);
    if (ch.length) events.push(mkEvent("edited", target, { changes: ch }));
  });
  oldCons.forEach((c, i) => {
    const uid = contractUid(c, i);
    if (!seen.has(uid) && hasAny(c)) {
      events.push(mkEvent("contract_removed", { kind: "contract", uid, label: contractLabel(c) }, {
        prev: { expiryDate: c.expiryDate || "", files: normalizeFiles(c) },
      }));
    }
  });
  return events;
}

/** Apply a renewal to one item of a payload; returns the new payload. */
export function applyRenewal(payload, { kind, uid }, { newExpiry, renewedOn, files, fileNames, keepOldFiles, note }) {
  const p = ensureUids(payload);
  const by = currentActor();
  const at = new Date().toISOString();
  const patch = (item) => {
    const prevFiles = normalizeFiles(item);
    const entry = {
      id: newUid("r"), at, by,
      renewedOn: renewedOn || todayYmd(),
      prevExpiryDate: item.expiryDate || "",
      newExpiryDate: newExpiry,
      prevFiles,
      prevFileNames: safeArr(item.fileNames),
      note: String(note || "").trim(),
    };
    const nextUrls = keepOldFiles ? [...prevFiles, ...safeArr(files)] : (safeArr(files).length ? safeArr(files) : prevFiles);
    const nextNames = keepOldFiles ? [...safeArr(item.fileNames), ...safeArr(fileNames)] : (safeArr(files).length ? safeArr(fileNames) : safeArr(item.fileNames));
    return {
      next: {
        ...item,
        expiryDate: newExpiry,
        lastRenewedOn: entry.renewedOn,
        fileUrls: nextUrls,
        fileNames: nextNames,
        fileUrl: nextUrls[0] || "",
        renewals: [...safeArr(item.renewals), entry],
      },
      entry,
    };
  };

  let label = "";
  let entry = null;
  let targetUid = "license";
  if (kind === "license") {
    const r = patch(p.license || {});
    p.license = r.next;
    entry = r.entry;
    label = r.next.name || "License";
  } else {
    // legacy rows (saved before uids) arrive as "idx<n>"; ensureUids just gave them a real uid
    const legacyIdx = String(uid).startsWith("idx") ? Number(String(uid).slice(3)) : -1;
    const pos = p.contracts.findIndex((c, i) => c.uid === uid || i === legacyIdx);
    if (pos < 0) return null;
    const r = patch(p.contracts[pos]);
    p.contracts = p.contracts.map((c, i) => (i === pos ? r.next : c));
    entry = r.entry;
    label = contractLabel(r.next);
    targetUid = r.next.uid;
  }
  const ev = mkEvent("renewed", { kind, uid: targetUid, label }, {
    changes: [{ field: "expiryDate", from: entry.prevExpiryDate, to: newExpiry }],
    note: entry.note,
    prev: { expiryDate: entry.prevExpiryDate, files: entry.prevFiles },
    renewalId: entry.id,
  });
  p.history = [...safeArr(p.history), ev];
  return p;
}

/** All events, newest first, each tagged with its record. */
export function collectHistory(reports) {
  const out = [];
  safeArr(reports).forEach((r) => {
    const p = r?.payload || {};
    safeArr(p.history).forEach((e) => out.push({ ...e, rid: getId(r), branch: String(p.branch || "").trim() || "Unspecified" }));
  });
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/* ───────────── document versions ───────────── */
/**
 * The documents of one register item, newest version first:
 *   [{ current: true,  files:[{url,name}], issuedOn, validUntil },
 *    { current: false, files, issuedOn, validUntil, replacedOn, replacedBy, note, n }, …]
 * Built from item.files + item.renewals[] (each renewal archived the files
 * and expiry that were current before it).
 */
export function documentVersions(item) {
  const ren = safeArr(item?.renewals);
  const pack = (urls, names) => safeArr(urls).map((url, i) => ({ url, name: safeArr(names)[i] || "" }));
  const out = [{
    current: true,
    n: ren.length + 1,
    files: pack(item?.files, item?.fileNames),
    issuedOn: ren.length ? ren[ren.length - 1].renewedOn : "",
    validUntil: item?.expiryDate || "",
  }];
  for (let k = ren.length - 1; k >= 0; k--) {
    const r = ren[k];
    out.push({
      current: false,
      n: k + 1,
      files: pack(r.prevFiles, r.prevFileNames),
      issuedOn: k > 0 ? ren[k - 1].renewedOn : "",
      validUntil: r.prevExpiryDate || "",
      replacedOn: r.renewedOn || "",
      replacedBy: r.by || "",
      note: r.note || "",
    });
  }
  // a file kept across a renewal ("keep old files") shows once, on its newest version
  const seen = new Set();
  out.forEach((v) => {
    v.files = v.files.map((f) => ({ ...f, carried: seen.has(f.url) }));
    v.files.forEach((f) => seen.add(f.url));
  });
  return out;
}
