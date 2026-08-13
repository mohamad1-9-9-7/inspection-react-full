// src/pages/butcher/ButcherAccess.jsx
//
// حارس صلاحيات صفحات الجزار.
// إخفاء الكرت في الهَب لا يكفي — بدون هذا الحارس يقدر أي مستخدم يفتح الصفحة
// بالرابط المباشر. يعتمد نفس مصدر الصلاحيات: SECTION_ITEMS.butcher.
//
// ملاحظة للكشك: isItemAllowed ترجع true عند غياب المستخدم أو غياب قائمة تقييد،
// فصفحة الإدخال العامة (بلا تسجيل دخول) تبقى تعمل كما هي.

import React from "react";
import { useNavigate } from "react-router-dom";
import { isItemAllowed } from "../../utils/sectionItems";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

/**
 * هل يُسمح لهذا المستخدم بفتح صفحة الجزار المطلوبة؟
 * كل الصفحات — بما فيها الإعدادات — تتبع نفس القاعدة: لا استثناء لصفة "مدير".
 */
export const canOpenButcherPage = (itemId) => isItemAllowed("butcher", itemId);

/** شاشة "لا صلاحية" موحّدة. */
export function NoAccess({ page }) {
  const navigate = useNavigate();
  const { t, dir } = useSettingsLang();

  return (
    <div dir={dir} style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>🔒</div>
        <div style={S.title}>
          {t({ en: "No access to this page", ar: "لا توجد صلاحية لهذه الصفحة" })}
        </div>
        <div style={S.body}>
          {t({
            en: "Your account is not allowed to open this butcher page. Ask an administrator to grant it from Settings → Accounts.",
            ar: "حسابك غير مصرّح له بفتح هذه الصفحة. راجع المدير لمنحك الصلاحية من الإعدادات ← الحسابات.",
          })}
        </div>
        {page && <div style={S.code}>{page}</div>}
        <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
          {t({ en: "Back to Butcher", ar: "رجوع لقسم الجزار" })}
        </button>
      </div>
    </div>
  );
}

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    display: "grid", placeItems: "center", padding: "24px 14px",
  },
  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20,
    padding: "30px 26px", maxWidth: 520, textAlign: "center",
    display: "flex", flexDirection: "column", gap: 12,
    boxShadow: "0 10px 30px rgba(15,39,64,.07)",
  },
  icon: { fontSize: 46, lineHeight: 1 },
  title: { fontSize: 21, fontWeight: 900 },
  body: { fontSize: 15, fontWeight: 600, color: "#6b8299", lineHeight: 1.7 },
  code: {
    fontSize: 13, fontWeight: 800, color: "#8aa3b8",
    background: "#f5f9fd", border: "1px solid #e3edf7", borderRadius: 999,
    padding: "4px 14px", alignSelf: "center",
  },
  btn: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 14,
    padding: "13px 18px", fontSize: 16, fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
};
