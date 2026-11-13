// src/utils/escapeHtml.js
// Escape a value before putting it into an HTML string — print popups built
// with window.open() + document.write() run on THIS site's origin, so a record
// field like `</title><script>…` would run with the user's session (the token
// lives in localStorage). Anything that comes from a report, a form, a public
// link or the user must go through this before landing in such a template.
// React-rendered DOM copied via outerHTML/innerHTML is already escaped.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default escapeHtml;
