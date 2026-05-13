// src/pages/hse/HSEKPIs.jsx — bilingual
// 📊 HSE KPI Dashboard — auto-calculated from server-side records

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost,
  cardStyle, HSE_COLORS,
  apiList,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  title:    { ar: "📊 لوحة مؤشرات الأداء — HSE KPI Dashboard", en: "📊 HSE KPI Dashboard" },
  subtitle: { ar: "مؤشرات متأخرة (Lagging) ومتقدمة (Leading) — مُحسوبة آلياً من السجلات",
              en: "Lagging and Leading indicators — auto-calculated from records" },
  pageIntro: {
    ar: "تنقسم مؤشرات الأداء في HSE إلى نوعين رئيسيين: مؤشرات متأخرة (Lagging) تقيس ما حدث فعلاً (مثل LTIFR وعدد الإصابات) وتُستخدم للتعلم من الماضي، ومؤشرات متقدمة (Leading) تقيس الاستباقية والوقاية (مثل عدد بلاغات شبه الحوادث ونسبة إغلاق الإجراءات التصحيحية وتفتيش الموقع اليومي) وتُستخدم لتوقّع المستقبل ومنع الحوادث قبل وقوعها. النظام الناجح يوازن بين الاثنين.",
    en: "HSE performance indicators split into two main types: Lagging indicators measure what already happened (e.g., LTIFR, injury counts) — used to learn from the past. Leading indicators measure proactivity and prevention (e.g., near-miss reports, corrective-action closure rate, daily site inspection completion) — used to predict the future and prevent incidents. A successful system balances both.",
  },
  reportsTitle: { ar: "📄 نظام التقارير الدوري", en: "📄 Periodic Reports System" },
  reportsIntro: {
    ar: "يجب أن يصدر قسم HSE تقارير منتظمة بترددات وجمهور محددين لضمان وصول المعلومة الصحيحة للشخص المناسب في الوقت المناسب:",
    en: "The HSE department must issue regular reports at defined frequencies and audiences — ensuring the right information reaches the right person at the right time:",
  },
  rCols: {
    report: { ar: "التقرير", en: "Report" },
    freq:   { ar: "التكرار", en: "Frequency" },
    owner:  { ar: "المسؤول", en: "Owner" },
    audience:{ ar: "الجهة المستلمة", en: "Audience" },
  },
  back: { ar: "← HSE", en: "← HSE" },
  refresh: { ar: "🔄 تحديث", en: "🔄 Refresh" },
  loading: { ar: "⏳ جارٍ تحميل البيانات…", en: "⏳ Loading data…" },
  workHours: { ar: "إجمالي ساعات العمل (للسنة):", en: "Total work hours (annual):" },
  workHoursHelp: { ar: "(يستخدم في حساب LTIFR و TRIR)", en: "(used to calculate LTIFR & TRIR)" },
  ltifr: { ar: "معدل إصابات فقدان الوقت", en: "Lost-Time Injury Frequency Rate" },
  trir:  { ar: "معدل الحوادث المسجّلة", en: "Total Recordable Incident Rate" },
  tempCompliance: { ar: "🌡️ الالتزام بالحرارة", en: "🌡️ Temperature Compliance" },
  tempSub: { ar: "قراءات شحنات ضمن النطاق", en: "Shipments within range" },
  nmThisMonth: { ar: "⚠️ شبه الحوادث (هذا الشهر)", en: "⚠️ Near-misses (this month)" },
  nmSub: { ar: "ثقافة الإبلاغ المبكر", en: "Early reporting culture" },
  daysSince: { ar: "📅 أيام بدون إصابة", en: "📅 Days without injury" },
  daysSub: { ar: "آخر إصابة عمل", en: "Since last LTI" },
  ltis: { ar: "🚨 إصابات العمل (LTI)", en: "🚨 Lost-Time Injuries (LTI)" },
  ltisSub: { ar: "فقدان وقت", en: "Lost time" },
  closure: { ar: "✅ نسبة إغلاق التحقيقات", en: "✅ Investigation Closure Rate" },
  closureSub: { ar: "من إجمالي الحوادث", en: "Of all incidents" },
  inspections30: { ar: "📋 فحوصات (آخر 30 يوم)", en: "📋 Inspections (last 30 days)" },
  inspectionsSub: { ar: "رافعات + معدات حريق + إخلاء", en: "Forklift + Fire + Drills" },
  trained: { ar: "🎓 موظفون مدرّبون (هذا العام)", en: "🎓 Employees trained (this year)" },
  trainedSub: { ar: "إجمالي حضور الدورات", en: "Total course attendance" },
  expiring: { ar: "🪪 تراخيص ستنتهي قريباً", en: "🪪 Licenses expiring soon" },
  expiringSub: { ar: "خلال 60 يوماً", en: "Within 60 days" },
  expired: { ar: "🔴 تراخيص منتهية", en: "🔴 Expired licenses" },
  expiredSub: { ar: "تتطلب تجديد فوري", en: "Need immediate renewal" },
  risks: { ar: "⚠️ مخاطر حرجة + عالية", en: "⚠️ Critical + High risks" },
  risksSub: { ar: "من سجل المخاطر", en: "From the risk register" },
  capaOverdue: { ar: "🔥 إجراءات متأخرة", en: "🔥 Overdue CAPA" },
  capaOverdueSub: { ar: "من سجل CAPA", en: "From CAPA tracker" },
  targetsTitle: { ar: "🎯 المستهدفات الاستراتيجية (السنة الأولى)", en: "🎯 Strategic Targets (Year 1)" },
  cols: {
    goal: { ar: "الهدف", en: "Goal" },
    ind: { ar: "المؤشر", en: "Indicator" },
    target: { ar: "المستهدف", en: "Target" },
    actual: { ar: "الحالة الفعلية", en: "Actual" },
  },
  goal1: { ar: "صفر حوادث مميتة", en: "Zero fatal incidents" },
  ind1:  { ar: "عدد الحوادث المميتة السنوية", en: "Annual fatal incidents" },
  goal2: { ar: "خفض إصابات العمل", en: "Reduce work injuries" },
  goal3: { ar: "سلامة سلسلة التبريد", en: "Cold chain integrity" },
  ind3:  { ar: "الالتزام بدرجات الحرارة", en: "Temperature compliance" },
  goal4: { ar: "رفع ثقافة الإبلاغ", en: "Raise reporting culture" },
  ind4:  { ar: "بلاغات شبه الحوادث (شهرياً)", en: "Near-miss reports (monthly)" },
  goal5: { ar: "تدريب شامل", en: "Comprehensive training" },
  ind5:  { ar: "موظفون مدربون", en: "Employees trained" },
  empSuffix: { ar: "موظف", en: "employees" },
  goal6: { ar: "إغلاق التحقيقات", en: "Investigation closure" },
  ind6:  { ar: "نسبة الإجراءات التصحيحية المغلقة", en: "% corrective actions closed" },
  target: { ar: "المستهدف:", en: "Target:" },
};

export default function HSEKPIs() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [workHours, setWorkHours] = useState(() => {
    try { return Number(localStorage.getItem("hse_kpi_workHours")) || 350000; } catch { return 350000; }
  });

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [risks, setRisks] = useState([]);
  const [forklift, setForklift] = useState([]);
  const [fireEquipment, setFireEquipment] = useState([]);
  const [evacuation, setEvacuation] = useState([]);
  const [capa, setCapa] = useState([]);

  function saveHours(v) {
    setWorkHours(v);
    try { localStorage.setItem("hse_kpi_workHours", String(v)); } catch {}
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [
        inc, tr, lic, rsk, fl, fe, ev, cp,
      ] = await Promise.all([
        apiList("incident_reports"),
        apiList("training_records"),
        apiList("licenses_certs"),
        apiList("risk_register"),
        apiList("forklift_inspection"),
        apiList("fire_equipment"),
        apiList("evacuation_drills"),
        apiList("capa_actions"),
      ]);
      setIncidents(inc);
      setTrainings(tr);
      setLicenses(lic);
      setRisks(rsk);
      setForklift(fl);
      setFireEquipment(fe);
      setEvacuation(ev);
      setCapa(cp);
    } catch (e) {
      console.warn("KPI load error:", e?.message || e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  const kpis = useMemo(() => {
    // LTIs are incident_reports with severity = lti / major / fatal (or type=lost_time_injury)
    const ltis = incidents.filter((i) => i.severity === "lti" || i.type === "lost_time_injury").length;
    const major = incidents.filter((i) => i.severity === "major").length;
    const fatal = incidents.filter((i) => i.severity === "fatal").length;
    const firstAid = incidents.filter((i) => i.severity === "first_aid" || i.type === "first_aid").length;
    const recordable = ltis + major + fatal + firstAid;
    const ltifr = workHours > 0 ? (((ltis + major + fatal) * 1_000_000) / workHours).toFixed(2) : "—";
    const trir  = workHours > 0 ? ((recordable * 200_000) / workHours).toFixed(2) : "—";

    // Near-miss this month — now read from incident_reports filtered by severity
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const nmThisMonth = incidents.filter((i) =>
      (i.severity === "near_miss" || i.type === "near_miss") &&
      (i.reportDate || "").startsWith(ym)
    ).length;

    // Days since last serious injury
    let daysSinceLast = "—";
    const seriousIncidents = incidents.filter((i) =>
      ["lti", "major", "fatal"].includes(i.severity) && i.reportDate
    );
    if (seriousIncidents.length > 0) {
      const sorted = seriousIncidents.sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1));
      daysSinceLast = Math.floor((Date.now() - new Date(sorted[0].reportDate).getTime()) / 86400000);
    } else {
      daysSinceLast = "∞";
    }

    // Investigation closure rate
    const closures = incidents.length > 0
      ? Math.round((incidents.filter((i) => i.status === "closed").length / incidents.length) * 100)
      : 0;

    // Inspections (last 30 days) — combined: forklift + fire equipment + evacuation drills
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    const inAllInspections = [...forklift, ...fireEquipment, ...evacuation];
    const recentInspections = inAllInspections.filter((i) => {
      const d = i.date || i.reportDate || i.createdAt;
      return d && new Date(d) >= last30;
    }).length;

    // Temperature compliance — N/A (shipment receiving was removed; can be re-introduced from CCP module later)
    let tempTotal = 0, tempOk = 0;
    const tempCompliance = tempTotal > 0 ? Math.round((tempOk / tempTotal) * 100) : 0;

    // Trained employees this year
    const yearStart = new Date(); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);
    const totalTrained = trainings
      .filter((t) => {
        const d = t.date || t.createdAt;
        return d && new Date(d) >= yearStart;
      })
      .reduce((a, t) => a + (Number(t.attendeeCount) || 0), 0);

    // Licenses expiring within 60 days / expired
    const expiringLicenses = licenses.filter((l) => {
      if (!l.expiryDate) return false;
      const d = Math.round((new Date(l.expiryDate) - new Date()) / 86400000);
      return d >= 0 && d <= 60;
    }).length;
    const expiredLicenses = licenses.filter((l) => l.expiryDate && new Date(l.expiryDate) < new Date()).length;

    // Risk register: critical + high
    const criticalRisks = risks.filter((r) => (Number(r.likelihood) || 0) * (Number(r.severity) || 0) >= 20).length;
    const highRisks = risks.filter((r) => {
      const s = (Number(r.likelihood) || 0) * (Number(r.severity) || 0);
      return s >= 13 && s < 20;
    }).length;

    // CAPA: overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const capaOverdue = capa.filter((c) => {
      if (c.status === "closed") return false;
      if (!c.deadline) return false;
      return new Date(c.deadline) < today;
    }).length;

    return {
      ltis, recordable, ltifr, trir, nmThisMonth, daysSinceLast, closures,
      recentInspections, tempCompliance, tempTotal,
      totalTrained, expiringLicenses, expiredLicenses, criticalRisks, highRisks,
      fatal, capaOverdue,
    };
  }, [incidents, trainings, licenses, risks, forklift, fireEquipment, evacuation, capa, workHours]);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={buttonGhost} onClick={loadAll} disabled={loading}>
              {loading ? pick(T.loading) : pick(T.refresh)}
            </button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{pick(T.workHours)}</span>
          <input type="number" value={workHours} onChange={(e) => saveHours(Number(e.target.value) || 0)} dir="ltr"
            style={{ width: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(120,53,15,0.18)", fontWeight: 800, textAlign: "center" }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>{pick(T.workHoursHelp)}</span>
        </div>

        {loading && (
          <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 }}>
            {pick(T.loading)}
          </div>
        )}

        {!loading && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <KPICard label="LTIFR" value={kpis.ltifr} target="< 1.0" target_value={1.0} actual={Number(kpis.ltifr)} type="lower" sub={pick(T.ltifr)} />
              <KPICard label="TRIR" value={kpis.trir} target="< 2.0" target_value={2.0} actual={Number(kpis.trir)} type="lower" sub={pick(T.trir)} />
              <KPICard label={pick(T.tempCompliance)} value={kpis.tempTotal > 0 ? `${kpis.tempCompliance}%` : "—"} target="≥ 99%" target_value={99} actual={kpis.tempTotal > 0 ? kpis.tempCompliance : undefined} type="higher" sub={pick(T.tempSub)} />
              <KPICard label={pick(T.nmThisMonth)} value={kpis.nmThisMonth} target="≥ 10" target_value={10} actual={kpis.nmThisMonth} type="higher" sub={pick(T.nmSub)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <KPICard label={pick(T.daysSince)} value={kpis.daysSinceLast} sub={pick(T.daysSub)} color="#166534" bg="#dcfce7" />
              <KPICard label={pick(T.ltis)} value={kpis.ltis} sub={pick(T.ltisSub)} color="#7f1d1d" bg="#fee2e2" />
              <KPICard label={pick(T.closure)} value={`${kpis.closures}%`} target="≥ 90%" target_value={90} actual={kpis.closures} type="higher" sub={pick(T.closureSub)} />
              <KPICard label={pick(T.inspections30)} value={kpis.recentInspections} sub={pick(T.inspectionsSub)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <KPICard label={pick(T.trained)} value={kpis.totalTrained} sub={pick(T.trainedSub)} color="#1e40af" bg="#dbeafe" />
              <KPICard label={pick(T.expiring)} value={kpis.expiringLicenses} sub={pick(T.expiringSub)} color={kpis.expiringLicenses > 0 ? "#854d0e" : "#166534"} bg={kpis.expiringLicenses > 0 ? "#fef9c3" : "#dcfce7"} />
              <KPICard label={pick(T.expired)} value={kpis.expiredLicenses} sub={pick(T.expiredSub)} color={kpis.expiredLicenses > 0 ? "#7f1d1d" : "#166534"} bg={kpis.expiredLicenses > 0 ? "#fee2e2" : "#dcfce7"} />
              <KPICard label={pick(T.risks)} value={`${kpis.criticalRisks} + ${kpis.highRisks}`} sub={pick(T.risksSub)} color="#9a3412" bg="#fed7aa" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <KPICard label={pick(T.capaOverdue)} value={kpis.capaOverdue} sub={pick(T.capaOverdueSub)} color={kpis.capaOverdue > 0 ? "#7f1d1d" : "#166534"} bg={kpis.capaOverdue > 0 ? "#fee2e2" : "#dcfce7"} />
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color: HSE_COLORS.primaryDark }}>{pick(T.targetsTitle)}</div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.cols.goal)}</th>
                    <th style={thStyle}>{pick(T.cols.ind)}</th>
                    <th style={thStyle}>{pick(T.cols.target)}</th>
                    <th style={thStyle}>{pick(T.cols.actual)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal1)}</td>
                    <td style={tdStyle}>{pick(T.ind1)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>0</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: kpis.fatal === 0 ? "#166534" : "#7f1d1d" }}>{kpis.fatal}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal2)}</td>
                    <td style={tdStyle}>LTIFR</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>&lt; 1.0</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: Number(kpis.ltifr) < 1 ? "#166534" : "#9a3412" }}>{kpis.ltifr}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal3)}</td>
                    <td style={tdStyle}>{pick(T.ind3)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>≥ 99%</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: kpis.tempCompliance >= 99 ? "#166534" : "#9a3412" }}>{kpis.tempTotal > 0 ? `${kpis.tempCompliance}%` : "—"}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal4)}</td>
                    <td style={tdStyle}>{pick(T.ind4)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>≥ 10</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: kpis.nmThisMonth >= 10 ? "#166534" : "#9a3412" }}>{kpis.nmThisMonth}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal5)}</td>
                    <td style={tdStyle}>{pick(T.ind5)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>≥ 95%</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{kpis.totalTrained} {pick(T.empSuffix)}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{pick(T.goal6)}</td>
                    <td style={tdStyle}>{pick(T.ind6)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>≥ 90%</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: kpis.closures >= 90 ? "#166534" : "#9a3412" }}>{kpis.closures}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Periodic reports table */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 8, color: HSE_COLORS.primaryDark }}>{pick(T.reportsTitle)}</div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.reportsIntro)}</p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.rCols.report)}</th>
                    <th style={thStyle}>{pick(T.rCols.freq)}</th>
                    <th style={thStyle}>{pick(T.rCols.owner)}</th>
                    <th style={thStyle}>{pick(T.rCols.audience)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "تقرير الموقع اليومي" : "Daily site report"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "يومي" : "Daily"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "ضابط HSE للموقع" : "HSE Site Officer"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "تقرير أسبوعي موجز" : "Weekly summary report"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "أسبوعي" : "Weekly"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "المدير التشغيلي" : "Operations Director"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "لوحة KPIs شهرية" : "Monthly KPI dashboard"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "شهري" : "Monthly"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "الإدارة العليا" : "Senior Management"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "تقرير مراجعة الإدارة" : "Management review report"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "ربع سنوي" : "Quarterly"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مجلس الإدارة" : "Board of Directors"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "تقرير سنوي شامل" : "Annual comprehensive report"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "سنوي" : "Annual"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "الإدارة + الجهات الخارجية" : "Management + External Bodies"}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{lang === "ar" ? "تقرير ما بعد الحادث" : "Post-incident report"}</td>
                    <td style={{ ...tdStyle, color: "#7f1d1d", fontWeight: 800 }}>{lang === "ar" ? "فوري" : "Immediate"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "مدير HSE" : "HSE Manager"}</td>
                    <td style={tdStyle}>{lang === "ar" ? "الإدارة + الجهات الرسمية" : "Management + Authorities"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function KPICard({ label, value, sub, target, target_value, actual, type, color, bg }) {
  let statusBg = bg || "#fff7ed";
  let statusColor = color || HSE_COLORS.primaryDark;
  if (target_value !== undefined && actual !== undefined && !isNaN(actual)) {
    const ok = type === "lower" ? actual < target_value : actual >= target_value;
    statusBg = ok ? "#dcfce7" : "#fee2e2";
    statusColor = ok ? "#166534" : "#7f1d1d";
  }
  return (
    <div style={{ ...cardStyle, padding: 16, background: statusBg, borderColor: statusColor + "55" }}>
      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85, color: statusColor }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950, color: statusColor, marginTop: 4 }}>{value}</div>
      {target && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{type ? "Target" : "·"}: {target}</div>}
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
