// src/pages/alerts/AlertsPage.jsx
//
// 🔔 التنبيهات — what the server found by itself (inspection-server
// utils/alertEngine.cjs): a phone temperature reading out of range, a daily
// log not filed, a calibration / certificate about to expire, a CAPA past its
// date. Open → "Seen" (ack) → closed by the system when the problem is gone
// (e.g. a recheck back in range).
// Admins also get the Rules tab: which checks run and who is e-mailed.
//
// Readability: globals.css forces every font to 14px, so sizes live in the CSS
// block below as `#root .alp …` rules with !important, all scaled by --app-fs
// (the Aa text-size menu). Secondary text is slate-600, never pale grey.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { BRANCHES } from "../settings/reportTypeCatalog";
import {
  fetchAlerts, ackAlert, ackAllAlerts, fetchAlertRules, saveAlertRules, runAlertChecks,
  isAlertsAdmin, alertVisible, SEVERITY, RULE_INFO, ALERTS_EVENT,
} from "../../utils/alertsApi";

const TABS = [
  { id: "open", en: "Open", ar: "مفتوحة", icon: "🔴" },
  { id: "ack", en: "Seen", ar: "تم الاطلاع", icon: "👁️" },
  { id: "resolved", en: "Closed", ar: "مغلقة", icon: "✅" },
];

const SEV_ORDER = { critical: 0, warning: 1, info: 2 };
const SEV_LABEL = {
  critical: { en: "Critical", ar: "حرج" },
  warning: { en: "Warning", ar: "تحذير" },
  info: { en: "Info", ar: "معلومة" },
};

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .alp, #root .alp * { font-size: ${fs(16)}; line-height: 1.6; }
#root .alp .alp-title { font-size: ${fs(30)}; line-height: 1.2; }
#root .alp .alp-h { font-size: ${fs(19)}; line-height: 1.4; }
#root .alp .alp-at { font-size: ${fs(18)}; line-height: 1.45; }
#root .alp .alp-s, #root .alp .alp-s * { font-size: ${fs(14)}; }
#root .alp .alp-xs, #root .alp .alp-xs * { font-size: ${fs(13)}; }
#root .alp .alp-big { font-size: ${fs(26)}; line-height: 1; }
#root .alp .alp-num { font-size: ${fs(30)}; line-height: 1.1; }
#root .alp textarea, #root .alp input, #root .alp select, #root .alp button { font-family: inherit; }
#root .alp .alp-card { transition: box-shadow .15s, transform .15s; }
#root .alp .alp-card:hover { box-shadow: 0 14px 30px rgba(15,39,64,.10); transform: translateY(-1px); }
#root .alp .alp-kpi { transition: transform .15s, box-shadow .15s; }
#root .alp .alp-kpi:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15,39,64,.10); }
#root .alp button:focus-visible, #root .alp input:focus-visible, #root .alp select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
@keyframes alp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.45); } 50% { box-shadow: 0 0 0 7px rgba(220,38,38,0); } }
#root .alp .alp-pulse { animation: alp-pulse 1.8s ease-in-out infinite; }
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
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    if (tab === "rules") return;
    setLoading(true);
    try {
      setList((await fetchAlerts(tab, 300)).filter(alertVisible));
      setErr("");
      setLoadedAt(new Date());
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener(ALERTS_EVENT, load);
    return () => window.removeEventListener(ALERTS_EVENT, load);
  }, [load]);

  // A filter chosen on one tab used to stick to the next, where that rule may
  // have no alerts at all — an empty page with no visible reason. Reset them.
  const switchTab = (id) => { setTab(id); setRuleFilter(""); setSevFilter(""); setBranchFilter(""); };

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

  /* Day groups only make sense when the list is in time order. */
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

  const tabLabel = (x) => (isAr ? x.ar : x.en);

  return (
    <div dir={dir} className="alp" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        {/* ───── Header ───── */}
        <header style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={S.headIcon} className={counts.sev.critical && tab === "open" ? "alp-pulse" : ""}>🔔</span>
            <div>
              <div className="alp-title" style={{ fontWeight: 900, color: "#0f2740" }}>{t({ en: "Alerts", ar: "التنبيهات" })}</div>
              <div className="alp-s" style={{ color: "#475569", fontWeight: 700, maxWidth: 560 }}>
                {t({ en: "Found by the system itself — temperatures, missed logs, expiries, overdue CAPA", ar: "يكتشفها النظام بنفسه — الحرارة، التقارير الفائتة، الانتهاء، CAPA المتأخرة" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {loadedAt && tab !== "rules" && (
              <span className="alp-xs" style={{ color: "#475569", fontWeight: 700 }}>
                {t({ en: "Updated", ar: "آخر تحديث" })} {loadedAt.toLocaleTimeString(isAr ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {tab !== "rules" && (
              <button type="button" style={S.btn} onClick={load} disabled={loading} title={t({ en: "Refresh", ar: "تحديث" })}>
                ⟳ {t({ en: "Refresh", ar: "تحديث" })}
              </button>
            )}
            <LangToggle lang={lang} toggle={toggle} style={S.btn} />
            <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>🏠 {t({ en: "Home", ar: "الرئيسية" })}</button>
          </div>
        </header>

        {/* ───── Tabs ───── */}
        <div style={S.tabs} role="tablist">
          {TABS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => switchTab(x.id)} style={{ ...S.tab, ...(tab === x.id ? S.tabOn : null) }}>
              <span aria-hidden="true">{x.icon}</span> {tabLabel(x)}
              {tab === x.id && !loading && <span style={{ ...S.tabCount, ...(tab === x.id ? S.tabCountOn : null) }}>{list.length}</span>}
            </button>
          ))}
          {admin && (
            <button type="button" role="tab" aria-selected={tab === "rules"} onClick={() => switchTab("rules")} style={{ ...S.tab, ...(tab === "rules" ? S.tabOn : null) }}>
              ⚙️ {t({ en: "Rules & e-mail", ar: "القواعد والإيميل" })}
            </button>
          )}
        </div>

        {tab === "rules" ? (
          <RulesEditor t={t} isAr={isAr} />
        ) : (
          <>
            {/* ───── Severity summary (click = filter) ───── */}
            {list.length > 0 && (
              <div style={S.kpis}>
                {["critical", "warning", "info"].map((k) => {
                  const sv = SEVERITY[k];
                  const on = sevFilter === k;
                  const n = counts.sev[k] || 0;
                  return (
                    <button
                      key={k}
                      type="button"
                      className="alp-kpi"
                      onClick={() => setSevFilter(on ? "" : k)}
                      disabled={!n}
                      style={{ ...S.kpi, borderColor: on ? sv.color : sv.border, background: on ? sv.bg : "#fff", opacity: n ? 1 : 0.55, cursor: n ? "pointer" : "default" }}
                    >
                      <span className="alp-big" aria-hidden="true">{sv.icon}</span>
                      <span style={{ display: "grid", textAlign: "start" }}>
                        <span className="alp-num" style={{ fontWeight: 900, color: sv.color }}>{n}</span>
                        <span className="alp-s" style={{ fontWeight: 800, color: "#334155" }}>{t(SEV_LABEL[k])}</span>
                      </span>
                    </button>
                  );
                })}
                <div style={{ ...S.kpi, cursor: "default", borderColor: "#cfdeec" }}>
                  <span className="alp-big" aria-hidden="true">📊</span>
                  <span style={{ display: "grid", textAlign: "start" }}>
                    <span className="alp-num" style={{ fontWeight: 900, color: "#0f2740" }}>{list.length}</span>
                    <span className="alp-s" style={{ fontWeight: 800, color: "#334155" }}>{t({ en: "Total", ar: "المجموع" })}</span>
                  </span>
                </div>
              </div>
            )}

            {/* ───── Tool bar: search, branch, sort ───── */}
            {list.length > 0 && (
              <div style={S.toolbar}>
                <div style={{ position: "relative", flex: "1 1 260px" }}>
                  <span aria-hidden="true" style={S.searchIcon}>🔍</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t({ en: "Search title, details, branch…", ar: "ابحث بالعنوان أو التفاصيل أو الفرع…" })}
                    style={{ ...S.input, paddingInlineStart: 40 }}
                    aria-label={t({ en: "Search alerts", ar: "بحث في التنبيهات" })}
                  />
                </div>
                {Object.keys(counts.branch).length > 1 && (
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={{ ...S.input, width: "auto", minWidth: 170 }} aria-label={t({ en: "Branch", ar: "الفرع" })}>
                    <option value="">{t({ en: "All branches", ar: "كل الفروع" })}</option>
                    {Object.entries(counts.branch).sort((a, b) => a[0].localeCompare(b[0])).map(([b, n]) => <option key={b} value={b}>{b} ({n})</option>)}
                  </select>
                )}
                <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ ...S.input, width: "auto", minWidth: 170 }} aria-label={t({ en: "Sort", ar: "الترتيب" })}>
                  <option value="new">{t({ en: "Newest first", ar: "الأحدث أولاً" })}</option>
                  <option value="old">{t({ en: "Oldest first", ar: "الأقدم أولاً" })}</option>
                  <option value="severity">{t({ en: "Most serious first", ar: "الأخطر أولاً" })}</option>
                </select>
                {tab === "open" && (
                  <button type="button" style={S.pri} onClick={ackAll}>✓ {t({ en: "Mark all seen", ar: "تعليم الكل" })}</button>
                )}
              </div>
            )}

            {/* ───── Rule chips ───── */}
            {list.length > 0 && (
              <div style={S.chips}>
                <button type="button" style={{ ...S.chip, ...(!ruleFilter ? S.chipOn : null) }} onClick={() => setRuleFilter("")}>
                  {t({ en: "All types", ar: "كل الأنواع" })} <b>{list.length}</b>
                </button>
                {Object.entries(counts.rule).map(([r, n]) => (
                  <button key={r} type="button" style={{ ...S.chip, ...(ruleFilter === r ? S.chipOn : null) }} onClick={() => setRuleFilter(ruleFilter === r ? "" : r)}>
                    {RULE_INFO[r]?.icon} {t(RULE_INFO[r] || { en: r, ar: r })} <b>{n}</b>
                  </button>
                ))}
              </div>
            )}

            {filtersOn && (
              <div className="alp-s" style={S.filterNote}>
                {t({ en: `Showing ${shown.length} of ${list.length}`, ar: `يظهر ${shown.length} من ${list.length}` })}
                <button type="button" style={S.linkBtn} onClick={clearFilters}>✕ {t({ en: "Clear filters", ar: "مسح الفلاتر" })}</button>
              </div>
            )}

            {err && <div style={S.bad}>⚠️ {err}</div>}

            {loading && (
              <div style={{ display: "grid", gap: 10 }} aria-busy="true">
                {[0, 1, 2].map((i) => <div key={i} style={S.skeleton} />)}
              </div>
            )}

            {!loading && !err && shown.length === 0 && (
              <div style={S.empty}>
                <div className="alp-big" style={{ marginBottom: 8 }}>{filtersOn ? "🔎" : "✅"}</div>
                <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740" }}>
                  {filtersOn
                    ? t({ en: "No alert matches these filters.", ar: "لا يوجد تنبيه يطابق هذه الفلاتر." })
                    : tab === "open" ? t({ en: "No open alerts — all clear.", ar: "لا توجد تنبيهات مفتوحة — كل شيء تمام." }) : t({ en: "Nothing here.", ar: "لا شيء هنا." })}
                </div>
                {filtersOn && <button type="button" style={{ ...S.btn, marginTop: 12 }} onClick={clearFilters}>✕ {t({ en: "Clear filters", ar: "مسح الفلاتر" })}</button>}
              </div>
            )}

            {/* ───── The alerts, grouped by day ───── */}
            {!loading && groups.map((g) => (
              <section key={g.key} style={{ marginBottom: 18 }}>
                {g.label && (
                  <div style={S.dayHead}>
                    <span className="alp-s" style={{ fontWeight: 900, color: "#0f2740" }}>{g.label}</span>
                    <span className="alp-xs" style={S.dayCount}>{g.items.length}</span>
                    <span style={S.dayRule} aria-hidden="true" />
                  </div>
                )}
                <div style={{ display: "grid", gap: 12 }}>
                  {g.items.map((a) => (
                    <AlertCard key={a.id} a={a} t={t} isAr={isAr} busy={busy === a.id} onAck={() => ack(a)} onOpen={() => navigate(a.link)} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* One alert: severity strip + badge, title, where/what/when, body, footer. */
function AlertCard({ a, t, isAr, busy, onAck, onOpen }) {
  const sv = SEVERITY[a.severity] || SEVERITY.warning;
  const rule = RULE_INFO[a.rule];
  return (
    <article className="alp-card" style={{ ...S.card, borderInlineStart: `6px solid ${sv.color}`, background: a.status === "open" ? "#fff" : "#fbfdff" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span style={{ ...S.iconBox, background: sv.bg, borderColor: sv.border }} aria-hidden="true">
          <span className="alp-big">{rule?.icon || sv.icon}</span>
        </span>

        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="alp-xs" style={{ ...S.badge, color: sv.color, background: sv.bg, borderColor: sv.border }}>
              {sv.icon} {t(SEV_LABEL[a.severity] || SEV_LABEL.warning)}
            </span>
            {rule && <span className="alp-xs" style={S.tag}>{t(rule)}</span>}
            {a.branch && <span className="alp-xs" style={{ ...S.tag, background: "#eef6ff", borderColor: "#cfe3fb", color: "#1e4b7a" }}>📍 {a.branch}</span>}
            {a.emailed_at && <span className="alp-xs" style={S.tag}>✉️ {t({ en: "e-mailed", ar: "أُرسل بالإيميل" })}</span>}
          </div>

          <div className="alp-at" style={{ fontWeight: 900, color: "#0f2740" }} dir="auto">{a.title}</div>
          {a.body && <div style={S.body} dir="auto">{a.body}</div>}

          <div className="alp-s" style={{ color: "#475569", fontWeight: 700, marginTop: 8 }} title={fmtWhen(a.created_at, isAr)}>
            🕒 {timeAgo(a.created_at, isAr)} <span style={{ color: "#94a3b8" }}>·</span> {fmtWhen(a.created_at, isAr)}
          </div>
          {a.status === "ack" && (
            <div className="alp-s" style={{ ...S.state, color: "#334155", background: "#f1f5f9" }}>
              👁️ {t({ en: "Seen by", ar: "اطّلع عليه" })} <b>{a.ack_by || "—"}</b> · {fmtWhen(a.ack_at, isAr)}
            </div>
          )}
          {a.status === "resolved" && (
            <div className="alp-s" style={{ ...S.state, color: "#166534", background: "#ecfdf5" }}>
              ✔ {t({ en: "Closed by the system", ar: "أغلقه النظام" })} · {fmtWhen(a.resolved_at, isAr)}{a.data?.resolvedNote ? ` — ${a.data.resolvedNote}` : ""}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130 }}>
          {a.status === "open" && (
            <button type="button" style={S.pri} disabled={busy} onClick={onAck}>
              {busy ? "…" : "✓"} {t({ en: "Seen", ar: "تم الاطلاع" })}
            </button>
          )}
          {a.link && <button type="button" style={S.btn} onClick={onOpen}>↗ {t({ en: "Open", ar: "فتح" })}</button>}
        </div>
      </div>
    </article>
  );
}

/* ───────── admin: rules, recipients, run now ───────── */

const ALL_TYPES = BRANCHES.flatMap((b) => (b.types || []).map(([type, label]) => ({ type, label: `${b.label} — ${label}`, branch: b.label })));

function RulesEditor({ t, isAr }) {
  const [rules, setRules] = useState(null);
  const [mailbox, setMailbox] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [addType, setAddType] = useState("");

  useEffect(() => {
    fetchAlertRules().then((j) => { setRules(j.rules); setMailbox(j.mailbox !== false); }).catch((e) => setErr(String(e?.message || e)));
  }, []);

  if (err && !rules) return <div style={S.bad}>{err}</div>;
  if (!rules) return <div className="alp-s" style={S.empty}>{t({ en: "Loading…", ar: "جاري التحميل…" })}</div>;

  const set = (k, patch) => setRules((r) => ({ ...r, [k]: { ...r[k], ...patch } }));
  const checks = rules.missedReports.checks || [];

  const save = async () => {
    setSaving(true); setMsg(""); setErr("");
    try {
      const j = await saveAlertRules(rules);
      setRules(j.rules);
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };
  const runNow = async (first) => {
    setRunning(true); setMsg(""); setErr("");
    try {
      const j = await runAlertChecks(first);
      setMsg(t({ en: `Checks done — ${j.created} new alert(s).`, ar: `تم الفحص — ${j.created} تنبيه جديد.` }));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!mailbox && (
        <div style={S.warn}>
          {t({ en: "This company has no mailbox of its own yet — alerts show in the bell, e-mails are not sent.", ar: "هذه الشركة ليس لها بريد خاص بعد — التنبيهات تظهر بالجرس، والإيميل لا يُرسل." })}
        </div>
      )}
      <div className="alp-s" style={{ color: "#475569", lineHeight: 1.7 }}>
        {t({
          en: "The system checks at 08:00 (yesterday's logs, expiries, CAPA) and 13:00 (no temperature reading yet today), UAE time. A temperature out of range is raised the moment it is saved — from the phone or the sheet.",
          ar: "يفحص النظام الساعة 08:00 (تقارير أمس، الانتهاء، CAPA) و13:00 (لا قراءة حرارة اليوم بعد) بتوقيت الإمارات. الحرارة خارج الحد تُنبَّه لحظة حفظها — من الجوال أو من الشيت.",
        })}
      </div>

      <RuleBlock k="temperature" rule={rules.temperature} onChange={(patch) => set("temperature", patch)} t={t} when={t({ en: "Instantly — a phone (QR) reading or a sheet saved from the computer (today / yesterday) out of range. A recheck or a correction back in range closes it.", ar: "فوراً — قراءة جوال (QR) أو شيت محفوظ من الكمبيوتر (اليوم / أمس) خارج الحد. إعادة القياس أو التصحيح داخل الحد يغلقه." })} />

      <RuleBlock k="missedReports" rule={rules.missedReports} onChange={(patch) => set("missedReports", patch)} t={t} when={t({ en: "08:00 — logs not filed for yesterday (phone readings alone do not file a day)", ar: "08:00 — تقارير أمس غير المعبّأة (قراءات الجوال وحدها لا تكفي)" })}>
        <div style={{ display: "grid", gap: 6 }}>
          {checks.map((c, i) => (
            <div key={`${c.type}-${i}`} style={S.checkRow}>
              <span style={{ fontWeight: 800 }}>{c.branch}</span>
              <span style={{ flex: 1 }}>{c.label || c.type}</span>
              <code className="alp-s" style={{ color: "#475569" }}>{c.type}</code>
              <button type="button" style={S.x} onClick={() => set("missedReports", { checks: checks.filter((_, j) => j !== i) })} aria-label="remove">✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...S.input, flex: 1 }} value={addType} onChange={(e) => setAddType(e.target.value)}>
              <option value="">{t({ en: "Add a daily log to check…", ar: "أضف تقريراً يومياً للفحص…" })}</option>
              {ALL_TYPES.filter((x) => !checks.some((c) => c.type === x.type)).map((x) => <option key={x.type} value={x.type}>{x.label}</option>)}
            </select>
            <button type="button" style={S.btn} disabled={!addType} onClick={() => {
              const x = ALL_TYPES.find((y) => y.type === addType);
              if (x) set("missedReports", { checks: [...checks, { type: x.type, branch: x.branch, label: x.label }] });
              setAddType("");
            }}>＋ {t({ en: "Add", ar: "إضافة" })}</button>
          </div>
          <div className="alp-s" style={{ color: "#475569" }}>
            {t({ en: "A log the company has not filed in the last 30 days is skipped (not in use).", ar: "التقرير الذي لم يُعبّأ أبداً خلال 30 يوماً يُتجاهل (غير مستعمل)." })}
          </div>
        </div>
      </RuleBlock>

      <RuleBlock k="noReadingToday" rule={rules.noReadingToday} onChange={(patch) => set("noReadingToday", patch)} t={t} when={t({ en: "13:00 — temperature logs above with no reading at all yet today", ar: "13:00 — سجلات الحرارة أعلاه بلا أي قراءة اليوم" })} />

      <RuleBlock k="expiries" rule={rules.expiries} onChange={(patch) => set("expiries", patch)} t={t} when={t({ en: "08:00 — calibration, training & health certificates, licences/contracts, mock recall (every 90 days)", ar: "08:00 — المعايرة، شهادات التدريب والصحة، الرخص والعقود، تمرين السحب (كل 90 يوماً)" })}>
        <label style={S.field}>
          <span className="alp-s" style={S.label}>{t({ en: "Warn this many days before", ar: "نبّه قبل هذا العدد من الأيام" })}</span>
          <input style={{ ...S.input, width: 120 }} type="number" min="1" max="180" value={rules.expiries.days} onChange={(e) => set("expiries", { days: Number(e.target.value) || 30 })} />
        </label>
      </RuleBlock>

      <RuleBlock k="capa" rule={rules.capa} onChange={(patch) => set("capa", patch)} t={t} when={t({ en: "08:00, weekly reminder — CAPA / NCR past its target date, or open too long without one", ar: "08:00، تذكير أسبوعي — CAPA / NCR تجاوز تاريخه المستهدف، أو مفتوح طويلاً بلا تاريخ" })}>
        <label style={S.field}>
          <span className="alp-s" style={S.label}>{t({ en: "No target date: overdue after (days)", ar: "بلا تاريخ مستهدف: متأخر بعد (يوم)" })}</span>
          <input style={{ ...S.input, width: 120 }} type="number" min="1" max="365" value={rules.capa.openDays} onChange={(e) => set("capa", { openDays: Number(e.target.value) || 30 })} />
        </label>
      </RuleBlock>

      {err && <div style={S.bad}>{err}</div>}
      {msg && <div style={S.ok}>{msg}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.pri} disabled={saving} onClick={save}>💾 {t({ en: "Save rules", ar: "حفظ القواعد" })}</button>
        <button type="button" style={S.btn} disabled={running} onClick={() => runNow(true)}>▶ {t({ en: "Run the 08:00 checks now", ar: "شغّل فحص 08:00 الآن" })}</button>
        <button type="button" style={S.btn} disabled={running} onClick={() => runNow(false)}>▶ {t({ en: "Run the 13:00 check now", ar: "شغّل فحص 13:00 الآن" })}</button>
      </div>
      <div className="alp-s" style={{ color: "#475569" }}>{isAr ? "احفظ القواعد قبل التشغيل اليدوي." : "Save the rules before a manual run."}</div>
    </div>
  );
}

/* One rule: title, when it runs, on/off, its own settings and its recipients.
   A component of its own (not defined inside RulesEditor) so typing in its
   inputs does not remount it and drop the focus. */
function RuleBlock({ k, rule, onChange, t, when, children }) {
  return (
    <section style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="alp-big">{RULE_INFO[k].icon}</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="alp-h" style={{ fontWeight: 900 }}>{t(RULE_INFO[k])}</div>
          <div className="alp-s" style={{ color: "#475569" }}>{when}</div>
        </div>
        <label style={S.switch}>
          <input type="checkbox" checked={rule.enabled !== false} onChange={(e) => onChange({ enabled: e.target.checked })} />
          {t({ en: "On", ar: "مفعّل" })}
        </label>
      </div>
      {rule.enabled !== false && (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {children}
          <label style={S.field}>
            <span className="alp-s" style={S.label}>{t({ en: "E-mail to (comma separated — empty = bell only)", ar: "إرسال بالإيميل إلى (افصل بفاصلة — فارغ = الجرس فقط)" })}</span>
            <input
              style={S.input}
              dir="ltr"
              defaultValue={(rule.emails || []).join(", ")}
              onBlur={(e) => onChange({ emails: e.target.value.split(/[,;\s]+/).filter(Boolean) })}
              placeholder="qa@company.com, manager@company.com"
            />
          </label>
        </div>
      )}
    </section>
  );
}

const FONT = "Cairo, Tajawal, system-ui, sans-serif";
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f2f7fc,#e8f1fa)", padding: "22px 16px 70px", fontFamily: FONT, color: "#0f2740" },
  wrap: { maxWidth: 1040, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18, padding: "18px 20px", background: "#fff", border: "1px solid #e3edf7", borderRadius: 20, boxShadow: "0 10px 28px rgba(15,39,64,.06)" },
  headIcon: { width: 62, height: 62, borderRadius: 20, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontSize: 30, flexShrink: 0 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  tab: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 999, border: "1px solid #cfdeec", background: "#fff", color: "#1e3a5f", fontWeight: 800, cursor: "pointer" },
  tabOn: { background: "#0f2740", color: "#fff", borderColor: "#0f2740", boxShadow: "0 8px 18px rgba(15,39,64,.22)" },
  tabCount: { minWidth: 28, padding: "0 8px", borderRadius: 999, background: "#e8f1fa", color: "#0f2740", fontWeight: 900, textAlign: "center" },
  tabCountOn: { background: "rgba(255,255,255,.2)", color: "#fff" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 },
  kpi: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 18, border: "2px solid", background: "#fff", textAlign: "start" },
  toolbar: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  searchIcon: { position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, border: "1px solid #cfdeec", background: "#fff", color: "#1e3a5f", fontWeight: 700, cursor: "pointer" },
  chipOn: { background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" },
  filterNote: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", color: "#334155", fontWeight: 800, marginBottom: 12 },
  linkBtn: { border: 0, background: "none", color: "#2563eb", fontWeight: 800, cursor: "pointer", padding: 0, textDecoration: "underline" },
  dayHead: { display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 10px" },
  dayCount: { padding: "0 9px", borderRadius: 999, background: "#dbe8f5", color: "#0f2740", fontWeight: 900 },
  dayRule: { flex: 1, height: 1, background: "#cfdeec" },
  card: { background: "#fff", border: "1px solid #e3edf7", borderRadius: 18, padding: "16px 18px", boxShadow: "0 8px 22px rgba(15,39,64,.05)" },
  iconBox: { width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", border: "1px solid", flexShrink: 0 },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, border: "1px solid", fontWeight: 900 },
  tag: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 800 },
  body: { color: "#1e293b", whiteSpace: "pre-line", marginTop: 8, padding: "10px 12px", background: "#f8fbff", border: "1px solid #e8f0f8", borderRadius: 12, fontWeight: 600 },
  state: { marginTop: 8, padding: "6px 10px", borderRadius: 10, fontWeight: 700, display: "inline-block" },
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: "1px solid #cfdeec", background: "#fff", color: "#0f2740", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  pri: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: 0, background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(37,99,235,.25)" },
  empty: { background: "#fff", border: "2px dashed #cfdeec", borderRadius: 20, padding: 36, textAlign: "center", color: "#334155", fontWeight: 800 },
  skeleton: { height: 110, borderRadius: 18, background: "linear-gradient(90deg,#eef4fa,#f8fbff,#eef4fa)", border: "1px solid #e3edf7" },
  bad: { padding: "11px 14px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 800, marginBottom: 12 },
  warn: { padding: "11px 14px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 800 },
  ok: { padding: "11px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 800 },
  switch: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, cursor: "pointer", padding: "6px 12px", borderRadius: 999, border: "1px solid #cfdeec", background: "#fbfdff" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontWeight: 800, color: "#1e3a5f" },
  input: { width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid #cfdeec", background: "#fff", color: "#0f2740", boxSizing: "border-box", fontWeight: 600 },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid #e3edf7", borderRadius: 12, background: "#fbfdff", flexWrap: "wrap" },
  x: { border: 0, background: "none", color: "#b91c1c", fontWeight: 900, cursor: "pointer", padding: "2px 6px" },
};
