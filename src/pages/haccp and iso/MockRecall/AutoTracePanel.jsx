// src/pages/haccp and iso/MockRecall/AutoTracePanel.jsx
//
// 🧬 التتبّع التلقائي داخل تمرين السحب الوهمي — كود المنتج ← اختر الشحنة ←
// النظام يتتبّعها (نفس قواعد شاشة تتبع المنتج) ← «املأ التمرين».
// Automatic trace inside the Mock Recall drill. Opened with
// ?traceCode=X&shipment=ID (from the Product Traceability screen) it runs and
// picks that shipment by itself.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProductCatalog } from "../../monitor/branches/_shared/ProductPicker";
import { monthsAgoYMD, todayYMD } from "../../traceability/productTraceApi";
import { readProductTrace, traceShipment } from "./autoTrace";

const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || "")) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const kg = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US")} kg`;
const RANGES = [3, 6, 12, 24];

export default function AutoTracePanel({ lang, initialCode = "", initialShipment = "", onApply }) {
  const ar = lang === "ar";
  const L = (en, a) => (ar ? a : en);
  const { pickItems, allItems } = useProductCatalog();

  const [q, setQ] = useState("");
  const [product, setProduct] = useState(null); // { code, name }
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [full, setFull] = useState(null);
  const [pickedId, setPickedId] = useState("");
  const [graceDays, setGraceDays] = useState(0);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(null); // seconds the trace took
  const abortRef = useRef(null);
  const autoRef = useRef({ code: initialCode, shipment: initialShipment });

  useEffect(() => () => abortRef.current?.abort(), []);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return pickItems
      .filter((it) => String(it.item_code || "").toLowerCase().includes(s) || String(it.description || "").toLowerCase().includes(s))
      .slice(0, 30);
  }, [q, pickItems]);

  const run = async (p) => {
    const target = p || product;
    if (!target) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true); setError(""); setFull(null); setPickedId(""); setElapsed(null);
    const t0 = Date.now();
    try {
      const res = await readProductTrace({
        code: target.code, name: target.name, from: monthsAgoYMD(months), to: todayYMD(), signal: ac.signal,
        onProgress: (phase, d, t) => setProgress(`${phase === "arrivals" ? L("Shipments", "الشحنات") : L("Downstream", "ما بعد الشحنة")} ${d}/${t}`),
      });
      setFull(res);
      setElapsed(Math.round((Date.now() - t0) / 1000));
      const want = autoRef.current.shipment;
      if (want && res.shipments.some((sh) => String(sh.id) === String(want))) setPickedId(String(want));
      else if (res.shipments.length === 1) setPickedId(String(res.shipments[0].id));
      autoRef.current.shipment = "";
    } catch (e) {
      if (e?.name !== "AbortError") setError(String(e?.message || e));
    } finally {
      setBusy(false); setProgress("");
    }
  };

  const choose = (it) => {
    const p = { code: String(it.item_code || "").trim(), name: it.description };
    setProduct(p); setQ(""); setFull(null); setPickedId("");
    return p;
  };

  /* opened from the trace screen: pick the product and run once the catalog is in */
  useEffect(() => {
    const code = autoRef.current.code;
    if (!code || !allItems.length) return;
    autoRef.current.code = "";
    const it = allItems.find((x) => String(x.item_code || "").trim() === code);
    run(choose(it || { item_code: code, description: "" }));
  }, [allItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const res = useMemo(() => (full && pickedId ? traceShipment(full, pickedId, { graceDays }) : null), [full, pickedId, graceDays]);

  return (
    <div style={S.box}>
      <div style={S.lead}>
        {L(
          "Pick the product and the shipment — the system follows it through dispatch, every branch's receiving log and the returns (same rules as Product Traceability), then fills the drill below. You still check, correct and sign.",
          "اختر المنتج والشحنة — النظام يتتبّعها عبر الإرسال وسجل استلام كل فرع والمرتجعات (نفس قواعد تتبع المنتج)، ثم يملأ التمرين بالأسفل. تبقى المراجعة والتصحيح والتوقيع عليك."
        )}
      </div>

      {/* ① product */}
      <div style={S.row}>
        {product ? (
          <div style={S.picked}>
            <b>{product.code}</b> {product.name}
            <button type="button" style={S.linkBtn} onClick={() => { setProduct(null); setFull(null); setPickedId(""); }}>{L("Change", "تغيير")}</button>
          </div>
        ) : (
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Product code or name", "كود المنتج أو اسمه")} />
            {matches.length > 0 && (
              <div style={S.list}>
                {matches.map((it) => (
                  <button key={`${it.item_code}|${it.description}`} type="button" style={S.pick} onClick={() => choose(it)}>
                    <b style={{ minWidth: 60 }}>{it.item_code}</b> <span>{it.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <select style={{ ...S.input, width: "auto" }} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {RANGES.map((m) => <option key={m} value={m}>{L(`Last ${m} months`, `آخر ${m} شهر`)}</option>)}
        </select>
        <button type="button" style={{ ...S.btn, opacity: !product || busy ? 0.5 : 1 }} disabled={!product || busy} onClick={() => run()}>
          {busy ? `⏳ ${progress || L("Reading…", "جاري القراءة…")}` : `🧬 ${L("Trace", "تتبّع")}`}
        </button>
      </div>
      {error && <div style={S.bad}>{error}</div>}

      {/* ② shipments */}
      {full && (
        <div style={{ marginTop: 12 }}>
          <div style={S.h}>
            {L("Which shipment?", "أي شحنة؟")} · {full.shipments.length}
            {elapsed != null && <span style={S.muted}> · {L(`read in ${elapsed} s`, `قُرئ خلال ${elapsed} ث`)}</span>}
          </div>
          {full.shipments.length === 0 && (
            <div style={S.warn}>{L("No QCS shipment carried this product in the chosen period.", "لا توجد شحنة QCS لهذا المنتج في الفترة المختارة.")}</div>
          )}
          <div style={S.cards}>
            {full.shipments.map((sh) => {
              const on = String(sh.id) === pickedId;
              return (
                <button key={sh.id} type="button" onClick={() => setPickedId(String(sh.id))} style={{ ...S.card, ...(on ? S.cardOn : null) }}>
                  <div style={{ fontWeight: 900 }}>📦 {dmy(sh.date)}</div>
                  <div style={S.muted}>{sh.supplier || "—"}</div>
                  <div style={S.small}>{L("Inv.", "فاتورة")} {sh.invoiceNo || "—"} · {kg(sh.weight)}</div>
                  <div style={S.small}>{L("Prod", "إنتاج")} {dmy(sh.prodDate) !== "—" ? dmy(sh.prodDate) : sh.prodDateRaw || "—"} · {L("Exp", "انتهاء")} {dmy(sh.expiryDate) !== "—" ? dmy(sh.expiryDate) : sh.expiryDateRaw || "—"}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ③ the result */}
      {res && (
        <div style={{ marginTop: 14 }}>
          <div style={S.tiles}>
            <Tile label={L("Received", "الوارد")} value={kg(res.inKg)} />
            <Tile label={L("To our branches", "لفروعنا")} value={kg(res.sentOur)} />
            <Tile label={L("To customers", "للعملاء")} value={kg(res.sentCustomers)} sub={res.customers.lines ? L(`${res.customers.names} customer(s)`, `${res.customers.names} عميل`) : ""} />
            <Tile label={L("Returns", "المرتجعات")} value={kg(res.returnsQty)} sub={`${res.returnsCount}`} />
            <Tile label={L("Traced", "المتتبَّع")} value={res.pct == null ? "—" : `${res.pct.toFixed(1)}%`} tone={res.pct != null && res.pct >= 99 ? "ok" : "warn"} sub={res.unaccounted > 0 ? L(`${kg(res.unaccounted)} not found`, `${kg(res.unaccounted)} غير موجود`) : ""} />
          </div>

          <div style={S.muted}>
            {L("Window", "النافذة")}: {dmy(res.anchor.date)} → {res.until ? dmy(res.until) : L("open (no expiry on the shipment)", "مفتوحة (لا يوجد تاريخ انتهاء على الشحنة)")}
            <span> · </span>
            <label>
              {L("grace", "مهلة")}{" "}
              <select style={{ ...S.input, width: "auto", padding: "2px 6px" }} value={graceDays} onChange={(e) => setGraceDays(Number(e.target.value))}>
                {[0, 15, 30, 90].map((d) => <option key={d} value={d}>+{d}</option>)}
              </select>
            </label>
          </div>

          {res.branches.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{L("Branch", "الفرع")}</th>
                    <th style={S.th}>{L("Sent", "أُرسل")}</th>
                    <th style={S.th}>{L("Branch logged", "سجّل الفرع")}</th>
                    <th style={S.th}>{L("Difference", "الفرق")}</th>
                    <th style={S.th}>{L("Last date", "آخر تاريخ")}</th>
                  </tr>
                </thead>
                <tbody>
                  {res.branches.map((b) => (
                    <tr key={b.id}>
                      <td style={S.td}>{b.label}</td>
                      <td style={S.td}>{kg(b.qty)}</td>
                      <td style={S.td}>{kg(b.logged)}</td>
                      <td style={{ ...S.td, color: Math.abs(b.diff) >= 0.5 ? "#b91c1c" : "#15803d", fontWeight: 800 }}>{Math.abs(b.diff) >= 0.5 ? kg(b.diff) : "✓"}</td>
                      <td style={S.td}>{dmy(b.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {res.failed.length > 0 && <div style={S.warn}>{L("Could not read: ", "تعذّرت قراءة: ")}{res.failed.join(", ")}</div>}

          <button type="button" style={{ ...S.btn, marginTop: 12 }} onClick={() => onApply?.(res, product)}>
            ⤵️ {L("Fill the drill with this trace", "املأ التمرين بهذا التتبّع")}
          </button>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  const c = tone === "ok" ? "#15803d" : tone === "warn" ? "#b45309" : "#1d4ed8";
  return (
    <div style={{ ...S.tile, borderInlineStart: `4px solid ${c}` }}>
      <div style={{ fontWeight: 700, color: "#64748b", fontSize: "0.8rem" }}>{label}</div>
      <div style={{ fontWeight: 900, color: c, fontSize: "1.2rem" }}>{value}</div>
      {sub ? <div style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 600 }}>{sub}</div> : null}
    </div>
  );
}

const S = {
  box: { background: "linear-gradient(180deg,#f5f3ff,#eef4ff)", border: "1px solid #ddd6fe", borderRadius: 14, padding: 14 },
  lead: { color: "#475569", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 10 },
  row: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  input: { width: "100%", padding: "9px 11px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", boxSizing: "border-box" },
  btn: { padding: "9px 16px", borderRadius: 10, border: 0, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 900, cursor: "pointer" },
  linkBtn: { border: 0, background: "none", color: "#4f46e5", fontWeight: 800, cursor: "pointer", marginInlineStart: 8 },
  picked: { flex: "1 1 320px", padding: "9px 12px", borderRadius: 10, background: "#fff", border: "1px solid #c4b5fd" },
  list: { position: "absolute", zIndex: 20, insetInline: 0, top: "100%", marginTop: 4, maxHeight: 260, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 24px rgba(15,23,42,.12)" },
  pick: { display: "flex", gap: 8, width: "100%", padding: "8px 10px", border: 0, borderBottom: "1px solid #f1f5f9", background: "#fff", cursor: "pointer", textAlign: "start" },
  h: { fontWeight: 900, color: "#312e81", marginBottom: 8 },
  muted: { color: "#64748b", fontWeight: 600 },
  small: { color: "#475569", fontSize: "0.82rem" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 },
  card: { textAlign: "start", padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3 },
  cardOn: { border: "2px solid #7c3aed", background: "#faf5ff", boxShadow: "0 4px 14px rgba(124,58,237,.18)" },
  tiles: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tile: { flex: "1 1 150px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 10 },
  th: { textAlign: "start", padding: "7px 10px", background: "#f1f5f9", color: "#334155", fontWeight: 800, borderBottom: "1px solid #e2e8f0" },
  td: { padding: "7px 10px", borderBottom: "1px solid #f1f5f9" },
  warn: { marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 700 },
  bad: { marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 700 },
};
