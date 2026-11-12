// src/pages/monitor/branches/ftr1/ftr1Oil.js
// FTR 1 oil quality — readings from the Testo oil tester (TPM % = Total
// Polar Materials, plus the oil temperature at the moment of measuring).
// Shared by the input sheet and the viewer so both judge a reading alike.

export const OIL_TYPE = "ftr1_oil_calibration";

/* Traffic light on TPM %. Fresh oil reads roughly 2–8 %; oil is commonly
   changed at 24 % TPM and must be discarded above 27 %. */
export const TPM_LIMITS = { warn: 24, discard: 27 };
/* The tester reads correctly only in hot oil (its range is about 40–200 °C). */
export const OIL_TEMP_RANGE = { min: 40, max: 200 };

export const FRYERS = ["Fryer 1", "Fryer 2"];

export const ACTIONS = [
  { key: "",         label: "— none —" },
  { key: "filtered", label: "Oil filtered" },
  { key: "topped",   label: "Topped up with fresh oil" },
  { key: "changed",  label: "Oil changed (discarded + fresh)" },
];

const n = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** { key: "ok"|"warn"|"discard"|"", label, color, bg } for a TPM value. */
export function tpmStatus(tpm) {
  const v = n(tpm);
  if (v == null) return { key: "", label: "—", color: "#64748b", bg: "#f1f5f9" };
  if (v > TPM_LIMITS.discard) return { key: "discard", label: "Discard", color: "#991b1b", bg: "#fee2e2" };
  if (v >= TPM_LIMITS.warn) return { key: "warn", label: "Change soon", color: "#92400e", bg: "#fef3c7" };
  return { key: "ok", label: "Good", color: "#166534", bg: "#dcfce7" };
}

export const actionLabel = (k) => (ACTIONS.find((a) => a.key === k) || {}).label || "";

/** The old text columns (result / action) the existing viewer + Excel read. */
export function legacyText(r) {
  const s = tpmStatus(r.tpm);
  const parts = [r.fryer, r.time, n(r.tpm) != null ? `TPM ${r.tpm}%` : "", n(r.oilTemp) != null ? `${r.oilTemp}°C` : "", s.key ? s.label : ""];
  return {
    result: parts.filter(Boolean).join(" · "),
    action: [actionLabel(r.action), r.correctiveAction].filter((x) => x && x !== "— none —").join(" — "),
  };
}
