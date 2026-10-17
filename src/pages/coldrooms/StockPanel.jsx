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
    temp: "Now", allowed: "Allowed", updated: "Last update",
    explain: (k) => `A ${k} — the products below are what is recorded as stored here.`,
  },
  ar: {
    inside: "داخل", products: "منتج", total: "إجمالي الكمية", empty: "لا توجد منتجات مسجلة في هذه الغرفة بعد.",
    emptyHint: "المنتجات تُدخل وتُخرج من صفحة الـQR على الوحدة نفسها.",
    search: "ابحث بالكود أو اسم المنتج…", code: "الكود", product: "المنتج", uom: "وحدة القياس", qty: "الكمية المتوفرة",
    supplier: "المورد", prod: "الإنتاج", exp: "الانتهاء", pcs: "الحبات",
    temp: "الآن", allowed: "المسموح", updated: "آخر تحديث",
    explain: (k) => `هذه الغرفة ${k} — المنتجات أدناه هي المسجّلة كمخزنة فيها.`,
  },
};

const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : iso || "");

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.crs.crs { display:grid; gap:10px; }
.crs.crs .crs-tbl { width:100%; border-collapse:collapse; }
.crs.crs .crs-tbl th { font-size:${fs(12)}; font-weight:900; color:#475569; background:#f1f5f9; padding:7px 8px; text-align:start; position:sticky; top:0; white-space:nowrap; }
.crs.crs .crs-tbl td { font-size:${fs(13.5)}; padding:6px 8px; border-top:1px solid #eef2f7; vertical-align:middle; }
.crs.crs .crs-tbl td.num, .crs.crs .crs-tbl th.num { text-align:end; font-variant-numeric:tabular-nums; }
.crs.crs .crs-tbl tr:hover td { background:#f8fbff; }
.crs.crs .crs-wrap { max-height:46vh; overflow:auto; border:1px solid #e2e8f0; border-radius:12px; }
.crs.crs .crs-stat { font-size:${fs(20)}; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap; }
.crs.crs .crs-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(96px,1fr)); gap:8px 12px; margin-top:8px; }
.crs.crs .crs-tbl td.code { white-space:nowrap; font-weight:800; }
`;

export default function StockPanel({ index, room, live, stock, ar }) {
  const s = TXS[ar ? "ar" : "en"];
  const k = kindOf(room.kind);
  const items = useMemo(() => stock?.items || [], [stock]);
  const [q, setQ] = useState("");

  useEffect(() => { setQ(""); }, [index]);

  // lot columns only when some row has them
  const hasLots = items.some((it) => it.supplier || it.prodDate || it.expDate || it.pcs);
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

      {items.length > 0 ? (
        <input className="cr-input" placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} />
      ) : null}

      {/* the products */}
      {!items.length ? (
        <div className="cr-small" style={{ padding: 14, textAlign: "center", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontWeight: 800 }}>📦 {s.empty}</div>
          <div style={{ marginTop: 4 }}>{s.emptyHint}</div>
        </div>
      ) : (
        <div className="crs-wrap">
          <table className="crs-tbl">
            <thead>
              <tr>
                <th style={{ width: 1 }}>{s.code}</th>
                <th>{s.product}</th>
                <th>{s.uom}</th>
                <th className="num">{s.qty}</th>
                {hasLots ? (
                  <>
                    <th className="num">{s.pcs}</th>
                    <th>{s.supplier}</th>
                    <th>{s.prod}</th>
                    <th>{s.exp}</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((it, i) => (
                <tr key={`${it.code}-${it.supplier || ""}-${it.expDate || ""}-${i}`}>
                  <td dir="ltr" className="code">{it.code}</td>
                  <td dir="ltr">{it.product}</td>
                  <td dir="ltr">{it.uom}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{Number(it.qty).toLocaleString()}</td>
                  {hasLots ? (
                    <>
                      <td className="num">{it.pcs ? Number(it.pcs).toLocaleString() : ""}</td>
                      <td dir="ltr">{it.supplier || ""}</td>
                      <td dir="ltr" style={{ whiteSpace: "nowrap" }}>{dmy(it.prodDate)}</td>
                      <td dir="ltr" style={{ whiteSpace: "nowrap" }}>{dmy(it.expDate)}</td>
                    </>
                  ) : null}
                </tr>
              ))}
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
