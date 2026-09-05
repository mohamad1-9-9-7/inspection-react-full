// EmailSendModal.jsx
// Generic, report-agnostic email composer.
// Each parent provides callbacks for PDF generation, HTML body, etc.
// Methods: Outlook (.eml auto-attach), WhatsApp Web, Copy to clipboard.

import React, { useEffect, useMemo, useState } from "react";
import {
  buildEml,
  downloadBlobLocally,
  fetchAsBase64,
  fetchImagesAsAttachments,
  uploadPdfBlob,
  validEmails,
} from "./emailReportUtils";
import {
  loadEmailSettings,
  fetchEmailSettings,
  buildSignatureHtml,
  buildSignatureText,
  rememberRecipients,
  listEmailContacts,
  CLASSIFICATIONS,
  getClassification,
  PRIORITY_VALUES,
  priorityLabel,
  RECIPIENT_ROLES,
  getRole,
  roleLabel,
  loadTemplates,
  listEmailTemplates,
  saveTemplateRemote,
  expandTemplateRecipients,
  getAutoRoute,
  resolveAutoRoute,
  TEMPLATE_VARS,
  buildTemplateVars,
  applyTemplateVars,
} from "./emailReportSettings";
import EmailSettingsPanel from "./EmailSettingsPanel";
import ContactPicker from "./ContactPicker";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

/* EN/AR strings — `t()` resolves {en,ar} objects inline. {x}/{n} are filled
   after translation so the numbers land in the right place in both languages. */
const L = {
  /* Header */
  sendTitle:    { en: "📨 Send {x}",         ar: "📨 إرسال {x}" },
  reportWord:   { en: "Report",              ar: "التقرير" },
  headerSub:    { en: "Choose a send method. The PDF is generated automatically.",
                  ar: "اختر طريقة الإرسال. يتم إنشاء ملف PDF تلقائياً." },
  settingsBtn:  { en: "⚙️ Settings",         ar: "⚙️ الإعدادات" },
  settingsTip:  { en: "Email Settings (defaults, signature, priority...)",
                  ar: "إعدادات البريد (الافتراضيات، التوقيع، الأولوية...)" },
  close:        { en: "Close",               ar: "إغلاق" },

  /* Tabs */
  tabSend:        { en: "Send",        ar: "إرسال" },
  tabOptions:     { en: "Options",     ar: "خيارات" },
  tabAttachments: { en: "Attachments", ar: "المرفقات" },
  tabContent:     { en: "Content",     ar: "المحتوى" },

  /* Send tab */
  status:       { en: "Status:",             ar: "الحالة:" },
  quickActions: { en: "⚡ Quick Actions",     ar: "⚡ إجراءات سريعة" },
  applyTpl:     { en: "Apply template: {x}", ar: "تطبيق القالب: {x}" },
  moreInSettings:{ en: "+{n} more in ⚙️ Settings", ar: "+{n} أخرى في ⚙️ الإعدادات" },
  sendVia:      { en: "Send via:",           ar: "الإرسال عبر:" },
  serverFrom:   { en: "📤 Sent directly from",  ar: "📤 يُرسل مباشرة من" },
  serverReplies:{ en: "— replies come back to the same address.",
                  ar: "— الردود تصل إلى نفس العنوان." },
  serverOff:    { en: "⚠️ Direct sending is not enabled on the server yet (SMTP not configured).",
                  ar: "⚠️ الإرسال المباشر غير مفعّل على الخادم بعد (SMTP غير مهيأ)." },
  toLbl:        { en: "To *",                ar: "إلى *" },
  ccLbl:        { en: "CC",                  ar: "نسخة" },
  bccLbl:       { en: "BCC",                 ar: "نسخة مخفية" },
  noContacts:   { en: "⚠️ No saved emails. Add them from ⚙️ Settings → Email Contacts.",
                  ar: "⚠️ لا توجد إيميلات محفوظة. أضفها من ⚙️ الإعدادات ← جهات اتصال البريد." },
  subject:      { en: "Subject",             ar: "الموضوع" },

  /* Options tab */
  schedule:     { en: "📅 Schedule reminder", ar: "📅 تذكير بموعد الإرسال" },
  priority:     { en: "Priority",            ar: "الأولوية" },
  classification:{ en: "🔒 Classification",  ar: "🔒 التصنيف" },
  roles:        { en: "🎯 Recipient Roles",  ar: "🎯 أدوار المستلمين" },
  rolesCount:   { en: "({n} assigned)",      ar: "({n} محدد)" },
  rolesHint:    { en: "Click the role next to each recipient to cycle through roles.",
                  ar: "اضغط على الدور بجانب كل مستلم للتنقل بين الأدوار." },

  /* Attachments tab */
  pdfOnly:      { en: "📄 The PDF is always attached automatically — no extra images for this report.",
                  ar: "📄 ملف PDF يُرفق تلقائياً دائماً — لا توجد صور إضافية لهذا التقرير." },
  attachments:  { en: "📎 Attachments",      ar: "📎 المرفقات" },
  attachCount:  { en: "({sel} / {all} selected · 1 PDF auto + {sel} photos)",
                  ar: "({sel} / {all} محدد · PDF تلقائي + {sel} صور)" },
  attachHint:   { en: "The report PDF is always attached. Choose which images to include (default: all).",
                  ar: "ملف PDF للتقرير مرفق دائماً. اختر الصور التي تريد تضمينها (الافتراضي: الكل)." },
  selectAll:    { en: "☑ Select All",        ar: "☑ تحديد الكل" },
  deselectAll:  { en: "☐ Deselect All",      ar: "☐ إلغاء تحديد الكل" },

  /* Content tab */
  includeTable: { en: "📊 Include the full data table in the message body",
                  ar: "📊 تضمين جدول البيانات الكامل في متن الرسالة" },
  tableOn:      { en: "On — table shows in the email", ar: "مفعّل — الجدول يظهر في الرسالة" },
  tableOff:     { en: "Off — PDF attachment only",     ar: "معطّل — مرفق PDF فقط" },
  orderItems:   { en: "🗂️ Order items in the report",  ar: "🗂️ ترتيب العناصر في التقرير" },
  orderScope:   { en: "(applies to the PDF and the in-email table)",
                  ar: "(يُطبَّق على ملف PDF وجدول الرسالة)" },
  sortBy:       { en: "↕️ Sort by",           ar: "↕️ الترتيب حسب" },
  groupBy:      { en: "📂 Group by",         ar: "📂 التجميع حسب" },
  origOrder:    { en: "— Original order —",  ar: "— الترتيب الأصلي —" },
  noGrouping:   { en: "— No grouping —",     ar: "— بدون تجميع —" },
  optBranch:    { en: "🏪 Branch / POS",     ar: "🏪 الفرع / نقطة البيع" },
  optAction:    { en: "🎯 Action",           ar: "🎯 الإجراء" },
  optOrigin:    { en: "🌍 Origin",           ar: "🌍 المنشأ" },
  optProduct:   { en: "📦 Product name",     ar: "📦 اسم المنتج" },
  optExpiry:    { en: "📅 Expiry date",      ar: "📅 تاريخ الانتهاء" },
  orderApplied: { en: "✓ Applied to items before the file is generated.",
                  ar: "✓ يُطبَّق على العناصر قبل إنشاء الملف." },
  introLbl:     { en: "✍️ Opening text (greeting)", ar: "✍️ النص الافتتاحي (التحية)" },
  introHint:    { en: "Shown at the top of the email, above the table. {date} and the other variables fill themselves in.",
                  ar: "يظهر أعلى الرسالة فوق الجدول. {date} وبقية المتغيّرات تتعبّأ تلقائياً." },
  introVars:    { en: "Insert:",              ar: "إدراج:" },
  introPreview: { en: "Will be sent as:",     ar: "سيُرسل هكذا:" },
  introReset:   { en: "↺ Restore default",    ar: "↺ استعادة الافتراضي" },
  noteLbl:      { en: "Additional note (optional)", ar: "ملاحظة إضافية (اختياري)" },
  notePh:       { en: "Extra notes added to the message body...",
                  ar: "ملاحظات إضافية تُضاف لمتن الرسالة..." },

  /* Save as template */
  saveTplHint:  { en: "💾 Save this setup as a template to reuse later in one click",
                  ar: "💾 احفظ هذا الإعداد كقالب لإعادة استخدامه لاحقاً بضغطة واحدة" },
  saveTplPh:    { en: "Template name (e.g. Daily report for managers)",
                  ar: "اسم القالب (مثال: التقرير اليومي للمدراء)" },
  save:         { en: "Save",                ar: "حفظ" },
  cancel:       { en: "Cancel",              ar: "إلغاء" },
  saveAsTpl:    { en: "💾 Save as template", ar: "💾 حفظ كقالب" },

  /* Buttons + runtime messages */
  working:      { en: "⏳ Working...",       ar: "⏳ جارٍ العمل..." },
  btnOutlook:   { en: "📧 Open in Outlook",  ar: "📧 فتح في Outlook" },
  btnServer:    { en: "📤 Send Now",         ar: "📤 إرسال الآن" },
  btnWhatsapp:  { en: "💬 Open WhatsApp",    ar: "💬 فتح واتساب" },
  btnCopy:      { en: "📋 Copy to Clipboard", ar: "📋 نسخ للحافظة" },
  btnSend:      { en: "Send",                ar: "إرسال" },

  tplApplied:   { en: "✓ Applied template: {x}", ar: "✓ تم تطبيق القالب: {x}" },
  routeApplied: { en: "🎯 Auto-routing applied: {x}", ar: "🎯 تم تطبيق التوجيه التلقائي: {x}" },
  tplSaved:     { en: "💾 Template saved: {x}",  ar: "💾 تم حفظ القالب: {x}" },
  tplSaveFail:  { en: "Failed to save template: {x}", ar: "فشل حفظ القالب: {x}" },
  untitled:     { en: "Untitled",            ar: "بدون عنوان" },

  errNoTo:      { en: "Please enter at least one valid email in the To field.",
                  ar: "الرجاء إدخال إيميل صحيح واحد على الأقل في حقل «إلى»." },
  errBadCc:     { en: "There is an invalid email in the CC field.",
                  ar: "يوجد إيميل غير صحيح في حقل «نسخة»." },
  errNoSubject: { en: "Subject is empty.",   ar: "الموضوع فارغ." },
  errFailed:    { en: "Failed: {x}",         ar: "فشل: {x}" },
  errNoPdf:     { en: "Could not build the PDF for this report. Reopen the report and try again.",
                  ar: "تعذّر إنشاء ملف PDF لهذا التقرير. أعد فتح التقرير ثم حاول مجدداً." },

  progPdf:      { en: "⏳ Generating PDF...", ar: "⏳ جارٍ إنشاء ملف PDF..." },
  progImg:      { en: "🖼️ Fetching image {n} / {total}...", ar: "🖼️ جلب الصورة {n} / {total}..." },
  progCert:     { en: "📄 Fetching certificate...", ar: "📄 جلب الشهادة..." },
  progBuild:    { en: "📩 Building email package...", ar: "📩 تجهيز حزمة الرسالة..." },
  progEml:      { en: "📧 Downloading .eml...", ar: "📧 تنزيل ملف .eml..." },
  progSend:     { en: "📤 Sending...",       ar: "📤 جارٍ الإرسال..." },
  progUpload:   { en: "☁️ Uploading PDF (Cloudinary)...", ar: "☁️ رفع ملف PDF (Cloudinary)..." },
  progWa:       { en: "💬 Opening WhatsApp...", ar: "💬 فتح واتساب..." },
  progCopy:     { en: "📋 Copying to clipboard...", ar: "📋 النسخ للحافظة..." },

  emlDone:      { en: "📧 {file} downloaded. Click it (from the download bar) → Outlook opens with {n} attachment(s).",
                  ar: "📧 تم تنزيل {file}. اضغط عليه (من شريط التنزيلات) ← يفتح Outlook مع {n} مرفقات." },
  emlDelay:     { en: " ⏰ Don't forget Delay Delivery!", ar: " ⏰ لا تنسَ تأجيل التسليم!" },
  sentOk:       { en: "✅ Sent from {from} to {n} recipient(s), {a} attachment(s).",
                  ar: "✅ تم الإرسال من {from} إلى {n} مستلم، مع {a} مرفقات." },
  sentRejected: { en: " ⚠️ {n} address(es) rejected: {list}",
                  ar: " ⚠️ تم رفض {n} عنوان: {list}" },
  theServer:    { en: "the server",          ar: "الخادم" },
  waOpened:     { en: "💬 WhatsApp Web opened — pick a recipient and send.",
                  ar: "💬 تم فتح واتساب ويب — اختر مستلماً وأرسل." },
  copied:       { en: "📋 Copied — paste it (Ctrl+V) anywhere.",
                  ar: "📋 تم النسخ — الصقه (Ctrl+V) في أي مكان." },
  copyFailed:   { en: "Copy failed. The browser is blocking clipboard access.",
                  ar: "فشل النسخ. المتصفح يمنع الوصول للحافظة." },

  /* Server-side error codes */
  errNotConfigured: { en: "Direct sending is not enabled on the server (SMTP not configured).",
                      ar: "الإرسال المباشر غير مفعّل على الخادم (SMTP غير مهيأ)." },
  errRateLimited:   { en: "Rate limit exceeded — wait a minute and try again.",
                      ar: "تم تجاوز حد الإرسال — انتظر دقيقة وحاول مجدداً." },
  errTooLarge:      { en: "Attachments too large (12 MB max). Reduce the number of images in the 📎 Attachments tab.",
                      ar: "المرفقات كبيرة جداً (12 ميغابايت كحد أقصى). قلّل عدد الصور من تبويب 📎 المرفقات." },
  errNoRecipients:  { en: "No recipients.",  ar: "لا يوجد مستلمون." },
  errInvalidEmail:  { en: "Invalid email: {x}", ar: "إيميل غير صحيح: {x}" },
  errSmtp:          { en: "Mail server failed to send: {x}", ar: "فشل خادم البريد في الإرسال: {x}" },
  errSendStatus:    { en: "Send failed ({x})", ar: "فشل الإرسال ({x})" },

  /* Email body banners (sent content — follow the UI language) */
  doNotForward: { en: " · DO NOT FORWARD",   ar: " · ممنوع إعادة التوجيه" },
  scheduledTo:  { en: "Scheduled to send:",  ar: "مجدولة للإرسال:" },
  outlookHint:  { en: "In Outlook: <i>Options → Delay Delivery → Do not deliver before</i>.",
                  ar: "في Outlook: <i>خيارات ← تأجيل التسليم ← عدم التسليم قبل</i>." },
  rolesAssigned:{ en: "🎯 Roles assigned",   ar: "🎯 الأدوار المحددة" },
  scheduledTxt: { en: "📅 Scheduled: {x}",   ar: "📅 مجدولة: {x}" },
  txtSubject:   { en: "Subject",             ar: "الموضوع" },
  txtTo:        { en: "To",                  ar: "إلى" },
  txtCc:        { en: "Cc",                  ar: "نسخة" },
  txtBcc:       { en: "Bcc",                 ar: "نسخة مخفية" },
};

const splitToArr = (s) =>
  String(s || "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

/* No browser-only "last used" state here on purpose: To/CC come from the shared
   defaults + auto-routing, and the default send method is a shared setting.
   Everything the modal remembers lives on the server. */

/* Direct server-side SMTP send. Only offered when the parent opts in via
   config.allowServerSend AND the server reports SMTP credentials present. */
const SERVER_METHOD = {
  id: "server", icon: "📤",
  label: { en: "Send Now", ar: "إرسال الآن" },
  desc:  { en: "Sent directly from the server", ar: "يُرسل مباشرة من الخادم" },
};

const SEND_METHODS = [
  { id: "outlook",  icon: "📧",
    label: { en: "Outlook",  ar: "Outlook" },
    desc:  { en: "PDF + images auto-attached", ar: "إرفاق PDF والصور تلقائياً" } },
  { id: "whatsapp", icon: "💬",
    label: { en: "WhatsApp", ar: "واتساب" },
    desc:  { en: "Share via WhatsApp Web", ar: "المشاركة عبر واتساب ويب" } },
  { id: "copy",     icon: "📋",
    label: { en: "Copy",     ar: "نسخ" },
    desc:  { en: "Copy text + PDF link", ar: "نسخ النص + رابط PDF" } },
];

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 10,
  },
  modal: {
    width: "min(1060px, 98vw)", height: "min(92vh, 880px)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    background: "#fff", borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.28)",
    color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  /* ── Tabbed chrome (matches EmailSettingsPanel) ── */
  header: {
    flexShrink: 0, padding: "14px 20px", color: "#fff",
    background: "linear-gradient(120deg,#0ea5e9 0%,#2563eb 55%,#4338ca 100%)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.2 },
  headerSub: { marginTop: 3, fontSize: 12, opacity: 0.85, fontWeight: 500 },
  xBtn: {
    width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.35)",
    background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 17, fontWeight: 800,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bodyWrap: { flex: 1, display: "flex", minHeight: 0 },
  nav: {
    flexShrink: 0, width: 200, background: "#f8fafc", borderInlineEnd: "1px solid #e8edf3",
    padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4,
  },
  panel: { flex: 1, overflowY: "auto", padding: "16px 22px", minWidth: 0 },
  footer: {
    flexShrink: 0, padding: "10px 20px 14px", borderTop: "1px solid #e8edf3",
    background: "#fff", display: "flex", flexDirection: "column", gap: 4,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub:   { marginTop: 4, fontSize: 13, color: "#475569" },
  field: { marginTop: 14 },
  label: { display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, minHeight: 80, resize: "vertical",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  summary: {
    marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 10, fontSize: 13, lineHeight: 1.55,
  },
  row:   { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  chipOk:   { background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipWarn: { background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipBad:  { background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  err:      { marginTop: 10, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 700 },
  info:     { marginTop: 10, padding: "10px 12px", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e3a8a", borderRadius: 10, fontSize: 13, fontWeight: 700 },
  actions:  { marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  btnPrimary: {
    padding: "11px 18px", background: "#2563eb", color: "#fff", border: "none",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14, minWidth: 200,
  },
  btnGhost: {
    padding: "11px 18px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 6 },
  methodGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: 8, marginTop: 6,
  },
};

function methodCard(active) {
  return {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "12px 10px", borderRadius: 12,
    border: active ? "2px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: active ? "0 2px 8px rgba(37,99,235,.18)" : "none",
    transition: "all .12s",
  };
}

function chipForStatus(kind) {
  if (kind === "ok") return styles.chipOk;
  if (kind === "warn") return styles.chipWarn;
  if (kind === "bad") return styles.chipBad;
  return null;
}

function navBtnStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 9, width: "100%",
    padding: "10px 11px", borderRadius: 10, cursor: "pointer", textAlign: "start",
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

/**
 * Props:
 *   open, onClose
 *   payload: any object (report data)
 *   config: {
 *     reportTitle: string,                                    // e.g., "Returns Report"
 *     getSubject(payload) -> string,                          // default subject
 *     generatePdf(payload) -> Promise<{blob, base64?, filename}>,
 *     buildHtml(payload, { note, pdfUrl, attachmentsCount }) -> string,
 *     buildText(payload, { note, pdfUrl }) -> string,
 *     getImages(payload) -> string[],                         // image URLs to attach
 *     getCertificate(payload) -> {url, name} | null,          // optional single doc
 *     getSummary(payload) -> { status?, statusKind?, fields: [{label,value}] }
 *   }
 */
export default function EmailSendModal({ open, onClose, payload, config }) {
  const { t, dir, isAr } = useSettingsLang();
  /* Fill {placeholders} after translation: tx(L.key, {x: "…"}). */
  const tx = (key, vars) =>
    Object.entries(vars || {}).reduce((s2, [k, v]) => s2.split(`{${k}}`).join(v), t(key));

  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState("");
  /* Greeting above the table. Holds the raw text WITH {placeholders} — they are
     resolved only when the message is built, so the same text works every day. */
  const [intro, setIntro] = useState("");
  const [note, setNote] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [priority, setPriority] = useState("normal");
  /* On by default — recipients should see the data in the message itself, not
     only in the attachment. A saved template can still turn it off (the
     template loader below overwrites this when it carries an explicit value). */
  const [includeTable, setIncludeTable] = useState(true);
  const [sortBy, setSortBy] = useState("default");   // default | branch | action | origin | product | expiry
  const [groupBy, setGroupBy] = useState("none");    // none | branch | action | origin
  const [method, setMethod] = useState("outlook");

  /* New: classification, recipient roles, templates, attachment manager */
  const [classification, setClassification] = useState("internal");
  const [recipientRoles, setRecipientRoles] = useState({});  // { [email.toLowerCase()]: "approver"|"reviewer"|"fyi"|"action" }
  const [showRoles, setShowRoles] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [imageSelection, setImageSelection] = useState({});  // { [url]: boolean } default true
  const [showAttachments, setShowAttachments] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [progress, setProgress] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(() => loadEmailSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  /* null = not checked yet, {configured, from, ...} once /api/email/status replies */
  const [serverMail, setServerMail] = useState(null);
  const [activeTab, setActiveTab] = useState("send");

  const refreshContacts = React.useCallback(async () => {
    const list = await listEmailContacts();
    setContacts(list);
    return list;
  }, []);

  useEffect(() => {
    if (!open) return;
    const s = loadEmailSettings();
    setSettings(s);
    /* Show the cached list instantly; the server refresh happens below, next to
       auto-routing, which needs the fresh templates anyway. */
    setTemplates(loadTemplates());

    /* Pre-fill from the shared defaults; auto-routing merges into these below. */
    setTo(splitToArr(s.defaultTo));
    setCc(splitToArr(s.defaultCc));
    setBcc(splitToArr(s.defaultBcc));

    setPriority(s.priority || "normal");
    setClassification(s.defaultClassification || "internal");
    setRecipientRoles({});
    setShowRoles(false);
    setShowAttachments(false);
    setShowSaveTemplate(false);
    setTemplateName("");
    setImageSelection({});
    setScheduleAt("");
    /* Default ON — the data table belongs in the message body, not only in the
       attachment. Loading a saved template that carries an explicit value
       still overrides this. */
    setIncludeTable(true);
    setSortBy("default");
    setGroupBy("none");
    /* Default send method is a shared setting, not a per-browser memory. */
    const pool = config?.allowServerSend ? [SERVER_METHOD, ...SEND_METHODS] : SEND_METHODS;
    const wanted = s.defaultMethod || "outlook";
    setMethod(pool.some((m) => m.id === wanted) ? wanted : "outlook");

    /* Ask the server whether direct SMTP sending is available. */
    setServerMail(null);
    if (config?.allowServerSend) {
      (async () => {
        try {
          const { default: API_BASE } = await import("../../config/api");
          const r = await fetch(`${API_BASE}/api/email/status`);
          const j = await r.json();
          setServerMail(j || { configured: false });
        } catch {
          setServerMail({ configured: false });
        }
      })();
    }
    setNote("");
    /* Start from the report's own greeting so the user sees (and can edit) it,
       placeholders included. A template applied later overrides it. */
    setIntro(config?.getDefaultIntro?.(payload) || "");
    setError("");
    setInfo("");
    setProgress("");
    setActiveTab("send");
    const baseSubject = config?.getSubject?.(payload) || "";
    const prefix = (s.subjectPrefix || "").trim();
    setSubject(prefix && !baseSubject.startsWith(prefix) ? `${prefix} ${baseSubject}` : baseSubject);

    /* Async: take the shared settings + contacts + templates from the server,
       then apply auto-routing. The sync values above were only the cache. */
    (async () => {
      const [fresh, list, tpls] = await Promise.all([
        fetchEmailSettings(),
        refreshContacts(),
        listEmailTemplates().catch(() => loadTemplates()),
      ]);
      setSettings(fresh);
      setTemplates(tpls);
      const route = getAutoRoute(config?.reportType, fresh);
      const resolved = resolveAutoRoute(route, list, tpls);
      if (resolved) {
        const { to: routeTo, cc: routeCc, template } = resolved;
        if (routeTo.length) setTo((prev) => mergeUniqueCI(prev, routeTo));
        if (routeCc.length) setCc((prev) => mergeUniqueCI(prev, routeCc));
        /* A routed template also carries its subject / intro / note / flags. */
        if (template) {
          applyTemplateFields(template, prefix);
          setInfo(tx(L.routeApplied, { x: `${template.icon || "📧"} ${template.name}` }));
          setTimeout(() => setInfo(""), 3000);
        }
      }
      /* Initialize attachment selection — all images selected by default */
      const images = (config?.getImages?.(payload) || []).filter(Boolean);
      const init = {};
      for (const u of images) init[u] = true;
      setImageSelection(init);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Helper: merge two arrays of emails case-insensitively */
  function mergeUniqueCI(base, additions) {
    const seen = new Set(base.map((x) => String(x).toLowerCase()));
    const out = [...base];
    for (const a of additions) {
      const k = String(a).toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(a); }
    }
    return out;
  }

  /* Push a template's non-recipient fields into modal state. Shared by the
     Quick-Action buttons and by auto-routing so the two can't drift apart —
     the subject prefix used to be applied by only one of them. */
  function applyTemplateFields(tpl, prefix = "") {
    if (!tpl) return;
    if (tpl.subject) {
      const p = String(prefix || "").trim();
      setSubject(p && !tpl.subject.startsWith(p) ? `${p} ${tpl.subject}` : tpl.subject);
    }
    if (tpl.intro) setIntro(tpl.intro);
    if (tpl.note) setNote(tpl.note);
    if (tpl.priority) setPriority(tpl.priority);
    if (tpl.classification) setClassification(tpl.classification);
    if (typeof tpl.includeTable === "boolean") setIncludeTable(tpl.includeTable);
    if (tpl.sortBy)  setSortBy(tpl.sortBy);
    if (tpl.groupBy) setGroupBy(tpl.groupBy);
  }

  /* Apply a template from a Quick-Action button: recipients are REPLACED here
     (an explicit click), unlike auto-routing which merges into the defaults. */
  function applyTemplate(tpl) {
    if (!tpl) return;
    const expanded = expandTemplateRecipients(tpl, contacts);
    if (expanded.to.length) setTo(expanded.to);
    if (expanded.cc.length) setCc(expanded.cc);
    applyTemplateFields(tpl, settings.subjectPrefix);
    setInfo(tx(L.tplApplied, { x: tpl.name }));
    setTimeout(() => setInfo(""), 2500);
  }

  /* Save current modal state as a new template (shared via the server). */
  async function handleSaveAsTemplate() {
    const n = templateName.trim() || subject.trim() || t(L.untitled);
    setShowSaveTemplate(false);
    setTemplateName("");
    try {
      const saved = await saveTemplateRemote({
        name: n, icon: "📧",
        subject, intro, note,
        toEmails: to, ccEmails: cc,
        priority, classification,
        includeTable, sortBy, groupBy,
      });
      setTemplates(await listEmailTemplates());
      setInfo(tx(L.tplSaved, { x: saved.name }));
    } catch (e) {
      setError(tx(L.tplSaveFail, { x: e?.message || e }));
    }
    setTimeout(() => setInfo(""), 2500);
  }

  /* Cycle a recipient's role: none → action → approver → reviewer → fyi → none */
  function cycleRole(email) {
    const key = String(email).toLowerCase();
    const cur = recipientRoles[key] || "none";
    const ids = RECIPIENT_ROLES.map((r) => r.id);
    const next = ids[(ids.indexOf(cur) + 1) % ids.length];
    setRecipientRoles((m) => ({ ...m, [key]: next }));
  }

  const summary = useMemo(
    () => config?.getSummary?.(payload) || { fields: [] },
    [payload, config]
  );

  /* Values every {placeholder} resolves to for THIS report. */
  const templateVars = useMemo(
    () => buildTemplateVars({
      reportDate:  payload?.reportDate,
      reportTitle: config?.reportTitle,
      itemsCount:  Array.isArray(payload?.items) ? payload.items.length : undefined,
      settings,
    }),
    [payload, config, settings]
  );
  /* Subject / intro / note keep their raw {placeholders} in state — so "save as
     template" stays reusable — and are resolved once, here, for the actual send. */
  const resolvedIntro   = applyTemplateVars(intro, templateVars);
  const resolvedSubject = applyTemplateVars(subject, templateVars).trim();
  const resolvedNote    = applyTemplateVars(note, templateVars);
  const introRef = React.useRef(null);

  /* Insert a {placeholder} at the caret in the intro box. */
  function insertIntroVar(key) {
    const el = introRef.current;
    if (!el) { setIntro((v) => v + key); return; }
    const start = el.selectionStart ?? intro.length;
    const end = el.selectionEnd ?? intro.length;
    setIntro(intro.slice(0, start) + key + intro.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + key.length, start + key.length);
    });
  }

  const serverSendReady = Boolean(config?.allowServerSend && serverMail?.configured);
  const sendMethods = useMemo(
    () => (serverSendReady ? [SERVER_METHOD, ...SEND_METHODS] : SEND_METHODS),
    [serverSendReady]
  );

  /* If "Send Now" was remembered but the server can't do it, fall back. */
  useEffect(() => {
    if (method === "server" && serverMail && !serverMail.configured) setMethod("outlook");
  }, [method, serverMail]);

  if (!open) return null;

  const toList = to;
  const ccList = cc;
  const bccList = bcc;
  const toValid = toList.length > 0 && validEmails(toList);
  const ccValid = ccList.length === 0 || validEmails(ccList);

  const needsRecipients = method === "outlook" || method === "server";
  const canSend =
    !busy &&
    resolvedSubject.length > 0 &&
    (!needsRecipients || (toValid && ccValid));

  /* ===== Audit log helper — fire-and-forget POST to /api/email-history.
     Imports API_BASE lazily to avoid coupling this module to any single page. */
  async function logEmailSent({ methodUsed, attachmentCount }) {
    try {
      const { default: API_BASE } = await import("../../config/api");
      const reportDate = payload?.reportDate || null;
      let me = "";
      try { me = JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; } catch {}
      await fetch(`${API_BASE}/api/email-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent_by:          me,
          report_type:      config?.reportType || "",
          report_title:     config?.reportTitle || "",
          report_date:      reportDate,
          subject:          resolvedSubject,
          to_emails:        to,
          cc_emails:        cc,
          bcc_emails:       bcc,
          classification,
          priority,
          method:           methodUsed,
          attachment_count: attachmentCount || 0,
          note:             (resolvedNote || "").slice(0, 2000),
          status:           "sent",
        }),
      });
    } catch (err) {
      /* Audit log is best-effort — never block the user on it */
      console.warn("[EmailHistory] log failed (non-blocking):", err);
    }
  }

  /* ===== Send dispatchers ===== */

  /* Builds the finished message body + attachment list.
     Shared by the .eml (Outlook) path and the direct-send path so both
     produce byte-identical content. */
  async function buildMessage() {
    setProgress(t(L.progPdf));
    /* A config whose generatePdf bails out (no report selected, or a stale
       closure that never saw one) used to blow up on the destructure with an
       unreadable "Cannot destructure property blob" message. */
    const pdf = await config.generatePdf(payload, { sortBy, groupBy, classification });
    if (!pdf?.blob) throw new Error(t(L.errNoPdf));
    const { blob: pdfBlob, base64: pdfBase64Raw, filename: pdfFilename } = pdf;

    const pdfBase64 = pdfBase64Raw || (await (async () => {
      const { blobToBase64 } = await import("./emailReportUtils");
      return blobToBase64(pdfBlob);
    })());

    /* Apply the user's attachment-manager selection (default: all selected) */
    const allImages = (config.getImages?.(payload) || []).filter(Boolean);
    const images = allImages.filter((u) => imageSelection[u] !== false);
    const cert = config.getCertificate?.(payload);

    const attachments = [
      { filename: pdfFilename, base64: pdfBase64, contentType: "application/pdf" },
    ];

    const imgAtts = await fetchImagesAsAttachments(images, (n, total) => {
      setProgress(tx(L.progImg, { n, total }));
    });
    attachments.push(...imgAtts);

    if (cert?.url) {
      setProgress(t(L.progCert));
      try {
        const { base64, contentType } = await fetchAsBase64(cert.url);
        const isPdf = (contentType || "").includes("pdf");
        const ext = isPdf ? "pdf" : ((contentType.split("/")[1] || "jpg") + "").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
        attachments.push({
          filename: cert.name || `certificate.${ext || "jpg"}`,
          base64,
          contentType: contentType || "application/octet-stream",
        });
      } catch (e) {
        console.warn("Failed to fetch certificate:", e);
      }
    }

    setProgress(t(L.progBuild));
    let html = config.buildHtml(payload, {
      note: resolvedNote, pdfUrl: null, attachmentsCount: attachments.length,
      includeTable, sortBy, groupBy,
      classification,
      intro: resolvedIntro,
      recipientRoles, recipients: { to: toList, cc: ccList, bcc: bccList },
    });

    // Prepend banners (classification + schedule) and append signature
    const banners = [];
    /* Classification banner — replaces the legacy single "Internal" toggle */
    const classMeta = getClassification(classification);
    if (classification && classification !== "public") {
      const forwardWarn = classification === "highly" ? t(L.doNotForward) : "";
      const classText = (isAr ? classMeta.labelAr || classMeta.label : classMeta.label)
        .replace(/^[^\s]+\s/, "");
      banners.push(`<div dir="${dir}" style="background:${classMeta.bg};border:1px solid ${classMeta.border};color:${classMeta.color};padding:8px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:900;text-align:center;letter-spacing:1px;text-transform:uppercase;">🔒 ${classText}${forwardWarn}</div>`);
    }
    if (scheduleAt) {
      const niceTime = new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      banners.push(`<div dir="${dir}" style="background:#fef3c7;border:1px solid #f59e0b;color:#78350f;padding:10px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:700;">📅 <b>${t(L.scheduledTo)}</b> ${niceTime} (Dubai) — ${t(L.outlookHint)}</div>`);
    }
    /* Recipient roles roster — appended only if at least one role was set */
    const rolesSet = Object.entries(recipientRoles).filter(([, r]) => r && r !== "none");
    if (rolesSet.length) {
      const rolesHtml = rolesSet.map(([emKey, rId]) => {
        const meta = getRole(rId);
        const display = [...toList, ...ccList, ...bccList].find((x) => String(x).toLowerCase() === emKey) || emKey;
        return `<span style="display:inline-flex;align-items:center;gap:5px;margin:2px;padding:3px 9px;border-radius:6px;background:${meta.bg};color:${meta.color};border:1px solid ${meta.color}40;font-size:11px;font-weight:800;">${roleLabel(meta, isAr)}: ${display}</span>`;
      }).join("");
      banners.push(`<div dir="${dir}" style="background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a;padding:10px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:12px;">
        <div style="font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:#64748b;font-size:11px;margin-bottom:6px;">${t(L.rolesAssigned)}</div>
        ${rolesHtml}
      </div>`);
    }
    if (banners.length) {
      const bannerHtml = `<div style="background:#f1f5f9;padding:12px 0 0;">${banners.join("")}</div>`;
      // Insert banners right after the body opening
      html = html.replace(/(<body[^>]*>|<div[^>]*background:#f1f5f9[^>]*>)/i, (m) => `${m}${bannerHtml}`);
      if (!html.includes(bannerHtml)) html = bannerHtml + html;
    }
    const sig = buildSignatureHtml(settings);
    if (sig) {
      // Insert before the final closing div tags
      const insertion = `<div style="background:#f1f5f9;padding:0 20px 20px;"><div style="max-width:780px;margin:auto;">${sig}</div></div>`;
      html = html + insertion;
    }

    return { html, attachments, pdfFilename };
  }

  async function sendViaMailto() {
    const { html, attachments, pdfFilename } = await buildMessage();

    // Build extra headers
    const extraHeaders = [];
    if (priority === "high") extraHeaders.push("X-Priority: 1", "Importance: High");
    else if (priority === "low") extraHeaders.push("X-Priority: 5", "Importance: Low");
    if (settings.requestReadReceipt && toList[0]) {
      extraHeaders.push(`Disposition-Notification-To: ${toList[0]}`);
    }

    const eml = buildEml({
      to: toList.join(", "),
      cc: ccList.join(", "),
      bcc: bccList.join(", "),
      subject: resolvedSubject,
      html,
      attachments,
      extraHeaders,
    });

    setProgress(t(L.progEml));
    const emlBlob = new Blob([eml], { type: "message/rfc822" });
    const emlFilename = pdfFilename.replace(/\.pdf$/i, "") + ".eml";
    downloadBlobLocally(emlBlob, emlFilename);

    setInfo(
      tx(L.emlDone, { file: emlFilename, n: attachments.length }) +
      (scheduleAt ? t(L.emlDelay) : "")
    );
    /* Any address that isn't a contact yet becomes one — on the server, so the
       whole team can pick it next time. */
    rememberRecipients([...toList, ...ccList, ...bccList]).then(refreshContacts);
    /* Audit log — fire-and-forget after the .eml is in the user's hands */
    logEmailSent({ methodUsed: "outlook", attachmentCount: attachments.length });
    setTimeout(() => onClose?.(), 5000);
  }

  /* Direct SMTP send through the server — no Outlook, no .eml download. */
  async function sendViaServer() {
    const { html, attachments } = await buildMessage();

    setProgress(t(L.progSend));
    const { default: API_BASE } = await import("../../config/api");
    /* Authorization is injected by the global authFetch wrapper. */
    const r = await fetch(`${API_BASE}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toList, cc: ccList, bcc: bccList,
        subject: resolvedSubject,
        html,
        priority,
        attachments: attachments.map((a) => ({
          filename: a.filename, base64: a.base64, contentType: a.contentType,
        })),
      }),
    });

    let j = {};
    try { j = await r.json(); } catch {}
    if (!r.ok || !j.ok) {
      const map = {
        not_configured:       t(L.errNotConfigured),
        rate_limited:         t(L.errRateLimited),
        attachments_too_large:t(L.errTooLarge),
        no_recipients:        t(L.errNoRecipients),
        invalid_email:        tx(L.errInvalidEmail, { x: j.detail || "" }),
        smtp_send_failed:     tx(L.errSmtp, { x: j.detail || "" }),
      };
      throw new Error(map[j.error] || j.detail || tx(L.errSendStatus, { x: r.status }));
    }

    const rejected = (j.rejected || []).length;
    setInfo(
      tx(L.sentOk, {
        from: serverMail?.from || t(L.theServer),
        n: (j.accepted || []).length,
        a: attachments.length,
      }) +
      (rejected ? tx(L.sentRejected, { n: rejected, list: (j.rejected || []).join(", ") }) : "")
    );
    /* Any address that isn't a contact yet becomes one — on the server, so the
       whole team can pick it next time. */
    rememberRecipients([...toList, ...ccList, ...bccList]).then(refreshContacts);
    logEmailSent({ methodUsed: "server", attachmentCount: attachments.length });
    setTimeout(() => onClose?.(), 4000);
  }

  async function generateAndUploadPdf() {
    setProgress(t(L.progPdf));
    const pdf = await config.generatePdf(payload, { sortBy, groupBy, classification });
    if (!pdf?.blob) throw new Error(t(L.errNoPdf));
    const { blob, filename } = pdf;
    setProgress(t(L.progUpload));
    const pdfUrl = await uploadPdfBlob(blob, filename);
    return { blob, pdfUrl, filename };
  }

  async function sendViaWhatsapp() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress(t(L.progWa));
    let body = config.buildText(payload, { note: resolvedNote, pdfUrl, includeTable, sortBy, groupBy, intro: resolvedIntro });
    if (scheduleAt) {
      const when = new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      body = tx(L.scheduledTxt, { x: when }) + "\n\n" + body;
    }
    body += buildSignatureText(settings);
    const text = `*${resolvedSubject}*\n\n${body}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setInfo(t(L.waOpened));
    rememberRecipients([...toList, ...ccList]).then(refreshContacts);
    logEmailSent({ methodUsed: "whatsapp", attachmentCount: 1 });
    setTimeout(() => onClose?.(), 1800);
  }

  async function sendViaCopy() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress(t(L.progCopy));
    let body = config.buildText(payload, { note: resolvedNote, pdfUrl, includeTable, sortBy, groupBy, intro: resolvedIntro });
    if (scheduleAt) {
      const when = new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      body = tx(L.scheduledTxt, { x: when }) + "\n\n" + body;
    }
    body += buildSignatureText(settings);
    const text =
      `${t(L.txtSubject)}: ${resolvedSubject}\n` +
      (toList.length ? `${t(L.txtTo)}: ${toList.join(", ")}\n` : "") +
      (ccList.length ? `${t(L.txtCc)}: ${ccList.join(", ")}\n` : "") +
      (bccList.length ? `${t(L.txtBcc)}: ${bccList.join(", ")}\n` : "") +
      `\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setInfo(t(L.copied));
      rememberRecipients([...toList, ...ccList, ...bccList]).then(refreshContacts);
      logEmailSent({ methodUsed: "copy", attachmentCount: 1 });
    } catch {
      throw new Error(t(L.copyFailed));
    }
  }

  async function handleSend() {
    setError("");
    setInfo("");
    if (needsRecipients && !toValid) { setError(t(L.errNoTo)); setActiveTab("send"); return; }
    if (needsRecipients && !ccValid) { setError(t(L.errBadCc)); setActiveTab("send"); return; }
    if (!resolvedSubject) { setError(t(L.errNoSubject)); setActiveTab("send"); return; }

    setBusy(true);
    try {
      if (method === "outlook")       await sendViaMailto();
      else if (method === "server")   await sendViaServer();
      else if (method === "whatsapp") await sendViaWhatsapp();
      else if (method === "copy")     await sendViaCopy();
    } catch (e) {
      setError(tx(L.errFailed, { x: e?.message || e }));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const sendLabel = busy ? (progress || t(L.working)) : ({
    outlook:  t(L.btnOutlook),
    server:   t(L.btnServer),
    whatsapp: t(L.btnWhatsapp),
    copy:     t(L.btnCopy),
  }[method] || t(L.btnSend));

  const statusChipStyle = chipForStatus(summary.statusKind);

  /* ── Tab rail ── */
  const allImagesForTabs = (config?.getImages?.(payload) || []).filter(Boolean);
  const selectedImgCount = allImagesForTabs.filter((u) => imageSelection[u] !== false).length;
  const recipCount = toList.length + ccList.length + bccList.length;
  const TABS = [
    { id: "send",        icon: "📨", label: t(L.tabSend),        badge: needsRecipients ? recipCount : 0 },
    { id: "options",     icon: "🎛️", label: t(L.tabOptions) },
    { id: "attachments", icon: "📎", label: t(L.tabAttachments), badge: selectedImgCount + 1 },
    { id: "content",     icon: "📊", label: t(L.tabContent) },
  ];
  const tab = (id) => (activeTab === id ? { display: "block" } : { display: "none" });

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}>
      <div dir={dir} style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.headerTitle}>
              {tx(L.sendTitle, { x: config?.reportTitle || t(L.reportWord) })}
            </h3>
            <div style={styles.headerSub}>{t(L.headerSub)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              disabled={busy}
              style={{
                padding: "8px 12px", background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.35)",
                borderRadius: 10, cursor: busy ? "not-allowed" : "pointer", fontSize: 13,
                fontWeight: 800, color: "#fff", display: "inline-flex", alignItems: "center", gap: 6,
              }}
              title={t(L.settingsTip)}
            >
              {t(L.settingsBtn)}
            </button>
            <button type="button" onClick={() => !busy && onClose?.()} style={styles.xBtn} title={t(L.close)}>
              ✕
            </button>
          </div>
        </div>

        <div style={styles.bodyWrap}>
          <div style={styles.nav}>
            {TABS.map((tb) => {
              const on = activeTab === tb.id;
              return (
                <button key={tb.id} type="button" onClick={() => setActiveTab(tb.id)} style={navBtnStyle(on)}>
                  <span style={{ fontSize: 15 }}>{tb.icon}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tb.label}</span>
                  {typeof tb.badge === "number" && tb.badge > 0 && <span style={navBadge(on)}>{tb.badge}</span>}
                </button>
              );
            })}
          </div>
          <div style={styles.panel}>
          <div style={tab("send")}>

        {(summary.status || summary.fields?.length) && (
          <div style={styles.summary}>
            {summary.status && (
              <div style={styles.row}>
                <strong>{t(L.status)}</strong>
                {statusChipStyle
                  ? <span style={statusChipStyle}>{summary.status}</span>
                  : <span style={{ fontWeight: 800 }}>{summary.status}</span>
                }
              </div>
            )}
            {summary.fields?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {summary.fields.map((f, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    <strong>{f.label}:</strong> {f.value || "—"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Quick Actions / Templates ===== */}
        {templates.length > 0 && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "linear-gradient(135deg,#f5f3ff,#eef2ff)", border: "1px solid #c7d2fe", borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#4338ca", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>
              {t(L.quickActions)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {templates.slice(0, 6).map((tpl) => (
                <button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)} disabled={busy}
                  style={{
                    padding: "6px 12px", background: "#fff", color: "#3730a3",
                    border: "1px solid #c7d2fe", borderRadius: 999,
                    fontWeight: 800, fontSize: 12, cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                  title={tx(L.applyTpl, { x: tpl.name })}>
                  {tpl.icon} {tpl.name}
                </button>
              ))}
              {templates.length > 6 && (
                <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>
                  {tx(L.moreInSettings, { n: templates.length - 6 })}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>{t(L.sendVia)}</label>
          <div style={styles.methodGrid}>
            {sendMethods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                style={methodCard(method === m.id)}
                disabled={busy}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{m.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{t(m.label)}</div>
                <div style={{ fontSize: 10.5, color: "#64748b", textAlign: "center" }}>{t(m.desc)}</div>
              </button>
            ))}
          </div>
          {method === "server" && serverMail?.from && (
            <div style={{ ...styles.meta, color: "#166534", fontWeight: 700 }}>
              {t(L.serverFrom)} <b dir="ltr">{serverMail.from}</b> {t(L.serverReplies)}
            </div>
          )}
          {config?.allowServerSend && serverMail && !serverMail.configured && (
            <div style={{ ...styles.meta, color: "#b45309" }}>{t(L.serverOff)}</div>
          )}
        </div>

        {needsRecipients && (
          <>
            <div style={styles.field}>
              <ContactPicker
                label={t(L.toLbl)}
                value={to}
                onChange={setTo}
                contacts={contacts}
                disabled={busy}
                allowAdd={false}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={styles.field}>
                <ContactPicker
                  label={t(L.ccLbl)}
                  value={cc}
                  onChange={setCc}
                  contacts={contacts}
                  disabled={busy}
                  allowAdd={false}
                />
              </div>
              <div style={styles.field}>
                <ContactPicker
                  label={t(L.bccLbl)}
                  value={bcc}
                  onChange={setBcc}
                  contacts={contacts}
                  disabled={busy}
                  allowAdd={false}
                />
              </div>
            </div>
            {contacts.length === 0 && (
              <div style={{ ...styles.meta, color: "#b45309" }}>{t(L.noContacts)}</div>
            )}
          </>
        )}

        <div style={styles.field}>
          <label style={styles.label}>{t(L.subject)} <span style={{ color: "#dc2626" }}>*</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            style={styles.input} disabled={busy} />
          {/* Only worth showing when a placeholder is actually in play. */}
          {subject.includes("{") && (
            <div style={{ ...styles.meta, color: "#166534", fontWeight: 700 }}>
              {t(L.introPreview)} {resolvedSubject}
            </div>
          )}
        </div>

          </div>{/* /tab:send */}

          <div style={tab("options")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 0 }}>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.schedule)}</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={styles.input}
              disabled={busy}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.priority)}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              style={styles.input} disabled={busy}>
              {PRIORITY_VALUES.map((p) => (
                <option key={p} value={p}>{priorityLabel(p, isAr)}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t(L.classification)}</label>
            <select value={classification} onChange={(e) => setClassification(e.target.value)}
              style={{
                ...styles.input,
                background: getClassification(classification).bg,
                color: getClassification(classification).color,
                fontWeight: 800,
                borderColor: getClassification(classification).border,
              }} disabled={busy}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{isAr ? c.labelAr || c.label : c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Recipient Roles (collapsible) ===== */}
        {needsRecipients && (to.length + cc.length + bcc.length) > 0 && (
          <div style={{ ...styles.field, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <button type="button" onClick={() => setShowRoles((v) => !v)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#334155" }}>
                {t(L.roles)}
                <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginInlineStart: 8 }}>
                  {tx(L.rolesCount, { n: Object.values(recipientRoles).filter((r) => r && r !== "none").length })}
                </span>
              </span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{showRoles ? "▲" : "▼"}</span>
            </button>
            {showRoles && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>{t(L.rolesHint)}</div>
                {[...to, ...cc, ...bcc].map((email) => {
                  const key = String(email).toLowerCase();
                  const found = contacts.find((c) => c.email.toLowerCase() === key);
                  const role = getRole(recipientRoles[key] || "none");
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                      <span dir="ltr" style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", textAlign: "start" }}>
                        {found?.name ? `${found.name} <${email}>` : email}
                      </span>
                      <button type="button" onClick={() => cycleRole(email)} disabled={busy}
                        style={{
                          padding: "3px 10px", borderRadius: 6,
                          background: role.bg, color: role.color,
                          border: `1px solid ${role.color}40`,
                          fontWeight: 800, fontSize: 11, cursor: busy ? "not-allowed" : "pointer",
                          fontFamily: "inherit", whiteSpace: "nowrap",
                        }}>
                        {roleLabel(role, isAr)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          </div>{/* /tab:options */}

          <div style={tab("attachments")}>
        {allImagesForTabs.length === 0 && (
          <div style={styles.summary}>{t(L.pdfOnly)}</div>
        )}
        {/* ===== Attachment Manager (collapsible) ===== */}
        {(() => {
          const allImages = (config?.getImages?.(payload) || []).filter(Boolean);
          if (allImages.length === 0) return null;
          const selectedCount = allImages.filter((u) => imageSelection[u] !== false).length;
          return (
            <div style={{ ...styles.field, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <button type="button" onClick={() => setShowAttachments((v) => !v)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#334155" }}>
                  {t(L.attachments)}
                  <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginInlineStart: 8 }}>
                    {tx(L.attachCount, { sel: selectedCount, all: allImages.length + 1 })}
                  </span>
                </span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{showAttachments ? "▲" : "▼"}</span>
              </button>
              {showAttachments && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{t(L.attachHint)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <button type="button" onClick={() => {
                      const all = {};
                      for (const u of allImages) all[u] = true;
                      setImageSelection(all);
                    }} style={{ padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {t(L.selectAll)}
                    </button>
                    <button type="button" onClick={() => {
                      const none = {};
                      for (const u of allImages) none[u] = false;
                      setImageSelection(none);
                    }} style={{ padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {t(L.deselectAll)}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                    {allImages.map((url, i) => {
                      const checked = imageSelection[url] !== false;
                      const filename = (url.split("/").pop() || `photo_${i + 1}`).split("?")[0];
                      return (
                        <label key={url} style={{
                          position: "relative", border: `2px solid ${checked ? "#16a34a" : "#cbd5e1"}`,
                          borderRadius: 8, overflow: "hidden", cursor: "pointer",
                          background: "#fff", opacity: checked ? 1 : 0.5,
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={(e) => setImageSelection((m) => ({ ...m, [url]: e.target.checked }))}
                            style={{ position: "absolute", top: 4, insetInlineStart: 4, zIndex: 2, width: 18, height: 18, accentColor: "#16a34a" }} />
                          <img src={url} alt={filename}
                            style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
                            onError={(e) => { e.target.style.background = "#fee2e2"; }} />
                          <div style={{ padding: "4px 6px", fontSize: 10, color: "#475569", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {filename}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
          </div>{/* /tab:attachments */}

          <div style={tab("content")}>

        {/* ===== Opening text (greeting) with variables =====
             Only reports whose config exposes getDefaultIntro render this text,
             so don't offer the box where it would silently do nothing. */}
        {config?.getDefaultIntro && (
        <div style={{ ...styles.field, marginTop: 0, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>{t(L.introLbl)}</label>
            {config?.getDefaultIntro && intro !== config.getDefaultIntro(payload) && (
              <button type="button" disabled={busy}
                onClick={() => setIntro(config.getDefaultIntro(payload) || "")}
                style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer",
                  fontWeight: 700, fontSize: 11, fontFamily: "inherit", padding: 0 }}>
                {t(L.introReset)}
              </button>
            )}
          </div>
          <textarea
            ref={introRef}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            style={{ ...styles.textarea, minHeight: 72, background: "#fff", marginTop: 6 }}
            disabled={busy}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#64748b" }}>{t(L.introVars)}</span>
            {TEMPLATE_VARS.map((v) => (
              <button key={v.key} type="button" disabled={busy}
                onClick={() => insertIntroVar(v.key)}
                title={templateVars[v.key] || ""}
                style={{
                  padding: "2px 8px", borderRadius: 6, cursor: busy ? "not-allowed" : "pointer",
                  background: "#fff", border: "1px solid #cbd5e1", color: "#334155",
                  fontWeight: 700, fontSize: 10.5, fontFamily: "inherit",
                }}>
                {v.key} <span style={{ color: "#94a3b8", fontWeight: 600 }}>{t(v.label)}</span>
              </button>
            ))}
          </div>
          <div style={styles.meta}>{t(L.introHint)}</div>
          {resolvedIntro.trim() && (
            <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "#15803d" }}>{t(L.introPreview)}</div>
              <div style={{ fontSize: 12.5, color: "#166534", whiteSpace: "pre-wrap", marginTop: 4 }}>
                {resolvedIntro}
              </div>
            </div>
          )}
        </div>
        )}

        <div style={styles.field}>
          <label
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: busy ? "not-allowed" : "pointer",
              padding: "10px 12px", background: includeTable ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${includeTable ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 10,
              fontWeight: 800, fontSize: 13, color: "#334155",
            }}
          >
            <input
              type="checkbox"
              checked={includeTable}
              onChange={(e) => setIncludeTable(e.target.checked)}
              disabled={busy}
              style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "inherit" }}
            />
            {t(L.includeTable)}
            <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b" }}>
              ({includeTable ? t(L.tableOn) : t(L.tableOff)})
            </span>
          </label>
        </div>

        {/* ===== Sort / Group controls — apply to PDF + email table ===== */}
        <div style={{ ...styles.field, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            {t(L.orderItems)}
            <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b" }}>
              {t(L.orderScope)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                {t(L.sortBy)}
              </label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                disabled={busy} style={styles.input}>
                <option value="default">{t(L.origOrder)}</option>
                <option value="branch">{t(L.optBranch)}</option>
                <option value="action">{t(L.optAction)}</option>
                <option value="origin">{t(L.optOrigin)}</option>
                <option value="product">{t(L.optProduct)}</option>
                <option value="expiry">{t(L.optExpiry)}</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                {t(L.groupBy)}
              </label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                disabled={busy} style={styles.input}>
                <option value="none">{t(L.noGrouping)}</option>
                <option value="branch">{t(L.optBranch)}</option>
                <option value="action">{t(L.optAction)}</option>
                <option value="origin">{t(L.optOrigin)}</option>
              </select>
            </div>
          </div>
          {(sortBy !== "default" || groupBy !== "none") && (
            <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, marginTop: 8, padding: "6px 10px", background: "#eff6ff", borderRadius: 6 }}>
              {t(L.orderApplied)}
            </div>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>{t(L.noteLbl)}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={t(L.notePh)}
            style={styles.textarea} disabled={busy} />
          {note.includes("{") && (
            <div style={{ ...styles.meta, color: "#166534", fontWeight: 700, whiteSpace: "pre-wrap" }}>
              {t(L.introPreview)} {resolvedNote}
            </div>
          )}
        </div>
          </div>{/* /tab:content */}
          </div>{/* /panel */}
        </div>{/* /bodyWrap */}

        <div style={styles.footer}>
        {progress && <div style={styles.info}>{progress}</div>}
        {info && !progress && <div style={styles.info}>{info}</div>}
        {error && <div style={styles.err}>{error}</div>}

        {/* ===== Save-as-template inline form ===== */}
        {showSaveTemplate && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "#f5f3ff", border: "1px dashed #c4b5fd", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#4338ca", marginBottom: 6 }}>
              {t(L.saveTplHint)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t(L.saveTplPh)}
                style={{ ...styles.input, flex: 1 }}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsTemplate(); }} />
              <button type="button" onClick={handleSaveAsTemplate}
                style={{ ...styles.btnPrimary, padding: "9px 16px", fontSize: 13 }}>
                {t(L.save)}
              </button>
              <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}
                style={{ ...styles.btnGhost, padding: "9px 14px", fontSize: 13 }}>
                {t(L.cancel)}
              </button>
            </div>
          </div>
        )}

        <div style={{ ...styles.actions, marginTop: 6, justifyContent: "space-between" }}>
          <button type="button" onClick={() => setShowSaveTemplate(true)} disabled={busy || showSaveTemplate}
            style={{ ...styles.btnGhost, fontSize: 12, padding: "8px 14px", color: "#7c3aed", borderColor: "#c4b5fd", ...(busy ? styles.btnDisabled : {}) }}>
            {t(L.saveAsTpl)}
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} disabled={busy} style={{ ...styles.btnGhost, ...(busy ? styles.btnDisabled : {}) }}>
              {t(L.close)}
            </button>
            <button onClick={handleSend} disabled={!canSend}
              style={{ ...styles.btnPrimary, ...(canSend ? {} : styles.btnDisabled) }}>
              {sendLabel}
            </button>
          </div>
        </div>
        </div>{/* /footer */}
      </div>

      <EmailSettingsPanel
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); refreshContacts(); }}
        onSaved={(s) => { setSettings(s); refreshContacts(); }}
      />
    </div>
  );
}
