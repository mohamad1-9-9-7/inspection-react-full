// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsView.jsx
//
// Licenses & Contracts register.
//   • Register tab — every license / contract of every branch as one row,
//     status cards (click = filter), sort, search, Excel export, print,
//     copy-a-reminder, and a Renew button on each row.
//   • Records tab — the branch entry editor (license + contracts).
//   • Change log — payload.history of every record (edits field by field,
//     renewals with links to the previous document, added/removed contracts).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import API_BASE from "../../../config/api";
import { useLangState, hideSectionLangToggle } from "../../../utils/appLang";
import {
  TYPE, safeArr, getId, normalizeFiles, isImageUrl, isPdfUrl, displayUrl,
  todayYmd, daysUntil, addPeriod, diffDays, fmtDate, fmtDateTime,
  STATUS, statusOf, flattenRecords, ensureUids, diffPayloads, applyRenewal,
  collectHistory, contractUid, newUid,
} from "./licensesKit";

const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

/* ───────────────────────── i18n ───────────────────────── */
const T = {
  en: {
    sub: "AL MAWASHI — Licenses & Contracts",
    hub: "← Hub", newEntry: "+ New Entry", refresh: "Refresh", loading: "Loading…",
    changeLog: "🕘 Change log", exportX: "⬇ Excel", print: "🖨 Print", reminder: "📋 Copy reminder",
    tabRegister: "Register", tabRecords: "Records by branch",
    kTotal: "All documents", kExpired: "Expired", kSoon: "≤ 30 days", kUpcoming: "31–90 days", kValid: "Valid", kNone: "No expiry date",
    search: "Search name, company, branch, notes…", allBranches: "All branches", allKinds: "Licenses + contracts",
    license: "License", contract: "Contract", licenses: "Licenses", contracts: "Contracts",
    showing: "Showing", of: "of", clear: "Clear filters",
    colBranch: "Branch", colKind: "Kind", colName: "Name / Type", colCompany: "Company", colExpiry: "Expiry",
    colLeft: "Days left", colStatus: "Status", colFiles: "Files", colRenewed: "Last renewed", colTimes: "Times renewed", colActions: "Actions",
    stExpired: (n) => `Expired ${n}d ago`, stToday: "Expires today", stSoon: (n) => `${n}d left`, stValid: (n) => `${n}d left`, stNone: "No expiry",
    renew: "↻ Renew", history: "History", open: "Open", files: "Files", noFiles: "No file", record: "Record",
    upcoming: "Next renewals (90 days)", nothingUpcoming: "Nothing expires in the next 90 days.",
    noRows: "No documents match these filters.",
    // renew modal
    renewTitle: "Renew document", current: "Current", newDoc: "New", expiry: "Expiry date",
    renewedOn: "Renewed on", newExpiry: "New expiry date", samePeriod: "Same period",
    plus1: "+1 year", plus2: "+2 years", plus3: "+3 years", plus6m: "+6 months",
    newFiles: "New document (PDF or images)", keepOld: "Keep the old files attached too (otherwise they move to the archive)",
    note: "Note", notePh: "e.g. renewed with Dubai Municipality, receipt no. …",
    save: "Save", saving: "Saving…", cancel: "Cancel", close: "Close",
    errNoDate: "Enter the new expiry date.", errBefore: "The new expiry date must be after the current one.",
    warnNoFile: "No new document attached. Save the renewal anyway?",
    renewed: "Renewal saved.", uploading: "Uploading…", pdfOrImgs: "PDF: 1 file • Images: up to 20",
    timesRenewed: (n) => `Renewed ${n}×`, prevDocs: "Previous documents",
    // history
    histTitle: "Change log", histFor: "History —", allActions: "All actions", noHistory: "No changes recorded yet.",
    aCreated: "Created", aEdited: "Edited", aRenewed: "Renewed", aAdded: "Contract added", aRemoved: "Contract removed",
    by: "by", from: "from", to: "to", prevFile: "previous file", filesAdded: (a, r) => `files: +${a} / −${r}`,
    fName: "Name", fExpiry: "Expiry date", fNotes: "Notes", fType: "Type", fCompany: "Company", fBranch: "Branch", fFiles: "Files",
    renewalsTab: "Renewals",
    // records
    records: "Records", noRecords: "No records found.", selectRecord: "← Select a record",
    edit: "✎ Edit", saveChanges: "✓ Save changes", del: "Delete", recordHistory: "🕘 History",
    companyLicense: "🪪 Company License", licName: "License name", notes: "Notes", addContract: "+ Add contract", remove: "Remove",
    noContracts: "No contracts", noLicense: "No license",
    confirmDelete: "Delete this record permanently?", deleted: "Record deleted.", saved: "Changes saved.",
    nothingChanged: "Nothing changed.", fetchFail: "Failed to load data.", saveFail: "Save failed: ",
    copied: "Reminder copied — paste it in WhatsApp or e-mail.", nothingToCopy: "Nothing expired or due in 90 days.",
    remHead: "Licenses & contracts — renewal reminder", remExpired: "EXPIRED", remDue: "Due",
    dataCheck: "Data checks", dcNoExpiry: (n) => `${n} without an expiry date`, dcNoFile: (n) => `${n} without an attached document`,
  },
  ar: {
    sub: "المواشي — الرخص والعقود",
    hub: "→ الرئيسية", newEntry: "+ إدخال جديد", refresh: "تحديث", loading: "جارٍ التحميل…",
    changeLog: "🕘 سجل التغييرات", exportX: "⬇ إكسل", print: "🖨 طباعة", reminder: "📋 نسخ تذكير",
    tabRegister: "السجل", tabRecords: "السجلات حسب الفرع",
    kTotal: "كل المستندات", kExpired: "منتهية", kSoon: "خلال 30 يوم", kUpcoming: "31–90 يوم", kValid: "سارية", kNone: "بدون تاريخ انتهاء",
    search: "ابحث بالاسم، الشركة، الفرع، الملاحظات…", allBranches: "كل الفروع", allKinds: "رخص + عقود",
    license: "رخصة", contract: "عقد", licenses: "الرخص", contracts: "العقود",
    showing: "المعروض", of: "من", clear: "مسح الفلاتر",
    colBranch: "الفرع", colKind: "النوع", colName: "الاسم / النوع", colCompany: "الشركة", colExpiry: "الانتهاء",
    colLeft: "الأيام المتبقية", colStatus: "الحالة", colFiles: "الملفات", colRenewed: "آخر تجديد", colTimes: "مرات التجديد", colActions: "إجراءات",
    stExpired: (n) => `منتهية منذ ${n} يوم`, stToday: "تنتهي اليوم", stSoon: (n) => `باقي ${n} يوم`, stValid: (n) => `باقي ${n} يوم`, stNone: "بدون انتهاء",
    renew: "↻ تجديد", history: "السجل", open: "فتح", files: "ملفات", noFiles: "لا يوجد ملف", record: "سجل",
    upcoming: "التجديدات القادمة (90 يوم)", nothingUpcoming: "لا شيء ينتهي خلال 90 يوماً.",
    noRows: "لا توجد مستندات مطابقة.",
    renewTitle: "تجديد المستند", current: "الحالي", newDoc: "الجديد", expiry: "تاريخ الانتهاء",
    renewedOn: "تاريخ التجديد", newExpiry: "تاريخ الانتهاء الجديد", samePeriod: "نفس المدة",
    plus1: "+ سنة", plus2: "+ سنتين", plus3: "+ 3 سنوات", plus6m: "+ 6 أشهر",
    newFiles: "المستند الجديد (PDF أو صور)", keepOld: "إبقاء الملفات القديمة مرفقة أيضاً (وإلا تنتقل إلى الأرشيف)",
    note: "ملاحظة", notePh: "مثال: جُددت لدى بلدية دبي، رقم الإيصال …",
    save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء", close: "إغلاق",
    errNoDate: "أدخل تاريخ الانتهاء الجديد.", errBefore: "تاريخ الانتهاء الجديد يجب أن يكون بعد الحالي.",
    warnNoFile: "لم يتم إرفاق مستند جديد. حفظ التجديد على أي حال؟",
    renewed: "تم حفظ التجديد.", uploading: "جارٍ الرفع…", pdfOrImgs: "PDF: ملف واحد • صور: حتى 20",
    timesRenewed: (n) => `جُدد ${n} مرة`, prevDocs: "المستندات السابقة",
    histTitle: "سجل التغييرات", histFor: "السجل —", allActions: "كل الإجراءات", noHistory: "لا توجد تغييرات مسجلة بعد.",
    aCreated: "إنشاء", aEdited: "تعديل", aRenewed: "تجديد", aAdded: "إضافة عقد", aRemoved: "حذف عقد",
    by: "بواسطة", from: "من", to: "إلى", prevFile: "الملف السابق", filesAdded: (a, r) => `الملفات: +${a} / −${r}`,
    fName: "الاسم", fExpiry: "تاريخ الانتهاء", fNotes: "الملاحظات", fType: "النوع", fCompany: "الشركة", fBranch: "الفرع", fFiles: "الملفات",
    renewalsTab: "التجديدات",
    records: "السجلات", noRecords: "لا توجد سجلات.", selectRecord: "اختر سجلاً من القائمة",
    edit: "✎ تعديل", saveChanges: "✓ حفظ التعديلات", del: "حذف", recordHistory: "🕘 السجل",
    companyLicense: "🪪 رخصة الشركة", licName: "اسم الرخصة", notes: "ملاحظات", addContract: "+ إضافة عقد", remove: "إزالة",
    noContracts: "لا توجد عقود", noLicense: "لا توجد رخصة",
    confirmDelete: "حذف هذا السجل نهائياً؟", deleted: "تم حذف السجل.", saved: "تم حفظ التعديلات.",
    nothingChanged: "لا توجد تغييرات.", fetchFail: "تعذّر تحميل البيانات.", saveFail: "فشل الحفظ: ",
    copied: "تم نسخ التذكير — الصقه في واتساب أو البريد.", nothingToCopy: "لا يوجد شيء منتهٍ أو مستحق خلال 90 يوماً.",
    remHead: "الرخص والعقود — تذكير بالتجديد", remExpired: "منتهية", remDue: "تستحق",
    dataCheck: "فحص البيانات", dcNoExpiry: (n) => `${n} بدون تاريخ انتهاء`, dcNoFile: (n) => `${n} بدون مستند مرفق`,
  },
};

/* ───────────────────────── styles ───────────────────────── */
const C = {
  ink: "#0f172a", sub: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f8fafc",
  brand: "#4f46e5", brandSoft: "#eef2ff", ok: "#10b981",
};
const S = {
  shell: {
    minHeight: "100vh", padding: "18px 22px",
    background: "linear-gradient(150deg,#eef2ff 0%,#f8fafc 55%,#ecfdf5 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif', color: C.ink,
  },
  card: { background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 16, boxShadow: "0 2px 10px rgba(15,23,42,0.04)", padding: 16 },
  label: { fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.line}`, borderRadius: 10,
    padding: "10px 12px", fontSize: 14, fontWeight: 600, outline: "none", background: C.soft, color: C.ink,
  },
  tblInput: {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.line}`, borderRadius: 8,
    padding: "7px 9px", fontSize: 13, fontWeight: 600, outline: "none", background: C.soft,
  },
  th: {
    textAlign: "start", padding: "10px 10px", fontSize: 12, fontWeight: 800, color: "#475569",
    borderBottom: `2px solid ${C.line}`, background: C.soft, whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
  },
  td: { padding: "10px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 13, fontWeight: 600, verticalAlign: "middle" },
};
const btn = (bg, fg = "#fff") => ({
  background: bg, color: fg, border: "none", borderRadius: 10, padding: "9px 14px",
  fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
});
const ghost = {
  background: "#fff", color: "#334155", border: `1.5px solid ${C.line}`, borderRadius: 10,
  padding: "9px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
};
const mini = {
  background: "rgba(79,70,229,0.07)", border: "1px solid rgba(79,70,229,0.25)", color: "#4338ca",
  borderRadius: 8, padding: "5px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
  textDecoration: "none", display: "inline-block",
};
const miniRed = { ...mini, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b" };
const miniOrange = { ...mini, background: "#f97316", border: "1px solid #ea580c", color: "#fff" };

/* ───────────────────────── upload ───────────────────────── */
function isPdfFile(file) {
  const t = String(file?.type || "").toLowerCase();
  return t === "application/pdf" || String(file?.name || "").toLowerCase().endsWith(".pdf");
}
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  const url = data?.url || data?.secure_url || data?.fileUrl || data?.file_url || data?.path || data?.result?.secure_url || "";
  if (!url) throw new Error("No URL returned from server.");
  return url;
}
/** PDF alone (1) or images (≤20). Returns { urls, names } or throws a user message. */
async function uploadPicked(fileList, onProgress) {
  const list = Array.from(fileList || []).slice(0, 20);
  if (!list.length) return { urls: [], names: [] };
  const pdfs = list.filter(isPdfFile);
  const imgs = list.filter((f) => !isPdfFile(f));
  if (pdfs.length && imgs.length) throw new Error("Please upload a PDF alone OR images alone — not both.");
  if (pdfs.length > 1) throw new Error("Only 1 PDF at a time.");
  const files = pdfs.length ? pdfs : imgs;
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`${i + 1} / ${files.length}`);
    urls.push(await uploadFile(files[i]));
  }
  return { urls, names: files.map((f) => f.name) };
}

/* ───────────────────────── server write ───────────────────────── */
async function writeRecord(rid, payload) {
  const put = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: TYPE, payload }),
  });
  if (put.ok) return;
  // Fallback for a server without PUT :id — create the new one FIRST, then drop the old.
  const post = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
  });
  if (!post.ok) throw new Error(`HTTP ${put.status}/${post.status}`);
  await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }).catch(() => {});
}

/* ───────────────────────── small pieces ───────────────────────── */
function statusText(t, key, days) {
  if (key === "none") return t.stNone;
  if (key === "expired") return t.stExpired(Math.abs(days));
  if (days === 0) return t.stToday;
  return key === "valid" ? t.stValid(days) : t.stSoon(days);
}

function StatusPill({ t, expiryDate, small }) {
  const st = statusOf(expiryDate);
  const s = STATUS[st.key];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: small ? 11 : 12, fontWeight: 800,
      padding: small ? "3px 8px" : "4px 10px", borderRadius: 999, background: s.bg,
      border: `1px solid ${s.bd}`, color: s.color, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: s.dot }} />
      {statusText(t, st.key, st.days)}
    </span>
  );
}

function FileChip({ url, label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe",
      borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 700,
    }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>{label}</a>
      {onRemove && (
        <button type="button" onClick={onRemove} title="Remove file"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 900, fontSize: 13, padding: "0 2px" }}>✕</button>
      )}
    </span>
  );
}

function fileLabel(u, i, names) {
  return names?.[i] || (isImageUrl(u) ? `Image ${i + 1}` : isPdfUrl(u) ? `PDF ${i + 1}` : `File ${i + 1}`);
}

function Overlay({ onClose, children, width = 720 }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", zIndex: 9999,
      display: "grid", placeItems: "center", padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: `min(${width}px, 96vw)`, maxHeight: "92vh", overflow: "auto", borderRadius: 18,
        background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
      }}>{children}</div>
    </div>
  );
}

function PreviewModal({ state, onClose, setState }) {
  const { open, title, urls = [], index = 0 } = state;
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => {
      if (e.key === "ArrowLeft") setState((p) => ({ ...p, index: (p.index - 1 + p.urls.length) % p.urls.length }));
      if (e.key === "ArrowRight") setState((p) => ({ ...p, index: (p.index + 1) % p.urls.length }));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, setState]);
  if (!open) return null;
  const cur = urls[index] || "";
  const step = (d) => setState((p) => ({ ...p, index: (p.index + d + p.urls.length) % p.urls.length }));
  return (
    <Overlay onClose={onClose} width={980}>
      <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.line}`, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 14 }}>{title} <span style={{ color: C.faint }}>({index + 1}/{urls.length})</span></b>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <a href={cur} target="_blank" rel="noreferrer" style={mini}>Open</a>
          <a href={cur} download style={mini}>Download</a>
          <button type="button" style={mini} onClick={() => step(-1)} disabled={urls.length <= 1}>◀</button>
          <button type="button" style={mini} onClick={() => step(1)} disabled={urls.length <= 1}>▶</button>
          <button type="button" style={miniRed} onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ background: C.soft, display: "grid", placeItems: "center", padding: 14, minHeight: 300 }}>
        {isImageUrl(cur) ? (
          <img src={displayUrl(cur, 1400)} alt="preview" style={{ maxWidth: "100%", maxHeight: "76vh", borderRadius: 12, border: `1.5px solid ${C.line}` }} />
        ) : isPdfUrl(cur) ? (
          <iframe title="pdf" src={cur} style={{ width: "100%", height: "76vh", border: "none", borderRadius: 12, background: "#fff" }} />
        ) : (
          <div style={{ fontWeight: 700, color: C.sub }}>Use <b>Open</b> to view this file.</div>
        )}
      </div>
    </Overlay>
  );
}

/* ───────────────────────── Renew modal ───────────────────────── */
function RenewModal({ t, lang, item, onClose, onSave }) {
  const prevExp = item.expiryDate || "";
  const lastRen = item.lastRenewal;
  // the previous validity length: last renewal (prev→new), else 1 year
  const prevPeriod = useMemo(() => {
    if (lastRen?.prevExpiryDate && lastRen?.newExpiryDate) {
      const d = diffDays(lastRen.prevExpiryDate, lastRen.newExpiryDate);
      if (d && d > 20) return d;
    }
    return null;
  }, [lastRen]);
  // renewing a still-valid document → new period starts from the old expiry; expired → from today
  const baseDate = prevExp && daysUntil(prevExp) !== null && daysUntil(prevExp) >= 0 ? prevExp : todayYmd();
  const [renewedOn, setRenewedOn] = useState(todayYmd());
  const [newExpiry, setNewExpiry] = useState(addPeriod(baseDate, { years: 1 }));
  const [files, setFiles] = useState({ urls: [], names: [] });
  const [keepOld, setKeepOld] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const quick = [
    [t.plus6m, { months: 6 }], [t.plus1, { years: 1 }], [t.plus2, { years: 2 }], [t.plus3, { years: 3 }],
  ];

  async function pick(fl) {
    setErr("");
    try {
      setBusy(t.uploading);
      const r = await uploadPicked(fl, (p) => setBusy(`${t.uploading} ${p}`));
      setFiles((prev) => ({ urls: [...prev.urls, ...r.urls].slice(0, 20), names: [...prev.names, ...r.names].slice(0, 20) }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function submit() {
    setErr("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newExpiry)) return setErr(t.errNoDate);
    if (prevExp && newExpiry <= prevExp) return setErr(t.errBefore);
    if (!files.urls.length && !window.confirm(t.warnNoFile)) return;
    setBusy(t.saving);
    try {
      await onSave({ newExpiry, renewedOn, files: files.urls, fileNames: files.names, keepOldFiles: keepOld, note });
    } catch (e) {
      setErr(t.saveFail + (e?.message || e));
      setBusy("");
    }
  }

  const left = daysUntil(newExpiry);
  return (
    <Overlay onClose={busy ? undefined : onClose} width={760}>
      <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>↻ {t.renewTitle}</div>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 700, marginTop: 2 }}>
            {item.kind === "license" ? "🪪" : "📄"} {item.name}{item.company ? ` — ${item.company}` : ""} · {item.branch}
          </div>
        </div>
        <button type="button" style={miniRed} onClick={onClose} disabled={!!busy}>✕</button>
      </div>

      <div style={{ padding: 18, display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: `1.5px solid ${STATUS[item.status].bd}`, background: STATUS[item.status].bg, borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.sub, textTransform: "uppercase" }}>{t.current}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{fmtDate(prevExp, lang)}</div>
            <div style={{ marginTop: 6 }}><StatusPill t={t} expiryDate={prevExp} small /></div>
            <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {item.files.length ? item.files.map((u, i) => <FileChip key={u} url={u} label={fileLabel(u, i)} />) : <span style={{ fontSize: 12, color: C.faint }}>{t.noFiles}</span>}
            </div>
          </div>
          <div style={{ border: "1.5px solid #86efac", background: "#f0fdf4", borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#166534", textTransform: "uppercase" }}>{t.newDoc}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{fmtDate(newExpiry, lang)}</div>
            <div style={{ marginTop: 6 }}>{left !== null && <StatusPill t={t} expiryDate={newExpiry} small />}</div>
            {item.renewals.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: C.sub }}>{t.timesRenewed(item.renewals.length)}</div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>{t.renewedOn}</label>
            <input type="date" style={S.input} value={renewedOn} onChange={(e) => setRenewedOn(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>{t.newExpiry}</label>
            <input type="date" style={S.input} value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quick.map(([lbl, per]) => (
            <button key={lbl} type="button" style={mini} onClick={() => setNewExpiry(addPeriod(baseDate, per))}>{lbl}</button>
          ))}
          {prevPeriod && (
            <button type="button" style={mini} onClick={() => setNewExpiry(addPeriod(baseDate, { days: prevPeriod }))}>
              {t.samePeriod} ({Math.round(prevPeriod / 30.4)}m)
            </button>
          )}
        </div>

        <div>
          <label style={S.label}>{t.newFiles}</label>
          <input type="file" accept="application/pdf,image/*" multiple style={{ ...S.input, padding: "8px 10px" }}
            disabled={!!busy} onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          <div style={{ fontSize: 12, color: busy ? C.brand : C.faint, fontWeight: 700, marginTop: 4 }}>{busy || t.pdfOrImgs}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {files.urls.map((u, i) => (
              <FileChip key={u} url={u} label={fileLabel(u, i, files.names)}
                onRemove={() => setFiles((p) => ({ urls: p.urls.filter((_, j) => j !== i), names: p.names.filter((_, j) => j !== i) }))} />
            ))}
          </div>
          {item.files.length > 0 && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700, marginTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={keepOld} onChange={(e) => setKeepOld(e.target.checked)} /> {t.keepOld}
            </label>
          )}
        </div>

        <div>
          <label style={S.label}>{t.note}</label>
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>

        {err && <div style={{ padding: "8px 12px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontWeight: 700, fontSize: 13 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" style={ghost} onClick={onClose} disabled={!!busy}>{t.cancel}</button>
          <button type="button" style={btn(C.ok)} onClick={submit} disabled={!!busy}>{busy === t.saving ? t.saving : `✓ ${t.save}`}</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ───────────────────────── History drawer ───────────────────────── */
const ACTION_TONE = {
  created: { bg: "#eef2ff", color: "#3730a3", icon: "✚" },
  edited: { bg: "#f1f5f9", color: "#334155", icon: "✎" },
  renewed: { bg: "#ecfdf5", color: "#065f46", icon: "↻" },
  contract_added: { bg: "#eff6ff", color: "#1d4ed8", icon: "＋" },
  contract_removed: { bg: "#fef2f2", color: "#991b1b", icon: "−" },
};

function HistoryDrawer({ t, lang, title, events, onClose, onPreview }) {
  const [action, setAction] = useState("ALL");
  const [q, setQ] = useState("");
  const aLabel = { created: t.aCreated, edited: t.aEdited, renewed: t.aRenewed, contract_added: t.aAdded, contract_removed: t.aRemoved };
  const fLabel = { name: t.fName, expiryDate: t.fExpiry, notes: t.fNotes, contractType: t.fType, companyName: t.fCompany, branch: t.fBranch, files: t.fFiles };
  const shown = events.filter((e) => {
    if (action !== "ALL" && e.action !== action) return false;
    if (q.trim()) {
      const hay = [e.target?.label, e.by, e.branch, e.note, ...safeArr(e.changes).flatMap((c) => [c.from, c.to])].join(" ").toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });
  const fmtVal = (field, v) => (field === "expiryDate" ? fmtDate(v, lang) : (v || "—"));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", zIndex: 9998 }}>
      <aside onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", top: 0, bottom: 0, insetInlineEnd: 0, width: "min(560px, 100vw)", background: "#fff",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: `1.5px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>🕘 {title}</div>
          <button type="button" style={miniRed} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 170px", gap: 8, borderBottom: `1px solid ${C.line}` }}>
          <input style={S.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} />
          <select style={S.input} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="ALL">{t.allActions}</option>
            {Object.keys(aLabel).map((k) => <option key={k} value={k}>{aLabel[k]}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {shown.length === 0 && <div style={{ color: C.faint, fontWeight: 700, textAlign: "center", padding: 30 }}>{t.noHistory}</div>}
          {shown.map((e) => {
            const tone = ACTION_TONE[e.action] || ACTION_TONE.edited;
            return (
              <div key={`${e.rid}-${e.id}`} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 99, background: tone.bg, color: tone.color, display: "grid", placeItems: "center", fontWeight: 900 }}>{tone.icon}</div>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13, color: tone.color }}>{aLabel[e.action] || e.action}</b>
                    <span style={{ fontSize: 11, color: C.faint, fontWeight: 700 }}>{fmtDateTime(e.at, lang)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>
                    {e.target?.kind === "license" ? "🪪" : e.target?.kind === "contract" ? "📄" : "🗂"} {e.target?.label || "—"}
                    {e.branch && <span style={{ color: C.sub, fontWeight: 600 }}> · {e.branch}</span>}
                  </div>
                  {safeArr(e.changes).length > 0 && (
                    <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, fontSize: 12, color: "#334155" }}>
                      {e.changes.map((c, i) => (
                        <li key={i} style={{ marginBottom: 2 }}>
                          <b>{fLabel[c.field] || c.field}:</b>{" "}
                          {c.field === "files"
                            ? t.filesAdded(c.added || 0, c.removed || 0)
                            : <><span style={{ textDecoration: "line-through", color: "#b91c1c" }}>{fmtVal(c.field, c.from)}</span> → <span style={{ color: "#047857", fontWeight: 800 }}>{fmtVal(c.field, c.to)}</span></>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {safeArr(e.prev?.files).length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.sub, fontWeight: 800 }}>{t.prevDocs}:</span>
                      {e.prev.files.map((u, i) => (
                        isImageUrl(u)
                          ? <button key={u} type="button" style={mini} onClick={() => onPreview(t.prevDocs, e.prev.files.filter(isImageUrl), e.prev.files.filter(isImageUrl).indexOf(u))}>{fileLabel(u, i)}</button>
                          : <a key={u} href={u} target="_blank" rel="noreferrer" style={mini}>{fileLabel(u, i)}</a>
                      ))}
                    </div>
                  )}
                  {e.note && <div style={{ marginTop: 6, fontSize: 12, color: "#334155", background: C.soft, borderRadius: 8, padding: "5px 8px" }}>📝 {e.note}</div>}
                  <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, marginTop: 6 }}>{t.by} {e.by || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Main ───────────────────────── */
export default function LicensesContractsView() {
  const navigate = useNavigate();
  const [lang, setLang] = useLangState(() => {
    try { return localStorage.getItem("haccp_modules_lang_v1") === "ar" ? "ar" : "en"; } catch { return "en"; }
  });
  const t = T[lang] || T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("register");

  // register filters
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [kindFilter, setKindFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState({ key: "days", dir: 1 });

  const [preview, setPreview] = useState({ open: false, title: "", urls: [], index: 0 });
  const [renewItem, setRenewItem] = useState(null);
  const [historyView, setHistoryView] = useState(null); // { title, events }
  const [toast, setToast] = useState("");

  // records tab
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editBase, setEditBase] = useState(null);
  const [editLicense, setEditLicense] = useState({});
  const [editContracts, setEditContracts] = useState([]);
  const [uploadingKey, setUploadingKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const firstLoad = useRef(true);

  const toastTimer = useRef(0);
  function flash(msg) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      const arr = safeArr(Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [])
        .sort((a, b) => String(b?.created_at || b?.createdAt || "").localeCompare(String(a?.created_at || a?.createdAt || "")));
      setReports(arr);
      if (firstLoad.current) {
        setSelectedId(getId(arr[0]) || null);
        firstLoad.current = false;
      }
    } catch (e) {
      console.error(e);
      flash(t.fetchFail);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── register ── */
  const items = useMemo(() => flattenRecords(reports), [reports]);
  const branchList = useMemo(() => {
    const s = new Set(BRANCHES);
    items.forEach((it) => s.add(it.branch));
    return Array.from(s);
  }, [items]);

  const baseFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (branchFilter !== "ALL" && it.branch !== branchFilter) return false;
      if (kindFilter !== "ALL" && it.kind !== kindFilter) return false;
      if (needle && ![it.name, it.company, it.branch, it.notes].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, branchFilter, kindFilter]);

  const counts = useMemo(() => {
    const c = { ALL: baseFiltered.length, expired: 0, soon: 0, upcoming: 0, valid: 0, none: 0 };
    baseFiltered.forEach((it) => { c[it.status] += 1; });
    return c;
  }, [baseFiltered]);

  const rows = useMemo(() => {
    const list = statusFilter === "ALL" ? baseFiltered.slice() : baseFiltered.filter((it) => it.status === statusFilter);
    const val = (it) => {
      switch (sort.key) {
        case "branch": return it.branch.toLowerCase();
        case "kind": return it.kind;
        case "name": return it.name.toLowerCase();
        case "company": return it.company.toLowerCase();
        case "renewed": return it.lastRenewal?.at || "";
        default: return it.days === null ? 1e9 : it.days; // days / expiry
      }
    };
    return list.sort((a, b) => {
      const x = val(a); const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [baseFiltered, statusFilter, sort]);

  const upcoming = useMemo(() => items
    .filter((it) => it.days !== null && it.days <= 90)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8), [items]);

  const dataChecks = useMemo(() => ({
    noExpiry: items.filter((it) => it.status === "none").length,
    noFile: items.filter((it) => !it.files.length).length,
  }), [items]);

  const allHistory = useMemo(() => collectHistory(reports), [reports]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  }
  function clearFilters() {
    setQ(""); setBranchFilter("ALL"); setKindFilter("ALL"); setStatusFilter("ALL");
  }

  function openPreview(title, urls, idx = 0) {
    const list = safeArr(urls).filter(Boolean);
    if (!list.length) return;
    setPreview({ open: true, title, urls: list, index: Math.max(0, Math.min(idx, list.length - 1)) });
  }
  function openFiles(it) {
    const imgs = it.files.filter(isImageUrl);
    if (imgs.length) openPreview(it.name, it.files, 0);
    else if (it.files[0]) window.open(it.files[0], "_blank", "noopener");
  }

  function itemHistory(it) {
    return allHistory.filter((e) => e.rid === it.rid && (e.target?.uid === it.uid || (it.kind === "license" && e.target?.kind === "license") || e.action === "created"));
  }

  async function saveRenewal(it, data) {
    const rec = reports.find((r) => getId(r) === it.rid);
    if (!rec) throw new Error("Record not found");
    const next = applyRenewal(rec.payload || {}, { kind: it.kind, uid: it.uid }, data);
    if (!next) throw new Error("Item not found");
    next.savedAt = Date.now();
    await writeRecord(it.rid, next);
    setRenewItem(null);
    flash(t.renewed);
    await fetchReports();
  }

  /* ── export / print / reminder ── */
  function rowValues(it) {
    return {
      [t.colBranch]: it.branch,
      [t.colKind]: it.kind === "license" ? t.license : t.contract,
      [t.colName]: it.name,
      [t.colCompany]: it.company,
      [t.colExpiry]: it.expiryDate || "",
      [t.colLeft]: it.days === null ? "" : it.days,
      [t.colStatus]: statusText(t, it.status, it.days),
      [t.colRenewed]: it.lastRenewal?.renewedOn || "",
      [t.colTimes]: it.renewals.length,
      [t.notes]: it.notes,
      [t.colFiles]: it.files.join(" "),
    };
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map(rowValues));
    ws["!cols"] = [22, 10, 28, 24, 12, 9, 18, 13, 9, 30, 50].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Register");
    const hist = allHistory.map((e) => ({
      Date: fmtDateTime(e.at, "en"), By: e.by, Action: e.action, Branch: e.branch, Item: e.target?.label || "",
      Changes: safeArr(e.changes).map((c) => `${c.field}: ${c.from ?? ""} → ${c.to ?? ""}`).join("; "), Note: e.note || "",
    }));
    if (hist.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hist), "Change log");
    XLSX.writeFile(wb, `licenses-contracts-${todayYmd()}.xlsx`);
  }

  function printRegister() {
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const head = [t.colBranch, t.colKind, t.colName, t.colCompany, t.colExpiry, t.colStatus, t.colRenewed];
    const body = rows.map((it) => {
      const s = STATUS[it.status];
      return `<tr><td>${esc(it.branch)}</td><td>${esc(it.kind === "license" ? t.license : t.contract)}</td><td>${esc(it.name)}</td><td>${esc(it.company)}</td><td>${esc(fmtDate(it.expiryDate, lang))}</td><td style="color:${s.color};font-weight:700">${esc(statusText(t, it.status, it.days))}</td><td>${esc(it.lastRenewal ? fmtDate(it.lastRenewal.renewedOn, lang) : "")}</td></tr>`;
    }).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(t.sub)}</title>
      <style>body{font-family:system-ui,Segoe UI,Tahoma,sans-serif;padding:18px;color:#0f172a}h2{margin:0 0 4px}small{color:#64748b}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:start}th{background:#f1f5f9}</style></head>
      <body><h2>${esc(t.sub)}</h2><small>${esc(fmtDate(todayYmd(), lang))} · ${rows.length} / ${items.length}</small>
      <table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  async function copyReminder() {
    const due = items.filter((it) => it.days !== null && it.days <= 90).sort((a, b) => a.days - b.days);
    if (!due.length) return flash(t.nothingToCopy);
    const lines = [`${t.remHead} (${fmtDate(todayYmd(), lang)})`, ""];
    due.forEach((it) => {
      const tag = it.days < 0 ? `🔴 ${t.remExpired}` : it.days <= 30 ? `🟠 ${t.remDue}` : `🟡 ${t.remDue}`;
      lines.push(`${tag} · ${it.branch} · ${it.name}${it.company ? ` — ${it.company}` : ""} · ${fmtDate(it.expiryDate, lang)} (${statusText(t, it.status, it.days)})`);
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash(t.copied);
    } catch {
      window.prompt("Copy:", lines.join("\n"));
    }
  }

  /* ── records tab ── */
  const selected = reports.find((r) => getId(r) === selectedId) || null;
  const payload = selected?.payload || {};
  const license = payload.license || {};
  const contracts = safeArr(payload.contracts);
  const selectedBranch = String(payload.branch || "").trim() || "—";

  const groupedByBranch = useMemo(() => {
    const acc = {};
    const needle = q.trim().toLowerCase();
    reports.forEach((r) => {
      const p = r?.payload || {};
      const br = String(p.branch || "").trim() || "Unspecified";
      if (branchFilter !== "ALL" && br !== branchFilter) return;
      if (needle) {
        const txt = [br, p.license?.name, p.license?.notes, ...safeArr(p.contracts).flatMap((c) => [c.contractType, c.companyName])].join(" ").toLowerCase();
        if (!txt.includes(needle)) return;
      }
      (acc[br] = acc[br] || []).push(r);
    });
    return acc;
  }, [reports, q, branchFilter]);

  function worstOf(r) {
    const its = items.filter((it) => it.rid === getId(r));
    if (!its.length) return null;
    return its.reduce((w, it) => (STATUS[it.status].rank < STATUS[w.status].rank ? it : w), its[0]);
  }

  function selectRecord(id) {
    setSelectedId(id);
    setEditing(false);
    setEditBase(null);
  }

  function startEdit() {
    if (!selected) return;
    const base = ensureUids(JSON.parse(JSON.stringify(payload)));
    const lic = base.license || {};
    setEditBase(base);
    setEditLicense({ ...lic, fileUrls: normalizeFiles(lic), fileNames: safeArr(lic.fileNames) });
    setEditContracts(safeArr(base.contracts).map((c) => ({ ...c, fileUrls: normalizeFiles(c), fileNames: safeArr(c.fileNames) })));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setEditBase(null);
  }
  const updateContract = (i, f, v) => setEditContracts((prev) => prev.map((c, j) => (j === i ? { ...c, [f]: v } : c)));

  async function pickFiles(fileList, key, cur, onDone) {
    try {
      setUploadingKey(key);
      const r = await uploadPicked(fileList, setUploadProgress);
      onDone([...safeArr(cur.fileUrls), ...r.urls].slice(0, 20), [...safeArr(cur.fileNames), ...r.names].slice(0, 20));
    } catch (e) {
      alert(e.message);
    } finally {
      setUploadingKey("");
      setUploadProgress("");
    }
  }

  async function saveEdit() {
    if (!selected || !editBase) return;
    const rid = getId(selected);
    const newPayload = {
      ...editBase,
      license: { ...editLicense, fileUrl: safeArr(editLicense.fileUrls)[0] || "" },
      contracts: editContracts.map((c) => ({ ...c, uid: c.uid || newUid(), fileUrl: safeArr(c.fileUrls)[0] || "" })),
      savedAt: Date.now(),
    };
    const events = diffPayloads(editBase, newPayload);
    if (!events.length) { setEditing(false); return flash(t.nothingChanged); }
    newPayload.history = [...safeArr(editBase.history), ...events];
    try {
      setLoading(true);
      await writeRecord(rid, newPayload);
      setEditing(false);
      setEditBase(null);
      flash(t.saved);
      await fetchReports();
    } catch (e) {
      alert(t.saveFail + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selected || !window.confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(getId(selected))}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      flash(t.deleted);
      setEditing(false);
      setSelectedId(null);
      await fetchReports();
    } catch (e) {
      alert(t.saveFail + (e?.message || e));
    }
  }

  /* ───────────────────────── render ───────────────────────── */
  const kpis = [
    ["ALL", t.kTotal, "#4f46e5", "#eef2ff"],
    ["expired", t.kExpired, STATUS.expired.color, STATUS.expired.bg],
    ["soon", t.kSoon, STATUS.soon.color, STATUS.soon.bg],
    ["upcoming", t.kUpcoming, STATUS.upcoming.color, STATUS.upcoming.bg],
    ["valid", t.kValid, STATUS.valid.color, STATUS.valid.bg],
    ["none", t.kNone, STATUS.none.color, STATUS.none.bg],
  ];
  const sortArrow = (k) => (sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : "");
  const filtersOn = q || branchFilter !== "ALL" || kindFilter !== "ALL" || statusFilter !== "ALL";

  return (
    <main style={S.shell} dir={dir}>
      <PreviewModal state={preview} setState={setPreview} onClose={() => setPreview((p) => ({ ...p, open: false }))} />
      {renewItem && (
        <RenewModal t={t} lang={lang} item={renewItem} onClose={() => setRenewItem(null)} onSave={(d) => saveRenewal(renewItem, d)} />
      )}
      {historyView && (
        <HistoryDrawer t={t} lang={lang} title={historyView.title} events={historyView.events}
          onClose={() => setHistoryView(null)} onPreview={openPreview} />
      )}
      {toast && (
        <div style={{
          position: "fixed", bottom: 22, insetInlineStart: "50%", transform: "translateX(-50%)", zIndex: 10000,
          background: "#0f172a", color: "#fff", padding: "10px 18px", borderRadius: 12, fontWeight: 700, fontSize: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}>{toast}</div>
      )}

      {/* Top bar */}
      <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={mawashiLogo} alt="logo" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: `1px solid ${C.line}` }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3 }}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2, fontWeight: 700 }}>{t.sub}</div>
            <HaccpLinkBadge clauses={["4.4"]} label="Scope + Legal Compliance" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={ghost} onClick={() => navigate("/haccp-iso")}>{t.hub}</button>
          <button style={ghost} onClick={() => setHistoryView({ title: t.histTitle, events: allHistory })}>{t.changeLog}</button>
          <button style={ghost} onClick={copyReminder}>{t.reminder}</button>
          <button style={ghost} onClick={exportExcel} disabled={!rows.length}>{t.exportX}</button>
          <button style={ghost} onClick={printRegister} disabled={!rows.length}>{t.print}</button>
          {!hideSectionLangToggle() && (
            <button style={ghost} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "ع"}</button>
          )}
          <button style={btn(C.brand)} onClick={() => navigate("/haccp-iso/licenses-contracts")}>{t.newEntry}</button>
          <button style={btn(C.ok)} onClick={fetchReports} disabled={loading}>{loading ? t.loading : t.refresh}</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        {kpis.map(([key, label, color, bg]) => {
          const active = statusFilter === key;
          return (
            <button key={key} type="button" onClick={() => { setStatusFilter(key); setTab("register"); }}
              style={{
                textAlign: "start", cursor: "pointer", borderRadius: 14, padding: "12px 14px",
                background: active ? bg : "#fff", border: `2px solid ${active ? color : C.line}`,
                boxShadow: active ? `0 6px 18px ${color}22` : "0 2px 8px rgba(15,23,42,0.04)",
              }}>
              <div style={{ fontSize: 26, fontWeight: 900, color }}>{counts[key]}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters + tabs */}
      <div style={{ ...S.card, marginBottom: 14, display: "grid", gridTemplateColumns: "minmax(220px,1fr) 210px 190px auto", gap: 10, alignItems: "end" }}>
        <div>
          <label style={S.label}>🔎</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={S.input} placeholder={t.search} />
        </div>
        <div>
          <label style={S.label}>{t.colBranch}</label>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={S.input}>
            <option value="ALL">{t.allBranches}</option>
            {branchList.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>{t.colKind}</label>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={S.input}>
            <option value="ALL">{t.allKinds}</option>
            <option value="license">{t.licenses}</option>
            <option value="contract">{t.contracts}</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["register", t.tabRegister], ["records", t.tabRecords]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              style={tab === k ? btn(C.brand) : ghost}>{lbl}</button>
          ))}
        </div>
      </div>

      {tab === "register" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }}>
          {/* Register table */}
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${C.line}` }}>
              <b style={{ fontSize: 14 }}>{t.showing}: {rows.length} {t.of} {items.length}</b>
              {filtersOn && <button type="button" style={mini} onClick={clearFilters}>✕ {t.clear}</button>}
            </div>
            <div style={{ overflow: "auto", maxHeight: "68vh" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {[["branch", t.colBranch], ["kind", t.colKind], ["name", t.colName], ["company", t.colCompany], ["days", t.colExpiry], [null, t.colStatus], [null, t.colFiles], ["renewed", t.colRenewed], [null, t.colActions]].map(([k, lbl]) => (
                      <th key={lbl} style={{ ...S.th, cursor: k ? "pointer" : "default" }} onClick={k ? () => toggleSort(k) : undefined}>
                        {lbl}{k && sortArrow(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: C.faint, padding: 30 }}>{loading ? t.loading : t.noRows}</td></tr>
                  )}
                  {rows.map((it) => {
                    const urgent = it.status === "expired" || it.status === "soon";
                    return (
                      <tr key={it.key} style={{ background: it.status === "expired" ? "#fff7f7" : undefined }}>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>{it.branch}</td>
                        <td style={S.td}>{it.kind === "license" ? `🪪 ${t.license}` : `📄 ${t.contract}`}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>
                          {it.name}
                          {it.notes && <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.notes}>{it.notes}</div>}
                        </td>
                        <td style={S.td}>{it.company || "—"}</td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDate(it.expiryDate, lang)}</td>
                        <td style={S.td}><StatusPill t={t} expiryDate={it.expiryDate} small /></td>
                        <td style={S.td}>
                          {it.files.length
                            ? <button type="button" style={mini} onClick={() => openFiles(it)}>📎 {it.files.length}</button>
                            : <span style={{ fontSize: 11, color: "#b45309", fontWeight: 800 }}>⚠ {t.noFiles}</span>}
                        </td>
                        <td style={{ ...S.td, whiteSpace: "nowrap", fontSize: 12 }}>
                          {it.lastRenewal ? (
                            <>
                              {fmtDate(it.lastRenewal.renewedOn, lang)}
                              <div style={{ fontSize: 11, color: C.faint }}>{t.timesRenewed(it.renewals.length)}</div>
                            </>
                          ) : "—"}
                        </td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button type="button" style={urgent ? miniOrange : mini} onClick={() => setRenewItem(it)}>{t.renew}</button>
                            <button type="button" style={mini} onClick={() => setHistoryView({ title: `${t.histFor} ${it.name}`, events: itemHistory(it) })}>{t.history}</button>
                            <button type="button" style={mini} title={t.record} onClick={() => { selectRecord(it.rid); setTab("records"); }}>↗</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side panel: upcoming + data checks */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>⏰ {t.upcoming}</div>
              {upcoming.length === 0 && <div style={{ fontSize: 13, color: C.faint, fontWeight: 700 }}>{t.nothingUpcoming}</div>}
              <div style={{ display: "grid", gap: 8 }}>
                {upcoming.map((it) => {
                  const s = STATUS[it.status];
                  return (
                    <div key={it.key} style={{ borderInlineStart: `4px solid ${s.dot}`, background: s.bg, borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                        <b style={{ fontSize: 13 }}>{it.name}</b>
                        <button type="button" style={{ ...mini, padding: "3px 8px" }} onClick={() => setRenewItem(it)}>↻</button>
                      </div>
                      <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>{it.branch}{it.company ? ` · ${it.company}` : ""}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: s.color, marginTop: 2 }}>
                        {fmtDate(it.expiryDate, lang)} · {statusText(t, it.status, it.days)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(dataChecks.noExpiry > 0 || dataChecks.noFile > 0) && (
              <div style={{ ...S.card, background: "#fffbeb", borderColor: "#fde68a" }}>
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 6, color: "#92400e" }}>⚠ {t.dataCheck}</div>
                {dataChecks.noExpiry > 0 && (
                  <button type="button" style={{ ...mini, display: "block", marginBottom: 6 }} onClick={() => setStatusFilter("none")}>{t.dcNoExpiry(dataChecks.noExpiry)}</button>
                )}
                {dataChecks.noFile > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>{t.dcNoFile(dataChecks.noFile)}</div>}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ───────── Records tab ───────── */
        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0,1fr)", gap: 14, alignItems: "start" }}>
          <div style={{ ...S.card, maxHeight: "78vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>{t.records}</div>
            {!loading && Object.keys(groupedByBranch).length === 0 && <div style={{ color: C.faint, fontWeight: 700 }}>{t.noRecords}</div>}
            {Object.keys(groupedByBranch).sort((a, b) => a.localeCompare(b)).map((br) => (
              <details key={br} open style={{ marginBottom: 10 }}>
                <summary style={{ fontWeight: 800, cursor: "pointer", padding: "4px 0", fontSize: 14 }}>
                  {br} <span style={{ color: C.faint, fontWeight: 600 }}>({groupedByBranch[br].length})</span>
                </summary>
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {groupedByBranch[br].map((r) => {
                    const id = getId(r);
                    const active = id === selectedId;
                    const w = worstOf(r);
                    const p = r.payload || {};
                    const nCon = safeArr(p.contracts).length;
                    return (
                      <button key={id} type="button" onClick={() => selectRecord(id)} style={{
                        textAlign: "start", borderRadius: 12, padding: 10, cursor: "pointer",
                        border: `1.5px solid ${active ? "#a5b4fc" : C.line}`, background: active ? C.brandSoft : "#fff",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{p.license?.name || t.noLicense}</span>
                          {w && <span style={{ width: 10, height: 10, borderRadius: 99, background: STATUS[w.status].dot, flex: "none" }} title={statusText(t, w.status, w.days)} />}
                        </div>
                        <div style={{ fontSize: 12, color: C.faint, fontWeight: 600, marginTop: 3 }}>
                          {nCon} {t.contracts}{w ? ` · ${statusText(t, w.status, w.days)}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <div style={{ ...S.card, minWidth: 0 }}>
            {!selected ? (
              <div style={{ padding: 30, textAlign: "center", color: C.faint, fontWeight: 700 }}>{t.selectRecord}</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedBranch}</div>
                    <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>
                      {safeArr(payload.history).length} {t.histTitle.toLowerCase()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button style={ghost} onClick={() => setHistoryView({ title: `${t.histFor} ${selectedBranch}`, events: allHistory.filter((e) => e.rid === selectedId) })}>{t.recordHistory}</button>
                    {!editing && <button style={btn(C.brand)} onClick={startEdit}>{t.edit}</button>}
                    {editing && (
                      <>
                        <button style={btn(C.ok)} onClick={saveEdit} disabled={loading || !!uploadingKey}>{loading ? t.saving : t.saveChanges}</button>
                        <button style={ghost} onClick={cancelEdit} disabled={loading}>{t.cancel}</button>
                      </>
                    )}
                    <button style={btn("#ef4444")} onClick={handleDelete} data-delete-action="true">{t.del}</button>
                  </div>
                </div>

                {/* License */}
                {(() => {
                  const lic = editing ? editLicense : license;
                  const licFiles = editing ? safeArr(editLicense.fileUrls) : normalizeFiles(license);
                  const licItem = items.find((it) => it.rid === selectedId && it.kind === "license");
                  return (
                    <div style={{ padding: 14, borderRadius: 14, border: `1.5px solid ${C.line}`, background: "#fcfcfd", marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{t.companyLicense}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <StatusPill t={t} expiryDate={lic?.expiryDate} />
                          {!editing && licItem && <button type="button" style={licItem.status === "expired" || licItem.status === "soon" ? miniOrange : mini} onClick={() => setRenewItem(licItem)}>{t.renew}</button>}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={S.label}>{t.licName}</label>
                          {editing
                            ? <input style={S.input} value={editLicense.name || ""} onChange={(e) => setEditLicense((p) => ({ ...p, name: e.target.value }))} />
                            : <div style={{ fontWeight: 800 }}>{license.name || "—"}</div>}
                        </div>
                        <div>
                          <label style={S.label}>{t.expiry}</label>
                          {editing
                            ? <input type="date" style={S.input} value={editLicense.expiryDate || ""} onChange={(e) => setEditLicense((p) => ({ ...p, expiryDate: e.target.value }))} />
                            : <div style={{ fontWeight: 800 }}>{fmtDate(license.expiryDate, lang)}</div>}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={S.label}>{t.notes}</label>
                        {editing
                          ? <input style={S.input} value={editLicense.notes || ""} onChange={(e) => setEditLicense((p) => ({ ...p, notes: e.target.value }))} />
                          : <div style={{ fontWeight: 700, color: license.notes ? C.ink : C.faint }}>{license.notes || "—"}</div>}
                      </div>
                      <label style={S.label}>{t.colFiles} ({licFiles.length})</label>
                      {editing && (
                        <div style={{ marginBottom: 8 }}>
                          <input type="file" accept="application/pdf,image/*" multiple style={{ ...S.input, padding: "8px 10px" }} disabled={!!uploadingKey}
                            onChange={(e) => { pickFiles(e.target.files, "license", editLicense, (u, n) => setEditLicense((p) => ({ ...p, fileUrls: u, fileNames: n }))); e.target.value = ""; }} />
                          <div style={{ fontSize: 12, color: uploadingKey === "license" ? C.brand : C.faint, fontWeight: 700, marginTop: 4 }}>
                            {uploadingKey === "license" ? `${t.uploading} ${uploadProgress}` : t.pdfOrImgs}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {licFiles.length === 0 && <span style={{ fontSize: 12, color: C.faint, fontWeight: 700 }}>{t.noFiles}</span>}
                        {licFiles.map((u, i) => (
                          editing
                            ? <FileChip key={u} url={u} label={fileLabel(u, i, editLicense.fileNames)}
                                onRemove={() => setEditLicense((p) => ({ ...p, fileUrls: p.fileUrls.filter((_, j) => j !== i), fileNames: safeArr(p.fileNames).filter((_, j) => j !== i) }))} />
                            : isImageUrl(u)
                              ? <button key={u} type="button" onClick={() => openPreview(t.companyLicense, licFiles, i)} style={{ width: 70, height: 52, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${C.line}`, padding: 0, cursor: "pointer", background: C.soft }}>
                                  <img src={displayUrl(u, 320)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </button>
                              : <a key={u} href={u} target="_blank" rel="noreferrer" style={mini}>📄 {fileLabel(u, i, license.fileNames)}</a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Contracts */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>📄 {t.contracts} ({(editing ? editContracts : contracts).length})</div>
                  {editing && (
                    <button type="button" style={mini} onClick={() => setEditContracts((p) => [...p, { uid: newUid(), contractType: "", companyName: "", expiryDate: "", notes: "", fileUrls: [], fileNames: [] }])}>{t.addContract}</button>
                  )}
                </div>
                {(editing ? editContracts : contracts).length === 0 ? (
                  <div style={{ color: C.faint, fontWeight: 700 }}>{t.noContracts}</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                      <thead>
                        <tr>
                          {[t.fType, t.fCompany, t.colExpiry, t.colStatus, t.colFiles, t.notes, t.colActions].map((h) => <th key={h} style={S.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(editing ? editContracts : contracts).map((c, i) => {
                          const cFiles = editing ? safeArr(c.fileUrls) : normalizeFiles(c);
                          const cItem = !editing && items.find((it) => it.rid === selectedId && it.kind === "contract" && it.uid === contractUid(c, i));
                          const key = `contract:${i}`;
                          return (
                            <tr key={c.uid || i}>
                              <td style={{ ...S.td, minWidth: 140 }}>
                                {editing ? <input style={S.tblInput} value={c.contractType || ""} onChange={(e) => updateContract(i, "contractType", e.target.value)} /> : <b>{c.contractType || "—"}</b>}
                              </td>
                              <td style={{ ...S.td, minWidth: 160 }}>
                                {editing ? <input style={S.tblInput} value={c.companyName || ""} onChange={(e) => updateContract(i, "companyName", e.target.value)} /> : (c.companyName || "—")}
                              </td>
                              <td style={{ ...S.td, minWidth: 130, whiteSpace: "nowrap" }}>
                                {editing ? <input type="date" style={S.tblInput} value={c.expiryDate || ""} onChange={(e) => updateContract(i, "expiryDate", e.target.value)} /> : fmtDate(c.expiryDate, lang)}
                              </td>
                              <td style={S.td}><StatusPill t={t} expiryDate={c.expiryDate} small /></td>
                              <td style={{ ...S.td, minWidth: 180 }}>
                                {editing && (
                                  <>
                                    <input type="file" accept="application/pdf,image/*" multiple style={{ ...S.tblInput, marginBottom: 4 }} disabled={!!uploadingKey}
                                      onChange={(e) => {
                                        pickFiles(e.target.files, key, c, (u, n) => setEditContracts((prev) => prev.map((x, j) => (j === i ? { ...x, fileUrls: u, fileNames: n } : x))));
                                        e.target.value = "";
                                      }} />
                                    {uploadingKey === key && <div style={{ fontSize: 11, color: C.brand, fontWeight: 700 }}>{t.uploading} {uploadProgress}</div>}
                                  </>
                                )}
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {cFiles.length === 0 && <span style={{ fontSize: 11, color: C.faint }}>—</span>}
                                  {editing
                                    ? cFiles.map((u, fi) => (
                                        <FileChip key={u} url={u} label={fileLabel(u, fi, c.fileNames)}
                                          onRemove={() => setEditContracts((prev) => prev.map((x, j) => (j === i ? { ...x, fileUrls: x.fileUrls.filter((_, k) => k !== fi), fileNames: safeArr(x.fileNames).filter((_, k) => k !== fi) } : x)))} />
                                      ))
                                    : cFiles.length > 0 && (
                                        <button type="button" style={mini} onClick={() => (cFiles.some(isImageUrl) ? openPreview(c.contractType || t.contract, cFiles, 0) : window.open(cFiles[0], "_blank", "noopener"))}>📎 {cFiles.length}</button>
                                      )}
                                </div>
                              </td>
                              <td style={{ ...S.td, minWidth: 160 }}>
                                {editing ? <input style={S.tblInput} value={c.notes || ""} onChange={(e) => updateContract(i, "notes", e.target.value)} /> : (c.notes || "—")}
                              </td>
                              <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                                {editing ? (
                                  <button type="button" style={miniRed} onClick={() => setEditContracts((prev) => prev.filter((_, j) => j !== i))}>{t.remove}</button>
                                ) : cItem ? (
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button type="button" style={cItem.status === "expired" || cItem.status === "soon" ? miniOrange : mini} onClick={() => setRenewItem(cItem)}>{t.renew}</button>
                                    <button type="button" style={mini} onClick={() => setHistoryView({ title: `${t.histFor} ${cItem.name}`, events: itemHistory(cItem) })}>{t.history}</button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: C.faint, fontWeight: 600 }}>
        © Al Mawashi — Quality & Food Safety System
      </div>
    </main>
  );
}
