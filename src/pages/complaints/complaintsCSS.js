// src/pages/complaints/complaintsCSS.js
// -----------------------------------------------------------------------------
// Shared CSS for every complaints page.
//
// Design language: matches the ISO 22000 & HACCP Command Center
// (see src/pages/haccp and iso/HaccpIsoMenu.jsx) — a light #f8fafc→#eef7f4
// shell, a dark teal→cyan hero, white cards with a 3px teal accent rail, teal
// (#0f766e) as the primary colour and amber (#f59e0b) reserved for the highest
// severity. Radii sit at 10–12px, not the old 20–22px.
//
// Doubled class `.qc.qc` beats the project-wide `#root *{font-size:14px
// !important}` guard (see memory note project_globals_font_size_override).
// Scoped `:has()` rule fixes the overflow-x landmine
// (project_sticky_broken_by_root_overflow).
// -----------------------------------------------------------------------------

export const COMPLAINTS_CSS = `
:root:has(.qc.qc){ overflow-x: clip; }
.qc.qc{
  --teal:#0f766e; --teal-d:#115e59; --cyan:#0891b2;
  --amber:#f59e0b; --amber-d:#b45309;
  --ink:#0f172a; --muted:#475569; --faint:#64748b;
  --line:rgba(15,23,42,.12); --card:#ffffff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Cairo, Arial, sans-serif;
  direction: ltr;
  color: var(--ink);
  background: linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%);
  min-height: 100vh;
  padding: 12px clamp(10px, 2vw, 24px) 40px;
}
.qc.qc .qc-shell{ width: 100%; margin: 0 auto; }

/* ═════ hero — dark teal → cyan, matches the ISO command center ═════ */
.qc.qc .qc-hero{
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.94) 52%, rgba(8,145,178,.92));
  color:#fff; border-radius: 12px; padding: 20px clamp(16px, 1.6vw, 30px);
  border: 1px solid rgba(255,255,255,.20);
  box-shadow: 0 18px 44px rgba(15,23,42,.18);
}
.qc.qc .qc-hero::before{
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,.28), transparent 62%),
    radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,.22), transparent 60%);
}
.qc.qc .qc-hero-top{ position:relative; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap: wrap; }
.qc.qc .qc-hero-title{ font-weight: 1000; font-size: 23px; line-height: 1.15; margin: 0; letter-spacing: -0.01em; }
.qc.qc .qc-hero-sub{ font-size: 13px; color: rgba(255,255,255,.82); margin: 6px 0 0; max-width: 820px; line-height: 1.55; font-weight: 550; }
.qc.qc .qc-hero-actions{ display:flex; gap:8px; flex-wrap: wrap; }

/* ═════ buttons ═════ */
.qc.qc button.qc-btn{
  border:0; cursor:pointer; border-radius: 10px; padding: 10px 16px;
  font-weight: 900; font-family: inherit; display:inline-flex; align-items:center; gap:6px;
  transition: transform .12s ease, box-shadow .16s ease, background .16s ease, opacity .12s ease;
}
.qc.qc button.qc-btn:disabled{ opacity: .5; cursor: not-allowed; }
/* Primary = the teal module accent; the strong CTA of every screen. */
.qc.qc .qc-btn.primary{ background: var(--teal); color:#fff; box-shadow:0 10px 22px rgba(15,118,110,.22); }
.qc.qc .qc-btn.primary:hover{ background: var(--teal-d); transform: translateY(-1px); }
.qc.qc .qc-btn.ghost{ background: rgba(255,255,255,.14); color:#fff; border:1px solid rgba(255,255,255,.28); backdrop-filter: blur(8px); }
.qc.qc .qc-btn.ghost:hover{ background: rgba(255,255,255,.24); }
.qc.qc .qc-btn.blue{ background:#e6f4f3; color: var(--teal-d); border:1px solid #99f6e4; }
.qc.qc .qc-btn.blue:hover{ background:#ccfbf1; }
.qc.qc .qc-btn.teal{ background: var(--teal); color:#fff; }
.qc.qc .qc-btn.teal:hover{ background: var(--teal-d); }
.qc.qc .qc-btn.violet{ background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; }
.qc.qc .qc-btn.violet:hover{ background:#e0e7ff; }
.qc.qc .qc-btn.gray{ background:#eef2f6; color:#334155; border:1px solid var(--line); }
.qc.qc .qc-btn.gray:hover{ background:#e2e8f0; }
.qc.qc .qc-btn.red{ background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
.qc.qc .qc-btn.red:hover{ background:#fee2e2; }

/* ═════ target picker cards (Hub) — ISO module-card style ═════ */
.qc.qc .qc-pick{
  display:grid; grid-template-columns: 1fr 1fr; gap: 14px;
  margin-top: 16px;
}
.qc.qc .qc-pick-card{
  position: relative; overflow: hidden;
  cursor: pointer; border-radius: 12px; padding: 24px 22px 22px; font-family: inherit;
  font-weight: 1000; display:flex; flex-direction:column; align-items:center; gap: 10px;
  background: var(--card); border: 1px solid var(--line);
  box-shadow: 0 6px 18px rgba(15,23,42,.06);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  text-decoration:none; color: var(--ink);
}
.qc.qc .qc-pick-card::before{
  content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px;
  background: var(--teal); opacity:.34; transition: opacity .16s ease;
}
.qc.qc .qc-pick-card:hover{ transform: translateY(-3px); box-shadow: 0 18px 38px rgba(15,23,42,.14); border-color: rgba(15,118,110,.48); }
.qc.qc .qc-pick-card:hover::before{ opacity:1; }
.qc.qc .qc-pick-ic{
  width: 60px; height: 60px; border-radius: 12px; display:grid; place-items:center;
  font-size: 32px; background:#ccfbf1; border:1px solid #99f6e4;
}
.qc.qc .qc-pick-t{ font-size: 19px; font-weight: 1000; }
.qc.qc .qc-pick-en{ font-size: 13px; color: var(--faint); font-weight: 700; }
.qc.qc .qc-pick-sub{ font-size: 13px; color: var(--muted); font-weight: 600; text-align: center; line-height: 1.55; }
.qc.qc .qc-pick-count{
  display:inline-block; padding: 4px 12px; border-radius: 999px; background:#f1f5f9;
  color: var(--muted); font-weight: 900; font-size: 11px; letter-spacing:.04em;
}
@media(max-width:700px){ .qc.qc .qc-pick{ grid-template-columns: 1fr; } }

/* ═════ stats ═════ */
.qc.qc .qc-stats{
  display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px; margin-top: 14px;
}
.qc.qc .qc-stat{
  background: var(--card); border:1px solid var(--line); border-radius: 10px; padding: 12px 14px;
  box-shadow: 0 6px 18px rgba(15,23,42,.06);
  position: relative; overflow: hidden;
}
.qc.qc .qc-stat::before{
  content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width: 3px;
  background: var(--tone, var(--teal)); opacity:.85;
}
.qc.qc .qc-stat b.qc-num{ font-size: 22px; font-weight: 1000; color: var(--ink); }
.qc.qc .qc-stat span{ display:block; font-size: 11px; color: var(--faint); margin-top:2px; font-weight: 800; letter-spacing:.04em; }

/* ═════ toolbar ═════ */
.qc.qc .qc-toolbar{
  margin-top: 14px; background: var(--card); border:1px solid var(--line); border-radius: 10px;
  padding: 12px; display: grid; grid-template-columns: repeat(6, minmax(0,1fr));
  gap: 8px; align-items: end;
  box-shadow: 0 6px 18px rgba(15,23,42,.06);
}
.qc.qc .qc-toolbar label{ font-size: 11px; font-weight: 900; color: var(--faint); display:block; margin-bottom: 4px; text-transform:uppercase; letter-spacing:.06em; }
.qc.qc .qc-toolbar select, .qc.qc .qc-toolbar input{
  width: 100%; height: 36px; border: 1px solid #cbd5e1; border-radius: 8px;
  background:#f8fafc; padding: 0 8px; font-family: inherit; color: var(--ink);
}
.qc.qc .qc-toolbar select:focus, .qc.qc .qc-toolbar input:focus{
  outline:0; border-color: var(--teal); background:#fff; box-shadow: 0 0 0 3px rgba(15,118,110,.14);
}
.qc.qc .qc-toolbar .qc-search{ grid-column: span 2; }
@media (max-width: 900px){
  .qc.qc .qc-toolbar{ grid-template-columns: repeat(2, 1fr); }
  .qc.qc .qc-toolbar .qc-search{ grid-column: span 2; }
}

/* ═════ list container ═════ */
.qc.qc .qc-list{
  margin-top: 14px; background: transparent; border: 0; border-radius: 0;
  overflow: visible; box-shadow: none;
}
.qc.qc .qc-chip{
  display:inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 900;
  font-size: 11px; margin: 1px 3px 1px 0;
}
.qc.qc .qc-sev{
  display:inline-block; min-width: 62px; text-align:center; padding: 3px 8px;
  border-radius: 999px; font-weight: 1000; color:#fff; font-size: 11px;
}
.qc.qc .qc-status{
  display:inline-block; padding: 3px 8px; border-radius: 6px; color:#fff;
  font-weight: 1000; font-size: 11px;
}
.qc.qc .qc-target{
  display:inline-block; padding: 3px 8px; border-radius: 6px; color:#fff; font-weight: 1000; font-size: 11px;
}
.qc.qc .qc-empty{
  text-align:center; color: var(--faint); padding: 34px; font-weight: 800;
  background: var(--card); border:1px solid var(--line); border-radius: 10px;
}

.qc.qc .qc-actions-cell{ display:flex; gap:6px; flex-wrap: wrap; }
.qc.qc .qc-actions-cell button{
  border:0; cursor:pointer; border-radius: 8px; padding: 6px 11px; font-family: inherit;
  font-weight: 900; font-size: 12px; min-height: 32px;
  display:inline-flex; align-items:center; gap: 5px; line-height: 1;
}
.qc.qc .qc-actions-cell button .qc-act-ic{ font-size: 13px; }
@media(max-width:520px){ .qc.qc .qc-actions-cell button{ flex: 1 1 auto; justify-content:center; } }

/* ═════ case cards — stacked full-width list rows (one under another) ═════ */
.qc.qc .qc-case-grid{ display:flex; flex-direction:column; gap:10px; padding: 2px 0; }
.qc.qc .qc-case{
  position: relative; overflow: hidden;
  background: var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 18px 14px 20px;
  display:grid; grid-template-columns: 1fr auto; align-items:center; gap:10px 18px;
  box-shadow:0 4px 14px rgba(15,23,42,.05);
  transition:transform .12s ease, box-shadow .16s ease, border-color .16s ease;
}
.qc.qc .qc-case::before{
  content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:4px;
  background: var(--teal); opacity:.5; transition: opacity .16s ease;
}
.qc.qc .qc-case:hover{ box-shadow:0 12px 26px rgba(15,23,42,.12); border-color: rgba(15,118,110,.48); }
.qc.qc .qc-case:hover::before{ opacity:1; }
/* Left column: title block stacks; meta + reasons flow beneath it. */
.qc.qc .qc-case-top{ display:flex; justify-content:flex-start; align-items:center; gap:10px; flex-wrap:wrap; grid-column:1; }
.qc.qc .qc-case h3{ margin:2px 0; font-size:15.5px; line-height:1.3; color: var(--ink); font-weight:1000; grid-column:1; }
.qc.qc .qc-case-cats{ grid-column:1; min-height:0; display:flex; flex-wrap:wrap; align-items:center; gap:4px; }
/* Right column: severity/status on top, action buttons under them. */
.qc.qc .qc-case-bottom{ grid-column:2; grid-row:1 / span 3; display:flex; flex-direction:column; align-items:flex-end; justify-content:center; gap:8px; border:0; padding:0; margin:0; }
.qc.qc .qc-case-ref{ color: var(--faint); font:700 11px ui-monospace,SFMono-Regular,Consolas,monospace; direction:ltr; }
.qc.qc .qc-case-party{ color: var(--muted); font-size:13px; font-weight:800; }
.qc.qc .qc-case-repeat{ background: #ffedd5; color: var(--amber-d); border: 1px solid #fed7aa; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 900; }
@media(max-width:760px){
  .qc.qc .qc-case{ grid-template-columns: 1fr; }
  .qc.qc .qc-case-bottom{ grid-column:1; grid-row:auto; align-items:flex-start; flex-direction:row; flex-wrap:wrap; padding-top:10px; border-top:1px solid rgba(15,23,42,.09); }
}

/* ═════ form / view page shell ═════ */
.qc.qc .qc-page{
  background: var(--card); border:1px solid var(--line); border-radius: 12px;
  margin-top: 14px; padding: 18px 22px; box-shadow: 0 6px 18px rgba(15,23,42,.06);
}
.qc.qc .qc-page-actions{
  position: sticky; bottom: 0; z-index: 5;
  margin-top: 18px; padding: 12px 0 0; border-top: 1px solid #e2e8f0;
  background: linear-gradient(180deg, transparent, #fff 40%);
  display:flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;
}

.qc.qc .qc-grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.qc.qc .qc-grid.three{ grid-template-columns: repeat(3, 1fr); }
@media (max-width: 780px){ .qc.qc .qc-grid, .qc.qc .qc-grid.three{ grid-template-columns: 1fr; } }
.qc.qc .qc-field label{ display:block; font-weight: 900; font-size: 12px; color:#334155; margin-bottom: 4px; }
.qc.qc .qc-field input, .qc.qc .qc-field select, .qc.qc .qc-field textarea{
  width:100%; padding: 11px 13px; border: 1px solid #cbd5e1; border-radius: 10px;
  background:#ffffff; font-family: inherit; color: var(--ink);
  transition: border-color .12s ease, box-shadow .12s ease, background .12s ease;
}
.qc.qc .qc-field input:focus, .qc.qc .qc-field select:focus, .qc.qc .qc-field textarea:focus{
  outline: 0; border-color: var(--teal); background:#fff;
  box-shadow: 0 0 0 3px rgba(15,118,110,.16);
}
/* Deliberately generous complaint textarea. Font-size uses !important to beat
   the project-wide font-size guard so users can read what they type. */
.qc.qc .qc-field textarea{
  min-height: 180px; resize: vertical; line-height: 1.85;
  direction: ltr; text-align: left;
  font-size: 15px !important;
  padding: 14px 16px;
  background:#f8fefd;
  box-shadow: inset 0 2px 4px rgba(15, 23, 42, .04);
}
.qc.qc textarea.qc-longtext{
  min-height: 320px !important;
  font-size: 16px !important;
  line-height: 1.95;
  padding: 18px 20px;
  border-radius: 12px;
  background:#fff;
  border: 1px solid #99f6e4;
  box-shadow: 0 6px 18px rgba(15,118,110,.08), inset 0 2px 4px rgba(15,23,42,.03);
}
.qc.qc textarea.qc-longtext:focus{
  border-color: var(--teal);
  box-shadow: 0 6px 18px rgba(15,118,110,.14), 0 0 0 3px rgba(15,118,110,.18);
}
.qc.qc .qc-block{
  border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-top: 12px;
  background: #fbfdfd;
}
.qc.qc .qc-block h4{
  margin: 0 0 10px; font-size: 13px; color: var(--ink); font-weight: 1000;
  display:flex; align-items:center; gap: 6px; justify-content: space-between;
}
.qc.qc .qc-block h4 .qc-h4-r{ display:flex; align-items:center; gap:8px; }

/* ═════ items table ═════ */
.qc.qc .qc-items{ width:100%; border-collapse: collapse; }
.qc.qc .qc-items th, .qc.qc .qc-items td{
  padding: 6px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px;
  vertical-align: middle;
}
.qc.qc .qc-items th{ background:#ecfdf5; color: var(--teal-d); font-weight: 1000; }
.qc.qc .qc-items input, .qc.qc .qc-items select{
  width:100%; padding: 6px 8px; border: 1px solid transparent; border-radius: 6px;
  background: transparent; font-family: inherit; font-size: 12px;
}
.qc.qc .qc-items input:focus, .qc.qc .qc-items select:focus{
  outline: none; border-color: var(--teal); background:#fff;
}
.qc.qc .qc-items button.qc-rm{
  background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:6px;
  padding: 2px 8px; cursor: pointer; font-weight: 900;
}

/* ═════ categories ═════ */
.qc.qc .qc-cats{ display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.qc.qc .qc-cat{
  display:flex; align-items:center; gap: 8px; padding: 10px 12px;
  border-radius: 10px; border: 1px solid var(--line); background:#f8fafc;
  cursor: pointer; font-weight: 900; font-size: 13px; user-select: none;
  transition: all .12s ease;
}
.qc.qc .qc-cat:hover{ transform: translateY(-1px); box-shadow: 0 6px 14px rgba(15,23,42,.08); }
.qc.qc .qc-cat.on{ color:#fff; }
.qc.qc .qc-cat.on .qc-cat-ic{ background: rgba(255,255,255,.24); }
.qc.qc .qc-cat-ic{
  width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  background:#fff; font-size: 18px; flex: 0 0 auto;
}
.qc.qc .qc-cat input{ display:none; }

/* ═════ severity ═════ */
.qc.qc .qc-sevpick{ display:flex; gap: 6px; }
.qc.qc .qc-sevpick button{
  border:0; border-radius: 999px; padding: 8px 14px; font-family: inherit; font-weight: 1000;
  cursor: pointer; background:#f1f5f9; color: var(--ink);
}
.qc.qc .qc-sevpick button.on{ color:#fff; box-shadow: 0 6px 14px rgba(0,0,0,.14); }

/* ═════ photos ═════ */
.qc.qc .qc-photos{ display:grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.qc.qc .qc-thumb{
  position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 1/1;
  background:#e2e8f0; border: 1px solid #cbd5e1;
  transition: transform .12s ease, box-shadow .12s ease;
}
.qc.qc .qc-thumb:hover{ transform: scale(1.02); box-shadow: 0 10px 20px rgba(15,23,42,.16); }
.qc.qc .qc-thumb img{ width:100%; height:100%; object-fit: cover; }
.qc.qc .qc-thumb .qc-thumb-rm{
  position: absolute; top: 4px; left: 4px; background: rgba(220,38,38,.9);
  color:#fff; border:0; padding: 2px 7px; border-radius: 999px; font-weight: 1000;
  cursor:pointer; font-family: inherit; font-size: 11px;
}
.qc.qc .qc-uploader{
  display:flex; align-items:center; gap: 10px; margin-top: 8px; flex-wrap: wrap;
  font-size: 12px; color: var(--faint);
}
.qc.qc .qc-uploader label.qc-file{
  cursor: pointer; padding: 10px 18px; background:#ccfbf1;
  border-radius: 10px; color: var(--teal-d); font-weight: 1000; font-size: 14px;
  display:inline-flex; align-items:center; gap:6px;
  border: 1px solid #99f6e4;
  box-shadow: 0 6px 14px rgba(15,118,110,.14);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.qc.qc .qc-uploader label.qc-file:hover{
  background:#a7f3e6;
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15,118,110,.20);
}
.qc.qc .qc-uploader label.qc-file:active{ transform: translateY(0); }
.qc.qc .qc-uploader progress{ height: 8px; border-radius: 999px; }

/* ═════ alerts ═════ */
.qc.qc .qc-alert{
  padding: 10px 12px; border-radius: 10px; font-weight: 900; font-size: 12.5px; margin-bottom: 8px;
  display:flex; align-items:center; gap: 6px;
}
.qc.qc .qc-alert.warn{ background:#fef3c7; color:#78350f; border: 1px solid #fde68a; }
.qc.qc .qc-alert.err{ background:#fee2e2; color:#7f1d1d; border: 1px solid #fecaca; }
.qc.qc .qc-alert.ok{ background:#dcfce7; color:#065f46; border: 1px solid #86efac; }
.qc.qc .qc-alert.info{ background:#ecfdf5; color: var(--teal-d); border: 1px solid #99f6e4; }

/* ═════ view ═════ */
.qc.qc .qc-view h3{ margin: 0 0 6px; font-weight: 1000; }
.qc.qc .qc-view p{ margin: 2px 0; }
.qc.qc .qc-view .qc-view-desc{ white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 10px; border:1px solid #e2e8f0; line-height: 1.85; }

/* ═════ radar (repeat-offender panel) ═════ */
@media(max-width:760px){ .qc.qc .qc-radar-grid{ grid-template-columns: 1fr !important; } }

/* ═════ status change bar ═════ */
.qc.qc .qc-status-bar{
  display:flex; gap:6px; flex-wrap: wrap; align-items: center; margin-top: 8px;
}
.qc.qc .qc-status-bar button{
  border:0; cursor:pointer; padding: 6px 12px; border-radius: 999px;
  font-family: inherit; font-weight: 900; font-size: 12px; color:#fff;
  opacity: .55; transition: opacity .12s ease;
}
.qc.qc .qc-status-bar button.on{ opacity: 1; box-shadow: 0 6px 14px rgba(0,0,0,.15); }
`;
