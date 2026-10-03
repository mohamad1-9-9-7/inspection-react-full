// Visitor stats for the public pages — Platform Center → Demo Requests.
// Data: GET /api/site-stats?days= (server: routes/demoRequests.cjs, table
// site_stats), written by src/utils/siteStats.js on /demo, /readiness and /.
// Cookieless and anonymous: daily counters only.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang } from "./_shared/settingsI18n";

const INK = "#0f172a";
const MUTED = "#64748b";
const BAR = "#0d9488";     // single-series colour (teal, the screen's accent)
const TRACK = "#e2e8f0";

const RANGES = [7, 30, 90];

const COUNTRY_AR = { AE: "الإمارات", SA: "السعودية", QA: "قطر", KW: "الكويت", BH: "البحرين", OM: "عُمان", JO: "الأردن", EG: "مصر", LB: "لبنان", SY: "سوريا", IQ: "العراق", IN: "الهند", PK: "باكستان", GB: "بريطانيا", US: "أمريكا" };
const COUNTRY_EN = { AE: "UAE", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", JO: "Jordan", EG: "Egypt", LB: "Lebanon", SY: "Syria", IQ: "Iraq", IN: "India", PK: "Pakistan", GB: "United Kingdom", US: "United States" };


const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const sum = (rows, pred = () => true) => rows.reduce((a, r) => a + (pred(r) ? Number(r.n) || 0 : 0), 0);

export default function VisitorStats() {
  const { lang } = useSettingsLang();
  const L = useCallback((en, ar) => (lang === "ar" ? ar : en), [lang]);
  const [open, setOpen] = useState(true);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | missing | error

  const load = useCallback(async (d) => {
    setState("loading");
    try {
      const res = await fetch(`${API_BASE}/api/site-stats?days=${d}`, { cache: "no-store" });
      if (res.status === 404) { setState("missing"); return; }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || res.status);
      setData(j);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { load(days); }, [days, load]);

  const v = useMemo(() => {
    if (!data) return null;
    const ev = data.events || [];
    const visits = sum(ev, (r) => r.event === "visit");
    const views = sum(ev, (r) => r.event === "view");
    const leads = sum(data.leads || []);
    const of = (page, event, detail) => sum(ev, (r) => r.page === page && r.event === event && (detail == null || r.detail === detail));

    // one bar per day, empty days included
    const byDay = new Map();
    for (const r of data.daily || []) {
      if (r.event !== "visit") continue;
      byDay.set(r.day, (byDay.get(r.day) || 0) + (Number(r.n) || 0));
    }
    const series = [];
    const start = new Date(`${data.since}T00:00:00Z`);
    for (let i = 0; i < data.days; i++) {
      const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10);
      series.push({ day: d, n: byDay.get(d) || 0 });
    }

    const split = (rows) => {
      const m = new Map();
      for (const r of rows || []) {
        const k = r.k || "";
        const o = m.get(k) || { k, visits: 0, leads: 0, starts: 0 };
        if (r.event === "visit") o.visits += Number(r.n) || 0;
        if (r.event === "lead") o.leads += Number(r.n) || 0;
        if (r.event === "form_start") o.starts += Number(r.n) || 0;
        m.set(k, o);
      }
      return [...m.values()].sort((a, b) => b.visits - a.visits || b.leads - a.leads);
    };

    const ctas = ev.filter((r) => r.event === "cta" && r.page === "demo").sort((a, b) => b.n - a.n);
    const loginCtas = ev.filter((r) => r.event === "cta" && r.page === "login").reduce((a, r) => a + r.n, 0);

    return {
      visits, views, leads,
      wa: sum(ev, (r) => r.event === "wa"),
      series,
      demo: [
        [L("Visited /demo", "زاروا /demo"), of("demo", "visit")],
        [L("Saw the pricing", "شافوا الأسعار"), of("demo", "reach", "pricing")],
        [L("Reached the form section", "وصلوا لقسم النموذج"), of("demo", "reach", "demo-form")],
        [L("Started filling the form", "بلّشوا يعبّوا النموذج"), of("demo", "form_start")],
        [L("Sent a request", "بعتوا طلب"), of("demo", "lead")],
      ],
      quiz: [
        [L("Visited /readiness", "زاروا /readiness"), of("readiness", "visit")],
        [L("Started the check", "بلّشوا الفحص"), of("readiness", "quiz_start")],
        [L("Finished it", "كمّلوه"), of("readiness", "quiz_done")],
        [L("Asked for the full report", "طلبوا التقرير الكامل"), of("readiness", "lead")],
      ],
      sources: split(data.sources),
      countries: split(data.countries),
      devices: split(data.devices),
      langs: split(data.langs),
      ctas,
      loginVisits: of("login", "visit"),
      loginCtas,
    };
  }, [data, L]);

  /* /demo sector keys (pages/demoSectors.js) — for "sector-meat", "trial-sector-meat"… */
  const sectorName = (k) => ({
    meat: L("Meat", "لحوم"), restaurant: L("Restaurants", "مطاعم"), kitchen: L("Central kitchens", "مطابخ مركزية"),
    sweets: L("Sweets", "حلويات"), factory: L("Factories", "مصانع"), retail: L("Supermarkets", "سوبرماركت"),
    distribution: L("Distribution", "توزيع"),
  }[k] || k);
  const ctaLabel = (d) => {
    const fixed = {
      hero: L("Hero button", "زر الواجهة"), nav: L("Top menu", "القائمة العلوية"), sticky: L("Mobile bottom bar", "شريط الجوال السفلي"),
      pricing: L("Pricing plan", "باقة الأسعار"), calc: L("Savings calculator", "حاسبة التوفير"), offer: L("Offer banner", "شريط العرض"),
      "trial-hero": L("🚀 Free trial — hero button", "🚀 تجربة مجانية — زر الواجهة"),
      "trial-submit": L("🚀 Free trial — form sent", "🚀 تجربة مجانية — أرسل الفورم"),
    }[d];
    if (fixed) return fixed;
    const s = String(d || "");
    if (s.startsWith("trial-sector-")) return L(`🚀 Free trial — ${sectorName(s.slice(13))} section`, `🚀 تجربة مجانية — قسم ${sectorName(s.slice(13))}`);
    if (s.startsWith("sector-")) return L(`Picked sector: ${sectorName(s.slice(7))}`, `اختار قطاع: ${sectorName(s.slice(7))}`);
    return s || "—";
  };
  /* ?src= values the marketing posts use, and the referrers siteStats.js detects. */
  const sourceLabel = (k) => {
    const s = String(k || "direct");
    const known = {
      direct: L("Direct / typed", "مباشر / كتب الرابط"),
      instagram: "📸 Instagram", facebook: "📘 Facebook", "fb-reel": L("📘 Facebook — reel", "📘 فيسبوك — ريل"),
      "fb-post": L("📘 Facebook — post", "📘 فيسبوك — بوست"), linkedin: "💼 LinkedIn", whatsapp: "💬 WhatsApp",
      google: "🔎 Google", bing: "🔎 Bing", x: "𝕏 X / Twitter", tiktok: "🎵 TikTok", youtube: "▶️ YouTube",
    }[s];
    return known || s;
  };
  const deviceLabel = (d) => ({ mobile: L("Mobile", "جوال"), tablet: L("Tablet", "تابلت"), desktop: L("Computer", "كمبيوتر") }[d] || L("Unknown", "غير معروف"));
  const countryLabel = (cc) => (cc ? (lang === "ar" ? COUNTRY_AR : COUNTRY_EN)[cc] || cc : L("Unknown", "غير معروف"));

  return (
    <div style={{ ...ui.card, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{ all: "unset", cursor: "pointer" }}>
          <span style={{ fontWeight: 1000, fontSize: 16 }}>📊 {L("Visitors to the public pages", "زوّار الصفحات العامة")}</span>
          <span style={{ display: "block", color: MUTED, fontWeight: 700, fontSize: 12.5 }}>
            {L("Anonymous, no cookies. Staff and signed-in users are not counted.", "بدون كوكيز وبدون هوية. الموظفين واللي عاملين تسجيل دخول ما بينحسبوا.")}
          </span>
        </button>
        {open && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {RANGES.map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
                style={{ border: `1.5px solid ${days === d ? INK : "#cbd5e1"}`, background: days === d ? INK : "#fff", color: days === d ? "#fff" : INK, borderRadius: 999, padding: "5px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                {L(`${d} days`, `${d} يوم`)}
              </button>
            ))}
            <Button tone="muted" style={{ minHeight: 34 }} onClick={() => load(days)}>↻</Button>
          </div>
        )}
      </div>

      {open && state === "missing" && (
        <p style={{ margin: "12px 0 0", color: "#b45309", fontWeight: 800 }}>
          {L("The server has no /api/site-stats yet — push the server part first.", "السيرفر ما فيه /api/site-stats لسا — ارفع جزء السيرفر أولاً.")}
        </p>
      )}
      {open && state === "error" && <p style={{ margin: "12px 0 0", color: "#dc2626", fontWeight: 800 }}>{L("Could not load the stats.", "تعذّر تحميل الإحصائيات.")}</p>}
      {open && state === "loading" && !v && <p style={{ margin: "12px 0 0", color: MUTED, fontWeight: 700 }}>{L("Loading…", "جاري التحميل…")}</p>}

      {open && v && state !== "missing" && (
        <div style={{ marginTop: 12, display: "grid", gap: 14, opacity: state === "loading" ? 0.55 : 1, transition: "opacity .2s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <Kpi label={L("Visitors", "زوّار")} value={v.visits} hint={L("one per browser per day", "زائر واحد لكل متصفح باليوم")} />
            <Kpi label={L("Page views", "مشاهدات")} value={v.views} />
            <Kpi label={L("Requests received", "طلبات وصلت")} value={v.leads} />
            <Kpi label={L("Visitor → request", "زائر ← طلب")} value={pct(v.leads, v.visits)} hint={L("conversion rate", "نسبة التحويل")} />
            <Kpi label={L("WhatsApp taps", "ضغطات واتساب")} value={v.wa} />
          </div>

          <Panel title={L("Visitors per day", "الزوّار باليوم")}>
            <DailyBars series={v.series} lang={lang} L={L} />
          </Panel>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            <Panel title={L("Demo page: where people stop", "صفحة الديمو: وين بيوقفوا")}><Funnel steps={v.demo} /></Panel>
            <Panel title={L("Readiness check: where people stop", "فحص الجاهزية: وين بيوقفوا")}><Funnel steps={v.quiz} /></Panel>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            <Panel title={L("Where they came from", "منين إجوا")}>
              <Breakdown rows={v.sources} label={sourceLabel} L={L} withLeads />
            </Panel>
            <Panel title={L("Countries", "الدول")}>
              <Breakdown rows={v.countries} label={countryLabel} L={L} withLeads />
            </Panel>
            <Panel title={L("Devices", "الأجهزة")}>
              <Breakdown rows={v.devices} label={deviceLabel} L={L} withLeads />
            </Panel>
            <Panel title={L("Page language", "لغة الصفحة")}>
              <Breakdown rows={v.langs} label={(k) => (k === "ar" ? L("Arabic", "عربي") : L("English", "إنجليزي"))} L={L} withLeads />
            </Panel>
            <Panel title={L("Which button they used (demo, free trial, sector)", "أي زر استعملوا (عرض، تجربة مجانية، قطاع)")}>
              <Breakdown rows={v.ctas.map((r) => ({ k: r.detail, visits: r.n }))} label={ctaLabel} L={L} unit={L("clicks", "ضغطة")} />
            </Panel>
            <Panel title={L("Login page", "صفحة الدخول")}>
              <p style={{ margin: 0, color: INK, fontWeight: 800 }}>
                {L(`${v.loginVisits} visitors who were not signed in · ${v.loginCtas} clicked through to the demo`,
                  `${v.loginVisits} زائر ما كانوا مسجّلين دخول · ${v.loginCtas} ضغطوا على الديمو`)}
              </p>
            </Panel>
          </div>
          <p style={{ margin: 0, color: MUTED, fontWeight: 700, fontSize: 12.5 }}>
            {L("Your own visits: open any public page once with ?notrack=1 and that browser is never counted (?notrack=0 undoes it).",
              "زياراتك إنت: افتح أي صفحة عامة مرة وحدة مع ?notrack=1 وهالمتصفح ما عاد ينحسب (‎?notrack=0 بترجّعه).")}
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", background: "#fff" }}>
      {/* globals.css forces 14px on every element; a doubled class wins and still follows the Aa size setting. */}
      <style>{`#root .vs-kpi.vs-kpi { font-size: calc(24px * var(--app-fs, 1)) !important; }`}</style>
      <div className="vs-kpi" style={{ fontWeight: 1000, color: INK, lineHeight: 1.15 }}>{value}</div>
      <div style={{ color: MUTED, fontWeight: 800, fontSize: 12.5 }}>{label}</div>
      {hint && <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 11.5 }}>{hint}</div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 900, color: INK }}>{title}</h4>
      {children}
    </section>
  );
}

/* One series → no legend; hover a day for its count. */
function DailyBars({ series, lang, L }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...series.map((d) => d.n));
  const H = 120;
  const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  if (!series.some((d) => d.n)) return <p style={{ margin: 0, color: MUTED, fontWeight: 700 }}>{L("No visitors in this period yet.", "ما في زوّار بهالفترة لسا.")}</p>;
  return (
    <div style={{ position: "relative" }} dir="ltr">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: H, borderBottom: `1px solid ${TRACK}` }} onMouseLeave={() => setHover(null)}>
        {series.map((d, i) => (
          <div key={d.day} onMouseEnter={() => setHover(i)} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default" }}
            aria-label={`${fmt(d.day)}: ${d.n}`} role="img">
            <div style={{ width: "100%", maxWidth: 22, margin: "0 auto", height: d.n ? Math.max(3, (d.n / max) * (H - 8)) : 0, background: BAR, borderRadius: "4px 4px 0 0", opacity: hover == null || hover === i ? 1 : 0.45 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 11.5, fontWeight: 700, marginTop: 4 }}>
        <span>{fmt(series[0].day)}</span><span>{fmt(series[series.length - 1].day)}</span>
      </div>
      {hover != null && (
        <div style={{ position: "absolute", top: 0, left: `${((hover + 0.5) / series.length) * 100}%`, transform: "translate(-50%, -110%)", background: INK, color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", pointerEvents: "none" }}>
          {fmt(series[hover].day)} · {series[hover].n} {L("visitors", "زائر")}
        </div>
      )}
    </div>
  );
}

/* Each step as a share of the first, so the biggest drop is obvious. */
function Funnel({ steps }) {
  const top = steps[0]?.[1] || 0;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {steps.map(([label, n], i) => {
        const prev = i ? steps[i - 1][1] : n;
        return (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 800, color: INK }}>
              <span>{label}</span>
              <span>{n} <span style={{ color: MUTED, fontWeight: 700 }}>· {pct(n, top)}{i > 0 && prev ? ` (${pct(n, prev)} ↓)` : ""}</span></span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: TRACK, marginTop: 4, overflow: "hidden" }}>
              <div style={{ width: top ? `${(n / top) * 100}%` : 0, height: "100%", background: BAR, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Breakdown({ rows, label, L, withLeads, unit }) {
  const list = rows.filter((r) => r.visits || r.leads).slice(0, 8);
  if (!list.length) return <p style={{ margin: 0, color: MUTED, fontWeight: 700 }}>{L("Nothing yet.", "لسا ما في شي.")}</p>;
  const max = Math.max(1, ...list.map((r) => r.visits));
  return (
    <div style={{ display: "grid", gap: 7 }}>
      {list.map((r) => (
        <div key={r.k || "none"}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 800, color: INK }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label(r.k)}</span>
            <span style={{ whiteSpace: "nowrap" }}>
              {r.visits} {unit || ""}
              {withLeads && <span style={{ color: MUTED, fontWeight: 700 }}> · {r.leads} {L("requests", "طلب")} ({pct(r.leads, r.visits)})</span>}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: TRACK, marginTop: 3, overflow: "hidden" }}>
            <div style={{ width: `${(r.visits / max) * 100}%`, height: "100%", background: BAR, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
