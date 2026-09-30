// src/companies/exaltis/reports/dailyLog/Cell.jsx
// Daily log engine — one editable cell of a log table.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import { bi, Bi } from "../bilingual";
import { blankItem, itemFilled, listOf } from "./logCore";
import { ACCENT, S } from "./logStyles";

/* ───────── one editable cell ───────── */
export function Cell({ col, value, row, onChange, lotOptions, listId }) {
  if (col.type === "computed") {
    return <div style={{ ...S.cell, background: "#f1f5f9", color: "#475569", fontWeight: 700 }}>{col.compute(row) || "—"}</div>;
  }
  if (col.type === "select") {
    return (
      <select style={S.cell} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
      </select>
    );
  }
  if (col.type === "list") {
    const items = listOf(col, value);
    const setItem = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
    const pickLot = (label) => {
      const hit = lotOptions.find((l) => l.label === label);
      if (!hit || items.some((it) => it.lot === hit.lot && it.material === hit.material)) return;
      // Reuse a blank line if there is one, otherwise append.
      const blank = items.findIndex((it) => !itemFilled(col, it));
      const next = { ...blankItem(col), material: hit.material, lot: hit.lot, unit: hit.unit };
      onChange(blank >= 0 ? items.map((it, i) => (i === blank ? next : it)) : [...items, next]);
    };
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {col.fields.map((f) => (
              <span key={f.key} style={{ flex: `1 1 ${f.width || 90}px`, minWidth: Math.min(f.width || 90, 110) }}>
                {f.type === "select" ? (
                  <select style={S.cell} value={it[f.key] || ""} onChange={(e) => setItem(i, f.key, e.target.value)}>
                    {f.options.map((o) => <option key={o} value={o}>{bi(o)}</option>)}
                  </select>
                ) : (
                  <input
                    style={S.cell}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    step={f.type === "number" ? "any" : undefined}
                    placeholder={bi(f.label)}
                    value={it[f.key] ?? ""}
                    onChange={(e) => setItem(i, f.key, e.target.value)}
                  />
                )}
              </span>
            ))}
            <button
              type="button"
              title="Remove line"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              style={{ ...S.btn("#fee2e2", "#b91c1c"), padding: "4px 8px", flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {col.lotsFrom && lotOptions.length > 0 && (
            <select
              style={{ ...S.cell, flex: "1 1 180px", width: "auto", background: "#f0fdfa", color: ACCENT, fontWeight: 700 }}
              value=""
              onChange={(e) => pickLot(e.target.value)}
            >
              <option value="">{bi("+ Add received lot…")}</option>
              {lotOptions.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => onChange([...items, blankItem(col)])}
            style={{ ...S.btn("#f1f5f9", "#334155"), padding: "5px 10px" }}
          >
            <Bi en={col.addLabel || "+ Add line"} />
          </button>
        </div>
      </div>
    );
  }
  const type = col.type === "number" ? "number" : col.type === "time" ? "time" : col.type === "date" ? "date" : "text";
  return (
    <input
      style={S.cell}
      type={type}
      step={type === "number" ? "any" : undefined}
      value={value ?? ""}
      list={col.options || col.matrix || col.lookup ? listId : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
