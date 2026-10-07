// src/pages/Destruction/DisposalLog/MonthlyReconciliation.jsx
//
// مطابقة الشهر كاملاً — the first lens on the compare page.
//
// Everything Odoo destroyed in the month against everything our registers
// destroyed in the same month, per product, per branch, or per branch ×
// product, whatever day either side wrote it on. The day lags that fill the
// day-by-day table disappear here, so what is left is a real difference;
// "Differences only" then strips the month down to exactly those lines, and
// each one opens straight into its days.
//
// Pure view: the engine is `buildMonthlyComparison` and every write (review
// notes, exclusions) goes through the parent's handlers.

import React, { useMemo, useState } from "react";
import { DAY_STATUS, DAY_STATUS_META, NO_BRANCH_LABEL, SOURCE_META, fmt3, formatDMY, monthLabel, num } from "./disposalLogOptions";
import { EmptyState, Pill, SearchInput, Segmented, Toggle, downloadSheets, useCopy, useLocalPref } from "./disposalLogKit";
import CommentThread, { commentCount } from "./CommentThread";

const STATUS_TONE = {
  [DAY_STATUS.MATCH]: "green",
  [DAY_STATUS.QTY_DIFF]: "amber",
  [DAY_STATUS.ODOO_ONLY]: "red",
  [DAY_STATUS.RETURNS_ONLY]: "blue",
};
const STATUS_ORDER = {
  [DAY_STATUS.ODOO_ONLY]: 0,
  [DAY_STATUS.QTY_DIFF]: 1,
  [DAY_STATUS.RETURNS_ONLY]: 2,
  [DAY_STATUS.MATCH]: 3,
};

const signed = (n) => `${n > 0 ? "+" : ""}${fmt3(n)}`;
const pctText = (p) => (p == null ? "new" : `${p > 0 ? "+" : ""}${Math.round(p * 10) / 10}%`);
const dayList = (days) => (days.length ? days.map((d) => d.slice(8)).join(", ") : "—");
const diffClass = (d) => (d > 0 ? "pos" : d < 0 ? "neg" : "");

const BY_OPTIONS = [
  { value: "product", label: "By product — لكل صنف" },
  { value: "branch", label: "By branch — لكل فرع" },
  { value: "branchProduct", label: "Branch × product — فرع × صنف" },
];

const SORTS = {
  gap: { label: "Biggest gap first", fn: (a, b) => b.absDiff - a.absDiff },
  pct: {
    label: "Biggest % gap first",
    fn: (a, b) => Math.abs(b.diffPct ?? Infinity) - Math.abs(a.diffPct ?? Infinity) || b.absDiff - a.absDiff,
  },
  status: { label: "Status, then gap", fn: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.absDiff - a.absDiff },
  odoo: { label: "Largest Odoo quantity", fn: (a, b) => num(b.odooQty) - num(a.odooQty) },
  name: {
    label: "Name A → Z",
    fn: (a, b) => String(a.branchLabel && !a.product ? a.branchLabel : a.product || a.code).localeCompare(
      String(b.branchLabel && !b.product ? b.branchLabel : b.product || b.code)
    ),
  },
};

/* A thin bar inside a cell — share of the gap, or a match rate. */
function MiniBar({ value, tone = "#f59e0b", title }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 110 }}>
      <span style={{ flex: 1, height: 8, borderRadius: 999, background: "#eef2f7", overflow: "hidden", minWidth: 60 }}>
        <span style={{ display: "block", height: "100%", width: `${w}%`, background: tone }} />
      </span>
      <span className="dlx-muted" style={{ margin: 0 }}>{Math.round(w)}%</span>
    </span>
  );
}

export default function MonthlyReconciliation({
  month,
  period,
  tolPct,
  onTolPct,
  reviewed,
  onToggleReviewed,
  onExclude,
  onOpenDays,
  comments = {},
  onAddComment,
  onDeleteComment,
}) {
  const [by, setBy] = useLocalPref("disposalLog.cmp.monthBy", "product");
  const [diffOnly, setDiffOnly] = useLocalPref("disposalLog.cmp.monthDiffOnly", false);
  const [sortKey, setSortKey] = useLocalPref("disposalLog.cmp.monthSort", "gap");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [copied, copy] = useCopy();

  const reviewKey = (r) => `M|${period}|${by}|${r.key}`;

  const all = useMemo(
    () => (by === "branch" ? month.branches : by === "branchProduct" ? month.branchProducts : month.products),
    [by, month]
  );
  const counts = month.totals[by] || { rows: 0, match: 0, qtyDiff: 0, odooOnly: 0, returnsOnly: 0, matchRate: 0 };

  const branchOptions = useMemo(
    () => Array.from(new Set(month.branchProducts.map((r) => r.branchLabel))).sort(),
    [month.branchProducts]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter((r) => {
      if (diffOnly && r.status === DAY_STATUS.MATCH && !r.hiddenSplit) return false;
      if (statusFilter === "split") {
        if (!r.hiddenSplit) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (unreviewedOnly && (r.status === DAY_STATUS.MATCH || reviewed[`M|${period}|${by}|${r.key}`])) return false;
      if (branchFilter !== "all" && !r.branches.includes(branchFilter)) return false;
      if (!q) return true;
      const hay = by === "branch"
        ? `${r.branchLabel} ${r.children.map((c) => `${c.code} ${c.product}`).join(" ")}`
        : `${r.code} ${r.product} ${r.category} ${r.branches.join(" ")} ${r.customers.join(" ")}`;
      return hay.toLowerCase().includes(q);
    });
    return list.sort(SORTS[sortKey]?.fn || SORTS.gap.fn);
  }, [all, by, diffOnly, statusFilter, unreviewedOnly, branchFilter, query, sortKey, reviewed, period]);

  /* Totals per unit family for what is on screen, and the Pareto reading of
     the gap: how few lines carry most of it. Kilos and plates never share a
     denominator. */
  const famTotals = useMemo(() => {
    const m = new Map();
    const lines = by === "branch" ? rows.flatMap((b) => b.byFam.map((f) => ({ fam: f.fam, odooQty: f.odoo, mineQty: f.mine }))) : rows;
    for (const r of lines) {
      const g = m.get(r.fam) || { fam: r.fam, lines: 0, odoo: 0, mine: 0, gap: 0 };
      g.lines += 1;
      g.odoo += r.odooQty;
      g.mine += r.mineQty;
      g.gap += Math.abs(r.mineQty - r.odooQty);
      m.set(r.fam, g);
    }
    return Array.from(m.values())
      .map((g) => ({ ...g, diff: g.mine - g.odoo }))
      .sort((a, b) => String(a.fam).localeCompare(String(b.fam)));
  }, [rows, by]);

  const gapByFam = useMemo(() => new Map(famTotals.map((f) => [f.fam, f.gap])), [famTotals]);

  const pareto = useMemo(() => {
    if (by === "branch") return [];
    return famTotals
      .filter((f) => f.gap > 0)
      .map((f) => {
        const list = rows.filter((r) => r.fam === f.fam && r.absDiff > 0).sort((a, b) => b.absDiff - a.absDiff);
        let acc = 0;
        let n = 0;
        for (const r of list) {
          acc += r.absDiff;
          n += 1;
          if (acc >= f.gap * 0.8) break;
        }
        return { fam: f.fam, n, of: list.length, top: list.slice(0, 3) };
      });
  }, [famTotals, rows, by]);

  const anyFilter = query || statusFilter !== "all" || branchFilter !== "all" || unreviewedOnly || diffOnly;
  const clearFilters = () => {
    setQuery(""); setStatusFilter("all"); setBranchFilter("all"); setUnreviewedOnly(false); setDiffOnly(false);
  };

  const toggle = (k) => setExpanded((m) => ({ ...m, [k]: !m[k] }));

  /* ── export / copy what is on screen ── */
  const exportView = async () => {
    const title = BY_OPTIONS.find((o) => o.value === by)?.label.split(" — ")[0] || by;
    let aoa;
    if (by === "branch") {
      aoa = [
        ["BRANCH", "PRODUCTS", "MATCHED", "QTY DIFF", "ONLY ODOO", "ONLY OURS", "MATCH %", "UNIT FAMILY", "ODOO", "OURS", "DIFFERENCE", "STATUS"],
        ...rows.flatMap((b) => b.byFam.map((f, i) => [
          i ? "" : b.branchLabel, i ? "" : b.products, i ? "" : b.match, i ? "" : b.qtyDiff, i ? "" : b.odooOnly,
          i ? "" : b.returnsOnly, i ? "" : b.matchRate, f.fam, num(f.odoo), num(f.mine), num(f.diff),
          i ? "" : DAY_STATUS_META[b.status].label,
        ])),
      ];
    } else {
      aoa = [
        [
          ...(by === "branchProduct" ? ["BRANCH"] : ["BRANCHES"]), "CODE", "PRODUCT", "CATEGORY", "UNIT", "ODOO QTY", "OUR QTY",
          "DIFFERENCE", "DIFFERENCE %", "ODOO DAYS", "OUR DAYS", "REGISTER", "STATUS", "REVIEW NOTE",
        ],
        ...rows.map((r) => [
          r.branches.join(", "), r.code, r.product, r.category, r.units.join("/"), num(r.odooQty), num(r.mineQty),
          num(r.diff), r.diffPct == null ? "" : Math.round(r.diffPct * 10) / 10, r.odooDays.length, r.mineDays.length,
          r.sources.map((k) => SOURCE_META[k].label).join(" + "),
          `${DAY_STATUS_META[r.status].label}${r.hiddenSplit ? " (branches differ)" : ""}`,
          reviewed[reviewKey(r)]?.note || (reviewed[reviewKey(r)] ? "reviewed" : ""),
        ]),
      ];
    }
    await downloadSheets(
      [{ name: `Month ${title}`, aoa: [[`Odoo disposal ⇄ our registers — ${monthLabel(period)} — ${title}`], [], ...aoa] }],
      `disposal-month-${by}-${period || "month"}.xlsx`
    );
  };

  const copyDiffs = () => {
    const list = rows.filter((r) => r.status !== DAY_STATUS.MATCH || r.hiddenSplit);
    const lines = list.map((r) =>
      by === "branch"
        ? `${r.branchLabel}: ${r.issues} of ${r.products} product(s) differ — ${r.byFam.map((f) => `${f.fam} ${fmt3(f.odoo)} → ${fmt3(f.mine)} (${signed(f.diff)})`).join(", ")}`
        : `${by === "branchProduct" ? `${r.branchLabel} · ` : ""}${r.code || "—"} ${r.product}: Odoo ${fmt3(r.odooQty)} · ours ${fmt3(r.mineQty)} · ${signed(r.diff)} ${r.units.join("/")} — ${DAY_STATUS_META[r.status].label}`
    );
    copy([`Disposal month differences — ${monthLabel(period)} (${list.length})`, ...lines].join("\n"), "month");
  };

  const reviewBtn = (r, label) =>
    r.status !== DAY_STATUS.MATCH || r.hiddenSplit ? (
      <button
        className={reviewed[reviewKey(r)] ? "dlx-undo" : "dlx-iconBtn"}
        title={
          reviewed[reviewKey(r)]
            ? `Reviewed${reviewed[reviewKey(r)].by ? ` by ${reviewed[reviewKey(r)].by}` : ""}${reviewed[reviewKey(r)].note ? `: ${reviewed[reviewKey(r)].note}` : ""} — click to reopen`
            : "Mark this month difference as reviewed, with a reason"
        }
        onClick={() => onToggleReviewed(reviewKey(r), label)}
      >
        {reviewed[reviewKey(r)] ? "✓" : "☐"}
      </button>
    ) : null;

  /* Comments share the review key: one month line, one thread. */
  const commentBadge = (r) => {
    const n = commentCount(comments, reviewKey(r));
    return n > 0 ? (
      <Pill tone="teal" title="Open the line to read the comments" onClick={() => setExpanded((m) => ({ ...m, [r.key]: true }))}>
        💬 {n}
      </Pill>
    ) : null;
  };
  const thread = (r, label) =>
    onAddComment ? (
      <div style={{ marginTop: 8 }}>
        <CommentThread
          title={`Comments on ${label}`}
          list={comments[reviewKey(r)]}
          onAdd={(text, images) => onAddComment(reviewKey(r), text, { images, code: r.code || "", product: r.product || r.branchLabel || "" })}
          onDelete={(id) => onDeleteComment(reviewKey(r), id)}
        />
      </div>
    ) : null;

  const statusCell = (r) => (
    <td>
      <Pill tone={STATUS_TONE[r.status]}>{DAY_STATUS_META[r.status].icon} {DAY_STATUS_META[r.status].label}</Pill>
      {r.hiddenSplit && (
        <Pill tone="violet" title="The month totals agree, but the branches inside it do not — one site's surplus hides another's shortfall">
          ⇄ branches differ
        </Pill>
      )}
      {reviewed[reviewKey(r)] && <Pill tone="green" title={reviewed[reviewKey(r)].note || "Reviewed"}>✓ reviewed</Pill>}
    </td>
  );

  const chips = [
    { k: "all", label: "All", n: counts.rows, tone: "slate" },
    { k: DAY_STATUS.MATCH, label: DAY_STATUS_META[DAY_STATUS.MATCH].label, n: counts.match, tone: "green" },
    { k: DAY_STATUS.QTY_DIFF, label: DAY_STATUS_META[DAY_STATUS.QTY_DIFF].label, n: counts.qtyDiff, tone: "amber" },
    { k: DAY_STATUS.ODOO_ONLY, label: DAY_STATUS_META[DAY_STATUS.ODOO_ONLY].label, n: counts.odooOnly, tone: "red" },
    { k: DAY_STATUS.RETURNS_ONLY, label: "Only in ours", n: counts.returnsOnly, tone: "blue" },
    ...(by === "product" && month.totals.hiddenSplit
      ? [{ k: "split", label: "Month matches, branches differ", n: month.totals.hiddenSplit, tone: "violet" }]
      : []),
  ];

  const productCols = 14;

  return (
    <>
      {/* ── the month verdict ── */}
      <div className="dlx-kpis" style={{ marginBottom: 10 }}>
        {[
          { by: "product", label: "Products reconciled", ar: "أصناف مطابقة للشهر" },
          { by: "branch", label: "Branches reconciled", ar: "فروع مطابقة بالكامل" },
          { by: "branchProduct", label: "Branch × product", ar: "فرع × صنف مطابق" },
        ].map((k) => {
          const c = month.totals[k.by];
          return (
            <button
              key={k.by}
              type="button"
              onClick={() => setBy(k.by)}
              className={`dlx-kpi dlx-tone-${c.matchRate >= 80 ? "green" : c.matchRate >= 60 ? "amber" : "red"}`}
              style={{ textAlign: "left", cursor: "pointer", outline: by === k.by ? "2px solid #0e7490" : "none", fontFamily: "inherit" }}
              title="Show this breakdown"
            >
              <div className="dlx-kpiLbl">{k.label}</div>
              <div className="dlx-kpiVal">{c.matchRate}%</div>
              <div className="dlx-kpiSub">{c.match} of {c.rows} · {c.rows - c.match} differ</div>
              <div className="dlx-kpiAr" dir="rtl">{k.ar}</div>
            </button>
          );
        })}
      </div>

      <div className="dlx-tools">
        <Segmented value={by} onChange={(v) => { setBy(v); setExpanded({}); setStatusFilter("all"); }} options={BY_OPTIONS} />
        <Toggle
          checked={diffOnly}
          onChange={setDiffOnly}
          label={`Differences only — المختلف فقط (${counts.rows - counts.match})`}
          title="Hide everything that reconciles over the month"
        />
      </div>

      <div className="dlx-tools">
        <div className="dlx-legend" style={{ margin: 0 }}>
          {chips.map((c) => (
            <Pill
              key={c.k}
              tone={statusFilter === c.k ? c.tone : "slate"}
              onClick={() => setStatusFilter(statusFilter === c.k && c.k !== "all" ? "all" : c.k)}
              title={`Show ${c.label.toLowerCase()}`}
            >
              {statusFilter === c.k ? "● " : ""}{c.label} · {c.n}
            </Pill>
          ))}
        </div>
      </div>

      <div className="dlx-tools">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={by === "branch" ? "Branch, or a product inside it…" : "Product code, name, branch…"}
        />
        {by !== "branch" && (
          <select className="dlx-iconBtn" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">All branches</option>
            {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <select className="dlx-iconBtn" value={sortKey} onChange={(e) => setSortKey(e.target.value)} title="Sort">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>↕ {s.label}</option>)}
        </select>
        <select
          className="dlx-iconBtn"
          value={tolPct}
          onChange={(e) => onTolPct(Number(e.target.value))}
          title="A month difference smaller than this share of the quantity counts as matched"
        >
          <option value={0}>% tolerance: off</option>
          <option value={1}>± 1%</option>
          <option value={2}>± 2%</option>
          <option value={5}>± 5%</option>
          <option value={10}>± 10%</option>
        </select>
        <Toggle checked={unreviewedOnly} onChange={setUnreviewedOnly} label="Open issues only" title="Hide matched lines and anything already reviewed" />
        {anyFilter && <button className="dlx-btn dlx-soft" onClick={clearFilters}>✕ Clear filters</button>}
        <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: 8 }}>
          <button className="dlx-btn dlx-soft" onClick={exportView} disabled={!rows.length}>⬇ Excel (this view)</button>
          <button className="dlx-btn dlx-soft" onClick={copyDiffs} disabled={!rows.length} title="Copy the differences as text, ready for e-mail or WhatsApp">
            {copied === "month" ? "✓ Copied" : "⧉ Copy differences"}
          </button>
        </span>
      </div>

      {pareto.length > 0 && (
        <div className="dlx-note dlx-noteWarn" style={{ marginTop: 0, marginBottom: 10 }}>
          {pareto.map((p) => (
            <div key={p.fam}>
              {p.fam}: <b>{p.n}</b> of {p.of} line(s) carry 80% of the gap
              {p.top.length ? ` — ${p.top.map((r) => `${r.code || ""} ${r.product}${by === "branchProduct" ? ` @ ${r.branchLabel}` : ""} (${signed(r.diff)})`).join(" · ")}` : ""}
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={all.length ? "✅" : "⚖️"}
          title={all.length ? (diffOnly ? "Nothing differs — the whole month reconciles" : "Nothing matches these filters") : "Nothing to compare yet"}
          hint={all.length ? "Clear a filter to see every line." : "Import an Odoo month first."}
        />
      ) : by === "branch" ? (
        <div className="dlx-tableWrap">
          <table className="dlx-table">
            <thead>
              <tr>
                <th /><th>BRANCH</th><th className="num">PRODUCTS</th><th className="num">MATCHED</th>
                <th className="num">QTY DIFF</th><th className="num">ONLY ODOO</th><th className="num">ONLY OURS</th>
                <th>MATCH %</th><th>ODOO → OURS (per unit)</th><th>STATUS</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const open = !!expanded[b.key];
                const kids = diffOnly ? b.children.filter((c) => c.status !== DAY_STATUS.MATCH) : b.children;
                return (
                  <React.Fragment key={b.key}>
                    <tr className={open ? "open" : ""}>
                      <td><button className="dlx-rowBtn" onClick={() => toggle(b.key)} title="Show this branch's products">{open ? "▾" : "▸"}</button></td>
                      <td>
                        <Pill tone="teal">{b.branchLabel}</Pill>
                        {commentBadge(b)}
                      </td>
                      <td className="num">{b.products}</td>
                      <td className="num">{b.match}</td>
                      <td className="num">{b.qtyDiff || ""}</td>
                      <td className={`num ${b.odooOnly ? "neg" : ""}`}>{b.odooOnly || ""}</td>
                      <td className="num">{b.returnsOnly || ""}</td>
                      <td>
                        <MiniBar value={b.matchRate} tone={b.matchRate >= 80 ? "#10b981" : b.matchRate >= 60 ? "#f59e0b" : "#ef4444"} title={`${b.match} of ${b.products} products reconcile`} />
                      </td>
                      <td className="wrap">
                        {b.byFam.map((f) => (
                          <Pill key={f.fam} tone={Math.abs(f.diff) < 0.005 ? "green" : "amber"}>
                            {f.fam}: {fmt3(f.odoo)} → {fmt3(f.mine)} ({signed(f.diff)})
                          </Pill>
                        ))}
                      </td>
                      {statusCell(b)}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {reviewBtn(b, `${b.branchLabel} for ${monthLabel(period)}`)}
                        <button className="dlx-iconBtn" title="Open this branch in the day-by-day table" onClick={() => onOpenDays({ branch: b.branchLabel })}>📅</button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="dlx-sub">
                        <td colSpan={11}>
                          <table className="dlx-subTable">
                            <thead>
                              <tr><th>Code</th><th>Product</th><th>Unit</th><th className="num">Odoo</th><th className="num">Ours</th><th className="num">Difference</th><th>Days (Odoo / ours)</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                              {kids.length === 0 ? (
                                <tr><td colSpan={9}>Every product of this branch reconciles.</td></tr>
                              ) : kids.map((c) => (
                                <tr key={c.key}>
                                  <td className="mono">{c.code || "—"}</td>
                                  <td>{c.product}</td>
                                  <td>{c.units.join(" / ")}{c.unitMismatch ? " ≠" : ""}</td>
                                  <td className="num">{fmt3(c.odooQty)}</td>
                                  <td className="num">{fmt3(c.mineQty)}</td>
                                  <td className="num">{signed(c.diff)}</td>
                                  <td>{dayList(c.odooDays)} / {dayList(c.mineDays)}</td>
                                  <td>{DAY_STATUS_META[c.status].icon} {DAY_STATUS_META[c.status].label}</td>
                                  <td>
                                    <button className="dlx-iconBtn" title="Open these days" onClick={() => onOpenDays({ branch: b.branchLabel, query: c.code || c.product })}>📅</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {thread(b, `${b.branchLabel} — ${monthLabel(period)}`)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              {famTotals.map((f) => (
                <tr key={f.fam}>
                  <td colSpan={8}>Total {f.fam}</td>
                  <td colSpan={3}>
                    {fmt3(f.odoo)} → {fmt3(f.mine)} ({signed(f.diff)})
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="dlx-tableWrap">
          <table className="dlx-table">
            <thead>
              <tr>
                <th />
                <th>{by === "branchProduct" ? "BRANCH" : "BRANCHES"}</th>
                <th>CODE</th>
                <th>PRODUCT</th>
                <th>UNIT</th>
                <th className="num">ODOO</th>
                <th className="num">OURS</th>
                <th className="num">DIFFERENCE</th>
                <th className="num">DIFF %</th>
                <th>SHARE OF GAP</th>
                <th className="num" title="Days the product appears on each side">DAYS O / U</th>
                <th>REGISTER</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = !!expanded[r.key];
                const famGap = gapByFam.get(r.fam) || 0;
                const label = `${r.code || r.product}${by === "branchProduct" ? ` at ${r.branchLabel}` : ""} for ${monthLabel(period)}`;
                return (
                  <React.Fragment key={r.key}>
                    <tr className={open ? "open" : ""}>
                      <td><button className="dlx-rowBtn" onClick={() => toggle(r.key)} title="Split by branch and day">{open ? "▾" : "▸"}</button></td>
                      <td className="wrap">
                        {r.branches.slice(0, 3).map((b) => (
                          <Pill key={b} tone={b === NO_BRANCH_LABEL ? "violet" : "teal"}>{b}</Pill>
                        ))}
                        {r.branches.length > 3 && <Pill tone="slate" title={r.branches.join(", ")}>+{r.branches.length - 3}</Pill>}
                      </td>
                      <td className="mono">{r.code || "—"}</td>
                      <td className="wrap">
                        {r.product}
                        {commentBadge(r)}
                      </td>
                      <td>
                        {r.units.join(" / ") || r.fam}
                        {r.unitMismatch && <Pill tone="violet" title="Odoo and our registers use different unit names">≠ unit</Pill>}
                      </td>
                      <td className="num">{fmt3(r.odooQty)}</td>
                      <td className="num">{fmt3(r.mineQty)}</td>
                      <td className={`num ${diffClass(r.diff)}`}>{signed(r.diff)}</td>
                      <td className={`num ${diffClass(r.diff)}`}>{r.status === DAY_STATUS.MATCH ? "" : pctText(r.diffPct)}</td>
                      <td>{r.absDiff > 0 && famGap > 0 ? <MiniBar value={(r.absDiff / famGap) * 100} title={`Share of the visible ${r.fam} gap`} /> : ""}</td>
                      <td className="num">{r.odooDays.length} / {r.mineDays.length}</td>
                      <td>
                        {r.sources.length
                          ? r.sources.map((k) => <Pill key={k} tone={SOURCE_META[k].tone} title={SOURCE_META[k].label}>{SOURCE_META[k].mark}</Pill>)
                          : <span className="dlx-muted">—</span>}
                      </td>
                      {statusCell(r)}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {reviewBtn(r, label)}
                        <button
                          className="dlx-iconBtn"
                          title="Open this product in the day-by-day table"
                          onClick={() => onOpenDays({ query: r.code || r.product, branch: by === "branchProduct" && r.branchLabel !== NO_BRANCH_LABEL ? r.branchLabel : "" })}
                        >
                          📅
                        </button>
                        <button className="dlx-del" title={`Leave ${r.code || r.product} out of the comparison`} onClick={() => onExclude(r)}>⊘</button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="dlx-sub">
                        <td colSpan={productCols}>
                          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
                            {by === "product" && (
                              <div>
                                <strong style={{ fontSize: 12 }}>Per branch — {r.children.length}</strong>
                                <table className="dlx-subTable">
                                  <thead>
                                    <tr><th>Branch</th><th className="num">Odoo</th><th className="num">Ours</th><th className="num">Difference</th><th>Status</th></tr>
                                  </thead>
                                  <tbody>
                                    {r.children.map((c) => (
                                      <tr key={c.key}>
                                        <td>{c.branchLabel}</td>
                                        <td className="num">{fmt3(c.odooQty)}</td>
                                        <td className="num">{fmt3(c.mineQty)}</td>
                                        <td className="num">{signed(c.diff)}</td>
                                        <td>{DAY_STATUS_META[c.status].icon} {DAY_STATUS_META[c.status].label}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div>
                              <strong style={{ fontSize: 12 }}>Days in the month</strong>
                              <table className="dlx-subTable">
                                <tbody>
                                  <tr><th>Odoo ({r.odooLines} line(s))</th><td>{r.odooDays.map(formatDMY).join(" · ") || "—"}</td></tr>
                                  <tr><th>Ours ({r.mineLines} line(s))</th><td>{r.mineDays.map(formatDMY).join(" · ") || "—"}</td></tr>
                                  {r.customers.length > 0 && <tr><th>Customers</th><td>{r.customers.join(" · ")}</td></tr>}
                                  {r.category && <tr><th>Category</th><td>{r.category}</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          {thread(r, `${r.code || r.product}${by === "branchProduct" ? ` @ ${r.branchLabel}` : ""} — ${monthLabel(period)}`)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              {famTotals.map((f) => (
                <tr key={f.fam}>
                  <td colSpan={5}>Total {f.fam} — {f.lines} line(s)</td>
                  <td className="num">{fmt3(f.odoo)}</td>
                  <td className="num">{fmt3(f.mine)}</td>
                  <td className={`num ${diffClass(f.diff)}`}>{signed(f.diff)}</td>
                  <td className="num">{f.odoo ? pctText((f.diff / f.odoo) * 100) : ""}</td>
                  <td colSpan={5} />
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
