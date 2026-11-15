// src/pages/haccp and iso/Supplier Approval/SupplierEvaluationHub.jsx
// Supplier Evaluation — the door to its four screens, in the order the work
// happens: create a link → follow the links sent → read what came back →
// score the suppliers. Design: the shared hub kit (pages/dashboard/hubCss.js).
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import { useLangState } from "../../../utils/appLang";
import { canWrite } from "../../../utils/perms";
import { HaccpPage, Stats, Stat, Panel } from "../_shared/pageKit";

const TYPE = "supplier_self_assessment_form";

const T = {
  en: {
    title: "Supplier Evaluation",
    sub: "Send a supplier the self-assessment link, follow who answered, review the answers and score performance.",
    clause: "ISO 7.1.6",
    sent: "Links sent", submitted: "Answered", pending: "Waiting for an answer", rate: "Answer rate",
    steps: "The four screens", step: (n) => `Step ${n}`, open: "Open", loadErr: "The figures could not be loaded.",
    how: "How it works",
    howSteps: [
      "Create an evaluation and send the supplier its link.",
      "The supplier opens the link, answers, attaches documents and submits.",
      "Follow the links still waiting and send a reminder from the tracker.",
      "Review the answers under Submitted Results, then score the supplier.",
    ],
    cards: {
      create: { t: "Create evaluation & link", d: "Start a new supplier evaluation and get the link to send." },
      links: { t: "Sent links tracker", d: "Every link sent: waiting or answered, reminders, copy and reopen." },
      results: { t: "Submitted results", d: "The answers and documents suppliers sent back, with approval." },
      performance: { t: "Supplier performance", d: "Scorecard, grades and trend across the approved suppliers." },
    },
  },
  ar: {
    title: "تقييم المورّدين",
    sub: "أرسل للمورّد رابط التقييم الذاتي، تابع من أجاب، راجع الإجابات وقيّم الأداء.",
    clause: "البند 7.1.6",
    sent: "روابط مُرسلة", submitted: "تمت الإجابة", pending: "بانتظار الإجابة", rate: "نسبة الإجابة",
    steps: "الشاشات الأربع", step: (n) => `الخطوة ${n}`, open: "فتح", loadErr: "تعذّر تحميل الأرقام.",
    how: "طريقة العمل",
    howSteps: [
      "أنشئ تقييمًا وأرسل رابطه للمورّد.",
      "المورّد يفتح الرابط، يجيب، يرفق المستندات ثم يرسل.",
      "تابع الروابط التي لم يُجَب عليها وأرسل تذكيرًا من شاشة المتابعة.",
      "راجع الإجابات في «النتائج المستلمة» ثم قيّم المورّد.",
    ],
    cards: {
      create: { t: "إنشاء تقييم ورابط", d: "ابدأ تقييم مورّد جديد واحصل على الرابط لإرساله." },
      links: { t: "متابعة الروابط المُرسلة", d: "كل رابط أُرسل: بانتظار أم أُجيب، مع التذكير والنسخ وإعادة الفتح." },
      results: { t: "النتائج المستلمة", d: "إجابات المورّدين ومستنداتهم، مع الاعتماد." },
      performance: { t: "أداء المورّدين", d: "بطاقة التقييم والدرجات والاتجاه للمورّدين المعتمدين." },
    },
  },
};

const CARDS = [
  { id: "create", icon: "✍️", route: "/haccp-iso/supplier-evaluation/create", grad: "linear-gradient(135deg,#22c55e,#15803d)", glow: "rgba(34,197,94,.28)", write: true },
  { id: "links", icon: "📨", route: "/haccp-iso/supplier-evaluation/sent-links", grad: "linear-gradient(135deg,#0ea5e9,#0369a1)", glow: "rgba(14,165,233,.28)" },
  { id: "results", icon: "📥", route: "/haccp-iso/supplier-evaluation/results", grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)", glow: "rgba(139,92,246,.28)" },
  { id: "performance", icon: "📊", route: "/haccp-iso/supplier-evaluation/performance", grad: "linear-gradient(135deg,#f59e0b,#d97706)", glow: "rgba(245,158,11,.28)" },
];

function isSubmitted(rec) {
  const p = rec?.payload || {};
  if (p?.meta?.submitted === true || p?.public?.submittedAt) return true;
  const ans = p?.answers;
  return !!ans && typeof ans === "object" && Object.values(ans).some((v) => String(v || "").trim() !== "");
}

export default function SupplierEvaluationHub() {
  const navigate = useNavigate();
  const [lang] = useLangState("en");
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const [kpi, setKpi] = useState({ state: "loading", sent: 0, submitted: 0 });
  const mayAdd = canWrite("iso");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json().catch(() => null);
        const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
        const sent = rows.filter((r) => r?.payload?.public?.token);
        if (alive) setKpi({ state: "ok", sent: sent.length, submitted: sent.filter(isSubmitted).length });
      } catch {
        if (alive) setKpi((k) => ({ ...k, state: "err" }));
      }
    })();
    return () => { alive = false; };
  }, []);

  const num = (v) => (kpi.state === "loading" ? "…" : kpi.state === "err" ? "—" : v);
  const pending = kpi.sent - kpi.submitted;
  const rate = kpi.sent ? `${Math.round((kpi.submitted / kpi.sent) * 100)}%` : "—";
  const arrow = isAr ? "←" : "→";
  const cards = CARDS.filter((c) => !c.write || mayAdd);

  return (
    <HaccpPage lang={lang} icon="🤝" title={t.title} sub={t.sub} clause={t.clause}>
      <Stats>
        <Stat label={t.sent} value={num(kpi.sent)} tone="blue" onClick={() => navigate("/haccp-iso/supplier-evaluation/sent-links")} />
        <Stat label={t.submitted} value={num(kpi.submitted)} tone="green" onClick={() => navigate("/haccp-iso/supplier-evaluation/results")} />
        <Stat label={t.pending} value={num(pending)} tone={pending > 0 ? "amber" : "green"} onClick={() => navigate("/haccp-iso/supplier-evaluation/sent-links")} />
        <Stat label={t.rate} value={num(rate)} />
      </Stats>
      {kpi.state === "err" && <div className="pgk-hint" style={{ marginTop: 6 }}>{t.loadErr}</div>}

      <h2 className="ndx-gtitle">{t.steps}</h2>
      <section className="ndx-grid" aria-label={t.steps}>
        {cards.map((c, i) => (
          <div key={c.id} className="ndx-card" style={{ "--glow": c.glow }}>
            <button type="button" className="ndx-cmain" onClick={() => navigate(c.route)}>
              <span className="ndx-ico" style={{ background: c.grad }} aria-hidden="true">{c.icon}</span>
              <span className="ndx-ctxt">
                <span className="ndx-ctitle">{t.cards[c.id].t}</span>
                <span className="ndx-csub">{t.cards[c.id].d}</span>
              </span>
              <span className="ndx-cfoot">
                <span className="ndx-badge blue">{t.step(i + 1)}</span>
                {c.id === "links" && kpi.state === "ok" && pending > 0 && <span className="ndx-badge amber">{pending} · {t.pending}</span>}
                <span className="ndx-arrow" aria-hidden="true">{arrow}</span>
              </span>
            </button>
          </div>
        ))}
      </section>

      <Panel title={t.how}>
        <ol style={{ margin: 0, paddingInlineStart: 22, display: "grid", gap: 6 }}>
          {t.howSteps.map((s) => <li key={s} className="pgk-rec-m">{s}</li>)}
        </ol>
      </Panel>
    </HaccpPage>
  );
}
