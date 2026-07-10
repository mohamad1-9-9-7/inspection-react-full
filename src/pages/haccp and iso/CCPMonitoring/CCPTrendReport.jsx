// src/pages/haccp and iso/CCPMonitoring/CCPTrendReport.jsx
// Formal, printable CCP Monitoring Trend Analysis Report (ISO 22000:2018 §8.5.4 & 9.1.2)
// Opened from CCPView via the "Trend Analysis" button. Includes its own print CSS.

import React, { useMemo } from "react";
import { ccpName } from "./i18n";

const T = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 9000, overflowY: "auto", padding: "24px 12px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  panel: {
    background: "#fff", borderRadius: 14, maxWidth: 940, margin: "0 auto",
    padding: "26px 30px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    border: "1px solid #bfdbfe",
  },
  h1: { fontSize: 20, fontWeight: 950, color: "#1e3a5f", margin: 0 },
  sub: { fontSize: 11.5, color: "#2d5a8e", fontWeight: 700, marginTop: 4 },
  secTitle: {
    fontSize: 13.5, fontWeight: 950, color: "#1e3a5f",
    borderBottom: "2px solid #bfdbfe", padding: "14px 0 6px", marginBottom: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a5f", fontWeight: 900, padding: "6px 8px", textAlign: "start" },
  td: { border: "1px solid #dbeafe", padding: "6px 8px", color: "#1e293b", fontWeight: 600 },
  bar: (pctVal, color) => ({
    height: 10, width: `${Math.max(pctVal, 2)}%`, background: color,
    borderRadius: 999, minWidth: 4,
  }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  kpiBox: (color) => ({
    border: `1px solid ${color}44`, borderInlineStart: `4px solid ${color}`,
    borderRadius: 10, padding: "8px 10px", background: "#fff",
  }),
  kpiVal: (color) => ({ fontSize: 18, fontWeight: 950, color }),
  kpiLbl: { fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  note: { fontSize: 12, color: "#1e293b", fontWeight: 600, lineHeight: 1.7, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px" },
  sigRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 },
  sigBox: { borderTop: "1.5px solid #1e3a5f", paddingTop: 6, fontSize: 11.5, fontWeight: 800, color: "#1e3a5f" },
  btn: (primary) => ({
    background: primary ? "linear-gradient(180deg,#2d5a8e,#1e3a5f)" : "#fff",
    color: primary ? "#fff" : "#1e3a5f",
    border: `1.5px solid ${primary ? "#1e3a5f" : "#bfdbfe"}`,
    padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13,
  }),
};

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

export default function CCPTrendReportModal({ items, ccps, lang, onClose }) {
  const isAr = lang === "ar";

  const R = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(isAr ? "ar" : "en", { month: "short", year: "2-digit" }),
        total: 0, dev: 0,
      });
    }
    const byCcp = new Map();   // ccpId -> { total, dev }
    const byBranch = new Map(); // branch -> { total, dev }
    const deviations = [];
    let total = 0, compliant = 0, dev = 0, pending = 0;

    for (const rec of items) {
      const p = rec?.payload || {};
      total++;
      const within = p?.autoEval?.withinLimit;
      if (within === true) compliant++;
      else if (within === false) dev++;
      else pending++;

      const mk = String(p.reportDate || "").slice(0, 7);
      const m = months.find((x) => x.key === mk);
      if (m) { m.total++; if (within === false) m.dev++; }

      const cid = p.ccpId || "?";
      if (!byCcp.has(cid)) byCcp.set(cid, { total: 0, dev: 0 });
      const c = byCcp.get(cid);
      c.total++; if (within === false) c.dev++;

      const br = String(p.product?.branch || "—").trim() || "—";
      if (!byBranch.has(br)) byBranch.set(br, { total: 0, dev: 0 });
      const b = byBranch.get(br);
      b.total++; if (within === false) b.dev++;

      if (within === false) {
        deviations.push({
          date: p.reportDate || "—",
          ccpId: cid,
          reading: `${p.reading?.value ?? "—"}${p.ccpSnapshot?.criticalLimit?.unit || ""}`,
          action: p.deviation?.correctiveAction || "—",
          productStatus: p.deviation?.productStatus || "—",
          branch: br,
        });
      }
    }

    deviations.sort((a, b) => (a.date < b.date ? 1 : -1));
    const maxMonth = Math.max(...months.map((m) => m.total), 1);
    const devLast3 = months.slice(9).reduce((a, m) => a + m.dev, 0);
    const devPrev3 = months.slice(6, 9).reduce((a, m) => a + m.dev, 0);
    const direction = devLast3 > devPrev3 ? "up" : devLast3 < devPrev3 ? "down" : "flat";

    return {
      months, maxMonth, total, compliant, dev, pending,
      complianceRate: pct(compliant, total),
      byCcp: Array.from(byCcp.entries()).sort((a, b) => b[1].dev - a[1].dev || b[1].total - a[1].total),
      byBranch: Array.from(byBranch.entries()).sort((a, b) => b[1].dev - a[1].dev || b[1].total - a[1].total),
      recentDeviations: deviations.slice(0, 8),
      devLast3, devPrev3, direction,
      periodFrom: months[0].key, periodTo: months[11].key,
      generatedAt: now.toISOString().slice(0, 10),
    };
  }, [items, isAr]);

  const ccpDisplay = (cid) => {
    const c = ccps.find((x) => x.id === cid);
    return c ? ccpName(c, lang) : cid;
  };

  const L = isAr
    ? {
        title: "تقرير تحليل اتجاهات مراقبة نقاط التحكم الحرجة (CCP)",
        sub: "وفق ISO 22000:2018 — البندان 8.5.4 (خطة التحكم بالمخاطر) و9.1.2 (التحليل والتقييم)",
        docNo: "رقم الوثيقة", ref: "FS-QM/REC/CCP-TREND",
        period: "الفترة", generated: "تاريخ الإصدار", preparedBy: "أعده", qa: "ضمان الجودة",
        kpis: "١. ملخص مؤشرات الأداء",
        total: "إجمالي السجلات", compliant: "مطابق", devs: "انحرافات", pending: "معلّق",
        complianceRate: "نسبة الامتثال",
        monthly: "٢. الاتجاه الشهري (آخر ١٢ شهراً)",
        month: "الشهر", records: "السجلات", dev: "انحرافات", rate: "الامتثال", chart: "الرسم",
        byCcp: "٣. التحليل حسب نقطة التحكم الحرجة",
        ccp: "نقطة التحكم",
        byBranch: "٤. التحليل حسب الفرع/الموقع",
        branch: "الفرع",
        recent: "٥. أحدث الانحرافات والإجراءات التصحيحية",
        date: "التاريخ", reading: "القراءة", action: "الإجراء التصحيحي", productStatus: "حالة المنتج",
        conclusion: "٦. الخلاصة والتوصيات",
        signPrep: "أعده: ضمان الجودة (الاسم/التوقيع/التاريخ)",
        signRev: "راجعه: قائد فريق سلامة الغذاء (الاسم/التوقيع/التاريخ)",
        print: "🖨 طباعة التقرير", close: "إغلاق",
        none: "لا توجد بيانات", noDevs: "لا توجد انحرافات مسجلة ✔",
      }
    : {
        title: "CCP Monitoring — Trend Analysis Report",
        sub: "Per ISO 22000:2018 — Clauses 8.5.4 (Hazard control plan) & 9.1.2 (Analysis & evaluation)",
        docNo: "Doc No.", ref: "FS-QM/REC/CCP-TREND",
        period: "Period", generated: "Generated", preparedBy: "Prepared by", qa: "QA",
        kpis: "1. KPI Summary",
        total: "Total Records", compliant: "Compliant", devs: "Deviations", pending: "Pending",
        complianceRate: "Compliance Rate",
        monthly: "2. Monthly Trend (last 12 months)",
        month: "Month", records: "Records", dev: "Deviations", rate: "Compliance", chart: "Chart",
        byCcp: "3. Analysis by CCP",
        ccp: "CCP",
        byBranch: "4. Analysis by Branch/Site",
        branch: "Branch",
        recent: "5. Recent Deviations & Corrective Actions",
        date: "Date", reading: "Reading", action: "Corrective Action", productStatus: "Product Status",
        conclusion: "6. Conclusion & Recommendations",
        signPrep: "Prepared by: QA (Name / Signature / Date)",
        signRev: "Reviewed by: Food Safety Team Leader (Name / Signature / Date)",
        print: "🖨 Print Report", close: "Close",
        none: "No data", noDevs: "No deviations recorded ✔",
      };

  const conclusionText = useMemo(() => {
    const { direction, devLast3, devPrev3, complianceRate } = R;
    if (isAr) {
      if (direction === "up")
        return `⚠ الاتجاه تصاعدي في الانحرافات: آخر 3 أشهر (${devLast3}) أعلى من الأشهر الثلاثة السابقة (${devPrev3})، ونسبة الامتثال الإجمالية ${complianceRate}%. يوصى بتحليل سبب جذري لنقاط التحكم الأكثر انحرافاً، ومراجعة الحدود الحرجة/المعايرة، وفتح إجراء تصحيحي (CAPA)، وعرض النتائج على اجتماع مراجعة الإدارة (MRM).`;
      if (direction === "down")
        return `✔ الاتجاه تنازلي في الانحرافات: آخر 3 أشهر (${devLast3}) أقل من الأشهر الثلاثة السابقة (${devPrev3})، ونسبة الامتثال الإجمالية ${complianceRate}%. الضوابط الحالية فعّالة — يوصى بالاستمرار في المراقبة والتحقق الدوري.`;
      return `● الاتجاه مستقر: انحرافات آخر 3 أشهر (${devLast3}) مساوية للأشهر الثلاثة السابقة (${devPrev3})، ونسبة الامتثال الإجمالية ${complianceRate}%. يوصى بالاستمرار في المراقبة ومراجعة نقاط التحكم الأكثر انحرافاً.`;
    }
    if (direction === "up")
      return `⚠ Upward deviation trend: last 3 months (${devLast3}) exceed the previous 3 months (${devPrev3}); overall compliance ${complianceRate}%. Recommend root-cause analysis of the most-deviating CCPs, review of critical limits/calibration, corrective action (CAPA), and reporting to Management Review (MRM).`;
    if (direction === "down")
      return `✔ Downward deviation trend: last 3 months (${devLast3}) below the previous 3 months (${devPrev3}); overall compliance ${complianceRate}%. Current controls are effective — continue monitoring and periodic verification.`;
    return `● Stable trend: deviations in the last 3 months (${devLast3}) equal the previous 3 months (${devPrev3}); overall compliance ${complianceRate}%. Continue monitoring and review the most-deviating CCPs.`;
  }, [R, isAr]);

  return (
    <div style={T.backdrop} onClick={onClose}>
      <div style={T.panel} className="ccp-trend-print" dir={isAr ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={T.h1}>📈 {L.title}</h1>
            <div style={T.sub}>{L.sub}</div>
          </div>
          <div className="ccp-trend-noprint" style={{ display: "flex", gap: 8 }}>
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
          <div style={T.kpiBox("#1e3a5f")}><div style={T.kpiVal("#1e3a5f")}>{R.total}</div><div style={T.kpiLbl}>{L.total}</div></div>
          <div style={T.kpiBox("#15803d")}><div style={T.kpiVal("#15803d")}>{R.compliant} · {R.complianceRate}%</div><div style={T.kpiLbl}>{L.compliant} · {L.complianceRate}</div></div>
          <div style={T.kpiBox("#b91c1c")}><div style={T.kpiVal("#b91c1c")}>{R.dev}</div><div style={T.kpiLbl}>{L.devs}</div></div>
          <div style={T.kpiBox("#a16207")}><div style={T.kpiVal("#a16207")}>{R.pending}</div><div style={T.kpiLbl}>{L.pending}</div></div>
          <div style={T.kpiBox("#9a3412")}><div style={T.kpiVal("#9a3412")}>{R.devLast3}</div><div style={T.kpiLbl}>{isAr ? "انحرافات آخر ٣ أشهر" : "Deviations Last 3 Mo"}</div></div>
          <div style={T.kpiBox("#64748b")}><div style={T.kpiVal("#64748b")}>{R.devPrev3}</div><div style={T.kpiLbl}>{isAr ? "الأشهر ٣ السابقة" : "Previous 3 Mo"}</div></div>
        </div>

        {/* 2. Monthly trend */}
        <div style={T.secTitle}>{L.monthly}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 85 }}>{L.month}</th>
              <th style={{ ...T.th, width: 65 }}>{L.records}</th>
              <th style={{ ...T.th, width: 75 }}>{L.dev}</th>
              <th style={{ ...T.th, width: 75 }}>{L.rate}</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.months.map((m) => {
              const rate = m.total ? pct(m.total - m.dev, m.total) : null;
              return (
                <tr key={m.key}>
                  <td style={T.td}>{m.label}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: "#1e3a5f" }}>{m.total}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: m.dev > 0 ? "#b91c1c" : "#64748b" }}>{m.dev}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: rate == null ? "#94a3b8" : rate >= 95 ? "#15803d" : "#a16207" }}>
                    {rate == null ? "—" : `${rate}%`}
                  </td>
                  <td style={T.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={T.bar((m.total / R.maxMonth) * 100, m.total > 0 ? "#2d5a8e" : "#dbeafe")} />
                      {m.dev > 0 && <div style={T.bar((m.dev / R.maxMonth) * 100, "#dc2626")} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 3. By CCP */}
        <div style={T.secTitle}>{L.byCcp}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={T.th}>{L.ccp}</th>
              <th style={{ ...T.th, width: 70 }}>{L.records}</th>
              <th style={{ ...T.th, width: 80 }}>{L.dev}</th>
              <th style={{ ...T.th, width: 85 }}>{L.rate}</th>
            </tr>
          </thead>
          <tbody>
            {R.byCcp.map(([cid, c]) => (
              <tr key={cid}>
                <td style={T.td}>🎯 {ccpDisplay(cid)}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{c.total}</td>
                <td style={{ ...T.td, fontWeight: 900, color: c.dev > 0 ? "#b91c1c" : "#64748b" }}>{c.dev}</td>
                <td style={{ ...T.td, fontWeight: 900, color: pct(c.total - c.dev, c.total) >= 95 ? "#15803d" : "#a16207" }}>
                  {pct(c.total - c.dev, c.total)}%
                </td>
              </tr>
            ))}
            {R.byCcp.length === 0 && <tr><td style={T.td} colSpan={4}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 4. By branch */}
        <div style={T.secTitle}>{L.byBranch}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={T.th}>{L.branch}</th>
              <th style={{ ...T.th, width: 70 }}>{L.records}</th>
              <th style={{ ...T.th, width: 80 }}>{L.dev}</th>
              <th style={{ ...T.th, width: 85 }}>{L.rate}</th>
            </tr>
          </thead>
          <tbody>
            {R.byBranch.map(([br, b]) => (
              <tr key={br}>
                <td style={T.td}>🏭 {br}</td>
                <td style={{ ...T.td, fontWeight: 900 }}>{b.total}</td>
                <td style={{ ...T.td, fontWeight: 900, color: b.dev > 0 ? "#b91c1c" : "#64748b" }}>{b.dev}</td>
                <td style={{ ...T.td, fontWeight: 900, color: pct(b.total - b.dev, b.total) >= 95 ? "#15803d" : "#a16207" }}>
                  {pct(b.total - b.dev, b.total)}%
                </td>
              </tr>
            ))}
            {R.byBranch.length === 0 && <tr><td style={T.td} colSpan={4}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 5. Recent deviations */}
        <div style={T.secTitle}>{L.recent}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 85 }}>{L.date}</th>
              <th style={T.th}>{L.ccp}</th>
              <th style={{ ...T.th, width: 75 }}>{L.reading}</th>
              <th style={T.th}>{L.action}</th>
              <th style={{ ...T.th, width: 90 }}>{L.productStatus}</th>
            </tr>
          </thead>
          <tbody>
            {R.recentDeviations.map((d, i) => (
              <tr key={i}>
                <td style={T.td}>{d.date}</td>
                <td style={T.td}>{ccpDisplay(d.ccpId)} · {d.branch}</td>
                <td style={{ ...T.td, fontWeight: 900, color: "#b91c1c" }}>{d.reading}</td>
                <td style={T.td}>{d.action}</td>
                <td style={T.td}>{d.productStatus}</td>
              </tr>
            ))}
            {R.recentDeviations.length === 0 && (
              <tr><td style={{ ...T.td, color: "#15803d", fontWeight: 900 }} colSpan={5}>{L.noDevs}</td></tr>
            )}
          </tbody>
        </table>

        {/* 6. Conclusion */}
        <div style={T.secTitle}>{L.conclusion}</div>
        <div style={T.note}>{conclusionText}</div>

        {/* Signatures */}
        <div style={T.sigRow}>
          <div style={T.sigBox}>{L.signPrep}</div>
          <div style={T.sigBox}>{L.signRev}</div>
        </div>
      </div>

      {/* Print only this report while the modal is open */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ccp-trend-print, .ccp-trend-print * { visibility: visible !important; }
          .ccp-trend-print {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
          }
          .ccp-trend-noprint { display: none !important; }
        }
      `}</style>
    </div>
  );
}
