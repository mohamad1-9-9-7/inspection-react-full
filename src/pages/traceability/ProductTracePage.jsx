// src/pages/traceability/ProductTracePage.jsx
//
// منظومة تتبع المنتج — Product Traceability
// The screen answers one question in the order a person actually asks it:
//   ① where the product STARTS — an incoming QCS shipment for a raw item, or
//      the Final Product report for one we manufacture ourselves
//   ② how much of it went to each of OUR branches
//   ③ what does that branch's own receiving log say
//   ④ did any of it come back
// Outside customers are counted, never listed: a traceability question is
// about our own sites.

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
  summarize,
  collectLots,
  filterByDates,
  distributionByBranch,
  datesOf,
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
  shipment: "#4f46e5",
  distribution: "#0891b2",
  receiving: "#0d9488",
  batch: "#d97706",
  returns: "#e11d48",
};

const S = {
  page: {
    minHeight: "100vh",
    background: C.page,
    fontFamily: "Inter,Roboto,Cairo,sans-serif",
    paddingBottom: 56,
  },
  hero: {
    background: "linear-gradient(135deg,#1d4ed8 0%,#4f46e5 45%,#0891b2 100%)",
    color: "#fff",
    padding: "24px 24px 62px",
  },
  // Full-bleed: the flow needs the whole screen, not a narrow column.
  wrap: { width: "min(1920px, 98vw)", margin: "0 auto" },
  card: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 16,
    boxShadow: "0 10px 26px rgba(15,23,42,.07)",
    padding: 18,
  },
  label: { fontWeight: 800, color: C.body, fontSize: ".82rem", display: "block", marginBottom: 5 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    color: C.ink,
    fontSize: ".95rem",
    fontFamily: "inherit",
  },
  btn: (bg, fg = "#fff") => ({
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    fontWeight: 800,
    fontSize: ".95rem",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15,23,42,.12)",
  }),
  chip: (bg, fg) => ({
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: "3px 11px",
    fontWeight: 800,
    fontSize: ".72rem",
    display: "inline-block",
  }),
  th: {
    background: "#f8fafc",
    border: `1px solid ${C.line}`,
    padding: "9px 10px",
    fontSize: ".76rem",
    fontWeight: 800,
    color: C.body,
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  td: {
    border: `1px solid ${C.line}`,
    padding: "9px 10px",
    fontSize: ".85rem",
    color: C.ink,
    verticalAlign: "middle",
  },
};

const RANGES = [
  { key: "3", label: "3 months", months: 3 },
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "12 months", months: 12 },
  { key: "all", label: "All time", months: null },
];

const num = (v, dp = 2) =>
  Number.isFinite(v) && v !== 0 ? Number(v).toFixed(dp).replace(/\.00$/, "") : "—";
const kg = (v) => (Number.isFinite(v) && v !== 0 ? `${num(v)} kg` : "—");

/* ===== Flow chrome ===== */

/** One numbered box in the flow, with the connector that leads into it. */
function Step({ id, n, icon, title, titleAr, accent, chip, first, children }) {
  return (
    <>
      {!first ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
          <div style={{ width: 3, height: 26, background: `linear-gradient(${C.line}, ${accent})`, borderRadius: 2 }} />
        </div>
      ) : null}
      <section id={id} style={{ ...S.card, borderTop: `4px solid ${accent}`, padding: 0, overflow: "hidden", scrollMarginTop: 120 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 18px",
            background: `${accent}0f`,
            borderBottom: `1px solid ${C.line}`,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: accent,
              color: "#fff",
              fontWeight: 900,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {n}
          </span>
          <span style={{ fontSize: "1.15rem" }}>{icon}</span>
          <b style={{ color: C.ink, fontSize: "1.02rem" }}>{title}</b>
          <span style={{ color: C.muted, fontWeight: 700, fontSize: ".88rem" }}>{titleAr}</span>
          {chip ? <span style={{ marginInlineStart: "auto" }}>{chip}</span> : null}
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </section>
    </>
  );
}

function Empty({ text }) {
  return (
    <div style={{ color: C.muted, fontStyle: "italic", padding: "12px 2px", fontSize: ".9rem" }}>{text}</div>
  );
}

/**
 * The most misleading thing this page can do is show an empty step when the
 * records DO exist and were merely dropped by the lot filter — that happens
 * whenever one report family spells the lot's dates differently from another.
 * So when a family has rows before filtering and none after, say exactly which
 * dates those rows carry, and offer to jump to them.
 */
function LotGap({ rows, lot, onUseLot, onClearLot, what }) {
  const others = useMemo(() => {
    const map = new Map();
    (rows || []).forEach((r) => {
      const d = datesOf(r);
      const key = `${d.prodDate}|${d.expiryDate}`;
      if (!map.has(key)) map.set(key, { ...d, key, n: 0 });
      map.get(key).n += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.n - a.n);
  }, [rows]);

  if (!rows?.length) return null;

  return (
    <div
      style={{
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        borderRadius: 12,
        padding: "12px 14px",
        fontSize: ".86rem",
        color: "#78350f",
        lineHeight: 1.8,
      }}
    >
      <b>
        ⚠️ {rows.length} {what} record{rows.length === 1 ? "" : "s"} exist for this product, but on
        different dates than the lot you picked.
      </b>
      <br />
      <span style={{ color: "#92400e" }}>
        السجلات موجودة فعلاً، لكن تواريخها لا تطابق الدفعة المختارة
        {lot ? ` (إنتاج ${fmtDMY(lot.prodDate) || "—"} · انتهاء ${fmtDMY(lot.expiryDate) || "—"})` : ""} —
        غالباً لأن كل تقرير كُتبت فيه التواريخ بشكل مختلف.
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {others.slice(0, 6).map((o) => (
          <button
            key={o.key}
            onClick={() => onUseLot({ prodDate: o.prodDate, expiryDate: o.expiryDate })}
            style={{
              ...S.btn("#fff", "#92400e"),
              border: "1px solid #fcd34d",
              padding: "6px 12px",
              fontSize: ".78rem",
              boxShadow: "none",
            }}
          >
            Prod {fmtDMY(o.prodDate) || "—"} · Exp {fmtDMY(o.expiryDate) || "—"} ({o.n})
          </button>
        ))}
        <button
          onClick={onClearLot}
          style={{ ...S.btn("#92400e"), padding: "6px 12px", fontSize: ".78rem", boxShadow: "none" }}
        >
          Show all lots / اعرض كل الدفعات
        </button>
      </div>
    </div>
  );
}

function ViaBadge({ via }) {
  if (via !== "name") return null;
  return (
    <span
      title="Matched through the catalog on the product name — this record predates item codes."
      style={{ ...S.chip("#fef3c7", "#92400e"), marginInlineStart: 6 }}
    >
      by name
    </span>
  );
}

function Table({ head, children, min = 900 }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: min }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ===== Lot tree =====
   A manufactured line can carry 250+ output rows over 50+ production dates.
   Listing those dates as text is unreadable and a 50-option modal is worse, so
   the lots live in a year → month → day tree, the same shape the branch views
   already use. One click picks one day's lot. */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function groupLots(lots) {
  const years = new Map();
  (lots || []).forEach((l) => {
    const d = l.prodDate || "";
    const y = d ? d.slice(0, 4) : "—";
    const ym = d ? d.slice(0, 7) : "—";
    if (!years.has(y)) years.set(y, { year: y, n: 0, months: new Map() });
    const yr = years.get(y);
    yr.n += l.total;
    if (!yr.months.has(ym)) yr.months.set(ym, { ym, n: 0, days: new Map() });
    const mo = yr.months.get(ym);
    mo.n += l.total;
    if (!mo.days.has(d)) mo.days.set(d, { date: d, n: 0, lots: [] });
    const day = mo.days.get(d);
    day.n += l.total;
    day.lots.push(l);
  });
  const desc = (a, b) => String(b).localeCompare(String(a));
  return Array.from(years.values())
    .sort((a, b) => desc(a.year, b.year))
    .map((y) => ({
      ...y,
      months: Array.from(y.months.values())
        .sort((a, b) => desc(a.ym, b.ym))
        .map((m) => ({
          ...m,
          days: Array.from(m.days.values()).sort((a, b) => desc(a.date, b.date)),
        })),
    }));
}

function LotTree({ lots, activeKey, onPick, onClear, busy }) {
  const tree = useMemo(() => groupLots(lots), [lots]);
  const [open, setOpen] = useState(() => new Set());

  // Newest year and month start open; everything older stays folded.
  useEffect(() => {
    if (!tree.length) return;
    const init = new Set([`y:${tree[0].year}`]);
    if (tree[0].months[0]) init.add(`m:${tree[0].months[0].ym}`);
    setOpen(init);
  }, [tree]);

  const toggle = (k) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const row = (depth, activeRow) => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    width: "100%",
    textAlign: "start",
    border: "none",
    background: activeRow ? "#eef2ff" : "transparent",
    color: activeRow ? C.brandDeep : C.body,
    font: "inherit",
    fontWeight: depth === 0 ? 900 : depth === 1 ? 800 : 700,
    fontSize: depth === 0 ? ".92rem" : ".85rem",
    padding: "6px 8px",
    paddingInlineStart: 8 + depth * 12,
    borderRadius: 8,
    cursor: "pointer",
  });
  const count = {
    marginInlineStart: "auto",
    background: "#eef2ff",
    color: C.brandDeep,
    borderRadius: 999,
    padding: "1px 8px",
    fontSize: ".68rem",
    fontWeight: 800,
  };

  return (
    <aside
      style={{
        ...S.card,
        padding: 12,
        position: "sticky",
        top: 12,
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
      }}
      className="no-print"
    >
      <div style={{ fontWeight: 900, color: C.ink, fontSize: ".95rem" }}>🗓 Production lots</div>
      <div style={{ color: C.muted, fontSize: ".78rem", marginBottom: 10 }}>
        دفعات الإنتاج — اختر يوماً
      </div>

      <button
        onClick={onClear}
        style={{
          ...S.btn(!activeKey ? C.brandDeep : "#f1f5f9", !activeKey ? "#fff" : C.body),
          width: "100%",
          padding: "8px 12px",
          fontSize: ".82rem",
          boxShadow: "none",
          marginBottom: 10,
        }}
      >
        All lots / كل الدفعات
      </button>

      {busy ? <div style={{ color: C.muted, fontSize: ".8rem" }}>Loading…</div> : null}

      {tree.length === 0 && !busy ? (
        <div style={{ color: C.muted, fontSize: ".82rem", fontStyle: "italic" }}>
          لا توجد دفعات ضمن الفترة.
        </div>
      ) : null}

      {tree.map((y) => {
        const yOpen = open.has(`y:${y.year}`);
        return (
          <div key={y.year}>
            <button onClick={() => toggle(`y:${y.year}`)} style={row(0, false)}>
              <span style={{ width: 12 }}>{yOpen ? "▾" : "▸"}</span>
              <span>{y.year}</span>
              <span style={count}>{y.n}</span>
            </button>
            {yOpen
              ? y.months.map((mth) => {
                  const mOpen = open.has(`m:${mth.ym}`);
                  const mLabel =
                    mth.ym === "—" ? "No date" : MONTH_NAMES[Number(mth.ym.slice(5, 7)) - 1] || mth.ym;
                  return (
                    <div key={mth.ym}>
                      <button onClick={() => toggle(`m:${mth.ym}`)} style={row(1, false)}>
                        <span style={{ width: 12 }}>{mOpen ? "▾" : "▸"}</span>
                        <span>{mLabel}</span>
                        <span style={count}>{mth.n}</span>
                      </button>
                      {mOpen
                        ? mth.days.map((d) =>
                            d.lots.map((l) => {
                              const active = l.key === activeKey;
                              return (
                                <button
                                  key={l.key}
                                  onClick={() => onPick(l)}
                                  style={row(2, active)}
                                  title={`Expiry ${fmtDMY(l.expiryDate) || "—"} · ${l.total} records`}
                                >
                                  <span style={{ width: 12 }}>{active ? "●" : "○"}</span>
                                  <span style={{ minWidth: 0 }}>
                                    {fmtDMY(d.date) || "No date"}
                                    <span
                                      style={{ display: "block", color: C.muted, fontSize: ".7rem", fontWeight: 700 }}
                                    >
                                      exp {fmtDMY(l.expiryDate) || "—"}
                                    </span>
                                  </span>
                                  <span style={count}>{l.total}</span>
                                </button>
                              );
                            })
                          )
                        : null}
                    </div>
                  );
                })
              : null}
          </div>
        );
      })}
    </aside>
  );
}

/** The flow itself, always visible: five stages with live counts, each one a
 *  jump link. Without this the "flow chart" is invisible the moment a table
 *  grows past a screenful. */
function FlowRail({ stages, onJump }) {
  return (
    <div
      style={{
        ...S.card,
        padding: "12px 14px",
        display: "flex",
        alignItems: "stretch",
        gap: 6,
        overflowX: "auto",
        position: "sticky",
        top: 8,
        zIndex: 40,
      }}
    >
      {stages.map((st, i) => (
        <React.Fragment key={st.id}>
          <button
            onClick={() => onJump(st.id)}
            title={st.ar}
            style={{
              flex: "1 1 0",
              minWidth: 150,
              textAlign: "start",
              border: `1px solid ${st.n ? `${st.accent}55` : C.line}`,
              background: st.n ? `${st.accent}0f` : "#f8fafc",
              borderRadius: 12,
              padding: "9px 12px",
              cursor: "pointer",
              font: "inherit",
              opacity: st.n ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: st.accent,
                  color: "#fff",
                  fontSize: ".72rem",
                  fontWeight: 900,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: "1rem" }}>{st.icon}</span>
              <b style={{ color: C.ink, fontSize: ".82rem" }}>{st.label}</b>
            </div>
            <div style={{ color: C.muted, fontSize: ".72rem", marginTop: 3 }}>{st.ar}</div>
            <div style={{ color: st.n ? st.accent : C.muted, fontWeight: 900, fontSize: "1.05rem", marginTop: 2 }}>
              {st.value}
            </div>
          </button>
          {i < stages.length - 1 ? (
            <div style={{ display: "grid", placeItems: "center", color: C.muted, fontWeight: 900 }}>→</div>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ===================== Page ===================== */

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
  // Two reads: arrivals first (small, and it names the lots), then the rest
  // once the user has said which shipment they mean.
  const [arrivals, setArrivals] = useState(null);
  const [downstream, setDownstream] = useState(null);
  const [treeReady, setTreeReady] = useState(false);
  const [lot, setLot] = useState(null); // { prodDate, expiryDate } | null
  const [branchId, setBranchId] = useState("");
  const [tracedFor, setTracedFor] = useState(null);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const full = useMemo(() => (arrivals ? mergeTrace(arrivals, downstream) : null), [arrivals, downstream]);

  // A code arriving in the URL is completed from the catalog, so a deep link
  // like /product-trace?code=22000 shows the product's name too.
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

  /** Step 2 of the read — where the product went and what came back. */
  const runDownstream = useCallback(async (who) => {
    if (!who) return;
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setProgress({ done: 0, total: 0, phase: "downstream" });
    try {
      const res = await traceDownstream({
        ...who,
        signal: ac.signal,
        onProgress: (done, total) => setProgress({ done, total, phase: "downstream" }),
      });
      setDownstream(res);
    } catch (e) {
      if (e?.name !== "AbortError") setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, []);

  const runTrace = useCallback(async () => {
    const code = String(product.code || "").trim();
    const name = String(product.name || "").trim();
    if (!code && !name) {
      setError("أدخل كود المنتج أولاً / Enter an item code first.");
      return;
    }
    setError("");
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setBusy(true);
    setProgress({ done: 0, total: 0, phase: "arrivals" });
    setArrivals(null);
    setDownstream(null);
    setTreeReady(false);
    setLot(null);
    setBranchId("");
    try {
      const res = await traceArrivals({
        code,
        name,
        from,
        to,
        signal: ac.signal,
        onProgress: (done, total) => setProgress({ done, total, phase: "arrivals" }),
      });
      setArrivals(res);
      const who = { code, name, from, to };
      setTracedFor(who);

      // A MANUFACTURED product never arrives on a shipment — its life starts on
      // the Final Product report. When the arrival half finds nothing to offer,
      // read the downstream half straight away so the picker still has real
      // production lots instead of an empty box.
      if (collectLots(res).length === 0) {
        setProgress({ done: 0, total: 0, phase: "downstream" });
        const down = await traceDownstream({
          ...who,
          signal: ac.signal,
          onProgress: (done, total) => setProgress({ done, total, phase: "downstream" }),
        });
        setDownstream(down);
      }
      setTreeReady(true);
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

  const arrivalLots = useMemo(() => (arrivals ? collectLots(arrivals) : []), [arrivals]);
  // The tree offers the arrival lots while only the arrival half is read, then
  // widens to every lot once the downstream half comes in — a manufactured
  // product's lots only exist on the Final Product report.
  const treeLots = useMemo(
    () => (downstream && full ? collectLots(full) : arrivalLots),
    [downstream, full, arrivalLots]
  );

  /** Picking a lot in the tree is what starts the downstream read. */
  const pickLot = (l) => {
    setLot(l ? { prodDate: l.prodDate, expiryDate: l.expiryDate, key: l.key } : null);
    setBranchId("");
    if (!downstream) runDownstream(tracedFor);
  };

  // Everything below is the trace narrowed to the chosen lot.
  const shown = useMemo(() => {
    if (!full) return null;
    if (!lot) return full;
    return filterByDates(full, {
      mode: lot.prodDate && lot.expiryDate ? "both" : lot.prodDate ? "prod" : "expiry",
      prodDate: lot.prodDate,
      expiryDate: lot.expiryDate,
    });
  }, [full, lot]);

  const stats = useMemo(() => (shown ? summarize(shown) : null), [shown]);

  /* Where this product's life actually starts.
     A raw/imported item arrives on a QCS shipment. A manufactured one (a
     sausage, a processed line) never does — it is BORN on the Final Product
     report, and forcing a "shipment" step on it would show an empty box and
     hide the real first step. */
  const originKind = useMemo(() => {
    if (!shown) return "unknown";
    if (shown.shipments.length > 0) return "shipment";
    if (shown.dispatch.length > 0 || shown.batches.length > 0) return "production";
    return "unknown";
  }, [shown]);

  /** The production side of a manufactured product, summarised from the Final
   *  Product lines: they are the record that it was made. */
  const production = useMemo(() => {
    if (!shown || originKind !== "production") return null;
    const rows = shown.dispatch;
    const prodDates = Array.from(new Set(rows.map((d) => d.prodDate).filter(Boolean))).sort();
    const expDates = Array.from(new Set(rows.map((d) => d.expiryDate).filter(Boolean))).sort();
    const days = shown.batches.filter((b) => b.role === "output" || b.role === "both");
    return {
      qty: rows.reduce((a, d) => a + d.qty, 0),
      lines: rows.length,
      unit: rows[0]?.unit || "KG",
      prodDates,
      expDates,
      orderNos: Array.from(new Set(rows.map((d) => d.orderNo).filter(Boolean))),
      batchCount: days.length,
      batchWeight: days.reduce((a, b) => a + b.finalWeight, 0),
    };
  }, [shown, originKind]);
  const dist = useMemo(
    () => (shown ? distributionByBranch(shown.dispatch) : null),
    [shown]
  );

  // ③ narrows to one branch; until one is picked the log shows every branch.
  const branchReceiving = useMemo(() => {
    if (!shown) return [];
    return branchId ? shown.receiving.filter((r) => r.branch === branchId) : shown.receiving;
  }, [shown, branchId]);

  const branchReturns = useMemo(() => {
    if (!shown) return [];
    return branchId ? shown.returns.filter((r) => r.branch === branchId) : shown.returns;
  }, [shown, branchId]);

  // Totalled over what is actually on screen, so the chip agrees with the rows
  // below it when a branch is selected.
  const returnedQty = useMemo(
    () => branchReturns.reduce((a, r) => a + r.qty, 0),
    [branchReturns]
  );

  const selectedBranch = dist?.branches.find((b) => b.id === branchId) || null;

  // The transfers WE sent, as their own list. Kept separate from the branch's
  // receiving log on purpose: one says what left us, the other says what the
  // branch wrote down, and comparing the two is the whole point.
  const transfers = useMemo(() => {
    if (!dist) return [];
    const pool = branchId
      ? (selectedBranch?.rows || []).map((r) => ({ ...r, branchLabel: selectedBranch.label }))
      : dist.branches.flatMap((b) => b.rows.map((r) => ({ ...r, branchLabel: b.label })));
    return [...pool].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [dist, branchId, selectedBranch]);

  const transferredQty = useMemo(
    () => transfers.reduce((a, t) => a + t.qty, 0),
    [transfers]
  );

  const receivedQty = useMemo(
    () => branchReceiving.reduce((a, r) => a + (r.amount || 0), 0),
    [branchReceiving]
  );

  return (
    <div style={S.page}>
      <style>{`
        @media print { .no-print { display: none !important; } body { background:#fff; } }
      `}</style>

      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={S.wrap}>
          <button
            className="no-print"
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,.16)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.35)",
              borderRadius: 10,
              padding: "6px 14px",
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: "1.7rem", fontWeight: 1000, letterSpacing: ".3px" }}>
            🧬 Product Traceability
          </h1>
          <p style={{ margin: "6px 0 0", opacity: 0.92, fontWeight: 600 }}>
            منظومة تتبع المنتج — من الشحنة الواردة إلى الفرع والمرتجعات
          </p>
        </div>
      </div>

      <div style={{ ...S.wrap, marginTop: -44 }}>
        {/* ── Search ── */}
        <div style={S.card} className="no-print">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(150px,0.7fr) minmax(240px,2fr) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <label style={S.label}>Item Code / كود المنتج</label>
              <ItemCodeInput
                code={product.code}
                name={product.name}
                onChange={setProduct}
                style={S.input}
                placeholder="e.g., 20000"
              />
            </div>
            <div>
              <label style={S.label}>Product Name / اسم المنتج</label>
              <ItemNameInput
                code={product.code}
                name={product.name}
                onChange={setProduct}
                style={S.input}
                placeholder="Search code or product…"
              />
            </div>
            <button
              onClick={runTrace}
              disabled={busy}
              style={{ ...S.btn(busy ? "#94a3b8" : C.brandDeep), whiteSpace: "nowrap" }}
            >
              {busy ? "Tracing…" : "🔍 Trace"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => applyRange(r.key)}
                  style={{
                    ...S.btn(rangeKey === r.key ? C.brand : "#eef2ff", rangeKey === r.key ? "#fff" : C.brandDeep),
                    padding: "8px 14px",
                    fontSize: ".82rem",
                    boxShadow: "none",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div>
              <label style={S.label}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setRangeKey("custom"); }}
                style={{ ...S.input, width: 165 }}
              />
            </div>
            <div>
              <label style={S.label}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setRangeKey("custom"); }}
                style={{ ...S.input, width: 165 }}
              />
            </div>
            {full ? (
              <button onClick={() => window.print()} style={{ ...S.btn("#0f172a"), padding: "9px 16px", fontSize: ".85rem" }}>
                🖨 Print
              </button>
            ) : null}
          </div>

          {busy && progress.total > 0 ? (
            <div style={{ marginTop: 12, color: C.muted, fontWeight: 700, fontSize: ".85rem" }}>
              {progress.phase === "arrivals"
                ? "Reading shipments and receiving logs… / قراءة الشحنات وسجلات الاستلام…"
                : "Reading distribution and returns… / قراءة التوزيع والمرتجعات…"}{" "}
              {progress.done}/{progress.total}
            </div>
          ) : null}
          {error ? (
            <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 800, fontSize: ".9rem" }}>⚠️ {error}</div>
          ) : null}
        </div>

        {!shown || !tracedFor ? (
          <div style={{ ...S.card, marginTop: 16, textAlign: "center", color: C.muted, padding: "48px 18px" }}>
            <div style={{ fontSize: "2.6rem", marginBottom: 10 }}>🧬</div>
            <div style={{ fontWeight: 900, color: C.ink, fontSize: "1.05rem" }}>
              Enter an item code to trace the product
            </div>
            <div style={{ marginTop: 6 }}>
              أدخل كود المنتج: الشحنة الواردة ← الكمية المستلمة ← التوزيع على الفروع ← سجل استلام الفرع ← المرتجعات.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(230px, 260px) minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
              marginTop: 16,
            }}
          >
            <LotTree
              lots={treeLots}
              activeKey={lot?.key}
              onPick={pickLot}
              onClear={() => pickLot(null)}
              busy={busy}
            />

            <div style={{ minWidth: 0 }}>
            {/* Identity bar */}
            <div style={{ ...S.card, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  background: C.brandDeep,
                  color: "#fff",
                  borderRadius: 12,
                  padding: "10px 18px",
                  fontWeight: 1000,
                  fontSize: "1.3rem",
                  letterSpacing: ".5px",
                }}
              >
                {tracedFor.code || "—"}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 900, color: C.ink, fontSize: "1.05rem" }}>{tracedFor.name || "—"}</div>
                <div style={{ color: C.muted, fontSize: ".82rem", marginTop: 2 }}>
                  {tracedFor.from || tracedFor.to
                    ? `${tracedFor.from ? fmtDMY(tracedFor.from) : "…"} → ${tracedFor.to ? fmtDMY(tracedFor.to) : "…"}`
                    : "All time"}{" "}
                  · {full.scanned} reports scanned
                </div>
                {/* What the search FOUND, before any lot filter. Without this an
                    empty step is ambiguous: nothing exists, or the lot filter
                    hid it? */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {[
                    { k: "shipments", label: "shipments", ar: "شحنات", n: full.shipments.length },
                    { k: "receiving", label: "receiving", ar: "استلام", n: full.receiving.length },
                    { k: "batches", label: "batches", ar: "دفعات", n: full.batches.length },
                    { k: "dispatch", label: "final product", ar: "منتج نهائي", n: full.dispatch.length },
                    { k: "returns", label: "returns", ar: "مرتجعات", n: full.returns.length },
                  ].map((f) => {
                    const shownN = shown[f.k].length;
                    const hidden = f.n > 0 && shownN === 0;
                    return (
                      <span
                        key={f.k}
                        title={
                          hidden
                            ? `${f.n} موجودة لكن الدفعة المختارة أخفتها — ${f.ar}`
                            : `${f.ar}: ${shownN} of ${f.n}`
                        }
                        style={S.chip(
                          hidden ? "#fef3c7" : f.n ? "#e0e7ff" : "#f1f5f9",
                          hidden ? "#92400e" : f.n ? C.brandDeep : C.muted
                        )}
                      >
                        {hidden ? "⚠ " : ""}
                        {lot ? `${shownN}/${f.n}` : f.n} {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              {lot ? (
                <span style={S.chip("#e0e7ff", C.brandDeep)}>
                  🗓 Lot · Prod {fmtDMY(lot.prodDate) || "—"} · Exp {fmtDMY(lot.expiryDate) || "—"}
                </span>
              ) : (
                <span style={S.chip("#f1f5f9", C.body)}>All lots / كل الدفعات</span>
              )}
            </div>

            {/* The flow itself, always on screen */}
            <div style={{ marginTop: 16 }}>
              <FlowRail
                onJump={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                stages={[
                  {
                    id: "step-1",
                    icon: originKind === "production" ? "🏭" : "📦",
                    label: originKind === "production" ? "Produced" : "Shipment",
                    ar: originKind === "production" ? "التصنيع" : "الشحنة الواردة",
                    accent: C.shipment,
                    n: originKind === "production" ? production?.lines || 0 : shown.shipments.length,
                    value:
                      originKind === "production"
                        ? `${num(production?.qty)} ${production?.unit || "KG"}`
                        : kg(stats.shipmentWeight),
                  },
                  {
                    id: "step-2",
                    icon: "🚚",
                    label: "Distribution",
                    ar: "التوزيع",
                    accent: C.distribution,
                    n: dist ? dist.branches.filter((b) => b.rows.length).length : 0,
                    value: downstream ? kg(dist.ourQty) : "—",
                  },
                  {
                    id: "step-3",
                    icon: "📤",
                    label: "Transfers",
                    ar: "التحويلات",
                    accent: C.distribution,
                    n: transfers.length,
                    value: downstream ? `${transfers.length}` : "—",
                  },
                  {
                    id: "step-4",
                    icon: "🏬",
                    label: "Branch log",
                    ar: "استلام الفرع",
                    accent: C.receiving,
                    n: branchReceiving.length,
                    value: `${branchReceiving.length}`,
                  },
                  {
                    id: "step-5",
                    icon: "♻️",
                    label: "Returns",
                    ar: "المرتجعات",
                    accent: C.returns,
                    n: branchReturns.length,
                    value: downstream ? `${branchReturns.length}` : "—",
                  },
                ]}
              />
            </div>

            {/* ── ① Where this product's life starts ── */}
            <div style={{ marginTop: 16 }}>
              <Step
                first
                id="step-1"
                n="1"
                icon={originKind === "production" ? "🏭" : "📦"}
                title={originKind === "production" ? "Produced (Final Product)" : "Incoming shipment (QCS)"}
                titleAr={originKind === "production" ? "التصنيع — المنتج النهائي" : "الشحنة الواردة"}
                accent={C.shipment}
                chip={
                  originKind === "production" ? (
                    <span style={S.chip(`${C.shipment}1a`, C.shipment)}>
                      manufactured · {num(production.qty)} {production.unit} produced
                    </span>
                  ) : (
                    <span style={S.chip(`${C.shipment}1a`, C.shipment)}>
                      {kg(stats.shipmentWeight)} received · {stats.shipmentCount} shipment
                      {stats.shipmentCount === 1 ? "" : "s"}
                    </span>
                  )
                }
              >
                {originKind === "production" ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                        gap: 12,
                      }}
                    >
                      {[
                        // With no lot picked this product may span fifty
                        // production runs; printing all fifty dates is a wall
                        // of text, so say how many and let the tree pick one.
                        {
                          k: "Production date",
                          ar: "تاريخ الإنتاج",
                          v: lot
                            ? fmtDMY(lot.prodDate) || "—"
                            : `${production.prodDates.length} runs`,
                        },
                        {
                          k: "Expiry date",
                          ar: "تاريخ الانتهاء",
                          v: lot
                            ? fmtDMY(lot.expiryDate) || "—"
                            : `${production.expDates.length} dates`,
                        },
                        { k: "Total produced", ar: "إجمالي المُنتَج", v: `${num(production.qty)} ${production.unit}` },
                        { k: "Output lines", ar: "عدد السطور", v: String(production.lines) },
                      ].map((x) => (
                        <div
                          key={x.k}
                          style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 14px", background: "#fff" }}
                        >
                          <div style={{ fontSize: ".72rem", fontWeight: 800, color: C.muted, textTransform: "uppercase" }}>
                            {x.k}
                          </div>
                          <div style={{ fontSize: ".72rem", color: C.muted, marginBottom: 5 }}>{x.ar}</div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 900, color: C.ink }}>{x.v}</div>
                        </div>
                      ))}
                    </div>
                    {!lot ? (
                      <div
                        style={{
                          marginTop: 12,
                          border: "1px solid #bfdbfe",
                          background: "#eff6ff",
                          borderRadius: 12,
                          padding: "11px 14px",
                          color: "#1e40af",
                          fontWeight: 700,
                          fontSize: ".86rem",
                        }}
                      >
                        👉 اختر يوم إنتاج من شجرة الدفعات على اليسار لتتبّع دفعة واحدة.
                        <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                          {" "}Pick a production day from the tree to follow a single lot — the totals
                          above cover every run in range.
                        </span>
                      </div>
                    ) : null}
                    <div style={{ color: C.muted, fontSize: ".82rem", marginTop: 12, lineHeight: 1.8 }}>
                      هذا منتج مُصنَّع — لا توجد له شحنة واردة، ورحلته تبدأ من تقرير المنتج النهائي.
                      <br />
                      <span>
                        A manufactured item: it has no incoming shipment, so the Final Product report is
                        its first record.
                        {production.batchCount > 0
                          ? ` ${production.batchCount} traceability batch line${production.batchCount === 1 ? "" : "s"} recorded ${kg(production.batchWeight)} of output — see the batches step below.`
                          : ""}
                      </span>
                      {production.orderNos.length ? (
                        <>
                          <br />
                          <span style={{ fontSize: ".78rem" }}>
                            Order refs: {production.orderNos.slice(0, 6).join(", ")}
                            {production.orderNos.length > 6 ? ` +${production.orderNos.length - 6}` : ""}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : shown.shipments.length === 0 ? (
                  <>
                    <Empty text="لا توجد شحنة واردة لهذه الدفعة ضمن الفترة. / No incoming shipment for this lot in range." />
                    {lot ? (
                      <LotGap
                        rows={full.shipments}
                        lot={lot}
                        what="shipment"
                        onUseLot={setLot}
                        onClearLot={() => setLot(null)}
                      />
                    ) : null}
                  </>
                ) : (
                  <Table
                    min={1080}
                    head={["Date", "Received at", "Invoice", "Supplier", "Origin", "Shipment type", "Qty (pcs)", "Weight (kg)", "Production", "Expiry", "Status"]}
                  >
                    {shown.shipments.map((r) => (
                      <tr key={r.id}>
                        <td style={S.td}>{fmtDMY(r.date)}<ViaBadge via={r.via} /></td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{r.location || "—"}</td>
                        <td style={S.td}>{r.invoiceNo || "—"}</td>
                        <td style={S.td}>{r.supplier || "—"}</td>
                        <td style={S.td}>{r.origin || "—"}</td>
                        <td style={S.td}>{r.shipmentType || "—"}</td>
                        <td style={S.td}>{num(r.qty, 0)}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{num(r.weight)}</td>
                        <td style={S.td}>{fmtDMY(r.prodDate) || r.prodDateRaw || "—"}</td>
                        <td style={S.td}>{fmtDMY(r.expiryDate) || r.expiryDateRaw || "—"}</td>
                        <td style={S.td}>{r.status || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Step>

              {/* ── ② Distribution to our branches ── */}
              <Step
                id="step-2"
                n="2"
                icon="🚚"
                title="Distribution to our branches"
                titleAr="التوزيع على فروعنا"
                accent={C.distribution}
                chip={
                  !downstream ? (
                    <span style={S.chip("#f1f5f9", C.body)}>not read yet</span>
                  ) : (
                    <span style={S.chip(`${C.distribution}1a`, C.distribution)}>
                      {kg(dist.ourQty)} to our branches
                    </span>
                  )
                }
              >
                {!downstream ? (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{ color: C.muted, marginBottom: 10 }}>
                      لم تُقرأ سجلات التوزيع والمرتجعات بعد.
                    </div>
                    <button
                      onClick={() => runDownstream(tracedFor)}
                      disabled={busy}
                      style={{ ...S.btn(C.brandDeep), padding: "9px 18px", fontSize: ".85rem" }}
                    >
                      Read distribution / اقرأ التوزيع
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                        gap: 10,
                      }}
                    >
                      {dist.branches.map((b) => {
                        const active = branchId === b.id;
                        const has = b.qty > 0 || b.rows.length > 0;
                        return (
                          <button
                            key={b.id}
                            onClick={() => setBranchId(active ? "" : b.id)}
                            disabled={!has}
                            title={has ? "اعرض سجل استلام هذا الفرع" : "لا توجد كمية لهذا الفرع"}
                            style={{
                              textAlign: "left",
                              border: `1px solid ${active ? C.distribution : C.line}`,
                              background: active ? `${C.distribution}12` : has ? "#fff" : "#f8fafc",
                              borderRadius: 12,
                              padding: "12px 14px",
                              cursor: has ? "pointer" : "default",
                              opacity: has ? 1 : 0.55,
                              font: "inherit",
                            }}
                          >
                            <div style={{ fontWeight: 900, color: C.ink }}>{b.label}</div>
                            <div style={{ color: C.muted, fontSize: ".76rem" }}>{b.labelAr}</div>
                            <div
                              style={{
                                fontSize: "1.35rem",
                                fontWeight: 900,
                                color: has ? C.distribution : C.muted,
                                marginTop: 6,
                              }}
                            >
                              {has ? kg(b.qty) : "—"}
                            </div>
                            <div style={{ color: C.muted, fontSize: ".74rem", marginTop: 2 }}>
                              {b.rows.length} transfer{b.rows.length === 1 ? "" : "s"}
                              {b.lastDate ? ` · last ${fmtDMY(b.lastDate)}` : ""}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {/* Customers as ONE aggregated card: a total, never a list.
                        Naming them would bury the branch answer this page exists
                        to give. */}
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        flexWrap: "wrap",
                        border: `1px dashed ${C.line}`,
                        background: "#f8fafc",
                        borderRadius: 12,
                        padding: "12px 16px",
                      }}
                    >
                      <span style={{ fontSize: "1.4rem" }}>🧾</span>
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontWeight: 900, color: C.ink }}>Customers (total)</div>
                        <div style={{ color: C.muted, fontSize: ".76rem" }}>الزبائن — إجمالي فقط</div>
                      </div>
                      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: C.body }}>
                        {kg(dist.external.qty)}
                      </div>
                      <div style={{ color: C.muted, fontSize: ".78rem" }}>
                        {dist.external.count} dispatch line{dist.external.count === 1 ? "" : "s"} ·{" "}
                        {dist.external.customers} customer{dist.external.customers === 1 ? "" : "s"}
                      </div>
                      <div style={{ color: C.muted, fontSize: ".76rem", marginInlineStart: "auto", textAlign: "right" }}>
                        لا تُدرج الأسماء — التتبّع هنا لفروعنا
                        <br />
                        Names are not listed by design
                      </div>
                    </div>

                    {/* One honest total for the whole lot */}
                    <div style={{ color: C.muted, fontSize: ".8rem", marginTop: 10 }}>
                      Dispatched in total: <b style={{ color: C.ink }}>{kg(dist.ourQty + dist.external.qty)}</b> —{" "}
                      {kg(dist.ourQty)} to our branches, {kg(dist.external.qty)} to customers.
                    </div>

                    {shown.dispatch.length === 0 && lot ? (
                      <div style={{ marginTop: 12 }}>
                        <LotGap
                          rows={full.dispatch}
                          lot={lot}
                          what="Final Product"
                          onUseLot={setLot}
                          onClearLot={() => setLot(null)}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </Step>

              {/* ── ③ What we SENT — the transfer lines out of the Final Product sheet ── */}
              <Step
                id="step-3"
                n="3"
                icon="📤"
                title={selectedBranch ? `Transfers sent — ${selectedBranch.label}` : "Transfers sent to our branches"}
                titleAr={selectedBranch ? `التحويلات المرسلة إلى ${selectedBranch.labelAr}` : "التحويلات المرسلة لفروعنا"}
                accent={C.distribution}
                chip={
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {branchId ? (
                      <button
                        className="no-print"
                        onClick={() => setBranchId("")}
                        style={{ ...S.btn("#f1f5f9", C.body), padding: "5px 12px", fontSize: ".76rem", boxShadow: "none" }}
                      >
                        ✕ all branches
                      </button>
                    ) : null}
                    <span style={S.chip(`${C.distribution}1a`, C.distribution)}>
                      {transfers.length} transfer{transfers.length === 1 ? "" : "s"}
                      {transferredQty ? ` · ${kg(transferredQty)} sent` : ""}
                    </span>
                  </span>
                }
              >
                {!downstream ? (
                  <Empty text="لم تُقرأ التحويلات بعد. / Transfers have not been read yet." />
                ) : transfers.length === 0 ? (
                  <>
                    <Empty
                      text={
                        branchId
                          ? "لم يُرسل شيء لهذا الفرع من هذه الدفعة. / Nothing was sent to this branch from this lot."
                          : "لم تُرسل كميات لفروعنا من هذه الدفعة. / Nothing from this lot went to our branches."
                      }
                    />
                    {lot ? (
                      <LotGap
                        rows={full.dispatch}
                        lot={lot}
                        what="Final Product"
                        onUseLot={setLot}
                        onClearLot={() => setLot(null)}
                      />
                    ) : null}
                  </>
                ) : (
                  <Table
                    min={860}
                    head={["Date", "Sent to", "Order No", "Time", "Quantity", "Unit", "Production", "Expiry", "Temp", "Condition"]}
                  >
                    {transfers.map((d) => (
                      <tr key={d.id}>
                        <td style={S.td}>{fmtDMY(d.date)}<ViaBadge via={d.via} /></td>
                        <td style={{ ...S.td, fontWeight: 800, color: C.distribution }}>{d.branchLabel}</td>
                        <td style={S.td}>{d.orderNo || "—"}</td>
                        <td style={S.td}>{d.time || "—"}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{num(d.qty)}</td>
                        <td style={S.td}>{d.unit}</td>
                        <td style={S.td}>{fmtDMY(d.prodDate) || "—"}</td>
                        <td style={S.td}>{fmtDMY(d.expiryDate) || "—"}</td>
                        <td style={S.td}>{d.temp || "—"}</td>
                        <td style={S.td}>{d.condition || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Step>

              {/* ── ④ What the BRANCH wrote down ── */}
              <Step
                id="step-4"
                n="4"
                icon="🏬"
                title={selectedBranch ? `Receiving log — ${selectedBranch.label}` : "Branch receiving logs"}
                titleAr={selectedBranch ? `سجل استلام ${selectedBranch.labelAr}` : "سجلات استلام الفروع"}
                accent={C.receiving}
                chip={
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {downstream && transfers.length > 0 && branchReceiving.length > 0 ? (
                      <span
                        style={S.chip("#f1f5f9", C.body)}
                        title="مقارنة: المرسل مقابل المسجَّل في الفرع"
                      >
                        sent {kg(transferredQty)} → logged {kg(receivedQty)}
                      </span>
                    ) : null}
                    <span style={S.chip(`${C.receiving}1a`, C.receiving)}>
                      {branchReceiving.length} record{branchReceiving.length === 1 ? "" : "s"}
                    </span>
                  </span>
                }
              >
                {branchReceiving.length === 0 ? (
                  <>
                    <Empty
                      text={
                        branchId
                          ? "هذا الفرع لم يسجّل استلاماً لهذه الدفعة. / This branch filed no receiving line for this lot."
                          : "لا توجد سجلات استلام في الفروع لهذه الدفعة. / No branch receiving records for this lot."
                      }
                    />
                    {lot && !branchId ? (
                      <LotGap
                        rows={full.receiving}
                        lot={lot}
                        what="branch receiving"
                        onUseLot={setLot}
                        onClearLot={() => setLot(null)}
                      />
                    ) : null}
                  </>
                ) : (
                  <Table
                    min={1040}
                    head={["Date", "Branch", "Product", "Supplier", "Quantity", "Production", "Expiry", "Origin", "Food °C", "Invoice", "Received by"]}
                  >
                    {branchReceiving.map((r) => (
                      <tr key={r.id}>
                        <td style={S.td}>{fmtDMY(r.date)}<ViaBadge via={r.via} /></td>
                        <td style={{ ...S.td, fontWeight: 800, color: C.receiving }}>{r.branch || "—"}</td>
                        <td style={S.td}>
                          {r.matchedCode ? <b style={{ color: C.brandDeep }}>{r.matchedCode} · </b> : null}
                          {r.matchedName || "—"}
                        </td>
                        <td style={S.td}>{r.supplier || "—"}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{r.rawQty || num(r.amount)}</td>
                        <td style={S.td}>{fmtDMY(r.prodDate) || "—"}</td>
                        <td style={S.td}>{fmtDMY(r.expiryDate) || "—"}</td>
                        <td style={S.td}>{r.origin || "—"}</td>
                        <td style={S.td}>{r.foodTemp || "—"}</td>
                        <td style={S.td}>{r.invoiceNo || "—"}</td>
                        <td style={S.td}>{r.receivedBy || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                )}

              </Step>

              {/* ── ⑤ Returns ── */}
              <Step
                id="step-5"
                n="5"
                icon="♻️"
                title="Returns"
                titleAr="المرتجعات"
                accent={C.returns}
                chip={
                  !downstream ? (
                    <span style={S.chip("#f1f5f9", C.body)}>not read yet</span>
                  ) : (
                    <span style={S.chip(`${C.returns}1a`, C.returns)}>
                      {branchReturns.length} record{branchReturns.length === 1 ? "" : "s"}
                      {returnedQty ? ` · ${num(returnedQty)} returned` : ""}
                    </span>
                  )
                }
              >
                {!downstream ? (
                  <Empty text="لم تُقرأ المرتجعات بعد. / Returns have not been read yet." />
                ) : branchReturns.length === 0 ? (
                  <>
                    <Empty
                      text={
                        branchId
                          ? "لا مرتجعات من هذا الفرع لهذه الدفعة. / No returns from this branch for this lot."
                          : "لا توجد مرتجعات لهذه الدفعة. / No returns for this lot."
                      }
                    />
                    {lot && !branchId ? (
                      <LotGap
                        rows={full.returns}
                        lot={lot}
                        what="return"
                        onUseLot={setLot}
                        onClearLot={() => setLot(null)}
                      />
                    ) : null}
                  </>
                ) : (
                  <Table min={980} head={["Date", "Register", "From", "Product", "Qty", "Type", "Expiry", "Origin", "Action", "Remarks"]}>
                    {branchReturns.map((r) => (
                      <tr key={`${r.source}-${r.id}`}>
                        <td style={S.td}>{fmtDMY(r.date)}<ViaBadge via={r.via} /></td>
                        <td style={S.td}>
                          <span style={S.chip(`${C.returns}14`, C.returns)}>{r.sourceLabel}</span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{r.place || "—"}</td>
                        <td style={S.td}>
                          {r.matchedCode ? <b style={{ color: C.brandDeep }}>{r.matchedCode} · </b> : null}
                          {r.matchedName || "—"}
                        </td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{num(r.qty)}</td>
                        <td style={S.td}>{r.qtyType || "—"}</td>
                        <td style={S.td}>{fmtDMY(r.expiryDate) || "—"}</td>
                        <td style={S.td}>{r.origin || "—"}</td>
                        <td style={S.td}>{r.action || "—"}</td>
                        <td style={S.td}>{r.remarks || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Step>

              {/* ── Optional: the manufacturing batches ── */}
              {downstream && shown.batches.length > 0 ? (
                <Step
                  n="+"
                  icon="🔄"
                  title="Manufacturing batches"
                  titleAr="دفعات التصنيع"
                  accent={C.batch}
                  chip={<span style={S.chip(`${C.batch}1a`, C.batch)}>{shown.batches.length} records</span>}
                >
                  <Table
                    min={1040}
                    head={["Date", "Branch", "Role", "Batch / Lot", "Raw material (in)", "In (kg)", "Final product (out)", "Out (kg)", "Production", "Expiry"]}
                  >
                    {shown.batches.map((b) => (
                      <tr key={b.id}>
                        <td style={S.td}>{fmtDMY(b.date)}<ViaBadge via={b.via} /></td>
                        <td style={{ ...S.td, fontWeight: 800, color: C.batch }}>{b.branch || "—"}</td>
                        <td style={S.td}>
                          <span
                            style={S.chip(
                              b.role === "input" ? "#fee2e2" : b.role === "output" ? "#dcfce7" : "#e0e7ff",
                              b.role === "input" ? "#991b1b" : b.role === "output" ? "#166534" : "#3730a3"
                            )}
                          >
                            {b.role === "input" ? "consumed" : b.role === "output" ? "produced" : "in + out"}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{b.batchId || "—"}</td>
                        <td style={S.td}>
                          {b.rawCode ? <b style={{ color: C.shipment }}>{b.rawCode} · </b> : null}
                          {b.rawName || "—"}
                        </td>
                        <td style={S.td}>{num(b.rawWeight)}</td>
                        <td style={S.td}>
                          {b.finalCode ? <b style={{ color: C.receiving }}>{b.finalCode} · </b> : null}
                          {b.finalName || "—"}
                        </td>
                        <td style={S.td}>{num(b.finalWeight)}</td>
                        <td style={S.td}>{fmtDMY(b.finalProdDate || b.origProdDate) || "—"}</td>
                        <td style={S.td}>{fmtDMY(b.finalExpDate || b.origExpDate) || "—"}</td>
                      </tr>
                    ))}
                  </Table>
                </Step>
              ) : null}
            </div>

            <p style={{ color: C.muted, fontSize: ".8rem", marginTop: 16, lineHeight: 1.7 }}>
              Records saved before item codes were introduced carry no code of their own; they are matched
              through the catalog on the product name and are marked <b>by name</b>.
              <br />
              السجلات القديمة (قبل إضافة الكود) تُطابَق عبر اسم المنتج من الكتالوج وتُعلَّم بـ <b>by name</b>.
            </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
