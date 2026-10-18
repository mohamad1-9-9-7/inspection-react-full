// src/pages/settings/ProductFormModal.jsx
//
// ➕ / ✏️ The product window of the Products Catalog: name, code, as many
// barcodes as the product has, its shelf life and its photos — one Save.
//
//   <ProductFormModal open mode="add"|"edit" initial={…} codeLocked shelfHint
//     onSave={async (data, { move }) => …} onClose={…} />
//
// initial = { code, name, barcodes: [], shelfDays: "", images: [] }
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

const BLANK = { code: "", name: "", barcodes: [""], shelfDays: "", images: [] };

const CSS = `
.pfm { position:fixed; inset:0; z-index:10500; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:12px;
  font-family: system-ui,-apple-system,"Segoe UI",Cairo,sans-serif; color:#0f172a; font-size:14px; }
.pfm-box { background:#fff; border-radius:16px; width:min(720px,100%); max-height:96vh; display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 24px 60px rgba(2,6,23,.32); direction:ltr; }
.pfm-head { padding:14px 18px; background:linear-gradient(135deg,#0ea5e9,#0d9488); color:#fff; display:flex; align-items:center; gap:10px; }
.pfm-head h2 { margin:0; font-size:18px; font-weight:900; flex:1; }
.pfm-x { border:0; background:rgba(255,255,255,.18); color:#fff; border-radius:10px; width:34px; height:34px; font-size:16px; cursor:pointer; }
.pfm-body { padding:16px 18px; overflow:auto; display:flex; flex-direction:column; gap:14px; }
.pfm-grid { display:grid; grid-template-columns: 1fr 180px; gap:12px; }
@media (max-width:560px) { .pfm-grid { grid-template-columns:1fr; } }
.pfm label.l { display:block; font-weight:800; font-size:13px; color:#334155; margin-bottom:5px; }
.pfm .req { color:#dc2626; }
.pfm input.i { width:100%; box-sizing:border-box; border:1.5px solid #cbd5e1; border-radius:10px; padding:9px 11px; font-size:14px; font-family:inherit; background:#fff; color:#0f172a; }
.pfm input.i:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.18); }
.pfm input.i:disabled { background:#f1f5f9; color:#64748b; }
.pfm input.mono { font-family: ui-monospace,Consolas,monospace; }
.pfm .hint { color:#64748b; font-size:12px; margin-top:4px; }
.pfm .sec { border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#f8fbff; }
.pfm .sec-t { font-weight:900; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
.pfm .bc-row { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
.pfm .bc-n { width:24px; text-align:center; font-weight:900; color:#64748b; }
.pfm .btn { border:1.5px solid #cbd5e1; background:#fff; color:#0f172a; border-radius:10px; padding:8px 14px; font-weight:800; font-size:13px; cursor:pointer; font-family:inherit; }
.pfm .btn:disabled { opacity:.55; cursor:default; }
.pfm .btn.pri { background:#0ea5e9; border-color:#0ea5e9; color:#fff; }
.pfm .btn.dan { color:#b91c1c; border-color:#fecaca; }
.pfm .btn.sm { padding:5px 10px; }
.pfm .imgs { display:flex; flex-wrap:wrap; gap:10px; }
.pfm .img { position:relative; width:96px; height:96px; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; background:#fff; }
.pfm .img img { width:100%; height:100%; object-fit:cover; display:block; }
.pfm .img button { position:absolute; top:4px; right:4px; border:0; border-radius:8px; background:rgba(15,23,42,.7); color:#fff; width:24px; height:24px; cursor:pointer; font-size:12px; }
.pfm .img .main { position:absolute; left:4px; bottom:4px; background:#0d9488; color:#fff; font-size:10px; font-weight:800; border-radius:6px; padding:1px 6px; }
.pfm .add-img { width:96px; height:96px; border-radius:10px; border:2px dashed #94a3b8; background:#fff; color:#475569; font-weight:800; font-size:12px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
.pfm .err { color:#b91c1c; font-weight:800; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 12px; }
.pfm-foot { padding:12px 18px; border-top:1px solid #e2e8f0; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; background:#fff; }
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
    if (uploading) return setErr({ text: "Wait for the photos to finish uploading." });
    setBusy(true); setErr(null);
    try {
      await onSave({ code, name, barcodes: bcs, shelfDays: sd, images: f.images }, { move });
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
          <span style={{ fontSize: 22 }}>{mode === "edit" ? "✏️" : "➕"}</span>
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
              {codeLocked && <div className="hint">Master code — can't change.</div>}
            </div>
          </div>

          <div className="sec">
            <div className="sec-t">🏷 Barcodes <span className="hint" style={{ margin: 0, fontWeight: 600 }}>one product, many barcodes — each barcode on this code only</span></div>
            {f.barcodes.map((b, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="bc-row" key={i}>
                <span className="bc-n">{i + 1}</span>
                <input className="i mono" data-scan-input="" value={b} onChange={(e) => setBc(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (b.trim() && i === f.barcodes.length - 1) addBc(); } }}
                  placeholder={`Barcode ${i + 1} — scan or type`} />
                <button type="button" className="btn dan sm" onClick={() => delBc(i)} title="Remove this barcode"
                  disabled={f.barcodes.length === 1 && !b}>🗑</button>
              </div>
            ))}
            <button type="button" className="btn sm" onClick={addBc}>➕ Another barcode</button>
            <div className="hint">🔫 With the handheld reader: click a box and scan — Enter opens the next box.</div>
          </div>

          <div className="pfm-grid">
            <div className="sec">
              <div className="sec-t">⏳ Shelf life</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input className="i" type="number" min={0} max={3650} value={f.shelfDays}
                  onChange={(e) => set("shelfDays", e.target.value)} placeholder="days" style={{ width: 110 }} />
                <span style={{ fontWeight: 800, color: "#475569" }}>days</span>
              </div>
              <div className="hint">
                Empty = {shelfHint || "no shelf life"}. 0 = no automatic expiry. The Raw Material Receipt calculates the expiry from it.
              </div>
            </div>
            <div />
          </div>

          <div className="sec">
            <div className="sec-t">🖼 Product photos <span className="hint" style={{ margin: 0, fontWeight: 600 }}>optional — the first one is the main photo</span></div>
            <div className="imgs">
              {f.images.map((u, i) => (
                <div className="img" key={u}>
                  <img src={thumbUrl(u, 200)} alt={`Product ${i + 1}`} onClick={() => makeMain(u)} title={i ? "Make it the main photo" : "Main photo"} style={{ cursor: i ? "pointer" : "default" }} />
                  {i === 0 && <span className="main">Main</span>}
                  <button type="button" onClick={() => delImage(u)} aria-label="Remove photo">✕</button>
                </div>
              ))}
              <button type="button" className="add-img" onClick={() => fileRef.current?.click()} disabled={busy}>
                <span style={{ fontSize: 22 }}>📷</span>
                {uploading ? `Uploading ${uploading}…` : "Add photos"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }} />
            </div>
          </div>

          {err && (
            <div className="err">
              {err.conflicts ? (
                <>
                  <div>These barcodes already belong to another product: {err.text}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>One barcode can belong to one code only.</div>
                  <button type="button" className="btn dan sm" style={{ marginTop: 8 }} onClick={() => save(true)} disabled={busy}>
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
