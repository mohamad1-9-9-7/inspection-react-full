// ShelfLifeModal.jsx
//
// ⏳ محرّر مدة الصلاحية — the editor behind shelfLife.js.
//
// One list: the products that have their own shelf life, searched out of the
// catalog and given a number of days each. Plus one default for everything
// else, and 0 days to switch the automatic expiry off for a product.
//
// A category tab used to sit here too. It was dropped on request: the catalog's
// categories are a purchasing grouping (Service-Kitchen Ingrediants, RTE HOT
// Food…), not a shelf-life grouping, so it was a long list answering the wrong
// question. shelfLife.js still RESOLVES a category rule if a config carries one
// — nothing already saved is lost — it is simply not authored here any more.
//
// It writes the shared config record, so every screen that reads shelfLife.js
// sees the change (the open form re-calculates the moment this closes).

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useProductCatalog, normalizeCode } from "./ProductPicker";
import { dedupeRules, EMPTY_CONFIG } from "./shelfLife";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `sl_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 11000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  box: {
    background: "#fff", borderRadius: 18, width: "min(1180px,97vw)", height: "min(880px,94vh)",
    display: "flex", flexDirection: "column", overflow: "hidden", direction: "ltr",
    boxShadow: "0 20px 50px rgba(2,6,23,.30)", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  head: {
    padding: "14px 18px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
  },
  body: { padding: 16, overflowY: "auto", background: "#f8fafc", flex: "1 1 auto", minHeight: 0 },
  foot: {
    padding: "12px 18px", borderTop: "1px solid #e5e7eb", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
  },
  card: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, marginBottom: 14,
  },
  cardTitle: { fontWeight: 900, color: "#1e293b", marginBottom: 4 },
  hint: { color: "#64748b", fontSize: ".82rem", marginBottom: 10, lineHeight: 1.5 },
  input: {
    padding: "9px 12px", border: "1px solid #94a3b8", borderRadius: 10, outline: "none",
    background: "#fff", color: "#111827", boxSizing: "border-box", width: "100%",
  },
  days: { width: 92, textAlign: "center", fontWeight: 800 },
  row: {
    display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
    borderTop: "1px dashed #e5e7eb",
  },
  grow: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  btn: (bg, fg, bd) => ({
    padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 800,
    background: bg, color: fg, border: bd || `1px solid ${bg}`,
  }),
  chip: {
    fontSize: ".75rem", fontWeight: 800, color: "#3730a3", background: "#eef2ff",
    border: "1px solid #c7d2fe", borderRadius: 999, padding: "2px 8px",
  },
  x: {
    width: 26, height: 26, borderRadius: 8, border: "1px solid #fecaca",
    background: "#fef2f2", color: "#b91c1c", fontWeight: 900, cursor: "pointer", flex: "0 0 auto",
  },
};

export default function ShelfLifeModal({ open, config, onSave, onClose, user = "" }) {
  const [defaultDays, setDefaultDays] = useState("");
  const [rules, setRules] = useState([]);
  const [codeQuery, setCodeQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { allItems } = useProductCatalog();

  // The draft is taken fresh every time the dialog opens, so closing without
  // saving really does discard the edits.
  useEffect(() => {
    if (!open) return;
    const c = config || EMPTY_CONFIG;
    setDefaultDays(c.defaultDays ? String(c.defaultDays) : "");
    setRules(c.rules.map((r) => ({ ...r })));
    setError("");
    setCodeQuery("");
  }, [open, config]);

  const codeRules = useMemo(() => rules.filter((r) => r.scope === "code"), [rules]);

  const daysForCode = (code) => {
    const key = normalizeCode(code);
    const hit = rules.find((r) => r.scope === "code" && normalizeCode(r.match) === key);
    return hit ? String(hit.days) : "";
  };

  function setDays(code, value) {
    const key = normalizeCode(code);
    const same = (r) => r.scope === "code" && normalizeCode(r.match) === key;
    const raw = String(value).trim();

    setRules((prev) => {
      const rest = prev.filter((r) => !same(r));
      if (raw === "") return rest;                       // cleared → no rule at all
      const days = Math.max(0, Math.min(3650, Math.round(Number(raw) || 0)));
      const old = prev.find(same);
      return [...rest, { id: old?.id || uid(), scope: "code", match: code, days, note: old?.note || "" }];
    });
  }

  const dropRule = (id) => setRules((prev) => prev.filter((r) => r.id !== id));

  /* ── product search: whatever is not already listed above ── */
  const codeMatches = useMemo(() => {
    const q = codeQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const already = new Set(codeRules.map((r) => normalizeCode(r.match)));
    return (allItems || [])
      .filter((it) => !already.has(normalizeCode(it.item_code)))
      .filter((it) =>
        String(it.item_code).toLowerCase().includes(q) ||
        String(it.description).toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [codeQuery, allItems, codeRules]);

  const nameOfCode = useMemo(() => {
    const m = new Map();
    (allItems || []).forEach((it) => m.set(normalizeCode(it.item_code), it.description));
    return m;
  }, [allItems]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const d = Math.max(0, Math.min(3650, Math.round(Number(defaultDays) || 0)));
      // `rules` still carries whatever the config arrived with, so a rule this
      // screen no longer authors is passed through instead of being wiped.
      await onSave({ defaultDays: d, rules: dedupeRules(rules) }, user);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const activeCount = rules.length + (Number(defaultDays) > 0 ? 1 : 0);

  return ReactDOM.createPortal(
    <div style={S.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={S.box}>
        <div style={S.head}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>⏳ Shelf Life — مدة الصلاحية</div>
            <div style={{ opacity: .9, fontSize: ".82rem" }}>
              Expiry = production date + days. تاريخ الانتهاء = تاريخ الإنتاج + عدد الأيام.
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...S.btn("rgba(255,255,255,.16)", "#fff", "1px solid rgba(255,255,255,.4)") }}>
            ✕
          </button>
        </div>

        <div style={S.body}>
          <div style={S.card}>
            <div style={S.cardTitle}>Default — الافتراضي</div>
            <div style={S.hint}>
              Used for every product that has no shelf life of its own.
              Leave it empty to calculate nothing by default.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min="0" max="3650" step="1"
                value={defaultDays}
                onChange={(e) => setDefaultDays(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="—"
                style={{ ...S.input, ...S.days }}
              />
              <span style={{ color: "#475569", fontWeight: 700 }}>days / يوم</span>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>Products — الأصناف ({codeRules.length})</div>
            <div style={S.hint}>
              A product listed here uses its own days and ignores the default.
              0 days switches the automatic expiry off for it.
            </div>

            {codeRules.length > 0 && (
              <div style={{ marginBottom: 12, maxHeight: "min(42vh,440px)", overflowY: "auto" }}>
                {codeRules.map((r) => (
                  <div key={r.id} style={S.row}>
                    <span style={S.grow} title={nameOfCode.get(normalizeCode(r.match)) || ""}>
                      <b style={{ color: "#4f46e5" }}>{r.match}</b>{" "}
                      <span style={{ color: "#475569" }}>
                        {nameOfCode.get(normalizeCode(r.match)) || ""}
                      </span>
                    </span>
                    <input
                      type="number" min="0" max="3650" step="1"
                      value={daysForCode(r.match)}
                      onChange={(e) => setDays(r.match, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      style={{ ...S.input, ...S.days }}
                    />
                    <span style={{ color: "#64748b", fontWeight: 700, width: 34 }}>days</span>
                    <button type="button" onClick={() => dropRule(r.id)} style={S.x} title="Remove">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Search a product by code or name to add…"
              style={{ ...S.input, marginBottom: 6 }}
            />
            <div style={{ maxHeight: "min(34vh,360px)", overflowY: "auto" }}>
              {codeQuery.trim().length < 2 && (
                <div style={{ color: "#94a3b8", padding: "10px 0" }}>
                  Type at least two characters to search the catalog.
                </div>
              )}
              {codeQuery.trim().length >= 2 && codeMatches.length === 0 && (
                <div style={{ color: "#94a3b8", padding: "10px 0" }}>No product matches.</div>
              )}
              {codeMatches.map((it) => (
                <div key={it.item_code + it.description} style={S.row}>
                  <span style={S.grow} title={it.description}>
                    <b style={{ color: "#4f46e5" }}>{it.item_code}</b> · {it.description}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDays(it.item_code, defaultDays || "30")}
                    style={S.btn("#eef2ff", "#3730a3", "1px solid #c7d2fe")}
                  >
                    + add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 10, padding: "9px 12px", fontWeight: 700 }}>
              {error}
            </div>
          )}
        </div>

        <div style={S.foot}>
          <span style={S.chip}>{activeCount} rule{activeCount === 1 ? "" : "s"}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={S.btn("#fff", "#334155", "1px solid #cbd5e1")}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ ...S.btn("#16a34a", "#fff"), opacity: saving ? .6 : 1 }}>
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
