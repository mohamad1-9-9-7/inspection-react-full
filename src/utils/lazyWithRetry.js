// src/utils/lazyWithRetry.js
// Resilient wrapper around React.lazy for dynamic import() chunks.
//
// Why: chunks are fetched over the network on demand. A transient blip
// (ERR_NETWORK_CHANGED, Wi-Fi/VPN switch, a dropped request) or a fresh
// deploy (old chunk hash no longer exists) makes import() reject with a
// ChunkLoadError — which otherwise white-screens the whole route.
//
// Strategy:
//   1. Retry the import a few times with a short backoff (handles blips).
//   2. If it still fails and the browser regained connectivity, assume the
//      chunk names changed under us (new deploy) and force ONE full reload
//      so the app boots against the new manifest. A sessionStorage guard
//      prevents an infinite reload loop when the failure is genuine.
import { lazy } from "react";

const RELOAD_GUARD_PREFIX = "chunk-reload:";

function isChunkLoadError(err) {
  const name = err?.name || "";
  const msg = err?.message || "";
  return name === "ChunkLoadError" || /Loading chunk .* failed/i.test(msg) || /import\(\) .*failed/i.test(msg);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {() => Promise<{ default: React.ComponentType<any> }>} factory  the () => import(...) thunk
 * @param {string} [key]  stable id used to guard the one-time reload (defaults to the factory source)
 * @param {number} [retries]  in-place retries before considering a reload
 */
export default function lazyWithRetry(factory, key, retries = 2) {
  const guardKey = RELOAD_GUARD_PREFIX + (key || factory.toString().slice(0, 120));

  return lazy(async () => {
    try {
      const mod = await factory();
      // Success — clear any prior reload guard so future deploys can reload again.
      try { window.sessionStorage.removeItem(guardKey); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      // A few quick in-place retries handle a momentary network hiccup.
      for (let attempt = 1; attempt <= retries; attempt += 1) {
        await wait(400 * attempt);
        try {
          return await factory();
        } catch (retryErr) {
          if (!isChunkLoadError(retryErr)) throw retryErr;
        }
      }

      // Still failing. If we haven't already reloaded for this chunk, do it
      // once — this recovers from a stale manifest after a deploy.
      let alreadyReloaded = false;
      try { alreadyReloaded = window.sessionStorage.getItem(guardKey) === "1"; } catch { /* ignore */ }

      if (!alreadyReloaded) {
        try { window.sessionStorage.setItem(guardKey, "1"); } catch { /* ignore */ }
        window.location.reload();
        // Return a never-resolving promise so React shows the fallback
        // during the (imminent) reload instead of throwing.
        return new Promise(() => {});
      }

      // We already reloaded once and it still fails — surface the error so an
      // error boundary can show a real message instead of looping forever.
      throw err;
    }
  });
}
