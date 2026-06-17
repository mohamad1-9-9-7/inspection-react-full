// src/pages/monitor/branches/_shared/ProductPicker.jsx
//
// Shared product catalog + searchable dropdown.
// Source of products is the SAME as the Returns register:
//   - /public/data/items.json   (array of { item_code, description })
//   - localStorage "returns_custom_items_v1" (custom items added via Returns)
//
// The picker only lets the user SELECT an existing catalog item — free text
// that does not match a catalog entry is discarded on blur. This guarantees
// the product name always comes from the shared catalog.

import React, { useEffect, useMemo, useRef, useState } from "react";

export const CUSTOM_ITEMS_KEY = "returns_custom_items_v1";
// Fired when the editable catalog layer changes, so open dropdowns refresh live.
export const CATALOG_EVENT = "product_catalog_changed";
export const PRODUCT_CATALOG_SCOPE = "returns_items";

const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
let apiFromVite;
try {
  apiFromVite =
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL);
} catch {
  apiFromVite = undefined;
}
const apiFromCRA = typeof process !== "undefined" ? process.env?.REACT_APP_API_URL : undefined;
const API_BASE = String(apiFromVite || apiFromCRA || API_ROOT_DEFAULT).replace(/\/$/, "");

/* Normalize for matching (same rules as Returns) */
export function normalizeCode(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_()/\\]/g, "");
}

/* ===== Editable custom-catalog layer (localStorage) ===== */
export function loadCustomItems() {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_KEY);
    const j = raw ? JSON.parse(raw) : [];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function saveCustomItems(arr) {
  const list = Array.isArray(arr) ? arr : [];
  try { localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(CATALOG_EVENT)); } catch { /* ignore */ }
}

/* ===== Base catalog loader (/public/data/items.json) ===== */
export async function fetchBaseItems() {
  const tryUrl = async (url) => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) return j;
      }
    } catch {
      /* ignore */
    }
    return null;
  };
  let base = await tryUrl("/data/items.json");
  if (!base) {
    const pub = ((typeof process !== "undefined" && process.env?.PUBLIC_URL) || "").replace(/\/$/, "");
    base = await tryUrl(`${pub}/data/items.json`);
  }
  return base || [];
}

function normalizeCatalogItem(it) {
  const code = String(it?.item_code ?? it?.itemCode ?? it?.code ?? "").trim();
  const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
  if (!code || !name) return null;
  return { item_code: code, description: name };
}

export async function fetchServerItems() {
  try {
    const url = `${API_BASE}/api/catalog/products?scope=${encodeURIComponent(PRODUCT_CATALOG_SCOPE)}&limit=10000`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : [];
    return list.map(normalizeCatalogItem).filter(Boolean);
  } catch {
    return null;
  }
}

export async function saveServerItem(item, oldCode = "") {
  const normalized = normalizeCatalogItem(item);
  if (!normalized) throw new Error("code & name required");

  const targetCode = String(oldCode || "").trim();
  const url = targetCode
    ? `${API_BASE}/api/catalog/products/${encodeURIComponent(targetCode)}`
    : `${API_BASE}/api/catalog/products`;

  const res = await fetch(url, {
    method: targetCode ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: PRODUCT_CATALOG_SCOPE,
      item: normalized,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message || json?.error || `Catalog save failed: ${res.status}`);
  }
  return normalizeCatalogItem(json?.item) || normalized;
}

export async function deleteServerItem(code) {
  const c = String(code || "").trim();
  if (!c) throw new Error("code required");
  const res = await fetch(
    `${API_BASE}/api/catalog/products/${encodeURIComponent(c)}?scope=${encodeURIComponent(PRODUCT_CATALOG_SCOPE)}`,
    { method: "DELETE" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message || json?.error || `Catalog delete failed: ${res.status}`);
  }
  return json;
}

/* ===== Shared catalog loader (items.json + custom items) ===== */
export function useProductCatalog() {
  const [itemsAll, setItemsAll] = useState([]);
  const [serverItems, setServerItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [base, server] = await Promise.all([fetchBaseItems(), fetchServerItems()]);
      if (!cancelled) {
        setItemsAll(base);
        if (Array.isArray(server)) setServerItems(server);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Custom layer: read on mount + refresh live when edited (same tab or other tabs)
  useEffect(() => {
    const read = () => setCustomItems(loadCustomItems());
    const refreshServer = async () => {
      const server = await fetchServerItems();
      if (Array.isArray(server)) setServerItems(server);
    };
    read();
    const onStorage = (e) => { if (!e || e.key === CUSTOM_ITEMS_KEY) read(); };
    const onCatalogChange = () => {
      read();
      refreshServer();
    };
    window.addEventListener(CATALOG_EVENT, onCatalogChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CATALOG_EVENT, onCatalogChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const allItems = useMemo(() => {
    const map = new Map();
    const norm = (it) => {
      const code = String(it?.item_code ?? it?.itemCode ?? "").trim();
      const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
      if (!name) return null;
      const key = normalizeCode(code) || normalizeCode(name);
      return key ? { key, item_code: code, description: name } : null;
    };
    // Base first (keep first occurrence), then custom entries override by code.
    (Array.isArray(itemsAll) ? itemsAll : []).forEach((it) => {
      const r = norm(it);
      if (r && !map.has(r.key)) map.set(r.key, { item_code: r.item_code, description: r.description });
    });
    (Array.isArray(customItems) ? customItems : []).forEach((it) => {
      const r = norm(it);
      if (r) map.set(r.key, { item_code: r.item_code, description: r.description });
    });
    (Array.isArray(serverItems) ? serverItems : []).forEach((it) => {
      const r = norm(it);
      if (r) map.set(r.key, { item_code: r.item_code, description: r.description });
    });
    return Array.from(map.values());
  }, [itemsAll, customItems, serverItems]);

  return { allItems, loading };
}

/* ===== Searchable, catalog-restricted product dropdown ===== */
export default function ProductPicker({
  value = "",
  itemCode = "",
  onPick,
  placeholder = "Search code or product…",
  disabled = false,
  accent = "#2563eb",
  inputStyle = {},
  maxResults = 30,
}) {
  const { allItems, loading } = useProductCatalog();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);

  const display = editing ? query : value || "";

  const results = useMemo(() => {
    if (!editing) return [];
    const qn = normalizeCode(query);
    const qLower = String(query).toLowerCase().trim();
    if (!qn && !qLower) return allItems.slice(0, maxResults);
    return allItems
      .filter((it) => {
        const c = normalizeCode(it.item_code);
        const n = String(it.description || "").toLowerCase();
        return (qn && c.includes(qn)) || (qLower && n.includes(qLower));
      })
      .slice(0, maxResults);
  }, [allItems, editing, query, maxResults]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commit = (it) => {
    if (typeof onPick === "function") {
      onPick({ item_code: it.item_code || "", description: it.description || "" });
    }
    setOpen(false);
    setEditing(false);
    setQuery("");
  };

  const baseInput = {
    width: "100%",
    padding: "7px 9px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 700,
    boxSizing: "border-box",
    ...inputStyle,
  };

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        disabled={disabled}
        value={display}
        placeholder={placeholder}
        title={itemCode ? `Item code: ${itemCode}` : undefined}
        onFocus={() => {
          setEditing(true);
          setQuery(value || "");
          setSel(0);
          setOpen(true);
        }}
        onChange={(e) => {
          setEditing(true);
          setQuery(e.target.value);
          setSel(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[sel]) commit(results[sel]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setEditing(false);
            setQuery("");
          }
        }}
        onBlur={() => {
          // Enforce list-only selection: discard typed text that was not picked.
          setTimeout(() => {
            setEditing(false);
            setQuery("");
            setOpen(false);
          }, 150);
        }}
        style={baseInput}
      />

      {open && editing && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 10px 24px rgba(15,23,42,.12)",
            zIndex: 80,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>Loading catalog…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>No match in catalog</div>
          ) : (
            results.map((it, k) => (
              <div
                key={`${it.item_code}-${k}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(it)}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                  background: k === sel ? "#eef2ff" : "transparent",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <span style={{ fontWeight: 800, color: accent, minWidth: 52 }}>{it.item_code || "—"}</span>
                <span style={{ color: "#334155", fontSize: ".9rem" }}>{it.description}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
