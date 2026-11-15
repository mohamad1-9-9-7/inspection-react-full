// src/pages/dashboard/hubCss.js
// ONE look for the home dashboard and the section hubs (HACCP / ISO …):
// light "Soft Sky" surfaces, the same header, search, chips, cards, pins and
// attention list. A hub wraps itself in <main className="ndx ndx"> and prints
// <style>{HUB_CSS}</style>; change a class here and every hub follows.
//
/* globals.css forces every #root font-size with !important, so real sizes
   live here (doubled class beats `#root *`) and follow the Aa text-size
   slider via --app-fs. Light "Soft Sky" surfaces; hover is plain CSS. */
export const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
export const HUB_CSS = `
.ndx { min-height:100vh; box-sizing:border-box; display:flex; flex-direction:column;
  padding:16px clamp(12px,1.6vw,26px) 14px; background:linear-gradient(180deg,#f3f8fe 0%,#eef6fb 50%,#f6f9fd 100%);
  color:#0f172a; font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.ndx *, .ndx *::before, .ndx *::after { box-sizing:border-box; }
.ndx button { font-family:inherit; }

/* ── header ── */
.ndx-hero { position:relative; display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:18px;
  background:linear-gradient(120deg,#ffffff 0%,#eef6ff 60%,#e3f2fd 100%); border:1px solid #d7e6f7;
  box-shadow:0 6px 22px rgba(30,64,120,.08); }
.ndx-logo { width:58px; height:58px; border-radius:14px; object-fit:cover; background:#fff; border:1px solid #dbeafe; flex-shrink:0; }
.ndx-hello { min-width:0; flex:1; }
#root .ndx.ndx .ndx-eyebrow { font-size:${fs(12)}; margin:0; font-weight:800; color:#2563eb; letter-spacing:.07em; text-transform:uppercase; }
#root .ndx.ndx[dir="rtl"] .ndx-eyebrow { letter-spacing:0; }
#root .ndx.ndx .ndx-title { font-size:${fs(25)}; margin:3px 0 0; font-weight:900; line-height:1.2; color:#0f172a;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-sub { font-size:${fs(13.5)}; margin:5px 0 0; color:#526581; font-weight:600; line-height:1.45; }
.ndx-hside { display:flex; align-items:center; gap:10px; flex-shrink:0; position:relative; }
.ndx-net { display:inline-flex; align-items:center; gap:7px; padding:7px 12px; border-radius:999px; font-weight:800;
  background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; white-space:nowrap; }
.ndx-net::before { content:""; width:9px; height:9px; border-radius:50%; background:currentColor; }
.ndx-net.off { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.ndx-net.wait { background:#fffbeb; color:#b45309; border-color:#fde68a; }
#root .ndx.ndx .ndx-net { font-size:${fs(13)}; }
#root .ndx.ndx .ndx-clock { font-size:${fs(21)}; font-weight:900; color:#1e3a5f; font-variant-numeric:tabular-nums;
  padding-inline:12px; border-inline:1px solid #d7e6f7; line-height:1.4; }
.ndx-actions { display:flex; gap:8px; align-items:center; }
.ndx-hbtn { min-height:42px; padding:8px 14px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  font-weight:800; cursor:pointer; white-space:nowrap; transition:background .15s,border-color .15s; }
.ndx-hbtn:hover { background:#eff6ff; border-color:#93c5fd; }
.ndx-hbtn.danger { color:#b91c1c; border-color:#fecaca; background:#fff5f5; }
.ndx-hbtn.danger:hover { background:#fee2e2; }
#root .ndx.ndx .ndx-hbtn { font-size:${fs(13.5)}; }
.ndx-more { display:none; width:42px; height:42px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  cursor:pointer; font-weight:900; }
#root .ndx.ndx .ndx-more { font-size:${fs(20)}; line-height:1; }

/* ── needs attention ── */
.ndx-att { margin-top:14px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; padding:12px 14px;
  box-shadow:0 1px 2px rgba(15,23,42,.04); }
.ndx-att-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
#root .ndx.ndx .ndx-att-title { font-size:${fs(15)}; font-weight:900; color:#0f172a; margin:0; }
.ndx-att-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:8px; }
.ndx-att-item { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:12px; border:1px solid; min-width:0; }
.ndx-att-txt { min-width:0; flex:1; }
#root .ndx.ndx .ndx-att-t { font-size:${fs(14)}; font-weight:800; line-height:1.4; }
#root .ndx.ndx .ndx-att-s { font-size:${fs(12.5)}; color:#64748b; margin-top:2px; }
.ndx-sbtn { border:1px solid #cbd5e1; background:#fff; border-radius:9px; padding:6px 12px; cursor:pointer; font-weight:800;
  color:#1e3a5f; white-space:nowrap; flex-shrink:0; }
.ndx-sbtn:hover { background:#eff6ff; border-color:#93c5fd; }
#root .ndx.ndx .ndx-sbtn { font-size:${fs(13)}; }
.ndx-clear-ok { display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 14px; border-radius:12px;
  background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; font-weight:800; }
#root .ndx.ndx .ndx-clear-ok { font-size:${fs(14)}; }
#root .ndx.ndx .tfs.tfs { margin:14px 0 0; }

/* ── toolbar ── */
.ndx-toolbar { margin:16px 0 4px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.ndx-search { flex:1 1 280px; display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:12px; background:#fff;
  border:1px solid #cfe0f3; box-shadow:0 2px 8px rgba(30,64,120,.05); }
.ndx-search:focus-within { border-color:#60a5fa; box-shadow:0 0 0 3px rgba(59,130,246,.16); }
.ndx-search input { width:100%; min-width:0; border:none; outline:none; background:transparent; color:#0f172a; font-weight:700; font-family:inherit; }
#root .ndx.ndx .ndx-search input { font-size:${fs(15)}; }
#root .ndx.ndx .ndx-sicon { font-size:${fs(16)}; }
.ndx-x { border:none; background:none; color:#94a3b8; cursor:pointer; padding:0 2px; }
#root .ndx.ndx .ndx-x { font-size:${fs(15)}; }
.ndx-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ndx-chip { min-height:40px; padding:6px 14px; border-radius:999px; border:1px solid #cfe0f3; background:#fff; color:#475569;
  font-weight:800; cursor:pointer; }
.ndx-chip:hover { border-color:#93c5fd; }
.ndx-chip.on { background:#2563eb; border-color:#2563eb; color:#fff; }
#root .ndx.ndx .ndx-chip { font-size:${fs(13.5)}; }

/* ── sections ── */
#root .ndx.ndx .ndx-gtitle { font-size:${fs(13)}; margin:18px 2px 9px; font-weight:900; color:#526581; letter-spacing:.06em;
  text-transform:uppercase; display:flex; align-items:center; gap:8px; }
#root .ndx.ndx[dir="rtl"] .ndx-gtitle { letter-spacing:0; }
.ndx-gtitle::after { content:""; flex:1; height:1px; background:#dbe6f3; }
.ndx-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr)); gap:14px; }
.ndx-card { position:relative; border-radius:16px; background:#fff; border:1px solid #e2e8f0;
  box-shadow:0 2px 8px rgba(15,23,42,.05); transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  animation:ndxIn .3s ease both; }
.ndx-card:hover, .ndx-card:focus-within { transform:translateY(-2px); border-color:#93c5fd; box-shadow:0 14px 30px var(--glow, rgba(37,99,235,.2)); }
.ndx-cmain { width:100%; height:100%; min-height:138px; display:flex; flex-direction:column; gap:10px; padding:16px 16px 12px;
  border:none; background:none; cursor:pointer; text-align:start; color:inherit; border-radius:16px; }
.ndx-cmain:focus-visible, .ndx-tool:focus-visible, .ndx-star:focus-visible, .ndx-chip:focus-visible, .ndx-hbtn:focus-visible, .ndx-rrow:focus-visible
  { outline:3px solid rgba(59,130,246,.45); outline-offset:2px; }
/* the everyday card: double width, icon beside the text */
@media (min-width: 620px) {
  .ndx-card.big { grid-column:span 2; }
  .ndx-card.big .ndx-cmain { flex-direction:row; flex-wrap:wrap; align-items:center; column-gap:14px; }
  .ndx-card.big .ndx-ico { width:64px; height:64px; border-radius:16px; }
  .ndx-card.big .ndx-ctxt { flex:1; min-width:0; padding-inline-end:36px; }
  .ndx-card.big .ndx-cfoot { width:100%; }
  #root .ndx.ndx .ndx-card.big .ndx-ico { font-size:${fs(32)}; }
  #root .ndx.ndx .ndx-card.big .ndx-ctitle { font-size:${fs(21)}; }
  #root .ndx.ndx .ndx-card.big .ndx-csub { font-size:${fs(14)}; }
}
.ndx-ico { width:50px; height:50px; border-radius:13px; display:grid; place-items:center; color:#fff; flex-shrink:0; }
#root .ndx.ndx .ndx-ico { font-size:${fs(25)}; line-height:1; }
#root .ndx.ndx .ndx-ctitle { font-size:${fs(17.5)}; font-weight:900; color:#0f172a; line-height:1.25; display:block; }
#root .ndx.ndx .ndx-csub { font-size:${fs(13)}; font-weight:600; color:#64748b; line-height:1.45; display:block; margin-top:4px; }
.ndx-cfoot { margin-top:auto; padding-top:9px; border-top:1px solid #eef2f7; display:flex; align-items:center; gap:6px;
  flex-wrap:wrap; color:#2563eb; font-weight:800; }
#root .ndx.ndx .ndx-cfoot { font-size:${fs(13.5)}; }
.ndx-arrow { margin-inline-start:auto; transition:transform .16s ease; }
.ndx-card:hover .ndx-arrow, .ndx-tool:hover .ndx-arrow { transform:translateX(4px); }
.ndx[dir="rtl"] .ndx-card:hover .ndx-arrow, .ndx[dir="rtl"] .ndx-tool:hover .ndx-arrow { transform:translateX(-4px); }
.ndx-badge { padding:3px 9px; border-radius:999px; font-weight:800; border:1px solid; white-space:nowrap; }
#root .ndx.ndx .ndx-badge { font-size:${fs(12.5)}; }
.ndx-badge.red { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.ndx-badge.amber { background:#fffbeb; color:#b45309; border-color:#fde68a; }
.ndx-badge.green { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
.ndx-badge.blue { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.ndx-star { position:absolute; top:10px; inset-inline-end:10px; width:36px; height:36px; border-radius:10px; border:none;
  background:none; color:#cbd5e1; cursor:pointer; display:grid; place-items:center; }
.ndx-star:hover { background:#f1f5f9; color:#f59e0b; }
.ndx-star.on { color:#f59e0b; }
#root .ndx.ndx .ndx-star { font-size:${fs(20)}; line-height:1; }

/* small one-line cards: tools, recent */
.ndx-tools { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr)); gap:10px; }
.ndx-tool { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:13px; background:#fff; border:1px solid #e2e8f0;
  cursor:pointer; color:#0f172a; text-align:start; min-width:0; transition:border-color .15s, box-shadow .15s; }
.ndx-tool:hover { border-color:#93c5fd; box-shadow:0 6px 16px rgba(37,99,235,.12); }
.ndx-tool .ndx-ico { width:36px; height:36px; border-radius:10px; }
#root .ndx.ndx .ndx-tool .ndx-ico { font-size:${fs(18)}; }
.ndx-tool-txt { min-width:0; flex:1; }
#root .ndx.ndx .ndx-tool-t { font-size:${fs(14.5)}; font-weight:800; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-tool-s { font-size:${fs(12.5)}; color:#64748b; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .ndx-tool .ndx-arrow { font-size:${fs(14)}; color:#2563eb; }

/* report-level search results */
.ndx-rlist { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)); gap:8px; }
.ndx-rrow { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#fff; border:1px solid #e2e8f0;
  cursor:pointer; text-align:start; color:#0f172a; min-width:0; }
.ndx-rrow:hover { border-color:#93c5fd; background:#f8fbff; }
#root .ndx.ndx .ndx-rrow-ic { font-size:${fs(18)}; }

.ndx-empty { margin-top:16px; padding:30px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; text-align:center; color:#64748b; font-weight:700; }
#root .ndx.ndx .ndx-empty, #root .ndx.ndx .ndx-empty div { font-size:${fs(14.5)}; }
#root .ndx.ndx .ndx-empty .ndx-empty-t { font-size:${fs(17)}; font-weight:900; color:#0f172a; margin-bottom:6px; }
#root .ndx.ndx .ndx-foot { font-size:${fs(12)}; margin-top:auto; padding-top:18px; text-align:center; color:#7b8aa1; font-weight:700; }

@keyframes ndxIn { from { opacity:0; } to { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  .ndx-card { animation:none; transition:none; }
  .ndx-card:hover, .ndx-card:focus-within { transform:none; }
  .ndx-arrow { transition:none; }
}

/* ── phone: one compact header row, the buttons fold into ⋮ ── */
@media (max-width: 860px) {
  .ndx-hero { padding:12px; gap:10px; border-radius:14px; }
  .ndx-logo { width:44px; height:44px; border-radius:11px; }
  .ndx-eyebrow, #root .ndx.ndx .ndx-clock { display:none; }
  #root .ndx.ndx .ndx-title { font-size:${fs(18)}; }
  #root .ndx.ndx .ndx-sub { font-size:${fs(12.5)}; margin-top:2px; }
  .ndx-net span { display:none; }
  .ndx-net { padding:8px; }
  .ndx-more { display:grid; place-items:center; }
  .ndx-actions { display:none; position:absolute; top:calc(100% + 8px); inset-inline-end:0; z-index:30; flex-direction:column;
    align-items:stretch; min-width:210px; padding:8px; border-radius:14px; background:#fff; border:1px solid #d7e6f7;
    box-shadow:0 18px 40px rgba(15,23,42,.18); }
  .ndx-actions.open { display:flex; }
  .ndx-cmain { min-height:0; flex-direction:row; flex-wrap:wrap; align-items:center; padding:12px; }
  .ndx-cmain .ndx-ctxt { flex:1; min-width:0; padding-inline-end:34px; }
  .ndx-cfoot { width:100%; }
  .ndx-ico { width:44px; height:44px; }
}
/* ── used by the section hubs (HACCP / ISO …) on top of the dashboard look ── */
.ndx-back { min-height:42px; padding:8px 14px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  font-weight:800; cursor:pointer; white-space:nowrap; }
.ndx-back:hover { background:#eff6ff; border-color:#93c5fd; }
#root .ndx.ndx .ndx-back { font-size:${fs(13.5)}; }
.ndx-count { padding:7px 12px; border-radius:999px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:800; white-space:nowrap; }
#root .ndx.ndx .ndx-count { font-size:${fs(13)}; }
.ndx-card.master { border-color:#fcd34d; background:linear-gradient(180deg,#fffbeb 0%,#ffffff 70%); }
.ndx-card.master:hover, .ndx-card.master:focus-within { border-color:#f59e0b; }
#root .ndx.ndx .ndx-kicker { font-size:${fs(12)}; font-weight:900; color:#b45309; display:block; margin-bottom:3px; letter-spacing:.05em; text-transform:uppercase; }
#root .ndx.ndx[dir="rtl"] .ndx-kicker { letter-spacing:0; }
.ndx-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.ndx-tag { padding:3px 9px; border-radius:999px; background:#fff; border:1px solid #fde68a; color:#92400e; font-weight:700; white-space:nowrap; }
#root .ndx.ndx .ndx-tag { font-size:${fs(12)}; }
/* "+ New" — a second door on a card, straight to the entry form */
.ndx-add { position:absolute; bottom:9px; inset-inline-end:12px; min-height:32px; padding:4px 11px; border-radius:9px;
  border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; font-weight:800; cursor:pointer; }
.ndx-add:hover { background:#dbeafe; border-color:#93c5fd; }
.ndx-add:focus-visible, .ndx-back:focus-visible { outline:3px solid rgba(59,130,246,.45); outline-offset:2px; }
#root .ndx.ndx .ndx-add { font-size:${fs(12.5)}; }
.ndx-card.has-add .ndx-cfoot { padding-inline-end:84px; min-height:34px; }
.ndx-card.has-add .ndx-arrow { display:none; }
@media (max-width: 860px) {
  .ndx-back span { display:none; }
  .ndx-count { display:none; }
}
`;
