// src/pages/alerts/AlertsSettings.jsx
//
// ⚙️ Alerts settings (admins):
//   📬 Recipients  — per BRANCH, like the e-mail popup: To / CC / BCC picked
//                    from the e-mail center's contacts (rules.distribution);
//                    "All branches" is added to every branch's mail. Each
//                    person's own settings (alert types, critical only, on/off)
//                    live in rules.contacts. Server: alertEngine resolveRecipients.
//   🧭 Coverage    — branch × alert type: who receives what; 0 = nobody.
//   ⚙️ Checks      — each check on/off and its own settings.
//   📜 Send log    — every alert e-mail.
//
// The old per-rule e-mail lists (rules[k].emails) move into the All-branches
// To list on load (limited to the rules they were on) and are emptied on save.
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
/* Same routing as the server's resolveRecipients — the coverage view must not lie. */
function personWants(rules, email, rule, critical) {
  const c = (rules.contacts || []).find((x) => x.email === email);
  if (!c) return true;
  if (c.active === false) return false;
  if (c.rules?.length && !c.rules.includes(rule)) return false;
  if (c.onlyCritical && !critical) return false;
  return true;
}
function resolveRecipients(rules, rule, branch, critical = true) {
  const br = norm(branch);
  const lists = (rules.distribution || []).filter((d) => d.branch === ALL || (br && d.branch === br));
  const pick = (f) => [...new Set(lists.flatMap((d) => d[f] || []))].filter((e) => personWants(rules, e, rule, critical));
  const to = [...new Set([...(rules[rule]?.emails || []), ...pick("to")])];
  const cc = pick("cc").filter((e) => !to.includes(e));
  const bcc = pick("bcc").filter((e) => !to.includes(e) && !cc.includes(e));
  return { to, cc, bcc };
}

/** Old per-rule lists → the All-branches To list (each person limited to the
    rules they were on). The server already turned older per-person branches
    into rules.distribution. */
function migrate(rules) {
  const contacts = (rules.contacts || []).map((c) => ({ ...c }));
  const distribution = (rules.distribution || []).map((d) => ({ ...d, to: [...d.to], cc: [...d.cc], bcc: [...d.bcc] }));
  let all = distribution.find((d) => d.branch === ALL);
  let moved = 0;
  const next = { ...rules };
  RULES.forEach((k) => {
    (rules[k]?.emails || []).forEach((email) => {
      moved++;
      const e = String(email).toLowerCase();
      if (!all) { all = { branch: ALL, to: [], cc: [], bcc: [] }; distribution.push(all); }
      if (![...all.to, ...all.cc, ...all.bcc].includes(e)) all.to.push(e);
      const ex = contacts.find((c) => c.email === e);
      if (ex) { if (ex.rules?.length && !ex.rules.includes(k)) ex.rules = [...ex.rules, k]; }
      else contacts.push({ id: newId(), name: "", role: "", email: e, rules: [k], onlyCritical: false, active: true });
    });
    next[k] = { ...rules[k], emails: [] };
  });
  contacts.forEach((c) => { if (c.rules?.length === RULES.length) c.rules = []; });
  next.contacts = contacts;
  next.distribution = distribution;
  return { rules: next, moved };
}

const initials = (c) => {
  const s = String(c.name || c.email || "?").trim();
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
};
const HUES = ["#2563eb", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0d9488", "#4f46e5"];
const hueOf = (s) => HUES[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];

export default function AlertsSettings({ t, isAr }) {
  const [rules, setRules] = useState(null);
  const [serverBranches, setServerBranches] = useState([]);
  const [extraBranches, setExtraBranches] = useState([]);
  const [mailbox, setMailbox] = useState(true);
  const [view, setView] = useState("people");
  const [dirty, setDirty] = useState(false);
  const [moved, setMoved] = useState(0);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  // An older server drops rules.distribution on save — then keep the old
  // lists untouched and lock the recipients editor until the server is updated.
  const [serverReady, setServerReady] = useState(true);

  useEffect(() => {
    fetchAlertRules()
      .then((j) => {
        const ready = Array.isArray(j.rules?.distribution);
        setServerReady(ready);
        const m = ready ? migrate(j.rules) : { rules: { ...j.rules, contacts: j.rules?.contacts || [], distribution: [] }, moved: 0 };
        setRules(m.rules);
        setMoved(m.moved);
        setDirty(m.moved > 0);
        // every spelling the server saw, grouped below by canonical branch
        setServerBranches(Array.isArray(j.branchGroups) ? j.branchGroups.flatMap((g) => g.names || [g.key]) : Array.isArray(j.branches) ? j.branches : []);
        setMailbox(j.mailbox !== false);
      })
      .catch((e) => setErr(String(e?.message || e)));
  }, []);

  /* One entry per real branch (canonical key) + every spelling met for it. */
  const { branches, spellings } = useMemo(() => {
    const names = new Map(); // key → Set(spellings)
    if (!rules) return { branches: [], spellings: names };
    const add = (b) => {
      const raw = String(b || "").replace(/\s+/g, " ").trim();
      const key = canonBranch(raw);
      if (!key) return;
      if (!names.has(key)) names.set(key, new Set());
      names.get(key).add(raw);
    };
    serverBranches.forEach(add);
    (rules.missedReports?.checks || []).forEach((c) => add(c.branch));
    (rules.distribution || []).forEach((d) => { if (d.branch !== ALL) add(d.branch); });
    extraBranches.forEach(add);
    if (!names.size) BRANCHES.forEach((b) => add(b.label));
    const list = [...names.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { branches: list, spellings: names };
  }, [rules, serverBranches, extraBranches]);

  if (err && !rules) return <div style={S.bad}>⚠️ {err}</div>;
  if (!rules) return <div className="alp-s" style={S.loading}>{t({ en: "Loading…", ar: "جاري التحميل…" })}</div>;

  const update = (fn) => { setRules((r) => fn(r)); setDirty(true); setMsg(""); };
  const setRule = (k, patch) => update((r) => ({ ...r, [k]: { ...r[k], ...patch } }));
  const setContacts = (fn) => update((r) => ({ ...r, contacts: fn(r.contacts || []) }));
  const setDistribution = (fn) => update((r) => ({ ...r, distribution: fn(r.distribution || []) }));

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

  const peopleCount = new Set((rules.distribution || []).flatMap((d) => [...d.to, ...d.cc, ...d.bcc])).size;
  const VIEWS = [
    { id: "people", icon: "📬", en: "Recipients by branch", ar: "المستلمون حسب الفرع", n: peopleCount },
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
        <div style={S.warn}>⚠️ {t({ en: "The server is not updated yet — recipients per branch cannot be saved. The old e-mail lists keep working.", ar: "السيرفر لم يُحدَّث بعد — لا يمكن حفظ المستلمين حسب الفرع. القوائم القديمة ما زالت تعمل." })}</div>
      )}
      {moved > 0 && (
        <div style={S.info}>
          ℹ️ {t({ en: `${moved} address(es) from the old per-check lists were moved into the All-branches To list. Save to keep it this way.`, ar: `تم نقل ${moved} عنوان من القوائم القديمة إلى قائمة «إلى» لكل الفروع. احفظ لتثبيت ذلك.` })}
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
        <People t={t} isAr={isAr} locked={!serverReady} rules={rules} branches={branches} spellings={spellings}
          setDistribution={setDistribution} setContacts={setContacts} mailbox={mailbox}
          onAddBranch={(b) => setExtraBranches((x) => [...x, b])} dirty={dirty} />
      )}
      {view === "log" && <SendLog t={t} isAr={isAr} />}
      {view === "coverage" && <Coverage t={t} rules={rules} branches={branches} onPick={() => setView("people")} />}
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

/* ───────────────────────── 📬 Recipients ─────────────────────────
   Per branch, like the e-mail popup: To / CC / BCC, picked from the e-mail
   center's contacts. "All branches" lists are added to every branch's mail
   (and get the alerts that name no branch). Under the lists: each person's
   own settings (which alert types, critical only, on/off). */

const FIELDS = [
  { id: "to", label: "To", ar: "إلى (To)", hint: { en: "The main addressees of this branch's e-mail", ar: "المستلمون الأساسيون لإيميل الفرع" } },
  { id: "cc", label: "CC", ar: "نسخة (CC)", hint: { en: "A copy — everyone sees who is in CC", ar: "نسخة — الكل بيشوف مين بالـ CC" } },
  { id: "bcc", label: "BCC", ar: "نسخة مخفية (BCC)", hint: { en: "A hidden copy — nobody sees these addresses", ar: "نسخة مخفية — ما حدا بيشوف هالعناوين" } },
];

function People({ t, isAr, locked, rules, branches, spellings, setDistribution, setContacts, mailbox, onAddBranch, dirty }) {
  const [branch, setBranch] = useState(ALL);
  const [newBranch, setNewBranch] = useState("");
  const [editing, setEditing] = useState(null); // email whose settings are open
  const [testing, setTesting] = useState("");
  const [sending, setSending] = useState("");
  const [note, setNote] = useState("");
  // the e-mail center's contact book — same people and picker as every e-mail popup
  const [book, setBook] = useState([]);
  const loadBook = () => listEmailContacts().then((l) => setBook(Array.isArray(l) ? l : [])).catch(() => {});
  useEffect(() => { loadBook(); }, []);
  const bookName = (email) => book.find((b) => b.email?.toLowerCase() === String(email || "").toLowerCase())?.name || "";

  const dist = rules.distribution || [];
  const contacts = rules.contacts || [];
  const listOf = (key) => dist.find((d) => d.branch === key) || { branch: key, to: [], cc: [], bcc: [] };
  const cur = listOf(branch);
  const allList = listOf(ALL);
  const countOf = (key) => { const l = listOf(key); return l.to.length + l.cc.length + l.bcc.length; };
  const reachable = (key) => key === ALL ? countOf(ALL) > 0 : countOf(key) + countOf(ALL) > 0;
  const personOf = (email) => contacts.find((c) => c.email === email) || null;
  const nameOf = (email) => personOf(email)?.name || bookName(email) || email.split("@")[0];

  const setField = (field, emails) => {
    const clean = [...new Set((emails || []).map((e) => String(e || "").trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];
    setDistribution((list) => {
      const next = list.map((d) => ({ ...d }));
      let slot = next.find((d) => d.branch === branch);
      if (!slot) { slot = { branch, to: [], cc: [], bcc: [] }; next.push(slot); }
      slot[field] = clean;
      // one address once per branch: adding to one field removes it from the others
      FIELDS.forEach((f) => { if (f.id !== field) slot[f.id] = slot[f.id].filter((e) => !clean.includes(e)); });
      return next.filter((d) => d.to.length || d.cc.length || d.bcc.length);
    });
  };

  /* The REAL reminders, now — this branch's (or every branch's) list, or one person. */
  const sendNow = async ({ email = "", key = "" } = {}) => {
    if (dirty) { setNote(`⚠️ ${t({ en: "Save the changes first — sending uses the saved lists.", ar: "احفظ التغييرات أولاً — الإرسال بيعتمد على القوائم المحفوظة." })}`); return; }
    const who = email ? nameOf(email) : key && key !== ALL ? key : t({ en: "every branch", ar: "كل الفروع" });
    if (!window.confirm(t({ en: `Send the expiry reminders now (${who})? Real e-mails with the documents attached.`, ar: `إرسال تذكيرات الانتهاء الآن (${who})؟ إيميلات حقيقية مع المستندات مرفقة.` }))) return;
    setSending(email || key || ALL); setNote("");
    try {
      const r = await sendRemindersNow({ email, branch: key && key !== ALL ? key : "" });
      if (!r.items) setNote(t({ en: "Nothing is expiring or expired right now — no e-mail sent.", ar: "ما في شي منتهي أو قريب الانتهاء حالياً — ما انبعت إيميل." }));
      else if (!r.sent && !r.failed) setNote(`⚠️ ${t({ en: "Nobody is set to receive these reminders.", ar: "ما في حدا محدد يستلم هالتذكيرات." })}`);
      else setNote(`${r.failed ? "⚠️ " : ""}${t({
        en: `${r.sent} e-mail(s) sent to ${r.recipients} address(es) — ${r.items} reminder(s).${r.failed ? ` ${r.failed} failed.` : ""}`,
        ar: `انبعت ${r.sent} إيميل إلى ${r.recipients} عنوان — ${r.items} تذكير.${r.failed ? ` فشل ${r.failed}.` : ""}`,
      })}`);
    } catch (e) {
      setNote(`⚠️ ${e?.message === "no_mailbox" ? t({ en: "No mailbox for this company.", ar: "لا يوجد بريد لهذه الشركة." }) : String(e?.message || e)}`);
    } finally {
      setSending("");
    }
  };
  const test = async (email) => {
    setTesting(email); setNote("");
    try {
      const branchesOf = dist.filter((d) => [...d.to, ...d.cc, ...d.bcc].includes(email)).map((d) => (d.branch === ALL ? "All branches" : d.branch));
      await sendTestAlertMail({ email, name: nameOf(email), branches: branchesOf });
      setNote(t({ en: `Test e-mail sent to ${email}`, ar: `تم إرسال إيميل تجريبي إلى ${email}` }));
    } catch (e) {
      setNote(`⚠️ ${e?.message === "no_mailbox" ? t({ en: "No mailbox for this company.", ar: "لا يوجد بريد لهذه الشركة." }) : String(e?.message || e)}`);
    } finally {
      setTesting("");
    }
  };

  const BranchBtn = ({ id, label, sub, title }) => {
    const n = countOf(id);
    const ok = reachable(id);
    return (
      <button type="button" onClick={() => { setBranch(id); setEditing(null); setNote(""); }} title={title} style={{ ...S.brItem, ...(branch === id ? S.brOn : null) }}>
        <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
          <span className="alp-s" style={{ fontWeight: 900, display: "block", lineHeight: 1.3, overflowWrap: "anywhere" }}>{label}</span>
          {sub && <span className="alp-xs" style={{ display: "block", color: branch === id ? "#0f766e" : "#64748b", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
        </span>
        <span className="alp-xs" style={{ ...S.brN, ...(ok ? null : S.brN0), ...(branch === id ? S.brNOn : null) }} title={ok ? "" : t({ en: "Nobody gets this branch's alerts", ar: "ما حدا بيستلم تنبيهات هالفرع" })}>{n}</span>
      </button>
    );
  };

  const people = [...new Set([...cur.to, ...cur.cc, ...cur.bcc])];
  const fieldOf = (email) => (cur.to.includes(email) ? "to" : cur.cc.includes(email) ? "cc" : "bcc");

  return (
    <div className="als-split" style={S.split}>
      {/* branch rail */}
      <aside style={S.rail}>
        <div className="alp-xs" style={S.railHead}>{t({ en: "BRANCHES", ar: "الفروع" })}</div>
        <BranchBtn id={ALL} label={`🌐 ${t({ en: "All branches", ar: "كل الفروع" })}`} sub={t({ en: "added to every branch's e-mail", ar: "بينضافوا على إيميل كل فرع" })} />
        <div style={S.railSep} />
        {branches.map((b) => {
          const names = [...(spellings.get(b) || [])].filter((x) => x !== b);
          return (
            <BranchBtn key={b} id={b} label={b}
              title={names.length ? [t({ en: "Also written as:", ar: "يُكتب أيضاً:" }), ...names].join("\n") : undefined}
              sub={names.length ? `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ""}` : ""} />
          );
        })}
        <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #eef2f6" }}>
          <input style={{ ...S.input, padding: "8px 10px", minWidth: 0, flex: 1 }} value={newBranch} onChange={(e) => setNewBranch(e.target.value)}
            placeholder={t({ en: "Another branch…", ar: "فرع آخر…" })} />
          <button type="button" style={S.btnSm} disabled={!newBranch.trim()} onClick={() => { const k = canonBranch(newBranch); onAddBranch(newBranch.trim()); setBranch(k); setNewBranch(""); }}>＋</button>
        </div>
      </aside>

      {/* this branch's e-mail */}
      <section style={{ minWidth: 0, display: "grid", gap: 12, alignContent: "start" }}>
        <div style={S.mailCard}>
          <div style={S.mailHead}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div className="alp-h" style={{ fontWeight: 900, color: "#0f172a" }}>
                📨 {branch === ALL ? t({ en: "All branches", ar: "كل الفروع" }) : branch}
              </div>
              <div className="alp-s" style={{ color: "#475569", fontWeight: 700 }}>
                {branch === ALL
                  ? t({ en: "These addresses are added to every branch's e-mail, and get the alerts that name no branch.", ar: "هالعناوين بتنضاف على إيميل كل فرع، وبتستلم التنبيهات اللي ما إلها فرع." })
                  : t({ en: "Who gets this branch's alert e-mail — one e-mail, like the send window.", ar: "مين بيستلم إيميل تنبيهات هالفرع — إيميل واحد، متل نافذة الإرسال." })}
              </div>
            </div>
            <button type="button" style={S.btnSend} disabled={locked || !mailbox || !!sending || !reachable(branch)} onClick={() => sendNow({ key: branch })}
              title={t({ en: "Real e-mails: everything expiring or expired now, with the documents", ar: "إيميلات حقيقية: كل شي منتهي أو قريب الانتهاء الآن، مع المستندات" })}>
              📨 {sending === branch ? "…" : branch === ALL ? t({ en: "Send reminders now — all branches", ar: "إرسال التذكيرات الآن — كل الفروع" }) : t({ en: "Send this branch's reminders now", ar: "إرسال تذكيرات الفرع الآن" })}
            </button>
          </div>

          {locked && <div style={{ ...S.warn, margin: "0 16px 12px" }}>⚠️ {t({ en: "The server is not updated yet — these lists cannot be saved.", ar: "السيرفر لم يُحدَّث بعد — ما بتنحفظ هالقوائم." })}</div>}

          <div style={S.mailBody}>
            {FIELDS.map((f) => (
              <div key={f.id} style={S.mailField}>
                <ContactPicker
                  label={`${isAr ? f.ar : f.label}${f.id === "to" ? " *" : ""}`}
                  value={cur[f.id]}
                  onChange={(v) => setField(f.id, v)}
                  contacts={book}
                  onContactsChange={loadBook}
                  disabled={locked}
                />
                <span className="alp-xs" style={{ color: "#64748b", fontWeight: 700 }}>{t(f.hint)}</span>
              </div>
            ))}
            {branch !== ALL && countOf(ALL) > 0 && (
              <div className="alp-xs" style={S.alsoNote}>
                🌐 {t({ en: "Also on this e-mail (All branches):", ar: "كمان على هالإيميل (كل الفروع):" })}{" "}
                {FIELDS.filter((f) => allList[f.id].length).map((f) => `${f.label}: ${allList[f.id].map(nameOf).join(", ")}`).join("  ·  ")}
              </div>
            )}
            {!reachable(branch) && (
              <div className="alp-xs" style={{ ...S.alsoNote, background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}>
                ⚠️ {t({ en: "Nobody gets this branch's alerts by e-mail yet — they show in the bell only.", ar: "ما حدا بيستلم تنبيهات هالفرع بالإيميل لسا — بتظهر بالجرس بس." })}
              </div>
            )}
          </div>
        </div>

        {note && <div className="alp-s" style={note.startsWith("⚠️") ? S.bad : S.ok}>{note}</div>}

        {/* each person's own settings */}
        {people.length > 0 && (
          <div style={S.panel}>
            <div className="alp-s" style={{ fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>
              👥 {t({ en: "People on this e-mail — their own settings", ar: "الأشخاص على هالإيميل — إعداداتهم" })}
            </div>
            <div style={S.cards}>
              {people.map((email) => {
                const p = personOf(email) || { email, rules: [], onlyCritical: false, active: true };
                const field = fieldOf(email);
                return (
                  <article key={email} style={{ ...S.person, opacity: p.active === false ? 0.6 : 1 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ ...S.avatar, background: hueOf(email) }} aria-hidden="true">{initials({ name: nameOf(email), email })}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="alp-s" style={{ fontWeight: 900, color: "#0f2740", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nameOf(email)}{p.role && <span style={{ color: "#64748b", fontWeight: 700 }}> · {p.role}</span>}
                        </div>
                        <div className="alp-xs" dir="ltr" style={{ color: "#475569", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: isAr ? "right" : "left" }}>{email}</div>
                      </div>
                      <span className="alp-xs" style={{ ...S.fieldChip, ...(field === "to" ? null : field === "cc" ? S.ccChip : S.bccChip) }}>{field.toUpperCase()}</span>
                      <button type="button" role="switch" aria-checked={p.active !== false}
                        onClick={() => setContacts((list) => upsertPerson(list, email, { active: p.active === false }))}
                        title={p.active !== false ? t({ en: "Receiving e-mails — click to pause", ar: "يستلم الإيميلات — اضغط للإيقاف" }) : t({ en: "Paused — click to resume", ar: "موقوف — اضغط للتفعيل" })}
                        style={{ ...S.switch, ...S.switchSm, ...(p.active !== false ? S.switchOn : null) }}>
                        <span style={{ ...S.knob, ...S.knobSm, ...(p.active !== false ? S.knobSmOn : null) }} />
                      </button>
                    </div>
                    <div style={S.metaRow}>
                      <span className="alp-xs" style={S.metaLbl}>🔔</span>
                      {p.rules?.length
                        ? p.rules.map((r) => <span key={r} className="alp-xs" style={S.typeChip}>{RULE_INFO[r]?.icon} {t(RULE_INFO[r])}</span>)
                        : <span className="alp-xs" style={{ ...S.typeChip, ...S.allChip }}>{t({ en: "All alert types", ar: "كل أنواع التنبيهات" })}</span>}
                      {p.onlyCritical && <span className="alp-xs" style={S.critChip}>🚨 {t({ en: "Critical only", ar: "الحرجة فقط" })}</span>}
                    </div>
                    {editing === email && (
                      <PersonSettings t={t} person={p} onChange={(patch) => setContacts((list) => upsertPerson(list, email, patch))} onClose={() => setEditing(null)} />
                    )}
                    <div style={S.personFoot}>
                      <button type="button" style={S.btnSm} onClick={() => setEditing(editing === email ? null : email)}>⚙️ {t({ en: "Settings", ar: "إعدادات" })}</button>
                      <button type="button" style={S.btnSend} disabled={!mailbox || p.active === false || !!sending} onClick={() => sendNow({ email })}
                        title={t({ en: "Send this person their reminders now (real e-mail, documents attached)", ar: "أرسل لهالشخص تذكيراته الآن (إيميل حقيقي مع المستندات)" })}>
                        📨 {sending === email ? "…" : t({ en: "Send now", ar: "أرسل الآن" })}
                      </button>
                      <button type="button" style={S.btnSm} disabled={!mailbox || testing === email} onClick={() => test(email)}>
                        ✉️ {testing === email ? "…" : t({ en: "Test", ar: "تجربة" })}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** contacts[] with one person's settings patched (row created when missing). */
function upsertPerson(list, email, patch) {
  const has = list.some((c) => c.email === email);
  const next = has ? list.map((c) => (c.email === email ? { ...c, ...patch } : c)) : [...list, { id: newId(), email, name: "", role: "", rules: [], onlyCritical: false, active: true, ...patch }];
  return next.map((c) => (c.rules?.length === RULES.length ? { ...c, rules: [] } : c));
}

/* One person's own settings: which alert types reach them, critical only. */
function PersonSettings({ t, person, onChange, onClose }) {
  const rules = person.rules || [];
  return (
    <div style={S.pickBlock}>
      <div style={S.pickHead}>
        <span className="alp-s" style={S.label}>🔔 {t({ en: "Which alerts?", ar: "أي تنبيهات؟" })}</span>
        <button type="button" style={{ ...S.pill, ...(!rules.length ? S.pillOn : null) }} onClick={() => onChange({ rules: [] })}>
          {!rules.length ? "✓ " : ""}{t({ en: "All types", ar: "كل الأنواع" })}
        </button>
      </div>
      <div style={S.pills}>
        {RULES.map((r) => {
          const on = rules.includes(r);
          return (
            <button key={r} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => onChange({ rules: on ? rules.filter((x) => x !== r) : [...rules, r] })}>
              {RULE_INFO[r].icon} {t(RULE_INFO[r])}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <label style={S.check}>
          <input type="checkbox" checked={!!person.onlyCritical} onChange={(e) => onChange({ onlyCritical: e.target.checked })} />
          🚨 {t({ en: "Critical alerts only (expired, out of range)", ar: "التنبيهات الحرجة فقط (منتهي، خارج الحد)" })}
        </label>
        <span style={{ flex: 1 }} />
        <button type="button" style={S.btnSm} onClick={onClose}>✓ {t({ en: "Done", ar: "تم" })}</button>
      </div>
    </div>
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

function Coverage({ t, rules, branches, onPick }) {
  const contacts = rules.contacts || [];
  const rows = [...branches.map((b) => ({ key: b, label: b, branch: b })), { key: "__general", label: t({ en: "General (no branch)", ar: "عام (بدون فرع)" }), branch: "" }];
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
  const kinds = Array.isArray(rules.expiries?.kinds) ? rules.expiries.kinds : [];
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
            {/* Which kinds of expiry are sent (empty = all) — 08:00 run and "send now" */}
            <div style={S.pickBlock}>
              <div style={S.pickHead}>
                <span className="alp-s" style={S.label}>📋 {t({ en: "Send reminders for", ar: "ابعت تذكير عن" })}</span>
                <button type="button" style={{ ...S.pill, ...(!kinds.length ? S.pillOn : null) }} onClick={() => setRule("expiries", { kinds: [] })}>
                  {!kinds.length ? "✓ " : ""}{t({ en: "Everything", ar: "كل شي" })}
                </button>
              </div>
              <div style={S.pills}>
                {EXPIRY_KINDS.map((k) => {
                  const on = kinds.includes(k.id);
                  return (
                    <button key={k.id} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }}
                      onClick={() => {
                        const next = on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id];
                        setRule("expiries", { kinds: next.length === EXPIRY_KINDS.length ? [] : next });
                      }}>
                      {on ? "✓ " : ""}{k.icon} {t(k)}
                    </button>
                  );
                })}
              </div>
              <div className="alp-xs" style={S.hint}>
                {!kinds.length
                  ? t({ en: "Every kind is sent. Pick some to send only those.", ar: "كل الأنواع بتنبعت. اختار أنواع معينة لتنبعت هي بس." })
                  : t({ en: `Only these are sent: ${kinds.map((id) => t(EXPIRY_KINDS.find((k) => k.id === id) || { en: id, ar: id })).join(", ")}.`, ar: `بس هدول بينبعتوا: ${kinds.map((id) => t(EXPIRY_KINDS.find((k) => k.id === id) || { en: id, ar: id })).join("، ")}.` })}
              </div>
            </div>
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
