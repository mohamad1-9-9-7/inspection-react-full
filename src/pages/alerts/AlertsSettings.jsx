// src/pages/alerts/AlertsSettings.jsx
//
// ⚙️ Alerts settings (admins):
//   📬 Reminders   — per BRANCH (the company's 9 sites), its own reminders:
//                    each says WHAT is sent (alert types, expiry kinds,
//                    critical only) and WHO gets it (To / CC / BCC from the
//                    e-mail center's contacts). Several per branch.
//                    rules.reminders — server: alertEngine reminderMatches.
//   🧭 Coverage    — branch × alert type: who receives what; 0 = nobody.
//   ⚙️ Checks      — each check on/off and its own settings.
//   📜 Send log    — every alert e-mail.
//
// The old per-rule e-mail lists (rules[k].emails) become "general" reminders
// on load (limited to the rules they were on) and are emptied on save.
//
// Fonts: globals.css forces 14px — sizes come from the page's .alp classes.

import React, { useEffect, useMemo, useState } from "react";
import { BRANCHES } from "../settings/reportTypeCatalog";
import { fetchAlertRules, saveAlertRules, runAlertChecks, sendTestAlertMail, sendRemindersNow, fetchAlertSendLog, RULE_INFO } from "../../utils/alertsApi";
import { canonBranch } from "../../utils/branchCanon";
import ContactPicker from "../shared/ContactPicker";
import { listEmailContacts } from "../shared/emailReportSettings";

const RULES = ["temperature", "ccp", "missedReports", "noReadingToday", "expiries", "capa"];
/* The kinds of expiry the server can remind (inspection-server alertEngine EXPIRY_KINDS). */
const EXPIRY_KINDS = [
  { id: "licences", icon: "📄", en: "Licences", ar: "الرخص" },
  { id: "contracts", icon: "🤝", en: "Contracts", ar: "العقود" },
  { id: "calibration", icon: "🎚️", en: "Calibration", ar: "المعايرة" },
  { id: "training", icon: "🎓", en: "Training certificates", ar: "شهادات التدريب" },
  { id: "ohc", icon: "🩺", en: "Health certificates (OHC)", ar: "الشهادات الصحية" },
  { id: "supplier", icon: "🚚", en: "Supplier documents", ar: "مستندات الموردين" },
  { id: "mockRecall", icon: "🔁", en: "Mock recall drill", ar: "تمرين السحب" },
];
const ALL_TYPES = BRANCHES.flatMap((b) => (b.types || []).map(([type, label]) => ({ type, label: `${b.label} — ${label}`, branch: b.label })));
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/* Branches compare by their canonical code — "POS 15", "AL BARSHA BUTCHERY
   (POS15)" and "Al Barsha Butchery" are one branch (same rule as the server). */
const norm = canonBranch;
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const ALL = "__all";

/* The company's branches — reminders are set for these only. Keys are the
   canonical branch codes (utils/branchCanon), so every spelling a report
   uses lands on the right branch. */
const BRANCH_LIST = [
  { key: "POS 10", icon: "🏪", en: "POS 10 — Abu Dhabi Butchery", ar: "POS 10 — ملحمة أبوظبي" },
  { key: "POS 14", icon: "🏪", en: "POS 14 — Al Ain Butchery", ar: "POS 14 — ملحمة العين" },
  { key: "POS 15", icon: "🏪", en: "POS 15 — Al Barsha Butchery", ar: "POS 15 — ملحمة البرشاء" },
  { key: "POS 6", icon: "🏪", en: "POS 6", ar: "POS 6" },
  { key: "QCS", icon: "🏭", en: "Al Qusais Warehouse (QCS)", ar: "مستودع القصيص (QCS)" },
  { key: "AL WARQA KITCHEN", icon: "🍳", en: "Al Warqa Kitchen", ar: "مطبخ الورقاء" },
  { key: "FTR 1", icon: "🚚", en: "FTR 1 — Food truck (Mushrif)", ar: "FTR 1 — فود ترك مشرف" },
  { key: "FTR 2", icon: "🚚", en: "FTR 2 — Food truck (Al Mamzar)", ar: "FTR 2 — فود ترك الممزر" },
  { key: "PRODUCTION", icon: "⚙️", en: "Production", ar: "البرودكشن" },
];

/* Same routing as the server — the coverage view must not lie. */
const alertKindOk = (rem, rule, kind) => rule !== "expiries" || !rem.kinds?.length || !kind || rem.kinds.includes(kind);
function remindersFor(rules, rule, branch, critical = true, kind = "") {
  const br = norm(branch);
  return (rules.reminders || []).filter((r) => r.active !== false
    && (r.branch === ALL || (br && r.branch === br))
    && (!r.rules?.length || r.rules.includes(rule))
    && alertKindOk(r, rule, kind)
    && (!r.onlyCritical || critical));
}
function resolveRecipients(rules, rule, branch, critical = true) {
  const rems = remindersFor(rules, rule, branch, critical);
  const to = [...new Set([...(rules[rule]?.emails || []), ...rems.flatMap((r) => r.to)])];
  const cc = [...new Set(rems.flatMap((r) => r.cc))].filter((e) => !to.includes(e));
  const bcc = [...new Set(rems.flatMap((r) => r.bcc))].filter((e) => !to.includes(e) && !cc.includes(e));
  return { to, cc, bcc };
}

/** Old per-rule lists → "general" reminders (one per rule, all branches).
    The server already turned older per-person / per-branch setups into
    rules.reminders. The old global expiry-kind filter moves into the
    reminders too (each reminder picks its kinds), so it is cleared. */
function migrate(rules) {
  const reminders = (rules.reminders || []).map((r) => ({ ...r, to: [...r.to], cc: [...r.cc], bcc: [...r.bcc] }));
  let moved = 0;
  const next = { ...rules };
  RULES.forEach((k) => {
    const emails = [...new Set((rules[k]?.emails || []).map((e) => String(e).toLowerCase()))];
    if (emails.length) {
      moved += emails.length;
      reminders.push({ id: newId(), name: t0(RULE_INFO[k]), branch: ALL, rules: [k], kinds: [], onlyCritical: false, active: true, to: emails, cc: [], bcc: [] });
    }
    next[k] = { ...rules[k], emails: [] };
  });
  if (rules.expiries?.kinds?.length) next.expiries = { ...next.expiries, kinds: [] };
  next.reminders = reminders;
  return { rules: next, moved };
}
const t0 = (o) => (o ? o.en : "");

export default function AlertsSettings({ t, isAr }) {
  const [rules, setRules] = useState(null);
  const [mailbox, setMailbox] = useState(true);
  const [view, setView] = useState("people");
  const [dirty, setDirty] = useState(false);
  const [moved, setMoved] = useState(0);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  // An older server drops rules.reminders on save — then keep the old lists
  // untouched and lock the reminders editor until the server is updated.
  const [serverReady, setServerReady] = useState(true);

  useEffect(() => {
    fetchAlertRules()
      .then((j) => {
        const ready = Array.isArray(j.rules?.reminders);
        setServerReady(ready);
        const m = ready ? migrate(j.rules) : { rules: { ...j.rules, reminders: [] }, moved: 0 };
        setRules(m.rules);
        setMoved(m.moved);
        setDirty(m.moved > 0);
        setMailbox(j.mailbox !== false);
      })
      .catch((e) => setErr(String(e?.message || e)));
  }, []);

  if (err && !rules) return <div style={S.bad}>⚠️ {err}</div>;
  if (!rules) return <div className="alp-s" style={S.loading}>{t({ en: "Loading…", ar: "جاري التحميل…" })}</div>;

  const update = (fn) => { setRules((r) => fn(r)); setDirty(true); setMsg(""); };
  const setRule = (k, patch) => update((r) => ({ ...r, [k]: { ...r[k], ...patch } }));
  const setReminders = (fn) => update((r) => ({ ...r, reminders: fn(r.reminders || []) }));

  const save = async () => {
    setSaving(true); setMsg(""); setErr("");
    try {
      const j = await saveAlertRules(rules);
      setRules(j.rules);
      setDirty(false); setMoved(0);
      setMsg(t({ en: "Saved ✓", ar: "تم الحفظ ✓" }));
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

  const VIEWS = [
    { id: "people", icon: "📬", en: "Reminders by branch", ar: "التذكيرات حسب الفرع", n: (rules.reminders || []).length },
    { id: "coverage", icon: "🧭", en: "Coverage map", ar: "خريطة التغطية" },
    { id: "checks", icon: "⚙️", en: "Checks", ar: "الفحوصات", n: RULES.filter((k) => rules[k]?.enabled !== false).length },
    { id: "log", icon: "📜", en: "Send log", ar: "سجل الإرسال" },
  ];

  return (
    <div style={{ display: "grid", gap: 14, paddingBottom: dirty ? 90 : 0 }}>
      {!mailbox && (
        <div style={S.warn}>📭 {t({ en: "This company has no mailbox of its own yet — alerts show in the bell, e-mails are not sent.", ar: "هذه الشركة ليس لها بريد خاص بعد — التنبيهات تظهر بالجرس، والإيميل لا يُرسل." })}</div>
      )}
      {!serverReady && (
        <div style={S.warn}>⚠️ {t({ en: "The server is not updated yet — reminders cannot be saved. The old e-mail lists keep working.", ar: "السيرفر لم يُحدَّث بعد — ما بتنحفظ التذكيرات. القوائم القديمة ما زالت تعمل." })}</div>
      )}
      {moved > 0 && (
        <div style={S.info}>
          ℹ️ {t({ en: `${moved} address(es) from the old per-check lists became general reminders. Save to keep it this way.`, ar: `تم تحويل ${moved} عنوان من القوائم القديمة لتذكيرات عامة. احفظ لتثبيت ذلك.` })}
        </div>
      )}

      <div style={S.seg} role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} style={{ ...S.segBtn, ...(view === v.id ? S.segOn : null) }}>
            <span aria-hidden="true">{v.icon}</span> {t(v)}
            {v.n !== undefined && <span style={{ ...S.segN, ...(view === v.id ? S.segNOn : null) }}>{v.n}</span>}
          </button>
        ))}
      </div>

      {view === "people" && (
        <People t={t} isAr={isAr} locked={!serverReady} rules={rules} setReminders={setReminders} mailbox={mailbox} dirty={dirty} />
      )}
      {view === "log" && <SendLog t={t} isAr={isAr} />}
      {view === "coverage" && <Coverage t={t} rules={rules} onPick={() => setView("people")} />}
      {view === "checks" && <Checks t={t} rules={rules} setRule={setRule} running={running} runNow={runNow} dirty={dirty} />}

      {err && <div style={S.bad}>⚠️ {err}</div>}
      {msg && !dirty && <div style={S.ok}>{msg}</div>}

      {dirty && (
        <div style={S.saveBar} role="status">
          <span className="alp-s" style={{ fontWeight: 900 }}>● {t({ en: "Unsaved changes", ar: "تغييرات غير محفوظة" })}</span>
          <button type="button" style={S.pri} disabled={saving} onClick={save}>💾 {saving ? "…" : t({ en: "Save", ar: "حفظ" })}</button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 📬 Reminders ─────────────────────────
   Per branch: its own reminders. Each one says WHAT is reminded (alert
   types; for expiries which kinds; critical only) and WHO gets it (To / CC /
   BCC from the e-mail center's contacts, same picker as the send window).
   A branch can have several — different people, or the same people with a
   slightly different kind of reminder. Server: alertEngine reminders. */

const FIELDS = [
  { id: "to", label: "To", ar: "إلى (To)" },
  { id: "cc", label: "CC", ar: "نسخة (CC)" },
  { id: "bcc", label: "BCC", ar: "نسخة مخفية (BCC)" },
];

/* Ready-made starting points for a new reminder. */
const PRESETS = [
  { id: "docs", icon: "🤝", en: "Contracts & licences", ar: "العقود والرخص", rules: ["expiries"], kinds: ["contracts", "licences"] },
  { id: "cal", icon: "🎚️", en: "Calibration", ar: "المعايرة", rules: ["expiries"], kinds: ["calibration"] },
  { id: "certs", icon: "🎓", en: "Staff certificates", ar: "شهادات الموظفين", rules: ["expiries"], kinds: ["training", "ohc"] },
  { id: "temp", icon: "🌡️", en: "Temperature & CCP", ar: "الحرارة و CCP", rules: ["temperature", "ccp", "noReadingToday"], kinds: [] },
  { id: "logs", icon: "📋", en: "Daily logs & CAPA", ar: "التقارير اليومية و CAPA", rules: ["missedReports", "capa"], kinds: [] },
  { id: "all", icon: "🔔", en: "Everything", ar: "كل شي", rules: [], kinds: [] },
];

const covers = (rem, rule) => !rem.rules?.length || rem.rules.includes(rule);

function People({ t, isAr, locked, rules, setReminders, mailbox, dirty }) {
  const [branch, setBranch] = useState(BRANCH_LIST[0].key);
  const [sending, setSending] = useState("");
  const [note, setNote] = useState("");
  // the e-mail center's contact book — same people and picker as every e-mail popup
  const [book, setBook] = useState([]);
  const loadBook = () => listEmailContacts().then((l) => setBook(Array.isArray(l) ? l : [])).catch(() => {});
  useEffect(() => { loadBook(); }, []);
  const nameOf = (email) => book.find((b) => b.email?.toLowerCase() === email)?.name || email;

  const reminders = rules.reminders || [];
  const general = reminders.some((r) => r.branch === ALL);
  const rail = general ? [...BRANCH_LIST, { key: ALL, icon: "🌐", en: "All branches (general)", ar: "كل الفروع (عام)" }] : BRANCH_LIST;
  const mine = reminders.filter((r) => r.branch === branch);
  const cur = rail.find((b) => b.key === branch) || rail[0];

  const patch = (id, p) => setReminders((list) => list.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = (preset) => setReminders((list) => [...list, {
    id: newId(), name: t(preset), branch, rules: preset.rules, kinds: preset.kinds,
    onlyCritical: false, active: true, to: [], cc: [], bcc: [],
  }]);
  const duplicate = (r) => setReminders((list) => {
    const i = list.findIndex((x) => x.id === r.id);
    const copy = { ...r, id: newId(), name: r.name ? `${r.name} (2)` : "", to: [...r.to], cc: [...r.cc], bcc: [...r.bcc] };
    return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
  });
  const remove = (r) => {
    if (!window.confirm(t({ en: `Delete the reminder "${r.name || "—"}"?`, ar: `حذف التذكير «${r.name || "—"}»؟` }))) return;
    setReminders((list) => list.filter((x) => x.id !== r.id));
  };
  const copyTo = (r, keys) => setReminders((list) => [
    ...list,
    ...keys.map((k) => ({ ...r, id: newId(), branch: k, to: [...r.to], cc: [...r.cc], bcc: [...r.bcc] })),
  ]);

  /* A test e-mail to each person of one reminder. */
  const testRem = async (r) => {
    const people = [...new Set([...r.to, ...r.cc, ...r.bcc])];
    if (!people.length) return;
    setSending(`test:${r.id}`); setNote("");
    const label = t(rail.find((b) => b.key === r.branch) || { en: r.branch, ar: r.branch });
    let ok = 0;
    for (const email of people) {
      try { await sendTestAlertMail({ email, name: nameOf(email) === email ? "" : nameOf(email), branches: [label] }); ok++; } catch { /* counted below */ }
    }
    setNote(ok === people.length
      ? t({ en: `Test e-mail sent to ${ok} person(s).`, ar: `انبعت إيميل تجريبي لـ ${ok} شخص.` })
      : `⚠️ ${t({ en: `Test sent to ${ok} of ${people.length}.`, ar: `انبعت التجريبي لـ ${ok} من ${people.length}.` })}`);
    setSending("");
  };

  /* The REAL expiry reminders, now: one reminder, this branch, or every branch. */
  const sendNow = async ({ reminderId = "", key = "" } = {}) => {
    if (dirty) { setNote(`⚠️ ${t({ en: "Save the changes first — sending uses the saved reminders.", ar: "احفظ التغييرات أولاً — الإرسال بيعتمد على التذكيرات المحفوظة." })}`); return; }
    const what = reminderId ? `«${reminders.find((r) => r.id === reminderId)?.name || "—"}»` : key ? t(rail.find((b) => b.key === key) || { en: key, ar: key }) : t({ en: "every branch", ar: "كل الفروع" });
    if (!window.confirm(t({ en: `Send the expiry reminders now — ${what}? Real e-mails with the documents attached.`, ar: `إرسال تذكيرات الانتهاء الآن — ${what}؟ إيميلات حقيقية مع المستندات مرفقة.` }))) return;
    setSending(reminderId || key || "__every"); setNote("");
    try {
      const r = await sendRemindersNow({ reminderId, branch: key && key !== ALL ? key : "" });
      if (!r.items) setNote(t({ en: "Nothing is expiring or expired right now — no e-mail sent.", ar: "ما في شي منتهي أو قريب الانتهاء حالياً — ما انبعت إيميل." }));
      else if (!r.sent && !r.failed) setNote(`⚠️ ${t({ en: "No reminder covers what is expiring now.", ar: "ما في تذكير بيغطي اللي عم ينتهي هلق." })}`);
      else setNote(`${r.failed ? "⚠️ " : ""}${t({
        en: `${r.sent} e-mail(s) sent to ${r.recipients} address(es) — ${r.items} item(s).${r.failed ? ` ${r.failed} failed.` : ""}`,
        ar: `انبعت ${r.sent} إيميل إلى ${r.recipients} عنوان — ${r.items} بند.${r.failed ? ` فشل ${r.failed}.` : ""}`,
      })}`);
    } catch (e) {
      setNote(`⚠️ ${e?.message === "no_mailbox" ? t({ en: "No mailbox for this company.", ar: "لا يوجد بريد لهذه الشركة." }) : String(e?.message || e)}`);
    } finally {
      setSending("");
    }
  };

  return (
    <div className="als-split" style={S.split}>
      {/* branch rail — the company's branches only */}
      <aside style={S.rail}>
        <div className="alp-xs" style={S.railHead}>{t({ en: "BRANCHES", ar: "الفروع" })}</div>
        {rail.map((b) => {
          const list = reminders.filter((r) => r.branch === b.key);
          const live = list.filter((r) => r.active !== false && (r.to.length + r.cc.length + r.bcc.length) > 0).length;
          return (
            <button key={b.key} type="button" onClick={() => { setBranch(b.key); setNote(""); }} style={{ ...S.brItem, ...(branch === b.key ? S.brOn : null) }}>
              <span aria-hidden="true">{b.icon}</span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                <span className="alp-s" style={{ fontWeight: 900, display: "block", lineHeight: 1.3 }}>{t(b)}</span>
                <span className="alp-xs" style={{ display: "block", color: branch === b.key ? "#0f766e" : "#64748b", fontWeight: 700 }}>
                  {list.length ? t({ en: `${list.length} reminder(s)`, ar: `${list.length} تذكير` }) : t({ en: "no reminders", ar: "بدون تذكيرات" })}
                </span>
              </span>
              <span className="alp-xs" style={{ ...S.brN, ...(live ? null : S.brN0), ...(branch === b.key ? S.brNOn : null) }}>{live}</span>
            </button>
          );
        })}
        <div style={{ borderTop: "1px solid #eef2f6", marginTop: 6, paddingTop: 8 }}>
          <button type="button" style={{ ...S.btnSend, width: "100%", justifyContent: "center" }} disabled={locked || !mailbox || !!sending} onClick={() => sendNow({})}>
            📨 {sending === "__every" ? "…" : t({ en: "Send all reminders now", ar: "إرسال كل التذكيرات الآن" })}
          </button>
        </div>
      </aside>

      {/* this branch's reminders */}
      <section style={{ minWidth: 0, display: "grid", gap: 12, alignContent: "start" }}>
        <div style={S.peopleHead}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div className="alp-h" style={{ fontWeight: 900, color: "#0f172a" }}>{cur.icon} {t(cur)}</div>
            <div className="alp-s" style={{ color: "#475569", fontWeight: 700 }}>
              {t({ en: "Each reminder: what is sent, and to whom. Add as many as you need.", ar: "كل تذكير: شو بينبعت، ولمين. ضيف قد ما بدك." })}
            </div>
          </div>
          {mine.length > 0 && (
            <button type="button" style={S.btn} disabled={locked || !mailbox || !!sending} onClick={() => sendNow({ key: branch })}>
              📨 {sending === branch ? "…" : t({ en: "Send this branch's reminders now", ar: "إرسال تذكيرات الفرع الآن" })}
            </button>
          )}
        </div>

        {locked && <div style={S.warn}>⚠️ {t({ en: "The server is not updated yet — reminders cannot be saved.", ar: "السيرفر لم يُحدَّث بعد — ما بتنحفظ التذكيرات." })}</div>}
        {note && <div className="alp-s" style={note.startsWith("⚠️") ? S.bad : S.ok}>{note}</div>}

        {mine.map((r, i) => (
          <ReminderCard key={r.id} t={t} isAr={isAr} index={i + 1} rem={r} book={book} onBookChange={loadBook} nameOf={nameOf}
            locked={locked} mailbox={mailbox} sending={sending}
            onChange={(p) => patch(r.id, p)} onDuplicate={() => duplicate(r)} onDelete={() => remove(r)}
            onCopyTo={(keys) => copyTo(r, keys)} onSendNow={() => sendNow({ reminderId: r.id })} onTest={() => testRem(r)} branchKey={branch} />
        ))}

        {/* add a reminder: a ready-made start or a blank one */}
        <div style={S.addBox}>
          <div className="alp-s" style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            ＋ {mine.length ? t({ en: "Add another reminder", ar: "إضافة تذكير تاني" }) : t({ en: "Add this branch's first reminder", ar: "إضافة أول تذكير للفرع" })}
          </div>
          <div style={S.pills}>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" style={S.presetBtn} disabled={locked} onClick={() => add(p)}>{p.icon} {t(p)}</button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReminderCard({ t, isAr, index, rem, book, onBookChange, nameOf, locked, mailbox, sending, onChange, onDuplicate, onDelete, onCopyTo, onSendNow, onTest, branchKey }) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyKeys, setCopyKeys] = useState([]);
  const rulesSel = rem.rules || [];
  const kinds = rem.kinds || [];
  const expiryOn = covers(rem, "expiries");
  const people = rem.to.length + rem.cc.length + rem.bcc.length;
  const setField = (field, emails) => {
    const clean = [...new Set((emails || []).map((e) => String(e || "").trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];
    const next = { to: rem.to, cc: rem.cc, bcc: rem.bcc, [field]: clean };
    // one address once per reminder: adding to one field takes it out of the others
    FIELDS.forEach((f) => { if (f.id !== field) next[f.id] = next[f.id].filter((e) => !clean.includes(e)); });
    onChange(next);
  };
  const toggleRule = (k) => {
    const on = rulesSel.includes(k);
    const next = on ? rulesSel.filter((x) => x !== k) : [...rulesSel, k];
    onChange({ rules: next.length === RULES.length ? [] : next });
  };
  const toggleKind = (k) => {
    const on = kinds.includes(k);
    const next = on ? kinds.filter((x) => x !== k) : [...kinds, k];
    onChange({ kinds: next.length === EXPIRY_KINDS.length ? [] : next });
  };
  const whatText = [
    rulesSel.length ? rulesSel.map((k) => (k === "expiries" && kinds.length ? kinds.map((x) => t(EXPIRY_KINDS.find((e) => e.id === x))).join(" + ") : t(RULE_INFO[k]))).join(" · ") : t({ en: "every alert", ar: "كل التنبيهات" }),
    rem.onlyCritical && t({ en: "critical only", ar: "الحرجة بس" }),
  ].filter(Boolean).join(" — ");
  const whoText = FIELDS.filter((f) => rem[f.id].length).map((f) => `${f.label}: ${rem[f.id].map(nameOf).join(", ")}`).join("  ·  ");

  return (
    <article style={{ ...S.remCard, opacity: rem.active === false ? 0.65 : 1 }}>
      <div style={S.remHead}>
        <span style={S.remNo}>{index}</span>
        <input style={{ ...S.input, flex: "1 1 200px", fontWeight: 900 }} value={rem.name} disabled={locked}
          onChange={(e) => onChange({ name: e.target.value })} placeholder={t({ en: "Reminder name — e.g. Branch contracts", ar: "اسم التذكير — مثلاً: عقود الفرع" })} />
        <button type="button" role="switch" aria-checked={rem.active !== false} disabled={locked} onClick={() => onChange({ active: rem.active === false })}
          title={rem.active !== false ? t({ en: "On — click to pause", ar: "شغّال — اضغط للإيقاف" }) : t({ en: "Paused — click to resume", ar: "موقوف — اضغط للتشغيل" })}
          style={{ ...S.switch, ...(rem.active !== false ? S.switchOn : null) }}>
          <span style={{ ...S.knob, ...(rem.active !== false ? S.knobOn : null) }} />
        </button>
      </div>

      <div style={S.remSummary} className="alp-xs">
        <span><b>🔔 {t({ en: "What", ar: "شو" })}:</b> {whatText}</span>
        <span><b>👥 {t({ en: "To whom", ar: "لمين" })}:</b> {whoText || <span style={{ color: "#b91c1c" }}>{t({ en: "nobody yet", ar: "ما حدا لسا" })}</span>}</span>
      </div>

      {/* WHAT */}
      <div style={S.pickBlock}>
        <div style={S.pickHead}>
          <span className="alp-s" style={S.label}>🔔 {t({ en: "What does this reminder send?", ar: "شو بيبعت هالتذكير؟" })}</span>
          <button type="button" disabled={locked} style={{ ...S.pill, ...(!rulesSel.length ? S.pillOn : null) }} onClick={() => onChange({ rules: [] })}>
            {!rulesSel.length ? "✓ " : ""}{t({ en: "Every alert", ar: "كل التنبيهات" })}
          </button>
        </div>
        <div style={S.pills}>
          {RULES.map((k) => {
            const on = rulesSel.includes(k);
            return (
              <button key={k} type="button" disabled={locked} style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => toggleRule(k)}>
                {on ? "✓ " : ""}{RULE_INFO[k].icon} {t(RULE_INFO[k])}
              </button>
            );
          })}
        </div>
        {expiryOn && (
          <div style={S.subPick}>
            <div style={S.pickHead}>
              <span className="alp-xs" style={S.label}>⏳ {t({ en: "Which expiries?", ar: "أي انتهاءات؟" })}</span>
              <button type="button" disabled={locked} style={{ ...S.pill, ...(!kinds.length ? S.pillOn : null) }} onClick={() => onChange({ kinds: [] })}>
                {!kinds.length ? "✓ " : ""}{t({ en: "All kinds", ar: "كل الأنواع" })}
              </button>
            </div>
            <div style={S.pills}>
              {EXPIRY_KINDS.map((k) => {
                const on = kinds.includes(k.id);
                return (
                  <button key={k.id} type="button" disabled={locked} style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => toggleKind(k.id)}>
                    {on ? "✓ " : ""}{k.icon} {t(k)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label style={{ ...S.check, marginTop: 10 }}>
          <input type="checkbox" disabled={locked} checked={!!rem.onlyCritical} onChange={(e) => onChange({ onlyCritical: e.target.checked })} />
          🚨 {t({ en: "Critical only (expired, out of range)", ar: "الحرجة بس (منتهي، خارج الحد)" })}
        </label>
      </div>

      {/* WHO */}
      <div style={S.pickBlock}>
        <div className="alp-s" style={{ ...S.label, marginBottom: 8 }}>👥 {t({ en: "To whom?", ar: "لمين؟" })}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {FIELDS.map((f) => (
            <ContactPicker key={f.id} label={isAr ? f.ar : f.label} value={rem[f.id]} onChange={(v) => setField(f.id, v)}
              contacts={book} onContactsChange={onBookChange} disabled={locked} />
          ))}
        </div>
      </div>

      {copyOpen && (
        <div style={S.pickBlock}>
          <div className="alp-s" style={{ ...S.label, marginBottom: 8 }}>📋 {t({ en: "Copy this reminder to:", ar: "انسخ هالتذكير لـ:" })}</div>
          <div style={S.pills}>
            {BRANCH_LIST.filter((b) => b.key !== branchKey).map((b) => {
              const on = copyKeys.includes(b.key);
              return (
                <button key={b.key} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => setCopyKeys(on ? copyKeys.filter((x) => x !== b.key) : [...copyKeys, b.key])}>
                  {on ? "✓ " : ""}{b.icon} {t(b)}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" style={S.btnSm} onClick={() => { setCopyOpen(false); setCopyKeys([]); }}>{t({ en: "Cancel", ar: "إلغاء" })}</button>
            <button type="button" style={S.btnSend} disabled={!copyKeys.length} onClick={() => { onCopyTo(copyKeys); setCopyOpen(false); setCopyKeys([]); }}>
              ✓ {t({ en: `Copy to ${copyKeys.length || ""}`, ar: `انسخ لـ ${copyKeys.length || ""}` })}
            </button>
          </div>
        </div>
      )}

      <div style={S.personFoot}>
        <button type="button" style={S.btnSend} disabled={locked || !mailbox || !!sending || !expiryOn || !people || rem.active === false} onClick={onSendNow}
          title={expiryOn ? t({ en: "Send what is expiring now through this reminder (real e-mail)", ar: "ابعت اللي عم ينتهي هلق عن طريق هالتذكير (إيميل حقيقي)" }) : t({ en: "Send now works for expiry reminders", ar: "الإرسال الآن بيشتغل لتذكيرات الانتهاء" })}>
          📨 {sending === rem.id ? "…" : t({ en: "Send now", ar: "أرسل الآن" })}
        </button>
        <button type="button" style={S.btnSm} disabled={!mailbox || !people || !!sending} onClick={onTest}>✉️ {sending === `test:${rem.id}` ? "…" : t({ en: "Test", ar: "تجربة" })}</button>
        <button type="button" style={S.btnSm} disabled={locked} onClick={onDuplicate} title={t({ en: "Same people, then change what it sends", ar: "نفس الناس، وبعدين غيّر شو بيبعت" })}>⧉ {t({ en: "Duplicate", ar: "تكرار" })}</button>
        <button type="button" style={S.btnSm} disabled={locked} onClick={() => setCopyOpen((v) => !v)}>📋 {t({ en: "Copy to branches", ar: "نسخ لفروع تانية" })}</button>
        <span style={{ flex: 1 }} />
        <button type="button" style={S.btnDel} disabled={locked} onClick={onDelete} aria-label={t({ en: "Delete", ar: "حذف" })}>🗑</button>
      </div>
    </article>
  );
}

/* ───────────────────────── 📜 Send log ─────────────────────────
   Every alert e-mail — scheduled (08:00 / instant), sent now by hand, or a
   test — one row per recipient, from the E-mail Center's own log. */

const METHOD = {
  auto: { icon: "🤖", en: "Automatic", ar: "تلقائي", color: "#0f766e", bg: "#e6f4f1" },
  manual: { icon: "📨", en: "Sent now", ar: "إرسال يدوي", color: "#1d4ed8", bg: "#eff6ff" },
  test: { icon: "✉️", en: "Test", ar: "تجربة", color: "#64748b", bg: "#f1f5f9" },
};

function SendLog({ t, isAr }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(0);

  const load = () => {
    setErr("");
    fetchAlertSendLog(300).then(setRows).catch((e) => { setErr(String(e?.message || e)); setRows([]); });
  };
  useEffect(load, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter((r) =>
      (!method || r.method === method)
      && (!status || r.status === status)
      && (!s || [r.subject, r.note, r.sent_by, ...(Array.isArray(r.to_emails) ? r.to_emails : [])].some((x) => String(x || "").toLowerCase().includes(s))));
  }, [rows, q, method, status]);

  const when = (iso) => (iso ? new Date(iso).toLocaleString(isAr ? "ar-AE" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
  const failed = (rows || []).filter((r) => r.status !== "sent").length;

  return (
    <section style={S.panel}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 220px" }}>
          <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740" }}>📜 {t({ en: "Send log", ar: "سجل الإرسال" })}</div>
          <div className="alp-s" style={{ color: "#475569", fontWeight: 700 }}>
            {t({ en: "Every alert e-mail: who got it, when, what was in it and the documents attached.", ar: "كل إيميل تنبيه: مين استلمه، ومتى، وشو كان فيه، والمستندات المرفقة." })}
          </div>
        </div>
        {rows && <span className="alp-s" style={failed ? S.gapBadge : S.okBadge}>{failed ? `⚠️ ${t({ en: `${failed} failed`, ar: `${failed} فشل` })}` : `✓ ${t({ en: "All delivered", ar: "كلها انبعتت" })}`}</span>}
        <button type="button" style={S.btn} onClick={load}>⟳ {t({ en: "Refresh", ar: "تحديث" })}</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <span aria-hidden="true" style={S.searchIcon}>🔍</span>
          <input type="search" style={{ ...S.input, paddingInlineStart: 38 }} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t({ en: "Search e-mail, subject, contract…", ar: "ابحث بالإيميل، الموضوع، العقد…" })} />
        </div>
        <select style={{ ...S.input, width: "auto", minWidth: 150 }} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">{t({ en: "All types", ar: "كل الأنواع" })}</option>
          {Object.entries(METHOD).map(([k, m]) => <option key={k} value={k}>{m.icon} {t(m)}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto", minWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t({ en: "Any status", ar: "كل الحالات" })}</option>
          <option value="sent">✅ {t({ en: "Sent", ar: "انبعت" })}</option>
          <option value="failed">❌ {t({ en: "Failed", ar: "فشل" })}</option>
        </select>
      </div>

      {err && <div style={S.bad}>⚠️ {err}</div>}
      {!rows && <div className="alp-s" style={S.loading}>{t({ en: "Loading…", ar: "جاري التحميل…" })}</div>}
      {rows && !list.length && (
        <div style={S.empty}>
          <div className="alp-big">📭</div>
          <div className="alp-h" style={{ fontWeight: 900 }}>{rows.length ? t({ en: "Nothing matches the filters.", ar: "ما في شي يطابق الفلاتر." }) : t({ en: "No alert e-mail sent yet.", ar: "ما انبعت أي إيميل تنبيه بعد." })}</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {list.map((r) => {
          const m = METHOD[r.method] || METHOD.auto;
          const ok = r.status === "sent";
          const isOpen = open === r.id;
          const lines = String(r.note || "").split("\n").filter(Boolean);
          return (
            <article key={r.id} style={{ ...S.logRow, borderInlineStartColor: ok ? "#16a34a" : "#dc2626" }}>
              <button type="button" onClick={() => setOpen(isOpen ? 0 : r.id)} style={S.logHead}>
                <span className="alp-xs" style={{ ...S.logBadge, color: m.color, background: m.bg }}>{m.icon} {t(m)}</span>
                <span style={{ flex: "1 1 240px", minWidth: 0, textAlign: "start" }}>
                  <span className="alp-s" style={{ display: "block", fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</span>
                  <span className="alp-xs" dir="ltr" style={{ display: "block", color: "#475569", fontWeight: 700, textAlign: isAr ? "right" : "left" }}>
                    → {(Array.isArray(r.to_emails) ? r.to_emails : []).join(", ")}
                    {Array.isArray(r.cc_emails) && r.cc_emails.length > 0 && <span style={{ color: "#64748b" }}>{"  ·  CC: "}{r.cc_emails.join(", ")}</span>}
                  </span>
                </span>
                {r.attachment_count > 0 && <span className="alp-xs" style={S.logBadge}>📎 {r.attachment_count}</span>}
                <span className="alp-xs" style={{ ...S.logBadge, color: ok ? "#166534" : "#b91c1c", background: ok ? "#dcfce7" : "#fee2e2" }}>{ok ? "✅" : "❌"} {ok ? t({ en: "Sent", ar: "انبعت" }) : t({ en: "Failed", ar: "فشل" })}</span>
                <span className="alp-xs" style={{ color: "#475569", fontWeight: 800, whiteSpace: "nowrap" }}>{when(r.sent_at)}</span>
                <span aria-hidden="true" style={{ color: "#94a3b8" }}>{isOpen ? "▴" : "▾"}</span>
              </button>
              {isOpen && (
                <div style={S.logBody}>
                  {r.sent_by && r.method !== "auto" && (
                    <div className="alp-xs" style={{ color: "#475569", fontWeight: 800, marginBottom: 6 }}>👤 {t({ en: "By", ar: "بواسطة" })}: {r.sent_by}</div>
                  )}
                  {lines.map((l, i) => <div key={i} className="alp-xs" style={{ color: "#1e293b", fontWeight: 700 }} dir="auto">• {l}</div>)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── 🧭 Coverage ───────────────────────── */

function Coverage({ t, rules, onPick }) {
  const contacts = rules.contacts || [];
  const rows = [...BRANCH_LIST.map((b) => ({ key: b.key, label: t(b), branch: b.key })), { key: "__general", label: t({ en: "General (no branch)", ar: "عام (بدون فرع)" }), branch: "" }];
  const who = (rule, branch) => {
    const r = resolveRecipients(rules, rule, branch, true);
    const label = (e) => (contacts.find((c) => c.email === e)?.name || e);
    return [...r.to.map(label), ...r.cc.map((e) => `${label(e)} (CC)`), ...r.bcc.map((e) => `${label(e)} (BCC)`)];
  };
  const gaps = rows.reduce((n, r) => n + RULES.filter((k) => rules[k]?.enabled !== false && who(k, r.branch).length === 0).length, 0);

  return (
    <section style={S.panel}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740" }}>🧭 {t({ en: "Who receives what", ar: "مين يستلم شو" })}</div>
          <div className="alp-s" style={{ color: "#475569", fontWeight: 700 }}>
            {t({ en: "Number of people e-mailed for each branch and alert type. Red = nobody is told.", ar: "عدد الأشخاص اللي يوصلهم إيميل لكل فرع ونوع تنبيه. الأحمر = ما حدا بيعرف." })}
          </div>
        </div>
        <span className="alp-s" style={gaps ? S.gapBadge : S.okBadge}>
          {gaps ? `⚠️ ${t({ en: `${gaps} gap(s)`, ar: `${gaps} فجوة` })}` : `✓ ${t({ en: "Fully covered", ar: "التغطية كاملة" })}`}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: "start" }}>{t({ en: "Branch", ar: "الفرع" })}</th>
              {RULES.map((k) => (
                <th key={k} style={{ ...S.th, opacity: rules[k]?.enabled === false ? 0.45 : 1 }} title={t(RULE_INFO[k])}>
                  <div className="alp-big" style={{ lineHeight: 1 }}>{RULE_INFO[k].icon}</div>
                  <div className="alp-xs" style={{ fontWeight: 800, color: "#334155", maxWidth: 120, margin: "4px auto 0" }}>{t(RULE_INFO[k])}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="alp-s" style={{ ...S.td, fontWeight: 900, textAlign: "start", whiteSpace: "nowrap" }}>{r.branch ? `📍 ${r.label}` : `🌐 ${r.label}`}</td>
                {RULES.map((k) => {
                  const off = rules[k]?.enabled === false;
                  const list = who(k, r.branch);
                  const n = list.length;
                  return (
                    <td key={k} style={S.td}>
                      <button type="button" onClick={onPick} title={off ? t({ en: "Check is off", ar: "الفحص متوقف" }) : list.join("\n") || t({ en: "Nobody", ar: "لا أحد" })}
                        style={{ ...S.cell, ...(off ? S.cellOff : n ? S.cellOk : S.cellGap) }}>
                        {off ? "—" : n}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="alp-xs" style={{ ...S.hint, marginTop: 10 }}>
        {t({ en: "Hover a number to see the names. Every alert also shows in the 🔔 bell, e-mail or not.", ar: "مرّر على الرقم لتشوف الأسماء. كل تنبيه يظهر بالجرس 🔔 سواء وصل إيميل أو لا." })}
      </div>
    </section>
  );
}

/* ───────────────────────── ⚙️ Checks ───────────────────────── */

function Checks({ t, rules, setRule, running, runNow, dirty }) {
  const [addType, setAddType] = useState("");
  const checks = rules.missedReports.checks || [];
  const WHEN = {
    temperature: { en: "Instantly — a phone (QR) reading or a saved sheet out of range. A recheck back in range closes it.", ar: "فوراً — قراءة جوال (QR) أو شيت محفوظ خارج الحد. إعادة القياس داخل الحد تغلقه." },
    missedReports: { en: "08:00 — yesterday's logs not filed (phone readings alone do not file a day)", ar: "08:00 — تقارير أمس غير المعبّأة (قراءات الجوال وحدها لا تكفي)" },
    noReadingToday: { en: "13:00 — temperature logs with no reading at all yet today", ar: "13:00 — سجلات الحرارة بلا أي قراءة اليوم" },
    expiries: { en: "08:00 — calibration, training & health certificates, licences/contracts, mock recall", ar: "08:00 — المعايرة، شهادات التدريب والصحة، الرخص والعقود، تمرين السحب" },
    capa: { en: "08:00, weekly — CAPA / NCR past its target date, or open too long", ar: "08:00، أسبوعياً — CAPA / NCR تجاوز تاريخه، أو مفتوح طويلاً" },
    ccp: { en: "Instantly — a CCP monitoring record saved outside its critical limit. Correcting the record closes it.", ar: "فوراً — سجل مراقبة CCP محفوظ خارج الحد الحرج. تصحيح السجل يغلقه." },
  };

  const card = (k, children) => {
    const on = rules[k]?.enabled !== false;
    return (
      <section key={k} style={{ ...S.ruleCard, ...(on ? null : S.ruleOff) }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={S.ruleIcon} aria-hidden="true"><span className="alp-big">{RULE_INFO[k].icon}</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740" }}>{t(RULE_INFO[k])}</div>
            <div className="alp-s" style={{ color: "#475569", fontWeight: 600 }}>{t(WHEN[k])}</div>
          </div>
          <button type="button" role="switch" aria-checked={on} onClick={() => setRule(k, { enabled: !on })} style={{ ...S.switch, ...(on ? S.switchOn : null) }}>
            <span style={{ ...S.knob, ...(on ? S.knobOn : null) }} />
          </button>
        </div>
        {on && children && <div style={{ marginTop: 12, display: "grid", gap: 10 }}>{children}</div>}
      </section>
    );
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="alp-s" style={S.info}>
        🕗 {t({ en: "Checks run at 08:00 and 13:00 UAE time. Who is e-mailed is set under Recipients.", ar: "الفحوصات تعمل الساعة 08:00 و13:00 بتوقيت الإمارات. من يصله الإيميل يُحدد من «المستلمون»." })}
      </div>
      <div style={S.ruleGrid}>
        {card("temperature")}
        {card("ccp")}
        {card("noReadingToday")}
        {card("expiries", (
          <>
            <div className="alp-xs" style={S.hint}>{t({ en: "Which expiries are sent, and to whom, is set per reminder in Reminders by branch.", ar: "أي انتهاءات بتنبعت ولمين، بيتحدد بكل تذكير بـ «التذكيرات حسب الفرع»." })}</div>
            <label style={S.inline}>
              <span className="alp-s" style={S.label}>{t({ en: "Calibration & certificates: warn", ar: "المعايرة والشهادات: نبّه قبل" })}</span>
              <input style={{ ...S.input, width: 90 }} type="number" min="1" max="180" value={rules.expiries.days} onChange={(e) => setRule("expiries", { days: Number(e.target.value) || 30 })} />
              <span className="alp-s" style={S.label}>{t({ en: "days before", ar: "يوم" })}</span>
            </label>
            <div style={S.steps}>
              <span className="alp-xs" style={{ fontWeight: 900, color: "#1e3a5f" }}>📄 {t({ en: "Licences & contracts:", ar: "الرخص والعقود:" })}</span>
              {[["30", "#f59e0b"], ["20", "#f59e0b"], ["10", "#f97316"], ["0", "#dc2626"], ["+7", "#991b1b"]].map(([d, c]) => (
                <span key={d} className="alp-xs" style={{ ...S.step, borderColor: c, color: c }}>
                  {d === "0" ? t({ en: "on the day", ar: "يوم الانتهاء" }) : d === "+7" ? t({ en: "weekly after", ar: "أسبوعياً بعده" }) : t({ en: `${d} days`, ar: `${d} يوم` })}
                </span>
              ))}
            </div>
          </>
        ))}
        {card("capa", (
          <label style={S.inline}>
            <span className="alp-s" style={S.label}>{t({ en: "No target date: overdue after", ar: "بلا تاريخ مستهدف: متأخر بعد" })}</span>
            <input style={{ ...S.input, width: 90 }} type="number" min="1" max="365" value={rules.capa.openDays} onChange={(e) => setRule("capa", { openDays: Number(e.target.value) || 30 })} />
            <span className="alp-s" style={S.label}>{t({ en: "days", ar: "يوم" })}</span>
          </label>
        ))}
      </div>
      {card("missedReports", (
        <>
          <div style={S.checkList}>
            {checks.map((c, i) => (
              <div key={`${c.type}-${i}`} style={S.checkRow}>
                <span className="alp-xs" style={S.brChip}>{c.branch}</span>
                <span className="alp-s" style={{ flex: 1, fontWeight: 700 }}>{c.label || c.type}</span>
                <button type="button" style={S.x} onClick={() => setRule("missedReports", { checks: checks.filter((_, j) => j !== i) })} aria-label="remove">✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...S.input, flex: 1 }} value={addType} onChange={(e) => setAddType(e.target.value)}>
              <option value="">{t({ en: "Add a daily log to check…", ar: "أضف تقريراً يومياً للفحص…" })}</option>
              {ALL_TYPES.filter((x) => !checks.some((c) => c.type === x.type)).map((x) => <option key={`${x.branch}:${x.type}`} value={x.type}>{x.label}</option>)}
            </select>
            <button type="button" style={S.btn} disabled={!addType} onClick={() => {
              const x = ALL_TYPES.find((y) => y.type === addType);
              if (x) setRule("missedReports", { checks: [...checks, { type: x.type, branch: x.branch, label: x.label }] });
              setAddType("");
            }}>＋ {t({ en: "Add", ar: "إضافة" })}</button>
          </div>
          <div className="alp-xs" style={S.hint}>{t({ en: "A log not filed at all in the last 30 days is skipped (not in use).", ar: "التقرير غير المعبّأ أبداً خلال 30 يوماً يُتجاهل (غير مستعمل)." })}</div>
        </>
      ))}

      <section style={S.panel}>
        <div className="alp-s" style={{ fontWeight: 900, color: "#0f2740", marginBottom: 8 }}>▶ {t({ en: "Run the checks now", ar: "شغّل الفحص الآن" })}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={S.btn} disabled={running || dirty} onClick={() => runNow(true)}>▶ 08:00</button>
          <button type="button" style={S.btn} disabled={running || dirty} onClick={() => runNow(false)}>▶ 13:00</button>
          {dirty && <span className="alp-xs" style={{ color: "#b45309", fontWeight: 800 }}>{t({ en: "Save first", ar: "احفظ أولاً" })}</span>}
        </div>
      </section>
    </div>
  );
}

const S = {
  loading: { background: "#fff", borderRadius: 12, padding: 30, textAlign: "center", color: "#334155", fontWeight: 800 },
  bad: { padding: "11px 14px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 800 },
  warn: { padding: "11px 14px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 800 },
  ok: { padding: "11px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 800 },
  info: { padding: "11px 14px", borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", fontWeight: 700 },

  seg: { display: "flex", gap: 6, padding: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 6px 18px rgba(15,39,64,.05)", flexWrap: "wrap" },
  segBtn: { flex: "1 1 180px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 13, border: 0, background: "transparent", color: "#1e3a5f", fontWeight: 900, cursor: "pointer" },
  segOn: { background: "#e6f4f1", color: "#0f766e", boxShadow: "inset 0 0 0 1.5px #99d5cc" },
  segN: { minWidth: 26, padding: "0 8px", borderRadius: 999, background: "#e8f1fa", color: "#0f2740", fontWeight: 900 },
  segNOn: { background: "#0f766e", color: "#fff" },

  split: { display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: 14, alignItems: "start" },
  rail: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 6px 18px rgba(15,39,64,.05)", maxHeight: "78vh", overflowY: "auto", overflowX: "hidden", boxSizing: "border-box" },
  railHead: { fontWeight: 900, color: "#64748b", letterSpacing: 1, padding: "4px 8px" },
  railSep: { height: 1, background: "#e2e8f0", margin: "6px 4px" },
  brItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "1px solid transparent", borderInlineStart: "3px solid transparent", background: "transparent", color: "#0f172a", cursor: "pointer", width: "100%", boxSizing: "border-box", minWidth: 0 },
  brOn: { background: "#e6f4f1", borderColor: "#c4e6df", borderInlineStartColor: "#0f766e", color: "#0f766e" },
  brN: { flexShrink: 0, minWidth: 28, padding: "1px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 900, textAlign: "center", boxSizing: "border-box" },
  brN0: { background: "#fee2e2", color: "#b91c1c" },
  brNOn: { boxShadow: "0 0 0 1.5px #0f766e" },

  peopleHead: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", boxShadow: "0 6px 18px rgba(15,39,64,.05)" },
  searchIcon: { position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))", gap: 12 },
  person: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, boxShadow: "0 6px 18px rgba(15,39,64,.05)", minWidth: 0, boxSizing: "border-box" },
  avatar: { width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, flexShrink: 0 },
  metaRow: { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" },
  metaLbl: { width: 22, textAlign: "center" },
  brChip: { padding: "2px 10px", borderRadius: 999, background: "#ecfeff", border: "1px solid #bae6fd", color: "#155e75", fontWeight: 800 },
  typeChip: { padding: "2px 10px", borderRadius: 999, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontWeight: 800 },
  allChip: { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" },
  critChip: { padding: "2px 10px", borderRadius: 999, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 900 },
  personFoot: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", borderTop: "1px solid #eef3f8", paddingTop: 10, minWidth: 0 },
  switchSm: { width: 42, height: 24 },
  knobSm: { top: 3, width: 18, height: 18 },
  knobSmOn: { insetInlineStart: 21 },

  editor: { background: "linear-gradient(180deg,#ffffff,#f6fbfa)", border: "2px solid #99d5cc", borderRadius: 12, padding: 18, boxShadow: "0 16px 34px rgba(15,118,110,.12)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  pickBlock: { marginTop: 14, padding: 12, borderRadius: 14, background: "#fff", border: "1px solid #e2e8f0" },
  pickHead: { display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap", marginBottom: 8 },
  pills: { display: "flex", gap: 6, flexWrap: "wrap" },
  pill: { padding: "7px 13px", borderRadius: 999, border: "1px solid #d6e2ea", background: "#fff", color: "#1e3a5f", fontWeight: 800, cursor: "pointer" },
  pillOn: { background: "#0f766e", borderColor: "#0f766e", color: "#fff" },
  hint: { color: "#475569", fontWeight: 700, marginTop: 8 },
  lockedEmail: { padding: "10px 13px", borderRadius: 12, border: "1px dashed #d6e2ea", background: "#f8fafc", color: "#0f172a", fontWeight: 800 },
  check: { display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, cursor: "pointer", padding: "8px 12px", borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0" },

  panel: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(15,39,64,.05)" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 640 },
  th: { padding: "10px 8px", borderBottom: "2px solid #e2e8f0", textAlign: "center", verticalAlign: "bottom", background: "#f8fbff" },
  td: { padding: "8px", borderBottom: "1px solid #eef3f8", textAlign: "center" },
  cell: { minWidth: 46, padding: "6px 12px", borderRadius: 10, border: "1px solid", fontWeight: 900, cursor: "pointer" },
  cellOk: { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" },
  cellGap: { background: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" },
  cellOff: { background: "#f1f5f9", borderColor: "#e2e8f0", color: "#94a3b8" },
  gapBadge: { padding: "6px 14px", borderRadius: 999, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 900 },
  okBadge: { padding: "6px 14px", borderRadius: 999, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 900 },

  ruleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 },
  ruleCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(15,39,64,.05)" },
  ruleOff: { background: "#f8fafc", opacity: 0.75 },
  ruleIcon: { width: 50, height: 50, borderRadius: 12, display: "grid", placeItems: "center", background: "#e6f4f1", border: "1px solid #c4e6df", flexShrink: 0 },
  switch: { width: 54, height: 30, borderRadius: 999, border: 0, background: "#cbd5e1", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .15s" },
  switchOn: { background: "#0f766e" },
  knob: { position: "absolute", top: 3, insetInlineStart: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)", transition: "inset-inline-start .15s" },
  knobOn: { insetInlineStart: 27 },
  inline: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  steps: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: 10, borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a" },
  step: { padding: "2px 10px", borderRadius: 999, border: "1.5px solid", background: "#fff", fontWeight: 900 },
  checkList: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 6 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fbfdff" },
  x: { border: 0, background: "none", color: "#b91c1c", fontWeight: 900, cursor: "pointer", padding: "2px 6px" },

  saveBar: { position: "fixed", insetInline: 0, bottom: 18, margin: "0 auto", width: "min(560px, calc(100% - 32px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px 10px 18px", borderRadius: 12, background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", boxShadow: "0 16px 36px rgba(15,23,42,.18)", zIndex: 50, boxSizing: "border-box" },

  empty: { background: "#fff", border: "2px dashed #d6e2ea", borderRadius: 12, padding: 30, textAlign: "center", color: "#334155" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontWeight: 800, color: "#1e3a5f" },
  input: { width: "100%", padding: "10px 13px", borderRadius: 12, border: "1px solid #d6e2ea", background: "#fff", color: "#0f2740", boxSizing: "border-box", fontWeight: 600 },
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 12, border: "1px solid #d6e2ea", background: "#fff", color: "#0f2740", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  btnSm: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10, border: "1px solid #d6e2ea", background: "#fff", color: "#0f2740", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  remCard: { background: "#fff", border: "1px solid #e2e8f0", borderInlineStart: "4px solid #0f766e", borderRadius: 14, padding: 14, display: "grid", gap: 10, boxShadow: "0 6px 18px rgba(15,39,64,.06)", minWidth: 0 },
  remHead: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  remNo: { width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: "#e6f4f1", color: "#0f766e", fontWeight: 900, flexShrink: 0 },
  remSummary: { display: "grid", gap: 3, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #eef2f6", color: "#334155", fontWeight: 700 },
  subPick: { marginTop: 10, padding: 10, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a" },
  addBox: { background: "#fff", border: "2px dashed #99d5cc", borderRadius: 14, padding: 14 },
  presetBtn: { padding: "9px 14px", borderRadius: 12, border: "1px solid #c4e6df", background: "#f0fdfa", color: "#0f766e", fontWeight: 900, cursor: "pointer" },
  mailCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,39,64,.06)", overflow: "visible" },
  mailHead: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "14px 16px", borderBottom: "1px solid #eef2f6", background: "linear-gradient(135deg,#f0fdfa,#ecfeff)", borderRadius: "14px 14px 0 0" },
  mailBody: { padding: "14px 16px", display: "grid", gap: 14 },
  mailField: { display: "grid", gap: 4 },
  alsoNote: { padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px dashed #d6e2ea", color: "#334155", fontWeight: 700 },
  fieldChip: { padding: "2px 8px", borderRadius: 999, background: "#e6f4f1", border: "1px solid #99d5cc", color: "#0f766e", fontWeight: 900 },
  bccChip: { background: "#f5f3ff", borderColor: "#ddd6fe", color: "#6d28d9" },
  ccChip: { padding: "2px 10px", borderRadius: 999, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontWeight: 900 },
  logRow: { border: "1px solid #e2e8f0", borderInlineStart: "4px solid", borderRadius: 10, background: "#fff", overflow: "hidden" },
  logHead: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%", padding: "10px 12px", border: 0, background: "transparent", cursor: "pointer", boxSizing: "border-box" },
  logBadge: { padding: "2px 9px", borderRadius: 999, background: "#f1f5f9", color: "#334155", fontWeight: 900, whiteSpace: "nowrap" },
  logBody: { padding: "8px 14px 12px", borderTop: "1px solid #eef2f6", background: "#fbfdff" },
  btnSend: { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10, border: "1px solid #99d5cc", background: "#e6f4f1", color: "#0f766e", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" },
  btnDel: { padding: "7px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff5f5", color: "#b91c1c", fontWeight: 900, cursor: "pointer" },
  pri: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 12, border: 0, background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(15,118,110,.22)" },
};
