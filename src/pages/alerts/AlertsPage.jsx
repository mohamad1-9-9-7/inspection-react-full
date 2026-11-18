// src/pages/alerts/AlertsPage.jsx
//
// 🔔 Alerts — one page, one side menu:
//   🔔 Alerts     — what the server found by itself (inspection-server
//                   utils/alertEngine.cjs): open → seen → closed by the system.
//   📬 Reminders  — per branch: what is e-mailed and to whom   ┐
//   ⚙️ Checks     — which checks run                          │ admins
//   🧭 Coverage   — branch × alert type, who is told          │ (AlertsSettings.jsx)
//   📜 Send log   — every alert e-mail                        ┘
//
// Readability: globals.css forces every font to 14px, so sizes live in the CSS
// block below as `#root .alp …` rules with !important, all scaled by --app-fs
// (the Aa text-size menu). Light surfaces, teal accent, slate text.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import AlertsSettings from "./AlertsSettings";
import {
  fetchAlerts, ackAlert, ackAllAlerts,
  isAlertsAdmin, alertVisible, SEVERITY, RULE_INFO, ALERTS_EVENT,
} from "../../utils/alertsApi";

const STATUS = [
  { id: "open", en: "Open", ar: "مفتوحة" },
  { id: "ack", en: "Seen", ar: "تم الاطلاع" },
  { id: "resolved", en: "Closed", ar: "مغلقة" },
];

const SECTIONS = [
  { id: "inbox", icon: "🔔", en: "Alerts", ar: "التنبيهات", d: { en: "What needs attention", ar: "اللي بدو انتباه" } },
  { id: "people", icon: "📬", en: "Reminders", ar: "التذكيرات", d: { en: "What is e-mailed, to whom", ar: "شو بينبعت ولمين" }, admin: true },
  { id: "checks", icon: "⚙️", en: "Checks", ar: "الفحوصات", d: { en: "What the system watches", ar: "شو بيراقب النظام" }, admin: true },
  { id: "coverage", icon: "🧭", en: "Coverage", ar: "التغطية", d: { en: "Who is told, per branch", ar: "مين بيعرف، لكل فرع" }, admin: true },
  { id: "log", icon: "📜", en: "Send log", ar: "سجل الإرسال", d: { en: "Every e-mail sent", ar: "كل إيميل انبعت" }, admin: true },
];

const SEV_ORDER = { critical: 0, warning: 1, info: 2 };
const SEV_LABEL = {
  critical: { en: "Critical", ar: "حرج" },
  warning: { en: "Warning", ar: "تحذير" },
  info: { en: "Info", ar: "معلومة" },
};

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .alp, #root .alp * { font-size: ${fs(15)}; line-height: 1.55; }
#root .alp .alp-title { font-size: ${fs(24)}; line-height: 1.2; }
#root .alp .alp-h { font-size: ${fs(17)}; line-height: 1.4; }
#root .alp .alp-at { font-size: ${fs(16)}; line-height: 1.45; }
#root .alp .alp-s, #root .alp .alp-s * { font-size: ${fs(14)}; }
#root .alp .alp-xs, #root .alp .alp-xs * { font-size: ${fs(12.5)}; }
#root .alp .alp-big { font-size: ${fs(22)}; line-height: 1; }
#root .alp .alp-num { font-size: ${fs(22)}; line-height: 1.1; }
#root .alp textarea, #root .alp input, #root .alp select, #root .alp button { font-family: inherit; }
#root .alp button { transition: background .12s, border-color .12s, box-shadow .12s, color .12s; }
#root .alp button:disabled { opacity: .5; cursor: not-allowed !important; }
#root .alp .alp-nav:hover { background: #f1f7f6; }
#root .alp .alp-row:hover { border-color: #c9dbe3; box-shadow: 0 6px 18px rgba(15,23,42,.06); }
#root .alp button:focus-visible, #root .alp input:focus-visible, #root .alp select:focus-visible { outline: 3px solid #99d5cc; outline-offset: 2px; }
@keyframes alp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.45); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } }
#root .alp .alp-pulse { animation: alp-pulse 1.8s ease-in-out infinite; }
@media (max-width: 900px) {
  #root .alp .alp-shell { grid-template-columns: 1fr !important; }
  #root .alp .alp-side { flex-direction: row !important; overflow-x: auto; position: static !important; }
  #root .alp .alp-side .alp-nav-d { display: none !important; }
  #root .alp .alp-side { flex-wrap: wrap; overflow-x: visible !important; }
  #root .alp .alp-side .alp-nav { flex: 0 0 auto; width: auto !important; padding: 6px 10px !important; }
  #root .alp .alp-side .alp-nav > span:first-child { width: 28px !important; height: 28px !important; }
  #root .alp .als-split { grid-template-columns: 1fr !important; }
}
@media (max-width: 1150px) { #root .alp .als-two { grid-template-columns: 1fr !important; } }
`;

const fmtWhen = (iso, ar) => (iso ? new Date(iso).toLocaleString(ar ? "ar-AE" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/** "5 min ago" / "منذ ٥ دقائق" — the full date stays in the tooltip. */
function timeAgo(iso, ar) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(ar ? "ar" : "en", { numeric: "auto" });
  if (s < 60) return rtf.format(0, "second");
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 86400 * 30) return rtf.format(-Math.floor(s / 86400), "day");
  return fmtWhen(iso, ar);
}

/** Group heading for a day: Today / Yesterday / weekday + date (UAE time). */
function dayKey(iso) {
  try { return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); } catch { return ""; }
}
function dayLabel(key, ar) {
  const today = dayKey(new Date().toISOString());
  const y = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return ar ? "اليوم" : "Today";
  if (key === y) return ar ? "أمس" : "Yesterday";
  return new Date(`${key}T12:00:00`).toLocaleDateString(ar ? "ar-AE" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const { t, dir, lang, toggle, isAr } = useSettingsLang();
  const admin = isAlertsAdmin();
  const [section, setSection] = useState("inbox");
  const [openCount, setOpenCount] = useState(null);
  const sections = SECTIONS.filter((s) => !s.admin || admin);
  const cur = sections.find((s) => s.id === section) || sections[0];

  return (
    <div dir={dir} className="alp" style={S.page}>
      <style>{CSS}</style>

      {/* ───── Header ───── */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span style={S.headIcon} aria-hidden="true">🔔</span>
          <div style={{ minWidth: 0 }}>
            <div className="alp-title" style={{ fontWeight: 900, color: "#0f172a" }}>{t({ en: "Alerts & reminders", ar: "التنبيهات والتذكيرات" })}</div>
            <div className="alp-s" style={{ color: "#64748b", fontWeight: 700 }}>
              {t({ en: "The system watches, finds problems and e-mails the right people.", ar: "النظام بيراقب، بيلاقي المشاكل، وبيبعت للناس الصح." })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {admin && (
            <button type="button" style={S.ghost} onClick={() => navigate("/admin/expiry-center")} title={t({ en: "Every expiry date in one list", ar: "كل تواريخ الانتهاء بقائمة واحدة" })}>
              ⏳ {t({ en: "Expiry center", ar: "مركز الانتهاء" })}
            </button>
          )}
          <LangToggle lang={lang} toggle={toggle} style={S.ghost} />
          <button type="button" style={S.ghost} onClick={() => navigate("/named-dashboard")}>🏠 {t({ en: "Home", ar: "الرئيسية" })}</button>
        </div>
      </header>

      <div className="alp-shell" style={S.shell}>
        {/* ───── Side menu ───── */}
        <nav className="alp-side" style={S.side} aria-label={t({ en: "Sections", ar: "الأقسام" })}>
          {sections.map((s) => {
            const on = s.id === cur.id;
            return (
              <button key={s.id} type="button" className="alp-nav" onClick={() => setSection(s.id)} aria-current={on ? "page" : undefined}
                style={{ ...S.nav, ...(on ? S.navOn : null) }}>
                <span style={{ ...S.navIcon, ...(on ? S.navIconOn : null) }} aria-hidden="true">{s.icon}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                  <span className="alp-s" style={{ display: "block", fontWeight: 900 }}>{t(s)}</span>
                  <span className="alp-xs alp-nav-d" style={{ display: "block", color: on ? "#0f766e" : "#64748b", fontWeight: 700 }}>{t(s.d)}</span>
                </span>
                {s.id === "inbox" && openCount > 0 && <span className="alp-xs" style={S.navBadge}>{openCount}</span>}
              </button>
            );
          })}
        </nav>

        {/* ───── Content ───── */}
        <main style={{ minWidth: 0 }}>
          {cur.id === "inbox" && <Inbox t={t} isAr={isAr} navigate={navigate} onOpenCount={setOpenCount} />}
          {/* stays mounted while the alerts are open, so unsaved settings are not lost */}
          {admin && (
            <div style={{ display: cur.id === "inbox" ? "none" : "block" }}>
              <AlertsSettings t={t} isAr={isAr} view={cur.id === "inbox" ? "people" : cur.id} onNavigate={setSection} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ───────────────────────── 🔔 Inbox ───────────────────────── */

function Inbox({ t, isAr, navigate, onOpenCount }) {
  const [tab, setTab] = useState("open");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ruleFilter, setRuleFilter] = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // new | old | severity
  const [busy, setBusy] = useState(0);
  const [open, setOpen] = useState(0);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await fetchAlerts(tab, 300)).filter(alertVisible);
      setList(rows);
      if (tab === "open") onOpenCount?.(rows.length);
      setErr("");
      setLoadedAt(new Date());
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [tab, onOpenCount]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener(ALERTS_EVENT, load);
    return () => window.removeEventListener(ALERTS_EVENT, load);
  }, [load]);

  // a filter chosen on one tab would leave the next one looking empty for no reason
  const switchTab = (id) => { setTab(id); setRuleFilter(""); setSevFilter(""); setBranchFilter(""); setOpen(0); };

  const counts = useMemo(() => {
    const rule = {}; const sev = {}; const branch = {};
    list.forEach((a) => {
      rule[a.rule] = (rule[a.rule] || 0) + 1;
      sev[a.severity || "warning"] = (sev[a.severity || "warning"] || 0) + 1;
      if (a.branch) branch[a.branch] = (branch[a.branch] || 0) + 1;
    });
    return { rule, sev, branch };
  }, [list]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = list.filter((a) =>
      (!ruleFilter || a.rule === ruleFilter)
      && (!sevFilter || (a.severity || "warning") === sevFilter)
      && (!branchFilter || a.branch === branchFilter)
      && (!q || [a.title, a.body, a.branch, a.rule].some((x) => String(x || "").toLowerCase().includes(q))));
    const time = (a) => new Date(a.created_at || 0).getTime();
    if (sort === "old") out.sort((a, b) => time(a) - time(b));
    else if (sort === "severity") out.sort((a, b) => (SEV_ORDER[a.severity] ?? 1) - (SEV_ORDER[b.severity] ?? 1) || time(b) - time(a));
    else out.sort((a, b) => time(b) - time(a));
    return out;
  }, [list, ruleFilter, sevFilter, branchFilter, query, sort]);

  const groups = useMemo(() => {
    if (sort === "severity") return [{ key: "all", label: "", items: shown }];
    const g = [];
    shown.forEach((a) => {
      const k = dayKey(a.created_at);
      if (!g.length || g[g.length - 1].key !== k) g.push({ key: k, label: dayLabel(k, isAr), items: [] });
      g[g.length - 1].items.push(a);
    });
    return g;
  }, [shown, sort, isAr]);

  const filtersOn = !!(ruleFilter || sevFilter || branchFilter || query);
  const clearFilters = () => { setRuleFilter(""); setSevFilter(""); setBranchFilter(""); setQuery(""); };

  const ack = async (a) => {
    setBusy(a.id);
    try { await ackAlert(a.id); } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(0); }
  };
  const ackAll = async () => {
    if (!window.confirm(t({ en: "Mark every open alert as seen?", ar: "تعليم كل التنبيهات المفتوحة «تم الاطلاع»؟" }))) return;
    try { await ackAllAlerts(); } catch (e) { setErr(String(e?.message || e)); }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* status + summary */}
      <div style={S.bar}>
        <div style={S.seg} role="tablist">
          {STATUS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => switchTab(x.id)} style={{ ...S.segBtn, ...(tab === x.id ? S.segOn : null) }}>
              {t(x)}{tab === x.id && !loading && <span style={S.segN}>{list.length}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {["critical", "warning"].map((k) => {
            const sv = SEVERITY[k];
            const n = counts.sev[k] || 0;
            const on = sevFilter === k;
            return (
              <button key={k} type="button" disabled={!n} onClick={() => setSevFilter(on ? "" : k)}
                className={k === "critical" && n && tab === "open" ? "alp-pulse" : ""}
                style={{ ...S.stat, color: sv.color, borderColor: on ? sv.color : "#e2e8f0", background: on ? sv.bg : "#fff" }}>
                {sv.icon} <b>{n}</b> {t(SEV_LABEL[k])}
              </button>
            );
          })}
          <button type="button" style={S.iconBtn} onClick={load} disabled={loading} title={t({ en: "Refresh", ar: "تحديث" })}>⟳</button>
          {loadedAt && <span className="alp-xs" style={{ color: "#64748b", fontWeight: 700 }}>{loadedAt.toLocaleTimeString(isAr ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
      </div>

      {/* one toolbar: search + type + branch + sort */}
      {list.length > 0 && (
        <div style={S.toolbar}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span aria-hidden="true" style={S.searchIcon}>🔍</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...S.input, paddingInlineStart: 36 }}
              placeholder={t({ en: "Search…", ar: "ابحث…" })} aria-label={t({ en: "Search alerts", ar: "بحث في التنبيهات" })} />
          </div>
          <select value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)} style={S.select} aria-label={t({ en: "Type", ar: "النوع" })}>
            <option value="">{t({ en: "All types", ar: "كل الأنواع" })}</option>
            {Object.entries(counts.rule).map(([r, n]) => <option key={r} value={r}>{RULE_INFO[r]?.icon} {t(RULE_INFO[r] || { en: r, ar: r })} ({n})</option>)}
          </select>
          {Object.keys(counts.branch).length > 1 && (
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={S.select} aria-label={t({ en: "Branch", ar: "الفرع" })}>
              <option value="">{t({ en: "All branches", ar: "كل الفروع" })}</option>
              {Object.entries(counts.branch).sort((a, b) => a[0].localeCompare(b[0])).map(([b, n]) => <option key={b} value={b}>{b} ({n})</option>)}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={S.select} aria-label={t({ en: "Sort", ar: "الترتيب" })}>
            <option value="new">{t({ en: "Newest first", ar: "الأحدث أولاً" })}</option>
            <option value="old">{t({ en: "Oldest first", ar: "الأقدم أولاً" })}</option>
            <option value="severity">{t({ en: "Most serious first", ar: "الأخطر أولاً" })}</option>
          </select>
          {tab === "open" && <button type="button" style={S.pri} onClick={ackAll}>✓ {t({ en: "Mark all seen", ar: "تعليم الكل" })}</button>}
        </div>
      )}

      {filtersOn && (
        <div className="alp-s" style={{ display: "flex", gap: 10, alignItems: "center", color: "#334155", fontWeight: 800 }}>
          {t({ en: `Showing ${shown.length} of ${list.length}`, ar: `يظهر ${shown.length} من ${list.length}` })}
          <button type="button" style={S.link} onClick={clearFilters}>✕ {t({ en: "Clear filters", ar: "مسح الفلاتر" })}</button>
        </div>
      )}

      {err && <div style={S.bad}>⚠️ {err}</div>}
      {loading && <div style={{ display: "grid", gap: 8 }} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} style={S.skeleton} />)}</div>}

      {!loading && !err && shown.length === 0 && (
        <div style={S.empty}>
          <div className="alp-big" style={{ marginBottom: 6 }}>{filtersOn ? "🔎" : "✅"}</div>
          <div className="alp-h" style={{ fontWeight: 900, color: "#0f172a" }}>
            {filtersOn
              ? t({ en: "No alert matches these filters.", ar: "لا يوجد تنبيه يطابق هذه الفلاتر." })
              : tab === "open" ? t({ en: "All clear — nothing needs attention.", ar: "كل شي تمام — ما في شي بدو انتباه." }) : t({ en: "Nothing here.", ar: "لا شيء هنا." })}
          </div>
          {filtersOn && <button type="button" style={{ ...S.ghostDark, marginTop: 10 }} onClick={clearFilters}>✕ {t({ en: "Clear filters", ar: "مسح الفلاتر" })}</button>}
        </div>
      )}

      {!loading && groups.map((g) => (
        <section key={g.key} style={{ display: "grid", gap: 6 }}>
          {g.label && (
            <div style={S.dayHead}>
              <span className="alp-xs" style={{ fontWeight: 900, color: "#334155" }}>{g.label}</span>
              <span className="alp-xs" style={S.dayCount}>{g.items.length}</span>
              <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} aria-hidden="true" />
            </div>
          )}
          {g.items.map((a) => (
            <AlertRow key={a.id} a={a} t={t} isAr={isAr} busy={busy === a.id} expanded={open === a.id}
              onToggle={() => setOpen(open === a.id ? 0 : a.id)} onAck={() => ack(a)} onOpen={() => navigate(a.link)} />
          ))}
        </section>
      ))}
    </div>
  );
}

/* One alert as a compact row; details unfold on click. */
function AlertRow({ a, t, isAr, busy, expanded, onToggle, onAck, onOpen }) {
  const sv = SEVERITY[a.severity] || SEVERITY.warning;
  const rule = RULE_INFO[a.rule];
  return (
    <article className="alp-row" style={{ ...S.row, borderInlineStartColor: sv.color }}>
      <div style={S.rowMain}>
        <span style={{ ...S.rowIcon, background: sv.bg }} aria-hidden="true">{rule?.icon || sv.icon}</span>
        <button type="button" onClick={onToggle} style={S.rowText} aria-expanded={expanded}>
          <span className="alp-at" dir="auto" style={{ display: "block", fontWeight: 900, color: "#0f172a" }}>{a.title}</span>
          <span className="alp-xs" style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontWeight: 700, marginTop: 2 }}>
            <span style={{ color: sv.color, fontWeight: 900 }}>{t(SEV_LABEL[a.severity] || SEV_LABEL.warning)}</span>
            {rule && <span>· {t(rule)}</span>}
            {a.branch && <span>· 📍 {a.branch}</span>}
            <span title={fmtWhen(a.created_at, isAr)}>· 🕒 {timeAgo(a.created_at, isAr)}</span>
            {a.emailed_at && <span>· ✉️ {t({ en: "e-mailed", ar: "أُرسل" })}</span>}
          </span>
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {a.status === "open" && (
            <button type="button" style={S.priSm} disabled={busy} onClick={onAck}>{busy ? "…" : "✓"} {t({ en: "Seen", ar: "تم الاطلاع" })}</button>
          )}
          {a.link && <button type="button" style={S.ghostSm} onClick={onOpen} title={t({ en: "Open the record", ar: "فتح السجل" })}>↗</button>}
        </div>
      </div>
      {expanded && (
        <div style={S.rowMore}>
          {a.body && <div className="alp-s" dir="auto" style={{ whiteSpace: "pre-line", color: "#1e293b", fontWeight: 600 }}>{a.body}</div>}
          <div className="alp-xs" style={{ color: "#64748b", fontWeight: 700 }}>🕒 {fmtWhen(a.created_at, isAr)}</div>
          {a.status === "ack" && (
            <div className="alp-xs" style={S.state}>👁️ {t({ en: "Seen by", ar: "اطّلع عليه" })} <b>{a.ack_by || "—"}</b> · {fmtWhen(a.ack_at, isAr)}</div>
          )}
          {a.status === "resolved" && (
            <div className="alp-xs" style={{ ...S.state, background: "#ecfdf5", color: "#166534" }}>
              ✔ {t({ en: "Closed by the system", ar: "أغلقه النظام" })} · {fmtWhen(a.resolved_at, isAr)}{a.data?.resolvedNote ? ` — ${a.data.resolvedNote}` : ""}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const FONT = "Cairo, Tajawal, system-ui, sans-serif";
const S = {
  page: { minHeight: "100vh", background: "#f4f7f9", padding: "16px clamp(12px, 2vw, 28px) 70px", fontFamily: FONT, color: "#0f172a", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14, padding: "14px 18px", background: "#fff", border: "1px solid #e6edf2", borderRadius: 16, boxShadow: "0 4px 14px rgba(15,23,42,.04)" },
  headIcon: { width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ccfbf1,#cffafe)", border: "1px solid #a7e3d8", fontSize: 24, flexShrink: 0 },
  ghost: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  shell: { display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 14, alignItems: "start" },
  side: { display: "flex", flexDirection: "column", gap: 4, padding: 8, background: "#fff", border: "1px solid #e6edf2", borderRadius: 16, boxShadow: "0 4px 14px rgba(15,23,42,.04)" },
  nav: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 10px", border: "1px solid transparent", borderRadius: 12, background: "transparent", color: "#0f172a", cursor: "pointer", boxSizing: "border-box" },
  // full `border`, never `borderColor`: React dropping a longhand on deselect leaves a BLACK border
  navOn: { background: "#e6f4f1", border: "1px solid #c4e6df", color: "#0f766e" },
  navIcon: { width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#f1f5f9", flexShrink: 0 },
  navIconOn: { background: "#fff", boxShadow: "0 2px 6px rgba(15,118,110,.15)" },
  navBadge: { minWidth: 22, padding: "1px 7px", borderRadius: 999, background: "#dc2626", color: "#fff", fontWeight: 900, textAlign: "center" },
  bar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 8, background: "#fff", border: "1px solid #e6edf2", borderRadius: 14 },
  seg: { display: "inline-flex", gap: 4, padding: 3, background: "#f1f5f9", borderRadius: 11 },
  segBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: 0, background: "transparent", color: "#475569", fontWeight: 800, cursor: "pointer" },
  segOn: { background: "#fff", color: "#0f766e", boxShadow: "0 1px 4px rgba(15,23,42,.10)" },
  segN: { minWidth: 20, padding: "0 6px", borderRadius: 999, background: "#e6f4f1", color: "#0f766e", fontWeight: 900, textAlign: "center" },
  stat: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 999, border: "1px solid", fontWeight: 800, cursor: "pointer", background: "#fff" },
  iconBtn: { width: 34, height: 34, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 900, cursor: "pointer" },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  searchIcon: { position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  input: { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #dbe5ec", background: "#fff", color: "#0f172a", boxSizing: "border-box", fontWeight: 600 },
  select: { padding: "9px 10px", borderRadius: 10, border: "1px solid #dbe5ec", background: "#fff", color: "#0f172a", fontWeight: 700, minWidth: 140 },
  pri: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: 0, background: "#0f766e", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" },
  priSm: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9, border: 0, background: "#0f766e", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" },
  ghostSm: { width: 32, height: 32, borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 900, cursor: "pointer" },
  ghostDark: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, border: "1px solid #dbe5ec", background: "#fff", color: "#0f172a", fontWeight: 800, cursor: "pointer" },
  link: { border: 0, background: "none", color: "#0f766e", fontWeight: 800, cursor: "pointer", padding: 0, textDecoration: "underline" },
  dayHead: { display: "flex", alignItems: "center", gap: 8, margin: "6px 2px 2px" },
  dayCount: { padding: "0 8px", borderRadius: 999, background: "#e2e8f0", color: "#334155", fontWeight: 900 },
  row: { background: "#fff", border: "1px solid #e6edf2", borderInlineStart: "4px solid", borderRadius: 12, overflow: "hidden" },
  rowMain: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", minWidth: 0 },
  rowIcon: { width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 18 },
  rowText: { flex: 1, minWidth: 0, border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", color: "inherit" },
  rowMore: { display: "grid", gap: 6, padding: "10px 14px 12px", paddingInlineStart: 62, borderTop: "1px dashed #eef2f6" },
  state: { display: "inline-block", padding: "4px 10px", borderRadius: 8, background: "#f1f5f9", color: "#334155", fontWeight: 700 },
  empty: { background: "#fff", border: "1px dashed #d6e2ea", borderRadius: 14, padding: 34, textAlign: "center", color: "#334155" },
  skeleton: { height: 62, borderRadius: 12, background: "linear-gradient(90deg,#eef3f6,#f8fafc,#eef3f6)", border: "1px solid #e6edf2" },
  bad: { padding: "10px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 800 },
};
