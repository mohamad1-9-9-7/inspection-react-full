// EmailSettingsPanel.jsx
// Modal panel for configuring persistent email settings.

import React, { useEffect, useState } from "react";
import {
  loadEmailSettings,
  fetchEmailSettings,
  saveEmailSettings,
  resetEmailSettings,
  buildSignatureHtml,
  PRIORITY_VALUES,
  priorityLabel,
  listEmailContacts,
  addEmailContact,
  updateContactGroups,
  updateContactName,
  listGroupsFromContacts,
  deleteEmailContact,
  isValidEmail,
  CLASSIFICATIONS,
  listEmailTemplates,
  deleteTemplateRemote,
  expandGroup,
  expandTemplateRecipients,
  getAutoRoute,
  resolveAutoRoute,
  renameGroup,
  deleteGroup,
} from "./emailReportSettings";
import EmailTemplateEditor from "./EmailTemplateEditor";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
    zIndex: 10020, display: "flex", alignItems: "center", justifyContent: "center", padding: 10,
  },
  modal: {
    width: "min(1240px, 98vw)", height: "min(94vh, 940px)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    background: "#fff", borderRadius: 18, boxShadow: "0 28px 56px rgba(15,23,42,.34)",
    color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  embeddedWrap: {
    display: "flex", flexDirection: "column", height: "min(88vh, 900px)",
    border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden",
    background: "#fff", color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  /* ── Chrome: header / body / nav rail / panel / footer ── */
  header: {
    flexShrink: 0, padding: "16px 22px", color: "#fff",
    background: "linear-gradient(120deg,#0ea5e9 0%,#2563eb 55%,#4338ca 100%)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.2 },
  headerSub: { marginTop: 3, fontSize: 12, opacity: 0.85, fontWeight: 500 },
  xBtn: {
    width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.35)",
    background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 18, fontWeight: 800,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  body: { flex: 1, display: "flex", minHeight: 0 },
  nav: {
    flexShrink: 0, width: 232, background: "#f8fafc", borderInlineEnd: "1px solid #e8edf3",
    padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4,
  },
  panel: { flex: 1, overflowY: "auto", padding: "20px 28px", minWidth: 0 },
  footer: {
    flexShrink: 0, padding: "12px 22px", borderTop: "1px solid #e8edf3", background: "#fff",
    display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap",
  },
  title:   { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub:     { marginTop: 4, fontSize: 13, color: "#475569" },
  section: { marginTop: 18 },
  sectionH: { fontSize: 13, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" },
  field:   { marginTop: 10 },
  label:   { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 4 },
  input:   { width: "100%", padding: "9px 11px", border: "1px solid #94a3b8", borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "9px 11px", border: "1px solid #94a3b8", borderRadius: 8, outline: "none", fontSize: 13, minHeight: 70, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  meta:    { fontSize: 11, color: "#64748b", marginTop: 4 },
  twoCol:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  check:   { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", padding: "6px 0" },
  preview: { marginTop: 10, padding: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10 },
  imgBox:  { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },
  img:     { maxHeight: 64, maxWidth: 180, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", padding: 4 },
  actions: { marginTop: 22, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  btnPrimary: { padding: "10px 18px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14 },
  btnGhost:   { padding: "10px 18px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14 },
  btnDanger:  { padding: "8px 14px", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnLink:    { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 700, padding: "4px 6px" },
};

function navBtnStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "start",
    fontFamily: "inherit", fontSize: 13, fontWeight: 800,
    border: active ? "1px solid #bfdbfe" : "1px solid transparent",
    background: active ? "#fff" : "transparent",
    color: active ? "#1d4ed8" : "#475569",
    boxShadow: active ? "0 1px 3px rgba(37,99,235,.15)" : "none",
    transition: "background .12s, color .12s",
  };
}
function navBadge(active) {
  return {
    marginInlineStart: "auto", minWidth: 20, textAlign: "center",
    padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800,
    background: active ? "#dbeafe" : "#e2e8f0",
    color: active ? "#1e40af" : "#64748b",
  };
}

/* Report types that ship an email config today. Adding one here is enough to
   make it routable — the modal matches on config.reportType. */
const ROUTABLE_REPORTS = [
  { id: "returns",          icon: "📦", label: { en: "Returns Report",          ar: "تقرير المرتجعات" } },
  { id: "customer_returns", icon: "🧾", label: { en: "Customer Returns Report", ar: "تقرير مرتجعات العملاء" } },
];

/* ── EN/AR strings for this panel. `t()` from settingsI18n resolves {en,ar}
   objects inline, so these live here instead of bloating the central dict. ── */
const L = {
  title:        { en: "Email Settings", ar: "إعدادات البريد الإلكتروني" },
  titleSub:     { en: "One place for recipients, contacts, templates and signature.",
                  ar: "مكان واحد للمستلمين وجهات الاتصال والقوالب والتوقيع." },
  close:        { en: "Close", ar: "إغلاق" },

  /* Tabs */
  tabGeneral:   { en: "General",            ar: "عام" },
  tabContacts:  { en: "Contacts",           ar: "جهات الاتصال" },
  tabTemplates: { en: "Templates & Routing", ar: "القوالب والتوجيه" },
  tabSignature: { en: "Signature",          ar: "التوقيع" },

  /* General */
  defRecipients: { en: "Default Recipients", ar: "المستلمون الافتراضيون" },
  defTo:         { en: "Default To",         ar: "المستلم الافتراضي (إلى)" },
  defCc:         { en: "Default CC (always)", ar: "نسخة افتراضية (دائماً)" },
  defBcc:        { en: "Default BCC",        ar: "نسخة مخفية افتراضية" },
  commaHint:     { en: "Separate multiple emails with a comma.", ar: "افصل بين الإيميلات بفاصلة." },
  optional:      { en: "(optional)",         ar: "(اختياري)" },
  subjectPrefix: { en: "Subject Prefix",     ar: "بادئة الموضوع" },
  subjectPrefixHint: { en: "Automatically added to the start of every subject.",
                       ar: "تُضاف تلقائياً في بداية كل موضوع." },
  behaviour:     { en: "Behaviour",          ar: "السلوك" },
  defPriority:   { en: "Default Priority",   ar: "الأولوية الافتراضية" },
  defClass:      { en: "Default Classification", ar: "التصنيف الافتراضي" },
  defClassHint:  { en: "Sets the default banner when the modal opens. You can change it per email before sending.",
                   ar: "يحدد الشريط الافتراضي عند فتح النافذة. يمكنك تغييره لكل رسالة قبل الإرسال." },
  /* Honest about the limit: the header is only added on the .eml (Outlook) path;
     direct server send ignores it until the API carries the flag. */
  readReceipt:   { en: "Request read receipt — Outlook method only (relies on the recipient's mail client, no tracking)",
                   ar: "طلب إشعار بالقراءة — لطريقة Outlook فقط (يعتمد على برنامج بريد المستلم، بدون تتبّع)" },

  /* Contacts */
  contactsH:     { en: "Email Contacts",     ar: "جهات اتصال البريد" },
  contactsHint:  { en: "Each contact = a display name + email. You can search by either when sending.",
                   ar: "كل جهة اتصال = اسم للعرض + إيميل. يمكنك البحث بأي منهما عند الإرسال." },
  phName:        { en: "🏷️ Display name",    ar: "🏷️ الاسم الظاهر" },
  phEmail:       { en: "✉️ email@almawashi.ae", ar: "✉️ email@almawashi.ae" },
  phGroups:      { en: "📁 Groups (comma-separated)", ar: "📁 المجموعات (مفصولة بفاصلة)" },
  add:           { en: "+ Add",              ar: "+ إضافة" },
  invalidEmail:  { en: "Invalid email format", ar: "صيغة الإيميل غير صحيحة" },
  saveFailed:    { en: "Save failed",        ar: "فشل الحفظ" },
  searchContacts:{ en: "Search by name or email…", ar: "ابحث بالاسم أو الإيميل…" },
  noMatches:     { en: "No matching results.", ar: "لا توجد نتائج مطابقة." },
  noName:        { en: "No name",            ar: "بدون اسم" },
  noContacts:    { en: "No saved emails yet.", ar: "لا توجد إيميلات محفوظة بعد." },
  groupsCsv:     { en: "Groups, comma-separated", ar: "المجموعات، مفصولة بفاصلة" },
  save:          { en: "Save",               ar: "حفظ" },
  cancel:        { en: "Cancel",             ar: "إلغاء" },
  edit:          { en: "✏️ Edit",            ar: "✏️ تعديل" },
  duplicate:     { en: "Duplicate",          ar: "نسخ" },
  copySuffix:    { en: "(copy)",             ar: "(نسخة)" },
  addGroup:      { en: "+ Group",            ar: "+ مجموعة" },
  renameContact: { en: "Rename",             ar: "إعادة تسمية" },
  renamePromptContact: { en: "Display name for {x}:", ar: "الاسم الظاهر لـ {x}:" },
  del:           { en: "Delete",             ar: "حذف" },
  confirmDelContact: { en: "Delete {x}? It is removed for everyone.",
                       ar: "حذف {x}؟ سيُحذف لدى الجميع." },

  /* Groups */
  groupsH:       { en: "Distribution Groups", ar: "مجموعات التوزيع" },
  groupsHint:    { en: "A group = a tag on contacts. Use it in templates to set To and CC in one click.",
                   ar: "المجموعة = وسم على جهات الاتصال. استخدمها في القوالب لتعبئة «إلى» و«نسخة» بضغطة واحدة." },
  rename:        { en: "✏️ Rename",          ar: "✏️ إعادة تسمية" },
  noMembers:     { en: "No members",         ar: "لا يوجد أعضاء" },
  noGroups:      { en: "No groups yet. Add group tags when adding a contact above (e.g. Managers, QA).",
                   ar: "لا توجد مجموعات بعد. أضف وسوم المجموعات عند إضافة جهة اتصال أعلاه (مثل: المدراء، الجودة)." },
  renamePrompt:  { en: "New name for group \"{x}\":", ar: "الاسم الجديد للمجموعة «{x}»:" },
  delGroupPrompt:{ en: "Delete group \"{x}\"? Contacts stay, they just lose the tag.",
                   ar: "حذف المجموعة «{x}»؟ جهات الاتصال تبقى، تفقد الوسم فقط." },

  /* Templates */
  groupCardT:    { en: "📁 Group = a list of people", ar: "📁 المجموعة = قائمة أشخاص" },
  groupCardB:    { en: "A tag on contacts (QA Team, Managers). Add a person to the group once and every template using it picks them up. Managed in 📇 Contacts.",
                   ar: "وسم على جهات الاتصال (فريق الجودة، المدراء). أضف الشخص للمجموعة مرة واحدة فيظهر في كل قالب يستخدمها. تُدار من 📇 جهات الاتصال." },
  tplCardT:      { en: "📝 Template = a whole ready email", ar: "📝 القالب = رسالة جاهزة كاملة" },
  tplCardB:      { en: "Subject + To + CC + priority + note together. Uses groups to fill To/CC. One click in the send modal — or set it below to apply itself automatically.",
                   ar: "الموضوع + إلى + نسخة + الأولوية + الملاحظة معاً. يستخدم المجموعات لتعبئة «إلى/نسخة». ضغطة واحدة في نافذة الإرسال — أو اضبطه بالأسفل ليُطبَّق تلقائياً." },
  templatesH:    { en: "Email Templates",    ar: "قوالب البريد" },
  templatesHint: { en: "A template saves the subject + who's in To and CC. It shows as a quick button above the send modal — one click fills everything. Saved on the server and shared across users.",
                   ar: "القالب يحفظ الموضوع + من في «إلى» و«نسخة». يظهر كزر سريع أعلى نافذة الإرسال — ضغطة واحدة تعبّي كل شيء. محفوظ على الخادم ومشترك بين المستخدمين." },
  newTemplate:   { en: "➕ New template",    ar: "➕ قالب جديد" },
  localOnly:     { en: "• Local only",       ar: "• محلي فقط" },
  noTemplates:   { en: "No templates yet. Click \"➕ New template\" above.",
                   ar: "لا توجد قوالب بعد. اضغط «➕ قالب جديد» بالأعلى." },
  confirmDelTpl: { en: "Delete template \"{x}\"? It will be removed for everyone.",
                   ar: "حذف القالب «{x}»؟ سيُحذف لدى الجميع." },

  /* Auto-routing */
  routingH:      { en: "Auto-Routing",       ar: "التوجيه التلقائي" },
  routingHint:   { en: "Pick what each report type opens with — a saved template (subject + recipients + priority), extra groups, or both. The send modal fills itself in when it opens.",
                   ar: "اختر بماذا يفتح كل نوع تقرير — قالب محفوظ (موضوع + مستلمون + أولوية)، أو مجموعات إضافية، أو الاثنين. نافذة الإرسال تعبّي نفسها عند الفتح." },
  routingEmpty:  { en: "⚠️ Nothing to route with yet — create a template above, or tag contacts with a group.",
                   ar: "⚠️ لا يوجد ما يُوجَّه به بعد — أنشئ قالباً بالأعلى، أو ضع وسم مجموعة على جهات الاتصال." },
  useTemplate:   { en: "📝 Use template:",   ar: "📝 استخدم قالباً:" },
  noneGroupsOnly:{ en: "— None (groups only) —", ar: "— بدون (مجموعات فقط) —" },
  tplBrings:     { en: "Brings its subject, note, priority and classification too.",
                   ar: "يجلب معه الموضوع والملاحظة والأولوية والتصنيف أيضاً." },
  noTemplatesYet:{ en: "No templates yet.",  ar: "لا توجد قوالب بعد." },
  extraGroups:   { en: "📁 Extra groups (added to the template):", ar: "📁 مجموعات إضافية (تُضاف إلى القالب):" },
  groupsLabel:   { en: "📁 Groups:",         ar: "📁 المجموعات:" },
  opensWith:     { en: "👁️ Opens with", ar: "👁️ يفتح بـ" },

  /* Signature */
  signatureH:    { en: "Email Signature",    ar: "توقيع البريد" },
  name:          { en: "Name",               ar: "الاسم" },
  jobTitle:      { en: "Title / Position",   ar: "المسمى الوظيفي" },
  company:       { en: "Company",            ar: "الشركة" },
  phone:         { en: "Phone",              ar: "الهاتف" },
  email:         { en: "Email",              ar: "البريد الإلكتروني" },
  sigImage:      { en: "Signature Image / Logo (optional)", ar: "صورة التوقيع / الشعار (اختياري)" },
  noImage:       { en: "No image yet.",      ar: "لا توجد صورة بعد." },
  remove:        { en: "✕ Remove",           ar: "✕ إزالة" },
  upload:        { en: "📤 Upload",          ar: "📤 رفع" },
  uploading:     { en: "⏳ Uploading...",    ar: "⏳ جارٍ الرفع..." },
  uploadFailed:  { en: "Image upload failed: ", ar: "فشل رفع الصورة: " },
  advancedHtml:  { en: "Advanced: Custom HTML signature (overrides fields above)",
                   ar: "متقدم: توقيع HTML مخصص (يتجاوز الحقول أعلاه)" },
  preview:       { en: "PREVIEW",            ar: "معاينة" },
  noSignature:   { en: "No signature.",      ar: "لا يوجد توقيع." },

  /* Footer */
  resetSettings: { en: "↺ Reset settings",   ar: "↺ إعادة الضبط" },
  confirmReset:  { en: "Reset all email settings to defaults?", ar: "إعادة كل إعدادات البريد للوضع الافتراضي؟" },
  emailCenter:   { en: "📨 Email Center →",  ar: "📨 مركز البريد ←" },
  saved:         { en: "✅ Saved for everyone", ar: "✅ تم الحفظ للجميع" },
  unsaved:       { en: "● Unsaved changes",  ar: "● تغييرات غير محفوظة" },
  saveSettings:  { en: "💾 Save Settings",   ar: "💾 حفظ الإعدادات" },
  saving:        { en: "⏳ Syncing…",        ar: "⏳ جارٍ المزامنة…" },
  saveOffline:   { en: "⚠️ Server unreachable — kept on this device only. Press Save again once you're back online.",
                   ar: "⚠️ تعذّر الوصول للخادم — محفوظ على هذا الجهاز فقط. اضغط حفظ مجدداً عند عودة الاتصال." },
  sharedNote:    { en: "🌐 These settings are stored on the server and shared with everyone.",
                   ar: "🌐 هذه الإعدادات محفوظة على الخادم ومشتركة مع الجميع." },
  defMethod:     { en: "Default send method", ar: "طريقة الإرسال الافتراضية" },
  mOutlook:      { en: "📧 Outlook (.eml)",  ar: "📧 Outlook (ملف .eml)" },
  mServer:       { en: "📤 Send Now (server)", ar: "📤 إرسال الآن (من الخادم)" },
  mWhatsapp:     { en: "💬 WhatsApp",        ar: "💬 واتساب" },
  mCopy:         { en: "📋 Copy",            ar: "📋 نسخ" },
  confirmClose:  { en: "You have unsaved changes. Close without saving?",
                   ar: "لديك تغييرات غير محفوظة. الإغلاق بدون حفظ؟" },
};

export default function EmailSettingsPanel({ open, onClose, onSaved, embedded = false }) {
  /* Same toggle the rest of Settings uses — one localStorage key, so switching
     the language anywhere flips this panel too. */
  const { t, lang, toggle, dir, isAr } = useSettingsLang();
  /* "Delete X?" style prompts: {x} is filled after translation. */
  const tx = (key, x) => t(key).replace("{x}", x);

  const [s, setS] = useState(() => loadEmailSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactGroups, setNewContactGroups] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactErr, setContactErr] = useState("");

  /* Inline group editor: tracks which contact's groups are being edited */
  const [editingGroupsFor, setEditingGroupsFor] = useState(null);
  const [editingGroupsValue, setEditingGroupsValue] = useState("");

  const [templates, setTemplates] = useState([]);
  /* null = closed; {} = creating a new one; {…} = editing that template */
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [dirty, setDirty] = useState(false);
  const [syncing, setSyncing] = useState(false);   // talking to the server
  const [saveErr, setSaveErr] = useState("");
  /* Read inside the async fetch: never clobber edits the user started typing
     while the server round-trip was in flight. */
  const dirtyRef = React.useRef(false);
  React.useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const reloadContacts = () => listEmailContacts().then(setContacts).catch(() => {});
  const reloadTemplates = () => listEmailTemplates().then(setTemplates).catch(() => {});

  useEffect(() => {
    if (!open) return;
    /* Show the cached copy instantly, then take whatever the server has —
       the settings are shared, so someone else may have changed them. */
    setS(loadEmailSettings());
    setNewContact("");
    setContactErr("");
    setEditingGroupsFor(null);
    setEditorOpen(false);
    setActiveTab("general");
    setDirty(false);
    setSyncing(true);
    fetchEmailSettings()
      .then((fresh) => setS((cur) => (dirtyRef.current ? cur : fresh)))
      .finally(() => setSyncing(false));
    reloadTemplates();
    reloadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleAddContact() {
    const e = newContact.trim();
    const n = newContactName.trim();
    const g = newContactGroups.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    setContactErr("");
    if (!isValidEmail(e)) { setContactErr(t(L.invalidEmail)); return; }
    setContactBusy(true);
    try {
      await addEmailContact(e, n, g);
      setNewContact("");
      setNewContactName("");
      setNewContactGroups("");
      await reloadContacts();
    } catch (ex) {
      setContactErr(ex?.message || t(L.saveFailed));
    } finally {
      setContactBusy(false);
    }
  }

  function startEditGroups(c) {
    setEditingGroupsFor(c.email);
    setEditingGroupsValue((c.groups || []).join(", "));
  }
  async function saveEditGroups() {
    const g = editingGroupsValue.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    await updateContactGroups(editingGroupsFor, g);
    setEditingGroupsFor(null);
    setEditingGroupsValue("");
    await reloadContacts();
  }

  async function handleDeleteTemplate(tpl) {
    if (!window.confirm(tx(L.confirmDelTpl, tpl.name))) return;
    await deleteTemplateRemote(tpl.id);
    await reloadTemplates();
  }

  /* Duplicate: open the editor pre-filled with a copy of the template. Stripping
     id/serverId means Save creates a brand-new row instead of overwriting the
     original — so the user tweaks the copy and saves it as its own template. */
  function handleDuplicateTemplate(tpl) {
    const { id, serverId, ...rest } = tpl;
    setEditorTemplate({ ...rest, name: `${tpl.name} ${t(L.copySuffix)}` });
    setEditorOpen(true);
  }

  async function handleRenameGroup(g) {
    const next = window.prompt(tx(L.renamePrompt, g), g);
    if (!next || next.trim() === g) return;
    await renameGroup(g, next.trim());
    await reloadContacts();
  }

  async function handleDeleteGroup(g) {
    if (!window.confirm(tx(L.delGroupPrompt, g))) return;
    await deleteGroup(g);
    await reloadContacts();
  }

  async function handleRenameContact(c) {
    const next = window.prompt(tx(L.renamePromptContact, c.email), c.name || "");
    if (next === null || next.trim() === (c.name || "")) return;
    await updateContactName(c.email, next.trim());
    await reloadContacts();
  }

  async function handleRemoveContact(email) {
    if (!window.confirm(tx(L.confirmDelContact, email))) return;
    setContacts((cur) => cur.filter((c) => c.email !== email)); // optimistic
    await deleteEmailContact(email);
    await reloadContacts();
  }

  if (!open) return null;

  /* Every change marks the panel dirty — the footer says so, instead of the old
     "don't forget to save" warning that showed even when nothing had changed. */
  const set = (k, v) => { setDirty(true); setS((cur) => ({ ...cur, [k]: v })); };

  const allGroups = listGroupsFromContacts(contacts);

  /* Who a template actually reaches. Same helper the send modal uses, so the
     counts here can never drift from what really goes out. */
  const expandTpl = (tpl) => expandTemplateRecipients(tpl, contacts);

  async function handleUploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageToServer(file, "qcs_email_signature");
      set("signatureImageUrl", url);
    } catch (err) {
      alert(t(L.uploadFailed) + (err?.message || err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setSaveErr("");
    setSyncing(true);
    const { ok } = await saveEmailSettings(s);
    setSyncing(false);
    onSaved?.(s);
    if (!ok) {
      /* Cached locally, but the team can't see it yet — say so instead of
         flashing a green "Saved" that isn't true. */
      setSaveErr(t(L.saveOffline));
      setDirty(true);
      return;
    }
    setDirty(false);
    if (embedded) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } else {
      onClose?.();
    }
  }

  async function handleReset() {
    if (!window.confirm(t(L.confirmReset))) return;
    setSyncing(true);
    const def = await resetEmailSettings();
    setSyncing(false);
    setS(def);
    setDirty(false);
    onSaved?.(def);
  }

  /** Closing with pending edits used to silently throw them away. */
  function guardClose() {
    if (dirty && !window.confirm(t(L.confirmClose))) return false;
    onClose?.();
    return true;
  }


  const TABS = [
    { id: "general",   icon: "⚙️", label: t(L.tabGeneral) },
    { id: "contacts",  icon: "📇", label: t(L.tabContacts), badge: contacts.length },
    { id: "templates", icon: "📝", label: t(L.tabTemplates), badge: templates.length },
    { id: "signature", icon: "✍️", label: t(L.tabSignature) },
  ];
  const tab = (id) => (activeTab === id ? { display: "block" } : { display: "none" });

  const content = (
    <>
      <div style={styles.header}>
        <div>
          <h3 style={styles.headerTitle}>⚙️ {t(L.title)}</h3>
          <div style={styles.headerSub}>{t(L.titleSub)}</div>
          <div style={{ ...styles.headerSub, marginTop: 2, opacity: 0.95 }}>{t(L.sharedNote)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <LangToggle lang={lang} toggle={toggle} style={{ padding: "6px 12px", fontSize: 12 }} />
          {!embedded && (
            <button type="button" onClick={() => guardClose()} style={styles.xBtn} title={t(L.close)}>✕</button>
          )}
        </div>
      </div>

      <div style={styles.body}>
        {/* ── Nav rail ── */}
        <div style={styles.nav}>
          {TABS.map((tb) => {
            const on = activeTab === tb.id;
            return (
              <button key={tb.id} type="button" onClick={() => setActiveTab(tb.id)} style={navBtnStyle(on)}>
                <span style={{ fontSize: 16 }}>{tb.icon}</span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tb.label}</span>
                {typeof tb.badge === "number" && tb.badge > 0 && <span style={navBadge(on)}>{tb.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Active panel ── */}
        <div style={styles.panel}>

        {/* === Default Recipients === */}
        <div style={{ ...styles.section, ...tab("general"), marginTop: 0 }}>
          <div style={styles.sectionH}>👥 {t(L.defRecipients)}</div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.defTo)}</label>
            <input style={styles.input} value={s.defaultTo} dir="ltr"
              onChange={(e) => set("defaultTo", e.target.value)}
              placeholder="manager@almawashi.ae" />
          </div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.defCc)}</label>
              <input style={styles.input} value={s.defaultCc} dir="ltr"
                onChange={(e) => set("defaultCc", e.target.value)}
                placeholder="qa@almawashi.ae, ops@almawashi.ae" />
              <div style={styles.meta}>{t(L.commaHint)}</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.defBcc)}</label>
              <input style={styles.input} value={s.defaultBcc} dir="ltr"
                onChange={(e) => set("defaultBcc", e.target.value)}
                placeholder={t(L.optional)} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.subjectPrefix)}</label>
            <input style={styles.input} value={s.subjectPrefix}
              onChange={(e) => set("subjectPrefix", e.target.value)}
              placeholder="[QA-URGENT] " />
            <div style={styles.meta}>{t(L.subjectPrefixHint)}</div>
          </div>
        </div>

        {/* === Email Contacts (server-saved) === */}
        <div style={{ ...styles.section, ...tab("contacts"), marginTop: 0 }}>
          <div style={styles.sectionH}>📇 {t(L.contactsH)} ({contacts.length})</div>
          <div style={styles.meta}>{t(L.contactsHint)}</div>

          {/* Add new — three fields side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr auto", gap: 8, marginTop: 8 }}>
            <input
              style={styles.input}
              placeholder={t(L.phName)}
              value={newContactName}
              disabled={contactBusy}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
            />
            <input
              style={styles.input}
              dir="ltr"
              placeholder="✉️ email@almawashi.ae"
              value={newContact}
              disabled={contactBusy}
              onChange={(e) => setNewContact(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
            />
            <input
              style={styles.input}
              placeholder={t(L.phGroups)}
              value={newContactGroups}
              disabled={contactBusy}
              onChange={(e) => setNewContactGroups(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
              title="e.g. QA Team, Management"
            />
            <button
              type="button"
              onClick={handleAddContact}
              disabled={contactBusy || !newContact.trim()}
              style={{ ...styles.btnPrimary, opacity: (contactBusy || !newContact.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}
            >
              {contactBusy ? "…" : t(L.add)}
            </button>
          </div>
          {contactErr && <div style={{ ...styles.meta, color: "#dc2626", fontWeight: 700 }}>{contactErr}</div>}

          {/* Search box */}
          {contacts.length > 3 && (
            <div style={{ position: "relative", marginTop: 12 }}>
              <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", color: "#94a3b8" }}>🔍</span>
              <input
                style={{ ...styles.input, paddingInlineStart: 32 }}
                placeholder={t(L.searchContacts)}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>
          )}

          {contacts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: "min(46vh, 460px)", overflowY: "auto" }}>
              {(() => {
                const q = contactSearch.trim().toLowerCase();
                const filtered = q
                  ? contacts.filter((c) =>
                      (c.email || "").toLowerCase().includes(q) ||
                      (c.name || "").toLowerCase().includes(q)
                    )
                  : contacts;
                if (filtered.length === 0) {
                  return <div style={{ ...styles.meta, marginTop: 4 }}>{t(L.noMatches)}</div>;
                }
                return filtered.map((c) => {
                  const isEditing = editingGroupsFor === c.email;
                  return (
                  <div key={c.email} style={{
                    display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between",
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "8px 12px", flexWrap: "wrap",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Name is editable in place — before, a typo meant deleting
                          the contact and adding it again. */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                          {c.name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{t(L.noName)}</span>}
                        </div>
                        <button type="button" onClick={() => handleRenameContact(c)}
                          title={t(L.renameContact)}
                          style={{ background: "none", border: "none", cursor: "pointer",
                            fontSize: 11, padding: 0, color: "#94a3b8" }}>✏️</button>
                      </div>
                      <div dir="ltr" style={{ color: "#64748b", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "start" }}>
                        {c.email}
                      </div>
                      {/* Group chips or inline editor */}
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                          <input
                            style={{ ...styles.input, padding: "5px 8px", fontSize: 12, flex: 1 }}
                            placeholder={t(L.groupsCsv)}
                            value={editingGroupsValue}
                            autoFocus
                            onChange={(e) => setEditingGroupsValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditGroups(); if (e.key === "Escape") setEditingGroupsFor(null); }}
                          />
                          <button type="button" onClick={saveEditGroups}
                            style={{ ...styles.btnPrimary, padding: "5px 10px", fontSize: 11 }}>{t(L.save)}</button>
                          <button type="button" onClick={() => setEditingGroupsFor(null)}
                            style={{ ...styles.btnGhost, padding: "5px 10px", fontSize: 11 }}>{t(L.cancel)}</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {(c.groups || []).map((g) => (
                            <span key={g} style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "1px 7px", borderRadius: 999,
                              background: "#fef3c7", color: "#92400e",
                              border: "1px solid #fcd34d", fontWeight: 700, fontSize: 10,
                            }}>@{g}</span>
                          ))}
                          <button type="button" onClick={() => startEditGroups(c)}
                            style={{ background: "none", border: "1px dashed #cbd5e1", borderRadius: 999,
                              padding: "1px 8px", fontSize: 10, color: "#64748b", cursor: "pointer", fontWeight: 700 }}>
                            {(c.groups || []).length ? t(L.edit) : t(L.addGroup)}
                          </button>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleRemoveContact(c.email)}
                      style={{ border: "none", background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 800, fontSize: 12 }}
                      title={t(L.del)}>{t(L.del)}</button>
                  </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div style={{ ...styles.meta, marginTop: 8 }}>{t(L.noContacts)}</div>
          )}
        </div>

        {/* === Signature === */}
        <div style={{ ...styles.section, ...tab("signature"), marginTop: 0 }}>
          <div style={styles.sectionH}>✍️ {t(L.signatureH)}</div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.name)}</label>
              <input style={styles.input} value={s.signatureName}
                onChange={(e) => set("signatureName", e.target.value)}
                placeholder="Mohammad Abdullah" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.jobTitle)}</label>
              <input style={styles.input} value={s.signatureTitle}
                onChange={(e) => set("signatureTitle", e.target.value)}
                placeholder="QA Manager" />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.company)}</label>
            <input style={styles.input} value={s.signatureCompany}
              onChange={(e) => set("signatureCompany", e.target.value)} />
          </div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.phone)}</label>
              <input style={styles.input} value={s.signaturePhone} dir="ltr"
                onChange={(e) => set("signaturePhone", e.target.value)}
                placeholder="+971 ..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t(L.email)}</label>
              <input style={styles.input} value={s.signatureEmail} dir="ltr"
                onChange={(e) => set("signatureEmail", e.target.value)}
                placeholder="m.abdullah@almawashi.ae" />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{t(L.sigImage)}</label>
            <div style={styles.imgBox}>
              {s.signatureImageUrl ? (
                <>
                  <img src={s.signatureImageUrl} alt="signature" style={styles.img} />
                  <button onClick={() => set("signatureImageUrl", "")} style={styles.btnDanger}>{t(L.remove)}</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{t(L.noImage)}</span>
              )}
              <label style={{ ...styles.btnGhost, fontSize: 12, padding: "6px 12px", cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? t(L.uploading) : t(L.upload)}
                <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
              </label>
            </div>
          </div>

          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "#2563eb", fontWeight: 700 }}>
              {t(L.advancedHtml)}
            </summary>
            <div style={styles.field}>
              <textarea style={styles.textarea} value={s.signatureCustomHtml}
                onChange={(e) => set("signatureCustomHtml", e.target.value)}
                placeholder="<div>...your custom HTML...</div>" />
            </div>
          </details>

          {/* Signature preview */}
          <div style={styles.preview}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{t(L.preview)}</div>
            <div dir="ltr" style={{ textAlign: "start" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(buildSignatureHtml(s) || `<em style='color:#94a3b8'>${t(L.noSignature)}</em>`) }} />
          </div>
        </div>

        {/* === Behaviour === */}
        <div style={{ ...styles.section, ...tab("general") }}>
          <div style={styles.sectionH}>⚙️ {t(L.behaviour)}</div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.defPriority)}</label>
            <select style={styles.input} value={s.priority}
              onChange={(e) => set("priority", e.target.value)}>
              {PRIORITY_VALUES.map((v) => (
                <option key={v} value={v}>{priorityLabel(v, isAr)}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>🔒 {t(L.defClass)}</label>
            <select style={styles.input} value={s.defaultClassification || "internal"}
              onChange={(e) => set("defaultClassification", e.target.value)}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{isAr ? c.labelAr || c.label : c.label}</option>
              ))}
            </select>
            <div style={styles.meta}>{t(L.defClassHint)}</div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.defMethod)}</label>
            <select style={styles.input} value={s.defaultMethod || "outlook"}
              onChange={(e) => set("defaultMethod", e.target.value)}>
              <option value="outlook">{t(L.mOutlook)}</option>
              <option value="server">{t(L.mServer)}</option>
              <option value="whatsapp">{t(L.mWhatsapp)}</option>
              <option value="copy">{t(L.mCopy)}</option>
            </select>
          </div>
          <label style={styles.check}>
            <input type="checkbox" checked={s.requestReadReceipt}
              onChange={(e) => set("requestReadReceipt", e.target.checked)} />
            {t(L.readReceipt)}
          </label>
        </div>

        {/* === Distribution groups === */}
        <div style={{ ...styles.section, ...tab("contacts") }}>
          <div style={styles.sectionH}>📁 {t(L.groupsH)} ({allGroups.length})</div>
          <div style={styles.meta}>{t(L.groupsHint)}</div>
          {allGroups.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {allGroups.map((g) => {
                const members = expandGroup(g, contacts);
                return (
                  <div key={g} style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                        📁 {g} <span style={{ color: "#64748b", fontWeight: 600 }}>({members.length})</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" style={styles.btnLink}
                          onClick={() => handleRenameGroup(g)}>{t(L.rename)}</button>
                        <button type="button" style={{ ...styles.btnDanger, padding: "4px 10px", fontSize: 11 }}
                          onClick={() => handleDeleteGroup(g)}>{t(L.del)}</button>
                      </div>
                    </div>
                    <div dir="ltr" style={{ color: "#64748b", fontSize: 11, marginTop: 3, wordBreak: "break-all", textAlign: "start" }}>
                      {members.join(", ") || t(L.noMembers)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...styles.meta, marginTop: 8, padding: 12, background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
              {t(L.noGroups)}
            </div>
          )}
        </div>

        {/* === Templates === */}
        <div style={{ ...styles.section, ...tab("templates"), marginTop: 0 }}>
          {/* Group vs template — the question everyone asks once. */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16,
          }}>
            <div style={{ padding: "10px 12px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 12, color: "#92400e" }}>{t(L.groupCardT)}</div>
              <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 4, lineHeight: 1.6 }}>
                {t(L.groupCardB)}
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 12, color: "#1e40af" }}>{t(L.tplCardT)}</div>
              <div style={{ fontSize: 11.5, color: "#1e40af", marginTop: 4, lineHeight: 1.6 }}>
                {t(L.tplCardB)}
              </div>
            </div>
          </div>

          <div style={styles.sectionH}>📝 {t(L.templatesH)} ({templates.length})</div>
          <div style={styles.meta}>{t(L.templatesHint)}</div>
          <button type="button" style={{ ...styles.btnPrimary, marginTop: 8, padding: "8px 16px", fontSize: 13 }}
            onClick={() => { setEditorTemplate(null); setEditorOpen(true); }}>
            {t(L.newTemplate)}
          </button>
          {templates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: "min(44vh, 440px)", overflowY: "auto" }}>
              {templates.map((tpl) => {
                const { to, cc } = expandTpl(tpl);
                return (
                  <div key={tpl.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                        {tpl.icon} {tpl.name}
                        {!tpl.serverId && (
                          <span style={{ marginInlineStart: 6, fontSize: 10, color: "#b45309", fontWeight: 700 }}>
                            {t(L.localOnly)}
                          </span>
                        )}
                      </div>
                      {tpl.subject && (
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>✉️ {tpl.subject}</div>
                      )}
                      {tpl.intro && (
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ✍️ {tpl.intro.split("\n").filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                        {isAr ? "إلى" : "To"}: {to.length} · {isAr ? "نسخة" : "CC"}: {cc.length}
                        {tpl.toGroups?.length ? ` · 📁 ${tpl.toGroups.join(", ")}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button type="button" style={styles.btnLink} title={t(L.edit)}
                        onClick={() => { setEditorTemplate(tpl); setEditorOpen(true); }}>✏️</button>
                      <button type="button" style={styles.btnLink} title={t(L.duplicate)}
                        onClick={() => handleDuplicateTemplate(tpl)}>⧉</button>
                      <button type="button" style={{ ...styles.btnDanger, padding: "4px 10px", fontSize: 11 }}
                        onClick={() => handleDeleteTemplate(tpl)}>{t(L.del)}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...styles.meta, marginTop: 8, padding: "12px", background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
              {t(L.noTemplates)}
            </div>
          )}
        </div>

        {/* === Auto-routing === */}
        <div style={{ ...styles.section, ...tab("templates") }}>
          <div style={styles.sectionH}>🎯 {t(L.routingH)}</div>
          <div style={styles.meta}>{t(L.routingHint)}</div>
          {templates.length === 0 && allGroups.length === 0 && (
            <div style={{ ...styles.meta, color: "#b45309", marginTop: 6 }}>{t(L.routingEmpty)}</div>
          )}
          {ROUTABLE_REPORTS.map((rt) => {
            const cfg = s.autoRouting?.[rt.id] || {};
            const sel = (key) => (Array.isArray(cfg[key]) ? cfg[key] : []);
            const patchRoute = (patch) =>
              set("autoRouting", { ...(s.autoRouting || {}), [rt.id]: { ...cfg, ...patch } });
            const toggleRoute = (key, g) => {
              const cur = sel(key);
              patchRoute({
                [key]: cur.some((x) => x.toLowerCase() === g.toLowerCase())
                  ? cur.filter((x) => x.toLowerCase() !== g.toLowerCase())
                  : [...cur, g],
              });
            };
            const chosen = templates.find((x) => x.id === cfg.templateId) || null;
            /* Exactly what the send modal will do with this route — same
               resolver, so the preview can't lie. */
            const { to: preview, cc: previewCc } =
              resolveAutoRoute(getAutoRoute(rt.id, s), contacts, templates) || { to: [], cc: [] };
            return (
              <div key={rt.id} style={{ marginTop: 10, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{rt.icon} {t(rt.label)}</div>

                {/* Template picker — the quickest way to route */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    {t(L.useTemplate)}
                  </div>
                  <select
                    style={{ ...styles.input, maxWidth: 420 }}
                    value={cfg.templateId || ""}
                    onChange={(e) => patchRoute({ templateId: e.target.value })}
                  >
                    <option value="">{t(L.noneGroupsOnly)}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.icon} {tpl.name}</option>
                    ))}
                  </select>
                  {chosen && (
                    <div style={{ ...styles.meta, color: "#166534" }}>{t(L.tplBrings)}</div>
                  )}
                  {!templates.length && (
                    <div style={{ ...styles.meta, color: "#b45309" }}>{t(L.noTemplatesYet)}</div>
                  )}
                </div>

                {/* Extra groups, on top of the template */}
                {allGroups.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                      {chosen ? t(L.extraGroups) : t(L.groupsLabel)}
                    </div>
                    {["toGroups", "ccGroups"].map((key) => (
                      <div key={key} style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                          {key === "toGroups" ? (isAr ? "إلى:" : "To:") : (isAr ? "نسخة:" : "CC:")}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {allGroups.map((g) => {
                            const active = sel(key).some((x) => x.toLowerCase() === g.toLowerCase());
                            return (
                              <button key={g} type="button" onClick={() => toggleRoute(key, g)}
                                style={{
                                  padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                                  border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                                  background: active ? "#dbeafe" : "#fff",
                                  color: active ? "#1e40af" : "#475569",
                                  fontWeight: 700, fontSize: 11, fontFamily: "inherit",
                                }}>
                                {active ? "✓ " : ""}{g} <span style={{ opacity: .65 }}>({expandGroup(g, contacts).length})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live result */}
                {(preview.length > 0 || previewCc.length > 0) && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>
                      {t(L.opensWith)} — {isAr ? "إلى" : "To"}: {preview.length} · {isAr ? "نسخة" : "CC"}: {previewCc.length}
                    </div>
                    <div dir="ltr" style={{ fontSize: 10.5, color: "#166534", marginTop: 3, wordBreak: "break-all", textAlign: "start" }}>
                      {preview.join(", ") || "—"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* The old "Recent Recipients" tab was a browser-only list. Addresses
            you send to are now saved straight into 📇 Contacts on the server,
            so they're searchable and shared instead of stuck on one machine. */}

        </div>{/* /panel */}
      </div>{/* /body */}

      <div style={styles.footer}>
        {saveErr && (
          <div style={{ width: "100%", padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5",
            color: "#991b1b", borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            {saveErr}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleReset} disabled={syncing} style={styles.btnDanger} data-delete-action="true">{t(L.resetSettings)}</button>
          {!embedded && (
            <button type="button"
              onClick={() => { if (guardClose()) window.location.href = "/email-center"; }}
              style={{ ...styles.btnGhost, color: "#7c3aed", borderColor: "#c4b5fd", padding: "8px 14px", fontSize: 12 }}>
              {t(L.emailCenter)}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {syncing && (
            <span style={{ color: "#1d4ed8", fontWeight: 800, fontSize: 12.5 }}>{t(L.saving)}</span>
          )}
          {savedFlash && !syncing && (
            <span style={{ color: "#16a34a", fontWeight: 800, fontSize: 13 }}>{t(L.saved)}</span>
          )}
          {dirty && !savedFlash && !syncing && (
            <span style={{ color: "#b45309", fontWeight: 800, fontSize: 12.5 }}>{t(L.unsaved)}</span>
          )}
          {!embedded && <button onClick={() => guardClose()} style={styles.btnGhost}>{t(L.cancel)}</button>}
          <button onClick={handleSave} disabled={syncing}
            style={{ ...styles.btnPrimary, ...(syncing ? { opacity: .6, cursor: "wait" } : {}),
              ...(dirty && !syncing ? { boxShadow: "0 0 0 3px rgba(22,163,74,.25)" } : {}) }}>
            {t(L.saveSettings)}
          </button>
        </div>
      </div>
    </>
  );

  const editor = (
    <EmailTemplateEditor
      open={editorOpen}
      template={editorTemplate}
      contacts={contacts}
      onClose={() => setEditorOpen(false)}
      onSaved={() => reloadTemplates()}
    />
  );

  if (embedded) {
    return <div dir={dir} style={styles.embeddedWrap}>{content}{editor}</div>;
  }
  return (
    <>
      <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && guardClose()}>
        <div dir={dir} style={styles.modal}>{content}</div>
      </div>
      {editor}
    </>
  );
}
