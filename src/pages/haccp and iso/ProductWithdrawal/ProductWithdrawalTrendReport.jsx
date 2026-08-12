// src/pages/haccp and iso/ProductWithdrawal/ProductWithdrawalTrendReport.jsx
// Formal, printable Product Withdrawal Trend Analysis Report
// ISO 22000:2018 §8.9.5 (Withdrawal) & §9.1.2 (Analysis) · opened from ProductWithdrawalView.

import React, { useMemo } from "react";
import { summarizeLocations, computeSecureHours, needsRecallEscalation } from "./productWithdrawalUtils";

const T = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 9000, overflowY: "auto", padding: "24px 12px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  panel: {
    background: "#fff", borderRadius: 14, maxWidth: 960, margin: "0 auto",
    padding: "26px 30px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    border: "1px solid #c7d2fe",
  },
  h1: { fontSize: 20, fontWeight: 950, color: "#1e3a5f", margin: 0 },
  sub: { fontSize: 11.5, color: "#4338ca", fontWeight: 700, marginTop: 4 },
  secTitle: {
    fontSize: 13.5, fontWeight: 950, color: "#1e3a5f",
    borderBottom: "2px solid #c7d2fe", padding: "14px 0 6px", marginBottom: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { border: "1px solid #c7d2fe", background: "#eef2ff", color: "#1e3a5f", fontWeight: 900, padding: "6px 8px", textAlign: "start" },
  td: { border: "1px solid #e0e7ff", padding: "6px 8px", color: "#1e293b", fontWeight: 600 },
  bar: (pctVal, color) => ({ height: 10, width: `${Math.max(pctVal, 2)}%`, background: color, borderRadius: 999, minWidth: 4 }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  kpiBox: (color) => ({ border: `1px solid ${color}44`, borderInlineStart: `4px solid ${color}`, borderRadius: 10, padding: "8px 10px", background: "#fff" }),
  kpiVal: (color) => ({ fontSize: 18, fontWeight: 950, color }),
  kpiLbl: { fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  note: { fontSize: 12, color: "#1e293b", fontWeight: 600, lineHeight: 1.7, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 12px" },
  sigRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 },
  sigBox: { borderTop: "1.5px solid #1e3a5f", paddingTop: 6, fontSize: 11.5, fontWeight: 800, color: "#1e3a5f" },
  btn: (primary) => ({
    background: primary ? "linear-gradient(180deg,#2d5a8e,#1e3a5f)" : "#fff",
    color: primary ? "#fff" : "#1e3a5f",
    border: `1.5px solid ${primary ? "#1e3a5f" : "#c7d2fe"}`,
    padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13,
  }),
};

function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
const CLASS_LABEL = { A: "Level A", B: "Level B", C: "Level C" };

const REASON_LABEL = {
  ar: {
    Micro: "تلوث ميكروبيولوجي", Chemical: "تلوث كيميائي", Foreign: "جسم غريب",
    Allergen: "مسبّب حساسية", Label: "خطأ وسم", Temperature: "إساءة حرارة",
    ShelfLife: "الصلاحية", Halal: "سلامة الحلال", Packaging: "خلل تغليف",
    Regulatory: "مخالفة تنظيمية", Other: "أخرى",
  },
  en: {
    Micro: "Microbiological", Chemical: "Chemical", Foreign: "Foreign body",
    Allergen: "Allergen", Label: "Labelling", Temperature: "Temperature abuse",
    ShelfLife: "Shelf life", Halal: "Halal integrity", Packaging: "Packaging",
    Regulatory: "Regulatory", Other: "Other",
  },
};

const LEVEL_LABEL = {
  ar: {
    Warehouse: "مستودع", Transit: "قيد النقل", Branch: "فروع",
    Shelf: "على الرف", Wholesale: "جملة/موزّعون",
  },
  en: {
    Warehouse: "Warehouse", Transit: "In transit", Branch: "Branches",
    Shelf: "On shelf", Wholesale: "Wholesale",
  },
};

export default function ProductWithdrawalTrendReportModal({ items, lang, onClose }) {
  const isAr = lang === "ar";

  const R = useMemo(() => {
    const rows = [...items].sort((a, b) => {
      const da = a?.payload?.initDate || "", db = b?.payload?.initDate || "";
      return da < db ? -1 : 1;
    });

    const byYear = new Map();      // year -> { total, closed, rateSum, rateN, cost }
    const byClass = new Map();
    const byStatus = new Map();
    const byReason = new Map();
    const byLevel = new Map();
    const byRootCause = new Map();
    let total = 0, open = 0, closed = 0, cost = 0, escalated = 0;
    const rates = [];
    const secureHours = [];
    const closureDays = [];
    const log = [];

    for (const rec of rows) {
      const p = rec?.payload || {};
      total++;
      const status = p.status || "Open";
      if (status === "Closed") closed++; else open++;
      byStatus.set(status, (byStatus.get(status) || 0) + 1);

      const cls = p.withdrawalClass || "B";
      byClass.set(cls, (byClass.get(cls) || 0) + 1);

      const reason = p.reason || "Other";
      byReason.set(reason, (byReason.get(reason) || 0) + 1);

      const level = p.distributionLevel || "Warehouse";
      byLevel.set(level, (byLevel.get(level) || 0) + 1);

      const c = parseFloat(p.cost) || 0;
      cost += c;

      const totals = summarizeLocations(p.locations);
      const rate = typeof p.accountedRate === "number" ? p.accountedRate : totals.accountedRate;
      if (rate != null) rates.push(rate);
      const isEscalated = needsRecallEscalation(p);
      if (isEscalated) escalated++;

      const sh = computeSecureHours(p.initDate, p.initTime, p.holdCompleted);
      if (sh != null) secureHours.push(sh);

      const y = String(p.initDate || "").slice(0, 4) || "—";
      if (!byYear.has(y)) byYear.set(y, { total: 0, closed: 0, rateSum: 0, rateN: 0, cost: 0 });
      const yr = byYear.get(y);
      yr.total++; if (status === "Closed") yr.closed++;
      if (rate != null) { yr.rateSum += rate; yr.rateN++; }
      yr.cost += c;

      const rcRaw = String(p.rootCause || "").trim();
      if (rcRaw) {
        const rc = rcRaw.length > 60 ? rcRaw.slice(0, 57) + "…" : rcRaw;
        byRootCause.set(rc, (byRootCause.get(rc) || 0) + 1);
      }

      if (status === "Closed" && p.initDate && p.closureDate) {
        const dd = Math.round((new Date(p.closureDate) - new Date(p.initDate)) / 86400000);
        if (!isNaN(dd) && dd >= 0) closureDays.push(dd);
      }

      log.push({
        number: p.withdrawalNumber || "WD",
        date: p.initDate || "—",
        product: p.product || "—",
        cls, status, rate, level,
        escalated: isEscalated,
      });
    }

    const avg = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);
    const half = Math.floor(rates.length / 2);

    return {
      total, open, closed, cost, escalated,
      avgRate: avg(rates),
      avgSecure: avg(secureHours),
      avgClosure: closureDays.length ? Math.round(avg(closureDays)) : null,
      within24: secureHours.length ? secureHours.filter((h) => h <= 24).length : 0,
      secureN: secureHours.length,
      byYear: Array.from(byYear.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      byClass: ["A", "B", "C"].filter((c) => byClass.has(c)).map((c) => [c, byClass.get(c)]),
      byStatus: Array.from(byStatus.entries()),
      byReason: Array.from(byReason.entries()).sort((a, b) => b[1] - a[1]),
      byLevel: Array.from(byLevel.entries()).sort((a, b) => b[1] - a[1]),
      topRootCauses: Array.from(byRootCause.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      logRecent: [...log].reverse().slice(0, 10),
      recentAvg: avg(rates.slice(half)), olderAvg: avg(rates.slice(0, half)),
      generatedAt: new Date().toISOString().slice(0, 10),
    };
  }, [items]);

  const maxYear = Math.max(...R.byYear.map(([, y]) => y.total), 1);
  const maxReason = Math.max(...R.byReason.map(([, n]) => n), 1);

  const L = isAr
    ? {
        title: "تقرير تحليل اتجاهات سحب المنتجات",
        sub: "وفق ISO 22000:2018 — البندان 8.9.5 (السحب) و9.1.2 (التحليل والتقييم)",
        docNo: "رقم الوثيقة", ref: "FS-QM/REC/WD-TREND", generated: "تاريخ الإصدار", preparedBy: "أعده", qa: "ضمان الجودة",
        kpis: "١. ملخص مؤشرات الأداء",
        total: "إجمالي السحوبات", open: "مفتوحة", closed: "مغلقة", avgRate: "متوسط التأمين",
        avgSecure: "متوسط زمن التأمين", hours: "ساعة", avgClosure: "متوسط زمن الإغلاق", days: "يوم",
        cost: "إجمالي التكلفة", escalated: "صُعِّدت لاستدعاء", within24: "ضمن 24 ساعة",
        byYear: "٢. الاتجاه السنوي",
        year: "السنة", count: "العدد", rate: "التأمين %", chart: "الرسم",
        byClass: "٣. حسب تصنيف السحب", cls: "التصنيف",
        byStatus: "٤. حسب الحالة", status: "الحالة",
        byReason: "٥. حسب سبب السحب", reason: "السبب",
        byLevel: "٦. حسب مدى الانتشار", level: "المستوى",
        rootCauses: "٧. أهم الأسباب الجذرية", rootCause: "السبب الجذري",
        log: "٨. سجل السحوبات (الأحدث)",
        number: "الرقم", date: "التاريخ", product: "المنتج",
        conclusion: "٩. الخلاصة والتوصيات",
        signPrep: "أعده: ضمان الجودة (الاسم/التوقيع/التاريخ)",
        signRev: "راجعه: قائد فريق سلامة الغذاء (الاسم/التوقيع/التاريخ)",
        print: "🖨 طباعة التقرير", close: "إغلاق", none: "لا توجد بيانات",
        statusMap: { Open: "مفتوح", InProgress: "قيد التنفيذ", Secured: "مؤمَّن", Closed: "مغلق" },
      }
    : {
        title: "Product Withdrawal — Trend Analysis Report",
        sub: "Per ISO 22000:2018 — Clauses 8.9.5 (Withdrawal) & 9.1.2 (Analysis & evaluation)",
        docNo: "Doc No.", ref: "FS-QM/REC/WD-TREND", generated: "Generated", preparedBy: "Prepared by", qa: "QA",
        kpis: "1. KPI Summary",
        total: "Total Withdrawals", open: "Open", closed: "Closed", avgRate: "Avg Secured",
        avgSecure: "Avg Time to Secure", hours: "h", avgClosure: "Avg Closure Time", days: "days",
        cost: "Total Cost", escalated: "Escalated to Recall", within24: "Within 24 h",
        byYear: "2. Yearly Trend",
        year: "Year", count: "Count", rate: "Secured %", chart: "Chart",
        byClass: "3. By Withdrawal Level", cls: "Level",
        byStatus: "4. By Status", status: "Status",
        byReason: "5. By Withdrawal Reason", reason: "Reason",
        byLevel: "6. By Distribution Reach", level: "Reach",
        rootCauses: "7. Top Root Causes", rootCause: "Root Cause",
        log: "8. Withdrawal Log (most recent)",
        number: "No.", date: "Date", product: "Product",
        conclusion: "9. Conclusion & Recommendations",
        signPrep: "Prepared by: QA (Name / Signature / Date)",
        signRev: "Reviewed by: Food Safety Team Leader (Name / Signature / Date)",
        print: "🖨 Print Report", close: "Close", none: "No data",
        statusMap: { Open: "Open", InProgress: "In progress", Secured: "Secured", Closed: "Closed" },
      };

  const reasonLabel = (k) => (isAr ? REASON_LABEL.ar : REASON_LABEL.en)[k] || k;
  const levelLabel = (k) => (isAr ? LEVEL_LABEL.ar : LEVEL_LABEL.en)[k] || k;
  const rateColor = (r) => (r == null ? "#94a3b8" : r >= 100 ? "#15803d" : r >= 80 ? "#a16207" : "#b91c1c");

  const conclusionText = useMemo(() => {
    const { avgRate, recentAvg, olderAvg, total, escalated, avgSecure, within24, secureN } = R;
    if (total === 0) return isAr ? "لا توجد عمليات سحب مسجلة." : "No withdrawals recorded.";
    const parts = [];
    if (avgRate != null) {
      if (avgRate >= 100) parts.push(isAr
        ? `✔ تم تأمين كامل الكميات في المتوسط (${avgRate.toFixed(1)}%)، ما يؤكد فعالية نظام السحب والتتبع.`
        : `✔ Full stock accountability on average (${avgRate.toFixed(1)}%), confirming an effective withdrawal and traceability system.`);
      else parts.push(isAr
        ? `⚠ متوسط نسبة التأمين ${avgRate.toFixed(1)}% دون الهدف (100%) — يوصى بمراجعة سجلات التوزيع وسرعة إخطار الفروع ودقة أرقام الدفعات.`
        : `⚠ Average secured rate ${avgRate.toFixed(1)}% is below target (100%) — review dispatch records, branch notification speed and batch coding accuracy.`);
    }
    if (recentAvg != null && olderAvg != null) {
      if (recentAvg > olderAvg) parts.push(isAr
        ? `الاتجاه تحسّني (${olderAvg.toFixed(0)}% ← ${recentAvg.toFixed(0)}%).`
        : `Trend improving (${olderAvg.toFixed(0)}% → ${recentAvg.toFixed(0)}%).`);
      else if (recentAvg < olderAvg) parts.push(isAr
        ? `⚠ تراجع في نسبة التأمين (${olderAvg.toFixed(0)}% ← ${recentAvg.toFixed(0)}%) يتطلب إجراءً تصحيحياً.`
        : `⚠ Secured rate declining (${olderAvg.toFixed(0)}% → ${recentAvg.toFixed(0)}%) — corrective action required.`);
    }
    if (secureN > 0 && avgSecure != null) {
      parts.push(isAr
        ? `متوسط زمن تأمين المخزون ${avgSecure.toFixed(1)} ساعة، و${within24} من ${secureN} حالة ضمن هدف الـ 24 ساعة.`
        : `Average time to secure stock is ${avgSecure.toFixed(1)} h, with ${within24} of ${secureN} cases inside the 24 h target.`);
    }
    if (escalated > 0) {
      parts.push(isAr
        ? `⚠ ${escalated} حالة تجاوزت نطاق السحب ووصلت للمستهلك، وتم/يجب التعامل معها كاستدعاء فعلي.`
        : `⚠ ${escalated} case(s) went beyond withdrawal scope and reached consumers, and were/must be handled as real recalls.`);
    }
    if (R.byReason.length && R.byReason[0][1] > 1) {
      const topKey = R.byReason[0][0];
      const top = (isAr ? REASON_LABEL.ar : REASON_LABEL.en)[topKey] || topKey;
      parts.push(isAr
        ? `السبب الأكثر تكراراً هو «${top}» ويستدعي إجراءً وقائياً (CAPA) على مستوى النظام.`
        : `The most frequent reason is “${top}”, warranting system-level preventive action (CAPA).`);
    }
    parts.push(isAr ? `تُرفع النتائج إلى اجتماع مراجعة الإدارة (MRM).` : `Results feed into Management Review (MRM).`);
    return parts.join(" ");
  }, [R, isAr]);

  return (
    <div style={T.backdrop} onClick={onClose}>
      <div style={T.panel} className="wd-trend-print" dir={isAr ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={T.h1}>📈 {L.title}</h1>
            <div style={T.sub}>{L.sub}</div>
          </div>
          <div className="wd-trend-noprint" style={{ display: "flex", gap: 8 }}>
            <button style={T.btn(true)} onClick={() => window.print()}>{L.print}</button>
            <button style={T.btn(false)} onClick={onClose}>{L.close}</button>
          </div>
        </div>

        <table style={{ ...T.table, marginTop: 12 }}>
          <tbody>
            <tr>
              <th style={T.th}>{L.docNo}</th><td style={T.td}>{L.ref}</td>
              <th style={T.th}>{L.generated}</th><td style={T.td}>{R.generatedAt}</td>
              <th style={T.th}>{L.preparedBy}</th><td style={T.td}>{L.qa}</td>
            </tr>
          </tbody>
        </table>

        {/* 1. KPIs */}
        <div style={T.secTitle}>{L.kpis}</div>
        <div style={T.kpiGrid}>
          <div style={T.kpiBox("#1e3a5f")}><div style={T.kpiVal("#1e3a5f")}>{R.total}</div><div style={T.kpiLbl}>{L.total}</div></div>
          <div style={T.kpiBox("#a16207")}><div style={T.kpiVal("#a16207")}>{R.open}</div><div style={T.kpiLbl}>{L.open}</div></div>
          <div style={T.kpiBox("#16a34a")}><div style={T.kpiVal("#16a34a")}>{R.closed}</div><div style={T.kpiLbl}>{L.closed}</div></div>
          <div style={T.kpiBox(rateColor(R.avgRate))}><div style={T.kpiVal(rateColor(R.avgRate))}>{R.avgRate != null ? `${R.avgRate.toFixed(1)}%` : "—"}</div><div style={T.kpiLbl}>{L.avgRate}</div></div>
          <div style={T.kpiBox("#0891b2")}><div style={T.kpiVal("#0891b2")}>{R.avgSecure != null ? `${R.avgSecure.toFixed(1)} ${L.hours}` : "—"}</div><div style={T.kpiLbl}>{L.avgSecure}</div></div>
          <div style={T.kpiBox("#7c3aed")}><div style={T.kpiVal("#7c3aed")}>{R.avgClosure != null ? `${R.avgClosure} ${L.days}` : "—"}</div><div style={T.kpiLbl}>{L.avgClosure}</div></div>
          <div style={T.kpiBox(R.escalated > 0 ? "#b91c1c" : "#64748b")}><div style={T.kpiVal(R.escalated > 0 ? "#b91c1c" : "#64748b")}>{R.escalated}</div><div style={T.kpiLbl}>{L.escalated}</div></div>
          <div style={T.kpiBox("#0f766e")}><div style={T.kpiVal("#0f766e")}>{R.cost ? R.cost.toLocaleString() : "—"}</div><div style={T.kpiLbl}>{L.cost} (AED)</div></div>
        </div>

        {/* 2. Yearly trend */}
        <div style={T.secTitle}>{L.byYear}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 70 }}>{L.year}</th>
              <th style={{ ...T.th, width: 60 }}>{L.count}</th>
              <th style={{ ...T.th, width: 90 }}>{L.rate}</th>
              <th style={{ ...T.th, width: 110 }}>{L.cost} (AED)</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.byYear.map(([y, v]) => {
              const r = v.rateN ? v.rateSum / v.rateN : null;
              return (
                <tr key={y}>
                  <td style={T.td}>{y}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: "#1e3a5f" }}>{v.total}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: rateColor(r) }}>{r != null ? `${r.toFixed(1)}%` : "—"}</td>
                  <td style={T.td}>{v.cost ? v.cost.toLocaleString() : "—"}</td>
                  <td style={T.td}><div style={T.bar((v.total / maxYear) * 100, "#2d5a8e")} /></td>
                </tr>
              );
            })}
            {R.byYear.length === 0 && <tr><td style={T.td} colSpan={5}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 3. By class + 4. By status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="wd-trend-2col">
          <div>
            <div style={T.secTitle}>{L.byClass}</div>
            <table style={T.table}>
              <thead><tr><th style={T.th}>{L.cls}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 60 }}>%</th></tr></thead>
              <tbody>
                {R.byClass.map(([c, n]) => (
                  <tr key={c}>
                    <td style={T.td}>{CLASS_LABEL[c] || c}</td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                    <td style={T.td}>{pct(n, R.total)}%</td>
                  </tr>
                ))}
                {R.byClass.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <div style={T.secTitle}>{L.byStatus}</div>
            <table style={T.table}>
              <thead><tr><th style={T.th}>{L.status}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 60 }}>%</th></tr></thead>
              <tbody>
                {R.byStatus.map(([s, n]) => (
                  <tr key={s}>
                    <td style={T.td}>{L.statusMap[s] || s}</td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                    <td style={T.td}>{pct(n, R.total)}%</td>
                  </tr>
                ))}
                {R.byStatus.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. By reason */}
        <div style={T.secTitle}>{L.byReason}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={T.th}>{L.reason}</th>
              <th style={{ ...T.th, width: 55 }}>{L.count}</th>
              <th style={{ ...T.th, width: 60 }}>%</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.byReason.map(([k, n]) => (
              <tr key={k}>
                <td style={T.td}>{reasonLabel(k)}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                <td style={T.td}>{pct(n, R.total)}%</td>
                <td style={T.td}><div style={T.bar((n / maxReason) * 100, "#4338ca")} /></td>
              </tr>
            ))}
            {R.byReason.length === 0 && <tr><td style={T.td} colSpan={4}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 6. By distribution reach */}
        <div style={T.secTitle}>{L.byLevel}</div>
        <table style={T.table}>
          <thead><tr><th style={T.th}>{L.level}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 60 }}>%</th></tr></thead>
          <tbody>
            {R.byLevel.map(([k, n]) => (
              <tr key={k}>
                <td style={T.td}>{levelLabel(k)}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                <td style={T.td}>{pct(n, R.total)}%</td>
              </tr>
            ))}
            {R.byLevel.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 7. Root causes */}
        <div style={T.secTitle}>{L.rootCauses}</div>
        <table style={T.table}>
          <thead><tr><th style={T.th}>{L.rootCause}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th></tr></thead>
          <tbody>
            {R.topRootCauses.map(([rc, n]) => (
              <tr key={rc}><td style={T.td}>{rc}</td><td style={{ ...T.td, fontWeight: 900 }}>{n}</td></tr>
            ))}
            {R.topRootCauses.length === 0 && <tr><td style={T.td} colSpan={2}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 8. Withdrawal log */}
        <div style={T.secTitle}>{L.log}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 78 }}>{L.number}</th>
              <th style={{ ...T.th, width: 85 }}>{L.date}</th>
              <th style={T.th}>{L.product}</th>
              <th style={{ ...T.th, width: 65 }}>{L.cls}</th>
              <th style={{ ...T.th, width: 80 }}>{L.level}</th>
              <th style={{ ...T.th, width: 70 }}>{L.rate}</th>
              <th style={{ ...T.th, width: 80 }}>{L.status}</th>
            </tr>
          </thead>
          <tbody>
            {R.logRecent.map((r, i) => (
              <tr key={i}>
                <td style={{ ...T.td, fontWeight: 900 }}>{r.number}{r.escalated ? " 🚨" : ""}</td>
                <td style={T.td}>{r.date}</td>
                <td style={T.td}>{r.product}</td>
                <td style={T.td}>{CLASS_LABEL[r.cls] || r.cls}</td>
                <td style={T.td}>{levelLabel(r.level)}</td>
                <td style={{ ...T.td, fontWeight: 900, color: rateColor(r.rate) }}>{r.rate != null ? `${r.rate.toFixed(0)}%` : "—"}</td>
                <td style={T.td}>{L.statusMap[r.status] || r.status}</td>
              </tr>
            ))}
            {R.logRecent.length === 0 && <tr><td style={T.td} colSpan={7}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 9. Conclusion */}
        <div style={T.secTitle}>{L.conclusion}</div>
        <div style={T.note}>{conclusionText}</div>

        <div style={T.sigRow}>
          <div style={T.sigBox}>{L.signPrep}</div>
          <div style={T.sigBox}>{L.signRev}</div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .wd-trend-print, .wd-trend-print * { visibility: visible !important; }
          .wd-trend-print {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
          }
          .wd-trend-noprint { display: none !important; }
        }
        @media (max-width: 720px) { .wd-trend-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
