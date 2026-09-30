// src/companies/exaltis/reports/ncr/ncrStyles.js
// Non-conformance entry — style sheet.
// (Split out of NonConformanceReportInput.jsx — the code is unchanged.)

/* =========================
   Stylesheet
   -------------------------
   globals.css sets `#root * { font-size: 14px !important }`, so every size
   here has to come from a selector that both outranks it and carries
   !important — hence the `#root .ncr` prefix on the type rules. The
   `:has()` line is the standard escape for the same file's
   `overflow-x: hidden`, which otherwise kills the sticky action bar.
========================= */
export const NCR_CSS = `
html:has(.ncr), body:has(.ncr), #root:has(.ncr) { overflow-x: clip; }

#root .ncr {
  --ncr-bg:      #f1f6fb;
  --ncr-card:    #ffffff;
  --ncr-line:    #e2e8f0;
  --ncr-line-2:  #cbd5e1;
  --ncr-ink:     #0f172a;
  --ncr-muted:   #64748b;
  --ncr-accent:  #0284c7;
  --ncr-accent-soft: #e0f2fe;
  --ncr-danger:  #dc2626;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 12px 60px;
  color: var(--ncr-ink);
  font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif;
}

/* ---------- action bar ---------- */
#root .ncr .ncr-bar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 14px; margin-bottom: 14px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--ncr-line);
  border-radius: 16px;
  box-shadow: 0 6px 22px rgba(2,6,23,.08);
}
#root .ncr .ncr-bar-title { font-size: 18px !important; font-weight: 800; line-height: 1.15; }
#root .ncr .ncr-bar-title small { display: block; font-size: 12px !important; font-weight: 700; color: var(--ncr-muted); direction: rtl; }
#root .ncr .ncr-spacer { flex: 1 1 auto; }

#root .ncr .ncr-ref {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--ncr-accent-soft); color: #075985;
  border: 1px solid #bae6fd;
  font-weight: 800; font-size: 13px !important;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  letter-spacing: .3px;
}
#root .ncr .ncr-ref.is-pending { background: #f8fafc; color: var(--ncr-muted); border-color: var(--ncr-line); font-family: inherit; letter-spacing: 0; }

/* ---------- status stepper ---------- */
#root .ncr .ncr-steps { display: inline-flex; padding: 3px; gap: 3px; background: #f1f5f9; border: 1px solid var(--ncr-line); border-radius: 999px; }
#root .ncr .ncr-step {
  border: 0; cursor: pointer; border-radius: 999px;
  padding: 7px 14px; background: transparent; color: var(--ncr-muted);
  font-weight: 800; font-size: 13px !important; line-height: 1.1;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
}
#root .ncr .ncr-step small { font-size: 10px !important; font-weight: 700; opacity: .85; direction: rtl; }
#root .ncr .ncr-step[data-on="1"] { background: var(--step-color); color: #fff; box-shadow: 0 4px 12px rgba(2,6,23,.16); }

/* ---------- buttons ---------- */
#root .ncr .ncr-btn {
  border: 0; cursor: pointer; border-radius: 12px;
  padding: 10px 18px; font-weight: 800; font-size: 14px !important;
  background: var(--ncr-accent); color: #fff;
  box-shadow: 0 6px 16px rgba(2,132,199,.28);
}
#root .ncr .ncr-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
#root .ncr .ncr-btn.ghost { background: #fff; color: var(--ncr-ink); border: 1px solid var(--ncr-line-2); box-shadow: none; }
#root .ncr .ncr-btn.sky { background: #0ea5e9; }
#root .ncr .ncr-btn.small { padding: 7px 12px; font-size: 13px !important; }

/* ---------- cards ---------- */
#root .ncr .ncr-card {
  background: var(--ncr-card);
  border: 1px solid var(--ncr-line);
  border-radius: 18px;
  margin-bottom: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(2,6,23,.04);
}
#root .ncr .ncr-card-head {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--ncr-line);
  background: linear-gradient(180deg,#f8fbff,#f1f6fb);
}
#root .ncr .ncr-num {
  flex: 0 0 auto; width: 26px; height: 26px; border-radius: 9px;
  display: grid; place-items: center;
  background: var(--ncr-accent); color: #fff;
  font-weight: 900; font-size: 13px !important;
}
#root .ncr .ncr-card-title { font-size: 15px !important; font-weight: 800; line-height: 1.2; }
#root .ncr .ncr-card-title small { display: block; font-size: 12px !important; font-weight: 700; color: var(--ncr-muted); direction: rtl; }
#root .ncr .ncr-card-body { padding: 16px; }
#root .ncr .ncr-card.is-locked .ncr-num { background: var(--ncr-muted); }

#root .ncr .ncr-badge {
  margin-inline-start: auto;
  padding: 4px 10px; border-radius: 999px;
  font-size: 11px !important; font-weight: 800;
  background: #fef2f2; color: var(--ncr-danger); border: 1px solid #fecaca;
}
#root .ncr .ncr-badge.calm { background: #f1f5f9; color: var(--ncr-muted); border-color: var(--ncr-line); }

/* ---------- fields ---------- */
#root .ncr .ncr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
#root .ncr .ncr-grid.wide { grid-template-columns: 1fr; }
#root .ncr .ncr-f { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
#root .ncr .ncr-f.span2 { grid-column: span 2; }
#root .ncr .ncr-lbl { font-size: 12px !important; font-weight: 800; color: #334155; letter-spacing: .2px; }
#root .ncr .ncr-lbl span { color: var(--ncr-muted); font-weight: 700; }
#root .ncr .ncr-lbl b { color: var(--ncr-danger); }

#root .ncr input[type="text"],
#root .ncr input[type="date"],
#root .ncr select,
#root .ncr textarea {
  width: 100%; box-sizing: border-box;
  border: 1px solid var(--ncr-line-2); border-radius: 11px;
  padding: 11px 12px; background: #fff; color: var(--ncr-ink);
  font-size: 14px !important; font-weight: 600; font-family: inherit;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
#root .ncr textarea { min-height: 120px; resize: vertical; line-height: 1.55; font-weight: 500; }
#root .ncr input:focus, #root .ncr select:focus, #root .ncr textarea:focus {
  border-color: var(--ncr-accent); box-shadow: 0 0 0 3px rgba(2,132,199,.14);
}
#root .ncr input[readonly] { background: #f8fafc; color: var(--ncr-muted); font-family: ui-monospace, Menlo, Consolas, monospace; }
#root .ncr .is-missing input, #root .ncr .is-missing select, #root .ncr .is-missing textarea {
  border-color: #fca5a5; background: #fff7f7;
}
#root .ncr .ncr-hint { font-size: 11px !important; font-weight: 700; color: var(--ncr-muted); }

/* ---------- check / radio pills ---------- */
#root .ncr .ncr-pills { display: flex; flex-wrap: wrap; gap: 10px; }
#root .ncr .ncr-pill {
  display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  padding: 9px 14px; border-radius: 12px;
  border: 1px solid var(--ncr-line-2); background: #fff;
  font-size: 13px !important; font-weight: 700; line-height: 1.2;
}
#root .ncr .ncr-pill small { color: var(--ncr-muted); font-size: 11px !important; direction: rtl; }
#root .ncr .ncr-pill[data-on="1"] { border-color: var(--ncr-accent); background: var(--ncr-accent-soft); color: #075985; }
#root .ncr .ncr-pill[data-on="1"].bad { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
#root .ncr .ncr-pill[data-on="1"].good { border-color: #6ee7b7; background: #ecfdf5; color: #065f46; }
#root .ncr .ncr-pill input { width: 16px; height: 16px; accent-color: var(--ncr-accent); margin: 0; }

/* ---------- document control ---------- */
#root .ncr .ncr-doc { margin-bottom: 14px; border: 1px solid var(--ncr-line); border-radius: 16px; background: #fff; overflow: hidden; }
#root .ncr .ncr-doc > summary {
  list-style: none; cursor: pointer;
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  font-size: 13px !important; font-weight: 800; color: #334155;
}
#root .ncr .ncr-doc > summary::-webkit-details-marker { display: none; }
#root .ncr .ncr-doc-logo { height: 34px; width: auto; object-fit: contain; }
#root .ncr .ncr-doc-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 24px; padding: 4px 16px 16px; border-top: 1px solid var(--ncr-line); }
#root .ncr .ncr-doc-kv div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--ncr-line); font-size: 12px !important; }
#root .ncr .ncr-doc-kv div span:first-child { color: var(--ncr-muted); font-weight: 700; }
#root .ncr .ncr-doc-kv div span:last-child { font-weight: 800; }

/* ---------- guidance ---------- */
#root .ncr .ncr-guide {
  display: grid; gap: 5px; margin-bottom: 14px; padding: 12px 16px;
  border: 1px solid #fed7aa; background: #fff7ed; border-radius: 14px;
  color: #7c2d12; font-size: 12px !important; line-height: 1.5;
}
#root .ncr .ncr-guide b { font-size: 13px !important; }
#root .ncr .ncr-guide .ar { direction: rtl; text-align: right; font-weight: 700; }

/* ---------- evidence ---------- */
#root .ncr .ncr-shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin-top: 14px; }
#root .ncr .ncr-shot { position: relative; border: 1px solid var(--ncr-line); border-radius: 14px; overflow: hidden; background: #0b1220; }
#root .ncr .ncr-shot img { width: 100%; height: 150px; object-fit: cover; display: block; }
#root .ncr .ncr-shot .n { position: absolute; left: 8px; bottom: 8px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,.92); font-size: 11px !important; font-weight: 800; }
#root .ncr .ncr-shot .x { position: absolute; top: 8px; right: 8px; border: 0; cursor: pointer; padding: 5px 9px; border-radius: 10px; background: rgba(220,38,38,.95); color: #fff; font-size: 11px !important; font-weight: 800; }
#root .ncr .ncr-empty { padding: 22px; text-align: center; border: 1px dashed var(--ncr-line-2); border-radius: 14px; color: var(--ncr-muted); font-size: 13px !important; font-weight: 700; }

/* ---------- footer ---------- */
#root .ncr .ncr-foot { margin-top: 6px; padding: 14px; text-align: center; border-radius: 14px; background: #f8fafc; border: 1px solid var(--ncr-line); font-size: 12px !important; font-weight: 700; color: #475569; }
#root .ncr .ncr-msg { font-size: 13px !important; font-weight: 800; }

@media (max-width: 640px) {
  #root .ncr .ncr-bar { position: static; }
  #root .ncr .ncr-f.span2 { grid-column: span 1; }
}
@media print {
  #root .ncr .ncr-bar, #root .ncr .ncr-btn { display: none !important; }
  #root .ncr .ncr-card { break-inside: avoid; box-shadow: none; }
}
`;
