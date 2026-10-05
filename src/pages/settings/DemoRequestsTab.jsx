// src/pages/settings/DemoRequestsTab.jsx
// Platform Center → Demo Requests. Every request left on the public /demo
// page, with a sales status the owner moves along by hand and free notes.
// English or Arabic — whichever the Platform Center's one language button
// is set to (useSettingsLang); never both side by side.
//
// Server: GET /api/demo-requests, PATCH /api/demo-requests/:id,
// DELETE /api/demo-requests/:id (super-admin only). See
// routes/demoRequests.cjs in the inspection-server repo.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, ConfirmModal, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang } from "./_shared/settingsI18n";
import { DEMO_ACTIVITIES, DEMO_EMIRATES } from "../DemoRequest";
import { levelOf, scoreAnswers } from "../readiness/readinessQuestions";
import { getPublicOrigin } from "../../config/publicOrigin";
import VisitorStats from "./VisitorStats";

export const DEMO_STATUSES = [
  { v: "new",       label: "New",             ar: "جديد",          color: "#2563eb", bg: "#dbeafe" },
  { v: "contacted", label: "Contacted",       ar: "تم التواصل",    color: "#7c3aed", bg: "#ede9fe" },
  { v: "demo_done", label: "Demo done",       ar: "تم العرض",      color: "#0891b2", bg: "#cffafe" },
  { v: "trial",     label: "On trial",        ar: "تجربة",         color: "#d97706", bg: "#fef3c7" },
  { v: "won",       label: "Won (customer)",  ar: "اشترك",         color: "#059669", bg: "#d1fae5" },
  { v: "lost",      label: "Lost",            ar: "مرفوض",         color: "#64748b", bg: "#f1f5f9" },
];
const statusMeta = (v) => DEMO_STATUSES.find((s) => s.v === v) || DEMO_STATUSES[0];
const pick = (lang, o, enKey = "en") => (o ? (lang === "ar" ? o.ar || o[enKey] : o[enKey]) : "");
const activityLabel = (v, lang) => pick(lang, DEMO_ACTIVITIES.find((a) => a.v === v)) || v || "—";
const emirateLabel = (v, lang) => pick(lang, DEMO_EMIRATES.find((a) => a.v === v)) || v || "—";
const statusLabel = (v, lang) => pick(lang, statusMeta(v), "label");

/* One helper for every string on this screen. */
function useL() {
  const { lang } = useSettingsLang();
  const L = useCallback((en, ar) => (lang === "ar" ? ar : en), [lang]);
  return { L, lang };
}

/* Rows come back snake_case from Postgres; accept camelCase too. */
const norm = (r = {}) => ({
  id: r.id,
  createdAt: r.created_at || r.createdAt || "",
  status: r.status || "new",
  notes: r.notes || "",
  companyName: r.company_name || r.companyName || "",
  activity: r.activity || "",
  branches: r.branches || "",
  contactName: r.contact_name || r.contactName || "",
  jobTitle: r.job_title || r.jobTitle || "",
  phone: r.phone || "",
  email: r.email || "",
  emirate: r.emirate || "",
  message: r.message || "",
  source: r.source || "",
  referrer: r.referrer || "",
  lang: r.lang || "",
  referredBy: r.referred_by || r.referredBy || "",
  promoCode: r.promo_code || r.promoCode || "",
  // Set only on leads from the /readiness check.
  quizScore: Number.isInteger(r.quiz_score ?? r.quizScore) ? (r.quiz_score ?? r.quizScore) : null,
  quizAnswers: r.quiz_answers || r.quizAnswers || null,
});

const fmtWhen = (iso, lang) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const waLink = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "971" + d.slice(1); // local UAE number
  return d ? `https://wa.me/${d}` : "";
};
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/* Ready-made tracked links, one per place the owner posts on LinkedIn. The
   `src` is what the /demo page saves on the request ("via linkedin-post"). */
const SHARE_LINKS = [
  { src: "linkedin-post",    en: "LinkedIn post",         ar: "منشور لينكدإن",     hint: "A normal post on your feed",                  hintAr: "منشور عادي على صفحتك" },
  { src: "linkedin-profile", en: "LinkedIn profile",      ar: "البروفايل",         hint: "Website / Featured section of your profile",  hintAr: "قسم الموقع / Featured في بروفايلك" },
  { src: "linkedin-dm",      en: "LinkedIn message",      ar: "رسالة خاصة",        hint: "Private messages to people you contact",      hintAr: "رسائل خاصة للناس اللي بتتواصل معهم" },
  { src: "linkedin-page",    en: "LinkedIn company page", ar: "صفحة الشركة",       hint: "Your company page's website button",          hintAr: "زر الموقع على صفحة شركتك" },
  { src: "linkedin-group",   en: "LinkedIn group",        ar: "مجموعات لينكدإن",   hint: "Posts inside groups",                         hintAr: "منشورات داخل المجموعات" },
  { src: "linkedin-ads",     en: "LinkedIn ads",          ar: "إعلانات ممولة",     hint: "Paid campaigns",                              hintAr: "حملات مدفوعة" },
];
const slugSrc = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

async function readJson(res, fallback) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `${fallback} (${res.status})`);
  return j;
}

export default function DemoRequestsTab() {
  const { L, lang } = useL();
  const { dir } = useSettingsLang();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [waClicks, setWaClicks] = useState({});
  const [whatsapp, setWhatsapp] = useState("");
  const [promoConfig, setPromoConfig] = useState({});
  const [quizStats, setQuizStats] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests`, { cache: "no-store" });
      if (res.status === 404) throw new Error(L("The server has no /api/demo-requests yet — deploy the server part first.", "السيرفر ما فيه /api/demo-requests لسا — انشر جزء السيرفر أولاً."));
      const j = await readJson(res, L("Could not load demo requests", "تعذّر تحميل الطلبات"));
      setRows((j.requests || j.data || []).map(norm));
      setWaClicks(j.waClicks && typeof j.waClicks === "object" ? j.waClicks : {});
      setWhatsapp(String(j.whatsapp || ""));
      setPromoConfig(j.config && typeof j.config === "object" ? j.config : {});
      setQuizStats(j.quizStats && typeof j.quizStats === "object" ? j.quizStats : {});
      setMsg(null);
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const patch = async (id, body, okText) => {
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJson(res, L("Update failed", "فشل التحديث"));
      const updated = j.request ? norm(j.request) : null;
      setRows((prev) => prev.map((r) => (r.id === id ? (updated || { ...r, ...body }) : r)));
      if (okText) setMsg({ kind: "ok", text: `✅ ${okText}` });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
      await readJson(res, L("Delete failed", "فشل الحذف"));
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMsg({ kind: "ok", text: `✅ ${L("Request deleted.", "انحذف الطلب.")}` });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    }
  };

  const counts = useMemo(() => {
    const c = Object.fromEntries(DEMO_STATUSES.map((s) => [s.v, 0]));
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    c.thisMonth = rows.filter((r) => new Date(r.createdAt) >= monthStart).length;
    const decided = c.won + c.lost;
    c.winRate = decided ? Math.round((c.won / decided) * 100) : null;
    const sumOf = (prefix) => Object.entries(quizStats).reduce((a, [k, v]) => a + (k.startsWith(prefix) ? Number(v) || 0 : 0), 0);
    c.quizDone = sumOf("done:");
    c.quizLeads = rows.filter((r) => r.quizScore != null).length;
    return c;
  }, [rows, quizStats]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || r.status === filter)
      .filter((r) => !q || [r.companyName, r.contactName, r.phone, r.email, r.notes, r.source, r.promoCode]
        .some((v) => String(v).toLowerCase().includes(q)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [rows, filter, query]);

  const exportCsv = () => {
    const head = lang === "ar"
      ? ["التاريخ", "الحالة", "الشركة", "النشاط", "الفروع", "الإمارة", "جهة التواصل", "المسمى", "الهاتف", "الإيميل", "الرسالة", "المصدر", "كود الخصم", "الملاحظات"]
      : ["Date", "Status", "Company", "Business type", "Branches", "Emirate", "Contact", "Job title", "Phone", "Email", "Message", "Source", "Promo code", "Notes"];
    const lines = shown.map((r) => [
      fmtWhen(r.createdAt, lang), statusLabel(r.status, lang), r.companyName, activityLabel(r.activity, lang), r.branches,
      emirateLabel(r.emirate, lang), r.contactName, r.jobTitle, r.phone, r.email, r.message, r.source, r.promoCode, r.notes,
    ].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [head.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `demo-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const publicUrl = `${getPublicOrigin()}/demo`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setMsg({ kind: "ok", text: `✅ ${L("Copied", "انتسخ")} ${publicUrl}` }); }
    catch { setMsg({ kind: "info", text: publicUrl }); }
  };

  return (
    <div style={ui.page} dir={dir}>
      {/* The Platform Center header already names this tab — only the link and actions here. */}
      <div style={ui.toolbar}>
        <p style={{ ...ui.subtitle, margin: 0 }}>
          {L("Public page:", "الصفحة العامة:")} <b dir="ltr">{publicUrl}</b> — {L("add", "أضف")} <code>?src=linkedin</code>{" "}
          {L("(or any name) to the link you share, to see which channel each request came from.",
            "(أو أي اسم) للرابط اللي بتشاركه، لتعرف كل طلب من وين إجا.")}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={copyLink}>🔗 {L("Copy public link", "نسخ الرابط العام")}</Button>
          <Button onClick={exportCsv} disabled={!shown.length}>⬇ CSV</Button>
          <Button tone="primary" onClick={load} disabled={loading}>↻ {L("Refresh", "تحديث")}</Button>
        </div>
      </div>

      <StatusMessage message={msg} />

      <WhatsAppSetting saved={whatsapp} onSaved={setWhatsapp} setMsg={setMsg} />

      <PromoSettings saved={promoConfig} onSaved={setPromoConfig} setMsg={setMsg} />

      <VisitorStats />

      <ShareLinks origin={getPublicOrigin()} rows={rows} waClicks={waClicks} quizStats={quizStats} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label={L("Total", "الكل")} value={rows.length} color="#0f766e" />
        <Stat label={L("This month", "هالشهر")} value={counts.thisMonth} color="#0891b2" />
        <Stat label={L("New (not contacted)", "جديدة (ما تواصلنا)")} value={counts.new} color="#2563eb" />
        <Stat label={L("Won", "اشتركوا")} value={counts.won} color="#059669" />
        <Stat label={L("Win rate", "نسبة الاشتراك")} value={counts.winRate == null ? "—" : `${counts.winRate}%`} color="#7c3aed" />
        <Stat label={L("Readiness checks finished", "فحوصات جاهزية مكتملة")} value={counts.quizDone} color="#d97706" />
        <Stat
          label={L("Checks → left their number", "فحص ← تركوا رقمهم")}
          value={counts.quizDone ? `${Math.min(100, Math.round((counts.quizLeads / counts.quizDone) * 100))}%` : "—"}
          color="#b45309"
        />
        <Stat label={L("WhatsApp taps", "ضغطات واتساب")} value={Object.values(waClicks).reduce((a, b) => a + (Number(b) || 0), 0)} color="#15803d" />
      </div>

      <div style={{ ...ui.toolbar, justifyContent: "flex-start" }}>
        <Chip on={filter === "all"} onClick={() => setFilter("all")} label={`${L("All", "الكل")} (${rows.length})`} />
        {DEMO_STATUSES.map((s) => (
          <Chip key={s.v} on={filter === s.v} onClick={() => setFilter(s.v)} label={`${statusLabel(s.v, lang)} (${counts[s.v] || 0})`} color={s.color} />
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L("Search company, name, phone, notes…", "ابحث بالشركة، الاسم، الهاتف، الملاحظات…")}
          style={{ ...ui.input, flex: "1 1 220px", maxWidth: 360, minHeight: 38, marginInlineStart: "auto" }}
        />
      </div>

      {loading ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>{L("Loading…", "جاري التحميل…")}</div>
      ) : !shown.length ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>
          {rows.length
            ? L("No requests match this filter.", "ما في طلبات بهالفلتر.")
            : L("No demo requests yet. Share the public link to start collecting them.", "ما في طلبات بعد. شارك الرابط العام لتبلّش توصلك.")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((r) => {
            const st = statusMeta(r.status);
            const open = openId === r.id;
            const draft = notesDraft[r.id] ?? r.notes;
            const wa = waLink(r.phone);
            return (
              <div key={r.id} style={{ ...ui.card, marginBottom: 0, padding: 14, borderInlineStart: `4px solid ${st.color}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0, cursor: "pointer" }} onClick={() => setOpenId(open ? null : r.id)}>
                    <div style={{ fontWeight: 1000, fontSize: 17 }}>
                      {r.quizScore != null && <ScoreBadge score={r.quizScore} />}
                      {r.companyName || "—"}
                      <span style={{ color: "#64748b", fontWeight: 700, fontSize: 13 }}>
                        {" "}· {activityLabel(r.activity, lang)}{r.branches ? ` · ${r.branches} ${L("branches", "فروع")}` : ""}{r.emirate ? ` · ${emirateLabel(r.emirate, lang)}` : ""}
                      </span>
                    </div>
                    <div style={{ color: "#334155", fontWeight: 750, marginTop: 3 }}>
                      {r.contactName}{r.jobTitle ? ` — ${r.jobTitle}` : ""}
                      <span style={{ color: "#94a3b8" }}> · {fmtWhen(r.createdAt, lang)}{r.source ? ` · ${L("via", "عبر")} ${r.source}` : ""}</span>
                      {r.referredBy && (
                        <span title={L("Referral: this company may earn the referral discount", "إحالة: الشركة اللي أحالت ممكن تستحق خصم الإحالة")} style={{ marginInlineStart: 8, padding: "1px 8px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 900, fontSize: 12.5 }}>
                          🤝 {r.referredBy}
                        </span>
                      )}
                      {r.promoCode && (
                        <span title={L("Came with this promo code (Platform Center → Promo Codes)", "إجا بهالكود (مركز المنصة ← أكواد الخصم)")} dir="ltr" style={{ marginInlineStart: 8, padding: "1px 8px", borderRadius: 999, background: "#ccfbf1", color: "#0f766e", fontWeight: 900, fontSize: 12.5 }}>
                          🏷️ {r.promoCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {r.phone && <a href={`tel:${r.phone}`} style={linkBtn} dir="ltr">📞 {r.phone}</a>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ ...linkBtn, color: "#15803d" }}>{L("WhatsApp", "واتساب")}</a>}
                    {r.email && <a href={`mailto:${r.email}`} style={linkBtn}>✉️ {L("Email", "إيميل")}</a>}
                    <select
                      value={r.status}
                      onChange={(e) => patch(r.id, { status: e.target.value }, `${r.companyName}: ${statusLabel(e.target.value, lang)}`)}
                      style={{ ...ui.input, width: "auto", minHeight: 38, fontWeight: 900, color: st.color, background: st.bg, borderColor: st.color }}
                    >
                      {DEMO_STATUSES.map((s) => <option key={s.v} value={s.v}>{statusLabel(s.v, lang)}</option>)}
                    </select>
                    <Button tone="muted" style={{ minHeight: 38 }} onClick={() => setOpenId(open ? null : r.id)}>{open ? "▲" : "▼"}</Button>
                  </div>
                </div>

                {open && (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {r.quizScore != null && <QuizGaps answers={r.quizAnswers} />}
                    {r.message && (
                      <div style={{ ...ui.subtleCard, marginBottom: 0, whiteSpace: "pre-wrap", fontWeight: 700 }}>
                        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>{L("THEIR MESSAGE", "رسالتهم")}</div>
                        {r.message}
                      </div>
                    )}
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 900, color: "#334155" }}>{L("Follow-up notes", "ملاحظات المتابعة")}</span>
                      <textarea
                        value={draft}
                        onChange={(e) => setNotesDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder={L("e.g. Called Sunday — wants a price for 3 branches, demo booked for Tuesday 11am",
                          "مثال: اتصلت الأحد — بدهم سعر لـ3 فروع، العرض يوم الثلاثاء الساعة 11")}
                        style={{ ...ui.input, minHeight: 80, resize: "vertical" }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13, alignSelf: "center" }}>
                        {r.email || L("no e-mail", "بدون إيميل")}
                        {r.referrer ? ` · ${L("came from", "إجا من")} ${r.referrer}` : ""}
                        {r.lang ? ` · ${L("page in", "لغة الصفحة")} ${r.lang.toUpperCase()}` : ""}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button tone="danger" onClick={() => setPendingDelete(r)}>{L("Delete", "حذف")}</Button>
                        <Button tone="primary" disabled={draft === r.notes} onClick={() => patch(r.id, { notes: draft }, L("Notes saved.", "انحفظت الملاحظات."))}>{L("Save notes", "حفظ الملاحظات")}</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title={L(`Delete the request from ${pendingDelete?.companyName || "this company"}?`, `حذف طلب ${pendingDelete?.companyName || "هالشركة"}؟`)}
        body={L("Use this for spam or duplicates. A company that said no is better kept as Lost, so it still counts in your win rate.",
          "استعمله للسبام أو المكرر بس. الشركة اللي رفضت خلّيها \"مرفوض\" حتى تنحسب بنسبة الاشتراك.")}
        confirmText={L("Delete", "حذف")}
        cancelText={L("Cancel", "إلغاء")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { const id = pendingDelete.id; setPendingDelete(null); remove(id); }}
      />
    </div>
  );
}

const linkBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "6px 12px", borderRadius: 8,
  border: "1px solid rgba(15,23,42,.14)", background: "#fff", color: "#0f172a", fontWeight: 900,
  textDecoration: "none", whiteSpace: "nowrap",
};

function Stat({ label, value, color }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, padding: "12px 14px", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 24, fontWeight: 1000, color }}>{value}</div>
      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12.5 }}>{label}</div>
    </div>
  );
}

/* The number behind the green WhatsApp button on /demo. Empty = no button. */
function WhatsAppSetting({ saved, onSaved, setMsg }) {
  const { L } = useL();
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(saved); }, [saved]);

  const save = async (value) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: value }),
      });
      if (res.status === 404) throw new Error(L("The server has no /api/demo-config yet — deploy the server part first.", "السيرفر ما فيه /api/demo-config لسا — انشر جزء السيرفر أولاً."));
      const j = await readJson(res, L("Could not save the WhatsApp number", "تعذّر حفظ رقم الواتساب"));
      onSaved(j.whatsapp || "");
      setMsg({ kind: "ok", text: j.whatsapp ? `✅ ${L("WhatsApp button is live:", "زر الواتساب شغّال:")} +${j.whatsapp}` : `✅ ${L("WhatsApp button hidden.", "انخفى زر الواتساب.")}` });
    } catch (e) {
      setMsg({ kind: "err", text: e.message === "invalid_whatsapp" ? `❌ ${L("That number does not look right (8–15 digits).", "الرقم مش مظبوط (8–15 رقم).")}` : `❌ ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...ui.card, padding: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 240px" }}>
        <div style={{ fontWeight: 1000 }}>💬 {L("WhatsApp button on /demo", "زر الواتساب على /demo")}</div>
        <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12.5 }}>
          {saved
            ? <>{L("Live:", "شغّال:")} <a href={`https://wa.me/${saved}`} target="_blank" rel="noreferrer" dir="ltr">+{saved}</a></>
            : L("Hidden — add a number to show it.", "مخفي — أضف رقم ليظهر.")}
        </div>
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="+971 5x xxx xxxx"
        dir="ltr"
        style={{ ...ui.input, flex: "1 1 180px", maxWidth: 240, minHeight: 38 }}
      />
      <Button tone="primary" style={{ minHeight: 38 }} disabled={busy || draft === saved} onClick={() => save(draft)}>{L("Save", "حفظ")}</Button>
      {saved && <Button tone="muted" style={{ minHeight: 38 }} disabled={busy} onClick={() => save("")}>{L("Hide", "إخفاء")}</Button>}
    </div>
  );
}

const SHARE_PAGES = [
  { v: "readiness", path: "/readiness", icon: "📊", en: "Readiness check", ar: "فحص الجاهزية" },
  { v: "demo",      path: "/demo",      icon: "📝", en: "Demo request",    ar: "طلب عرض" },
];

/* What the public /demo and /readiness pages advertise: the launch offer (no
   setup fee until a date), the referral discount, one real customer story, and
   up to six real customer testimonials.
   The server hides an offer by itself once its date has passed. */
const EMPTY_TM = { on: false, name: "", role: "", company: "", ar: "", en: "", stars: 5 };
const plusDays = (n) => new Date(Date.now() + 4 * 3600_000 + n * 864e5).toISOString().slice(0, 10);

function PromoToggle({ on, onChange, label }) {
  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 1000, cursor: "pointer", minWidth: 220 }}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
      {label}
    </label>
  );
}

function PromoSettings({ saved = {}, onSaved, setMsg }) {
  const { L } = useL();
  const init = () => ({
    offer: { on: !!saved.offer?.on, endsAt: saved.offer?.endsAt || plusDays(30) },
    referral: { on: !!saved.referral?.on, pct: saved.referral?.pct ?? 20, months: saved.referral?.months ?? 12 },
    story: { on: !!saved.story?.on, ar: saved.story?.ar || "", en: saved.story?.en || "" },
    testimonials: (Array.isArray(saved.testimonials) ? saved.testimonials : []).map((x) => ({ ...EMPTY_TM, ...x })),
  });
  const [d, setD] = useState(init);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setD(init()); }, [saved]);

  const put = (part, patch) => setD((x) => ({ ...x, [part]: { ...x[part], ...patch } }));
  const putTm = (i, patch) => setD((x) => ({ ...x, testimonials: x.testimonials.map((t, k) => (k === i ? { ...t, ...patch } : t)) }));
  const addTm = () => setD((x) => ({ ...x, testimonials: [...x.testimonials, { ...EMPTY_TM }].slice(0, 6) }));
  const dropTm = (i) => setD((x) => ({ ...x, testimonials: x.testimonials.filter((_, k) => k !== i) }));
  const today = plusDays(0);
  const expired = d.offer.on && d.offer.endsAt < today;

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        offer: d.offer,
        referral: { ...d.referral, pct: Number(d.referral.pct), months: Number(d.referral.months) },
        story: d.story,
        testimonials: d.testimonials.map((x) => ({ ...x, stars: Number(x.stars) || 5 })),
      };
      const res = await fetch(`${API_BASE}/api/demo-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJson(res, L("Could not save", "تعذّر الحفظ"));
      onSaved(j.config || {});
      setMsg({ kind: "ok", text: `✅ ${L("Offers saved — the public pages show them now.", "انحفظت العروض — الصفحات العامة بتعرضها هلّق.")}` });
    } catch (e) {
      const known = {
        invalid_offer_date: L("Pick an end date for the offer.", "اختار تاريخ نهاية للعرض."),
        invalid_referral_pct: L("The referral discount must be 1–100%.", "خصم الإحالة لازم يكون بين 1 و100%."),
      };
      setMsg({ kind: "err", text: `❌ ${known[e.message] || e.message}` });
    } finally {
      setBusy(false);
    }
  };

  const liveTm = (saved.testimonials || []).filter((x) => x?.on && x.name && (x.ar || x.en)).length;
  const liveBits = [
    saved.offer?.on && saved.offer?.endsAt >= today && `🎁 ${L("no setup fee until", "بدون رسوم تأسيس لغاية")} ${saved.offer.endsAt}`,
    saved.referral?.on && `🤝 ${saved.referral.pct}% ${L("referral", "إحالة")}`,
    saved.story?.on && (saved.story.ar || saved.story.en) && `💬 ${L("story", "قصة")}`,
    liveTm > 0 && `⭐ ${liveTm} ${L("testimonials", "آراء عملاء")}`,
  ].filter(Boolean);

  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid rgba(15,23,42,.08)" };
  return (
    <div style={{ ...ui.card, padding: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 10 }}
      >
        <span>
          <span style={{ fontWeight: 1000, fontSize: 16 }}>🎁 {L("Offers on the public pages", "العروض على الصفحات العامة")}</span>
          <span style={{ display: "block", color: "#64748b", fontWeight: 700, fontSize: 12.5 }}>
            {liveBits.length ? `${L("Live:", "شغّال:")} ${liveBits.join(" · ")}` : L("Nothing switched on.", "ولا شي مفعّل.")}
          </span>
        </span>
        <span style={{ color: "#64748b" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={row}>
            <PromoToggle on={d.offer.on} onChange={(v) => put("offer", { on: v })} label={L("No setup fee", "إعفاء من رسوم التأسيس")} />
            <span style={{ fontWeight: 800, color: "#475569" }}>{L("until", "لغاية")}</span>
            <input type="date" value={d.offer.endsAt} min={today} onChange={(e) => put("offer", { endsAt: e.target.value })} style={{ ...ui.input, width: "auto", minHeight: 38 }} />
            <Button tone="muted" style={{ minHeight: 36 }} onClick={() => put("offer", { endsAt: plusDays(30) })}>{L("+1 month from today", "+شهر من اليوم")}</Button>
            {expired && <span style={{ color: "#dc2626", fontWeight: 900 }}>{L("Date has passed — visitors no longer see it.", "التاريخ مرق — الزوار ما عاد يشوفوه.")}</span>}
          </div>

          <div style={row}>
            <PromoToggle on={d.referral.on} onChange={(v) => put("referral", { on: v })} label={L("Referral discount", "خصم الإحالة")} />
            <input type="number" min={1} max={100} value={d.referral.pct} onChange={(e) => put("referral", { pct: e.target.value })} style={{ ...ui.input, width: 80, minHeight: 38 }} />
            <span style={{ fontWeight: 800, color: "#475569" }}>{L("% for", "% لمدة")}</span>
            <input type="number" min={1} max={60} value={d.referral.months} onChange={(e) => put("referral", { months: e.target.value })} style={{ ...ui.input, width: 80, minHeight: 38 }} />
            <span style={{ fontWeight: 800, color: "#475569" }}>{L("months, to the customer who referred the new one", "شهر، للعميل اللي جاب العميل الجديد")}</span>
          </div>

          <div style={{ ...row, alignItems: "flex-start" }}>
            <PromoToggle on={d.story.on} onChange={(v) => put("story", { on: v })} label={L("Customer story", "قصة عميل")} />
            <div style={{ flex: "1 1 320px", display: "grid", gap: 8 }}>
              {/* Two boxes on purpose: each one is shown on the public page of its own language. */}
              <textarea
                dir="rtl" value={d.story.ar} maxLength={600} onChange={(e) => put("story", { ar: e.target.value })}
                placeholder="بالعربية الفصحى — مثال: اكتشف أحد فروعنا منتجًا منتهي الصلاحية قبل وصوله إلى العميل بفضل تنبيه النظام."
                style={{ ...ui.input, minHeight: 70, resize: "vertical" }}
              />
              <textarea
                dir="ltr" value={d.story.en} maxLength={600} onChange={(e) => put("story", { en: e.target.value })}
                placeholder="In English — shown on the English page"
                style={{ ...ui.input, minHeight: 70, resize: "vertical" }}
              />
              <span style={{ color: "#b45309", fontWeight: 800, fontSize: 12.5 }}>
                {L("Only a story that really happened, with the customer's permission — each language shows on its own page.",
                  "بس قصة صارت فعلاً، وبإذن العميل — كل لغة بتنعرض على صفحتها.")}
              </span>
            </div>
          </div>

          <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 1000 }}>⭐ {L("Customer testimonials (\"What our customers say\" on /demo)", "آراء العملاء (قسم «ماذا يقول عملاؤنا» على /demo)")}</span>
              <Button tone="muted" style={{ minHeight: 36 }} disabled={d.testimonials.length >= 6} onClick={addTm}>➕ {L("Add testimonial", "إضافة رأي")}</Button>
            </div>
            <span style={{ color: "#b45309", fontWeight: 800, fontSize: 12.5 }}>
              {L("Real customers only, with their permission. The section stays hidden until one is switched on; each quote shows only on the page of its language.",
                "بس عملاء حقيقيين وبإذنهم. القسم مخفي لحتى تفعّل رأي واحد؛ وكل نص بينعرض بس على صفحة لغته.")}
            </span>
            {d.testimonials.map((x, i) => (
              <div key={i} style={{ display: "grid", gap: 8, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: x.on ? "#f0fdfa" : "#f8fafc" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <PromoToggle on={x.on} onChange={(v) => putTm(i, { on: v })} label={L("Show", "عرض")} />
                  <input value={x.name} maxLength={80} onChange={(e) => putTm(i, { name: e.target.value })} placeholder={L("Name", "الاسم")} style={{ ...ui.input, flex: "1 1 160px", minHeight: 38 }} />
                  <input value={x.role} maxLength={80} onChange={(e) => putTm(i, { role: e.target.value })} placeholder={L("Job title", "المسمى الوظيفي")} style={{ ...ui.input, flex: "1 1 140px", minHeight: 38 }} />
                  <input value={x.company} maxLength={100} onChange={(e) => putTm(i, { company: e.target.value })} placeholder={L("Company", "الشركة")} style={{ ...ui.input, flex: "1 1 160px", minHeight: 38 }} />
                  <select value={x.stars} onChange={(e) => putTm(i, { stars: Number(e.target.value) })} style={{ ...ui.input, width: "auto", minHeight: 38 }}>
                    {[5, 4, 3].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                  </select>
                  <Button tone="muted" style={{ minHeight: 36 }} onClick={() => dropTm(i)}>✕</Button>
                </div>
                <textarea dir="ltr" value={x.en} maxLength={400} onChange={(e) => putTm(i, { en: e.target.value })} placeholder="Quote in English — shown on the English page" style={{ ...ui.input, minHeight: 60, resize: "vertical" }} />
                <textarea dir="rtl" value={x.ar} maxLength={400} onChange={(e) => putTm(i, { ar: e.target.value })} placeholder="النص بالعربية — يظهر على الصفحة العربية" style={{ ...ui.input, minHeight: 60, resize: "vertical" }} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.08)" }}>
            <Button tone="muted" disabled={busy} onClick={() => setD(init())}>{L("Reset", "تراجع")}</Button>
            <Button tone="primary" disabled={busy} onClick={save}>{busy ? L("Saving…", "جاري الحفظ…") : L("Save offers", "حفظ العروض")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareLinks({ origin, rows, waClicks = {}, quizStats = {} }) {
  const { L, lang } = useL();
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState("readiness");
  const publicUrl = origin + (SHARE_PAGES.find((p) => p.v === page)?.path || "/demo");
  const isQuiz = page === "readiness";
  const [copied, setCopied] = useState("");
  const [custom, setCustom] = useState("");

  const bySource = useMemo(() => {
    const c = {};
    rows
      .filter((r) => (r.quizScore != null) === isQuiz)
      .forEach((r) => { const s = slugSrc(r.source); if (s) c[s] = (c[s] || 0) + 1; });
    return c;
  }, [rows, isQuiz]);

  const linkOf = (src) => `${publicUrl}?src=${encodeURIComponent(src)}`;
  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* shown on screen anyway */ }
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((k) => (k === key ? "" : k)), 1800);
  };

  const customSrc = slugSrc(custom);
  const Row = ({ k, label, sub, src }) => {
    const url = linkOf(src);
    const n = bySource[src] || 0;
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid rgba(15,23,42,.08)" }}>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{label}</div>
          {sub && <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12.5 }}>{sub}</div>}
        </div>
        <code dir="ltr" style={{ flex: "2 1 260px", minWidth: 0, overflowWrap: "anywhere", background: "#f1f5f9", borderRadius: 6, padding: "6px 8px", fontSize: 12.5 }}>{url}</code>
        <span title={L("Requests that came from this link", "الطلبات اللي إجت من هالرابط")} style={{ fontWeight: 900, color: n ? "#059669" : "#94a3b8", minWidth: 70, textAlign: "center" }}>
          {n} {lang === "ar" ? "طلب" : n === 1 ? "request" : "requests"}
        </span>
        {isQuiz && (
          <span title={L("Opened the check → finished it", "فتحوا الفحص ← كمّلوه")} style={{ fontWeight: 900, color: quizStats[`start:${src}`] ? "#b45309" : "#94a3b8", minWidth: 80, textAlign: "center" }}>
            ▶ {quizStats[`start:${src}`] || 0} → ✓ {quizStats[`done:${src}`] || 0}
          </span>
        )}
        <span title={L("WhatsApp taps from this link", "ضغطات الواتساب من هالرابط")} style={{ fontWeight: 900, color: waClicks[src] ? "#15803d" : "#94a3b8", minWidth: 60, textAlign: "center" }}>
          💬 {waClicks[src] || 0}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Button tone={copied === k ? "primary" : undefined} style={{ minHeight: 36 }} onClick={() => copy(url, k)}>
            {copied === k ? `✓ ${L("Copied", "انتسخ")}` : `📋 ${L("Copy", "نسخ")}`}
          </Button>
          {src.startsWith("linkedin") && (
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              target="_blank" rel="noreferrer" style={{ ...linkBtn, minHeight: 36, color: "#0a66c2" }}
              title={L("Open LinkedIn with this link ready to post", "افتح لينكدإن والرابط جاهز للنشر")}
            >
              in {L("Share", "مشاركة")}
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...ui.card, padding: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", fontWeight: 1000, fontSize: 16 }}
      >
        <span>🔗 {L("Ready links", "روابط جاهزة للنسخ")}</span>
        <span style={{ color: "#64748b" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 900 }}>{L("Page:", "الصفحة:")}</span>
            {SHARE_PAGES.map((p) => (
              <Chip key={p.v} on={page === p.v} onClick={() => setPage(p.v)} label={`${p.icon} ${lang === "ar" ? p.ar : p.en}`} />
            ))}
          </div>
          {/localhost|127\.0\.0\.1/.test(publicUrl) && (
            <div style={{ ...ui.subtleCard, marginBottom: 8, color: "#b45309", fontWeight: 800, fontSize: 13 }}>
              {L("You are on localhost — open this screen on the live site to copy links people outside can open.",
                "إنت على localhost — افتح هالشاشة من الموقع الحي لتنسخ روابط بيقدر يفتحها الناس من برّا.")}
            </div>
          )}
          {SHARE_LINKS.map((l) => (
            <Row key={l.src} k={l.src} src={l.src} label={lang === "ar" ? l.ar : l.en} sub={lang === "ar" ? l.hintAr : l.hint} />
          ))}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.08)" }}>
            <span style={{ fontWeight: 900 }}>{L("Other channel:", "قناة تانية:")}</span>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={L("e.g. whatsapp, instagram, expo-2026", "مثال: whatsapp، instagram، expo-2026")}
              dir="ltr"
              style={{ ...ui.input, flex: "1 1 200px", maxWidth: 300, minHeight: 36 }}
            />
          </div>
          {customSrc && <Row k="custom" src={customSrc} label={customSrc} />}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  const { L, lang } = useL();
  const l = levelOf(score);
  return (
    <span
      title={`${L("Readiness check", "فحص الجاهزية")}: ${lang === "ar" ? l.ar : l.en}`}
      style={{ display: "inline-block", marginInlineEnd: 8, padding: "2px 10px", borderRadius: 999, background: l.bg, color: l.color, fontWeight: 1000, fontSize: 13, verticalAlign: "middle" }}
    >
      📊 {score}/100
    </span>
  );
}

/* A readiness lead's weak areas, weakest first — what to open the call with. */
function QuizGaps({ answers }) {
  const { L, lang } = useL();
  const { gaps } = scoreAnswers(answers || {});
  if (!gaps.length) return null;
  return (
    <div style={{ ...ui.subtleCard, marginBottom: 0 }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>{L("WEAK AREAS FROM THEIR READINESS CHECK", "نقاط الضعف من فحص الجاهزية")}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {gaps.map((g) => (
          <div key={g.q.id} style={{ display: "flex", gap: 10, fontWeight: 750 }}>
            <b style={{ color: g.pts >= 5 ? "#d97706" : "#dc2626", minWidth: 44 }}>{g.pts}/10</b>
            <span><b>{lang === "ar" ? g.q.area.ar : g.q.area.en}</b> — {lang === "ar" ? g.opt.ar : g.opt.en}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, label, color = "#0f766e" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1.5px solid ${on ? color : "rgba(15,23,42,.14)"}`, background: on ? color : "#fff",
        color: on ? "#fff" : "#334155", borderRadius: 999, padding: "6px 12px", fontWeight: 900,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
