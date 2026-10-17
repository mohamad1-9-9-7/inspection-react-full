// src/pages/coldrooms/StockPanel.jsx
//
// 📦 What is inside one cold room — shown when its door is clicked, or when
// the walker steps inside. Same four columns as the stock export:
//   code · Product · Unit of Measure · Available Quantity
// Editing (permission "coldRooms" edit): add a row by our item code (the
// product and its unit fill from the catalogue), import the Excel export,
// and — later — scan a barcode (the button is in place, not active yet).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { kindOf, verdict } from "./coldRoomsConfig";
import { loadCatalog, mergeItems, normalizeItem, parseStockFile, totalQty } from "./coldRoomsStock";

const TXS = {
  en: {
    inside: "Inside", products: "products", total: "Total quantity", empty: "No goods recorded in this room yet.",
    emptyHint: "Add the products by code, or import the stock Excel (code · Product · Unit of Measure · Available Quantity).",
    search: "Search code or product…", code: "Code", product: "Product", uom: "Unit of Measure", qty: "Available Quantity",
    edit: "Edit goods", add: "Add product", import: "Import Excel", scan: "Scan barcode", soon: "soon",
    save: "Save", cancel: "Cancel", saving: "Saving…", saved: "Saved", remove: "Remove",
    imported: (n) => `${n} row(s) read from the file — same code replaced, new codes added. Press Save to keep them.`,
    noHeader: "No header row with “code” and “Product” was found in the file.",
    unknown: "Code not in the catalogue", temp: "Now", allowed: "Allowed", updated: "Last update",
    explain: (k) => `A ${k} — the goods below are what the stock list says is stored here.`,
  },
  ar: {
    inside: "داخل", products: "منتج", total: "إجمالي الكمية", empty: "لا توجد بضاعة مسجلة في هذه الغرفة بعد.",
    emptyHint: "أضف المنتجات بالكود، أو استورد ملف Excel للمخزون (code · Product · Unit of Measure · Available Quantity).",
    search: "ابحث بالكود أو اسم المنتج…", code: "الكود", product: "المنتج", uom: "وحدة القياس", qty: "الكمية المتوفرة",
    edit: "تعديل البضاعة", add: "إضافة منتج", import: "استيراد Excel", scan: "مسح الباركود", soon: "قريباً",
    save: "حفظ", cancel: "إلغاء", saving: "جارٍ الحفظ…", saved: "تم الحفظ", remove: "إزالة",
    imported: (n) => `تمت قراءة ${n} سطر من الملف — نفس الكود يُستبدل والكود الجديد يُضاف. اضغط حفظ لتثبيتها.`,
    noHeader: "لم يتم العثور على سطر عناوين فيه «code» و«Product» في الملف.",
    unknown: "الكود غير موجود في قائمة الأصناف", temp: "الآن", allowed: "المسموح", updated: "آخر تحديث",
    explain: (k) => `هذه الغرفة ${k} — البضاعة أدناه هي المسجّلة كمخزنة فيها.`,
  },
};

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.crs.crs { display:grid; gap:10px; }
.crs.crs .crs-tbl { width:100%; border-collapse:collapse; }
.crs.crs .crs-tbl th { font-size:${fs(12)}; font-weight:900; color:#475569; background:#f1f5f9; padding:7px 8px; text-align:start; position:sticky; top:0; white-space:nowrap; }
.crs.crs .crs-tbl td { font-size:${fs(13.5)}; padding:6px 8px; border-top:1px solid #eef2f7; vertical-align:middle; }
.crs.crs .crs-tbl td.num, .crs.crs .crs-tbl th.num { text-align:end; font-variant-numeric:tabular-nums; }
.crs.crs .crs-tbl tr:hover td { background:#f8fbff; }
.crs.crs .crs-cell { font-size:${fs(13.5)}; font-weight:700; padding:5px 7px; border-radius:7px; border:1px solid #cbd5e1; width:100%; box-sizing:border-box; font-family:inherit; background:#fff; }
.crs.crs .crs-wrap { max-height:46vh; overflow:auto; border:1px solid #e2e8f0; border-radius:12px; }
.crs.crs .crs-stat { font-size:${fs(22)}; font-weight:900; font-variant-numeric:tabular-nums; }
`;

export default function StockPanel({ index, room, live, stock, editable, ar, onSave }) {
  const s = TXS[ar ? "ar" : "en"];
  const k = kindOf(room.kind);
  const items = useMemo(() => stock?.items || [], [stock]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(null); // null = viewing
  const [catalog, setCatalog] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setDraft(null); setNote(""); setQ(""); }, [index]);
  useEffect(() => {
    if (draft && !catalog) loadCatalog().then(setCatalog);
  }, [draft, catalog]);

  const rows = draft || items;
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = rows.map((it, i) => ({ it, i }));
    if (!n) return list;
    return list.filter(({ it }) => it.code.toLowerCase().includes(n) || it.product.toLowerCase().includes(n));
  }, [rows, q]);

  const setRow = (i, patch) => setDraft((d) => d.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const onCode = (i, code) => {
    const hit = catalog?.get(String(code).trim());
    setRow(i, hit ? { code, product: hit.product, uom: hit.uom || rows[i].uom } : { code });
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const got = await parseStockFile(f);
      setDraft((d) => mergeItems(d || items, got));
      setNote(s.imported(got.length));
    } catch (err) {
      setNote(err?.message === "NO_HEADER" ? s.noHeader : String(err?.message || err));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.map(normalizeItem).filter((it) => it.code || it.product));
      setDraft(null);
      setNote(s.saved);
    } catch (err) {
      setNote(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const value = live?.value;
  const st = value != null ? verdict(room, value) : "none";
  const stColor = { ok: "#16a34a", warn: "#d97706", out: "#dc2626", none: "#64748b" }[st];

  return (
    <div className="crs crs">
      <style>{CSS}</style>

      {/* what this room is */}
      <div style={{ borderRadius: 14, padding: 12, background: `linear-gradient(135deg, ${k.color}14, #ffffff)`, border: `1px solid ${k.color}40` }}>
        <div className="cr-ptitle">🚪 {s.inside} {index + 1}. {room.name}</div>
        <div className="cr-small" style={{ marginTop: 2 }}>{k.emoji} {s.explain(ar ? k.ar : k.en.toLowerCase())}</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
          <div><div className="cr-lbl">{s.temp}</div><div className="crs-stat" style={{ color: stColor }}>{value != null ? `${value}°C` : "—"}</div></div>
          <div><div className="cr-lbl">{s.allowed}</div><div className="crs-stat">{room.min}…{room.max}°C</div></div>
          <div><div className="cr-lbl">{s.products}</div><div className="crs-stat">{items.length}</div></div>
          <div><div className="cr-lbl">{s.total}</div><div className="crs-stat">{totalQty(items).toLocaleString()}</div></div>
        </div>
      </div>

      {/* tools */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input className="cr-input" style={{ flex: "1 1 160px", width: "auto" }} placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="cr-btn" disabled title={s.soon}>📷 {s.scan} · {s.soon}</button>
        {editable && !draft ? (
          <button type="button" className="cr-btn pri" onClick={() => { setDraft(items.map((it) => ({ ...it }))); setNote(""); }}>✏️ {s.edit}</button>
        ) : null}
      </div>
      {draft ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="cr-btn" onClick={() => setDraft((d) => [{ code: "", product: "", uom: "", qty: 0 }, ...d])}>➕ {s.add}</button>
          <button type="button" className="cr-btn" onClick={() => fileRef.current?.click()}>📥 {s.import}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
          <span style={{ flex: 1 }} />
          <button type="button" className="cr-btn" onClick={() => { setDraft(null); setNote(""); }} disabled={saving}>{s.cancel}</button>
          <button type="button" className="cr-btn pri" onClick={save} disabled={saving}>{saving ? s.saving : s.save}</button>
        </div>
      ) : null}
      {note ? <div className="cr-small" style={{ fontWeight: 800, color: "#0369a1" }}>{note}</div> : null}

      {/* the goods */}
      {!rows.length ? (
        <div className="cr-small" style={{ padding: 14, textAlign: "center", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontWeight: 800 }}>📦 {s.empty}</div>
          <div style={{ marginTop: 4 }}>{s.emptyHint}</div>
        </div>
      ) : (
        <div className="crs-wrap">
          <table className="crs-tbl">
            <thead>
              <tr>
                <th>{s.code}</th>
                <th>{s.product}</th>
                <th>{s.uom}</th>
                <th className="num">{s.qty}</th>
                {draft ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {shown.map(({ it, i }) => (
                <tr key={draft ? i : `${it.code}-${i}`}>
                  {draft ? (
                    <>
                      <td style={{ width: 92 }}>
                        <input className="crs-cell" dir="ltr" value={it.code} onChange={(e) => onCode(i, e.target.value)}
                          title={catalog && it.code && !catalog.has(it.code.trim()) ? s.unknown : undefined}
                          style={catalog && it.code && !catalog.has(it.code.trim()) ? { borderColor: "#f59e0b" } : undefined} />
                      </td>
                      <td><input className="crs-cell" dir="ltr" value={it.product} onChange={(e) => setRow(i, { product: e.target.value })} /></td>
                      <td style={{ width: 70 }}><input className="crs-cell" dir="ltr" value={it.uom} onChange={(e) => setRow(i, { uom: e.target.value })} /></td>
                      <td style={{ width: 92 }}><input className="crs-cell" type="number" step="any" value={it.qty} onChange={(e) => setRow(i, { qty: e.target.value })} /></td>
                      <td style={{ width: 34 }}>
                        <button type="button" className="cr-btn" style={{ padding: "3px 8px" }} title={s.remove}
                          onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td dir="ltr" style={{ fontWeight: 800 }}>{it.code}</td>
                      <td dir="ltr">{it.product}</td>
                      <td dir="ltr">{it.uom}</td>
                      <td className="num" style={{ fontWeight: 800 }}>{Number(it.qty).toLocaleString()}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stock?.updatedAt && !draft ? (
        <div className="cr-small">{s.updated}: {new Date(stock.updatedAt).toLocaleString(ar ? "ar-AE" : "en-GB")}{stock.updatedBy ? ` · ${stock.updatedBy}` : ""}</div>
      ) : null}
    </div>
  );
}
