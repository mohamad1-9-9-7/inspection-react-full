// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintTrendReport.jsx
// Formal, printable Customer Complaints Trend Analysis Report (ISO 22000:2018 §9.1.2)
// Opened from CustomerComplaintView via the "Trend Analysis" button.

import React, { useMemo } from "react";
import { TYPE_LABELS, TYPE_COLORS, daysBetween } from "./customerComplaintShared";

const T = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 9000, overflowY: "auto", padding: "24px 12px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  panel: {
    background: "#fff", borderRadius: 14, maxWidth: 940, margin: "0 auto",
    padding: "26px 30px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    border: "1px solid #fed7aa",
  },
  h1: { fontSize: 20, fontWeight: 950, color: "#9a3412", margin: 0 },
  sub: { fontSize: 11.5, color: "#c2410c", fontWeight: 700, marginTop: 4 },
  secTitle: {
    fontSize: 13.5, fontWeight: 950, color: "#9a3412",
    borderBottom: "2px solid #fed7aa", padding: "14px 0 6px", marginBottom: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", fontWeight: 900, padding: "6px 8px", textAlign: "start" },
  td: { border: "1px solid #fde8d0", padding: "6px 8px", color: "#1e293b", fontWeight: 600 },
  bar: (pct, color) => ({
    height: 10, width: `${Math.max(pct, 2)}%`, background: color,
    borderRadius: 999, minWidth: 4,
  }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  kpiBox: (color) => ({
    border: `1px solid ${color}44`, borderInlineStart: `4px solid ${color}`,
    borderRadius: 10, padding: "8px 10px", background: "#fff",
  }),
  kpiVal: (color) => ({ fontSize: 18, fontWeight: 950, color }),
  kpiLbl: { fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  note: { fontSize: 12, color: "#1e293b", fontWeight: 600, lineHeight: 1.7, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 12px" },
  sigRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 },
  sigBox: { borderTop: "1.5px solid #9a3412", paddingTop: 6, fontSize: 11.5, fontWeight: 800, color: "#9a3412" },
  btn: (primary) => ({
    background: primary ? "linear-gradient(180deg,#f97316,#ea580c)" : "#fff",
    color: primary ? "#fff" : "#9a3412",
    border: `1.5px solid ${primary ? "#c2410c" : "#fed7aa"}`,
    padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13,
  }),
};

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

export default function ComplaintTrendReportModal({ items, onClose, isAr }) {
  const R = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(isAr ? "ar" : "en", { month: "short", year: "2-digit" }),
        count: 0,
      });
    }
    const byType = {}, bySeverity = {}, byProduct = {}, rootCauses = {};
    let total = 0, open = 0, closed = 0, criticalOpen = 0;
    let satisfiedYes = 0, satisfiedDecided = 0;
    const resolutionDays = [];

    for (const rec of items) {
      const p = rec?.payload || {};
      total++;
      if (p.status === "Closed") closed++; else open++;
      if (p.status !== "Closed" && p.severity === "Critical") criticalOpen++;
      const mk = String(p.complaintDate || "").slice(0, 7);
      const m = months.find((x) => x.key === mk);
      if (m) m.count++;
      const tp = p.type || "Other";
      byType[tp] = (byType[tp] || 0) + 1;
      const sv = p.severity || "Low";
      bySeverity[sv] = (bySeverity[sv] || 0) + 1;
      const prod = String(p.product || "").trim();
      if (prod) byProduct[prod] = (byProduct[prod] || 0) + 1;
      const rc = String(p.rootCause || "").trim();
      if (rc) rootCauses[rc] = (rootCauses[rc] || 0) + 1;
      if (p.customerSatisfied === "Yes") { satisfiedYes++; satisfiedDecided++; }
      else if (p.customerSatisfied === "No") { satisfiedDecided++; }
      if (p.status === "Closed" && p.closureDate && p.complaintDate) {
        const d = daysBetween(p.complaintDate, p.closureDate);
        if (d != null) resolutionDays.push(d);
      }
    }

    const maxMonth = Math.max(...months.map((m) => m.count), 1);
    const last3 = months.slice(9).reduce((a, m) => a + m.count, 0);
    const prev3 = months.slice(6, 9).reduce((a, m) => a + m.count, 0);
    const direction = last3 > prev3 ? "up" : last3 < prev3 ? "down" : "flat";

    const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const avgResolution = resolutionDays.length
      ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length)
      : null;

    return {
      months, maxMonth, total, open, closed, criticalOpen,
      closureRate: pct(closed, total),
      satisfactionRate: satisfiedDecided ? pct(satisfiedYes, satisfiedDecided) : null,
      avgResolution,
      byType: sortDesc(byType),
      bySeverity: sortDesc(bySeverity),
      topProducts: sortDesc(byProduct).slice(0, 5),
      topRootCauses: sortDesc(rootCauses).slice(0, 5),
      last3, prev3, direction,
      periodFrom: months[0].key, periodTo: months[11].key,
      generatedAt: now.toISOString().slice(0, 10),
    };
  }, [items, isAr]);

  const L = isAr
    ? {
        title: "تقرير تحليل اتجاهات شكاوى العملاء",
        sub: "وفق ISO 22000:2018 — البند 9.1.2 (التحليل والتقييم) · SOP 26 — معالجة شكاوى العملاء",
        docNo: "رقم الوثيقة", ref: "FS-QM/REC/CMP-TREND",
        period: "الفترة", generated: "تاريخ الإصدار", preparedBy: "أعده", qa: "ضمان الجودة",
        kpis: "١. ملخص مؤشرات الأداء",
        total: "إجمالي الشكاوى", open: "مفتوحة", closed: "مغلقة", closureRate: "نسبة الإغلاق",
        criticalOpen: "حرجة مفتوحة", avgRes: "متوسط زمن الإغلاق (يوم)", satisfaction: "رضا العميل", period12: "آخر ١٢ شهراً",
        monthly: "٢. الاتجاه الشهري (آخر ١٢ شهراً)",
        month: "الشهر", count: "العدد", chart: "الرسم",
        byType: "٣. التوزيع حسب نوع الشكوى",
        type: "النوع", percent: "النسبة",
        bySeverity: "٤. التوزيع حسب الخطورة",
        severity: "الخطورة",
        topProducts: "٥. أكثر المنتجات شكاوى",
        product: "المنتج",
        rootCauses: "٦. أهم الأسباب الجذرية (من التحقيقات)",
        rootCause: "السبب الجذري",
        conclusion: "٧. الخلاصة والتوصيات",
        signPrep: "أعده: ضمان الجودة (الاسم/التوقيع/التاريخ)",
        signRev: "راجعه: قائد فريق سلامة الغذاء (الاسم/التوقيع/التاريخ)",
        print: "🖨 طباعة التقرير", close: "إغلاق",
        none: "لا توجد بيانات",
      }
    : {
        title: "Customer Complaints — Trend Analysis Report",
        sub: "Per ISO 22000:2018 — Clause 9.1.2 (Analysis & evaluation) · SOP 26 — Customer Complaint Handling",
        docNo: "Doc No.", ref: "FS-QM/REC/CMP-TREND",
        period: "Period", generated: "Generated", preparedBy: "Prepared by", qa: "QA",
        kpis: "1. KPI Summary",
        total: "Total Complaints", open: "Open", closed: "Closed", closureRate: "Closure Rate",
        criticalOpen: "Critical Open", avgRes: "Avg Resolution (days)", satisfaction: "Satisfaction", period12: "Last 12 Months",
        monthly: "2. Monthly Trend (last 12 months)",
        month: "Month", count: "Count", chart: "Chart",
        byType: "3. Breakdown by Complaint Type",
        type: "Type", percent: "Share",
        bySeverity: "4. Breakdown by Severity",
        severity: "Severity",
        topProducts: "5. Top Complained Products",
        product: "Product",
        rootCauses: "6. Top Root Causes (from investigations)",
        rootCause: "Root Cause",
        conclusion: "7. Conclusion & Recommendations",
        signPrep: "Prepared by: QA (Name / Signature / Date)",
        signRev: "Reviewed by: Food Safety Team Leader (Name / Signature / Date)",
        print: "🖨 Print Report", close: "Close",
        none: "No data",
      };

  const conclusionText = useMemo(() => {
    const { direction, last3, prev3 } = R;
    if (isAr) {
      if (direction === "up")
        return `⚠ الاتجاه تصاعدي: عدد الشكاوى في آخر 3 أشهر (${last3}) أعلى من الأشهر الثلاثة السابقة (${prev3}). يوصى بتحليل الأسباب الجذرية المتكررة، وفتح إجراء وقائي (CAPA)، وعرض النتائج على اجتماع مراجعة الإدارة (MRM).`;
      if (direction === "down")
        return `✔ الاتجاه تنازلي: عدد الشكاوى في آخر 3 أشهر (${last3}) أقل من الأشهر الثلاثة السابقة (${prev3}). تُعد الإجراءات التصحيحية الحالية فعّالة — يوصى بالاستمرار في المراقبة الشهرية.`;
      return `● الاتجاه مستقر: عدد الشكاوى في آخر 3 أشهر (${last3}) مساوٍ للأشهر الثلاثة السابقة (${prev3}). يوصى بالاستمرار في المراقبة الشهرية ومراجعة الأنواع الأكثر تكراراً.`;
    }
    if (direction === "up")
      return `⚠ Upward trend: complaints in the last 3 months (${last3}) exceed the previous 3 months (${prev3}). Recommend root-cause analysis of recurring categories, preventive action (CAPA), and reporting to Management Review (MRM).`;
    if (direction === "down")
      return `✔ Downward trend: complaints in the last 3 months (${last3}) are below the previous 3 months (${prev3}). Current corrective actions appear effective — continue monthly monitoring.`;
    return `● Stable trend: complaints in the last 3 months (${last3}) equal the previous 3 months (${prev3}). Continue monthly monitoring and review the most frequent categories.`;
  }, [R, isAr]);

  return (
    <div style={T.backdrop} onClick={onClose}>
      <div style={T.panel} className="cc-trend-print" dir={isAr ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={T.h1}>📈 {L.title}</h1>
            <div style={T.sub}>{L.sub}</div>
          </div>
          <div className="cc-trend-noprint" style={{ display: "flex", gap: 8 }}>
            <button style={T.btn(true)} onClick={() => window.print()}>{L.print}</button>
            <button style={T.btn(false)} onClick={onClose}>{L.close}</button>
          </div>
        </div>

        {/* Document meta */}
        <table style={{ ...T.table, marginTop: 12 }}>
          <tbody>
            <tr>
              <th style={T.th}>{L.docNo}</th><td style={T.td}>{L.ref}</td>
              <th style={T.th}>{L.period}</th><td style={T.td}>{R.periodFrom} → {R.periodTo}</td>
              <th style={T.th}>{L.generated}</th><td style={T.td}>{R.generatedAt}</td>
              <th style={T.th}>{L.preparedBy}</th><td style={T.td}>{L.qa}</td>
            </tr>
          </tbody>
        </table>

        {/* 1. KPI summary */}
        <div style={T.secTitle}>{L.kpis}</div>
        <div style={T.kpiGrid}>
          <div style={T.kpiBox("#9a3412")}><div style={T.kpiVal("#9a3412")}>{R.total}</div><div style={T.kpiLbl}>{L.total}</div></div>
          <div style={T.kpiBox("#ea580c")}><div style={T.kpiVal("#ea580c")}>{R.open}</div><div style={T.kpiLbl}>{L.open}</div></div>
          <div style={T.kpiBox("#16a34a")}><div style={T.kpiVal("#16a34a")}>{R.closed} · {R.closureRate}%</div><div style={T.kpiLbl}>{L.closed} · {L.closureRate}</div></div>
          <div style={T.kpiBox("#dc2626")}><div style={T.kpiVal("#dc2626")}>{R.criticalOpen}</div><div style={T.kpiLbl}>{L.criticalOpen}</div></div>
          <div style={T.kpiBox("#7c3aed")}><div style={T.kpiVal("#7c3aed")}>{R.avgResolution != null ? R.avgResolution : "—"}</div><div style={T.kpiLbl}>{L.avgRes}</div></div>
          <div style={T.kpiBox("#0891b2")}><div style={T.kpiVal("#0891b2")}>{R.satisfactionRate != null ? `${R.satisfactionRate}%` : "—"}</div><div style={T.kpiLbl}>{L.satisfaction}</div></div>
          <div style={T.kpiBox("#854d0e")}><div style={T.kpiVal("#854d0e")}>{R.last3}</div><div style={T.kpiLbl}>{isAr ? "آخر ٣ أشهر" : "Last 3 Months"}</div></div>
          <div style={T.kpiBox("#64748b")}><div style={T.kpiVal("#64748b")}>{R.prev3}</div><div style={T.kpiLbl}>{isAr ? "الأشهر ٣ السابقة" : "Previous 3 Months"}</div></div>
        </div>

        {/* 2. Monthly trend */}
        <div style={T.secTitle}>{L.monthly}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 90 }}>{L.month}</th>
              <th style={{ ...T.th, width: 60 }}>{L.count}</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.months.map((m) => (
              <tr key={m.key}>
                <td style={T.td}>{m.label}</td>
                <td style={{ ...T.td, fontWeight: 900, color: "#9a3412" }}>{m.count}</td>
                <td style={T.td}>
                  <div style={T.bar((m.count / R.maxMonth) * 100, m.count > 0 ? "#ea580c" : "#fde8d0")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 3. By type + 4. By severity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="cc-trend-2col">
          <div>
            <div style={T.secTitle}>{L.byType}</div>
            <table style={T.table}>
              <thead>
                <tr><th style={T.th}>{L.type}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 55 }}>{L.percent}</th></tr>
              </thead>
              <tbody>
                {R.byType.map(([tp, n]) => (
                  <tr key={tp}>
                    <td style={T.td}>
                      <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: TYPE_COLORS[tp] || "#64748b", marginInlineEnd: 6 }} />
                      {TYPE_LABELS[tp] || tp}
                    </td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                    <td style={T.td}>{pct(n, R.total)}%</td>
                  </tr>
                ))}
                {R.byType.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <div style={T.secTitle}>{L.bySeverity}</div>
            <table style={T.table}>
              <thead>
                <tr><th style={T.th}>{L.severity}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 55 }}>{L.percent}</th></tr>
              </thead>
              <tbody>
                {R.bySeverity.map(([sv, n]) => (
                  <tr key={sv}>
                    <td style={T.td}>{sv}</td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                    <td style={T.td}>{pct(n, R.total)}%</td>
                  </tr>
                ))}
                {R.bySeverity.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Top products */}
        <div style={T.secTitle}>{L.topProducts}</div>
        <table style={T.table}>
          <thead>
            <tr><th style={T.th}>{L.product}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 55 }}>{L.percent}</th></tr>
          </thead>
          <tbody>
            {R.topProducts.map(([prod, n]) => (
              <tr key={prod}>
                <td style={T.td}>{prod}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
                <td style={T.td}>{pct(n, R.total)}%</td>
              </tr>
            ))}
            {R.topProducts.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 6. Root causes */}
        <div style={T.secTitle}>{L.rootCauses}</div>
        <table style={T.table}>
          <thead>
            <tr><th style={T.th}>{L.rootCause}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th></tr>
          </thead>
          <tbody>
            {R.topRootCauses.map(([rc, n]) => (
              <tr key={rc}>
                <td style={T.td}>{rc}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{n}</td>
              </tr>
            ))}
            {R.topRootCauses.length === 0 && <tr><td style={T.td} colSpan={2}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 7. Conclusion */}
        <div style={T.secTitle}>{L.conclusion}</div>
        <div style={T.note}>{conclusionText}</div>

        {/* Signatures */}
        <div style={T.sigRow}>
          <div style={T.sigBox}>{L.signPrep}</div>
          <div style={T.sigBox}>{L.signRev}</div>
        </div>
      </div>
    </div>
  );
}
