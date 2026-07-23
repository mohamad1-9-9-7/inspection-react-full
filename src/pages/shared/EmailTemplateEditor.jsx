// EmailTemplateEditor.jsx
// Create/edit a saved email template ("distribution list"): a name, a subject,
// and explicit To / CC made of contact groups and/or individual addresses.
//
// Groups are resolved to addresses at send time, so adding a person to a group
// automatically adds them to every template that uses it.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PRIORITY_VALUES,
  priorityLabel,
  CLASSIFICATIONS,
  listGroupsFromContacts,
  expandGroup,
  saveTemplateRemote,
  TEMPLATE_VARS,
  buildTemplateVars,
  applyTemplateVars,
} from "./emailReportSettings";
import ContactPicker from "./ContactPicker";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const ICONS = ["📧", "📊", "🚨", "📋", "✅", "🧾", "🔔", "📦", "🥩", "🧪"];

/* EN/AR strings — `t()` resolves {en,ar} objects inline. */
const L = {
  editTitle:   { en: "✏️ Edit template",     ar: "✏️ تعديل القالب" },
  newTitle:    { en: "➕ New send template", ar: "➕ قالب إرسال جديد" },
  sub:         { en: "Groups resolve to addresses at send time — add a person to a group and they're added to every template that uses it.",
                 ar: "المجموعات تُترجم إلى عناوين وقت الإرسال — أضف شخصاً للمجموعة فيُضاف لكل قالب يستخدمها." },
  nameLbl:     { en: "Template name *",      ar: "اسم القالب *" },
  namePh:      { en: "e.g. Daily returns report", ar: "مثال: تقرير المرتجعات اليومي" },
  iconLbl:     { en: "Icon",                 ar: "الأيقونة" },
  subjectLbl:  { en: "Subject",              ar: "الموضوع" },
  subjectPh:   { en: "Leave empty to use the report's default subject",
                 ar: "اتركه فارغاً لاستخدام موضوع التقرير الافتراضي" },
  subjectHint: { en: "When the template is applied, this subject replaces the default one.",
                 ar: "عند تطبيق القالب، يحل هذا الموضوع محل الافتراضي." },
  toBox:       { en: "📥 Recipients (To)",   ar: "📥 المستلمون (إلى)" },
  ccBox:       { en: "📄 Copy (CC)",         ar: "📄 نسخة (CC)" },
  chooseGroups:{ en: "Choose groups:",       ar: "اختر المجموعات:" },
  orPeople:    { en: "Or specific people",   ar: "أو أشخاص محددين" },
  actualNow:   { en: "👁️ Actual recipients now", ar: "👁️ المستلمون الفعليون الآن" },
  toShort:     { en: "To",                   ar: "إلى" },
  ccShort:     { en: "CC",                   ar: "نسخة" },
  noGroupsWarn:{ en: "⚠️ No groups yet. Add groups to contacts from the 📇 Email Contacts section.",
                 ar: "⚠️ لا توجد مجموعات بعد. أضف مجموعات لجهات الاتصال من قسم 📇 جهات اتصال البريد." },
  priority:    { en: "Priority",             ar: "الأولوية" },
  classification: { en: "Classification",    ar: "التصنيف" },
  introLbl:    { en: "Opening text (greeting)", ar: "النص الافتتاحي (التحية)" },
  introPh:     { en: "Dear Team,\n\nPlease find attached the Daily {report} for {date}.",
                 ar: "Dear Team,\n\nPlease find attached the Daily {report} for {date}." },
  introHint:   { en: "Replaces the report's default greeting. Click a variable below to insert it — it fills itself in on every send.",
                 ar: "يستبدل التحية الافتراضية للتقرير. اضغط على متغيّر بالأسفل لإدراجه — يتعبّأ تلقائياً مع كل إرسال." },
  varsLbl:     { en: "Variables:",           ar: "المتغيّرات:" },
  sampleReport:{ en: "Returns Report",       ar: "تقرير المرتجعات" },
  livePreview: { en: "Preview with today's values:", ar: "معاينة بقيم اليوم:" },
  noteLbl:     { en: "Fixed note (optional)", ar: "ملاحظة ثابتة (اختياري)" },
  notePh:      { en: "Text added to the message body every time this template is used",
                 ar: "نص يُضاف لمتن الرسالة في كل مرة يُستخدم فيها هذا القالب" },
  errName:     { en: "Template name is required.", ar: "اسم القالب مطلوب." },
  errTo:       { en: "At least one recipient in To is required.", ar: "مطلوب مستلم واحد على الأقل في «إلى»." },
  errSave:     { en: "Save failed",          ar: "فشل الحفظ" },
  cancel:      { en: "Cancel",               ar: "إلغاء" },
  saving:      { en: "⏳ Saving...",         ar: "⏳ جارٍ الحفظ..." },
  saveTpl:     { en: "💾 Save template",     ar: "💾 حفظ القالب" },
};

const st = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.62)",
    zIndex: 10030, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(900px, 97vw)", maxHeight: "95vh", overflow: "auto",
    background: "#fff", borderRadius: 16, boxShadow: "0 28px 56px rgba(0,0,0,.34)",
    padding: 24, color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  h: { margin: 0, fontSize: 18, fontWeight: 900 },
  sub: { marginTop: 4, fontSize: 12, color: "#64748b" },
  field: { marginTop: 14 },
  label: { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 5 },
  input: {
    width: "100%", padding: "9px 11px", border: "1px solid #94a3b8",
    borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "9px 11px", border: "1px solid #94a3b8", borderRadius: 8,
    outline: "none", fontSize: 13, minHeight: 64, resize: "vertical",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  meta: { fontSize: 11, color: "#64748b", marginTop: 4 },
  box: { padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 },
  previewBox: {
    marginTop: 8, padding: "8px 10px", background: "#f0fdf4",
    border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12, color: "#166534",
  },
  previewLbl: { fontSize: 10.5, fontWeight: 800, color: "#15803d", letterSpacing: ".3px" },
  err: {
    marginTop: 12, padding: "9px 12px", background: "#fef2f2",
    border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, fontSize: 12, fontWeight: 700,
  },
  /* Sticky so Save stays reachable without scrolling the whole form. */
  actions: {
    marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end",
    position: "sticky", bottom: -24, background: "#fff",
    padding: "12px 0 4px", borderTop: "1px solid #e2e8f0",
  },
  btnPrimary: {
    padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
  btnGhost: {
    padding: "10px 18px", background: "#fff", color: "#334155",
    border: "1px solid #cbd5e1", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
};

function groupChip(active) {
  return {
    padding: "5px 12px", borderRadius: 999, cursor: "pointer",
    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#dbeafe" : "#fff",
    color: active ? "#1e40af" : "#475569",
    fontWeight: 800, fontSize: 12, fontFamily: "inherit",
  };
}

/** Toggleable row of group chips with a live "→ N recipients" count. */
function GroupChips({ title, groups, selected, onToggle, contacts, disabled }) {
  if (!groups.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {groups.map((g) => {
          const active = selected.some((x) => x.toLowerCase() === g.toLowerCase());
          const count = expandGroup(g, contacts).length;
          return (
            <button key={g} type="button" disabled={disabled}
              onClick={() => onToggle(g)} style={groupChip(active)}>
              {active ? "✓ " : ""}📁 {g} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EmailTemplateEditor({ open, template, contacts = [], onClose, onSaved }) {
  const { t, dir, isAr } = useSettingsLang();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📧");
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [note, setNote] = useState("");
  const [toGroups, setToGroups] = useState([]);
  const [ccGroups, setCcGroups] = useState([]);
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [priority, setPriority] = useState("normal");
  const [classification, setClassification] = useState("internal");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = template || {};
    setName(t.name || "");
    setIcon(t.icon || "📧");
    setSubject(t.subject || "");
    setIntro(t.intro || "");
    setNote(t.note || "");
    setToGroups(t.toGroups || []);
    setCcGroups(t.ccGroups || []);
    setToEmails(t.toEmails || []);
    setCcEmails(t.ccEmails || []);
    setPriority(t.priority || "normal");
    setClassification(t.classification || "internal");
    setErr("");
  }, [open, template]);

  const allGroups = useMemo(() => listGroupsFromContacts(contacts), [contacts]);

  /* Sample values so the author sees what the placeholders turn into. The real
     values are resolved per-report when the send modal opens. */
  const sampleVars = useMemo(
    () => buildTemplateVars({ reportTitle: t(L.sampleReport), itemsCount: 39 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAr]
  );

  /* Insert a {placeholder} at the caret of whichever field was last focused. */
  const introRef = useRef(null);
  const subjectRef = useRef(null);
  function insertVar(ref, value, setValue, key) {
    const el = ref.current;
    if (!el) { setValue(`${value}${key}`); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + key + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + key.length, start + key.length);
    });
  }

  /* Row of clickable variable chips under a field. */
  const VarChips = ({ onPick }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, color: "#64748b" }}>{t(L.varsLbl)}</span>
      {TEMPLATE_VARS.map((v) => (
        <button key={v.key} type="button" disabled={busy} onClick={() => onPick(v.key)}
          title={sampleVars[v.key] || ""}
          style={{
            padding: "2px 8px", borderRadius: 6, cursor: busy ? "not-allowed" : "pointer",
            background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155",
            fontWeight: 700, fontSize: 10.5, fontFamily: "inherit",
          }}>
          {v.key} <span style={{ color: "#94a3b8", fontWeight: 600 }}>{t(v.label)}</span>
        </button>
      ))}
    </div>
  );

  /* Live preview of who actually receives this — groups expanded, deduped. */
  const resolved = useMemo(() => {
    const dedupe = (arr) => {
      const seen = new Set();
      return arr.filter((e) => {
        const k = String(e || "").toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };
    const to = dedupe([...toGroups.flatMap((g) => expandGroup(g, contacts)), ...toEmails]);
    /* Someone already in To shouldn't be counted again in CC. */
    const toSet = new Set(to.map((e) => e.toLowerCase()));
    const cc = dedupe([...ccGroups.flatMap((g) => expandGroup(g, contacts)), ...ccEmails])
      .filter((e) => !toSet.has(e.toLowerCase()));
    return { to, cc };
  }, [toGroups, ccGroups, toEmails, ccEmails, contacts]);

  if (!open) return null;

  const toggle = (list, setList) => (g) =>
    setList(
      list.some((x) => x.toLowerCase() === g.toLowerCase())
        ? list.filter((x) => x.toLowerCase() !== g.toLowerCase())
        : [...list, g]
    );

  async function handleSave() {
    setErr("");
    if (!name.trim()) { setErr(t(L.errName)); return; }
    if (!resolved.to.length) { setErr(t(L.errTo)); return; }
    setBusy(true);
    try {
      const saved = await saveTemplateRemote({
        ...(template || {}),
        name: name.trim(),
        icon,
        subject: subject.trim(),
        intro,
        note,
        toGroups, ccGroups, toEmails, ccEmails,
        priority, classification,
      });
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setErr(e?.message || t(L.errSave));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={st.overlay} role="dialog" aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}>
      <div dir={dir} style={st.modal}>
        <h3 style={st.h}>{template?.id ? t(L.editTitle) : t(L.newTitle)}</h3>
        <div style={st.sub}>{t(L.sub)}</div>

        <div style={{ ...st.field, ...st.twoCol }}>
          <div>
            <label style={st.label}>{t(L.nameLbl)}</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t(L.namePh)} style={st.input} disabled={busy} />
          </div>
          <div>
            <label style={st.label}>{t(L.iconLbl)}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ICONS.map((ic) => (
                <button key={ic} type="button" disabled={busy} onClick={() => setIcon(ic)}
                  style={{
                    fontSize: 18, lineHeight: 1, padding: "5px 7px", cursor: "pointer",
                    borderRadius: 8, background: icon === ic ? "#dbeafe" : "#fff",
                    border: icon === ic ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={st.field}>
          <label style={st.label}>{t(L.subjectLbl)}</label>
          <input ref={subjectRef} value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder={t(L.subjectPh)} style={st.input} disabled={busy} />
          <div style={st.meta}>{t(L.subjectHint)}</div>
          <VarChips onPick={(k) => insertVar(subjectRef, subject, setSubject, k)} />
          {subject.includes("{") && (
            <div style={st.previewBox}>
              <span style={st.previewLbl}>{t(L.livePreview)}</span>{" "}
              {applyTemplateVars(subject, sampleVars)}
            </div>
          )}
        </div>

        {/* ===== Opening text (greeting) with variables ===== */}
        <div style={{ ...st.field, ...st.box }}>
          <label style={st.label}>✍️ {t(L.introLbl)}</label>
          <textarea ref={introRef} value={intro} onChange={(e) => setIntro(e.target.value)}
            placeholder={t(L.introPh)}
            style={{ ...st.textarea, minHeight: 80, background: "#fff" }} disabled={busy} />
          <div style={st.meta}>{t(L.introHint)}</div>
          <VarChips onPick={(k) => insertVar(introRef, intro, setIntro, k)} />
          {intro.trim() && (
            <div style={st.previewBox}>
              <div style={st.previewLbl}>{t(L.livePreview)}</div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                {applyTemplateVars(intro, sampleVars)}
              </div>
            </div>
          )}
        </div>

        {/* ===== To ===== */}
        <div style={{ ...st.field, ...st.box }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>{t(L.toBox)}</div>
          <GroupChips title={t(L.chooseGroups)} groups={allGroups} selected={toGroups}
            onToggle={toggle(toGroups, setToGroups)} contacts={contacts} disabled={busy} />
          <div style={{ marginTop: 10 }}>
            <ContactPicker label={t(L.orPeople)} value={toEmails} onChange={setToEmails}
              contacts={contacts} disabled={busy} allowAdd={false} />
          </div>
        </div>

        {/* ===== CC ===== */}
        <div style={{ ...st.field, ...st.box }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>{t(L.ccBox)}</div>
          <GroupChips title={t(L.chooseGroups)} groups={allGroups} selected={ccGroups}
            onToggle={toggle(ccGroups, setCcGroups)} contacts={contacts} disabled={busy} />
          <div style={{ marginTop: 10 }}>
            <ContactPicker label={t(L.orPeople)} value={ccEmails} onChange={setCcEmails}
              contacts={contacts} disabled={busy} allowAdd={false} />
          </div>
        </div>

        {/* ===== Live resolution ===== */}
        <div style={{ ...st.field, ...st.box, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: "#166534", marginBottom: 6 }}>
            {t(L.actualNow)} — {t(L.toShort)}: {resolved.to.length} · {t(L.ccShort)}: {resolved.cc.length}
          </div>
          <div style={{ fontSize: 11, color: "#166534", lineHeight: 1.7, wordBreak: "break-all" }}>
            <b>{t(L.toShort)}:</b> <span dir="ltr">{resolved.to.join(", ") || "—"}</span>
            <br />
            <b>{t(L.ccShort)}:</b> <span dir="ltr">{resolved.cc.join(", ") || "—"}</span>
          </div>
          {!allGroups.length && (
            <div style={{ ...st.meta, color: "#b45309" }}>{t(L.noGroupsWarn)}</div>
          )}
        </div>

        <div style={{ ...st.field, ...st.twoCol }}>
          <div>
            <label style={st.label}>{t(L.priority)}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              style={st.input} disabled={busy}>
              {PRIORITY_VALUES.map((p) => (
                <option key={p} value={p}>{priorityLabel(p, isAr)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={st.label}>{t(L.classification)}</label>
            <select value={classification} onChange={(e) => setClassification(e.target.value)}
              style={st.input} disabled={busy}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{isAr ? c.labelAr || c.label : c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={st.field}>
          <label style={st.label}>{t(L.noteLbl)}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={t(L.notePh)}
            style={st.textarea} disabled={busy} />
        </div>

        {err && <div style={st.err}>{err}</div>}

        <div style={st.actions}>
          <button type="button" onClick={onClose} disabled={busy} style={st.btnGhost}>{t(L.cancel)}</button>
          <button type="button" onClick={handleSave} disabled={busy}
            style={{ ...st.btnPrimary, ...(busy ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}>
            {busy ? t(L.saving) : t(L.saveTpl)}
          </button>
        </div>
      </div>
    </div>
  );
}
