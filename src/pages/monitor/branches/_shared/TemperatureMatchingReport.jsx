// src/pages/monitor/branches/_shared/TemperatureMatchingReport.jsx
//
// Shared card layout for temperature logs with integrated product matching.
// Used by both the Input pages (readOnly=false) and View pages (readOnly=true)
// so the two always stay in sync.
//
// Each unit (chiller / freezer / production room) becomes a card containing:
//   - its temperature time-grid
//   - a remarks field
//   - an inline "Product Match" panel scoped to that unit
//
// Product matches live in a flat array `productVerifications`, each tagged with
// storageKey = `unit-<index>` so it renders under the right card.

import React, { useMemo } from "react";
import ProductPicker from "./ProductPicker";

const productLimit = (type) =>
  type === "frozen"
    ? { label: "≤ -18°C", pass: (n) => n <= -18 }
    : { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };

export const defaultClassify = (name = "") => {
  const s = String(name).trim();
  if (/freezer/i.test(s)) return { kind: "freezer", range: { min: -25, max: -12 }, limitType: "frozen", accent: "#0ea5e9", icon: "❄️" };
  if (/(production\s*room|prep)/i.test(s)) return { kind: "room", range: { min: 8, max: 16 }, limitType: "chilled", accent: "#7c3aed", icon: "🏭" };
  return { kind: "chiller", range: { min: 0, max: 5 }, limitType: "chilled", accent: "#2563eb", icon: "🧊" };
};

const unitKey = (i) => `unit-${i}`;
const unitIndexOf = (storageKey) => {
  const m = String(storageKey || "").match(/^unit-(\d+)$/);
  return m ? Number(m[1]) : -1;
};

export default function TemperatureMatchingReport({
  units = [],
  times = [],
  productVerifications = [],
  classify = defaultClassify,
  readOnly = false,
  onTemp,
  onRemarks,
  onAddPV,
  onUpdatePV,
  onRemovePV,
}) {
  const pvByStorage = useMemo(() => {
    const map = {};
    (productVerifications || []).forEach((row, idx) => {
      const k = row.storageKey || "unit-0";
      (map[k] = map[k] || []).push({ row, idx });
    });
    return map;
  }, [productVerifications]);

  const roomTempFor = (row) => {
    const i = unitIndexOf(row.storageKey);
    if (i < 0) return "";
    return units?.[i]?.temps?.[row.time] ?? "";
  };

  const limitForStorage = (storageKey) => {
    const i = unitIndexOf(storageKey);
    const info = i >= 0 && units[i] ? classify(units[i].name, i) : { limitType: "chilled" };
    return productLimit(info.limitType);
  };

  const pvStatus = (row) => {
    const limit = limitForStorage(row.storageKey);
    const n = Number(row.productTemp);
    if (row.productTemp === "" || row.productTemp == null || Number.isNaN(n)) {
      return { text: "Pending", color: "#475569", bg: "#f1f5f9", limit: limit.label };
    }
    return limit.pass(n)
      ? { text: "PASS", color: "#065f46", bg: "#dcfce7", limit: limit.label }
      : { text: "FAIL", color: "#991b1b", bg: "#fee2e2", limit: limit.label };
  };

  const sectionStatus = (temps, range) => {
    let filled = 0, out = 0;
    times.forEach((t) => {
      const v = temps?.[t];
      const n = Number(v);
      if (v !== "" && v != null && !Number.isNaN(n)) {
        filled += 1;
        if (n < range.min || n > range.max) out += 1;
      }
    });
    if (!filled) return { text: "No data", color: "#475569", bg: "#f1f5f9" };
    if (out) return { text: `${out} out of range`, color: "#991b1b", bg: "#fee2e2" };
    return { text: "All in range", color: "#065f46", bg: "#dcfce7" };
  };

  const tempStyle = (val, range) => {
    const base = {
      width: 80, padding: "6px 8px", borderRadius: 8, border: "1.7px solid #94a3b8",
      textAlign: "center", fontWeight: 600, color: "#111827", background: "#fff", boxSizing: "border-box",
    };
    const t = Number(val);
    if (val === "" || val == null || Number.isNaN(t)) return base;
    if (t < range.min || t > range.max) return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
    if (t >= range.max - (range.max - range.min <= 6 ? 1 : 2)) return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
    return base;
  };

  /* ---- styles ---- */
  const statusChip = (s) => ({ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 999, background: s.bg, color: s.color, fontWeight: 900, fontSize: ".82rem", whiteSpace: "nowrap" });
  const rangeBadge = { padding: "3px 11px", borderRadius: 999, background: "#eef2ff", color: "#3730a3", fontWeight: 800, fontSize: ".78rem", border: "1px solid #c7d2fe", whiteSpace: "nowrap" };
  const subLabel = { fontSize: ".74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8, display: "block" };
  const mField = { display: "flex", flexDirection: "column", gap: 4 };
  const mLabel = { fontSize: ".7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".3px" };
  const mInput = { padding: "7px 9px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 700, boxSizing: "border-box" };
  const mReadOnly = { padding: "7px 9px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800, textAlign: "center", boxSizing: "border-box", minWidth: 70 };
  const addMatchBtn = (accent) => ({ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${accent}`, background: "#fff", color: accent, fontWeight: 800, cursor: "pointer", fontSize: ".85rem" });
  const delBtn = { alignSelf: "flex-end", border: "1px solid #fecaca", background: "#fff", color: "#dc2626", borderRadius: 8, width: 36, height: 36, fontWeight: 900, cursor: "pointer", lineHeight: 1 };

  const renderMatchPanel = (storageKey, accent) => {
    const list = pvByStorage[storageKey] || [];
    if (readOnly && list.length === 0) return null;
    return (
      <div style={{ marginTop: 14, borderTop: `1px dashed ${accent}66`, paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: list.length ? 10 : 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>🔗</span>
            <strong style={{ color: "#0f172a" }}>Product Match</strong>
            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: ".82rem" }}>
              {list.length ? `${list.length} check${list.length === 1 ? "" : "s"}` : "optional"}
            </span>
          </div>
          {!readOnly && (
            <button type="button" onClick={() => onAddPV && onAddPV(storageKey)} style={addMatchBtn(accent)}>+ Add product</button>
          )}
        </div>

        {list.length === 0 ? (
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".86rem", paddingBottom: 4 }}>
            No product matched yet — add a check to compare a product against the recorded temperature.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map(({ row, idx }, pos) => {
              const status = pvStatus(row);
              const roomTemp = roomTempFor(row);
              return (
                <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", boxShadow: "0 1px 4px rgba(15,23,42,.05)" }}>
                  <span style={{ alignSelf: "center", minWidth: 24, height: 24, borderRadius: 999, background: `${accent}1a`, color: accent, fontWeight: 900, fontSize: ".8rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pos + 1}</span>

                  <div style={{ ...mField, width: 100 }}>
                    <span style={mLabel}>Time</span>
                    {readOnly ? (
                      <div style={{ ...mReadOnly, textAlign: "left" }}>{row.time || "—"}</div>
                    ) : (
                      <select value={row.time} onChange={(e) => onUpdatePV && onUpdatePV(idx, "time", e.target.value)} style={mInput}>
                        {times.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </div>

                  <div style={{ ...mField, flex: "1 1 220px", minWidth: 200 }}>
                    <span style={mLabel}>Product {row.itemCode ? `· ${row.itemCode}` : ""}</span>
                    {readOnly ? (
                      <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.productName || "—"}</div>
                    ) : (
                      <ProductPicker
                        value={row.productName}
                        itemCode={row.itemCode}
                        accent={accent}
                        onPick={(it) => onUpdatePV && onUpdatePV(idx, "__product", it)}
                      />
                    )}
                  </div>

                  <div style={{ ...mField, width: 130 }}>
                    <span style={mLabel}>Country</span>
                    {readOnly ? (
                      <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.country || row.batchNo || "—"}</div>
                    ) : (
                      <input value={row.country || row.batchNo || ""} onChange={(e) => onUpdatePV && onUpdatePV(idx, "country", e.target.value)} placeholder="Origin" style={mInput} />
                    )}
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Product °C</span>
                    {readOnly ? (
                      <div style={mReadOnly}>{row.productTemp === "" || row.productTemp == null ? "—" : `${row.productTemp}°C`}</div>
                    ) : (
                      <input type="number" step="0.1" value={row.productTemp} onChange={(e) => onUpdatePV && onUpdatePV(idx, "productTemp", e.target.value)} placeholder="°C" style={{ ...mInput, textAlign: "center", fontWeight: 900 }} />
                    )}
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Room °C</span>
                    <div style={{ ...mReadOnly, color: roomTemp === "" ? "#94a3b8" : "#0f172a" }}>{roomTemp === "" ? "—" : `${roomTemp}°C`}</div>
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Limit</span>
                    <div style={{ ...mReadOnly, color: "#475569", fontSize: ".82rem" }}>{status.limit || "—"}</div>
                  </div>

                  <div style={mField}>
                    <span style={mLabel}>Status</span>
                    <span style={statusChip(status)}>{status.text}</span>
                  </div>

                  <div style={{ ...mField, flex: "1 1 200px", minWidth: 180 }}>
                    <span style={mLabel}>Remarks / Corrective</span>
                    {readOnly ? (
                      <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.remarks || "—"}</div>
                    ) : (
                      <input value={row.remarks} onChange={(e) => onUpdatePV && onUpdatePV(idx, "remarks", e.target.value)} placeholder={status.text === "FAIL" ? "Corrective action required" : "Remarks"} style={mInput} />
                    )}
                  </div>

                  {!readOnly && (
                    <button type="button" onClick={() => onRemovePV && onRemovePV(idx)} style={delBtn} title="Remove product check">✕</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {units.map((unit, i) => {
        const info = classify(unit?.name, i);
        const accent = info.accent;
        const range = info.range;
        const status = sectionStatus(unit?.temps, range);
        return (
          <div key={i} style={{ marginBottom: "1.1rem", padding: "1rem 1.1rem", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", borderLeft: `5px solid ${accent}`, boxShadow: "0 4px 16px rgba(2,132,199,.06)", breakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.15rem" }}>{info.icon}</span>
                <strong style={{ fontSize: "1.08rem", color: "#0f172a" }}>{unit?.name || `Unit ${i + 1}`}</strong>
                <span style={rangeBadge}>{`${range.min}°C to ${range.max}°C`}</span>
              </div>
              <span style={statusChip(status)}>{status.text}</span>
            </div>

            <span style={subLabel}>Temperatures (°C)</span>
            <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {times.map((time) => {
                const raw = unit?.temps?.[time];
                return (
                  <label key={time} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.92rem", color: "#34495e", minWidth: 78 }}>
                    <span style={{ marginBottom: 7, fontWeight: 600 }}>{time}</span>
                    {readOnly ? (
                      <div style={tempStyle(raw ?? "", range)}>{raw === undefined || raw === "" || raw === null ? "—" : `${String(raw).trim()}°C`}</div>
                    ) : (
                      <input
                        type="number" step="0.1" min="-50" max="50" placeholder="°C"
                        value={raw ?? ""}
                        onChange={(e) => onTemp && onTemp(i, time, e.target.value)}
                        style={tempStyle(raw ?? "", range)}
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>Remarks</span>
              {readOnly ? (
                <div style={{ ...mReadOnly, textAlign: "left", minWidth: 260 }}>{unit?.remarks || "—"}</div>
              ) : (
                <input value={unit?.remarks || ""} onChange={(e) => onRemarks && onRemarks(i, e.target.value)} placeholder="Notes / corrective action" style={{ ...mInput, minWidth: 260 }} />
              )}
            </div>

            {renderMatchPanel(unitKey(i), accent)}
          </div>
        );
      })}
    </div>
  );
}

/* Helper for pages: create a blank product-verification row */
export const makePV = (storageKey, time) => ({
  time: time || "",
  storageKey,
  itemCode: "",
  productName: "",
  productTemp: "",
  country: "",
  remarks: "",
});

/* ===== Save-time validation: minimum number of real product matches ===== */
export const MIN_MATCHES = 2;

// A match counts only when a product is selected AND a numeric product temperature is entered.
export const isValidMatch = (r) =>
  !!String(r?.productName || "").trim() &&
  r?.productTemp !== "" &&
  r?.productTemp != null &&
  !Number.isNaN(Number(r.productTemp));

export const countValidMatches = (pvs) =>
  (Array.isArray(pvs) ? pvs.filter(isValidMatch).length : 0);
