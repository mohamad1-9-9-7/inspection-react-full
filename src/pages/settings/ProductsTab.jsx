// src/pages/settings/ProductsTab.jsx
// Manage the product catalog that feeds the product dropdowns (temperature
// matching, Returns, …). Base products come from /public/data/items.json
// (read-only master file). Added/edited products live in the editable layer
// (localStorage "returns_custom_items_v1") and override the base by barcode/code.
//
// Code vs barcode: the CODE is our item code — one per product, unique. The
// BARCODES are the numbers printed on cartons/pieces; a product may have
// many, but a barcode belongs to ONE code only. They live in the company's
// barcode list (utils/barcodeMap — the same one the cooler scanner learns
// into), so a barcode added here is known on every phone at once.

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
import {
  addBarcode, barcodesByCode, fetchBarcodeMap, normBarcode, recodeBarcodes, removeBarcode, replaceBarcode, setCodeBarcodes, showBarcode,
} from "../../utils/barcodeMap";
import { getCurrentUser } from "../../utils/perms";
import useWedgeScanner from "../../utils/useWedgeScanner";
import { useShelfLife } from "../monitor/branches/_shared/shelfLife";
import ShelfLifeModal from "../monitor/branches/_shared/ShelfLifeModal";
import { resolveShelfLife } from "../monitor/branches/_shared/shelfLife";
import ProductFormModal from "./ProductFormModal";
import { fetchProductMedia, imagesOf, setProductImages } from "../../utils/productMedia";
import { deleteImage, thumbUrl } from "../../utils/imageUpload";

const SHELF_SRC = { code: "Product", category: "Category", default: "Default" };

const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};


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
  // the ➕ / ✏️ product window: null = closed; { row } = edit that row, { row: null, initial } = add
  const [pf, setPf] = useState(null);
  const [media, setMedia] = useState({});
  useEffect(() => { fetchProductMedia().then((m) => setMedia(m || {})); }, []);
  const [confirmRemove, setConfirmRemove] = useState(null);
  // barcodes: the company list, the product whose barcodes are open, the editor's state
  const [bcMap, setBcMap] = useState({});
  const [bcOpen, setBcOpen] = useState(null); // row.key
  const [bcNew, setBcNew] = useState("");
  const [bcEdit, setBcEdit] = useState(null); // { key, value }
  const [bcErr, setBcErr] = useState(null); // { text, retry? }
  const [bcBusy, setBcBusy] = useState(false);

  // smart tools: category / barcode / source filters + sort
  const [fCat, setFCat] = useState("*");
  const [fBc, setFBc] = useState("*"); // * | with | without | many
  const [fSrc, setFSrc] = useState("*"); // * | base | mine
  const [sort, setSort] = useState("name"); // name | code | bc | cat
  const [scanHit, setScanHit] = useState(null); // { barcode, code?, name? } — the last handheld scan
  // shelf life: the same record the Raw Material Receipt calculates expiry from (shelf_life_config)
  const shelf = useShelfLife();
  const [shelfOpen, setShelfOpen] = useState(false);
  const [slEdit, setSlEdit] = useState(null); // { key, value }
  const [slBusy, setSlBusy] = useState(false);
  const shelfOf = useCallback((r) => shelf.resolve({ code: r.code, name: r.name }), [shelf]);

  useEffect(() => { fetchBarcodeMap().then((m) => setBcMap(m || {})); }, []);
  const byCode = useMemo(() => barcodesByCode(bcMap), [bcMap]);
  const barcodesOf = (row) => (row?.code ? byCode[String(row.code).trim()] || [] : []);

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
      const category = String(it?.category || "").trim();
      const uom = String(it?.uom || "").trim();
      return key ? { key, code, name, category, uom } : null;
    };
    base.forEach((it) => {
      const r = norm(it);
      if (r && !map.has(r.key)) map.set(r.key, { ...r, source: "base" });
    });
    custom.forEach((it) => {
      const r = norm(it);
      if (!r) return;
      const was = map.get(r.key);
      // an override keeps the master's category / unit unless it has its own
      map.set(r.key, {
        ...r,
        category: r.category || was?.category || "",
        uom: r.uom || was?.uom || "",
        source: was ? "edited" : "custom",
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [base, custom]);

  const categories = useMemo(() => {
    const c = {};
    rows.forEach((r) => { const k = r.category || ""; c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => (a[0] || "~").localeCompare(b[0] || "~"));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const ns = normalizeCode(q);
    const bq = q.replace(/\s+/g, "").toUpperCase();
    const nbc = (r) => (byCode[String(r.code).trim()] || []).length;
    let list = rows;
    if (s || ns) {
      list = list.filter((r) => (ns && normalizeCode(r.code).includes(ns)) || (s && r.name.toLowerCase().includes(s))
        || (s && r.category.toLowerCase().includes(s))
        || (bq.length >= 4 && (byCode[String(r.code).trim()] || []).some((b) => b.includes(bq))));
    }
    if (fCat !== "*") list = list.filter((r) => (r.category || "") === fCat);
    if (fBc === "with") list = list.filter((r) => nbc(r) > 0);
    if (fBc === "without") list = list.filter((r) => nbc(r) === 0);
    if (fBc === "many") list = list.filter((r) => nbc(r) > 1);
    if (fSrc === "base") list = list.filter((r) => r.source === "base");
    if (fSrc === "mine") list = list.filter((r) => r.source !== "base");
    if (sort === "code") {
      list = [...list].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    } else if (sort === "bc") {
      list = [...list].sort((a, b) => nbc(b) - nbc(a) || a.name.localeCompare(b.name));
    } else if (sort === "shelf") {
      const d = (r) => { const x = shelfOf(r); return x && x.days > 0 ? x.days : Infinity; };
      list = [...list].sort((a, b) => d(a) - d(b) || a.name.localeCompare(b.name));
    } else if (sort === "cat") {
      list = [...list].sort((a, b) => (a.category || "~").localeCompare(b.category || "~") || a.name.localeCompare(b.name));
    }
    return list;
  }, [rows, q, byCode, fCat, fBc, fSrc, sort, shelfOf]);

  const filtersOn = fCat !== "*" || fBc !== "*" || fSrc !== "*" || sort !== "name" || !!q.trim();
  const clearFilters = () => { setQ(""); setFCat("*"); setFBc("*"); setFSrc("*"); setSort("name"); };

  /* Excel-friendly CSV of what is on screen (all matching rows, not only the first 400) */
  const exportCsv = () => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Code", "Product Name", "Category", "UOM", "Barcodes", "Barcode count", "Shelf life (days)", "Shelf life from", "Source"].map(cell).join(",")];
    filtered.forEach((r) => {
      const bcs = (byCode[String(r.code).trim()] || []).map(showBarcode);
      // ="…" keeps long barcodes as text in Excel (no 6.29E+12)
      lines.push([
        cell(r.code), cell(r.name), cell(r.category), cell(r.uom),
        bcs.length ? `"=""${bcs.join(" | ")}"""` : cell(""), cell(bcs.length),
        cell(shelfOf(r)?.days > 0 ? shelfOf(r).days : ""), cell(shelfOf(r)?.days > 0 ? SHELF_SRC[shelfOf(r).source] : ""),
        cell(r.source === "base" ? "Master" : r.source === "edited" ? "Edited" : "Custom"),
      ].join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const stats = useMemo(() => ({
    total: rows.length,
    withBc: rows.filter((r) => (byCode[String(r.code).trim()] || []).length > 0).length,
    barcodes: Object.keys(bcMap).length,
    base: rows.filter((r) => r.source === "base").length,
    custom: rows.filter((r) => r.source !== "base").length,
  }), [rows]);

  /* ---- actions: the product window ---- */
  const ownShelf = (code) => shelf.config.rules.find((x) => x.scope === "code" && normalizeCode(x.match) === normalizeCode(code));
  const openAdd = (initial = {}) => { setErr(""); setPf({ row: null, initial: { barcodes: [], ...initial } }); };
  const startEdit = (row) => {
    setErr("");
    const own = ownShelf(row.code);
    setPf({
      row,
      initial: {
        code: row.code, name: row.name,
        barcodes: barcodesOf(row).map(showBarcode),
        shelfDays: own ? own.days : "",
        images: imagesOf(media, row.code),
      },
    });
  };
  // what the product gets with no days of its own (category rule / default)
  const shelfHint = useMemo(() => {
    if (!pf) return "";
    const code = pf.row?.code || "";
    const cfg = { ...shelf.config, rules: shelf.config.rules.filter((x) => !(x.scope === "code" && normalizeCode(x.match) === normalizeCode(code))) };
    const sl = resolveShelfLife(cfg, shelf.catalog, { code, name: pf.row?.name || "" });
    if (!sl) return "";
    return sl.source === "category" ? `${sl.days} days from category ${sl.label}` : `default ${sl.days} days`;
  }, [pf, shelf.config, shelf.catalog]);

  /* One Save: barcodes first (a barcode on another product stops it before
     anything changes), then the product, its shelf life and its photos. */
  const saveProduct = async (data, { move }) => {
    const { code, name } = data;
    const key = normalizeCode(code);
    const editing = pf?.row || null;
    const codeLocked = editing ? editing.source !== "custom" : false;
    if (!editing && rows.some((x) => x.key === key)) throw new Error("This code already exists — use Edit on that product instead.");
    if (editing && key !== editing.key && rows.some((x) => x.key === key)) throw new Error("This code already exists — choose another.");
    const oldCode = editing?.code || "";
    const user = userName();
    const warn = [];

    // 1) barcodes — may throw err.conflicts back to the window
    const hadBc = editing ? barcodesOf(editing).join("|") : "";
    const wantBc = data.barcodes.map(normBarcode).join("|");
    if (wantBc !== hadBc || (editing && code !== oldCode)) {
      setBcMap(await setCodeBarcodes(oldCode || code, { code, product: name }, data.barcodes, user, { move }));
    }

    // 2) the product (skipped when only barcodes / shelf life / photos changed)
    let synced = true;
    if (!editing || name !== editing.name || code !== oldCode) {
      const item = { item_code: code, description: name };
      let next;
      if (!editing) next = [item, ...custom];
      else if (codeLocked || key === editing.key) {
        const idx = custom.findIndex((it) => normKeyOf(it) === key);
        next = idx >= 0 ? custom.map((it, i) => (i === idx ? item : it)) : [item, ...custom];
      } else next = [item, ...custom.filter((it) => normKeyOf(it) !== editing.key)];
      synced = await commitCustom(next, item, editing ? { oldCode: oldCode || code } : {});
      setErr("");
    }

    // 3) shelf life — the product's own days (empty = category / default)
    const had = editing ? ownShelf(oldCode) : null;
    const days = data.shelfDays === "" ? null : Number(data.shelfDays);
    if ((had ? had.days : null) !== days || (had && code !== oldCode)) {
      const keep = shelf.config.rules.filter((x) => !(x.scope === "code" && [normalizeCode(oldCode), key].includes(normalizeCode(x.match))));
      const rules = days === null ? keep : [...keep, { scope: "code", match: code, days, note: name }];
      try { await shelf.save({ ...shelf.config, rules }, user); } catch { warn.push("shelf life"); }
    }

    // 4) photos
    const hadImg = editing ? imagesOf(media, oldCode) : [];
    if (hadImg.join("|") !== data.images.join("|") || (editing && code !== oldCode && hadImg.length)) {
      try { setMedia(await setProductImages(code, data.images, user, oldCode)); } catch { warn.push("photos"); }
    }

    flash(warn.length ? `⚠️ Saved, but not the ${warn.join(" and ")} — open it again and retry.`
      : !synced ? "⚠️ Product saved on this device only."
      : editing ? "✅ Product updated." : "✅ Product added.");
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
    // a removed product takes its barcodes with it (a revert keeps them — the master product stays)
    if (row.source === "custom" && barcodesOf(row).length) {
      try { setBcMap(await recodeBarcodes(row.code, null, userName())); } catch { /* the list keeps them; remove from Barcodes */ }
    }
    // and its photos (the master product of a revert keeps them)
    if (row.source === "custom" && imagesOf(media, row.code).length) {
      const imgs = imagesOf(media, row.code);
      try { setMedia(await setProductImages(row.code, [], userName())); imgs.forEach((u) => deleteImage(u).catch(() => {})); } catch { /* kept */ }
    }
    flash(synced ? (row.source === "edited" ? "✅ Reverted to master value." : "✅ Removed.") : "⚠️ Removed locally only.");
    setConfirmRemove(null);
  };

  /* ---- barcodes of one product ---- */
  const openBarcodes = (row) => {
    const opening = bcOpen !== row.key;
    setBcOpen(opening ? row.key : null);
    // a scanned barcode that belongs to nobody waits here to be added
    setBcNew(opening && scanHit && !scanHit.code ? showBarcode(scanHit.barcode) : "");
    setBcEdit(null); setBcErr(null);
  };

  /* 🔫 Handheld reader anywhere on the page: a known barcode jumps to its
     product (barcodes open); an unknown one waits to be added. The barcode
     boxes themselves (data-scan-input) just take the scan as typing. */
  useWedgeScanner((text) => {
    if (document.activeElement?.closest?.("[data-scan-input]")) return false;
    const key = normBarcode(text);
    if (!key) return false;
    const owner = bcMap[key];
    const row = owner?.code ? rows.find((r) => String(r.code).trim() === String(owner.code).trim()) : null;
    // after the reader's keys are taken back out of the search box (its own onChange would win otherwise)
    setTimeout(() => {
      setFCat("*"); setFBc("*"); setFSrc("*");
      if (row) {
        setQ(showBarcode(key));
        setBcOpen(row.key); setBcNew(""); setBcEdit(null); setBcErr(null);
        setScanHit({ barcode: key, code: row.code, name: row.name });
      } else {
        setQ("");
        setBcOpen(null);
        setScanHit({ barcode: key, code: owner?.code || "", name: owner?.product || "" });
      }
    }, 0);
    return true;
  }, !loading && !pf && !shelfOpen);
  // fn(move) saves; a barcode on another code comes back as a conflict with a "move it here" retry
  const bcRun = async (fn, done) => {
    setBcBusy(true); setBcErr(null);
    try {
      setBcMap(await fn(false));
      if (done) done();
    } catch (e) {
      setBcErr(e?.conflict
        ? { text: `${e.message} One barcode can belong to one code only.`, retry: () => bcRun(() => fn(true), done) }
        : { text: e?.message || "Save failed — check the connection." });
    } finally {
      setBcBusy(false);
    }
  };
  const bcAdd = (row) => {
    const key = normBarcode(bcNew);
    if (!key) return setBcErr({ text: "Type or scan a barcode." });
    if (barcodesOf(row).includes(key)) return setBcErr({ text: "This product already has that barcode." });
    const item = { code: row.code, product: row.name };
    return bcRun((move) => addBarcode(key, item, userName(), { move }), () => setBcNew(""));
  };
  const bcSaveEdit = (row) => {
    if (!bcEdit) return null;
    const key = normBarcode(bcEdit.value);
    if (!key) return setBcErr({ text: "Type or scan a barcode." });
    if (key === bcEdit.key) { setBcEdit(null); return null; }
    if (barcodesOf(row).includes(key)) return setBcErr({ text: "This product already has that barcode." });
    const item = { code: row.code, product: row.name };
    const old = bcEdit.key;
    return bcRun((move) => replaceBarcode(old, key, item, userName(), { move }), () => setBcEdit(null));
  };
  const bcRemove = (key) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remove barcode ${showBarcode(key)} from this product?`)) return;
    bcRun(() => removeBarcode(key, userName()));
  };

  /* ---- shelf life of one product: its own number of days, or back to category / default ---- */
  const slRule = (row) => shelf.config.rules.find((x) => x.scope === "code" && normalizeCode(x.match) === normalizeCode(row.code));
  const slSave = async (row, raw) => {
    const txt = String(raw ?? "").trim();
    const days = txt === "" ? null : Math.round(Number(txt));
    if (days !== null && (!Number.isFinite(days) || days < 0 || days > 3650)) return setErr("Shelf life: 0 – 3650 days (0 = no automatic expiry).");
    const others = shelf.config.rules.filter((x) => !(x.scope === "code" && normalizeCode(x.match) === normalizeCode(row.code)));
    const rules = days === null ? others : [...others, { scope: "code", match: row.code, days, note: row.name }];
    setSlBusy(true); setErr("");
    try {
      await shelf.save({ ...shelf.config, rules }, userName());
      setSlEdit(null);
      flash(days === null ? "✅ Shelf life back to the category / default." : `✅ Shelf life ${days} days saved.`);
    } catch {
      setErr("Shelf life was not saved — check the connection.");
    } finally {
      setSlBusy(false);
    }
    return null;
  };
  const shelfCell = (row) => {
    if (!row.code) return <span style={{ color: "#94a3b8" }}>—</span>;
    if (slEdit?.key === row.key) {
      return (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            autoFocus
            type="number"
            min={0}
            max={3650}
            value={slEdit.value}
            onChange={(e) => setSlEdit({ key: row.key, value: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") slSave(row, slEdit.value); if (e.key === "Escape") setSlEdit(null); }}
            placeholder="days"
            style={{ ...input, width: 70, padding: "4px 6px", minHeight: 30 }}
          />
          <Button onClick={() => slSave(row, slEdit.value)} tone="primary" disabled={slBusy} style={{ minHeight: 30, padding: "4px 8px" }}>✓</Button>
          {slRule(row) && (
            <Button onClick={() => slSave(row, "")} tone="secondary" disabled={slBusy} style={{ minHeight: 30, padding: "4px 8px" }}
              title="Remove this product's own number — use the category / default">↺</Button>
          )}
          <Button onClick={() => setSlEdit(null)} tone="secondary" disabled={slBusy} style={{ minHeight: 30, padding: "4px 8px" }}>✕</Button>
        </div>
      );
    }
    const sl = shelfOf(row);
    const own = sl?.source === "code";
    return (
      <button
        type="button"
        onClick={() => setSlEdit({ key: row.key, value: own ? String(sl.days) : "" })}
        title={sl ? `From: ${SHELF_SRC[sl.source]}${sl.source === "category" ? ` (${sl.label})` : ""} — click to set this product's own days` : "No shelf life — click to set one"}
        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "start", fontFamily: "inherit" }}
      >
        {!sl ? (
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>— set</span>
        ) : sl.days === 0 ? (
          <span style={chip("#fee2e2", "#991b1b")}>Off (0 d)</span>
        ) : (
          <>
            <span style={{ fontWeight: 900, color: "#0f172a" }}>{sl.days} d</span>{" "}
            <span style={chip(own ? "#ede9fe" : "#f1f5f9", own ? "#5b21b6" : "#64748b")}>{SHELF_SRC[sl.source]}</span>
          </>
        )}
      </button>
    );
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
        subtitle="These products feed every product dropdown. Each product has one code and can carry several barcodes."
        actions={
          <>
          <span style={chip("#eef2ff", "#3730a3")}>Total: {stats.total}</span>
          <span style={chip("#f1f5f9", "#334155")}>Master: {stats.base}</span>
          <span style={chip("#dcfce7", "#065f46")}>Added/Edited: {stats.custom}</span>
          <span style={chip("#e0f2fe", "#075985")}>With barcode: {stats.withBc}/{stats.total}</span>
          <span style={chip("#f1f5f9", "#334155")}>Barcodes: {stats.barcodes}</span>
          <button type="button" onClick={() => setShelfOpen(true)} style={{ ...chip("#ede9fe", "#5b21b6"), border: 0, cursor: "pointer" }}
            title="Open the shelf-life list used by the Raw Material Receipt">
            ⏳ Shelf life{shelf.config.defaultDays > 0 ? ` · default ${shelf.config.defaultDays} d` : ""}
          </button>
          <span style={chip(serverOnline ? "#dcfce7" : "#fee2e2", serverOnline ? "#065f46" : "#991b1b")}>
            {serverOnline ? "Server sync" : "Local fallback"}
          </span>
          </>
        }
      />

      {/* Handheld scan result */}
      {scanHit && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10, padding: "10px 12px",
          borderRadius: 10, border: `1px solid ${scanHit.code ? "#bbf7d0" : "#fde68a"}`,
          background: scanHit.code ? "#f0fdf4" : "#fffbeb", fontWeight: 700, color: "#0f172a",
        }}>
          <span style={{ fontFamily: "monospace", fontWeight: 900 }}>🔫 {showBarcode(scanHit.barcode)}</span>
          {scanHit.code && rows.some((r) => String(r.code).trim() === String(scanHit.code).trim()) ? (
            <span>→ {scanHit.code} · {scanHit.name}</span>
          ) : scanHit.code ? (
            <span>is linked to code {scanHit.code}, which is not in this catalog — add that product, or move the barcode to another one.</span>
          ) : (
            <>
              <span>is not on any product yet. Open a product's barcodes (➕) and it is filled in — or start a new product with it.</span>
              <Button
                onClick={() => openAdd({ barcodes: [showBarcode(scanHit.barcode)] })}
                tone="secondary"
                style={{ minHeight: 30, padding: "4px 12px" }}
              >
                ➕ New product with it
              </Button>
            </>
          )}
          <button type="button" onClick={() => setScanHit(null)} style={{ ...ghost, minHeight: 28, padding: "2px 10px", marginInlineStart: "auto" }}>✕</button>
        </div>
      )}

      {/* Search + smart filters + sort */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => openAdd()}
          title="Add product"
          aria-label="Add product"
          style={{
            width: 44, height: 44, borderRadius: 14, border: 0, cursor: "pointer", flexShrink: 0,
            background: "linear-gradient(135deg,#0ea5e9,#0d9488)", color: "#fff", fontSize: 22, fontWeight: 900,
            boxShadow: "0 8px 18px rgba(14,165,233,.35)", display: "grid", placeItems: "center",
          }}
        >
          ➕
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search by code, barcode, name or category…"
          style={{ ...input, flex: "1 1 240px", maxWidth: 340 }}
        />
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} style={{ ...ghost, maxWidth: 220 }} title="Category">
          <option value="*">All categories</option>
          {categories.map(([c, n]) => <option key={c || "-"} value={c}>{c || "(no category)"} · {n}</option>)}
        </select>
        <select value={fBc} onChange={(e) => setFBc(e.target.value)} style={ghost} title="Barcodes">
          <option value="*">Any barcodes</option>
          <option value="with">With barcode</option>
          <option value="without">No barcode yet</option>
          <option value="many">2+ barcodes</option>
        </select>
        <select value={fSrc} onChange={(e) => setFSrc(e.target.value)} style={ghost} title="Source">
          <option value="*">Master + added</option>
          <option value="base">Master only</option>
          <option value="mine">Added / edited only</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={ghost} title="Sort">
          <option value="name">Sort: name A→Z</option>
          <option value="code">Sort: code</option>
          <option value="cat">Sort: category</option>
          <option value="bc">Sort: most barcodes</option>
          <option value="shelf">Sort: shortest shelf life</option>
        </select>
        {filtersOn && <Button onClick={clearFilters} tone="secondary" style={{ minHeight: 34, padding: "5px 12px" }}>✕ Clear</Button>}
        <Button onClick={exportCsv} tone="secondary" disabled={!filtered.length} style={{ minHeight: 34, padding: "5px 12px" }} title="Download what is shown as a CSV file (opens in Excel)">
          ⬇ Export ({filtered.length})
        </Button>
        {msg && <span style={{ color: "#065f46", fontWeight: 800 }}>{msg}</span>}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
        Showing {Math.min(filtered.length, MAX_ROWS)} of {filtered.length} matching · 🔫 a handheld barcode reader works anywhere on this page — scan a carton to find its product.
      </div>

      {/* Table */}
      <div style={ui.tableWrap}>
        <div style={{ maxHeight: "max(52vh, calc(100vh - 300px))", overflowY: "auto" }}>
          <table style={{ ...ui.table, minWidth: 900 }}>
            <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <tr>
                <th style={{ ...th, width: 120 }}>Code</th>
                <th style={th}>Product Name</th>
                <th style={{ ...th, width: 210 }}>Barcodes</th>
                <th style={{ ...th, width: 150 }}>Shelf life</th>
                <th style={{ ...th, width: 110 }}>Source</th>
                <th style={{ ...th, width: 150, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#64748b", fontWeight: 700 }}>Loading catalog…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "#64748b", fontWeight: 700 }}>No products match your search.</td></tr>
              ) : (
                filtered.slice(0, MAX_ROWS).map((row) => {
                  const bcs = barcodesOf(row);
                  const open = bcOpen === row.key;
                  return (
                  <React.Fragment key={row.key}>
                  <tr>
                    <td style={{ ...td, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>{row.code || "—"}</td>
                    <td style={{ ...td, color: "#334155" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {imagesOf(media, row.code)[0] && (
                        <img src={thumbUrl(imagesOf(media, row.code)[0], 80)} alt="" onClick={() => startEdit(row)}
                          style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0", cursor: "pointer", flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                      <div>{row.name}</div>
                      {(row.category || row.uom) && (
                        <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                          {row.category && (
                            <button type="button" onClick={() => setFCat(row.category)} title="Show this category only"
                              style={{ ...chip("#f5f3ff", "#5b21b6"), border: 0, cursor: "pointer" }}>{row.category}</button>
                          )}
                          {row.uom && <span style={chip("#f1f5f9", "#475569")}>{row.uom}</span>}
                        </div>
                      )}
                      </div>
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        {bcs.slice(0, 2).map((b) => (
                          <span key={b} style={{ ...chip("#f1f5f9", "#0f172a"), fontFamily: "monospace" }}>{showBarcode(b)}</span>
                        ))}
                        {bcs.length > 2 && <span style={chip("#e0f2fe", "#075985")}>+{bcs.length - 2}</span>}
                        <button
                          type="button"
                          onClick={() => openBarcodes(row)}
                          disabled={!row.code}
                          title={row.code ? "Add, edit or remove barcodes" : "Give the product a code first"}
                          style={{ ...ghost, minHeight: 28, padding: "2px 10px", fontSize: 12, fontWeight: 800, background: open ? "#dbeafe" : "#fff" }}
                        >
                          {open ? "▲ Close" : bcs.length ? "✏️ Barcodes" : "➕ Barcode"}
                        </button>
                      </div>
                    </td>
                    <td style={td}>{shelfCell(row)}</td>
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
                  {open && (
                    <tr>
                      <td colSpan={6} style={{ ...td, background: "#f8fbff" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                          Barcodes of {row.code} · {row.name}
                          <span style={{ color: "#64748b", fontWeight: 600, fontSize: 12, marginInlineStart: 8 }}>
                            A product can have many barcodes; each barcode belongs to this one code only.
                          </span>
                        </div>
                        {bcs.length === 0 && <div style={{ color: "#64748b", marginBottom: 8 }}>No barcode yet.</div>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                          {bcs.map((b) => (
                            <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {bcEdit?.key === b ? (
                                <>
                                  <input
                                    autoFocus
                                    data-scan-input=""
                                    value={bcEdit.value}
                                    onChange={(e) => setBcEdit({ key: b, value: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === "Enter") bcSaveEdit(row); if (e.key === "Escape") setBcEdit(null); }}
                                    style={{ ...input, width: 220, fontFamily: "monospace" }}
                                  />
                                  <Button onClick={() => bcSaveEdit(row)} tone="primary" disabled={bcBusy} style={{ minHeight: 30, padding: "4px 12px" }}>Save</Button>
                                  <Button onClick={() => setBcEdit(null)} tone="secondary" disabled={bcBusy} style={{ minHeight: 30, padding: "4px 12px" }}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontFamily: "monospace", fontWeight: 800, minWidth: 160 }}>{showBarcode(b)}</span>
                                  {bcMap[b]?.by ? <span style={{ color: "#94a3b8", fontSize: 11 }}>{bcMap[b].by}</span> : null}
                                  <Button onClick={() => { setBcEdit({ key: b, value: showBarcode(b) }); setBcErr(null); }} tone="secondary" disabled={bcBusy} style={{ minHeight: 30, padding: "4px 12px" }}>Edit</Button>
                                  <Button onClick={() => bcRemove(b)} tone="danger" disabled={bcBusy} style={{ minHeight: 30, padding: "4px 12px" }}>Remove</Button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            data-scan-input=""
                            value={bcNew}
                            onChange={(e) => setBcNew(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") bcAdd(row); }}
                            placeholder="Scan or type a new barcode"
                            style={{ ...input, width: 240, fontFamily: "monospace" }}
                            autoFocus={!bcEdit}
                          />
                          <Button onClick={() => bcAdd(row)} tone="primary" disabled={bcBusy}>{bcBusy ? "Saving…" : "Add barcode"}</Button>
                        </div>
                        {bcErr && (
                          <div style={{ color: "#b91c1c", fontWeight: 800, marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <span>{bcErr.text}</span>
                            {bcErr.retry && (
                              <Button onClick={bcErr.retry} tone="danger" disabled={bcBusy} style={{ minHeight: 30, padding: "4px 12px" }}>
                                Move it to {row.code}
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })
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
      <ProductFormModal
        open={!!pf}
        mode={pf?.row ? "edit" : "add"}
        initial={pf?.initial}
        codeLocked={!!pf?.row && pf.row.source !== "custom"}
        shelfHint={shelfHint}
        onSave={saveProduct}
        onClose={() => setPf(null)}
      />
      <ShelfLifeModal
        open={shelfOpen}
        config={shelf.config}
        onSave={(next, user) => shelf.save(next, user || userName())}
        onClose={() => setShelfOpen(false)}
        user={userName()}
      />
      <ConfirmModal
        open={!!confirmRemove}
        title={confirmRemove?.source === "edited" ? "Revert catalog override?" : "Remove product?"}
        body={confirmRemove
          ? `${confirmRemove.name} (${confirmRemove.code})${confirmRemove.source === "custom" && barcodesOf(confirmRemove).length ? ` — its ${barcodesOf(confirmRemove).length} barcode(s) are removed too.` : ""}`
          : ""}
        confirmText={confirmRemove?.source === "edited" ? "Revert" : "Remove"}
        cancelText="Cancel"
        onConfirm={removeRow}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
