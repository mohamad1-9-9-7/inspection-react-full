// src/pages/Destruction/DisposalLog/ProductStory.jsx
//
// قصة المنتج — the month of one product, told in order.
//
// A product line in the "Products by day" table says Odoo 12, ours 9, −3. The
// question that follows is always the same: where did the 3 go? This panel
// answers it from the same day rows the page already holds: a few sentences
// that read the month out loud (who posted what, on which days, where the gap
// opened and whether it closed again), then the day-by-day timeline with a
// running balance, every Odoo voucher and every line of ours behind it.
//
// Read-only. Clicking a date opens that day in the Days view.

import React, { useMemo } from "react";
import { DAY_STATUS, DAY_STATUS_META, SOURCE_META, fmt3, formatDMY } from "./disposalLogOptions";
import { Pill } from "./disposalLogKit";

const signed = (n) => `${n > 0 ? "+" : ""}${fmt3(n)}`;
const short = (iso) => formatDMY(iso).slice(0, 5);
const listDays = (days, max = 8) =>
  days.length > max ? `${days.slice(0, max).map(short).join(", ")} … (+${days.length - max})` : days.map(short).join(", ");

const TONE = {
  [DAY_STATUS.MATCH]: "green",
  [DAY_STATUS.QTY_DIFF]: "amber",
  [DAY_STATUS.ODOO_ONLY]: "red",
  [DAY_STATUS.RETURNS_ONLY]: "blue",
};

/** The month of one product as sentences, most telling first. */
function buildStory(p, rows, eps) {
  const zero = (n) => Math.abs(n) <= eps;
  const odooDays = rows.filter((r) => r.odooQty || r.odooLines.length).map((r) => r.odooDate || r.date);
  const mineDays = rows.filter((r) => r.mineLines.length).map((r) => r.mineDate || r.date);
  const odooRefs = new Set(rows.flatMap((r) => r.odooLines.map((l) => l.ref).filter(Boolean)));
  const odooBranches = new Set(rows.flatMap((r) => r.odooLines.map((l) => l.branch).filter(Boolean)));
  const mineBranches = new Set(rows.flatMap((r) => r.mineLines.map((l) => l.customer || l.branch).filter(Boolean)));
  const odooUnits = new Set(rows.flatMap((r) => r.odooLines.map((l) => l.uom)));
  const mineUnits = new Set(rows.flatMap((r) => r.mineLines.map((l) => l.uom)));
  const actions = new Map();
  rows.forEach((r) => r.mineLines.forEach((l) => actions.set(l.action, (actions.get(l.action) || 0) + 1)));
  const changed = rows.flatMap((r) => r.mineLines.filter((l) => l.dateFrom !== "report"));

  const lines = [];
  const unit = [...new Set([...odooUnits, ...mineUnits])].filter((u) => u && u !== "—").join("/") || p.fam;

  /* 1 — the two sides in one sentence each */
  lines.push({
    tone: "slate",
    text: odooDays.length
      ? `Odoo destroyed ${fmt3(p.odooQty)} ${unit} on ${odooDays.length} day(s) (${listDays(odooDays)})` +
        `${odooRefs.size ? ` across ${odooRefs.size} voucher(s)` : ""}${odooBranches.size ? `, posted under ${[...odooBranches].join(", ")}` : ""}.`
      : "Odoo has no disposal of this product in the month.",
  });
  lines.push({
    tone: "slate",
    text: mineDays.length
      ? `Our registers hold ${fmt3(p.mineQty)} ${unit} on ${mineDays.length} day(s) (${listDays(mineDays)})` +
        `${mineBranches.size ? `, from ${[...mineBranches].join(", ")}` : ""}` +
        `${actions.size ? ` — ${[...actions].map(([a, n]) => `${n}× ${a}`).join(", ")}` : ""}.`
      : "None of our registers records this product being destroyed in the month.",
  });

  /* 2 — the verdict */
  if (!odooDays.length) {
    lines.push({ tone: "blue", text: `Verdict: returned for destruction but never posted in Odoo — the ${fmt3(p.mineQty)} is still standing in Odoo stock.` });
  } else if (!mineDays.length) {
    lines.push({ tone: "red", text: `Verdict: destroyed in Odoo with no return behind it — ${fmt3(p.odooQty)} is unaccounted for on our side.` });
  } else if (zero(p.diff)) {
    lines.push({
      tone: "green",
      text: p.issues
        ? `Verdict: the month balances (difference 0); the ${p.issues} day(s) that disagree are timing only — the same quantity, written on different days.`
        : "Verdict: the month balances and every day agrees.",
    });
  } else {
    lines.push({
      tone: p.diff < 0 ? "red" : "blue",
      text: p.diff < 0
        ? `Verdict: Odoo destroyed ${fmt3(-p.diff)} more than we recorded (${fmt3(p.odooQty)} against ${fmt3(p.mineQty)}).`
        : `Verdict: we recorded ${fmt3(p.diff)} more than Odoo posted (${fmt3(p.mineQty)} against ${fmt3(p.odooQty)}).`,
    });
  }

  /* 3 — where the gap opened, and whether it stayed */
  let bal = 0;
  let openedOn = "";
  let peak = { at: "", v: 0 };
  for (const r of rows) {
    bal += r.mineQty - r.odooQty;
    if (zero(bal)) openedOn = "";
    else if (!openedOn) openedOn = r.date;
    if (Math.abs(bal) > Math.abs(peak.v)) peak = { at: r.date, v: bal };
  }
  if (!zero(p.diff) && openedOn && odooDays.length && mineDays.length) {
    lines.push({ tone: "amber", text: `The running balance last left zero on ${formatDMY(openedOn)} and never came back — start the investigation there.` });
  }
  if (peak.at && !zero(peak.v) && Math.abs(peak.v) > Math.abs(p.diff) + eps) {
    lines.push({
      tone: "violet",
      text: `Mid-month the gap reached ${signed(peak.v)} on ${formatDMY(peak.at)} before narrowing again — a late posting caught up.`,
    });
  }

  /* 4 — the biggest single day */
  const worst = rows.filter((r) => r.status !== DAY_STATUS.MATCH).sort((a, b) => b.absDiff - a.absDiff)[0];
  if (worst && !zero(worst.diff)) {
    lines.push({
      tone: "amber",
      text: `Biggest single day: ${formatDMY(worst.date)} — Odoo ${fmt3(worst.odooQty)} against ours ${fmt3(worst.mineQty)} (${signed(worst.diff)}, ${DAY_STATUS_META[worst.status].label.toLowerCase()}).`,
    });
  }

  /* 5 — the things that explain gaps without being stock problems */
  const shifted = rows.filter((r) => r.shiftDays);
  if (shifted.length) {
    lines.push({ tone: "violet", text: `${shifted.length} day(s) paired across dates (${shifted.map((r) => `${short(r.date)} ${r.shiftDays > 0 ? "+" : ""}${r.shiftDays}d`).join(", ")}) — the normal lag between the return and the voucher.` });
  }
  if (changed.length) {
    lines.push({ tone: "blue", text: `${changed.length} of our line(s) are dated by the day their action was changed, not the day of the return.` });
  }
  if (odooUnits.size && mineUnits.size && [...odooUnits].sort().join() !== [...mineUnits].sort().join()) {
    lines.push({ tone: "violet", text: `Units disagree: Odoo uses ${[...odooUnits].join("/")}, our registers ${[...mineUnits].join("/")}. If one plate is not one unit of ours, the difference is a conversion, not a loss.` });
  }
  const onlyOdoo = rows.filter((r) => r.status === DAY_STATUS.ODOO_ONLY);
  const onlyMine = rows.filter((r) => r.status === DAY_STATUS.RETURNS_ONLY);
  if (onlyOdoo.length && onlyMine.length) {
    lines.push({ tone: "amber", text: `It sits on one side only on ${onlyOdoo.length} Odoo day(s) and ${onlyMine.length} day(s) of ours — widening the day window may pair some of them.` });
  }
  if (odooBranches.size && mineBranches.size && ![...odooBranches].some((b) => mineBranches.has(b))) {
    lines.push({ tone: "amber", text: `Odoo posts it under ${[...odooBranches].join(", ")}, but our returns come from ${[...mineBranches].join(", ")} — check which site the voucher belongs to.` });
  }
  return lines;
}

export default function ProductStory({ product, rows, tolerance = 0.005, onOpenDay }) {
  const eps = Math.max(Number(tolerance) || 0, 0.0005);

  const timeline = useMemo(() => {
    let bal = 0;
    return [...rows]
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.mineDate).localeCompare(String(b.mineDate)))
      .map((r) => {
        bal += r.mineQty - r.odooQty;
        return { ...r, balance: bal };
      });
  }, [rows]);

  const story = useMemo(() => buildStory(product, timeline, eps), [product, timeline, eps]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 18 }}>📖 {product.code ? `${product.code} · ` : ""}{product.product}</strong>
        <Pill tone="slate">{product.fam}</Pill>
        <Pill tone="slate">Odoo {fmt3(product.odooQty)}</Pill>
        <Pill tone="teal">Ours {fmt3(product.mineQty)}</Pill>
        <Pill tone={Math.abs(product.diff) <= eps ? "green" : product.diff < 0 ? "red" : "blue"}>Difference {signed(product.diff)}</Pill>
        <Pill tone="slate">{product.match}/{product.days} clean day(s)</Pill>
      </div>

      <div className="dlx-findings" style={{ gridTemplateColumns: "1fr" }}>
        <div className="dlx-finding dlx-fi-slate" style={{ padding: "10px 14px" }}>
          <strong>The story — ملخص قصة المنتج</strong>
          {story.map((s, i) => (
            <p key={i} style={{ margin: "4px 0", display: "flex", gap: 8, alignItems: "baseline" }}>
              <span className={`dlx-dot dlx-dot-${s.tone === "violet" ? "blue" : s.tone}`} style={{ flex: "none", marginTop: 6 }} />
              <span>{s.text}</span>
            </p>
          ))}
        </div>
      </div>

      <table className="dlx-subTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Odoo — what was posted</th>
            <th className="num">Odoo</th>
            <th>Ours — what was recorded</th>
            <th className="num">Ours</th>
            <th className="num">Day diff</th>
            <th className="num" title="Ours minus Odoo, added up day after day">Running balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((r) => (
            <tr key={r.key} style={{ verticalAlign: "top" }}>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="dlx-rowBtn" style={{ padding: 0 }} title="Open this day" onClick={() => onOpenDay?.(r.date)}>
                  {formatDMY(r.date)}
                </button>
                {r.shiftDays ? <div className="dlx-muted">ours {short(r.mineDate)} ({r.shiftDays > 0 ? "+" : ""}{r.shiftDays}d)</div> : null}
              </td>
              <td>
                {r.odooLines.length
                  ? r.odooLines.map((l, i) => (
                      <div key={i}>
                        {fmt3(l.qty)} {l.uom} · {l.branch || "—"}{l.ref ? <span className="mono"> · {l.ref}</span> : null}
                      </div>
                    ))
                  : <span className="dlx-muted">—</span>}
              </td>
              <td className="num">{r.odooQty ? fmt3(r.odooQty) : ""}</td>
              <td>
                {r.mineLines.length
                  ? r.mineLines.map((l, i) => (
                      <div key={i}>
                        {fmt3(l.qty)} {l.uom} · {SOURCE_META[l.source]?.mark} {l.customer || l.branch || "—"} · {l.action}
                        {l.dateFrom !== "report" ? <span title={`Report dated ${formatDMY(l.reportDate)}; action changed on ${formatDMY(l.date)}`}> ↻ {short(l.reportDate)}</span> : null}
                        {l.remarks ? <span className="dlx-muted"> — {l.remarks}</span> : null}
                      </div>
                    ))
                  : <span className="dlx-muted">—</span>}
              </td>
              <td className="num">{r.mineLines.length ? fmt3(r.mineQty) : ""}</td>
              <td className="num" style={{ color: Math.abs(r.diff) <= eps ? undefined : r.diff < 0 ? "#b91c1c" : "#1d4ed8" }}>
                {Math.abs(r.diff) <= eps ? "0" : signed(r.diff)}
              </td>
              <td className="num" style={{ fontWeight: 900, color: Math.abs(r.balance) <= eps ? "#047857" : r.balance < 0 ? "#b91c1c" : "#1d4ed8" }}>
                {Math.abs(r.balance) <= eps ? "0" : signed(r.balance)}
              </td>
              <td>
                <Pill tone={TONE[r.status]}>{DAY_STATUS_META[r.status].icon} {DAY_STATUS_META[r.status].label}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
