// src/pages/hse/HSEPolicies.jsx
// السياسات الأساسية (17 سياسة) — ثنائية اللغة

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, useHSELang, HSELangToggle,
} from "./hseShared";
import { POLICIES } from "./hsePolicyData";
import { findSop, sopsForPolicy } from "./hseSopData";

const T = {
  pageTitle:    { ar: "📜 السياسات الأساسية — HSE Policies", en: "📜 Core Policies — HSE Policies" },
  pageSubtitle: { ar: "17 سياسة إلزامية يجب اعتمادها خلال أول 90 يوماً من تأسيس القسم",
                  en: "17 mandatory policies to be approved within the first 90 days of department setup" },
  pageIntro: {
    ar: "تُعدّ السياسات الوثائق المرجعية التي تحدد موقف الشركة من كل جانب من جوانب HSE. كل سياسة هنا تتضمن: الغرض، النطاق، المبادئ الأساسية، المسؤول، ودورة المراجعة. يجب أن تكون معتمدة من الإدارة العليا، ومنشورة في أماكن بارزة، ومفهومة لجميع الموظفين. القائمة التالية تشمل السياسات الإلزامية التي ينبغي إعدادها خلال أول 90 يوماً من تأسيس القسم.",
    en: "Policies are reference documents that define the company's stance on each HSE aspect. Every policy here includes: Purpose, Scope, Core Principles, Owner, and Review Cycle. They must be approved by top management, posted in visible places, and understood by all employees. The following list contains the mandatory policies to be prepared within the first 90 days of department establishment.",
  },
  back:         { ar: "← HSE", en: "← HSE" },
  search:       { ar: "🔍 بحث في السياسات…", en: "🔍 Search policies…" },
  total:        { ar: "📋 الإجمالي:", en: "📋 Total:" },
  active:       { ar: "✅ معتمدة:", en: "✅ Active:" },
  draft:        { ar: "🟡 مسودة:", en: "🟡 Draft:" },
  review:       { ar: "🔵 قيد المراجعة:", en: "🔵 Under Review:" },
  expired:      { ar: "🔴 منتهية:", en: "🔴 Expired:" },
  expand:       { ar: "▼ التفاصيل الكاملة", en: "▼ Full details" },
  collapse:     { ar: "▲ إخفاء", en: "▲ Hide" },
  purpose:      { ar: "🎯 الغرض", en: "🎯 Purpose" },
  scope:        { ar: "📍 النطاق", en: "📍 Scope" },
  principles:   { ar: "📋 المبادئ الأساسية", en: "📋 Core Principles" },
  owner:        { ar: "👤 المسؤول", en: "👤 Owner" },
  reviewCycle:  { ar: "🔁 دورة المراجعة", en: "🔁 Review Cycle" },
  approve:      { ar: "اعتماد", en: "Approve" },
  edit:         { ar: "تعديل", en: "Edit" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  status:       { ar: "الحالة", en: "Status" },
  approvedDate: { ar: "تاريخ الاعتماد", en: "Approval Date" },
  reviewDate:   { ar: "تاريخ المراجعة القادمة", en: "Next Review Date" },
  approvedBy:   { ar: "اعتُمدت من", en: "Approved By" },
  notes:        { ar: "ملاحظات", en: "Notes" },
  approvedByPh: { ar: "اسم المعتمد", en: "Name of approver" },
  badgeActive:  { ar: "✅ معتمدة", en: "✅ Active" },
  badgeDraft:   { ar: "🟡 مسودة", en: "🟡 Draft" },
  badgeReview:  { ar: "🔵 قيد المراجعة", en: "🔵 Under Review" },
  badgeExpired: { ar: "🔴 منتهية", en: "🔴 Expired" },
  approvedOn:   { ar: "📅 اعتُمدت:", en: "📅 Approved:" },
  reviewOn:     { ar: "🔁 مراجعة قادمة:", en: "🔁 Next review:" },
  by:           { ar: "✍️ بواسطة:", en: "✍️ By:" },
  optDraft:     { ar: "🟡 مسودة", en: "🟡 Draft" },
  optReview:    { ar: "🔵 قيد المراجعة", en: "🔵 Under Review" },
  optActive:    { ar: "✅ معتمدة", en: "✅ Active" },
  optExpired:   { ar: "🔴 منتهية", en: "🔴 Expired" },
  linkedSops:   { ar: "📘 الإجراءات التي تطبّق هذه السياسة", en: "📘 Procedures that carry out this policy" },
  sopCount:     { ar: "إجراءات مرتبطة", en: "linked SOPs" },
  openSop:      { ar: "افتح الإجراء", en: "Open procedure" },
};

/* A policy says what the company commits to; its SOPs say how. Clicking a
   chip opens that SOP in the SOPs page (?tab=sops&sop=CODE inside the hub). */
function LinkedSops({ code, pick, onOpen, compact }) {
  const sops = sopsForPolicy(code).map(findSop).filter(Boolean);
  if (!sops.length) return null;
  if (compact) {
    return (
      <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "#e0e7ff", color: "#3730a3" }}>
        📘 {sops.length} {pick(T.sopCount)}
      </span>
    );
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 950, color: "#3730a3", marginBottom: 6 }}>{pick(T.linkedSops)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sops.map((s) => (
          <button key={s.code} type="button" onClick={() => onOpen(s.code)} title={pick(T.openSop)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 8,
              border: "1px solid #c7d2fe", background: "#eef2ff", color: "#312e81", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 700 }}>
            <b style={{ fontWeight: 900 }}>{s.code}</b> {pick(s.title)} ↗
          </button>
        ))}
      </div>
    </div>
  );
}


const TYPE = "policies_status";

export default function HSEPolicies() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [statuses, setStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchParams] = useSearchParams();
  const openSop = (code) => navigate(`/hse?tab=sops&sop=${encodeURIComponent(code)}`);

  // ?policy=CODE (from a SOP's "implements" chip) opens that policy and scrolls to it.
  const wantedPolicy = searchParams.get("policy");
  useEffect(() => {
    const p = wantedPolicy && POLICIES.find((x) => x.code === wantedPolicy);
    if (!p) return;
    setExpandedId(p.id);
    setTimeout(() => document.getElementById(`pol-${p.code}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [wantedPolicy]);
  const [draft, setDraft] = useState({ approvedDate: "", reviewDate: "", approvedBy: "", status: "draft", notes: "" });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    const map = {};
    arr.forEach((s) => { if (s.policyId) map[s.policyId] = s; });
    setStatuses(map);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(p) {
    setEditingId(p.id);
    const existing = statuses[p.id] || {};
    setDraft({
      approvedDate: existing.approvedDate || todayISO(),
      reviewDate: existing.reviewDate || "",
      approvedBy: existing.approvedBy || "",
      status: existing.status || "active",
      notes: existing.notes || "",
    });
  }

  async function saveStatus(p) {
    setSaving(true);
    try {
      const existing = statuses[p.id];
      const payload = { ...draft, policyId: p.id, code: p.code, titleAr: p.title.ar, titleEn: p.title.en };
      if (existing && existing.id) {
        await apiUpdate(TYPE, existing.id, payload, draft.approvedBy || "HSE");
      } else {
        await apiSave(TYPE, payload, draft.approvedBy || "HSE");
      }
      await reload();
      setEditingId(null);
    } catch (e) {
      alert((lang === "ar" ? "❌ خطأ بالحفظ: " : "❌ Save error: ") + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = POLICIES.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.title.ar.includes(search) || p.title.en.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
  });

  const statBg = (st) => ({ active: "#dcfce7", draft: "#fef9c3", review: "#dbeafe", expired: "#fee2e2" }[st] || "#f1f5f9");
  const statColor = (st) => ({ active: "#166534", draft: "#854d0e", review: "#1e40af", expired: "#7f1d1d" }[st] || "#475569");
  const badgeText = (st) => st === "active" ? pick(T.badgeActive) : st === "draft" ? pick(T.badgeDraft) : st === "review" ? pick(T.badgeReview) : pick(T.badgeExpired);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, fontWeight: 700, color: HSE_COLORS.primaryDark, flexWrap: "wrap" }}>
            <span>{pick(T.total)} {POLICIES.length}</span>
            <span>{pick(T.active)} {Object.values(statuses).filter((s) => s.status === "active").length}</span>
            <span>{pick(T.draft)} {Object.values(statuses).filter((s) => s.status === "draft").length}</span>
            <span>{pick(T.review)} {Object.values(statuses).filter((s) => s.status === "review").length}</span>
            <span>{pick(T.expired)} {Object.values(statuses).filter((s) => s.status === "expired").length}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((p) => {
            const st = statuses[p.id];
            const isEdit = editingId === p.id;
            return (
              <div key={p.id} id={`pol-${p.code}`} style={{ ...cardStyle, padding: 16, ...(wantedPolicy === p.code ? { borderColor: "#6366f1", boxShadow: "0 0 0 3px rgba(99,102,241,.18)" } : null) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 8, background: "rgba(254, 215, 170, 0.80)", color: HSE_COLORS.primaryDark }}>{p.code}</span>
                      <span style={{ fontWeight: 950, fontSize: 15 }}>{pick(p.title)}</span>
                      <LinkedSops code={p.code} pick={pick} compact />
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.6 }}>{pick(p.desc)}</div>
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      style={{ marginTop: 10, padding: "5px 12px", borderRadius: 8, background: "#fff7ed", color: HSE_COLORS.primaryDark, border: "1px solid rgba(120,53,15,0.18)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      {expandedId === p.id ? pick(T.collapse) : pick(T.expand)}
                    </button>
                  </div>

                  <div style={{ minWidth: 140, textAlign: dir === "rtl" ? "left" : "right" }}>
                    {st?.status && (
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: statBg(st.status), color: statColor(st.status), fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                        {badgeText(st.status)}
                      </span>
                    )}
                    <div>
                      {!isEdit && (
                        <button style={buttonGhost} onClick={() => startEdit(p)}>
                          {st ? pick(T.edit) : pick(T.approve)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded full details */}
                {expandedId === p.id && (
                  <div style={{ marginTop: 14, padding: 14, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                    {p.purpose && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#1e40af", marginBottom: 4 }}>{pick(T.purpose)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.purpose)}</div>
                      </div>
                    )}
                    {p.scope && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#9a3412", marginBottom: 4 }}>{pick(T.scope)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.scope)}</div>
                      </div>
                    )}
                    <LinkedSops code={p.code} pick={pick} onOpen={openSop} />
                    {p.principles && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#166534", marginBottom: 4 }}>{pick(T.principles)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.principles)}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 6 }}>
                      {p.owner && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 950, color: "#7c3aed", marginBottom: 2 }}>{pick(T.owner)}</div>
                          <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(p.owner)}</div>
                        </div>
                      )}
                      {p.review && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 950, color: "#7c3aed", marginBottom: 2 }}>{pick(T.reviewCycle)}</div>
                          <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(p.review)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isEdit && st && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#fff7ed", border: "1px dashed rgba(120,53,15,0.18)", fontSize: 12, color: "#7c2d12", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>{pick(T.approvedOn)} <b>{st.approvedDate || "—"}</b></span>
                    <span>{pick(T.reviewOn)} <b>{st.reviewDate || "—"}</b></span>
                    <span>{pick(T.by)} <b>{st.approvedBy || "—"}</b></span>
                    {st.notes && <span>📝 {st.notes}</span>}
                  </div>
                )}

                {isEdit && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#fff7ed", border: "1px solid rgba(120,53,15,0.18)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>{pick(T.status)}</label>
                        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={inputStyle}>
                          <option value="draft">{pick(T.optDraft)}</option>
                          <option value="review">{pick(T.optReview)}</option>
                          <option value="active">{pick(T.optActive)}</option>
                          <option value="expired">{pick(T.optExpired)}</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{pick(T.approvedDate)}</label>
                        <input type="date" value={draft.approvedDate} onChange={(e) => setDraft({ ...draft, approvedDate: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{pick(T.reviewDate)}</label>
                        <input type="date" value={draft.reviewDate} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{pick(T.approvedBy)}</label>
                        <input type="text" placeholder={pick(T.approvedByPh)} value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{pick(T.notes)}</label>
                      <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => saveStatus(p)} disabled={saving}>
                        {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.save)}
                      </button>
                      <button style={buttonGhost} onClick={() => setEditingId(null)} disabled={saving}>{pick(T.cancel)}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
