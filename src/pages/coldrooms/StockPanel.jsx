// src/pages/coldrooms/StockPanel.jsx
//
// 📦 The products inside one cold room — shown when its door is clicked, or
// when the walker steps inside. Same columns as the stock export:
//   code · Product · Unit of Measure · Available Quantity
// plus, for lots added from the cooler QR page, supplier · production ·
// expiry · pieces.
//
// DISPLAY ONLY (user, 17 Oct 2026): products are never edited from the 3D
// screen. They go in and out from the QR page on the unit itself
// (monitor/branches/_shared/QuickGoodsPanel.jsx).

import React, { useEffect, useMemo, useState } from "react";
import { kindOf, verdict } from "./coldRoomsConfig";
import { totalQty } from "./coldRoomsStock";

const TXS = {
  en: {
    inside: "Inside", products: "products", total: "Total quantity", empty: "No products recorded in this room yet.",
    emptyHint: "Products are added and taken out from the QR page on the unit.",
    search: "Search code or product…", code: "Code", product: "Product", uom: "Unit of Measure", qty: "Available Quantity",
    supplier: "Supplier", prod: "Production", exp: "Expiry", pcs: "Pieces",
    back: "← All products", tapHint: "Tap a product to see its details.", details: "Product details",
    daysLeft: (n) => (n < 0 ? `Expired ${-n} day(s) ago` : n === 0 ? "Expires today" : `${n} day(s) left`),
    moves: "Its moves", noMoves: "No moves recorded for this product.", in: "In", out: "Out",
    keeper: "Storekeeper", toCustomer: "to a customer", to: "to", none: "—",
    temp: "Now", allowed: "Allowed", updated: "Last update",
    explain: (k) => `A ${k} — the products below are what is recorded as stored here.`,
  },
  ar: {
    inside: "داخل", products: "منتج", total: "إجمالي الكمية", empty: "لا توجد منتجات مسجلة في هذه الغرفة بعد.",
    emptyHint: "المنتجات تُدخل وتُخرج من صفحة الـQR على الوحدة نفسها.",
    search: "ابحث بالكود أو اسم المنتج…", code: "الكود", product: "المنتج", uom: "وحدة القياس", qty: "الكمية المتوفرة",
    supplier: "المورد", prod: "الإنتاج", exp: "الانتهاء", pcs: "الحبات",
    back: "→ كل المنتجات", tapHint: "اضغط على أي منتج لترى تفاصيله.", details: "تفاصيل المنتج",
    daysLeft: (n) => (n < 0 ? `منتهي منذ ${-n} يوم` : n === 0 ? "ينتهي اليوم" : `باقي ${n} يوم`),
    moves: "حركاته", noMoves: "لا توجد حركات مسجلة لهذا المنتج.", in: "إدخال", out: "إخراج",
    keeper: "أمين المخزن", toCustomer: "إلى زبون", to: "إلى", none: "—",
    temp: "الآن", allowed: "المسموح", updated: "آخر تحديث",
    explain: (k) => `هذه الغرفة ${k} — المنتجات أدناه هي المسجّلة كمخزنة فيها.`,
  },
};

const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : iso || "");

const daysTo = (iso) => {
  if (!/^d{4}-d{2}-d{2}$/.test(iso || "")) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - t0) / 86400000);
};
const expColor = (n) => (n == null ? "#64748b" : n < 0 ? "#dc2626" : n <= 3 ? "#d97706" : "#16a34a");
const sameLot = (a, b) => ["code", "product", "supplier", "prodDate", "expDate"].every((k) => String(a[k] || "") === String(b[k] || ""));

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.crs.crs { display:grid; gap:10px; }
.crs.crs .crs-tbl { width:100%; border-collapse:collapse; table-layout:fixed; }
.crs.crs .crs-tbl tbody tr { cursor:pointer; }
/* grid lines between every column and row */
.crs.crs .crs-tbl th, .crs.crs .crs-tbl td { border:1px solid #d7dee8 !important; }
.crs.crs .crs-tbl th { border-bottom:2px solid #cbd5e1 !important; }
.crs.crs .crs-wrap .crs-tbl { border-style:hidden; }
.crs.crs .crs-tbl td { overflow-wrap:anywhere; }
.crs.crs .crs-det { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
.crs.crs .crs-det > div { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; }
.crs.crs .crs-dv { font-size:${fs(16)}; font-weight:800; margin-top:2px; overflow-wrap:anywhere; }
.crs.crs .crs-tbl th { font-size:${fs(12)}; font-weight:900; color:#475569; background:#f1f5f9; padding:7px 8px; text-align:start; position:sticky; top:0; white-space:normal; }
.crs.crs .crs-tbl td { font-size:${fs(13.5)}; padding:6px 8px; border-top:1px solid #eef2f7; vertical-align:middle; }
.crs.crs .crs-tbl td.num, .crs.crs .crs-tbl th.num { text-align:end; font-variant-numeric:tabular-nums; }
.crs.crs .crs-tbl tr:hover td { background:#f8fbff; }
.crs.crs .crs-wrap { max-height:46vh; overflow-y:auto; overflow-x:hidden; border:1px solid #e2e8f0; border-radius:12px; }
.crs.crs .crs-stat { font-size:${fs(20)}; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap; }
.crs.crs .crs-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(96px,1fr)); gap:8px 12px; margin-top:8px; }
.crs.crs .crs-tbl td.code { white-space:nowrap; font-weight:800; }
`;

export default function StockPanel({ index, room, live, stock, ar }) {
  const s = TXS[ar ? "ar" : "en"];
  const k = kindOf(room.kind);
  const items = useMemo(() => stock?.items || [], [stock]);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(null); // the product (lot) whose details are shown

  useEffect(() => { setQ(""); setOpen(null); }, [index]);

  // expiry column only when some row has one; the rest is in the details
  const hasLots = items.some((it) => it.expDate);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((it) => it.code.toLowerCase().includes(n) || it.product.toLowerCase().includes(n)
      || String(it.supplier || "").toLowerCase().includes(n));
  }, [items, q]);

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
        <div className="crs-stats">
          <div><div className="cr-lbl">{s.temp}</div><div className="crs-stat" style={{ color: stColor }}>{value != null ? `${value}°C` : "—"}</div></div>
          <div><div className="cr-lbl">{s.allowed}</div><div className="crs-stat" dir="ltr">{room.min} … {room.max}°C</div></div>
          <div><div className="cr-lbl">{s.products}</div><div className="crs-stat">{items.length}</div></div>
          <div><div className="cr-lbl">{s.total}</div><div className="crs-stat">{totalQty(items).toLocaleString()}</div></div>
        </div>
      </div>

      {open ? (
        <ProductDetails it={open} moves={(stock?.moves || []).filter((m) => sameLot(m, open))} s={s} ar={ar} onBack={() => setOpen(null)} />
      ) : items.length > 0 ? (
        <>
          <input className="cr-input" placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="cr-small">{s.tapHint}</div>
        </>
      ) : null}

      {/* the products */}
      {open ? null : !items.length ? (
        <div className="cr-small" style={{ padding: 14, textAlign: "center", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontWeight: 800 }}>📦 {s.empty}</div>
          <div style={{ marginTop: 4 }}>{s.emptyHint}</div>
        </div>
      ) : (
        <div className="crs-wrap">
          <table className="crs-tbl">
            <thead>
              <tr>
                <th style={{ width: 84 }}>{s.code}</th>
                <th>{s.product}</th>
                <th style={{ width: 74 }}>{s.uom}</th>
                <th className="num" style={{ width: 92 }}>{s.qty}</th>
                {hasLots ? <th style={{ width: 96 }}>{s.exp}</th> : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((it, i) => {
                const left = daysTo(it.expDate);
                return (
                  <tr key={`${it.code}-${it.supplier || ""}-${it.expDate || ""}-${i}`} onClick={() => setOpen(it)} title={s.details}>
                    <td dir="ltr" className="code">{it.code}</td>
                    <td dir="ltr">{it.product}</td>
                    <td dir="ltr">{it.uom}</td>
                    <td className="num" style={{ fontWeight: 800 }}>{Number(it.qty).toLocaleString()}</td>
                    {hasLots ? <td dir="ltr" style={{ color: expColor(left), fontWeight: 700 }}>{dmy(it.expDate)}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {stock?.updatedAt ? (
        <div className="cr-small">{s.updated}: {new Date(stock.updatedAt).toLocaleString(ar ? "ar-AE" : "en-GB")}{stock.updatedBy ? ` · ${stock.updatedBy}` : ""}</div>
      ) : null}
    </div>
  );
}

/* One product (lot) on its own: everything recorded about it and its moves. */
function ProductDetails({ it, moves, s, ar, onBack }) {
  const left = daysTo(it.expDate);
  const num = (v) => Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const cell = (label, value, style) => (
    <div>
      <div className="cr-lbl">{label}</div>
      <div className="crs-dv" style={style}>{value || s.none}</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="cr-btn" onClick={onBack}>{s.back}</button>
        <span className="cr-ptitle" style={{ flex: 1 }}>📦 {s.details}</span>
      </div>
      <div style={{ borderRadius: 14, padding: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
        <div className="crs-stat" dir="ltr" style={{ whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "start" }}>{it.product || it.code}</div>
        <div className="cr-small" dir="ltr" style={{ textAlign: "start" }}>{it.code}{it.uom ? ` · ${it.uom}` : ""}</div>
      </div>
      <div className="crs-det">
        {cell(s.qty, `${num(it.qty)} ${it.uom || ""}`)}
        {cell(s.pcs, it.pcs ? num(it.pcs) : "")}
        {cell(s.supplier, it.supplier)}
        {cell(s.prod, dmy(it.prodDate))}
        {cell(s.exp, it.expDate ? `${dmy(it.expDate)} · ${s.daysLeft(left)}` : "", { color: expColor(left) })}
      </div>
      <div style={{ borderRadius: 14, padding: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
        <div className="cr-lbl" style={{ marginBottom: 6 }}>{s.moves}</div>
        {!moves.length ? <div className="cr-small">{s.noMoves}</div> : moves.slice().reverse().map((m, i) => (
          <div key={`${m.at}-${i}`} className="cr-small" style={{ padding: "4px 0", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
            <b style={{ color: m.dir === "out" ? "#b45309" : "#047857" }}>{m.dir === "out" ? `− ${s.out}` : `+ ${s.in}`} {num(m.qty)}</b>
            {m.pcs ? ` (${num(m.pcs)} ${s.pcs})` : ""}
            {m.dir === "out" && m.destType ? ` · ${m.destType === "customer" ? s.toCustomer : `${s.to} ${m.destination}`}` : ""}
            {" · "}{new Date(m.at).toLocaleString(ar ? "ar-AE" : "en-GB", { timeZone: "Asia/Dubai" })}
            {m.keeper ? ` · ${s.keeper}: ${m.keeper}` : m.by ? ` · ${m.by}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
