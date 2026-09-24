// src/pages/complaints/complaintsPieces.jsx
// -----------------------------------------------------------------------------
// Small reusable UI pieces used by the complaint form page:
//   - CategoriesPicker : coloured toggle cards for CATEGORIES
//   - SeverityPicker   : radio pills for SEVERITY
//   - ItemsEditor      : the code/name/qty table (uses the shared catalog)
//   - PhotoUploader    : Cloudinary upload with progress + thumbs
// -----------------------------------------------------------------------------

import React, { useRef, useState } from "react";
import { uploadImage, deleteImage, thumbUrl } from "../../utils/imageUpload";
import { ItemCodeInput, ItemNameInput } from "../monitor/branches/_shared/CodedProductField";
import {
  CATEGORIES, SEVERITY, QTY_UNITS, MAX_IMAGES, emptyItem, makeCustomCategory,
} from "./complaintsCore";

/* ═════ Categories toggle ═════
   `categories` is the merged list (built-ins + admin-added). When
   `onAddCategory` is supplied an inline "add reason" row is shown; adding a
   reason persists it and auto-selects it. Custom reasons carry a small ✕. */
export function CategoriesPicker({ value = [], onChange, categories, onAddCategory, onRemoveCategory }) {
  const list = categories && categories.length ? categories : CATEGORIES;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (id) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  const add = async () => {
    const label = draft.trim();
    if (!label) return;
    if (list.some((c) => (c.en || c.ar || "").trim().toLowerCase() === label.toLowerCase())) {
      setErr("This reason already exists.");
      return;
    }
    if (!onAddCategory) return;
    setBusy(true); setErr("");
    try {
      const cat = makeCustomCategory(label);
      await onAddCategory(cat);
      onChange(Array.from(new Set([...value, cat.id])));
      setDraft("");
    } catch (e) {
      setErr(`Failed to save the reason: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async (e, cat) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRemoveCategory) return;
    if (!window.confirm(`Remove the reason “${cat.en || cat.ar}” from the list? (Older complaints using it will no longer show it)`)) return;
    try {
      await onRemoveCategory(cat.id);
      onChange(value.filter((id) => id !== cat.id));
    } catch (er) {
      setErr(`Failed to remove the reason: ${er?.message || er}`);
    }
  };

  return (
    <>
      <div className="qc-cats">
        {list.map((c) => {
          const on = value.includes(c.id);
          return (
            <label
              key={c.id}
              className={`qc-cat${on ? " on" : ""}`}
              style={on ? { background: c.tone, borderColor: c.tone } : {}}
            >
              <span className="qc-cat-ic" style={{ color: c.tone }}>{c.icon}</span>
              <span style={{ flex: 1 }}>{c.en || c.ar}</span>
              {c.custom && onRemoveCategory && (
                <span
                  role="button"
                  title="Remove this reason"
                  onClick={(e) => removeCustom(e, c)}
                  style={{
                    fontSize: 12, fontWeight: 900, cursor: "pointer", padding: "0 4px",
                    borderRadius: 6, opacity: 0.75,
                  }}
                >
                  ✕
                </span>
              )}
              <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
            </label>
          );
        })}
      </div>

      {onAddCategory && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (err) setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Type a new reason, then press “Add”…"
            style={{
              flex: "1 1 240px", minWidth: 200, padding: "10px 12px",
              border: "1.5px solid #cbd5e1", borderRadius: 12, fontFamily: "inherit",
              background: "#fff", color: "#0f172a",
            }}
          />
          <button
            type="button"
            className="qc-btn teal"
            onClick={add}
            disabled={busy || !draft.trim()}
          >
            {busy ? "Saving…" : "➕ Add reason"}
          </button>
        </div>
      )}
      {err && <div className="qc-alert warn" style={{ marginTop: 8 }}>⚠️ {err}</div>}
    </>
  );
}

/* ═════ Severity pills ═════ */
export function SeverityPicker({ value, onChange }) {
  return (
    <div className="qc-sevpick">
      {SEVERITY.map((s) => {
        const on = s.id === value;
        return (
          <button
            type="button"
            key={s.id}
            className={on ? "on" : ""}
            style={on ? { background: s.tone } : {}}
            onClick={() => onChange(s.id)}
          >
            {s.icon} {s.en}
          </button>
        );
      })}
    </div>
  );
}

/* ═════ Items editor ═════ */
export function ItemsEditor({ items, onChange }) {
  const set = (i, patch) => onChange(items.map((r, ix) => (ix === i ? { ...r, ...patch } : r)));
  const add = () => onChange([...items, emptyItem()]);
  const rm = (i) => onChange(items.filter((_, ix) => ix !== i));

  return (
    <>
      <table className="qc-items">
        <thead>
          <tr>
            <th style={{ width: 34 }}>#</th>
            <th style={{ width: 150 }}>Code</th>
            <th>Product name (auto from code)</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 120 }}>Unit</th>
            <th style={{ width: 140 }}>Expiry</th>
            <th style={{ width: 170 }}>Item remark</th>
            <th style={{ width: 42 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i}>
              <td style={{ textAlign: "center", fontWeight: 900 }}>{i + 1}</td>
              <td>
                <ItemCodeInput
                  code={row.itemCode}
                  name={row.productName}
                  onChange={({ code, name }) => set(i, { itemCode: code, productName: name })}
                  style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff" }}
                  placeholder="Search/select code"
                  accent="#4f46e5"
                />
              </td>
              <td>
                <ItemNameInput
                  code={row.itemCode}
                  name={row.productName}
                  onChange={({ code, name }) => set(i, { itemCode: code, productName: name })}
                  style={{ padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#f8fafc", color: "#0f172a" }}
                  placeholder="Product name (select from catalog)"
                  accent="#4f46e5"
                  readOnly
                />
              </td>
              <td><input value={row.quantity} onChange={(e) => set(i, { quantity: e.target.value })} inputMode="decimal" /></td>
              <td>
                <select value={row.qtyUnit} onChange={(e) => set(i, { qtyUnit: e.target.value })}>
                  {QTY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {row.qtyUnit === "Other" && (
                  <input
                    style={{ marginTop: 4 }}
                    placeholder="Specify unit"
                    value={row.customQtyUnit || ""}
                    onChange={(e) => set(i, { customQtyUnit: e.target.value })}
                  />
                )}
              </td>
              <td><input type="date" value={row.expiry} onChange={(e) => set(i, { expiry: e.target.value })} /></td>
              <td><input value={row.remarks} onChange={(e) => set(i, { remarks: e.target.value })} placeholder="e.g. EXPIRED" /></td>
              <td>
                {items.length > 1 && (
                  <button type="button" className="qc-rm" onClick={() => rm(i)} title="Remove row">✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="qc-btn gray" onClick={add} style={{ marginTop: 8 }}>
        + Add item
      </button>
    </>
  );
}

/* ═════ Photos ═════
   Uses the native <label htmlFor> association instead of a JS-triggered click.
   The input is positioned off-screen (not display:none) — some browsers refuse
   to open a file dialog for a display:none input even when the click was a
   real user gesture. Each PhotoUploader instance gets its own input id so two
   uploaders on the same page never collide. */
let _uploaderSeq = 0;
export function PhotoUploader({ images, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const idRef = useRef(`qc-photo-${++_uploaderSeq}`);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");

  const room = Math.max(0, MAX_IMAGES - images.length);

  const upload = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const batch = files.slice(0, room);
    if (files.length > batch.length) {
      setErr(`Maximum (${MAX_IMAGES} images) exceeded. Only the first ${batch.length} were added.`);
    } else setErr("");

    const urls = [];
    for (let i = 0; i < batch.length; i++) {
      setBusy({ done: i, total: batch.length });
      try {
        // eslint-disable-next-line no-await-in-loop
        urls.push(await uploadImage(batch[i], "qa_complaint_photo"));
      } catch (e) {
        setErr(`Image upload failed: ${e?.message || e}`);
      }
    }
    setBusy(null);
    if (urls.length) onAdd(urls);
  };

  const remove = async (i) => {
    const url = images[i];
    onRemove(i);
    try { await deleteImage(url); } catch { /* ignore */ }
  };

  const hiddenInputStyle = {
    position: "absolute",
    width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
    clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
  };

  return (
    <>
      {err && <div className="qc-alert warn">⚠️ {err}</div>}
      {images.length > 0 && (
        <div className="qc-photos">
          {images.map((src, i) => (
            <figure key={`${src}_${i}`} className="qc-thumb">
              <img src={thumbUrl(src, 240)} alt={`#${i + 1}`} loading="lazy" />
              <button type="button" className="qc-thumb-rm" onClick={() => remove(i)} title="Remove">✕</button>
            </figure>
          ))}
        </div>
      )}
      <div className="qc-uploader">
        {/* Off-screen, not display:none — the label click below MUST reach a
            real file input for the file dialog to open on every browser. */}
        <input
          ref={inputRef}
          id={idRef.current}
          type="file"
          accept="image/*"
          multiple
          style={hiddenInputStyle}
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; upload(files); }}
        />
        <label className="qc-file" htmlFor={idRef.current}>
          📷 {images.length ? "Add more photos" : "Add photos"}
        </label>
        {/* A backup button for corner cases where a label click is intercepted
            by a wrapping element — no-op if the label already worked. */}
        <button
          type="button"
          className="qc-btn gray"
          style={{ padding: "6px 10px", fontSize: 12 }}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </button>
        <span>({images.length} / {MAX_IMAGES})</span>
        {busy && (
          <>
            <progress value={busy.done} max={busy.total} />
            <span>Uploading image {busy.done + 1} of {busy.total}…</span>
          </>
        )}
      </div>
    </>
  );
}
