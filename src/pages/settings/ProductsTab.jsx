// src/pages/settings/ProductsTab.jsx
// Manage the product catalog that feeds the product dropdowns (temperature
// matching, Returns, …). Base products come from /public/data/items.json
// (read-only master file). Added/edited products live in the editable layer
// (localStorage "returns_custom_items_v1") and override the base by code.
//
// Code vs barcode: the CODE is our item code — one per product, unique. The
// BARCODES are the numbers printed on cartons/pieces; a product may have
// many, but a barcode belongs to ONE code only. They live in the company's
// barcode list (utils/barcodeMap — the same one the cooler scanner learns
// into), so a barcode added here is known on every phone at once.
//
// Everything about one product (name, code, barcodes, shelf life, photos) is
// edited in ONE window — ProductFormModal; the list only shows and finds.
//
// Styling: globals.css forces `#root * { font-size: … !important }`, so inline
// font sizes are dead here. The page ships its own stylesheet under a doubled
// class (#root .pc.pc) and sizes follow the Aa text-size control (--app-fs).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchBaseItems,
  fetchServerItems,
  loadCustomItems,
  saveCustomItems,
  saveServerItem,
  deleteServerItem,
  normalizeCode,
} from "../monitor/branches/_shared/ProductPicker";
import { ConfirmModal } from "./_shared/SettingsUIKit";
import {
  barcodesByCode, fetchBarcodeMap, normBarcode, recodeBarcodes, setCodeBarcodes, showBarcode,
} from "../../utils/barcodeMap";
import { getCurrentUser } from "../../utils/perms";
import useWedgeScanner from "../../utils/useWedgeScanner";
import { resolveShelfLife, useShelfLife } from "../monitor/branches/_shared/shelfLife";
import ShelfLifeModal from "../monitor/branches/_shared/ShelfLifeModal";
import ProductFormModal from "./ProductFormModal";
import { fetchProductMedia, imagesOf, setProductImages } from "../../utils/productMedia";
import { deleteImage, thumbUrl } from "../../utils/imageUpload";

const SHELF_SRC = { code: "own", category: "category", default: "default" };
const PAGE = 100;

const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};

const normKeyOf = (it) => normalizeCode(it?.item_code ?? it?.itemCode ?? "");

// a soft colour per category for the letter avatar (stable, pastel)
const HUES = [199, 172, 262, 32, 340, 142, 221, 14, 291, 48];
const hueOf = (s) => {
  let h = 0;
  for (const ch of String(s || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
};
const initials = (name) => String(name || "?").replace(/[^A-Za-z0-9؀-ۿ ]/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .pc.pc { --ink:#0f2740; --soft:#5b7088; --mute:#8aa0b6; --line:#e3edf7; --sky:#0ea5e9; --sky2:#e0f2fe; --teal:#0d9488;
  --bg:#f5f9fd; color:var(--ink); font-family: system-ui,-apple-system,"Segoe UI",Cairo,sans-serif; display:flex; flex-direction:column; gap:12px; }
#root .pc.pc * { font-size:${fs(14)}; box-sizing:border-box; }

/* header */
#root .pc.pc .hd { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
#root .pc.pc .hd-ic { width:48px; height:48px; border-radius:14px; display:grid; place-items:center; background:linear-gradient(135deg,#e0f2fe,#ccfbf1); flex-shrink:0; }
#root .pc.pc .hd-ic span { font-size:${fs(24)}; }
#root .pc.pc .hd-t { flex:1 1 260px; min-width:0; }
#root .pc.pc .hd-t h1 { margin:0; font-size:${fs(22)}; font-weight:900; letter-spacing:-.01em; line-height:1.2; }
#root .pc.pc .hd-t p { margin:3px 0 0; color:var(--soft); font-size:${fs(13)}; font-weight:600; }
#root .pc.pc .hd-a { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
#root .pc.pc .sync { display:inline-flex; align-items:center; gap:6px; color:var(--soft); font-size:${fs(12)}; font-weight:700; padding:0 4px; }
#root .pc.pc .sync i { width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 3px #dcfce7; }
#root .pc.pc .sync.off i { background:#f59e0b; box-shadow:0 0 0 3px #fef3c7; }

/* buttons */
#root .pc.pc .b { border:1.5px solid var(--line); background:#fff; color:var(--ink); border-radius:11px; padding:8px 13px; font-weight:800;
  cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-family:inherit; transition:background .15s,border-color .15s; }
#root .pc.pc .b:hover { background:#f0f7fe; border-color:#cfe0f0; }
#root .pc.pc .b:disabled { opacity:.5; cursor:default; }
#root .pc.pc .add { width:46px; height:46px; border-radius:50%; border:0; cursor:pointer; display:grid; place-items:center; flex-shrink:0;
  background:linear-gradient(135deg,#38bdf8,#0d9488); color:#fff; box-shadow:0 8px 20px rgba(14,165,233,.35); transition:transform .15s; }
#root .pc.pc .add:hover { transform:scale(1.07); }
#root .pc.pc .add span { font-size:${fs(26)}; font-weight:700; line-height:1; margin-top:-2px; }

/* KPI cards */
#root .pc.pc .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; }
#root .pc.pc .kpi { background:#fff; border:1px solid var(--line); border-radius:14px; padding:12px 14px; text-align:start; cursor:pointer;
  font-family:inherit; color:inherit; transition:border-color .15s, box-shadow .15s; display:block; width:100%; }
#root .pc.pc .kpi:hover { border-color:#bae0fb; box-shadow:0 6px 16px rgba(15,39,64,.06); }
#root .pc.pc .kpi.on { border-color:var(--sky); box-shadow:0 0 0 3px var(--sky2); }
#root .pc.pc .kpi .k-l { color:var(--soft); font-size:${fs(12)}; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
#root .pc.pc .kpi .k-v { font-size:${fs(24)}; font-weight:900; margin-top:2px; line-height:1.15; }
#root .pc.pc .kpi .k-v small { font-size:${fs(13)}; color:var(--mute); font-weight:700; margin-inline-start:4px; }
#root .pc.pc .kpi { position:relative; }
#root .pc.pc .k-miss { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
#root .pc.pc .k-miss button { border:1px solid var(--line); background:#fff; border-radius:999px; padding:2px 9px; font-weight:800;
  font-size:${fs(11)}; color:var(--soft); cursor:pointer; font-family:inherit; }
#root .pc.pc .k-miss button:hover { background:#f0f7fe; }
#root .pc.pc .k-miss button.on { background:#fff7ed; border-color:#fdba74; color:#9a3412; }
#root .pc.pc .bar { height:5px; border-radius:9px; background:#eef4fa; margin-top:8px; overflow:hidden; }
#root .pc.pc .bar b { display:block; height:100%; border-radius:9px; background:linear-gradient(90deg,#38bdf8,#14b8a6); }

/* scan banner */
#root .pc.pc .scan { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:12px; font-weight:700;
  background:#f0fdf4; border:1px solid #bbf7d0; }
#root .pc.pc .scan.new { background:#fffbeb; border-color:#fde68a; }
#root .pc.pc .scan .mono { font-weight:900; }
#root .pc.pc .scan .x { margin-inline-start:auto; }

/* toolbar */
#root .pc.pc .tools { background:#fff; border:1px solid var(--line); border-radius:14px; padding:10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
#root .pc.pc .search { flex:1 1 280px; position:relative; min-width:0; }
#root .pc.pc .search input { width:100%; border:1.5px solid var(--line); border-radius:11px; padding:9px 12px 9px 36px; background:var(--bg);
  color:var(--ink); font-weight:600; font-family:inherit; outline:none; }
#root .pc.pc .search input:focus { border-color:var(--sky); background:#fff; box-shadow:0 0 0 3px var(--sky2); }
#root .pc.pc .search > span { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--mute); pointer-events:none; }
#root .pc.pc select.s { border:1.5px solid var(--line); border-radius:11px; padding:8px 10px; background:#fff; color:var(--ink); font-weight:700;
  font-family:inherit; cursor:pointer; max-width:230px; outline:none; }
#root .pc.pc select.s:focus { border-color:var(--sky); }
#root .pc.pc select.s.on { border-color:var(--sky); background:#f0f9ff; }
#root .pc.pc .seg { display:inline-flex; background:var(--bg); border:1.5px solid var(--line); border-radius:11px; padding:2px; }
#root .pc.pc .seg button { border:0; background:none; padding:6px 10px; border-radius:8px; font-weight:800; color:var(--soft); cursor:pointer; font-family:inherit; }
#root .pc.pc .seg button.on { background:#fff; color:var(--ink); box-shadow:0 1px 4px rgba(15,39,64,.12); }
#root .pc.pc .count { color:var(--soft); font-weight:700; font-size:${fs(13)}; margin-inline-start:auto; padding:0 4px; }

/* list */
#root .pc.pc .list { background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
#root .pc.pc .scroll { max-height:max(56vh, calc(100vh - 340px)); overflow:auto; }
#root .pc.pc table { width:100%; border-collapse:separate; border-spacing:0; min-width:880px; }
#root .pc.pc table * { font-size:${fs(14)}; }
#root .pc.pc th { position:sticky; top:0; z-index:1; background:#f8fbfe; color:var(--soft); font-size:${fs(12)}; font-weight:800; text-transform:uppercase;
  letter-spacing:.04em; text-align:start; padding:10px 12px; border-bottom:1px solid var(--line); white-space:nowrap; }
#root .pc.pc td { padding:9px 12px; border-bottom:1px solid #edf3f9; vertical-align:middle; }
/* column lines */
#root .pc.pc th, #root .pc.pc td { border-inline-end:1px solid #e8eff6; }
#root .pc.pc th:last-child, #root .pc.pc td:last-child { border-inline-end:0; }
#root .pc.pc tbody tr:nth-child(even) { background:#fbfdff; }
#root .pc.pc tbody tr:nth-child(even):hover { background:#f5faff; }
/* row number */
#root .pc.pc .no { width:56px; text-align:center; color:var(--mute); font-weight:800; font-variant-numeric:tabular-nums; }
#root .pc.pc td.no { font-size:${fs(12)}; }
#root .pc.pc tbody tr { cursor:pointer; transition:background .12s; }
#root .pc.pc tbody tr:hover { background:#f5faff; }
#root .pc.pc tbody tr.hit { background:#ecfdf5; box-shadow:inset 3px 0 0 #10b981; }
#root .pc.pc .prod { display:flex; align-items:center; gap:10px; min-width:0; }
#root .pc.pc .av { width:40px; height:40px; border-radius:11px; flex-shrink:0; display:grid; place-items:center; overflow:hidden; font-weight:900; }
#root .pc.pc .av img { width:100%; height:100%; object-fit:cover; display:block; }
#root .pc.pc .av, #root .pc.pc .av * { font-size:${fs(13)}; }
#root .pc.pc .nm { font-weight:800; color:var(--ink); line-height:1.3; }
#root .pc.pc .sub { display:flex; gap:6px; flex-wrap:wrap; margin-top:3px; }
#root .pc.pc .tag { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-weight:800; font-size:${fs(11)};
  background:#f1f5f9; color:#475569; border:0; font-family:inherit; white-space:nowrap; }
#root .pc.pc button.tag { cursor:pointer; }
#root .pc.pc button.tag:hover { filter:brightness(.96); }
#root .pc.pc .mono { font-family:ui-monospace,Consolas,"Cascadia Mono",monospace; }
#root .pc.pc .code { font-weight:800; color:var(--ink); background:#f5f9fd; border:1px solid var(--line); border-radius:8px; padding:3px 8px; }
#root .pc.pc .bcs { display:flex; flex-wrap:wrap; gap:4px; }
#root .pc.pc .bc { background:#f0f9ff; color:#075985; border:1px solid #d6ecfb; border-radius:7px; padding:2px 7px; font-weight:700; font-size:${fs(12)}; }
#root .pc.pc .none { color:var(--mute); font-weight:700; }
#root .pc.pc .sl { display:inline-flex; align-items:baseline; gap:6px; }
#root .pc.pc .sl b { font-weight:900; font-size:${fs(15)}; }
#root .pc.pc .sl small { color:var(--mute); font-weight:700; font-size:${fs(11)}; }
#root .pc.pc .sl.off b { color:#b91c1c; }
#root .pc.pc .src-base { background:#eef2ff; color:#3730a3; }
#root .pc.pc .src-edited { background:#fef3c7; color:#92400e; }
#root .pc.pc .src-custom { background:#dcfce7; color:#065f46; }
#root .pc.pc .acts { display:flex; gap:6px; justify-content:flex-end; }
#root .pc.pc .ib { width:34px; height:34px; border-radius:10px; border:1.5px solid var(--line); background:#fff; cursor:pointer; display:grid; place-items:center; }
#root .pc.pc .ib:hover { background:#f0f7fe; }
#root .pc.pc .ib.dan:hover { background:#fef2f2; border-color:#fecaca; }
#root .pc.pc .empty { padding:40px 16px; text-align:center; color:var(--soft); }
#root .pc.pc .empty b { display:block; font-size:${fs(16)}; color:var(--ink); margin-bottom:4px; }
#root .pc.pc .more { display:flex; justify-content:center; padding:12px; border-top:1px solid var(--line); background:#fbfdff; }
#root .pc.pc .foot { color:var(--mute); font-size:${fs(12)}; line-height:1.6; font-weight:600; }
#root .pc.pc .skel td div { height:14px; border-radius:6px; background:linear-gradient(90deg,#eef4fa,#f7fafd,#eef4fa); background-size:200% 100%; animation:pcSk 1.2s infinite; }
@keyframes pcSk { from { background-position:200% 0; } to { background-position:-200% 0; } }

/* toast */
.pc-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10400; background:#0f2740; color:#fff; padding:11px 18px;
  border-radius:12px; font:700 14px system-ui,-apple-system,"Segoe UI",Cairo,sans-serif; box-shadow:0 12px 30px rgba(15,39,64,.25); max-width:92vw; }
.pc-toast.err { background:#b91c1c; }

@media (max-width:700px) {
  #root .pc.pc .count { margin-inline-start:0; width:100%; }
  #root .pc.pc select.s { max-width:none; flex:1 1 140px; }
}
`;

export default function ProductsTab({ navActions = null }) {
  const [base, setBase] = useState([]);
  const [custom, setCustom] = useState(() => loadCustomItems());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState(null); // { text, err? }
  const [serverOnline, setServerOnline] = useState(false);
  // the ➕ / ✏️ product window: null = closed; { row } = edit that row, { row: null, initial } = add
  const [pf, setPf] = useState(null);
  const [media, setMedia] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [bcMap, setBcMap] = useState({});
  // smart tools: category / barcode / source filters + sort, paged list
  const [fCat, setFCat] = useState("*");
  const [fBc, setFBc] = useState("*"); // * | with | without | many
  const [fSrc, setFSrc] = useState("*"); // * | base | mine
  const [fSl, setFSl] = useState("*"); // * | set | none
  const [fImg, setFImg] = useState("*"); // * | with | none
  const [sort, setSort] = useState("name"); // name | code | cat | bc | shelf
  const [limit, setLimit] = useState(PAGE);
  const [scanHit, setScanHit] = useState(null); // { barcode, code?, name? } — the last handheld scan
  // shelf life: the same record the Raw Material Receipt calculates expiry from (shelf_life_config)
  const shelf = useShelfLife();
  const [shelfOpen, setShelfOpen] = useState(false);
  const searchRef = useRef(null);
  const toastTimer = useRef(0);

  const flash = useCallback((text, isErr = false) => {
    setToast({ text, err: isErr });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), isErr ? 5000 : 2800);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => { fetchBarcodeMap().then((m) => setBcMap(m || {})); }, []);
  useEffect(() => { fetchProductMedia().then((m) => setMedia(m || {})); }, []);
  const byCode = useMemo(() => barcodesByCode(bcMap), [bcMap]);
  const barcodesOf = useCallback((row) => (row?.code ? byCode[String(row.code).trim()] || [] : []), [byCode]);
  const shelfOf = useCallback((r) => shelf.resolve({ code: r.code, name: r.name }), [shelf]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, server] = await Promise.all([fetchBaseItems(), fetchServerItems()]);
      if (cancelled) return;
      setBase(b);
      if (Array.isArray(server)) {
        const mergedByCode = new Map();
        loadCustomItems().forEach((it) => { const key = normKeyOf(it); if (key) mergedByCode.set(key, it); });
        server.forEach((it) => { const key = normKeyOf(it); if (key) mergedByCode.set(key, it); });
        const merged = Array.from(mergedByCode.values());
        setCustom(merged);
        saveCustomItems(merged);
        setServerOnline(true);
      } else {
        setCustom(loadCustomItems());
        setServerOnline(false);
      }
      setLoading(false);
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
          const merged = [saved, ...prev.filter((it) => { const key = normKeyOf(it); return key !== savedKey && (!oldKey || key !== oldKey); })];
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
      return false;
    }
  }, []);

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
      map.set(r.key, { ...r, category: r.category || was?.category || "", uom: r.uom || was?.uom || "", source: was ? "edited" : "custom" });
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
    const nbc = (r) => barcodesOf(r).length;
    const days = (r) => { const x = shelfOf(r); return x && x.days > 0 ? x.days : 0; };
    let list = rows;
    if (s || ns) {
      list = list.filter((r) => (ns && normalizeCode(r.code).includes(ns)) || (s && r.name.toLowerCase().includes(s))
        || (s && r.category.toLowerCase().includes(s))
        || (bq.length >= 4 && barcodesOf(r).some((b) => b.includes(bq))));
    }
    if (fCat !== "*") list = list.filter((r) => (r.category || "") === fCat);
    if (fBc === "with") list = list.filter((r) => nbc(r) > 0);
    if (fBc === "without") list = list.filter((r) => nbc(r) === 0);
    if (fBc === "many") list = list.filter((r) => nbc(r) > 1);
    if (fSrc === "base") list = list.filter((r) => r.source === "base");
    if (fSrc === "mine") list = list.filter((r) => r.source !== "base");
    if (fSl === "set") list = list.filter((r) => days(r) > 0);
    if (fSl === "none") list = list.filter((r) => days(r) === 0);
    if (fImg === "with") list = list.filter((r) => imagesOf(media, r.code).length > 0);
    if (fImg === "none") list = list.filter((r) => imagesOf(media, r.code).length === 0);
    if (sort === "code") list = [...list].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    else if (sort === "bc") list = [...list].sort((a, b) => nbc(b) - nbc(a) || a.name.localeCompare(b.name));
    else if (sort === "shelf") list = [...list].sort((a, b) => (days(a) || Infinity) - (days(b) || Infinity) || a.name.localeCompare(b.name));
    else if (sort === "cat") list = [...list].sort((a, b) => (a.category || "~").localeCompare(b.category || "~") || a.name.localeCompare(b.name));
    return list;
  }, [rows, q, barcodesOf, shelfOf, media, fCat, fBc, fSrc, fSl, fImg, sort]);

  useEffect(() => { setLimit(PAGE); }, [q, fCat, fBc, fSrc, fSl, fImg, sort]);

  const filtersOn = fCat !== "*" || fBc !== "*" || fSrc !== "*" || fSl !== "*" || fImg !== "*" || sort !== "name" || !!q.trim();
  const clearFilters = () => { setQ(""); setFCat("*"); setFBc("*"); setFSrc("*"); setFSl("*"); setFImg("*"); setSort("name"); };

  const stats = useMemo(() => {
    let withBc = 0; let withSl = 0; let withImg = 0;
    rows.forEach((r) => {
      if (barcodesOf(r).length) withBc += 1;
      const sl = shelfOf(r);
      if (sl && sl.days > 0) withSl += 1;
      if (imagesOf(media, r.code).length) withImg += 1;
    });
    return { total: rows.length, withBc, withSl, withImg, barcodes: Object.keys(bcMap).length, mine: rows.filter((r) => r.source !== "base").length };
  }, [rows, barcodesOf, shelfOf, media, bcMap]);
  const pct = (n) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  /* Excel-friendly CSV of what is on screen (all matching rows) */
  const exportCsv = () => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Code", "Product Name", "Category", "UOM", "Barcodes", "Barcode count", "Shelf life (days)", "Shelf life from", "Photos", "Source"].map(cell).join(",")];
    filtered.forEach((r) => {
      const bcs = barcodesOf(r).map(showBarcode);
      const sl = shelfOf(r);
      // ="…" keeps long barcodes as text in Excel (no 6.29E+12)
      lines.push([
        cell(r.code), cell(r.name), cell(r.category), cell(r.uom),
        bcs.length ? `"=""${bcs.join(" | ")}"""` : cell(""), cell(bcs.length),
        cell(sl ? sl.days : ""), cell(sl ? SHELF_SRC[sl.source] : ""), cell(imagesOf(media, r.code).length),
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

  /* ---- the product window ---- */
  const ownShelf = (code) => shelf.config.rules.find((x) => x.scope === "code" && normalizeCode(x.match) === normalizeCode(code));
  // a scanned barcode that belongs to nobody rides into the next window opened
  const pendingBc = scanHit && !scanHit.code ? [showBarcode(scanHit.barcode)] : [];
  const openAdd = (initial = {}) => setPf({ row: null, initial: { barcodes: pendingBc, ...initial } });
  const startEdit = (row) => {
    const own = ownShelf(row.code);
    const have = barcodesOf(row).map(showBarcode);
    setPf({
      row,
      initial: {
        code: row.code, name: row.name,
        barcodes: [...have, ...pendingBc.filter((b) => !have.includes(b))],
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

    if (scanHit && !scanHit.code && data.barcodes.map(normBarcode).includes(scanHit.barcode)) setScanHit(null);
    if (warn.length) flash(`Saved, but not the ${warn.join(" and ")} — open it again and retry.`, true);
    else if (!synced) flash("Saved on this device only — the server could not be reached.", true);
    else flash(editing ? "✅ Product updated" : "✅ Product added");
  };

  const removeRow = async () => {
    const row = confirmRemove;
    if (!row) return;
    setConfirmRemove(null);
    const next = custom.filter((it) => normKeyOf(it) !== row.key);
    const synced = await commitCustom(next, null, { deleteCode: row.code });
    // a removed product takes its barcodes and photos with it (a revert keeps them — the master product stays)
    if (row.source === "custom") {
      if (barcodesOf(row).length) {
        try { setBcMap(await recodeBarcodes(row.code, null, userName())); } catch { /* the list keeps them */ }
      }
      const imgs = imagesOf(media, row.code);
      if (imgs.length) {
        try { setMedia(await setProductImages(row.code, [], userName())); imgs.forEach((u) => deleteImage(u).catch(() => {})); } catch { /* kept */ }
      }
    }
    if (!synced) flash("Removed on this device only — the server could not be reached.", true);
    else flash(row.source === "edited" ? "✅ Back to the master value" : "✅ Product removed");
  };

  /* 🔫 Handheld reader anywhere on the page: a known barcode shows its
     product; an unknown one waits to be put on a product. The barcode boxes
     of the product window take the scan as typing (data-scan-input). */
  useWedgeScanner((text) => {
    if (document.activeElement?.closest?.("[data-scan-input]")) return false;
    const key = normBarcode(text);
    if (!key) return false;
    const owner = bcMap[key];
    const row = owner?.code ? rows.find((r) => String(r.code).trim() === String(owner.code).trim()) : null;
    // after the reader's keys are taken back out of the search box (its own onChange would win otherwise)
    setTimeout(() => {
      setFCat("*"); setFBc("*"); setFSrc("*"); setFSl("*"); setFImg("*");
      setQ(row ? showBarcode(key) : "");
      setScanHit({ barcode: key, code: owner?.code || "", name: row?.name || owner?.product || "", known: !!row });
    }, 0);
    return true;
  }, !loading && !pf && !shelfOpen);

  // "/" jumps to the search box
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || pf || shelfOpen) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pf, shelfOpen]);

  const shown = filtered.slice(0, limit);
  const hitCode = scanHit?.known ? String(scanHit.code).trim() : "";

  return (
    <div className="pc pc">
      <style>{CSS}</style>

      {/* ── header ── */}
      <div className="hd">
        <div className="hd-ic"><span>📦</span></div>
        <div className="hd-t">
          <h1>Products Catalog</h1>
          <p>One code per product · as many barcodes as it has · shelf life and photos — used by every product list in the app.</p>
        </div>
        <div className="hd-a">
          <span className={`sync ${serverOnline ? "" : "off"}`} title={serverOnline ? "Saved on the server" : "Server not reached — changes stay on this device"}>
            <i />{serverOnline ? "Synced" : "Offline"}
          </span>
          <button type="button" className="b" onClick={() => setShelfOpen(true)} title="The shelf-life list the Raw Material Receipt uses">
            ⏳ Shelf-life rules
          </button>
          <button type="button" className="b" onClick={exportCsv} disabled={!filtered.length} title="Download the products shown as a CSV file (opens in Excel)">
            ⬇ Export
          </button>
          {navActions}
          <button type="button" className="add" onClick={() => openAdd()} title="Add product" aria-label="Add product"><span>+</span></button>
        </div>
      </div>

      {/* ── KPI cards: the card shows the products that HAVE it, "missing" the ones that don't ── */}
      <div className="kpis">
        <button type="button" className={`kpi ${!filtersOn ? "on" : ""}`} onClick={clearFilters} title="Show all products">
          <div className="k-l">Products</div>
          <div className="k-v">{stats.total}<small>{stats.mine} added / edited</small></div>
          <div className="bar"><b style={{ width: "100%" }} /></div>
        </button>
        {[
          { l: "With barcode", n: stats.withBc, extra: `${stats.barcodes} barcodes`, v: fBc, set: setFBc, on: "with", off: "without" },
          { l: "With shelf life", n: stats.withSl, extra: shelf.config.defaultDays > 0 ? `default ${shelf.config.defaultDays} d` : "", v: fSl, set: setFSl, on: "set", off: "none" },
          { l: "With photo", n: stats.withImg, extra: "", v: fImg, set: setFImg, on: "with", off: "none" },
        ].map((k) => (
          <div key={k.l} role="button" tabIndex={0} className={`kpi ${k.v === k.on ? "on" : ""}`}
            onClick={() => k.set(k.v === k.on ? "*" : k.on)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); k.set(k.v === k.on ? "*" : k.on); } }}
            title={`Show the products ${k.l.toLowerCase()}`}>
            <div className="k-l">{k.l}</div>
            <div className="k-v">{k.n}<small>{pct(k.n)}%{k.extra ? ` · ${k.extra}` : ""}</small></div>
            <div className="bar"><b style={{ width: `${pct(k.n)}%` }} /></div>
            <div className="k-miss">
              <button type="button" className={k.v === k.off ? "on" : ""}
                onClick={(e) => { e.stopPropagation(); k.set(k.v === k.off ? "*" : k.off); }}>
                ✕ {stats.total - k.n} missing
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── handheld scan result ── */}
      {scanHit && (
        <div className={`scan ${scanHit.known ? "" : "new"}`}>
          <span className="mono">🔫 {showBarcode(scanHit.barcode)}</span>
          {scanHit.known ? (
            <>
              <span>→ {scanHit.code} · {scanHit.name}</span>
              <button type="button" className="b" onClick={() => { const r = rows.find((x) => String(x.code).trim() === hitCode); if (r) startEdit(r); }}>✏️ Open</button>
            </>
          ) : scanHit.code ? (
            <span>is linked to code {scanHit.code}, which is not in this catalog — add that product, or open another product to move the barcode to it.</span>
          ) : (
            <>
              <span>is on no product yet — open any product (✏️) and it is added there, or:</span>
              <button type="button" className="b" onClick={() => openAdd()}>＋ New product with it</button>
            </>
          )}
          <button type="button" className="b x" onClick={() => setScanHit(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── search, filters, sort ── */}
      <div className="tools">
        <div className="search">
          <span>🔍</span>
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, barcode or category  ( / )" />
        </div>
        <select className={`s ${fCat !== "*" ? "on" : ""}`} value={fCat} onChange={(e) => setFCat(e.target.value)} title="Category">
          <option value="*">All categories</option>
          {categories.map(([c, n]) => <option key={c || "-"} value={c}>{c || "(no category)"} · {n}</option>)}
        </select>
        <div className="seg" role="group" aria-label="Barcodes">
          {[["*", "All"], ["with", "Barcode"], ["without", "No barcode"], ["many", "2+"]].map(([v, l]) => (
            <button key={v} type="button" className={fBc === v ? "on" : ""} onClick={() => setFBc(v)}>{l}</button>
          ))}
        </div>
        <select className={`s ${fSrc !== "*" ? "on" : ""}`} value={fSrc} onChange={(e) => setFSrc(e.target.value)} title="Source">
          <option value="*">Master + added</option>
          <option value="base">Master only</option>
          <option value="mine">Added / edited</option>
        </select>
        <select className={`s ${fSl !== "*" ? "on" : ""}`} value={fSl} onChange={(e) => setFSl(e.target.value)} title="Shelf life">
          <option value="*">Any shelf life</option>
          <option value="set">With shelf life</option>
          <option value="none">No shelf life</option>
        </select>
        <select className={`s ${fImg !== "*" ? "on" : ""}`} value={fImg} onChange={(e) => setFImg(e.target.value)} title="Photos">
          <option value="*">Any photo</option>
          <option value="with">With photo</option>
          <option value="none">No photo</option>
        </select>
        <select className={`s ${sort !== "name" ? "on" : ""}`} value={sort} onChange={(e) => setSort(e.target.value)} title="Sort">
          <option value="name">Sort · Name A→Z</option>
          <option value="code">Sort · Code</option>
          <option value="cat">Sort · Category</option>
          <option value="bc">Sort · Most barcodes</option>
          <option value="shelf">Sort · Shortest shelf life</option>
        </select>
        {filtersOn && <button type="button" className="b" onClick={clearFilters}>✕ Clear</button>}
        <span className="count">{filtered.length === rows.length ? `${rows.length} products` : `${filtered.length} of ${rows.length}`}</span>
      </div>

      {/* ── the list ── */}
      <div className="list">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th className="no">#</th>
                <th>Product</th>
                <th style={{ width: 120 }}>Code</th>
                <th style={{ width: 260 }}>Barcodes</th>
                <th style={{ width: 140 }}>Shelf life</th>
                <th style={{ width: 100 }}>Source</th>
                <th style={{ width: 92 }} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="skel"><td colSpan={7}><div style={{ width: `${60 + ((i * 13) % 35)}%` }} /></td></tr>
                ))
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="empty">
                  <b>No products match</b>
                  {filtersOn ? <button type="button" className="b" onClick={clearFilters} style={{ marginTop: 8 }}>✕ Clear the filters</button> : "Add the first one with ＋."}
                </td></tr>
              ) : (
                shown.map((row, i) => {
                  const bcs = barcodesOf(row);
                  const img = imagesOf(media, row.code)[0];
                  const sl = shelfOf(row);
                  const hue = hueOf(row.category || row.name);
                  return (
                    <tr key={row.key} className={hitCode && String(row.code).trim() === hitCode ? "hit" : ""} onClick={() => startEdit(row)}>
                      <td className="no">{i + 1}</td>
                      <td>
                        <div className="prod">
                          <div className="av" style={img ? undefined : { background: `hsl(${hue} 85% 93%)`, color: `hsl(${hue} 55% 32%)` }}>
                            {img ? <img src={thumbUrl(img, 96)} alt="" loading="lazy" /> : initials(row.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="nm">{row.name}</div>
                            {(row.category || row.uom) && (
                              <div className="sub">
                                {row.category && (
                                  <button type="button" className="tag" title="Show this category only"
                                    style={{ background: `hsl(${hue} 85% 95%)`, color: `hsl(${hue} 50% 32%)` }}
                                    onClick={(e) => { e.stopPropagation(); setFCat(row.category); }}>{row.category}</button>
                                )}
                                {row.uom && <span className="tag">{row.uom}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{row.code ? <span className="code mono">{row.code}</span> : <span className="none">—</span>}</td>
                      <td>
                        {bcs.length ? (
                          <div className="bcs">
                            {bcs.slice(0, 3).map((b) => <span key={b} className="bc mono">{showBarcode(b)}</span>)}
                            {bcs.length > 3 && <span className="bc">+{bcs.length - 3}</span>}
                          </div>
                        ) : <span className="none">— none</span>}
                      </td>
                      <td>
                        {!sl ? <span className="none">—</span>
                          : sl.days === 0 ? <span className="sl off"><b>Off</b><small>{SHELF_SRC[sl.source]}</small></span>
                            : <span className="sl" title={sl.source === "category" ? `From category ${sl.label}` : undefined}><b>{sl.days} d</b><small>{SHELF_SRC[sl.source]}</small></span>}
                      </td>
                      <td>
                        <span className={`tag src-${row.source}`}>{row.source === "base" ? "Master" : row.source === "edited" ? "Edited" : "Custom"}</span>
                      </td>
                      <td>
                        <div className="acts">
                          <button type="button" className="ib" title="Edit" aria-label="Edit" onClick={(e) => { e.stopPropagation(); startEdit(row); }}>✏️</button>
                          {row.source !== "base" && (
                            <button type="button" className="ib dan" aria-label={row.source === "edited" ? "Revert" : "Remove"}
                              title={row.source === "edited" ? "Back to the master value" : "Remove product"}
                              onClick={(e) => { e.stopPropagation(); setConfirmRemove(row); }}>
                              {row.source === "edited" ? "↺" : "🗑"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <div className="more">
            <button type="button" className="b" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more · {filtered.length - limit} left
            </button>
          </div>
        )}
      </div>

      <div className="foot">
        Click a product to edit it. 🔫 A handheld barcode reader works anywhere on this page — scan a carton to find its product.
        Master products come from the bundled catalog file: they can be renamed (saved as an override) but not removed.
      </div>

      {toast && <div className={`pc-toast ${toast.err ? "err" : ""}`} role="status">{toast.text}</div>}

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
        title={confirmRemove?.source === "edited" ? "Go back to the master value?" : "Remove product?"}
        body={confirmRemove
          ? `${confirmRemove.name} (${confirmRemove.code})${confirmRemove.source === "custom" && (barcodesOf(confirmRemove).length || imagesOf(media, confirmRemove.code).length) ? " — its barcodes and photos are removed too." : ""}`
          : ""}
        confirmText={confirmRemove?.source === "edited" ? "Revert" : "Remove"}
        cancelText="Cancel"
        onConfirm={removeRow}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
