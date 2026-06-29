// src/pages/settings/ProductsTab.jsx
// Manage the product catalog that feeds the product dropdowns (temperature
// matching, Returns, …). Base products come from /public/data/items.json
// (read-only master file). Added/edited products live in the editable layer
// (localStorage "returns_custom_items_v1") and override the base by barcode/code.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchBaseItems,
  fetchServerItems,
  loadCustomItems,
  saveCustomItems,
  saveServerItem,
  deleteServerItem,
  normalizeCode,
} from "../monitor/branches/_shared/ProductPicker";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

const normKeyOf = (it) => normalizeCode(it?.item_code ?? it?.itemCode ?? "");

const MAX_ROWS = 400;

export default function ProductsTab() {
  const [base, setBase] = useState([]);
  const [custom, setCustom] = useState(() => loadCustomItems());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [serverOnline, setServerOnline] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", editingKey: null, oldCode: "", codeLocked: false });
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, server] = await Promise.all([fetchBaseItems(), fetchServerItems()]);
      if (!cancelled) {
        setBase(b);
        if (Array.isArray(server)) {
          const local = loadCustomItems();
          const mergedByCode = new Map();
          local.forEach((it) => {
            const key = normKeyOf(it);
            if (key) mergedByCode.set(key, it);
          });
          server.forEach((it) => {
            const key = normKeyOf(it);
            if (key) mergedByCode.set(key, it);
          });
          const merged = Array.from(mergedByCode.values());
          setCustom(merged);
          saveCustomItems(merged);
          setServerOnline(true);
        } else {
          setCustom(loadCustomItems());
          setServerOnline(false);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const commitCustom = useCallback(async (next, item, options = {}) => {
    setCustom(next);
    saveCustomItems(next); // localStorage fallback + broadcast -> dropdowns refresh live

    try {
      if (item) {
        const saved = await saveServerItem(item, options.oldCode || "");
        setServerOnline(true);
        setCustom((prev) => {
          const savedKey = normKeyOf(saved);
          const oldKey = normalizeCode(options.oldCode || "");
          const merged = [
            saved,
            ...prev.filter((it) => {
              const key = normKeyOf(it);
              return key !== savedKey && (!oldKey || key !== oldKey);
            }),
          ];
          saveCustomItems(merged);
          return merged;
        });
      } else if (options.deleteCode) {
        await deleteServerItem(options.deleteCode);
        setServerOnline(true);
      }
      return true;
    } catch {
      setServerOnline(false);
      setErr("Server sync failed. Change is saved on this device only.");
      return false;
    }
  }, []);

  const flash = (m) => { setMsg(m); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setMsg(""), 2600); };

  /* Merge base + custom (custom overrides base by code) and tag the source */
  const rows = useMemo(() => {
    const map = new Map();
    const norm = (it) => {
      const code = String(it?.item_code ?? it?.itemCode ?? "").trim();
      const name = String(it?.description ?? it?.productName ?? it?.name ?? "").trim();
      if (!name) return null;
      const key = normalizeCode(code) || normalizeCode(name);
      return key ? { key, code, name } : null;
    };
    base.forEach((it) => {
      const r = norm(it);
      if (r && !map.has(r.key)) map.set(r.key, { ...r, source: "base" });
    });
    custom.forEach((it) => {
      const r = norm(it);
      if (r) map.set(r.key, { ...r, source: map.has(r.key) ? "edited" : "custom" });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [base, custom]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const ns = normalizeCode(q);
    let list = rows;
    if (s || ns) {
      list = rows.filter((r) => (ns && normalizeCode(r.code).includes(ns)) || (s && r.name.toLowerCase().includes(s)));
    }
    return list;
  }, [rows, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    base: rows.filter((r) => r.source === "base").length,
    custom: rows.filter((r) => r.source !== "base").length,
  }), [rows]);

  /* ---- actions ---- */
  const startAdd = () => { setForm({ code: "", name: "", editingKey: null, oldCode: "", codeLocked: false }); setErr(""); };
  const startEdit = (row) => {
    setForm({ code: row.code, name: row.name, editingKey: row.key, oldCode: row.code, codeLocked: row.source !== "custom" });
    setErr("");
  };
  const resetForm = () => { setForm({ code: "", name: "", editingKey: null, oldCode: "", codeLocked: false }); setErr(""); };

  const upsert = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code) return setErr("Barcode / code is required.");
    if (!name) return setErr("Product name is required.");
    const key = normalizeCode(code);

    if (!form.editingKey) {
      // adding new
      if (rows.some((r) => r.key === key)) return setErr("This barcode already exists — use Edit instead.");
      const item = { item_code: code, description: name };
      const synced = await commitCustom([item, ...custom], item);
      resetForm();
      return flash(synced ? "✅ Product added." : "⚠️ Product saved locally only.");
    }

    // editing
    if (form.codeLocked || key === form.editingKey) {
      // override / update under the same code
      const item = { item_code: code, description: name };
      const idx = custom.findIndex((it) => normKeyOf(it) === key);
      const next = idx >= 0 ? custom.map((it, i) => (i === idx ? item : it)) : [item, ...custom];
      const synced = await commitCustom(next, item, { oldCode: form.oldCode || code });
      resetForm();
      return flash(synced ? "✅ Product updated." : "⚠️ Product saved locally only.");
    }

    // custom item re-keyed to a new barcode
    if (rows.some((r) => r.key === key)) return setErr("This barcode already exists — choose another.");
    const item = { item_code: code, description: name };
    const next = [item, ...custom.filter((it) => normKeyOf(it) !== form.editingKey)];
    const synced = await commitCustom(next, item, { oldCode: form.oldCode || form.editingKey });
    resetForm();
    return flash(synced ? "✅ Product updated." : "⚠️ Product saved locally only.");
  };

  const requestRemoveRow = (row) => {
    if (row.source === "base") return; // base master items can't be removed
    setConfirmRemove(row);
  };

  const removeRow = async () => {
    const row = confirmRemove;
    if (!row) return;
    const next = custom.filter((it) => normKeyOf(it) !== row.key);
    const synced = await commitCustom(next, null, { deleteCode: row.code });
    if (form.editingKey === row.key) resetForm();
    flash(synced ? (row.source === "edited" ? "✅ Reverted to master value." : "✅ Removed.") : "⚠️ Removed locally only.");
    setConfirmRemove(null);
  };

  /* ---- styles ---- */
  const card = ui.subtleCard;
  const label = ui.label;
  const input = ui.input;
  const ghost = { ...ui.input, width: "auto", cursor: "pointer" };
  const chip = (bg, color) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 999, background: bg, color, fontWeight: 800, fontSize: 11 });
  const th = ui.th;
  const td = ui.td;

  const sourceChip = (src) =>
    src === "base"
      ? <span style={chip("#eef2ff", "#3730a3")}>Master</span>
      : src === "edited"
        ? <span style={chip("#fef3c7", "#92400e")}>Edited</span>
        : <span style={chip("#dcfce7", "#065f46")}>Custom</span>;

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Catalog"
        title="Products Catalog"
        subtitle="These products feed every product dropdown. Add a barcode and name, or edit existing catalog entries."
        actions={
          <>
          <span style={chip("#eef2ff", "#3730a3")}>Total: {stats.total}</span>
          <span style={chip("#f1f5f9", "#334155")}>Master: {stats.base}</span>
          <span style={chip("#dcfce7", "#065f46")}>Added/Edited: {stats.custom}</span>
          <span style={chip(serverOnline ? "#dcfce7" : "#fee2e2", serverOnline ? "#065f46" : "#991b1b")}>
            {serverOnline ? "Server sync" : "Local fallback"}
          </span>
          </>
        }
      />

      {/* Add / Edit form */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <strong style={{ color: "#0f172a", fontSize: 15 }}>{form.editingKey ? "✏️ Edit product" : "➕ Add product"}</strong>
          {form.editingKey && <Button onClick={startAdd} tone="secondary">+ New instead</Button>}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ width: 200 }}>
            <span style={label}>Barcode / Code</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. 20060"
              style={{ ...input, background: form.codeLocked ? "#f1f5f9" : "#fff" }}
              disabled={form.codeLocked}
              title={form.codeLocked ? "Master barcodes can't be changed — only the name." : undefined}
            />
          </div>
          <div style={{ flex: "1 1 280px", minWidth: 240 }}>
            <span style={label}>Product Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. BRAZILIAN BEEF TOPSIDE - KG"
              style={input}
              onKeyDown={(e) => { if (e.key === "Enter") upsert(); }}
            />
          </div>
          <Button onClick={upsert} tone="primary">{form.editingKey ? "Save changes" : "Add product"}</Button>
          {form.editingKey && <Button onClick={resetForm} tone="secondary">Cancel</Button>}
        </div>
        {err && <div style={{ color: "#b91c1c", fontWeight: 800, marginTop: 10 }}>{err}</div>}
        {form.codeLocked && (
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
            This barcode comes from the master file — you can update its name (saved as an override). To use a different barcode, add a new product.
          </div>
        )}
      </div>

      {/* Search + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search by barcode or name…"
          style={{ ...input, maxWidth: 360 }}
        />
        {msg && <span style={{ color: "#065f46", fontWeight: 800 }}>{msg}</span>}
      </div>

      {/* Table */}
      <div style={ui.tableWrap}>
        <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
          <table style={ui.table}>
            <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <tr>
                <th style={{ ...th, width: 160 }}>Barcode</th>
                <th style={th}>Product Name</th>
                <th style={{ ...th, width: 110 }}>Source</th>
                <th style={{ ...th, width: 150, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#64748b", fontWeight: 700 }}>Loading catalog…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "#64748b", fontWeight: 700 }}>No products match your search.</td></tr>
              ) : (
                filtered.slice(0, MAX_ROWS).map((row) => (
                  <tr key={row.key}>
                    <td style={{ ...td, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>{row.code || "—"}</td>
                    <td style={{ ...td, color: "#334155" }}>{row.name}</td>
                    <td style={td}>{sourceChip(row.source)}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <Button onClick={() => startEdit(row)} tone="secondary" style={{ minHeight: 32, padding: "5px 12px", marginInlineEnd: 6 }}>Edit</Button>
                      {row.source !== "base" && (
                        <Button
                          onClick={() => requestRemoveRow(row)}
                          tone="danger"
                          style={{ minHeight: 32, padding: "5px 12px" }}
                          title={row.source === "edited" ? "Revert to master value" : "Remove product"}
                        >
                          {row.source === "edited" ? "Revert" : "Remove"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length > MAX_ROWS && (
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 8, fontWeight: 700 }}>
          Showing first {MAX_ROWS} of {filtered.length} — refine your search to narrow results.
        </div>
      )}

      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        Note: changes sync to the server and apply to the dropdowns immediately. If the server is unavailable, this device keeps a local fallback. Master products come from the bundled catalog file and can be renamed as an override, but not deleted.
      </div>

      <StatusMessage message={err ? { kind: "err", text: err } : null} />
      <ConfirmModal
        open={!!confirmRemove}
        title={confirmRemove?.source === "edited" ? "Revert catalog override?" : "Remove product?"}
        body={confirmRemove ? `${confirmRemove.name} (${confirmRemove.code})` : ""}
        confirmText={confirmRemove?.source === "edited" ? "Revert" : "Remove"}
        cancelText="Cancel"
        onConfirm={removeRow}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
