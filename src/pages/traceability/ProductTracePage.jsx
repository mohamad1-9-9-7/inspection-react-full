// src/pages/traceability/ProductTracePage.jsx
//
// منظومة تتبع المنتج — Product Traceability
//
// The screen follows ONE shipment, in the order the question is actually asked:
//   ① أدخل كود المنتج            → the code
//   ② اختر الشحنة                 → every QCS raw-material card that carried it
//   ③ الاستلام في QCS             → what that one shipment brought in
//   ④ المنتج النهائي              → how much went to EACH branch, customers as one group
//   ⑤ سجل استلام الفروع           → what the branch itself wrote down
//   ⑥ المرتجعات                   → the dangerous one
//
// Two rules run through every step below ②, and they are the whole point:
//
//   RULE 1 — nothing before the shipment. A record dated BEFORE the day the
//   shipment was received cannot belong to it: you cannot return, cut or sell
//   goods you have not taken in yet. Such rows are not silently dropped — they
//   are counted and shown in a separate "مستبعد" panel, because a return that
//   predates its own shipment is itself an audit finding.
//
//   RULE 2 — the dates on the box decide. Production / expiry are what tie a
//   downstream row to THIS shipment rather than the next one of the same
//   product. A row whose expiry (or production) date contradicts the shipment
//   is another lot and is separated out; a row that carries no date at all is
//   kept but marked "بالتاريخ فقط" — matched on the code and the window, not
//   proven by a date — and, once a LATER shipment of the same code exists, it
//   is flagged as possibly belonging to that one instead.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ItemCodeInput,
  ItemNameInput,
  useCatalogIndex,
  resolvePair,
} from "../monitor/branches/_shared/CodedProductField";
import {
  traceArrivals,
  traceDownstream,
  mergeTrace,
  filterCodedOnly,
  countByName,
  isConditionIssue,
  isCustomerReturn,
  resolveOurBranch,
  OUR_BRANCHES,
  fmtDMY,
  todayYMD,
  monthsAgoYMD,
} from "./productTraceApi";

/* ===== Palette (Soft Sky) ===== */
const C = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  card: "#ffffff",
  page: "linear-gradient(180deg,#f8fafc 0%,#eef4ff 100%)",
  brand: "#2563eb",
  brandDeep: "#1d4ed8",
  ok: "#059669",
  warn: "#b45309",
  bad: "#be123c",
  shipment: "#4f46e5",
  dispatch: "#0891b2",
  receiving: "#0d9488",
  batch: "#d97706",
  condition: "#9333ea",
  returns: "#e11d48",
};

const RANGES = [
  { key: "6", label: "6 أشهر", months: 6 },
  { key: "12", label: "سنة", months: 12 },
  { key: "24", label: "سنتان", months: 24 },
  { key: "all", label: "كل الفترات", months: null },
];

/* globals.css forces `#root * { font-size:14px !important }` and puts
   overflow-x:hidden on html/body/#root (which silently disables position:
   sticky). Both are undone here with a doubled class, scoped to this page. */
const CSS = `
#root .tx.tx, #root .tx.tx *, #root .tx.tx table, #root .tx.tx table * { font-size: 15px !important; }
#root .tx.tx .tx-h1   { font-size: 27px !important; }
#root .tx.tx .tx-sub  { font-size: 15px !important; }
#root .tx.tx .tx-code { font-size: 24px !important; }
#root .tx.tx .tx-name { font-size: 18px !important; }
#root .tx.tx .tx-big  { font-size: 26px !important; letter-spacing: -.5px; }
#root .tx.tx .tx-mid  { font-size: 19px !important; }
#root .tx.tx .tx-lbl  { font-size: 12px !important; letter-spacing: .3px; }
#root .tx.tx .tx-meta { font-size: 13px !important; }
#root .tx.tx .tx-chip { font-size: 12.5px !important; }
#root .tx.tx .tx-ico  { font-size: 21px !important; }
#root .tx.tx .tx-ico-xl { font-size: 44px !important; }
#root .tx.tx table th { font-size: 13px !important; font-weight: 900; }
#root .tx.tx table td { font-size: 14px !important; }
#root .tx.tx          { font-weight: 600; }

html:has(.tx), body:has(.tx), #root:has(.tx) { overflow-x: clip; }

#root .tx.tx .tx-ships { display: grid; grid-template-columns: repeat(auto-fill,minmax(268px,1fr)); gap: 12px; }
#root .tx.tx .tx-ship {
  text-align: start; font: inherit; color: inherit; cursor: pointer;
  border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; padding: 13px 14px;
  box-shadow: 0 6px 16px rgba(15,23,42,.06); transition: transform .12s ease, box-shadow .12s ease;
}
#root .tx.tx .tx-ship:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(15,23,42,.13); }
#root .tx.tx .tx-search { display: grid; grid-template-columns: minmax(120px,.6fr) minmax(220px,1.8fr) auto; gap: 10px; align-items: end; }
#root .tx.tx .tx-flow { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 8px; }
#root .tx.tx .tx-wrapx { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; }
#root .tx.tx .tx-sheet { display: none; }

@media (max-width: 820px) {
  #root .tx.tx .tx-search { grid-template-columns: minmax(0,1fr); }
}

@media print {
  /* paper gets the traceability record only — the pickers are screen tools */
  #root .tx.tx .no-print, #root .tx.tx .tx-screen { display: none !important; }
  #root .tx.tx .tx-sheet { display: block !important; }
  #root .tx.tx { background: #fff !important; }
  #root .tx.tx .tx-sheet table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  #root .tx.tx .tx-sheet th, #root .tx.tx .tx-sheet td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: start; }
  #root .tx.tx .tx-sheet tr, #root .tx.tx .tx-sheet table { break-inside: avoid; }
  body { background: #fff; }
  @page { size: A4; margin: 12mm; }
}
`;

/* A recorded zero is a finding; "—" is reserved for a value that genuinely is
   not there. */
const num = (v, dp = 2) =>
  Number.isFinite(v) ? Number(v).toFixed(dp).replace(/\.?0+$/, "") || "0" : "—";
const kg = (v) => (Number.isFinite(v) ? `${num(v)} kg` : "—");
const pct = (part, whole) => (whole > 0 ? `${num((part / whole) * 100, 1)}%` : "—");

const S = {
  card: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 16,
    boxShadow: "0 10px 26px rgba(15,23,42,.07)",
    padding: 16,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    color: C.ink,
    fontFamily: "inherit",
  },
  label: { fontWeight: 800, color: C.body, display: "block", marginBottom: 5 },
  btn: (bg, fg = "#fff") => ({
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontWeight: 800,
    cursor: "pointer",
  }),
  chip: (bg, fg) => ({
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: "3px 10px",
    fontWeight: 800,
    display: "inline-block",
  }),
  th: {
    background: "#f8fafc",
    borderBottom: `1px solid ${C.line}`,
    padding: "9px 10px",
    textAlign: "start",
    whiteSpace: "nowrap",
    color: C.body,
  },
  td: { borderBottom: `1px solid ${C.line}`, padding: "8px 10px", color: C.ink, verticalAlign: "top" },
};

/* ===== The two rules, as code ===== */

const ymd = (v) => String(v || "").slice(0, 10);

/** Add days to a YYYY-MM-DD date. */
function addDays(date, days) {
  const t = ymd(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "";
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

const dayDiff = (a, b) => {
  const x = Date.parse(ymd(a));
  const y = Date.parse(ymd(b));
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round((x - y) / 86400000) : null;
};

/**
 * RULE 2 — how well does this row's own production / expiry agree with the
 * shipment? This is a CONFIDENCE MARK, not a filter: the window decides what
 * is counted, the dates only say how sure we are.
 *
 * That distinction was learned the hard way — a shipment expiring 16/09 had
 * its returns written as 15/09 (one day off, the branch rounding shelf life),
 * and treating the mismatch as an exclusion emptied every step of a trace
 * whose records plainly existed.
 *
 *   "lot"   — the date matches exactly: proven.
 *   "near"  — within NEAR_DAYS: almost certainly the same goods, written by a
 *             different hand.
 *   "other" — a clearly different date: probably another lot, still counted
 *             inside the window but flagged.
 *   "date"  — the row carries no date: matched on code + window only.
 */
const NEAR_DAYS = 3;

function lotVerdict(rowProd, rowExp, anchor) {
  const re = ymd(rowExp);
  const rp = ymd(rowProd);
  const ae = ymd(anchor.expiryDate);
  const ap = ymd(anchor.prodDate);

  const grade = (rowDate, anchorDate) => {
    if (rowDate === anchorDate) return { verdict: "lot", off: 0 };
    const off = dayDiff(rowDate, anchorDate);
    if (off != null && Math.abs(off) <= NEAR_DAYS) return { verdict: "near", off };
    return { verdict: "other", off };
  };

  if (ae && re) return grade(re, ae);
  if (ap && rp) return grade(rp, ap);
  // Only one side carries a date — it proves nothing either way.
  return { verdict: "date", off: null };
}

/**
 * Split one family against the chosen shipment.
 *
 * RULE 1 decides membership and nothing else: a record belongs to this
 * shipment when its date falls between the day the goods arrived and the day
 * they expire. Rows outside that window are separated (and reported); rows
 * inside it are all kept, each carrying its own confidence mark.
 *
 * `strict` re-imposes the old exact-lot filter for the rare case where a
 * product really does have two live lots at once.
 */
function splitByShipment(hits, anchor, { until, nextShipmentDate, datesOf, strict }) {
  const kept = [];
  const before = [];
  const other = [];
  const after = [];

  (hits || []).forEach((h) => {
    const d = ymd(h.date);
    // RULE 1 — nothing that happened before the goods arrived.
    if (d && anchor.date && d < anchor.date) {
      before.push(h);
      return;
    }
    if (until && d && d > until) {
      after.push(h);
      return;
    }
    const { prodDate, expiryDate } = datesOf(h);
    const { verdict, off } = lotVerdict(prodDate, expiryDate, anchor);
    const row = {
      ...h,
      prodDate,
      expiryDate,
      verdict,
      off,
      late: verdict === "date" && !!nextShipmentDate && d >= nextShipmentDate,
    };
    if (strict && verdict === "other") {
      other.push(row);
      return;
    }
    kept.push(row);
  });

  return { kept, before, other, after };
}

/* Which pair of dates each family carries. Kept next to the split so the two
   are read together. */
const datesOfDispatch = (h) => ({ prodDate: h.prodDate, expiryDate: h.expiryDate });
const datesOfReceiving = (h) => ({ prodDate: h.prodDate, expiryDate: h.expiryDate });
const datesOfReturn = (h) => ({ prodDate: "", expiryDate: h.expiryDate });
const datesOfCondition = (h) => ({ prodDate: "", expiryDate: h.expiryDate });
const datesOfBatch = (h) => ({
  prodDate: h.role === "output" ? h.finalProdDate : h.origProdDate || h.finalProdDate,
  expiryDate: h.role === "output" ? h.finalExpDate : h.origExpDate || h.finalExpDate,
});

/* ===== Small UI pieces ===== */

function Step({ n, icon, title, ar, color, chips, children, id }) {
  return (
    <section id={id} style={{ ...S.card, marginTop: 14, borderInlineStart: `5px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 9, background: color, color: "#fff",
            display: "grid", placeItems: "center", fontWeight: 1000,
          }}
        >
          {n}
        </span>
        <span className="tx-ico">{icon}</span>
        <span className="tx-mid" style={{ fontWeight: 900, color: C.ink }}>{ar}</span>
        <span className="tx-meta" style={{ color: C.muted }}>{title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="tx-meta" style={{ color: C.muted, padding: "14px 4px", fontWeight: 700 }}>
      {text}
    </div>
  );
}

/** What a step did NOT count, and why. A trace that hides its exclusions is
 *  worse than no trace: an empty step must never be ambiguous. */
function Excluded({ part, what }) {
  if (!part) return null;
  const bits = [];
  if (part.before.length) bits.push(`${part.before.length} قبل تاريخ استلام الشحنة`);
  if (part.other.length) bits.push(`${part.other.length} بتاريخ إنتاج/انتهاء يخص دفعة أخرى`);
  if (part.after.length) bits.push(`${part.after.length} بعد نهاية النافذة`);
  if (!bits.length) return null;
  return (
    <div className="tx-meta" style={{ marginTop: 8, color: C.muted }}>
      لم تُحتسب من {what}: {bits.join(" · ")}.
    </div>
  );
}

/** "مطابقة مؤكدة" vs "بالتاريخ فقط" — never let the screen imply proof it
 *  does not have. */
/** The same judgement in words, for Excel and for paper. */
function verdictText(r) {
  if (r.verdict === "lot") return "مطابق تماماً";
  if (r.verdict === "near") return `فرق ${Math.abs(r.off)} يوم عن تاريخ الشحنة`;
  if (r.verdict === "other") return `تاريخ مختلف${r.off != null ? ` (${r.off > 0 ? "+" : ""}${r.off} يوم)` : ""}`;
  return r.late ? "بلا تاريخ — قد يكون من شحنة لاحقة" : "بلا تاريخ إنتاج/انتهاء";
}

function Verdict({ v, off, late }) {
  if (v === "lot") {
    return <span className="tx-chip" style={S.chip("#dcfce7", "#166534")} title="تاريخ الإنتاج/الانتهاء مطابق تماماً لتاريخ الشحنة">✓ مطابق</span>;
  }
  if (v === "near") {
    return (
      <span className="tx-chip" style={S.chip("#ecfeff", "#0e7490")} title="فرق يوم أو أيام قليلة عن تاريخ الشحنة — غالباً نفس البضاعة بيد كاتب مختلف">
        ≈ فرق {Math.abs(off)} يوم
      </span>
    );
  }
  if (v === "other") {
    return (
      <span className="tx-chip" style={S.chip("#fef3c7", "#92400e")} title="تاريخ إنتاج/انتهاء مختلف — قد يكون من دفعة أخرى، لكنه داخل النطاق الزمني للشحنة">
        ⚠ تاريخ مختلف{off != null ? ` (${off > 0 ? "+" : ""}${off})` : ""}
      </span>
    );
  }
  return (
    <span
      className="tx-chip"
      style={S.chip(late ? "#fee2e2" : "#f1f5f9", late ? "#991b1b" : C.body)}
      title={
        late
          ? "السطر لا يحمل تاريخ إنتاج/انتهاء، وتاريخه بعد وصول شحنة أحدث من نفس المنتج — قد يكون منها"
          : "السطر لا يحمل تاريخ إنتاج/انتهاء — طوبق على الكود والنطاق الزمني فقط"
      }
    >
      {late ? "⚠ قد يكون من شحنة لاحقة" : "~ بلا تاريخ"}
    </span>
  );
}

function Money({ label, value, unit, tone, sub }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 13px", background: "#fff", minWidth: 132 }}>
      <div className="tx-lbl" style={{ color: C.muted, fontWeight: 800 }}>{label}</div>
      <div className="tx-big" style={{ fontWeight: 1000, color: tone || C.ink }}>
        {value}
        {unit ? <span className="tx-meta" style={{ color: C.muted, fontWeight: 800 }}> {unit}</span> : null}
      </div>
      {sub ? <div className="tx-meta" style={{ color: C.muted }}>{sub}</div> : null}
    </div>
  );
}

/* ===== Page ===== */

export default function ProductTracePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { byCode, byName, loading: catalogLoading } = useCatalogIndex();

  const [product, setProduct] = useState({ code: params.get("code") || "", name: "" });
  const [rangeKey, setRangeKey] = useState("12");
  const [from, setFrom] = useState(monthsAgoYMD(12));
  const [to, setTo] = useState(todayYMD());

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, phase: "" });
  const [arrivals, setArrivals] = useState(null);
  const [downstream, setDownstream] = useState(null);
  const [pickedId, setPickedId] = useState("");
  const [codedOnly, setCodedOnly] = useState(false);
  // The window that stays open after the shipment lands. Returns are the
  // reason it exists: "بعد الاستلام" has to end somewhere, and the expiry date
  // is the honest end — plus a grace period for goods that came back late.
  const [graceDays, setGraceDays] = useState(0);
  const [openWindow, setOpenWindow] = useState(false);
  const [strictLot, setStrictLot] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [openBranch, setOpenBranch] = useState(""); // which branch's own rows are unfolded
  const [tracedFor, setTracedFor] = useState(null);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const full = useMemo(() => (arrivals ? mergeTrace(arrivals, downstream) : null), [arrivals, downstream]);
  const scoped = useMemo(() => (full ? (codedOnly ? filterCodedOnly(full) : full) : null), [full, codedOnly]);
  const byNameCount = useMemo(() => countByName(full), [full]);

  useEffect(() => {
    if (catalogLoading) return;
    setProduct((prev) => {
      const filled = resolvePair({ ...prev, byCode, byName });
      return filled.code === prev.code && filled.name === prev.name ? prev : filled;
    });
  }, [catalogLoading, byCode, byName]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const applyRange = (key) => {
    setRangeKey(key);
    const r = RANGES.find((x) => x.key === key);
    if (!r) return;
    // "All time" sends no bounds at all: the server's dated query drops rows
    // whose payload carries no business date, and those are exactly the old
    // records an all-time search is looking for.
    setTo(r.months == null ? "" : todayYMD());
    setFrom(r.months == null ? "" : monthsAgoYMD(r.months));
  };

  const runTrace = useCallback(async () => {
    const code = String(product.code || "").trim();
    const name = String(product.name || "").trim();
    if (!code && !name) {
      setError("أدخل كود المنتج أولاً.");
      return;
    }
    setError("");
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const who = { code, name, from, to };

    setBusy(true);
    setArrivals(null);
    setDownstream(null);
    setPickedId("");
    setProgress({ done: 0, total: 0, phase: "arrivals" });
    try {
      // Arrivals first — the shipment list is what the user picks from, so it
      // has to be on screen before the long downstream read finishes.
      const res = await traceArrivals({
        ...who,
        signal: ac.signal,
        onProgress: (done, total) => setProgress({ done, total, phase: "arrivals" }),
      });
      setArrivals(res);
      setTracedFor(who);

      setProgress({ done: 0, total: 0, phase: "downstream" });
      const down = await traceDownstream({
        ...who,
        signal: ac.signal,
        onProgress: (done, total) => setProgress({ done, total, phase: "downstream" }),
      });
      setDownstream(down);

      const next = new URLSearchParams(params);
      if (code) next.set("code", code);
      else next.delete("code");
      setParams(next, { replace: true });
    } catch (e) {
      if (e?.name !== "AbortError") setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [product, from, to, params, setParams]);

  /* ── ② the shipments, oldest date last ── */
  const shipments = useMemo(() => {
    const list = [...(scoped?.shipments || [])];
    return list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [scoped]);

  const anchor = useMemo(
    () => shipments.find((sh) => String(sh.id) === pickedId) || null,
    [shipments, pickedId]
  );

  /* The next shipment of the same code — the moment a date-only row downstream
     stops being certainly ours. */
  const nextShipmentDate = useMemo(() => {
    if (!anchor) return "";
    const later = shipments
      .filter((sh) => ymd(sh.date) > ymd(anchor.date))
      .map((sh) => ymd(sh.date))
      .sort();
    return later[0] || "";
  }, [shipments, anchor]);

  /* The window: from the day it arrived to its expiry + grace. */
  const until = useMemo(() => {
    if (!anchor || openWindow) return "";
    // No expiry on the shipment card means there is no honest end to the
    // window — closing it at "arrival + 30 days" would quietly delete real
    // movements. Such a shipment gets an open window and says so.
    const base = ymd(anchor.expiryDate);
    if (!base) return "";
    return addDays(base, Number(graceDays) || 0) || "";
  }, [anchor, graceDays, openWindow]);

  const split = useMemo(() => {
    if (!scoped || !anchor) return null;
    const opts = { until, nextShipmentDate, strict: strictLot };
    return {
      receiving: splitByShipment(scoped.receiving, anchor, { ...opts, datesOf: datesOfReceiving }),
      batches: splitByShipment(scoped.batches, anchor, { ...opts, datesOf: datesOfBatch }),
      dispatch: splitByShipment(scoped.dispatch, anchor, { ...opts, datesOf: datesOfDispatch }),
      conditions: splitByShipment(scoped.conditions, anchor, { ...opts, datesOf: datesOfCondition }),
      returns: splitByShipment(scoped.returns, anchor, { ...opts, datesOf: datesOfReturn }),
    };
  }, [scoped, anchor, until, nextShipmentDate, strictLot]);

  /* ── ④ where it went: our branches one by one, customers as ONE group ── */
  const distribution = useMemo(() => {
    if (!split) return null;
    const byId = new Map(OUR_BRANCHES.map((b) => [b.id, { ...b, qty: 0, lines: 0, lastDate: "", rows: [] }]));
    const customers = { qty: 0, lines: 0, names: new Set(), lastDate: "" };

    split.dispatch.kept.forEach((d) => {
      const br = resolveOurBranch(d.customer);
      if (!br) {
        customers.qty += d.qty || 0;
        customers.lines += 1;
        if (d.customer) customers.names.add(d.customer);
        if (ymd(d.date) > customers.lastDate) customers.lastDate = ymd(d.date);
        return;
      }
      const b = byId.get(br.id);
      b.qty += d.qty || 0;
      b.lines += 1;
      b.rows.push(d);
      if (ymd(d.date) > b.lastDate) b.lastDate = ymd(d.date);
    });

    const branches = Array.from(byId.values()).filter((b) => b.lines > 0).sort((a, b) => b.qty - a.qty);
    return {
      branches,
      customers: { ...customers, names: customers.names.size },
      ourQty: branches.reduce((a, b) => a + b.qty, 0),
      unit: split.dispatch.kept[0]?.unit || "KG",
    };
  }, [split]);

  /* ── ⑤ what each branch's own receiving log says ── */
  const receivedByBranch = useMemo(() => {
    if (!split) return [];
    const map = new Map();
    split.receiving.kept.forEach((r) => {
      const id = r.branch || "—";
      const cur = map.get(id) || { id, qty: 0, lines: 0, lastDate: "", proven: 0, rows: [] };
      cur.qty += r.amount || 0;
      cur.lines += 1;
      cur.rows.push(r);
      if (r.verdict === "lot" || r.verdict === "near") cur.proven += 1;
      if (ymd(r.date) > cur.lastDate) cur.lastDate = ymd(r.date);
      map.set(id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [split]);

  /* ── ⑥ returns ── */
  const returns = useMemo(() => {
    if (!split) return null;
    const kept = [...split.returns.kept].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const qty = kept.reduce((a, r) => a + (r.qty || 0), 0);
    const proven = kept.filter((r) => r.verdict === "lot" || r.verdict === "near");
    return {
      rows: kept,
      qty,
      provenQty: proven.reduce((a, r) => a + (r.qty || 0), 0),
      provenCount: proven.length,
      customerCount: kept.filter(isCustomerReturn).length,
      before: split.returns.before,
      beforeQty: split.returns.before.reduce((a, r) => a + (r.qty || 0), 0),
      other: split.returns.other,
      after: split.returns.after,
    };
  }, [split]);

  const conditionIssues = useMemo(
    () => (split ? split.conditions.kept.filter((c) => isConditionIssue(c.status)) : []),
    [split]
  );

  const sentTotal = (distribution?.ourQty || 0) + (distribution?.customers.qty || 0);
  const loggedTotal = receivedByBranch.reduce((a, b) => a + b.qty, 0);
  const gap = (distribution?.ourQty || 0) - loggedTotal;

  /* ── exports ── */
  const exportExcel = useCallback(async () => {
    if (!anchor || !split) return;
    const XLSX = await import("xlsx");
    const head = [
      ["سجل تتبّع شحنة / Shipment traceability record"],
      ["الكود", tracedFor?.code || "", "المنتج", tracedFor?.name || ""],
      ["تاريخ الشحنة", fmtDMY(anchor.date), "المورّد", anchor.supplier || "—"],
      ["الفاتورة", anchor.invoiceNo || "—", "المنشأ", anchor.origin || "—"],
      ["تاريخ الإنتاج", fmtDMY(anchor.prodDate) || anchor.prodDateRaw || "—", "تاريخ الانتهاء", fmtDMY(anchor.expiryDate) || anchor.expiryDateRaw || "—"],
      ["الوارد", anchor.weight, "النافذة", openWindow ? "مفتوحة" : `حتى ${fmtDMY(until)}`],
      [],
    ];
    const dist = [
      ["④ الإرسال — تقرير المنتج النهائي"],
      ["الجهة", "عدد السطور", "الكمية", "آخر تاريخ"],
      ...(distribution?.branches || []).map((b) => [b.label, b.lines, b.qty, fmtDMY(b.lastDate)]),
      ["العملاء (مجمّع)", distribution?.customers.lines || 0, distribution?.customers.qty || 0, fmtDMY(distribution?.customers.lastDate)],
      [],
      ["⑤ استلام الفروع — سجل الاستلام"],
      ["الفرع", "عدد السطور", "الكمية المسجّلة", "آخر تاريخ"],
      ...receivedByBranch.map((b) => [b.id, b.lines, b.qty, fmtDMY(b.lastDate)]),
      [],
      ["⑥ المرتجعات"],
      ["التاريخ", "الجهة", "المصدر", "الكمية", "الوحدة", "تاريخ الانتهاء", "المطابقة", "الإجراء", "ملاحظات"],
      ...(returns?.rows || []).map((r) => [
        fmtDMY(r.date), r.place || r.customerName || "—", r.sourceLabelAr || "",
        r.qty, r.qtyType || "", fmtDMY(r.expiryDate) || "—",
        verdictText(r),
        r.action || "", r.remarks || "",
      ]),
      [],
      ["مرتجعات مستبعدة — قبل تاريخ استلام الشحنة"],
      ["التاريخ", "الجهة", "الكمية", "تاريخ الانتهاء"],
      ...(returns?.before || []).map((r) => [fmtDMY(r.date), r.place || "—", r.qty, fmtDMY(r.expiryDate) || "—"]),
    ];
    const ws = XLSX.utils.aoa_to_sheet([...head, ...dist]);
    ws["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 34 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trace");
    XLSX.writeFile(wb, `trace-${tracedFor?.code || "product"}-${ymd(anchor.date)}.xlsx`);
  }, [anchor, split, distribution, receivedByBranch, returns, tracedFor, until, openWindow]);

  const hasResult = !!scoped && !!tracedFor;

  return (
    <div className="tx" style={{ minHeight: "100vh", background: C.page, fontFamily: "Inter,Roboto,Cairo,sans-serif", paddingBottom: 60 }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ background: "linear-gradient(135deg,#1d4ed8 0%,#4f46e5 45%,#0891b2 100%)", color: "#fff", padding: "18px 0 54px" }}>
        <div style={{ padding: "0 18px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", borderRadius: 10, padding: "6px 14px", fontWeight: 800, cursor: "pointer", marginBottom: 10 }}
          >
            ← رجوع
          </button>
          <h1 className="tx-h1" style={{ margin: 0, fontWeight: 1000 }}>🧬 تتبّع شحنة · Shipment Traceability</h1>
          <p className="tx-sub" style={{ margin: "5px 0 0", opacity: 0.93, fontWeight: 600 }}>
            كود المنتج ← اختر الشحنة ← استلام QCS ← المنتج النهائي (فرع فرع، والعملاء مجمّعين) ← استلام الفروع ← المرتجعات
          </p>
        </div>
      </div>

      <div style={{ padding: "0 18px", marginTop: -40, boxSizing: "border-box" }}>
        {/* ── ① search ── */}
        <form
          className="no-print"
          style={S.card}
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) runTrace();
          }}
        >
          <div className="tx-search">
            <div>
              <label className="tx-lbl" style={S.label}>① الكود / Item code</label>
              <ItemCodeInput code={product.code} name={product.name} onChange={setProduct} style={S.input} placeholder="20000" />
            </div>
            <div>
              <label className="tx-lbl" style={S.label}>المنتج / Product</label>
              <ItemNameInput code={product.code} name={product.name} onChange={setProduct} style={S.input} placeholder="ابحث بالاسم أو الكود…" />
            </div>
            <button
              type="submit"
              disabled={busy}
              style={{ ...S.btn(busy ? "#94a3b8" : C.brandDeep), whiteSpace: "nowrap", cursor: busy ? "progress" : "pointer" }}
            >
              {busy ? "…جارٍ البحث" : "🔍 اعرض الشحنات"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 12 }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => applyRange(r.key)}
                style={{ ...S.btn(rangeKey === r.key ? C.brand : "#eef2ff", rangeKey === r.key ? "#fff" : C.brandDeep), padding: "7px 13px" }}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCodedOnly((v) => !v)}
              title="أظهر فقط السطور التي تحمل كود المنتج"
              style={{ ...S.btn(codedOnly ? C.brandDeep : "#fff", codedOnly ? "#fff" : C.body), border: `1px solid ${codedOnly ? C.brandDeep : C.line}`, padding: "7px 13px" }}
            >
              {codedOnly ? "☑" : "☐"} بالكود فقط{full && byNameCount ? ` (${byNameCount})` : ""}
            </button>
            <div>
              <label className="tx-lbl" style={S.label}>من</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRangeKey("custom"); }} style={{ ...S.input, width: 158 }} />
            </div>
            <div>
              <label className="tx-lbl" style={S.label}>إلى</label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRangeKey("custom"); }} style={{ ...S.input, width: 158 }} />
            </div>
            {busy ? (
              <button type="button" onClick={() => abortRef.current?.abort()} style={{ ...S.btn("#fff", C.body), border: `1px solid ${C.line}`, padding: "9px 14px" }}>
                ✕ إلغاء
              </button>
            ) : null}
          </div>

          {busy && progress.total > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="tx-meta" style={{ color: C.muted, fontWeight: 800, marginBottom: 5 }}>
                {progress.phase === "arrivals" ? "قراءة شحنات QCS وسجلات الاستلام…" : "قراءة المنتج النهائي والمرتجعات…"} {progress.done}/{progress.total}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((progress.done / progress.total) * 100)}%`, background: C.brand, transition: "width .25s ease" }} />
              </div>
            </div>
          ) : null}
          {error ? <div className="tx-meta" style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800 }}>⚠️ {error}</div> : null}
        </form>

        {/* A dropped connection makes every family come back empty. Saying
            "no shipments" then would be a lie with consequences. */}
        {scoped?.failed?.length ? (
          <div className="tx-screen" style={{ ...S.card, marginTop: 16, border: "1px solid #fecaca", background: "#fef2f2" }}>
            <div style={{ fontWeight: 900, color: "#991b1b" }}>
              ⚠ تعذّرت قراءة {scoped.failed.length} مصدر من السجلات — النتيجة أدناه ناقصة
            </div>
            <div className="tx-meta" style={{ color: "#7f1d1d", marginTop: 5, lineHeight: 1.9 }}>
              غالباً انقطاع في الاتصال بالإنترنت أو بالخادم. لا تعتمد على هذه النتيجة للتتبّع أو السحب —
              تحقّق من الاتصال ثم أعد البحث.
              <div style={{ marginTop: 4, opacity: 0.85 }}>{scoped.failed.join("، ")}</div>
            </div>
            <button
              type="button"
              onClick={() => runTrace()}
              disabled={busy}
              style={{ ...S.btn("#991b1b"), marginTop: 10, padding: "8px 14px" }}
            >
              ↻ أعد المحاولة
            </button>
          </div>
        ) : null}

        {!hasResult ? (
          <div style={{ ...S.card, marginTop: 16, textAlign: "center", color: C.muted, padding: "44px 18px" }}>
            <div className="tx-ico-xl">🧬</div>
            <div style={{ fontWeight: 900, color: C.ink, marginTop: 8 }}>أدخل كود المنتج</div>
            <div className="tx-meta" style={{ marginTop: 6, lineHeight: 1.9 }}>
              ستظهر لك كل شحنات QCS التي حملت هذا الكود، تختار واحدة منها،<br />
              فيتتبّعها النظام خطوة بخطوة حتى المرتجعات — مع تدقيق تواريخ الإنتاج والانتهاء.
            </div>
          </div>
        ) : (
          <>
            {/* ── ② pick the shipment ── */}
            <section className="tx-screen" style={{ ...S.card, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: C.shipment, color: "#fff", display: "grid", placeItems: "center", fontWeight: 1000 }}>②</span>
                <span className="tx-mid" style={{ fontWeight: 900, color: C.ink }}>اختر الشحنة التي تريد تتبّعها</span>
                <span className="tx-meta" style={{ color: C.muted }}>
                  {shipments.length} شحنة تحمل الكود {tracedFor.code || tracedFor.name} · قُرئ {scoped.scanned} تقرير
                </span>
                {anchor ? (
                  <button type="button" onClick={() => setPickedId("")} style={{ ...S.btn("#f1f5f9", C.body), padding: "6px 12px" }}>
                    ✕ غيّر الشحنة
                  </button>
                ) : null}
              </div>

              {!shipments.length ? (
                <div style={{ borderInlineStart: `4px solid ${C.warn}`, paddingInlineStart: 12 }}>
                  <div style={{ fontWeight: 900, color: C.ink }}>لا توجد شحنة QCS بهذا الكود ضمن الفترة</div>
                  <ul className="tx-meta" style={{ margin: "6px 0 0", paddingInlineStart: 20, lineHeight: 2, color: C.body }}>
                    <li>وسّع الفترة إلى «كل الفترات» — الشحنة قد تكون أقدم.</li>
                    {codedOnly && byNameCount ? <li>«بالكود فقط» يخفي {byNameCount} سطراً مطابقاً بالاسم.</li> : null}
                    <li>إن كان المنتج مصنّعاً عندنا فلا شحنة واردة له أصلاً — يبدأ من تقرير المنتج النهائي.</li>
                  </ul>
                </div>
              ) : (
                <div className="tx-ships">
                  {shipments.map((sh) => {
                    const on = String(sh.id) === pickedId;
                    return (
                      <button
                        key={sh.id}
                        type="button"
                        className="tx-ship"
                        onClick={() => setPickedId(on ? "" : String(sh.id))}
                        style={{ borderColor: on ? C.shipment : C.line, background: on ? "#eef2ff" : "#fff" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span className="tx-mid" style={{ fontWeight: 1000, color: C.shipment }}>{fmtDMY(sh.date)}</span>
                          <span className="tx-chip" style={S.chip("#eef2ff", C.brandDeep)}>{kg(sh.weight)}</span>
                        </div>
                        <div style={{ fontWeight: 900, color: C.ink, marginTop: 5 }}>{sh.supplier || "بدون مورّد مسجّل"}</div>
                        <div className="tx-meta" style={{ color: C.muted, marginTop: 3, lineHeight: 1.8 }}>
                          {sh.invoiceNo ? `فاتورة ${sh.invoiceNo} · ` : ""}{sh.origin || "—"}
                          <br />
                          إنتاج {fmtDMY(sh.prodDate) || sh.prodDateRaw || "—"} · انتهاء {fmtDMY(sh.expiryDate) || sh.expiryDateRaw || "—"}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <span className="tx-chip" style={S.chip(on ? C.shipment : "#f1f5f9", on ? "#fff" : C.body)}>
                            {on ? "◉ يجري تتبّعها" : "تتبّع هذه الشحنة ←"}
                          </span>
                          {sh.via === "name" ? (
                            <span className="tx-chip" style={{ ...S.chip("#fef3c7", "#92400e"), marginInlineStart: 6 }}>بالاسم</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {anchor && split ? (
              <>
                {/* ── window control + balance ── */}
                <section className="tx-screen" style={{ ...S.card, marginTop: 14 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div className="tx-code" style={{ background: C.brandDeep, color: "#fff", borderRadius: 12, padding: "8px 15px", fontWeight: 1000 }}>
                      {tracedFor.code || "—"}
                    </div>
                    <div style={{ minWidth: 200 }}>
                      <div className="tx-name" style={{ fontWeight: 900, color: C.ink }}>{tracedFor.name || anchor.matchedName || "—"}</div>
                      <div className="tx-meta" style={{ color: C.muted }}>
                        شحنة {fmtDMY(anchor.date)} · {anchor.supplier || "—"}
                        {anchor.invoiceNo ? ` · فاتورة ${anchor.invoiceNo}` : ""}
                      </div>
                    </div>
                    <span style={{ flex: 1 }} />
                    <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                      <div>
                        <label className="tx-lbl" style={S.label}>نافذة المتابعة بعد الانتهاء</label>
                        <select
                          value={openWindow ? "open" : String(graceDays)}
                          onChange={(e) => {
                            if (e.target.value === "open") setOpenWindow(true);
                            else { setOpenWindow(false); setGraceDays(Number(e.target.value)); }
                          }}
                          style={{ ...S.input, width: "auto", minWidth: 210, fontWeight: 800 }}
                        >
                          <option value="0">حتى تاريخ الانتهاء (الافتراضي)</option>
                          <option value="15">حتى الانتهاء + 15 يوم</option>
                          <option value="30">حتى الانتهاء + 30 يوم</option>
                          <option value="90">حتى الانتهاء + 90 يوم</option>
                          <option value="open">بلا حد</option>
                        </select>
                      </div>
                      <div>
                        <label className="tx-lbl" style={S.label}>&nbsp;</label>
                        <button
                          type="button"
                          onClick={() => setStrictLot((v) => !v)}
                          title="استبعد السطور التي تحمل تاريخ إنتاج/انتهاء مختلف عن الشحنة — استعمله فقط عند وجود دفعتين حيّتين لنفس المنتج"
                          style={{
                            ...S.btn(strictLot ? C.brandDeep : "#fff", strictLot ? "#fff" : C.body),
                            border: `1px solid ${strictLot ? C.brandDeep : C.line}`, padding: "10px 13px",
                          }}
                        >
                          {strictLot ? "☑" : "☐"} تطابق تام للدفعة
                        </button>
                      </div>
                      <button type="button" onClick={() => window.print()} style={{ ...S.btn("#0f172a"), padding: "9px 14px" }}>🖨 ورقة التتبّع</button>
                      <button type="button" onClick={exportExcel} style={{ ...S.btn("#166534"), padding: "9px 14px" }}>⬇ Excel</button>
                    </div>
                  </div>

                  <div className="tx-meta" style={{ color: C.muted, marginTop: 10, lineHeight: 1.9, borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
                    <b style={{ color: C.ink }}>النطاق الزمني: من {fmtDMY(anchor.date)} (استلام الشحنة){" "}
                    {!until
                      ? openWindow
                        ? "وحتى اليوم — بلا حد"
                        : "وحتى اليوم — الشحنة بلا تاريخ انتهاء، فلا نهاية منطقية للنطاق"
                      : `وحتى ${fmtDMY(until)}${graceDays ? ` (الانتهاء + ${graceDays} يوم)` : " (تاريخ انتهاء المنتج)"}`}
                    </b>
                    {" — "}كل ما بداخل هذا النطاق ويحمل كود المنتج يُحتسب: تقرير المنتج النهائي، سجل استلام كل فرع، والمرتجعات.
                    {" "}ولا يُحتسب أي سجل قبل تاريخ الاستلام — لا يمكن إرجاع أو تقطيع منتج لم يُستلم بعد.
                    {" "}تواريخ الإنتاج/الانتهاء تظهر كـ<b style={{ color: C.ink }}> درجة تأكيد</b> على كل سطر (مطابق / فرق أيام / تاريخ مختلف)، لا كفلتر يحذف السطر
                    {strictLot ? <b style={{ color: C.warn }}> — إلا الآن، فخيار «تطابق تام للدفعة» مفعّل ويستبعد التواريخ المختلفة.</b> : "."}
                    {nextShipmentDate ? <> وصلت شحنة أخرى من نفس الكود في <b style={{ color: C.warn }}>{fmtDMY(nextShipmentDate)}</b> — السطور بلا تاريخ بعد ذلك اليوم مُعلَّمة بتحذير.</> : null}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <Money label="③ وارد الشحنة" value={num(anchor.weight)} unit="kg" tone={C.shipment} sub={anchor.qty ? `${num(anchor.qty, 0)} قطعة` : ""} />
                    <Money label="④ أُرسل لفروعنا" value={num(distribution?.ourQty || 0)} unit={distribution?.unit?.toLowerCase() || "kg"} tone={C.dispatch} sub={`${distribution?.branches.length || 0} فرع`} />
                    <Money label="④ العملاء" value={num(distribution?.customers.qty || 0)} unit={distribution?.unit?.toLowerCase() || "kg"} tone={C.body} sub={`${distribution?.customers.lines || 0} سطر · ${distribution?.customers.names || 0} جهة`} />
                    <Money label="⑤ سجّلت الفروع" value={num(loggedTotal)} unit="kg" tone={C.receiving} sub={Math.abs(gap) > 0.5 ? `فرق ${num(Math.abs(gap))} kg` : "مطابق"} />
                    <Money label="⑥ المرتجعات" value={num(returns?.qty || 0)} unit="kg" tone={C.returns} sub={sentTotal ? `${pct(returns?.qty || 0, sentTotal)} من المُرسل` : ""} />
                  </div>
                </section>

                {/* ── ③ QCS receipt ── */}
                <Step
                  n="③" icon="🚚" ar="استلام الشحنة في QCS" title="QCS raw material receipt" color={C.shipment}
                  chips={<span className="tx-chip" style={S.chip("#eef2ff", C.brandDeep)}>{kg(anchor.weight)}</span>}
                >
                  <div className="tx-wrapx">
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                      <tbody>
                        <tr>
                          <th style={S.th}>التاريخ</th><td style={S.td}>{fmtDMY(anchor.date)}</td>
                          <th style={S.th}>المورّد</th><td style={S.td}>{anchor.supplier || "—"}</td>
                          <th style={S.th}>الفاتورة</th><td style={S.td}>{anchor.invoiceNo || "—"}</td>
                        </tr>
                        <tr>
                          <th style={S.th}>الكمية المستلمة</th>
                          <td style={{ ...S.td, fontWeight: 900 }}>{kg(anchor.weight)}{anchor.qty ? ` · ${num(anchor.qty, 0)} قطعة` : ""}</td>
                          <th style={S.th}>تاريخ الإنتاج</th>
                          <td style={{ ...S.td, fontWeight: 900 }}>{fmtDMY(anchor.prodDate) || anchor.prodDateRaw || "—"}</td>
                          <th style={S.th}>تاريخ الانتهاء</th>
                          <td style={{ ...S.td, fontWeight: 900, color: C.bad }}>{fmtDMY(anchor.expiryDate) || anchor.expiryDateRaw || "—"}</td>
                        </tr>
                        <tr>
                          <th style={S.th}>المنشأ</th><td style={S.td}>{anchor.origin || "—"}</td>
                          <th style={S.th}>العلامة</th><td style={S.td}>{anchor.brand || "—"}</td>
                          <th style={S.th}>الحالة</th><td style={S.td}>{anchor.status || "—"}{anchor.temperature ? ` · ${anchor.temperature}°` : ""}</td>
                        </tr>
                        <tr>
                          <th style={S.th}>مكان الاستلام</th><td style={S.td}>{anchor.location || "QCS"}</td>
                          <th style={S.th}>المفتّش</th><td style={S.td}>{anchor.inspectedBy || "—"}</td>
                          <th style={S.th}>الرقم المرجعي</th><td style={S.td}>{anchor.refNo || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {!anchor.expiryDate && !anchor.prodDate ? (
                    <div className="tx-meta" style={{ marginTop: 10, color: C.warn, fontWeight: 800 }}>
                      ⚠ هذه الشحنة لا تحمل تاريخ إنتاج ولا انتهاء — كل ما يليها سيُطابَق على الكود والفترة فقط، لا على الدفعة.
                    </div>
                  ) : null}
                </Step>

                {/* ── ④ final product → branches + customers ── */}
                <Step
                  n="④" icon="📤" ar="الإرسال — تقرير المنتج النهائي" title="Final product dispatch" color={C.dispatch}
                  chips={
                    <>
                      <span className="tx-chip" style={S.chip("#ecfeff", "#0e7490")}>فروعنا {num(distribution?.ourQty || 0)}</span>
                      <span className="tx-chip" style={S.chip("#f1f5f9", C.body)}>العملاء {num(distribution?.customers.qty || 0)}</span>
                    </>
                  }
                >
                  {!split.dispatch.kept.length ? (
                    <Empty text="لا يوجد أي سطر إرسال لهذه الشحنة ضمن النافذة." />
                  ) : (
                    <div className="tx-wrapx">
                      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                        <thead>
                          <tr>
                            <th style={S.th}>الجهة</th>
                            <th style={{ ...S.th, textAlign: "end" }}>الكمية</th>
                            <th style={{ ...S.th, textAlign: "end" }}>النسبة</th>
                            <th style={S.th}>عدد السطور</th>
                            <th style={S.th}>آخر إرسال</th>
                            <th style={S.th}>التأكيد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distribution.branches.map((b) => {
                            const proven = b.rows.filter((r) => r.verdict === "lot" || r.verdict === "near").length;
                            const key = `d:${b.id}`;
                            const open = openBranch === key;
                            return (
                              <React.Fragment key={b.id}>
                                <tr onClick={() => setOpenBranch(open ? "" : key)} style={{ cursor: "pointer", background: open ? "#f8fafc" : undefined }}>
                                  <td style={{ ...S.td, fontWeight: 900 }}>
                                    <span style={{ color: C.muted, marginInlineEnd: 6 }}>{open ? "▾" : "▸"}</span>
                                    {b.label}{b.labelAr !== b.label ? ` · ${b.labelAr}` : ""}
                                  </td>
                                  <td style={{ ...S.td, textAlign: "end", fontWeight: 900, color: C.dispatch }}>{num(b.qty)}</td>
                                  <td style={{ ...S.td, textAlign: "end" }}>{pct(b.qty, sentTotal)}</td>
                                  <td style={S.td}>{b.lines}</td>
                                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(b.lastDate) || "—"}</td>
                                  <td style={S.td}>
                                    {proven === b.lines ? <Verdict v="lot" /> : <span className="tx-meta">{proven}/{b.lines} بتاريخ مؤكد</span>}
                                  </td>
                                </tr>
                                {open ? (
                                  <tr>
                                    <td style={{ ...S.td, background: "#f8fafc" }} colSpan={6}>
                                      <div className="tx-wrapx" style={{ background: "#fff" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                          <thead>
                                            <tr>
                                              <th style={S.th}>التاريخ</th><th style={S.th}>رقم الطلب</th>
                                              <th style={{ ...S.th, textAlign: "end" }}>الكمية</th>
                                              <th style={S.th}>إنتاج</th><th style={S.th}>انتهاء</th>
                                              <th style={S.th}>التأكيد</th><th style={S.th}>ملاحظات</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {[...b.rows].sort((x, y) => String(x.date).localeCompare(String(y.date))).map((r) => (
                                              <tr key={r.id}>
                                                <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800 }}>{fmtDMY(r.date)}</td>
                                                <td style={S.td}>{r.orderNo || "—"}</td>
                                                <td style={{ ...S.td, textAlign: "end", fontWeight: 900 }}>{num(r.qty)} {(r.unit || "").toLowerCase()}</td>
                                                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.prodDate) || "—"}</td>
                                                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.expiryDate) || "—"}</td>
                                                <td style={S.td}><Verdict v={r.verdict} off={r.off} late={r.late} /></td>
                                                <td style={{ ...S.td, color: C.muted }}>{[r.time, r.condition, r.remarks].filter(Boolean).join(" · ") || "—"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                          {distribution.customers.lines ? (
                            <tr style={{ background: "#f8fafc" }}>
                              <td style={{ ...S.td, fontWeight: 900 }}>
                                👥 العملاء (مجمّع)
                                <div className="tx-meta" style={{ color: C.muted, fontWeight: 700 }}>
                                  {distribution.customers.names} جهة — لا تُدرج بالأسماء في التتبّع الداخلي
                                </div>
                              </td>
                              <td style={{ ...S.td, textAlign: "end", fontWeight: 900 }}>{num(distribution.customers.qty)}</td>
                              <td style={{ ...S.td, textAlign: "end" }}>{pct(distribution.customers.qty, sentTotal)}</td>
                              <td style={S.td}>{distribution.customers.lines}</td>
                              <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(distribution.customers.lastDate) || "—"}</td>
                              <td style={S.td}>—</td>
                            </tr>
                          ) : null}
                          <tr>
                            <td style={{ ...S.td, fontWeight: 1000 }}>الإجمالي</td>
                            <td style={{ ...S.td, textAlign: "end", fontWeight: 1000 }}>{num(sentTotal)}</td>
                            <td style={{ ...S.td, textAlign: "end", fontWeight: 900 }}>{pct(sentTotal, anchor.weight)} من الوارد</td>
                            <td style={S.td} colSpan={3} />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Excluded part={split.dispatch} what="سطور الإرسال" />

                  {split.batches.kept.length ? (
                    <div className="tx-meta" style={{ marginTop: 10, color: C.body }}>
                      🔪 مرّت هذه الشحنة على {split.batches.kept.length} سطر تقطيع/تصنيع —{" "}
                      دخل {num(split.batches.kept.reduce((a, b) => a + (b.rawWeight || 0), 0))} kg،
                      نتج {num(split.batches.kept.reduce((a, b) => a + (b.finalWeight || 0), 0))} kg.
                    </div>
                  ) : null}
                </Step>

                {/* ── ⑤ branch receiving logs ── */}
                <Step
                  n="⑤" icon="📥" ar="سجل استلام الفروع" title="Branch receiving log" color={C.receiving}
                  chips={
                    <>
                      <span className="tx-chip" style={S.chip("#ecfdf5", "#065f46")}>{kg(loggedTotal)}</span>
                      {Math.abs(gap) > 0.5 ? (
                        <span className="tx-chip" style={S.chip("#fef3c7", C.warn)} title="الفرق بين ما أرسلناه للفروع وما سجّلته الفروع">
                          فرق {kg(Math.abs(gap))}
                        </span>
                      ) : null}
                    </>
                  }
                >
                  {!receivedByBranch.length ? (
                    <Empty text="لم يسجّل أي فرع استلام هذا المنتج ضمن النافذة — راجع سجلات الاستلام الورقية." />
                  ) : (
                    <div className="tx-wrapx">
                      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                        <thead>
                          <tr>
                            <th style={S.th}>الفرع</th>
                            <th style={{ ...S.th, textAlign: "end" }}>سجّل الفرع</th>
                            <th style={{ ...S.th, textAlign: "end" }}>أرسلنا له</th>
                            <th style={{ ...S.th, textAlign: "end" }}>الفرق</th>
                            <th style={S.th}>عدد السطور</th>
                            <th style={S.th}>آخر استلام</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivedByBranch.map((b) => {
                            const sent = distribution.branches.find((x) => x.id === b.id)?.qty || 0;
                            const d = sent - b.qty;
                            const key = `r:${b.id}`;
                            const open = openBranch === key;
                            return (
                              <React.Fragment key={b.id}>
                                <tr onClick={() => setOpenBranch(open ? "" : key)} style={{ cursor: "pointer", background: open ? "#f8fafc" : undefined }}>
                                  <td style={{ ...S.td, fontWeight: 900 }}>
                                    <span style={{ color: C.muted, marginInlineEnd: 6 }}>{open ? "▾" : "▸"}</span>
                                    {b.id}
                                  </td>
                                  <td style={{ ...S.td, textAlign: "end", fontWeight: 900, color: C.receiving }}>{num(b.qty)}</td>
                                  <td style={{ ...S.td, textAlign: "end" }}>{sent ? num(sent) : "—"}</td>
                                  <td style={{ ...S.td, textAlign: "end", fontWeight: 900, color: Math.abs(d) > 0.5 ? C.warn : C.muted }}>
                                    {sent ? num(Math.abs(d)) : "—"}
                                  </td>
                                  <td style={S.td}>{b.lines}{b.proven < b.lines ? <span className="tx-meta" style={{ color: C.warn }}> ({b.proven} بتاريخ مؤكد)</span> : null}</td>
                                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(b.lastDate) || "—"}</td>
                                </tr>
                                {open ? (
                                  <tr>
                                    <td style={{ ...S.td, background: "#f8fafc" }} colSpan={6}>
                                      <div className="tx-wrapx" style={{ background: "#fff" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                          <thead>
                                            <tr>
                                              <th style={S.th}>التاريخ</th><th style={S.th}>المورّد</th>
                                              <th style={{ ...S.th, textAlign: "end" }}>الكمية</th>
                                              <th style={S.th}>إنتاج</th><th style={S.th}>انتهاء</th>
                                              <th style={S.th}>الفاتورة</th><th style={S.th}>استلمها</th>
                                              <th style={S.th}>التأكيد</th><th style={S.th}>ملاحظات</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {[...b.rows].sort((x, y) => String(x.date).localeCompare(String(y.date))).map((r) => (
                                              <tr key={r.id}>
                                                <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800 }}>{fmtDMY(r.date)}</td>
                                                <td style={S.td}>{r.supplier || "—"}</td>
                                                <td style={{ ...S.td, textAlign: "end", fontWeight: 900 }}>{num(r.amount)}</td>
                                                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.prodDate) || "—"}</td>
                                                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.expiryDate) || "—"}</td>
                                                <td style={S.td}>{r.invoiceNo || "—"}</td>
                                                <td style={S.td}>{r.receivedBy || "—"}</td>
                                                <td style={S.td}><Verdict v={r.verdict} off={r.off} late={r.late} /></td>
                                                <td style={{ ...S.td, color: C.muted }}>{[r.origin, r.foodTemp ? `${r.foodTemp}°` : "", r.remarks].filter(Boolean).join(" · ") || "—"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Excluded part={split.receiving} what="سطور استلام الفروع" />

                  {conditionIssues.length ? (
                    <div className="tx-meta" style={{ marginTop: 10, color: "#6b21a8", fontWeight: 800 }}>
                      🌡 {conditionIssues.length} ملاحظة في سجل حالة اللحم اليومية على هذه الدفعة
                      ({conditionIssues.map((c) => `${fmtDMY(c.date)} ${c.branch || ""} ${c.status}`).slice(0, 3).join(" · ")}
                      {conditionIssues.length > 3 ? " …" : ""})
                    </div>
                  ) : null}
                </Step>

                {/* ── ⑥ returns ── */}
                <Step
                  n="⑥" icon="↩️" ar="المرتجعات" title="Returns — the critical step" color={C.returns}
                  chips={
                    <>
                      <span className="tx-chip" style={S.chip("#ffe4e6", "#9f1239")}>{kg(returns.qty)}</span>
                      {sentTotal ? <span className="tx-chip" style={S.chip("#f1f5f9", C.body)}>{pct(returns.qty, sentTotal)} من المُرسل</span> : null}
                      {returns.before.length ? (
                        <span className="tx-chip" style={S.chip("#fee2e2", "#991b1b")}>⚠ {returns.before.length} قبل الاستلام</span>
                      ) : null}
                    </>
                  }
                >
                  <div className="tx-meta" style={{ color: C.body, marginBottom: 10, lineHeight: 1.9 }}>
                    يُحتسب كل مرتجع يحمل كود المنتج وتاريخه <b>من يوم استلام الشحنة ({fmtDMY(anchor.date)}) حتى {fmtDMY(until) || "اليوم"}</b>.
                    عمود «المطابقة» يقارن تاريخ انتهاء المرتجع بتاريخ انتهاء الشحنة ({fmtDMY(anchor.expiryDate) || "غير مسجّل"}) —
                    فرق يوم أو يومين شائع جداً بين ورقة الفرع وبطاقة QCS، لذلك يُعرض كتنبيه لا كسبب حذف.
                    أما المرتجع بتاريخ <b>قبل</b> الاستلام فيُستبعد ويُبلَّغ عنه.
                  </div>

                  {!returns.rows.length ? (
                    <Empty text="لا يوجد مرتجع مطابق لهذه الشحنة ضمن النافذة." />
                  ) : (
                    <div className="tx-wrapx">
                      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                        <thead>
                          <tr>
                            <th style={S.th}>التاريخ</th>
                            <th style={S.th}>بعد الاستلام بـ</th>
                            <th style={S.th}>الجهة</th>
                            <th style={S.th}>المصدر</th>
                            <th style={{ ...S.th, textAlign: "end" }}>الكمية</th>
                            <th style={S.th}>تاريخ الانتهاء</th>
                            <th style={S.th}>المطابقة</th>
                            <th style={S.th}>الإجراء / ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returns.rows.map((r) => {
                            const days = Math.round(
                              (Date.parse(ymd(r.date)) - Date.parse(ymd(anchor.date))) / 86400000
                            );
                            const expired = ymd(r.expiryDate) && ymd(r.date) > ymd(r.expiryDate);
                            return (
                              <tr key={r.id}>
                                <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800 }}>{fmtDMY(r.date)}</td>
                                <td style={{ ...S.td, whiteSpace: "nowrap", color: C.muted }}>
                                  {Number.isFinite(days) ? `${days} يوم` : "—"}
                                </td>
                                <td style={S.td}>
                                  {r.place || r.customerName || "—"}
                                  {isCustomerReturn(r) ? <span className="tx-chip" style={{ ...S.chip("#f1f5f9", C.body), marginInlineStart: 6 }}>زبون</span> : null}
                                </td>
                                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{r.sourceLabelAr || "—"}</td>
                                <td style={{ ...S.td, textAlign: "end", fontWeight: 900, color: C.returns }}>
                                  {num(r.qty)} {(r.qtyType || "").toLowerCase()}
                                </td>
                                <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800, color: expired ? C.bad : C.ink }}>
                                  {fmtDMY(r.expiryDate) || "—"}
                                  {expired ? <div className="tx-meta" style={{ color: C.bad }}>رجع بعد الانتهاء</div> : null}
                                </td>
                                <td style={S.td}><Verdict v={r.verdict} off={r.off} late={r.late} /></td>
                                <td style={{ ...S.td, color: C.muted, maxWidth: 300 }}>
                                  {[r.action, r.remarks].filter(Boolean).join(" · ") || "—"}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td style={{ ...S.td, fontWeight: 1000 }} colSpan={4}>الإجمالي</td>
                            <td style={{ ...S.td, textAlign: "end", fontWeight: 1000, color: C.returns }}>{num(returns.qty)}</td>
                            <td style={S.td} colSpan={3}>
                              <span className="tx-meta">
                                منها {num(returns.provenQty)} kg بتاريخ انتهاء مطابق أو بفارق يوم/يومين ({returns.provenCount} سطر)
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* the audit findings */}
                  {returns.before.length ? (
                    <div style={{ marginTop: 12, border: `1px solid #fecaca`, background: "#fef2f2", borderRadius: 12, padding: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowBefore((v) => !v)}
                        style={{ ...S.btn("transparent", "#991b1b"), padding: 0, fontWeight: 900 }}
                      >
                        {showBefore ? "▾" : "▸"} ⚠ {returns.before.length} مرتجع بتاريخ سابق لاستلام الشحنة ({num(returns.beforeQty)} kg) — لا يمكن أن يكون منها
                      </button>
                      <div className="tx-meta" style={{ color: "#7f1d1d", marginTop: 4 }}>
                        إمّا أنه من شحنة أقدم لنفس المنتج، أو أن أحد التاريخين مُدخل خطأً — وهذه بحد ذاتها ملاحظة تدقيق.
                      </div>
                      {showBefore ? (
                        <div className="tx-wrapx" style={{ marginTop: 8, background: "#fff" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr><th style={S.th}>التاريخ</th><th style={S.th}>الجهة</th><th style={{ ...S.th, textAlign: "end" }}>الكمية</th><th style={S.th}>تاريخ الانتهاء</th><th style={S.th}>ملاحظات</th></tr>
                            </thead>
                            <tbody>
                              {returns.before.map((r) => (
                                <tr key={r.id}>
                                  <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800 }}>{fmtDMY(r.date)}</td>
                                  <td style={S.td}>{r.place || r.customerName || "—"}</td>
                                  <td style={{ ...S.td, textAlign: "end" }}>{num(r.qty)} {(r.qtyType || "").toLowerCase()}</td>
                                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.expiryDate) || "—"}</td>
                                  <td style={{ ...S.td, color: C.muted }}>{r.remarks || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {returns.other.length ? (
                    <div style={{ marginTop: 10, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowOther((v) => !v)}
                        style={{ ...S.btn("transparent", C.body), padding: 0, fontWeight: 900 }}
                      >
                        {showOther ? "▾" : "▸"} {returns.other.length} مرتجع مستبعد بخيار «تطابق تام للدفعة» — تاريخ انتهائه مختلف
                      </button>
                      {showOther ? (
                        <div className="tx-wrapx" style={{ marginTop: 8 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                            <thead>
                              <tr><th style={S.th}>التاريخ</th><th style={S.th}>الجهة</th><th style={{ ...S.th, textAlign: "end" }}>الكمية</th><th style={S.th}>تاريخ الانتهاء</th></tr>
                            </thead>
                            <tbody>
                              {returns.other.map((r) => (
                                <tr key={r.id}>
                                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDMY(r.date)}</td>
                                  <td style={S.td}>{r.place || r.customerName || "—"}</td>
                                  <td style={{ ...S.td, textAlign: "end" }}>{num(r.qty)} {(r.qtyType || "").toLowerCase()}</td>
                                  <td style={{ ...S.td, whiteSpace: "nowrap", fontWeight: 800 }}>{fmtDMY(r.expiryDate) || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {returns.after.length ? (
                    <div className="tx-meta" style={{ marginTop: 10, color: C.muted }}>
                      + {returns.after.length} مرتجع بعد نهاية النافذة ({fmtDMY(until)}) — وسّع النافذة لعرضها.
                    </div>
                  ) : null}
                </Step>

                {/* ── printable record ── */}
                <section className="tx-sheet">
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 900 }}>TRANS EMIRATES LIVESTOCK TRADING L.L.C. — AL MAWASHI</div>
                    <div style={{ fontWeight: 900 }}>سجل تتبّع شحنة · SHIPMENT TRACEABILITY RECORD</div>
                  </div>
                  <table>
                    <tbody>
                      <tr>
                        <th style={{ width: "18%" }}>الكود / Code</th><td style={{ width: "32%" }}>{tracedFor.code || "—"}</td>
                        <th style={{ width: "18%" }}>المنتج / Product</th><td>{tracedFor.name || anchor.matchedName || "—"}</td>
                      </tr>
                      <tr>
                        <th>تاريخ الشحنة</th><td>{fmtDMY(anchor.date)}</td>
                        <th>المورّد / Supplier</th><td>{anchor.supplier || "—"}</td>
                      </tr>
                      <tr>
                        <th>الفاتورة / Invoice</th><td>{anchor.invoiceNo || "—"}</td>
                        <th>المنشأ / Origin</th><td>{anchor.origin || "—"}</td>
                      </tr>
                      <tr>
                        <th>تاريخ الإنتاج</th><td>{fmtDMY(anchor.prodDate) || anchor.prodDateRaw || "—"}</td>
                        <th>تاريخ الانتهاء</th><td>{fmtDMY(anchor.expiryDate) || anchor.expiryDateRaw || "—"}</td>
                      </tr>
                      <tr>
                        <th>الكمية الواردة</th><td>{kg(anchor.weight)}</td>
                        <th>نافذة التتبّع</th><td>{fmtDMY(anchor.date)} → {openWindow ? "بلا حد" : fmtDMY(until) || "—"}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead><tr><th colSpan={4}>④ الإرسال — تقرير المنتج النهائي</th></tr>
                      <tr><th>الجهة</th><th>الكمية</th><th>عدد السطور</th><th>آخر إرسال</th></tr></thead>
                    <tbody>
                      {(distribution?.branches || []).map((b) => (
                        <tr key={b.id}><td>{b.label}</td><td>{num(b.qty)}</td><td>{b.lines}</td><td>{fmtDMY(b.lastDate)}</td></tr>
                      ))}
                      {distribution?.customers.lines ? (
                        <tr><td>العملاء (مجمّع — {distribution.customers.names} جهة)</td><td>{num(distribution.customers.qty)}</td><td>{distribution.customers.lines}</td><td>{fmtDMY(distribution.customers.lastDate)}</td></tr>
                      ) : null}
                      <tr><td><b>الإجمالي</b></td><td><b>{num(sentTotal)}</b></td><td colSpan={2}>{pct(sentTotal, anchor.weight)} من الوارد</td></tr>
                    </tbody>
                  </table>

                  <table>
                    <thead><tr><th colSpan={4}>⑤ سجل استلام الفروع</th></tr>
                      <tr><th>الفرع</th><th>سجّل</th><th>أُرسل له</th><th>الفرق</th></tr></thead>
                    <tbody>
                      {receivedByBranch.map((b) => {
                        const sent = distribution?.branches.find((x) => x.id === b.id)?.qty || 0;
                        return (
                          <tr key={b.id}><td>{b.id}</td><td>{num(b.qty)}</td><td>{sent ? num(sent) : "—"}</td><td>{sent ? num(Math.abs(sent - b.qty)) : "—"}</td></tr>
                        );
                      })}
                      {!receivedByBranch.length ? <tr><td colSpan={4}>لا يوجد</td></tr> : null}
                    </tbody>
                  </table>

                  <table>
                    <thead><tr><th colSpan={6}>⑥ المرتجعات</th></tr>
                      <tr><th>التاريخ</th><th>الجهة</th><th>الكمية</th><th>تاريخ الانتهاء</th><th>المطابقة</th><th>ملاحظات</th></tr></thead>
                    <tbody>
                      {(returns?.rows || []).map((r) => (
                        <tr key={r.id}>
                          <td>{fmtDMY(r.date)}</td>
                          <td>{r.place || r.customerName || "—"}</td>
                          <td>{num(r.qty)} {(r.qtyType || "").toLowerCase()}</td>
                          <td>{fmtDMY(r.expiryDate) || "—"}</td>
                          <td>{verdictText(r)}</td>
                          <td>{[r.action, r.remarks].filter(Boolean).join(" · ") || "—"}</td>
                        </tr>
                      ))}
                      {!returns?.rows.length ? <tr><td colSpan={6}>لا يوجد مرتجع مطابق</td></tr> : null}
                      <tr><td><b>الإجمالي</b></td><td /><td><b>{num(returns?.qty || 0)}</b></td><td colSpan={3}>{sentTotal ? `${pct(returns?.qty || 0, sentTotal)} من المُرسل` : ""}</td></tr>
                    </tbody>
                  </table>

                  {returns?.before.length ? (
                    <table>
                      <thead><tr><th colSpan={4}>⚠ مرتجعات بتاريخ سابق لاستلام الشحنة — لا يمكن أن تكون منها</th></tr>
                        <tr><th>التاريخ</th><th>الجهة</th><th>الكمية</th><th>تاريخ الانتهاء</th></tr></thead>
                      <tbody>
                        {returns.before.map((r) => (
                          <tr key={r.id}><td>{fmtDMY(r.date)}</td><td>{r.place || "—"}</td><td>{num(r.qty)}</td><td>{fmtDMY(r.expiryDate) || "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
                    <div>أعدّه / Prepared by: ______________________</div>
                    <div>راجعه / Verified by: ______________________</div>
                    <div>التاريخ: {fmtDMY(todayYMD())}</div>
                  </div>
                </section>
              </>
            ) : shipments.length ? (
              <div className="tx-screen" style={{ ...S.card, marginTop: 14, textAlign: "center", color: C.muted, padding: "30px 18px" }}>
                <div className="tx-ico-xl">👆</div>
                <div style={{ fontWeight: 900, color: C.ink, marginTop: 6 }}>اختر شحنة من الأعلى ليبدأ التتبّع</div>
                <div className="tx-meta" style={{ marginTop: 5 }}>
                  كل ما يلي — الإرسال، استلام الفروع، المرتجعات — يُحسب بالنسبة لتلك الشحنة وتواريخها.
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
