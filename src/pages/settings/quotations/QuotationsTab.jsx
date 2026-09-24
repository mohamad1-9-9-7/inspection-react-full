// src/pages/settings/quotations/QuotationsTab.jsx
// -----------------------------------------------------------------------------
// Settings → Billing & Plans → Quotations.
//
//   List   : every quotation with status, totals, search/filter and one-click
//            PDF / Excel / duplicate / delete.
//   Editor : pick a client company (auto-fills contact + industry), add its
//            dashboard cards / reports straight from the company's system,
//            add a plan or service presets, edit every line, and watch the
//            A4 document update live next to the form.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../../config/api";
import { industryOptions } from "../../../industries";
import { useSettingsLang } from "../_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "../_shared/SettingsUIKit";
import { logSettingsAudit } from "../../../utils/settingsAudit";
import {
  BILLING_CYCLES, CURRENCIES, DEFAULT_TERMS, LINE_KINDS, SERVICE_PRESETS, STATUSES, UNITS,
  apiDeleteQuote, apiListQuotes, apiSaveQuote, computeTotals, cycleById, dmy, emptyLine,
  emptyQuote, fmtMoney, isExpired, lineTotal, moduleCatalog, newLineId, nextQuoteNumber,
  num, statusById, todayISO, validUntil,
} from "./quotationCore";
import { buildQuoteHtml, downloadQuotePdf, downloadQuoteXlsx, printQuote } from "./quotationExport";

/* ═══════════════════════════ Root ═══════════════════════════ */

export default function QuotationsTab() {
  const { t, dir } = useSettingsLang();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null); // quote object | null
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [profile, setProfile] = useState(null);

  const flash = useCallback((m) => { setMsg(m); if (m) setTimeout(() => setMsg(""), 3500); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, c, p, bp] = await Promise.all([
      apiListQuotes().catch((e) => { flash(`❌ ${e.message}`); return []; }),
      fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/api/plans`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/api/billing-profile`).then((r) => r.json()).catch(() => ({})),
    ]);
    setQuotes(q);
    setCompanies(c?.ok ? c.companies || [] : []);
    setPlans(p?.ok ? (p.plans || []).filter((x) => x.is_active !== false) : []);
    setProfile(bp?.profile || bp?.data || null);
    setLoading(false);
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const withIssuer = (q) => ({
    ...q,
    issuerName: q.issuerName || profile?.company_name || "",
    issuerAddress: q.issuerAddress || profile?.company_address || "",
    issuerTaxId: q.issuerTaxId || profile?.tax_id || "",
    issuerEmail: q.issuerEmail || profile?.contact_email || "",
    issuerPhone: q.issuerPhone || profile?.contact_phone || "",
  });

  const startNew = () => setEditing(withIssuer({ ...emptyQuote(), number: nextQuoteNumber(quotes) }));

  const duplicate = (q) => setEditing(withIssuer({
    ...q,
    id: null,
    reportDate: undefined,
    number: nextQuoteNumber(quotes),
    status: "draft",
    issueDate: todayISO(),
    lines: q.lines.map((l) => ({ ...l, id: newLineId() })),
  }));

  const onSaved = (saved, { close } = {}) => {
    setQuotes((list) => {
      const rest = list.filter((x) => x.id !== saved.id);
      return [saved, ...rest].sort((a, b) =>
        String(b.issueDate).localeCompare(String(a.issueDate)) || String(b.number).localeCompare(String(a.number)));
    });
    if (close) setEditing(null); else setEditing(saved);
    flash(`✅ ${t({ en: "Quotation saved", ar: "تم حفظ العرض" })} — ${saved.number}`);
  };

  const onDelete = async (q) => {
    try {
      await apiDeleteQuote(q.id);
      await logSettingsAudit({ area: "quotations", action: "delete_quotation", target: q.number, before: q, after: null, reason: "Quotation deleted" }).catch(() => {});
      setQuotes((list) => list.filter((x) => x.id !== q.id));
      flash(`✅ ${t({ en: "Quotation deleted", ar: "تم حذف العرض" })}`);
    } catch (e) { flash(`❌ ${e.message}`); }
  };

  if (editing) {
    return (
      <QuoteEditor
        initial={editing}
        companies={companies}
        plans={plans}
        existing={quotes}
        onCancel={() => setEditing(null)}
        onSaved={onSaved}
        onDuplicate={duplicate}
      />
    );
  }

  return (
    <div style={ui.page} dir={dir}>
      <QuoteList
        quotes={quotes}
        loading={loading}
        msg={msg}
        onNew={startNew}
        onOpen={(q) => setEditing(q)}
        onDuplicate={duplicate}
        onDelete={onDelete}
        onRefresh={load}
        flash={flash}
      />
    </div>
  );
}

/* ═══════════════════════════ List ═══════════════════════════ */

/* A draft/sent quotation past its validity date shows as "Expired". */
const effStatus = (q) => (isExpired(q) && q.status !== "expired" ? "expired" : q.status);

function QuoteList({ quotes, loading, msg, onNew, onOpen, onDuplicate, onDelete, onRefresh, flash }) {
  const { t, lang } = useSettingsLang();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState("");

  const rows = useMemo(() => {
    const s = query.trim().toLowerCase();
    return quotes.filter((q) => {
      if (status !== "all" && effStatus(q) !== status) return false;
      if (!s) return true;
      return [q.number, q.clientName, q.clientContact, q.clientEmail, q.title].some((x) => String(x || "").toLowerCase().includes(s));
    });
  }, [quotes, query, status]);

  const kpi = useMemo(() => {
    const open = quotes.filter((q) => ["draft", "sent"].includes(effStatus(q)));
    const accepted = quotes.filter((q) => q.status === "accepted");
    const sumBy = (list) => list.reduce((acc, q) => {
      const k = q.currency || "—";
      acc[k] = (acc[k] || 0) + computeTotals(q).contractValue;
      return acc;
    }, {});
    const fmt = (m) => Object.entries(m).map(([c, v]) => fmtMoney(v, c)).join(" · ") || "—";
    const decided = quotes.filter((q) => ["accepted", "rejected"].includes(q.status)).length;
    return {
      total: quotes.length,
      open: open.length,
      openValue: fmt(sumBy(open)),
      acceptedValue: fmt(sumBy(accepted)),
      winRate: decided ? `${Math.round((accepted.length / decided) * 100)}%` : "—",
    };
  }, [quotes]);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { flash(`❌ ${e?.message || e}`); }
    setBusy("");
  };

  return (
    <>
      <PageHeader
        eyebrow={t({ en: "Billing", ar: "الفوترة" })}
        title={t({ en: "Quotations", ar: "عروض الأسعار" })}
        subtitle={t({
          en: "Create professional quotations in minutes — pick a company, add its cards, set prices, then export to PDF or Excel.",
          ar: "أنشئ عروض أسعار احترافية بدقائق — اختر الشركة، أضف كروتها، حدّد الأسعار، ثم صدّر PDF أو Excel.",
        })}
        actions={<>
          <Button tone="secondary" onClick={onRefresh}>↻ {t({ en: "Refresh", ar: "تحديث" })}</Button>
          <Button tone="primary" onClick={onNew}>＋ {t({ en: "New quotation", ar: "عرض سعر جديد" })}</Button>
        </>}
      />
      <StatusMessage message={msg} />

      <div style={S.kpis}>
        <Kpi label={t({ en: "Quotations", ar: "العروض" })} value={kpi.total} />
        <Kpi label={t({ en: "Open (draft + sent)", ar: "مفتوحة (مسودة + مرسلة)" })} value={kpi.open} sub={kpi.openValue} />
        <Kpi label={t({ en: "Accepted value", ar: "قيمة المقبول" })} value={kpi.acceptedValue} small />
        <Kpi label={t({ en: "Win rate", ar: "نسبة القبول" })} value={kpi.winRate} />
      </div>

      <div style={{ ...ui.card, padding: 14 }}>
        <div style={ui.toolbar}>
          <input
            style={{ ...ui.input, maxWidth: 360 }}
            placeholder={t({ en: "Search number, client, contact…", ar: "ابحث بالرقم أو العميل أو الشخص…" })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ id: "all", en: "All", ar: "الكل" }, ...STATUSES].map((s) => (
              <button key={s.id} type="button" onClick={() => setStatus(s.id)} style={S.chip(status === s.id, s.tone)}>
                {lang === "ar" ? s.ar : s.en}
              </button>
            ))}
          </div>
        </div>

        <div style={ui.tableWrap}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>{t({ en: "No.", ar: "الرقم" })}</th>
                <th style={ui.th}>{t({ en: "Client", ar: "العميل" })}</th>
                <th style={ui.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                <th style={ui.th}>{t({ en: "Valid until", ar: "صالح حتى" })}</th>
                <th style={ui.th}>{t({ en: "Total / cycle", ar: "الإجمالي / الدورة" })}</th>
                <th style={ui.th}>{t({ en: "Status", ar: "الحالة" })}</th>
                <th style={{ ...ui.th, textAlign: "end" }}>{t({ en: "Actions", ar: "إجراءات" })}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", color: "#94a3b8" }}>{t({ en: "Loading…", ar: "جارِ التحميل…" })}</td></tr>
              )}
              {!loading && !rows.length && (
                <tr><td colSpan={7} style={{ ...ui.td, textAlign: "center", padding: 34, color: "#94a3b8" }}>
                  {quotes.length
                    ? t({ en: "No quotation matches the filter.", ar: "لا يوجد عرض يطابق البحث." })
                    : t({ en: "No quotations yet — press “New quotation” to create the first one.", ar: "لا توجد عروض بعد — اضغط «عرض سعر جديد» لإنشاء أول عرض." })}
                </td></tr>
              )}
              {rows.map((q) => {
                const tot = computeTotals(q);
                const cyc = cycleById(q.cycle);
                const st = statusById(effStatus(q));
                return (
                  <tr key={q.id} style={{ cursor: "pointer" }} onClick={() => onOpen(q)}>
                    <td style={{ ...ui.td, fontFamily: "Consolas, monospace", fontWeight: 900 }}>{q.number}</td>
                    <td style={ui.td}>
                      <div style={{ fontWeight: 900 }} dir="auto">{q.clientName || "—"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{(q.lines || []).length} {t({ en: "lines", ar: "بند" })}</div>
                    </td>
                    <td style={ui.td}>{dmy(q.issueDate)}</td>
                    <td style={ui.td}>{dmy(validUntil(q))}</td>
                    <td style={{ ...ui.td, whiteSpace: "nowrap" }}>
                      <b>{fmtMoney(tot.recurringTotal || tot.oneTimeTotal, q.currency)}</b>
                      <span style={{ color: "#64748b", fontSize: 12 }}> {tot.recurringTotal ? (lang === "ar" ? cyc.perAr : cyc.perEn) : ""}</span>
                    </td>
                    <td style={ui.td}><span style={S.pill(st)}>{lang === "ar" ? st.ar : st.en}</span></td>
                    <td style={{ ...ui.td, textAlign: "end", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <IconBtn title="PDF" disabled={!!busy} onClick={() => run(`pdf${q.id}`, () => downloadQuotePdf(q))}>{busy === `pdf${q.id}` ? "…" : "PDF"}</IconBtn>
                      <IconBtn title="Excel" disabled={!!busy} onClick={() => run(`x${q.id}`, () => downloadQuoteXlsx(q))}>{busy === `x${q.id}` ? "…" : "XLS"}</IconBtn>
                      <IconBtn title={t({ en: "Duplicate", ar: "نسخ" })} onClick={() => onDuplicate(q)}>⧉</IconBtn>
                      <IconBtn title={t({ en: "Delete", ar: "حذف" })} danger onClick={() => setConfirm(q)}>🗑</IconBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        title={t({ en: "Delete quotation?", ar: "حذف عرض السعر؟" })}
        body={confirm ? `${confirm.number} — ${confirm.clientName || ""}` : ""}
        confirmText={t({ en: "Delete", ar: "حذف" })}
        cancelText={t({ en: "Cancel", ar: "إلغاء" })}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const q = confirm; setConfirm(null); onDelete(q); }}
      />
    </>
  );
}

/* ═══════════════════════════ Editor ═══════════════════════════ */

/* Side-by-side preview only when there is room for it; below that the
   preview stacks under the form. */
function useIsWide(min = 1180) {
  const get = () => (typeof window !== "undefined" ? window.innerWidth >= min : true);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const on = () => setWide(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return wide;
}

function QuoteEditor({ initial, companies, plans, existing, onCancel, onSaved, onDuplicate }) {
  const { t, lang, dir } = useSettingsLang();
  const [q, setQ] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [picker, setPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [dirty, setDirty] = useState(false);
  const wide = useIsWide();

  useEffect(() => { setQ(initial); setDirty(false); }, [initial]);

  const set = (patch) => { setQ((cur) => ({ ...cur, ...patch })); setDirty(true); };
  const setLine = (id, patch) => set({ lines: q.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeLine = (id) => set({ lines: q.lines.filter((l) => l.id !== id) });
  const moveLine = (idx, delta) => {
    const next = [...q.lines];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    set({ lines: next });
  };
  const addLines = (lines) => set({ lines: [...q.lines, ...lines] });

  const totals = useMemo(() => computeTotals(q), [q]);
  const cyc = cycleById(q.cycle);
  const company = companies.find((c) => String(c.id) === String(q.companyId)) || null;
  const plan = company ? plans.find((p) => String(p.id) === String(company.plan_id)) : null;

  const pickCompany = (id) => {
    const c = companies.find((x) => String(x.id) === String(id));
    if (!c) { set({ companyId: null }); return; }
    set({
      companyId: c.id,
      clientName: c.name || "",
      clientContact: c.contact_name || "",
      clientEmail: c.contact_email || "",
      clientPhone: c.contact_phone || "",
      industry: c.industry || "meat",
    });
  };

  const addPlan = (p) => addLines([emptyLine({
    kind: "recurring",
    titleEn: `${p.name} plan`,
    titleAr: `باقة ${p.name}`,
    details: [p.description, p.max_branches ? `Up to ${p.max_branches} branches` : "", p.max_users ? `${p.max_users} users` : ""].filter(Boolean).join(" · "),
    qty: 1,
    unit: "service",
    unitPrice: p.price ?? "",
    source: `plan:${p.id}`,
  })]);

  const addPreset = (key) => {
    const p = SERVICE_PRESETS.find((x) => x.key === key);
    if (!p) return;
    addLines([emptyLine({ kind: p.kind, unit: p.unit, titleEn: p.titleEn, titleAr: p.titleAr, source: p.key })]);
  };

  const validate = () => {
    if (!q.clientName.trim()) return t({ en: "Enter the client name (or pick a company).", ar: "أدخل اسم العميل (أو اختر شركة)." });
    if (!q.number.trim()) return t({ en: "Enter the quotation number.", ar: "أدخل رقم العرض." });
    const dupe = existing.find((x) => x.number === q.number.trim() && x.id !== q.id);
    if (dupe) return t({ en: `Number ${q.number} is already used.`, ar: `الرقم ${q.number} مستخدم مسبقاً.` });
    if (!q.lines.length) return t({ en: "Add at least one line.", ar: "أضف بنداً واحداً على الأقل." });
    const bad = q.lines.find((l) => !String(l.titleEn || l.titleAr).trim());
    if (bad) return t({ en: "Every line needs a description.", ar: "كل بند يحتاج وصفاً." });
    return "";
  };

  const save = async ({ close = false, then } = {}) => {
    const v = validate();
    if (v) { setErr(v); return null; }
    setErr(""); setSaving(true);
    try {
      const clean = { ...q, number: q.number.trim(), clientName: q.clientName.trim() };
      const saved = await apiSaveQuote(clean);
      await logSettingsAudit({
        area: "quotations",
        action: q.id ? "update_quotation" : "create_quotation",
        target: saved.number,
        before: q.id ? initial : null,
        after: saved,
        reason: q.id ? "Quotation updated" : "Quotation created",
      }).catch(() => {});
      setDirty(false);
      onSaved(saved, { close });
      if (then) await then(saved);
      return saved;
    } catch (e) {
      setErr(e?.message || String(e));
      return null;
    } finally { setSaving(false); }
  };

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { setErr(e?.message || String(e)); }
    setBusy("");
  };

  const previewHtml = useMemo(() => (showPreview ? buildQuoteHtml(q) : ""), [q, showPreview]);
  const addedSources = useMemo(() => new Set(q.lines.map((l) => l.source).filter(Boolean)), [q.lines]);

  const L = (en, ar) => t({ en, ar });

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow={L("Quotations", "عروض الأسعار")}
        title={`${q.id ? L("Edit", "تعديل") : L("New", "جديد")} — ${q.number || ""}`}
        subtitle={q.clientName || L("Pick a company or type the client's name to start.", "اختر شركة أو اكتب اسم العميل للبدء.")}
        actions={<>
          <Button tone="secondary" onClick={() => { if (!dirty || window.confirm(L("Discard unsaved changes?", "تجاهل التعديلات غير المحفوظة؟"))) onCancel(); }}>← {L("Back to list", "رجوع للقائمة")}</Button>
          <Button tone="muted" onClick={() => setShowPreview((v) => !v)}>👁 {showPreview ? L("Hide preview", "إخفاء المعاينة") : L("Show preview", "إظهار المعاينة")}</Button>
        </>}
      />
      {err && <StatusMessage message={`❌ ${err}`} />}

      <div style={S.split(showPreview && wide)}>
        {/* ─────────── FORM ─────────── */}
        <div style={{ minWidth: 0 }}>
          <Section title={L("1 · Client", "١ · العميل")}>
            <div style={S.grid2}>
              <Field label={L("Pick from companies", "اختر من الشركات")}>
                <select style={ui.input} value={q.companyId ?? ""} onChange={(e) => pickCompany(e.target.value)}>
                  <option value="">{L("— New / prospect client —", "— عميل جديد / محتمل —")}</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.industry ? ` · ${c.industry}` : ""}</option>)}
                </select>
              </Field>
              <Field label={L("System / industry", "النظام / النشاط")}>
                <select style={ui.input} value={q.industry || ""} onChange={(e) => set({ industry: e.target.value })}>
                  <option value="">{L("— Select —", "— اختر —")}</option>
                  {industryOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={L("Client name *", "اسم العميل *")}>
                <input style={ui.input} dir="auto" value={q.clientName} onChange={(e) => set({ clientName: e.target.value })} />
              </Field>
              <Field label={L("Attention (contact person)", "عناية (الشخص المسؤول)")}>
                <input style={ui.input} dir="auto" value={q.clientContact} onChange={(e) => set({ clientContact: e.target.value })} />
              </Field>
              <Field label={L("Email", "الإيميل")}>
                <input style={ui.input} value={q.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} />
              </Field>
              <Field label={L("Phone", "الهاتف")}>
                <input style={ui.input} value={q.clientPhone} onChange={(e) => set({ clientPhone: e.target.value })} />
              </Field>
            </div>
            <Field label={L("Address", "العنوان")} style={{ marginTop: 10 }}>
              <input style={ui.input} dir="auto" value={q.clientAddress} onChange={(e) => set({ clientAddress: e.target.value })} />
            </Field>
            {company && (
              <div style={S.hint}>
                {L("Current plan", "الباقة الحالية")}: <b>{plan ? `${plan.name} — ${fmtMoney(plan.price, plan.currency)}` : "—"}</b>
                {" · "}{L("Status", "الحالة")}: <b>{company.status}</b>
              </div>
            )}
          </Section>

          <Section title={L("2 · Offer details", "٢ · تفاصيل العرض")}>
            <div style={S.grid3}>
              <Field label={L("Quotation No.", "رقم العرض")}>
                <input style={{ ...ui.input, fontFamily: "Consolas, monospace" }} value={q.number} onChange={(e) => set({ number: e.target.value })} />
              </Field>
              <Field label={L("Issue date", "تاريخ الإصدار")}>
                <input type="date" style={ui.input} value={q.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
              </Field>
              <Field label={`${L("Valid for (days)", "صالح لمدة (يوم)")} → ${dmy(validUntil(q))}`}>
                <input type="number" min="0" style={ui.input} value={q.validDays} onChange={(e) => set({ validDays: e.target.value })} />
              </Field>
              <Field label={L("Billing cycle", "دورة الفوترة")}>
                <select style={ui.input} value={q.cycle} onChange={(e) => set({ cycle: e.target.value })}>
                  {BILLING_CYCLES.map((c) => <option key={c.id} value={c.id}>{lang === "ar" ? c.ar : c.en}</option>)}
                </select>
              </Field>
              <Field label={L("Contract (months)", "مدة العقد (أشهر)")}>
                <input type="number" min="0" style={ui.input} value={q.contractMonths} disabled={cyc.months === 0} onChange={(e) => set({ contractMonths: e.target.value })} />
              </Field>
              <Field label={L("Currency", "العملة")}>
                <select style={ui.input} value={q.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={L("Status", "الحالة")}>
                <select style={ui.input} value={q.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.ar : s.en}</option>)}
                </select>
              </Field>
              <Field label={L("Document language", "لغة المستند")}>
                <select style={ui.input} value={q.showArabic === false ? "en" : "both"} onChange={(e) => set({ showArabic: e.target.value === "both" })}>
                  <option value="both">English + العربية</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
            <Field label={L("Title", "العنوان")} style={{ marginTop: 10 }}>
              <input style={ui.input} dir="auto" value={q.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label={L("Introduction (optional)", "مقدمة (اختياري)")} style={{ marginTop: 10 }}>
              <textarea style={S.textarea} dir="auto" rows={3} value={q.intro} onChange={(e) => set({ intro: e.target.value })}
                placeholder={L("e.g. Thank you for your interest. Please find our offer below…", "مثال: نشكركم على اهتمامكم، نرفق لكم عرضنا أدناه…")} />
            </Field>
          </Section>

          <Section
            title={L("3 · Items", "٣ · البنود")}
            right={<span style={{ color: "#64748b", fontWeight: 800 }}>{q.lines.length} {L("lines", "بند")}</span>}
          >
            <div style={S.addBar}>
              <Button tone="primary" onClick={() => setPicker(true)}>
                🧩 {L("Add cards from company", "أضف كروت الشركة")}
              </Button>
              <select style={{ ...ui.input, width: "auto", minWidth: 190 }} value="" onChange={(e) => { const p = plans.find((x) => String(x.id) === e.target.value); if (p) addPlan(p); }}>
                <option value="">📦 {L("Add a plan…", "أضف باقة…")}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price, p.currency)}</option>)}
              </select>
              <select style={{ ...ui.input, width: "auto", minWidth: 190 }} value="" onChange={(e) => addPreset(e.target.value)}>
                <option value="">🛠 {L("Add a service…", "أضف خدمة…")}</option>
                {SERVICE_PRESETS.map((p) => <option key={p.key} value={p.key}>{lang === "ar" ? p.titleAr : p.titleEn}</option>)}
              </select>
              <Button tone="secondary" onClick={() => addLines([emptyLine()])}>＋ {L("Blank line", "بند فارغ")}</Button>
            </div>

            {!q.lines.length && (
              <div style={S.empty}>
                {L("No items yet. Start with “Add cards from company” — it lists every card of the selected company's system.",
                  "لا توجد بنود بعد. ابدأ بـ «أضف كروت الشركة» — بتطلعلك كل كروت نظام الشركة المختارة.")}
              </div>
            )}

            {q.lines.map((l, i) => (
              <LineEditor
                key={l.id}
                line={l}
                index={i}
                count={q.lines.length}
                currency={q.currency}
                onChange={(patch) => setLine(l.id, patch)}
                onRemove={() => removeLine(l.id)}
                onMove={(d) => moveLine(i, d)}
              />
            ))}
          </Section>

          <Section title={L("4 · Discount, tax & totals", "٤ · الخصم والضريبة والمجاميع")}>
            <div style={S.grid3}>
              <Field label={L("Overall discount %", "خصم إجمالي %")}>
                <input type="number" min="0" max="100" step="0.5" style={ui.input} value={q.discountPct} onChange={(e) => set({ discountPct: e.target.value })} />
              </Field>
              <Field label={L("VAT %", "ضريبة القيمة المضافة %")}>
                <input type="number" min="0" step="0.5" style={ui.input} value={q.vatPct} onChange={(e) => set({ vatPct: e.target.value })} />
              </Field>
            </div>
            <div style={S.totals}>
              {totals.recurring > 0 && (
                <TotalCard
                  title={cyc.id === "one_time" ? L("Total", "الإجمالي") : `${L("Total", "الإجمالي")} ${lang === "ar" ? cyc.perAr : cyc.perEn}`}
                  rows={[
                    [L("Subtotal", "المجموع"), totals.recurring],
                    ...(num(q.discountPct) ? [[L("Discount", "الخصم"), -totals.recurringDiscount]] : []),
                    ...(num(q.vatPct) ? [[L("VAT", "الضريبة"), totals.recurringVat]] : []),
                  ]}
                  total={totals.recurringTotal}
                  currency={q.currency}
                />
              )}
              {totals.oneTime > 0 && (
                <TotalCard
                  title={L("One-time", "مرة واحدة")}
                  rows={[
                    [L("Subtotal", "المجموع"), totals.oneTime],
                    ...(num(q.discountPct) ? [[L("Discount", "الخصم"), -totals.oneTimeDiscount]] : []),
                    ...(num(q.vatPct) ? [[L("VAT", "الضريبة"), totals.oneTimeVat]] : []),
                  ]}
                  total={totals.oneTimeTotal}
                  currency={q.currency}
                />
              )}
              {cyc.months > 0 && totals.recurring > 0 && (
                <TotalCard
                  title={`${L("Contract value", "قيمة العقد")} (${num(q.contractMonths)} ${L("mo", "شهر")})`}
                  rows={[[L("First invoice", "الفاتورة الأولى"), totals.firstInvoice]]}
                  total={totals.contractValue}
                  currency={q.currency}
                  accent
                />
              )}
            </div>
          </Section>

          <Section
            title={L("5 · Terms & notes", "٥ · الشروط والملاحظات")}
            right={q.terms !== DEFAULT_TERMS && (
              <button type="button" style={S.linkBtn} onClick={() => set({ terms: DEFAULT_TERMS })}>↺ {L("Default terms", "الشروط الافتراضية")}</button>
            )}
          >
            <Field label={L("Terms — one per line", "الشروط — كل شرط بسطر")}>
              <textarea style={S.textarea} dir="auto" rows={6} value={q.terms} onChange={(e) => set({ terms: e.target.value })} />
            </Field>
            <Field label={L("Notes shown on the quotation", "ملاحظات تظهر على العرض")} style={{ marginTop: 10 }}>
              <textarea style={S.textarea} dir="auto" rows={3} value={q.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </Section>

          <Section title={L("6 · Issued by", "٦ · صادر عن")} collapsible defaultOpen={!q.issuerName}>
            <div style={S.hint}>{L("Pre-filled from Billing Settings; changes here apply to this quotation only.", "معبّأة من إعدادات الفوترة؛ التعديل هنا يخص هذا العرض فقط.")}</div>
            <div style={S.grid2}>
              <Field label={L("Company", "الشركة")}><input style={ui.input} value={q.issuerName} onChange={(e) => set({ issuerName: e.target.value })} /></Field>
              <Field label={L("Tax / TRN", "الرقم الضريبي")}><input style={ui.input} value={q.issuerTaxId} onChange={(e) => set({ issuerTaxId: e.target.value })} /></Field>
              <Field label={L("Email", "الإيميل")}><input style={ui.input} value={q.issuerEmail} onChange={(e) => set({ issuerEmail: e.target.value })} /></Field>
              <Field label={L("Phone", "الهاتف")}><input style={ui.input} value={q.issuerPhone} onChange={(e) => set({ issuerPhone: e.target.value })} /></Field>
            </div>
            <Field label={L("Address", "العنوان")} style={{ marginTop: 10 }}>
              <input style={ui.input} value={q.issuerAddress} onChange={(e) => set({ issuerAddress: e.target.value })} />
            </Field>
          </Section>

          <div style={S.actionBar}>
            <span style={{ marginInlineEnd: "auto", color: dirty ? "#b45309" : "#047857", fontWeight: 900 }}>
              {dirty ? `● ${L("Unsaved changes", "تعديلات غير محفوظة")}` : `✓ ${L("Saved", "محفوظ")}`}
            </span>
            {q.id && <Button tone="secondary" onClick={() => onDuplicate(q)}>⧉ {L("Duplicate", "نسخ")}</Button>}
            <Button tone="secondary" disabled={!!busy} onClick={() => run("print", () => printQuote(q))}>🖨 {L("Print", "طباعة")}</Button>
            <Button tone="secondary" disabled={!!busy || saving} onClick={() => run("xlsx", () => save({ then: downloadQuoteXlsx }))}>
              {busy === "xlsx" ? "…" : "📊"} Excel
            </Button>
            <Button tone="secondary" disabled={!!busy || saving} onClick={() => run("pdf", () => save({ then: downloadQuotePdf }))}>
              {busy === "pdf" ? "…" : "📄"} PDF
            </Button>
            <Button tone="primary" disabled={saving} onClick={() => save()}>
              {saving ? L("Saving…", "جارِ الحفظ…") : `💾 ${L("Save", "حفظ")}`}
            </Button>
          </div>
        </div>

        {/* ─────────── PREVIEW ─────────── */}
        {showPreview && (
          <div style={wide ? S.previewCol : { ...S.previewCol, position: "static" }}>
            <div style={S.previewBar}>
              <b>{L("Live preview", "معاينة مباشرة")}</b>
              <span style={{ color: "#64748b" }}>A4</span>
            </div>
            <iframe title="Quotation preview" sandbox="allow-same-origin" srcDoc={previewHtml} style={S.previewFrame} />
          </div>
        )}
      </div>

      {picker && (
        <ModulePicker
          initialIndustry={q.industry || company?.industry || "meat"}
          companyName={q.clientName}
          added={addedSources}
          onClose={() => setPicker(false)}
          onAdd={(lines, industry) => { addLines(lines); if (!q.industry) set({ industry }); setPicker(false); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════ Line editor ═══════════════════════════ */

function LineEditor({ line: l, index, count, currency, onChange, onRemove, onMove }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  return (
    <div style={S.line(l.kind)}>
      <div style={S.lineHead}>
        <span style={S.lineNo}>{index + 1}</span>
        <select style={S.miniSelect} value={l.kind} onChange={(e) => onChange({ kind: e.target.value })}>
          {LINE_KINDS.map((k) => <option key={k.id} value={k.id}>{lang === "ar" ? k.ar : k.en}</option>)}
        </select>
        <span style={{ marginInlineStart: "auto", fontWeight: 1000, color: "#0f766e", whiteSpace: "nowrap" }}>
          {fmtMoney(lineTotal(l), currency)}
        </span>
        <button type="button" style={S.iconBtn} title={L("Move up", "لأعلى")} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
        <button type="button" style={S.iconBtn} title={L("Move down", "لأسفل")} disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
        <button type="button" style={{ ...S.iconBtn, color: "#dc2626" }} title={L("Remove", "حذف")} onClick={onRemove}>✕</button>
      </div>
      <div style={S.grid2}>
        <input style={ui.input} placeholder={L("Description (English)", "الوصف (إنجليزي)")} value={l.titleEn} onChange={(e) => onChange({ titleEn: e.target.value })} />
        <input style={ui.input} dir="rtl" placeholder="الوصف (عربي)" value={l.titleAr} onChange={(e) => onChange({ titleAr: e.target.value })} />
      </div>
      <input style={{ ...ui.input, marginTop: 8, fontWeight: 600 }} dir="auto" placeholder={L("Details (optional) — what is included", "تفاصيل (اختياري) — ماذا يشمل")} value={l.details} onChange={(e) => onChange({ details: e.target.value })} />
      <div style={S.lineNums}>
        <Field label={L("Qty", "الكمية")}>
          <input type="number" min="0" step="any" style={ui.input} value={l.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        </Field>
        <Field label={L("Unit", "الوحدة")}>
          <select style={ui.input} value={l.unit} onChange={(e) => onChange({ unit: e.target.value })}>
            {UNITS.map((u) => <option key={u.id} value={u.id}>{lang === "ar" ? u.ar : u.en}</option>)}
          </select>
        </Field>
        <Field label={`${L("Unit price", "سعر الوحدة")} (${currency})`}>
          <input type="number" min="0" step="any" style={{ ...ui.input, background: l.unitPrice === "" ? "#fffbeb" : "#fff" }} value={l.unitPrice} placeholder="0.00" onChange={(e) => onChange({ unitPrice: e.target.value })} />
        </Field>
        <Field label={L("Disc. %", "خصم %")}>
          <input type="number" min="0" max="100" step="any" style={ui.input} value={l.discountPct} placeholder="0" onChange={(e) => onChange({ discountPct: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Module picker ═══════════════════════════
   The company's own cards — straight from its system template — as
   ready-made quotation lines. */

function ModulePicker({ initialIndustry, companyName, added, onClose, onAdd }) {
  const { t, lang, dir } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [industry, setIndustry] = useState(initialIndustry || "meat");
  const catalog = useMemo(() => moduleCatalog(industry), [industry]);
  const [picked, setPicked] = useState(() => new Set());
  const [price, setPrice] = useState("");
  const [mode, setMode] = useState("lines"); // lines | bundle

  useEffect(() => { setPicked(new Set(catalog.filter((m) => !added.has(m.key)).map((m) => m.key))); }, [catalog, added]);

  const toggle = (key) => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const chosen = catalog.filter((m) => picked.has(m.key));

  const confirm = () => {
    if (!chosen.length) return;
    if (mode === "bundle") {
      onAdd([emptyLine({
        kind: "recurring",
        unit: "service",
        titleEn: "System modules package",
        titleAr: "باقة وحدات النظام",
        details: chosen.map((m) => (lang === "ar" && m.titleAr ? m.titleAr : m.titleEn)).join(" · "),
        qty: 1,
        unitPrice: price,
        source: `bundle:${industry}`,
      })], industry);
      return;
    }
    onAdd(chosen.map((m) => emptyLine({
      kind: "recurring",
      unit: "module",
      titleEn: m.titleEn,
      titleAr: m.titleAr,
      details: m.details,
      qty: 1,
      unitPrice: price,
      source: m.key,
    })), industry);
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} dir={dir} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>🧩 {L("Add cards from company", "أضف كروت الشركة")}</div>
            <div style={{ color: "#64748b", fontWeight: 700, marginTop: 2 }}>
              {companyName ? `${companyName} · ` : ""}{L("tick what goes into this quotation", "اختر ما يدخل في هذا العرض")}
            </div>
          </div>
          <button type="button" style={S.iconBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <Field label={L("System", "النظام")} style={{ minWidth: 240, flex: 1 }}>
            <select style={ui.input} value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {industryOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
          <Field label={`${L("Price for each", "السعر لكل وحدة")} (${L("optional", "اختياري")})`} style={{ width: 170 }}>
            <input type="number" min="0" step="any" style={ui.input} value={price} placeholder="0.00" onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label={L("Add as", "أضف كـ")} style={{ width: 230 }}>
            <select style={ui.input} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="lines">{L("One line per card", "بند لكل كرت")}</option>
              <option value="bundle">{L("One package line", "بند واحد (باقة)")}</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button type="button" style={S.linkBtn} onClick={() => setPicked(new Set(catalog.map((m) => m.key)))}>{L("Select all", "تحديد الكل")}</button>
          <button type="button" style={S.linkBtn} onClick={() => setPicked(new Set())}>{L("Clear", "مسح")}</button>
          <span style={{ marginInlineStart: "auto", color: "#64748b", fontWeight: 800 }}>{chosen.length} / {catalog.length}</span>
        </div>

        <div style={S.modGrid}>
          {catalog.map((m) => {
            const on = picked.has(m.key);
            const already = added.has(m.key);
            return (
              <label key={m.key} style={S.modCard(on)}>
                <input type="checkbox" checked={on} onChange={() => toggle(m.key)} style={{ marginTop: 3 }} />
                <span style={{ fontSize: 22, lineHeight: 1 }}>{m.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 1000 }}>
                    {m.titleEn}{m.titleAr ? <span style={{ color: "#64748b", fontWeight: 800 }}> · {m.titleAr}</span> : null}
                  </span>
                  <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 650 }}>{m.details}</span>
                  {already && <span style={S.tag}>{L("already in quotation", "موجود بالعرض")}</span>}
                </span>
              </label>
            );
          })}
          {!catalog.length && <div style={S.empty}>{L("This system has no cards defined yet.", "لا توجد كروت معرّفة لهذا النظام بعد.")}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <Button tone="secondary" onClick={onClose}>{L("Cancel", "إلغاء")}</Button>
          <Button tone="primary" disabled={!chosen.length} onClick={confirm}>
            ＋ {L("Add", "أضف")} {mode === "bundle" ? L("package", "الباقة") : `${chosen.length} ${L("lines", "بنود")}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Small pieces ═══════════════════════════ */

function Section({ title, right, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...ui.card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: open ? 12 : 0 }}>
        <h3 style={{ margin: 0, fontWeight: 1000, fontSize: 16, color: "#0f172a", flex: 1, cursor: collapsible ? "pointer" : "default" }}
          onClick={() => collapsible && setOpen((v) => !v)}>
          {collapsible ? (open ? "▾ " : "▸ ") : ""}{title}
        </h3>
        {right}
      </div>
      {open && children}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span style={{ ...ui.label, fontSize: 11 }}>{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, sub, small }) {
  return (
    <div style={S.kpi}>
      <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontWeight: 1000, fontSize: small ? 16 : 24, color: "#0f172a", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function TotalCard({ title, rows, total, currency, accent }) {
  return (
    <div style={S.totalCard(accent)}>
      <div style={{ fontWeight: 1000, color: accent ? "#0f766e" : "#334155", marginBottom: 6 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#475569", fontWeight: 750 }}>
          <span>{k}</span><span>{fmtMoney(v, currency)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0", fontWeight: 1000, fontSize: 17, color: "#0f172a" }}>
        <span>=</span><span>{fmtMoney(total, currency)}</span>
      </div>
    </div>
  );
}

function IconBtn({ children, danger, ...props }) {
  return (
    <button type="button" {...props} style={{
      minWidth: 38, height: 32, margin: "0 2px", padding: "0 8px", borderRadius: 7, cursor: props.disabled ? "wait" : "pointer",
      border: `1px solid ${danger ? "#fecaca" : "rgba(15,23,42,.14)"}`, background: danger ? "#fef2f2" : "#fff",
      color: danger ? "#b91c1c" : "#0f172a", fontWeight: 900, fontSize: 12, fontFamily: "inherit",
    }}>{children}</button>
  );
}

/* ═══════════════════════════ Styles ═══════════════════════════ */

const S = {
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 },
  kpi: { ...ui.card, marginBottom: 0, padding: 14, borderTop: "3px solid #0f766e" },
  chip: (on, tone) => ({
    border: `1px solid ${on ? tone || "#0f766e" : "rgba(15,23,42,.14)"}`, background: on ? tone || "#0f766e" : "#fff",
    color: on ? "#fff" : "#334155", borderRadius: 999, padding: "6px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
  }),
  pill: (st) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.tone, fontWeight: 900, fontSize: 12 }),
  split: (preview) => ({
    display: "grid", gap: 16, alignItems: "start",
    gridTemplateColumns: preview ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
  }),
  previewCol: { position: "sticky", top: 12, ...ui.card, padding: 0, overflow: "hidden", marginBottom: 0 },
  previewBar: { display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" },
  previewFrame: { display: "block", width: "100%", height: "calc(100vh - 120px)", minHeight: 600, border: 0, background: "#fff" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  textarea: { ...ui.input, minHeight: 70, resize: "vertical", fontWeight: 600, lineHeight: 1.6, unicodeBidi: "plaintext", textAlign: "start" },
  hint: { marginTop: 10, marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "#f0fdfa", border: "1px solid #99f6e4", color: "#115e59", fontWeight: 750, fontSize: 13 },
  addBar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  empty: { padding: 22, textAlign: "center", color: "#94a3b8", fontWeight: 800, border: "1px dashed #cbd5e1", borderRadius: 8 },
  line: (kind) => ({
    border: "1px solid rgba(15,23,42,.12)", borderInlineStart: `4px solid ${kind === "one_time" ? "#f59e0b" : "#0f766e"}`,
    borderRadius: 8, padding: 12, marginBottom: 10, background: "#fff",
  }),
  lineHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  lineNo: { width: 26, height: 26, borderRadius: 999, background: "#0f172a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 12 },
  lineNums: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 8 },
  miniSelect: { ...ui.input, minHeight: 32, width: "auto", padding: "4px 8px", fontSize: 13 },
  iconBtn: { width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(15,23,42,.14)", background: "#fff", cursor: "pointer", fontWeight: 1000, fontFamily: "inherit" },
  totals: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 },
  totalCard: (accent) => ({
    border: `1px solid ${accent ? "#99f6e4" : "rgba(15,23,42,.12)"}`, background: accent ? "#f0fdfa" : "#f8fafc", borderRadius: 8, padding: 12,
  }),
  actionBar: {
    position: "sticky", bottom: 0, zIndex: 5, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
    padding: "12px 14px", background: "rgba(255,255,255,.96)", border: "1px solid rgba(15,23,42,.12)", borderRadius: 8,
    boxShadow: "0 -8px 24px rgba(15,23,42,.08)", backdropFilter: "blur(6px)",
  },
  linkBtn: { border: 0, background: "transparent", color: "#0f766e", fontWeight: 900, cursor: "pointer", fontFamily: "inherit", padding: 4 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16, backdropFilter: "blur(4px)" },
  modal: { width: "min(860px, 100%)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 28px 70px rgba(15,23,42,.3)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  modGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 },
  modCard: (on) => ({
    display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 8, cursor: "pointer",
    border: `1.5px solid ${on ? "#0f766e" : "rgba(15,23,42,.12)"}`, background: on ? "#f0fdfa" : "#fff",
  }),
  tag: { display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 900, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "1px 8px" },
};
