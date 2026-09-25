// src/pages/settings/quotations/QuotationsTab.jsx
// -----------------------------------------------------------------------------
// Settings → Billing & Plans → Quotations.
//
//   List     : every quotation with KPIs, search, status chips, inline status
//              change and one-click PDF / Excel / duplicate / delete.
//   Editor   : client from Companies, "add cards from company", ⚡ Smart build,
//              price book (remembered prices), optional add-ons, fully
//              configurable terms (toggle, tune numbers, edit text, add your
//              own), colour themes + logo, live smart checks, full-screen
//              preview, PDF / Excel / print / copy-as-text.
//   Settings : price book, logo, defaults and default terms for new quotes.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../config/api";
import { industryOptions } from "../../../industries";
import { useSettingsLang } from "../_shared/settingsI18n";
import { ConfirmModal } from "../_shared/SettingsUIKit";
import { logSettingsAudit } from "../../../utils/settingsAudit";
import {
  BILLING_CYCLES, CURRENCIES, LINE_KINDS, SERVICE_PRESETS, STATUSES, TERM_GROUPS, TERM_LIBRARY, THEMES, UNITS,
  apiDeleteQuote, apiListQuotes, apiLoadConfig, apiSaveConfig, apiSaveQuote, computeTotals, cycleById,
  daysLeft, defaultTermsList, dmy, emptyConfig, emptyLine, emptyQuote, fmtMoney, isExpired, lineTotal,
  makeCustomTerm, makeTerm, moduleCatalog, newLineId, nextQuoteNumber, num, priceFor, priceKey,
  quoteInsights, quoteSummaryText, readLogoFile, smartBuildLines, statusById, termTemplate, termText,
  termsListOf, themeById, todayISO, validUntil,
} from "./quotationCore";
import { buildQuoteHtml, downloadQuotePdf, downloadQuoteXlsx, printQuote } from "./quotationExport";

/* ═══════════════════════════ Root ═══════════════════════════ */

const effStatus = (q) => (isExpired(q) && q.status !== "expired" ? "expired" : q.status);

/* logSettingsAudit is async; never let an audit hiccup break a save. */
const audit = (entry) => { try { Promise.resolve(logSettingsAudit(entry)).catch(() => {}); } catch { /* ignore */ } };

export default function QuotationsTab() {
  const { t, dir } = useSettingsLang();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [openSmart, setOpenSmart] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [config, setConfig] = useState(emptyConfig());

  const flash = useCallback((text, kind = "ok") => {
    const at = Date.now();
    setToast({ text, kind, at });
    setTimeout(() => setToast((cur) => (cur && cur.at === at ? null : cur)), 3400);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, c, p, bp, cfg] = await Promise.all([
      apiListQuotes().catch((e) => { flash(e.message, "err"); return []; }),
      fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/api/plans`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/api/billing-profile`).then((r) => r.json()).catch(() => ({})),
      apiLoadConfig(),
    ]);
    setQuotes(q);
    setCompanies(c?.ok ? c.companies || [] : []);
    setPlans(p?.ok ? (p.plans || []).filter((x) => x.is_active !== false) : []);
    setProfile(bp?.profile || bp?.data || null);
    setConfig(cfg);
    setLoading(false);
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = useCallback(async (next) => {
    const prev = config;
    setConfig(next);
    try { await apiSaveConfig(next); return true; } catch (e) { setConfig(prev); flash(e.message, "err"); return false; }
  }, [config, flash]);

  const fresh = () => {
    const d = config.defaults || {};
    const has = (v) => v !== undefined && v !== null && v !== "";
    const q = emptyQuote({
      ...(has(d.currency) ? { currency: d.currency } : {}),
      ...(has(d.vatPct) ? { vatPct: d.vatPct } : {}),
      ...(has(d.validDays) ? { validDays: d.validDays } : {}),
      ...(has(d.theme) ? { theme: d.theme } : {}),
      ...(has(d.cycle) ? { cycle: d.cycle } : {}),
      ...(has(d.contractMonths) ? { contractMonths: d.contractMonths } : {}),
      ...(Array.isArray(d.termsList) ? { termsList: d.termsList.map((x) => ({ ...x, id: makeTerm(x.key || "scope").id })) } : {}),
    });
    return {
      ...q,
      number: nextQuoteNumber(quotes),
      issuerName: profile?.company_name || "",
      issuerAddress: profile?.company_address || "",
      issuerTaxId: profile?.tax_id || "",
      issuerEmail: profile?.contact_email || "",
      issuerPhone: profile?.contact_phone || "",
    };
  };

  const startNew = (smart = false) => { setEditing(fresh()); setOpenSmart(smart); };

  const duplicate = (q) => {
    setEditing({
      ...q, id: null, reportDate: undefined, number: nextQuoteNumber(quotes), status: "draft", issueDate: todayISO(),
      lines: q.lines.map((l) => ({ ...l, id: newLineId() })),
      termsList: termsListOf(q).map((x) => ({ ...x, id: makeTerm(x.key || "scope").id })),
    });
    setOpenSmart(false);
  };

  const upsert = (saved) => setQuotes((list) => [saved, ...list.filter((x) => x.id !== saved.id)]
    .sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)) || String(b.number).localeCompare(String(a.number))));

  const onSaved = (saved) => {
    upsert(saved);
    setEditing(saved);
    flash(`${t({ en: "Saved", ar: "تم الحفظ" })} · ${saved.number}`);
  };

  const onDelete = async (q) => {
    try {
      await apiDeleteQuote(q.id);
      audit({ area: "quotations", action: "delete_quotation", target: q.number, before: q, after: null, reason: "Quotation deleted" });
      setQuotes((list) => list.filter((x) => x.id !== q.id));
      flash(t({ en: "Quotation deleted", ar: "تم حذف العرض" }));
    } catch (e) { flash(e.message, "err"); }
  };

  const setStatus = async (q, status) => {
    try { upsert(await apiSaveQuote({ ...q, status })); } catch (e) { flash(e.message, "err"); }
  };

  return (
    <div dir={dir} style={{ position: "relative" }}>
      {editing ? (
        <QuoteEditor
          initial={editing}
          companies={companies}
          plans={plans}
          existing={quotes}
          config={config}
          saveConfig={saveConfig}
          startSmart={openSmart}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
          onDuplicate={duplicate}
          flash={flash}
        />
      ) : (
        <QuoteList
          quotes={quotes}
          loading={loading}
          config={config}
          onNew={() => startNew(false)}
          onSmart={() => startNew(true)}
          onSettings={() => setSettingsOpen(true)}
          onOpen={(q) => { setEditing(q); setOpenSmart(false); }}
          onDuplicate={duplicate}
          onDelete={onDelete}
          onStatus={setStatus}
          onRefresh={load}
          flash={flash}
        />
      )}

      {settingsOpen && (
        <SettingsModal config={config} onClose={() => setSettingsOpen(false)} onSave={async (c) => { if (await saveConfig(c)) { setSettingsOpen(false); flash(t({ en: "Settings saved", ar: "تم حفظ الإعدادات" })); } }} />
      )}
      <Toast toast={toast} />
    </div>
  );
}

/* ═══════════════════════════ List ═══════════════════════════ */

function QuoteList({ quotes, loading, config, onNew, onSmart, onSettings, onOpen, onDuplicate, onDelete, onStatus, onRefresh, flash }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("date");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState("");

  const rows = useMemo(() => {
    const s = query.trim().toLowerCase();
    const list = quotes.filter((q) => {
      if (status !== "all" && effStatus(q) !== status) return false;
      if (!s) return true;
      return [q.number, q.clientName, q.clientContact, q.clientEmail, q.title].some((x) => String(x || "").toLowerCase().includes(s));
    });
    if (sort === "value") return [...list].sort((a, b) => computeTotals(b).contractValue - computeTotals(a).contractValue);
    if (sort === "client") return [...list].sort((a, b) => String(a.clientName).localeCompare(String(b.clientName)));
    return list;
  }, [quotes, query, status, sort]);

  const kpi = useMemo(() => {
    const open = quotes.filter((q) => ["draft", "sent"].includes(effStatus(q)));
    const accepted = quotes.filter((q) => q.status === "accepted");
    const sumBy = (list) => list.reduce((acc, q) => { const k = q.currency || "—"; acc[k] = (acc[k] || 0) + computeTotals(q).contractValue; return acc; }, {});
    const fmt = (m) => Object.entries(m).map(([c, v]) => fmtMoney(v, c)).join(" · ") || "—";
    const decided = quotes.filter((q) => ["accepted", "rejected"].includes(q.status)).length;
    const soon = open.filter((q) => { const d = daysLeft(q); return d != null && d >= 0 && d <= 5; }).length;
    return {
      total: quotes.length, open: open.length, openValue: fmt(sumBy(open)), acceptedValue: fmt(sumBy(accepted)),
      accepted: accepted.length, winRate: decided ? Math.round((accepted.length / decided) * 100) : null, soon,
    };
  }, [quotes]);

  const run = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { flash(e?.message || String(e), "err"); } setBusy(""); };
  const opts = { logo: config.logo };

  return (
    <>
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div style={S.heroKicker}>{L("Billing · Sales", "الفوترة · المبيعات")}</div>
            <div className="bpx-xxl" style={{ fontWeight: 1000, lineHeight: 1.1 }}>{L("Quotations", "عروض الأسعار")}</div>
            <div style={{ opacity: 0.85, marginTop: 6, maxWidth: 760 }}>
              {L("Build a professional, priced quotation in minutes — pick a company, add its cards, and export to PDF or Excel.",
                "اعمل عرض سعر احترافي ومسعّر بدقائق — اختر الشركة، أضف كروتها، وصدّر PDF أو Excel.")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn tone="glass" onClick={onSettings}>⚙️ {L("Settings & price book", "الإعدادات وقائمة الأسعار")}</Btn>
            <Btn tone="glass" onClick={onSmart}>⚡ {L("Smart quote", "عرض ذكي")}</Btn>
            <Btn tone="white" onClick={onNew}>＋ {L("New quotation", "عرض سعر جديد")}</Btn>
          </div>
        </div>
      </div>

      <div style={S.kpis}>
        <Kpi icon="🧾" label={L("All quotations", "كل العروض")} value={kpi.total} />
        <Kpi icon="⏳" label={L("Open (draft + sent)", "مفتوحة")} value={kpi.open} sub={kpi.openValue} tone="#2563eb" />
        <Kpi icon="✅" label={L("Accepted", "المقبولة")} value={kpi.accepted} sub={kpi.acceptedValue} tone="#059669" />
        <Kpi icon="🎯" label={L("Win rate", "نسبة القبول")} value={kpi.winRate == null ? "—" : `${kpi.winRate}%`} sub={kpi.soon ? L(`${kpi.soon} expiring within 5 days`, `${kpi.soon} تنتهي خلال 5 أيام`) : ""} tone="#d97706" />
      </div>

      <div style={S.panel}>
        <div style={S.toolbar}>
          <div style={S.searchBox}>
            <span aria-hidden>🔎</span>
            <input style={S.searchInput} placeholder={L("Search number, client, contact…", "ابحث بالرقم أو العميل…")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ id: "all", en: "All", ar: "الكل", tone: "#0f172a" }, ...STATUSES].map((s) => {
              const count = s.id === "all" ? quotes.length : quotes.filter((q) => effStatus(q) === s.id).length;
              return (
                <button key={s.id} type="button" onClick={() => setStatus(s.id)} style={S.chip(status === s.id, s.tone)}>
                  {lang === "ar" ? s.ar : s.en} <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
          <select style={{ ...S.input, width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date">{L("Newest first", "الأحدث أولاً")}</option>
            <option value="value">{L("Highest value", "الأعلى قيمة")}</option>
            <option value="client">{L("Client A→Z", "العميل أ←ي")}</option>
          </select>
          <Btn tone="soft" onClick={onRefresh} title={L("Refresh", "تحديث")}>↻</Btn>
        </div>

        {loading && <div style={S.empty}>{L("Loading…", "جارِ التحميل…")}</div>}
        {!loading && !rows.length && (
          <div style={S.emptyBig}>
            <div className="bpx-xxl">🧾</div>
            <div className="bpx-lg" style={{ fontWeight: 1000, marginTop: 6 }}>
              {quotes.length ? L("No quotation matches the filter", "لا يوجد عرض يطابق البحث") : L("No quotations yet", "لا توجد عروض بعد")}
            </div>
            {!quotes.length && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <Btn tone="primary" onClick={onSmart}>⚡ {L("Build one with Smart quote", "ابنِ عرضاً بالعرض الذكي")}</Btn>
                <Btn tone="soft" onClick={onNew}>＋ {L("Start from blank", "ابدأ من الصفر")}</Btn>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((q) => {
            const tot = computeTotals(q);
            const cyc = cycleById(q.cycle);
            const st = statusById(effStatus(q));
            const th = themeById(q.theme);
            const dl = daysLeft(q);
            return (
              <div key={q.id} style={S.row(th.a)} onClick={() => onOpen(q)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") onOpen(q); }}>
                <div style={S.avatar(th)}>{String(q.clientName || "?").trim().slice(0, 2).toUpperCase()}</div>
                <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                  <div style={{ fontWeight: 1000 }} dir="auto">{q.clientName || "—"}</div>
                  <div className="bpx-sm" style={{ color: "#64748b" }}>
                    <span style={{ fontFamily: "Consolas, monospace" }}>{q.number}</span> · {dmy(q.issueDate)} · {(q.lines || []).length} {L("items", "بند")}
                  </div>
                </div>
                <div style={{ flex: "0 1 240px", textAlign: "end" }}>
                  <div style={{ fontWeight: 1000 }}>{fmtMoney(tot.recurringTotal || tot.oneTimeTotal, q.currency)}
                    <span className="bpx-sm" style={{ color: "#64748b", fontWeight: 700 }}> {tot.recurringTotal ? (lang === "ar" ? cyc.perAr : cyc.perEn) : ""}</span>
                  </div>
                  <div className="bpx-sm" style={{ color: "#64748b" }}>{cyc.months > 0 && tot.recurring ? `${L("Contract", "العقد")} ${fmtMoney(tot.contractValue, q.currency)}` : ""}</div>
                </div>
                <div style={{ flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                  <select value={q.status} onChange={(e) => onStatus(q, e.target.value)} style={S.statusSelect(st)}>
                    {STATUSES.filter((s) => s.id !== "expired" || q.status === "expired").map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.ar : s.en}</option>)}
                  </select>
                  <div className="bpx-xs" style={{ textAlign: "center", marginTop: 3, color: dl != null && dl < 0 ? "#b91c1c" : dl != null && dl <= 5 ? "#b45309" : "#94a3b8", fontWeight: 800 }}>
                    {["accepted", "rejected"].includes(q.status) || dl == null ? "" : dl < 0 ? L(`expired ${-dl}d ago`, `منتهي منذ ${-dl} يوم`) : L(`${dl} days left`, `باقي ${dl} يوم`)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                  <IconBtn title="PDF" disabled={!!busy} onClick={() => run(`pdf${q.id}`, () => downloadQuotePdf(q, opts))}>{busy === `pdf${q.id}` ? "…" : "PDF"}</IconBtn>
                  <IconBtn title="Excel" disabled={!!busy} onClick={() => run(`x${q.id}`, () => downloadQuoteXlsx(q, opts))}>{busy === `x${q.id}` ? "…" : "XLS"}</IconBtn>
                  <IconBtn title={L("Duplicate", "نسخ")} onClick={() => onDuplicate(q)}>⧉</IconBtn>
                  <IconBtn title={L("Delete", "حذف")} danger onClick={() => setConfirm(q)}>🗑</IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        title={L("Delete quotation?", "حذف عرض السعر؟")}
        body={confirm ? `${confirm.number} — ${confirm.clientName || ""}` : ""}
        confirmText={L("Delete", "حذف")}
        cancelText={L("Cancel", "إلغاء")}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const q = confirm; setConfirm(null); onDelete(q); }}
      />
    </>
  );
}

/* ═══════════════════════════ Editor ═══════════════════════════ */

const STEPS = [
  { id: "q-client", en: "Client", ar: "العميل", icon: "👤" },
  { id: "q-offer", en: "Offer", ar: "العرض", icon: "🗓️" },
  { id: "q-items", en: "Items", ar: "البنود", icon: "📦" },
  { id: "q-pricing", en: "Pricing", ar: "التسعير", icon: "💰" },
  { id: "q-terms", en: "Terms", ar: "الشروط", icon: "📜" },
  { id: "q-design", en: "Design", ar: "التصميم", icon: "🎨" },
];

function useIsWide(min = 1280) {
  const get = () => (typeof window !== "undefined" ? window.innerWidth >= min : true);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const on = () => setWide(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return wide;
}

function QuoteEditor({ initial, companies, plans, existing, config, saveConfig, startSmart, onCancel, onSaved, onDuplicate, flash }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [q, setQ] = useState(() => ({ ...initial, termsList: termsListOf(initial) }));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [picker, setPicker] = useState(false);
  const [smart, setSmart] = useState(!!startSmart);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const wide = useIsWide();

  useEffect(() => { setQ({ ...initial, termsList: termsListOf(initial) }); setDirty(false); }, [initial]);

  const set = (patch) => { setQ((cur) => ({ ...cur, ...(typeof patch === "function" ? patch(cur) : patch) })); setDirty(true); };
  const setLine = (id, patch) => set((cur) => ({ lines: cur.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const addLines = (lines) => set((cur) => ({ lines: [...cur.lines, ...lines] }));

  const totals = useMemo(() => computeTotals(q), [q]);
  const insights = useMemo(() => quoteInsights(q), [q]);
  const cyc = cycleById(q.cycle);
  const th = themeById(q.theme);
  const company = companies.find((c) => String(c.id) === String(q.companyId)) || null;
  const plan = company ? plans.find((p) => String(p.id) === String(company.plan_id)) : null;
  const priceBook = config.priceBook || {};
  const opts = useMemo(() => ({ logo: config.logo }), [config.logo]);

  const pickCompany = (id) => {
    const c = companies.find((x) => String(x.id) === String(id));
    if (!c) { set({ companyId: null }); return; }
    set({
      companyId: c.id, clientName: c.name || "", clientContact: c.contact_name || "",
      clientEmail: c.contact_email || "", clientPhone: c.contact_phone || "", industry: c.industry || "meat",
    });
  };

  const addPlan = (p) => addLines([emptyLine({
    kind: "recurring", titleEn: `${p.name} plan`, titleAr: `باقة ${p.name}`,
    details: [p.description, p.max_branches ? `Up to ${p.max_branches} branches` : "", p.max_users ? `${p.max_users} users` : ""].filter(Boolean).join(" · "),
    qty: 1, unit: "service", unitPrice: p.price ?? "", source: `plan:${p.id}`,
  })]);

  const addPreset = (key) => {
    const p = SERVICE_PRESETS.find((x) => x.key === key);
    if (p) addLines([emptyLine({ kind: p.kind, unit: p.unit, titleEn: p.titleEn, titleAr: p.titleAr, source: p.key, unitPrice: priceFor(priceBook, p.key) })]);
  };

  const rememberPrice = async (l) => {
    const key = priceKey(l);
    if (!key) return;
    const ok = await saveConfig({ ...config, priceBook: { ...priceBook, [key]: { price: num(l.unitPrice), title: l.titleEn || l.titleAr, unit: l.unit, kind: l.kind } } });
    if (ok) flash(L(`Price remembered for “${l.titleEn || l.titleAr}”`, `تم حفظ السعر لـ «${l.titleAr || l.titleEn}»`));
  };

  const fillFromPriceBook = () => {
    const hits = q.lines.filter((l) => !num(l.unitPrice) && priceFor(priceBook, priceKey(l)) !== "").length;
    if (!hits) { flash(L("No saved prices match the empty items", "لا توجد أسعار محفوظة للبنود الفارغة"), "info"); return; }
    set((cur) => ({
      lines: cur.lines.map((l) => {
        if (num(l.unitPrice)) return l;
        const p = priceFor(priceBook, priceKey(l));
        return p === "" ? l : { ...l, unitPrice: p };
      }),
    }));
    flash(L(`${hits} price(s) filled from the price book`, `تم تعبئة ${hits} سعر من قائمة الأسعار`));
  };

  const validate = () => {
    if (!q.clientName.trim()) return L("Enter the client name (or pick a company).", "أدخل اسم العميل (أو اختر شركة).");
    if (!q.number.trim()) return L("Enter the quotation number.", "أدخل رقم العرض.");
    if (existing.find((x) => x.number === q.number.trim() && x.id !== q.id)) return L(`Number ${q.number} is already used.`, `الرقم ${q.number} مستخدم مسبقاً.`);
    if (!q.lines.length) return L("Add at least one item.", "أضف بنداً واحداً على الأقل.");
    if (q.lines.find((l) => !String(l.titleEn || l.titleAr).trim())) return L("Every item needs a description.", "كل بند يحتاج وصفاً.");
    return "";
  };

  const save = async ({ then } = {}) => {
    const v = validate();
    if (v) { flash(v, "err"); return null; }
    setSaving(true);
    try {
      const saved = await apiSaveQuote({ ...q, number: q.number.trim(), clientName: q.clientName.trim() });
      audit({
        area: "quotations", action: q.id ? "update_quotation" : "create_quotation", target: saved.number,
        before: q.id ? initial : null, after: saved, reason: q.id ? "Quotation updated" : "Quotation created",
      });
      setDirty(false);
      onSaved(saved);
      if (then) await then(saved, opts);
      return saved;
    } catch (e) { flash(e?.message || String(e), "err"); return null; } finally { setSaving(false); }
  };

  const run = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { flash(e?.message || String(e), "err"); } setBusy(""); };

  const copyText = async () => {
    const text = quoteSummaryText(q, lang);
    try { await navigator.clipboard.writeText(text); flash(L("Summary copied — paste it in WhatsApp or e-mail", "تم نسخ الملخص — الصقه بواتساب أو الإيميل")); }
    catch { window.prompt(L("Copy the text:", "انسخ النص:"), text); }
  };

  const goto = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const addedSources = useMemo(() => new Set(q.lines.map((l) => l.source).filter(Boolean)), [q.lines]);
  const st = statusById(q.status);

  return (
    <div>
      {/* ─────────── sticky header ─────────── */}
      <div style={S.editorHead(th)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Btn tone="glass" title={L("Back to list", "رجوع للقائمة")} onClick={() => { if (!dirty || window.confirm(L("Discard unsaved changes?", "تجاهل التعديلات غير المحفوظة؟"))) onCancel(); }}>{lang === "ar" ? "→" : "←"}</Btn>
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <div style={{ opacity: 0.85, fontFamily: "Consolas, monospace" }}>{q.number || "—"} · {q.id ? L("Edit", "تعديل") : L("New", "جديد")}</div>
            <div className="bpx-xl" style={{ fontWeight: 1000, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="auto">
              {q.clientName || L("New quotation", "عرض سعر جديد")}
            </div>
          </div>
          <div style={S.headTotal}>
            <div style={{ opacity: 0.85 }}>{totals.recurring ? `${L("Total", "الإجمالي")} ${lang === "ar" ? cyc.perAr : cyc.perEn}` : L("Total", "الإجمالي")}</div>
            <div className="bpx-lg" style={{ fontWeight: 1000 }}>{fmtMoney(totals.recurringTotal || totals.oneTimeTotal, q.currency)}</div>
          </div>
          <select value={q.status} onChange={(e) => set({ status: e.target.value })} style={S.statusSelect(st, true)}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{lang === "ar" ? s.ar : s.en}</option>)}
          </select>
          <Btn tone="white" disabled={saving} onClick={() => save()}>{saving ? L("Saving…", "جارِ الحفظ…") : `💾 ${L("Save", "حفظ")}`}{dirty ? " •" : ""}</Btn>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          {STEPS.map((s) => (
            <button key={s.id} type="button" className="bpx-sm" style={S.step} onClick={() => goto(s.id)}>{s.icon} {lang === "ar" ? s.ar : s.en}</button>
          ))}
          <span style={{ flex: 1 }} />
          <Btn tone="glass" onClick={() => setPreview(true)}>👁 {L("Preview", "معاينة")}</Btn>
          <Btn tone="glass" onClick={copyText}>📋 {L("Copy text", "نسخ نص")}</Btn>
          <Btn tone="glass" disabled={!!busy} title={L("Print", "طباعة")} onClick={() => run("print", () => printQuote(q, opts))}>🖨</Btn>
          <Btn tone="glass" disabled={!!busy || saving} onClick={() => run("xlsx", () => save({ then: downloadQuoteXlsx }))}>{busy === "xlsx" ? "…" : "📊"} Excel</Btn>
          <Btn tone="glass" disabled={!!busy || saving} onClick={() => run("pdf", () => save({ then: downloadQuotePdf }))}>{busy === "pdf" ? "…" : "📄"} PDF</Btn>
        </div>
      </div>

      <div style={S.editorGrid(wide)}>
        <div style={{ minWidth: 0, display: "grid", gap: 16 }}>

          {/* 1 · CLIENT */}
          <Card id="q-client" icon="👤" title={L("Client", "العميل")} hint={L("Pick a company to fill everything automatically.", "اختر شركة لتتعبّى البيانات تلقائياً.")}>
            <div style={S.grid2}>
              <Field label={L("Pick from companies", "اختر من الشركات")}>
                <select style={S.input} value={q.companyId ?? ""} onChange={(e) => pickCompany(e.target.value)}>
                  <option value="">{L("— New / prospect client —", "— عميل جديد / محتمل —")}</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.industry ? ` · ${c.industry}` : ""}</option>)}
                </select>
              </Field>
              <Field label={L("System / industry", "النظام / النشاط")}>
                <select style={S.input} value={q.industry || ""} onChange={(e) => set({ industry: e.target.value })}>
                  <option value="">{L("— Select —", "— اختر —")}</option>
                  {industryOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={L("Client name *", "اسم العميل *")}><input style={S.input} dir="auto" value={q.clientName} onChange={(e) => set({ clientName: e.target.value })} /></Field>
              <Field label={L("Attention (contact person)", "عناية (الشخص المسؤول)")}><input style={S.input} dir="auto" value={q.clientContact} onChange={(e) => set({ clientContact: e.target.value })} /></Field>
              <Field label={L("Email", "الإيميل")}><input style={S.input} value={q.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} /></Field>
              <Field label={L("Phone", "الهاتف")}><input style={S.input} value={q.clientPhone} onChange={(e) => set({ clientPhone: e.target.value })} /></Field>
            </div>
            <Field label={L("Address", "العنوان")} style={{ marginTop: 12 }}><input style={S.input} dir="auto" value={q.clientAddress} onChange={(e) => set({ clientAddress: e.target.value })} /></Field>
            {company && (
              <div style={S.infoStrip}>
                🏢 {L("Current plan", "الباقة الحالية")}: <b>{plan ? `${plan.name} — ${fmtMoney(plan.price, plan.currency)}` : "—"}</b>
                &nbsp;·&nbsp; {L("Status", "الحالة")}: <b>{company.status}</b>
                {plan && !addedSources.has(`plan:${plan.id}`) && (
                  <button type="button" style={S.linkBtn} onClick={() => addPlan(plan)}>＋ {L("add this plan", "أضف هذه الباقة")}</button>
                )}
              </div>
            )}
          </Card>

          {/* 2 · OFFER */}
          <Card id="q-offer" icon="🗓️" title={L("Offer details", "تفاصيل العرض")}>
            <div style={S.grid3}>
              <Field label={L("Quotation No.", "رقم العرض")}><input style={{ ...S.input, fontFamily: "Consolas, monospace" }} value={q.number} onChange={(e) => set({ number: e.target.value })} /></Field>
              <Field label={L("Issue date", "تاريخ الإصدار")}><input type="date" style={S.input} value={q.issueDate} onChange={(e) => set({ issueDate: e.target.value })} /></Field>
              <Field label={`${L("Valid for (days)", "الصلاحية (يوم)")} → ${dmy(validUntil(q))}`}>
                <Stepper value={q.validDays} onChange={(v) => set({ validDays: v })} presets={[7, 15, 30, 60]} />
              </Field>
              <Field label={L("Currency", "العملة")}>
                <select style={S.input} value={q.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
              <Field label={L("Prepared by", "أعدّه")}><input style={S.input} dir="auto" value={q.preparedBy || ""} onChange={(e) => set({ preparedBy: e.target.value })} /></Field>
            </div>
          </Card>

          {/* 3 · ITEMS */}
          <Card id="q-items" icon="📦" title={L("Items", "البنود")}
            right={<span style={S.countPill}>{q.lines.length} {L("items", "بند")}</span>}>
            <div style={S.addBar}>
              <Btn tone="primary" onClick={() => setPicker(true)}>🧩 {L("Add cards from company", "أضف كروت الشركة")}</Btn>
              <Btn tone="accent" onClick={() => setSmart(true)}>⚡ {L("Smart build", "بناء ذكي")}</Btn>
              <select style={{ ...S.input, width: "auto", minWidth: 210 }} value="" onChange={(e) => addPreset(e.target.value)}>
                <option value="">🛠 {L("Add a service…", "أضف خدمة…")}</option>
                {SERVICE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.icon} {lang === "ar" ? p.titleAr : p.titleEn}{priceFor(priceBook, p.key) !== "" ? ` — ${fmtMoney(priceFor(priceBook, p.key))}` : ""}</option>)}
              </select>
              {!!plans.length && (
                <select style={{ ...S.input, width: "auto", minWidth: 190 }} value="" onChange={(e) => { const p = plans.find((x) => String(x.id) === e.target.value); if (p) addPlan(p); }}>
                  <option value="">📦 {L("Add a plan…", "أضف باقة…")}</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price, p.currency)}</option>)}
                </select>
              )}
              <Btn tone="soft" onClick={() => addLines([emptyLine()])}>＋ {L("Blank item", "بند فارغ")}</Btn>
            </div>

            {!!q.lines.length && (
              <div style={S.bulkBar}>
                <span style={{ color: "#64748b" }}>{L("Quick tools:", "أدوات سريعة:")}</span>
                <button type="button" style={S.linkBtn} onClick={fillFromPriceBook}>💡 {L("Fill empty prices from price book", "عبّئ الأسعار الفارغة من القائمة")}</button>
                <BulkPrice onApply={(price, scope) => set((cur) => ({ lines: cur.lines.map((l) => ((scope === "modules" ? l.unit === "module" : scope === "empty" ? !num(l.unitPrice) : true) ? { ...l, unitPrice: price } : l)) }))} />
                <button type="button" style={S.linkBtn} onClick={() => set((cur) => ({ lines: [...cur.lines].sort((a, b) => (Number(!!a.optional) - Number(!!b.optional)) || (Number(a.kind === "one_time") - Number(b.kind === "one_time"))) }))}>↕ {L("Sort by type", "رتّب حسب النوع")}</button>
                <button type="button" style={{ ...S.linkBtn, color: "#b91c1c" }} onClick={() => { if (window.confirm(L("Remove all items?", "حذف كل البنود؟"))) set({ lines: [] }); }}>🗑 {L("Clear all", "حذف الكل")}</button>
              </div>
            )}

            {!q.lines.length && (
              <div style={S.emptyBig}>
                <div className="bpx-xl">📦</div>
                <div style={{ marginTop: 6 }}>{L("Start with “Add cards from company” or let “Smart build” create a complete priced offer.", "ابدأ بـ «أضف كروت الشركة» أو خلّي «البناء الذكي» يعمل عرض كامل مسعّر.")}</div>
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {q.lines.map((l, i) => (
                <LineEditor
                  key={l.id}
                  line={l}
                  index={i}
                  count={q.lines.length}
                  currency={q.currency}
                  remembered={priceFor(priceBook, priceKey(l))}
                  onChange={(patch) => setLine(l.id, patch)}
                  onRemove={() => set((cur) => ({ lines: cur.lines.filter((x) => x.id !== l.id) }))}
                  onDuplicate={() => set((cur) => { const idx = cur.lines.findIndex((x) => x.id === l.id); const next = [...cur.lines]; next.splice(idx + 1, 0, { ...l, id: newLineId() }); return { lines: next }; })}
                  onMove={(d) => set((cur) => { const next = [...cur.lines]; const j = i + d; if (j < 0 || j >= next.length) return {}; [next[i], next[j]] = [next[j], next[i]]; return { lines: next }; })}
                  onRemember={() => rememberPrice(l)}
                />
              ))}
            </div>
          </Card>

          {/* 4 · PRICING */}
          <Card id="q-pricing" icon="💰" title={L("Billing, discount & tax", "الفوترة والخصم والضريبة")}>
            <div style={S.grid3}>
              <Field label={L("Billing cycle", "دورة الفوترة")}>
                <Segmented value={q.cycle} onChange={(v) => set({ cycle: v })} options={BILLING_CYCLES.map((c) => ({ id: c.id, label: lang === "ar" ? c.ar : c.en }))} />
              </Field>
              <Field label={L("Contract term (months)", "مدة العقد (أشهر)")}>
                <Stepper value={q.contractMonths} disabled={cyc.months === 0} onChange={(v) => set({ contractMonths: v })} presets={[3, 6, 12, 24, 36]} />
              </Field>
              <Field label={L("Overall discount %", "خصم إجمالي %")}>
                <Stepper value={q.discountPct} step={0.5} max={100} onChange={(v) => set({ discountPct: v })} presets={[0, 5, 10, 15, 20]} suffix="%" />
              </Field>
              <Field label={L("VAT %", "الضريبة %")}>
                <Stepper value={q.vatPct} step={0.5} max={100} onChange={(v) => set({ vatPct: v })} presets={[0, 5, 15]} suffix="%" />
              </Field>
            </div>
            <div style={S.totalsRow}>
              {totals.recurring > 0 && (
                <TotalCard th={th} title={cyc.id === "one_time" ? L("Total", "الإجمالي") : `${L("Total", "الإجمالي")} ${lang === "ar" ? cyc.perAr : cyc.perEn}`}
                  rows={[[L("Subtotal", "المجموع"), totals.recurring], ...(num(q.discountPct) ? [[L("Discount", "الخصم"), -totals.recurringDiscount]] : []), ...(num(q.vatPct) ? [[L("VAT", "الضريبة"), totals.recurringVat]] : [])]}
                  total={totals.recurringTotal} currency={q.currency} />
              )}
              {totals.oneTime > 0 && (
                <TotalCard th={th} title={L("One-time", "مرة واحدة")}
                  rows={[[L("Subtotal", "المجموع"), totals.oneTime], ...(num(q.discountPct) ? [[L("Discount", "الخصم"), -totals.oneTimeDiscount]] : []), ...(num(q.vatPct) ? [[L("VAT", "الضريبة"), totals.oneTimeVat]] : [])]}
                  total={totals.oneTimeTotal} currency={q.currency} />
              )}
              {cyc.months > 0 && totals.recurring > 0 && (
                <TotalCard th={th} accent title={`${L("Contract value", "قيمة العقد")} · ${num(q.contractMonths)} ${L("mo", "شهر")}`}
                  rows={[[L("First invoice", "الفاتورة الأولى"), totals.firstInvoice], [L("Monthly equivalent", "ما يعادل شهرياً"), totals.monthlyEquivalent]]}
                  total={totals.contractValue} currency={q.currency} />
              )}
            </div>
          </Card>

          {/* 5 · TERMS */}
          <Card id="q-terms" icon="📜" title={L("Terms & conditions", "الشروط والأحكام")}
            hint={L("Switch terms on or off, tune the numbers right inside the sentence, edit the wording, or add your own.", "فعّل أو عطّل الشروط، عدّل الأرقام جوّا الجملة مباشرة، غيّر الصياغة، أو أضف شروطك.")}>
            <TermsEditor
              q={q}
              list={q.termsList}
              onChange={(termsList) => set({ termsList })}
              onSaveDefault={async () => { if (await saveConfig({ ...config, defaults: { ...(config.defaults || {}), termsList: q.termsList } })) flash(L("Saved as default terms for new quotations", "تم الحفظ كشروط افتراضية للعروض الجديدة")); }}
            />
            <Field label={L("Notes shown on the quotation", "ملاحظات تظهر على العرض")} style={{ marginTop: 14 }}>
              <textarea style={S.textarea} dir="auto" rows={3} value={q.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
          </Card>

          {/* 6 · DESIGN */}
          <Card id="q-design" icon="🎨" title={L("Design & wording", "التصميم والصياغة")}>
            <Field label={L("Colour theme", "لون التصميم")}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {THEMES.map((x) => (
                  <button key={x.id} type="button" onClick={() => set({ theme: x.id })} style={S.swatch(x, q.theme === x.id)} title={x.en}>
                    <span style={S.swatchDot(x)} /> {lang === "ar" ? x.ar : x.en}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ ...S.grid3, marginTop: 12 }}>
              <Field label={L("Document language", "لغة المستند")}>
                <Segmented value={q.showArabic === false ? "en" : "both"} onChange={(v) => set({ showArabic: v === "both" })} options={[{ id: "both", label: "EN + ع" }, { id: "en", label: "English" }]} />
              </Field>
              <Field label={L("Logo on the document", "الشعار على المستند")}>
                <Segmented value={q.showLogo === false ? "off" : "on"} onChange={(v) => set({ showLogo: v === "on" })} options={[{ id: "on", label: config.logo ? L("Show", "إظهار") : L("Initials", "الأحرف") }, { id: "off", label: L("Hide", "إخفاء") }]} />
              </Field>
              <Field label={L("Upload logo (all quotations)", "رفع شعار (لكل العروض)")}>
                <LogoUpload logo={config.logo} onChange={async (logo) => { if (await saveConfig({ ...config, logo })) flash(logo ? L("Logo saved", "تم حفظ الشعار") : L("Logo removed", "تم حذف الشعار")); }} flash={flash} />
              </Field>
            </div>
            <div style={{ ...S.grid2, marginTop: 12 }}>
              <Field label={L("Title (English)", "العنوان (إنجليزي)")}><input style={S.input} value={q.title} onChange={(e) => set({ title: e.target.value })} /></Field>
              <Field label={L("Title (Arabic)", "العنوان (عربي)")}><input style={S.input} dir="rtl" value={q.titleAr || ""} onChange={(e) => set({ titleAr: e.target.value })} /></Field>
            </div>
            <Field label={L("Introduction (optional)", "مقدمة (اختياري)")} style={{ marginTop: 12 }}>
              <textarea style={S.textarea} dir="auto" rows={3} value={q.intro} onChange={(e) => set({ intro: e.target.value })}
                placeholder={L("e.g. Thank you for your interest. Please find our offer below…", "مثال: نشكركم على اهتمامكم، نرفق لكم عرضنا أدناه…")} />
            </Field>
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900, color: "#0f766e" }}>🏢 {L("Issued by (from Billing Settings)", "صادر عن (من إعدادات الفوترة)")}</summary>
              <div style={{ ...S.grid2, marginTop: 10 }}>
                <Field label={L("Company", "الشركة")}><input style={S.input} value={q.issuerName} onChange={(e) => set({ issuerName: e.target.value })} /></Field>
                <Field label={L("Tax / TRN", "الرقم الضريبي")}><input style={S.input} value={q.issuerTaxId} onChange={(e) => set({ issuerTaxId: e.target.value })} /></Field>
                <Field label={L("Email", "الإيميل")}><input style={S.input} value={q.issuerEmail} onChange={(e) => set({ issuerEmail: e.target.value })} /></Field>
                <Field label={L("Phone", "الهاتف")}><input style={S.input} value={q.issuerPhone} onChange={(e) => set({ issuerPhone: e.target.value })} /></Field>
              </div>
              <Field label={L("Address", "العنوان")} style={{ marginTop: 10 }}><input style={S.input} value={q.issuerAddress} onChange={(e) => set({ issuerAddress: e.target.value })} /></Field>
            </details>
          </Card>

          {!wide && <SidePanel q={q} opts={opts} totals={totals} insights={insights} th={th} onPreview={() => setPreview(true)} onDuplicate={q.id ? () => onDuplicate(q) : null} />}
        </div>

        {wide && (
          <div style={{ position: "sticky", top: 170, alignSelf: "start" }}>
            <SidePanel q={q} opts={opts} totals={totals} insights={insights} th={th} onPreview={() => setPreview(true)} onDuplicate={q.id ? () => onDuplicate(q) : null} />
          </div>
        )}
      </div>

      {picker && (
        <ModulePicker
          initialIndustry={q.industry || company?.industry || "meat"}
          companyName={q.clientName}
          added={addedSources}
          priceBook={priceBook}
          onClose={() => setPicker(false)}
          onAdd={(lines, industry) => { set((cur) => ({ lines: [...cur.lines, ...lines], industry: cur.industry || industry })); setPicker(false); }}
        />
      )}
      {smart && (
        <SmartBuild
          q={q}
          priceBook={priceBook}
          industry={q.industry || company?.industry || "meat"}
          onClose={() => setSmart(false)}
          onBuild={(lines, replace, industry) => { set((cur) => ({ lines: replace ? lines : [...cur.lines, ...lines], industry: cur.industry || industry })); setSmart(false); flash(L(`${lines.length} items added`, `تمت إضافة ${lines.length} بند`)); }}
        />
      )}
      {preview && (
        <PreviewModal
          q={q}
          opts={opts}
          busy={busy}
          onClose={() => setPreview(false)}
          onPdf={() => run("pdf", () => save({ then: downloadQuotePdf }))}
          onXlsx={() => run("xlsx", () => save({ then: downloadQuoteXlsx }))}
          onPrint={() => run("print", () => printQuote(q, opts))}
        />
      )}
    </div>
  );
}

/* ─────────── right-hand summary ─────────── */

function SidePanel({ q, opts, totals, insights, th, onPreview, onDuplicate }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const cyc = cycleById(q.cycle);
  const tone = { err: ["#fef2f2", "#b91c1c", "⛔"], warn: ["#fffbeb", "#b45309", "⚠️"], tip: ["#eff6ff", "#1d4ed8", "💡"], ok: ["#ecfdf5", "#047857", "✅"] };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={S.sumCard(th)}>
        <div style={{ opacity: 0.85 }}>{totals.recurring ? `${L("Total", "الإجمالي")} ${lang === "ar" ? cyc.perAr : cyc.perEn}` : L("Total", "الإجمالي")}</div>
        <div className="bpx-xxl" style={{ fontWeight: 1000, lineHeight: 1.1, margin: "4px 0 10px" }}>{fmtMoney(totals.recurringTotal || totals.oneTimeTotal, q.currency)}</div>
        <SumRow k={L("One-time", "مرة واحدة")} v={fmtMoney(totals.oneTimeTotal, q.currency)} show={totals.oneTime > 0 && totals.recurring > 0} />
        <SumRow k={L("First invoice", "الفاتورة الأولى")} v={fmtMoney(totals.firstInvoice, q.currency)} show={totals.recurring > 0 && totals.oneTime > 0} />
        <SumRow k={`${L("Contract", "العقد")} · ${num(q.contractMonths)} ${L("mo", "شهر")}`} v={fmtMoney(totals.contractValue, q.currency)} show={cyc.months > 0 && totals.recurring > 0} />
        <SumRow k={L("Client saves", "توفير العميل")} v={fmtMoney(totals.savings, q.currency)} show={totals.savings > 0} />
        <SumRow k={L("Optional add-ons", "إضافات اختيارية")} v={fmtMoney(totals.optional, q.currency)} show={totals.optional > 0} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Btn tone="white" onClick={onPreview} style={{ flex: 1 }}>👁 {L("Full preview", "معاينة كاملة")}</Btn>
          {onDuplicate && <Btn tone="glass" title={L("Duplicate", "نسخ")} onClick={onDuplicate}>⧉</Btn>}
        </div>
      </div>

      <div style={S.panelTight}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>🧠 {L("Smart checks", "فحص ذكي")}</div>
        <div style={{ display: "grid", gap: 6 }}>
          {insights.map((x, i) => {
            const [bg, fg, ic] = tone[x.level] || tone.tip;
            return <div key={i} className="bpx-sm" style={{ background: bg, color: fg, borderRadius: 10, padding: "8px 10px", fontWeight: 800 }}>{ic} {lang === "ar" ? x.ar : x.en}</div>;
          })}
        </div>
      </div>

      <div style={S.panelTight}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>👁 {L("Live mini preview", "معاينة مصغّرة مباشرة")}</div>
        <div style={{ position: "relative", height: 470, overflow: "hidden", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "zoom-in", background: "#fff" }} onClick={onPreview}>
          <MiniPreview q={q} opts={opts} />
        </div>
      </div>
    </div>
  );
}

function MiniPreview({ q, opts }) {
  const html = useDeferred(q, (v) => buildQuoteHtml(v, opts), 400);
  return (
    <iframe title="mini" sandbox="allow-same-origin" srcDoc={html}
      style={{ width: 794, height: 1123, border: 0, transform: "scale(0.44)", transformOrigin: "top left", pointerEvents: "none", position: "absolute", left: 0, top: 0 }} />
  );
}

/* Debounced derived value so typing never waits on the preview. */
function useDeferred(value, fn, ms) {
  const [out, setOut] = useState(() => fn(value));
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => { const id = setTimeout(() => setOut(fnRef.current(value)), ms); return () => clearTimeout(id); }, [value, ms]);
  return out;
}

function SumRow({ k, v, show = true }) {
  if (!show) return null;
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,.18)" }}><span style={{ opacity: 0.9 }}>{k}</span><b>{v}</b></div>;
}

/* ═══════════════════════════ Line editor ═══════════════════════════ */

function LineEditor({ line: l, index, count, currency, remembered, onChange, onRemove, onDuplicate, onMove, onRemember }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [open, setOpen] = useState(!l.titleEn && !l.titleAr);
  const hasPrice = String(l.unitPrice ?? "") !== "";
  const canRemember = hasPrice && (remembered === "" || num(remembered) !== num(l.unitPrice));
  return (
    <div style={S.line(l)}>
      <div style={S.lineHead}>
        <span style={S.lineNo(l)}>{index + 1}</span>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <input style={S.lineTitle} placeholder={L("Description (English)", "الوصف (إنجليزي)")} value={l.titleEn} onChange={(e) => onChange({ titleEn: e.target.value })} />
          <input style={{ ...S.lineTitle, color: "#475569", fontWeight: 700 }} dir="rtl" placeholder="الوصف (عربي)" value={l.titleAr} onChange={(e) => onChange({ titleAr: e.target.value })} />
        </div>
        <div style={S.lineNums}>
          <MiniNum label={L("Qty", "الكمية")} value={l.qty} onChange={(v) => onChange({ qty: v })} />
          <span style={{ color: "#94a3b8", fontWeight: 900, paddingBottom: 12 }}>×</span>
          <MiniNum label={`${L("Price", "السعر")} ${currency}`} value={l.unitPrice} onChange={(v) => onChange({ unitPrice: v })} wide warn={!hasPrice} />
          <span style={{ color: "#94a3b8", fontWeight: 900, paddingBottom: 12 }}>=</span>
          <div style={{ textAlign: "end", minWidth: 130, paddingBottom: 8 }}>
            <div className="bpx-xs" style={{ color: "#64748b", fontWeight: 800 }}>{L("Amount", "المبلغ")}</div>
            <div className="bpx-lg" style={{ fontWeight: 1000, color: l.optional ? "#64748b" : "#0f172a" }}>{fmtMoney(lineTotal(l))}</div>
          </div>
        </div>
      </div>

      <div style={S.lineTools}>
        <Segmented small value={l.kind} onChange={(v) => onChange({ kind: v })} options={LINE_KINDS.map((k) => ({ id: k.id, label: lang === "ar" ? k.ar : k.en }))} />
        <label style={S.toggleLbl}><Switch on={!!l.optional} onChange={(v) => onChange({ optional: v })} /> {L("Optional add-on", "إضافة اختيارية")}</label>
        {num(l.discountPct) > 0 && <span style={S.discTag}>−{num(l.discountPct)}%</span>}
        {remembered !== "" && !hasPrice && (
          <button type="button" style={S.linkBtn} onClick={() => onChange({ unitPrice: remembered })}>💡 {L(`use saved price ${fmtMoney(remembered)}`, `استخدم السعر المحفوظ ${fmtMoney(remembered)}`)}</button>
        )}
        <span style={{ flex: 1 }} />
        {canRemember && <button type="button" style={S.linkBtn} title={L("Remember this price for next time", "احفظ هذا السعر للمرات القادمة")} onClick={onRemember}>💾 {L("Remember price", "احفظ السعر")}</button>}
        <button type="button" style={S.iconBtn} onClick={() => setOpen((v) => !v)} title={L("More", "المزيد")}>{open ? "▴" : "▾"}</button>
        <button type="button" style={S.iconBtn} disabled={index === 0} onClick={() => onMove(-1)} title={L("Move up", "لأعلى")}>↑</button>
        <button type="button" style={S.iconBtn} disabled={index === count - 1} onClick={() => onMove(1)} title={L("Move down", "لأسفل")}>↓</button>
        <button type="button" style={S.iconBtn} onClick={onDuplicate} title={L("Duplicate", "نسخ")}>⧉</button>
        <button type="button" style={{ ...S.iconBtn, color: "#dc2626", borderColor: "#fecaca" }} onClick={onRemove} title={L("Remove", "حذف")}>✕</button>
      </div>

      {open && (
        <div style={{ ...S.grid3, marginTop: 10 }}>
          <Field label={L("Unit", "الوحدة")}>
            <select style={S.input} value={l.unit} onChange={(e) => onChange({ unit: e.target.value })}>{UNITS.map((u) => <option key={u.id} value={u.id}>{lang === "ar" ? u.ar : u.en}</option>)}</select>
          </Field>
          <Field label={L("Item discount %", "خصم البند %")}>
            <input type="number" min="0" max="100" step="any" style={S.input} value={l.discountPct} placeholder="0" onChange={(e) => onChange({ discountPct: e.target.value })} />
          </Field>
          <Field label={L("Details — what is included", "التفاصيل — ماذا يشمل")} style={{ gridColumn: "1 / -1" }}>
            <input style={S.input} dir="auto" value={l.details} onChange={(e) => onChange({ details: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}

function MiniNum({ label, value, onChange, wide, warn }) {
  return (
    <label style={{ display: "grid", gap: 2 }}>
      <span className="bpx-xs" style={{ color: "#64748b", fontWeight: 800 }}>{label}</span>
      <input type="number" min="0" step="any" value={value} placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        style={{ ...S.input, minHeight: 48, width: wide ? 150 : 90, textAlign: "center", padding: "6px 8px", background: warn ? "#fffbeb" : "#fff", borderColor: warn ? "#fcd34d" : INPUT_BORDER }} />
    </label>
  );
}

function BulkPrice({ onApply }) {
  const { t } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [scope, setScope] = useState("modules");
  if (!open) return <button type="button" style={S.linkBtn} onClick={() => setOpen(true)}>🏷 {L("One price for many", "سعر موحّد لعدة بنود")}</button>;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="number" min="0" step="any" style={{ ...S.input, width: 130, minHeight: 44 }} value={price} placeholder="0.00" onChange={(e) => setPrice(e.target.value)} autoFocus />
      <select style={{ ...S.input, width: "auto", minHeight: 44 }} value={scope} onChange={(e) => setScope(e.target.value)}>
        <option value="modules">{L("all modules", "كل الوحدات")}</option>
        <option value="empty">{L("empty prices", "الأسعار الفارغة")}</option>
        <option value="all">{L("every item", "كل البنود")}</option>
      </select>
      <Btn tone="primary" style={{ minHeight: 44 }} disabled={price === ""} onClick={() => { onApply(price, scope); setOpen(false); }}>{L("Apply", "طبّق")}</Btn>
      <button type="button" style={S.linkBtn} onClick={() => setOpen(false)}>✕</button>
    </span>
  );
}

/* ═══════════════════════════ Terms editor ═══════════════════════════ */

function TermsEditor({ q, list, onChange, onSaveDefault }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ en: "", ar: "" });

  const update = (id, patch) => onChange(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  const present = new Set(list.map((x) => x.key).filter(Boolean));
  const missing = TERM_LIBRARY.filter((x) => !present.has(x.key));
  const onCount = list.filter((x) => x.on).length;

  const groupOf = (x) => (x.key ? termTemplate(x.key)?.group : "other") || "other";
  const groups = [...TERM_GROUPS, { id: "other", en: "Your own terms", ar: "شروطك الخاصة" }];

  return (
    <div>
      <div style={S.bulkBar}>
        <span style={S.countPill}>{onCount} / {list.length} {L("enabled", "مفعّل")}</span>
        <button type="button" style={S.linkBtn} onClick={() => onChange(list.map((x) => ({ ...x, on: true })))}>✓ {L("Enable all", "فعّل الكل")}</button>
        <button type="button" style={S.linkBtn} onClick={() => onChange(list.map((x) => ({ ...x, on: false })))}>○ {L("Disable all", "عطّل الكل")}</button>
        <button type="button" style={S.linkBtn} onClick={() => { if (window.confirm(L("Reset every term to the defaults?", "إرجاع كل الشروط للافتراضي؟"))) onChange(defaultTermsList()); }}>↺ {L("Reset to defaults", "الافتراضي")}</button>
        {onSaveDefault && <button type="button" style={S.linkBtn} onClick={onSaveDefault}>⭐ {L("Save as my default", "احفظها كافتراضي")}</button>}
      </div>

      {groups.map((g) => {
        const items = list.map((x, i) => ({ x, i })).filter(({ x }) => groupOf(x) === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id} style={{ marginTop: 14 }}>
            <div className="bpx-sm" style={S.groupHead}>{lang === "ar" ? g.ar : g.en}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map(({ x, i }) => (
                <TermRow key={x.id} q={q} term={x} first={i === 0} last={i === list.length - 1}
                  onChange={(patch) => update(x.id, patch)} onMove={(d) => move(i, d)}
                  onRemove={() => onChange(list.filter((y) => y.id !== x.id))} />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        {!!missing.length && (
          <select style={{ ...S.input, width: "auto", minWidth: 280, maxWidth: "100%" }} value="" onChange={(e) => { if (e.target.value) onChange([...list, { ...makeTerm(e.target.value), on: true }]); }}>
            <option value="">📚 {L(`Add from library (${missing.length})…`, `أضف من المكتبة (${missing.length})…`)}</option>
            {missing.map((m) => <option key={m.key} value={m.key}>{termText(makeTerm(m.key), q, lang === "ar" ? "ar" : "en").slice(0, 90)}</option>)}
          </select>
        )}
        <Btn tone="soft" onClick={() => setAddOpen((v) => !v)}>✍️ {L("Write a new term", "اكتب شرطاً جديداً")}</Btn>
      </div>
      {addOpen && (
        <div style={{ ...S.termRow(true), marginTop: 10 }}>
          <div style={S.grid2}>
            <textarea style={S.textarea} rows={2} placeholder="English…" value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} />
            <textarea style={S.textarea} rows={2} dir="rtl" placeholder="بالعربي…" value={draft.ar} onChange={(e) => setDraft({ ...draft, ar: e.target.value })} />
          </div>
          <div className="bpx-sm" style={{ color: "#64748b", marginTop: 6 }}>{L("Tip: {vat}, {cycle} and {validUntil} fill themselves in.", "ملاحظة: {vat} و{cycle} و{validUntil} بيتعبّوا لحالهم.")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn tone="primary" disabled={!draft.en.trim() && !draft.ar.trim()} onClick={() => { onChange([...list, makeCustomTerm(draft.en.trim(), draft.ar.trim())]); setDraft({ en: "", ar: "" }); setAddOpen(false); }}>＋ {L("Add term", "أضف الشرط")}</Btn>
            <Btn tone="soft" onClick={() => setAddOpen(false)}>{L("Cancel", "إلغاء")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function TermRow({ q, term, first, last, onChange, onMove, onRemove }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const tpl = term.key ? termTemplate(term.key) : null;
  const [editing, setEditing] = useState(false);
  const langKey = lang === "ar" ? "ar" : "en";
  const other = langKey === "ar" ? "en" : "ar";
  const source = (term[langKey] || (tpl ? tpl[langKey] : "") || term[other]) || "";
  const overridden = !!(tpl && (term.en || term.ar));
  const parts = source.split(/(\{\w+\})/g).filter((p) => p !== "");
  const params = term.params || {};

  return (
    <div style={S.termRow(term.on)}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Switch on={term.on} onChange={(v) => onChange({ on: v })} />
        <div style={{ flex: "1 1 320px", minWidth: 0, opacity: term.on ? 1 : 0.5 }}>
          {!editing ? (
            <>
              <div dir={langKey === "ar" ? "rtl" : "ltr"} style={{ lineHeight: 2.2 }}>
                {parts.map((p, i) => {
                  const m = /^\{(\w+)\}$/.exec(p);
                  if (!m) return <span key={i}>{p}</span>;
                  const k = m[1];
                  if (k in params) {
                    return (
                      <input key={i} type="number" step="any" min="0" value={params[k]} aria-label={k}
                        onChange={(e) => onChange({ params: { ...params, [k]: e.target.value } })}
                        style={S.paramInput} />
                    );
                  }
                  return <span key={i} style={S.autoVar} title={L("Filled automatically", "يتعبّى تلقائياً")}>{termText({ ...term, en: p, ar: p }, q, langKey)}</span>;
                })}
              </div>
              {termText(term, q, other) && <div className="bpx-sm" dir={other === "ar" ? "rtl" : "ltr"} style={{ color: "#64748b", marginTop: 2 }}>{termText(term, q, other)}</div>}
            </>
          ) : (
            <div style={S.grid2}>
              <textarea style={S.textarea} rows={3} value={term.en || tpl?.en || ""} onChange={(e) => onChange({ en: e.target.value })} />
              <textarea style={S.textarea} rows={3} dir="rtl" value={term.ar || tpl?.ar || ""} onChange={(e) => onChange({ ar: e.target.value })} />
              {tpl?.params?.length ? <div className="bpx-sm" style={{ color: "#64748b", gridColumn: "1 / -1" }}>{L("Keep these placeholders so the numbers stay editable:", "خلّي هالرموز لتضل الأرقام قابلة للتعديل:")} <b>{tpl.params.map((p) => `{${p.k}}`).join("  ")}</b></div> : null}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" style={S.iconBtn} onClick={() => setEditing((v) => !v)} title={L("Edit wording", "عدّل الصياغة")}>{editing ? "✓" : "✎"}</button>
          {overridden && <button type="button" style={S.iconBtn} onClick={() => onChange({ en: "", ar: "" })} title={L("Restore original wording", "الصياغة الأصلية")}>↺</button>}
          <button type="button" style={S.iconBtn} disabled={first} onClick={() => onMove(-1)} title={L("Move up", "لأعلى")}>↑</button>
          <button type="button" style={S.iconBtn} disabled={last} onClick={() => onMove(1)} title={L("Move down", "لأسفل")}>↓</button>
          <button type="button" style={{ ...S.iconBtn, color: "#dc2626", borderColor: "#fecaca" }} onClick={onRemove} title={L("Remove", "حذف")}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Module picker ═══════════════════════════ */

function ModulePicker({ initialIndustry, companyName, added, priceBook, onClose, onAdd }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [industry, setIndustry] = useState(initialIndustry || "meat");
  const catalog = useMemo(() => moduleCatalog(industry), [industry]);
  const [picked, setPicked] = useState(() => new Set());
  const [price, setPrice] = useState("");
  const [mode, setMode] = useState("lines");
  const [query, setQuery] = useState("");

  useEffect(() => { setPicked(new Set(catalog.filter((m) => !added.has(m.key)).map((m) => m.key))); }, [catalog, added]);

  const toggle = (key) => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const chosen = catalog.filter((m) => picked.has(m.key));
  const shown = catalog.filter((m) => !query.trim() || `${m.titleEn} ${m.titleAr} ${m.details}`.toLowerCase().includes(query.trim().toLowerCase()));
  const priceOf = (key) => (price !== "" ? price : priceFor(priceBook, key));

  const confirm = () => {
    if (!chosen.length) return;
    if (mode === "bundle") {
      const key = `bundle:${industry}`;
      onAdd([emptyLine({
        kind: "recurring", unit: "service", titleEn: `System modules package (${chosen.length} modules)`, titleAr: `باقة وحدات النظام (${chosen.length} وحدة)`,
        details: chosen.map((m) => (lang === "ar" && m.titleAr ? m.titleAr : m.titleEn)).join(" · "), qty: 1,
        unitPrice: price !== "" ? price : priceFor(priceBook, key), source: key,
      })], industry);
      return;
    }
    onAdd(chosen.map((m) => emptyLine({ kind: "recurring", unit: "module", titleEn: m.titleEn, titleAr: m.titleAr, details: m.details, qty: 1, unitPrice: priceOf(m.key), source: m.key })), industry);
  };

  return (
    <Modal onClose={onClose} title={`🧩 ${L("Add cards from company", "أضف كروت الشركة")}`} sub={`${companyName ? `${companyName} · ` : ""}${L("tick what goes into this quotation", "اختر ما يدخل في هذا العرض")}`}
      footer={<>
        <span style={{ marginInlineEnd: "auto", color: "#64748b" }}>{chosen.length} / {catalog.length} {L("selected", "محدد")}</span>
        <Btn tone="soft" onClick={onClose}>{L("Cancel", "إلغاء")}</Btn>
        <Btn tone="primary" disabled={!chosen.length} onClick={confirm}>＋ {L("Add", "أضف")} {mode === "bundle" ? L("as one package", "كباقة واحدة") : `${chosen.length} ${L("items", "بند")}`}</Btn>
      </>}>
      <div style={{ ...S.grid3, marginBottom: 12 }}>
        <Field label={L("System", "النظام")}>
          <select style={S.input} value={industry} onChange={(e) => setIndustry(e.target.value)}>{industryOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        </Field>
        <Field label={L("Price for each (blank = price book)", "السعر لكل وحدة (فارغ = القائمة)")}>
          <input type="number" min="0" step="any" style={S.input} value={price} placeholder="0.00" onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={L("Add as", "أضف كـ")}>
          <Segmented value={mode} onChange={setMode} options={[{ id: "lines", label: L("Item per card", "بند لكل كرت") }, { id: "bundle", label: L("One package", "باقة واحدة") }]} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ ...S.searchBox, flex: 1 }}><span>🔎</span><input style={S.searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L("Filter cards…", "فلترة الكروت…")} /></div>
        <button type="button" style={S.linkBtn} onClick={() => setPicked(new Set(catalog.map((m) => m.key)))}>{L("Select all", "تحديد الكل")}</button>
        <button type="button" style={S.linkBtn} onClick={() => setPicked(new Set())}>{L("Clear", "مسح")}</button>
      </div>
      <div style={S.modGrid}>
        {shown.map((m) => {
          const on = picked.has(m.key);
          const pb = priceFor(priceBook, m.key);
          return (
            <label key={m.key} style={S.modCard(on)}>
              <input type="checkbox" checked={on} onChange={() => toggle(m.key)} style={{ marginTop: 6, width: 20, height: 20 }} />
              <span className="bpx-xl" style={{ lineHeight: 1 }}>{m.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 1000 }}>{m.titleEn}</span>
                {m.titleAr && <span style={{ display: "block", color: "#475569" }} dir="rtl">{m.titleAr}</span>}
                <span className="bpx-sm" style={{ display: "block", color: "#64748b" }}>{m.details}</span>
                <span style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {pb !== "" && <span className="bpx-sm" style={S.tag("#ecfdf5", "#047857")}>{fmtMoney(pb)}</span>}
                  {added.has(m.key) && <span className="bpx-sm" style={S.tag("#fef3c7", "#92400e")}>{L("already added", "مضاف")}</span>}
                </span>
              </span>
            </label>
          );
        })}
        {!shown.length && <div style={S.empty}>{L("No cards match.", "لا توجد كروت مطابقة.")}</div>}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ Smart build ═══════════════════════════ */

function SmartBuild({ q, priceBook, industry: ind0, onClose, onBuild }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [f, setF] = useState({ industry: ind0 || "meat", branches: 1, users: 0, modules: "lines", hosting: true, support: true, setup: true, trainingHours: 4, replace: !q.lines.length });
  const set = (p) => setF((cur) => ({ ...cur, ...p }));
  const lines = useMemo(() => smartBuildLines({ ...f, priceBook }), [f, priceBook]);
  const tot = computeTotals({ ...q, lines });
  const missing = lines.filter((l) => String(l.unitPrice) === "").length;
  const cat = moduleCatalog(f.industry);
  const cyc = cycleById(q.cycle);

  return (
    <Modal onClose={onClose} title={`⚡ ${L("Smart build", "البناء الذكي")}`} sub={L("Answer a few questions — a complete, priced quotation is built for you.", "جاوب على كم سؤال — وبيتبنى عرض كامل ومسعّر.")}
      footer={<>
        <label style={{ ...S.toggleLbl, marginInlineEnd: "auto" }}><Switch on={f.replace} onChange={(v) => set({ replace: v })} /> {L("Replace current items", "استبدل البنود الحالية")}</label>
        <Btn tone="soft" onClick={onClose}>{L("Cancel", "إلغاء")}</Btn>
        <Btn tone="primary" disabled={!lines.length} onClick={() => onBuild(lines, f.replace, f.industry)}>⚡ {L(`Build ${lines.length} items`, `ابنِ ${lines.length} بند`)}</Btn>
      </>}>
      <div style={S.grid3}>
        <Field label={L("System", "النظام")}>
          <select style={S.input} value={f.industry} onChange={(e) => set({ industry: e.target.value })}>{industryOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        </Field>
        <Field label={L("Branches / sites", "الفروع / المواقع")}><Stepper value={f.branches} onChange={(v) => set({ branches: v })} presets={[1, 2, 5, 10]} /></Field>
        <Field label={L("Extra users", "مستخدمين إضافيين")}><Stepper value={f.users} onChange={(v) => set({ users: v })} presets={[0, 5, 10, 20]} /></Field>
        <Field label={`${L("Modules", "الوحدات")} (${cat.length})`}>
          <Segmented value={f.modules} onChange={(v) => set({ modules: v })} options={[{ id: "lines", label: L("Each", "كل وحدة") }, { id: "bundle", label: L("Package", "باقة") }, { id: "none", label: L("None", "بدون") }]} />
        </Field>
        <Field label={L("Training hours", "ساعات التدريب")}><Stepper value={f.trainingHours} onChange={(v) => set({ trainingHours: v })} presets={[0, 2, 4, 8]} /></Field>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 16 }}>
        <label style={S.toggleLbl}><Switch on={f.hosting} onChange={(v) => set({ hosting: v })} /> ☁️ {L("Hosting & backups", "الاستضافة والنسخ الاحتياطي")}</label>
        <label style={S.toggleLbl}><Switch on={f.support} onChange={(v) => set({ support: v })} /> 🛟 {L("Support & maintenance", "الدعم والصيانة")}</label>
        <label style={S.toggleLbl}><Switch on={f.setup} onChange={(v) => set({ setup: v })} /> 🧰 {L("Setup & data migration", "التجهيز وترحيل البيانات")}</label>
      </div>
      <div style={S.smartPreview}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <b>{lines.length} {L("items will be created", "بند سيتم إنشاؤه")}</b>
          <b>{fmtMoney(tot.recurringTotal, q.currency)} {lang === "ar" ? cyc.perAr : cyc.perEn} · {L("one-time", "مرة واحدة")} {fmtMoney(tot.oneTimeTotal, q.currency)}</b>
        </div>
        {missing > 0 && <div className="bpx-sm" style={{ color: "#b45309", marginTop: 6 }}>💡 {L(`${missing} item(s) have no saved price yet — they will be highlighted so you can price them (then press “Remember price”).`, `${missing} بند بدون سعر محفوظ — رح ينعلّموا لتسعّرهم (وبعدها اضغط «احفظ السعر»).`)}</div>}
        <div className="bpx-sm" style={{ color: "#475569", marginTop: 6 }}>{lines.slice(0, 8).map((l) => (lang === "ar" && l.titleAr) || l.titleEn).join(" · ")}{lines.length > 8 ? " …" : ""}</div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ Preview / settings modals ═══════════════════════════ */

function PreviewModal({ q, opts, busy, onClose, onPdf, onXlsx, onPrint }) {
  const { t } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const html = useMemo(() => buildQuoteHtml(q, opts), [q, opts]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.previewShell} onClick={(e) => e.stopPropagation()}>
        <div style={S.previewBar}>
          <b className="bpx-lg">👁 {L("Preview", "معاينة")} · {q.number}</b>
          <span style={{ flex: 1 }} />
          <Btn tone="soft" disabled={!!busy} onClick={onPrint}>🖨 {L("Print", "طباعة")}</Btn>
          <Btn tone="soft" disabled={!!busy} onClick={onXlsx}>📊 Excel</Btn>
          <Btn tone="primary" disabled={!!busy} onClick={onPdf}>{busy === "pdf" ? "…" : "📄"} PDF</Btn>
          <Btn tone="soft" onClick={onClose}>✕</Btn>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "#e2e8f0", padding: 20 }}>
          <iframe title="Quotation preview" sandbox="allow-same-origin" srcDoc={html} style={{ display: "block", width: 794, maxWidth: "100%", height: 1600, margin: "0 auto", border: 0, background: "#fff", boxShadow: "0 20px 60px rgba(15,23,42,.25)" }} />
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ config, onClose, onSave }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const [c, setC] = useState(() => ({ ...emptyConfig(), ...config, defaults: { ...(config.defaults || {}) }, priceBook: { ...(config.priceBook || {}) } }));
  const [saving, setSaving] = useState(false);
  const d = c.defaults;
  const setD = (p) => setC((cur) => ({ ...cur, defaults: { ...cur.defaults, ...p } }));
  const entries = Object.entries(c.priceBook);
  const demo = useMemo(() => emptyQuote({ vatPct: d.vatPct ?? 5, cycle: d.cycle || "monthly" }), [d.vatPct, d.cycle]);

  return (
    <Modal wide onClose={onClose} title={`⚙️ ${L("Quotation settings", "إعدادات عروض الأسعار")}`} sub={L("Apply to every new quotation.", "تنطبق على كل عرض جديد.")}
      footer={<>
        <Btn tone="soft" onClick={onClose}>{L("Cancel", "إلغاء")}</Btn>
        <Btn tone="primary" disabled={saving} onClick={async () => { setSaving(true); await onSave(c); setSaving(false); }}>{saving ? "…" : `💾 ${L("Save settings", "حفظ الإعدادات")}`}</Btn>
      </>}>
      <div style={S.grid2}>
        <div style={S.panelTight}>
          <div style={{ fontWeight: 1000, marginBottom: 10 }}>🧭 {L("Defaults", "القيم الافتراضية")}</div>
          <div style={S.grid2}>
            <Field label={L("Currency", "العملة")}><select style={S.input} value={d.currency || "AED"} onChange={(e) => setD({ currency: e.target.value })}>{CURRENCIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label={L("VAT %", "الضريبة %")}><input type="number" step="any" style={S.input} value={d.vatPct ?? 5} onChange={(e) => setD({ vatPct: e.target.value })} /></Field>
            <Field label={L("Valid for (days)", "الصلاحية (يوم)")}><input type="number" style={S.input} value={d.validDays ?? 30} onChange={(e) => setD({ validDays: e.target.value })} /></Field>
            <Field label={L("Contract (months)", "مدة العقد")}><input type="number" style={S.input} value={d.contractMonths ?? 12} onChange={(e) => setD({ contractMonths: e.target.value })} /></Field>
            <Field label={L("Billing cycle", "دورة الفوترة")}><select style={S.input} value={d.cycle || "monthly"} onChange={(e) => setD({ cycle: e.target.value })}>{BILLING_CYCLES.map((x) => <option key={x.id} value={x.id}>{lang === "ar" ? x.ar : x.en}</option>)}</select></Field>
            <Field label={L("Theme", "اللون")}><select style={S.input} value={d.theme || "teal"} onChange={(e) => setD({ theme: e.target.value })}>{THEMES.map((x) => <option key={x.id} value={x.id}>{lang === "ar" ? x.ar : x.en}</option>)}</select></Field>
          </div>
          <Field label={L("Logo", "الشعار")} style={{ marginTop: 12 }}>
            <LogoUpload logo={c.logo} onChange={(logo) => setC((cur) => ({ ...cur, logo }))} />
          </Field>
        </div>

        <div style={S.panelTight}>
          <div style={{ fontWeight: 1000, marginBottom: 10 }}>🏷 {L("Price book", "قائمة الأسعار")} <span style={S.countPill}>{entries.length}</span></div>
          <div className="bpx-sm" style={{ color: "#64748b", marginBottom: 8 }}>{L("Filled from “Remember price” on any item. These prices appear automatically in new quotations.", "بتتعبّى من «احفظ السعر» بأي بند، وبتطلع تلقائياً بالعروض الجديدة.")}</div>
          <div style={{ display: "grid", gap: 6, maxHeight: 380, overflow: "auto" }}>
            {!entries.length && <div style={S.empty}>{L("No saved prices yet.", "لا توجد أسعار محفوظة بعد.")}</div>}
            {entries.map(([k, v]) => {
              const price = typeof v === "object" ? v.price : v;
              const title = (typeof v === "object" && v.title) || k.replace(/^[a-z]+:/, "");
              return (
                <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                  <input type="number" step="any" style={{ ...S.input, width: 140, minHeight: 44 }} value={price}
                    onChange={(e) => setC((cur) => ({ ...cur, priceBook: { ...cur.priceBook, [k]: { ...(typeof v === "object" ? v : {}), price: e.target.value } } }))} />
                  <button type="button" style={{ ...S.iconBtn, color: "#dc2626" }} onClick={() => setC((cur) => { const pb = { ...cur.priceBook }; delete pb[k]; return { ...cur, priceBook: pb }; })}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...S.panelTight, marginTop: 14 }}>
        <div style={{ fontWeight: 1000, marginBottom: 6 }}>📜 {L("Default terms for new quotations", "الشروط الافتراضية للعروض الجديدة")}</div>
        <TermsEditor q={demo} list={Array.isArray(d.termsList) ? d.termsList : defaultTermsList()} onChange={(termsList) => setD({ termsList })} />
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ Small pieces ═══════════════════════════ */

function LogoUpload({ logo, onChange, flash }) {
  const { t } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const ref = useRef(null);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: 54, height: 54, borderRadius: 12, border: "1px dashed #cbd5e1", display: "grid", placeItems: "center", overflow: "hidden", background: "#fff" }}>
        {logo ? <img src={logo} alt="" style={{ maxWidth: 48, maxHeight: 48 }} /> : <span style={{ color: "#94a3b8" }}>—</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        try { onChange(await readLogoFile(file)); } catch (err) { if (flash) flash(err.message, "err"); else window.alert(err.message); }
      }} />
      <Btn tone="soft" onClick={() => ref.current?.click()}>⬆ {logo ? L("Change", "تغيير") : L("Upload", "رفع")}</Btn>
      {logo && <button type="button" style={{ ...S.linkBtn, color: "#b91c1c" }} onClick={() => onChange("")}>{L("Remove", "حذف")}</button>}
    </div>
  );
}

function Card({ id, icon, title, hint, right, children }) {
  return (
    <section id={id} style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={S.cardIcon}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bpx-lg" style={{ fontWeight: 1000 }}>{title}</div>
          {hint && <div className="bpx-sm" style={{ color: "#64748b", fontWeight: 700 }}>{hint}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Modal({ title, sub, children, footer, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal(wide)} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div style={{ minWidth: 0 }}>
            <div className="bpx-xl" style={{ fontWeight: 1000 }}>{title}</div>
            {sub && <div style={{ color: "#64748b" }}>{sub}</div>}
          </div>
          <button type="button" style={S.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "18px 22px", overflow: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={S.modalFoot}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span className="bpx-sm" style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );
}

function Stepper({ value, onChange, presets = [], step = 1, max, suffix, disabled }) {
  const v = num(value);
  const clamp = (x) => { let n = Math.max(0, x); if (max != null) n = Math.min(max, n); return Math.round(n * 100) / 100; };
  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <div style={S.stepper}>
        <button type="button" disabled={disabled} style={S.stepBtn} onClick={() => onChange(clamp(v - step))}>−</button>
        <input type="number" step="any" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} style={S.stepInput} />
        {suffix && <span style={{ color: "#64748b", paddingInlineEnd: 6 }}>{suffix}</span>}
        <button type="button" disabled={disabled} style={S.stepBtn} onClick={() => onChange(clamp(v + step))}>＋</button>
      </div>
      {!!presets.length && (
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button key={p} type="button" disabled={disabled} onClick={() => onChange(p)} className="bpx-sm" style={S.preset(v === p && String(value) !== "")}>{p}{suffix || ""}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented({ value, onChange, options, small }) {
  return (
    <div style={S.seg(small)}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={small ? "bpx-sm" : undefined} style={S.segBtn(value === o.id, small)}>{o.label}</button>
      ))}
    </div>
  );
}

function Switch({ on, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} onClick={(e) => { e.preventDefault(); onChange(!on); }} style={S.switch(on)}>
      <span style={S.knob(on)} />
    </button>
  );
}

function Kpi({ icon, label, value, sub, tone = "#0f766e" }) {
  return (
    <div style={S.kpi(tone)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#64748b", fontWeight: 900 }}>{label}</span>
        <span style={S.kpiIcon(tone)}>{icon}</span>
      </div>
      <div className="bpx-xxl" style={{ fontWeight: 1000, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div className="bpx-sm" style={{ color: tone, fontWeight: 900, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function TotalCard({ th, title, rows, total, currency, accent }) {
  return (
    <div style={S.totalCard(th, accent)}>
      <div style={{ fontWeight: 1000, marginBottom: 8, color: accent ? "#fff" : "#334155" }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, opacity: 0.92 }}><span>{k}</span><span>{fmtMoney(v, currency)}</span></div>
      ))}
      <div className="bpx-lg" style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${accent ? "rgba(255,255,255,.3)" : "#e2e8f0"}`, fontWeight: 1000 }}>
        <span>=</span><span>{fmtMoney(total, currency)}</span>
      </div>
    </div>
  );
}

function Btn({ tone = "soft", children, style, ...props }) {
  return <button type="button" {...props} style={{ ...S.btn(tone, props.disabled), ...style }}>{children}</button>;
}

function IconBtn({ children, danger, ...props }) {
  return (
    <button type="button" {...props} style={{
      minWidth: 50, height: 44, padding: "0 10px", borderRadius: 10, cursor: props.disabled ? "wait" : "pointer",
      border: `1px solid ${danger ? "#fecaca" : "rgba(15,23,42,.12)"}`, background: danger ? "#fef2f2" : "#fff",
      color: danger ? "#b91c1c" : "#0f172a", fontWeight: 900, fontFamily: "inherit",
    }}>{children}</button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const c = { ok: ["#0f172a", "✅"], err: ["#b91c1c", "⛔"], info: ["#1d4ed8", "ℹ️"] }[toast.kind] || ["#0f172a", "✅"];
  return <div role="status" style={S.toast(c[0])}>{c[1]} {toast.text}</div>;
}

/* ═══════════════════════════ Styles ═══════════════════════════ */

const SHADOW = "0 1px 2px rgba(15,23,42,.04), 0 12px 32px rgba(15,23,42,.07)";
const INPUT_BORDER = "rgba(15,23,42,0.14)";

const S = {
  hero: {
    position: "relative", overflow: "hidden", borderRadius: 20, padding: "26px clamp(18px, 3vw, 34px)", marginBottom: 18, color: "#fff",
    background: "linear-gradient(125deg, #0b1220 0%, #0f3d3a 45%, #0e7490 100%)", boxShadow: "0 24px 60px rgba(15,23,42,.25)",
  },
  heroGlow: { position: "absolute", inset: 0, background: "radial-gradient(600px 240px at 85% 0%, rgba(45,212,191,.35), transparent 70%), radial-gradient(500px 200px at 10% 120%, rgba(56,189,248,.25), transparent 70%)" },
  heroKicker: { display: "inline-block", padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", marginBottom: 10, fontWeight: 900, letterSpacing: ".04em" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 18 },
  kpi: (tone) => ({ background: "#fff", borderRadius: 18, padding: 18, boxShadow: SHADOW, border: "1px solid rgba(15,23,42,.06)", borderTop: `4px solid ${tone}` }),
  kpiIcon: (tone) => ({ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${tone}14`, flex: "0 0 auto" }),
  panel: { background: "#fff", borderRadius: 20, padding: 18, boxShadow: SHADOW, border: "1px solid rgba(15,23,42,.06)" },
  panelTight: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: SHADOW, border: "1px solid rgba(15,23,42,.06)" },
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 },
  searchBox: { display: "flex", alignItems: "center", gap: 8, flex: "1 1 280px", background: "#f8fafc", border: `1px solid ${INPUT_BORDER}`, borderRadius: 12, padding: "0 12px", minHeight: 50 },
  searchInput: { border: 0, outline: "none", background: "transparent", flex: 1, minWidth: 0, fontFamily: "inherit", color: "#0f172a", minHeight: 46 },
  chip: (on, tone) => ({ border: `1px solid ${on ? tone : "rgba(15,23,42,.12)"}`, background: on ? tone : "#fff", color: on ? "#fff" : "#334155", borderRadius: 999, padding: "8px 16px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }),
  row: (accent) => ({
    display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "14px 16px", borderRadius: 16, cursor: "pointer",
    border: "1px solid rgba(15,23,42,.08)", borderInlineStart: `5px solid ${accent}`, background: "linear-gradient(180deg,#fff,#fbfdff)",
    boxShadow: "0 4px 14px rgba(15,23,42,.05)",
  }),
  avatar: (th) => ({ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", fontWeight: 1000, background: `linear-gradient(135deg, ${th.a}, ${th.b})`, flex: "0 0 auto" }),
  statusSelect: (st, onDark) => ({
    minHeight: 44, borderRadius: 999, padding: "4px 14px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${onDark ? "rgba(255,255,255,.4)" : st.tone}`, background: onDark ? "#fff" : st.bg, color: st.tone,
  }),
  editorHead: (th) => ({
    position: "sticky", top: 0, zIndex: 20, borderRadius: 20, padding: "16px 18px", marginBottom: 16, color: "#fff",
    background: `linear-gradient(120deg, #0b1220 0%, ${th.a} 55%, ${th.b} 100%)`, boxShadow: "0 18px 44px rgba(15,23,42,.25)",
  }),
  headTotal: { textAlign: "end", padding: "6px 14px", borderRadius: 14, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)" },
  step: { border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 999, padding: "6px 14px", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" },
  editorGrid: (wide) => ({ display: "grid", gap: 16, alignItems: "start", gridTemplateColumns: wide ? "minmax(0, 1fr) 420px" : "minmax(0, 1fr)" }),
  card: { background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: SHADOW, border: "1px solid rgba(15,23,42,.06)", scrollMarginTop: 180 },
  cardIcon: { width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ecfeff,#f0fdfa)", border: "1px solid #ccfbf1", flex: "0 0 auto" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  input: { width: "100%", minHeight: 50, padding: "10px 14px", borderRadius: 12, border: `1px solid ${INPUT_BORDER}`, background: "#fff", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 80, padding: "12px 14px", borderRadius: 12, border: `1px solid ${INPUT_BORDER}`, background: "#fff", color: "#0f172a", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7, unicodeBidi: "plaintext", textAlign: "start" },
  infoStrip: { marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "linear-gradient(90deg,#f0fdfa,#ecfeff)", border: "1px solid #99f6e4", color: "#115e59", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  addBar: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  bulkBar: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "8px 12px", borderRadius: 12, background: "#f8fafc", border: "1px dashed #cbd5e1", marginBottom: 12 },
  countPill: { display: "inline-block", padding: "4px 12px", borderRadius: 999, background: "#f1f5f9", color: "#334155", fontWeight: 900 },
  empty: { padding: 22, textAlign: "center", color: "#94a3b8", fontWeight: 800, border: "1px dashed #cbd5e1", borderRadius: 14 },
  emptyBig: { padding: "34px 20px", textAlign: "center", color: "#475569", border: "2px dashed #cbd5e1", borderRadius: 18, background: "#f8fafc", marginBottom: 12 },
  line: (l) => ({
    borderRadius: 16, padding: "12px 14px", background: l.optional ? "repeating-linear-gradient(135deg,#fff,#fff 12px,#f8fafc 12px,#f8fafc 24px)" : "#fff",
    border: "1px solid rgba(15,23,42,.10)", borderInlineStart: `5px solid ${l.optional ? "#94a3b8" : l.kind === "one_time" ? "#f59e0b" : "#0d9488"}`,
    boxShadow: "0 2px 8px rgba(15,23,42,.04)",
  }),
  lineHead: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  lineNo: (l) => ({ width: 36, height: 36, borderRadius: 10, background: l.optional ? "#94a3b8" : l.kind === "one_time" ? "#f59e0b" : "#0d9488", color: "#fff", display: "grid", placeItems: "center", fontWeight: 1000, flex: "0 0 auto" }),
  lineTitle: { width: "100%", border: 0, outline: "none", background: "transparent", padding: "2px 0", fontFamily: "inherit", fontWeight: 900, color: "#0f172a" },
  lineNums: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" },
  lineTools: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" },
  toggleLbl: { display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer", fontWeight: 800, color: "#334155" },
  discTag: { padding: "2px 10px", borderRadius: 999, background: "#fef2f2", color: "#b91c1c", fontWeight: 900 },
  totalsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 16 },
  totalCard: (th, accent) => ({ borderRadius: 16, padding: 16, background: accent ? `linear-gradient(135deg, ${th.a}, ${th.b})` : "#f8fafc", color: accent ? "#fff" : "#0f172a", border: accent ? "none" : "1px solid #e2e8f0" }),
  sumCard: (th) => ({ borderRadius: 20, padding: 18, color: "#fff", background: `linear-gradient(140deg, #0b1220, ${th.a} 60%, ${th.b})`, boxShadow: "0 18px 40px rgba(15,23,42,.22)" }),
  groupHead: { fontWeight: 1000, color: "#0f766e", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 },
  termRow: (on) => ({ padding: "12px 14px", borderRadius: 14, border: `1px solid ${on ? "#99f6e4" : "rgba(15,23,42,.08)"}`, background: on ? "#fcfffe" : "#f8fafc" }),
  paramInput: { width: 88, minHeight: 40, margin: "0 4px", padding: "2px 8px", textAlign: "center", verticalAlign: "middle", borderRadius: 10, border: "2px solid #5eead4", background: "#f0fdfa", color: "#0f766e", fontWeight: 1000, fontFamily: "inherit" },
  autoVar: { display: "inline-block", padding: "0 8px", margin: "0 2px", borderRadius: 8, background: "#eef2ff", color: "#4338ca", fontWeight: 900 },
  swatch: (x, on) => ({ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 900, border: `2px solid ${on ? x.a : "rgba(15,23,42,.1)"}`, background: on ? x.soft : "#fff", color: "#0f172a" }),
  swatchDot: (x) => ({ width: 22, height: 22, borderRadius: 999, background: `linear-gradient(135deg, ${x.a}, ${x.b})`, display: "inline-block" }),
  stepper: { display: "flex", alignItems: "center", border: `1px solid ${INPUT_BORDER}`, borderRadius: 12, background: "#fff", overflow: "hidden", minHeight: 50 },
  stepBtn: { width: 48, alignSelf: "stretch", border: 0, background: "#f8fafc", cursor: "pointer", fontWeight: 1000, color: "#0f766e", fontFamily: "inherit" },
  stepInput: { flex: 1, minWidth: 0, border: 0, outline: "none", textAlign: "center", fontFamily: "inherit", background: "transparent", color: "#0f172a", padding: "8px 4px" },
  preset: (on) => ({ padding: "3px 10px", borderRadius: 999, border: `1px solid ${on ? "#0d9488" : "rgba(15,23,42,.1)"}`, background: on ? "#0d9488" : "#fff", color: on ? "#fff" : "#475569", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }),
  seg: (small) => ({ display: "inline-flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 12, background: "#f1f5f9", minHeight: small ? 0 : 50, boxSizing: "border-box" }),
  segBtn: (on, small) => ({ border: 0, borderRadius: 9, padding: small ? "4px 12px" : "8px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 900, background: on ? "#fff" : "transparent", color: on ? "#0f766e" : "#64748b", boxShadow: on ? "0 2px 8px rgba(15,23,42,.1)" : "none" }),
  switch: (on) => ({ position: "relative", width: 52, height: 30, flex: "0 0 auto", borderRadius: 999, border: 0, cursor: "pointer", background: on ? "linear-gradient(135deg,#0d9488,#0891b2)" : "#cbd5e1", transition: "background .15s ease", padding: 0 }),
  knob: (on) => ({ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)", transition: "left .15s ease" }),
  linkBtn: { border: 0, background: "transparent", color: "#0f766e", fontWeight: 900, cursor: "pointer", fontFamily: "inherit", padding: "4px 6px" },
  iconBtn: { minWidth: 42, height: 42, borderRadius: 10, border: "1px solid rgba(15,23,42,.12)", background: "#fff", cursor: "pointer", fontWeight: 1000, fontFamily: "inherit", color: "#334155" },
  tag: (bg, fg) => ({ display: "inline-block", padding: "1px 10px", borderRadius: 999, background: bg, color: fg, fontWeight: 900 }),
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,.6)", zIndex: 10000, display: "grid", placeItems: "center", padding: 16, backdropFilter: "blur(6px)" },
  modal: (wide) => ({ width: wide ? "min(1200px, 100%)" : "min(1000px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 22, boxShadow: "0 40px 100px rgba(2,6,23,.4)", overflow: "hidden" }),
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "18px 22px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg,#f8fafc,#fff)" },
  modalFoot: { display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", padding: "14px 22px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" },
  modGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 },
  modCard: (on) => ({ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 14, cursor: "pointer", border: `2px solid ${on ? "#0d9488" : "rgba(15,23,42,.08)"}`, background: on ? "#f0fdfa" : "#fff", transition: "all .12s ease" }),
  smartPreview: { marginTop: 16, padding: 16, borderRadius: 16, background: "linear-gradient(135deg,#f0fdfa,#eff6ff)", border: "1px solid #bae6fd" },
  previewShell: { width: "min(1100px, 100%)", height: "94vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 40px 100px rgba(2,6,23,.5)" },
  previewBar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "12px 18px", borderBottom: "1px solid #e2e8f0" },
  toast: (bg) => ({ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10001, background: bg, color: "#fff", padding: "14px 22px", borderRadius: 14, boxShadow: "0 18px 44px rgba(2,6,23,.35)", fontWeight: 900, maxWidth: "90vw" }),
  btn: (tone, disabled) => {
    const tones = {
      primary: { background: "linear-gradient(135deg,#0d9488,#0e7490)", color: "#fff", border: "1px solid transparent", boxShadow: "0 8px 20px rgba(13,148,136,.3)" },
      accent: { background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", border: "1px solid transparent", boxShadow: "0 8px 20px rgba(124,58,237,.28)" },
      white: { background: "#fff", color: "#0f766e", border: "1px solid #fff", boxShadow: "0 8px 20px rgba(0,0,0,.15)" },
      glass: { background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.28)" },
      soft: { background: "#f1f5f9", color: "#0f172a", border: "1px solid rgba(15,23,42,.08)" },
    };
    return {
      minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 18px",
      borderRadius: 12, fontWeight: 900, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      whiteSpace: "nowrap", ...tones[tone],
    };
  },
};
