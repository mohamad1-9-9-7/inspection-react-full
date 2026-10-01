// Shared look for the POS 19 (Al Warqa Kitchen) view pages.
//
// The 20 view files were written one at a time, each with its own
// `btn(hexColour)` helper, so one toolbar showed purple, red, sky, navy,
// charcoal and green buttons side by side. Each file now routes its helper
// through colorBtn(), which maps the colour it already passes to one of the
// ISO_UI button kinds the POS 15 views use — same meaning, one palette.
import { ISO_UI } from "../../_shared/branchViewKit";

const KIND_BY_HEX = {
  // destructive
  "#dc2626": "danger", "#ef4444": "danger", "#b91c1c": "danger",
  // edit
  "#7c3aed": "violet", "#8b5cf6": "violet", "#6d28d9": "violet",
  // save / confirm
  "#10b981": "success", "#16a34a": "success", "#22c55e": "success",
  // everything else (exports, import, cancel, add row…) stays quiet
};

export function colorBtn(bg, disabled = false) {
  const kind = KIND_BY_HEX[String(bg || "").toLowerCase()] || "secondary";
  return { ...ISO_UI.btn(kind, disabled), display: "inline-block" };
}

/* Kept here so the POS 19 views import both helpers from one place. */
export { default as useRevealDate } from "../../_shared/useRevealDate";
