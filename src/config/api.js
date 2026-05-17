// ✅ Single source of truth for the backend URL.
// Import this EVERYWHERE instead of hardcoding the server URL:
//   import API_BASE from "../config/api";              // default = reports/API base
//   import { API_BASE, IMAGE_API_BASE } from "../config/api";
//
// Resolution order (first defined wins) — a strict superset of every
// pattern that was previously copy-pasted across the app, so any file
// can switch to this import without losing the runtime override:
//   window.__QCS_API__  →  import.meta.env.VITE_API_URL  →
//   process.env.REACT_APP_API_URL  →  process.env.VITE_API_URL  →  fallback
const DEFAULT_API = "https://inspection-server-4nvj.onrender.com";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env &&
    (process.env.REACT_APP_API_URL || process.env.VITE_API_URL)) ||
  DEFAULT_API
).replace(/\/$/, "");

// Image API can point to a different host (Cloudinary proxy); falls back to API_BASE.
const IMAGE_API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_IMAGE_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_IMAGE_API_URL) ||
  (typeof process !== "undefined" && process.env &&
    (process.env.REACT_APP_IMAGE_API_URL || process.env.VITE_IMAGE_API_URL)) ||
  API_BASE
).replace(/\/$/, "");

export { API_BASE, IMAGE_API_BASE };
export default API_BASE;
