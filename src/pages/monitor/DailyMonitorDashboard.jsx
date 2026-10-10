// src/pages/monitor/DailyMonitorDashboard.jsx
// /monitor — the Daily Reports hub: every branch as a card with two doors,
// enter today's forms (/monitor/<slug>) and view past reports (/admin/<slug>).
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { branchAllowed, hasSection } from "../../utils/perms";

/* Branches with a real entry page behind them. POS 7/14/16/17/18/21/25/31/34/
   35/36/37/38/41/42/43/44/45 were listed here too, but /monitor/<slug> has no
   route for any of them — every one of those tiles landed on the "هذه صفحة
   مؤقتة" placeholder. POS 24 and POS 26 are gone because the branches closed
   — their routes and past reports are still reachable by URL. POS 6 is kept on
   purpose: the branch goes live later, and adding its route is all it needs. */
const branches = [
  { id: "QCS",        label: "QCS",              type: "qcs"     },
  { id: "PRODUCTION", label: "Production",       type: "prod"    },
  { id: "POS 6",      label: "POS 6",            type: "pos"     },
  { id: "POS 10",     label: "POS 10",           type: "pos"     },
  { id: "POS 11",     label: "POS 11",           type: "pos"     },
  { id: "POS 15",     label: "POS 15",           type: "pos"     },
  { id: "POS 19",     label: "Al Warqa Kitchen", type: "kitchen" },
  { id: "FTR 1",      label: "FTR 1",            type: "ftr"     },
  { id: "FTR 2",      label: "FTR 2",            type: "ftr"     },
];

const toSlug = (id) => id.trim().toLowerCase().replace(/\s+/g, "");

/* In the order the hub lists them; same `title` = same group row. */
const GROUPS = [
  { type: "qcs",     title: "Central",     icon: "🛡️", tag: "Quality Control", color: "#0d9488", soft: "#ccfbf1" },
  { type: "prod",    title: "Central",     icon: "🏭", tag: "Production",      color: "#7c3aed", soft: "#ede9fe" },
  { type: "pos",     title: "Butcheries",  icon: "🏪", tag: "Point of Sale",   color: "#2563eb", soft: "#dbeafe" },
  { type: "kitchen", title: "Kitchen",     icon: "👨‍🍳", tag: "Kitchen",         color: "#ea580c", soft: "#ffedd5" },
  { type: "ftr",     title: "Food trucks", icon: "🚚", tag: "FTR",             color: "#ca8a04", soft: "#fef9c3" },
];
const META = Object.fromEntries(GROUPS.map((g) => [g.type, g]));

/* Scoped stylesheet. The old one reset `*` and restyled `body`, which leaked
   into every other screen while this one was mounted. Sizes are doubled-class
   + !important because globals.css forces #root * to 14px (--app-fs scales). */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .dm.dm { min-height:100vh; background:linear-gradient(180deg,#f8fbff 0%,#f1f6fd 100%); color:#0f172a; padding:22px clamp(14px,3vw,40px) 48px; }
#root .dm.dm .dm-in { max-width:1280px; margin:0 auto; }
#root .dm.dm .dm-head { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
#root .dm.dm .dm-title { font-size:${fs(24)}; font-weight:900; color:#0f172a; margin:0; line-height:1.2; }
#root .dm.dm .dm-sub { font-size:${fs(13)}; color:#64748b; font-weight:600; margin-top:4px; }
#root .dm.dm .dm-chip { font-size:${fs(12)}; font-weight:800; color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd; border-radius:999px; padding:6px 12px; }
#root .dm.dm .dm-group { margin:22px 0 10px; display:flex; align-items:center; gap:10px; }
#root .dm.dm .dm-group-t { font-size:${fs(12)}; font-weight:900; color:#475569; letter-spacing:.08em; text-transform:uppercase; }
#root .dm.dm .dm-group-n { font-size:${fs(11)}; font-weight:800; color:#94a3b8; }
#root .dm.dm .dm-group::after { content:""; flex:1; height:1px; background:#e2e8f0; }
#root .dm.dm .dm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr)); gap:12px; }
#root .dm.dm .dm-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:12px; box-shadow:0 1px 2px rgba(15,23,42,.04); transition:border-color .15s, box-shadow .15s; }
#root .dm.dm .dm-card:hover { border-color:var(--cc); box-shadow:0 6px 18px rgba(15,23,42,.07); }
#root .dm.dm .dm-top { display:flex; align-items:center; gap:12px; }
#root .dm.dm .dm-icon { width:46px; height:46px; flex-shrink:0; border-radius:12px; display:grid; place-items:center; background:var(--cs); font-size:${fs(22)}; }
#root .dm.dm .dm-name { font-size:${fs(16)}; font-weight:900; color:#0f172a; line-height:1.2; }
#root .dm.dm .dm-tag { font-size:${fs(12)}; font-weight:700; color:var(--cc); margin-top:3px; }
#root .dm.dm .dm-actions { display:flex; gap:8px; }
#root .dm.dm .dm-btn { flex:1; min-height:42px; border-radius:10px; font-size:${fs(13)}; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-family:inherit; transition:filter .15s, background .15s; }
#root .dm.dm .dm-btn-enter { background:var(--cc); color:#fff; border:1px solid var(--cc); }
#root .dm.dm .dm-btn-enter:hover { filter:brightness(1.08); }
#root .dm.dm .dm-btn-view { background:#fff; color:#334155; border:1px solid #cbd5e1; }
#root .dm.dm .dm-btn-view:hover { background:#f8fafc; border-color:var(--cc); color:var(--cc); }
#root .dm.dm .dm-btn:focus-visible { outline:3px solid #93c5fd; outline-offset:2px; }
#root .dm.dm .dm-empty { margin-top:18px; padding:40px 16px; text-align:center; color:#64748b; font-weight:700; font-size:${fs(14)}; background:#fff; border:1px dashed #cbd5e1; border-radius:14px; }
`;

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const fmt = () =>
      setDateStr(
        new Date().toLocaleString("en-AE", {
          timeZone: "Asia/Dubai", weekday: "long",
          month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      );
    fmt();
    const t = setInterval(fmt, 30_000);
    return () => clearInterval(t);
  }, []);

  /* perms.js is the single source of truth for allowedBranches. */
  const visibleBranches = branches.filter((b) => branchAllowed("daily", b.id));
  const isRestrictedToBranches = visibleBranches.length < branches.length;
  /* The view pages sit behind AdminRoute (section "admin"); only offer that
     door to accounts it would actually let in. */
  const canViewBranch = (id) => hasSection("admin") && branchAllowed("admin", id);

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
        <header className="dm-head">
          <div>
            <h1 className="dm-title">Daily Reports</h1>
            <div className="dm-sub">{dateStr}</div>
          </div>
          <span className="dm-chip">
            {isRestrictedToBranches ? `Your branches · ${visibleBranches.length}` : `${visibleBranches.length} branches`}
          </span>
        </header>

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
                const showId = b.label !== b.id && b.type !== "qcs" && b.type !== "prod";
                return (
                  <div key={b.id} className="dm-card" style={{ "--cc": m.color, "--cs": m.soft }}>
                    <div className="dm-top">
                      <div className="dm-icon" aria-hidden="true">{m.icon}</div>
                      <div>
                        <div className="dm-name">{b.label}</div>
                        <div className="dm-tag">{showId ? `${b.id} · ` : ""}{m.tag}</div>
                      </div>
                    </div>
                    <div className="dm-actions">
                      <button type="button" className="dm-btn dm-btn-enter" onClick={() => navigate(`/monitor/${slug}`)}>
                        ✏️ Enter reports
                      </button>
                      {canViewBranch(b.id) && (
                        <button type="button" className="dm-btn dm-btn-view" onClick={() => navigate(`/admin/${slug}`)}>
                          📊 View reports
                        </button>
                      )}
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
