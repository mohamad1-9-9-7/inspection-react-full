// src/pages/monitor/branches/_shared/CodedProductField.jsx
//
// كود المنتج + اسم المنتج — حقلان مربوطان ببعض ومصدرهما كتالوج المنتجات
// Item code and product name, bound together and fed by the shared product
// catalog (public/data/items.json + the server catalog + custom items).
//
// Why two components instead of one: every screen that needs this draws its
// own table, so the code and the name live in two separate cells with the
// page's own styling. Both share one catalog index, so picking on either
// side fills the other.
//
// Free text is deliberately still allowed — a receiving clerk may take in an
// item the catalog does not carry yet, and blocking that would stop the log
// being filled at all. What the catalog guarantees is that the moment either
// side matches a catalog entry, BOTH sides agree with the catalog.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProductCatalog, normalizeCode } from "./ProductPicker";

/** Some screens write the code into the name: "[22160] BONES - KG" from the
 *  Final Product report, "22160 · BONES - KG" from our own coded cells. When a
 *  value in that shape is pasted in, the prefix is peeled off so the rest can
 *  still be recognised as a catalog product. */
export function stripCodePrefix(v) {
  const t = String(v ?? "").trim();
  const m =
    t.match(/^[[(]\s*[A-Za-z0-9][A-Za-z0-9._/-]{0,19}\s*[\])]\s*(.+)$/) ||
    t.match(/^[0-9][0-9A-Za-z._/-]{1,19}\s*[·|]\s*(.+)$/);
  return m ? m[1].trim() : t;
}

/* Loose name key: case/space/punctuation-insensitive, so "AUS LAMB - KG"
   and "aus lamb  kg" resolve to the same catalog row. */
export function normalizeName(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .trim();
}

/** "22000 · AUS CHILLED LAMB CARCASS - KG" — the code glued to its name, the
 *  way a coded product reads on screen, on paper and in a backup. Either half
 *  may be missing; the other one is returned on its own. */
export function codedName(code, name) {
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();
  if (c && n) return `${c} · ${n}`;
  return c || n || "";
}

/** React flavour of `codedName`, with the code set apart visually. */
export function CodedName({ code, name, accent = "#4f46e5", dash = "—" }) {
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();
  if (!c && !n) return <>{dash}</>;
  return (
    <>
      {c ? <b style={{ color: accent }}>{c}{n ? " · " : ""}</b> : null}
      {n}
    </>
  );
}

/* Build byCode / byName lookups over the catalog. */
export function useCatalogIndex() {
  const { allItems, loading } = useProductCatalog();
  const index = useMemo(() => {
    const byCode = new Map();
    const byName = new Map();
    (allItems || []).forEach((it) => {
      const c = normalizeCode(it.item_code);
      const n = normalizeName(it.description);
      if (c && !byCode.has(c)) byCode.set(c, it);
      if (n && !byName.has(n)) byName.set(n, it);
    });
    return { byCode, byName };
  }, [allItems]);
  return { items: allItems || [], loading, ...index };
}

/** Resolve a { code, name } pair against the catalog: whichever side is
 *  recognised fills the other. Returns the completed pair. */
export function resolvePair({ code = "", name = "", byCode, byName }) {
  const c = normalizeCode(code);
  const n = normalizeName(stripCodePrefix(name));
  if (c && byCode && byCode.has(c)) {
    const hit = byCode.get(c);
    return { code: hit.item_code, name: hit.description };
  }
  if (n && byName && byName.has(n)) {
    const hit = byName.get(n);
    return { code: hit.item_code, name: hit.description };
  }
  return { code: String(code || "").trim(), name: String(name || "").trim() };
}

/* ===== Shared suggestion popup ===== */
function Suggest({ open, loading, results, sel, onPick, accent }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 3px)",
        left: 0,
        minWidth: "100%",
        width: "max-content",
        maxWidth: 380,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 10px 24px rgba(15,23,42,.14)",
        zIndex: 90,
        maxHeight: 240,
        overflowY: "auto",
        textAlign: "left",
      }}
    >
      {loading ? (
        <div style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700, fontSize: 12 }}>
          Loading catalog…
        </div>
      ) : results.length === 0 ? (
        <div style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700, fontSize: 12 }}>
          No match in catalog
        </div>
      ) : (
        results.map((it, k) => (
          <div
            key={`${it.item_code}-${k}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(it)}
            style={{
              padding: "7px 9px",
              cursor: "pointer",
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              background: k === sel ? "#eef2ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
              fontSize: 12.5,
            }}
          >
            <span style={{ fontWeight: 800, color: accent, minWidth: 48 }}>{it.item_code || "—"}</span>
            <span style={{ color: "#334155" }}>{it.description}</span>
          </div>
        ))
      )}
    </div>
  );
}

/* ===== Common behaviour for both boxes ===== */
function useSuggestBox({ matches, onCommit }) {
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const keyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSel((s) => Math.min(s + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[sel]) {
        e.preventDefault();
        onCommit(matches[sel]);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return { boxRef, open, setOpen, sel, setSel, keyDown };
}

const MAX_RESULTS = 25;

/**
 * كود المنتج — Item code box.
 * onChange({ code, name }) fires with BOTH sides so the caller can write them
 * into the same row in one update.
 */
export function ItemCodeInput({
  code = "",
  name = "",
  onChange,
  style,
  className,
  placeholder = "Code",
  disabled = false,
  accent = "#2563eb",
  title,
}) {
  const { items, loading, byCode } = useCatalogIndex();

  const matches = useMemo(() => {
    const q = normalizeCode(code);
    if (!q) return items.slice(0, MAX_RESULTS);
    return items.filter((it) => normalizeCode(it.item_code).includes(q)).slice(0, MAX_RESULTS);
  }, [items, code]);

  const commit = (it) => {
    if (typeof onChange === "function") onChange({ code: it.item_code || "", name: it.description || "" });
  };
  const box = useSuggestBox({ matches, onCommit: commit });

  const known = byCode.get(normalizeCode(code));

  return (
    <div ref={box.boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        className={className}
        disabled={disabled}
        value={code}
        placeholder={placeholder}
        title={title || (known ? known.description : "Item code from the product catalog")}
        onChange={(e) => {
          const v = e.target.value;
          box.setOpen(true);
          box.setSel(0);
          const hit = byCode.get(normalizeCode(v));
          // An exact catalog code drags its name along; anything else is free text.
          if (typeof onChange === "function") onChange({ code: v, name: hit ? hit.description : name });
        }}
        onFocus={() => {
          box.setOpen(true);
          box.setSel(0);
        }}
        onKeyDown={box.keyDown}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontWeight: 800,
          letterSpacing: ".3px",
          ...style,
          ...(code && !known ? { borderColor: "#f59e0b" } : null),
        }}
      />
      <Suggest
        open={box.open}
        loading={loading}
        results={matches}
        sel={box.sel}
        onPick={(it) => {
          commit(it);
          box.setOpen(false);
        }}
        accent={accent}
      />
    </div>
  );
}

/**
 * اسم المنتج — Product name box, searchable by name OR code.
 * Picking a suggestion fills the code; typing an exact catalog name fills it too.
 */
export function ItemNameInput({
  code = "",
  name = "",
  onChange,
  style,
  className,
  placeholder = "Product name",
  disabled = false,
  accent = "#2563eb",
  readOnly = false,
  title,
}) {
  const { items, loading, byName } = useCatalogIndex();

  const matches = useMemo(() => {
    const qn = normalizeName(stripCodePrefix(name));
    const qc = normalizeCode(name);
    if (!qn) return items.slice(0, MAX_RESULTS);
    return items
      .filter(
        (it) =>
          normalizeName(it.description).includes(qn) ||
          (qc && normalizeCode(it.item_code).includes(qc))
      )
      .slice(0, MAX_RESULTS);
  }, [items, name]);

  const commit = (it) => {
    if (typeof onChange === "function") onChange({ code: it.item_code || "", name: it.description || "" });
  };
  const box = useSuggestBox({ matches, onCommit: commit });

  return (
    <div ref={box.boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        className={className}
        disabled={disabled}
        readOnly={readOnly}
        value={name}
        placeholder={placeholder}
        title={title || (code ? `Item code: ${code}` : "Pick from the product catalog to bind an item code")}
        onChange={(e) => {
          if (readOnly) return;
          const v = e.target.value;
          box.setOpen(true);
          box.setSel(0);
          // A pasted "[22160] BONES - KG" still resolves: the prefix is peeled
          // off for the lookup, and the catalog's own spelling is stored.
          const hit = byName.get(normalizeName(stripCodePrefix(v)));
          if (typeof onChange === "function") {
            onChange(hit ? { code: hit.item_code, name: hit.description } : { code, name: v });
          }
        }}
        onFocus={() => {
          if (readOnly) return;
          box.setOpen(true);
          box.setSel(0);
        }}
        onKeyDown={box.keyDown}
        style={{ width: "100%", boxSizing: "border-box", ...style }}
      />
      <Suggest
        open={box.open && !readOnly}
        loading={loading}
        results={matches}
        sel={box.sel}
        onPick={(it) => {
          commit(it);
          box.setOpen(false);
        }}
        accent={accent}
      />
    </div>
  );
}

export default ItemNameInput;
