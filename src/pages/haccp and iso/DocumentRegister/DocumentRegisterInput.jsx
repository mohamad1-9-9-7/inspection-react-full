// src/pages/haccp and iso/DocumentRegister/DocumentRegisterInput.jsx
// Add or edit metadata for any controlled document.
// — When ?docNo=X param is present, prefills from auto-imported source + existing metadata.
// — Saves as report type "document_metadata" so the View page merges it back.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import {
  getAutoImportedDocs,
  DOC_TYPE_META,
  DOC_STATUS_META,
  CATEGORY_TO_CLAUSE,
  addYears,
  toISO,
} from "./documentSources";

const META_TYPE = "document_metadata";

const empty = {
  docNo: "",
  title: "",
  titleAr: "",
  type: "SOP",
  category: "",
  isoClause: "",
  owner: "",
  approvedBy: "",
  issueDate: new Date().toISOString().slice(0, 10),
  revision: "01",
  nextReviewDate: "",
  distribution: "",
  retentionYears: 2,
  storage: "Server / FSMS Folder",
  status: "Active",
  replacedBy: "",
  notes: "",
};

const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#475569", marginTop: 4, fontWeight: 700 },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 950, color: "#0f766e",
    margin: "0 0 12px", paddingBottom: 6,
    borderBottom: "2px solid #14b8a6",
  },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 80, resize: "vertical", background: "#fff" },
  select: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff", cursor: "pointer" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #0f766e, #0d9488)", color: "#fff", border: "#0f766e" },
      secondary: { bg: "#fff",                                      color: "#334155", border: "#cbd5e1" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "9px 16px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13,
    };
  },

  banner: (kind) => {
    const c = kind === "auto"
      ? { bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" }
      : { bg: "#fce7f3", border: "#f9a8d4", text: "#9f1239" };
    return {
      padding: "10px 14px",
      borderRadius: 10,
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      fontSize: 12,
      fontWeight: 800,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 8,
    };
  },
};

export default function DocumentRegisterInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const docNoParam = params.get("docNo");
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [form, setForm] = useState(empty);
  const [existingId, setExistingId] = useState(null);
  const [autoSourced, setAutoSourced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  /* If docNo param provided: prefill from auto + existing metadata */
  useEffect(() => {
    if (!docNoParam) return;
    setLoading(true);

    // 1. Try auto-import
    const auto = getAutoImportedDocs().find((d) => d.docNo === docNoParam);
    if (auto) {
      setAutoSourced(true);
      setForm((f) => ({
        ...f,
        docNo: auto.docNo,
        title: auto.title || "",
        titleAr: auto.titleAr || "",
        type: auto.type || "SOP",
        category: auto.category || "",
        isoClause: auto.isoClause || "",
        owner: auto.owner || "",
        issueDate: toISO(auto.issueDate) || auto.issueDate || empty.issueDate,
        revision: auto.revision || "01",
      }));
    }

    // 2. Try existing metadata record
    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(META_TYPE)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const arr = Array.isArray(j) ? j : j?.data || j?.items || [];
        const match = arr.find((rec) => rec?.payload?.docNo === docNoParam);
        if (match) {
          setExistingId(match.id);
          setForm((f) => ({
            ...empty,
            ...f,
            ...match.payload,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [docNoParam]);

  function setField(key, value) {
    setForm((f) => {
      const next = { ...f, [key]: value };

      // Auto-derive ISO clause from category
      if (key === "category" && value && CATEGORY_TO_CLAUSE[value] && !f.isoClause) {
        next.isoClause = CATEGORY_TO_CLAUSE[value];
      }

      // Auto-derive default retention from type if not set
      if (key === "type" && value) {
        const tMeta = DOC_TYPE_META[value];
        if (tMeta && (!f.retentionYears || f.retentionYears === empty.retentionYears)) {
          next.retentionYears = tMeta.defaultRetentionYears;
        }
      }

      return next;
    });
  }

  /* Suggested next review date based on issueDate */
  const suggestedNextReview = useMemo(() => {
    return toISO(addYears(form.issueDate, 1));
  }, [form.issueDate]);

  async function save() {
    if (!form.docNo || !form.title || !form.type) {
      alert(t("requiredField"));
      return;
    }
    setSaving(true);
    try {
      const url = existingId
        ? `${API_BASE}/api/reports/${encodeURIComponent(existingId)}`
        : `${API_BASE}/api/reports`;
      const method = existingId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.owner || "admin", type: META_TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/document-register/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("drInputTitle")}</div>
            <div style={S.subtitle}>{t("drSubtitle")}</div>
            <HaccpLinkBadge clauses={["7.5"]} label={lang === "ar" ? "المعلومات الموثقة" : "Documented Information"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/document-register/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Banner indicating source */}
        {autoSourced && (
          <div style={S.banner("auto")}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <span>
              {isAr
                ? "تم استيراد هذه الوثيقة تلقائياً من sopData.js. أضف بيانات وصفية إضافية أدناه (المراجعة، التوزيع، الاحتفاظ...)."
                : "This document was auto-imported from sopData.js. Add extra metadata below (review, distribution, retention...)."}
            </span>
          </div>
        )}

        {loading && <div style={{ ...S.banner("auto"), justifyContent: "center" }}>{t("loading")}</div>}

        {/* Section 1: Identification */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("drDetails")}</div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drDocNo")}</label>
              <input
                style={S.input}
                value={form.docNo}
                onChange={(e) => setField("docNo", e.target.value)}
                placeholder={t("drDocNoPh")}
                disabled={autoSourced}
              />
              {autoSourced && <div style={S.hint}>{isAr ? "🔒 رقم الوثيقة مقفل لأنه مستورد تلقائياً" : "🔒 Doc No. locked (auto-imported)"}</div>}
            </div>
            <div>
              <label style={S.label}>{t("drType")}</label>
              <select style={S.select} value={form.type} onChange={(e) => setField("type", e.target.value)}>
                {Object.keys(DOC_TYPE_META).map((k) => (
                  <option key={k} value={k}>{t(DOC_TYPE_META[k].i18nKey)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drDocTitle")}</label>
              <input style={S.input} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder={t("drDocTitlePh")} />
            </div>
            <div>
              <label style={S.label}>{t("drDocTitleAr")}</label>
              <input style={S.input} value={form.titleAr} onChange={(e) => setField("titleAr", e.target.value)} placeholder={t("drDocTitleArPh")} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drCategory")}</label>
              <select style={S.select} value={form.category} onChange={(e) => setField("category", e.target.value)}>
                <option value="">—</option>
                {Object.keys(CATEGORY_TO_CLAUSE).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>{t("drIsoClause")}</label>
              <input style={S.input} value={form.isoClause} onChange={(e) => setField("isoClause", e.target.value)} placeholder={t("drIsoClausePh")} />
              <div style={S.hint}>{isAr ? "💡 ينعبّى تلقائياً حسب الفئة" : "💡 Auto-fills based on category"}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Versioning & Approval */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الإصدار والاعتماد" : "Versioning & Approval"}</div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("drIssueDate")}</label>
              <input type="date" style={S.input} value={toISO(form.issueDate) || form.issueDate} onChange={(e) => setField("issueDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("drRevision")}</label>
              <input style={S.input} value={form.revision} onChange={(e) => setField("revision", e.target.value)} placeholder={t("drRevisionPh")} />
            </div>
            <div>
              <label style={S.label}>{t("drNextReview")}</label>
              <input
                type="date"
                style={S.input}
                value={form.nextReviewDate || ""}
                onChange={(e) => setField("nextReviewDate", e.target.value)}
                placeholder={suggestedNextReview}
              />
              <div style={S.hint}>
                {form.nextReviewDate
                  ? (isAr ? "✓ مُحدد يدوياً" : "✓ Manually set")
                  : (isAr ? `💡 الافتراضي: ${suggestedNextReview} (${t("drNextReviewHint")})` : `💡 Default: ${suggestedNextReview} (${t("drNextReviewHint")})`)}
              </div>
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drOwner")}</label>
              <input style={S.input} value={form.owner} onChange={(e) => setField("owner", e.target.value)} placeholder={t("drOwnerPh")} />
            </div>
            <div>
              <label style={S.label}>{t("drApprovedBy")}</label>
              <input style={S.input} value={form.approvedBy} onChange={(e) => setField("approvedBy", e.target.value)} placeholder={t("drApprovedByPh")} />
            </div>
          </div>
        </div>

        {/* Section 3: Distribution & Retention */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "التوزيع والاحتفاظ" : "Distribution & Retention"}</div>

          <label style={S.label}>{t("drDistribution")}</label>
          <textarea
            style={{ ...S.textarea, minHeight: 60 }}
            value={form.distribution}
            onChange={(e) => setField("distribution", e.target.value)}
            placeholder={t("drDistributionPh")}
          />

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drRetention")}</label>
              <input
                type="number"
                min="0"
                style={S.input}
                value={form.retentionYears}
                onChange={(e) => setField("retentionYears", parseInt(e.target.value, 10) || 0)}
                placeholder={t("drRetentionPh")}
              />
              <div style={S.hint}>
                {isAr ? "💡 افتراضي: حسب نوع الوثيقة" : "💡 Default: based on type"}
              </div>
            </div>
            <div>
              <label style={S.label}>{t("drStorage")}</label>
              <input style={S.input} value={form.storage} onChange={(e) => setField("storage", e.target.value)} placeholder={t("drStoragePh")} />
            </div>
          </div>
        </div>

        {/* Section 4: Status & Notes */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الحالة والملاحظات" : "Status & Notes"}</div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("drStatus")}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                {Object.keys(DOC_STATUS_META).map((k) => (
                  <option key={k} value={k}>{t(DOC_STATUS_META[k].i18nKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>{t("drReplacedBy")}</label>
              <input
                style={S.input}
                value={form.replacedBy}
                onChange={(e) => setField("replacedBy", e.target.value)}
                placeholder={t("drReplacedByPh")}
                disabled={form.status !== "Obsolete"}
              />
              <div style={S.hint}>
                {isAr ? "✓ متاح فقط عند اختيار الحالة \"ملغاة\"" : "✓ Available only when status is \"Obsolete\""}
              </div>
            </div>
          </div>

          <label style={S.label}>{t("drNotes")}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder={t("drNotesPh")} />
        </div>

        {/* Save row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("drSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
