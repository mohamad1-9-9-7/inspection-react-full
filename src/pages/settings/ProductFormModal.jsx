// src/pages/settings/ProductFormModal.jsx
//
// ➕ / ✏️ The product window of the Products Catalog: name, code, as many
// barcodes as the product has, shelf life, storage temperature, allergens,
// active / stopped and photos — one Save.
//
//   <ProductFormModal open mode="add"|"edit" initial={…} codeLocked shelfHint
//     onSave={async (data, { move }) => …} onClose={…} />
//
// initial = { code, name, barcodes: [], shelfDays: "", images: [],
//             storage: { mode, min, max } | null, allergens: [], active: true }
// onSave throws an Error; err.conflicts (barcodes on another code) shows a
// "move them here" choice that calls onSave again with move = true.
//
// Photos go straight to Cloudinary when picked (never base64). Cancel deletes
// the ones picked in this window; a Save deletes the ones removed from it.
// Rendered into <body> so the app's forced font sizes don't reach it.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteImage, thumbUrl, uploadImage } from "../../utils/imageUpload";
import useWedgeScanner from "../../utils/useWedgeScanner";
import { ALLERGENS, PRODUCT_TYPES, STORAGE, TYPE_GROUPS, typeOfId } from "../../utils/productMedia";

const BLANK = { code: "", name: "", barcodes: [""], shelfDays: "", images: [], mode: "", tMin: "", tMax: "", allergens: [], active: true, ptype: "", tgroup: "" };

/* Sizes follow the Aa text-size control (--app-fs on <html>), like the rest of the app. */
const z = (px) => `calc(${px}px * var(--app-fs, 1))`;
const CSS = `
.pfm { position:fixed; inset:0; z-index:10500; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; padding:16px;
  font-family: system-ui,-apple-system,"Segoe UI",Cairo,sans-serif; color:#0f172a; font-size:${z(16)}; line-height:1.45; }
.pfm * { box-sizing:border-box; }
.pfm-box { background:#fff; border-radius:20px; width:min(1080px,100%); max-height:94vh; display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 30px 70px rgba(2,6,23,.35); direction:ltr; }
.pfm-head { padding:18px 24px; background:linear-gradient(135deg,#0ea5e9,#0d9488); color:#fff; display:flex; align-items:center; gap:12px; }
.pfm-head .ic { font-size:${z(26)}; }
.pfm-head h2 { margin:0; font-size:${z(22)}; font-weight:900; flex:1; letter-spacing:-.01em; }
.pfm-x { border:0; background:rgba(255,255,255,.2); color:#fff; border-radius:12px; width:42px; height:42px; font-size:${z(18)}; cursor:pointer; }
.pfm-x:hover { background:rgba(255,255,255,.32); }
.pfm-body { padding:20px 24px; overflow:auto; display:flex; flex-direction:column; gap:16px; background:#f6f9fc; }
.pfm-grid { display:grid; grid-template-columns: 1fr 240px; gap:14px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; }
.pfm-cols { display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:start; }
.pfm-cols .col { display:flex; flex-direction:column; gap:16px; min-width:0; }
@media (max-width:860px) { .pfm-cols { grid-template-columns:1fr; } }
@media (max-width:560px) { .pfm-grid { grid-template-columns:1fr; } .pfm-body { padding:14px; } }
.pfm label.l { display:block; font-weight:800; font-size:${z(15)}; color:#334155; margin-bottom:6px; }
.pfm .req { color:#dc2626; }
.pfm input.i { width:100%; border:1.5px solid #cbd5e1; border-radius:12px; padding:12px 14px; font-size:${z(17)}; font-family:inherit; background:#fff; color:#0f172a; min-height:50px; }
.pfm input.i:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 4px rgba(14,165,233,.18); }
.pfm input.i:disabled { background:#f1f5f9; color:#475569; }
.pfm input.mono { font-family: ui-monospace,Consolas,monospace; letter-spacing:.02em; }
.pfm .hint { color:#64748b; font-size:${z(14)}; margin-top:6px; }
.pfm .sec { border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:#fff; }
.pfm .sec-t { font-weight:900; font-size:${z(17)}; margin-bottom:4px; display:flex; align-items:center; gap:8px; }
.pfm .sec-s { color:#64748b; font-size:${z(14)}; font-weight:600; margin-bottom:12px; }
.pfm .bc-row { display:flex; gap:10px; align-items:center; margin-bottom:8px; }
.pfm .bc-n { width:30px; height:30px; border-radius:50%; background:#e0f2fe; color:#075985; display:grid; place-items:center; font-weight:900; font-size:${z(14)}; flex-shrink:0; }
.pfm .btn { border:1.5px solid #cbd5e1; background:#fff; color:#0f172a; border-radius:12px; padding:11px 18px; font-weight:800; font-size:${z(16)}; cursor:pointer; font-family:inherit; min-height:46px; }
.pfm .btn:hover { background:#f0f7fe; }
.pfm .btn:disabled { opacity:.55; cursor:default; }
.pfm .btn.pri { background:#0ea5e9; border-color:#0ea5e9; color:#fff; }
.pfm .btn.pri:hover { background:#0284c7; }
.pfm .btn.dan { color:#b91c1c; border-color:#fecaca; }
.pfm .btn.icon { width:50px; padding:0; flex-shrink:0; font-size:${z(18)}; }
.pfm .unit { font-weight:800; color:#475569; font-size:${z(16)}; }
.pfm .imgs { display:flex; flex-wrap:wrap; gap:12px; }
.pfm .img { position:relative; width:120px; height:120px; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; background:#fff; }
.pfm .img img { width:100%; height:100%; object-fit:cover; display:block; }
.pfm .img button { position:absolute; top:6px; right:6px; border:0; border-radius:9px; background:rgba(15,23,42,.72); color:#fff; width:30px; height:30px; cursor:pointer; font-size:${z(14)}; }
.pfm .img .main { position:absolute; left:6px; bottom:6px; background:#0d9488; color:#fff; font-size:${z(12)}; font-weight:800; border-radius:7px; padding:2px 8px; }
.pfm .add-img { width:120px; height:120px; border-radius:12px; border:2px dashed #94a3b8; background:#f8fbff; color:#475569; font-weight:800; font-size:${z(14)}; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-family:inherit; }
.pfm .add-img:hover { border-color:#0ea5e9; color:#0369a1; }
.pfm .add-img span { font-size:${z(30)}; }
.pfm .modes { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.pfm .mode { border:1.5px solid #cbd5e1; background:#fff; border-radius:12px; padding:12px 10px; font-weight:800; font-size:${z(16)}; cursor:pointer; font-family:inherit; color:#334155; min-height:50px; }
.pfm .mode.on { background:#e0f2fe; border-color:#0ea5e9; color:#075985; box-shadow:0 0 0 3px rgba(14,165,233,.15); }
.pfm .tgroups { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.pfm .tgroup { border:1.5px solid #cbd5e1; background:#fff; border-radius:12px; padding:12px; font-weight:900; font-size:${z(17)}; cursor:pointer; font-family:inherit; color:#334155; min-height:54px; }
.pfm .tgroup.on.raw { background:#fef2f2; border-color:#f87171; color:#991b1b; box-shadow:0 0 0 3px rgba(248,113,113,.15); }
.pfm .tgroup.on.final { background:#ecfdf5; border-color:#34d399; color:#065f46; box-shadow:0 0 0 3px rgba(52,211,153,.15); }
.pfm .tkinds { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #e2e8f0; }
.pfm .temps { display:flex; gap:10px; align-items:center; margin-top:12px; flex-wrap:wrap; }
.pfm .temps input.i { width:110px; }
.pfm .alg { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
.pfm .alg button { border:1.5px solid #cbd5e1; background:#fff; border-radius:12px; padding:10px 12px; font-weight:700; font-size:${z(15)}; cursor:pointer; font-family:inherit; color:#334155; text-align:start; min-height:46px; }
.pfm .alg button.on { background:#fff7ed; border-color:#fb923c; color:#9a3412; font-weight:900; box-shadow:0 0 0 3px rgba(251,146,60,.15); }
.pfm .sw { display:flex; align-items:center; gap:14px; cursor:pointer; user-select:none; }
.pfm .sw i { width:56px; height:32px; border-radius:99px; background:#cbd5e1; position:relative; transition:background .15s; flex-shrink:0; }
.pfm .sw i::after { content:""; position:absolute; top:4px; left:4px; width:24px; height:24px; border-radius:50%; background:#fff; transition:left .15s; box-shadow:0 1px 3px rgba(0,0,0,.25); }
.pfm .sw.on i { background:#10b981; }
.pfm .sw.on i::after { left:28px; }
.pfm .sw b { font-size:${z(17)}; font-weight:900; }
.pfm .err { color:#b91c1c; font-weight:800; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:12px 16px; font-size:${z(15)}; }
.pfm-foot { padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; background:#fff; }
.pfm-foot .btn { min-width:140px; }
`;

export default function ProductFormModal({ open, mode = "add", initial, codeLocked = false, shelfHint = "", onSave, onClose }) {
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState(null); // { text, conflicts? }
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const fresh = useRef([]); // photos uploaded in this window
  const fileRef = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const i = initial || {};
    setF({
      code: i.code || "",
      name: i.name || "",
      barcodes: i.barcodes && i.barcodes.length ? [...i.barcodes] : [""],
      shelfDays: i.shelfDays === 0 || i.shelfDays ? String(i.shelfDays) : "",
      images: [...(i.images || [])],
      mode: i.storage?.mode || "",
      tMin: i.storage && i.storage.min !== undefined && i.storage.min !== null ? String(i.storage.min) : "",
      tMax: i.storage && i.storage.max !== undefined && i.storage.max !== null ? String(i.storage.max) : "",
      allergens: [...(i.allergens || [])],
      active: i.active !== false,
      ptype: i.ptype || "",
      tgroup: typeOfId(i.ptype)?.group || "",
    });
    setErr(null); setBusy(false); fresh.current = [];
    setTimeout(() => firstRef.current?.focus(), 30);
  }, [open, initial]);

  // a handheld reader scanned while the window is open (not in a box): it goes into the barcode list
  useWedgeScanner((text) => {
    if (document.activeElement?.closest?.("[data-scan-input]")) return false;
    setTimeout(() => setF((p) => {
      const list = p.barcodes.filter((b) => b.trim());
      if (list.some((b) => b.replace(/\s+/g, "").toUpperCase() === text.replace(/\s+/g, "").toUpperCase())) return p;
      return { ...p, barcodes: [...list, text] };
    }), 0);
    return true;
  }, open && !busy);

  if (!open) return null;

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setBc = (i, v) => setF((p) => ({ ...p, barcodes: p.barcodes.map((b, j) => (j === i ? v : b)) }));
  const addBc = () => {
    setF((p) => ({ ...p, barcodes: [...p.barcodes, ""] }));
    setTimeout(() => { const all = document.querySelectorAll(".pfm .bc-row input"); all[all.length - 1]?.focus(); }, 0);
  };
  const delBc = (i) => setF((p) => {
    const next = p.barcodes.filter((_, j) => j !== i);
    return { ...p, barcodes: next.length ? next : [""] };
  });

  const pickImages = async (files) => {
    const list = Array.from(files || []).filter((x) => /^image\//.test(x.type));
    if (!list.length) return;
    setUploading((n) => n + list.length); setErr(null);
    for (const file of list) {
      try {
        const url = await uploadImage(file, "product_catalog");
        fresh.current.push(url);
        setF((p) => ({ ...p, images: [...p.images, url] }));
      } catch (e) {
        setErr({ text: `Photo not uploaded: ${e?.message || "check the connection"}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };
  const delImage = (url) => {
    setF((p) => ({ ...p, images: p.images.filter((u) => u !== url) }));
    if (fresh.current.includes(url)) {
      fresh.current = fresh.current.filter((u) => u !== url);
      deleteImage(url).catch(() => {});
    }
  };
  const pickMode = (m) => setF((p) => (p.mode === m
    ? { ...p, mode: "", tMin: "", tMax: "" }
    : { ...p, mode: m, tMin: String(STORAGE[m].min), tMax: String(STORAGE[m].max) }));
  // Raw / Final first, then the kind inside it; tapping the chosen group again clears both
  const pickGroup = (g) => setF((p) => (p.tgroup === g
    ? { ...p, tgroup: "", ptype: "" }
    : { ...p, tgroup: g, ptype: g === "raw" ? "raw" : "" }));
  const pickType = (id) => setF((p) => ({ ...p, ptype: p.ptype === id && p.tgroup !== "raw" ? "" : id }));
  const flipAllergen = (id) => setF((p) => ({
    ...p, allergens: p.allergens.includes(id) ? p.allergens.filter((x) => x !== id) : [...p.allergens, id],
  }));
  const makeMain = (url) => setF((p) => ({ ...p, images: [url, ...p.images.filter((u) => u !== url)] }));

  const cancel = () => {
    if (busy) return;
    fresh.current.forEach((u) => deleteImage(u).catch(() => {}));
    fresh.current = [];
    onClose?.();
  };

  const save = async (move = false) => {
    const name = f.name.trim();
    const code = f.code.trim();
    if (!name) return setErr({ text: "Product name is required." });
    if (!code) return setErr({ text: "Code is required." });
    const bcs = f.barcodes.map((b) => b.trim()).filter(Boolean);
    const seen = new Set();
    for (const b of bcs) {
      const k = b.replace(/\s+/g, "").toUpperCase();
      if (seen.has(k)) return setErr({ text: `Barcode ${b} is written twice.` });
      seen.add(k);
    }
    const sd = f.shelfDays.trim();
    if (sd !== "") {
      const n = Number(sd);
      if (!Number.isInteger(n) || n < 0 || n > 3650) return setErr({ text: "Shelf life: whole days 0 – 3650 (0 = no automatic expiry), or empty." });
    }
    let storage = null;
    if (f.mode) {
      const num = (v) => (String(v).trim() === "" ? null : Number(v));
      const lo = num(f.tMin); const hi = num(f.tMax);
      if ((lo !== null && !Number.isFinite(lo)) || (hi !== null && !Number.isFinite(hi))) return setErr({ text: "Storage temperature: numbers only (°C)." });
      if (lo !== null && hi !== null && lo > hi) return setErr({ text: "Storage temperature: the lowest must be below the highest." });
      storage = { mode: f.mode, min: lo, max: hi };
    }
    if (f.tgroup === "final" && !f.ptype) return setErr({ text: "Product type: choose Cooked or Ready to cook / sale." });
    if (uploading) return setErr({ text: "Wait for the photos to finish uploading." });
    setBusy(true); setErr(null);
    try {
      await onSave({ code, name, barcodes: bcs, shelfDays: sd, images: f.images, storage, allergens: f.allergens, active: f.active, ptype: f.ptype || null }, { move });
      // the photos taken out in this window are deleted from the store now that the save is done
      (initial?.images || []).filter((u) => !f.images.includes(u)).forEach((u) => deleteImage(u).catch(() => {}));
      fresh.current = [];
      onClose?.();
    } catch (e) {
      setErr({ text: e?.message || "Save failed — check the connection.", conflicts: e?.conflicts });
    } finally {
      setBusy(false);
    }
    return null;
  };

  return createPortal(
    <div className="pfm" role="dialog" aria-modal="true" aria-label={mode === "edit" ? "Edit product" : "Add product"}
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}>
      <style>{CSS}</style>
      <div className="pfm-box">
        <div className="pfm-head">
          <span className="ic">{mode === "edit" ? "✏️" : "➕"}</span>
          <h2>{mode === "edit" ? "Edit product" : "Add product"}</h2>
          <button type="button" className="pfm-x" onClick={cancel} aria-label="Close">✕</button>
        </div>

        <div className="pfm-body">
          <div className="pfm-grid">
            <div>
              <label className="l" htmlFor="pfm-name">Product name <span className="req">*</span></label>
              <input id="pfm-name" ref={firstRef} className="i" value={f.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. BRAZILIAN BEEF TOPSIDE - KG" />
            </div>
            <div>
              <label className="l" htmlFor="pfm-code">Code <span className="req">*</span></label>
              <input id="pfm-code" className="i mono" value={f.code} onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. 20060" disabled={codeLocked}
                title={codeLocked ? "Master codes can't be changed — only the name." : undefined} />
              {codeLocked && <div className="hint">Master code — it can't be changed.</div>}
            </div>
          </div>

          <div className="pfm-cols">
          <div className="col">
          <div className="sec">
            <div className="sec-t">🏷 Product type</div>
            <div className="sec-s">Raw or final — then which kind.</div>
            <div className="tgroups">
              {Object.entries(TYPE_GROUPS).map(([g, label]) => (
                <button key={g} type="button" className={`tgroup ${g} ${f.tgroup === g ? "on" : ""}`} onClick={() => pickGroup(g)}>
                  {g === "raw" ? "🥩" : "✅"} {label}
                </button>
              ))}
            </div>
            {f.tgroup && (
              <div className="tkinds">
                {PRODUCT_TYPES.filter((p) => p.group === f.tgroup).map((p) => (
                  <button key={p.id} type="button" className={`mode ${f.ptype === p.id ? "on" : ""}`} onClick={() => pickType(p.id)}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sec">
            <div className="sec-t">🏷 Barcodes</div>
            <div className="sec-s">One product, many barcodes — each barcode belongs to this code only.</div>
            {f.barcodes.map((b, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="bc-row" key={i}>
                <span className="bc-n">{i + 1}</span>
                <input className="i mono" data-scan-input="" value={b} onChange={(e) => setBc(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (b.trim() && i === f.barcodes.length - 1) addBc(); } }}
                  placeholder={`Barcode ${i + 1} — scan or type`} />
                <button type="button" className="btn dan icon" onClick={() => delBc(i)} title="Remove this barcode"
                  disabled={f.barcodes.length === 1 && !b}>🗑</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={addBc}>➕ Another barcode</button>
            <div className="hint">🔫 With the handheld reader: click a box and scan — Enter opens the next box.</div>
          </div>

          <div>
            <div className="sec">
              <div className="sec-t">⏳ Shelf life</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input className="i" type="number" min={0} max={3650} value={f.shelfDays}
                  onChange={(e) => set("shelfDays", e.target.value)} placeholder="days" style={{ width: 140 }} />
                <span className="unit">days</span>
              </div>
              <div className="hint">
                Empty = {shelfHint || "no shelf life"}. 0 = no automatic expiry. The Raw Material Receipt calculates the expiry from it.
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-t">🌡 Storage temperature</div>
            <div className="sec-s">Optional — tap again to clear.</div>
            <div className="modes">
              {Object.entries(STORAGE).map(([k, v]) => (
                <button key={k} type="button" className={`mode ${f.mode === k ? "on" : ""}`} onClick={() => pickMode(k)}>{v.icon} {v.label}</button>
              ))}
            </div>
            {f.mode && (
              <div className="temps">
                <span className="unit">from</span>
                <input className="i" type="number" step="0.5" value={f.tMin} onChange={(e) => set("tMin", e.target.value)} placeholder="min" />
                <span className="unit">to</span>
                <input className="i" type="number" step="0.5" value={f.tMax} onChange={(e) => set("tMax", e.target.value)} placeholder="max" />
                <span className="unit">°C</span>
              </div>
            )}
          </div>

          </div>
          <div className="col">
          <div className="sec">
            <div className="sec-t">⚠️ Allergens</div>
            <div className="sec-s">Tap what the product contains.</div>
            <div className="alg">
              {ALLERGENS.map((a) => (
                <button key={a.id} type="button" className={f.allergens.includes(a.id) ? "on" : ""} onClick={() => flipAllergen(a.id)}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sec">
            <div className={`sw ${f.active ? "on" : ""}`} role="switch" aria-checked={f.active} tabIndex={0}
              onClick={() => set("active", !f.active)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); set("active", !f.active); } }}>
              <i />
              <div>
                <b>{f.active ? "Active" : "Stopped"}</b>
                <div className="hint" style={{ margin: 0 }}>
                  {f.active ? "Shows in every product list of the app." : "Hidden from the product lists — kept, and old records still show it."}
                </div>
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-t">🖼 Product photos</div>
            <div className="sec-s">Optional — the first one is the main photo; tap another to make it main.</div>
            <div className="imgs">
              {f.images.map((u, i) => (
                <div className="img" key={u}>
                  <img src={thumbUrl(u, 200)} alt={`Product ${i + 1}`} onClick={() => makeMain(u)} title={i ? "Make it the main photo" : "Main photo"} style={{ cursor: i ? "pointer" : "default" }} />
                  {i === 0 && <span className="main">Main</span>}
                  <button type="button" onClick={() => delImage(u)} aria-label="Remove photo">✕</button>
                </div>
              ))}
              <button type="button" className="add-img" onClick={() => fileRef.current?.click()} disabled={busy}>
                <span>📷</span>
                {uploading ? `Uploading ${uploading}…` : "Add photos"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }} />
            </div>
          </div>

          </div>
          </div>

          {err && (
            <div className="err">
              {err.conflicts ? (
                <>
                  <div>These barcodes already belong to another product: {err.text}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>One barcode can belong to one code only.</div>
                  <button type="button" className="btn dan" style={{ marginTop: 10 }} onClick={() => save(true)} disabled={busy}>
                    Move them to this product
                  </button>
                </>
              ) : err.text}
            </div>
          )}
        </div>

        <div className="pfm-foot">
          <button type="button" className="btn" onClick={cancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn pri" onClick={() => save(false)} disabled={busy || uploading > 0}>
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
