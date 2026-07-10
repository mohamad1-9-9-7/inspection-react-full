// src/pages/haccp and iso/RealRecall/RealRecallTrendReport.jsx
// Formal, printable Real Product Recall Trend Analysis Report
// ISO 22000:2018 §8.9.5 (Withdrawal/Recall) & §9.1.2 (Analysis) · opened from RealRecallView.

import React, { useMemo } from "react";

const T = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 9000, overflowY: "auto", padding: "24px 12px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  panel: {
    background: "#fff", borderRadius: 14, maxWidth: 960, margin: "0 auto",
    padding: "26px 30px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    border: "1px solid #fecaca",
  },
  h1: { fontSize: 20, fontWeight: 950, color: "#7f1d1d", margin: 0 },
  sub: { fontSize: 11.5, color: "#991b1b", fontWeight: 700, marginTop: 4 },
  secTitle: {
    fontSize: 13.5, fontWeight: 950, color: "#7f1d1d",
    borderBottom: "2px solid #fecaca", padding: "14px 0 6px", marginBottom: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { border: "1px solid #fecaca", background: "#fef2f2", color: "#7f1d1d", fontWeight: 900, padding: "6px 8px", textAlign: "start" },
  td: { border: "1px solid #fee2e2", padding: "6px 8px", color: "#1e293b", fontWeight: 600 },
  bar: (pctVal, color) => ({ height: 10, width: `${Math.max(pctVal, 2)}%`, background: color, borderRadius: 999, minWidth: 4 }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  kpiBox: (color) => ({ border: `1px solid ${color}44`, borderInlineStart: `4px solid ${color}`, borderRadius: 10, padding: "8px 10px", background: "#fff" }),
  kpiVal: (color) => ({ fontSize: 18, fontWeight: 950, color }),
  kpiLbl: { fontSize: 9.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  note: { fontSize: 12, color: "#1e293b", fontWeight: 600, lineHeight: 1.7, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" },
  sigRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 },
  sigBox: { borderTop: "1.5px solid #7f1d1d", paddingTop: 6, fontSize: 11.5, fontWeight: 800, color: "#7f1d1d" },
  btn: (primary) => ({
    background: primary ? "linear-gradient(180deg,#ef4444,#dc2626)" : "#fff",
    color: primary ? "#fff" : "#7f1d1d",
    border: `1.5px solid ${primary ? "#b91c1c" : "#fecaca"}`,
    padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13,
  }),
};

function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
const CLASS_LABEL = { I: "Class I", II: "Class II", III: "Class III" };

export default function RealRecallTrendReportModal({ items, lang, onClose }) {
  const isAr = lang === "ar";

  const R = useMemo(() => {
    const rows = [...items].sort((a, b) => {
      const da = a?.payload?.initDate || "", db = b?.payload?.initDate || "";
      return da < db ? -1 : 1;
    });

    const byYear = new Map();      // year -> { total, closed, recSum, recN, cost }
    const byClass = new Map();     // class -> count
    const byStatus = new Map();    // status -> count
    const byRootCause = new Map(); // rootCause -> count
    let total = 0, active = 0, closed = 0, cost = 0;
    const recRates = [];
    const closureDays = [];
    const log = [];

    for (const rec of rows) {
      const p = rec?.payload || {};
      total++;
      const status = p.status || "Active";
      if (status === "Closed") closed++; else active++;
      byStatus.set(status, (byStatus.get(status) || 0) + 1);

      const cls = p.recallClass || "II";
      byClass.set(cls, (byClass.get(cls) || 0) + 1);

      const c = parseFloat(p.cost) || 0;
      cost += c;

      const d = parseFloat(p.qtyDistributed), r = parseFloat(p.qtyRecovered);
      const rate = (d && !isNaN(d) && !isNaN(r)) ? (r / d) * 100 : null;
      if (rate != null) recRates.push(rate);

      const y = String(p.initDate || "").slice(0, 4) || "—";
      if (!byYear.has(y)) byYear.set(y, { total: 0, closed: 0, recSum: 0, recN: 0, cost: 0 });
      const yr = byYear.get(y);
      yr.total++; if (status === "Closed") yr.closed++;
      if (rate != null) { yr.recSum += rate; yr.recN++; }
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
        number: p.recallNumber || "RR",
        date: p.initDate || "—",
        product: p.affectedProduct || "—",
        cls, status, rate,
        cost: c,
        rootCause: rcRaw || "—",
      });
    }

    const avgRec = recRates.length ? recRates.reduce((a, b) => a + b, 0) / recRates.length : null;
    const avgClosure = closureDays.length ? Math.round(closureDays.reduce((a, b) => a + b, 0) / closureDays.length) : null;

    // Direction: recent half vs older half recovery
    const half = Math.floor(recRates.length / 2);
    const olderRec = recRates.slice(0, half);
    const recentRec = recRates.slice(half);
    const avg = (a) => a.length ? a.reduce((s, n) => s + n, 0) / a.length : null;

    return {
      total, active, closed, cost,
      avgRec, avgClosure,
      byYear: Array.from(byYear.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      byClass: ["I", "II", "III"].filter((c) => byClass.has(c)).map((c) => [c, byClass.get(c)]),
      byStatus: Array.from(byStatus.entries()),
      topRootCauses: Array.from(byRootCause.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      logRecent: [...log].reverse().slice(0, 10),
      recentRecAvg: avg(recentRec), olderRecAvg: avg(olderRec),
      generatedAt: new Date().toISOString().slice(0, 10),
    };
  }, [items]);

  const maxYear = Math.max(...R.byYear.map(([, y]) => y.total), 1);

  const L = isAr
    ? {
        title: "تقرير تحليل اتجاهات الاستدعاء الفعلي للمنتجات",
        sub: "وفق ISO 22000:2018 — البندان 8.9.5 (السحب/الاستدعاء) و9.1.2 (التحليل والتقييم)",
        docNo: "رقم الوثيقة", ref: "FS-QM/REC/RECALL-TREND", generated: "تاريخ الإصدار", preparedBy: "أعده", qa: "ضمان الجودة",
        kpis: "١. ملخص مؤشرات الأداء",
        total: "إجمالي الاستدعاءات", active: "نشطة", closed: "مغلقة", avgRec: "متوسط الاسترجاع",
        avgClosure: "متوسط زمن الإغلاق", days: "يوم", cost: "إجمالي التكلفة",
        byYear: "٢. الاتجاه السنوي",
        year: "السنة", count: "العدد", recovery: "الاسترجاع %", chart: "الرسم",
        byClass: "٣. حسب فئة الاستدعاء", cls: "الفئة",
        byStatus: "٤. حسب الحالة", status: "الحالة",
        rootCauses: "٥. أهم الأسباب الجذرية",
        rootCause: "السبب الجذري",
        log: "٦. سجل الاستدعاءات (الأحدث)",
        number: "الرقم", date: "التاريخ", product: "المنتج",
        conclusion: "٧. الخلاصة والتوصيات",
        signPrep: "أعده: ضمان الجودة (الاسم/التوقيع/التاريخ)",
        signRev: "راجعه: قائد فريق سلامة الغذاء (الاسم/التوقيع/التاريخ)",
        print: "🖨 طباعة التقرير", close: "إغلاق", none: "لا توجد بيانات",
        statusMap: { Active: "نشطة", Contained: "محتواة", Closed: "مغلقة" },
      }
    : {
        title: "Real Product Recall — Trend Analysis Report",
        sub: "Per ISO 22000:2018 — Clauses 8.9.5 (Withdrawal/Recall) & 9.1.2 (Analysis & evaluation)",
        docNo: "Doc No.", ref: "FS-QM/REC/RECALL-TREND", generated: "Generated", preparedBy: "Prepared by", qa: "QA",
        kpis: "1. KPI Summary",
        total: "Total Recalls", active: "Active", closed: "Closed", avgRec: "Avg Recovery",
        avgClosure: "Avg Closure Time", days: "days", cost: "Total Cost",
        byYear: "2. Yearly Trend",
        year: "Year", count: "Count", recovery: "Recovery %", chart: "Chart",
        byClass: "3. By Recall Class", cls: "Class",
        byStatus: "4. By Status", status: "Status",
        rootCauses: "5. Top Root Causes",
        rootCause: "Root Cause",
        log: "6. Recall Log (most recent)",
        number: "No.", date: "Date", product: "Product",
        conclusion: "7. Conclusion & Recommendations",
        signPrep: "Prepared by: QA (Name / Signature / Date)",
        signRev: "Reviewed by: Food Safety Team Leader (Name / Signature / Date)",
        print: "🖨 Print Report", close: "Close", none: "No data",
        statusMap: { Active: "Active", Contained: "Contained", Closed: "Closed" },
      };

  const recColor = (rate) => rate == null ? "#94a3b8" : rate >= 90 ? "#15803d" : rate >= 60 ? "#a16207" : "#b91c1c";

  const conclusionText = useMemo(() => {
    const { recentRecAvg, olderRecAvg, avgRec, total } = R;
    if (total === 0) return isAr ? "لا توجد استدعاءات مسجلة." : "No recalls recorded.";
    const parts = [];
    if (avgRec != null) {
      if (avgRec >= 90) parts.push(isAr ? `✔ متوسط نسبة الاسترجاع ${avgRec.toFixed(1)}% يفي بالهدف (≥90%)، ما يدل على فعالية نظام السحب.` : `✔ Average recovery ${avgRec.toFixed(1)}% meets the target (≥90%), indicating an effective recall system.`);
      else parts.push(isAr ? `⚠ متوسط نسبة الاسترجاع ${avgRec.toFixed(1)}% دون الهدف (≥90%) — يوصى بمراجعة قوائم التوزيع وسرعة الإخطار وفعالية التتبع.` : `⚠ Average recovery ${avgRec.toFixed(1)}% is below target (≥90%) — review distribution lists, notification speed and traceability effectiveness.`);
    }
    if (recentRecAvg != null && olderRecAvg != null) {
      if (recentRecAvg > olderRecAvg) parts.push(isAr ? `الاتجاه تحسّني في الاسترجاع (${olderRecAvg.toFixed(0)}% ← ${recentRecAvg.toFixed(0)}%).` : `Recovery trend improving (${olderRecAvg.toFixed(0)}% → ${recentRecAvg.toFixed(0)}%).`);
      else if (recentRecAvg < olderRecAvg) parts.push(isAr ? `⚠ تراجع في الاسترجاع (${olderRecAvg.toFixed(0)}% ← ${recentRecAvg.toFixed(0)}%) يتطلب إجراءً تصحيحياً.` : `⚠ Recovery declining (${olderRecAvg.toFixed(0)}% → ${recentRecAvg.toFixed(0)}%) — corrective action required.`);
    }
    if (R.topRootCauses.length && R.topRootCauses[0][1] > 1) {
      parts.push(isAr ? `السبب الجذري الأكثر تكراراً يستدعي إجراءً وقائياً (CAPA) لمنع التكرار.` : `The most frequent root cause warrants preventive action (CAPA) to prevent recurrence.`);
    }
    parts.push(isAr ? `تُرفع النتائج إلى اجتماع مراجعة الإدارة (MRM).` : `Results feed into Management Review (MRM).`);
    return parts.join(" ");
  }, [R, isAr]);

  return (
    <div style={T.backdrop} onClick={onClose}>
      <div style={T.panel} className="recall-trend-print" dir={isAr ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={T.h1}>📈 {L.title}</h1>
            <div style={T.sub}>{L.sub}</div>
          </div>
          <div className="recall-trend-noprint" style={{ display: "flex", gap: 8 }}>
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
          <div style={T.kpiBox("#7f1d1d")}><div style={T.kpiVal("#7f1d1d")}>{R.total}</div><div style={T.kpiLbl}>{L.total}</div></div>
          <div style={T.kpiBox("#dc2626")}><div style={T.kpiVal("#dc2626")}>{R.active}</div><div style={T.kpiLbl}>{L.active}</div></div>
          <div style={T.kpiBox("#16a34a")}><div style={T.kpiVal("#16a34a")}>{R.closed}</div><div style={T.kpiLbl}>{L.closed}</div></div>
          <div style={T.kpiBox(recColor(R.avgRec))}><div style={T.kpiVal(recColor(R.avgRec))}>{R.avgRec != null ? `${R.avgRec.toFixed(1)}%` : "—"}</div><div style={T.kpiLbl}>{L.avgRec}</div></div>
          <div style={T.kpiBox("#7c3aed")}><div style={T.kpiVal("#7c3aed")}>{R.avgClosure != null ? `${R.avgClosure} ${L.days}` : "—"}</div><div style={T.kpiLbl}>{L.avgClosure}</div></div>
          <div style={T.kpiBox("#0891b2")}><div style={T.kpiVal("#0891b2")}>{R.cost ? R.cost.toLocaleString() : "—"}</div><div style={T.kpiLbl}>{L.cost} (AED)</div></div>
        </div>

        {/* 2. Yearly trend */}
        <div style={T.secTitle}>{L.byYear}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 70 }}>{L.year}</th>
              <th style={{ ...T.th, width: 60 }}>{L.count}</th>
              <th style={{ ...T.th, width: 90 }}>{L.recovery}</th>
              <th style={{ ...T.th, width: 110 }}>{L.cost} (AED)</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.byYear.map(([y, v]) => {
              const rec = v.recN ? v.recSum / v.recN : null;
              return (
                <tr key={y}>
                  <td style={T.td}>{y}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: "#7f1d1d" }}>{v.total}</td>
                  <td style={{ ...T.td, fontWeight: 900, color: recColor(rec) }}>{rec != null ? `${rec.toFixed(1)}%` : "—"}</td>
                  <td style={T.td}>{v.cost ? v.cost.toLocaleString() : "—"}</td>
                  <td style={T.td}><div style={T.bar((v.total / maxYear) * 100, "#dc2626")} /></td>
                </tr>
              );
            })}
            {R.byYear.length === 0 && <tr><td style={T.td} colSpan={5}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 3. By class + 4. By status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="recall-trend-2col">
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

        {/* 5. Root causes */}
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

        {/* 6. Recall log */}
        <div style={T.secTitle}>{L.log}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 70 }}>{L.number}</th>
              <th style={{ ...T.th, width: 85 }}>{L.date}</th>
              <th style={T.th}>{L.product}</th>
              <th style={{ ...T.th, width: 65 }}>{L.cls}</th>
              <th style={{ ...T.th, width: 75 }}>{L.recovery}</th>
              <th style={{ ...T.th, width: 70 }}>{L.status}</th>
            </tr>
          </thead>
          <tbody>
            {R.logRecent.map((r, i) => (
              <tr key={i}>
                <td style={{ ...T.td, fontWeight: 900 }}>{r.number}</td>
                <td style={T.td}>{r.date}</td>
                <td style={T.td}>{r.product}</td>
                <td style={T.td}>{CLASS_LABEL[r.cls] || r.cls}</td>
                <td style={{ ...T.td, fontWeight: 900, color: recColor(r.rate) }}>{r.rate != null ? `${r.rate.toFixed(0)}%` : "—"}</td>
                <td style={T.td}>{L.statusMap[r.status] || r.status}</td>
              </tr>
            ))}
            {R.logRecent.length === 0 && <tr><td style={T.td} colSpan={6}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 7. Conclusion */}
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
          .recall-trend-print, .recall-trend-print * { visibility: visible !important; }
          .recall-trend-print {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
          }
          .recall-trend-noprint { display: none !important; }
        }
        @media (max-width: 720px) { .recall-trend-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
