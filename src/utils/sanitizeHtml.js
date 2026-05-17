// src/utils/sanitizeHtml.js
// Minimal HTML sanitizer for admin-authored rich content (e.g. the custom
// email-signature feature). It keeps formatting (style, links, images,
// tables) but removes script-execution vectors. This is NOT meant as a
// hardened sanitizer for arbitrary public/untrusted input — for our
// internal, admin-scoped HTML it removes the practical XSS surface with
// zero extra dependencies.

const BLOCK_TAGS = [
  "script", "iframe", "object", "embed", "link", "meta", "base", "form",
];

const URL_ATTRS = ["href", "src", "xlink:href", "action", "formaction", "background"];

export function sanitizeHtml(dirty) {
  const input = String(dirty == null ? "" : dirty);

  // SSR / no DOM available → strip all tags as the safe fallback.
  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return input.replace(/<[^>]*>/g, "");
  }

  const doc = new window.DOMParser().parseFromString(input, "text/html");

  doc.querySelectorAll(BLOCK_TAGS.join(",")).forEach((el) => el.remove());

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = String(attr.name || "").toLowerCase();
      const value = String(attr.value || "");

      // Inline event handlers: onclick, onerror, onload, …
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }

      // Dangerous URL schemes in url-bearing attributes.
      if (URL_ATTRS.includes(name)) {
        const v = value.replace(/\s+/g, "").toLowerCase();
        if (/^(?:javascript|vbscript):/.test(v) || v.startsWith("data:text/html")) {
          el.removeAttribute(attr.name);
        }
      }

      // CSS-based script vectors.
      if (name === "style" && /expression\(|javascript:|vbscript:/i.test(value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

export default sanitizeHtml;
