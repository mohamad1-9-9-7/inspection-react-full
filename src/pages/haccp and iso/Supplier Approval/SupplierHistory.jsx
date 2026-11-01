// History tab of a supplier evaluation: who changed what, and when.
//
// Two sources, merged by time:
//  • the server's audit trail (/api/audit?reportId=) — every save of the
//    record with the old and new payload, so the change list is computed
//    here and cannot be skipped by a screen that forgets to log;
//  • payload.changeLog — what happened outside a normal save: supplier
//    uploads through the document link, e-mails sent.
// The audit trail is admin-only on the server; others see the change log.
import React, { useEffect, useState } from "react";
import API_BASE from "../../../config/api";

const T = {
  en: {
    loading: "Loading history...",
    adminOnly: "The full edit history is visible to admins only; showing supplier uploads and e-mails.",
    empty: "No history recorded yet.",
    created: "Record created",
    deleted: "Record deleted",
    changed: "Changed",
    supplier: "Supplier",
    unknown: "unknown user",
    parts: {
      fields: "company details",
      answers: "answers",
      declaration: "declaration",
      halal: "Halal declaration",
      notes: "internal notes",
      risk: "risk level",
      docRequest: "document request",
      fieldAttachments: "attachments",
      attachments: "general attachments",
      productsList: "products",
      public: "link",
      draft: "supplier's unsent draft",
      meta: "",
      changeLog: "",
    },
  },
  ar: {
    loading: "جاري تحميل السجل...",
    adminOnly: "سجل التعديلات الكامل متاح للمدراء فقط؛ يظهر هنا رفع المورد والإيميلات.",
    empty: "لا يوجد سجل بعد.",
    created: "إنشاء السجل",
    deleted: "حذف السجل",
    changed: "تعديل",
    supplier: "المورد",
    unknown: "مستخدم غير معروف",
    parts: {
      fields: "بيانات الشركة",
      answers: "الإجابات",
      declaration: "الإقرار",
      halal: "إقرار الحلال",
      notes: "الملاحظات الداخلية",
      risk: "مستوى الخطر",
      docRequest: "طلب المستندات",
      fieldAttachments: "المرفقات",
      attachments: "المرفقات العامة",
      productsList: "المنتجات",
      public: "الرابط",
      draft: "مسودة المورد غير المرسلة",
      meta: "",
      changeLog: "",
    },
  },
};

const asObj = (v) => {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const o = JSON.parse(v);
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }
  return {};
};
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Top-level parts that changed, with a count for answers. */
function diffParts(oldP, newP, t) {
  const o = asObj(oldP);
  const n = asObj(newP);
  const out = [];
  Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).forEach((k) => {
    if (same(o[k], n[k])) return;
    const label = t.parts[k];
    if (label === "") return; // bookkeeping only
    if (k === "answers") {
      const a = asObj(o[k]);
      const b = asObj(n[k]);
      const changed = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).filter((q) => !same(a[q], b[q])).length;
      out.push(`${label} (${changed})`);
      return;
    }
    out.push(label || k);
  });
  return out;
}

const fmt = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return "";
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function SupplierHistory({ lang, reportId, payload }) {
  const t = T[lang] || T.en;
  const [rows, setRows] = useState(null);
  const [adminOnly, setAdminOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setAdminOnly(false);
    (async () => {
      let audit = [];
      try {
        const res = await fetch(`${API_BASE}/api/audit?reportId=${encodeURIComponent(reportId)}&limit=200`, { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          if (alive) setAdminOnly(true);
        } else if (res.ok) {
          const json = await res.json().catch(() => ({}));
          audit = (json.rows || []).map((r) => {
            const action = String(r.action || "").toLowerCase();
            const parts = action.includes("delete") ? [] : diffParts(r.old_payload, r.new_payload, t);
            return {
              at: r.created_at,
              by: r.username || t.unknown,
              what: action.includes("delete")
                ? t.deleted
                : !r.old_payload
                ? t.created
                : parts.length
                ? `${t.changed}: ${parts.join(lang === "ar" ? "، " : ", ")}`
                : "",
              source: "audit",
            };
          }).filter((x) => x.what);
        }
      } catch {
        /* offline — the change log below still shows */
      }
      const log = (Array.isArray(payload?.changeLog) ? payload.changeLog : []).map((x) => ({
        at: x.at,
        by: x.by || t.supplier,
        what: [x.action, x.detail].filter(Boolean).join(" — "),
        source: "log",
      }));
      const all = [...audit, ...log].sort((a, b) => String(b.at).localeCompare(String(a.at)));
      if (alive) setRows(all);
    })();
    return () => {
      alive = false;
    };
    // the change log is part of the payload — reload when it grows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, lang, payload?.changeLog?.length, payload?.meta?.updatedAt]);

  return (
    <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 14, background: "#f8fafc", border: "1px solid rgba(100,116,139,0.25)" }}>
      {adminOnly ? <div style={{ color: "#92400e", fontWeight: 850, marginBottom: 10 }}>ℹ {t.adminOnly}</div> : null}
      {rows === null ? <div style={{ color: "#64748b", fontWeight: 850 }}>⏳ {t.loading}</div> : null}
      {rows && !rows.length ? <div style={{ color: "#64748b", fontWeight: 850 }}>{t.empty}</div> : null}
      <div style={{ display: "grid", gap: 6 }}>
        {(rows || []).map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 170px minmax(0,1fr)", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", alignItems: "start" }}>
            <span style={{ color: "#64748b", fontWeight: 800 }}>{fmt(r.at)}</span>
            <span style={{ fontWeight: 900, color: r.source === "log" ? "#0f766e" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>{r.by}</span>
            <span style={{ fontWeight: 800, color: "#334155" }}>{r.what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
