// src/pages/monitor/branches/qcs/CoolerSetupPanel.jsx
//
// ⚙️ لوحة إعدادات وحدة التخزين — الاسم · النوع · الحد الأدنى والأعلى.
// The inline editor behind the ⚙️ button on every storage unit of the QCS
// Temperature Control sheet. It edits ONE definition and hands the result back;
// persisting it (server config + the report payload) is the caller's job.
//
// It opens in place, inside the unit's own card, because that is where the
// question is asked: "cooler 5 is a dry store now — what are its limits?"

import React, { useEffect, useState } from "react";
import { STORAGE_TYPES, normalizeDef, storageType } from "./coolerDefs";

const field = { display: "flex", flexDirection: "column", gap: 4 };
const label = {
  fontSize: ".7rem",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".3px",
};
const input = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  boxSizing: "border-box",
};

export default function CoolerSetupPanel({ def, accent = "#2563eb", onApply, onCancel, busy }) {
  const [draft, setDraft] = useState(() => normalizeDef(def));

  /* Reopening on another unit must not keep the previous unit's values. Keyed
     on the VALUES, not the object: a parent that rebuilds the definition on
     every render would otherwise wipe what is being typed. */
  const defKey = JSON.stringify(normalizeDef(def));
  useEffect(() => {
    setDraft(JSON.parse(defKey));
  }, [defKey]);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  /* Switching kind re-seeds the band with that kind's standard limits — the
     whole point of "this is a dry store now" is that 0–5°C no longer applies.
     The name follows only while it is still the old kind's default name, so a
     unit someone deliberately named "مواد جافة" keeps its name. */
  const pickType = (key) => {
    const t = storageType(key);
    setDraft((d) => {
      const wasDefaultName = STORAGE_TYPES.some((x) => x.en === d.label) || !String(d.label).trim();
      return {
        ...d,
        type: t.key,
        min: t.min,
        max: t.max,
        label: wasDefaultName ? t.en : d.label,
      };
    });
  };

  const minNum = Number(draft.min);
  const maxNum = Number(draft.max);
  const invalid =
    !String(draft.label || "").trim() ||
    !Number.isFinite(minNum) ||
    !Number.isFinite(maxNum) ||
    minNum > maxNum;

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 4,
        padding: "12px 14px",
        borderRadius: 12,
        background: "#f8fafc",
        border: `1px solid ${accent}44`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: "1rem" }}>⚙️</span>
        <strong style={{ color: "#0f172a" }}>Storage setup</strong>
        <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: ".82rem" }} dir="rtl">
          الاسم · النوع · الحد الأدنى والأعلى
        </span>
      </div>

      {/* Kind */}
      <span style={{ ...label, display: "block", marginBottom: 6 }}>Type</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {STORAGE_TYPES.map((t) => {
          const on = t.key === draft.type;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => pickType(t.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                cursor: "pointer",
                border: `1.5px solid ${on ? t.accent : "#cbd5e1"}`,
                background: on ? `${t.accent}14` : "#fff",
                color: on ? t.accent : "#334155",
                fontWeight: 800,
                fontSize: ".86rem",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{t.emoji}</span>
              <span>{t.en}</span>
              <span style={{ color: "#94a3b8", fontWeight: 700 }}>· {t.ar}</span>
            </button>
          );
        })}
      </div>

      {/* Name + band */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ ...field, flex: "1 1 220px", minWidth: 180 }}>
          <span style={label}>Name shown on the sheet</span>
          <input
            value={draft.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="e.g. Dry Store 1"
            style={input}
          />
        </label>

        <label style={{ ...field, width: 120 }}>
          <span style={label}>Min °C</span>
          <input
            type="number"
            step="0.1"
            value={draft.min}
            onChange={(e) => set("min", e.target.value)}
            style={{ ...input, textAlign: "center", fontWeight: 900 }}
          />
        </label>

        <label style={{ ...field, width: 120 }}>
          <span style={label}>Max °C</span>
          <input
            type="number"
            step="0.1"
            value={draft.max}
            onChange={(e) => set("max", e.target.value)}
            style={{ ...input, textAlign: "center", fontWeight: 900 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontWeight: 800,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(normalizeDef(draft))}
            disabled={busy || invalid}
            title={invalid ? "Give the unit a name and a min that is not above the max" : "Apply and save"}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              background: invalid ? "#cbd5e1" : accent,
              color: "#fff",
              fontWeight: 900,
              cursor: busy ? "wait" : invalid ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "⏳ Saving…" : "✔ Apply"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontWeight: 600, fontSize: ".82rem", lineHeight: 1.6 }}>
        The new limits apply from now on. Reports already saved keep the limits they were recorded
        against, so an old sheet never changes its verdict.
      </div>
    </div>
  );
}
