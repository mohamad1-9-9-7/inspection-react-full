// src/pages/monitor/DailyMonitorDashboard.jsx
// /monitor — the Daily Reports hub: a short "how daily recording works" guide,
// the critical limits staff check against, then every branch as a card that
// says what is recorded there and opens today's forms (/monitor/<slug>).
// Full width on purpose — the owner wants the hub to fill the screen.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { branchAllowed } from "../../utils/perms";

/* Branches with a real entry page behind them. POS 7/14/16/17/18/21/25/31/34/
   35/36/37/38/41/42/43/44/45 were listed here too, but /monitor/<slug> has no
   route for any of them — every one of those tiles landed on the "هذه صفحة
   مؤقتة" placeholder. POS 24 and POS 26 are gone because the branches closed
   — their routes and past reports are still reachable by URL. POS 6 is kept on
   purpose: the branch goes live later, and adding its route is all it needs.

   `forms` = the main forms of that hub, shown as a preview on the card (the
   hub itself is the full list). */
const BUTCHERY_ABOUT = "Butchery shop — staff hygiene, cold storage, deliveries and product traceability.";
const BUTCHERY_FORMS = ["Personal Hygiene", "Temperature", "Receiving Log", "Traceability", "Daily Cleaning", "Pest Control"];
const branches = [
  { id: "QCS",        label: "QCS",              type: "qcs",
    about: "Central quality control — incoming shipments, cold rooms and non-conformances.",
    forms: ["Raw Material Receipt", "Coolers Temperatures", "Personal Hygiene", "NCR / CAPA", "Stock Rotation"] },
  { id: "PRODUCTION", label: "Production",       type: "prod",
    about: "Production floor — hygiene, defrosting, cutting and sanitation.",
    forms: ["Personal Hygiene", "Cleaning", "Defrosting", "Cutting", "Traceability", "Sanitizer"] },
  { id: "POS 6",      label: "POS 6",            type: "pos",
    about: BUTCHERY_ABOUT,
    forms: ["Personal Hygiene", "Cleaning", "Equipment", "Receiving Log", "Coolers"] },
  { id: "POS 10",     label: "POS 10",           type: "pos", about: BUTCHERY_ABOUT, forms: BUTCHERY_FORMS },
  { id: "POS 11",     label: "POS 11",           type: "pos", about: BUTCHERY_ABOUT, forms: BUTCHERY_FORMS },
  { id: "POS 15",     label: "POS 15",           type: "pos", about: BUTCHERY_ABOUT, forms: BUTCHERY_FORMS },
  { id: "POS 19",     label: "Al Warqa Kitchen", type: "kitchen",
    about: "Central kitchen — cooking, cooling, hot holding and HACCP critical points.",
    forms: ["Receiving Log", "Cooking Temp", "Cooling", "Hot Holding", "Personal Hygiene", "Oil Quality"] },
  { id: "FTR 1",      label: "FTR 1",            type: "ftr",
    about: "Food truck — Mushrif Park.",
    forms: ["Personal Hygiene", "Temperature", "Oil Calibration", "Receiving Log", "Cooking Temp"] },
  { id: "FTR 2",      label: "FTR 2",            type: "ftr",
    about: "Food truck — Mamzar Park.",
    forms: ["Personal Hygiene", "Temperature", "Oil Calibration", "Receiving Log", "Cooking Temp"] },
];

const toSlug = (id) => id.trim().toLowerCase().replace(/\s+/g, "");
const CHIPS_SHOWN = 4;

/* In the order the hub lists them; same `title` = same group row. */
const GROUPS = [
  { type: "qcs",     title: "Central",     icon: "🛡️", tag: "Quality Control", color: "#0d9488", soft: "#ccfbf1" },
  { type: "prod",    title: "Central",     icon: "🏭", tag: "Processing",      color: "#7c3aed", soft: "#ede9fe" },
  { type: "pos",     title: "Butcheries",  icon: "🥩", tag: "Butchery",        color: "#2563eb", soft: "#dbeafe" },
  { type: "kitchen", title: "Kitchen",     icon: "👨‍🍳", tag: "Kitchen · POS 19", color: "#ea580c", soft: "#ffedd5" },
  { type: "ftr",     title: "Food trucks", icon: "🚚", tag: "Food truck",      color: "#ca8a04", soft: "#fef9c3" },
];
const META = Object.fromEntries(GROUPS.map((g) => [g.type, g]));

const STEPS = [
  { icon: "📍", title: "Pick your branch",   text: "Only the branches assigned to your account are listed below." },
  { icon: "✏️", title: "Record as you check", text: "Fill each form at the time of the check — not from memory at the end of the shift." },
  { icon: "⚠️", title: "Mark C / NC",        text: "Every NC (non-conforming) item needs the action taken written in Remarks." },
  { icon: "✍️", title: "Sign and save",      text: "Fill Checked by / Verified by, then save. One sheet per form per day — reopening the date edits it." },
];

const LIMITS = [
  { icon: "❄️", label: "Chilled",      value: "0 – 5 °C" },
  { icon: "🧊", label: "Frozen",       value: "≤ −18 °C" },
  { icon: "🔥", label: "Cooking core", value: "≥ 75 °C" },
  { icon: "♨️", label: "Hot holding",  value: "≥ 60 °C" },
];

/* Scoped stylesheet. The old one reset `*` and restyled `body`, which leaked
   into every other screen while this one was mounted. Sizes are doubled-class
   + !important because globals.css forces #root * to 14px (--app-fs scales). */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .dm.dm { min-height:100vh; background:#f4f8fd; color:#0f172a; padding:20px clamp(12px,3vw,36px) 48px; }
#root .dm.dm .dm-in { width:100%; }

#root .dm.dm .dm-hero { position:relative; overflow:hidden; display:flex; justify-content:space-between; align-items:center; gap:18px; flex-wrap:wrap;
  background:linear-gradient(120deg,#e0f2fe 0%,#eef6ff 45%,#ecfdf5 100%); border:1px solid #cfe3f7; border-radius:18px; padding:22px clamp(16px,3vw,30px); }
#root .dm.dm .dm-eyebrow { font-size:${fs(11)}; font-weight:900; letter-spacing:.14em; color:#0369a1; text-transform:uppercase; }
#root .dm.dm .dm-title { font-size:${fs(28)}; font-weight:900; color:#0f172a; margin:6px 0 0; line-height:1.15; }
#root .dm.dm .dm-lead { font-size:${fs(14)}; color:#475569; font-weight:600; margin-top:8px; max-width:560px; line-height:1.55; }
#root .dm.dm .dm-today { background:#fff; border:1px solid #d6e6f5; border-radius:14px; padding:12px 16px; min-width:220px; box-shadow:0 4px 14px rgba(14,116,144,.07); }
#root .dm.dm .dm-today-k { font-size:${fs(11)}; font-weight:800; color:#64748b; letter-spacing:.08em; text-transform:uppercase; }
#root .dm.dm .dm-today-v { font-size:${fs(16)}; font-weight:900; color:#0f172a; margin-top:3px; }
#root .dm.dm .dm-today-s { font-size:${fs(12)}; font-weight:700; color:#0369a1; margin-top:6px; }

#root .dm.dm .dm-guide { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:12px; margin-top:14px; }
#root .dm.dm .dm-panel { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:14px 16px; }
#root .dm.dm .dm-panel-t { font-size:${fs(12)}; font-weight:900; color:#334155; letter-spacing:.08em; text-transform:uppercase; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
#root .dm.dm .dm-steps { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
#root .dm.dm .dm-step { background:#f8fbff; border:1px solid #e6eef8; border-radius:12px; padding:10px 12px; }
#root .dm.dm .dm-step-h { display:flex; align-items:center; gap:8px; }
#root .dm.dm .dm-step-n { width:22px; height:22px; border-radius:999px; background:#0ea5e9; color:#fff; display:grid; place-items:center; font-size:${fs(12)}; font-weight:900; flex-shrink:0; }
#root .dm.dm .dm-step-t { font-size:${fs(13)}; font-weight:900; color:#0f172a; }
#root .dm.dm .dm-step-x { font-size:${fs(12)}; color:#64748b; font-weight:600; line-height:1.5; margin-top:6px; }
#root .dm.dm .dm-limits { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
#root .dm.dm .dm-limit { display:flex; align-items:center; gap:8px; background:#f0fdfa; border:1px solid #ccfbf1; border-radius:10px; padding:8px 10px; }
#root .dm.dm .dm-limit-i { font-size:${fs(18)}; }
#root .dm.dm .dm-limit-l { font-size:${fs(11)}; font-weight:800; color:#0f766e; text-transform:uppercase; letter-spacing:.05em; }
#root .dm.dm .dm-limit-v { font-size:${fs(15)}; font-weight:900; color:#0f172a; }
#root .dm.dm .dm-note { font-size:${fs(11.5)}; color:#64748b; font-weight:600; margin-top:8px; line-height:1.5; }

#root .dm.dm .dm-group { margin:24px 0 10px; display:flex; align-items:center; gap:10px; }
#root .dm.dm .dm-group-t { font-size:${fs(13)}; font-weight:900; color:#334155; letter-spacing:.08em; text-transform:uppercase; }
#root .dm.dm .dm-group-n { font-size:${fs(11)}; font-weight:900; color:#0369a1; background:#e0f2fe; border-radius:999px; padding:2px 9px; }
#root .dm.dm .dm-group::after { content:""; flex:1; height:1px; background:#dbe5f0; }
#root .dm.dm .dm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:12px; }

#root .dm.dm .dm-card { position:relative; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px 16px 14px; display:flex; flex-direction:column; gap:12px;
  box-shadow:0 1px 2px rgba(15,23,42,.04); transition:border-color .15s, box-shadow .15s, transform .15s; }
#root .dm.dm .dm-card::before { content:""; position:absolute; inset:0 0 auto 0; height:4px; border-radius:16px 16px 0 0; background:var(--cc); opacity:.85; }
#root .dm.dm .dm-card:hover { border-color:color-mix(in srgb, var(--cc) 45%, #e2e8f0); box-shadow:0 10px 24px rgba(15,23,42,.08); transform:translateY(-2px); }
#root .dm.dm .dm-top { display:flex; align-items:center; gap:12px; }
#root .dm.dm .dm-icon { width:48px; height:48px; flex-shrink:0; border-radius:14px; display:grid; place-items:center; background:var(--cs); font-size:${fs(24)}; }
#root .dm.dm .dm-name { font-size:${fs(17)}; font-weight:900; color:#0f172a; line-height:1.2; }
#root .dm.dm .dm-tag { display:inline-block; font-size:${fs(11)}; font-weight:800; color:var(--cc); background:var(--cs); border-radius:999px; padding:2px 9px; margin-top:4px; }
#root .dm.dm .dm-about { font-size:${fs(13)}; color:#475569; font-weight:600; line-height:1.5; }
#root .dm.dm .dm-forms-k { font-size:${fs(11)}; font-weight:800; color:#94a3b8; letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px; }
#root .dm.dm .dm-chips { display:flex; flex-wrap:wrap; gap:6px; }
#root .dm.dm .dm-chip { font-size:${fs(12)}; font-weight:700; color:#334155; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:3px 8px; }
#root .dm.dm .dm-chip-more { color:#64748b; background:#fff; border-style:dashed; }
#root .dm.dm .dm-actions { display:flex; gap:8px; margin-top:auto; padding-top:4px; }
#root .dm.dm .dm-btn { flex:1; min-height:44px; border-radius:11px; font-size:${fs(13.5)}; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-family:inherit; transition:filter .15s, background .15s, color .15s; }
#root .dm.dm .dm-btn-enter { background:var(--cc); color:#fff; border:1px solid var(--cc); }
#root .dm.dm .dm-btn-enter:hover { filter:brightness(1.08); }
#root .dm.dm .dm-btn:focus-visible { outline:3px solid #93c5fd; outline-offset:2px; }
#root .dm.dm .dm-empty { margin-top:18px; padding:40px 16px; text-align:center; color:#64748b; font-weight:700; font-size:${fs(14)}; background:#fff; border:1px dashed #cbd5e1; border-radius:14px; }

@media (max-width: 1020px) {
  #root .dm.dm .dm-guide { grid-template-columns:1fr; }
  #root .dm.dm .dm-steps { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width: 560px) {
  #root .dm.dm .dm-title { font-size:${fs(22)}; }
  #root .dm.dm .dm-today { min-width:0; width:100%; }
  #root .dm.dm .dm-steps { grid-template-columns:1fr; }
}
`;

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dubai = (opts) => {
    try { return now.toLocaleString("en-AE", { timeZone: "Asia/Dubai", ...opts }); }
    catch { return now.toLocaleString("en-GB", opts); }
  };

  /* perms.js is the single source of truth for allowedBranches. */
  const visibleBranches = branches.filter((b) => branchAllowed("daily", b.id));
  const isRestrictedToBranches = visibleBranches.length < branches.length;

  /* QCS + Production share the "Central" row; the rest get one group each. */
  const sections = [];
  GROUPS.forEach((g) => {
    const items = visibleBranches.filter((b) => b.type === g.type);
    if (!items.length) return;
    const last = sections[sections.length - 1];
    if (last && last.title === g.title) last.items.push(...items);
    else sections.push({ title: g.title, items: [...items] });
  });

  return (
    <div className="dm">
      <style>{CSS}</style>
      <div className="dm-in">
        <header className="dm-hero">
          <div>
            <div className="dm-eyebrow">Food safety · Daily records</div>
            <h1 className="dm-title">Daily Reports Hub</h1>
            <div className="dm-lead">
              Choose a branch to fill in today's checks.
              Accurate daily records are the evidence for every audit and inspection.
            </div>
          </div>
          <div className="dm-today">
            <div className="dm-today-k">Today · Dubai</div>
            <div className="dm-today-v">{dubai({ weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="dm-today-s">
              🕒 {dubai({ hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {isRestrictedToBranches ? `${visibleBranches.length} assigned branch${visibleBranches.length === 1 ? "" : "es"}` : `${visibleBranches.length} branches`}
            </div>
          </div>
        </header>

        <div className="dm-guide">
          <div className="dm-panel">
            <div className="dm-panel-t">🧭 How daily recording works</div>
            <div className="dm-steps">
              {STEPS.map((s, i) => (
                <div key={s.title} className="dm-step">
                  <div className="dm-step-h">
                    <span className="dm-step-n">{i + 1}</span>
                    <span className="dm-step-t">{s.title}</span>
                  </div>
                  <div className="dm-step-x">{s.text}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="dm-panel">
            <div className="dm-panel-t">🌡️ Critical limits — quick reference</div>
            <div className="dm-limits">
              {LIMITS.map((l) => (
                <div key={l.label} className="dm-limit">
                  <span className="dm-limit-i" aria-hidden="true">{l.icon}</span>
                  <div>
                    <div className="dm-limit-l">{l.label}</div>
                    <div className="dm-limit-v">{l.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dm-note">Outside a limit? Mark it NC, act straight away and write what you did.</div>
          </div>
        </div>

        {visibleBranches.length === 0 && (
          <div className="dm-empty">🔒 No branches assigned to your account — contact your administrator</div>
        )}

        {sections.map((sec) => (
          <section key={sec.title}>
            <div className="dm-group">
              <span className="dm-group-t">{sec.title}</span>
              <span className="dm-group-n">{sec.items.length}</span>
            </div>
            <div className="dm-grid">
              {sec.items.map((b) => {
                const m = META[b.type];
                const slug = toSlug(b.id);
                const shown = b.forms.slice(0, CHIPS_SHOWN);
                const more = b.forms.length - shown.length;
                return (
                  <div key={b.id} className="dm-card" style={{ "--cc": m.color, "--cs": m.soft }}>
                    <div className="dm-top">
                      <div className="dm-icon" aria-hidden="true">{m.icon}</div>
                      <div>
                        <div className="dm-name">{b.label}</div>
                        <span className="dm-tag">{m.tag}</span>
                      </div>
                    </div>
                    <div className="dm-about">{b.about}</div>
                    <div>
                      <div className="dm-forms-k">Main forms</div>
                      <div className="dm-chips">
                        {shown.map((f) => <span key={f} className="dm-chip">{f}</span>)}
                        {more > 0 && <span className="dm-chip dm-chip-more">+{more} more</span>}
                      </div>
                    </div>
                    <div className="dm-actions">
                      <button type="button" className="dm-btn dm-btn-enter" onClick={() => navigate(`/monitor/${slug}`)}>
                        ✏️ Enter reports
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
