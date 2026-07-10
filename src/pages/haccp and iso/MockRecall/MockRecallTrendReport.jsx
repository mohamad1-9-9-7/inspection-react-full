// src/pages/haccp and iso/MockRecall/MockRecallTrendReport.jsx
// Formal, printable Mock Recall / Traceability Drill Trend Analysis Report
// ISO 22000:2018 §8.3 (Traceability) & §8.9.5 (Withdrawal/Recall) · opened from MockRecallView.

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
function fmtDur(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default function MockRecallTrendReportModal({ items, lang, onClose }) {
  const isAr = lang === "ar";

  const R = useMemo(() => {
    // Chronological (oldest → newest) for the log
    const rows = [...items].sort((a, b) => {
      const da = a?.payload?.drillDate || "", db = b?.payload?.drillDate || "";
      return da < db ? -1 : 1;
    });

    const byYear = new Map();   // year -> { total, pass, durSum, durN, traceSum, traceN }
    const byType = new Map();   // drillName -> { total, pass }
    const byBranch = new Map(); // branch -> { total, pass }
    let total = 0, pass = 0, fail = 0, pending = 0;
    let durSum = 0, durN = 0, traceSum = 0, traceN = 0;
    let lastDate = null;

    const log = [];
    for (const rec of rows) {
      const p = rec?.payload || {};
      const k = p?.autoKpi || {};
      total++;
      const ov = k.overallPass;
      if (ov === true) pass++; else if (ov === false) fail++; else pending++;

      const y = String(p.drillDate || "").slice(0, 4) || "—";
      if (!byYear.has(y)) byYear.set(y, { total: 0, pass: 0, durSum: 0, durN: 0, traceSum: 0, traceN: 0 });
      const yr = byYear.get(y);
      yr.total++; if (ov === true) yr.pass++;

      if (typeof k.durationMinutes === "number") { durSum += k.durationMinutes; durN++; yr.durSum += k.durationMinutes; yr.durN++; }
      if (typeof k.tracedPct === "number") { traceSum += k.tracedPct; traceN++; yr.traceSum += k.tracedPct; yr.traceN++; }

      const dn = p.drillName || "mock";
      if (!byType.has(dn)) byType.set(dn, { total: 0, pass: 0 });
      const tp = byType.get(dn); tp.total++; if (ov === true) tp.pass++;

      const br = String(p.product?.branch || "—").trim() || "—";
      if (!byBranch.has(br)) byBranch.set(br, { total: 0, pass: 0 });
      const b = byBranch.get(br); b.total++; if (ov === true) b.pass++;

      const d = p.drillDate || "";
      if (d && (!lastDate || d > lastDate)) lastDate = d;

      log.push({
        date: p.drillDate || "—",
        type: dn === "traceability" ? (isAr ? "تتبع" : "Traceability") : (isAr ? "سحب وهمي" : "Mock Recall"),
        product: p.product?.name || "—",
        result: ov === true ? "pass" : ov === false ? "fail" : "pending",
        dur: typeof k.durationMinutes === "number" ? k.durationMinutes : null,
        trace: typeof k.tracedPct === "number" ? k.tracedPct : null,
        gaps: p.results?.gaps || "",
      });
    }

    // Trend direction: recent half vs older half pass-rate + duration
    const half = Math.floor(log.length / 2);
    const older = log.slice(0, half);
    const recent = log.slice(half);
    const passRateOf = (a) => a.length ? pct(a.filter((x) => x.result === "pass").length, a.length) : null;
    const avgDurOf = (a) => {
      const v = a.filter((x) => x.dur != null).map((x) => x.dur);
      return v.length ? Math.round(v.reduce((s, n) => s + n, 0) / v.length) : null;
    };
    const recentPass = passRateOf(recent), olderPass = passRateOf(older);
    const recentDur = avgDurOf(recent), olderDur = avgDurOf(older);

    const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;

    return {
      total, pass, fail, pending,
      passRate: pct(pass, total),
      avgDur: durN ? Math.round(durSum / durN) : null,
      avgTrace: traceN ? traceSum / traceN : null,
      lastDate, daysSinceLast,
      byYear: Array.from(byYear.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      byType: Array.from(byType.entries()),
      byBranch: Array.from(byBranch.entries()).sort((a, b) => b[1].total - a[1].total),
      logRecent: [...log].reverse().slice(0, 10),
      recentPass, olderPass, recentDur, olderDur,
      generatedAt: new Date().toISOString().slice(0, 10),
    };
  }, [items, isAr]);

  const maxYear = Math.max(...R.byYear.map(([, y]) => y.total), 1);

  const L = isAr
    ? {
        title: "تقرير تحليل اتجاهات تمارين السحب والتتبع",
        sub: "وفق ISO 22000:2018 — البندان 8.3 (التتبع) و8.9.5 (السحب/الاستدعاء)",
        docNo: "رقم الوثيقة", ref: "FS-QM/REC/MOCK-TREND", generated: "تاريخ الإصدار", preparedBy: "أعده", qa: "ضمان الجودة",
        kpis: "١. ملخص مؤشرات الأداء",
        total: "إجمالي التمارين", pass: "ناجحة", fail: "فاشلة", passRate: "نسبة النجاح",
        avgDur: "متوسط المدة", avgTrace: "متوسط نسبة التتبع", sinceLast: "منذ آخر تمرين", days: "يوم",
        byYear: "٢. الاتجاه السنوي",
        year: "السنة", count: "العدد", chart: "الرسم",
        byType: "٣. حسب نوع التمرين", type: "النوع",
        byBranch: "٤. حسب الفرع/الموقع", branch: "الفرع",
        log: "٥. سجل التمارين (الأحدث)",
        date: "التاريخ", product: "المنتج", result: "النتيجة", dur: "المدة", trace: "التتبع %", gaps: "الثغرات/الملاحظات",
        conclusion: "٦. الخلاصة والتوصيات",
        signPrep: "أعده: ضمان الجودة (الاسم/التوقيع/التاريخ)",
        signRev: "راجعه: قائد فريق سلامة الغذاء (الاسم/التوقيع/التاريخ)",
        print: "🖨 طباعة التقرير", close: "إغلاق", none: "لا توجد بيانات",
        pass_: "ناجح", fail_: "فاشل", pending_: "معلّق",
      }
    : {
        title: "Mock Recall / Traceability Drill — Trend Analysis Report",
        sub: "Per ISO 22000:2018 — Clauses 8.3 (Traceability) & 8.9.5 (Withdrawal/Recall)",
        docNo: "Doc No.", ref: "FS-QM/REC/MOCK-TREND", generated: "Generated", preparedBy: "Prepared by", qa: "QA",
        kpis: "1. KPI Summary",
        total: "Total Drills", pass: "Passed", fail: "Failed", passRate: "Pass Rate",
        avgDur: "Avg Duration", avgTrace: "Avg Traced %", sinceLast: "Since Last Drill", days: "days",
        byYear: "2. Yearly Trend",
        year: "Year", count: "Count", chart: "Chart",
        byType: "3. By Drill Type", type: "Type",
        byBranch: "4. By Branch/Site", branch: "Branch",
        log: "5. Drill Log (most recent)",
        date: "Date", product: "Product", result: "Result", dur: "Duration", trace: "Trace %", gaps: "Gaps / Findings",
        conclusion: "6. Conclusion & Recommendations",
        signPrep: "Prepared by: QA (Name / Signature / Date)",
        signRev: "Reviewed by: Food Safety Team Leader (Name / Signature / Date)",
        print: "🖨 Print Report", close: "Close", none: "No data",
        pass_: "PASS", fail_: "FAIL", pending_: "Pending",
      };

  const resultCell = (res) => {
    const map = {
      pass: { c: "#15803d", label: L.pass_ },
      fail: { c: "#b91c1c", label: L.fail_ },
      pending: { c: "#a16207", label: L.pending_ },
    };
    const m = map[res] || map.pending;
    return <span style={{ color: m.c, fontWeight: 900 }}>{m.label}</span>;
  };

  const conclusionText = useMemo(() => {
    const { recentPass, olderPass, recentDur, olderDur, passRate, avgDur, daysSinceLast } = R;
    const parts = [];
    // Pass-rate direction
    if (recentPass != null && olderPass != null) {
      if (recentPass > olderPass) parts.push(isAr ? `✔ تحسّن في نسبة النجاح (${olderPass}% ← ${recentPass}%).` : `✔ Pass rate improving (${olderPass}% → ${recentPass}%).`);
      else if (recentPass < olderPass) parts.push(isAr ? `⚠ تراجع في نسبة النجاح (${olderPass}% ← ${recentPass}%) — يتطلب تحليل سبب جذري.` : `⚠ Pass rate declining (${olderPass}% → ${recentPass}%) — root-cause analysis required.`);
      else parts.push(isAr ? `● نسبة النجاح مستقرة عند ${recentPass}%.` : `● Pass rate stable at ${recentPass}%.`);
    }
    // Duration direction
    if (recentDur != null && olderDur != null) {
      if (recentDur < olderDur) parts.push(isAr ? `✔ تحسّن في زمن التتبع (${fmtDur(olderDur)} ← ${fmtDur(recentDur)}).` : `✔ Traceability time improving (${fmtDur(olderDur)} → ${fmtDur(recentDur)}).`);
      else if (recentDur > olderDur) parts.push(isAr ? `⚠ زيادة في زمن التتبع (${fmtDur(olderDur)} ← ${fmtDur(recentDur)}).` : `⚠ Traceability time increasing (${fmtDur(olderDur)} → ${fmtDur(recentDur)}).`);
    }
    // Schedule reminder
    if (daysSinceLast != null && daysSinceLast > 90) parts.push(isAr ? `🚨 مضى ${daysSinceLast} يوماً على آخر تمرين — يوصى بإجراء تمرين ربع سنوي جديد.` : `🚨 ${daysSinceLast} days since last drill — a new quarterly drill is recommended.`);
    parts.push(isAr ? `النتائج تُرفع إلى اجتماع مراجعة الإدارة (MRM) مع أي إجراءات تصحيحية عن الثغرات.` : `Results feed into Management Review (MRM) with corrective actions for any gaps.`);
    return parts.join(" ");
  }, [R, isAr]);

  return (
    <div style={T.backdrop} onClick={onClose}>
      <div style={T.panel} className="mock-trend-print" dir={isAr ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={T.h1}>📈 {L.title}</h1>
            <div style={T.sub}>{L.sub}</div>
          </div>
          <div className="mock-trend-noprint" style={{ display: "flex", gap: 8 }}>
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
          <div style={T.kpiBox("#15803d")}><div style={T.kpiVal("#15803d")}>{R.pass} · {R.passRate}%</div><div style={T.kpiLbl}>{L.pass} · {L.passRate}</div></div>
          <div style={T.kpiBox("#b91c1c")}><div style={T.kpiVal("#b91c1c")}>{R.fail}</div><div style={T.kpiLbl}>{L.fail}</div></div>
          <div style={T.kpiBox("#0891b2")}><div style={T.kpiVal("#0891b2")}>{fmtDur(R.avgDur)}</div><div style={T.kpiLbl}>{L.avgDur}</div></div>
          <div style={T.kpiBox("#0f766e")}><div style={T.kpiVal("#0f766e")}>{R.avgTrace != null ? `${R.avgTrace.toFixed(1)}%` : "—"}</div><div style={T.kpiLbl}>{L.avgTrace}</div></div>
          <div style={T.kpiBox("#7c3aed")}><div style={T.kpiVal("#7c3aed")}>{R.daysSinceLast != null ? `${R.daysSinceLast} ${L.days}` : "—"}</div><div style={T.kpiLbl}>{L.sinceLast}</div></div>
        </div>

        {/* 2. Yearly trend */}
        <div style={T.secTitle}>{L.byYear}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 70 }}>{L.year}</th>
              <th style={{ ...T.th, width: 60 }}>{L.count}</th>
              <th style={{ ...T.th, width: 80 }}>{L.passRate}</th>
              <th style={{ ...T.th, width: 90 }}>{L.avgDur}</th>
              <th style={{ ...T.th, width: 80 }}>{L.avgTrace}</th>
              <th style={T.th}>{L.chart}</th>
            </tr>
          </thead>
          <tbody>
            {R.byYear.map(([y, v]) => (
              <tr key={y}>
                <td style={T.td}>{y}</td>
                <td style={{ ...T.td, fontWeight: 900, color: "#1e3a5f" }}>{v.total}</td>
                <td style={{ ...T.td, fontWeight: 900, color: pct(v.pass, v.total) >= 80 ? "#15803d" : "#a16207" }}>{pct(v.pass, v.total)}%</td>
                <td style={T.td}>{fmtDur(v.durN ? Math.round(v.durSum / v.durN) : null)}</td>
                <td style={T.td}>{v.traceN ? `${(v.traceSum / v.traceN).toFixed(1)}%` : "—"}</td>
                <td style={T.td}><div style={T.bar((v.total / maxYear) * 100, "#2d5a8e")} /></td>
              </tr>
            ))}
            {R.byYear.length === 0 && <tr><td style={T.td} colSpan={6}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 3. By type + 4. By branch */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="mock-trend-2col">
          <div>
            <div style={T.secTitle}>{L.byType}</div>
            <table style={T.table}>
              <thead><tr><th style={T.th}>{L.type}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 75 }}>{L.passRate}</th></tr></thead>
              <tbody>
                {R.byType.map(([dn, v]) => (
                  <tr key={dn}>
                    <td style={T.td}>{dn === "traceability" ? (isAr ? "🧬 تتبع" : "🧬 Traceability") : (isAr ? "🔄 سحب وهمي" : "🔄 Mock Recall")}</td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{v.total}</td>
                    <td style={{ ...T.td, fontWeight: 900, color: pct(v.pass, v.total) >= 80 ? "#15803d" : "#a16207" }}>{pct(v.pass, v.total)}%</td>
                  </tr>
                ))}
                {R.byType.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <div style={T.secTitle}>{L.byBranch}</div>
            <table style={T.table}>
              <thead><tr><th style={T.th}>{L.branch}</th><th style={{ ...T.th, width: 55 }}>{L.count}</th><th style={{ ...T.th, width: 75 }}>{L.passRate}</th></tr></thead>
              <tbody>
                {R.byBranch.map(([br, v]) => (
                  <tr key={br}>
                    <td style={T.td}>🏭 {br}</td>
                    <td style={{ ...T.td, fontWeight: 900 }}>{v.total}</td>
                    <td style={{ ...T.td, fontWeight: 900, color: pct(v.pass, v.total) >= 80 ? "#15803d" : "#a16207" }}>{pct(v.pass, v.total)}%</td>
                  </tr>
                ))}
                {R.byBranch.length === 0 && <tr><td style={T.td} colSpan={3}>{L.none}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Drill log */}
        <div style={T.secTitle}>{L.log}</div>
        <table style={T.table}>
          <thead>
            <tr>
              <th style={{ ...T.th, width: 85 }}>{L.date}</th>
              <th style={{ ...T.th, width: 90 }}>{L.type}</th>
              <th style={T.th}>{L.product}</th>
              <th style={{ ...T.th, width: 65 }}>{L.result}</th>
              <th style={{ ...T.th, width: 70 }}>{L.dur}</th>
              <th style={{ ...T.th, width: 60 }}>{L.trace}</th>
              <th style={T.th}>{L.gaps}</th>
            </tr>
          </thead>
          <tbody>
            {R.logRecent.map((r, i) => (
              <tr key={i}>
                <td style={T.td}>{r.date}</td>
                <td style={T.td}>{r.type}</td>
                <td style={T.td}>{r.product}</td>
                <td style={T.td}>{resultCell(r.result)}</td>
                <td style={T.td}>{fmtDur(r.dur)}</td>
                <td style={T.td}>{r.trace != null ? `${r.trace.toFixed(1)}%` : "—"}</td>
                <td style={{ ...T.td, fontSize: 11 }}>{r.gaps || "—"}</td>
              </tr>
            ))}
            {R.logRecent.length === 0 && <tr><td style={T.td} colSpan={7}>{L.none}</td></tr>}
          </tbody>
        </table>

        {/* 6. Conclusion */}
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
          .mock-trend-print, .mock-trend-print * { visibility: visible !important; }
          .mock-trend-print {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
          }
          .mock-trend-noprint { display: none !important; }
        }
        @media (max-width: 720px) { .mock-trend-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
