// src/pages/alerts/AlertsPage.jsx
//
// 🔔 التنبيهات — what the server found by itself (inspection-server
// utils/alertEngine.cjs): a phone temperature reading out of range, a daily
// log not filed, a calibration / certificate about to expire, a CAPA past its
// date. Open → "Seen" (ack) → closed by the system when the problem is gone
// (e.g. a recheck back in range).
// Admins also get the Rules tab: which checks run and who is e-mailed.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { BRANCHES } from "../settings/reportTypeCatalog";
import {
  fetchAlerts, ackAlert, ackAllAlerts, fetchAlertRules, saveAlertRules, runAlertChecks,
  isAlertsAdmin, alertVisible, SEVERITY, RULE_INFO, ALERTS_EVENT,
} from "../../utils/alertsApi";

const TABS = [
  { id: "open", en: "Open", ar: "مفتوحة" },
  { id: "ack", en: "Seen", ar: "تم الاطلاع" },
  { id: "resolved", en: "Closed", ar: "مغلقة" },
];

const CSS = `
#root .alp, #root .alp * { font-size: 15px !important; }
#root .alp .alp-title { font-size: 26px !important; }
#root .alp .alp-h { font-size: 17px !important; }
#root .alp .alp-s, #root .alp .alp-s * { font-size: 13px !important; }
#root .alp .alp-big { font-size: 22px !important; }
#root .alp textarea, #root .alp input, #root .alp select { font-family: inherit; }
`;

const fmtWhen = (iso, ar) => (iso ? new Date(iso).toLocaleString(ar ? "ar-AE" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function AlertsPage() {
  const navigate = useNavigate();
  const { t, dir, lang, toggle, isAr } = useSettingsLang();
  const admin = isAlertsAdmin();
  const [tab, setTab] = useState("open");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ruleFilter, setRuleFilter] = useState("");
  const [busy, setBusy] = useState(0);

  const load = useCallback(async () => {
    if (tab === "rules") return;
    setLoading(true);
    try {
      setList((await fetchAlerts(tab, 300)).filter(alertVisible));
      setErr("");
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

  const shown = useMemo(() => (ruleFilter ? list.filter((a) => a.rule === ruleFilter) : list), [list, ruleFilter]);
  const counts = useMemo(() => {
    const c = {};
    list.forEach((a) => { c[a.rule] = (c[a.rule] || 0) + 1; });
    return c;
  }, [list]);

  const ack = async (a) => {
    setBusy(a.id);
    try { await ackAlert(a.id); } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(0); }
  };
  const ackAll = async () => {
    if (!window.confirm(t({ en: "Mark every open alert as seen?", ar: "تعليم كل التنبيهات المفتوحة «تم الاطلاع»؟" }))) return;
    try { await ackAllAlerts(); } catch (e) { setErr(String(e?.message || e)); }
  };

  return (
    <div dir={dir} className="alp" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        <header style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={S.headIcon}>🔔</span>
            <div>
              <div className="alp-title" style={{ fontWeight: 900 }}>{t({ en: "Alerts", ar: "التنبيهات" })}</div>
              <div className="alp-s" style={{ color: "#6b8299", fontWeight: 700 }}>
                {t({ en: "Found by the system itself — temperatures, missed logs, expiries, overdue CAPA", ar: "يكتشفها النظام بنفسه — الحرارة، التقارير الفائتة، الانتهاء، CAPA المتأخرة" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <LangToggle lang={lang} toggle={toggle} style={S.btn} />
            <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>{t({ en: "Home", ar: "الرئيسية" })}</button>
          </div>
        </header>

        <div style={S.tabs}>
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTab(x.id)} style={{ ...S.tab, ...(tab === x.id ? S.tabOn : null) }}>
              {isAr ? x.ar : x.en}{tab === x.id && !loading ? ` · ${list.length}` : ""}
            </button>
          ))}
          {admin && (
            <button type="button" onClick={() => setTab("rules")} style={{ ...S.tab, ...(tab === "rules" ? S.tabOn : null) }}>
              ⚙️ {t({ en: "Rules & e-mail", ar: "القواعد والإيميل" })}
            </button>
          )}
        </div>

        {tab === "rules" ? (
          <RulesEditor t={t} isAr={isAr} />
        ) : (
          <>
            {list.length > 0 && (
              <div style={S.chips}>
                <button type="button" style={{ ...S.chip, ...(!ruleFilter ? S.chipOn : null) }} onClick={() => setRuleFilter("")}>{t({ en: "All", ar: "الكل" })} · {list.length}</button>
                {Object.entries(counts).map(([r, n]) => (
                  <button key={r} type="button" style={{ ...S.chip, ...(ruleFilter === r ? S.chipOn : null) }} onClick={() => setRuleFilter(r)}>
                    {RULE_INFO[r]?.icon} {t(RULE_INFO[r] || { en: r, ar: r })} · {n}
                  </button>
                ))}
                {tab === "open" && <span style={{ flex: 1 }} />}
                {tab === "open" && <button type="button" style={S.btn} onClick={ackAll}>✓ {t({ en: "Mark all seen", ar: "تعليم الكل" })}</button>}
              </div>
            )}
            {err && <div style={S.bad}>{err}</div>}
            {loading && <div className="alp-s" style={S.empty}>{t({ en: "Loading…", ar: "جاري التحميل…" })}</div>}
            {!loading && !err && shown.length === 0 && (
              <div style={S.empty}>
                <div className="alp-big">✅</div>
                {tab === "open" ? t({ en: "No open alerts — all clear.", ar: "لا توجد تنبيهات مفتوحة — كل شيء تمام." }) : t({ en: "Nothing here.", ar: "لا شيء هنا." })}
              </div>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              {shown.map((a) => {
                const sv = SEVERITY[a.severity] || SEVERITY.warning;
                return (
                  <div key={a.id} style={{ ...S.card, borderInlineStart: `5px solid ${sv.color}` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span className="alp-big">{RULE_INFO[a.rule]?.icon || sv.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: sv.color }} dir="auto">{a.title}</div>
                        <div className="alp-s" style={{ color: "#64748b", marginTop: 2 }}>
                          {[a.branch, t(RULE_INFO[a.rule] || { en: a.rule, ar: a.rule }), fmtWhen(a.created_at, isAr)].filter(Boolean).join(" · ")}
                          {a.emailed_at ? ` · ✉️ ${t({ en: "e-mailed", ar: "أُرسل بالإيميل" })}` : ""}
                        </div>
                        {a.body && <div style={{ color: "#334155", whiteSpace: "pre-line", marginTop: 6 }} dir="auto">{a.body}</div>}
                        {a.status === "ack" && (
                          <div className="alp-s" style={{ color: "#475569", marginTop: 6 }}>✓ {t({ en: "Seen by", ar: "اطّلع عليه" })} {a.ack_by || "—"} · {fmtWhen(a.ack_at, isAr)}</div>
                        )}
                        {a.status === "resolved" && (
                          <div className="alp-s" style={{ color: "#15803d", marginTop: 6 }}>
                            ✔ {t({ en: "Closed by the system", ar: "أغلقه النظام" })} · {fmtWhen(a.resolved_at, isAr)}{a.data?.resolvedNote ? ` — ${a.data.resolvedNote}` : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {a.status === "open" && (
                          <button type="button" style={S.pri} disabled={busy === a.id} onClick={() => ack(a)}>✓ {t({ en: "Seen", ar: "تم الاطلاع" })}</button>
                        )}
                        {a.link && <button type="button" style={S.btn} onClick={() => navigate(a.link)}>{t({ en: "Open", ar: "فتح" })}</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
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
          en: "The system checks at 08:00 (yesterday's logs, expiries, CAPA) and 13:00 (no temperature reading yet today), UAE time. A temperature out of range is raised the moment the phone reading is saved.",
          ar: "يفحص النظام الساعة 08:00 (تقارير أمس، الانتهاء، CAPA) و13:00 (لا قراءة حرارة اليوم بعد) بتوقيت الإمارات. الحرارة خارج الحد تُنبَّه لحظة حفظ القراءة من الجوال.",
        })}
      </div>

      <RuleBlock k="temperature" rule={rules.temperature} onChange={(patch) => set("temperature", patch)} t={t} when={t({ en: "Instantly, when a phone (QR) reading is out of range. A recheck back in range closes it.", ar: "فوراً عند قراءة جوال (QR) خارج الحد. إعادة القياس داخل الحد تغلقه." })} />

      <RuleBlock k="missedReports" rule={rules.missedReports} onChange={(patch) => set("missedReports", patch)} t={t} when={t({ en: "08:00 — logs not filed for yesterday (phone readings alone do not file a day)", ar: "08:00 — تقارير أمس غير المعبّأة (قراءات الجوال وحدها لا تكفي)" })}>
        <div style={{ display: "grid", gap: 6 }}>
          {checks.map((c, i) => (
            <div key={`${c.type}-${i}`} style={S.checkRow}>
              <span style={{ fontWeight: 800 }}>{c.branch}</span>
              <span style={{ flex: 1 }}>{c.label || c.type}</span>
              <code className="alp-s" style={{ color: "#64748b" }}>{c.type}</code>
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
          <div className="alp-s" style={{ color: "#64748b" }}>
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
      <div className="alp-s" style={{ color: "#64748b" }}>{isAr ? "احفظ القواعد قبل التشغيل اليدوي." : "Save the rules before a manual run."}</div>
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
          <div className="alp-s" style={{ color: "#64748b" }}>{when}</div>
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
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f2f7fc,#e8f1fa)", padding: "18px 14px 60px", fontFamily: FONT, color: "#0f2740" },
  wrap: { maxWidth: 980, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 },
  headIcon: { width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontSize: 28 },
  tabs: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  tab: { padding: "9px 16px", borderRadius: 999, border: "1px solid #cfdeec", background: "#fff", color: "#35536e", fontWeight: 800, cursor: "pointer", fontFamily: FONT },
  tabOn: { background: "#0f2740", color: "#fff", borderColor: "#0f2740" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  chip: { padding: "5px 12px", borderRadius: 999, border: "1px solid #cfdeec", background: "#fff", color: "#35536e", fontWeight: 700, cursor: "pointer", fontFamily: FONT },
  chipOn: { background: "#e0f2fe", borderColor: "#7dd3fc", color: "#075985" },
  card: { background: "#fff", border: "1px solid #e3edf7", borderRadius: 16, padding: 14, boxShadow: "0 8px 22px rgba(15,39,64,.05)" },
  btn: { padding: "8px 14px", borderRadius: 11, border: "1px solid #cfdeec", background: "#fff", color: "#0f2740", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT },
  pri: { padding: "8px 14px", borderRadius: 11, border: 0, background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT },
  empty: { background: "#fff", border: "1px dashed #cfdeec", borderRadius: 16, padding: 28, textAlign: "center", color: "#6b8299", fontWeight: 800 },
  bad: { padding: "9px 12px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 700, marginBottom: 10 },
  warn: { padding: "9px 12px", borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 700 },
  ok: { padding: "9px 12px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 700 },
  switch: { display: "flex", alignItems: "center", gap: 6, fontWeight: 800, cursor: "pointer" },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontWeight: 800, color: "#35536e" },
  input: { width: "100%", padding: "9px 12px", borderRadius: 11, border: "1px solid #cfdeec", background: "#fbfdff", color: "#0f2740", boxSizing: "border-box" },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", border: "1px solid #eef3f8", borderRadius: 10, background: "#fbfdff" },
  x: { border: 0, background: "none", color: "#b91c1c", fontWeight: 900, cursor: "pointer" },
};
