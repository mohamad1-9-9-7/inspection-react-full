// src/utils/offlineOutbox.js
// Offline outbox: a save that cannot reach the server waits on the device and
// is sent when the connection comes back.
//
// The server stays the source of truth. The outbox only holds a save until
// the server confirms it; an entry is removed only after its handler
// resolves. Nothing is read back from here as data.
//
//   enqueue(kind, key, data, label)  store a save (same kind+key replaces it:
//                                    the newest save of that record wins)
//   registerOutboxHandler(kind, fn)  fn(data) replays one save; it must be
//                                    safe to run twice (upsert, not insert)
//   flushOutbox()                    send everything pending, oldest first
//   subscribeOutbox(fn)              fn({ pending, failed, flushing })
//
// Entries are stored in IndexedDB, which clearAppSession() does not touch, so
// a logout keeps them. Each entry belongs to one user in one company and is
// sent only while that same account is signed in.

const DB_NAME = "inspect-outbox";
const STORE = "entries";
const PHOTOS = "photos";

const handlers = new Map();
const listeners = new Set();
let state = { pending: [], failed: [], flushing: false };
let flushing = false;

/* ── IndexedDB ────────────────────────────────────────────── */
let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        if (ev.oldVersion < 1) {
          const s = db.createObjectStore(STORE, { keyPath: "id" });
          s.createIndex("scope", "scope");
        }
        // v2: photos taken without a connection (see keepPhotoOrUpload).
        if (ev.oldVersion < 2) db.createObjectStore(PHOTOS, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((e) => { dbPromise = null; throw e; });
  }
  return dbPromise;
}

async function tx(mode, fn, storeName = STORE) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let out;
    Promise.resolve(fn(store)).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/* ── who the entries belong to ────────────────────────────── */
export function currentScope() {
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!cu.username) return "";
    const company = cu.isSuperAdmin
      ? JSON.parse(localStorage.getItem("activeCompany") || "null")?.id
      : cu.companyId;
    return `${company ?? "-"}:${cu.username}`;
  } catch {
    return "";
  }
}

async function listScope(scope) {
  if (!scope) return [];
  const rows = await tx("readonly", (s) => reqP(s.index("scope").getAll(scope)));
  return (rows || []).sort((a, b) => a.createdAt - b.createdAt);
}

async function refresh() {
  let rows = [];
  try { rows = await listScope(currentScope()); } catch { rows = []; }
  state = {
    pending: rows.filter((r) => r.status !== "failed"),
    failed: rows.filter((r) => r.status === "failed"),
    flushing,
  };
  listeners.forEach((fn) => { try { fn(state); } catch { /* listener bugs stay local */ } });
  return state;
}

/* ── public API ───────────────────────────────────────────── */
export function subscribeOutbox(fn) {
  listeners.add(fn);
  fn(state);
  refresh();
  return () => listeners.delete(fn);
}

/** How many saves of the signed-in account are still on this device. */
export function outboxCountSync() {
  return state.pending.length + state.failed.length;
}

export function registerOutboxHandler(kind, fn) {
  handlers.set(kind, fn);
}

/** Stores a save on the device. Throws when the device cannot store it
    (private window, storage blocked) — the caller must then keep its draft. */
export async function enqueue(kind, key, data, label = "") {
  const scope = currentScope();
  if (!scope) throw new Error("Not signed in");
  const id = `${scope}|${kind}|${key}`;
  const now = Date.now();
  await tx("readwrite", async (s) => {
    const prev = await reqP(s.get(id));
    s.put({
      id, scope, kind, key, label, data,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      status: "pending",
      attempts: 0,
      error: "",
    });
  });
  await refresh();
}

/** Removes one entry the user chose to discard (a save the server keeps refusing). */
export async function discardEntry(id) {
  await tx("readwrite", (s) => { s.delete(id); });
  await refresh();
}

/** Puts failed entries back in line and sends them. */
export async function retryFailed() {
  const rows = await listScope(currentScope());
  await tx("readwrite", (s) => {
    rows.filter((r) => r.status === "failed").forEach((r) => s.put({ ...r, status: "pending", error: "" }));
  });
  await refresh();
  return flushOutbox();
}

/** A fetch that never reached the server (offline, dropped, timed out) or a
    gateway that is down. These are worth waiting out; anything else is a real
    answer from the server. */
export function isTransient(err) {
  if (!err) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  if (err instanceof TypeError) return true; // "Failed to fetch" / "Load failed"
  return [502, 503, 504].includes(Number(err.status));
}

/** Sends every pending save of the signed-in account, oldest first. Stops at
    the first transient failure (the connection is gone again) and at a 401
    (the session needs a new sign-in); other failures are set aside as
    "failed" with the server's message so they never block the rest. */
export async function flushOutbox() {
  if (flushing) return state;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return refresh();
  const run = async () => {
    flushing = true;
    await refresh();
    try {
      const rows = (await listScope(currentScope())).filter((r) => r.status !== "failed");
      for (const row of rows) {
        const fn = handlers.get(row.kind);
        if (!fn) continue;
        try {
          await fn(row.data);
          await tx("readwrite", (s) => { s.delete(row.id); });
        } catch (err) {
          if (isTransient(err) || Number(err?.status) === 401) break;
          await tx("readwrite", (s) => {
            s.put({ ...row, status: "failed", attempts: (row.attempts || 0) + 1, error: String(err?.message || err).slice(0, 300) });
          });
        }
      }
    } catch { /* storage unavailable: nothing to send */ }
    flushing = false;
    return refresh();
  };
  // Two open tabs must not replay the same save at once (both would find no
  // record for the date and both would create one).
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("inspect-outbox-flush", { ifAvailable: true }, (lock) => (lock ? run() : refresh()));
  }
  return run();
}

/* ── automatic sending ────────────────────────────────────── */
let started = false;
/** Wires the triggers once: back online, tab shown again, app start, and a
    one-minute retry while something is waiting and the tab is visible. The
    retry makes no request at all while nothing is pending. */
export function startOutbox() {
  if (started || typeof window === "undefined") return;
  started = true;
  const kick = () => { if (!document.hidden) flushOutbox(); };
  window.addEventListener("online", kick);
  pruneKeptPhotos();
  document.addEventListener("visibilitychange", kick);
  setInterval(() => {
    if (!document.hidden && state.pending.length) flushOutbox();
  }, 60_000);
  kick();
}

/** Asked before an explicit logout. The saves are not lost (they stay on the
    device and are sent the next time this account signs in here), but the
    user should know they have not reached the server yet. */
export function confirmLogoutWithOutbox() {
  const n = outboxCountSync();
  if (!n) return true;
  const ar = (() => { try { return localStorage.getItem("settings_lang") === "ar"; } catch { return false; } })();
  return window.confirm(ar
    ? `لديك ${n} تقرير محفوظ على هذا الجهاز لم يُرسل بعد إلى الخادم. سيُرسل عند تسجيل دخولك مجددًا من هذا الجهاز. هل تريد تسجيل الخروج؟`
    : `${n} saved ${n === 1 ? "sheet has" : "sheets have"} not reached the server yet. ${n === 1 ? "It stays" : "They stay"} on this device and will be sent the next time you sign in here. Log out anyway?`);
}

/* ── photos taken without a connection ───────────────────────
   A form uploads each photo the moment it is picked. Without a connection
   the photo is kept here instead, and the form gets a `blob:` URL for it:
   an <img> shows it right away, and the report that carries it uploads it
   before the report itself is sent (reportOutbox.resolveKeptPhotos). No
   photo is ever stored in a report as base64. */

export const isKeptPhoto = (v) => typeof v === "string" && v.startsWith("blob:");

/** Runs `upload(file)` (which resolves to the hosted URL); when the server
    cannot be reached, keeps the photo on the device and returns a blob: URL. */
export async function keepPhotoOrUpload(file, upload) {
  try {
    return await upload(file);
  } catch (err) {
    if (!isTransient(err)) throw err;
    const scope = currentScope();
    if (!scope) throw err;
    let blob = file;
    try {
      const { shrinkForUpload } = await import("./imageUpload");
      blob = await shrinkForUpload(file);
    } catch { /* keep the original */ }
    const url = URL.createObjectURL(blob);
    await tx("readwrite", (s) => { s.put({ id: url, scope, blob, name: file?.name || "photo.jpg", createdAt: Date.now(), uploadedUrl: "" }); }, PHOTOS);
    return url;
  }
}

export async function getKeptPhoto(url) {
  return tx("readonly", (s) => reqP(s.get(url)), PHOTOS);
}

export async function markKeptPhotoUploaded(url, uploadedUrl) {
  await tx("readwrite", async (s) => {
    const rec = await reqP(s.get(url));
    // The file is no longer needed; the mapping stays so a form still holding
    // the blob: URL saves the hosted one next time.
    if (rec) s.put({ ...rec, uploadedUrl, blob: null });
  }, PHOTOS);
}

/** The user removed a photo that never left the device. */
export async function dropKeptPhoto(url) {
  try { await tx("readwrite", (s) => { s.delete(url); }, PHOTOS); } catch { /* nothing kept */ }
  try { URL.revokeObjectURL(url); } catch { /* not ours */ }
}

/** Forgets kept photos that no waiting save refers to and that are older than
    a week (a form that was abandoned, or a draft that was cleared). */
export async function pruneKeptPhotos(maxAgeMs = 7 * 864e5) {
  try {
    const entries = await tx("readonly", (s) => reqP(s.getAll()));
    const used = new Set();
    const walk = (v) => {
      if (isKeptPhoto(v)) used.add(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    (entries || []).forEach((e) => walk(e.data));
    const photos = await tx("readonly", (s) => reqP(s.getAll()), PHOTOS);
    const old = (photos || []).filter((p) => !used.has(p.id) && Date.now() - p.createdAt > maxAgeMs);
    if (old.length) await tx("readwrite", (s) => { old.forEach((p) => s.delete(p.id)); }, PHOTOS);
  } catch { /* storage unavailable */ }
}
