// src/pages/traceability/ProductTracePage.jsx
//
// منظومة تتبع المنتج — Product Traceability
// The screen answers one question in the order a person actually asks it:
//   ① where the product STARTS — an incoming QCS shipment for a raw item, or
//      the Final Product report for one we manufacture ourselves
//   ② how much of it went to each of OUR branches
//   ③ what we actually sent them
//   ④ what does that branch's own receiving log say
//   ⑤ what state was it in once it sat there (the daily condition register)
//   ⑥ did any of it come back
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
  countByName,
  filterByDates,
  filterCodedOnly,
  isConditionIssue,
  isCustomerReturn,
  lotKey,
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
  condition: "#9333ea",
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
    padding: "24px 0 62px",
  },
  // Full-bleed: a thirteen-column batch table and a six-stage flow need the
  // whole screen. No max-width cap — just a slim margin so nothing touches
  // the glass.
  wrap: { width: "100%", margin: 0, padding: "0 18px", boxSizing: "border-box" },
  card: {
    background: C.card,
    border: `1px solid ${C.line}`,
    borderRadius: 16,
    boxShadow: "0 10px 26px rgba(15,23,42,.07)",
    padding: 18,
  },
  label: { fontWeight: 800, color: C.body, display: "block", marginBottom: 5 },
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
  btn: (bg, fg = "#fff") => ({
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15,23,42,.12)",
  }),
  chip: (bg, fg) => ({
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: "3px 11px",
    fontWeight: 800,
    display: "inline-block",
  }),
  th: {
    background: "#f8fafc",
    border: `1px solid ${C.line}`,
    padding: "9px 10px",
    fontWeight: 800,
    color: C.body,
    textAlign: "start",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  td: {
    border: `1px solid ${C.line}`,
    padding: "9px 10px",
    color: C.ink,
    verticalAlign: "middle",
  },
};

/* ===== Type scale =====
   globals.css forces `#root * { font-size:14px !important }` and
   `#root table * { font-size:12px !important }`. Those beat every inline
   fontSize on this page, so the hierarchy it was written with — a 1.7rem
   title, 1.35rem branch totals, .72rem chips — collapsed to one flat 14px and
   the screen read as an undifferentiated wall of same-size text. The classes
   below restore it with a doubled selector (`.pt.pt`) so they out-rank the
   global rule without starting an !important war anywhere else.

   The same file puts `overflow-x:hidden` on html/body/#root, which makes them
   scroll containers and silently disables every position:sticky inside — the
   flow rail and the lot tree never actually stuck. `clip` crops the same
   overflow without creating a scroll container, scoped here via :has(.pt). */
const PT_CSS = `
#root .pt.pt, #root .pt.pt *, #root .pt.pt table, #root .pt.pt table * { font-size: 15px !important; }
#root .pt.pt .pt-h1     { font-size: 30px !important; letter-spacing: .3px; }
#root .pt.pt .pt-sub    { font-size: 16px !important; }
#root .pt.pt .pt-sec    { font-size: 19px !important; }
#root .pt.pt .pt-secar  { font-size: 15px !important; }
#root .pt.pt .pt-num    { font-size: 16px !important; }
#root .pt.pt .pt-code   { font-size: 26px !important; }
#root .pt.pt .pt-name   { font-size: 19px !important; }
#root .pt.pt .pt-kpi    { font-size: 26px !important; }
#root .pt.pt .pt-kpis   { font-size: 21px !important; }
#root .pt.pt .pt-lbl    { font-size: 12.5px !important; letter-spacing: .4px; }
#root .pt.pt .pt-meta   { font-size: 14px !important; }
#root .pt.pt .pt-chip   { font-size: 13px !important; }
#root .pt.pt .pt-count  { font-size: 12px !important; }
#root .pt.pt .pt-flowl  { font-size: 15px !important; }
#root .pt.pt .pt-flowa  { font-size: 12.5px !important; }
#root .pt.pt .pt-note   { font-size: 14.5px !important; }
#root .pt.pt .pt-ico    { font-size: 21px !important; }
#root .pt.pt .pt-ico-sm { font-size: 17px !important; }
#root .pt.pt .pt-ico-xl { font-size: 48px !important; }
#root .pt.pt .pt-tree-y { font-size: 16px !important; }
#root .pt.pt .pt-tree-m { font-size: 15px !important; }
#root .pt.pt .pt-tree-d { font-size: 15px !important; }
#root .pt.pt .pt-tree-x { font-size: 12.5px !important; }
#root .pt.pt table th   { font-size: 13px !important; }
#root .pt.pt table td   { font-size: 14px !important; }
#root .pt.pt .pt-btn    { font-size: 15px !important; }
#root .pt.pt .pt-btn-sm { font-size: 14px !important; }
#root .pt.pt input, #root .pt.pt input::placeholder { font-size: 15.5px !important; }

/* Weight: the baseline goes from normal to semi-bold so ordinary text and
   every table cell read heavier, while the elements that already carry an
   inline 800/900 keep theirs and stay clearly above it. Deliberately NOT
   !important — an !important weight here would flatten headings, totals and
   body copy to one thickness, and "everything bold" is the same as nothing
   bold. Table headers are pushed further up so the header row still wins. */
#root .pt.pt            { font-weight: 600; }
#root .pt.pt table td   { font-weight: 600; }
#root .pt.pt table th   { font-weight: 900; }
#root .pt.pt .pt-meta,
#root .pt.pt .pt-note,
#root .pt.pt .pt-flowa,
#root .pt.pt .pt-tree-x { font-weight: 650; }
#root .pt.pt input      { font-weight: 650; }

/* sticky needs a non-scrolling ancestor chain — see the note above */
html:has(.pt), body:has(.pt), #root:has(.pt) { overflow-x: clip; }
#root .pt.pt .pt-rail { position: sticky; top: 8px; z-index: 40; }
#root .pt.pt .pt-tree { position: sticky; top: 12px; max-height: calc(100vh - 40px); overflow-y: auto; }

#root .pt.pt .pt-shell  { display: grid; grid-template-columns: minmax(288px,330px) minmax(0,1fr); gap: 16px; align-items: start; }
/* Folded away: the picker becomes a slim rail and the report takes the rest. */
#root .pt.pt .pt-shell.pt-collapsed { grid-template-columns: 40px minmax(0,1fr); }
#root .pt.pt .pt-tree-rail {
  position: sticky; top: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  width: 40px; padding: 12px 0;
  border: 1px solid #e2e8f0; border-radius: 12px;
  background: #fff; box-shadow: 0 10px 26px rgba(15,23,42,.07);
  color: #334155; font: inherit; font-weight: 800; cursor: pointer;
}
#root .pt.pt .pt-tree-rail:hover { border-color: #1d4ed8; color: #1d4ed8; }
#root .pt.pt .pt-tree-rail-txt {
  writing-mode: vertical-rl; text-orientation: mixed;
  white-space: nowrap; letter-spacing: .5px;
}
#root .pt.pt .pt-search { display: grid; grid-template-columns: minmax(140px,.7fr) minmax(220px,2fr) auto; gap: 12px; align-items: end; }

/* Tablet: the tree stops earning a column of its own. */
@media (max-width: 1024px) {
  #root .pt.pt .pt-shell,
  #root .pt.pt .pt-shell.pt-collapsed { grid-template-columns: minmax(0,1fr); }
  #root .pt.pt .pt-tree  { position: static; max-height: 320px; }
  /* No side rail on a narrow screen — it becomes an ordinary full-width bar. */
  #root .pt.pt .pt-tree-rail { position: static; width: 100%; flex-direction: row; justify-content: center; padding: 10px; }
  #root .pt.pt .pt-tree-rail-txt { writing-mode: horizontal-tb; }
}
@media (max-width: 700px) {
  #root .pt.pt .pt-search { grid-template-columns: minmax(0,1fr); }
  #root .pt.pt .pt-rail   { position: static; }
  #root .pt.pt .pt-h1     { font-size: 24px !important; }
  #root .pt.pt .pt-wrap   { padding-left: 10px; padding-right: 10px; }
  #root .pt.pt .pt-code   { font-size: 21px !important; }
  #root .pt.pt .pt-kpi    { font-size: 22px !important; }
}

@media print {
  #root .pt.pt .no-print { display: none !important; }
  #root .pt.pt .pt-shell { grid-template-columns: minmax(0,1fr) !important; }
  #root .pt.pt .pt-hero  { background: #fff !important; color: #0f172a !important; padding: 0 0 12px !important; }
  #root .pt.pt .pt-hero * { color: #0f172a !important; }
  #root .pt.pt .pt-body  { margin-top: 0 !important; }
  #root .pt.pt section   { break-inside: avoid; box-shadow: none !important; }
  /* the on-screen scroll cap would guillotine a long table on paper */
  #root .pt.pt .pt-tablewrap { max-height: none !important; overflow: visible !important; }
  #root .pt.pt table th  { position: static !important; }
  body { background: #fff; }
}
`;

const RANGES = [
  { key: "3", label: "3 months", months: 3 },
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "12 months", months: 12 },
  { key: "all", label: "All time", months: null },
];

/* A traceability screen must not dress a real zero up as "no data": a lot that
   truly moved 0 kg is a finding, an em-dash is a shrug. "—" is now reserved
   for a value that genuinely is not there. */
const num = (v, dp = 2) =>
  Number.isFinite(v) ? Number(v).toFixed(dp).replace(/\.0+$/, "") : "—";
const kg = (v) => (Number.isFinite(v) ? `${num(v)} kg` : "—");

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
            className="pt-num"
          >
            {n}
          </span>
          <span className="pt-ico">{icon}</span>
          <b className="pt-sec" style={{ color: C.ink }}>{title}</b>
          <span className="pt-secar" style={{ color: C.muted, fontWeight: 700 }}>{titleAr}</span>
          {chip ? <span style={{ marginInlineStart: "auto" }}>{chip}</span> : null}
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </section>
    </>
  );
}

function Empty({ text }) {
  return (
    <div className="pt-meta" style={{ color: C.muted, fontStyle: "italic", padding: "12px 2px" }}>{text}</div>
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
      className="pt-note"
      style={{
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        borderRadius: 12,
        padding: "12px 14px",
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
            className="pt-btn-sm"
            onClick={() => onUseLot({ prodDate: o.prodDate, expiryDate: o.expiryDate })}
            style={{
              ...S.btn("#fff", "#92400e"),
              border: "1px solid #fcd34d",
              padding: "6px 12px",
              boxShadow: "none",
            }}
          >
            Prod {fmtDMY(o.prodDate) || "—"} · Exp {fmtDMY(o.expiryDate) || "—"} ({o.n})
          </button>
        ))}
        <button
          onClick={onClearLot}
          className="pt-btn-sm"
          style={{ ...S.btn("#92400e"), padding: "6px 12px", boxShadow: "none" }}
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
      className="pt-chip"
      style={{ ...S.chip("#fef3c7", "#92400e"), marginInlineStart: 6 }}
    >
      by name
    </span>
  );
}

function Table({ head, children, min = 900 }) {
  return (
    // A single step can carry hundreds of dispatch lines; capping the scroll
    // box keeps the next step reachable instead of a mile below the fold.
    <div className="pt-tablewrap" style={{ overflow: "auto", maxHeight: "62vh", border: `1px solid ${C.line}`, borderRadius: 10 }}>
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

/* ===== In-branch traceability =====
   One carcass is broken down into six or eight cuts, and the log stores that
   as six or eight rows that repeat the SAME raw material, the same batch id,
   the same original dates and the same 18.6 kg over and over. Printed flat it
   reads as six different inputs, which is the opposite of what happened, and
   the eye has to verify by hand that all six really do say 18.6.

   So the raw side is stated ONCE and merged down (rowSpan) across its own
   outputs, exactly the way the paper form is laid out: one input, a bracket,
   the cuts that came out of it. */

/** Group batch rows by the input they came out of. */
function groupBatches(rows) {
  const groups = new Map();
  (rows || []).forEach((b) => {
    const key = [b.batchId, b.rawCode, b.rawName, b.origProdDate, b.origExpDate, b.branch].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        date: b.date,
        branch: b.branch,
        batchId: b.batchId,
        rawCode: b.rawCode,
        rawName: b.rawName,
        // The raw weight is repeated on every output row of one batch, so it
        // is the batch's single input weight — never a sum of the repeats.
        rawWeight: b.rawWeight,
        origProdDate: b.origProdDate,
        origExpDate: b.origExpDate,
        openedDate: b.openedDate,
        bestBefore: b.bestBefore,
        via: b.via,
        roles: new Set(),
        rows: [],
      });
    }
    const g = groups.get(key);
    g.roles.add(b.role);
    g.rows.push(b);
    if (!g.rawWeight) g.rawWeight = b.rawWeight;
    if (!g.openedDate) g.openedDate = b.openedDate;
    if (!g.bestBefore) g.bestBefore = b.bestBefore;
    if (String(b.date) > String(g.date || "")) g.date = b.date;
  });
  return Array.from(groups.values()).map((g) => ({
    ...g,
    roles: Array.from(g.roles),
    outWeight: g.rows.reduce((a, r) => a + r.finalWeight, 0),
  }));
}

const ROLE_CHIP = {
  input: { bg: "#fee2e2", fg: "#991b1b", label: "consumed", ar: "استُهلك" },
  output: { bg: "#dcfce7", fg: "#166534", label: "produced", ar: "أُنتج" },
  both: { bg: "#e0e7ff", fg: "#3730a3", label: "in + out", ar: "دخل وخرج" },
};

function BatchGroups({ groups }) {
  const merged = {
    ...S.td,
    background: "#fbfcfe",
    verticalAlign: "middle",
    borderInlineEnd: `2px solid ${C.line}`,
  };
  return (
    <Table
      min={1560}
      head={[
        "Date",
        "Branch",
        "Batch / Lot ID",
        "Raw material used",
        "Orig. production",
        "Orig. expiry",
        "Opened",
        "Best before",
        "Raw weight (kg)",
        "Product prepared (final)",
        "Production (final)",
        "Expiry (final)",
        "Final weight (kg)",
      ]}
    >
      {groups.map((g) => {
        const n = g.rows.length;
        // Cutting yield: what came out against what went in. On a disassembly
        // batch this is the number the supervisor actually checks.
        const yieldPct = g.rawWeight > 0 ? (g.outWeight / g.rawWeight) * 100 : null;
        return (
          <React.Fragment key={g.key}>
            {/* The banner the paper form has: which batch, and how many cuts. */}
            <tr>
              <td
                colSpan={13}
                style={{
                  ...S.td,
                  background: `${C.batch}12`,
                  borderTop: `2px solid ${C.batch}55`,
                  fontWeight: 900,
                  color: "#7c4a03",
                }}
              >
                🔗 Batch / Lot: {g.batchId || "—"} — {n} row{n === 1 ? "" : "s"}
                {g.roles.map((r) => (
                  <span
                    key={r}
                    className="pt-chip"
                    style={{ ...S.chip(ROLE_CHIP[r].bg, ROLE_CHIP[r].fg), marginInlineStart: 8 }}
                  >
                    {ROLE_CHIP[r].label} · {ROLE_CHIP[r].ar}
                  </span>
                ))}
                {yieldPct != null ? (
                  <span
                    className="pt-chip"
                    style={{
                      ...S.chip("#f1f5f9", C.body),
                      marginInlineStart: 8,
                    }}
                    title="إجمالي المُخرَج ÷ الوزن الخام"
                  >
                    out {num(g.outWeight)} of {num(g.rawWeight)} kg · {num(yieldPct, 1)}%
                  </span>
                ) : null}
              </td>
            </tr>

            {g.rows.map((b, i) => (
              <tr key={b.id}>
                {/* Stated once, merged down over this batch's own outputs. */}
                {i === 0 ? (
                  <>
                    <td rowSpan={n} style={merged}>
                      {fmtDMY(g.date)}
                      <ViaBadge via={g.via} />
                    </td>
                    <td rowSpan={n} style={{ ...merged, fontWeight: 800, color: C.batch }}>
                      {g.branch || "—"}
                    </td>
                    <td rowSpan={n} style={{ ...merged, fontWeight: 900 }}>{g.batchId || "—"}</td>
                    <td rowSpan={n} style={merged}>
                      {g.rawCode ? <b style={{ color: C.shipment }}>{g.rawCode} · </b> : null}
                      {g.rawName || "—"}
                    </td>
                    <td rowSpan={n} style={merged}>{fmtDMY(g.origProdDate) || "—"}</td>
                    <td rowSpan={n} style={merged}>{fmtDMY(g.origExpDate) || "—"}</td>
                    <td rowSpan={n} style={merged}>{fmtDMY(g.openedDate) || "—"}</td>
                    <td rowSpan={n} style={merged}>{fmtDMY(g.bestBefore) || "—"}</td>
                    <td rowSpan={n} style={{ ...merged, fontWeight: 900 }}>
                      {num(g.rawWeight)} kg
                    </td>
                  </>
                ) : null}

                <td style={S.td}>
                  {b.finalCode ? <b style={{ color: C.receiving }}>{b.finalCode} · </b> : null}
                  {b.finalName || "—"}
                </td>
                <td style={S.td}>{fmtDMY(b.finalProdDate || g.origProdDate) || "—"}</td>
                <td style={S.td}>{fmtDMY(b.finalExpDate || g.origExpDate) || "—"}</td>
                <td style={{ ...S.td, fontWeight: 900 }}>{num(b.finalWeight)} kg</td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}
    </Table>
  );
}

/**
 * One return channel — our branches, or outside customers.
 *
 * They are two tables rather than one with a "register" column because the
 * questions differ: a branch return asks WHICH SITE to go and inspect, a
 * customer return asks WHO to call and WHICH VEHICLE brought it back. The
 * customer sheet is the only one carrying the car and driver, and folding it
 * into the branch table meant those columns were simply never shown.
 */
function ReturnTrack({ title, titleAr, icon, accent, rows, empty, note, customer }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          borderInlineStart: `3px solid ${accent}`,
          background: `${accent}0c`,
          borderRadius: 8,
          padding: "7px 11px",
          marginBottom: 8,
        }}
      >
        <span className="pt-ico-sm">{icon}</span>
        <b className="pt-flowl" style={{ color: C.ink }}>{title}</b>
        <span className="pt-flowa" style={{ color: C.muted, fontWeight: 700 }}>{titleAr}</span>
        <span className="pt-chip" style={{ ...S.chip(`${accent}1a`, accent), marginInlineStart: "auto" }}>
          {rows.length} record{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {note ? (
        <div className="pt-note" style={{ color: C.muted, margin: "0 0 8px", lineHeight: 1.7 }}>
          {note}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Empty text={empty} />
      ) : (
        <Table
          min={customer ? 1120 : 980}
          head={
            customer
              ? ["Date", "Customer", "Product", "Qty", "Type", "Expiry", "Origin", "Car no.", "Driver", "Action", "Photos", "Remarks"]
              : ["Date", "Register", "From", "Product", "Qty", "Type", "Expiry", "Origin", "Action", "Remarks"]
          }
        >
          {rows.map((r) => (
            <tr key={`${r.source}-${r.id}`}>
              <td style={S.td}>{fmtDMY(r.date)}<ViaBadge via={r.via} /></td>
              {customer ? null : (
                <td style={S.td}>
                  <span className="pt-chip" style={S.chip(`${accent}14`, accent)}>{r.sourceLabel}</span>
                </td>
              )}
              <td style={{ ...S.td, fontWeight: 800, color: customer ? accent : C.ink }}>
                {r.place || r.customerName || "—"}
              </td>
              <td style={S.td}>
                {r.matchedCode ? <b style={{ color: C.brandDeep }}>{r.matchedCode} · </b> : null}
                {r.matchedName || "—"}
              </td>
              <td style={{ ...S.td, fontWeight: 800 }}>{num(r.qty)}</td>
              <td style={S.td}>{r.qtyType || "—"}</td>
              <td style={S.td}>{fmtDMY(r.expiryDate) || "—"}</td>
              <td style={S.td}>{r.origin || "—"}</td>
              {customer ? <td style={S.td}>{r.carNumber || "—"}</td> : null}
              {customer ? <td style={S.td}>{r.driverName || "—"}</td> : null}
              <td style={S.td}>{r.action || "—"}</td>
              {customer ? <td style={S.td}>{r.images ? `📷 ${r.images}` : "—"}</td> : null}
              <td style={S.td}>{r.remarks || "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

/* ===== Lot picker =====
   A manufactured line can carry 250+ output rows over 50+ production dates, so
   the lots need a list of their own rather than a dropdown. What that list has
   to do is let someone CHOOSE — see below. */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** One accordion level, not two. A lot is grouped by the month it was produced
 *  in — or, when it has no production date, the month it expires in. */
function groupByMonth(lots) {
  const months = new Map();
  (lots || []).forEach((l) => {
    const d = l.prodDate || l.expiryDate || "";
    const ym = d ? d.slice(0, 7) : "—";
    if (!months.has(ym)) {
      months.set(ym, { ym, year: ym === "—" ? "—" : ym.slice(0, 4), records: 0, issues: 0, lots: [] });
    }
    const m = months.get(ym);
    m.records += l.total;
    m.issues += l.issues || 0;
    m.lots.push(l);
  });
  return Array.from(months.values()).sort((a, b) => String(b.ym).localeCompare(String(a.ym)));
}

const monthLabel = (ym) =>
  ym === "—" ? "No date" : `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1] || ""} ${ym.slice(0, 4)}`;

/** Whole days from today to an expiry date; null when there is no usable date. */
function daysToExpiry(expiry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiry || ""))) return null;
  const ms = Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${todayYMD()}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

/* The five colours the flow steps already use. Repeating them on the lot card
   is the whole point: a glance at a lot says which steps it will light up,
   so picking one stops being a lottery. */
const PIPS = [
  { k: "shipments", c: C.shipment, label: "shipment", ar: "شحنة" },
  { k: "receiving", c: C.receiving, label: "branch receiving", ar: "استلام فرع" },
  { k: "batches", c: C.batch, label: "batch", ar: "دفعة تصنيع" },
  { k: "dispatch", c: C.distribution, label: "final product", ar: "منتج نهائي" },
  { k: "conditions", c: C.condition, label: "condition check", ar: "حالة اللحم" },
  { k: "returns", c: C.returns, label: "return", ar: "مرتجع" },
];

/**
 * The lot picker.
 *
 * The old shape was a year → month → day accordion of bare date rows: three
 * clicks to reach a lot, and once you got there the row said nothing except a
 * date and a total, so choosing between two lots meant picking one, reading
 * five steps, going back and picking the other. The list below is one level
 * deep and every lot states up front what is actually in it — which families,
 * which branches, how close to expiry, and whether anything was flagged.
 */
function LotPicker({ lots, activeKey, onPick, onClear, onCollapse, busy }) {
  const months = useMemo(() => groupByMonth(lots), [lots]);
  const [open, setOpen] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);

  /* Seed the newest month open, once per dataset. Re-seeding on every change
     folded the list back up underneath whoever was reading it, because the
     lots are rebuilt the moment the downstream half lands. */
  const seeded = useRef("");
  useEffect(() => {
    if (!months.length) return;
    const sig = `${months.length}:${months[0].ym}`;
    if (seeded.current === sig) return;
    seeded.current = sig;
    setOpen((prev) => new Set(prev).add(months[0].ym));
  }, [months]);

  const toggle = (k) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (l) => {
      if (issuesOnly && !(l.issues || l.counts.returns)) return false;
      if (!q) return true;
      return `${l.prodDate} ${fmtDMY(l.prodDate)} ${l.expiryDate} ${fmtDMY(l.expiryDate)} ${(
        l.branches || []
      ).join(" ")}`
        .toLowerCase()
        .includes(q);
    },
    [q, issuesOnly]
  );

  const visible = useMemo(
    () => months.map((m) => ({ ...m, lots: m.lots.filter(matches) })).filter((m) => m.lots.length),
    [months, matches]
  );

  const total = (lots || []).length;
  const flagged = useMemo(
    () => (lots || []).filter((l) => l.issues || l.counts.returns).length,
    [lots]
  );

  const pill = (on, accent) => ({
    border: `1px solid ${on ? accent : C.line}`,
    background: on ? `${accent}14` : "#fff",
    color: on ? accent : C.body,
    borderRadius: 999,
    padding: "5px 12px",
    fontWeight: 800,
    cursor: "pointer",
    font: "inherit",
    flex: "1 1 0",
    whiteSpace: "nowrap",
  });

  return (
    <aside style={{ ...S.card, padding: 12 }} className="no-print pt-tree">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="pt-sec" style={{ fontWeight: 900, color: C.ink }}>🗓 Production lots</div>
        <span className="pt-count" style={{ color: C.muted, fontWeight: 800, marginInlineStart: "auto" }}>
          {total}
        </span>
        <button
          onClick={onCollapse}
          title="اطوِ اللوحة / Collapse — give the report the full width"
          aria-label="Collapse the lot picker"
          style={{
            border: `1px solid ${C.line}`,
            background: "#fff",
            color: C.body,
            borderRadius: 8,
            width: 26,
            height: 26,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          «
        </button>
      </div>
      <div className="pt-meta" style={{ color: C.muted, marginBottom: 9 }}>
        دفعات الإنتاج — اختر دفعة
      </div>

      {total > 6 ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 date or branch… / تاريخ أو فرع"
          className="pt-btn-sm"
          style={{ ...S.input, padding: "7px 10px", marginBottom: 7 }}
        />
      ) : null}

      <div className="pt-btn-sm" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => {
            setIssuesOnly(false);
            onClear();
          }}
          style={pill(!activeKey && !issuesOnly, C.brandDeep)}
        >
          All / الكل
        </button>
        <button
          onClick={() => setIssuesOnly((v) => !v)}
          disabled={!flagged}
          title="الدفعات التي فيها مرتجع أو ملاحظة على حالة اللحم"
          style={{ ...pill(issuesOnly, C.returns), opacity: flagged ? 1 : 0.45 }}
        >
          ⚠ {flagged} flagged
        </button>
      </div>

      {busy ? <div className="pt-meta" style={{ color: C.muted }}>Loading…</div> : null}

      {!visible.length && !busy ? (
        <div className="pt-meta" style={{ color: C.muted, fontStyle: "italic" }}>
          {total ? "لا نتائج لهذا الرشّح." : "لا توجد دفعات ضمن الفترة."}
        </div>
      ) : null}

      {visible.map((m, mi) => {
        const isOpen = open.has(m.ym);
        const newYear = mi === 0 || visible[mi - 1].year !== m.year;
        return (
          <div key={m.ym}>
            {newYear && m.year !== "—" ? (
              <div
                className="pt-lbl"
                style={{
                  color: C.muted,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  margin: "12px 0 4px",
                  paddingInlineStart: 2,
                  borderTop: `1px solid ${C.line}`,
                  paddingTop: 8,
                }}
              >
                {m.year}
              </div>
            ) : null}
            <button
              className="pt-tree-m"
              onClick={() => toggle(m.ym)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                textAlign: "start",
                border: "none",
                background: "transparent",
                color: C.body,
                font: "inherit",
                fontWeight: 800,
                padding: "6px 4px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ width: 11, color: C.muted }}>{isOpen ? "▾" : "▸"}</span>
              <span>{monthLabel(m.ym)}</span>
              {m.issues ? <span style={{ color: C.returns }}>⚠</span> : null}
              <span
                className="pt-count"
                style={{
                  marginInlineStart: "auto",
                  color: C.muted,
                  fontWeight: 800,
                }}
              >
                {m.lots.length}
              </span>
            </button>

            {isOpen
              ? m.lots.map((l) => {
                  const active = l.key === activeKey;
                  const left = daysToExpiry(l.expiryDate);
                  const expired = left != null && left < 0;
                  const soon = left != null && left >= 0 && left <= 7;
                  const expColor = expired ? C.returns : soon ? "#b45309" : C.muted;
                  const flag = (l.issues || 0) + (l.counts.returns || 0);
                  return (
                    <button
                      key={l.key}
                      onClick={() => onPick(l)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "start",
                        font: "inherit",
                        cursor: "pointer",
                        border: `1px solid ${active ? C.brandDeep : C.line}`,
                        borderInlineStartWidth: 3,
                        borderInlineStartColor: active ? C.brandDeep : flag ? C.returns : C.line,
                        background: active ? "#eef2ff" : "#fff",
                        borderRadius: 10,
                        padding: "8px 10px",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <b className="pt-tree-d" style={{ color: active ? C.brandDeep : C.ink }}>
                          {fmtDMY(l.prodDate) || "No prod. date"}
                        </b>
                        {flag ? (
                          <span className="pt-count" style={{ color: C.returns, fontWeight: 900 }}>⚠</span>
                        ) : null}
                        <span
                          className="pt-count"
                          style={{
                            marginInlineStart: "auto",
                            background: active ? C.brandDeep : "#eef2ff",
                            color: active ? "#fff" : C.brandDeep,
                            borderRadius: 999,
                            padding: "1px 7px",
                            fontWeight: 800,
                          }}
                        >
                          {l.total}
                        </span>
                      </div>

                      <div className="pt-tree-x" style={{ color: expColor, fontWeight: 700, marginTop: 2 }}>
                        exp {fmtDMY(l.expiryDate) || "—"}
                        {left != null
                          ? expired
                            ? ` · expired ${Math.abs(left)}d ago`
                            : ` · ${left}d left`
                          : ""}
                      </div>

                      {/* Which steps this lot will actually light up. */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                        {PIPS.filter((pp) => l.counts[pp.k] > 0).map((pp) => (
                          <span
                            key={pp.k}
                            className="pt-count"
                            title={`${l.counts[pp.k]} ${pp.label} — ${pp.ar}`}
                            style={{
                              background: `${pp.c}18`,
                              color: pp.c,
                              borderRadius: 5,
                              padding: "1px 5px",
                              fontWeight: 800,
                            }}
                          >
                            {l.counts[pp.k]}
                          </span>
                        ))}
                      </div>

                      {l.branches?.length ? (
                        <div
                          className="pt-tree-x"
                          style={{
                            color: C.muted,
                            marginTop: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={l.branches.join(" · ")}
                        >
                          {l.branches.slice(0, 3).join(" · ")}
                          {l.branches.length > 3 ? ` +${l.branches.length - 3}` : ""}
                        </div>
                      ) : null}
                    </button>
                  );
                })
              : null}
          </div>
        );
      })}

      {/* What the coloured counts on each card mean. */}
      {visible.length ? (
        <div
          className="pt-tree-x"
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${C.line}`,
            color: C.muted,
          }}
        >
          {PIPS.map((pp) => (
            <span key={pp.k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: pp.c }} />
              {pp.ar}
            </span>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

/** The flow itself, always visible: six stages with live counts, each one a
 *  jump link. Without this the "flow chart" is invisible the moment a table
 *  grows past a screenful. */
function FlowRail({ stages, onJump }) {
  return (
    <div
      className="pt-rail"
      style={{
        ...S.card,
        padding: "12px 14px",
        display: "flex",
        alignItems: "stretch",
        gap: 6,
        overflowX: "auto",
      }}
    >
      {stages.map((st, i) => (
        <React.Fragment key={st.id}>
          <button
            onClick={() => onJump(st.id)}
            title={st.ar}
            style={{
              flex: "1 1 0",
              minWidth: 158,
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
                  fontWeight: 900,
                  display: "grid",
                  placeItems: "center",
                }}
                className="pt-count"
              >
                {i + 1}
              </span>
              <span className="pt-ico-sm">{st.icon}</span>
              <b className="pt-flowl" style={{ color: C.ink }}>{st.label}</b>
            </div>
            <div className="pt-flowa" style={{ color: C.muted, marginTop: 3 }}>{st.ar}</div>
            <div
              className="pt-kpis"
              style={{ color: st.n ? st.accent : C.muted, fontWeight: 900, marginTop: 2 }}
            >
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
  const [lot, setLot] = useState(null); // { prodDate, expiryDate, key } | null
  const [branchId, setBranchId] = useState("");
  // The picker is a tool, not part of the report: once a lot is chosen it can
  // be folded away so the tables get the full width of the screen.
  const [treeOpen, setTreeOpen] = useState(true);
  // "بالكود فقط" — drop the rows that were only recognised by their name.
  const [codedOnly, setCodedOnly] = useState(false);
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
    setError("");
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

  /* Everything on screen reads from here, not from `full`: the coded-only
     switch has to reach the lot picker too, or you would pick a lot built out
     of name-matched rows and land on six empty steps. */
  const scoped = useMemo(() => {
    if (!full) return null;
    return codedOnly ? filterCodedOnly(full) : full;
  }, [full, codedOnly]);

  const byNameCount = useMemo(() => countByName(full), [full]);

  /* The picker offers the arrival lots while only the arrival half is read,
     then widens to every lot once the downstream half comes in — a
     manufactured product's lots only exist on the Final Product report. */
  const treeLots = useMemo(() => (scoped ? collectLots(scoped) : []), [scoped]);

  /** Picking a lot is what starts the downstream read. Everything that selects
   *  a lot goes through here — including the "jump to this date" buttons in the
   *  gap warnings, which used to call setLot directly and so left the tree
   *  unhighlighted, the branch filter stale, and the downstream half unread. */
  const pickLot = useCallback(
    (l) => {
      if (!l) {
        setLot(null);
        setBranchId("");
        return;
      }
      const prodDate = l.prodDate || "";
      const expiryDate = l.expiryDate || "";
      setLot({ prodDate, expiryDate, key: l.key || lotKey(prodDate, expiryDate) });
      setBranchId("");
      if (!downstream) runDownstream(tracedFor);
    },
    [downstream, runDownstream, tracedFor]
  );
  const clearLot = useCallback(() => pickLot(null), [pickLot]);

  // Everything below is the trace narrowed to the chosen lot.
  /* "loose" instead of the old strict "both": a row belongs to the lot when it
     agrees on every date it actually carries. Under the strict reading a branch
     receiving line with a production date but a blank expiry — the normal case —
     counted as a mismatch, so steps came up empty on lots that plainly exist.
     See filterByDates for the full reasoning. */
  const shown = useMemo(() => {
    if (!scoped) return null;
    if (!lot) return scoped;
    return filterByDates(scoped, {
      mode: "loose",
      prodDate: lot.prodDate,
      expiryDate: lot.expiryDate,
    });
  }, [scoped, lot]);

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

  /* ⑤ الحالة اليومية — the daily condition register, narrowed the same way the
     receiving log is. It has no branch column: the site is written into the
     remarks, and the engine resolves it there. */
  const branchConditions = useMemo(() => {
    if (!shown) return [];
    return branchId ? shown.conditions.filter((c) => c.branch === branchId) : shown.conditions;
  }, [shown, branchId]);

  const conditionIssues = useMemo(
    () => branchConditions.filter((c) => isConditionIssue(c.status)),
    [branchConditions]
  );

  /* ⑥ الاسترجاع بمسارين — the two return channels, deliberately kept apart.
     A branch return names one of our sites and follows the branch filter. A
     CUSTOMER return names an outside buyer, so it resolves to no branch at
     all: running it through the same filter deleted every customer return the
     moment a branch was selected, which is exactly when someone is looking
     hardest. The customer track therefore ignores branchId — an item the
     customer sent back is part of this lot's story no matter which of our
     sites is on screen. */
  const branchReturns = useMemo(() => {
    if (!shown) return [];
    const ours = shown.returns.filter((r) => !isCustomerReturn(r));
    return branchId ? ours.filter((r) => r.branch === branchId) : ours;
  }, [shown, branchId]);

  const customerReturns = useMemo(
    () => (shown ? shown.returns.filter(isCustomerReturn) : []),
    [shown]
  );

  const customerReturnedQty = useMemo(
    () => customerReturns.reduce((a, r) => a + r.qty, 0),
    [customerReturns]
  );

  /* Condition lines whose branch could not be read out of the remarks. They
     are hidden by the branch filter like any other unattributed row, so say so
     instead of letting the step look emptier than the data is. */
  const unattributedConditions = useMemo(() => {
    if (!shown || !branchId) return 0;
    return shown.conditions.filter((c) => !c.branch).length;
  }, [shown, branchId]);

  // Totalled over what is actually on screen, so the chip agrees with the rows
  // below it when a branch is selected.
  const returnedQty = useMemo(
    () => branchReturns.reduce((a, r) => a + r.qty, 0),
    [branchReturns]
  );

  const selectedBranch = dist?.branches.find((b) => b.id === branchId) || null;

  // One row per CUT, grouped under the one carcass they all came out of.
  const batchGroups = useMemo(() => (shown ? groupBatches(shown.batches) : []), [shown]);

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
    <div className="pt" style={S.page}>
      <style>{PT_CSS}</style>

      {/* ── Hero ── */}
      <div className="pt-hero" style={S.hero}>
        <div className="pt-wrap" style={S.wrap}>
          <button
            className="no-print pt-btn-sm"
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
          <h1 className="pt-h1" style={{ margin: 0, fontWeight: 1000 }}>
            🧬 Product Traceability
          </h1>
          <p className="pt-sub" style={{ margin: "6px 0 0", opacity: 0.92, fontWeight: 600 }}>
            منظومة تتبع المنتج — من الشحنة الواردة إلى الفرع والمرتجعات
          </p>
        </div>
      </div>

      <div className="pt-body pt-wrap" style={{ ...S.wrap, marginTop: -44 }}>
        {/* ── Search ── */}
        {/* A real <form>, so Enter runs the trace. The pickers swallow Enter
            only while their suggestion list is open, which is exactly right:
            first Enter commits the suggestion, the next one searches. */}
        <form
          style={S.card}
          className="no-print"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) runTrace();
          }}
        >
          <div className="pt-search">
            <div>
              <label className="pt-lbl" style={S.label}>Item Code / كود المنتج</label>
              <ItemCodeInput
                code={product.code}
                name={product.name}
                onChange={setProduct}
                style={S.input}
                placeholder="e.g., 20000"
              />
            </div>
            <div>
              <label className="pt-lbl" style={S.label}>Product Name / اسم المنتج</label>
              <ItemNameInput
                code={product.code}
                name={product.name}
                onChange={setProduct}
                style={S.input}
                placeholder="Search code or product…"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="pt-btn"
              style={{
                ...S.btn(busy ? "#94a3b8" : C.brandDeep),
                whiteSpace: "nowrap",
                cursor: busy ? "progress" : "pointer",
              }}
            >
              {busy ? "Tracing…" : "🔍 Trace"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className="pt-btn-sm"
                  onClick={() => applyRange(r.key)}
                  style={{
                    ...S.btn(rangeKey === r.key ? C.brand : "#eef2ff", rangeKey === r.key ? "#fff" : C.brandDeep),
                    padding: "8px 14px",
                    boxShadow: "none",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {/* Rows matched through the catalog on their NAME are a good guess,
                not a fact. This drops them, so what is left is only what the
                records themselves prove by carrying the code.

                Always clickable. It is a search preference like the date range,
                so it must be settable BEFORE a trace runs — and greying it out
                when the current result happens to hold no name-matched rows
                just looked broken without explaining anything. When there is
                nothing to hide the switch simply changes nothing. */}
            <button
              type="button"
              className="pt-btn-sm"
              onClick={() => setCodedOnly((v) => !v)}
              title={
                !full
                  ? "أظهر فقط السطور التي تحمل كود المنتج — Show only rows carrying the item code"
                  : byNameCount
                  ? `${byNameCount} سطراً مطابقاً بالاسم فقط — اضغط لإخفائها`
                  : "كل السطور تحمل الكود أصلاً — لا شيء ليُخفى"
              }
              style={{
                ...S.btn(codedOnly ? C.brandDeep : "#fff", codedOnly ? "#fff" : C.body),
                border: `1px solid ${codedOnly ? C.brandDeep : C.line}`,
                padding: "8px 14px",
                boxShadow: "none",
              }}
            >
              {codedOnly ? "☑" : "☐"} بالكود فقط / Coded only
              {full && byNameCount ? ` (${byNameCount})` : ""}
            </button>

            <div>
              <label className="pt-lbl" style={S.label}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setRangeKey("custom"); }}
                style={{ ...S.input, width: 165 }}
              />
            </div>
            <div>
              <label className="pt-lbl" style={S.label}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setRangeKey("custom"); }}
                style={{ ...S.input, width: 165 }}
              />
            </div>
            {full ? (
              <button
                type="button"
                className="pt-btn-sm"
                onClick={() => window.print()}
                style={{ ...S.btn("#0f172a"), padding: "9px 16px" }}
              >
                🖨 Print
              </button>
            ) : null}
            {busy ? (
              <button
                type="button"
                className="pt-btn-sm"
                onClick={() => abortRef.current?.abort()}
                style={{ ...S.btn("#fff", C.body), border: `1px solid ${C.line}`, padding: "9px 16px", boxShadow: "none" }}
              >
                ✕ Cancel
              </button>
            ) : null}
          </div>

          {busy && progress.total > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="pt-meta" style={{ color: C.muted, fontWeight: 700, marginBottom: 5 }}>
                {progress.phase === "arrivals"
                  ? "Reading shipments and receiving logs… / قراءة الشحنات وسجلات الاستلام…"
                  : "Reading distribution and returns… / قراءة التوزيع والمرتجعات…"}{" "}
                {progress.done}/{progress.total}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((progress.done / progress.total) * 100)}%`,
                    background: C.brand,
                    transition: "width .25s ease",
                  }}
                />
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="pt-meta" style={{ marginTop: 12, color: "#b91c1c", fontWeight: 800 }}>⚠️ {error}</div>
          ) : null}
        </form>

        {!shown || !tracedFor ? (
          <div style={{ ...S.card, marginTop: 16, textAlign: "center", color: C.muted, padding: "48px 18px" }}>
            <div className="pt-ico-xl" style={{ marginBottom: 10 }}>🧬</div>
            <div className="pt-sec" style={{ fontWeight: 900, color: C.ink }}>
              Enter an item code to trace the product
            </div>
            <div className="pt-meta" style={{ marginTop: 6 }}>
              أدخل كود المنتج: الشحنة الواردة ← التوزيع على الفروع ← التحويلات ← سجل استلام الفرع ← حالة اللحم اليومية ← المرتجعات.
            </div>
          </div>
        ) : (
          <div
            className={`pt-shell${treeOpen ? "" : " pt-collapsed"}`}
            style={{ marginTop: 16 }}
          >
            {treeOpen ? (
              <LotPicker
                lots={treeLots}
                activeKey={lot?.key}
                onPick={pickLot}
                onClear={clearLot}
                onCollapse={() => setTreeOpen(false)}
                busy={busy}
              />
            ) : (
              <button
                className="no-print pt-tree-rail"
                onClick={() => setTreeOpen(true)}
                title="اعرض شجرة الدفعات / Show the lot picker"
              >
                <span className="pt-ico-sm">🗓</span>
                <span className="pt-tree-rail-txt">
                  Lots · {treeLots.length}
                  {lot ? " · 1 selected" : ""}
                </span>
                <span className="pt-ico-sm">»</span>
              </button>
            )}

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
                  letterSpacing: ".5px",
                }}
                className="pt-code"
              >
                {tracedFor.code || "—"}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="pt-name" style={{ fontWeight: 900, color: C.ink }}>{tracedFor.name || "—"}</div>
                <div className="pt-meta" style={{ color: C.muted, marginTop: 2 }}>
                  {tracedFor.from || tracedFor.to
                    ? `${tracedFor.from ? fmtDMY(tracedFor.from) : "…"} → ${tracedFor.to ? fmtDMY(tracedFor.to) : "…"}`
                    : "All time"}{" "}
                  · {scoped.scanned} reports scanned
                </div>
                {/* What the search FOUND, before any lot filter. Without this an
                    empty step is ambiguous: nothing exists, or the lot filter
                    hid it? */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {[
                    { k: "shipments", label: "shipments", ar: "شحنات", n: scoped.shipments.length },
                    { k: "receiving", label: "receiving", ar: "استلام", n: scoped.receiving.length },
                    { k: "batches", label: "batches", ar: "دفعات", n: scoped.batches.length },
                    { k: "dispatch", label: "final product", ar: "منتج نهائي", n: scoped.dispatch.length },
                    { k: "conditions", label: "condition", ar: "حالة اللحم", n: scoped.conditions.length },
                    { k: "returns", label: "returns", ar: "مرتجعات", n: scoped.returns.length },
                  ].map((f) => {
                    const shownN = shown[f.k].length;
                    const hidden = f.n > 0 && shownN === 0;
                    return (
                      <span
                        key={f.k}
                        className="pt-chip"
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
              {codedOnly ? (
                <span
                  className="pt-chip"
                  style={S.chip(byNameCount ? "#dcfce7" : "#f1f5f9", byNameCount ? "#166534" : C.muted)}
                  title={
                    byNameCount
                      ? "السطور المطابقة بالاسم فقط مخفية"
                      : "لا توجد سطور مطابقة بالاسم — الفلتر لم يخفِ شيئاً"
                  }
                >
                  {byNameCount
                    ? `⌗ coded only · ${byNameCount} by-name hidden`
                    : "⌗ coded only · every row already has a code"}
                </span>
              ) : null}
              {lot ? (
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="pt-chip" style={S.chip("#e0e7ff", C.brandDeep)}>
                    🗓 Lot · Prod {fmtDMY(lot.prodDate) || "—"} · Exp {fmtDMY(lot.expiryDate) || "—"}
                  </span>
                  <button
                    className="no-print pt-btn-sm"
                    onClick={clearLot}
                    title="ارجع لكل الدفعات"
                    style={{ ...S.btn("#f1f5f9", C.body), padding: "4px 10px", boxShadow: "none" }}
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span className="pt-chip" style={S.chip("#f1f5f9", C.body)}>All lots / كل الدفعات</span>
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
                    icon: "🌡",
                    label: "Condition",
                    ar: "حالة اللحم",
                    accent: C.condition,
                    n: branchConditions.length,
                    value: downstream
                      ? conditionIssues.length
                        ? `⚠ ${conditionIssues.length}`
                        : `${branchConditions.length}`
                      : "—",
                  },
                  {
                    id: "step-6",
                    icon: "♻️",
                    label: "Returns",
                    ar: "مرتجعات الفروع + الزبائن",
                    accent: C.returns,
                    n: branchReturns.length + customerReturns.length,
                    value: downstream
                      ? `${branchReturns.length} + ${customerReturns.length}`
                      : "—",
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
                    <span className="pt-chip" style={S.chip(`${C.shipment}1a`, C.shipment)}>
                      manufactured · {num(production.qty)} {production.unit} produced
                    </span>
                  ) : (
                    <span className="pt-chip" style={S.chip(`${C.shipment}1a`, C.shipment)}>
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
                          <div className="pt-lbl" style={{ fontWeight: 800, color: C.muted, textTransform: "uppercase" }}>
                            {x.k}
                          </div>
                          <div className="pt-lbl" style={{ color: C.muted, marginBottom: 5 }}>{x.ar}</div>
                          <div className="pt-kpis" style={{ fontWeight: 900, color: C.ink }}>{x.v}</div>
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
                        }}
                        className="pt-note"
                      >
                        👉 اختر يوم إنتاج من شجرة الدفعات على اليسار لتتبّع دفعة واحدة.
                        <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                          {" "}Pick a production day from the tree to follow a single lot — the totals
                          above cover every run in range.
                        </span>
                      </div>
                    ) : null}
                    <div className="pt-note" style={{ color: C.muted, marginTop: 12, lineHeight: 1.8 }}>
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
                          <span className="pt-meta">
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
                        rows={scoped.shipments}
                        lot={lot}
                        what="shipment"
                        onUseLot={pickLot}
                        onClearLot={clearLot}
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
                    <span className="pt-chip" style={S.chip("#f1f5f9", C.body)}>not read yet</span>
                  ) : (
                    <span className="pt-chip" style={S.chip(`${C.distribution}1a`, C.distribution)}>
                      {kg(dist.ourQty)} to our branches
                    </span>
                  )
                }
              >
                {!downstream ? (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div className="pt-meta" style={{ color: C.muted, marginBottom: 10 }}>
                      لم تُقرأ سجلات التوزيع والمرتجعات بعد.
                    </div>
                    <button
                      className="pt-btn-sm"
                      onClick={() => runDownstream(tracedFor)}
                      disabled={busy}
                      style={{ ...S.btn(C.brandDeep), padding: "9px 18px" }}
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
                              textAlign: "start",
                              border: `1px solid ${active ? C.distribution : C.line}`,
                              background: active ? `${C.distribution}12` : has ? "#fff" : "#f8fafc",
                              borderRadius: 12,
                              padding: "12px 14px",
                              cursor: has ? "pointer" : "default",
                              opacity: has ? 1 : 0.55,
                              font: "inherit",
                            }}
                          >
                            <div className="pt-flowl" style={{ fontWeight: 900, color: C.ink }}>{b.label}</div>
                            <div className="pt-flowa" style={{ color: C.muted }}>{b.labelAr}</div>
                            <div
                              className="pt-kpi"
                              style={{
                                fontWeight: 900,
                                color: has ? C.distribution : C.muted,
                                marginTop: 6,
                              }}
                            >
                              {has ? kg(b.qty) : "—"}
                            </div>
                            <div className="pt-flowa" style={{ color: C.muted, marginTop: 2 }}>
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
                      <span className="pt-ico">🧾</span>
                      <div style={{ minWidth: 150 }}>
                        <div className="pt-flowl" style={{ fontWeight: 900, color: C.ink }}>Customers (total)</div>
                        <div className="pt-flowa" style={{ color: C.muted }}>الزبائن — إجمالي فقط</div>
                      </div>
                      <div className="pt-kpi" style={{ fontWeight: 900, color: C.body }}>
                        {kg(dist.external.qty)}
                      </div>
                      <div className="pt-meta" style={{ color: C.muted }}>
                        {dist.external.count} dispatch line{dist.external.count === 1 ? "" : "s"} ·{" "}
                        {dist.external.customers} customer{dist.external.customers === 1 ? "" : "s"}
                      </div>
                      <div className="pt-flowa" style={{ color: C.muted, marginInlineStart: "auto", textAlign: "end" }}>
                        لا تُدرج الأسماء — التتبّع هنا لفروعنا
                        <br />
                        Names are not listed by design
                      </div>
                    </div>

                    {/* One honest total for the whole lot */}
                    <div className="pt-note" style={{ color: C.muted, marginTop: 10 }}>
                      Dispatched in total: <b style={{ color: C.ink }}>{kg(dist.ourQty + dist.external.qty)}</b> —{" "}
                      {kg(dist.ourQty)} to our branches, {kg(dist.external.qty)} to customers.
                    </div>

                    {/* The same Final-Product gap warning also belongs to
                        step ③, where the transfer rows actually live — showing
                        it in both places just says the same thing twice. */}
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
                        className="no-print pt-btn-sm"
                        onClick={() => setBranchId("")}
                        style={{ ...S.btn("#f1f5f9", C.body), padding: "5px 12px", boxShadow: "none" }}
                      >
                        ✕ all branches
                      </button>
                    ) : null}
                    <span className="pt-chip" style={S.chip(`${C.distribution}1a`, C.distribution)}>
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
                        rows={scoped.dispatch}
                        lot={lot}
                        what="Final Product"
                        onUseLot={pickLot}
                        onClearLot={clearLot}
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
                        className="pt-chip"
                        style={S.chip("#f1f5f9", C.body)}
                        title="مقارنة: المرسل مقابل المسجَّل في الفرع"
                      >
                        sent {kg(transferredQty)} → logged {kg(receivedQty)}
                      </span>
                    ) : null}
                    <span className="pt-chip" style={S.chip(`${C.receiving}1a`, C.receiving)}>
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
                        rows={scoped.receiving}
                        lot={lot}
                        what="branch receiving"
                        onUseLot={pickLot}
                        onClearLot={clearLot}
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

              {/* ── ⑤ What the daily register says about its CONDITION ── */}
              <Step
                id="step-5"
                n="5"
                icon="🌡"
                title={selectedBranch ? `Daily condition — ${selectedBranch.label}` : "Daily meat condition"}
                titleAr={
                  selectedBranch ? `حالة اللحم اليومية — ${selectedBranch.labelAr}` : "حالة اللحم اليومية"
                }
                accent={C.condition}
                chip={
                  !downstream ? (
                    <span className="pt-chip" style={S.chip("#f1f5f9", C.body)}>not read yet</span>
                  ) : (
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {conditionIssues.length ? (
                        <span className="pt-chip" style={S.chip("#fee2e2", "#991b1b")}>
                          ⚠ {conditionIssues.length} flagged · ملاحظات
                        </span>
                      ) : null}
                      <span className="pt-chip" style={S.chip(`${C.condition}1a`, C.condition)}>
                        {branchConditions.length} record{branchConditions.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  )
                }
              >
                {!downstream ? (
                  <Empty text="لم يُقرأ سجل الحالة اليومية بعد. / The daily condition register has not been read yet." />
                ) : branchConditions.length === 0 ? (
                  <>
                    <Empty
                      text={
                        branchId
                          ? "لا ملاحظات حالة من هذا الفرع لهذه الدفعة. / No condition line from this branch for this lot."
                          : "لا توجد ملاحظات حالة لهذه الدفعة. / No daily condition record for this lot."
                      }
                    />
                    {lot && !branchId ? (
                      <LotGap
                        rows={scoped.conditions}
                        lot={lot}
                        what="condition"
                        onUseLot={pickLot}
                        onClearLot={clearLot}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                  {unattributedConditions ? (
                    <div
                      className="pt-note"
                      style={{
                        border: "1px solid #fcd34d",
                        background: "#fffbeb",
                        borderRadius: 10,
                        padding: "9px 12px",
                        color: "#78350f",
                        marginBottom: 10,
                        fontWeight: 700,
                      }}
                    >
                      ⚠️ {unattributedConditions} سطر حالة بلا فرع مكتوب في الملاحظات — مخفي الآن بسبب
                      ترشيح الفرع.{" "}
                      <span style={{ fontWeight: 600 }}>
                        {unattributedConditions} condition line
                        {unattributedConditions === 1 ? "" : "s"} carry no POS in their remarks, so the
                        branch filter hides them.
                      </span>
                    </div>
                  ) : null}
                  <Table min={900} head={["Date", "Branch", "Product", "Status", "Qty", "Unit", "Expiry", "Photos", "Remarks"]}>
                    {branchConditions.map((c) => {
                      const bad = isConditionIssue(c.status);
                      return (
                        <tr key={c.id}>
                          <td style={S.td}>{fmtDMY(c.date)}<ViaBadge via={c.via} /></td>
                          <td style={{ ...S.td, fontWeight: 800, color: C.condition }}>{c.branch || "—"}</td>
                          <td style={S.td}>
                            {c.matchedCode ? <b style={{ color: C.brandDeep }}>{c.matchedCode} · </b> : null}
                            {c.matchedName || "—"}
                          </td>
                          <td style={S.td}>
                            <span
                              className="pt-chip"
                              style={S.chip(bad ? "#fee2e2" : "#dcfce7", bad ? "#991b1b" : "#166534")}
                            >
                              {c.status || "—"}
                            </span>
                          </td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{num(c.qty)}</td>
                          <td style={S.td}>{c.qtyType || "—"}</td>
                          <td style={S.td}>{fmtDMY(c.expiryDate) || c.expiryRaw || "—"}</td>
                          <td style={S.td}>{c.images ? `📷 ${c.images}` : "—"}</td>
                          <td style={S.td}>{c.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </Table>
                  </>
                )}
              </Step>

              {/* ── ⑥ Returns — two channels ── */}
              <Step
                id="step-6"
                n="6"
                icon="♻️"
                title="Returns — our branches & customers"
                titleAr="المرتجعات — الفروع والزبائن"
                accent={C.returns}
                chip={
                  !downstream ? (
                    <span className="pt-chip" style={S.chip("#f1f5f9", C.body)}>not read yet</span>
                  ) : (
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="pt-chip" style={S.chip(`${C.returns}1a`, C.returns)}>
                        🏬 {branchReturns.length} branch
                        {returnedQty ? ` · ${num(returnedQty)}` : ""}
                      </span>
                      <span className="pt-chip" style={S.chip("#fce7f3", "#9d174d")}>
                        🧾 {customerReturns.length} customer
                        {customerReturnedQty ? ` · ${num(customerReturnedQty)}` : ""}
                      </span>
                    </span>
                  )
                }
              >
                {!downstream ? (
                  <Empty text="لم تُقرأ المرتجعات بعد. / Returns have not been read yet." />
                ) : (
                  <>
                    <ReturnTrack
                      title="From our branches"
                      titleAr="مرتجعات الفروع"
                      icon="🏬"
                      accent={C.returns}
                      rows={branchReturns}
                      empty={
                        branchId
                          ? "لا مرتجعات من هذا الفرع لهذه الدفعة. / No returns from this branch for this lot."
                          : "لا مرتجعات من فروعنا لهذه الدفعة. / No branch returns for this lot."
                      }
                    />

                    <ReturnTrack
                      title="From customers"
                      titleAr="مرتجعات الزبائن"
                      icon="🧾"
                      accent="#9d174d"
                      customer
                      rows={customerReturns}
                      note={
                        branchId
                          ? "مرتجع الزبون لا يخصّ فرعاً بعينه، فهو يظهر كاملاً حتى مع اختيار فرع. / A customer return belongs to no branch, so it is shown in full even while a branch is selected."
                          : ""
                      }
                      empty="لم يُرجع أي زبون هذه الدفعة. / No customer returned this lot."
                    />

                    {branchReturns.length === 0 && customerReturns.length === 0 && lot && !branchId ? (
                      <LotGap
                        rows={scoped.returns}
                        lot={lot}
                        what="return"
                        onUseLot={pickLot}
                        onClearLot={clearLot}
                      />
                    ) : null}
                  </>
                )}
              </Step>

              {/* ── Optional: the manufacturing batches ── */}
              {downstream && shown.batches.length > 0 ? (
                <Step
                  n="+"
                  icon="🔄"
                  title="In-branch traceability (batches)"
                  titleAr="تقرير التتبّع داخل الفرع — دفعات التصنيع"
                  accent={C.batch}
                  chip={
                    <span className="pt-chip" style={S.chip(`${C.batch}1a`, C.batch)}>
                      {batchGroups.length} batch{batchGroups.length === 1 ? "" : "es"} ·{" "}
                      {shown.batches.length} line{shown.batches.length === 1 ? "" : "s"}
                    </span>
                  }
                >
                  <BatchGroups groups={batchGroups} />
                </Step>
              ) : null}
            </div>

            <p className="pt-note" style={{ color: C.muted, marginTop: 16, lineHeight: 1.7 }}>
              {codedOnly && byNameCount ? (
                <>
                  <b>بالكود فقط:</b> معروض هنا ما يحمل كود المنتج فعلاً — و{byNameCount} سطراً مطابقاً
                  بالاسم مخفي.
                  <br />
                  <b>Coded only:</b> showing rows that carry the item code themselves; {byNameCount}{" "}
                  name-matched row{byNameCount === 1 ? " is" : "s are"} hidden.
                </>
              ) : codedOnly ? (
                <>
                  <b>بالكود فقط:</b> كل السطور تحمل الكود أصلاً، فلم يُخفَ شيء.
                  <br />
                  <b>Coded only:</b> every matched row already carries the item code, so nothing was
                  hidden.
                </>
              ) : (
                <>
                  Records saved before item codes were introduced carry no code of their own; they are
                  matched through the catalog on the product name and are marked <b>by name</b>.
                  <br />
                  السجلات القديمة (قبل إضافة الكود) تُطابَق عبر اسم المنتج من الكتالوج وتُعلَّم بـ{" "}
                  <b>by name</b>.
                </>
              )}
            </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
