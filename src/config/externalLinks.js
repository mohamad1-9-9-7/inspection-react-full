// src/config/externalLinks.js
// External portals opened from dashboard cards (a card with `href` opens the
// link in a new tab instead of navigating inside the app).

/** Dubai Municipality — DM Checked inspection reports portal. */
export const DM_CHECKED_URL = "https://dmchecked.dm.gov.ae/";

/** Opens an external portal in a new tab, detached from this app's window. */
export function openExternal(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}
