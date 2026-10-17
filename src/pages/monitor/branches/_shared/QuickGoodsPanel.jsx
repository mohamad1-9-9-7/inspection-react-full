// src/pages/monitor/branches/_shared/QuickGoodsPanel.jsx
//
// 📦 Goods tab of the cooler QR page — what is inside the unit whose sticker
// was scanned, and the two moves a storekeeper makes at the door:
//   ➕ Goods in   pick the product (our item code or its name, from the items
//                 catalogue or from what is already inside) + the quantity
//   ➖ Goods out  pick one of the products inside + the quantity taken, and
//                 where it goes: a customer (no name asked) or one of our
//                 branches (must be chosen)
// Both moves carry the storekeeper's name (remembered on the phone).
//
// Stored in the Cold Rooms stock record (coldRooms/coldRoomsStock.js): when a
// cold room of the 3D screen is linked to this unit its list is the SAME one
// the 3D screen shows; otherwise the unit keeps its own list in that record.
// Each move is applied to the list as it is on the server at that moment and
// logged (room.moves) with the account behind it.
//
// Uses the .cq classes of QuickTempPage (rendered inside it).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { applyStockMove, fetchUnitStock, loadCatalog, stockKeyForUnit, totalQty } from "../../../coldrooms/coldRoomsStock";
import { getCurrentUser } from "../../../../utils/perms";
import { INSPECTION_BRANCHES } from "../../../inspection/inspectionBranches";
import { useShelfLife } from "./shelfLife";
import { fetchSuppliers } from "../../../complaints/complaintsCore";

const TX = {
  en: {
    inside: "Goods inside", products: "products", total: "total qty", linked: (n) => `Same list as cold room “${n}” on the 3D screen`,
    in: "➕ Goods in", out: "➖ Goods out", search: "Search code or product…", empty: "Nothing recorded inside this unit yet.",
    pickIn: "Which product goes in?", pickOut: "Which product comes out?", typeMore: "Type at least 2 letters or the code.",
    newItem: (q) => `➕ Add “${q}” as a new product`, here: "inside", qty: "Quantity", available: (q, u) => `Available: ${q} ${u}`,
    all: "All", saveIn: "Save — goods in", saveOut: "Save — goods out", saving: "Saving…", cancel: "Cancel", change: "Change",
    needQty: "Type the quantity first.", tooMuch: "More than what is inside.", notHere: "This product is no longer inside — refresh.",
    savedIn: (q, p) => `✅ ${q} × ${p} added.`, savedOut: (q, p) => `✅ ${q} × ${p} taken out.`, moves: "Last moves",
    refresh: "↻ Refresh", tapOut: "Tap a product to take it out.", loadErr: "Could not load the goods list.",
    keeper: "Storekeeper name", keeperPh: "Who is handing the goods out", goesTo: "Where is it going?",
    customer: "👤 Customer", branch: "🏬 Our branch", toCustomer: "to a customer",
    pickBranch: "— Choose the branch —", needKeeper: "Type the storekeeper's name.", needDest: "Choose where the goods are going.",
    needBranch: "Choose the branch.", to: "to", keeperShort: "storekeeper",
    supplier: "Supplier", supplierPh: "Supplier name", prodDate: "Production date", expDate: "Expiry date",
    pcs: "Number of pieces (if known)", pcsOut: "Pieces taken out (if known)", pcsShort: "pcs", expShort: "exp",
    needSupplier: "Type the supplier name.", needProd: "Choose the production date.", needExp: "Choose the expiry date.",
    badDates: "The expiry date must be after the production date.", autoExp: (d) => `Shelf life ${d} days — the other date was filled.`,
  },
  ar: {
    inside: "البضاعة الموجودة", products: "منتج", total: "إجمالي الكمية", linked: (n) => `نفس قائمة الغرفة «${n}» في شاشة الغرف ثلاثية الأبعاد`,
    in: "➕ إدخال بضاعة", out: "➖ إخراج بضاعة", search: "ابحث بالكود أو اسم المنتج…", empty: "لا توجد بضاعة مسجّلة داخل هذه الوحدة بعد.",
    pickIn: "أي منتج سيدخل؟", pickOut: "أي منتج سيخرج؟", typeMore: "اكتب حرفين على الأقل أو الكود.",
    newItem: (q) => `➕ إضافة «${q}» كمنتج جديد`, here: "موجود", qty: "الكمية", available: (q, u) => `المتوفر: ${q} ${u}`,
    all: "الكل", saveIn: "حفظ — إدخال", saveOut: "حفظ — إخراج", saving: "جاري الحفظ…", cancel: "إلغاء", change: "تغيير",
    needQty: "اكتب الكمية أولاً.", tooMuch: "أكثر من الموجود داخل الوحدة.", notHere: "هذا المنتج لم يعد موجوداً — حدّث الصفحة.",
    savedIn: (q, p) => `✅ تمت إضافة ${q} × ${p}.`, savedOut: (q, p) => `✅ تم إخراج ${q} × ${p}.`, moves: "آخر الحركات",
    refresh: "↻ تحديث", tapOut: "اضغط على منتج لإخراجه.", loadErr: "تعذّر تحميل قائمة البضاعة.",
    keeper: "اسم أمين المخزن (الستور كيبر)", keeperPh: "مين عم يسلّم البضاعة", goesTo: "لوين رايحة البضاعة؟",
    customer: "👤 زبون", branch: "🏬 فرع من فروعنا", toCustomer: "إلى زبون",
    pickBranch: "— اختر الفرع —", needKeeper: "اكتب اسم أمين المخزن.", needDest: "اختر لوين رايحة البضاعة.",
    needBranch: "اختر الفرع.", to: "إلى", keeperShort: "أمين المخزن",
    supplier: "المورد", supplierPh: "اسم المورد", prodDate: "تاريخ الإنتاج", expDate: "تاريخ الانتهاء",
    pcs: "عدد الحبات (إذا متوفر)", pcsOut: "عدد الحبات الخارجة (إذا متوفر)", pcsShort: "حبة", expShort: "ينتهي",
    needSupplier: "اكتب اسم المورد.", needProd: "اختر تاريخ الإنتاج.", needExp: "اختر تاريخ الانتهاء.",
    badDates: "تاريخ الانتهاء لازم يكون بعد تاريخ الإنتاج.", autoExp: (d) => `مدة الصلاحية ${d} يوم — تعبّى التاريخ التاني تلقائياً.`,
  },
};

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const hhmm = (iso) => {
  try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};
const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};

/* The storekeeper's name is remembered on this phone (a convenience only —
   it is saved on every move). */
const KEEPER_KEY = "cooler_goods_keeper";
const lastKeeper = () => { try { return localStorage.getItem(KEEPER_KEY) || ""; } catch { return ""; } };
const rememberKeeper = (v) => { try { localStorage.setItem(KEEPER_KEY, v); } catch { /* cache only */ } };

/* The branches goods can go to — only the ones working now (user list, 17 Oct
   2026). Names as in inspectionBranches.js; POS 47/48 are not there yet and
   POS 19 goes by Al Warqa Kitchen (config/branches.js). */
const ACTIVE_BRANCHES = ["POS 10", "POS 11", "POS 15", "POS 47", "POS 48", "POS 17", "POS 6", "FTR 1", "FTR 2", "PRODUCTION"]
  .map((code) => INSPECTION_BRANCHES.find((b) => b.code === code) || { code, labelEn: code, labelAr: code })
  .concat({ code: "POS 19", labelEn: "Al Warqa Kitchen", labelAr: "مطبخ الورقاء" });

/* yyyy-mm-dd helpers (the date inputs' value) */
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.split("-").reverse().join("/") : iso || "");
const lotKey = (it) => [it.code, it.product, it.supplier, it.prodDate, it.expDate].map((v) => v || "").join("|");
const lotOf = (it) => ({ code: it.code, product: it.product, uom: it.uom, supplier: it.supplier || "", prodDate: it.prodDate || "", expDate: it.expDate || "", pcs: it.pcs || 0, have: it.qty });

const branchLabel = (b, ar) => (ar ? b.labelAr : b.labelEn) || b.code;
const destText = (m, s, ar) => {
  if (m.destType === "customer") return s.toCustomer;
  if (m.destType === "branch") {
    const b = ACTIVE_BRANCHES.find((x) => x.code === m.destination);
    return `${s.to} ${b ? branchLabel(b, ar) : m.destination}`;
  }
  return "";
};

export default function QuickGoodsPanel({ branch, unit, lang }) {
  const s = TX[lang === "ar" ? "ar" : "en"];
  const [target, setTarget] = useState(null); // { key, room, name }
  const [stock, setStock] = useState(null); // { items, moves }
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | "in" | "out"
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null); // { code, product, uom, have }
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [keeper, setKeeper] = useState(() => lastKeeper() || userName());
  const [destType, setDestType] = useState(""); // customer | branch
  const [toBranch, setToBranch] = useState("");
  // goods in: the lot
  const [supplier, setSupplier] = useState("");
  const [prodDate, setProdDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [pcs, setPcs] = useState("");
  const [shelfNote, setShelfNote] = useState("");
  const [suppliers, setSuppliers] = useState(null);
  const shelf = useShelfLife();
  const ar = lang === "ar";

  useEffect(() => {
    if (mode !== "in" || suppliers) return;
    fetchSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [mode, suppliers]);

  /* Shelf life known for the product → one date fills the other (as on the
     Raw Material Receipt). Only an empty date is filled. */
  const daysFor = (p) => {
    const r = p ? shelf.resolve({ code: p.code, name: p.product }) : null;
    return r && r.days > 0 ? r.days : 0;
  };
  const onProd = (v) => {
    setProdDate(v);
    const d = daysFor(pick);
    if (v && d && !expDate) { setExpDate(addDays(v, d)); setShelfNote(s.autoExp(d)); }
  };
  const onExp = (v) => {
    setExpDate(v);
    const d = daysFor(pick);
    if (v && d && !prodDate) { setProdDate(addDays(v, -d)); setShelfNote(s.autoExp(d)); }
  };

  useEffect(() => {
    let live = true;
    stockKeyForUnit(branch, unit).then((tg) => { if (live) setTarget(tg); });
    return () => { live = false; };
  }, [branch, unit]);

  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setErr("");
    try {
      setStock(await fetchUnitStock(target.key));
    } catch {
      setErr(s.loadErr);
    } finally {
      setLoading(false);
    }
  }, [target, s.loadErr]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode !== "in" || catalog.length) return;
    loadCatalog().then((map) => setCatalog([...map.entries()].map(([code, v]) => ({ code, product: v.product, uom: v.uom }))));
  }, [mode, catalog.length]);

  const items = useMemo(() => stock?.items || [], [stock]);
  // all lots of a product added up
  const haveOf = useCallback((code, product) => {
    const lots = items.filter((it) => (code ? it.code === code : it.product === product));
    return lots.length ? { qty: lots.reduce((n, it) => n + (Number(it.qty) || 0), 0) } : null;
  }, [items]);

  const needle = q.trim().toLowerCase();
  const matches = (it) => !needle || it.code.toLowerCase().includes(needle) || it.product.toLowerCase().includes(needle);
  // same product together, the lot that expires first on top (FEFO)
  const shownInside = items.filter(matches).slice().sort((a, b) =>
    (a.product || a.code).localeCompare(b.product || b.code) || String(a.expDate || "9999").localeCompare(String(b.expDate || "9999")));
  // Goods in: what is already inside first, then the catalogue.
  const shownIn = useMemo(() => {
    if (mode !== "in") return [];
    const inside = items.filter(matches).slice(0, 8);
    if (needle.length < 2) return inside;
    const seen = new Set(inside.map((it) => it.code));
    const fromCat = catalog
      .filter((it) => !seen.has(it.code) && (it.code.toLowerCase().includes(needle) || it.product.toLowerCase().includes(needle)))
      .slice(0, 25);
    return [...inside, ...fromCat];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, items, catalog, needle]);

  const resetLot = () => { setSupplier(""); setProdDate(""); setExpDate(""); setPcs(""); setShelfNote(""); };
  const start = (m, it = null) => {
    setMode(m); setQ(""); setQty(""); setMsg(null); resetLot();
    setPick(it ? lotOf(it) : null); // from the list = goods out of that lot
    if (m) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // goods out: that exact lot; goods in: the product (the lot is typed)
  const choose = (it) => setPick(mode === "out"
    ? lotOf(it)
    : { code: it.code, product: it.product, uom: it.uom, have: haveOf(it.code, it.product)?.qty || 0 });

  const save = async () => {
    setMsg(null);
    const n = Number(String(qty).replace(/,/g, ""));
    if (!(n > 0)) return setMsg({ kind: "bad", text: s.needQty });
    if (mode === "out" && n > pick.have + 1e-9) return setMsg({ kind: "bad", text: s.tooMuch });
    const who = keeper.trim();
    if (!who) return setMsg({ kind: "bad", text: s.needKeeper });
    const extra = { keeper: who, pcs: Number(pcs) > 0 ? Number(pcs) : 0 };
    if (mode === "out") {
      if (!destType) return setMsg({ kind: "bad", text: s.needDest });
      if (destType === "branch" && !toBranch) return setMsg({ kind: "bad", text: s.needBranch });
      extra.destType = destType;
      extra.destination = destType === "branch" ? toBranch : "";
      // the lot being taken from
      extra.supplier = pick.supplier; extra.prodDate = pick.prodDate; extra.expDate = pick.expDate;
    } else {
      if (!supplier.trim()) return setMsg({ kind: "bad", text: s.needSupplier });
      if (!prodDate) return setMsg({ kind: "bad", text: s.needProd });
      if (!expDate) return setMsg({ kind: "bad", text: s.needExp });
      if (expDate <= prodDate) return setMsg({ kind: "bad", text: s.badDates });
      extra.supplier = supplier.trim(); extra.prodDate = prodDate; extra.expDate = expDate;
    }
    setSaving(true);
    try {
      const rec = await applyStockMove(target.key, { dir: mode, code: pick.code, product: pick.product, uom: pick.uom, qty: n, ...extra }, userName());
      rememberKeeper(who);
      setStock(rec);
      const text = mode === "out" ? s.savedOut(fmt(n), pick.product || pick.code) : s.savedIn(fmt(n), pick.product || pick.code);
      setMode(null); setPick(null); setQty(""); setQ(""); setDestType(""); setToBranch(""); resetLot();
      setMsg({ kind: "ok", text });
      try { navigator.vibrate?.(60); } catch {}
    } catch (e) {
      const code = e?.message;
      setMsg({ kind: "bad", text: code === "TOO_MUCH" ? s.tooMuch : code === "NOT_HERE" ? s.notHere : code === "QTY" ? s.needQty : String(code || e) });
      if (code === "TOO_MUCH" || code === "NOT_HERE") load();
    } finally {
      setSaving(false);
    }
  };

  // supplier · production → expiry · pieces of one lot
  const lotLine = (it) => {
    const parts = [];
    if (it.supplier) parts.push(it.supplier);
    if (it.prodDate || it.expDate) parts.push(`${dmy(it.prodDate) || "?"} → ${s.expShort} ${dmy(it.expDate) || "?"}`);
    if (it.pcs) parts.push(`${fmt(it.pcs)} ${s.pcsShort}`);
    return parts.length ? <div className="sm" style={{ textAlign: "start", marginTop: 2 }}>{parts.join(" · ")}</div> : null;
  };

  const row = (it, onClick, extra = null) => (
    <button key={lotKey(it)} type="button" className="card" onClick={onClick}
      style={{ width: "100%", textAlign: "start", cursor: "pointer", display: "block", font: "inherit", color: "inherit" }}>
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <div className="t2" dir="ltr" style={{ textAlign: "start", overflowWrap: "anywhere" }}>{it.product || it.code}</div>
          <div className="sm" dir="ltr" style={{ textAlign: "start" }}>{it.code}{it.uom ? ` · ${it.uom}` : ""}</div>
          {lotLine(it)}
        </div>
        {extra}
      </div>
    </button>
  );

  /* ── picking + quantity (in or out) */
  if (mode) {
    const isOut = mode === "out";
    return (
      <div>
        <div className="bar">
          <div className="t2">{isOut ? s.out : s.in}</div>
          <button type="button" className="btn" onClick={() => start(null)} disabled={saving}>{s.cancel}</button>
        </div>
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}

        {pick ? (
          <div className="card">
            <div className="row">
              <div style={{ minWidth: 0 }}>
                <div className="t2" dir="ltr" style={{ textAlign: "start", overflowWrap: "anywhere" }}>{pick.product || pick.code}</div>
                <div className="sm" dir="ltr" style={{ textAlign: "start" }}>{pick.code}{pick.uom ? ` · ${pick.uom}` : ""}</div>
                {isOut && lotLine(pick)}
                {(isOut || pick.have > 0) && <div className="sm" style={{ marginTop: 4, fontWeight: 800 }}>{s.available(fmt(pick.have), pick.uom || "")}</div>}
              </div>
              <button type="button" className="btn" onClick={() => setPick(null)} disabled={saving}>{s.change}</button>
            </div>
            <span className="lbl">{s.qty}{pick.uom ? ` (${pick.uom})` : ""}</span>
            <div className="temp">
              <input inputMode="decimal" autoFocus autoComplete="off" value={qty} placeholder="0" aria-label={s.qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
              {isOut && <button type="button" className="sign" style={{ width: 84 }}
                onClick={() => { setQty(String(pick.have)); if (pick.pcs) setPcs(String(pick.pcs)); }}>{s.all}</button>}
            </div>

            <span className="lbl">{isOut ? s.pcsOut : s.pcs}</span>
            <input className="btn" style={{ width: "100%", cursor: "text", fontWeight: 600 }} inputMode="numeric" value={pcs}
              placeholder={isOut && pick.pcs ? `${fmt(pick.pcs)} ${s.pcsShort}` : "0"}
              onChange={(e) => setPcs(e.target.value.replace(/[^0-9]/g, ""))} />

            {!isOut && (
              <>
                <span className="lbl">{s.supplier}</span>
                <input className="btn" style={{ width: "100%", cursor: "text", fontWeight: 600 }} value={supplier} list="cq-goods-suppliers"
                  placeholder={s.supplierPh} onChange={(e) => setSupplier(e.target.value)} autoComplete="off" />
                <datalist id="cq-goods-suppliers">
                  {(suppliers || []).map((n) => <option key={n} value={n} />)}
                </datalist>
                <div className="acts" style={{ marginTop: 0 }}>
                  <div>
                    <span className="lbl">{s.prodDate}</span>
                    <input type="date" className="btn" style={{ width: "100%" }} value={prodDate} max={expDate || undefined}
                      onChange={(e) => onProd(e.target.value)} />
                  </div>
                  <div>
                    <span className="lbl">{s.expDate}</span>
                    <input type="date" className="btn" style={{ width: "100%" }} value={expDate} min={prodDate || undefined}
                      onChange={(e) => onExp(e.target.value)} />
                  </div>
                </div>
                {shelfNote && <div className="sm" style={{ marginTop: 6, color: "#0369a1", fontWeight: 700 }}>{shelfNote}</div>}
              </>
            )}

            {isOut && (
              <>
                <span className="lbl">{s.goesTo}</span>
                <div className="acts">
                  {[["customer", s.customer], ["branch", s.branch]].map(([k, label]) => (
                    <button key={k} type="button" className={`chip ${destType === k ? "on" : ""}`} style={{ textAlign: "center" }}
                      onClick={() => setDestType(k)}>{label}</button>
                  ))}
                </div>
                {destType === "branch" && (
                  <select className="btn" style={{ width: "100%", marginTop: 8, cursor: "pointer" }} value={toBranch}
                    onChange={(e) => setToBranch(e.target.value)}
                    aria-label={s.branch}>
                    <option value="">{s.pickBranch}</option>
                    {ACTIVE_BRANCHES.map((b) => <option key={b.code} value={b.code}>{branchLabel(b, ar)}</option>)}
                  </select>
                )}
              </>
            )}

            <span className="lbl">{s.keeper}</span>
            <input className="btn" style={{ width: "100%", cursor: "text", fontWeight: 600 }} value={keeper}
              placeholder={s.keeperPh} onChange={(e) => setKeeper(e.target.value)} autoComplete="name" />

            <div style={{ height: 12 }} />
            <button type="button" className="btn pri full" onClick={save} disabled={saving}
              style={isOut ? { background: "#b45309", borderColor: "#b45309" } : undefined}>
              {saving ? s.saving : isOut ? s.saveOut : s.saveIn}{qty ? ` · ${qty}` : ""}
            </button>
          </div>
        ) : (
          <>
            <span className="lbl">{isOut ? s.pickOut : s.pickIn}</span>
            <input className="btn" style={{ width: "100%", cursor: "text", fontWeight: 600 }} autoFocus value={q}
              placeholder={s.search} onChange={(e) => setQ(e.target.value)} />
            <div style={{ height: 10 }} />
            {isOut ? (
              shownInside.length ? shownInside.map((it) => row(it, () => choose(it),
                <div className="pill muted" style={{ whiteSpace: "nowrap" }}>{fmt(it.qty)} {it.uom}</div>))
                : <div className="alert warn">{s.empty}</div>
            ) : (
              <>
                {shownIn.map((it) => {
                  const have = haveOf(it.code, it.product);
                  return row(it, () => choose(it), have
                    ? <div className="pill ok" style={{ whiteSpace: "nowrap" }}>{s.here} · {fmt(have.qty)}</div> : null);
                })}
                {needle.length < 2 && <div className="sm" style={{ padding: "4px 2px" }}>{s.typeMore}</div>}
                {needle.length >= 2 && !shownIn.some((it) => it.code.toLowerCase() === needle || it.product.toLowerCase() === needle) && (
                  <button type="button" className="btn" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setPick(/^[\w-]+$/.test(q.trim()) && /\d/.test(q)
                      ? { code: q.trim(), product: "", uom: "", have: 0 }
                      : { code: "", product: q.trim(), uom: "", have: 0 })}>
                    {s.newItem(q.trim())}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  /* ── what is inside */
  const moves = (stock?.moves || []).slice(-8).reverse();
  return (
    <div>
      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
      {err && <div className="alert bad">{err}</div>}

      <div className="acts" style={{ marginBottom: 10 }}>
        <button type="button" className="btn pri full" onClick={() => start("in")} disabled={loading || !target}>{s.in}</button>
        <button type="button" className="btn full" onClick={() => start("out")} disabled={loading || !items.length}
          style={items.length ? { background: "#fff7ed", borderColor: "#fdba74", color: "#9a3412" } : undefined}>{s.out}</button>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <div className="t2">📦 {s.inside}</div>
            <div className="sm">{items.length} {s.products} · {s.total}: {fmt(totalQty(items))}</div>
            {target?.room != null && <div className="sm" style={{ marginTop: 2 }}>🧊 {s.linked(target.name)}</div>}
          </div>
          <button type="button" className="btn" onClick={load} disabled={loading}>{s.refresh}</button>
        </div>
        {items.length > 6 && (
          <input className="btn" style={{ width: "100%", cursor: "text", fontWeight: 600, marginTop: 10 }} value={q}
            placeholder={s.search} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>

      {loading && !stock ? <div className="sm" style={{ padding: 14 }}>…</div> : !items.length ? (
        <div className="alert warn">{s.empty}</div>
      ) : (
        <>
          <div className="sm" style={{ margin: "0 2px 6px" }}>{s.tapOut}</div>
          {shownInside.map((it) => row(it, () => start("out", it),
            <div style={{ textAlign: "end", whiteSpace: "nowrap" }}>
              <div className="t2">{fmt(it.qty)}</div>
              <div className="sm">{it.uom}</div>
            </div>))}
        </>
      )}

      {moves.length > 0 && (
        <div className="card">
          <div className="t2" style={{ marginBottom: 6 }}>{s.moves}</div>
          {moves.map((m, i) => (
            <div key={`${m.at}-${i}`} className="sm" style={{ padding: "3px 0" }}>
              <b style={{ color: m.dir === "out" ? "#b45309" : "#047857" }}>{m.dir === "out" ? "−" : "+"}{fmt(m.qty)}</b>{" "}
              <span dir="ltr">{m.product || m.code}</span>
              {m.pcs ? ` (${fmt(m.pcs)} ${s.pcsShort})` : ""}
              {m.dir === "in" && m.supplier ? ` · ${m.supplier}` : ""}
              {m.expDate ? ` · ${s.expShort} ${dmy(m.expDate)}` : ""}
              {m.dir === "out" && m.destType ? ` ${destText(m, s, ar)}` : ""} · {hhmm(m.at)}
              {m.keeper ? ` · ${s.keeperShort}: ${m.keeper}` : m.by ? ` · ${m.by}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
