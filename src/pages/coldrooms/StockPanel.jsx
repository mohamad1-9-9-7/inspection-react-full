// src/pages/coldrooms/StockPanel.jsx
//
// 📦 The products inside one cold room — shown when its door is clicked, or
// when the walker steps inside. Every detail of each product (lot) is a
// column: code · Product · Unit · Available Quantity · Pieces · Supplier ·
// Production · Expiry (days left). Tapping a row opens rows under it with
// that product's moves — the same pattern as the Butcher Reports table.
//
// DISPLAY ONLY (user, 17 Oct 2026): products are never edited from the 3D
// screen. They go in and out from the QR page on the unit itself
// (monitor/branches/_shared/QuickGoodsPanel.jsx).

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { kindOf, verdict } from "./coldRoomsConfig";
import { totalQty } from "./coldRoomsStock";

const TXS = {
  en: {
    inside: "Inside", products: "products", total: "Total quantity", empty: "No products recorded in this room yet.",
    emptyHint: "Products are added and taken out from the QR page on the unit.",
    search: "Search code, product or supplier…", code: "Code", product: "Product", uom: "Unit", qty: "Available Quantity",
    supplier: "Supplier", prod: "Production", exp: "Expiry", pcs: "Pieces",
    tapHint: "Tap a product to open its moves under it.",
    daysLeft: (n) => (n < 0 ? `expired ${-n} d ago` : n === 0 ? "expires today" : `${n} d left`),
    moves: "Moves of this product", noMoves: "No moves recorded for this product.", in: "In", out: "Out",
    when: "Date & time", move: "Move", to: "To", keeper: "Storekeeper", customer: "Customer",
    temp: "Now", allowed: "Allowed", updated: "Last update",
    explain: (k) => `A ${k} — the products below are what is recorded as stored here.`,
  },
  ar: {
    inside: "داخل", products: "منتج", total: "إجمالي الكمية", empty: "لا توجد منتجات مسجلة في هذه الغرفة بعد.",
    emptyHint: "المنتجات تُدخل وتُخرج من صفحة الـQR على الوحدة نفسها.",
    search: "ابحث بالكود أو المنتج أو المورد…", code: "الكود", product: "المنتج", uom: "الوحدة", qty: "الكمية المتوفرة",
    supplier: "المورد", prod: "الإنتاج", exp: "الانتهاء", pcs: "الحبات",
    tapHint: "اضغط على أي منتج لتفتح حركاته تحته.",
    daysLeft: (n) => (n < 0 ? `منتهي منذ ${-n} يوم` : n === 0 ? "ينتهي اليوم" : `باقي ${n} يوم`),
    moves: "حركات هذا المنتج", noMoves: "لا توجد حركات مسجلة لهذا المنتج.", in: "إدخال", out: "إخراج",
    when: "التاريخ والوقت", move: "الحركة", to: "إلى", keeper: "أمين المخزن", customer: "زبون",
    temp: "الآن", allowed: "المسموح", updated: "آخر تحديث",
    explain: (k) => `هذه الغرفة ${k} — المنتجات أدناه هي المسجّلة كمخزنة فيها.`,
  },
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dmy = (iso) => (ISO_DAY.test(iso || "") ? iso.split("-").reverse().join("/") : iso || "");
const daysTo = (iso) => {
  if (!ISO_DAY.test(iso || "")) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - t0) / 86400000);
};
const expColor = (n) => (n == null ? "#64748b" : n < 0 ? "#dc2626" : n <= 3 ? "#d97706" : "#16a34a");
const sameLot = (a, b) => ["code", "product", "supplier", "prodDate", "expDate"].every((k) => String(a[k] || "") === String(b[k] || ""));
const num = (v) => Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const lotKey = (it) => [it.code, it.product, it.supplier, it.prodDate, it.expDate].map((v) => v || "").join("|");

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.crs.crs { display:grid; gap:10px; }
.crs.crs .crs-wrap { max-height:58vh; overflow-y:auto; overflow-x:hidden; border:1px solid #cbd5e1; border-radius:12px; }
.crs.crs .crs-tbl { width:100%; border-collapse:collapse; table-layout:fixed; border-style:hidden; }
/* grid lines between every column and row */
.crs.crs .crs-tbl th, .crs.crs .crs-tbl td { border:1px solid #d7dee8; overflow-wrap:anywhere; }
.crs.crs .crs-tbl th { font-size:${fs(12)}; font-weight:900; color:#475569; background:#f1f5f9; padding:8px; text-align:start;
  position:sticky; top:0; z-index:1; border-bottom:2px solid #cbd5e1; }
.crs.crs .crs-tbl td { font-size:${fs(13.5)}; padding:8px; vertical-align:middle; }
.crs.crs .crs-tbl .num { text-align:end; font-variant-numeric:tabular-nums; }
.crs.crs .crs-tbl tr.crs-row { cursor:pointer; }
.crs.crs .crs-tbl tr.crs-row:hover td { background:#f2f8ff; }
.crs.crs .crs-tbl tr.crs-row.on td { background:#e8f1ff; }
.crs.crs .crs-tbl td.code { font-weight:800; }
.crs.crs .crs-sub { background:#f8fafc; padding:12px 14px; }
.crs.crs .crs-sub table { width:100%; border-collapse:collapse; background:#fff; }
.crs.crs .crs-sub th, .crs.crs .crs-sub td { border:1px solid #e2e8f0; padding:6px 8px; font-size:${fs(12.5)}; text-align:start; overflow-wrap:anywhere; }
.crs.crs .crs-sub th { background:#eef2f7; font-weight:900; color:#475569; position:static; }
.crs.crs .crs-stat { font-size:${fs(20)}; font-weight:900; font-variant-numeric:tabular-nums; white-space:nowrap; }
.crs.crs .crs-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(96px,1fr)); gap:8px 12px; margin-top:8px; }
.crs.crs .crs-caret { display:inline-block; width:1em; color:#64748b; transition:transform .15s; }
.crs.crs .on .crs-caret { transform:rotate(90deg); }
[dir="rtl"] .crs.crs .crs-caret { transform:scaleX(-1); }
[dir="rtl"] .crs.crs .on .crs-caret { transform:rotate(90deg); }
`;

export default function StockPanel({ index, room, live, stock, ar }) {
  const s = TXS[ar ? "ar" : "en"];
  const k = kindOf(room.kind);
  const items = useMemo(() => stock?.items || [], [stock]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set()); // lotKeys whose moves are shown

  useEffect(() => { setQ(""); setOpen(new Set()); }, [index]);

  const toggle = (key) => setOpen((cur) => {
    const next = new Set(cur);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = !n ? items : items.filter((it) => it.code.toLowerCase().includes(n) || it.product.toLowerCase().includes(n)
      || String(it.supplier || "").toLowerCase().includes(n));
    // same product together, the soonest expiry first
    return list.slice().sort((a, b) => (a.product || a.code).localeCompare(b.product || b.code)
      || String(a.expDate || "9999").localeCompare(String(b.expDate || "9999")));
  }, [items, q]);

  const value = live?.value;
  const st = value != null ? verdict(room, value) : "none";
  const stColor = { ok: "#16a34a", warn: "#d97706", out: "#dc2626", none: "#64748b" }[st];
  const COLS = 9;

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

      {!items.length ? (
        <div className="cr-small" style={{ padding: 14, textAlign: "center", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontWeight: 800 }}>📦 {s.empty}</div>
          <div style={{ marginTop: 4 }}>{s.emptyHint}</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input className="cr-input" style={{ flex: "1 1 240px", width: "auto" }} placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="cr-small">{s.tapHint}</span>
          </div>
          <div className="crs-wrap">
            <table className="crs-tbl">
              <colgroup>
                <col style={{ width: 34 }} />
                <col style={{ width: "9%" }} />
                <col />
                <col style={{ width: "7%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>{s.code}</th>
                  <th>{s.product}</th>
                  <th>{s.uom}</th>
                  <th className="num">{s.qty}</th>
                  <th className="num">{s.pcs}</th>
                  <th>{s.supplier}</th>
                  <th>{s.prod}</th>
                  <th>{s.exp}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((it, i) => {
                  const key = lotKey(it);
                  const isOpen = open.has(key);
                  const left = daysTo(it.expDate);
                  const moves = isOpen ? (stock?.moves || []).filter((m) => sameLot(m, it)).reverse() : [];
                  return (
                    <Fragment key={`${key}-${i}`}>
                      <tr className={`crs-row${isOpen ? " on" : ""}`} onClick={() => toggle(key)} aria-expanded={isOpen}>
                        <td style={{ textAlign: "center" }}><span className="crs-caret">▸</span></td>
                        <td dir="ltr" className="code">{it.code}</td>
                        <td dir="ltr" style={{ fontWeight: 700 }}>{it.product}</td>
                        <td dir="ltr">{it.uom}</td>
                        <td className="num" style={{ fontWeight: 800 }}>{num(it.qty)}</td>
                        <td className="num">{it.pcs ? num(it.pcs) : "—"}</td>
                        <td dir="ltr">{it.supplier || "—"}</td>
                        <td dir="ltr">{dmy(it.prodDate) || "—"}</td>
                        <td>
                          {it.expDate ? (
                            <>
                              <div dir="ltr" style={{ fontWeight: 800, color: expColor(left) }}>{dmy(it.expDate)}</div>
                              {left != null ? <div className="cr-small" style={{ color: expColor(left) }}>{s.daysLeft(left)}</div> : null}
                            </>
                          ) : "—"}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td colSpan={COLS} className="crs-sub">
                            <div className="cr-lbl" style={{ marginBottom: 6 }}>{s.moves}</div>
                            {!moves.length ? <div className="cr-small">{s.noMoves}</div> : (
                              <table>
                                <thead>
                                  <tr>
                                    <th>{s.when}</th>
                                    <th>{s.move}</th>
                                    <th className="num">{s.qty}</th>
                                    <th className="num">{s.pcs}</th>
                                    <th>{s.to}</th>
                                    <th>{s.keeper}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {moves.map((m, j) => (
                                    <tr key={`${m.at}-${j}`}>
                                      <td dir="ltr">{new Date(m.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</td>
                                      <td style={{ fontWeight: 800, color: m.dir === "out" ? "#b45309" : "#047857" }}>
                                        {m.dir === "out" ? `− ${s.out}` : `+ ${s.in}`}
                                      </td>
                                      <td className="num" style={{ fontWeight: 800 }}>{num(m.qty)} {m.uom || ""}</td>
                                      <td className="num">{m.pcs ? num(m.pcs) : "—"}</td>
                                      <td>{m.dir === "out" ? (m.destType === "customer" ? s.customer : m.destination || "—") : "—"}</td>
                                      <td>{m.keeper || m.by || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {stock?.updatedAt ? (
        <div className="cr-small">{s.updated}: {new Date(stock.updatedAt).toLocaleString(ar ? "ar-AE" : "en-GB")}{stock.updatedBy ? ` · ${stock.updatedBy}` : ""}</div>
      ) : null}
    </div>
  );
}
