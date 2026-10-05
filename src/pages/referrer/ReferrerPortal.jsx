// src/pages/referrer/ReferrerPortal.jsx
// -----------------------------------------------------------------------------
// /ref/:token — the private page of a person who brings customers with a
// promo code (Platform Center → Promo codes → "Referrer page"). No login: the
// unguessable token in the link is the key, and the owner can switch it off
// or replace it at any time.
//
// It turns a discount code into a small sales team: the holder sees their
// link (to copy or send on WhatsApp), how many people opened it, asked for a
// demo or a trial, became customers — and the commission earned, paid and
// still due. Never a lead's name or phone: those belong to INSPECT PRO.
// Server: GET /api/referrer/:token (routes/promoCodes.cjs).
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../config/api";
import { buildPublicUrl } from "../../config/publicOrigin";

const T = {
  en: {
    title: "Your referral page", hello: (n) => (n ? `Hello ${n}` : "Hello"), loading: "Loading…",
    notFound: "This link is not active. Ask INSPECT PRO for your current link.", failed: "Couldn't load the page. Please try again.",
    yourCode: "Your code", gives: "gives your customers", off: (p) => (p.kind === "aed" ? `AED ${p.amount} off per branch a month` : `${p.amount}% off`),
    firstYear: "for their first year", validUntil: (d) => `Code valid until ${d}`, codeOff: "This code is switched off for new customers right now.",
    share: "Share your link", copy: "Copy link", copied: "Copied ✓", whatsapp: "Send on WhatsApp",
    waText: (c, url) => `Food safety & quality system for your business — INSPECT PRO. Use my code ${c} for a discount: ${url}`,
    funnel: "What your link brought", visits: "Link opened", last30: (n) => `${n} in the last 30 days`, demos: "Asked for a demo",
    trials: "Started a free trial", customers: "Became customers", active: (n) => `${n} active now`,
    commission: "Your commission", rule: (p, m) => `${p}% of what your customers pay (before VAT)${m ? `, for their first ${m} months` : ""}.`,
    noCommission: "No commission is set on this code yet.", earned: "Earned", paidOut: "Paid to you", due: "Still due",
    customersList: "Your customers", since: "since", activeTag: "Active", inactiveTag: "Inactive", noCustomers: "No customers yet — share your link!",
    paidInv: (n) => `${n} paid invoice${n === 1 ? "" : "s"}`, payouts: "Payments to you", recent: "Recent requests",
    demo: "Demo request", trial: "Free trial", lang: "العربية",
  },
  ar: {
    title: "صفحة الإحالة الخاصة بك", hello: (n) => (n ? `أهلاً ${n}` : "أهلاً"), loading: "جاري التحميل…",
    notFound: "هذا الرابط غير فعّال. اطلب رابطك الحالي من INSPECT PRO.", failed: "تعذّر تحميل الصفحة، حاول مرة أخرى.",
    yourCode: "كودك", gives: "يعطي عملاءك", off: (p) => (p.kind === "aed" ? `خصم ${p.amount} درهم لكل فرع شهريًا` : `خصم ${p.amount}%`),
    firstYear: "للسنة الأولى", validUntil: (d) => `الكود صالح حتى ${d}`, codeOff: "الكود موقوف حاليًا للعملاء الجدد.",
    share: "شارك رابطك", copy: "نسخ الرابط", copied: "تم النسخ ✓", whatsapp: "إرسال عبر واتساب",
    waText: (c, url) => `نظام سلامة وجودة الغذاء لشركتك — INSPECT PRO. استخدم كودي ${c} للحصول على خصم: ${url}`,
    funnel: "نتائج رابطك", visits: "فتحوا الرابط", last30: (n) => `${n} خلال آخر 30 يوم`, demos: "طلبوا عرض تجريبي",
    trials: "بدأوا تجربة مجانية", customers: "صاروا عملاء", active: (n) => `${n} فعّال حاليًا`,
    commission: "عمولتك", rule: (p, m) => `${p}% مما يدفعه عملاؤك (قبل الضريبة)${m ? ` خلال أول ${m} شهر` : ""}.`,
    noCommission: "لم تُحدَّد عمولة على هذا الكود بعد.", earned: "المستحق الكلي", paidOut: "المدفوع لك", due: "المتبقي لك",
    customersList: "عملاؤك", since: "منذ", activeTag: "فعّال", inactiveTag: "غير فعّال", noCustomers: "لا يوجد عملاء بعد — شارك رابطك!",
    paidInv: (n) => `${n} فاتورة مدفوعة`, payouts: "الدفعات لك", recent: "آخر الطلبات",
    demo: "طلب عرض", trial: "تجربة مجانية", lang: "English",
  },
};

const money = (n, c = "AED") => `${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReferrerPortal() {
  const { token } = useParams();
  const [lang, setLang] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q === "ar" || q === "en") return q;
      return (navigator.language || "").startsWith("ar") ? "ar" : "en";
    } catch { return "en"; }
  });
  const t = T[lang];
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notFound | failed
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setState("loading");
    fetch(`${API_BASE}/api/referrer/${encodeURIComponent(token || "")}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        if (r.status === 404) return setState("notFound");
        if (!r.ok || !j.ok) return setState("failed");
        setData(j);
        setState("ok");
      })
      .catch(() => live && setState("failed"));
    return () => { live = false; };
  }, [token]);

  useEffect(() => { document.title = `${t.title} · INSPECT PRO`; }, [t]);

  const link = useMemo(() => (data ? buildPublicUrl(`/demo?code=${encodeURIComponent(data.referrer.code)}${lang === "ar" ? "&lang=ar" : ""}`) : ""), [data, lang]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div className="rfp rfp" dir={dir} style={sx.page}>
      <style>{CSS}</style>
      <div style={sx.wrap}>
        <header style={sx.head}>
          <div>
            <div className="rfp-xs" style={{ color: "#0369a1", fontWeight: 900, letterSpacing: ".06em" }}>INSPECT PRO</div>
            <h1 className="rfp-xl" style={{ margin: 0 }}>{t.title}</h1>
            {data && <div style={{ color: "#475569" }}>{t.hello(data.referrer.holder)}</div>}
          </div>
          <button type="button" style={sx.btn()} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>🌐 {t.lang}</button>
        </header>

        {state === "loading" && <div style={sx.card}>{t.loading}</div>}
        {state === "notFound" && <div style={sx.card}>🔒 {t.notFound}</div>}
        {state === "failed" && <div style={sx.card}>⚠️ {t.failed}</div>}

        {state === "ok" && data && <Body data={data} t={t} link={link} copied={copied} copy={copy} />}
      </div>
    </div>
  );
}

function Body({ data, t, link, copied, copy }) {
  const { referrer: r, funnel: f, customers, earnings, payouts, leads } = data;
  const wa = `https://wa.me/?text=${encodeURIComponent(t.waText(r.code, link))}`;
  return (
    <>
      {/* The code + share */}
      <section style={{ ...sx.card, background: "linear-gradient(135deg,#0c4a6e,#0369a1)", color: "#fff", border: "none" }}>
        <div className="rfp-xs" style={{ opacity: 0.85, fontWeight: 800 }}>{t.yourCode}</div>
        <div className="rfp-xxl" style={{ fontWeight: 1000, letterSpacing: ".06em" }} dir="ltr">{r.code}</div>
        <div style={{ fontWeight: 800 }}>{t.gives} <b>{t.off(r)}</b> {t.firstYear}</div>
        {r.expiresAt && <div className="rfp-xs" style={{ opacity: 0.85 }}>{t.validUntil(fmtDate(r.expiresAt))}</div>}
        {!r.usable && <div style={{ marginTop: 8, background: "rgba(255,255,255,.15)", padding: "6px 10px", borderRadius: 10 }}>⚠️ {t.codeOff}</div>}
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <div className="rfp-sm" dir="ltr" style={{ background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "8px 12px", wordBreak: "break-all" }}>{link}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={sx.btn("white")} onClick={copy}>{copied ? t.copied : `🔗 ${t.copy}`}</button>
            <a href={wa} target="_blank" rel="noreferrer" style={{ ...sx.btn("wa"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>💬 {t.whatsapp}</a>
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section style={sx.card}>
        <h2 className="rfp-lg" style={sx.h2}>📈 {t.funnel}</h2>
        <div style={sx.grid}>
          <Stat icon="👀" k={t.visits} v={f.visits} sub={t.last30(f.visits30)} />
          <Stat icon="📨" k={t.demos} v={f.demos} />
          <Stat icon="🧪" k={t.trials} v={f.trials} />
          <Stat icon="🤝" k={t.customers} v={f.customers} sub={t.active(f.activeCustomers)} good />
        </div>
      </section>

      {/* Commission */}
      <section style={sx.card}>
        <h2 className="rfp-lg" style={sx.h2}>💰 {t.commission}</h2>
        {r.commissionPct > 0 ? (
          <>
            <div style={{ color: "#475569", marginBottom: 10 }}>{t.rule(r.commissionPct, r.commissionMonths)}</div>
            {(earnings.length ? earnings : [{ currency: "AED", earned: 0, paid: 0, balance: 0 }]).map((e) => (
              <div key={e.currency} style={sx.grid}>
                <Stat k={t.earned} v={money(e.earned, e.currency)} />
                <Stat k={t.paidOut} v={money(e.paid, e.currency)} />
                <Stat k={t.due} v={money(e.balance, e.currency)} good={e.balance > 0} />
              </div>
            ))}
          </>
        ) : (
          <div style={{ color: "#475569" }}>{t.noCommission}</div>
        )}
        {payouts.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{t.payouts}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {payouts.map((p, i) => (
                <div key={i} style={sx.row}>
                  <span>{fmtDate(p.paid_on)}</span>
                  <b>{money(p.amount, p.currency)}</b>
                  {p.note && <span style={{ color: "#475569" }}>{p.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Customers */}
      <section style={sx.card}>
        <h2 className="rfp-lg" style={sx.h2}>🏢 {t.customersList}</h2>
        {!customers.length ? <div style={{ color: "#475569" }}>{t.noCustomers}</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {customers.map((c, i) => (
              <div key={i} style={sx.row}>
                <b style={{ flex: "1 1 160px" }} dir="auto">{c.name}</b>
                <span style={{ color: "#475569" }}>{t.since} {fmtDate(c.since)}</span>
                <span style={{ color: "#475569" }}>{t.paidInv(c.paid_invoices)}</span>
                <span style={{ padding: "2px 10px", borderRadius: 999, fontWeight: 900, background: c.status === "active" ? "#f0fdf4" : "#f1f5f9", color: c.status === "active" ? "#166534" : "#475569" }}>
                  {c.status === "active" ? t.activeTag : t.inactiveTag}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {leads.length > 0 && (
        <section style={sx.card}>
          <h2 className="rfp-lg" style={sx.h2}>🗓️ {t.recent}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {leads.slice(0, 20).map((l, i) => (
              <span key={i} style={{ ...sx.row, display: "inline-flex", padding: "4px 10px" }}>{l.kind === "trial" ? "🧪" : "📨"} {l.kind === "trial" ? t.trial : t.demo} · {fmtDate(l.day)}</span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

const Stat = ({ icon, k, v, sub, good }) => (
  <div style={{ ...sx.row, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
    <span className="rfp-xs" style={{ color: "#475569" }}>{icon ? `${icon} ` : ""}{k}</span>
    <b className="rfp-lg" style={{ color: good ? "#166534" : "#0f172a" }}>{v}</b>
    {sub && <span className="rfp-xs" style={{ color: "#475569" }}>{sub}</span>}
  </div>
);

const CSS = `
#root .rfp.rfp, #root .rfp.rfp *{ font-size: calc(17px * var(--app-fs, 1)) !important; }
#root .rfp.rfp .rfp-xxl, #root .rfp.rfp .rfp-xxl *{ font-size: calc(38px * var(--app-fs, 1)) !important; }
#root .rfp.rfp .rfp-xl, #root .rfp.rfp .rfp-xl *{ font-size: calc(27px * var(--app-fs, 1)) !important; }
#root .rfp.rfp .rfp-lg, #root .rfp.rfp .rfp-lg *{ font-size: calc(21px * var(--app-fs, 1)) !important; }
#root .rfp.rfp .rfp-sm, #root .rfp.rfp .rfp-sm *{ font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .rfp.rfp .rfp-xs, #root .rfp.rfp .rfp-xs *{ font-size: calc(14px * var(--app-fs, 1)) !important; }
`;

const sx = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f0f9ff 0%,#f8fafc 60%)", color: "#0f172a", padding: "20px 16px 60px", fontWeight: 700 },
  wrap: { maxWidth: 860, margin: "0 auto", display: "grid", gap: 14 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  card: { background: "#fff", border: "1px solid #dbeafe", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(3,105,161,.06)", minWidth: 0 },
  h2: { margin: "0 0 12px", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 10 },
  row: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 14, border: "1px solid #dbeafe", background: "#f8fbff" },
  btn: (tone) => ({
    minHeight: 40, padding: "8px 14px", borderRadius: 12, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap",
    border: tone === "white" || tone === "wa" ? "none" : "1px solid #dbeafe",
    background: tone === "white" ? "#fff" : tone === "wa" ? "#16a34a" : "#fff",
    color: tone === "wa" ? "#fff" : "#0c4a6e",
  }),
};
