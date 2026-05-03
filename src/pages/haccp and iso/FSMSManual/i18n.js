// src/pages/haccp and iso/FSMSManual/i18n.js
// FSMS Manual — Bilingual dictionary (AR / EN)

import { useEffect, useState } from "react";

const STORAGE_KEY = "fsms_lang_v1";

export const STRINGS = {
  ar: {
    /* Header */
    pageTitle: "📕 دليل HACCP — نظام تحليل المخاطر",
    pageSubtitle: "خطة HACCP وتحليل المخاطر — الوثيقة المرجعية الرئيسية",
    backToHub: "← رجوع إلى لوحة HACCP & ISO",
    docNumber: "رقم الوثيقة",
    revision: "رقم المراجعة",
    issueDate: "تاريخ الإصدار",
    company: "الشركة",
    standard: "المعيار",

    /* Sidebar */
    chapters: "📑 الفصول",
    bookmarks: "إشاراتي المرجعية",
    searchPlaceholder: "🔍 ابحث في الدليل...",
    noResults: "لا توجد نتائج",
    expandAll: "↕️ فتح الكل",
    collapseAll: "↕️ طيّ الكل",
    addBookmark: "إضافة لإشاراتي المرجعية",
    removeBookmark: "إزالة من إشاراتي المرجعية",

    /* Section Header */
    clause: "البند",
    relatedModule: "🔗 مرتبط بـ",
    openModule: "افتح الموديول ↗",

    /* Approval Block */
    preparedBy: "أعدّه",
    reviewedBy: "راجعه",
    approvedBy: "اعتمده",
    role: "الدور",
    name: "الاسم",
    position: "المنصب",
    signature: "التوقيع",
    date: "التاريخ",

    /* Edit / Reset */
    edit: "✏️ تعديل",
    save: "💾 حفظ",
    cancel: "✖ إلغاء",
    reset: "↩️ إعادة تعيين للأصلي",
    confirmReset: "هل تريد فعلاً إعادة هذا القسم لمحتواه الأصلي من الدليل؟",
    edited: "(معدّل)",
    saving: "⏳ جاري الحفظ...",
    saved: "✅ تم الحفظ",
    saveError: "❌ خطأ بالحفظ",
    editTitle: "تعديل القسم",
    editHint: "يمكن تعديل النص الأساسي للقسم. زرّ \"إعادة تعيين\" يرجّع المحتوى الأصلي من الدليل.",
    bodyLabel: "محتوى القسم",
    titleLabel: "عنوان القسم",

    /* Tools */
    print: "🖨️ طباعة",
    exportPdf: "📄 تصدير PDF",
    showAr: "🇸🇦 العربية",
    showEn: "🇬🇧 English",

    /* Empty / Loading */
    selectSection: "👈 اختر قسماً من القائمة الجانبية للعرض",
    loading: "⏳ جاري التحميل...",

    /* Document Control labels */
    docControlInfo: "معلومات ضبط الوثيقة",
    masterDocument: "الوثيقة الأم",
    auditReady: "جاهز للتدقيق",
  },
  en: {
    pageTitle: "📕 HACCP Manual",
    pageSubtitle: "Hazard Analysis & Critical Control Points — Master Reference",
    backToHub: "← Back to HACCP & ISO Hub",
    docNumber: "Document No.",
    revision: "Revision",
    issueDate: "Issue Date",
    company: "Company",
    standard: "Standard",

    chapters: "📑 Chapters",
    bookmarks: "My Bookmarks",
    searchPlaceholder: "🔍 Search the manual...",
    noResults: "No results",
    expandAll: "↕️ Expand All",
    collapseAll: "↕️ Collapse All",
    addBookmark: "Add to bookmarks",
    removeBookmark: "Remove from bookmarks",

    clause: "Clause",
    relatedModule: "🔗 Linked to",
    openModule: "Open module ↗",

    preparedBy: "Prepared by",
    reviewedBy: "Reviewed by",
    approvedBy: "Approved by",
    role: "Role",
    name: "Name",
    position: "Position",
    signature: "Signature",
    date: "Date",

    edit: "✏️ Edit",
    save: "💾 Save",
    cancel: "✖ Cancel",
    reset: "↩️ Reset to Default",
    confirmReset: "Reset this section to its original manual content?",
    edited: "(edited)",
    saving: "⏳ Saving...",
    saved: "✅ Saved",
    saveError: "❌ Save error",
    editTitle: "Edit Section",
    editHint: "You can edit the section's main body. \"Reset\" restores the original manual content.",
    bodyLabel: "Section body",
    titleLabel: "Section title",

    print: "🖨️ Print",
    exportPdf: "📄 Export PDF",
    showAr: "🇸🇦 العربية",
    showEn: "🇬🇧 English",

    selectSection: "👈 Select a section from the sidebar to view it",
    loading: "⏳ Loading...",

    docControlInfo: "Document Control Information",
    masterDocument: "Master Document",
    auditReady: "Audit-Ready",
  },
};

export function useLang() {
  const [lang, setLang] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "en" || v === "ar" ? v : "ar";
    } catch {
      return "ar";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  function t(key, vars) {
    const dict = STRINGS[lang] || STRINGS.ar;
    let str = dict[key];
    if (str === undefined) str = STRINGS.ar[key] ?? key;
    if (vars && typeof str === "string") {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""));
      }
    }
    return str;
  }

  function toggle() { setLang((l) => (l === "ar" ? "en" : "ar")); }

  return { lang, setLang, toggle, t, isRTL: lang === "ar", dir: lang === "ar" ? "rtl" : "ltr" };
}

export function LangToggle({ lang, toggle, style }) {
  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        background: "rgba(255,255,255,0.95)",
        color: "#0b1f4d",
        border: "1.5px solid #e2e8f0",
        padding: "7px 14px",
        borderRadius: 999,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: "0.9rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        ...style,
      }}
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {lang === "ar" ? "🇬🇧 EN" : "🇸🇦 AR"}
    </button>
  );
}
