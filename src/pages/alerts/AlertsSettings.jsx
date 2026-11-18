// src/pages/alerts/AlertsSettings.jsx
//
// ⚙️ Alerts settings (admins) — three views:
//   📬 Recipients  — named people, each routed by BRANCH and by ALERT TYPE
//                    (rules.contacts on the server: utils/alertEngine.cjs
//                    recipientsFor). A branch manager gets only his branch.
//   🧭 Coverage    — branch × alert type: who receives what; 0 = nobody.
//   ⚙️ Checks      — each check on/off and its own settings.
//
// The old per-rule e-mail lists (rules[k].emails) are turned into contacts on
// load (every branch, the rules they were on) and emptied on save, so one
// list holds every recipient.
//
// Fonts: globals.css forces 14px — sizes come from the page's .alp classes.

import React, { useEffect, useMemo, useState } from "react";
import { BRANCHES } from "../settings/reportTypeCatalog";
import { fetchAlertRules, saveAlertRules, runAlertChecks, sendTestAlertMail, RULE_INFO } from "../../utils/alertsApi";
import { canonBranch } from "../../utils/branchCanon";
import ContactPicker from "../shared/ContactPicker";
import { listEmailContacts } from "../shared/emailReportSettings";

const RULES = ["temperature", "ccp", "missedReports", "noReadingToday", "expiries", "capa"];
const ALL_TYPES = BRANCHES.flatMap((b) => (b.types || []).map(([type, label]) => ({ type, label: `${b.label} — ${label}`, branch: b.label })));
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/* Branches compare by their canonical code — "POS 15", "AL BARSHA BUTCHERY
   (POS15)" and "Al Barsha Butchery" are one branch (same rule as the server). */
const norm = canonBranch;
const uniqCanon = (list) => [...new Set((list || []).map(canonBranch).filter(Boolean))];
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* Same routing as the server's recipientsFor — the coverage view must not lie. */
function receives(c, rule, branch, critical = true) {
  if (!c || c.active === false || !c.email) return false;
  if (c.rules?.length && !c.rules.includes(rule)) return false;
  if (c.branches?.length && (!branch || !c.branches.some((b) => norm(b) === norm(branch)))) return false;
  if (c.onlyCritical && !critical) return false;
  return true;
}

/** Old per-rule lists → contacts (merged by e-mail). */
function migrate(rules) {
  const contacts = (rules.contacts || []).map((c) => ({ ...c, branches: uniqCanon(c.branches) }));
  const byEmail = new Map(contacts.map((c) => [c.email, c]));
  let moved = 0;
  const next = { ...rules };
  RULES.forEach((k) => {
    const list = rules[k]?.emails || [];
    list.forEach((email) => {
      moved++;
      const e = String(email).toLowerCase();
      const ex = byEmail.get(e);
      if (ex) {
        if (ex.rules?.length && !ex.rules.includes(k)) ex.rules = [...ex.rules, k];
      } else {
        const c = { id: newId(), name: "", role: "", email: e, branches: [], rules: [k], onlyCritical: false, active: true };
        contacts.push(c); byEmail.set(e, c);
      }
    });
    next[k] = { ...rules[k], emails: [] };
  });
  contacts.forEach((c) => { if (c.rules?.length === RULES.length) c.rules = []; });
  next.contacts = contacts;
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
  // An older server drops rules.contacts on save — then keep the old lists
  // untouched and lock the recipients editor until the server is updated.
  const [serverReady, setServerReady] = useState(true);

  useEffect(() => {
    fetchAlertRules()
      .then((j) => {
        const ready = Array.isArray(j.rules?.contacts);
        setServerReady(ready);
        const m = ready ? migrate(j.rules) : { rules: { ...j.rules, contacts: [] }, moved: 0 };
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
    (rules.contacts || []).forEach((c) => (c.branches || []).forEach(add));
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

  const contacts = rules.contacts || [];
  const VIEWS = [
    { id: "people", icon: "📬", en: "Recipients by branch", ar: "المستلمون حسب الفرع", n: contacts.length },
    { id: "coverage", icon: "🧭", en: "Coverage map", ar: "خريطة التغطية" },
    { id: "checks", icon: "⚙️", en: "Checks", ar: "الفحوصات", n: RULES.filter((k) => rules[k]?.enabled !== false).length },
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
          ℹ️ {t({ en: `${moved} address(es) from the old per-check lists were moved into Recipients (all branches). Save to keep it this way.`, ar: `تم نقل ${moved} عنوان من القوائم القديمة إلى المستلمين (كل الفروع). احفظ لتثبيت ذلك.` })}
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
        <People t={t} isAr={isAr} locked={!serverReady} contacts={contacts} branches={branches} spellings={spellings} setContacts={setContacts} mailbox={mailbox}
          onAddBranch={(b) => setExtraBranches((x) => [...x, b])} />
      )}
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

/* ───────────────────────── 📬 Recipients ───────────────────────── */

function People({ t, isAr, locked, contacts, branches, spellings, setContacts, mailbox, onAddBranch }) {
  const [branch, setBranch] = useState("__all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // contact draft | null
  const [newBranch, setNewBranch] = useState("");
  const [testing, setTesting] = useState("");
  const [note, setNote] = useState("");
  // the e-mail center's contact book — same people as every e-mail popup
  const [book, setBook] = useState([]);
  const loadBook = () => listEmailContacts().then((l) => setBook(Array.isArray(l) ? l : [])).catch(() => {});
  useEffect(() => { loadBook(); }, []);
  const bookName = (email) => book.find((b) => b.email?.toLowerCase() === String(email || "").toLowerCase())?.name || "";

  const countFor = (b) => contacts.filter((c) => c.active !== false && (!c.branches?.length || c.branches.some((x) => norm(x) === norm(b)))).length;
  const own = (b) => contacts.filter((c) => c.branches?.some((x) => norm(x) === norm(b))).length;

  const shown = contacts.filter((c) => {
    if (branch === "__every" && c.branches?.length) return false;
    if (branch !== "__all" && branch !== "__every" && !(!c.branches?.length || c.branches.some((x) => norm(x) === norm(branch)))) return false;
    const s = q.trim().toLowerCase();
    return !s || [c.name, c.email, c.role, ...(c.branches || [])].some((x) => String(x || "").toLowerCase().includes(s));
  });

  const startNew = () => setEditing({
    id: newId(), name: "", role: "", email: "", rules: [], onlyCritical: false, active: true, _new: true,
    branches: branch !== "__all" && branch !== "__every" ? [branch] : [],
  });
  /** rows: one or more contacts from the editor (several when picked at once). */
  const saveDraft = (rows) => {
    const clean = rows.map(({ _new, ...c }) => c);
    setContacts((list) => {
      const ids = new Set(clean.map((c) => c.id));
      const kept = list.filter((x) => !ids.has(x.id));
      const edited = list.some((x) => ids.has(x.id));
      return edited ? list.map((x) => clean.find((c) => c.id === x.id) || x) : [...kept, ...clean];
    });
    setEditing(null);
  };
  const remove = (c) => {
    if (!window.confirm(t({ en: `Remove ${c.name || c.email} from the recipients?`, ar: `حذف ${c.name || c.email} من المستلمين؟` }))) return;
    setContacts((list) => list.filter((x) => x.id !== c.id));
  };
  const toggleActive = (c) => setContacts((list) => list.map((x) => (x.id === c.id ? { ...x, active: x.active === false } : x)));
  const test = async (c) => {
    setTesting(c.id); setNote("");
    try {
      await sendTestAlertMail(c);
      setNote(t({ en: `Test e-mail sent to ${c.email}`, ar: `تم إرسال إيميل تجريبي إلى ${c.email}` }));
    } catch (e) {
      const m = e?.message === "no_mailbox" ? t({ en: "No mailbox for this company.", ar: "لا يوجد بريد لهذه الشركة." }) : String(e?.message || e);
      setNote(`⚠️ ${m}`);
    } finally {
      setTesting("");
    }
  };

  const BranchBtn = ({ id, label, n, sub, title }) => (
    <button type="button" onClick={() => setBranch(id)} title={title} style={{ ...S.brItem, ...(branch === id ? S.brOn : null) }}>
      <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
        <span className="alp-s" style={{ fontWeight: 900, display: "block", lineHeight: 1.3, overflowWrap: "anywhere" }}>{label}</span>
        {sub && <span className="alp-xs" style={{ display: "block", color: branch === id ? "#0f766e" : "#64748b", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
      </span>
      <span className="alp-xs" style={{ ...S.brN, ...(n === 0 ? S.brN0 : null), ...(branch === id ? S.brNOn : null) }}>{n}</span>
    </button>
  );

  return (
    <div className="als-split" style={S.split}>
      {/* branch rail */}
      <aside style={S.rail}>
        <div className="alp-xs" style={S.railHead}>{t({ en: "BRANCHES", ar: "الفروع" })}</div>
        <BranchBtn id="__all" label={t({ en: "Everyone", ar: "الكل" })} n={contacts.length} />
        <BranchBtn id="__every" label={t({ en: "All-branch recipients", ar: "مستلمو كل الفروع" })} n={contacts.filter((c) => !c.branches?.length).length}
          sub={t({ en: "get every branch + general", ar: "يستلمون كل الفروع + العام" })} />
        <div style={S.railSep} />
        {branches.map((b) => {
          const names = [...(spellings.get(b) || [])].filter((x) => x !== b);
          const ownTxt = own(b) ? t({ en: `${own(b)} for this branch only`, ar: `${own(b)} خاص بالفرع` }) : t({ en: "all-branch only", ar: "مستلمو الكل فقط" });
          return (
            <BranchBtn key={b} id={b} label={b} n={countFor(b)}
              title={names.length ? [t({ en: "Also written as:", ar: "يُكتب أيضاً:" }), ...names].join("\n") : undefined}
              sub={names.length ? `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ""}` : ownTxt} />
          );
        })}
        <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #eef2f6" }}>
          <input style={{ ...S.input, padding: "8px 10px", minWidth: 0, flex: 1 }} value={newBranch} onChange={(e) => setNewBranch(e.target.value)}
            placeholder={t({ en: "Another branch…", ar: "فرع آخر…" })} />
          <button type="button" style={S.btnSm} disabled={!newBranch.trim()} onClick={() => { onAddBranch(newBranch.trim()); setBranch(newBranch.trim()); setNewBranch(""); }}>＋</button>
        </div>
      </aside>

      {/* people */}
      <section style={{ minWidth: 0, display: "grid", gap: 12, alignContent: "start" }}>
        <div style={S.peopleHead}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740" }}>
              {branch === "__all" ? t({ en: "All recipients", ar: "كل المستلمين" })
                : branch === "__every" ? t({ en: "All-branch recipients", ar: "مستلمو كل الفروع" })
                : `📍 ${branch}`}
            </div>
            <div className="alp-s" style={{ color: "#475569", fontWeight: 700 }}>
              {branch !== "__all" && branch !== "__every"
                ? t({ en: "Who is e-mailed when this branch has an alert", ar: "من يصله الإيميل عند وجود تنبيه لهذا الفرع" })
                : t({ en: "Each person gets only the branches and alert types chosen for them", ar: "كل شخص يستلم فقط الفروع وأنواع التنبيهات المحددة له" })}
            </div>
          </div>
          <div style={{ position: "relative", flex: "0 1 230px" }}>
            <span aria-hidden="true" style={S.searchIcon}>🔍</span>
            <input type="search" style={{ ...S.input, paddingInlineStart: 38 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t({ en: "Search name / e-mail", ar: "ابحث بالاسم / الإيميل" })} />
          </div>
          <button type="button" style={S.pri} disabled={locked} onClick={startNew}>＋ {t({ en: "Add recipient", ar: "إضافة مستلم" })}</button>
        </div>

        {note && <div className="alp-s" style={note.startsWith("⚠️") ? S.bad : S.ok}>{note}</div>}

        {editing && (
          <ContactEditor t={t} draft={editing} branches={branches} contacts={contacts}
            book={book} onBookChange={loadBook}
            onCancel={() => setEditing(null)} onSave={saveDraft} />
        )}

        {shown.length === 0 && !editing && (
          <div style={S.empty}>
            <div className="alp-big" style={{ marginBottom: 6 }}>📭</div>
            <div className="alp-h" style={{ fontWeight: 900 }}>
              {branch !== "__all" && branch !== "__every"
                ? t({ en: "Nobody receives this branch's alerts yet", ar: "لا أحد يستلم تنبيهات هذا الفرع بعد" })
                : t({ en: "No recipients yet — alerts show in the bell only", ar: "لا يوجد مستلمون بعد — التنبيهات بالجرس فقط" })}
            </div>
            <button type="button" style={{ ...S.pri, marginTop: 12 }} disabled={locked} onClick={startNew}>＋ {t({ en: "Add recipient", ar: "إضافة مستلم" })}</button>
          </div>
        )}

        <div style={S.cards}>
          {shown.map((c) => (
            <article key={c.id} style={{ ...S.person, opacity: c.active === false ? 0.6 : 1 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ ...S.avatar, background: hueOf(c.email) }} aria-hidden="true">{initials(c)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="alp-s" style={{ fontWeight: 900, color: "#0f2740", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name || bookName(c.email) || c.email.split("@")[0]}
                    {c.role && <span style={{ color: "#64748b", fontWeight: 700 }}> · {c.role}</span>}
                  </div>
                  <div className="alp-xs" dir="ltr" style={{ color: "#475569", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: isAr ? "right" : "left" }}>{c.email}</div>
                </div>
                <button type="button" role="switch" aria-checked={c.active !== false} onClick={() => toggleActive(c)}
                  title={c.active !== false ? t({ en: "Receiving e-mails — click to pause", ar: "يستلم الإيميلات — اضغط للإيقاف" }) : t({ en: "Paused — click to resume", ar: "موقوف — اضغط للتفعيل" })}
                  style={{ ...S.switch, ...S.switchSm, ...(c.active !== false ? S.switchOn : null) }}>
                  <span style={{ ...S.knob, ...S.knobSm, ...(c.active !== false ? S.knobSmOn : null) }} />
                </button>
              </div>

              <div style={S.metaRow}>
                <span className="alp-xs" style={S.metaLbl}>📍</span>
                {c.branches?.length
                  ? c.branches.map((b) => <span key={b} className="alp-xs" style={S.brChip}>{b}</span>)
                  : <span className="alp-xs" style={{ ...S.brChip, ...S.allChip }}>{t({ en: "All branches", ar: "كل الفروع" })}</span>}
              </div>
              <div style={S.metaRow}>
                <span className="alp-xs" style={S.metaLbl}>🔔</span>
                {c.rules?.length
                  ? c.rules.map((r) => <span key={r} className="alp-xs" style={S.typeChip} title={t(RULE_INFO[r])}>{RULE_INFO[r]?.icon} {t(RULE_INFO[r])}</span>)
                  : <span className="alp-xs" style={{ ...S.typeChip, ...S.allChip }}>{t({ en: "All alert types", ar: "كل أنواع التنبيهات" })}</span>}
                {c.onlyCritical && <span className="alp-xs" style={S.critChip}>🚨 {t({ en: "Critical only", ar: "الحرجة فقط" })}</span>}
              </div>

              <div style={S.personFoot}>
                <button type="button" style={S.btnSm} onClick={() => setEditing({ ...c })}>✏️ {t({ en: "Edit", ar: "تعديل" })}</button>
                <button type="button" style={S.btnSm} disabled={!mailbox || testing === c.id} onClick={() => test(c)}>
                  ✉️ {testing === c.id ? "…" : t({ en: "Test e-mail", ar: "إيميل تجريبي" })}
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" style={S.btnDel} onClick={() => remove(c)} aria-label={t({ en: "Remove", ar: "حذف" })}>🗑</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContactEditor({ t, draft, branches, contacts, book, onBookChange, onCancel, onSave }) {
  const [d, setD] = useState(draft);
  const [emails, setEmails] = useState([]); // new recipients picked from the contact book
  const [error, setError] = useState("");
  const bookName = (email) => book.find((c) => c.email?.toLowerCase() === String(email || "").toLowerCase())?.name || "";
  const set = (p) => setD((x) => ({ ...x, ...p }));
  const allBranches = !d.branches?.length;
  const allRules = !d.rules?.length;
  const toggleIn = (arr, v) => (arr.some((x) => norm(x) === norm(v)) ? arr.filter((x) => norm(x) !== norm(v)) : [...arr, v]);

  const submit = () => {
    const rules = d.rules?.length === RULES.length ? [] : d.rules || [];
    const base = { ...d, role: String(d.role || "").trim(), rules };
    if (!d._new) return onSave([{ ...base, name: String(d.name || "").trim() }]);

    const picked = [...new Set(emails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))];
    if (!picked.length) return setError(t({ en: "Pick at least one person.", ar: "اختار شخص واحد على الأقل." }));
    const bad = picked.filter((e) => !EMAIL_RE.test(e));
    if (bad.length) return setError(`${t({ en: "Invalid e-mail:", ar: "إيميل غير صحيح:" })} ${bad.join(", ")}`);
    const taken = picked.filter((e) => contacts.some((c) => c.email === e));
    if (taken.length === picked.length) {
      return setError(t({ en: "Already recipients — edit their rows instead.", ar: "موجودين بالمستلمين — عدّل سطورهم." }));
    }
    const fresh = picked.filter((e) => !taken.includes(e));
    const typedName = String(d.name || "").trim();
    onSave(fresh.map((email, i) => ({
      ...base,
      id: i === 0 ? d.id : newId(),
      email,
      name: (fresh.length === 1 && typedName) || bookName(email),
    })));
  };

  return (
    <section style={S.editor}>
      <div className="alp-h" style={{ fontWeight: 900, color: "#0f2740", marginBottom: 10 }}>
        {d._new ? `＋ ${t({ en: "New recipient", ar: "مستلم جديد" })}` : `✏️ ${t({ en: "Edit recipient", ar: "تعديل المستلم" })}`}
      </div>
      {d._new ? (
        /* Same people and same picker as the e-mail center (shared contact
           book, groups included). Several people can be added at once with
           the settings below; a new address typed here joins the book too. */
        <div style={S.field}>
          <ContactPicker
            label={`${t({ en: "People (from the e-mail contacts)", ar: "الأشخاص (من جهات اتصال الإيميل)" })} *`}
            value={emails}
            onChange={(v) => { setEmails(v); setError(""); }}
            contacts={book}
            onContactsChange={onBookChange}
          />
          {emails.length > 1 && (
            <span className="alp-xs" style={S.hint}>{t({ en: `${emails.length} people will get the same branches and alert types.`, ar: `${emails.length} أشخاص راح ياخدوا نفس الفروع وأنواع التنبيهات.` })}</span>
          )}
        </div>
      ) : (
        <div style={{ ...S.field, marginBottom: 4 }}>
          <span className="alp-s" style={S.label}>{t({ en: "E-mail", ar: "الإيميل" })}</span>
          <div dir="ltr" className="alp-s" style={S.lockedEmail}>{d.email}</div>
        </div>
      )}
      <div style={{ ...S.formGrid, marginTop: 10 }}>
        {(!d._new || emails.length <= 1) && (
          <label style={S.field}>
            <span className="alp-s" style={S.label}>{t({ en: "Name", ar: "الاسم" })}</span>
            <input style={S.input} value={d.name} onChange={(e) => set({ name: e.target.value })}
              placeholder={bookName(emails[0]) || t({ en: "e.g. Ahmad", ar: "مثلاً: أحمد" })} />
          </label>
        )}
        <label style={S.field}>
          <span className="alp-s" style={S.label}>{t({ en: "Role", ar: "الوظيفة" })}</span>
          <input style={S.input} value={d.role} onChange={(e) => set({ role: e.target.value })} placeholder={t({ en: "e.g. Branch manager", ar: "مثلاً: مدير الفرع" })} />
        </label>
      </div>

      <div style={S.pickBlock}>
        <div style={S.pickHead}>
          <span className="alp-s" style={S.label}>📍 {t({ en: "Which branches?", ar: "أي فروع؟" })}</span>
          <button type="button" style={{ ...S.pill, ...(allBranches ? S.pillOn : null) }} onClick={() => set({ branches: [] })}>
            {allBranches ? "✓ " : ""}{t({ en: "All branches", ar: "كل الفروع" })}
          </button>
        </div>
        <div style={S.pills}>
          {branches.map((b) => {
            const on = d.branches?.some((x) => norm(x) === norm(b));
            return (
              <button key={b} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => set({ branches: toggleIn(d.branches || [], b) })}>
                {on ? "✓ " : ""}{b}
              </button>
            );
          })}
        </div>
        <div className="alp-xs" style={S.hint}>
          {allBranches
            ? t({ en: "Gets alerts of every branch, plus the general ones that name no branch.", ar: "يستلم تنبيهات كل الفروع، والتنبيهات العامة بدون فرع." })
            : t({ en: `Gets only the alerts of: ${d.branches.join(", ")}.`, ar: `يستلم فقط تنبيهات: ${d.branches.join("، ")}.` })}
        </div>
      </div>

      <div style={S.pickBlock}>
        <div style={S.pickHead}>
          <span className="alp-s" style={S.label}>🔔 {t({ en: "Which alerts?", ar: "أي تنبيهات؟" })}</span>
          <button type="button" style={{ ...S.pill, ...(allRules ? S.pillOn : null) }} onClick={() => set({ rules: [] })}>
            {allRules ? "✓ " : ""}{t({ en: "All types", ar: "كل الأنواع" })}
          </button>
        </div>
        <div style={S.pills}>
          {RULES.map((r) => {
            const on = d.rules?.includes(r);
            return (
              <button key={r} type="button" style={{ ...S.pill, ...(on ? S.pillOn : null) }} onClick={() => set({ rules: on ? d.rules.filter((x) => x !== r) : [...(d.rules || []), r] })}>
                {RULE_INFO[r].icon} {t(RULE_INFO[r])}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <label style={S.check}>
          <input type="checkbox" checked={!!d.onlyCritical} onChange={(e) => set({ onlyCritical: e.target.checked })} />
          🚨 {t({ en: "Critical alerts only (expired, out of range)", ar: "التنبيهات الحرجة فقط (منتهي، خارج الحد)" })}
        </label>
        <label style={S.check}>
          <input type="checkbox" checked={d.active !== false} onChange={(e) => set({ active: e.target.checked })} />
          {t({ en: "Active", ar: "مفعّل" })}
        </label>
      </div>

      {error && <div style={{ ...S.bad, marginTop: 10, marginBottom: 0 }}>⚠️ {error}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" style={S.btn} onClick={onCancel}>{t({ en: "Cancel", ar: "إلغاء" })}</button>
        <button type="button" style={S.pri} onClick={submit}>✓ {d._new ? t({ en: "Add", ar: "إضافة" }) : t({ en: "Done", ar: "تم" })}</button>
      </div>
    </section>
  );
}

/* ───────────────────────── 🧭 Coverage ───────────────────────── */

function Coverage({ t, rules, branches, onPick }) {
  const contacts = rules.contacts || [];
  const rows = [...branches.map((b) => ({ key: b, label: b, branch: b })), { key: "__general", label: t({ en: "General (no branch)", ar: "عام (بدون فرع)" }), branch: "" }];
  const who = (rule, branch) => {
    const set = new Set((rules[rule]?.emails || []).map((e) => e));
    contacts.forEach((c) => { if (receives(c, rule, branch, true)) set.add(c.name || c.email); });
    return [...set];
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
  btnDel: { padding: "7px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff5f5", color: "#b91c1c", fontWeight: 900, cursor: "pointer" },
  pri: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 12, border: 0, background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(15,118,110,.22)" },
};
