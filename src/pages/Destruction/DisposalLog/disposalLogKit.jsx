// src/pages/Destruction/DisposalLog/disposalLogKit.jsx
//
// The shared shell for the two Odoo disposal-log screens (import + compare).
//
// Why a kit and not two stylesheets: both screens are the same picture — a
// date tree on the left, a working table on the right, a toolbar over it —
// and the returns browser they are modelled on reads that way too. Keeping
// the chrome in one place is what makes them feel like one module.
//
// ⚠ globals.css pins `#root *` to 14px and `#root table *` to 12px with
// !important, so a plain `.dlx-table th{font-size:14px}` is silently dead —
// which is why the first version of this page rendered as one flat wall of
// type. Every rule below is written through the DOUBLED page class
// (`#root .dlx.dlx …`), which out-specifies the global rule, and every
// font-size carries !important. Keep new rules in the same shape.

import React, { useCallback, useEffect, useMemo, useState } from "react";

/* ============================================================
   remembered UI preferences (per screen, per browser)
   ============================================================ */
export function useLocalPref(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* private window — the preference just does not persist */
    }
  }, [key, v]);
  return [v, setV];
}

/* ============================================================
   date helpers for the tree
   ============================================================ */
export function buildDateHierarchy(dates) {
  const years = new Map();
  for (const d of dates) {
    const iso = String(d || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    const [y, m] = iso.split("-");
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y);
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(iso);
  }
  return Array.from(years.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, days]) => ({ month, days: days.sort() })),
    }));
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthShort = (mm) => MONTH_SHORT[Number(mm) - 1] || mm;

/* ============================================================
   Date tree — the left rail both screens are navigated by
   ============================================================
   `meta(date)` returns what to show beside a day: { count, tone, hint }.
   The tone paints the dot, so a day that failed reconciliation can be seen
   without opening it — the whole point of keeping the tree.
   ============================================================ */
export function DateTree({
  dates,
  selected,
  onSelect,
  meta = () => ({}),
  title = "Date tree",
  hidden = false,
  onToggleHidden,
  footer = null,
}) {
  const hierarchy = useMemo(() => buildDateHierarchy(dates), [dates]);
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});

  /* Everything starts open: these files are one month, and a tree that has
     to be unfolded before it shows a single day is a tree in the way. */
  useEffect(() => {
    const y = {};
    const m = {};
    hierarchy.forEach((yr) => {
      y[yr.year] = true;
      yr.months.forEach((mo) => {
        m[`${yr.year}-${mo.month}`] = true;
      });
    });
    setOpenYears(y);
    setOpenMonths(m);
  }, [hierarchy]);

  const allOpen =
    hierarchy.length > 0 &&
    hierarchy.every((y) => openYears[y.year] && y.months.every((mo) => openMonths[`${y.year}-${mo.month}`]));

  const setAll = (on) => {
    const y = {};
    const m = {};
    hierarchy.forEach((yr) => {
      y[yr.year] = on;
      yr.months.forEach((mo) => {
        m[`${yr.year}-${mo.month}`] = on;
      });
    });
    setOpenYears(y);
    setOpenMonths(m);
  };

  if (hidden) {
    return (
      <div className="dlx-rail" onClick={() => onToggleHidden?.(false)} title="Show the date tree" role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleHidden?.(false)}>
        <span className="dlx-railIcon">›</span>
        <span className="dlx-railText">📅 {title}</span>
        <span className="dlx-railCount">{dates.length}</span>
      </div>
    );
  }

  return (
    <aside className="dlx-tree">
      <div className="dlx-treeHead">
        <span>📅 {title} <b>({dates.length})</b></span>
        <span className="dlx-treeBtns">
          <button type="button" className="dlx-iconBtn" title={allOpen ? "Collapse all" : "Expand all"} onClick={() => setAll(!allOpen)}>
            {allOpen ? "⌃" : "⌄"}
          </button>
          {onToggleHidden && (
            <button type="button" className="dlx-iconBtn" title="Hide the date tree" onClick={() => onToggleHidden(true)}>
              ‹
            </button>
          )}
        </span>
      </div>

      <div className="dlx-treeBody">
        {hierarchy.length === 0 ? (
          <div className="dlx-treeEmpty">No dates yet.</div>
        ) : (
          hierarchy.map(({ year, months }) => {
            const yOpen = !!openYears[year];
            const yCount = months.reduce((n, mo) => n + mo.days.length, 0);
            return (
              <div key={year}>
                <button type="button" className="dlx-treeYear" onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}>
                  <span>{yOpen ? "▾" : "▸"} Year {year}</span>
                  <span className="dlx-treePill">{yCount}</span>
                </button>
                {yOpen &&
                  months.map(({ month, days }) => {
                    const key = `${year}-${month}`;
                    const mOpen = !!openMonths[key];
                    return (
                      <div key={key}>
                        <button type="button" className="dlx-treeMonth" onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))}>
                          <span>{mOpen ? "▾" : "▸"} {monthShort(month)} {year}</span>
                          <span className="dlx-treeSub">{days.length}</span>
                        </button>
                        {mOpen &&
                          days.map((d) => {
                            const info = meta(d) || {};
                            const on = selected === d;
                            return (
                              <button
                                type="button"
                                key={d}
                                className={`dlx-treeDay${on ? " on" : ""}`}
                                onClick={() => onSelect?.(d)}
                                title={info.hint || d}
                              >
                                <span className="dlx-treeDayL">
                                  {info.tone && <i className={`dlx-dot dlx-dot-${info.tone}`} />}
                                  {d.slice(8)} <small>{monthShort(month)}</small>
                                </span>
                                <span className="dlx-treeCount">{info.count ?? ""}</span>
                              </button>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
      {footer && <div className="dlx-treeFoot">{footer}</div>}
    </aside>
  );
}

/* ============================================================
   small pieces
   ============================================================ */
export function Kpi({ label, ar, value, sub, tone = "slate" }) {
  return (
    <div className={`dlx-kpi dlx-tone-${tone}`}>
      <div className="dlx-kpiLbl">{label}</div>
      <div className="dlx-kpiVal">{value}</div>
      {sub != null && <div className="dlx-kpiSub">{sub}</div>}
      {ar && <div className="dlx-kpiAr" dir="rtl">{ar}</div>}
    </div>
  );
}

export function Pill({ tone = "slate", children, title, onClick }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag type={onClick ? "button" : undefined} className={`dlx-pill dlx-pill-${tone}`} title={title} onClick={onClick}>
      {children}
    </Tag>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", hint }) {
  return (
    <div className="dlx-search">
      <span aria-hidden="true">🔎</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value ? (
        <button type="button" className="dlx-iconBtn" title="Clear" onClick={() => onChange("")}>✕</button>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </div>
  );
}

export function Field({ label, children, wide = false }) {
  return (
    <label className={`dlx-field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="dlx-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "on" : ""}
          onClick={() => onChange(o.value)}
          title={o.title || o.label}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, title }) {
  return (
    <button
      type="button"
      className={`dlx-toggle${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
      title={title || label}
      aria-pressed={checked}
    >
      <i /> {label}
    </button>
  );
}

export function EmptyState({ icon = "📄", title, hint }) {
  return (
    <div className="dlx-empty">
      <div className="dlx-emptyIcon">{icon}</div>
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/** Copy text to the clipboard and report whether it landed. */
export function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = useCallback(async (text, tag = "1") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(""), 1400);
      return true;
    } catch {
      return false;
    }
  }, []);
  return [copied, copy];
}

/** Write one or more sheets to an .xlsx the browser downloads. */
export async function downloadSheets(sheets, fileName) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa);
    ws["!cols"] = (s.aoa[0] || []).map((_, i) => ({
      wch: Math.min(46, Math.max(9, ...s.aoa.slice(0, 200).map((r) => String(r?.[i] ?? "").length + 2))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, String(s.name || "Sheet").slice(0, 31));
  }
  XLSX.writeFile(wb, fileName);
}

/* ============================================================
   stylesheet — every rule doubled-class scoped, see the note on top
   ============================================================ */
export const DLX_CSS = `
#root .dlx.dlx{min-height:100vh;box-sizing:border-box;padding:14px clamp(10px,2vw,24px) 30px;
  background:radial-gradient(1100px 520px at 100% -8%,#e0f2fe 0%,transparent 58%),
             linear-gradient(180deg,#f6f9fc 0%,#eef3f8 100%);
  color:#0f172a;font-family:Cairo,Segoe UI,Roboto,Arial,sans-serif}
/* The whole module reads at 16px bold: these are dense reconciliation tables
   read at arm's length on a shop-floor screen, and the 14/12px the globals
   impose is what made them squint. Base rule first, specific sizes after it:
   a class selector out-specifies the universal one below, so headings and
   badges still keep their own scale. */
#root .dlx.dlx,
#root .dlx.dlx *{box-sizing:border-box;font-size:16px !important;font-weight:700}
/* Full-bleed: the comparison is a wide table and a tree, and a 1560px column
   on a 27" screen throws away the half of it the eye needs. */
#root .dlx.dlx .dlx-shell{width:100%;max-width:none;margin:0}

/* ── hero ── */
#root .dlx.dlx .dlx-hero{display:flex;gap:14px;align-items:center;justify-content:space-between;
  flex-wrap:wrap;padding:16px clamp(14px,2vw,22px);border-radius:18px;color:#fff;
  background:linear-gradient(125deg,#0f172a 0%,#134e4a 42%,#0e7490 100%);
  box-shadow:0 20px 44px rgba(15,23,42,.22)}
#root .dlx.dlx .dlx-hero h1{margin:2px 0 0;font-size:28px !important;font-weight:900;line-height:1.25}
#root .dlx.dlx .dlx-hero p{margin:5px 0 0;font-size:16px !important;font-weight:700;color:rgba(255,255,255,.86)}
#root .dlx.dlx .dlx-kicker{font-size:14px !important;font-weight:900;letter-spacing:.5px;opacity:.8}
#root .dlx.dlx .dlx-heroBtns{display:flex;gap:8px;flex-wrap:wrap}

/* ── buttons ── */
#root .dlx.dlx .dlx-btn{border:0;border-radius:12px;padding:9px 15px;font-family:inherit;
  font-size:16px !important;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;
  transition:transform .12s ease,filter .12s ease,box-shadow .12s ease}
#root .dlx.dlx .dlx-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06)}
#root .dlx.dlx .dlx-btn:disabled{opacity:.5;cursor:not-allowed}
#root .dlx.dlx .dlx-ghost{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.28)}
#root .dlx.dlx .dlx-primary{background:linear-gradient(135deg,#0e7490,#0f766e);color:#fff;box-shadow:0 8px 18px rgba(13,148,136,.32)}
#root .dlx.dlx .dlx-soft{background:#fff;color:#0f172a;border:1px solid #dbe4ee}
#root .dlx.dlx .dlx-danger{background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;box-shadow:0 8px 18px rgba(220,38,38,.3)}
#root .dlx.dlx .dlx-iconBtn{border:1px solid #dbe4ee;background:#fff;border-radius:9px;cursor:pointer;
  padding:3px 8px;font-size:15px !important;font-weight:900;color:#334155;line-height:1.6}
#root .dlx.dlx .dlx-iconBtn:hover{background:#f1f5f9}

/* ── cards ── */
#root .dlx.dlx .dlx-card{margin-top:14px;background:#fff;border:1px solid #e4ebf3;border-radius:18px;
  padding:14px clamp(12px,1.5vw,18px);box-shadow:0 14px 30px rgba(15,23,42,.06)}
#root .dlx.dlx .dlx-cardHead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
#root .dlx.dlx .dlx-cardHead h2{margin:0;font-size:20px !important;font-weight:900}
#root .dlx.dlx .dlx-cardHead p{margin:2px 0 0;font-size:16px !important;font-weight:700;color:#64748b}
#root .dlx.dlx .dlx-step{width:30px;height:30px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;
  background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-weight:900;font-size:18px !important}
#root .dlx.dlx .dlx-headRight{margin-inline-start:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}

/* ── drop zone ── */
#root .dlx.dlx .dlx-drop{display:flex;align-items:center;gap:14px;padding:22px;border:2px dashed #b8c7d8;
  border-radius:16px;background:linear-gradient(180deg,#f8fbff,#f1f6fb);cursor:pointer;transition:.16s}
#root .dlx.dlx .dlx-drop:hover{border-color:#0e7490;background:#effcfb}
#root .dlx.dlx .dlx-drop.hot{border-color:#0e7490;background:#e0f7f5;transform:scale(1.005)}
#root .dlx.dlx .dlx-dropIcon{font-size:40px !important}
#root .dlx.dlx .dlx-drop strong{font-size:20px !important;font-weight:900}
#root .dlx.dlx .dlx-muted{color:#64748b;font-size:15px !important;font-weight:700;margin-top:3px}

/* ── notes ── */
#root .dlx.dlx .dlx-note{margin-top:10px;border-radius:12px;padding:9px 13px;font-size:16px !important;
  font-weight:800;line-height:1.65}
#root .dlx.dlx .dlx-noteOk{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
#root .dlx.dlx .dlx-noteErr{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
#root .dlx.dlx .dlx-noteBusy{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
#root .dlx.dlx .dlx-noteWarn{background:#fffbeb;color:#92400e;border:1px solid #fde68a}

/* ── fields ── */
#root .dlx.dlx .dlx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
#root .dlx.dlx .dlx-field{display:flex;flex-direction:column;gap:5px;min-width:0}
#root .dlx.dlx .dlx-field.wide{grid-column:span 2}
#root .dlx.dlx .dlx-field>span{font-size:14px !important;font-weight:900;color:#475569;letter-spacing:.2px}
#root .dlx.dlx .dlx-field select,#root .dlx.dlx .dlx-field input{width:100%;border:1px solid #cfdbe8;border-radius:10px;
  padding:8px 10px;font-family:inherit;font-size:16px !important;font-weight:700;background:#fff;color:#0f172a}
#root .dlx.dlx .dlx-field select:focus,#root .dlx.dlx .dlx-field input:focus{outline:2px solid #99f6e4;border-color:#0e7490}
#root .dlx.dlx .dlx-field select.bad{border-color:#ef4444;background:#fff1f2}

/* ── toolbar ── */
#root .dlx.dlx .dlx-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
#root .dlx.dlx .dlx-search{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #cfdbe8;
  border-radius:12px;padding:6px 10px;min-width:230px;flex:1 1 230px;max-width:420px}
#root .dlx.dlx .dlx-search input{border:0;outline:0;flex:1;font-family:inherit;font-size:16px !important;font-weight:700;background:transparent;min-width:0}
#root .dlx.dlx .dlx-search small{font-size:14px !important;color:#94a3b8;font-weight:800;white-space:nowrap}
#root .dlx.dlx .dlx-seg{display:inline-flex;background:#eef2f7;border-radius:11px;padding:3px;gap:2px}
#root .dlx.dlx .dlx-seg button{border:0;background:transparent;border-radius:9px;padding:6px 11px;cursor:pointer;
  font-family:inherit;font-size:16px !important;font-weight:800;color:#475569}
#root .dlx.dlx .dlx-seg button.on{background:#fff;color:#0f766e;box-shadow:0 2px 6px rgba(15,23,42,.12)}
#root .dlx.dlx .dlx-toggle{display:inline-flex;align-items:center;gap:7px;border:1px solid #cfdbe8;background:#fff;
  border-radius:11px;padding:6px 11px;cursor:pointer;font-family:inherit;font-size:16px !important;font-weight:800;color:#475569}
#root .dlx.dlx .dlx-toggle i{width:26px;height:15px;border-radius:999px;background:#cbd5e1;position:relative;transition:.15s}
#root .dlx.dlx .dlx-toggle i::after{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:999px;background:#fff;transition:.15s}
#root .dlx.dlx .dlx-toggle.on{border-color:#99f6e4;background:#effcfb;color:#0f766e}
#root .dlx.dlx .dlx-toggle.on i{background:#0d9488}
#root .dlx.dlx .dlx-toggle.on i::after{left:13px}

/* ── kpis ── */
#root .dlx.dlx .dlx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}
#root .dlx.dlx .dlx-kpi{border:1px solid #e4ebf3;border-radius:14px;padding:10px 13px;background:#fff}
#root .dlx.dlx .dlx-kpiLbl{font-size:14px !important;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.4px}
#root .dlx.dlx .dlx-kpiVal{font-size:28px !important;font-weight:900;line-height:1.2;margin-top:3px;word-break:break-word}
#root .dlx.dlx .dlx-kpiSub{font-size:15px !important;font-weight:800;color:#0f766e;margin-top:2px}
#root .dlx.dlx .dlx-kpiAr{font-size:14px !important;font-weight:800;color:#94a3b8;margin-top:2px}
#root .dlx.dlx .dlx-tone-slate{border-top:3px solid #64748b}
#root .dlx.dlx .dlx-tone-red{border-top:3px solid #dc2626}
#root .dlx.dlx .dlx-tone-amber{border-top:3px solid #f59e0b}
#root .dlx.dlx .dlx-tone-teal{border-top:3px solid #0d9488}
#root .dlx.dlx .dlx-tone-blue{border-top:3px solid #2563eb}
#root .dlx.dlx .dlx-tone-green{border-top:3px solid #059669}

/* ── pills ── */
#root .dlx.dlx .dlx-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;
  font-size:14px !important;font-weight:900;border:1px solid transparent;white-space:nowrap}
#root .dlx.dlx button.dlx-pill{cursor:pointer}
/* Pills sit beside each other and beside plain text in the same cell, and
   must never run into either. */
#root .dlx.dlx .dlx-pill{margin-inline-start:5px}
#root .dlx.dlx td>.dlx-pill:first-child,
#root .dlx.dlx .dlx-legend>.dlx-pill{margin-inline-start:0}
#root .dlx.dlx .dlx-pill-slate{background:#f1f5f9;color:#334155;border-color:#dbe4ee}
#root .dlx.dlx .dlx-pill-teal{background:#ecfeff;color:#0e7490;border-color:#a5f3fc}
#root .dlx.dlx .dlx-pill-green{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
#root .dlx.dlx .dlx-pill-amber{background:#fffbeb;color:#b45309;border-color:#fde68a}
#root .dlx.dlx .dlx-pill-red{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
#root .dlx.dlx .dlx-pill-blue{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
#root .dlx.dlx .dlx-pill-violet{background:#faf5ff;color:#7e22ce;border-color:#e9d5ff}

/* ── layout: tree + panel ── */
#root .dlx.dlx .dlx-split{display:grid;gap:12px;align-items:start}
#root .dlx.dlx .dlx-split.open{grid-template-columns:minmax(268px,320px) minmax(0,1fr)}
#root .dlx.dlx .dlx-split.closed{grid-template-columns:46px minmax(0,1fr)}
#root .dlx.dlx .dlx-tree{background:#fff;border:1px solid #e4ebf3;border-radius:16px;overflow:hidden;
  position:sticky;top:10px;max-height:78vh;display:flex;flex-direction:column}
#root .dlx.dlx .dlx-treeHead{display:flex;align-items:center;justify-content:space-between;gap:6px;
  padding:9px 11px;border-bottom:1px solid #eef2f7;font-size:15px !important;font-weight:900;color:#334155;background:#f8fafc}
#root .dlx.dlx .dlx-treeBtns{display:inline-flex;gap:4px}
#root .dlx.dlx .dlx-treeBody{overflow:auto;flex:1}
#root .dlx.dlx .dlx-treeEmpty{padding:26px 12px;text-align:center;color:#94a3b8;font-size:16px !important;font-weight:800}
#root .dlx.dlx .dlx-treeYear,#root .dlx.dlx .dlx-treeMonth,#root .dlx.dlx .dlx-treeDay{
  width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;border:0;background:transparent;
  cursor:pointer;font-family:inherit;text-align:left}
#root .dlx.dlx .dlx-treeYear{padding:9px 11px;font-size:16px !important;font-weight:900;color:#0f172a;background:#f1f5f9}
#root .dlx.dlx .dlx-treeMonth{padding:7px 11px 7px 22px;font-size:15px !important;font-weight:800;color:#475569}
#root .dlx.dlx .dlx-treeDay{padding:7px 11px 7px 32px;font-size:16px !important;font-weight:700;color:#1e293b;
  border-left:3px solid transparent}
#root .dlx.dlx .dlx-treeDay:hover{background:#f8fafc}
#root .dlx.dlx .dlx-treeDay.on{background:#ecfeff;border-left-color:#0e7490;color:#0e7490;font-weight:900}
#root .dlx.dlx .dlx-treeDayL{display:inline-flex;align-items:center;gap:7px}
#root .dlx.dlx .dlx-treeDay small{font-size:14px !important;color:#94a3b8;font-weight:800}
#root .dlx.dlx .dlx-treeCount{font-size:14px !important;font-weight:900;color:#64748b}
#root .dlx.dlx .dlx-treePill{background:#e2e8f0;border-radius:999px;padding:1px 8px;font-size:14px !important;font-weight:900;color:#475569}
#root .dlx.dlx .dlx-treeSub{font-size:14px !important;font-weight:800;color:#94a3b8}
#root .dlx.dlx .dlx-treeFoot{border-top:1px solid #eef2f7;padding:8px 10px;background:#f8fafc}
#root .dlx.dlx .dlx-dot{width:8px;height:8px;border-radius:999px;display:inline-block;flex:none}
#root .dlx.dlx .dlx-dot-green{background:#10b981}
#root .dlx.dlx .dlx-dot-amber{background:#f59e0b}
#root .dlx.dlx .dlx-dot-red{background:#ef4444}
#root .dlx.dlx .dlx-dot-blue{background:#3b82f6}
#root .dlx.dlx .dlx-dot-slate{background:#cbd5e1}
#root .dlx.dlx .dlx-rail{background:#fff;border:1px solid #e4ebf3;border-radius:16px;padding:10px 4px;cursor:pointer;
  display:flex;flex-direction:column;align-items:center;gap:10px;position:sticky;top:10px}
#root .dlx.dlx .dlx-railIcon{font-size:20px !important;font-weight:900;color:#0e7490}
#root .dlx.dlx .dlx-railText{writing-mode:vertical-rl;transform:rotate(180deg);font-size:14px !important;
  font-weight:900;color:#64748b;letter-spacing:.4px;white-space:nowrap}
#root .dlx.dlx .dlx-railCount{background:#ecfeff;color:#0e7490;border-radius:999px;padding:2px 7px;
  font-size:14px !important;font-weight:900}

/* ── panel + tables ── */
#root .dlx.dlx .dlx-panel{background:#fff;border:1px solid #e4ebf3;border-radius:16px;padding:12px;min-width:0}
#root .dlx.dlx .dlx-panelHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
#root .dlx.dlx .dlx-panelHead h3{margin:0;font-size:18px !important;font-weight:900}
#root .dlx.dlx .dlx-panelHead .dlx-sp{margin-inline-start:auto;display:flex;gap:7px;flex-wrap:wrap;align-items:center}
#root .dlx.dlx .dlx-tableWrap{overflow:auto;border:1px solid #e9eef5;border-radius:12px;max-height:64vh}
#root .dlx.dlx table.dlx-table{width:100%;border-collapse:separate;border-spacing:0;white-space:nowrap}
#root .dlx.dlx table.dlx-table th{position:sticky;top:0;z-index:2;background:#0f766e;color:#fff;font-weight:900;
  padding:9px 10px;text-align:left;font-size:14px !important;letter-spacing:.3px;white-space:nowrap}
#root .dlx.dlx table.dlx-table th.sortable{cursor:pointer;user-select:none}
#root .dlx.dlx table.dlx-table th.sortable:hover{background:#0e6d66}
#root .dlx.dlx table.dlx-table td{padding:7px 10px;border-top:1px solid #eef2f7;font-weight:700;color:#1e293b;
  font-size:16px !important;vertical-align:middle}
#root .dlx.dlx table.dlx-table tbody tr:nth-child(even){background:#f9fbfd}
#root .dlx.dlx table.dlx-table tbody tr:hover{background:#eff6ff}
#root .dlx.dlx table.dlx-table tbody tr.dead td{opacity:.45;text-decoration:line-through}
#root .dlx.dlx table.dlx-table tbody tr.open{background:#ecfeff}
#root .dlx.dlx table.dlx-table .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
#root .dlx.dlx table.dlx-table .mono{font-family:ui-monospace,Consolas,monospace;font-size:15px !important;color:#475569}
#root .dlx.dlx table.dlx-table .wrap{white-space:normal;min-width:190px}
#root .dlx.dlx table.dlx-table td.bad{color:#b91c1c;font-weight:900}
#root .dlx.dlx table.dlx-table td.pos{color:#047857;font-weight:900}
#root .dlx.dlx table.dlx-table td.neg{color:#b91c1c;font-weight:900}
#root .dlx.dlx table.dlx-table tfoot td{position:sticky;bottom:0;background:#f1f5f9;font-weight:900;
  border-top:2px solid #cbd5e1;font-size:16px !important}
#root .dlx.dlx .dlx-sub{background:#f8fafc}
#root .dlx.dlx .dlx-subTable{width:100%;border-collapse:collapse;margin:2px 0 6px}
#root .dlx.dlx .dlx-subTable th{background:#e2e8f0 !important;color:#334155 !important;position:static !important;
  font-size:14px !important;padding:5px 8px}
#root .dlx.dlx .dlx-subTable td{font-size:14px !important;padding:4px 8px;border-top:1px solid #e9eef5}
#root .dlx.dlx .dlx-rowBtn{border:0;background:transparent;cursor:pointer;font-size:16px !important;font-weight:900;color:#0e7490}
#root .dlx.dlx .dlx-del{border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:9px;cursor:pointer;
  padding:3px 9px;font-size:15px !important;font-weight:900}
#root .dlx.dlx .dlx-del:hover{background:#fee2e2}
#root .dlx.dlx .dlx-undo{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:9px;cursor:pointer;
  padding:3px 9px;font-size:15px !important;font-weight:900}

/* ── the month chart ── */
#root .dlx.dlx .dlx-chartWrap{border:1px solid #e9eef5;border-radius:14px;padding:10px 12px 6px;
  margin-bottom:10px;background:linear-gradient(180deg,#fbfdff,#f6f9fc);overflow-x:auto}

/* ── findings ── */
#root .dlx.dlx .dlx-findings{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
#root .dlx.dlx .dlx-finding{border:1px solid #e4ebf3;border-left-width:6px;border-radius:14px;padding:12px 14px;background:#fff}
#root .dlx.dlx .dlx-finding strong{display:block;font-size:18px !important;font-weight:900;margin-bottom:5px}
#root .dlx.dlx .dlx-finding p{margin:0;font-size:16px !important;font-weight:700;color:#475569;line-height:1.7}
#root .dlx.dlx .dlx-fi-red{border-left-color:#ef4444;background:#fffafa}
#root .dlx.dlx .dlx-fi-amber{border-left-color:#f59e0b;background:#fffdf5}
#root .dlx.dlx .dlx-fi-blue{border-left-color:#3b82f6;background:#f8fbff}
#root .dlx.dlx .dlx-fi-violet{border-left-color:#a855f7;background:#fdfaff}
#root .dlx.dlx .dlx-fi-green{border-left-color:#10b981;background:#f7fffb}
#root .dlx.dlx .dlx-fi-slate{border-left-color:#94a3b8;background:#f8fafc}

/* ── misc ── */
#root .dlx.dlx .dlx-empty{padding:52px 18px;text-align:center;color:#64748b}
#root .dlx.dlx .dlx-emptyIcon{font-size:40px !important;opacity:.45}
#root .dlx.dlx .dlx-empty strong{display:block;margin-top:8px;font-size:18px !important;font-weight:900;color:#334155}
#root .dlx.dlx .dlx-empty span{display:block;margin-top:4px;font-size:16px !important;font-weight:700}
#root .dlx.dlx .dlx-legend{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 2px}
#root .dlx.dlx .dlx-bar{height:9px;border-radius:999px;background:#eef2f7;overflow:hidden;display:flex;margin-top:8px}
#root .dlx.dlx .dlx-bar i{height:100%;display:block}
#root .dlx.dlx .dlx-footer{margin:22px 0 0;text-align:center;color:#94a3b8;font-size:15px !important;font-weight:800}
#root .dlx.dlx .dlx-modalWrap{position:fixed;inset:0;background:rgba(15,23,42,.55);display:grid;place-items:center;
  z-index:9999;padding:16px}
#root .dlx.dlx .dlx-modal{background:#fff;border-radius:18px;padding:18px;width:min(520px,100%);
  box-shadow:0 30px 60px rgba(15,23,42,.35)}
#root .dlx.dlx .dlx-modal h4{margin:0 0 6px;font-size:20px !important;font-weight:900}
#root .dlx.dlx .dlx-modal p{margin:0;font-size:16px !important;font-weight:700;color:#475569;line-height:1.7}
#root .dlx.dlx .dlx-modalBtns{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}

/* ── print: the working chrome goes, the numbers stay ── */
@media print{
  #root .dlx.dlx{background:#fff;padding:0}
  #root .dlx.dlx .dlx-hero{background:#0f172a !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #root .dlx.dlx .dlx-heroBtns,
  #root .dlx.dlx .dlx-tools,
  #root .dlx.dlx .dlx-tree,
  #root .dlx.dlx .dlx-rail,
  #root .dlx.dlx .dlx-headRight,
  #root .dlx.dlx .dlx-del,
  #root .dlx.dlx .dlx-iconBtn,
  #root .dlx.dlx .dlx-rowBtn{display:none !important}
  #root .dlx.dlx .dlx-split.open,#root .dlx.dlx .dlx-split.closed{grid-template-columns:1fr}
  #root .dlx.dlx .dlx-card,#root .dlx.dlx .dlx-panel{box-shadow:none;border-color:#cbd5e1;break-inside:avoid}
  #root .dlx.dlx .dlx-tableWrap{max-height:none;overflow:visible}
  #root .dlx.dlx table.dlx-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #root .dlx.dlx table.dlx-table tbody tr{break-inside:avoid}
}

@media (max-width:900px){
  #root .dlx.dlx .dlx-split.open,#root .dlx.dlx .dlx-split.closed{grid-template-columns:1fr}
  #root .dlx.dlx .dlx-tree{position:static;max-height:340px}
  #root .dlx.dlx .dlx-rail{flex-direction:row;position:static}
  #root .dlx.dlx .dlx-railText{writing-mode:horizontal-tb;transform:none}
}
`;
