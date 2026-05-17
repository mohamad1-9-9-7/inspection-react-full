// src/pages/haccp and iso/CustomerComplaints/customerComplaintShared.js
// Shared visual maps + date helpers for the Customer Complaints view & its modals.
// Single source of truth so the list and the report popup never drift apart.

export const SEVERITY_COLOR = {
  Low:      { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  Medium:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  High:     { bg: "#fed7aa", color: "#9a3412", border: "#fdba74" },
  Critical: { bg: "#fecaca", color: "#991b1b", border: "#fca5a5" },
};

export const STATUS_COLOR = {
  Open:          { bg: "#fed7aa", color: "#9a3412" },
  Investigation: { bg: "#fef3c7", color: "#854d0e" },
  Closed:        { bg: "#dcfce7", color: "#166534" },
};

export const TYPE_LABELS = {
  BPC: "BPC", Foreign: "Foreign", Allergen: "Allergen", Quality: "Quality",
  Packaging: "Packaging", Service: "Service", Other: "Other",
};

export const TYPE_COLORS = {
  BPC: "#dc2626", Foreign: "#ea580c", Allergen: "#d97706",
  Quality: "#0891b2", Packaging: "#7c3aed", Service: "#0284c7", Other: "#64748b",
};

export function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a, b) {
  const da = safeDate(a), db = safeDate(b);
  if (!da || !db) return null;
  const ms = db.getTime() - da.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
