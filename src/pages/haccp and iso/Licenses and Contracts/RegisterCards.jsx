// src/pages/haccp and iso/Licenses and Contracts/RegisterCards.jsx
//
// The default view of the Licenses & Contracts register: one place per branch.
//   left  — "Needs attention", "All branches" and every branch (count + worst
//           status dot); on a phone it becomes a row of chips
//   right — the chosen branch's licence and contracts as wide rows. Each row has
//           the two things people come for in front: open the document, renew.
//           Edit / history / delete sit behind the ⋯ menu.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fs } from "../../dashboard/hubCss";
import { STATUS, fmtDate } from "./licensesKit";

const ATTN = "__attn";
const ALL = "__all";

const L = {
  en: {
    attention: "Needs attention", attentionHint: "Expired, due in 30 days, no expiry date or no document",
    all: "All branches", search: "Search…", license: "Licence", contracts: "Contracts", contract: "Contract",
    open: "Open document", attach: "Attach document", renew: "Renew", edit: "Edit", history: "History", del: "Delete",
    editRecord: "Edit whole record", addHere: "+ Add to this branch", expires: "Expires", noDate: "No expiry date",
    renewedN: (n) => `Renewed ${n}×`, files: (n) => `${n} file${n === 1 ? "" : "s"}`,
    empty: "Nothing here.", allGood: "All good — nothing needs attention.", noLicence: "No licence recorded for this branch.",
    noContracts: "No contracts recorded for this branch.", docs: (n) => `${n} document${n === 1 ? "" : "s"}`,
    stExpired: (n) => `Expired ${n}d ago`, stToday: "Expires today", stLeft: (n) => `${n}d left`,
    branches: "Branches", manage: "Manage branches",
  },
  ar: {
    attention: "تحتاج متابعة", attentionHint: "منتهية، تنتهي خلال 30 يوماً، بدون تاريخ أو بدون مستند",
    all: "كل الفروع", search: "بحث…", license: "الرخصة", contracts: "العقود", contract: "عقد",
    open: "فتح المستند", attach: "إرفاق مستند", renew: "تجديد", edit: "تعديل", history: "السجل", del: "حذف",
    editRecord: "تعديل السجل كاملاً", addHere: "+ إضافة لهذا الفرع", expires: "ينتهي", noDate: "بدون تاريخ انتهاء",
    renewedN: (n) => `جُدد ${n} مرة`, files: (n) => `${n} ملف`,
    empty: "لا يوجد شيء هنا.", allGood: "كل شيء سليم — لا شيء يحتاج متابعة.", noLicence: "لا توجد رخصة مسجلة لهذا الفرع.",
    noContracts: "لا توجد عقود مسجلة لهذا الفرع.", docs: (n) => `${n} مستند`,
    stExpired: (n) => `منتهية منذ ${n} يوم`, stToday: "تنتهي اليوم", stLeft: (n) => `باقي ${n} يوم`,
    branches: "الفروع", manage: "إدارة الفروع",
  },
};

const CSS = `
.lcb { display:grid; grid-template-columns:270px minmax(0,1fr); gap:14px; align-items:start; margin-top:14px; }
.lcb-side { position:sticky; top:12px; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:10px;
  box-shadow:0 1px 2px rgba(15,23,42,.04); max-height:calc(100vh - 40px); overflow:auto; }
.lcb-cap { padding:8px 10px 6px; color:#94a3b8; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
.lcb-nav { display:flex; align-items:center; gap:10px; width:100%; text-align:start; border:1px solid transparent; background:none;
  padding:10px 11px; border-radius:11px; cursor:pointer; color:#1e293b; font-family:inherit; font-weight:700; }
.lcb-nav:hover { background:#f1f6fc; }
.lcb-nav.on { background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; }
.lcb-nav .nm { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lcb-dot { width:10px; height:10px; border-radius:99px; flex-shrink:0; }
.lcb-n { min-width:26px; padding:2px 8px; border-radius:99px; background:#f1f5f9; color:#475569; font-weight:800; text-align:center; }
.lcb-nav.attn .lcb-n { background:#fee2e2; color:#b91c1c; }
.lcb-sep { height:1px; background:#eef2f7; margin:6px 4px; }

.lcb-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#fff;
  border:1px solid #e2e8f0; border-radius:16px; padding:14px 16px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
.lcb-head-t { font-weight:900; color:#0f172a; margin:0; }
.lcb-head-s { color:#64748b; font-weight:600; margin-top:2px; }
.lcb-head-a { display:flex; gap:8px; flex-wrap:wrap; }
.lcb-sec { margin-top:18px; }
.lcb-sec-t { display:flex; align-items:center; gap:8px; color:#334155; font-weight:900; margin:0 2px 10px; }
.lcb-sec-t .lcb-n { background:#e0e7ff; color:#3730a3; }
.lcb-grid { display:grid; gap:8px; }
.lcb-empty { padding:16px; border:1.5px dashed #cbd5e1; border-radius:14px; color:#64748b; font-weight:700; text-align:center; background:#fbfdff; }
.lcb-good { padding:28px; border-radius:16px; background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; font-weight:800; text-align:center; margin-top:14px; }

/* one document = one row: icon | name | expiry | status | files | actions */
.lcb-row { position:relative; display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px;
  background:#fff; border:1px solid #e2e8f0; border-inline-start:5px solid var(--st); border-radius:14px; padding:12px 14px;
  box-shadow:0 1px 3px rgba(15,23,42,.05); transition:border-color .15s, box-shadow .15s; }
.lcb-row:hover { border-color:#bfdbfe; border-inline-start-color:var(--st); box-shadow:0 8px 22px rgba(37,99,235,.10); }
.lcb-ico { flex:none; width:44px; height:44px; border-radius:12px; display:grid; place-items:center; background:#f1f6fc; }
.lcb-ttl { flex:1 1 300px; min-width:0; }
.lcb-when { flex:none; width:calc(130px * var(--app-fs, 1)); }
.lcb-st { flex:none; width:calc(175px * var(--app-fs, 1)); }
.lcb-name { font-weight:900; color:#0f172a; line-height:1.3; overflow-wrap:anywhere; }
.lcb-sub { display:flex; flex-wrap:wrap; gap:4px 12px; margin-top:3px; color:#64748b; font-weight:600; }
.lcb-sub b { color:#334155; font-weight:700; }
.lcb-notes { color:#94a3b8; font-weight:600; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lcb-exp-l { display:block; color:#94a3b8; font-weight:700; }
.lcb-exp-d { display:block; font-weight:900; color:#0f172a; white-space:nowrap; }
.lcb-pill { max-width:100%; overflow:hidden; text-overflow:ellipsis; display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:999px;
  background:var(--bg); color:var(--fg); border:1px solid var(--bd); font-weight:800; white-space:nowrap; }
.lcb-pill i { width:8px; height:8px; border-radius:99px; background:var(--st); }
.lcb-acts { flex:none; margin-inline-start:auto; display:flex; gap:6px; align-items:center; justify-content:flex-end; }
.lcb-b { min-height:38px; border-radius:10px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f; font-weight:800;
  cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 13px; white-space:nowrap; }
.lcb-b:hover { background:#eff6ff; border-color:#93c5fd; }
.lcb-b.pri { background:#2563eb; border-color:#2563eb; color:#fff; }
.lcb-b.pri:hover { background:#1d4ed8; }
.lcb-b.warn { background:#fff7ed; border-color:#fdba74; color:#9a3412; }
.lcb-b.hot { background:#f97316; border-color:#ea580c; color:#fff; }
.lcb-b.more { width:38px; padding:0; }
.lcb-menu { position:absolute; inset-inline-end:12px; top:calc(100% - 6px); z-index:20; background:#fff; border:1px solid #e2e8f0; border-radius:12px;
  box-shadow:0 16px 36px rgba(15,23,42,.18); padding:6px; min-width:190px; display:grid; }
.lcb-menu button { text-align:start; background:none; border:none; padding:9px 11px; border-radius:8px; cursor:pointer; font-family:inherit; font-weight:700; color:#1e293b; }
.lcb-menu button:hover { background:#f1f6fc; }
.lcb-menu button.red { color:#b91c1c; }
.lcb-menu button.red:hover { background:#fef2f2; }
@media (max-width: 700px) {
  .lcb-when, .lcb-st { width:auto; }
  .lcb-acts { width:100%; justify-content:flex-start; margin-inline-start:0; }
}

#root .ndx.ndx .lcb-cap { font-size:${fs(11.5)}; }
#root .ndx.ndx .lcb-nav, #root .ndx.ndx .lcb-menu button { font-size:${fs(14)}; }
#root .ndx.ndx .lcb-n { font-size:${fs(12)}; }
#root .ndx.ndx .lcb-head-t { font-size:${fs(20)}; }
#root .ndx.ndx .lcb-head-s, #root .ndx.ndx .lcb-sub { font-size:${fs(13.5)}; }
#root .ndx.ndx .lcb-sec-t { font-size:${fs(15.5)}; }
#root .ndx.ndx .lcb-name { font-size:${fs(16)}; }
#root .ndx.ndx .lcb-notes, #root .ndx.ndx .lcb-exp-l { font-size:${fs(12.5)}; }
#root .ndx.ndx .lcb-exp-d { font-size:${fs(16)}; }
#root .ndx.ndx .lcb-pill { font-size:${fs(13)}; }
#root .ndx.ndx .lcb-ico { font-size:${fs(20)}; }
#root .ndx.ndx .lcb-b { font-size:${fs(13.5)}; }
#root .ndx.ndx .lcb-empty, #root .ndx.ndx .lcb-good { font-size:${fs(14.5)}; }

@media (max-width: 900px) {
  .lcb { grid-template-columns:1fr; }
  .lcb-side { position:static; max-height:none; display:flex; gap:6px; overflow-x:auto; padding:8px; }
  .lcb-cap, .lcb-sep { display:none; }
  .lcb-nav { width:auto; flex-shrink:0; border-color:#e2e8f0; }
}
`;

function stText(l, it) {
  if (it.status === "none") return l.noDate;
  if (it.days < 0) return l.stExpired(-it.days);
  if (it.days === 0) return l.stToday;
  return l.stLeft(it.days);
}
const needsAttention = (it) => it.status === "expired" || it.status === "soon" || it.status === "none" || !it.files.length;
const worstDot = (list) => {
  if (!list.length) return "#e2e8f0";
  const w = list.reduce((a, b) => (STATUS[b.status].rank < STATUS[a.status].rank ? b : a), list[0]);
  return STATUS[w.status].dot;
};

function DocRow({ l, lang, it, showBranch, mayEdit, mayDelete, on }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const s = STATUS[it.status];
  const urgent = it.status === "expired" || it.status === "soon";
  const pick = (fn) => () => { setMenu(false); fn(it); };
  return (
    <article ref={ref} className="lcb-row" style={{ "--st": s.dot, "--bg": s.bg, "--fg": s.color, "--bd": s.bd }}>
      <span className="lcb-ico" aria-hidden="true">{it.kind === "license" ? "🪪" : "📄"}</span>
      <div className="lcb-ttl">
        <div className="lcb-name">{it.name}</div>
        <div className="lcb-sub">
          {it.company && <b>{it.company}</b>}
          {showBranch && <span>📍 {it.branch}</span>}
          {it.files.length > 0 && <span>📎 {l.files(it.files.length)}</span>}
          {it.renewals.length > 0 && <span>↻ {l.renewedN(it.renewals.length)}</span>}
        </div>
        {it.notes && <div className="lcb-notes" title={it.notes}>{it.notes}</div>}
      </div>
      <div className="lcb-when">
        <span className="lcb-exp-l">{l.expires}</span>
        <span className="lcb-exp-d">{it.expiryDate ? fmtDate(it.expiryDate, lang) : "—"}</span>
      </div>
      <div className="lcb-st"><span className="lcb-pill"><i />{stText(l, it)}</span></div>
      <div className="lcb-acts">
        {it.files.length
          ? <button type="button" className="lcb-b pri" onClick={() => on.open(it)}>📎 {l.open}</button>
          : <button type="button" className="lcb-b warn" onClick={() => (mayEdit ? on.edit(it) : on.renew(it))}>⚠ {l.attach}</button>}
        <button type="button" className={`lcb-b${urgent ? " hot" : ""}`} onClick={() => on.renew(it)}>↻ {l.renew}</button>
        <button type="button" className="lcb-b more" aria-label="⋯" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>⋯</button>
      </div>
      {menu && (
        <div className="lcb-menu" role="menu">
          {mayEdit && <button type="button" onClick={pick(on.edit)}>✎ {l.edit}</button>}
          <button type="button" onClick={pick(on.history)}>🕘 {l.history}</button>
          {mayEdit && <button type="button" onClick={pick((x) => on.editRecord(x.rid))}>🗂 {l.editRecord}</button>}
          {mayDelete && <button type="button" className="red" onClick={pick(on.del)}>🗑 {l.del}</button>}
        </div>
      )}
    </article>
  );
}

/**
 * items     — flattenRecords() rows, already filtered by search + status tiles
 * allItems  — every row (for the side counts)
 * on        — { open, renew, edit, history, del, editRecord(rid), add(branch) }
 */
export default function RegisterCards({ lang, items, allItems, branchList, mayEdit, mayDelete, on }) {
  const l = L[lang] || L.en;
  const attnAll = useMemo(() => allItems.filter(needsAttention), [allItems]);
  const [pick, setPick] = useState(null);
  const current = pick || (attnAll.length ? ATTN : ALL);

  const branches = useMemo(() => {
    const names = new Set(branchList);
    allItems.forEach((it) => names.add(it.branch));
    return [...names].map((b) => {
      const list = allItems.filter((it) => it.branch === b);
      return { b, n: list.length, dot: worstDot(list) };
    }); // keeps the order set in Manage branches; branches found only on old records come last
  }, [allItems, branchList]);

  const sortByUrgency = (a, b) => STATUS[a.status].rank - STATUS[b.status].rank || (a.days ?? 1e9) - (b.days ?? 1e9);
  const shown = useMemo(() => {
    if (current === ATTN) return items.filter(needsAttention).sort(sortByUrgency);
    if (current === ALL) return items.slice().sort((a, b) => a.branch.localeCompare(b.branch) || sortByUrgency(a, b));
    return items.filter((it) => it.branch === current);
  }, [items, current]);

  const cardProps = { l, lang, mayEdit, mayDelete, on };
  const grid = (list, showBranch) => (
    <div className="lcb-grid">{list.map((it) => <DocRow key={it.key} it={it} showBranch={showBranch} {...cardProps} />)}</div>
  );

  let body;
  if (current === ATTN) {
    body = (
      <>
        <div className="lcb-head">
          <div>
            <h2 className="lcb-head-t">⚠ {l.attention}</h2>
            <div className="lcb-head-s">{l.attentionHint}</div>
          </div>
        </div>
        {shown.length ? <div className="lcb-sec">{grid(shown, true)}</div> : <div className="lcb-good">✅ {l.allGood}</div>}
      </>
    );
  } else if (current === ALL) {
    const byBranch = {};
    shown.forEach((it) => { (byBranch[it.branch] = byBranch[it.branch] || []).push(it); });
    body = (
      <>
        <div className="lcb-head">
          <div>
            <h2 className="lcb-head-t">{l.all}</h2>
            <div className="lcb-head-s">{l.docs(shown.length)}</div>
          </div>
        </div>
        {!shown.length && <div className="lcb-sec lcb-empty">{l.empty}</div>}
        {Object.keys(byBranch).map((b) => (
          <section key={b} className="lcb-sec">
            <h3 className="lcb-sec-t">
              <button type="button" className="lcb-nav" style={{ width: "auto", padding: "4px 8px" }} onClick={() => setPick(b)}>
                <span className="lcb-dot" style={{ background: worstDot(byBranch[b]) }} />{b} ›
              </button>
              <span className="lcb-n">{byBranch[b].length}</span>
            </h3>
            {grid(byBranch[b], false)}
          </section>
        ))}
      </>
    );
  } else {
    const lic = shown.filter((it) => it.kind === "license");
    const cons = shown.filter((it) => it.kind === "contract").sort(sortByUrgency);
    const rid = (lic[0] || cons[0])?.rid;
    body = (
      <>
        <div className="lcb-head">
          <div>
            <h2 className="lcb-head-t">📍 {current}</h2>
            <div className="lcb-head-s">{l.docs(shown.length)}</div>
          </div>
          <div className="lcb-head-a">
            {mayEdit && rid && <button type="button" className="pgk-btn sm" onClick={() => on.editRecord(rid)}>🗂 {l.editRecord}</button>}
            <button type="button" className="pgk-btn sm primary" onClick={() => on.add(current)}>{l.addHere}</button>
          </div>
        </div>
        <section className="lcb-sec">
          <h3 className="lcb-sec-t">🪪 {l.license}</h3>
          {lic.length ? grid(lic, false) : <div className="lcb-empty">{l.noLicence}</div>}
        </section>
        <section className="lcb-sec">
          <h3 className="lcb-sec-t">📄 {l.contracts} <span className="lcb-n">{cons.length}</span></h3>
          {cons.length ? grid(cons, false) : <div className="lcb-empty">{l.noContracts}</div>}
        </section>
      </>
    );
  }

  const nav = (key, label, n, dot, extra = "") => (
    <button key={key} type="button" className={`lcb-nav ${extra}${current === key ? " on" : ""}`} onClick={() => setPick(key)}>
      {dot && <span className="lcb-dot" style={{ background: dot }} />}
      <span className="nm">{label}</span>
      <span className="lcb-n">{n}</span>
    </button>
  );

  return (
    <div className="lcb">
      <style>{CSS}</style>
      <nav className="lcb-side" aria-label={l.branches}>
        {nav(ATTN, `⚠ ${l.attention}`, attnAll.length, null, "attn")}
        {nav(ALL, l.all, allItems.length)}
        <div className="lcb-sep" />
        <div className="lcb-cap">{l.branches}</div>
        {branches.map((x) => nav(x.b, x.b, x.n, x.dot))}
        {on.manageBranches && (
          <>
            <div className="lcb-sep" />
            <button type="button" className="lcb-nav" onClick={on.manageBranches}><span className="nm">⚙ {l.manage}</span></button>
          </>
        )}
      </nav>
      <div style={{ minWidth: 0 }}>{body}</div>
    </div>
  );
}
