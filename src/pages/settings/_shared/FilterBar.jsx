// src/pages/settings/_shared/FilterBar.jsx
//
// 🔎 شريط فلترة بنمط Linear — مدخل واحد لكل شيء.
//
// Why this shape: a dropdown per field means four interactions to apply one
// filter (open, search, tick, close), and N controls compete for space across the top
// of the page. The pattern that replaced it everywhere (Linear, Notion, GitHub,
// shadcn's data-table toolbar) is a single command palette:
//
//   • you type once, and every field's values are searched at the same time
//   • ↑/↓ + Enter applies — the mouse is optional
//   • what is applied shows as chips you can click to edit or ✕ to drop
//   • Backspace on an empty box removes the last chip
//
// Deliberately dependency-free: cmdk (the library behind Linear's and Vercel's
// palettes) only supplies list rendering and key handling, is unstyled, and
// pulls in Radix — while the part that actually matters here, the filter model
// below, is not in any of those libraries. This project has no UI framework and
// styles inline, so a local component fits it better than two new packages.
//
// ── Contract ────────────────────────────────────────────────────────────────
//   fields  : [{ key, label, icon, options: [{ value, label, count }] }]
//   filters : [{ field, values: string[] }]        ← chips (OR inside, AND across)
//   query   : free text, applied live by the caller
//
// The caller owns filtering; this component only edits the criteria.

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════ tokens */

const C = {
  accent: "#0f766e",
  accentSoft: "#ecfdf5",
  accentLine: "rgba(15,118,110,0.35)",
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "rgba(15,23,42,0.14)",
  surface: "#ffffff",
  raised: "#f8fafc",
};

/* ═══════════════════════════════════════════════ helpers */

const norm = (s) => String(s ?? "").toLowerCase().trim();

/** Every term must match — so two words narrow instead of widening. */
function matches(haystack, terms) {
  if (!terms.length) return true;
  const hay = norm(haystack);
  return terms.every((t) => hay.includes(t));
}

/** Ranks an exact/prefix hit above a mid-string one. */
function score(label, terms) {
  const l = norm(label);
  if (!terms.length) return 0;
  const first = terms[0];
  if (l === first) return 0;
  if (l.startsWith(first)) return 1;
  return 2;
}

export function filterValues(filters, fieldKey) {
  const hit = (filters || []).find((f) => f.field === fieldKey);
  return hit ? hit.values : [];
}

/** Applies the chips to one row. Values inside a chip are OR, chips are AND. */
export function applyFilters(row, filters, accessor) {
  return (filters || []).every((f) => {
    if (!f.values?.length) return true;
    const v = accessor(row, f.field);
    return f.values.includes(v);
  });
}

/* ═══════════════════════════════════════════════ chip */

function Chip({ field, values, onEdit, onRemove }) {
  const label =
    values.length === 1
      ? values[0]
      : `${values.length} ${field.label.toLowerCase()}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 8,
        border: `1px solid ${C.accentLine}`,
        background: C.accentSoft,
        overflow: "hidden",
        maxWidth: 320,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onEdit}
        title={values.join(", ")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 9px",
          border: "none",
          background: "transparent",
          color: C.accent,
          fontWeight: 900,
          fontSize: 12,
          cursor: "pointer",
          minWidth: 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 11 }}>{field.icon}</span>
        <span style={{ color: C.muted, fontWeight: 800 }}>{field.label}</span>
        <span style={{ color: C.faint, fontWeight: 800 }}>is</span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${field.label} filter`}
        style={{
          border: "none",
          borderInlineStart: `1px solid ${C.accentLine}`,
          background: "transparent",
          color: C.accent,
          padding: "0 8px",
          cursor: "pointer",
          fontWeight: 950,
          fontSize: 11,
        }}
      >
        ✕
      </button>
    </span>
  );
}

/* ═══════════════════════════════════════════════ bar */

export default function FilterBar({
  fields,
  filters,
  onFiltersChange,
  query,
  onQueryChange,
  placeholder = "Filter…",
  resultCount,
  resultNoun = "results",
  presets = [],
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  /* null = searching every field at once; a key = browsing that field's values */
  const [scope, setScope] = useState(null);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const fieldByKey = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, f])),
    [fields]
  );

  /* Close on outside click / Esc — the palette must never trap the page. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setScope(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const terms = useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);

  /**
   * The suggestion list. With no scope it spans every field at once — typing
   * "butcher" surfaces the job titles AND any branch that mentions it, which is
   * the whole point of one input instead of three dropdowns.
   */
  const groups = useMemo(() => {
    const active = scope ? fields.filter((f) => f.key === scope) : fields;
    const out = [];

    active.forEach((field) => {
      const selected = filterValues(filters, field.key);
      const opts = field.options
        .filter((o) => matches(`${o.label} ${field.label}`, terms))
        .sort(
          (a, b) =>
            score(a.label, terms) - score(b.label, terms) ||
            (b.count || 0) - (a.count || 0) ||
            a.label.localeCompare(b.label)
        )
        .slice(0, scope ? 400 : 8);

      if (!opts.length) return;
      out.push({
        key: field.key,
        label: field.label,
        icon: field.icon,
        truncated: !scope && field.options.filter((o) => matches(o.label, terms)).length > opts.length,
        items: opts.map((o) => ({
          fieldKey: field.key,
          value: o.value,
          label: o.label,
          count: o.count,
          on: selected.includes(o.value),
        })),
      });
    });

    return out;
  }, [fields, filters, terms, scope]);

  /* Flat list the cursor walks, so ↑/↓ ignore the group headings. */
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setCursor(0), [query, scope, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  /* ── Mutations ── */

  function toggleValue(fieldKey, value) {
    const current = filterValues(filters, fieldKey);
    const values = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const rest = filters.filter((f) => f.field !== fieldKey);
    onFiltersChange(values.length ? [...rest, { field: fieldKey, values }] : rest);
  }

  function removeField(fieldKey) {
    onFiltersChange(filters.filter((f) => f.field !== fieldKey));
  }

  function clearAll() {
    onFiltersChange([]);
    onQueryChange("");
    setScope(null);
  }

  function pick(item) {
    if (!item) return;
    toggleValue(item.fieldKey, item.value);
    onQueryChange("");
    /* Stay open: choosing several values from one field is the common case. */
    setScope(item.fieldKey);
    inputRef.current?.focus();
  }

  /* ── Keyboard: the palette is usable without ever touching the mouse ── */
  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (scope) setScope(null);
      else setOpen(false);
      return;
    }
    if (e.key === "Backspace" && !query && filters.length) {
      if (scope) setScope(null);
      else removeField(filters[filters.length - 1].field);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(flat[cursor]);
    } else if (e.key === "Tab" && flat[cursor]) {
      e.preventDefault();
      setScope(flat[cursor].fieldKey);
    }
  }

  const hasCriteria = filters.length > 0 || !!query;
  const scopeField = scope ? fieldByKey[scope] : null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* ── the bar ── */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexWrap: "wrap",
          padding: "7px 10px",
          minHeight: 46,
          borderRadius: 10,
          border: `1px solid ${open ? C.accent : C.line}`,
          background: C.surface,
          boxShadow: open ? `0 0 0 3px rgba(15,118,110,0.10)` : "none",
          cursor: "text",
          transition: "border-color .12s, box-shadow .12s",
        }}
      >
        <span aria-hidden="true" style={{ color: C.faint, fontSize: 13, flexShrink: 0 }}>🔍</span>

        {filters.map((f) => {
          const field = fieldByKey[f.field];
          if (!field) return null;
          return (
            <Chip
              key={f.field}
              field={field}
              values={f.values}
              onEdit={() => { setScope(f.field); setOpen(true); onQueryChange(""); inputRef.current?.focus(); }}
              onRemove={() => removeField(f.field)}
            />
          );
        })}

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={scopeField ? `${scopeField.label}…` : filters.length ? "" : placeholder}
          style={{
            flex: "1 1 130px",
            minWidth: 90,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13.5,
            fontWeight: 800,
            color: C.ink,
            fontFamily: "inherit",
            padding: "4px 0",
          }}
        />

        {resultCount != null && (
          <span
            style={{
              flexShrink: 0,
              color: C.muted,
              fontWeight: 950,
              fontSize: 11.5,
              whiteSpace: "nowrap",
            }}
          >
            {resultCount} {resultNoun}
          </span>
        )}

        {hasCriteria && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            style={{
              flexShrink: 0,
              border: `1px solid ${C.line}`,
              background: C.raised,
              color: C.muted,
              borderRadius: 7,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── presets: one click for the combination people reach for daily ── */}
      {presets.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 950,
              color: C.faint,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Quick
          </span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { onFiltersChange(p.filters); onQueryChange(""); setScope(null); }}
              style={{
                border: `1px solid ${p.on ? C.accent : C.line}`,
                background: p.on ? C.accent : C.surface,
                color: p.on ? "#fff" : C.muted,
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 11.5,
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {p.label}
              {p.count != null && (
                <span style={{ marginInlineStart: 6, opacity: 0.75, fontWeight: 950 }}>{p.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── palette ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 70,
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            width: "min(520px, 100%)",
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            boxShadow: "0 20px 50px rgba(15,23,42,0.20)",
            overflow: "hidden",
          }}
        >
          {scopeField && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderBottom: `1px solid ${C.line}`,
                background: C.raised,
              }}
            >
              <button
                type="button"
                onClick={() => { setScope(null); inputRef.current?.focus(); }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.accent,
                  fontWeight: 950,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ← All filters
              </button>
              <span style={{ color: C.faint }}>/</span>
              <strong style={{ fontSize: 12, fontWeight: 950, color: C.ink }}>
                {scopeField.icon} {scopeField.label}
              </strong>
            </div>
          )}

          <div ref={listRef} style={{ maxHeight: 320, overflowY: "auto", padding: 6 }}>
            {groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 4 }}>
                {!scope && (
                  <div
                    style={{
                      padding: "6px 10px 4px",
                      fontSize: 10,
                      fontWeight: 950,
                      color: C.faint,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{g.icon} {g.label}</span>
                    {g.truncated && (
                      <button
                        type="button"
                        onClick={() => { setScope(g.key); inputRef.current?.focus(); }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: C.accent,
                          fontWeight: 950,
                          fontSize: 10,
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        See all →
                      </button>
                    )}
                  </div>
                )}

                {g.items.map((item) => {
                  const idx = flat.indexOf(item);
                  const hot = idx === cursor;
                  return (
                    <button
                      key={`${item.fieldKey}:${item.value}`}
                      type="button"
                      data-idx={idx}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => pick(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "7px 10px",
                        border: "none",
                        borderRadius: 7,
                        background: hot ? C.accentSoft : "transparent",
                        cursor: "pointer",
                        textAlign: "start",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: 4,
                          border: `1.5px solid ${item.on ? C.accent : C.line}`,
                          background: item.on ? C.accent : C.surface,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 950,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.on ? "✓" : ""}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12.5,
                          fontWeight: 850,
                          color: C.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </span>
                      {item.count != null && (
                        <span style={{ color: C.faint, fontWeight: 950, fontSize: 11 }}>{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {!flat.length && (
              <div style={{ padding: 20, textAlign: "center", color: C.muted, fontWeight: 800, fontSize: 12.5 }}>
                {query ? (
                  <>
                    Nothing matches “{query}”.
                    <div style={{ color: C.faint, fontWeight: 750, marginTop: 4, fontSize: 11.5 }}>
                      Free text still searches the table below.
                    </div>
                  </>
                ) : (
                  "No filter values available."
                )}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "7px 12px",
              borderTop: `1px solid ${C.line}`,
              background: C.raised,
              color: C.faint,
              fontSize: 10.5,
              fontWeight: 900,
              flexWrap: "wrap",
            }}
          >
            <span>↑↓ move</span>
            <span>↵ toggle</span>
            <span>⇥ see all</span>
            <span>⌫ remove last</span>
            <span>esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
